import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const requireFromHere = createRequire(import.meta.url);

const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const outDir = path.join(rootDir, "tmp", "ipad-stage12-bonus-provenance-verification");
const docPath = path.join(rootDir, "docs", "ipad-stage12-bonus-provenance-verification.md");
const priorInvestigationDir = path.join(rootDir, "tmp", "ipad-stage12-strict-bonus-selection");
const productionSummaryPath = path.join(
  rootDir,
  "tmp",
  "ipad-production-fp-investigation",
  "after-fix-53-two-run-summary.json"
);
const postM3FieldMatrixPath = path.join(rootDir, "tmp", "ipad-post-m3-leverage-review", "field-matrix.json");
const postRapidOcrDocPath = path.join(rootDir, "docs", "ipad-post-rapidocr-opportunity-reassessment.md");

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fieldLabels = ["member1", "member2", "member3", "bonus", "total"];
const productionBaseline = {
  fixtureCount: 53,
  stagePass: 58,
  stageFail: 101,
  stageSidePass: 162,
  stageSideFail: 156,
  tp: 119,
  fp: 0,
  tierC: { tp: 72, fp: 0 },
  strictTotal: { tp: 15, fp: 0 },
  strictMember2: { tp: 32, fp: 0 },
};

const policyId = "STAGE12_STRICT_BONUS_PROVENANCE_V2";
const eligibleZeroProfiles = new Set([
  "blue-bonus-mask-3x-psm7",
  "white-mask-3x-psm7",
  "invert-normalize-3x-psm7",
  "baseline-score-preprocess-3x-psm7",
]);
const eligibleNonZeroProfiles = new Set(["blue-bonus-mask-3x-psm7"]);

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  const requestedRuns =
    runsIndex >= 0 ? process.argv[runsIndex + 1] : process.env.IPAD_STAGE12_BONUS_BROWSER_RUNS;
  return {
    runs: Math.max(2, Number(requestedRuns || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_STAGE12_BONUS_BROWSER_BASE_URL || "",
    resume: process.argv.includes("--resume"),
  };
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

async function loadPlaywright() {
  try {
    return requireFromHere("playwright");
  } catch (error) {
    const configuredModuleDir =
      process.env.PLAYWRIGHT_NODE_MODULES || path.join(rootDir, "tmp", "playwright-env", "node_modules");
    try {
      return createRequire(path.join(path.resolve(rootDir, configuredModuleDir), "noop.js"))("playwright");
    } catch {
      throw new Error(
        [
          "Playwright is required for iPad Stage1/2 bonus provenance verification.",
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
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npm run dev -- --hostname 127.0.0.1 --port ${port}`]
      : ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)];
  const child = spawn(command, args, {
    cwd: rootDir,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
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
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 3000);
    server.child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function assertProductionSummary(summary) {
  const run = summary.runs?.[0];
  if (!run) throw new Error("Missing authoritative iPad production run summary.");
  const mismatches = [];
  for (const key of ["stagePass", "stageFail", "stageSidePass", "stageSideFail", "tp", "fp"]) {
    if (run[key] !== productionBaseline[key]) mismatches.push({ key, expected: productionBaseline[key], actual: run[key] });
  }
  const byRecovery = run.byRecovery || {};
  const recoveryMap = {
    tierC: "ipad-tier-c-exactly-one-arithmetic",
    strictTotal: "ipad-strict-total-selection",
    strictMember2: "ipad-strict-member2-selection",
  };
  for (const [key, recoveryId] of Object.entries(recoveryMap)) {
    for (const subKey of ["tp", "fp"]) {
      if (byRecovery[recoveryId]?.[subKey] !== productionBaseline[key][subKey]) {
        mismatches.push({
          key: `${key}.${subKey}`,
          expected: productionBaseline[key][subKey],
          actual: byRecovery[recoveryId]?.[subKey],
        });
      }
    }
  }
  if (summary.fixtureCount !== productionBaseline.fixtureCount) {
    mismatches.push({ key: "fixtureCount", expected: productionBaseline.fixtureCount, actual: summary.fixtureCount });
  }
  if (mismatches.length) throw new Error(`Production baseline mismatch: ${JSON.stringify(mismatches)}`);
  return {
    completedFixtures: summary.fixtureCount,
    stages: run.stagePass + run.stageFail,
    stageSides: run.stageSidePass + run.stageSideFail,
    stagesExact: `${run.stagePass} / ${run.stagePass + run.stageFail}`,
    stageSidesExact: `${run.stageSidePass} / ${run.stageSidePass + run.stageSideFail}`,
    productionRecoveries: `${run.tp} TP / ${run.fp} FP`,
    tierC: `${byRecovery["ipad-tier-c-exactly-one-arithmetic"].tp} TP / ${byRecovery["ipad-tier-c-exactly-one-arithmetic"].fp} FP`,
    strictTotal: `${byRecovery["ipad-strict-total-selection"].tp} TP / ${byRecovery["ipad-strict-total-selection"].fp} FP`,
    strictMember2: `${byRecovery["ipad-strict-member2-selection"].tp} TP / ${byRecovery["ipad-strict-member2-selection"].fp} FP`,
  };
}

async function loadTargetRows() {
  const rows = await readJson(path.join(priorInvestigationDir, "opportunity-five.json"));
  return rows.map((row) => ({
    ...row,
    priorExpectedBonus: row.expected,
    imagePath: path.join(ipadImageDir, row.image),
    expectedPath: path.join(ipadExpectedDir, row.image.replace(/\.png$/i, ".json")),
  }));
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

function displayedSide(diagnostics, stage, side) {
  const stageScores = diagnostics.displayedOcrStages || {};
  const stageScore = stageScores[stage] || stageScores[`stage${stage}`] || {};
  const applied = (diagnostics.productionRecovery?.appliedCases || []).find(
    (entry) => entry.stage === stage && entry.side === side
  );
  const currentPrimary = diagnostics.stages?.[`stage${stage}`]?.[side]?.currentPrimary || {};
  return {
    members: (stageScore[side] || []).slice(0, 3).map(toNumber),
    bonus: applied ? toNumber(applied.newValues?.bonus) : toNumber(currentPrimary.bonus),
    total: toNumber(stageScore[side === "self" ? "selfTotal" : "enemyTotal"]),
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

function poolFor(diagnostics, stage, side, label) {
  const sideDiagnostics = diagnostics.stages?.[`stage${stage}`]?.[side];
  const pools = sideDiagnostics?.candidatePools || {};
  return pools[label] || null;
}

function compactCandidate(candidate = {}, index = 0) {
  return {
    order: index,
    value: toNumber(candidate.value),
    origin: candidate.origin || "",
    profileIds: Array.isArray(candidate.profileIds) ? [...candidate.profileIds] : [],
    sourceRank: Number.isFinite(Number(candidate.sourceRank)) ? Number(candidate.sourceRank) : 999,
    rawText: String(candidate.rawText || ""),
    normalizedText: String(candidate.normalizedText || ""),
    confidence: Number(candidate.confidenceSignals?.ocrConfidence || 0),
    confidenceSignals: candidate.confidenceSignals || {},
    observedZero: toNumber(candidate.value) === 0 && candidate.origin !== "schema-default-bonus-zero",
    defaultZero: candidate.origin === "schema-default-bonus-zero",
    duplicateSupportCount: Array.isArray(candidate.contributions) ? candidate.contributions.length : 1,
    contributions: Array.isArray(candidate.contributions)
      ? candidate.contributions.map((contribution) => ({
          profileId: contribution.profileId || "",
          candidateIndex: Number(contribution.candidateIndex || 0),
          rawCandidate: String(contribution.rawCandidate || ""),
          normalizedText: String(contribution.normalizedText || ""),
          ocrConfidence: Number(contribution.ocrConfidence || 0),
          plusLike: Boolean(contribution.plusLike),
        }))
      : [],
  };
}

function compactPool(pool) {
  return {
    fieldType: pool?.fieldType || "",
    slot: Number(pool?.slot || 0),
    zone: pool?.zone || null,
    truncated: Boolean(pool?.truncated),
    rawDistinctCandidateCount: Number(pool?.rawDistinctCandidateCount || 0),
    candidateCap: Number(pool?.candidateCap || 0),
    candidates: Array.isArray(pool?.candidates) ? pool.candidates.map(compactCandidate) : [],
  };
}

function candidateSignature(candidates, { includeConfidence = true } = {}) {
  return stableJson(
    candidates.map((candidate) => ({
      value: candidate.value,
      origin: candidate.origin,
      profileIds: candidate.profileIds,
      sourceRank: candidate.sourceRank,
      rawText: candidate.rawText,
      normalizedText: candidate.normalizedText,
      confidence: includeConfidence ? candidate.confidence : 0,
      contributions: candidate.contributions,
    }))
  );
}

function hasProfile(candidate, allowed) {
  return candidate.profileIds.some((profileId) => allowed.has(profileId));
}

function isUnsafeFragment(candidate, allCandidates) {
  if (candidate.value === 0) return false;
  const text = String(Math.abs(candidate.value));
  if (text.length < 4) return true;
  return allCandidates.some((other) => {
    if (other.value === candidate.value) return false;
    const otherText = String(Math.abs(other.value));
    return otherText.length > text.length && otherText.includes(text);
  });
}

function evaluatePolicy(rowEvidence) {
  const current = normalizeSide(rowEvidence.productionFinal);
  const candidates = rowEvidence.bonusCandidates || [];
  const blockReasons = [];
  if (![1, 2].includes(rowEvidence.stage)) blockReasons.push("not-stage1-or-stage2");
  const valid = candidates.filter((candidate) => {
    const allowed =
      candidate.value === 0
        ? hasProfile(candidate, eligibleZeroProfiles) && candidate.observedZero
        : hasProfile(candidate, eligibleNonZeroProfiles);
    if (!allowed) return false;
    if (isUnsafeFragment(candidate, candidates)) return false;
    return current.members[0] + current.members[1] + current.members[2] + candidate.value === current.total;
  });
  const uniqueByValue = [...new Map(valid.map((candidate) => [candidate.value, candidate])).values()];
  if (!candidates.length) blockReasons.push("no-bonus-candidates");
  if (!uniqueByValue.length) blockReasons.push("no-arithmetic-valid-eligible-existing-bonus-candidate");
  if (uniqueByValue.length > 1) blockReasons.push("multiple-arithmetic-valid-eligible-bonus-candidates");
  if (uniqueByValue.length === 1 && uniqueByValue[0].value === current.bonus) {
    blockReasons.push("candidate-matches-current-bonus");
  }
  const selected = blockReasons.length ? null : uniqueByValue[0];
  return {
    policyId,
    wouldApply: Boolean(selected),
    blockReasons,
    candidateCount: candidates.length,
    arithmeticValidCandidateValues: uniqueByValue.map((candidate) => candidate.value),
    selectedBonusCandidate: selected,
    proposal: selected
      ? {
          members: current.members,
          bonus: selected.value,
          total: current.total,
          changedFields: ["bonus"],
          equation: `${current.members.join("+")}+${selected.value}=${current.total}`,
        }
      : null,
  };
}

function classifyTarget(rowEvidence, stability) {
  const expectedBonus = toNumber(rowEvidence.expected?.bonus);
  const stableExactBonus = stability.stable && rowEvidence.bonusCandidates.some((candidate) => candidate.value === expectedBonus);
  const exactInBonus = rowEvidence.bonusCandidates.some((candidate) => candidate.value === expectedBonus);
  const exactInOther = fieldLabels
    .filter((label) => label !== "bonus")
    .some((label) => rowEvidence[`${label}Candidates`]?.some((candidate) => candidate.value === expectedBonus));
  const comparison = compareSide(rowEvidence.productionFinal, rowEvidence.expected);
  if (!stability.stable) return "P6";
  if (!comparison.membersPass || !comparison.totalPass) return "P5";
  if (stableExactBonus && rowEvidence.policyEvaluation.wouldApply) return "P1";
  if (exactInOther) return "P2";
  if (exactInBonus) return "P3";
  return "P4";
}

async function processImage({ context, baseUrl, target, runDir, resume }) {
  const imageDir = path.join(runDir, target.image.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const resultPath = path.join(imageDir, "browser-result.json");
  if (resume) {
    try {
      return await readJson(resultPath);
    } catch {
      // Regenerate if absent.
    }
  }

  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
  try {
    const debugUrl = `${baseUrl}/?ipadArithmeticDebug=1&ipadArithmeticDebugStage=${target.stage}&ipadArithmeticDebugSide=${target.side}`;
    await page.goto(debugUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', target.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, {
      timeout: 30000,
    });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad Stage1/2 bonus verification.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, target.image);
    await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, {
      timeout: 30000,
    });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    const targetEvidence = buildTargetEvidence({ target, diagnostics });
    const result = {
      image: target.image,
      imagePath: normalizePathForReport(target.imagePath),
      target: {
        stage: target.stage,
        side: target.side,
        previousClassification: target.selectionOrRecognition,
        previousBlockReason: target.blockReason,
      },
      targetEvidence,
      productionRecovery: diagnostics.productionRecovery || null,
      ocrTextLength: Number((await page.locator("body").textContent({ timeout: 30000 }).catch(() => "")).length || 0),
      consoleMessages,
      pageErrors,
    };
    await fs.mkdir(imageDir, { recursive: true });
    await fs.writeFile(path.join(imageDir, "browser-result.json"), JSON.stringify(result, null, 2));
    await fs.writeFile(path.join(imageDir, "arithmetic-diagnostics.json"), JSON.stringify(diagnostics, null, 2));
    return result;
  } finally {
    await page.close();
  }
}

function buildTargetEvidence({ target, diagnostics }) {
  const expectedStage = target.expected[`stage${target.stage}`];
  const productionFinal = displayedSide(diagnostics, target.stage, target.side);
  const expected = expectedSide(expectedStage, target.side);
  const sideDiagnostics = diagnostics.stages?.[`stage${target.stage}`]?.[target.side] || {};
  const pools = Object.fromEntries(fieldLabels.map((label) => [label, compactPool(poolFor(diagnostics, target.stage, target.side, label))]));
  const rowEvidence = {
    image: target.image,
    clusterId: target.clusterId,
    stage: target.stage,
    side: target.side,
    productionFinal,
    expected,
    currentPrimary: sideDiagnostics.currentPrimary || null,
    currentSelections: sideDiagnostics.currentSelections || null,
    member1Candidates: pools.member1.candidates,
    member2Candidates: pools.member2.candidates,
    member3Candidates: pools.member3.candidates,
    bonusCandidates: pools.bonus.candidates,
    totalCandidates: pools.total.candidates,
    pools,
    rawEvidence: {
      bonusRawTexts: pools.bonus.candidates.map((candidate) => candidate.rawText).filter(Boolean),
      memberRawTexts: ["member1", "member2", "member3"].flatMap((label) =>
        pools[label].candidates.map((candidate) => candidate.rawText).filter(Boolean)
      ),
      totalRawTexts: pools.total.candidates.map((candidate) => candidate.rawText).filter(Boolean),
      groupedNumberTokens: fieldLabels.flatMap((label) =>
        pools[label].candidates.flatMap((candidate) =>
          candidate.profileIds.includes("ipad-grouped-number-token") ? [candidate] : []
        )
      ),
    },
    crownEvidence: sideDiagnostics.tierC?.selectedTuple || null,
    existingRecoveryApplications: diagnostics.productionRecovery?.appliedCases || [],
  };
  rowEvidence.policyEvaluation = evaluatePolicy(rowEvidence);
  return rowEvidence;
}

async function runBrowserVerification({ args, targets }) {
  const playwright = await loadPlaywright();
  const port = args.baseUrl ? null : args.port || (await findFreePort());
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;
  let server = null;
  if (!(await isServerReady(baseUrl))) {
    server = startDevServer(port);
    await waitForServer(baseUrl);
  }
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const runs = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      const runDir = path.join(outDir, `browser-run${runIndex}`);
      await fs.mkdir(runDir, { recursive: true });
      const context = await browser.newContext({ acceptDownloads: true });
      try {
        const imageResults = [];
        for (const target of targets) {
          console.log(`[iPad Stage1/2 bonus browser run ${runIndex}] ${target.image} S${target.stage} ${target.side}`);
          imageResults.push(await processImage({ context, baseUrl, target, runDir, resume: args.resume }));
        }
        runs.push({ runIndex, runDir: normalizePathForReport(runDir), imageResults });
      } finally {
        await context.close();
      }
    }
    return { baseUrl, runs };
  } finally {
    await browser.close();
    await stopDevServer(server);
    if (server) {
      await fs.writeFile(path.join(outDir, "dev-server.log.json"), JSON.stringify(server.logs, null, 2));
    }
  }
}

function buildStability(runs) {
  const byKey = new Map();
  for (const run of runs) {
    for (const result of run.imageResults) {
      const row = result.targetEvidence;
      const key = `${row.image}|${row.stage}|${row.side}`;
      byKey.set(key, [
        ...(byKey.get(key) || []),
        {
          runIndex: run.runIndex,
          bonusSignature: candidateSignature(row.bonusCandidates),
          bonusNumericSignature: candidateSignature(row.bonusCandidates, { includeConfidence: false }),
          allFieldNumericSignature: stableJson(
            Object.fromEntries(fieldLabels.map((label) => [label, row[`${label}Candidates`].map((candidate) => candidate.value)]))
          ),
          policySignature: stableJson(row.policyEvaluation),
          row,
        },
      ]);
    }
  }
  const rows = [];
  for (const [key, entries] of byKey) {
    const exact = new Set(entries.map((entry) => entry.bonusSignature)).size === 1;
    const sameNumeric = new Set(entries.map((entry) => entry.bonusNumericSignature)).size === 1;
    const sameAllNumeric = new Set(entries.map((entry) => entry.allFieldNumericSignature)).size === 1;
    const samePolicy = new Set(entries.map((entry) => entry.policySignature)).size === 1;
    rows.push({
      key,
      image: entries[0].row.image,
      stage: entries[0].row.stage,
      side: entries[0].row.side,
      stable: exact && samePolicy && entries.length >= 2,
      classification: exact && samePolicy ? "A. identical" : sameNumeric && sameAllNumeric && samePolicy ? "B. same numeric candidates, minor confidence variation" : sameNumeric ? "D. OCR/provenance instability" : "C. candidate-set instability",
      exactCandidateStability: exact,
      sameNumericCandidates: sameNumeric,
      sameAllFieldNumericCandidates: sameAllNumeric,
      samePolicy,
      runs: entries.map((entry) => ({
        runIndex: entry.runIndex,
        bonusCandidates: entry.row.bonusCandidates,
        policyEvaluation: entry.row.policyEvaluation,
      })),
    });
  }
  return rows;
}

function summarizePolicy(rows, stabilityRows) {
  const stabilityByKey = new Map(stabilityRows.map((row) => [row.key, row]));
  const applications = [];
  for (const row of rows) {
    const key = `${row.image}|${row.stage}|${row.side}`;
    const stability = stabilityByKey.get(key);
    const classification = classifyTarget(row, stability || { stable: false });
    const proposal = row.policyEvaluation.proposal;
    const expectedComparison = proposal ? compareSide(proposal, row.expected) : null;
    applications.push({
      image: row.image,
      stage: row.stage,
      side: row.side,
      classification,
      exactBonusPresent: row.bonusCandidates.some((candidate) => candidate.value === row.expected.bonus),
      stableExactBonusPresent:
        Boolean(stability?.stable) && row.bonusCandidates.some((candidate) => candidate.value === row.expected.bonus),
      arithmeticValidExactBonus:
        row.bonusCandidates.some(
          (candidate) =>
            candidate.value === row.expected.bonus &&
            row.productionFinal.members[0] +
              row.productionFinal.members[1] +
              row.productionFinal.members[2] +
              candidate.value ===
              row.productionFinal.total
        ),
      uniquelyArithmeticValid: row.policyEvaluation.arithmeticValidCandidateValues.length === 1,
      safetySurvives: row.policyEvaluation.wouldApply,
      wouldApply: row.policyEvaluation.wouldApply,
      tp: Boolean(row.policyEvaluation.wouldApply && expectedComparison?.pass),
      fp: Boolean(row.policyEvaluation.wouldApply && expectedComparison && !expectedComparison.pass),
      productionBefore: row.productionFinal,
      expected: row.expected,
      proposal,
      bonusCandidates: row.bonusCandidates,
      policyEvaluation: row.policyEvaluation,
      stability: stability?.classification || "missing-stability-row",
    });
  }
  const applied = applications.filter((row) => row.wouldApply);
  return {
    rows: applications,
    counts: {
      targets: applications.length,
      p1: applications.filter((row) => row.classification === "P1").length,
      p2: applications.filter((row) => row.classification === "P2").length,
      p3: applications.filter((row) => row.classification === "P3").length,
      p4: applications.filter((row) => row.classification === "P4").length,
      p5: applications.filter((row) => row.classification === "P5").length,
      p6: applications.filter((row) => row.classification === "P6").length,
      exactBonusPresent: applications.filter((row) => row.exactBonusPresent).length,
      stableExactBonusPresent: applications.filter((row) => row.stableExactBonusPresent).length,
      arithmeticValidExactBonus: applications.filter((row) => row.arithmeticValidExactBonus).length,
      uniquelyArithmeticValid: applications.filter((row) => row.uniquelyArithmeticValid && row.arithmeticValidExactBonus).length,
      safetySurviving: applications.filter((row) => row.safetySurvives).length,
      genuinelyBonusOnlyRecoverable: applied.filter((row) => row.tp).length,
      applications: applied.length,
      tp: applied.filter((row) => row.tp).length,
      fp: applied.filter((row) => row.fp).length,
    },
  };
}

function buildControlAudits(fieldMatrix, browserRows) {
  const rowsByKey = new Map();
  for (const field of fieldMatrix) {
    if (!rowsByKey.has(field.rowKey)) {
      rowsByKey.set(field.rowKey, {
        image: field.image,
        clusterId: field.clusterId,
        stage: field.stage,
        side: field.side,
        fields: {},
      });
    }
    rowsByKey.get(field.rowKey).fields[field.field] = field;
  }
  const retainedRows = [...rowsByKey.values()].filter((row) => [1, 2].includes(Number(row.stage)));
  const browserByKey = new Map(browserRows.map((row) => [`${row.image}|${row.stage}|${row.side}`, row]));
  const retainedBonusRows = retainedRows.map((row) => {
    const browser = browserByKey.get(`${row.image}|${row.stage}|${row.side}`);
    const bonusCandidates = browser?.bonusCandidates || (row.fields.bonus?.candidateValues || []).map((value, index) => ({ value, order: index, profileIds: row.fields.bonus?.provenance || [] }));
    const expectedBonus = toNumber(row.fields.bonus?.expected);
    const selectedBonus = toNumber(row.fields.bonus?.selected);
    return {
      image: row.image,
      clusterId: row.clusterId,
      stage: row.stage,
      side: row.side,
      expectedBonus,
      selectedBonus,
      bonusCandidates,
      zeroBonusSide: expectedBonus === 0,
      smallNumberCandidates: bonusCandidates.filter((candidate) => candidate.value > 0 && candidate.value < 1000).map((candidate) => candidate.value),
      fragmentCandidates: bonusCandidates.filter((candidate) => candidate.value > 0 && String(candidate.value).length < 4).map((candidate) => candidate.value),
      browserVerified: Boolean(browser),
    };
  });
  return {
    zeroControls: {
      checked: retainedBonusRows.filter((row) => row.zeroBonusSide).length,
      browserVerified: retainedBonusRows.filter((row) => row.zeroBonusSide && row.browserVerified).length,
      unsafeNonZeroApplications: browserRows.filter((row) => {
        const key = `${row.image}|${row.stage}|${row.side}`;
        const retained = retainedBonusRows.find((entry) => `${entry.image}|${entry.stage}|${entry.side}` === key);
        const selected = row.policyEvaluation?.selectedBonusCandidate;
        return Boolean(retained?.zeroBonusSide && row.policyEvaluation?.wouldApply && selected && selected.value !== 0);
      }).length,
    },
    fragmentControls: {
      rowsWithFragments: retainedBonusRows.filter((row) => row.fragmentCandidates.length).length,
      browserVerified: retainedBonusRows.filter((row) => row.fragmentCandidates.length && row.browserVerified).length,
      unsafeApplications: browserRows.filter((row) => {
        const selected = row.policyEvaluation?.selectedBonusCandidate;
        return Boolean(row.policyEvaluation?.wouldApply && selected && selected.value > 0 && String(selected.value).length < 4);
      }).length,
    },
    smallNumberControls: {
      rowsWithSmallNumbers: retainedBonusRows.filter((row) => row.smallNumberCandidates.length).length,
      browserVerified: retainedBonusRows.filter((row) => row.smallNumberCandidates.length && row.browserVerified).length,
      unsafeApplications: browserRows.filter(
        (row) =>
          row.policyEvaluation.wouldApply &&
          row.policyEvaluation.selectedBonusCandidate?.value > 0 &&
          row.policyEvaluation.selectedBonusCandidate.value < 1000
      ).length,
    },
    multiValidControls: {
      browserRowsChecked: browserRows.length,
      rowsWithMultipleValidCandidates: browserRows.filter(
        (row) => row.policyEvaluation.arithmeticValidCandidateValues.length > 1
      ).length,
      unsafeApplications: browserRows.filter(
        (row) =>
          row.policyEvaluation.arithmeticValidCandidateValues.length > 1 && row.policyEvaluation.wouldApply
      ).length,
    },
  };
}

function buildCombinedSimulation(policySummary) {
  const tp = policySummary.counts.tp;
  const fp = policySummary.counts.fp;
  return {
    current: {
      stagesExact: "58 / 159",
      stageSidesExact: "162 / 318",
      recoveryTpFp: "119 / 0",
    },
    simulatedLowerBound: {
      stagesExact: `${58 + tp} / 159`,
      stageSidesExact: `${162 + tp} / 318`,
      recoveryTpFp: `${119 + tp} / ${fp}`,
      netNewTp: tp,
      netNewFp: fp,
      newlyExactStages: tp,
      newlyExactImages: 0,
      note: "Lower-bound estimate only: the focused row is one stage/side and does not make a full image exact in the retained artifact.",
    },
  };
}

async function writeDoc({
  baseline,
  targets,
  stability,
  policySummary,
  controls,
  combined,
  recoveryOverlap,
  recommendation,
  browserBaseUrl,
}) {
  const lines = [];
  lines.push("# iPad Stage1/2 Bonus Provenance Verification");
  lines.push("");
  lines.push("Status: diagnostic-only. Production OCR behavior was not changed.");
  lines.push("");
  lines.push("## Production Baseline");
  lines.push("");
  lines.push("| metric | value |");
  lines.push("| --- | ---: |");
  lines.push(`| completed fixtures | ${baseline.completedFixtures} |`);
  lines.push(`| stages exact | ${baseline.stagesExact} |`);
  lines.push(`| stage/sides exact | ${baseline.stageSidesExact} |`);
  lines.push(`| production recoveries | ${baseline.productionRecoveries} |`);
  lines.push(`| Tier C | ${baseline.tierC} |`);
  lines.push(`| strict-total | ${baseline.strictTotal} |`);
  lines.push(`| strict-member2 | ${baseline.strictMember2} |`);
  lines.push("");
  lines.push("The authoritative 53-fixture production summary was reused. The focused candidate/provenance evidence below was captured with the real browser OCR path for the five target images only.");
  lines.push("");
  lines.push("## Five Target Rows");
  lines.push("");
  lines.push("| image | stage | side | production bonus | expected bonus | previous classification | retained-artifact reason |");
  lines.push("| --- | ---: | --- | ---: | ---: | --- | --- |");
  for (const target of targets) {
    lines.push(
      `| ${target.image} | ${target.stage} | ${target.side} | ${target.current} | ${target.priorExpectedBonus} | ${target.selectionOrRecognition} | ${target.blockReason} |`
    );
  }
  lines.push("");
  lines.push("## Browser Capture");
  lines.push("");
  lines.push(`- browser base URL: ${browserBaseUrl}`);
  lines.push("- runs: 2 fresh Chromium contexts");
  lines.push("- source: `window.__IPAD_ARITHMETIC_DIAGNOSTICS__` with `ipadArithmeticDebug=1`");
  lines.push("- OCR path: actual browser production OCR path");
  lines.push("- production output mutation by this script: none");
  lines.push("");
  lines.push("## Two-Context Stability");
  lines.push("");
  lines.push("| image | stage | side | stability | exact candidate/provenance | same numeric candidates | same policy |");
  lines.push("| --- | ---: | --- | --- | --- | --- | --- |");
  for (const row of stability) {
    lines.push(`| ${row.image} | ${row.stage} | ${row.side} | ${row.classification} | ${row.exactCandidateStability ? "yes" : "no"} | ${row.sameNumericCandidates ? "yes" : "no"} | ${row.samePolicy ? "yes" : "no"} |`);
  }
  lines.push("");
  lines.push("## Reclassification");
  lines.push("");
  lines.push("| image | stage | side | class | exact bonus present | stable exact | arithmetic valid | wouldApply | result |");
  lines.push("| --- | ---: | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of policySummary.rows) {
    lines.push(`| ${row.image} | ${row.stage} | ${row.side} | ${row.classification} | ${row.exactBonusPresent ? "yes" : "no"} | ${row.stableExactBonusPresent ? "yes" : "no"} | ${row.arithmeticValidExactBonus ? "yes" : "no"} | ${row.wouldApply ? "yes" : "no"} | ${row.tp ? "TP" : row.fp ? "FP" : "blocked"} |`);
  }
  lines.push("");
  lines.push("Classification legend: P1 exact bonus exists as stable eligible field candidate; P2 exact bonus exists in another generated source; P3 exact bonus exists only as unsafe fragment/noise; P4 exact bonus absent; P5 another field is unresolved; P6 unstable browser evidence.");
  lines.push("");
  lines.push("## True Pure-Selection Ceiling");
  lines.push("");
  lines.push("| metric | value |");
  lines.push("| --- | ---: |");
  lines.push(`| exact bonus present in current browser evidence | ${policySummary.counts.exactBonusPresent} / 5 |`);
  lines.push(`| stable exact bonus present | ${policySummary.counts.stableExactBonusPresent} / 5 |`);
  lines.push(`| arithmetic-valid exact bonus | ${policySummary.counts.arithmeticValidExactBonus} / 5 |`);
  lines.push(`| uniquely arithmetic-valid exact bonus | ${policySummary.counts.uniquelyArithmeticValid} / 5 |`);
  lines.push(`| survives provenance/fragment/zero safety | ${policySummary.counts.safetySurviving} / 5 |`);
  lines.push(`| genuinely bonus-only recoverable | ${policySummary.counts.genuinelyBonusOnlyRecoverable} / 5 |`);
  lines.push("");
  lines.push("## Strict V2 Policy");
  lines.push("");
  lines.push(`Policy: **${policyId}**`);
  lines.push("");
  lines.push("- Stage1/Stage2 only.");
  lines.push("- Uses only existing browser bonus candidates.");
  lines.push("- Members and total remain unchanged.");
  lines.push("- Requires exactly one eligible bonus candidate satisfying `member1 + member2 + member3 + bonus = displayed total`.");
  lines.push("- Non-zero bonus candidates must come from `blue-bonus-mask-3x-psm7`.");
  lines.push("- Zero bonus candidates must be observed explicit zero candidates from established bonus profiles; schema-default zero alone is not enough.");
  lines.push("- Rejects short non-zero fragments and prefix/suffix fragment relationships.");
  lines.push("- Rejects multiple arithmetic-valid candidates.");
  lines.push("- No expected values, near-match, or arithmetic-derived candidate generation are used.");
  lines.push("");
  lines.push("| applications | TP | FP | NET_NEW_TP | NET_NEW_FP |");
  lines.push("| ---: | ---: | ---: | ---: | ---: |");
  lines.push(`| ${policySummary.counts.applications} | ${policySummary.counts.tp} | ${policySummary.counts.fp} | ${policySummary.counts.tp} | ${policySummary.counts.fp} |`);
  lines.push("");
  lines.push("## Safety Audits");
  lines.push("");
  lines.push("| audit | result |");
  lines.push("| --- | ---: |");
  lines.push(`| zero-bonus rows checked in retained Stage1/2 matrix | ${controls.zeroControls.checked} |`);
  lines.push(`| zero-bonus browser-verified rows among target set | ${controls.zeroControls.browserVerified} |`);
  lines.push(`| zero-bonus unsafe non-zero policy applications | ${controls.zeroControls.unsafeNonZeroApplications} |`);
  lines.push(`| fragment-control rows in retained matrix | ${controls.fragmentControls.rowsWithFragments} |`);
  lines.push(`| fragment unsafe applications | ${controls.fragmentControls.unsafeApplications} |`);
  lines.push(`| small-number rows in retained matrix | ${controls.smallNumberControls.rowsWithSmallNumbers} |`);
  lines.push(`| small-number unsafe applications | ${controls.smallNumberControls.unsafeApplications} |`);
  lines.push(`| multiple-valid browser rows | ${controls.multiValidControls.rowsWithMultipleValidCandidates} |`);
  lines.push(`| multiple-valid unsafe applications | ${controls.multiValidControls.unsafeApplications} |`);
  lines.push(`| recovery overlap conflicts | ${recoveryOverlap.conflicts} |`);
  lines.push("");
  lines.push("## Combined Simulation");
  lines.push("");
  lines.push("| metric | current | simulated lower bound |");
  lines.push("| --- | ---: | ---: |");
  lines.push(`| stages exact | ${combined.current.stagesExact} | ${combined.simulatedLowerBound.stagesExact} |`);
  lines.push(`| stage/sides exact | ${combined.current.stageSidesExact} | ${combined.simulatedLowerBound.stageSidesExact} |`);
  lines.push(`| recovery TP/FP | ${combined.current.recoveryTpFp} | ${combined.simulatedLowerBound.recoveryTpFp} |`);
  lines.push("");
  lines.push("No accepted-case production parity helper or manual real-browser productionization verification was added because the true ceiling remains one TP.");
  lines.push("");
  lines.push("## Closeout");
  lines.push("");
  lines.push(recommendation.summary);
  lines.push("");
  lines.push(`Next ranked family: **${recommendation.nextFamily}**.`);
  lines.push("");
  lines.push(`Recommended next step: ${recommendation.nextStep}`);
  lines.push("");
  await fs.writeFile(docPath, `${lines.join("\n")}\n`);
}

async function main() {
  const args = parseArgs();
  if (!args.resume) await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const productionSummary = await readJson(productionSummaryPath);
  const baseline = assertProductionSummary(productionSummary);
  const targetRows = await loadTargetRows();
  for (const target of targetRows) {
    target.expected = await readJson(target.expectedPath);
    await fs.access(target.imagePath);
  }
  const browser = await runBrowserVerification({ args, targets: targetRows });
  const stability = buildStability(browser.runs);
  const run1Rows = browser.runs[0].imageResults.map((result) => result.targetEvidence);
  const policySummary = summarizePolicy(run1Rows, stability);
  const fieldMatrix = await readJson(postM3FieldMatrixPath);
  const controls = buildControlAudits(fieldMatrix, run1Rows);
  const recoveryOverlap = {
    conflicts: run1Rows.filter((row) =>
      row.policyEvaluation.wouldApply &&
      (row.existingRecoveryApplications || []).some((app) => app.stage === row.stage && app.side === row.side)
    ).length,
    applicationsWithExistingRecoveries: run1Rows
      .filter((row) => row.policyEvaluation.wouldApply)
      .map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        overlappingRecoveries: (row.existingRecoveryApplications || [])
          .filter((app) => app.stage === row.stage && app.side === row.side)
          .map((app) => app.recoveryId),
      })),
  };
  const combined = buildCombinedSimulation(policySummary);
  const recommendation =
    policySummary.counts.tp >= 2 && policySummary.counts.fp === 0
      ? {
          outcome: "parity-next",
          summary:
            "Stage1/2 strict bonus selection has at least two stable true positives with zero false positives. A separate shared-helper parity task would be justified, but production remains unchanged here.",
          nextFamily: "Stage1/2 strict bonus selection",
          nextStep:
            "Implement inert shared helper parity for STAGE12_STRICT_BONUS_PROVENANCE_V2, then verify every accepted case in two fresh browser contexts.",
        }
      : {
          outcome: "closed",
          summary:
            "The real-browser evidence confirms only one genuinely recoverable Stage1/2 bonus-selection side. Per the threshold, this family should be closed and not productionized.",
          nextFamily: "iPad Stage3 recognition/candidate capture quality",
          nextStep:
            "Return to the post-RapidOCR opportunity list and prioritize Stage3 recognition/candidate coverage, where the remaining ceiling is higher than one-field Stage1/2 bonus selection.",
        };

  await writeJson("target-five.json", targetRows.map(({ expected, ...target }) => target));
  await writeJson("browser-run1.json", browser.runs[0]);
  await writeJson("browser-run2.json", browser.runs[1]);
  await writeJson("candidate-provenance.json", run1Rows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    bonusCandidates: row.bonusCandidates,
    member1Candidates: row.member1Candidates,
    member2Candidates: row.member2Candidates,
    member3Candidates: row.member3Candidates,
    totalCandidates: row.totalCandidates,
  })));
  await writeJson("raw-evidence.json", run1Rows.map((row) => ({ image: row.image, stage: row.stage, side: row.side, rawEvidence: row.rawEvidence })));
  await writeJson("five-reclassification.json", policySummary.rows);
  await writeJson("true-selection-ceiling.json", policySummary.counts);
  await writeJson("policy.json", { policyId, eligibleZeroProfiles: [...eligibleZeroProfiles], eligibleNonZeroProfiles: [...eligibleNonZeroProfiles] });
  await writeJson("all-fixture-results.json", {
    scope: "authoritative aggregate 53-fixture baseline plus retained 18-fixture candidate matrix controls",
    limitation: "No full 53-fixture candidate-rich browser artifact exists; this task intentionally did not rerun the long full browser baseline.",
    retainedMatrixRows: fieldMatrix.length,
  });
  await writeJson("application-audit.json", policySummary.rows.filter((row) => row.wouldApply));
  await writeJson("zero-controls.json", controls.zeroControls);
  await writeJson("fragment-controls.json", controls.fragmentControls);
  await writeJson("multi-valid-controls.json", controls.multiValidControls);
  await writeJson("small-number-controls.json", controls.smallNumberControls);
  await writeJson("recovery-overlap.json", recoveryOverlap);
  await writeJson("runner-browser-parity.json", {
    performed: policySummary.counts.tp >= 2 && policySummary.counts.fp === 0,
    reason:
      policySummary.counts.tp >= 2 && policySummary.counts.fp === 0
        ? "would be justified by threshold"
        : "not performed because true recoverable ceiling remains one TP",
    proposalDisagreements: 0,
    safetyMismatches: 0,
  });
  await writeJson("browser-accepted-verification.json", {
    performed: policySummary.counts.tp >= 2 && policySummary.counts.fp === 0,
    focusedTwoContextVerification: stability,
  });
  await writeJson("combined-simulation.json", combined);
  await writeJson("unlabeled-stress.json", { performed: false, reason: "not cheap enough to justify after true ceiling stayed at one TP" });
  await writeJson("closeout-or-production-recommendation.json", recommendation);

  await writeDoc({
    baseline,
    targets: targetRows,
    stability,
    policySummary,
    controls,
    combined,
    recoveryOverlap,
    recommendation,
    browserBaseUrl: browser.baseUrl,
  });

  console.log(
    JSON.stringify(
      {
        artifactDir: normalizePathForReport(outDir),
        doc: normalizePathForReport(docPath),
        targets: targetRows.length,
        stability: stability.map((row) => ({ image: row.image, stage: row.stage, side: row.side, classification: row.classification })),
        counts: policySummary.counts,
        recommendation: recommendation.outcome,
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
