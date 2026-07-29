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
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-member2-ocr-config");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const memberLabels = ["member1", "member2", "member3"];
const t2ProfileId = "ipad-grouped-number-token";
const tesseractPackageVersion = (() => {
  try {
    return JSON.parse(
      fsSync.readFileSync(path.join(rootDir, "node_modules", "tesseract.js", "package.json"), "utf8")
    ).version;
  } catch {
    return "unknown";
  }
})();

const productionMemberProfiles = [
  {
    id: "baseline-score-preprocess-3x-psm7",
    label: "Existing score preprocessing, default 4x, PSM 7",
    kind: "existing",
    scale: 4,
  },
  {
    id: "invert-normalize-3x-psm7",
    label: "Inverted grayscale normalize, 3x, PSM 7",
    kind: "invert-normalize",
    scale: 3,
  },
  {
    id: "white-mask-3x-psm7",
    label: "White-text mask, 3x, PSM 7",
    kind: "white-mask",
    scale: 3,
    threshold: 176,
  },
];

const ocrConfigs = [
  {
    id: "production-psm7-digits-punctuation-preserve",
    label: "Current production OCR config, PSM 7",
    pageSegMode: "7",
    charWhitelist: "0123456789,.",
    preserveInterwordSpaces: "1",
    numericMode: "",
  },
  {
    id: "psm6-digits-punctuation-preserve",
    label: "PSM 6, digits plus comma/period",
    pageSegMode: "6",
    charWhitelist: "0123456789,.",
    preserveInterwordSpaces: "1",
    numericMode: "",
  },
  {
    id: "psm8-digits-punctuation-preserve",
    label: "PSM 8, digits plus comma/period",
    pageSegMode: "8",
    charWhitelist: "0123456789,.",
    preserveInterwordSpaces: "1",
    numericMode: "",
  },
  {
    id: "psm10-digits-punctuation-preserve",
    label: "PSM 10, digits plus comma/period",
    pageSegMode: "10",
    charWhitelist: "0123456789,.",
    preserveInterwordSpaces: "1",
    numericMode: "",
  },
  {
    id: "psm13-digits-punctuation-preserve",
    label: "PSM 13, digits plus comma/period",
    pageSegMode: "13",
    charWhitelist: "0123456789,.",
    preserveInterwordSpaces: "1",
    numericMode: "",
  },
  {
    id: "psm7-digits-only-preserve",
    label: "PSM 7, digits only",
    pageSegMode: "7",
    charWhitelist: "0123456789",
    preserveInterwordSpaces: "1",
    numericMode: "",
  },
  {
    id: "psm7-digits-punctuation-no-preserve",
    label: "PSM 7, no preserved spaces",
    pageSegMode: "7",
    charWhitelist: "0123456789,.",
    preserveInterwordSpaces: "0",
    numericMode: "",
  },
  {
    id: "psm7-digits-punctuation-numeric-mode",
    label: "PSM 7, numeric mode",
    pageSegMode: "7",
    charWhitelist: "0123456789,.",
    preserveInterwordSpaces: "1",
    numericMode: "1",
  },
  {
    id: "psm8-digits-only-preserve",
    label: "PSM 8, digits only",
    pageSegMode: "8",
    charWhitelist: "0123456789",
    preserveInterwordSpaces: "1",
    numericMode: "",
  },
];

const historicalPreT2TierCApplicationKeys = new Set([
  "IMG_0264.png|stage1|enemy",
  "IMG_0264.png|stage2|self",
  "IMG_0270.png|stage2|self",
  "IMG_0306.png|stage1|self",
  "IMG_0306.png|stage1|enemy",
  "IMG_0317.png|stage2|self",
  "IMG_0322.png|stage2|self",
  "IMG_0337.png|stage2|enemy",
  "IMG_0491.png|stage1|self",
]);

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  const configIndex = process.argv.indexOf("--configs");
  return {
    runs: Math.max(1, Number(process.argv[runsIndex + 1] || process.env.IPAD_STAGE3_MEMBER2_CONFIG_RUNS || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_STAGE3_MEMBER2_CONFIG_BASE_URL || "",
    resume: process.argv.includes("--resume"),
    configIds:
      configIndex >= 0
        ? String(process.argv[configIndex + 1] || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    allMembers: process.argv.includes("--all-members"),
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

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, stable(child)])
  );
}

function stableJson(value) {
  return JSON.stringify(stable(value));
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
        "Playwright is required for iPad Stage3 member2 OCR config investigation.",
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

function expectedSide(expectedStage, side) {
  return {
    members: side === "self" ? expectedStage.selfMembers.map(Number) : expectedStage.enemyMembers.map(Number),
    bonus: Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0),
    total: Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0),
  };
}

function expectedMember(expected, stage, side, slot) {
  return expectedSide(expected[`stage${stage}`], side).members[slot - 1] || 0;
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
  const fields = {
    member1: actual.members[0] === expected.members[0],
    member2: actual.members[1] === expected.members[1],
    member3: actual.members[2] === expected.members[2],
    bonus: actual.bonus === expected.bonus,
    total: actual.total === expected.total,
  };
  return {
    pass: Object.values(fields).every(Boolean),
    fields,
    actual,
    expected,
  };
}

function selectedFieldValue(sideValue, label) {
  if (label.startsWith("member")) return sideValue.members[Number(label.replace("member", "")) - 1] || 0;
  return sideValue[label] || 0;
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

function currentPrimarySide(diagnostics, stage, side) {
  return normalizeSide(diagnostics.stages?.[`stage${stage}`]?.[side]?.currentPrimary || {});
}

function fieldPoolFor(diagnostics, stage, side, label) {
  return diagnostics.stages?.[`stage${stage}`]?.[side]?.candidatePools?.[label] || {};
}

function productionValues(pool = {}) {
  return unique((pool.candidates || []).map((candidate) => toNumber(candidate.value)).filter((value) => value > 0));
}

function productionCandidates(pool = {}) {
  return (pool.candidates || []).map((candidate) => ({
    value: toNumber(candidate.value),
    profileIds: candidate.profileIds || [],
    rawText: candidate.rawText || "",
    sourceRank: Number(candidate.sourceRank || 0),
    origin: candidate.origin || "observed",
  }));
}

function parseNumbers(text = "") {
  const candidates = [];
  const regex = /[+・･]?\s*(?:\d{1,3}(?:[,.\s]\d{3})+|\d{1,8})/g;
  for (const match of text.matchAll(regex)) {
    const raw = match[0] || "";
    const value = Number(raw.replace(/[^\d-]/g, ""));
    if (Number.isInteger(value) && value > 0) candidates.push({ raw, value });
  }
  return candidates;
}

function parseT2GroupedNumbers(text = "") {
  const out = [];
  const normalized = String(text || "").normalize("NFKC");
  const regex = /(^|[^\d,.])(\d{1,3}([,.])\d{3}(?:\3\d{3})*)(?=$|[^\d,.])/g;
  for (const match of normalized.matchAll(regex)) {
    const raw = match[2];
    const separator = match[3];
    const groups = raw.split(separator);
    if (groups.length < 2 || !groups.slice(1).every((group) => /^\d{3}$/.test(group))) continue;
    const value = Number(groups.join(""));
    if (!Number.isInteger(value) || value <= 0 || value > 9999999) continue;
    out.push({ raw, value, separator, groups });
  }
  return out;
}

function failureClass({ expected, values, rawTexts }) {
  const expectedDigits = String(expected);
  const allText = rawTexts.join("\n");
  const rawDigits = allText.replace(/\D/g, "");
  if (values.includes(expected)) return "exact-candidate-present";
  if (!allText.trim()) return "empty-ocr";
  if (allText.includes(expectedDigits)) return "exact-digits-in-raw-unparsed";
  if (rawDigits.includes(expectedDigits)) return "exact-digits-in-normalized-raw-unparsed";
  const first = values[0] || 0;
  const digits = String(first);
  if (first > 0 && digits.length < expectedDigits.length && expectedDigits.endsWith(digits)) return "deletion-leading";
  if (first > 0 && digits.length < expectedDigits.length && expectedDigits.startsWith(digits)) return "deletion-trailing";
  if (first > 0 && digits.length > expectedDigits.length) return "insertion-or-merged";
  if (first > 0 && digits.length === expectedDigits.length && first !== expected) return "substitution";
  if (/[A-Za-z]/.test(allText)) return "non-numeric-garbage";
  return values.length ? "wrong-numeric-candidate" : "incomplete-ocr-evidence";
}

function sideKey(image, stage, side) {
  return `${image}|stage${stage}|${side}`;
}

function tupleFromValues(values) {
  return {
    members: [values.member1, values.member2, values.member3],
    bonus: values.bonus,
    total: values.total,
  };
}

function arithmeticTuples(candidateSets) {
  if (Object.values(candidateSets).some((set) => !set.length)) return [];
  const tuples = [];
  for (const member1 of candidateSets.member1) {
    for (const member2 of candidateSets.member2) {
      for (const member3 of candidateSets.member3) {
        for (const bonus of candidateSets.bonus) {
          for (const total of candidateSets.total) {
            if (member1.value + member2.value + member3.value + bonus.value !== total.value) continue;
            tuples.push({
              members: [member1.value, member2.value, member3.value],
              bonus: bonus.value,
              total: total.value,
              origins: {
                member1: member1.origin,
                member2: member2.origin,
                member3: member3.origin,
                bonus: bonus.origin,
                total: total.origin,
              },
            });
          }
        }
      }
    }
  }
  return [...new Map(tuples.map((tuple) => [stableJson(tupleFromValues({
    member1: tuple.members[0],
    member2: tuple.members[1],
    member3: tuple.members[2],
    bonus: tuple.bonus,
    total: tuple.total,
  })), tuple])).values()];
}

function simulateTierCForSide({ diagnostics, stage, side, configId, captureByKey }) {
  const labels = ["member1", "member2", "member3", "bonus", "total"];
  const sets = {};
  for (const label of labels) {
    const pool = fieldPoolFor(diagnostics, stage, side, label);
    const observed = productionCandidates(pool).filter((candidate) => candidate.value > 0);
    const candidates = [...observed];
    if (stage === 3 && label === "member2") {
      const key = pool.key;
      const capture = captureByKey.get(key);
      const config = capture?.configResults?.find((entry) => entry.configId === configId);
      for (const candidate of config?.candidatesWithT2 || []) {
        if (!candidates.some((entry) => entry.value === candidate.value)) {
          candidates.push({
            value: candidate.value,
            profileIds: [candidate.profileId || configId],
            rawText: candidate.rawText || "",
            origin: `diagnostic-${configId}`,
          });
        }
      }
    }
    if (label === "bonus") {
      const current = diagnostics.stages?.[`stage${stage}`]?.[side]?.currentPrimary || {};
      if (Number(current.bonus || 0) === 0 && !candidates.some((candidate) => candidate.value === 0)) {
        candidates.push({ value: 0, profileIds: [], rawText: "", origin: "schema-default-bonus-zero" });
      }
    }
    sets[label] = unique(candidates.map((candidate) => candidate.value)).map((value) => ({
      value,
      origin: candidates.find((candidate) => candidate.value === value)?.origin || "observed",
    }));
  }
  const tuples = arithmeticTuples(sets);
  const current = currentPrimarySide(diagnostics, stage, side);
  const selectedTuple = tuples.length === 1 ? tuples[0] : null;
  const wouldApply =
    Boolean(selectedTuple) && !compareSide(selectedTuple, current).pass;
  return {
    configId,
    stage,
    side,
    candidateCounts: Object.fromEntries(Object.entries(sets).map(([key, value]) => [key, value.length])),
    validTupleCount: tuples.length,
    wouldApply,
    selectedTuple,
    blockReason:
      tuples.length === 0
        ? "zero arithmetic-valid tuples"
        : tuples.length > 1
          ? "multiple arithmetic-valid tuples"
          : wouldApply
            ? ""
            : "already identical",
  };
}

async function processImage({ browser, baseUrl, assetBaseUrl, row, runDir, selectedConfigs, includeAllMembers, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "stage3-member2-config-image.json");
  if (resume) {
    try {
      const existing = await loadJson(artifactPath);
      if (existing?.image === row.filename) return existing;
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
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, { timeout: 30000 });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad OCR config investigation.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, { timeout: 30000 });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);

    await page.addScriptTag({ url: `${assetBaseUrl}/tesseract.min.js` });
    const capture = await page.evaluate(
      async ({ configsToRun, profilesToRun, assetBaseUrl: tesseractAssetBaseUrl, includeAllMembers: allMembers }) => {
        const parseNumbersInBrowser = (text = "") => {
          const candidates = [];
          const regex = /[+・･]?\s*(?:\d{1,3}(?:[,.\s]\d{3})+|\d{1,8})/g;
          for (const match of text.matchAll(regex)) {
            const raw = match[0] || "";
            const value = Number(raw.replace(/[^\d-]/g, ""));
            if (Number.isInteger(value) && value > 0) candidates.push({ raw, value });
          }
          return candidates;
        };
        const parseT2InBrowser = (text = "") => {
          const out = [];
          const normalized = String(text || "").normalize("NFKC");
          const regex = /(^|[^\d,.])(\d{1,3}([,.])\d{3}(?:\3\d{3})*)(?=$|[^\d,.])/g;
          for (const match of normalized.matchAll(regex)) {
            const raw = match[2];
            const separator = match[3];
            const groups = raw.split(separator);
            if (groups.length < 2 || !groups.slice(1).every((group) => /^\d{3}$/.test(group))) continue;
            const value = Number(groups.join(""));
            if (!Number.isInteger(value) || value <= 0 || value > 9999999) continue;
            out.push({ raw, value, separator, groups });
          }
          return out;
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
          .filter((pool) => allMembers || (pool.stage === 3 && pool.slot === 2))
          .map((pool) => ({
            key: pool.key,
            stage: pool.stage,
            side: pool.side,
            slot: pool.slot,
            zone: pool.zone,
          }));

        const preprocess = (field, profile) => {
          const paddingRatio = 0.12;
          const padX = Math.max(2, Math.round(field.zone.width * paddingRatio));
          const padY = Math.max(2, Math.round(field.zone.height * paddingRatio));
          const crop = {
            x: Math.max(0, Math.round(field.zone.x - padX)),
            y: Math.max(0, Math.round(field.zone.y - padY)),
            width: Math.max(1, Math.round(field.zone.width + padX * 2)),
            height: Math.max(1, Math.round(field.zone.height + padY * 2)),
          };
          crop.width = Math.min(crop.width, image.naturalWidth - crop.x);
          crop.height = Math.min(crop.height, image.naturalHeight - crop.y);
          const processAtSourceScale = profile.kind === "invert-normalize" || profile.kind === "white-mask";
          const scale = profile.scale || 4;
          const canvas = document.createElement("canvas");
          canvas.width = processAtSourceScale ? crop.width : crop.width * scale;
          canvas.height = processAtSourceScale ? crop.height : crop.height * scale;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.fillStyle = "white";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.imageSmoothingEnabled = true;
          context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = r * 0.299 + g * 0.587 + b * 0.114;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;
            if (profile.kind === "invert-normalize") {
              const inverted = 255 - gray;
              data[i] = inverted;
              data[i + 1] = inverted;
              data[i + 2] = inverted;
              continue;
            }
            if (profile.kind === "white-mask") {
              const isDigit = max >= (profile.threshold || 176) && saturation < 130;
              const maskValue = isDigit ? 0 : 255;
              data[i] = maskValue;
              data[i + 1] = maskValue;
              data[i + 2] = maskValue;
              continue;
            }
            const adjustedGray = gray;
            const isWhiteText = adjustedGray > 175 && saturation < 90;
            const isBrightNextScreenText = max > 172 && gray > 118 && saturation < 175;
            const isColorfulBackground = saturation >= 70;
            let value;
            if (isWhiteText || isBrightNextScreenText) value = 0;
            else if (isColorfulBackground) value = 255;
            else if (adjustedGray > 165) value = 0;
            else if (adjustedGray < 90) value = 255;
            else value = adjustedGray > 130 ? 0 : 255;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
          }
          context.putImageData(imageData, 0, 0);
          return { crop, processedWidth: canvas.width, processedHeight: canvas.height, canvas };
        };

        const currentConfig = configsToRun.find((config) => config.id === "production-psm7-digits-punctuation-preserve");
        const worker = await window.Tesseract.createWorker("eng", 1, {
          workerPath: `${tesseractAssetBaseUrl}/worker.min.js`,
          corePath: `${tesseractAssetBaseUrl}/tesseract-core-simd-lstm.wasm.js`,
          langPath: tesseractAssetBaseUrl,
        });
        const recognizeCanvas = async (canvas, config) => {
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
          const parameters = {
            tessedit_char_whitelist: config.charWhitelist || "0123456789,.",
            tessedit_pageseg_mode: config.pageSegMode || "7",
            preserve_interword_spaces: config.preserveInterwordSpaces || "1",
          };
          if (config.numericMode) parameters.classify_bln_numeric_mode = config.numericMode;
          const started = performance.now();
          await worker.setParameters(parameters);
          const result = await worker.recognize(blob);
          return {
            rawText: result?.data?.text || "",
            confidence: Number(result?.data?.confidence || 0),
            elapsedMs: Math.round(performance.now() - started),
            words: (result?.data?.words || []).map((word) => ({
              text: word.text || "",
              confidence: Number(word.confidence || 0),
              bbox: word.bbox || null,
            })),
            symbols: (result?.data?.symbols || []).slice(0, 80).map((symbol) => ({
              text: symbol.text || "",
              confidence: Number(symbol.confidence || 0),
              bbox: symbol.bbox || null,
            })),
          };
        };

        const records = [];
        for (const field of fields) {
          const profileResults = [];
          for (const profile of profilesToRun) {
            const prepared = preprocess(field, profile);
            const configResults = [];
            for (const config of configsToRun) {
              let result;
              try {
                result = await recognizeCanvas(prepared.canvas, config);
              } catch (error) {
                result = {
                  rawText: "",
                  confidence: 0,
                  elapsedMs: 0,
                  words: [],
                  symbols: [],
                  error: error?.message || String(error),
                };
              }
              const parsedCandidates = parseNumbersInBrowser(result.rawText);
              const t2Candidates = parseT2InBrowser(result.rawText);
              configResults.push({
                configId: config.id,
                rawText: result.rawText,
                confidence: result.confidence,
                elapsedMs: result.elapsedMs,
                words: result.words,
                symbols: result.symbols,
                parsedCandidates,
                t2Candidates,
                values: [...new Set(parsedCandidates.map((candidate) => candidate.value).filter((value) => value > 0))],
                valuesWithT2: [
                  ...new Set([
                    ...parsedCandidates.map((candidate) => candidate.value).filter((value) => value > 0),
                    ...t2Candidates.map((candidate) => candidate.value),
                  ]),
                ],
                error: result.error || "",
              });
            }
            profileResults.push({
              profileId: profile.id,
              label: profile.label,
              crop: prepared.crop,
              processedWidth: prepared.processedWidth,
              processedHeight: prepared.processedHeight,
              configResults,
            });
          }
          records.push({ field, profileResults });
        }

        const freshWorkerCheck = [];
        if (currentConfig) {
          for (const field of fields.filter((entry) => entry.stage === 3 && entry.slot === 2).slice(0, 4)) {
            const profile = profilesToRun[0];
            const prepared = preprocess(field, profile);
            const worker2 = await window.Tesseract.createWorker("eng", 1, {
              workerPath: `${tesseractAssetBaseUrl}/worker.min.js`,
              corePath: `${tesseractAssetBaseUrl}/tesseract-core-simd-lstm.wasm.js`,
              langPath: tesseractAssetBaseUrl,
            });
            await worker2.setParameters({
              tessedit_char_whitelist: currentConfig.charWhitelist,
              tessedit_pageseg_mode: currentConfig.pageSegMode,
              preserve_interword_spaces: currentConfig.preserveInterwordSpaces,
            });
            const blob = await new Promise((resolve) => prepared.canvas.toBlob(resolve, "image/png"));
            const result = await worker2.recognize(blob);
            await worker2.terminate();
            freshWorkerCheck.push({
              key: field.key,
              profileId: profile.id,
              configId: currentConfig.id,
              rawText: result?.data?.text || "",
              confidence: Number(result?.data?.confidence || 0),
            });
          }
        }
        await worker.terminate();
        URL.revokeObjectURL(imageUrl);
        return {
          schema: "ipad-stage3-member2-ocr-config-browser-capture-v1",
          tesseract: {
            globalVersion: window.Tesseract?.version || "",
            engine: "tesseract.js-browser",
            language: "eng",
            workerPath: `${tesseractAssetBaseUrl}/worker.min.js`,
            corePath: `${tesseractAssetBaseUrl}/tesseract-core-simd-lstm.wasm.js`,
            langPath: tesseractAssetBaseUrl,
            workerReuse: "single worker reused per image for matrix; fresh-worker spot check recorded separately",
            recognitionApi: "worker.recognize(blob)",
          },
          configs: configsToRun,
          profiles: profilesToRun,
          records,
          freshWorkerCheck,
        };
      },
      {
        configsToRun: selectedConfigs,
        profilesToRun: productionMemberProfiles,
        assetBaseUrl,
        includeAllMembers,
      }
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

function mergedConfigResult(record, configId) {
  const rawTexts = [];
  const values = [];
  const valuesWithT2 = [];
  const candidates = [];
  let confidence = 0;
  let elapsedMs = 0;
  const profileBreakdown = [];
  for (const profile of record.profileResults || []) {
    const result = (profile.configResults || []).find((entry) => entry.configId === configId);
    if (!result) continue;
    rawTexts.push(result.rawText || "");
    confidence = Math.max(confidence, Number(result.confidence || 0));
    elapsedMs += Number(result.elapsedMs || 0);
    for (const candidate of result.parsedCandidates || []) {
      values.push(toNumber(candidate.value));
      candidates.push({
        value: toNumber(candidate.value),
        raw: candidate.raw,
        rawText: result.rawText || "",
        profileId: profile.profileId,
        configId,
        source: "raw-current-parser",
      });
    }
    for (const candidate of result.t2Candidates || []) {
      valuesWithT2.push(toNumber(candidate.value));
      candidates.push({
        value: toNumber(candidate.value),
        raw: candidate.raw,
        rawText: result.rawText || "",
        profileId: profile.profileId,
        configId,
        source: t2ProfileId,
      });
    }
    for (const value of result.values || []) valuesWithT2.push(toNumber(value));
    profileBreakdown.push({
      profileId: profile.profileId,
      crop: profile.crop,
      processedWidth: profile.processedWidth,
      processedHeight: profile.processedHeight,
      rawText: result.rawText || "",
      confidence: Number(result.confidence || 0),
      elapsedMs: Number(result.elapsedMs || 0),
      values: result.values || [],
      t2Values: (result.t2Candidates || []).map((candidate) => toNumber(candidate.value)),
      words: result.words || [],
      symbols: result.symbols || [],
      error: result.error || "",
    });
  }
  return {
    configId,
    rawTexts,
    confidence,
    elapsedMs,
    values: unique(values.filter((value) => value > 0)),
    valuesWithT2: unique(valuesWithT2.filter((value) => value > 0)),
    candidates,
    profileBreakdown,
  };
}

function evaluateRun(rows, imageResults, selectedConfigs) {
  const stage3Member2Records = [];
  const allMemberRecords = [];
  const captureRecords = [];
  const currentProduction = {
    imagePass: 0,
    stagePass: 0,
    stageSidePass: 0,
    tierCApplications: 0,
    tp: 0,
    fp: 0,
  };

  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const diagnostics = imageResult?.diagnostics || {};
    const appliedCases = diagnostics.productionRecovery?.appliedCases || [];
    currentProduction.tierCApplications += appliedCases.length;
    let imagePass = true;
    for (const stage of stages) {
      let stagePass = true;
      for (const side of sides) {
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const actual = displayedSide(diagnostics, stage, side);
        const pass = compareSide(actual, expected).pass;
        currentProduction.stageSidePass += pass ? 1 : 0;
        stagePass &&= pass;
        const applied = appliedCases.find((entry) => entry.stage === stage && entry.side === side);
        if (applied) {
          if (pass) currentProduction.tp += 1;
          else currentProduction.fp += 1;
        }
      }
      currentProduction.stagePass += stagePass ? 1 : 0;
      imagePass &&= stagePass;
    }
    currentProduction.imagePass += imagePass ? 1 : 0;

    const captureByKey = new Map((imageResult?.capture?.records || []).map((record) => [record.field.key, record]));
    for (const record of imageResult?.capture?.records || []) {
      captureRecords.push({ image: row.filename, clusterId: row.clusterId, ...record });
    }
    for (const stage of stages) {
      for (const side of sides) {
        for (const slot of [1, 2, 3]) {
          const label = `member${slot}`;
          const expected = expectedMember(row.expected, stage, side, slot);
          const actual = displayedSide(diagnostics, stage, side).members[slot - 1] || 0;
          const pool = fieldPoolFor(diagnostics, stage, side, label);
          const prodValues = productionValues(pool);
          const key = pool.key || `${row.filename}|${stage}|${side}|member|${slot}`;
          const capture = captureByKey.get(key);
          const configSummaries = selectedConfigs.map((config) => {
            const merged = capture ? mergedConfigResult(capture, config.id) : null;
            return {
              configId: config.id,
              expectedPresentRaw: Boolean(merged?.values.includes(expected)),
              expectedPresentWithT2: Boolean(merged?.valuesWithT2.includes(expected)),
              values: merged?.values || [],
              valuesWithT2: merged?.valuesWithT2 || [],
              rawTexts: merged?.rawTexts || [],
              confidence: merged?.confidence || 0,
              elapsedMs: merged?.elapsedMs || 0,
              failureClass: merged
                ? failureClass({ expected, values: merged.valuesWithT2, rawTexts: merged.rawTexts })
                : "not-captured",
            };
          });
          const fieldRecord = {
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            slot,
            label,
            expected,
            actual,
            finalExact: actual === expected,
            productionExpectedPresent: prodValues.includes(expected),
            productionValues: prodValues,
            captured: Boolean(capture),
            configSummaries,
          };
          allMemberRecords.push(fieldRecord);
          if (stage === 3 && slot === 2) stage3Member2Records.push(fieldRecord);
        }
      }
    }
  }
  currentProduction.imageFail = rows.length - currentProduction.imagePass;
  currentProduction.stageFail = rows.length * 3 - currentProduction.stagePass;
  currentProduction.stageSideFail = rows.length * 6 - currentProduction.stageSidePass;

  const configStats = selectedConfigs.map((config) => {
    const records = stage3Member2Records;
    const summaries = records.map((record) => record.configSummaries.find((entry) => entry.configId === config.id));
    const exactRaw = summaries.filter((entry) => entry?.expectedPresentRaw).length;
    const exactWithT2 = summaries.filter((entry) => entry?.expectedPresentWithT2).length;
    const newlyRecovered = records.filter(
      (record) =>
        !record.productionExpectedPresent &&
        record.configSummaries.find((entry) => entry.configId === config.id)?.expectedPresentWithT2
    );
    const wrongCandidateFields = records.filter((record) => {
      const summary = record.configSummaries.find((entry) => entry.configId === config.id);
      return (summary?.valuesWithT2 || []).some((value) => value !== record.expected);
    });
    const emptyFields = summaries.filter((entry) => !(entry?.rawTexts || []).join("").trim()).length;
    const candidateCounts = summaries.map((entry) => (entry?.valuesWithT2 || []).length);
    return {
      config,
      fields: records.length,
      exactRaw,
      exactWithT2,
      newlyRecoveredFields: newlyRecovered.length,
      lostProductionEvidenceFields: records.filter(
        (record) =>
          record.productionExpectedPresent &&
          !record.configSummaries.find((entry) => entry.configId === config.id)?.expectedPresentWithT2
      ).length,
      wrongCandidateFields: wrongCandidateFields.length,
      emptyFields,
      averageCandidateCount: Number((candidateCounts.reduce((sum, value) => sum + value, 0) / Math.max(1, candidateCounts.length)).toFixed(2)),
      averageRuntimeMs: Math.round(
        summaries.reduce((sum, entry) => sum + Number(entry?.elapsedMs || 0), 0) / Math.max(1, summaries.length)
      ),
      failureTaxonomy: countMap(
        records.map((record) => record.configSummaries.find((entry) => entry.configId === config.id)),
        (entry) => entry?.failureClass || "missing"
      ),
      newlyRecoveredDetails: newlyRecovered.map((record) => ({
        image: record.image,
        clusterId: record.clusterId,
        side: record.side,
        expected: record.expected,
        actual: record.actual,
        values: record.configSummaries.find((entry) => entry.configId === config.id)?.valuesWithT2 || [],
      })),
    };
  });

  const stage3SideRows = [];
  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const diagnostics = imageResult?.diagnostics || {};
    const captureByKey = new Map((imageResult?.capture?.records || []).map((record) => [record.field.key, record]));
    for (const side of sides) {
      const expected = expectedSide(row.expected.stage3, side);
      const current = displayedSide(diagnostics, 3, side);
      const currentPass = compareSide(current, expected).pass;
      for (const config of selectedConfigs) {
        const proposal = simulateTierCForSide({
          diagnostics,
          stage: 3,
          side,
          configId: config.id,
          captureByKey,
        });
        const proposedPass = proposal.selectedTuple ? compareSide(proposal.selectedTuple, expected).pass : currentPass;
        stage3SideRows.push({
          image: row.filename,
          clusterId: row.clusterId,
          stage: 3,
          side,
          configId: config.id,
          currentPass,
          current,
          expected,
          proposal,
          proposedPass,
          tp: !currentPass && proposal.wouldApply && proposedPass,
          fp: proposal.wouldApply && !proposedPass,
        });
      }
    }
  }
  const tierCSimulationByConfig = selectedConfigs.map((config) => {
    const rowsForConfig = stage3SideRows.filter((row) => row.configId === config.id);
    return {
      configId: config.id,
      tierCApplications: rowsForConfig.filter((row) => row.proposal.wouldApply).length,
      tp: rowsForConfig.filter((row) => row.tp).length,
      fp: rowsForConfig.filter((row) => row.fp).length,
      newTpApplications: rowsForConfig.filter((row) => row.tp).length,
      lostTpApplications: 0,
      multipleValidTupleChanges: rowsForConfig.filter((row) => row.proposal.validTupleCount > 1).length,
      stageSideGain: rowsForConfig.filter((row) => !row.currentPass && row.proposedPass).length,
      existingPassSidesLost: rowsForConfig.filter((row) => row.currentPass && !row.proposedPass).length,
      finalStageSidePass: currentProduction.stageSidePass + rowsForConfig.filter((row) => !row.currentPass && row.proposedPass).length,
      acceptedRows: rowsForConfig.filter((row) => row.tp || row.fp),
    };
  });

  const addressable8 = stage3Member2Records
    .filter((record) => !record.finalExact && record.productionValues.some((value) => value !== record.expected))
    .filter((record) => {
      const current = displayedSide(
        imageResults.find((entry) => entry.image === record.image)?.diagnostics || {},
        record.stage,
        record.side
      );
      const expected = expectedSide(rows.find((row) => row.filename === record.image).expected.stage3, record.side);
      const patched = { ...current, members: [...current.members] };
      patched.members[1] = expected.members[1];
      return compareSide(patched, expected).pass;
    })
    .slice(0, 8)
    .map((record) => ({
      image: record.image,
      clusterId: record.clusterId,
      stage: record.stage,
      side: record.side,
      currentMember2: record.actual,
      expectedMember2: record.expected,
      productionValues: record.productionValues,
      configsRecoveringMember2: record.configSummaries
        .filter((summary) => summary.expectedPresentWithT2)
        .map((summary) => summary.configId),
    }));

  const allMemberCandidateConfigStats = selectedConfigs.map((config) => {
    const records = allMemberRecords.filter((record) => record.captured);
    return {
      configId: config.id,
      fields: records.length,
      stage1Member2Effects: records.filter(
        (record) => record.stage === 1 && record.slot === 2 && record.configSummaries.find((entry) => entry.configId === config.id)?.expectedPresentWithT2
      ).length,
      stage2Member2Effects: records.filter(
        (record) => record.stage === 2 && record.slot === 2 && record.configSummaries.find((entry) => entry.configId === config.id)?.expectedPresentWithT2
      ).length,
      stage3Member2Effects: records.filter(
        (record) => record.stage === 3 && record.slot === 2 && record.configSummaries.find((entry) => entry.configId === config.id)?.expectedPresentWithT2
      ).length,
      exactCandidateGains: records.filter(
        (record) =>
          !record.productionExpectedPresent &&
          record.configSummaries.find((entry) => entry.configId === config.id)?.expectedPresentWithT2
      ).length,
      wrongCandidateFields: records.filter((record) => {
        const summary = record.configSummaries.find((entry) => entry.configId === config.id);
        return (summary?.valuesWithT2 || []).some((value) => value !== record.expected);
      }).length,
    };
  });

  const bestConfig = configStats
    .filter((entry) => {
      const tierC = tierCSimulationByConfig.find((sim) => sim.configId === entry.config.id);
      return tierC?.fp === 0 && tierC?.existingPassSidesLost === 0 && entry.exactWithT2 > 0;
    })
    .sort((a, b) => {
      const simA = tierCSimulationByConfig.find((entry) => entry.configId === a.config.id);
      const simB = tierCSimulationByConfig.find((entry) => entry.configId === b.config.id);
      if ((simB?.stageSideGain || 0) !== (simA?.stageSideGain || 0)) {
        return (simB?.stageSideGain || 0) - (simA?.stageSideGain || 0);
      }
      if (b.exactWithT2 !== a.exactWithT2) return b.exactWithT2 - a.exactWithT2;
      return a.wrongCandidateFields - b.wrongCandidateFields;
    })[0];

  return {
    schema: "ipad-stage3-member2-ocr-config-investigation-summary-v1",
    productionBaseline: {
      images: { pass: currentProduction.imagePass, total: rows.length },
      stages: { pass: currentProduction.stagePass, total: rows.length * 3 },
      stageSides: { pass: currentProduction.stageSidePass, total: rows.length * 6 },
      tierCApplications: currentProduction.tierCApplications,
      tp: currentProduction.tp,
      fp: currentProduction.fp,
      preT2TierCApplications: historicalPreT2TierCApplicationKeys.size,
      t2AdditionalApplications: currentProduction.tierCApplications - historicalPreT2TierCApplicationKeys.size,
    },
    currentConfig: {
      engine: "tesseract.js-browser",
      library: "tesseract.js",
      libraryVersion: tesseractPackageVersion,
      language: "eng",
      productionMemberProfiles,
      pageSegMode: "7",
      charWhitelist: "0123456789,.",
      preserveInterwordSpaces: "1",
      numericMode: "not set",
      workerReuse: "production uses Tesseract.recognize per field/profile; diagnostic uses one browser worker per image for matrix plus fresh-worker spot checks",
      recognitionApi: "Tesseract.recognize(blob) in production; worker.recognize(blob) in diagnostic",
    },
    testedConfigs: selectedConfigs,
    stage3Member2: {
      fields: stage3Member2Records.length,
      productionExactPresence: stage3Member2Records.filter((record) => record.productionExpectedPresent).length,
      productionFinalExact: stage3Member2Records.filter((record) => record.finalExact).length,
      configStats,
    },
    tierCSimulation: tierCSimulationByConfig,
    addressable8,
    allMemberCandidateConfigStats,
    failureTaxonomy: Object.fromEntries(configStats.map((entry) => [entry.config.id, entry.failureTaxonomy])),
    rawOcrResults: captureRecords,
    recommendedConfig: bestConfig
      ? {
          configId: bestConfig.config.id,
          label: bestConfig.config.label,
          recommendation:
            tierCSimulationByConfig.find((entry) => entry.configId === bestConfig.config.id)?.stageSideGain >= 2
              ? "candidate for a future parity review"
              : "diagnostic evidence only; no production recommendation yet",
          reason: `${bestConfig.exactWithT2}/36 Stage3 member2 exact candidates with ${
            tierCSimulationByConfig.find((entry) => entry.configId === bestConfig.config.id)?.fp || 0
          } simulated Tier C FP.`,
        }
      : {
          configId: null,
          label: "No OCR config materially improves Stage3 member2",
          recommendation: "switch to symbol/bbox-aware segmentation investigation",
          reason:
            "No tested OCR configuration creates stable exact Stage3 member2 evidence with useful Tier C gain and zero FP.",
        },
  };
}

function countMap(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function stabilityReport(runAnalyses) {
  const signatures = runAnalyses.map((analysis) =>
    stableJson({
      productionBaseline: analysis.productionBaseline,
      configStats: analysis.stage3Member2.configStats.map((entry) => ({
        configId: entry.config.id,
        exactWithT2: entry.exactWithT2,
        wrongCandidateFields: entry.wrongCandidateFields,
        emptyFields: entry.emptyFields,
        failureTaxonomy: entry.failureTaxonomy,
      })),
      tierCSimulation: analysis.tierCSimulation.map((entry) => ({
        configId: entry.configId,
        tp: entry.tp,
        fp: entry.fp,
        stageSideGain: entry.stageSideGain,
        existingPassSidesLost: entry.existingPassSidesLost,
      })),
      recommendedConfig: analysis.recommendedConfig,
    })
  );
  return {
    runs: runAnalyses.length,
    stable: new Set(signatures).size === 1,
    signatures,
  };
}

async function writeArtifacts(outputDir, analysis) {
  await fs.writeFile(path.join(outputDir, "config-matrix.json"), JSON.stringify(analysis.testedConfigs, null, 2));
  await fs.writeFile(path.join(outputDir, "current-config.json"), JSON.stringify(analysis.currentConfig, null, 2));
  await fs.writeFile(path.join(outputDir, "raw-ocr-results.json"), JSON.stringify(analysis.rawOcrResults, null, 2));
  await fs.writeFile(path.join(outputDir, "failure-taxonomy.json"), JSON.stringify(analysis.failureTaxonomy, null, 2));
  await fs.writeFile(path.join(outputDir, "addressable-8-audit.json"), JSON.stringify(analysis.addressable8, null, 2));
  await fs.writeFile(path.join(outputDir, "tier-c-simulation.json"), JSON.stringify(analysis.tierCSimulation, null, 2));
  await fs.writeFile(path.join(outputDir, "runtime.json"), JSON.stringify(analysis.stage3Member2.configStats.map((entry) => ({
    configId: entry.config.id,
    averageRuntimeMs: entry.averageRuntimeMs,
  })), null, 2));
  await fs.writeFile(path.join(outputDir, "recommended-config.json"), JSON.stringify(analysis.recommendedConfig, null, 2));
  await fs.writeFile(path.join(outputDir, "summary.json"), JSON.stringify(analysis, null, 2));
}

async function runOnce({ runIndex, browser, baseUrl, assetBaseUrl, rows, selectedConfigs, includeAllMembers, resume }) {
  const runDir = path.join(artifactDir, `run-${runIndex}`);
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad Stage3 member2 OCR config run ${runIndex}] ${row.filename}`);
    imageResults.push(
      await processImage({
        browser,
        baseUrl,
        assetBaseUrl,
        row,
        runDir,
        selectedConfigs,
        includeAllMembers,
        resume,
      })
    );
  }
  const analysis = evaluateRun(rows, imageResults, selectedConfigs);
  await writeArtifacts(runDir, analysis);
  await fs.writeFile(
    path.join(runDir, "console-errors.json"),
    JSON.stringify(imageResults.flatMap((image) => image.consoleMessages.map((entry) => ({ image: image.image, ...entry }))), null, 2)
  );
  await fs.writeFile(
    path.join(runDir, "page-errors.json"),
    JSON.stringify(imageResults.flatMap((image) => image.pageErrors.map((entry) => ({ image: image.image, ...entry }))), null, 2)
  );
  return analysis;
}

async function main() {
  const args = parseArgs();
  if (!args.resume) await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
  const rows = await collectFixtures();
  const selectedConfigs = args.configIds.length
    ? ocrConfigs.filter((config) => args.configIds.includes(config.id))
    : ocrConfigs;
  if (!selectedConfigs.length) throw new Error("No OCR configs selected.");
  const playwright = await loadPlaywright();
  const port = args.baseUrl ? null : args.port || (await findFreePort());
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;
  let server = null;
  if (!(await isServerReady(baseUrl))) {
    server = startDevServer(port);
    await waitForServer(baseUrl);
  }
  const assetServer = await startTesseractAssetServer();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const runAnalyses = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      runAnalyses.push(
        await runOnce({
          runIndex,
          browser,
          baseUrl,
          assetBaseUrl: assetServer.baseUrl,
          rows,
          selectedConfigs,
          includeAllMembers: args.allMembers,
          resume: args.resume,
        })
      );
    }
    const latest = runAnalyses.at(-1);
    const stability = stabilityReport(runAnalyses);
    await writeArtifacts(artifactDir, latest);
    await fs.writeFile(path.join(artifactDir, "run-stability.json"), JSON.stringify(stability, null, 2));
    const summary = {
      command: `node scripts/ipad-stage3-member2-ocr-config-investigation.mjs --runs ${args.runs}`,
      artifactDir: rel(artifactDir),
      baseUrl,
      productionBaseline: latest.productionBaseline,
      configStats: latest.stage3Member2.configStats.map((entry) => ({
        configId: entry.config.id,
        exactWithT2: entry.exactWithT2,
        newlyRecoveredFields: entry.newlyRecoveredFields,
        wrongCandidateFields: entry.wrongCandidateFields,
        emptyFields: entry.emptyFields,
        averageCandidateCount: entry.averageCandidateCount,
        averageRuntimeMs: entry.averageRuntimeMs,
      })),
      tierCSimulation: latest.tierCSimulation.map((entry) => ({
        configId: entry.configId,
        tp: entry.tp,
        fp: entry.fp,
        stageSideGain: entry.stageSideGain,
        existingPassSidesLost: entry.existingPassSidesLost,
        finalStageSidePass: entry.finalStageSidePass,
      })),
      addressable8: latest.addressable8,
      allMemberCandidateConfigStats: latest.allMemberCandidateConfigStats,
      recommendedConfig: latest.recommendedConfig,
      stability,
      productionBaselinePass:
        latest.productionBaseline.stageSides.pass === 40 &&
        latest.productionBaseline.tierCApplications === 24 &&
        latest.productionBaseline.tp === 24 &&
        latest.productionBaseline.fp === 0,
    };
    await fs.writeFile(path.join(artifactDir, "combined-summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.productionBaselinePass || !stability.stable) process.exitCode = 1;
  } finally {
    await browser.close();
    await assetServer.close();
    await fs.writeFile(
      path.join(artifactDir, "dev-server.log.json"),
      JSON.stringify(server?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }], null, 2)
    );
    await stopDevServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
