import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-preprocessing-parity");
const fixtureExpansionDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-fixture-expansion");
const blockerDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-r6-blocker-isolation");
const confidenceDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-confidence-parity");
const browserRunDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-nonzero-bonus", "run-1");
const rapidOcrDir = path.join(rootDir, "tmp", "rapidocr-python");
const modelDir = path.join(rapidOcrDir, "rapidocr_onnxruntime", "models");

const fields = ["member1", "member2", "member3", "bonus", "total"];
const sampleIndices = [0, 1, 2, 17, 31, 32, 47, 48, 319, 320, 1535, 1536, 4096, 8192, 46079];

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

function fileKey(image, side, field) {
  return `${image}|3|${side}|${field}`;
}

function rectIou(a, b) {
  if (!a || !b) return 0;
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const intersection = ix * iy;
  const union = a.width * a.height + b.width * b.height - intersection;
  return union ? intersection / union : 0;
}

function containsRect(outer, inner) {
  if (!outer || !inner) return false;
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

function geometryClass(a, b) {
  if (!a || !b) return "G3-different-or-missing-architecture";
  const same = a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  if (same) return "G0-same-geometry";
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const dw = Math.abs(a.width - b.width);
  const dh = Math.abs(a.height - b.height);
  if (dx <= 1 && dy <= 1 && dw <= 2 && dh <= 2) return "G1-minor-rounding-difference";
  return "G2-materially-different-roi";
}

async function rawPixels(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

async function cropRawPixels(sourcePath, rect) {
  const { data, info } = await sharp(sourcePath)
    .extract({ left: rect.x, top: rect.y, width: rect.width, height: rect.height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

function compareRawPixels(a, b) {
  if (!a || !b) return { comparable: false, reason: "missing-pixels" };
  if (a.info.width !== b.info.width || a.info.height !== b.info.height || a.info.channels !== b.info.channels) {
    return {
      comparable: false,
      reason: "dimension-mismatch",
      a: { width: a.info.width, height: a.info.height, channels: a.info.channels },
      b: { width: b.info.width, height: b.info.height, channels: b.info.channels },
    };
  }
  let differingPixels = 0;
  let maxChannelDelta = 0;
  let totalAbsDelta = 0;
  const perChannelAbsDelta = Array(a.info.channels).fill(0);
  const pixels = a.info.width * a.info.height;
  for (let i = 0; i < a.data.length; i += a.info.channels) {
    let pixelDiffers = false;
    for (let c = 0; c < a.info.channels; c += 1) {
      const delta = Math.abs(a.data[i + c] - b.data[i + c]);
      if (delta) pixelDiffers = true;
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      totalAbsDelta += delta;
      perChannelAbsDelta[c] += delta;
    }
    if (pixelDiffers) differingPixels += 1;
  }
  return {
    comparable: true,
    exact: differingPixels === 0,
    pixels,
    differingPixels,
    maxChannelDelta,
    meanAbsChannelDelta: Number((totalAbsDelta / Math.max(1, a.data.length)).toFixed(6)),
    perChannelMeanAbsDelta: perChannelAbsDelta.map((sum) => Number((sum / Math.max(1, pixels)).toFixed(6))),
  };
}

async function recModelInventory() {
  const modelPath = path.join(modelDir, "ch_PP-OCRv4_rec_infer.onnx");
  const detPath = path.join(modelDir, "ch_PP-OCRv4_det_infer.onnx");
  const characterPath = path.join(modelDir, "ch_PP-OCRv4_rec_character.txt");
  const maybeHash = async (filePath) => {
    try {
      return { path: normalizePath(filePath), sha256: sha256(await fs.readFile(filePath)), bytes: (await fs.stat(filePath)).size };
    } catch {
      return null;
    }
  };
  const packageDirs = await fs.readdir(rapidOcrDir).catch(() => []);
  return {
    rapidOcrTargetDir: normalizePath(rapidOcrDir),
    rapidocrOnnxruntimeDistInfo: packageDirs.find((name) => /^rapidocr_onnxruntime-.*\.dist-info$/i.test(name)) || null,
    onnxruntimeDistInfo: packageDirs.find((name) => /^onnxruntime-.*\.dist-info$/i.test(name)) || null,
    opencvDistInfo: packageDirs.find((name) => /^opencv_python-.*\.dist-info$/i.test(name)) || null,
    pillowDistInfo: packageDirs.find((name) => /^pillow-.*\.dist-info$/i.test(name)) || null,
    recognizerModel: await maybeHash(modelPath),
    detectorModel: await maybeHash(detPath),
    dictionary: await maybeHash(characterPath),
  };
}

function sampleTensorDeltas(aSamples = [], cSamples = []) {
  const cByIndex = new Map(cSamples.map((entry) => [entry.index, entry.value]));
  const compared = [];
  for (const sample of aSamples) {
    if (!cByIndex.has(sample.index)) continue;
    const delta = Number(Math.abs(sample.value - cByIndex.get(sample.index)).toFixed(8));
    compared.push({ index: sample.index, a: sample.value, c: cByIndex.get(sample.index), delta });
  }
  return {
    compared: compared.length,
    maxDelta: compared.reduce((max, row) => Math.max(max, row.delta), 0),
    meanDelta: Number(
      (compared.reduce((sum, row) => sum + row.delta, 0) / Math.max(1, compared.length)).toFixed(8)
    ),
    rows: compared,
  };
}

function delta392Explanation(maxDelta) {
  const byteDelta = maxDelta / (2 / 255);
  return {
    observedNormalizedDelta: maxDelta,
    normalizedStep: Number((2 / 255).toFixed(10)),
    equivalentByteDelta: Number(byteDelta.toFixed(4)),
    interpretation:
      Math.abs(byteDelta - Math.round(byteDelta)) < 0.01
        ? `approximately ${Math.round(byteDelta)} byte levels under (channel/255 - 0.5) / 0.5`
        : "not a clean integer byte delta under current normalization",
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const [
    fixtureSummary,
    manifest,
    rawResults,
    candidateResults,
    r6Results,
    confidenceSummary,
    confidenceOfflineResults,
    confidenceTensorParity,
    confidenceLogitParity,
  ] = await Promise.all([
    readJson(path.join(fixtureExpansionDir, "summary.json")),
    readJson(path.join(fixtureExpansionDir, "crop-manifest.json")),
    readJson(path.join(fixtureExpansionDir, "rapidocr-raw-results.json")),
    readJson(path.join(fixtureExpansionDir, "candidate-results.json")),
    readJson(path.join(fixtureExpansionDir, "r6-results.json")),
    readJson(path.join(confidenceDir, "summary.json")),
    readJson(path.join(confidenceDir, "offline-recognizer-results.json")),
    readJson(path.join(confidenceDir, "tensor-parity.json")),
    readJson(path.join(confidenceDir, "logit-parity.json")),
  ]);

  const acceptedRows = r6Results.accepted || [];
  const focusedFields = acceptedRows.flatMap((row) =>
    fields.map((field) => ({ image: row.image, stage: 3, side: row.side, field }))
  );
  const manifestByKey = new Map(
    manifest.records
      .filter((record) => record.stage === 3 && record.cropKind === "field")
      .map((record) => [fileKey(record.image, record.side, record.field), record])
  );
  const browserDiagnostics = new Map();
  for (const image of [...new Set(focusedFields.map((row) => row.image))]) {
    const filePath = path.join(browserRunDir, image, "direct-rapidocr-diagnostic.json");
    try {
      browserDiagnostics.set(image, await readJson(filePath));
    } catch {
      browserDiagnostics.set(image, null);
    }
  }
  const browserFieldByKey = new Map();
  for (const [image, diagnostic] of browserDiagnostics) {
    for (const field of diagnostic?.fields || []) {
      if (field.stage === 3 && field.crop?.baseVariantId === "baseline-12pct-padding") {
        browserFieldByKey.set(fileKey(image, field.side, field.field), field);
      }
    }
  }
  const offlineSameCropByKey = new Map(
    (confidenceOfflineResults.results || []).map((row) => [fileKey(row.image, row.side, row.field), row])
  );

  const pipelineAInventory = {
    id: "PIPELINE-A-ORIGINAL-OFFLINE",
    sourceScript: "tmp/ipad-stage3-rapidocr-fixture-expansion/rapidocr_runner.py",
    generatorScript: "scripts/ipad-stage3-alternate-model-investigation.mjs",
    cropGenerator: "sharp extract(...).png() over padIpadArithmeticFieldZone(..., 0.12) for field crops; F1/F2 union/full-side crops for detector profile",
    recognizerCall: "rapidocr_onnxruntime.RapidOCR()(crop_path, use_det/use_cls/use_rec)",
    profiles: [
      "rapidocr-recognition-only: use_det=False,use_cls=False,use_rec=True,cropKinds=field",
      "rapidocr-detect-recognize: use_det=True,use_cls=False,use_rec=True,cropKinds=field,f1-member-row,f2-full-side",
    ],
    pythonPackageInventory: await recModelInventory(),
    baseline: {
      exactRecognition: fixtureSummary.exactRecognition,
      r6: fixtureSummary.r6HybridSafeSide,
    },
  };
  const pipelineBInventory = {
    id: "PIPELINE-B-CURRENT-OFFLINE-SAME-CROP",
    sourceScript: "scripts/ipad-stage3-rapidocr-confidence-parity.mjs",
    helper: "tmp/ipad-stage3-rapidocr-confidence-parity/offline_confidence_helper.py",
    description:
      "Offline ONNXRuntime recomputation over current browser/direct-runner support crop rectangles. It is not the historical original-offline crop generator.",
    baseline: confidenceSummary.r6BeforeAfter,
  };
  const pipelineCInventory = {
    id: "PIPELINE-C-CURRENT-BROWSER",
    sourceScript: "app/lib/ipadStage3RapidOcrBrowser.js",
    directRunner: "scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs",
    framework: "onnxruntime-web WASM",
    recognizerPreprocessing:
      "Canvas crop, Canvas resize with imageSmoothingQuality=medium, BGR NCHW, (channel/255 - 0.5) / 0.5, width capped/padded to 320",
    baseline: confidenceSummary.browserBestEvidence,
  };

  const geometryRows = [];
  const cropPixelRows = [];
  const stageChecksumRows = [];
  const fieldAudits = [];
  for (const row of focusedFields) {
    const key = fileKey(row.image, row.side, row.field);
    const a = manifestByKey.get(key);
    const b = offlineSameCropByKey.get(key);
    const c = browserFieldByKey.get(key);
    const aRect = a?.rect || null;
    const bRect = b?.rect || null;
    const cRect = c?.crop?.rect || null;
    const geometry = {
      ...row,
      pipelineA: aRect,
      pipelineB: bRect,
      pipelineC: cRect,
      aVsB: {
        class: geometryClass(aRect, bRect),
        iou: Number(rectIou(aRect, bRect).toFixed(6)),
        aContainsB: containsRect(aRect, bRect),
        bContainsA: containsRect(bRect, aRect),
      },
      aVsC: {
        class: geometryClass(aRect, cRect),
        iou: Number(rectIou(aRect, cRect).toFixed(6)),
        aContainsC: containsRect(aRect, cRect),
        cContainsA: containsRect(cRect, aRect),
      },
      bVsC: {
        class: geometryClass(bRect, cRect),
        iou: Number(rectIou(bRect, cRect).toFixed(6)),
        bContainsC: containsRect(bRect, cRect),
        cContainsB: containsRect(cRect, bRect),
      },
    };
    geometryRows.push(geometry);

    let cropComparison = { ...row, status: "missing-a-crop" };
    if (a?.cropPath) {
      const aCropPath = path.join(rootDir, a.cropPath);
      const aPixels = await rawPixels(aCropPath);
      const aRecropPixels = await cropRawPixels(path.join(rootDir, a.sourceImage), a.rect);
      cropComparison = {
        ...row,
        pipelineAFile: a.cropPath,
        pipelineACropSha256: a.sha256,
        pipelineCReportedCropSha256: c?.crop?.sha256 || null,
        aSavedVsARecropPixels: compareRawPixels(aPixels, aRecropPixels),
        cPixelsAvailable: false,
        cPixelsReason: "current browser artifact exports crop SHA/metadata but not lossless crop pixels",
      };
    }
    cropPixelRows.push(cropComparison);

    const aCandidateRows = candidateResults.filter(
      (candidate) => candidate.image === row.image && candidate.side === row.side && candidate.assignedField === row.field
    );
    const aExactRows = aCandidateRows.filter((candidate) => candidate.exactExpected);
    const bOutput = b?.output || null;
    const cRecognition = c?.recognition || null;
    const tensorDeltas = sampleTensorDeltas(b?.preprocessing?.samples, c?.crop?.inputSamples);
    stageChecksumRows.push({
      ...row,
      pipelineA: {
        cropSha256: a?.sha256 || null,
        expected: a?.expected ?? null,
        exactCandidateCount: aExactRows.length,
        exactCandidateSources: aExactRows.slice(0, 8).map((candidate) => ({
          value: candidate.value,
          cropKind: candidate.cropKind,
          profileId: candidate.profileId,
          sourceField: candidate.sourceField,
          fullText: candidate.fullText,
          confidence: candidate.confidence,
          bbox: candidate.bbox || null,
        })),
      },
      pipelineB: {
        rect: b?.rect || null,
        cropRawPixelSha256: b?.crop?.rawPixelSha256 || null,
        tensorSha256: b?.preprocessing?.tensorSha256 || null,
        outputSha256: bOutput?.sha256 || null,
        text: bOutput?.text || null,
        confidence: bOutput?.confidence ?? null,
      },
      pipelineC: {
        rect: c?.crop?.rect || null,
        cropSha256: c?.crop?.sha256 || null,
        preprocessingChecksum: c?.crop?.preprocessingChecksum || null,
        outputChecksum: cRecognition?.outputChecksum || null,
        text: cRecognition?.text || null,
        confidence: cRecognition?.confidence ?? null,
        rapidOcrCompatibleConfidence: cRecognition?.rapidOcrCompatibleConfidence ?? null,
      },
      sampledTensorDeltaBvsC: tensorDeltas,
    });
    fieldAudits.push({
      ...row,
      firstDivergence: geometry.aVsB.class !== "G0-same-geometry" ? "Stage1-crop-geometry-A-vs-B" : "Stage2-preprocessing/tensor-or-browser-crop-A-vs-C",
      pipelineAExactCandidateAvailable: aExactRows.length > 0,
      pipelineBText: bOutput?.text || null,
      pipelineCText: cRecognition?.text || null,
      notes:
        geometry.aVsB.class !== "G0-same-geometry"
          ? "Current offline same-crop is not reproducing original geometry for this support field."
          : "A and C baseline geometry match; remaining measurable divergence is crop serialization/browser pixels and recognizer preprocessing/tensor/logits.",
    });
  }

  const geometrySummary = {
    focusedFieldCount: focusedFields.length,
    aVsB: Object.groupBy(geometryRows, (row) => row.aVsB.class),
    aVsC: Object.groupBy(geometryRows, (row) => row.aVsC.class),
    bVsC: Object.groupBy(geometryRows, (row) => row.bVsC.class),
  };
  const compactGeometrySummary = Object.fromEntries(
    Object.entries(geometrySummary).map(([key, value]) =>
      Array.isArray(value) || typeof value !== "object" || value === null
        ? [key, value]
        : [key, Object.fromEntries(Object.entries(value).map(([label, rows]) => [label, rows.length]))]
    )
  );

  const maxSampleDelta = Math.max(
    0,
    ...stageChecksumRows.map((row) => row.sampledTensorDeltaBvsC?.maxDelta || 0),
    ...(confidenceTensorParity.results || []).map((row) => row.maxSampleDelta || 0)
  );
  const firstDivergence = {
    primaryFinding:
      "The first confirmed divergence between PIPELINE A and PIPELINE B is crop geometry for the current same-crop support rows. Where PIPELINE A and PIPELINE C share the baseline fixed ROI, the next confirmed divergence is preprocessing/tensor construction before logits.",
    aVsBGeometryClasses: compactGeometrySummary.aVsB,
    aVsCGeometryClasses: compactGeometrySummary.aVsC,
    bVsCGeometryClasses: compactGeometrySummary.bVsC,
    tensorParityCarryover: {
      fromConfidenceParity: "tensor checksum parity 0/20; browser/offline same-crop logits diverge after preprocessing differences",
      maxSampleDelta,
      delta392: delta392Explanation(0.39215692),
    },
  };

  const testP = {
    id: "TEST-P-current-browser-crop-plus-original-compatible-preprocessing",
    run: false,
    reason:
      "Not run fixture-wide. The existing current-offline-same-crop oracle already used current browser support crops and did not recover frozen R6 TP rows.",
    result: confidenceSummary.r6BeforeAfter.afterSameCropOfflineConfidenceOracle,
  };
  const testG = {
    id: "TEST-G-original-offline-geometry-plus-original-compatible-preprocessing",
    run: "already represented by PIPELINE A historical artifact",
    result: {
      tp: fixtureSummary.r6HybridSafeSide.tp,
      fp: fixtureSummary.r6HybridSafeSide.fp,
      accepted: fixtureSummary.r6HybridSafeSide.accepted,
    },
    note:
      "A fresh browser-equivalent TEST-G was not run because original detector-derived geometry is not implemented in browser parity form; the historical Python artifact remains the source of truth for original geometry.",
  };

  const img0283 = {
    image: "IMG_0283.png",
    originalOffline: (fixtureSummary.r6HybridSafeSide.accepted || []).filter((row) => row.image === "IMG_0283.png"),
    currentBrowserConfidenceParity: confidenceSummary.img0283,
    conclusion:
      "IMG_0283 self is a historical offline TP, but current browser remains blocked by member confidence; the prior IMG_0283 enemy FP remains blocked by frozen R6.",
  };

  const baseline = {
    production: confidenceSummary.productionBaseline,
    originalFrozenOfflineRapidOcr: confidenceSummary.offlineFrozenR6,
    currentBrowserBestEvidence: confidenceSummary.browserBestEvidence,
    confidenceDecoderParity: confidenceSummary.decoderSemantics,
  };
  await writeJson("baseline.json", baseline);
  await writeJson("pipeline-a-inventory.json", pipelineAInventory);
  await writeJson("pipeline-b-inventory.json", pipelineBInventory);
  await writeJson("pipeline-c-inventory.json", pipelineCInventory);
  await writeJson("original-four-crops.json", focusedFields.map((row) => ({ ...row, manifest: manifestByKey.get(fileKey(row.image, row.side, row.field)) || null })));
  await writeJson("geometry-comparison.json", { summary: compactGeometrySummary, rows: geometryRows });
  await writeJson("source-pixel-parity.json", {
    status: "partial",
    finding:
      "PIPELINE A source crop extraction is reproducible from sharp source pixels. Browser ImageBitmap/Canvas source pixels are not exported in current artifacts.",
  });
  await writeJson("crop-pixel-parity.json", cropPixelRows);
  await writeJson("stage-checksums.json", stageChecksumRows);
  await writeJson("resize-parity.json", {
    pipelineA: "RapidOCR package internal cv2.resize through TextRecognizer, width is not capped to browser 320 in observed confidence helper artifacts.",
    pipelineC: "Canvas drawImage to height 48, width ceil(48 * ratio) capped/padded to 320.",
    finding: "Width policy differs for the current same-crop helper in at least one observed field: 737x104 -> width 340 offline, while browser field path caps/pads to 320.",
  });
  await writeJson("channel-parity.json", {
    finding: "Both diagnostic paths intentionally use BGR channel ordering for RapidOCR compatibility.",
    caveat: "Exact tensor parity is still absent because crop geometry and resize primitives differ.",
  });
  await writeJson("normalization-parity.json", {
    formula: "(channel / 255 - 0.5) / 0.5",
    knownValues: [0, 64, 128, 192, 255].map((byte) => ({ byte, normalized: Number(((byte / 255 - 0.5) / 0.5).toFixed(8)) })),
    delta392: delta392Explanation(0.39215692),
  });
  await writeJson("tensor-parity.json", {
    priorConfidenceParity: confidenceTensorParity,
    focusedRows: stageChecksumRows.map((row) => ({
      image: row.image,
      side: row.side,
      field: row.field,
      sampledTensorDeltaBvsC: row.sampledTensorDeltaBvsC,
    })),
  });
  await writeJson("first-divergence.json", firstDivergence);
  await writeJson("logit-parity.json", {
    priorConfidenceParity: confidenceLogitParity,
    finding:
      "Logit differences are downstream of non-identical crop/preprocessing tensors. ONNXRuntime native-vs-WASM cannot be isolated until input tensor parity exists.",
  });
  await writeJson("test-p-current-geometry.json", testP);
  await writeJson("test-g-original-geometry.json", testG);
  await writeJson("four-row-audit.json", fieldAudits);
  await writeJson("img0283-audit.json", img0283);
  await writeJson("full-results.json", {
    expanded: false,
    reason:
      "Focused results do not meet expansion criteria: current geometry plus same-crop offline confidence recovered 0 TP, and original geometry is not reproduced in browser.",
  });
  await writeJson("recommendation.json", {
    productionReadinessReviewJustified: false,
    browserRapidOcrViability:
      "Still plausible only if original geometry or a browser-safe equivalent can be reproduced. Preprocessing alone on current crops is insufficient.",
    nextStep:
      "Reproduce PIPELINE A crop geometry and RapidOCR package preprocessing in a small browser-equivalent diagnostic, including detector-derived/F1/F2 source provenance, before any scoring or production review.",
  });
  await writeJson("summary.json", {
    schema: "ipad-stage3-rapidocr-preprocessing-parity-v1",
    generatedAt: new Date().toISOString(),
    baseline,
    focusedFieldCount: focusedFields.length,
    geometrySummary: compactGeometrySummary,
    firstDivergence,
    testP,
    testG,
    img0283,
    productionUnchanged: true,
  });
  console.log(JSON.stringify({ outputDir: normalizePath(outputDir), focusedFieldCount: focusedFields.length, firstDivergence }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
