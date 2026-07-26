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
const artifactDir = path.join(rootDir, "tmp", "ipad-arithmetic-real-browser-verification");
const parityDir = path.join(rootDir, "tmp", "ipad-arithmetic-side-selection-parity");
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");

const requireFromHere = createRequire(import.meta.url);

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
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
      return createRequire(path.join(configuredModuleDir, "noop.js"))("playwright");
    }
    throw new Error(
      [
        "Playwright is required for real-browser iPad verification.",
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
    spawnSync("taskkill", ["/pid", String(server.child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
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

function compactCandidate(candidate = {}) {
  return {
    value: candidate.value,
    origin: candidate.origin,
    sourceRank: candidate.sourceRank,
    profileIds: [...(candidate.profileIds || [])].sort(),
    plusLike: Boolean(candidate.confidenceSignals?.plusLike),
  };
}

function compactFieldDiagnostics(pool = {}) {
  const candidates = (pool.candidates || []).map(compactCandidate);
  return {
    key: pool.key,
    field: pool.field,
    slot: pool.slot || 0,
    deviceMode: pool.deviceMode,
    poolSize: pool.poolSize,
    candidateCap: pool.candidateCap,
    rawDistinctCandidateCount: pool.rawDistinctCandidateCount,
    truncated: Boolean(pool.truncated),
    observedValues: pool.observedValues || [],
    values: candidates.map((candidate) => candidate.value),
    origins: candidates.map((candidate) => candidate.origin || "observed"),
  };
}

function compactSelectedTuple(tuple) {
  if (!tuple) return null;
  return {
    members: tuple.members || [],
    bonus: tuple.bonus || 0,
    total: tuple.total || 0,
    equation: tuple.equation || "",
    origins: tuple.origins || {},
    profileIds: Object.fromEntries(
      Object.entries(tuple.profileIds || {}).map(([key, values]) => [key, [...values].sort()])
    ),
  };
}

function compactBrowserSide(sideDiagnostics = {}) {
  const tierC = sideDiagnostics.tierC || {};
  const fieldDiagnostics = Object.fromEntries(
    Object.entries(sideDiagnostics.candidatePools || {}).map(([label, pool]) => [
      label,
      compactFieldDiagnostics(pool),
    ])
  );
  return {
    eligible: Boolean(tierC.eligible),
    wouldApply: Boolean(tierC.wouldApply),
    validTupleCount: tierC.validTupleCount || 0,
    selectedTuple: compactSelectedTuple(tierC.selectedTuple),
    changedFields: tierC.changedFields || [],
    blockReason: tierC.blockReason || "",
    candidateCompleteness: tierC.candidateCompleteness || {
      complete: false,
      missingLabels: [],
      truncatedLabels: [],
    },
    fieldDiagnostics,
  };
}

function compareSide({ image, stage, side, runnerSide, browserSide }) {
  const checks = {
    eligibility: runnerSide.eligible === browserSide.eligible,
    wouldApply: runnerSide.wouldApply === browserSide.wouldApply,
    validTupleCount: runnerSide.validTupleCount === browserSide.validTupleCount,
    selectedTuple: stableJson(runnerSide.selectedTuple) === stableJson(browserSide.selectedTuple),
    changedFields: stableJson(runnerSide.changedFields || []) === stableJson(browserSide.changedFields || []),
    blockReason: (runnerSide.blockReason || "") === (browserSide.blockReason || ""),
    candidateCompleteness:
      stableJson(runnerSide.candidateCompleteness || {}) === stableJson(browserSide.candidateCompleteness || {}),
    fieldDiagnostics:
      stableJson(runnerSide.fieldDiagnostics || {}) === stableJson(browserSide.fieldDiagnostics || {}),
  };
  const exact = Object.values(checks).every(Boolean);
  return {
    image,
    stage,
    side,
    checks,
    exact,
    safetyMismatch:
      !checks.wouldApply ||
      !checks.selectedTuple ||
      !checks.validTupleCount ||
      !checks.fieldDiagnostics,
    runner: runnerSide,
    browser: browserSide,
  };
}

async function processCase({ browser, baseUrl, acceptedCase, runnerRow, outputDir }) {
  const page = await browser.newPage({ acceptDownloads: true });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));

  const imageName = acceptedCase.image;
  const imagePath = path.join(ipadImageDir, imageName);
  const query = new URLSearchParams({
    ipadArithmeticDebug: "1",
    ipadArithmeticDebugStage: String(acceptedCase.stage),
    ipadArithmeticDebugSide: acceptedCase.side,
  });
  await page.goto(`${baseUrl}/?${query.toString()}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', {
    state: "attached",
    timeout: 30000,
  });
  await page.waitForTimeout(1000);
  await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', imagePath);
  await page.waitForFunction(
    () => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function",
    null,
    { timeout: 30000 }
  );
  await page.evaluate((label) => {
    const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
    const file = input?.files?.[0];
    if (!file) throw new Error("No uploaded file available for iPad arithmetic debug hook.");
    window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
  }, imageName);
  await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
  await page.click('[data-testid="run-ocr-button"]');
  await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', {
    timeout: 240000,
  });
  await page.waitForFunction(
    () => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier),
    null,
    { timeout: 30000 }
  );

  const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
  const hiddenJson = await page.inputValue('[data-testid="ipad-arithmetic-diagnostics-json"]');
  const hiddenDiagnostics = JSON.parse(hiddenJson);
  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await page.click('[data-testid="export-ipad-arithmetic-diagnostics"]');
  const download = await downloadPromise;
  const caseId = `${imageName.replace(/[^a-zA-Z0-9._-]/g, "_")}-stage${acceptedCase.stage}-${acceptedCase.side}`;
  const imageOutputDir = path.join(outputDir, caseId);
  await fs.mkdir(imageOutputDir, { recursive: true });
  const downloadedPath = path.join(imageOutputDir, "exported-diagnostics.json");
  await download.saveAs(downloadedPath);

  const stageKey = `stage${runnerRow.stage}`;
  const browserSideRaw = diagnostics.stages?.[stageKey]?.[runnerRow.side];
  const browserSide = compactBrowserSide(browserSideRaw);
  const comparisons = [
    compareSide({
      image: imageName,
      stage: runnerRow.stage,
      side: runnerRow.side,
      runnerSide: runnerRow.runner,
      browserSide,
    }),
  ];

  const exportMatchesWindow = stableJson(hiddenDiagnostics) === stableJson(diagnostics);
  const proposalAudit = diagnostics.proposalApplicationAudit || {};
  const outputUnchanged =
    diagnostics.productionOutputChanged === false &&
    proposalAudit.diagnosticsOnly === true &&
    proposalAudit.proposalAppliedByThisPath === false;

  const artifact = {
    image: imageName,
    stage: acceptedCase.stage,
    side: acceptedCase.side,
    imagePath: normalizePathForReport(imagePath),
    exportedPath: normalizePathForReport(downloadedPath),
    exportMatchesWindow,
    outputUnchanged,
    acceptedCases: (diagnostics.acceptedCases || []).map(
      ({ stage, side, currentPrimary, proposal, wouldApply }) => ({
        stage,
        side,
        currentPrimary,
        proposal,
        wouldApply,
      })
    ),
    proposalApplicationAudit: proposalAudit,
    comparisons,
    consoleMessages,
    pageErrors,
  };
  await fs.writeFile(path.join(imageOutputDir, "verification.json"), JSON.stringify(artifact, null, 2));
  await page.screenshot({ path: path.join(imageOutputDir, "page.png"), fullPage: true });
  await page.close();
  return artifact;
}

function summarizeArtifacts(artifacts, allAcceptedCases) {
  const comparisons = artifacts.flatMap((artifact) => artifact.comparisons);
  const mismatches = comparisons.filter((comparison) => !comparison.exact);
  const acceptedComparisons = comparisons.filter((comparison) =>
    allAcceptedCases.some(
      (accepted) =>
        accepted.image === comparison.image &&
        accepted.stage === comparison.stage &&
        accepted.side === comparison.side
    )
  );
  const acceptedMismatches = acceptedComparisons.filter((comparison) => !comparison.exact);
  const tupleValues = (tuple) =>
    tuple
      ? {
          members: tuple.members || [],
          bonus: tuple.bonus || 0,
          total: tuple.total || 0,
        }
      : null;
  const selectedTupleValueMatches = comparisons.filter(
    (comparison) =>
      stableJson(tupleValues(comparison.runner.selectedTuple)) ===
      stableJson(tupleValues(comparison.browser.selectedTuple))
  );
  const wouldApplyDisagreements = comparisons.filter(
    (comparison) => comparison.runner.wouldApply !== comparison.browser.wouldApply
  );
  const proposalValueDisagreements = comparisons.filter(
    (comparison) =>
      comparison.runner.wouldApply &&
      stableJson(tupleValues(comparison.runner.selectedTuple)) !==
        stableJson(tupleValues(comparison.browser.selectedTuple))
  );
  return {
    command: "node scripts/ipad-arithmetic-browser-verification.mjs",
    artifactDir: normalizePathForReport(artifactDir),
    imagesProcessed: artifacts.length,
    images: artifacts.map((artifact) => artifact.image),
    stageSidesCompared: comparisons.length,
    acceptedCasesExpected: allAcceptedCases.length,
    acceptedCasesCompared: acceptedComparisons.length,
    exactMatches: comparisons.length - mismatches.length,
    mismatches: mismatches.length,
    acceptedExactMatches: acceptedComparisons.length - acceptedMismatches.length,
    acceptedMismatches: acceptedMismatches.length,
    selectedTupleValueMatches: selectedTupleValueMatches.length,
    wouldApplyDisagreements: wouldApplyDisagreements.length,
    proposalValueDisagreements: proposalValueDisagreements.length,
    wouldApplyCount: comparisons.filter((comparison) => comparison.browser.wouldApply).length,
    tp: acceptedComparisons.filter(
      (comparison) =>
        comparison.browser.wouldApply &&
        stableJson(tupleValues(comparison.runner.selectedTuple)) ===
          stableJson(tupleValues(comparison.browser.selectedTuple))
    ).length,
    fp: comparisons.filter(
      (comparison) =>
        comparison.browser.wouldApply &&
        !allAcceptedCases.some(
          (accepted) =>
            accepted.image === comparison.image &&
            accepted.stage === comparison.stage &&
            accepted.side === comparison.side
        )
    ).length,
    safetyMismatches: comparisons.filter((comparison) => comparison.safetyMismatch).length,
    exportMismatches: artifacts.filter((artifact) => !artifact.exportMatchesWindow).length,
    outputMutationFindings: artifacts.filter((artifact) => !artifact.outputUnchanged).length,
    consoleErrors: artifacts.flatMap((artifact) =>
      artifact.consoleMessages
        .filter((entry) => ["error", "warning"].includes(entry.type))
        .map((entry) => ({ image: artifact.image, ...entry }))
    ),
    pageErrors: artifacts.flatMap((artifact) =>
      artifact.pageErrors.map((entry) => ({ image: artifact.image, ...entry }))
    ),
    recommendation:
      wouldApplyDisagreements.length || proposalValueDisagreements.length
        ? "Do not productionize from this browser diagnostic path yet; real-browser candidate evidence does not match runner parity for every accepted case."
        : "Real-browser diagnostics match runner accepted proposals; parity evidence is sufficient for the next productionization review.",
  };
}

async function main() {
  await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });

  const acceptedCases = await loadJson(path.join(parityDir, "accepted-cases.json"));
  const perSideParity = await loadJson(path.join(parityDir, "per-side-parity.json"));
  const acceptedRows = acceptedCases.map((acceptedCase) => {
    const runnerRow = perSideParity.find(
      (entry) =>
        entry.image === acceptedCase.image &&
        entry.stage === acceptedCase.stage &&
        entry.side === acceptedCase.side
    );
    if (!runnerRow) {
      throw new Error(
        `Missing runner parity row for ${acceptedCase.image} stage${acceptedCase.stage} ${acceptedCase.side}`
      );
    }
    return { acceptedCase, runnerRow };
  });

  const { chromium } = await loadPlaywright();
  let server = null;
  let baseUrl = process.env.IPAD_ARITHMETIC_BROWSER_BASE_URL || "http://127.0.0.1:3000";
  if (!(await isServerReady(`${baseUrl}/?ipadArithmeticDebug=1`))) {
    const port = await findFreePort();
    baseUrl = `http://127.0.0.1:${port}`;
    server = startDevServer(port);
  }
  const artifacts = [];
  try {
    await waitForServer(`${baseUrl}/?ipadArithmeticDebug=1`);
    const browser = await chromium.launch({ headless: true });
    try {
      for (const { acceptedCase, runnerRow } of acceptedRows) {
        artifacts.push(
          await processCase({
            browser,
            baseUrl,
            acceptedCase,
            runnerRow,
            outputDir: artifactDir,
          })
        );
      }
    } finally {
      await browser.close();
    }
  } finally {
    await fs.writeFile(
      path.join(artifactDir, "dev-server.log.json"),
      JSON.stringify(server?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }], null, 2)
    );
    await stopDevServer(server);
  }

  const summary = summarizeArtifacts(artifacts, acceptedCases);
  await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(artifactDir, "all-artifacts.json"), JSON.stringify(artifacts, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  if (
    summary.acceptedCasesCompared !== summary.acceptedCasesExpected ||
    summary.exportMismatches ||
    summary.outputMutationFindings ||
    summary.pageErrors.length ||
    (process.argv.includes("--fail-on-mismatch") &&
      (summary.acceptedMismatches || summary.fp || summary.safetyMismatches))
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
