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
const artifactDir = path.join(rootDir, "tmp", "ipad-browser-member-candidate-capture");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const memberLabels = ["member1", "member2", "member3"];

const profiles = [
  { id: "grayscale-3x-psm7", label: "grayscale 3x PSM7", kind: "grayscale", scale: 3, pageSegMode: "7" },
  { id: "contrast-3x-psm7", label: "contrast 3x PSM7", kind: "contrast", scale: 3, pageSegMode: "7" },
  { id: "white-mask-3x-psm7", label: "white mask 3x PSM7", kind: "white-mask", scale: 3, pageSegMode: "7", threshold: 176 },
  { id: "white-mask-4x-psm7", label: "white mask 4x PSM7", kind: "white-mask", scale: 4, pageSegMode: "7", threshold: 168 },
  { id: "invert-3x-psm7", label: "inverted grayscale 3x PSM7", kind: "invert", scale: 3, pageSegMode: "7" },
  { id: "otsu-3x-psm7", label: "otsu threshold 3x PSM7", kind: "otsu", scale: 3, pageSegMode: "7" },
  { id: "sharpen-3x-psm7", label: "sharpen 3x PSM7", kind: "sharpen", scale: 3, pageSegMode: "7" },
  { id: "dilate-white-mask-3x-psm7", label: "dilated white mask 3x PSM7", kind: "dilate-white-mask", scale: 3, pageSegMode: "7", threshold: 176 },
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
        : process.env.IPAD_MEMBER_CAPTURE_BASE_URL || "",
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
        "Playwright is required for iPad browser member candidate capture.",
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

function expectedMember(expected, stage, side, label) {
  const stageData = expected?.[`stage${stage}`] || {};
  const members = side === "self" ? stageData.selfMembers || [] : stageData.enemyMembers || [];
  return Number(members[Number(label.replace("member", "")) - 1] || 0);
}

function productionPool(diagnostics, stage, side, label) {
  return (
    diagnostics?.stages?.[`stage${stage}`]?.[side]?.fieldCandidatePools?.[label] ||
    (diagnostics?.fieldPools || []).find(
      (pool) => pool.stage === stage && pool.side === side && pool.field === "member" && pool.slot === Number(label.replace("member", ""))
    ) ||
    null
  );
}

function productionValues(pool) {
  return [...new Set((pool?.candidates || []).map((candidate) => toNumber(candidate.value)).filter((value) => value > 0))];
}

function selectedValue(diagnostics, stage, side, label) {
  const primary = diagnostics?.stages?.[`stage${stage}`]?.[side]?.currentPrimary || {};
  const index = Number(label.replace("member", "")) - 1;
  return toNumber(primary.members?.[index]);
}

async function processImage({ browser, baseUrl, assetBaseUrl, row, runDir, selectedProfiles, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "member-capture-image.json");
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
      if (!file) throw new Error("No uploaded file available for iPad member candidate capture.");
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
          const regex = /[+＋-]?\s*(?:\d{1,3}(?:[,.\s]\d{3})+|\d{1,8})/g;
          for (const match of text.matchAll(regex)) {
            const raw = match[0] || "";
            const value = Number(raw.replace(/[^\d-]/g, ""));
            if (Number.isInteger(value)) candidates.push({ raw, value });
          }
          return candidates;
        };
        const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
        const file = input?.files?.[0];
        if (!file) throw new Error("No uploaded file available inside browser capture.");
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
            field: pool.field,
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
          const grayscale = new Uint8ClampedArray(canvas.width * canvas.height);
          for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            grayscale[p] = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
          }
          let threshold = profile.threshold || 176;
          if (profile.kind === "otsu") {
            const histogram = new Array(256).fill(0);
            for (const value of grayscale) histogram[value] += 1;
            let sum = 0;
            for (let t = 0; t < 256; t += 1) sum += t * histogram[t];
            let sumB = 0;
            let wB = 0;
            let maxVariance = 0;
            const total = grayscale.length;
            for (let t = 0; t < 256; t += 1) {
              wB += histogram[t];
              if (!wB) continue;
              const wF = total - wB;
              if (!wF) break;
              sumB += t * histogram[t];
              const mB = sumB / wB;
              const mF = (sum - sumB) / wF;
              const variance = wB * wF * (mB - mF) * (mB - mF);
              if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
              }
            }
          }
          const binary = new Uint8ClampedArray(canvas.width * canvas.height);
          for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = grayscale[p];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;
            let value = gray;
            if (profile.kind === "contrast" || profile.kind === "sharpen") {
              value = Math.max(0, Math.min(255, (gray - 118) * 1.9 + 128));
              value = value > 154 && saturation < 150 ? 0 : 255;
            } else if (profile.kind === "white-mask" || profile.kind === "dilate-white-mask") {
              value = max >= threshold && saturation < 145 ? 0 : 255;
            } else if (profile.kind === "invert") {
              value = 255 - gray;
            } else if (profile.kind === "otsu") {
              value = gray >= threshold ? 0 : 255;
            } else {
              value = gray;
            }
            binary[p] = value < 128 ? 0 : 255;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
          }
          if (profile.kind === "dilate-white-mask") {
            const width = canvas.width;
            const height = canvas.height;
            const next = new Uint8ClampedArray(binary);
            for (let y = 1; y < height - 1; y += 1) {
              for (let x = 1; x < width - 1; x += 1) {
                const idx = y * width + x;
                if (
                  binary[idx] === 0 ||
                  binary[idx - 1] === 0 ||
                  binary[idx + 1] === 0 ||
                  binary[idx - width] === 0 ||
                  binary[idx + width] === 0
                ) {
                  next[idx] = 0;
                }
              }
            }
            for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
              data[i] = next[p];
              data[i + 1] = next[p];
              data[i + 2] = next[p];
            }
          }
          if (profile.kind === "sharpen") {
            // Contrast profile already binarizes; keep this variant deterministic without a large convolution search.
          }
          context.putImageData(imageData, 0, 0);
          return {
            crop,
            canvas,
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
        const recognizeCanvas = async (canvas, profile) => {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
          const started = performance.now();
          await worker.setParameters({
            tessedit_char_whitelist: "0123456789,.",
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
            const { crop, canvas } = preprocess(field, profile);
            let result;
            try {
              result = await recognizeCanvas(canvas, profile);
            } catch (error) {
              result = {
                rawText: "",
                confidence: 0,
                elapsedMs: 0,
                error: error?.message || String(error),
              };
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
          records.push({ field, profileResults });
        }
        await worker.terminate();
        URL.revokeObjectURL(imageUrl);
        return {
          schema: "ipad-browser-member-candidate-capture-v1",
          tesseract: {
            source: "injected-browser-bundle",
            workerPath: `${tesseractAssetBaseUrl}/worker.min.js`,
            corePath: `${tesseractAssetBaseUrl}/tesseract-core-simd-lstm.wasm.js`,
            langPath: tesseractAssetBaseUrl,
          },
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
      capture,
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
        productionPresent: 0,
        profileExpectedPresent: 0,
        newExpectedFields: 0,
        newCandidateFields: 0,
        duplicateCandidateFields: 0,
        emptyOcrFields: 0,
        errorFields: 0,
        noiseCandidateFields: 0,
        noiseCandidates: 0,
        totalCandidates: 0,
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
        for (const label of memberLabels) {
          const expected = expectedMember(row.expected, stage, side, label);
          const selected = selectedValue(diagnostics, stage, side, label);
          const pool = productionPool(diagnostics, stage, side, label);
          const prodValues = productionValues(pool);
          const productionPresent = prodValues.includes(expected);
          const captureRecord = captureByKey.get(pool?.key || `${row.filename}|${stage}|${side}|member|${label.replace("member", "")}`);
          const profileResults = captureRecord?.profileResults || [];
          const profileSummaries = [];
          for (const profile of selectedProfiles) {
            const stats = profileStats[profile.id];
            const result = profileResults.find((entry) => entry.profileId === profile.id) || {
              values: [],
              parsedCandidates: [],
              rawText: "",
              elapsedMs: 0,
              confidence: 0,
              error: "missing-profile-result",
            };
            const values = [...new Set((result.values || []).map(toNumber).filter((value) => value > 0))];
            const newValues = values.filter((value) => !prodValues.includes(value));
            const duplicateValues = values.filter((value) => prodValues.includes(value));
            const expectedPresent = values.includes(expected);
            const newlyObservedExpected = !productionPresent && expectedPresent;
            const noiseValues = newValues.filter((value) => value !== expected);
            stats.fields += 1;
            if (productionPresent) stats.productionPresent += 1;
            if (expectedPresent) stats.profileExpectedPresent += 1;
            if (newlyObservedExpected) stats.newExpectedFields += 1;
            if (newValues.length) stats.newCandidateFields += 1;
            if (duplicateValues.length) stats.duplicateCandidateFields += 1;
            if (!String(result.rawText || "").trim()) stats.emptyOcrFields += 1;
            if (result.error) stats.errorFields += 1;
            if (noiseValues.length) stats.noiseCandidateFields += 1;
            stats.noiseCandidates += noiseValues.length;
            stats.totalCandidates += values.length;
            stats.elapsedMs += Number(result.elapsedMs || 0);
            profileSummaries.push({
              profileId: profile.id,
              rawText: result.rawText || "",
              confidence: Number(result.confidence || 0),
              elapsedMs: Number(result.elapsedMs || 0),
              values,
              newValues,
              expectedPresent,
              newlyObservedExpected,
              noiseValues,
              error: result.error || "",
            });
          }
          fieldRecords.push({
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            field: label,
            expected,
            selected,
            productionPresent,
            productionValues: prodValues,
            productionCandidateCount: prodValues.length,
            profileSummaries,
          });
        }
      }
    }
  }

  const profileSummaries = Object.values(profileStats).map((entry) => ({
    ...entry,
    observedCoverage: entry.profileExpectedPresent,
    observedCoveragePct: pct(entry.profileExpectedPresent, entry.fields),
    newExpectedPct: pct(entry.newExpectedFields, entry.fields),
    noiseCandidateFieldsPct: pct(entry.noiseCandidateFields, entry.fields),
    averageMs: entry.fields ? Math.round(entry.elapsedMs / entry.fields) : 0,
    recommendation:
      entry.newExpectedFields >= 2 && entry.noiseCandidateFieldsPct <= 35 && entry.averageMs <= 2500
        ? "candidate for follow-up"
        : "reject/defer",
  }));

  const productionMemberCoverage = fieldRecords.filter((record) => record.productionPresent).length;
  const combinations = [];
  for (const profile of selectedProfiles) {
    combinations.push(evaluateCombination(fieldRecords, [profile.id]));
  }
  for (let i = 0; i < selectedProfiles.length; i += 1) {
    for (let j = i + 1; j < selectedProfiles.length; j += 1) {
      combinations.push(evaluateCombination(fieldRecords, [selectedProfiles[i].id, selectedProfiles[j].id]));
    }
  }
  combinations.sort((a, b) => {
    if (b.newExpectedFields !== a.newExpectedFields) return b.newExpectedFields - a.newExpectedFields;
    if (a.noiseCandidateFields !== b.noiseCandidateFields) return a.noiseCandidateFields - b.noiseCandidateFields;
    return a.profileIds.join(",").localeCompare(b.profileIds.join(","));
  });

  const recommendedProfile =
    profileSummaries
      .filter((entry) => entry.recommendation === "candidate for follow-up")
      .sort((a, b) => {
        if (b.newExpectedFields !== a.newExpectedFields) return b.newExpectedFields - a.newExpectedFields;
        if (a.noiseCandidateFields !== b.noiseCandidateFields) return a.noiseCandidateFields - b.noiseCandidateFields;
        return a.averageMs - b.averageMs;
      })[0] || null;

  return {
    schema: "ipad-browser-member-candidate-capture-summary-v1",
    totalImages: rows.length,
    totalMemberFields: fieldRecords.length,
    productionMemberCoverage,
    productionMemberCoveragePct: pct(productionMemberCoverage, fieldRecords.length),
    profileSummaries,
    combinations: combinations.slice(0, 20),
    fieldRecords,
    recommendation: recommendedProfile
      ? {
          profileId: recommendedProfile.profile.id,
          label: recommendedProfile.profile.label,
          reason: `${recommendedProfile.newExpectedFields} member fields gain expected-value coverage with ${recommendedProfile.noiseCandidateFields} fields adding non-expected new candidates.`,
        }
      : {
          profileId: null,
          label: "none",
          reason: "No profile met the conservative new-coverage, noise, and runtime thresholds.",
        },
  };
}

function evaluateCombination(fieldRecords, profileIds) {
  let observed = 0;
  let newExpectedFields = 0;
  let noiseCandidateFields = 0;
  let noiseCandidates = 0;
  for (const record of fieldRecords) {
    const values = new Set(record.productionValues);
    let hasNoise = false;
    for (const summary of record.profileSummaries.filter((entry) => profileIds.includes(entry.profileId))) {
      for (const value of summary.values) {
        if (!record.productionValues.includes(value) && value !== record.expected) {
          noiseCandidates += 1;
          hasNoise = true;
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
    observedMemberFields: observed,
    observedMemberCoveragePct: pct(observed, fieldRecords.length),
    newExpectedFields,
    noiseCandidateFields,
    noiseCandidates,
  };
}

async function runOnce({ runDir, browser, baseUrl, assetBaseUrl, rows, selectedProfiles, resume }) {
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad member candidate capture] ${row.filename}`);
    imageResults.push(await processImage({ browser, baseUrl, assetBaseUrl, row, runDir, selectedProfiles, resume }));
  }
  const summary = evaluate(rows, imageResults, selectedProfiles);
  await fs.writeFile(path.join(runDir, "member-field-records.json"), JSON.stringify(summary.fieldRecords, null, 2));
  await fs.writeFile(path.join(runDir, "profile-summary.json"), JSON.stringify(summary.profileSummaries, null, 2));
  await fs.writeFile(path.join(runDir, "combination-summary.json"), JSON.stringify(summary.combinations, null, 2));
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(artifactDir, "member-field-records.json"), JSON.stringify(summary.fieldRecords, null, 2));
  await fs.writeFile(path.join(artifactDir, "profile-summary.json"), JSON.stringify(summary.profileSummaries, null, 2));
  await fs.writeFile(path.join(artifactDir, "combination-summary.json"), JSON.stringify(summary.combinations, null, 2));
  await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
  return summary;
}

async function main() {
  const args = parseArgs();
  const selectedProfiles = args.profileIds.length
    ? profiles.filter((profile) => args.profileIds.includes(profile.id))
    : profiles;
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
      command: "node scripts/ipad-browser-member-candidate-capture.mjs",
      artifactDir: rel(artifactDir),
      totalImages: summary.totalImages,
      totalMemberFields: summary.totalMemberFields,
      productionMemberCoverage: summary.productionMemberCoverage,
      productionMemberCoveragePct: summary.productionMemberCoveragePct,
      profiles: summary.profileSummaries.map((entry) => ({
        id: entry.profile.id,
        newExpectedFields: entry.newExpectedFields,
        profileExpectedPresent: entry.profileExpectedPresent,
        noiseCandidateFields: entry.noiseCandidateFields,
        noiseCandidates: entry.noiseCandidates,
        emptyOcrFields: entry.emptyOcrFields,
        averageMs: entry.averageMs,
        recommendation: entry.recommendation,
      })),
      topCombinations: summary.combinations.slice(0, 10),
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
