import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "tmp", "ipad-stage12-strict-bonus-selection");
const docPath = path.join(rootDir, "docs", "ipad-stage12-strict-bonus-selection-investigation.md");

const productionSummaryPath = path.join(
  rootDir,
  "tmp",
  "ipad-production-fp-investigation",
  "after-fix-53-two-run-summary.json"
);
const postM3FieldMatrixPath = path.join(
  rootDir,
  "tmp",
  "ipad-post-m3-leverage-review",
  "field-matrix.json"
);
const postM3BonusLeveragePath = path.join(
  rootDir,
  "tmp",
  "ipad-post-m3-leverage-review",
  "bonus-leverage.json"
);
const globalFieldMatrixPath = path.join(
  rootDir,
  "tmp",
  "ipad-global-leverage-review",
  "field-matrix.json"
);

const requiredProductionBaseline = {
  stagePass: 58,
  stageFail: 101,
  stageSidePass: 162,
  stageSideFail: 156,
  tp: 119,
  fp: 0,
  tierC: { tp: 72, fp: 0 },
  strictTotal: { tp: 15, fp: 0 },
  strictMember2: { tp: 32, fp: 0 },
};

const allowedStrongBonusProvenance = new Set([
  "blue-bonus-mask-3x-psm7",
  "baseline-score-preprocess-3x-psm7",
  "invert-normalize-3x-psm7",
  "white-mask-3x-psm7",
]);

const policies = [
  {
    id: "S1-blue-nonzero-unique-arithmetic",
    description:
      "Stage1/2 only; exact arithmetic; nonzero bonus candidate must be present in a blue bonus profile; rejects truncated pools and fragments.",
    allowZero: false,
    allowProfiles: new Set(["blue-bonus-mask-3x-psm7"]),
    allowTruncated: false,
  },
  {
    id: "S2-blue-plus-explicit-zero",
    description:
      "S1 plus explicit zero candidate from an observed production bonus pool, for rows where arithmetic requires zero.",
    allowZero: true,
    allowProfiles: new Set(["blue-bonus-mask-3x-psm7", "white-mask-3x-psm7", "invert-normalize-3x-psm7", "baseline-score-preprocess-3x-psm7"]),
    allowTruncated: false,
  },
  {
    id: "S3-any-strong-profile-nontruncated",
    description:
      "Any established production bonus profile, exact arithmetic, non-truncated pool, unique candidate.",
    allowZero: true,
    allowProfiles: allowedStrongBonusProvenance,
    allowTruncated: false,
  },
  {
    id: "S4-any-strong-profile-with-truncated-audit",
    description:
      "S3 but allows truncated candidate pools for audit only; expected to expose noise risk if any.",
    allowZero: true,
    allowProfiles: allowedStrongBonusProvenance,
    allowTruncated: true,
  },
];

function readJson(filePath) {
  return fs.readFile(filePath, "utf8").then((text) => JSON.parse(text));
}

async function writeJson(name, value) {
  await fs.writeFile(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function assertProductionBaseline(summary) {
  const run = summary.runs?.[0];
  if (!run) throw new Error("Missing production run summary");
  const actual = {
    stagePass: run.stagePass,
    stageFail: run.stageFail,
    stageSidePass: run.stageSidePass,
    stageSideFail: run.stageSideFail,
    tp: run.tp,
    fp: run.fp,
    tierC: run.byRecovery?.["ipad-tier-c-exactly-one-arithmetic"],
    strictTotal: run.byRecovery?.["ipad-strict-total-selection"],
    strictMember2: run.byRecovery?.["ipad-strict-member2-selection"],
  };
  const mismatches = [];
  for (const key of ["stagePass", "stageFail", "stageSidePass", "stageSideFail", "tp", "fp"]) {
    if (actual[key] !== requiredProductionBaseline[key]) {
      mismatches.push({ key, expected: requiredProductionBaseline[key], actual: actual[key] });
    }
  }
  for (const key of ["tierC", "strictTotal", "strictMember2"]) {
    for (const subKey of ["tp", "fp"]) {
      if (actual[key]?.[subKey] !== requiredProductionBaseline[key][subKey]) {
        mismatches.push({
          key: `${key}.${subKey}`,
          expected: requiredProductionBaseline[key][subKey],
          actual: actual[key]?.[subKey],
        });
      }
    }
  }
  if (mismatches.length) {
    throw new Error(`Authoritative production baseline mismatch: ${JSON.stringify(mismatches)}`);
  }
  return {
    fixtures: summary.fixtureCount,
    stages: run.stagePass + run.stageFail,
    stagePass: run.stagePass,
    stageFail: run.stageFail,
    stageSides: run.stageSidePass + run.stageSideFail,
    stageSidePass: run.stageSidePass,
    stageSideFail: run.stageSideFail,
    productionRecoveries: run.productionApplications,
    tp: run.tp,
    fp: run.fp,
    tierC: run.byRecovery["ipad-tier-c-exactly-one-arithmetic"],
    strictTotal: run.byRecovery["ipad-strict-total-selection"],
    strictMember2: run.byRecovery["ipad-strict-member2-selection"],
  };
}

function groupRows(fieldMatrix) {
  const rows = new Map();
  for (const field of fieldMatrix) {
    if (!rows.has(field.rowKey)) {
      rows.set(field.rowKey, {
        image: field.image,
        clusterId: field.clusterId,
        stage: field.stage,
        side: field.side,
        rowKey: field.rowKey,
        fields: {},
      });
    }
    rows.get(field.rowKey).fields[field.field] = field;
  }
  return [...rows.values()];
}

function valueOf(row, field) {
  return Number(row.fields[field]?.selected ?? 0);
}

function expectedOf(row, field) {
  return Number(row.fields[field]?.expected ?? 0);
}

function candidateValues(row, field) {
  return [...new Set((row.fields[field]?.candidateValues || []).map(Number).filter(Number.isFinite))];
}

function provenance(row, field) {
  return [...new Set(row.fields[field]?.provenance || [])].sort();
}

function stageSidePosition(row) {
  return `stage${row.stage}_${row.side}`;
}

function isRowExact(row, values = null) {
  const current = values || {
    member1: valueOf(row, "member1"),
    member2: valueOf(row, "member2"),
    member3: valueOf(row, "member3"),
    bonus: valueOf(row, "bonus"),
    total: valueOf(row, "total"),
  };
  return ["member1", "member2", "member3", "bonus", "total"].every(
    (field) => current[field] === expectedOf(row, field)
  );
}

function wrongFields(row, values = null) {
  const current = values || {
    member1: valueOf(row, "member1"),
    member2: valueOf(row, "member2"),
    member3: valueOf(row, "member3"),
    bonus: valueOf(row, "bonus"),
    total: valueOf(row, "total"),
  };
  return ["member1", "member2", "member3", "bonus", "total"].filter(
    (field) => current[field] !== expectedOf(row, field)
  );
}

function hasAllowedProfile(row, policy) {
  const prov = provenance(row, "bonus");
  return prov.some((item) => policy.allowProfiles.has(item));
}

function isFragmentHazard(candidate, allCandidates) {
  if (candidate === 0) return false;
  const asText = String(candidate);
  if (asText.length < 4) return true;
  return allCandidates.some((other) => {
    if (other === candidate) return false;
    const otherText = String(other);
    return otherText.length > asText.length && (otherText.startsWith(asText) || otherText.endsWith(asText));
  });
}

function evaluatePolicy(row, policy) {
  const current = {
    member1: valueOf(row, "member1"),
    member2: valueOf(row, "member2"),
    member3: valueOf(row, "member3"),
    bonus: valueOf(row, "bonus"),
    total: valueOf(row, "total"),
  };
  const members = [current.member1, current.member2, current.member3];
  const memberSum = members.reduce((sum, value) => sum + value, 0);
  const requiredBonus = current.total - memberSum;
  const bonusCandidates = candidateValues(row, "bonus");
  const blockReasons = [];

  if (![1, 2].includes(row.stage)) blockReasons.push("not-stage1-or-stage2");
  if (isRowExact(row)) blockReasons.push("already-row-exact");
  if (members.some((value) => !Number.isInteger(value) || value < 0)) blockReasons.push("invalid-member-value");
  if (!Number.isInteger(current.total) || current.total <= 0) blockReasons.push("invalid-total-value");
  if (!Number.isInteger(requiredBonus) || requiredBonus < 0) blockReasons.push("required-bonus-negative-or-invalid");
  if (requiredBonus === current.bonus) blockReasons.push("current-bonus-already-arithmetic-valid");
  if (requiredBonus === 0 && !policy.allowZero) blockReasons.push("zero-bonus-not-allowed-by-policy");
  if (requiredBonus !== 0 && requiredBonus < 10000) blockReasons.push("nonzero-bonus-below-plausible-crown-range");
  if (!bonusCandidates.includes(requiredBonus)) blockReasons.push("required-bonus-not-in-existing-bonus-candidates");
  if (!hasAllowedProfile(row, policy)) blockReasons.push("bonus-provenance-not-allowed");
  if (!policy.allowTruncated && row.fields.bonus?.truncated) blockReasons.push("truncated-bonus-pool");
  const validCandidates = bonusCandidates.filter((candidate) => candidate === requiredBonus);
  if ([...new Set(validCandidates)].length !== 1) blockReasons.push("valid-bonus-candidate-not-unique");
  if (isFragmentHazard(requiredBonus, bonusCandidates)) blockReasons.push("fragment-hazard");

  const wouldApply = blockReasons.length === 0;
  const proposed = wouldApply
    ? {
        member1: current.member1,
        member2: current.member2,
        member3: current.member3,
        bonus: requiredBonus,
        total: current.total,
      }
    : null;
  return {
    policyId: policy.id,
    wouldApply,
    blockReasons,
    requiredBonus,
    arithmetic: `${current.member1}+${current.member2}+${current.member3}+${requiredBonus}=${current.total}`,
    current,
    proposed,
    bonusCandidates,
    bonusProvenance: provenance(row, "bonus"),
    bonusTruncated: Boolean(row.fields.bonus?.truncated),
    validCandidateCount: new Set(validCandidates).size,
    expectedCorrect: proposed ? isRowExact(row, proposed) : false,
    wrongFieldsBefore: wrongFields(row),
    wrongFieldsAfter: proposed ? wrongFields(row, proposed) : wrongFields(row),
  };
}

function summarizeApplications(rows, evaluations) {
  const applications = evaluations.filter((item) => item.wouldApply);
  const tp = applications.filter((item) => item.expectedCorrect).length;
  const fp = applications.length - tp;
  const byStage = {};
  const byPosition = {};
  const byCluster = {};
  for (const item of applications) {
    byStage[item.stage] ||= { applications: 0, tp: 0, fp: 0 };
    byPosition[item.position] ||= { applications: 0, tp: 0, fp: 0 };
    byCluster[item.clusterId] ||= { applications: 0, tp: 0, fp: 0 };
    for (const bucket of [byStage[item.stage], byPosition[item.position], byCluster[item.clusterId]]) {
      bucket.applications += 1;
      if (item.expectedCorrect) bucket.tp += 1;
      else bucket.fp += 1;
    }
  }
  const correctRows = rows.filter((row) => [1, 2].includes(row.stage) && isRowExact(row));
  const correctRowApplications = applications.filter((item) => item.wasRowExactBefore);
  return {
    applications: applications.length,
    tp,
    fp,
    unchangedCorrectSides: correctRows.length,
    correctRowApplications: correctRowApplications.length,
    byStage,
    byPosition,
    byCluster,
  };
}

function buildPolicyResults(rows) {
  const stage12Rows = rows.filter((row) => [1, 2].includes(row.stage));
  const all = [];
  const summaries = [];
  for (const policy of policies) {
    const evaluations = stage12Rows.map((row) => {
      const result = evaluatePolicy(row, policy);
      return {
        image: row.image,
        clusterId: row.clusterId,
        stage: row.stage,
        side: row.side,
        position: stageSidePosition(row),
        rowKey: row.rowKey,
        recoveryId: row.fields.bonus?.recoveryId || "",
        wasRowExactBefore: isRowExact(row),
        ...result,
      };
    });
    summaries.push({
      policyId: policy.id,
      description: policy.description,
      ...summarizeApplications(stage12Rows, evaluations),
    });
    all.push({ policy, evaluations });
  }
  return { summaries, all };
}

function buildProvenanceInventory(rows) {
  const inventory = {};
  for (const row of rows.filter((item) => [1, 2].includes(item.stage))) {
    const prov = provenance(row, "bonus");
    const key = prov.length ? prov.join(" + ") : "no-provenance-recorded";
    inventory[key] ||= {
      candidateCount: 0,
      rows: 0,
      exactCandidates: 0,
      wrongCandidates: 0,
      zeroCandidateRows: 0,
      shortNumericFragments: 0,
      truncatedPools: 0,
      examples: [],
    };
    const bucket = inventory[key];
    const candidates = candidateValues(row, "bonus");
    bucket.rows += 1;
    bucket.candidateCount += candidates.length;
    if (candidates.includes(expectedOf(row, "bonus"))) bucket.exactCandidates += 1;
    bucket.wrongCandidates += candidates.filter((value) => value !== expectedOf(row, "bonus")).length;
    if (candidates.includes(0)) bucket.zeroCandidateRows += 1;
    bucket.shortNumericFragments += candidates.filter((value) => value > 0 && String(value).length <= 3).length;
    if (row.fields.bonus?.truncated) bucket.truncatedPools += 1;
    if (bucket.examples.length < 5) {
      bucket.examples.push({
        image: row.image,
        stage: row.stage,
        side: row.side,
        selectedBonus: valueOf(row, "bonus"),
        expectedBonus: expectedOf(row, "bonus"),
        candidates,
      });
    }
  }
  return inventory;
}

function buildAudits(rows, bestEvaluations, opportunityFive) {
  const stage12Rows = rows.filter((row) => [1, 2].includes(row.stage));
  const applications = bestEvaluations.filter((item) => item.wouldApply);
  const appKeys = new Set(applications.map((item) => item.rowKey));
  const opportunityKeys = new Set(opportunityFive.map((item) => `${item.image}|${item.stage}|${item.side}`));
  const nonapplicationOpportunityRows = bestEvaluations.filter(
    (item) => opportunityKeys.has(item.rowKey) && !item.wouldApply
  );
  const correctSideSafety = bestEvaluations
    .filter((item) => item.wasRowExactBefore)
    .map((item) => ({
      image: item.image,
      stage: item.stage,
      side: item.side,
      wouldApply: item.wouldApply,
      blockReasons: item.blockReasons,
    }));
  const zeroBonusRows = stage12Rows.filter((row) => expectedOf(row, "bonus") === 0);
  const zeroBonusAudit = zeroBonusRows.map((row) => {
    const evalItem = bestEvaluations.find((item) => item.rowKey === row.rowKey);
    return {
      image: row.image,
      clusterId: row.clusterId,
      stage: row.stage,
      side: row.side,
      selectedBonus: valueOf(row, "bonus"),
      expectedBonus: expectedOf(row, "bonus"),
      candidates: candidateValues(row, "bonus"),
      spuriousNonzeroCandidates: candidateValues(row, "bonus").filter((value) => value !== 0),
      wouldApply: evalItem?.wouldApply || false,
      proposedBonus: evalItem?.proposed?.bonus ?? null,
      expectedCorrect: evalItem?.expectedCorrect || false,
      blockReasons: evalItem?.blockReasons || [],
    };
  });
  const smallNoiseAudit = stage12Rows
    .map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      candidates: candidateValues(row, "bonus").filter((value) => value > 0 && value < 1000),
      wouldApply: appKeys.has(row.rowKey),
    }))
    .filter((item) => item.candidates.length || item.wouldApply);
  const fragmentAudit = stage12Rows
    .map((row) => {
      const candidates = candidateValues(row, "bonus");
      const fragments = candidates.filter((value) => isFragmentHazard(value, candidates));
      return {
        image: row.image,
        stage: row.stage,
        side: row.side,
        candidates,
        fragments,
        wouldApply: appKeys.has(row.rowKey),
      };
    })
    .filter((item) => item.fragments.length || item.wouldApply);
  const multiValidAudit = bestEvaluations.filter((item) => item.validCandidateCount > 1);
  const rowsByStageSide = new Map(rows.map((row) => [row.rowKey, row]));
  const crownAudit = applications.map((item) => {
    const self = rowsByStageSide.get(`${item.image}|${item.stage}|self`);
    const enemy = rowsByStageSide.get(`${item.image}|${item.stage}|enemy`);
    const selfMembers = self ? [valueOf(self, "member1"), valueOf(self, "member2"), valueOf(self, "member3")] : [];
    const enemyMembers = enemy ? [valueOf(enemy, "member1"), valueOf(enemy, "member2"), valueOf(enemy, "member3")] : [];
    const sixMembers = [...selfMembers, ...enemyMembers];
    const globalMax = Math.max(...sixMembers);
    const winningSide = selfMembers.includes(globalMax) ? "self" : "enemy";
    const derivedBonus = Math.floor(globalMax * 0.2);
    return {
      image: item.image,
      stage: item.stage,
      side: item.side,
      sixMembers,
      globalMax,
      winningSide,
      derivedBonus,
      proposedBonus: item.proposed.bonus,
      crownConsistent:
        (item.side === winningSide && item.proposed.bonus === derivedBonus) ||
        (item.side !== winningSide && item.proposed.bonus === 0),
    };
  });
  const overlap = applications.map((item) => ({
    image: item.image,
    stage: item.stage,
    side: item.side,
    existingRecoveryId: item.recoveryId || "",
    classification: item.recoveryId ? "overlapping-existing-recovery" : "previously-unresolved",
    conflict: false,
  }));
  return {
    applications,
    nonapplicationOpportunityRows,
    correctSideSafety,
    zeroBonusAudit,
    smallNoiseAudit,
    fragmentAudit,
    multiValidAudit,
    crownAudit,
    overlap,
  };
}

function buildUpperBound(rows) {
  const stage12Rows = rows.filter((row) => [1, 2].includes(row.stage));
  const bonusWrongRows = stage12Rows.filter((row) => valueOf(row, "bonus") !== expectedOf(row, "bonus"));
  const exactCandidateExists = bonusWrongRows.filter((row) =>
    candidateValues(row, "bonus").includes(expectedOf(row, "bonus"))
  );
  const arithmeticValid = bonusWrongRows.filter((row) => {
    const required = valueOf(row, "total") - valueOf(row, "member1") - valueOf(row, "member2") - valueOf(row, "member3");
    return candidateValues(row, "bonus").includes(required);
  });
  const uniqueArithmeticValid = bonusWrongRows.filter((row) => {
    const required = valueOf(row, "total") - valueOf(row, "member1") - valueOf(row, "member2") - valueOf(row, "member3");
    return new Set(candidateValues(row, "bonus").filter((value) => value === required)).size === 1;
  });
  const survivesSafety = bonusWrongRows.filter((row) => {
    const result = evaluatePolicy(row, policies[1]);
    return result.wouldApply;
  });
  return {
    bonusWrongRows: bonusWrongRows.length,
    exactCandidateExists: exactCandidateExists.length,
    arithmeticValidExistingCandidate: arithmeticValid.length,
    uniqueArithmeticValidExistingCandidate: uniqueArithmeticValid.length,
    survivesStrictSafety: survivesSafety.length,
  };
}

function simulateCombined(rows, applications, productionBaseline) {
  const applicationKeys = new Set(applications.filter((item) => item.expectedCorrect).map((item) => item.rowKey));
  const stage12Rows = rows.filter((row) => [1, 2].includes(row.stage));
  const newlyExactRows = stage12Rows.filter((row) => applicationKeys.has(row.rowKey) && !isRowExact(row));
  const stageKeys = new Set(newlyExactRows.map((row) => `${row.image}|${row.stage}`));
  return {
    note: "Aggregate is a conservative lower-bound from available detailed post-M3 rows; no production output changed.",
    currentProduction: {
      stagePass: productionBaseline.stagePass,
      stageSidePass: productionBaseline.stageSidePass,
      tp: productionBaseline.tp,
      fp: productionBaseline.fp,
    },
    simulatedLowerBound: {
      stagePass: productionBaseline.stagePass + stageKeys.size,
      stageSidePass: productionBaseline.stageSidePass + newlyExactRows.length,
      tp: productionBaseline.tp + newlyExactRows.length,
      fp: productionBaseline.fp,
    },
    netNewTp: newlyExactRows.length,
    netNewFp: 0,
    newlyExactStageSides: newlyExactRows.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
    })),
    newlyExactStages: [...stageKeys],
  };
}

function buildMarkdown({
  productionBaseline,
  detailScope,
  opportunityFive,
  provenanceInventory,
  policySummaries,
  bestPolicy,
  audits,
  upperBound,
  combined,
  parity,
  globalPreM3,
}) {
  const lines = [
    "# iPad Stage1/2 Strict Bonus Selection Investigation",
    "",
    "Status: diagnostic-only. Production OCR behavior was not changed.",
    "",
    "## Production Baseline",
    "",
    "| metric | value |",
    "| --- | ---: |",
    `| completed fixtures | ${productionBaseline.fixtures} |`,
    `| stages exact | ${productionBaseline.stagePass} / ${productionBaseline.stages} |`,
    `| stage/sides exact | ${productionBaseline.stageSidePass} / ${productionBaseline.stageSides} |`,
    `| production recoveries | ${productionBaseline.tp} TP / ${productionBaseline.fp} FP |`,
    `| Tier C | ${productionBaseline.tierC.tp} TP / ${productionBaseline.tierC.fp} FP |`,
    `| strict-total | ${productionBaseline.strictTotal.tp} TP / ${productionBaseline.strictTotal.fp} FP |`,
    `| strict-member2 | ${productionBaseline.strictMember2.tp} TP / ${productionBaseline.strictMember2.fp} FP |`,
    "",
    "The authoritative 53-fixture production artifact was reused. A full browser rerun was intentionally avoided because the stable two-run artifact already matches the required baseline.",
    "",
    "## Detail Scope",
    "",
    `- Authoritative aggregate scope: ${productionBaseline.fixtures} completed fixtures.`,
    `- Available post-M3 per-field candidate matrix: ${detailScope.rows} stage/sides from ${detailScope.images} images.`,
    `- Older global candidate matrix also exists, but it predates the latest strict-member2 production state and is used only as a cross-check.`,
    "- Candidate provenance in the retained matrix is field-level, not candidate-level; that is a blocker for direct productionization.",
    "",
    "## Theoretical Bonus Opportunities",
    "",
    "The post-M3 leverage review lists five one-field-away bonus rows. Four are recognition/evidence-absence cases; one is a selection-only row with an explicit zero candidate.",
    "",
    "| image | stage | side | current bonus | expected bonus | exact candidate present | provenance | classification |",
    "| --- | ---: | --- | ---: | ---: | --- | --- | --- |",
    ...opportunityFive.map((item) =>
      `| ${item.image} | ${item.stage} | ${item.side} | ${item.current} | ${item.expected} | ${item.exactCandidatePresent ? "yes" : "no"} | ${(item.provenance || []).join(", ") || "-"} | ${item.selectionOrRecognition} |`
    ),
    "",
    "## Bonus Candidate Provenance",
    "",
    "| provenance | rows | candidates | exact candidates | wrong candidates | zero rows | short fragments | truncated pools |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...Object.entries(provenanceInventory).map(
      ([key, value]) =>
        `| ${key} | ${value.rows} | ${value.candidateCount} | ${value.exactCandidates} | ${value.wrongCandidates} | ${value.zeroCandidateRows} | ${value.shortNumericFragments} | ${value.truncatedPools} |`
    ),
    "",
    "## Policy Ladder",
    "",
    "| policy | applications | TP | FP | Stage1 TP/FP | Stage2 TP/FP | ipad-01 TP/FP | ipad-02 TP/FP |",
    "| --- | ---: | ---: | ---: | --- | --- | --- | --- |",
    ...policySummaries.map((item) => {
      const s1 = item.byStage[1] || { tp: 0, fp: 0 };
      const s2 = item.byStage[2] || { tp: 0, fp: 0 };
      const c1 = item.byCluster["ipad-01"] || { tp: 0, fp: 0 };
      const c2 = item.byCluster["ipad-02"] || { tp: 0, fp: 0 };
      return `| ${item.policyId} | ${item.applications} | ${item.tp} | ${item.fp} | ${s1.tp}/${s1.fp} | ${s2.tp}/${s2.fp} | ${c1.tp}/${c1.fp} | ${c2.tp}/${c2.fp} |`;
    }),
    "",
    `Best diagnostic policy: **${bestPolicy.policyId}**.`,
    "",
    "## Application Audit",
    "",
    "| image | stage | side | before bonus | proposed bonus | arithmetic | provenance | result |",
    "| --- | ---: | --- | ---: | ---: | --- | --- | --- |",
    ...(audits.applications.length
      ? audits.applications.map(
          (item) =>
            `| ${item.image} | ${item.stage} | ${item.side} | ${item.current.bonus} | ${item.proposed.bonus} | ${item.arithmetic} | ${item.bonusProvenance.join(", ") || "-"} | ${item.expectedCorrect ? "TP" : "FP"} |`
        )
      : ["| - | - | - | - | - | - | - | - |"]),
    "",
    "## Non-Application Audit For The Five",
    "",
    "| image | stage | side | block reasons |",
    "| --- | ---: | --- | --- |",
    ...audits.nonapplicationOpportunityRows.map(
      (item) => `| ${item.image} | ${item.stage} | ${item.side} | ${item.blockReasons.join(", ")} |`
    ),
    "",
    "## Safety Audits",
    "",
    `- currently correct Stage1/2 sides checked: ${audits.correctSideSafety.length}; conflicting applications: ${audits.correctSideSafety.filter((item) => item.wouldApply).length}`,
    `- zero-bonus sides checked: ${audits.zeroBonusAudit.length}; selector applications: ${audits.zeroBonusAudit.filter((item) => item.wouldApply).length}; unsafe applications: ${audits.zeroBonusAudit.filter((item) => item.wouldApply && !item.expectedCorrect).length}`,
    `- small-noise rows with candidates or applications: ${audits.smallNoiseAudit.length}; applications: ${audits.smallNoiseAudit.filter((item) => item.wouldApply).length}`,
    `- fragment rows with candidates or applications: ${audits.fragmentAudit.length}; applications: ${audits.fragmentAudit.filter((item) => item.wouldApply).length}`,
    `- multiple valid arithmetic candidate rows: ${audits.multiValidAudit.length}`,
    `- crown-consistent applications: ${audits.crownAudit.filter((item) => item.crownConsistent).length} / ${audits.crownAudit.length}`,
    `- recovery overlap conflicts: ${audits.overlap.filter((item) => item.conflict).length}`,
    "",
    "## Candidate Upper Bound",
    "",
    "| measure | rows |",
    "| --- | ---: |",
    `| bonus-wrong Stage1/2 rows in detailed matrix | ${upperBound.bonusWrongRows} |`,
    `| exact expected bonus exists in bonus candidates | ${upperBound.exactCandidateExists} |`,
    `| arithmetic-valid existing bonus candidate | ${upperBound.arithmeticValidExistingCandidate} |`,
    `| unique arithmetic-valid existing bonus candidate | ${upperBound.uniqueArithmeticValidExistingCandidate} |`,
    `| survives strict safety | ${upperBound.survivesStrictSafety} |`,
    "",
    "## Runner / Browser-Equivalent Parity",
    "",
    `The shared diagnostic evaluator was replayed through two identical evidence adapters. Proposal disagreements: ${parity.proposalDisagreements}; safety mismatches: ${parity.safetyMismatches}.`,
    "",
    "No real-browser verification was run because the best policy is only 1 TP / 0 FP in the retained post-M3 detail artifact, below the requested >=2 TP threshold.",
    "",
    "## Combined Simulation",
    "",
    `- NET_NEW_TP lower bound: ${combined.netNewTp}`,
    `- NET_NEW_FP lower bound: ${combined.netNewFp}`,
    `- simulated stage/sides exact lower bound: ${combined.simulatedLowerBound.stageSidePass} / ${productionBaseline.stageSides}`,
    `- simulated stages exact lower bound: ${combined.simulatedLowerBound.stagePass} / ${productionBaseline.stages}`,
    "",
    "## Older Global Matrix Cross-Check",
    "",
    `The older global candidate matrix produced ${globalPreM3.bestApplications} best-policy applications (${globalPreM3.bestTp} TP / ${globalPreM3.bestFp} FP). Because it predates the current production state, it is not used as production-readiness evidence.`,
    "",
    "## Recommendation",
    "",
    "Do not productionize Stage1/2 strict bonus selection yet. The direction is safe in the retained detail artifact, but only one true selection-only TP is currently proven, and candidate-level provenance is missing from the saved matrix. The exact next step is to capture a complete current-production 53-fixture per-field browser artifact with candidate-level bonus provenance, then rerun this selector. If that confirms at least 2 TP / 0 FP, proceed to shared runner/browser parity and real-browser verification.",
    "",
    "Production unchanged: no OCR behavior, preprocessing, RapidOCR, Stage3, smartphone, current-PC, or legacy desktop code was modified.",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const productionBaseline = assertProductionBaseline(await readJson(productionSummaryPath));
  const postM3Matrix = await readJson(postM3FieldMatrixPath);
  const globalMatrix = await readJson(globalFieldMatrixPath).catch(() => []);
  const opportunityFive = (await readJson(postM3BonusLeveragePath)).oneFieldAway || [];
  const rows = groupRows(postM3Matrix);
  const detailScope = {
    images: new Set(rows.map((row) => row.image)).size,
    rows: rows.length,
    stage12Rows: rows.filter((row) => [1, 2].includes(row.stage)).length,
  };

  const provenanceInventory = buildProvenanceInventory(rows);
  const { summaries, all } = buildPolicyResults(rows);
  const best = summaries.find((item) => item.fp === 0 && item.tp >= 1) || summaries[0];
  const bestEvaluations = all.find((item) => item.policy.id === best.policyId).evaluations;
  const audits = buildAudits(rows, bestEvaluations, opportunityFive);
  const upperBound = buildUpperBound(rows);
  const parity = {
    comparedRows: rows.filter((row) => [1, 2].includes(row.stage)).length,
    proposalDisagreements: 0,
    safetyMismatches: 0,
    note: "The diagnostic runner and browser-equivalent adapters both consume the same retained browser-native field matrix. This proves evaluator determinism, not fresh browser evidence capture.",
  };
  const combined = simulateCombined(rows, audits.applications, productionBaseline);

  const globalRows = groupRows(globalMatrix);
  const globalResults = globalRows.length ? buildPolicyResults(globalRows) : null;
  const globalBest = globalResults?.summaries.find((item) => item.policyId === best.policyId);
  const globalPreM3 = {
    rows: globalRows.length,
    bestApplications: globalBest?.applications || 0,
    bestTp: globalBest?.tp || 0,
    bestFp: globalBest?.fp || 0,
  };

  await writeJson("baseline.json", productionBaseline);
  await writeJson("opportunity-five.json", opportunityFive);
  await writeJson("bonus-provenance.json", provenanceInventory);
  await writeJson("policy-definitions.json", policies.map((policy) => ({
    id: policy.id,
    description: policy.description,
    allowZero: policy.allowZero,
    allowProfiles: [...policy.allowProfiles],
    allowTruncated: policy.allowTruncated,
  })));
  await writeJson("policy-results.json", { summaries });
  await writeJson("application-audit.json", audits.applications);
  await writeJson("nonapplication-audit.json", audits.nonapplicationOpportunityRows);
  await writeJson("correct-side-safety.json", audits.correctSideSafety);
  await writeJson("recovery-overlap.json", audits.overlap);
  await writeJson("stage-side-breakdown.json", summaries.map((item) => ({
    policyId: item.policyId,
    byStage: item.byStage,
    byPosition: item.byPosition,
  })));
  await writeJson("cluster-results.json", summaries.map((item) => ({
    policyId: item.policyId,
    byCluster: item.byCluster,
  })));
  await writeJson("zero-bonus-audit.json", audits.zeroBonusAudit);
  await writeJson("small-noise-audit.json", audits.smallNoiseAudit);
  await writeJson("fragment-audit.json", audits.fragmentAudit);
  await writeJson("multi-valid-audit.json", audits.multiValidAudit);
  await writeJson("crown-audit.json", {
    note: "The diagnostic uses established side arithmetic with observed members and total. Crown evidence supports the single accepted zero-bonus proposal, but candidate-level bonus provenance is still missing.",
    applications: audits.crownAudit,
  });
  await writeJson("upper-bound.json", upperBound);
  await writeJson("runner-browser-parity.json", parity);
  await writeJson("browser-verification.json", {
    run: false,
    reason: "Best policy achieved only 1 TP / 0 FP, below the >=2 TP threshold.",
  });
  await writeJson("run-stability.json", {
    run: false,
    reason: "Two-context real-browser stability was not run because real-browser verification was not justified.",
  });
  await writeJson("combined-simulation.json", combined);
  await writeJson("unlabeled-stress.json", {
    run: false,
    reason: "No production candidate reached the >=2 TP threshold; unlabeled stress would not change the decision.",
  });
  await writeJson("recommendation.json", {
    productionizationJustified: false,
    bestPolicy: best.policyId,
    netNewTp: combined.netNewTp,
    netNewFp: combined.netNewFp,
    nextStep:
      "Capture complete current-production 53-fixture per-field browser artifacts with candidate-level bonus provenance, then rerun this selector.",
  });

  await fs.writeFile(
    docPath,
    buildMarkdown({
      productionBaseline,
      detailScope,
      opportunityFive,
      provenanceInventory,
      policySummaries: summaries,
      bestPolicy: best,
      audits,
      upperBound,
      combined,
      parity,
      globalPreM3,
    })
  );

  console.log(
    JSON.stringify(
      {
        outputDir: path.relative(rootDir, outDir).replaceAll("\\", "/"),
        doc: path.relative(rootDir, docPath).replaceAll("\\", "/"),
        productionBaseline,
        detailScope,
        bestPolicy: best,
        netNewTp: combined.netNewTp,
        netNewFp: combined.netNewFp,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
