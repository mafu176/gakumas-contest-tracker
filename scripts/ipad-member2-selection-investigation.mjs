import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const expectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const productionArtifactDir = path.join(rootDir, "tmp", "ipad-browser-production-verification");
const browserEvidenceDir = path.join(rootDir, "tmp", "ipad-bonus-t3-boundary-investigation");
const leverageDir = path.join(rootDir, "tmp", "ipad-global-leverage-review");
const outputDir = path.join(rootDir, "tmp", "ipad-member2-selection-investigation");

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const strategyNames = ["M1", "M2", "M3"];
const approvedMemberProfiles = new Set([
  "baseline-score-preprocess-3x-psm7",
  "invert-normalize-3x-psm7",
  "white-mask-3x-psm7",
  "ipad-grouped-number-token",
]);

function rel(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function pct(value, total) {
  return total ? Number(((value / total) * 100).toFixed(1)) : 0;
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function uniqueNumbers(values) {
  return [...new Set(values.filter((value) => Number.isFinite(value)))];
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

function selectedValue(side, field) {
  if (field.startsWith("member")) return side.members[Number(field.at(-1)) - 1] || 0;
  return side[field] || 0;
}

function candidateProfiles(candidate = {}) {
  return [...new Set([candidate.profileId, ...(candidate.profileIds || [])].filter(Boolean))];
}

function candidateValues(pool) {
  return (pool?.candidates || []).map((candidate, index) => ({
    index,
    value: toNumber(candidate.value),
    rawText: candidate.rawText || "",
    normalizedText: candidate.normalizedText || "",
    profileId: candidate.profileId || "",
    profileIds: candidateProfiles(candidate),
    sourceRank: candidate.sourceRank ?? null,
    ocrConfidence: candidate.confidenceSignals?.ocrConfidence ?? null,
    duplicateSupportCount:
      Number(candidate.confidenceSignals?.repeatedProfiles || 0) ||
      Number(candidate.confidenceSignals?.independentAgreement || 0) ||
      Number((candidate.contributions || []).length || 0),
    confidenceSignals: candidate.confidenceSignals || {},
    groupedNumberToken: Boolean(
      candidate.confidenceSignals?.groupedNumberToken || candidateProfiles(candidate).includes("ipad-grouped-number-token")
    ),
    plusLike: Boolean(candidate.confidenceSignals?.plusLike),
    contributions: (candidate.contributions || []).map((contribution) => ({
      profileId: contribution.profileId || "",
      sourceRank: contribution.sourceRank ?? null,
      candidateIndex: contribution.candidateIndex ?? null,
      rawCandidate: contribution.rawCandidate || "",
      normalizedText: contribution.normalizedText || "",
      ocrConfidence: contribution.ocrConfidence ?? null,
      plusLike: Boolean(contribution.plusLike),
    })),
  }));
}

function compactPool(pool) {
  const candidates = candidateValues(pool);
  return {
    key: pool?.key || "",
    fieldType: pool?.fieldType || "",
    slot: pool?.slot ?? null,
    candidateCount: candidates.length,
    rawDistinctCandidateCount: Number(pool?.rawDistinctCandidateCount || candidates.length),
    candidateCap: Number(pool?.candidateCap || 0),
    truncated: Boolean(pool?.truncated),
    candidates,
  };
}

function stageDataFromDiagnostics(diagnostics, stage, side) {
  return diagnostics?.stages?.[`stage${stage}`]?.[side] || null;
}

function poolForField(stageData, field) {
  return stageData?.candidatePools?.[field] || null;
}

function productionApplicationFor(diagnostics, stage, side) {
  return (diagnostics?.productionRecovery?.appliedCases || []).find(
    (entry) => Number(entry.stage) === stage && entry.side === side
  );
}

function hasObservedValue(pool, value, { allowDefaultZero = false } = {}) {
  if (allowDefaultZero && value === 0) return true;
  return candidateValues(pool).some((candidate) => candidate.value === value);
}

function selectedFieldHasStrongProvenance(stageData, selected, field) {
  const value = selectedValue(selected, field);
  const pool = poolForField(stageData, field);
  if (field === "bonus" && value === 0) return true;
  return hasObservedValue(pool, value);
}

function member2CandidateApproved(candidate) {
  return candidate.profileIds.some((profile) => approvedMemberProfiles.has(profile));
}

function sideKey(image, stage, side) {
  return `${image}|S${stage}|${side}`;
}

async function loadFixtures() {
  const manifest = await loadJson(path.join(expectedDir, "manifest.json"));
  const rows = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    rows.push({
      filename: entry.filename,
      cluster: entry.clusterId || "unknown",
      expected: await loadJson(path.join(expectedDir, entry.expectedFixture || entry.filename.replace(/\.png$/i, ".json"))),
    });
  }
  if (rows.length !== 18) throw new Error(`Expected 18 iPad fixtures, found ${rows.length}`);
  return rows;
}

async function loadProductionResults(runIndex) {
  const runDir = path.join(productionArtifactDir, `run-${runIndex}`);
  const results = new Map();
  const entries = await fs.readdir(runDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const result = await loadJson(path.join(runDir, entry.name, "production-result.json"));
      results.set(result.image, result);
    } catch {
      // Skip non-image directories.
    }
  }
  return results;
}

async function loadBrowserEvidence(runIndex) {
  const runDir = path.join(browserEvidenceDir, `run-${runIndex}`);
  const results = new Map();
  const entries = await fs.readdir(runDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const result = await loadJson(path.join(runDir, entry.name, "boundary-image.json"));
      results.set(result.image, result);
    } catch {
      // Skip non-image directories.
    }
  }
  return results;
}

function proposalForStrategy({ strategy, row, stageData }) {
  const member2Pool = compactPool(poolForField(stageData, "member2"));
  const current = row.actual;
  const matchingCandidates = candidateValues(poolForField(stageData, "member2")).filter(
    (candidate) =>
      candidate.value !== current.members[1] &&
      current.members[0] + candidate.value + current.members[2] + current.bonus === current.total
  );
  const matchingValues = uniqueNumbers(matchingCandidates.map((candidate) => candidate.value));
  const base = {
    strategy,
    wouldApply: false,
    blockReason: "",
    current,
    proposed: null,
    member2Pool,
    matchingCandidates,
    matchingValueCount: matchingValues.length,
    equation: "",
  };

  if (member2Pool.truncated || member2Pool.rawDistinctCandidateCount > member2Pool.candidateCount) {
    return { ...base, blockReason: "member2-pool-incomplete-or-truncated" };
  }
  if (matchingValues.length === 0) return { ...base, blockReason: "no-observed-member2-candidate-makes-equation" };
  if (matchingValues.length > 1) return { ...base, blockReason: "multiple-observed-member2-candidates-make-equation" };

  const selectedCandidate = matchingCandidates.find((candidate) => candidate.value === matchingValues[0]);
  if (strategy !== "M1" && !member2CandidateApproved(selectedCandidate)) {
    return { ...base, blockReason: "member2-candidate-provenance-not-approved" };
  }
  if (strategy === "M3") {
    const unchangedFields = ["member1", "member3", "bonus", "total"];
    const weak = unchangedFields.filter((field) => !selectedFieldHasStrongProvenance(stageData, current, field));
    if (weak.length) return { ...base, blockReason: `unchanged-field-lacks-strong-provenance:${weak.join(",")}` };
  }

  const proposed = normalizeSide(current);
  proposed.members[1] = matchingValues[0];
  const exact = proposed.members[0] + proposed.members[1] + proposed.members[2] + proposed.bonus === proposed.total;
  if (!exact) return { ...base, blockReason: "assertion-equation-not-exact" };

  return {
    ...base,
    wouldApply: true,
    blockReason: "",
    proposed,
    selectedCandidate,
    equation: `${proposed.members[0]} + ${proposed.members[1]} + ${proposed.members[2]} + ${proposed.bonus} = ${proposed.total}`,
  };
}

function classifySelectionFailure(row, stageData) {
  const expectedMember2 = row.expected.members[1];
  const pool = compactPool(poolForField(stageData, "member2"));
  const exact = pool.candidates.filter((candidate) => candidate.value === expectedMember2);
  if (!exact.length) return "not-selection-failure";
  if (pool.truncated || pool.rawDistinctCandidateCount > pool.candidateCount) return "G. candidate pool completeness/truncation";
  const currentCandidate = pool.candidates.find((candidate) => candidate.value === row.actual.members[1]);
  if (!currentCandidate) return "H. exact candidate present but not forwarded into the relevant selection layer";
  if (exact.some((candidate) => candidate.groupedNumberToken) && !currentCandidate.groupedNumberToken) {
    return "D. grouped-number candidate loses to plain candidate";
  }
  if ((currentCandidate.sourceRank ?? 99) < Math.min(...exact.map((candidate) => candidate.sourceRank ?? 99))) {
    return "A. current-primary profile preference";
  }
  if (pool.candidates.findIndex((candidate) => candidate.value === row.actual.members[1]) < exact[0].index) {
    return "B. candidate ordering";
  }
  if ((currentCandidate.duplicateSupportCount || 0) > Math.max(...exact.map((candidate) => candidate.duplicateSupportCount || 0))) {
    return "C. duplicate-support difference";
  }
  if ((currentCandidate.ocrConfidence || 0) > Math.max(...exact.map((candidate) => candidate.ocrConfidence || 0))) {
    return "E. candidate confidence difference";
  }
  if (!exact.some(member2CandidateApproved)) return "F. provenance eligibility issue";
  const candidateEquationValues = pool.candidates.filter(
    (candidate) => row.actual.members[0] + candidate.value + row.actual.members[2] + row.actual.bonus === row.actual.total
  );
  if (uniqueNumbers(candidateEquationValues.map((candidate) => candidate.value)).length > 1) {
    return "I. multiple plausible member2 candidates with no safe discriminator";
  }
  return "J. other";
}

function buildRows({ runIndex, fixtures, productionResults, browserEvidence }) {
  const sideRows = [];
  const member2CandidateAudit = [];
  const applications = [];

  for (const fixture of fixtures) {
    const production = productionResults.get(fixture.filename);
    const evidence = browserEvidence.get(fixture.filename);
    if (!production) throw new Error(`Missing production result for ${fixture.filename} run ${runIndex}`);
    if (!evidence) throw new Error(`Missing browser evidence for ${fixture.filename} run ${runIndex}`);
    const diagnostics = evidence.diagnostics || {};
    applications.push(...(production.applications || []).map((entry) => ({ ...entry, image: fixture.filename })));

    for (const stage of stages) {
      for (const side of sides) {
        const expected = expectedSide(fixture.expected[`stage${stage}`], side);
        const productionSide = (production.perSide || []).find((entry) => entry.stage === stage && entry.side === side);
        const comparison = compareSide(productionSide?.actual || {}, expected);
        const stageData = stageDataFromDiagnostics(diagnostics, stage, side);
        const app = productionApplicationFor(diagnostics, stage, side);
        const member2Pool = compactPool(poolForField(stageData, "member2"));
        const exactMember2Present = member2Pool.candidates.some((candidate) => candidate.value === expected.members[1]);
        const row = {
          image: fixture.filename,
          cluster: fixture.cluster,
          stage,
          side,
          key: sideKey(fixture.filename, stage, side),
          pass: comparison.pass,
          expected: comparison.expected,
          actual: comparison.actual,
          fieldPass: comparison.fields,
          exactMember2Present,
          member2CandidatePool: member2Pool,
          productionRecovery: app
            ? {
                recoveryId: app.recoveryId,
                changedFields: app.changedFields || [],
                oldValues: app.oldValues,
                newValues: app.newValues,
              }
            : null,
          tierCBlockReason: stageData?.blockReason || stageData?.tierC?.blockReason || "",
          strictTotalBlockReason:
            (diagnostics?.strictTotalProductionRecovery?.rejectedCases || []).find(
              (entry) => Number(entry.stage) === stage && entry.side === side
            )?.reason || "",
        };
        row.selectionFailureCategory =
          !comparison.fields.member2 && exactMember2Present ? classifySelectionFailure(row, stageData) : "";
        row.strategies = Object.fromEntries(
          strategyNames.map((strategy) => [strategy, proposalForStrategy({ strategy, row, stageData })])
        );
        sideRows.push(row);
        for (const candidate of member2Pool.candidates) {
          member2CandidateAudit.push({
            image: fixture.filename,
            cluster: fixture.cluster,
            stage,
            side,
            currentSelectedMember2: comparison.actual.members[1],
            expectedMember2: comparison.expected.members[1],
            currentPrimary: candidate.value === comparison.actual.members[1],
            exactExpectedCandidate: candidate.value === comparison.expected.members[1],
            candidateOrdering: candidate.index + 1,
            completeness: {
              truncated: member2Pool.truncated,
              rawDistinctCandidateCount: member2Pool.rawDistinctCandidateCount,
              candidateCount: member2Pool.candidateCount,
            },
            ...candidate,
          });
        }
      }
    }
  }
  return { runIndex, sideRows, member2CandidateAudit, applications };
}

function applyProposal(row, strategy) {
  const proposal = row.strategies[strategy];
  if (!proposal?.wouldApply) return { ...row.actual };
  return proposal.proposed;
}

function aggregateMetrics(rows, strategy = null) {
  const effective = rows.map((row) => {
    const actual = strategy ? applyProposal(row, strategy) : row.actual;
    const comparison = compareSide(actual, row.expected);
    return { ...row, effectivePass: comparison.pass, effectiveFields: comparison.fields, effectiveActual: actual };
  });
  const stageSidePass = effective.filter((row) => row.effectivePass).length;
  const stageKeys = [...new Set(effective.map((row) => `${row.image}|${row.stage}`))];
  const imageKeys = [...new Set(effective.map((row) => row.image))];
  return {
    imagePass: imageKeys.filter((image) => effective.filter((row) => row.image === image).every((row) => row.effectivePass)).length,
    stagePass: stageKeys.filter((key) =>
      effective.filter((row) => `${row.image}|${row.stage}` === key).every((row) => row.effectivePass)
    ).length,
    stageSidePass,
    member2Exact: effective.filter((row) => row.effectiveFields.member2).length,
  };
}

function scoreStrategy(rows, strategy) {
  const before = aggregateMetrics(rows);
  const after = aggregateMetrics(rows, strategy);
  const proposals = rows.filter((row) => row.strategies[strategy]?.wouldApply);
  const proposalAudits = proposals.map((row) => {
    const beforePass = compareSide(row.actual, row.expected).pass;
    const afterComparison = compareSide(row.strategies[strategy].proposed, row.expected);
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      currentTuple: row.actual,
      expectedTuple: row.expected,
      proposedMember2: row.strategies[strategy].proposed.members[1],
      proposedTuple: row.strategies[strategy].proposed,
      candidatePool: row.member2CandidatePool,
      matchingMember2Candidates: row.strategies[strategy].matchingCandidates,
      arithmeticEquation: row.strategies[strategy].equation,
      validMatchingCount: row.strategies[strategy].matchingValueCount,
      beforePass,
      afterPass: afterComparison.pass,
      result: !beforePass && afterComparison.pass ? "TP" : beforePass && !afterComparison.pass ? "existing-pass-loss" : "changed-nonpass",
      productionRecovery: row.productionRecovery,
      selectionFailureCategory: row.selectionFailureCategory,
    };
  });
  return {
    strategy,
    eligibleSides: rows.filter((row) => row.strategies[strategy]?.blockReason !== "member2-candidate-provenance-not-approved").length,
    wouldApply: proposals.length,
    changedProposals: proposals.length,
    tp: proposalAudits.filter((entry) => entry.result === "TP").length,
    fp: proposalAudits.filter((entry) => entry.result !== "TP").length,
    additionalStageSidePass: after.stageSidePass - before.stageSidePass,
    existingPassLoss: proposalAudits.filter((entry) => entry.result === "existing-pass-loss").length,
    changedCorrectFields: proposalAudits.filter((entry) => entry.beforePass).length,
    changedIncorrectFields: proposalAudits.filter((entry) => !entry.beforePass).length,
    multipleMatchBlocks: rows.filter(
      (row) => row.strategies[strategy]?.blockReason === "multiple-observed-member2-candidates-make-equation"
    ).length,
    incompleteTruncatedBlocks: rows.filter(
      (row) => row.strategies[strategy]?.blockReason === "member2-pool-incomplete-or-truncated"
    ).length,
    before,
    after,
    proposals: proposalAudits,
  };
}

function oneFieldAwayRows(rows) {
  return rows.filter(
    (row) =>
      !row.pass &&
      row.fieldPass.member1 &&
      !row.fieldPass.member2 &&
      row.fieldPass.member3 &&
      row.fieldPass.bonus &&
      row.fieldPass.total &&
      row.exactMember2Present
  );
}

function negativeControls(rows) {
  return {
    multipleMatchingCandidates: rows.filter((row) =>
      strategyNames.some((strategy) => row.strategies[strategy]?.blockReason === "multiple-observed-member2-candidates-make-equation")
    ),
    truncatedMember2Pools: rows.filter((row) => row.member2CandidatePool.truncated),
    currentMember2AlreadyCorrectWouldApply: rows.filter(
      (row) => row.fieldPass.member2 && strategyNames.some((strategy) => row.strategies[strategy]?.wouldApply)
    ),
    totalWrongBlocks: rows.filter(
      (row) => !row.fieldPass.total && strategyNames.every((strategy) => !row.strategies[strategy]?.wouldApply)
    ),
    bonusWrongBlocks: rows.filter(
      (row) => !row.fieldPass.bonus && strategyNames.every((strategy) => !row.strategies[strategy]?.wouldApply)
    ),
  };
}

function failureTaxonomy(rows) {
  const counts = {};
  for (const row of rows) {
    if (!row.selectionFailureCategory) continue;
    counts[row.selectionFailureCategory] = (counts[row.selectionFailureCategory] || 0) + 1;
  }
  return counts;
}

function overlapAnalysis(rows, strategy) {
  const proposals = rows.filter((row) => row.strategies[strategy]?.wouldApply);
  return {
    proposedRows: proposals.length,
    overlapsTierC: proposals.filter((row) => row.productionRecovery?.recoveryId === "ipad-tier-c-exactly-one-arithmetic").length,
    overlapsStrictTotal: proposals.filter((row) => row.productionRecovery?.recoveryId === "ipad-strict-total-selection").length,
    usesT2GroupedNumberCandidate: proposals.filter((row) => row.strategies[strategy].selectedCandidate?.groupedNumberToken).length,
    rows: proposals.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      productionRecovery: row.productionRecovery?.recoveryId || "",
      selectedCandidateProfiles: row.strategies[strategy].selectedCandidate?.profileIds || [],
      groupedNumberToken: Boolean(row.strategies[strategy].selectedCandidate?.groupedNumberToken),
    })),
  };
}

function stability(first, second) {
  const proposalSignature = (rows, strategy) =>
    rows
      .filter((row) => row.strategies[strategy]?.wouldApply)
      .map((row) => ({
        key: row.key,
        value: row.strategies[strategy].proposed.members[1],
        count: row.strategies[strategy].matchingValueCount,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  const candidateSignature = (rows) =>
    rows
      .map((row) => ({
        key: row.key,
        values: row.member2CandidatePool.candidates.map((candidate) => candidate.value),
        truncated: row.member2CandidatePool.truncated,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  return {
    comparedRuns: 2,
    member2CandidatePoolsStable: JSON.stringify(candidateSignature(first.sideRows)) === JSON.stringify(candidateSignature(second.sideRows)),
    strategyStability: Object.fromEntries(
      strategyNames.map((strategy) => [
        strategy,
        JSON.stringify(proposalSignature(first.sideRows, strategy)) === JSON.stringify(proposalSignature(second.sideRows, strategy)),
      ])
    ),
  };
}

function recommendation(strategyResults, stabilityResult) {
  const safe = strategyResults
    .filter(
      (result) =>
        result.tp >= 2 &&
        result.fp === 0 &&
        result.existingPassLoss === 0 &&
        stabilityResult.strategyStability[result.strategy] &&
        result.proposals.every((proposal) => !proposal.candidatePool.truncated)
    )
    .sort((a, b) => {
      if (b.tp !== a.tp) return b.tp - a.tp;
      return strategyNames.indexOf(b.strategy) - strategyNames.indexOf(a.strategy);
    });
  if (!safe.length) {
    return {
      parityJustified: false,
      selectedStrategy: "",
      recommendedNextStep: "Return to the global leverage ranking; no strict member2 strategy met the production-readiness threshold.",
    };
  }
  const preferred = safe.find((result) => result.strategy === "M3") || safe.at(-1);
  return {
    parityJustified: true,
    selectedStrategy: preferred.strategy,
    recommendedNextStep:
      "Extract the selected strict member2 strategy into shared runner/browser-equivalent parity plumbing before any production change.",
  };
}

async function main() {
  const fixtures = await loadFixtures();
  const runs = [];
  for (const runIndex of [1, 2]) {
    const productionResults = await loadProductionResults(runIndex);
    const browserEvidence = await loadBrowserEvidence(runIndex);
    runs.push(buildRows({ runIndex, fixtures, productionResults, browserEvidence }));
  }

  const run = runs[0];
  const productionSummary = await loadJson(path.join(productionArtifactDir, "combined-summary.json"));
  const leverageSummary = await loadJson(path.join(leverageDir, "summary.json"));
  const strategyResults = strategyNames.map((strategy) => scoreStrategy(run.sideRows, strategy));
  const stabilityResult = stability(runs[0], runs[1]);
  const bestRecommendation = recommendation(strategyResults, stabilityResult);
  const oneField = oneFieldAwayRows(run.sideRows);
  const taxonomy = failureTaxonomy(run.sideRows);
  const bestStrategy = bestRecommendation.selectedStrategy || strategyResults.find((entry) => entry.tp > 0)?.strategy || "M3";
  const overlap = overlapAnalysis(run.sideRows, bestStrategy);

  const oneFieldAwayAudit = oneField.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    currentTuple: row.actual,
    expectedTuple: row.expected,
    exactCandidateProvenance: row.member2CandidatePool.candidates
      .filter((candidate) => candidate.value === row.expected.members[1])
      .map((candidate) => ({
        value: candidate.value,
        ordering: candidate.index + 1,
        profileIds: candidate.profileIds,
        rawText: candidate.rawText,
        ocrConfidence: candidate.ocrConfidence,
        duplicateSupportCount: candidate.duplicateSupportCount,
      })),
    productionDidNotChooseBecause: row.selectionFailureCategory,
    M1: {
      wouldApply: row.strategies.M1.wouldApply,
      blockReason: row.strategies.M1.blockReason,
      sideBecomesPass: row.strategies.M1.wouldApply ? compareSide(row.strategies.M1.proposed, row.expected).pass : false,
    },
    M2: {
      wouldApply: row.strategies.M2.wouldApply,
      blockReason: row.strategies.M2.blockReason,
      sideBecomesPass: row.strategies.M2.wouldApply ? compareSide(row.strategies.M2.proposed, row.expected).pass : false,
    },
    M3: {
      wouldApply: row.strategies.M3.wouldApply,
      blockReason: row.strategies.M3.blockReason,
      sideBecomesPass: row.strategies.M3.wouldApply ? compareSide(row.strategies.M3.proposed, row.expected).pass : false,
    },
  }));

  const outputs = {
    "production-baseline.json": {
      source: rel(path.join(productionArtifactDir, "combined-summary.json")),
      expected: productionSummary.expected,
      pass: productionSummary.pass,
      runSummaries: productionSummary.runs?.map((entry) => ({
        runIndex: entry.runIndex,
        imagesProcessed: entry.imagesProcessed,
        productionApplications: entry.productionApplications,
        tp: entry.tp,
        fp: entry.fp,
        stageSidePass: entry.stageSidePass,
        stagePass: entry.stagePass,
      })),
    },
    "member2-candidate-audit.json": run.member2CandidateAudit,
    "selection-failure-taxonomy.json": taxonomy,
    "strategy-results.json": strategyResults.map(({ proposals, ...rest }) => rest),
    "one-field-away-8.json": {
      count: oneField.length,
      rows: oneFieldAwayAudit,
    },
    "negative-controls.json": negativeControls(run.sideRows),
    "would-apply-proposals.json": Object.fromEntries(strategyResults.map((result) => [result.strategy, result.proposals])),
    "run-stability.json": stabilityResult,
    "overlap-analysis.json": overlap,
    "recommendation.json": {
      ...bestRecommendation,
      leverageReviewRecommendation: leverageSummary.recommendation,
      simulatedMetrics:
        bestRecommendation.selectedStrategy && strategyResults.find((entry) => entry.strategy === bestRecommendation.selectedStrategy)
          ? strategyResults.find((entry) => entry.strategy === bestRecommendation.selectedStrategy)
          : null,
    },
    "summary.json": {
      artifactDir: rel(outputDir),
      productionBaseline: {
        imagePass: 0,
        stagePass: 10,
        stageSidePass: 44,
        productionApplications: 28,
        tp: 28,
        fp: 0,
      },
      oneFieldAwayMember2Count: oneField.length,
      selectionFailureTaxonomy: taxonomy,
      strategies: Object.fromEntries(
        strategyResults.map((result) => [
          result.strategy,
          {
            wouldApply: result.wouldApply,
            tp: result.tp,
            fp: result.fp,
            additionalStageSidePass: result.additionalStageSidePass,
            existingPassLoss: result.existingPassLoss,
            after: result.after,
          },
        ])
      ),
      overlap,
      stability: stabilityResult,
      recommendation: bestRecommendation,
    },
  };

  await fs.rm(outputDir, { recursive: true, force: true });
  for (const [filename, value] of Object.entries(outputs)) {
    await writeJson(path.join(outputDir, filename), value);
  }

  console.log(JSON.stringify(outputs["summary.json"], null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
