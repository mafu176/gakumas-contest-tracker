import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { evaluateIpadArithmeticSideSelectionTier } from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const artifactDir = path.join(rootDir, "tmp", "ipad-member-tokenization-investigation");
const requireFromHere = createRequire(import.meta.url);

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const memberLabels = ["member1", "member2", "member3"];
const allFieldLabels = ["member1", "member2", "member3", "bonus", "total"];
const tierOrder = ["T1", "T2", "T3", "T4"];
const tierSets = [
  { id: "production", tiers: [] },
  { id: "production+T1", tiers: ["T1"] },
  { id: "production+T2-only", tiers: ["T2"] },
  { id: "production+T1+T2", tiers: ["T1", "T2"] },
  { id: "production+T1+T2+T3", tiers: ["T1", "T2", "T3"] },
  { id: "production+T1+T2+T3+T4", tiers: ["T1", "T2", "T3", "T4"] },
];

function parseArgs() {
  const runsIndex = process.argv.indexOf("--runs");
  const portIndex = process.argv.indexOf("--port");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    runs: Math.max(1, Number(runsIndex >= 0 ? process.argv[runsIndex + 1] || 2 : process.env.IPAD_TOKENIZATION_RUNS || 2)),
    port: portIndex >= 0 ? Number(process.argv[portIndex + 1] || 0) : 0,
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_TOKENIZATION_BASE_URL || "",
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

function uniqueNumbers(values) {
  return [...new Set(values.map(toNumber).filter((value) => value > 0))];
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

function expectedMember(expected, stage, side, slot) {
  const sideValues = expectedSide(expected[`stage${stage}`], side);
  return Number(sideValues.members[slot - 1] || 0);
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
  return uniqueNumbers((pool.candidates || []).map((candidate) => candidate.value));
}

function normalizeText(text = "") {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[＋]/g, "+")
    .replace(/[，]/g, ",")
    .replace(/[．]/g, ".")
    .replace(/[ \t\r\f\v]+/g, " ")
    .trim();
}

function contextAt(text, start, end) {
  return {
    before: text.slice(Math.max(0, start - 8), start),
    token: text.slice(start, end),
    after: text.slice(end, Math.min(text.length, end + 8)),
  };
}

function addToken(tokens, token) {
  if (!Number.isInteger(token.value) || token.value <= 0) return;
  const key = `${token.tier}|${token.value}|${token.profileId}|${token.start}|${token.end}|${token.raw}`;
  if (tokens.some((entry) => entry.key === key)) return;
  tokens.push({ key, ...token });
}

function tokenizeRawText({ rawText = "", profileId = "", profile = {} }) {
  const text = normalizeText(rawText);
  const tokens = [];

  const groupedRegex = /(?<!\d)\d{1,3}(?:[,.]\d{3})+(?!\d)/g;
  const groupedSpans = [];
  for (const match of text.matchAll(groupedRegex)) {
    const raw = match[0];
    const start = match.index || 0;
    const end = start + raw.length;
    const value = Number(raw.replace(/[^\d]/g, ""));
    groupedSpans.push({ start, end });
    addToken(tokens, {
      tier: "T2",
      value,
      raw,
      normalized: String(value),
      profileId,
      source: "validated-thousands-separator",
      start,
      end,
      context: contextAt(text, start, end),
      ocrConfidence: Number(profile.ocrConfidence || 0),
    });
  }

  const digitRegex = /\d+/g;
  const digitRuns = [];
  for (const match of text.matchAll(digitRegex)) {
    const raw = match[0];
    const start = match.index || 0;
    const end = start + raw.length;
    digitRuns.push({ raw, start, end, value: Number(raw) });
    const insideGrouped = groupedSpans.some((span) => start >= span.start && end <= span.end);
    if (!insideGrouped) {
      addToken(tokens, {
        tier: "T1",
        value: Number(raw),
        raw,
        normalized: raw,
        profileId,
        source: "literal-digit-run",
        start,
        end,
        context: contextAt(text, start, end),
        ocrConfidence: Number(profile.ocrConfidence || 0),
      });
    }
  }

  const splitRegex = /(?<!\d)(\d{1,3})(?:\s+(\d{3})){1,2}(?!\d)/g;
  for (const match of text.matchAll(splitRegex)) {
    const raw = match[0];
    const start = match.index || 0;
    const end = start + raw.length;
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts.slice(1).every((part) => part.length === 3)) {
      const value = Number(parts.join(""));
      addToken(tokens, {
        tier: "T3",
        value,
        raw,
        normalized: String(value),
        profileId,
        source: "independent-whitespace-groups",
        start,
        end,
        context: contextAt(text, start, end),
        ocrConfidence: Number(profile.ocrConfidence || 0),
      });
    }
  }

  const longRuns = digitRuns.filter((run) => run.raw.length >= 9);
  for (const run of longRuns) {
    addToken(tokens, {
      tier: "T4",
      value: run.value,
      raw: run.raw,
      normalized: run.raw,
      profileId,
      source: "blocked-continuous-long-run-no-independent-boundary",
      start: run.start,
      end: run.end,
      blocked: true,
      blockReason: "continuous-run-no-structural-boundary",
      context: contextAt(text, run.start, run.end),
      ocrConfidence: Number(profile.ocrConfidence || 0),
    });
  }

  return {
    rawText,
    normalizedText: text,
    digitRuns,
    tokens: tokens.map(({ key, ...token }) => token),
  };
}

function tokenRecordsForPool(pool = {}) {
  const records = [];
  for (const profile of Object.values(pool.profileResults || {})) {
    const tokenized = tokenizeRawText({
      rawText: profile.rawText || "",
      profileId: profile.profileId || "",
      profile,
    });
    records.push({
      profileId: profile.profileId || "",
      rawText: profile.rawText || "",
      normalizedText: tokenized.normalizedText,
      currentParsedCandidates: profile.parsedCandidates || [],
      ocrConfidence: Number(profile.ocrConfidence || 0),
      zone: profile.zone || pool.zone || {},
      digitRuns: tokenized.digitRuns,
      tokens: tokenized.tokens,
    });
  }
  return records;
}

function diagnosticCandidatesForPool(pool = {}) {
  const byTier = Object.fromEntries(tierOrder.map((tier) => [tier, []]));
  for (const profileRecord of tokenRecordsForPool(pool)) {
    const parsedValues = new Set((profileRecord.currentParsedCandidates || []).map((candidate) => toNumber(candidate.value)));
    for (const token of profileRecord.tokens) {
      if (token.blocked) continue;
      const omittedByParser = !parsedValues.has(token.value);
      const candidate = {
        value: token.value,
        origin: `tokenization-${token.tier}`,
        profileIds: [profileRecord.profileId],
        sourceRank: 700 + tierOrder.indexOf(token.tier),
        rawText: profileRecord.rawText,
        normalizedText: token.normalized,
        confidenceSignals: {
          ocrConfidence: profileRecord.ocrConfidence,
          tokenizerTier: token.tier,
          omittedByCurrentParser: omittedByParser,
        },
        contributions: [
          {
            profileId: profileRecord.profileId,
            candidateIndex: 0,
            rawCandidate: token.raw,
            normalizedText: token.normalized,
            ocrConfidence: profileRecord.ocrConfidence,
            plusLike: false,
            source: token.source,
            context: token.context,
          },
        ],
        tokenizer: token,
      };
      if (!byTier[token.tier].some((entry) => entry.value === candidate.value && entry.profileIds[0] === profileRecord.profileId)) {
        byTier[token.tier].push(candidate);
      }
    }
  }
  return byTier;
}

function expandedPool(pool = {}, allowedTiers = []) {
  if (!allowedTiers.length) return pool;
  const existingValues = new Set((pool.candidates || []).map((candidate) => toNumber(candidate.value)));
  const additions = [];
  const byTier = diagnosticCandidatesForPool(pool);
  for (const tier of allowedTiers) {
    for (const candidate of byTier[tier] || []) {
      if (existingValues.has(candidate.value)) continue;
      if (additions.some((entry) => entry.value === candidate.value)) continue;
      additions.push(candidate);
    }
  }
  return {
    ...pool,
    candidates: [...(pool.candidates || []), ...additions],
    rawDistinctCandidateCount: Number(pool.rawDistinctCandidateCount || (pool.candidates || []).length) + additions.length,
    tokenizerAdditions: additions,
  };
}

function expandSidePools(sideDiagnostics = {}, allowedTiers = []) {
  const pools = sideDiagnostics.candidatePools || {};
  return Object.fromEntries(
    allFieldLabels.map((label) => {
      const pool = pools[label] || {};
      return [label, memberLabels.includes(label) ? expandedPool(pool, allowedTiers) : pool];
    })
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

function getExpectedField(expectedStage, side, label) {
  const expected = expectedSide(expectedStage, side);
  if (label.startsWith("member")) return expected.members[Number(label.replace("member", "")) - 1] || 0;
  if (label === "bonus") return expected.bonus;
  return expected.total;
}

function evaluateTokenization(rows, imageResults) {
  const rawEvidence = [];
  const tokenizationResults = [];
  const memberFieldRecords = [];
  const member2Taxonomy = [];
  const stage3Member2Audit = [];

  const tierStats = Object.fromEntries(
    tierSets.map((tierSet) => [
      tierSet.id,
      {
        memberFields: 0,
        exactMemberCoverage: 0,
        additionalExpectedMemberCandidates: 0,
        additionalWrongCandidates: 0,
        candidateNoiseFields: 0,
        evidenceLossFields: 0,
        unchangedFields: 0,
        byMember: Object.fromEntries(memberLabels.map((label) => [label, { gain: 0, coverage: 0, fields: 0 }])),
        byStage: Object.fromEntries(stages.map((stage) => [`stage${stage}`, { gain: 0, coverage: 0, fields: 0 }])),
        byCluster: {},
        stage3Member2Gain: 0,
      },
    ])
  );

  for (const row of rows) {
    const image = imageResults.find((entry) => entry.image === row.filename);
    for (const stage of stages) {
      for (const side of sides) {
        for (const label of memberLabels) {
          const slot = Number(label.replace("member", ""));
          const pool = fieldPoolFor(image.diagnostics, stage, side, label);
          const expected = expectedMember(row.expected, stage, side, slot);
          const productionValues = currentCandidateValues(pool);
          const productionPresent = productionValues.includes(expected);
          const profileRecords = tokenRecordsForPool(pool);
          const byTier = diagnosticCandidatesForPool(pool);
          const exactTiers = tierOrder.filter((tier) => (byTier[tier] || []).some((candidate) => candidate.value === expected));
          const allTokenValues = uniqueNumbers(tierOrder.flatMap((tier) => (byTier[tier] || []).map((candidate) => candidate.value)));
          const allRaw = profileRecords.map((profile) => profile.normalizedText).join("\n");
          const digitRuns = profileRecords.flatMap((profile) => profile.digitRuns.map((run) => ({ ...run, profileId: profile.profileId })));
          const record = {
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            label,
            slot,
            expected,
            selected: toNumber(sideDiagnosticsFor(image.diagnostics, stage, side)?.currentPrimary?.members?.[slot - 1]),
            productionPresent,
            productionValues,
            profileRecords,
            diagnosticCandidatesByTier: Object.fromEntries(
              tierOrder.map((tier) => [
                tier,
                (byTier[tier] || []).map((candidate) => ({
                  value: candidate.value,
                  profileIds: candidate.profileIds,
                  rawText: candidate.rawText,
                  tokenizer: candidate.tokenizer,
                })),
              ])
            ),
            exactTiers,
            allTokenValues,
            rawContainsExpectedDigits: allRaw.includes(String(expected)),
            digitRuns,
          };
          memberFieldRecords.push(record);
          rawEvidence.push({
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            label,
            expected,
            productionValues,
            profileRecords,
          });
          tokenizationResults.push({
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            label,
            expected,
            productionPresent,
            exactTiers,
            diagnosticCandidatesByTier: record.diagnosticCandidatesByTier,
          });

          for (const tierSet of tierSets) {
            const stats = tierStats[tierSet.id];
            const candidateValues =
              tierSet.id === "production"
                ? productionValues
                : uniqueNumbers([
                    ...productionValues,
                    ...tierSet.tiers.flatMap((tier) => (byTier[tier] || []).map((candidate) => candidate.value)),
                  ]);
            const present = candidateValues.includes(expected);
            const newValues = candidateValues.filter((value) => !productionValues.includes(value));
            const wrongNewValues = newValues.filter((value) => value !== expected);
            stats.memberFields += 1;
            stats.exactMemberCoverage += present ? 1 : 0;
            stats.additionalExpectedMemberCandidates += !productionPresent && present ? 1 : 0;
            stats.additionalWrongCandidates += wrongNewValues.length;
            stats.candidateNoiseFields += wrongNewValues.length ? 1 : 0;
            stats.evidenceLossFields += productionPresent && !present ? 1 : 0;
            stats.unchangedFields += stableJson(candidateValues) === stableJson(productionValues) ? 1 : 0;
            stats.byMember[label].fields += 1;
            stats.byMember[label].coverage += present ? 1 : 0;
            stats.byMember[label].gain += !productionPresent && present ? 1 : 0;
            stats.byStage[`stage${stage}`].fields += 1;
            stats.byStage[`stage${stage}`].coverage += present ? 1 : 0;
            stats.byStage[`stage${stage}`].gain += !productionPresent && present ? 1 : 0;
            stats.byCluster[row.clusterId] ||= { fields: 0, coverage: 0, gain: 0 };
            stats.byCluster[row.clusterId].fields += 1;
            stats.byCluster[row.clusterId].coverage += present ? 1 : 0;
            stats.byCluster[row.clusterId].gain += !productionPresent && present ? 1 : 0;
            if (stage === 3 && label === "member2" && !productionPresent && present) {
              stats.stage3Member2Gain += 1;
            }
          }

          if (label === "member2" && !productionPresent) {
            const classification = classifyMember2Failure(record);
            member2Taxonomy.push({ ...classification, ...summarizeFieldRecord(record) });
          }
          if (label === "member2" && stage === 3) {
            stage3Member2Audit.push({
              ...summarizeFieldRecord(record),
              productionCandidate: productionValues,
              rawTexts: profileRecords.map((profile) => ({
                profileId: profile.profileId,
                normalizedText: profile.normalizedText,
                digitRuns: profile.digitRuns,
                tokens: profile.tokens,
              })),
              exactLiteralAnywhere: record.rawContainsExpectedDigits,
              safeTokenizationCanExpose: record.exactTiers.some((tier) => ["T1", "T2", "T3"].includes(tier)),
              onlyAmbiguousRepairCouldRecover:
                !productionPresent &&
                !record.exactTiers.some((tier) => ["T1", "T2", "T3"].includes(tier)) &&
                (record.rawContainsExpectedDigits || digitRuns.some((run) => String(expected).includes(run.raw) || run.raw.includes(String(expected).slice(0, 3)))),
            });
          }
        }
      }
    }
  }

  for (const stats of Object.values(tierStats)) {
    stats.exactMemberCoveragePct = pct(stats.exactMemberCoverage, stats.memberFields);
    for (const breakdown of Object.values(stats.byMember)) {
      breakdown.coveragePct = pct(breakdown.coverage, breakdown.fields);
    }
    for (const breakdown of Object.values(stats.byStage)) {
      breakdown.coveragePct = pct(breakdown.coverage, breakdown.fields);
    }
    for (const breakdown of Object.values(stats.byCluster)) {
      breakdown.coveragePct = pct(breakdown.coverage, breakdown.fields);
    }
  }

  return {
    rawEvidence,
    tokenizationResults,
    memberFieldRecords,
    member2Taxonomy,
    stage3Member2Audit,
    tierStats,
  };
}

function summarizeFieldRecord(record) {
  return {
    image: record.image,
    clusterId: record.clusterId,
    stage: record.stage,
    side: record.side,
    label: record.label,
    slot: record.slot,
    expected: record.expected,
    selected: record.selected,
    productionPresent: record.productionPresent,
    productionValues: record.productionValues,
    exactTiers: record.exactTiers,
    rawContainsExpectedDigits: record.rawContainsExpectedDigits,
    numericRuns: record.digitRuns.map((run) => ({
      profileId: run.profileId,
      raw: run.raw,
      length: run.raw.length,
      value: run.value,
      start: run.start,
      end: run.end,
    })),
  };
}

function classifyMember2Failure(record) {
  const expectedDigits = String(record.expected);
  const digitRuns = record.digitRuns || [];
  if (record.exactTiers.includes("T1")) return { category: "A", reason: "Exact literal digits exist in raw OCR and current parser missed them." };
  if (record.exactTiers.includes("T2")) return { category: "B", reason: "Exact grouped digits exist with safe separator structure." };
  if (record.exactTiers.includes("T3")) return { category: "C", reason: "Exact value exists across independent OCR word/token boundaries." };
  if (record.rawContainsExpectedDigits) return { category: "D", reason: "Exact digits appear only inside a larger or ambiguous raw string." };
  if (digitRuns.some((run) => expectedDigits.includes(run.raw) && run.raw.length >= 3)) {
    return { category: "F", reason: "Raw OCR has useful fragments but is missing one or more digits." };
  }
  if (digitRuns.some((run) => run.raw.length > expectedDigits.length && run.raw.includes(expectedDigits.slice(0, 3)))) {
    return { category: "G", reason: "Raw OCR contains extra internal digits with no deterministic boundary." };
  }
  if (digitRuns.length) return { category: "E", reason: "Raw OCR has numeric evidence, but not the exact digits; likely substitution or unrelated contamination." };
  if (record.profileRecords?.length) return { category: "H", reason: "No useful numeric evidence." };
  return { category: "I", reason: "OCR evidence unavailable or incomplete." };
}

function evaluateTierExpansions(rows, imageResults, tokenization) {
  const fieldRecordByKey = new Map(
    tokenization.memberFieldRecords.map((record) => [
      `${record.image}|${record.stage}|${record.side}|${record.label}`,
      record,
    ])
  );
  const results = {};
  const recordsByExpansion = {};

  for (const tierSet of tierSets) {
    const stats = {
      stageSides: rows.length * stages.length * sides.length,
      eligible: 0,
      wouldApply: 0,
      tp: 0,
      fp: 0,
      existingPassSidesLost: 0,
      multipleValidTupleIncrease: 0,
      ambiguityProducingNoise: 0,
      wrongUniqueProposalNoise: 0,
      harmlessExtraCandidateFields: 0,
      stageSideGain: 0,
      byPosition: Object.fromEntries(stages.flatMap((stage) => sides.map((side) => [`stage${stage}_${side}`, { wouldApply: 0, tp: 0, fp: 0, blocked: 0 }]))),
      blockReasons: {},
    };
    const records = [];

    for (const row of rows) {
      const image = imageResults.find((entry) => entry.image === row.filename);
      for (const stage of stages) {
        for (const side of sides) {
          const positionKey = `stage${stage}_${side}`;
          const sideDiagnostics = sideDiagnosticsFor(image.diagnostics, stage, side);
          const currentPrimary = normalizeSide(sideDiagnostics.currentPrimary || {});
          const finalDisplayed = displayedSide(image.diagnostics, stage, side);
          const expected = expectedSide(row.expected[`stage${stage}`], side);
          const finalComparison = compareSide(finalDisplayed, expected);
          const currentTier = compactTierC(sideDiagnostics.tierC || {});
          const expandedPools = expandSidePools(sideDiagnostics, tierSet.tiers);
          const tier = evaluateIpadArithmeticSideSelectionTier({
            deviceMode: "ipad",
            fieldCandidatePools: expandedPools,
            currentPrimary,
            tier: "tier-c",
          });
          const compact = compactTierC(tier);
          const proposed = proposalSide(tier);
          const proposedComparison = proposed ? compareSide(proposed, expected) : null;
          const productionValidCount = Number(currentTier.validTupleCount || 0);
          const expandedValidCount = Number(compact.validTupleCount || 0);
          const tokenAddedFields = memberLabels.filter((label) => {
            const record = fieldRecordByKey.get(`${row.filename}|${stage}|${side}|${label}`);
            if (!record) return false;
            return tierSet.tiers.some((tierId) => (record.diagnosticCandidatesByTier[tierId] || []).length > 0);
          });
          if (tokenAddedFields.length && !compact.wouldApply && expandedValidCount <= productionValidCount) {
            stats.harmlessExtraCandidateFields += tokenAddedFields.length;
          }
          if (expandedValidCount > productionValidCount && expandedValidCount > 1) {
            stats.multipleValidTupleIncrease += 1;
            stats.ambiguityProducingNoise += 1;
          }
          if (compact.wouldApply && proposedComparison && !proposedComparison.pass) {
            stats.wrongUniqueProposalNoise += 1;
          }
          stats.eligible += compact.eligible ? 1 : 0;
          if (!compact.wouldApply) {
            stats.blockReasons[compact.blockReason || "not-eligible"] =
              (stats.blockReasons[compact.blockReason || "not-eligible"] || 0) + 1;
            stats.byPosition[positionKey].blocked += 1;
          } else {
            stats.wouldApply += 1;
            stats.byPosition[positionKey].wouldApply += 1;
            if (proposedComparison?.pass && !finalComparison.pass) {
              stats.tp += 1;
              stats.stageSideGain += 1;
              stats.byPosition[positionKey].tp += 1;
            } else if (!proposedComparison?.pass) {
              stats.fp += 1;
              stats.byPosition[positionKey].fp += 1;
            }
            if (finalComparison.pass && !proposedComparison?.pass) stats.existingPassSidesLost += 1;
          }
          records.push({
            image: row.filename,
            clusterId: row.clusterId,
            stage,
            side,
            expansion: tierSet.id,
            currentPrimary,
            finalDisplayed,
            expected,
            finalPass: finalComparison.pass,
            productionTierC: currentTier,
            expandedTierC: compact,
            proposed,
            proposedPass: proposedComparison?.pass || false,
            tokenAddedFields,
          });
        }
      }
    }
    results[tierSet.id] = stats;
    recordsByExpansion[tierSet.id] = records;
  }
  return { summary: results, recordsByExpansion };
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
      if (!file) throw new Error("No uploaded file available for iPad tokenization investigation.");
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

async function runOnce({ runIndex, rows, browser, baseUrl, resume }) {
  const runDir = path.join(artifactDir, `run-${runIndex}`);
  await fs.mkdir(runDir, { recursive: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const imageResults = [];
  try {
    for (const row of rows) {
      if (resume) {
        const cached = await processImage({ context, baseUrl, row, runDir, resume: true });
        if (cached) {
          console.log(`[iPad tokenization] run ${runIndex}: ${row.filename} (cached)`);
          imageResults.push(cached);
          continue;
        }
      }
      console.log(`[iPad tokenization] run ${runIndex}: ${row.filename}`);
      imageResults.push(await processImage({ context, baseUrl, row, runDir, resume: false }));
    }
  } finally {
    await context.close();
  }
  const tokenization = evaluateTokenization(rows, imageResults);
  const tierExpansion = evaluateTierExpansions(rows, imageResults, tokenization);
  const production = evaluateProduction(rows, imageResults);
  const summary = buildRunSummary({ rows, imageResults, tokenization, tierExpansion, production, runIndex });
  await fs.writeFile(path.join(runDir, "raw-evidence.json"), JSON.stringify(tokenization.rawEvidence, null, 2));
  await fs.writeFile(path.join(runDir, "tokenization-results.json"), JSON.stringify(tokenization.tokenizationResults, null, 2));
  await fs.writeFile(path.join(runDir, "member2-failure-taxonomy.json"), JSON.stringify(tokenization.member2Taxonomy, null, 2));
  await fs.writeFile(path.join(runDir, "stage3-member2-audit.json"), JSON.stringify(tokenization.stage3Member2Audit, null, 2));
  await fs.writeFile(path.join(runDir, "tier-candidate-expansion.json"), JSON.stringify(tierExpansion, null, 2));
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
  return { runIndex, runDir, imageResults, tokenization, tierExpansion, production, summary };
}

function evaluateProduction(rows, imageResults) {
  const summary = { images: rows.length, stageSides: rows.length * stages.length * sides.length, stageSidePass: 0, tierCApplications: 0, tp: 0, fp: 0 };
  for (const row of rows) {
    const image = imageResults.find((entry) => entry.image === row.filename);
    const applied = image.diagnostics.productionRecovery?.appliedCases || [];
    summary.tierCApplications += applied.length;
    for (const stage of stages) {
      for (const side of sides) {
        const expected = expectedSide(row.expected[`stage${stage}`], side);
        const finalDisplayed = displayedSide(image.diagnostics, stage, side);
        const pass = compareSide(finalDisplayed, expected).pass;
        summary.stageSidePass += pass ? 1 : 0;
        const appliedCase = applied.find((entry) => entry.stage === stage && entry.side === side);
        if (appliedCase) {
          if (pass) summary.tp += 1;
          else summary.fp += 1;
        }
      }
    }
  }
  summary.stageSideFail = summary.stageSides - summary.stageSidePass;
  summary.stageSideAccuracy = pct(summary.stageSidePass, summary.stageSides);
  return summary;
}

function buildRunSummary({ rows, imageResults, tokenization, tierExpansion, production, runIndex }) {
  const taxonomyCounts = Object.fromEntries(
    Object.entries(
      tokenization.member2Taxonomy.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      }, {})
    ).sort(([a], [b]) => a.localeCompare(b))
  );
  const stage3Member2 = tokenization.stage3Member2Audit;
  return {
    schema: "ipad-member-tokenization-investigation-run-v1",
    runIndex,
    imagesProcessed: imageResults.length,
    memberFields: tokenization.memberFieldRecords.length,
    production,
    productionMemberCoverage: tokenization.tierStats.production,
    tierCandidateCoverage: tierStatsForReport(tokenization.tierStats),
    member2FailureTaxonomyCounts: taxonomyCounts,
    member2FailureTaxonomyTotal: tokenization.member2Taxonomy.length,
    stage3Member2: {
      fields: stage3Member2.length,
      productionExactCandidatePresence: stage3Member2.filter((entry) => entry.productionPresent).length,
      exactLiteralAnywhere: stage3Member2.filter((entry) => entry.rawContainsExpectedDigits).length,
      safeTokenizationCanExpose: stage3Member2.filter((entry) => entry.safeTokenizationCanExpose).length,
      onlyAmbiguousRepairCouldRecover: stage3Member2.filter((entry) => entry.onlyAmbiguousRepairCouldRecover).length,
    },
    tierCExpansion: Object.fromEntries(
      Object.entries(tierExpansion.summary).map(([id, stats]) => [
        id,
        {
          wouldApply: stats.wouldApply,
          tp: stats.tp,
          fp: stats.fp,
          existingPassSidesLost: stats.existingPassSidesLost,
          multipleValidTupleIncrease: stats.multipleValidTupleIncrease,
          ambiguityProducingNoise: stats.ambiguityProducingNoise,
          wrongUniqueProposalNoise: stats.wrongUniqueProposalNoise,
          harmlessExtraCandidateFields: stats.harmlessExtraCandidateFields,
          stageSideGain: stats.stageSideGain,
          byPosition: stats.byPosition,
          blockReasons: stats.blockReasons,
        },
      ])
    ),
    consoleErrors: imageResults.flatMap((image) =>
      image.consoleMessages
        .filter((entry) => ["error", "warning"].includes(entry.type))
        .map((entry) => ({ image: image.image, ...entry }))
    ),
    pageErrors: imageResults.flatMap((image) => image.pageErrors.map((entry) => ({ image: image.image, ...entry }))),
  };
}

function tierStatsForReport(tierStats) {
  return Object.fromEntries(
    Object.entries(tierStats).map(([id, stats]) => [
      id,
      {
        exactMemberCoverage: stats.exactMemberCoverage,
        exactMemberCoveragePct: stats.exactMemberCoveragePct,
        additionalExpectedMemberCandidates: stats.additionalExpectedMemberCandidates,
        additionalWrongCandidates: stats.additionalWrongCandidates,
        candidateNoiseFields: stats.candidateNoiseFields,
        evidenceLossFields: stats.evidenceLossFields,
        byMember: stats.byMember,
        byStage: stats.byStage,
        stage3Member2Gain: stats.stage3Member2Gain,
      },
    ])
  );
}

function buildStabilityReport(rows, runs) {
  const report = {
    runs: runs.length,
    fieldsCompared: rows.length * stages.length * sides.length * memberLabels.length,
    stableRawEvidenceFields: 0,
    stableDiagnosticCandidates: 0,
    stableTierClassification: 0,
    stableTierCSimulationRows: 0,
    rawVariance: [],
    tokenVariance: [],
    tierCVariance: [],
  };
  const fieldRecord = (run, row, stage, side, label) =>
    run.tokenization.memberFieldRecords.find(
      (entry) => entry.image === row.filename && entry.stage === stage && entry.side === side && entry.label === label
    );
  for (const row of rows) {
    for (const stage of stages) {
      for (const side of sides) {
        for (const label of memberLabels) {
          const signatures = runs.map((run) => {
            const record = fieldRecord(run, row, stage, side, label);
            return {
              raw: record.profileRecords.map((profile) => ({ profileId: profile.profileId, text: profile.normalizedText })),
              tokens: record.diagnosticCandidatesByTier,
              exactTiers: record.exactTiers,
            };
          });
          const rawStable = signatures.every((entry) => stableJson(entry.raw) === stableJson(signatures[0].raw));
          const tokensStable = signatures.every((entry) => stableJson(entry.tokens) === stableJson(signatures[0].tokens));
          const tierStable = signatures.every((entry) => stableJson(entry.exactTiers) === stableJson(signatures[0].exactTiers));
          report.stableRawEvidenceFields += rawStable ? 1 : 0;
          report.stableDiagnosticCandidates += tokensStable ? 1 : 0;
          report.stableTierClassification += tierStable ? 1 : 0;
          if (!rawStable) report.rawVariance.push({ image: row.filename, stage, side, label, signatures: signatures.map((entry) => entry.raw) });
          if (!tokensStable) report.tokenVariance.push({ image: row.filename, stage, side, label, signatures: signatures.map((entry) => entry.tokens) });
        }
        for (const tierSet of tierSets) {
          const tierSignatures = runs.map((run) => {
            const records = run.tierExpansion.recordsByExpansion[tierSet.id] || [];
            const record = records.find((entry) => entry.image === row.filename && entry.stage === stage && entry.side === side);
            return record?.expandedTierC || {};
          });
          const stableTierC = tierSignatures.every((entry) => stableJson(entry) === stableJson(tierSignatures[0]));
          report.stableTierCSimulationRows += stableTierC ? 1 : 0;
          if (!stableTierC) report.tierCVariance.push({ image: row.filename, stage, side, expansion: tierSet.id, signatures: tierSignatures });
        }
      }
    }
  }
  return report;
}

async function writeCombinedArtifacts({ rows, runs }) {
  const stability = buildStabilityReport(rows, runs);
  const latest = runs.at(-1);
  const recommendation = recommendNextStep(latest.summary, stability);
  const combined = {
    schema: "ipad-member-tokenization-investigation-v1",
    command: "node scripts/ipad-member-tokenization-investigation.mjs",
    artifactDir: rel(artifactDir),
    runs: runs.length,
    latestRun: latest.summary,
    runSummaries: runs.map((run) => run.summary),
    stability: {
      runs: stability.runs,
      fieldsCompared: stability.fieldsCompared,
      stableRawEvidenceFields: stability.stableRawEvidenceFields,
      stableDiagnosticCandidates: stability.stableDiagnosticCandidates,
      stableTierClassification: stability.stableTierClassification,
      tierCVarianceRows: stability.tierCVariance.length,
      rawVarianceFields: stability.rawVariance.length,
      tokenVarianceFields: stability.tokenVariance.length,
    },
    recommendation,
  };
  await fs.writeFile(path.join(artifactDir, "raw-evidence.json"), JSON.stringify(latest.tokenization.rawEvidence, null, 2));
  await fs.writeFile(path.join(artifactDir, "tokenization-results.json"), JSON.stringify(latest.tokenization.tokenizationResults, null, 2));
  await fs.writeFile(path.join(artifactDir, "member2-failure-taxonomy.json"), JSON.stringify(latest.tokenization.member2Taxonomy, null, 2));
  await fs.writeFile(path.join(artifactDir, "stage3-member2-audit.json"), JSON.stringify(latest.tokenization.stage3Member2Audit, null, 2));
  await fs.writeFile(path.join(artifactDir, "tier-candidate-expansion.json"), JSON.stringify(latest.tierExpansion, null, 2));
  await fs.writeFile(path.join(artifactDir, "tier-c-simulation.json"), JSON.stringify(latest.tierExpansion.summary, null, 2));
  await fs.writeFile(path.join(artifactDir, "run-stability.json"), JSON.stringify(stability, null, 2));
  await fs.writeFile(path.join(artifactDir, "representative-cases.json"), JSON.stringify(selectRepresentativeCases(latest), null, 2));
  await fs.writeFile(path.join(artifactDir, "combined-summary.json"), JSON.stringify(combined, null, 2));
  return combined;
}

function recommendNextStep(summary, stability) {
  const expansions = summary.tierCExpansion;
  const candidates = Object.entries(expansions).filter(
    ([id, stats]) =>
      id !== "production" &&
      stats.tp >= 1 &&
      stats.fp === 0 &&
      stats.existingPassSidesLost === 0 &&
      stats.wrongUniqueProposalNoise === 0
  );
  const stableEnough = stability.tokenVariance.length === 0 && stability.tierCVariance.length === 0;
  if (!stableEnough) {
    return {
      code: "E",
      label: "OCR-engine/configuration experiment",
      reason: "Browser raw/token evidence is not stable enough across the two fresh contexts for parser production review.",
    };
  }
  const t1 = candidates.find(([id]) => id === "production+T1");
  if (t1 && t1[1].tp >= 1) {
    return { code: "A", label: "Production review for literal-token extraction", reason: "T1 exposes stable exact candidates with Tier C FP=0." };
  }
  const t2 = candidates.find(([id]) => id === "production+T2-only" || id === "production+T1+T2");
  if (t2 && t2[1].tp >= 1) {
    return {
      code: "B",
      label: "Production review for safe grouped-number parsing",
      reason:
        t2[0] === "production+T2-only"
          ? "T2-only exposes stable grouped-number candidates with Tier C FP=0 while avoiding T1's small-token FP."
          : "Grouped-number parsing exposes stable exact candidates with Tier C FP=0.",
    };
  }
  const t3 = candidates.find(([id]) => id === "production+T1+T2+T3");
  if (t3 && t3[1].tp >= 1) {
    return { code: "C", label: "Production review for independent OCR-word token extraction", reason: "T3 adds stable exact candidates with Tier C FP=0." };
  }
  return {
    code: "E",
    label: "OCR-engine/configuration experiment because raw digits are genuinely wrong/missing",
    reason: "Parser-token tiers do not create meaningful safe Tier C gains; Stage3 member2 remains dominated by missing/substituted/corrupted raw digits.",
  };
}

function selectRepresentativeCases(run) {
  const member2 = run.tokenization.member2Taxonomy.slice(0, 20);
  const stage3 = run.tokenization.stage3Member2Audit
    .filter((entry) => !entry.productionPresent)
    .slice(0, 20);
  const tierRows = Object.entries(run.tierExpansion.recordsByExpansion)
    .flatMap(([expansion, records]) =>
      records
        .filter((record) => record.expandedTierC?.wouldApply || record.tokenAddedFields?.length)
        .slice(0, 20)
        .map((record) => ({ expansion, ...record }))
    )
    .slice(0, 40);
  return { member2, stage3Member2: stage3, tierRows };
}

async function main() {
  const args = parseArgs();
  if (!args.resume) await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });
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
    const combined = await writeCombinedArtifacts({ rows, runs });
    await fs.writeFile(
      path.join(artifactDir, "dev-server.log.json"),
      JSON.stringify(server?.logs || [{ stream: "info", text: `used existing server ${baseUrl}` }], null, 2)
    );
    console.log(
      JSON.stringify(
        {
          command: "node scripts/ipad-member-tokenization-investigation.mjs",
          artifactDir: rel(artifactDir),
          production: combined.latestRun.production,
          member2Taxonomy: combined.latestRun.member2FailureTaxonomyCounts,
          stage3Member2: combined.latestRun.stage3Member2,
          tierCoverage: combined.latestRun.tierCandidateCoverage,
          tierCExpansion: combined.latestRun.tierCExpansion,
          stability: combined.stability,
          recommendation: combined.recommendation,
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
