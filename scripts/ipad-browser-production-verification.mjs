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
const artifactDir = path.join(rootDir, "tmp", "ipad-browser-production-verification");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    runs: Math.max(1, Number(process.argv[runsIndex + 1] || process.env.IPAD_PRODUCTION_VERIFICATION_RUNS || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_PRODUCTION_VERIFICATION_BASE_URL || "",
    resume: process.argv.includes("--resume"),
  };
}

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

function percentage(pass, total) {
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
        "Playwright is required for iPad browser production verification.",
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
    membersPass: memberMatches.every((entry) => entry.pass),
    bonusPass: actual.bonus === expected.bonus,
    totalPass: actual.total === expected.total,
    memberMatches,
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

function compactApplication(application = {}) {
  return {
    recoveryId: application.recoveryId || "",
    stage: application.stage,
    side: application.side,
    oldValues: normalizeSide(application.oldValues || {}),
    newValues: normalizeSide(application.newValues || {}),
    changedFields: application.changedFields || [],
    provenance: application.provenance || {},
    validTupleCount: Number(application.validTupleCount || 0),
    candidateCompleteness: application.candidateCompleteness || {},
    defaultZeroUsage: Boolean(application.defaultZeroUsage),
    equation: application.equation || "",
  };
}

function compactBaselineProposal(proposal = {}) {
  const selectedTuple = proposal.tierC?.selectedTuple || proposal.selectedTuple || {};
  return {
    stage: proposal.stage,
    side: proposal.side,
    oldValues: normalizeSide(proposal.current || {}),
    newValues: normalizeSide(proposal.proposed || {}),
    changedFields: proposal.changedFields || [],
    provenance: {
      origins: selectedTuple.origins || {},
      profileIds: selectedTuple.profileIds || {},
    },
    validTupleCount: Number(proposal.tierC?.validTupleCount || proposal.validTupleCount || 0),
    candidateCompleteness: proposal.tierC?.candidateCompleteness || proposal.candidateCompleteness || {},
    defaultZeroUsage: selectedTuple.origins?.bonus === "schema-default-bonus-zero",
    equation: proposal.equation || proposal.tierC?.proposal?.equation || selectedTuple.equation || "",
  };
}

async function processImage({ browser, baseUrl, row, runDir, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const resultPath = path.join(imageDir, "production-result.json");
  if (resume) {
    try {
      return await loadJson(resultPath);
    } catch {
      // Continue and regenerate missing or incomplete image artifacts.
    }
  }
  const page = await browser.newPage({ acceptDownloads: true });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));

  try {
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1`, { waitUntil: "domcontentloaded" });
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
      if (!file) throw new Error("No uploaded file available for iPad production verification.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, {
      timeout: 30000,
    });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    const applications = (diagnostics.productionRecovery?.appliedCases || []).map(compactApplication);
    const perSide = [];
    let imagePass = true;
    let stagePassCount = 0;
    let stageSidePassCount = 0;
    for (const stage of stages) {
      let stagePass = true;
      for (const side of sides) {
        const comparison = compareSide(displayedSide(diagnostics, stage, side), expectedSide(row.expected[`stage${stage}`], side));
        stageSidePassCount += comparison.pass ? 1 : 0;
        stagePass &&= comparison.pass;
        perSide.push({
          stage,
          side,
          pass: comparison.pass,
          actual: comparison.actual,
          expected: comparison.expected,
        });
      }
      stagePassCount += stagePass ? 1 : 0;
      imagePass &&= stagePass;
    }

    await fs.mkdir(imageDir, { recursive: true });
    const result = {
      image: row.filename,
      imagePath: normalizePathForReport(row.imagePath),
      imagePass,
      stagePassCount,
      stageSidePassCount,
      applications,
      perSide,
      productionRecovery: diagnostics.productionRecovery || null,
      proposalApplicationAudit: diagnostics.proposalApplicationAudit || null,
      ocrText: await page.locator("body").textContent({ timeout: 30000 }).catch(() => ""),
      consoleMessages,
      pageErrors,
    };
    await fs.writeFile(path.join(imageDir, "production-result.json"), JSON.stringify(result, null, 2));
    return result;
  } finally {
    await page.close();
  }
}

async function runOnce({ runIndex, browser, baseUrl, rows, expectedApplications, resume }) {
  const runDir = path.join(artifactDir, `run-${runIndex}`);
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad production verification run ${runIndex}] ${row.filename}`);
    imageResults.push(await processImage({ browser, baseUrl, row, runDir, resume }));
  }

  const expectedByKey = new Map(
    expectedApplications.map((entry) => [`${entry.image}|${entry.stage}|${entry.side}`, entry])
  );
  const applications = imageResults.flatMap((result) =>
    result.applications.map((application) => ({
      image: result.image,
      ...application,
    }))
  );
  const applicationComparisons = expectedApplications.length
    ? applications.map((application) => {
        const expected = expectedByKey.get(`${application.image}|${application.stage}|${application.side}`);
        const expectedCompact = expected ? compactBaselineProposal(expected) : null;
        const actualCompact = {
          stage: application.stage,
          side: application.side,
          oldValues: application.oldValues,
          newValues: application.newValues,
          changedFields: application.changedFields,
          provenance: application.provenance,
          validTupleCount: application.validTupleCount,
          candidateCompleteness: application.candidateCompleteness,
          defaultZeroUsage: application.defaultZeroUsage,
          equation: application.equation,
        };
        return {
          image: application.image,
          stage: application.stage,
          side: application.side,
          expectedKnown: Boolean(expected),
          exact: Boolean(expectedCompact) && stableJson(actualCompact) === stableJson(expectedCompact),
          actual: actualCompact,
          expected: expectedCompact,
        };
      })
    : [];

  const passCounts = imageResults.reduce(
    (acc, result) => {
      acc.imagePass += result.imagePass ? 1 : 0;
      acc.stagePass += result.stagePassCount;
      acc.stageSidePass += result.stageSidePassCount;
      return acc;
    },
    { imagePass: 0, stagePass: 0, stageSidePass: 0 }
  );
  const applicationTp = applications.filter((application) => {
    const row = rows.find((entry) => entry.filename === application.image);
    return compareSide(application.newValues, expectedSide(row.expected[`stage${application.stage}`], application.side)).pass;
  }).length;
  const summary = {
    runIndex,
    imagesProcessed: imageResults.length,
    imagePass: passCounts.imagePass,
    imageFail: rows.length - passCounts.imagePass,
    stagePass: passCounts.stagePass,
    stageFail: rows.length * stages.length - passCounts.stagePass,
    stageSidePass: passCounts.stageSidePass,
    stageSideFail: rows.length * stages.length * sides.length - passCounts.stageSidePass,
    stageSideAccuracy: percentage(passCounts.stageSidePass, rows.length * stages.length * sides.length),
    productionApplications: applications.length,
    tp: applicationTp,
    fp: applications.length - applicationTp,
    expectedApplicationCount: expectedApplications.length,
    applicationComparisonExact: applicationComparisons.filter((entry) => entry.exact).length,
    applicationComparisonMismatches: applicationComparisons.filter((entry) => !entry.exact).length,
    unexpectedApplications: expectedApplications.length
      ? applicationComparisons.filter((entry) => !entry.expectedKnown)
      : [],
    missingExpectedApplications: expectedApplications.length
      ? expectedApplications.filter(
          (expected) =>
            !applications.some(
              (application) =>
                application.image === expected.image &&
                application.stage === expected.stage &&
                application.side === expected.side
            )
        )
      : [],
    consoleErrors: imageResults.flatMap((result) =>
      result.consoleMessages
        .filter((entry) => ["error", "warning"].includes(entry.type))
        .map((entry) => ({ image: result.image, ...entry }))
    ),
    pageErrors: imageResults.flatMap((result) => result.pageErrors.map((entry) => ({ image: result.image, ...entry }))),
  };
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(runDir, "applications.json"), JSON.stringify(applications, null, 2));
  await fs.writeFile(path.join(runDir, "application-comparisons.json"), JSON.stringify(applicationComparisons, null, 2));
  return { runDir, summary, imageResults, applications, applicationComparisons };
}

function buildStabilityReport(runs) {
  const signaturesByKey = new Map();
  for (const run of runs) {
    for (const application of run.applications) {
      const key = `${application.image}|${application.stage}|${application.side}`;
      signaturesByKey.set(key, [
        ...(signaturesByKey.get(key) || []),
        stableJson({
          oldValues: application.oldValues,
          newValues: application.newValues,
          changedFields: application.changedFields,
          provenance: application.provenance,
          validTupleCount: application.validTupleCount,
          defaultZeroUsage: application.defaultZeroUsage,
          equation: application.equation,
        }),
      ]);
    }
  }
  const rows = [...signaturesByKey.entries()].map(([key, signatures]) => ({
    key,
    stable: new Set(signatures).size === 1 && signatures.length === runs.length,
    signatures,
  }));
  return {
    applicationRows: rows.length,
    stableApplicationRows: rows.filter((row) => row.stable).length,
    unstableApplicationRows: rows.filter((row) => !row.stable),
  };
}

async function main() {
  const args = parseArgs();
  if (!args.resume) {
    await fs.rm(artifactDir, { recursive: true, force: true });
  }
  await fs.mkdir(artifactDir, { recursive: true });

  const rows = await collectIpadFixtures();
  const expectedApplications = [];
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
      runs.push(await runOnce({ runIndex, browser, baseUrl, rows, expectedApplications, resume: args.resume }));
    }
    const stability = buildStabilityReport(runs);
    const summary = {
      command: `node scripts/ipad-browser-production-verification.mjs --runs ${args.runs}`,
      artifactDir: normalizePathForReport(artifactDir),
      baseUrl,
      runs: runs.map((run) => run.summary),
      stability,
      expected: {
        imagesProcessed: 18,
        productionApplications: 24,
        tp: 24,
        fp: 0,
        stageSidePass: 40,
      },
      pass:
        runs.every(
          (run) =>
            run.summary.imagesProcessed === 18 &&
            run.summary.productionApplications === 24 &&
            run.summary.tp === 24 &&
            run.summary.fp === 0 &&
            run.summary.stageSidePass === 40
        ) && stability.unstableApplicationRows.length === 0,
    };
    await fs.writeFile(path.join(artifactDir, "combined-summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.pass) process.exitCode = 1;
  } finally {
    await browser.close();
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
