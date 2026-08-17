import crypto from "node:crypto";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-frozen-replay");
const opencvOutputDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-opencv-preprocessing");
const fixtureExpansionDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-fixture-expansion");
const confidenceDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-confidence-parity");
const rapidOcrTargetDir = path.join(rootDir, "tmp", "rapidocr-python");
const rapidOcrModelDir = path.join(rapidOcrTargetDir, "rapidocr_onnxruntime", "models");
const requireFromHere = createRequire(import.meta.url);
const bundledNodeModules = path.join(
  process.env.USERPROFILE || "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "node_modules"
);
const requireFromBundledNode = createRequire(path.join(bundledNodeModules, "package.json"));

const fields = ["member1", "member2", "member3", "bonus", "total"];
const tensorSampleIndices = [0, 1, 2, 17, 31, 32, 47, 48, 319, 320, 1535, 1536, 4096, 8192, 46079];
const stageSampleIndices = [0, 1, 2, 3, 4, 5, 31, 32, 127, 128, 1024, 2048, 4096, 8192, 12000];

function parseArgs() {
  const argValue = (name, fallback = "") => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] || fallback : fallback;
  };
  return {
    baseUrl: argValue("--base-url") || "",
    port: Number(argValue("--port", "0") || 0),
    browserTimeoutMs: Math.max(30000, Number(argValue("--browser-timeout-ms", "240000") || 240000)),
    skipBrowser: process.argv.includes("--skip-browser"),
    sampleLimit: Math.max(0, Number(argValue("--sample-limit", "0") || 0)),
  };
}

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

async function writeOpenCvJson(filename, value) {
  await fs.mkdir(opencvOutputDir, { recursive: true });
  await fs.writeFile(path.join(opencvOutputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
}

function normalizePathForReport(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function cropKey(record) {
  return `${record.image}|${record.stage}|${record.side}|${record.cropKind}|${record.field || record.sourceField}`;
}

function candidateKey(row) {
  return `${row.image}|${row.stage}|${row.side}|${row.cropKind}|${row.sourceField}|${row.assignedField}|${row.value}|${row.raw}|${row.itemIndex ?? 0}`;
}

function proposalValue(row, field) {
  if (field === "bonus") return Number(row.proposal?.bonus || 0);
  if (field === "total") return Number(row.proposal?.total || 0);
  return Number(row.proposal?.members?.[Number(field.replace("member", "")) - 1] || 0);
}

function fieldFromUnsafeActual(actual, field) {
  if (field === "bonus") return Number(actual?.bonus || 0);
  if (field === "total") return Number(actual?.total || 0);
  return Number(actual?.members?.[Number(field.replace("member", "")) - 1] || 0);
}

function chooseBestCandidate(hits) {
  return [...hits].sort((a, b) => {
    const confidenceDelta = Number(b.confidence || 0) - Number(a.confidence || 0);
    if (Math.abs(confidenceDelta) > 0.000001) return confidenceDelta;
    if (a.profileId === "rapidocr-recognition-only" && b.profileId !== "rapidocr-recognition-only") return -1;
    if (b.profileId === "rapidocr-recognition-only" && a.profileId !== "rapidocr-recognition-only") return 1;
    return String(a.cropKind).localeCompare(String(b.cropKind));
  })[0];
}

function localBboxForCandidate(candidate, manifestRecord) {
  if (!candidate?.bbox || !manifestRecord?.rect) return null;
  return {
    x: Math.max(0, Math.round(Number(candidate.bbox.x) - Number(manifestRecord.rect.x))),
    y: Math.max(0, Math.round(Number(candidate.bbox.y) - Number(manifestRecord.rect.y))),
    width: Math.max(1, Math.round(Number(candidate.bbox.width))),
    height: Math.max(1, Math.round(Number(candidate.bbox.height))),
  };
}

function buildObservationRecords({ candidateResults, r6Results, unsafeResults, manifest, sampleLimit }) {
  const manifestByKey = new Map(manifest.records.map((record) => [cropKey(record), record]));
  const selected = new Map();
  let nextObservationId = 1;
  const addCandidate = (candidate, purpose) => {
    if (!candidate) return;
    const manifestRecord = manifestByKey.get(
      `${candidate.image}|${candidate.stage}|${candidate.side}|${candidate.cropKind}|${candidate.sourceField}`
    );
    if (!manifestRecord) return;
    selected.set(candidateKey(candidate), {
      id: `obs-${nextObservationId++}`,
      purpose,
      image: candidate.image,
      stage: candidate.stage,
      side: candidate.side,
      field: candidate.assignedField,
      value: candidate.value,
      raw: candidate.raw,
      pipelineAText: candidate.fullText,
      pipelineAConfidence: Number(candidate.confidence || 0),
      cropKind: candidate.cropKind,
      profileId: candidate.profileId,
      sourceField: candidate.sourceField,
      itemIndex: candidate.itemIndex ?? 0,
      bbox: candidate.bbox || null,
      assignment: candidate.assignment || null,
      sourceCropPath: manifestRecord.cropPath,
      sourceCropSha256: manifestRecord.sha256,
      sourceCropRect: manifestRecord.rect,
      localBbox: localBboxForCandidate(candidate, manifestRecord),
    });
  };

  for (const row of r6Results.accepted || []) {
    for (const field of fields) {
      const value = proposalValue(row, field);
      if (!value && field === "bonus") continue;
      const hits = candidateResults.filter(
        (candidate) =>
          candidate.image === row.image &&
          candidate.stage === row.stage &&
          candidate.side === row.side &&
          candidate.assignedField === field &&
          Number(candidate.value) === value
      );
      addCandidate(chooseBestCandidate(hits), "r6-accepted-support");
    }
  }

  const img0283Enemy = (unsafeResults.acceptedRows || []).find(
    (row) => row.image === "IMG_0283.png" && row.stage === 3 && row.side === "enemy" && row.pass === false
  );
  if (img0283Enemy) {
    for (const field of fields) {
      const value = fieldFromUnsafeActual(img0283Enemy.actual, field);
      if (!value && field === "bonus") continue;
      const hits = candidateResults.filter(
        (candidate) =>
          candidate.image === img0283Enemy.image &&
          candidate.stage === img0283Enemy.stage &&
          candidate.side === img0283Enemy.side &&
          candidate.assignedField === field &&
          Number(candidate.value) === value
      );
      addCandidate(chooseBestCandidate(hits), "unsafe-img0283-negative-control");
    }
  }

  for (const row of (r6Results.blocked || []).slice(0, 4)) {
    const hits = candidateResults.filter((candidate) => candidate.image === row.image && candidate.stage === 3);
    addCandidate(chooseBestCandidate(hits), `blocked-control:${row.reason || "unknown"}`);
  }

  const observations = [...selected.values()];
  return sampleLimit ? observations.slice(0, sampleLimit) : observations;
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

function pythonFrozenTensorHelper() {
  return String.raw`
import json, math, os, sys, time, hashlib, shutil
from pathlib import Path

sys.path.insert(0, os.environ["RAPIDOCR_TARGET_DIR"])

import cv2
import numpy as np
import onnxruntime as ort

ROOT = Path(os.environ["ROOT_DIR"])
INPUT = Path(os.environ["FROZEN_REPLAY_INPUT"])
OUTPUT = Path(os.environ["FROZEN_REPLAY_OUTPUT"])
TENSOR_DIR = Path(os.environ["FROZEN_REPLAY_TENSOR_DIR"])
CROP_DIR = Path(os.environ["FROZEN_REPLAY_CROP_DIR"])
REC_MODEL = os.environ["RAPIDOCR_REC_MODEL"]

SAMPLES = [0, 1, 2, 17, 31, 32, 47, 48, 319, 320, 1535, 1536, 4096, 8192, 46079]
STAGE_SAMPLES = [0, 1, 2, 3, 4, 5, 31, 32, 127, 128, 1024, 2048, 4096, 8192, 12000]

def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()

def stage_metadata(stage_id, array, samples=STAGE_SAMPLES):
    flat = array.reshape(-1)
    return {
        "id": stage_id,
        "shape": list(array.shape),
        "dtype": str(array.dtype),
        "byteLength": int(array.nbytes),
        "sha256": sha256_bytes(array.tobytes()),
        "length": int(flat.size),
        "min": round(float(flat.min()), 8) if flat.size else None,
        "max": round(float(flat.max()), 8) if flat.size else None,
        "mean": round(float(flat.mean()), 8) if flat.size else None,
        "samples": [
            {"index": int(index), "value": round(float(flat[index]), 8)}
            for index in samples
            if index < flat.size
        ],
    }

def decode_ctc(preds, chars):
    if len(preds.shape) == 3:
        preds = preds[0]
    previous = -1
    text = ""
    retained = []
    for t in range(preds.shape[0]):
        row = preds[t]
        idx = int(np.argmax(row))
        conf = float(row[idx])
        if idx != 0 and idx != previous:
            char = chars[idx] if idx < len(chars) else ""
            text += char
            retained.append({"timestep": t, "index": idx, "char": char, "confidence": round(conf, 8)})
        previous = idx
    confidence = sum(item["confidence"] for item in retained) / len(retained) if retained else 0
    return {"text": text, "confidence": confidence, "retained": retained}

def preprocess_recognition(img):
    img_c = 3
    img_h = 48
    base_img_w = 320
    max_wh_ratio = base_img_w / img_h
    h, w = img.shape[:2]
    wh_ratio = w / float(max(1, h))
    max_wh_ratio = max(max_wh_ratio, wh_ratio)
    img_w = int(img_h * max_wh_ratio)
    resized_w = img_w if math.ceil(img_h * wh_ratio) > img_w else int(math.ceil(img_h * wh_ratio))
    resized_uint8 = cv2.resize(img, (resized_w, img_h))
    padded_uint8 = np.zeros((img_h, img_w, img_c), dtype=np.uint8)
    padded_uint8[:, 0:resized_w, :] = resized_uint8
    normalized_hwc = padded_uint8.astype("float32") / 255
    normalized_hwc -= 0.5
    normalized_hwc /= 0.5
    resized_image = resized_uint8.astype("float32")
    resized_image = resized_image.transpose((2, 0, 1)) / 255
    resized_image -= 0.5
    resized_image /= 0.5
    padding_im = np.zeros((img_c, img_h, img_w), dtype=np.float32)
    padding_im[:, :, 0:resized_w] = resized_image
    tensor = padding_im[np.newaxis, :]
    stages = [
        stage_metadata("A0-raw-bgr", img),
        stage_metadata("A1-bgr-before-resize", img),
        stage_metadata("A2-resized-uint8", resized_uint8),
        stage_metadata("A3-padded-uint8", padded_uint8),
        stage_metadata("A4-normalized-float-hwc", normalized_hwc),
        stage_metadata("A5-transposed-float-chw", padding_im),
        stage_metadata("A6-final-batched-tensor", tensor),
    ]
    return tensor, {
        "sourceWidth": int(w),
        "sourceHeight": int(h),
        "resizedWidth": int(resized_w),
        "resizedHeight": img_h,
        "paddedWidth": int(img_w),
        "colorOrder": "BGR",
        "normalization": "(channel/255 - 0.5) / 0.5",
        "tensorLayout": "NCHW",
        "dtype": "float32",
        "interpolation": "cv2.resize default INTER_LINEAR",
        "actualSource": "rapidocr_onnxruntime/ch_ppocr_rec/text_recognize.py TextRecognizer.resize_norm_img",
    }, stages

with open(INPUT, "r", encoding="utf-8") as handle:
    observations = json.load(handle)

session = ort.InferenceSession(REC_MODEL, providers=["CPUExecutionProvider"])
meta = session.get_modelmeta().custom_metadata_map
chars = ["blank"] + meta.get("character", "").splitlines() + [" "]
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

TENSOR_DIR.mkdir(parents=True, exist_ok=True)
CROP_DIR.mkdir(parents=True, exist_ok=True)
results = []
for obs in observations:
    source_path = ROOT / obs["sourceCropPath"]
    img = cv2.imread(str(source_path), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f"failed to read crop: {source_path}")
    local = obs.get("localBbox")
    if local:
        x = max(0, int(local["x"]))
        y = max(0, int(local["y"]))
        w = max(1, int(local["width"]))
        h = max(1, int(local["height"]))
        img = img[y:y+h, x:x+w]
    crop_path = CROP_DIR / f'{obs["id"]}.png'
    cv2.imwrite(str(crop_path), img)
    tensor, preprocessing, pipeline_a_stages = preprocess_recognition(img)
    started = time.time()
    outputs = session.run([output_name], {input_name: tensor})
    duration_ms = round((time.time() - started) * 1000, 3)
    output = outputs[0]
    tensor_path = TENSOR_DIR / f'{obs["id"]}.bin'
    tensor.astype(np.float32).tofile(str(tensor_path))
    raw_bgr_path = TENSOR_DIR / f'{obs["id"]}-raw-bgr.bin'
    img.astype(np.uint8).tofile(str(raw_bgr_path))
    output_path = TENSOR_DIR / f'{obs["id"]}-output.bin'
    output.astype(np.float32).tofile(str(output_path))
    decoded = decode_ctc(output, chars)
    flat = tensor.reshape(-1)
    samples = [{"index": index, "value": round(float(flat[index]), 8)} for index in SAMPLES if index < flat.size]
    with open(tensor_path, "rb") as handle:
        tensor_bytes = handle.read()
    with open(output_path, "rb") as handle:
        output_bytes = handle.read()
    result = dict(obs)
    result.update({
        "targetCropPath": str(crop_path.relative_to(ROOT)).replace("\\\\", "/"),
        "targetCropSha256": sha256_bytes(crop_path.read_bytes()),
        "tensorPath": str(tensor_path.relative_to(ROOT)).replace("\\\\", "/"),
        "tensorSha256": sha256_bytes(tensor_bytes),
        "tensorBytes": len(tensor_bytes),
        "shape": list(tensor.shape),
        "inputSamples": samples,
        "preprocessing": preprocessing,
        "sourceWidth": preprocessing["sourceWidth"],
        "sourceHeight": preprocessing["sourceHeight"],
        "rawBgrPath": str(raw_bgr_path.relative_to(ROOT)).replace("\\\\", "/"),
        "rawBgrSha256": sha256_bytes(raw_bgr_path.read_bytes()),
        "pipelineAStages": pipeline_a_stages,
        "stageSampleIndices": STAGE_SAMPLES,
        "offlineReplay": {
            "text": decoded["text"],
            "confidence": round(decoded["confidence"], 6),
            "confidenceDeltaFromPipelineA": round(abs(decoded["confidence"] - float(obs.get("pipelineAConfidence") or 0)), 8),
            "textMatchesPipelineA": decoded["text"] == str(obs.get("pipelineAText") or ""),
            "durationMs": duration_ms,
            "outputSha256": sha256_bytes(output_bytes),
            "outputShape": list(output.shape),
            "decodedTrace": decoded["retained"],
        },
    })
    results.append(result)

with open(OUTPUT, "w", encoding="utf-8") as handle:
    json.dump({
        "schema": "ipad-stage3-rapidocr-frozen-replay-offline-v1",
        "recognizerModel": REC_MODEL,
        "characterCountWithCtcSpecials": len(chars),
        "observations": results,
    }, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
`;
}

async function runPythonTensorExport(observations) {
  const python = getPythonExecutable();
  if (!python) throw new Error("No Python executable found for frozen tensor export.");
  const inputPath = path.join(outputDir, "python-observations-input.json");
  const outputPath = path.join(outputDir, "offline-frozen-tensor-results.json");
  const helperPath = path.join(outputDir, "frozen_tensor_helper.py");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(inputPath, `${JSON.stringify(observations, null, 2)}\n`);
  await fs.writeFile(helperPath, pythonFrozenTensorHelper());
  const result = spawnSync(python, [helperPath], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      ROOT_DIR: rootDir,
      RAPIDOCR_TARGET_DIR: rapidOcrTargetDir,
      RAPIDOCR_REC_MODEL: path.join(rapidOcrModelDir, "ch_PP-OCRv4_rec_infer.onnx"),
      FROZEN_REPLAY_INPUT: inputPath,
      FROZEN_REPLAY_OUTPUT: outputPath,
      FROZEN_REPLAY_TENSOR_DIR: path.join(outputDir, "tensors"),
      FROZEN_REPLAY_CROP_DIR: path.join(outputDir, "recognizer-crops"),
    },
    timeout: 180000,
  });
  await fs.writeFile(path.join(outputDir, "python-helper.stdout.txt"), result.stdout || "");
  await fs.writeFile(path.join(outputDir, "python-helper.stderr.txt"), result.stderr || "");
  if (result.status !== 0) {
    throw new Error(`Frozen tensor export failed: ${result.stderr || result.stdout}`);
  }
  return readJson(outputPath);
}

async function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function choosePort(requested) {
  if (requested && (await portAvailable(requested))) return requested;
  for (let port = 3380; port < 3410; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error("No available local port for frozen replay server.");
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function startServer(args) {
  if (args.baseUrl) return { baseUrl: args.baseUrl, stop: async () => {} };
  const port = await choosePort(args.port);
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run dev -- -p ${port}`], {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, PORT: String(port) },
          windowsHide: true,
        })
      : spawn("npm", ["run", "dev", "--", "-p", String(port)], {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, PORT: String(port) },
        });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  const baseUrl = `http://localhost:${port}`;
  const started = Date.now();
  while (!(await isServerReady(`${baseUrl}/?ipadStage3RapidOcrFrozenReplay=1`))) {
    if (Date.now() - started > 120000) {
      await fs.writeFile(path.join(outputDir, "next-dev.log"), logs.join(""));
      throw new Error(`Timed out waiting for dev server at ${baseUrl}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await fs.writeFile(path.join(outputDir, "next-dev.log"), logs.join(""));
  return {
    baseUrl,
    stop: async () => {
      if (process.platform === "win32" && child.pid) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { encoding: "utf8" });
      } else {
        child.kill();
      }
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      child.unref?.();
      await fs.writeFile(path.join(outputDir, "next-dev.log"), logs.join(""));
    },
  };
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".onnx")) return "application/octet-stream";
  if (filePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

async function ensureRapidOcrCharacterFile() {
  const outPath = path.join(outputDir, "local-model-assets", "ch_PP-OCRv4_rec_character.txt");
  if (fssync.existsSync(outPath)) return outPath;
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const python = getPythonExecutable();
  const script = `
import os, sys
sys.path.insert(0, os.environ["RAPIDOCR_TARGET_DIR"])
import onnxruntime as ort
session = ort.InferenceSession(os.environ["RAPIDOCR_REC_MODEL"], providers=["CPUExecutionProvider"])
character = session.get_modelmeta().custom_metadata_map.get("character", "")
open(os.environ["RAPIDOCR_CHARACTER_OUT"], "w", encoding="utf-8").write(character)
`;
  const result = spawnSync(python, ["-c", script], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      RAPIDOCR_TARGET_DIR: rapidOcrTargetDir,
      RAPIDOCR_REC_MODEL: path.join(rapidOcrModelDir, "ch_PP-OCRv4_rec_infer.onnx"),
      RAPIDOCR_CHARACTER_OUT: outPath,
    },
    timeout: 120000,
  });
  if (result.status !== 0) throw new Error(`Failed to extract character file: ${result.stderr || result.stdout}`);
  return outPath;
}

async function installDiagnosticRoutes(context, characterPath) {
  let ortDist = path.join(rootDir, "node_modules", "onnxruntime-web", "dist");
  if (!fssync.existsSync(ortDist)) {
    ortDist = path.join(bundledNodeModules, "onnxruntime-web", "dist");
  }
  await context.route("**/diagnostic-models/rapidocr/**", async (route) => {
    const basename = path.basename(new URL(route.request().url()).pathname);
    const filePath =
      basename === "ch_PP-OCRv4_rec_character.txt" ? characterPath : path.join(rapidOcrModelDir, basename);
    if (!fssync.existsSync(filePath)) {
      await route.fulfill({ status: 404, body: `Missing diagnostic model asset: ${basename}` });
      return;
    }
    await route.fulfill({ status: 200, contentType: contentTypeFor(filePath), body: await fs.readFile(filePath) });
  });
  await context.route("**/diagnostic-models/ort/**", async (route) => {
    const basename = path.basename(new URL(route.request().url()).pathname);
    const filePath = path.join(ortDist, basename);
    if (!fssync.existsSync(filePath)) {
      await route.fulfill({ status: 404, body: `Missing ORT wasm asset: ${basename}` });
      return;
    }
    await route.fulfill({ status: 200, contentType: contentTypeFor(filePath), body: await fs.readFile(filePath) });
  });
}

async function runBrowserReplay({ frozenResults, args }) {
  let chromium;
  try {
    ({ chromium } = requireFromHere("playwright"));
  } catch {
    ({ chromium } = requireFromBundledNode("playwright"));
  }
  const characterPath = await ensureRapidOcrCharacterFile();
  const server = await startServer(args);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await installDiagnosticRoutes(context, characterPath);
    const page = await context.newPage();
    await page.goto(`${server.baseUrl}/?ipadStage3RapidOcrFrozenReplay=1&ipadStage3RapidOcrDetectorEnabled=0`, {
      waitUntil: "domcontentloaded",
      timeout: args.browserTimeoutMs,
    });
    await page.waitForFunction(() => typeof window.__IPAD_STAGE3_RAPIDOCR_FROZEN_REPLAY__ === "function", null, {
      timeout: args.browserTimeoutMs,
    });
    const observations = [];
    for (const observation of frozenResults.observations) {
      const tensor = new Float32Array(await fs.readFile(path.join(rootDir, observation.tensorPath)).then((buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)));
      const cropBuffer = await fs.readFile(path.join(rootDir, observation.targetCropPath));
      const rawBgrBuffer = observation.rawBgrPath ? await fs.readFile(path.join(rootDir, observation.rawBgrPath)) : null;
      observations.push({
        id: observation.id,
        image: observation.image,
        stage: observation.stage,
        side: observation.side,
        field: observation.field,
        pipelineAText: observation.offlineReplay.text,
        pipelineAConfidence: observation.offlineReplay.confidence,
        tensorData: Array.from(tensor),
        shape: observation.shape,
        inputChecksum: observation.tensorSha256,
        inputSamples: observation.inputSamples,
        cropDataUrl: `data:image/png;base64,${cropBuffer.toString("base64")}`,
        profileId: "recognizer-current",
        sourceWidth: observation.sourceWidth,
        sourceHeight: observation.sourceHeight,
        rawBgrBytes: rawBgrBuffer ? Array.from(rawBgrBuffer) : null,
        pipelineAStages: observation.pipelineAStages,
        stageSampleIndices: observation.stageSampleIndices,
      });
    }
    const result = await page.evaluate((payload) => window.__IPAD_STAGE3_RAPIDOCR_FROZEN_REPLAY__(payload), {
      observations,
    });
    await writeJson("browser-frozen-replay-results.json", result);
    await browser.close();
    await context.close().catch(() => {});
    return result;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await server.stop();
  }
}

function summarize({ observations, browserReplay, confidenceSummary, r6Results }) {
  const level1Rows = browserReplay?.observations || [];
  const level1TextMatches = level1Rows.filter((row) => row.level1?.text === row.expectedPipelineAText).length;
  const level1ConfidenceMatches = level1Rows.filter(
    (row) => Math.abs(Number(row.level1?.confidence || 0) - Number(row.expectedPipelineAConfidence || 0)) < 0.00001
  ).length;
  const level1ConfidenceMatchesRelaxed = level1Rows.filter(
    (row) => Math.abs(Number(row.level1?.confidence || 0) - Number(row.expectedPipelineAConfidence || 0)) < 0.0002
  ).length;
  const level1MaxConfidenceDelta = level1Rows.reduce(
    (max, row) =>
      Math.max(max, Math.abs(Number(row.level1?.confidence || 0) - Number(row.expectedPipelineAConfidence || 0))),
    0
  );
  const level2ChecksumMatches = level1Rows.filter((row) => row.level2MatchesFrozenTensor).length;
  const parityRows = level1Rows.filter((row) => row.parity);
  const parityTensorMatches = parityRows.filter((row) => row.parity.finalTensorMatchesPipelineA).length;
  const parityTextMatches = parityRows.filter((row) => row.parity.textMatchesPipelineA).length;
  const firstDivergenceCounts = {};
  for (const row of parityRows) {
    const key = row.parity.firstDifference?.stage || "all-stages-match";
    firstDivergenceCounts[key] = (firstDivergenceCounts[key] || 0) + 1;
  }
  const supportRows = observations.filter((row) => row.purpose === "r6-accepted-support");
  const supportLevel1Matches = level1Rows.filter(
    (row) =>
      supportRows.some((support) => support.id === row.observationId) &&
      row.level1?.text === row.expectedPipelineAText &&
      Math.abs(Number(row.level1?.confidence || 0) - Number(row.expectedPipelineAConfidence || 0)) < 0.00001
  ).length;
  return {
    schema: "ipad-stage3-rapidocr-frozen-replay-summary-v1",
    generatedAt: new Date().toISOString(),
    baselineReferences: {
      originalOfflineR6: {
        wouldApply: r6Results.wouldApply,
        tp: r6Results.tp,
        fp: r6Results.fp,
      },
      currentBrowserBestEvidence: confidenceSummary?.currentBrowserBestEvidence || null,
      productionBaseline: confidenceSummary?.productionBaseline || null,
    },
    observationCount: observations.length,
    r6AcceptedSupportObservationCount: supportRows.length,
    level1: {
      ran: Boolean(browserReplay),
      compared: level1Rows.length,
      textMatchesPipelineA: level1TextMatches,
      confidenceMatchesPipelineAAt1e5: level1ConfidenceMatches,
      confidenceMatchesPipelineAAt2e4: level1ConfidenceMatchesRelaxed,
      maxConfidenceDelta: Number(level1MaxConfidenceDelta.toFixed(8)),
      supportRowsMatchingPipelineA: supportLevel1Matches,
      result:
        level1Rows.length > 0 &&
        level1TextMatches === level1Rows.length &&
        level1ConfidenceMatchesRelaxed === level1Rows.length
          ? "pass-text-exact-confidence-within-0.0002"
          : "mismatch",
    },
    level2: {
      ran: Boolean(browserReplay),
      compared: level1Rows.filter((row) => row.level2).length,
      browserInputChecksumMatchesFrozenTensor: level2ChecksumMatches,
      oldCanvasInputChecksumMatchesFrozenTensor: level2ChecksumMatches,
      parityPreprocessingCompared: parityRows.length,
      parityInputChecksumMatchesFrozenTensor: parityTensorMatches,
      parityDecodedTextMatchesPipelineA: parityTextMatches,
      firstDivergenceCounts,
      result:
        level1Rows.length > 0 && level2ChecksumMatches === level1Rows.filter((row) => row.level2).length
          ? "pass"
          : "mismatch",
      note:
        "Level 2 intentionally compares browser canvas preprocessing from the same crop PNG against the frozen Python/cv2 tensor. Mismatch isolates preprocessing/tensor construction rather than selector logic.",
    },
    level3: {
      ran: false,
      reason:
        level1Rows.length && level1TextMatches === level1Rows.length && level2ChecksumMatches === level1Rows.length
          ? "not-implemented-in-this-diagnostic-script"
          : "blocked-until-level1-and-level2-match",
    },
    productionOutputChanged: false,
  };
}

function stageProjectionFromOffline(observations) {
  return observations.map((observation) => ({
    observationId: observation.id,
    image: observation.image,
    stage: observation.stage,
    side: observation.side,
    field: observation.field,
    preprocessing: observation.preprocessing,
    stages: observation.pipelineAStages,
  }));
}

function stageProjectionFromBrowser(browserReplay) {
  return (browserReplay?.observations || []).map((row) => ({
    observationId: row.observationId,
    image: row.image,
    stage: row.stage,
    side: row.side,
    field: row.field,
    oldCanvas: row.level2
      ? {
          inputChecksum: row.level2.inputChecksum,
          preprocessing: row.level2.preprocessing,
          sampleComparison: row.level2.sampleComparison,
        }
      : null,
    parity: row.parity
      ? {
          preprocessing: row.parity.preprocessing,
          firstDifference: row.parity.firstDifference,
          finalTensorMatchesPipelineA: row.parity.finalTensorMatchesPipelineA,
          textMatchesPipelineA: row.parity.textMatchesPipelineA,
          recognition: row.parity.recognition,
          stages: row.parity.stages,
          elapsedMs: row.parity.elapsedMs,
        }
      : null,
  }));
}

function firstDivergenceReport(browserReplay) {
  return (browserReplay?.observations || []).map((row) => ({
    observationId: row.observationId,
    image: row.image,
    stage: row.stage,
    side: row.side,
    field: row.field,
    firstDifference: row.parity?.firstDifference || null,
    oldCanvasTensorMatches: Boolean(row.level2MatchesFrozenTensor),
    parityTensorMatches: Boolean(row.parity?.finalTensorMatchesPipelineA),
    parityTextMatches: Boolean(row.parity?.textMatchesPipelineA),
  }));
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(outputDir, { recursive: true });
  const [candidateResults, r6Results, unsafeResults, manifest, confidenceSummary] = await Promise.all([
    readJson(path.join(fixtureExpansionDir, "candidate-results.json")),
    readJson(path.join(fixtureExpansionDir, "r6-results.json")),
    readJson(path.join(fixtureExpansionDir, "unsafe-selector-results.json")),
    readJson(path.join(fixtureExpansionDir, "crop-manifest.json")),
    readJson(path.join(confidenceDir, "summary.json")),
  ]);
  const observations = buildObservationRecords({
    candidateResults,
    r6Results,
    unsafeResults,
    manifest,
    sampleLimit: args.sampleLimit,
  });
  await writeJson("selected-observations.json", { observations });
  const frozenResults = await runPythonTensorExport(observations);
  await writeOpenCvJson("pipeline-a-stage-metadata.json", stageProjectionFromOffline(frozenResults.observations));
  let browserReplay = null;
  if (!args.skipBrowser) {
    browserReplay = await runBrowserReplay({ frozenResults, args });
    await writeOpenCvJson("browser-old-and-parity-stage-metadata.json", stageProjectionFromBrowser(browserReplay));
    await writeOpenCvJson("first-divergence.json", firstDivergenceReport(browserReplay));
  }
  const summary = summarize({ observations: frozenResults.observations, browserReplay, confidenceSummary, r6Results });
  await writeJson("summary.json", summary);
  await writeOpenCvJson("summary.json", summary);
  await writeOpenCvJson("recommendation.json", {
    schema: "ipad-stage3-rapidocr-opencv-preprocessing-recommendation-v1",
    generatedAt: new Date().toISOString(),
    level2ParitySolved:
      summary.level2.parityPreprocessingCompared > 0 &&
      summary.level2.parityInputChecksumMatchesFrozenTensor === summary.level2.parityPreprocessingCompared,
    level3Justified: false,
    reason:
      summary.level2.parityInputChecksumMatchesFrozenTensor >= 2
        ? "Level 2 recovered at least two exact tensors; Level 3 may be considered in a separate task after R6 scoring is recreated."
        : "Level 2 tensor parity remains below the threshold for Level 3.",
    productionOutputChanged: false,
  });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
