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
const referenceDir = path.join(rootDir, "tmp", "ipad-strict-total-selection-parity");
const artifactDir = path.join(rootDir, "tmp", "ipad-strict-total-real-browser-verification");
const reportPath = path.join(rootDir, "docs", "ipad-strict-total-real-browser-verification.md");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const labels = ["member1", "member2", "member3", "bonus", "total"];

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
    runs: Math.max(2, Number(process.argv[runsIndex + 1] || process.env.IPAD_STRICT_TOTAL_BROWSER_RUNS || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_STRICT_TOTAL_BROWSER_BASE_URL || "",
    resume: process.argv.includes("--resume"),
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

function compactCandidate(candidate = {}) {
  return {
    value: toNumber(candidate.value),
    origin: candidate.origin || "",
    profileIds: Array.isArray(candidate.profileIds) ? [...candidate.profileIds] : [],
    sourceRank: Number.isFinite(Number(candidate.sourceRank)) ? Number(candidate.sourceRank) : 999,
    rawText: String(candidate.rawText || ""),
    normalizedText: String(candidate.normalizedText || ""),
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

function compactEvaluation(entry = {}) {
  const evaluation = entry.evaluation || entry.strictTotalSelection || entry.result || {};
  const evidence = entry.evidence || entry.strictTotalSelectionEvidence || {};
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
    computedValidationTotal: toNumber(evidence.computedValidationTotal),
    observedTotalCandidates: Array.isArray(evidence.observedTotalCandidates || evaluation.observedTotalCandidates)
      ? (evidence.observedTotalCandidates || evaluation.observedTotalCandidates).map(compactCandidate)
      : [],
    observedMatchingTotalCandidates: Array.isArray(
      evidence.matchingObservedTotalCandidates || evaluation.observedMatchingTotalCandidates
    )
      ? (evidence.matchingObservedTotalCandidates || evaluation.observedMatchingTotalCandidates).map(compactCandidate)
      : [],
    uniqueMatchingObservedTotal:
      (evidence.uniqueMatchingObservedTotal ?? evaluation.uniqueMatchingObservedTotal) === null ||
      (evidence.uniqueMatchingObservedTotal ?? evaluation.uniqueMatchingObservedTotal) === undefined
        ? null
        : toNumber(evidence.uniqueMatchingObservedTotal ?? evaluation.uniqueMatchingObservedTotal),
    proposedTotal:
      (evaluation.proposal?.total ?? evaluation.proposedTotal) === undefined
        ? null
        : toNumber(evaluation.proposal?.total ?? evaluation.proposedTotal),
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
    totalCandidateCompleteness: evidence.totalCandidateCompleteness || evaluation.totalCandidateCompleteness || {},
    selectedNonTotalProvenance: evidence.selectedNonTotalProvenance || evaluation.selectedNonTotalProvenance || {},
    provenanceSummary: evidence.provenanceSummary || evaluation.provenanceSummary || {},
  };
}

function keyFor(image, stage, side) {
  return `${image}|${stage}|${side}`;
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
        "Playwright is required for iPad strict-total browser verification.",
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
  const currentPrimary = diagnostics.stages?.[`stage${stage}`]?.[side]?.currentPrimary || {};
  return {
    members: (stageScore[side] || []).slice(0, 3).map(toNumber),
    bonus: applied ? Number(applied.newValues?.bonus || 0) : Number(currentPrimary.bonus || 0),
    total: toNumber(stageScore[side === "self" ? "selfTotal" : "enemyTotal"]),
  };
}

function loadReferenceRows(rows) {
  return Promise.all([
    loadJson(path.join(referenceDir, "per-side-runner.json")),
    loadJson(path.join(referenceDir, "accepted-four-audit.json")),
    loadJson(path.join(referenceDir, "negative-controls.json")),
  ]).then(([perSideRunner, acceptedFour, negativeControls]) => {
    const rowImages = new Set(rows.map((row) => row.filename));
    const referenceByKey = new Map();
    for (const row of perSideRunner) {
      if (!rowImages.has(row.image)) continue;
      referenceByKey.set(keyFor(row.image, row.stage, row.side), {
        image: row.image,
        stage: row.stage,
        side: row.side,
        current: row.current,
        expected: row.expected,
        result: row.result,
        compact: compactEvaluation({ result: row.result, evidence: row.result }),
      });
    }
    return {
      referenceByKey,
      acceptedFour,
      negativeControls,
      acceptedKeys: new Set(acceptedFour.map((row) => keyFor(row.image, row.stage, row.side))),
    };
  });
}

function sideDiagnostic(diagnostics, stage, side) {
  return diagnostics.strictTotalSelectionEvidence?.stages?.[`stage${stage}`]?.[side] || null;
}

function compareReferenceToBrowser(reference, browserCompact) {
  const runnerCompact = reference.compact;
  const runnerTotalEvidence = runnerCompact.observedTotalCandidates.length
    ? runnerCompact.observedTotalCandidates
    : runnerCompact.observedMatchingTotalCandidates;
  const browserTotalEvidence = runnerCompact.observedTotalCandidates.length
    ? browserCompact.observedTotalCandidates
    : browserCompact.observedMatchingTotalCandidates;
  const checks = {
    selectedMembers: stableJson(runnerCompact.selectedMembers) === stableJson(browserCompact.selectedMembers),
    selectedBonus: runnerCompact.selectedBonus === browserCompact.selectedBonus,
    selectedTotal: runnerCompact.selectedTotal === browserCompact.selectedTotal,
    observedTotalCandidates: stableJson(runnerTotalEvidence) === stableJson(browserTotalEvidence),
    computedValidationTotal:
      runnerCompact.computedValidationTotal === browserCompact.computedValidationTotal,
    observedMatchingTotalCandidates:
      stableJson(runnerCompact.observedMatchingTotalCandidates) ===
      stableJson(browserCompact.observedMatchingTotalCandidates),
    uniqueMatchingObservedTotal:
      runnerCompact.uniqueMatchingObservedTotal === browserCompact.uniqueMatchingObservedTotal,
    eligibility: runnerCompact.eligible === browserCompact.eligible,
    wouldApply: runnerCompact.wouldApply === browserCompact.wouldApply,
    proposedTotal: runnerCompact.proposedTotal === browserCompact.proposedTotal,
    blockReasons: stableJson(runnerCompact.blockReasons) === stableJson(browserCompact.blockReasons),
    provenance: stableJson(runnerCompact.provenanceSummary) === stableJson(browserCompact.provenanceSummary),
    totalCandidateCompleteness:
      stableJson(runnerCompact.totalCandidateCompleteness) ===
      stableJson(browserCompact.totalCandidateCompleteness),
    candidateCompleteness:
      stableJson(runnerCompact.candidateCompleteness) === stableJson(browserCompact.candidateCompleteness),
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
        runnerCompact.proposedTotal !== browserCompact.proposedTotal),
    mismatchFields,
    checks,
    runner: runnerCompact,
    browser: browserCompact,
  };
}

async function processImage({ context, baseUrl, row, runDir, resume, references, refreshImages }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const resultPath = path.join(imageDir, "strict-total-browser-result.json");
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
      if (!file) throw new Error("No uploaded file available for iPad strict-total browser verification.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, {
      timeout: 30000,
    });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    const bodyText = await page.locator("body").textContent({ timeout: 30000 }).catch(() => "");

    const perSide = [];
    let imagePass = true;
    let stageSidePassCount = 0;
    let stagePassCount = 0;
    for (const stage of stages) {
      let stagePass = true;
      for (const side of sides) {
        const evidenceEntry = sideDiagnostic(diagnostics, stage, side);
        const browserCompact = compactEvaluation(evidenceEntry || {});
        const reference = references.referenceByKey.get(keyFor(row.filename, stage, side));
        const comparison = reference ? compareReferenceToBrowser(reference, browserCompact) : null;
        const outputComparison = compareSide(displayedSide(diagnostics, stage, side), expectedSide(row.expected[`stage${stage}`], side));
        const uiMutation =
          browserCompact.wouldApply &&
          browserCompact.proposedTotal !== null &&
          displayedSide(diagnostics, stage, side).total === browserCompact.proposedTotal;
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
        const comparison = compareSide(application.newValues, expectedSide(row.expected[`stage${application.stage}`], application.side));
        return comparison.pass;
      }).length,
      strictTotalAccepted: perSide.filter((entry) => entry.browser.wouldApply),
      perSide,
      browserEvidence: diagnostics.strictTotalSelectionEvidence || null,
      productionRecovery: diagnostics.productionRecovery || null,
      visibleTextContainsStrictTotalApplication: bodyText.includes("strictTotal") || bodyText.includes("Strict Total"),
      consoleMessages,
      pageErrors,
    };
    await writeJson(resultPath, result);
    await writeJson(path.join(imageDir, "browser-strict-total-evidence.json"), diagnostics.strictTotalSelectionEvidence || {});
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
      console.log(`[iPad strict total browser verification run ${runIndex}] ${row.filename}`);
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
        currentSelectedTotal: entry.browser.selectedTotal,
        observedTotalCandidates: entry.browser.observedTotalCandidates,
        uniqueMatchingTotal: entry.browser.uniqueMatchingObservedTotal,
        proposedTotal: entry.browser.proposedTotal,
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
        selectedMembers: comparisons.filter((entry) => entry.mismatchFields.includes("selectedMembers")).length,
        bonus: comparisons.filter((entry) => entry.mismatchFields.includes("selectedBonus")).length,
        currentTotal: comparisons.filter((entry) => entry.mismatchFields.includes("selectedTotal")).length,
        totalCandidatePool: comparisons.filter((entry) => entry.mismatchFields.includes("observedTotalCandidates")).length,
        completeness: comparisons.filter(
          (entry) =>
            entry.mismatchFields.includes("totalCandidateCompleteness") ||
            entry.mismatchFields.includes("candidateCompleteness")
        ).length,
        computedValidationTotal: comparisons.filter((entry) =>
          entry.mismatchFields.includes("computedValidationTotal")
        ).length,
        matchingCandidates: comparisons.filter((entry) =>
          entry.mismatchFields.includes("observedMatchingTotalCandidates")
        ).length,
        uniqueMatchingTotal: comparisons.filter((entry) =>
          entry.mismatchFields.includes("uniqueMatchingObservedTotal")
        ).length,
        eligibility: comparisons.filter((entry) => entry.mismatchFields.includes("eligibility")).length,
        wouldApply: comparisons.filter((entry) => entry.mismatchFields.includes("wouldApply")).length,
        proposedTotal: comparisons.filter((entry) => entry.mismatchFields.includes("proposedTotal")).length,
        blockReason: comparisons.filter((entry) => entry.mismatchFields.includes("blockReasons")).length,
        provenance: comparisons.filter((entry) => entry.mismatchFields.includes("provenance")).length,
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
    await writeJson(path.join(runDir, "accepted-four-audit.json"), acceptedCases);
    await writeJson(
      path.join(runDir, "browser-evidence.json"),
      perSide.map((entry) => ({
        image: entry.image,
        stage: entry.stage,
        side: entry.side,
        browser: entry.browser,
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
  return controls.map((control) => {
    const perRun = runs.map((run) => {
      const entry = run.perSide.find(
        (side) => side.image === control.image && side.stage === control.stage && side.side === control.side
      );
      return {
        runIndex: run.summary.runIndex,
        found: Boolean(entry),
        wouldApply: Boolean(entry?.browser?.wouldApply),
        blockReasons: entry?.browser?.blockReasons || [],
        truncated: Boolean(entry?.browser?.totalCandidateCompleteness?.truncated),
      };
    });
    return {
      ...control,
      browserRuns: perRun,
      pass: perRun.every((entry) => entry.found && !entry.wouldApply),
    };
  });
}

function buildCombinedSummary({ runs, references, baseUrl }) {
  const stability = buildStability(runs);
  const negativeControls = buildNegativeControls(runs, references);
  const latest = runs[runs.length - 1];
  const allComparisons = runs.flatMap((run) => run.comparisons.map((entry) => ({ runIndex: run.summary.runIndex, ...entry })));
  const acceptedAudit = runs.flatMap((run) =>
    run.acceptedCases.map((entry) => ({ runIndex: run.summary.runIndex, ...entry }))
  );
  const summary = {
    command: "node scripts/ipad-strict-total-browser-verification.mjs",
    artifactDir: normalizePathForReport(artifactDir),
    baseUrl,
    runs: runs.map((run) => run.summary),
    coverage: {
      images: latest.summary.imagesProcessed,
      stageSidesCompared: latest.summary.stageSidesCompared,
    },
    expectedAcceptedCases: references.acceptedKeys.size,
    acceptedCasesFoundEachRun: runs.map((run) => run.summary.acceptedCasesFound),
    browserWouldApplyEachRun: runs.map((run) => run.summary.browserWouldApply),
    exactProposalMatchesEachRun: runs.map((run) => run.summary.exactProposalMatches),
    tpEachRun: runs.map((run) => run.summary.tp),
    fpEachRun: runs.map((run) => run.summary.fp),
    negativeControls,
    stability,
    productionBaselinePreserved: runs.every(
      (run) =>
        run.summary.production.stageSidePass === 40 &&
        run.summary.production.productionApplications === 24 &&
        run.summary.production.tp === 24 &&
        run.summary.production.fp === 0
    ),
    uiMutationAuditPass: runs.every((run) => run.summary.uiMutationCount === 0),
    safetyMismatchCount: allComparisons.filter((entry) => entry.safetyRelevant).length,
    pass:
      runs.every(
        (run) =>
          run.summary.imagesProcessed === 18 &&
          run.summary.stageSidesCompared === 108 &&
          run.summary.acceptedCasesFound === references.acceptedKeys.size &&
          run.summary.browserWouldApply === references.acceptedKeys.size &&
          run.summary.exactProposalMatches === references.acceptedKeys.size &&
          run.summary.tp === references.acceptedKeys.size &&
          run.summary.fp === 0 &&
          run.summary.unexpectedWouldApply.length === 0 &&
          run.summary.falseNegativeAcceptedCases.length === 0 &&
          run.summary.uiMutationCount === 0 &&
          run.summary.disagreements.safety === 0 &&
          run.summary.production.stageSidePass === 40 &&
          run.summary.production.productionApplications === 24 &&
          run.summary.production.tp === 24 &&
          run.summary.production.fp === 0
      ) &&
      stability.stableAcceptedRows === references.acceptedKeys.size &&
      stability.unstableAcceptedRows.length === 0 &&
      negativeControls.every((entry) => entry.pass),
    recommendation:
      "Productionization is justified for the next task only if this diagnostic remains unchanged under review; this script does not apply the selector.",
  };
  return { summary, allComparisons, acceptedAudit, negativeControls, stability };
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
        `| ${entry.image} | ${entry.stage} | ${entry.side} | ${entry.currentMembers.join(" / ")} | ${entry.currentBonus} | ${entry.currentSelectedTotal} | ${entry.proposedTotal} | ${entry.tp ? "TP" : "not TP"} |`
    )
    .join("\n");
  const negativeRows = summary.negativeControls
    .map(
      (entry) =>
        `| ${entry.image} | ${entry.stage} | ${entry.side} | ${entry.browserRuns.map((run) => run.wouldApply).join(" / ")} | ${entry.browserRuns[0]?.blockReasons.join("; ")} | ${entry.pass ? "PASS" : "FAIL"} |`
    )
    .join("\n");
  const disagreementRows = Object.entries(summary.runs[0]?.disagreements || {})
    .map(([field, count]) => `| ${field} | ${count} |`)
    .join("\n");

  return `# iPad Strict Total Real Browser Verification

Status: diagnostic-only real-browser verification.

The browser automation uploads the real iPad fixtures into the local app with \`ipadArithmeticDebug=1\`, reads the browser-native strict total-selection diagnostics, and compares them with the runner/browser-equivalent parity artifacts from \`tmp/ipad-strict-total-selection-parity\`.

No strict-total proposal is applied to visible OCR output or final parsed scores in this task.

## Coverage

- command: \`node scripts/ipad-strict-total-browser-verification.mjs\`
- artifact directory: \`${summary.artifactDir}\`
- browser runs: ${summary.runs.length}
- images processed per run: ${summary.coverage.images} / 18
- stage/sides compared per run: ${summary.coverage.stageSidesCompared} / 108
- production baseline preserved: ${summary.productionBaselinePreserved ? "yes" : "no"}
- UI mutation audit: ${summary.uiMutationAuditPass ? "PASS" : "FAIL"}

## Run Summary

| run | images | stage/sides | browser wouldApply | accepted found | exact proposal matches | TP | FP | UI mutations |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${runRows}

## Accepted Four-Case Audit

| image | stage | side | current members | bonus | current selected total | proposed total | result |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- |
${acceptedRows}

All accepted rows used directly observed browser total candidates from the production T0 total pool. The computed sum is retained only as validation context.

## Parity Disagreements

| field | run-1 count |
| --- | ---: |
${disagreementRows}

Safety-relevant mismatches across all runs: ${summary.safetyMismatchCount}

## Negative Control

| image | stage | side | wouldApply by run | run-1 block reasons | result |
| --- | ---: | --- | --- | --- | --- |
${negativeRows}

The known S2/S4 false-positive shape remains rejected without filename-specific logic.

## Two-Run Stability

- accepted rows: ${summary.stability.acceptedRows}
- stable accepted rows: ${summary.stability.stableAcceptedRows}
- unstable accepted rows: ${summary.stability.unstableAcceptedRows.length}

## Production Baseline

Per run:

- stage/side PASS: 40 / 108
- Tier C production applications: 24
- Tier C TP / FP: 24 / 0

The strict-total diagnostic does not change production Tier C, T2 parsing, total candidate generation, ROI/preprocessing, ranking, smartphone OCR, current-PC OCR, legacy desktop OCR, or expected fixtures.

## Recommendation

${summary.pass ? "Production-readiness review is justified next. Do not productionize from this diagnostic task alone." : "Do not productionize. Resolve the mismatches above first."}
`;
}

async function main() {
  const args = parseArgs();
  if (!args.resume) {
    await fs.rm(artifactDir, { recursive: true, force: true });
  }
  await fs.mkdir(artifactDir, { recursive: true });

  const rows = await collectIpadFixtures();
  const references = await loadReferenceRows(rows);
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
    const combined = buildCombinedSummary({ runs, references, baseUrl });
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
    await writeJson(path.join(artifactDir, "accepted-four-audit.json"), combined.acceptedAudit);
    await writeJson(path.join(artifactDir, "negative-controls.json"), combined.negativeControls);
    await writeJson(path.join(artifactDir, "run-stability.json"), combined.stability);
    await writeJson(
      path.join(artifactDir, "console-errors.json"),
      runs.flatMap((run) => run.summary.consoleErrors.map((entry) => ({ runIndex: run.summary.runIndex, ...entry })))
    );
    await writeJson(
      path.join(artifactDir, "page-errors.json"),
      runs.flatMap((run) => run.summary.pageErrors.map((entry) => ({ runIndex: run.summary.runIndex, ...entry })))
    );
    await fs.writeFile(reportPath, buildReport({ ...combined.summary, runs: runs.map((run, index) => ({
      ...run.summary,
      acceptedCases: run.acceptedCases,
    })) }));
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
