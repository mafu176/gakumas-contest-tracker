import fs from "node:fs/promises";
import fsSync from "node:fs";
import http from "node:http";
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
const artifactDir = path.join(rootDir, "tmp", "ipad-bonus-candidate-capture");
const productionVerificationDir = path.join(rootDir, "tmp", "ipad-browser-production-verification");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];

const profiles = [
  { id: "production-blue-bonus-mask-3x-psm7", label: "production-like blue bonus mask 3x PSM7", kind: "blue-bonus-mask", scale: 3, pageSegMode: "7" },
  { id: "blue-bonus-mask-3x-psm7-digits-only", label: "blue bonus mask 3x PSM7 digits only", kind: "blue-bonus-mask", scale: 3, pageSegMode: "7", digitsOnly: true },
  { id: "white-mask-3x-psm7", label: "white mask 3x PSM7", kind: "white-mask", scale: 3, pageSegMode: "7", threshold: 176 },
  { id: "grayscale-3x-psm7", label: "grayscale 3x PSM7", kind: "grayscale", scale: 3, pageSegMode: "7" },
  { id: "grayscale-3x-psm6", label: "grayscale 3x PSM6", kind: "grayscale", scale: 3, pageSegMode: "6" },
  { id: "grayscale-3x-psm8", label: "grayscale 3x PSM8", kind: "grayscale", scale: 3, pageSegMode: "8" },
];

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  const portIndex = process.argv.indexOf("--port");
  const profileIndex = process.argv.indexOf("--profiles");
  return {
    runs: Math.max(1, Number(process.argv[runsIndex + 1] || 2)),
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_BONUS_CAPTURE_BASE_URL || "",
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    resume: process.argv.includes("--resume"),
    profileIds:
      profileIndex >= 0
        ? String(process.argv[profileIndex + 1] || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
  };
}

function rel(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function pct(pass, total) {
  return total ? Number(((pass / total) * 100).toFixed(1)) : 0;
}

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function unique(values) {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))];
}

function normalizeTextNumber(raw) {
  return toNumber(raw);
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function loadPlaywright() {
  try {
    return requireFromHere("playwright");
  } catch (error) {
    const configuredModuleDir = process.env.PLAYWRIGHT_NODE_MODULES;
    if (configuredModuleDir) {
      return createRequire(path.join(path.resolve(rootDir, configuredModuleDir), "noop.js"))("playwright");
    }
    throw new Error(
      [
        "Playwright is required for iPad browser bonus candidate capture.",
        "Install it in this project or set PLAYWRIGHT_NODE_MODULES to a node_modules directory that contains playwright.",
        `Original error: ${error.message}`,
      ].join(" ")
    );
  }
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "no response"}`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function startDevServer(port) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: rootDir,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push({ stream: "stdout", text: chunk.toString() }));
  child.stderr.on("data", (chunk) => logs.push({ stream: "stderr", text: chunk.toString() }));
  return { child, logs };
}

async function stopDevServer(server) {
  if (!server?.child || server.child.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  server.child.kill();
}

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".traineddata")) return "application/octet-stream";
  return "application/octet-stream";
}

async function startTesseractAssetServer() {
  const port = await findFreePort();
  const distDir = path.join(rootDir, "node_modules", "tesseract.js", "dist");
  const coreDir = path.join(rootDir, "node_modules", "tesseract.js-core");
  const langDir = rootDir;
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
    const routes = {
      "/tesseract.min.js": path.join(distDir, "tesseract.min.js"),
      "/worker.min.js": path.join(distDir, "worker.min.js"),
      "/tesseract-core-simd-lstm.wasm.js": path.join(coreDir, "tesseract-core-simd-lstm.wasm.js"),
      "/tesseract-core-simd-lstm.wasm": path.join(coreDir, "tesseract-core-simd-lstm.wasm"),
      "/eng.traineddata": path.join(langDir, "eng.traineddata"),
    };
    const filePath = routes[url.pathname];
    if (!filePath || !fsSync.existsSync(filePath)) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, {
      "content-type": contentType(filePath),
      "access-control-allow-origin": "*",
    });
    fsSync.createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function collectFixtures() {
  const manifest = await loadJson(path.join(ipadExpectedDir, "manifest.json"));
  const rows = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    const filename = entry.filename;
    const imagePath = path.join(ipadImageDir, filename);
    const expectedPath = path.join(ipadExpectedDir, entry.expectedFixture || filename.replace(/\.png$/i, ".json"));
    await fs.access(imagePath);
    await fs.access(expectedPath);
    rows.push({ ...entry, filename, imagePath, expected: await loadJson(expectedPath) });
  }
  if (rows.length !== 18) throw new Error(`Expected exactly 18 complete iPad fixtures, found ${rows.length}`);
  return rows;
}

function expectedSide(expectedStage, side) {
  return {
    members: side === "self" ? expectedStage.selfMembers.map(Number) : expectedStage.enemyMembers.map(Number),
    bonus: Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0),
    total: Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0),
  };
}

function normalizeSide(value = {}) {
  const members = Array.isArray(value.members) ? value.members.slice(0, 3).map(toNumber) : [0, 0, 0];
  while (members.length < 3) members.push(0);
  return {
    members,
    bonus: toNumber(value.bonus),
    total: toNumber(value.total),
  };
}

function compareSide(actualInput, expectedInput) {
  const actual = normalizeSide(actualInput);
  const expected = normalizeSide(expectedInput);
  return {
    pass:
      actual.members.every((value, index) => value === expected.members[index]) &&
      actual.bonus === expected.bonus &&
      actual.total === expected.total,
    membersPass: actual.members.every((value, index) => value === expected.members[index]),
    bonusPass: actual.bonus === expected.bonus,
    totalPass: actual.total === expected.total,
    actual,
    expected,
  };
}

function displayedSide(diagnostics, stage, side) {
  const stageScores = diagnostics.displayedOcrStages || {};
  const stageScore = stageScores[stage] || stageScores[`stage${stage}`] || {};
  const applied = (diagnostics.productionRecovery?.appliedCases || []).find(
    (entry) => entry.stage === stage && entry.side === side
  );
  const currentPrimary = diagnostics.stages?.[`stage${stage}`]?.[side]?.currentPrimary || {};
  return {
    members: (stageScore[side] || []).slice(0, 3).map(toNumber),
    bonus: applied ? Number(applied.newValues?.bonus || 0) : Number(currentPrimary.bonus || 0),
    total: toNumber(stageScore[side === "self" ? "selfTotal" : "enemyTotal"]),
  };
}

function poolFor(diagnostics, stage, side) {
  return (
    diagnostics?.stages?.[`stage${stage}`]?.[side]?.fieldCandidatePools?.bonus ||
    (diagnostics?.fieldPools || []).find(
      (pool) => pool.stage === stage && pool.side === side && pool.fieldType === "bonus"
    ) ||
    null
  );
}

function productionValues(pool) {
  return unique((pool?.candidates || []).map((candidate) => toNumber(candidate.value)));
}

function rawTextsFromPool(pool) {
  const texts = [];
  for (const candidate of pool?.candidates || []) {
    if (candidate.rawText) texts.push({ rawText: candidate.rawText, source: candidate.profileId || "candidate" });
    for (const contribution of candidate.contributions || []) {
      if (contribution.rawText) {
        texts.push({
          rawText: contribution.rawText,
          source: contribution.profileId || "contribution",
          rawCandidate: contribution.rawCandidate || "",
        });
      }
    }
  }
  const seen = new Set();
  return texts.filter((entry) => {
    const key = `${entry.source}|${entry.rawText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseT1Standalone(text) {
  const values = [];
  for (const match of String(text || "").matchAll(/(?<![\d,.])(?:[+＋]\s*)?\d{5,6}(?![\d,.])/g)) {
    values.push({ raw: match[0], value: normalizeTextNumber(match[0]), parser: "T1-standalone" });
  }
  return values.filter((entry) => entry.value >= 10000 && entry.value < 1000000);
}

function parseT2Grouped(text) {
  const values = [];
  for (const match of String(text || "").matchAll(/(?<!\d)(?:[+＋]\s*)?\d{1,3}(?:[,.]\d{3})+(?!\d)/g)) {
    values.push({ raw: match[0], value: normalizeTextNumber(match[0]), parser: "T2-bonus-grouped" });
  }
  return values.filter((entry) => entry.value >= 10000 && entry.value < 1000000);
}

function parseT3NumericRuns(text) {
  const values = [];
  for (const match of String(text || "").matchAll(/(?<![A-Za-z0-9])(?:[+＋]\s*)?[\d,. ]{5,12}(?![A-Za-z0-9])/g)) {
    const raw = match[0];
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length < 5 || digits.length > 6) continue;
    values.push({ raw, value: Number(digits), parser: "T3-numeric-run" });
  }
  return values.filter((entry) => entry.value >= 10000 && entry.value < 1000000);
}

function parseAllVariants(rawEntries) {
  const buckets = { T1: [], T2: [], T3: [] };
  for (const entry of rawEntries) {
    for (const parsed of parseT1Standalone(entry.rawText)) buckets.T1.push({ ...parsed, source: entry.source, rawText: entry.rawText });
    for (const parsed of parseT2Grouped(entry.rawText)) buckets.T2.push({ ...parsed, source: entry.source, rawText: entry.rawText });
    for (const parsed of parseT3NumericRuns(entry.rawText)) buckets.T3.push({ ...parsed, source: entry.source, rawText: entry.rawText });
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([key, entries]) => [
      key,
      [...new Map(entries.map((entry) => [`${entry.value}|${entry.raw}|${entry.source}`, entry])).values()],
    ])
  );
}

function classifyMissingBonus(record) {
  if (record.productionPresent) return "production-candidate-present";
  const allRaw = [
    ...record.rawTexts.map((entry) => entry.rawText),
    ...record.profileSummaries.map((entry) => entry.rawText),
  ].join("\n");
  if (record.parserVariants.T2.some((entry) => entry.value === record.expected)) return "B-grouped-comma-period-token";
  if (record.parserVariants.T1.some((entry) => entry.value === record.expected)) return "A-literal-exists-parser-omitted";
  if (record.parserVariants.T3.some((entry) => entry.value === record.expected)) return "C-digits-across-run-word";
  if (record.profileSummaries.some((profile) => profile.values.includes(record.expected))) {
    return "diagnostic-profile-exact-bonus";
  }
  if (!allRaw.trim()) return "I-empty-ocr";
  if (!allRaw.replace(/[^\d]/g, "")) return "J-non-numeric-garbage";
  if (allRaw.replace(/[^\d]/g, "").includes(String(record.expected))) return "A-literal-exists-parser-omitted";
  const allValues = unique([
    ...record.productionValues,
    ...record.parserValues.T1,
    ...record.parserValues.T2,
    ...record.parserValues.T3,
    ...record.profileSummaries.flatMap((entry) => entry.values),
  ]);
  if (allValues.some((value) => String(record.expected).endsWith(String(value)))) return "D-leading-dropped";
  if (allValues.some((value) => String(record.expected).startsWith(String(value)))) return "E-trailing-dropped";
  if (allValues.some((value) => String(value).includes(String(record.expected)))) return "G-extra-prefix-suffix";
  if (allValues.some((value) => Math.abs(value - record.expected) <= 9)) return "F-internal-substitution";
  if (/[+＋]/.test(allRaw) && allRaw.length > 20) return "H-merged-with-nearby-text";
  if ((record.cropMetrics?.touchesBorder || record.cropMetrics?.foregroundRatio > 0.3)) return "K-crop-clipping-contamination";
  if (allValues.length) {
    return "L-unavailable-incomplete";
  }
  return "L-unavailable-incomplete";
}

async function processImage({ browser, baseUrl, assetBaseUrl, row, runDir, selectedProfiles, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "bonus-capture-image.json");
  if (resume) {
    try {
      return await loadJson(artifactPath);
    } catch {
      // Regenerate missing artifacts.
    }
  }

  const page = await browser.newPage({ acceptDownloads: true });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
  try {
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, { timeout: 30000 });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad bonus candidate capture.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, { timeout: 30000 });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);

    await page.addScriptTag({ url: `${assetBaseUrl}/tesseract.min.js` });
    const capture = await page.evaluate(
      async ({ profilesToRun, assetBaseUrl: tesseractAssetBaseUrl }) => {
        const parseNumbers = (text = "") => {
          const candidates = [];
          const regex = /(?<!\d)(?:\d{1,3}(?:[,.\s]\d{3})+|\d{5,8})(?!\d)/g;
          for (const match of String(text || "").matchAll(regex)) {
            const raw = match[0] || "";
            const value = Number(raw.replace(/[^\d]/g, ""));
            if (Number.isFinite(value)) candidates.push({ raw, value });
          }
          return candidates;
        };
        const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
        const file = input?.files?.[0];
        if (!file) throw new Error("No uploaded file available inside browser bonus capture.");
        const imageUrl = URL.createObjectURL(file);
        const image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = reject;
          element.src = imageUrl;
        });
        const fields = (window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.fieldPools || [])
          .filter((pool) => pool.fieldType === "bonus")
          .map((pool) => ({
            key: pool.key,
            stage: pool.stage,
            side: pool.side,
            fieldType: pool.fieldType,
            zone: pool.zone,
          }));
        const preprocess = (field, profile) => {
          const padRatio = profile.paddingRatio ?? 0.12;
          const padX = Math.max(2, Math.round(field.zone.width * padRatio));
          const padY = Math.max(2, Math.round(field.zone.height * padRatio));
          const crop = {
            x: Math.max(0, Math.round(field.zone.x - padX)),
            y: Math.max(0, Math.round(field.zone.y - padY)),
            width: Math.max(1, Math.round(field.zone.width + padX * 2)),
            height: Math.max(1, Math.round(field.zone.height + padY * 2)),
          };
          crop.width = Math.min(crop.width, image.naturalWidth - crop.x);
          crop.height = Math.min(crop.height, image.naturalHeight - crop.y);
          const scale = profile.scale || 3;
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(crop.width * scale));
          canvas.height = Math.max(1, Math.round(crop.height * scale));
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.fillStyle = "white";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.imageSmoothingEnabled = profile.smoothing !== "nearest";
          context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;
            let value = gray;
            if (profile.kind === "white-mask") {
              value = max >= (profile.threshold || 176) && saturation < 145 ? 0 : 255;
            } else if (profile.kind === "blue-bonus-mask") {
              value = b > 145 && b > r + 24 && b > g + 8 ? 0 : 255;
            }
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
          }
          let foreground = 0;
          let borderForeground = 0;
          const width = canvas.width;
          const height = canvas.height;
          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const offset = (y * width + x) * 4;
              if (data[offset] < 128) {
                foreground += 1;
                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) borderForeground += 1;
              }
            }
          }
          const metrics = {
            width,
            height,
            cropWidth: crop.width,
            cropHeight: crop.height,
            foregroundRatio: Number((foreground / Math.max(1, width * height)).toFixed(4)),
            touchesBorder: borderForeground > 0,
            borderForeground,
          };
          context.putImageData(imageData, 0, 0);
          return { crop, metrics, canvas };
        };
        const worker = await window.Tesseract.createWorker("eng", 1, {
          workerPath: `${tesseractAssetBaseUrl}/worker.min.js`,
          corePath: `${tesseractAssetBaseUrl}/tesseract-core-simd-lstm.wasm.js`,
          langPath: tesseractAssetBaseUrl,
        });
        const recognizeCanvas = async (canvas, profile) => {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
          const started = performance.now();
          await worker.setParameters({
            tessedit_char_whitelist: profile.digitsOnly ? "0123456789" : "0123456789,.+",
            tessedit_pageseg_mode: profile.pageSegMode || "7",
            preserve_interword_spaces: "1",
          });
          const result = await worker.recognize(blob);
          return {
            rawText: result?.data?.text || "",
            confidence: Number(result?.data?.confidence || 0),
            elapsedMs: Math.round(performance.now() - started),
          };
        };
        const records = [];
        for (const field of fields) {
          const profileResults = [];
          for (const profile of profilesToRun) {
            const { crop, metrics, canvas } = preprocess(field, profile);
            let result;
            try {
              result = await recognizeCanvas(canvas, profile);
            } catch (error) {
              result = { rawText: "", confidence: 0, elapsedMs: 0, error: error?.message || String(error) };
            }
            const parsedCandidates = parseNumbers(result.rawText);
            profileResults.push({
              profileId: profile.id,
              label: profile.label,
              crop,
              metrics,
              rawText: result.rawText,
              confidence: result.confidence,
              elapsedMs: result.elapsedMs,
              parsedCandidates,
              values: [...new Set(parsedCandidates.map((candidate) => candidate.value).filter((value) => value > 0))],
              error: result.error || "",
            });
          }
          records.push({ field, profileResults });
        }
        await worker.terminate();
        URL.revokeObjectURL(imageUrl);
        return {
          schema: "ipad-bonus-candidate-capture-browser-ocr-v1",
          profiles: profilesToRun,
          records,
        };
      },
      { profilesToRun: selectedProfiles, assetBaseUrl }
    );

    const result = {
      image: row.filename,
      clusterId: row.clusterId,
      imagePath: rel(row.imagePath),
      expected: row.expected,
      diagnostics,
      capture,
      consoleMessages,
      pageErrors,
    };
    await writeJson(artifactPath, result);
    return result;
  } finally {
    await page.close();
  }
}

function evaluate(rows, imageResults, selectedProfiles, productionBaseline = null) {
  const bonusFieldRecords = [];
  const parserStats = {
    T0: { fields: 0, expectedPresent: 0, newlyObservedExpected: 0, noiseFields: 0, noiseCandidates: 0 },
    T1: { fields: 0, expectedPresent: 0, newlyObservedExpected: 0, noiseFields: 0, noiseCandidates: 0 },
    T2: { fields: 0, expectedPresent: 0, newlyObservedExpected: 0, noiseFields: 0, noiseCandidates: 0 },
    T3: { fields: 0, expectedPresent: 0, newlyObservedExpected: 0, noiseFields: 0, noiseCandidates: 0 },
  };
  const profileStats = Object.fromEntries(
    selectedProfiles.map((profile) => [
      profile.id,
      {
        profile,
        fields: 0,
        expectedPresent: 0,
        newlyObservedExpected: 0,
        noiseFields: 0,
        noiseCandidates: 0,
        emptyOcrFields: 0,
        errorFields: 0,
        elapsedMs: 0,
      },
    ])
  );
  const stageSideRecords = [];

  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const diagnostics = imageResult?.diagnostics || {};
    const captureByKey = new Map((imageResult?.capture?.records || []).map((record) => [record.field.key, record]));
    for (const stage of stages) {
      for (const side of sides) {
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const finalSide = displayedSide(diagnostics, stage, side);
        const finalComparison = compareSide(finalSide, expected);
        const bonusPool = poolFor(diagnostics, stage, side);
        const productionValuesForField = productionValues(bonusPool);
        const expectedBonus = expected.bonus;
        const productionPresent = expectedBonus === 0 || productionValuesForField.includes(expectedBonus);
        const observedZero = productionValuesForField.includes(0);
        const defaultZeroOnly = expectedBonus === 0 && finalSide.bonus === 0 && !observedZero;
        const rawTexts = rawTextsFromPool(bonusPool);
        const parserVariants = parseAllVariants(rawTexts);
        const parserValues = Object.fromEntries(
          Object.entries(parserVariants).map(([key, entries]) => [key, unique(entries.map((entry) => entry.value))])
        );
        const captureRecord = captureByKey.get(bonusPool?.key || `${row.filename}|${stage}|${side}|bonus|0`);
        const profileSummaries = [];
        for (const profile of selectedProfiles) {
          const stats = profileStats[profile.id];
          const result = (captureRecord?.profileResults || []).find((entry) => entry.profileId === profile.id) || {
            values: [],
            rawText: "",
            elapsedMs: 0,
            confidence: 0,
            error: "missing-profile-result",
          };
          const values = unique((result.values || []).map(toNumber));
          const expectedPresent = expectedBonus === 0 ? values.includes(0) : values.includes(expectedBonus);
          const noiseValues = values.filter((value) => value !== expectedBonus && !productionValuesForField.includes(value));
          stats.fields += 1;
          if (expectedPresent) stats.expectedPresent += 1;
          if (!productionPresent && expectedPresent) stats.newlyObservedExpected += 1;
          if (noiseValues.length) stats.noiseFields += 1;
          stats.noiseCandidates += noiseValues.length;
          if (!String(result.rawText || "").trim()) stats.emptyOcrFields += 1;
          if (result.error) stats.errorFields += 1;
          stats.elapsedMs += Number(result.elapsedMs || 0);
          profileSummaries.push({
            profileId: profile.id,
            rawText: result.rawText || "",
            confidence: Number(result.confidence || 0),
            elapsedMs: Number(result.elapsedMs || 0),
            values,
            expectedPresent,
            newlyObservedExpected: !productionPresent && expectedPresent,
            noiseValues,
            metrics: result.metrics || null,
            error: result.error || "",
          });
        }
        const record = {
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          expected,
          expectedBonus,
          final: finalSide,
          finalPass: finalComparison.pass,
          bonusPass: finalComparison.bonusPass,
          expectedIsZero: expectedBonus === 0,
          observedZero,
          defaultZeroOnly,
          productionValues: productionValuesForField,
          productionPresent,
          rawTexts,
          parserVariants,
          parserValues,
          profileSummaries,
          cropMetrics: profileSummaries[0]?.metrics || null,
        };
        record.zeroTaxonomy =
          expectedBonus !== 0
            ? ""
            : finalSide.bonus === 0
              ? defaultZeroOnly
                ? "selected-zero-by-default-only"
                : "selected-zero-with-observed-zero-or-empty"
              : "wrong-nonzero-or-noise-selected";
        record.nonzeroTaxonomy =
          expectedBonus === 0
            ? ""
            : finalSide.bonus === expectedBonus
              ? "selected-exact"
              : productionValuesForField.includes(expectedBonus)
                ? "exact-present-unselected"
                : classifyMissingBonus(record);
        record.taxonomy = expectedBonus === 0 ? record.zeroTaxonomy : record.nonzeroTaxonomy;
        bonusFieldRecords.push(record);

        parserStats.T0.fields += 1;
        if (productionPresent) parserStats.T0.expectedPresent += 1;
        for (const key of ["T1", "T2", "T3"]) {
          const values = parserValues[key] || [];
          const expectedPresent = expectedBonus === 0 ? values.includes(0) : values.includes(expectedBonus);
          const noiseValues = values.filter((value) => value !== expectedBonus && !productionValuesForField.includes(value));
          parserStats[key].fields += 1;
          if (expectedPresent) parserStats[key].expectedPresent += 1;
          if (!productionPresent && expectedPresent) parserStats[key].newlyObservedExpected += 1;
          if (noiseValues.length) parserStats[key].noiseFields += 1;
          parserStats[key].noiseCandidates += noiseValues.length;
        }

        const bonusCandidateSets = {
          T0: productionValuesForField,
          T0_T1: unique([...productionValuesForField, ...(parserValues.T1 || [])]),
          T0_T2: unique([...productionValuesForField, ...(parserValues.T2 || [])]),
          T0_T3: unique([...productionValuesForField, ...(parserValues.T3 || [])]),
          T0_all_parser: unique([...productionValuesForField, ...(parserValues.T1 || []), ...(parserValues.T2 || []), ...(parserValues.T3 || [])]),
        };
        for (const profile of profileSummaries) {
          bonusCandidateSets[`T0_${profile.profileId}`] = unique([...productionValuesForField, ...profile.values]);
        }
        const selectedMembersExact = finalComparison.membersPass;
        const selectedTotalExact = finalComparison.totalPass;
        const addressableBy = Object.entries(bonusCandidateSets)
          .filter(([, values]) => values.includes(expectedBonus))
          .map(([source]) => source);
        stageSideRecords.push({
          image: row.filename,
          stage,
          side,
          finalPass: finalComparison.pass,
          selectedMembersExact,
          selectedBonusExact: finalComparison.bonusPass,
          selectedTotalExact,
          expected,
          final: finalSide,
          addressableBy,
          bonusMissingInProduction: !productionPresent,
          potentiallyAddressableByBonusOnly:
            !finalComparison.pass && selectedMembersExact && selectedTotalExact && !finalComparison.bonusPass && addressableBy.length > 0,
        });
      }
    }
  }

  const taxonomyCounts = {};
  for (const record of bonusFieldRecords.filter((entry) => !entry.productionPresent)) {
    taxonomyCounts[record.taxonomy] = (taxonomyCounts[record.taxonomy] || 0) + 1;
  }

  const profileSummaries = Object.values(profileStats).map((entry) => ({
    ...entry,
    expectedPresentPct: pct(entry.expectedPresent, entry.fields),
    newlyObservedExpectedPct: pct(entry.newlyObservedExpected, entry.fields),
    noiseFieldPct: pct(entry.noiseFields, entry.fields),
    averageMs: entry.fields ? Math.round(entry.elapsedMs / entry.fields) : 0,
    recommendation:
      entry.newlyObservedExpected >= 2 && entry.noiseFieldPct <= 20 && entry.averageMs <= 3000
        ? "candidate for follow-up"
        : "reject/defer",
  }));

  const parserSummaries = Object.fromEntries(
    Object.entries(parserStats).map(([key, entry]) => [
      key,
      {
        ...entry,
        expectedPresentPct: pct(entry.expectedPresent, entry.fields),
        newlyObservedExpectedPct: pct(entry.newlyObservedExpected, entry.fields),
        noiseFieldPct: pct(entry.noiseFields, entry.fields),
      },
    ])
  );

  const combinations = [];
  for (const key of ["T1", "T2", "T3"]) {
    combinations.push(evaluateCombination(bonusFieldRecords, [`parser:${key}`]));
  }
  for (const profile of selectedProfiles) {
    combinations.push(evaluateCombination(bonusFieldRecords, [`profile:${profile.id}`]));
  }
  combinations.push(evaluateCombination(bonusFieldRecords, ["parser:T1", "parser:T2", "parser:T3"]));
  combinations.sort((a, b) => {
    if (b.newExpectedFields !== a.newExpectedFields) return b.newExpectedFields - a.newExpectedFields;
    if (a.noiseFields !== b.noiseFields) return a.noiseFields - b.noiseFields;
    return a.sources.join(",").localeCompare(b.sources.join(","));
  });

  const addressableSides = stageSideRecords.filter((entry) => entry.potentiallyAddressableByBonusOnly);
  const tierCSimulation = {
    diagnosticsOnly: true,
    note: "This is not a recovery. It counts rows where final members and total are already exact, the final bonus is wrong, and exact bonus evidence appears in a parser/profile variant.",
    potentialTp: addressableSides.length,
    potentialFp: 0,
    blocked: stageSideRecords.filter((entry) => !entry.finalPass).length - addressableSides.length,
    accepted: addressableSides,
  };

  return {
    schema: "ipad-bonus-candidate-capture-investigation-summary-v1",
    totalImages: rows.length,
    totalFields: bonusFieldRecords.length,
    productionBaseline,
    productionBonusCoverage: bonusFieldRecords.filter((record) => record.productionPresent).length,
    productionBonusCoveragePct: pct(bonusFieldRecords.filter((record) => record.productionPresent).length, bonusFieldRecords.length),
    zeroBonusFields: bonusFieldRecords.filter((record) => record.expectedIsZero).length,
    nonzeroBonusFields: bonusFieldRecords.filter((record) => !record.expectedIsZero).length,
    selectedExactNonzeroBonus: bonusFieldRecords.filter((record) => !record.expectedIsZero && record.final.bonus === record.expectedBonus).length,
    exactNonzeroBonusPresent: bonusFieldRecords.filter((record) => !record.expectedIsZero && record.productionValues.includes(record.expectedBonus)).length,
    parserSummaries,
    profileSummaries,
    combinations: combinations.slice(0, 20),
    taxonomyCounts,
    bonusFieldRecords,
    stageSideRecords,
    addressableSides,
    tierCSimulation,
    recommendation: recommend(profileSummaries, parserSummaries, tierCSimulation),
  };
}

function evaluateCombination(records, sources) {
  let observed = 0;
  let newExpectedFields = 0;
  let noiseFields = 0;
  let noiseCandidates = 0;
  for (const record of records) {
    const values = new Set(record.productionValues);
    let hasNoise = false;
    for (const source of sources) {
      const [type, id] = source.split(":");
      const extraValues =
        type === "parser"
          ? record.parserValues[id] || []
          : record.profileSummaries.find((entry) => entry.profileId === id)?.values || [];
      for (const value of extraValues) {
        if (!record.productionValues.includes(value) && value !== record.expectedBonus) {
          hasNoise = true;
          noiseCandidates += 1;
        }
        values.add(value);
      }
    }
    if (values.has(record.expectedBonus)) observed += 1;
    if (!record.productionPresent && values.has(record.expectedBonus)) newExpectedFields += 1;
    if (hasNoise) noiseFields += 1;
  }
  return {
    sources,
    observedBonusFields: observed,
    newExpectedFields,
    noiseFields,
    noiseCandidates,
    observedCoveragePct: pct(observed, records.length),
  };
}

function recommend(profileSummaries, parserSummaries, tierCSimulation) {
  const candidates = [
    ...Object.entries(parserSummaries)
      .filter(([key]) => key !== "T0")
      .map(([id, summary]) => ({ source: id, ...summary, runtime: 0 })),
    ...profileSummaries.map((summary) => ({
      source: summary.profile.id,
      newlyObservedExpected: summary.newlyObservedExpected,
      noiseFields: summary.noiseFields,
      noiseCandidates: summary.noiseCandidates,
      noiseFieldPct: summary.noiseFieldPct,
      runtime: summary.averageMs,
    })),
  ].sort((a, b) => {
    if (b.newlyObservedExpected !== a.newlyObservedExpected) return b.newlyObservedExpected - a.newlyObservedExpected;
    if (a.noiseFields !== b.noiseFields) return a.noiseFields - b.noiseFields;
    return a.runtime - b.runtime;
  });
  const best = candidates[0] || null;
  if (!best || best.newlyObservedExpected < 2 || best.noiseFieldPct > 20) {
    return {
      recommendation: "none",
      reason: "No parser/profile variant added at least two exact expected bonus candidates while keeping new noise low.",
      nextProductionExperiment: "Defer bonus capture production changes; use this artifact to target narrower crop/parser work.",
    };
  }
  return {
    recommendation: best.source,
    reason: `${best.source} adds ${best.newlyObservedExpected} exact expected bonuses with ${best.noiseFields} noisy fields. Tier-C bonus-only potential TP=${tierCSimulation.potentialTp}.`,
    nextProductionExperiment:
      "Runner/browser parity for a diagnostic-only bonus-evidence proposal would be justified only if the accepted rows have unchanged exact members and total.",
  };
}

async function runOnce({ runIndex, runDir, browser, baseUrl, assetBaseUrl, rows, selectedProfiles, resume }) {
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad bonus candidate capture run ${runIndex}] ${row.filename}`);
    imageResults.push(await processImage({ browser, baseUrl, assetBaseUrl, row, runDir, selectedProfiles, resume }));
  }
  return imageResults;
}

async function loadProductionBaseline() {
  try {
    const combined = await loadJson(path.join(productionVerificationDir, "combined-summary.json"));
    return combined;
  } catch {
    return null;
  }
}

function validateProductionBaseline(baseline) {
  const run = baseline?.runs?.[0] || null;
  if (!run) return { pass: false, reason: "missing-production-baseline" };
  const pass =
    baseline.runs.every(
      (entry) =>
        entry.imagesProcessed === 18 &&
        entry.stageSidePass === 44 &&
        entry.productionApplications === 28 &&
        entry.tp === 28 &&
        entry.fp === 0
    ) &&
    Number(baseline.stability?.stableApplicationRows || 0) === 28 &&
    Number(baseline.stability?.applicationRows || 0) === 28;
  return { pass, reason: pass ? "ok" : "production-baseline-did-not-match-required-values" };
}

function compareRunStability(runSummaries) {
  if (runSummaries.length < 2) return { comparedRuns: runSummaries.length, stable: true, mismatches: [] };
  const signature = (summary) =>
    JSON.stringify(
      summary.bonusFieldRecords.map((record) => ({
        image: record.image,
        stage: record.stage,
        side: record.side,
        productionValues: record.productionValues,
        parserValues: record.parserValues,
        profileValues: Object.fromEntries(record.profileSummaries.map((entry) => [entry.profileId, entry.values])),
      }))
    );
  const baseline = signature(runSummaries[0]);
  const mismatches = runSummaries.slice(1).flatMap((summary, index) =>
    signature(summary) === baseline ? [] : [{ runIndex: index + 2, reason: "candidate-signature-differs-from-run-1" }]
  );
  return { comparedRuns: runSummaries.length, stable: mismatches.length === 0, mismatches };
}

async function writeTopLevelArtifacts(summary, runStability) {
  const failureTaxonomy = {
    bonusRecognitionFailures: summary.bonusFieldRecords.filter((record) => !record.productionPresent).length,
    taxonomyCounts: summary.taxonomyCounts,
    records: summary.bonusFieldRecords
      .filter((record) => !record.productionPresent)
      .map(({ image, stage, side, expectedBonus, productionValues, taxonomy, parserValues, profileSummaries }) => ({
        image,
        stage,
        side,
        expectedBonus,
        productionValues,
        taxonomy,
        parserValues,
        profileValues: Object.fromEntries(profileSummaries.map((entry) => [entry.profileId, entry.values])),
      })),
  };
  const parserOpportunities = {
    parserSummaries: summary.parserSummaries,
    combinations: summary.combinations.filter((entry) => entry.sources.some((source) => source.startsWith("parser:"))),
  };
  const profileResults = {
    profileSummaries: summary.profileSummaries,
    combinations: summary.combinations.filter((entry) => entry.sources.some((source) => source.startsWith("profile:"))),
  };
  const candidateNoise = {
    parserNoise: summary.parserSummaries,
    profileNoise: summary.profileSummaries.map((entry) => ({
      profileId: entry.profile.id,
      noiseFields: entry.noiseFields,
      noiseCandidates: entry.noiseCandidates,
      noiseFieldPct: entry.noiseFieldPct,
    })),
  };
  await writeJson(path.join(artifactDir, "production-baseline.json"), summary.productionBaseline || {});
  await writeJson(path.join(artifactDir, "bonus-field-audit.json"), summary.bonusFieldRecords);
  await writeJson(path.join(artifactDir, "failure-taxonomy.json"), failureTaxonomy);
  await writeJson(path.join(artifactDir, "parser-opportunities.json"), parserOpportunities);
  await writeJson(path.join(artifactDir, "profile-results.json"), profileResults);
  await writeJson(path.join(artifactDir, "candidate-noise.json"), candidateNoise);
  await writeJson(path.join(artifactDir, "addressable-sides.json"), summary.addressableSides);
  await writeJson(path.join(artifactDir, "tier-c-simulation.json"), summary.tierCSimulation);
  await writeJson(path.join(artifactDir, "run-stability.json"), runStability);
  await writeJson(path.join(artifactDir, "recommendation.json"), summary.recommendation);
  await writeJson(path.join(artifactDir, "summary.json"), summary);
}

async function main() {
  const args = parseArgs();
  const selectedProfiles = args.profileIds.length
    ? profiles.filter((profile) => args.profileIds.includes(profile.id))
    : profiles;
  if (!selectedProfiles.length) throw new Error(`No matching bonus profiles for: ${args.profileIds.join(",")}`);
  if (!args.resume) await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });

  const productionBaseline = await loadProductionBaseline();
  const baselineCheck = validateProductionBaseline(productionBaseline);
  if (!baselineCheck.pass) {
    throw new Error(`Required iPad production baseline was not confirmed: ${baselineCheck.reason}`);
  }

  const rows = await collectFixtures();
  const playwright = await loadPlaywright();
  const port = args.baseUrl ? null : args.port || (await findFreePort());
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;
  let appServer = null;
  const assetServer = await startTesseractAssetServer();
  if (!(await isServerReady(baseUrl))) {
    appServer = startDevServer(port);
    await waitForServer(baseUrl);
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const runSummaries = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      const runDir = path.join(artifactDir, `run-${runIndex}`);
      const imageResults = await runOnce({
        runIndex,
        runDir,
        browser,
        baseUrl,
        assetBaseUrl: assetServer.baseUrl,
        rows,
        selectedProfiles,
        resume: args.resume,
      });
      const summary = evaluate(rows, imageResults, selectedProfiles, productionBaseline);
      await writeJson(path.join(runDir, "summary.json"), summary);
      await writeJson(path.join(runDir, "bonus-field-records.json"), summary.bonusFieldRecords);
      runSummaries.push(summary);
    }
    const runStability = compareRunStability(runSummaries);
    const latest = runSummaries.at(-1);
    await writeTopLevelArtifacts(latest, runStability);
    const consoleSummary = {
      command: "node scripts/ipad-bonus-candidate-capture-investigation.mjs",
      artifactDir: rel(artifactDir),
      runs: args.runs,
      totalFields: latest.totalFields,
      productionBonusCoverage: latest.productionBonusCoverage,
      productionBonusCoveragePct: latest.productionBonusCoveragePct,
      zeroBonusFields: latest.zeroBonusFields,
      nonzeroBonusFields: latest.nonzeroBonusFields,
      exactNonzeroBonusPresent: latest.exactNonzeroBonusPresent,
      parserSummaries: latest.parserSummaries,
      profileSummaries: latest.profileSummaries.map((entry) => ({
        profileId: entry.profile.id,
        expectedPresent: entry.expectedPresent,
        newlyObservedExpected: entry.newlyObservedExpected,
        noiseFields: entry.noiseFields,
        noiseCandidates: entry.noiseCandidates,
        averageMs: entry.averageMs,
        recommendation: entry.recommendation,
      })),
      taxonomyCounts: latest.taxonomyCounts,
      tierCSimulation: latest.tierCSimulation,
      runStability,
      recommendation: latest.recommendation,
    };
    console.log(JSON.stringify(consoleSummary, null, 2));
    if (!runStability.stable) process.exitCode = 1;
  } finally {
    await browser.close();
    await assetServer.close();
    await writeJson(
      path.join(artifactDir, "dev-server.log.json"),
      appServer?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }]
    );
    await stopDevServer(appServer);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
