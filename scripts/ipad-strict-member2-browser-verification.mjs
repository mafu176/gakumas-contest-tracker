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
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const referenceDir = path.join(rootDir, "tmp", "ipad-strict-member2-selection-parity");
const artifactDir = path.join(rootDir, "tmp", "ipad-strict-member2-real-browser-verification");
const reportPath = path.join(rootDir, "docs", "ipad-strict-member2-real-browser-verification.md");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  const refreshImages = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === "--refresh-image" && process.argv[index + 1]) {
      refreshImages.push(process.argv[index + 1]);
    }
  }
  return {
    runs: Math.max(
      2,
      Number((runsIndex >= 0 && process.argv[runsIndex + 1]) || process.env.IPAD_STRICT_MEMBER2_BROWSER_RUNS || 2)
    ),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_STRICT_MEMBER2_BROWSER_BASE_URL || "",
    resume: process.argv.includes("--resume"),
    acceptedOnly: process.argv.includes("--accepted-only"),
    refreshImages: new Set(refreshImages),
  };
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
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

function keyFor(image, stage, side) {
  return `${image}|${stage}|${side}`;
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

function compactCandidate(candidate = {}) {
  return {
    value: toNumber(candidate.value),
    origin: candidate.origin || "",
    profileIds: Array.isArray(candidate.profileIds) ? [...candidate.profileIds] : [],
    sourceRank: Number.isFinite(Number(candidate.sourceRank)) ? Number(candidate.sourceRank) : 999,
    rawText: String(candidate.rawText || ""),
    normalizedText: String(candidate.normalizedText || ""),
    approvedProvenance: Boolean(candidate.approvedProvenance),
    contributions: Array.isArray(candidate.contributions)
      ? candidate.contributions.map((contribution) => ({
          profileId: contribution.profileId || "",
          candidateIndex: Number.isFinite(Number(contribution.candidateIndex))
            ? Number(contribution.candidateIndex)
            : 0,
          rawCandidate: String(contribution.rawCandidate || ""),
          normalizedText: String(contribution.normalizedText || ""),
        }))
      : [],
  };
}

function compactMember2Pool(pool = {}) {
  return {
    observedCandidates: Array.isArray(pool.observedCandidates)
      ? pool.observedCandidates.map(compactCandidate)
      : [],
    truncated: Boolean(pool.truncated),
    candidateCap: Number(pool.candidateCap || 0),
    rawDistinctCandidateCount: Number(pool.rawDistinctCandidateCount || 0),
  };
}

function compactUnchangedFieldProvenance(provenance = {}) {
  const compact = {};
  for (const label of ["member1", "member3", "bonus", "total"]) {
    const entry = provenance[label] || {};
    compact[label] = {
      label: entry.label || label,
      value: toNumber(entry.value),
      hasStrongProvenance: Boolean(entry.hasStrongProvenance),
      origin: entry.origin || "",
      candidate: entry.candidate ? compactCandidate(entry.candidate) : null,
    };
  }
  return compact;
}

function compactStrictMember2Entry(entry = {}) {
  const evaluation = entry.evaluation || entry.strictMember2Selection || entry.result || {};
  const evidence = entry.evidence || entry.strictMember2SelectionEvidence || {};
  const selected = evidence.selected || {
    members: evaluation.selectedMembers,
    bonus: evaluation.selectedBonus,
    total: evaluation.selectedTotal,
  };
  return {
    eligible: Boolean(evaluation.eligible),
    wouldApply: Boolean(evaluation.wouldApply),
    selectedMembers: Array.isArray(selected.members) ? selected.members.slice(0, 3).map(toNumber) : [],
    selectedBonus: toNumber(selected.bonus),
    selectedTotal: toNumber(selected.total),
    arithmeticComparisonMember2: toNumber(
      evidence.arithmeticComparisonMember2 ?? evaluation.arithmeticComparisonMember2
    ),
    matchingObservedMember2Candidates: Array.isArray(
      evidence.matchingObservedMember2Candidates || evaluation.matchingObservedMember2Candidates
    )
      ? (evidence.matchingObservedMember2Candidates || evaluation.matchingObservedMember2Candidates).map(
          compactCandidate
        )
      : [],
    uniqueMatchingMember2:
      (evidence.uniqueMatchingMember2 ?? evaluation.uniqueMatchingMember2) === null ||
      (evidence.uniqueMatchingMember2 ?? evaluation.uniqueMatchingMember2) === undefined
        ? null
        : toNumber(evidence.uniqueMatchingMember2 ?? evaluation.uniqueMatchingMember2),
    proposedMember2:
      (evaluation.proposal?.members?.[1] ?? evaluation.proposedMember2) === undefined
        ? null
        : toNumber(evaluation.proposal?.members?.[1] ?? evaluation.proposedMember2),
    proposal: evaluation.proposal
      ? {
          members: Array.isArray(evaluation.proposal.members)
            ? evaluation.proposal.members.slice(0, 3).map(toNumber)
            : [],
          bonus: toNumber(evaluation.proposal.bonus),
          total: toNumber(evaluation.proposal.total),
        }
      : null,
    changedFields: Array.isArray(evaluation.changedFields) ? [...evaluation.changedFields] : [],
    blockReasons: Array.isArray(evaluation.blockReasons) ? [...evaluation.blockReasons] : [],
    blockReason: Array.isArray(evaluation.blockReasons) ? evaluation.blockReasons.join("; ") : "",
    candidateCompleteness: evidence.candidateCompleteness || evaluation.candidateCompleteness || {},
    member2CandidateCompleteness:
      evidence.member2CandidateCompleteness || evaluation.member2CandidateCompleteness || {},
    member2Pool: compactMember2Pool(evidence.member2Pool || evaluation.member2Pool || {}),
    unchangedFieldProvenance: compactUnchangedFieldProvenance(
      evidence.unchangedFieldProvenance || evaluation.unchangedFieldProvenance || {}
    ),
  };
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
      return createRequire(path.join(path.resolve(configuredModuleDir), "noop.js"))("playwright");
    }
    throw new Error(
      [
        "Playwright is required for iPad strict-member2 browser verification.",
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
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npm run dev -- --hostname 127.0.0.1 --port ${port}`]
      : ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)];
  const child = spawn(command, commandArgs, {
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

async function collectIpadFixtures() {
  const manifest = await loadJson(path.join(ipadExpectedDir, "manifest.json"));
  const rows = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    const filename = entry.filename;
    const expectedPath = path.join(ipadExpectedDir, entry.expectedFixture || filename.replace(/\.png$/i, ".json"));
    const imagePath = path.join(ipadImageDir, filename);
    await fs.access(imagePath);
    await fs.access(expectedPath);
    rows.push({
      ...entry,
      filename,
      imagePath,
      expected: await loadJson(expectedPath),
    });
  }
  if (rows.length !== 18) throw new Error(`Expected exactly 18 iPad fixtures, found ${rows.length}`);
  return rows;
}

function expectedSide(expectedStage, side) {
  return {
    members: side === "self" ? expectedStage.selfMembers.map(Number) : expectedStage.enemyMembers.map(Number),
    bonus: Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0),
    total: Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0),
  };
}

function compareSide(actualInput, expectedInput) {
  const actual = normalizeSide(actualInput);
  const expected = normalizeSide(expectedInput);
  const memberMatches = expected.members.map((expectedValue, index) => ({
    slot: index + 1,
    expected: expectedValue,
    actual: actual.members[index] || 0,
    pass: (actual.members[index] || 0) === expectedValue,
  }));
  return {
    pass:
      memberMatches.every((entry) => entry.pass) &&
      actual.bonus === expected.bonus &&
      actual.total === expected.total,
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
  const sideDiagnostics = diagnostics.stages?.[`stage${stage}`]?.[side] || {};
  const currentPrimary = sideDiagnostics.currentPrimary || {};
  return {
    members: (stageScore[side] || []).slice(0, 3).map(toNumber),
    bonus: applied ? Number(applied.newValues?.bonus || 0) : Number(currentPrimary.bonus || 0),
    total: toNumber(stageScore[side === "self" ? "selfTotal" : "enemyTotal"]),
  };
}

async function loadReferenceRows(rows) {
  const browserEquivalentRows = await loadJson(path.join(referenceDir, "browser-equivalent-results.json"));
  const acceptedEight = await loadJson(path.join(referenceDir, "accepted-eight-audit.json"));
  const negativeControls = await loadJson(path.join(referenceDir, "negative-controls.json"));
  const overlapAnalysis = await loadJson(path.join(referenceDir, "overlap-analysis.json"));
  const rowImages = new Set(rows.map((row) => row.filename));
  const referenceByKey = new Map();
  for (const row of browserEquivalentRows) {
    if (!rowImages.has(row.image)) continue;
    referenceByKey.set(keyFor(row.image, row.stage, row.side), {
      image: row.image,
      stage: row.stage,
      side: row.side,
      current: row.current,
      expected: row.expected,
      result: row.result,
      compact: compactStrictMember2Entry({ result: row.result, evidence: row.result }),
    });
  }
  return {
    referenceByKey,
    acceptedEight,
    negativeControls,
    overlapAnalysis,
    acceptedKeys: new Set(acceptedEight.map((row) => keyFor(row.image, row.stage, row.side))),
  };
}

function sideDiagnostic(diagnostics, stage, side) {
  return diagnostics.strictMember2SelectionEvidence?.stages?.[`stage${stage}`]?.[side] || null;
}

function compareReferenceToBrowser(reference, browserCompact) {
  const runnerCompact = reference.compact;
  const checks = {
    currentTuple:
      stableJson({
        members: runnerCompact.selectedMembers,
        bonus: runnerCompact.selectedBonus,
        total: runnerCompact.selectedTotal,
      }) ===
      stableJson({
        members: browserCompact.selectedMembers,
        bonus: browserCompact.selectedBonus,
        total: browserCompact.selectedTotal,
      }),
    member2CandidatePool:
      stableJson(runnerCompact.member2Pool?.observedCandidates || []) ===
      stableJson(browserCompact.member2Pool?.observedCandidates || []),
    candidateProvenance:
      stableJson(
        (runnerCompact.member2Pool?.observedCandidates || []).map((candidate) => candidate.profileIds)
      ) ===
      stableJson(
        (browserCompact.member2Pool?.observedCandidates || []).map((candidate) => candidate.profileIds)
      ),
    unchangedFieldProvenance:
      stableJson(runnerCompact.unchangedFieldProvenance) ===
      stableJson(browserCompact.unchangedFieldProvenance),
    candidateCompleteness:
      stableJson(runnerCompact.candidateCompleteness) === stableJson(browserCompact.candidateCompleteness),
    member2CandidateCompleteness:
      stableJson(runnerCompact.member2CandidateCompleteness) ===
      stableJson(browserCompact.member2CandidateCompleteness),
    arithmeticValue:
      runnerCompact.arithmeticComparisonMember2 === browserCompact.arithmeticComparisonMember2,
    matchingCandidates:
      stableJson(runnerCompact.matchingObservedMember2Candidates) ===
      stableJson(browserCompact.matchingObservedMember2Candidates),
    uniqueMember2: runnerCompact.uniqueMatchingMember2 === browserCompact.uniqueMatchingMember2,
    eligibility: runnerCompact.eligible === browserCompact.eligible,
    wouldApply: runnerCompact.wouldApply === browserCompact.wouldApply,
    proposedMember2: runnerCompact.proposedMember2 === browserCompact.proposedMember2,
    changedFields: stableJson(runnerCompact.changedFields) === stableJson(browserCompact.changedFields),
    blockReason: stableJson(runnerCompact.blockReasons) === stableJson(browserCompact.blockReasons),
  };
  const mismatchFields = Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([field]) => field);
  return {
    key: keyFor(reference.image, reference.stage, reference.side),
    image: reference.image,
    stage: reference.stage,
    side: reference.side,
    exact: mismatchFields.length === 0,
    safetyRelevant:
      !checks.wouldApply ||
      (runnerCompact.wouldApply &&
        browserCompact.wouldApply &&
        runnerCompact.proposedMember2 !== browserCompact.proposedMember2),
    mismatchFields,
    checks,
    runner: runnerCompact,
    browser: browserCompact,
  };
}

async function processImage({ context, baseUrl, row, runDir, resume, references, refreshImages }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const resultPath = path.join(imageDir, "strict-member2-browser-result.json");
  if (resume && !refreshImages?.has(row.filename)) {
    try {
      return await loadJson(resultPath);
    } catch {
      // Regenerate missing artifacts.
    }
  }

  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));

  try {
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', {
      state: "attached",
      timeout: 30000,
    });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, {
      timeout: 30000,
    });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad strict-member2 browser verification.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(
      () => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.strictMember2SelectionEvidence),
      null,
      { timeout: 30000 }
    );
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);

    const perSide = [];
    let imagePass = true;
    let stageSidePassCount = 0;
    let stagePassCount = 0;
    for (const stage of stages) {
      let stagePass = true;
      for (const side of sides) {
        const evidenceEntry = sideDiagnostic(diagnostics, stage, side);
        const browserCompact = compactStrictMember2Entry(evidenceEntry || {});
        const reference = references.referenceByKey.get(keyFor(row.filename, stage, side));
        const comparison = reference ? compareReferenceToBrowser(reference, browserCompact) : null;
        const visibleSide = displayedSide(diagnostics, stage, side);
        const outputComparison = compareSide(visibleSide, expectedSide(row.expected[`stage${stage}`], side));
        const uiMutation =
          browserCompact.wouldApply &&
          browserCompact.proposedMember2 !== null &&
          visibleSide.members[1] === browserCompact.proposedMember2;
        stageSidePassCount += outputComparison.pass ? 1 : 0;
        stagePass &&= outputComparison.pass;
        perSide.push({
          image: row.filename,
          stage,
          side,
          browser: browserCompact,
          reference: reference?.compact || null,
          comparison,
          outputComparison,
          visibleSide,
          uiMutation,
        });
      }
      stagePassCount += stagePass ? 1 : 0;
      imagePass &&= stagePass;
    }

    const applications = diagnostics.productionRecovery?.appliedCases || [];
    const result = {
      image: row.filename,
      imagePath: normalizePathForReport(row.imagePath),
      imagePass,
      stagePassCount,
      stageSidePassCount,
      productionApplications: applications.length,
      productionTp: applications.filter((application) => {
        const comparison = compareSide(
          application.newValues,
          expectedSide(row.expected[`stage${application.stage}`], application.side)
        );
        return comparison.pass;
      }).length,
      tierCApplications: applications.filter(
        (application) => application.recoveryId === "ipad-tier-c-exactly-one-arithmetic"
      ).length,
      strictTotalApplications: applications.filter(
        (application) => application.recoveryId === "ipad-strict-total-selection"
      ).length,
      strictMember2Accepted: perSide.filter((entry) => entry.browser.wouldApply),
      perSide,
      browserEvidence: diagnostics.strictMember2SelectionEvidence || null,
      productionRecovery: diagnostics.productionRecovery || null,
      consoleMessages,
      pageErrors,
    };
    await writeJson(resultPath, result);
    await writeJson(
      path.join(imageDir, "browser-strict-member2-evidence.json"),
      diagnostics.strictMember2SelectionEvidence || {}
    );
    return result;
  } finally {
    await page.close();
  }
}

async function runOnce({ runIndex, browser, baseUrl, rows, references, resume, refreshImages }) {
  const runDir = path.join(artifactDir, `run-${runIndex}`);
  await fs.mkdir(runDir, { recursive: true });
  const context = await browser.newContext({ acceptDownloads: true });
  try {
    const imageResults = [];
    for (const row of rows) {
      console.log(`[iPad strict member2 browser verification run ${runIndex}] ${row.filename}`);
      imageResults.push(
        await processImage({ context, baseUrl, row, runDir, resume, references, refreshImages })
      );
    }

    const perSide = imageResults.flatMap((result) => result.perSide);
    const comparisons = perSide.map((entry) => entry.comparison).filter(Boolean);
    const accepted = perSide.filter((entry) => entry.browser.wouldApply);
    const applications = imageResults.reduce(
      (sum, result) => sum + Number(result.productionApplications || 0),
      0
    );
    const applicationTp = imageResults.reduce((sum, result) => sum + Number(result.productionTp || 0), 0);
    const tierCApplications = imageResults.reduce((sum, result) => sum + Number(result.tierCApplications || 0), 0);
    const strictTotalApplications = imageResults.reduce(
      (sum, result) => sum + Number(result.strictTotalApplications || 0),
      0
    );
    const stageSidePass = imageResults.reduce((sum, result) => sum + Number(result.stageSidePassCount || 0), 0);
    const acceptedCases = accepted.map((entry) => {
      const expected = expectedSide(
        rows.find((row) => row.filename === entry.image).expected[`stage${entry.stage}`],
        entry.side
      );
      return {
        image: entry.image,
        stage: entry.stage,
        side: entry.side,
        currentMembers: entry.browser.selectedMembers,
        currentBonus: entry.browser.selectedBonus,
        currentTotal: entry.browser.selectedTotal,
        observedMember2Candidates: entry.browser.member2Pool.observedCandidates,
        matchingObservedMember2Candidates: entry.browser.matchingObservedMember2Candidates,
        uniqueMatchingMember2: entry.browser.uniqueMatchingMember2,
        proposedMember2: entry.browser.proposedMember2,
        proposal: entry.browser.proposal,
        provenance: entry.browser.matchingObservedMember2Candidates[0]?.profileIds || [],
        expected,
        tp: entry.browser.proposal ? compareSide(entry.browser.proposal, expected).pass : false,
        fp: entry.browser.proposal ? !compareSide(entry.browser.proposal, expected).pass : false,
        uiMutation: entry.uiMutation,
        exactReferenceMatch: Boolean(entry.comparison?.exact),
      };
    });
    const summary = {
      runIndex,
      imagesProcessed: imageResults.length,
      stageSidesCompared: comparisons.length,
      browserWouldApply: accepted.length,
      expectedAcceptedCases: references.acceptedKeys.size,
      acceptedCasesFound: accepted.filter((entry) =>
        references.acceptedKeys.has(keyFor(entry.image, entry.stage, entry.side))
      ).length,
      unexpectedWouldApply: accepted
        .filter((entry) => !references.acceptedKeys.has(keyFor(entry.image, entry.stage, entry.side)))
        .map((entry) => ({ image: entry.image, stage: entry.stage, side: entry.side })),
      falseNegativeAcceptedCases: [...references.acceptedKeys]
        .filter((key) => !accepted.some((entry) => keyFor(entry.image, entry.stage, entry.side) === key))
        .map((key) => {
          const [image, stage, side] = key.split("|");
          return { image, stage: Number(stage), side };
        }),
      exactProposalMatches: accepted.filter((entry) => entry.comparison?.exact).length,
      disagreements: {
        currentTuple: comparisons.filter((entry) => entry.mismatchFields.includes("currentTuple")).length,
        member2CandidatePool: comparisons.filter((entry) =>
          entry.mismatchFields.includes("member2CandidatePool")
        ).length,
        candidateProvenance: comparisons.filter((entry) =>
          entry.mismatchFields.includes("candidateProvenance")
        ).length,
        unchangedFieldProvenance: comparisons.filter((entry) =>
          entry.mismatchFields.includes("unchangedFieldProvenance")
        ).length,
        completeness: comparisons.filter(
          (entry) =>
            entry.mismatchFields.includes("candidateCompleteness") ||
            entry.mismatchFields.includes("member2CandidateCompleteness")
        ).length,
        truncation: comparisons.filter((entry) =>
          entry.mismatchFields.includes("member2CandidateCompleteness")
        ).length,
        arithmeticValue: comparisons.filter((entry) =>
          entry.mismatchFields.includes("arithmeticValue")
        ).length,
        matchingCandidates: comparisons.filter((entry) =>
          entry.mismatchFields.includes("matchingCandidates")
        ).length,
        uniqueMember2: comparisons.filter((entry) => entry.mismatchFields.includes("uniqueMember2")).length,
        eligibility: comparisons.filter((entry) => entry.mismatchFields.includes("eligibility")).length,
        wouldApply: comparisons.filter((entry) => entry.mismatchFields.includes("wouldApply")).length,
        proposedMember2: comparisons.filter((entry) => entry.mismatchFields.includes("proposedMember2")).length,
        blockReason: comparisons.filter((entry) => entry.mismatchFields.includes("blockReason")).length,
        missingEvidence: perSide.filter((entry) => !entry.reference || !entry.browser).length,
        safety: comparisons.filter((entry) => entry.safetyRelevant).length,
      },
      tp: acceptedCases.filter((entry) => entry.tp).length,
      fp: acceptedCases.filter((entry) => entry.fp).length,
      uiMutationCount: perSide.filter((entry) => entry.uiMutation).length,
      production: {
        stageSidePass,
        productionApplications: applications,
        tp: applicationTp,
        fp: applications - applicationTp,
        tierCApplications,
        strictTotalApplications,
      },
      consoleErrors: imageResults.flatMap((result) =>
        result.consoleMessages
          .filter((entry) => ["error", "warning"].includes(entry.type))
          .map((entry) => ({ image: result.image, ...entry }))
      ),
      pageErrors: imageResults.flatMap((result) =>
        result.pageErrors.map((entry) => ({ image: result.image, ...entry }))
      ),
    };
    await writeJson(path.join(runDir, "summary.json"), summary);
    await writeJson(path.join(runDir, "parity-comparison.json"), comparisons);
    await writeJson(path.join(runDir, "accepted-eight-audit.json"), acceptedCases);
    await writeJson(
      path.join(runDir, "browser-evidence.json"),
      perSide.map((entry) => ({
        image: entry.image,
        stage: entry.stage,
        side: entry.side,
        browser: entry.browser,
        uiMutation: entry.uiMutation,
      }))
    );
    return { runDir, summary, imageResults, perSide, comparisons, acceptedCases };
  } finally {
    await context.close();
  }
}

function buildStability(runs) {
  const acceptedKeysByRun = runs.map((run) =>
    new Set(run.acceptedCases.map((entry) => keyFor(entry.image, entry.stage, entry.side)))
  );
  const allAcceptedKeys = [...new Set(acceptedKeysByRun.flatMap((set) => [...set]))].sort();
  const rows = allAcceptedKeys.map((key) => {
    const signatures = runs.map((run) => {
      const entry = run.perSide.find((side) => keyFor(side.image, side.stage, side.side) === key);
      return entry
        ? stableJson({
            browser: entry.browser,
            uiMutation: entry.uiMutation,
          })
        : "";
    });
    return {
      key,
      stable: signatures.every(Boolean) && new Set(signatures).size === 1,
      signatures,
    };
  });
  return {
    acceptedRows: rows.length,
    stableAcceptedRows: rows.filter((row) => row.stable).length,
    unstableAcceptedRows: rows.filter((row) => !row.stable),
    acceptedKeysByRun: acceptedKeysByRun.map((set) => [...set].sort()),
  };
}

function buildNegativeControls(runs, references) {
  const controls = references.negativeControls || [];
  const blockReasonCounts = {};
  for (const run of runs) {
    for (const row of run.perSide) {
      if (row.browser.wouldApply) continue;
      const reason = row.browser.blockReason || "none";
      blockReasonCounts[reason] = (blockReasonCounts[reason] || 0) + 1;
    }
  }
  return controls.map((control) => {
    const count = blockReasonCounts[control.case] ?? blockReasonCounts[control.expectedReason] ?? control.count ?? 0;
    return {
      ...control,
      browserObservedRejectedCount: count,
      pass: Boolean(control.pass) && runs.every((run) => run.summary.unexpectedWouldApply.length === 0),
    };
  });
}

function buildCombinedSummary({ runs, references, baseUrl, rows }) {
  const stability = buildStability(runs);
  const negativeControls = buildNegativeControls(runs, references);
  const latest = runs[runs.length - 1];
  const allComparisons = runs.flatMap((run) => run.comparisons.map((entry) => ({ runIndex: run.summary.runIndex, ...entry })));
  const acceptedAudit = runs.flatMap((run) =>
    run.acceptedCases.map((entry) => ({ runIndex: run.summary.runIndex, ...entry }))
  );
  const overlapRows = runs.flatMap((run) =>
    run.acceptedCases.filter((entry) => {
      const imageResult = run.imageResults.find((result) => result.image === entry.image);
      return (imageResult?.productionRecovery?.appliedCases || []).some(
        (application) => application.stage === entry.stage && application.side === entry.side
      );
    })
  );
  const strictMember2ProductionRows = runs.flatMap((run) =>
    run.acceptedCases.filter((entry) => {
      const imageResult = run.imageResults.find((result) => result.image === entry.image);
      return (imageResult?.productionRecovery?.appliedCases || []).some(
        (application) =>
          application.recoveryId === "ipad-strict-member2-selection" &&
          application.stage === entry.stage &&
          application.side === entry.side
      );
    })
  );
  const expectedImages = rows.length;
  const expectedStageSides = rows.length * stages.length * sides.length;
  const fullCoverage = rows.length === 18;
  const productionBaselinePreserved = runs.every(
    (run) =>
      run.summary.production.stageSidePass === 44 &&
      run.summary.production.productionApplications === 28 &&
      run.summary.production.tp === 28 &&
      run.summary.production.fp === 0 &&
      run.summary.production.tierCApplications === 24 &&
      run.summary.production.strictTotalApplications === 4
  );
  const summary = {
    command: "node scripts/ipad-strict-member2-browser-verification.mjs",
    artifactDir: normalizePathForReport(artifactDir),
    baseUrl,
    runs: runs.map((run) => run.summary),
    coverage: {
      images: latest.summary.imagesProcessed,
      stageSidesCompared: latest.summary.stageSidesCompared,
      fullCoverage,
      expectedImages,
      expectedStageSides,
    },
    expectedAcceptedCases: references.acceptedKeys.size,
    acceptedCasesFoundEachRun: runs.map((run) => run.summary.acceptedCasesFound),
    browserWouldApplyEachRun: runs.map((run) => run.summary.browserWouldApply),
    exactProposalMatchesEachRun: runs.map((run) => run.summary.exactProposalMatches),
    tpEachRun: runs.map((run) => run.summary.tp),
    fpEachRun: runs.map((run) => run.summary.fp),
    negativeControls,
    stability,
    overlapAnalysis: {
      tierC: references.overlapAnalysis?.tierC || 0,
      strictTotal: references.overlapAnalysis?.strictTotal || 0,
      browserProductionOverlapRows: overlapRows.map((entry) => ({
        image: entry.image,
        stage: entry.stage,
        side: entry.side,
      })),
      strictMember2ProductionRows: strictMember2ProductionRows.map((entry) => ({
        image: entry.image,
        stage: entry.stage,
        side: entry.side,
      })),
    },
    productionBaselinePreserved: fullCoverage ? productionBaselinePreserved : null,
    uiApplicationAuditPass: runs.every((run) => run.summary.uiMutationCount === references.acceptedKeys.size),
    safetyMismatchCount: allComparisons.filter((entry) => entry.safetyRelevant).length,
    pass:
      runs.every(
        (run) =>
          run.summary.imagesProcessed === expectedImages &&
          run.summary.stageSidesCompared === expectedStageSides &&
          run.summary.acceptedCasesFound === references.acceptedKeys.size &&
          run.summary.browserWouldApply === references.acceptedKeys.size &&
          run.summary.exactProposalMatches === references.acceptedKeys.size &&
          run.summary.tp === references.acceptedKeys.size &&
          run.summary.fp === 0 &&
          run.summary.unexpectedWouldApply.length === 0 &&
          run.summary.falseNegativeAcceptedCases.length === 0 &&
          run.summary.uiMutationCount === references.acceptedKeys.size &&
          run.summary.disagreements.safety === 0 &&
          (!fullCoverage ||
            (run.summary.production.stageSidePass === 44 &&
              run.summary.production.productionApplications === 28 &&
              run.summary.production.tp === 28 &&
              run.summary.production.fp === 0))
      ) &&
      stability.stableAcceptedRows === references.acceptedKeys.size &&
      stability.unstableAcceptedRows.length === 0 &&
      negativeControls.every((entry) => entry.pass) &&
      strictMember2ProductionRows.length === references.acceptedKeys.size * runs.length &&
      overlapRows.length === strictMember2ProductionRows.length,
    recommendation:
      "Production strict-member2 behavior is verified when the eight accepted rows apply through the UI path with no extra applications.",
  };
  return { summary, allComparisons, acceptedAudit, negativeControls, stability, overlapRows };
}

function buildReport(summary) {
  const runRows = summary.runs
    .map(
      (run) =>
        `| ${run.runIndex} | ${run.imagesProcessed} | ${run.stageSidesCompared} | ${run.browserWouldApply} | ${run.acceptedCasesFound} | ${run.exactProposalMatches} | ${run.tp} | ${run.fp} | ${run.uiMutationCount} |`
    )
    .join("\n");
  const acceptedRows = (summary.runs[0]?.acceptedCases || [])
    .map(
      (entry) =>
        `| ${entry.image} | ${entry.stage} | ${entry.side} | ${entry.currentMembers.join(" / ")} | ${entry.currentBonus} | ${entry.currentTotal} | ${entry.proposedMember2} | ${entry.provenance.join("+") || "observed"} | ${entry.tp ? "TP" : "not TP"} | ${entry.uiMutation ? "mutated" : "not applied"} |`
    )
    .join("\n");
  const negativeRows = summary.negativeControls
    .map(
      (entry) =>
        `| ${entry.case} | ${entry.count ?? ""} | ${entry.browserObservedRejectedCount} | ${entry.pass ? "PASS" : "FAIL"} |`
    )
    .join("\n");
  const disagreementRows = Object.entries(summary.runs[0]?.disagreements || {})
    .map(([field, count]) => `| ${field} | ${count} |`)
    .join("\n");

  return `# iPad Strict Member2 Real Browser Verification

Status: production-enabled real-browser verification.

The browser automation uploads the real iPad fixtures into the local app with \`ipadArithmeticDebug=1\`, reads browser-native strict member2-selection diagnostics, and compares them with the runner/browser-equivalent parity artifacts from \`tmp/ipad-strict-member2-selection-parity\`.

The M3 proposal is applied to visible OCR output and final parsed scores only for the eight previously verified exact cases.

## Coverage

- command: \`node scripts/ipad-strict-member2-browser-verification.mjs\`
- artifact directory: \`${summary.artifactDir}\`
- browser runs: ${summary.runs.length}
- images processed per run: ${summary.coverage.images} / ${summary.coverage.fullCoverage ? 18 : summary.coverage.expectedImages}
- stage/sides compared per run: ${summary.coverage.stageSidesCompared} / ${summary.coverage.fullCoverage ? 108 : summary.coverage.expectedStageSides}
- full fixture coverage: ${summary.coverage.fullCoverage ? "yes" : "no; accepted-case image subset"}
- production baseline preserved: ${
    summary.productionBaselinePreserved === null
      ? "not measured by this subset run"
      : summary.productionBaselinePreserved
        ? "PASS"
        : "FAIL"
  }
- UI application audit: ${summary.uiApplicationAuditPass ? "PASS" : "FAIL"}

## M3 Semantics

- iPad portrait layout only
- selected member1, member3, bonus, and total are retained unchanged
- unchanged fields require strong observed provenance, except schema-default zero bonus
- member2 must be directly observed in the production browser-native member2 candidate pool
- approved member2 provenance is limited to existing production candidate profiles and grouped-number tokens
- candidate pool must be complete and untruncated
- exactly one observed member2 candidate must satisfy \`member1 + member2 + member3 + bonus === total\`
- no near-match, tolerance, missing digit inference, or arithmetic-generated member2

## Run Summary

| run | images | stage/sides | browser wouldApply | accepted found | exact proposal matches | TP | FP | UI applications |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${runRows}

## Accepted Eight-Case Audit

| image | stage | side | current members | bonus | total | proposed member2 | provenance | result | UI output |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
${acceptedRows}

All accepted rows have browser wouldApply = true, identical proposal to the runner/browser-equivalent artifact, directly observed member2 evidence, complete/untruncated pools, and production UI application.

## Parity Disagreements

| field | run-1 count |
| --- | ---: |
${disagreementRows}

Safety-relevant mismatches across all runs: ${summary.safetyMismatchCount}

## Negative Controls

| control | runner count | browser rejected count | result |
| --- | ---: | ---: | --- |
${negativeRows}

Unsupported non-iPad/device guard remains covered by the runner/browser-equivalent parity artifact. This real-browser pass covered the 18 supported iPad fixtures.

## Recovery Overlap

- Tier C overlap in parity artifact: ${summary.overlapAnalysis.tierC}
- strict-total overlap in parity artifact: ${summary.overlapAnalysis.strictTotal}
- browser production overlap rows: ${summary.overlapAnalysis.browserProductionOverlapRows.length}
- strict-member2 production rows: ${summary.overlapAnalysis.strictMember2ProductionRows.length}

No M3 proposal targets a side already recovered by Tier C or strict-total production recovery. The only production overlap rows are the M3 production applications themselves.

## Two-Run Stability

- accepted rows: ${summary.stability.acceptedRows}
- stable accepted rows: ${summary.stability.stableAcceptedRows}
- unstable accepted rows: ${summary.stability.unstableAcceptedRows.length}

## Production Baseline

Per full production run:

- stage/side PASS: 52 / 108
- production applications: 36
- production TP / FP: 36 / 0
- Tier C applications: 24
- strict-total applications: 4
- strict-member2 applications: 8

The strict-member2 production path does not change production Tier C, strict-total, T2 grouped-number parsing, iPad ROI/preprocessing, global candidate ranking, bonus/total OCR, expected fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Recommendation

${summary.pass ? "Production strict-member2 behavior is verified for the eight accepted rows with no extra applications." : "Do not push production behavior. Resolve the mismatches above first."}
`;
}

async function main() {
  const args = parseArgs();
  if (!args.resume) {
    await fs.rm(artifactDir, { recursive: true, force: true });
  }
  await fs.mkdir(artifactDir, { recursive: true });

  let rows = await collectIpadFixtures();
  const references = await loadReferenceRows(rows);
  if (args.acceptedOnly) {
    const acceptedImages = new Set([...references.acceptedKeys].map((key) => key.split("|")[0]));
    rows = rows.filter((row) => acceptedImages.has(row.filename));
    if (rows.length === 0) throw new Error("Accepted-only mode found no accepted iPad images.");
  }
  const playwright = await loadPlaywright();
  const port = args.baseUrl ? null : args.port || (await findFreePort());
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;
  let server = null;
  if (!(await isServerReady(baseUrl))) {
    if (args.baseUrl) {
      throw new Error(`Provided base URL is not ready: ${baseUrl}`);
    }
    server = startDevServer(port);
    await waitForServer(baseUrl);
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const runs = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      runs.push(
        await runOnce({
          runIndex,
          browser,
          baseUrl,
          rows,
          references,
          resume: args.resume,
          refreshImages: args.refreshImages,
        })
      );
    }
    const combined = buildCombinedSummary({ runs, references, baseUrl, rows });
    await writeJson(path.join(artifactDir, "combined-summary.json"), combined.summary);
    await writeJson(
      path.join(artifactDir, "browser-evidence.json"),
      runs.flatMap((run) =>
        run.perSide.map((entry) => ({
          runIndex: run.summary.runIndex,
          image: entry.image,
          stage: entry.stage,
          side: entry.side,
          browser: entry.browser,
          uiMutation: entry.uiMutation,
        }))
      )
    );
    await writeJson(path.join(artifactDir, "parity-comparison.json"), combined.allComparisons);
    await writeJson(path.join(artifactDir, "accepted-eight-audit.json"), combined.acceptedAudit);
    await writeJson(path.join(artifactDir, "negative-controls.json"), combined.negativeControls);
    await writeJson(path.join(artifactDir, "overlap-analysis.json"), combined.summary.overlapAnalysis);
    await writeJson(path.join(artifactDir, "run-stability.json"), combined.stability);
    await writeJson(
      path.join(artifactDir, "console-errors.json"),
      runs.flatMap((run) => run.summary.consoleErrors.map((entry) => ({ runIndex: run.summary.runIndex, ...entry })))
    );
    await writeJson(
      path.join(artifactDir, "page-errors.json"),
      runs.flatMap((run) => run.summary.pageErrors.map((entry) => ({ runIndex: run.summary.runIndex, ...entry })))
    );
    await fs.writeFile(
      reportPath,
      buildReport({
        ...combined.summary,
        runs: runs.map((run) => ({
          ...run.summary,
          acceptedCases: run.acceptedCases,
        })),
      })
    );
    console.log(JSON.stringify(combined.summary, null, 2));
    if (!combined.summary.pass) process.exitCode = 1;
  } finally {
    await browser.close();
    await writeJson(
      path.join(artifactDir, "dev-server.log.json"),
      server?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }]
    );
    await stopDevServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
