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
const artifactDir = path.join(rootDir, "tmp", "ipad-member2-left-edge-investigation");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];

const cropVariants = [
  { id: "prod-pad12", label: "production-equivalent symmetric 12%", padRatio: 0.12, leftDelta: 0, rightDelta: 0, default: true },
  { id: "sym-minus-2", label: "symmetric padding -2px", padRatio: 0.12, leftDelta: -2, rightDelta: -2, default: true },
  { id: "sym-minus-3", label: "symmetric padding -3px", padRatio: 0.12, leftDelta: -3, rightDelta: -3 },
  { id: "left-minus-2", label: "left padding -2px", padRatio: 0.12, leftDelta: -2, rightDelta: 0, default: true },
  { id: "left-minus-4", label: "left padding -4px", padRatio: 0.12, leftDelta: -4, rightDelta: 0, default: true },
  { id: "left-minus-6", label: "left padding -6px", padRatio: 0.12, leftDelta: -6, rightDelta: 0, default: true },
  { id: "right-minus-2", label: "right padding -2px", padRatio: 0.12, leftDelta: 0, rightDelta: -2 },
  { id: "left-minus-4-right-plus-1", label: "left -4px, right +1px", padRatio: 0.12, leftDelta: -4, rightDelta: 1, default: true },
  { id: "left-minus-6-right-plus-2", label: "left -6px, right +2px", padRatio: 0.12, leftDelta: -6, rightDelta: 2, default: true },
  { id: "prev-pad06", label: "previous best symmetric 6%", padRatio: 0.06, leftDelta: 0, rightDelta: 0, default: true },
  { id: "norm-minus-1pct", label: "layout-normalized -1% width", padRatio: 0.12, leftDeltaRatio: -0.01, rightDeltaRatio: -0.01 },
  { id: "norm-left-minus-2pct", label: "layout-normalized left -2% width", padRatio: 0.12, leftDeltaRatio: -0.02, rightDelta: 0 },
];

const profiles = [
  { id: "prod-like-3x", label: "production-like score preprocessing 3x", kind: "prod-like", scale: 3, default: true },
  { id: "white-mask-3x", label: "white-mask 3x PSM7", kind: "white-mask", scale: 3, threshold: 176, default: true },
];

function parseArgs() {
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  const runIndex = process.argv.indexOf("--runs");
  const variantIndex = process.argv.indexOf("--variants");
  return {
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_MEMBER2_LEFT_EDGE_BASE_URL || "",
    runs: Math.max(1, Number(runIndex >= 0 ? process.argv[runIndex + 1] || 2 : process.env.IPAD_MEMBER2_LEFT_EDGE_RUNS || 2)),
    resume: process.argv.includes("--resume"),
    fullMatrix: process.argv.includes("--full-matrix"),
    variantIds:
      variantIndex >= 0
        ? String(process.argv[variantIndex + 1] || "")
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
  return [...new Set(values)];
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function loadPlaywright() {
  try {
    return requireFromHere("playwright");
  } catch (error) {
    const configuredModuleDir = process.env.PLAYWRIGHT_NODE_MODULES;
    if (configuredModuleDir) return createRequire(path.join(path.resolve(rootDir, configuredModuleDir), "noop.js"))("playwright");
    throw error;
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
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
    const routes = {
      "/tesseract.min.js": path.join(distDir, "tesseract.min.js"),
      "/worker.min.js": path.join(distDir, "worker.min.js"),
      "/tesseract-core-simd-lstm.wasm.js": path.join(coreDir, "tesseract-core-simd-lstm.wasm.js"),
      "/tesseract-core-simd-lstm.wasm": path.join(coreDir, "tesseract-core-simd-lstm.wasm"),
      "/eng.traineddata": path.join(rootDir, "eng.traineddata"),
    };
    const filePath = routes[url.pathname];
    if (!filePath || !fsSync.existsSync(filePath)) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, { "content-type": contentType(filePath), "access-control-allow-origin": "*" });
    fsSync.createReadStream(filePath).pipe(response);
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(resolve)) };
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

function expectedMember(expected, stage, side) {
  const stageData = expected?.[`stage${stage}`] || {};
  const members = side === "self" ? stageData.selfMembers || [] : stageData.enemyMembers || [];
  return Number(members[1] || 0);
}

function poolFor(diagnostics, stage, side) {
  return (
    diagnostics?.stages?.[`stage${stage}`]?.[side]?.fieldCandidatePools?.member2 ||
    (diagnostics?.fieldPools || []).find((pool) => pool.stage === stage && pool.side === side && pool.fieldType === "member" && pool.slot === 2) ||
    null
  );
}

function selectedMember2(diagnostics, stage, side) {
  return toNumber(diagnostics?.stages?.[`stage${stage}`]?.[side]?.currentPrimary?.members?.[1]);
}

function productionValues(pool) {
  return unique((pool?.candidates || []).map((candidate) => toNumber(candidate.value)).filter((value) => value > 0));
}

async function processImage({ browser, baseUrl, assetBaseUrl, row, runDir, variants, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "left-edge-image.json");
  if (resume) {
    try {
      return await loadJson(artifactPath);
    } catch {
      // Regenerate incomplete artifacts.
    }
  }
  const page = await browser.newPage({ acceptDownloads: true });
  try {
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, { timeout: 30000 });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, { timeout: 30000 });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    await page.addScriptTag({ url: `${assetBaseUrl}/tesseract.min.js` });
    const capture = await page.evaluate(
      async ({ variantsToRun, assetBaseUrl: tesseractAssetBaseUrl }) => {
        const parseNumbers = (text = "") => {
          const out = [];
          const regex = /[+・・]?\s*(?:\d{1,3}(?:[,.\s]\d{3})+|\d{1,8})/g;
          for (const match of text.matchAll(regex)) {
            const raw = match[0] || "";
            const value = Number(raw.replace(/[^\d-]/g, ""));
            if (Number.isInteger(value)) out.push({ raw, value });
          }
          return out;
        };
        const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
        const file = input?.files?.[0];
        const imageUrl = URL.createObjectURL(file);
        const image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = reject;
          element.src = imageUrl;
        });
        const fields = (window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.fieldPools || [])
          .filter((pool) => pool.fieldType === "member" && pool.slot === 2)
          .map((pool) => ({ key: pool.key, stage: pool.stage, side: pool.side, slot: pool.slot, zone: pool.zone }));

        const makeCrop = (zone, variant) => {
          const basePadX = Math.max(1, Math.round(zone.width * variant.padRatio));
          const basePadY = Math.max(1, Math.round(zone.height * 0.12));
          const ratioLeft = Math.round(zone.width * (variant.leftDeltaRatio || 0));
          const ratioRight = Math.round(zone.width * (variant.rightDeltaRatio || 0));
          const leftPad = Math.max(0, basePadX + (variant.leftDelta || 0) + ratioLeft);
          const rightPad = Math.max(0, basePadX + (variant.rightDelta || 0) + ratioRight);
          const x = Math.max(0, Math.round(zone.x - leftPad));
          const y = Math.max(0, Math.round(zone.y - basePadY));
          const right = Math.min(image.naturalWidth, Math.round(zone.x + zone.width + rightPad));
          const bottom = Math.min(image.naturalHeight, Math.round(zone.y + zone.height + basePadY));
          return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y), leftPad, rightPad, basePadX, basePadY };
        };

        const measureComponents = (canvas) => {
          const context = canvas.getContext("2d", { willReadFrequently: true });
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const width = canvas.width;
          const height = canvas.height;
          const foreground = new Uint8Array(width * height);
          const marks = { left5: 0, left10: 0, left15: 0, right5: 0, right10: 0, right15: 0 };
          let total = 0;
          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const i = (y * width + x) * 4;
              const max = Math.max(data[i], data[i + 1], data[i + 2]);
              const min = Math.min(data[i], data[i + 1], data[i + 2]);
              const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
              if (!(max >= 168 && max - min < 155 && gray >= 130)) continue;
              foreground[y * width + x] = 1;
              total += 1;
              if (x < width * 0.05) marks.left5 += 1;
              if (x < width * 0.1) marks.left10 += 1;
              if (x < width * 0.15) marks.left15 += 1;
              if (x >= width * 0.95) marks.right5 += 1;
              if (x >= width * 0.9) marks.right10 += 1;
              if (x >= width * 0.85) marks.right15 += 1;
            }
          }
          const seen = new Uint8Array(width * height);
          const components = [];
          const stack = [];
          for (let idx = 0; idx < foreground.length; idx += 1) {
            if (!foreground[idx] || seen[idx]) continue;
            let minX = width;
            let minY = height;
            let maxX = -1;
            let maxY = -1;
            let pixels = 0;
            seen[idx] = 1;
            stack.push(idx);
            while (stack.length) {
              const current = stack.pop();
              const x = current % width;
              const y = Math.floor(current / width);
              pixels += 1;
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
              for (const next of [current - 1, current + 1, current - width, current + width]) {
                if (next < 0 || next >= foreground.length) continue;
                const nx = next % width;
                const ny = Math.floor(next / width);
                if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
                if (!foreground[next] || seen[next]) continue;
                seen[next] = 1;
                stack.push(next);
              }
            }
            components.push({
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
              pixels,
              touchesLeft: minX === 0,
              touchesRight: maxX === width - 1,
            });
          }
          const large = components.filter((c) => c.pixels >= 8).sort((a, b) => b.pixels - a.pixels);
          const main = large[0] || null;
          const outsideMain = main
            ? large.filter((c) => c !== main && (c.x + c.width < main.x || c.x > main.x + main.width)).length
            : 0;
          const leftGap = main ? main.x : 0;
          return {
            foregroundRatio: Number((total / Math.max(1, width * height)).toFixed(4)),
            edgeForeground: Object.fromEntries(Object.entries(marks).map(([key, value]) => [key, total ? Number((value / total).toFixed(4)) : 0])),
            componentCount: components.length,
            leftBorderComponentCount: components.filter((c) => c.touchesLeft).length,
            rightBorderComponentCount: components.filter((c) => c.touchesRight).length,
            components: components.sort((a, b) => a.x - b.x).slice(0, 20),
            mainComponent: main,
            leftGapToMain: leftGap,
            outsideMainComponentCount: outsideMain,
          };
        };

        const renderCrop = (field, variant, profile) => {
          const crop = makeCrop(field.zone, variant);
          const scale = profile.scale || 3;
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(crop.width * scale));
          canvas.height = Math.max(1, Math.round(crop.height * scale));
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.fillStyle = "white";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
          const rawDataUrl = canvas.toDataURL("image/png");
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;
            let value;
            if (profile.kind === "prod-like") {
              value = Math.max(0, Math.min(255, (gray - 118) * 1.9 + 128));
              value = value > 154 && saturation < 150 ? 0 : 255;
            } else {
              value = max >= (profile.threshold || 176) && saturation < 145 ? 0 : 255;
            }
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
          }
          context.putImageData(imageData, 0, 0);
          return { crop, canvas, rawDataUrl, processedDataUrl: canvas.toDataURL("image/png") };
        };

        const worker = await window.Tesseract.createWorker("eng", 1, {
          workerPath: `${tesseractAssetBaseUrl}/worker.min.js`,
          corePath: `${tesseractAssetBaseUrl}/tesseract-core-simd-lstm.wasm.js`,
          langPath: tesseractAssetBaseUrl,
        });
        await worker.setParameters({ tessedit_char_whitelist: "0123456789,.", preserve_interword_spaces: "1" });
        const recognize = async (canvas) => {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
          const started = performance.now();
          await worker.setParameters({ tessedit_char_whitelist: "0123456789,.", tessedit_pageseg_mode: "7", preserve_interword_spaces: "1" });
          const result = await worker.recognize(blob);
          return { rawText: result?.data?.text || "", confidence: Number(result?.data?.confidence || 0), elapsedMs: Math.round(performance.now() - started) };
        };

        const records = [];
        for (const field of fields) {
          const originalCrop = makeCrop(field.zone, { padRatio: 0.12, leftDelta: 0, rightDelta: 0 });
          const rawMeasureCanvas = document.createElement("canvas");
          rawMeasureCanvas.width = field.zone.width;
          rawMeasureCanvas.height = field.zone.height;
          rawMeasureCanvas.getContext("2d", { willReadFrequently: true }).drawImage(image, field.zone.x, field.zone.y, field.zone.width, field.zone.height, 0, 0, field.zone.width, field.zone.height);
          const cropMetrics = measureComponents(rawMeasureCanvas);
          const variantResults = [];
          for (const variant of variantsToRun) {
            for (const profile of variant.profiles) {
              const rendered = renderCrop(field, variant, profile);
              let ocr;
              try {
                ocr = await recognize(rendered.canvas);
              } catch (error) {
                ocr = { rawText: "", confidence: 0, elapsedMs: 0, error: error?.message || String(error) };
              }
              const candidates = parseNumbers(ocr.rawText);
              variantResults.push({
                variantId: variant.id,
                variantLabel: variant.label,
                profileId: profile.id,
                profileLabel: profile.label,
                crop: rendered.crop,
                rawText: ocr.rawText,
                confidence: ocr.confidence,
                elapsedMs: ocr.elapsedMs,
                parsedCandidates: candidates,
                values: [...new Set(candidates.map((candidate) => candidate.value).filter((value) => value > 0))],
                candidateLengths: [...new Set(candidates.map((candidate) => String(candidate.value).length))],
                multipleNumericGroups: candidates.length > 1,
                appearsConcatenated: candidates.some((candidate) => String(candidate.value).length >= 7),
                error: ocr.error || "",
              });
            }
          }
          records.push({ field, originalCrop, cropMetrics, variantResults });
        }
        await worker.terminate();
        URL.revokeObjectURL(imageUrl);
        return { schema: "ipad-member2-left-edge-browser-capture-v1", records };
      },
      { variantsToRun: variants, assetBaseUrl }
    );
    const result = { image: row.filename, clusterId: row.clusterId, imagePath: rel(row.imagePath), expected: row.expected, diagnostics, capture };
    await fs.mkdir(imageDir, { recursive: true });
    await fs.writeFile(artifactPath, JSON.stringify(result, null, 2));
    return result;
  } finally {
    await page.close();
  }
}

function evaluate(runResults, rows, variants) {
  const fields = [];
  for (const row of rows) {
    const imageResult = runResults.find((result) => result.image === row.filename);
    const diagnostics = imageResult?.diagnostics || {};
    const byKey = new Map((imageResult?.capture?.records || []).map((record) => [record.field.key, record]));
    for (const stage of stages) {
      for (const side of sides) {
        const expected = expectedMember(row.expected, stage, side);
        const pool = poolFor(diagnostics, stage, side);
        const selected = selectedMember2(diagnostics, stage, side);
        const production = productionValues(pool);
        const key = pool?.key || `${row.filename}|${stage}|${side}|member|2`;
        const capture = byKey.get(key);
        fields.push({
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          expected,
          selected,
          productionValues: production,
          productionPresent: production.includes(expected),
          selectedExact: selected === expected,
          cropMetrics: capture?.cropMetrics || null,
          originalCrop: capture?.originalCrop || null,
          variants: capture?.variantResults || [],
        });
      }
    }
  }
  const variantStats = [];
  for (const variant of variants) {
    for (const profile of variant.profiles) {
      const id = `${variant.id}__${profile.id}`;
      const records = fields.map((field) => ({
        field,
        result: field.variants.find((result) => result.variantId === variant.id && result.profileId === profile.id) || { values: [], rawText: "", elapsedMs: 0 },
      }));
      const newExpected = records.filter(({ field, result }) => !field.productionPresent && (result.values || []).includes(field.expected));
      const lostEvidence = records.filter(({ field, result }) => field.productionPresent && !(result.values || []).includes(field.expected));
      const noiseRecords = records.filter(({ field, result }) => (result.values || []).some((value) => value !== field.expected && !field.productionValues.includes(value)));
      const countIncreased = records.filter(({ field, result }) => (result.values || []).length > field.productionValues.length).length;
      const countDecreased = records.filter(({ field, result }) => (result.values || []).length < field.productionValues.length).length;
      const byStage = {};
      const byCluster = {};
      for (const stage of stages) {
        const subset = records.filter(({ field }) => field.stage === stage);
        byStage[`stage${stage}`] = summarizeSubset(subset);
      }
      for (const cluster of unique(fields.map((field) => field.clusterId))) {
        byCluster[cluster] = summarizeSubset(records.filter(({ field }) => field.clusterId === cluster));
      }
      variantStats.push({
        id,
        variantId: variant.id,
        profileId: profile.id,
        cropRule: variant.label,
        profile: profile.label,
        fields: records.length,
        newlyObservedExpectedFields: newExpected.length,
        observedWithProduction: fields.filter((field) => field.productionPresent).length + newExpected.length,
        candidateNoiseFields: noiseRecords.length,
        candidateNoiseValues: records.reduce(
          (sum, { field, result }) => sum + (result.values || []).filter((value) => value !== field.expected && !field.productionValues.includes(value)).length,
          0
        ),
        evidenceLossFields: lostEvidence.length,
        candidateCountIncreaseFields: countIncreased,
        candidateCountDecreaseFields: countDecreased,
        simulatedOutputFpFields: records.filter(({ field, result }) => !field.selectedExact && (result.values || [])[0] && (result.values || [])[0] !== field.expected).length,
        averageMs: Math.round(records.reduce((sum, { result }) => sum + Number(result.elapsedMs || 0), 0) / Math.max(1, records.length)),
        byStage,
        byCluster,
        newExpectedFields: newExpected.map(({ field }) => ({ image: field.image, stage: field.stage, side: field.side, expected: field.expected })),
      });
    }
  }
  variantStats.sort((a, b) => {
    if (b.newlyObservedExpectedFields !== a.newlyObservedExpectedFields) return b.newlyObservedExpectedFields - a.newlyObservedExpectedFields;
    if (a.candidateNoiseFields !== b.candidateNoiseFields) return a.candidateNoiseFields - b.candidateNoiseFields;
    return a.averageMs - b.averageMs;
  });
  const productionPresent = fields.filter((field) => field.productionPresent).length;
  return {
    fields,
    production: {
      member2Fields: fields.length,
      candidatePresent: productionPresent,
      candidatePresentPct: pct(productionPresent, fields.length),
      selectedExact: fields.filter((field) => field.selectedExact).length,
      selectedExactPct: pct(fields.filter((field) => field.selectedExact).length, fields.length),
      stage3CandidatePresent: fields.filter((field) => field.stage === 3 && field.productionPresent).length,
    },
    contamination: summarizeContamination(fields),
    variantStats,
  };
}

function summarizeSubset(records) {
  return {
    fields: records.length,
    newExpected: records.filter(({ field, result }) => !field.productionPresent && (result.values || []).includes(field.expected)).length,
    noiseFields: records.filter(({ field, result }) => (result.values || []).some((value) => value !== field.expected && !field.productionValues.includes(value))).length,
    evidenceLoss: records.filter(({ field, result }) => field.productionPresent && !(result.values || []).includes(field.expected)).length,
  };
}

function summarizeContamination(fields) {
  const byStage = {};
  for (const stage of stages) {
    const subset = fields.filter((field) => field.stage === stage);
    byStage[`stage${stage}`] = contaminationMetrics(subset);
  }
  return { all: contaminationMetrics(fields), byStage };
}

function avg(values) {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : 0;
}

function contaminationMetrics(fields) {
  const metrics = fields.map((field) => field.cropMetrics).filter(Boolean);
  return {
    fields: fields.length,
    left5: avg(metrics.map((m) => m.edgeForeground.left5)),
    left10: avg(metrics.map((m) => m.edgeForeground.left10)),
    left15: avg(metrics.map((m) => m.edgeForeground.left15)),
    right5: avg(metrics.map((m) => m.edgeForeground.right5)),
    right10: avg(metrics.map((m) => m.edgeForeground.right10)),
    right15: avg(metrics.map((m) => m.edgeForeground.right15)),
    leftBorderComponentRatePct: pct(metrics.filter((m) => m.leftBorderComponentCount > 0).length, metrics.length),
    rightBorderComponentRatePct: pct(metrics.filter((m) => m.rightBorderComponentCount > 0).length, metrics.length),
    componentCountAvg: avg(metrics.map((m) => m.componentCount)),
    outsideMainComponentAvg: avg(metrics.map((m) => m.outsideMainComponentCount)),
    leftGapToMainAvg: avg(metrics.map((m) => m.leftGapToMain)),
  };
}

function compareRuns(runSummaries) {
  const [first, second] = runSummaries;
  if (!first || !second) return { compared: false };
  const byId = new Map(second.variantStats.map((entry) => [entry.id, entry]));
  const rows = first.variantStats.map((entry) => {
    const other = byId.get(entry.id);
    return {
      id: entry.id,
      stable:
        Boolean(other) &&
        entry.newlyObservedExpectedFields === other.newlyObservedExpectedFields &&
        entry.candidateNoiseFields === other.candidateNoiseFields &&
        entry.evidenceLossFields === other.evidenceLossFields,
      run1NewExpected: entry.newlyObservedExpectedFields,
      run2NewExpected: other?.newlyObservedExpectedFields ?? null,
      run1Noise: entry.candidateNoiseFields,
      run2Noise: other?.candidateNoiseFields ?? null,
      run1EvidenceLoss: entry.evidenceLossFields,
      run2EvidenceLoss: other?.evidenceLossFields ?? null,
    };
  });
  return {
    compared: true,
    stableVariants: rows.filter((row) => row.stable).length,
    variants: rows.length,
    unstable: rows.filter((row) => !row.stable),
  };
}

async function runBrowserPass({ runIndex, runDir, browser, baseUrl, assetBaseUrl, rows, variants, resume }) {
  await fs.mkdir(runDir, { recursive: true });
  const results = [];
  for (const row of rows) {
    console.log(`[iPad member2 left-edge run ${runIndex}] ${row.filename}`);
    results.push(await processImage({ browser, baseUrl, assetBaseUrl, row, runDir, variants, resume }));
  }
  const summary = evaluate(results, rows, variants);
  await fs.writeFile(path.join(runDir, "field-records.json"), JSON.stringify(summary.fields, null, 2));
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  return summary;
}

async function main() {
  const args = parseArgs();
  const selectedCropVariants = args.variantIds.length
    ? cropVariants.filter((variant) => args.variantIds.includes(variant.id))
    : cropVariants.filter((variant) => args.fullMatrix || variant.default);
  const variants = selectedCropVariants.map((variant) => ({
    ...variant,
    profiles: profiles.filter((profile) => profile.default),
  }));
  if (!variants.length) throw new Error("No crop variants selected.");
  if (!args.resume) await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
  const rows = await collectFixtures();
  const playwright = await loadPlaywright();
  const port = args.baseUrl ? null : args.port || (await findFreePort());
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;
  const assetServer = await startTesseractAssetServer();
  let appServer = null;
  if (!(await isServerReady(baseUrl))) {
    appServer = startDevServer(port);
    await waitForServer(baseUrl);
  }
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const runSummaries = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      runSummaries.push(
        await runBrowserPass({
          runIndex,
          runDir: path.join(artifactDir, `run-${runIndex}`),
          browser,
          baseUrl,
          assetBaseUrl: assetServer.baseUrl,
          rows,
          variants,
          resume: args.resume,
        })
      );
    }
    const stability = compareRuns(runSummaries);
    const summary = {
      schema: "ipad-member2-left-edge-investigation-v1",
      command: "node scripts/ipad-member2-left-edge-investigation.mjs",
      runs: args.runs,
      images: rows.length,
      member2Fields: rows.length * stages.length * sides.length,
      variants: variants.map(({ profiles: _profiles, ...variant }) => variant),
      profiles,
      production: runSummaries[0].production,
      contamination: runSummaries[0].contamination,
      runSummaries: runSummaries.map((summary, index) => ({
        runIndex: index + 1,
        production: summary.production,
        topVariants: summary.variantStats.slice(0, 20),
      })),
      stability,
      recommendation: chooseRecommendation(runSummaries, stability),
    };
    await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({
      artifactDir: rel(artifactDir),
      production: summary.production,
      contamination: summary.contamination,
      topVariants: summary.runSummaries[0].topVariants.slice(0, 8).map((entry) => ({
        id: entry.id,
        newExpected: entry.newlyObservedExpectedFields,
        stage3NewExpected: entry.byStage.stage3.newExpected,
        noise: entry.candidateNoiseFields,
        evidenceLoss: entry.evidenceLossFields,
        averageMs: entry.averageMs,
      })),
      stability,
      recommendation: summary.recommendation,
    }, null, 2));
  } finally {
    await browser.close();
    await assetServer.close();
    await fs.writeFile(path.join(artifactDir, "dev-server.log.json"), JSON.stringify(appServer?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }], null, 2));
    await stopDevServer(appServer);
  }
}

function chooseRecommendation(runSummaries, stability) {
  const first = runSummaries[0]?.variantStats || [];
  const stableIds = new Set((stability.unstable || []).length ? first.map((entry) => entry.id).filter((id) => !(stability.unstable || []).some((row) => row.id === id)) : first.map((entry) => entry.id));
  const candidates = first
    .filter((entry) => stableIds.has(entry.id))
    .filter((entry) => entry.byStage.stage3.newExpected > 0)
    .filter((entry) => entry.candidateNoiseFields < 30)
    .filter((entry) => entry.evidenceLossFields === 0)
    .sort((a, b) => {
      if (b.byStage.stage3.newExpected !== a.byStage.stage3.newExpected) return b.byStage.stage3.newExpected - a.byStage.stage3.newExpected;
      if (b.newlyObservedExpectedFields !== a.newlyObservedExpectedFields) return b.newlyObservedExpectedFields - a.newlyObservedExpectedFields;
      return a.candidateNoiseFields - b.candidateNoiseFields;
    });
  if (!candidates.length) {
    return {
      nextStep: "C. Parser/tokenization investigation for raw OCR containing multiple groups",
      profile: null,
      reason: "No horizontal crop variant was both stable, Stage3-helpful, evidence-preserving, and substantially lower-noise than the previous +15 gain / 40 noise baseline.",
    };
  }
  const best = candidates[0];
  return {
    nextStep: "A. Diagnostic-only production review of one low-noise crop variant",
    profile: best.id,
    reason: `${best.id} was stable and gained ${best.newlyObservedExpectedFields} expected member2 fields, including ${best.byStage.stage3.newExpected} Stage3 fields, with ${best.candidateNoiseFields} noisy fields.`,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
