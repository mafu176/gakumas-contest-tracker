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
const artifactDir = path.join(rootDir, "tmp", "ipad-total-selection-investigation");
const productionVerificationDir = path.join(rootDir, "tmp", "ipad-browser-production-verification");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fieldLabels = ["member1", "member2", "member3", "bonus", "total"];
const memberLabels = ["member1", "member2", "member3"];

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    runs: Math.max(1, Number(process.argv[runsIndex + 1] || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_TOTAL_SELECTION_BASE_URL || "",
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

function uniqueNumbers(values) {
  return [...new Set(values.map(toNumber).filter((value) => value > 0))];
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
      return createRequire(path.join(path.resolve(rootDir, configuredModuleDir), "noop.js"))("playwright");
    }
    throw new Error(
      [
        "Playwright is required for iPad browser total selection investigation.",
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
  const child = spawn(npmCommand, ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: rootDir,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
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

function normalizeSide(value = {}) {
  const members = Array.isArray(value.members) ? value.members.slice(0, 3).map(toNumber) : [0, 0, 0];
  while (members.length < 3) members.push(0);
  return {
    members,
    bonus: toNumber(value.bonus),
    total: toNumber(value.total),
  };
}

function sideKey(image, stage, side) {
  return `${image}|${stage}|${side}`;
}

function tupleKey(tuple = {}) {
  const normalized = normalizeSide(tuple);
  return `${normalized.members.join(",")}|${normalized.bonus}|${normalized.total}`;
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

function poolFor(diagnostics, stage, side, label) {
  return diagnostics.stages?.[`stage${stage}`]?.[side]?.candidatePools?.[label] || {};
}

function compactCandidate(candidate = {}, index = 0) {
  return {
    value: toNumber(candidate.value),
    rawText: candidate.rawText || "",
    normalizedText: candidate.normalizedText || String(toNumber(candidate.value) || ""),
    profileIds: candidate.profileIds || [],
    profileId: candidate.profileId || "",
    sourceRank: Number(candidate.sourceRank ?? index),
    candidateOrder: index,
    duplicateSupportCount: Array.isArray(candidate.contributions) ? candidate.contributions.length : 1,
    ocrConfidence: Number(candidate.confidenceSignals?.ocrConfidence || 0),
    cropQuality: candidate.cropQuality || {},
    borderTouch: candidate.cropQuality?.touchesBorder ?? candidate.borderTouch ?? null,
    normalizationPath: candidate.confidenceSignals?.groupedNumberToken ? "grouped-number-token" : "production-parser",
    digitCount: Number(candidate.digitCount || String(toNumber(candidate.value) || "").length),
    contributions: (candidate.contributions || []).map((entry) => ({
      profileId: entry.profileId || "",
      rawText: entry.rawText || "",
      rawCandidate: entry.rawCandidate || "",
      normalizedText: entry.normalizedText || "",
      ocrConfidence: Number(entry.ocrConfidence || 0),
      candidateIndex: Number(entry.candidateIndex || 0),
    })),
  };
}

function candidates(pool = {}, { includeDefaultBonusZero = false } = {}) {
  const observed = Array.isArray(pool.candidates)
    ? pool.candidates
        .map((candidate, index) => ({ ...compactCandidate(candidate, index), origin: "observed" }))
        .filter((candidate) => candidate.value > 0)
    : [];
  const byValue = new Map();
  for (const candidate of observed) {
    if (!byValue.has(candidate.value)) byValue.set(candidate.value, candidate);
  }
  if (includeDefaultBonusZero) {
    byValue.set(0, {
      value: 0,
      rawText: "",
      normalizedText: "0",
      profileIds: ["schema-default-bonus-zero"],
      profileId: "schema-default-bonus-zero",
      sourceRank: 999,
      candidateOrder: 999,
      duplicateSupportCount: 1,
      ocrConfidence: 0,
      cropQuality: {},
      borderTouch: null,
      normalizationPath: "schema-default",
      digitCount: 1,
      contributions: [],
      origin: "schema-default-bonus-zero",
    });
  }
  return [...byValue.values()].sort((a, b) => {
    if (a.sourceRank !== b.sourceRank) return a.sourceRank - b.sourceRank;
    if (a.candidateOrder !== b.candidateOrder) return a.candidateOrder - b.candidateOrder;
    return a.value - b.value;
  });
}

function selectedCandidate(sideDiagnostics = {}, label) {
  return sideDiagnostics.currentSelections?.[label]?.candidate || null;
}

function hasStrongSelectedProvenance(sideDiagnostics = {}, label) {
  if (label === "bonus" && toNumber(sideDiagnostics.currentPrimary?.bonus) === 0) return true;
  return Boolean(selectedCandidate(sideDiagnostics, label));
}

function enumerateValidTuples(sideDiagnostics = {}) {
  const pools = sideDiagnostics.candidatePools || {};
  const sets = {
    member1: candidates(pools.member1),
    member2: candidates(pools.member2),
    member3: candidates(pools.member3),
    bonus: candidates(pools.bonus, { includeDefaultBonusZero: true }),
    total: candidates(pools.total),
  };
  const missing = Object.entries(sets)
    .filter(([, values]) => values.length === 0)
    .map(([label]) => label);
  if (missing.length) return { tuples: [], sets, missing, blockReason: `missing-candidate:${missing.join(",")}` };
  const totalSet = new Set(sets.total.map((candidate) => candidate.value));
  const tuples = [];
  for (const member1 of sets.member1) {
    for (const member2 of sets.member2) {
      for (const member3 of sets.member3) {
        for (const bonus of sets.bonus) {
          const totalValue = member1.value + member2.value + member3.value + bonus.value;
          if (!totalSet.has(totalValue)) continue;
          const total = sets.total.find((candidate) => candidate.value === totalValue);
          tuples.push({
            members: [member1.value, member2.value, member3.value],
            bonus: bonus.value,
            total: totalValue,
            origins: {
              member1: member1.origin,
              member2: member2.origin,
              member3: member3.origin,
              bonus: bonus.origin,
              total: total.origin,
            },
            candidateOrders: {
              member1: member1.candidateOrder,
              member2: member2.candidateOrder,
              member3: member3.candidateOrder,
              bonus: bonus.candidateOrder,
              total: total.candidateOrder,
            },
            totalCandidate: total,
            equation: `${member1.value}+${member2.value}+${member3.value}+${bonus.value}=${totalValue}`,
          });
        }
      }
    }
  }
  const deduped = [...new Map(tuples.map((tuple) => [tupleKey(tuple), tuple])).values()];
  return {
    tuples: deduped,
    sets,
    missing: [],
    blockReason: deduped.length === 0 ? "no-arithmetic-valid-tuple" : deduped.length > 1 ? "multiple-arithmetic-valid-tuples" : "",
  };
}

function strategyS2(sideDiagnostics = {}, finalSide = {}) {
  const enumeration = enumerateValidTuples(sideDiagnostics);
  if (enumeration.tuples.length !== 1) {
    return {
      strategy: "S2",
      wouldApply: false,
      blockReason: enumeration.blockReason || "not-unique-valid-tuple",
      validTupleCount: enumeration.tuples.length,
      candidateCompleteness: sideDiagnostics.tierC?.candidateCompleteness || {},
      proposal: null,
      enumeration,
    };
  }
  const proposal = normalizeSide(enumeration.tuples[0]);
  const current = normalizeSide(finalSide);
  const changedFields = changedFieldsBetween(current, proposal);
  return {
    strategy: "S2",
    wouldApply: changedFields.length > 0,
    blockReason: changedFields.length ? "" : "already-identical",
    validTupleCount: 1,
    proposal,
    changedFields,
    selectedTuple: enumeration.tuples[0],
    enumeration,
  };
}

function strategyS3(sideDiagnostics = {}, finalSide = {}) {
  const current = normalizeSide(finalSide);
  const strong =
    memberLabels.every((label) => hasStrongSelectedProvenance(sideDiagnostics, label)) &&
    hasStrongSelectedProvenance(sideDiagnostics, "bonus");
  if (!strong) {
    return { strategy: "S3", wouldApply: false, blockReason: "selected-non-total-field-lacks-strong-provenance", validTupleCount: 0, proposal: null };
  }
  const expectedTotal = current.members.reduce((sum, value) => sum + value, 0) + current.bonus;
  const totalCandidates = candidates(sideDiagnostics.candidatePools?.total || {});
  const matchingTotals = totalCandidates.filter((candidate) => candidate.value === expectedTotal);
  const competingValidTotals = totalCandidates.filter((candidate) => candidate.value !== current.total && candidate.value === expectedTotal);
  if (matchingTotals.length !== 1) {
    return {
      strategy: "S3",
      wouldApply: false,
      blockReason: matchingTotals.length === 0 ? "missing-observed-total-for-current-fields" : "duplicate-observed-total-candidates",
      validTupleCount: matchingTotals.length,
      proposal: null,
      matchingTotals,
    };
  }
  if (competingValidTotals.length > 1) {
    return { strategy: "S3", wouldApply: false, blockReason: "competing-total-candidates", validTupleCount: competingValidTotals.length, proposal: null, matchingTotals };
  }
  const proposal = { ...current, total: expectedTotal };
  const changedFields = changedFieldsBetween(current, proposal);
  return {
    strategy: "S3",
    wouldApply: changedFields.length > 0,
    blockReason: changedFields.length ? "" : "already-identical",
    validTupleCount: 1,
    proposal,
    changedFields,
    selectedTotal: matchingTotals[0],
    matchingTotals,
  };
}

function strategyS4(sideDiagnostics = {}, finalSide = {}) {
  const s2 = strategyS2(sideDiagnostics, finalSide);
  return {
    ...s2,
    strategy: "S4",
    blockReason: s2.blockReason || "provenance-tie-break-not-needed",
    note: "S4 uses the same unique numeric tuple as S2; provenance is recorded but never breaks ties between different numeric tuples.",
  };
}

function changedFieldsBetween(currentInput, proposalInput) {
  const current = normalizeSide(currentInput);
  const proposal = normalizeSide(proposalInput);
  const changed = [];
  for (let index = 0; index < 3; index += 1) {
    if (current.members[index] !== proposal.members[index]) changed.push(`member${index + 1}`);
  }
  if (current.bonus !== proposal.bonus) changed.push("bonus");
  if (current.total !== proposal.total) changed.push("total");
  return changed;
}

function evaluateProposal(proposal, expected) {
  if (!proposal?.wouldApply || !proposal.proposal) return { tp: false, fp: false, pass: false };
  const comparison = compareSide(proposal.proposal, expected);
  return { tp: comparison.pass, fp: !comparison.pass, pass: comparison.pass, comparison };
}

function compactTotalPool(pool = {}) {
  const totalValues = candidates(pool);
  return {
    key: pool.key || "",
    stage: pool.stage,
    side: pool.side,
    fieldType: pool.fieldType,
    cropQuality: pool.cropQuality || {},
    zone: pool.zone || {},
    candidateCompleteness: pool.candidateCompleteness || {},
    candidates: totalValues,
  };
}

function classifyFailure({ finalComparison, expected, pools, s2, sideDiagnostics }) {
  if (finalComparison.pass) return "G. Current output already correct";
  const totalValues = candidates(pools.total).map((candidate) => candidate.value);
  if (!totalValues.includes(expected.total)) {
    if (String(sideDiagnostics.tierC?.blockReason || "").startsWith("truncated-pool")) return "F. Candidate pool incomplete/truncated";
    return "E. Exact total absent";
  }
  const memberPresence = memberLabels.map((label, index) =>
    candidates(pools[label]).some((candidate) => candidate.value === expected.members[index])
  );
  const bonusPresent =
    expected.bonus === 0 || candidates(pools.bonus, { includeDefaultBonusZero: true }).some((candidate) => candidate.value === expected.bonus);
  if (!memberPresence.every(Boolean)) return "B. Exact total present but member evidence incomplete";
  if (!bonusPresent) return "C. Exact total present but bonus evidence incomplete";
  if ((s2?.validTupleCount || 0) > 1) return "D. Exact total present but multiple arithmetic-valid tuples exist";
  if ((s2?.validTupleCount || 0) === 1) return "A. Exact total present and all other tuple fields available";
  return "H. Other";
}

async function processImage({ browser, baseUrl, row, runDir, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "total-selection-image.json");
  if (resume) {
    try {
      return await loadJson(artifactPath);
    } catch {
      // Regenerate missing artifacts.
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
      if (!file) throw new Error("No uploaded file available for iPad total selection investigation.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, { timeout: 30000 });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    const result = {
      image: row.filename,
      clusterId: row.clusterId,
      imagePath: rel(row.imagePath),
      expected: row.expected,
      diagnostics,
      consoleMessages,
      pageErrors,
    };
    await writeJson(artifactPath, result);
    return result;
  } finally {
    await page.close();
  }
}

function evaluateRun(rows, imageResults, productionBaseline = null) {
  const stageSideRows = [];
  const candidateAudit = [];
  const strategyIds = ["S0", "S1", "S2", "S3", "S4"];
  const strategyResults = Object.fromEntries(
    strategyIds.map((id) => [
      id,
      {
        strategy: id,
        eligibleSides: 0,
        wouldApply: 0,
        changedProposals: 0,
        tp: 0,
        fp: 0,
        additionalTpBeyondProduction: 0,
        existingTpLost: 0,
        existingPassSidesLost: 0,
        multipleValidTupleIncrease: 0,
        stageSidePass: 0,
        stagePass: 0,
        imagePass: 0,
        fieldGains: 0,
        fieldRegressions: 0,
      },
    ])
  );
  const strategySidesByImage = new Map();
  const wouldApplyProposals = [];

  for (const row of rows) {
    const imageResult = imageResults.find((entry) => entry.image === row.filename);
    const diagnostics = imageResult?.diagnostics || {};
    const imageStrategyPass = Object.fromEntries(strategyIds.map((id) => [id, true]));
    const imageStagePass = Object.fromEntries(strategyIds.map((id) => [id, Object.fromEntries(stages.map((stage) => [stage, true]))]));
    for (const stage of stages) {
      for (const side of sides) {
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const sideDiagnostics = diagnostics.stages?.[`stage${stage}`]?.[side] || {};
        const final = displayedSide(diagnostics, stage, side);
        const finalComparison = compareSide(final, expected);
        const pools = Object.fromEntries(fieldLabels.map((label) => [label, poolFor(diagnostics, stage, side, label)]));
        const s2 = strategyS2(sideDiagnostics, final);
        const proposals = {
          S0: { strategy: "S0", wouldApply: false, proposal: final, changedFields: [], blockReason: "current-production-output" },
          S1: {
            strategy: "S1",
            wouldApply: Boolean(sideDiagnostics.tierC?.wouldApply),
            proposal: sideDiagnostics.tierC?.proposal || null,
            changedFields: sideDiagnostics.tierC?.changedFields || [],
            blockReason: sideDiagnostics.tierC?.blockReason || "",
            validTupleCount: Number(sideDiagnostics.tierC?.validTupleCount || 0),
          },
          S2: s2,
          S3: strategyS3(sideDiagnostics, final),
          S4: strategyS4(sideDiagnostics, final),
        };
        const classification = classifyFailure({ finalComparison, expected, pools, s2, sideDiagnostics });
        const rowRecord = {
          image: row.filename,
          stage,
          side,
          key: sideKey(row.filename, stage, side),
          expected,
          final,
          finalPass: finalComparison.pass,
          classification,
          tierC: {
            eligible: Boolean(sideDiagnostics.tierC?.eligible),
            wouldApply: Boolean(sideDiagnostics.tierC?.wouldApply),
            validTupleCount: Number(sideDiagnostics.tierC?.validTupleCount || 0),
            blockReason: sideDiagnostics.tierC?.blockReason || "",
            proposal: sideDiagnostics.tierC?.proposal || null,
            candidateCompleteness: sideDiagnostics.tierC?.candidateCompleteness || {},
          },
          candidatePresence: {
            members: memberLabels.map((label, index) => candidates(pools[label]).some((candidate) => candidate.value === expected.members[index])),
            bonus: expected.bonus === 0 || candidates(pools.bonus, { includeDefaultBonusZero: true }).some((candidate) => candidate.value === expected.bonus),
            total: candidates(pools.total).some((candidate) => candidate.value === expected.total),
          },
          proposals: Object.fromEntries(
            Object.entries(proposals).map(([id, proposal]) => [
              id,
              {
                wouldApply: Boolean(proposal.wouldApply),
                blockReason: proposal.blockReason || "",
                validTupleCount: Number(proposal.validTupleCount || 0),
                changedFields: proposal.changedFields || [],
                proposal: proposal.proposal ? normalizeSide(proposal.proposal) : null,
              },
            ])
          ),
        };
        stageSideRows.push(rowRecord);
        candidateAudit.push({
          image: row.filename,
          stage,
          side,
          totalPool: compactTotalPool(pools.total),
          currentPrimaryTotal: toNumber(sideDiagnostics.currentPrimary?.total),
          selectedAsCurrentPrimary: toNumber(sideDiagnostics.currentPrimary?.total),
          currentSelection: sideDiagnostics.currentSelections?.total || null,
        });

        for (const id of strategyIds) {
          const result = strategyResults[id];
          const proposal = proposals[id];
          const sideAfter = proposal.wouldApply && proposal.proposal ? proposal.proposal : final;
          const afterComparison = compareSide(sideAfter, expected);
          const proposalEval = evaluateProposal(proposal, expected);
          if (id === "S0") {
            if (finalComparison.pass) result.stageSidePass += 1;
          } else {
            if (proposal.validTupleCount === 1 || proposal.wouldApply) result.eligibleSides += 1;
            if (proposal.wouldApply) result.wouldApply += 1;
            if ((proposal.changedFields || []).length) result.changedProposals += 1;
            if (proposalEval.tp) result.tp += 1;
            if (proposalEval.fp) result.fp += 1;
            if (proposalEval.tp && !finalComparison.pass) result.additionalTpBeyondProduction += 1;
            if (finalComparison.pass && !afterComparison.pass) result.existingPassSidesLost += 1;
            if (proposal.validTupleCount > Number(sideDiagnostics.tierC?.validTupleCount || 0)) {
              result.multipleValidTupleIncrease += 1;
            }
            result.stageSidePass += afterComparison.pass ? 1 : 0;
            result.fieldGains += countFieldGains(finalComparison, afterComparison);
            result.fieldRegressions += countFieldRegressions(finalComparison, afterComparison);
          }
          imageStrategyPass[id] &&= afterComparison.pass;
          imageStagePass[id][stage] &&= afterComparison.pass;
          if (proposal.wouldApply) {
            wouldApplyProposals.push({
              image: row.filename,
              stage,
              side,
              strategy: id,
              current: final,
              proposed: normalizeSide(proposal.proposal || {}),
              changedFields: proposal.changedFields || [],
              observedTotalCandidates: candidates(pools.total),
              selectedTotalProvenance: proposal.selectedTuple?.totalCandidate || proposal.selectedTotal || null,
              memberBonusProvenance: fieldLabels
                .filter((label) => label !== "total")
                .map((label) => ({ label, selected: sideDiagnostics.currentSelections?.[label] || null })),
              arithmeticEquation: proposal.selectedTuple?.equation || `${normalizeSide(proposal.proposal || {}).members.join("+")}+${normalizeSide(proposal.proposal || {}).bonus}=${normalizeSide(proposal.proposal || {}).total}`,
              validTupleCount: Number(proposal.validTupleCount || 0),
              competingCandidates: proposal.enumeration?.tuples?.filter((tuple) => tupleKey(tuple) !== tupleKey(proposal.proposal)) || [],
              evaluation: proposalEval,
              tierCBlockReason: sideDiagnostics.tierC?.blockReason || "",
            });
          }
        }
      }
    }
    for (const id of strategyIds) {
      if (imageStrategyPass[id]) strategyResults[id].imagePass += 1;
      strategyResults[id].stagePass += Object.values(imageStagePass[id]).filter(Boolean).length;
    }
  }

  const classificationCounts = {};
  for (const row of stageSideRows) {
    classificationCounts[row.classification] = (classificationCounts[row.classification] || 0) + 1;
  }
  const addressableRows = stageSideRows.filter(
    (row) =>
      !row.finalPass &&
      row.candidatePresence.total &&
      row.candidatePresence.bonus &&
      row.candidatePresence.members.every(Boolean)
  );
  const previousFour = addressableRows
    .filter((row) => row.proposals.S2.wouldApply || row.proposals.S3.wouldApply || row.candidatePresence.total)
    .map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      s2Applies: row.proposals.S2.wouldApply,
      s3Applies: row.proposals.S3.wouldApply,
      uniqueS2: row.proposals.S2.validTupleCount === 1,
      productionTierCBlockReason: row.tierC.blockReason,
      rootCause: rootCauseForRow(row),
    }));

  for (const result of Object.values(strategyResults)) {
    result.stageSideTotal = stageSideRows.length;
    result.stageSideAccuracyPct = pct(result.stageSidePass, stageSideRows.length);
    result.stageTotal = rows.length * 3;
    result.stageAccuracyPct = pct(result.stagePass, rows.length * 3);
    result.imageTotal = rows.length;
    result.imageAccuracyPct = pct(result.imagePass, rows.length);
  }

  const tierCBlockRootCauses = addressableRows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    productionTierCBlockReason: row.tierC.blockReason,
    tierCValidTupleCount: row.tierC.validTupleCount,
    exactTotalPresent: row.candidatePresence.total,
    s2WouldApply: row.proposals.S2.wouldApply,
    s3WouldApply: row.proposals.S3.wouldApply,
    rootCause: rootCauseForRow(row),
  }));

  return {
    schema: "ipad-total-selection-investigation-summary-v1",
    productionBaseline,
    totalStageSides: stageSideRows.length,
    classificationCounts,
    exactTotalPresentAddressableRows: addressableRows.length,
    stageSideRows,
    candidateAudit,
    strategyResults,
    addressableRows,
    previousAddressableAudit: previousFour,
    tierCBlockRootCauses,
    wouldApplyProposals,
    recommendation: recommend(strategyResults, addressableRows, wouldApplyProposals),
  };
}

function countFieldGains(before, after) {
  return Object.keys(before.fields).filter((field) => !before.fields[field] && after.fields[field]).length;
}

function countFieldRegressions(before, after) {
  return Object.keys(before.fields).filter((field) => before.fields[field] && !after.fields[field]).length;
}

function rootCauseForRow(row) {
  if (row.tierC.blockReason === "multiple-arithmetic-valid-tuples") return "Tier C blocks because multiple complete arithmetic tuples are valid.";
  if (row.tierC.blockReason === "no-arithmetic-valid-tuple" && row.proposals.S3.wouldApply) {
    return "Existing Tier C does not include a total-only final-output replacement path; selected members and bonus are exact and an observed exact total exists.";
  }
  if (row.tierC.blockReason?.startsWith("missing-candidate:")) return `Tier C missing candidate: ${row.tierC.blockReason}`;
  if (row.proposals.S2.wouldApply) return "Unique arithmetic tuple exists in production candidates, but production Tier C did not apply from the final displayed state.";
  if (row.proposals.S3.wouldApply) return "Strict total-only replacement is possible from final selected member/bonus evidence.";
  return row.tierC.blockReason || "No strict total-selection proposal.";
}

function recommend(strategyResults, addressableRows, wouldApplyProposals) {
  const candidates = Object.values(strategyResults).filter((entry) => ["S2", "S3", "S4"].includes(entry.strategy));
  const safeCandidates = candidates.filter(
    (entry) => entry.additionalTpBeyondProduction >= 2 && entry.fp === 0 && entry.existingPassSidesLost === 0
  );
  const bestPool = safeCandidates.length ? safeCandidates : candidates;
  const best = bestPool.sort((a, b) => {
    if (b.additionalTpBeyondProduction !== a.additionalTpBeyondProduction) return b.additionalTpBeyondProduction - a.additionalTpBeyondProduction;
    if (a.fp !== b.fp) return a.fp - b.fp;
    return a.existingPassSidesLost - b.existingPassSidesLost;
  })[0];
  if (!best || best.additionalTpBeyondProduction < 2 || best.fp > 0 || best.existingPassSidesLost > 0) {
    return {
      recommendation: "do-not-productionize",
      reason:
        "Strict total selection did not meet the production review threshold of at least 2 additional TP with FP=0 and no existing PASS loss.",
      nextStep: "Move to iPad bonus candidate capture/selection investigation.",
    };
  }
  return {
    recommendation: "production-review-justified",
    strategy: best.strategy,
    reason: `${best.strategy} adds ${best.additionalTpBeyondProduction} TP with ${best.fp} FP and ${best.existingPassSidesLost} existing PASS losses.`,
    nextStep:
      "Add shared runner/browser-equivalent parity plumbing around the same browser-native total-selection evidence before productionization.",
    proposalCount: wouldApplyProposals.filter((proposal) => proposal.strategy === best.strategy).length,
    addressableRows: addressableRows.length,
  };
}

async function runOnce({ runIndex, browser, baseUrl, rows, runDir, resume }) {
  await fs.mkdir(runDir, { recursive: true });
  const imageResults = [];
  for (const row of rows) {
    console.log(`[iPad total selection run ${runIndex}] ${row.filename}`);
    imageResults.push(await processImage({ browser, baseUrl, row, runDir, resume }));
  }
  return imageResults;
}

async function loadProductionBaseline() {
  return await loadJson(path.join(productionVerificationDir, "combined-summary.json"));
}

function validateProductionBaseline(baseline) {
  const pass =
    Array.isArray(baseline?.runs) &&
    baseline.runs.length >= 2 &&
    baseline.runs.every(
      (run) =>
        run.imagesProcessed === 18 &&
        run.stageSidePass === 40 &&
        run.productionApplications === 24 &&
        run.tp === 24 &&
        run.fp === 0
    ) &&
    Number(baseline.stability?.applicationRows || 0) === 24 &&
    Number(baseline.stability?.stableApplicationRows || 0) === 24;
  return { pass, reason: pass ? "ok" : "production-baseline-did-not-match-required-values" };
}

function compareRunStability(runSummaries) {
  if (runSummaries.length < 2) return { comparedRuns: runSummaries.length, stable: true, mismatches: [] };
  const signature = (summary) =>
    stableJson({
      classificationCounts: summary.classificationCounts,
      strategyResults: summary.strategyResults,
      wouldApply: summary.wouldApplyProposals.map((proposal) => ({
        image: proposal.image,
        stage: proposal.stage,
        side: proposal.side,
        strategy: proposal.strategy,
        proposed: proposal.proposed,
        changedFields: proposal.changedFields,
        validTupleCount: proposal.validTupleCount,
      })),
      candidateTotals: summary.candidateAudit.map((entry) => ({
        image: entry.image,
        stage: entry.stage,
        side: entry.side,
        values: entry.totalPool.candidates.map((candidate) => candidate.value),
        selected: entry.selectedAsCurrentPrimary,
      })),
    });
  const baseline = signature(runSummaries[0]);
  const mismatches = runSummaries.slice(1).flatMap((summary, index) =>
    signature(summary) === baseline ? [] : [{ runIndex: index + 2, reason: "strategy-or-candidate-signature-differs-from-run-1" }]
  );
  return { comparedRuns: runSummaries.length, stable: mismatches.length === 0, mismatches };
}

async function writeTopLevelArtifacts(summary, runStability) {
  await writeJson(path.join(artifactDir, "production-baseline.json"), summary.productionBaseline);
  await writeJson(path.join(artifactDir, "candidate-audit.json"), summary.candidateAudit);
  await writeJson(path.join(artifactDir, "failure-classification.json"), {
    counts: summary.classificationCounts,
    rows: summary.stageSideRows.map(({ image, stage, side, classification, expected, final, candidatePresence, tierC }) => ({
      image,
      stage,
      side,
      classification,
      expected,
      final,
      candidatePresence,
      tierC,
    })),
  });
  await writeJson(path.join(artifactDir, "strategy-results.json"), summary.strategyResults);
  await writeJson(path.join(artifactDir, "addressable-rows.json"), summary.addressableRows);
  await writeJson(path.join(artifactDir, "tier-c-block-root-causes.json"), summary.tierCBlockRootCauses);
  await writeJson(path.join(artifactDir, "would-apply-proposals.json"), summary.wouldApplyProposals);
  await writeJson(path.join(artifactDir, "run-stability.json"), runStability);
  await writeJson(path.join(artifactDir, "recommendation.json"), summary.recommendation);
  await writeJson(path.join(artifactDir, "summary.json"), summary);
}

async function main() {
  const args = parseArgs();
  if (!args.resume) await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });

  const productionBaseline = await loadProductionBaseline();
  const baselineCheck = validateProductionBaseline(productionBaseline);
  if (!baselineCheck.pass) throw new Error(`Required iPad production baseline was not confirmed: ${baselineCheck.reason}`);

  const rows = await collectFixtures();
  const playwright = await loadPlaywright();
  const port = args.baseUrl ? null : args.port || (await findFreePort());
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;
  let appServer = null;
  if (!(await isServerReady(baseUrl))) {
    appServer = startDevServer(port);
    await waitForServer(baseUrl);
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const runSummaries = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      const runDir = path.join(artifactDir, `run-${runIndex}`);
      const imageResults = await runOnce({ runIndex, browser, baseUrl, rows, runDir, resume: args.resume });
      const summary = evaluateRun(rows, imageResults, productionBaseline);
      await writeJson(path.join(runDir, "summary.json"), summary);
      await writeJson(path.join(runDir, "stage-side-rows.json"), summary.stageSideRows);
      runSummaries.push(summary);
    }
    const runStability = compareRunStability(runSummaries);
    const latest = runSummaries.at(-1);
    await writeTopLevelArtifacts(latest, runStability);
    const consoleSummary = {
      command: "node scripts/ipad-total-selection-investigation.mjs",
      artifactDir: rel(artifactDir),
      runs: args.runs,
      productionBaseline: {
        images: "18/18",
        stageSidePass: "40/108",
        applications: 24,
        tp: 24,
        fp: 0,
        stableApplications: "24/24",
      },
      exactTotalPresentAddressableRows: latest.exactTotalPresentAddressableRows,
      classificationCounts: latest.classificationCounts,
      strategyResults: Object.fromEntries(
        Object.entries(latest.strategyResults).map(([id, result]) => [
          id,
          {
            wouldApply: result.wouldApply,
            tp: result.tp,
            fp: result.fp,
            additionalTpBeyondProduction: result.additionalTpBeyondProduction,
            existingPassSidesLost: result.existingPassSidesLost,
            stageSidePass: `${result.stageSidePass}/${result.stageSideTotal}`,
          },
        ])
      ),
      runStability,
      recommendation: latest.recommendation,
    };
    console.log(JSON.stringify(consoleSummary, null, 2));
    if (!runStability.stable) process.exitCode = 1;
  } finally {
    await browser.close();
    await writeJson(
      path.join(artifactDir, "dev-server.log.json"),
      appServer?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }]
    );
    await stopDevServer(appServer);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
