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
const artifactDir = path.join(rootDir, "tmp", "ipad-post-t2-failure-analysis");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fieldLabels = ["member1", "member2", "member3", "bonus", "total"];
const memberLabels = ["member1", "member2", "member3"];
const t2ProfileId = "ipad-grouped-number-token";
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
const fieldTypes = {
  member1: "member",
  member2: "member",
  member3: "member",
  bonus: "bonus",
  total: "total",
};

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    runs: Math.max(1, Number(process.argv[runsIndex + 1] || process.env.IPAD_POST_T2_FAILURE_ANALYSIS_RUNS || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_POST_T2_FAILURE_ANALYSIS_BASE_URL || "",
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

function poolFor(diagnostics, stage, side, label) {
  return diagnostics.stages?.[`stage${stage}`]?.[side]?.candidatePools?.[label] || {};
}

function candidates(pool = {}, { includeDefault = false } = {}) {
  const observed = Array.isArray(pool.candidates)
    ? pool.candidates.map((candidate, index) => ({
        value: toNumber(candidate.value),
        origin: candidate.origin || "observed",
        profileIds: candidate.profileIds || [],
        rawText: candidate.rawText || "",
        sourceRank: Number(candidate.sourceRank ?? index),
        contributionCount: Array.isArray(candidate.contributions) ? candidate.contributions.length : 0,
        confidence:
          Array.isArray(candidate.contributions) && candidate.contributions.length
            ? Math.max(...candidate.contributions.map((entry) => Number(entry.ocrConfidence || 0)))
            : 0,
        plusLike: Boolean(candidate.confidenceSignals?.plusLike),
        groupedNumberToken: candidate.groupedNumberToken || null,
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
  if ((candidate.profileIds || []).includes(t2ProfileId)) return true;
  if (candidate.profileId === t2ProfileId || candidate.origin === t2ProfileId) return true;
  if (candidate.groupedNumberToken) return true;
  return (candidate.contributions || []).some(
    (entry) =>
      entry.profileId === t2ProfileId ||
      entry.sourceProfileId === t2ProfileId ||
      entry.source === t2ProfileId ||
      entry.ruleVersion === "ipad-grouped-number-token-v1"
  );
}

function poolCandidatesWithT2(pool = {}) {
  return candidates(pool, { includeDefault: false }).filter(candidateHasT2);
}

function poolHasT2Expected(pool = {}, expectedValue) {
  return poolCandidatesWithT2(pool).some((candidate) => candidate.value === expectedValue);
}

function applicationHasT2(application = {}) {
  const provenance = application.provenance || {};
  const selected = application.selectedTuple || {};
  return JSON.stringify({ provenance, selected }).includes(t2ProfileId);
}

function applicationUsesT2ForChangedMember(application = {}) {
  const changedFields = application.changedFields || [];
  const profileIdsByField = application.provenance?.profileIds || {};
  return changedFields.some(
    (label) => memberLabels.includes(label) && (profileIdsByField[label] || []).includes(t2ProfileId)
  );
}

function appliedCaseFor(diagnostics, stage, side) {
  return (diagnostics.productionRecovery?.appliedCases || []).find(
    (entry) => entry.stage === stage && entry.side === side
  );
}

function sideKey(image, stage, side) {
  return `${image}|stage${stage}|${side}`;
}

function fieldKey(image, stage, side, label) {
  return `${sideKey(image, stage, side)}|${label}`;
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

function classifyStageSide({ image, diagnostics, stage, side, expected, primaryComparison, finalComparison }) {
  const tierC = diagnostics.stages?.[`stage${stage}`]?.[side]?.tierC || {};
  const appliedCase = appliedCaseFor(diagnostics, stage, side);
  const applied = Boolean(appliedCase);
  const hasUnavailable = fieldLabels.some((label) => {
    const pool = poolFor(diagnostics, stage, side, label);
    return !pool?.key;
  });
  if (hasUnavailable) return "H. Infrastructure/export failure";
  if (primaryComparison.pass && finalComparison.pass && !applied) return "A. Primary PASS without recovery";
  if (applied && finalComparison.pass && !historicalPreT2TierCApplicationKeys.has(sideKey(image, stage, side))) {
    return "C. Newly recoverable because of T2 member evidence";
  }
  if (applied && finalComparison.pass) return "B. Recovered by pre-existing Tier C evidence";
  const full = tupleFullyPresent(diagnostics, stage, side, expected);
  const incomplete = fieldLabels.some((label) => {
    const pool = poolFor(diagnostics, stage, side, label);
    return Boolean(pool.truncated) || (!candidates(pool, { includeDefault: label === "bonus" }).length);
  });
  if (incomplete) return "G. Candidate pool incomplete/truncated";
  if (full && (tierC.blockReason || !finalComparison.pass)) return "D. Expected tuple fully present but Tier C blocked safely";
  if (tupleHasAnyExpectedEvidence(diagnostics, stage, side, expected)) {
    return "E. Partial expected evidence only";
  }
  return "F. No useful expected evidence";
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
      if (!file) throw new Error("No uploaded file available for iPad browser failure analysis.");
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
        const appliedCase = appliedCaseFor(diagnostics, stage, side);
        const applied = Boolean(appliedCase);
        const tierC = diagnostics.stages?.[`stage${stage}`]?.[side]?.tierC || {};
        const category = classifyStageSide({
          diagnostics,
          image: row.filename,
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
          const observedCandidates = candidates(pool, { includeDefault: false });
          const observedValues = observedCandidates.map((candidate) => candidate.value);
          const selectableValues = candidates(pool, { includeDefault: true }).map((candidate) => candidate.value);
          const t2Candidates = memberLabels.includes(label) ? observedCandidates.filter(candidateHasT2) : [];
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
            expectedCandidatePresent: observedValues.includes(expectedValue),
            expectedT2CandidatePresent: t2Candidates.some((candidate) => candidate.value === expectedValue),
            t2CandidateValues: t2Candidates.map((candidate) => candidate.value),
            t2CandidateCount: t2Candidates.length,
            t2CandidateSeparators: t2Candidates.map((candidate) => candidate.groupedNumberToken?.separator || ""),
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
          productionT2Applied: applied && !historicalPreT2TierCApplicationKeys.has(sideKey(row.filename, stage, side)),
          productionChangedMemberCarriesT2: applied && applicationUsesT2ForChangedMember(appliedCase),
          productionApplicationRecoveryId: appliedCase?.recoveryId || "",
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

  const productionApplications = stageSideRecords.filter((record) => record.productionTierCApplied);
  const t2Applications = productionApplications.filter((record) => record.productionT2Applied);
  const preExistingApplications = productionApplications.filter((record) => !record.productionT2Applied);
  const changedMemberT2ProvenanceApplications = productionApplications.filter(
    (record) => record.productionChangedMemberCarriesT2
  );

  const summarizeFields = (records) => ({
    total: records.length,
    selectedPrimaryExact: records.filter((field) => field.primaryPass).length,
    finalExact: records.filter((field) => field.finalPass).length,
    expectedObservedCandidatePresent: records.filter((field) => field.expectedCandidatePresent).length,
    expectedT2CandidatePresent: records.filter((field) => field.expectedT2CandidatePresent).length,
    expectedValueAbsent: records.filter((field) => !field.expectedCandidatePresent).length,
    emptyPool: records.filter((field) => field.empty).length,
    incompleteTruncatedPool: records.filter((field) => field.truncated).length,
  });
  const fieldCoverage = {
    all: summarizeFields(fieldRecords),
    member1: summarizeFields(fieldRecords.filter((field) => field.field === "member1")),
    member2: summarizeFields(fieldRecords.filter((field) => field.field === "member2")),
    member3: summarizeFields(fieldRecords.filter((field) => field.field === "member3")),
    bonus: summarizeFields(fieldRecords.filter((field) => field.field === "bonus")),
    total: summarizeFields(fieldRecords.filter((field) => field.field === "total")),
  };
  fieldCoverage.member2ByStage = Object.fromEntries(
    stages.map((stage) => [
      `stage${stage}`,
      summarizeFields(fieldRecords.filter((field) => field.field === "member2" && field.stage === stage)),
    ])
  );

  const t2CandidateFields = fieldRecords.filter((field) => field.t2CandidateCount > 0);
  const t2CandidateAudit = {
    totalT2CandidatesEmitted: fieldRecords.reduce((sum, field) => sum + field.t2CandidateCount, 0),
    uniqueFieldsReceivingT2Candidates: t2CandidateFields.length,
    commaCandidates: fieldRecords.reduce(
      (sum, field) => sum + field.t2CandidateSeparators.filter((separator) => separator === ",").length,
      0
    ),
    periodCandidates: fieldRecords.reduce(
      (sum, field) => sum + field.t2CandidateSeparators.filter((separator) => separator === ".").length,
      0
    ),
    byMemberSlot: countMap(t2CandidateFields, (field) => field.field),
    byStage: countMap(t2CandidateFields, (field) => `stage${field.stage}`),
    byCluster: countMap(t2CandidateFields, (field) => field.clusterId || "unknown"),
    candidatesUsedByTierC: t2Applications.length,
    changedMemberT2ProvenanceApplications: changedMemberT2ProvenanceApplications.length,
    fieldsUsedByTierC: fieldRecords.filter((field) =>
      t2Applications.some(
        (record) => record.image === field.image && record.stage === field.stage && record.side === field.side
      )
    ).length,
    candidatesNotUsedByTierC: Math.max(
      0,
      fieldRecords.reduce((sum, field) => sum + field.t2CandidateCount, 0) - t2Applications.length
    ),
    dedupedAgainstExistingEvidence: t2CandidateFields.filter((field) =>
      field.provenance.some((candidate) => candidate.profileIds?.length > 1 && candidate.profileIds.includes(t2ProfileId))
    ).length,
    wrongT2CandidateFields: t2CandidateFields.filter(
      (field) => !field.t2CandidateValues.includes(field.expectedValue)
    ).map((field) => ({
      image: field.image,
      stage: field.stage,
      side: field.side,
      field: field.field,
      expectedValue: field.expectedValue,
      t2CandidateValues: field.t2CandidateValues,
    })),
  };

  const wrongFinalFields = fieldRecords.filter((field) => !field.finalPass);
  const selectionFailuresFinal = wrongFinalFields.filter((field) => field.expectedCandidatePresent);
  const recognitionFailuresFinal = wrongFinalFields.filter((field) => !field.expectedCandidatePresent);
  const selectionRecognitionSplit = {
    totalWrongFields: wrongFinalFields.length,
    selectionFailures: selectionFailuresFinal.length,
    recognitionFailures: recognitionFailuresFinal.length,
    incompleteTruncated: wrongFinalFields.filter((field) => field.truncated).length,
    emptyPool: wrongFinalFields.filter((field) => field.empty).length,
    defaultZeroOnly: wrongFinalFields.filter((field) => field.field === "bonus" && field.expectedValue === 0 && !field.expectedCandidatePresent).length,
    byField: countMap(wrongFinalFields, (field) =>
      `${field.field}:${field.expectedCandidatePresent ? "selection" : "recognition"}`
    ),
    byStage: countMap(wrongFinalFields, (field) =>
      `stage${field.stage}:${field.expectedCandidatePresent ? "selection" : "recognition"}`
    ),
    byCluster: countMap(wrongFinalFields, (field) =>
      `${field.clusterId}:${field.expectedCandidatePresent ? "selection" : "recognition"}`
    ),
    byMemberSlot: countMap(
      wrongFinalFields.filter((field) => memberLabels.includes(field.field)),
      (field) => `${field.field}:${field.expectedCandidatePresent ? "selection" : "recognition"}`
    ),
  };

  const normalizeBlockReason = (record) => {
    const reason = record.tierC.blockReason || record.blockReason || "";
    const missing = reason.match(/missing-candidate:([^,\s]+)/);
    if (missing) {
      if (missing[1].startsWith("member")) return "missing member candidate";
      if (missing[1] === "total") return "missing total candidate";
      if (missing[1] === "bonus") return "missing bonus candidate";
    }
    if (reason.includes("incomplete")) return "candidate pool incomplete";
    if (reason.includes("truncated")) return "candidate pool truncated";
    if (reason.includes("zero-valid") || reason.includes("no-valid") || record.tierC.validTupleCount === 0) {
      return "zero arithmetic-valid tuples";
    }
    if (reason.includes("multiple") || record.tierC.validTupleCount > 1) return "multiple arithmetic-valid tuples";
    if (reason.includes("identical")) return "already identical";
    if (reason.includes("no-changed-fields")) return "no changed fields";
    return reason || "other";
  };
  const tierCBlockSummary = {
    totalNotApplied: tierCBlocks.length,
    counts: countMap(tierCBlocks, normalizeBlockReason),
    rawCounts: countMap(tierCBlocks, (record) => record.blockReason || "other"),
    fullyPresentBlocked: tierCBlocks.filter((record) => record.expectedTuplePresent),
  };

  const hypotheticalFamilyPass = (record, family) => {
    const actual = structuredClone(record.currentProduction);
    const expected = record.expected;
    const useExpected = (label) => {
      if (label.startsWith("member")) actual.members[Number(label.replace("member", "")) - 1] = selectedFieldValue(expected, label);
      else actual[label] = selectedFieldValue(expected, label);
    };
    if (family === "all members") memberLabels.forEach(useExpected);
    else if (family === "members + bonus") [...memberLabels, "bonus"].forEach(useExpected);
    else if (family === "members + total") [...memberLabels, "total"].forEach(useExpected);
    else if (family === "bonus + total") ["bonus", "total"].forEach(useExpected);
    else useExpected(family);
    return compareSide(actual, expected).pass;
  };
  const families = ["member1", "member2", "member3", "all members", "bonus", "total", "members + bonus", "members + total", "bonus + total"];
  const targetLeverage = Object.fromEntries(
    families.map((family) => [
      family,
      {
        addressableFailingStageSides: remainingFailures.filter((record) => hypotheticalFamilyPass(record, family)).length,
        wrongFields: wrongFinalFields.filter((field) =>
          family === "all members" || family.startsWith("members")
            ? memberLabels.includes(field.field) || family.includes(field.field)
            : field.field === family || family.split(" + ").includes(field.field)
        ).length,
      },
    ])
  );

  const stage3Member2 = fieldRecords.filter((field) => field.stage === 3 && field.field === "member2");
  const stage3Member2Audit = {
    total: stage3Member2.length,
    productionSelectedExact: stage3Member2.filter((field) => field.finalPass).length,
    productionObservedExactCandidate: stage3Member2.filter((field) => field.expectedCandidatePresent).length,
    t2ExactCandidate: stage3Member2.filter((field) => field.expectedT2CandidatePresent).length,
    rawGroupedTokenOpportunities: stage3Member2.filter((field) => field.t2CandidateCount > 0).length,
    remainingRecognitionFailures: stage3Member2.filter((field) => !field.finalPass && !field.expectedCandidatePresent).length,
    digitSubstitutions: stage3Member2.filter((field) => !field.finalPass && String(field.finalValue).length === String(field.expectedValue).length && field.finalValue > 0).length,
    missingDigits: stage3Member2.filter((field) => !field.finalPass && String(field.finalValue).length < String(field.expectedValue).length && field.finalValue > 0).length,
    extraDigits: stage3Member2.filter((field) => !field.finalPass && String(field.finalValue).length > String(field.expectedValue).length).length,
    emptyOcr: stage3Member2.filter((field) => !field.finalPass && field.empty).length,
    parserSafeGroupedFormsStillMissed: stage3Member2.filter((field) => field.t2CandidateCount > 0 && !field.expectedT2CandidatePresent).length,
  };

  const bonusAudit = { ...summarizeFields(fieldRecords.filter((field) => field.field === "bonus")) };
  bonusAudit.zeroSpecificFailures = fieldRecords.filter((field) => field.field === "bonus" && !field.finalPass && field.expectedValue === 0).length;
  bonusAudit.nonZeroFailures = fieldRecords.filter((field) => field.field === "bonus" && !field.finalPass && field.expectedValue !== 0).length;
  const totalAudit = { ...summarizeFields(fieldRecords.filter((field) => field.field === "total")) };
  totalAudit.recognitionFailures = fieldRecords.filter((field) => field.field === "total" && !field.finalPass && !field.expectedCandidatePresent).length;
  totalAudit.selectionFailures = fieldRecords.filter((field) => field.field === "total" && !field.finalPass && field.expectedCandidatePresent).length;

  const rankedTargets = [
    {
      target: "total-specific browser-native candidate capture",
      addressableStageSides: targetLeverage.total.addressableFailingStageSides,
      evidenceStability: "medium",
      knownFpRisk: "lower than ranking; exact total evidence can be isolated",
      implementationSurface: "diagnostic-only OCR capture profiles for total crops",
      recommendation: "",
    },
    {
      target: "bonus-specific browser-native candidate capture",
      addressableStageSides: targetLeverage.bonus.addressableFailingStageSides,
      evidenceStability: "medium",
      knownFpRisk: "requires plus/crown provenance; safer than broad ranking if scoped to bonus crops",
      implementationSurface: "diagnostic-only bonus crop/profile audit",
      recommendation: "",
    },
    {
      target: "Stage3 member2 OCR-engine/configuration experiment",
      addressableStageSides: targetLeverage.member2.addressableFailingStageSides,
      evidenceStability: "low-to-medium",
      knownFpRisk: "recognition quality problem; production adoption would need exact candidate evidence",
      implementationSurface: "iPad-only Stage3 member2 diagnostic profiles",
      recommendation: "",
    },
    {
      target: "member OCR safe parser extension beyond T2",
      addressableStageSides: targetLeverage["all members"].addressableFailingStageSides,
      evidenceStability: "low",
      knownFpRisk: "broad literal-token parsing was previously unsafe",
      implementationSurface: "parser diagnostics only",
      recommendation: "defer",
    },
    {
      target: "Tier C broadening",
      addressableStageSides: 0,
      evidenceStability: "n/a",
      knownFpRisk: "unsafe without stronger evidence; Tier C is intentionally strict",
      implementationSurface: "selector semantics",
      recommendation: "reject",
    },
    {
      target: "candidate ranking",
      addressableStageSides: 0,
      evidenceStability: "n/a",
      knownFpRisk: "previously unsafe; can regress existing PASS cases",
      implementationSurface: "ranking",
      recommendation: "reject",
    },
  ].sort((a, b) => b.addressableStageSides - a.addressableStageSides);
  const recommendedTarget = rankedTargets.find((target) => !["reject", "defer"].includes(target.recommendation)) || rankedTargets[0];
  recommendedTarget.recommendation = "recommended next diagnostic experiment";

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
      preExistingTierCApplications: preExistingApplications.length,
      t2EnabledApplications: t2Applications.length,
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
    fieldCoverage,
    memberCoverage: {
      beforeT2Approx: {
        member1: { expectedObservedCandidatePresent: 73, total: 108 },
        member2: { expectedObservedCandidatePresent: 42, total: 108 },
        member3: { expectedObservedCandidatePresent: 69, total: 108 },
      },
      afterT2: {
        member1: fieldCoverage.member1,
        member2: fieldCoverage.member2,
        member3: fieldCoverage.member3,
        member2ByStage: fieldCoverage.member2ByStage,
      },
    },
    t2CandidateAudit,
    selectionRecognitionSplit: {
      legacyPrimaryReference: {
        totalWrongPrimaryFields: wrongPrimaryFields.length,
        selectionFailures: selectionFailures.length,
        recognitionFailures: recognitionFailures.length,
        defaultZeroOnlyCases: defaultZeroOnly.length,
        incompleteOrUnavailableCases: incompleteFields.length,
      },
      currentProduction: selectionRecognitionSplit,
      totalWrongPrimaryFields: wrongPrimaryFields.length,
      selectionFailures: selectionFailuresFinal.length,
      recognitionFailures: recognitionFailuresFinal.length,
      defaultZeroOnlyCases: defaultZeroOnly.length,
      incompleteOrUnavailableCases: incompleteFields.length,
      byCluster: selectionRecognitionSplit.byCluster,
      byFieldType: selectionRecognitionSplit.byField,
    },
    tierCBlockReasons: tierCBlockSummary,
    remainingFailures,
    candidatePresenceUpperBounds: upper,
    oracleUpperBounds: upper,
    stage3Member2Audit,
    bonusAudit,
    totalAudit,
    targetLeverage,
    rankedTargets,
    recommendedNextExperiment: {
      target: recommendedTarget.target,
      addressableStageSides: recommendedTarget.addressableStageSides,
      reason:
        recommendedTarget.target.includes("total")
          ? "Total fields now show the largest side-level leverage from exact candidate capture without touching member ranking."
          : recommendedTarget.target.includes("bonus")
            ? "Bonus evidence has strong leverage and can be isolated to bonus-specific browser-native capture."
            : "The target has the highest remaining leverage under the post-T2 candidate evidence.",
      constraints: [
        "diagnostic-only",
        "iPad-only",
        "browser-native",
        "no ranking changes",
        "no broad parser changes",
        "no expected-driven candidate generation",
      ],
    },
    strategySimulations: strategyList,
    rejectedSelectionRankingExperiment: bestSafeStrategy
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
      fieldCoverage: analysis.fieldCoverage,
      memberCoverage: analysis.memberCoverage,
      t2CandidateAudit: analysis.t2CandidateAudit,
      tierCBlockReasons: analysis.tierCBlockReasons.counts,
      stage3Member2Audit: analysis.stage3Member2Audit,
      bonusAudit: analysis.bonusAudit,
      totalAudit: analysis.totalAudit,
      targetLeverage: analysis.targetLeverage,
      recommendedNextExperiment: analysis.recommendedNextExperiment,
    })
  );
  return {
    runs: runAnalyses.length,
    stable: new Set(signatures).size === 1,
    signatures,
  };
}

async function runOnce({ runIndex, browser, baseUrl, rows, resume }) {
  const runDir = path.join(artifactDir, `run-${runIndex}`);
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad browser failure analysis run ${runIndex}] ${row.filename}`);
    imageResults.push(await processImage({ browser, baseUrl, row, runDir, resume }));
  }
  const analysis = evaluateRun(rows, imageResults);
  await writeAnalysisArtifacts(runDir, analysis);
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
  await fs.writeFile(path.join(outputDir, "t2-candidate-audit.json"), JSON.stringify(analysis.t2CandidateAudit, null, 2));
  await fs.writeFile(path.join(outputDir, "remaining-68-sides.json"), JSON.stringify(analysis.remainingFailures, null, 2));
  await fs.writeFile(path.join(outputDir, "tier-c-block-reasons.json"), JSON.stringify(analysis.tierCBlockReasons, null, 2));
  await fs.writeFile(path.join(outputDir, "recognition-vs-selection.json"), JSON.stringify(analysis.selectionRecognitionSplit, null, 2));
  await fs.writeFile(path.join(outputDir, "stage3-member2-audit.json"), JSON.stringify(analysis.stage3Member2Audit, null, 2));
  await fs.writeFile(path.join(outputDir, "bonus-audit.json"), JSON.stringify(analysis.bonusAudit, null, 2));
  await fs.writeFile(path.join(outputDir, "total-audit.json"), JSON.stringify(analysis.totalAudit, null, 2));
  await fs.writeFile(path.join(outputDir, "oracle-upper-bounds.json"), JSON.stringify(analysis.oracleUpperBounds, null, 2));
  await fs.writeFile(path.join(outputDir, "target-leverage.json"), JSON.stringify(analysis.targetLeverage, null, 2));
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
    const runStability = stabilityReport(runAnalyses);
    const latest = runAnalyses.at(-1);
    await writeAnalysisArtifacts(artifactDir, latest);
    const summary = {
      command: `node scripts/ipad-browser-post-t2-failure-analysis.mjs --runs ${args.runs}`,
      artifactDir: rel(artifactDir),
      baseUrl,
      productionBaseline: latest.productionBaseline,
      stageSideCategoryCounts: latest.stageSideTaxonomy.counts,
      fieldCategoryCounts: latest.fieldTaxonomy.counts,
      fieldCoverage: latest.fieldCoverage,
      memberCoverage: latest.memberCoverage,
      t2CandidateAudit: latest.t2CandidateAudit,
      selectionRecognitionSplit: latest.selectionRecognitionSplit,
      tierCBlockReasonCounts: latest.tierCBlockReasons.counts,
      candidatePresenceUpperBounds: latest.candidatePresenceUpperBounds,
      stage3Member2Audit: latest.stage3Member2Audit,
      bonusAudit: latest.bonusAudit,
      totalAudit: latest.totalAudit,
      targetLeverage: latest.targetLeverage,
      strategySimulations: latest.strategySimulations.map((entry) => ({
        id: entry.strategy.id,
        changedFields: entry.changedFields,
        tpFieldChanges: entry.tpFieldChanges,
        fpFieldChanges: entry.fpFieldChanges,
        stageSideGains: entry.stageSideGains,
        stageSideRegressions: entry.stageSideRegressions,
        existingPassSidesLost: entry.existingPassSidesLost,
        stageSidePass: entry.stageSidePass,
        recommendation: entry.recommendation,
      })),
      rankedTargets: latest.rankedTargets,
      recommendedNextExperiment: latest.recommendedNextExperiment,
      runStability,
      totalsPass:
        latest.stageSideTaxonomy.total === 108 &&
        latest.fieldTaxonomy.total === 540 &&
        Object.values(latest.stageSideTaxonomy.counts).reduce((sum, value) => sum + value, 0) === 108 &&
        Object.values(latest.fieldTaxonomy.counts).reduce((sum, value) => sum + value, 0) === 540,
      productionBaselinePass:
        latest.productionBaseline.stageSides.pass === 40 &&
        latest.productionBaseline.tierCApplications === 24 &&
        latest.productionBaseline.preExistingTierCApplications === 9 &&
        latest.productionBaseline.t2EnabledApplications === 15,
    };
    await fs.writeFile(path.join(artifactDir, "run-stability.json"), JSON.stringify(runStability, null, 2));
    await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.totalsPass || !summary.productionBaselinePass || !runStability.stable) process.exitCode = 1;
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
