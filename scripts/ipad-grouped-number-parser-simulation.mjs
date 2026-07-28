import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";
import {
  IPAD_GROUPED_NUMBER_TOKEN_ORIGIN,
  IPAD_GROUPED_NUMBER_TOKEN_RULE_VERSION,
  evaluateIpadArithmeticSideSelectionTier,
  parseIpadGroupedNumberTokens,
} from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const artifactDir = path.join(rootDir, "tmp", "ipad-grouped-number-parser-review");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const memberLabels = ["member1", "member2", "member3"];
const fieldLabels = ["member1", "member2", "member3", "bonus", "total"];
const groupedTokenRuleVersion = IPAD_GROUPED_NUMBER_TOKEN_RULE_VERSION;
const t2Origin = IPAD_GROUPED_NUMBER_TOKEN_ORIGIN;

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    runs: Math.max(1, Number(runsIndex >= 0 ? process.argv[runsIndex + 1] || 2 : process.env.IPAD_GROUPED_NUMBER_RUNS || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_GROUPED_NUMBER_BASE_URL || "",
    resume: process.argv.includes("--resume"),
  };
}

function rel(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function pct(value, total) {
  return total ? Number(((value / total) * 100).toFixed(1)) : 0;
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

function normalizeText(text = "") {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[，]/g, ",")
    .replace(/[．]/g, ".")
    .trim();
}

function parseIpadGroupedNumberTokensLocal(text = "") {
  const normalizedText = normalizeText(text);
  const tokens = [];
  const regex = /(?<![\d.,])(\d{1,3})([,.])(\d{3})(?:(\2)(\d{3}))*?(?![\d.,])/g;
  for (const match of normalizedText.matchAll(regex)) {
    const raw = match[0];
    const start = match.index || 0;
    const end = start + raw.length;
    const separator = match[2];
    if (!raw.includes(separator)) continue;
    if (separator !== "," && separator !== ".") continue;
    const otherSeparator = separator === "," ? "." : ",";
    if (raw.includes(otherSeparator)) continue;
    if (!new RegExp(`^\\d{1,3}\\${separator}\\d{3}(?:\\${separator}\\d{3})*$`).test(raw)) continue;
    const groups = raw.split(separator);
    if (groups.length < 2) continue;
    if (groups[0].length < 1 || groups[0].length > 3) continue;
    if (!groups.slice(1).every((group) => group.length === 3)) continue;
    const value = Number(groups.join(""));
    if (!Number.isInteger(value) || value <= 0) continue;
    tokens.push({
      origin: t2Origin,
      ruleVersion: groupedTokenRuleVersion,
      rawToken: raw,
      normalizedToken: raw,
      separator,
      groups,
      value,
      start,
      end,
      context: {
        before: normalizedText.slice(Math.max(0, start - 8), start),
        token: raw,
        after: normalizedText.slice(end, Math.min(normalizedText.length, end + 8)),
      },
    });
  }
  return tokens;
}

function runNegativeTests() {
  const accepted = ["1,234", "12,345", "123,456", "1,234,567", "1.234", "12.345", "123.456", "1.234.567"];
  const rejected = ["12,34", "1,23,456", "123,456.789", "12.345,678", "1 234", "123456", "1,a234", "1,,234", "123,", ",123", "1.2.34", "1 / 1 / 6"];
  const acceptedResults = accepted.map((input) => ({ input, tokens: parseIpadGroupedNumberTokens(input) }));
  const rejectedResults = rejected.map((input) => ({ input, tokens: parseIpadGroupedNumberTokens(input) }));
  const failures = [
    ...acceptedResults.filter((entry) => entry.tokens.length !== 1),
    ...rejectedResults.filter((entry) => entry.tokens.length !== 0),
  ];
  return {
    accepted: acceptedResults,
    rejected: rejectedResults,
    dangerousT1CaseBlocked: parseIpadGroupedNumberTokens("1 / 1 / 6").length === 0,
    pass: failures.length === 0,
    failures,
  };
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
    throw error;
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
  return { members, bonus: toNumber(value.bonus), total: toNumber(value.total) };
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

function sideDiagnosticsFor(diagnostics, stage, side) {
  return diagnostics?.stages?.[`stage${stage}`]?.[side] || {};
}

function fieldPoolFor(diagnostics, stage, side, label) {
  return sideDiagnosticsFor(diagnostics, stage, side)?.candidatePools?.[label] || {};
}

function currentCandidateValues(pool = {}) {
  return [...new Set((pool.candidates || []).map((candidate) => toNumber(candidate.value)).filter((value) => value > 0))];
}

function expectedMember(expected, stage, side, slot) {
  const stageData = expected[`stage${stage}`] || {};
  const members = side === "self" ? stageData.selfMembers || [] : stageData.enemyMembers || [];
  return Number(members[slot - 1] || 0);
}

function groupedCandidateForToken({ token, profile, pool }) {
  return {
    value: token.value,
    rawText: profile.rawText || "",
    normalizedText: String(token.value),
    fieldType: "member",
    profileId: t2Origin,
    profileIds: [t2Origin],
    sourceRank: 600,
    cropQuality: { ...(pool.cropQuality || {}), tokenization: t2Origin },
    digitCount: String(token.value).length,
    origin: t2Origin,
    groupedNumberToken: {
      ruleVersion: token.ruleVersion,
      rawToken: token.rawToken,
      separator: token.separator,
      groups: token.groups,
      reconstructedValue: token.value,
    },
    confidenceSignals: {
      ocrConfidence: Number(profile.ocrConfidence || 0),
      digitOnlyPurity: 1,
      lengthInSchema: true,
      plusLike: false,
      repeatedProfiles: 1,
      independentAgreement: 1,
      groupedNumberToken: true,
    },
    contributions: [
      {
        profileId: profile.profileId || "",
        sourceProfileId: profile.profileId || "",
        candidateIndex: 0,
        rawText: profile.rawText || "",
        rawCandidate: token.rawToken,
        normalizedText: String(token.value),
        ocrConfidence: Number(profile.ocrConfidence || 0),
        plusLike: false,
        source: t2Origin,
        ruleVersion: token.ruleVersion,
        separator: token.separator,
        groups: token.groups,
      },
    ],
  };
}

function groupedCandidatesForPool(pool = {}) {
  const out = [];
  for (const profile of Object.values(pool.profileResults || {})) {
    for (const token of parseIpadGroupedNumberTokens(profile.rawText || "")) {
      const candidate = groupedCandidateForToken({ token, profile, pool });
      const existing = out.find((entry) => entry.value === candidate.value && entry.groupedNumberToken.separator === token.separator);
      if (existing) {
        if (!existing.profileIds.includes(profile.profileId || "")) existing.profileIds.push(profile.profileId || "");
        existing.contributions.push(candidate.contributions[0]);
        existing.confidenceSignals.independentAgreement = new Set(existing.profileIds).size;
        existing.confidenceSignals.repeatedProfiles = existing.profileIds.length;
        continue;
      }
      out.push(candidate);
    }
  }
  return out;
}

function expandedPoolWithT2(pool = {}) {
  const existingValues = new Set(currentCandidateValues(pool));
  const additions = groupedCandidatesForPool(pool).filter((candidate) => !existingValues.has(candidate.value));
  return {
    ...pool,
    candidates: [...(pool.candidates || []), ...additions],
    tokenizerAdditions: additions,
    rawDistinctCandidateCount: Number(pool.rawDistinctCandidateCount || (pool.candidates || []).length) + additions.length,
  };
}

function expandSidePools(sideDiagnostics = {}) {
  const pools = sideDiagnostics.candidatePools || {};
  return Object.fromEntries(
    fieldLabels.map((label) => [label, memberLabels.includes(label) ? expandedPoolWithT2(pools[label] || {}) : pools[label] || {}])
  );
}

function proposalSide(tierC = {}) {
  const proposal = tierC.proposal || tierC.selectedTuple || null;
  if (!proposal) return null;
  return {
    members: Array.isArray(proposal.members) ? proposal.members.map(toNumber) : [],
    bonus: toNumber(proposal.bonus),
    total: toNumber(proposal.total),
  };
}

function compactTierC(tierC = {}) {
  return {
    eligible: Boolean(tierC.eligible),
    wouldApply: Boolean(tierC.wouldApply),
    validTupleCount: Number(tierC.validTupleCount || 0),
    blockReason: tierC.blockReason || "",
    changedFields: tierC.changedFields || [],
    candidateCompleteness: tierC.candidateCompleteness || {},
    proposal: proposalSide(tierC),
    selectedTuple: tierC.selectedTuple || null,
  };
}

async function processImage({ context, baseUrl, row, runDir, resume }) {
  const imageDir = path.join(runDir, row.filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const artifactPath = path.join(imageDir, "image-result.json");
  if (resume) {
    try {
      const existing = await loadJson(artifactPath);
      if (existing?.image === row.filename) return existing;
    } catch {
      // Regenerate incomplete artifacts.
    }
  }
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
  try {
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, { timeout: 30000 });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for iPad grouped-number parser simulation.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForSelector('[data-testid="ipad-arithmetic-diagnostics-panel"]', { timeout: 900000 });
    await page.waitForFunction(() => Boolean(window.__IPAD_ARITHMETIC_DIAGNOSTICS__?.imageIdentifier), null, { timeout: 30000 });
    const diagnostics = await page.evaluate(() => window.__IPAD_ARITHMETIC_DIAGNOSTICS__);
    await fs.mkdir(imageDir, { recursive: true });
    const result = { image: row.filename, clusterId: row.clusterId, diagnostics, consoleMessages, pageErrors };
    await fs.writeFile(artifactPath, JSON.stringify(result, null, 2));
    return result;
  } finally {
    await page.close();
  }
}

function evaluateProduction(rows, imageResults) {
  const stats = { stageSidePass: 0, stagePass: 0, imagePass: 0, stageSides: rows.length * 6, stages: rows.length * 3, images: rows.length, tierCApplications: 0, tp: 0, fp: 0 };
  for (const row of rows) {
    const image = imageResults.find((entry) => entry.image === row.filename);
    let imagePass = true;
    const applied = image.diagnostics.productionRecovery?.appliedCases || [];
    stats.tierCApplications += applied.length;
    for (const stage of stages) {
      let stagePass = true;
      for (const side of sides) {
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const actual = displayedSide(image.diagnostics, stage, side);
        const pass = compareSide(actual, expected).pass;
        stats.stageSidePass += pass ? 1 : 0;
        stagePass &&= pass;
        const appliedCase = applied.find((entry) => entry.stage === stage && entry.side === side);
        if (appliedCase) {
          if (pass) stats.tp += 1;
          else stats.fp += 1;
        }
      }
      stats.stagePass += stagePass ? 1 : 0;
      imagePass &&= stagePass;
    }
    stats.imagePass += imagePass ? 1 : 0;
  }
  stats.stageSideFail = stats.stageSides - stats.stageSidePass;
  stats.stageFail = stats.stages - stats.stagePass;
  stats.imageFail = stats.images - stats.imagePass;
  return stats;
}

function evaluateT2(rows, imageResults) {
  const parserOpportunities = [];
  const recoveredFields = [];
  const wrongCandidates = [];
  const candidateCapFindings = [];
  const records = [];
  const stats = {
    stageSidePassBefore: 0,
    stageSidePassAfter: 0,
    stagePassBefore: 0,
    stagePassAfter: 0,
    imagePassBefore: 0,
    imagePassAfter: 0,
    t2CandidatesAdded: 0,
    fieldsAffected: 0,
    expectedCandidateGains: 0,
    wrongCandidateAdditions: 0,
    tierCEligible: 0,
    tierCWouldApply: 0,
    tierCTp: 0,
    tierCFp: 0,
    multipleValidTupleCount: 0,
    existingPassSidesLost: 0,
    wrongUniqueTierCProposal: 0,
    harmlessWrongCandidateFields: 0,
    ambiguityProducingWrongCandidateFields: 0,
    bySeparator: { comma: emptySeparatorStats(), period: emptySeparatorStats() },
    byMember: Object.fromEntries(memberLabels.map((label) => [label, { opportunities: 0, recovered: 0, wrong: 0 }])),
    byStage: Object.fromEntries(stages.map((stage) => [`stage${stage}`, { opportunities: 0, recovered: 0, wrong: 0 }])),
    byCluster: {},
  };

  for (const row of rows) {
    const image = imageResults.find((entry) => entry.image === row.filename);
    let imageBeforePass = true;
    let imageAfterPass = true;
    for (const stage of stages) {
      let stageBeforePass = true;
      let stageAfterPass = true;
      for (const side of sides) {
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const sideDiagnostics = sideDiagnosticsFor(image.diagnostics, stage, side);
        const before = displayedSide(image.diagnostics, stage, side);
        const beforePass = compareSide(before, expected).pass;
        const currentPrimary = normalizeSide(sideDiagnostics.currentPrimary || {});
        const expandedPools = expandSidePools(sideDiagnostics);
        const t2 = evaluateIpadArithmeticSideSelectionTier({
          deviceMode: "ipad",
          fieldCandidatePools: expandedPools,
          currentPrimary,
          tier: "tier-c",
        });
        const proposed = proposalSide(t2);
        const after = t2.wouldApply ? proposed : before;
        const afterPass = compareSide(after, expected).pass;
        if (beforePass) stats.stageSidePassBefore += 1;
        if (afterPass) stats.stageSidePassAfter += 1;
        if (beforePass && !afterPass) stats.existingPassSidesLost += 1;
        if (t2.eligible) stats.tierCEligible += 1;
        if (t2.wouldApply) {
          stats.tierCWouldApply += 1;
          if (afterPass && !beforePass) stats.tierCTp += 1;
          else if (!afterPass) {
            stats.tierCFp += 1;
            stats.wrongUniqueTierCProposal += 1;
          }
        }
        if (Number(t2.validTupleCount || 0) > 1) stats.multipleValidTupleCount += 1;
        stageBeforePass &&= beforePass;
        stageAfterPass &&= afterPass;

        const sideT2Fields = [];
        const sideWrongFields = [];
        for (const label of memberLabels) {
          const slot = Number(label.replace("member", ""));
          const pool = fieldPoolFor(image.diagnostics, stage, side, label);
          const currentValues = currentCandidateValues(pool);
          const expectedValue = expectedMember(row.expected, stage, side, slot);
          const additions = groupedCandidatesForPool(pool).filter((candidate) => !currentValues.includes(candidate.value));
          if (additions.length) {
            stats.fieldsAffected += 1;
            stats.t2CandidatesAdded += additions.length;
            sideT2Fields.push(label);
          }
          const capFinding = {
            image: row.filename,
            stage,
            side,
            label,
            originalCandidateCount: (pool.candidates || []).length,
            originalRawDistinctCandidateCount: Number(pool.rawDistinctCandidateCount || 0),
            originalTruncated: Boolean(pool.truncated),
            t2AdditionCount: additions.length,
            expandedCandidateCount: (pool.candidates || []).length + additions.length,
            wouldExceedCandidateCap: (pool.candidates || []).length + additions.length > Number(pool.candidateCap || 6),
          };
          if (additions.length || capFinding.originalTruncated) candidateCapFindings.push(capFinding);
          for (const addition of additions) {
            const separatorKey = addition.groupedNumberToken.separator === "," ? "comma" : "period";
            const opportunity = {
              image: row.filename,
              clusterId: row.clusterId,
              stage,
              side,
              label,
              slot,
              expected: expectedValue,
              rawText: addition.rawText,
              normalizedToken: addition.groupedNumberToken.rawToken,
              separator: addition.groupedNumberToken.separator,
              groups: addition.groupedNumberToken.groups,
              reconstructedValue: addition.value,
              profileProvenance: addition.profileIds,
              currentPoolAlreadyContainsValue: currentValues.includes(addition.value),
              t2AddsValue: true,
              participatesInTierC:
                t2.wouldApply &&
                proposed?.members?.[slot - 1] === addition.value &&
                t2.selectedTuple?.profileIds?.[label]?.some((profileId) => addition.profileIds.includes(profileId)),
              changesFinalOutputInSimulation: Boolean(t2.wouldApply && proposed?.members?.[slot - 1] === addition.value),
            };
            parserOpportunities.push(opportunity);
            stats.bySeparator[separatorKey].opportunities += 1;
            stats.byMember[label].opportunities += 1;
            stats.byStage[`stage${stage}`].opportunities += 1;
            stats.byCluster[row.clusterId] ||= { opportunities: 0, recovered: 0, wrong: 0 };
            stats.byCluster[row.clusterId].opportunities += 1;
            if (addition.value === expectedValue) {
              stats.expectedCandidateGains += 1;
              stats.bySeparator[separatorKey].recoveries += 1;
              stats.byMember[label].recovered += 1;
              stats.byStage[`stage${stage}`].recovered += 1;
              stats.byCluster[row.clusterId].recovered += 1;
              recoveredFields.push(opportunity);
            } else {
              stats.wrongCandidateAdditions += 1;
              stats.bySeparator[separatorKey].wrong += 1;
              stats.byMember[label].wrong += 1;
              stats.byStage[`stage${stage}`].wrong += 1;
              stats.byCluster[row.clusterId].wrong += 1;
              sideWrongFields.push(label);
              wrongCandidates.push({
                ...opportunity,
                harmless: !t2.wouldApply || afterPass,
                createsArithmeticValidTuple: Number(t2.validTupleCount || 0) > 0,
                createsAmbiguity: Number(t2.validTupleCount || 0) > 1,
                createsWrongUniqueTierCProposal: Boolean(t2.wouldApply && !afterPass),
                wouldAlterOutput: Boolean(t2.wouldApply),
              });
            }
          }
        }
        if (sideWrongFields.length) {
          if (Number(t2.validTupleCount || 0) > 1) stats.ambiguityProducingWrongCandidateFields += sideWrongFields.length;
          else if (!t2.wouldApply || afterPass) stats.harmlessWrongCandidateFields += sideWrongFields.length;
        }
        records.push({
          image: row.filename,
          clusterId: row.clusterId,
          stage,
          side,
          before,
          after,
          expected,
          beforePass,
          afterPass,
          t2: compactTierC(t2),
          t2Fields: sideT2Fields,
        });
      }
      if (stageBeforePass) stats.stagePassBefore += 1;
      if (stageAfterPass) stats.stagePassAfter += 1;
      imageBeforePass &&= stageBeforePass;
      imageAfterPass &&= stageAfterPass;
    }
    if (imageBeforePass) stats.imagePassBefore += 1;
    if (imageAfterPass) stats.imagePassAfter += 1;
  }
  stats.additionalTpApplications = stats.tierCTp;
  stats.currentProductionTierCTp = 9;
  stats.withT2TierCTp = stats.currentProductionTierCTp + stats.additionalTpApplications;
  stats.stageSidePassBeforePct = pct(stats.stageSidePassBefore, rows.length * 6);
  stats.stageSidePassAfterPct = pct(stats.stageSidePassAfter, rows.length * 6);
  return { stats, records, parserOpportunities, recoveredFields, wrongCandidates, candidateCapFindings };
}

function emptySeparatorStats() {
  return { opportunities: 0, recoveries: 0, wrong: 0 };
}

async function runOnce({ runIndex, rows, browser, baseUrl, resume }) {
  const runDir = path.join(artifactDir, `run-${runIndex}`);
  await fs.mkdir(runDir, { recursive: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const imageResults = [];
  try {
    for (const row of rows) {
      console.log(`[iPad grouped-number parser] run ${runIndex}: ${row.filename}${resume ? " (resume)" : ""}`);
      imageResults.push(await processImage({ context, baseUrl, row, runDir, resume }));
    }
  } finally {
    await context.close();
  }
  const production = evaluateProduction(rows, imageResults);
  const t2 = evaluateT2(rows, imageResults);
  const summary = { runIndex, production, t2: t2.stats };
  await fs.writeFile(path.join(runDir, "parser-opportunities.json"), JSON.stringify(t2.parserOpportunities, null, 2));
  await fs.writeFile(path.join(runDir, "recovered-fields.json"), JSON.stringify(t2.recoveredFields, null, 2));
  await fs.writeFile(path.join(runDir, "wrong-candidates.json"), JSON.stringify(t2.wrongCandidates, null, 2));
  await fs.writeFile(path.join(runDir, "tier-c-simulation.json"), JSON.stringify({ summary: t2.stats, records: t2.records }, null, 2));
  await fs.writeFile(path.join(runDir, "candidate-cap-findings.json"), JSON.stringify(t2.candidateCapFindings, null, 2));
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  return { runIndex, runDir, imageResults, production, t2, summary };
}

function buildStability(runs) {
  const signatures = runs.map((run) => ({
    opportunities: run.t2.parserOpportunities.map((entry) => ({
      image: entry.image,
      stage: entry.stage,
      side: entry.side,
      label: entry.label,
      token: entry.normalizedToken,
      value: entry.reconstructedValue,
      separator: entry.separator,
      profiles: entry.profileProvenance,
    })),
    recovered: run.t2.recoveredFields.map((entry) => `${entry.image}|${entry.stage}|${entry.side}|${entry.label}|${entry.reconstructedValue}`),
    wrong: run.t2.wrongCandidates.map((entry) => `${entry.image}|${entry.stage}|${entry.side}|${entry.label}|${entry.reconstructedValue}|${entry.createsWrongUniqueTierCProposal}`),
    tierC: run.t2.records.map((entry) => ({
      image: entry.image,
      stage: entry.stage,
      side: entry.side,
      wouldApply: entry.t2.wouldApply,
      validTupleCount: entry.t2.validTupleCount,
      proposal: entry.t2.proposal,
      beforePass: entry.beforePass,
      afterPass: entry.afterPass,
    })),
    stats: run.t2.stats,
  }));
  return {
    runs: runs.length,
    rawGroupedStringsStable: signatures.every((entry) => stableJson(entry.opportunities) === stableJson(signatures[0].opportunities)),
    reconstructedCandidatesStable: signatures.every((entry) => stableJson(entry.recovered) === stableJson(signatures[0].recovered)),
    wrongCandidatesStable: signatures.every((entry) => stableJson(entry.wrong) === stableJson(signatures[0].wrong)),
    tierCStable: signatures.every((entry) => stableJson(entry.tierC) === stableJson(signatures[0].tierC)),
    statsStable: signatures.every((entry) => stableJson(entry.stats) === stableJson(signatures[0].stats)),
    signatures,
  };
}

async function writeCombined({ runs, negativeTests }) {
  const latest = runs.at(-1);
  const stability = buildStability(runs);
  const readiness = {
    criteriaPassed:
      negativeTests.pass &&
      negativeTests.dangerousT1CaseBlocked &&
      stability.rawGroupedStringsStable &&
      stability.reconstructedCandidatesStable &&
      stability.tierCStable &&
      runs.every((run) => run.t2.stats.tierCFp === 0) &&
      runs.every((run) => run.t2.stats.existingPassSidesLost === 0) &&
      runs.every((run) => run.t2.stats.wrongUniqueTierCProposal === 0) &&
      latest.t2.stats.additionalTpApplications >= 2,
    notes: [
      "T2 parsing is deterministic and expected-blind.",
      "T2 is limited to comma/period thousands separators in member fields.",
      "T1/T3/T4 behavior is not part of the production-readiness candidate.",
    ],
  };
  const commaAudit = latest.t2.parserOpportunities.filter((entry) => entry.separator === ",");
  const periodAudit = latest.t2.parserOpportunities.filter((entry) => entry.separator === ".");
  const combined = {
    schema: "ipad-grouped-number-parser-review-v1",
    command: "node scripts/ipad-grouped-number-parser-simulation.mjs",
    artifactDir: rel(artifactDir),
    runs: runs.length,
    latestRun: latest.summary,
    stability: {
      runs: stability.runs,
      rawGroupedStringsStable: stability.rawGroupedStringsStable,
      reconstructedCandidatesStable: stability.reconstructedCandidatesStable,
      wrongCandidatesStable: stability.wrongCandidatesStable,
      tierCStable: stability.tierCStable,
      statsStable: stability.statsStable,
    },
    negativeTests,
    readiness,
  };
  await fs.writeFile(path.join(artifactDir, "parser-opportunities.json"), JSON.stringify(latest.t2.parserOpportunities, null, 2));
  await fs.writeFile(path.join(artifactDir, "comma-audit.json"), JSON.stringify(commaAudit, null, 2));
  await fs.writeFile(path.join(artifactDir, "period-audit.json"), JSON.stringify(periodAudit, null, 2));
  await fs.writeFile(path.join(artifactDir, "recovered-fields.json"), JSON.stringify(latest.t2.recoveredFields, null, 2));
  await fs.writeFile(path.join(artifactDir, "wrong-candidates.json"), JSON.stringify(latest.t2.wrongCandidates, null, 2));
  await fs.writeFile(path.join(artifactDir, "tier-c-simulation.json"), JSON.stringify({ summary: latest.t2.stats, records: latest.t2.records }, null, 2));
  await fs.writeFile(path.join(artifactDir, "stability.json"), JSON.stringify(stability, null, 2));
  await fs.writeFile(path.join(artifactDir, "negative-tests.json"), JSON.stringify(negativeTests, null, 2));
  await fs.writeFile(path.join(artifactDir, "combined-summary.json"), JSON.stringify(combined, null, 2));
  return combined;
}

async function main() {
  const args = parseArgs();
  if (!args.resume) await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
  const negativeTests = runNegativeTests();
  if (!negativeTests.pass) {
    await fs.writeFile(path.join(artifactDir, "negative-tests.json"), JSON.stringify(negativeTests, null, 2));
    throw new Error("Grouped-number parser negative tests failed.");
  }
  const rows = await collectFixtures();
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
        runs.push(await runOnce({ runIndex, rows, browser, baseUrl, resume: args.resume }));
      }
    } finally {
      await browser.close();
    }
    const combined = await writeCombined({ runs, negativeTests });
    await fs.writeFile(
      path.join(artifactDir, "dev-server.log.json"),
      JSON.stringify(server?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }], null, 2)
    );
    console.log(
      JSON.stringify(
        {
          command: "node scripts/ipad-grouped-number-parser-simulation.mjs",
          artifactDir: rel(artifactDir),
          production: combined.latestRun.production,
          t2: combined.latestRun.t2,
          stability: combined.stability,
          negativeTests: {
            pass: combined.negativeTests.pass,
            dangerousT1CaseBlocked: combined.negativeTests.dangerousT1CaseBlocked,
          },
          readiness: combined.readiness,
        },
        null,
        2
      )
    );
  } finally {
    await stopDevServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
