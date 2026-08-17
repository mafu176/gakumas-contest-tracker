import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-browser-runtime");
const rapidOcrModelDir = path.join(
  rootDir,
  "tmp",
  "rapidocr-python",
  "rapidocr_onnxruntime",
  "models"
);
const rapidOcrTargetDir = path.join(rootDir, "tmp", "rapidocr-python");
const offlineCandidatePath = path.join(
  rootDir,
  "tmp",
  "ipad-stage3-rapidocr-fixture-expansion",
  "candidate-results.json"
);
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

const sides = ["self", "enemy"];
const fields = ["member1", "member2", "member3", "bonus", "total"];
const defaultSubset = [
  "IMG_0265.png",
  "IMG_0283.png",
  "IMG_0491.png",
  "IMG_0273.png",
  "IMG_0264.png",
  "IMG_0268.png",
  "IMG_0296.png",
  "IMG_0792.png",
  "IMG_0798.png",
  "IMG_0801.png",
];

function parseArgs() {
  const argValue = (name, fallback = "") => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] || fallback : fallback;
  };
  const only = argValue("--only")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry.endsWith(".png") ? entry : `${entry}.png`));
  const from = argValue("--from");
  return {
    all: process.argv.includes("--all"),
    resume: process.argv.includes("--resume"),
    only,
    from: from ? (from.endsWith(".png") ? from : `${from}.png`) : "",
    port: Number(argValue("--port", "0") || 0),
    baseUrl: argValue("--base-url") || process.env.IPAD_RAPIDOCR_BROWSER_BASE_URL || "",
    runs: Math.max(1, Number(argValue("--runs", "1") || 1)),
    detectorEnabled: argValue("--detector-enabled") || "",
    roiVariants: process.argv.includes("--roi-variants"),
    detectorCropKinds: argValue("--detector-crop-kinds") || "",
    detectorLimitSideLen: argValue("--detector-limit-side-len") || "",
  };
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function expectedBaseName(filename) {
  return filename.replace(/\.(png|jpg|jpeg)$/i, ".json");
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function expectedSide(stage3, side) {
  return {
    member1: Number(stage3[`${side}Members`]?.[0] || 0),
    member2: Number(stage3[`${side}Members`]?.[1] || 0),
    member3: Number(stage3[`${side}Members`]?.[2] || 0),
    bonus: Number(stage3[`${side}Bonus`] || 0),
    total: Number(stage3[`${side}Total`] || 0),
  };
}

async function listRows(args) {
  const imageFiles = (await fs.readdir(ipadImageDir))
    .filter((name) => /\.(png|jpg|jpeg)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
  const selected = args.all ? imageFiles : args.only.length ? args.only : defaultSubset;
  const fromIndex = args.from ? selected.findIndex((name) => name === args.from) : -1;
  const sliced = fromIndex >= 0 ? selected.slice(fromIndex) : selected;
  const rows = [];
  for (const filename of sliced) {
    const imagePath = path.join(ipadImageDir, filename);
    const expectedPath = path.join(ipadExpectedDir, expectedBaseName(filename));
    if (!fssync.existsSync(imagePath) || !fssync.existsSync(expectedPath)) continue;
    rows.push({
      filename,
      imagePath,
      expectedPath,
      expected: await loadJson(expectedPath),
    });
  }
  return rows;
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
  return candidates.find((candidate) => {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    return result.status === 0;
  });
}

async function ensureRapidOcrCharacterFile() {
  const outPath = path.join(artifactDir, "local-model-assets", "ch_PP-OCRv4_rec_character.txt");
  if (fssync.existsSync(outPath)) return outPath;
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const python = getPythonExecutable();
  if (!python) throw new Error("No Python executable found for extracting RapidOCR character metadata.");
  const script = `
import os, sys
sys.path.insert(0, os.environ["RAPIDOCR_TARGET_DIR"])
import onnxruntime as ort
session = ort.InferenceSession(os.environ["RAPIDOCR_REC_MODEL"], providers=["CPUExecutionProvider"])
character = session.get_modelmeta().custom_metadata_map.get("character", "")
if not character:
    raise SystemExit("recognizer model has no character metadata")
with open(os.environ["RAPIDOCR_CHARACTER_OUT"], "w", encoding="utf-8") as handle:
    handle.write(character)
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
  if (result.status !== 0) {
    throw new Error(`Failed to extract RapidOCR character metadata: ${result.stderr || result.stdout}`);
  }
  return outPath;
}

async function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function choosePort(requested) {
  if (requested && (await portAvailable(requested))) return requested;
  for (let port = 3310; port < 3340; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error("No available local port for Next.js dev server.");
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isServerReady(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
}

async function startServer(args) {
  if (args.baseUrl) return { baseUrl: args.baseUrl, stop: async () => {} };
  const port = await choosePort(args.port);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "dev", "--", "-p", String(port)], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port) },
  });
  const logPath = path.join(artifactDir, "next-dev.log");
  const logs = [];
  let exited = false;
  let exitCode = null;
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  child.on("exit", (code) => {
    exited = true;
    exitCode = code;
  });
  const baseUrl = `http://localhost:${port}`;
  const started = Date.now();
  while (!(await isServerReady(`${baseUrl}/?ipadStage3RapidOcrDebug=1`))) {
    if (exited) {
      await fs.writeFile(logPath, logs.join(""));
      throw new Error(`Next.js dev server exited before becoming ready (code=${exitCode}).`);
    }
    if (Date.now() - started > 120000) {
      await fs.writeFile(logPath, logs.join(""));
      throw new Error(`Timed out waiting for dev server at ${baseUrl}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await fs.writeFile(logPath, logs.join(""));
  return {
    baseUrl,
    stop: async () => {
      if (process.platform === "win32" && child.pid) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { encoding: "utf8" });
      } else {
        child.kill();
      }
      await fs.writeFile(logPath, logs.join(""));
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

async function installDiagnosticRoutes(context, characterPath) {
  const ortDist = path.join(rootDir, "node_modules", "onnxruntime-web", "dist");
  await context.route("**/diagnostic-models/rapidocr/**", async (route) => {
    const url = new URL(route.request().url());
    const basename = path.basename(url.pathname);
    const filePath =
      basename === "ch_PP-OCRv4_rec_character.txt"
        ? characterPath
        : path.join(rapidOcrModelDir, basename);
    if (!fssync.existsSync(filePath)) {
      await route.fulfill({ status: 404, body: `Missing diagnostic model asset: ${basename}` });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: contentTypeFor(filePath),
      body: await fs.readFile(filePath),
    });
  });
  await context.route("**/diagnostic-models/ort/**", async (route) => {
    const basename = path.basename(new URL(route.request().url()).pathname);
    const filePath = path.join(ortDist, basename);
    if (!fssync.existsSync(filePath)) {
      await route.fulfill({ status: 404, body: `Missing ONNX Runtime Web asset: ${basename}` });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: contentTypeFor(filePath),
      body: await fs.readFile(filePath),
    });
  });
}

function rowFieldKey(row) {
  return `${row.image}|${row.stage}|${row.side}|${row.assignedField || row.sourceField}`;
}

async function loadOfflineCandidates() {
  try {
    const rows = await loadJson(offlineCandidatePath);
    const map = new Map();
    for (const row of rows) {
      if (row.stage !== 3 || !fields.includes(row.assignedField || row.sourceField)) {
        continue;
      }
      const key = rowFieldKey(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  } catch {
    return new Map();
  }
}

function compareFieldCandidates({ image, side, field, browserRows, offlineRows, expectedValue }) {
  const browserValues = [...new Set(browserRows.map((row) => Number(row.value)).filter(Number.isFinite))].sort(
    (a, b) => a - b
  );
  const offlineValues = [...new Set(offlineRows.map((row) => Number(row.value)).filter(Number.isFinite))].sort(
    (a, b) => a - b
  );
  const browserDetectRows = browserRows.filter((row) => row.profileId === "browser-rapidocr-detect-recognize");
  const offlineDetectRows = offlineRows.filter((row) => row.profileId === "rapidocr-detect-recognize");
  return {
    image,
    stage: 3,
    side,
    field,
    expectedValue,
    browserValues,
    offlineValues,
    browserHasExpected: browserValues.includes(expectedValue),
    offlineHasExpected: offlineValues.includes(expectedValue),
    valuesMatchOffline: JSON.stringify(browserValues) === JSON.stringify(offlineValues),
    browserDetectHasExpected: browserDetectRows.some((row) => Number(row.value) === expectedValue),
    offlineDetectHasExpected: offlineDetectRows.some((row) => Number(row.value) === expectedValue),
    browserProfiles: [...new Set(browserRows.map((row) => row.profileId).filter(Boolean))],
    offlineProfiles: [...new Set(offlineRows.map((row) => row.profileId).filter(Boolean))],
    browserCropKinds: [...new Set(browserRows.map((row) => row.cropKind).filter(Boolean))],
    offlineCropKinds: [...new Set(offlineRows.map((row) => row.cropKind).filter(Boolean))],
    browserText: [...new Set(browserRows.map((row) => row.fullText || "").filter(Boolean))],
    offlineText: [...new Set(offlineRows.map((row) => row.fullText || "").filter(Boolean))],
  };
}

async function processImage({ context, baseUrl, row, runDir, resume, offlineCandidateMap }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const resultPath = path.join(imageDir, "rapidocr-browser-result.json");
  if (resume && fssync.existsSync(resultPath)) return loadJson(resultPath);
  await fs.mkdir(imageDir, { recursive: true });
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
  try {
    const params = new URLSearchParams({ ipadStage3RapidOcrDebug: "1" });
    if (row.detectorEnabled) params.set("ipadStage3RapidOcrDetectorEnabled", row.detectorEnabled);
    if (row.roiVariants) params.set("ipadStage3RapidOcrRoiVariants", "1");
    if (row.detectorCropKinds) params.set("ipadStage3RapidOcrDetectorCropKinds", row.detectorCropKinds);
    if (row.detectorLimitSideLen) params.set("ipadStage3RapidOcrDetectorLimitSideLen", row.detectorLimitSideLen);
    await page.goto(`${baseUrl}/?${params.toString()}`, {
      waitUntil: "domcontentloaded",
      timeout: 300000,
    });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', {
      state: "attached",
      timeout: 60000,
    });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, {
      timeout: 180000,
    });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad RapidOCR browser verification.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-stage3-rapidocr-diagnostic-json"]', {
      state: "attached",
      timeout: 900000,
    });
    await page.waitForFunction(
      () => Boolean(window.__IPAD_STAGE3_RAPIDOCR_DIAGNOSTIC__?.status),
      null,
      { timeout: 60000 }
    );
    const diagnostic = await page.evaluate(() => window.__IPAD_STAGE3_RAPIDOCR_DIAGNOSTIC__);
    const candidateRows = diagnostic?.candidateRows || [];
    const comparisons = [];
    for (const side of sides) {
      const expected = expectedSide(row.expected.stage3, side);
      for (const field of fields) {
        const expectedValue = expected[field];
        const browserRows = candidateRows.filter(
          (candidate) => candidate.side === side && candidate.assignedField === field
        );
        const offlineRows = offlineCandidateMap.get(`${row.filename}|3|${side}|${field}`) || [];
        comparisons.push(
          compareFieldCandidates({
            image: row.filename,
            side,
            field,
            browserRows,
            offlineRows,
            expectedValue,
          })
        );
      }
    }
    const result = {
      image: row.filename,
      imagePath: normalizePathForReport(row.imagePath),
      status: diagnostic?.status || "missing",
      elapsedMs: diagnostic?.elapsedMs || 0,
      modelInventory: diagnostic?.modelInventory || null,
      diagnosticsSummary: diagnostic?.diagnosticsSummary || {},
      r6: diagnostic?.r6 || null,
      comparisons,
      consoleMessages,
      pageErrors,
    };
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    await fs.writeFile(path.join(imageDir, "rapidocr-browser-diagnostic.json"), JSON.stringify(diagnostic, null, 2));
    return result;
  } finally {
    await page.close().catch(() => {});
  }
}

function summarizeResults(results) {
  const comparisons = results.flatMap((result) => result.comparisons || []);
  const byField = Object.fromEntries(
    fields.map((field) => {
      const rows = comparisons.filter((comparison) => comparison.field === field);
      return [
        field,
        {
          browserExact: rows.filter((row) => row.browserHasExpected).length,
          offlineRecognitionOnlyExact: rows.filter((row) => row.offlineHasExpected).length,
          parityExactValues: rows.filter((row) => row.valuesMatchOffline).length,
          total: rows.length,
        },
      ];
    })
  );
  const browserDetectExactFields = comparisons.filter((row) => row.browserDetectHasExpected).length;
  const offlineDetectExactFields = comparisons.filter((row) => row.offlineDetectHasExpected).length;
  return {
    schema: "ipad-stage3-rapidocr-browser-verification-summary-v1",
    generatedAt: new Date().toISOString(),
    images: results.length,
    stage3Sides: results.length * 2,
    fields: comparisons.length,
    browserExactFields: comparisons.filter((row) => row.browserHasExpected).length,
    offlineExactFields: comparisons.filter((row) => row.offlineHasExpected).length,
    browserDetectExactFields,
    offlineDetectExactFields,
    parityExactValueFields: comparisons.filter((row) => row.valuesMatchOffline).length,
    byField,
    r6: {
      wouldApply: results.reduce((sum, result) => sum + Number(result.r6?.summary?.wouldApply || 0), 0),
      note:
        "R6 production scoring is not claimed from browser detector output yet. Detector candidates are diagnostic-only; the RapidOCR arithmetic selector proposal stage remains the next blocker for full R6 parity.",
    },
    statuses: Object.fromEntries(
      [...new Set(results.map((result) => result.status))].map((status) => [
        status,
        results.filter((result) => result.status === status).length,
      ])
    ),
  };
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(artifactDir, { recursive: true });
  const rows = await listRows(args);
  const characterPath = await ensureRapidOcrCharacterFile();
  const offlineCandidateMap = await loadOfflineCandidates();
  let chromium;
  try {
    ({ chromium } = requireFromHere("playwright"));
  } catch {
    ({ chromium } = requireFromBundledNode("playwright"));
  }
  const server = await startServer(args);
  const browser = await chromium.launch({ headless: true });
  const allRuns = [];
  try {
    for (let run = 1; run <= args.runs; run += 1) {
      const runDir = path.join(artifactDir, `run-${run}`);
      await fs.mkdir(runDir, { recursive: true });
      const context = await browser.newContext({ acceptDownloads: true });
      await installDiagnosticRoutes(context, characterPath);
      const results = [];
      for (const row of rows) {
        results.push(
          await processImage({
            context,
            baseUrl: server.baseUrl,
            row: {
              ...row,
              detectorEnabled: args.detectorEnabled,
              roiVariants: args.roiVariants,
              detectorCropKinds: args.detectorCropKinds,
              detectorLimitSideLen: args.detectorLimitSideLen,
            },
            runDir,
            resume: args.resume,
            offlineCandidateMap,
          })
        );
      }
      await context.close();
      const summary = summarizeResults(results);
      await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
      await fs.writeFile(path.join(runDir, "results.json"), JSON.stringify(results, null, 2));
      allRuns.push(summary);
    }
  } finally {
    await browser.close().catch(() => {});
    await server.stop();
  }
  const summary = {
    schema: "ipad-stage3-rapidocr-browser-verification-v1",
    command: "node scripts/ipad-stage3-rapidocr-browser-verification.mjs",
    outputDir: normalizePathForReport(artifactDir),
    modelDir: normalizePathForReport(rapidOcrModelDir),
    imageCount: rows.length,
    runs: allRuns,
  };
  await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
