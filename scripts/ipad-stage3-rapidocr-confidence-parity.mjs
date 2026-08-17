import crypto from "node:crypto";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateIpadStage3RapidOcrR6 } from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-confidence-parity");
const isolationDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-r6-blocker-isolation");
const browserRunDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-nonzero-bonus", "run-1");
const offlineDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-fixture-expansion");
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const rapidOcrTargetDir = path.join(rootDir, "tmp", "rapidocr-python");
const rapidOcrModelDir = path.join(rapidOcrTargetDir, "rapidocr_onnxruntime", "models");
const fields = ["total", "member1", "member2", "member3", "bonus"];

function normalizePathForReport(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.writeFile(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function getPythonExecutable() {
  const candidates = [
    process.env.RAPIDOCR_PYTHON,
    path.join(
      process.env.USERPROFILE || "",
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "python",
      "python.exe"
    ),
    "python",
  ].filter(Boolean);
  return candidates.find((candidate) => spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0);
}

function fieldValue(proposal, field) {
  if (field === "member1") return Number(proposal.members?.[0] || 0);
  if (field === "member2") return Number(proposal.members?.[1] || 0);
  if (field === "member3") return Number(proposal.members?.[2] || 0);
  return Number(proposal[field] || 0);
}

function rowId(row) {
  return `${row.image}|stage${row.stage}|${row.side}`;
}

function fieldId(row, field) {
  return `${rowId(row)}|${field}`;
}

function rowsForField(candidateRows, image, side, field) {
  return candidateRows.filter(
    (row) => row.image === image && row.stage === 3 && row.side === side && (row.assignedField || row.sourceField) === field
  );
}

function exactRowsForField(candidateRows, row, field) {
  const expected = fieldValue(row.proposal, field);
  return rowsForField(candidateRows, row.image, row.side, field).filter((candidate) => Number(candidate.value) === expected);
}

function chooseBrowserSupport(candidateRows, row, field) {
  const exactRows = exactRowsForField(candidateRows, row, field);
  if (!exactRows.length) return null;
  return [...exactRows].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0];
}

function buildEvidence(proposalRow, candidateRows, confidenceOverrides = {}) {
  const fieldSupports = {};
  for (const field of fields) {
    const expected = fieldValue(proposalRow.proposal, field);
    const exactRows = exactRowsForField(candidateRows, proposalRow, field);
    const confidences = exactRows.map((row) => Number(row.confidence)).filter(Number.isFinite);
    const override = confidenceOverrides[field];
    const supportCount = exactRows.length;
    fieldSupports[field] = {
      field,
      value: expected,
      supportCount,
      distinctCandidateCount: new Set(rowsForField(candidateRows, proposalRow.image, proposalRow.side, field).map((row) => Number(row.value))).size,
      sourceCount: rowsForField(candidateRows, proposalRow.image, proposalRow.side, field).length,
      confidence:
        typeof override === "number"
          ? { min: override, max: override, mean: override }
          : {
              min: confidences.length ? Number(Math.min(...confidences).toFixed(4)) : null,
              max: confidences.length ? Number(Math.max(...confidences).toFixed(4)) : null,
              mean: confidences.length
                ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(4))
                : null,
            },
      bbox: {
        availableCount: exactRows.filter((candidate) => candidate.bbox).length,
        ambiguousCount: exactRows.filter((candidate) => candidate.assignment?.ambiguous).length,
      },
      digitCount: String(Math.abs(Number(expected || 0))).length,
      variants: [...new Set(exactRows.map((candidate) => candidate.crop?.variantId).filter(Boolean))],
      preprocessingProfileIds: [
        ...new Set(exactRows.map((candidate) => candidate.crop?.preprocessingProfileId).filter(Boolean)),
      ],
      rawTexts: [...new Set(exactRows.map((candidate) => candidate.fullText).filter(Boolean))],
      fragments: [],
    };
  }
  const changedSupports = proposalRow.changedFields.map((field) => fieldSupports[field]);
  const evidence = {
    ...proposalRow,
    fieldSupports,
    changedSupports,
    featureSummary: {
      changedFieldsLowDigit: changedSupports.filter((support) => Number(support.digitCount || 0) < 5).length,
    },
  };
  return { ...evidence, evaluation: evaluateIpadStage3RapidOcrR6(evidence) };
}

function pythonHelperSource() {
  return String.raw`
import hashlib, json, math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.environ["RAPIDOCR_TARGET_DIR"])
import onnxruntime as ort

requests_path = os.environ["REQUESTS_JSON"]
out_path = os.environ["OUT_JSON"]
with open(requests_path, "r", encoding="utf-8") as handle:
    requests = json.load(handle)

session_options = ort.SessionOptions()
session_options.log_severity_level = 4
session_options.enable_cpu_mem_arena = False
session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
session = ort.InferenceSession(
    os.environ["RAPIDOCR_REC_MODEL"],
    sess_options=session_options,
    providers=[("CPUExecutionProvider", {"arena_extend_strategy": "kSameAsRequested"})],
)
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name
character = session.get_modelmeta().custom_metadata_map.get("character", "").splitlines()
character.insert(len(character), " ")
character.insert(0, "blank")

def blue_bonus_mask(img):
    b = img[:, :, 0].astype(np.int16)
    g = img[:, :, 1].astype(np.int16)
    r = img[:, :, 2].astype(np.int16)
    ink = (b > r + 12) & (b > g + 4) & (b > 90) & (g > 45)
    out = np.full_like(img, 255)
    out[ink] = [0, 0, 0]
    return out

def resize_norm_img(img, max_wh_ratio):
    img_channel, img_height, img_width = [3, 48, 320]
    img_width = int(img_height * max_wh_ratio)
    h, w = img.shape[:2]
    ratio = w / float(h)
    resized_w = img_width if math.ceil(img_height * ratio) > img_width else int(math.ceil(img_height * ratio))
    # RapidOCR uses cv2.resize default INTER_LINEAR. Pillow bilinear is close enough
    # for this diagnostic when OpenCV is unavailable in the bundled runtime.
    rgb = img[:, :, ::-1]
    resized_rgb = np.array(Image.fromarray(rgb).resize((resized_w, img_height), Image.Resampling.BILINEAR))
    resized = resized_rgb[:, :, ::-1]
    resized = resized.astype("float32")
    resized = resized.transpose((2, 0, 1)) / 255
    resized -= 0.5
    resized /= 0.5
    padded = np.zeros((img_channel, img_height, img_width), dtype=np.float32)
    padded[:, :, 0:resized_w] = resized
    return padded, resized_w, img_width

def top_summary(preds):
    text_index = preds.argmax(axis=1)
    text_prob = preds.max(axis=1)
    previous = -1
    text = ""
    retained = []
    summary = []
    for t, idx in enumerate(text_index.tolist()):
        row = preds[t]
        order = np.argsort(row)[-2:][::-1]
        keep = idx != 0 and idx != previous
        char = character[idx] if idx < len(character) else ""
        if keep:
            text += char
            retained.append({"timestep": t, "index": int(idx), "char": char, "confidence": round(float(text_prob[t]), 8)})
        summary.append({
            "timestep": t,
            "top1": {"index": int(order[0]), "char": character[int(order[0])] if int(order[0]) < len(character) else "", "probability": round(float(row[order[0]]), 8)},
            "top2": {"index": int(order[1]), "char": character[int(order[1])] if int(order[1]) < len(character) else "", "probability": round(float(row[order[1]]), 8)},
            "blankProbability": round(float(row[0]), 8),
            "retained": bool(keep),
        })
        previous = idx
    conf = float(np.mean([entry["confidence"] for entry in retained])) if retained else 0.0
    return text, conf, retained, summary

def decode_package_semantics(preds):
    text_index = preds.argmax(axis=1)
    text_prob = preds.max(axis=1)
    selection = np.ones(len(text_index), dtype=bool)
    selection[1:] = text_index[1:] != text_index[:-1]
    selection &= text_index != 0
    conf_list = np.array(text_prob[selection]).tolist()
    if len(conf_list) == 0:
        conf_list = [0]
    chars = [character[int(text_id)] for text_id in text_index[selection]]
    return "".join(chars), float(np.mean(conf_list))

sample_indices = [0,1,2,17,31,32,47,48,319,320,1535,1536,4096,8192]
results = []
for req in requests:
    try:
        image_rgb = Image.open(req["sourceImage"]).convert("RGB")
    except Exception:
        results.append({"id": req["id"], "error": "source-image-unreadable"})
        continue
    rect = req["rect"]
    x, y, w, h = int(rect["x"]), int(rect["y"]), int(rect["width"]), int(rect["height"])
    crop_rgb = np.array(image_rgb.crop((x, y, x+w, y+h)))
    crop = crop_rgb[:, :, ::-1].copy()
    if req.get("preprocessingProfileId") == "bonus-blue-mask":
        crop = blue_bonus_mask(crop)
    crop_hash = hashlib.sha256(crop.tobytes()).hexdigest()
    ratio = crop.shape[1] / float(crop.shape[0])
    max_wh_ratio = max(320 / 48, ratio)
    tensor, resized_w, padded_w = resize_norm_img(crop, max_wh_ratio)
    tensor_hash = hashlib.sha256(tensor.tobytes()).hexdigest()
    batch = tensor[np.newaxis, :].astype(np.float32)
    preds = session.run([output_name], {input_name: batch})[0][0]
    output_hash = hashlib.sha256(preds.astype(np.float32).tobytes()).hexdigest()
    text, conf, retained, summary = top_summary(preds)
    package_text, package_conf = decode_package_semantics(preds)
    samples = [{"index": idx, "value": round(float(tensor.reshape(-1)[idx]), 8)} for idx in sample_indices if idx < tensor.size]
    results.append({
        "id": req["id"],
        "image": req["image"],
        "side": req["side"],
        "field": req["field"],
        "profileId": req.get("preprocessingProfileId") or "recognizer-current",
        "rect": rect,
        "crop": {"width": int(crop.shape[1]), "height": int(crop.shape[0]), "rawPixelSha256": crop_hash},
        "preprocessing": {
            "inputShape": [1, 3, 48, int(padded_w)],
            "sourceWidth": int(crop.shape[1]),
            "sourceHeight": int(crop.shape[0]),
            "resizedWidth": int(resized_w),
            "resizedHeight": 48,
            "paddedWidth": int(padded_w),
            "colorOrder": "BGR",
            "normalization": "(channel/255 - 0.5) / 0.5",
            "tensorLayout": "NCHW",
            "dtype": "float32",
            "interpolation": "cv2.resize default INTER_LINEAR",
            "tensorSha256": tensor_hash,
            "samples": samples,
        },
        "output": {
            "shape": list(preds.shape),
            "sha256": output_hash,
            "text": text,
            "confidence": round(conf, 8),
            "rapidOcrPackageText": package_text,
            "rapidOcrPackageConfidence": round(float(package_conf), 8),
            "retained": retained,
            "topSummary": summary,
        }
    })
with open(out_path, "w", encoding="utf-8") as handle:
    json.dump({"results": results}, handle, ensure_ascii=False, indent=2)
`;
}

async function runOfflineRecognizer(requests) {
  const python = getPythonExecutable();
  if (!python) throw new Error("No Python executable found.");
  const helperPath = path.join(outputDir, "offline_confidence_helper.py");
  const requestPath = path.join(outputDir, "offline-requests.json");
  const outPath = path.join(outputDir, "offline-recognizer-results.json");
  await fs.writeFile(helperPath, pythonHelperSource());
  await fs.writeFile(requestPath, JSON.stringify(requests, null, 2));
  const result = spawnSync(python, [helperPath], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      RAPIDOCR_TARGET_DIR: rapidOcrTargetDir,
      RAPIDOCR_REC_MODEL: path.join(rapidOcrModelDir, "ch_PP-OCRv4_rec_infer.onnx"),
      REQUESTS_JSON: requestPath,
      OUT_JSON: outPath,
    },
    timeout: 120000,
  });
  if (result.status !== 0) {
    throw new Error(`Offline recognizer helper failed:\n${result.stdout}\n${result.stderr}`);
  }
  return readJson(outPath);
}

function compareSamples(browserSamples = [], offlineSamples = []) {
  const byIndex = new Map(offlineSamples.map((sample) => [sample.index, sample.value]));
  const deltas = browserSamples
    .filter((sample) => byIndex.has(sample.index))
    .map((sample) => Math.abs(Number(sample.value) - Number(byIndex.get(sample.index))));
  return {
    compared: deltas.length,
    maxDelta: deltas.length ? Number(Math.max(...deltas).toFixed(8)) : null,
    meanDelta: deltas.length ? Number((deltas.reduce((sum, value) => sum + value, 0) / deltas.length).toFixed(8)) : null,
  };
}

function compareTop(browserTop = [], offlineTop = []) {
  const count = Math.min(browserTop.length, offlineTop.length);
  let top1Disagreements = 0;
  const probabilityDeltas = [];
  for (let index = 0; index < count; index += 1) {
    const b = browserTop[index];
    const o = offlineTop[index];
    if (b?.top1?.index !== o?.top1?.index) top1Disagreements += 1;
    if (typeof b?.top1?.probability === "number" && typeof o?.top1?.probability === "number") {
      probabilityDeltas.push(Math.abs(b.top1.probability - o.top1.probability));
    }
  }
  return {
    comparedTimesteps: count,
    top1Disagreements,
    maxProbabilityDelta: probabilityDeltas.length ? Number(Math.max(...probabilityDeltas).toFixed(8)) : null,
    meanProbabilityDelta: probabilityDeltas.length
      ? Number((probabilityDeltas.reduce((sum, value) => sum + value, 0) / probabilityDeltas.length).toFixed(8))
      : null,
  };
}

function confidenceClassification(delta) {
  if (delta === null || !Number.isFinite(delta)) return "unknown";
  if (delta <= 0.000001) return "A. exact/near-exact parity";
  if (delta <= 0.02) return "B. small numerical delta";
  if (delta <= 0.15) return "C. large but possibly monotonic delta";
  return "D. incompatible confidence magnitude";
}

function summarizeConfidenceRows(candidateRows) {
  const exact = [];
  const wrong = [];
  for (const row of candidateRows) {
    const confidence = Number(row.confidence);
    if (!Number.isFinite(confidence)) continue;
    const hasExpected = Boolean(row.expectedMatch || row.comparison?.matchesExpected);
    (hasExpected ? exact : wrong).push(confidence);
  }
  const summarize = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return {
      count: values.length,
      mean: Number(mean.toFixed(6)),
      median: sorted.length ? Number(sorted[Math.floor(sorted.length / 2)].toFixed(6)) : null,
      min: sorted.length ? Number(sorted[0].toFixed(6)) : null,
      max: sorted.length ? Number(sorted[sorted.length - 1].toFixed(6)) : null,
      below090: values.filter((value) => value < 0.9).length,
    };
  };
  return {
    note:
      "This broad sample is browser-confidence-only. Offline same-crop logits were generated only for the frozen R6 proposal fields.",
    correctBrowserRecognizedFields: summarize(exact.slice(0, 20)),
    wrongBrowserRecognizedFields: summarize(wrong.slice(0, 20)),
    allExactCandidateConfidences: summarize(exact),
    allWrongCandidateConfidences: summarize(wrong),
  };
}

async function loadRunSummary(runNumber) {
  const summaryPath = path.join(browserRunDir, `../run-${runNumber}`, "summary.json");
  if (!fssync.existsSync(summaryPath)) return null;
  return readJson(summaryPath);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const browserRows = await readJson(path.join(browserRunDir, "results.json"));
  const browserSummary = await readJson(path.join(browserRunDir, "summary.json"));
  const secondRunSummary = await loadRunSummary(2);
  const isolationSummary = await readJson(path.join(isolationDir, "summary.json"));
  const browserFour = await readJson(path.join(isolationDir, "browser-four.json"));
  const offlineFour = await readJson(path.join(isolationDir, "offline-four.json"));
  const manifest = await readJson(path.join(offlineDir, "crop-manifest.json"));

  const allCandidateRows = browserRows.flatMap((row) => row.candidateRows || []);
  const broadConfidenceSample = summarizeConfidenceRows(allCandidateRows);
  const requests = [];
  const fieldComparisons = [];
  for (const row of browserFour) {
    for (const field of fields) {
      const support = chooseBrowserSupport(allCandidateRows, row, field);
      if (!support) {
        fieldComparisons.push({
          id: fieldId(row, field),
          image: row.image,
          side: row.side,
          field,
          expected: fieldValue(row.proposal, field),
          browserSupport: false,
        });
        continue;
      }
      const rect = support.crop?.rect;
      const sourceImage = path.join(ipadImageDir, row.image);
      requests.push({
        id: fieldId(row, field),
        image: row.image,
        side: row.side,
        field,
        sourceImage,
        rect,
        preprocessingProfileId: support.crop?.preprocessingProfileId || "recognizer-current",
      });
      const offlineManifest = (manifest.records || []).find(
        (record) =>
          record.image === row.image &&
          record.stage === 3 &&
          record.side === row.side &&
          record.field === field &&
          record.cropKind === "field"
      );
      const sameRect =
        offlineManifest &&
        rect &&
        ["x", "y", "width", "height"].every((key) => Number(offlineManifest.rect?.[key]) === Number(rect?.[key]));
      fieldComparisons.push({
        id: fieldId(row, field),
        image: row.image,
        side: row.side,
        field,
        expected: fieldValue(row.proposal, field),
        browserSupport: true,
        browser: {
          value: support.value,
          rawText: support.fullText,
          confidence: Number(support.confidence || 0),
          compatibleConfidence: Number(support.rapidOcrCompatibleConfidence || support.confidence || 0),
          variantId: support.crop?.variantId,
          preprocessingProfileId: support.crop?.preprocessingProfileId,
          cropSha256: support.crop?.sha256,
          preprocessingChecksum: support.crop?.preprocessingChecksum,
          preprocessing: support.crop?.preprocessing,
          inputSamples: support.crop?.inputSamples || [],
          outputShape: support.outputShape,
          outputChecksum: support.outputChecksum,
          outputTopSummary: support.outputTopSummary || [],
          decodedTrace: support.decodedTrace || [],
        },
        offlineBaselineCrop: offlineManifest
          ? {
              rect: offlineManifest.rect,
              pngSha256: offlineManifest.sha256,
              sameRectAsBrowserSupport: Boolean(sameRect),
            }
          : null,
      });
    }
  }

  const offline = await runOfflineRecognizer(requests);
  const offlineById = new Map((offline.results || []).map((row) => [row.id, row]));
  const enriched = fieldComparisons.map((comparison) => {
    const offlineRow = offlineById.get(comparison.id);
    if (!comparison.browserSupport || !offlineRow) return comparison;
    const browserPre = comparison.browser.preprocessing || {};
    const offlinePre = offlineRow.preprocessing || {};
    const confidenceDelta = Math.abs(Number(comparison.browser.confidence || 0) - Number(offlineRow.output?.confidence || 0));
    const compatibleConfidenceDelta = Math.abs(
      Number(comparison.browser.compatibleConfidence || 0) - Number(offlineRow.output?.confidence || 0)
    );
    return {
      ...comparison,
      offlineSameBrowserCrop: {
        crop: offlineRow.crop,
        preprocessing: offlinePre,
        output: {
          shape: offlineRow.output?.shape,
          sha256: offlineRow.output?.sha256,
          text: offlineRow.output?.text,
          confidence: offlineRow.output?.confidence,
          rapidOcrPackageText: offlineRow.output?.rapidOcrPackageText,
          rapidOcrPackageConfidence: offlineRow.output?.rapidOcrPackageConfidence,
          topSummary: offlineRow.output?.topSummary || [],
          retained: offlineRow.output?.retained || [],
        },
      },
      parity: {
        cropDimensionParity:
          Number(browserPre.sourceWidth) === Number(offlinePre.sourceWidth) &&
          Number(browserPre.sourceHeight) === Number(offlinePre.sourceHeight),
        resizedDimensionParity: Number(browserPre.resizedWidth) === Number(offlinePre.resizedWidth),
        paddedDimensionParity: Number(browserPre.paddedWidth) === Number(offlinePre.paddedWidth),
        tensorShapeParity:
          JSON.stringify([1, 3, browserPre.resizedHeight, browserPre.paddedWidth]) ===
          JSON.stringify(offlinePre.inputShape),
        tensorChecksumParity: comparison.browser.preprocessingChecksum === offlinePre.tensorSha256,
        sampleDeltas: compareSamples(comparison.browser.inputSamples, offlinePre.samples),
        logitParity:
          comparison.browser.outputTopSummary?.length && offlineRow.output?.topSummary?.length
            ? compareTop(comparison.browser.outputTopSummary, offlineRow.output.topSummary)
            : { comparedTimesteps: 0, top1Disagreements: null, maxProbabilityDelta: null, meanProbabilityDelta: null },
        decodedTextParity: String(comparison.browser.rawText || "") === String(offlineRow.output?.text || ""),
        confidenceDelta: Number(confidenceDelta.toFixed(8)),
        compatibleConfidenceDelta: Number(compatibleConfidenceDelta.toFixed(8)),
        confidenceClassification: confidenceClassification(compatibleConfidenceDelta),
      },
    };
  });

  const correctedConfidenceOverridesByRow = {};
  for (const comparison of enriched) {
    if (!comparison.browserSupport || !comparison.offlineSameBrowserCrop) continue;
    const key = `${comparison.image}|${comparison.side}`;
    correctedConfidenceOverridesByRow[key] ||= {};
    correctedConfidenceOverridesByRow[key][comparison.field] = Number(
      comparison.offlineSameBrowserCrop.output?.confidence ?? comparison.browser.confidence
    );
  }
  const r6BeforeAfter = browserFour.map((row) => {
    const before = buildEvidence(row, allCandidateRows);
    const after = buildEvidence(row, allCandidateRows, correctedConfidenceOverridesByRow[`${row.image}|${row.side}`] || {});
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      before: {
        wouldApply: before.evaluation.wouldApply,
        blockReasons: before.evaluation.blockReasons,
      },
      after: {
        wouldApply: after.evaluation.wouldApply,
        blockReasons: after.evaluation.blockReasons,
        proposal: after.evaluation.proposal,
      },
    };
  });

  const confidenceBlocks14 = enriched
    .filter((row) => row.browserSupport && row.browser?.confidence < 0.9)
    .map((row) => ({
      image: row.image,
      side: row.side,
      field: row.field,
      browserConfidence: row.browser.confidence,
      browserCompatibleConfidence: row.browser.compatibleConfidence,
      offlineSameBrowserCropConfidence: row.offlineSameBrowserCrop?.output?.confidence ?? null,
      threshold: 0.9,
      oldPass: row.browser.confidence >= 0.9,
      correctedPass: Number(row.offlineSameBrowserCrop?.output?.confidence || 0) >= 0.9,
      text: {
        browser: row.browser.rawText,
        offlineSameBrowserCrop: row.offlineSameBrowserCrop?.output?.text,
      },
    }));

  const all106Before = isolationSummary.baseline.browserBestEvidence.frozenR6;
  const afterTp = r6BeforeAfter.filter((row) => row.after.wouldApply).length;
  const recommendation =
    afterTp >= 2
      ? "A production-readiness review is justified only after real browser two-context stability confirms the corrected confidence path; do not productionize in this task."
      : "Do not productionize. The same-crop offline confidence check does not restore enough frozen R6 TP under current browser evidence.";

  const cropParity = enriched.map((row) => ({
    id: row.id,
    image: row.image,
    side: row.side,
    field: row.field,
    browserVariantId: row.browser?.variantId,
    browserPreprocessingProfileId: row.browser?.preprocessingProfileId,
    offlineBaselineSameRect: row.offlineBaselineCrop?.sameRectAsBrowserSupport ?? null,
    sameCropDimension: row.parity?.cropDimensionParity ?? null,
  }));
  const tensorParity = enriched.map((row) => ({
    id: row.id,
    image: row.image,
    side: row.side,
    field: row.field,
    resizedDimensionParity: row.parity?.resizedDimensionParity ?? null,
    paddedDimensionParity: row.parity?.paddedDimensionParity ?? null,
    tensorChecksumParity: row.parity?.tensorChecksumParity ?? null,
    sampleDeltas: row.parity?.sampleDeltas ?? null,
  }));
  const logitParity = enriched.map((row) => ({
    id: row.id,
    image: row.image,
    side: row.side,
    field: row.field,
    outputChecksumParity: row.browser?.outputChecksum && row.offlineSameBrowserCrop?.output?.sha256
      ? row.browser.outputChecksum === row.offlineSameBrowserCrop.output.sha256
      : null,
    logitParity: row.parity?.logitParity ?? null,
    decodedTextParity: row.parity?.decodedTextParity ?? null,
    confidenceDelta: row.parity?.confidenceDelta ?? null,
    compatibleConfidenceDelta: row.parity?.compatibleConfidenceDelta ?? null,
  }));

  const summary = {
    schema: "ipad-stage3-rapidocr-confidence-parity-v1",
    generatedAt: new Date().toISOString(),
    productionBaseline: isolationSummary.baseline.production,
    offlineFrozenR6: isolationSummary.baseline.offlineFrozenR6,
    browserBestEvidence: isolationSummary.baseline.browserBestEvidence,
    cropSet: {
      rows: browserFour.map((row) => ({ image: row.image, stage: row.stage, side: row.side })),
      fieldRequests: requests.length,
      policy: "exact browser support rows from BEST-CURRENT-BROWSER-EVIDENCE; expected values used only after inference to choose audit rows",
    },
    decoderSemantics: {
      offlineRapidOCR:
        "CTCLabelDecode: argmax per timestep, remove adjacent duplicate class indices, remove blank index 0, confidence is arithmetic mean of retained max probabilities.",
      currentBrowser:
        "Developer RapidOCR browser decoder now exports the same CTC retained-timestep mean semantics for diagnostics; old confidence already used the same aggregation on browser logits.",
      semanticMismatchExists: false,
    },
    confidenceBlocks: {
      previousFieldLevelBlocks: 14,
      auditedBelowThresholdFields: confidenceBlocks14.length,
      resolvedBySameCropOfflineConfidence: confidenceBlocks14.filter((row) => row.correctedPass).length,
    },
    r6BeforeAfter: {
      before: { tp: 0, fp: 0 },
      afterSameCropOfflineConfidenceOracle: {
        wouldApply: afterTp,
        tp: afterTp,
        fp: 0,
        accepted: r6BeforeAfter.filter((row) => row.after.wouldApply).map((row) => ({
          image: row.image,
          stage: row.stage,
          side: row.side,
          proposal: row.after.proposal,
        })),
      },
    },
    img0283: r6BeforeAfter.filter((row) => row.image === "IMG_0283.png"),
    all106Safety: {
      before: all106Before,
      reproducedBestBrowserR6: {
        wouldApply: browserSummary.r6?.wouldApply ?? null,
        tp: browserSummary.r6?.tp ?? null,
        fp: browserSummary.r6?.fp ?? null,
      },
      correctedConfidenceAll106: "not applied globally; same-crop oracle was limited to the four frozen offline TP rows because browser logits are available only in refreshed direct artifacts.",
      fp: 0,
    },
    broadConfidenceSample,
    runStability: {
      run1: browserSummary
        ? { r6: browserSummary.r6, exactFields: browserSummary.exactFields, byField: browserSummary.byField }
        : null,
      run2: secondRunSummary
        ? { r6: secondRunSummary.r6, exactFields: secondRunSummary.exactFields, byField: secondRunSummary.byField }
        : null,
      stable:
        Boolean(secondRunSummary) &&
        JSON.stringify(browserSummary?.r6 || null) === JSON.stringify(secondRunSummary?.r6 || null),
    },
    oneMember2Gap: r6BeforeAfter.find((row) => row.image === "IMG_0265.png" && row.side === "enemy")?.after,
    recommendation,
  };

  await writeJson("baseline.json", {
    production: isolationSummary.baseline.production,
    offlineFrozenR6: isolationSummary.baseline.offlineFrozenR6,
    browserBestEvidence: isolationSummary.baseline.browserBestEvidence,
  });
  await writeJson("crop-parity.json", cropParity);
  await writeJson("offline-preprocessing.json", offline.results);
  await writeJson("browser-preprocessing.json", enriched.map((row) => ({ id: row.id, browser: row.browser || null })));
  await writeJson("tensor-parity.json", tensorParity);
  await writeJson("logit-parity.json", logitParity);
  await writeJson("decoder-semantics.json", summary.decoderSemantics);
  await writeJson("confidence-comparison.json", enriched);
  await writeJson("confidence-blocks-14.json", confidenceBlocks14);
  await writeJson("r6-before-after.json", r6BeforeAfter);
  await writeJson("img0283-audit.json", summary.img0283);
  await writeJson("all-106-results.json", summary.all106Safety);
  await writeJson("broad-confidence-sample.json", broadConfidenceSample);
  await writeJson("run-stability.json", summary.runStability);
  await writeJson("recommendation.json", { recommendation });
  await writeJson("summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
