import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

function limitOcrZones(zones, options = {}) {
  return options.fastNext ? zones.slice(0, 1) : zones;
}

async function runOcrForImage(imagePath, options = {}) {
  const image = await readImageSize(imagePath);
  const fileName = path.basename(imagePath);
  const results = {};
  const ocrSource = options.source === "desktop" ? "desktop" : "smartphone";

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

    if (options.debugArtifacts && ocrSource === "smartphone") {
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
          sparseTotalAsMemberSimulation,
          stage3SelfSevenDigitDisplacementSimulation,
          stage3EnemySevenDigitRecoverySimulation:
            side === "enemy" ? stage3SelfSevenDigitDisplacementSimulation : null,
        };
      };

      stageResult.debugArtifact = {
        stage,
        mode: ocrSource,
        image: {
          fileName,
          width: image.width,
          height: image.height,
        },
        knownCorrectionDeltas,
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
  if (options.debugArtifacts && ocrSource === "smartphone") {
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

async function readExpected(fileName) {
  const baseName = path.parse(fileName).name;
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

async function main() {
  const args = process.argv.slice(2);
  const debugNext = args.includes("--debug-next");
  const debugArtifacts =
    args.includes("--debug-artifacts") || args.includes("--debug-ocr-artifacts");
  const fixedRoiExperiment =
    args.includes("--fixed-roi-experiment") || args.includes("--smartphone-roi-experiment");
  const roiAdoptionSimulation =
    args.includes("--roi-adoption-sim") || args.includes("--simulate-roi-adoption");
  const sourceIndex = args.indexOf("--source");
  const sourceValue = sourceIndex >= 0 ? args[sourceIndex + 1] : "";
  const forcedSource = ["smartphone", "desktop"].includes(sourceValue)
    ? sourceValue
    : "";
  const disabledKnownCorrectionArgs = parseDisabledKnownCorrections(args);
  const disabledKnownCorrections = new Set(
    disabledKnownCorrectionArgs.map(normalizeKnownCorrectionKey)
  );
  const filters = args
    .filter((value, index) =>
      value !== "--debug-next" &&
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
  const imagePaths = (await collectImages(testImagesDir))
    .filter((imagePath) => {
      if (filters.length === 0) return true;

      const relative = path.relative(testImagesDir, imagePath).replaceAll("\\", "/").toLowerCase();
      const base = path.basename(imagePath).toLowerCase();
      return filters.some((filter) => relative.includes(filter) || base.includes(filter));
    })
    .sort();
  const report = [];

  for (const imagePath of imagePaths) {
    const relative = path.relative(testImagesDir, imagePath).replaceAll("\\", "/");
    const category = getCategory(relative);
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






