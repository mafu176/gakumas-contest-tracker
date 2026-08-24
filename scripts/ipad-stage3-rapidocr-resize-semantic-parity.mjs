import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { evaluateIpadStage3RapidOcrR6 } from "../app/lib/ocr.js";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-resize-semantic-parity");
const frozenDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-frozen-replay");
const fixtureExpansionDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-fixture-expansion");
const rapidOcrTargetDir = path.join(rootDir, "tmp", "rapidocr-python");

const fields = ["member1", "member2", "member3", "bonus", "total"];

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filename, value) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
}

function pythonExecutable() {
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

function numericTextValue(text) {
  const digits = String(text || "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function fieldValue(result, field) {
  if (field === "bonus") return Number(result?.bonus || 0);
  if (field === "total") return Number(result?.total || 0);
  return Number(result?.members?.[Number(field.replace("member", "")) - 1] || 0);
}

function candidateKey(row) {
  return [
    row.image,
    row.stage,
    row.side,
    row.cropKind,
    row.sourceField,
    row.assignedField,
    row.value,
    row.raw,
    row.itemIndex ?? 0,
  ].join("|");
}

function indexCandidates(candidateRows) {
  const byField = new Map();
  const byValue = new Map();
  for (const row of candidateRows) {
    const fieldKey = `${row.image}|${row.side}|${row.assignedField}`;
    if (!byField.has(fieldKey)) byField.set(fieldKey, []);
    byField.get(fieldKey).push(row);
    const valueKey = `${fieldKey}|${row.value}`;
    if (!byValue.has(valueKey)) byValue.set(valueKey, []);
    byValue.get(valueKey).push(row);
  }
  return { byField, byValue };
}

function summarizeSupport({ candidateIndex, image, side, field, value }) {
  const fieldRows = candidateIndex.byField.get(`${image}|${side}|${field}`) || [];
  const valueRows = candidateIndex.byValue.get(`${image}|${side}|${field}|${value}`) || [];
  const distinctValues = [...new Set(fieldRows.map((row) => Number(row.value || 0)))].sort((a, b) => a - b);
  const confidences = valueRows.map((row) => Number(row.confidence || 0)).filter(Number.isFinite);
  return {
    field,
    value: Number(value || 0),
    candidateCount: fieldRows.length,
    distinctCandidateCount: distinctValues.length,
    supportCount: valueRows.length,
    profiles: [...new Set(valueRows.map((row) => row.profileId).filter(Boolean))],
    cropKinds: [...new Set(valueRows.map((row) => row.cropKind).filter(Boolean))],
    parsers: [...new Set(valueRows.map((row) => row.parser).filter(Boolean))],
    rawTexts: [...new Set(valueRows.map((row) => row.fullText).filter(Boolean))].slice(0, 8),
    confidence: {
      min: confidences.length ? Number(Math.min(...confidences).toFixed(4)) : null,
      max: confidences.length ? Number(Math.max(...confidences).toFixed(4)) : null,
      mean: confidences.length
        ? Number((confidences.reduce((sum, entry) => sum + entry, 0) / confidences.length).toFixed(4))
        : null,
    },
    bbox: {
      availableCount: valueRows.filter((row) => row.bbox).length,
      ambiguousCount: valueRows.filter((row) => row.assignment?.ambiguous).length,
    },
    digitCount: String(Math.abs(Number(value || 0))).length,
  };
}

function buildR6EvidenceRows({ unsafeRows, r6Rows, candidateRows }) {
  const candidateIndex = indexCandidates(candidateRows);
  const changedByRow = new Map(
    [...(r6Rows.accepted || []), ...(r6Rows.blocked || [])].map((row) => [
      `${row.image}|${row.stage}|${row.side}`,
      row.changedFields || [],
    ])
  );
  return unsafeRows.map((row) => {
    const changedFields =
      changedByRow.get(`${row.image}|${row.stage}|${row.side}`) ||
      fields.filter((field) => fieldValue(row.actual, field) !== Number(row.expected?.[field] || 0));
    const fieldSupports = Object.fromEntries(
      fields.map((field) => [
        field,
        summarizeSupport({
          candidateIndex,
          image: row.image,
          side: row.side,
          field,
          value: fieldValue(row.actual, field),
        }),
      ])
    );
    const changedSupports = changedFields.map((field) => fieldSupports[field]);
    const evaluation = evaluateIpadStage3RapidOcrR6({
      changedFields,
      changedSupports,
      fieldSupports,
      featureSummary: {
        changedFieldsLowDigit: changedSupports.filter((support) => Number(support.digitCount || 0) < 5).length,
      },
    });
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      pass: Boolean(row.pass),
      changedFields,
      fieldSupports,
      proposal: row.actual,
      expected: row.expected,
      evaluation,
    };
  });
}

function summarizeR6(rows) {
  const accepted = rows.filter((row) => row.evaluation.wouldApply);
  return {
    applications: accepted.length,
    tp: accepted.filter((row) => row.pass).length,
    fp: accepted.filter((row) => !row.pass).length,
    acceptedIdentities: accepted.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      pass: row.pass,
      proposal: row.proposal,
      changedFields: row.changedFields,
      blockReasons: row.evaluation.blockReasons,
    })),
    blockedIdentities: rows
      .filter((row) => !row.evaluation.wouldApply)
      .map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        pass: row.pass,
        blockReasons: row.evaluation.blockReasons,
      })),
  };
}

function replaceCandidateRowsWithReplay({ candidateRows, observations, replayRows, mode }) {
  const rowsByObservation = new Map(replayRows.map((row) => [row.observationId, row]));
  const selectedKeys = new Set(observations.map(candidateKey));
  const retained = candidateRows.filter((row) => !selectedKeys.has(candidateKey(row)));
  const replacements = [];
  for (const observation of observations) {
    const replay = rowsByObservation.get(observation.id);
    const recognition = mode === "level1" ? replay?.level1 : replay?.parity?.recognition;
    if (!recognition) continue;
    const value = numericTextValue(recognition.text);
    if (!value) continue;
    replacements.push({
      image: observation.image,
      stage: observation.stage,
      side: observation.side,
      sourceField: observation.sourceField,
      assignedField: observation.field,
      cropKind: observation.cropKind,
      profileId: `${mode}-frozen-replay`,
      value,
      raw: String(recognition.text || ""),
      fullText: String(recognition.text || ""),
      parser: "semantic-replay-contiguous-digits",
      confidence: Number(recognition.confidence || 0),
      itemIndex: observation.itemIndex ?? 0,
      bbox: observation.bbox || null,
      assignment: observation.assignment || null,
      durationMs: Number(replay?.parity?.elapsedMs || 0),
      exactExpected: value === Number(observation.value || 0),
      replayObservationId: observation.id,
    });
  }
  return [...retained, ...replacements];
}

function supportObservationRows({ observations, replayRows }) {
  const replayById = new Map(replayRows.map((row) => [row.observationId, row]));
  return observations
    .filter((observation) => observation.purpose === "r6-accepted-support")
    .map((observation) => {
      const replay = replayById.get(observation.id);
      const level1Value = numericTextValue(replay?.level1?.text);
      const level2Value = numericTextValue(replay?.parity?.recognition?.text);
      return {
        observationId: observation.id,
        image: observation.image,
        stage: observation.stage,
        side: observation.side,
      field: observation.field,
      candidateValue: Number(observation.value || 0),
      pipelineAText: replay?.expectedPipelineAText || observation.pipelineAText,
      level1Text: replay?.level1?.text || "",
      level2Text: replay?.parity?.recognition?.text || "",
      pipelineAConfidence: Number(observation.pipelineAConfidence || 0),
        level1Confidence: Number(replay?.level1?.confidence || 0),
        level2Confidence: Number(replay?.parity?.recognition?.confidence || 0),
        confidenceThreshold: 0.9,
        pipelineAEligible: Number(observation.pipelineAConfidence || 0) >= 0.9,
        level1Eligible: Number(replay?.level1?.confidence || 0) >= 0.9,
        level2Eligible: Number(replay?.parity?.recognition?.confidence || 0) >= 0.9,
        level1CandidateParity: level1Value === Number(observation.value || 0),
        level2CandidateParity: level2Value === Number(observation.value || 0),
        level1TextParity: String(replay?.level1?.text || "") === String(replay?.expectedPipelineAText || observation.pipelineAText || ""),
        level2TextParity:
          String(replay?.parity?.recognition?.text || "") ===
          String(replay?.expectedPipelineAText || observation.pipelineAText || ""),
      };
    });
}

function compareBytes(a, b) {
  let differing = 0;
  let maxDelta = 0;
  let deltaSum = 0;
  let plusOne = 0;
  let minusOne = 0;
  let beyondOne = 0;
  const perChannel = [
    { channel: 0, differing: 0, plusOne: 0, minusOne: 0, beyondOne: 0 },
    { channel: 1, differing: 0, plusOne: 0, minusOne: 0, beyondOne: 0 },
    { channel: 2, differing: 0, plusOne: 0, minusOne: 0, beyondOne: 0 },
  ];
  let first = null;
  for (let index = 0; index < a.length; index += 1) {
    const signedDelta = Number(b[index]) - Number(a[index]);
    const delta = Math.abs(signedDelta);
    if (!delta) continue;
    differing += 1;
    deltaSum += delta;
    maxDelta = Math.max(maxDelta, delta);
    const channel = index % 3;
    perChannel[channel].differing += 1;
    if (signedDelta === 1) {
      plusOne += 1;
      perChannel[channel].plusOne += 1;
    } else if (signedDelta === -1) {
      minusOne += 1;
      perChannel[channel].minusOne += 1;
    } else {
      beyondOne += 1;
      perChannel[channel].beyondOne += 1;
    }
    if (!first) first = { index, expected: a[index], actual: b[index], signedDelta, delta };
  }
  return {
    byteLength: a.length,
    differing,
    percentDiffering: a.length ? Number(((differing / a.length) * 100).toFixed(4)) : 0,
    maxDelta,
    meanDelta: a.length ? Number((deltaSum / a.length).toFixed(8)) : 0,
    deltaMinusOne: minusOne,
    deltaPlusOne: plusOne,
    deltaBeyondOne: beyondOne,
    perChannel,
    first,
    exact: differing === 0,
    sha256Expected: sha256(a),
    sha256Actual: sha256(b),
  };
}

function clampOpenCvSourceIndex(index, limit) {
  if (index < 0) return 0;
  if (index >= limit) return limit - 1;
  return index;
}

function resizeNear({ data, sourceWidth, sourceHeight, channels, targetWidth, targetHeight }) {
  const output = new Uint8Array(targetWidth * targetHeight * channels);
  const scaleX = sourceWidth / targetWidth;
  const scaleY = sourceHeight / targetHeight;
  for (let dy = 0; dy < targetHeight; dy += 1) {
    const fy = (dy + 0.5) * scaleY - 0.5;
    const sy0Raw = Math.floor(fy);
    const beta = fy - sy0Raw;
    const sy0 = clampOpenCvSourceIndex(sy0Raw, sourceHeight);
    const sy1 = clampOpenCvSourceIndex(sy0Raw + 1, sourceHeight);
    const beta0 = sy0Raw < 0 || sy0Raw >= sourceHeight - 1 ? 1 : 1 - beta;
    const beta1 = sy0Raw < 0 || sy0Raw >= sourceHeight - 1 ? 0 : beta;
    for (let dx = 0; dx < targetWidth; dx += 1) {
      const fx = (dx + 0.5) * scaleX - 0.5;
      const sx0Raw = Math.floor(fx);
      const alpha = fx - sx0Raw;
      const sx0 = clampOpenCvSourceIndex(sx0Raw, sourceWidth);
      const sx1 = clampOpenCvSourceIndex(sx0Raw + 1, sourceWidth);
      const alpha0 = sx0Raw < 0 || sx0Raw >= sourceWidth - 1 ? 1 : 1 - alpha;
      const alpha1 = sx0Raw < 0 || sx0Raw >= sourceWidth - 1 ? 0 : alpha;
      const targetOffset = (dy * targetWidth + dx) * channels;
      const source00 = (sy0 * sourceWidth + sx0) * channels;
      const source01 = (sy0 * sourceWidth + sx1) * channels;
      const source10 = (sy1 * sourceWidth + sx0) * channels;
      const source11 = (sy1 * sourceWidth + sx1) * channels;
      for (let channel = 0; channel < channels; channel += 1) {
        const value =
          data[source00 + channel] * alpha0 * beta0 +
          data[source01 + channel] * alpha1 * beta0 +
          data[source10 + channel] * alpha0 * beta1 +
          data[source11 + channel] * alpha1 * beta1;
        output[targetOffset + channel] = Math.max(0, Math.min(255, Math.round(value)));
      }
    }
  }
  return output;
}

async function runPythonResizeOracle(observations) {
  const python = pythonExecutable();
  if (!python) throw new Error("Python is required for OpenCV resize semantic parity.");
  const inputPath = path.join(outputDir, "resize-oracle-input.json");
  const outputPath = path.join(outputDir, "resize-oracle.json");
  const binaryDir = path.join(outputDir, "resize-binaries");
  await fs.mkdir(binaryDir, { recursive: true });
  await fs.writeFile(
    inputPath,
    `${JSON.stringify(
      observations.map((observation) => ({
        id: observation.id,
        rawBgrPath: observation.rawBgrPath,
        sourceWidth: observation.sourceWidth,
        sourceHeight: observation.sourceHeight,
        resizedWidth: observation.preprocessing.resizedWidth,
        resizedHeight: observation.preprocessing.resizedHeight,
      })),
      null,
      2
    )}\n`
  );
  const script = String.raw`
import json, os, sys, hashlib
from pathlib import Path
sys.path.insert(0, os.environ["RAPIDOCR_TARGET_DIR"])
import cv2
import numpy as np

ROOT = Path(os.environ["ROOT_DIR"])
INPUT = Path(os.environ["RESIZE_ORACLE_INPUT"])
OUTPUT = Path(os.environ["RESIZE_ORACLE_OUTPUT"])
BINARY_DIR = Path(os.environ["RESIZE_BINARY_DIR"])
BINARY_DIR.mkdir(parents=True, exist_ok=True)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def write_bytes(name, array):
    out = BINARY_DIR / name
    array.astype(np.uint8).tofile(str(out))
    return str(out.relative_to(ROOT)).replace("\\", "/"), sha(out.read_bytes())

rows = []
for item in json.loads(INPUT.read_text(encoding="utf-8")):
    raw = np.fromfile(str(ROOT / item["rawBgrPath"]), dtype=np.uint8)
    img = raw.reshape((int(item["sourceHeight"]), int(item["sourceWidth"]), 3))
    size = (int(item["resizedWidth"]), int(item["resizedHeight"]))
    linear = cv2.resize(img, size, interpolation=cv2.INTER_LINEAR)
    row = {
        "id": item["id"],
        "sourceWidth": int(item["sourceWidth"]),
        "sourceHeight": int(item["sourceHeight"]),
        "targetWidth": int(item["resizedWidth"]),
        "targetHeight": int(item["resizedHeight"]),
        "interLinear": {},
        "interLinearExact": None,
    }
    path, digest = write_bytes(f'{item["id"]}-inter-linear.bin', linear)
    row["interLinear"] = {"path": path, "sha256": digest, "bytes": int(linear.nbytes)}
    try:
        exact = cv2.resize(img, size, interpolation=cv2.INTER_LINEAR_EXACT)
        path, digest = write_bytes(f'{item["id"]}-inter-linear-exact.bin', exact)
        row["interLinearExact"] = {"path": path, "sha256": digest, "bytes": int(exact.nbytes)}
    except Exception as exc:
        row["interLinearExact"] = {"error": str(exc)}
    rows.append(row)

OUTPUT.write_text(json.dumps({
    "schema": "ipad-stage3-rapidocr-real-crop-resize-oracle-v1",
    "cv2Version": cv2.__version__,
    "buildInfo": cv2.getBuildInformation(),
    "rows": rows,
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
`;
  const result = spawnSync(python, ["-c", script], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      ROOT_DIR: rootDir,
      RAPIDOCR_TARGET_DIR: rapidOcrTargetDir,
      RESIZE_ORACLE_INPUT: inputPath,
      RESIZE_ORACLE_OUTPUT: outputPath,
      RESIZE_BINARY_DIR: binaryDir,
    },
    timeout: 120000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return readJson(outputPath);
}

async function runPythonLevel3CropReplay({ observations, manifestRecords }) {
  const python = pythonExecutable();
  if (!python) throw new Error("Python is required for Level 3 crop replay.");
  const manifestByCropPath = new Map(manifestRecords.map((record) => [record.cropPath, record]));
  const inputRows = observations.map((observation) => {
    const manifest = manifestByCropPath.get(observation.sourceCropPath);
    return {
      id: observation.id,
      image: observation.image,
      stage: observation.stage,
      side: observation.side,
      field: observation.field,
      sourceImage: manifest?.sourceImage || null,
      sourceCropRect: observation.sourceCropRect,
      localBbox: observation.localBbox,
      rawBgrPath: observation.rawBgrPath,
      rawBgrSha256: observation.rawBgrSha256,
    };
  });
  const inputPath = path.join(outputDir, "level3-input.json");
  const outputPath = path.join(outputDir, "level3.json");
  await fs.writeFile(inputPath, `${JSON.stringify(inputRows, null, 2)}\n`);
  const script = String.raw`
import json, os, sys, hashlib
from pathlib import Path
sys.path.insert(0, os.environ["RAPIDOCR_TARGET_DIR"])
import cv2

ROOT = Path(os.environ["ROOT_DIR"])
INPUT = Path(os.environ["LEVEL3_INPUT"])
OUTPUT = Path(os.environ["LEVEL3_OUTPUT"])

def sha(data):
    return hashlib.sha256(data).hexdigest()

rows = []
for item in json.loads(INPUT.read_text(encoding="utf-8")):
    source = item.get("sourceImage")
    row = {
        "observationId": item["id"],
        "image": item["image"],
        "stage": item["stage"],
        "side": item["side"],
        "field": item["field"],
        "geometryProvenance": "deterministic-manifest-rect-plus-local-bbox",
        "sourceImage": source,
        "rawCropMatchesFrozen": False,
    }
    if not source:
        row["error"] = "missing-source-image-in-manifest"
        rows.append(row)
        continue
    img = cv2.imread(str(ROOT / source), cv2.IMREAD_COLOR)
    if img is None:
        row["error"] = "source-image-not-readable"
        rows.append(row)
        continue
    rect = item["sourceCropRect"]
    crop = img[int(rect["y"]):int(rect["y"])+int(rect["height"]), int(rect["x"]):int(rect["x"])+int(rect["width"])]
    local = item.get("localBbox")
    if local:
        crop = crop[int(local["y"]):int(local["y"])+int(local["height"]), int(local["x"]):int(local["x"])+int(local["width"])]
    digest = sha(crop.tobytes())
    row.update({
        "recreatedRawBgrSha256": digest,
        "frozenRawBgrSha256": item.get("rawBgrSha256"),
        "rawCropMatchesFrozen": digest == item.get("rawBgrSha256"),
        "shape": list(crop.shape),
    })
    rows.append(row)

OUTPUT.write_text(json.dumps({
    "schema": "ipad-stage3-rapidocr-level3-historical-geometry-replay-v1",
    "cv2Version": cv2.__version__,
    "rows": rows,
    "summary": {
        "compared": len(rows),
        "rawCropMatchesFrozen": sum(1 for row in rows if row.get("rawCropMatchesFrozen")),
        "errors": sum(1 for row in rows if row.get("error")),
    }
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
`;
  const result = spawnSync(python, ["-c", script], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      ROOT_DIR: rootDir,
      RAPIDOCR_TARGET_DIR: rapidOcrTargetDir,
      LEVEL3_INPUT: inputPath,
      LEVEL3_OUTPUT: outputPath,
    },
    timeout: 120000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return readJson(outputPath);
}

async function compareResizeRows({ observations, oracle }) {
  const oracleById = new Map(oracle.rows.map((row) => [row.id, row]));
  const rows = [];
  for (const observation of observations) {
    const oracleRow = oracleById.get(observation.id);
    const raw = await fs.readFile(path.join(rootDir, observation.rawBgrPath));
    const near = resizeNear({
      data: raw,
      sourceWidth: observation.sourceWidth,
      sourceHeight: observation.sourceHeight,
      channels: 3,
      targetWidth: observation.preprocessing.resizedWidth,
      targetHeight: observation.preprocessing.resizedHeight,
    });
    const interLinear = await fs.readFile(path.join(rootDir, oracleRow.interLinear.path));
    const linearComparison = compareBytes(interLinear, near);
    let exactComparison = null;
    if (oracleRow.interLinearExact?.path) {
      const interLinearExact = await fs.readFile(path.join(rootDir, oracleRow.interLinearExact.path));
      exactComparison = compareBytes(interLinearExact, near);
    }
    rows.push({
      observationId: observation.id,
      image: observation.image,
      stage: observation.stage,
      side: observation.side,
      field: observation.field,
      sourceWidth: observation.sourceWidth,
      sourceHeight: observation.sourceHeight,
      resizedWidth: observation.preprocessing.resizedWidth,
      resizedHeight: observation.preprocessing.resizedHeight,
      browserNearVsInterLinear: linearComparison,
      browserNearVsInterLinearExact: exactComparison,
    });
  }
  const aggregate = (selector) => {
    const selected = rows.map(selector).filter(Boolean);
    return {
      compared: selected.length,
      exact: selected.filter((row) => row.exact).length,
      differingBytes: selected.reduce((sum, row) => sum + row.differing, 0),
      byteLength: selected.reduce((sum, row) => sum + row.byteLength, 0),
      maxDelta: selected.reduce((max, row) => Math.max(max, row.maxDelta), 0),
      deltaMinusOne: selected.reduce((sum, row) => sum + row.deltaMinusOne, 0),
      deltaPlusOne: selected.reduce((sum, row) => sum + row.deltaPlusOne, 0),
      deltaBeyondOne: selected.reduce((sum, row) => sum + row.deltaBeyondOne, 0),
    };
  };
  return {
    schema: "ipad-stage3-rapidocr-resize-delta-distribution-v1",
    cv2Version: oracle.cv2Version,
    interLinear: aggregate((row) => row.browserNearVsInterLinear),
    interLinearExact: aggregate((row) => row.browserNearVsInterLinearExact),
    rows,
  };
}

function syntheticTrace() {
  return {
    schema: "ipad-stage3-rapidocr-synthetic-resize-trace-v1",
    caseId: "square-2x2-to-3x3",
    destination: { x: 1, y: 0, channel: 0, flatIndex: 3 },
    sourceShape: [2, 2, 3],
    targetShape: [3, 3, 3],
    sourcePixelsInvolved: [
      { x: 0, y: 0, channel0: 10 },
      { x: 1, y: 0, channel0: 47 },
    ],
    mapping: {
      x: "(1 + 0.5) * 2 / 3 - 0.5 = 0.5",
      y: "(0 + 0.5) * 2 / 3 - 0.5 = -0.1666667, clamped to top border",
      alpha: 0.5,
      beta: 0,
    },
    browserNearComputation: "10 * 0.5 + 47 * 0.5 = 28.5; Math.round -> 29",
    observedOpenCvInterLinearByte: 28,
    observedBrowserNearByte: 29,
    conclusion:
      "The nearest diagnostic helper uses floating arithmetic plus Math.round. OpenCV INTER_LINEAR uses implementation-specific fixed-point/integer rounding for uint8 resize, producing a one-byte lower result here.",
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const [selectedObservations, offlineFrozen, browserReplay, candidateRows, unsafeSelector, r6Rows, previousSummary, manifest] =
    await Promise.all([
      readJson(path.join(frozenDir, "selected-observations.json")),
      readJson(path.join(frozenDir, "offline-frozen-tensor-results.json")),
      readJson(path.join(frozenDir, "browser-frozen-replay-results.json")),
      readJson(path.join(fixtureExpansionDir, "candidate-results.json")),
      readJson(path.join(fixtureExpansionDir, "unsafe-selector-results.json")),
      readJson(path.join(fixtureExpansionDir, "r6-results.json")),
      readJson(path.join(frozenDir, "summary.json")),
      readJson(path.join(fixtureExpansionDir, "crop-manifest.json")),
    ]);
  const observations = selectedObservations.observations;
  const replayRows = browserReplay.observations || [];
  const unsafeRows = unsafeSelector.acceptedRows || [];
  const offlineById = new Map((offlineFrozen.observations || []).map((row) => [row.id, row]));

  const level1Candidates = replaceCandidateRowsWithReplay({
    candidateRows,
    observations,
    replayRows,
    mode: "level1",
  });
  const level2Candidates = replaceCandidateRowsWithReplay({
    candidateRows,
    observations,
    replayRows,
    mode: "level2",
  });
  const level1Rows = buildR6EvidenceRows({ unsafeRows, r6Rows, candidateRows: level1Candidates });
  const level2Rows = buildR6EvidenceRows({ unsafeRows, r6Rows, candidateRows: level2Candidates });
  const level1R6 = summarizeR6(level1Rows);
  const level2R6 = summarizeR6(level2Rows);
  const supportRows = supportObservationRows({ observations, replayRows });
  const supportSummary = {
    compared: supportRows.length,
    textParity: supportRows.filter((row) => row.level2TextParity).length,
    candidateParity: supportRows.filter((row) => row.level2CandidateParity).length,
    confidenceGuardParity: supportRows.filter((row) => row.pipelineAEligible === row.level2Eligible).length,
  };
  const textMismatches = replayRows
    .filter((row) => row.parity && row.parity.recognition?.text !== row.expectedPipelineAText)
    .map((row) => {
      const observation = observations.find((entry) => entry.id === row.observationId);
      const offlineObservation = offlineById.get(row.observationId);
      const resizeStats = row.parity.firstDifference;
      const inAcceptedProposal = (r6Rows.accepted || []).some(
        (accepted) =>
          accepted.image === row.image &&
          accepted.stage === row.stage &&
          accepted.side === row.side &&
          (accepted.changedFields || []).includes(row.field)
      );
      return {
        observationId: row.observationId,
        image: row.image,
        stage: row.stage,
        side: row.side,
        field: row.field,
        pipelineAText: row.expectedPipelineAText,
        level2Text: row.parity.recognition?.text || "",
        pipelineAConfidence: row.expectedPipelineAConfidence,
        level2Confidence: row.parity.recognition?.confidence || 0,
        belongsToR6AcceptedProposal: inAcceptedProposal,
        r6Critical: inAcceptedProposal,
        tensorShape: offlineObservation?.shape || null,
        firstDifference: resizeStats,
      };
    });

  const oracle = await runPythonResizeOracle(offlineFrozen.observations);
  const resizeDistribution = await compareResizeRows({ observations: offlineFrozen.observations, oracle });
  const level3 = level2R6.fp === 0 && level2R6.tp >= 2
    ? await runPythonLevel3CropReplay({
        observations: offlineFrozen.observations,
        manifestRecords: manifest.records || [],
      })
    : {
        schema: "ipad-stage3-rapidocr-level3-historical-geometry-replay-v1",
        skipped: true,
        reason: "Level 2 semantic R6 did not meet the >=2 TP / 0 FP threshold.",
      };
  const level2R6Artifact = {
    schema: "ipad-stage3-rapidocr-level2-r6-current-v1",
    generatedAt: new Date().toISOString(),
    historicalPipelineA: {
      applications: r6Rows.wouldApply,
      tp: r6Rows.tp,
      fp: r6Rows.fp,
      acceptedIdentities: (r6Rows.accepted || []).map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        proposal: row.proposal,
      })),
    },
    level1ExactTensor: level1R6,
    level2CurrentParity: level2R6,
    semanticSuccessClass:
      level2R6.fp > 0
        ? "E"
        : level2R6.tp >= 4
          ? "A"
          : level2R6.tp === 3
            ? "B"
            : level2R6.tp === 2
              ? "C"
              : "D",
  };
  const baseline = {
    schema: "ipad-stage3-rapidocr-resize-semantic-baseline-v1",
    generatedAt: new Date().toISOString(),
    productionBaseline: {
      completedLabeledIpadFixtures: 53,
      productionRecoveries: 119,
      productionTp: 119,
      productionFp: 0,
      productionOcr: "Tesseract-based",
      rapidOcrStage3: "developer-only",
    },
    previousFrozenReplaySummary: previousSummary,
    level2R6: level2R6Artifact,
    supportSummary,
  };
  const recommendation = {
    schema: "ipad-stage3-rapidocr-resize-semantic-recommendation-v1",
    generatedAt: new Date().toISOString(),
    exactCompatibleResizeRequired:
      level2R6.fp > 0 || level2R6.tp < 2 || textMismatches.some((row) => row.r6Critical),
    level3Justified: level2R6.fp === 0 && level2R6.tp >= 2,
    level3Run: !level3.skipped,
    level3RawCropParity: level3.summary || null,
    productionOutputChanged: false,
    nextStep:
      level2R6.fp === 0 && level2R6.tp >= 2
        ? "Run Level 3 geometry replay separately; keep exact OpenCV fixed-point resize as a follow-up only if Level 3 loses R6-critical rows."
        : "Implement exact OpenCV uint8 INTER_LINEAR fixed-point resize before Level 3.",
  };

  await writeJson("baseline.json", baseline);
  await writeJson("level2-r6-current.json", level2R6Artifact);
  await writeJson("r6-support-19.json", { schema: "ipad-stage3-rapidocr-r6-support-19-v1", summary: supportSummary, rows: supportRows });
  await writeJson("three-text-mismatches.json", { schema: "ipad-stage3-rapidocr-level2-text-mismatches-v1", count: textMismatches.length, rows: textMismatches });
  await writeJson("opencv-build.json", {
    schema: "ipad-stage3-rapidocr-opencv-build-v1",
    cv2Version: oracle.cv2Version,
    interpolation: "Pipeline A calls cv2.resize(img, (resized_w, img_h)) with default INTER_LINEAR",
    sourceDtype: "uint8",
    destinationDtype: "uint8 before astype(float32)",
    buildInfo: oracle.buildInfo,
  });
  await writeJson("resize-delta-distribution.json", resizeDistribution);
  await writeJson("inter-linear-vs-exact.json", {
    schema: "ipad-stage3-rapidocr-inter-linear-vs-exact-v1",
    cv2Version: oracle.cv2Version,
    browserNearVsInterLinear: resizeDistribution.interLinear,
    browserNearVsInterLinearExact: resizeDistribution.interLinearExact,
  });
  await writeJson("synthetic-trace.json", syntheticTrace());
  await writeJson("img0283-audit.json", {
    schema: "ipad-stage3-rapidocr-img0283-level2-audit-v1",
    level2AcceptedRows: level2R6.acceptedIdentities.filter((row) => row.image === "IMG_0283.png"),
    level2BlockedRows: level2R6.blockedIdentities.filter((row) => row.image === "IMG_0283.png"),
  });
  await writeJson("level3.json", level3);
  await writeJson("performance.json", {
    schema: "ipad-stage3-rapidocr-resize-semantic-performance-v1",
    parityPreprocessingElapsedMs: (browserReplay.observations || []).map((row) => ({
      observationId: row.observationId,
      image: row.image,
      field: row.field,
      elapsedMs: row.parity?.elapsedMs || 0,
    })),
    averageParityPreprocessPlusRecognitionMs: Number(
      (
        (browserReplay.observations || []).reduce((sum, row) => sum + Number(row.parity?.elapsedMs || 0), 0) /
        Math.max(1, (browserReplay.observations || []).length)
      ).toFixed(3)
    ),
  });
  await writeJson("recommendation.json", recommendation);

  const summary = {
    schema: "ipad-stage3-rapidocr-resize-semantic-parity-summary-v1",
    generatedAt: new Date().toISOString(),
    level2R6: {
      applications: level2R6.applications,
      tp: level2R6.tp,
      fp: level2R6.fp,
      semanticSuccessClass: level2R6Artifact.semanticSuccessClass,
    },
    supportSummary,
    textMismatchCount: textMismatches.length,
    r6CriticalTextMismatchCount: textMismatches.filter((row) => row.r6Critical).length,
    resize: {
      interLinear: resizeDistribution.interLinear,
      interLinearExact: resizeDistribution.interLinearExact,
    },
    level3Justified: recommendation.level3Justified,
    level3: level3.summary || level3,
    productionOutputChanged: false,
    outputDir: path.relative(rootDir, outputDir).replaceAll("\\", "/"),
  };
  await writeJson("summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
