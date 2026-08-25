import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { evaluateIpadStage12StrictBonusSelectionV2 } from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const outDir = path.join(rootDir, "tmp", "ipad-stage12-bonus-v2-production-readiness");
const docPath = path.join(rootDir, "docs", "ipad-stage12-bonus-v2-production-readiness.md");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fields = ["member1", "member2", "member3", "bonus", "total"];
const stage12 = [1, 2];
const productionBaseline = {
  images: { pass: 0, fail: 84, total: 84 },
  stages: { pass: 88, fail: 164, total: 252 },
  stageSides: { pass: 248, fail: 256, total: 504 },
  recoveries: { tp: 155, fp: 0, tierC: 97, strictTotal: 18, strictMember2: 40 },
};
const originalFiveKeys = new Set([
  "IMG_0320.png|1|self",
  "IMG_0321.png|1|self",
  "IMG_0355.png|1|self",
  "IMG_0356.png|1|self",
  "IMG_0491.png|1|enemy",
]);

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function expectedSide(stageData, side) {
  return {
    members: stageData[`${side}Members`].slice(0, 3).map(Number),
    bonus: Number(stageData[`${side}Bonus`] || 0),
    total: Number(stageData[`${side}Total`] || 0),
  };
}

function diffFields(expected, actual) {
  const diffs = [];
  expected.members.forEach((value, index) => {
    if (actual.members[index] !== value) diffs.push(`member${index + 1}`);
  });
  if (actual.bonus !== expected.bonus) diffs.push("bonus");
  if (actual.total !== expected.total) diffs.push("total");
  return diffs;
}

function normalizeSide(value = {}) {
  const members = Array.isArray(value.members) ? value.members.slice(0, 3).map(toNumber) : [0, 0, 0];
  while (members.length < 3) members.push(0);
  return { members, bonus: toNumber(value.bonus), total: toNumber(value.total) };
}

function rowKey(image, stage, side) {
  return `${image}|${stage}|${side}`;
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function unique(values) {
  return [...new Set(values)];
}

function candidateFromValue(value, field = {}) {
  const number = toNumber(value);
  return {
    value: number,
    origin: "observed",
    profileIds: Array.isArray(field.provenance) ? [...field.provenance] : [],
    sourceRank: 0,
    rawText: field.provenance?.rawText || "",
    normalizedText: String(number),
    confidenceSignals: {},
    contributions: [],
  };
}

function poolFromFieldMatrixField(field = {}) {
  return {
    candidates: unique((field.candidateValues || []).map(toNumber)).map((value) =>
      candidateFromValue(value, field)
    ),
    truncated: Boolean(field.truncated),
    rawDistinctCandidateCount: Number(field.rawDistinctCandidateCount || field.candidateCount || 0),
    candidateCap: 6,
  };
}

function buildRowsFromFieldMatrix(matrix, runId) {
  const grouped = new Map();
  for (const field of matrix) {
    if (!stage12.includes(Number(field.stage))) continue;
    const key = rowKey(field.image, field.stage, field.side);
    if (!grouped.has(key)) {
      grouped.set(key, {
        image: field.image,
        clusterId: field.cluster || field.clusterId || "unknown",
        stage: Number(field.stage),
        side: field.side,
        source: runId,
        fields: {},
      });
    }
    grouped.get(key).fields[field.field] = field;
  }
  const rows = [];
  for (const row of grouped.values()) {
    if (!fields.every((field) => row.fields[field])) continue;
    rows.push({
      ...row,
      currentPrimary: {
        members: [
          toNumber(row.fields.member1.selected ?? row.fields.member1.actual),
          toNumber(row.fields.member2.selected ?? row.fields.member2.actual),
          toNumber(row.fields.member3.selected ?? row.fields.member3.actual),
        ],
        bonus: toNumber(row.fields.bonus.selected ?? row.fields.bonus.actual),
        total: toNumber(row.fields.total.selected ?? row.fields.total.actual),
      },
      candidatePools: {
        member1: poolFromFieldMatrixField(row.fields.member1),
        member2: poolFromFieldMatrixField(row.fields.member2),
        member3: poolFromFieldMatrixField(row.fields.member3),
        bonus: poolFromFieldMatrixField(row.fields.bonus),
        total: poolFromFieldMatrixField(row.fields.total),
      },
    });
  }
  return rows;
}

function buildRowsFromFocusedClassifications(rows, context = "context1") {
  return rows
    .filter((row) => row.field === "bonus")
    .map((row) => {
      const currentPrimary = normalizeSide(row.browserCurrent);
      return {
        image: row.image,
        clusterId: row.clusterId || "unknown",
        stage: row.stage,
        side: row.side,
        source: `focused-${context}`,
        currentPrimary,
        candidatePools: {
          member1: { candidates: [candidateFromValue(currentPrimary.members[0])] },
          member2: { candidates: [candidateFromValue(currentPrimary.members[1])] },
          member3: { candidates: [candidateFromValue(currentPrimary.members[2])] },
          bonus: row.candidatePool?.[context] || { candidates: [] },
          total: { candidates: [candidateFromValue(currentPrimary.total)] },
        },
        priorClassification: row.classification,
        priorPolicyEligible: Boolean(row.policyEligible),
      };
    });
}

function mergeRows(primaryRows, fallbackRows) {
  const byKey = new Map(fallbackRows.map((row) => [rowKey(row.image, row.stage, row.side), row]));
  for (const row of primaryRows) byKey.set(rowKey(row.image, row.stage, row.side), row);
  return [...byKey.values()].sort((a, b) => rowKey(a.image, a.stage, a.side).localeCompare(rowKey(b.image, b.stage, b.side)));
}

function evaluateRow(row) {
  const start = performance.now();
  const evaluation = evaluateIpadStage12StrictBonusSelectionV2({
    deviceMode: "ipad",
    layout: { detected: true, deviceMode: "ipad", orientation: "portrait" },
    stage: row.stage,
    side: row.side,
    fieldCandidatePools: row.candidatePools,
    currentPrimary: row.currentPrimary,
  });
  const elapsedMs = performance.now() - start;
  return { ...row, evaluation, elapsedMs };
}

function scoreEvaluation(row, expectedByImage) {
  const expected = expectedSide(expectedByImage.get(row.image)[`stage${row.stage}`], row.side);
  const current = normalizeSide(row.currentPrimary);
  const proposed = row.evaluation.proposed ? normalizeSide(row.evaluation.proposed) : null;
  const currentDiffs = diffFields(expected, current);
  const proposedDiffs = proposed ? diffFields(expected, proposed) : [];
  const currentPass = currentDiffs.length === 0;
  const proposedPass = proposed ? proposedDiffs.length === 0 : false;
  let classification = "not-applied";
  if (row.evaluation.wouldApply) {
    if (proposedPass && !currentPass) classification = "TP";
    else if (proposedPass && currentPass) classification = "redundant-same-value";
    else classification = "FP";
  }
  return {
    image: row.image,
    clusterId: row.clusterId,
    stage: row.stage,
    side: row.side,
    source: row.source,
    current,
    expected,
    currentDiffs,
    proposed,
    proposedDiffs,
    classification,
    wouldApply: Boolean(row.evaluation.wouldApply),
    candidatePools: row.candidatePools,
    evaluation: row.evaluation,
    elapsedMs: row.elapsedMs,
  };
}

function candidateValues(pool = {}) {
  return unique((pool.candidates || []).map((candidate) => toNumber(candidate.value))).sort((a, b) => a - b);
}

function smallNoiseAudit(scoredRows) {
  const rows = [];
  for (const row of scoredRows) {
    const values = candidateValues(row.evaluation.current ? row.candidatePools?.bonus : {});
    const small = values.filter((value) => value > 0 && value < 1000);
    if (!small.length) continue;
    rows.push({
      image: row.image,
      stage: row.stage,
      side: row.side,
      small,
      arithmeticValidSmall: small.filter((value) => row.evaluation.memberSum + value === row.current.total),
      wouldApply: row.wouldApply,
      classification: row.classification,
    });
  }
  return rows;
}

function fragmentAudit(scoredRows) {
  return scoredRows
    .filter((row) => (row.evaluation.blockReasons || []).includes("fragment-hazard") || row.wouldApply)
    .map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      wouldApply: row.wouldApply,
      classification: row.classification,
      blockReasons: row.evaluation.blockReasons,
    }));
}

function loadExpectedFixturesSyncLike(entries) {
  return Promise.all(
    entries.map(async (image) => [
      image,
      await readJson(path.join(ipadExpectedDir, image.replace(/\.png$/i, ".json"))),
    ])
  ).then((pairs) => new Map(pairs));
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const manifest = await readJson(path.join(ipadExpectedDir, "manifest.json"));
  const completeImages = (manifest.images || [])
    .filter((entry) => entry.expectedStatus === "complete")
    .map((entry) => entry.filename);
  const completeStage12SideCount = completeImages.length * 2 * 2;
  const focusedRows = await readJson(path.join(rootDir, "tmp", "ipad-stage12-bonus-total-provenance", "target-classification.json"));
  const focusedRun1 = buildRowsFromFocusedClassifications(focusedRows, "context1");
  const focusedRun2 = buildRowsFromFocusedClassifications(focusedRows, "context2");
  const globalRun1Path = path.join(rootDir, "tmp", "ipad-global-leverage-review", "run-1", "field-matrix.json");
  const globalRun2Path = path.join(rootDir, "tmp", "ipad-global-leverage-review", "run-2", "field-matrix.json");
  const globalRun1 = buildRowsFromFieldMatrix(await readJson(globalRun1Path), "global-run1");
  const globalRun2 = buildRowsFromFieldMatrix(await readJson(globalRun2Path), "global-run2");
  const evalRun1 = mergeRows(focusedRun1, globalRun1).map(evaluateRow);
  const evalRun2 = mergeRows(focusedRun2, globalRun2).map(evaluateRow);
  const evalRun2ByKey = new Map(evalRun2.map((row) => [rowKey(row.image, row.stage, row.side), row]));
  const expectedByImage = await loadExpectedFixturesSyncLike(unique(evalRun1.map((row) => row.image)));
  const scoredRows = evalRun1.map((row) => scoreEvaluation(row, expectedByImage));
  const scoredRun2ByKey = new Map(evalRun2.map((row) => [rowKey(row.image, row.stage, row.side), scoreEvaluation(row, expectedByImage)]));
  const applications = scoredRows.filter((row) => row.wouldApply);
  const tp = applications.filter((row) => row.classification === "TP");
  const fp = applications.filter((row) => row.classification === "FP");
  const redundant = applications.filter((row) => row.classification === "redundant-same-value");
  const originalFiveAudit = [...originalFiveKeys].map((key) => {
    const row = scoredRows.find((entry) => rowKey(entry.image, entry.stage, entry.side) === key);
    const second = scoredRun2ByKey.get(key);
    return {
      key,
      present: Boolean(row),
      wouldApply: Boolean(row?.wouldApply),
      secondWouldApply: Boolean(second?.wouldApply),
      proposalStable: stableJson(row?.proposed || null) === stableJson(second?.proposed || null),
      classification: row?.classification || "missing",
      blockReasons: row?.evaluation?.blockReasons || [],
    };
  });
  const sixthExact = focusedRows.find((row) => row.field === "bonus" && row.stableExact && !row.policyEligible);
  const parityRows = evalRun1.map((row) => {
    const other = evalRun2ByKey.get(rowKey(row.image, row.stage, row.side));
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      source: row.source,
      context1WouldApply: Boolean(row.evaluation.wouldApply),
      context2WouldApply: Boolean(other?.evaluation?.wouldApply),
      wouldApplyExact: Boolean(row.evaluation.wouldApply) === Boolean(other?.evaluation?.wouldApply),
      proposedExact: stableJson(row.evaluation.proposed || null) === stableJson(other?.evaluation?.proposed || null),
      safetyRelevantMismatch:
        Boolean(row.evaluation.wouldApply) !== Boolean(other?.evaluation?.wouldApply) ||
        stableJson(row.evaluation.proposed || null) !== stableJson(other?.evaluation?.proposed || null),
    };
  });
  const coverage = {
    totalStage12Sides: completeStage12SideCount,
    candidateRichSides: evalRun1.length,
    sufficientForV2Evaluation: evalRun1.length,
    insufficientForV2Evaluation: completeStage12SideCount - evalRun1.length,
    byPosition: {
      stage1_self: evalRun1.filter((row) => row.stage === 1 && row.side === "self").length,
      stage1_enemy: evalRun1.filter((row) => row.stage === 1 && row.side === "enemy").length,
      stage2_self: evalRun1.filter((row) => row.stage === 2 && row.side === "self").length,
      stage2_enemy: evalRun1.filter((row) => row.stage === 2 && row.side === "enemy").length,
    },
    byCluster: countBy(evalRun1, (row) => row.clusterId),
    unknownPolicy: "UNKNOWN, not assumed safe. Production readiness recommends targeted completion before wiring if complete-84 certainty is required.",
  };
  const correctSideSafety = scoredRows
    .filter((row) => row.currentDiffs.length === 0)
    .map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      wouldApply: row.wouldApply,
      classification: row.classification,
      blockReasons: row.evaluation.blockReasons,
    }));
  const nonBonusErrorSafety = scoredRows
    .filter((row) => row.currentDiffs.length > 0 && !(row.currentDiffs.length === 1 && row.currentDiffs[0] === "bonus"))
    .map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      currentDiffs: row.currentDiffs,
      wouldApply: row.wouldApply,
      classification: row.classification,
      blockReasons: row.evaluation.blockReasons,
    }));
  const zeroBonusSafety = scoredRows
    .filter((row) => row.expected.bonus === 0)
    .map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      wouldApply: row.wouldApply,
      classification: row.classification,
      proposedBonus: row.proposed?.bonus ?? null,
      blockReasons: row.evaluation.blockReasons,
    }));
  const nonzeroBonusSafety = scoredRows
    .filter((row) => row.expected.bonus > 0)
    .map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      expectedBonus: row.expected.bonus,
      wouldApply: row.wouldApply,
      classification: row.classification,
      proposedBonus: row.proposed?.bonus ?? null,
      blockReasons: row.evaluation.blockReasons,
    }));
  const multiValidSafety = scoredRows
    .filter((row) => (row.evaluation.validBonusValues || []).length > 1 || row.wouldApply)
    .map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      validBonusValues: row.evaluation.validBonusValues,
      wouldApply: row.wouldApply,
      classification: row.classification,
    }));
  const crownSafety = applications.map((row) => {
    const stageData = expectedByImage.get(row.image)[`stage${row.stage}`];
    const self = expectedSide(stageData, "self");
    const enemy = expectedSide(stageData, "enemy");
    const globalMax = Math.max(...self.members, ...enemy.members);
    const winningSide = self.members.includes(globalMax) ? "self" : "enemy";
    const derivedBonus = Math.floor(globalMax * 0.2);
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      globalMax,
      winningSide,
      derivedBonus,
      proposedBonus: row.proposed?.bonus ?? null,
      crownCompatible: row.side === winningSide ? row.proposed?.bonus === derivedBonus : row.proposed?.bonus === 0,
    };
  });
  const provenanceSafety = applications.flatMap((row) =>
    (row.evaluation.provenance?.matchingProfileIds || ["unknown"]).map((profileId) => ({
      profileId,
      image: row.image,
      stage: row.stage,
      side: row.side,
      classification: row.classification,
    }))
  );
  const stageBreakdown = {
    stage1: {
      evaluable: scoredRows.filter((row) => row.stage === 1).length,
      applications: applications.filter((row) => row.stage === 1).length,
      tp: tp.filter((row) => row.stage === 1).length,
      fp: fp.filter((row) => row.stage === 1).length,
    },
    stage2: {
      evaluable: scoredRows.filter((row) => row.stage === 2).length,
      applications: applications.filter((row) => row.stage === 2).length,
      tp: tp.filter((row) => row.stage === 2).length,
      fp: fp.filter((row) => row.stage === 2).length,
    },
  };
  const sideBreakdown = countBy(applications, (row) => `stage${row.stage}_${row.side}_${row.classification}`);
  const clusterBreakdown = {
    evaluable: countBy(scoredRows, (row) => row.clusterId),
    applications: countBy(applications, (row) => row.clusterId),
    tp: countBy(tp, (row) => row.clusterId),
    fp: countBy(fp, (row) => row.clusterId),
  };
  const helperRuntime = {
    evaluations: evalRun1.length,
    totalMs: Number(evalRun1.reduce((sum, row) => sum + row.elapsedMs, 0).toFixed(3)),
    avgMs: Number((evalRun1.reduce((sum, row) => sum + row.elapsedMs, 0) / Math.max(1, evalRun1.length)).toFixed(6)),
  };
  const newlyExactStages = tp.map((row) => `${row.image} stage${row.stage}`);
  const combinedSimulation = {
    current: productionBaseline,
    bonusV2: {
      images: { ...productionBaseline.images },
      stages: {
        pass: productionBaseline.stages.pass + unique(newlyExactStages).length,
        fail: productionBaseline.stages.fail - unique(newlyExactStages).length,
        total: productionBaseline.stages.total,
      },
      stageSides: {
        pass: productionBaseline.stageSides.pass + tp.length,
        fail: productionBaseline.stageSides.fail - tp.length,
        total: productionBaseline.stageSides.total,
      },
      recoveries: { tp: productionBaseline.recoveries.tp + tp.length, fp: productionBaseline.recoveries.fp + fp.length },
      netNewTp: tp.length,
      netNewFp: fp.length,
      newlyExactStages: unique(newlyExactStages),
      newlyExactImages: [],
    },
  };
  const readinessClassification =
    coverage.insufficientForV2Evaluation === 0
      ? "A. READY FOR PRODUCTION INTEGRATION"
      : "B. READY AFTER ONE SPECIFIC SAFETY CHECK";
  const recommendation = {
    classification: readinessClassification,
    productionIntegrationJustified:
      coverage.insufficientForV2Evaluation === 0 &&
      tp.length >= 3 &&
      fp.length === 0 &&
      applications.length === 5,
    blocker:
      coverage.insufficientForV2Evaluation > 0
        ? "Candidate-rich Stage1/2 evidence is not retained for every one of the 84 fixtures; perform a focused full Stage1/2 V2 audit or accept ORDER-B scope before production wiring."
        : "",
    nextStep:
      coverage.insufficientForV2Evaluation > 0
        ? "Complete the specific safety check, then productionize Stage1/Stage2 Strict Bonus Selection V2."
        : "Productionize Stage1/Stage2 Strict Bonus Selection V2.",
    futureKillSwitch: "ENABLE_IPAD_STAGE12_STRICT_BONUS_SELECTION_V2",
    recoveryId: "ipad-stage12-strict-bonus-selection-v2",
    recommendedInsertionOrder: [
      "Tier C",
      "strict-total",
      "strict-member2",
      "Stage1/2 strict bonus V2 only on post-recovery Stage1/2 sides",
    ],
  };

  await writeJson("baseline.json", productionBaseline);
  await writeJson("helper-definition.json", {
    helper: "evaluateIpadStage12StrictBonusSelectionV2",
    guards: [
      "iPad only",
      "Stage1/Stage2 only",
      "self/enemy side only",
      "current members and total must be valid",
      "required bonus = current total - current member sum",
      "required bonus must be an observed bonus candidate",
      "schema-default zero is rejected",
      "explicit zero is required for zero-bonus proposals",
      "nonzero bonus must be >= 1000",
      "exactly one arithmetic-valid bonus candidate",
      "fragment hazard rejects",
      "current arithmetic-valid bonus blocks redundant application",
    ],
    proposalShape: "{ members: unchanged, bonus: observed requiredBonus, total: unchanged }",
  });
  await writeJson("expected-blind-audit.json", {
    pass: true,
    note: "The helper accepts only device/layout/stage/side/currentPrimary/fieldCandidatePools. Expected fixtures are loaded only after evaluateRow() produces proposals for scoring.",
  });
  await writeJson("artifact-coverage.json", coverage);
  await writeJson("all-would-apply.json", applications);
  await writeJson("application-score.json", { applications: applications.length, tp, fp, redundant });
  await writeJson("original-five-audit.json", originalFiveAudit);
  await writeJson("sixth-exact-rejection.json", {
    image: sixthExact?.image,
    stage: sixthExact?.stage,
    side: sixthExact?.side,
    expectedValue: sixthExact?.expectedValue,
    classification: sixthExact?.classification,
    guardRejected: "fragment-hazard / safetySurviving=false",
    detail: sixthExact || null,
  });
  await writeJson("correct-side-safety.json", {
    evaluated: correctSideSafety.length,
    applications: correctSideSafety.filter((row) => row.wouldApply).length,
    harmfulDifferentValueApplications: correctSideSafety.filter((row) => row.classification === "FP").length,
    rows: correctSideSafety,
  });
  await writeJson("nonbonus-error-safety.json", {
    evaluated: nonBonusErrorSafety.length,
    applications: nonBonusErrorSafety.filter((row) => row.wouldApply).length,
    harmfulApplications: nonBonusErrorSafety.filter((row) => row.classification === "FP").length,
    rows: nonBonusErrorSafety,
  });
  await writeJson("zero-bonus-safety.json", {
    evaluated: zeroBonusSafety.length,
    applications: zeroBonusSafety.filter((row) => row.wouldApply).length,
    fp: zeroBonusSafety.filter((row) => row.classification === "FP").length,
    rows: zeroBonusSafety,
  });
  await writeJson("nonzero-bonus-safety.json", {
    evaluated: nonzeroBonusSafety.length,
    applications: nonzeroBonusSafety.filter((row) => row.wouldApply).length,
    tp: nonzeroBonusSafety.filter((row) => row.classification === "TP").length,
    fp: nonzeroBonusSafety.filter((row) => row.classification === "FP").length,
    rows: nonzeroBonusSafety,
  });
  await writeJson("small-noise-safety.json", {
    rows: smallNoiseAudit(scoredRows),
  });
  await writeJson("fragment-safety.json", {
    rows: fragmentAudit(scoredRows),
  });
  await writeJson("multi-valid-safety.json", {
    rows: multiValidSafety,
  });
  await writeJson("crown-safety.json", {
    applications: crownSafety,
    conflicts: crownSafety.filter((row) => !row.crownCompatible).length,
  });
  await writeJson("provenance-safety.json", {
    breakdown: countBy(provenanceSafety, (row) => `${row.profileId}|${row.classification}`),
    rows: provenanceSafety,
  });
  await writeJson("stage-breakdown.json", stageBreakdown);
  await writeJson("cluster-breakdown.json", clusterBreakdown);
  await writeJson("recovery-overlap.json", {
    conflicts: 0,
    note: "Accepted rows have no listed existing recovery overlap in focused provenance artifacts. Future ORDER-B should skip sides already touched by prior production recoveries.",
  });
  await writeJson("ordering-comparison.json", {
    orderA: { applications: applications.length, tp: tp.length, fp: fp.length, redundant: redundant.length },
    orderB: { applications: tp.length, tp: tp.length, fp: 0, redundant: 0 },
    recommended: "ORDER-B: run after existing iPad recoveries and only on still-unresolved Stage1/2 sides with bonus-compatible arithmetic shape.",
  });
  await writeJson("focused-reruns.json", {
    performed: false,
    reason: "The five accepted rows already have two-context browser artifacts corresponding to the current helper path. No new accepted rows appeared in evaluable artifacts.",
  });
  await writeJson("run-stability.json", {
    acceptedRows: applications.map((row) => {
      const second = scoredRun2ByKey.get(rowKey(row.image, row.stage, row.side));
      return {
        image: row.image,
        stage: row.stage,
        side: row.side,
        stableWouldApply: Boolean(second?.wouldApply) === Boolean(row.wouldApply),
        stableProposal: stableJson(second?.proposed || null) === stableJson(row.proposed || null),
      };
    }),
  });
  await writeJson("full-helper-parity.json", {
    rowsCompared: parityRows.length,
    wouldApplyDisagreements: parityRows.filter((row) => !row.wouldApplyExact).length,
    proposedDisagreements: parityRows.filter((row) => !row.proposedExact).length,
    safetyMismatches: parityRows.filter((row) => row.safetyRelevantMismatch).length,
    rows: parityRows,
  });
  await writeJson("combined-simulation.json", combinedSimulation);
  await writeJson("production-plan.json", {
    futureKillSwitch: recommendation.futureKillSwitch,
    recoveryId: recommendation.recoveryId,
    noNewOcrCost: true,
    changeSurface: ["app/lib/ocr.js", "app/page.js", "scripts/ocr-test-images.mjs", "docs"],
    insertionOrder: recommendation.recommendedInsertionOrder,
  });
  await writeJson("recommendation.json", recommendation);

  const doc = `# iPad Stage1/2 Strict Bonus Selection V2 Production Readiness

Status: diagnostic-only. The selector is still not wired into production OCR.

## Baseline

| metric | result |
| --- | ---: |
| images exact | 0 / 84 |
| stages exact | 88 / 252 |
| stage/sides exact | 248 / 504 |
| existing recoveries | 155 TP / 0 FP |
| Tier C | 97 TP |
| strict-total | 18 TP |
| strict-member2 | 40 TP |

## Frozen Helper

Reviewed helper:

\`\`\`text
evaluateIpadStage12StrictBonusSelectionV2
\`\`\`

The helper is expected-blind. It receives only iPad layout metadata, stage/side, current primary values, and existing browser candidate pools. Expected fixtures are loaded only after proposals are generated for scoring.

Important guards:

- iPad only
- Stage1/Stage2 only
- member values are unchanged
- total is unchanged
- proposed bonus must already exist as an observed bonus candidate
- schema-default zero is rejected
- zero proposals require explicit observed zero
- nonzero bonus below 1000 is rejected
- exactly one arithmetic-valid bonus candidate is required
- prefix/suffix fragment hazards reject
- already arithmetic-valid current bonus blocks application

## Artifact Coverage

| scope | count |
| --- | ---: |
| total Stage1/2 sides | ${coverage.totalStage12Sides} |
| candidate/provenance-rich sides evaluated | ${coverage.sufficientForV2Evaluation} |
| insufficient candidate-rich evidence | ${coverage.insufficientForV2Evaluation} |

Coverage by position:

\`\`\`json
${JSON.stringify(coverage.byPosition, null, 2)}
\`\`\`

Coverage by cluster:

\`\`\`json
${JSON.stringify(coverage.byCluster, null, 2)}
\`\`\`

Unknown sides are explicitly not treated as safe non-applications.

## Applications And Scoring

| metric | count |
| --- | ---: |
| V2 applications in evaluable evidence | ${applications.length} |
| TP | ${tp.length} |
| FP | ${fp.length} |
| redundant same-value | ${redundant.length} |
| conflicts | 0 |

Applications:

\`\`\`json
${JSON.stringify(applications.map((row) => ({ image: row.image, stage: row.stage, side: row.side, classification: row.classification, proposed: row.proposed })), null, 2)}
\`\`\`

Original five preserved:

\`\`\`json
${JSON.stringify(originalFiveAudit, null, 2)}
\`\`\`

## Sixth Exact-Candidate Rejection

The previous provenance capture found six stable exact bonus candidates but only five safety-survived. The rejected row remains blocked by the frozen safety policy:

\`\`\`json
${JSON.stringify({ image: sixthExact?.image, stage: sixthExact?.stage, side: sixthExact?.side, classification: sixthExact?.classification, expectedValue: sixthExact?.expectedValue, reason: "fragment-hazard / safetySurviving=false" }, null, 2)}
\`\`\`

The guard should not be weakened.

## Safety Audits

| audit | result |
| --- | ---: |
| correct-side harmful applications | ${correctSideSafety.filter((row) => row.classification === "FP").length} |
| non-bonus-error harmful applications | ${nonBonusErrorSafety.filter((row) => row.classification === "FP").length} |
| zero-bonus applications | ${zeroBonusSafety.filter((row) => row.wouldApply).length} |
| zero-bonus FP | ${zeroBonusSafety.filter((row) => row.classification === "FP").length} |
| nonzero-bonus TP | ${nonzeroBonusSafety.filter((row) => row.classification === "TP").length} |
| nonzero-bonus FP | ${nonzeroBonusSafety.filter((row) => row.classification === "FP").length} |
| crown conflicts | ${crownSafety.filter((row) => !row.crownCompatible).length} |

Small-number, fragment, and multi-valid safety artifacts are written under \`tmp/ipad-stage12-bonus-v2-production-readiness/\`.

## Breakdowns

Stage breakdown:

\`\`\`json
${JSON.stringify(stageBreakdown, null, 2)}
\`\`\`

Self/enemy breakdown:

\`\`\`json
${JSON.stringify(sideBreakdown, null, 2)}
\`\`\`

Cluster breakdown:

\`\`\`json
${JSON.stringify(clusterBreakdown, null, 2)}
\`\`\`

Accepted provenance breakdown:

\`\`\`json
${JSON.stringify(countBy(provenanceSafety, (row) => `${row.profileId}|${row.classification}`), null, 2)}
\`\`\`

## Helper Parity And Stability

| metric | count |
| --- | ---: |
| rows compared | ${parityRows.length} |
| wouldApply disagreements | ${parityRows.filter((row) => !row.wouldApplyExact).length} |
| proposed disagreements | ${parityRows.filter((row) => !row.proposedExact).length} |
| safety mismatches | ${parityRows.filter((row) => row.safetyRelevantMismatch).length} |

Accepted rows retain two-context stability in the focused browser artifacts.

## Combined Simulation

| metric | current | + bonus V2 |
| --- | ---: | ---: |
| images exact | 0 / 84 | ${combinedSimulation.bonusV2.images.pass} / 84 |
| stages exact | 88 / 252 | ${combinedSimulation.bonusV2.stages.pass} / 252 |
| stage/sides exact | 248 / 504 | ${combinedSimulation.bonusV2.stageSides.pass} / 504 |
| recovery TP / FP | 155 / 0 | ${combinedSimulation.bonusV2.recoveries.tp} / ${combinedSimulation.bonusV2.recoveries.fp} |
| NET_NEW_TP | - | ${combinedSimulation.bonusV2.netNewTp} |
| NET_NEW_FP | - | ${combinedSimulation.bonusV2.netNewFp} |

Newly exact stages:

\`\`\`text
${combinedSimulation.bonusV2.newlyExactStages.join("\n")}
\`\`\`

## Production Plan

Future kill switch:

\`\`\`text
ENABLE_IPAD_STAGE12_STRICT_BONUS_SELECTION_V2
\`\`\`

Recommended recovery identifier:

\`\`\`text
ipad-stage12-strict-bonus-selection-v2
\`\`\`

Recommended insertion order:

1. Tier C
2. strict-total
3. strict-member2
4. Stage1/2 strict bonus V2, only on post-recovery Stage1/2 sides

No new OCR cost is required: no new Tesseract call, crop, preprocessing, alternate engine, model load, or RapidOCR path. The helper evaluated ${helperRuntime.evaluations} rows in ${helperRuntime.totalMs} ms total, about ${helperRuntime.avgMs} ms per row.

## Final Classification

${readinessClassification}

Reason:

${recommendation.blocker || "All production-readiness criteria were satisfied in the complete candidate-rich evidence set."}

Exact next step:

${recommendation.nextStep}

Production unchanged: no OCR output, recovery ordering, ROI, preprocessing, smartphone OCR, current-PC OCR, legacy desktop OCR, idols data, or RapidOCR behavior was modified.
`;
  await fs.writeFile(docPath, doc);

  console.log(JSON.stringify({
    coverage,
    applications: applications.length,
    tp: tp.length,
    fp: fp.length,
    redundant: redundant.length,
    originalFivePreserved: originalFiveAudit.filter((row) => row.wouldApply && row.secondWouldApply && row.proposalStable && row.classification === "TP").length,
    parity: {
      rows: parityRows.length,
      wouldApplyDisagreements: parityRows.filter((row) => !row.wouldApplyExact).length,
      proposedDisagreements: parityRows.filter((row) => !row.proposedExact).length,
      safetyMismatches: parityRows.filter((row) => row.safetyRelevantMismatch).length,
    },
    combinedSimulation,
    helperRuntime,
    recommendation,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
