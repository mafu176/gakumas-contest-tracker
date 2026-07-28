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
const artifactDir = path.join(rootDir, "tmp", "ipad-member2-investigation");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const memberLabels = ["member1", "member2", "member3"];

const member2Profiles = [
  { id: "member2-pad06-white-mask-3x", label: "member2 smaller padding white-mask 3x", kind: "white-mask", scale: 3, paddingRatio: 0.06, threshold: 176 },
  { id: "member2-pad12-white-mask-2x", label: "member2 normal padding white-mask 2x", kind: "white-mask", scale: 2, paddingRatio: 0.12, threshold: 176 },
  { id: "member2-pad12-white-mask-3x", label: "member2 normal padding white-mask 3x", kind: "white-mask", scale: 3, paddingRatio: 0.12, threshold: 176 },
  { id: "member2-pad12-white-mask-4x", label: "member2 normal padding white-mask 4x", kind: "white-mask", scale: 4, paddingRatio: 0.12, threshold: 176 },
  { id: "member2-pad20-white-mask-3x", label: "member2 larger padding white-mask 3x", kind: "white-mask", scale: 3, paddingRatio: 0.2, threshold: 176 },
  { id: "member2-threshold160-white-mask-3x", label: "member2 white-mask threshold 160", kind: "white-mask", scale: 3, paddingRatio: 0.12, threshold: 160 },
  { id: "member2-threshold192-white-mask-3x", label: "member2 white-mask threshold 192", kind: "white-mask", scale: 3, paddingRatio: 0.12, threshold: 192 },
  { id: "member2-sharpen-light-3x", label: "member2 light sharpen 3x", kind: "sharpen-light", scale: 3, paddingRatio: 0.12, threshold: 176 },
];

function parseArgs() {
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  const profileIndex = process.argv.indexOf("--profiles");
  return {
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_MEMBER2_INVESTIGATION_BASE_URL || "",
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
    if (configuredModuleDir) {
      return createRequire(path.join(path.resolve(rootDir, configuredModuleDir), "noop.js"))("playwright");
    }
    throw new Error(
      [
        "Playwright is required for iPad member2 investigation.",
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
  const child = spawn(
    npmCommand,
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: rootDir,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    }
  );
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

function expectedMember(expected, stage, side, slot) {
  const stageData = expected?.[`stage${stage}`] || {};
  const members = side === "self" ? stageData.selfMembers || [] : stageData.enemyMembers || [];
  return Number(members[slot - 1] || 0);
}

function productionPool(diagnostics, stage, side, slot) {
  return (
    diagnostics?.stages?.[`stage${stage}`]?.[side]?.fieldCandidatePools?.[`member${slot}`] ||
    (diagnostics?.fieldPools || []).find(
      (pool) => pool.stage === stage && pool.side === side && pool.fieldType === "member" && pool.slot === slot
    ) ||
    null
  );
}

function productionValues(pool) {
  return unique((pool?.candidates || []).map((candidate) => toNumber(candidate.value)).filter((value) => value > 0));
}

function productionRawTexts(pool) {
  return unique(
    (pool?.candidates || [])
      .flatMap((candidate) => [
        candidate.rawText,
        ...(candidate.contributions || []).map((contribution) => contribution.rawText),
      ])
      .filter((value) => String(value || "").trim())
  );
}

function selectedValue(diagnostics, stage, side, slot) {
  const primary = diagnostics?.stages?.[`stage${stage}`]?.[side]?.currentPrimary || {};
  return toNumber(primary.members?.[slot - 1]);
}

function digitOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function classifyCandidateFailure({ expected, selected, values, rawTexts }) {
  const expectedDigits = digitOnly(expected);
  const selectedDigits = digitOnly(selected);
  const rawJoined = rawTexts.join("\n");
  const rawDigits = digitOnly(rawJoined);
  if (values.includes(expected)) return "exact-candidate-present";
  if (!rawJoined.trim()) return "empty-ocr";
  if (rawJoined.includes(expectedDigits)) return "exact-digits-in-raw-unparsed";
  if (rawDigits.includes(expectedDigits)) return "exact-digits-in-normalized-raw-unparsed";
  if (selected > 0 && selectedDigits.length < expectedDigits.length && expectedDigits.endsWith(selectedDigits)) {
    return "leading-digit-loss";
  }
  if (selected > 0 && selectedDigits.length < expectedDigits.length && expectedDigits.startsWith(selectedDigits)) {
    return "trailing-digit-loss";
  }
  if (selected > 0 && selectedDigits.length !== expectedDigits.length) return "length-mismatch";
  if (selected > 0 && selectedDigits.length === expectedDigits.length && selected !== expected) return "digit-substitution";
  if (values.length) return "wrong-candidate";
  return "no-numeric-candidate";
}

function summarizeNumbers(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.length;
  if (!total) return { min: 0, p25: 0, median: 0, p75: 0, max: 0, avg: 0 };
  const at = (ratio) => sorted[Math.min(total - 1, Math.max(0, Math.floor((total - 1) * ratio)))];
  return {
    min: sorted[0],
    p25: at(0.25),
    median: at(0.5),
    p75: at(0.75),
    max: sorted[total - 1],
    avg: Number((sorted.reduce((sum, value) => sum + value, 0) / total).toFixed(3)),
  };
}

function bucket(value, buckets) {
  for (const entry of buckets) {
    if (value <= entry.max) return entry.label;
  }
  return buckets[buckets.length - 1]?.label || "unknown";
}

async function processImage({ browser, baseUrl, assetBaseUrl, row, runDir, selectedProfiles, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "member2-investigation-image.json");
  if (resume) {
    try {
      return await loadJson(artifactPath);
    } catch {
      // Regenerate incomplete artifacts.
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
      if (!file) throw new Error("No uploaded file available for iPad member2 investigation.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, { timeout: 30000 });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);

    await page.addScriptTag({ url: `${assetBaseUrl}/tesseract.min.js` });
    const browserCapture = await page.evaluate(
      async ({ profilesToRun, assetBaseUrl: tesseractAssetBaseUrl }) => {
        const parseNumbers = (text = "") => {
          const candidates = [];
          const regex = /[+・・]?\s*(?:\d{1,3}(?:[,.\s]\d{3})+|\d{1,8})/g;
          for (const match of text.matchAll(regex)) {
            const raw = match[0] || "";
            const value = Number(raw.replace(/[^\d-]/g, ""));
            if (Number.isInteger(value)) candidates.push({ raw, value });
          }
          return candidates;
        };
        const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
        const file = input?.files?.[0];
        if (!file) throw new Error("No uploaded file available inside browser investigation.");
        const imageUrl = URL.createObjectURL(file);
        const image = await new Promise((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = reject;
          element.src = imageUrl;
        });

        const fields = (window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.fieldPools || [])
          .filter((pool) => pool.fieldType === "member")
          .map((pool) => ({
            key: pool.key,
            stage: pool.stage,
            side: pool.side,
            slot: pool.slot,
            zone: pool.zone,
          }));

        const clampCrop = (zone, paddingRatio) => {
          const padX = Math.max(1, Math.round(zone.width * paddingRatio));
          const padY = Math.max(1, Math.round(zone.height * paddingRatio));
          const crop = {
            x: Math.max(0, Math.round(zone.x - padX)),
            y: Math.max(0, Math.round(zone.y - padY)),
            width: Math.max(1, Math.round(zone.width + padX * 2)),
            height: Math.max(1, Math.round(zone.height + padY * 2)),
          };
          crop.width = Math.min(crop.width, image.naturalWidth - crop.x);
          crop.height = Math.min(crop.height, image.naturalHeight - crop.y);
          return crop;
        };

        const cropToImageData = (zone, profile) => {
          const crop = clampCrop(zone, profile.paddingRatio ?? 0.12);
          const scale = profile.scale || 3;
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(crop.width * scale));
          canvas.height = Math.max(1, Math.round(crop.height * scale));
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.fillStyle = "white";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.imageSmoothingEnabled = profile.smoothing !== "nearest";
          context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
          return { crop, canvas, context, imageData: context.getImageData(0, 0, canvas.width, canvas.height) };
        };

        const preprocess = (zone, profile) => {
          const prepared = cropToImageData(zone, profile);
          const { canvas, context, imageData } = prepared;
          const data = imageData.data;
          const grayscale = new Uint8ClampedArray(canvas.width * canvas.height);
          for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
            grayscale[p] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          }
          for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = grayscale[p];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;
            let value = max >= (profile.threshold || 176) && saturation < 145 ? 0 : 255;
            if (profile.kind === "sharpen-light") {
              const contrast = Math.max(0, Math.min(255, (gray - 122) * 1.65 + 128));
              value = contrast > (profile.threshold || 176) && saturation < 160 ? 0 : 255;
            }
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
          }
          context.putImageData(imageData, 0, 0);
          return prepared;
        };

        const measureCrop = (zone) => {
          const { crop, canvas, context } = cropToImageData(zone, { scale: 1, paddingRatio: 0 });
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const width = canvas.width;
          const height = canvas.height;
          const foreground = new Uint8Array(width * height);
          let foregroundCount = 0;
          let minX = width;
          let minY = height;
          let maxX = -1;
          let maxY = -1;
          let borderForeground = 0;
          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const i = (y * width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
              const isForeground = max >= 168 && max - min < 155 && gray >= 130;
              if (!isForeground) continue;
              const idx = y * width + x;
              foreground[idx] = 1;
              foregroundCount += 1;
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
              if (x === 0 || y === 0 || x === width - 1 || y === height - 1) borderForeground += 1;
            }
          }
          const seen = new Uint8Array(width * height);
          let components = 0;
          const stack = [];
          for (let idx = 0; idx < foreground.length; idx += 1) {
            if (!foreground[idx] || seen[idx]) continue;
            components += 1;
            seen[idx] = 1;
            stack.push(idx);
            while (stack.length) {
              const current = stack.pop();
              const x = current % width;
              const y = Math.floor(current / width);
              const neighbors = [current - 1, current + 1, current - width, current + width];
              for (const next of neighbors) {
                if (next < 0 || next >= foreground.length) continue;
                const nx = next % width;
                const ny = Math.floor(next / width);
                if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
                if (!foreground[next] || seen[next]) continue;
                seen[next] = 1;
                stack.push(next);
              }
            }
          }
          const bboxWidth = maxX >= minX ? maxX - minX + 1 : 0;
          const bboxHeight = maxY >= minY ? maxY - minY + 1 : 0;
          return {
            crop,
            width,
            height,
            foregroundRatio: Number((foregroundCount / Math.max(1, width * height)).toFixed(4)),
            connectedComponentCount: components,
            touchesBorder: borderForeground > 0,
            borderForegroundRatio: Number((borderForeground / Math.max(1, foregroundCount)).toFixed(4)),
            foregroundBbox: { x: minX === width ? 0 : minX, y: minY === height ? 0 : minY, width: bboxWidth, height: bboxHeight },
            averageCharacterWidthEstimate: components ? Number((bboxWidth / components).toFixed(2)) : 0,
            averageCharacterHeightEstimate: bboxHeight,
          };
        };

        const worker = await window.Tesseract.createWorker("eng", 1, {
          workerPath: `${tesseractAssetBaseUrl}/worker.min.js`,
          corePath: `${tesseractAssetBaseUrl}/tesseract-core-simd-lstm.wasm.js`,
          langPath: tesseractAssetBaseUrl,
        });
        await worker.setParameters({
          tessedit_char_whitelist: "0123456789,.",
          preserve_interword_spaces: "1",
        });
        const recognizeCanvas = async (canvas) => {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
          const started = performance.now();
          await worker.setParameters({
            tessedit_char_whitelist: "0123456789,.",
            tessedit_pageseg_mode: "7",
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
          const cropQuality = measureCrop(field.zone);
          const profileResults = [];
          if (field.slot === 2) {
            for (const profile of profilesToRun) {
              const { crop, canvas } = preprocess(field.zone, profile);
              let result;
              try {
                result = await recognizeCanvas(canvas);
              } catch (error) {
                result = { rawText: "", confidence: 0, elapsedMs: 0, error: error?.message || String(error) };
              }
              const parsedCandidates = parseNumbers(result.rawText);
              profileResults.push({
                profileId: profile.id,
                label: profile.label,
                crop,
                rawText: result.rawText,
                confidence: result.confidence,
                elapsedMs: result.elapsedMs,
                parsedCandidates,
                values: [...new Set(parsedCandidates.map((candidate) => candidate.value).filter((value) => value > 0))],
                error: result.error || "",
              });
            }
          }
          records.push({ field, cropQuality, profileResults });
        }
        await worker.terminate();
        URL.revokeObjectURL(imageUrl);
        return {
          schema: "ipad-member2-browser-capture-v1",
          profiles: profilesToRun,
          records,
        };
      },
      { profilesToRun: selectedProfiles, assetBaseUrl }
    );

    await fs.mkdir(imageDir, { recursive: true });
    const result = {
      image: row.filename,
      clusterId: row.clusterId,
      imagePath: rel(row.imagePath),
      expected: row.expected,
      diagnostics,
      capture: browserCapture,
      consoleMessages,
      pageErrors,
    };
    await fs.writeFile(artifactPath, JSON.stringify(result, null, 2));
    return result;
  } finally {
    await page.close();
  }
}

function evaluate(rows, imageResults, selectedProfiles) {
  const fieldRecords = [];
  const profileStats = Object.fromEntries(
    selectedProfiles.map((profile) => [
      profile.id,
      {
        profile,
        fields: 0,
        profileExpectedPresent: 0,
        newExpectedFields: 0,
        noiseCandidateFields: 0,
        noiseCandidates: 0,
        emptyOcrFields: 0,
        duplicateCandidateFields: 0,
        elapsedMs: 0,
      },
    ])
  );

  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const diagnostics = imageResult?.diagnostics || {};
    const captureByKey = new Map((imageResult?.capture?.records || []).map((record) => [record.field.key, record]));
    for (const stage of stages) {
      for (const side of sides) {
        for (const slot of [1, 2, 3]) {
          const expected = expectedMember(row.expected, stage, side, slot);
          const selected = selectedValue(diagnostics, stage, side, slot);
          const pool = productionPool(diagnostics, stage, side, slot);
          const prodValues = productionValues(pool);
          const prodRawTexts = productionRawTexts(pool);
          const productionPresent = prodValues.includes(expected);
          const selectedExact = selected === expected;
          const captureRecord = captureByKey.get(pool?.key || `${row.filename}|${stage}|${side}|member|${slot}`);
          const cropQuality = captureRecord?.cropQuality || null;
          const profileSummaries = [];
          if (slot === 2) {
            for (const profile of selectedProfiles) {
              const stats = profileStats[profile.id];
              const result = (captureRecord?.profileResults || []).find((entry) => entry.profileId === profile.id) || {
                values: [],
                rawText: "",
                elapsedMs: 0,
                confidence: 0,
                error: "missing-profile-result",
              };
              const values = unique((result.values || []).map(toNumber).filter((value) => value > 0));
              const expectedPresent = values.includes(expected);
              const newlyObservedExpected = !productionPresent && expectedPresent;
              const noiseValues = values.filter((value) => value !== expected && !prodValues.includes(value));
              stats.fields += 1;
              if (expectedPresent) stats.profileExpectedPresent += 1;
              if (newlyObservedExpected) stats.newExpectedFields += 1;
              if (noiseValues.length) stats.noiseCandidateFields += 1;
              stats.noiseCandidates += noiseValues.length;
              if (!String(result.rawText || "").trim()) stats.emptyOcrFields += 1;
              if (values.some((value) => prodValues.includes(value))) stats.duplicateCandidateFields += 1;
              stats.elapsedMs += Number(result.elapsedMs || 0);
              profileSummaries.push({
                profileId: profile.id,
                rawText: result.rawText || "",
                confidence: Number(result.confidence || 0),
                elapsedMs: Number(result.elapsedMs || 0),
                values,
                expectedPresent,
                newlyObservedExpected,
                noiseValues,
              });
            }
          }
          const failureClass = selectedExact
            ? "selected-exact"
            : classifyCandidateFailure({ expected, selected, values: prodValues, rawTexts: prodRawTexts });
          fieldRecords.push({
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            slot,
            field: `member${slot}`,
            expected,
            selected,
            selectedExact,
            productionPresent,
            productionValues: prodValues,
            productionCandidateCount: prodValues.length,
            productionRawTexts: prodRawTexts,
            failureClass,
            digitLength: String(expected).length,
            cropQuality,
            profileSummaries,
          });
        }
      }
    }
  }

  const slotSummaries = [1, 2, 3].map((slot) => {
    const records = fieldRecords.filter((record) => record.slot === slot);
    const failed = records.filter((record) => !record.selectedExact);
    const cropValues = (key) => records.map((record) => Number(record.cropQuality?.[key] || 0));
    const byFailureClass = {};
    for (const record of failed) byFailureClass[record.failureClass] = (byFailureClass[record.failureClass] || 0) + 1;
    return {
      slot,
      fields: records.length,
      selectedExact: records.filter((record) => record.selectedExact).length,
      selectedExactPct: pct(records.filter((record) => record.selectedExact).length, records.length),
      productionCandidatePresent: records.filter((record) => record.productionPresent).length,
      productionCandidatePresentPct: pct(records.filter((record) => record.productionPresent).length, records.length),
      emptyOcr: failed.filter((record) => record.failureClass === "empty-ocr").length,
      wrongOcr: failed.length,
      averageCandidateCount: Number((records.reduce((sum, record) => sum + record.productionCandidateCount, 0) / records.length).toFixed(2)),
      truncation:
        failed.filter((record) => ["leading-digit-loss", "trailing-digit-loss", "length-mismatch"].includes(record.failureClass)).length,
      byFailureClass,
      crop: {
        width: summarizeNumbers(cropValues("width")),
        height: summarizeNumbers(cropValues("height")),
        foregroundRatio: summarizeNumbers(cropValues("foregroundRatio")),
        connectedComponentCount: summarizeNumbers(cropValues("connectedComponentCount")),
        touchesBorderRatePct: pct(records.filter((record) => record.cropQuality?.touchesBorder).length, records.length),
        averageCharacterWidthEstimate: summarizeNumbers(cropValues("averageCharacterWidthEstimate")),
        averageCharacterHeightEstimate: summarizeNumbers(cropValues("averageCharacterHeightEstimate")),
      },
    };
  });

  const member2Records = fieldRecords.filter((record) => record.slot === 2);
  const clusterBreakdown = summarizeGroups(member2Records, "clusterId");
  const stageBreakdown = summarizeGroups(member2Records, "stage");
  const sideBreakdown = summarizeGroups(member2Records, "side");
  const digitLengthBreakdown = summarizeGroups(member2Records, "digitLength");
  const foregroundBreakdown = summarizeBuckets(member2Records, "foregroundRatio", [
    { label: "<=0.08", max: 0.08 },
    { label: "<=0.12", max: 0.12 },
    { label: "<=0.16", max: 0.16 },
    { label: ">0.16", max: Number.POSITIVE_INFINITY },
  ]);
  const candidateCountBreakdown = summarizeBuckets(member2Records, "productionCandidateCount", [
    { label: "0", max: 0 },
    { label: "1", max: 1 },
    { label: "2", max: 2 },
    { label: ">=3", max: Number.POSITIVE_INFINITY },
  ]);

  const profileSummaries = Object.values(profileStats).map((entry) => ({
    ...entry,
    observedCoveragePct: pct(entry.profileExpectedPresent, entry.fields),
    newExpectedPct: pct(entry.newExpectedFields, entry.fields),
    noiseCandidateFieldsPct: pct(entry.noiseCandidateFields, entry.fields),
    averageMs: entry.fields ? Math.round(entry.elapsedMs / entry.fields) : 0,
    recommendation:
      entry.newExpectedFields >= 2 && entry.noiseCandidateFieldsPct <= 20 && entry.averageMs <= 750
        ? "candidate for focused follow-up"
        : "reject/defer",
  }));
  const combinations = evaluateCombinations(member2Records, selectedProfiles);
  const recommended =
    profileSummaries
      .filter((entry) => entry.recommendation === "candidate for focused follow-up")
      .sort((a, b) => {
        if (b.newExpectedFields !== a.newExpectedFields) return b.newExpectedFields - a.newExpectedFields;
        if (a.noiseCandidateFields !== b.noiseCandidateFields) return a.noiseCandidateFields - b.noiseCandidateFields;
        return a.averageMs - b.averageMs;
      })[0] || null;

  return {
    schema: "ipad-member2-investigation-summary-v1",
    totalImages: rows.length,
    totalMemberFields: fieldRecords.length,
    slotSummaries,
    member2ClusterBreakdown: clusterBreakdown,
    member2StageBreakdown: stageBreakdown,
    member2SideBreakdown: sideBreakdown,
    member2DigitLengthBreakdown: digitLengthBreakdown,
    member2ForegroundBreakdown: foregroundBreakdown,
    member2CandidateCountBreakdown: candidateCountBreakdown,
    profileSummaries,
    combinations,
    newlyObservedMember2Fields: member2Records
      .filter((record) => record.profileSummaries.some((summary) => summary.newlyObservedExpected))
      .map((record) => ({
        image: record.image,
        clusterId: record.clusterId,
        stage: record.stage,
        side: record.side,
        expected: record.expected,
        selected: record.selected,
        productionValues: record.productionValues,
        profiles: record.profileSummaries
          .filter((summary) => summary.newlyObservedExpected)
          .map((summary) => summary.profileId),
      })),
    recommendation: recommended
      ? {
          profileId: recommended.profile.id,
          label: recommended.profile.label,
          reason: `${recommended.newExpectedFields} member2 fields gain expected coverage with ${recommended.noiseCandidateFields} noisy fields.`,
        }
      : {
          profileId: null,
          label: "No production preprocessing profile recommended",
          reason:
            "Member2 gains are real, but every tested browser-native variant still adds too much non-expected numeric noise for candidate-pool inclusion.",
        },
    fieldRecords,
  };
}

function summarizeGroups(records, key) {
  const groups = {};
  for (const record of records) {
    const value = String(record[key] ?? "unknown");
    groups[value] ||= { fields: 0, selectedExact: 0, productionPresent: 0, failures: 0 };
    groups[value].fields += 1;
    if (record.selectedExact) groups[value].selectedExact += 1;
    if (record.productionPresent) groups[value].productionPresent += 1;
    if (!record.selectedExact) groups[value].failures += 1;
  }
  return Object.fromEntries(
    Object.entries(groups).map(([keyValue, group]) => [
      keyValue,
      {
        ...group,
        selectedExactPct: pct(group.selectedExact, group.fields),
        productionPresentPct: pct(group.productionPresent, group.fields),
      },
    ])
  );
}

function summarizeBuckets(records, cropKey, buckets) {
  const groups = {};
  for (const record of records) {
    const value = cropKey === "productionCandidateCount" ? record.productionCandidateCount : Number(record.cropQuality?.[cropKey] || 0);
    const key = bucket(value, buckets);
    groups[key] ||= { fields: 0, selectedExact: 0, productionPresent: 0, failures: 0 };
    groups[key].fields += 1;
    if (record.selectedExact) groups[key].selectedExact += 1;
    if (record.productionPresent) groups[key].productionPresent += 1;
    if (!record.selectedExact) groups[key].failures += 1;
  }
  return groups;
}

function evaluateCombinations(member2Records, selectedProfiles) {
  const combinations = [];
  const profileIds = selectedProfiles.map((profile) => profile.id);
  for (const id of profileIds) combinations.push(evaluateCombination(member2Records, [id]));
  for (let i = 0; i < profileIds.length; i += 1) {
    for (let j = i + 1; j < profileIds.length; j += 1) combinations.push(evaluateCombination(member2Records, [profileIds[i], profileIds[j]]));
  }
  return combinations
    .sort((a, b) => {
      if (b.newExpectedFields !== a.newExpectedFields) return b.newExpectedFields - a.newExpectedFields;
      if (a.noiseCandidateFields !== b.noiseCandidateFields) return a.noiseCandidateFields - b.noiseCandidateFields;
      return a.profileIds.join(",").localeCompare(b.profileIds.join(","));
    })
    .slice(0, 20);
}

function evaluateCombination(member2Records, profileIds) {
  let observed = 0;
  let newExpectedFields = 0;
  let noiseCandidateFields = 0;
  let noiseCandidates = 0;
  for (const record of member2Records) {
    const values = new Set(record.productionValues);
    let hasNoise = false;
    for (const summary of record.profileSummaries.filter((entry) => profileIds.includes(entry.profileId))) {
      for (const value of summary.values) {
        if (!record.productionValues.includes(value) && value !== record.expected) {
          hasNoise = true;
          noiseCandidates += 1;
        }
        values.add(value);
      }
    }
    if (values.has(record.expected)) observed += 1;
    if (!record.productionPresent && values.has(record.expected)) newExpectedFields += 1;
    if (hasNoise) noiseCandidateFields += 1;
  }
  return {
    profileIds,
    observedMember2Fields: observed,
    observedMember2CoveragePct: pct(observed, member2Records.length),
    newExpectedFields,
    noiseCandidateFields,
    noiseCandidates,
  };
}

async function runOnce({ runDir, browser, baseUrl, assetBaseUrl, rows, selectedProfiles, resume }) {
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad member2 investigation] ${row.filename}`);
    imageResults.push(await processImage({ browser, baseUrl, assetBaseUrl, row, runDir, selectedProfiles, resume }));
  }
  const summary = evaluate(rows, imageResults, selectedProfiles);
  await fs.writeFile(path.join(runDir, "field-records.json"), JSON.stringify(summary.fieldRecords, null, 2));
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(artifactDir, "field-records.json"), JSON.stringify(summary.fieldRecords, null, 2));
  await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
  return summary;
}

async function main() {
  const args = parseArgs();
  const selectedProfiles = args.profileIds.length
    ? member2Profiles.filter((profile) => args.profileIds.includes(profile.id))
    : member2Profiles;
  if (!selectedProfiles.length) throw new Error(`No matching profiles for: ${args.profileIds.join(",")}`);
  if (!args.resume) await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
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
    const summary = await runOnce({
      runDir: path.join(artifactDir, "run-1"),
      browser,
      baseUrl,
      assetBaseUrl: assetServer.baseUrl,
      rows,
      selectedProfiles,
      resume: args.resume,
    });
    const consoleSummary = {
      command: "node scripts/ipad-member2-investigation.mjs",
      artifactDir: rel(artifactDir),
      totalImages: summary.totalImages,
      totalMemberFields: summary.totalMemberFields,
      slotSummaries: summary.slotSummaries.map((entry) => ({
        slot: entry.slot,
        selectedExact: entry.selectedExact,
        productionCandidatePresent: entry.productionCandidatePresent,
        emptyOcr: entry.emptyOcr,
        wrongOcr: entry.wrongOcr,
        averageCandidateCount: entry.averageCandidateCount,
        truncation: entry.truncation,
      })),
      profileSummaries: summary.profileSummaries.map((entry) => ({
        id: entry.profile.id,
        newExpectedFields: entry.newExpectedFields,
        profileExpectedPresent: entry.profileExpectedPresent,
        noiseCandidateFields: entry.noiseCandidateFields,
        noiseCandidates: entry.noiseCandidates,
        emptyOcrFields: entry.emptyOcrFields,
        averageMs: entry.averageMs,
        recommendation: entry.recommendation,
      })),
      topCombinations: summary.combinations.slice(0, 8),
      recommendation: summary.recommendation,
    };
    console.log(JSON.stringify(consoleSummary, null, 2));
  } finally {
    await browser.close();
    await assetServer.close();
    await fs.writeFile(
      path.join(artifactDir, "dev-server.log.json"),
      JSON.stringify(appServer?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }], null, 2)
    );
    await stopDevServer(appServer);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
