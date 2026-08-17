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
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-direct-runner");
const rapidOcrModelDir = path.join(
  rootDir,
  "tmp",
  "rapidocr-python",
  "rapidocr_onnxruntime",
  "models"
);
const rapidOcrTargetDir = path.join(rootDir, "tmp", "rapidocr-python");
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
const acceptedFourAuditTargets = [
  { image: "IMG_0265.png", side: "self" },
  { image: "IMG_0265.png", side: "enemy" },
  { image: "IMG_0283.png", side: "self" },
  { image: "IMG_0491.png", side: "self" },
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
    .map((entry) => (/\.(png|jpg|jpeg)$/i.test(entry) ? entry : `${entry}.png`));
  const from = argValue("--from");
  const limit = Number(argValue("--limit", "0") || 0);
  return {
    all: process.argv.includes("--all"),
    resume: process.argv.includes("--resume"),
    only,
    from: from ? (/\.(png|jpg|jpeg)$/i.test(from) ? from : `${from}.png`) : "",
    limit: Number.isFinite(limit) && limit > 0 ? limit : 0,
    port: Number(argValue("--port", "0") || 0),
    baseUrl: argValue("--base-url") || process.env.IPAD_RAPIDOCR_DIRECT_BASE_URL || "",
    runs: Math.max(1, Number(argValue("--runs", "1") || 1)),
    imageTimeoutMs: Math.max(30000, Number(argValue("--image-timeout-ms", "240000") || 240000)),
    roiVariants: process.argv.includes("--roi-variants"),
  };
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function expectedBaseName(filename) {
  return filename.replace(/\.(png|jpg|jpeg)$/i, ".json");
}

function safeArtifactName(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
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
  let sliced = fromIndex >= 0 ? selected.slice(fromIndex) : selected;
  if (args.limit) sliced = sliced.slice(0, args.limit);
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
  for (let port = 3340; port < 3370; port += 1) {
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
  while (!(await isServerReady(`${baseUrl}/?ipadStage3RapidOcrDirect=1`))) {
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
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      child.unref?.();
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

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function rowsForField(candidateRows, side, field) {
  return candidateRows.filter((row) => row.stage === 3 && row.side === side && row.assignedField === field);
}

function scoreDiagnostic({ row, diagnostic }) {
  const candidateRows = diagnostic?.candidateRows || [];
  const comparisons = [];
  for (const side of sides) {
    const expected = expectedSide(row.expected.stage3, side);
    for (const field of fields) {
      const expectedValue = expected[field];
      const candidates = rowsForField(candidateRows, side, field);
      const values = [...new Set(candidates.map((candidate) => Number(candidate.value)).filter(Number.isFinite))].sort(
        (a, b) => a - b
      );
      comparisons.push({
        image: row.filename,
        stage: 3,
        side,
        field,
        expectedValue,
        values,
        hasExpected: values.includes(expectedValue),
        candidateCount: candidates.length,
        texts: [...new Set(candidates.map((candidate) => candidate.fullText || "").filter(Boolean))],
        profileIds: [...new Set(candidates.map((candidate) => candidate.profileId).filter(Boolean))],
      });
    }
  }
  return comparisons;
}

function summarizeR6(diagnostic, row) {
  const rows = diagnostic?.r6?.rows || [];
  const accepted = rows.filter((entry) => entry.evaluation?.wouldApply);
  return {
    wouldApply: accepted.length,
    tp: accepted.filter((entry) => {
      const expected = expectedSide(row.expected.stage3, entry.side);
      return JSON.stringify(entry.proposal) === JSON.stringify(expected);
    }).length,
    fp: accepted.filter((entry) => {
      const expected = expectedSide(row.expected.stage3, entry.side);
      return JSON.stringify(entry.proposal) !== JSON.stringify(expected);
    }).length,
    rows,
  };
}

function summarizeResults(results) {
  const comparisons = results.flatMap((result) => result.comparisons || []);
  const byField = Object.fromEntries(
    fields.map((field) => {
      const rows = comparisons.filter((comparison) => comparison.field === field);
      return [
        field,
        {
          exact: rows.filter((row) => row.hasExpected).length,
          total: rows.length,
          percentage: rows.length ? Number(((rows.filter((row) => row.hasExpected).length / rows.length) * 100).toFixed(2)) : 0,
        },
      ];
    })
  );
  const byCluster = Object.fromEntries(
    [...new Set(results.map((result) => result.detection?.cluster || result.detection?.layout || "unknown"))].map(
      (cluster) => {
        const clusterResults = results.filter(
          (result) => (result.detection?.cluster || result.detection?.layout || "unknown") === cluster
        );
        const clusterComparisons = clusterResults.flatMap((result) => result.comparisons || []);
        return [
          cluster,
          {
            images: clusterResults.length,
            exactFields: clusterComparisons.filter((row) => row.hasExpected).length,
            totalFields: clusterComparisons.length,
          },
        ];
      }
    )
  );
  const acceptedRows = results.flatMap((result) =>
    (result.r6?.rows || [])
      .filter((row) => row.evaluation?.wouldApply)
      .map((row) => ({ image: result.image, stage: 3, side: row.side, proposal: row.proposal }))
  );
  return {
    schema: "ipad-stage3-rapidocr-direct-runner-summary-v1",
    generatedAt: new Date().toISOString(),
    imageCount: results.length,
    stage3Sides: results.length * 2,
    fields: comparisons.length,
    exactFields: comparisons.filter((row) => row.hasExpected).length,
    byField,
    byCluster,
    r6: {
      wouldApply: acceptedRows.length,
      tp: results.reduce((sum, result) => sum + Number(result.r6?.tp || 0), 0),
      fp: results.reduce((sum, result) => sum + Number(result.r6?.fp || 0), 0),
      accepted: acceptedRows,
    },
    statuses: Object.fromEntries(
      [...new Set(results.map((result) => result.status))].map((status) => [
        status,
        results.filter((result) => result.status === status).length,
      ])
    ),
    timing: {
      totalElapsedMs: Number(results.reduce((sum, result) => sum + Number(result.elapsedMs || 0), 0).toFixed(3)),
      averageElapsedMs: results.length
        ? Number((results.reduce((sum, result) => sum + Number(result.elapsedMs || 0), 0) / results.length).toFixed(3))
        : 0,
      perImage: results.map((result) => ({
        image: result.image,
        elapsedMs: result.elapsedMs,
        phaseTimings: result.phaseTimings,
      })),
    },
  };
}

function outputSummaryName(args, rows) {
  if (args.roiVariants) return "variant-comparison.json";
  if (rows.length === 1 && rows[0]?.filename === "IMG_0265.png") return "img0265-baseline.json";
  if (args.all) return "full-results.json";
  return "subset-results.json";
}

function buildAcceptedFourAudit(results) {
  return acceptedFourAuditTargets.map((target) => {
    const result = results.find((entry) => entry.image === target.image);
    const comparisons = (result?.comparisons || []).filter((entry) => entry.side === target.side);
    const r6Row = (result?.r6?.rows || []).find((entry) => entry.side === target.side);
    return {
      ...target,
      candidateEvidenceSufficient: comparisons.every((entry) => entry.hasExpected),
      exactFields: comparisons.filter((entry) => entry.hasExpected).length,
      totalFields: comparisons.length,
      r6WouldApply: Boolean(r6Row?.evaluation?.wouldApply),
      blockReasons: r6Row?.evaluation?.blockReasons || [],
      proposal: r6Row?.proposal || null,
    };
  });
}

async function processImage({ page, row, runDir, resume, imageTimeoutMs }) {
  const imageDir = path.join(runDir, safeArtifactName(row.filename));
  const resultPath = path.join(imageDir, "direct-rapidocr-result.json");
  if (resume && fssync.existsSync(resultPath)) return loadJson(resultPath);
  await fs.mkdir(imageDir, { recursive: true });
  const dataUrl = `data:image/png;base64,${(await fs.readFile(row.imagePath)).toString("base64")}`;
  const started = Date.now();
  try {
    const diagnostic = await withTimeout(
      page.evaluate(async ({ dataUrl: browserDataUrl, imageName }) => {
        if (typeof window.__IPAD_STAGE3_RAPIDOCR_DIRECT_RUN__ !== "function") {
          throw new Error("iPad Stage3 RapidOCR direct API is not available.");
        }
        return window.__IPAD_STAGE3_RAPIDOCR_DIRECT_RUN__({ dataUrl: browserDataUrl, imageName });
      }, { dataUrl, imageName: row.filename }),
      imageTimeoutMs,
      row.filename
    );
    const comparisons = scoreDiagnostic({ row, diagnostic });
    const r6 = summarizeR6(diagnostic, row);
    const result = {
      image: row.filename,
      imagePath: normalizePathForReport(row.imagePath),
      status: diagnostic?.status || "missing",
      elapsedMs: diagnostic?.directRunner?.elapsedMs || diagnostic?.runtime?.phaseTimings?.totalElapsedMs || 0,
      wallElapsedMs: Date.now() - started,
      detection: diagnostic?.detection || null,
      modelInventory: diagnostic?.modelInventory || null,
      phaseTimings: diagnostic?.runtime?.phaseTimings || {},
      diagnosticsSummary: diagnostic?.diagnosticsSummary || {},
      comparisons,
      r6,
    };
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    await fs.writeFile(path.join(imageDir, "direct-rapidocr-diagnostic.json"), JSON.stringify(diagnostic, null, 2));
    return result;
  } catch (error) {
    const result = {
      image: row.filename,
      imagePath: normalizePathForReport(row.imagePath),
      status: "failed",
      elapsedMs: 0,
      wallElapsedMs: Date.now() - started,
      error: { message: error.message, stack: error.stack },
      comparisons: [],
      r6: { wouldApply: 0, tp: 0, fp: 0, rows: [] },
    };
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    return result;
  }
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(artifactDir, { recursive: true });
  const rows = await listRows(args);
  const characterPath = await ensureRapidOcrCharacterFile();
  let chromium;
  try {
    ({ chromium } = requireFromHere("playwright"));
  } catch {
    ({ chromium } = requireFromBundledNode("playwright"));
  }
  const runnerConfig = {
    schema: "ipad-stage3-rapidocr-direct-runner-config-v1",
    generatedAt: new Date().toISOString(),
    args,
    imageCount: rows.length,
    imageDir: normalizePathForReport(ipadImageDir),
    expectedDir: normalizePathForReport(ipadExpectedDir),
    modelDir: normalizePathForReport(rapidOcrModelDir),
    architecture: "D-detectorless-fixed-roi",
    productionOcrBypassed: true,
  };
  await fs.writeFile(path.join(artifactDir, "runner-config.json"), JSON.stringify(runnerConfig, null, 2));
  const server = await startServer(args);
  const browser = await chromium.launch({ headless: true });
  const runSummaries = [];
  try {
    for (let run = 1; run <= args.runs; run += 1) {
      const runDir = path.join(artifactDir, `run-${run}`);
      await fs.mkdir(runDir, { recursive: true });
      const context = await browser.newContext({ acceptDownloads: true });
      await installDiagnosticRoutes(context, characterPath);
      const page = await context.newPage();
      const consoleMessages = [];
      const pageErrors = [];
      page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
      page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
      const params = new URLSearchParams({
        ipadStage3RapidOcrDirect: "1",
        ipadStage3RapidOcrDetectorEnabled: "0",
      });
      if (args.roiVariants) params.set("ipadStage3RapidOcrRoiVariants", "1");
      await page.goto(`${server.baseUrl}/?${params.toString()}`, {
        waitUntil: "domcontentloaded",
        timeout: 300000,
      });
      await page.waitForFunction(() => typeof window.__IPAD_STAGE3_RAPIDOCR_DIRECT_RUN__ === "function", null, {
        timeout: 180000,
      });
      const results = [];
      for (const row of rows) {
        const result = await processImage({
          page,
          row,
          runDir,
          resume: args.resume,
          imageTimeoutMs: args.imageTimeoutMs,
        });
        results.push(result);
        await fs.writeFile(path.join(runDir, "checkpoint.json"), JSON.stringify({ completed: results.length }, null, 2));
      }
      await fs.writeFile(path.join(runDir, "console-messages.json"), JSON.stringify(consoleMessages, null, 2));
      await fs.writeFile(path.join(runDir, "page-errors.json"), JSON.stringify(pageErrors, null, 2));
      await page.close().catch(() => {});
      await context.close();
      const summary = summarizeResults(results);
      await fs.writeFile(path.join(runDir, "results.json"), JSON.stringify(results, null, 2));
      await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
      await fs.writeFile(path.join(runDir, "field-accuracy.json"), JSON.stringify(summary.byField, null, 2));
      await fs.writeFile(path.join(runDir, "r6-results.json"), JSON.stringify(summary.r6, null, 2));
      await fs.writeFile(path.join(runDir, "accepted-four-audit.json"), JSON.stringify(buildAcceptedFourAudit(results), null, 2));
      const img0283 = results.find((result) => result.image === "IMG_0283.png");
      if (img0283) {
        await fs.writeFile(path.join(runDir, "img0283-audit.json"), JSON.stringify(img0283, null, 2));
      }
      runSummaries.push(summary);
    }
  } finally {
    await browser.close().catch(() => {});
    await server.stop();
  }
  const summary = {
    schema: "ipad-stage3-rapidocr-direct-runner-v1",
    command: "node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs",
    outputDir: normalizePathForReport(artifactDir),
    imageCount: rows.length,
    runs: runSummaries,
  };
  await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(artifactDir, outputSummaryName(args, rows)), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
