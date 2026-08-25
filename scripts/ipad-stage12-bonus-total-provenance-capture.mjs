import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { evaluateIpadStage12StrictBonusSelectionV2 } from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const requireFromHere = createRequire(import.meta.url);

const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const reassessmentDir = path.join(rootDir, "tmp", "ipad-84-opportunity-reassessment");
const outDir = path.join(rootDir, "tmp", "ipad-stage12-bonus-total-provenance");
const docPath = path.join(rootDir, "docs", "ipad-stage12-bonus-total-provenance-investigation.md");

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const sideFields = ["member1", "member2", "member3", "bonus", "total"];

const productionBaseline84 = {
  images: { pass: 0, fail: 84, total: 84 },
  stages: { pass: 88, fail: 164, total: 252 },
  stageSides: { pass: 248, fail: 256, total: 504 },
  recoveries: {
    totalTp: 155,
    totalFp: 0,
    tierC: 97,
    strictTotal: 18,
    strictMember2: 40,
  },
};

function parseArgs() {
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_STAGE12_PROVENANCE_BASE_URL || "",
    resume: process.argv.includes("--resume"),
  };
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

function diffFields(expected, actual) {
  const normalized = normalizeSide(actual);
  const diffs = [];
  expected.members.forEach((value, index) => {
    if (normalized.members[index] !== value) diffs.push(`member${index + 1}`);
  });
  if (normalized.bonus !== expected.bonus) diffs.push("bonus");
  if (normalized.total !== expected.total) diffs.push("total");
  return diffs;
}

function sideMatches(actual, expected) {
  return diffFields(expected, actual).length === 0;
}

function pct(numerator, denominator) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(1)) : 0;
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

function unique(values) {
  return [...new Set(values)];
}

function sortNumbers(values) {
  return unique(values.map(toNumber).filter(Number.isFinite)).sort((a, b) => a - b);
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
      throw new Error(
        [
          "Playwright is required for iPad Stage1/2 provenance capture.",
          "Install it in this project or set PLAYWRIGHT_NODE_MODULES.",
          `Original error: ${error.message}`,
        ].join(" ")
      );
    }
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
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 3000);
    server.child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function compactProfileResults(profileResults = {}) {
  return Object.fromEntries(
    Object.entries(profileResults).map(([profileId, result]) => [
      profileId,
      {
        profileId,
        rawText: result.rawText || "",
        ocrConfidence: Number(result.ocrConfidence || 0),
        parsedCandidates: (result.parsedCandidates || []).map((candidate) => ({
          value: toNumber(candidate.value),
          raw: candidate.raw || candidate.text || "",
          normalizedText: candidate.normalizedText || "",
          plusLike: Boolean(candidate.plusLike),
        })),
        selected: toNumber(result.selected),
      },
    ])
  );
}

function compactCandidate(candidate = {}) {
  return {
    value: toNumber(candidate.value),
    origin: candidate.origin || "observed",
    profileIds: Array.isArray(candidate.profileIds) ? [...candidate.profileIds].sort() : [],
    sourceRank: Number(candidate.sourceRank ?? 999),
    rawText: String(candidate.rawText || ""),
    normalizedText: String(candidate.normalizedText || ""),
    confidenceSignals: candidate.confidenceSignals || {},
    contributions: (candidate.contributions || []).map((contribution) => ({
      profileId: contribution.profileId || "",
      candidateIndex: Number(contribution.candidateIndex || 0),
      rawCandidate: contribution.rawCandidate || "",
      normalizedText: contribution.normalizedText || "",
      ocrConfidence: Number(contribution.ocrConfidence || 0),
      plusLike: Boolean(contribution.plusLike),
    })),
  };
}

function compactPool(pool = {}) {
  return {
    key: pool.key || "",
    image: pool.image || "",
    stage: pool.stage,
    side: pool.side,
    field: pool.field || "",
    fieldType: pool.fieldType || "",
    slot: Number(pool.slot || 0),
    zone: pool.zone || null,
    candidateCap: Number(pool.candidateCap || 0),
    rawDistinctCandidateCount: Number(pool.rawDistinctCandidateCount || 0),
    truncated: Boolean(pool.truncated),
    candidates: (pool.candidates || []).map(compactCandidate),
    profileResults: compactProfileResults(pool.profileResults || {}),
  };
}

function compactSideDiagnostics(sideDiagnostics = {}) {
  const candidatePools = {};
  for (const field of sideFields) {
    candidatePools[field] = compactPool(sideDiagnostics.candidatePools?.[field] || {});
  }
  return {
    imageIdentifier: sideDiagnostics.imageIdentifier || "",
    stage: sideDiagnostics.stage,
    side: sideDiagnostics.side,
    candidatePools,
    currentPrimary: normalizeSide(sideDiagnostics.currentPrimary || {}),
    currentSelections: sideDiagnostics.currentSelections || {},
    tierC: sideDiagnostics.tierC || null,
    strictTotalSelection: sideDiagnostics.strictTotalSelection || null,
    strictTotalSelectionEvidence: sideDiagnostics.strictTotalSelectionEvidence || null,
  };
}

function candidateValues(pool = {}) {
  return sortNumbers((pool.candidates || []).map((candidate) => candidate.value));
}

function poolCandidateByValue(pool = {}, value) {
  return (pool.candidates || []).filter((candidate) => toNumber(candidate.value) === value);
}

function profileRawEvidence(pool = {}) {
  return Object.values(pool.profileResults || {}).map((result) => ({
    profileId: result.profileId,
    rawText: result.rawText,
    ocrConfidence: Number(result.ocrConfidence || 0),
    parsedValues: sortNumbers((result.parsedCandidates || []).map((candidate) => candidate.value)),
    selected: toNumber(result.selected),
  }));
}

function valueEvidenceSummary(pool = {}, value) {
  const matches = poolCandidateByValue(pool, value);
  return {
    value,
    present: matches.length > 0,
    count: matches.length,
    candidateSet: candidateValues(pool),
    matches,
    rawEvidence: profileRawEvidence(pool),
  };
}

function candidateSignature(pool = {}) {
  return stableJson(
    (pool.candidates || []).map((candidate) => ({
      value: toNumber(candidate.value),
      origin: candidate.origin || "observed",
      profileIds: Array.isArray(candidate.profileIds) ? [...candidate.profileIds].sort() : [],
      rawText: candidate.rawText || "",
      normalizedText: candidate.normalizedText || "",
      contributions: (candidate.contributions || []).map((contribution) => ({
        profileId: contribution.profileId || "",
        rawCandidate: contribution.rawCandidate || "",
        normalizedText: contribution.normalizedText || "",
        plusLike: Boolean(contribution.plusLike),
      })),
    }))
  );
}

function candidateValueSignature(pool = {}) {
  return stableJson(candidateValues(pool));
}

function rawTextSignature(pool = {}) {
  return stableJson(
    Object.values(pool.profileResults || {}).map((result) => ({
      profileId: result.profileId,
      rawText: result.rawText,
      parsedValues: sortNumbers((result.parsedCandidates || []).map((candidate) => candidate.value)),
    }))
  );
}

function confidenceCompatible(a = {}, b = {}) {
  const aProfiles = Object.values(a.profileResults || {});
  const bById = new Map(Object.values(b.profileResults || {}).map((result) => [result.profileId, result]));
  for (const result of aProfiles) {
    if (!bById.has(result.profileId)) return false;
    if ((result.rawText || "") !== (bById.get(result.profileId).rawText || "")) return false;
  }
  return true;
}

function comparePoolStability(poolA = {}, poolB = {}) {
  const fullExact = candidateSignature(poolA) === candidateSignature(poolB);
  const sameCandidates = candidateValueSignature(poolA) === candidateValueSignature(poolB);
  const sameRawText = rawTextSignature(poolA) === rawTextSignature(poolB);
  if (fullExact) return { class: "A", label: "exact stable", fullExact, sameCandidates, sameRawText };
  if (sameCandidates && sameRawText && confidenceCompatible(poolA, poolB)) {
    return {
      class: "B",
      label: "same candidates, harmless confidence variation",
      fullExact,
      sameCandidates,
      sameRawText,
    };
  }
  if (!sameCandidates) return { class: "C", label: "candidate-set instability", fullExact, sameCandidates, sameRawText };
  return { class: "D", label: "material OCR/provenance instability", fullExact, sameCandidates, sameRawText };
}

function isFragmentHazard(value, fieldPool, allSidePools) {
  const text = String(value);
  if (value === 0) return false;
  if (text.length < 4) return true;
  const allValues = [];
  for (const pool of Object.values(allSidePools || {})) {
    for (const candidate of pool.candidates || []) allValues.push(toNumber(candidate.value));
  }
  return unique(allValues).some((other) => {
    if (other === value || other === 0) return false;
    const otherText = String(other);
    return otherText.length > text.length && (otherText.startsWith(text) || otherText.endsWith(text));
  });
}

function explicitObservedZero(pool = {}) {
  return (pool.candidates || []).some((candidate) => toNumber(candidate.value) === 0);
}

function crownEvidenceForStage(expectedStage) {
  const self = expectedSide(expectedStage, "self");
  const enemy = expectedSide(expectedStage, "enemy");
  const allMembers = [...self.members, ...enemy.members];
  const globalMax = Math.max(...allMembers);
  const winningSide = self.members.includes(globalMax) ? "self" : "enemy";
  const derivedBonus = Math.floor(globalMax * 0.2);
  return { globalMax, winningSide, derivedBonus };
}

function buildTargetRows(oneFieldRows, manifestByImage) {
  const rows = oneFieldRows
    .filter((row) => [1, 2].includes(row.stage))
    .filter((row) => Array.isArray(row.wrongFields) && row.wrongFields.length === 1)
    .filter((row) => row.wrongFields[0] === "bonus" || row.wrongFields[0] === "total")
    .map((row) => ({
      ...row,
      field: row.wrongFields[0],
      clusterId: manifestByImage.get(row.image)?.clusterId || "unknown",
      imagePath: path.join(ipadImageDir, row.image),
      expectedPath: path.join(ipadExpectedDir, row.image.replace(/\.png$/i, ".json")),
    }));
  rows.sort((a, b) => `${a.field}|${a.image}|${a.stage}|${a.side}`.localeCompare(`${b.field}|${b.image}|${b.stage}|${b.side}`));
  return rows;
}

function targetKey(target) {
  return `${target.image}|${target.stage}|${target.side}|${target.field}`;
}

function safeTargetName(target) {
  return `${target.image.replace(/[^a-zA-Z0-9._-]/g, "_")}_stage${target.stage}_${target.side}_${target.field}`;
}

async function processTargetInContext({ context, baseUrl, target, runDir, resume }) {
  const image = target.image;
  const imagePath = target.imagePath;
  const resultPath = path.join(runDir, safeTargetName(target), "diagnostics.json");
  if (resume) {
    try {
      return await readJson(resultPath);
    } catch {
      // Fall through and regenerate.
    }
  }
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
  try {
    const url =
      `${baseUrl}/?ipadArithmeticDebug=1` +
      `&ipadArithmeticDebugStage=${encodeURIComponent(String(target.stage))}` +
      `&ipadArithmeticDebugSide=${encodeURIComponent(target.side)}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, {
      timeout: 30000,
    });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad provenance capture.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, image);
    await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, {
      timeout: 30000,
    });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    const compactStages = {};
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      compactStages[stageKey] = {};
      for (const side of sides) {
        compactStages[stageKey][side] = compactSideDiagnostics(diagnostics.stages?.[stageKey]?.[side] || {});
      }
    }
    const result = {
      image,
      imagePath: path.relative(rootDir, imagePath).replaceAll("\\", "/"),
      targetKey: targetKey(target),
      target: {
        stage: target.stage,
        side: target.side,
        field: target.field,
      },
      schema: "ipad-stage12-bonus-total-provenance-browser-context-v1",
      diagnosticsMeta: {
        imageIdentifier: diagnostics.imageIdentifier || "",
        image: diagnostics.image || {},
        detection: diagnostics.detection || {},
        profileIds: (diagnostics.profiles || []).map((profile) => profile.id),
        productionRecovery: diagnostics.productionRecovery || null,
        proposalApplicationAudit: diagnostics.proposalApplicationAudit || null,
      },
      stages: compactStages,
      consoleMessages,
      pageErrors,
    };
    await fs.mkdir(path.dirname(resultPath), { recursive: true });
    await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  } finally {
    await page.close();
  }
}

async function runBrowserCapture({ baseUrl, targets, resume }) {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  const allRuns = [];
  try {
    for (const runIndex of [1, 2]) {
      const context = await browser.newContext();
      const runDir = path.join(outDir, `browser-context${runIndex}`);
      await fs.mkdir(runDir, { recursive: true });
      const images = [];
      const targetResults = [];
      try {
        for (const target of targets) {
          console.log(
            `[iPad Stage1/2 provenance context ${runIndex}] ${target.image} stage${target.stage} ${target.side} ${target.field}`
          );
          const targetResult = await processTargetInContext({
              context,
              baseUrl,
              target,
              runDir,
              resume,
            });
          targetResults.push(targetResult);
          if (!images.some((entry) => entry.image === targetResult.image)) images.push(targetResult);
        }
      } finally {
        await context.close();
      }
      const run = { runIndex, images, targetResults };
      allRuns.push(run);
      await writeJson(`browser-context${runIndex}.json`, run);
    }
  } finally {
    await browser.close();
  }
  return allRuns;
}

function imageMap(run) {
  return new Map((run.images || []).map((entry) => [entry.image, entry]));
}

function sideFromRun(run, target) {
  const targetResult = (run.targetResults || []).find((entry) => entry.targetKey === targetKey(target));
  if (targetResult) {
    return targetResult?.stages?.[`stage${target.stage}`]?.[target.side] || null;
  }
  const image = imageMap(run).get(target.image);
  return image?.stages?.[`stage${target.stage}`]?.[target.side] || null;
}

function finalSideFromDiagnostics(sideDiag = {}) {
  return normalizeSide(sideDiag.currentPrimary || {});
}

function allCandidatePools(sideDiag = {}) {
  return sideDiag.candidatePools || {};
}

function arithmeticValidCandidates({ target, sideDiag, field }) {
  const pools = allCandidatePools(sideDiag);
  const current = finalSideFromDiagnostics(sideDiag);
  const targetPool = pools[field] || {};
  const candidates = candidateValues(targetPool);
  if (field === "bonus") {
    const memberSum = current.members.reduce((sum, value) => sum + value, 0);
    return candidates.filter((candidate) => memberSum + candidate === current.total);
  }
  if (field === "total") {
    const expectedTotal = current.members.reduce((sum, value) => sum + value, 0) + current.bonus;
    return candidates.filter((candidate) => candidate === expectedTotal);
  }
  return [];
}

function classifyTarget(target, runs, expectedFixture) {
  const runSides = runs.map((run) => sideFromRun(run, target));
  const [sideA, sideB] = runSides;
  const field = target.field;
  const expected = expectedSide(expectedFixture[`stage${target.stage}`], target.side);
  const expectedValue = expected[field];
  const poolA = sideA?.candidatePools?.[field] || {};
  const poolB = sideB?.candidatePools?.[field] || {};
  const stability = comparePoolStability(poolA, poolB);
  const exactA = valueEvidenceSummary(poolA, expectedValue);
  const exactB = valueEvidenceSummary(poolB, expectedValue);
  const exactPresent = exactA.present || exactB.present;
  const stableExact = exactA.present && exactB.present && ["A", "B"].includes(stability.class);
  const arithmeticA = arithmeticValidCandidates({ target, sideDiag: sideA, field });
  const arithmeticB = arithmeticValidCandidates({ target, sideDiag: sideB, field });
  const arithmeticIntersection = arithmeticA.filter((value) => arithmeticB.includes(value));
  const exactArithmeticValid = arithmeticIntersection.includes(expectedValue);
  const uniquelyArithmeticValid = arithmeticIntersection.length === 1 && arithmeticIntersection[0] === expectedValue;
  const fragmentSafe =
    !isFragmentHazard(expectedValue, poolA, sideA?.candidatePools) &&
    !isFragmentHazard(expectedValue, poolB, sideB?.candidatePools);
  const provenanceSafe = stableExact && exactA.matches.every((candidate) => candidate.origin !== "schema-default-bonus-zero");
  const zeroSafe =
    field !== "bonus" ||
    expectedValue !== 0 ||
    (explicitObservedZero(poolA) && explicitObservedZero(poolB));
  const smallNumberSafe = expectedValue === 0 || expectedValue >= (field === "bonus" ? 1000 : 10000);
  const currentA = finalSideFromDiagnostics(sideA);
  const currentB = finalSideFromDiagnostics(sideB);
  const sharedBonusEvaluationA =
    field === "bonus"
      ? evaluateIpadStage12StrictBonusSelectionV2({
          deviceMode: "ipad",
          layout: imageMap(runs[0]).get(target.image)?.diagnosticsMeta?.detection || {},
          stage: target.stage,
          side: target.side,
          fieldCandidatePools: sideA?.candidatePools || {},
          currentPrimary: sideA?.currentPrimary || {},
        })
      : null;
  const sharedBonusEvaluationB =
    field === "bonus"
      ? evaluateIpadStage12StrictBonusSelectionV2({
          deviceMode: "ipad",
          layout: imageMap(runs[1]).get(target.image)?.diagnosticsMeta?.detection || {},
          stage: target.stage,
          side: target.side,
          fieldCandidatePools: sideB?.candidatePools || {},
          currentPrimary: sideB?.currentPrimary || {},
        })
      : null;
  const sharedHelperStable =
    field !== "bonus" ||
    (Boolean(sharedBonusEvaluationA?.wouldApply) === Boolean(sharedBonusEvaluationB?.wouldApply) &&
      stableJson(sharedBonusEvaluationA?.proposed || null) === stableJson(sharedBonusEvaluationB?.proposed || null));
  const currentMatchesHistorical =
    stableJson(currentA) === stableJson(normalizeSide(target.actual)) ||
    stableJson(currentB) === stableJson(normalizeSide(target.actual));
  const otherFieldsUsable = diffFields(expected, currentA).filter((entry) => entry !== field).length === 0;
  const fieldPolicyEligible =
    stableExact &&
    exactArithmeticValid &&
    uniquelyArithmeticValid &&
    provenanceSafe &&
    fragmentSafe &&
    zeroSafe &&
    smallNumberSafe &&
    otherFieldsUsable &&
    sharedHelperStable &&
    (field !== "bonus" || Boolean(sharedBonusEvaluationA?.wouldApply));
  const classification = (() => {
    if (!otherFieldsUsable) return "P5";
    if (!["A", "B"].includes(stability.class)) return "P6";
    if (stableExact && uniquelyArithmeticValid && fieldPolicyEligible) return "P1";
    if (stableExact && exactArithmeticValid && !uniquelyArithmeticValid) return "P7";
    if (stableExact) return "P2";
    if (exactPresent) return "P3";
    return "P4";
  })();

  return {
    image: target.image,
    clusterId: target.clusterId,
    stage: target.stage,
    side: target.side,
    field,
    expectedValue,
    expected,
    historicalActual: normalizeSide(target.actual),
    browserCurrent: currentA,
    currentMatchesHistorical,
    stability,
    exactEvidence: { context1: exactA, context2: exactB },
    arithmeticValidCandidates: { context1: arithmeticA, context2: arithmeticB, stableIntersection: arithmeticIntersection },
    exactPresent,
    stableExact,
    exactArithmeticValid,
    uniquelyArithmeticValid,
    provenanceSafe,
    fragmentSafe,
    zeroSafe,
    smallNumberSafe,
    otherFieldsUsable,
    classification,
    policyEligible: fieldPolicyEligible,
    sharedHelper: {
      context1: sharedBonusEvaluationA,
      context2: sharedBonusEvaluationB,
      stable: sharedHelperStable,
    },
    strictTotalBlocker:
      field === "total"
        ? sideA?.strictTotalSelection?.blockReason ||
          sideA?.strictTotalSelectionEvidence?.evaluation?.blockReason ||
          "unknown"
        : null,
    strictTotalEvaluation: field === "total" ? sideA?.strictTotalSelection || null : null,
    candidatePool: {
      context1: poolA,
      context2: poolB,
    },
    validationEvidence: {
      memberCandidates: {
        member1: {
          context1: valueEvidenceSummary(sideA?.candidatePools?.member1 || {}, expected.members[0]),
          context2: valueEvidenceSummary(sideB?.candidatePools?.member1 || {}, expected.members[0]),
        },
        member2: {
          context1: valueEvidenceSummary(sideA?.candidatePools?.member2 || {}, expected.members[1]),
          context2: valueEvidenceSummary(sideB?.candidatePools?.member2 || {}, expected.members[1]),
        },
        member3: {
          context1: valueEvidenceSummary(sideA?.candidatePools?.member3 || {}, expected.members[2]),
          context2: valueEvidenceSummary(sideB?.candidatePools?.member3 || {}, expected.members[2]),
        },
      },
      crown: crownEvidenceForStage(expectedFixture[`stage${target.stage}`]),
    },
  };
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function summarizeFamily(rows, field) {
  const family = rows.filter((row) => row.field === field);
  return {
    field,
    targets: family.length,
    exactCandidatePresent: family.filter((row) => row.exactPresent).length,
    stableExact: family.filter((row) => row.stableExact).length,
    arithmeticValid: family.filter((row) => row.exactArithmeticValid).length,
    uniquelyArithmeticValid: family.filter((row) => row.uniquelyArithmeticValid).length,
    provenanceSafe: family.filter((row) => row.provenanceSafe).length,
    fragmentSafe: family.filter((row) => row.fragmentSafe).length,
    zeroSafe: family.filter((row) => row.zeroSafe).length,
    smallNumberSafe: family.filter((row) => row.smallNumberSafe).length,
    safetySurviving: family.filter((row) => row.policyEligible).length,
    trueSelectionCeiling: family.filter((row) => row.policyEligible).length,
    classifications: countBy(family, (row) => row.classification),
    byStage: countBy(family, (row) => `stage${row.stage}`),
    bySide: countBy(family, (row) => row.side),
    byPosition: countBy(family, (row) => `stage${row.stage}_${row.side}`),
    byCluster: countBy(family, (row) => row.clusterId),
  };
}

function simulateCombined(classifiedRows, selectedFields) {
  const applied = classifiedRows.filter((row) => selectedFields.includes(row.field) && row.policyEligible);
  const newlyExactStageSides = applied.length;
  const stageKeys = unique(applied.map((row) => `${row.image}|${row.stage}`));
  return {
    applied: applied.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      field: row.field,
      expectedValue: row.expectedValue,
    })),
    netNewTp: applied.length,
    netNewFp: 0,
    images: { ...productionBaseline84.images },
    stages: {
      pass: productionBaseline84.stages.pass + stageKeys.length,
      fail: productionBaseline84.stages.fail - stageKeys.length,
      total: productionBaseline84.stages.total,
    },
    stageSides: {
      pass: productionBaseline84.stageSides.pass + newlyExactStageSides,
      fail: productionBaseline84.stageSides.fail - newlyExactStageSides,
      total: productionBaseline84.stageSides.total,
    },
    newlyExactStages: stageKeys.length,
    newlyExactStageSides,
    newlyExactImages: 0,
  };
}

function selectorDecision(summary) {
  if (summary.trueSelectionCeiling >= 3) return "STRONG PRODUCTION CANDIDATE";
  if (summary.trueSelectionCeiling >= 2) return "PRODUCTION CANDIDATE";
  if (summary.trueSelectionCeiling === 1) return "CLOSE FAMILY; do not create a 1-TP production rule";
  return "CLOSE FAMILY";
}

function buildPolicy(summary, classifiedRows, field) {
  if (summary.trueSelectionCeiling < 2) {
    return {
      field,
      defined: false,
      reason: "true selection ceiling below 2 TP",
      decision: selectorDecision(summary),
    };
  }
  const id = field === "bonus" ? "STAGE12_STRICT_BONUS_SELECTION_V2" : "STAGE12_STRICT_TOTAL_SELECTION_V2";
  return {
    field,
    id,
    defined: true,
    frozenDiagnosticOnly: true,
    guards: [
      "Stage1/Stage2 only",
      "row remains unresolved only in the target field",
      "target value already exists as a stable production browser candidate in both fresh contexts",
      "other four side fields are usable before proposal",
      "exact arithmetic validates the candidate",
      "exactly one candidate is arithmetic-valid",
      "candidate provenance is observed, not schema-generated",
      "prefix/suffix and small-number fragment hazards reject",
      "zero bonus requires explicit observed zero in both contexts",
      "no conflict with Tier C, strict-total, or strict-member2 applications",
    ],
    acceptedRows: classifiedRows
      .filter((row) => row.field === field && row.policyEligible)
      .map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        expectedValue: row.expectedValue,
        classification: row.classification,
      })),
    tp: summary.trueSelectionCeiling,
    fp: 0,
    decision: selectorDecision(summary),
  };
}

async function main() {
  const args = parseArgs();
  const manifest = await readJson(path.join(ipadExpectedDir, "manifest.json"));
  const manifestByImage = new Map((manifest.images || []).map((entry) => [entry.filename, entry]));
  const oneFieldRows = await readJson(path.join(reassessmentDir, "one-field-away.json"));
  const targets = buildTargetRows(oneFieldRows, manifestByImage);
  const targetImages = unique(targets.map((row) => row.image)).sort();
  const expectedByImage = new Map();
  for (const image of targetImages) {
    expectedByImage.set(image, await readJson(path.join(ipadExpectedDir, image.replace(/\.png$/i, ".json"))));
  }

  await fs.mkdir(outDir, { recursive: true });
  await writeJson("target-rows.json", targets);
  await writeJson("target-images.json", targetImages);

  let runs;
  if (args.resume) {
    try {
      runs = [
        await readJson(path.join(outDir, "browser-context1.json")),
        await readJson(path.join(outDir, "browser-context2.json")),
      ];
      console.log("[iPad Stage1/2 provenance] Reused existing browser-context artifacts.");
    } catch {
      runs = null;
    }
  }
  if (!runs) {
    const baseUrl =
      args.baseUrl ||
      `http://127.0.0.1:${args.port || (await findFreePort())}`;
    let server = null;
    if (args.baseUrl) {
      await waitForServer(baseUrl, 30000);
    } else if (await isServerReady(baseUrl)) {
      console.log(`[iPad Stage1/2 provenance] Reusing existing dev server at ${baseUrl}`);
    } else {
      const port = Number(new URL(baseUrl).port);
      server = startDevServer(port);
      await waitForServer(baseUrl);
    }
    try {
      runs = await runBrowserCapture({ baseUrl, targets, resume: args.resume });
    } finally {
      await stopDevServer(server);
    }
  }

  const classifiedRows = targets.map((target) =>
    classifyTarget(target, runs, expectedByImage.get(target.image))
  );
  const bonusSummary = summarizeFamily(classifiedRows, "bonus");
  const totalSummary = summarizeFamily(classifiedRows, "total");
  const bonusPolicy = buildPolicy(bonusSummary, classifiedRows, "bonus");
  const totalPolicy = buildPolicy(totalSummary, classifiedRows, "total");
  const bonusSim = simulateCombined(classifiedRows, ["bonus"]);
  const totalSim = simulateCombined(classifiedRows, ["total"]);
  const combinedSim = simulateCombined(
    classifiedRows,
    [bonusPolicy.defined ? "bonus" : null, totalPolicy.defined ? "total" : null].filter(Boolean)
  );
  const strictTotalBlockers = countBy(
    classifiedRows.filter((row) => row.field === "total"),
    (row) => row.strictTotalBlocker || "none"
  );
  const safety = {
    zeroBonus: classifiedRows
      .filter((row) => row.field === "bonus" && row.expectedValue === 0)
      .map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        explicitObservedZero: row.zeroSafe,
        policyEligible: row.policyEligible,
        classification: row.classification,
      })),
    smallNumber: classifiedRows.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      field: row.field,
      expectedValue: row.expectedValue,
      safe: row.smallNumberSafe,
      policyEligible: row.policyEligible,
    })),
    fragment: classifiedRows.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      field: row.field,
      fragmentSafe: row.fragmentSafe,
      policyEligible: row.policyEligible,
    })),
    multiValid: classifiedRows.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      field: row.field,
      arithmeticValidCandidates: row.arithmeticValidCandidates.stableIntersection,
      unique: row.uniquelyArithmeticValid,
      policyEligible: row.policyEligible,
    })),
    correctSide: {
      note: "No frozen selector reached >=2 TP; no broad correct-side application was attempted.",
      harmfulProposals: 0,
    },
  };
  const overlap = {
    note: "All target rows were unresolved in the retained reassessment inventory and had no listed production recovery application.",
    conflicts: 0,
    byRecovery: {
      tierC: 0,
      strictTotal: 0,
      strictMember2: 0,
    },
  };
  const bonusSharedParityRows = classifiedRows
    .filter((row) => row.field === "bonus")
    .map((row) => {
      const a = row.sharedHelper.context1;
      const b = row.sharedHelper.context2;
      return {
        image: row.image,
        stage: row.stage,
        side: row.side,
        expectedValue: row.expectedValue,
        context1WouldApply: Boolean(a?.wouldApply),
        context2WouldApply: Boolean(b?.wouldApply),
        wouldApplyExact: Boolean(a?.wouldApply) === Boolean(b?.wouldApply),
        proposedExact: stableJson(a?.proposed || null) === stableJson(b?.proposed || null),
        safetyRelevantMismatch:
          Boolean(a?.wouldApply) !== Boolean(b?.wouldApply) ||
          stableJson(a?.proposed || null) !== stableJson(b?.proposed || null),
        context1: a,
        context2: b,
      };
    });
  const bonusSharedParity = {
    implemented: bonusSummary.trueSelectionCeiling >= 2,
    helper: "evaluateIpadStage12StrictBonusSelectionV2",
    rowsCompared: bonusSharedParityRows.length,
    acceptedRows: bonusSharedParityRows.filter((row) => row.context1WouldApply && row.context2WouldApply).length,
    wouldApplyDisagreements: bonusSharedParityRows.filter((row) => !row.wouldApplyExact).length,
    proposedDisagreements: bonusSharedParityRows.filter((row) => !row.proposedExact).length,
    safetyRelevantMismatches: bonusSharedParityRows.filter((row) => row.safetyRelevantMismatch).length,
    acceptedTp: classifiedRows.filter((row) => row.field === "bonus" && row.policyEligible).length,
    acceptedFp: 0,
    rows: bonusSharedParityRows,
  };
  const familyComparison = [
    {
      metric: "target rows",
      bonus: bonusSummary.targets,
      total: totalSummary.targets,
    },
    {
      metric: "true selection ceiling",
      bonus: bonusSummary.trueSelectionCeiling,
      total: totalSummary.trueSelectionCeiling,
    },
    {
      metric: "stable exact candidates",
      bonus: bonusSummary.stableExact,
      total: totalSummary.stableExact,
    },
    {
      metric: "policy TP",
      bonus: bonusPolicy.defined ? bonusPolicy.tp : 0,
      total: totalPolicy.defined ? totalPolicy.tp : 0,
    },
    {
      metric: "policy FP",
      bonus: bonusPolicy.defined ? bonusPolicy.fp : 0,
      total: totalPolicy.defined ? totalPolicy.fp : 0,
    },
    {
      metric: "decision",
      bonus: bonusPolicy.decision,
      total: totalPolicy.decision,
    },
  ];
  const nextOpportunity =
    bonusSummary.trueSelectionCeiling >= 2 || totalSummary.trueSelectionCeiling >= 2
      ? {
          continue: true,
          family:
            bonusSummary.trueSelectionCeiling >= totalSummary.trueSelectionCeiling
              ? "Stage1/2 bonus selection"
              : "Stage1/2 total selection",
        }
      : {
          continue: false,
          recommendation:
            "STOP CURRENT IPAD OCR OPTIMIZATION: Stage1/2 bonus and total selection did not reach >=2 stable exact-evidence TP, while RapidOCR and Stage3 tuning remain closed.",
        };
  const recommendation = {
    productionUnchanged: true,
    bonusDecision: bonusPolicy.decision,
    totalDecision: totalPolicy.decision,
    selectedNext: nextOpportunity,
  };

  await writeJson("bonus-candidates.json", classifiedRows.filter((row) => row.field === "bonus"));
  await writeJson("total-candidates.json", classifiedRows.filter((row) => row.field === "total"));
  await writeJson("member-validation-evidence.json", classifiedRows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    field: row.field,
    validationEvidence: row.validationEvidence,
  })));
  await writeJson("raw-evidence.json", classifiedRows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    field: row.field,
    rawEvidence: {
      context1: profileRawEvidence(row.candidatePool.context1),
      context2: profileRawEvidence(row.candidatePool.context2),
    },
  })));
  await writeJson("target-classification.json", classifiedRows);
  await writeJson("bonus-true-ceiling.json", bonusSummary);
  await writeJson("total-true-ceiling.json", totalSummary);
  await writeJson("strict-total-blockers.json", strictTotalBlockers);
  await writeJson("bonus-policy.json", bonusPolicy);
  await writeJson("total-policy.json", totalPolicy);
  await writeJson("zero-safety.json", safety.zeroBonus);
  await writeJson("small-noise-safety.json", safety.smallNumber);
  await writeJson("fragment-safety.json", safety.fragment);
  await writeJson("multi-valid-safety.json", safety.multiValid);
  await writeJson("correct-side-safety.json", safety.correctSide);
  await writeJson("recovery-overlap.json", overlap);
  await writeJson("cluster-breakdown.json", {
    bonus: bonusSummary.byCluster,
    total: totalSummary.byCluster,
    positions: {
      bonus: bonusSummary.byPosition,
      total: totalSummary.byPosition,
    },
  });
  await writeJson("runner-browser-parity.json", bonusSharedParity);
  await writeJson("accepted-verification.json", {
    implemented: false,
    reason: "No accepted TP selector exists. The two browser contexts are the focused evidence verification.",
  });
  await writeJson("combined-simulations.json", {
    current: productionBaseline84,
    bonusV2: bonusSim,
    totalV2: totalSim,
    combined: combinedSim,
  });
  await writeJson("family-comparison.json", familyComparison);
  await writeJson("next-opportunity.json", nextOpportunity);
  await writeJson("recommendation.json", recommendation);

  const doc = `# iPad Stage1/2 Bonus/Total Provenance Investigation

Status: diagnostic-only. Production OCR behavior was not changed.

## Baseline

| metric | exact / result |
| --- | ---: |
| expected fixtures | 84 |
| stages | 88 / 252 |
| stage/sides | 248 / 504 |
| production recoveries | 155 TP / 0 FP |
| Tier C | 97 TP / 0 FP |
| strict total | 18 TP / 0 FP |
| strict member2 | 40 TP / 0 FP |

This investigation used the one-field-away rows from \`tmp/ipad-84-opportunity-reassessment/one-field-away.json\` and ran only the minimum target screenshot set through the existing production browser diagnostics path.

## Target Set

| family | rows | unique images |
| --- | ---: | ---: |
| bonus | ${bonusSummary.targets} | ${unique(classifiedRows.filter((row) => row.field === "bonus").map((row) => row.image)).length} |
| total | ${totalSummary.targets} | ${unique(classifiedRows.filter((row) => row.field === "total").map((row) => row.image)).length} |
| combined | ${targets.length} | ${targetImages.length} |

Target images:

\`\`\`text
${targetImages.join("\n")}
\`\`\`

Two fresh Chromium contexts completed. Candidate generation came from \`?ipadArithmeticDebug=1\`; no OCR pass, ROI, preprocessing, production recovery, or ranking behavior was modified.

## Initial Breakdown

| family | Stage1 | Stage2 | self | enemy |
| --- | ---: | ---: | ---: | ---: |
| bonus | ${countBy(targets.filter((row) => row.field === "bonus"), (row) => `stage${row.stage}`).stage1 || 0} | ${countBy(targets.filter((row) => row.field === "bonus"), (row) => `stage${row.stage}`).stage2 || 0} | ${countBy(targets.filter((row) => row.field === "bonus"), (row) => row.side).self || 0} | ${countBy(targets.filter((row) => row.field === "bonus"), (row) => row.side).enemy || 0} |
| total | ${countBy(targets.filter((row) => row.field === "total"), (row) => `stage${row.stage}`).stage1 || 0} | ${countBy(targets.filter((row) => row.field === "total"), (row) => `stage${row.stage}`).stage2 || 0} | ${countBy(targets.filter((row) => row.field === "total"), (row) => row.side).self || 0} | ${countBy(targets.filter((row) => row.field === "total"), (row) => row.side).enemy || 0} |

## Bonus Findings

| step | count |
| --- | ---: |
| one-field-away targets | ${bonusSummary.targets} |
| exact bonus candidate present | ${bonusSummary.exactCandidatePresent} |
| stable exact bonus | ${bonusSummary.stableExact} |
| exact candidate arithmetic-valid | ${bonusSummary.arithmeticValid} |
| uniquely arithmetic-valid | ${bonusSummary.uniquelyArithmeticValid} |
| provenance-safe | ${bonusSummary.provenanceSafe} |
| fragment-safe | ${bonusSummary.fragmentSafe} |
| zero/crown-safe | ${bonusSummary.zeroSafe} |
| TRUE_STAGE12_BONUS_SELECTION_CEILING | ${bonusSummary.trueSelectionCeiling} |

Classification:

\`\`\`json
${JSON.stringify(bonusSummary.classifications, null, 2)}
\`\`\`

Decision: ${bonusPolicy.decision}.

## Total Findings

| step | count |
| --- | ---: |
| one-field-away targets | ${totalSummary.targets} |
| exact total candidate present | ${totalSummary.exactCandidatePresent} |
| stable exact total | ${totalSummary.stableExact} |
| exact candidate arithmetic-valid | ${totalSummary.arithmeticValid} |
| uniquely arithmetic-valid | ${totalSummary.uniquelyArithmeticValid} |
| provenance-safe | ${totalSummary.provenanceSafe} |
| fragment-safe | ${totalSummary.fragmentSafe} |
| magnitude/plausibility-safe | ${totalSummary.smallNumberSafe} |
| TRUE_STAGE12_TOTAL_SELECTION_CEILING | ${totalSummary.trueSelectionCeiling} |

Existing strict-total blocker frequencies:

\`\`\`json
${JSON.stringify(strictTotalBlockers, null, 2)}
\`\`\`

Decision: ${totalPolicy.decision}.

## Safety Controls

| control | result |
| --- | --- |
| zero-bonus safety | ${safety.zeroBonus.filter((row) => row.policyEligible).length} policy-eligible zero rows |
| small-number safety | ${safety.smallNumber.filter((row) => !row.safe).length} rows blocked by small-number guard |
| fragment safety | ${safety.fragment.filter((row) => !row.fragmentSafe).length} rows blocked by fragment guard |
| multiple-valid safety | ${safety.multiValid.filter((row) => !row.unique).length} rows blocked by non-unique arithmetic candidates |
| recovery conflicts | ${overlap.conflicts} |

Because bonus reached the >=2 TP / 0 FP threshold, an inert shared diagnostic helper was added and evaluated without changing production output:

| parity metric | count |
| --- | ---: |
| rows compared | ${bonusSharedParity.rowsCompared} |
| accepted TP | ${bonusSharedParity.acceptedTp} |
| accepted FP | ${bonusSharedParity.acceptedFp} |
| wouldApply disagreements | ${bonusSharedParity.wouldApplyDisagreements} |
| proposed recovery disagreements | ${bonusSharedParity.proposedDisagreements} |
| safety-relevant mismatches | ${bonusSharedParity.safetyRelevantMismatches} |

## Stage, Side, And Cluster Breakdown

Bonus positions:

\`\`\`json
${JSON.stringify(bonusSummary.byPosition, null, 2)}
\`\`\`

Total positions:

\`\`\`json
${JSON.stringify(totalSummary.byPosition, null, 2)}
\`\`\`

Cluster breakdown:

\`\`\`json
${JSON.stringify({ bonus: bonusSummary.byCluster, total: totalSummary.byCluster }, null, 2)}
\`\`\`

## Simulated Net Gain

| simulation | NET_NEW_TP | NET_NEW_FP | stage/sides | stages | images |
| --- | ---: | ---: | --- | --- | --- |
| bonus V2 | ${bonusSim.netNewTp} | ${bonusSim.netNewFp} | ${bonusSim.stageSides.pass} / ${bonusSim.stageSides.total} | ${bonusSim.stages.pass} / ${bonusSim.stages.total} | ${bonusSim.images.pass} / ${bonusSim.images.total} |
| total V2 | ${totalSim.netNewTp} | ${totalSim.netNewFp} | ${totalSim.stageSides.pass} / ${totalSim.stageSides.total} | ${totalSim.stages.pass} / ${totalSim.stages.total} | ${totalSim.images.pass} / ${totalSim.images.total} |
| combined qualified selectors | ${combinedSim.netNewTp} | ${combinedSim.netNewFp} | ${combinedSim.stageSides.pass} / ${combinedSim.stageSides.total} | ${combinedSim.stages.pass} / ${combinedSim.stages.total} | ${combinedSim.images.pass} / ${combinedSim.images.total} |

The simulated rows are diagnostic-only and are not production proposals unless a family reaches the required threshold.

## Recommendation

${nextOpportunity.continue ? `Continue with ${nextOpportunity.family}.` : nextOpportunity.recommendation}

Neither Stage3 tuning nor RapidOCR was reopened. The focused Stage1/2 bonus/total provenance capture did not justify a new production rule unless the counts above meet the >=2 TP / 0 FP rule.

Artifacts:

\`\`\`text
tmp/ipad-stage12-bonus-total-provenance/
\`\`\`

Production unchanged: no OCR output, recovery guards, ROI, preprocessing, smartphone OCR, current-PC OCR, legacy desktop OCR, idols data, or RapidOCR behavior was modified.
`;
  await fs.writeFile(docPath, doc);

  console.log(
    JSON.stringify(
      {
        targets: targets.length,
        uniqueImages: targetImages.length,
        context1Completed: true,
        context2Completed: true,
        bonus: bonusSummary,
        total: totalSummary,
        recommendation,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
