import assert from "node:assert/strict";
import {
  IPAD_STAGE12_STRICT_BONUS_SELECTION_V2_RECOVERY_ID,
  applyIpadStage12StrictBonusSelectionV2Recovery,
  evaluateIpadStage12StrictBonusSelectionV2,
} from "../app/lib/ocr.js";

const sides = ["self", "enemy"];

function format(value) {
  return Number(value || 0) > 0 ? Number(value).toLocaleString() : "";
}

function sideKey(side) {
  return side === "self" ? "selfTotal" : "enemyTotal";
}

function candidate(value, profileId = "white-mask-3x-psm7") {
  return {
    value,
    origin: "observed",
    profileIds: [profileId],
    rawText: String(value),
    normalizedText: String(value),
  };
}

function makeRow({ stage, side, oldValues, newValues, bonusCandidates }) {
  return {
    stage,
    side,
    evidence: {
      deviceMode: "ipad",
      layout: {
        detected: true,
        deviceMode: "ipad",
        orientation: "portrait",
        supported: true,
      },
      stage,
      side,
      fieldCandidatePools: {
        member1: { candidates: [candidate(oldValues.members[0])] },
        member2: { candidates: [candidate(oldValues.members[1])] },
        member3: { candidates: [candidate(oldValues.members[2])] },
        bonus: { key: `${stage}-${side}-bonus`, candidates: bonusCandidates },
        total: { candidates: [candidate(oldValues.total)] },
      },
      currentPrimary: oldValues,
    },
    expectedNewValues: newValues,
  };
}

const expectedApplications = [
  {
    stage: 1,
    side: "enemy",
    oldValues: { members: [333995, 245881, 213242], bonus: 3, total: 793118 },
    newValues: { members: [333995, 245881, 213242], bonus: 0, total: 793118 },
    bonusCandidates: [candidate(0)],
  },
  {
    stage: 1,
    side: "self",
    oldValues: { members: [298058, 88866, 122217], bonus: 1, total: 568752 },
    newValues: { members: [298058, 88866, 122217], bonus: 59611, total: 568752 },
    bonusCandidates: [
      candidate(59611, "baseline-score-preprocess-3x-psm7"),
      candidate(59611, "invert-normalize-3x-psm7"),
    ],
  },
  {
    stage: 1,
    side: "self",
    oldValues: { members: [95850, 261366, 169529], bonus: 0, total: 579018 },
    newValues: { members: [95850, 261366, 169529], bonus: 52273, total: 579018 },
    bonusCandidates: [candidate(52273, "baseline-score-preprocess-3x-psm7")],
  },
  {
    stage: 1,
    side: "self",
    oldValues: { members: [96589, 99732, 216398], bonus: 0, total: 455998 },
    newValues: { members: [96589, 99732, 216398], bonus: 43279, total: 455998 },
    bonusCandidates: [candidate(43279, "invert-normalize-3x-psm7")],
  },
  {
    stage: 1,
    side: "enemy",
    oldValues: { members: [201, 0, 0], bonus: 1, total: 201 },
    newValues: { members: [201, 0, 0], bonus: 0, total: 201 },
    bonusCandidates: [candidate(0)],
  },
];

const positiveRows = [
  makeRow(expectedApplications[0]),
  makeRow({ ...expectedApplications[0], stage: 1 }),
  makeRow(expectedApplications[1]),
  makeRow(expectedApplications[1]),
  makeRow(expectedApplications[2]),
  makeRow(expectedApplications[3]),
  makeRow(expectedApplications[4]),
];

function buildStageScores(rows) {
  const stageScores = {
    1: { self: ["", "", ""], enemy: ["", "", ""], selfTotal: "", enemyTotal: "" },
    2: { self: ["", "", ""], enemy: ["", "", ""], selfTotal: "", enemyTotal: "" },
    3: { self: ["", "", ""], enemy: ["", "", ""], selfTotal: "", enemyTotal: "" },
  };
  for (const row of rows) {
    const { stage, side, evidence } = row;
    stageScores[stage][side] = evidence.currentPrimary.members.map(format);
    stageScores[stage][sideKey(side)] = format(evidence.currentPrimary.total);
    const otherSide = sides.find((item) => item !== side);
    if (!stageScores[stage][otherSide].some(Boolean)) {
      stageScores[stage][otherSide] = ["1", "1", "1"];
      stageScores[stage][sideKey(otherSide)] = "3";
    }
  }
  return stageScores;
}

function evidencePayload(rows) {
  const payload = { stages: {} };
  for (const row of rows) {
    const stageKey = `stage${row.stage}`;
    payload.stages[stageKey] ||= {};
    payload.stages[stageKey][row.side] = { evidence: row.evidence };
  }
  return payload;
}

function assertApplications(result, count) {
  const applied = result.productionRecovery.appliedCases;
  assert.equal(applied.length, count);
  for (const application of applied) {
    assert.equal(application.recoveryId, IPAD_STAGE12_STRICT_BONUS_SELECTION_V2_RECOVERY_ID);
    assert.deepEqual(application.changedFields, ["bonus"]);
    assert.deepEqual(application.oldValues.members, application.newValues.members);
    assert.equal(application.oldValues.total, application.newValues.total);
    assert.notEqual(application.oldValues.bonus, application.newValues.bonus);
  }
}

function applyRows(rows, options) {
  const results = rows.map((row) =>
    applyIpadStage12StrictBonusSelectionV2Recovery(
      buildStageScores([row]),
      evidencePayload([row]),
      options
    )
  );
  return {
    results,
    applications: results.flatMap((result) => result.productionRecovery.appliedCases),
  };
}

const offResults = applyRows(positiveRows, { enabled: false });
assert.equal(offResults.applications.length, 0);
for (const result of offResults.results) {
  assert.equal(result.productionRecovery.blockReason, "feature-disabled");
}

const onResults = applyRows(positiveRows);
assert.equal(onResults.applications.length, 7);
for (const application of onResults.applications) {
  assert.equal(application.recoveryId, IPAD_STAGE12_STRICT_BONUS_SELECTION_V2_RECOVERY_ID);
  assert.deepEqual(application.changedFields, ["bonus"]);
  assert.deepEqual(application.oldValues.members, application.newValues.members);
  assert.equal(application.oldValues.total, application.newValues.total);
  assert.notEqual(application.oldValues.bonus, application.newValues.bonus);
}

const negativeRows = [
  makeRow({
    stage: 3,
    side: "self",
    oldValues: { members: [298058, 88866, 122217], bonus: 1, total: 568752 },
    newValues: { members: [298058, 88866, 122217], bonus: 59611, total: 568752 },
    bonusCandidates: [candidate(59611)],
  }),
  makeRow({
    stage: 1,
    side: "self",
    oldValues: { members: [1000, 2000, 3000], bonus: 0, total: 6000 },
    newValues: { members: [1000, 2000, 3000], bonus: 0, total: 6000 },
    bonusCandidates: [],
  }),
  makeRow({
    stage: 1,
    side: "self",
    oldValues: { members: [1000, 2000, 3000], bonus: 0, total: 6007 },
    newValues: { members: [1000, 2000, 3000], bonus: 7, total: 6007 },
    bonusCandidates: [candidate(7)],
  }),
  makeRow({
    stage: 1,
    side: "self",
    oldValues: { members: [1000, 2000, 3000], bonus: 0, total: 7234 },
    newValues: { members: [1000, 2000, 3000], bonus: 1234, total: 7234 },
    bonusCandidates: [candidate(1234)],
  }),
  makeRow({
    stage: 1,
    side: "self",
    oldValues: { members: [1000, 2000, 3000], bonus: 1, total: 7000 },
    newValues: { members: [1000, 2000, 3000], bonus: 1000, total: 7000 },
    bonusCandidates: [],
  }),
];
negativeRows[3].evidence.fieldCandidatePools.member1.candidates.push(candidate(91234));
const missingMemberRow = makeRow({
  stage: 1,
  side: "self",
  oldValues: { members: [1000, 2000, 3000], bonus: 1, total: 7000 },
  newValues: { members: [1000, 2000, 3000], bonus: 1000, total: 7000 },
  bonusCandidates: [candidate(1000)],
});
missingMemberRow.evidence.currentPrimary.members = [1000, 2000];
const missingTotalRow = makeRow({
  stage: 1,
  side: "self",
  oldValues: { members: [1000, 2000, 3000], bonus: 1, total: 7000 },
  newValues: { members: [1000, 2000, 3000], bonus: 1000, total: 7000 },
  bonusCandidates: [candidate(1000)],
});
missingTotalRow.evidence.currentPrimary.total = null;
const malformedCandidateRow = makeRow({
  stage: 1,
  side: "self",
  oldValues: { members: [1000, 2000, 3000], bonus: 1, total: 6000 },
  newValues: { members: [1000, 2000, 3000], bonus: 0, total: 6000 },
  bonusCandidates: [candidate("not-a-number")],
});
const multipleValidRow = makeRow({
  stage: 1,
  side: "self",
  oldValues: { members: [1000, 2000, 3000], bonus: 0, total: 7234 },
  newValues: { members: [1000, 2000, 3000], bonus: 1234, total: 7234 },
  bonusCandidates: [candidate(1234)],
});
const multipleValidEvaluation = evaluateIpadStage12StrictBonusSelectionV2(
  multipleValidRow.evidence
);
const multipleValidPayload = evidencePayload([multipleValidRow]);
multipleValidPayload.stages.stage1.self.evaluation = {
  ...multipleValidEvaluation,
  validBonusValues: [1234, 2234],
  matchingCandidateCount: 2,
};

const negativeResults = applyRows([
  ...negativeRows.slice(1),
  missingMemberRow,
  missingTotalRow,
  malformedCandidateRow,
]);
assert.equal(negativeResults.applications.length, 0);
const rejectionReasons = negativeResults.results
  .flatMap((result) => result.productionRecovery.rejectedCases)
  .map((row) => row.reason)
  .join("\n");
assert.match(rejectionReasons, /current-bonus-already-arithmetic-valid/);
assert.match(rejectionReasons, /nonzero-bonus-too-small/);
assert.match(rejectionReasons, /fragment-hazard/);
assert.match(rejectionReasons, /required-bonus-not-observed/);
assert.match(rejectionReasons, /malformed-or-incomplete-current-members/);
assert.match(rejectionReasons, /malformed-or-missing-current-total/);
assert.match(rejectionReasons, /proposal-bonus-not-backed-by-integer-candidate/);
const multipleValidResult = applyIpadStage12StrictBonusSelectionV2Recovery(
  buildStageScores([multipleValidRow]),
  multipleValidPayload
);
assertApplications(multipleValidResult, 0);
assert.match(
  multipleValidResult.productionRecovery.rejectedCases[0].reason,
  /evaluator-uniqueness-assertion-failed/
);
const stage3Result = applyIpadStage12StrictBonusSelectionV2Recovery(
  buildStageScores([negativeRows[0]]),
  evidencePayload([negativeRows[0]])
);
assertApplications(stage3Result, 0);
assert.equal(stage3Result.productionRecovery.counters.evaluated, 0);

console.log(
  JSON.stringify(
    {
      pass: true,
      featureOffApplications: offResults.applications.length,
      featureOnApplications: onResults.applications.length,
      negativeApplications: negativeResults.applications.length,
      multipleValidApplications:
        multipleValidResult.productionRecovery.appliedCases.length,
      recoveryId: IPAD_STAGE12_STRICT_BONUS_SELECTION_V2_RECOVERY_ID,
    },
    null,
    2
  )
);
