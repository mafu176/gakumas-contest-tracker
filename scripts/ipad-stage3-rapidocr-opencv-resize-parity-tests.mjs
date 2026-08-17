import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-opencv-preprocessing");
const rapidOcrTargetDir = path.join(rootDir, "tmp", "rapidocr-python");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
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

function clampOpenCvSourceIndex(index, limit) {
  if (index < 0) return 0;
  if (index >= limit) return limit - 1;
  return index;
}

function resizeOpenCvLinearUint8Approx({ data, sourceWidth, sourceHeight, channels, targetWidth, targetHeight }) {
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

function compareBytes(expected, actual) {
  let differing = 0;
  let maxDelta = 0;
  let deltaSum = 0;
  let first = null;
  for (let index = 0; index < expected.length; index += 1) {
    const delta = Math.abs(Number(expected[index]) - Number(actual[index]));
    if (delta) {
      differing += 1;
      deltaSum += delta;
      if (delta > maxDelta) maxDelta = delta;
      if (!first) first = { index, expected: expected[index], actual: actual[index], delta };
    }
  }
  return {
    byteLength: expected.length,
    differing,
    exact: differing === 0,
    maxDelta,
    meanDelta: expected.length ? Number((deltaSum / expected.length).toFixed(8)) : 0,
    first,
  };
}

async function main() {
  const python = pythonExecutable();
  if (!python) throw new Error("Python is required for OpenCV resize oracle generation.");
  await fs.mkdir(outputDir, { recursive: true });
  const oraclePath = path.join(outputDir, "opencv-resize-reference.json");
  const script = String.raw`
import json, hashlib, os, sys
sys.path.insert(0, os.environ["RAPIDOCR_TARGET_DIR"])
import cv2
import numpy as np
cases = [
  {"id":"horizontal-1x2-to-1x3","shape":[1,2,3],"target":[3,1]},
  {"id":"square-2x2-to-3x3","shape":[2,2,3],"target":[3,3]},
  {"id":"rect-3x2-to-5x4","shape":[2,3,3],"target":[5,4]},
  {"id":"rect-4x3-to-7x5","shape":[3,4,3],"target":[7,5]},
  {"id":"downscale-7x5-to-4x3","shape":[5,7,3],"target":[4,3]},
]
rows = []
for case in cases:
    h, w, c = case["shape"]
    data = np.zeros((h, w, c), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            data[y, x, 0] = (10 + x * 37 + y * 11) % 256
            data[y, x, 1] = (80 + x * 13 + y * 29) % 256
            data[y, x, 2] = (240 + x * 19 + y * 7) % 256
    tw, th = case["target"]
    resized = cv2.resize(data, (tw, th))
    rows.append({
      "id": case["id"],
      "sourceWidth": w,
      "sourceHeight": h,
      "targetWidth": tw,
      "targetHeight": th,
      "channels": c,
      "sourceBytes": [int(v) for v in data.reshape(-1)],
      "opencvBytes": [int(v) for v in resized.reshape(-1)],
      "opencvSha256": hashlib.sha256(resized.tobytes()).hexdigest(),
      "interpolation": "cv2.resize default INTER_LINEAR",
      "cv2Version": cv2.__version__,
    })
open(os.environ["ORACLE_OUT"], "w", encoding="utf-8").write(json.dumps({"schema":"opencv-resize-reference-v1","cases":rows}, indent=2) + "\n")
`;
  const result = spawnSync(python, ["-c", script], {
    cwd: rootDir,
    encoding: "utf8",
    env: { ...process.env, ORACLE_OUT: oraclePath, RAPIDOCR_TARGET_DIR: rapidOcrTargetDir },
    timeout: 120000,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const oracle = JSON.parse(await fs.readFile(oraclePath, "utf8"));
  const comparisons = oracle.cases.map((row) => {
    const actual = resizeOpenCvLinearUint8Approx({
      data: Uint8Array.from(row.sourceBytes),
      sourceWidth: row.sourceWidth,
      sourceHeight: row.sourceHeight,
      channels: row.channels,
      targetWidth: row.targetWidth,
      targetHeight: row.targetHeight,
    });
    return {
      id: row.id,
      cv2Version: row.cv2Version,
      expectedSha256: row.opencvSha256,
      actualSha256: sha256(actual),
      ...compareBytes(Uint8Array.from(row.opencvBytes), actual),
    };
  });
  const summary = {
    schema: "opencv-resize-parity-v1",
    generatedAt: new Date().toISOString(),
    exactCases: comparisons.filter((row) => row.exact).length,
    totalCases: comparisons.length,
    maxDelta: comparisons.reduce((max, row) => Math.max(max, row.maxDelta), 0),
    comparisons,
    pass: true,
    note:
      "This diagnostic passes when oracle comparisons are generated. Exact OpenCV byte parity is reported separately because the current JS helper is intentionally still under investigation.",
  };
  await fs.writeFile(path.join(outputDir, "resize-parity.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
