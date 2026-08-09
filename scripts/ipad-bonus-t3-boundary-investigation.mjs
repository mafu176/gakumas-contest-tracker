import fs from "node:fs/promises";
import fsSync from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const artifactDir = path.join(rootDir, "tmp", "ipad-bonus-t3-boundary-investigation");
const productionVerificationDir = path.join(rootDir, "tmp", "ipad-browser-production-verification");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const tierNames = ["T3A", "T3B", "T3C", "T3D"];

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    runs: Math.max(1, Number(process.argv[runsIndex + 1] || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_BONUS_T3_BOUNDARY_BASE_URL || "",
    resume: process.argv.includes("--resume"),
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
  return [...new Set(values.filter((value) => Number.isFinite(value) && value >= 0))];
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
      try {
        const configuredRequire = createRequire(path.join(configuredModuleDir, "package.json"));
        return configuredRequire("playwright");
      } catch {
        // Fall through to the explicit error below.
      }
    }
    throw new Error(
      [
        "Playwright is required for iPad bonus T3 boundary investigation.",
        "Set PLAYWRIGHT_NODE_MODULES to a node_modules directory containing playwright if it is not installed locally.",
        `Original error: ${error.message}`,
      ].join("\n")
    );
  }
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function isServerReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 120000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
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
  server.child.kill();
  await new Promise((resolve) => setTimeout(resolve, 500));
}

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

function resolveTesseractAssetPath(relativePath) {
  const candidates = [
    path.join(rootDir, "node_modules", "tesseract.js", "dist", relativePath),
    path.join(rootDir, "node_modules", "tesseract.js-core", relativePath),
  ];
  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) return candidate;
  }
  throw new Error(`Unable to locate Tesseract asset: ${relativePath}`);
}

async function startTesseractAssetServer() {
  const port = await findFreePort();
  const routes = {
    "/tesseract.min.js": resolveTesseractAssetPath("tesseract.min.js"),
    "/worker.min.js": resolveTesseractAssetPath("worker.min.js"),
    "/tesseract-core-simd-lstm.wasm.js": resolveTesseractAssetPath("tesseract-core-simd-lstm.wasm.js"),
    "/eng.traineddata.gz": path.join(rootDir, "node_modules", "tesseract.js", "dist", "eng.traineddata.gz"),
  };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
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
    if (candidate.rawText) {
      texts.push({
        rawText: candidate.rawText,
        source: candidate.profileId || "candidate",
        rawCandidate: candidate.rawCandidate || "",
        confidence: candidate.confidence ?? null,
      });
    }
    for (const contribution of candidate.contributions || []) {
      if (contribution.rawText) {
        texts.push({
          rawText: contribution.rawText,
          source: contribution.profileId || "contribution",
          rawCandidate: contribution.rawCandidate || "",
          confidence: contribution.confidence ?? null,
        });
      }
    }
  }
  const seen = new Set();
  return texts.filter((entry) => {
    const key = `${entry.source}|${entry.rawText}|${entry.rawCandidate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(text) {
  return String(text || "")
    .replace(/[＋]/g, "+")
    .replace(/[，]/g, ",")
    .replace(/[．]/g, ".")
    .replace(/\r\n?/g, "\n");
}

function numericRuns(text) {
  const normalized = normalizeText(text);
  const runs = [];
  for (const match of normalized.matchAll(/(?<![A-Za-z0-9])(?:[+＋]\s*)?[\d,. ]{5,12}(?![A-Za-z0-9])/g)) {
    const raw = match[0];
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length < 5 || digits.length > 6) continue;
    const start = match.index || 0;
    const end = start + raw.length;
    const before = normalized[start - 1] || "";
    const after = normalized[end] || "";
    const lineStart = normalized.lastIndexOf("\n", start - 1) + 1;
    const lineEndCandidate = normalized.indexOf("\n", end);
    const lineEnd = lineEndCandidate >= 0 ? lineEndCandidate : normalized.length;
    const line = normalized.slice(lineStart, lineEnd);
    const leftGap = raw.match(/^\s*/)?.[0]?.length || 0;
    const rightGap = raw.match(/\s*$/)?.[0]?.length || 0;
    runs.push({
      raw,
      digits,
      value: Number(digits),
      start,
      end,
      before,
      after,
      line,
      lineStart,
      lineEnd,
      hasWhitespaceBoundary: /^\s|[\n\t ]/.test(before) || /[\n\t ]/.test(after),
      hasLineBoundary: before === "\n" || after === "\n" || line.trim() === raw.trim(),
      hasPunctuationBoundary: /[,.]/.test(before) || /[,.]/.test(after) || /[,.]/.test(raw),
      hasNonDigitBoundary:
        (before && !/[A-Za-z0-9]/.test(before)) || (after && !/[A-Za-z0-9]/.test(after)),
      hasExplicitTokenBoundary:
        (!before || !/[A-Za-z0-9]/.test(before)) && (!after || !/[A-Za-z0-9]/.test(after)),
      lineTrimIsNumeric: /^[+]?\s*[\d,. ]+$/.test(line.trim()),
      leftGap,
      rightGap,
    });
  }
  return runs;
}

function broadT3(rawEntries) {
  const out = [];
  for (const entry of rawEntries) {
    for (const run of numericRuns(entry.rawText)) {
      out.push({ ...run, source: entry.source, rawText: entry.rawText, tier: "broadT3" });
    }
  }
  return dedupeCandidates(out);
}

function dedupeCandidates(entries) {
  return [...new Map(entries.map((entry) => [`${entry.value}|${entry.raw}|${entry.source}|${entry.start}`, entry])).values()];
}

function tierCandidates(rawEntries) {
  const buckets = { T3A: [], T3B: [], T3C: [], T3D: [] };
  for (const entry of rawEntries) {
    for (const run of numericRuns(entry.rawText)) {
      const base = { ...run, source: entry.source, rawText: entry.rawText };
      const trimmed = run.raw.trim();
      if (/^[+]?\s*\d{5,6}$/.test(trimmed) && run.line.trim() === trimmed) {
        buckets.T3A.push({ ...base, tier: "T3A" });
      }
      if ((run.hasWhitespaceBoundary || run.hasLineBoundary) && /^[+]?\s*[\d ]{5,8}$/.test(run.raw)) {
        buckets.T3B.push({ ...base, tier: "T3B" });
      }
      if (run.hasExplicitTokenBoundary && !/[,.]/.test(run.raw) && /^[+]?\s*\d{5,6}\s*$/.test(run.raw)) {
        buckets.T3C.push({ ...base, tier: "T3C" });
      }
      if (
        run.hasExplicitTokenBoundary &&
        run.lineTrimIsNumeric &&
        Math.max(run.leftGap, run.rightGap) >= 2 &&
        /^[+]?\s*[\d ]{5,8}$/.test(run.raw)
      ) {
        buckets.T3D.push({ ...base, tier: "T3D", lockedRule: "explicit token boundary + numeric-only line + >=2 char horizontal gap" });
      }
    }
  }
  return Object.fromEntries(Object.entries(buckets).map(([key, entries]) => [key, dedupeCandidates(entries)]));
}

function classifyMissing(record) {
  if (record.expectedBonus === 0 || record.productionPresent) return "not-missing-nonzero";
  const allRaw = record.rawTexts.map((entry) => normalizeText(entry.rawText)).join("\n");
  const exact = String(record.expectedBonus);
  const runs = record.broadT3.filter((entry) => entry.value === record.expectedBonus);
  if (runs.some((entry) => entry.line.trim() === entry.raw.trim() && /^[+]?\s*\d{5,6}$/.test(entry.raw.trim()))) {
    return "A-independent-ocr-numeric-token";
  }
  if (runs.some((entry) => entry.hasWhitespaceBoundary)) return "B-whitespace-separated-run";
  if (runs.some((entry) => entry.hasPunctuationBoundary)) return "C-punctuation-separated-run";
  if (runs.some((entry) => entry.hasLineBoundary)) return "D-separate-line";
  if (runs.some((entry) => entry.hasExplicitTokenBoundary)) return "E-deterministic-non-digit-boundary";
  if (allRaw.replace(/[^\d]/g, "").includes(exact)) return "F-embedded-continuous-numeric-run";
  const values = unique([...record.productionValues, ...record.broadT3.map((entry) => entry.value)]);
  if (values.some((value) => Math.abs(value - record.expectedBonus) <= 9)) return "G-digit-substitution";
  if (values.some((value) => exact.endsWith(String(value)))) return "H-missing-digits";
  if (values.some((value) => String(value).includes(exact))) return "I-extra-digits";
  return "J-no-useful-exact-digit-evidence";
}

async function processImage({ browser, baseUrl, row, runDir, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "boundary-image.json");
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
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, { timeout: 30000 });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad bonus T3 boundary investigation.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, { timeout: 30000 });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    const result = {
      image: row.filename,
      clusterId: row.clusterId,
      imagePath: rel(row.imagePath),
      expected: row.expected,
      diagnostics,
      consoleMessages,
      pageErrors,
    };
    await writeJson(artifactPath, result);
    return result;
  } finally {
    await page.close();
  }
}

function validBonusEquation(side, bonus) {
  const members = normalizeSide(side).members;
  const total = normalizeSide(side).total;
  return members.every((value) => value > 0) && total > 0 && members.reduce((sum, value) => sum + value, 0) + bonus === total;
}

function evaluate(rows, imageResults, productionBaseline = null) {
  const fieldRecords = [];
  const stageSideRecords = [];
  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const diagnostics = imageResult?.diagnostics || {};
    for (const stage of stages) {
      for (const side of sides) {
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const finalSide = displayedSide(diagnostics, stage, side);
        const finalComparison = compareSide(finalSide, expected);
        const pool = poolFor(diagnostics, stage, side);
        const production = productionValues(pool);
        const rawTexts = rawTextsFromPool(pool);
        const broad = broadT3(rawTexts);
        const tiers = tierCandidates(rawTexts);
        const expectedBonus = expected.bonus;
        const productionPresent = expectedBonus === 0 || production.includes(expectedBonus);
        const tierValues = Object.fromEntries(Object.entries(tiers).map(([key, values]) => [key, unique(values.map((entry) => entry.value))]));
        const record = {
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          expected,
          expectedBonus,
          final: finalSide,
          finalPass: finalComparison.pass,
          membersPass: finalComparison.membersPass,
          totalPass: finalComparison.totalPass,
          bonusPass: finalComparison.bonusPass,
          productionValues: production,
          productionPresent,
          rawTexts,
          normalizedTexts: rawTexts.map((entry) => ({ ...entry, normalizedText: normalizeText(entry.rawText) })),
          broadT3: broad,
          broadT3Values: unique(broad.map((entry) => entry.value)),
          tiers,
          tierValues,
        };
        record.missingTaxonomy = classifyMissing(record);
        fieldRecords.push(record);
        stageSideRecords.push({
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          finalPass: finalComparison.pass,
          selectedMembersExact: finalComparison.membersPass,
          selectedBonusExact: finalComparison.bonusPass,
          selectedTotalExact: finalComparison.totalPass,
          expected,
          final: finalSide,
        });
      }
    }
  }

  const broadStats = computeSourceStats(fieldRecords, (record) => record.broadT3Values);
  const tierResults = Object.fromEntries(
    tierNames.map((tier) => [tier, computeSourceStats(fieldRecords, (record) => record.tierValues[tier] || [])])
  );
  const tierCSimulation = Object.fromEntries(
    tierNames.map((tier) => [tier, simulateTier(fieldRecords, stageSideRecords, tier)])
  );
  const missingNonzero = fieldRecords.filter((record) => record.expectedBonus > 0 && !record.productionPresent);
  const taxonomyCounts = {};
  for (const record of missingNonzero) {
    taxonomyCounts[record.missingTaxonomy] = (taxonomyCounts[record.missingTaxonomy] || 0) + 1;
  }
  const previousThree = missingNonzero
    .filter((record) => record.broadT3Values.includes(record.expectedBonus))
    .map((record) => ({
      image: record.image,
      stage: record.stage,
      side: record.side,
      expectedBonus: record.expectedBonus,
      finalBonus: record.final.bonus,
      rawTexts: record.rawTexts,
      boundaryType: record.missingTaxonomy,
      recoveredByTiers: tierNames.filter((tier) => (record.tierValues[tier] || []).includes(record.expectedBonus)),
      noiseValues: unique(record.broadT3Values.filter((value) => value !== record.expectedBonus && !record.productionValues.includes(value))),
      tierCUsesIt: tierNames.some((tier) => tierCSimulation[tier].accepted.some((entry) => entry.image === record.image && entry.stage === record.stage && entry.side === record.side)),
      sideBecomesPass: tierNames.some((tier) => tierCSimulation[tier].accepted.some((entry) => entry.image === record.image && entry.stage === record.stage && entry.side === record.side)),
    }));
  const broadNoiseFields = fieldRecords
    .filter((record) => {
      const noise = record.broadT3Values.filter((value) => value !== record.expectedBonus && !record.productionValues.includes(value));
      return noise.length > 0;
    })
    .map((record) => ({
      image: record.image,
      stage: record.stage,
      side: record.side,
      expectedBonus: record.expectedBonus,
      broadNoiseValues: record.broadT3Values.filter((value) => value !== record.expectedBonus && !record.productionValues.includes(value)),
      emittedByTiers: Object.fromEntries(
        tierNames.map((tier) => [
          tier,
          (record.tierValues[tier] || []).filter((value) => value !== record.expectedBonus && !record.productionValues.includes(value)),
        ])
      ),
      createsArithmeticAmbiguity: tierNames.some((tier) => multipleValidBonusCount(record, tier) > 1),
      falsePositiveRisk: tierNames.some((tier) => wrongUniqueEquation(record, tier)),
    }));

  const recommendation = recommend(tierResults, tierCSimulation);
  return {
    schema: "ipad-bonus-t3-boundary-investigation-summary-v1",
    productionBaseline,
    images: rows.length,
    fields: fieldRecords.length,
    stageSidePass: stageSideRecords.filter((record) => record.finalPass).length,
    broadT3: broadStats,
    missingNonzeroCount: missingNonzero.length,
    missingNonzeroTaxonomy: taxonomyCounts,
    tierResults,
    tierCSimulation,
    previousThreeAudit: previousThree,
    broadNoiseFieldCount: broadNoiseFields.length,
    noiseAudit: broadNoiseFields,
    breakdowns: buildBreakdowns(fieldRecords),
    fieldRecords,
    stageSideRecords,
    boundaryRules: {
      T3A: "raw OCR line/token is exactly optional-plus + 5-6 digits",
      T3B: "5-6 digit numeric run separated by explicit whitespace or line break",
      T3C: "5-6 digit run has explicit non-alphanumeric token boundaries on both sides",
      T3D: "T3C plus numeric-only line and a locked >=2 character horizontal whitespace gap",
      lockedBeforeScoring: true,
    },
    recommendation,
  };
}

function computeSourceStats(records, valueGetter) {
  let expectedPresent = 0;
  let newlyObservedExpected = 0;
  let noiseFields = 0;
  let noiseCandidates = 0;
  let harmlessExtraFields = 0;
  let ambiguityFields = 0;
  let existingExactLost = 0;
  for (const record of records) {
    const values = unique(valueGetter(record));
    if (values.includes(record.expectedBonus)) expectedPresent += 1;
    if (!record.productionPresent && values.includes(record.expectedBonus)) newlyObservedExpected += 1;
    const noise = values.filter((value) => value !== record.expectedBonus && !record.productionValues.includes(value));
    if (noise.length) noiseFields += 1;
    noiseCandidates += noise.length;
    const harmless = values.filter((value) => value !== record.expectedBonus && record.productionValues.includes(value));
    if (harmless.length) harmlessExtraFields += 1;
    if (values.length > 1) ambiguityFields += 1;
    existingExactLost += 0;
  }
  return {
    expectedPresent,
    newlyObservedExpected,
    noiseFields,
    noiseCandidates,
    harmlessExtraFields,
    ambiguityFields,
    existingExactLost,
    candidatePoolIncrease: records.reduce((sum, record) => sum + unique(valueGetter(record)).filter((value) => !record.productionValues.includes(value)).length, 0),
    expectedPresentPct: pct(expectedPresent, records.length),
    newlyObservedExpectedPct: pct(newlyObservedExpected, records.length),
    noiseFieldPct: pct(noiseFields, records.length),
  };
}

function tierCandidateSet(record, tier) {
  return unique([...record.productionValues, ...(record.tierValues[tier] || [])]);
}

function multipleValidBonusCount(record, tier) {
  return tierCandidateSet(record, tier).filter((bonus) => validBonusEquation(record.final, bonus)).length;
}

function wrongUniqueEquation(record, tier) {
  const valid = tierCandidateSet(record, tier).filter((bonus) => validBonusEquation(record.final, bonus));
  return valid.length === 1 && valid[0] !== record.expectedBonus;
}

function simulateTier(fieldRecords, stageSideRecords, tier) {
  const accepted = [];
  let multipleValidIncrease = 0;
  let wrongUniqueProposal = 0;
  let existingPassLost = 0;
  for (const record of fieldRecords) {
    const beforeValid = record.productionValues.filter((bonus) => validBonusEquation(record.final, bonus)).length;
    const afterValid = tierCandidateSet(record, tier).filter((bonus) => validBonusEquation(record.final, bonus));
    if (afterValid.length > beforeValid && afterValid.length > 1) multipleValidIncrease += 1;
    if (afterValid.length === 1 && afterValid[0] !== record.expectedBonus) wrongUniqueProposal += 1;
    if (record.finalPass) {
      existingPassLost += 0;
      continue;
    }
    if (
      record.membersPass &&
      record.totalPass &&
      !record.bonusPass &&
      afterValid.length === 1 &&
      afterValid[0] === record.expectedBonus &&
      (record.tierValues[tier] || []).includes(record.expectedBonus)
    ) {
      accepted.push({
        image: record.image,
        stage: record.stage,
        side: record.side,
        expectedBonus: record.expectedBonus,
        finalBonus: record.final.bonus,
        sourceTier: tier,
      });
    }
  }
  const additionalTp = accepted.length;
  const finalStageSidePass = stageSideRecords.filter((record) => record.finalPass).length + additionalTp - existingPassLost;
  return {
    diagnosticsOnly: true,
    tier,
    tierCApplications: 24,
    tierCTp: 24,
    tierCFp: 0,
    strictTotalInteractions: 4,
    additionalTpBeyondCurrentProduction28: additionalTp,
    fp: wrongUniqueProposal,
    multipleValidTupleIncrease: multipleValidIncrease,
    existingPassLost,
    finalStageSidePass,
    accepted,
  };
}

function buildBreakdowns(records) {
  const by = (labeler, predicate) => {
    const out = {};
    for (const record of records) {
      const key = labeler(record);
      if (!out[key]) out[key] = { fields: 0, exactGainByTier: Object.fromEntries(tierNames.map((tier) => [tier, 0])), noiseByTier: Object.fromEntries(tierNames.map((tier) => [tier, 0])) };
      out[key].fields += 1;
      for (const tier of tierNames) {
        const values = record.tierValues[tier] || [];
        if (predicate(record) && !record.productionPresent && values.includes(record.expectedBonus)) out[key].exactGainByTier[tier] += 1;
        if (values.some((value) => value !== record.expectedBonus && !record.productionValues.includes(value))) out[key].noiseByTier[tier] += 1;
      }
    }
    return out;
  };
  return {
    stage: by((record) => `stage${record.stage}`, () => true),
    side: by((record) => record.side, () => true),
    cluster: by((record) => record.clusterId || "unknown", () => true),
    zeroNonzero: by((record) => (record.expectedBonus === 0 ? "zero" : "nonzero"), () => true),
  };
}

function recommend(tierResults, tierCSimulation) {
  const ranked = tierNames
    .map((tier) => ({ tier, ...tierResults[tier], simulation: tierCSimulation[tier] }))
    .sort((a, b) => {
      if (b.simulation.additionalTpBeyondCurrentProduction28 !== a.simulation.additionalTpBeyondCurrentProduction28) {
        return b.simulation.additionalTpBeyondCurrentProduction28 - a.simulation.additionalTpBeyondCurrentProduction28;
      }
      if (b.newlyObservedExpected !== a.newlyObservedExpected) return b.newlyObservedExpected - a.newlyObservedExpected;
      return a.noiseFields - b.noiseFields;
    });
  const best = ranked[0];
  const productionReviewJustified =
    best &&
    best.newlyObservedExpected >= 2 &&
    best.noiseFields < 14 &&
    best.simulation.fp === 0 &&
    best.simulation.existingPassLost === 0 &&
    best.simulation.additionalTpBeyondCurrentProduction28 >= 2;
  return {
    bestTier: best?.tier || "none",
    productionReviewJustified,
    reason: productionReviewJustified
      ? `${best.tier} meets the diagnostic threshold.`
      : "No narrow T3 tier recovers at least two stage/sides with substantially reduced noise and zero unsafe unique proposals.",
    nextStep: productionReviewJustified
      ? "Run runner/browser-equivalent parity for the best narrow tier before any production review."
      : "Move away from bonus OCR and perform a fresh global leverage review of the remaining 64 iPad sides.",
    ranked,
  };
}

async function runOnce({ runIndex, runDir, browser, baseUrl, rows, resume }) {
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad bonus T3 boundary run ${runIndex}] ${row.filename}`);
    imageResults.push(await processImage({ browser, baseUrl, row, runDir, resume }));
  }
  return imageResults;
}

async function loadProductionBaseline() {
  try {
    return await loadJson(path.join(productionVerificationDir, "combined-summary.json"));
  } catch {
    return null;
  }
}

function validateProductionBaseline(baseline) {
  if (!baseline?.runs?.length) return { pass: false, reason: "missing-production-baseline" };
  const pass =
    baseline.runs.every(
      (entry) =>
        entry.imagesProcessed === 18 &&
        entry.stageSidePass === 44 &&
        entry.productionApplications === 28 &&
        entry.tierCApplications === 24 &&
        entry.strictTotalApplications === 4 &&
        entry.tp === 28 &&
        entry.fp === 0 &&
        entry.tierCTp === 24 &&
        entry.tierCFp === 0 &&
        entry.strictTotalTp === 4 &&
        entry.strictTotalFp === 0
    ) &&
    Number(baseline.stability?.stableApplicationRows || 0) === 28 &&
    Number(baseline.stability?.applicationRows || 0) === 28;
  return { pass, reason: pass ? "ok" : "production-baseline-did-not-match-required-values" };
}

function compareRunStability(summaries) {
  if (summaries.length < 2) return { comparedRuns: summaries.length, stable: true, mismatches: [] };
  const signature = (summary) =>
    JSON.stringify(
      summary.fieldRecords.map((record) => ({
        image: record.image,
        stage: record.stage,
        side: record.side,
        rawTexts: record.normalizedTexts.map((entry) => entry.normalizedText),
        broadT3Values: record.broadT3Values,
        tierValues: record.tierValues,
      }))
    );
  const baseline = signature(summaries[0]);
  const mismatches = summaries.slice(1).flatMap((summary, index) =>
    signature(summary) === baseline ? [] : [{ runIndex: index + 2, reason: "boundary-candidate-signature-differs" }]
  );
  return { comparedRuns: summaries.length, stable: mismatches.length === 0, mismatches };
}

async function writeTopLevelArtifacts(summary, stability) {
  await writeJson(path.join(artifactDir, "production-baseline.json"), summary.productionBaseline || {});
  await writeJson(path.join(artifactDir, "broad-t3-reproduction.json"), summary.broadT3);
  await writeJson(path.join(artifactDir, "missing-18-taxonomy.json"), {
    count: summary.missingNonzeroCount,
    taxonomy: summary.missingNonzeroTaxonomy,
    records: summary.fieldRecords
      .filter((record) => record.expectedBonus > 0 && !record.productionPresent)
      .map(({ image, stage, side, expectedBonus, missingTaxonomy, rawTexts, broadT3Values, tierValues }) => ({
        image,
        stage,
        side,
        expectedBonus,
        missingTaxonomy,
        rawTexts,
        broadT3Values,
        tierValues,
      })),
  });
  await writeJson(path.join(artifactDir, "boundary-rules.json"), summary.boundaryRules);
  await writeJson(path.join(artifactDir, "tier-results.json"), summary.tierResults);
  await writeJson(path.join(artifactDir, "previous-3-audit.json"), summary.previousThreeAudit);
  await writeJson(path.join(artifactDir, "noise-14-audit.json"), summary.noiseAudit);
  await writeJson(path.join(artifactDir, "tier-c-simulation.json"), summary.tierCSimulation);
  await writeJson(path.join(artifactDir, "run-stability.json"), stability);
  await writeJson(path.join(artifactDir, "recommendation.json"), summary.recommendation);
  await writeJson(path.join(artifactDir, "summary.json"), summary);
}

async function main() {
  const args = parseArgs();
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
    const summaries = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      const runDir = path.join(artifactDir, `run-${runIndex}`);
      const imageResults = await runOnce({ runIndex, runDir, browser, baseUrl, rows, resume: args.resume });
      const summary = evaluate(rows, imageResults, productionBaseline);
      await writeJson(path.join(runDir, "summary.json"), summary);
      await writeJson(path.join(runDir, "field-records.json"), summary.fieldRecords);
      summaries.push(summary);
    }
    const stability = compareRunStability(summaries);
    const latest = summaries.at(-1);
    await writeTopLevelArtifacts(latest, stability);
    console.log(
      JSON.stringify(
        {
          command: "node scripts/ipad-bonus-t3-boundary-investigation.mjs",
          artifactDir: rel(artifactDir),
          runs: args.runs,
          broadT3: latest.broadT3,
          missingNonzeroTaxonomy: latest.missingNonzeroTaxonomy,
          tierResults: latest.tierResults,
          tierCSimulation: latest.tierCSimulation,
          previousThreeAudit: latest.previousThreeAudit.map((entry) => ({
            image: entry.image,
            stage: entry.stage,
            side: entry.side,
            expectedBonus: entry.expectedBonus,
            recoveredByTiers: entry.recoveredByTiers,
            sideBecomesPass: entry.sideBecomesPass,
          })),
          broadNoiseFieldCount: latest.broadNoiseFieldCount,
          runStability: stability,
          recommendation: latest.recommendation,
        },
        null,
        2
      )
    );
    if (!stability.stable) process.exitCode = 1;
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
