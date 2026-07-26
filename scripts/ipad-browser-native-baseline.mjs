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
const artifactDir = path.join(rootDir, "tmp", "ipad-browser-native-baseline");
const requireFromHere = createRequire(import.meta.url);
const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fieldLabels = ["member1", "member2", "member3", "bonus", "total"];

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    runs: Math.max(1, Number(process.argv[runsIndex + 1] || process.env.IPAD_BROWSER_BASELINE_RUNS || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_BROWSER_BASELINE_BASE_URL || "",
    resume: process.argv.includes("--resume"),
  };
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
        "Playwright is required for the iPad browser-native baseline.",
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
  const seen = new Set();
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    const filename = entry.filename;
    if (seen.has(filename)) throw new Error(`Duplicate iPad manifest entry: ${filename}`);
    seen.add(filename);
    const imagePath = path.join(ipadImageDir, filename);
    const expectedPath = path.join(ipadExpectedDir, entry.expectedFixture || filename.replace(/\.png$/i, ".json"));
    await fs.access(imagePath);
    await fs.access(expectedPath);
    rows.push({
      ...entry,
      filename,
      imagePath,
      expectedPath,
      expected: await loadJson(expectedPath),
    });
  }
  if (rows.length !== 18) {
    throw new Error(`Expected exactly 18 complete iPad fixtures, found ${rows.length}`);
  }
  return rows;
}

function getExpectedField(expectedStage, side, label) {
  if (label.startsWith("member")) {
    const index = Number(label.replace("member", "")) - 1;
    return Number((side === "self" ? expectedStage.selfMembers : expectedStage.enemyMembers)[index] || 0);
  }
  if (label === "bonus") return Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0);
  return Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0);
}

function expectedSide(expectedStage, side) {
  return {
    members: side === "self" ? expectedStage.selfMembers.map(Number) : expectedStage.enemyMembers.map(Number),
    bonus: Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0),
    total: Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0),
  };
}

function normalizeSide(value = {}) {
  return {
    members: Array.isArray(value.members) ? value.members.slice(0, 3).map((item) => Number(item || 0)) : [0, 0, 0],
    bonus: Number(value.bonus || 0),
    total: Number(value.total || 0),
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
    memberMatches,
    bonusPass: actual.bonus === expected.bonus,
    totalPass: actual.total === expected.total,
    actual,
    expected,
  };
}

function createAccuracyCounters(imageCount) {
  return {
    images: imageCount,
    imagePass: 0,
    stages: imageCount * stages.length,
    stagePass: 0,
    stageSides: imageCount * stages.length * sides.length,
    stageSidePass: 0,
    positions: Object.fromEntries(
      stages.flatMap((stage) => sides.map((side) => [`stage${stage}_${side}`, { pass: 0, fail: 0 }]))
    ),
    fields: {
      member1: { pass: 0, total: 0 },
      member2: { pass: 0, total: 0 },
      member3: { pass: 0, total: 0 },
      all3Members: { pass: 0, total: 0 },
      bonus: { pass: 0, total: 0 },
      total: { pass: 0, total: 0 },
      allFields: { pass: 0, total: 0 },
    },
    byCluster: {},
  };
}

function updateAccuracyCounters(counters, row, stage, side, comparison) {
  counters.stageSidePass += comparison.pass ? 1 : 0;
  const position = counters.positions[`stage${stage}_${side}`];
  position[comparison.pass ? "pass" : "fail"] += 1;
  counters.byCluster[row.clusterId] ||= {
    images: 0,
    imagePass: 0,
    stages: 0,
    stagePass: 0,
    stageSides: 0,
    stageSidePass: 0,
  };
  counters.byCluster[row.clusterId].stageSides += 1;
  counters.byCluster[row.clusterId].stageSidePass += comparison.pass ? 1 : 0;
  for (const match of comparison.memberMatches) {
    const key = `member${match.slot}`;
    counters.fields[key].total += 1;
    counters.fields[key].pass += match.pass ? 1 : 0;
    counters.fields.allFields.total += 1;
    counters.fields.allFields.pass += match.pass ? 1 : 0;
  }
  counters.fields.all3Members.total += 1;
  counters.fields.all3Members.pass += comparison.membersPass ? 1 : 0;
  counters.fields.bonus.total += 1;
  counters.fields.bonus.pass += comparison.bonusPass ? 1 : 0;
  counters.fields.total.total += 1;
  counters.fields.total.pass += comparison.totalPass ? 1 : 0;
  counters.fields.allFields.total += 2;
  counters.fields.allFields.pass += (comparison.bonusPass ? 1 : 0) + (comparison.totalPass ? 1 : 0);
}

function finalizeAccuracyCounters(counters) {
  const finalize = ({ pass, total, ...rest }) => ({
    ...rest,
    pass,
    fail: total - pass,
    total,
    accuracy: percentage(pass, total),
  });
  return {
    images: finalize({ pass: counters.imagePass, total: counters.images }),
    stages: finalize({ pass: counters.stagePass, total: counters.stages }),
    stageSides: finalize({ pass: counters.stageSidePass, total: counters.stageSides }),
    positions: Object.fromEntries(
      Object.entries(counters.positions).map(([key, value]) => [
        key,
        { ...value, total: value.pass + value.fail, accuracy: percentage(value.pass, value.pass + value.fail) },
      ])
    ),
    fields: Object.fromEntries(Object.entries(counters.fields).map(([key, value]) => [key, finalize(value)])),
    byCluster: Object.fromEntries(
      Object.entries(counters.byCluster).map(([key, value]) => [
        key,
        {
          ...value,
          imageFail: value.images - value.imagePass,
          stageFail: value.stages - value.stagePass,
          stageSideFail: value.stageSides - value.stageSidePass,
          imageAccuracy: percentage(value.imagePass, value.images),
          stageAccuracy: percentage(value.stagePass, value.stages),
          stageSideAccuracy: percentage(value.stageSidePass, value.stageSides),
        },
      ])
    ),
  };
}

function fieldPoolFor(diagnostics, stage, side, label) {
  return diagnostics.stages?.[`stage${stage}`]?.[side]?.candidatePools?.[label] || null;
}

function sideDiagnosticsFor(diagnostics, stage, side) {
  return diagnostics.stages?.[`stage${stage}`]?.[side] || null;
}

function candidateValues(pool = {}, { observedOnly = true } = {}) {
  return (pool.candidates || [])
    .filter((candidate) => !observedOnly || candidate.origin !== "explicit-zero")
    .map((candidate) => Number(candidate.value || 0));
}

function summarizeCandidateProvenance(pool = {}, expectedValue) {
  return (pool.candidates || [])
    .filter((candidate) => Number(candidate.value || 0) === expectedValue)
    .map((candidate) => ({
      value: candidate.value,
      origin: candidate.origin || "observed",
      profileIds: candidate.profileIds || [],
      rawText: candidate.rawText || "",
      contributions: (candidate.contributions || []).map((entry) => ({
        profileId: entry.profileId,
        rawCandidate: entry.rawCandidate,
        ocrConfidence: entry.ocrConfidence,
        plusLike: Boolean(entry.plusLike),
      })),
    }));
}

function profileRawTextSignature(pool = {}) {
  return Object.fromEntries(
    Object.entries(pool.profileResults || {}).map(([profileId, result]) => [
      profileId,
      {
        rawText: result.rawText || "",
        parsedValues: (result.parsedCandidates || []).map((candidate) => Number(candidate.value || 0)),
        processedHash: result.debugArtifacts?.processedCrop?.sha256 || null,
      },
    ])
  );
}

function compactTierC(tierC = {}) {
  return {
    eligible: Boolean(tierC.eligible),
    wouldApply: Boolean(tierC.wouldApply),
    validTupleCount: Number(tierC.validTupleCount || 0),
    blockReason: tierC.blockReason || "",
    candidateCompleteness: tierC.candidateCompleteness || {},
    selectedTuple: tierC.selectedTuple
      ? {
          members: tierC.selectedTuple.members || tierC.proposal?.members || [],
          bonus: Number(tierC.selectedTuple.bonus ?? tierC.proposal?.bonus ?? 0),
          total: Number(tierC.selectedTuple.total ?? tierC.proposal?.total ?? 0),
          equation: tierC.selectedTuple.equation || tierC.proposal?.equation || "",
          origins: tierC.selectedTuple.origins || {},
          profileIds: tierC.selectedTuple.profileIds || {},
        }
      : null,
    proposal: tierC.proposal
      ? {
          members: tierC.proposal.members || [],
          bonus: Number(tierC.proposal.bonus || 0),
          total: Number(tierC.proposal.total || 0),
          equation: tierC.proposal.equation || "",
        }
      : null,
  };
}

function proposalSide(tierC = {}) {
  const proposal = tierC.proposal || tierC.selectedTuple;
  if (!proposal) return null;
  return {
    members: proposal.members || proposal.values?.slice(0, 3) || [],
    bonus: Number(proposal.bonus ?? proposal.values?.[3] ?? 0),
    total: Number(proposal.total ?? proposal.values?.[4] ?? 0),
  };
}

function clonePrimaryByImage(imageResult) {
  return JSON.parse(JSON.stringify(imageResult.primaryByStage));
}

function setSideInStageMap(map, stage, side, value) {
  map[`stage${stage}`][side] = normalizeSide(value);
}

function sideFromStageMap(map, stage, side) {
  return normalizeSide(map[`stage${stage}`]?.[side] || {});
}

function buildExpectedByStage(row) {
  return Object.fromEntries(
    stages.map((stage) => [
      `stage${stage}`,
      {
        self: expectedSide(row.expected[`stage${stage}`], "self"),
        enemy: expectedSide(row.expected[`stage${stage}`], "enemy"),
      },
    ])
  );
}

function evaluateAccuracy(rows, imageResults, layer) {
  const counters = createAccuracyCounters(rows.length);
  const perSide = [];
  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const stageMap = layer === "tierC" ? imageResult.simulatedByStage : imageResult.primaryByStage;
    let imagePass = true;
    counters.byCluster[row.clusterId] ||= {
      images: 0,
      imagePass: 0,
      stages: 0,
      stagePass: 0,
      stageSides: 0,
      stageSidePass: 0,
    };
    counters.byCluster[row.clusterId].images += 1;
    for (const stage of stages) {
      let stagePass = true;
      counters.byCluster[row.clusterId].stages += 1;
      for (const side of sides) {
        const comparison = compareSide(sideFromStageMap(stageMap, stage, side), expectedSide(row.expected[`stage${stage}`], side));
        updateAccuracyCounters(counters, row, stage, side, comparison);
        perSide.push({
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          pass: comparison.pass,
          expected: comparison.expected,
          actual: comparison.actual,
          membersPass: comparison.membersPass,
          bonusPass: comparison.bonusPass,
          totalPass: comparison.totalPass,
        });
        stagePass &&= comparison.pass;
      }
      counters.stagePass += stagePass ? 1 : 0;
      imagePass &&= stagePass;
    }
    counters.imagePass += imagePass ? 1 : 0;
    counters.byCluster[row.clusterId].imagePass += imagePass ? 1 : 0;
  }
  return { summary: finalizeAccuracyCounters(counters), perSide };
}

function buildCandidateUpperBound(rows, imageResults) {
  const counters = {
    fields: 0,
    observedPresent: 0,
    observedAbsent: 0,
    selectablePresent: 0,
    selectableAbsent: 0,
    emptyPools: 0,
    byField: Object.fromEntries(["member", "bonus", "total"].map((field) => [field, { total: 0, observedPresent: 0, selectablePresent: 0, empty: 0 }])),
    byCluster: {},
    candidateCounts: [],
  };
  const fieldRecords = [];
  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    counters.byCluster[row.clusterId] ||= { total: 0, observedPresent: 0, selectablePresent: 0, empty: 0 };
    for (const stage of stages) {
      for (const side of sides) {
        for (const label of fieldLabels) {
          const fieldType = label.startsWith("member") ? "member" : label;
          const pool = fieldPoolFor(imageResult.diagnostics, stage, side, label) || { candidates: [] };
          const expectedValue = getExpectedField(row.expected[`stage${stage}`], side, label);
          const observedValues = candidateValues(pool, { observedOnly: true });
          const allValues = candidateValues(pool, { observedOnly: false });
          const observedPresent = observedValues.includes(expectedValue);
          const defaultZeroSelectable = fieldType === "bonus" && expectedValue === 0;
          const selectablePresent = observedPresent || defaultZeroSelectable || allValues.includes(expectedValue);
          const empty = !observedValues.length;
          counters.fields += 1;
          counters.observedPresent += observedPresent ? 1 : 0;
          counters.selectablePresent += selectablePresent ? 1 : 0;
          counters.emptyPools += empty ? 1 : 0;
          counters.candidateCounts.push(observedValues.length);
          counters.byField[fieldType].total += 1;
          counters.byField[fieldType].observedPresent += observedPresent ? 1 : 0;
          counters.byField[fieldType].selectablePresent += selectablePresent ? 1 : 0;
          counters.byField[fieldType].empty += empty ? 1 : 0;
          counters.byCluster[row.clusterId].total += 1;
          counters.byCluster[row.clusterId].observedPresent += observedPresent ? 1 : 0;
          counters.byCluster[row.clusterId].selectablePresent += selectablePresent ? 1 : 0;
          counters.byCluster[row.clusterId].empty += empty ? 1 : 0;
          fieldRecords.push({
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            field: label,
            expectedValue,
            observedPresent,
            selectablePresent,
            empty,
            candidateCount: observedValues.length,
            observedValues,
            provenance: summarizeCandidateProvenance(pool, expectedValue),
          });
        }
      }
    }
  }
  counters.observedAbsent = counters.fields - counters.observedPresent;
  counters.selectableAbsent = counters.fields - counters.selectablePresent;
  const sortedCounts = [...counters.candidateCounts].sort((a, b) => a - b);
  const median =
    sortedCounts.length % 2
      ? sortedCounts[Math.floor(sortedCounts.length / 2)]
      : (sortedCounts[sortedCounts.length / 2 - 1] + sortedCounts[sortedCounts.length / 2]) / 2;
  const finalizeBucket = (bucket) => ({
    ...bucket,
    observedAbsent: bucket.total - bucket.observedPresent,
    selectableAbsent: bucket.total - bucket.selectablePresent,
    observedPresentRate: percentage(bucket.observedPresent, bucket.total),
    selectablePresentRate: percentage(bucket.selectablePresent, bucket.total),
    emptyRate: percentage(bucket.empty, bucket.total),
  });
  return {
    summary: {
      totalFields: counters.fields,
      observedPresent: counters.observedPresent,
      observedAbsent: counters.observedAbsent,
      observedPresentRate: percentage(counters.observedPresent, counters.fields),
      selectablePresent: counters.selectablePresent,
      selectableAbsent: counters.selectableAbsent,
      selectablePresentRate: percentage(counters.selectablePresent, counters.fields),
      candidatePoolEmpty: counters.emptyPools,
      averageCandidates: Number((counters.candidateCounts.reduce((sum, value) => sum + value, 0) / counters.candidateCounts.length).toFixed(2)),
      medianCandidates: median,
      maxCandidates: Math.max(...counters.candidateCounts),
      byField: Object.fromEntries(Object.entries(counters.byField).map(([key, value]) => [key, finalizeBucket(value)])),
      byCluster: Object.fromEntries(Object.entries(counters.byCluster).map(([key, value]) => [key, finalizeBucket(value)])),
    },
    fields: fieldRecords,
  };
}

function changedFieldsBetween(current, proposed) {
  const changes = [];
  proposed.members.forEach((value, index) => {
    if ((current.members[index] || 0) !== value) changes.push(`member${index + 1}`);
  });
  if (current.bonus !== proposed.bonus) changes.push("bonus");
  if (current.total !== proposed.total) changes.push("total");
  return changes;
}

function evaluateTierC(rows, imageResults) {
  const stats = {
    stageSides: rows.length * stages.length * sides.length,
    eligibleSides: 0,
    validUniqueSides: 0,
    wouldApply: 0,
    alreadyIdentical: 0,
    changedProposals: 0,
    tp: 0,
    fp: 0,
    partiallyImproving: 0,
    partiallyRegressing: 0,
    existingPassSidesLost: 0,
    netStageSideGain: 0,
    fieldGains: 0,
    fieldRegressions: 0,
    blockReasons: {},
    byPosition: {},
  };
  const changedProposals = [];
  const allProposals = [];
  const imageResultsWithSimulation = [];

  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const simulatedByStage = clonePrimaryByImage(imageResult);
    for (const stage of stages) {
      for (const side of sides) {
        const positionKey = `stage${stage}_${side}`;
        stats.byPosition[positionKey] ||= { eligible: 0, wouldApply: 0, changed: 0, tp: 0, fp: 0 };
        const sideDiagnostics = sideDiagnosticsFor(imageResult.diagnostics, stage, side);
        const tierC = sideDiagnostics?.tierC || {};
        const compact = compactTierC(tierC);
        const current = normalizeSide(sideDiagnostics?.currentPrimary || {});
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const currentComparison = compareSide(current, expected);
        const proposed = proposalSide(tierC);
        stats.eligibleSides += compact.eligible ? 1 : 0;
        stats.validUniqueSides += compact.validTupleCount === 1 ? 1 : 0;
        stats.byPosition[positionKey].eligible += compact.eligible ? 1 : 0;
        if (!compact.wouldApply) {
          stats.blockReasons[compact.blockReason || "not-eligible"] =
            (stats.blockReasons[compact.blockReason || "not-eligible"] || 0) + 1;
          continue;
        }
        stats.wouldApply += 1;
        stats.byPosition[positionKey].wouldApply += 1;
        const proposedComparison = compareSide(proposed, expected);
        const changedFields = changedFieldsBetween(current, proposed);
        const identical = !changedFields.length;
        stats.alreadyIdentical += identical ? 1 : 0;
        if (!identical) {
          stats.changedProposals += 1;
          stats.byPosition[positionKey].changed += 1;
          setSideInStageMap(simulatedByStage, stage, side, proposed);
        }
        const beforeFieldPass = [
          ...currentComparison.memberMatches.map((match) => match.pass),
          currentComparison.bonusPass,
          currentComparison.totalPass,
        ];
        const afterFieldPass = [
          ...proposedComparison.memberMatches.map((match) => match.pass),
          proposedComparison.bonusPass,
          proposedComparison.totalPass,
        ];
        const fieldGains = afterFieldPass.filter((pass, index) => pass && !beforeFieldPass[index]).length;
        const fieldRegressions = beforeFieldPass.filter((pass, index) => pass && !afterFieldPass[index]).length;
        stats.fieldGains += fieldGains;
        stats.fieldRegressions += fieldRegressions;
        if (fieldGains && !fieldRegressions) stats.partiallyImproving += 1;
        if (fieldRegressions) stats.partiallyRegressing += 1;
        if (currentComparison.pass && !proposedComparison.pass) stats.existingPassSidesLost += 1;
        if (!currentComparison.pass && proposedComparison.pass) stats.netStageSideGain += 1;
        if (proposedComparison.pass && !currentComparison.pass) {
          stats.tp += 1;
          stats.byPosition[positionKey].tp += 1;
        } else if (!proposedComparison.pass) {
          stats.fp += 1;
          stats.byPosition[positionKey].fp += 1;
        }
        const proposalRecord = {
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          current,
          proposed,
          expected,
          changedFields,
          candidateProvenance: Object.fromEntries(
            fieldLabels.map((label) => [
              label,
              summarizeCandidateProvenance(fieldPoolFor(imageResult.diagnostics, stage, side, label) || {}, getExpectedField(row.expected[`stage${stage}`], side, label)),
            ])
          ),
          equation: `${proposed.members.join(" + ")} + ${proposed.bonus} = ${proposed.total}`,
          evaluation: {
            beforePass: currentComparison.pass,
            afterPass: proposedComparison.pass,
            fieldGains,
            fieldRegressions,
            tp: proposedComparison.pass && !currentComparison.pass,
            fp: !proposedComparison.pass,
          },
          tierC: compact,
        };
        allProposals.push(proposalRecord);
        if (!identical) changedProposals.push(proposalRecord);
      }
    }
    imageResultsWithSimulation.push({ ...imageResult, simulatedByStage });
  }
  return {
    summary: stats,
    changedProposals,
    allProposals,
    imageResults: imageResultsWithSimulation,
  };
}

async function processImage({ context, baseUrl, row, runDir }) {
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
  try {
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', {
      state: "attached",
      timeout: 30000,
    });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(
      () => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function",
      null,
      { timeout: 30000 }
    );
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad browser-native baseline.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.waitForSelector('[data-testid="run-ocr-button"]', { timeout: 60000 });
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', {
      timeout: 420000,
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
    const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
    await fs.mkdir(imageDir, { recursive: true });
    const exportedPath = path.join(imageDir, "browser-diagnostics.json");
    await download.saveAs(exportedPath);
    await page.screenshot({ path: path.join(imageDir, "page.png"), fullPage: true });

    const primaryByStage = Object.fromEntries(
      stages.map((stage) => [
        `stage${stage}`,
        Object.fromEntries(
          sides.map((side) => [
            side,
            normalizeSide(diagnostics.stages?.[`stage${stage}`]?.[side]?.currentPrimary || {}),
          ])
        ),
      ])
    );
    const fieldPools = [];
    for (const stage of stages) {
      for (const side of sides) {
        for (const label of fieldLabels) {
          const pool = fieldPoolFor(diagnostics, stage, side, label);
          if (pool) fieldPools.push(pool);
        }
      }
    }
    const result = {
      image: row.filename,
      clusterId: row.clusterId,
      imagePath: normalizePathForReport(row.imagePath),
      exportedPath: normalizePathForReport(exportedPath),
      exportMatchesWindow: stableJson(hiddenDiagnostics) === stableJson(diagnostics),
      detection: diagnostics.detection,
      imageMetadata: diagnostics.image,
      layoutId: diagnostics.template?.version || "",
      primaryByStage,
      displayedOcrStages: diagnostics.displayedOcrStages || {},
      productionOutputChanged: Boolean(diagnostics.productionOutputChanged),
      proposalApplicationAudit: diagnostics.proposalApplicationAudit || {},
      diagnostics,
      fieldPoolCount: fieldPools.length,
      emptyOcrFieldCount: fieldPools.filter((pool) =>
        Object.values(pool.profileResults || {}).every((entry) => !(entry.rawText || "").trim())
      ).length,
      numericCandidateFieldCount: fieldPools.filter((pool) =>
        (pool.candidates || []).some((candidate) => candidate.origin !== "explicit-zero")
      ).length,
      consoleMessages,
      pageErrors,
    };
    await fs.writeFile(path.join(imageDir, "image-result.json"), JSON.stringify(result, null, 2));
    return result;
  } finally {
    await page.close();
  }
}

async function loadExistingImageResult(runDir, row) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  try {
    const result = await loadJson(path.join(imageDir, "image-result.json"));
    if (result?.image === row.filename && result?.fieldPoolCount === stages.length * sides.length * fieldLabels.length) {
      return result;
    }
  } catch {
    return null;
  }
  return null;
}

async function runBrowserNativeBaseline({ rows, runIndex, baseUrl, browser, resume = false }) {
  const runDir = path.join(artifactDir, `run-${runIndex}`);
  await fs.mkdir(runDir, { recursive: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const imageResults = [];
  try {
    for (const row of rows) {
      if (resume) {
        const existing = await loadExistingImageResult(runDir, row);
        if (existing) {
          console.log(`[iPad browser baseline] run ${runIndex}: ${row.filename} (cached)`);
          imageResults.push(existing);
          continue;
        }
      }
      console.log(`[iPad browser baseline] run ${runIndex}: ${row.filename}`);
      imageResults.push(await processImage({ context, baseUrl, row, runDir }));
    }
  } finally {
    await context.close();
  }
  const primary = evaluateAccuracy(rows, imageResults, "primary");
  const candidateUpperBound = buildCandidateUpperBound(rows, imageResults);
  const tierC = evaluateTierC(rows, imageResults);
  const simulated = evaluateAccuracy(rows, tierC.imageResults, "tierC");
  const summary = {
    runIndex,
    imagesProcessed: imageResults.length,
    expectedImages: rows.length,
    stageSidesProcessed: imageResults.length * stages.length * sides.length,
    expectedStageSides: rows.length * stages.length * sides.length,
    fieldPools: imageResults.reduce((sum, image) => sum + image.fieldPoolCount, 0),
    expectedFieldPools: rows.length * stages.length * sides.length * fieldLabels.length,
    emptyOcrFieldCount: imageResults.reduce((sum, image) => sum + image.emptyOcrFieldCount, 0),
    numericCandidateFieldCount: imageResults.reduce((sum, image) => sum + image.numericCandidateFieldCount, 0),
    exportMismatches: imageResults.filter((image) => !image.exportMatchesWindow).length,
    outputMutationFindings: imageResults.filter(
      (image) =>
        image.productionOutputChanged ||
        image.proposalApplicationAudit?.proposalAppliedByThisPath ||
        image.proposalApplicationAudit?.diagnosticsOnly !== true
    ).length,
    consoleErrors: imageResults.flatMap((image) =>
      image.consoleMessages
        .filter((entry) => ["error", "warning"].includes(entry.type))
        .map((entry) => ({ image: image.image, ...entry }))
    ),
    pageErrors: imageResults.flatMap((image) => image.pageErrors.map((entry) => ({ image: image.image, ...entry }))),
    primary: primary.summary,
    candidateUpperBound: candidateUpperBound.summary,
    tierC: tierC.summary,
    simulated: simulated.summary,
  };
  await fs.writeFile(path.join(runDir, "browser-primary-results.json"), JSON.stringify(primary, null, 2));
  await fs.writeFile(path.join(runDir, "candidate-upper-bound.json"), JSON.stringify(candidateUpperBound, null, 2));
  await fs.writeFile(path.join(runDir, "tier-c-simulation.json"), JSON.stringify(tierC, null, 2));
  await fs.writeFile(path.join(runDir, "changed-proposals.json"), JSON.stringify(tierC.changedProposals, null, 2));
  await fs.writeFile(path.join(runDir, "console-errors.json"), JSON.stringify(summary.consoleErrors, null, 2));
  await fs.writeFile(path.join(runDir, "page-errors.json"), JSON.stringify(summary.pageErrors, null, 2));
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  return { runDir, summary, imageResults, primary, candidateUpperBound, tierC, simulated };
}

function fieldSignatureForRun(run, row, stage, side, label) {
  const image = run.imageResults.find((entry) => entry.image === row.filename);
  const sideDiagnostics = sideDiagnosticsFor(image.diagnostics, stage, side);
  const pool = fieldPoolFor(image.diagnostics, stage, side, label) || {};
  return {
    rawOcr: profileRawTextSignature(pool),
    candidates: candidateValues(pool, { observedOnly: false }),
    currentPrimary: sideDiagnostics?.currentPrimary?.[label.startsWith("member") ? "members" : label],
    tierC: compactTierC(sideDiagnostics?.tierC || {}),
  };
}

function proposalSignature(run, row, stage, side) {
  const image = run.imageResults.find((entry) => entry.image === row.filename);
  const tierC = sideDiagnosticsFor(image.diagnostics, stage, side)?.tierC || {};
  return {
    eligible: Boolean(tierC.eligible),
    validTupleCount: Number(tierC.validTupleCount || 0),
    wouldApply: Boolean(tierC.wouldApply),
    selectedTuple: compactTierC(tierC).selectedTuple,
    proposal: compactTierC(tierC).proposal,
    blockReason: tierC.blockReason || "",
  };
}

function buildStabilityReport(rows, runs) {
  const report = {
    runs: runs.length,
    fieldComparisons: rows.length * stages.length * sides.length * fieldLabels.length,
    fieldsStableAcrossAllRuns: 0,
    fieldsWithOcrVariance: 0,
    fieldsWithCandidatePoolVariance: 0,
    fieldsWithCurrentPrimaryVariance: 0,
    fieldsWithTierCVariance: 0,
    proposalComparisons: rows.length * stages.length * sides.length,
    proposalsStableAcrossAllRuns: 0,
    proposalsAppearingInOnlySomeRuns: 0,
    proposalValueDisagreements: 0,
    tpByRun: runs.map((run) => run.summary.tierC.tp),
    fpByRun: runs.map((run) => run.summary.tierC.fp),
    records: [],
    proposalRecords: [],
  };

  for (const row of rows) {
    for (const stage of stages) {
      for (const side of sides) {
        const proposalSignatures = runs.map((run) => proposalSignature(run, row, stage, side));
        const proposalStable = proposalSignatures.every(
          (signature) => stableJson(signature) === stableJson(proposalSignatures[0])
        );
        report.proposalsStableAcrossAllRuns += proposalStable ? 1 : 0;
        const wouldApplyValues = proposalSignatures.map((signature) => signature.wouldApply);
        if (new Set(wouldApplyValues).size > 1) report.proposalsAppearingInOnlySomeRuns += 1;
        const proposalValues = proposalSignatures.map((signature) => stableJson(signature.proposal));
        if (new Set(proposalValues).size > 1) report.proposalValueDisagreements += 1;
        report.proposalRecords.push({
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          stable: proposalStable,
          signatures: proposalSignatures,
        });

        for (const label of fieldLabels) {
          const signatures = runs.map((run) => fieldSignatureForRun(run, row, stage, side, label));
          const rawStable = signatures.every(
            (signature) => stableJson(signature.rawOcr) === stableJson(signatures[0].rawOcr)
          );
          const candidatesStable = signatures.every(
            (signature) => stableJson(signature.candidates) === stableJson(signatures[0].candidates)
          );
          const currentStable = signatures.every(
            (signature) => stableJson(signature.currentPrimary) === stableJson(signatures[0].currentPrimary)
          );
          const tierStable = signatures.every(
            (signature) => stableJson(signature.tierC) === stableJson(signatures[0].tierC)
          );
          const stableAll = rawStable && candidatesStable && currentStable && tierStable;
          report.fieldsStableAcrossAllRuns += stableAll ? 1 : 0;
          report.fieldsWithOcrVariance += rawStable ? 0 : 1;
          report.fieldsWithCandidatePoolVariance += candidatesStable ? 0 : 1;
          report.fieldsWithCurrentPrimaryVariance += currentStable ? 0 : 1;
          report.fieldsWithTierCVariance += tierStable ? 0 : 1;
          if (!stableAll) {
            report.records.push({
              image: row.filename,
              clusterId: row.clusterId,
              stage,
              side,
              field: label,
              rawStable,
              candidatesStable,
              currentStable,
              tierStable,
              signatures,
            });
          }
        }
      }
    }
  }
  return report;
}

function classifyProductionReadiness(runs, stabilityReport) {
  const latest = runs.at(-1).summary;
  const unstableChangedProposals = stabilityReport.proposalRecords.filter(
    (record) => !record.stable && record.signatures.some((signature) => signature.wouldApply)
  );
  const ready =
    runs.every((run) => run.summary.tierC.fp === 0) &&
    unstableChangedProposals.length === 0 &&
    runs.every((run) => run.summary.tierC.existingPassSidesLost === 0) &&
    runs.every((run) => run.summary.outputMutationFindings === 0);
  return {
    ready,
    decision: ready
      ? "Browser-native evidence is stable enough for a future productionization review."
      : "Do not productionize yet; browser-native evidence is not stable enough or has safety findings.",
    reasons: {
      fpByRun: runs.map((run) => run.summary.tierC.fp),
      unstableChangedProposalRows: unstableChangedProposals.length,
      existingPassSidesLostByRun: runs.map((run) => run.summary.tierC.existingPassSidesLost),
      outputMutationFindingsByRun: runs.map((run) => run.summary.outputMutationFindings),
    },
    latestTierC: latest.tierC,
  };
}

async function writeCombinedArtifacts({ rows, runs }) {
  const stabilityReport = buildStabilityReport(rows, runs);
  const productionReadiness = classifyProductionReadiness(runs, stabilityReport);
  const combinedSummary = {
    command: "node scripts/ipad-browser-native-baseline.mjs",
    artifactDir: normalizePathForReport(artifactDir),
    browserRuns: runs.length,
    imagesPerRun: rows.length,
    stagesPerRun: rows.length * stages.length,
    stageSidesPerRun: rows.length * stages.length * sides.length,
    fieldsPerRun: rows.length * stages.length * sides.length * fieldLabels.length,
    fixtureCoverage: {
      expectedFixtures: rows.length,
      images: rows.map((row) => row.filename),
      clusters: Object.fromEntries(
        Object.entries(
          rows.reduce((acc, row) => {
            acc[row.clusterId] = (acc[row.clusterId] || 0) + 1;
            return acc;
          }, {})
        ).sort(([a], [b]) => a.localeCompare(b))
      ),
    },
    runs: runs.map((run) => run.summary),
    latestRun: runs.at(-1).summary,
    stability: {
      fieldsStableAcrossAllRuns: stabilityReport.fieldsStableAcrossAllRuns,
      fieldsWithOcrVariance: stabilityReport.fieldsWithOcrVariance,
      fieldsWithCandidatePoolVariance: stabilityReport.fieldsWithCandidatePoolVariance,
      proposalsStableAcrossAllRuns: stabilityReport.proposalsStableAcrossAllRuns,
      proposalsAppearingInOnlySomeRuns: stabilityReport.proposalsAppearingInOnlySomeRuns,
      proposalValueDisagreements: stabilityReport.proposalValueDisagreements,
      tpByRun: stabilityReport.tpByRun,
      fpByRun: stabilityReport.fpByRun,
    },
    productionReadiness,
  };
  await fs.writeFile(path.join(artifactDir, "combined-summary.json"), JSON.stringify(combinedSummary, null, 2));
  await fs.writeFile(path.join(artifactDir, "stability-report.json"), JSON.stringify(stabilityReport, null, 2));
  await fs.writeFile(
    path.join(artifactDir, "browser-primary-results.json"),
    JSON.stringify(runs.at(-1).primary, null, 2)
  );
  await fs.writeFile(
    path.join(artifactDir, "candidate-upper-bound.json"),
    JSON.stringify(runs.at(-1).candidateUpperBound, null, 2)
  );
  await fs.writeFile(
    path.join(artifactDir, "tier-c-simulation.json"),
    JSON.stringify(runs.at(-1).tierC, null, 2)
  );
  await fs.writeFile(
    path.join(artifactDir, "changed-proposals.json"),
    JSON.stringify(runs.at(-1).tierC.changedProposals, null, 2)
  );
  await fs.writeFile(
    path.join(artifactDir, "console-errors.json"),
    JSON.stringify(runs.flatMap((run) => run.summary.consoleErrors.map((entry) => ({ run: run.summary.runIndex, ...entry }))), null, 2)
  );
  await fs.writeFile(
    path.join(artifactDir, "page-errors.json"),
    JSON.stringify(runs.flatMap((run) => run.summary.pageErrors.map((entry) => ({ run: run.summary.runIndex, ...entry }))), null, 2)
  );
  return combinedSummary;
}

async function main() {
  const args = parseArgs();
  const rows = await collectIpadFixtures();
  if (!args.resume) {
    await fs.rm(artifactDir, { recursive: true, force: true });
  }
  await fs.mkdir(artifactDir, { recursive: true });
  const { chromium } = await loadPlaywright();
  let server = null;
  let baseUrl = args.baseUrl || `http://127.0.0.1:${args.port || 3000}`;
  if (!(await isServerReady(`${baseUrl}/?ipadArithmeticDebug=1`))) {
    const port = args.port || (await findFreePort());
    baseUrl = `http://127.0.0.1:${port}`;
    server = startDevServer(port);
  }
  const runs = [];
  try {
    await waitForServer(`${baseUrl}/?ipadArithmeticDebug=1`);
    const browser = await chromium.launch({ headless: true });
    try {
      for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
        runs.push(await runBrowserNativeBaseline({ rows, runIndex, baseUrl, browser, resume: args.resume }));
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
  const combinedSummary = await writeCombinedArtifacts({ rows, runs });
  console.log(JSON.stringify(combinedSummary, null, 2));
  const latest = combinedSummary.latestRun;
  if (
    latest.imagesProcessed !== rows.length ||
    latest.stageSidesProcessed !== rows.length * stages.length * sides.length ||
    latest.fieldPools !== rows.length * stages.length * sides.length * fieldLabels.length ||
    latest.exportMismatches ||
    latest.outputMutationFindings ||
    latest.pageErrors.length
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
