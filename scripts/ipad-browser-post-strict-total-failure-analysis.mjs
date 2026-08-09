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
const artifactDir = path.join(rootDir, "tmp", "ipad-post-strict-total-failure-analysis");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fieldLabels = ["member1", "member2", "member3", "bonus", "total"];
const fieldTypes = {
  member1: "member",
  member2: "member",
  member3: "member",
  bonus: "bonus",
  total: "total",
};
const tierCRecoveryId = "ipad-tier-c-exactly-one-arithmetic";
const strictTotalRecoveryId = "ipad-strict-total-selection";

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    runs: Math.max(
      1,
      Number(process.argv[runsIndex + 1] || process.env.IPAD_POST_STRICT_TOTAL_FAILURE_ANALYSIS_RUNS || 2)
    ),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_POST_STRICT_TOTAL_FAILURE_ANALYSIS_BASE_URL || "",
    resume: process.argv.includes("--resume"),
  };
}

function rel(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function pct(pass, total) {
  return total ? Number(((pass / total) * 100).toFixed(1)) : 0;
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
        "Playwright is required for iPad browser failure analysis.",
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

function expectedField(expectedStage, side, label) {
  const expected = expectedSide(expectedStage, side);
  if (label.startsWith("member")) return expected.members[Number(label.replace("member", "")) - 1] || 0;
  return expected[label] || 0;
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
    wrongFieldCount: Object.values(fields).filter((ok) => !ok).length,
    actual,
    expected,
  };
}

function displayedSide(diagnostics, stage, side) {
  const stageScores = diagnostics.displayedOcrStages || {};
  const stageScore = stageScores[stage] || stageScores[`stage${stage}`] || {};
  const applied = (diagnostics.productionRecovery?.appliedCases || [])
    .filter((entry) => entry.stage === stage && entry.side === side)
    .at(-1);
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

function poolFor(diagnostics, stage, side, label) {
  return diagnostics.stages?.[`stage${stage}`]?.[side]?.candidatePools?.[label] || {};
}

function candidates(pool = {}, { includeDefault = false } = {}) {
  const observed = Array.isArray(pool.candidates)
    ? pool.candidates.map((candidate, index) => ({
        value: toNumber(candidate.value),
        origin: candidate.origin || "observed",
        profileId: candidate.profileId || "",
        profileIds: candidate.profileIds || [],
        rawText: candidate.rawText || "",
        normalizedText: candidate.normalizedText || "",
        sourceRank: Number(candidate.sourceRank ?? index),
        contributionCount: Array.isArray(candidate.contributions) ? candidate.contributions.length : 0,
        confidence:
          Array.isArray(candidate.contributions) && candidate.contributions.length
            ? Math.max(...candidate.contributions.map((entry) => Number(entry.ocrConfidence || 0)))
            : 0,
        plusLike: Boolean(candidate.confidenceSignals?.plusLike),
      }))
    : [];
  if (includeDefault && pool.fieldType === "bonus" && !observed.length) {
    return [
      {
        value: 0,
        origin: "schema-default-bonus-zero",
        profileIds: [],
        rawText: "",
        sourceRank: 999,
        contributionCount: 0,
        confidence: 0,
        plusLike: false,
      },
    ];
  }
  return observed;
}

function candidateHasT2(candidate = {}) {
  const haystack = [
    candidate.origin,
    candidate.profileId,
    ...(candidate.profileIds || []),
    candidate.rawText,
    candidate.normalizedText,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes("t2") || haystack.includes("grouped") || haystack.includes("grouped-number");
}

function applicationFor(diagnostics, stage, side, recoveryId = "") {
  const applied = (diagnostics.productionRecovery?.appliedCases || []).filter(
    (entry) => entry.stage === stage && entry.side === side
  );
  if (!recoveryId) return applied.at(-1) || null;
  return applied.find((entry) => entry.recoveryId === recoveryId) || null;
}

function allApplicationsFor(diagnostics, stage, side) {
  return (diagnostics.productionRecovery?.appliedCases || []).filter(
    (entry) => entry.stage === stage && entry.side === side
  );
}

function strictTotalFor(diagnostics, stage, side) {
  return diagnostics.stages?.[`stage${stage}`]?.[side]?.strictTotalSelection || {};
}

function tierCFor(diagnostics, stage, side) {
  return diagnostics.stages?.[`stage${stage}`]?.[side]?.tierC || {};
}

function poolIsIncomplete(pool = {}) {
  if (!pool?.key) return true;
  return Boolean(pool.truncated);
}

function observedExactCandidates(pool, expectedValue) {
  return candidates(pool, { includeDefault: false }).filter((candidate) => candidate.value === expectedValue);
}

function selectableExactCandidates(pool, expectedValue) {
  return candidates(pool, { includeDefault: true }).filter((candidate) => candidate.value === expectedValue);
}

function classifyFieldStatus({ pool, expectedValue, finalValue, label }) {
  if (!pool?.key) return "candidate pool empty";
  if (finalValue === expectedValue) return "selected exact";
  if (pool.truncated) return "candidate pool incomplete/truncated";
  const observedExact = observedExactCandidates(pool, expectedValue);
  if (observedExact.some(candidateHasT2)) return "exact grouped-number T2 candidate present";
  if (observedExact.length) return "exact observed candidate present but not selected";
  if (
    label === "bonus" &&
    expectedValue === 0 &&
    selectableExactCandidates(pool, expectedValue).some((candidate) => candidate.origin === "schema-default-bonus-zero")
  ) {
    return "permitted default-zero only";
  }
  if (!candidates(pool, { includeDefault: false }).length) return "candidate pool empty";
  return "exact candidate absent";
}

function wrongFieldsFromComparison(comparison) {
  return Object.entries(comparison.fields)
    .filter(([, pass]) => !pass)
    .map(([field]) => field);
}

function candidatePoolSummary(pool = {}, expectedValue = 0) {
  const observed = candidates(pool, { includeDefault: false });
  return {
    key: pool.key || "",
    fieldType: pool.fieldType || "",
    candidateCount: observed.length,
    truncated: Boolean(pool.truncated),
    candidateCap: pool.candidateCap || null,
    rawDistinctCandidateCount: pool.rawDistinctCandidateCount || null,
    exactExpectedCandidateCount: observed.filter((candidate) => candidate.value === expectedValue).length,
    exactExpectedT2CandidateCount: observed.filter((candidate) => candidate.value === expectedValue && candidateHasT2(candidate)).length,
    candidates: observed.slice(0, 20).map((candidate) => ({
      value: candidate.value,
      origin: candidate.origin,
      profileId: candidate.profileId,
      profileIds: candidate.profileIds,
      rawText: candidate.rawText,
      normalizedText: candidate.normalizedText,
      confidence: candidate.confidence,
      sourceRank: candidate.sourceRank,
    })),
  };
}

function expectedPresence(pool, expectedValue) {
  const observed = candidates(pool, { includeDefault: false });
  const selectable = candidates(pool, { includeDefault: true });
  if (!pool || !pool.key) return "OCR field unavailable";
  if (pool.truncated) return "candidate pool truncated/incomplete";
  if (!observed.length && !(pool.fieldType === "bonus" && expectedValue === 0)) return "candidate pool empty";
  if (observed.some((candidate) => candidate.value === expectedValue)) {
    return "present in observed browser candidates but not selected";
  }
  if (pool.fieldType === "bonus" && expectedValue === 0 && selectable.some((candidate) => candidate.value === 0)) {
    return "present only through permitted schema-default bonus zero";
  }
  return "absent from all candidates";
}

function selectedFieldValue(sideValue, label) {
  if (label.startsWith("member")) return sideValue.members[Number(label.replace("member", "")) - 1] || 0;
  return sideValue[label] || 0;
}

function tupleFullyPresent(diagnostics, stage, side, expected) {
  return fieldLabels.every((label) => {
    const pool = poolFor(diagnostics, stage, side, label);
    const value = selectedFieldValue(expected, label);
    const vals = candidates(pool, { includeDefault: true }).map((candidate) => candidate.value);
    return vals.includes(value);
  });
}

function tupleHasAnyExpectedEvidence(diagnostics, stage, side, expected) {
  return fieldLabels.some((label) => {
    const pool = poolFor(diagnostics, stage, side, label);
    const value = selectedFieldValue(expected, label);
    return candidates(pool, { includeDefault: true }).some((candidate) => candidate.value === value);
  });
}

function classifyStageSide({ diagnostics, stage, side, expected, primaryComparison, finalComparison }) {
  const tierC = diagnostics.stages?.[`stage${stage}`]?.[side]?.tierC || {};
  const applied = (diagnostics.productionRecovery?.appliedCases || []).some(
    (entry) => entry.stage === stage && entry.side === side
  );
  const hasUnavailable = fieldLabels.some((label) => {
    const pool = poolFor(diagnostics, stage, side, label);
    return !pool?.key;
  });
  if (hasUnavailable) return "H. OCR/export infrastructure failure";
  if (primaryComparison.pass && !applied) return "A. Primary PASS without Tier C";
  if (applied && finalComparison.pass) return "B. Recovered by production Tier C";
  const full = tupleFullyPresent(diagnostics, stage, side, expected);
  const incomplete = fieldLabels.some((label) => {
    const pool = poolFor(diagnostics, stage, side, label);
    return Boolean(pool.truncated) || (!candidates(pool, { includeDefault: label === "bonus" }).length);
  });
  if (incomplete) return "G. Candidate pool incomplete or truncated";
  if (full && tierC.blockReason) return "C. Arithmetic-valid expected tuple fully present in browser candidates but Tier C correctly blocked";
  if (full && !primaryComparison.pass) return "D. Expected tuple fully present but current-primary selection is wrong";
  if (tupleHasAnyExpectedEvidence(diagnostics, stage, side, expected)) {
    return "E. Some expected fields present, but the complete expected tuple is unavailable";
  }
  return "F. No useful expected candidate evidence";
}

function countMap(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function chooseCandidate(pool, strategy) {
  const list = candidates(pool, { includeDefault: strategy.includeDefaultBonusZero });
  if (!list.length) return 0;
  const current = list[0];
  if (strategy.id === "current-primary") return current.value;
  const scored = list
    .map((candidate, index) => {
      const profileCount = new Set(candidate.profileIds || []).size;
      const agreement = Math.max(profileCount, candidate.contributionCount || 0);
      const profilePreference =
        pool.fieldType === "bonus"
          ? (candidate.plusLike ? 6 : 0) + (candidate.profileIds || []).filter((id) => id.includes("blue-bonus")).length * 4
          : pool.fieldType === "total"
            ? (candidate.profileIds || []).filter((id) => id.includes("white-mask") || id.includes("baseline")).length
            : (candidate.profileIds || []).filter((id) => id.includes("baseline") || id.includes("white-mask")).length;
      return {
        candidate,
        index,
        current: index === 0,
        score:
          strategy.id === "agreement"
            ? agreement * 100 + profilePreference * 10 + candidate.confidence
            : profilePreference * 100 + agreement * 10 + candidate.confidence,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.current !== b.current) return a.current ? -1 : 1;
      return a.index - b.index;
    });
  return scored[0].candidate.value;
}

function applyStrategyToSide(diagnostics, stage, side, strategy) {
  const values = {};
  for (const label of fieldLabels) values[label] = chooseCandidate(poolFor(diagnostics, stage, side, label), strategy);
  return {
    members: [values.member1, values.member2, values.member3],
    bonus: values.bonus,
    total: values.total,
  };
}

function arithmeticValidTuples(diagnostics, stage, side) {
  const sets = Object.fromEntries(
    fieldLabels.map((label) => [label, candidates(poolFor(diagnostics, stage, side, label), { includeDefault: true })])
  );
  if (Object.values(sets).some((set) => !set.length)) return [];
  const tuples = [];
  for (const member1 of sets.member1) {
    for (const member2 of sets.member2) {
      for (const member3 of sets.member3) {
        for (const bonus of sets.bonus) {
          for (const total of sets.total) {
            if (member1.value + member2.value + member3.value + bonus.value !== total.value) continue;
            tuples.push({
              members: [member1.value, member2.value, member3.value],
              bonus: bonus.value,
              total: total.value,
            });
          }
        }
      }
    }
  }
  const byKey = new Map(tuples.map((tuple) => [stableJson(tuple), tuple]));
  return [...byKey.values()];
}

async function processImage({ browser, baseUrl, row, runDir, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "analysis-image.json");
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
      if (!file) throw new Error("No uploaded file available for iPad post-strict-total failure analysis.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, { timeout: 30000 });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    await fs.mkdir(imageDir, { recursive: true });
    const result = {
      image: row.filename,
      clusterId: row.clusterId,
      imagePath: rel(row.imagePath),
      expected: row.expected,
      diagnostics,
      consoleMessages,
      pageErrors,
    };
    await fs.writeFile(artifactPath, JSON.stringify(result, null, 2));
    return result;
  } finally {
    await page.close();
  }
}

function evaluateRun(rows, imageResults) {
  const stageSideRecords = [];
  const fieldRecords = [];
  const remainingFailures = [];
  const tierCBlocks = [];
  const strategyDefs = [
    { id: "agreement", label: "multi-profile agreement", includeDefaultBonusZero: false },
    { id: "agreement-default-zero", label: "multi-profile agreement plus default bonus zero", includeDefaultBonusZero: true },
    { id: "profile-reliability", label: "profile reliability by field type", includeDefaultBonusZero: false },
    { id: "profile-reliability-default-zero", label: "profile reliability plus default bonus zero", includeDefaultBonusZero: true },
  ];
  const strategyResults = Object.fromEntries(
    strategyDefs.map((strategy) => [
      strategy.id,
      {
        strategy,
        changedFields: 0,
        tpFieldChanges: 0,
        fpFieldChanges: 0,
        stageSideGains: 0,
        stageSideRegressions: 0,
        existingPassSidesLost: 0,
        stageSidePass: 0,
        fieldPass: 0,
        byCluster: {},
        byFieldType: {},
      },
    ])
  );

  const upper = {
    currentProduction: { fields: 0, stageSides: 0, stages: 0, images: 0 },
    perfectObservedSelection: { fields: 0, stageSides: 0, stages: 0, images: 0 },
    perfectSelectableWithDefaultZero: { fields: 0, stageSides: 0, stages: 0, images: 0 },
    perfectArithmeticSelection: { fields: 0, stageSides: 0, stages: 0, images: 0 },
    fullCandidatePresence: { fields: 0, stageSides: 0, stages: 0, images: 0 },
  };
  const strategyImageStagePass = Object.fromEntries(strategyDefs.map((strategy) => [strategy.id, { images: 0, stages: 0 }]));
  const upperImageStagePass = Object.fromEntries(Object.keys(upper).map((key) => [key, { images: 0, stages: 0 }]));

  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const diagnostics = imageResult.diagnostics;
    const imagePassByLayer = Object.fromEntries(Object.keys(upper).map((key) => [key, true]));
    const imagePassByStrategy = Object.fromEntries(strategyDefs.map((strategy) => [strategy.id, true]));
    for (const stage of stages) {
      const stagePassByLayer = Object.fromEntries(Object.keys(upper).map((key) => [key, true]));
      const stagePassByStrategy = Object.fromEntries(strategyDefs.map((strategy) => [strategy.id, true]));
      for (const side of sides) {
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const primary = currentPrimarySide(diagnostics, stage, side);
        const final = displayedSide(diagnostics, stage, side);
        const primaryComparison = compareSide(primary, expected);
        const finalComparison = compareSide(final, expected);
        const applied = (diagnostics.productionRecovery?.appliedCases || []).some(
          (entry) => entry.stage === stage && entry.side === side
        );
        const tierC = diagnostics.stages?.[`stage${stage}`]?.[side]?.tierC || {};
        const category = classifyStageSide({
          diagnostics,
          stage,
          side,
          expected,
          primaryComparison,
          finalComparison,
        });
        const fieldPresence = {};
        let observedPresenceFields = 0;
        let selectablePresenceFields = 0;
        for (const label of fieldLabels) {
          const expectedValue = selectedFieldValue(expected, label);
          const primaryValue = selectedFieldValue(primary, label);
          const finalValue = selectedFieldValue(final, label);
          const pool = poolFor(diagnostics, stage, side, label);
          const observedValues = candidates(pool, { includeDefault: false }).map((candidate) => candidate.value);
          const selectableValues = candidates(pool, { includeDefault: true }).map((candidate) => candidate.value);
          const presence = finalValue === expectedValue ? "selected primary" : expectedPresence(pool, expectedValue);
          fieldPresence[label] = presence;
          if (observedValues.includes(expectedValue)) observedPresenceFields += 1;
          if (selectableValues.includes(expectedValue)) selectablePresenceFields += 1;
          fieldRecords.push({
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            field: label,
            fieldType: fieldTypes[label],
            expectedValue,
            primaryValue,
            finalValue,
            primaryPass: primaryValue === expectedValue,
            finalPass: finalValue === expectedValue,
            presence,
            candidateCount: observedValues.length,
            observedValues,
            selectableValues,
            truncated: Boolean(pool.truncated),
            empty: !observedValues.length,
            provenance: (pool.candidates || [])
              .filter((candidate) => toNumber(candidate.value) === expectedValue)
              .map((candidate) => ({
                value: toNumber(candidate.value),
                origin: candidate.origin || "observed",
                profileIds: candidate.profileIds || [],
                rawText: candidate.rawText || "",
                contributionCount: candidate.contributions?.length || 0,
              })),
          });
        }

        const validTuples = arithmeticValidTuples(diagnostics, stage, side);
        const expectedTuplePresent = tupleFullyPresent(diagnostics, stage, side, expected);
        const arithmeticExpectedPresent = validTuples.some((tuple) => compareSide(tuple, expected).pass);
        const record = {
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          expected,
          currentPrimary: primary,
          currentProduction: final,
          primaryPass: primaryComparison.pass,
          finalPass: finalComparison.pass,
          productionTierCApplied: applied,
          tierC: {
            eligible: Boolean(tierC.eligible),
            wouldApply: Boolean(tierC.wouldApply),
            validTupleCount: Number(tierC.validTupleCount || 0),
            blockReason: tierC.blockReason || "",
            candidateCompleteness: tierC.candidateCompleteness || {},
          },
          wrongFieldCount: finalComparison.wrongFieldCount,
          fieldPresence,
          expectedTuplePresent,
          arithmeticExpectedPresent,
          arithmeticValidTupleCount: validTuples.length,
          earliestMissingEvidence:
            fieldLabels.find((label) => !candidates(poolFor(diagnostics, stage, side, label), { includeDefault: true }).some((candidate) => candidate.value === selectedFieldValue(expected, label))) || "",
          category,
        };
        stageSideRecords.push(record);
        if (!finalComparison.pass) remainingFailures.push(record);
        if (!applied) tierCBlocks.push({ ...record, blockReason: tierC.blockReason || (tierC.wouldApply ? "would-apply-not-applied" : "no-changed-fields-or-already-identical") });

        upper.currentProduction.fields += Object.values(finalComparison.fields).filter(Boolean).length;
        upper.currentProduction.stageSides += finalComparison.pass ? 1 : 0;
        upper.perfectObservedSelection.fields += observedPresenceFields;
        upper.perfectObservedSelection.stageSides += observedPresenceFields === 5 ? 1 : 0;
        upper.perfectSelectableWithDefaultZero.fields += selectablePresenceFields;
        upper.perfectSelectableWithDefaultZero.stageSides += selectablePresenceFields === 5 ? 1 : 0;
        upper.fullCandidatePresence.fields += selectablePresenceFields;
        upper.fullCandidatePresence.stageSides += selectablePresenceFields === 5 ? 1 : 0;
        upper.perfectArithmeticSelection.fields += arithmeticExpectedPresent ? 5 : Object.values(finalComparison.fields).filter(Boolean).length;
        upper.perfectArithmeticSelection.stageSides += arithmeticExpectedPresent ? 1 : finalComparison.pass ? 1 : 0;

        for (const key of Object.keys(upper)) {
          const sidePass =
            key === "currentProduction"
              ? finalComparison.pass
              : key === "perfectObservedSelection"
                ? observedPresenceFields === 5
                : key === "perfectArithmeticSelection"
                  ? arithmeticExpectedPresent || finalComparison.pass
                  : selectablePresenceFields === 5;
          stagePassByLayer[key] &&= sidePass;
          imagePassByLayer[key] &&= sidePass;
        }

        for (const strategy of strategyDefs) {
          const strategyActual = applyStrategyToSide(diagnostics, stage, side, strategy);
          const strategyComparison = compareSide(strategyActual, expected);
          const stats = strategyResults[strategy.id];
          const fieldLabelsChanged = fieldLabels.filter(
            (label) => selectedFieldValue(strategyActual, label) !== selectedFieldValue(primary, label)
          );
          const changedCorrectly = fieldLabelsChanged.filter(
            (label) =>
              selectedFieldValue(strategyActual, label) === selectedFieldValue(expected, label) &&
              selectedFieldValue(primary, label) !== selectedFieldValue(expected, label)
          );
          const changedWrongly = fieldLabelsChanged.filter(
            (label) => selectedFieldValue(strategyActual, label) !== selectedFieldValue(expected, label)
          );
          stats.changedFields += fieldLabelsChanged.length;
          stats.tpFieldChanges += changedCorrectly.length;
          stats.fpFieldChanges += changedWrongly.length;
          stats.fieldPass += Object.values(strategyComparison.fields).filter(Boolean).length;
          if (!primaryComparison.pass && strategyComparison.pass) stats.stageSideGains += 1;
          if (primaryComparison.pass && !strategyComparison.pass) {
            stats.stageSideRegressions += 1;
            stats.existingPassSidesLost += 1;
          }
          stats.stageSidePass += strategyComparison.pass ? 1 : 0;
          stats.byCluster[row.clusterId] ||= { changedFields: 0, tpFieldChanges: 0, fpFieldChanges: 0, stageSideGains: 0, stageSideRegressions: 0 };
          stats.byCluster[row.clusterId].changedFields += fieldLabelsChanged.length;
          stats.byCluster[row.clusterId].tpFieldChanges += changedCorrectly.length;
          stats.byCluster[row.clusterId].fpFieldChanges += changedWrongly.length;
          stats.byCluster[row.clusterId].stageSideGains += !primaryComparison.pass && strategyComparison.pass ? 1 : 0;
          stats.byCluster[row.clusterId].stageSideRegressions += primaryComparison.pass && !strategyComparison.pass ? 1 : 0;
          for (const label of fieldLabelsChanged) {
            const type = fieldTypes[label];
            stats.byFieldType[type] ||= { changedFields: 0, tpFieldChanges: 0, fpFieldChanges: 0 };
            stats.byFieldType[type].changedFields += 1;
            stats.byFieldType[type].tpFieldChanges += changedCorrectly.includes(label) ? 1 : 0;
            stats.byFieldType[type].fpFieldChanges += changedWrongly.includes(label) ? 1 : 0;
          }
          stagePassByStrategy[strategy.id] &&= strategyComparison.pass;
          imagePassByStrategy[strategy.id] &&= strategyComparison.pass;
        }
      }
      for (const key of Object.keys(upper)) upperImageStagePass[key].stages += stagePassByLayer[key] ? 1 : 0;
      for (const strategy of strategyDefs) strategyImageStagePass[strategy.id].stages += stagePassByStrategy[strategy.id] ? 1 : 0;
    }
    for (const key of Object.keys(upper)) upperImageStagePass[key].images += imagePassByLayer[key] ? 1 : 0;
    for (const strategy of strategyDefs) strategyImageStagePass[strategy.id].images += imagePassByStrategy[strategy.id] ? 1 : 0;
  }

  for (const [key, value] of Object.entries(upper)) {
    value.stages = upperImageStagePass[key].stages;
    value.images = upperImageStagePass[key].images;
    value.fieldAccuracy = pct(value.fields, 540);
    value.stageSideAccuracy = pct(value.stageSides, 108);
    value.stageAccuracy = pct(value.stages, 54);
    value.imageAccuracy = pct(value.images, 18);
  }
  for (const [key, stats] of Object.entries(strategyResults)) {
    stats.stages = strategyImageStagePass[key].stages;
    stats.images = strategyImageStagePass[key].images;
    stats.fieldAccuracy = pct(stats.fieldPass, 540);
    stats.stageSideAccuracy = pct(stats.stageSidePass, 108);
  }

  const wrongPrimaryFields = fieldRecords.filter((field) => !field.primaryPass);
  const selectionFailures = wrongPrimaryFields.filter((field) =>
    ["present in observed browser candidates but not selected"].includes(field.presence)
  );
  const defaultZeroOnly = wrongPrimaryFields.filter((field) => field.presence === "present only through permitted schema-default bonus zero");
  const incompleteFields = wrongPrimaryFields.filter((field) =>
    ["candidate pool empty", "candidate pool truncated/incomplete", "OCR field unavailable"].includes(field.presence)
  );
  const recognitionFailures = wrongPrimaryFields.filter((field) => field.presence === "absent from all candidates");

  const strategyList = Object.values(strategyResults).map((stats) => ({
    ...stats,
    recommendation:
      stats.fpFieldChanges === 0 && stats.existingPassSidesLost === 0 && stats.stageSideGains >= 3
        ? "candidate for a diagnostic-only follow-up"
        : "reject for now",
  }));
  const bestSafeStrategy = strategyList
    .filter((strategy) => strategy.fpFieldChanges === 0 && strategy.existingPassSidesLost === 0)
    .sort((a, b) => b.stageSideGains - a.stageSideGains)[0] || null;

  return {
    productionBaseline: {
      images: { pass: upper.currentProduction.images, total: 18, accuracy: upper.currentProduction.imageAccuracy },
      stages: { pass: upper.currentProduction.stages, total: 54, accuracy: upper.currentProduction.stageAccuracy },
      stageSides: { pass: upper.currentProduction.stageSides, total: 108, accuracy: upper.currentProduction.stageSideAccuracy },
      fields: { pass: upper.currentProduction.fields, total: 540, accuracy: upper.currentProduction.fieldAccuracy },
      tierCApplications: stageSideRecords.filter((record) => record.productionTierCApplied).length,
    },
    stageSideTaxonomy: {
      total: stageSideRecords.length,
      counts: countMap(stageSideRecords, (record) => record.category),
      records: stageSideRecords,
    },
    fieldTaxonomy: {
      total: fieldRecords.length,
      counts: countMap(fieldRecords, (record) => record.presence),
      byFieldType: countMap(fieldRecords, (record) => `${record.fieldType}:${record.presence}`),
      byCluster: countMap(fieldRecords, (record) => `${record.clusterId}:${record.presence}`),
      records: fieldRecords,
    },
    selectionRecognitionSplit: {
      totalWrongPrimaryFields: wrongPrimaryFields.length,
      selectionFailures: selectionFailures.length,
      recognitionFailures: recognitionFailures.length,
      defaultZeroOnlyCases: defaultZeroOnly.length,
      incompleteOrUnavailableCases: incompleteFields.length,
      byCluster: countMap(wrongPrimaryFields, (record) => `${record.clusterId}:${record.presence}`),
      byFieldType: countMap(wrongPrimaryFields, (record) => `${record.fieldType}:${record.presence}`),
    },
    tierCBlockReasons: {
      totalNotApplied: tierCBlocks.length,
      counts: countMap(tierCBlocks, (record) => record.blockReason || "other"),
      fullyPresentBlocked: tierCBlocks.filter((record) => record.expectedTuplePresent),
    },
    remainingFailures,
    candidatePresenceUpperBounds: upper,
    strategySimulations: strategyList,
    recommendedNextExperiment: bestSafeStrategy
      ? {
          recommendation: "Add a diagnostic-only browser candidate-ranking simulation for the safest zero-FP strategy.",
          strategy: bestSafeStrategy.strategy,
          stageSideGains: bestSafeStrategy.stageSideGains,
          fpFieldChanges: bestSafeStrategy.fpFieldChanges,
          reason: "It is the highest-gain strategy with no fixture-set FP field changes or existing PASS side loss in this browser-native evidence audit.",
        }
      : {
          recommendation: "Do not add a ranking simulation yet; all tested ranking strategies either regress fields or lack meaningful gain.",
          reason: "Recognition gaps dominate the remaining failures, and selection-only strategies do not yet meet the zero-FP plus useful-gain bar.",
        },
  };
}

function stabilityReport(runAnalyses) {
  const signatures = runAnalyses.map((analysis) =>
    stableJson({
      baseline: analysis.productionBaseline,
      taxonomyCounts: analysis.stageSideTaxonomy.counts,
      fieldCounts: analysis.fieldTaxonomy.counts,
      strategySimulations: analysis.strategySimulations.map((entry) => ({
        id: entry.strategy.id,
        changedFields: entry.changedFields,
        tpFieldChanges: entry.tpFieldChanges,
        fpFieldChanges: entry.fpFieldChanges,
        stageSideGains: entry.stageSideGains,
        stageSideRegressions: entry.stageSideRegressions,
        stageSidePass: entry.stageSidePass,
      })),
    })
  );
  return {
    runs: runAnalyses.length,
    stable: new Set(signatures).size === 1,
    signatures,
  };
}

function withPatchedSide(sideValue, expected, fieldsToFix = []) {
  const next = normalizeSide(sideValue);
  for (const field of fieldsToFix) {
    if (field === "member1") next.members[0] = expected.members[0];
    if (field === "member2") next.members[1] = expected.members[1];
    if (field === "member3") next.members[2] = expected.members[2];
    if (field === "bonus") next.bonus = expected.bonus;
    if (field === "total") next.total = expected.total;
  }
  return next;
}

function countPassLayers(rows, sideValuesByKey) {
  const fieldTotal = { pass: 0, total: 540, accuracy: 0 };
  let stageSides = 0;
  let stagesPass = 0;
  let imagesPass = 0;
  for (const row of rows) {
    let imagePass = true;
    for (const stage of stages) {
      let stagePass = true;
      for (const side of sides) {
        const key = `${row.filename}|${stage}|${side}`;
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const comparison = compareSide(sideValuesByKey.get(key), expected);
        fieldTotal.pass += Object.values(comparison.fields).filter(Boolean).length;
        if (comparison.pass) stageSides += 1;
        stagePass &&= comparison.pass;
        imagePass &&= comparison.pass;
      }
      if (stagePass) stagesPass += 1;
    }
    if (imagePass) imagesPass += 1;
  }
  fieldTotal.accuracy = pct(fieldTotal.pass, fieldTotal.total);
  return {
    exactFields: fieldTotal,
    stageSides: { pass: stageSides, total: 108, accuracy: pct(stageSides, 108) },
    stages: { pass: stagesPass, total: 54, accuracy: pct(stagesPass, 54) },
    images: { pass: imagesPass, total: 18, accuracy: pct(imagesPass, 18) },
  };
}

function fieldStatusHasExactCandidate(status) {
  return [
    "selected exact",
    "exact observed candidate present but not selected",
    "exact grouped-number T2 candidate present",
    "permitted default-zero only",
  ].includes(status);
}

function classifyStageSideV2({
  diagnostics,
  stage,
  side,
  expected,
  primaryComparison,
  finalComparison,
  fieldStatuses,
}) {
  const hasUnavailable = fieldLabels.some((label) => !poolFor(diagnostics, stage, side, label)?.key);
  if (hasUnavailable) return "H. Infrastructure/export failure";
  if (finalComparison.pass) {
    if (applicationFor(diagnostics, stage, side, tierCRecoveryId)) return "B. Recovered by Tier C";
    if (applicationFor(diagnostics, stage, side, strictTotalRecoveryId)) return "C. Recovered by strict-total";
    if (primaryComparison.pass) return "A. Primary PASS without production recovery";
    return "A. Primary PASS without production recovery";
  }
  const anyTruncated = fieldLabels.some((label) => poolIsIncomplete(poolFor(diagnostics, stage, side, label)));
  const fullTuplePresent = fieldLabels.every((label) => fieldStatusHasExactCandidate(fieldStatuses[label]));
  const anyExpected = fieldLabels.some((label) => fieldStatusHasExactCandidate(fieldStatuses[label]));
  if (fullTuplePresent) return "D. Full expected tuple present but safely blocked";
  if (anyTruncated) return "G. Candidate pool incomplete/truncated";
  if (anyExpected) return "E. Partial expected evidence only";
  return "F. No useful expected evidence";
}

function summarizeBlockReasonForTierC(tierC = {}, fieldStatuses = {}) {
  const reason = tierC.blockReason || "";
  if (reason.includes("truncated")) return "truncated candidate pool";
  if (reason.includes("missing") && reason.includes("member")) return "missing member candidate";
  if (reason.includes("missing") && reason.includes("bonus")) return "missing bonus candidate";
  if (reason.includes("missing") && reason.includes("total")) return "missing total candidate";
  if (reason.includes("multiple")) return "multiple valid tuples";
  if (reason.includes("already")) return "already identical";
  if (Number(tierC.validTupleCount || 0) === 0) return "zero valid tuples";
  if (Object.values(fieldStatuses).some((status) => status === "candidate pool incomplete/truncated")) {
    return "incomplete candidate pool";
  }
  return reason || "other";
}

function summarizeBlockReasonForStrictTotal(strictTotal = {}) {
  const reasons = strictTotal.blockReasons || (strictTotal.blockReason ? [strictTotal.blockReason] : []);
  if (reasons.some((reason) => reason.includes("selected-non-total-field-lacks"))) return "ineligible member/bonus provenance";
  if (reasons.some((reason) => reason.includes("missing-observed-total"))) return "missing observed total";
  if (reasons.some((reason) => reason.includes("truncated-total"))) return "truncated total pool";
  if (reasons.some((reason) => reason.includes("multiple-distinct"))) return "multiple observed matching totals";
  if (reasons.some((reason) => reason.includes("already-identical"))) return "current total already correct";
  if (strictTotal.totalCandidateCompleteness?.missing) return "missing observed total";
  if (strictTotal.totalCandidateCompleteness?.truncated) return "incomplete total pool";
  return reasons[0] || "other";
}

function evaluateRunV2(rows, imageResults) {
  const stageSideRecords = [];
  const fieldRecords = [];
  const stageSideValues = {
    current: new Map(),
    perfectFieldSelection: new Map(),
    perfectArithmeticTupleSelection: new Map(),
    perfectMemberRecognition: new Map(),
    perfectBonusRecognition: new Map(),
    perfectTotalRecognition: new Map(),
    perfectAllMemberSelection: new Map(),
    perfectMembersBonus: new Map(),
    perfectMembersTotal: new Map(),
    perfectBonusTotal: new Map(),
  };
  const leverageFamilies = [
    { id: "member1", fields: ["member1"] },
    { id: "member2", fields: ["member2"] },
    { id: "member3", fields: ["member3"] },
    { id: "allMembers", fields: ["member1", "member2", "member3"] },
    { id: "bonus", fields: ["bonus"] },
    { id: "total", fields: ["total"] },
    { id: "membersBonus", fields: ["member1", "member2", "member3", "bonus"] },
    { id: "membersTotal", fields: ["member1", "member2", "member3", "total"] },
    { id: "bonusTotal", fields: ["bonus", "total"] },
  ];
  const targetLeverageRows = Object.fromEntries(leverageFamilies.map((family) => [family.id, []]));

  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const diagnostics = imageResult.diagnostics;
    for (const stage of stages) {
      for (const side of sides) {
        const key = `${row.filename}|${stage}|${side}`;
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const primary = currentPrimarySide(diagnostics, stage, side);
        const final = displayedSide(diagnostics, stage, side);
        const primaryComparison = compareSide(primary, expected);
        const finalComparison = compareSide(final, expected);
        const tierC = tierCFor(diagnostics, stage, side);
        const strictTotal = strictTotalFor(diagnostics, stage, side);
        const fieldStatuses = {};
        const pools = {};
        const t2Fields = [];
        for (const label of fieldLabels) {
          const pool = poolFor(diagnostics, stage, side, label);
          const expectedValue = selectedFieldValue(expected, label);
          const finalValue = selectedFieldValue(final, label);
          const status = classifyFieldStatus({ pool, expectedValue, finalValue, label });
          const observedExact = observedExactCandidates(pool, expectedValue);
          fieldStatuses[label] = status;
          pools[label] = candidatePoolSummary(pool, expectedValue);
          if (observedExact.some(candidateHasT2)) t2Fields.push(label);
          fieldRecords.push({
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            field: label,
            fieldType: fieldTypes[label],
            expectedValue,
            primaryValue: selectedFieldValue(primary, label),
            finalValue,
            finalPass: finalValue === expectedValue,
            status,
            exactCandidatePresent: fieldStatusHasExactCandidate(status),
            t2CandidatePresent: observedExact.some(candidateHasT2),
            candidateCount: candidates(pool).length,
            truncated: Boolean(pool.truncated),
            empty: !candidates(pool).length,
            provenance: observedExact.map((candidate) => ({
              value: candidate.value,
              origin: candidate.origin,
              profileId: candidate.profileId,
              profileIds: candidate.profileIds,
              rawText: candidate.rawText,
              normalizedText: candidate.normalizedText,
              confidence: candidate.confidence,
            })),
          });
        }
        const category = classifyStageSideV2({
          diagnostics,
          stage,
          side,
          expected,
          primaryComparison,
          finalComparison,
          fieldStatuses,
        });
        const validTuples = arithmeticValidTuples(diagnostics, stage, side);
        const expectedTuplePresent = fieldLabels.every((label) => fieldStatusHasExactCandidate(fieldStatuses[label]));
        const expectedArithmeticTuplePresent = validTuples.some((tuple) => compareSide(tuple, expected).pass);
        const productionApplications = allApplicationsFor(diagnostics, stage, side);
        const record = {
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          category,
          expected,
          currentPrimary: primary,
          currentProduction: final,
          finalPass: finalComparison.pass,
          wrongFields: wrongFieldsFromComparison(finalComparison),
          productionApplications: productionApplications.map((entry) => ({
            recoveryId: entry.recoveryId,
            oldValues: entry.oldValues,
            newValues: entry.newValues,
            changedFields: entry.changedFields || [],
          })),
          productionRecoveryActuallyApplied: productionApplications.length > 0,
          tierCApplied: Boolean(applicationFor(diagnostics, stage, side, tierCRecoveryId)),
          strictTotalApplied: Boolean(applicationFor(diagnostics, stage, side, strictTotalRecoveryId)),
          tierC: {
            eligible: Boolean(tierC.eligible),
            wouldApply: Boolean(tierC.wouldApply),
            validTupleCount: Number(tierC.validTupleCount || 0),
            blockReason: tierC.blockReason || "",
            summarizedBlockReason: summarizeBlockReasonForTierC(tierC, fieldStatuses),
            candidateCompleteness: tierC.candidateCompleteness || {},
          },
          strictTotal: {
            eligible: Boolean(strictTotal.eligible),
            wouldApply: Boolean(strictTotal.wouldApply),
            blockReason: strictTotal.blockReason || "",
            blockReasons: strictTotal.blockReasons || [],
            summarizedBlockReason: summarizeBlockReasonForStrictTotal(strictTotal),
            candidateCompleteness: strictTotal.candidateCompleteness || {},
            totalCandidateCompleteness: strictTotal.totalCandidateCompleteness || {},
          },
          validArithmeticTupleCount: validTuples.length,
          expectedTuplePresent,
          expectedArithmeticTuplePresent,
          fieldStatuses,
          candidatePools: pools,
          t2Involvement: t2Fields,
          candidateCompleteness: {
            complete: fieldLabels.every((label) => !poolIsIncomplete(poolFor(diagnostics, stage, side, label))),
            truncatedFields: fieldLabels.filter((label) => Boolean(poolFor(diagnostics, stage, side, label).truncated)),
            emptyFields: fieldLabels.filter((label) => !candidates(poolFor(diagnostics, stage, side, label)).length),
          },
          earliestMissingEvidence:
            fieldLabels.find((label) => !fieldStatusHasExactCandidate(fieldStatuses[label])) || "",
        };
        stageSideRecords.push(record);
        stageSideValues.current.set(key, final);

        const fieldsWithExactCandidates = fieldLabels.filter((label) => fieldStatusHasExactCandidate(fieldStatuses[label]));
        stageSideValues.perfectFieldSelection.set(key, withPatchedSide(final, expected, fieldsWithExactCandidates));
        stageSideValues.perfectArithmeticTupleSelection.set(
          key,
          expectedArithmeticTuplePresent ? expected : final
        );
        stageSideValues.perfectMemberRecognition.set(key, withPatchedSide(final, expected, ["member1", "member2", "member3"]));
        stageSideValues.perfectBonusRecognition.set(key, withPatchedSide(final, expected, ["bonus"]));
        stageSideValues.perfectTotalRecognition.set(key, withPatchedSide(final, expected, ["total"]));
        stageSideValues.perfectAllMemberSelection.set(
          key,
          ["member1", "member2", "member3"].every((label) => fieldStatusHasExactCandidate(fieldStatuses[label]))
            ? withPatchedSide(final, expected, ["member1", "member2", "member3"])
            : final
        );
        stageSideValues.perfectMembersBonus.set(
          key,
          ["member1", "member2", "member3", "bonus"].every((label) => fieldStatusHasExactCandidate(fieldStatuses[label]))
            ? withPatchedSide(final, expected, ["member1", "member2", "member3", "bonus"])
            : final
        );
        stageSideValues.perfectMembersTotal.set(
          key,
          ["member1", "member2", "member3", "total"].every((label) => fieldStatusHasExactCandidate(fieldStatuses[label]))
            ? withPatchedSide(final, expected, ["member1", "member2", "member3", "total"])
            : final
        );
        stageSideValues.perfectBonusTotal.set(
          key,
          ["bonus", "total"].every((label) => fieldStatusHasExactCandidate(fieldStatuses[label]))
            ? withPatchedSide(final, expected, ["bonus", "total"])
            : final
        );
        if (!finalComparison.pass) {
          for (const family of leverageFamilies) {
            const patched = withPatchedSide(final, expected, family.fields);
            if (compareSide(patched, expected).pass) {
              targetLeverageRows[family.id].push({
                image: row.filename,
                stage,
                side,
                wrongFields: wrongFieldsFromComparison(finalComparison),
              });
            }
          }
        }
      }
    }
  }

  const categoryCounts = countMap(stageSideRecords, (record) => record.category);
  const remainingFailures = stageSideRecords.filter((record) => !record.finalPass);
  const fieldCounts = countMap(fieldRecords, (record) => record.status);
  const fieldCoverageByType = Object.fromEntries(
    fieldLabels.map((field) => {
      const rowsForField = fieldRecords.filter((record) => record.field === field);
      return [
        field,
        {
          total: rowsForField.length,
          selectedExact: rowsForField.filter((record) => record.status === "selected exact").length,
          exactCandidatePresent: rowsForField.filter((record) => record.exactCandidatePresent).length,
          exactCandidateAbsent: rowsForField.filter((record) => !record.exactCandidatePresent).length,
          t2CandidatePresent: rowsForField.filter((record) => record.t2CandidatePresent).length,
          byStatus: countMap(rowsForField, (record) => record.status),
        },
      ];
    })
  );
  const fieldCoverageByStage = Object.fromEntries(
    stages.map((stage) => {
      const rowsForStage = fieldRecords.filter((record) => record.stage === stage);
      return [
        `Stage${stage}`,
        {
          selectedExact: rowsForStage.filter((record) => record.status === "selected exact").length,
          exactCandidatePresent: rowsForStage.filter((record) => record.exactCandidatePresent).length,
          exactCandidateAbsent: rowsForStage.filter((record) => !record.exactCandidatePresent).length,
          byField: Object.fromEntries(
            fieldLabels.map((field) => {
              const rowsForField = rowsForStage.filter((record) => record.field === field);
              return [
                field,
                {
                  selectedExact: rowsForField.filter((record) => record.status === "selected exact").length,
                  exactCandidatePresent: rowsForField.filter((record) => record.exactCandidatePresent).length,
                  exactCandidateAbsent: rowsForField.filter((record) => !record.exactCandidatePresent).length,
                },
              ];
            })
          ),
        },
      ];
    })
  );
  const fieldCoverageByCluster = countMap(fieldRecords, (record) =>
    `${record.clusterId || "unknown"}:${record.field}:${record.exactCandidatePresent ? "present" : "absent"}`
  );
  const wrongFinalFields = fieldRecords.filter((record) => !record.finalPass);
  const recognitionFailures = wrongFinalFields.filter((record) => !record.exactCandidatePresent);
  const selectionFailures = wrongFinalFields.filter((record) => record.exactCandidatePresent);
  const productionRecoveries = {
    tierCApplications: stageSideRecords.filter((record) => record.tierCApplied).length,
    strictTotalApplications: stageSideRecords.filter((record) => record.strictTotalApplied).length,
    combinedApplications: stageSideRecords.filter((record) => record.productionRecoveryActuallyApplied).length,
    tierCTp: stageSideRecords.filter((record) => record.tierCApplied && record.finalPass).length,
    strictTotalTp: stageSideRecords.filter((record) => record.strictTotalApplied && record.finalPass).length,
    fp: stageSideRecords.filter((record) => record.productionRecoveryActuallyApplied && !record.finalPass).length,
  };
  const upperBounds = {
    A_currentProduction: countPassLayers(rows, stageSideValues.current),
    B_perfectFieldSelectionFromExistingCandidates: countPassLayers(rows, stageSideValues.perfectFieldSelection),
    C_perfectArithmeticTupleSelectionFromExistingCandidates: countPassLayers(rows, stageSideValues.perfectArithmeticTupleSelection),
    D_perfectMemberRecognitionLeavingBonusTotal: countPassLayers(rows, stageSideValues.perfectMemberRecognition),
    E_perfectBonusRecognitionLeavingMembersTotal: countPassLayers(rows, stageSideValues.perfectBonusRecognition),
    F_perfectTotalRecognitionLeavingMembersBonus: countPassLayers(rows, stageSideValues.perfectTotalRecognition),
    G_perfectAllMemberSelection: countPassLayers(rows, stageSideValues.perfectAllMemberSelection),
    H_perfectMembersBonus: countPassLayers(rows, stageSideValues.perfectMembersBonus),
    I_perfectMembersTotal: countPassLayers(rows, stageSideValues.perfectMembersTotal),
    J_perfectBonusTotal: countPassLayers(rows, stageSideValues.perfectBonusTotal),
  };
  const targetLeverage = Object.fromEntries(
    Object.entries(targetLeverageRows).map(([target, rowsForTarget]) => [
      target,
      { stageSides: rowsForTarget.length, rows: rowsForTarget },
    ])
  );
  const stage3Records = stageSideRecords.filter((record) => record.stage === 3);
  const stage3Fields = fieldRecords.filter((record) => record.stage === 3);
  const stage3Member2Fields = stage3Fields.filter((record) => record.field === "member2");
  const bonusFields = fieldRecords.filter((record) => record.field === "bonus");
  const totalFields = fieldRecords.filter((record) => record.field === "total");
  const auditForFields = (records) => ({
    total: records.length,
    selectedExact: records.filter((record) => record.status === "selected exact").length,
    exactCandidatePresent: records.filter((record) => record.exactCandidatePresent).length,
    exactCandidateAbsent: records.filter((record) => !record.exactCandidatePresent).length,
    selectionFailures: records.filter((record) => !record.finalPass && record.exactCandidatePresent).length,
    recognitionFailures: records.filter((record) => !record.finalPass && !record.exactCandidatePresent).length,
    emptyPool: records.filter((record) => record.status === "candidate pool empty").length,
    truncatedOrIncomplete: records.filter((record) => record.status === "candidate pool incomplete/truncated").length,
    t2CandidatePresent: records.filter((record) => record.t2CandidatePresent).length,
    byStatus: countMap(records, (record) => record.status),
  });
  const targetRankings = [
    {
      target: "Bonus candidate capture",
      addressableFields: bonusFields.filter((record) => !record.finalPass && !record.exactCandidatePresent).length,
      addressableStageSides: targetLeverage.bonus.stageSides,
      fpRisk: "medium",
      priorStatus: "still plausible if focused on capture, not ranking",
      implementationScope: "diagnostic browser-native bonus OCR profile/crop capture only",
      evidenceStability: "requires fresh browser verification",
      recommendation: "recommended next",
    },
    {
      target: "Bonus candidate selection",
      addressableFields: bonusFields.filter((record) => !record.finalPass && record.exactCandidatePresent).length,
      addressableStageSides: targetLeverage.bonus.stageSides,
      fpRisk: "medium-high",
      priorStatus: "selection must not outrank noisy plus-neighborhood candidates",
      implementationScope: "narrow selector only if exact provenance emerges",
      evidenceStability: "candidate pools available",
      recommendation: "secondary",
    },
    {
      target: "Bonus parser/tokenization",
      addressableFields: bonusFields.filter((record) => !record.finalPass && record.status.includes("T2")).length,
      addressableStageSides: targetLeverage.bonus.stageSides,
      fpRisk: "medium",
      priorStatus: "T2-like work already helped members; bonus grammar remains noisy",
      implementationScope: "parser diagnostic only",
      evidenceStability: "unknown",
      recommendation: "secondary",
    },
    {
      target: "Total candidate capture",
      addressableFields: totalFields.filter((record) => !record.finalPass && !record.exactCandidatePresent).length,
      addressableStageSides: targetLeverage.total.stageSides,
      fpRisk: "low-medium",
      priorStatus: "strict-total already captured the safest total-only rows",
      implementationScope: "diagnostic only",
      evidenceStability: "good for exact totals, but limited remaining leverage",
      recommendation: "lower priority after strict-total",
    },
    {
      target: "Total selection beyond strict-total",
      addressableFields: totalFields.filter((record) => !record.finalPass && record.exactCandidatePresent).length,
      addressableStageSides: targetLeverage.total.stageSides,
      fpRisk: "medium-high",
      priorStatus: "strict-total intentionally narrow; broadening needs new proof",
      implementationScope: "selector guard investigation",
      evidenceStability: "good",
      recommendation: "defer",
    },
    {
      target: "Member candidate capture",
      addressableFields: fieldRecords.filter((record) => record.fieldType === "member" && !record.finalPass && !record.exactCandidatePresent).length,
      addressableStageSides: targetLeverage.allMembers.stageSides,
      fpRisk: "high",
      priorStatus: "broad OCR profile/crop experiments mostly rejected",
      implementationScope: "large",
      evidenceStability: "weak for Stage3",
      recommendation: "defer unless narrowed",
    },
    {
      target: "Stage3 member2 work",
      addressableFields: stage3Member2Fields.filter((record) => !record.finalPass && !record.exactCandidatePresent).length,
      addressableStageSides: stage3Records.filter((record) => !record.finalPass && record.wrongFields.includes("member2")).length,
      fpRisk: "high",
      priorStatus: "PSM/crop/padding/symbol experiments already weak or rejected",
      implementationScope: "large",
      evidenceStability: "weak",
      recommendation: "defer",
    },
    {
      target: "Candidate ranking",
      addressableFields: selectionFailures.length,
      addressableStageSides: targetLeverage.member1.stageSides + targetLeverage.member2.stageSides + targetLeverage.member3.stageSides,
      fpRisk: "high",
      priorStatus: "previous broad ranking introduced FP/regressions",
      implementationScope: "medium",
      evidenceStability: "available but unsafe",
      recommendation: "reject for now",
    },
    {
      target: "Tier C broadening",
      addressableFields: 0,
      addressableStageSides: stageSideRecords.filter((record) => !record.finalPass && record.expectedArithmeticTuplePresent).length,
      fpRisk: "high",
      priorStatus: "do not broaden without exact new evidence",
      implementationScope: "medium",
      evidenceStability: "available",
      recommendation: "reject for now",
    },
  ];
  const recommendedNextExperiment =
    targetRankings.find((entry) => entry.recommendation === "recommended next") || targetRankings[0];

  return {
    productionBaseline: upperBounds.A_currentProduction,
    productionRecoveries,
    stageSideTaxonomy: {
      total: stageSideRecords.length,
      counts: categoryCounts,
      records: stageSideRecords,
    },
    remainingFailures,
    fieldTaxonomy: {
      total: fieldRecords.length,
      counts: fieldCounts,
      byField: fieldCoverageByType,
      byStage: fieldCoverageByStage,
      byCluster: fieldCoverageByCluster,
      records: fieldRecords,
    },
    recognitionVsSelection: {
      wrongFields: wrongFinalFields.length,
      selectionFailures: selectionFailures.length,
      recognitionFailures: recognitionFailures.length,
      incompleteOrTruncated: wrongFinalFields.filter((record) => record.status === "candidate pool incomplete/truncated").length,
      emptyPool: wrongFinalFields.filter((record) => record.status === "candidate pool empty").length,
      defaultZeroOnly: wrongFinalFields.filter((record) => record.status === "permitted default-zero only").length,
      parserSafeButUnselected: wrongFinalFields.filter((record) => record.status === "exact grouped-number T2 candidate present").length,
      byField: countMap(wrongFinalFields, (record) => `${record.field}:${record.exactCandidatePresent ? "selection" : "recognition"}`),
      byStage: countMap(wrongFinalFields, (record) => `Stage${record.stage}:${record.exactCandidatePresent ? "selection" : "recognition"}`),
    },
    tierCBlockReasons: {
      counts: countMap(stageSideRecords.filter((record) => !record.tierCApplied), (record) => record.tierC.summarizedBlockReason),
      records: stageSideRecords
        .filter((record) => !record.tierCApplied)
        .map((record) => ({
          image: record.image,
          stage: record.stage,
          side: record.side,
          reason: record.tierC.summarizedBlockReason,
          rawReason: record.tierC.blockReason,
        })),
    },
    strictTotalBlockReasons: {
      counts: countMap(stageSideRecords.filter((record) => !record.strictTotalApplied), (record) => record.strictTotal.summarizedBlockReason),
      records: stageSideRecords
        .filter((record) => !record.strictTotalApplied)
        .map((record) => ({
          image: record.image,
          stage: record.stage,
          side: record.side,
          reason: record.strictTotal.summarizedBlockReason,
          rawReasons: record.strictTotal.blockReasons,
        })),
    },
    stage3Audit: {
      stageSidePass: stage3Records.filter((record) => record.finalPass).length,
      stageSideFail: stage3Records.filter((record) => !record.finalPass).length,
      selfPass: stage3Records.filter((record) => record.side === "self" && record.finalPass).length,
      selfFail: stage3Records.filter((record) => record.side === "self" && !record.finalPass).length,
      enemyPass: stage3Records.filter((record) => record.side === "enemy" && record.finalPass).length,
      enemyFail: stage3Records.filter((record) => record.side === "enemy" && !record.finalPass).length,
      member1: auditForFields(stage3Fields.filter((record) => record.field === "member1")),
      member2: auditForFields(stage3Member2Fields),
      member3: auditForFields(stage3Fields.filter((record) => record.field === "member3")),
      bonus: auditForFields(stage3Fields.filter((record) => record.field === "bonus")),
      total: auditForFields(stage3Fields.filter((record) => record.field === "total")),
    },
    stage3Member2Audit: {
      ...auditForFields(stage3Member2Fields),
      substitutions: stage3Member2Fields.filter((record) => !record.finalPass && String(record.finalValue).length === String(record.expectedValue).length && record.finalValue !== 0).length,
      missingDigits: stage3Member2Fields.filter((record) => !record.finalPass && String(record.finalValue).length < String(record.expectedValue).length).length,
      extraDigits: stage3Member2Fields.filter((record) => !record.finalPass && String(record.finalValue).length > String(record.expectedValue).length).length,
      groupedNumberOpportunities: stage3Member2Fields.filter((record) => !record.finalPass && record.t2CandidatePresent).length,
    },
    bonusAudit: {
      ...auditForFields(bonusFields),
      zeroBonusFields: bonusFields.filter((record) => record.expectedValue === 0).length,
      nonZeroBonusFields: bonusFields.filter((record) => record.expectedValue !== 0).length,
      selectedWrongDespiteExactCandidate: bonusFields.filter((record) => !record.finalPass && record.exactCandidatePresent).length,
      stageSidesRecoverableIfOnlyBonusFixed: targetLeverage.bonus.stageSides,
    },
    totalAudit: {
      ...auditForFields(totalFields),
      strictTotalRecoveries: productionRecoveries.strictTotalApplications,
      exactPresentButUnselected: totalFields.filter((record) => !record.finalPass && record.exactCandidatePresent).length,
      stageSidesRecoverableIfOnlyTotalFixed: targetLeverage.total.stageSides,
    },
    oracleUpperBounds: upperBounds,
    targetLeverage,
    targetRankings,
    recommendedNextExperiment,
    productionUnchangedConfirmation: {
      t2ParserGrammar: "unchanged",
      enableIpadGroupedNumberMemberTokens: "unchanged",
      tierCSemantics: "unchanged",
      strictTotalSemantics: "unchanged",
      enableIpadStrictTotalSelection: "unchanged",
      ipadRoi: "unchanged",
      preprocessing: "unchanged",
      candidateRanking: "unchanged",
      expectedFixtures: "unchanged",
      smartphoneOcr: "unchanged",
      currentPcOcr: "unchanged",
      legacyDesktopOcr: "unchanged",
    },
  };
}

function stabilityReportV2(runAnalyses) {
  const signatures = runAnalyses.map((analysis) =>
    stableJson({
      productionBaseline: analysis.productionBaseline,
      productionRecoveries: analysis.productionRecoveries,
      categoryCounts: analysis.stageSideTaxonomy.counts,
      fieldCounts: analysis.fieldTaxonomy.counts,
      recognitionVsSelection: analysis.recognitionVsSelection,
      tierCBlockReasons: analysis.tierCBlockReasons.counts,
      strictTotalBlockReasons: analysis.strictTotalBlockReasons.counts,
      targetLeverage: Object.fromEntries(
        Object.entries(analysis.targetLeverage).map(([key, value]) => [key, value.stageSides])
      ),
      recommendedNextExperiment: analysis.recommendedNextExperiment.target,
    })
  );
  return {
    runs: runAnalyses.length,
    stable: new Set(signatures).size === 1,
    signatures,
  };
}

async function writeAnalysisArtifactsV2(outputDir, analysis) {
  await fs.writeFile(path.join(outputDir, "production-baseline.json"), JSON.stringify(analysis.productionBaseline, null, 2));
  await fs.writeFile(path.join(outputDir, "stage-side-taxonomy.json"), JSON.stringify(analysis.stageSideTaxonomy, null, 2));
  await fs.writeFile(path.join(outputDir, "field-taxonomy.json"), JSON.stringify(analysis.fieldTaxonomy, null, 2));
  await fs.writeFile(path.join(outputDir, "remaining-64-sides.json"), JSON.stringify(analysis.remainingFailures, null, 2));
  await fs.writeFile(path.join(outputDir, "tier-c-block-reasons.json"), JSON.stringify(analysis.tierCBlockReasons, null, 2));
  await fs.writeFile(path.join(outputDir, "strict-total-block-reasons.json"), JSON.stringify(analysis.strictTotalBlockReasons, null, 2));
  await fs.writeFile(path.join(outputDir, "recognition-vs-selection.json"), JSON.stringify(analysis.recognitionVsSelection, null, 2));
  await fs.writeFile(path.join(outputDir, "stage3-audit.json"), JSON.stringify(analysis.stage3Audit, null, 2));
  await fs.writeFile(path.join(outputDir, "stage3-member2-audit.json"), JSON.stringify(analysis.stage3Member2Audit, null, 2));
  await fs.writeFile(path.join(outputDir, "bonus-audit.json"), JSON.stringify(analysis.bonusAudit, null, 2));
  await fs.writeFile(path.join(outputDir, "total-audit.json"), JSON.stringify(analysis.totalAudit, null, 2));
  await fs.writeFile(path.join(outputDir, "oracle-upper-bounds.json"), JSON.stringify(analysis.oracleUpperBounds, null, 2));
  await fs.writeFile(path.join(outputDir, "target-leverage.json"), JSON.stringify(analysis.targetLeverage, null, 2));
  await fs.writeFile(path.join(outputDir, "recommended-next-experiment.json"), JSON.stringify(analysis.recommendedNextExperiment, null, 2));
  await fs.writeFile(path.join(outputDir, "combined-summary.json"), JSON.stringify({
    productionBaseline: analysis.productionBaseline,
    productionRecoveries: analysis.productionRecoveries,
    stageSideCategoryCounts: analysis.stageSideTaxonomy.counts,
    fieldCategoryCounts: analysis.fieldTaxonomy.counts,
    recognitionVsSelection: analysis.recognitionVsSelection,
    stage3Audit: analysis.stage3Audit,
    bonusAudit: analysis.bonusAudit,
    totalAudit: analysis.totalAudit,
    targetLeverage: Object.fromEntries(Object.entries(analysis.targetLeverage).map(([key, value]) => [key, value.stageSides])),
    recommendedNextExperiment: analysis.recommendedNextExperiment,
    productionUnchangedConfirmation: analysis.productionUnchangedConfirmation,
  }, null, 2));
}

async function runOnce({ runIndex, browser, baseUrl, rows, resume }) {
  const runDir = path.join(artifactDir, `run-${runIndex}`);
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad post-strict-total failure analysis run ${runIndex}] ${row.filename}`);
    imageResults.push(await processImage({ browser, baseUrl, row, runDir, resume }));
  }
  const analysis = evaluateRunV2(rows, imageResults);
  await writeAnalysisArtifactsV2(runDir, analysis);
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

async function writeAnalysisArtifacts(outputDir, analysis) {
  await fs.writeFile(path.join(outputDir, "production-baseline.json"), JSON.stringify(analysis.productionBaseline, null, 2));
  await fs.writeFile(path.join(outputDir, "stage-side-taxonomy.json"), JSON.stringify(analysis.stageSideTaxonomy, null, 2));
  await fs.writeFile(path.join(outputDir, "field-taxonomy.json"), JSON.stringify(analysis.fieldTaxonomy, null, 2));
  await fs.writeFile(path.join(outputDir, "remaining-failures.json"), JSON.stringify(analysis.remainingFailures, null, 2));
  await fs.writeFile(path.join(outputDir, "tier-c-block-reasons.json"), JSON.stringify(analysis.tierCBlockReasons, null, 2));
  await fs.writeFile(path.join(outputDir, "candidate-presence-upper-bounds.json"), JSON.stringify(analysis.candidatePresenceUpperBounds, null, 2));
  await fs.writeFile(path.join(outputDir, "selection-failure-analysis.json"), JSON.stringify(analysis.selectionRecognitionSplit, null, 2));
  await fs.writeFile(path.join(outputDir, "recognition-failure-analysis.json"), JSON.stringify(analysis.selectionRecognitionSplit, null, 2));
  await fs.writeFile(path.join(outputDir, "strategy-simulations.json"), JSON.stringify(analysis.strategySimulations, null, 2));
  await fs.writeFile(path.join(outputDir, "recommended-next-experiment.json"), JSON.stringify(analysis.recommendedNextExperiment, null, 2));
}

async function main() {
  const args = parseArgs();
  if (!args.resume) await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
  const rows = await collectFixtures();
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
    const runAnalyses = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      runAnalyses.push(await runOnce({ runIndex, browser, baseUrl, rows, resume: args.resume }));
    }
    const runStability = stabilityReportV2(runAnalyses);
    const latest = runAnalyses.at(-1);
    await writeAnalysisArtifactsV2(artifactDir, latest);
    const summary = {
      command: `node scripts/ipad-browser-post-strict-total-failure-analysis.mjs --runs ${args.runs}`,
      artifactDir: rel(artifactDir),
      baseUrl,
      productionBaseline: latest.productionBaseline,
      productionRecoveries: latest.productionRecoveries,
      stageSideCategoryCounts: latest.stageSideTaxonomy.counts,
      fieldCategoryCounts: latest.fieldTaxonomy.counts,
      recognitionVsSelection: latest.recognitionVsSelection,
      tierCBlockReasonCounts: latest.tierCBlockReasons.counts,
      strictTotalBlockReasonCounts: latest.strictTotalBlockReasons.counts,
      stage3Audit: latest.stage3Audit,
      bonusAudit: latest.bonusAudit,
      totalAudit: latest.totalAudit,
      oracleUpperBounds: latest.oracleUpperBounds,
      targetLeverage: Object.fromEntries(
        Object.entries(latest.targetLeverage).map(([key, value]) => [key, value.stageSides])
      ),
      targetRankings: latest.targetRankings,
      recommendedNextExperiment: latest.recommendedNextExperiment,
      runStability,
      totalsPass:
        latest.stageSideTaxonomy.total === 108 &&
        latest.fieldTaxonomy.total === 540 &&
        Object.values(latest.stageSideTaxonomy.counts).reduce((sum, value) => sum + value, 0) === 108 &&
        Object.values(latest.fieldTaxonomy.counts).reduce((sum, value) => sum + value, 0) === 540,
    };
    await fs.writeFile(path.join(artifactDir, "run-stability.json"), JSON.stringify(runStability, null, 2));
    await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.totalsPass || !runStability.stable) process.exitCode = 1;
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
