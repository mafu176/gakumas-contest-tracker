import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { performance } from "node:perf_hooks";
import { evaluateIpadStage12StrictBonusSelectionV2 } from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const requireFromHere = createRequire(import.meta.url);

const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const outDir = path.join(rootDir, "tmp", "ipad-stage12-bonus-v2-full-coverage");
const docPath = path.join(rootDir, "docs", "ipad-stage12-bonus-v2-full-coverage-audit.md");
const previousReadinessDir = path.join(rootDir, "tmp", "ipad-stage12-bonus-v2-production-readiness");

const stages = [1, 2];
const sides = ["self", "enemy"];
const fields = ["member1", "member2", "member3", "bonus", "total"];
const knownFiveKeys = new Set([
  "IMG_0320.png|1|self",
  "IMG_0321.png|1|self",
  "IMG_0355.png|1|self",
  "IMG_0356.png|1|self",
  "IMG_0491.png|1|enemy",
]);
const productionBaseline = {
  images: { pass: 0, fail: 84, total: 84 },
  stages: { pass: 88, fail: 164, total: 252 },
  stageSides: { pass: 248, fail: 256, total: 504 },
  recoveries: { tp: 155, fp: 0, tierC: 97, strictTotal: 18, strictMember2: 40 },
};

function parseArgs() {
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  const onlyIndex = process.argv.indexOf("--only");
  const fromIndex = process.argv.indexOf("--from");
  return {
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_STAGE12_BONUS_V2_BASE_URL || "",
    resume: process.argv.includes("--resume"),
    scoreOnly: process.argv.includes("--score-only"),
    skipPass2: process.argv.includes("--skip-pass2"),
    only:
      onlyIndex >= 0 && process.argv[onlyIndex + 1]
        ? new Set(process.argv[onlyIndex + 1].split(",").map((value) => value.trim()).filter(Boolean))
        : null,
    from: fromIndex >= 0 ? process.argv[fromIndex + 1] || "" : "",
  };
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function unique(values) {
  return [...new Set(values)];
}

function rowKey(image, stage, side) {
  return `${image}|${stage}|${side}`;
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

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
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

function expectedSide(stageData, side) {
  return {
    members: stageData[`${side}Members`].slice(0, 3).map(Number),
    bonus: Number(stageData[`${side}Bonus`] || 0),
    total: Number(stageData[`${side}Total`] || 0),
  };
}

function diffFields(expected, actualValue) {
  const actual = normalizeSide(actualValue);
  const diffs = [];
  expected.members.forEach((value, index) => {
    if (actual.members[index] !== value) diffs.push(`member${index + 1}`);
  });
  if (actual.bonus !== expected.bonus) diffs.push("bonus");
  if (actual.total !== expected.total) diffs.push("total");
  return diffs;
}

function candidateValues(pool = {}) {
  return unique((pool.candidates || []).map((candidate) => toNumber(candidate.value))).sort((a, b) => a - b);
}

function compactCandidate(candidate = {}) {
  return {
    value: toNumber(candidate.value),
    origin: candidate.origin || "",
    profileIds: Array.isArray(candidate.profileIds) ? candidate.profileIds : [],
    sourceRank: Number(candidate.sourceRank || 0),
    rawText: candidate.rawText || "",
    normalizedText: candidate.normalizedText || "",
    confidenceSignals: candidate.confidenceSignals || {},
    contributions: (candidate.contributions || []).map((entry) => ({
      profileId: entry.profileId,
      rawText: entry.rawText,
      normalizedText: entry.normalizedText,
      candidateIndex: entry.candidateIndex,
      plusLike: entry.plusLike,
      sourceRank: entry.sourceRank,
    })),
  };
}

function compactPool(pool = {}) {
  return {
    fieldType: pool.fieldType || "",
    zone: pool.zone || null,
    truncated: Boolean(pool.truncated),
    rawDistinctCandidateCount: Number(pool.rawDistinctCandidateCount || 0),
    candidateCap: Number(pool.candidateCap || 0),
    zeroSemantics: pool.zeroSemantics || null,
    candidates: (pool.candidates || []).map(compactCandidate),
  };
}

function compactSide(side = {}) {
  return {
    candidatePools: Object.fromEntries(fields.map((field) => [field, compactPool(side.candidatePools?.[field] || {})])),
    currentPrimary: normalizeSide(side.currentPrimary),
    currentSelections: side.currentSelections || {},
    tierC: side.tierC
      ? {
          wouldApply: Boolean(side.tierC.wouldApply),
          blockReason: side.tierC.blockReason || "",
          validTupleCount: Number(side.tierC.validTupleCount || 0),
        }
      : null,
    strictTotalSelection: side.strictTotalSelection
      ? {
          wouldApply: Boolean(side.strictTotalSelection.wouldApply),
          blockReasons: side.strictTotalSelection.blockReasons || [],
        }
      : null,
  };
}

function compactDiagnostics(diagnostics = {}, row, filterStage = null) {
  const stagesOut = {};
  for (const stage of stages) {
    const stageKey = `stage${stage}`;
    if (filterStage && Number(filterStage) !== stage) continue;
    stagesOut[stageKey] = {};
    for (const side of sides) {
      stagesOut[stageKey][side] = compactSide(diagnostics.stages?.[stageKey]?.[side] || {});
    }
  }
  return {
    schema: "ipad-stage12-bonus-v2-full-coverage-browser-capture-v1",
    image: row.filename,
    imagePath: normalizePathForReport(row.imagePath),
    diagnosticsMeta: {
      imageIdentifier: diagnostics.imageIdentifier || row.filename,
      image: diagnostics.image || null,
      detection: diagnostics.detection || null,
      profileIds: diagnostics.profiles?.map((profile) => profile.id) || [],
      productionRecovery: diagnostics.productionRecovery || null,
    },
    stages: stagesOut,
  };
}

async function loadPlaywright() {
  try {
    return requireFromHere("playwright");
  } catch (error) {
    const configuredModuleDir =
      process.env.PLAYWRIGHT_NODE_MODULES || path.join(rootDir, "tmp", "playwright-env", "node_modules");
    try {
      return createRequire(path.join(path.resolve(configuredModuleDir), "noop.js"))("playwright");
    } catch {
      throw new Error(`Playwright is required for iPad Stage1/2 full coverage capture. ${error.message}`);
    }
  }
}

async function isServerReady(baseUrl) {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function startDevServer(port) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "dev", "--", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
    shell: process.platform === "win32",
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push({ stream: "stdout", text: chunk.toString() }));
  child.stderr.on("data", (chunk) => logs.push({ stream: "stderr", text: chunk.toString() }));
  return { child, logs };
}

async function waitForServer(baseUrl) {
  const started = Date.now();
  while (Date.now() - started < 120000) {
    if (await isServerReady(baseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for dev server at ${baseUrl}`);
}

async function stopDevServer(server) {
  if (!server?.child || server.child.killed) return;
  server.child.kill();
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function loadRows(args) {
  const manifest = await readJson(path.join(ipadExpectedDir, "manifest.json"));
  let rows = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    rows.push({
      filename: entry.filename,
      clusterId: entry.clusterId || "unknown",
      imagePath: path.join(ipadImageDir, entry.filename),
      expected: await readJson(path.join(ipadExpectedDir, entry.filename.replace(/\.png$/i, ".json"))),
    });
  }
  if (args.from) rows = rows.filter((row) => row.filename.localeCompare(args.from) >= 0);
  if (args.only) rows = rows.filter((row) => args.only.has(row.filename) || args.only.has(path.parse(row.filename).name));
  return rows.sort((a, b) => a.filename.localeCompare(b.filename));
}

function safeImageDirName(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function processImage({ browser, baseUrl, row, runDir, resume, filterStage = null }) {
  const imageDir = path.join(runDir, safeImageDirName(row.filename));
  const resultPath = path.join(imageDir, filterStage ? `stage${filterStage}-diagnostics.json` : "stage12-diagnostics.json");
  if (resume) {
    try {
      return await readJson(resultPath);
    } catch {
      // Continue and regenerate missing artifacts.
    }
  }
  const page = await browser.newPage({ acceptDownloads: true });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
  try {
    const debugUrl =
      `${baseUrl}/?ipadArithmeticDebug=1` +
      (filterStage ? `&ipadArithmeticDebugStage=${encodeURIComponent(String(filterStage))}` : "");
    await page.goto(debugUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, {
      timeout: 30000,
    });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad Stage1/2 V2 capture.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, {
      timeout: 30000,
    });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    const result = {
      ...compactDiagnostics(diagnostics, row, filterStage),
      consoleMessages,
      pageErrors,
    };
    await fs.mkdir(imageDir, { recursive: true });
    await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  } finally {
    await page.close();
  }
}

async function runBrowserCapture({ runName, rows, args }) {
  const runDir = path.join(outDir, runName);
  await fs.mkdir(runDir, { recursive: true });
  const playwright = await loadPlaywright();
  const port = args.baseUrl ? null : args.port || (await findFreePort());
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;
  let server = null;
  if (!(await isServerReady(baseUrl))) {
    server = startDevServer(port);
    await waitForServer(baseUrl);
  }
  const browser = await playwright.chromium.launch({ headless: true });
  const started = Date.now();
  const results = [];
  try {
    for (const row of rows) {
      for (const stage of stages) {
        console.log(`[iPad Stage1/2 V2 ${runName}] ${row.filename} stage${stage}`);
        results.push(await processImage({ browser, baseUrl, row, runDir, resume: args.resume, filterStage: stage }));
      }
      await fs.writeFile(
        path.join(runDir, "checkpoint.json"),
        `${JSON.stringify({ completed: results.map((entry) => `${entry.image}:${Object.keys(entry.stages || {}).join(",")}`), elapsedMs: Date.now() - started }, null, 2)}\n`
      );
    }
    await fs.writeFile(
      path.join(runDir, "summary.json"),
      `${JSON.stringify({ runName, images: results.length, elapsedMs: Date.now() - started }, null, 2)}\n`
    );
    return results;
  } finally {
    await browser.close();
    await fs.writeFile(
      path.join(runDir, "dev-server.log.json"),
      JSON.stringify(server?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }], null, 2)
    );
    await stopDevServer(server);
  }
}

async function loadCapturedRun(runName) {
  const runDir = path.join(outDir, runName);
  const rows = [];
  let dirs = [];
  try {
    dirs = await fs.readdir(runDir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    try {
      const stage1 = await readJson(path.join(runDir, dirent.name, "stage1-diagnostics.json")).catch(() => null);
      const stage2 = await readJson(path.join(runDir, dirent.name, "stage2-diagnostics.json")).catch(() => null);
      const full = await readJson(path.join(runDir, dirent.name, "stage12-diagnostics.json")).catch(() => null);
      const base = stage1 || stage2 || full;
      if (!base) continue;
      rows.push({
        ...base,
        stages: {
          ...(full?.stages || {}),
          ...(stage1?.stages || {}),
          ...(stage2?.stages || {}),
        },
      });
    } catch {
      // Ignore incomplete capture directories; coverage audit will report the missing rows.
    }
  }
  return rows.sort((a, b) => a.image.localeCompare(b.image));
}

function applyExistingRecoveries(current, productionRecovery, stage, side) {
  let out = normalizeSide(current);
  const applied = [];
  for (const entry of productionRecovery?.appliedCases || []) {
    if (Number(entry.stage) !== Number(stage) || entry.side !== side) continue;
    out = normalizeSide(entry.newValues || out);
    applied.push({
      recoveryId: entry.recoveryId,
      oldValues: normalizeSide(entry.oldValues),
      newValues: normalizeSide(entry.newValues),
      changedFields: entry.changedFields || [],
    });
  }
  return { currentPrimary: out, appliedRecoveries: applied };
}

function buildRowsFromCapture(captured, manifestByImage) {
  const rows = [];
  for (const imageDiag of captured) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      if (!imageDiag.stages?.[stageKey]) continue;
      for (const side of sides) {
        const sideDiag = imageDiag.stages?.[stageKey]?.[side] || {};
        const { currentPrimary, appliedRecoveries } = applyExistingRecoveries(
          sideDiag.currentPrimary,
          imageDiag.diagnosticsMeta?.productionRecovery,
          stage,
          side
        );
        rows.push({
          image: imageDiag.image,
          clusterId: manifestByImage.get(imageDiag.image)?.clusterId || "unknown",
          stage,
          side,
          layout: imageDiag.diagnosticsMeta?.detection || {},
          candidatePools: sideDiag.candidatePools || {},
          rawCurrentPrimary: normalizeSide(sideDiag.currentPrimary),
          currentPrimary,
          appliedRecoveries,
        });
      }
    }
  }
  return rows.sort((a, b) => rowKey(a.image, a.stage, a.side).localeCompare(rowKey(b.image, b.stage, b.side)));
}

function hasSufficientEvidence(row) {
  if (!row.layout?.detected) return false;
  if (!row.candidatePools?.bonus || !Array.isArray(row.candidatePools.bonus.candidates)) return false;
  return fields.every((field) => row.candidatePools?.[field] && Array.isArray(row.candidatePools[field].candidates));
}

function evaluateRow(row) {
  const started = performance.now();
  const evaluation = evaluateIpadStage12StrictBonusSelectionV2({
    deviceMode: "ipad",
    layout: row.layout,
    stage: row.stage,
    side: row.side,
    fieldCandidatePools: row.candidatePools,
    currentPrimary: row.currentPrimary,
  });
  return { ...row, evaluation, elapsedMs: performance.now() - started };
}

function scoreRow(row, expectedByImage) {
  const expected = expectedSide(expectedByImage.get(row.image)[`stage${row.stage}`], row.side);
  const currentDiffs = diffFields(expected, row.currentPrimary);
  const rawCurrentDiffs = diffFields(expected, row.rawCurrentPrimary);
  const proposed = row.evaluation.proposed ? normalizeSide(row.evaluation.proposed) : null;
  const proposedDiffs = proposed ? diffFields(expected, proposed) : [];
  const currentPass = currentDiffs.length === 0;
  const proposedPass = proposedDiffs.length === 0;
  let classification = "not-applied";
  if (row.evaluation.wouldApply) {
    if (proposedPass && !currentPass) classification = "TP";
    else if (proposedPass && currentPass) classification = "redundant-same-value";
    else classification = "FP";
  }
  const conflict =
    row.evaluation.wouldApply &&
    row.appliedRecoveries.length > 0 &&
    stableJson(proposed) !== stableJson(row.currentPrimary);
  return {
    image: row.image,
    clusterId: row.clusterId,
    stage: row.stage,
    side: row.side,
    rawCurrent: row.rawCurrentPrimary,
    current: row.currentPrimary,
    expected,
    currentDiffs,
    rawCurrentDiffs,
    proposed,
    proposedDiffs,
    wouldApply: Boolean(row.evaluation.wouldApply),
    classification,
    conflict,
    appliedRecoveries: row.appliedRecoveries,
    candidatePools: row.candidatePools,
    evaluation: row.evaluation,
    elapsedMs: row.elapsedMs,
  };
}

function candidateHasValue(pool, value) {
  return candidateValues(pool).includes(toNumber(value));
}

function isFragmentPair(shortValue, longValue) {
  const short = String(Math.abs(toNumber(shortValue)));
  const long = String(Math.abs(toNumber(longValue)));
  return short.length > 0 && long.length > short.length && (long.startsWith(short) || long.endsWith(short));
}

function fragmentAudit(scoredRows) {
  const rows = [];
  for (const row of scoredRows) {
    const bonusValues = candidateValues(row.candidatePools.bonus);
    const otherValues = fields
      .filter((field) => field !== "bonus")
      .flatMap((field) => candidateValues(row.candidatePools[field]));
    const pairs = [];
    for (const bonus of bonusValues) {
      for (const other of otherValues) {
        if (isFragmentPair(bonus, other)) pairs.push({ bonus, other });
      }
    }
    if (pairs.length || row.wouldApply || (row.evaluation.blockReasons || []).includes("fragment-hazard")) {
      rows.push({
        image: row.image,
        stage: row.stage,
        side: row.side,
        pairs,
        wouldApply: row.wouldApply,
        classification: row.classification,
        accepted: row.wouldApply,
        rejected: !row.wouldApply,
        blockReasons: row.evaluation.blockReasons || [],
      });
    }
  }
  return rows;
}

function stageExactAfterV2(image, stage, scoredByKey, expectedByImage) {
  for (const side of sides) {
    const row = scoredByKey.get(rowKey(image, stage, side));
    const expected = expectedSide(expectedByImage.get(image)[`stage${stage}`], side);
    const finalValue = row?.wouldApply ? row.proposed : row?.current;
    if (diffFields(expected, finalValue).length !== 0) return false;
  }
  return true;
}

function imageExactAfterV2(image, scoredByKey, expectedByImage) {
  for (const stage of [1, 2, 3]) {
    for (const side of sides) {
      if (stage === 3) return false;
      const row = scoredByKey.get(rowKey(image, stage, side));
      const expected = expectedSide(expectedByImage.get(image)[`stage${stage}`], side);
      const finalValue = row?.wouldApply ? row.proposed : row?.current;
      if (diffFields(expected, finalValue).length !== 0) return false;
    }
  }
  return false;
}

function summarizeApplications(scoredRows) {
  const applications = scoredRows.filter((row) => row.wouldApply);
  const tp = applications.filter((row) => row.classification === "TP");
  const fp = applications.filter((row) => row.classification === "FP");
  const redundant = applications.filter((row) => row.classification === "redundant-same-value");
  const conflicts = applications.filter((row) => row.conflict);
  return { applications, tp, fp, redundant, conflicts };
}

function buildSecondContextSelection(scoredRows) {
  const apps = scoredRows.filter((row) => row.wouldApply).map((row) => row.image);
  const suspicious = scoredRows
    .filter((row) => {
      const reasons = row.evaluation.blockReasons || [];
      return reasons.length === 1 && ["fragment-hazard", "multiple-valid-bonus-candidates", "zero-bonus-not-observed"].includes(reasons[0]);
    })
    .slice(0, 12)
    .map((row) => row.image);
  const zeroControls = scoredRows.filter((row) => row.expected.bonus === 0).slice(0, 6).map((row) => row.image);
  const fragmentControls = fragmentAudit(scoredRows).slice(0, 8).map((row) => row.image);
  return unique([...apps, ...suspicious, ...zeroControls, ...fragmentControls]).sort();
}

function compareSecondContext(scoredRows, secondRows) {
  const secondByKey = new Map(secondRows.map((row) => [rowKey(row.image, row.stage, row.side), row]));
  const applications = scoredRows.filter((row) => row.wouldApply);
  const accepted = applications.map((row) => {
    const other = secondByKey.get(rowKey(row.image, row.stage, row.side));
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      present: Boolean(other),
      stableWouldApply: Boolean(other?.wouldApply) === Boolean(row.wouldApply),
      stableProposal: stableJson(other?.proposed || null) === stableJson(row.proposed || null),
      stableValidCount: Number(other?.evaluation?.validBonusValues?.length || 0) === Number(row.evaluation.validBonusValues?.length || 0),
      stableFragmentGuard:
        (other?.evaluation?.blockReasons || []).includes("fragment-hazard") ===
        (row.evaluation.blockReasons || []).includes("fragment-hazard"),
    };
  });
  const nearApply = scoredRows
    .filter((row) => {
      const reasons = row.evaluation.blockReasons || [];
      return reasons.length === 1 && ["fragment-hazard", "multiple-valid-bonus-candidates", "zero-bonus-not-observed"].includes(reasons[0]);
    })
    .map((row) => {
      const other = secondByKey.get(rowKey(row.image, row.stage, row.side));
      return {
        image: row.image,
        stage: row.stage,
        side: row.side,
        blockReasons: row.evaluation.blockReasons || [],
        secondBlockReasons: other?.evaluation?.blockReasons || [],
        stable: stableJson(row.evaluation.blockReasons || []) === stableJson(other?.evaluation?.blockReasons || []),
      };
    });
  return { accepted, nearApply };
}

async function scoreCoverage({ pass1Rows, pass2Rows, manifestRows }) {
  const expectedByImage = new Map(manifestRows.map((row) => [row.filename, row.expected]));
  const manifestByImage = new Map(manifestRows.map((row) => [row.filename, row]));
  const allRows = buildRowsFromCapture(pass1Rows, manifestByImage);
  const coverageIndex = [];
  for (const row of manifestRows) {
    for (const stage of stages) {
      for (const side of sides) {
        const key = rowKey(row.filename, stage, side);
        const evidence = allRows.find((entry) => rowKey(entry.image, entry.stage, entry.side) === key);
        coverageIndex.push({
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          status: evidence && hasSufficientEvidence(evidence) ? "candidate-rich-authoritative" : "requires-browser-capture",
        });
      }
    }
  }
  const evaluable = allRows.filter(hasSufficientEvidence).map(evaluateRow);
  const scoredRows = evaluable.map((row) => scoreRow(row, expectedByImage));
  const scoredByKey = new Map(scoredRows.map((row) => [rowKey(row.image, row.stage, row.side), row]));
  const { applications, tp, fp, redundant, conflicts } = summarizeApplications(scoredRows);
  const previousCoverage = await readJson(path.join(previousReadinessDir, "artifact-coverage.json")).catch(() => null);
  const sixth = await readJson(path.join(previousReadinessDir, "sixth-exact-rejection.json")).catch(() => null);
  const knownFive = [...knownFiveKeys].map((key) => {
    const row = scoredByKey.get(key);
    return {
      key,
      present: Boolean(row),
      wouldApply: Boolean(row?.wouldApply),
      classification: row?.classification || "missing",
      proposed: row?.proposed || null,
      blockReasons: row?.evaluation?.blockReasons || [],
    };
  });
  const zeroRows = scoredRows.filter((row) => row.expected.bonus === 0);
  const nonzeroRows = scoredRows.filter((row) => row.expected.bonus > 0);
  const smallRows = [];
  for (const row of scoredRows) {
    const values = candidateValues(row.candidatePools.bonus);
    const small = values.filter((value) => value > 0 && value < 1000);
    if (!small.length) continue;
    smallRows.push({
      image: row.image,
      stage: row.stage,
      side: row.side,
      small,
      arithmeticValidSmall: small.filter((value) => row.evaluation.memberSum + value === row.current.total),
      wouldApply: row.wouldApply,
      classification: row.classification,
    });
  }
  const fragments = fragmentAudit(scoredRows);
  const multiValid = scoredRows.filter((row) => (row.evaluation.validBonusValues || []).length >= 2);
  const correctSide = scoredRows.filter((row) => row.currentDiffs.length === 0);
  const nonBonusError = scoredRows.filter(
    (row) => row.currentDiffs.length > 0 && !(row.currentDiffs.length === 1 && row.currentDiffs[0] === "bonus")
  );
  const crown = applications.map((row) => {
    const stageData = expectedByImage.get(row.image)[`stage${row.stage}`];
    const self = expectedSide(stageData, "self");
    const enemy = expectedSide(stageData, "enemy");
    const globalMax = Math.max(...self.members, ...enemy.members);
    const winningSide = self.members.includes(globalMax) ? "self" : "enemy";
    const derivedBonus = Math.floor(globalMax * 0.2);
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      globalMax,
      winningSide,
      derivedBonus,
      proposedBonus: row.proposed?.bonus ?? null,
      crownCompatible: row.side === winningSide ? row.proposed?.bonus === derivedBonus : row.proposed?.bonus === 0,
    };
  });
  const provenanceRows = applications.flatMap((row) =>
    (row.evaluation.provenance?.matchingProfileIds || ["unknown"]).map((profileId) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      profileId,
      classification: row.classification,
    }))
  );
  const pass2Evaluated = buildRowsFromCapture(pass2Rows, manifestByImage).filter(hasSufficientEvidence).map(evaluateRow);
  const pass2Scored = pass2Evaluated.map((row) => scoreRow(row, expectedByImage));
  const stability = compareSecondContext(scoredRows, pass2Scored);
  const helperParity = scoredRows.map((row) => {
    const second = evaluateIpadStage12StrictBonusSelectionV2({
      deviceMode: "ipad",
      layout: row.layout || { detected: true, deviceMode: "ipad" },
      stage: row.stage,
      side: row.side,
      fieldCandidatePools: row.candidatePools,
      currentPrimary: row.current,
    });
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      wouldApplyDisagreement: Boolean(second.wouldApply) !== Boolean(row.wouldApply),
      proposalDisagreement: stableJson(second.proposed || null) !== stableJson(row.proposed || null),
      safetyMismatch: stableJson(second.blockReasons || []) !== stableJson(row.evaluation.blockReasons || []),
    };
  });
  const newlyExactStages = unique(tp.map((row) => `${row.image} stage${row.stage}`)).filter((stageId) => {
    const [image, stageText] = stageId.split(" stage");
    return stageExactAfterV2(image, Number(stageText), scoredByKey, expectedByImage);
  });
  const combinedSimulation = {
    current: productionBaseline,
    bonusV2: {
      images: { ...productionBaseline.images },
      stages: {
        pass: productionBaseline.stages.pass + newlyExactStages.length,
        fail: productionBaseline.stages.fail - newlyExactStages.length,
        total: productionBaseline.stages.total,
      },
      stageSides: {
        pass: productionBaseline.stageSides.pass + tp.length,
        fail: productionBaseline.stageSides.fail - tp.length,
        total: productionBaseline.stageSides.total,
      },
      recoveries: { tp: productionBaseline.recoveries.tp + tp.length, fp: productionBaseline.recoveries.fp + fp.length },
      netNewTp: tp.length,
      netNewFp: fp.length,
      newlyExactStages,
      newlyExactImages: manifestRows.filter((row) => imageExactAfterV2(row.filename, scoredByKey, expectedByImage)).map((row) => row.filename),
    },
  };
  const finalCoverage = coverageIndex.filter((entry) => entry.status === "candidate-rich-authoritative").length;
  const recommendation = {
    classification:
      finalCoverage === 336 &&
      tp.length >= 3 &&
      fp.length === 0 &&
      conflicts.length === 0 &&
      helperParity.every((row) => !row.wouldApplyDisagreement && !row.proposalDisagreement && !row.safetyMismatch) &&
      stability.accepted.every((row) => row.present && row.stableWouldApply && row.stableProposal)
        ? "A. READY FOR PRODUCTION INTEGRATION"
        : finalCoverage === 336
          ? "C. NEEDS SELECTOR FIX"
          : "E. NEEDS MORE DIAGNOSTIC EVIDENCE",
    productionIntegrationJustified:
      finalCoverage === 336 && tp.length >= 3 && fp.length === 0 && conflicts.length === 0,
    nextStep:
      finalCoverage === 336 && tp.length >= 3 && fp.length === 0 && conflicts.length === 0
        ? "Productionize iPad Stage1/Stage2 Strict Bonus Selection V2."
        : "Resolve the full-coverage audit blocker before production wiring.",
    futureKillSwitch: "ENABLE_IPAD_STAGE12_STRICT_BONUS_SELECTION_V2",
    recoveryId: "ipad-stage12-strict-bonus-selection-v2",
    insertionPoint: "after Tier C, strict-total, and strict-member2; only on post-recovery Stage1/Stage2 sides",
  };
  return {
    previousCoverage,
    coverageIndex,
    finalCoverage,
    missingSides: coverageIndex.filter((entry) => entry.status !== "candidate-rich-authoritative"),
    scoredRows,
    applications,
    tp,
    fp,
    redundant,
    conflicts,
    knownFive,
    sixth,
    zeroAudit: {
      zeroBonusSides: zeroRows.length,
      applications: zeroRows.filter((row) => row.wouldApply).length,
      tp: zeroRows.filter((row) => row.classification === "TP").length,
      redundant: zeroRows.filter((row) => row.classification === "redundant-same-value").length,
      fp: zeroRows.filter((row) => row.classification === "FP").length,
      rows: zeroRows.map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        wouldApply: row.wouldApply,
        classification: row.classification,
        proposedBonus: row.proposed?.bonus ?? null,
        blockReasons: row.evaluation.blockReasons || [],
      })),
    },
    nonzeroAudit: {
      nonzeroBonusSides: nonzeroRows.length,
      exactBonusCandidatePresent: nonzeroRows.filter((row) => candidateHasValue(row.candidatePools.bonus, row.expected.bonus)).length,
      uniquelyArithmeticValid: nonzeroRows.filter((row) => (row.evaluation.validBonusValues || []).length === 1).length,
      applications: nonzeroRows.filter((row) => row.wouldApply).length,
      tp: nonzeroRows.filter((row) => row.classification === "TP").length,
      fp: nonzeroRows.filter((row) => row.classification === "FP").length,
    },
    smallAudit: {
      occurrenceRows: smallRows.length,
      occurrenceCount: smallRows.reduce((sum, row) => sum + row.small.length, 0),
      arithmeticValidCount: smallRows.reduce((sum, row) => sum + row.arithmeticValidSmall.length, 0),
      acceptedCount: smallRows.filter((row) => row.wouldApply).length,
      fpCount: smallRows.filter((row) => row.classification === "FP").length,
      rows: smallRows,
    },
    fragmentAudit: {
      affectedRows: fragments.length,
      wouldApplyCount: fragments.filter((row) => row.wouldApply).length,
      rejectedCount: fragments.filter((row) => !row.wouldApply).length,
      acceptedCount: fragments.filter((row) => row.wouldApply).length,
      tp: fragments.filter((row) => row.classification === "TP").length,
      fp: fragments.filter((row) => row.classification === "FP").length,
      rows: fragments,
    },
    multiValidAudit: {
      count: multiValid.length,
      identities: multiValid.map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        validBonusValues: row.evaluation.validBonusValues,
        wouldApply: row.wouldApply,
        blockReasons: row.evaluation.blockReasons || [],
      })),
    },
    crownAudit: {
      applications: crown.length,
      conflicts: crown.filter((row) => !row.crownCompatible).length,
      rows: crown,
    },
    correctSideAudit: {
      count: correctSide.length,
      applications: correctSide.filter((row) => row.wouldApply).length,
      harmfulDifferentValue: correctSide.filter((row) => row.classification === "FP").length,
    },
    nonBonusErrorAudit: {
      count: nonBonusError.length,
      applications: nonBonusError.filter((row) => row.wouldApply).length,
      harmfulApplications: nonBonusError.filter((row) => row.classification === "FP").length,
      rows: nonBonusError.filter((row) => row.wouldApply).map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        currentDiffs: row.currentDiffs,
        classification: row.classification,
      })),
    },
    provenanceBreakdown: {
      breakdown: countBy(provenanceRows, (row) => `${row.profileId}|${row.classification}`),
      rows: provenanceRows,
    },
    stageBreakdown: {
      stage1: {
        sides: scoredRows.filter((row) => row.stage === 1).length,
        applications: applications.filter((row) => row.stage === 1).length,
        tp: tp.filter((row) => row.stage === 1).length,
        fp: fp.filter((row) => row.stage === 1).length,
      },
      stage2: {
        sides: scoredRows.filter((row) => row.stage === 2).length,
        applications: applications.filter((row) => row.stage === 2).length,
        tp: tp.filter((row) => row.stage === 2).length,
        fp: fp.filter((row) => row.stage === 2).length,
      },
    },
    sideBreakdown: Object.fromEntries(
      ["stage1_self", "stage1_enemy", "stage2_self", "stage2_enemy"].map((key) => {
        const [stagePart, side] = key.split("_");
        const stage = Number(stagePart.replace("stage", ""));
        const rows = scoredRows.filter((row) => row.stage === stage && row.side === side);
        return [
          key,
          {
            sides: rows.length,
            applications: rows.filter((row) => row.wouldApply).length,
            tp: rows.filter((row) => row.classification === "TP").length,
            fp: rows.filter((row) => row.classification === "FP").length,
          },
        ];
      })
    ),
    clusterBreakdown: {
      sides: countBy(scoredRows, (row) => row.clusterId),
      applications: countBy(applications, (row) => row.clusterId),
      tp: countBy(tp, (row) => row.clusterId),
      fp: countBy(fp, (row) => row.clusterId),
      knownFive: countBy([...knownFiveKeys].map((key) => scoredRows.find((row) => rowKey(row.image, row.stage, row.side) === key)).filter(Boolean), (row) => row.clusterId),
    },
    recoveryOverlap: {
      unresolvedOnly: applications.filter((row) => row.appliedRecoveries.length === 0).length,
      harmlessOverlap: applications.filter((row) => row.appliedRecoveries.length > 0 && !row.conflict).length,
      conflicts: conflicts.length,
      rows: applications.map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        appliedRecoveries: row.appliedRecoveries.map((entry) => entry.recoveryId),
        conflict: row.conflict,
      })),
    },
    helperParity: {
      rows: helperParity.length,
      wouldApplyDisagreements: helperParity.filter((row) => row.wouldApplyDisagreement).length,
      proposalDisagreements: helperParity.filter((row) => row.proposalDisagreement).length,
      safetyMismatches: helperParity.filter((row) => row.safetyMismatch).length,
      mismatches: helperParity.filter((row) => row.wouldApplyDisagreement || row.proposalDisagreement || row.safetyMismatch),
    },
    secondContext: {
      images: unique(pass2Rows.map((row) => row.image)).sort(),
      accepted: stability.accepted,
      nearApply: stability.nearApply,
    },
    combinedSimulation,
    performance: {
      evaluations: scoredRows.length,
      totalMs: Number(scoredRows.reduce((sum, row) => sum + row.elapsedMs, 0).toFixed(3)),
      avgMs: Number((scoredRows.reduce((sum, row) => sum + row.elapsedMs, 0) / Math.max(1, scoredRows.length)).toFixed(6)),
      noNewOcrCost: true,
    },
    recommendation,
  };
}

async function saveArtifacts(result) {
  await writeJson("coverage-index.json", result.coverageIndex);
  await writeJson("missing-image-set.json", {
    missingSides: result.missingSides.length,
    uniqueImages: unique(result.missingSides.map((row) => row.image)).sort(),
    imagesAlreadyFullyCovered: unique(result.coverageIndex.map((row) => row.image))
      .filter((image) => !result.missingSides.some((row) => row.image === image))
      .sort(),
  });
  await writeJson("coverage-after-pass1.json", {
    covered: result.finalCoverage,
    total: 336,
    stillUnknown: result.missingSides.length,
  });
  await writeJson("all-336-decisions.json", result.scoredRows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    wouldApply: row.wouldApply,
    proposal: row.proposed,
    blockReasons: row.evaluation.blockReasons || [],
    validBonusValues: row.evaluation.validBonusValues || [],
  })));
  await writeJson("all-applications.json", result.applications);
  await writeJson("application-score.json", {
    total: result.applications.length,
    tp: result.tp.length,
    fp: result.fp.length,
    redundant: result.redundant.length,
    conflicts: result.conflicts.length,
    rows: result.applications,
  });
  await writeJson("known-five.json", result.knownFive);
  await writeJson("new-applications.json", result.applications.filter((row) => !knownFiveKeys.has(rowKey(row.image, row.stage, row.side))));
  await writeJson("zero-audit.json", result.zeroAudit);
  await writeJson("nonzero-audit.json", result.nonzeroAudit);
  await writeJson("small-number-audit.json", result.smallAudit);
  await writeJson("fragment-audit.json", result.fragmentAudit);
  await writeJson("multi-valid-audit.json", result.multiValidAudit);
  await writeJson("crown-audit.json", result.crownAudit);
  await writeJson("correct-side-audit.json", result.correctSideAudit);
  await writeJson("nonbonus-error-audit.json", result.nonBonusErrorAudit);
  await writeJson("provenance-breakdown.json", result.provenanceBreakdown);
  await writeJson("stage-breakdown.json", result.stageBreakdown);
  await writeJson("cluster-breakdown.json", result.clusterBreakdown);
  await writeJson("recovery-overlap.json", result.recoveryOverlap);
  await writeJson("full-helper-parity.json", result.helperParity);
  await writeJson("browser-pass2.json", result.secondContext);
  await writeJson("application-stability.json", result.secondContext.accepted);
  await writeJson("near-apply-stability.json", result.secondContext.nearApply);
  await writeJson("combined-simulation.json", result.combinedSimulation);
  await writeJson("performance.json", result.performance);
  await writeJson("recommendation.json", result.recommendation);
}

async function saveDoc(result) {
  const lines = [];
  lines.push("# iPad Stage1/2 Bonus V2 Full Coverage Audit");
  lines.push("");
  lines.push("Status: diagnostic-only. The selector remains inert and is not wired into production OCR.");
  lines.push("");
  lines.push("## Why This Audit Exists");
  lines.push("");
  lines.push("The prior readiness review covered only 82 / 336 Stage1/Stage2 sides with candidate-rich retained evidence. This run fills the remaining coverage using the existing real-browser `ipadArithmeticDebug=1` diagnostics path, then runs the frozen helper expected-blind before fixture scoring.");
  lines.push("");
  lines.push("## Production Baseline");
  lines.push("");
  lines.push("| metric | current |");
  lines.push("| --- | ---: |");
  lines.push(`| images exact | ${productionBaseline.images.pass} / ${productionBaseline.images.total} |`);
  lines.push(`| stages exact | ${productionBaseline.stages.pass} / ${productionBaseline.stages.total} |`);
  lines.push(`| stage/sides exact | ${productionBaseline.stageSides.pass} / ${productionBaseline.stageSides.total} |`);
  lines.push(`| production recoveries | ${productionBaseline.recoveries.tp} TP / ${productionBaseline.recoveries.fp} FP |`);
  lines.push(`| Tier C | ${productionBaseline.recoveries.tierC} |`);
  lines.push(`| strict-total | ${productionBaseline.recoveries.strictTotal} |`);
  lines.push(`| strict-member2 | ${productionBaseline.recoveries.strictMember2} |`);
  lines.push("");
  lines.push("## Coverage");
  lines.push("");
  lines.push("| metric | count |");
  lines.push("| --- | ---: |");
  lines.push(`| previous candidate-rich coverage | ${result.previousCoverage?.candidateRichSides || 82} / 336 |`);
  lines.push(`| previous missing sides | ${result.previousCoverage?.insufficientForV2Evaluation || 254} |`);
  lines.push(`| final candidate-rich coverage | ${result.finalCoverage} / 336 |`);
  lines.push(`| still unknown | ${result.missingSides.length} |`);
  lines.push("");
  lines.push("## Applications");
  lines.push("");
  lines.push("| metric | count |");
  lines.push("| --- | ---: |");
  lines.push(`| wouldApply rows | ${result.applications.length} |`);
  lines.push(`| TP | ${result.tp.length} |`);
  lines.push(`| FP | ${result.fp.length} |`);
  lines.push(`| redundant | ${result.redundant.length} |`);
  lines.push(`| conflicts | ${result.conflicts.length} |`);
  lines.push(`| known five recovered | ${result.knownFive.filter((row) => row.wouldApply && row.classification === "TP").length} / 5 |`);
  lines.push("");
  lines.push("Would-apply inventory:");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(result.applications.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    current: row.current,
    proposed: row.proposed,
    classification: row.classification,
    blockReasons: row.evaluation.blockReasons || [],
    validBonusValues: row.evaluation.validBonusValues || [],
    provenance: row.evaluation.provenance || {},
  })), null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("| audit | result |");
  lines.push("| --- | ---: |");
  lines.push(`| zero-bonus sides | ${result.zeroAudit.zeroBonusSides} |`);
  lines.push(`| zero-bonus FP | ${result.zeroAudit.fp} |`);
  lines.push(`| non-zero bonus sides | ${result.nonzeroAudit.nonzeroBonusSides} |`);
  lines.push(`| non-zero TP / FP | ${result.nonzeroAudit.tp} / ${result.nonzeroAudit.fp} |`);
  lines.push(`| small-number candidate rows | ${result.smallAudit.occurrenceRows} |`);
  lines.push(`| small-number accepted / FP | ${result.smallAudit.acceptedCount} / ${result.smallAudit.fpCount} |`);
  lines.push(`| fragment affected rows | ${result.fragmentAudit.affectedRows} |`);
  lines.push(`| fragment accepted / FP | ${result.fragmentAudit.acceptedCount} / ${result.fragmentAudit.fp} |`);
  lines.push(`| multiple-valid rows | ${result.multiValidAudit.count} |`);
  lines.push(`| crown conflicts | ${result.crownAudit.conflicts} |`);
  lines.push(`| correct-side harmful applications | ${result.correctSideAudit.harmfulDifferentValue} |`);
  lines.push(`| non-bonus-error harmful applications | ${result.nonBonusErrorAudit.harmfulApplications} |`);
  lines.push("");
  lines.push("## Breakdowns");
  lines.push("");
  lines.push("Stage breakdown:");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(result.stageBreakdown, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("Self/enemy breakdown:");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(result.sideBreakdown, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("Cluster breakdown:");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(result.clusterBreakdown, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("Accepted provenance:");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(result.provenanceBreakdown.breakdown, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Recovery Overlap");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(result.recoveryOverlap, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Helper Parity");
  lines.push("");
  lines.push("| metric | count |");
  lines.push("| --- | ---: |");
  lines.push(`| rows | ${result.helperParity.rows} |`);
  lines.push(`| wouldApply disagreements | ${result.helperParity.wouldApplyDisagreements} |`);
  lines.push(`| proposal disagreements | ${result.helperParity.proposalDisagreements} |`);
  lines.push(`| safety mismatches | ${result.helperParity.safetyMismatches} |`);
  lines.push("");
  lines.push("## Second Context Stability");
  lines.push("");
  lines.push(`Second-context images: ${result.secondContext.images.join(", ") || "(none)"}`);
  lines.push("");
  lines.push(`Accepted proposal stability: ${result.secondContext.accepted.filter((row) => row.present && row.stableWouldApply && row.stableProposal).length} / ${result.secondContext.accepted.length}`);
  lines.push(`Near-apply blocker stability: ${result.secondContext.nearApply.filter((row) => row.stable).length} / ${result.secondContext.nearApply.length}`);
  lines.push("");
  lines.push("## Combined Simulation");
  lines.push("");
  lines.push("| metric | current | + V2 |");
  lines.push("| --- | ---: | ---: |");
  lines.push(`| images exact | ${productionBaseline.images.pass} / ${productionBaseline.images.total} | ${result.combinedSimulation.bonusV2.images.pass} / ${result.combinedSimulation.bonusV2.images.total} |`);
  lines.push(`| stages exact | ${productionBaseline.stages.pass} / ${productionBaseline.stages.total} | ${result.combinedSimulation.bonusV2.stages.pass} / ${result.combinedSimulation.bonusV2.stages.total} |`);
  lines.push(`| stage/sides exact | ${productionBaseline.stageSides.pass} / ${productionBaseline.stageSides.total} | ${result.combinedSimulation.bonusV2.stageSides.pass} / ${result.combinedSimulation.bonusV2.stageSides.total} |`);
  lines.push(`| NET_NEW_TP | - | ${result.combinedSimulation.bonusV2.netNewTp} |`);
  lines.push(`| NET_NEW_FP | - | ${result.combinedSimulation.bonusV2.netNewFp} |`);
  lines.push("");
  lines.push("Newly exact stages:");
  lines.push("");
  lines.push("```text");
  lines.push(result.combinedSimulation.bonusV2.newlyExactStages.join("\n") || "(none)");
  lines.push("```");
  lines.push("");
  lines.push("## Performance");
  lines.push("");
  lines.push(`Helper-only evaluation: ${result.performance.totalMs} ms total, ${result.performance.avgMs} ms per side over ${result.performance.evaluations} sides.`);
  lines.push("");
  lines.push("No new OCR, model, crop, preprocessing, or RapidOCR path is required for the helper itself; this audit only captured existing browser diagnostic evidence.");
  lines.push("");
  lines.push("## Final Decision");
  lines.push("");
  lines.push(result.recommendation.classification);
  lines.push("");
  lines.push(`Production integration justified: ${result.recommendation.productionIntegrationJustified ? "yes" : "no"}`);
  lines.push("");
  lines.push(`Exact next step: ${result.recommendation.nextStep}`);
  lines.push("");
  lines.push("Future production details:");
  lines.push("");
  lines.push(`- kill switch: \`${result.recommendation.futureKillSwitch}\``);
  lines.push(`- recovery identifier: \`${result.recommendation.recoveryId}\``);
  lines.push(`- insertion point: ${result.recommendation.insertionPoint}`);
  lines.push("");
  lines.push("Production unchanged: no OCR output, recovery ordering, ROI, preprocessing, smartphone OCR, current-PC OCR, legacy desktop OCR, idols data, or RapidOCR behavior was modified.");
  await fs.writeFile(docPath, `${lines.join("\n")}\n`);
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(outDir, { recursive: true });
  const rows = await loadRows(args);
  if (rows.length === 0) throw new Error("No complete iPad fixtures selected.");

  let pass1 = await loadCapturedRun("browser-pass1");
  if (!args.scoreOnly && pass1.length < rows.length) {
    pass1 = await runBrowserCapture({ runName: "browser-pass1", rows, args });
  }
  let interim = await scoreCoverage({ pass1Rows: pass1, pass2Rows: [], manifestRows: rows });
  const secondImages = buildSecondContextSelection(interim.scoredRows);
  await writeJson("browser-pass2-scope.json", secondImages);
  let pass2 = await loadCapturedRun("browser-pass2");
  const pass2Existing = new Set(pass2.map((row) => row.image));
  const pass2Rows = rows.filter((row) => secondImages.includes(row.filename) && !pass2Existing.has(row.filename));
  if (!args.scoreOnly && !args.skipPass2 && pass2Rows.length) {
    const newPass2 = await runBrowserCapture({ runName: "browser-pass2", rows: pass2Rows, args });
    pass2 = [...pass2, ...newPass2];
  }
  const result = await scoreCoverage({ pass1Rows: pass1, pass2Rows: pass2, manifestRows: rows });
  await saveArtifacts(result);
  await saveDoc(result);
  console.log(JSON.stringify({
    coverage: `${result.finalCoverage}/336`,
    applications: result.applications.length,
    tp: result.tp.length,
    fp: result.fp.length,
    redundant: result.redundant.length,
    conflicts: result.conflicts.length,
    knownFive: result.knownFive.filter((row) => row.wouldApply && row.classification === "TP").length,
    helperParity: result.helperParity,
    secondContextImages: result.secondContext.images.length,
    combinedSimulation: result.combinedSimulation,
    recommendation: result.recommendation,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
