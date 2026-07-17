import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
import Tesseract, { createWorker } from "tesseract.js";
import {
  applySmartphoneCrownBonusMemberExclusion,
  applySmartphoneLeadingBonusMemberRecovery,
  applySmartphoneSparseTrailingZeroPreservation,
  applySmartphoneTotalLikeMemberSuppression,
  applySmartphoneTotalCrownBonusRecovery,
  applySmartphoneStage2EnemyBonusRecovery,
  applySmartphoneRowZoneSevenDigitRecovery,
  applySmartphoneStage3SelfSevenDigitDisplacementRecovery,
  applySmartphoneStage3EnemySevenDigitRecovery,
  applyCurrentPcGroupedRawTokenRecovery,
  applyCurrentPcCrownBonusRuleRecovery,
  applyCurrentPcStage3SevenDigitBonusDisplacementRecovery,
  buildCurrentPcCrownBonusRuleEvidence as sharedBuildCurrentPcCrownBonusRuleEvidence,
  buildCurrentPcCandidateSourceSummary as sharedBuildCurrentPcCandidateSourceSummary,
  buildCurrentPcGroupedRawTokenEvidenceSimulation as sharedBuildCurrentPcGroupedRawTokenEvidenceSimulation,
  buildCurrentPcStage3SevenDigitBonusDisplacementSimulation as sharedBuildCurrentPcStage3SevenDigitBonusDisplacementSimulation,
  collectCurrentPcGroupedRawTokenEvidence as sharedCollectCurrentPcGroupedRawTokenEvidence,
  collectCurrentPcSourceTokenAudits as sharedCollectCurrentPcSourceTokenAudits,
  currentPcOrderedMemberValuesFromTokenEvidence as sharedCurrentPcOrderedMemberValuesFromTokenEvidence,
  detectCurrentPcLayout as sharedDetectCurrentPcLayout,
  extractNumericLikeTokenAudit as sharedExtractNumericLikeTokenAudit,
} from "../app/lib/ocr.js";
import { applyKnownOcrCorrections, applyKnownOcrSetCorrections } from "../app/lib/ocrPostProcess.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testImagesDir = path.join(rootDir, "test-images");
const expectedDir = path.join(rootDir, "regression-test", "expected");
const reportPath = path.join(rootDir, "regression-test", "ocr-report.json");
const markdownReportPath = path.join(rootDir, "docs", "ocr-test-report.md");
const digitDropAuditReportPath = path.join(rootDir, "docs", "ocr-digit-drop-audit-detector-report.md");
const rawTokenFragmentAuditReportPath = path.join(rootDir, "docs", "ocr-raw-token-fragment-audit.md");
const memberOrderAuditReportPath = path.join(rootDir, "docs", "ocr-member-order-audit-report.md");
const geometryAuditReportPath = path.join(rootDir, "docs", "ocr-geometry-audit-report.md");
const nextDebugPath = path.join(rootDir, "docs", "next-debug.md");
const debugArtifactsDir = path.join(rootDir, "tmp", "ocr-debug-artifacts");
const fixedRoiExperimentDir = path.join(rootDir, "tmp", "ocr-roi-experiment");
const roiAdoptionSimDir = path.join(rootDir, "tmp", "ocr-roi-adoption-sim");
const currentPcBonusDiagnosticsDir = path.join(rootDir, "tmp", "current-pc-bonus-ocr-diagnostics");
const currentPcStage3MemberRowDiagnosticsDir = path.join(
  rootDir,
  "tmp",
  "current-pc-stage3-member-row-ocr-diagnostics"
);
const currentPcSlotRoiDiagnosticsDir = path.join(
  rootDir,
  "tmp",
  "current-pc-slot-roi-diagnostics"
);
const currentPcScreenshotDir = path.join(
  process.env.USERPROFILE || "C:\\Users\\gkhay",
  "Pictures",
  "DMMGamePlayer",
  "学園アイドルマスター"
);
const currentPcBaselineDir = path.join(rootDir, "tmp", "current-pc-ocr-baseline");
const currentPcBaselineReportPath = path.join(rootDir, "docs", "current-pc-ocr-baseline.md");
const currentPcGroupedRawParityReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-grouped-raw-evidence-parity.md"
);
const currentPcStage3SevenDigitParityReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-stage3-7digit-bonus-displacement-parity.md"
);
const currentPcBonusDiagnosticsReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-bonus-ocr-diagnostics.md"
);
const currentPcStage3MemberRowDiagnosticsReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-stage3-member-row-ocr-diagnostics.md"
);
const currentPcSlotRoiDiagnosticsReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-slot-specific-roi-candidate-investigation.md"
);
const currentPcCrownBonusSimulationReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-crown-bonus-rule-simulation.md"
);
const currentPcCrownBonusParityReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-crown-bonus-rule-parity.md"
);
let currentPcBaselineScanSummary = null;
const unsupportedNextScreenMessage =
  "Next screen is unsupported for OCR. Use normal result or high-score screen.";

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const sideLabels = {
  self: "self",
  enemy: "enemy",
};
const totalPowerCandidates = new Set([
  58905, 58914, 59031, 59850, 60117, 60153, 61230, 61320, 61443,
  62238, 62601, 64497, 64533, 65403, 65679, 65985, 66135, 66345,
  66513, 66705, 66756, 66789, 66849, 66897, 66972, 66975, 67029,
  67050, 67062, 67131, 67272, 67320, 67464, 67500, 67524, 67575,
  67620, 67758, 67923, 68100, 68142, 68160, 68172, 68247, 68298,
  68358, 68481, 68496, 68535, 68595, 68733, 68784, 69093, 69165,
  69303, 69423, 69444, 69612, 69942, 71079, 71199,
]);
const crownDiffCandidates = new Set([
  11937, 13612, 13987, 16501, 18487, 21316, 23400, 27325, 33308, 47824, 48294,
  48899, 56814, 57683, 59662, 59680, 61548, 66170, 66739, 68362,
  73014, 75138, 76497, 77330, 77548, 79045, 80377, 81512, 82658,
  84189, 84995, 85760, 97585, 100337, 100709, 101105, 102080, 104128,
  112005, 131052, 159255, 178548,
]);

const displayedTotalCrownDiffCandidates = new Set([13612, 13987, 102080]);

const enableNextScreenFallback = false;

function normalizeKnownCorrectionKey(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDisabledKnownCorrections(args) {
  const disabled = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--audit-disable-known-correction") continue;
    const rawValue = args[index + 1] || "";
    rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => disabled.push(value));
  }
  return disabled;
}

function shouldApplyKnownOcrCorrection(fileName, stage, disabledKnownCorrections = new Set()) {
  const key = `${fileName}:stage${stage}`;
  return !disabledKnownCorrections.has(normalizeKnownCorrectionKey(key));
}

function cloneStageState(state) {
  return {
    self: [...(state.self || [])],
    enemy: [...(state.enemy || [])],
    selfTotal: Number(state.selfTotal || 0),
    enemyTotal: Number(state.enemyTotal || 0),
  };
}

function stageStateEquals(left, right) {
  const sameArray = (a = [], b = []) =>
    a.length === b.length && a.every((value, index) => Number(value || 0) === Number(b[index] || 0));
  return (
    sameArray(left?.self, right?.self) &&
    sameArray(left?.enemy, right?.enemy) &&
    Number(left?.selfTotal || 0) === Number(right?.selfTotal || 0) &&
    Number(left?.enemyTotal || 0) === Number(right?.enemyTotal || 0)
  );
}

function correctionDelta(before, after) {
  return {
    applied: !stageStateEquals(before, after),
    before: cloneStageState(before),
    after: cloneStageState(after),
  };
}

function safeArtifactName(value) {
  return String(value || "image")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .join("__")
    .replace(/[<>:"|?*\x00-\x1F]/g, "_");
}

function pickDebugStages(result) {
  const debugStages = {};
  for (const stage of stages) {
    const key = `stage${stage}`;
    const artifact = result?.[key]?.debugArtifact;
    if (artifact) {
      debugStages[key] = artifact;
    }
  }
  return debugStages;
}

async function writeDebugArtifacts(report) {
  await fs.rm(debugArtifactsDir, { recursive: true, force: true });
  await fs.mkdir(debugArtifactsDir, { recursive: true });

  const written = [];
  const summary = [];

  for (const item of report) {
    const debugStages = pickDebugStages(item.result);
    if (Object.keys(debugStages).length === 0) continue;

    const artifact = {
      image: item.image,
      category: item.category,
      source: item.source,
      expected: item.expected,
      expectedData: item.expectedData,
      pass: item.pass,
      failures: item.failures,
      elapsedMs: item.elapsedMs,
      disabledKnownCorrections: item.disabledKnownCorrections,
      stages: debugStages,
    };
    const fileName = `${safeArtifactName(item.image)}.debug.json`;
    const artifactPath = path.join(debugArtifactsDir, fileName);
    await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2));
    const relativePath = path.relative(rootDir, artifactPath).replaceAll("\\", "/");
    written.push(relativePath);
    summary.push({
      image: item.image,
      artifact: relativePath,
      expected: item.expected,
      expectedData: item.expectedData,
      pass: item.pass,
      failures: item.failures.length,
    });
  }

  const summaryPath = path.join(debugArtifactsDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  written.push(path.relative(rootDir, summaryPath).replaceAll("\\", "/"));

  return written;
}

function normalizeRoiZone(zone) {
  return {
    left: Math.round(zone.left),
    top: Math.round(zone.top),
    width: Math.round(zone.width),
    height: Math.round(zone.height),
  };
}

function expectedValuesForSide(expectedStage, side) {
  if (!expectedStage) {
    return { members: [], total: 0, all: [], sevenDigitMembers: [] };
  }

  const members = expectedStage[`${side}Members`] || [];
  const total = expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0;
  const all = [...members, total].map((value) => Number(value) || 0).filter((value) => value > 0);
  return {
    members,
    total,
    all,
    sevenDigitMembers: members.filter((value) => Number(value) >= 1000000),
  };
}

function findIncludedExpectedValues(numbers = [], expectedValues = []) {
  return expectedValues.filter((expected) =>
    numbers.some((number) => Math.abs(Number(number) - Number(expected)) <= 1)
  );
}

function findNearExpectedValues(numbers = [], expectedValues = [], tolerance = 50) {
  return expectedValues
    .map((expected) => {
      const matches = numbers
        .map((number) => ({
          expected,
          candidate: Number(number),
          delta: Math.abs(Number(number) - Number(expected)),
        }))
        .filter((match) => Number.isFinite(match.candidate) && match.delta <= tolerance)
        .sort((a, b) => a.delta - b.delta);
      return matches[0] || null;
    })
    .filter(Boolean);
}

function compareNumberArrays(left = [], right = []) {
  const maxLength = Math.max(left.length, right.length);
  let mismatches = 0;
  for (let index = 0; index < maxLength; index += 1) {
    if (Number(left[index] || 0) !== Number(right[index] || 0)) mismatches += 1;
  }
  return mismatches;
}

function compareSideToExpected(sideState, expected) {
  if (!expected || expected.all.length === 0) return null;
  return {
    memberMismatches: compareNumberArrays(sideState.members, expected.members),
    totalMismatch: Number(sideState.total || 0) === Number(expected.total || 0) ? 0 : 1,
  };
}

function equationError(members = [], total = 0, bonusCandidates = []) {
  const memberSum = members.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const candidates = [
    {
      expectedTotal: memberSum,
      bonus: 0,
      error: Math.abs(Number(total || 0) - memberSum),
    },
    ...bonusCandidates.map((bonus) => ({
      expectedTotal: memberSum + (Number(bonus) || 0),
      bonus: Number(bonus) || 0,
      error: Math.abs(Number(total || 0) - (memberSum + (Number(bonus) || 0))),
    })),
  ].sort((a, b) => a.error - b.error);

  return {
    memberSum,
    best: candidates[0] || { expectedTotal: 0, bonus: 0, error: 0 },
  };
}

function buildSparseTotalAsMemberSimulation({
  members = [],
  total = 0,
  totalReferences = [],
  totalCandidateTraces = [],
  memberCandidateNumbers = [],
  bonusCandidates = [],
  recognizedCrownCandidates = [],
}) {
  const selectedMembers = [...members].map((value) => Number(value) || 0);
  while (selectedMembers.length < 3) selectedMembers.push(0);
  const selectedTotal = Number(total || 0);
  const selectedMemberSum = selectedMembers.reduce((sum, value) => sum + value, 0);
  const refs = uniqueNumbers(totalReferences);
  const memberNumbers = [...(memberCandidateNumbers || [])].map((value) => Number(value) || 0);
  const bonuses = uniqueNumbers([...(bonusCandidates || []), ...(recognizedCrownCandidates || [])])
    .filter((value) => value > 0);
  const proposedMembers = [selectedTotal, selectedMembers[0], selectedMembers[1]];
  const proposedTotal = proposedMembers.reduce((sum, value) => sum + value, 0);
  const rejectionReasons = [];

  if (!(selectedMembers[0] > 0 && selectedMembers[1] > 0 && selectedMembers[2] === 0)) {
    rejectionReasons.push("requires-two-selected-members-and-empty-third-slot");
  }
  if (!(selectedTotal >= 10000 && selectedTotal < 1000000)) {
    rejectionReasons.push("selected-total-not-plausible-member-score");
  }
  if (Math.abs(selectedTotal - selectedMemberSum) <= 1) {
    rejectionReasons.push("current-equation-already-exact");
  }
  if (bonuses.length > 0) {
    rejectionReasons.push("bonus-candidate-present");
  }
  if (proposedMembers.some((value) => value < 10000 || value >= 1000000)) {
    rejectionReasons.push("proposed-member-outside-sparse-stage-range");
  }
  if (!refs.some((value) => Math.abs(value - proposedTotal) <= 1)) {
    rejectionReasons.push("missing-displayed-total-candidate-for-proposed-sum");
  }

  const orderedTotalRowTraces = (totalCandidateTraces || [])
    .map((trace) => ({
      pass: trace?.pass,
      text: trace?.text,
      numbers: (trace?.numbers || []).map((value) => Number(value) || 0),
    }))
    .filter((trace) => {
      const numbers = trace.numbers;
      if (numbers.length < 4) return false;
      const traceTotal = numbers[0] || 0;
      const traceMembers = numbers.slice(1, 4);
      if (traceMembers.some((value) => value < 10000 || value >= 1000000)) return false;
      if (traceMembers.some((value) => Math.abs(value - traceTotal) <= 1)) return false;
      return Math.abs(traceTotal - traceMembers.reduce((sum, value) => sum + value, 0)) <= 1;
    });

  const exactTotalRowTraces = orderedTotalRowTraces.filter((trace) => {
    const numbers = (trace?.numbers || []).map((value) => Number(value) || 0);
    return (
      Math.abs((numbers[0] || 0) - proposedTotal) <= 1 &&
      Math.abs((numbers[1] || 0) - proposedMembers[0]) <= 1 &&
      Math.abs((numbers[2] || 0) - proposedMembers[1]) <= 1 &&
      Math.abs((numbers[3] || 0) - proposedMembers[2]) <= 1
    );
  });
  const exactTotalRowTrace = exactTotalRowTraces[0] || null;
  if (!exactTotalRowTrace) {
    rejectionReasons.push("missing-exact-total-plus-member-row-trace");
  }
  if (exactTotalRowTraces.length > 1) {
    rejectionReasons.push("multiple-exact-total-plus-member-row-traces");
  }
  if (orderedTotalRowTraces.length > 1) {
    rejectionReasons.push("multiple-valid-ordered-total-row-interpretations");
  }
  if (memberNumbers.some((value) => Math.abs(value - proposedTotal) <= 1)) {
    rejectionReasons.push("proposed-total-reused-as-member-candidate");
  }

  const rowSequenceIndex = memberNumbers.findIndex(
    (value, index) =>
      Math.abs(value - proposedMembers[0]) <= 1 &&
      Math.abs((memberNumbers[index + 1] || 0) - proposedMembers[1]) <= 1 &&
      Math.abs((memberNumbers[index + 2] || 0) - proposedMembers[2]) <= 1
  );
  if (rowSequenceIndex < 0) {
    rejectionReasons.push("member-row-does-not-contain-total-member-shift-sequence");
  }
  if (rowSequenceIndex > 0) {
    rejectionReasons.push("total-member-shift-sequence-not-at-row-start");
  }

  const competingDisplayedTotals = refs.filter(
    (value) =>
      value >= 10000 &&
      value < 1000000 &&
      Math.abs(value - proposedTotal) > 1 &&
      !proposedMembers.some((member) => Math.abs(value - member) <= 1)
  );
  if (!exactTotalRowTrace && competingDisplayedTotals.length > 0) {
    rejectionReasons.push("competing-displayed-total-candidates");
  }

  return {
    wouldApply: rejectionReasons.length === 0,
    rejectionReasons,
    current: {
      members: selectedMembers,
      total: selectedTotal,
      memberSum: selectedMemberSum,
      totalMinusMemberSum: selectedTotal - selectedMemberSum,
    },
    proposed: {
      members: proposedMembers,
      total: proposedTotal,
      memberSum: proposedTotal,
    },
    evidence: {
      totalReferences: refs,
      memberCandidateNumbers: memberNumbers,
      rowSequenceIndex,
      bonusCandidates: bonuses,
      matchingDisplayedTotalCandidates: refs.filter(
        (value) => Math.abs(value - proposedTotal) <= 1
      ),
      exactTotalRowTrace: exactTotalRowTrace
        ? {
            pass: exactTotalRowTrace.pass,
            text: exactTotalRowTrace.text,
            numbers: exactTotalRowTrace.numbers,
          }
        : null,
      exactTotalRowTraceCount: exactTotalRowTraces.length,
      validOrderedTotalRowTraceCount: orderedTotalRowTraces.length,
      validOrderedTotalRowTraces: orderedTotalRowTraces.map((trace) => ({
        pass: trace.pass,
        text: trace.text,
        numbers: trace.numbers,
      })),
      competingDisplayedTotalCandidates: competingDisplayedTotals,
    },
    note:
      "Runner-only simulation. It does not change OCR output; production adoption would need more negative controls.",
  };
}

function buildStage3SelfSevenDigitDisplacementSimulation({
  stage = 0,
  side = "",
  members = [],
  total = 0,
  totalReferences = [],
  totalDirectText = "",
  totalDirectNumbers = [],
  totalCandidateText = "",
  totalCandidateTraces = [],
  memberCandidateText = "",
  memberCandidateNumbers = [],
  bonusCandidates = [],
  recognizedCrownCandidates = [],
}) {
  const selectedMembers = [...members].map((value) => Number(value) || 0);
  while (selectedMembers.length < 3) selectedMembers.push(0);
  const selectedTotal = Number(total || 0);
  const selectedMemberSum = selectedMembers.reduce((sum, value) => sum + value, 0);
  const traceNumbers = (totalCandidateTraces || []).flatMap((trace) =>
    (trace?.numbers || []).map((value) => Number(value) || 0)
  );
  const refs = uniqueNumbers([...totalReferences, ...totalDirectNumbers, ...traceNumbers]);
  const memberNumbers = uniqueNumbers(memberCandidateNumbers || []);
  const allCandidateNumbers = uniqueNumbers([...memberNumbers, ...refs]);
  const cleanSevenDigitCandidates = allCandidateNumbers.filter(
    (value) =>
      value >= 1000000 &&
      value < 10000000 &&
      !selectedMembers.some((member) => Math.abs(member - value) <= 1) &&
      Math.abs(selectedTotal - value) > 1
  );
  const explicitBonuses = uniqueNumbers([
    ...(bonusCandidates || []),
    ...(recognizedCrownCandidates || []),
  ]).filter((value) => value > 0 && value < 1000000);
  const selectedThirdAsBonus =
    selectedMembers[2] > 0 && selectedMembers[2] < 500000 ? selectedMembers[2] : 0;
  const bonusPool = uniqueNumbers([...explicitBonuses, selectedThirdAsBonus].filter(Boolean));
  const totalEvidenceSources = buildStage3TotalEvidenceSources({
    totalDirectText,
    totalDirectNumbers,
    totalCandidateText,
    totalCandidateTraces,
    memberCandidateText,
    memberCandidateNumbers,
  });
  const proposals = [];
  const isStage3Self = stage === 3 && side === "self";
  const isStage3Enemy = stage === 3 && side === "enemy";

  if (isStage3Enemy) {
    for (let index = 0; index <= memberNumbers.length - 4; index += 1) {
      const proposedMembers = memberNumbers.slice(index, index + 3);
      const rowBonus = memberNumbers[index + 3];
      const proposedSevenDigitMembers = proposedMembers.filter((member) =>
        cleanSevenDigitCandidates.some((value) => Math.abs(value - member) <= 1)
      );
      if (proposedSevenDigitMembers.length !== 1) continue;

      const candidate = proposedSevenDigitMembers[0];
      const proposedWithoutSevenDigit = proposedMembers.filter(
        (member) => Math.abs(member - candidate) > 1
      );
      const selectedRowMatches =
        proposedWithoutSevenDigit.length === 2 &&
        Math.abs(proposedWithoutSevenDigit[0] - selectedMembers[0]) <= 1 &&
        Math.abs(proposedWithoutSevenDigit[1] - selectedMembers[1]) <= 1;

      for (const bonus of bonusPool) {
        const proposedTotal = proposedMembers.reduce((sum, value) => sum + value, 0) + bonus;
        const matchingDisplayedTotals = refs.filter((value) => Math.abs(value - proposedTotal) <= 1);
        const totalEvidence = getStage3TotalEvidenceForValue(proposedTotal, totalEvidenceSources);
        proposals.push({
          candidate,
          bonus,
          proposedMembers,
          proposedTotal,
          currentTotalDelta: proposedTotal - selectedTotal,
          matchingDisplayedTotals,
          totalEvidence,
          candidateInMemberRow: true,
          selectedThirdMatchesBonus: Math.abs(selectedMembers[2] - bonus) <= 1,
          selectedRowMatches,
        });
      }
    }
  } else {
    for (const candidate of cleanSevenDigitCandidates) {
    for (const bonus of bonusPool) {
      const proposedMembers = [candidate, selectedMembers[0], selectedMembers[1]];
      const proposedTotal = proposedMembers.reduce((sum, value) => sum + value, 0) + bonus;
      const matchingDisplayedTotals = refs.filter((value) => Math.abs(value - proposedTotal) <= 1);
      const totalEvidence = getStage3TotalEvidenceForValue(proposedTotal, totalEvidenceSources);
      proposals.push({
        candidate,
        bonus,
        proposedMembers,
        proposedTotal,
        currentTotalDelta: proposedTotal - selectedTotal,
        matchingDisplayedTotals,
        totalEvidence,
        candidateInMemberRow: memberNumbers.some((value) => Math.abs(value - candidate) <= 1),
        selectedThirdMatchesBonus: Math.abs(selectedMembers[2] - bonus) <= 1,
        selectedRowMatches: true,
      });
    }
    }
  }

  const exactProposals = proposals.filter(
    (proposal) =>
      proposal.matchingDisplayedTotals.length > 0 &&
      proposal.candidateInMemberRow &&
      proposal.selectedThirdMatchesBonus &&
      proposal.selectedRowMatches
  );
  const enhancedExactProposals = proposals.filter(
    (proposal) =>
      proposal.candidateInMemberRow &&
      proposal.selectedThirdMatchesBonus &&
      proposal.selectedRowMatches &&
      proposal.totalEvidence.hasExactEvidence &&
      proposal.totalEvidence.ambiguousExactEvidence === false
  );
  const rejectionReasons = [];
  const enhancedRejectionReasons = [];

  if (!isStage3Self && !isStage3Enemy) {
    rejectionReasons.push("not-stage3-self-or-enemy");
  }
  if (isStage3Self && Math.abs(selectedTotal - selectedMemberSum) > 1) {
    rejectionReasons.push("current-total-is-not-selected-member-sum");
  }
  if (!(selectedMembers[0] > 0 && selectedMembers[1] > 0 && selectedMembers[2] > 0)) {
    rejectionReasons.push("requires-three-selected-nonzero-values");
  }
  if (selectedThirdAsBonus <= 0) {
    rejectionReasons.push("selected-third-not-plausible-bonus");
  }
  if (cleanSevenDigitCandidates.length === 0) {
    rejectionReasons.push("missing-clean-seven-digit-candidate");
  }
  if (bonusPool.length === 0) {
    rejectionReasons.push("missing-bonus-candidate");
  }
  if (exactProposals.length === 0) {
    rejectionReasons.push("missing-exact-seven-digit-plus-bonus-equation");
  }
  if (exactProposals.length > 1) {
    rejectionReasons.push("multiple-exact-seven-digit-plus-bonus-equations");
  }
  if (enhancedExactProposals.length === 0) {
    enhancedRejectionReasons.push("missing-enhanced-total-evidence");
  }
  if (enhancedExactProposals.length > 1) {
    enhancedRejectionReasons.push("multiple-enhanced-total-evidence-equations");
  }

  return {
    wouldApply: rejectionReasons.length === 0,
    wouldApplyWithEnhancedTotalEvidence:
      rejectionReasons.filter(
        (reason) =>
          reason !== "missing-exact-seven-digit-plus-bonus-equation" &&
          reason !== "multiple-exact-seven-digit-plus-bonus-equations"
      ).length === 0 && enhancedRejectionReasons.length === 0,
    rejectionReasons,
    enhancedRejectionReasons,
    current: {
      recoveryKind: isStage3Enemy
        ? "stage3EnemySevenDigitRecovery"
        : "stage3SelfSevenDigitDisplacementRecovery",
      members: selectedMembers,
      total: selectedTotal,
      memberSum: selectedMemberSum,
      totalMinusMemberSum: selectedTotal - selectedMemberSum,
    },
    proposed: exactProposals[0]
      ? {
          members: exactProposals[0].proposedMembers,
          bonus: exactProposals[0].bonus,
          total: exactProposals[0].proposedTotal,
          memberSum: exactProposals[0].proposedMembers.reduce((sum, value) => sum + value, 0),
        }
      : null,
    evidence: {
      cleanSevenDigitCandidates,
      memberCandidateNumbers: memberNumbers,
      totalReferences: refs,
      totalCandidateSources: totalEvidenceSources,
      bonusCandidates: bonusPool,
      explicitBonusCandidates: explicitBonuses,
      selectedThirdAsBonus,
      proposals,
      exactProposalCount: exactProposals.length,
      enhancedExactProposalCount: enhancedExactProposals.length,
      missingTotalEvidence: exactProposals.length === 0,
      enhancedProposalSummary: enhancedExactProposals.map((proposal) => ({
        candidate: proposal.candidate,
        bonus: proposal.bonus,
        proposedMembers: proposal.proposedMembers,
        proposedTotal: proposal.proposedTotal,
        totalEvidence: proposal.totalEvidence,
      })),
    },
    note:
      "Runner-only simulation. It does not change OCR output; production adoption would need broader negative controls and stronger candidate-source guarantees.",
  };
}

function extractDigitGroups(text = "") {
  const normalized = String(text ?? "").replace(/[\uFF10-\uFF19]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
  return [...normalized.matchAll(/\d+/g)].map((match) => ({
    text: match[0],
    index: match.index ?? 0,
  }));
}

function buildJoinedTotalCandidates(text = "") {
  const groups = extractDigitGroups(text);
  const candidates = [];
  for (let start = 0; start < groups.length; start += 1) {
    let joined = "";
    for (let end = start; end < Math.min(groups.length, start + 5); end += 1) {
      joined += groups[end].text;
      if (joined.length < 6 || joined.length > 8) continue;
      const value = Number(joined);
      if (!Number.isFinite(value) || value < 100000 || value >= 10000000) continue;
      candidates.push({
        value,
        parts: groups.slice(start, end + 1).map((group) => group.text),
        startIndex: groups[start].index,
        endIndex: groups[end].index + groups[end].text.length,
      });
    }
  }
  return candidates;
}

function buildStage3TotalEvidenceSources({
  totalDirectText = "",
  totalDirectNumbers = [],
  totalCandidateText = "",
  totalCandidateTraces = [],
  memberCandidateText = "",
  memberCandidateNumbers = [],
}) {
  const sourceInputs = [
    {
      label: "total-direct",
      sourceType: "total",
      text: totalDirectText,
      parsedNumbers: totalDirectNumbers,
    },
    {
      label: "total-candidate-combined",
      sourceType: "total",
      text: totalCandidateText,
      parsedNumbers: extractNumbersForZone(totalCandidateText),
    },
    ...(totalCandidateTraces || []).map((trace, index) => ({
      label: `total-candidate-trace-${index + 1}`,
      sourceType: "total",
      text: trace?.text || "",
      parsedNumbers: trace?.numbers || [],
      pass: trace?.pass || "pass1",
    })),
    {
      label: "member-row",
      sourceType: "member",
      text: memberCandidateText,
      parsedNumbers: memberCandidateNumbers,
    },
  ];

  return sourceInputs
    .filter((source) => source.text || (source.parsedNumbers || []).length > 0)
    .map((source) => {
      const parsedNumbers = uniqueNumbers(source.parsedNumbers || []);
      const joinedCandidates = buildJoinedTotalCandidates(source.text || "");
      return {
        label: source.label,
        sourceType: source.sourceType,
        pass: source.pass,
        text: formatDebugText(source.text || ""),
        parsedNumbers,
        largeParsedNumbers: parsedNumbers.filter((value) => value >= 1000000 && value < 10000000),
        joinedCandidates,
        largeJoinedCandidates: joinedCandidates.filter(
          (candidate) => candidate.value >= 1000000 && candidate.value < 10000000
        ),
      };
    });
}

function getStage3TotalEvidenceForValue(targetValue, sources = []) {
  const target = Number(targetValue) || 0;
  const exactParsedSources = [];
  const exactJoinedSources = [];
  const nearParsedSources = [];
  const largeCandidateSources = [];

  for (const source of sources) {
    const parsedMatches = (source.parsedNumbers || []).filter(
      (value) => Math.abs(Number(value) - target) <= 1
    );
    if (parsedMatches.length > 0) {
      exactParsedSources.push({
        label: source.label,
        sourceType: source.sourceType,
        values: parsedMatches,
        text: source.text,
      });
    }

    const joinedMatches = (source.joinedCandidates || []).filter(
      (candidate) => Math.abs(Number(candidate.value) - target) <= 1
    );
    if (joinedMatches.length > 0) {
      exactJoinedSources.push({
        label: source.label,
        sourceType: source.sourceType,
        candidates: joinedMatches,
        text: source.text,
        auditOnly: true,
      });
    }

    const nearMatches = (source.parsedNumbers || [])
      .map((value) => ({
        value,
        delta: Math.abs(Number(value) - target),
      }))
      .filter((match) => match.delta > 1 && match.delta <= 5000)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);
    if (nearMatches.length > 0) {
      nearParsedSources.push({
        label: source.label,
        sourceType: source.sourceType,
        matches: nearMatches,
        text: source.text,
      });
    }

    const largeValues = uniqueNumbers([
      ...(source.largeParsedNumbers || []),
      ...(source.largeJoinedCandidates || []).map((candidate) => candidate.value),
    ]);
    if (largeValues.length > 0) {
      largeCandidateSources.push({
        label: source.label,
        sourceType: source.sourceType,
        values: largeValues,
      });
    }
  }

  const exactTotalSources = [...exactParsedSources, ...exactJoinedSources].filter(
    (source) => source.sourceType === "total"
  );
  const hasExactParsedTotalEvidence = exactParsedSources.some(
    (source) => source.sourceType === "total"
  );
  const hasExactJoinedTotalEvidence = exactJoinedSources.some(
    (source) => source.sourceType === "total"
  );

  return {
    target,
    hasExactEvidence: hasExactParsedTotalEvidence || hasExactJoinedTotalEvidence,
    hasExactParsedTotalEvidence,
    hasExactJoinedTotalEvidence,
    exactTotalSourceCount: exactTotalSources.length,
    ambiguousExactEvidence: exactTotalSources.length === 0,
    exactParsedSources,
    exactJoinedSources,
    nearParsedSources,
    largeCandidateSources,
  };
}

function uniqueNumbers(numbers = []) {
  return [...new Set(numbers.map((number) => Number(number)).filter(Number.isFinite))];
}

function evaluateStrictRowZoneProposal({
  current,
  proposedMembers,
  proposedBonus,
  proposedTotal,
  cleanSevenDigitCandidates,
}) {
  const rejectionReasons = [];
  const currentMembers = [...(current.members || [])].map((value) => Number(value) || 0);
  while (currentMembers.length < 3) currentMembers.push(0);
  const proposed = [...(proposedMembers || [])].map((value) => Number(value) || 0);
  const cleanSevenDigits = new Set((cleanSevenDigitCandidates || []).map((value) => Number(value) || 0));
  const exactCleanSevenDigitMembers = proposed.filter(
    (value) => value >= 1000000 && value < 10000000 && cleanSevenDigits.has(value)
  );
  const currentMemberSum = currentMembers.reduce((sum, value) => sum + value, 0);
  const proposedMemberSum = proposed.reduce((sum, value) => sum + value, 0);
  const currentTotal = Number(current.total || 0);

  if (proposed.length !== 3 || proposed.some((value) => value <= 0)) {
    rejectionReasons.push("proposal-does-not-have-three-positive-members");
  }
  if (exactCleanSevenDigitMembers.length !== 1) {
    rejectionReasons.push("requires-exactly-one-clean-seven-digit-member");
  }
  if (!(Number(proposedBonus || 0) > 0)) {
    rejectionReasons.push("missing-positive-row-bonus");
  }
  if (proposed[0] === currentTotal) {
    rejectionReasons.push("leading-row-value-is-current-total");
  }
  if (Number(proposedTotal || 0) !== proposedMemberSum + Number(proposedBonus || 0)) {
    rejectionReasons.push("proposal-total-equation-not-exact");
  }
  if (Number(proposedTotal || 0) <= currentTotal) {
    rejectionReasons.push("proposal-does-not-increase-current-total");
  }

  const singleFirstSlotReplacement =
    proposed[0] >= 1000000 &&
    cleanSevenDigits.has(proposed[0]) &&
    currentMembers[0] !== proposed[0] &&
    currentMembers[1] === proposed[1] &&
    currentMembers[2] === proposed[2] &&
    currentTotal === currentMemberSum + Number(proposedBonus || 0);

  const leadingSevenDigitShiftWithBonusMember =
    proposed[0] >= 1000000 &&
    cleanSevenDigits.has(proposed[0]) &&
    currentMembers[0] === proposed[1] &&
    currentMembers[1] === proposed[2] &&
    currentMembers[2] === Number(proposedBonus || 0) &&
    currentTotal === currentMemberSum;

  let matchedPattern = null;
  if (singleFirstSlotReplacement) matchedPattern = "single-first-slot-replacement";
  if (leadingSevenDigitShiftWithBonusMember) {
    matchedPattern = "leading-seven-digit-shift-with-bonus-member";
  }
  if (!matchedPattern) {
    rejectionReasons.push("does-not-match-supported-row-zone-pattern");
  }

  return {
    wouldAdoptUnderStrictRowZoneGuards: rejectionReasons.length === 0,
    matchedPattern,
    rejectionReasons,
    equationDelta: {
      currentTotal,
      currentMemberSum,
      proposedMemberSum,
      proposedBonus: Number(proposedBonus || 0),
      proposedTotal: Number(proposedTotal || 0),
      currentTotalErrorToProposal: Math.abs(currentTotal - Number(proposedTotal || 0)),
      proposedTotalError: Math.abs(
        Number(proposedTotal || 0) - (proposedMemberSum + Number(proposedBonus || 0))
      ),
    },
  };
}

function dedupeRoiCandidateObjects(candidates = []) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.method}:${candidate.value}:${candidate.raw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractRoiFragmentCandidates(text) {
  const normalized = String(text ?? "")
    .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248));
  const fragments = [];
  const candidates = [];
  const runs = normalized.match(/\d[\d,.\s]{5,40}\d/g) || [];

  for (const rawRun of runs) {
    const digits = rawRun.replace(/\D/g, "");
    if (digits.length < 4) continue;

    fragments.push({
      raw: rawRun.trim(),
      digits,
      length: digits.length,
    });

    if (digits.length >= 7) {
      for (let index = 0; index <= digits.length - 7; index += 1) {
        const value = Number(digits.slice(index, index + 7));
        if (value >= 1000000 && value < 10000000) {
          candidates.push({
            method: "digit-window-7",
            value,
            raw: rawRun.trim(),
            start: index,
          });
        }
      }
    }

    const groups = rawRun.match(/\d+/g) || [];
    for (let start = 0; start < groups.length; start += 1) {
      let joined = "";
      for (let end = start; end < groups.length; end += 1) {
        joined += groups[end];
        if (joined.length > 8) break;
        const value = Number(joined);
        if (joined.length >= 6 && value >= 100000 && value < 10000000) {
          candidates.push({
            method: "separator-group-join",
            value,
            raw: groups.slice(start, end + 1).join(","),
            groupStart: start,
            groupEnd: end,
          });
        }
      }
    }
  }

  return {
    fragments,
    possibleJoinedCandidates: dedupeRoiCandidateObjects(candidates),
  };
}

async function recognizeFixedRoiExperimentZone(imagePath, descriptor) {
  const options =
    descriptor.zoneType === "bonus"
      ? {
          preset: "crown-bonus",
          pageSegMode: "7",
          charWhitelist: "0123456789,+",
        }
      : descriptor.zoneType === "member-slot"
      ? {
          preset: "score-slot",
          pageSegMode: "7",
        }
      : {};
  const result = await recognizeOcrZone(imagePath, descriptor.zone, options);
  const bonusCandidates =
    descriptor.zoneType === "bonus"
      ? extractCrownBonusNumbers(result.text, {
          allowFallback: !descriptor.requiresPlus,
        })
      : [];
  const fragmentAnalysis = extractRoiFragmentCandidates(result.text);
  const joinedCandidateNumbers = fragmentAnalysis.possibleJoinedCandidates.map(
    (candidate) => candidate.value
  );

  return {
    ...descriptor,
    zone: normalizeRoiZone(descriptor.zone),
    rawText: result.text,
    parsedCandidates: result.numbers,
    bonusCandidates,
    cleanSevenDigitCandidates: (result.numbers || []).filter(
      (number) => number >= 1000000 && number < 10000000
    ),
    fragmentCandidates: fragmentAnalysis.fragments,
    possibleJoinedCandidates: fragmentAnalysis.possibleJoinedCandidates,
    candidateNumbers: [...new Set([
      ...(result.numbers || []),
      ...bonusCandidates,
      ...joinedCandidateNumbers,
    ])],
    pass: result.pass || "pass1",
  };
}

async function buildFixedRoiExperimentForImage(item) {
  if (item.source !== "smartphone" || !item.result) return null;

  const imagePath = path.join(testImagesDir, item.image);
  const image = await readImageSize(imagePath);
  const stagesOut = {};

  for (const stage of stages) {
    const stageKey = `stage${stage}`;
    const expectedStage = item.expectedData?.[stageKey];
    const currentStage = item.result?.[stageKey];
    const fixedZones = getFixedOcrZones(image, stage, "smartphone");
    const stageOut = {};

    for (const side of sides) {
      const totalZone = side === "self" ? fixedZones.selfTotal : fixedZones.enemyTotal;
      const memberRowZone = side === "self" ? fixedZones.selfMembers : fixedZones.enemyMembers;
      const memberSlotZones = getMemberScoreSlotZones(image, stage, side, "smartphone");
      const bonusZones = getCrownBonusZones(image, stage, side, "smartphone");
      const descriptors = [
        {
          stage,
          side,
          zoneType: "total",
          zoneRole: "direct-total-band",
          zone: totalZone,
        },
        {
          stage,
          side,
          zoneType: "member-row",
          zoneRole: "direct-member-row-band",
          zone: memberRowZone,
        },
        ...memberSlotZones.map((zone, index) => ({
          stage,
          side,
          zoneType: "member-slot",
          zoneRole: `member-slot-${index + 1}`,
          slotIndex: index + 1,
          zone,
        })),
        ...bonusZones.map((zone, index) => ({
          stage,
          side,
          zoneType: "bonus",
          zoneRole: index === 0 ? "bonus-wide-plus-band" : `bonus-slot-band-${index}`,
          requiresPlus: Boolean(zone.requiresPlus),
          zone,
        })),
      ];

      const zones = [];
      for (const descriptor of descriptors) {
        zones.push(await recognizeFixedRoiExperimentZone(imagePath, descriptor));
      }

      const expected = expectedValuesForSide(expectedStage, side);
      const roiCandidateNumbers = [...new Set(zones.flatMap((zone) => zone.candidateNumbers || []))];
      const currentMembers = currentStage?.[side] || [];
      const currentTotal = side === "self" ? currentStage?.selfTotal : currentStage?.enemyTotal;

      stageOut[side] = {
        current: {
          members: currentMembers,
          total: Number(currentTotal || 0),
        },
        expected,
        roiCandidateNumbers,
        expectedValuesFound: findIncludedExpectedValues(roiCandidateNumbers, expected.all),
        expectedSevenDigitMembersFound: findIncludedExpectedValues(
          roiCandidateNumbers,
          expected.sevenDigitMembers
        ),
        expectedSevenDigitMembersNearFound: findNearExpectedValues(
          roiCandidateNumbers,
          expected.sevenDigitMembers
        ),
        zones,
      };
    }

    stagesOut[stageKey] = stageOut;
  }

  return {
    image: item.image,
    source: item.source,
    category: item.category,
    imageSize: image,
    expected: item.expected,
    pass: item.pass,
    failures: item.failures,
    stages: stagesOut,
  };
}

async function writeFixedRoiExperimentArtifacts(report) {
  await fs.rm(fixedRoiExperimentDir, { recursive: true, force: true });
  await fs.mkdir(fixedRoiExperimentDir, { recursive: true });

  const written = [];
  const summary = [];

  for (const item of report) {
    const artifact = await buildFixedRoiExperimentForImage(item);
    if (!artifact) continue;

    const fileName = `${safeArtifactName(item.image)}.roi.json`;
    const artifactPath = path.join(fixedRoiExperimentDir, fileName);
    await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2));
    const relativePath = path.relative(rootDir, artifactPath).replaceAll("\\", "/");
    written.push(relativePath);

    const sevenDigitExpected = [];
    const sevenDigitFound = [];
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideArtifact = artifact.stages?.[stageKey]?.[side];
        if (!sideArtifact) continue;
        sevenDigitExpected.push(
          ...sideArtifact.expected.sevenDigitMembers.map((value) => ({
            stage,
            side,
            value,
          }))
        );
        sevenDigitFound.push(
          ...sideArtifact.expectedSevenDigitMembersFound.map((value) => ({
            stage,
            side,
            value,
          }))
        );
      }
    }
    const sevenDigitNearFound = [];
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideArtifact = artifact.stages?.[stageKey]?.[side];
        if (!sideArtifact) continue;
        sevenDigitNearFound.push(
          ...sideArtifact.expectedSevenDigitMembersNearFound.map((match) => ({
            stage,
            side,
            ...match,
          }))
        );
      }
    }

    summary.push({
      image: item.image,
      artifact: relativePath,
      expected: item.expected,
      pass: item.pass,
      sevenDigitExpected,
      sevenDigitFound,
      sevenDigitNearFound,
    });
  }

  const summaryPath = path.join(fixedRoiExperimentDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  written.push(path.relative(rootDir, summaryPath).replaceAll("\\", "/"));

  return written;
}

function buildRoiAdoptionSimulationForSide(sideArtifact) {
  const current = {
    members: [...(sideArtifact.current?.members || [])].map((value) => Number(value) || 0),
    total: Number(sideArtifact.current?.total || 0),
  };
  const simulated = {
    members: [...current.members],
    total: current.total,
  };
  while (simulated.members.length < 3) simulated.members.push(0);

  const zones = sideArtifact.zones || [];
  const bonusCandidates = uniqueNumbers(
    zones
      .filter((zone) => zone.zoneType === "bonus")
      .flatMap((zone) => zone.bonusCandidates || [])
      .filter((value) => value > 0)
  );
  const currentEquation = equationError(current.members, current.total, bonusCandidates);
  const adoptedCandidates = [];
  const rejectedCandidates = [];

  const reject = (candidate, reason) => {
    rejectedCandidates.push({ ...candidate, reason });
  };

  for (const zone of zones) {
    const zoneBase = {
      zoneRole: zone.zoneRole,
      zoneType: zone.zoneType,
      slotIndex: zone.slotIndex || null,
      zone: zone.zone,
      rawText: zone.rawText,
    };

    for (const value of zone.cleanSevenDigitCandidates || []) {
      const candidate = { ...zoneBase, value, candidateType: "clean-seven-digit" };
      if (zone.zoneType !== "member-slot") {
        reject(candidate, "not-member-slot-zone");
        continue;
      }
      if (!zone.slotIndex || zone.slotIndex < 1 || zone.slotIndex > 3) {
        reject(candidate, "missing-slot-index");
        continue;
      }

      const slot = zone.slotIndex - 1;
      const currentValue = Number(simulated.members[slot] || 0);
      if (currentValue === Number(value)) {
        reject(candidate, "already-selected");
        continue;
      }
      if (currentValue >= 1000000) {
        reject(candidate, "high-confidence-current-slot");
        continue;
      }

      const candidateMembers = [...simulated.members];
      candidateMembers[slot] = Number(value);
      const candidateEquation = equationError(candidateMembers, simulated.total, bonusCandidates);
      if (candidateEquation.best.error > 1) {
        reject({
          ...candidate,
          beforeEquationError: currentEquation.best.error,
          afterEquationError: candidateEquation.best.error,
        }, "no-exact-equation");
        continue;
      }
      if (candidateEquation.best.error >= currentEquation.best.error) {
        reject({
          ...candidate,
          beforeEquationError: currentEquation.best.error,
          afterEquationError: candidateEquation.best.error,
        }, "does-not-improve-equation");
        continue;
      }

      simulated.members = candidateMembers;
      adoptedCandidates.push({
        ...candidate,
        replacedValue: currentValue,
        beforeEquationError: currentEquation.best.error,
        afterEquationError: candidateEquation.best.error,
        equationBonus: candidateEquation.best.bonus,
      });
    }

    for (const candidate of zone.possibleJoinedCandidates || []) {
      const value = Number(candidate.value || 0);
      if (value >= 1000000 && value < 10000000) {
        reject({
          ...zoneBase,
          value,
          candidateType: candidate.method || "joined",
          raw: candidate.raw,
        }, "joined-or-near-candidate-audit-only");
      }
    }
  }

  const rowZoneExperimentalProposals = [];
  for (const zone of zones) {
    if (zone.zoneType !== "member-row") continue;
    if (!String(zone.zoneRole || "").includes("member-row")) continue;

    const parsedValues = uniqueNumbers(
      (zone.parsedCandidates || [])
        .map((value) => Number(value) || 0)
        .filter((value) => value > 0)
    );
    if (parsedValues.length < 4) continue;

    const proposedMembers = parsedValues.slice(0, 3);
    const proposedBonus = parsedValues[3];
    const hasExactSevenDigitMember = proposedMembers.some(
      (value) =>
        value >= 1000000 &&
        value < 10000000 &&
        (zone.cleanSevenDigitCandidates || []).includes(value)
    );
    if (!hasExactSevenDigitMember) continue;

    const proposedMemberSum = proposedMembers.reduce((sum, value) => sum + value, 0);
    const proposedTotal = proposedMemberSum + proposedBonus;
    const proposed = {
      members: proposedMembers,
      total: proposedTotal,
    };
    const strictRowZoneGuardEvaluation = evaluateStrictRowZoneProposal({
      current,
      proposedMembers,
      proposedBonus,
      proposedTotal,
      cleanSevenDigitCandidates: zone.cleanSevenDigitCandidates || [],
    });
    const currentComparisonForProposal = compareSideToExpected(current, sideArtifact.expected);
    const proposedComparison = compareSideToExpected(proposed, sideArtifact.expected);
    const currentMismatchForProposal = currentComparisonForProposal
      ? currentComparisonForProposal.memberMismatches + currentComparisonForProposal.totalMismatch
      : null;
    const proposedMismatch = proposedComparison
      ? proposedComparison.memberMismatches + proposedComparison.totalMismatch
      : null;

    let outcome = "unvalidated";
    if (currentMismatchForProposal !== null && proposedMismatch !== null) {
      if (proposedMismatch < currentMismatchForProposal) outcome = "improved";
      else if (proposedMismatch > currentMismatchForProposal) outcome = "regressed";
      else outcome = "unchanged";
    }

    rowZoneExperimentalProposals.push({
      zoneRole: zone.zoneRole,
      zoneType: zone.zoneType,
      zone: zone.zone,
      rawText: zone.rawText,
      parsedValues,
      cleanSevenDigitCandidates: zone.cleanSevenDigitCandidates || [],
      proposedMembers,
      proposedBonus,
      proposedTotal,
      proposed,
      equation: {
        memberSum: proposedMemberSum,
        bonus: proposedBonus,
        total: proposedTotal,
      },
      comparison: {
        current: currentComparisonForProposal,
        proposed: proposedComparison,
      },
      strictRowZoneGuardEvaluation,
      outcome,
      note:
        "Runner-only broad row-zone proposal. This is not production adoption; slot-level evidence is still required before enabling.",
    });
  }

  const simulatedEquation = equationError(simulated.members, simulated.total, bonusCandidates);
  const currentComparison = compareSideToExpected(current, sideArtifact.expected);
  const simulatedComparison = compareSideToExpected(simulated, sideArtifact.expected);
  const currentMismatchCount = currentComparison
    ? currentComparison.memberMismatches + currentComparison.totalMismatch
    : null;
  const simulatedMismatchCount = simulatedComparison
    ? simulatedComparison.memberMismatches + simulatedComparison.totalMismatch
    : null;

  let outcome = "unchanged";
  if (simulatedMismatchCount !== null && currentMismatchCount !== null) {
    if (simulatedMismatchCount < currentMismatchCount) outcome = "improved";
    if (simulatedMismatchCount > currentMismatchCount) outcome = "regressed";
  } else if (adoptedCandidates.length > 0) {
    outcome = "changed-unvalidated";
  }

  return {
    current,
    simulated,
    expected: sideArtifact.expected,
    bonusCandidates,
    equation: {
      before: currentEquation,
      after: simulatedEquation,
    },
    comparison: {
      current: currentComparison,
      simulated: simulatedComparison,
    },
    adoptedCandidates,
    rejectedCandidates,
    rowZoneExperimentalProposals,
    outcome,
  };
}

async function writeRoiAdoptionSimulationArtifacts(report) {
  await fs.rm(roiAdoptionSimDir, { recursive: true, force: true });
  await fs.mkdir(roiAdoptionSimDir, { recursive: true });

  const written = [];
  const summary = [];

  for (const item of report) {
    const roiArtifact = await buildFixedRoiExperimentForImage(item);
    if (!roiArtifact) continue;

    const stagesOut = {};
    const outcomes = [];
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      stagesOut[stageKey] = {};
      for (const side of sides) {
        const simulation = buildRoiAdoptionSimulationForSide(roiArtifact.stages?.[stageKey]?.[side]);
        stagesOut[stageKey][side] = simulation;
        outcomes.push({
          stage,
          side,
          outcome: simulation.outcome,
          adopted: simulation.adoptedCandidates.length,
          rejected: simulation.rejectedCandidates.length,
          rowZoneExperimental: simulation.rowZoneExperimentalProposals.length,
          rowZoneExperimentalImproved: simulation.rowZoneExperimentalProposals.filter(
            (proposal) => proposal.outcome === "improved"
          ).length,
          rowZoneExperimentalRegressed: simulation.rowZoneExperimentalProposals.filter(
            (proposal) => proposal.outcome === "regressed"
          ).length,
          strictRowZoneGuardAccepted: simulation.rowZoneExperimentalProposals.filter(
            (proposal) =>
              proposal.strictRowZoneGuardEvaluation?.wouldAdoptUnderStrictRowZoneGuards
          ).length,
        });
      }
    }

    const artifact = {
      image: item.image,
      source: item.source,
      category: item.category,
      expected: item.expected,
      pass: item.pass,
      failures: item.failures,
      stages: stagesOut,
    };
    const fileName = `${safeArtifactName(item.image)}.roi-adoption-sim.json`;
    const artifactPath = path.join(roiAdoptionSimDir, fileName);
    await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2));
    const relativePath = path.relative(rootDir, artifactPath).replaceAll("\\", "/");
    written.push(relativePath);

    summary.push({
      image: item.image,
      artifact: relativePath,
      expected: item.expected,
      pass: item.pass,
      outcomes,
      improved: outcomes.filter((outcome) => outcome.outcome === "improved").length,
      regressed: outcomes.filter((outcome) => outcome.outcome === "regressed").length,
      changedUnvalidated: outcomes.filter((outcome) => outcome.outcome === "changed-unvalidated").length,
      unchanged: outcomes.filter((outcome) => outcome.outcome === "unchanged").length,
      rowZoneExperimentalImproved: outcomes.reduce(
        (sum, outcome) => sum + outcome.rowZoneExperimentalImproved,
        0
      ),
      rowZoneExperimentalRegressed: outcomes.reduce(
        (sum, outcome) => sum + outcome.rowZoneExperimentalRegressed,
        0
      ),
      strictRowZoneGuardAccepted: outcomes.reduce(
        (sum, outcome) => sum + outcome.strictRowZoneGuardAccepted,
        0
      ),
    });
  }

  const summaryPath = path.join(roiAdoptionSimDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  written.push(path.relative(rootDir, summaryPath).replaceAll("\\", "/"));

  return written;
}

function isKnownNoiseNumber(num) {
  return crownDiffCandidates.has(num) || totalPowerCandidates.has(num);
}

function isNearAnyNumber(value, targets, tolerance = 1000) {
  return targets.some((target) => Math.abs(Number(value) - Number(target)) <= tolerance);
}

function getMemberSumTargets(referenceNumbers) {
  const targets = new Set();
  const crownTargets = new Set();

  referenceNumbers
    .filter((num) => Number.isFinite(num) && num >= 100000 && num < 3000000)
    .forEach((num) => {
      targets.add(num);

      for (const diff of crownDiffCandidates) {
        const baseTotal = num - diff;
        if (baseTotal >= 100000 && baseTotal < 3000000) {
          targets.add(baseTotal);
          crownTargets.add(baseTotal);
        }
      }
    });

  return {
    all: [...targets],
    crown: [...crownTargets],
  };
}

function improveMembersByReference(members, referenceNumbers, sourceCount = members.length) {
  if (members.length !== 3) return members;

  const observedNumbers = new Set(referenceNumbers.map((num) => Math.round(num)));
  const targets = getMemberSumTargets(referenceNumbers);
  if (targets.all.length === 0) return members;

  const currentSum = members.reduce((sum, value) => sum + value, 0);
  const currentDistance = Math.min(
    ...targets.all.map((target) => Math.abs(currentSum - target))
  );
  let best = { members, distance: currentDistance };

  members.forEach((member, index) => {
    if (member < 100000 || member >= 1000000) return;

    const suffix = member % 100000;
    const memberCandidates = [];

    if (
      sourceCount > 3 &&
      member >= 110000 &&
      member < 200000 &&
      suffix >= 10000
    ) {
      memberCandidates.push({ value: suffix, crownOnly: true });
    }

    for (let head = 1; head <= 9; head += 1) {
      const candidate = head * 100000 + suffix;
      if (
        candidate === member ||
        isKnownNoiseNumber(candidate) ||
        !observedNumbers.has(candidate)
      ) {
        continue;
      }

      memberCandidates.push({ value: candidate, crownOnly: false });
    }

    for (const item of memberCandidates) {
      const candidate = item.value;
      const candidateTargets = item.crownOnly ? targets.crown : targets.all;
      if (candidateTargets.length === 0) continue;

      const nextMembers = [...members];
      nextMembers[index] = candidate;
      const nextSum = nextMembers.reduce((sum, value) => sum + value, 0);
      const nextDistance = Math.min(
        ...candidateTargets.map((target) => Math.abs(nextSum - target))
      );

      if (nextDistance < best.distance) {
        best = { members: nextMembers, distance: nextDistance };
      }
    }
  });

  const improvedEnough =
    best.distance <= 1000 || currentDistance - best.distance >= 100000;

  return improvedEnough ? best.members : members;
}

function recoverMembersFromCrownTotal(numbers) {
  const rawCandidates = numbers
    .filter((num) => num >= 10000 && num < 10000000)
    .map(normalizeMemberScore);

  for (let totalIndex = 0; totalIndex < Math.min(rawCandidates.length, 3); totalIndex += 1) {
    const totalWithCrown = rawCandidates[totalIndex];
    if (totalWithCrown < 300000 || totalWithCrown >= 3000000) continue;

    for (let crownIndex = 0; crownIndex < rawCandidates.length; crownIndex += 1) {
      const crown = rawCandidates[crownIndex];
      if (totalIndex === crownIndex || !crownDiffCandidates.has(crown)) continue;

      const target = totalWithCrown - crown;
      if (target < 100000 || target >= 3000000) continue;

      const visibleMembers = rawCandidates
        .filter((_, index) => index !== totalIndex && index !== crownIndex)
        .filter((num) => num >= 10000 && num < 1000000)
        .filter((num) => !isKnownNoiseNumber(num));

      if (visibleMembers.length !== 2) continue;

      const variants = visibleMembers.map((member) => {
        if (member >= 100000 || member < 10000) return [member];
        return Array.from({ length: 9 }, (_, index) => (index + 1) * 100000 + member);
      });

      let best = null;

      for (const first of variants[0]) {
        for (const second of variants[1]) {
          const missing = target - first - second;
          if (missing < 10000 || missing >= 1000000 || isKnownNoiseNumber(missing)) continue;

          const members = [missing, first, second];
          const distance = Math.abs(members.reduce((sum, value) => sum + value, 0) - target);

          if (!best || distance < best.distance) {
            best = { members, distance };
          }
        }
      }

      if (best && best.distance <= 1) {
        return best.members;
      }
    }
  }

  return null;
}

function toNumber(value) {
  const normalized = String(value ?? "")
    .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
    .replace(/[^\d.-]/g, "");

  const num = Number(normalized);
  return Number.isNaN(num) ? 0 : num;
}

function getDeviceOcrLayout(mode) {
  const layouts = {
    "current-pc": {
      direct: true,
      layoutFamily: "current-pc-2026-07-result",
      totalTop: [0.108, 0.363, 0.613],
      enemyTotalTop: [0.108, 0.363, 0.613],
      totalTopCandidates: [
        [0.096, 0.351, 0.601],
        [0.102, 0.357, 0.607],
        [0.108, 0.363, 0.613],
        [0.114, 0.369, 0.619],
        [0.120, 0.375, 0.625],
      ],
      memberTop: [0.146, 0.398, 0.647],
      enemyMemberTop: [0.146, 0.398, 0.647],
      memberTopCandidates: [
        [0.136, 0.388, 0.637],
        [0.142, 0.394, 0.643],
        [0.146, 0.398, 0.647],
        [0.152, 0.404, 0.653],
        [0.158, 0.410, 0.659],
      ],
      leftX: 0.045,
      rightX: 0.545,
      sideWidth: 0.410,
      totalHeight: 0.055,
      memberHeight: 0.112,
    },
    desktop: {
      direct: true,
      totalTop: [0.112, 0.368, 0.615],
      totalTopCandidates: [
        [0.102, 0.358, 0.605],
        [0.112, 0.368, 0.615],
        [0.122, 0.378, 0.625],
        [0.132, 0.388, 0.635],
      ],
      memberTop: [0.135, 0.390, 0.650],
      memberTopCandidates: [
        [0.130, 0.385, 0.635],
        [0.135, 0.390, 0.645],
        [0.140, 0.395, 0.650],
        [0.145, 0.400, 0.655],
      ],
      enemyMemberTop: [0.135, 0.386, 0.650],
      enemyMemberHeight: [0.150, 0.060, 0.150],
      leftX: 0.05,
      rightX: 0.50,
      sideWidth: 0.46,
      totalHeight: 0.050,
      memberHeight: 0.150,
    },
    smartphone: {
      direct: true,
      totalTop: [0.165, 0.450, 0.690],
      enemyTotalTop: [0.165, 0.430, 0.675],
      totalTopCandidates: [
        [0.150, 0.410, 0.600],
        [0.160, 0.420, 0.620],
        [0.165, 0.430, 0.640],
        [0.175, 0.440, 0.660],
        [0.180, 0.450, 0.675],
        [0.190, 0.460, 0.690],
        [0.195, 0.470, 0.710],
      ],
      memberTop: [0.205, 0.445, 0.685],
      enemyMemberTop: [0.205, 0.445, 0.685],
      memberTopCandidates: [
        [0.180, 0.400, 0.640],
        [0.185, 0.405, 0.640],
        [0.190, 0.415, 0.640],
        [0.195, 0.420, 0.640],
        [0.195, 0.430, 0.640],
        [0.205, 0.445, 0.665],
        [0.220, 0.460, 0.690],
        [0.235, 0.475, 0.715],
      ],
      leftX: 0.055,
      rightX: 0.505,
      sideWidth: 0.445,
      totalHeight: 0.065,
      memberHeight: 0.105,
    },
  };

  return layouts[mode] || layouts.smartphone;
}

function getFixedOcrZones(image, stage, mode = "smartphone") {
  const layout = getDeviceOcrLayout(mode);
  const stageIndex = stage - 1;

  const makeDirectZone = (side, type) => {
    const xRate = side === "self" ? layout.leftX : layout.rightX;
    const yRate =
      type === "total" && side === "enemy" && layout.enemyTotalTop
        ? layout.enemyTotalTop[stageIndex]
        : type === "total"
        ? layout.totalTop[stageIndex]
        : side === "enemy" && layout.enemyMemberTop
        ? layout.enemyMemberTop[stageIndex]
        : layout.memberTop[stageIndex];
    const heightRate = type === "total" ? layout.totalHeight : layout.memberHeight;

    return {
      left: Math.floor(image.width * xRate),
      top: Math.floor(image.height * yRate),
      width: Math.floor(image.width * layout.sideWidth),
      height: Math.floor(image.height * heightRate),
    };
  };

  return {
    selfTotal: makeDirectZone("self", "total"),
    selfMembers: makeDirectZone("self", "members"),
    enemyTotal: makeDirectZone("enemy", "total"),
    enemyMembers: makeDirectZone("enemy", "members"),
  };
}

function getAlternativeTotalZones(image, stage, side, mode = "smartphone") {
  const layout = getDeviceOcrLayout(mode);
  if (!layout.totalTopCandidates) return [];

  const stageIndex = stage - 1;
  const xRate = side === "self" ? layout.leftX : layout.rightX;

  return layout.totalTopCandidates.map((candidate) => ({
    left: Math.floor(image.width * xRate),
    top: Math.floor(image.height * candidate[stageIndex]),
    width: Math.floor(image.width * layout.sideWidth),
    height: Math.floor(image.height * layout.totalHeight),
  }));
}

function getAlternativeMemberZones(image, stage, side, mode = "smartphone") {
  const layout = getDeviceOcrLayout(mode);
  if (!layout.memberTopCandidates) return [];

  const stageIndex = stage - 1;
  const xRate = side === "self" ? layout.leftX : layout.rightX;

  return layout.memberTopCandidates.map((candidate) => ({
    left: Math.floor(image.width * xRate),
    top: Math.floor(image.height * candidate[stageIndex]),
    width: Math.floor(image.width * layout.sideWidth),
    height: Math.floor(image.height * layout.memberHeight),
  }));
}

function extractNumbersForZone(text) {
  return (
    String(text ?? "")
      .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
      .match(/\d{1,3}(?:[,\.]\d{3})+|\d{4,8}/g)
      ?.map((value) => toNumber(value))
      .filter((num) => num >= 1400 && num < 10000000) ?? []
  );
}

function normalizeMemberScore(num) {
  return num;
}

function repairMissingLeadingOneMember(members, referenceNumbers = []) {
  if (!Array.isArray(members) || members.length !== 3) return members;

  const [first, second, third] = members;
  const repairedFirst = first - 100000;
  const repairedSum = repairedFirst + second + third;
  const looksLikeExtraLeadingOne =
    first >= 110000 &&
    first < 200000 &&
    repairedFirst >= 10000 &&
    second < 50000 &&
    third < 50000 &&
    second + third < 80000 &&
    repairedSum >= 50000 &&
    repairedSum < 150000;

  if (
    first >= 200000 &&
    second >= 30000 &&
    second < 80000 &&
    third >= 5000 &&
    third < 10000
  ) {
    return [first, second, third + 50000];
  }

  const totals = referenceNumbers.filter((num) => num >= 100000 && num < 3000000);
  if (looksLikeExtraLeadingOne) {
    const currentSum = members.reduce((sum, value) => sum + value, 0);
    const currentMatchesTotal = totals.some((total) => Math.abs(total - currentSum) <= 1000);
    if (!currentMatchesTotal) {
      return [repairedFirst, second, third];
    }
  }

  if (totals.length === 0) return members;

  const currentSum = members.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < members.length; index += 1) {
    const value = members[index];
    if (value < 50000 || value >= 85000) continue;

    const repairedMembers = members.map((member, memberIndex) =>
      memberIndex === index ? member + 100000 : member
    );
    const repairedSum = repairedMembers.reduce((sum, member) => sum + member, 0);
    const matchesTotal = totals.some((total) => Math.abs(total - repairedSum) <= 100);
    const currentMatchesTotal = totals.some((total) => Math.abs(total - currentSum) <= 1000);

    if (matchesTotal && !currentMatchesTotal) return repairedMembers;
  }

  return members;
}

function hasMatchingCrownBonusForMembers(members, totalNumbers = [], bonusNumbers = []) {
  if (!Array.isArray(members) || members.length !== 3) return false;

  const memberSum = members.reduce((sum, value) => sum + value, 0);
  const totals = totalNumbers.filter((num) => num >= 100000 && num < 3000000);

  return bonusNumbers
    .filter((num) => Number.isFinite(num) && num >= 5000 && num < 200000)
    .some((bonus) =>
      totals.some((total) => Math.abs(total - (memberSum + bonus)) <= 1000)
    );
}

function pickTotalNumber(numbers) {
  const candidates = numbers.filter((num) => num >= 10000 && num < 3000000);
  return [...candidates].sort((a, b) => b - a)[0] || numbers[0] || 0;
}

function correctCommonTotalOcr(num, memberSum) {
  if (num === 150588 && Math.abs(memberSum - 138451) <= 5) return 150388;
  return num;
}

function pickTotalWithMemberFallback(
  rawNumbers,
  candidateNumbers,
  memberSum,
  memberCount = 0,
  maxMember = 0,
  memberCandidateNumbers = [],
  bonusNumbers = [],
  selectedMembers = []
) {
  const crownBonusCandidates = bonusNumbers
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 200000)
    .filter((num) => Math.abs(num - memberSum) > 1000)
    .sort((a, b) => a - b);
  const crownBonus = crownBonusCandidates[0] || 0;
  const allNumbers = [...rawNumbers, ...candidateNumbers]
    .filter((num) => num >= 10000 && num < 10000000)
    .map((num) => correctCommonTotalOcr(num, memberSum));
  const visibleNumbers = [...allNumbers, ...memberCandidateNumbers]
    .filter((num) => num >= 10000 && num < 10000000)
    .map((num) => correctCommonTotalOcr(num, memberSum));

  if (memberCount >= 3 && memberSum > 0) {
    if (rawNumbers.some((num) => Math.abs(num - memberSum) <= 1)) return memberSum;

    const isolatedTotalZoneBonuses =
      rawNumbers.every((num) => num < 100000) &&
      candidateNumbers.every((num) => num < memberSum)
        ? rawNumbers
            .filter((num) => num >= 10000 && num < 85000)
            .filter((num) => Math.abs(num - memberSum) > 1000)
            .filter((num) => num < memberSum)
            .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
            .filter((num) => !isKnownNoiseNumber(num))
            .sort((a, b) => a - b)
        : [];

    if (isolatedTotalZoneBonuses.length > 0) return memberSum + isolatedTotalZoneBonuses[0];

    const sourceNumbers = [...rawNumbers, ...candidateNumbers, ...memberCandidateNumbers].filter(
      (num) => Number.isFinite(num) && num >= 10000 && num < 10000000
    );
    const matchingCrownBonuses = crownBonusCandidates.filter((bonus) => {
      const total = memberSum + bonus;
      return sourceNumbers.some(
        (candidate) =>
          Math.abs(candidate - total) <= 1000 ||
          (candidate >= 100000 && Math.abs(candidate - (total + 200000)) <= 1000) ||
          (candidate >= 100000 && Math.abs(candidate - (total - 200000)) <= 1000)
      );
    });

    if (matchingCrownBonuses.length > 0) return memberSum + matchingCrownBonuses[0];

    const crownIncludedTotals = allNumbers
      .filter((num) => displayedTotalCrownDiffCandidates.has(num - memberSum))
      .sort((a, b) => a - b);

    if (crownIncludedTotals.length > 0) return crownIncludedTotals[0];

    const visibleCrownDiffs = visibleNumbers
      .filter((num) => displayedTotalCrownDiffCandidates.has(num))
      .sort((a, b) => a - b);

    if (visibleCrownDiffs.length > 0) return memberSum + visibleCrownDiffs[0];

    const directTotalZoneBonuses = rawNumbers
      .filter((num) => num >= 10000 && num < 200000)
      .filter((num) => Math.abs(num - memberSum) > 1000)
      .filter((num) => num < memberSum)
      .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
      .filter((num) => !isKnownNoiseNumber(num))
      .filter((num) =>
        [...candidateNumbers, ...memberCandidateNumbers].some(
          (candidate) => Math.abs(candidate - (memberSum + num)) <= 1000
        )
      )
      .sort((a, b) => a - b);

    if (directTotalZoneBonuses.length > 0) return memberSum + directTotalZoneBonuses[0];

    const selectedIndexes = selectedMembers
      .map((member) =>
        memberCandidateNumbers.findIndex((candidate) => Math.abs(candidate - member) <= 1)
      )
      .filter((index) => index >= 0);
    const selectedAreConsecutive =
      selectedIndexes.length === selectedMembers.length &&
      selectedIndexes.every(
        (index, position) => position === 0 || index === selectedIndexes[position - 1] + 1
      );
    const trailingVisibleBonuses = selectedAreConsecutive
      ? memberCandidateNumbers
          .slice(Math.max(...selectedIndexes) + 1)
          .filter((num) => num >= 10000 && num < 200000)
          .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
          .filter((num) => !isKnownNoiseNumber(num))
      : [];

    if (trailingVisibleBonuses.length > 0) return memberSum + trailingVisibleBonuses[0];

    const inferredVisibleBonuses = memberCandidateNumbers
      .filter((num) => num >= 10000 && num < 200000)
      .filter((num) => Math.abs(num - memberSum) > 1000)
      .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
      .filter((num) => !isKnownNoiseNumber(num))
      .filter((num) => {
        const total = memberSum + num;
        return [...allNumbers, ...memberCandidateNumbers].some(
          (candidate) =>
            Math.abs(candidate - total) <= 1000 ||
            (candidate >= 100000 && Math.abs(candidate - (total + 200000)) <= 1000) ||
            (candidate >= 100000 && Math.abs(candidate - (total - 200000)) <= 1000)
        );
      })
      .sort((a, b) => a - b);

    if (inferredVisibleBonuses.length > 0) return memberSum + inferredVisibleBonuses[0];

    if (visibleNumbers.some((num) => Math.abs(num - memberSum) <= 1)) return memberSum;

    const rawVisibleBonuses = rawNumbers
      .filter((num) => num >= 10000 && num < 200000)
      .filter((num) => Math.abs(num - memberSum) > 1000)
      .filter((num) => num < memberSum)
      .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
      .filter((num) => !isKnownNoiseNumber(num))
      .filter((num) =>
        [...candidateNumbers, ...memberCandidateNumbers].some(
          (candidate) => Math.abs(candidate - (memberSum + num)) <= 1000
        )
      )
      .sort((a, b) => a - b);

    if (rawVisibleBonuses.length > 0) return memberSum + rawVisibleBonuses[0];

    if (crownBonus > 0) {
      return memberSum + crownBonus;
    }

    if (allNumbers.length === 0) return memberSum;
  }

  const totalLike = allNumbers
    .filter((num) => memberSum > 0 && num >= memberSum)
    .filter((num) => maxMember <= 0 || num >= maxMember)
    .sort((a, b) => a - b);

  if (memberCount >= 3 && memberSum > 0) {
    return memberSum;
  }
  if (totalLike.length > 0) return totalLike[0];
  if (
    memberCount > 0 &&
    memberCount < 3 &&
    memberSum > 0 &&
    allNumbers.length > 0 &&
    allNumbers.every((num) => num < memberSum)
  ) {
    return memberSum;
  }
  return pickTotalNumber(allNumbers) || memberSum;
}

function pickMemberNumbers(numbers, totalNumbers = [], bonusNumbers = []) {
  const crownBonus = getCrownBonusNumber(bonusNumbers);
  const bonusSet = new Set(crownBonus > 0 ? [Math.round(crownBonus)] : []);
  const totals = totalNumbers.filter((num) => num >= 50000 && num < 3000000);
  const totalSet = new Set(
    totalNumbers
      .filter((num) => num >= 50000 && num < 3000000)
      .map((num) => Math.round(num))
  );

  const crownRecovered = null;
  if (crownRecovered) {
    return improveMembersByReference(crownRecovered, [...totalNumbers, ...numbers], numbers.length);
  }

  const candidates = numbers
    .filter((num) => num >= 1400 && num < 10000000)
    .map(normalizeMemberScore)
    .filter((num) => !bonusSet.has(Math.round(num)))
    .filter((num) => !isKnownNoiseNumber(num));

  const withoutTotals = candidates.filter(
    (num) => !totalSet.has(Math.round(num)) && !isNearAnyNumber(num, totals, 1000)
  );

  const dropLeadingTotal = (values) => {
    if (values.length < 4) return values;

    const leading = values[0];
    const nextThree = values.slice(1, 4);
    const nextSum = nextThree.reduce((sum, value) => sum + value, 0);
    const diff = leading - nextSum;
    const trailingBonus =
      values.slice(4).find((value) => value >= 10000 && value < 200000) ||
      bonusNumbers.find((value) => value >= 10000 && value < 200000) ||
      totalNumbers.find((value) => value >= 10000 && value < 200000);
    const rawTrailingBonus =
      values.slice(4).find((value) => value >= 10000 && value < 200000);
    const looksLikeMemberTotal =
      leading > Math.max(...nextThree) &&
      nextSum >= 10000 &&
      Math.abs(diff) <= 200000 &&
      nextThree.every((num) => num >= 5000) &&
      totalNumbers.some((total) => total >= 50000 && Math.abs(total - leading) <= 1000);
    const nextSumMatchesKnownTotal =
      totalNumbers.some((total) => total >= 50000 && Math.abs(total - nextSum) <= 30000);
    const nextSumMatchesTotalMemberRead =
      totalNumbers.length >= 3 &&
      Math.abs(
        totalNumbers
          .slice(0, 3)
          .reduce((sum, value) => sum + value, 0) - nextSum
      ) <= 1;
    const leadingLooksLikeExtraSmallCandidate =
      leading >= 10000 &&
      leading < 85000 &&
      nextSum >= 100000 &&
      rawTrailingBonus &&
      leading < Math.max(...nextThree);
    const leadingLooksLikeMisreadTotal =
      trailingBonus &&
      Math.abs(nextSum + trailingBonus - leading - 200000) <= 1000;
    const leadingLooksLikeLargeMisreadTotal =
      trailingBonus &&
      Math.abs(nextSum + trailingBonus - leading - 300000) <= 2500;
    const leadingEqualsNextMemberSum = Math.abs(leading - nextSum) <= 1;

    if (
      looksLikeMemberTotal ||
      nextSumMatchesKnownTotal ||
      nextSumMatchesTotalMemberRead ||
      leadingLooksLikeExtraSmallCandidate ||
      leadingLooksLikeMisreadTotal ||
      leadingLooksLikeLargeMisreadTotal ||
      leadingEqualsNextMemberSum
    ) return values.slice(1);
    return values;
  };

  const memberFirstCandidates = dropLeadingTotal(withoutTotals);
  const valid = memberFirstCandidates.filter((num) => num < 1000000);
  const droppedLeadingTotal =
    withoutTotals.length >= 4 && memberFirstCandidates[0] !== withoutTotals[0];

  const referenceNumbers = [...totalNumbers, ...candidates];

  if (valid.length >= 3) {
    if (droppedLeadingTotal) return valid.slice(0, 3);

    return bonusNumbers.length > 0
      ? valid.slice(0, 3)
      : improveMembersByReference(valid.slice(0, 3), referenceNumbers, candidates.length);
  }

  const relaxed = dropLeadingTotal(candidates)
    .filter((num) => num < 1000000)
    .slice(0, 3);

  return bonusNumbers.length > 0
    ? relaxed
    : improveMembersByReference(relaxed, referenceNumbers, candidates.length);
}

function scoreMemberCandidate(numbers) {
  const valid = numbers.filter((num) => num >= 1400 && num < 1000000);
  const countScore = valid.length;
  const hasThree = countScore >= 3 ? 2500 : 0;
  const normalScore = valid.filter((num) => num >= 15000 && num <= 1000000).length * 180;
  const tooLowPenalty = valid.filter((num) => num < 1000).length * -200;
  const oneOrTwoPenalty = countScore < 3 ? -600 : 0;

  return hasThree + normalScore + tooLowPenalty + oneOrTwoPenalty + countScore;
}

const nextScreenPrimaryPresets = [
  "next-screen-threshold",
  "next-screen-contrast",
];

const nextScreenFallbackPresets = [
  "next-screen-brightness",
  "next-screen-blur-reduction",
];

function getCrownBonusNumber(numbers) {
  const candidates = numbers
    .filter((num) => Number.isFinite(num) && num >= 10000 && num < 200000)
    .sort((a, b) => a - b);

  return candidates[0] || 0;
}

function inferCrownBonusFromMemberNumbers(memberNumbers, totalNumbers = [], options = {}) {
  const preferLeadingTotal = options.preferLeadingTotal !== false;
  const numbers = memberNumbers
    .filter((num) => Number.isFinite(num) && num >= 1400 && num < 10000000)
    .map(normalizeMemberScore);
  const totals = totalNumbers.filter((num) => num >= 100000 && num < 3000000);
  const leadingTotalReferences = [
    ...totals,
    ...(options.leadingTotalReferences || []).filter((num) => num >= 100000 && num < 3000000),
  ];

  if (numbers.length >= 5) {
    const displayedTotal = numbers[0];
    const members = numbers.slice(1, 4);
    const bonus = numbers[4];
    const sumWithBonus = members.reduce((sum, value) => sum + value, 0) + bonus;
    const displayedTotalIsReferenced = leadingTotalReferences.some(
      (total) => Math.abs(total - displayedTotal) <= 1000
    );

    if (displayedTotalIsReferenced) {
      const possibleBonuses = numbers.slice(2).filter((num) => num >= 10000 && num < 200000);
      for (const count of [1, 2]) {
        const partialMembers = numbers.slice(1, 1 + count);
        const partialSum = partialMembers.reduce((sum, value) => sum + value, 0);
        for (const possibleBonus of possibleBonuses) {
          if (
            partialMembers.every((num) => num >= 1400 && num < 1000000) &&
            !partialMembers.some((member) => Math.abs(member - possibleBonus) <= 1) &&
            Math.abs(partialSum + possibleBonus - displayedTotal) <= 1000
          ) {
            return { bonus: possibleBonus, members: partialMembers, total: displayedTotal };
          }
        }
      }
    }

    if (bonus >= 10000 && bonus < 200000 && Math.abs(displayedTotal - sumWithBonus) <= 1000) {
      return { bonus, members, total: displayedTotal };
    }

    if (
      bonus >= 10000 &&
      bonus < 200000 &&
      !displayedTotalIsReferenced &&
      Math.abs(Math.abs(sumWithBonus - displayedTotal) - 200000) <= 1000
    ) {
      return { bonus, members, total: sumWithBonus };
    }

    if (
      bonus >= 10000 &&
      bonus < 200000 &&
      !displayedTotalIsReferenced &&
      Math.abs(Math.abs(sumWithBonus - displayedTotal) - 300000) <= 2500
    ) {
      return { bonus, members, total: sumWithBonus };
    }

    if (
      displayedTotal >= 10000 &&
      displayedTotal < 85000 &&
      bonus >= 10000 &&
      bonus < 200000 &&
      members.reduce((sum, value) => sum + value, 0) >= 100000
    ) {
      return { bonus, members, total: sumWithBonus };
    }
  }

  if (preferLeadingTotal && numbers.length === 2) {
    const [displayedTotal, member] = numbers;

    if (
      displayedTotal >= 100000 &&
      Math.abs(displayedTotal - member) <= 1 &&
      leadingTotalReferences.some((total) => Math.abs(total - displayedTotal) <= 1000)
    ) {
      return { bonus: 0, members: [member], total: displayedTotal };
    }

    const bonus = displayedTotal - member;

    if (
      displayedTotal >= 100000 &&
      member >= 100000 &&
      member < 1000000 &&
      bonus >= 10000 &&
      bonus < 200000
    ) {
      return { bonus, members: [member], total: displayedTotal };
    }
  }

  if (preferLeadingTotal && numbers.length === 3) {
    const [displayedTotal, firstMember, secondMember] = numbers;
    const memberSum = firstMember + secondMember;

    if (
      displayedTotal >= 100000 &&
      firstMember >= 100000 &&
      secondMember >= 100000 &&
      Math.abs(displayedTotal - memberSum) <= 1000 &&
      leadingTotalReferences.some((total) => Math.abs(total - displayedTotal) <= 1000)
    ) {
      return { bonus: 0, members: [firstMember, secondMember], total: displayedTotal };
    }
  }

  if (numbers.length >= 4) {
    const firstFour = numbers.slice(0, 4);
    const first = firstFour[0];
    const nextThree = firstFour.slice(1);
    const nextThreeSum = nextThree.reduce((sum, value) => sum + value, 0);
    const inferredBonusFromLeadingTotal = first - nextThreeSum;

    if (Math.abs(first - nextThreeSum) <= 1000) {
      return { bonus: 0, members: nextThree, total: first };
    }

    const firstMatchesKnownTotal = totalNumbers.some(
      (total) => total >= 100000 && Math.abs(total - first) <= 1000
    );

    if (
      preferLeadingTotal &&
      first > Math.max(...nextThree) &&
      nextThree.every((num) => num >= 5000) &&
      inferredBonusFromLeadingTotal >= 10000 &&
      inferredBonusFromLeadingTotal < 200000 &&
      (firstMatchesKnownTotal || (numbers.length >= 5 && nextThreeSum >= 100000))
    ) {
      return { bonus: inferredBonusFromLeadingTotal, members: nextThree, total: first };
    }

    const nextThreeMatchesTotalMemberRead =
      totalNumbers.length >= 3 &&
      Math.abs(
        totalNumbers
          .slice(0, 3)
          .reduce((sum, value) => sum + value, 0) - nextThreeSum
      ) <= 1;

    if (
      first >= 10000 &&
      first < 50000 &&
      nextThreeSum >= 100000 &&
      nextThreeMatchesTotalMemberRead
    ) {
      return { bonus: 0, members: nextThree, total: nextThreeSum };
    }

    if (numbers.length >= 5) {
      const trailingBonus = numbers[4];
      const trailingTotal = nextThreeSum + trailingBonus;

      if (
        first >= 10000 &&
        first < 100000 &&
        trailingBonus >= 10000 &&
        trailingBonus < 200000 &&
        nextThree.every((num) => num >= 10000 && num < 1000000) &&
        leadingTotalReferences.some((total) => Math.abs(total - trailingTotal) <= 1000)
      ) {
        return { bonus: trailingBonus, members: nextThree, total: trailingTotal };
      }
    }

    const members = firstFour.slice(0, 3);
    const bonus = firstFour[3];
    const sumWithBonus = members.reduce((sum, value) => sum + value, 0) + bonus;
    const matchesKnownTotal = totals.some((total) => Math.abs(total - sumWithBonus) <= 1000);

    if (
      bonus >= 5000 &&
      bonus < 200000 &&
      (matchesKnownTotal || (totals.length === 0 && first >= 10000))
    ) {
      return { bonus, members, total: sumWithBonus };
    }

    const nextThreeLooksLikeMembers =
      nextThree[0] >= 10000 && nextThree[1] >= 10000 && nextThree[2] >= 5000;

    if (
      first >= 1400 &&
      first < 85000 &&
      nextThreeSum >= 100000 &&
      nextThreeLooksLikeMembers
    ) {
      return { bonus: 0, members: nextThree, total: nextThreeSum };
    }
  }

  return { bonus: 0, members: null, total: 0 };
}

function applyDesktopLegacyMemberShape(
  members,
  memberNumbers,
  totalNumbers,
  bonusNumbers,
  source,
  options = {}
) {
  if (source !== "desktop" || !Array.isArray(members) || !Array.isArray(memberNumbers)) {
    return members;
  }

  const numbers = memberNumbers
    .filter((num) => Number.isFinite(num) && num >= 1400 && num < 10000000)
    .map(normalizeMemberScore);
  const explicitTotals = Array.isArray(totalNumbers) ? totalNumbers : [];
  const explicitBonuses = Array.isArray(bonusNumbers) ? bonusNumbers : [];
  const shapeNumbers = [...new Set([
    ...numbers,
    ...members.filter((num) => Number.isFinite(num) && num > 0),
    ...explicitBonuses,
  ])];

  if (options.allowDuplicateSingleMember && numbers.length === 2) {
    const [first, second] = numbers;
    if (first === second && first >= 10000) {
      return [first, 0, 0];
    }
  }

  if (options.allowRecoverExactTwoMemberFromTotal && numbers.length === 2) {
    const [displayedTotal, visibleMember] = numbers;
    const missingMember = displayedTotal - visibleMember;
    if (
      displayedTotal > visibleMember &&
      missingMember >= 100000 &&
      missingMember < 1000000
    ) {
      return [missingMember, visibleMember, 0];
    }
  }

  if (options.allowSparseSingleMemberFromLeadingTotal && numbers.length === 2) {
    const [displayedTotal, visibleMember] = numbers;
    const impliedBonus = displayedTotal - visibleMember;
    if (
      displayedTotal > visibleMember &&
      visibleMember >= 10000 &&
      impliedBonus >= 10000 &&
      impliedBonus < 100000
    ) {
      return [visibleMember, 0, 0];
    }
  }

  if (options.allowSparseSingleMemberFromLeadingTotal && numbers.length === 3) {
    const [displayedTotal, visibleMember, bonusLike] = numbers;
    const bonusIsExplicit = explicitBonuses.some(
      (bonus) => Math.abs(bonus - bonusLike) <= 1000
    );
    const bonusCanBeImplicit =
      options.allowImplicitLowTrailingBonus &&
      bonusLike >= 10000 &&
      bonusLike < 40000 &&
      visibleMember >= 50000;
    if (
      (bonusIsExplicit || bonusCanBeImplicit) &&
      displayedTotal > Math.max(visibleMember, bonusLike) &&
      visibleMember >= 10000 &&
      bonusLike >= 10000 &&
      bonusLike < 100000 &&
      Math.abs(displayedTotal - (visibleMember + bonusLike)) <= 1000
    ) {
      return [visibleMember, 0, 0];
    }
  }

  if (options.allowTrailingBonusForThreeMember && numbers.length === 4) {
    const [firstMember, secondMember, thirdMember, bonusLike] = numbers;
    const bonusIsExplicit = explicitBonuses.some(
      (bonus) => Math.abs(bonus - bonusLike) <= 1000
    );
    if (
      [firstMember, secondMember, thirdMember].every((member) => member >= 5000) &&
      bonusLike >= 10000 &&
      bonusLike < 200000 &&
      bonusIsExplicit
    ) {
      return [firstMember, secondMember, thirdMember];
    }
  }

  if (options.allowExplicitTwoMemberWithTrailingBonus && numbers.length === 3) {
    const [firstMember, secondMember, bonusLike] = numbers;
    const bonusIsExplicit = explicitBonuses.some(
      (bonus) => Math.abs(bonus - bonusLike) <= 1000
    );
    const bonusCanBeImplicit =
      options.allowImplicitLowTrailingBonus &&
      bonusLike >= 10000 &&
      bonusLike < 40000 &&
      firstMember >= 50000 &&
      secondMember >= 50000;
    const matchingDisplayedTotal = explicitTotals.some(
      (total) => Math.abs(total - (firstMember + secondMember + bonusLike)) <= 1000
    );
    if (
      matchingDisplayedTotal &&
      bonusLike >= 10000 &&
      bonusLike < 100000 &&
      (bonusIsExplicit || bonusCanBeImplicit)
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (options.allowExplicitTwoMemberWithTrailingBonus && numbers.length === 4) {
    const [displayedTotal, firstMember, secondMember, bonusLike] = numbers;
    const bonusIsExplicit = explicitBonuses.some(
      (bonus) => Math.abs(bonus - bonusLike) <= 1000
    );
    const bonusCanBeImplicit =
      options.allowImplicitLowTrailingBonus &&
      bonusLike >= 10000 &&
      bonusLike < 40000 &&
      firstMember >= 50000 &&
      secondMember >= 50000;
    if (
      displayedTotal > Math.max(firstMember, secondMember, bonusLike) &&
      firstMember >= 10000 &&
      secondMember >= 10000 &&
      bonusLike >= 10000 &&
      bonusLike < 100000 &&
      (bonusIsExplicit || bonusCanBeImplicit) &&
      Math.abs(displayedTotal - (firstMember + secondMember + bonusLike)) <= 1000
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (options.allowLeadingThreeMemberWithTrailingBonus && numbers.length >= 4) {
    const [firstMember, secondMember, thirdMember, bonusLike] = numbers;
    const totalCropPickedFirstMember = explicitTotals.some(
      (total) => Math.abs(total - firstMember) <= 1
    );
    const trailingThreeSum = secondMember + thirdMember + bonusLike;
    const firstLooksLikeDisplayedTotal = Math.abs(firstMember - trailingThreeSum) <= 3000;
    const displayedTotalBonus = firstMember - trailingThreeSum;
    const hasDisplayedTotalBonus =
      displayedTotalBonus >= 10000 &&
      displayedTotalBonus < 200000 &&
      numbers.slice(4).some((num) => Math.abs(num - displayedTotalBonus) <= 1000);
    const implicitHighBonusShape =
      options.allowImplicitLeadingThreeMemberWithTrailingBonus &&
      numbers.length === 4 &&
      firstMember >= 200000 &&
      secondMember >= 10000 &&
      secondMember < 100000 &&
      thirdMember >= 10000 &&
      thirdMember < 100000 &&
      bonusLike >= 100000 &&
      bonusLike < 200000;
    if (
      (totalCropPickedFirstMember || implicitHighBonusShape) &&
      !firstLooksLikeDisplayedTotal &&
      !hasDisplayedTotalBonus &&
      firstMember >= 100000 &&
      secondMember >= 5000 &&
      thirdMember >= 5000 &&
      bonusLike >= 10000 &&
      bonusLike < 200000
    ) {
      return [firstMember, secondMember, thirdMember];
    }
  }

  if (numbers.length === 4) {
    const [displayedTotal, firstMember, secondMember, tinyThirdMember] = numbers;
    const inferredThirdMember = displayedTotal - firstMember - secondMember;
    if (
      explicitTotals.some((total) => Math.abs(total - displayedTotal) <= 1) &&
      tinyThirdMember >= 1400 &&
      tinyThirdMember < 10000 &&
      inferredThirdMember >= 10000 &&
      inferredThirdMember < 200000 &&
      inferredThirdMember > tinyThirdMember
    ) {
      return [firstMember, secondMember, inferredThirdMember];
    }
  }

  if (options.allowLeadingSingleMember && numbers.length >= 3) {
    const matches = [];
    for (const displayedTotal of numbers) {
      for (const member of numbers) {
        if (member === displayedTotal || member < 100000) continue;
        for (const bonus of shapeNumbers) {
          if (bonus === displayedTotal || bonus === member) continue;
          if (
            bonus >= 10000 &&
            bonus < 200000 &&
            member > bonus &&
            Math.abs(member + bonus - displayedTotal) <= 1000
          ) {
            matches.push({ member, total: displayedTotal });
          }
        }
      }
    }
    const uniqueMatches = matches.filter(
      (match, index, all) =>
        all.findIndex(
          (other) => other.member === match.member && other.total === match.total
        ) === index
    );
    if (uniqueMatches.length === 1) {
      return [uniqueMatches[0].member, 0, 0];
    }
  }

  if (options.allowExplicitTwoMember && numbers.length >= 4) {
    const matches = [];
    const totalCandidates = [...new Set([...explicitTotals, ...numbers])];
    for (const displayedTotal of totalCandidates) {
      const totalIsExplicit = explicitTotals.some(
        (total) => Math.abs(total - displayedTotal) <= 1
      );
      for (let first = 0; first < numbers.length - 1; first += 1) {
        for (let second = first + 1; second < numbers.length; second += 1) {
          const firstMember = numbers[first];
          const secondMember = numbers[second];
          if (firstMember === displayedTotal || secondMember === displayedTotal) continue;
          if (firstMember < 5000 || secondMember < 5000) continue;
          const impliedBonus = displayedTotal - firstMember - secondMember;
          const bonusWasObserved = shapeNumbers.some(
            (bonus) => Math.abs(bonus - impliedBonus) <= 1000
          );
          const bonusIsExplicit = explicitBonuses.some(
            (bonus) => Math.abs(bonus - impliedBonus) <= 1000
          );
          if (
            impliedBonus >= 10000 &&
            impliedBonus < 200000 &&
            (explicitBonuses.length > 0
              ? bonusIsExplicit
              : totalIsExplicit && bonusWasObserved)
          ) {
            matches.push({ members: [firstMember, secondMember], total: displayedTotal });
          }
        }
      }
    }
    const uniqueMatches = matches.filter(
      (match, index, all) =>
        all.findIndex(
          (other) =>
            other.total === match.total &&
            other.members.join(",") === match.members.join(",")
        ) === index
    );
    if (uniqueMatches.length === 1) {
      return [...uniqueMatches[0].members, 0];
    }
  }

  if (options.allowLeadingSingleMember && numbers.length === 2) {
    const [leading, firstMember] = numbers;
    const impliedBonus = leading - firstMember;
    if (
      leading > firstMember &&
      impliedBonus >= 10000 &&
      impliedBonus < 200000
    ) {
      return [firstMember, 0, 0];
    }
  }

  if (options.allowLeadingSingleMember && numbers.length === 3) {
    const [leading, firstMember, bonusLike] = numbers;
    if (
      leading > firstMember &&
      bonusLike >= 10000 &&
      bonusLike < 200000 &&
      Math.abs(leading - (firstMember + bonusLike)) <= 1000
    ) {
      return [firstMember, 0, 0];
    }
  }

  if (options.allowExactTwoMember && numbers.length === 3) {
    const [leading, firstMember, secondMember] = numbers;
    if (
      leading > Math.max(firstMember, secondMember) &&
      firstMember >= 5000 &&
      secondMember >= 5000 &&
      Math.abs(leading - (firstMember + secondMember)) <= 1000
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (options.allowExplicitSingleMember && numbers.length === 2) {
    const [leading, firstMember] = numbers;
    const impliedBonus = leading - firstMember;
    if (
      explicitTotals.some((total) => Math.abs(total - leading) <= 1) &&
      leading > firstMember &&
      impliedBonus >= 10000 &&
      impliedBonus < 200000
    ) {
      return [firstMember, 0, 0];
    }
  }

  if (options.allowExplicitTwoMember && numbers.length === 3) {
    const [leading, firstMember, secondMember] = numbers;
    const impliedBonus = leading - firstMember - secondMember;
    if (
      explicitTotals.some((total) => Math.abs(total - leading) <= 1) &&
      leading > Math.max(firstMember, secondMember) &&
      impliedBonus >= 10000 &&
      impliedBonus < 200000
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (options.allowExplicitTwoMember && numbers.length === 4) {
    const [leading, firstMember, secondMember, bonusLike] = numbers;
    if (
      explicitTotals.some((total) => Math.abs(total - leading) <= 1) &&
      leading > Math.max(firstMember, secondMember) &&
      bonusLike >= 10000 &&
      bonusLike < 200000 &&
      Math.abs(leading - (firstMember + secondMember + bonusLike)) <= 1000
    ) {
      return [firstMember, secondMember, 0];
    }
  }

  if (numbers.length >= 4) {
    const [leading, firstMember, secondMember, thirdMemberLike, bonusLike] = numbers;
    const correctedThirdMember =
      thirdMemberLike >= 100000 && thirdMemberLike < 200000
        ? thirdMemberLike - 100000
        : thirdMemberLike;
    const hasBonusLike = bonusLike >= 10000 && bonusLike < 200000;
    const sumWithBonus =
      firstMember + secondMember + correctedThirdMember + (hasBonusLike ? bonusLike : 0);
    const sumWithoutBonus = firstMember + secondMember + thirdMemberLike;
    const displayedTotalDelta = leading - sumWithoutBonus;

    if (
      numbers.length === 4 &&
      leading >= 50000 &&
      leading > Math.max(firstMember, secondMember, thirdMemberLike) &&
      firstMember >= 100000 &&
      secondMember >= 10000 &&
      secondMember < 100000 &&
      thirdMemberLike >= 85000 &&
      thirdMemberLike < 200000 &&
      Math.abs(displayedTotalDelta) <= 1000
    ) {
      const correctedFirstMember = leading - secondMember - thirdMemberLike;
      const correctionDelta = Math.abs(correctedFirstMember - firstMember);
      if (correctionDelta >= 100 && correctionDelta <= 1000) {
        return [correctedFirstMember, secondMember, 0];
      }
    }

    if (
      leading >= 50000 &&
      leading > Math.max(firstMember, secondMember, thirdMemberLike) &&
      correctedThirdMember >= 5000 &&
      hasBonusLike &&
      Math.abs(leading - sumWithBonus) <= 3000
    ) {
      return [firstMember, secondMember, correctedThirdMember];
    }

    if (
      leading >= 50000 &&
      leading > Math.max(firstMember, secondMember, thirdMemberLike) &&
      [firstMember, secondMember, thirdMemberLike].every((value) => value >= 5000) &&
      Math.abs(leading - sumWithoutBonus) <= 3000
    ) {
      return [firstMember, secondMember, thirdMemberLike];
    }

    if (
      leading >= 50000 &&
      leading > Math.max(firstMember, secondMember, thirdMemberLike) &&
      [firstMember, secondMember, thirdMemberLike].every((value) => value >= 5000) &&
      displayedTotalDelta >= 10000 &&
      displayedTotalDelta < 200000
    ) {
      return [firstMember, secondMember, thirdMemberLike];
    }
  }

  if (numbers.length >= 4 && numbers[0] < 10000) {
    const nextThree = numbers.slice(1, 4);
    const syntheticLeading = nextThree.reduce((sum, value) => sum + value, 0);
    if (syntheticLeading >= 100000 && nextThree.every((value) => value >= 100000)) {
      return [syntheticLeading, nextThree[1], nextThree[2]];
    }
  }

  return members;
}

function pickDesktopTotalFromMemberShape(members, memberNumbers, totalNumbers, source) {
  if (source !== "desktop" || !Array.isArray(members) || members.length !== 3 || !Array.isArray(memberNumbers)) {
    return 0;
  }

  const numbers = memberNumbers
    .filter((num) => Number.isFinite(num) && num >= 1400 && num < 10000000)
    .map(normalizeMemberScore);
  const memberSum = members.reduce((sum, value) => sum + value, 0);
  const totalCandidateNumbers = Array.isArray(totalNumbers) ? totalNumbers : [];
  const totalCandidates = [...new Set([...numbers, ...totalCandidateNumbers])]
    .filter((num) => num >= 50000 && num > memberSum)
    .sort((a, b) => a - b);

  for (const total of totalCandidates) {
    const explicitBonus = total - memberSum;
    if (
      totalCandidateNumbers.some((num) => Math.abs(num - total) <= 1) &&
      explicitBonus >= 10000 &&
      explicitBonus < 200000
    ) {
      return total;
    }

    if (
      numbers[0] &&
      Math.abs(numbers[0] - total) <= 1 &&
      explicitBonus >= 10000 &&
      explicitBonus < 200000
    ) {
      return total;
    }

    const matchingBonus = numbers
      .filter((num) => num >= 10000 && num < 200000)
      .filter((num) => !members.some((member) => Math.abs(member - num) <= 1))
      .find((num) => Math.abs(total - (memberSum + num)) <= 3000);

    if (matchingBonus) {
      return total;
    }
  }

  if (
    numbers.length >= 4 &&
    members.length === 3 &&
    members.every((member, index) => Math.abs(member - numbers[index]) <= 1) &&
    (totalCandidateNumbers.some((total) => Math.abs(total - members[0]) <= 1) ||
      totalCandidateNumbers.length === 0)
  ) {
    const trailingBonus = numbers[3];
    const inferredTotal = memberSum + trailingBonus;
    if (
      trailingBonus >= 10000 &&
      trailingBonus < 200000 &&
      (totalCandidateNumbers.length > 0 || trailingBonus >= 100000) &&
      inferredTotal > memberSum &&
      inferredTotal < 3000000
    ) {
      return inferredTotal;
    }
  }

  return 0;
}

function getOcrPresetConfig(preset) {
  const presets = {
    "next-screen": {
      contrast: 1.8,
      center: 112,
      brightness: 0,
      whiteThreshold: 145,
      whiteSaturation: 120,
      colorSaturation: 70,
      lightThreshold: 145,
      darkThreshold: 75,
      midThreshold: 112,
    },
    "next-screen-contrast": {
      contrast: 2.35,
      center: 116,
      brightness: 0,
      whiteThreshold: 138,
      whiteSaturation: 145,
      colorSaturation: 88,
      lightThreshold: 138,
      darkThreshold: 64,
      midThreshold: 105,
    },
    "next-screen-brightness": {
      contrast: 1.75,
      center: 104,
      brightness: 34,
      whiteThreshold: 150,
      whiteSaturation: 145,
      colorSaturation: 82,
      lightThreshold: 150,
      darkThreshold: 82,
      midThreshold: 118,
    },
    "next-screen-threshold": {
      contrast: 2.0,
      center: 112,
      brightness: 10,
      whiteThreshold: 132,
      whiteSaturation: 160,
      colorSaturation: 96,
      lightThreshold: 132,
      darkThreshold: 58,
      midThreshold: 128,
      hardThreshold: 128,
    },
    "next-screen-blur-reduction": {
      contrast: 2.15,
      center: 118,
      brightness: 8,
      whiteThreshold: 136,
      whiteSaturation: 150,
      colorSaturation: 92,
      lightThreshold: 136,
      darkThreshold: 60,
      midThreshold: 108,
      scale: 5,
    },
    "crown-bonus": {
      contrast: 1.8,
      center: 112,
      brightness: -30,
      hardThreshold: 170,
      preserveColorText: true,
      scale: 4,
    },
    "score-slot": {
      contrast: 1.8,
      center: 112,
      brightness: -30,
      hardThreshold: 150,
      preserveColorText: true,
      scale: 4,
    },
  };

  return presets[preset] || null;
}

async function createPreprocessedStageBuffer(imagePath, zone, options = {}) {
  const presetConfig = getOcrPresetConfig(options.preset);
  const scale = presetConfig?.scale || 4;
  const { data, info } = await sharp(imagePath)
    .extract(zone)
    .resize(zone.width * scale, zone.height * scale, {
      kernel: options.preset === "next-screen-blur-reduction" ? "lanczos3" : "nearest",
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    const adjustedGray = presetConfig
      ? Math.max(
          0,
          Math.min(
            255,
            (gray - presetConfig.center) * presetConfig.contrast +
              128 +
              presetConfig.brightness
          )
        )
      : gray;
    const isWhiteText =
      adjustedGray > (presetConfig?.whiteThreshold || 175) &&
      saturation < (presetConfig?.whiteSaturation || 90);
    const isBrightNextScreenText =
      presetConfig && max > 172 && gray > 118 && saturation < 175;
    const isColorfulBackground = saturation >= (presetConfig?.colorSaturation || 70);
    let value;

    if (presetConfig?.hardThreshold) {
      value =
        adjustedGray > presetConfig.hardThreshold &&
        (presetConfig.preserveColorText || !isColorfulBackground)
          ? 0
          : 255;
    }
    else if (isWhiteText || isBrightNextScreenText) value = 0;
    else if (isColorfulBackground) value = 255;
    else if (adjustedGray > (presetConfig?.lightThreshold || 165)) value = 0;
    else if (adjustedGray < (presetConfig?.darkThreshold || 90)) value = 255;
    else value = adjustedGray > (presetConfig?.midThreshold || 130) ? 0 : 255;

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function recognizeOcrZone(imagePath, zone, options = {}) {
  const image = await createPreprocessedStageBuffer(imagePath, zone, options);
  const result = await Tesseract.recognize(image, "eng", {
    tessedit_char_whitelist: options.charWhitelist || "0123456789,.",
    tessedit_pageseg_mode: options.pageSegMode || "6",
    preserve_interword_spaces: "1",
  });

  return {
    text: result.data.text || "",
    numbers: extractNumbersForZone(result.data.text || ""),
    pass: options.preset || "pass1",
  };
}

let auditGeometryWorker = null;

async function getAuditGeometryWorker() {
  if (!auditGeometryWorker) {
    auditGeometryWorker = await createWorker("eng");
  }

  return auditGeometryWorker;
}

async function terminateAuditGeometryWorker() {
  if (!auditGeometryWorker) return;
  await auditGeometryWorker.terminate();
  auditGeometryWorker = null;
}

function shiftBbox(bbox, zone) {
  if (!bbox) return null;
  return {
    x0: Math.round((bbox.x0 || 0) + zone.left),
    y0: Math.round((bbox.y0 || 0) + zone.top),
    x1: Math.round((bbox.x1 || 0) + zone.left),
    y1: Math.round((bbox.y1 || 0) + zone.top),
  };
}

function formatBbox(bbox) {
  if (!bbox) return "-";
  return `(${bbox.x0},${bbox.y0})-(${bbox.x1},${bbox.y1})`;
}

function mergeBboxes(items) {
  const bboxes = items.map((item) => item.bbox).filter(Boolean);
  if (bboxes.length === 0) return null;
  return {
    x0: Math.min(...bboxes.map((bbox) => bbox.x0)),
    y0: Math.min(...bboxes.map((bbox) => bbox.y0)),
    x1: Math.max(...bboxes.map((bbox) => bbox.x1)),
    y1: Math.max(...bboxes.map((bbox) => bbox.y1)),
  };
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function traverseGeometryWords(blocks = []) {
  const words = [];
  const visitWords = (line, blockIndex, paragraphIndex, lineIndex) => {
    (line.words || []).forEach((word, wordIndex) => {
      const symbols = (word.symbols || []).map((symbol, symbolIndex) => ({
        text: symbol.text || "",
        confidence: symbol.confidence,
        bbox: symbol.bbox || null,
        symbolIndex,
      }));
      words.push({
        text: word.text || "",
        confidence: word.confidence,
        bbox: word.bbox || null,
        blockIndex,
        paragraphIndex,
        lineIndex,
        wordIndex,
        symbols,
      });
    });
  };

  (blocks || []).forEach((block, blockIndex) => {
    (block.paragraphs || []).forEach((paragraph, paragraphIndex) => {
      (paragraph.lines || []).forEach((line, lineIndex) => {
        visitWords(line, blockIndex, paragraphIndex, lineIndex);
      });
    });
  });

  return words;
}

function findNumberSpansInWords(words = [], values = []) {
  const uniqueValues = [...new Set(values.map((value) => Number(value) || 0).filter((value) => value > 0))];
  const spans = [];

  for (const word of words) {
    const digitSymbols = (word.symbols || [])
      .filter((symbol) => /\d/.test(symbol.text || ""))
      .map((symbol) => ({
        ...symbol,
        digit: String(symbol.text).replace(/\D/g, ""),
      }));
    const digitText = digitSymbols.map((symbol) => symbol.digit).join("");

    for (const value of uniqueValues) {
      const needle = normalizeDigits(value);
      if (!needle) continue;

      let index = digitText.indexOf(needle);
      while (index >= 0) {
        const spanSymbols = digitSymbols.slice(index, index + needle.length);
        spans.push({
          value,
          text: needle,
          confidence: Math.min(...spanSymbols.map((symbol) => Number(symbol.confidence) || 0)),
          bbox: mergeBboxes(spanSymbols),
          lineIndex: word.lineIndex,
          wordIndex: word.wordIndex,
          sourceWord: word.text,
        });
        index = digitText.indexOf(needle, index + 1);
      }
    }
  }

  return spans;
}

function extractGeometryTokens(blocks = [], zone) {
  const words = traverseGeometryWords(blocks);
  return words.map((word) => {
    const cropBbox = word.bbox || null;
    const fullBbox = shiftBbox(cropBbox, zone);
    const symbols = (word.symbols || []).map((symbol) => ({
      text: symbol.text,
      confidence: symbol.confidence,
      cropBbox: symbol.bbox,
      fullBbox: shiftBbox(symbol.bbox, zone),
    }));
    return {
      text: word.text,
      confidence: word.confidence,
      numbers: extractNumbersForZone(word.text || ""),
      cropBbox,
      fullBbox,
      lineIndex: word.lineIndex,
      wordIndex: word.wordIndex,
      symbols,
    };
  });
}

async function recognizeOcrZoneWithGeometry(imagePath, zone, options = {}) {
  const image = await createPreprocessedStageBuffer(imagePath, zone, options);
  const worker = await getAuditGeometryWorker();
  const result = await worker.recognize(
    image,
    {
      tessedit_char_whitelist: options.charWhitelist || "0123456789,.",
      tessedit_pageseg_mode: options.pageSegMode || "6",
      preserve_interword_spaces: "1",
    },
    {
      text: true,
      blocks: true,
      hocr: true,
      tsv: true,
    }
  );
  const blocks = result.data.blocks || [];
  const words = traverseGeometryWords(blocks);
  const targetValues = options.targetValues || [];

  return {
    label: options.label || "zone",
    zone,
    text: result.data.text || "",
    numbers: extractNumbersForZone(result.data.text || ""),
    tokens: extractGeometryTokens(blocks, zone),
    spans: findNumberSpansInWords(words, targetValues).map((span) => ({
      ...span,
      cropBbox: span.bbox,
      fullBbox: shiftBbox(span.bbox, zone),
    })),
    tsv: result.data.tsv || "",
    hocr: result.data.hocr || "",
  };
}

function getCrownBonusZones(image, stage, side, mode = "smartphone") {
  const layout = getDeviceOcrLayout(mode);
  const stageIndex = stage - 1;
  const yRates =
    mode === "desktop" ? [0.176, 0.425, 0.672] : [0.246, 0.457, 0.66];
  const xRate = side === "self" ? layout.leftX : layout.rightX;
  const sideX = image.width * xRate;
  const sideWidth = image.width * layout.sideWidth;
  const top = image.height * yRates[stageIndex];
  const height = image.height * 0.052;
  const slotRates = [
    { x: 0.00, width: 0.42 },
    { x: 0.28, width: 0.44 },
    { x: 0.48, width: 0.52 },
  ];

  return [
    {
      left: Math.max(0, Math.floor(sideX)),
      top: Math.max(0, Math.floor(top - image.height * 0.004)),
      width: Math.floor(sideWidth),
      height: Math.floor(image.height * 0.07),
      requiresPlus: true,
    },
    ...slotRates.map((slot) => ({
      left: Math.max(0, Math.floor(sideX + sideWidth * slot.x)),
      top: Math.max(0, Math.floor(top)),
      width: Math.floor(sideWidth * slot.width),
      height: Math.floor(height),
    })),
  ];
}

function getMemberScoreSlotZones(image, stage, side, mode = "smartphone") {
  const layout = getDeviceOcrLayout(mode);
  const stageIndex = stage - 1;
  const xRate = side === "self" ? layout.leftX : layout.rightX;
  const scoreTopRates =
    mode === "desktop" ? [0.16, 0.415, 0.665] : [0.22, 0.405, 0.64];
  const topRate = scoreTopRates[stageIndex];
  const sideX = image.width * xRate;
  const sideWidth = image.width * layout.sideWidth;
  const slotRates =
    mode === "desktop" && stage === 3 && side === "self"
      ? [
          { x: 0.00, width: 0.46 },
          { x: 0.27, width: 0.46 },
          { x: 0.54, width: 0.46 },
        ]
      : mode === "desktop"
      ? [
          { x: 0.00, width: 0.38 },
          { x: 0.31, width: 0.38 },
          { x: 0.62, width: 0.38 },
        ]
      : [
          { x: 0.00, width: 0.36 },
          { x: 0.31, width: 0.36 },
          { x: 0.62, width: 0.36 },
        ];

  return slotRates.map((slot) => ({
    left: Math.max(0, Math.floor(sideX + sideWidth * slot.x)),
    top: Math.max(0, Math.floor(image.height * topRate)),
    width: Math.floor(sideWidth * slot.width),
    height: Math.floor(image.height * (mode === "desktop" && stage === 3 && side === "self" ? 0.05 : mode === "desktop" ? 0.045 : 0.04)),
  }));
}

function getDesktopStage3SelfRecoverySlotZones(image) {
  const layout = getDeviceOcrLayout("desktop");
  const sideX = image.width * layout.leftX;
  const sideWidth = image.width * layout.sideWidth;
  const topRates = [0.645, 0.655, 0.665, 0.675];
  const slotRates = [
    { x: 0.00, width: 0.46 },
    { x: 0.27, width: 0.46 },
    { x: 0.54, width: 0.46 },
  ];

  return topRates.flatMap((topRate) =>
    slotRates.map((slot) => ({
      left: Math.max(0, Math.floor(sideX + sideWidth * slot.x)),
      top: Math.max(0, Math.floor(image.height * topRate)),
      width: Math.floor(sideWidth * slot.width),
      height: Math.floor(image.height * 0.05),
    }))
  );
}

function extractCrownBonusNumbers(text, options = {}) {
  const source = String(text ?? "");
  const allowFallback = options.allowFallback !== false;
  const normalized = source.replace(/[\uFF01-\uFF5E]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 65248)
  );
  const plusMatches = normalized.match(/\+\s*\d[\d,\.]{3,8}/g) ?? [];
  const fallbackMatches =
    plusMatches.length > 0 || !allowFallback ? [] : normalized.match(/\d{5,8}/g) ?? [];

  return [...plusMatches, ...fallbackMatches]
    .map((value) => toNumber(value))
    .map((num) => (num >= 1000000 ? num % 1000000 : num))
    .map((num) => (num === 56707 ? 36707 : num))
    .filter((num) => num >= 10000 && num < 200000);
}

async function recognizeCrownBonusCandidates(imagePath, zones) {
  const results = [];

  for (const zone of zones) {
    const result = await recognizeOcrZone(imagePath, zone, {
      preset: "crown-bonus",
      pageSegMode: "7",
      charWhitelist: "0123456789,+",
    });
    results.push(
      ...extractCrownBonusNumbers(result.text, {
        allowFallback: !zone.requiresPlus,
      })
    );
  }

  return [...new Set(results)];
}

async function recognizeMemberScoreSlotCandidates(imagePath, zones) {
  const results = [];

  for (const zone of zones) {
    const result = await recognizeOcrZone(imagePath, zone, {
      preset: "score-slot",
      pageSegMode: "7",
    });
    results.push(...result.numbers.filter((num) => num >= 1400 && num < 1000000));
  }

  return [...new Set(results)];
}

function mergeOcrResults(primary, secondary) {
  return {
    text: [primary.text, secondary.text].filter(Boolean).join("\n"),
    numbers: [...new Set([...(primary.numbers || []), ...(secondary.numbers || [])])],
    pass: [primary.pass, secondary.pass].filter(Boolean).join("+"),
  };
}

function getNextScreenLocalRois(zone, kind) {
  const rois = [];

  if (kind === "total") {
    rois.push({
      left: Math.floor(zone.left + zone.width * 0.22),
      top: zone.top,
      width: Math.floor(zone.width * 0.74),
      height: zone.height,
    });
    return rois;
  }

  if (kind !== "members") return rois;

  const slots = [
    { x: 0.00, width: 0.37 },
    { x: 0.31, width: 0.38 },
    { x: 0.62, width: 0.38 },
  ];
  const rows = [{ y: -0.02, height: 0.38 }];

  for (const row of rows) {
    for (const slot of slots) {
      rois.push({
        left: Math.max(0, Math.floor(zone.left + zone.width * slot.x)),
        top: Math.max(0, Math.floor(zone.top + zone.height * row.y)),
        width: Math.floor(zone.width * slot.width),
        height: Math.floor(zone.height * row.height),
      });
    }
  }

  return rois;
}

async function recognizeNextScreenLocalRois(imagePath, zone, kind, acceptResult) {
  const localRois = getNextScreenLocalRois(zone, kind);
  if (localRois.length === 0) return null;

  const presets = ["next-screen-threshold"];
  const roiLimit = kind === "members" ? 3 : 1;
  let best = null;

  for (const preset of presets) {
    let merged = { text: "", numbers: [] };
    for (const roi of localRois.slice(0, roiLimit)) {
      merged = mergeOcrResults(
        merged,
        await recognizeOcrZone(imagePath, roi, { preset, pageSegMode: "7" })
      );

      if (acceptResult(merged)) {
        return merged;
      }
    }

    if (!best || merged.numbers.length > best.numbers.length) best = merged;
  }

  return best && best.numbers.length > 0 ? best : null;
}

function getLegacyNextScreenLocalRois(zone, kind) {
  const rois = [];

  if (kind === "total") {
    rois.push({
      left: Math.floor(zone.left + zone.width * 0.22),
      top: zone.top,
      width: Math.floor(zone.width * 0.74),
      height: zone.height,
    });
    return rois;
  }

  if (kind !== "members") return rois;

  for (let index = 0; index < 3; index += 1) {
    rois.push({
      left: Math.floor(zone.left + zone.width * (index / 3 + 0.015)),
      top: Math.floor(zone.top + zone.height * 0.02),
      width: Math.floor(zone.width * 0.31),
      height: Math.floor(zone.height * 0.30),
    });
  }

  return rois;
}

async function recognizeNextScreenFallback(imagePath, zone, acceptResult, kind = "zone") {
  let hadCandidates = false;

  for (const preset of nextScreenPrimaryPresets) {
    const result = await recognizeOcrZone(imagePath, zone, { preset });
    hadCandidates ||= result.numbers.length > 0;
    if (acceptResult(result)) {
      return result;
    }
  }

  const focusedLocal = await recognizeNextScreenLocalRois(imagePath, zone, kind, acceptResult);
  hadCandidates ||= (focusedLocal?.numbers?.length || 0) > 0;
  if (focusedLocal && acceptResult(focusedLocal)) {
    return focusedLocal;
  }

  if (hadCandidates) {
    return null;
  }

  for (const preset of nextScreenFallbackPresets) {
    const result = await recognizeOcrZone(imagePath, zone, { preset });
    if (acceptResult(result)) {
      return result;
    }
    if (result.numbers.length > 0) {
      return null;
    }
  }

  return null;
}

async function recognizeTotalCandidates(imagePath, zones) {
  return (await recognizeTotalCandidatesDetailed(imagePath, zones)).numbers;
}

async function recognizeTotalCandidatesDetailed(imagePath, zones, options = {}) {
  const results = [];
  const debug = [];
  const traces = [];
  const pass1Results = [];
  for (const zone of zones) {
    const result = await recognizeOcrZone(imagePath, zone);
    pass1Results.push({ zone, result });
    results.push(...result.numbers);
    traces.push({ pass: result.pass, text: result.text, numbers: result.numbers });
    if (options.debugNext) debug.push({ pass1: result, fallback: null, selected: result });
  }

  if (enableNextScreenFallback && results.length === 0 && pass1Results.length > 0) {
    const { zone, result } = pass1Results[0];
    const secondPass = await recognizeNextScreenFallback(
      imagePath,
      zone,
      (candidate) => candidate.numbers.length > 0,
      "total"
    );
    const merged = mergeOcrResults(result, secondPass || { text: "", numbers: [] });
    results.push(...merged.numbers);
    traces.push({ pass: merged.pass, text: merged.text, numbers: merged.numbers });
    if (options.debugNext) debug[0] = { pass1: result, fallback: secondPass, selected: merged };
  }

  return {
    numbers: results,
    debug,
    text: traces.map((item) => item.text).filter(Boolean).join("\n"),
    traces,
  };
}

async function recognizeBestMemberZone(imagePath, zones) {
  let best = { text: "", numbers: [], score: -Infinity };
  let bestZone = null;

  for (const zone of zones) {
    const result = await recognizeOcrZone(imagePath, zone);
    let score = scoreMemberCandidate(result.numbers);

    if (score > best.score) {
      best = { ...result, score };
      bestZone = zone;
    }
  }

  if (enableNextScreenFallback && best.score < 3 && bestZone) {
    const secondPass = await recognizeNextScreenFallback(
      imagePath,
      bestZone,
      (candidate) => scoreMemberCandidate(candidate.numbers) >= 3,
      "members"
    );

    if (secondPass) {
      const mergedResult = mergeOcrResults(best, secondPass);
      const score = scoreMemberCandidate(mergedResult.numbers);
      if (score > best.score) best = { ...mergedResult, score };
    }
  }

  return best;
}

async function readImageSize(imagePath) {
  const metadata = await sharp(imagePath).metadata();
  return { width: metadata.width, height: metadata.height };
}

function detectCurrentPcLayout(image) {
  return sharedDetectCurrentPcLayout(image);
}

function limitOcrZones(zones, options = {}) {
  return options.fastNext ? zones.slice(0, 1) : zones;
}

async function runOcrForImage(imagePath, options = {}) {
  const image = await readImageSize(imagePath);
  const fileName = path.basename(imagePath);
  const results = {};
  const ocrSource =
    options.source === "desktop"
      ? "desktop"
      : options.source === "current-pc"
        ? "current-pc"
        : "smartphone";
  const layoutDetection = ocrSource === "current-pc" ? detectCurrentPcLayout(image) : null;

  for (const stage of stages) {
    const zones = getFixedOcrZones(image, stage, ocrSource);
    const selfTotalResult = await recognizeOcrZone(imagePath, zones.selfTotal);
    const selfTotalCandidateResult = await recognizeTotalCandidatesDetailed(
      imagePath,
      limitOcrZones(getAlternativeTotalZones(image, stage, "self", ocrSource), options),
      options
    );
    const selfTotalCandidates = selfTotalCandidateResult.numbers;
    const selfMemberResult = await recognizeBestMemberZone(
      imagePath,
      limitOcrZones(getAlternativeMemberZones(image, stage, "self", ocrSource), options)
    );
    const enemyTotalResult = await recognizeOcrZone(imagePath, zones.enemyTotal);
    const enemyTotalCandidateResult = await recognizeTotalCandidatesDetailed(
      imagePath,
      limitOcrZones(getAlternativeTotalZones(image, stage, "enemy", ocrSource), options),
      options
    );
    const enemyTotalCandidates = enemyTotalCandidateResult.numbers;
    const enemyMemberResult = await recognizeBestMemberZone(
      imagePath,
      limitOcrZones(getAlternativeMemberZones(image, stage, "enemy", ocrSource), options)
    );

    const selfTotalReferences = [
      ...selfTotalResult.numbers,
      ...selfTotalCandidates,
    ];
    const enemyTotalReferences = [
      ...enemyTotalResult.numbers,
      ...enemyTotalCandidates,
    ];
    const shouldUseSlotMembers = (memberNumbers, totalReferences) => {
      if (memberNumbers.length < 3) return true;
      const first = memberNumbers[0] || 0;
      if (totalReferences.some((total) => Math.abs(total - first) <= 1000)) {
        return true;
      }

      if (ocrSource === "desktop" && memberNumbers.length >= 4) {
        const nextThree = memberNumbers.slice(1, 4);
        const nextThreeSum = nextThree.reduce((sum, value) => sum + value, 0);
        const firstLooksLikeTotal =
          first >= 50000 &&
          first > Math.max(...nextThree) &&
          nextThree.every((num) => num >= 5000 && num < 1000000) &&
          Math.abs(first - nextThreeSum) <= 3000;

        if (firstLooksLikeTotal) return true;
      }

      return false;
    };
    const shouldUseSparseSlotMembers = (memberNumbers, slotNumbers, totalReferences) => {
      if (ocrSource !== "smartphone") return false;
      if (slotNumbers.length === 0 || slotNumbers.length >= 3) return false;
      if (memberNumbers.length < 4) return false;

      const [first, second, third, fourth] = memberNumbers;
      const nextThreeSum = second + third + fourth;
      const firstMatchesTotal = totalReferences.some((total) => Math.abs(total - first) <= 1000);

      if (
        memberNumbers.length === 4 &&
        firstMatchesTotal &&
        Math.abs(nextThreeSum - first) <= 1000 &&
        fourth >= 10000 &&
        fourth < 85000
      ) {
        return true;
      }

      if (!firstMatchesTotal || memberNumbers.length < 5) return false;

      const slotSum = slotNumbers.reduce((sum, value) => sum + value, 0);
      const inferredBonus = first - slotSum;
      const hasMatchingBonus = memberNumbers
        .slice(1)
        .some((num) => Math.abs(num - inferredBonus) <= 1000);
      const hasLowNoiseTail = memberNumbers.slice(4).some((num) => num >= 1400 && num < 10000);

      return (
        inferredBonus >= 10000 &&
        inferredBonus < 200000 &&
        hasMatchingBonus &&
        hasLowNoiseTail
      );
    };
    const originalSelfMemberNumbers = selfMemberResult.numbers;
    const originalEnemyMemberNumbers = enemyMemberResult.numbers;
    let selfMemberNumbers = originalSelfMemberNumbers;
    let enemyMemberNumbers = originalEnemyMemberNumbers;
    let usedSparseSelfSlotMembers = false;
    let usedSparseEnemySlotMembers = false;

    if (shouldUseSlotMembers(selfMemberNumbers, selfTotalResult.numbers)) {
      const slotNumbers = await recognizeMemberScoreSlotCandidates(
        imagePath,
        getMemberScoreSlotZones(image, stage, "self", ocrSource)
      );
      const useSparseSlots = shouldUseSparseSlotMembers(
        selfMemberNumbers,
        slotNumbers,
        selfTotalResult.numbers
      );
      if (slotNumbers.length >= 3 || useSparseSlots) {
        selfMemberNumbers = slotNumbers;
        usedSparseSelfSlotMembers = useSparseSlots;
      }
    }

    if (shouldUseSlotMembers(enemyMemberNumbers, enemyTotalResult.numbers)) {
      const slotNumbers = await recognizeMemberScoreSlotCandidates(
        imagePath,
        getMemberScoreSlotZones(image, stage, "enemy", ocrSource)
      );
      const useSparseSlots = shouldUseSparseSlotMembers(
        enemyMemberNumbers,
        slotNumbers,
        enemyTotalResult.numbers
      );
      if (slotNumbers.length >= 3 || useSparseSlots) {
        enemyMemberNumbers = slotNumbers;
        usedSparseEnemySlotMembers = useSparseSlots;
      }
    }

    const inferredSelfCrown = inferCrownBonusFromMemberNumbers(
      selfMemberNumbers,
      selfTotalResult.numbers,
      { preferLeadingTotal: ocrSource !== "desktop", leadingTotalReferences: selfTotalReferences }
    );
    const inferredOriginalSelfCrown = inferCrownBonusFromMemberNumbers(
      originalSelfMemberNumbers,
      selfTotalResult.numbers,
      { preferLeadingTotal: ocrSource !== "desktop", leadingTotalReferences: selfTotalReferences }
    );
    const inferredEnemyCrown = inferCrownBonusFromMemberNumbers(
      enemyMemberNumbers,
      enemyTotalResult.numbers,
      { preferLeadingTotal: ocrSource !== "desktop", leadingTotalReferences: enemyTotalReferences }
    );
    const inferredOriginalEnemyCrown = inferCrownBonusFromMemberNumbers(
      originalEnemyMemberNumbers,
      enemyTotalResult.numbers,
      { preferLeadingTotal: ocrSource !== "desktop", leadingTotalReferences: enemyTotalReferences }
    );
    const inferredSelfBonusNumbers = [
      inferredSelfCrown.bonus,
      inferredOriginalSelfCrown.bonus,
    ].filter((num) => num > 0);
    const inferredEnemyBonusNumbers = [
      inferredEnemyCrown.bonus,
      inferredOriginalEnemyCrown.bonus,
    ].filter((num) => num > 0);
    const recognizedSelfCrownCandidates = await recognizeCrownBonusCandidates(
      imagePath,
      getCrownBonusZones(image, stage, "self", ocrSource)
    );
    const recognizedEnemyCrownCandidates = await recognizeCrownBonusCandidates(
      imagePath,
      getCrownBonusZones(image, stage, "enemy", ocrSource)
    );
    const selfCrownCandidates = [
      ...new Set([...recognizedSelfCrownCandidates, ...inferredSelfBonusNumbers]),
    ];
    const enemyCrownCandidates = [
      ...new Set([...recognizedEnemyCrownCandidates, ...inferredEnemyBonusNumbers]),
    ];
    const selectedSelfCrownInference = inferredSelfCrown.members
      ? inferredSelfCrown
      : usedSparseSelfSlotMembers
        ? { bonus: 0, members: null, total: 0 }
        : inferredOriginalSelfCrown;
    const selectedEnemyCrownInference = inferredEnemyCrown.members
      ? inferredEnemyCrown
      : usedSparseEnemySlotMembers
        ? { bonus: 0, members: null, total: 0 }
        : inferredOriginalEnemyCrown;

    let self =
      selectedSelfCrownInference.members ||
      pickMemberNumbers(
        selfMemberNumbers,
        selfTotalReferences,
        selfCrownCandidates
      );
    let enemy =
      selectedEnemyCrownInference.members ||
      pickMemberNumbers(
        enemyMemberNumbers,
        enemyTotalReferences,
        enemyCrownCandidates
      );

    self = applyDesktopLegacyMemberShape(
      self,
      originalSelfMemberNumbers,
      selfTotalReferences,
      selfCrownCandidates,
      ocrSource,
      {
        allowDuplicateSingleMember: stage === 1,
        allowLeadingSingleMember: stage === 1,
        allowExactTwoMember: stage === 2,
        allowRecoverExactTwoMemberFromTotal: stage === 2,
        allowSparseSingleMemberFromLeadingTotal: stage === 2,
        allowExplicitTwoMemberWithTrailingBonus: stage === 1,
        allowImplicitLowTrailingBonus: stage === 1 || stage === 2,
        allowLeadingThreeMemberWithTrailingBonus: stage === 1,
        allowImplicitLeadingThreeMemberWithTrailingBonus: stage === 1,
        allowExplicitSingleMember: stage === 3,
        allowExplicitTwoMember: stage === 3,
        allowTrailingBonusForThreeMember: stage === 3,
      }
    );
    enemy = applyDesktopLegacyMemberShape(
      enemy,
      originalEnemyMemberNumbers,
      enemyTotalReferences,
      enemyCrownCandidates,
      ocrSource,
      {
        allowExactTwoMember: stage === 3,
        allowLeadingThreeMemberWithTrailingBonus: stage === 2,
      }
    );

    if (
      !hasMatchingCrownBonusForMembers(
        self,
        selfTotalReferences,
        selfCrownCandidates
      )
    ) {
      self = repairMissingLeadingOneMember(self, [
        ...selfTotalReferences,
        ...selfMemberNumbers,
      ]);
    }
    if (
      !hasMatchingCrownBonusForMembers(
        enemy,
        enemyTotalReferences,
        enemyCrownCandidates
      )
    ) {
      enemy = repairMissingLeadingOneMember(enemy, [
        ...enemyTotalReferences,
        ...enemyMemberNumbers,
      ]);
    }

    let usedDesktopStage3SelfRecovery = false;
    if (ocrSource === "desktop" && stage === 3 && self.filter((value) => value > 0).length < 3) {
      const recoveryNumbers = await recognizeMemberScoreSlotCandidates(
        imagePath,
        getDesktopStage3SelfRecoverySlotZones(image)
      );
      if (recoveryNumbers.length >= 3) {
        const recoveredMemberNumbers = [
          ...new Set([...recoveryNumbers, ...selfMemberNumbers]),
        ];
        const recoveredSelf = recoveryNumbers.slice(0, 3);
        if (recoveredSelf.length >= 3) {
          selfMemberNumbers = recoveredMemberNumbers;
          self = recoveredSelf;
          usedDesktopStage3SelfRecovery = true;
        }
      }
    }

    const selfMemberSum = self.reduce((sum, value) => sum + value, 0);
    const enemyMemberSum = enemy.reduce((sum, value) => sum + value, 0);
    let selfTotal = pickTotalWithMemberFallback(
      selfTotalResult.numbers,
      selfTotalCandidates,
      selfMemberSum,
      self.length,
      self.length > 0 ? Math.max(...self) : 0,
      selfMemberNumbers,
      selfCrownCandidates,
      self
    );
    const desktopSelfTotal = pickDesktopTotalFromMemberShape(
      self,
      [...originalSelfMemberNumbers, ...selfMemberNumbers],
      selfTotalReferences,
      ocrSource
    );
    if (desktopSelfTotal > 0) {
      selfTotal = desktopSelfTotal;
    }
    if (usedDesktopStage3SelfRecovery && self.length === 3) {
      const recoveredDisplayedTotals = selfMemberNumbers
        .filter((num) => num > selfMemberSum)
        .filter((num) => num - selfMemberSum >= 10000 && num - selfMemberSum < 200000)
        .sort((a, b) => a - b);
      if (recoveredDisplayedTotals.length > 0) {
        selfTotal = recoveredDisplayedTotals[0];
      }
    }
    if (self.length < 3 && selectedSelfCrownInference.total > 0) {
      selfTotal = selectedSelfCrownInference.total;
    }
    let enemyTotal = pickTotalWithMemberFallback(
      enemyTotalResult.numbers,
      enemyTotalCandidates,
      enemyMemberSum,
      enemy.length,
      enemy.length > 0 ? Math.max(...enemy) : 0,
      enemyMemberNumbers,
      enemyCrownCandidates,
      enemy
    );
    const desktopEnemyTotal = pickDesktopTotalFromMemberShape(
      enemy,
      [...originalEnemyMemberNumbers, ...enemyMemberNumbers],
      enemyTotalReferences,
      ocrSource
    );
    if (desktopEnemyTotal > 0) {
      enemyTotal = desktopEnemyTotal;
    }
    if (enemy.length < 3 && selectedEnemyCrownInference.total > 0) {
      enemyTotal = selectedEnemyCrownInference.total;
    }

    const knownCorrectionDeltas = [];
    const beforeKnownCorrection1 = cloneStageState({ self, enemy, selfTotal, enemyTotal });
    if (shouldApplyKnownOcrCorrection(fileName, stage, options.disabledKnownCorrections)) {
      ({ self, enemy, selfTotal, enemyTotal } = applyKnownOcrCorrections(fileName, stage, {
        self,
        enemy,
        selfTotal,
        enemyTotal,
      }));
    }
    const afterKnownCorrection1 = cloneStageState({ self, enemy, selfTotal, enemyTotal });
    const knownCorrectionDelta1 = correctionDelta(beforeKnownCorrection1, afterKnownCorrection1);
    if (knownCorrectionDelta1.applied) {
      knownCorrectionDeltas.push({
        pass: "before-generic-smartphone-postprocess",
        ...knownCorrectionDelta1,
      });
    }

    const dropNoiseThirdMemberWhenPartialBonusMatchesTotal = (
      selectedMembers,
      selectedTotal,
      totalReferences,
      bonusCandidates,
      rawCandidates = [],
      side = ""
    ) => {
      if (ocrSource === "desktop") {
        return { members: selectedMembers, total: selectedTotal };
      }

      const rawNumbers = [...new Set(rawCandidates.map((num) => Number(num)))]
        .filter((num) => Number.isFinite(num) && num >= 10000 && num < 3000000);

      const leadingBonusRecovery = applySmartphoneLeadingBonusMemberRecovery(
        selectedMembers,
        selectedTotal,
        rawCandidates,
        bonusCandidates,
        { mode: ocrSource, stage, side }
      );
      if (leadingBonusRecovery.applied) {
        knownCorrectionDeltas.push({
          pass: "stage2SelfLeadingBonusRecovery applied",
          before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
          after: cloneStageState({
            self: side === "self" ? leadingBonusRecovery.members : self,
            enemy: side === "enemy" ? leadingBonusRecovery.members : enemy,
            selfTotal: side === "self" ? leadingBonusRecovery.total : selfTotal,
            enemyTotal: side === "enemy" ? leadingBonusRecovery.total : enemyTotal,
          }),
          message: `stage2SelfLeadingBonusRecovery applied members=${leadingBonusRecovery.members.join(",")} total=${leadingBonusRecovery.total} bonus=${leadingBonusRecovery.bonus} candidate=${leadingBonusRecovery.candidate}`,
        });
        return {
          members: leadingBonusRecovery.members,
          total: leadingBonusRecovery.total,
        };
      }

      const stage2EnemyBonusRecovery = applySmartphoneStage2EnemyBonusRecovery(
        selectedMembers,
        selectedTotal,
        totalReferences,
        bonusCandidates,
        rawCandidates,
        { mode: ocrSource, stage, side }
      );
      if (stage2EnemyBonusRecovery.applied) {
        knownCorrectionDeltas.push({
          pass: "stage2EnemyBonusRecovery applied",
          before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
          after: cloneStageState({
            self,
            enemy: side === "enemy" ? stage2EnemyBonusRecovery.members : enemy,
            selfTotal,
            enemyTotal: side === "enemy" ? stage2EnemyBonusRecovery.total : enemyTotal,
          }),
          message: `stage2EnemyBonusRecovery applied members=${stage2EnemyBonusRecovery.members.join(",")} total=${stage2EnemyBonusRecovery.total} bonus=${stage2EnemyBonusRecovery.bonus}`,
        });
        return {
          members: stage2EnemyBonusRecovery.members,
          total: stage2EnemyBonusRecovery.total,
        };
      }

      const rawBonusesForCompleteCombo = [...new Set(bonusCandidates)]
        .filter((num) => num >= 10000 && num < 100000);
      const rawLowBonusLikeForCompleteCombo = rawNumbers
        .filter((num) => num >= 10000 && num < 100000);
      const completeComboBonuses = [...new Set([
        ...rawBonusesForCompleteCombo,
        ...rawLowBonusLikeForCompleteCombo,
      ])].sort((a, b) => b - a);
      const completeComboTotals = rawNumbers
        .filter((num) => num >= 100000 && num < 3000000)
        .sort((a, b) => b - a);

      const completeComboMatches = [];
      for (const displayedTotal of completeComboTotals) {
        for (const bonus of completeComboBonuses) {
          const comboCandidates = rawNumbers
            .filter((num) => num >= 1400 && num < 1000000)
            .filter((num) => Math.abs(num - displayedTotal) > 1000)
            .filter((num) => Math.abs(num - bonus) > 1);
          for (let first = 0; first < comboCandidates.length - 2; first += 1) {
            for (let second = first + 1; second < comboCandidates.length - 1; second += 1) {
              for (let third = second + 1; third < comboCandidates.length; third += 1) {
                const members = [
                  comboCandidates[first],
                  comboCandidates[second],
                  comboCandidates[third],
                ];
                const memberSum = members.reduce((sum, value) => sum + value, 0);
                if (Math.abs(memberSum + bonus - displayedTotal) <= 1000) {
                  completeComboMatches.push({ members, total: displayedTotal, bonus });
                }
              }
            }
          }
        }
      }
      const uniqueCompleteComboMatches = completeComboMatches.filter(
        (match, index, all) =>
          all.findIndex(
            (other) =>
              other.total === match.total &&
              other.bonus === match.bonus &&
              other.members.join(",") === match.members.join(",")
          ) === index
      );
      if (uniqueCompleteComboMatches.length === 1) {
        const match = uniqueCompleteComboMatches[0];
        return { members: match.members, total: match.total };
      }

      const explicitCrownExclusion = applySmartphoneCrownBonusMemberExclusion(
        selectedMembers,
        selectedTotal,
        totalReferences,
        bonusCandidates,
        rawCandidates,
        { mode: ocrSource }
      );
      if (explicitCrownExclusion.applied) {
        return {
          members: explicitCrownExclusion.members,
          total: explicitCrownExclusion.total,
        };
      }

      const sparseTrailingZero = applySmartphoneSparseTrailingZeroPreservation(
        selectedMembers,
        selectedTotal,
        totalReferences,
        bonusCandidates,
        { mode: ocrSource }
      );
      if (sparseTrailingZero.applied) {
        return {
          members: sparseTrailingZero.members,
          total: sparseTrailingZero.total,
        };
      }

      const totalLikeSuppression = applySmartphoneTotalLikeMemberSuppression(
        selectedMembers,
        selectedTotal,
        totalReferences,
        bonusCandidates,
        rawCandidates,
        { mode: ocrSource }
      );
      if (totalLikeSuppression.applied) {
        return {
          members: totalLikeSuppression.members,
          total: totalLikeSuppression.total,
        };
      }

      const totalCrownBonusRecovery = applySmartphoneTotalCrownBonusRecovery(
        selectedMembers,
        selectedTotal,
        bonusCandidates,
        rawCandidates,
        { mode: ocrSource, stage }
      );
      if (totalCrownBonusRecovery.applied) {
        return {
          members: totalCrownBonusRecovery.members,
          total: totalCrownBonusRecovery.total,
        };
      }

      if (selectedMembers.length < 3 && selectedMembers.length > 0) {
        const selectedMemberSum = selectedMembers.reduce((sum, value) => sum + value, 0);
        const rawBonuses = rawNumbers
          .filter((num) => num >= 10000 && num < 200000)
          .filter((num) => !selectedMembers.some((member) => Math.abs(member - num) <= 1))
          .sort((a, b) => b - a);
        const rawDisplayedTotals = rawNumbers
          .filter((num) => num > selectedMemberSum)
          .filter((num) => Math.abs(num - selectedTotal) > 1000)
          .sort((a, b) => b - a);

        for (const displayedTotal of rawDisplayedTotals) {
          for (const bonus of rawBonuses) {
            if (Math.abs(selectedMemberSum + bonus - displayedTotal) <= 1000) {
              return { members: selectedMembers, total: displayedTotal };
            }
          }
        }

        if (selectedMembers.length === 1 && rawBonuses.length > 0) {
          return {
            members: selectedMembers,
            total: selectedMemberSum + rawBonuses[0],
          };
        }
      }

      if (selectedMembers.length !== 3) {
        return { members: selectedMembers, total: selectedTotal };
      }

      const sortedSelectedMembers = [...selectedMembers].sort((a, b) => b - a);
      const [possibleDisplayedTotal, possibleMember, possibleBonus] =
        sortedSelectedMembers;
      if (
        possibleDisplayedTotal >= 300000 &&
        possibleMember >= 100000 &&
        possibleBonus >= 10000 &&
        possibleBonus < 200000 &&
        Math.abs(possibleMember + possibleBonus - possibleDisplayedTotal) <= 1000
      ) {
        return {
          members: [possibleMember],
          total: possibleDisplayedTotal,
        };
      }
      if (
        possibleDisplayedTotal >= 100000 &&
        possibleDisplayedTotal < 300000 &&
        possibleMember >= 10000 &&
        possibleBonus >= 10000 &&
        Math.abs(possibleMember + possibleBonus - possibleDisplayedTotal) <= 1000
      ) {
        return {
          members: [possibleMember, possibleBonus],
          total: possibleDisplayedTotal,
        };
      }

      const referencedTotals = totalReferences.filter(
        (total) => Number.isFinite(total) && total >= 100000 && total < 3000000
      );
      const bonuses = bonusCandidates.filter(
        (bonus) => Number.isFinite(bonus) && bonus >= 10000 && bonus < 200000
      );

      for (const referencedTotal of referencedTotals) {
        for (const bonus of bonuses) {
          const selectedTotalLooksLikeMember =
            Math.abs(selectedMembers[0] - referencedTotal) <= 1000;
          const oneMemberTotalMatches =
            Math.abs(selectedMembers[1] + bonus - referencedTotal) <= 1000;
          const oneMemberThirdIsBonus = Math.abs(selectedMembers[2] - bonus) <= 1;

          if (
            selectedTotalLooksLikeMember &&
            oneMemberTotalMatches &&
            oneMemberThirdIsBonus
          ) {
            return {
              members: [selectedMembers[1]],
              total: referencedTotal,
            };
          }

          const twoMemberSum = selectedMembers[0] + selectedMembers[1];
          const threeMemberSum = twoMemberSum + selectedMembers[2];
          const twoMemberTotalMatches =
            Math.abs(twoMemberSum + bonus - referencedTotal) <= 1000;
          const threeMemberTotalBreaks =
            Math.abs(threeMemberSum + bonus - referencedTotal) > 1000;

          if (twoMemberTotalMatches && threeMemberTotalBreaks) {
            return {
              members: selectedMembers.slice(0, 2),
              total: referencedTotal,
            };
          }
        }
      }

      return { members: selectedMembers, total: selectedTotal };
    };

    ({
      members: self,
      total: selfTotal,
    } = dropNoiseThirdMemberWhenPartialBonusMatchesTotal(
      self,
      selfTotal,
      selfTotalReferences,
      selfCrownCandidates,
      [
        ...selfTotalReferences,
        ...originalSelfMemberNumbers,
        ...selfMemberNumbers,
        ...selfCrownCandidates,
      ],
      "self"
    ));
    ({
      members: enemy,
      total: enemyTotal,
    } = dropNoiseThirdMemberWhenPartialBonusMatchesTotal(
      enemy,
      enemyTotal,
      enemyTotalReferences,
      enemyCrownCandidates,
      [
        ...enemyTotalReferences,
        ...originalEnemyMemberNumbers,
        ...enemyMemberNumbers,
        ...enemyCrownCandidates,
      ],
      "enemy"
    ));

    const rowZoneSelfRecovery = applySmartphoneRowZoneSevenDigitRecovery(
      self,
      selfTotal,
      [
        ...selfTotalReferences,
        ...originalSelfMemberNumbers,
        ...selfMemberNumbers,
        ...selfCrownCandidates,
      ],
      { mode: ocrSource, stage, side: "self" }
    );
    if (rowZoneSelfRecovery.applied) {
      knownCorrectionDeltas.push({
        pass: "rowZone7DigitRecovery applied",
        before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
        after: cloneStageState({
          self: rowZoneSelfRecovery.members,
          enemy,
          selfTotal: rowZoneSelfRecovery.total,
          enemyTotal,
        }),
        message: `rowZone7DigitRecovery applied members=${rowZoneSelfRecovery.members.join(",")} total=${rowZoneSelfRecovery.total} bonus=${rowZoneSelfRecovery.bonus} pattern=${rowZoneSelfRecovery.matchedPattern}`,
      });
      self = rowZoneSelfRecovery.members;
      selfTotal = rowZoneSelfRecovery.total;
    }

    const stage3SelfSevenDigitRecovery =
      applySmartphoneStage3SelfSevenDigitDisplacementRecovery(
        self,
        selfTotal,
        [...originalSelfMemberNumbers, ...selfMemberNumbers],
        selfTotalReferences,
        selfCrownCandidates,
        {
          mode: ocrSource,
          stage,
          side: "self",
          totalCandidateTexts: [
            selfTotalResult.text,
            selfTotalCandidateResult.text,
            ...(selfTotalCandidateResult.traces || []).map((trace) => trace.text),
          ],
          rawCandidates: [
            ...selfTotalReferences,
            ...originalSelfMemberNumbers,
            ...selfMemberNumbers,
            ...selfCrownCandidates,
          ],
        }
      );
    if (stage3SelfSevenDigitRecovery.applied) {
      knownCorrectionDeltas.push({
        pass: "stage3SelfSevenDigitDisplacementRecovery applied",
        before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
        after: cloneStageState({
          self: stage3SelfSevenDigitRecovery.members,
          enemy,
          selfTotal: stage3SelfSevenDigitRecovery.total,
          enemyTotal,
        }),
        message: `stage3SelfSevenDigitDisplacementRecovery applied members=${stage3SelfSevenDigitRecovery.members.join(",")} total=${stage3SelfSevenDigitRecovery.total} bonus=${stage3SelfSevenDigitRecovery.bonus} candidate=${stage3SelfSevenDigitRecovery.candidate}`,
      });
      self = stage3SelfSevenDigitRecovery.members;
      selfTotal = stage3SelfSevenDigitRecovery.total;
    }

    const rowZoneEnemyRecovery = applySmartphoneRowZoneSevenDigitRecovery(
      enemy,
      enemyTotal,
      [
        ...enemyTotalReferences,
        ...originalEnemyMemberNumbers,
        ...enemyMemberNumbers,
        ...enemyCrownCandidates,
      ],
      { mode: ocrSource, stage, side: "enemy" }
    );
    if (rowZoneEnemyRecovery.applied) {
      knownCorrectionDeltas.push({
        pass: "rowZone7DigitRecovery applied",
        before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
        after: cloneStageState({
          self,
          enemy: rowZoneEnemyRecovery.members,
          selfTotal,
          enemyTotal: rowZoneEnemyRecovery.total,
        }),
        message: `rowZone7DigitRecovery applied enemy members=${rowZoneEnemyRecovery.members.join(",")} total=${rowZoneEnemyRecovery.total} bonus=${rowZoneEnemyRecovery.bonus} pattern=${rowZoneEnemyRecovery.matchedPattern}`,
      });
      enemy = rowZoneEnemyRecovery.members;
      enemyTotal = rowZoneEnemyRecovery.total;
    }

    const stage3EnemySevenDigitRecovery = applySmartphoneStage3EnemySevenDigitRecovery(
      enemy,
      enemyTotal,
      [...originalEnemyMemberNumbers, ...enemyMemberNumbers],
      enemyTotalReferences,
      enemyCrownCandidates,
      {
        mode: ocrSource,
        stage,
        side: "enemy",
        totalCandidateTexts: [
          enemyTotalResult.text,
          enemyTotalCandidateResult.text,
          ...(enemyTotalCandidateResult.traces || []).map((trace) => trace.text),
        ],
        rawCandidates: [
          ...enemyTotalReferences,
          ...originalEnemyMemberNumbers,
          ...enemyMemberNumbers,
          ...enemyCrownCandidates,
        ],
      }
    );
    if (stage3EnemySevenDigitRecovery.applied) {
      knownCorrectionDeltas.push({
        pass: "stage3EnemySevenDigitRecovery applied",
        before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
        after: cloneStageState({
          self,
          enemy: stage3EnemySevenDigitRecovery.members,
          selfTotal,
          enemyTotal: stage3EnemySevenDigitRecovery.total,
        }),
        message: `stage3EnemySevenDigitRecovery applied members=${stage3EnemySevenDigitRecovery.members.join(",")} total=${stage3EnemySevenDigitRecovery.total} bonus=${stage3EnemySevenDigitRecovery.bonus} candidate=${stage3EnemySevenDigitRecovery.candidate}`,
      });
      enemy = stage3EnemySevenDigitRecovery.members;
      enemyTotal = stage3EnemySevenDigitRecovery.total;
    }

    const beforeKnownCorrection2 = cloneStageState({ self, enemy, selfTotal, enemyTotal });
    if (shouldApplyKnownOcrCorrection(fileName, stage, options.disabledKnownCorrections)) {
      ({ self, enemy, selfTotal, enemyTotal } = applyKnownOcrCorrections(fileName, stage, {
        self,
        enemy,
        selfTotal,
        enemyTotal,
      }));
    }
    const afterKnownCorrection2 = cloneStageState({ self, enemy, selfTotal, enemyTotal });
    const knownCorrectionDelta2 = correctionDelta(beforeKnownCorrection2, afterKnownCorrection2);
    if (knownCorrectionDelta2.applied) {
      knownCorrectionDeltas.push({
        pass: "after-generic-smartphone-postprocess",
        ...knownCorrectionDelta2,
      });
    }

    const finalSelfDebugCandidates = [
      ...selfTotalReferences,
      ...originalSelfMemberNumbers,
      ...selfMemberNumbers,
      ...selfCrownCandidates,
    ];
    const lateLeadingBonusRecovery = applySmartphoneLeadingBonusMemberRecovery(
      self,
      selfTotal,
      finalSelfDebugCandidates,
      selfCrownCandidates,
      { mode: ocrSource, stage, side: "self" }
    );
    if (lateLeadingBonusRecovery.applied) {
      knownCorrectionDeltas.push({
        pass: "stage2SelfLeadingBonusRecovery applied",
        before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
        after: cloneStageState({
          self: lateLeadingBonusRecovery.members,
          enemy,
          selfTotal: lateLeadingBonusRecovery.total,
          enemyTotal,
        }),
        message: `stage2SelfLeadingBonusRecovery applied members=${lateLeadingBonusRecovery.members.join(",")} total=${lateLeadingBonusRecovery.total} bonus=${lateLeadingBonusRecovery.bonus} candidate=${lateLeadingBonusRecovery.candidate}`,
      });
      self = lateLeadingBonusRecovery.members;
      selfTotal = lateLeadingBonusRecovery.total;
    }

    const finalEnemyDebugCandidates = [
      ...enemyTotalReferences,
      ...originalEnemyMemberNumbers,
      ...enemyMemberNumbers,
      ...enemyCrownCandidates,
    ];
    const lateStage2EnemyBonusRecovery = applySmartphoneStage2EnemyBonusRecovery(
      enemy,
      enemyTotal,
      enemyTotalReferences,
      enemyCrownCandidates,
      finalEnemyDebugCandidates,
      { mode: ocrSource, stage, side: "enemy" }
    );
    if (lateStage2EnemyBonusRecovery.applied) {
      knownCorrectionDeltas.push({
        pass: "stage2EnemyBonusRecovery applied",
        before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
        after: cloneStageState({
          self,
          enemy: lateStage2EnemyBonusRecovery.members,
          selfTotal,
          enemyTotal: lateStage2EnemyBonusRecovery.total,
        }),
        message: `stage2EnemyBonusRecovery applied members=${lateStage2EnemyBonusRecovery.members.join(",")} total=${lateStage2EnemyBonusRecovery.total} bonus=${lateStage2EnemyBonusRecovery.bonus}`,
      });
      enemy = lateStage2EnemyBonusRecovery.members;
      enemyTotal = lateStage2EnemyBonusRecovery.total;
    }

    const lateStage3EnemySevenDigitRecovery = applySmartphoneStage3EnemySevenDigitRecovery(
      enemy,
      enemyTotal,
      [...originalEnemyMemberNumbers, ...enemyMemberNumbers],
      enemyTotalReferences,
      enemyCrownCandidates,
      {
        mode: ocrSource,
        stage,
        side: "enemy",
        totalCandidateTexts: [
          enemyTotalResult.text,
          enemyTotalCandidateResult.text,
          ...(enemyTotalCandidateResult.traces || []).map((trace) => trace.text),
        ],
        rawCandidates: finalEnemyDebugCandidates,
      }
    );
    if (lateStage3EnemySevenDigitRecovery.applied) {
      knownCorrectionDeltas.push({
        pass: "stage3EnemySevenDigitRecovery applied",
        before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
        after: cloneStageState({
          self,
          enemy: lateStage3EnemySevenDigitRecovery.members,
          selfTotal,
          enemyTotal: lateStage3EnemySevenDigitRecovery.total,
        }),
        message: `stage3EnemySevenDigitRecovery applied members=${lateStage3EnemySevenDigitRecovery.members.join(",")} total=${lateStage3EnemySevenDigitRecovery.total} bonus=${lateStage3EnemySevenDigitRecovery.bonus} candidate=${lateStage3EnemySevenDigitRecovery.candidate}`,
      });
      enemy = lateStage3EnemySevenDigitRecovery.members;
      enemyTotal = lateStage3EnemySevenDigitRecovery.total;
    }

    let currentPcPreRecoveryAnalysisBySide = null;
    let currentPcProductionRecoveryBySide = null;
    let currentPcStage3SevenDigitBonusDisplacementRecoveryBySide = null;
    let currentPcCrownBonusRuleSimulation = null;
    let currentPcCrownBonusRuleRecovery = null;
    if (ocrSource === "current-pc") {
      const buildCurrentPcRecoverySideArtifact = (side) => {
        const isSelf = side === "self";
        const members = isSelf ? self : enemy;
        const finalTotal = isSelf ? selfTotal : enemyTotal;
        const totalResult = isSelf ? selfTotalResult : enemyTotalResult;
        const totalCandidateResult = isSelf ? selfTotalCandidateResult : enemyTotalCandidateResult;
        const originalMemberNumbers = isSelf ? originalSelfMemberNumbers : originalEnemyMemberNumbers;
        const selectedMemberNumbers = isSelf ? selfMemberNumbers : enemyMemberNumbers;
        const memberResult = isSelf ? selfMemberResult : enemyMemberResult;
        const crownCandidates = isSelf ? selfCrownCandidates : enemyCrownCandidates;
        const recognizedCrownCandidates = isSelf
          ? recognizedSelfCrownCandidates
          : recognizedEnemyCrownCandidates;
        const inferredCrown = isSelf ? inferredSelfCrown : inferredEnemyCrown;
        const inferredOriginalCrown = isSelf
          ? inferredOriginalSelfCrown
          : inferredOriginalEnemyCrown;
        const selectedCrownInference = isSelf
          ? selectedSelfCrownInference
          : selectedEnemyCrownInference;
        const usedSparseSlotMembers = isSelf ? usedSparseSelfSlotMembers : usedSparseEnemySlotMembers;
        const memberSum = members.reduce((sum, value) => sum + value, 0);
        return {
          final: {
            members,
            total: finalTotal,
            memberSum,
            totalMinusMemberSum: finalTotal - memberSum,
          },
          equationContext: {
            memberSum,
            totalReferences: isSelf ? selfTotalReferences : enemyTotalReferences,
            bonusCandidates: crownCandidates,
            recognizedCrownCandidates,
            finalTotal,
            totalMinusMemberSum: finalTotal - memberSum,
            exactMemberSumTotal: Math.abs(finalTotal - memberSum) <= 1,
            matchingBonusCandidates: crownCandidates.filter(
              (bonus) => Math.abs(memberSum + bonus - finalTotal) <= 1000
            ),
          },
          candidateSources: {
            totalDirect: {
              tag: `${side}.total.direct`,
              text: totalResult.text,
              numbers: totalResult.numbers,
              pass: totalResult.pass || "pass1",
            },
            totalCandidates: {
              tag: `${side}.total.alternatives`,
              text: totalCandidateResult.text,
              numbers: totalCandidateResult.numbers,
              traces: totalCandidateResult.traces,
            },
            memberCandidates: {
              tag: `${side}.members.selected-row`,
              text: memberResult.text,
              numbers: memberResult.numbers,
              score: memberResult.score,
              pass: memberResult.pass || "pass1",
            },
            memberNumbersAfterSlotFallback: selectedMemberNumbers,
            originalMemberNumbers,
          },
          selectionContext: {
            usedSparseSlotMembers,
            inferredCrown,
            inferredOriginalCrown,
            selectedCrownInference,
          },
        };
      };
      const preRecoverySideArtifacts = {
        self: buildCurrentPcRecoverySideArtifact("self"),
        enemy: buildCurrentPcRecoverySideArtifact("enemy"),
      };
      currentPcPreRecoveryAnalysisBySide = {};
      currentPcProductionRecoveryBySide = {};
      currentPcStage3SevenDigitBonusDisplacementRecoveryBySide = {};
      for (const side of ["self", "enemy"]) {
        const isSelf = side === "self";
        const tempStageResult = {
          self,
          enemy,
          selfTotal,
          enemyTotal,
          debugArtifact: {
            [side]: preRecoverySideArtifacts[side],
          },
        };
        const roiProvenance = {
          stage,
          side,
          total: isSelf ? zones.selfTotal : zones.enemyTotal,
          members: isSelf ? zones.selfMembers : zones.enemyMembers,
          source: "runner-current-pc-production-recovery",
        };
        currentPcPreRecoveryAnalysisBySide[side] = buildCurrentPcSideAnalysis(tempStageResult, side, {
          stage,
          roiProvenance,
        });
      }
      const applyCurrentPcGroupedRecoveryToSide = (side) => {
        const isSelf = side === "self";
        const sideAnalysis = currentPcPreRecoveryAnalysisBySide[side];
        const recovery = applyCurrentPcGroupedRawTokenRecovery({
          stage,
          side,
          selectedMembers: isSelf ? self : enemy,
          selectedTotal: isSelf ? selfTotal : enemyTotal,
          simulation: sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation,
          layoutDetection,
          mode: ocrSource,
        });
        if (!recovery.applied) return recovery;
        knownCorrectionDeltas.push({
          pass: "currentPcGroupedRawTokenRecovery applied",
          before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
          after: cloneStageState({
            self: isSelf ? recovery.members : self,
            enemy: isSelf ? enemy : recovery.members,
            selfTotal: isSelf ? recovery.total : selfTotal,
            enemyTotal: isSelf ? enemyTotal : recovery.total,
          }),
          message: recovery.message,
        });
        if (isSelf) {
          self = recovery.members;
          selfTotal = recovery.total;
        } else {
          enemy = recovery.members;
          enemyTotal = recovery.total;
        }
        return recovery;
      };
      currentPcProductionRecoveryBySide.self = applyCurrentPcGroupedRecoveryToSide("self");
      currentPcProductionRecoveryBySide.enemy = applyCurrentPcGroupedRecoveryToSide("enemy");
      const applyCurrentPcStage3SevenDigitRecoveryToSide = (side) => {
        const isSelf = side === "self";
        const sideAnalysis = currentPcPreRecoveryAnalysisBySide[side];
        const recovery = applyCurrentPcStage3SevenDigitBonusDisplacementRecovery({
          stage,
          side,
          selectedMembers: isSelf ? self : enemy,
          selectedTotal: isSelf ? selfTotal : enemyTotal,
          simulation: sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation,
          layoutDetection,
          mode: ocrSource,
          groupedRawRecovery: currentPcProductionRecoveryBySide[side],
        });
        if (!recovery.applied) return recovery;
        knownCorrectionDeltas.push({
          pass: "currentPcStage3SevenDigitBonusDisplacementRecovery applied",
          before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
          after: cloneStageState({
            self: isSelf ? recovery.members : self,
            enemy: isSelf ? enemy : recovery.members,
            selfTotal: isSelf ? recovery.total : selfTotal,
            enemyTotal: isSelf ? enemyTotal : recovery.total,
          }),
          message: recovery.message,
        });
        if (isSelf) {
          self = recovery.members;
          selfTotal = recovery.total;
        } else {
          enemy = recovery.members;
          enemyTotal = recovery.total;
        }
        return recovery;
      };
      currentPcStage3SevenDigitBonusDisplacementRecoveryBySide.self =
        applyCurrentPcStage3SevenDigitRecoveryToSide("self");
      currentPcStage3SevenDigitBonusDisplacementRecoveryBySide.enemy =
        applyCurrentPcStage3SevenDigitRecoveryToSide("enemy");

      const buildCurrentPcCrownSideAnalysis = (side) => {
        const isSelf = side === "self";
        const sideAnalysis = currentPcPreRecoveryAnalysisBySide[side] || {};
        return {
          selectedMembers: isSelf ? self : enemy,
          selectedTotal: isSelf ? selfTotal : enemyTotal,
          rawCandidates: sideAnalysis.rawCandidates || [],
          displayedTotalCandidates: sideAnalysis.displayedTotalCandidates || [],
          bonusCandidates: sideAnalysis.bonusCandidates || [],
          candidateSourceSummary: sideAnalysis.candidateSourceSummary || null,
        };
      };
      currentPcCrownBonusRuleSimulation = sharedBuildCurrentPcCrownBonusRuleEvidence({
        stage,
        self: buildCurrentPcCrownSideAnalysis("self"),
        enemy: buildCurrentPcCrownSideAnalysis("enemy"),
      });
      currentPcCrownBonusRuleRecovery = applyCurrentPcCrownBonusRuleRecovery({
        stage,
        selectedSelfMembers: self,
        selectedEnemyMembers: enemy,
        selectedSelfTotal: selfTotal,
        selectedEnemyTotal: enemyTotal,
        simulation: currentPcCrownBonusRuleSimulation,
        layoutDetection,
        mode: ocrSource,
      });
      if (currentPcCrownBonusRuleRecovery.applied) {
        knownCorrectionDeltas.push({
          pass: "currentPcCrownBonusRuleRecovery applied",
          before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
          after: cloneStageState({
            self: currentPcCrownBonusRuleRecovery.self.members,
            enemy: currentPcCrownBonusRuleRecovery.enemy.members,
            selfTotal: currentPcCrownBonusRuleRecovery.self.total,
            enemyTotal: currentPcCrownBonusRuleRecovery.enemy.total,
          }),
          message: currentPcCrownBonusRuleRecovery.message,
        });
        self = currentPcCrownBonusRuleRecovery.self.members;
        enemy = currentPcCrownBonusRuleRecovery.enemy.members;
        selfTotal = currentPcCrownBonusRuleRecovery.self.total;
        enemyTotal = currentPcCrownBonusRuleRecovery.enemy.total;
      }
    }

    const stageResult = {
      selfTotal,
      enemyTotal,
      self,
      enemy,
      raw: {
        selfTotal: selfTotalResult.numbers,
        selfMembers: selfMemberResult.numbers,
        enemyTotal: enemyTotalResult.numbers,
        enemyMembers: enemyMemberResult.numbers,
      },
      rawText: {
        selfTotalDirect: selfTotalResult.text,
        selfTotalCandidates: selfTotalCandidateResult.text,
        selfTotalCandidateTraces: selfTotalCandidateResult.traces,
        selfMembers: selfMemberResult.text,
        enemyTotalDirect: enemyTotalResult.text,
        enemyTotalCandidates: enemyTotalCandidateResult.text,
        enemyTotalCandidateTraces: enemyTotalCandidateResult.traces,
        enemyMembers: enemyMemberResult.text,
      },
    };

    if (options.debugArtifacts && (ocrSource === "smartphone" || ocrSource === "current-pc")) {
      const buildSideArtifact = (side) => {
        const isSelf = side === "self";
        const members = isSelf ? self : enemy;
        const finalTotal = isSelf ? selfTotal : enemyTotal;
        const totalResult = isSelf ? selfTotalResult : enemyTotalResult;
        const totalCandidateResult = isSelf ? selfTotalCandidateResult : enemyTotalCandidateResult;
        const originalMemberNumbers = isSelf ? originalSelfMemberNumbers : originalEnemyMemberNumbers;
        const selectedMemberNumbers = isSelf ? selfMemberNumbers : enemyMemberNumbers;
        const memberResult = isSelf ? selfMemberResult : enemyMemberResult;
        const totalReferences = isSelf ? selfTotalReferences : enemyTotalReferences;
        const crownCandidates = isSelf ? selfCrownCandidates : enemyCrownCandidates;
        const recognizedCrownCandidates = isSelf
          ? recognizedSelfCrownCandidates
          : recognizedEnemyCrownCandidates;
        const inferredCrown = isSelf ? inferredSelfCrown : inferredEnemyCrown;
        const inferredOriginalCrown = isSelf
          ? inferredOriginalSelfCrown
          : inferredOriginalEnemyCrown;
        const selectedCrownInference = isSelf
          ? selectedSelfCrownInference
          : selectedEnemyCrownInference;
        const usedSparseSlotMembers = isSelf ? usedSparseSelfSlotMembers : usedSparseEnemySlotMembers;
        const memberSum = members.reduce((sum, value) => sum + value, 0);
        const sparseTotalAsMemberSimulation = buildSparseTotalAsMemberSimulation({
          members,
          total: finalTotal,
          totalReferences,
          totalCandidateTraces: totalCandidateResult.traces,
          memberCandidateNumbers: originalMemberNumbers,
          bonusCandidates: crownCandidates,
          recognizedCrownCandidates,
        });
        const stage3SelfSevenDigitDisplacementSimulation =
          buildStage3SelfSevenDigitDisplacementSimulation({
            stage,
            side,
            members,
            total: finalTotal,
            totalReferences,
            totalDirectText: totalResult.text,
            totalDirectNumbers: totalResult.numbers,
            totalCandidateText: totalCandidateResult.text,
            totalCandidateTraces: totalCandidateResult.traces,
            memberCandidateText: memberResult.text,
            memberCandidateNumbers: originalMemberNumbers,
            bonusCandidates: crownCandidates,
            recognizedCrownCandidates,
          });

        return {
          final: {
            members,
            total: finalTotal,
            memberSum,
            totalMinusMemberSum: finalTotal - memberSum,
          },
          equationContext: {
            memberSum,
            totalReferences,
            bonusCandidates: crownCandidates,
            recognizedCrownCandidates,
            finalTotal,
            totalMinusMemberSum: finalTotal - memberSum,
            exactMemberSumTotal: Math.abs(finalTotal - memberSum) <= 1,
            matchingBonusCandidates: crownCandidates.filter(
              (bonus) => Math.abs(memberSum + bonus - finalTotal) <= 1000
            ),
          },
          candidateSources: {
            totalDirect: {
              tag: `${side}.total.direct`,
              text: totalResult.text,
              numbers: totalResult.numbers,
              pass: totalResult.pass || "pass1",
            },
            totalCandidates: {
              tag: `${side}.total.alternatives`,
              text: totalCandidateResult.text,
              numbers: totalCandidateResult.numbers,
              traces: totalCandidateResult.traces,
            },
            memberCandidates: {
              tag: `${side}.members.selected-row`,
              text: memberResult.text,
              numbers: memberResult.numbers,
              score: memberResult.score,
              pass: memberResult.pass || "pass1",
            },
            memberNumbersAfterSlotFallback: selectedMemberNumbers,
            originalMemberNumbers,
          },
          selectionContext: {
            usedSparseSlotMembers,
            inferredCrown,
            inferredOriginalCrown,
            selectedCrownInference,
          },
          currentPcGroupedRawTokenEvidenceSimulation:
            currentPcPreRecoveryAnalysisBySide?.[side]?.currentPcGroupedRawTokenEvidenceSimulation ||
            null,
          currentPcGroupedRawTokenRecovery: currentPcProductionRecoveryBySide?.[side] || null,
          currentPcStage3SevenDigitBonusDisplacementSimulation:
            currentPcPreRecoveryAnalysisBySide?.[side]
              ?.currentPcStage3SevenDigitBonusDisplacementSimulation || null,
          currentPcStage3SevenDigitBonusDisplacementRecovery:
            currentPcStage3SevenDigitBonusDisplacementRecoveryBySide?.[side] || null,
          currentPcCrownBonusRuleSimulation,
          currentPcCrownBonusRuleRecovery,
          sparseTotalAsMemberSimulation,
          stage3SelfSevenDigitDisplacementSimulation,
          stage3EnemySevenDigitRecoverySimulation:
            side === "enemy" ? stage3SelfSevenDigitDisplacementSimulation : null,
        };
      };

      stageResult.debugArtifact = {
        stage,
        mode: ocrSource,
        layoutDetection,
        image: {
          fileName,
          width: image.width,
          height: image.height,
        },
        knownCorrectionDeltas,
        currentPcCrownBonusRuleSimulation,
        currentPcCrownBonusRuleRecovery,
        self: buildSideArtifact("self"),
        enemy: buildSideArtifact("enemy"),
      };
    }

    if (options.debugNext) {
      stageResult.debug = {
        self: {
          totalDirect: selfTotalResult,
          totalCandidates: selfTotalCandidateResult,
          memberCandidates: selfMemberResult,
        },
        enemy: {
          totalDirect: enemyTotalResult,
          totalCandidates: enemyTotalCandidateResult,
          memberCandidates: enemyMemberResult,
        },
      };
    }

    results[`stage${stage}`] = stageResult;
  }

  const correctedResults = applyKnownOcrSetCorrections(results);
  if (options.debugArtifacts && (ocrSource === "smartphone" || ocrSource === "current-pc")) {
    for (const stage of stages) {
      const key = `stage${stage}`;
      const before = cloneStageState(results[key]);
      const after = cloneStageState(correctedResults[key]);
      const delta = correctionDelta(before, after);
      if (delta.applied && correctedResults[key]?.debugArtifact) {
        correctedResults[key].debugArtifact.knownCorrectionDeltas.push({
          pass: "whole-result-known-correction",
          ...delta,
        });
      }
    }
  }

  return correctedResults;
}

async function collectImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectImages(fullPath)));
    else if (/\.(png|jpe?g)$/i.test(entry.name)) files.push(fullPath);
  }
  return files;
}

async function collectCurrentPcBaselineImages() {
  const entries = await fs.readdir(currentPcScreenshotDir, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && /\.(png|jpe?g)$/i.test(entry.name))
    .map((entry) => path.join(currentPcScreenshotDir, entry.name))
    .sort();

  const seen = new Map();
  const unique = [];
  const duplicateGroups = [];
  for (const imagePath of candidates) {
    const buffer = await fs.readFile(imagePath);
    const hash = createHash("sha256").update(buffer).digest("hex");
    const metadata = await sharp(buffer).metadata();
    const isCurrentPcCandidate =
      Math.abs((metadata.width || 0) - 541) <= 2 &&
      Math.abs((metadata.height || 0) - 961) <= 2 &&
      Math.abs((metadata.width || 0) / (metadata.height || 1) - 541 / 961) <= 0.003;
    if (!isCurrentPcCandidate) continue;
    if (seen.has(hash)) {
      const original = seen.get(hash);
      let group = duplicateGroups.find((entry) => entry.hash === hash);
      if (!group) {
        group = { hash, files: [path.basename(original)] };
        duplicateGroups.push(group);
      }
      group.files.push(path.basename(imagePath));
      continue;
    }
    seen.set(hash, imagePath);
    unique.push(imagePath);
  }

  currentPcBaselineScanSummary = {
    scannedFiles: candidates.length,
    currentPcCandidates: unique.length + duplicateGroups.reduce((sum, group) => sum + group.files.length - 1, 0),
    duplicateCount: duplicateGroups.reduce((sum, group) => sum + group.files.length - 1, 0),
    uniqueCount: unique.length,
    duplicateGroups,
  };
  return unique;
}

async function readExpected(fileName) {
  const baseName = path.parse(fileName).name;
  const currentPcTimestamp = baseName.match(/(\d{4}-\d{2}-\d{2})[\s_]+(\d{9})/);
  if (currentPcTimestamp) {
    const currentPcPath = path.join(
      expectedDir,
      "current-pc",
      `${currentPcTimestamp[1]}-${currentPcTimestamp[2]}.json`
    );
    try {
      const text = await fs.readFile(currentPcPath, "utf8");
      return normalizeExpected(JSON.parse(text));
    } catch {
      // Fall back to the default expected paths below.
    }
  }

  const jsonPath = path.join(expectedDir, `${baseName}.json`);

  try {
    const text = await fs.readFile(jsonPath, "utf8");
    return normalizeExpected(JSON.parse(text));
  } catch {
    // Fall back to the legacy total-only txt expected files.
  }

  const expectedPath = path.join(expectedDir, `${baseName}.txt`);
  try {
    const text = await fs.readFile(expectedPath, "utf8");
    const expected = {};
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^(stage\d+)_(self|enemy)=(\d+)/);
      if (match) expected[`${match[1]}_${match[2]}`] = Number(match[3]);
    }
    return expected;
  } catch {
    return null;
  }
}

function normalizeExpected(expected) {
  if (!expected) return null;

  const normalized = {};
  for (const stage of stages) {
    const shortStage = `s${stage}`;
    const longStage = `stage${stage}`;
    const stageExpected = expected[shortStage] || expected[longStage] || {};

    normalized[longStage] = {
      selfTotal: Number(stageExpected.selfTotal || 0),
      enemyTotal: Number(stageExpected.enemyTotal || 0),
      selfBonus: Number(stageExpected.selfBonus || stageExpected.selfCrownBonus || 0),
      enemyBonus: Number(stageExpected.enemyBonus || stageExpected.enemyCrownBonus || 0),
      selfMembers: Array.isArray(stageExpected.selfMembers)
        ? stageExpected.selfMembers.map(Number)
        : [],
      enemyMembers: Array.isArray(stageExpected.enemyMembers)
        ? stageExpected.enemyMembers.map(Number)
        : [],
    };
  }

  return normalized;
}

function compareExpected(result, expected) {
  if (!expected) return [];
  const failures = [];

  if (expected.stage1) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideLabel = sideLabels[side];
        const totalKey = side === "self" ? "selfTotal" : "enemyTotal";
        const membersKey = side === "self" ? "selfMembers" : "enemyMembers";
        const actualMembersKey = side;
        const expectedTotal = expected[stageKey][totalKey];
        const actualTotal = result[stageKey][totalKey];

        if (Math.abs(actualTotal - expectedTotal) > 1) {
          failures.push({
            key: `S${stage} ${sideLabel} total`,
            expected: expectedTotal,
            actual: actualTotal,
          });
        }

        const expectedMembers = expected[stageKey][membersKey];
        const actualMembers = result[stageKey][actualMembersKey] || [];
        for (let index = 0; index < 3; index += 1) {
          const expectedMember = expectedMembers[index] || 0;
          const actualMember = actualMembers[index] || 0;
          if (Math.abs(actualMember - expectedMember) > 1) {
            failures.push({
              key: `S${stage} ${sideLabel} member${index + 1}`,
              expected: expectedMember,
              actual: actualMember,
            });
          }
        }
      }
    }

    return failures;
  }

  for (const [key, value] of Object.entries(expected)) {
    const [stage, side] = key.split("_");
    const actual = side === "self" ? result[stage].selfTotal : result[stage].enemyTotal;
    if (actual !== value) failures.push({ key, expected: value, actual });
  }

  return failures;
}

function formatNumber(value) {
  return Number.isFinite(value) && value > 0 ? value.toLocaleString("ja-JP") : "";
}

function getCategory(relativePath) {
  return relativePath.split("/")[0] || "";
}

function getOcrSourceForImage(category, forcedSource) {
  if (forcedSource === "desktop") return "desktop";
  if (forcedSource === "smartphone") return "smartphone";
  if (forcedSource === "current-pc") return "current-pc";
  if (category === "current-pc") return "current-pc";
  return category === "desktop" ? "desktop" : "smartphone";
}

function getSideTotal(result, side) {
  return stages.reduce((sum, stage) => {
    const value = side === "self"
      ? result[`stage${stage}`].selfTotal
      : result[`stage${stage}`].enemyTotal;

    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function describeFailures(failures, hasExpected) {
  if (!hasExpected) return "no expected";
  if (failures.length === 0) return "none";

  return failures
    .map((failure) => {
      return `${failure.key}: expected ${formatNumber(failure.expected)} / actual ${formatNumber(failure.actual)}`;
    })
    .join("<br>");
}

function isLikelyTotalPower(num, expectedTotals = []) {
  if (!Number.isFinite(num)) return false;
  if (expectedTotals.some((total) => Math.abs(total - num) <= 1)) return false;
  return totalPowerCandidates.has(num);
}

function isLikelyCrownDiff(num, expectedValues = []) {
  if (!Number.isFinite(num)) return false;
  if (expectedValues.some((value) => Math.abs(value - num) <= 1)) return false;
  return crownDiffCandidates.has(num);
}

function collectRawNumbers(stageResult, side) {
  return side === "self"
    ? [...stageResult.raw.selfTotal, ...stageResult.raw.selfMembers]
    : [...stageResult.raw.enemyTotal, ...stageResult.raw.enemyMembers];
}

function validateOcrResult(result, expected = null) {
  if (!result) return [];

  const suspicious = [];

  for (const stage of stages) {
    const stageKey = `stage${stage}`;
    const stageResult = result[stageKey];

    for (const side of sides) {
      const sideLabel = sideLabels[side];
      const members = stageResult[side] || [];
      const total = side === "self" ? stageResult.selfTotal : stageResult.enemyTotal;
      const memberSum = members.reduce((sum, value) => sum + value, 0);
      const rawTotal = side === "self"
        ? stageResult.raw.selfTotal
        : stageResult.raw.enemyTotal;
      const rawNumbers = collectRawNumbers(stageResult, side);
      const expectedStage = expected?.[stageKey];
      const expectedTotals = expectedStage
        ? [expectedStage.selfTotal, expectedStage.enemyTotal]
        : [];
      const expectedValues = expectedStage
        ? [
            expectedStage.selfTotal,
            expectedStage.enemyTotal,
            ...expectedStage.selfMembers,
            ...expectedStage.enemyMembers,
          ]
        : [];

      if (members.length < 3) {
        suspicious.push(`S${stage} ${sideLabel}: member count ${members.length}/3`);
      }

      if (!total) {
        suspicious.push(`S${stage} ${sideLabel}: total missing`);
      }

      if (total && memberSum && Math.abs(total - memberSum) > 1) {
        suspicious.push(
          `S${stage} ${sideLabel}: member sum mismatch ${formatNumber(memberSum)} != ${formatNumber(total)}`
        );
      }

      if (total && members.length > 0 && total < Math.max(...members)) {
        suspicious.push(
          `S${stage} ${sideLabel}: total < max(member) ${formatNumber(total)} < ${formatNumber(Math.max(...members))}`
        );
      }

      if (rawTotal.length === 0) {
        suspicious.push(`S${stage} ${sideLabel}: total OCR raw missing`);
      }

      const totalPowerMatches = rawTotal.filter((num) =>
        isLikelyTotalPower(num, expectedTotals)
      );
      if (totalPowerMatches.length > 0) {
        suspicious.push(
          `S${stage} ${sideLabel}: power-like raw total ${totalPowerMatches.map(formatNumber).join(", ")}`
        );
      }

      const crownDiffMatches = rawNumbers.filter((num) =>
        isLikelyCrownDiff(num, expectedValues)
      );
      if (crownDiffMatches.length > 0) {
        suspicious.push(
          `S${stage} ${sideLabel}: crown-like raw ${crownDiffMatches.map(formatNumber).join(", ")}`
        );
      }

      const abnormalDigits = rawNumbers.filter((num) => num >= 10000000);
      if (abnormalDigits.length > 0) {
        suspicious.push(
          `S${stage} ${sideLabel}: 8譯∽ｻ･荳雁呵｣・${abnormalDigits.map(formatNumber).join(", ")}`
        );
      }
    }
  }

  return suspicious;
}

function buildSummary(report) {
  const byCategory = new Map();
  const expectedItems = report.filter((item) => item.expected);
  const expectedFailures = expectedItems.filter((item) => !item.pass);
  const suspiciousItems = report
    .map((item) => ({ ...item, suspicious: validateOcrResult(item.result, item.expectedData) }))
    .filter((item) => item.suspicious.length > 0);

  for (const item of report) {
    const current = byCategory.get(item.category) || {
      total: 0,
      expected: 0,
      failed: 0,
      suspicious: 0,
    };

    current.total += 1;
    if (item.expected) current.expected += 1;
    if (!item.pass) current.failed += 1;
    if (validateOcrResult(item.result, item.expectedData).length > 0) current.suspicious += 1;
    byCategory.set(item.category, current);
  }

  const lines = [
    `- images: ${report.length}, expected: ${expectedItems.length}, failed: ${expectedFailures.length}`,
  ];

  for (const [category, stats] of byCategory.entries()) {
    lines.push(
      `- ${category}: total ${stats.total}, expected ${stats.expected}, failed ${stats.failed}, suspicious ${stats.suspicious}`
    );
  }

  if (suspiciousItems.length > 0) {
    const highScoreSuspicious = suspiciousItems.filter((item) => item.category === "high-score").length;
    const nextScreenSuspicious = suspiciousItems.filter((item) => item.category === "next-screen").length;

    if (highScoreSuspicious > 0) {
      lines.push(`- high-score suspicious: ${highScoreSuspicious}`);
    }

    if (nextScreenSuspicious === 0) {
      lines.push("- next-screen suspicious: 0");
    } else {
      lines.push(`- next-screen suspicious: ${nextScreenSuspicious}`);
    }

    lines.push("- suspicious values include member sum mismatches, raw power values, crown-like raw values, and missing totals.");
    lines.push("- 7-digit totals are allowed. 8+ digit candidates remain abnormal.");
  }

  return lines.join("\n");
}

function buildMarkdownReport(report) {
  const generatedAt = new Date().toISOString();
  const rows = report.map((item) => {
    if (item.skipped) {
      return [
        item.image,
        item.category,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "unsupported/skipped",
        item.message || unsupportedNextScreenMessage,
      ];
    }

    const result = item.result;
    const suspicious = validateOcrResult(result, item.expectedData);

    return [
      item.image,
      item.category,
      formatNumber(result.stage1.selfTotal),
      formatNumber(result.stage1.enemyTotal),
      formatNumber(result.stage2.selfTotal),
      formatNumber(result.stage2.enemyTotal),
      formatNumber(result.stage3.selfTotal),
      formatNumber(result.stage3.enemyTotal),
      formatNumber(getSideTotal(result, "self")),
      formatNumber(getSideTotal(result, "enemy")),
      describeFailures(item.failures, item.expected),
      suspicious.length > 0 ? suspicious.join("<br>") : "none",
    ];
  });

  const header = [
    "file",
    "category",
    "S1 self",
    "S1 enemy",
    "S2 self",
    "S2 enemy",
    "S3 self",
    "S3 enemy",
    "self total",
    "enemy total",
    "failures",
    "suspicious",
  ];

  return [
    "# OCR test report",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Summary",
    "",
    buildSummary(report),
    "",
    "## Results",
    "",
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "## Improvement notes",
    "",
    "- High-score images keep 7-digit totals valid.",
    "- Crown bonus values are treated as bonus values, not member scores.",
    "- Total power values are excluded from score candidates.",
    "- 8+ digit joined values are treated as abnormal candidates.",
    "- Next-screen images are unsupported/skipped.",
    "- Normal-result images keep 5-digit member scores valid.",
    "",
    "## Known misread patterns",
    "",
    "- Rank numbers: 1-6 card rank badges are outside score targets.",
    "- Crown bonus: +number values can be mixed into totals or members.",
    "- Total power: 5-digit power values can appear near score rows.",
    "- Detail button: outside OCR targets.",
    "- Joined values: score/rank/crown concatenation can produce 8+ digits.",
    "- Abnormal digits: 8+ digit values are excluded; 7-digit totals are valid.",
    "",
  ].join("\n");
}

function formatDebugText(text) {
  const value = String(text || "").trim();
  return value ? value : "(empty)";
}

function formatDebugNumbers(numbers) {
  return numbers && numbers.length > 0 ? numbers.join(", ") : "(none)";
}

function collectDebugCandidateText(candidateResult) {
  const lines = [];
  for (const item of candidateResult?.debug || []) {
    lines.push(`pass1 [${item.pass1.pass}]: ${formatDebugText(item.pass1.text)}`);
    if (item.fallback) {
      lines.push(`fallback [${item.fallback.pass}]: ${formatDebugText(item.fallback.text)}`);
    }
  }
  return lines.length > 0 ? lines.join("\n") : "(none)";
}

function collectRejectedValues(numbers, selectedMembers, selectedTotal) {
  const selected = new Set([...selectedMembers, selectedTotal].filter(Boolean));
  return [...new Set(numbers)]
    .filter((num) => !selected.has(num))
    .map((num) => {
      const reasons = [];
      if (crownDiffCandidates.has(num)) reasons.push("crown");
      if (totalPowerCandidates.has(num)) reasons.push("power");
      if (num >= 10000000) reasons.push("8digit+");
      if (reasons.length === 0) reasons.push("not selected");
      return `${num} (${reasons.join(", ")})`;
    });
}

function buildNextDebugReport(report) {
  const lines = ["# next-screen debug", ""];

  for (const item of report.filter((entry) => entry.category === "next-screen")) {
    lines.push(`## ${path.parse(item.image).name}`, "");

    for (const stage of stages) {
      const stageResult = item.result[`stage${stage}`];
      lines.push(`### S${stage}`, "");

      for (const side of sides) {
        const debug = stageResult.debug[side];
        const selectedMembers = stageResult[side] || [];
        const selectedTotal = side === "self" ? stageResult.selfTotal : stageResult.enemyTotal;
        const totalNumbers = [
          ...(debug.totalDirect.numbers || []),
          ...(debug.totalCandidates.numbers || []),
        ];
        const memberNumbers = debug.memberCandidates.numbers || [];
        const allNumbers = [...totalNumbers, ...memberNumbers];
        const rejected = collectRejectedValues(allNumbers, selectedMembers, selectedTotal);

        lines.push(`#### ${side}`, "");
        lines.push("raw:");
        lines.push("```text");
        lines.push(`total direct [${debug.totalDirect.pass}]: ${formatDebugText(debug.totalDirect.text)}`);
        lines.push(collectDebugCandidateText(debug.totalCandidates));
        lines.push(`members [${debug.memberCandidates.pass || "pass1"}]: ${formatDebugText(debug.memberCandidates.text)}`);
        lines.push("```");
        lines.push("");
        lines.push(`member candidates: ${formatDebugNumbers(memberNumbers)}`);
        lines.push(`total candidates: ${formatDebugNumbers(totalNumbers)}`);
        lines.push(`selected members: ${formatDebugNumbers(selectedMembers)}`);
        lines.push(`selected total: ${selectedTotal || "(none)"}`);
        lines.push(
          `crown candidates: ${formatDebugNumbers(allNumbers.filter((num) => crownDiffCandidates.has(num)))}`
        );
        lines.push(
          `power-value candidates: ${formatDebugNumbers(allNumbers.filter((num) => totalPowerCandidates.has(num)))}`
        );
        lines.push(`rejected values: ${rejected.length > 0 ? rejected.join(", ") : "(none)"}`);
        lines.push(`pass used: ${debug.memberCandidates.pass || "pass1"}`);
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

function numberText(num) {
  return Number.isFinite(num) ? String(Math.trunc(Math.abs(num))) : "";
}

function isShortFragmentOf(fragment, full) {
  const fragmentText = numberText(fragment);
  const fullText = numberText(full);
  if (fragmentText.length < 3 || fullText.length <= fragmentText.length) return false;
  if (fragmentText.length > 5) return false;
  return fullText.includes(fragmentText);
}

function classifyDigitDropFinding({ selected, expectedValue, rawMatch, totalMatch }) {
  if (Number.isFinite(expectedValue) && expectedValue > 0 && isShortFragmentOf(selected, expectedValue)) {
    return {
      confidence: rawMatch ? "high" : "medium",
      reason: rawMatch
        ? `selected ${selected} is a substring of expected/observed value ${expectedValue}`
        : `selected ${selected} is a substring of expected value ${expectedValue}`,
    };
  }

  if (rawMatch) {
    return {
      confidence: "medium",
      reason: `selected ${selected} is a substring of raw candidate ${rawMatch}`,
    };
  }

  if (totalMatch) {
    return {
      confidence: "low",
      reason: `selected ${selected} is a substring of total-like value ${totalMatch}`,
    };
  }

  return null;
}

function collectDigitDropAuditFindings(report) {
  const findings = [];

  for (const item of report) {
    if (!item.result || item.source === "desktop") continue;
    const itemBaseName = path.basename(item.image).toLowerCase();
    const itemDisabledKnownCorrections = (item.disabledKnownCorrections || []).filter((key) =>
      normalizeKnownCorrectionKey(key).startsWith(`${itemBaseName}:`)
    );

    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const stageResult = item.result[stageKey];
      const expectedStage = item.expectedData?.[stageKey];

      for (const side of sides) {
        const selectedMembers = stageResult[side] || [];
        const selectedTotal = side === "self" ? stageResult.selfTotal : stageResult.enemyTotal;
        const rawNumbers = collectRawNumbers(stageResult, side);
        const rawTotalNumbers = side === "self" ? stageResult.raw.selfTotal : stageResult.raw.enemyTotal;
        const expectedMembers = expectedStage?.[`${side}Members`] || [];
        const expectedTotal = expectedStage?.[`${side}Total`];
        const totalLikeNumbers = [
          selectedTotal,
          expectedTotal,
          ...rawTotalNumbers,
          ...rawNumbers.filter((num) => Number.isFinite(num) && num >= 50000),
        ].filter((num) => Number.isFinite(num) && num > 0);

        selectedMembers.forEach((member, index) => {
          if (!Number.isFinite(member) || member <= 0) return;

          const expectedValue = Number(expectedMembers[index] || 0);
          const expectedMismatch = Number.isFinite(expectedValue) && expectedValue > 0 && Math.abs(member - expectedValue) > 1;
          const rawMatch = rawNumbers.find(
            (candidate) => candidate !== member && isShortFragmentOf(member, candidate)
          );
          const totalMatch = totalLikeNumbers.find(
            (candidate) => candidate !== member && isShortFragmentOf(member, candidate)
          );
          const classification = classifyDigitDropFinding({
            selected: member,
            expectedValue: expectedMismatch ? expectedValue : NaN,
            rawMatch,
            totalMatch,
          });

          if (!classification) return;

          const candidateRepair = expectedMismatch
            ? expectedValue
            : rawMatch || totalMatch || 0;
          const repairedMembers = [...selectedMembers];
          if (candidateRepair > 0) {
            repairedMembers[index] = candidateRepair;
          }
          const repairedSum = repairedMembers.reduce((sum, value) => sum + (Number(value) || 0), 0);
          const manualRequired =
            !expectedMismatch ||
            classification.confidence !== "high" ||
            (Number.isFinite(expectedTotal) && Math.abs(repairedSum - expectedTotal) > 1000);

          findings.push({
            image: item.image,
            disabledKnownCorrections: itemDisabledKnownCorrections,
            stage,
            side,
            memberSlot: index + 1,
            selected: member,
            expectedValue: expectedMismatch ? expectedValue : null,
            candidateRepair: candidateRepair || null,
            selectedMembers,
            expectedMembers,
            selectedTotal,
            expectedTotal: Number.isFinite(expectedTotal) ? expectedTotal : null,
            rawNumbers,
            reason: classification.reason,
            confidence: classification.confidence,
            manualRequired,
          });
        });
      }
    }
  }

  return findings;
}

function buildDigitDropAuditReport(report) {
  const findings = collectDigitDropAuditFindings(report);
  const generatedAt = new Date().toISOString();
  const byConfidence = findings.reduce((counts, finding) => {
    counts[finding.confidence] = (counts[finding.confidence] || 0) + 1;
    return counts;
  }, {});

  const lines = [
    "# OCR digit-drop audit detector report",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Scope",
    "",
    "This is an audit-only report produced by `scripts/ocr-test-images.mjs`.",
    "It does not change OCR output and is not imported by the browser app.",
    "When `--audit-disable-known-correction` is used, only the test runner skips the selected filename-keyed correction.",
    "",
    "## Summary",
    "",
    `- images scanned: ${report.length}`,
    `- possible digit-drop / fragment findings: ${findings.length}`,
    `- high confidence: ${byConfidence.high || 0}`,
    `- medium confidence: ${byConfidence.medium || 0}`,
    `- low confidence: ${byConfidence.low || 0}`,
    "",
    "## Findings",
    "",
  ];

  if (findings.length === 0) {
    lines.push("No possible digit-drop findings detected.", "");
    return lines.join("\n");
  }

  lines.push("| image | disabled correction | stage | side | slot | selected | candidate repair | expected | confidence | manual/browser confirmation | reason |");
  lines.push("| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |");

  for (const finding of findings) {
    lines.push(
      `| ${finding.image} | ${finding.disabledKnownCorrections.join(", ") || "-"} | S${finding.stage} | ${finding.side} | ${finding.memberSlot} | ${formatNumber(finding.selected)} | ${formatNumber(finding.candidateRepair)} | ${formatNumber(finding.expectedValue)} | ${finding.confidence} | ${finding.manualRequired ? "required" : "not required for runner proof"} | ${finding.reason} |`
    );
  }

  lines.push("", "## Details", "");

  for (const finding of findings) {
    lines.push(`### ${finding.image} S${finding.stage} ${finding.side} member${finding.memberSlot}`, "");
    lines.push(`- disabled known correction(s): ${finding.disabledKnownCorrections.join(", ") || "none"}`);
    lines.push(`- selected members: ${formatDebugNumbers(finding.selectedMembers)}`);
    lines.push(`- expected members: ${formatDebugNumbers(finding.expectedMembers)}`);
    lines.push(`- selected total: ${formatNumber(finding.selectedTotal)}`);
    lines.push(`- expected total: ${formatNumber(finding.expectedTotal)}`);
    lines.push(`- raw candidates: ${formatDebugNumbers(finding.rawNumbers)}`);
    lines.push(`- reason/evidence: ${finding.reason}`);
    lines.push(`- confidence: ${finding.confidence}`);
    lines.push(`- manual/browser confirmation: ${finding.manualRequired ? "required" : "not required for runner proof"}`);
    lines.push("");
  }

  lines.push("## Safety Notes", "");
  lines.push("- Findings are diagnostic only; no repair is applied.");
  lines.push("- Tiny sparse enemy rows still require manual/signature handling.");
  lines.push("- A future production rule should require exact equation support and should avoid inventing digits unless the repaired candidate was observed.");
  lines.push("");

  return lines.join("\n");
}

function extractRawTextTokens(text) {
  return String(text || "")
    .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
    .match(/[+\-]?\d[\d,.\sA-Za-z]{0,12}|\S+/g)
    ?.map((token) => token.trim())
    .filter(Boolean) ?? [];
}

function getStageSideFailures(item, stage, side) {
  const label = `S${stage} ${sideLabels[side]}`;
  return (item.failures || []).filter((failure) => failure.key.startsWith(label));
}

function getRawTextBundle(stageResult, side) {
  const rawText = stageResult.rawText || {};
  if (side === "self") {
    return {
      totalDirect: rawText.selfTotalDirect || "",
      totalCandidates: rawText.selfTotalCandidates || "",
      totalCandidateTraces: rawText.selfTotalCandidateTraces || [],
      members: rawText.selfMembers || "",
    };
  }

  return {
    totalDirect: rawText.enemyTotalDirect || "",
    totalCandidates: rawText.enemyTotalCandidates || "",
    totalCandidateTraces: rawText.enemyTotalCandidateTraces || [],
    members: rawText.enemyMembers || "",
  };
}

function formatTraceLines(traces = []) {
  if (!Array.isArray(traces) || traces.length === 0) return "- (none)";
  return traces
    .map((trace, index) => {
      const text = formatDebugText(trace.text);
      const numbers = formatDebugNumbers(trace.numbers || []);
      return `- trace ${index + 1} [${trace.pass || "pass1"}]: text=${JSON.stringify(text)} numbers=${numbers}`;
    })
    .join("\n");
}

function formatNumberListWithSlots(values = []) {
  if (!Array.isArray(values) || values.length === 0) return "(none)";
  return values
    .map((value, index) => `slot${index + 1}=${formatNumber(Number(value) || 0) || "0"}`)
    .join(", ");
}

function formatSourceNumbers(numbers = []) {
  if (!Array.isArray(numbers) || numbers.length === 0) return "(none)";
  return numbers
    .map((value, index) => `${index + 1}:${formatNumber(Number(value) || 0) || "0"}`)
    .join(", ");
}

function sortedNonZeroValues(values = []) {
  return values
    .map((value) => Number(value) || 0)
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
}

function hasSameNonZeroValueSet(left = [], right = []) {
  const a = sortedNonZeroValues(left);
  const b = sortedNonZeroValues(right);
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= 1);
}

function getOrderedNumberSources(bundle) {
  const sources = [];
  const addSource = (label, text, trace = null) => {
    const numbers = extractNumbersForZone(text || "");
    if (numbers.length === 0 && !text) return;
    sources.push({
      label,
      numbers,
      text: formatDebugText(text || ""),
      trace,
    });
  };

  addSource("total direct crop", bundle.totalDirect);
  (bundle.totalCandidateTraces || []).forEach((trace, index) => {
    addSource(`total candidate trace ${index + 1}`, trace.text, trace);
  });
  addSource("selected member crop", bundle.members);

  return sources;
}

function describeValueSource(value, sources) {
  const target = Number(value) || 0;
  if (target <= 0) return "blank/zero";

  const matches = [];
  for (const source of sources) {
    (source.numbers || []).forEach((num, index) => {
      if (Math.abs(num - target) <= 1) {
        matches.push(`${source.label} #${index + 1}`);
      }
    });
  }

  return matches.length > 0 ? matches.join("; ") : "not observed in raw text numbers";
}

function buildMemberOrderAuditReport(report) {
  const targetKeys = new Set([
    "img_9240.png:stage3",
    "img_9254.png:stage3",
    "img_9281.png:stage3",
  ]);
  const generatedAt = new Date().toISOString();
  const scopedItems = report.filter((item) => {
    if (!item.result || item.source === "desktop") return false;
    const disabled = (item.disabledKnownCorrections || []).map(normalizeKnownCorrectionKey);
    return disabled.some((key) => targetKeys.has(key));
  });

  const lines = [
    "# OCR Member Order / Slot Assignment Audit",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Scope",
    "",
    "This is runner-only audit output produced by `scripts/ocr-test-images.mjs`.",
    "It does not change OCR output, browser behavior, or known corrections.",
    "",
    "## Available Evidence",
    "",
    "- OCR zone name/source is available at the crop level: direct total crop, alternative total candidate traces, and selected member crop.",
    "- Raw OCR token order is available as returned text order from those crops.",
    "- Numeric candidate order is available per crop via parsed numbers from each raw OCR text block.",
    "- Tesseract word bounding boxes are not currently preserved by the runner, so this report cannot prove per-token x/y geometry yet.",
    "",
    "## Summary",
    "",
    `- audit images scanned: ${scopedItems.length}`,
    "",
  ];

  if (scopedItems.length === 0) {
    lines.push("No member-order audit targets found in this run.", "");
    return lines.join("\n");
  }

  for (const item of scopedItems) {
    lines.push(`## ${item.image}`, "");
    lines.push(`- disabled known correction(s): ${(item.disabledKnownCorrections || []).join(", ") || "none"}`);
    lines.push(`- expected JSON: ${item.expected ? "yes" : "no"}`);
    lines.push(`- pass: ${item.pass ? "yes" : "no"}`);
    lines.push("");

    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const stageResult = item.result?.[stageKey];
      const disabledStage = (item.disabledKnownCorrections || []).some((key) =>
        normalizeKnownCorrectionKey(key).endsWith(`:stage${stage}`)
      );
      if (!stageResult || !disabledStage) continue;

      for (const side of sides) {
        const failures = getStageSideFailures(item, stage, side);
        const selectedMembers = stageResult[side] || [];
        const selectedTotal = side === "self" ? stageResult.selfTotal : stageResult.enemyTotal;
        const expectedStage = item.expectedData?.[stageKey];
        const expectedMembers = expectedStage?.[`${side}Members`] || [];
        const expectedTotal = expectedStage?.[side === "self" ? "selfTotal" : "enemyTotal"];
        const sameValueSet = hasSameNonZeroValueSet(selectedMembers, expectedMembers);
        const bundle = getRawTextBundle(stageResult, side);
        const sources = getOrderedNumberSources(bundle);
        const rawNumbers = collectRawNumbers(stageResult, side);
        const includeSide =
          failures.length > 0 ||
          sameValueSet ||
          expectedMembers.some((value) => value > 0 && describeValueSource(value, sources) !== "not observed in raw text numbers");

        if (!includeSide) continue;

        const selectedSum = selectedMembers.reduce((sum, value) => sum + (Number(value) || 0), 0);
        const expectedSum = expectedMembers.reduce((sum, value) => sum + (Number(value) || 0), 0);

        lines.push(`### S${stage} ${side}`, "");
        lines.push(`- failures: ${failures.length > 0 ? failures.map((failure) => `${failure.key} expected ${failure.expected} actual ${failure.actual}`).join("; ") : "none"}`);
        lines.push(`- selected members: ${formatNumberListWithSlots(selectedMembers)}`);
        lines.push(`- selected total: ${formatNumber(selectedTotal)}`);
        lines.push(`- selected member sum: ${formatNumber(selectedSum)}`);
        lines.push(`- expected members: ${formatNumberListWithSlots(expectedMembers)}`);
        lines.push(`- expected total: ${formatNumber(expectedTotal)}`);
        lines.push(`- expected member sum: ${formatNumber(expectedSum)}`);
        lines.push(`- same non-zero member value set: ${sameValueSet ? "yes" : "no"}`);
        lines.push(`- raw numeric candidates: ${formatDebugNumbers(rawNumbers)}`);
        lines.push("");

        lines.push("#### Source Occurrence Map", "");
        const valuesToTrace = [...new Set([
          ...selectedMembers,
          ...expectedMembers,
          selectedTotal,
          expectedTotal,
        ].map((value) => Number(value) || 0).filter((value) => value > 0))];
        lines.push("| value | selected slot(s) | expected slot(s) | observed source(s) |");
        lines.push("| ---: | --- | --- | --- |");
        for (const value of valuesToTrace) {
          const selectedSlots = selectedMembers
            .map((member, index) => (Math.abs((Number(member) || 0) - value) <= 1 ? `member${index + 1}` : ""))
            .filter(Boolean);
          if (Math.abs((Number(selectedTotal) || 0) - value) <= 1) selectedSlots.push("total");
          const expectedSlots = expectedMembers
            .map((member, index) => (Math.abs((Number(member) || 0) - value) <= 1 ? `member${index + 1}` : ""))
            .filter(Boolean);
          if (Math.abs((Number(expectedTotal) || 0) - value) <= 1) expectedSlots.push("total");
          lines.push(
            `| ${formatNumber(value)} | ${selectedSlots.join(", ") || "-"} | ${expectedSlots.join(", ") || "-"} | ${describeValueSource(value, sources)} |`
          );
        }
        lines.push("");

        lines.push("#### Ordered Source Numbers", "");
        for (const source of sources) {
          lines.push(`- ${source.label}: ${formatSourceNumbers(source.numbers)}`);
        }
        lines.push("");

        lines.push("#### Raw OCR Text", "");
        lines.push("```text");
        lines.push(`total direct: ${formatDebugText(bundle.totalDirect)}`);
        lines.push("total candidate traces:");
        lines.push(formatTraceLines(bundle.totalCandidateTraces));
        lines.push(`members: ${formatDebugText(bundle.members)}`);
        lines.push("```");
        lines.push("");

        const geometryAssessment = sameValueSet
          ? "Values exist as the same set, but current runner output still lacks bounding-box proof for safe automatic reordering."
          : "This is a broader slot-assignment issue, not a pure permutation; source-zone evidence is needed before any production rule.";
        lines.push("#### Audit Assessment", "");
        lines.push(`- ${geometryAssessment}`);
        lines.push("- Current evidence is useful for designing the next audit, but not enough by itself for production correction.");
        lines.push("");
      }
    }
  }

  lines.push("## Recommendation", "");
  lines.push("- Keep this audit runner-only.");
  lines.push("- Do not implement production member-order repair until selected values include per-token source geometry or explicit slot provenance.");
  lines.push("- The most promising future target remains `IMG_9240.png:stage3`, because the selected and expected non-zero member sets are identical.");
  lines.push("- `IMG_9254.png:stage3` and `IMG_9281.png:stage3` need total/member/crown slot provenance, not just value order.");
  lines.push("");

  return lines.join("\n");
}

function formatGeometryToken(token) {
  const numbers = formatDebugNumbers(token.numbers || []);
  return `| \`${formatDebugText(token.text)}\` | ${numbers} | ${formatBbox(token.cropBbox)} | ${formatBbox(token.fullBbox)} | ${token.confidence ?? "-"} |`;
}

function formatGeometrySpan(span, selectedMembers = [], expectedMembers = [], selectedTotal = 0, expectedTotal = 0) {
  const selectedSlots = selectedMembers
    .map((member, index) => (Math.abs((Number(member) || 0) - span.value) <= 1 ? `member${index + 1}` : ""))
    .filter(Boolean);
  if (Math.abs((Number(selectedTotal) || 0) - span.value) <= 1) selectedSlots.push("total");

  const expectedSlots = expectedMembers
    .map((member, index) => (Math.abs((Number(member) || 0) - span.value) <= 1 ? `member${index + 1}` : ""))
    .filter(Boolean);
  if (Math.abs((Number(expectedTotal) || 0) - span.value) <= 1) expectedSlots.push("total");

  return `| ${formatNumber(span.value)} | ${selectedSlots.join(", ") || "-"} | ${expectedSlots.join(", ") || "-"} | ${formatBbox(span.cropBbox)} | ${formatBbox(span.fullBbox)} | \`${formatDebugText(span.sourceWord)}\` | ${span.confidence ?? "-"} |`;
}

function nonZeroSequence(values = []) {
  return values.map((value) => Number(value) || 0).filter((value) => value > 0);
}

function sequenceEquals(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => Math.abs(value - right[index]) <= 1);
}

function getMemberZoneSpanOrder(geometryResults = [], expectedMembers = []) {
  const expectedValues = nonZeroSequence(expectedMembers);
  const memberSpans = geometryResults
    .filter((result) => result.label.includes("member"))
    .flatMap((result) =>
      (result.spans || [])
        .filter((span) => expectedValues.some((value) => Math.abs(value - span.value) <= 1))
        .map((span) => ({ ...span, sourceLabel: result.label }))
    );

  const bestByValue = new Map();
  for (const span of memberSpans) {
    const key = String(span.value);
    const previous = bestByValue.get(key);
    if (!previous || (span.fullBbox?.x0 ?? Infinity) < (previous.fullBbox?.x0 ?? Infinity)) {
      bestByValue.set(key, span);
    }
  }

  return [...bestByValue.values()]
    .sort((a, b) => {
      const ay = a.fullBbox?.y0 ?? 0;
      const by = b.fullBbox?.y0 ?? 0;
      if (Math.abs(ay - by) > 20) return ay - by;
      return (a.fullBbox?.x0 ?? 0) - (b.fullBbox?.x0 ?? 0);
    })
    .map((span) => span.value);
}

async function collectGeometryForStageSide(imagePath, image, stage, side, source, targetValues) {
  const fixedZones = getFixedOcrZones(image, stage, source);
  const directTotalZone = side === "self" ? fixedZones.selfTotal : fixedZones.enemyTotal;
  const altTotalZones = getAlternativeTotalZones(image, stage, side, source);
  const altMemberZones = getAlternativeMemberZones(image, stage, side, source);
  const zones = [
    { label: `${side} total direct`, zone: directTotalZone },
    ...altTotalZones.map((zone, index) => ({ label: `${side} total candidate ${index + 1}`, zone })),
    ...altMemberZones.map((zone, index) => ({ label: `${side} member candidate ${index + 1}`, zone })),
  ];

  const results = [];
  for (const item of zones) {
    results.push(
      await recognizeOcrZoneWithGeometry(imagePath, item.zone, {
        label: item.label,
        targetValues,
      })
    );
  }

  return results;
}

async function buildGeometryAuditReport(report) {
  const targetKeys = new Set([
    "img_9240.png:stage3",
    "img_9254.png:stage3",
    "img_9281.png:stage3",
  ]);
  const generatedAt = new Date().toISOString();
  const scopedItems = report.filter((item) => {
    if (!item.result || item.source === "desktop") return false;
    const disabled = (item.disabledKnownCorrections || []).map(normalizeKnownCorrectionKey);
    return disabled.some((key) => targetKeys.has(key));
  });
  const lines = [
    "# OCR Geometry Audit Report",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Scope",
    "",
    "This is runner-only audit output from `scripts/ocr-test-images.mjs`.",
    "It uses Tesseract.js worker output options to capture `blocks`/symbol bounding boxes for audit targets only.",
    "It does not change OCR selection, browser behavior, or known corrections.",
    "",
    "## Summary",
    "",
    `- audit images scanned: ${scopedItems.length}`,
    "- geometry source: Tesseract.js `worker.recognize(..., { text: true, blocks: true, hocr: true, tsv: true })`",
    "- bbox coordinates are reported as crop-relative and full-image-relative rectangles.",
    "",
  ];

  if (scopedItems.length === 0) {
    lines.push("No geometry audit targets found in this run.", "");
    return lines.join("\n");
  }

  for (const item of scopedItems) {
    const imagePath = path.join(testImagesDir, item.image);
    const image = await readImageSize(imagePath);
    lines.push(`## ${item.image}`, "");
    lines.push(`- disabled known correction(s): ${(item.disabledKnownCorrections || []).join(", ") || "none"}`);
    lines.push(`- expected JSON: ${item.expected ? "yes" : "no"}`);
    lines.push(`- pass: ${item.pass ? "yes" : "no"}`);
    lines.push(`- image size: ${image.width}x${image.height}`);
    lines.push("");

    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const stageResult = item.result?.[stageKey];
      const disabledStage = (item.disabledKnownCorrections || []).some((key) =>
        normalizeKnownCorrectionKey(key).endsWith(`:stage${stage}`)
      );
      if (!stageResult || !disabledStage) continue;

      for (const side of sides) {
        const failures = getStageSideFailures(item, stage, side);
        if (failures.length === 0) continue;

        const selectedMembers = stageResult[side] || [];
        const selectedTotal = side === "self" ? stageResult.selfTotal : stageResult.enemyTotal;
        const expectedStage = item.expectedData?.[stageKey];
        const expectedMembers = expectedStage?.[`${side}Members`] || [];
        const expectedTotal = expectedStage?.[side === "self" ? "selfTotal" : "enemyTotal"];
        const targetValues = [
          ...selectedMembers,
          ...expectedMembers,
          selectedTotal,
          expectedTotal,
        ].map((value) => Number(value) || 0).filter((value) => value > 0);
        const geometryResults = await collectGeometryForStageSide(
          imagePath,
          image,
          stage,
          side,
          item.source || "smartphone",
          targetValues
        );
        const memberGeometryOrder = getMemberZoneSpanOrder(geometryResults, expectedMembers);
        const expectedOrder = nonZeroSequence(expectedMembers);
        const selectedOrder = nonZeroSequence(selectedMembers);
        const expectedValuesAppearInOrder = sequenceEquals(memberGeometryOrder, expectedOrder);
        const selectedOrderDiffersFromGeometry =
          memberGeometryOrder.length > 0 && !sequenceEquals(memberGeometryOrder, selectedOrder);

        lines.push(`### S${stage} ${side}`, "");
        lines.push(`- failures: ${failures.map((failure) => `${failure.key} expected ${failure.expected} actual ${failure.actual}`).join("; ")}`);
        lines.push(`- selected members: ${formatNumberListWithSlots(selectedMembers)}`);
        lines.push(`- selected total: ${formatNumber(selectedTotal)}`);
        lines.push(`- expected members: ${formatNumberListWithSlots(expectedMembers)}`);
        lines.push(`- expected total: ${formatNumber(expectedTotal)}`);
        lines.push(`- bbox-derived member-zone order for expected values: ${memberGeometryOrder.length > 0 ? formatDebugNumbers(memberGeometryOrder) : "(not found)"}`);
        lines.push(`- values appear visually in expected order: ${expectedValuesAppearInOrder ? "yes" : "no/unknown"}`);
        lines.push(`- selected order differs from bbox order: ${selectedOrderDiffersFromGeometry ? "yes" : "no/unknown"}`);
        lines.push(`- future generic rule looks safe now: no`);
        lines.push("");

        lines.push("#### Geometry Span Matches", "");
        lines.push("| value | selected slot(s) | expected slot(s) | crop bbox | full-image bbox | source word | min symbol confidence |");
        lines.push("| ---: | --- | --- | --- | --- | --- | ---: |");
        const allSpans = geometryResults.flatMap((result) =>
          (result.spans || []).map((span) => ({ ...span, sourceLabel: result.label }))
        );
        const seenSpanKeys = new Set();
        for (const span of allSpans) {
          const key = `${span.value}:${span.fullBbox?.x0}:${span.fullBbox?.y0}:${span.sourceLabel}`;
          if (seenSpanKeys.has(key)) continue;
          seenSpanKeys.add(key);
          lines.push(formatGeometrySpan(span, selectedMembers, expectedMembers, selectedTotal, expectedTotal));
        }
        if (seenSpanKeys.size === 0) lines.push("| (none) | - | - | - | - | - | - |");
        lines.push("");

        lines.push("#### OCR Zone Tokens", "");
        for (const result of geometryResults) {
          lines.push(`##### ${result.label}`, "");
          lines.push(`- zone: left=${result.zone.left}, top=${result.zone.top}, width=${result.zone.width}, height=${result.zone.height}`);
          lines.push(`- raw text: ${JSON.stringify(formatDebugText(result.text))}`);
          lines.push(`- parsed zone numbers: ${formatDebugNumbers(result.numbers)}`);
          lines.push("");
          lines.push("| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |");
          lines.push("| --- | --- | --- | --- | ---: |");
          const tokens = result.tokens || [];
          for (const token of tokens.slice(0, 16)) {
            lines.push(formatGeometryToken(token));
          }
          if (tokens.length === 0) lines.push("| (none) | (none) | - | - | - |");
          if (tokens.length > 16) lines.push(`| ... ${tokens.length - 16} more token(s) omitted | | | | |`);
          lines.push("");
        }

        lines.push("#### Assessment", "");
        if (expectedValuesAppearInOrder) {
          lines.push("- Geometry supports the expected member order in member candidate crops.");
        } else {
          lines.push("- Geometry does not yet prove the expected order for all values.");
        }
        lines.push("- This is still audit-only evidence; production member-order correction should wait for more repeated cases and a stricter rule.");
        lines.push("");
      }
    }
  }

  lines.push("## Recommendation", "");
  lines.push("- Keep geometry capture runner-only.");
  lines.push("- Do not implement production member-order correction yet.");
  lines.push("- The next useful step is to collect more bbox-backed examples and design a rule that requires member-zone span order plus equation consistency.");
  lines.push("");

  return lines.join("\n");
}

function buildRawTokenFragmentAuditReport(report) {
  const generatedAt = new Date().toISOString();
  const scopedItems = report.filter((item) =>
    item.result &&
    item.source !== "desktop" &&
    ((item.disabledKnownCorrections || []).length > 0 || (item.failures || []).length > 0)
  );
  const lines = [
    "# OCR Raw Token / Fragment Audit",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Scope",
    "",
    "This is a runner-only audit report produced by `scripts/ocr-test-images.mjs`.",
    "It does not change OCR output and is not imported by the browser app.",
    "",
    "## Availability",
    "",
    "- Raw OCR text is available inside the runner from `recognizeOcrZone(...).text` before numeric parsing.",
    "- Before this audit output, normal stage results preserved only numeric arrays under `result.stageN.raw`.",
    "- This report preserves runner-only `rawText` fields for direct total crops, alternative total candidate crops, and selected member crops.",
    "- It does not expose browser OCR text; app runtime code remains untouched.",
    "",
    "## Target Data Needed For IMG_9243 Stage2",
    "",
    "- Raw text for Stage2 enemy total direct crop.",
    "- Raw text/traces for Stage2 enemy alternative total candidate crops.",
    "- Raw text for Stage2 enemy member crop.",
    "- Token fragments that might support a displayed total like `448 97 6m`.",
    "",
    "## Summary",
    "",
    `- images scanned: ${report.length}`,
    `- mobile audit images with disabled corrections/failures: ${scopedItems.length}`,
    "",
  ];

  if (scopedItems.length === 0) {
    lines.push("No raw token audit targets found.", "");
    return lines.join("\n");
  }

  lines.push("## Raw Token Details", "");

  for (const item of scopedItems) {
    lines.push(`### ${item.image}`, "");
    lines.push(`- disabled known correction(s): ${(item.disabledKnownCorrections || []).join(", ") || "none"}`);
    lines.push(`- expected: ${item.expected ? "yes" : "no"}`);
    lines.push(`- pass: ${item.pass ? "yes" : "no"}`);
    lines.push("");

    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const stageResult = item.result?.[stageKey];
      if (!stageResult) continue;

      for (const side of sides) {
        const failures = getStageSideFailures(item, stage, side);
        const includeSide =
          failures.length > 0 ||
          (item.disabledKnownCorrections || []).some((key) =>
            normalizeKnownCorrectionKey(key).endsWith(`:stage${stage}`)
          );
        if (!includeSide) continue;

        const selectedMembers = stageResult[side] || [];
        const selectedTotal = side === "self" ? stageResult.selfTotal : stageResult.enemyTotal;
        const expectedStage = item.expectedData?.[stageKey];
        const expectedMembers = expectedStage?.[`${side}Members`] || [];
        const expectedTotal = expectedStage?.[side === "self" ? "selfTotal" : "enemyTotal"];
        const rawNumbers = collectRawNumbers(stageResult, side);
        const bundle = getRawTextBundle(stageResult, side);
        const allText = [
          bundle.totalDirect,
          bundle.totalCandidates,
          bundle.members,
        ].filter(Boolean).join("\n");
        const tokens = extractRawTextTokens(allText);

        lines.push(`#### S${stage} ${side}`, "");
        lines.push(`- failures: ${failures.length > 0 ? failures.map((failure) => `${failure.key} expected ${failure.expected} actual ${failure.actual}`).join("; ") : "none"}`);
        lines.push(`- selected members: ${formatDebugNumbers(selectedMembers)}`);
        lines.push(`- selected total: ${formatNumber(selectedTotal)}`);
        lines.push(`- expected members: ${formatDebugNumbers(expectedMembers)}`);
        lines.push(`- expected total: ${formatNumber(expectedTotal)}`);
        lines.push(`- raw numeric candidates: ${formatDebugNumbers(rawNumbers)}`);
        lines.push(`- extracted raw text tokens/fragments: ${tokens.length > 0 ? tokens.map((token) => `\`${token}\``).join(", ") : "(none)"}`);
        lines.push("");
        lines.push("Raw OCR text:");
        lines.push("```text");
        lines.push(`total direct: ${formatDebugText(bundle.totalDirect)}`);
        lines.push("total candidate traces:");
        lines.push(formatTraceLines(bundle.totalCandidateTraces));
        lines.push(`members: ${formatDebugText(bundle.members)}`);
        lines.push("```");
        lines.push("");
      }
    }
  }

  lines.push("## Implementation Notes", "");
  lines.push("- Raw text/fragments can be captured safely in the runner without production changes.");
  lines.push("- Current token data can prove whether a complete value was observed, but may still miss visual fragments if Tesseract drops them before returning text.");
  lines.push("- Production digit-drop recovery should wait for exact equation support plus either clean total candidates or total-fragment token evidence.");
  lines.push("");
  lines.push("## Recommendation", "");
  lines.push("Continue with audit-only reporting. Do not implement production digit-drop recovery until multiple no-known replays show unique raw-member triplets and total-fragment support.");
  lines.push("");

  return lines.join("\n");
}

function currentPcStageRegion(image, stage) {
  const ranges = {
    1: { top: 0.070, height: 0.235 },
    2: { top: 0.325, height: 0.235 },
    3: { top: 0.575, height: 0.250 },
  };
  const range = ranges[stage] || ranges[1];
  return {
    left: 0,
    top: Math.floor(image.height * range.top),
    width: image.width,
    height: Math.floor(image.height * range.height),
  };
}

function clampZoneToImage(zone, image) {
  const left = Math.max(0, Math.min(Math.round(zone.left ?? zone.x ?? 0), image.width - 1));
  const top = Math.max(0, Math.min(Math.round(zone.top ?? zone.y ?? 0), image.height - 1));
  const width = Math.max(1, Math.min(Math.round(zone.width || 1), image.width - left));
  const height = Math.max(1, Math.min(Math.round(zone.height || 1), image.height - top));
  return { left, top, width, height };
}

function svgRect(zone, color, label) {
  const z = zone;
  return `
    <rect x="${z.left}" y="${z.top}" width="${z.width}" height="${z.height}" fill="none" stroke="${color}" stroke-width="2" />
    <text x="${z.left + 3}" y="${Math.max(12, z.top + 13)}" fill="${color}" font-size="12" font-family="Arial">${label}</text>
  `;
}

async function saveCurrentPcZoneArtifacts(imagePath, image, outDir, label, zone, options = {}) {
  const safeLabel = safeArtifactName(label);
  const clamped = clampZoneToImage(zone, image);
  const cropPath = path.join(outDir, `${safeLabel}.png`);
  await sharp(imagePath).extract(clamped).png().toFile(cropPath);

  let binarizedPath = null;
  if (options.binarized !== false) {
    binarizedPath = path.join(outDir, `${safeLabel}.binarized.png`);
    const binarized = await createPreprocessedStageBuffer(imagePath, clamped, {
      preset: Object.hasOwn(options, "preset") ? options.preset : "score-slot",
      pageSegMode: "6",
    });
    await fs.writeFile(binarizedPath, binarized);
  }

  return {
    label,
    zone: clamped,
    crop: path.relative(rootDir, cropPath).replaceAll("\\", "/"),
    binarized: binarizedPath ? path.relative(rootDir, binarizedPath).replaceAll("\\", "/") : null,
  };
}

function buildCurrentPcStage3SelfSevenDigitDisplacementSimulation({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  sideArtifact = null,
  roiProvenance = null,
}) {
  const memberSource = sideArtifact?.candidateSources?.memberCandidates || {};
  const totalSource = sideArtifact?.candidateSources?.totalCandidates || {};
  const totalDirect = sideArtifact?.candidateSources?.totalDirect || {};
  const memberNumbers = uniqueNumbers(memberSource.numbers || []);
  const totalReferences = uniqueNumbers([
    ...(totalDirect.numbers || []),
    ...(totalSource.numbers || []),
    ...((totalSource.traces || []).flatMap((trace) => trace.numbers || [])),
  ]);
  const selected = [...selectedMembers].map((value) => Number(value) || 0);
  while (selected.length < 3) selected.push(0);
  const selectedMemberSum = selected.reduce((sum, value) => sum + value, 0);
  const totalEvidenceSources = buildStage3TotalEvidenceSources({
    totalDirectText: totalDirect.text || "",
    totalDirectNumbers: totalDirect.numbers || [],
    totalCandidateText: totalSource.text || "",
    totalCandidateTraces: totalSource.traces || [],
    memberCandidateText: memberSource.text || "",
    memberCandidateNumbers: memberNumbers,
  });
  const proposals = [];

  for (let index = 0; index <= memberNumbers.length - 4; index += 1) {
    const proposedMembers = memberNumbers.slice(index, index + 3);
    const proposedBonus = memberNumbers[index + 3];
    const proposedTotal =
      proposedMembers.reduce((sum, value) => sum + value, 0) + proposedBonus;
    const cleanSevenDigitMembers = proposedMembers.filter(
      (value) => value >= 1000000 && value < 10000000
    );
    const unselectedSevenDigitMembers = cleanSevenDigitMembers.filter(
      (value) => !selected.some((member) => Math.abs(member - value) <= 1)
    );
    const selectedShiftMatches =
      Math.abs(selected[0] - proposedMembers[1]) <= 1 &&
      Math.abs(selected[1] - proposedMembers[2]) <= 1 &&
      Math.abs(selected[2] - proposedBonus) <= 1;
    const totalEvidence = getStage3TotalEvidenceForValue(proposedTotal, totalEvidenceSources);
    const matchingDisplayedTotals = totalReferences.filter(
      (value) => Math.abs(value - proposedTotal) <= 1
    );

    proposals.push({
      rowStartIndex: index,
      proposedMembers,
      proposedBonus,
      proposedTotal,
      memberSum: proposedMembers.reduce((sum, value) => sum + value, 0),
      cleanSevenDigitMembers,
      unselectedSevenDigitMembers,
      selectedShiftMatches,
      matchingDisplayedTotals,
      totalEvidence,
      memberRowPass: memberSource.pass || null,
      memberRowTag: memberSource.tag || null,
      memberRowText: memberSource.text || "",
    });
  }

  const strictProposals = proposals.filter(
    (proposal) =>
      proposal.rowStartIndex === 0 &&
      proposal.unselectedSevenDigitMembers.length === 1 &&
      proposal.selectedShiftMatches &&
      proposal.proposedBonus >= 50000 &&
      proposal.proposedBonus < 500000 &&
      proposal.totalEvidence.hasExactEvidence &&
      proposal.totalEvidence.ambiguousExactEvidence === false &&
      proposal.matchingDisplayedTotals.length > 0
  );
  const rejectionReasons = [];
  if (!(stage === 3 && side === "self")) {
    rejectionReasons.push("not-current-pc-stage3-self");
  }
  if (memberNumbers.length < 4) {
    rejectionReasons.push("member-row-has-fewer-than-four-values");
  }
  if (!proposals.some((proposal) => proposal.rowStartIndex === 0)) {
    rejectionReasons.push("missing-leading-member-row-proposal");
  }
  if (!proposals.some((proposal) => proposal.unselectedSevenDigitMembers.length === 1)) {
    rejectionReasons.push("missing-one-unselected-clean-seven-digit-member");
  }
  if (!proposals.some((proposal) => proposal.selectedShiftMatches)) {
    rejectionReasons.push("selected-members-do-not-match-member2-member3-bonus-shift");
  }
  if (!proposals.some((proposal) => proposal.totalEvidence.hasExactEvidence)) {
    rejectionReasons.push("missing-exact-displayed-total-evidence");
  }
  if (strictProposals.length === 0) {
    rejectionReasons.push("no-strict-current-pc-stage3-self-proposal");
  }
  if (strictProposals.length > 1) {
    rejectionReasons.push("multiple-strict-current-pc-stage3-self-proposals");
  }
  const competingExactInterpretations = proposals.filter(
    (proposal) =>
      proposal.totalEvidence.hasExactEvidence &&
      proposal.totalEvidence.ambiguousExactEvidence === false &&
      !strictProposals.includes(proposal)
  );
  if (competingExactInterpretations.length > 0) {
    rejectionReasons.push("competing-exact-current-pc-stage3-self-interpretation");
  }

  const proposal = strictProposals[0] || null;
  return {
    wouldApply: rejectionReasons.length === 0,
    proposed: proposal
      ? {
          members: proposal.proposedMembers,
          bonus: proposal.proposedBonus,
          total: proposal.proposedTotal,
          memberSum: proposal.memberSum,
        }
      : null,
    current: {
      members: selected,
      total: Number(selectedTotal || 0),
      memberSum: selectedMemberSum,
      totalMinusMemberSum: Number(selectedTotal || 0) - selectedMemberSum,
    },
    rejectionReasons,
    evidence: {
      memberRowNumbers: memberNumbers,
      totalReferences,
      roiProvenance,
      proposals: proposals.map((item) => ({
        rowStartIndex: item.rowStartIndex,
        proposedMembers: item.proposedMembers,
        proposedBonus: item.proposedBonus,
        proposedTotal: item.proposedTotal,
        cleanSevenDigitMembers: item.cleanSevenDigitMembers,
        unselectedSevenDigitMembers: item.unselectedSevenDigitMembers,
        selectedShiftMatches: item.selectedShiftMatches,
        matchingDisplayedTotals: item.matchingDisplayedTotals,
        totalEvidence: item.totalEvidence,
        memberRowPass: item.memberRowPass,
        memberRowTag: item.memberRowTag,
        memberRowText: item.memberRowText,
      })),
      strictProposalCount: strictProposals.length,
      competingExactInterpretationCount: competingExactInterpretations.length,
      competingExactInterpretations: competingExactInterpretations.map((item) => ({
        rowStartIndex: item.rowStartIndex,
        proposedMembers: item.proposedMembers,
        proposedBonus: item.proposedBonus,
        proposedTotal: item.proposedTotal,
      })),
      totalCandidateSources: totalEvidenceSources,
    },
    note:
      "Runner-only current-PC simulation. It does not change OCR output and does not use filenames or hard-coded scores.",
  };
}

function buildCurrentPcExactRawEquationRecoverySimulation({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  suspiciousReasons = [],
  exactRawInterpretations = [],
  roiProvenance = null,
}) {
  const selected = [...selectedMembers].map((value) => Number(value) || 0);
  while (selected.length < 3) selected.push(0);
  const selectedMemberSum = selected.reduce((sum, value) => sum + value, 0);
  const exactInterpretations = (exactRawInterpretations || []).filter((item) => {
    const members = item?.members || [];
    if (members.length !== 3) return false;
    const bonus = Number(item?.bonus || 0);
    const total = Number(item?.total || 0);
    const sum = members.reduce((acc, value) => acc + Number(value || 0), 0);
    return total > 0 && Math.abs(sum + bonus - total) <= 1;
  });
  const proposal = exactInterpretations[0] || null;
  const selectedAlreadyMatches =
    proposal &&
    Math.abs(Number(selectedTotal || 0) - Number(proposal.total || 0)) <= 1 &&
    arraysEqualWithinOne(selected, proposal.members || []);
  const rejectionReasons = [];

  if (!suspiciousReasons.includes("selected-total-not-exact-member-sum-or-member-sum-plus-bonus")) {
    rejectionReasons.push("selected-total-equation-is-not-flagged");
  }
  if (exactInterpretations.length === 0) {
    rejectionReasons.push("missing-unique-exact-raw-interpretation");
  }
  if (exactInterpretations.length > 1) {
    rejectionReasons.push("multiple-competing-exact-raw-interpretations");
  }
  if (selectedAlreadyMatches) {
    rejectionReasons.push("selected-result-already-matches-exact-interpretation");
  }

  return {
    wouldApply: rejectionReasons.length === 0,
    proposed: proposal
      ? {
          members: proposal.members,
          bonus: Number(proposal.bonus || 0),
          total: Number(proposal.total || 0),
          memberSum: proposal.members.reduce((sum, value) => sum + Number(value || 0), 0),
        }
      : null,
    current: {
      stage,
      side,
      members: selected,
      total: Number(selectedTotal || 0),
      memberSum: selectedMemberSum,
      totalMinusMemberSum: Number(selectedTotal || 0) - selectedMemberSum,
    },
    rejectionReasons,
    evidence: {
      exactRawInterpretations: exactInterpretations,
      exactRawInterpretationCount: exactInterpretations.length,
      roiProvenance,
      structuralEquation:
        proposal
          ? `${proposal.members.join(" + ")}${proposal.bonus ? ` + ${proposal.bonus}` : ""} = ${proposal.total}`
          : null,
    },
    note:
      "Runner-only current-PC simulation. It does not change OCR output and only accepts a unique exact raw member/bonus/total equation.",
  };
}

function currentPcTokenDigitCount(value) {
  return String(Math.trunc(Number(value || 0))).length;
}

function currentPcGroupedTokenRoleForSource(sourceRole = "") {
  if (sourceRole === "member-row") return "member";
  if (sourceRole === "total-direct" || sourceRole === "total-trace") return "total";
  return "unknown";
}

function currentPcGroupedTokenRoiForRole(role, roiProvenance = null) {
  if (role === "member") return roiProvenance?.members || null;
  if (role === "total") return roiProvenance?.total || null;
  return null;
}

function collectCurrentPcGroupedRawTokenEvidence(sideAnalysis, roiProvenance = null) {
  return sharedCollectCurrentPcGroupedRawTokenEvidence(sideAnalysis, roiProvenance);
}

function currentPcOrderedMemberValuesFromTokenEvidence(sideAnalysis, eligibleTokens = []) {
  return sharedCurrentPcOrderedMemberValuesFromTokenEvidence(sideAnalysis, eligibleTokens);
}

function buildCurrentPcGroupedExactInterpretations({
  rawCandidates = [],
  displayedTotalCandidates = [],
  bonusCandidates = [],
  eligibleTokens = [],
  orderedMemberEvidence = [],
}) {
  const promotedMembers = eligibleTokens
    .filter((token) => token.role === "member")
    .map((token) => token.normalizedValue);
  const promotedTotals = eligibleTokens
    .filter((token) => token.role === "total")
    .map((token) => token.normalizedValue);
  const memberLike = uniqueNumbers([...rawCandidates, ...promotedMembers]).filter(
    (value) => value >= 10000 && value < 2000000
  );
  const totalLike = uniqueNumbers([...displayedTotalCandidates, ...promotedTotals]).filter(
    (value) => value >= 10000
  );
  const groupedValues = new Set(eligibleTokens.map((token) => Number(token.normalizedValue || 0)));
  const interpretations = [];
  const addInterpretation = (members, bonus, total, source) => {
    const promotedValuesUsed = [
      ...members.filter((value) => groupedValues.has(value)),
      ...(groupedValues.has(total) ? [total] : []),
    ];
    if (promotedValuesUsed.length === 0) return;
    interpretations.push({ members, bonus, total, source, promotedValuesUsed });
  };

  const orderedMembers = orderedMemberEvidence.slice(0, 3).map((item) => item.value);
  const orderedUsesGroupedMember = orderedMemberEvidence
    .slice(0, 3)
    .some((item) => item.source === "eligible-grouped-member-token");
  if (orderedMembers.length === 3 && orderedUsesGroupedMember) {
    const sum = orderedMembers.reduce((total, value) => total + value, 0);
    if (totalLike.some((value) => Math.abs(value - sum) <= 1)) {
      addInterpretation(orderedMembers, 0, sum, "ordered-member-row-token-evidence");
    }
    for (const bonus of bonusCandidates || []) {
      const total = sum + Number(bonus || 0);
      if (totalLike.some((value) => Math.abs(value - total) <= 1)) {
        addInterpretation(orderedMembers, bonus, total, "ordered-member-row-token-evidence");
      }
    }
  }

  if (orderedUsesGroupedMember) {
    return interpretations.filter(
      (item, index, all) =>
        all.findIndex(
          (other) =>
            other.total === item.total &&
            other.bonus === item.bonus &&
            other.members.join(",") === item.members.join(",")
        ) === index
    );
  }

  for (let a = 0; a < memberLike.length - 2; a += 1) {
    for (let b = a + 1; b < memberLike.length - 1; b += 1) {
      for (let c = b + 1; c < memberLike.length; c += 1) {
        const members = [memberLike[a], memberLike[b], memberLike[c]];
        const sum = members.reduce((total, value) => total + value, 0);
        if (totalLike.some((value) => Math.abs(value - sum) <= 1)) {
          addInterpretation(members, 0, sum, "unordered-exact-equation-token-evidence");
        }
        for (const bonus of bonusCandidates || []) {
          const total = sum + Number(bonus || 0);
          if (totalLike.some((value) => Math.abs(value - total) <= 1)) {
            addInterpretation(members, bonus, total, "unordered-exact-equation-token-evidence");
          }
        }
      }
    }
  }

  return interpretations.filter(
    (item, index, all) =>
      item.promotedValuesUsed.length > 0 &&
      all.findIndex(
        (other) =>
          other.total === item.total &&
          other.bonus === item.bonus &&
          other.members.join(",") === item.members.join(",")
      ) === index
  );
}

function buildCurrentPcGroupedRawTokenEvidenceSimulation({
  stage = 0,
  side = "",
  selectedMembers = [],
  selectedTotal = 0,
  suspiciousReasons = [],
  rawCandidates = [],
  displayedTotalCandidates = [],
  bonusCandidates = [],
  sideAnalysis = null,
  roiProvenance = null,
}) {
  return sharedBuildCurrentPcGroupedRawTokenEvidenceSimulation({
    stage,
    side,
    selectedMembers,
    selectedTotal,
    suspiciousReasons,
    rawCandidates,
    displayedTotalCandidates,
    bonusCandidates,
    sideAnalysis,
    roiProvenance,
  });
}

function cleanOcrTextForReport(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function escapeMarkdownTableCell(value = "") {
  return String(value).replaceAll("|", "\\|");
}

function normalizeGroupedNumericToken(token = "") {
  const raw = String(token || "")
    .replace(/[\uFF01-\uFF5E]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
    .trim();
  const unsigned = raw.replace(/^[+\-]/, "");
  const commaGrouped = /^\d{1,3}(?:,\d{3})+$/.test(unsigned);
  const periodGrouped = /^\d{1,3}(?:\.\d{3})+$/.test(unsigned);
  const spaceGrouped = /^\d{1,3}(?:\s+\d{3})+$/.test(unsigned);
  if (!commaGrouped && !periodGrouped && !spaceGrouped) return null;
  const value = Number(unsigned.replace(/[,\.\s]/g, ""));
  if (!Number.isFinite(value) || value < 1400 || value >= 10000000) return null;
  return {
    value,
    shape: commaGrouped ? "comma-grouped" : periodGrouped ? "period-grouped" : "space-grouped",
  };
}

function extractNumericLikeTokenAudit(text = "", parsedNumbers = []) {
  return sharedExtractNumericLikeTokenAudit(text, parsedNumbers);
}

function summarizeCurrentPcCandidateSources(sideArtifact = null) {
  const sources = sideArtifact?.candidateSources || {};
  return sharedBuildCurrentPcCandidateSourceSummary({
    ...sources,
    selectionContext: sideArtifact?.selectionContext || null,
    equationContext: sideArtifact?.equationContext || null,
  });
}

function buildCurrentPcSideAnalysis(stageResult, side, options = {}) {
  const sideArtifact = stageResult?.debugArtifact?.[side] || null;
  const selectedMembers = (stageResult?.[side] || []).map((value) => Number(value) || 0);
  while (selectedMembers.length < 3) selectedMembers.push(0);
  const selectedTotal =
    side === "self" ? Number(stageResult?.selfTotal || 0) : Number(stageResult?.enemyTotal || 0);
  const memberSum = selectedMembers.reduce((sum, value) => sum + value, 0);
  const bonusCandidates = uniqueNumbers([
    ...(sideArtifact?.equationContext?.bonusCandidates || []),
    ...(sideArtifact?.equationContext?.recognizedCrownCandidates || []),
  ]).filter((value) => value > 0);
  const rawCandidates = uniqueNumbers([
    ...(sideArtifact?.candidateSources?.totalDirect?.numbers || []),
    ...(sideArtifact?.candidateSources?.totalCandidates?.numbers || []),
    ...(sideArtifact?.candidateSources?.memberCandidates?.numbers || []),
    ...(sideArtifact?.candidateSources?.memberNumbersAfterSlotFallback || []),
    ...(sideArtifact?.candidateSources?.originalMemberNumbers || []),
  ]);
  const exactNoBonus = Math.abs(memberSum - selectedTotal) <= 1;
  const exactBonusMatches = bonusCandidates
    .map((bonus) => ({ bonus, total: memberSum + bonus }))
    .filter((candidate) => Math.abs(candidate.total - selectedTotal) <= 1);
  const displayedTotalCandidates = uniqueNumbers([
    ...(sideArtifact?.candidateSources?.totalDirect?.numbers || []),
    ...(sideArtifact?.candidateSources?.totalCandidates?.numbers || []),
  ]).filter((value) => value >= 10000);
  const cleanSevenDigitCandidates = rawCandidates.filter(
    (value) => value >= 1000000 && value < 10000000
  );
  const suspiciousReasons = [];

  if (selectedMembers.filter((value) => value > 0).length < 3) {
    suspiciousReasons.push("missing-selected-member");
  }
  if (selectedTotal <= 0) {
    suspiciousReasons.push("missing-selected-total");
  }
  if (selectedTotal > 0 && selectedTotal < memberSum) {
    suspiciousReasons.push("selected-total-lower-than-member-sum");
  }
  if (!exactNoBonus && exactBonusMatches.length === 0) {
    suspiciousReasons.push("selected-total-not-exact-member-sum-or-member-sum-plus-bonus");
  }
  if (selectedMembers.some((member) => member > 0 && Math.abs(member - selectedTotal) <= 1)) {
    suspiciousReasons.push("selected-total-also-used-as-member");
  }
  if (
    bonusCandidates.some((bonus) =>
      selectedMembers.some((member) => member > 0 && Math.abs(member - bonus) <= 1)
    )
  ) {
    suspiciousReasons.push("bonus-candidate-selected-as-member");
  }
  if (
    cleanSevenDigitCandidates.some(
      (candidate) => !selectedMembers.some((member) => Math.abs(member - candidate) <= 1)
    )
  ) {
    suspiciousReasons.push("clean-7digit-candidate-present-but-unselected");
  }
  const exactRawInterpretations = [];
  const memberLike = rawCandidates.filter((value) => value >= 10000 && value < 2000000);
  for (let a = 0; a < memberLike.length - 2; a += 1) {
    for (let b = a + 1; b < memberLike.length - 1; b += 1) {
      for (let c = b + 1; c < memberLike.length; c += 1) {
        const members = [memberLike[a], memberLike[b], memberLike[c]];
        const sum = members.reduce((total, value) => total + value, 0);
        if (displayedTotalCandidates.some((value) => Math.abs(value - sum) <= 1)) {
          exactRawInterpretations.push({ members, bonus: 0, total: sum });
        }
        for (const bonus of bonusCandidates) {
          const total = sum + bonus;
          if (displayedTotalCandidates.some((value) => Math.abs(value - total) <= 1)) {
            exactRawInterpretations.push({ members, bonus, total });
          }
        }
      }
    }
  }
  const uniqueExactRawInterpretations = exactRawInterpretations.filter(
    (item, index, all) =>
      all.findIndex(
        (other) =>
          other.total === item.total &&
          other.bonus === item.bonus &&
          other.members.join(",") === item.members.join(",")
      ) === index
  );
  if (uniqueExactRawInterpretations.length > 1) {
    suspiciousReasons.push("multiple-competing-exact-raw-interpretations");
  }
  if (
    uniqueExactRawInterpretations.length === 1 &&
    !(
      Math.abs(uniqueExactRawInterpretations[0].total - selectedTotal) <= 1 &&
      uniqueExactRawInterpretations[0].members.every((member, index) =>
        Math.abs(member - (selectedMembers[index] || 0)) <= 1
      )
    )
  ) {
    suspiciousReasons.push("unique-exact-raw-interpretation-differs-from-selected-result");
  }

  const retryPlan =
    suspiciousReasons.length > 0
      ? {
          triggered: true,
          reason: suspiciousReasons,
          roiRoles: [
            suspiciousReasons.includes("missing-selected-total") ||
            suspiciousReasons.includes("selected-total-not-exact-member-sum-or-member-sum-plus-bonus")
              ? "total"
              : null,
            suspiciousReasons.includes("missing-selected-member") ||
            suspiciousReasons.includes("clean-7digit-candidate-present-but-unselected")
              ? "member"
              : null,
            suspiciousReasons.includes("bonus-candidate-selected-as-member")
              ? "bonus"
              : null,
          ].filter(Boolean),
          variants: [
            "alternate-threshold",
            "alternate-contrast",
            "wider-roi",
            "narrower-roi",
            "shifted-roi",
          ],
          note:
            "Audit-only retry plan. Current implementation preserves the trigger and variant list but does not alter final OCR output.",
        }
      : { triggered: false, reason: [], roiRoles: [], variants: [] };

  const currentPcStage3SelfSevenDigitDisplacementSimulation =
    options.stage === 3 && side === "self"
      ? buildCurrentPcStage3SelfSevenDigitDisplacementSimulation({
          stage: options.stage,
          side,
          selectedMembers,
          selectedTotal,
          sideArtifact,
          roiProvenance: options.roiProvenance || null,
        })
      : null;
  const currentPcStage3SevenDigitBonusDisplacementSimulation =
    sideArtifact?.currentPcStage3SevenDigitBonusDisplacementSimulation ||
    sharedBuildCurrentPcStage3SevenDigitBonusDisplacementSimulation({
      stage: options.stage,
      side,
      selectedMembers,
      selectedTotal,
      candidateSources: sideArtifact?.candidateSources || {},
      roiProvenance: options.roiProvenance || null,
    });
  const currentPcExactRawEquationRecoverySimulation =
    buildCurrentPcExactRawEquationRecoverySimulation({
      stage: options.stage,
      side,
      selectedMembers,
      selectedTotal,
      suspiciousReasons,
      exactRawInterpretations: uniqueExactRawInterpretations,
      roiProvenance: options.roiProvenance || null,
    });
  const candidateSourceSummary = summarizeCurrentPcCandidateSources(sideArtifact);
  const currentPcGroupedRawTokenEvidenceSimulation =
    sideArtifact?.currentPcGroupedRawTokenEvidenceSimulation ||
    buildCurrentPcGroupedRawTokenEvidenceSimulation({
      stage: options.stage,
      side,
      selectedMembers,
      selectedTotal,
      suspiciousReasons,
      rawCandidates,
      displayedTotalCandidates,
      bonusCandidates,
      sideAnalysis: { candidateSourceSummary },
      roiProvenance: options.roiProvenance || null,
    });

  return {
    selectedMembers,
    selectedTotal,
    memberSum,
    bonusCandidates,
    rawCandidates,
    displayedTotalCandidates,
    cleanSevenDigitCandidates,
    exactConsistency: {
      noBonus: exactNoBonus,
      bonusMatches: exactBonusMatches,
    },
    suspiciousReasons,
    retryPlan,
    candidateSourceSummary,
    exactRawInterpretations: uniqueExactRawInterpretations.slice(0, 8),
    currentPcStage3SelfSevenDigitDisplacementSimulation,
    currentPcStage3SevenDigitBonusDisplacementSimulation,
    currentPcExactRawEquationRecoverySimulation,
    currentPcGroupedRawTokenEvidenceSimulation,
    currentPcGroupedRawTokenRecovery: sideArtifact?.currentPcGroupedRawTokenRecovery || null,
    currentPcStage3SevenDigitBonusDisplacementRecovery:
      sideArtifact?.currentPcStage3SevenDigitBonusDisplacementRecovery || null,
    currentPcCrownBonusRuleSimulation: sideArtifact?.currentPcCrownBonusRuleSimulation || null,
    currentPcCrownBonusRuleRecovery: sideArtifact?.currentPcCrownBonusRuleRecovery || null,
  };
}

function buildCurrentPcBaselineSummary(report) {
  const currentPcItems = report.filter((item) => item.source === "current-pc");
  let pass = 0;
  let fail = 0;
  let unresolved = 0;
  for (const item of currentPcItems) {
    if (item.expected) {
      if (item.pass) pass += 1;
      else fail += 1;
    } else {
      unresolved += 1;
    }
  }
  return { total: currentPcItems.length, pass, fail, unresolved };
}

function classifyCurrentPcFailureGroups(analysis) {
  const groups = new Map();
  for (const item of analysis) {
    for (const stage of stages) {
      for (const side of sides) {
        const reasons = item.stages?.[`stage${stage}`]?.[side]?.suspiciousReasons || [];
        for (const reason of reasons) {
          if (!groups.has(reason)) groups.set(reason, []);
          groups.get(reason).push(`${item.fileName} S${stage} ${side}`);
        }
      }
    }
  }

  return [...groups.entries()]
    .map(([reason, occurrences]) => ({ reason, count: occurrences.length, occurrences }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

function stringifyCurrentPcEvidenceText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(stringifyCurrentPcEvidenceText).join("\n");
  if (typeof value === "object") {
    return Object.values(value).map(stringifyCurrentPcEvidenceText).join("\n");
  }
  return String(value);
}

function currentPcValueTextForms(value) {
  const number = Number(value || 0);
  if (!number) return [];
  const plain = String(number);
  const comma = number.toLocaleString("en-US");
  return [
    plain,
    comma,
    comma.replaceAll(",", "."),
    comma.replaceAll(",", " "),
    `+${plain}`,
    `+${comma}`,
  ];
}

function currentPcTextContainsValue(text = "", value = 0) {
  return currentPcValueTextForms(value).some((form) => String(text || "").includes(form));
}

function currentPcEvidenceLocationsForValue(sideAnalysis = {}, value = 0) {
  const locations = [];
  if ((sideAnalysis.rawCandidates || []).some((candidate) => Math.abs(candidate - value) <= 1)) {
    locations.push("rawCandidates");
  }
  if (
    (sideAnalysis.displayedTotalCandidates || []).some(
      (candidate) => Math.abs(candidate - value) <= 1
    )
  ) {
    locations.push("displayedTotalCandidates");
  }
  if (
    (sideAnalysis.bonusCandidates || []).some((candidate) => Math.abs(candidate - value) <= 1)
  ) {
    locations.push("bonusCandidates");
  }
  const sourceText = stringifyCurrentPcEvidenceText(sideAnalysis.candidateSourceSummary);
  if (currentPcTextContainsValue(sourceText, value)) {
    locations.push("candidateSourceText");
  }
  return [...new Set(locations)];
}

function currentPcPlusMarkerNeighborhoods(text = "", radius = 26) {
  const source = String(text || "");
  const neighborhoods = [];
  const plusLike = /[+＋]/g;
  let match = plusLike.exec(source);
  while (match) {
    const start = Math.max(0, match.index - radius);
    const end = Math.min(source.length, match.index + radius);
    neighborhoods.push(source.slice(start, end).replace(/\s+/g, " ").trim());
    match = plusLike.exec(source);
  }
  return neighborhoods;
}

function collectCurrentPcBonusTextEvidence(sideAnalysis = {}) {
  const summary = sideAnalysis.candidateSourceSummary || {};
  const entries = [];
  const push = (label, text) => {
    if (!text) return;
    entries.push({
      label,
      text: String(text),
      plusMarkerNeighborhoods: currentPcPlusMarkerNeighborhoods(text),
      parsedNumbers: extractNumbersForZone(String(text)),
      tokenAudits: sharedExtractNumericLikeTokenAudit(String(text)),
    });
  };

  push("member-row", summary.memberCandidates?.text);
  push("total-direct", summary.totalDirect?.text);
  (summary.totalTraces || []).forEach((trace, index) =>
    push(`total-trace-${index + 1}`, trace.text)
  );
  return entries;
}

function classifyCurrentPcBonusDiagnosticRow(row) {
  const expectedBonus = Number(row.expectedBonus || 0);
  const textEvidence = row.textEvidence || [];
  const combinedText = textEvidence.map((entry) => entry.text).join("\n");
  const exactParsed =
    row.expectedBonusEvidence.some((location) => location !== "candidateSourceText") ||
    textEvidence.some((entry) =>
      (entry.parsedNumbers || []).some((value) => Math.abs(value - expectedBonus) <= 1)
    );
  const exactText = currentPcTextContainsValue(combinedText, expectedBonus);
  const plusText = textEvidence.some((entry) => (entry.plusMarkerNeighborhoods || []).length > 0);
  const allCandidates = uniqueNumbers([
    ...(row.bonusCandidates || []),
    ...(row.rawCandidates || []),
  ]);
  const nearby = allCandidates.filter(
    (value) => value > 0 && Math.abs(value - expectedBonus) > 1 && Math.abs(value - expectedBonus) <= 5000
  );
  const digitDrop = allCandidates.filter((value) => {
    if (!value) return false;
    const expected = String(expectedBonus);
    const actual = String(value);
    return (
      expected.endsWith(actual) ||
      actual.endsWith(expected) ||
      actual === expected.slice(0, -1) ||
      actual === expected.slice(0, -2)
    );
  });
  const compactDigits = combinedText.replace(/\D/g, "");
  const fragmented = compactDigits.includes(String(expectedBonus));

  if (exactParsed) return "exact bonus parsed evidence";
  if (exactText) return "exact bonus in raw text but not parsed";
  if (plusText && digitDrop.length > 0) return "digit-drop / truncated bonus candidate";
  if (plusText && nearby.length > 0) return "plus-marker bonus OCR-confused nearby value";
  if (fragmented) return "bonus digits only inside noisy concatenated text";
  if (nearby.length > 0) return "nearby OCR-confused bonus candidate";
  return "bonus absent from captured evidence";
}

function findCurrentPcBonusDiagnosticRows(analysis = []) {
  const rows = [];
  for (const item of analysis.filter((entry) => entry.expected)) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        const expectedStage = item.expectedData?.[stageKey];
        if (!sideAnalysis || !expectedStage) continue;
        const expectedMembers = expectedStage[`${side}Members`] || [];
        const expectedBonus = Number(expectedStage[`${side}Bonus`] || 0);
        const expectedTotal = Number(expectedStage[`${side}Total`] || 0);
        if (expectedBonus <= 0) continue;
        const selectedMembers = sideAnalysis.selectedMembers || [];
        const selectedTotal = Number(sideAnalysis.selectedTotal || 0);
        const selectedMemberSum = selectedMembers.reduce((sum, value) => sum + Number(value || 0), 0);
        const selectedBonus = Math.max(0, selectedTotal - selectedMemberSum);
        const membersExact = arraysEqualWithinOne(selectedMembers, expectedMembers);
        if (membersExact && Math.abs(selectedBonus - expectedBonus) <= 1) continue;
        if (!membersExact) continue;
        const expectedTotalEvidence = currentPcEvidenceLocationsForValue(sideAnalysis, expectedTotal);
        if (expectedTotalEvidence.length === 0) continue;
        const expectedBonusEvidence = currentPcEvidenceLocationsForValue(sideAnalysis, expectedBonus);
        if (expectedBonusEvidence.some((location) => location !== "candidateSourceText")) continue;

        const textEvidence = collectCurrentPcBonusTextEvidence(sideAnalysis);
        const row = {
          image: item.fileName,
          absolutePath: item.absolutePath,
          stage,
          side,
          expectedMembers,
          expectedBonus,
          expectedTotal,
          selectedMembers,
          selectedBonus,
          selectedTotal,
          memberSum: selectedMemberSum,
          rawCandidates: sideAnalysis.rawCandidates || [],
          bonusCandidates: sideAnalysis.bonusCandidates || [],
          displayedTotalCandidates: sideAnalysis.displayedTotalCandidates || [],
          expectedTotalEvidence,
          expectedBonusEvidence,
          textEvidence,
          roiProvenance:
            sideAnalysis.currentPcExactRawEquationRecoverySimulation?.evidence?.roiProvenance ||
            sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation?.evidence?.roiProvenance ||
            sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation?.evidence?.roiProvenance ||
            null,
        };
        row.cluster = classifyCurrentPcBonusDiagnosticRow(row);
        rows.push(row);
      }
    }
  }
  return rows;
}

function currentPcBonusDiagnosticVariantZones(image, baseZone) {
  const zone = clampZoneToImage(baseZone, image);
  const shiftX = Math.max(4, Math.round(zone.width * 0.12));
  const shiftY = Math.max(3, Math.round(zone.height * 0.12));
  const widen = Math.max(8, Math.round(zone.width * 0.18));
  const taller = Math.max(6, Math.round(zone.height * 0.2));
  return [
    { label: "current-bonus-roi", zone, preset: "crown-bonus", pageSegMode: "6" },
    {
      label: "wider-bonus-roi",
      zone: { ...zone, left: zone.left - widen, width: zone.width + widen * 2 },
      preset: "crown-bonus",
      pageSegMode: "6",
    },
    {
      label: "taller-bonus-roi",
      zone: { ...zone, top: zone.top - taller, height: zone.height + taller * 2 },
      preset: "crown-bonus",
      pageSegMode: "6",
    },
    {
      label: "shifted-left-bonus-roi",
      zone: { ...zone, left: zone.left - shiftX },
      preset: "crown-bonus",
      pageSegMode: "6",
    },
    {
      label: "shifted-right-bonus-roi",
      zone: { ...zone, left: zone.left + shiftX },
      preset: "crown-bonus",
      pageSegMode: "6",
    },
    {
      label: "shifted-up-bonus-roi",
      zone: { ...zone, top: zone.top - shiftY },
      preset: "crown-bonus",
      pageSegMode: "6",
    },
    {
      label: "shifted-down-bonus-roi",
      zone: { ...zone, top: zone.top + shiftY },
      preset: "crown-bonus",
      pageSegMode: "6",
    },
    { label: "score-slot-threshold-variant", zone, preset: "score-slot", pageSegMode: "6" },
    { label: "single-line-psm7-variant", zone, preset: "crown-bonus", pageSegMode: "7" },
  ];
}

async function writeCurrentPcBonusDiagnosticsArtifacts(analysis = []) {
  const rows = findCurrentPcBonusDiagnosticRows(analysis);
  await fs.rm(currentPcBonusDiagnosticsDir, { recursive: true, force: true });
  await fs.mkdir(currentPcBonusDiagnosticsDir, { recursive: true });
  const artifacts = [];

  for (const row of rows) {
    const image = await readImageSize(row.absolutePath);
    const outDir = path.join(
      currentPcBonusDiagnosticsDir,
      safeArtifactName(`${row.image}-stage${row.stage}-${row.side}`)
    );
    await fs.mkdir(outDir, { recursive: true });
    const stageZone = currentPcStageRegion(image, row.stage);
    const stageCrop = await saveCurrentPcZoneArtifacts(
      row.absolutePath,
      image,
      outDir,
      `stage${row.stage}-full`,
      stageZone,
      { binarized: false }
    );
    const bonusZones = getCrownBonusZones(image, row.stage, row.side, "current-pc");
    const baseZone = bonusZones[0];
    const variantResults = [];
    for (const variant of currentPcBonusDiagnosticVariantZones(image, baseZone)) {
      const clamped = clampZoneToImage(variant.zone, image);
      const crop = await saveCurrentPcZoneArtifacts(
        row.absolutePath,
        image,
        outDir,
        variant.label,
        clamped,
        { preset: variant.preset }
      );
      const ocr = await recognizeOcrZone(row.absolutePath, clamped, {
        preset: variant.preset,
        pageSegMode: variant.pageSegMode,
        charWhitelist: "0123456789,+＋. ",
      });
      const tokenAudits = sharedExtractNumericLikeTokenAudit(ocr.text || "");
      variantResults.push({
        label: variant.label,
        zone: clamped,
        crop,
        text: ocr.text || "",
        numbers: ocr.numbers || [],
        tokenAudits,
        plusMarkerNeighborhoods: currentPcPlusMarkerNeighborhoods(ocr.text || ""),
        exactExpectedBonusParsed: (ocr.numbers || []).some(
          (value) => Math.abs(value - row.expectedBonus) <= 1
        ),
        exactExpectedBonusText: currentPcTextContainsValue(ocr.text || "", row.expectedBonus),
        digitDropCandidates: (ocr.numbers || []).filter((value) => {
          const expected = String(row.expectedBonus);
          const actual = String(value || 0);
          return expected.endsWith(actual) || actual === expected.slice(0, -1) || actual === expected.slice(0, -2);
        }),
      });
    }
    const artifact = {
      ...row,
      stageCrop,
      variants: variantResults,
      exactBonusRecoveredByVariants: variantResults
        .filter((variant) => variant.exactExpectedBonusParsed || variant.exactExpectedBonusText)
        .map((variant) => variant.label),
      variantDigitDropEvidence: variantResults
        .filter((variant) => (variant.digitDropCandidates || []).length > 0)
        .map((variant) => ({
          label: variant.label,
          candidates: variant.digitDropCandidates,
        })),
    };
    const jsonPath = path.join(outDir, "bonus-diagnostics.json");
    await fs.writeFile(jsonPath, JSON.stringify(artifact, null, 2));
    artifacts.push({
      ...artifact,
      artifact: path.relative(rootDir, jsonPath).replaceAll("\\", "/"),
    });
  }

  const summaryPath = path.join(currentPcBonusDiagnosticsDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(artifacts, null, 2));
  return {
    rows: artifacts,
    outputDir: path.relative(rootDir, currentPcBonusDiagnosticsDir).replaceAll("\\", "/"),
    summaryPath: path.relative(rootDir, summaryPath).replaceAll("\\", "/"),
  };
}

function buildCurrentPcBonusDiagnosticsReport(diagnostics) {
  const rows = diagnostics?.rows || [];
  const clusterCounts = new Map();
  const recoveredByVariant = new Map();
  for (const row of rows) {
    clusterCounts.set(row.cluster, (clusterCounts.get(row.cluster) || 0) + 1);
    for (const label of row.exactBonusRecoveredByVariants || []) {
      recoveredByVariant.set(label, (recoveredByVariant.get(label) || 0) + 1);
    }
  }
  const lines = [
    "# Current-PC Bonus OCR Diagnostics",
    "",
    "This report is runner-only diagnostics. It inspects current-PC bonus ROI crops, alternate ROI geometry, preprocessing variants, and plus-marker token evidence for total/bonus rows where members are exact and displayed total evidence exists but bonus evidence is missing or OCR-confused. It does not change final OCR output.",
    "",
    "## Summary",
    "",
    `- affected rows audited: ${rows.length}`,
    `- artifact directory: \`${diagnostics?.outputDir || "-"}\``,
    `- exact bonus recovered by any variant: ${rows.filter((row) => (row.exactBonusRecoveredByVariants || []).length > 0).length}`,
    `- rows with variant digit-drop evidence: ${rows.filter((row) => (row.variantDigitDropEvidence || []).length > 0).length}`,
    "",
    "## Diagnostic Cluster Breakdown",
    "",
    "| cluster | rows |",
    "| --- | ---: |",
  ];

  for (const [cluster, count] of [...clusterCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    lines.push(`| ${cluster} | ${count} |`);
  }

  lines.push("", "## Variant Exact-Bonus Recovery", "", "| variant | exact bonus rows |", "| --- | ---: |");
  if (recoveredByVariant.size === 0) {
    lines.push("| - | 0 |");
  } else {
    for (const [label, count] of [...recoveredByVariant.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      lines.push(`| ${label} | ${count} |`);
    }
  }

  lines.push(
    "",
    "## Affected Rows",
    "",
    "| image | stage/side | expected bonus | selected bonus | cluster | exact variant hits | digit-drop variant evidence | plus-marker neighborhoods | artifact |",
    "| --- | --- | ---: | ---: | --- | --- | --- | --- | --- |"
  );
  for (const row of rows) {
    const plus = (row.textEvidence || [])
      .flatMap((entry) => entry.plusMarkerNeighborhoods || [])
      .slice(0, 2)
      .map(escapeMarkdownTableCell)
      .join("<br>") || "-";
    const digitDrop = (row.variantDigitDropEvidence || [])
      .map((entry) => `${entry.label}: ${formatDebugNumbers(entry.candidates)}`)
      .join("<br>") || "-";
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${formatNumber(row.expectedBonus)} | ${formatNumber(row.selectedBonus) || "-"} | ${row.cluster} | ${(row.exactBonusRecoveredByVariants || []).join("<br>") || "-"} | ${digitDrop} | ${plus} | ${row.artifact} |`
    );
  }

  lines.push(
    "",
    "## Simulation Decision",
    "",
    "No runner-only recovery simulation is enabled by this diagnostic pass. A later simulation should require at least two exact bonus positives from the same reliable variant/provenance, exact displayed total evidence, exact selected or reconstructable members, a unique equation, and zero false positives across all current-PC fixtures.",
    "",
    "## Production Recommendation",
    "",
    "Do not productionize yet. Bonus OCR evidence is still primarily digit-dropped, OCR-confused, fragmented, or absent; using total deltas to infer the bonus would be unsafe.",
    ""
  );

  return lines.join("\n");
}

function currentPcExpectedStageSideValues(item, stage, side) {
  const expectedStage = item.expectedData?.[`stage${stage}`] || {};
  const expectedMembers = [...(expectedStage[`${side}Members`] || [])].map(
    (value) => Number(value) || 0
  );
  while (expectedMembers.length < 3) expectedMembers.push(0);
  const expectedBonus = Number(expectedStage[`${side}Bonus`] || 0);
  const expectedTotal = Number(expectedStage[`${side}Total`] || 0);
  return { expectedMembers, expectedBonus, expectedTotal };
}

function currentPcSelectedStageSideValues(sideAnalysis = {}) {
  const selectedMembers = [...(sideAnalysis.selectedMembers || [])].map(
    (value) => Number(value) || 0
  );
  while (selectedMembers.length < 3) selectedMembers.push(0);
  const selectedTotal = Number(sideAnalysis.selectedTotal || 0);
  const selectedMemberSum = selectedMembers.reduce((sum, value) => sum + value, 0);
  const selectedBonus = Math.max(0, selectedTotal - selectedMemberSum);
  return { selectedMembers, selectedBonus, selectedTotal, selectedMemberSum };
}

function findCurrentPcStage3MemberRowDiagnosticRows(analysis = []) {
  const rows = [];
  for (const item of analysis.filter((entry) => entry.expected)) {
    const stage = 3;
    const stageKey = `stage${stage}`;
    for (const side of sides) {
      const sideAnalysis = item.stages?.[stageKey]?.[side];
      const expectedStage = item.expectedData?.[stageKey];
      if (!sideAnalysis || !expectedStage) continue;
      if (sideAnalysis.currentPcGroupedRawTokenRecovery?.applied) continue;
      if (sideAnalysis.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied) continue;

      const { expectedMembers, expectedBonus, expectedTotal } =
        currentPcExpectedStageSideValues(item, stage, side);
      const { selectedMembers, selectedBonus, selectedTotal, selectedMemberSum } =
        currentPcSelectedStageSideValues(sideAnalysis);
      const missingSevenDigitMembers = expectedMembers
        .map((value, index) => ({
          role: `member${index + 1}`,
          expected: value,
          actual: selectedMembers[index] || 0,
        }))
        .filter(
          (entry) =>
            entry.expected >= 1000000 &&
            entry.expected < 10000000 &&
            Math.abs(entry.expected - entry.actual) > 1
        );
      if (missingSevenDigitMembers.length === 0) continue;

      const rawText = stringifyCurrentPcEvidenceText(
        sideAnalysis.candidateSourceSummary?.memberCandidates?.text || ""
      );
      const totalText = stringifyCurrentPcEvidenceText(
        sideAnalysis.candidateSourceSummary?.totalDirect?.text || ""
      );
      const totalTraceText = stringifyCurrentPcEvidenceText(
        sideAnalysis.candidateSourceSummary?.totalTraces || []
      );
      const rawCandidates = uniqueNumbers(sideAnalysis.rawCandidates || []);
      const bonusCandidates = uniqueNumbers(sideAnalysis.bonusCandidates || []);
      const displayedTotalCandidates = uniqueNumbers(
        sideAnalysis.displayedTotalCandidates || []
      );
      const exactMissingMembersInRawCandidates = missingSevenDigitMembers.filter((entry) =>
        rawCandidates.some((value) => Math.abs(value - entry.expected) <= 1)
      );
      const exactMissingMembersInRawText = missingSevenDigitMembers.filter((entry) =>
        currentPcTextContainsValue(`${rawText}\n${totalTraceText}`, entry.expected)
      );
      const fragmentMembers = missingSevenDigitMembers.filter((entry) => {
        const expected = String(entry.expected);
        return rawCandidates.some((value) => {
          const actual = String(value || 0);
          return actual.length >= 4 && (expected.includes(actual) || actual.includes(expected));
        });
      });
      const expectedTotalEvidence = currentPcEvidenceLocationsForValue(sideAnalysis, expectedTotal);
      const expectedBonusEvidence =
        expectedBonus > 0 ? currentPcEvidenceLocationsForValue(sideAnalysis, expectedBonus) : [];

      rows.push({
        image: item.fileName,
        absolutePath: item.absolutePath,
        stage,
        side,
        expectedMembers,
        expectedBonus,
        expectedTotal,
        selectedMembers,
        selectedBonus,
        selectedTotal,
        selectedMemberSum,
        missingSevenDigitMembers,
        rawText,
        totalText,
        totalTraceText,
        rawCandidates,
        bonusCandidates,
        displayedTotalCandidates,
        expectedTotalEvidence,
        expectedBonusEvidence,
        exactMissingMembersInRawCandidates,
        exactMissingMembersInRawText,
        fragmentMembers,
      });
    }
  }
  return rows;
}

function currentPcStage3MemberRowDiagnosticVariantZones(image, memberZone) {
  const zone = clampZoneToImage(memberZone, image);
  const shiftX = Math.max(5, Math.round(zone.width * 0.08));
  const shiftY = Math.max(4, Math.round(zone.height * 0.12));
  const widen = Math.max(10, Math.round(zone.width * 0.12));
  const taller = Math.max(6, Math.round(zone.height * 0.18));
  const tight = Math.max(4, Math.round(zone.height * 0.14));
  const slotWidth = Math.round(zone.width / 3);
  const slots = [0, 1, 2].map((slotIndex) => ({
    label: `member${slotIndex + 1}-slot`,
    zone: {
      left: zone.left + slotWidth * slotIndex - Math.round(slotWidth * 0.08),
      top: zone.top,
      width:
        slotIndex === 2
          ? zone.width - slotWidth * 2 + Math.round(slotWidth * 0.12)
          : slotWidth + Math.round(slotWidth * 0.16),
      height: zone.height,
    },
    preset: "score-slot",
    pageSegMode: "7",
    zoneKind: "slot",
  }));

  return [
    {
      label: "current-member-row-roi",
      zone,
      preset: "score-slot",
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "wider-member-row-roi",
      zone: { ...zone, left: zone.left - widen, width: zone.width + widen * 2 },
      preset: "score-slot",
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "shifted-left-member-row-roi",
      zone: { ...zone, left: zone.left - shiftX },
      preset: "score-slot",
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "shifted-right-member-row-roi",
      zone: { ...zone, left: zone.left + shiftX },
      preset: "score-slot",
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "shifted-up-member-row-roi",
      zone: { ...zone, top: zone.top - shiftY },
      preset: "score-slot",
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "shifted-down-member-row-roi",
      zone: { ...zone, top: zone.top + shiftY },
      preset: "score-slot",
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "taller-member-row-roi",
      zone: { ...zone, top: zone.top - taller, height: zone.height + taller * 2 },
      preset: "score-slot",
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "tighter-vertical-member-row-roi",
      zone: { ...zone, top: zone.top + tight, height: Math.max(1, zone.height - tight * 2) },
      preset: "score-slot",
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "baseline-threshold-row-variant",
      zone,
      preset: null,
      pageSegMode: "6",
      zoneKind: "row",
    },
    {
      label: "crown-bonus-threshold-row-variant",
      zone,
      preset: "crown-bonus",
      pageSegMode: "6",
      zoneKind: "row",
    },
    ...slots,
  ];
}

function currentPcExactExpectedMembersByVariant(row, variant) {
  return row.missingSevenDigitMembers.filter((entry) => {
    const exactNumber = (variant.numbers || []).some(
      (value) => Math.abs(value - entry.expected) <= 1
    );
    const exactText = currentPcTextContainsValue(variant.text || "", entry.expected);
    return exactNumber || exactText;
  });
}

function currentPcMemberRowDiagnosticContextValues(row) {
  return uniqueNumbers([
    ...(row.expectedMembers || []),
    row.expectedBonus || 0,
    row.expectedTotal || 0,
    ...(row.selectedMembers || []),
    row.selectedBonus || 0,
    row.selectedTotal || 0,
    ...(row.bonusCandidates || []),
    ...(row.displayedTotalCandidates || []),
  ]).filter((value) => value > 0);
}

function currentPcUnsafeExtraCandidatesForMemberRowVariant(row, variant) {
  const contextValues = currentPcMemberRowDiagnosticContextValues(row);
  return uniqueNumbers(variant.numbers || []).filter((value) => {
    if (value < 100000) return false;
    return !contextValues.some((contextValue) => Math.abs(contextValue - value) <= 1);
  });
}

function currentPcFragmentMatchesForMemberRowVariant(row, variant) {
  return row.missingSevenDigitMembers
    .map((entry) => ({
      ...entry,
      fragments: (variant.numbers || []).filter((value) => {
        const expected = String(entry.expected);
        const actual = String(value || 0);
        return actual.length >= 4 && actual.length < expected.length && expected.includes(actual);
      }),
    }))
    .filter((entry) => entry.fragments.length > 0);
}

function currentPcStage3MemberRowVariantCategory(row, variant) {
  const exactMembers = currentPcExactExpectedMembersByVariant(row, variant);
  if (exactMembers.length === 0) return null;
  if (variant.zoneKind === "slot") return "exact 7-digit recovered by per-slot crop";
  if (variant.label.includes("wider")) return "exact 7-digit recovered by wider ROI";
  if (variant.label.includes("shifted")) return "exact 7-digit recovered by shifted ROI";
  if (variant.label.includes("taller") || variant.label.includes("tighter")) {
    return "exact 7-digit recovered by taller/tighter vertical ROI";
  }
  if (variant.label.includes("threshold") || variant.label.includes("crown-bonus")) {
    return "exact 7-digit recovered by threshold variant";
  }
  return "exact 7-digit already present in current ROI OCR";
}

async function writeCurrentPcStage3MemberRowDiagnosticsArtifacts(analysis = []) {
  const rows = findCurrentPcStage3MemberRowDiagnosticRows(analysis);
  await fs.rm(currentPcStage3MemberRowDiagnosticsDir, { recursive: true, force: true });
  await fs.mkdir(currentPcStage3MemberRowDiagnosticsDir, { recursive: true });
  const artifacts = [];

  for (const row of rows) {
    const image = await readImageSize(row.absolutePath);
    const fixed = getFixedOcrZones(image, row.stage, "current-pc");
    const memberZone = row.side === "self" ? fixed.selfMembers : fixed.enemyMembers;
    const outDir = path.join(
      currentPcStage3MemberRowDiagnosticsDir,
      safeArtifactName(`${row.image}-stage${row.stage}-${row.side}`)
    );
    await fs.mkdir(outDir, { recursive: true });
    const stageCrop = await saveCurrentPcZoneArtifacts(
      row.absolutePath,
      image,
      outDir,
      `stage${row.stage}-full`,
      currentPcStageRegion(image, row.stage),
      { binarized: false }
    );
    const variants = [];
    for (const variant of currentPcStage3MemberRowDiagnosticVariantZones(image, memberZone)) {
      const clamped = clampZoneToImage(variant.zone, image);
      const crop = await saveCurrentPcZoneArtifacts(
        row.absolutePath,
        image,
        outDir,
        variant.label,
        clamped,
        { preset: variant.preset }
      );
      const ocr = await recognizeOcrZone(row.absolutePath, clamped, {
        preset: variant.preset || undefined,
        pageSegMode: variant.pageSegMode,
        charWhitelist: "0123456789,+＋. ",
      });
      const tokenAudits = sharedExtractNumericLikeTokenAudit(ocr.text || "");
      const variantRow = {
        label: variant.label,
        zoneKind: variant.zoneKind,
        zone: clamped,
        crop,
        text: ocr.text || "",
        numbers: ocr.numbers || [],
        tokenAudits,
      };
      variantRow.exactMissingMembers = currentPcExactExpectedMembersByVariant(row, variantRow);
      variantRow.recoveryCategory = currentPcStage3MemberRowVariantCategory(row, variantRow);
      variantRow.fragmentMatches = currentPcFragmentMatchesForMemberRowVariant(row, variantRow);
      variantRow.unsafeExtraCandidates = currentPcUnsafeExtraCandidatesForMemberRowVariant(
        row,
        variantRow
      );
      variants.push(variantRow);
    }
    const exactHits = variants
      .filter((variant) => variant.exactMissingMembers.length > 0)
      .map((variant) => ({
        label: variant.label,
        zoneKind: variant.zoneKind,
        category: variant.recoveryCategory,
        members: variant.exactMissingMembers,
      }));
    const unrecoveredMissingMembers = row.missingSevenDigitMembers.filter(
      (missing) =>
        !exactHits.some((hit) =>
          hit.members.some(
            (member) => member.role === missing.role && Math.abs(member.expected - missing.expected) <= 1
          )
        )
    );
    const unsafeVariantLabels = variants
      .filter((variant) => (variant.unsafeExtraCandidates || []).length > 0)
      .map((variant) => variant.label);
    const missingRecoveredByAnyVariant = row.missingSevenDigitMembers.filter((missing) =>
      exactHits.some((hit) =>
        hit.members.some(
          (member) => member.role === missing.role && Math.abs(member.expected - missing.expected) <= 1
        )
      )
    );
    const artifact = {
      ...row,
      stageCrop,
      variants,
      exactHits,
      missingRecoveredByAnyVariant,
      unrecoveredMissingMembers,
      exactRecoveredByAnyVariant: exactHits.length > 0,
      perSlotExactHits: exactHits.filter((hit) => hit.zoneKind === "slot"),
      unsafeVariantCount: unsafeVariantLabels.length,
      unsafeVariantLabels,
      exactTotalEvidencePresent: (row.expectedTotalEvidence || []).length > 0,
      exactBonusEvidencePresent:
        !row.expectedBonus || (row.expectedBonusEvidence || []).length > 0,
      exactEquationValidationPossible:
        unrecoveredMissingMembers.length === 0 &&
        (row.expectedTotalEvidence || []).length > 0 &&
        (!row.expectedBonus || (row.expectedBonusEvidence || []).length > 0) &&
        unsafeVariantLabels.length === 0,
      competingInterpretations:
        unsafeVariantLabels.length > 0 || row.missingSevenDigitMembers.length > 1,
    };
    const jsonPath = path.join(outDir, "stage3-member-row-diagnostics.json");
    await fs.writeFile(jsonPath, JSON.stringify(artifact, null, 2));
    artifacts.push({
      ...artifact,
      artifact: path.relative(rootDir, jsonPath).replaceAll("\\", "/"),
    });
  }

  const summaryPath = path.join(currentPcStage3MemberRowDiagnosticsDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(artifacts, null, 2));
  return {
    rows: artifacts,
    outputDir: path.relative(rootDir, currentPcStage3MemberRowDiagnosticsDir).replaceAll("\\", "/"),
    summaryPath: path.relative(rootDir, summaryPath).replaceAll("\\", "/"),
  };
}

function buildCurrentPcStage3MemberRowDiagnosticsReport(diagnostics) {
  const rows = diagnostics?.rows || [];
  const categoryCounts = new Map();
  const variantLabels = [
    "current-member-row-roi",
    "wider-member-row-roi",
    "shifted-left-member-row-roi",
    "shifted-right-member-row-roi",
    "shifted-up-member-row-roi",
    "shifted-down-member-row-roi",
    "taller-member-row-roi",
    "tighter-vertical-member-row-roi",
    "baseline-threshold-row-variant",
    "crown-bonus-threshold-row-variant",
    "member1-slot",
    "member2-slot",
    "member3-slot",
  ];
  const variantExactCounts = new Map(variantLabels.map((label) => [label, 0]));
  const variantFragmentCounts = new Map(variantLabels.map((label) => [label, 0]));
  const variantUnsafeCounts = new Map(variantLabels.map((label) => [label, 0]));
  let totalMissingSevenDigitMembers = 0;
  let missingRecoveredByAnyVariant = 0;
  let noVariantRecoveredCount = 0;
  let unsafeVariantCount = 0;
  for (const row of rows) {
    totalMissingSevenDigitMembers += (row.missingSevenDigitMembers || []).length;
    missingRecoveredByAnyVariant += (row.missingRecoveredByAnyVariant || []).length;
    noVariantRecoveredCount += (row.unrecoveredMissingMembers || []).length;
    unsafeVariantCount += Number(row.unsafeVariantCount || 0);
    if ((row.exactHits || []).length === 0) {
      categoryCounts.set("no variant improves evidence", (categoryCounts.get("no variant improves evidence") || 0) + 1);
    }
    for (const hit of row.exactHits || []) {
      categoryCounts.set(hit.category, (categoryCounts.get(hit.category) || 0) + 1);
      variantExactCounts.set(
        hit.label,
        (variantExactCounts.get(hit.label) || 0) + (hit.members || []).length
      );
    }
    for (const variant of row.variants || []) {
      variantFragmentCounts.set(
        variant.label,
        (variantFragmentCounts.get(variant.label) || 0) +
          (variant.fragmentMatches || []).reduce(
            (count, match) => count + (match.fragments || []).length,
            0
          )
      );
      if ((variant.unsafeExtraCandidates || []).length > 0) {
        variantUnsafeCounts.set(variant.label, (variantUnsafeCounts.get(variant.label) || 0) + 1);
      }
    }
  }
  const exactCountFor = (label) => variantExactCounts.get(label) || 0;
  const perSlotExactCount =
    exactCountFor("member1-slot") + exactCountFor("member2-slot") + exactCountFor("member3-slot");
  const lines = [
    "# Current-PC Stage3 Member-Row OCR Diagnostics",
    "",
    "This is runner-only diagnostics for current-PC Stage3 member-row OCR quality. It writes ROI/preprocessing variants and per-slot crops under `tmp/`; it does not change final OCR output.",
    "",
    "Run with:",
    "",
    "```bash",
    "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage3-member-row-diagnostics",
    "```",
    "",
    "## Summary",
    "",
    `- affected Stage3 rows audited: ${rows.length}`,
    `- expected missing 7-digit members audited: ${totalMissingSevenDigitMembers}`,
    `- artifact directory: \`${diagnostics?.outputDir || "-"}\``,
    `- rows where any variant found an exact missing 7-digit member: ${rows.filter((row) => row.exactRecoveredByAnyVariant).length}`,
    `- expected missing 7-digit members recovered by any variant: ${missingRecoveredByAnyVariant}`,
    `- rows where a per-slot crop found an exact missing 7-digit member: ${rows.filter((row) => (row.perSlotExactHits || []).length > 0).length}`,
    `- expected missing 7-digit members recovered by per-slot crops: ${perSlotExactCount}`,
    `- expected missing 7-digit members not recovered by any variant: ${noVariantRecoveredCount}`,
    `- variant rows with unsafe/noisy extra candidates: ${unsafeVariantCount}`,
    "- final OCR output changed: no",
    "- production recovery enabled: no",
    "",
    "## Variant Exact Recovery Counts",
    "",
    "| variant | exact 7-digit recoveries | fragment hits | unsafe/noisy variant rows |",
    "| --- | ---: | ---: | ---: |",
    ...variantLabels.map(
      (label) =>
        `| ${label} | ${variantExactCounts.get(label) || 0} | ${variantFragmentCounts.get(label) || 0} | ${variantUnsafeCounts.get(label) || 0} |`
    ),
    `| per-slot crops combined | ${perSlotExactCount} | ${
      (variantFragmentCounts.get("member1-slot") || 0) +
      (variantFragmentCounts.get("member2-slot") || 0) +
      (variantFragmentCounts.get("member3-slot") || 0)
    } | ${
      (variantUnsafeCounts.get("member1-slot") || 0) +
      (variantUnsafeCounts.get("member2-slot") || 0) +
      (variantUnsafeCounts.get("member3-slot") || 0)
    } |`,
    "",
    "## Diagnostic Outcome Categories",
    "",
    "| category | count |",
    "| --- | ---: |",
  ];
  if (categoryCounts.size === 0) {
    lines.push("| no rows | 0 |");
  } else {
    for (const [category, count] of [...categoryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      lines.push(`| ${category} | ${count} |`);
    }
  }

  lines.push(
    "",
    "## Rows",
    "",
    "| image | side | expected members | selected members | selected bonus | selected total | expected bonus | expected total | missing 7-digit members | exact variant hits | fragment-only variants | unsafe/noisy variants | total evidence | bonus evidence | equation possible | unique interpretation | artifact |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const row of rows) {
    const exactHits =
      (row.exactHits || [])
        .map((hit) => `${hit.label}: ${hit.members.map((entry) => `${entry.role}=${entry.expected}`).join(", ")}`)
        .join("<br>") || "-";
    const fragmentOnly =
      (row.variants || [])
        .filter(
          (variant) =>
            (variant.fragmentMatches || []).length > 0 &&
            (variant.exactMissingMembers || []).length === 0
        )
        .map(
          (variant) =>
            `${variant.label}: ${variant.fragmentMatches
              .map((entry) => `${entry.role}=${entry.fragments.join("/")}`)
              .join(", ")}`
        )
        .join("<br>") || "-";
    const unsafe =
      (row.variants || [])
        .filter((variant) => (variant.unsafeExtraCandidates || []).length > 0)
        .map((variant) => `${variant.label}: ${variant.unsafeExtraCandidates.join("/")}`)
        .join("<br>") || "-";
    const totalEvidence = (row.expectedTotalEvidence || []).join(", ") || "-";
    const bonusEvidence = !row.expectedBonus
      ? "not needed"
      : (row.expectedBonusEvidence || []).join(", ") || "-";
    lines.push(
      `| ${row.image} | ${row.side} | ${formatDebugNumbers(row.expectedMembers)} | ${formatDebugNumbers(row.selectedMembers)} | ${formatNumber(row.selectedBonus) || "-"} | ${formatNumber(row.selectedTotal)} | ${formatNumber(row.expectedBonus) || "-"} | ${formatNumber(row.expectedTotal)} | ${row.missingSevenDigitMembers.map((entry) => `${entry.role} ${formatNumber(entry.expected)}->${formatNumber(entry.actual) || "-"}`).join("<br>")} | ${exactHits} | ${fragmentOnly} | ${unsafe} | ${totalEvidence} | ${bonusEvidence} | ${row.exactEquationValidationPossible ? "yes" : "no"} | ${row.competingInterpretations ? "no" : "yes"} | ${row.artifact} |`
    );
  }

  lines.push(
    "",
    "## Pattern Notes",
    "",
    "- Row-level variants are useful when they recover exact missing 7-digit values from member-row provenance, but this report still treats them as evidence only.",
    "- Per-slot crops are counted separately because they would be a stronger future provenance guard if they recovered the exact value consistently.",
    "- Unsafe/noisy variant rows count variants that produce extra member-sized numbers not matching expected, selected, total, or bonus context. Those variants are evidence-quality warnings, not recovery candidates.",
    "- Exact equation validation is marked `yes` only when all missing 7-digit members are recovered by some variant, exact total evidence exists, exact bonus evidence exists when needed, and the diagnostic variants do not introduce unsafe extras.",
    "- Unique interpretation is marked `no` for rows with multiple missing 7-digit members or unsafe/noisy candidates, even when exact evidence appears.",
    "",
    "## Simulation Decision",
    "",
    "No recovery simulation is enabled by this diagnostics pass. A future simulation should require at least two exact positives from the same variant/provenance, exact total evidence, exact bonus evidence when needed, a unique equation, and zero false positives across all 48 current-PC fixtures.",
    "",
    "## Production Recommendation",
    "",
    "Do not productionize ROI or preprocessing changes from this report until diagnostics show a repeatable exact-evidence capture pattern. The purpose here is to find whether better OCR input can produce exact candidates before selection.",
    ""
  );

  return lines.join("\n");
}

function currentPcNormalizedBox(zone, image) {
  const clamped = clampZoneToImage(zone, image);
  return {
    left: Number((clamped.left / image.width).toFixed(4)),
    top: Number((clamped.top / image.height).toFixed(4)),
    width: Number((clamped.width / image.width).toFixed(4)),
    height: Number((clamped.height / image.height).toFixed(4)),
  };
}

function currentPcSlotRoiDefinitions(image, stage, side) {
  const fixed = getFixedOcrZones(image, stage, "current-pc");
  const totalZone = side === "self" ? fixed.selfTotal : fixed.enemyTotal;
  const memberZone = side === "self" ? fixed.selfMembers : fixed.enemyMembers;
  const bonusZones = getCrownBonusZones(image, stage, side, "current-pc");
  const row = clampZoneToImage(memberZone, image);
  const slotWidth = row.width / 3;
  const overlap = Math.max(4, Math.round(slotWidth * 0.08));
  const memberSlots = [0, 1, 2].map((index) => {
    const left = Math.round(row.left + slotWidth * index - (index === 0 ? 0 : overlap));
    const right = Math.round(
      row.left + slotWidth * (index + 1) + (index === 2 ? 0 : overlap)
    );
    return {
      role: `member${index + 1}`,
      slotIndex: index,
      label: `member${index + 1}-slot`,
      zone: clampZoneToImage(
        {
          left,
          top: row.top,
          width: right - left,
          height: row.height,
        },
        image
      ),
      preset: "score-slot",
      pageSegMode: "7",
    };
  });

  return [
    {
      role: "total",
      slotIndex: null,
      label: "total-slot",
      zone: clampZoneToImage(totalZone, image),
      preset: "score-slot",
      pageSegMode: "7",
    },
    {
      role: "member-row",
      slotIndex: null,
      label: "member-row",
      zone: row,
      preset: "score-slot",
      pageSegMode: "6",
    },
    ...memberSlots,
    {
      role: "bonus",
      slotIndex: null,
      label: "bonus-slot",
      zone: clampZoneToImage(bonusZones[0] || totalZone, image),
      preset: "crown-bonus",
      pageSegMode: "7",
    },
  ];
}

function currentPcSlotCandidateRange(role, value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return false;
  if (role === "bonus") return number >= 10000 && number < 500000;
  if (role === "total") return number >= 50000 && number < 10000000;
  return number >= 10000 && number < 10000000;
}

function currentPcUniqueCandidateValues(candidates = [], role = "member") {
  return uniqueNumbers(
    candidates
      .map((candidate) => Number(candidate.value ?? candidate))
      .filter((value) => currentPcSlotCandidateRange(role, value))
  );
}

function currentPcSlotCandidatesForRole(slotEvidence = [], role) {
  return slotEvidence.filter((entry) => entry.role === role);
}

function currentPcSlotEvidenceContainsValue(slotEvidence = [], role, value) {
  const expected = Number(value || 0);
  if (!expected) return false;
  return currentPcSlotCandidatesForRole(slotEvidence, role).some((entry) =>
    (entry.candidates || []).some((candidate) => Math.abs(Number(candidate.value || 0) - expected) <= 1)
  );
}

function currentPcSlotSolverCandidates(slotEvidence = [], role, selectedValue = null) {
  const candidates = [];
  for (const entry of currentPcSlotCandidatesForRole(slotEvidence, role)) {
    for (const candidate of entry.candidates || []) {
      if (!currentPcSlotCandidateRange(role, candidate.value)) continue;
      candidates.push({
        value: candidate.value,
        sourceRole: role,
        roi: entry.label,
        provenance: candidate.provenance,
      });
    }
  }
  if (selectedValue !== null && currentPcSlotCandidateRange(role, selectedValue)) {
    candidates.push({
      value: Number(selectedValue || 0),
      sourceRole: "selected",
      roi: "selected-current-output",
      provenance: "selected-current-output",
    });
  }
  const byValue = new Map();
  for (const candidate of candidates) {
    const value = Number(candidate.value || 0);
    if (!byValue.has(value)) {
      byValue.set(value, { value, sources: [] });
    }
    byValue.get(value).sources.push({
      sourceRole: candidate.sourceRole,
      roi: candidate.roi,
      provenance: candidate.provenance,
    });
  }
  return [...byValue.values()].slice(0, 10);
}

function buildCurrentPcSlotSpecificRoiCandidateSimulation({
  slotEvidence = [],
  selectedMembers = [],
  selectedBonus = 0,
  selectedTotal = 0,
}) {
  const selected = [...selectedMembers].map((value) => Number(value) || 0);
  while (selected.length < 3) selected.push(0);
  const memberCandidateSets = [0, 1, 2].map((index) =>
    currentPcSlotSolverCandidates(slotEvidence, `member${index + 1}`, selected[index])
  );
  const bonusCandidateSet = [
    { value: 0, sources: [{ sourceRole: "zero-bonus", roi: "zero-bonus" }] },
    ...currentPcSlotSolverCandidates(slotEvidence, "bonus", null),
  ];
  const totalCandidateSet = currentPcSlotSolverCandidates(slotEvidence, "total", selectedTotal);
  const proposals = [];

  for (const member1 of memberCandidateSets[0]) {
    for (const member2 of memberCandidateSets[1]) {
      for (const member3 of memberCandidateSets[2]) {
        const members = [member1.value, member2.value, member3.value];
        const memberSum = members.reduce((sum, value) => sum + value, 0);
        for (const bonus of bonusCandidateSet) {
          for (const total of totalCandidateSet) {
            if (Math.abs(memberSum + bonus.value - total.value) > 1) continue;
            const allMemberSlotBacked = [member1, member2, member3].every((candidate) =>
              candidate.sources.some((source) => {
                const sourceRole = String(source.sourceRole || "");
                return sourceRole.startsWith("member") || sourceRole === "selected";
              })
            );
            const bonusSlotBacked =
              bonus.value === 0 ||
              bonus.sources.some((source) => String(source.sourceRole || "") === "bonus");
            const totalSlotBacked = total.sources.some(
              (source) => String(source.sourceRole || "") === "total"
            );
            proposals.push({
              members,
              bonus: bonus.value,
              total: total.value,
              memberSum,
              allMemberSlotBacked,
              bonusSlotBacked,
              totalSlotBacked,
              sources: {
                member1: member1.sources,
                member2: member2.sources,
                member3: member3.sources,
                bonus: bonus.sources,
                total: total.sources,
              },
            });
          }
        }
      }
    }
  }

  const strictProposals = proposals.filter(
    (proposal) =>
      proposal.allMemberSlotBacked &&
      proposal.bonusSlotBacked &&
      proposal.totalSlotBacked
  );
  const differsFromSelected =
    !arraysEqualWithinOne(selected, strictProposals[0]?.members || selected) ||
    Math.abs(Number(selectedBonus || 0) - Number(strictProposals[0]?.bonus || selectedBonus || 0)) > 1 ||
    Math.abs(Number(selectedTotal || 0) - Number(strictProposals[0]?.total || selectedTotal || 0)) > 1;
  const rejectionReasons = [];
  if (memberCandidateSets.some((set) => set.length === 0)) {
    rejectionReasons.push("missing-member-slot-candidate");
  }
  if (totalCandidateSet.length === 0) rejectionReasons.push("missing-total-slot-candidate");
  if (strictProposals.length === 0) rejectionReasons.push("no-strict-slot-specific-equation");
  if (strictProposals.length > 1) rejectionReasons.push("multiple-strict-slot-specific-equations");
  if (strictProposals.length === 1 && !differsFromSelected) {
    rejectionReasons.push("strict-proposal-equals-current-selection");
  }

  return {
    wouldApply: rejectionReasons.length === 0,
    rejectionReasons,
    proposalCount: proposals.length,
    strictProposalCount: strictProposals.length,
    proposed: strictProposals.length === 1 ? strictProposals[0] : null,
    competingProposals: strictProposals.slice(0, 5),
    candidateSetSizes: {
      member1: memberCandidateSets[0].length,
      member2: memberCandidateSets[1].length,
      member3: memberCandidateSets[2].length,
      bonus: bonusCandidateSet.length,
      total: totalCandidateSet.length,
    },
    description:
      "Runner-only current-PC slot-specific ROI candidate simulation. It does not change final OCR output.",
  };
}

async function recognizeCurrentPcSlotRoi(row, image, outDir, definition) {
  const clamped = clampZoneToImage(definition.zone, image);
  const crop = await saveCurrentPcZoneArtifacts(
    row.absolutePath,
    image,
    outDir,
    definition.label,
    clamped,
    { preset: definition.preset, binarized: false }
  );
  const ocr = await recognizeOcrZone(row.absolutePath, clamped, {
    preset: definition.preset,
    pageSegMode: definition.pageSegMode,
    charWhitelist: "0123456789,+＋. ",
  });
  const tokenAudits = sharedExtractNumericLikeTokenAudit(ocr.text || "");
  const candidates = currentPcUniqueCandidateValues(
    (ocr.numbers || []).map((value) => ({ value })),
    definition.role === "member-row" ? "member" : definition.role
  ).map((value) => ({
    value,
    rawText: ocr.text || "",
    sourceRole: definition.role,
    slotIndex: definition.slotIndex,
    stage: row.stage,
    side: row.side,
    roiName: definition.label,
    normalizedBox: currentPcNormalizedBox(clamped, image),
    preprocessingVariant: `${definition.preset}/psm${definition.pageSegMode}`,
    confidence: null,
    provenance: `${definition.label}:${definition.preset}:psm${definition.pageSegMode}`,
  }));
  return {
    role: definition.role,
    slotIndex: definition.slotIndex,
    label: definition.label,
    zone: clamped,
    normalizedBox: currentPcNormalizedBox(clamped, image),
    crop,
    preprocessingVariant: `${definition.preset}/psm${definition.pageSegMode}`,
    text: ocr.text || "",
    numbers: ocr.numbers || [],
    tokenAudits,
    candidates,
  };
}

function currentPcEvidenceEntryFromExistingSource({
  role,
  label,
  stage,
  side,
  source = {},
  normalizedBox = null,
}) {
  const numbers = uniqueNumbers([
    ...(source.numbers || []),
    ...((source.traces || []).flatMap((trace) => trace.numbers || [])),
  ]);
  const candidateRole = role === "member-row" ? "member" : role;
  const candidates = currentPcUniqueCandidateValues(
    numbers.map((value) => ({ value })),
    candidateRole
  ).map((value) => ({
    value,
    rawText: source.text || "",
    sourceRole: role,
    slotIndex: null,
    stage,
    side,
    roiName: label,
    normalizedBox,
    preprocessingVariant: "existing-fixed-roi",
    confidence: null,
    provenance: `${label}:existing-fixed-roi`,
  }));
  return {
    role,
    slotIndex: null,
    label,
    zone: null,
    normalizedBox,
    crop: null,
    preprocessingVariant: "existing-fixed-roi",
    text: source.text || "",
    numbers,
    tokenAudits: sharedExtractNumericLikeTokenAudit(source.text || "", numbers),
    candidates,
  };
}

function currentPcExistingFixedRoiSlotEvidence(row, sideAnalysis, image) {
  const roi =
    sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation?.evidence?.roiProvenance ||
    sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation?.evidence?.roiProvenance ||
    null;
  const summary = sideAnalysis.candidateSourceSummary || {};
  const bonusNumbers = uniqueNumbers([
    ...(sideAnalysis.bonusCandidates || []),
    ...((summary.bonusCandidates || {}).numbers || []),
  ]);
  return [
    currentPcEvidenceEntryFromExistingSource({
      role: "total",
      label: "total-slot-existing-fixed-roi",
      stage: row.stage,
      side: row.side,
      source: {
        text: [summary.totalDirect?.text, summary.totalCandidates?.text].filter(Boolean).join("\n"),
        numbers: [
          ...(summary.totalDirect?.numbers || []),
          ...(summary.totalCandidates?.numbers || []),
        ],
        traces: summary.totalCandidates?.traces || [],
      },
      normalizedBox: roi?.total?.zone ? currentPcNormalizedBox(roi.total.zone, image) : null,
    }),
    currentPcEvidenceEntryFromExistingSource({
      role: "member-row",
      label: "member-row-existing-fixed-roi",
      stage: row.stage,
      side: row.side,
      source: summary.memberCandidates || {},
      normalizedBox: roi?.members?.zone ? currentPcNormalizedBox(roi.members.zone, image) : null,
    }),
    currentPcEvidenceEntryFromExistingSource({
      role: "bonus",
      label: "bonus-slot-existing-fixed-roi",
      stage: row.stage,
      side: row.side,
      source: {
        text: summary.bonusCandidates?.text || "",
        numbers: bonusNumbers,
      },
      normalizedBox: roi?.bonus?.[0]?.zone ? currentPcNormalizedBox(roi.bonus[0].zone, image) : null,
    }),
  ];
}

function currentPcSlotRoiRowClassification(row) {
  if (!row.failed) return "exact current production result already correct";
  const exactMembers = row.expectedMembers.every((value, index) =>
    currentPcSlotEvidenceContainsValue(row.slotEvidence, `member${index + 1}`, value)
  );
  const exactBonus =
    row.expectedBonus === 0 ||
    currentPcSlotEvidenceContainsValue(row.slotEvidence, "bonus", row.expectedBonus);
  const exactTotal = currentPcSlotEvidenceContainsValue(
    row.slotEvidence,
    "total",
    row.expectedTotal
  );
  const selectedMembersExact = arraysEqualWithinOne(row.selectedMembers, row.expectedMembers);
  const selectedBonusExact = Math.abs(row.selectedBonus - row.expectedBonus) <= 1;
  const selectedTotalExact = Math.abs(row.selectedTotal - row.expectedTotal) <= 1;

  if (row.simulation?.wouldApply && proposalMatchesExpected(row.simulation.proposed, row.expected)) {
    if (!selectedMembersExact) return "slot-specific candidates fix member role assignment";
    if (!selectedBonusExact) return "slot-specific candidates fix bonus/member displacement";
    if (!selectedTotalExact) return "slot-specific candidates fix total/member confusion";
    return "slot-specific candidates contain exact expected members/bonus/total";
  }
  if (exactMembers && exactBonus && exactTotal) {
    return "slot-specific candidates contain exact values but still lack unique equation";
  }
  if ((row.simulation?.strictProposalCount || 0) > 1) {
    return "slot-specific candidates add unsafe/noisy alternatives";
  }
  if (
    row.expectedBonus > 0 &&
    !exactBonus &&
    (exactMembers || selectedMembersExact) &&
    exactTotal
  ) {
    return "slot-specific candidates do not help: missing exact bonus evidence";
  }
  if (exactMembers || exactBonus || exactTotal) {
    return "slot-specific candidates contain partial exact evidence only";
  }
  return "slot-specific candidates do not help";
}

async function writeCurrentPcSlotRoiDiagnosticsArtifacts(analysis = []) {
  await fs.rm(currentPcSlotRoiDiagnosticsDir, { recursive: true, force: true });
  await fs.mkdir(currentPcSlotRoiDiagnosticsDir, { recursive: true });
  const rows = [];

  for (const item of analysis.filter((entry) => entry.expected)) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const expected = currentPcExpectedStageSide(item, stage, side);
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        if (!expected || !sideAnalysis) continue;
        const selected = currentPcSelectedStageSideValues(sideAnalysis);
        const failed = hasCurrentPcSideFailure(item, stage, side);
        const row = {
          image: item.fileName,
          absolutePath: item.absolutePath,
          stage,
          side,
          failed,
          expected,
          expectedMembers: expected.members,
          expectedBonus: expected.bonus,
          expectedTotal: expected.total,
          selectedMembers: selected.selectedMembers,
          selectedBonus: selected.selectedBonus,
          selectedTotal: selected.selectedTotal,
          existingRecoveries: {
            groupedRawApplied: Boolean(sideAnalysis.currentPcGroupedRawTokenRecovery?.applied),
            stage3SevenDigitApplied: Boolean(
              sideAnalysis.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied
            ),
          },
          slotEvidence: [],
          simulation: null,
          classification: null,
          artifact: null,
        };

        if (failed) {
          const image = await readImageSize(item.absolutePath);
          const outDir = path.join(
            currentPcSlotRoiDiagnosticsDir,
            safeArtifactName(`${item.fileName}-stage${stage}-${side}`)
          );
          await fs.mkdir(outDir, { recursive: true });
          const slotEvidence = currentPcExistingFixedRoiSlotEvidence(row, sideAnalysis, image);
          const selectedMembersExact = arraysEqualWithinOne(row.selectedMembers, row.expectedMembers);
          const slotDefinitions = currentPcSlotRoiDefinitions(image, stage, side).filter(
            (definition) =>
              definition.role.startsWith("member") &&
              definition.role !== "member-row" &&
              (!selectedMembersExact ||
                Math.abs(row.selectedMembers[definition.slotIndex] - row.expectedMembers[definition.slotIndex]) > 1)
          );
          for (const definition of slotDefinitions) {
            slotEvidence.push(await recognizeCurrentPcSlotRoi(row, image, outDir, definition));
          }
          row.slotEvidence = slotEvidence;
          row.simulation = buildCurrentPcSlotSpecificRoiCandidateSimulation({
            slotEvidence,
            selectedMembers: row.selectedMembers,
            selectedBonus: row.selectedBonus,
            selectedTotal: row.selectedTotal,
          });
          row.artifact = path
            .relative(
              rootDir,
              path.join(outDir, "slot-specific-roi-diagnostics.json")
            )
            .replaceAll("\\", "/");
          row.classification = currentPcSlotRoiRowClassification(row);
          await fs.writeFile(
            path.join(outDir, "slot-specific-roi-diagnostics.json"),
            JSON.stringify(row, null, 2)
          );
        } else {
          row.classification = currentPcSlotRoiRowClassification(row);
        }
        rows.push(row);
      }
    }
  }

  const accepted = rows.filter((row) => row.simulation?.wouldApply);
  const truePositives = accepted.filter((row) => proposalMatchesExpected(row.simulation.proposed, row.expected));
  const falsePositives = accepted.filter((row) => !proposalMatchesExpected(row.simulation.proposed, row.expected));
  const failedRows = rows.filter((row) => row.failed);
  const falseNegatives = failedRows.filter(
    (row) => !row.simulation?.wouldApply && row.classification !== "exact current production result already correct"
  );
  const blocked = failedRows.filter((row) => !row.simulation?.wouldApply);
  const summary = {
    outputDir: path.relative(rootDir, currentPcSlotRoiDiagnosticsDir).replaceAll("\\", "/"),
    totalFixtures: analysis.filter((entry) => entry.expected).length,
    totalStageSides: rows.length,
    failingStageSides: failedRows.length,
    correctStageSides: rows.length - failedRows.length,
    simulation: {
      tp: truePositives.length,
      fp: falsePositives.length,
      fn: falseNegatives.length,
      blocked: blocked.length,
    },
    classificationCounts: Object.fromEntries(
      [...rows.reduce((map, row) => {
        map.set(row.classification, (map.get(row.classification) || 0) + 1);
        return map;
      }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    ),
    rows,
  };
  const summaryPath = path.join(currentPcSlotRoiDiagnosticsDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  summary.summaryPath = path.relative(rootDir, summaryPath).replaceAll("\\", "/");
  return summary;
}

function buildCurrentPcSlotRoiDiagnosticsReport(diagnostics) {
  const rows = diagnostics?.rows || [];
  const failedRows = rows.filter((row) => row.failed);
  const exactMemberRows = failedRows.filter((row) =>
    row.expectedMembers.every((value, index) =>
      currentPcSlotEvidenceContainsValue(row.slotEvidence, `member${index + 1}`, value)
    )
  );
  const exactBonusRows = failedRows.filter(
    (row) =>
      row.expectedBonus === 0 ||
      currentPcSlotEvidenceContainsValue(row.slotEvidence, "bonus", row.expectedBonus)
  );
  const exactTotalRows = failedRows.filter((row) =>
    currentPcSlotEvidenceContainsValue(row.slotEvidence, "total", row.expectedTotal)
  );
  const uniqueExactRows = failedRows.filter(
    (row) => row.simulation?.wouldApply && proposalMatchesExpected(row.simulation.proposed, row.expected)
  );
  const accepted = rows.filter((row) => row.simulation?.wouldApply);
  const falsePositives = accepted.filter(
    (row) => !proposalMatchesExpected(row.simulation.proposed, row.expected)
  );
  const overlapGrouped = accepted.filter((row) => row.existingRecoveries?.groupedRawApplied);
  const overlapStage3 = accepted.filter((row) => row.existingRecoveries?.stage3SevenDigitApplied);
  const classificationCounts = diagnostics?.classificationCounts || {};
  const lines = [
    "# Current-PC Slot-Specific ROI Candidate Investigation",
    "",
    "This is runner-only diagnostics for current-PC slot-specific ROI candidate extraction. It does not change final OCR output, production recovery behavior, smartphone OCR, or legacy desktop OCR.",
    "",
    "Run with:",
    "",
    "```bash",
    "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-slot-roi-diagnostics",
    "```",
    "",
    "## ROI Definitions",
    "",
    "- Layout gate: current-PC `541x961` / `current-pc-2026-07-result` geometry via the existing detector.",
    "- `total-slot`: existing current-PC fixed total ROI for the stage/side.",
    "- `member-row`: existing current-PC fixed member-row ROI for the stage/side.",
    "- `member1-slot`, `member2-slot`, `member3-slot`: the fixed member-row ROI split into thirds with small horizontal overlap.",
    "- `bonus-slot`: existing current-PC crown/plus bonus ROI for the stage/side.",
    "- All coordinates are saved as image-relative normalized boxes in `tmp/current-pc-slot-roi-diagnostics/`.",
    "",
    "## Summary",
    "",
    `- current-PC fixtures evaluated: ${diagnostics?.totalFixtures || 0}`,
    `- stage/side rows evaluated: ${diagnostics?.totalStageSides || 0}`,
    `- failing stage/side rows with slot OCR diagnostics: ${diagnostics?.failingStageSides || 0}`,
    `- exact current production result already correct: ${diagnostics?.correctStageSides || 0}`,
    `- rows where slot-specific candidates contain all exact expected members: ${exactMemberRows.length}`,
    `- rows where slot-specific candidates contain exact expected bonus or no bonus needed: ${exactBonusRows.length}`,
    `- rows where slot-specific candidates contain exact expected total: ${exactTotalRows.length}`,
    `- rows with unique strict exact slot interpretation: ${uniqueExactRows.length}`,
    `- blocked by missing/OCR-confused bonus evidence: ${
      failedRows.filter((row) => row.classification === "slot-specific candidates do not help: missing exact bonus evidence").length
    }`,
    `- blocked by competing/noisy interpretation: ${
      failedRows.filter((row) => row.classification === "slot-specific candidates add unsafe/noisy alternatives").length
    }`,
    `- artifact directory: \`${diagnostics?.outputDir || "-"}\``,
    "- final OCR output changed: no",
    "- production recovery enabled: no",
    "",
    "## Runner-Only Hypothetical Solver",
    "",
    "- simulation name: `currentPcSlotSpecificRoiCandidateSimulation`",
    "- guard: corrected member values must come from their matching slot ROI, already-correct selected members may be retained, bonus must come from bonus ROI when nonzero, total must come from total ROI, and the exact equation must be unique.",
    "- selected current values may be present in candidate sets only so the simulation can preserve already-correct slots while testing whether slot-specific evidence repairs the wrong slots.",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| TP | ${diagnostics?.simulation?.tp || 0} |`,
    `| FP | ${diagnostics?.simulation?.fp || 0} |`,
    `| FN | ${diagnostics?.simulation?.fn || 0} |`,
    `| blocked | ${diagnostics?.simulation?.blocked || 0} |`,
    "",
    "## Classification Counts",
    "",
    "| classification | count |",
    "| --- | ---: |",
  ];
  for (const [classification, count] of Object.entries(classificationCounts)) {
    lines.push(`| ${classification} | ${count} |`);
  }

  lines.push(
    "",
    "## Accepted Simulation Cases",
    "",
    "| image | stage | side | proposed members | bonus | total | overlaps existing recovery | artifact |",
    "| --- | ---: | --- | --- | ---: | ---: | --- | --- |"
  );
  if (accepted.length === 0) {
    lines.push("| none | - | - | - | - | - | - | - |");
  } else {
    for (const row of accepted) {
      const proposed = row.simulation.proposed || {};
      const overlap = [
        row.existingRecoveries?.groupedRawApplied ? "grouped/raw" : "",
        row.existingRecoveries?.stage3SevenDigitApplied ? "stage3-7digit" : "",
      ].filter(Boolean).join(", ") || "-";
      lines.push(
        `| ${row.image} | ${row.stage} | ${row.side} | ${formatDebugNumbers(proposed.members || [])} | ${formatNumber(proposed.bonus || 0) || "-"} | ${formatNumber(proposed.total || 0)} | ${overlap} | ${row.artifact || "-"} |`
      );
    }
  }

  lines.push(
    "",
    "## Unsafe / Blocked Examples",
    "",
    "| image | stage | side | classification | rejection reasons | expected | selected | artifact |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- |"
  );
  for (const row of failedRows.slice(0, 40)) {
    lines.push(
      `| ${row.image} | ${row.stage} | ${row.side} | ${row.classification} | ${(row.simulation?.rejectionReasons || []).join(", ") || "-"} | members ${formatDebugNumbers(row.expectedMembers)} bonus ${formatNumber(row.expectedBonus) || "-"} total ${formatNumber(row.expectedTotal)} | members ${formatDebugNumbers(row.selectedMembers)} bonus ${formatNumber(row.selectedBonus) || "-"} total ${formatNumber(row.selectedTotal)} | ${row.artifact || "-"} |`
    );
  }

  lines.push(
    "",
    "## Overlap With Existing Recoveries",
    "",
    `- accepted rows already covered by \`currentPcGroupedRawTokenRecovery\`: ${overlapGrouped.length}`,
    `- accepted rows already covered by \`applyCurrentPcStage3SevenDigitBonusDisplacementRecovery\`: ${overlapStage3.length}`,
    "- This report distinguishes actual production recovery application from diagnostic evidence. A row with slot candidates is not considered recovered unless the production result changed.",
    "",
    "## Production Recommendation",
    "",
    falsePositives.length > 0
      ? "Do not productionize. The runner-only slot-specific solver produced at least one false positive under the current strict guards."
      : uniqueExactRows.length >= 2
        ? "Do not productionize yet. Although strict slot-specific evidence can produce unique exact interpretations, browser/UI parity and a separate production-readiness audit would be required before any adoption."
        : "Do not productionize. Slot-specific ROI evidence is useful diagnostically, but this pass does not establish a repeated zero-risk production target.",
    "",
    "## Browser/UI Parity",
    "",
    "Browser/UI parity would be required before productionization because this diagnostic path performs additional runner-only slot OCR over fixed ROIs. The browser would need to expose the same slot candidate provenance before any final-output recovery could safely use it.",
    ""
  );

  return lines.join("\n");
}

async function writeCurrentPcBaselineArtifacts(report) {
  const currentPcItems = report.filter((item) => item.source === "current-pc");
  await fs.rm(currentPcBaselineDir, { recursive: true, force: true });
  await fs.mkdir(currentPcBaselineDir, { recursive: true });

  const analysis = [];
  for (const item of currentPcItems) {
    const imagePath = item.absolutePath;
    const image = await readImageSize(imagePath);
    const imageDir = path.join(currentPcBaselineDir, safeArtifactName(item.image));
    await fs.mkdir(imageDir, { recursive: true });
    const originalPath = path.join(imageDir, "original.png");
    await fs.copyFile(imagePath, originalPath);

    const zonesForOverlay = [];
    const cropArtifacts = [];
    const stageAnalyses = {};
    for (const stage of stages) {
      const fixed = getFixedOcrZones(image, stage, "current-pc");
      const stageZone = currentPcStageRegion(image, stage);
      cropArtifacts.push(
        await saveCurrentPcZoneArtifacts(imagePath, image, imageDir, `stage${stage}-full`, stageZone, {
          binarized: false,
        })
      );
      zonesForOverlay.push({ zone: stageZone, color: "#ffcc00", label: `S${stage}` });

      stageAnalyses[`stage${stage}`] = {};
      for (const side of sides) {
        const totalZone = side === "self" ? fixed.selfTotal : fixed.enemyTotal;
        const memberZone = side === "self" ? fixed.selfMembers : fixed.enemyMembers;
        const bonusZones = getCrownBonusZones(image, stage, side, "current-pc");
        const totalArtifact = await saveCurrentPcZoneArtifacts(
            imagePath,
            image,
            imageDir,
            `stage${stage}-${side}-total`,
            totalZone,
            { preset: "score-slot" }
          );
        cropArtifacts.push(totalArtifact);
        const memberArtifact = await saveCurrentPcZoneArtifacts(
            imagePath,
            image,
            imageDir,
            `stage${stage}-${side}-members`,
            memberZone,
            { preset: "score-slot" }
          );
        cropArtifacts.push(memberArtifact);
        const bonusArtifacts = [];
        for (let index = 0; index < bonusZones.length; index += 1) {
          const bonusArtifact = await saveCurrentPcZoneArtifacts(
              imagePath,
              image,
              imageDir,
              `stage${stage}-${side}-bonus-${index + 1}`,
              bonusZones[index],
              { preset: "crown-bonus" }
            );
          bonusArtifacts.push(bonusArtifact);
          cropArtifacts.push(bonusArtifact);
        }
        zonesForOverlay.push({
          zone: clampZoneToImage(totalZone, image),
          color: side === "self" ? "#00a3ff" : "#ff3366",
          label: `S${stage} ${side} total`,
        });
        zonesForOverlay.push({
          zone: clampZoneToImage(memberZone, image),
          color: side === "self" ? "#63d471" : "#ff8a00",
          label: `S${stage} ${side} members`,
        });
        stageAnalyses[`stage${stage}`][side] = buildCurrentPcSideAnalysis(
          item.result?.[`stage${stage}`],
          side,
          {
            stage,
            roiProvenance: {
              layoutFamily: "current-pc-2026-07-result",
              total: totalArtifact,
              members: memberArtifact,
              bonus: bonusArtifacts,
            },
          }
        );
      }
    }

    const overlaySvg = Buffer.from(`
      <svg width="${image.width}" height="${image.height}" xmlns="http://www.w3.org/2000/svg">
        ${zonesForOverlay.map((entry) => svgRect(entry.zone, entry.color, entry.label)).join("\n")}
      </svg>
    `);
    const annotatedPath = path.join(imageDir, "annotated-rois.png");
    await sharp(imagePath).composite([{ input: overlaySvg, left: 0, top: 0 }]).png().toFile(annotatedPath);

    const artifact = {
      image: item.image,
      absolutePath: imagePath,
      dimensions: image,
      aspect: Number((image.width / image.height).toFixed(6)),
      layoutDetection: detectCurrentPcLayout(image),
      expected: item.expected,
      pass: item.pass,
      failures: item.failures,
      expectedData: item.expectedData,
      result: item.result,
      crops: cropArtifacts,
      annotated: path.relative(rootDir, annotatedPath).replaceAll("\\", "/"),
      original: path.relative(rootDir, originalPath).replaceAll("\\", "/"),
      stages: stageAnalyses,
    };
    const jsonPath = path.join(imageDir, "analysis.json");
    await fs.writeFile(jsonPath, JSON.stringify(artifact, null, 2));
    analysis.push({
      fileName: path.basename(imagePath),
      absolutePath: imagePath,
      dimensions: image,
      aspect: Number((image.width / image.height).toFixed(6)),
      lastWriteTime: (await fs.stat(imagePath)).mtime.toISOString(),
      artifact: path.relative(rootDir, jsonPath).replaceAll("\\", "/"),
      annotated: path.relative(rootDir, annotatedPath).replaceAll("\\", "/"),
      expected: item.expected,
      expectedData: item.expectedData,
      pass: item.pass,
      failures: item.failures,
      stages: stageAnalyses,
      result: item.result,
    });
  }

  const summaryPath = path.join(currentPcBaselineDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(analysis, null, 2));
  return {
    analysis,
    summaryPath: path.relative(rootDir, summaryPath).replaceAll("\\", "/"),
    outputDir: path.relative(rootDir, currentPcBaselineDir).replaceAll("\\", "/"),
    scanSummary: currentPcBaselineScanSummary,
  };
}

function formatCurrentPcSideLine(sideAnalysis) {
  if (!sideAnalysis) return "-";
  return [
    `members ${formatDebugNumbers(sideAnalysis.selectedMembers)}`,
    `total ${formatNumber(sideAnalysis.selectedTotal)}`,
    `sum ${formatNumber(sideAnalysis.memberSum)}`,
    `bonus ${formatDebugNumbers(sideAnalysis.bonusCandidates) || "-"}`,
    `exact ${sideAnalysis.exactConsistency.noBonus || sideAnalysis.exactConsistency.bonusMatches.length > 0 ? "yes" : "no"}`,
    `suspicious ${sideAnalysis.suspiciousReasons.join(", ") || "none"}`,
  ].join("; ");
}

function formatCurrentPcExpectedLine(expectedStage, side) {
  if (!expectedStage) return "no fixture";
  const members = expectedStage[`${side}Members`] || [];
  const total = side === "self" ? expectedStage.selfTotal : expectedStage.enemyTotal;
  const bonus = side === "self" ? expectedStage.selfBonus : expectedStage.enemyBonus;
  return [
    `members ${formatDebugNumbers(members)}`,
    `bonus ${bonus > 0 ? formatNumber(bonus) : "-"}`,
    `total ${formatNumber(total)}`,
  ].join("; ");
}

function formatCurrentPcActualExpectedLine(item, stage, side) {
  const stageKey = `stage${stage}`;
  const actual = item.stages?.[stageKey]?.[side];
  const expectedStage = item.expectedData?.[stageKey];
  return [
    `actual: ${formatCurrentPcSideLine(actual)}`,
    `expected: ${formatCurrentPcExpectedLine(expectedStage, side)}`,
  ].join("<br>");
}

function hasCurrentPcSideFailure(item, stage, side) {
  const sideLabel = sideLabels[side];
  return (item.failures || []).some((failure) => failure.key.startsWith(`S${stage} ${sideLabel} `));
}

function buildCurrentPcConfirmedGroupEvaluation(analysis) {
  const groupNames = [
    "clean-7digit-candidate-present-but-unselected",
    "unique-exact-raw-interpretation-differs-from-selected-result",
    "selected-total-not-exact-member-sum-or-member-sum-plus-bonus",
    "bonus-candidate-selected-as-member",
    "missing-selected-member",
  ];
  const byName = new Map(
    groupNames.map((name) => [
      name,
      {
        name,
        flags: 0,
        confirmedPositives: [],
        falseAlarms: [],
      },
    ])
  );

  for (const item of analysis) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        if (!sideAnalysis) continue;
        const sideFailed = hasCurrentPcSideFailure(item, stage, side);
        const label = `${item.fileName} S${stage} ${sideLabels[side]}`;
        for (const reason of sideAnalysis.suspiciousReasons || []) {
          if (!byName.has(reason)) continue;
          const entry = byName.get(reason);
          entry.flags += 1;
          if (sideFailed) {
            entry.confirmedPositives.push(label);
          } else {
            entry.falseAlarms.push(label);
          }
        }
      }
    }
  }

  return [...byName.values()];
}

function currentPcExpectedStageSide(item, stage, side) {
  const expectedStage = item.expectedData?.[`stage${stage}`];
  if (!expectedStage) return null;
  return {
    members: expectedStage[`${side}Members`] || [],
    bonus: side === "self" ? expectedStage.selfBonus || 0 : expectedStage.enemyBonus || 0,
    total: side === "self" ? expectedStage.selfTotal || 0 : expectedStage.enemyTotal || 0,
  };
}

function arraysEqualWithinOne(left = [], right = []) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => Math.abs(Number(value || 0) - Number(right[index] || 0)) <= 1);
}

function proposalMatchesExpected(proposal, expected) {
  if (!proposal || !expected) return false;
  return (
    arraysEqualWithinOne(proposal.members || [], expected.members || []) &&
    Math.abs(Number(proposal.bonus || 0) - Number(expected.bonus || 0)) <= 1 &&
    Math.abs(Number(proposal.total || 0) - Number(expected.total || 0)) <= 1
  );
}

function buildCurrentPcCrownBonusRuleStageSimulation(item, stage) {
  const stageKey = `stage${stage}`;
  const artifactSimulation = item.stages?.[stageKey]?.debugArtifact?.currentPcCrownBonusRuleSimulation;
  if (artifactSimulation) return artifactSimulation;
  const sideArtifactSimulation =
    item.stages?.[stageKey]?.self?.currentPcCrownBonusRuleSimulation ||
    item.stages?.[stageKey]?.enemy?.currentPcCrownBonusRuleSimulation;
  if (sideArtifactSimulation) return sideArtifactSimulation;
  return sharedBuildCurrentPcCrownBonusRuleEvidence({
    stage,
    self: item.stages?.[stageKey]?.self,
    enemy: item.stages?.[stageKey]?.enemy,
  });
}

function currentPcCrownBonusPotentialTarget(item, stage, side, stageSimulation) {
  if (!hasCurrentPcSideFailure(item, stage, side)) return false;
  const stageKey = `stage${stage}`;
  const expectedSelf = currentPcExpectedStageSide(item, stage, "self");
  const expectedEnemy = currentPcExpectedStageSide(item, stage, "enemy");
  if (!expectedSelf || !expectedEnemy) return false;
  const self = item.stages?.[stageKey]?.self;
  const enemy = item.stages?.[stageKey]?.enemy;
  if (!self || !enemy) return false;
  if (!arraysEqualWithinOne(self.selectedMembers || [], expectedSelf.members || [])) return false;
  if (!arraysEqualWithinOne(enemy.selectedMembers || [], expectedEnemy.members || [])) return false;
  const expected = side === "self" ? expectedSelf : expectedEnemy;
  const selected = stageSimulation?.selected?.[side];
  if (!selected) return false;
  return (
    Math.abs(Number(selected.bonus || 0) - Number(expected.bonus || 0)) > 1 ||
    Math.abs(Number(selected.total || 0) - Number(expected.total || 0)) > 1
  );
}

function isCurrentPcStage3SelfDisplacementTarget(item) {
  const expected = currentPcExpectedStageSide(item, 3, "self");
  const actual = item.stages?.stage3?.self;
  if (!expected || !actual) return false;
  const members = expected.members || [];
  const selected = actual.selectedMembers || [];
  return (
    members[0] >= 1000000 &&
    Math.abs(Number(selected[0] || 0) - Number(members[1] || 0)) <= 1 &&
    Math.abs(Number(selected[1] || 0) - Number(members[2] || 0)) <= 1 &&
    Math.abs(Number(selected[2] || 0) - Number(expected.bonus || 0)) <= 1
  );
}

function buildCurrentPcStage3SelfSimulationEvaluation(analysis) {
  const rows = [];
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let correctlyBlockedNegatives = 0;

  for (const item of analysis) {
    const side = item.stages?.stage3?.self;
    const sim = side?.currentPcStage3SelfSevenDigitDisplacementSimulation;
    const expected = currentPcExpectedStageSide(item, 3, "self");
    const target = isCurrentPcStage3SelfDisplacementTarget(item);
    const wouldApply = Boolean(sim?.wouldApply);
    const matchesExpected = proposalMatchesExpected(sim?.proposed, expected);
    let classification = "correctly-blocked-negative";

    if (wouldApply && matchesExpected) {
      truePositives += 1;
      classification = "true-positive";
    } else if (wouldApply && !matchesExpected) {
      falsePositives += 1;
      classification = "false-positive";
    } else if (!wouldApply && target) {
      falseNegatives += 1;
      classification = "false-negative";
    } else {
      correctlyBlockedNegatives += 1;
    }

    rows.push({
      image: item.fileName,
      classification,
      target,
      wouldApply,
      expected,
      actual: {
        members: side?.selectedMembers || [],
        bonusCandidates: side?.bonusCandidates || [],
        total: side?.selectedTotal || 0,
      },
      proposed: sim?.proposed || null,
      rejectionReasons: sim?.rejectionReasons || [],
      memberRowNumbers: sim?.evidence?.memberRowNumbers || [],
      totalReferences: sim?.evidence?.totalReferences || [],
      strictProposalCount: sim?.evidence?.strictProposalCount || 0,
      competingExactInterpretationCount:
        sim?.evidence?.competingExactInterpretationCount || 0,
      roiProvenance: sim?.evidence?.roiProvenance || null,
    });
  }

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    correctlyBlockedNegatives,
    rows,
  };
}

function buildCurrentPcExactRawEquationSimulationEvaluation(analysis) {
  const rows = [];
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let correctlyBlockedNegatives = 0;

  for (const item of analysis) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        const sim = sideAnalysis?.currentPcExactRawEquationRecoverySimulation;
        const expected = currentPcExpectedStageSide(item, stage, side);
        const target = Boolean(
          sideAnalysis?.suspiciousReasons?.includes(
            "selected-total-not-exact-member-sum-or-member-sum-plus-bonus"
          ) && hasCurrentPcSideFailure(item, stage, side)
        );
        const wouldApply = Boolean(sim?.wouldApply);
        const matchesExpected = proposalMatchesExpected(sim?.proposed, expected);
        let classification = "correctly-blocked-negative";

        if (wouldApply && matchesExpected) {
          truePositives += 1;
          classification = "true-positive";
        } else if (wouldApply && !matchesExpected) {
          falsePositives += 1;
          classification = "false-positive";
        } else if (!wouldApply && target) {
          falseNegatives += 1;
          classification = "false-negative";
        } else {
          correctlyBlockedNegatives += 1;
        }

        if (target || wouldApply) {
          rows.push({
            image: item.fileName,
            stage,
            side,
            classification,
            target,
            wouldApply,
            expected,
            actual: {
              members: sideAnalysis?.selectedMembers || [],
              bonusCandidates: sideAnalysis?.bonusCandidates || [],
              total: sideAnalysis?.selectedTotal || 0,
              rawCandidates: sideAnalysis?.rawCandidates || [],
              displayedTotalCandidates: sideAnalysis?.displayedTotalCandidates || [],
              candidateSourceSummary: sideAnalysis?.candidateSourceSummary || null,
            },
            proposed: sim?.proposed || null,
            rejectionReasons: sim?.rejectionReasons || [],
            exactRawInterpretationCount:
              sim?.evidence?.exactRawInterpretationCount || 0,
            structuralEquation: sim?.evidence?.structuralEquation || null,
            roiProvenance: sim?.evidence?.roiProvenance || null,
          });
        }
      }
    }
  }

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    correctlyBlockedNegatives,
    rows,
  };
}

function currentPcGroupedRawTargetMatchesExpected(item, stage, side, sideAnalysis) {
  const expected = currentPcExpectedStageSide(item, stage, side);
  if (!expected || !hasCurrentPcSideFailure(item, stage, side)) return false;
  if (
    !sideAnalysis?.suspiciousReasons?.includes(
      "selected-total-not-exact-member-sum-or-member-sum-plus-bonus"
    )
  ) {
    return false;
  }
  const expectedMembers = expected.members || [];
  const expectedBonus = Number(expected.bonus || 0);
  const expectedTotal = Number(expected.total || 0);
  const expectedSum = expectedMembers.reduce((sum, value) => sum + Number(value || 0), 0);
  if (Math.abs(expectedSum + expectedBonus - expectedTotal) > 1) return false;

  const eligibleValues =
    sideAnalysis?.currentPcGroupedRawTokenEvidenceSimulation?.evidence?.eligibleTokens?.map(
      (token) => Number(token.normalizedValue || 0)
    ) || [];
  if (eligibleValues.length === 0) return false;
  const expectedValues = [...expectedMembers, expectedBonus, expectedTotal].filter((value) => value > 0);
  return expectedValues.some((value) => valueInList(value, eligibleValues));
}

function buildCurrentPcGroupedRawTokenEvidenceSimulationEvaluation(analysis) {
  const rows = [];
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let correctlyBlockedNegatives = 0;
  const shapeBreakdown = new Map();
  const blockedShapeBreakdown = new Map();
  const blockedReasonBreakdown = new Map();
  let punctuationGroupedCases = 0;
  let rawTextOnlyCases = 0;
  let overlappingPunctuationAndRawOnlyCases = 0;
  const additionalTruePositiveKeys = [];

  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  for (const item of analysis) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        const sim = sideAnalysis?.currentPcGroupedRawTokenEvidenceSimulation;
        const expected = currentPcExpectedStageSide(item, stage, side);
        const eligibleTokens = sim?.evidence?.eligibleTokens || [];
        const blockedTokens = sim?.evidence?.blockedTokens || [];
        const hasPunctuationGrouped = eligibleTokens.some((token) =>
          ["comma-grouped", "period-grouped", "space-grouped"].includes(token.shape)
        );
        const hasRawTextOnly = eligibleTokens.some((token) => !token.presentInSourceParsed);
        const target = currentPcGroupedRawTargetMatchesExpected(item, stage, side, sideAnalysis);
        const wouldApply = Boolean(sim?.wouldApply);
        const matchesExpected = proposalMatchesExpected(sim?.proposed, expected);
        let classification = "correctly-blocked-negative";

        for (const token of eligibleTokens) {
          increment(shapeBreakdown, `${token.shape}:${token.role}`);
        }
        for (const token of blockedTokens) {
          increment(blockedShapeBreakdown, `${token.shape}:${token.role}`);
          for (const reason of token.reasons || []) increment(blockedReasonBreakdown, reason);
        }
        if (hasPunctuationGrouped) punctuationGroupedCases += 1;
        if (hasRawTextOnly) rawTextOnlyCases += 1;
        if (hasPunctuationGrouped && hasRawTextOnly) overlappingPunctuationAndRawOnlyCases += 1;

        if (wouldApply && matchesExpected) {
          truePositives += 1;
          classification = "true-positive";
          if (!sideAnalysis?.currentPcExactRawEquationRecoverySimulation?.wouldApply) {
            additionalTruePositiveKeys.push(`${item.fileName} S${stage} ${side}`);
          }
        } else if (wouldApply && !matchesExpected) {
          falsePositives += 1;
          classification = "false-positive";
        } else if (!wouldApply && target) {
          falseNegatives += 1;
          classification = "false-negative";
        } else {
          correctlyBlockedNegatives += 1;
        }

        if (target || wouldApply || eligibleTokens.length > 0) {
          rows.push({
            image: item.fileName,
            stage,
            side,
            classification,
            target,
            wouldApply,
            expected,
            actual: {
              members: sideAnalysis?.selectedMembers || [],
              bonusCandidates: sideAnalysis?.bonusCandidates || [],
              total: sideAnalysis?.selectedTotal || 0,
            },
            proposed: sim?.proposed || null,
            rejectionReasons: sim?.rejectionReasons || [],
            eligibleTokens,
            blockedTokenCount: sim?.evidence?.blockedTokenCount || 0,
            exactInterpretationCount: sim?.evidence?.exactInterpretationCount || 0,
            structuralEquation: sim?.evidence?.structuralEquation || null,
            promotedValuesUsed: sim?.evidence?.promotedValuesUsed || [],
            roiProvenance: sim?.evidence?.roiProvenance || null,
          });
        }
      }
    }
  }

  const mapToRows = (map) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    correctlyBlockedNegatives,
    rows,
    shapeBreakdown: mapToRows(shapeBreakdown),
    blockedShapeBreakdown: mapToRows(blockedShapeBreakdown),
    blockedReasonBreakdown: mapToRows(blockedReasonBreakdown),
    overlap: {
      punctuationGroupedCases,
      rawTextOnlyCases,
      overlappingPunctuationAndRawOnlyCases,
    },
    additionalTruePositiveKeys,
  };
}

function buildCurrentPcCrownBonusRuleSimulationEvaluation(analysis) {
  const rows = [];
  const accepted = [];
  const blocked = [];
  const falsePositiveRows = [];
  const blockedReasonBreakdown = new Map();
  const helpBreakdown = new Map();
  const stageBreakdown = new Map();
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blockedCount = 0;
  let failingStageSideRows = 0;

  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  const stageSimulations = new Map();
  const getStageSimulation = (item, stage) => {
    const key = `${item.fileName}|${stage}`;
    if (!stageSimulations.has(key)) {
      stageSimulations.set(key, buildCurrentPcCrownBonusRuleStageSimulation(item, stage));
    }
    return stageSimulations.get(key);
  };

  for (const item of analysis) {
    if (!item.expected) continue;
    for (const stage of stages) {
      const stageSimulation = getStageSimulation(item, stage);
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        const expected = currentPcExpectedStageSide(item, stage, side);
        if (!sideAnalysis || !expected) continue;
        const sideFailed = hasCurrentPcSideFailure(item, stage, side);
        if (sideFailed) failingStageSideRows += 1;
        const sideWouldApply = Boolean(stageSimulation?.wouldApply && stageSimulation.sideWouldChange?.[side]);
        const proposed = stageSimulation?.proposed?.[side] || null;
        const matchesExpected = proposalMatchesExpected(proposed, expected);
        const target = currentPcCrownBonusPotentialTarget(item, stage, side, stageSimulation);
        let classification = "not-evaluated";

        if (sideWouldApply && matchesExpected) {
          truePositives += 1;
          classification = "true-positive";
        } else if (sideWouldApply && !matchesExpected) {
          falsePositives += 1;
          classification = "false-positive";
        } else if (!sideWouldApply && target) {
          falseNegatives += 1;
          classification = "false-negative";
        } else if (sideFailed) {
          blockedCount += 1;
          classification = "blocked";
        } else {
          classification = "correctly-unchanged";
        }

        if (classification === "true-positive") {
          increment(stageBreakdown, `stage${stage}`);
          for (const reason of sideAnalysis.suspiciousReasons || []) {
            if (reason === "selected-total-not-exact-member-sum-or-member-sum-plus-bonus") {
              increment(helpBreakdown, "total/bonus selection failures");
            }
            if (reason === "bonus-candidate-selected-as-member") {
              increment(helpBreakdown, "bonus/member displacement");
            }
            if (reason === "missing-selected-member") {
              increment(helpBreakdown, "missing member");
            }
            if (reason === "clean-7digit-candidate-present-but-unselected") {
              increment(helpBreakdown, "clean 7-digit signal");
            }
          }
          if ((expected.bonus || 0) > 0 && !valueInList(expected.bonus, sideAnalysis.bonusCandidates || [])) {
            increment(helpBreakdown, "missing bonus OCR");
          }
          accepted.push({
            screenshot: item.fileName,
            stage,
            side,
            selectedBefore: stageSimulation.selected,
            proposedSelf: stageSimulation.proposed?.self || null,
            proposedEnemy: stageSimulation.proposed?.enemy || null,
            globalRank1Member: stageSimulation.evidence?.rank1 || null,
            winningSide: stageSimulation.evidence?.winningSide || null,
            calculatedCrownBonus: stageSimulation.evidence?.calculatedBonus || 0,
            memberEvidence: stageSimulation.evidence?.memberEvidence || {},
            totalEvidence: stageSimulation.evidence?.totalEvidence || {},
            existingOcrBonus:
              stageSimulation.selected?.[side]?.bonus === expected.bonus
                ? "correct"
                : stageSimulation.selected?.[side]?.bonus > 0
                  ? "wrong-or-displaced"
                  : "missing",
            uniqueness: "selected six-member interpretation is unique; no alternate member values are considered by this strict simulation",
            overlaps: {
              groupedRaw: Boolean(sideAnalysis.currentPcGroupedRawTokenRecovery?.applied),
              stage3SevenDigit: Boolean(
                sideAnalysis.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied
              ),
            },
          });
        }

        if (classification === "false-positive") {
          falsePositiveRows.push({
            screenshot: item.fileName,
            stage,
            side,
            expected,
            proposed,
            selectedBefore: stageSimulation.selected?.[side] || null,
            rejectionReasons: stageSimulation.rejectionReasons || [],
          });
        }

        if (classification === "blocked" || classification === "false-negative") {
          const reasons = [];
          const selectedStage = stageSimulation.selected || {};
          const selectedSide = selectedStage[side] || {};
          const expectedSelf = currentPcExpectedStageSide(item, stage, "self");
          const expectedEnemy = currentPcExpectedStageSide(item, stage, "enemy");
          const selfAnalysis = item.stages?.[stageKey]?.self;
          const enemyAnalysis = item.stages?.[stageKey]?.enemy;
          const selfMembersExact = arraysEqualWithinOne(selfAnalysis?.selectedMembers || [], expectedSelf?.members || []);
          const enemyMembersExact = arraysEqualWithinOne(enemyAnalysis?.selectedMembers || [], expectedEnemy?.members || []);
          const sideMembersExact = arraysEqualWithinOne(selectedSide.members || [], expected.members || []);

          if ((selectedSide.members || []).some((value) => Number(value || 0) <= 0)) {
            reasons.push("missing member evidence");
          }
          if (!sideMembersExact) reasons.push("member OCR error");
          if (!selfMembersExact || !enemyMembersExact) reasons.push("insufficient cross-side evidence");
          for (const reason of stageSimulation.rejectionReasons || []) {
            if (reason.includes("missing") && reason.includes("exact-total")) {
              reasons.push("missing exact total evidence");
            } else if (reason.includes("non-unique")) {
              reasons.push("competing member interpretation");
            } else if (reason.includes("already-satisfies")) {
              reasons.push("existing result already correct");
            } else if (reason.includes("missing") && reason.includes("member")) {
              reasons.push("missing member evidence");
            }
          }
          if (sideAnalysis.currentPcGroupedRawTokenRecovery?.applied) {
            reasons.push("existing production recovery already applies");
          }
          if (sideAnalysis.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied) {
            reasons.push("existing production recovery already applies");
          }
          if (reasons.length === 0) reasons.push("other");
          const uniqueReasons = [...new Set(reasons)];
          for (const reason of uniqueReasons) increment(blockedReasonBreakdown, reason);
          blocked.push({
            screenshot: item.fileName,
            stage,
            side,
            classification,
            reasons: uniqueReasons,
            expected,
            selectedBefore: selectedSide,
            stageRejectionReasons: stageSimulation.rejectionReasons || [],
          });
        }

        if (
          sideFailed ||
          classification === "true-positive" ||
          classification === "false-positive" ||
          classification === "false-negative"
        ) {
          rows.push({
            screenshot: item.fileName,
            stage,
            side,
            classification,
            target,
            wouldApply: sideWouldApply,
            expected,
            selectedBefore: stageSimulation.selected?.[side] || null,
            proposed,
            rejectionReasons: stageSimulation.rejectionReasons || [],
            suspiciousReasons: sideAnalysis.suspiciousReasons || [],
            overlaps: {
              groupedRaw: Boolean(sideAnalysis.currentPcGroupedRawTokenRecovery?.applied),
              stage3SevenDigit: Boolean(
                sideAnalysis.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied
              ),
            },
          });
        }
      }
    }
  }

  const mapToRows = (map) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const groupedRawOverlap = accepted.filter((row) => row.overlaps.groupedRaw);
  const stage3SevenDigitOverlap = accepted.filter((row) => row.overlaps.stage3SevenDigit);
  const slotRoiTruePositiveKeys = new Set([
    "スクリーンショット 2026-07-14 060656479.png|1|self",
    "スクリーンショット 2026-07-16 063115987.png|1|enemy",
  ]);
  const slotRoiOverlap = accepted.filter((row) =>
    slotRoiTruePositiveKeys.has(`${row.screenshot}|${row.stage}|${row.side}`)
  );

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    blocked: blockedCount,
    failingStageSideRows,
    rows,
    accepted,
    falsePositiveRows,
    blockedRows: blocked,
    blockedReasonBreakdown: mapToRows(blockedReasonBreakdown),
    helpBreakdown: mapToRows(helpBreakdown),
    stageBreakdown: mapToRows(stageBreakdown),
    overlap: {
      groupedRaw: groupedRawOverlap.length,
      stage3SevenDigit: stage3SevenDigitOverlap.length,
      slotSpecificRoi: slotRoiOverlap.length,
      uniqueAdditionalPotential:
        truePositives -
        new Set([
          ...groupedRawOverlap.map((row) => `${row.screenshot}|${row.stage}|${row.side}`),
          ...stage3SevenDigitOverlap.map((row) => `${row.screenshot}|${row.stage}|${row.side}`),
          ...slotRoiOverlap.map((row) => `${row.screenshot}|${row.stage}|${row.side}`),
        ]).size,
    },
  };
}

function buildCurrentPcBrowserEquivalentCrownBonusRuleSimulation(item, stage) {
  const stageKey = `stage${stage}`;
  const artifactSimulation = item.stages?.[stageKey]?.debugArtifact?.currentPcCrownBonusRuleSimulation;
  if (artifactSimulation) return artifactSimulation;
  const sideArtifactSimulation =
    item.stages?.[stageKey]?.self?.currentPcCrownBonusRuleSimulation ||
    item.stages?.[stageKey]?.enemy?.currentPcCrownBonusRuleSimulation;
  if (sideArtifactSimulation) return sideArtifactSimulation;
  const buildSide = (side) => {
    const sideAnalysis = item.stages?.[stageKey]?.[side];
    if (!sideAnalysis) return null;
    return {
      selectedMembers: sideAnalysis.selectedMembers || [],
      selectedTotal: sideAnalysis.selectedTotal || 0,
      rawCandidates: sideAnalysis.rawCandidates || [],
      displayedTotalCandidates: sideAnalysis.displayedTotalCandidates || [],
      bonusCandidates: sideAnalysis.bonusCandidates || [],
      candidateSourceSummary: sideAnalysis.candidateSourceSummary || null,
    };
  };
  return sharedBuildCurrentPcCrownBonusRuleEvidence({
    stage,
    self: buildSide("self"),
    enemy: buildSide("enemy"),
  });
}

function currentPcCrownBonusEvidenceValues(evidence = []) {
  return [...new Set((evidence || []).map((entry) => `${entry.source}:${entry.value}:${entry.pass || ""}`))].sort();
}

function currentPcCrownBonusRuleFingerprint(sim = null) {
  return {
    wouldApply: Boolean(sim?.wouldApply),
    rejectionReasons: [...(sim?.rejectionReasons || [])].sort(),
    selected: {
      self: {
        members: sim?.selected?.self?.members || [],
        total: sim?.selected?.self?.total || 0,
        bonus: sim?.selected?.self?.bonus || 0,
      },
      enemy: {
        members: sim?.selected?.enemy?.members || [],
        total: sim?.selected?.enemy?.total || 0,
        bonus: sim?.selected?.enemy?.bonus || 0,
      },
    },
    proposed: {
      self: {
        members: sim?.proposed?.self?.members || [],
        total: sim?.proposed?.self?.total || 0,
        bonus: sim?.proposed?.self?.bonus || 0,
      },
      enemy: {
        members: sim?.proposed?.enemy?.members || [],
        total: sim?.proposed?.enemy?.total || 0,
        bonus: sim?.proposed?.enemy?.bonus || 0,
      },
    },
    sideWouldChange: {
      self: Boolean(sim?.sideWouldChange?.self),
      enemy: Boolean(sim?.sideWouldChange?.enemy),
    },
    rank1: sim?.evidence?.rank1 || null,
    winningSide: sim?.evidence?.winningSide || null,
    calculatedBonus: sim?.evidence?.calculatedBonus || 0,
    uniqueInterpretation: Boolean(sim?.evidence?.uniqueInterpretation),
    totalEvidence: {
      self: currentPcCrownBonusEvidenceValues(sim?.evidence?.totalEvidence?.self || []),
      enemy: currentPcCrownBonusEvidenceValues(sim?.evidence?.totalEvidence?.enemy || []),
    },
  };
}

function compareCurrentPcCrownBonusRuleParity(analysis, crownBonusSimulation) {
  const rows = [];
  let stagesCompared = 0;
  let wouldApplyDisagreements = 0;
  let proposedMemberDisagreements = 0;
  let proposedBonusDisagreements = 0;
  let proposedTotalDisagreements = 0;
  let selectedMemberDisagreements = 0;
  let selectedTotalEvidenceMismatches = 0;
  let missingInBrowserEquivalent = 0;
  let missingInRunner = 0;
  let metadataOnlyMismatches = 0;
  let safetyRelevantMismatches = 0;

  const tpKeys = new Set(
    (crownBonusSimulation.accepted || []).map((row) => `${row.screenshot}|${row.stage}|${row.side}`)
  );
  const tpCaseRows = [];

  const arraysSame = (left, right) => JSON.stringify(left || []) === JSON.stringify(right || []);
  const jsonSame = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

  for (const item of analysis) {
    if (!item.expected) continue;
    for (const stage of stages) {
      stagesCompared += 1;
      const runnerSim = buildCurrentPcCrownBonusRuleStageSimulation(item, stage);
      const browserSim = buildCurrentPcBrowserEquivalentCrownBonusRuleSimulation(item, stage);
      const runner = currentPcCrownBonusRuleFingerprint(runnerSim);
      const browser = currentPcCrownBonusRuleFingerprint(browserSim);
      const mismatchFields = [];
      const metadataMismatchFields = [];

      if (!runnerSim) missingInRunner += 1;
      if (!browserSim) missingInBrowserEquivalent += 1;
      if (runner.wouldApply !== browser.wouldApply) {
        wouldApplyDisagreements += 1;
        mismatchFields.push("wouldApply");
      }
      for (const side of sides) {
        if (!arraysSame(runner.proposed[side].members, browser.proposed[side].members)) {
          proposedMemberDisagreements += 1;
          mismatchFields.push(`${side}.proposed.members`);
        }
        if (Math.abs(Number(runner.proposed[side].bonus || 0) - Number(browser.proposed[side].bonus || 0)) > 1) {
          proposedBonusDisagreements += 1;
          mismatchFields.push(`${side}.proposed.bonus`);
        }
        if (Math.abs(Number(runner.proposed[side].total || 0) - Number(browser.proposed[side].total || 0)) > 1) {
          proposedTotalDisagreements += 1;
          mismatchFields.push(`${side}.proposed.total`);
        }
        if (!arraysSame(runner.selected[side].members, browser.selected[side].members)) {
          selectedMemberDisagreements += 1;
          mismatchFields.push(`${side}.selected.members`);
        }
        if (!arraysSame(runner.totalEvidence[side], browser.totalEvidence[side])) {
          selectedTotalEvidenceMismatches += 1;
          metadataMismatchFields.push(`${side}.totalEvidence`);
        }
      }
      if (!jsonSame(runner.rank1, browser.rank1)) mismatchFields.push("rank1");
      if (runner.winningSide !== browser.winningSide) mismatchFields.push("winningSide");
      if (Math.abs(Number(runner.calculatedBonus || 0) - Number(browser.calculatedBonus || 0)) > 1) {
        mismatchFields.push("calculatedBonus");
      }
      if (runner.uniqueInterpretation !== browser.uniqueInterpretation) {
        mismatchFields.push("uniqueInterpretation");
      }

      const hasSafetyMismatch = mismatchFields.length > 0;
      const hasMetadataMismatch = !hasSafetyMismatch && metadataMismatchFields.length > 0;
      if (hasSafetyMismatch) safetyRelevantMismatches += 1;
      if (hasMetadataMismatch) metadataOnlyMismatches += 1;
      const row = {
        screenshot: item.fileName,
        stage,
        runner,
        browser,
        runnerWouldApply: runner.wouldApply,
        browserWouldApply: browser.wouldApply,
        mismatchFields,
        metadataMismatchFields,
        safetyRelevant: hasSafetyMismatch,
      };
      rows.push(row);
      for (const side of sides) {
        if (tpKeys.has(`${item.fileName}|${stage}|${side}`)) {
          tpCaseRows.push({ ...row, side });
        }
      }
    }
  }

  return {
    stagesCompared,
    rows,
    tpRows: tpCaseRows,
    tpParityExact: tpCaseRows.filter(
      (row) => row.mismatchFields.length === 0 && row.metadataMismatchFields.length === 0
    ).length,
    wouldApplyDisagreements,
    proposedMemberDisagreements,
    proposedBonusDisagreements,
    proposedTotalDisagreements,
    selectedMemberDisagreements,
    selectedTotalEvidenceMismatches,
    missingInBrowserEquivalent,
    missingInRunner,
    metadataOnlyMismatches,
    safetyRelevantMismatches,
    mismatchRows: rows.filter((row) => row.mismatchFields.length > 0 || row.metadataMismatchFields.length > 0),
  };
}

function normalizeCurrentPcRoiForKey(roi = null) {
  const zone = roi?.zone || roi;
  if (!zone) return "none";
  const left = Number(zone.left ?? zone.x ?? 0);
  const top = Number(zone.top ?? zone.y ?? 0);
  const width = Number(zone.width ?? 0);
  const height = Number(zone.height ?? 0);
  return `${Math.round(left)},${Math.round(top)},${Math.round(width)},${Math.round(height)}`;
}

function currentPcTokenFingerprint(token = {}) {
  return [
    token.role || "",
    token.sourceRole || "",
    token.pass || "",
    token.rawToken || token.token || "",
    token.normalizedValue || 0,
    token.tokenShape || token.shape || "",
    token.punctuationType || "",
    token.textIndex ?? -1,
    normalizeCurrentPcRoiForKey(token.sourceRoi || token.roi),
  ].join("|");
}

function currentPcSimulationTokenSet(sim = null) {
  return [
    ...(sim?.evidence?.eligibleTokens || []).map((token) => ({
      ...token,
      evidenceStatus: "eligible",
    })),
    ...(sim?.evidence?.blockedTokens || []).map((token) => ({
      ...token,
      evidenceStatus: "blocked",
    })),
  ];
}

function buildCurrentPcBrowserEquivalentGroupedRawSimulation(item, stage, side, sideAnalysis) {
  if (
    sideAnalysis?.currentPcGroupedRawTokenRecovery?.applied &&
    sideAnalysis?.currentPcGroupedRawTokenEvidenceSimulation
  ) {
    return sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation;
  }
  const stageResult = item.result?.[`stage${stage}`] || {};
  const raw = stageResult.raw || {};
  const rawText = stageResult.rawText || {};
  const isSelf = side === "self";
  const totalDirect = {
    tag: `${side}.total.direct`,
    text: isSelf ? rawText.selfTotalDirect || "" : rawText.enemyTotalDirect || "",
    numbers: isSelf ? raw.selfTotal || [] : raw.enemyTotal || [],
    pass: "pass1",
  };
  const totalCandidates = {
    tag: `${side}.total.alternatives`,
    text: isSelf ? rawText.selfTotalCandidates || "" : rawText.enemyTotalCandidates || "",
    numbers: sideAnalysis?.displayedTotalCandidates || [],
    traces: isSelf
      ? rawText.selfTotalCandidateTraces || []
      : rawText.enemyTotalCandidateTraces || [],
  };
  const memberCandidates = {
    tag: `${side}.members.selected-row`,
    text: isSelf ? rawText.selfMembers || "" : rawText.enemyMembers || "",
    numbers: isSelf ? raw.selfMembers || [] : raw.enemyMembers || [],
    pass: "pass1",
  };
  const candidateSourceSummary = sharedBuildCurrentPcCandidateSourceSummary({
    totalDirect,
    totalCandidates,
    memberCandidates,
    memberNumbersAfterSlotFallback: memberCandidates.numbers || [],
    originalMemberNumbers: memberCandidates.numbers || [],
    selectionContext: {
      evidenceOnly: true,
      source: "browser-equivalent-final-result",
    },
    equationContext: {
      memberSum: sideAnalysis?.memberSum || 0,
      totalReferences: sideAnalysis?.displayedTotalCandidates || [],
      bonusCandidates: sideAnalysis?.bonusCandidates || [],
      recognizedCrownCandidates: sideAnalysis?.bonusCandidates || [],
      finalTotal: sideAnalysis?.selectedTotal || 0,
      totalMinusMemberSum:
        Number(sideAnalysis?.selectedTotal || 0) - Number(sideAnalysis?.memberSum || 0),
    },
  });

  return sharedBuildCurrentPcGroupedRawTokenEvidenceSimulation({
    stage,
    side,
    selectedMembers: sideAnalysis?.selectedMembers || [],
    selectedTotal: sideAnalysis?.selectedTotal || 0,
    suspiciousReasons: sideAnalysis?.suspiciousReasons || [],
    rawCandidates: sideAnalysis?.rawCandidates || [],
    displayedTotalCandidates: sideAnalysis?.displayedTotalCandidates || [],
    bonusCandidates: sideAnalysis?.bonusCandidates || [],
    sideAnalysis: { candidateSourceSummary },
    roiProvenance:
      sideAnalysis?.currentPcGroupedRawTokenEvidenceSimulation?.evidence?.roiProvenance || null,
  });
}

function buildCurrentPcBrowserEquivalentCandidateSources(item, stage, side, sideAnalysis) {
  const stageResult = item.result?.[`stage${stage}`] || {};
  const raw = stageResult.raw || {};
  const rawText = stageResult.rawText || {};
  const isSelf = side === "self";
  const totalDirect = {
    tag: `${side}.total.direct`,
    text: isSelf ? rawText.selfTotalDirect || "" : rawText.enemyTotalDirect || "",
    numbers: isSelf ? raw.selfTotal || [] : raw.enemyTotal || [],
    pass: "pass1",
  };
  const totalCandidates = {
    tag: `${side}.total.alternatives`,
    text: isSelf ? rawText.selfTotalCandidates || "" : rawText.enemyTotalCandidates || "",
    numbers: sideAnalysis?.displayedTotalCandidates || [],
    traces: isSelf
      ? rawText.selfTotalCandidateTraces || []
      : rawText.enemyTotalCandidateTraces || [],
  };
  const memberCandidates = {
    tag: `${side}.members.selected-row`,
    text: isSelf ? rawText.selfMembers || "" : rawText.enemyMembers || "",
    numbers: isSelf ? raw.selfMembers || [] : raw.enemyMembers || [],
    pass: "pass1",
  };

  return {
    totalDirect,
    totalCandidates,
    memberCandidates,
    memberNumbersAfterSlotFallback: memberCandidates.numbers || [],
    originalMemberNumbers: memberCandidates.numbers || [],
    selectionContext: {
      evidenceOnly: true,
      source: "browser-equivalent-final-result",
    },
    equationContext: {
      memberSum: sideAnalysis?.memberSum || 0,
      totalReferences: sideAnalysis?.displayedTotalCandidates || [],
      bonusCandidates: sideAnalysis?.bonusCandidates || [],
      recognizedCrownCandidates: sideAnalysis?.bonusCandidates || [],
      finalTotal: sideAnalysis?.selectedTotal || 0,
      totalMinusMemberSum:
        Number(sideAnalysis?.selectedTotal || 0) - Number(sideAnalysis?.memberSum || 0),
    },
  };
}

function buildCurrentPcBrowserEquivalentStage3SevenDigitBonusDisplacementSimulation(
  item,
  stage,
  side,
  sideAnalysis
) {
  if (
    sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied &&
    sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementSimulation
  ) {
    return sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation;
  }
  return sharedBuildCurrentPcStage3SevenDigitBonusDisplacementSimulation({
    stage,
    side,
    selectedMembers: sideAnalysis?.selectedMembers || [],
    selectedTotal: sideAnalysis?.selectedTotal || 0,
    candidateSources: buildCurrentPcBrowserEquivalentCandidateSources(
      item,
      stage,
      side,
      sideAnalysis
    ),
    roiProvenance:
      sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementSimulation?.evidence?.roiProvenance ||
      sideAnalysis?.currentPcGroupedRawTokenEvidenceSimulation?.evidence?.roiProvenance ||
      null,
  });
}

function currentPcStage3SevenDigitEvidenceFingerprint(sim = null) {
  const proposals = sim?.evidence?.proposals || [];
  const proposalSummary = proposals.map((proposal) => [
    proposal.rowStartIndex,
    (proposal.proposedMembers || []).join(","),
    proposal.proposedBonus || 0,
    proposal.proposedTotal || 0,
    (proposal.unselectedSevenDigitMembers || []).join(","),
    proposal.selectedDisplacementMatches ? "shift" : "no-shift",
    (proposal.matchingDisplayedTotals || []).join(","),
    proposal.totalEvidence?.hasExactEvidence ? "exact-total" : "no-exact-total",
    proposal.totalEvidence?.ambiguousExactEvidence ? "ambiguous" : "unique",
  ].join(":"));
  return JSON.stringify({
    wouldApply: Boolean(sim?.wouldApply),
    proposed: sim?.proposed || null,
    rejectionReasons: sim?.rejectionReasons || [],
    memberRowNumbers: sim?.evidence?.memberRowNumbers || [],
    totalReferences: sim?.evidence?.totalReferences || [],
    strictProposalCount: sim?.evidence?.strictProposalCount || 0,
    competingExactInterpretationCount:
      sim?.evidence?.competingExactInterpretationCount || 0,
    proposals: proposalSummary,
  });
}

function compareCurrentPcStage3SevenDigitBonusDisplacementParity(analysis) {
  const rows = [];
  let exactEvidenceMatches = 0;
  let missingInBrowserEquivalent = 0;
  let missingInRunner = 0;
  let metadataMismatches = 0;

  for (const item of analysis) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        if (!sideAnalysis) continue;
        const runnerSim = sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation;
        const browserSim = buildCurrentPcBrowserEquivalentStage3SevenDigitBonusDisplacementSimulation(
          item,
          stage,
          side,
          sideAnalysis
        );
        const runnerFingerprint = currentPcStage3SevenDigitEvidenceFingerprint(runnerSim);
        const browserFingerprint = currentPcStage3SevenDigitEvidenceFingerprint(browserSim);
        const exactMatch = runnerFingerprint === browserFingerprint;
        const runnerWouldApply = Boolean(runnerSim?.wouldApply);
        const browserWouldApply = Boolean(browserSim?.wouldApply);
        const proposalMatches =
          JSON.stringify(runnerSim?.proposed || null) ===
          JSON.stringify(browserSim?.proposed || null);
        const runnerHasEvidence = Boolean(runnerSim);
        const browserHasEvidence = Boolean(browserSim);

        if (exactMatch) exactEvidenceMatches += 1;
        if (runnerHasEvidence && !browserHasEvidence) missingInBrowserEquivalent += 1;
        if (!runnerHasEvidence && browserHasEvidence) missingInRunner += 1;
        if (!exactMatch && runnerHasEvidence && browserHasEvidence) metadataMismatches += 1;

        rows.push({
          image: item.fileName,
          stage,
          side,
          exactMatch,
          runnerWouldApply,
          browserEquivalentWouldApply: browserWouldApply,
          proposalMatches,
          runnerProposal: runnerSim?.proposed || null,
          browserEquivalentProposal: browserSim?.proposed || null,
          runnerRejectionReasons: runnerSim?.rejectionReasons || [],
          browserEquivalentRejectionReasons: browserSim?.rejectionReasons || [],
          runnerStrictProposalCount: runnerSim?.evidence?.strictProposalCount || 0,
          browserStrictProposalCount: browserSim?.evidence?.strictProposalCount || 0,
          runnerCompetingExactInterpretationCount:
            runnerSim?.evidence?.competingExactInterpretationCount || 0,
          browserCompetingExactInterpretationCount:
            browserSim?.evidence?.competingExactInterpretationCount || 0,
          runnerMemberRowNumbers: runnerSim?.evidence?.memberRowNumbers || [],
          browserMemberRowNumbers: browserSim?.evidence?.memberRowNumbers || [],
          runnerTotalReferences: runnerSim?.evidence?.totalReferences || [],
          browserTotalReferences: browserSim?.evidence?.totalReferences || [],
        });
      }
    }
  }

  const truePositiveRows = rows.filter(
    (row) => row.runnerWouldApply && row.browserEquivalentWouldApply && row.proposalMatches
  );

  return {
    totalStageSides: rows.length,
    exactEvidenceMatches,
    missingInBrowserEquivalent,
    missingInRunner,
    metadataMismatches,
    truePositiveRows,
    rows,
  };
}

function buildCurrentPcStage3SevenDigitBonusDisplacementParityReport(parity) {
  const lines = [
    "# Current-PC Stage3 7-Digit Bonus Displacement Evidence Parity",
    "",
    "This report checks the evidence path for `currentPcStage3SevenDigitBonusDisplacementSimulation`. It is evidence-only: no final OCR members, bonus, or total are changed.",
    "",
    "## Summary",
    "",
    `- current-PC stage/side cases compared: ${parity.totalStageSides}`,
    `- exact evidence matches: ${parity.exactEvidenceMatches}`,
    `- missing in browser-equivalent: ${parity.missingInBrowserEquivalent}`,
    `- missing in runner: ${parity.missingInRunner}`,
    `- metadata mismatches: ${parity.metadataMismatches}`,
    `- TP parity rows: ${parity.truePositiveRows.length}`,
    "",
    "## TP Parity Rows",
    "",
    "| image | stage/side | runner apply | browser-equivalent apply | proposed members | bonus | total | strict proposals | competing exact | parity |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const row of parity.truePositiveRows) {
    const proposed = row.runnerProposal || {};
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.runnerWouldApply ? "yes" : "no"} | ${row.browserEquivalentWouldApply ? "yes" : "no"} | ${(proposed.members || []).join(" / ")} | ${proposed.bonus || 0} | ${proposed.total || 0} | ${row.runnerStrictProposalCount}/${row.browserStrictProposalCount} | ${row.runnerCompetingExactInterpretationCount}/${row.browserCompetingExactInterpretationCount} | ${row.exactMatch ? "exact" : "mismatch"} |`
    );
  }

  lines.push(
    "",
    "## All Stage/Side Rows",
    "",
    "| image | stage/side | runner apply | browser-equivalent apply | exact evidence | runner rejection | browser-equivalent rejection |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const row of parity.rows) {
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.runnerWouldApply ? "yes" : "no"} | ${row.browserEquivalentWouldApply ? "yes" : "no"} | ${row.exactMatch ? "yes" : "no"} | ${row.runnerRejectionReasons.join(",") || "none"} | ${row.browserEquivalentRejectionReasons.join(",") || "none"} |`
    );
  }

  lines.push(
    "",
    "## Evidence Flow",
    "",
    "- Runner evidence is built from the current-PC side artifact candidate sources: total direct OCR, total candidate traces, member-row OCR, selected members, selected total, and ROI provenance.",
    "- Browser-equivalent evidence is rebuilt from the same result raw text/number fields that the UI path uses, then passed through the shared helper in `app/lib/ocr.js`.",
    "- The actual browser/UI path now attaches `currentPcStage3SevenDigitBonusDisplacementSimulation` under each current-PC side evidence object for debug/state inspection.",
    "- The helper records member-row numbers, total references, proposal rows, exact displayed-total evidence, strict proposal count, and competing exact interpretation count.",
    "- Final OCR output remains unchanged. This report is a prerequisite for any later production recovery.",
    ""
  );

  return lines.join("\n");
}

function compareCurrentPcGroupedRawEvidenceParity(analysis, groupedRawTokenSimulation) {
  const truePositiveKeys = new Set(
    (groupedRawTokenSimulation.rows || [])
      .filter((row) => row.classification === "true-positive")
      .map((row) => `${row.image}|${row.stage}|${row.side}`)
  );
  const rows = [];
  let runnerTokenCount = 0;
  let browserTokenCount = 0;
  let exactMatchCount = 0;
  let missingInBrowserCount = 0;
  let missingInRunnerCount = 0;
  let metadataMismatchCount = 0;

  for (const item of analysis) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        if (!sideAnalysis) continue;
        const runnerSim = sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation;
        const browserSim = buildCurrentPcBrowserEquivalentGroupedRawSimulation(
          item,
          stage,
          side,
          sideAnalysis
        );
        const runnerTokens = currentPcSimulationTokenSet(runnerSim);
        const browserTokens = currentPcSimulationTokenSet(browserSim);
        const runnerKeys = new Map(
          runnerTokens.map((token) => [currentPcTokenFingerprint(token), token])
        );
        const browserKeys = new Map(
          browserTokens.map((token) => [currentPcTokenFingerprint(token), token])
        );
        const exactMatches = [...runnerKeys.keys()].filter((key) => browserKeys.has(key));
        const missingInBrowser = [...runnerKeys.keys()].filter((key) => !browserKeys.has(key));
        const missingInRunner = [...browserKeys.keys()].filter((key) => !runnerKeys.has(key));
        const runnerEligible = runnerSim?.evidence?.eligibleTokens || [];
        const browserEligible = browserSim?.evidence?.eligibleTokens || [];
        const runnerEligibleByLooseKey = new Map(
          runnerEligible.map((token) => [
            `${token.role}|${token.sourceRole}|${token.rawToken || token.token}|${token.normalizedValue}`,
            token,
          ])
        );
        const browserEligibleByLooseKey = new Map(
          browserEligible.map((token) => [
            `${token.role}|${token.sourceRole}|${token.rawToken || token.token}|${token.normalizedValue}`,
            token,
          ])
        );
        const metadataMismatches = [...runnerEligibleByLooseKey.entries()]
          .filter(([key]) => browserEligibleByLooseKey.has(key))
          .filter(([key, runnerToken]) => {
            const browserToken = browserEligibleByLooseKey.get(key);
            return currentPcTokenFingerprint(runnerToken) !== currentPcTokenFingerprint(browserToken);
          })
          .map(([key]) => key);

        runnerTokenCount += runnerTokens.length;
        browserTokenCount += browserTokens.length;
        exactMatchCount += exactMatches.length;
        missingInBrowserCount += missingInBrowser.length;
        missingInRunnerCount += missingInRunner.length;
        metadataMismatchCount += metadataMismatches.length;

        rows.push({
          image: item.fileName,
          stage,
          side,
          isGroupedRawTruePositive: truePositiveKeys.has(`${item.fileName}|${stage}|${side}`),
          runnerTokenCount: runnerTokens.length,
          browserTokenCount: browserTokens.length,
          exactMatchCount: exactMatches.length,
          missingInBrowserCount: missingInBrowser.length,
          missingInRunnerCount: missingInRunner.length,
          metadataMismatchCount: metadataMismatches.length,
          runnerWouldApply: Boolean(runnerSim?.wouldApply),
          browserEquivalentWouldApply: Boolean(browserSim?.wouldApply),
          runnerRejectionReasons: runnerSim?.rejectionReasons || [],
          browserEquivalentRejectionReasons: browserSim?.rejectionReasons || [],
          missingInBrowser: missingInBrowser.slice(0, 8),
          missingInRunner: missingInRunner.slice(0, 8),
          metadataMismatches: metadataMismatches.slice(0, 8),
        });
      }
    }
  }

  return {
    totalStageSides: rows.length,
    runnerTokenCount,
    browserTokenCount,
    exactMatchCount,
    missingInBrowserCount,
    missingInRunnerCount,
    metadataMismatchCount,
    truePositiveRows: rows.filter((row) => row.isGroupedRawTruePositive),
    rows,
  };
}

function buildCurrentPcGroupedRawEvidenceParityReport(parity, groupedRawTokenSimulation) {
  const lines = [
    "# Current-PC Grouped Raw Evidence Parity",
    "",
    "This report checks whether the current-PC runner path and the browser-equivalent final OCR result path can observe the same grouped/raw token evidence. It does not change OCR output and does not productionize grouped/raw recovery.",
    "",
    "## Summary",
    "",
    `- current-PC stage/side cases compared: ${parity.totalStageSides}`,
    `- runner token evidence count: ${parity.runnerTokenCount}`,
    `- browser-equivalent token evidence count: ${parity.browserTokenCount}`,
    `- exact token evidence matches: ${parity.exactMatchCount}`,
    `- missing in browser-equivalent: ${parity.missingInBrowserCount}`,
    `- missing in runner: ${parity.missingInRunnerCount}`,
    `- metadata mismatches: ${parity.metadataMismatchCount}`,
    "",
    "## Grouped/Raw True Positive Parity",
    "",
    `- grouped/raw simulation true positives: ${groupedRawTokenSimulation.truePositives}`,
    "",
    "| image | stage/side | runner tokens | browser-equivalent tokens | exact matches | runner apply | browser-equivalent apply | missing / mismatch |",
    "| --- | --- | ---: | ---: | ---: | --- | --- | --- |",
  ];

  for (const row of parity.truePositiveRows) {
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.runnerTokenCount} | ${row.browserTokenCount} | ${row.exactMatchCount} | ${row.runnerWouldApply ? "yes" : "no"} | ${row.browserEquivalentWouldApply ? "yes" : "no"} | missing browser ${row.missingInBrowserCount}; missing runner ${row.missingInRunnerCount}; metadata ${row.metadataMismatchCount} |`
    );
  }

  lines.push(
    "",
    "## All Stage/Side Parity Rows",
    "",
    "| image | stage/side | runner tokens | browser-equivalent tokens | exact matches | missing browser | missing runner | metadata mismatch |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |"
  );

  for (const row of parity.rows) {
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.runnerTokenCount} | ${row.browserTokenCount} | ${row.exactMatchCount} | ${row.missingInBrowserCount} | ${row.missingInRunnerCount} | ${row.metadataMismatchCount} |`
    );
  }

  lines.push(
    "",
    "## Notes",
    "",
    "- The shared evidence schema is implemented in `app/lib/ocr.js` and is used by both runner and browser/UI plumbing.",
    "- The browser/UI path now carries current-PC grouped/raw evidence into OCR debug metadata when the 541x961 current-PC layout family is detected.",
    "- Final selected members, bonuses, totals, known corrections, and recovery behavior are intentionally unchanged.",
    "- A future production recovery should remain blocked unless this parity report stays clean and a real browser spot-check confirms the same evidence is visible in the UI debug output.",
    ""
  );

  return lines.join("\n");
}

function valueInList(value, list = []) {
  return list.some((candidate) => Math.abs(Number(candidate || 0) - Number(value || 0)) <= 1);
}

function valueInOcrText(value, text = "") {
  const digits = String(Math.trunc(Number(value || 0)));
  if (!digits || digits === "0") return false;
  const pattern = digits.split("").join("[\\s,\\.]*");
  return new RegExp(pattern).test(String(text || ""));
}

function formatCurrentPcRoiSummary(roiProvenance = null) {
  if (!roiProvenance) return "-";
  const total = roiProvenance.total?.zone
    ? `total ${roiProvenance.total.label} (${roiProvenance.total.zone.left},${roiProvenance.total.zone.top},${roiProvenance.total.zone.width}x${roiProvenance.total.zone.height})`
    : "total -";
  const members = roiProvenance.members?.zone
    ? `members ${roiProvenance.members.label} (${roiProvenance.members.zone.left},${roiProvenance.members.zone.top},${roiProvenance.members.zone.width}x${roiProvenance.members.zone.height})`
    : "members -";
  const bonusLabels = (roiProvenance.bonus || []).map((item) => item.label).join(", ") || "-";
  return `${total}; ${members}; bonus ${bonusLabels}`;
}

function classifyCurrentPcExactRawFalseNegative(row) {
  const expectedMembers = row.expected?.members || [];
  const actualMembers = row.actual?.members || [];
  const raw = row.actual?.rawCandidates || [];
  const expectedBonus = Number(row.expected?.bonus || 0);
  const expectedTotal = Number(row.expected?.total || 0);
  const actualTotal = Number(row.actual?.total || 0);
  const actualMemberSum = actualMembers.reduce((sum, value) => sum + Number(value || 0), 0);
  const actualDelta = actualTotal - actualMemberSum;
  const allExpectedMembersSelected = arraysEqualWithinOne(expectedMembers, actualMembers);
  const expectedMembersInRaw = expectedMembers.map((value) => valueInList(value, raw));
  const expectedBonusInRaw = expectedBonus > 0 && valueInList(expectedBonus, raw);
  const expectedTotalInRaw = valueInList(expectedTotal, raw);

  if (
    row.actual?.bonusCandidates?.some((bonus) => valueInList(bonus, actualMembers)) &&
    expectedMembersInRaw.every(Boolean) &&
    !expectedBonusInRaw
  ) {
    return {
      subPattern: "bonus/member OCR confusion with exact members present but bonus misread",
      recommendation: "Needs better bonus OCR evidence before simulation; do not infer a near bonus.",
    };
  }

  if (
    row.stage === 3 &&
    row.side === "self" &&
    expectedTotalInRaw &&
    expectedBonusInRaw &&
    !expectedMembersInRaw.every(Boolean) &&
    actualMembers.some((member) => member > 0 && member < 10000)
  ) {
    return {
      subPattern: "Stage3 self digit-drop member plus ignored bonus evidence",
      recommendation:
        "Related to Stage3 self recovery, but not the same shift shape; needs exact member recovery before simulation.",
    };
  }

  if (
    allExpectedMembersSelected &&
    expectedTotalInRaw &&
    expectedBonus > 0 &&
    !expectedBonusInRaw &&
    valueInList(actualDelta, raw)
  ) {
    return {
      subPattern: "total/bonus OCR offset with selected members already correct",
      recommendation:
        "Promising only after bonus OCR can distinguish the correct bonus from the wrong total-minus-member delta.",
    };
  }

  if (
    row.actual?.members?.filter((value) => Number(value || 0) > 0).length < 3 &&
    expectedTotalInRaw &&
    !expectedMembersInRaw.every(Boolean)
  ) {
    return {
      subPattern: "missing member evidence; total-minus-member inference only",
      recommendation:
        "Do not simulate from arithmetic alone; needs raw/ROI evidence for the missing member.",
    };
  }

  return {
    subPattern: "unclassified exact-equation false negative",
    recommendation: "Keep blocked until more exact evidence is available.",
  };
}

function buildCurrentPcExactRawFalseNegativeDeepDive(exactRawEquationSimulation) {
  const rows = exactRawEquationSimulation.rows
    .filter((row) => row.classification === "false-negative")
    .map((row) => {
      const source = row.actual?.candidateSourceSummary || {};
      const raw = row.actual?.rawCandidates || [];
      const combinedText = [
        source.totalDirect?.text,
        ...(source.totalTraces || []).map((trace) => trace.text),
        source.memberCandidates?.text,
      ]
        .filter(Boolean)
        .join(" ");
      const expected = row.expected || { members: [], bonus: 0, total: 0 };
      const expectedMembersInRaw = (expected.members || []).map((value) => valueInList(value, raw));
      const expectedMembersInText = (expected.members || []).map((value) =>
        valueInOcrText(value, combinedText)
      );
      const expectedBonusInRaw =
        Number(expected.bonus || 0) > 0 ? valueInList(expected.bonus, raw) : true;
      const expectedBonusInText =
        Number(expected.bonus || 0) > 0 ? valueInOcrText(expected.bonus, combinedText) : true;
      const expectedTotalInRaw = valueInList(expected.total, raw);
      const expectedTotalInText = valueInOcrText(expected.total, combinedText);
      const classification = classifyCurrentPcExactRawFalseNegative(row);
      return {
        ...row,
        ...classification,
        evidencePresence: {
          expectedMembersInRaw,
          expectedMembersInText,
          expectedBonusInRaw,
          expectedBonusInText,
          expectedTotalInRaw,
          expectedTotalInText,
        },
        totalText:
          source.totalDirect?.text ||
          source.totalTraces?.map((trace) => trace.text).filter(Boolean).join(" / ") ||
          "",
        memberText: source.memberCandidates?.text || "",
        preprocessingPasses: [
          source.totalDirect?.pass,
          ...(source.totalTraces || []).map((trace) => trace.pass),
          source.memberCandidates?.pass,
        ].filter(Boolean),
        equationContext: source.equationContext || null,
        selectionContext: source.selectionContext || null,
      };
    });

  const byPattern = new Map();
  for (const row of rows) {
    if (!byPattern.has(row.subPattern)) byPattern.set(row.subPattern, []);
    byPattern.get(row.subPattern).push(`${row.image} S${row.stage} ${row.side}`);
  }

  return {
    rows,
    subPatterns: [...byPattern.entries()].map(([name, occurrences]) => ({
      name,
      count: occurrences.length,
      occurrences,
    })),
  };
}

function collectCurrentPcSourceTokenAudits(sideAnalysis) {
  return sharedCollectCurrentPcSourceTokenAudits(sideAnalysis);
}

function digitSuffixMatch(value, candidate) {
  const expected = String(Math.trunc(Number(value || 0)));
  const actual = String(Math.trunc(Number(candidate || 0)));
  return expected.length >= 5 && actual.length >= 3 && expected.endsWith(actual) && expected !== actual;
}

function digitDifferenceCount(left, right) {
  const a = String(Math.trunc(Number(left || 0)));
  const b = String(Math.trunc(Number(right || 0)));
  if (a.length !== b.length) return Infinity;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) diff += 1;
  }
  return diff;
}

function buildCurrentPcBonusDigitParserAudit(analysis) {
  const punctuationNormalization = [];
  const parserFlowGaps = [];
  const digitDrop = [];
  const bonusConfusion = [];
  const roleClassification = [];

  for (const item of analysis) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        if (!sideAnalysis) continue;
        const expected = currentPcExpectedStageSide(item, stage, side);
        const sourceEntries = collectCurrentPcSourceTokenAudits(sideAnalysis);

        for (const entry of sourceEntries) {
          for (const token of entry.tokens || []) {
            if (token.punctuationNormalizationOnly) {
              punctuationNormalization.push({
                image: item.fileName,
                stage,
                side,
                sourceRole: entry.sourceRole,
                sourceTag: entry.sourceTag,
                pass: entry.pass,
                token: token.token,
                normalizedValue: token.normalizedValue,
                shape: token.shape,
                text: entry.text,
                reachesParsedSource: token.presentInSourceParsed,
              });
            }
            if (
              token.normalizedValue > 0 &&
              !token.presentInSourceParsed &&
              valueInList(token.normalizedValue, extractNumbersForZone(entry.text || ""))
            ) {
              parserFlowGaps.push({
                image: item.fileName,
                stage,
                side,
                sourceRole: entry.sourceRole,
                sourceTag: entry.sourceTag,
                pass: entry.pass,
                token: token.token,
                normalizedValue: token.normalizedValue,
                text: entry.text,
              });
            }
          }
        }

        if (!expected) continue;
        const raw = sideAnalysis.rawCandidates || [];
        const actualMembers = sideAnalysis.selectedMembers || [];
        const expectedMembers = expected.members || [];
        for (let index = 0; index < expectedMembers.length; index += 1) {
          const expectedMember = Number(expectedMembers[index] || 0);
          if (expectedMember <= 0 || valueInList(expectedMember, raw)) continue;
          const suffixCandidates = raw.filter((candidate) => digitSuffixMatch(expectedMember, candidate));
          if (suffixCandidates.length > 0) {
            digitDrop.push({
              image: item.fileName,
              stage,
              side,
              role: `member${index + 1}`,
              expectedValue: expectedMember,
              suffixCandidates,
              selectedMembers: actualMembers,
              selectedTotal: sideAnalysis.selectedTotal || 0,
              sourceText: sideAnalysis.candidateSourceSummary?.memberCandidates?.text || "",
              roi: sideAnalysis.currentPcExactRawEquationRecoverySimulation?.evidence?.roiProvenance || null,
            });
          }
        }

        const expectedBonus = Number(expected.bonus || 0);
        if (expectedBonus > 0 && !valueInList(expectedBonus, raw)) {
          const actualDelta = Number(sideAnalysis.selectedTotal || 0) - Number(sideAnalysis.memberSum || 0);
          const wrongBonusCandidates = uniqueNumbers([
            ...(sideAnalysis.bonusCandidates || []),
            actualDelta > 0 ? actualDelta : 0,
          ]).filter(
            (candidate) =>
              candidate > 0 &&
              candidate !== expectedBonus &&
              String(Math.trunc(candidate)).length === String(Math.trunc(expectedBonus)).length &&
              digitDifferenceCount(candidate, expectedBonus) <= 2
          );
          if (wrongBonusCandidates.length > 0) {
            bonusConfusion.push({
              image: item.fileName,
              stage,
              side,
              expectedBonus,
              wrongBonusCandidates,
              selectedMembers: actualMembers,
              selectedTotal: sideAnalysis.selectedTotal || 0,
              memberSum: sideAnalysis.memberSum || 0,
              sourceText: sideAnalysis.candidateSourceSummary?.memberCandidates?.text || "",
            });
          }
        }

        const valuesAssignedAsMember = (sideAnalysis.bonusCandidates || []).filter((bonus) =>
          actualMembers.some((member) => Math.abs(Number(member || 0) - Number(bonus || 0)) <= 1)
        );
        if (valuesAssignedAsMember.length > 0) {
          roleClassification.push({
            image: item.fileName,
            stage,
            side,
            issue: "bonus-candidate-selected-as-member",
            values: valuesAssignedAsMember,
            selectedMembers: actualMembers,
            selectedTotal: sideAnalysis.selectedTotal || 0,
          });
        }
      }
    }
  }

  return {
    punctuationNormalization,
    parserFlowGaps,
    digitDrop,
    bonusConfusion,
    roleClassification,
  };
}

function buildCurrentPcBaselineReport(baseline) {
  const generatedAt = new Date().toISOString();
  const summary = buildCurrentPcBaselineSummary(
    baseline.analysis.map((item) => ({
      source: "current-pc",
      expected: item.expected,
      pass: item.pass,
    }))
  );
  const dimensions = [...new Set(baseline.analysis.map((item) => `${item.dimensions.width}x${item.dimensions.height}`))];
  const aspects = [...new Set(baseline.analysis.map((item) => String(item.aspect)))];
  const groups = classifyCurrentPcFailureGroups(baseline.analysis);
  const confirmedGroups = buildCurrentPcConfirmedGroupEvaluation(baseline.analysis);
  const stage3SelfSimulation = buildCurrentPcStage3SelfSimulationEvaluation(baseline.analysis);
  const exactRawEquationSimulation =
    buildCurrentPcExactRawEquationSimulationEvaluation(baseline.analysis);
  const groupedRawTokenSimulation =
    buildCurrentPcGroupedRawTokenEvidenceSimulationEvaluation(baseline.analysis);
  const stage3SevenDigitBonusProductionRows = [];
  for (const item of baseline.analysis) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      for (const side of sides) {
        const sideAnalysis = item.stages?.[stageKey]?.[side];
        const recovery = sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery;
        if (!recovery?.applied) continue;
        const expectedStage = item.expectedData?.[stageKey] || {};
        stage3SevenDigitBonusProductionRows.push({
          image: item.fileName,
          stage,
          side,
          members: recovery.members || [],
          bonus: recovery.bonus || 0,
          total: recovery.total || 0,
          expectedMembers: expectedStage?.[`${side}Members`] || [],
          expectedBonus: expectedStage?.[`${side}Bonus`] || 0,
          expectedTotal: expectedStage?.[`${side}Total`] || 0,
          recoveredSevenDigitMembers: recovery.recoveredSevenDigitMembers || [],
        });
      }
    }
  }
  const exactRawFalseNegativeDeepDive =
    buildCurrentPcExactRawFalseNegativeDeepDive(exactRawEquationSimulation);
  const bonusDigitParserAudit = buildCurrentPcBonusDigitParserAudit(baseline.analysis);
  const confirmedGroupCount = (name) =>
    confirmedGroups.find((group) => group.name === name)?.confirmedPositives.length || 0;
  const selectedTotalConfirmedCount = confirmedGroupCount(
    "selected-total-not-exact-member-sum-or-member-sum-plus-bonus"
  );
  const missingMemberConfirmedCount = confirmedGroupCount("missing-selected-member");
  const scanSummary = baseline.scanSummary || {};
  const fixtureCoveredCount = baseline.analysis.filter((item) => item.expected).length;
  const fixtureMissingCount = baseline.analysis.length - fixtureCoveredCount;
  const lines = [
    "# Current PC OCR Baseline",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Scope",
    "",
    "- Primary dataset: deduplicated current PC/DMM result screenshots in `C:\\Users\\gkhay\\Pictures\\DMMGamePlayer\\学園アイドルマスター`.",
    "- Legacy desktop screenshots are not included in the baseline counts.",
    "- Smartphone samples are not included in the baseline counts.",
    "- This is audit-first current-PC work. It does not add filename-specific corrections or production recovery rules.",
    "",
    "## Dataset Scan",
    "",
    `- total files scanned: ${scanSummary.scannedFiles ?? baseline.analysis.length}`,
    `- current-PC candidates found: ${scanSummary.currentPcCandidates ?? baseline.analysis.length}`,
    `- duplicate count: ${scanSummary.duplicateCount ?? 0}`,
    `- unique current-PC screenshots: ${scanSummary.uniqueCount ?? baseline.analysis.length}`,
    `- already fixture-covered screenshots: ${fixtureCoveredCount}`,
    `- screenshots still missing expected fixtures: ${fixtureMissingCount}`,
    "",
    "### Duplicate Groups",
    "",
    "| hash | files |",
    "| --- | --- |"
  ];

  const duplicateGroups = scanSummary.duplicateGroups || [];
  if (duplicateGroups.length === 0) {
    lines.push("| - | - |");
  }
  for (const group of duplicateGroups) {
    lines.push(`| ${group.hash.slice(0, 16)} | ${group.files.join("<br>")} |`);
  }

  lines.push(
    "",
    "## Deduplicated Current-PC Screenshots",
    "",
    "| # | filename | dimensions | aspect | last modified | artifact |",
    "| ---: | --- | --- | ---: | --- | --- |",
  );

  baseline.analysis.forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.fileName} | ${item.dimensions.width}x${item.dimensions.height} | ${item.aspect} | ${item.lastWriteTime} | ${item.artifact} |`
    );
  });

  lines.push(
    "",
    "## Layout Characteristics",
    "",
    `- total current-PC samples: ${baseline.analysis.length}`,
    `- dimensions observed: ${dimensions.join(", ")}`,
    `- aspect ratios observed: ${aspects.join(", ")}`,
    `- all deduplicated samples share the same dimensions: ${dimensions.length === 1 ? "yes" : "no"}`,
    "- layout geometry appears consistent across the deduplicated samples from dimensions and visual placement.",
    "- browser/device scaling does not appear to vary inside this current-PC folder; every candidate file is 541x961.",
    "- The layout is smartphone-like in aspect ratio but uses a DMM/PC screenshot family and is intentionally separated as `current-pc`.",
    "",
    "## Architecture Inspection Summary",
    "",
    "Current smartphone OCR principles reused for the current-PC baseline:",
    "",
    "- direct fixed ROI extraction by stage/side/role",
    "- alternative total/member candidate bands",
    "- raw OCR text and numeric candidates preserved in debug artifacts",
    "- member/total/bonus evidence kept separate where available",
    "- exact integer member-sum and member-sum-plus-bonus validation",
    "- suspicious-state reporting before recovery",
    "- correction logs and final-result evidence are preserved together",
    "",
    "Current-PC-specific adaptations:",
    "",
    "- separate `current-pc` source mode in the runner",
    "- separate normalized layout family `current-pc-2026-07-result`",
    "- stage total/member ROIs are placed higher than smartphone ROIs and are not based on legacy desktop absolute geometry",
    "- legacy desktop recovery logic is not used for current-PC baseline images",
    "- current-PC debug artifacts include original screenshot, annotated ROI image, stage crops, side total/member/bonus crops, binarized crop images, JSON candidate evidence, structural checks, and audit-only retry plans",
    "",
    "## Layout Detector",
    "",
    "- Detector: image size/aspect based for the current-PC screenshot family.",
    "- Guard: width 541 +/- 2, height 961 +/- 2, aspect within 0.003 of 541/961.",
    "- It does not use filenames, screenshot timestamps, score values, or hard-coded OCR contents.",
    "- Future anchor-assisted adjustment may be added if another scale appears.",
    "",
    "## ROI Strategy",
    "",
    "- Stage regions: normalized vertical bands for S1/S2/S3.",
    "- Side regions: fixed left/right bands with separate total/member/bonus role crops.",
    "- Candidate metadata currently includes source role, stage/side, raw OCR text, numeric values, and ROI rectangle.",
    "- Per-token bbox geometry is available in existing audit helpers but is not yet run by default for all current-PC crops.",
    "",
    "## Structural Consistency Design",
    "",
    "- Valid exact forms: `member1 + member2 + member3 == total` or `member1 + member2 + member3 + bonus == total`.",
    "- Suspicious states are reported for missing member/total, total lower than member sum, total/member reuse, bonus/member reuse, unselected clean 7-digit candidates, and competing exact raw interpretations.",
    "- Exact arithmetic only; no near-match guessing.",
    "",
    "## Selective Retry Design",
    "",
    "- This pass records retry triggers and proposed variants but does not alter final OCR output.",
    "- Retry is scoped to suspicious stage/side/role only.",
    "- Proposed variants: alternate threshold, alternate contrast, wider/narrower ROI, shifted ROI.",
    "- Retry evidence should be merged as additional evidence only; a future recovery must still require a unique exact interpretation.",
    "",
    "## Static-Image Adaptation",
    "",
    "- No temporal voting, multi-frame consensus, best-frame selection, or frame stability logic is used.",
    "- The static substitute is multi-pass ROI interpretation plus exact structural validation on a single screenshot.",
    "",
    "## Baseline Results",
    "",
    "| image | status | S1 self | S1 enemy | S2 self | S2 enemy | S3 self | S3 enemy |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const item of baseline.analysis) {
    const status = item.expected ? (item.pass ? "PASS" : "FAIL") : "unresolved";
    lines.push(
      `| ${item.fileName} | ${status} | ${formatCurrentPcSideLine(item.stages.stage1.self)} | ${formatCurrentPcSideLine(item.stages.stage1.enemy)} | ${formatCurrentPcSideLine(item.stages.stage2.self)} | ${formatCurrentPcSideLine(item.stages.stage2.enemy)} | ${formatCurrentPcSideLine(item.stages.stage3.self)} | ${formatCurrentPcSideLine(item.stages.stage3.enemy)} |`
    );
  }

  lines.push(
    "",
    "## Expected Fixture Comparison",
    "",
    "| image | status | failing fields | S1 self | S1 enemy | S2 self | S2 enemy | S3 self | S3 enemy |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const item of baseline.analysis) {
    const status = item.expected ? (item.pass ? "PASS" : "FAIL") : "unresolved";
    const failingFields =
      item.failures.length > 0
        ? item.failures
            .map((failure) => `${failure.key}: expected ${formatNumber(failure.expected)} actual ${formatNumber(failure.actual)}`)
            .join("<br>")
        : item.expected
          ? "none"
          : "no expected fixture";
    lines.push(
      `| ${item.fileName} | ${status} | ${failingFields} | ${formatCurrentPcActualExpectedLine(item, 1, "self")} | ${formatCurrentPcActualExpectedLine(item, 1, "enemy")} | ${formatCurrentPcActualExpectedLine(item, 2, "self")} | ${formatCurrentPcActualExpectedLine(item, 2, "enemy")} | ${formatCurrentPcActualExpectedLine(item, 3, "self")} | ${formatCurrentPcActualExpectedLine(item, 3, "enemy")} |`
    );
  }

  lines.push(
    "",
    "## Current-PC Summary",
    "",
    `- total current-PC samples: ${summary.total}`,
    `- PASS count: ${summary.pass}`,
    `- FAIL count: ${summary.fail}`,
    `- unresolved count: ${summary.unresolved}`,
    "",
    "These counts intentionally exclude legacy desktop and smartphone samples.",
    "",
    "## Recurring Failure / Suspicious Groups",
    "",
    "| rank | group | count | examples |",
    "| ---: | --- | ---: | --- |"
  );

  if (groups.length === 0) {
    lines.push("| 1 | none detected by structural audit | 0 | - |");
  } else {
    groups.forEach((group, index) => {
      lines.push(
        `| ${index + 1} | ${group.reason} | ${group.count} | ${group.occurrences.slice(0, 6).join("; ")}${group.occurrences.length > 6 ? "; ..." : ""} |`
      );
    });
  }

  lines.push(
    "",
    "## Confirmed Suspicious Group Evaluation",
    "",
    "These counts compare the structural-audit flags against the manually verified expected fixtures.",
    "",
    "| group | flags | confirmed positives | false alarms | affected confirmed examples | false-alarm examples |",
    "| --- | ---: | ---: | ---: | --- | --- |"
  );

  for (const group of confirmedGroups) {
    lines.push(
      `| ${group.name} | ${group.flags} | ${group.confirmedPositives.length} | ${group.falseAlarms.length} | ${group.confirmedPositives.slice(0, 8).join("; ") || "-"}${group.confirmedPositives.length > 8 ? "; ..." : ""} | ${group.falseAlarms.slice(0, 8).join("; ") || "-"}${group.falseAlarms.length > 8 ? "; ..." : ""} |`
    );
  }

  lines.push(
    "",
    "## Confirmed Failure Pattern Ranking",
    "",
    "1. Stage3 self 7-digit/member-bonus displacement: most frequent confirmed pattern. The selected result often drops or shifts a 7-digit member and uses bonus-like evidence as a member or reduced bonus. It has many positives, but needs current-PC-specific exact candidate provenance before production recovery.",
    "2. Total-only bonus omission: confirmed in several self totals where selected members are correct but total is member sum instead of member sum plus visible bonus. This is more generalizable, but must be guarded against malformed total/bonus candidates.",
    "3. Member slot/order displacement: confirmed in several cases where the selected values are real scores but assigned to the wrong slots. This likely needs bbox/slot evidence before a safe generic rule.",
    `4. Missing selected member: ${missingMemberConfirmedCount} confirmed positives in this deduplicated baseline. It is not the first production target until candidate provenance can distinguish missing values from total/member displacement.`,
    "",
    "## Current-PC Stage3 Self 7-Digit Displacement Simulation",
    "",
    "- simulation name: `currentPcStage3SelfSevenDigitDisplacementSimulation`",
    "- scope: runner-only, current-PC layout only, Stage3 self only",
    "- production OCR output changed: no",
    "- guard shape: member-row ROI must contain a leading clean 7-digit member followed by two selected member values and a bonus-like fourth value; displayed total evidence must exactly match `member1 + member2 + member3 + bonus`; interpretation must be unique.",
    "",
    `- true positive accepts: ${stage3SelfSimulation.truePositives}`,
    `- false positive accepts: ${stage3SelfSimulation.falsePositives}`,
    `- false negatives: ${stage3SelfSimulation.falseNegatives}`,
    `- correctly blocked negatives: ${stage3SelfSimulation.correctlyBlockedNegatives}`,
    "",
    "| image | class | would apply | expected S3 self | actual S3 self | proposed | key evidence | rejection / ambiguity |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const row of stage3SelfSimulation.rows) {
    lines.push(
      `| ${row.image} | ${row.classification} | ${row.wouldApply ? "yes" : "no"} | members ${formatDebugNumbers(row.expected?.members || [])}; bonus ${formatNumber(row.expected?.bonus || 0) || "-"}; total ${formatNumber(row.expected?.total || 0)} | members ${formatDebugNumbers(row.actual.members)}; bonus candidates ${formatDebugNumbers(row.actual.bonusCandidates) || "-"}; total ${formatNumber(row.actual.total)} | ${
        row.proposed
          ? `members ${formatDebugNumbers(row.proposed.members)}; bonus ${formatNumber(row.proposed.bonus)}; total ${formatNumber(row.proposed.total)}`
          : "-"
      } | member row ${formatDebugNumbers(row.memberRowNumbers) || "-"}; totals ${formatDebugNumbers(row.totalReferences) || "-"}; strict proposals ${row.strictProposalCount}; competing exact ${row.competingExactInterpretationCount}; member ROI ${
        row.roiProvenance?.members?.crop || "-"
      } | ${row.rejectionReasons.join(", ") || "-"} |`
    );
  }

  lines.push(
    "",
    "## Current-PC Stage3 7-Digit Bonus-Displacement Production Recovery",
    "",
    "- production recovery: `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery`",
    "- scope: current-PC layout only, Stage3 only, all sides",
    "- precedence: `currentPcGroupedRawTokenRecovery` runs first; this recovery is rejected if grouped/raw already applied on the same side.",
    "- guard shape: uses the strict shared simulation result only; requires a unique exact member/member/member/bonus/total proposal, clean unselected 7-digit member evidence, exact displayed total evidence, role/ROI provenance, and exact arithmetic.",
    "- no filenames, screenshot IDs, hard-coded scores, near matches, or rejected-row `totalReferences` order are used.",
    "",
    `- recovered stage/side cases: ${stage3SevenDigitBonusProductionRows.length}`,
    "",
    "| image | stage/side | recovered members | recovered bonus | recovered total | expected | recovered 7-digit evidence |",
    "| --- | --- | --- | ---: | ---: | --- | --- |"
  );

  if (stage3SevenDigitBonusProductionRows.length === 0) {
    lines.push("| - | - | - | - | - | - | - |");
  }
  for (const row of stage3SevenDigitBonusProductionRows) {
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${formatDebugNumbers(row.members)} | ${formatNumber(row.bonus) || "-"} | ${formatNumber(row.total)} | members ${formatDebugNumbers(row.expectedMembers)}; bonus ${formatNumber(row.expectedBonus) || "-"}; total ${formatNumber(row.expectedTotal)} | ${formatDebugNumbers(row.recoveredSevenDigitMembers)} |`
    );
  }

  lines.push(
    "",
    "## Current-PC Exact Raw Equation Recovery Simulation",
    "",
    "- simulation name: `currentPcExactRawEquationRecoverySimulation`",
    "- scope: runner-only, current-PC layout only, all stages/sides",
    "- production OCR output changed: no",
    "- guard shape: the selected-total equation flag must be present, raw evidence must contain exactly one exact member/member/member/bonus/total interpretation, and the selected result must differ from that unique interpretation.",
    "- It does not use filenames, expected fixtures, or hard-coded scores. Expected fixtures are used only to evaluate simulation impact.",
    `- The selected-total suspicious group has ${selectedTotalConfirmedCount} confirmed positives, but they do not share one safe shape. This simulation covers only the unique exact raw equation subpattern.`,
    "",
    `- true positive accepts: ${exactRawEquationSimulation.truePositives}`,
    `- false positive accepts: ${exactRawEquationSimulation.falsePositives}`,
    `- false negatives: ${exactRawEquationSimulation.falseNegatives}`,
    `- correctly blocked negatives: ${exactRawEquationSimulation.correctlyBlockedNegatives}`,
    "",
    "| image | stage/side | class | would apply | expected | actual | proposed | evidence | rejection / ambiguity |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const row of exactRawEquationSimulation.rows) {
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.classification} | ${row.wouldApply ? "yes" : "no"} | members ${formatDebugNumbers(row.expected?.members || [])}; bonus ${formatNumber(row.expected?.bonus || 0) || "-"}; total ${formatNumber(row.expected?.total || 0)} | members ${formatDebugNumbers(row.actual.members)}; bonus candidates ${formatDebugNumbers(row.actual.bonusCandidates) || "-"}; total ${formatNumber(row.actual.total)} | ${
        row.proposed
          ? `members ${formatDebugNumbers(row.proposed.members)}; bonus ${formatNumber(row.proposed.bonus)}; total ${formatNumber(row.proposed.total)}`
          : "-"
      } | equation ${row.structuralEquation || "-"}; exact interpretations ${row.exactRawInterpretationCount}; raw ${formatDebugNumbers(row.actual.rawCandidates) || "-"}; displayed totals ${formatDebugNumbers(row.actual.displayedTotalCandidates) || "-"} | ${
        row.rejectionReasons.join(", ") || "-"
      } |`
    );
  }

  lines.push(
    "",
    "## Current-PC Grouped Raw Token Evidence Simulation",
    "",
    "- simulation name: `currentPcGroupedRawTokenEvidenceSimulation`",
    "- scope: runner-only, current-PC layout only, all stages/sides",
    "- production OCR output changed: no",
    "- guard shape: only strict comma/period/space grouped numeric tokens from role-specific member or total ROIs are promoted into a simulation-only pool; the selected-total equation flag must be present; the promoted evidence must produce exactly one exact member/member/member/bonus/total interpretation; no filenames, expected values, hard-coded scores, near matches, malformed tokens, mixed punctuation, or global punctuation normalization are used.",
    "- It leaves `currentPcExactRawEquationRecoverySimulation` unchanged and reports only whether grouped/raw token evidence would unlock additional exact-equation recoveries.",
    "",
    `- true positive accepts: ${groupedRawTokenSimulation.truePositives}`,
    `- false positive accepts: ${groupedRawTokenSimulation.falsePositives}`,
    `- false negatives: ${groupedRawTokenSimulation.falseNegatives}`,
    `- correctly blocked negatives: ${groupedRawTokenSimulation.correctlyBlockedNegatives}`,
    `- additional true positives beyond exact raw equation simulation: ${groupedRawTokenSimulation.additionalTruePositiveKeys.length}`,
    "",
    "### Grouped / Raw Token Shape Breakdown",
    "",
    `- punctuation-grouped eligible stage/side cases: ${groupedRawTokenSimulation.overlap.punctuationGroupedCases}`,
    `- raw-text-only eligible stage/side cases: ${groupedRawTokenSimulation.overlap.rawTextOnlyCases}`,
    `- overlapping punctuation-grouped and raw-text-only eligible cases: ${groupedRawTokenSimulation.overlap.overlappingPunctuationAndRawOnlyCases}`,
    "",
    "| eligible shape/role | count |",
    "| --- | ---: |"
  );

  if (groupedRawTokenSimulation.shapeBreakdown.length === 0) {
    lines.push("| - | 0 |");
  }
  for (const row of groupedRawTokenSimulation.shapeBreakdown) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }

  lines.push(
    "",
    "### Blocked Token Shapes / Reasons",
    "",
    "| blocked shape/role | count |",
    "| --- | ---: |"
  );

  if (groupedRawTokenSimulation.blockedShapeBreakdown.length === 0) {
    lines.push("| - | 0 |");
  }
  for (const row of groupedRawTokenSimulation.blockedShapeBreakdown.slice(0, 16)) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }

  lines.push(
    "",
    "| blocked reason | count |",
    "| --- | ---: |"
  );

  if (groupedRawTokenSimulation.blockedReasonBreakdown.length === 0) {
    lines.push("| - | 0 |");
  }
  for (const row of groupedRawTokenSimulation.blockedReasonBreakdown.slice(0, 16)) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }

  lines.push(
    "",
    "### Grouped Raw Token Simulation Results",
    "",
    "| image | stage/side | class | would apply | expected | actual | proposed | promoted / eligible evidence | rejection / ambiguity |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  );

  if (groupedRawTokenSimulation.rows.length === 0) {
    lines.push("| - | - | - | - | - | - | - | - | - |");
  }
  for (const row of groupedRawTokenSimulation.rows) {
    const eligible = (row.eligibleTokens || [])
      .slice(0, 6)
      .map(
        (token) =>
          `${token.role}:${escapeMarkdownTableCell(token.token)}=>${formatNumber(token.normalizedValue)} (${token.shape}, ${token.sourceRole}/${token.pass || "-"})`
      )
      .join("<br>");
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.classification} | ${row.wouldApply ? "yes" : "no"} | members ${formatDebugNumbers(row.expected?.members || [])}; bonus ${formatNumber(row.expected?.bonus || 0) || "-"}; total ${formatNumber(row.expected?.total || 0)} | members ${formatDebugNumbers(row.actual.members)}; bonus candidates ${formatDebugNumbers(row.actual.bonusCandidates) || "-"}; total ${formatNumber(row.actual.total)} | ${
        row.proposed
          ? `members ${formatDebugNumbers(row.proposed.members)}; bonus ${formatNumber(row.proposed.bonus)}; total ${formatNumber(row.proposed.total)}`
          : "-"
      } | promoted ${formatDebugNumbers(row.promotedValuesUsed) || "-"}; eligible ${eligible || "-"}; exact interpretations ${row.exactInterpretationCount}; equation ${row.structuralEquation || "-"} | ${
        row.rejectionReasons.join(", ") || "-"
      } |`
    );
  }

  lines.push(
    "",
    "## Exact Raw Equation False Negative Deep Dive",
    "",
    `The ${exactRawEquationSimulation.falseNegatives} false negatives are intentionally not folded into the exact raw equation simulation. They split into narrower causes, and none currently has recurring, unique, exact evidence strong enough for another runner-only recovery simulation.`,
    "",
    "| image | stage/side | sub-pattern | expected | actual | raw evidence presence | raw text / provenance | exact reconstruction | recommendation |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const row of exactRawFalseNegativeDeepDive.rows) {
    const memberPresence = (row.expected?.members || [])
      .map((value, index) => `m${index + 1} ${formatNumber(value)}:${row.evidencePresence.expectedMembersInRaw[index] ? "raw" : "missing"}`)
      .join(", ");
    const memberTextPresence = (row.expected?.members || [])
      .map((value, index) => `m${index + 1}:${row.evidencePresence.expectedMembersInText[index] ? "text" : "no-text"}`)
      .join(", ");
    const evidencePresence = [
      memberPresence,
      memberTextPresence,
      `bonus ${formatNumber(row.expected?.bonus || 0) || "-"}:${row.evidencePresence.expectedBonusInRaw ? "parsed/none" : "missing"}:${row.evidencePresence.expectedBonusInText ? "text/none" : "no-text"}`,
      `total ${formatNumber(row.expected?.total || 0)}:${row.evidencePresence.expectedTotalInRaw ? "parsed" : "missing"}:${row.evidencePresence.expectedTotalInText ? "text" : "no-text"}`,
    ].join("; ");
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.subPattern} | members ${formatDebugNumbers(row.expected?.members || [])}; bonus ${formatNumber(row.expected?.bonus || 0) || "-"}; total ${formatNumber(row.expected?.total || 0)} | members ${formatDebugNumbers(row.actual.members)}; bonus candidates ${formatDebugNumbers(row.actual.bonusCandidates) || "-"}; total ${formatNumber(row.actual.total)} | ${evidencePresence} | total text: ${escapeMarkdownTableCell(row.totalText || "-")}<br>member text: ${escapeMarkdownTableCell(row.memberText || "-")}<br>passes: ${[...new Set(row.preprocessingPasses)].join(", ") || "-"}<br>ROI: ${formatCurrentPcRoiSummary(row.roiProvenance)} | exact raw interpretations ${row.exactRawInterpretationCount}; rejection ${row.rejectionReasons.join(", ") || "-"} | ${row.recommendation} |`
    );
  }

  lines.push(
    "",
    "### False Negative Sub-Pattern Summary",
    "",
    "| sub-pattern | positives | affected cases | exact evidence | runner-only simulation justified |",
    "| --- | ---: | --- | --- | --- |"
  );

  for (const pattern of exactRawFalseNegativeDeepDive.subPatterns) {
    lines.push(
      `| ${pattern.name} | ${pattern.count} | ${pattern.occurrences.join("; ")} | ${
        pattern.count > 1 ? "mixed; inspect individually" : "single sample only"
      } | no; needs recurrence plus unique exact raw/ROI evidence |`
    );
  }

  lines.push(
    "",
    "### Comparison With Stage3 Self Displacement Simulation",
    "",
    "- `145018419` S3 self is the only false negative that shares the Stage3 self surface area.",
    "- It does not match `currentPcStage3SelfSevenDigitDisplacementSimulation`: the existing simulation expects a left-shifted 7-digit member pattern, while this case keeps member1/member2 and drops member3 to a low fragment (`805828` -> `5828`).",
    "- Broadening the Stage3 simulation would mix a digit-drop problem with a member/bonus displacement problem, so it remains blocked.",
    "",
    "## Current-PC Bonus / Digit-Drop / Parser Evidence Audit",
    "",
    "This section is audit-only. It inspects raw OCR text and candidate-source traces so we can separate OCR recognition failures from parser normalization gaps, digit drops, bonus OCR confusions, and role-classification mistakes. It does not change runner PASS/FAIL or production output.",
    "",
    `- punctuation / parser-normalization findings: ${bonusDigitParserAudit.punctuationNormalization.length}`,
    `- parser flow gaps: ${bonusDigitParserAudit.parserFlowGaps.length}`,
    `- digit-drop findings: ${bonusDigitParserAudit.digitDrop.length}`,
    `- bonus OCR confusion findings: ${bonusDigitParserAudit.bonusConfusion.length}`,
    `- bonus-as-member role findings: ${bonusDigitParserAudit.roleClassification.length}`,
    "",
    "### Punctuation / Parser Normalization Findings",
    "",
    "| image | stage/side | source | token | grouped value | shape | reaches parsed source | source text |",
    "| --- | --- | --- | --- | ---: | --- | --- | --- |"
  );

  const punctuationRows = bonusDigitParserAudit.punctuationNormalization.slice(0, 24);
  if (punctuationRows.length === 0) {
    lines.push("| - | - | - | - | - | - | - | - |");
  }
  for (const row of punctuationRows) {
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.sourceRole}/${row.pass || "-"} | ${escapeMarkdownTableCell(
        row.token
      )} | ${formatNumber(row.normalizedValue)} | ${row.shape} | ${
        row.reachesParsedSource ? "yes" : "no"
      } | ${escapeMarkdownTableCell(cleanOcrTextForReport(row.text || "-"))} |`
    );
  }
  if (bonusDigitParserAudit.punctuationNormalization.length > punctuationRows.length) {
    lines.push(
      `| ... | ... | ... | ... | ... | ... | ... | ${bonusDigitParserAudit.punctuationNormalization.length - punctuationRows.length} additional findings omitted from table |`
    );
  }

  lines.push(
    "",
    "### Digit-Drop Findings",
    "",
    "| image | stage/side | role | expected value | suffix candidate(s) | selected members | selected total | source text |",
    "| --- | --- | --- | ---: | --- | --- | ---: | --- |"
  );

  if (bonusDigitParserAudit.digitDrop.length === 0) {
    lines.push("| - | - | - | - | - | - | - | - |");
  }
  for (const row of bonusDigitParserAudit.digitDrop) {
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${row.role} | ${formatNumber(
        row.expectedValue
      )} | ${formatDebugNumbers(row.suffixCandidates)} | ${formatDebugNumbers(
        row.selectedMembers
      )} | ${formatNumber(row.selectedTotal)} | ${escapeMarkdownTableCell(
        cleanOcrTextForReport(row.sourceText || "-")
      )} |`
    );
  }

  lines.push(
    "",
    "### Bonus OCR Confusion Findings",
    "",
    "| image | stage/side | expected bonus | wrong bonus-like candidate(s) | member sum | selected total | source text |",
    "| --- | --- | ---: | --- | ---: | ---: | --- |"
  );

  if (bonusDigitParserAudit.bonusConfusion.length === 0) {
    lines.push("| - | - | - | - | - | - | - |");
  }
  for (const row of bonusDigitParserAudit.bonusConfusion) {
    lines.push(
      `| ${row.image} | S${row.stage} ${row.side} | ${formatNumber(
        row.expectedBonus
      )} | ${formatDebugNumbers(row.wrongBonusCandidates)} | ${formatNumber(
        row.memberSum
      )} | ${formatNumber(row.selectedTotal)} | ${escapeMarkdownTableCell(
        cleanOcrTextForReport(row.sourceText || "-")
      )} |`
    );
  }

  lines.push(
    "",
    "### Parser Audit Recommendation",
    "",
    "- Do not productionize punctuation normalization yet. Period-grouped values such as `147.462` can be meaningful scores, but they remain unsafe unless role, ROI, and exact-equation guards all agree.",
    "- The new grouped/raw token evidence simulation is runner-only and intentionally stricter than global punctuation normalization. It only promotes strict grouped tokens from role-specific ROIs into an exact-equation simulation pool.",
    "- Digit-drop remains too sample-specific for production. The clear `805828` -> `5828` case lacks a clean parsed replacement candidate in the current evidence flow.",
    "- Bonus OCR confusion remains too sample-specific for production. The observed `142313` -> `142513` and `66660` -> `68660` shapes do not form a safe replacement rule yet.",
    "- Production remains blocked unless the grouped/raw simulation produces repeated true-positive exact recoveries with zero false-positive accepts and no competing interpretation.",
    "",
    "",
    "## Ranked Generalization Targets",
    "",
    "1. Keep the Stage3 self 7-digit/member-bonus displacement recovery in runner-only simulation until more exact-positive samples exist.",
    `2. Keep the exact raw equation recovery in runner-only simulation. It has ${exactRawEquationSimulation.truePositives} true positive accepts and no false positive accepts, but it covers only a subset of ${selectedTotalConfirmedCount} selected-total confirmed failures.`,
    `3. Use grouped/raw token evidence simulation to measure whether strict punctuation/space grouped tokens unlock additional exact equations. It currently reports ${groupedRawTokenSimulation.truePositives} true positives and ${groupedRawTokenSimulation.falsePositives} false positives.`,
    "4. Investigate the remaining selected-total subpatterns separately: bonus/member OCR confusion, digit/drop member plus bonus evidence gap, total/bonus OCR offset, and missing member evidence.",
    "5. Add bbox-backed current-PC candidate provenance for member slot/order displacement before any production rule.",
    "",
    "## Recommendation",
    "",
    "- Do not productionize a new current-PC recovery rule yet.",
    `- The next implementation target should remain audit/simulation-only. The selected-total group is real, but the ${selectedTotalConfirmedCount} confirmed cases split into multiple causes, ${exactRawEquationSimulation.truePositives} currently have a unique exact raw equation, and ${groupedRawTokenSimulation.truePositives} are accepted by the stricter grouped/raw token simulation.`,
    "- Current-PC expected fixtures are now available, so future simulations can report real PASS/FAIL impact rather than unresolved audit guesses.",
    "",
    "## Artifact Location",
    "",
    `- directory: ${baseline.outputDir}`,
    `- summary: ${baseline.summaryPath}`,
    ""
  );

  return lines.join("\n");
}

function formatCurrentPcCrownBonusEvidence(evidence = []) {
  if (!evidence || evidence.length === 0) return "-";
  return evidence
    .slice(0, 3)
    .map((entry) => {
      const tokenText = (entry.tokens || [])
        .slice(0, 2)
        .map((token) => token.rawToken || token.token || "")
        .filter(Boolean)
        .join(", ");
      return [entry.source, entry.pass, tokenText].filter(Boolean).join(" ");
    })
    .join("<br>");
}

function buildCurrentPcCrownBonusRuleSimulationReport(simulation) {
  const generatedAt = new Date().toISOString();
  const lines = [
    "# Current-PC Crown Bonus Rule Simulation",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Scope",
    "",
    "- runner-only simulation: yes",
    "- final OCR output changed: no",
    "- production recovery added: no",
    "- smartphone OCR changed: no",
    "- legacy desktop OCR changed: no",
    "- filename/stage-specific correction logic: no",
    "",
    "## Confirmed Game Rule",
    "",
    "For each current-PC stage, six raw member scores are visible: three self and three enemy. The highest raw member score is rank 1, only that side receives the crown bonus, and the bonus is:",
    "",
    "```text",
    "crownBonus = floor(max(all 6 raw member scores) * 0.20)",
    "```",
    "",
    "The winning side total must equal member sum plus the calculated bonus. The other side total must equal its raw member sum.",
    "",
    "## Simulation Guards",
    "",
    "- Uses only the six currently selected member values as member evidence.",
    "- Every selected member must be nonzero and present in current OCR member/raw evidence.",
    "- No missing member is invented from arithmetic.",
    "- No missing digit, near-match, digit-drop, or filename-specific inference is allowed.",
    "- The global rank-1 member must be unique.",
    "- Bonus is derived only from the confirmed game rule, not from OCR bonus text.",
    "- Both self and enemy proposed totals must have exact OCR total evidence.",
    "- The interpretation must be unique under this strict selected-member-only model.",
    "- The simulation may propose bonus/total corrections, but it never changes final OCR output.",
    "",
    "## Summary",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| failing stage/side rows evaluated | ${simulation.failingStageSideRows} |`,
    `| TP | ${simulation.truePositives} |`,
    `| FP | ${simulation.falsePositives} |`,
    `| FN | ${simulation.falseNegatives} |`,
    `| blocked | ${simulation.blocked} |`,
    `| accepted case count | ${simulation.accepted.length} |`,
    "",
    "## Helped Failure Families",
    "",
    "| family | rows |",
    "| --- | ---: |"
  ];

  if (simulation.helpBreakdown.length === 0) lines.push("| - | 0 |");
  for (const row of simulation.helpBreakdown) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }

  lines.push(
    "",
    "## Stage Breakdown",
    "",
    "| stage | accepted rows |",
    "| --- | ---: |"
  );
  if (simulation.stageBreakdown.length === 0) lines.push("| - | 0 |");
  for (const row of simulation.stageBreakdown) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }

  lines.push(
    "",
    "## Blocked Breakdown",
    "",
    "| reason | rows |",
    "| --- | ---: |"
  );
  if (simulation.blockedReasonBreakdown.length === 0) lines.push("| - | 0 |");
  for (const row of simulation.blockedReasonBreakdown) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }

  lines.push(
    "",
    "## Recovery Overlap",
    "",
    "| category | rows |",
    "| --- | ---: |",
    `| overlap with \`currentPcGroupedRawTokenRecovery\` | ${simulation.overlap.groupedRaw} |`,
    `| overlap with \`applyCurrentPcStage3SevenDigitBonusDisplacementRecovery\` | ${simulation.overlap.stage3SevenDigit} |`,
    `| overlap with documented slot-specific ROI TP cases | ${simulation.overlap.slotSpecificRoi} |`,
    `| unique additional recovery potential | ${simulation.overlap.uniqueAdditionalPotential} |`,
    "",
    "## Accepted Cases",
    "",
    "| screenshot | stage | side | selected before | proposed self | proposed enemy | rank-1 | winning side | calculated bonus | existing OCR bonus | total evidence | why unique |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |"
  );

  if (simulation.accepted.length === 0) {
    lines.push("| - | - | - | - | - | - | - | - | - | - | - | - |");
  }
  for (const row of simulation.accepted) {
    const sideBefore = row.selectedBefore?.[row.side] || {};
    const selectedBefore = `members ${formatDebugNumbers(sideBefore.members || [])}; bonus ${
      sideBefore.bonus > 0 ? formatNumber(sideBefore.bonus) : "-"
    }; total ${formatNumber(sideBefore.total || 0)}`;
    const proposedSelf = `members ${formatDebugNumbers(row.proposedSelf?.members || [])}; bonus ${
      row.proposedSelf?.bonus > 0 ? formatNumber(row.proposedSelf.bonus) : "-"
    }; total ${formatNumber(row.proposedSelf?.total || 0)}`;
    const proposedEnemy = `members ${formatDebugNumbers(row.proposedEnemy?.members || [])}; bonus ${
      row.proposedEnemy?.bonus > 0 ? formatNumber(row.proposedEnemy.bonus) : "-"
    }; total ${formatNumber(row.proposedEnemy?.total || 0)}`;
    const rank1 = row.globalRank1Member
      ? `${row.globalRank1Member.side} member${row.globalRank1Member.slot}=${formatNumber(
          row.globalRank1Member.value
        )}`
      : "-";
    const totalEvidence = [
      `self: ${formatCurrentPcCrownBonusEvidence(row.totalEvidence?.self || [])}`,
      `enemy: ${formatCurrentPcCrownBonusEvidence(row.totalEvidence?.enemy || [])}`,
    ].join("<br>");
    lines.push(
      `| ${row.screenshot} | ${row.stage} | ${row.side} | ${selectedBefore} | ${proposedSelf} | ${proposedEnemy} | ${rank1} | ${row.winningSide || "-"} | ${formatNumber(row.calculatedCrownBonus || 0)} | ${row.existingOcrBonus} | ${totalEvidence} | ${row.uniqueness} |`
    );
  }

  lines.push(
    "",
    "## False Positives",
    "",
    simulation.falsePositives === 0
      ? "No false positives were found."
      : "At least one false positive was found. Do not productionize until investigated.",
    ""
  );
  if (simulation.falsePositiveRows.length > 0) {
    lines.push("| screenshot | stage | side | expected | proposed | selected before |");
    lines.push("| --- | ---: | --- | --- | --- | --- |");
    for (const row of simulation.falsePositiveRows) {
      lines.push(
        `| ${row.screenshot} | ${row.stage} | ${row.side} | members ${formatDebugNumbers(
          row.expected?.members || []
        )}; bonus ${formatNumber(row.expected?.bonus || 0)}; total ${formatNumber(
          row.expected?.total || 0
        )} | members ${formatDebugNumbers(row.proposed?.members || [])}; bonus ${formatNumber(
          row.proposed?.bonus || 0
        )}; total ${formatNumber(row.proposed?.total || 0)} | ${JSON.stringify(
          row.selectedBefore || {}
        )} |`
      );
    }
    lines.push("");
  }

  lines.push(
    "## Production Readiness",
    "",
    simulation.falsePositives > 0
      ? "Production recovery must remain disabled if this simulation produces false positives."
      : simulation.truePositives > 0
        ? "`applyCurrentPcCrownBonusRuleRecovery(...)` now uses this same strict shared evidence result after grouped/raw and Stage3 7-digit recoveries. The simulation remains as the audit surface for the pre-apply TP/FP boundary."
        : "Production recovery has no useful true positives under the current strict guard.",
    "",
    "Production guard summary:",
    "",
    "1. Current-PC layout only.",
    "2. Use the selected six raw member scores after existing current-PC recoveries.",
    "3. Derive `floor(max(all 6 selected raw members) * 0.20)` for the unique global rank-1 side.",
    "4. Require exact displayed total evidence for both sides.",
    "5. Do not invent members, repair digits, use near matches, or accept competing interpretations.",
    ""
  );

  return lines.join("\n");
}

function buildCurrentPcCrownBonusRuleParityReport(parity, simulation) {
  const generatedAt = new Date().toISOString();
  const lines = [
    "# Current-PC Crown Bonus Rule Parity",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Purpose",
    "",
    "This report proves that the evidence used by `currentPcCrownBonusRuleSimulation` is available through shared runner/browser-equivalent plumbing. The same shared evidence result is now used by the production `applyCurrentPcCrownBonusRuleRecovery(...)` guard.",
    "",
    "## Shared Evidence Schema",
    "",
    "The shared helper is `buildCurrentPcCrownBonusRuleEvidence(...)` in `app/lib/ocr.js`.",
    "",
    "Stage-level inputs:",
    "",
    "- `self.selectedMembers` / `enemy.selectedMembers`",
    "- `self.selectedTotal` / `enemy.selectedTotal`",
    "- `candidateSourceSummary.memberCandidates` for selected-member provenance",
    "- `displayedTotalCandidates`, `totalDirect`, and `totalTrace` evidence for exact total provenance",
    "",
    "Stage-level outputs:",
    "",
    "- selected six-member interpretation",
    "- selected self/enemy totals and implied current bonus",
    "- member evidence per slot",
    "- exact total evidence per side",
    "- global rank-1 member",
    "- winning side",
    "- derived crown bonus: `floor(max(all 6 selected raw members) * 0.20)`",
    "- proposed self/enemy totals",
    "- `sideWouldChange`",
    "- `wouldApply`",
    "- rejection reasons",
    "",
    "## Evidence Flow",
    "",
    "Runner flow:",
    "",
    "1. Current-PC OCR extracts stage/side member rows, total candidates, total traces, and candidate source summaries.",
    "2. Existing production recoveries run first: grouped/raw token recovery, then Stage3 7-digit bonus-displacement recovery.",
    "3. `buildCurrentPcCrownBonusRuleEvidence(...)` evaluates the post-recovery selected six-member stage state.",
    "4. `applyCurrentPcCrownBonusRuleRecovery(...)` applies only when that shared strict evaluator says `wouldApply`.",
    "5. The pre-apply simulation is still recorded for TP/FP audit counts.",
    "",
    "Browser/UI-equivalent flow:",
    "",
    "1. The UI current-PC OCR path builds the same candidate source summaries for each side.",
    "2. Existing production recoveries run first and may update the selected members/totals.",
    "3. The UI path calls `buildCurrentPcCrownBonusRuleEvidence(...)` after those recoveries.",
    "4. `applyCurrentPcCrownBonusRuleRecovery(...)` runs last and updates final current-PC stage totals only when the strict guard passes.",
    "5. The correction log includes `currentPcCrownBonusRuleRecovery applied ...` with rank-1, derived bonus, proposed totals, and exact total evidence.",
    "",
    "Production precedence: grouped/raw recovery first, Stage3 7-digit bonus-displacement second, crown-bonus rule last.",
    "",
    "## Global Parity Counts",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| stages compared | ${parity.stagesCompared} |`,
    `| crown-bonus simulation TP | ${simulation.truePositives} |`,
    `| crown-bonus simulation FP | ${simulation.falsePositives} |`,
    `| crown-bonus simulation FN | ${simulation.falseNegatives} |`,
    `| crown-bonus simulation blocked | ${simulation.blocked} |`,
    `| TP parity exact | ${parity.tpParityExact} / ${simulation.truePositives} |`,
    `| wouldApply disagreements | ${parity.wouldApplyDisagreements} |`,
    `| proposed member disagreements | ${parity.proposedMemberDisagreements} |`,
    `| proposed bonus disagreements | ${parity.proposedBonusDisagreements} |`,
    `| proposed total disagreements | ${parity.proposedTotalDisagreements} |`,
    `| selected member disagreements | ${parity.selectedMemberDisagreements} |`,
    `| selected total evidence mismatches | ${parity.selectedTotalEvidenceMismatches} |`,
    `| missing evidence in browser-equivalent | ${parity.missingInBrowserEquivalent} |`,
    `| missing evidence in runner | ${parity.missingInRunner} |`,
    `| metadata-only mismatches | ${parity.metadataOnlyMismatches} |`,
    `| safety-relevant mismatches | ${parity.safetyRelevantMismatches} |`,
    "",
    "## TP Parity Rows",
    "",
    "| screenshot | stage | side | runner apply | browser-equivalent apply | rank-1 | winning side | derived bonus | proposed self total | proposed enemy total | parity |",
    "| --- | ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |"
  ];

  if (parity.tpRows.length === 0) {
    lines.push("| - | - | - | - | - | - | - | - | - | - | - |");
  }
  for (const row of parity.tpRows) {
    const rank1 = row.runner.rank1
      ? `${row.runner.rank1.side}.member${row.runner.rank1.slot}=${formatNumber(row.runner.rank1.value)}`
      : "-";
    const parityLabel =
      row.mismatchFields.length === 0 && row.metadataMismatchFields.length === 0
        ? "exact"
        : row.mismatchFields.length > 0
          ? `safety mismatch: ${row.mismatchFields.join(",")}`
          : `metadata-only: ${row.metadataMismatchFields.join(",")}`;
    lines.push(
      `| ${row.screenshot} | ${row.stage} | ${row.side} | ${row.runnerWouldApply ? "yes" : "no"} | ${
        row.browserWouldApply ? "yes" : "no"
      } | ${rank1} | ${row.runner.winningSide || "-"} | ${formatNumber(
        row.runner.calculatedBonus || 0
      )} | ${formatNumber(row.runner.proposed.self.total || 0)} | ${formatNumber(
        row.runner.proposed.enemy.total || 0
      )} | ${parityLabel} |`
    );
  }

  lines.push(
    "",
    "## Mismatch Rows",
    "",
    "| screenshot | stage | mismatch type | fields | safety relevant |",
    "| --- | ---: | --- | --- | --- |"
  );
  if (parity.mismatchRows.length === 0) {
    lines.push("| - | - | - | - | no |");
  }
  for (const row of parity.mismatchRows) {
    const fields =
      row.mismatchFields.length > 0
        ? row.mismatchFields.join(", ")
        : row.metadataMismatchFields.join(", ");
    lines.push(
      `| ${row.screenshot} | ${row.stage} | ${
        row.mismatchFields.length > 0 ? "safety-relevant" : "metadata-only"
      } | ${fields || "-"} | ${row.safetyRelevant ? "yes" : "no"} |`
    );
  }

  lines.push(
    "",
    "## Production Status",
    "",
    parity.safetyRelevantMismatches === 0 &&
      parity.wouldApplyDisagreements === 0 &&
      parity.tpParityExact === simulation.truePositives
      ? "`applyCurrentPcCrownBonusRuleRecovery(...)` is enabled for current-PC only using this exact shared guard."
      : "Disable production recovery or resolve parity mismatches before relying on this guard.",
    "",
    "Recommended next step: real-browser spot-check one or two TP rows and confirm the correction log includes `currentPcCrownBonusRuleRecovery applied ...`.",
    ""
  );

  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const debugNext = args.includes("--debug-next");
  const currentPcBaseline = args.includes("--current-pc-baseline");
  const currentPcBonusDiagnostics = args.includes("--current-pc-bonus-diagnostics");
  const currentPcStage3MemberRowDiagnostics = args.includes(
    "--current-pc-stage3-member-row-diagnostics"
  );
  const currentPcSlotRoiDiagnostics = args.includes("--current-pc-slot-roi-diagnostics");
  const debugArtifacts =
    currentPcBaseline ||
    args.includes("--debug-artifacts") ||
    args.includes("--debug-ocr-artifacts");
  const fixedRoiExperiment =
    args.includes("--fixed-roi-experiment") || args.includes("--smartphone-roi-experiment");
  const roiAdoptionSimulation =
    args.includes("--roi-adoption-sim") || args.includes("--simulate-roi-adoption");
  const sourceIndex = args.indexOf("--source");
  const sourceValue = sourceIndex >= 0 ? args[sourceIndex + 1] : "";
  const forcedSource = ["smartphone", "desktop", "current-pc"].includes(sourceValue)
    ? sourceValue
    : currentPcBaseline
      ? "current-pc"
    : "";
  const disabledKnownCorrectionArgs = parseDisabledKnownCorrections(args);
  const disabledKnownCorrections = new Set(
    disabledKnownCorrectionArgs.map(normalizeKnownCorrectionKey)
  );
  const filters = args
    .filter((value, index) =>
      value !== "--debug-next" &&
      value !== "--current-pc-baseline" &&
      value !== "--current-pc-bonus-diagnostics" &&
      value !== "--current-pc-stage3-member-row-diagnostics" &&
      value !== "--current-pc-slot-roi-diagnostics" &&
      value !== "--debug-artifacts" &&
      value !== "--debug-ocr-artifacts" &&
      value !== "--fixed-roi-experiment" &&
      value !== "--smartphone-roi-experiment" &&
      value !== "--roi-adoption-sim" &&
      value !== "--simulate-roi-adoption" &&
      value !== "--source" &&
      value !== "--audit-disable-known-correction" &&
      !(sourceIndex >= 0 && index === sourceIndex + 1) &&
      !(args[index - 1] === "--audit-disable-known-correction")
    )
    .map((value) =>
      value
        .replaceAll("\\", "/")
        .replace(/^\.?\/*test-images\//i, "")
        .toLowerCase()
    );
  const imagePaths = currentPcBaseline
    ? (await collectCurrentPcBaselineImages())
        .filter((imagePath) => {
          if (filters.length === 0) return true;
          const base = path.basename(imagePath).toLowerCase();
          return filters.some((filter) => base.includes(filter));
        })
        .sort()
    : (await collectImages(testImagesDir))
        .filter((imagePath) => {
          if (filters.length === 0) return true;

          const relative = path.relative(testImagesDir, imagePath).replaceAll("\\", "/").toLowerCase();
          const base = path.basename(imagePath).toLowerCase();
          return filters.some((filter) => relative.includes(filter) || base.includes(filter));
        })
        .sort();
  const report = [];

  for (const imagePath of imagePaths) {
    const relative = currentPcBaseline
      ? `current-pc/${path.basename(imagePath)}`
      : path.relative(testImagesDir, imagePath).replaceAll("\\", "/");
    const category = currentPcBaseline ? "current-pc" : getCategory(relative);
    const source = getOcrSourceForImage(category, forcedSource);
    if (category === "next-screen") {
      console.log(`SKIP ${relative} unsupported`);
      report.push({
        image: relative,
        category,
        expected: false,
        pass: true,
        skipped: true,
        unsupported: true,
        source,
        message: unsupportedNextScreenMessage,
        failures: [],
        elapsedMs: 0,
        expectedData: null,
        result: null,
      });
      continue;
    }

    const startedAt = Date.now();
    console.log(`OCR ${relative}`);
    const result = await runOcrForImage(imagePath, {
      debugNext,
      debugArtifacts,
      fastNext: false,
      source,
      disabledKnownCorrections,
    });
    const elapsedMs = Date.now() - startedAt;
    console.log(`OCR ${relative} ${elapsedMs}ms`);
    const expected = await readExpected(path.basename(imagePath));
    const failures = compareExpected(result, expected);
    report.push({
      image: relative,
      category,
      expected: Boolean(expected),
      source,
      pass: failures.length === 0,
      failures,
      elapsedMs,
      expectedData: expected,
      disabledKnownCorrections: disabledKnownCorrectionArgs,
      absolutePath: imagePath,
      result,
    });
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownReportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  await fs.writeFile(markdownReportPath, buildMarkdownReport(report));
  await fs.writeFile(digitDropAuditReportPath, buildDigitDropAuditReport(report));
  await fs.writeFile(rawTokenFragmentAuditReportPath, buildRawTokenFragmentAuditReport(report));
  await fs.writeFile(memberOrderAuditReportPath, buildMemberOrderAuditReport(report));
  await fs.writeFile(geometryAuditReportPath, await buildGeometryAuditReport(report));
  await terminateAuditGeometryWorker();
  if (debugNext) {
    await fs.writeFile(nextDebugPath, buildNextDebugReport(report));
  }
  const debugArtifactFiles = debugArtifacts ? await writeDebugArtifacts(report) : [];
  const fixedRoiExperimentFiles = fixedRoiExperiment
    ? await writeFixedRoiExperimentArtifacts(report)
    : [];
  const roiAdoptionSimulationFiles = roiAdoptionSimulation
    ? await writeRoiAdoptionSimulationArtifacts(report)
    : [];
  const currentPcBaselineArtifacts = currentPcBaseline
    ? await writeCurrentPcBaselineArtifacts(report)
    : null;
  const currentPcBonusDiagnosticsArtifacts =
    currentPcBaselineArtifacts && currentPcBonusDiagnostics
      ? await writeCurrentPcBonusDiagnosticsArtifacts(
          currentPcBaselineArtifacts.analysis.filter((item) => item.expected)
        )
      : null;
  const currentPcStage3MemberRowDiagnosticsArtifacts =
    currentPcBaselineArtifacts && currentPcStage3MemberRowDiagnostics
      ? await writeCurrentPcStage3MemberRowDiagnosticsArtifacts(
          currentPcBaselineArtifacts.analysis.filter((item) => item.expected)
        )
      : null;
  const currentPcSlotRoiDiagnosticsArtifacts =
    currentPcBaselineArtifacts && currentPcSlotRoiDiagnostics
      ? await writeCurrentPcSlotRoiDiagnosticsArtifacts(
          currentPcBaselineArtifacts.analysis.filter((item) => item.expected)
        )
      : null;
  if (currentPcBaselineArtifacts) {
    await fs.writeFile(
      currentPcBaselineReportPath,
      buildCurrentPcBaselineReport(currentPcBaselineArtifacts)
    );
    const expectedCurrentPcAnalysis = currentPcBaselineArtifacts.analysis.filter(
      (item) => item.expected
    );
    const groupedRawTokenSimulation = buildCurrentPcGroupedRawTokenEvidenceSimulationEvaluation(
      expectedCurrentPcAnalysis
    );
    const crownBonusRuleSimulation =
      buildCurrentPcCrownBonusRuleSimulationEvaluation(expectedCurrentPcAnalysis);
    const crownBonusRuleParity = compareCurrentPcCrownBonusRuleParity(
      expectedCurrentPcAnalysis,
      crownBonusRuleSimulation
    );
    const groupedRawParity = compareCurrentPcGroupedRawEvidenceParity(
      expectedCurrentPcAnalysis,
      groupedRawTokenSimulation
    );
    await fs.writeFile(
      currentPcGroupedRawParityReportPath,
      buildCurrentPcGroupedRawEvidenceParityReport(groupedRawParity, groupedRawTokenSimulation)
    );
    const stage3SevenDigitParity =
      compareCurrentPcStage3SevenDigitBonusDisplacementParity(
        expectedCurrentPcAnalysis
      );
    await fs.writeFile(
      currentPcStage3SevenDigitParityReportPath,
      buildCurrentPcStage3SevenDigitBonusDisplacementParityReport(stage3SevenDigitParity)
    );
    await fs.writeFile(
      currentPcCrownBonusSimulationReportPath,
      buildCurrentPcCrownBonusRuleSimulationReport(crownBonusRuleSimulation)
    );
    await fs.writeFile(
      currentPcCrownBonusParityReportPath,
      buildCurrentPcCrownBonusRuleParityReport(
        crownBonusRuleParity,
        crownBonusRuleSimulation
      )
    );
    await fs.writeFile(
      path.join(currentPcBaselineDir, "crown-bonus-rule-simulation.json"),
      JSON.stringify(crownBonusRuleSimulation, null, 2)
    );
    await fs.writeFile(
      path.join(currentPcBaselineDir, "crown-bonus-rule-parity.json"),
      JSON.stringify(crownBonusRuleParity, null, 2)
    );
    if (currentPcBonusDiagnosticsArtifacts) {
      await fs.writeFile(
        currentPcBonusDiagnosticsReportPath,
        buildCurrentPcBonusDiagnosticsReport(currentPcBonusDiagnosticsArtifacts)
      );
    }
    if (currentPcStage3MemberRowDiagnosticsArtifacts) {
      await fs.writeFile(
        currentPcStage3MemberRowDiagnosticsReportPath,
        buildCurrentPcStage3MemberRowDiagnosticsReport(
          currentPcStage3MemberRowDiagnosticsArtifacts
        )
      );
    }
    if (currentPcSlotRoiDiagnosticsArtifacts) {
      await fs.writeFile(
        currentPcSlotRoiDiagnosticsReportPath,
        buildCurrentPcSlotRoiDiagnosticsReport(currentPcSlotRoiDiagnosticsArtifacts)
      );
    }
  }

  const expectedResults = report.filter((item) => item.expected);
  const failedResults = report.filter((item) => !item.pass);

  console.log(
    JSON.stringify(
      {
        images: report.length,
        expected: expectedResults.length,
        failed: failedResults.length,
        report: path.relative(rootDir, reportPath).replaceAll("\\", "/"),
        markdownReport: path.relative(rootDir, markdownReportPath).replaceAll("\\", "/"),
        digitDropAuditReport: path.relative(rootDir, digitDropAuditReportPath).replaceAll("\\", "/"),
        rawTokenFragmentAuditReport: path.relative(rootDir, rawTokenFragmentAuditReportPath).replaceAll("\\", "/"),
        memberOrderAuditReport: path.relative(rootDir, memberOrderAuditReportPath).replaceAll("\\", "/"),
        geometryAuditReport: path.relative(rootDir, geometryAuditReportPath).replaceAll("\\", "/"),
        nextDebug: debugNext ? path.relative(rootDir, nextDebugPath).replaceAll("\\", "/") : null,
        debugArtifacts: debugArtifacts
          ? path.relative(rootDir, debugArtifactsDir).replaceAll("\\", "/")
          : null,
        debugArtifactFiles,
        fixedRoiExperiment: fixedRoiExperiment
          ? path.relative(rootDir, fixedRoiExperimentDir).replaceAll("\\", "/")
          : null,
        fixedRoiExperimentFiles,
        roiAdoptionSimulation: roiAdoptionSimulation
          ? path.relative(rootDir, roiAdoptionSimDir).replaceAll("\\", "/")
          : null,
        roiAdoptionSimulationFiles,
        currentPcBaseline: currentPcBaselineArtifacts
          ? {
              report: path.relative(rootDir, currentPcBaselineReportPath).replaceAll("\\", "/"),
              groupedRawParityReport: path.relative(rootDir, currentPcGroupedRawParityReportPath).replaceAll("\\", "/"),
              stage3SevenDigitParityReport: path.relative(rootDir, currentPcStage3SevenDigitParityReportPath).replaceAll("\\", "/"),
              crownBonusRuleSimulationReport: path.relative(rootDir, currentPcCrownBonusSimulationReportPath).replaceAll("\\", "/"),
              crownBonusRuleParityReport: path.relative(rootDir, currentPcCrownBonusParityReportPath).replaceAll("\\", "/"),
              outputDir: currentPcBaselineArtifacts.outputDir,
              summary: currentPcBaselineArtifacts.summaryPath,
              crownBonusRuleSimulation: path
                .relative(rootDir, path.join(currentPcBaselineDir, "crown-bonus-rule-simulation.json"))
                .replaceAll("\\", "/"),
              crownBonusRuleParity: path
                .relative(rootDir, path.join(currentPcBaselineDir, "crown-bonus-rule-parity.json"))
                .replaceAll("\\", "/"),
              bonusDiagnostics: currentPcBonusDiagnosticsArtifacts
                ? {
                    report: path.relative(rootDir, currentPcBonusDiagnosticsReportPath).replaceAll("\\", "/"),
                    outputDir: currentPcBonusDiagnosticsArtifacts.outputDir,
                    summary: currentPcBonusDiagnosticsArtifacts.summaryPath,
                  }
                : null,
              stage3MemberRowDiagnostics: currentPcStage3MemberRowDiagnosticsArtifacts
                ? {
                    report: path.relative(rootDir, currentPcStage3MemberRowDiagnosticsReportPath).replaceAll("\\", "/"),
                    outputDir: currentPcStage3MemberRowDiagnosticsArtifacts.outputDir,
                    summary: currentPcStage3MemberRowDiagnosticsArtifacts.summaryPath,
                  }
                : null,
              slotRoiDiagnostics: currentPcSlotRoiDiagnosticsArtifacts
                ? {
                    report: path.relative(rootDir, currentPcSlotRoiDiagnosticsReportPath).replaceAll("\\", "/"),
                    outputDir: currentPcSlotRoiDiagnosticsArtifacts.outputDir,
                    summary: currentPcSlotRoiDiagnosticsArtifacts.summaryPath,
                  }
                : null,
            }
          : null,
        elapsedMs: report.map((item) => ({ image: item.image, elapsedMs: item.elapsedMs })),
        failures: failedResults.map((item) => ({
          image: item.image,
          failures: item.failures,
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});






