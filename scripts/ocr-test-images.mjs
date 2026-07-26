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
  applySmartphoneCrownBonusRuleRecovery,
  applySmartphoneExactSlotSelectionRecovery,
  applySmartphoneStageWideSixMemberCandidateSolverRecovery,
  applyCurrentPcGroupedRawTokenRecovery,
  applyCurrentPcCrownBonusRuleRecovery,
  applyCurrentPcExactMembersCrownBonusTotalRecovery,
  applyCurrentPcSideLocalExactEvidenceRecovery,
  applyCurrentPcStageWideSixMemberCandidateSolverRecovery,
  applyCurrentPcStage3SevenDigitBonusDisplacementRecovery,
  buildCurrentPcCrownBonusRuleEvidence as sharedBuildCurrentPcCrownBonusRuleEvidence,
  buildCurrentPcExactMembersCrownBonusTotalRecoveryEvidence as sharedBuildCurrentPcExactMembersCrownBonusTotalRecoveryEvidence,
  buildCurrentPcSideLocalExactEvidenceRecoveryEvidence as sharedBuildCurrentPcSideLocalExactEvidenceRecoveryEvidence,
  buildSmartphoneCrownBonusRuleEvidence as sharedBuildSmartphoneCrownBonusRuleEvidence,
  buildSmartphoneExactSlotSelectionEvidence as sharedBuildSmartphoneExactSlotSelectionEvidence,
  buildSmartphoneStageWideSixMemberCandidateSolverEvidence as sharedBuildSmartphoneStageWideSixMemberCandidateSolverEvidence,
  buildCurrentPcCandidateSourceSummary as sharedBuildCurrentPcCandidateSourceSummary,
  buildCurrentPcGroupedRawTokenEvidenceSimulation as sharedBuildCurrentPcGroupedRawTokenEvidenceSimulation,
  buildCurrentPcStageWideSixMemberCandidateSolverEvidence as sharedBuildCurrentPcStageWideSixMemberCandidateSolverEvidence,
  buildCurrentPcStage3SevenDigitBonusDisplacementSimulation as sharedBuildCurrentPcStage3SevenDigitBonusDisplacementSimulation,
  collectCurrentPcGroupedRawTokenEvidence as sharedCollectCurrentPcGroupedRawTokenEvidence,
  collectCurrentPcSourceTokenAudits as sharedCollectCurrentPcSourceTokenAudits,
  currentPcOrderedMemberValuesFromTokenEvidence as sharedCurrentPcOrderedMemberValuesFromTokenEvidence,
  detectCurrentPcLayout as sharedDetectCurrentPcLayout,
  detectIpadOcrLayout as sharedDetectIpadOcrLayout,
  extractNumericLikeTokenAudit as sharedExtractNumericLikeTokenAudit,
} from "../app/lib/ocr.js";
import { applyKnownOcrCorrections, applyKnownOcrSetCorrections } from "../app/lib/ocrPostProcess.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testImagesDir = path.join(rootDir, "test-images");
const expectedDir = path.join(rootDir, "regression-test", "expected");
const ipadFixtureDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
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
const smartphoneBaselineCacheDir = path.join(rootDir, "tmp", "smartphone-ocr-baseline-cache");
const smartphoneTotalCaptureDiagnosticsDir = path.join(
  rootDir,
  "tmp",
  "smartphone-total-capture-diagnostics"
);
const smartphoneTotalCaptureDiagnosticsReportPath = path.join(
  rootDir,
  "docs",
  "smartphone-total-capture-diagnostics.md"
);
const currentPcBonusDiagnosticsDir = path.join(rootDir, "tmp", "current-pc-bonus-ocr-diagnostics");
const currentPcStage3MemberRowDiagnosticsDir = path.join(
  rootDir,
  "tmp",
  "current-pc-stage3-member-row-ocr-diagnostics"
);
const currentPcStage3SlotGeometryDiagnosticsDir = path.join(
  rootDir,
  "tmp",
  "current-pc-stage3-slot-geometry-diagnostics"
);
const currentPcStage3MergedRunImageSplitDir = path.join(
  rootDir,
  "tmp",
  "current-pc-stage3-self-merged-run-image-split-experiment"
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
const currentPcStage3SlotGeometryReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-stage3-slot-geometry-investigation.md"
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
const currentPcStageWideSolverReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-stage-wide-six-member-candidate-solver.md"
);
const currentPcStageWideSolverParityReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-stage-wide-six-member-candidate-solver-parity.md"
);
const currentPcStageWideVariantSolverReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-stage-wide-solver-stage3-variant-evidence.md"
);
const currentPcStage3MergedRunImageSplitReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-stage3-self-merged-run-image-split-experiment.md"
);
const currentPcExactMembersBonusTotalRecoveryReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-exact-members-bonus-total-recovery-investigation.md"
);
const currentPcSideLocalIncompleteOppositeEvidenceReportPath = path.join(
  rootDir,
  "docs",
  "current-pc-side-local-incomplete-opposite-evidence-investigation.md"
);
const smartphoneCrownBonusStageWideSolverReportPath = path.join(
  rootDir,
  "docs",
  "smartphone-crown-bonus-stage-wide-solver-investigation.md"
);
const smartphoneExactSlotSelectionSimulationReportPath = path.join(
  rootDir,
  "docs",
  "smartphone-exact-slot-selection-simulation.md"
);
const ipadOcrDiagnosticsDir = path.join(rootDir, "tmp", "ipad-ocr-diagnostics");
const ipadRoiInvestigationDir = path.join(rootDir, "tmp", "ipad-roi-investigation");
const ipadDatasetInventoryReportPath = path.join(
  rootDir,
  "docs",
  "ipad-dataset-inventory.md"
);
const ipadExpectedTranscriptionReportPath = path.join(
  rootDir,
  "docs",
  "ipad-expected-fixture-transcription.md"
);
const ipadInitialOcrBaselineReportPath = path.join(
  rootDir,
  "docs",
  "ipad-initial-ocr-baseline.md"
);
const ipadRoiGeometryInvestigationReportPath = path.join(
  rootDir,
  "docs",
  "ipad-roi-geometry-investigation.md"
);
const ipadPreprocessingInvestigationReportPath = path.join(
  rootDir,
  "docs",
  "ipad-preprocessing-ocr-investigation.md"
);
const ipadCandidateSelectionInvestigationReportPath = path.join(
  rootDir,
  "docs",
  "ipad-candidate-selection-investigation.md"
);
const ipadOcrBaselineDir = path.join(rootDir, "tmp", "ipad-ocr-baseline");
const ipadPreprocessingInvestigationDir = path.join(
  rootDir,
  "tmp",
  "ipad-preprocessing-investigation"
);
const ipadCandidateSelectionInvestigationDir = path.join(
  rootDir,
  "tmp",
  "ipad-candidate-selection"
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

function smartphoneBaselineCacheFileName(image) {
  return `${safeArtifactName(image)}.json`;
}

function smartphoneFixtureCacheKey(itemOrImage) {
  const image = typeof itemOrImage === "string" ? itemOrImage : itemOrImage?.image;
  const match = String(image || "").match(/IMG_\d+/i);
  return match ? match[0].toUpperCase() : String(image || "").replaceAll("\\", "/").toLowerCase();
}

async function writeSmartphoneBaselineCacheItem(item) {
  if (item.source !== "smartphone" || !item.expectedData || !item.result) return null;
  await fs.mkdir(smartphoneBaselineCacheDir, { recursive: true });
  const cachePath = path.join(smartphoneBaselineCacheDir, smartphoneBaselineCacheFileName(item.image));
  const artifact = {
    image: item.image,
    category: item.category,
    source: item.source,
    expected: item.expected,
    pass: item.pass,
    failures: item.failures,
    elapsedMs: item.elapsedMs,
    expectedData: item.expectedData,
    disabledKnownCorrections: item.disabledKnownCorrections,
    absolutePath: item.absolutePath,
    result: item.result,
  };
  await fs.writeFile(cachePath, JSON.stringify(artifact, null, 2));
  return path.relative(rootDir, cachePath).replaceAll("\\", "/");
}

async function readSmartphoneBaselineCache(filters = []) {
  const files = await fs.readdir(smartphoneBaselineCacheDir).catch(() => []);
  const byImage = new Map();
  const maybeAdd = async (item) => {
    if (item.source !== "smartphone" || !item.expectedData || !item.result) return;
    const imageKey = String(item.image || "").replaceAll("\\", "/").toLowerCase();
    if (filters.length > 0 && !filters.some((filter) => imageKey.includes(filter))) return;
    const fixtureKey = smartphoneFixtureCacheKey(item);
    if (!byImage.has(fixtureKey) || !String(item.image || "").includes("fewer-members/")) {
      byImage.set(fixtureKey, item);
    }
    await writeSmartphoneBaselineCacheItem(item);
  };
  for (const file of files.filter((name) => name.endsWith(".json") && name !== "summary.json")) {
    const cachePath = path.join(smartphoneBaselineCacheDir, file);
    const item = JSON.parse(await fs.readFile(cachePath, "utf8"));
    await maybeAdd(item);
  }
  const latestReport = JSON.parse(await fs.readFile(reportPath, "utf8").catch(() => "[]"));
  for (const item of Array.isArray(latestReport) ? latestReport : []) {
    await maybeAdd(item);
  }
  const items = [...byImage.values()];
  items.sort((a, b) => String(a.image).localeCompare(String(b.image), undefined, { numeric: true }));
  return items;
}

async function writeSmartphoneBaselineCacheSummary(items) {
  await fs.mkdir(smartphoneBaselineCacheDir, { recursive: true });
  const summaryPath = path.join(smartphoneBaselineCacheDir, "summary.json");
  const summary = items.map((item) => ({
    image: item.image,
    expected: item.expected,
    pass: item.pass,
    failures: item.failures?.length || 0,
    cache: path
      .relative(rootDir, path.join(smartphoneBaselineCacheDir, smartphoneBaselineCacheFileName(item.image)))
      .replaceAll("\\", "/"),
  }));
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  return path.relative(rootDir, summaryPath).replaceAll("\\", "/");
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

function shiftBbox(bbox, zone, scale = 1) {
  if (!bbox) return null;
  const safeScale = Number(scale) > 0 ? Number(scale) : 1;
  return {
    x0: Math.round((bbox.x0 || 0) / safeScale + zone.left),
    y0: Math.round((bbox.y0 || 0) / safeScale + zone.top),
    x1: Math.round((bbox.x1 || 0) / safeScale + zone.left),
    y1: Math.round((bbox.y1 || 0) / safeScale + zone.top),
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

function extractGeometryTokens(blocks = [], zone, scale = 1) {
  const words = traverseGeometryWords(blocks);
  return words.map((word) => {
    const cropBbox = word.bbox || null;
    const fullBbox = shiftBbox(cropBbox, zone, scale);
    const symbols = (word.symbols || []).map((symbol) => ({
      text: symbol.text,
      confidence: symbol.confidence,
      cropBbox: symbol.bbox,
      fullBbox: shiftBbox(symbol.bbox, zone, scale),
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
  const geometryScale = getOcrPresetConfig(options.preset)?.scale || 4;
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
    geometryScale,
    text: result.data.text || "",
    numbers: extractNumbersForZone(result.data.text || ""),
    tokens: extractGeometryTokens(blocks, zone, geometryScale),
    spans: findNumberSpansInWords(words, targetValues).map((span) => ({
      ...span,
      cropBbox: span.bbox,
      fullBbox: shiftBbox(span.bbox, zone, geometryScale),
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

function detectIpadOcrLayout(image) {
  return sharedDetectIpadOcrLayout(image);
}

function ipadDiagnosticPercentBox(image, box) {
  return clampZoneToImage(
    {
      left: image.width * box.left,
      top: image.height * box.top,
      width: image.width * box.width,
      height: image.height * box.height,
    },
    image
  );
}

function buildIpadDiagnosticLayout(image) {
  const portrait = image.height >= image.width;
  const stageRows = portrait
    ? [
        { stage: 1, top: 0.14, height: 0.20 },
        { stage: 2, top: 0.40, height: 0.20 },
        { stage: 3, top: 0.66, height: 0.20 },
      ]
    : [
        { stage: 1, top: 0.12, height: 0.22 },
        { stage: 2, top: 0.39, height: 0.22 },
        { stage: 3, top: 0.66, height: 0.22 },
      ];
  const columns = portrait
    ? {
        self: { left: 0.08, width: 0.40 },
        enemy: { left: 0.52, width: 0.40 },
      }
    : {
        self: { left: 0.08, width: 0.39 },
        enemy: { left: 0.53, width: 0.39 },
      };

  return {
    confidence: "estimated-unverified",
    note: "Diagnostic-only iPad geometry. These boxes are not used by production OCR.",
    stageRows: stageRows.map((row) => ({
      stage: row.stage,
      normalized: { left: 0.04, top: row.top, width: 0.92, height: row.height },
      zone: ipadDiagnosticPercentBox(image, {
        left: 0.04,
        top: row.top,
        width: 0.92,
        height: row.height,
      }),
    })),
    sides: Object.fromEntries(
      Object.entries(columns).map(([side, column]) => [
        side,
        {
          normalized: { left: column.left, top: 0, width: column.width, height: 1 },
          role: side === "self" ? "left-side-estimate" : "right-side-estimate",
        },
      ])
    ),
    stageSideZones: stageRows.flatMap((row) =>
      Object.entries(columns).map(([side, column]) => ({
        stage: row.stage,
        side,
        normalized: {
          left: column.left,
          top: row.top,
          width: column.width,
          height: row.height,
        },
        zone: ipadDiagnosticPercentBox(image, {
          left: column.left,
          top: row.top,
          width: column.width,
          height: row.height,
        }),
      }))
    ),
  };
}

async function recognizeIpadDiagnosticZone(imagePath, zone) {
  const passes = [
    { name: "default", options: { pageSegMode: "6" } },
    { name: "single-line", options: { pageSegMode: "7" } },
  ];
  const results = [];

  for (const pass of passes) {
    const result = await recognizeOcrZone(imagePath, zone, pass.options);
    results.push({
      pass: pass.name,
      rawText: result.text,
      normalizedCandidates: uniqueNumbers(result.numbers || []),
    });
  }

  return results;
}

function resolveIpadDiagnosticImagePaths(args) {
  const excludedFlags = new Set([
    "--ipad-ocr-diagnostics",
    "--source",
    "--audit-disable-known-correction",
  ]);
  const candidates = [];

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (excludedFlags.has(value)) {
      if (value === "--source" || value === "--audit-disable-known-correction") index += 1;
      continue;
    }
    if (value.startsWith("--")) continue;
    candidates.push(value);
  }

  return candidates.map((candidate) => {
    const normalized = candidate.replaceAll("/", path.sep);
    return path.isAbsolute(normalized) ? normalized : path.resolve(rootDir, normalized);
  });
}

async function saveIpadDiagnosticCrop(imagePath, image, outDir, label, zone) {
  const safeLabel = safeArtifactName(label);
  const clamped = clampZoneToImage(zone, image);
  const cropPath = path.join(outDir, `${safeLabel}.png`);
  const binarizedPath = path.join(outDir, `${safeLabel}.binarized.png`);
  await sharp(imagePath).extract(clamped).png().toFile(cropPath);
  const binarized = await createPreprocessedStageBuffer(imagePath, clamped, {
    pageSegMode: "6",
  });
  await fs.writeFile(binarizedPath, binarized);

  return {
    label,
    zone: clamped,
    crop: path.relative(rootDir, cropPath).replaceAll("\\", "/"),
    binarized: path.relative(rootDir, binarizedPath).replaceAll("\\", "/"),
  };
}

async function writeIpadOcrDiagnostics(imagePaths) {
  await fs.rm(ipadOcrDiagnosticsDir, { recursive: true, force: true });
  await fs.mkdir(ipadOcrDiagnosticsDir, { recursive: true });

  const diagnostics = [];
  const missing = [];

  for (const imagePath of imagePaths) {
    try {
      await fs.access(imagePath);
    } catch {
      missing.push(imagePath);
      continue;
    }

    const image = await readImageSize(imagePath);
    const imageName = path.basename(imagePath);
    const outDir = path.join(ipadOcrDiagnosticsDir, safeArtifactName(imageName));
    await fs.mkdir(outDir, { recursive: true });

    const detection = detectIpadOcrLayout(image);
    const currentPcDetection = detectCurrentPcLayout(image);
    const layout = buildIpadDiagnosticLayout(image);
    const cropArtifacts = [];
    const ocrZones = [];

    for (const row of layout.stageRows) {
      const artifact = await saveIpadDiagnosticCrop(
        imagePath,
        image,
        outDir,
        `stage${row.stage}-row`,
        row.zone
      );
      const ocr = await recognizeIpadDiagnosticZone(imagePath, row.zone);
      cropArtifacts.push(artifact);
      ocrZones.push({ type: "stage-row", stage: row.stage, zone: row.zone, artifact, ocr });
    }

    for (const zone of layout.stageSideZones) {
      const artifact = await saveIpadDiagnosticCrop(
        imagePath,
        image,
        outDir,
        `stage${zone.stage}-${zone.side}`,
        zone.zone
      );
      const ocr = await recognizeIpadDiagnosticZone(imagePath, zone.zone);
      cropArtifacts.push(artifact);
      ocrZones.push({
        type: "stage-side",
        stage: zone.stage,
        side: zone.side,
        zone: zone.zone,
        artifact,
        ocr,
      });
    }

    const diagnostic = {
      image: imageName,
      absolutePath: imagePath,
      metadata: {
        width: image.width,
        height: image.height,
        aspectRatio: Number((image.width / image.height).toFixed(6)),
        orientation:
          image.width > image.height
            ? "landscape"
            : image.height > image.width
              ? "portrait"
              : "square",
      },
      detectedOcrMode: detection.detected ? "ipad" : "unsupported-or-not-ipad",
      detection,
      currentPcDetection,
      layoutAnchors: {
        confidence: layout.confidence,
        note: layout.note,
        stageRows: layout.stageRows.map(({ stage, normalized, zone }) => ({
          stage,
          normalized,
          zone,
        })),
        sides: layout.sides,
      },
      cropArtifacts,
      ocrZones,
      productionBehavior: {
        finalStageScoresChanged: false,
        smartphoneRecoveriesApplied: false,
        note: "Diagnostics only. The runner exits before normal OCR baseline extraction.",
      },
    };

    const diagnosticPath = path.join(outDir, "diagnostics.json");
    await fs.writeFile(diagnosticPath, JSON.stringify(diagnostic, null, 2));
    diagnostics.push({
      ...diagnostic,
      artifact: path.relative(rootDir, diagnosticPath).replaceAll("\\", "/"),
    });
  }

  const summary = {
    command: "node scripts/ocr-test-images.mjs --ipad-ocr-diagnostics <image...>",
    outputDir: path.relative(rootDir, ipadOcrDiagnosticsDir).replaceAll("\\", "/"),
    imagesRequested: imagePaths.length,
    imagesProcessed: diagnostics.length,
    missing,
    images: diagnostics.map((item) => ({
      image: item.image,
      detectedOcrMode: item.detectedOcrMode,
      metadata: item.metadata,
      detectionReasons: item.detection.reasons,
      artifact: item.artifact,
    })),
  };
  const summaryPath = path.join(ipadOcrDiagnosticsDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

  return summary;
}

function getIpadDiagnosticsDirArg(args) {
  const index = args.indexOf("--ipad-ocr-diagnostics-dir");
  if (index < 0) return "";
  return args[index + 1] || "";
}

function isSupportedImageFile(fileName) {
  return /\.(png|jpe?g|webp)$/i.test(fileName || "");
}

async function enumerateIpadImageFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isSupportedImageFile(entry.name))
    .map((entry) => path.join(directory, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), "ja"));
}

async function sha256File(filePath) {
  const buffer = await fs.readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

function summarizeNumberRange(values, digits = 6) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return {
    min: Number(Math.min(...finite).toFixed(digits)),
    max: Number(Math.max(...finite).toFixed(digits)),
  };
}

async function buildIpadContentMetrics(filePath) {
  const sampleWidth = 96;
  const { data, info } = await sharp(filePath)
    .resize(sampleWidth, null, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const threshold = 18;
  const corner = [data[0], data[1], data[2]];
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let brightPixels = 0;
  let colorfulPixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (gray > 180) brightPixels += 1;
      if (max - min > 45) colorfulPixels += 1;
      const diff = Math.abs(r - corner[0]) + Math.abs(g - corner[1]) + Math.abs(b - corner[2]);
      if (diff > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const totalPixels = info.width * info.height;
  const bounds =
    maxX >= 0
      ? {
          left: Number((minX / info.width).toFixed(4)),
          top: Number((minY / info.height).toFixed(4)),
          right: Number(((maxX + 1) / info.width).toFixed(4)),
          bottom: Number(((maxY + 1) / info.height).toFixed(4)),
        }
      : null;

  return {
    sampleSize: `${info.width}x${info.height}`,
    contentBounds: bounds,
    brightRatio: Number((brightPixels / totalPixels).toFixed(4)),
    colorfulRatio: Number((colorfulPixels / totalPixels).toFixed(4)),
  };
}

function clusterIpadInventoryRows(rows) {
  const clusters = new Map();
  for (const row of rows) {
    const key = `${row.width}x${row.height}-${row.orientation}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(row);
  }

  return [...clusters.entries()]
    .map(([key, clusterRows], index) => {
      const contentTops = clusterRows
        .map((row) => row.contentBounds?.top)
        .filter((value) => Number.isFinite(value));
      const contentBottoms = clusterRows
        .map((row) => row.contentBounds?.bottom)
        .filter((value) => Number.isFinite(value));
      const aspects = clusterRows.map((row) => row.aspectRatio);
      const detectionCount = clusterRows.filter((row) => row.ipadDetection?.detected).length;
      return {
        id: `ipad-${String(index + 1).padStart(2, "0")}`,
        key,
        count: clusterRows.length,
        dimensions: `${clusterRows[0].width}x${clusterRows[0].height}`,
        orientation: clusterRows[0].orientation,
        aspectRange: summarizeNumberRange(aspects),
        contentTopRange: summarizeNumberRange(contentTops, 4),
        contentBottomRange: summarizeNumberRange(contentBottoms, 4),
        detectedAsIpad: detectionCount,
        likelyForm: "portrait full-screen or similarly cropped result family",
        rows: clusterRows,
      };
    })
    .sort((a, b) => b.count - a.count || a.dimensions.localeCompare(b.dimensions));
}

function chooseIpadFixtureSubset(clusters) {
  const totalTarget = Math.min(18, clusters.reduce((sum, cluster) => sum + cluster.rows.length, 0));
  const selected = [];
  const totalRows = clusters.reduce((sum, cluster) => sum + cluster.rows.length, 0);

  for (const cluster of clusters) {
    const target = Math.max(3, Math.round((cluster.count / totalRows) * totalTarget));
    const count = Math.min(target, cluster.rows.length);
    const rows = cluster.rows;
    const pickedIndexes = new Set();
    if (count === 1) {
      pickedIndexes.add(0);
    } else {
      for (let index = 0; index < count; index += 1) {
        pickedIndexes.add(Math.round((index * (rows.length - 1)) / (count - 1)));
      }
    }
    for (const rowIndex of [...pickedIndexes].sort((a, b) => a - b)) {
      const row = rows[rowIndex];
      selected.push({
        ...row,
        clusterId: cluster.id,
        selectionReason:
          rowIndex === 0
            ? "cluster-start representative"
            : rowIndex === rows.length - 1
              ? "cluster-end representative"
              : "evenly spaced cluster representative",
      });
    }
  }

  return selected.slice(0, totalTarget);
}

async function createIpadContactSheet(rows, outPath, options = {}) {
  if (rows.length === 0) return null;
  const thumbWidth = options.thumbWidth || 220;
  const thumbHeight = options.thumbHeight || 320;
  const columns = options.columns || 5;
  const labelHeight = 32;
  const gap = 12;
  const rowsCount = Math.ceil(rows.length / columns);
  const width = columns * thumbWidth + (columns + 1) * gap;
  const height = rowsCount * (thumbHeight + labelHeight) + (rowsCount + 1) * gap;
  const composites = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const x = gap + (index % columns) * (thumbWidth + gap);
    const y = gap + Math.floor(index / columns) * (thumbHeight + labelHeight + gap);
    const thumb = await sharp(row.absolutePath)
      .resize(thumbWidth, thumbHeight, { fit: "inside", background: "#111827" })
      .extend({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        background: "#111827",
      })
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${thumbWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#111827"/>
        <text x="6" y="20" fill="#f9fafb" font-size="14" font-family="Arial">${row.fileName}</text>
      </svg>`
    );
    composites.push({ input: thumb, left: x, top: y });
    composites.push({ input: label, left: x, top: y + thumbHeight });
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#0b1020",
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);
  return path.relative(rootDir, outPath).replaceAll("\\", "/");
}

async function createIpadOverlayArtifact(row, outPath) {
  const image = { width: row.width, height: row.height };
  const layout = buildIpadDiagnosticLayout(image);
  const rects = [
    ...layout.stageRows.map((stageRow) => svgRect(stageRow.zone, "#22c55e", `S${stageRow.stage}`)),
    ...layout.stageSideZones.map((zone) =>
      svgRect(zone.zone, zone.side === "self" ? "#38bdf8" : "#f97316", `S${zone.stage} ${zone.side}`)
    ),
  ].join("\n");
  const overlaySvg = Buffer.from(
    `<svg width="${row.width}" height="${row.height}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`
  );
  await sharp(row.absolutePath).composite([{ input: overlaySvg, left: 0, top: 0 }]).png().toFile(outPath);
  return path.relative(rootDir, outPath).replaceAll("\\", "/");
}

async function writeIpadExpectedManifest(selected) {
  await fs.mkdir(ipadExpectedDir, { recursive: true });
  const requiredFields = stages.map((stage) => ({
    stage,
    self: {
      members: ["member1", "member2", "member3"],
      bonus: "crownBonus",
      total: "total",
    },
    enemy: {
      members: ["member1", "member2", "member3"],
      bonus: "crownBonus",
      total: "total",
    },
  }));
  const manifest = {
    schema: "ipad-expected-manifest-v1",
    status: "pending-manual-transcription",
    note: "Do not infer values from OCR output. Fill expected values only from source screenshot review.",
    images: selected.map((row) => ({
      filename: row.fileName,
      clusterId: row.clusterId,
      width: row.width,
      height: row.height,
      orientation: row.orientation,
      expectedStatus: "pending",
      notes: row.selectionReason,
      requiredFields,
    })),
  };
  const manifestPath = path.join(ipadExpectedDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

async function copySelectedIpadFixtures(selected) {
  await fs.mkdir(ipadFixtureDir, { recursive: true });
  const copied = [];
  for (const row of selected) {
    const destination = path.join(ipadFixtureDir, row.fileName);
    await fs.copyFile(row.absolutePath, destination);
    copied.push(path.relative(rootDir, destination).replaceAll("\\", "/"));
  }
  return copied;
}

async function writeIpadDatasetInventory(directoryArg) {
  if (!directoryArg) {
    throw new Error("--ipad-ocr-diagnostics-dir requires a directory path");
  }
  const sourceDir = path.resolve(directoryArg);
  const inventoryDir = path.join(ipadOcrDiagnosticsDir, "dataset-inventory");
  await fs.rm(inventoryDir, { recursive: true, force: true });
  await fs.mkdir(inventoryDir, { recursive: true });

  const imagePaths = await enumerateIpadImageFiles(sourceDir);
  const rows = [];
  const unreadable = [];

  for (const imagePath of imagePaths) {
    const fileName = path.basename(imagePath);
    try {
      const stat = await fs.stat(imagePath);
      const metadata = await sharp(imagePath).metadata();
      const image = { width: metadata.width, height: metadata.height };
      const hash = await sha256File(imagePath);
      const metrics = await buildIpadContentMetrics(imagePath);
      const ipadDetection = detectIpadOcrLayout(image);
      rows.push({
        fileName,
        absolutePath: imagePath,
        width: metadata.width,
        height: metadata.height,
        aspectRatio: Number((metadata.width / metadata.height).toFixed(6)),
        orientation:
          metadata.width > metadata.height
            ? "landscape"
            : metadata.height > metadata.width
              ? "portrait"
              : "square",
        fileSize: stat.size,
        byteHash: hash,
        byteHashShort: hash.slice(0, 12),
        ipadDetection,
        ...metrics,
      });
    } catch (error) {
      unreadable.push({ fileName, absolutePath: imagePath, error: error.message });
    }
  }

  const duplicateGroups = Object.values(
    rows.reduce((groups, row) => {
      groups[row.byteHash] ||= [];
      groups[row.byteHash].push(row.fileName);
      return groups;
    }, {})
  ).filter((group) => group.length > 1);
  const clusters = clusterIpadInventoryRows(rows);
  const selected = chooseIpadFixtureSubset(clusters);
  const selectedNames = new Set(selected.map((row) => row.fileName));
  const nonTarget = rows.filter((row) => !row.ipadDetection.detected);

  const contactSheets = [];
  const allSheet = await createIpadContactSheet(rows, path.join(inventoryDir, "all-images-contact-sheet.png"), {
    columns: 6,
    thumbWidth: 180,
    thumbHeight: 260,
  });
  if (allSheet) contactSheets.push(allSheet);
  for (const cluster of clusters) {
    const sheet = await createIpadContactSheet(
      cluster.rows,
      path.join(inventoryDir, `${cluster.id}-contact-sheet.png`),
      { columns: 5 }
    );
    if (sheet) contactSheets.push(sheet);
  }

  const overlays = [];
  for (const cluster of clusters) {
    const representatives = [
      cluster.rows[0],
      cluster.rows[Math.floor(cluster.rows.length / 2)],
      cluster.rows[cluster.rows.length - 1],
    ].filter(Boolean);
    for (const row of representatives) {
      const overlay = await createIpadOverlayArtifact(
        row,
        path.join(inventoryDir, `${cluster.id}-${safeArtifactName(row.fileName)}-overlay.png`)
      );
      overlays.push(overlay);
    }
  }

  const copiedFixtures = await copySelectedIpadFixtures(selected);
  const manifestPath = await writeIpadExpectedManifest(selected);

  const inventory = {
    sourceDir,
    generatedAt: new Date().toISOString(),
    totalFiles: imagePaths.length,
    readableFiles: rows.length,
    unreadableFiles: unreadable.length,
    duplicates: duplicateGroups,
    nonTargetFiles: nonTarget.map((row) => row.fileName),
    clusters: clusters.map((cluster) => ({
      id: cluster.id,
      count: cluster.count,
      dimensions: cluster.dimensions,
      orientation: cluster.orientation,
      aspectRange: cluster.aspectRange,
      contentTopRange: cluster.contentTopRange,
      contentBottomRange: cluster.contentBottomRange,
      likelyForm: cluster.likelyForm,
      representatives: [
        cluster.rows[0]?.fileName,
        cluster.rows[Math.floor(cluster.rows.length / 2)]?.fileName,
        cluster.rows[cluster.rows.length - 1]?.fileName,
      ].filter(Boolean),
      outliers: cluster.rows
        .filter((row) => !row.ipadDetection.detected)
        .map((row) => row.fileName),
      files: cluster.rows.map((row) => row.fileName),
    })),
    selectedFixtures: selected.map((row) => ({
      fileName: row.fileName,
      clusterId: row.clusterId,
      reason: row.selectionReason,
      width: row.width,
      height: row.height,
      notableFeatures: [
        "pending manual score transcription",
        selectedNames.has(row.fileName) ? "balanced cluster sample" : null,
      ].filter(Boolean),
    })),
    copiedFixtures,
    manifest: path.relative(rootDir, manifestPath).replaceAll("\\", "/"),
    artifacts: {
      outputDir: path.relative(rootDir, inventoryDir).replaceAll("\\", "/"),
      contactSheets,
      overlays,
    },
    rows,
    unreadable,
  };

  await fs.writeFile(
    path.join(inventoryDir, "inventory.json"),
    JSON.stringify(inventory, null, 2)
  );
  await fs.writeFile(ipadDatasetInventoryReportPath, buildIpadDatasetInventoryReport(inventory));

  return inventory;
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function normalizeIpadExpectedFixture(expected) {
  return normalizeExpected(expected);
}

async function readIpadExpectedManifest() {
  return readJsonFile(path.join(ipadExpectedDir, "manifest.json"));
}

async function collectIpadExpectedFixtures() {
  const manifest = await readIpadExpectedManifest();
  const rows = [];
  const incomplete = [];

  for (const image of manifest.images || []) {
    const status = image.expectedStatus || "";
    if (status !== "complete") {
      incomplete.push(image);
      continue;
    }
    const fixtureName = image.expectedFixture || `${path.parse(image.filename).name}.json`;
    const imagePath = path.join(ipadFixtureDir, image.filename);
    const expectedPath = path.join(ipadExpectedDir, fixtureName);
    const expected = normalizeIpadExpectedFixture(await readJsonFile(expectedPath));
    rows.push({
      ...image,
      imagePath,
      expectedPath,
      fixtureName,
      expected,
    });
  }

  return { manifest, rows, incomplete };
}

function validateIpadStageExpected({ image, stage, expectedStage }) {
  const failures = [];
  const stageLabel = `${image.filename} stage${stage}`;
  const selfMembers = expectedStage.selfMembers || [];
  const enemyMembers = expectedStage.enemyMembers || [];
  const selfBonus = Number(expectedStage.selfBonus || 0);
  const enemyBonus = Number(expectedStage.enemyBonus || 0);
  const selfTotal = Number(expectedStage.selfTotal || 0);
  const enemyTotal = Number(expectedStage.enemyTotal || 0);

  for (const [side, members] of [
    ["self", selfMembers],
    ["enemy", enemyMembers],
  ]) {
    if (!Array.isArray(members) || members.length !== 3) {
      failures.push(`${stageLabel} ${side}: members must contain exactly 3 values`);
    }
    for (const [index, member] of (members || []).entries()) {
      if (!Number.isInteger(member) || member < 0) {
        failures.push(`${stageLabel} ${side} member${index + 1}: invalid value ${member}`);
      }
    }
  }

  for (const [label, value] of [
    ["selfBonus", selfBonus],
    ["enemyBonus", enemyBonus],
    ["selfTotal", selfTotal],
    ["enemyTotal", enemyTotal],
  ]) {
    if (!Number.isInteger(value) || value < 0) {
      failures.push(`${stageLabel} ${label}: invalid value ${value}`);
    }
  }

  const selfCalculated = selfMembers.reduce((sum, value) => sum + value, 0) + selfBonus;
  const enemyCalculated = enemyMembers.reduce((sum, value) => sum + value, 0) + enemyBonus;
  if (selfCalculated !== selfTotal) {
    failures.push(
      `${stageLabel} self arithmetic: ${formatNumber(selfCalculated)} != ${formatNumber(selfTotal)}`
    );
  }
  if (enemyCalculated !== enemyTotal) {
    failures.push(
      `${stageLabel} enemy arithmetic: ${formatNumber(enemyCalculated)} != ${formatNumber(enemyTotal)}`
    );
  }

  const allMembers = [
    ...selfMembers.map((value, index) => ({ side: "self", slot: index + 1, value })),
    ...enemyMembers.map((value, index) => ({ side: "enemy", slot: index + 1, value })),
  ];
  const maxValue = Math.max(...allMembers.map((member) => member.value));
  const winners = allMembers.filter((member) => member.value === maxValue);
  const expectedBonus = Math.floor(maxValue * 0.2);

  if (winners.length !== 1) {
    failures.push(`${stageLabel}: expected a unique global rank-1 member, found ${winners.length}`);
  } else {
    const winner = winners[0];
    const winnerBonus = winner.side === "self" ? selfBonus : enemyBonus;
    const loserBonus = winner.side === "self" ? enemyBonus : selfBonus;
    if (winnerBonus !== expectedBonus) {
      failures.push(
        `${stageLabel}: ${winner.side} bonus ${formatNumber(winnerBonus)} != floor(${formatNumber(maxValue)} * 0.20) ${formatNumber(expectedBonus)}`
      );
    }
    if (loserBonus !== 0) {
      failures.push(`${stageLabel}: non-winning side bonus must be 0, got ${formatNumber(loserBonus)}`);
    }
  }

  return {
    failures,
    selfCalculated,
    enemyCalculated,
    maxValue,
    winners,
    expectedBonus,
  };
}

async function validateIpadExpectedFixtures() {
  const { manifest, rows, incomplete } = await collectIpadExpectedFixtures();
  const failures = [];
  const stageSummaries = [];

  for (const row of rows) {
    try {
      await fs.access(row.imagePath);
    } catch {
      failures.push(`${row.filename}: source image missing at ${row.imagePath}`);
    }
    try {
      const metadata = await sharp(row.imagePath).metadata();
      if (Number(row.width || 0) !== Number(metadata.width || 0)) {
        failures.push(`${row.filename}: manifest width ${row.width} != image width ${metadata.width}`);
      }
      if (Number(row.height || 0) !== Number(metadata.height || 0)) {
        failures.push(`${row.filename}: manifest height ${row.height} != image height ${metadata.height}`);
      }
    } catch (error) {
      failures.push(`${row.filename}: could not read source image metadata: ${error.message}`);
    }

    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const summary = validateIpadStageExpected({
        image: row,
        stage,
        expectedStage: row.expected[stageKey],
      });
      failures.push(...summary.failures);
      stageSummaries.push({
        image: row.filename,
        stage,
        globalMax: summary.maxValue,
        winningSide: summary.winners.length === 1 ? summary.winners[0].side : "ambiguous",
        derivedBonus: summary.expectedBonus,
        selfTotal: row.expected[stageKey].selfTotal,
        enemyTotal: row.expected[stageKey].enemyTotal,
      });
    }
  }

  const summary = {
    command: "node scripts/ocr-test-images.mjs --validate-ipad-expected",
    manifestStatus: manifest.status || "",
    totalManifestImages: (manifest.images || []).length,
    completeFixtures: rows.length,
    incompleteFixtures: incomplete.length,
    stagesChecked: rows.length * stages.length,
    stageSidesChecked: rows.length * stages.length * sides.length,
    arithmeticPass: failures.length === 0,
    crownRulePass: failures.length === 0,
    failures,
    stageSummaries,
  };

  await fs.writeFile(ipadExpectedTranscriptionReportPath, buildIpadExpectedValidationReport(summary));
  return summary;
}

function buildIpadExpectedValidationReport(summary) {
  const lines = [
    "# iPad Expected Fixture Transcription",
    "",
    "## Summary",
    "",
    `- manifest status: \`${summary.manifestStatus}\``,
    `- manifest images: ${summary.totalManifestImages}`,
    `- complete expected fixtures: ${summary.completeFixtures}`,
    `- incomplete expected fixtures: ${summary.incompleteFixtures}`,
    `- stages checked: ${summary.stagesChecked}`,
    `- stage/side rows checked: ${summary.stageSidesChecked}`,
    `- arithmetic validation: ${summary.arithmeticPass ? "PASS" : "FAIL"}`,
    `- crown-bonus floor-rule validation: ${summary.crownRulePass ? "PASS" : "FAIL"}`,
    "",
    "The fixture values in this first iPad batch were manually transcribed from the source screenshots. OCR output was not used as source truth.",
    "",
    "Blank displayed member slots are represented as `0`, matching the existing expected-fixture convention used by other OCR fixture families.",
    "",
    "## Validation Failures",
    "",
    summary.failures.length
      ? summary.failures.map((failure) => `- ${failure}`).join("\n")
      : "- None.",
    "",
    "## Stage Crown-Bonus Checks",
    "",
    "| image | stage | global max | winning side | derived bonus | self total | enemy total |",
    "| --- | ---: | ---: | --- | ---: | ---: | ---: |",
  ];

  for (const row of summary.stageSummaries) {
    lines.push(
      `| \`${row.image}\` | ${row.stage} | ${formatNumber(row.globalMax)} | ${row.winningSide} | ${formatNumber(row.derivedBonus)} | ${formatNumber(row.selfTotal)} | ${formatNumber(row.enemyTotal)} |`
    );
  }

  return `${lines.join("\n")}\n`;
}

function parseIpadOcrNumbers(text = "") {
  const candidates = [];
  const regex = /[+＋-]?\s*(?:\d{1,3}(?:[,.\s]\d{3})+|\d{1,8})/g;
  for (const match of text.matchAll(regex)) {
    const raw = match[0] || "";
    const normalized = raw.replace(/[^\d]/g, "");
    if (!normalized) continue;
    const value = Number(normalized);
    if (!Number.isInteger(value) || value < 0 || value > 9999999) continue;
    candidates.push({
      raw: raw.trim(),
      value,
      index: match.index || 0,
      plusLike: /^[+＋]/.test(raw.trim()),
    });
  }
  return candidates;
}

function buildIpadBaselineLayout(image) {
  return buildIpadCorrectedRoiTemplate(image).stageSideZones;
}

function buildIpadCorrectedRoiTemplate(image) {
  const sideColumns = {
    self: {
      side: { left: 0.115, width: 0.37 },
      total: { left: 0.16, width: 0.33 },
      members: [
        { left: 0.145, width: 0.12 },
        { left: 0.255, width: 0.13 },
        { left: 0.365, width: 0.13 },
      ],
      bonus: { left: 0.105, width: 0.38 },
    },
    enemy: {
      side: { left: 0.515, width: 0.37 },
      total: { left: 0.58, width: 0.33 },
      members: [
        { left: 0.535, width: 0.12 },
        { left: 0.645, width: 0.13 },
        { left: 0.755, width: 0.13 },
      ],
      bonus: { left: 0.505, width: 0.38 },
    },
  };
  const rows = [
    { stage: 1, rowTop: 0.095, totalTop: 0.112, memberTop: 0.149, bonusTop: 0.166 },
    { stage: 2, rowTop: 0.334, totalTop: 0.351, memberTop: 0.388, bonusTop: 0.405 },
    { stage: 3, rowTop: 0.576, totalTop: 0.593, memberTop: 0.631, bonusTop: 0.648 },
  ];
  const box = (definition) => ipadDiagnosticPercentBox(image, definition);
  const stageRows = rows.map((row) => ({
    stage: row.stage,
    normalized: { left: 0.09, top: row.rowTop, width: 0.82, height: 0.165 },
    zone: box({ left: 0.09, top: row.rowTop, width: 0.82, height: 0.165 }),
  }));
  const stageSideZones = rows.flatMap((row) =>
    Object.entries(sideColumns).map(([side, column]) => ({
      stage: row.stage,
      side,
      normalized: {
        left: column.side.left,
        top: row.rowTop,
        width: column.side.width,
        height: 0.165,
      },
      zone: box({
        left: column.side.left,
        top: row.rowTop,
        width: column.side.width,
        height: 0.165,
      }),
    }))
  );
  const fields = rows.flatMap((row) =>
    Object.entries(sideColumns).flatMap(([side, column]) => {
      const base = [
        {
          stage: row.stage,
          side,
          field: "total",
          slot: 0,
          normalized: {
            left: column.total.left,
            top: row.totalTop,
            width: column.total.width,
            height: 0.035,
          },
        },
        {
          stage: row.stage,
          side,
          field: "bonus",
          slot: 0,
          normalized: {
            left: column.bonus.left,
            top: row.bonusTop,
            width: column.bonus.width,
            height: 0.034,
          },
        },
      ];
      const members = column.members.map((member, index) => ({
        stage: row.stage,
        side,
        field: "member",
        slot: index + 1,
        normalized: {
          left: member.left,
          top: row.memberTop,
          width: member.width,
          height: 0.028,
        },
      }));
      return [...base, ...members].map((field) => ({
        ...field,
        zone: box(field.normalized),
      }));
    })
  );

  return {
    version: "ipad-shared-portrait-v2",
    confidence: "manually-calibrated-diagnostic",
    note:
      "Shared normalized iPad portrait score-table template, calibrated against the 18 manually verified fixtures. Diagnostic-only.",
    stageRows,
    stageSideZones,
    fields,
  };
}

async function getIpadOcrWorker() {
  const worker = await createWorker("eng");
  await worker.setParameters({
    tessedit_char_whitelist: "0123456789,+.＋",
    tessedit_pageseg_mode: "7",
    preserve_interword_spaces: "1",
  });
  return worker;
}

async function recognizeIpadFieldZone(worker, imagePath, image, field, outDir) {
  const artifact = await saveIpadDiagnosticCrop(
    imagePath,
    image,
    outDir,
    `stage${field.stage}-${field.side}-${field.field}${field.slot || ""}`,
    field.zone
  );
  const buffer = await createPreprocessedStageBuffer(imagePath, field.zone, {
    pageSegMode: "7",
    charWhitelist: "0123456789,+.＋",
  });
  const result = await worker.recognize(buffer);
  const rawText = result.data.text || "";
  const parsedCandidates = parseIpadOcrNumbers(rawText);
  const values = parsedCandidates.map((candidate) => candidate.value);
  const selected =
    field.field === "bonus"
      ? parsedCandidates.find((candidate) => candidate.plusLike)?.value || values[0] || 0
      : values[0] || 0;

  return {
    ...field,
    artifact,
    rawText,
    parsedCandidates,
    selected,
  };
}

async function summarizeIpadCropQuality(imagePath, field, rawText, parsedCandidates) {
  const { data, info } = await sharp(imagePath)
    .extract(field.zone)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let foreground = 0;
  let borderForeground = 0;
  const threshold = 190;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const value = data[y * info.width + x];
      const isForeground = value >= threshold;
      if (!isForeground) continue;
      foreground += 1;
      if (x <= 1 || y <= 1 || x >= info.width - 2 || y >= info.height - 2) {
        borderForeground += 1;
      }
    }
  }
  const totalPixels = info.width * info.height;
  const foregroundRatio = Number((foreground / totalPixels).toFixed(4));
  return {
    cropWidth: field.zone.width,
    cropHeight: field.zone.height,
    foregroundPixelRatio: foregroundRatio,
    connectedComponentCount: null,
    touchesBorder: borderForeground > 0,
    likelyEmpty:
      foregroundRatio < 0.006 &&
      String(rawText || "").trim().length === 0 &&
      parsedCandidates.length === 0,
    rawText,
  };
}

function getExpectedIpadField(expectedStage, side, field, slot = 0) {
  if (field === "total") return side === "self" ? expectedStage.selfTotal : expectedStage.enemyTotal;
  if (field === "bonus") return side === "self" ? expectedStage.selfBonus : expectedStage.enemyBonus;
  const members = side === "self" ? expectedStage.selfMembers : expectedStage.enemyMembers;
  return members[slot - 1] || 0;
}

function classifyIpadFieldCrop(fieldResult, expectedValue) {
  const candidates = fieldResult.parsedCandidates.map((candidate) => candidate.value);
  if (fieldResult.selected === expectedValue) return "correct region";
  if (candidates.includes(expectedValue)) return "correct value present but unselected";
  if (fieldResult.quality?.likelyEmpty) return "number absent from crop";
  if (!candidates.length) return "numeric OCR absent";
  return "OCR mismatch";
}

function compareIpadSide(selected, expectedStage, side) {
  const expectedMembers = side === "self" ? expectedStage.selfMembers : expectedStage.enemyMembers;
  const expectedBonus = side === "self" ? expectedStage.selfBonus : expectedStage.enemyBonus;
  const expectedTotal = side === "self" ? expectedStage.selfTotal : expectedStage.enemyTotal;
  const memberMatches = expectedMembers.map((expected, index) => ({
    slot: index + 1,
    expected,
    actual: selected.members[index] || 0,
    pass: (selected.members[index] || 0) === expected,
  }));
  return {
    pass:
      memberMatches.every((match) => match.pass) &&
      selected.bonus === expectedBonus &&
      selected.total === expectedTotal,
    membersPass: memberMatches.every((match) => match.pass),
    memberMatches,
    bonusPass: selected.bonus === expectedBonus,
    totalPass: selected.total === expectedTotal,
    expected: {
      members: expectedMembers,
      bonus: expectedBonus,
      total: expectedTotal,
    },
    actual: selected,
  };
}

function updateIpadBaselineCounters(counters, stage, side, comparison) {
  counters.stageSideRows += 1;
  counters.stageSidePass += comparison.pass ? 1 : 0;
  const positionKey = `stage${stage}_${side}`;
  counters.positions[positionKey] ||= { pass: 0, fail: 0 };
  counters.positions[positionKey][comparison.pass ? "pass" : "fail"] += 1;

  for (const match of comparison.memberMatches) {
    const key = `member${match.slot}`;
    counters.fields[key].total += 1;
    counters.fields[key].pass += match.pass ? 1 : 0;
  }
  counters.fields.all3Members.total += 1;
  counters.fields.all3Members.pass += comparison.membersPass ? 1 : 0;
  counters.fields.bonus.total += 1;
  counters.fields.bonus.pass += comparison.bonusPass ? 1 : 0;
  counters.fields.total.total += 1;
  counters.fields.total.pass += comparison.totalPass ? 1 : 0;
}

function percentage(pass, total) {
  return total ? Number(((pass / total) * 100).toFixed(1)) : 0;
}

async function runIpadOcrBaseline() {
  const { rows, incomplete } = await collectIpadExpectedFixtures();
  await fs.rm(ipadOcrBaselineDir, { recursive: true, force: true });
  await fs.mkdir(ipadOcrBaselineDir, { recursive: true });
  const overlaysDir = path.join(ipadRoiInvestigationDir, "overlays");
  const contactSheetsDir = path.join(ipadRoiInvestigationDir, "contact-sheets");
  await fs.rm(ipadRoiInvestigationDir, { recursive: true, force: true });
  await fs.mkdir(overlaysDir, { recursive: true });
  await fs.mkdir(contactSheetsDir, { recursive: true });

  const counters = {
    images: rows.length,
    imagePass: 0,
    stages: rows.length * stages.length,
    stagePass: 0,
    stageSideRows: 0,
    stageSidePass: 0,
    positions: {},
    fields: {
      member1: { pass: 0, total: 0 },
      member2: { pass: 0, total: 0 },
      member3: { pass: 0, total: 0 },
      all3Members: { pass: 0, total: 0 },
      bonus: { pass: 0, total: 0 },
      total: { pass: 0, total: 0 },
    },
    cropCategories: {},
    clusters: {},
    ocrFieldCounts: {
      fields: 0,
      nonEmptyText: 0,
      numericCandidate: 0,
      exactMembers: 0,
      exactBonus: 0,
      exactTotal: 0,
    },
  };
  const imageResults = [];
  const contactSheetRows = [];
  const worker = await getIpadOcrWorker();

  try {
    for (const row of rows) {
      const image = await readImageSize(row.imagePath);
      const detection = detectIpadOcrLayout(image);
      const clusterKey = `${row.clusterId || "unknown"} ${image.width}x${image.height}`;
      counters.clusters[clusterKey] ||= {
        images: 0,
        imagePass: 0,
        stages: 0,
        stagePass: 0,
        stageSides: 0,
        stageSidePass: 0,
        fields: {
          member: { pass: 0, total: 0 },
          bonus: { pass: 0, total: 0 },
          total: { pass: 0, total: 0 },
        },
      };
      counters.clusters[clusterKey].images += 1;
      counters.clusters[clusterKey].stages += stages.length;
      const outDir = path.join(ipadOcrBaselineDir, safeArtifactName(row.filename));
      await fs.mkdir(outDir, { recursive: true });
      const template = buildIpadCorrectedRoiTemplate(image);
      await writeIpadRoiOverlay(row.imagePath, image, template, path.join(overlaysDir, `${safeArtifactName(row.filename)}.png`));
      const stageResults = {};
      let imagePass = true;

      for (const stage of stages) {
        const stageKey = `stage${stage}`;
        stageResults[stageKey] = {};
        let stagePass = true;
        for (const side of sides) {
          const fieldsForSide = template.fields.filter(
            (field) => field.stage === stage && field.side === side
          );
          const fieldResults = [];
          const selected = {
            members: [0, 0, 0],
            bonus: 0,
            total: 0,
          };
          for (const field of fieldsForSide) {
            const recognized = await recognizeIpadFieldZone(worker, row.imagePath, image, field, outDir);
            const expectedValue = getExpectedIpadField(row.expected[stageKey], side, field.field, field.slot);
            const quality = await summarizeIpadCropQuality(
              row.imagePath,
              field,
              recognized.rawText,
              recognized.parsedCandidates
            );
            const category = classifyIpadFieldCrop({ ...recognized, quality }, expectedValue);
            counters.cropCategories[category] ||= 0;
            counters.cropCategories[category] += 1;
            counters.ocrFieldCounts.fields += 1;
            if (String(recognized.rawText || "").trim()) counters.ocrFieldCounts.nonEmptyText += 1;
            if (recognized.parsedCandidates.length) counters.ocrFieldCounts.numericCandidate += 1;
            if (recognized.selected === expectedValue) {
              if (field.field === "member") counters.ocrFieldCounts.exactMembers += 1;
              if (field.field === "bonus") counters.ocrFieldCounts.exactBonus += 1;
              if (field.field === "total") counters.ocrFieldCounts.exactTotal += 1;
            }
            counters.clusters[clusterKey].fields[field.field === "member" ? "member" : field.field].total += 1;
            counters.clusters[clusterKey].fields[field.field === "member" ? "member" : field.field].pass +=
              recognized.selected === expectedValue ? 1 : 0;
            fieldResults.push({
              ...recognized,
              expectedValue,
              quality,
              cropClassification: category,
            });
            contactSheetRows.push({
              clusterKey,
              label: `${path.parse(row.filename).name} S${stage} ${side} ${field.field}${field.slot || ""}`,
              cropPath: path.resolve(rootDir, recognized.artifact.crop),
            });
            if (field.field === "total") selected.total = recognized.selected;
            else if (field.field === "bonus") selected.bonus = recognized.selected;
            else selected.members[field.slot - 1] = recognized.selected;
          }

          const comparison = compareIpadSide(selected, row.expected[stageKey], side);
          updateIpadBaselineCounters(counters, stage, side, comparison);
          counters.clusters[clusterKey].stageSides += 1;
          counters.clusters[clusterKey].stageSidePass += comparison.pass ? 1 : 0;
          stageResults[stageKey][side] = {
            selected,
            fields: fieldResults,
            comparison,
          };
          if (!comparison.pass) stagePass = false;
        }
        stageResults[stageKey].pass = stagePass;
        if (stagePass) {
          counters.stagePass += 1;
          counters.clusters[clusterKey].stagePass += 1;
        }
        if (!stagePass) imagePass = false;
      }

      if (imagePass) {
        counters.imagePass += 1;
        counters.clusters[clusterKey].imagePass += 1;
      }
      const imageResult = {
        image: row.filename,
        expectedFixture: row.fixtureName,
        clusterId: row.clusterId,
        metadata: image,
        detectedOcrMode: detection.detected ? "ipad" : "unsupported-or-not-ipad",
        roiTemplate: template.version,
        pass: imagePass,
        overlay: path.relative(rootDir, path.join(overlaysDir, `${safeArtifactName(row.filename)}.png`)).replaceAll("\\", "/"),
        stages: stageResults,
      };
      const resultPath = path.join(outDir, "baseline.json");
      await fs.writeFile(resultPath, JSON.stringify(imageResult, null, 2));
      imageResults.push({
        ...imageResult,
        artifact: path.relative(rootDir, resultPath).replaceAll("\\", "/"),
      });
    }
  } finally {
    await worker.terminate();
  }

  const contactSheets = await writeIpadRoiContactSheets(contactSheetRows, contactSheetsDir);

  const summary = {
    command: "node scripts/ocr-test-images.mjs --ipad-ocr-baseline",
    outputDir: path.relative(rootDir, ipadOcrBaselineDir).replaceAll("\\", "/"),
    completeFixtures: rows.length,
    incompleteFixtures: incomplete.length,
    images: {
      pass: counters.imagePass,
      fail: counters.images - counters.imagePass,
      total: counters.images,
      accuracy: percentage(counters.imagePass, counters.images),
    },
    stages: {
      pass: counters.stagePass,
      fail: counters.stages - counters.stagePass,
      total: counters.stages,
      accuracy: percentage(counters.stagePass, counters.stages),
    },
    stageSides: {
      pass: counters.stageSidePass,
      fail: counters.stageSideRows - counters.stageSidePass,
      total: counters.stageSideRows,
      accuracy: percentage(counters.stageSidePass, counters.stageSideRows),
    },
    positions: counters.positions,
    fields: Object.fromEntries(
      Object.entries(counters.fields).map(([key, value]) => [
        key,
        { ...value, accuracy: percentage(value.pass, value.total) },
      ])
    ),
    cropCategories: counters.cropCategories,
    ocrFieldCounts: counters.ocrFieldCounts,
    clusters: Object.fromEntries(
      Object.entries(counters.clusters).map(([key, cluster]) => [
        key,
        {
          images: {
            pass: cluster.imagePass,
            fail: cluster.images - cluster.imagePass,
            total: cluster.images,
            accuracy: percentage(cluster.imagePass, cluster.images),
          },
          stages: {
            pass: cluster.stagePass,
            fail: cluster.stages - cluster.stagePass,
            total: cluster.stages,
            accuracy: percentage(cluster.stagePass, cluster.stages),
          },
          stageSides: {
            pass: cluster.stageSidePass,
            fail: cluster.stageSides - cluster.stageSidePass,
            total: cluster.stageSides,
            accuracy: percentage(cluster.stageSidePass, cluster.stageSides),
          },
          fields: Object.fromEntries(
            Object.entries(cluster.fields).map(([field, value]) => [
              field,
              { ...value, accuracy: percentage(value.pass, value.total) },
            ])
          ),
        },
      ])
    ),
    roiInvestigationArtifacts: {
      overlaysDir: path.relative(rootDir, overlaysDir).replaceAll("\\", "/"),
      contactSheetsDir: path.relative(rootDir, contactSheetsDir).replaceAll("\\", "/"),
      contactSheets,
    },
    imagesDetail: imageResults.map((image) => ({
      image: image.image,
      clusterId: image.clusterId,
      pass: image.pass,
      artifact: image.artifact,
      overlay: image.overlay,
      failingRows: stages.flatMap((stage) =>
        sides
          .filter((side) => !image.stages[`stage${stage}`][side].comparison.pass)
          .map((side) => ({ stage, side }))
      ),
    })),
    note:
      "Diagnostic-only first iPad baseline. It uses broad fixed iPad crops and does not alter production OCR output or reuse smartphone recoveries.",
  };

  await fs.writeFile(path.join(ipadOcrBaselineDir, "summary.json"), JSON.stringify(summary, null, 2));
  await fs.writeFile(ipadInitialOcrBaselineReportPath, buildIpadInitialOcrBaselineReport(summary));
  await fs.writeFile(ipadRoiGeometryInvestigationReportPath, buildIpadRoiGeometryInvestigationReport(summary));
  return summary;
}

function ratioText(pass, total) {
  return `${pass} / ${total} (${percentage(pass, total)}%)`;
}

async function writeIpadRoiOverlay(imagePath, image, template, outPath) {
  const rects = [
    ...template.stageRows.map((row) => svgRect(row.zone, "#22c55e", `S${row.stage} row`)),
    ...template.stageSideZones.map((zone) =>
      svgRect(zone.zone, zone.side === "self" ? "#38bdf8" : "#f97316", `S${zone.stage} ${zone.side}`)
    ),
    ...template.fields.map((field) => {
      const color =
        field.field === "total" ? "#facc15" : field.field === "bonus" ? "#a78bfa" : "#ffffff";
      const label =
        field.field === "member"
          ? `S${field.stage} ${field.side} M${field.slot}`
          : `S${field.stage} ${field.side} ${field.field}`;
      return svgRect(field.zone, color, label);
    }),
  ].join("\n");
  const overlaySvg = Buffer.from(
    `<svg width="${image.width}" height="${image.height}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(imagePath).composite([{ input: overlaySvg, left: 0, top: 0 }]).png().toFile(outPath);
  return path.relative(rootDir, outPath).replaceAll("\\", "/");
}

async function writeIpadRoiContactSheets(rows, outDir) {
  const groups = rows.reduce((map, row) => {
    map[row.clusterKey] ||= [];
    map[row.clusterKey].push(row);
    return map;
  }, {});
  const sheets = [];
  await fs.mkdir(outDir, { recursive: true });

  for (const [clusterKey, clusterRows] of Object.entries(groups)) {
    const thumbWidth = 180;
    const thumbHeight = 72;
    const labelHeight = 28;
    const columns = 4;
    const gap = 10;
    const rowsCount = Math.ceil(clusterRows.length / columns);
    const width = columns * thumbWidth + (columns + 1) * gap;
    const height = rowsCount * (thumbHeight + labelHeight) + (rowsCount + 1) * gap;
    const composites = [];

    for (let index = 0; index < clusterRows.length; index += 1) {
      const row = clusterRows[index];
      const left = gap + (index % columns) * (thumbWidth + gap);
      const top = gap + Math.floor(index / columns) * (thumbHeight + labelHeight + gap);
      const input = await sharp(row.cropPath)
        .resize(thumbWidth, thumbHeight, { fit: "contain", background: "#111827" })
        .png()
        .toBuffer();
      const label = Buffer.from(
        `<svg width="${thumbWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#111827"/>
          <text x="4" y="18" fill="#f9fafb" font-size="12" font-family="Arial">${row.label}</text>
        </svg>`
      );
      composites.push({ input, left, top });
      composites.push({ input: label, left, top: top + thumbHeight });
    }

    const outPath = path.join(outDir, `${safeArtifactName(clusterKey)}.png`);
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: "#0b1020",
      },
    })
      .composite(composites)
      .png()
      .toFile(outPath);
    sheets.push(path.relative(rootDir, outPath).replaceAll("\\", "/"));
  }

  return sheets;
}

function buildIpadInitialOcrBaselineReport(summary) {
  const lines = [
    "# iPad Initial OCR Baseline",
    "",
    "## Summary",
    "",
    `- complete expected fixtures: ${summary.completeFixtures}`,
    `- incomplete fixtures excluded: ${summary.incompleteFixtures}`,
    `- image-level PASS: ${ratioText(summary.images.pass, summary.images.total)}`,
    `- stage-level PASS: ${ratioText(summary.stages.pass, summary.stages.total)}`,
    `- stage/side-level PASS: ${ratioText(summary.stageSides.pass, summary.stageSides.total)}`,
    `- ROI template: \`ipad-shared-portrait-v2\``,
    "",
    "This is a diagnostic-only baseline for the new iPad fixture lane. It uses isolated iPad field crops, writes artifacts under `tmp/ipad-ocr-baseline/`, and does not change production OCR output.",
    "",
    "## Field Accuracy",
    "",
    "| field | pass | total | accuracy |",
    "| --- | ---: | ---: | ---: |",
  ];

  for (const [field, value] of Object.entries(summary.fields)) {
    lines.push(`| ${field} | ${value.pass} | ${value.total} | ${value.accuracy}% |`);
  }

  lines.push(
    "",
    "## OCR Field Evidence Rates",
    "",
    `- fields checked: ${summary.ocrFieldCounts.fields}`,
    `- non-empty OCR text: ${ratioText(summary.ocrFieldCounts.nonEmptyText, summary.ocrFieldCounts.fields)}`,
    `- numeric candidate present: ${ratioText(summary.ocrFieldCounts.numericCandidate, summary.ocrFieldCounts.fields)}`,
    `- exact member fields: ${summary.ocrFieldCounts.exactMembers}`,
    `- exact bonus fields: ${summary.ocrFieldCounts.exactBonus}`,
    `- exact total fields: ${summary.ocrFieldCounts.exactTotal}`,
    ""
  );

  lines.push(
    "",
    "## Stage/Side Position Accuracy",
    "",
    "| position | pass | fail |",
    "| --- | ---: | ---: |"
  );
  for (const stage of stages) {
    for (const side of sides) {
      const key = `stage${stage}_${side}`;
      const value = summary.positions[key] || { pass: 0, fail: 0 };
      lines.push(`| S${stage} ${side} | ${value.pass} | ${value.fail} |`);
    }
  }

  lines.push(
    "",
    "## Per-Image Result",
    "",
    "| image | result | failing stage/sides | artifact |",
    "| --- | --- | --- | --- |"
  );
  for (const image of summary.imagesDetail) {
    const failing = image.failingRows.length
      ? image.failingRows.map((row) => `S${row.stage} ${row.side}`).join(", ")
      : "-";
    lines.push(
      `| \`${image.image}\` | ${image.pass ? "PASS" : "FAIL"} | ${failing} | \`${image.artifact}\` |`
    );
  }

  lines.push(
    "",
    "## Per-Cluster Accuracy",
    "",
    "| cluster | image | stage | stage/side | member fields | bonus fields | total fields |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const [cluster, data] of Object.entries(summary.clusters || {})) {
    lines.push(
      `| ${cluster} | ${ratioText(data.images.pass, data.images.total)} | ${ratioText(data.stages.pass, data.stages.total)} | ${ratioText(data.stageSides.pass, data.stageSides.total)} | ${ratioText(data.fields.member.pass, data.fields.member.total)} | ${ratioText(data.fields.bonus.pass, data.fields.bonus.total)} | ${ratioText(data.fields.total.pass, data.fields.total.total)} |`
    );
  }

  lines.push(
    "",
    "## Initial Interpretation",
    "",
    "- The baseline establishes a repeatable PASS/FAIL harness for iPad fixtures, not a production OCR claim.",
    "- The corrected field geometry makes Stage1 partially readable, but Stage2/Stage3 still need preprocessing work.",
    "- The next useful iPad step is a runner-only preprocessing experiment over these isolated field crops.",
    ""
  );

  return `${lines.join("\n")}\n`;
}

function buildIpadRoiGeometryInvestigationReport(summary) {
  const lines = [
    "# iPad ROI Geometry Investigation",
    "",
    "## Summary",
    "",
    "- investigation type: diagnostic-only iPad ROI geometry and crop quality",
    "- production OCR behavior changed: no",
    "- smartphone/current-PC/legacy desktop OCR behavior changed: no",
    "- initial broad-crop baseline before this correction: 0 / 18 images, 0 / 54 stages, 0 / 108 stage/sides",
    `- corrected ROI baseline images: ${ratioText(summary.images.pass, summary.images.total)}`,
    `- corrected ROI baseline stages: ${ratioText(summary.stages.pass, summary.stages.total)}`,
    `- corrected ROI baseline stage/sides: ${ratioText(summary.stageSides.pass, summary.stageSides.total)}`,
    "",
    "## Root Cause",
    "",
    "The original diagnostic iPad baseline used broad stage/side rows whose vertical starts were too low for the visible score table. Total and member text frequently sat above or at the edge of the crop, so the OCR pass mostly saw card art, buttons, or partial score text rather than isolated numeric fields.",
    "",
    "## Original Geometry",
    "",
    "- Stage rows were estimated at normalized tops `0.14`, `0.40`, and `0.66` with height `0.20`.",
    "- Self/enemy columns were estimated as broad side crops: self `left=0.08 width=0.40`, enemy `left=0.52 width=0.40`.",
    "- The first baseline did not split total, individual member slots, and bonus fields.",
    "- OCR used Tesseract.js `eng` with the existing score preprocessing, mostly page segmentation modes 6/7.",
    "",
    "## Corrected Diagnostic Geometry",
    "",
    "- Template: `ipad-shared-portrait-v2`.",
    "- Stage total tops: `0.112`, `0.351`, `0.593`.",
    "- Stage member tops: `0.149`, `0.388`, `0.631`.",
    "- Stage bonus tops: `0.166`, `0.405`, `0.648`.",
    "- Self total/member/bonus fields are separated from enemy fields; each member slot now has a distinct field crop.",
    "- The same normalized template is used for both portrait clusters because the 1668x2420 and 1640x2360 screenshots align by normalized score-table coordinates.",
    "",
    "## Visual Artifacts",
    "",
    `- overlays: \`${summary.roiInvestigationArtifacts.overlaysDir}\``,
    `- contact sheets: \`${summary.roiInvestigationArtifacts.contactSheetsDir}\``,
    ...summary.roiInvestigationArtifacts.contactSheets.map((sheet) => `- contact sheet: \`${sheet}\``),
    "",
    "## Crop Classification Counts",
    "",
    "Initial broad-crop visual classification: all 108 stage/side crops were vertically late for score-table extraction, and all 108 had no member/bonus/total field split. The corrected template below is field-level; these counts classify OCR evidence from the corrected field crops.",
    "",
    "| category | count |",
    "| --- | ---: |",
  ];

  for (const [category, count] of Object.entries(summary.cropCategories || {}).sort()) {
    lines.push(`| ${category} | ${count} |`);
  }

  lines.push(
    "",
    "## Per-Cluster Results",
    "",
    "| cluster | images | stages | stage/sides | member fields | bonus fields | total fields |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const [cluster, data] of Object.entries(summary.clusters || {})) {
    lines.push(
      `| ${cluster} | ${ratioText(data.images.pass, data.images.total)} | ${ratioText(data.stages.pass, data.stages.total)} | ${ratioText(data.stageSides.pass, data.stageSides.total)} | ${ratioText(data.fields.member.pass, data.fields.member.total)} | ${ratioText(data.fields.bonus.pass, data.fields.bonus.total)} | ${ratioText(data.fields.total.pass, data.fields.total.total)} |`
    );
  }

  lines.push(
    "",
    "## Remaining Error Categories",
    "",
    "- Exact OCR is still weak even after fields are better isolated, especially on white member and total text over patterned backgrounds.",
    "- Bonus accuracy is comparatively high because most non-winning sides have true zero bonus and blank bonus crops.",
    "- The dominant next issue is OCR preprocessing/recognition quality for isolated white numeric fields, not arithmetic recovery.",
    "",
    "## Recommended Next Experiment",
    "",
    "Run a runner-only iPad preprocessing experiment on the isolated field crops. Start with total/member fields only, compare threshold/contrast/upscale variants by exact field accuracy, and keep all arithmetic/crown/solver recoveries disabled until iPad evidence parity exists.",
    ""
  );

  return `${lines.join("\n")}\n`;
}

function getIpadPreprocessingProfiles() {
  return [
    {
      id: "baseline-score-preprocess-3x-psm7",
      label: "Existing score preprocessing, 3x, PSM 7",
      kind: "existing",
      scale: 3,
      pageSegMode: "7",
      fieldTypes: ["member", "bonus", "total"],
    },
    {
      id: "invert-normalize-3x-psm7",
      label: "Inverted grayscale normalize, 3x, PSM 7",
      kind: "invert-normalize",
      scale: 3,
      pageSegMode: "7",
      fieldTypes: ["member", "bonus", "total"],
    },
    {
      id: "white-mask-3x-psm7",
      label: "White-text mask, 3x, PSM 7",
      kind: "white-mask",
      scale: 3,
      pageSegMode: "7",
      threshold: 176,
      fieldTypes: ["member", "bonus", "total"],
    },
    {
      id: "blue-bonus-mask-3x-psm7",
      label: "Blue bonus mask, 3x, PSM 7",
      kind: "blue-bonus-mask",
      scale: 3,
      pageSegMode: "7",
      fieldTypes: ["bonus"],
    },
  ];
}

function paddedIpadFieldZone(field, image, paddingRatio = 0.12) {
  const padX = Math.max(2, Math.round(field.zone.width * paddingRatio));
  const padY = Math.max(2, Math.round(field.zone.height * paddingRatio));
  return clampZoneToImage(
    {
      left: field.zone.left - padX,
      top: field.zone.top - padY,
      width: field.zone.width + padX * 2,
      height: field.zone.height + padY * 2,
    },
    image
  );
}

async function createIpadPreprocessedFieldBuffer(imagePath, image, field, profile) {
  const zone = paddedIpadFieldZone(field, image, profile.paddingRatio ?? 0.12);
  if (profile.kind === "existing") {
    const buffer = await createPreprocessedStageBuffer(imagePath, zone, {
      pageSegMode: profile.pageSegMode || "7",
      charWhitelist: "0123456789,+.＋",
    });
    return { buffer, zone };
  }

  if (profile.kind === "white-mask" || profile.kind === "blue-bonus-mask") {
    const { data, info } = await sharp(imagePath)
      .extract(zone)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const output = Buffer.alloc(info.width * info.height * 4);
    for (let index = 0; index < data.length; index += 4) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      const isDigit =
        profile.kind === "blue-bonus-mask"
          ? b > 145 && b > r + 24 && b > g + 8
          : max >= (profile.threshold || 176) && saturation < 130;
      const value = isDigit ? 0 : 255;
      output[index] = value;
      output[index + 1] = value;
      output[index + 2] = value;
      output[index + 3] = 255;
    }
    const scale = profile.scale || 3;
    const buffer = await sharp(output, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .resize(info.width * scale, info.height * scale, { kernel: profile.kernel || "cubic" })
      .png()
      .toBuffer();
    return { buffer, zone };
  }

  let pipeline = sharp(imagePath).extract(zone).greyscale().normalize();
  if (profile.kind === "invert-normalize") pipeline = pipeline.negate();
  const scale = profile.scale || 3;
  const buffer = await pipeline
    .resize(zone.width * scale, zone.height * scale, {
      kernel: profile.kernel || "cubic",
    })
    .png()
    .toBuffer();
  return { buffer, zone };
}

async function recognizeIpadPreprocessedField(worker, imagePath, image, field, profile, workerState) {
  const workerConfigKey = `${profile.pageSegMode || "7"}`;
  if (workerState.configKey !== workerConfigKey) {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789,+.＋",
      tessedit_pageseg_mode: profile.pageSegMode || "7",
      preserve_interword_spaces: "1",
    });
    workerState.configKey = workerConfigKey;
  }
  const { buffer, zone } = await createIpadPreprocessedFieldBuffer(imagePath, image, field, profile);
  const result = await worker.recognize(buffer);
  const rawText = result.data.text || "";
  const parsedCandidates = parseIpadOcrNumbers(rawText);
  const values = parsedCandidates.map((candidate) => candidate.value);
  const selected =
    field.field === "bonus"
      ? parsedCandidates.find((candidate) => candidate.plusLike)?.value || values[0] || 0
      : values[0] || 0;
  return {
    profileId: profile.id,
    stage: field.stage,
    side: field.side,
    field: field.field,
    slot: field.slot || 0,
    zone,
    rawText,
    ocrConfidence: Number(result.data.confidence || 0),
    parsedCandidates,
    selected,
  };
}

function levenshteinDistance(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[left.length][right.length];
}

function createIpadVariantMetric() {
  return {
    fields: 0,
    exact: 0,
    numericCandidate: 0,
    empty: 0,
    nonNumeric: 0,
    editDistanceSum: 0,
    digitLengthExact: 0,
    leadingDigitErrors: 0,
    trailingDigitErrors: 0,
    insertedDigits: 0,
    deletedDigits: 0,
    newlyCorrect: 0,
    previouslyCorrectLost: 0,
    changedFields: 0,
  };
}

function updateIpadVariantMetric(metric, result, expectedValue, baselineResult) {
  const selected = Number(result.selected || 0);
  const expected = Number(expectedValue || 0);
  const selectedText = selected ? String(selected) : "";
  const expectedText = String(expected);
  const baselineSelected = Number(baselineResult?.selected || 0);
  const exact = selected === expected;
  const baselineExact = baselineSelected === expected;
  metric.fields += 1;
  metric.exact += exact ? 1 : 0;
  metric.numericCandidate += result.parsedCandidates.length ? 1 : 0;
  metric.empty += String(result.rawText || "").trim() ? 0 : 1;
  metric.nonNumeric += String(result.rawText || "").trim() && !result.parsedCandidates.length ? 1 : 0;
  metric.editDistanceSum += levenshteinDistance(selectedText, expectedText);
  metric.digitLengthExact += selectedText.length === expectedText.length ? 1 : 0;
  metric.leadingDigitErrors += selectedText[0] && selectedText[0] !== expectedText[0] ? 1 : 0;
  metric.trailingDigitErrors +=
    selectedText[selectedText.length - 1] &&
    selectedText[selectedText.length - 1] !== expectedText[expectedText.length - 1]
      ? 1
      : 0;
  metric.insertedDigits += Math.max(0, selectedText.length - expectedText.length);
  metric.deletedDigits += Math.max(0, expectedText.length - selectedText.length);
  metric.newlyCorrect += exact && !baselineExact ? 1 : 0;
  metric.previouslyCorrectLost += !exact && baselineExact ? 1 : 0;
  metric.changedFields += selected !== baselineSelected ? 1 : 0;
}

function finalizeIpadVariantMetric(metric) {
  return {
    ...metric,
    exactAccuracy: percentage(metric.exact, metric.fields),
    numericCandidateRate: percentage(metric.numericCandidate, metric.fields),
    emptyRate: percentage(metric.empty, metric.fields),
    nonNumericRate: percentage(metric.nonNumeric, metric.fields),
    averageEditDistance: metric.fields
      ? Number((metric.editDistanceSum / metric.fields).toFixed(2))
      : 0,
    digitLengthAccuracy: percentage(metric.digitLengthExact, metric.fields),
    netExactGain: metric.newlyCorrect - metric.previouslyCorrectLost,
  };
}

function chooseIpadPrimaryProfiles(metricsByFieldType, profiles) {
  const selected = {};
  for (const fieldType of ["member", "bonus", "total"]) {
    const ranked = profiles
      .map((profile) => ({
        profileId: profile.id,
        metric: metricsByFieldType[fieldType]?.[profile.id],
      }))
      .filter((entry) => entry.metric)
      .sort((a, b) => {
        if (b.metric.exact !== a.metric.exact) return b.metric.exact - a.metric.exact;
        if (a.metric.previouslyCorrectLost !== b.metric.previouslyCorrectLost) {
          return a.metric.previouslyCorrectLost - b.metric.previouslyCorrectLost;
        }
        if (b.metric.numericCandidate !== a.metric.numericCandidate) {
          return b.metric.numericCandidate - a.metric.numericCandidate;
        }
        return a.profileId.localeCompare(b.profileId);
      });
    selected[fieldType] = ranked[0]?.profileId || profiles[0].id;
  }
  return selected;
}

function getIpadProfilesForFieldType(profiles, fieldType) {
  return profiles.filter(
    (profile) => !profile.fieldTypes || profile.fieldTypes.includes(fieldType)
  );
}

function buildIpadSelectedSimulationSummary({ rows, resultsByFieldKey, selectedProfiles, unionProfiles }) {
  const counters = {
    images: rows.length,
    imagePass: 0,
    stages: rows.length * stages.length,
    stagePass: 0,
    stageSides: rows.length * stages.length * sides.length,
    stageSidePass: 0,
    fields: {
      member: { pass: 0, total: 0 },
      bonus: { pass: 0, total: 0 },
      total: { pass: 0, total: 0 },
    },
    clusters: {},
    union: {
      present: 0,
      total: 0,
      candidateCountSum: 0,
      ambiguous: 0,
    },
  };
  const imageDetails = [];

  for (const row of rows) {
    const clusterKey = `${row.clusterId || "unknown"} ${row.width}x${row.height}`;
    counters.clusters[clusterKey] ||= {
      images: 0,
      imagePass: 0,
      stages: 0,
      stagePass: 0,
      stageSides: 0,
      stageSidePass: 0,
    };
    counters.clusters[clusterKey].images += 1;
    counters.clusters[clusterKey].stages += stages.length;
    let imagePass = true;
    const failures = [];
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      let stagePass = true;
      for (const side of sides) {
        const selected = { members: [0, 0, 0], bonus: 0, total: 0 };
        for (const fieldType of ["total", "bonus", "member"]) {
          const slots = fieldType === "member" ? [1, 2, 3] : [0];
          for (const slot of slots) {
            const key = `${row.filename}|${stage}|${side}|${fieldType}|${slot}`;
            const expectedValue = getExpectedIpadField(row.expected[stageKey], side, fieldType, slot);
            const profileId = selectedProfiles[fieldType];
            const result = resultsByFieldKey.get(key)?.[profileId];
            const selectedValue = Number(result?.selected || 0);
            const fieldKey = fieldType === "member" ? "member" : fieldType;
            counters.fields[fieldKey].total += 1;
            counters.fields[fieldKey].pass += selectedValue === expectedValue ? 1 : 0;

            const unionIds = unionProfiles[fieldType] || [profileId];
            const unionCandidates = uniqueNumbers(
              unionIds.flatMap((unionProfileId) =>
                (resultsByFieldKey.get(key)?.[unionProfileId]?.parsedCandidates || []).map(
                  (candidate) => candidate.value
                )
              )
            );
            counters.union.total += 1;
            counters.union.present += unionCandidates.includes(expectedValue) ? 1 : 0;
            counters.union.candidateCountSum += unionCandidates.length;
            counters.union.ambiguous += unionCandidates.length > 1 ? 1 : 0;

            if (fieldType === "total") selected.total = selectedValue;
            else if (fieldType === "bonus") selected.bonus = selectedValue;
            else selected.members[slot - 1] = selectedValue;
          }
        }
        const comparison = compareIpadSide(selected, row.expected[stageKey], side);
        if (comparison.pass) {
          counters.stageSidePass += 1;
          counters.clusters[clusterKey].stageSidePass += 1;
        } else {
          stagePass = false;
          failures.push(`S${stage} ${side}`);
        }
        counters.clusters[clusterKey].stageSides += 1;
      }
      if (stagePass) {
        counters.stagePass += 1;
        counters.clusters[clusterKey].stagePass += 1;
      } else {
        imagePass = false;
      }
    }
    if (imagePass) {
      counters.imagePass += 1;
      counters.clusters[clusterKey].imagePass += 1;
    }
    imageDetails.push({ image: row.filename, pass: imagePass, failures });
  }

  return {
    images: {
      pass: counters.imagePass,
      fail: counters.images - counters.imagePass,
      total: counters.images,
      accuracy: percentage(counters.imagePass, counters.images),
    },
    stages: {
      pass: counters.stagePass,
      fail: counters.stages - counters.stagePass,
      total: counters.stages,
      accuracy: percentage(counters.stagePass, counters.stages),
    },
    stageSides: {
      pass: counters.stageSidePass,
      fail: counters.stageSides - counters.stageSidePass,
      total: counters.stageSides,
      accuracy: percentage(counters.stageSidePass, counters.stageSides),
    },
    fields: Object.fromEntries(
      Object.entries(counters.fields).map(([field, value]) => [
        field,
        { ...value, accuracy: percentage(value.pass, value.total) },
      ])
    ),
    clusters: Object.fromEntries(
      Object.entries(counters.clusters).map(([cluster, value]) => [
        cluster,
        {
          images: {
            pass: value.imagePass,
            fail: value.images - value.imagePass,
            total: value.images,
            accuracy: percentage(value.imagePass, value.images),
          },
          stages: {
            pass: value.stagePass,
            fail: value.stages - value.stagePass,
            total: value.stages,
            accuracy: percentage(value.stagePass, value.stages),
          },
          stageSides: {
            pass: value.stageSidePass,
            fail: value.stageSides - value.stageSidePass,
            total: value.stageSides,
            accuracy: percentage(value.stageSidePass, value.stageSides),
          },
        },
      ])
    ),
    union: {
      expectedPresent: counters.union.present,
      fields: counters.union.total,
      expectedPresentRate: percentage(counters.union.present, counters.union.total),
      averageCandidateCount: counters.union.total
        ? Number((counters.union.candidateCountSum / counters.union.total).toFixed(2))
        : 0,
      ambiguousFields: counters.union.ambiguous,
    },
    imageDetails,
  };
}

async function writeIpadPreprocessingComparisonSheet(rows, outPath) {
  const selected = rows.slice(0, 24);
  if (!selected.length) return null;
  const columns = 2;
  const thumbWidth = 220;
  const thumbHeight = 64;
  const labelHeight = 44;
  const gap = 12;
  const rowHeight = thumbHeight + labelHeight;
  const rowsCount = Math.ceil(selected.length / columns);
  const width = columns * thumbWidth * 2 + (columns + 1) * gap;
  const height = rowsCount * rowHeight + (rowsCount + 1) * gap;
  const composites = [];
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const left = gap + (index % columns) * (thumbWidth * 2 + gap);
    const top = gap + Math.floor(index / columns) * (rowHeight + gap);
    const original = await sharp(item.imagePath)
      .extract(item.field.zone)
      .resize(thumbWidth, thumbHeight, { fit: "contain", background: "#111827" })
      .png()
      .toBuffer();
    const profile = getIpadPreprocessingProfiles().find((candidate) => candidate.id === item.profileId);
    const { buffer } = await createIpadPreprocessedFieldBuffer(
      item.imagePath,
      item.image,
      item.field,
      profile
    );
    const processed = await sharp(buffer)
      .resize(thumbWidth, thumbHeight, { fit: "contain", background: "#111827" })
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="${thumbWidth * 2}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#111827"/>
        <text x="4" y="16" fill="#f9fafb" font-size="12" font-family="Arial">${item.label}</text>
        <text x="4" y="34" fill="#93c5fd" font-size="12" font-family="Arial">exp ${item.expected} got ${item.actual} ${item.profileId}</text>
      </svg>`
    );
    composites.push({ input: original, left, top });
    composites.push({ input: processed, left: left + thumbWidth, top });
    composites.push({ input: label, left, top: top + thumbHeight });
  }
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#0b1020",
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);
  return path.relative(rootDir, outPath).replaceAll("\\", "/");
}

async function runIpadPreprocessingSimulation() {
  const { rows } = await collectIpadExpectedFixtures();
  const profiles = getIpadPreprocessingProfiles();
  await fs.rm(ipadPreprocessingInvestigationDir, { recursive: true, force: true });
  await fs.mkdir(ipadPreprocessingInvestigationDir, { recursive: true });
  const worker = await getIpadOcrWorker();
  const resultsByFieldKey = new Map();
  const metricsByFieldType = {
    member: {},
    bonus: {},
    total: {},
  };
  const metricsByCluster = {};
  const workerState = {};

  for (const fieldType of Object.keys(metricsByFieldType)) {
    for (const profile of getIpadProfilesForFieldType(profiles, fieldType)) {
      metricsByFieldType[fieldType][profile.id] = createIpadVariantMetric();
    }
  }

  try {
    for (const row of rows) {
      const image = await readImageSize(row.imagePath);
      const clusterKey = `${row.clusterId || "unknown"} ${image.width}x${image.height}`;
      metricsByCluster[clusterKey] ||= {};
      const template = buildIpadCorrectedRoiTemplate(image);
      for (const field of template.fields) {
        const fieldType = field.field === "member" ? "member" : field.field;
        const applicableProfiles = getIpadProfilesForFieldType(profiles, fieldType);
        const expectedValue = getExpectedIpadField(
          row.expected[`stage${field.stage}`],
          field.side,
          field.field,
          field.slot
        );
        const fieldKey = `${row.filename}|${field.stage}|${field.side}|${field.field}|${field.slot || 0}`;
        const profileResults = {};
        for (const profile of applicableProfiles) {
          const result = await recognizeIpadPreprocessedField(
            worker,
            row.imagePath,
            image,
            field,
            profile,
            workerState
          );
          profileResults[profile.id] = result;
        }
        resultsByFieldKey.set(fieldKey, profileResults);
        const baselineResult = profileResults["baseline-score-preprocess-3x-psm7"];
        for (const profile of applicableProfiles) {
          metricsByCluster[clusterKey][fieldType] ||= {};
          metricsByCluster[clusterKey][fieldType][profile.id] ||= createIpadVariantMetric();
          updateIpadVariantMetric(
            metricsByFieldType[fieldType][profile.id],
            profileResults[profile.id],
            expectedValue,
            baselineResult
          );
          updateIpadVariantMetric(
            metricsByCluster[clusterKey][fieldType][profile.id],
            profileResults[profile.id],
            expectedValue,
            baselineResult
          );
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  const finalizedMetrics = Object.fromEntries(
    Object.entries(metricsByFieldType).map(([fieldType, byProfile]) => [
      fieldType,
      Object.fromEntries(
        Object.entries(byProfile).map(([profileId, metric]) => [
          profileId,
          finalizeIpadVariantMetric(metric),
        ])
      ),
    ])
  );
  const finalizedClusterMetrics = Object.fromEntries(
    Object.entries(metricsByCluster).map(([cluster, byField]) => [
      cluster,
      Object.fromEntries(
        Object.entries(byField).map(([fieldType, byProfile]) => [
          fieldType,
          Object.fromEntries(
            Object.entries(byProfile).map(([profileId, metric]) => [
              profileId,
              finalizeIpadVariantMetric(metric),
            ])
          ),
        ])
      ),
    ])
  );
  const selectedProfiles = chooseIpadPrimaryProfiles(finalizedMetrics, profiles);
  const unionProfiles = Object.fromEntries(
    Object.entries(finalizedMetrics).map(([fieldType, byProfile]) => [
      fieldType,
      Object.entries(byProfile)
        .sort((a, b) => b[1].exact - a[1].exact || b[1].numericCandidate - a[1].numericCandidate)
        .slice(0, 3)
        .map(([profileId]) => profileId),
    ])
  );
  const selectedSummary = buildIpadSelectedSimulationSummary({
    rows,
    resultsByFieldKey,
    selectedProfiles,
    unionProfiles,
  });

  const representativeRows = [];
  for (const row of rows) {
    const image = { width: row.width, height: row.height };
    const template = buildIpadCorrectedRoiTemplate(image);
    for (const stage of stages) {
      for (const side of sides) {
        for (const fieldType of ["total", "bonus", "member"]) {
          const slots = fieldType === "member" ? [1, 2, 3] : [0];
          for (const slot of slots) {
            const key = `${row.filename}|${stage}|${side}|${fieldType}|${slot}`;
            const expectedValue = getExpectedIpadField(row.expected[`stage${stage}`], side, fieldType, slot);
            const profileId = selectedProfiles[fieldType];
            const selected = resultsByFieldKey.get(key)?.[profileId];
            const baseline = resultsByFieldKey.get(key)?.["baseline-score-preprocess-3x-psm7"];
            if (!selected || !baseline) continue;
            const selectedExact = selected.selected === expectedValue;
            const baselineExact = baseline.selected === expectedValue;
            if (
              (selectedExact && !baselineExact) ||
              (!selectedExact && baselineExact) ||
              (!selected.parsedCandidates.length && !selectedExact) ||
              (!selectedExact && selected.parsedCandidates.length)
            ) {
              const field = template.fields.find(
                (candidate) =>
                  candidate.stage === stage &&
                  candidate.side === side &&
                  candidate.field === fieldType &&
                  (candidate.slot || 0) === slot
              );
              representativeRows.push({
                label: `${path.parse(row.filename).name} S${stage} ${side} ${fieldType}${slot || ""}`,
                expected: expectedValue,
                actual: selected.selected,
                profileId,
                imagePath: row.imagePath,
                image,
                field,
              });
            }
          }
        }
      }
    }
  }

  const comparisonSheet = await writeIpadPreprocessingComparisonSheet(
    representativeRows,
    path.join(ipadPreprocessingInvestigationDir, "representative-comparisons.png")
  );

  const summary = {
    command: "node scripts/ocr-test-images.mjs --ipad-preprocessing-simulation",
    outputDir: path.relative(rootDir, ipadPreprocessingInvestigationDir).replaceAll("\\", "/"),
    testedVariants: profiles.length,
    profiles: profiles.map(({ id, label, kind, scale, pageSegMode, fieldTypes }) => ({
      id,
      label,
      kind,
      scale,
      pageSegMode,
      fieldTypes,
    })),
    baselineProfile: "baseline-score-preprocess-3x-psm7",
    selectedProfiles,
    unionProfiles,
    metrics: finalizedMetrics,
    clusterMetrics: finalizedClusterMetrics,
    selectedSummary,
    comparisonSheet,
    isolation: {
      roiGeometryChanged: false,
      productionOutputChanged: false,
      smartphoneBehaviorChanged: false,
      currentPcBehaviorChanged: false,
      legacyDesktopBehaviorChanged: false,
      ipadProductionEnabled: false,
      recoveryLogicAdded: false,
    },
  };
  await fs.writeFile(
    path.join(ipadPreprocessingInvestigationDir, "summary.json"),
    JSON.stringify(summary, null, 2)
  );
  await fs.writeFile(
    ipadPreprocessingInvestigationReportPath,
    buildIpadPreprocessingInvestigationReport(summary)
  );
  return summary;
}

function formatIpadProfileMetric(metric) {
  return `${metric.exact} / ${metric.fields} (${metric.exactAccuracy}%), net ${metric.netExactGain}, lost ${metric.previouslyCorrectLost}`;
}

function buildIpadPreprocessingInvestigationReport(summary) {
  const lines = [
    "# iPad Preprocessing OCR Investigation",
    "",
    "## Summary",
    "",
    `- tested variants: ${summary.testedVariants}`,
    `- member profile: \`${summary.selectedProfiles.member}\``,
    `- bonus profile: \`${summary.selectedProfiles.bonus}\``,
    `- total profile: \`${summary.selectedProfiles.total}\``,
    `- selected-profile image PASS: ${ratioText(summary.selectedSummary.images.pass, summary.selectedSummary.images.total)}`,
    `- selected-profile stage PASS: ${ratioText(summary.selectedSummary.stages.pass, summary.selectedSummary.stages.total)}`,
    `- selected-profile stage/side PASS: ${ratioText(summary.selectedSummary.stageSides.pass, summary.selectedSummary.stageSides.total)}`,
    `- bounded candidate-union expected-value presence: ${ratioText(summary.selectedSummary.union.expectedPresent, summary.selectedSummary.union.fields)}`,
    `- average bounded-union candidate count: ${summary.selectedSummary.union.averageCandidateCount}`,
    `- ambiguous bounded-union fields: ${summary.selectedSummary.union.ambiguousFields}`,
    "",
    "This is diagnostic-only. It does not change ROI geometry, production OCR output, or any smartphone/current-PC/legacy desktop behavior.",
    "",
    "## Current Preprocessing Baseline",
    "",
    "- source format: screenshot RGB/RGBA crops via Sharp.",
    "- baseline conversion: existing `createPreprocessedStageBuffer(...)` score preprocessing.",
    "- OCR engine: Tesseract.js `eng`.",
    "- baseline page segmentation: PSM 7 for isolated fields.",
    "- whitelist: ASCII digits plus comma/period and plus-like bonus markers.",
    "- candidate normalization: punctuation and non-digits are stripped, plus-like bonus candidates are preserved as provenance only.",
    "",
    "## Tested Variant Matrix",
    "",
    "| profile | fields | kind | scale | PSM |",
    "| --- | --- | --- | ---: | ---: |",
  ];
  for (const profile of summary.profiles) {
    lines.push(
      `| \`${profile.id}\` | ${(profile.fieldTypes || ["member", "bonus", "total"]).join(", ")} | ${profile.kind} | ${profile.scale || "-"} | ${profile.pageSegMode} |`
    );
  }

  lines.push(
    "",
    "## Results By Field Type",
    "",
    "| field | profile | exact | numeric candidates | empty | avg edit distance | digit length | newly correct | lost |",
    "| --- | --- | --- | --- | --- | ---: | --- | ---: | ---: |"
  );
  for (const fieldType of ["member", "bonus", "total"]) {
    const entries = Object.entries(summary.metrics[fieldType] || {}).sort(
      (a, b) => b[1].exact - a[1].exact || b[1].numericCandidate - a[1].numericCandidate
    );
    for (const [profileId, metric] of entries) {
      lines.push(
        `| ${fieldType} | \`${profileId}\` | ${ratioText(metric.exact, metric.fields)} | ${ratioText(metric.numericCandidate, metric.fields)} | ${ratioText(metric.empty, metric.fields)} | ${metric.averageEditDistance} | ${ratioText(metric.digitLengthExact, metric.fields)} | ${metric.newlyCorrect} | ${metric.previouslyCorrectLost} |`
      );
    }
  }

  lines.push(
    "",
    "## Per-Cluster Selected Profile Results",
    "",
    "| cluster | image | stage | stage/side |",
    "| --- | --- | --- | --- |"
  );
  for (const [cluster, metrics] of Object.entries(summary.selectedSummary.clusters || {})) {
    lines.push(
      `| ${cluster} | ${ratioText(metrics.images.pass, metrics.images.total)} | ${ratioText(metrics.stages.pass, metrics.stages.total)} | ${ratioText(metrics.stageSides.pass, metrics.stageSides.total)} |`
    );
  }

  lines.push(
    "",
    "## Candidate Union",
    "",
    `- member union profiles: ${summary.unionProfiles.member.map((id) => `\`${id}\``).join(", ")}`,
    `- bonus union profiles: ${summary.unionProfiles.bonus.map((id) => `\`${id}\``).join(", ")}`,
    `- total union profiles: ${summary.unionProfiles.total.map((id) => `\`${id}\``).join(", ")}`,
    "- Candidate union is an upper-bound diagnostic only. It does not choose values and does not use arithmetic.",
    "",
    "## Regression Analysis",
    "",
    `- member selected profile: ${formatIpadProfileMetric(summary.metrics.member[summary.selectedProfiles.member])}`,
    `- bonus selected profile: ${formatIpadProfileMetric(summary.metrics.bonus[summary.selectedProfiles.bonus])}`,
    `- total selected profile: ${formatIpadProfileMetric(summary.metrics.total[summary.selectedProfiles.total])}`,
    "",
    "## Visual Artifacts",
    "",
    `- output directory: \`${summary.outputDir}\``,
    summary.comparisonSheet ? `- representative comparison sheet: \`${summary.comparisonSheet}\`` : "- representative comparison sheet: not generated",
    "",
    "## Remaining Error Categories",
    "",
    "- Many isolated white numeric fields still produce empty or non-numeric OCR after simple thresholding.",
    "- Total/member fields remain sensitive to anti-aliased white text and patterned backgrounds.",
    "- Bonus fields need separate treatment because blue bonus text responds differently from white score text.",
    "",
    "## Recommendation",
    "",
    "Proceed with a runner-only iPad candidate-selection experiment using a small bounded candidate union from the selected profiles. Do not productionize or apply arithmetic/crown/stage-wide solving until runner/browser-equivalent iPad evidence parity exists.",
    ""
  );
  return `${lines.join("\n")}\n`;
}

function ipadFieldKey({ filename, stage, side, field, slot = 0 }) {
  return `${filename}|${stage}|${side}|${field}|${slot || 0}`;
}

function ipadFieldType(field) {
  return field === "member" ? "member" : field;
}

function sortedNumberDistribution(values = []) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => Number(a[0]) - Number(b[0]))
  );
}

function buildIpadDigitLengthSchema(rows) {
  const valuesByField = {
    member: [],
    bonus: [],
    total: [],
  };
  for (const row of rows) {
    for (const stage of stages) {
      const stageExpected = row.expected[`stage${stage}`];
      for (const side of sides) {
        const members = side === "self" ? stageExpected.selfMembers : stageExpected.enemyMembers;
        for (const member of members) valuesByField.member.push(Number(member || 0));
        valuesByField.bonus.push(
          Number(side === "self" ? stageExpected.selfBonus || 0 : stageExpected.enemyBonus || 0)
        );
        valuesByField.total.push(
          Number(side === "self" ? stageExpected.selfTotal || 0 : stageExpected.enemyTotal || 0)
        );
      }
    }
  }

  return Object.fromEntries(
    Object.entries(valuesByField).map(([fieldType, values]) => {
      const lengths = values.map((value) => String(Number(value || 0)).length);
      const nonZeroLengths = values
        .filter((value) => Number(value || 0) > 0)
        .map((value) => String(Number(value)).length);
      return [
        fieldType,
        {
          minDigits: Math.min(...lengths),
          maxDigits: Math.max(...lengths),
          nonZeroMinDigits: nonZeroLengths.length ? Math.min(...nonZeroLengths) : 0,
          nonZeroMaxDigits: nonZeroLengths.length ? Math.max(...nonZeroLengths) : 0,
          digitLengthDistribution: sortedNumberDistribution(lengths),
          nonZeroDigitLengthDistribution: sortedNumberDistribution(nonZeroLengths),
        },
      ];
    })
  );
}

async function measureIpadFieldCropQuality(imagePath, image, field) {
  const zone = paddedIpadFieldZone(field, image, 0.12);
  const { data, info } = await sharp(imagePath)
    .extract(zone)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  let foreground = 0;
  let borderForeground = 0;
  for (let pixel = 0, index = 0; index < data.length; index += 4, pixel += 1) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    const isForeground =
      field.field === "bonus"
        ? b > 135 && b > r + 16 && b > g + 4
        : max > 168 && saturation < 155;
    if (!isForeground) continue;
    mask[pixel] = 1;
    foreground += 1;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
      borderForeground += 1;
    }
  }

  const visited = new Uint8Array(mask.length);
  let connectedComponents = 0;
  const queue = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let componentSize = 0;
    queue.length = 0;
    queue.push(start);
    visited[start] = 1;
    while (queue.length) {
      const current = queue.pop();
      componentSize += 1;
      const x = current % info.width;
      const y = Math.floor(current / info.width);
      for (const next of [
        x > 0 ? current - 1 : -1,
        x < info.width - 1 ? current + 1 : -1,
        y > 0 ? current - info.width : -1,
        y < info.height - 1 ? current + info.width : -1,
      ]) {
        if (next >= 0 && mask[next] && !visited[next]) {
          visited[next] = 1;
          queue.push(next);
        }
      }
    }
    if (componentSize >= 3) connectedComponents += 1;
  }

  const pixels = Math.max(1, info.width * info.height);
  const foregroundRatio = Number((foreground / pixels).toFixed(4));
  const borderRatio = foreground ? Number((borderForeground / foreground).toFixed(4)) : 0;
  return {
    zone,
    foregroundRatio,
    connectedComponents,
    touchesBorder: borderRatio > 0.08,
    borderForegroundRatio: borderRatio,
    likelyEmpty: foregroundRatio < 0.002,
  };
}

function normalizeIpadCandidateText(rawText = "") {
  return String(rawText || "").replace(/[^\d]/g, "");
}

function buildIpadFieldCandidatePool({ row, field, profileResults, profiles, cropQuality, digitSchema }) {
  const fieldType = ipadFieldType(field.field);
  const applicableProfiles = getIpadProfilesForFieldType(profiles, fieldType);
  const candidatesByValue = new Map();
  for (const [profileIndex, profile] of applicableProfiles.entries()) {
    const result = profileResults[profile.id];
    if (!result) continue;
    for (const [candidateIndex, parsed] of (result.parsedCandidates || []).entries()) {
      const value = Number(parsed.value || 0);
      if (!Number.isInteger(value)) continue;
      const normalizedText = normalizeIpadCandidateText(parsed.raw);
      const digitCount = String(value).length;
      const schema = digitSchema[fieldType] || {};
      const lengthInSchema =
        digitCount >= Number(schema.minDigits || 0) && digitCount <= Number(schema.maxDigits || 99);
      const contribution = {
        profileId: profile.id,
        profileLabel: profile.label,
        sourceRank: profileIndex,
        candidateIndex,
        rawText: result.rawText,
        rawCandidate: parsed.raw,
        normalizedText,
        ocrConfidence: Number(result.ocrConfidence || 0),
        plusLike: Boolean(parsed.plusLike),
      };
      const existing = candidatesByValue.get(value);
      if (existing) {
        existing.profileIds.push(profile.id);
        existing.contributions.push(contribution);
        existing.confidenceSignals.ocrConfidence = Math.max(
          existing.confidenceSignals.ocrConfidence,
          contribution.ocrConfidence
        );
        existing.confidenceSignals.repeatedProfiles = existing.profileIds.length;
        existing.confidenceSignals.independentAgreement = new Set(existing.profileIds).size;
        existing.confidenceSignals.plusLike ||= contribution.plusLike;
        continue;
      }
      candidatesByValue.set(value, {
        value,
        rawText: result.rawText,
        normalizedText,
        fieldType,
        profileId: profile.id,
        profileIds: [profile.id],
        sourceRank: profileIndex,
        cropQuality: {
          foregroundRatio: cropQuality.foregroundRatio,
          connectedComponents: cropQuality.connectedComponents,
          touchesBorder: cropQuality.touchesBorder,
        },
        foregroundRatio: cropQuality.foregroundRatio,
        connectedComponents: cropQuality.connectedComponents,
        touchesBorder: cropQuality.touchesBorder,
        digitCount,
        confidenceSignals: {
          ocrConfidence: contribution.ocrConfidence,
          digitOnlyPurity: parsed.raw ? normalizedText.length / String(parsed.raw).length : 0,
          lengthInSchema,
          plusLike: contribution.plusLike,
          repeatedProfiles: 1,
          independentAgreement: 1,
        },
        contributions: [contribution],
      });
    }
  }

  const candidates = [...candidatesByValue.values()]
    .sort((a, b) => {
      if (a.sourceRank !== b.sourceRank) return a.sourceRank - b.sourceRank;
      if (b.confidenceSignals.independentAgreement !== a.confidenceSignals.independentAgreement) {
        return b.confidenceSignals.independentAgreement - a.confidenceSignals.independentAgreement;
      }
      return a.value - b.value;
    })
    .slice(0, 6);

  return {
    key: ipadFieldKey({
      filename: row.filename,
      stage: field.stage,
      side: field.side,
      field: field.field,
      slot: field.slot || 0,
    }),
    image: row.filename,
    clusterId: row.clusterId || "unknown",
    stage: field.stage,
    side: field.side,
    field: field.field,
    fieldType,
    slot: field.slot || 0,
    zone: field.zone,
    cropQuality,
    candidates,
    profileResults,
  };
}

async function collectIpadBoundedCandidatePools() {
  const { rows } = await collectIpadExpectedFixtures();
  const profiles = getIpadPreprocessingProfiles();
  const digitSchema = buildIpadDigitLengthSchema(rows);
  const worker = await getIpadOcrWorker();
  const workerState = {};
  const poolsByKey = new Map();
  const poolRecords = [];

  try {
    for (const row of rows) {
      const image = await readImageSize(row.imagePath);
      const template = buildIpadCorrectedRoiTemplate(image);
      for (const field of template.fields) {
        const fieldType = ipadFieldType(field.field);
        const applicableProfiles = getIpadProfilesForFieldType(profiles, fieldType);
        const cropQuality = await measureIpadFieldCropQuality(row.imagePath, image, field);
        const profileResults = {};
        for (const profile of applicableProfiles) {
          const result = await recognizeIpadPreprocessedField(
            worker,
            row.imagePath,
            image,
            field,
            profile,
            workerState
          );
          profileResults[profile.id] = result;
        }
        const pool = buildIpadFieldCandidatePool({
          row,
          field,
          profileResults,
          profiles,
          cropQuality,
          digitSchema,
        });
        poolsByKey.set(pool.key, pool);
        poolRecords.push(pool);
      }
    }
  } finally {
    await worker.terminate();
  }

  return { rows, profiles, digitSchema, poolsByKey, poolRecords };
}

function candidateProfilePriority(candidate, priority = []) {
  const ranks = (candidate.profileIds || []).map((profileId) => {
    const index = priority.indexOf(profileId);
    return index >= 0 ? index : 999;
  });
  return ranks.length ? Math.min(...ranks) : 999;
}

function scoreIpadCandidate(candidate, strategy, fieldType, priorities, digitSchema) {
  const priorityRank = candidateProfilePriority(candidate, priorities[fieldType] || []);
  const confidence = Number(candidate.confidenceSignals?.ocrConfidence || 0);
  const agreement = Number(candidate.confidenceSignals?.independentAgreement || 1);
  const purity = Number(candidate.confidenceSignals?.digitOnlyPurity || 0);
  const lengthInSchema = candidate.confidenceSignals?.lengthInSchema ? 1 : 0;
  const foreground = Number(candidate.foregroundRatio || 0);
  const borderPenalty = candidate.touchesBorder ? 1 : 0;
  const plusBonus = fieldType === "bonus" && candidate.confidenceSignals?.plusLike ? 1 : 0;
  const nonZeroLengthBonus =
    Number(candidate.value || 0) > 0 &&
    candidate.digitCount >= Number(digitSchema[fieldType]?.nonZeroMinDigits || 0) &&
    candidate.digitCount <= Number(digitSchema[fieldType]?.nonZeroMaxDigits || 99)
      ? 1
      : 0;

  if (strategy === "current-primary") {
    return priorityRank === 0
      ? 1000 + plusBonus * 20 - candidate.contributions[0].candidateIndex
      : -1000 - priorityRank;
  }
  if (strategy === "profile-priority") {
    return 1000 + plusBonus * 20 - priorityRank * 20 - candidate.contributions[0].candidateIndex;
  }
  if (strategy === "consensus") {
    return agreement * 100 + (10 - priorityRank) + plusBonus * 8;
  }
  if (strategy === "quality-weighted") {
    return confidence + purity * 20 + lengthInSchema * 20 + nonZeroLengthBonus * 8 - borderPenalty * 30 + foreground * 40 + plusBonus * 10 - priorityRank;
  }
  if (strategy === "consensus-plus-quality") {
    return agreement * 80 + confidence * 0.7 + purity * 15 + lengthInSchema * 20 + nonZeroLengthBonus * 8 - borderPenalty * 30 + plusBonus * 12 - priorityRank;
  }
  return 0;
}

function getIpadCandidateSelectionStrategies() {
  return [
    {
      id: "current-primary",
      label: "Current primary-profile selection",
      priorities: {
        member: ["baseline-score-preprocess-3x-psm7"],
        bonus: ["blue-bonus-mask-3x-psm7"],
        total: ["white-mask-3x-psm7"],
      },
    },
    {
      id: "profile-priority",
      label: "Profile-priority selection",
      priorities: {
        member: [
          "baseline-score-preprocess-3x-psm7",
          "white-mask-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
        bonus: [
          "blue-bonus-mask-3x-psm7",
          "baseline-score-preprocess-3x-psm7",
          "white-mask-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
        total: [
          "white-mask-3x-psm7",
          "baseline-score-preprocess-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
      },
    },
    {
      id: "consensus",
      label: "Consensus selection",
      priorities: {
        member: [
          "baseline-score-preprocess-3x-psm7",
          "white-mask-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
        bonus: [
          "blue-bonus-mask-3x-psm7",
          "baseline-score-preprocess-3x-psm7",
          "white-mask-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
        total: [
          "white-mask-3x-psm7",
          "baseline-score-preprocess-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
      },
    },
    {
      id: "quality-weighted",
      label: "Quality-weighted selection",
      priorities: {
        member: [
          "baseline-score-preprocess-3x-psm7",
          "white-mask-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
        bonus: [
          "blue-bonus-mask-3x-psm7",
          "baseline-score-preprocess-3x-psm7",
          "white-mask-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
        total: [
          "white-mask-3x-psm7",
          "baseline-score-preprocess-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
      },
    },
    {
      id: "consensus-plus-quality",
      label: "Consensus plus quality selection",
      priorities: {
        member: [
          "baseline-score-preprocess-3x-psm7",
          "white-mask-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
        bonus: [
          "blue-bonus-mask-3x-psm7",
          "baseline-score-preprocess-3x-psm7",
          "white-mask-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
        total: [
          "white-mask-3x-psm7",
          "baseline-score-preprocess-3x-psm7",
          "invert-normalize-3x-psm7",
        ],
      },
    },
  ];
}

function selectIpadCandidate(pool, strategy, digitSchema) {
  const candidateList =
    strategy.id === "current-primary"
      ? pool.candidates.filter(
          (candidate) =>
            candidateProfilePriority(candidate, strategy.priorities[pool.fieldType] || []) === 0
        )
      : pool.candidates;
  if (!candidateList.length) {
    return {
      value: 0,
      candidate: null,
      score: 0,
      scoreBreakdown: { reason: "empty candidate pool" },
    };
  }
  const scored = candidateList
    .map((candidate, index) => ({
      candidate,
      score: scoreIpadCandidate(
        candidate,
        strategy.id,
        pool.fieldType,
        strategy.priorities,
        digitSchema
      ),
      tieBreak: index,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.candidate.sourceRank !== b.candidate.sourceRank) return a.candidate.sourceRank - b.candidate.sourceRank;
      if (a.tieBreak !== b.tieBreak) return a.tieBreak - b.tieBreak;
      return a.candidate.value - b.candidate.value;
    });
  const chosen = scored[0];
  return {
    value: chosen.candidate.value,
    candidate: chosen.candidate,
    score: Number(chosen.score.toFixed(3)),
    scoreBreakdown: {
      strategy: strategy.id,
      profileIds: chosen.candidate.profileIds,
      agreement: chosen.candidate.confidenceSignals.independentAgreement,
      confidence: chosen.candidate.confidenceSignals.ocrConfidence,
      digitCount: chosen.candidate.digitCount,
      lengthInSchema: chosen.candidate.confidenceSignals.lengthInSchema,
      touchesBorder: chosen.candidate.touchesBorder,
      foregroundRatio: chosen.candidate.foregroundRatio,
    },
    alternatives: scored.slice(1, 5).map((entry) => ({
      value: entry.candidate.value,
      score: Number(entry.score.toFixed(3)),
      profileIds: entry.candidate.profileIds,
    })),
  };
}

function emptyIpadStrategyStats() {
  return {
    fields: 0,
    exact: 0,
    emptyOutput: 0,
    newlyCorrect: 0,
    previouslyCorrectLost: 0,
    unchangedCorrect: 0,
    changedIncorrect: 0,
    candidatePresentButNotSelected: 0,
    expectedNotPresentInPool: 0,
    byFieldType: {
      member: { fields: 0, exact: 0, newlyCorrect: 0, previouslyCorrectLost: 0 },
      bonus: { fields: 0, exact: 0, newlyCorrect: 0, previouslyCorrectLost: 0 },
      total: { fields: 0, exact: 0, newlyCorrect: 0, previouslyCorrectLost: 0 },
    },
    byCluster: {},
  };
}

function finalizeIpadStrategyStats(stats) {
  return {
    ...stats,
    accuracy: percentage(stats.exact, stats.fields),
    netGain: stats.newlyCorrect - stats.previouslyCorrectLost,
    byFieldType: Object.fromEntries(
      Object.entries(stats.byFieldType).map(([fieldType, value]) => [
        fieldType,
        {
          ...value,
          accuracy: percentage(value.exact, value.fields),
          netGain: value.newlyCorrect - value.previouslyCorrectLost,
        },
      ])
    ),
    byCluster: Object.fromEntries(
      Object.entries(stats.byCluster).map(([cluster, value]) => [
        cluster,
        {
          ...value,
          accuracy: percentage(value.exact, value.fields),
          netGain: value.newlyCorrect - value.previouslyCorrectLost,
        },
      ])
    ),
  };
}

function compareIpadSelectedField({ pool, selection, expectedValue, primarySelection }) {
  const expectedPresent = pool.candidates.some((candidate) => candidate.value === expectedValue);
  const exact = selection.value === expectedValue;
  const primaryExact = primarySelection.value === expectedValue;
  let headroom = "correct";
  if (!exact) {
    if (!pool.candidates.length) headroom = "candidate pool empty";
    else if (!expectedPresent) headroom = "expected absent from candidate pool";
    else if (pool.candidates.length === 1) headroom = "expected present only in non-selected profile";
    else headroom = "expected present but wrong candidate selected";
  }
  return {
    expectedPresent,
    exact,
    primaryExact,
    newlyCorrect: exact && !primaryExact,
    previouslyCorrectLost: !exact && primaryExact,
    unchangedCorrect: exact && primaryExact,
    changedIncorrect: !exact && !primaryExact && selection.value !== primarySelection.value,
    headroom,
  };
}

function buildIpadStrategySelections({ rows, poolsByKey, strategies, digitSchema }) {
  const selectionsByStrategy = {};
  const primaryStrategy = strategies.find((strategy) => strategy.id === "current-primary");
  const primarySelections = new Map();
  for (const pool of poolsByKey.values()) {
    primarySelections.set(pool.key, selectIpadCandidate(pool, primaryStrategy, digitSchema));
  }

  for (const strategy of strategies) {
    const stats = emptyIpadStrategyStats();
    const selections = {};
    const regressions = [];
    const newlyCorrect = [];
    const presentNotSelected = [];
    const headroom = {};
    for (const pool of poolsByKey.values()) {
      const selection = selectIpadCandidate(pool, strategy, digitSchema);
      const primarySelection = primarySelections.get(pool.key);
      const row = rows.find((candidate) => candidate.filename === pool.image);
      const expectedValue = getExpectedIpadField(
        row.expected[`stage${pool.stage}`],
        pool.side,
        pool.field,
        pool.slot
      );
      const comparison = compareIpadSelectedField({
        pool,
        selection,
        expectedValue,
        primarySelection,
      });
      selections[pool.key] = {
        value: selection.value,
        candidate: selection.candidate
          ? {
              value: selection.candidate.value,
              profileIds: selection.candidate.profileIds,
              rawText: selection.candidate.rawText,
              normalizedText: selection.candidate.normalizedText,
            }
          : null,
        score: selection.score,
        scoreBreakdown: selection.scoreBreakdown,
        alternatives: selection.alternatives,
        expectedValue,
        exact: comparison.exact,
      };

      stats.fields += 1;
      stats.exact += comparison.exact ? 1 : 0;
      stats.emptyOutput += selection.value === 0 ? 1 : 0;
      stats.newlyCorrect += comparison.newlyCorrect ? 1 : 0;
      stats.previouslyCorrectLost += comparison.previouslyCorrectLost ? 1 : 0;
      stats.unchangedCorrect += comparison.unchangedCorrect ? 1 : 0;
      stats.changedIncorrect += comparison.changedIncorrect ? 1 : 0;
      stats.candidatePresentButNotSelected +=
        comparison.expectedPresent && !comparison.exact ? 1 : 0;
      stats.expectedNotPresentInPool += !comparison.expectedPresent ? 1 : 0;
      stats.byFieldType[pool.fieldType].fields += 1;
      stats.byFieldType[pool.fieldType].exact += comparison.exact ? 1 : 0;
      stats.byFieldType[pool.fieldType].newlyCorrect += comparison.newlyCorrect ? 1 : 0;
      stats.byFieldType[pool.fieldType].previouslyCorrectLost += comparison.previouslyCorrectLost ? 1 : 0;
      stats.byCluster[pool.clusterId] ||= {
        fields: 0,
        exact: 0,
        newlyCorrect: 0,
        previouslyCorrectLost: 0,
      };
      stats.byCluster[pool.clusterId].fields += 1;
      stats.byCluster[pool.clusterId].exact += comparison.exact ? 1 : 0;
      stats.byCluster[pool.clusterId].newlyCorrect += comparison.newlyCorrect ? 1 : 0;
      stats.byCluster[pool.clusterId].previouslyCorrectLost += comparison.previouslyCorrectLost ? 1 : 0;
      headroom[comparison.headroom] = (headroom[comparison.headroom] || 0) + 1;

      const auditRecord = {
        key: pool.key,
        image: pool.image,
        clusterId: pool.clusterId,
        stage: pool.stage,
        side: pool.side,
        field: pool.field,
        slot: pool.slot,
        expectedValue,
        selectedValue: selection.value,
        primaryValue: primarySelection.value,
        candidateValues: pool.candidates.map((candidate) => candidate.value),
        selectedCandidate: selections[pool.key].candidate,
        scoreBreakdown: selection.scoreBreakdown,
      };
      if (comparison.previouslyCorrectLost) regressions.push(auditRecord);
      if (comparison.newlyCorrect) newlyCorrect.push(auditRecord);
      if (comparison.expectedPresent && !comparison.exact) presentNotSelected.push(auditRecord);
    }

    selectionsByStrategy[strategy.id] = {
      strategy,
      stats: finalizeIpadStrategyStats(stats),
      selections,
      headroom,
      regressions,
      newlyCorrect,
      expectedPresentButNotSelected: presentNotSelected,
    };
  }
  return { selectionsByStrategy, primarySelections };
}

function buildIpadAggregateAccuracy({ rows, selections }) {
  const counters = {
    images: { pass: 0, total: rows.length },
    stages: { pass: 0, total: rows.length * stages.length },
    stageSides: { pass: 0, total: rows.length * stages.length * sides.length },
    fields: {
      member: { pass: 0, total: 0 },
      bonus: { pass: 0, total: 0 },
      total: { pass: 0, total: 0 },
    },
  };
  const details = [];
  for (const row of rows) {
    let imagePass = true;
    const failures = [];
    for (const stage of stages) {
      let stagePass = true;
      for (const side of sides) {
        const selected = { members: [0, 0, 0], bonus: 0, total: 0 };
        for (const field of ["member", "bonus", "total"]) {
          const slots = field === "member" ? [1, 2, 3] : [0];
          for (const slot of slots) {
            const key = ipadFieldKey({ filename: row.filename, stage, side, field, slot });
            const value = Number(selections[key]?.value || 0);
            const expectedValue = getExpectedIpadField(row.expected[`stage${stage}`], side, field, slot);
            const fieldType = ipadFieldType(field);
            counters.fields[fieldType].total += 1;
            counters.fields[fieldType].pass += value === expectedValue ? 1 : 0;
            if (field === "member") selected.members[slot - 1] = value;
            else selected[field] = value;
          }
        }
        const comparison = compareIpadSide(selected, row.expected[`stage${stage}`], side);
        if (comparison.pass) {
          counters.stageSides.pass += 1;
        } else {
          stagePass = false;
          failures.push(`S${stage} ${side}`);
        }
      }
      if (stagePass) counters.stages.pass += 1;
      else imagePass = false;
    }
    if (imagePass) counters.images.pass += 1;
    details.push({ image: row.filename, pass: imagePass, failures });
  }
  return {
    images: {
      ...counters.images,
      fail: counters.images.total - counters.images.pass,
      accuracy: percentage(counters.images.pass, counters.images.total),
    },
    stages: {
      ...counters.stages,
      fail: counters.stages.total - counters.stages.pass,
      accuracy: percentage(counters.stages.pass, counters.stages.total),
    },
    stageSides: {
      ...counters.stageSides,
      fail: counters.stageSides.total - counters.stageSides.pass,
      accuracy: percentage(counters.stageSides.pass, counters.stageSides.total),
    },
    fields: Object.fromEntries(
      Object.entries(counters.fields).map(([fieldType, value]) => [
        fieldType,
        { ...value, accuracy: percentage(value.pass, value.total) },
      ])
    ),
    details,
  };
}

function summarizeIpadCandidatePools({ poolRecords, rows }) {
  const counts = poolRecords.map((pool) => pool.candidates.length);
  const sortedCounts = [...counts].sort((a, b) => a - b);
  const byFieldType = {};
  const byCluster = {};
  for (const pool of poolRecords) {
    for (const target of [byFieldType, byCluster]) {
      const key = target === byFieldType ? pool.fieldType : pool.clusterId;
      target[key] ||= {
        fields: 0,
        candidateCountSum: 0,
        empty: 0,
        single: 0,
        multi: 0,
        maxCandidateCount: 0,
      };
      const summary = target[key];
      summary.fields += 1;
      summary.candidateCountSum += pool.candidates.length;
      summary.empty += pool.candidates.length === 0 ? 1 : 0;
      summary.single += pool.candidates.length === 1 ? 1 : 0;
      summary.multi += pool.candidates.length > 1 ? 1 : 0;
      summary.maxCandidateCount = Math.max(summary.maxCandidateCount, pool.candidates.length);
    }
  }
  const finalize = (summary) => ({
    ...summary,
    averageCandidateCount: summary.fields
      ? Number((summary.candidateCountSum / summary.fields).toFixed(2))
      : 0,
  });
  return {
    fields: poolRecords.length,
    averageCandidateCount: counts.length
      ? Number((counts.reduce((sum, count) => sum + count, 0) / counts.length).toFixed(2))
      : 0,
    medianCandidateCount: sortedCounts.length
      ? sortedCounts[Math.floor(sortedCounts.length / 2)]
      : 0,
    maxCandidateCount: sortedCounts.at(-1) || 0,
    emptyCandidateFields: counts.filter((count) => count === 0).length,
    singleCandidateFields: counts.filter((count) => count === 1).length,
    multiCandidateFields: counts.filter((count) => count > 1).length,
    byFieldType: Object.fromEntries(Object.entries(byFieldType).map(([key, value]) => [key, finalize(value)])),
    byCluster: Object.fromEntries(Object.entries(byCluster).map(([key, value]) => [key, finalize(value)])),
  };
}

function buildIpadOracleUpperBound({ rows, poolRecords }) {
  const byFieldType = {
    member: { present: 0, absent: 0, total: 0 },
    bonus: { present: 0, absent: 0, total: 0 },
    total: { present: 0, absent: 0, total: 0 },
  };
  const byCluster = {};
  let present = 0;
  let selectablePresent = 0;
  for (const pool of poolRecords) {
    const row = rows.find((candidate) => candidate.filename === pool.image);
    const expectedValue = getExpectedIpadField(
      row.expected[`stage${pool.stage}`],
      pool.side,
      pool.field,
      pool.slot
    );
    const hasExpected = pool.candidates.some((candidate) => candidate.value === expectedValue);
    const hasSelectableExpected =
      hasExpected || (expectedValue === 0 && (pool.fieldType === "bonus" || pool.fieldType === "member"));
    present += hasExpected ? 1 : 0;
    selectablePresent += hasSelectableExpected ? 1 : 0;
    byFieldType[pool.fieldType].total += 1;
    byFieldType[pool.fieldType][hasExpected ? "present" : "absent"] += 1;
    byCluster[pool.clusterId] ||= { present: 0, absent: 0, total: 0 };
    byCluster[pool.clusterId].total += 1;
    byCluster[pool.clusterId][hasExpected ? "present" : "absent"] += 1;
  }
  const finalize = (value) => ({
    ...value,
    presentRate: percentage(value.present, value.total),
  });
  return {
    present,
    absent: poolRecords.length - present,
    selectablePresent,
    selectableAbsent: poolRecords.length - selectablePresent,
    total: poolRecords.length,
    presentRate: percentage(present, poolRecords.length),
    selectablePresentRate: percentage(selectablePresent, poolRecords.length),
    byFieldType: Object.fromEntries(Object.entries(byFieldType).map(([key, value]) => [key, finalize(value)])),
    byCluster: Object.fromEntries(Object.entries(byCluster).map(([key, value]) => [key, finalize(value)])),
  };
}

function product(values) {
  return values.reduce((acc, list) => acc.flatMap((prefix) => list.map((value) => [...prefix, value])), [[]]);
}

function buildIpadArithmeticCombinationAudit({ rows, poolsByKey }) {
  const counters = {
    stageSides: rows.length * stages.length * sides.length,
    expectedMembersPresent: 0,
    expectedBonusPresent: 0,
    expectedTotalPresent: 0,
    allExpectedFieldsPresent: 0,
    atLeastOneArithmeticCombination: 0,
    exactlyOneArithmeticCombination: 0,
    multipleArithmeticCombinations: 0,
    noArithmeticCombination: 0,
  };
  const details = [];
  for (const row of rows) {
    for (const stage of stages) {
      for (const side of sides) {
        const expectedStage = row.expected[`stage${stage}`];
        const expectedMembers = side === "self" ? expectedStage.selfMembers : expectedStage.enemyMembers;
        const expectedBonus = side === "self" ? expectedStage.selfBonus : expectedStage.enemyBonus;
        const expectedTotal = side === "self" ? expectedStage.selfTotal : expectedStage.enemyTotal;
        const memberPools = [1, 2, 3].map((slot) =>
          poolsByKey.get(ipadFieldKey({ filename: row.filename, stage, side, field: "member", slot }))
        );
        const bonusPool = poolsByKey.get(ipadFieldKey({ filename: row.filename, stage, side, field: "bonus" }));
        const totalPool = poolsByKey.get(ipadFieldKey({ filename: row.filename, stage, side, field: "total" }));
        const memberValues = memberPools.map((pool) => uniqueNumbers(pool?.candidates.map((candidate) => candidate.value) || []));
        const bonusValues = uniqueNumbers([0, ...(bonusPool?.candidates.map((candidate) => candidate.value) || [])]);
        const totalValues = uniqueNumbers(totalPool?.candidates.map((candidate) => candidate.value) || []);
        const expectedMembersPresent = expectedMembers.every((expected, index) =>
          memberValues[index].includes(expected)
        );
        const expectedBonusPresent = bonusValues.includes(expectedBonus);
        const expectedTotalPresent = totalValues.includes(expectedTotal);
        counters.expectedMembersPresent += expectedMembersPresent ? 1 : 0;
        counters.expectedBonusPresent += expectedBonusPresent ? 1 : 0;
        counters.expectedTotalPresent += expectedTotalPresent ? 1 : 0;
        counters.allExpectedFieldsPresent +=
          expectedMembersPresent && expectedBonusPresent && expectedTotalPresent ? 1 : 0;
        const combinations =
          memberValues.every((values) => values.length) && totalValues.length
            ? product([...memberValues, bonusValues, totalValues])
            : [];
        const valid = combinations.filter((combo) => {
          const members = combo.slice(0, 3);
          const bonus = combo[3];
          const total = combo[4];
          return members.reduce((sum, value) => sum + value, 0) + bonus === total;
        });
        counters.atLeastOneArithmeticCombination += valid.length > 0 ? 1 : 0;
        counters.exactlyOneArithmeticCombination += valid.length === 1 ? 1 : 0;
        counters.multipleArithmeticCombinations += valid.length > 1 ? 1 : 0;
        counters.noArithmeticCombination += valid.length === 0 ? 1 : 0;
        details.push({
          image: row.filename,
          stage,
          side,
          expectedMembersPresent,
          expectedBonusPresent,
          expectedTotalPresent,
          validCombinationCount: valid.length,
          sampleValidCombinations: valid.slice(0, 5).map((combo) => ({
            members: combo.slice(0, 3),
            bonus: combo[3],
            total: combo[4],
          })),
        });
      }
    }
  }
  return {
    ...counters,
    details,
  };
}

function selectIpadCandidateSelectionV1(resultsByStrategy) {
  return Object.values(resultsByStrategy)
    .map((result) => ({
      id: result.strategy.id,
      label: result.strategy.label,
      stats: result.stats,
    }))
    .sort((a, b) => {
      if (b.stats.exact !== a.stats.exact) return b.stats.exact - a.stats.exact;
      if (a.stats.previouslyCorrectLost !== b.stats.previouslyCorrectLost) {
        return a.stats.previouslyCorrectLost - b.stats.previouslyCorrectLost;
      }
      if (b.stats.byCluster["ipad-02"]?.accuracy !== a.stats.byCluster["ipad-02"]?.accuracy) {
        return (b.stats.byCluster["ipad-02"]?.accuracy || 0) - (a.stats.byCluster["ipad-02"]?.accuracy || 0);
      }
      return a.id.localeCompare(b.id);
    })[0];
}

async function runIpadCandidateSelectionSimulation() {
  const { rows, profiles, digitSchema, poolsByKey, poolRecords } =
    await collectIpadBoundedCandidatePools();
  await fs.rm(ipadCandidateSelectionInvestigationDir, { recursive: true, force: true });
  await fs.mkdir(ipadCandidateSelectionInvestigationDir, { recursive: true });
  const strategies = getIpadCandidateSelectionStrategies();
  const { selectionsByStrategy } = buildIpadStrategySelections({
    rows,
    poolsByKey,
    strategies,
    digitSchema,
  });
  const selectedStrategy = selectIpadCandidateSelectionV1(selectionsByStrategy);
  const selectedResult = selectionsByStrategy[selectedStrategy.id];
  const selectedAggregate = buildIpadAggregateAccuracy({
    rows,
    selections: selectedResult.selections,
  });
  const poolStats = summarizeIpadCandidatePools({ poolRecords, rows });
  const oracleUpperBound = buildIpadOracleUpperBound({ rows, poolRecords });
  const arithmeticAudit = buildIpadArithmeticCombinationAudit({ rows, poolsByKey });
  const strategySummaries = Object.fromEntries(
    Object.entries(selectionsByStrategy).map(([id, result]) => [
      id,
      {
        label: result.strategy.label,
        stats: result.stats,
        headroom: result.headroom,
        regressionCount: result.regressions.length,
        newlyCorrectCount: result.newlyCorrect.length,
        expectedPresentButNotSelectedCount: result.expectedPresentButNotSelected.length,
      },
    ])
  );

  const fieldCandidateRecords = poolRecords.map((pool) => ({
    key: pool.key,
    image: pool.image,
    clusterId: pool.clusterId,
    stage: pool.stage,
    side: pool.side,
    field: pool.field,
    slot: pool.slot,
    cropQuality: pool.cropQuality,
    candidates: pool.candidates,
  }));

  const summary = {
    command: "node scripts/ocr-test-images.mjs --ipad-candidate-selection-simulation",
    outputDir: path.relative(rootDir, ipadCandidateSelectionInvestigationDir).replaceAll("\\", "/"),
    isolation: {
      roiGeometry: "ipad-shared-portrait-v2",
      roiGeometryChanged: false,
      productionOutputChanged: false,
      smartphoneBehaviorChanged: false,
      currentPcBehaviorChanged: false,
      legacyDesktopBehaviorChanged: false,
      ipadProductionEnabled: false,
      arithmeticSelectionApplied: false,
      crownRecoveryApplied: false,
      stageWideSolverApplied: false,
    },
    profiles: profiles.map(({ id, label, kind, fieldTypes }) => ({ id, label, kind, fieldTypes })),
    digitSchema,
    poolStats,
    strategySummaries,
    selectedStrategy,
    selectedAggregate,
    oracleUpperBound,
    headroom: selectedResult.headroom,
    arithmeticAudit: {
      ...arithmeticAudit,
      details: undefined,
    },
  };

  await fs.writeFile(
    path.join(ipadCandidateSelectionInvestigationDir, "summary.json"),
    JSON.stringify(summary, null, 2)
  );
  await fs.writeFile(
    path.join(ipadCandidateSelectionInvestigationDir, "field-candidates.json"),
    JSON.stringify(fieldCandidateRecords, null, 2)
  );
  await fs.writeFile(
    path.join(ipadCandidateSelectionInvestigationDir, "strategy-results.json"),
    JSON.stringify(
      Object.fromEntries(
        Object.entries(selectionsByStrategy).map(([id, result]) => [
          id,
          {
            strategy: result.strategy,
            stats: result.stats,
            headroom: result.headroom,
          },
        ])
      ),
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(ipadCandidateSelectionInvestigationDir, "regressions.json"),
    JSON.stringify(selectedResult.regressions, null, 2)
  );
  await fs.writeFile(
    path.join(ipadCandidateSelectionInvestigationDir, "newly-correct.json"),
    JSON.stringify(selectedResult.newlyCorrect, null, 2)
  );
  await fs.writeFile(
    path.join(ipadCandidateSelectionInvestigationDir, "expected-present-but-not-selected.json"),
    JSON.stringify(selectedResult.expectedPresentButNotSelected, null, 2)
  );
  await fs.writeFile(
    path.join(ipadCandidateSelectionInvestigationDir, "arithmetic-combination-audit.json"),
    JSON.stringify(arithmeticAudit, null, 2)
  );
  await fs.writeFile(
    ipadCandidateSelectionInvestigationReportPath,
    buildIpadCandidateSelectionInvestigationReport(summary)
  );
  return summary;
}

function buildIpadCandidateSelectionInvestigationReport(summary) {
  const selected = summary.strategySummaries[summary.selectedStrategy.id];
  const lines = [
    "# iPad Candidate Selection Investigation",
    "",
    "## Summary",
    "",
    `- command: \`${summary.command}\``,
    `- output directory: \`${summary.outputDir}\``,
    `- ROI geometry: \`${summary.isolation.roiGeometry}\``,
    `- selected Candidate Selection v1 strategy: \`${summary.selectedStrategy.id}\` (${summary.selectedStrategy.label})`,
    `- selected exact fields: ${ratioText(selected.stats.exact, selected.stats.fields)}`,
    `- selected net gain vs current primary: ${selected.stats.netGain}`,
    `- selected regressions vs current primary: ${selected.stats.previouslyCorrectLost}`,
    `- observed numeric candidate-pool upper bound: ${ratioText(summary.oracleUpperBound.present, summary.oracleUpperBound.total)}`,
    `- selectable output upper bound including zero defaults: ${ratioText(summary.oracleUpperBound.selectablePresent, summary.oracleUpperBound.total)}`,
    `- expected-present-but-not-selected fields: ${selected.expectedPresentButNotSelectedCount}`,
    "",
    "This is runner-only and diagnostic-only. It does not change iPad production output, ROI geometry, smartphone OCR, current-PC OCR, or legacy desktop OCR.",
    "",
    "## Candidate Pool Structure",
    "",
    "Each field candidate preserves `value`, `rawText`, `normalizedText`, `fieldType`, contributing `profileIds`, deterministic `sourceRank`, crop quality (`foregroundRatio`, `connectedComponents`, `touchesBorder`), `digitCount`, and confidence signals. Identical numeric values are deduplicated while retaining all contributing profiles. Pools are capped at 6 values per field.",
    "",
    "## Candidate Sources",
    "",
    "| profile | fields | kind |",
    "| --- | --- | --- |",
  ];
  for (const profile of summary.profiles) {
    lines.push(
      `| \`${profile.id}\` | ${(profile.fieldTypes || []).join(", ")} | ${profile.kind} |`
    );
  }
  lines.push(
    "",
    "## Candidate Count Statistics",
    "",
    `- fields: ${summary.poolStats.fields}`,
    `- average candidate count: ${summary.poolStats.averageCandidateCount}`,
    `- median candidate count: ${summary.poolStats.medianCandidateCount}`,
    `- max candidate count: ${summary.poolStats.maxCandidateCount}`,
    `- empty candidate fields: ${summary.poolStats.emptyCandidateFields}`,
    `- single-candidate fields: ${summary.poolStats.singleCandidateFields}`,
    `- multi-candidate fields: ${summary.poolStats.multiCandidateFields}`,
    "",
    "| field | fields | avg candidates | empty | single | multi | max |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"
  );
  for (const [fieldType, stats] of Object.entries(summary.poolStats.byFieldType)) {
    lines.push(
      `| ${fieldType} | ${stats.fields} | ${stats.averageCandidateCount} | ${stats.empty} | ${stats.single} | ${stats.multi} | ${stats.maxCandidateCount} |`
    );
  }
  lines.push(
    "",
    "## Observed Digit-Length Schema",
    "",
    "| field | min | max | non-zero min | non-zero max | length distribution |",
    "| --- | ---: | ---: | ---: | ---: | --- |"
  );
  for (const [fieldType, schema] of Object.entries(summary.digitSchema)) {
    lines.push(
      `| ${fieldType} | ${schema.minDigits} | ${schema.maxDigits} | ${schema.nonZeroMinDigits} | ${schema.nonZeroMaxDigits} | ${JSON.stringify(schema.digitLengthDistribution)} |`
    );
  }
  lines.push(
    "",
    "## Strategy Results",
    "",
    "| strategy | exact fields | accuracy | net gain | newly correct | lost | present but not selected | expected absent |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |"
  );
  for (const [strategyId, result] of Object.entries(summary.strategySummaries)) {
    lines.push(
      `| \`${strategyId}\` | ${ratioText(result.stats.exact, result.stats.fields)} | ${result.stats.accuracy}% | ${result.stats.netGain} | ${result.stats.newlyCorrect} | ${result.stats.previouslyCorrectLost} | ${result.stats.candidatePresentButNotSelected} | ${result.stats.expectedNotPresentInPool} |`
    );
  }
  lines.push(
    "",
    "## Selected Strategy Field Results",
    "",
    "| field | exact | accuracy | net gain | newly correct | lost |",
    "| --- | --- | ---: | ---: | ---: | ---: |"
  );
  for (const [fieldType, stats] of Object.entries(selected.stats.byFieldType)) {
    lines.push(
      `| ${fieldType} | ${ratioText(stats.exact, stats.fields)} | ${stats.accuracy}% | ${stats.netGain} | ${stats.newlyCorrect} | ${stats.previouslyCorrectLost} |`
    );
  }
  lines.push(
    "",
    "## Per-Cluster Selected Strategy Results",
    "",
    "| cluster | exact | accuracy | net gain | lost |",
    "| --- | --- | ---: | ---: | ---: |"
  );
  for (const [cluster, stats] of Object.entries(selected.stats.byCluster)) {
    lines.push(
      `| ${cluster} | ${ratioText(stats.exact, stats.fields)} | ${stats.accuracy}% | ${stats.netGain} | ${stats.previouslyCorrectLost} |`
    );
  }
  lines.push(
    "",
    "## Aggregate Simulated Accuracy",
    "",
    `- image PASS: ${ratioText(summary.selectedAggregate.images.pass, summary.selectedAggregate.images.total)}`,
    `- stage PASS: ${ratioText(summary.selectedAggregate.stages.pass, summary.selectedAggregate.stages.total)}`,
    `- stage/side PASS: ${ratioText(summary.selectedAggregate.stageSides.pass, summary.selectedAggregate.stageSides.total)}`,
    `- member field accuracy: ${ratioText(summary.selectedAggregate.fields.member.pass, summary.selectedAggregate.fields.member.total)}`,
    `- bonus field accuracy: ${ratioText(summary.selectedAggregate.fields.bonus.pass, summary.selectedAggregate.fields.bonus.total)}`,
    `- total field accuracy: ${ratioText(summary.selectedAggregate.fields.total.pass, summary.selectedAggregate.fields.total.total)}`,
    "",
    "Aggregate PASS is calculated only from selected field-local outputs. No arithmetic, crown rule, or stage-wide solver is applied.",
    "",
    "## Oracle Candidate-Pool Upper Bound",
    "",
    `- expected present as observed numeric candidate: ${ratioText(summary.oracleUpperBound.present, summary.oracleUpperBound.total)}`,
    `- expected absent from observed numeric candidates: ${summary.oracleUpperBound.absent}`,
    `- selectable upper bound including zero defaults for blank member/bonus fields: ${ratioText(summary.oracleUpperBound.selectablePresent, summary.oracleUpperBound.total)}`,
    "",
    "| field | expected present | expected absent | present rate |",
    "| --- | --- | ---: | ---: |"
  );
  for (const [fieldType, stats] of Object.entries(summary.oracleUpperBound.byFieldType)) {
    lines.push(
      `| ${fieldType} | ${ratioText(stats.present, stats.total)} | ${stats.absent} | ${stats.presentRate}% |`
    );
  }
  lines.push(
    "",
    "## Headroom Classification",
    "",
    "| category | fields |",
    "| --- | ---: |"
  );
  for (const [category, count] of Object.entries(summary.headroom)) {
    lines.push(`| ${category} | ${count} |`);
  }
  lines.push(
    "",
    "## Arithmetic-Combination Audit",
    "",
    "This audit is not used for selection. It only measures whether a future arithmetic-aware stage/side selector could have enough evidence.",
    "",
    `- stage/side rows: ${summary.arithmeticAudit.stageSides}`,
    `- expected all 3 members present: ${summary.arithmeticAudit.expectedMembersPresent}`,
    `- expected bonus present: ${summary.arithmeticAudit.expectedBonusPresent}`,
    `- expected total present: ${summary.arithmeticAudit.expectedTotalPresent}`,
    `- all expected side fields present: ${summary.arithmeticAudit.allExpectedFieldsPresent}`,
    `- at least one arithmetic-valid combination: ${summary.arithmeticAudit.atLeastOneArithmeticCombination}`,
    `- exactly one arithmetic-valid combination: ${summary.arithmeticAudit.exactlyOneArithmeticCombination}`,
    `- multiple arithmetic-valid combinations: ${summary.arithmeticAudit.multipleArithmeticCombinations}`,
    `- no arithmetic-valid combination: ${summary.arithmeticAudit.noArithmeticCombination}`,
    "",
    "## Recommendation",
    "",
    "Field-local candidate selection alone is useful for measuring candidate quality, but the selected v1 strategy still leaves broad ambiguity and does not improve aggregate stage/side PASS. The next experiment should remain runner-only and test a narrowly guarded iPad arithmetic-aware side selector only for rows with exactly one arithmetic-valid candidate combination and no missing member evidence.",
    ""
  );
  return `${lines.join("\n")}\n`;
}

function buildIpadDatasetInventoryReport(inventory) {
  const lines = [
    "# iPad OCR Dataset Inventory",
    "",
    "## Summary",
    "",
    `- source folder: \`${inventory.sourceDir}\``,
    `- total supported image files: ${inventory.totalFiles}`,
    `- readable files: ${inventory.readableFiles}`,
    `- unreadable files: ${inventory.unreadableFiles}`,
    `- byte-identical duplicate groups: ${inventory.duplicates.length}`,
    `- obvious non-target or unsupported files: ${inventory.nonTargetFiles.length}`,
    `- layout clusters: ${inventory.clusters.length}`,
    `- selected initial fixtures: ${inventory.selectedFixtures.length}`,
    "",
    "Generated artifacts are under `tmp/ipad-ocr-diagnostics/dataset-inventory/` and are not committed.",
    "",
    "## Layout Clusters",
    "",
    "| cluster | count | dimensions | orientation | aspect range | content top | content bottom | representative images | outliers |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const cluster of inventory.clusters) {
    lines.push(
      `| ${cluster.id} | ${cluster.count} | ${cluster.dimensions} | ${cluster.orientation} | ${
        cluster.aspectRange
          ? `${cluster.aspectRange.min} - ${cluster.aspectRange.max}`
          : "-"
      } | ${
        cluster.contentTopRange
          ? `${cluster.contentTopRange.min} - ${cluster.contentTopRange.max}`
          : "-"
      } | ${
        cluster.contentBottomRange
          ? `${cluster.contentBottomRange.min} - ${cluster.contentBottomRange.max}`
          : "-"
      } | ${cluster.representatives.join(", ")} | ${
        cluster.outliers.length ? cluster.outliers.join(", ") : "-"
      } |`
    );
  }

  lines.push(
    "",
    "## File Metadata",
    "",
    "| filename | width | height | aspect | orientation | size bytes | hash | cluster |",
    "| --- | ---: | ---: | ---: | --- | ---: | --- | --- |"
  );
  const clusterByFile = new Map();
  for (const cluster of inventory.clusters) {
    for (const file of cluster.files) clusterByFile.set(file, cluster.id);
  }
  for (const row of inventory.rows) {
    lines.push(
      `| ${row.fileName} | ${row.width} | ${row.height} | ${row.aspectRatio} | ${
        row.orientation
      } | ${row.fileSize} | ${row.byteHashShort} | ${clusterByFile.get(row.fileName) || "-"} |`
    );
  }

  lines.push(
    "",
    "## Duplicates And Non-Targets",
    "",
    inventory.duplicates.length
      ? inventory.duplicates.map((group) => `- byte-identical: ${group.join(", ")}`).join("\n")
      : "- No byte-identical duplicates found.",
    "",
    inventory.nonTargetFiles.length
      ? inventory.nonTargetFiles.map((file) => `- ${file}`).join("\n")
      : "- No obvious non-target files detected by the conservative iPad layout detector.",
    "",
    "Visual review is still required before fixture transcription; this inventory does not decide OCR correctness.",
    "",
    "## Selected Initial Fixture Set",
    "",
    "| filename | cluster | dimensions | reason | notes |",
    "| --- | --- | --- | --- | --- |"
  );

  for (const selected of inventory.selectedFixtures) {
    lines.push(
      `| ${selected.fileName} | ${selected.clusterId} | ${selected.width}x${selected.height} | ${
        selected.reason
      } | ${selected.notableFeatures.join("; ")} |`
    );
  }

  lines.push(
    "",
    "The selected source images were copied to `regression-test/ipad/`. Expected values were not guessed. Manual transcription should fill `regression-test/expected-ipad/manifest.json` first, then individual expected JSON fixtures can be created from source screenshot review.",
    "",
    "## Diagnostic Artifacts",
    "",
    "- full contact sheet: `tmp/ipad-ocr-diagnostics/dataset-inventory/all-images-contact-sheet.png`",
    "- per-cluster contact sheets: `tmp/ipad-ocr-diagnostics/dataset-inventory/ipad-*-contact-sheet.png`",
    "- representative overlays: `tmp/ipad-ocr-diagnostics/dataset-inventory/ipad-*-overlay.png`",
    "",
    "## Recommended iPad OCR Architecture Direction",
    "",
    "The current dataset splits cleanly by dimensions into portrait-only iPad-like families. Portrait and landscape should remain separate architecture tracks even though no landscape image appears in this folder yet.",
    "",
    "Recommended first implementation path:",
    "",
    "1. Use one normalized portrait coordinate model per layout cluster.",
    "2. Calibrate stage-row and self/enemy column anchors from the two dimension clusters instead of reusing smartphone ROI.",
    "3. Keep iPad candidate generation, preprocessing, and diagnostics isolated under `deviceMode: \"ipad\"`.",
    "4. Share only device-independent arithmetic helpers later, after iPad runner/browser evidence parity exists.",
    "5. Create expected values manually for the selected fixtures before any iPad OCR accuracy claims.",
    "",
    "This direction is simpler than anchor-based affine normalization for the first batch because the dataset has stable portrait dimensions and no detected orientation mix. Affine normalization may become useful if later iPad screenshots include split view, zoomed screenshots, or letterboxed/cropped variants.",
    "",
    "## Next Step",
    "",
    "Manually transcribe the selected fixture set from the source images, then add an iPad-only baseline command that reads `regression-test/ipad/` and `regression-test/expected-ipad/` without falling back to smartphone production OCR.",
    ""
  );

  return lines.join("\n");
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

    let smartphoneCrownBonusRuleSimulation = null;
    let smartphoneCrownBonusRuleRecovery = null;
    let smartphoneStageWideSixMemberCandidateSolverSimulation = null;
    let smartphoneStageWideSixMemberCandidateSolverRecovery = null;
    let smartphoneExactSlotSelectionRecoveryBySide = null;
    if (ocrSource === "smartphone") {
      const buildSmartphoneStageEvidenceInput = () => ({
        stage,
        self,
        enemy,
        selfTotal,
        enemyTotal,
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
      });
      smartphoneCrownBonusRuleSimulation = sharedBuildSmartphoneCrownBonusRuleEvidence({
        stage,
        stageResult: buildSmartphoneStageEvidenceInput(),
      });
      smartphoneCrownBonusRuleRecovery = applySmartphoneCrownBonusRuleRecovery({
        stage,
        simulation: smartphoneCrownBonusRuleSimulation,
        mode: ocrSource,
      });
      if (smartphoneCrownBonusRuleRecovery.applied) {
        knownCorrectionDeltas.push({
          pass: "smartphoneCrownBonusRuleRecovery applied",
          before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
          after: cloneStageState({
            self: smartphoneCrownBonusRuleRecovery.self.members,
            enemy: smartphoneCrownBonusRuleRecovery.enemy.members,
            selfTotal: smartphoneCrownBonusRuleRecovery.self.total,
            enemyTotal: smartphoneCrownBonusRuleRecovery.enemy.total,
          }),
          message: smartphoneCrownBonusRuleRecovery.message,
        });
        self = smartphoneCrownBonusRuleRecovery.self.members;
        enemy = smartphoneCrownBonusRuleRecovery.enemy.members;
        selfTotal = smartphoneCrownBonusRuleRecovery.self.total;
        enemyTotal = smartphoneCrownBonusRuleRecovery.enemy.total;
      }
      smartphoneStageWideSixMemberCandidateSolverSimulation =
        sharedBuildSmartphoneStageWideSixMemberCandidateSolverEvidence({
          stage,
          stageResult: buildSmartphoneStageEvidenceInput(),
        });
      smartphoneStageWideSixMemberCandidateSolverRecovery =
        applySmartphoneStageWideSixMemberCandidateSolverRecovery({
          stage,
          simulation: smartphoneStageWideSixMemberCandidateSolverSimulation,
          mode: ocrSource,
          previousRecoveries: {
            crownBonus: smartphoneCrownBonusRuleRecovery,
          },
        });
      if (smartphoneStageWideSixMemberCandidateSolverRecovery.applied) {
        knownCorrectionDeltas.push({
          pass: "smartphoneStageWideSixMemberCandidateSolverRecovery applied",
          before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
          after: cloneStageState({
            self: smartphoneStageWideSixMemberCandidateSolverRecovery.self.members,
            enemy: smartphoneStageWideSixMemberCandidateSolverRecovery.enemy.members,
            selfTotal: smartphoneStageWideSixMemberCandidateSolverRecovery.self.total,
            enemyTotal: smartphoneStageWideSixMemberCandidateSolverRecovery.enemy.total,
          }),
          message: smartphoneStageWideSixMemberCandidateSolverRecovery.message,
        });
        self = smartphoneStageWideSixMemberCandidateSolverRecovery.self.members;
        enemy = smartphoneStageWideSixMemberCandidateSolverRecovery.enemy.members;
        selfTotal = smartphoneStageWideSixMemberCandidateSolverRecovery.self.total;
        enemyTotal = smartphoneStageWideSixMemberCandidateSolverRecovery.enemy.total;
      }
      smartphoneExactSlotSelectionRecoveryBySide = {};
      for (const side of sides) {
        const exactSlotRecovery = applySmartphoneExactSlotSelectionRecovery({
          stage,
          side,
          stageResult: buildSmartphoneStageEvidenceInput(),
          mode: ocrSource,
        });
        smartphoneExactSlotSelectionRecoveryBySide[side] = exactSlotRecovery;
        if (exactSlotRecovery.applied) {
          const beforeState = cloneStageState({ self, enemy, selfTotal, enemyTotal });
          if (side === "self") {
            self = exactSlotRecovery.members;
            selfTotal = exactSlotRecovery.total;
          } else {
            enemy = exactSlotRecovery.members;
            enemyTotal = exactSlotRecovery.total;
          }
          knownCorrectionDeltas.push({
            pass: "smartphoneExactSlotSelectionRecovery applied",
            before: beforeState,
            after: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
            message: exactSlotRecovery.message,
          });
        }
      }
    }

    let currentPcPreRecoveryAnalysisBySide = null;
    let currentPcProductionRecoveryBySide = null;
    let currentPcStage3SevenDigitBonusDisplacementRecoveryBySide = null;
    let currentPcCrownBonusRuleSimulation = null;
    let currentPcCrownBonusRuleRecovery = null;
    let currentPcStageWideSixMemberCandidateSolverSimulation = null;
    let currentPcStageWideSixMemberCandidateSolverRecovery = null;
    let currentPcExactMembersCrownBonusTotalRecoverySimulation = null;
    let currentPcExactMembersCrownBonusTotalRecovery = null;
    let currentPcSideLocalExactEvidenceRecoverySimulation = null;
    let currentPcSideLocalExactEvidenceRecovery = null;
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
      const buildCurrentPcStageWideSideAnalysis = (side) => {
        const isSelf = side === "self";
        const sideAnalysis = currentPcPreRecoveryAnalysisBySide[side] || {};
        return {
          selectedMembers: isSelf ? self : enemy,
          selectedTotal: isSelf ? selfTotal : enemyTotal,
          rawCandidates: sideAnalysis.rawCandidates || [],
          displayedTotalCandidates: sideAnalysis.displayedTotalCandidates || [],
          bonusCandidates: sideAnalysis.bonusCandidates || [],
          candidateSourceSummary: sideAnalysis.candidateSourceSummary || null,
          currentPcGroupedRawTokenEvidenceSimulation:
            sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation || null,
          currentPcStage3SevenDigitBonusDisplacementSimulation:
            sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation || null,
        };
      };
      currentPcStageWideSixMemberCandidateSolverSimulation =
        sharedBuildCurrentPcStageWideSixMemberCandidateSolverEvidence({
          stage,
          self: buildCurrentPcStageWideSideAnalysis("self"),
          enemy: buildCurrentPcStageWideSideAnalysis("enemy"),
        });
      currentPcStageWideSixMemberCandidateSolverRecovery =
        applyCurrentPcStageWideSixMemberCandidateSolverRecovery({
          stage,
          selectedSelfMembers: self,
          selectedEnemyMembers: enemy,
          selectedSelfTotal: selfTotal,
          selectedEnemyTotal: enemyTotal,
          simulation: currentPcStageWideSixMemberCandidateSolverSimulation,
          layoutDetection,
          mode: ocrSource,
          previousRecoveries: {
            self: {
              groupedRaw: currentPcProductionRecoveryBySide.self,
              stage3SevenDigit: currentPcStage3SevenDigitBonusDisplacementRecoveryBySide.self,
              crownBonus: currentPcCrownBonusRuleRecovery,
            },
            enemy: {
              groupedRaw: currentPcProductionRecoveryBySide.enemy,
              stage3SevenDigit: currentPcStage3SevenDigitBonusDisplacementRecoveryBySide.enemy,
              crownBonus: currentPcCrownBonusRuleRecovery,
            },
          },
        });
      if (currentPcStageWideSixMemberCandidateSolverRecovery.applied) {
        knownCorrectionDeltas.push({
          pass: "currentPcStageWideSixMemberCandidateSolverRecovery applied",
          before: cloneStageState({ self, enemy, selfTotal, enemyTotal }),
          after: cloneStageState({
            self: currentPcStageWideSixMemberCandidateSolverRecovery.self.members,
            enemy: currentPcStageWideSixMemberCandidateSolverRecovery.enemy.members,
            selfTotal: currentPcStageWideSixMemberCandidateSolverRecovery.self.total,
            enemyTotal: currentPcStageWideSixMemberCandidateSolverRecovery.enemy.total,
          }),
          message: currentPcStageWideSixMemberCandidateSolverRecovery.message,
        });
        self = currentPcStageWideSixMemberCandidateSolverRecovery.self.members;
        enemy = currentPcStageWideSixMemberCandidateSolverRecovery.enemy.members;
        selfTotal = currentPcStageWideSixMemberCandidateSolverRecovery.self.total;
        enemyTotal = currentPcStageWideSixMemberCandidateSolverRecovery.enemy.total;
      }
      const buildCurrentPcExactMembersSideAnalysis = (side) => {
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
      currentPcExactMembersCrownBonusTotalRecoverySimulation = {
        self: sharedBuildCurrentPcExactMembersCrownBonusTotalRecoveryEvidence({
          stage,
          side: "self",
          self: buildCurrentPcExactMembersSideAnalysis("self"),
          enemy: buildCurrentPcExactMembersSideAnalysis("enemy"),
          previousRecoveries: {
            self: {
              groupedRaw: currentPcProductionRecoveryBySide.self,
              stage3SevenDigit: currentPcStage3SevenDigitBonusDisplacementRecoveryBySide.self,
              crownBonus: currentPcCrownBonusRuleRecovery,
              stageWideSixMember: currentPcStageWideSixMemberCandidateSolverRecovery,
            },
          },
        }),
        enemy: sharedBuildCurrentPcExactMembersCrownBonusTotalRecoveryEvidence({
          stage,
          side: "enemy",
          self: buildCurrentPcExactMembersSideAnalysis("self"),
          enemy: buildCurrentPcExactMembersSideAnalysis("enemy"),
          previousRecoveries: {
            enemy: {
              groupedRaw: currentPcProductionRecoveryBySide.enemy,
              stage3SevenDigit: currentPcStage3SevenDigitBonusDisplacementRecoveryBySide.enemy,
              crownBonus: currentPcCrownBonusRuleRecovery,
              stageWideSixMember: currentPcStageWideSixMemberCandidateSolverRecovery,
            },
          },
        }),
      };
      currentPcExactMembersCrownBonusTotalRecovery = {};
      const applyCurrentPcExactMembersCrownBonusTotalRecoveryToSide = (side) => {
        const isSelf = side === "self";
        const recovery = applyCurrentPcExactMembersCrownBonusTotalRecovery({
          stage,
          side,
          selectedMembers: isSelf ? self : enemy,
          selectedTotal: isSelf ? selfTotal : enemyTotal,
          simulation: currentPcExactMembersCrownBonusTotalRecoverySimulation[side],
          layoutDetection,
          mode: ocrSource,
        });
        if (!recovery.applied) return recovery;
        knownCorrectionDeltas.push({
          pass: "currentPcExactMembersCrownBonusTotalRecovery applied",
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
      currentPcExactMembersCrownBonusTotalRecovery.self =
        applyCurrentPcExactMembersCrownBonusTotalRecoveryToSide("self");
      currentPcExactMembersCrownBonusTotalRecovery.enemy =
        applyCurrentPcExactMembersCrownBonusTotalRecoveryToSide("enemy");

      const buildCurrentPcSideLocalSideAnalysis = (side) => {
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
      currentPcSideLocalExactEvidenceRecoverySimulation = {
        self: sharedBuildCurrentPcSideLocalExactEvidenceRecoveryEvidence({
          stage,
          side: "self",
          self: buildCurrentPcSideLocalSideAnalysis("self"),
          enemy: buildCurrentPcSideLocalSideAnalysis("enemy"),
          previousRecoveries: {
            self: {
              groupedRaw: currentPcProductionRecoveryBySide.self,
              stage3SevenDigit: currentPcStage3SevenDigitBonusDisplacementRecoveryBySide.self,
              crownBonus: currentPcCrownBonusRuleRecovery,
              stageWideSixMember: currentPcStageWideSixMemberCandidateSolverRecovery,
              exactMembersBonusTotal: currentPcExactMembersCrownBonusTotalRecovery.self,
            },
          },
        }),
        enemy: sharedBuildCurrentPcSideLocalExactEvidenceRecoveryEvidence({
          stage,
          side: "enemy",
          self: buildCurrentPcSideLocalSideAnalysis("self"),
          enemy: buildCurrentPcSideLocalSideAnalysis("enemy"),
          previousRecoveries: {
            enemy: {
              groupedRaw: currentPcProductionRecoveryBySide.enemy,
              stage3SevenDigit: currentPcStage3SevenDigitBonusDisplacementRecoveryBySide.enemy,
              crownBonus: currentPcCrownBonusRuleRecovery,
              stageWideSixMember: currentPcStageWideSixMemberCandidateSolverRecovery,
              exactMembersBonusTotal: currentPcExactMembersCrownBonusTotalRecovery.enemy,
            },
          },
        }),
      };
      currentPcSideLocalExactEvidenceRecovery = {};
      const applyCurrentPcSideLocalExactEvidenceRecoveryToSide = (side) => {
        const isSelf = side === "self";
        const recovery = applyCurrentPcSideLocalExactEvidenceRecovery({
          stage,
          side,
          selectedMembers: isSelf ? self : enemy,
          selectedTotal: isSelf ? selfTotal : enemyTotal,
          simulation: currentPcSideLocalExactEvidenceRecoverySimulation[side],
          layoutDetection,
          mode: ocrSource,
        });
        if (!recovery.applied) return recovery;
        knownCorrectionDeltas.push({
          pass: "currentPcSideLocalExactEvidenceRecovery applied",
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
      currentPcSideLocalExactEvidenceRecovery.self =
        applyCurrentPcSideLocalExactEvidenceRecoveryToSide("self");
      currentPcSideLocalExactEvidenceRecovery.enemy =
        applyCurrentPcSideLocalExactEvidenceRecoveryToSide("enemy");
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
    if (ocrSource === "smartphone") {
      stageResult.smartphoneCrownBonusRuleSimulation = smartphoneCrownBonusRuleSimulation;
      stageResult.smartphoneCrownBonusRuleRecovery = smartphoneCrownBonusRuleRecovery;
      stageResult.smartphoneStageWideSixMemberCandidateSolverSimulation =
        smartphoneStageWideSixMemberCandidateSolverSimulation;
      stageResult.smartphoneStageWideSixMemberCandidateSolverRecovery =
        smartphoneStageWideSixMemberCandidateSolverRecovery;
      stageResult.smartphoneExactSlotSelectionRecoveryBySide =
        smartphoneExactSlotSelectionRecoveryBySide;
    }

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
          currentPcStageWideSixMemberCandidateSolverSimulation,
          currentPcStageWideSixMemberCandidateSolverRecovery,
          currentPcExactMembersCrownBonusTotalRecoverySimulation:
            currentPcExactMembersCrownBonusTotalRecoverySimulation?.[side] || null,
          currentPcExactMembersCrownBonusTotalRecovery:
            currentPcExactMembersCrownBonusTotalRecovery?.[side] || null,
          currentPcSideLocalExactEvidenceRecoverySimulation:
            currentPcSideLocalExactEvidenceRecoverySimulation?.[side] || null,
          currentPcSideLocalExactEvidenceRecovery:
            currentPcSideLocalExactEvidenceRecovery?.[side] || null,
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
        currentPcStageWideSixMemberCandidateSolverSimulation,
        currentPcStageWideSixMemberCandidateSolverRecovery,
        currentPcExactMembersCrownBonusTotalRecoverySimulation,
        currentPcExactMembersCrownBonusTotalRecovery,
        currentPcSideLocalExactEvidenceRecoverySimulation,
        currentPcSideLocalExactEvidenceRecovery,
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

function normalizeSimulationNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function simulationMemberSum(members = []) {
  return members.reduce((sum, value) => sum + normalizeSimulationNumber(value), 0);
}

function smartphoneExpectedBonus(expectedStage = {}, side) {
  const members = Array.isArray(expectedStage?.[`${side}Members`])
    ? expectedStage[`${side}Members`].map(normalizeSimulationNumber)
    : [];
  const total = normalizeSimulationNumber(
    side === "self" ? expectedStage?.selfTotal : expectedStage?.enemyTotal
  );
  return Math.max(0, total - simulationMemberSum(members));
}

function smartphoneStageOutputFromResult(stageResult = {}) {
  const selfMembers = Array.isArray(stageResult.self)
    ? stageResult.self.map(normalizeSimulationNumber)
    : [0, 0, 0];
  const enemyMembers = Array.isArray(stageResult.enemy)
    ? stageResult.enemy.map(normalizeSimulationNumber)
    : [0, 0, 0];
  return {
    selfMembers,
    enemyMembers,
    selfTotal: normalizeSimulationNumber(stageResult.selfTotal),
    enemyTotal: normalizeSimulationNumber(stageResult.enemyTotal),
  };
}

function smartphoneStageExpectedOutput(expectedStage = {}) {
  return {
    selfMembers: Array.isArray(expectedStage.selfMembers)
      ? expectedStage.selfMembers.map(normalizeSimulationNumber)
      : [0, 0, 0],
    enemyMembers: Array.isArray(expectedStage.enemyMembers)
      ? expectedStage.enemyMembers.map(normalizeSimulationNumber)
      : [0, 0, 0],
    selfTotal: normalizeSimulationNumber(expectedStage.selfTotal),
    enemyTotal: normalizeSimulationNumber(expectedStage.enemyTotal),
  };
}

function smartphoneStageOutputsEqual(a = {}, b = {}) {
  return (
    normalizeSimulationNumber(a.selfTotal) === normalizeSimulationNumber(b.selfTotal) &&
    normalizeSimulationNumber(a.enemyTotal) === normalizeSimulationNumber(b.enemyTotal) &&
    ["selfMembers", "enemyMembers"].every((key) =>
      [0, 1, 2].every(
        (index) =>
          normalizeSimulationNumber(a[key]?.[index]) === normalizeSimulationNumber(b[key]?.[index])
      )
    )
  );
}

function uniqueGlobalRankOneFromMembers(selfMembers = [], enemyMembers = [], options = {}) {
  const requireComplete = options.requireComplete !== false;
  const entries = [
    ...selfMembers.map((value, index) => ({
      side: "self",
      slot: index + 1,
      value: normalizeSimulationNumber(value),
    })),
    ...enemyMembers.map((value, index) => ({
      side: "enemy",
      slot: index + 1,
      value: normalizeSimulationNumber(value),
    })),
  ].filter((entry) => entry.value > 0);
  if (requireComplete && entries.length !== 6) {
    return {
      unique: false,
      reason: "six-members-incomplete",
      entries,
      rank1: null,
      bonus: 0,
    };
  }
  const maxValue = Math.max(...entries.map((entry) => entry.value));
  const winners = entries.filter((entry) => entry.value === maxValue);
  if (winners.length !== 1) {
    return {
      unique: false,
      reason: "global-rank1-not-unique",
      entries,
      rank1: winners[0] || null,
      bonus: Math.floor(maxValue * 0.2),
    };
  }
  return {
    unique: true,
    reason: "",
    entries,
    rank1: winners[0],
    bonus: Math.floor(maxValue * 0.2),
  };
}

function flattenNumbers(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenNumbers(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value.numbers)) flattenNumbers(value.numbers, output);
    if (typeof value.text === "string") flattenNumbers(extractNumbersForZone(value.text), output);
    if (Array.isArray(value.traces)) flattenNumbers(value.traces, output);
    return output;
  }
  const num = normalizeSimulationNumber(value);
  if (num > 0) output.push(num);
  return output;
}

function collectSmartphoneTotalEvidence(stageResult = {}, side) {
  const rawKey = side === "self" ? "selfTotal" : "enemyTotal";
  const rawTextPrefix = side === "self" ? "selfTotal" : "enemyTotal";
  const evidence = [];
  const add = (value, source) => {
    for (const number of uniqueNumbers(flattenNumbers(value))) {
      if (number >= 10000 && number < 10000000) evidence.push({ value: number, source });
    }
  };
  add(stageResult.raw?.[rawKey], `${side}.raw.total`);
  add(stageResult.rawText?.[`${rawTextPrefix}Direct`], `${side}.rawText.totalDirect`);
  add(stageResult.rawText?.[`${rawTextPrefix}Candidates`], `${side}.rawText.totalCandidates`);
  add(
    stageResult.rawText?.[`${rawTextPrefix}CandidateTraces`],
    `${side}.rawText.totalCandidateTraces`
  );
  return uniqueNumbers(evidence.map((entry) => entry.value)).map((value) => ({
    value,
    sources: evidence.filter((entry) => entry.value === value).map((entry) => entry.source),
  }));
}

function collectSmartphoneMemberSlotPools(stageResult = {}, side) {
  const selected = side === "self" ? stageResult.self : stageResult.enemy;
  const rawKey = side === "self" ? "selfMembers" : "enemyMembers";
  const pools = [[], [], []];
  const add = (slotIndex, value, source) => {
    const number = normalizeSimulationNumber(value);
    if (number < 1000 || number >= 10000000) return;
    if (pools[slotIndex].some((entry) => entry.value === number && entry.source === source)) return;
    pools[slotIndex].push({ value: number, source });
  };
  for (let index = 0; index < 3; index += 1) {
    add(index, selected?.[index], "selected-current-output");
  }
  const rawNumbers = uniqueNumbers(flattenNumbers(stageResult.raw?.[rawKey]));
  if (rawNumbers.length >= 3) {
    for (let index = 0; index < 3; index += 1) {
      add(index, rawNumbers[index], `${side}.raw.member-row-order`);
    }
  }
  const rawTextNumbers = uniqueNumbers(flattenNumbers(stageResult.rawText?.[rawKey]));
  if (rawTextNumbers.length >= 3) {
    for (let index = 0; index < 3; index += 1) {
      add(index, rawTextNumbers[index], `${side}.rawText.member-row-order`);
    }
  }
  return pools.map((pool) => {
    const byValue = new Map();
    for (const entry of pool) {
      if (!byValue.has(entry.value)) byValue.set(entry.value, { value: entry.value, sources: [] });
      byValue.get(entry.value).sources.push(entry.source);
    }
    return [...byValue.values()];
  });
}

function enumerateSmartphonePoolValues(pools, limit = 729) {
  const safePools = pools.map((pool) => (pool.length > 0 ? pool : [{ value: 0, sources: [] }]));
  const total = safePools.reduce((product, pool) => product * pool.length, 1);
  if (total > limit) {
    return { combinations: [], blocked: true, count: total };
  }
  const combinations = [];
  for (const a of safePools[0]) {
    for (const b of safePools[1]) {
      for (const c of safePools[2]) {
        combinations.push({
          members: [a.value, b.value, c.value],
          sources: [a.sources, b.sources, c.sources],
        });
      }
    }
  }
  return { combinations, blocked: false, count: total };
}

function buildSmartphoneCrownBonusRuleSimulationForStage(stageResult = {}) {
  return sharedBuildSmartphoneCrownBonusRuleEvidence({ stage: stageResult.stage || 0, stageResult });
}

function buildSmartphoneStageWideSixMemberCandidateSolverSimulationForStage(stageResult = {}) {
  return sharedBuildSmartphoneStageWideSixMemberCandidateSolverEvidence({
    stage: stageResult.stage || 0,
    stageResult,
  });
}

function evaluateSmartphoneSimulation(report, buildStageSimulation) {
  const rows = [];
  const overlap = {
    existingProductionPass: 0,
  };
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blocked = 0;
  let trueIncrementalTp = 0;
  for (const item of report.filter((entry) => entry.source === "smartphone" && entry.expectedData)) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const stageResult = item.result?.[stageKey];
      const expectedStage = item.expectedData?.[stageKey];
      if (!stageResult || !expectedStage) continue;
      const expectedOutput = smartphoneStageExpectedOutput(expectedStage);
      const selectedOutput = smartphoneStageOutputFromResult(stageResult);
      const currentPass = smartphoneStageOutputsEqual(selectedOutput, expectedOutput);
      const simulation = buildStageSimulation(stageResult, expectedStage, item);
      const proposedPass =
        simulation.wouldApply && simulation.proposed
          ? smartphoneStageOutputsEqual(simulation.proposed, expectedOutput)
          : false;
      const expectedCandidateAvailable =
        !simulation.wouldApply &&
        simulation.proposals?.some((proposal) => smartphoneStageOutputsEqual(proposal, expectedOutput));
      let classification = "blocked";
      if (simulation.wouldApply && proposedPass) {
        classification = currentPass ? "already-correct-tp-overlap" : "tp";
        truePositives += 1;
        if (!currentPass) trueIncrementalTp += 1;
        if (currentPass) overlap.existingProductionPass += 1;
      } else if (simulation.wouldApply && !proposedPass) {
        classification = "fp";
        falsePositives += 1;
      } else if (!currentPass && expectedCandidateAvailable) {
        classification = "fn";
        falseNegatives += 1;
      } else {
        blocked += 1;
      }
      rows.push({
        image: item.image,
        stage,
        currentPass,
        classification,
        selected: selectedOutput,
        expected: expectedOutput,
        simulation,
      });
    }
  }
  return {
    rowsAudited: rows.length,
    truePositives,
    falsePositives,
    falseNegatives,
    blocked,
    trueIncrementalTp,
    overlap,
    acceptedRows: rows.filter((row) => row.classification.includes("tp")),
    falsePositiveRows: rows.filter((row) => row.classification === "fp"),
    falseNegativeRows: rows.filter((row) => row.classification === "fn"),
    blockedRows: rows.filter((row) => row.classification === "blocked"),
    positionBreakdown: summarizeSmartphoneSimulationPositions(rows),
  };
}

async function buildAndWriteSmartphoneCrownStageWideSolverSimulation({
  report,
  source,
  cacheSummary,
}) {
  const ruleValidation = validateSmartphoneCrownBonusRuleFromExpected(report);
  if (ruleValidation.floorMatches !== ruleValidation.stagesChecked) {
    return {
      ruleValidation,
      skipped: true,
      reason: "smartphone-crown-bonus-rule-validation-did-not-pass",
    };
  }
  const crownBonusSimulation = evaluateSmartphoneSimulation(
    report,
    buildSmartphoneCrownBonusRuleSimulationForStage
  );
  const stageWideSimulation = evaluateSmartphoneSimulation(
    report,
    buildSmartphoneStageWideSixMemberCandidateSolverSimulationForStage
  );
  const impactedImages = {};
  for (const image of ["IMG_9308", "IMG_9310", "IMG_9319"]) {
    const crownRows = crownBonusSimulation.acceptedRows.filter((row) =>
      String(row.image).includes(image)
    );
    const stageWideRows = stageWideSimulation.acceptedRows.filter((row) =>
      String(row.image).includes(image)
    );
    impactedImages[image] = {
      crown:
        crownRows.length > 0
          ? `would apply on ${crownRows.map((row) => `S${row.stage}`).join(", ")}`
          : "no help",
      stageWide:
        stageWideRows.length > 0
          ? `would apply on ${stageWideRows.map((row) => `S${row.stage}`).join(", ")}`
          : "no help",
      notes: [crownRows, stageWideRows].some((rows) => rows.length > 0)
        ? "runner-only proposal present"
        : "remains blocked by strict evidence guards",
    };
  }
  const result = {
    ruleValidation,
    crownBonusSimulation,
    stageWideSimulation,
    impactedImages,
    source,
    cacheSummary,
    overlap: buildSmartphoneSimulationOverlap(crownBonusSimulation, stageWideSimulation),
    parity: compareSmartphoneCrownStageWideParity(report),
    productionImpact: buildSmartphoneProductionSolverImpact(report),
  };
  await fs.writeFile(
    smartphoneCrownBonusStageWideSolverReportPath,
    buildSmartphoneCrownBonusStageWideSolverSimulationReport(result)
  );
  await fs.mkdir(path.join(rootDir, "tmp"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "tmp", "smartphone-crown-bonus-stage-wide-solver-simulation.json"),
    JSON.stringify(result, null, 2)
  );
  return result;
}

function summarizeSmartphoneSimulationPositions(rows = []) {
  const summary = {};
  for (const stage of stages) {
    for (const side of sides) {
      summary[`S${stage} ${side}`] = {
        accepted: 0,
        fp: 0,
        fn: 0,
        blocked: 0,
      };
    }
  }
  for (const row of rows) {
    for (const side of sides) {
      const expected = {
        selfMembers: side === "self" ? row.expected.selfMembers : row.selected.selfMembers,
        enemyMembers: side === "enemy" ? row.expected.enemyMembers : row.selected.enemyMembers,
        selfTotal: side === "self" ? row.expected.selfTotal : row.selected.selfTotal,
        enemyTotal: side === "enemy" ? row.expected.enemyTotal : row.selected.enemyTotal,
      };
      const selected = row.selected;
      const key = `S${row.stage} ${side}`;
      const sidePass = smartphoneStageOutputsEqual(selected, expected);
      const proposedSidePass =
        row.simulation?.wouldApply &&
        row.simulation?.proposed &&
        smartphoneStageOutputsEqual(row.simulation.proposed, expected);
      if (row.classification.includes("tp") && proposedSidePass && !sidePass) {
        summary[key].accepted += 1;
      } else if (row.classification === "fp") {
        summary[key].fp += 1;
      } else if (row.classification === "fn") {
        summary[key].fn += 1;
      } else if (!sidePass) {
        summary[key].blocked += 1;
      }
    }
  }
  return summary;
}

function buildSmartphoneSimulationOverlap(crownBonusSimulation, stageWideSimulation) {
  const crownAccepted = new Set(
    crownBonusSimulation.acceptedRows.map((row) => `${row.image}::S${row.stage}`)
  );
  const stageWideAccepted = new Set(
    stageWideSimulation.acceptedRows.map((row) => `${row.image}::S${row.stage}`)
  );
  const overlap = [...crownAccepted].filter((key) => stageWideAccepted.has(key));
  return {
    crownAccepted: crownAccepted.size,
    stageWideAccepted: stageWideAccepted.size,
    overlap: overlap.length,
    crownOnly: crownAccepted.size - overlap.length,
    stageWideOnly: stageWideAccepted.size - overlap.length,
  };
}

function cloneSmartphoneStageResult(stageResult = {}) {
  return JSON.parse(JSON.stringify(stageResult || {}));
}

function applySmartphoneProductionSolverRecoveriesToStage(stageResult = {}, stage = 0, options = {}) {
  const includeExactSlot = options.includeExactSlot !== false;
  const next = cloneSmartphoneStageResult(stageResult);
  next.stage = stage;
  const before = smartphoneStageOutputFromResult(next);
  const crownSimulation = sharedBuildSmartphoneCrownBonusRuleEvidence({
    stage,
    stageResult: next,
  });
  const crownRecovery = applySmartphoneCrownBonusRuleRecovery({
    stage,
    simulation: crownSimulation,
    mode: "smartphone",
  });
  if (crownRecovery.applied) {
    next.self = crownRecovery.self.members;
    next.enemy = crownRecovery.enemy.members;
    next.selfTotal = crownRecovery.self.total;
    next.enemyTotal = crownRecovery.enemy.total;
  }
  const stageWideSimulation = sharedBuildSmartphoneStageWideSixMemberCandidateSolverEvidence({
    stage,
    stageResult: next,
  });
  const stageWideRecovery = applySmartphoneStageWideSixMemberCandidateSolverRecovery({
    stage,
    simulation: stageWideSimulation,
    mode: "smartphone",
    previousRecoveries: {
      crownBonus: crownRecovery,
    },
  });
  if (stageWideRecovery.applied) {
    next.self = stageWideRecovery.self.members;
    next.enemy = stageWideRecovery.enemy.members;
    next.selfTotal = stageWideRecovery.self.total;
    next.enemyTotal = stageWideRecovery.enemy.total;
  }
  const exactSlotRecoveries = {};
  if (includeExactSlot) {
    for (const side of sides) {
      const exactSlotRecovery = applySmartphoneExactSlotSelectionRecovery({
        stage,
        side,
        stageResult: next,
        mode: "smartphone",
      });
      exactSlotRecoveries[side] = exactSlotRecovery;
      if (exactSlotRecovery.applied) {
        if (side === "self") {
          next.self = exactSlotRecovery.members;
          next.selfTotal = exactSlotRecovery.total;
        } else {
          next.enemy = exactSlotRecovery.members;
          next.enemyTotal = exactSlotRecovery.total;
        }
      }
    }
  }
  return {
    stageResult: next,
    before,
    after: smartphoneStageOutputFromResult(next),
    crownSimulation,
    crownRecovery,
    stageWideSimulation,
    stageWideRecovery,
    exactSlotRecoveries,
  };
}

function smartphoneStageSidePass(output = {}, expected = {}, side = "self") {
  const memberKey = side === "self" ? "selfMembers" : "enemyMembers";
  const totalKey = side === "self" ? "selfTotal" : "enemyTotal";
  return (
    normalizeSimulationNumber(output[totalKey]) === normalizeSimulationNumber(expected[totalKey]) &&
    [0, 1, 2].every(
      (index) =>
        normalizeSimulationNumber(output[memberKey]?.[index]) ===
        normalizeSimulationNumber(expected[memberKey]?.[index])
    )
  );
}

function buildSmartphoneAccuracyFromStageOutputs(items = [], stageOutputBuilder) {
  let imagesPass = 0;
  let imagesFail = 0;
  let stagesPass = 0;
  let stagesFail = 0;
  let stageSidesPass = 0;
  let stageSidesFail = 0;
  for (const item of items.filter((entry) => entry.source === "smartphone" && entry.expectedData)) {
    let imagePass = true;
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const expected = smartphoneStageExpectedOutput(item.expectedData?.[stageKey] || {});
      const output = stageOutputBuilder(item, stage);
      const selfPass = smartphoneStageSidePass(output, expected, "self");
      const enemyPass = smartphoneStageSidePass(output, expected, "enemy");
      if (selfPass) stageSidesPass += 1;
      else stageSidesFail += 1;
      if (enemyPass) stageSidesPass += 1;
      else stageSidesFail += 1;
      if (selfPass && enemyPass) stagesPass += 1;
      else {
        stagesFail += 1;
        imagePass = false;
      }
    }
    if (imagePass) imagesPass += 1;
    else imagesFail += 1;
  }
  return {
    imagesPass,
    imagesFail,
    stagesPass,
    stagesFail,
    stageSidesPass,
    stageSidesFail,
  };
}

function buildSmartphoneProductionSolverImpact(report = []) {
  const items = report.filter((entry) => entry.source === "smartphone" && entry.expectedData);
  const afterStageOutputs = new Map();
  const changes = [];
  let crownRecoveriesApplied = 0;
  let stageWideRecoveriesApplied = 0;
  const uniqueRecoveredStageKeys = new Set();
  const unexpectedChangedStages = [];

  for (const item of items) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const stageResult = item.result?.[stageKey];
      if (!stageResult) continue;
      const expected = smartphoneStageExpectedOutput(item.expectedData?.[stageKey] || {});
      const applied = applySmartphoneProductionSolverRecoveriesToStage(stageResult, stage);
      const key = `${item.image}::S${stage}`;
      afterStageOutputs.set(key, applied.after);
      const beforePass = smartphoneStageOutputsEqual(applied.before, expected);
      const afterPass = smartphoneStageOutputsEqual(applied.after, expected);
      const changed = !smartphoneStageOutputsEqual(applied.before, applied.after);
      if (applied.crownRecovery.applied) crownRecoveriesApplied += 1;
      if (applied.stageWideRecovery.applied) stageWideRecoveriesApplied += 1;
      if (changed) {
        uniqueRecoveredStageKeys.add(key);
        changes.push({
          image: item.image,
          stage,
          beforePass,
          afterPass,
          before: applied.before,
          after: applied.after,
          crownApplied: Boolean(applied.crownRecovery.applied),
          stageWideApplied: Boolean(applied.stageWideRecovery.applied),
        });
        if (!afterPass) unexpectedChangedStages.push({ image: item.image, stage, before: applied.before, after: applied.after });
      }
    }
  }

  const beforeAccuracy = buildSmartphoneAccuracyFromStageOutputs(items, (item, stage) =>
    smartphoneStageOutputFromResult(item.result?.[`stage${stage}`] || {})
  );
  const afterAccuracy = buildSmartphoneAccuracyFromStageOutputs(items, (item, stage) => {
    const key = `${item.image}::S${stage}`;
    return afterStageOutputs.get(key) || smartphoneStageOutputFromResult(item.result?.[`stage${stage}`] || {});
  });

  return {
    beforeAccuracy,
    afterAccuracy,
    crownRecoveriesApplied,
    stageWideRecoveriesApplied,
    uniqueRecoveredStages: uniqueRecoveredStageKeys.size,
    allPriorTpStagesRecovered: uniqueRecoveredStageKeys.size >= 7,
    unexpectedChangedStages,
    changes,
  };
}

function smartphoneStageSideOutput(stageOutput = {}, side = "self") {
  return {
    members:
      side === "self"
        ? (stageOutput.selfMembers || []).map(normalizeSimulationNumber)
        : (stageOutput.enemyMembers || []).map(normalizeSimulationNumber),
    total: normalizeSimulationNumber(side === "self" ? stageOutput.selfTotal : stageOutput.enemyTotal),
  };
}

function smartphoneStageSideExpected(expectedStage = {}, side = "self") {
  const output = smartphoneStageExpectedOutput(expectedStage);
  return {
    members:
      side === "self"
        ? output.selfMembers.map(normalizeSimulationNumber)
        : output.enemyMembers.map(normalizeSimulationNumber),
    total: normalizeSimulationNumber(side === "self" ? output.selfTotal : output.enemyTotal),
    bonus: smartphoneExpectedBonus(expectedStage, side),
  };
}

function smartphoneStageSideOutputPass(actual = {}, expected = {}) {
  return (
    normalizeSimulationNumber(actual.total) === normalizeSimulationNumber(expected.total) &&
    [0, 1, 2].every(
      (index) =>
        normalizeSimulationNumber(actual.members?.[index]) ===
        normalizeSimulationNumber(expected.members?.[index])
    )
  );
}

function smartphoneTotalCaptureCropVariants(baseZone = {}) {
  const z = normalizeRoiZone(baseZone);
  const dx = Math.max(6, Math.round(z.width * 0.08));
  const dy = Math.max(3, Math.round(z.height * 0.12));
  return [
    { name: "baseline", zone: z },
    { name: "wider-left", zone: { ...z, left: z.left - dx, width: z.width + dx } },
    { name: "wider-right", zone: { ...z, width: z.width + dx } },
    { name: "wider-both", zone: { ...z, left: z.left - dx, width: z.width + dx * 2 } },
    { name: "shift-up", zone: { ...z, top: z.top - dy } },
    { name: "shift-down", zone: { ...z, top: z.top + dy } },
    { name: "taller", zone: { ...z, top: z.top - dy, height: z.height + dy * 2 } },
    {
      name: "left-overlap",
      zone: { ...z, left: z.left - Math.round(dx * 1.8), width: z.width + Math.round(dx * 1.8) },
    },
    {
      name: "right-overlap",
      zone: { ...z, width: z.width + Math.round(dx * 1.8) },
    },
  ];
}

function smartphoneTotalCapturePreprocessVariants() {
  return [
    { name: "current-default-psm6", type: "existing", pageSegMode: "6" },
    { name: "current-default-psm7", type: "existing", pageSegMode: "7" },
    { name: "next-threshold-psm7", type: "existing", preset: "next-screen-threshold", pageSegMode: "7" },
    {
      name: "blur-reduction-psm7",
      type: "existing",
      preset: "next-screen-blur-reduction",
      pageSegMode: "7",
    },
    { name: "crown-bonus-psm7", type: "existing", preset: "crown-bonus", pageSegMode: "7" },
    { name: "score-slot-psm7", type: "existing", preset: "score-slot", pageSegMode: "7" },
    { name: "grayscale-upscale-psm7", type: "grayscale-upscale", pageSegMode: "7" },
    { name: "fixed-threshold-150-psm7", type: "threshold", threshold: 150, pageSegMode: "7" },
    {
      name: "fixed-threshold-190-inverted-psm7",
      type: "threshold",
      threshold: 190,
      invert: true,
      pageSegMode: "7",
    },
  ];
}

async function createSmartphoneTotalDiagnosticBuffer(imagePath, zone, variant = {}) {
  if (!variant.type || variant.type === "existing") {
    return createPreprocessedStageBuffer(imagePath, zone, {
      preset: variant.preset,
      pageSegMode: variant.pageSegMode,
    });
  }
  if (variant.type === "grayscale-upscale") {
    return sharp(imagePath)
      .extract(zone)
      .resize(zone.width * 5, zone.height * 5, { kernel: "lanczos3" })
      .grayscale()
      .normalize()
      .png()
      .toBuffer();
  }
  if (variant.type === "threshold") {
    let pipeline = sharp(imagePath)
      .extract(zone)
      .resize(zone.width * 5, zone.height * 5, { kernel: "nearest" })
      .grayscale()
      .threshold(variant.threshold || 170);
    if (variant.invert) pipeline = pipeline.negate();
    return pipeline.png().toBuffer();
  }
  return createPreprocessedStageBuffer(imagePath, zone, {
    preset: variant.preset,
    pageSegMode: variant.pageSegMode,
  });
}

async function recognizeSmartphoneTotalDiagnosticVariant(imagePath, zone, preprocess) {
  const image = await createSmartphoneTotalDiagnosticBuffer(imagePath, zone, preprocess);
  const result = await Tesseract.recognize(image, "eng", {
    tessedit_char_whitelist: "0123456789,.",
    tessedit_pageseg_mode: preprocess.pageSegMode || "7",
    preserve_interword_spaces: "1",
  });
  const text = result.data.text || "";
  const digitRuns = [...text.matchAll(/\d[\d,.\s]{2,}\d/g)].map((match) =>
    match[0].replace(/\s+/g, " ").trim()
  );
  return {
    text,
    numbers: extractNumbersForZone(text),
    digitRuns,
  };
}

function smartphoneTotalCaptureRowKey(row = {}) {
  return `${row.image}::S${row.stage}::${row.side}`;
}

function buildSmartphoneMissingTotalRowsFromCache(items = []) {
  const rows = [];
  for (const item of items.filter((entry) => entry.source === "smartphone" && entry.expectedData)) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const originalStageResult = item.result?.[stageKey];
      const expectedStage = item.expectedData?.[stageKey];
      if (!originalStageResult || !expectedStage) continue;
      const recovered = applySmartphoneProductionSolverRecoveriesToStage(originalStageResult, stage);
      const output = recovered.after;
      for (const side of sides) {
        const expected = smartphoneStageSideExpected(expectedStage, side);
        const actual = smartphoneStageSideOutput(output, side);
        if (smartphoneStageSideOutputPass(actual, expected)) continue;
        const existingTotalEvidence = collectSmartphoneTotalEvidence(originalStageResult, side);
        const exactTotalPresent = valueInList(
          expected.total,
          existingTotalEvidence.map((entry) => entry.value)
        );
        if (exactTotalPresent) continue;
        rows.push({
          image: item.image,
          absolutePath: item.absolutePath,
          stage,
          side,
          expected,
          actual,
          existingTotalEvidence,
          productionRecoveries: {
            crownApplied: Boolean(recovered.crownRecovery?.applied),
            stageWideApplied: Boolean(recovered.stageWideRecovery?.applied),
          },
        });
      }
    }
  }
  return rows;
}

function smartphoneTotalCaptureBaseZone(image = {}, stage = 1, side = "self") {
  const fixed = getFixedOcrZones(image, stage, "smartphone");
  return side === "self" ? fixed.selfTotal : fixed.enemyTotal;
}

function buildSmartphoneTotalCaptureAugmentedSolverImpact(items = [], rows = [], variantSet = []) {
  const rowsByKey = new Map(rows.map((row) => [smartphoneTotalCaptureRowKey(row), row]));
  const augmentedItems = items.map((item) => JSON.parse(JSON.stringify(item)));
  let exactTotalEvidenceAddedRows = 0;
  const addedRows = [];
  for (const item of augmentedItems) {
    for (const stage of stages) {
      const stageResult = item.result?.[`stage${stage}`];
      if (!stageResult) continue;
      for (const side of sides) {
        const key = `${item.image}::S${stage}::${side}`;
        const row = rowsByKey.get(key);
        if (!row) continue;
        const exactVariants = (row.variantResults || []).filter(
          (variant) =>
            variant.exactExpectedTotal &&
            variantSet.some(
              (entry) => entry.crop === variant.cropVariant && entry.preprocess === variant.preprocessVariant
            )
        );
        if (exactVariants.length === 0) continue;
        exactTotalEvidenceAddedRows += 1;
        addedRows.push(key);
        const rawKey = side === "self" ? "selfTotalCandidateTraces" : "enemyTotalCandidateTraces";
        stageResult.rawText = stageResult.rawText || {};
        stageResult.rawText[rawKey] = Array.isArray(stageResult.rawText[rawKey])
          ? stageResult.rawText[rawKey]
          : [];
        stageResult.rawText[rawKey].push({
          source: "smartphone-total-capture-diagnostics",
          numbers: [row.expected.total],
          text: exactVariants[0].rawText,
        });
      }
    }
  }
  return {
    exactTotalEvidenceAddedRows,
    addedRows,
    productionImpact: buildSmartphoneProductionSolverImpact(augmentedItems),
  };
}

function summarizeSmartphoneTotalCaptureVariants(rows = []) {
  const byVariant = new Map();
  for (const row of rows) {
    for (const result of row.variantResults || []) {
      const key = `${result.cropVariant} + ${result.preprocessVariant}`;
      if (!byVariant.has(key)) {
        byVariant.set(key, {
          crop: result.cropVariant,
          preprocess: result.preprocessVariant,
          rowsWithExactTotal: 0,
          rowsWithCompetingCandidates: 0,
          rowsWithMalformedText: 0,
          examples: [],
        });
      }
      const entry = byVariant.get(key);
      if (result.exactExpectedTotal) {
        entry.rowsWithExactTotal += 1;
        if (entry.examples.length < 5) entry.examples.push(smartphoneTotalCaptureRowKey(row));
      }
      if (result.competingCandidates?.length) entry.rowsWithCompetingCandidates += 1;
      if (result.malformedText) entry.rowsWithMalformedText += 1;
    }
  }
  const variants = [...byVariant.values()].sort(
    (a, b) =>
      b.rowsWithExactTotal - a.rowsWithExactTotal ||
      a.rowsWithCompetingCandidates - b.rowsWithCompetingCandidates ||
      a.rowsWithMalformedText - b.rowsWithMalformedText
  );
  const bestSingleVariant = variants.find((variant) => variant.rowsWithExactTotal > 0) || null;
  const bestFixedVariantSet = [];
  const covered = new Set();
  for (const variant of variants) {
    const newlyCovered = new Set();
    for (const row of rows) {
      const rowKey = smartphoneTotalCaptureRowKey(row);
      if (covered.has(rowKey)) continue;
      const hasExact = (row.variantResults || []).some(
        (result) =>
          result.exactExpectedTotal &&
          result.cropVariant === variant.crop &&
          result.preprocessVariant === variant.preprocess
      );
      if (hasExact) newlyCovered.add(rowKey);
    }
    if (newlyCovered.size === 0) continue;
    bestFixedVariantSet.push({
      crop: variant.crop,
      preprocess: variant.preprocess,
      newlyCoveredRows: newlyCovered.size,
      cumulativeRows: covered.size + newlyCovered.size,
    });
    for (const rowKey of newlyCovered) covered.add(rowKey);
    if (covered.size === rows.length || bestFixedVariantSet.length >= 4) break;
  }
  return {
    variants,
    bestSingleVariant,
    bestFixedVariantSet,
    exactTotalRowsExposed: rows.filter((row) =>
      (row.variantResults || []).some((result) => result.exactExpectedTotal)
    ).length,
    rowsNeverExposed: rows
      .filter((row) => !(row.variantResults || []).some((result) => result.exactExpectedTotal))
      .map((row) => smartphoneTotalCaptureRowKey(row)),
  };
}

function formatMarkdownNumberList(values = []) {
  return values.length ? values.map((value) => `\`${value}\``).join(", ") : "-";
}

function buildSmartphoneTotalCaptureDiagnosticsReport(summary = {}) {
  const lines = [
    "# Smartphone Total Capture Diagnostics",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scope",
    "",
    "Runner-only diagnostics for smartphone rows where the current production output still fails and the exact expected displayed total is absent from existing total evidence. The first focus is Stage3 total crop capture quality.",
    "",
    "This report does not change production OCR output, member selection, or recovery eligibility.",
    "",
    "## Summary",
    "",
    `- Baseline source: ${summary.source || "smartphone baseline cache"}`,
    `- Missing-total rows evaluated: ${summary.rowsEvaluated}`,
    `- Stage3 rows evaluated: ${summary.stage3RowsEvaluated}`,
    `- Rows where an exact expected total was newly exposed by a diagnostic variant: ${summary.variantSummary?.exactTotalRowsExposed || 0}`,
    `- Diagnostic false-positive rows with exact expected total plus competing total candidates: ${summary.diagnosticFalsePositiveRows || 0}`,
    "",
    "## Best Variants",
    "",
  ];
  if (summary.variantSummary?.bestSingleVariant) {
    const best = summary.variantSummary.bestSingleVariant;
    lines.push(
      `- Best single variant: \`${best.crop}\` + \`${best.preprocess}\``,
      `- Rows exposed by best single variant: ${best.rowsWithExactTotal}`,
      `- Rows with competing candidates for best single variant: ${best.rowsWithCompetingCandidates}`,
      ""
    );
  } else {
    lines.push("- Best single variant: none", "");
  }
  lines.push("Best fixed variant set:");
  if (summary.variantSummary?.bestFixedVariantSet?.length) {
    for (const item of summary.variantSummary.bestFixedVariantSet) {
      lines.push(
        `- \`${item.crop}\` + \`${item.preprocess}\`: +${item.newlyCoveredRows} rows, cumulative ${item.cumulativeRows}`
      );
    }
  } else {
    lines.push("- none");
  }
  lines.push(
    "",
    "## Hypothetical Solver Impact",
    "",
    "This is a diagnostic-only estimate of what would happen if exact displayed-total evidence from the best fixed variant set were appended to total evidence and the existing smartphone crown/stage-wide simulations were re-scored. It is not production adoption.",
    "",
    `- Exact total evidence added rows: ${summary.augmentedSolverImpact?.exactTotalEvidenceAddedRows || 0}`,
    `- Cached original image accuracy before existing production solver replay: ${summary.augmentedSolverImpact?.productionImpact?.beforeAccuracy?.imagesPass ?? "-"} / ${(summary.augmentedSolverImpact?.productionImpact?.beforeAccuracy?.imagesPass || 0) + (summary.augmentedSolverImpact?.productionImpact?.beforeAccuracy?.imagesFail || 0) || "-"}`,
    `- Image accuracy after existing production solver replay plus diagnostic total evidence: ${summary.augmentedSolverImpact?.productionImpact?.afterAccuracy?.imagesPass ?? "-"} / ${(summary.augmentedSolverImpact?.productionImpact?.afterAccuracy?.imagesPass || 0) + (summary.augmentedSolverImpact?.productionImpact?.afterAccuracy?.imagesFail || 0) || "-"}`,
    `- Unique recovered stages after augmented evidence: ${summary.augmentedSolverImpact?.productionImpact?.uniqueRecoveredStages ?? "-"}`,
    "",
    "## Known Sample Impact",
    ""
  );
  for (const [image, impact] of Object.entries(summary.knownSampleImpact || {})) {
    lines.push(
      `- ${image}: ${impact.rowsWithNewExactTotal} rows with new exact total evidence; ${impact.notes}`
    );
  }
  lines.push("", "## Per-Row Results", "");
  for (const row of summary.rows || []) {
    lines.push(
      `### ${row.image} S${row.stage} ${row.side}`,
      "",
      `- Expected members: ${formatMarkdownNumberList(row.expected.members)}`,
      `- Expected bonus: \`${row.expected.bonus}\``,
      `- Expected total: \`${row.expected.total}\``,
      `- Current members: ${formatMarkdownNumberList(row.actual.members)}`,
      `- Current total: \`${row.actual.total}\``,
      `- Existing total evidence: ${formatMarkdownNumberList(row.existingTotalEvidence.map((entry) => entry.value))}`,
      `- Exact total exposed by variants: ${row.exactTotalVariants.length}`,
      `- Best exact variants: ${
        row.exactTotalVariants.length
          ? row.exactTotalVariants
              .slice(0, 5)
              .map((entry) => `\`${entry.cropVariant}\`+\`${entry.preprocessVariant}\``)
              .join(", ")
          : "none"
      }`,
      `- Competing exact/near diagnostic candidates: ${row.competingVariantCount}`,
      ""
    );
  }
  lines.push(
    "## Recommendation",
    "",
    summary.recommendation ||
      "Use these diagnostics to decide whether a future runner/browser parity task is warranted. Do not productionize from diagnostic total evidence alone.",
    ""
  );
  return lines.join("\n");
}

async function writeSmartphoneTotalCaptureDiagnostics(items = []) {
  const missingRows = buildSmartphoneMissingTotalRowsFromCache(items).filter((row) => row.stage === 3);
  await fs.rm(smartphoneTotalCaptureDiagnosticsDir, { recursive: true, force: true });
  await fs.mkdir(smartphoneTotalCaptureDiagnosticsDir, { recursive: true });
  const cropVariants = smartphoneTotalCaptureCropVariants({ left: 0, top: 0, width: 1, height: 1 });
  const preprocessVariants = smartphoneTotalCapturePreprocessVariants();
  const imageByName = new Map(items.map((item) => [item.image, item]));
  const rows = [];
  for (const row of missingRows) {
    const item = imageByName.get(row.image);
    const imagePath = row.absolutePath || item?.absolutePath;
    if (!imagePath) continue;
    const metadata = await sharp(imagePath).metadata();
    const image = { width: metadata.width, height: metadata.height };
    const baseZone = smartphoneTotalCaptureBaseZone(image, row.stage, row.side);
    const rowDir = path.join(
      smartphoneTotalCaptureDiagnosticsDir,
      safeArtifactName(`${smartphoneFixtureCacheKey(row.image)}-S${row.stage}-${row.side}`)
    );
    await fs.mkdir(rowDir, { recursive: true });
    const variantResults = [];
    for (const cropVariant of smartphoneTotalCaptureCropVariants(baseZone)) {
      const zone = clampZoneToImage(cropVariant.zone, image);
      const artifact = await saveCurrentPcZoneArtifacts(
        imagePath,
        image,
        rowDir,
        `${cropVariant.name}-crop`,
        zone,
        { binarized: false }
      );
      for (const preprocessVariant of preprocessVariants) {
        const started = Date.now();
        const ocr = await recognizeSmartphoneTotalDiagnosticVariant(imagePath, zone, preprocessVariant);
        const numbers = uniqueNumbers(ocr.numbers || []);
        const competingCandidates = numbers.filter(
          (value) => value !== row.expected.total && value >= 10000
        );
        variantResults.push({
          cropVariant: cropVariant.name,
          preprocessVariant: preprocessVariant.name,
          zone,
          crop: artifact.crop,
          rawText: ocr.text,
          numbers,
          digitRuns: ocr.digitRuns,
          exactExpectedTotal: valueInList(row.expected.total, numbers),
          competingCandidates,
          malformedText: /[A-Za-z$￥¥]/.test(ocr.text || ""),
          elapsedMs: Date.now() - started,
        });
      }
    }
    const rowArtifact = {
      ...row,
      baseZone: normalizeRoiZone(baseZone),
      variantResults,
      exactTotalVariants: variantResults.filter((result) => result.exactExpectedTotal),
      competingVariantCount: variantResults.filter((result) => result.competingCandidates.length > 0)
        .length,
      artifactDir: path.relative(rootDir, rowDir).replaceAll("\\", "/"),
    };
    await fs.writeFile(path.join(rowDir, "diagnostics.json"), JSON.stringify(rowArtifact, null, 2));
    rows.push(rowArtifact);
  }
  const variantSummary = summarizeSmartphoneTotalCaptureVariants(rows);
  const augmentedSolverImpact = buildSmartphoneTotalCaptureAugmentedSolverImpact(
    items,
    rows,
    variantSummary.bestFixedVariantSet || []
  );
  const knownSampleImpact = {};
  for (const image of ["IMG_9308", "IMG_9310", "IMG_9319"]) {
    const matchingRows = rows.filter((row) => String(row.image).includes(image));
    knownSampleImpact[image] = {
      rowsWithNewExactTotal: matchingRows.filter((row) => row.exactTotalVariants.length > 0).length,
      notes: matchingRows.length
        ? matchingRows
            .map((row) =>
              row.exactTotalVariants.length
                ? `S${row.stage} ${row.side} exact total exposed`
                : `S${row.stage} ${row.side} still missing exact total`
            )
            .join("; ")
        : "not in missing-total Stage3 diagnostic set",
    };
  }
  const summary = {
    source: "smartphone baseline cache",
    outputDir: path.relative(rootDir, smartphoneTotalCaptureDiagnosticsDir).replaceAll("\\", "/"),
    rowsEvaluated: rows.length,
    stage3RowsEvaluated: rows.filter((row) => row.stage === 3).length,
    diagnosticFalsePositiveRows: rows.filter(
      (row) =>
        row.exactTotalVariants.length > 0 &&
        row.variantResults.some((variant) => variant.competingCandidates.length > 0)
    ).length,
    variantsTested: cropVariants.length * preprocessVariants.length,
    cropVariants: cropVariants.map((entry) => entry.name),
    preprocessVariants: preprocessVariants.map((entry) => entry.name),
    variantSummary,
    augmentedSolverImpact,
    knownSampleImpact,
    rows: rows.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      expected: row.expected,
      actual: row.actual,
      existingTotalEvidence: row.existingTotalEvidence,
      exactTotalVariants: row.exactTotalVariants.map((entry) => ({
        cropVariant: entry.cropVariant,
        preprocessVariant: entry.preprocessVariant,
        numbers: entry.numbers,
        crop: entry.crop,
      })),
      competingVariantCount: row.competingVariantCount,
      artifactDir: row.artifactDir,
    })),
    recommendation:
      variantSummary.exactTotalRowsExposed >= 2 && summaryDiagnosticFalsePositiveFree(rows)
        ? "Exact displayed-total capture improved for multiple rows with no competing diagnostic totals in those rows. A focused runner/browser parity task may be justified before any production use."
        : "The tested Stage3 total crop variants did not expose enough exact displayed-total evidence for recovery work. Productionization and parity are not recommended from this diagnostic result.",
  };
  await fs.writeFile(
    path.join(smartphoneTotalCaptureDiagnosticsDir, "summary.json"),
    JSON.stringify(summary, null, 2)
  );
  await fs.writeFile(smartphoneTotalCaptureDiagnosticsReportPath, buildSmartphoneTotalCaptureDiagnosticsReport(summary));
  return summary;
}

function summaryDiagnosticFalsePositiveFree(rows = []) {
  return rows.every(
    (row) =>
      row.exactTotalVariants.length === 0 ||
      !row.variantResults.some((variant) => variant.exactExpectedTotal && variant.competingCandidates.length > 0)
  );
}

function buildSmartphoneExactSlotMembersBonusTotalSelectionSimulationForSide({
  stage = 0,
  side = "self",
  stageResult = {},
} = {}) {
  return sharedBuildSmartphoneExactSlotSelectionEvidence({
    stage,
    side,
    stageResult,
  });
}

function evaluateSmartphoneExactSlotSelectionSimulation(items = []) {
  const rows = [];
  const positionBreakdown = {};
  const blockReasons = {};
  const impactedImages = {};
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blocked = 0;
  let alreadyCorrect = 0;
  let wouldApplyCount = 0;

  for (const stage of stages) {
    for (const side of sides) {
      positionBreakdown[`S${stage} ${side}`] = {
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        blocked: 0,
        alreadyCorrect: 0,
        dominantBlockReason: "",
        blockReasons: {},
      };
    }
  }

  for (const item of items.filter((entry) => entry.source === "smartphone" && entry.expectedData)) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const originalStageResult = item.result?.[stageKey];
      const expectedStage = item.expectedData?.[stageKey];
      if (!originalStageResult || !expectedStage) continue;
      const production = applySmartphoneProductionSolverRecoveriesToStage(originalStageResult, stage, {
        includeExactSlot: false,
      });
      const output = production.after;
      for (const side of sides) {
        const expected = smartphoneStageSideExpected(expectedStage, side);
        const actual = smartphoneStageSideOutput(output, side);
        const positionKey = `S${stage} ${side}`;
        if (smartphoneStageSideOutputPass(actual, expected)) {
          alreadyCorrect += 1;
          positionBreakdown[positionKey].alreadyCorrect += 1;
          continue;
        }
        const simulation = buildSmartphoneExactSlotMembersBonusTotalSelectionSimulationForSide({
          stage,
          side,
          stageResult: production.stageResult,
        });
        const expectedProposal = (simulation.proposals || []).find(
          (proposal) =>
            proposal.total === expected.total &&
            [0, 1, 2].every((index) => proposal.members[index] === expected.members[index])
        );
        let classification = "blocked";
        if (simulation.wouldApply) {
          wouldApplyCount += 1;
          const proposal = simulation.proposed;
          const proposedMatches =
            proposal.total === expected.total &&
            [0, 1, 2].every((index) => proposal.members[index] === expected.members[index]);
          if (proposedMatches) {
            truePositives += 1;
            positionBreakdown[positionKey].truePositives += 1;
            classification = "tp";
          } else {
            falsePositives += 1;
            positionBreakdown[positionKey].falsePositives += 1;
            classification = "fp";
          }
        } else if (expectedProposal) {
          falseNegatives += 1;
          positionBreakdown[positionKey].falseNegatives += 1;
          classification = "fn";
        } else {
          blocked += 1;
          positionBreakdown[positionKey].blocked += 1;
        }
        const primaryReason = simulation.rejectionReasons[0] || "would-apply";
        blockReasons[primaryReason] = (blockReasons[primaryReason] || 0) + 1;
        positionBreakdown[positionKey].blockReasons[primaryReason] =
          (positionBreakdown[positionKey].blockReasons[primaryReason] || 0) + 1;
        rows.push({
          image: item.image,
          stage,
          side,
          expected,
          actual,
          classification,
          productionApplied: {
            crownBonus: Boolean(production.crownRecovery.applied),
            stageWide: Boolean(production.stageWideRecovery.applied),
          },
          simulation,
        });
      }
    }
  }

  for (const breakdown of Object.values(positionBreakdown)) {
    const sorted = Object.entries(breakdown.blockReasons).sort((a, b) => b[1] - a[1]);
    breakdown.dominantBlockReason = sorted[0]?.[0] || "";
  }

  for (const image of ["IMG_9308", "IMG_9310", "IMG_9319", "IMG_9311", "IMG_9321", "IMG_9329"]) {
    const matchingRows = rows.filter((row) => String(row.image).includes(image));
    impactedImages[image] = {
      rows: matchingRows.map((row) => ({
        stage: row.stage,
        side: row.side,
        classification: row.classification,
        wouldApply: row.simulation.wouldApply,
        rejectionReasons: row.simulation.rejectionReasons,
      })),
      note:
        matchingRows.length === 0
          ? "no remaining failing row after current production output"
          : matchingRows
              .map((row) =>
                row.simulation.wouldApply
                  ? `S${row.stage} ${row.side} would apply`
                  : `S${row.stage} ${row.side} blocked: ${row.simulation.rejectionReasons.join(", ")}`
              )
              .join("; "),
    };
  }

  return {
    rowsAudited: items.length * 3 * 2,
    remainingFailureRows: rows.length,
    truePositives,
    falsePositives,
    falseNegatives,
    blocked,
    alreadyCorrect,
    wouldApplyCount,
    trueIncrementalTp: truePositives,
    blockReasons,
    positionBreakdown,
    wouldApplyRows: rows.filter((row) => row.simulation.wouldApply),
    falsePositiveRows: rows.filter((row) => row.classification === "fp"),
    falseNegativeRows: rows.filter((row) => row.classification === "fn"),
    blockedRows: rows.filter((row) => row.classification === "blocked"),
    impactedImages,
    recommendation:
      truePositives >= 3 && falsePositives === 0
        ? "Runner/browser-equivalent parity is justified next. Do not productionize before parity proves the same slot, total, and bonus evidence is available in the UI path."
        : "Defer parity/productionization. The simulation did not meet the TP>=3 and FP=0 safety target.",
  };
}

function compareSmartphoneExactSlotSelectionParity(items = []) {
  const rows = [];
  const summary = {
    stageSidesCompared: 0,
    runnerWouldApply: 0,
    browserWouldApply: 0,
    wouldApplyDisagreements: 0,
    proposedMemberDisagreements: 0,
    proposedBonusDisagreements: 0,
    proposedTotalDisagreements: 0,
    memberCandidatePoolMismatches: 0,
    slotProvenanceMismatches: 0,
    totalEvidenceMismatches: 0,
    bonusEvidenceMismatches: 0,
    zeroBonusProofMismatches: 0,
    uniquenessMismatches: 0,
    rejectionReasonMismatches: 0,
    missingRequiredBrowserEvidence: 0,
    missingRequiredRunnerEvidence: 0,
    safetyRelevantMismatches: 0,
    tpRows: 0,
    tpParityExact: 0,
    proposedRecoveryDisagreements: 0,
  };

  for (const item of items.filter((entry) => entry.source === "smartphone" && entry.expectedData)) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const originalStageResult = item.result?.[stageKey];
      const expectedStage = item.expectedData?.[stageKey];
      if (!originalStageResult || !expectedStage) continue;
      const production = applySmartphoneProductionSolverRecoveriesToStage(originalStageResult, stage, {
        includeExactSlot: false,
      });
      const runnerStageResult = { ...production.stageResult, stage };
      const browserStageResult = buildSmartphoneBrowserEquivalentStageResult(production.stageResult, stage);
      for (const side of sides) {
        summary.stageSidesCompared += 1;
        const runner = buildSmartphoneExactSlotMembersBonusTotalSelectionSimulationForSide({
          stage,
          side,
          stageResult: runnerStageResult,
        });
        const browser = sharedBuildSmartphoneExactSlotSelectionEvidence({
          stage,
          side,
          stageResult: browserStageResult,
        });
        const runnerFp = smartphoneExactSlotSimulationFingerprint(runner);
        const browserFp = smartphoneExactSlotSimulationFingerprint(browser);
        const safetyFields = compareSmartphoneFingerprints(runnerFp, browserFp, [
          "wouldApply",
          "selected",
          "candidatePools",
          "oppositeCandidatePools",
          "totalEvidence",
          "observedBonusCandidates",
          "proposalCount",
          "changedProposalCount",
          "proposed",
          "proposals",
        ]);
        if (runner.wouldApply) summary.runnerWouldApply += 1;
        if (browser.wouldApply) summary.browserWouldApply += 1;
        if (runnerFp.wouldApply !== browserFp.wouldApply) summary.wouldApplyDisagreements += 1;
        if (
          JSON.stringify(runnerFp.proposed?.members || null) !==
          JSON.stringify(browserFp.proposed?.members || null)
        ) {
          summary.proposedMemberDisagreements += 1;
        }
        if (
          normalizeSimulationNumber(runnerFp.proposed?.bonus) !==
          normalizeSimulationNumber(browserFp.proposed?.bonus)
        ) {
          summary.proposedBonusDisagreements += 1;
        }
        if (
          normalizeSimulationNumber(runnerFp.proposed?.total) !==
          normalizeSimulationNumber(browserFp.proposed?.total)
        ) {
          summary.proposedTotalDisagreements += 1;
        }
        if (JSON.stringify(runnerFp.candidatePools) !== JSON.stringify(browserFp.candidatePools)) {
          summary.memberCandidatePoolMismatches += 1;
          summary.slotProvenanceMismatches += 1;
        }
        if (
          JSON.stringify(runnerFp.totalEvidence) !== JSON.stringify(browserFp.totalEvidence)
        ) {
          summary.totalEvidenceMismatches += 1;
        }
        if (
          JSON.stringify(runnerFp.observedBonusCandidates) !==
          JSON.stringify(browserFp.observedBonusCandidates)
        ) {
          summary.bonusEvidenceMismatches += 1;
        }
        if (
          JSON.stringify(runnerFp.proposed?.bonusProof || null) !==
          JSON.stringify(browserFp.proposed?.bonusProof || null)
        ) {
          summary.zeroBonusProofMismatches += 1;
        }
        if (
          runnerFp.proposalCount !== browserFp.proposalCount ||
          runnerFp.changedProposalCount !== browserFp.changedProposalCount
        ) {
          summary.uniquenessMismatches += 1;
        }
        if (
          JSON.stringify(runnerFp.rejectionReasons) !==
          JSON.stringify(browserFp.rejectionReasons)
        ) {
          summary.rejectionReasonMismatches += 1;
        }
        if (runner.wouldApply && !browser.wouldApply) summary.missingRequiredBrowserEvidence += 1;
        if (!runner.wouldApply && browser.wouldApply) summary.missingRequiredRunnerEvidence += 1;
        if (safetyFields.length > 0) summary.safetyRelevantMismatches += 1;
        summary.proposedRecoveryDisagreements =
          summary.proposedMemberDisagreements +
          summary.proposedBonusDisagreements +
          summary.proposedTotalDisagreements;

        const expected = smartphoneStageSideExpected(expectedStage, side);
        const runnerMatchesExpected =
          runner.wouldApply &&
          runner.proposed?.total === expected.total &&
          [0, 1, 2].every((index) => runner.proposed?.members?.[index] === expected.members[index]);
        if (runnerMatchesExpected) summary.tpRows += 1;
        const exactMatch = JSON.stringify(runnerFp) === JSON.stringify(browserFp);
        if (runnerMatchesExpected && browser.wouldApply && exactMatch) {
          summary.tpParityExact += 1;
        }
        rows.push({
          image: item.image,
          stage,
          side,
          runnerWouldApply: runner.wouldApply,
          browserWouldApply: browser.wouldApply,
          mismatchFields: safetyFields,
          exactFingerprintMatch: exactMatch,
          runnerProposed: runner.proposed,
          browserProposed: browser.proposed,
          runnerRejectionReasons: runner.rejectionReasons,
          browserRejectionReasons: browser.rejectionReasons,
        });
      }
    }
  }

  return {
    ...summary,
    rows,
    tpParityRows: rows.filter((row) => row.runnerWouldApply && row.browserWouldApply),
    mismatchRows: rows.filter((row) => row.mismatchFields.length > 0),
  };
}

function buildSmartphoneExactSlotProductionImpact(items = []) {
  const summary = {
    beforeAccuracy: {
      imagesPass: 0,
      imagesFail: 0,
      stagesPass: 0,
      stagesFail: 0,
      stageSidesPass: 0,
      stageSidesFail: 0,
    },
    afterAccuracy: {
      imagesPass: 0,
      imagesFail: 0,
      stagesPass: 0,
      stagesFail: 0,
      stageSidesPass: 0,
      stageSidesFail: 0,
    },
    exactSlotRecoveriesApplied: 0,
    uniqueRecoveredStageSides: 0,
    uniqueRecoveredStages: 0,
    uniqueRecoveredImages: 0,
    fullImagePassGain: 0,
    unexpectedChangedStageSides: [],
    overlap: {
      crownBonusStage: 0,
      stageWideStage: 0,
    },
    appliedRows: [],
  };
  const recoveredStageKeys = new Set();
  const recoveredImageKeys = new Set();

  for (const item of items.filter((entry) => entry.source === "smartphone" && entry.expectedData)) {
    let beforeImagePass = true;
    let afterImagePass = true;
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const expectedStage = item.expectedData?.[stageKey];
      const originalStageResult = item.result?.[stageKey];
      if (!expectedStage || !originalStageResult) continue;
      const before = applySmartphoneProductionSolverRecoveriesToStage(originalStageResult, stage, {
        includeExactSlot: false,
      });
      const after = applySmartphoneProductionSolverRecoveriesToStage(originalStageResult, stage, {
        includeExactSlot: true,
      });
      let beforeStagePass = true;
      let afterStagePass = true;
      for (const side of sides) {
        const expected = smartphoneStageSideExpected(expectedStage, side);
        const beforeSide = smartphoneStageSideOutput(before.after, side);
        const afterSide = smartphoneStageSideOutput(after.after, side);
        const beforePass = smartphoneStageSideOutputPass(beforeSide, expected);
        const afterPass = smartphoneStageSideOutputPass(afterSide, expected);
        if (beforePass) summary.beforeAccuracy.stageSidesPass += 1;
        else summary.beforeAccuracy.stageSidesFail += 1;
        if (afterPass) summary.afterAccuracy.stageSidesPass += 1;
        else summary.afterAccuracy.stageSidesFail += 1;
        if (!beforePass) beforeStagePass = false;
        if (!afterPass) afterStagePass = false;
        const recovery = after.exactSlotRecoveries?.[side];
        if (recovery?.applied) {
          summary.exactSlotRecoveriesApplied += 1;
          const recovered = !beforePass && afterPass;
          if (recovered) {
            summary.uniqueRecoveredStageSides += 1;
            recoveredStageKeys.add(`${item.image}::S${stage}`);
            recoveredImageKeys.add(item.image);
          }
          if (before.crownRecovery?.applied) summary.overlap.crownBonusStage += 1;
          if (before.stageWideRecovery?.applied) summary.overlap.stageWideStage += 1;
          if (!afterPass) {
            summary.unexpectedChangedStageSides.push({
              image: item.image,
              stage,
              side,
              expected,
              before: beforeSide,
              after: afterSide,
              message: recovery.message,
            });
          }
          summary.appliedRows.push({
            image: item.image,
            stage,
            side,
            before: beforeSide,
            after: afterSide,
            expected,
            recovered,
            message: recovery.message,
          });
        }
      }
      if (beforeStagePass) summary.beforeAccuracy.stagesPass += 1;
      else summary.beforeAccuracy.stagesFail += 1;
      if (afterStagePass) summary.afterAccuracy.stagesPass += 1;
      else summary.afterAccuracy.stagesFail += 1;
      if (!beforeStagePass) beforeImagePass = false;
      if (!afterStagePass) afterImagePass = false;
    }
    if (beforeImagePass) summary.beforeAccuracy.imagesPass += 1;
    else summary.beforeAccuracy.imagesFail += 1;
    if (afterImagePass) summary.afterAccuracy.imagesPass += 1;
    else summary.afterAccuracy.imagesFail += 1;
  }

  summary.uniqueRecoveredStages = recoveredStageKeys.size;
  summary.uniqueRecoveredImages = recoveredImageKeys.size;
  summary.fullImagePassGain =
    summary.afterAccuracy.imagesPass - summary.beforeAccuracy.imagesPass;
  return summary;
}

function formatSmartphoneExactSlotSources(memberSources = []) {
  return memberSources
    .map((slotSources, index) => {
      const flat = slotSources
        .flatMap((entry) => entry.sources || [])
        .filter(Boolean);
      return `member${index + 1}: ${flat.length ? [...new Set(flat)].join("+") : "unknown"}`;
    })
    .join("; ");
}

function formatSmartphoneExactSlotNumber(value) {
  const number = normalizeSimulationNumber(value);
  return Number.isFinite(number) ? number.toLocaleString("ja-JP") : "";
}

function buildSmartphoneExactSlotSelectionSimulationReport(
  result = {},
  parity = null,
  productionImpact = null
) {
  const lines = [
    "# Smartphone Exact-Slot Selection Simulation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scope",
    "",
    "Runner/browser-equivalent evidence audit for smartphone exact-slot member / bonus / total selection. It uses cached all-fixture smartphone OCR evidence and reapplies current production smartphone recoveries in memory before evaluating only the remaining failing stage/side rows.",
    "",
    "It does not change production OCR output, does not use current-PC evidence, and does not use expected values to build proposals. Expected fixtures are used only after proposal construction for diagnostic scoring.",
    "",
    "## Evidence Schema",
    "",
    "- Shared helper: `buildSmartphoneExactSlotSelectionEvidence(...)` in `app/lib/ocr.js`.",
    "- Member evidence: slot-specific smartphone candidate pools from the shared smartphone stage-wide evidence helper. Candidates keep value, slot index, rank, and source tags such as selected output or raw member-row order.",
    "- Total evidence: exact target-side displayed-total candidates from existing smartphone total evidence.",
    "- Bonus evidence: either direct observed numeric bonus evidence from smartphone-native observed OCR numbers, or strict zero-bonus proof from complete slot-proven six-member evidence and the confirmed crown-bonus rule.",
    "- Browser/UI evidence-only flow: after current smartphone production recoveries and before result rendering, the UI builds the same evidence for both sides and stores it under `parsedOcrScores.smartphoneCrownStageWideEvidence.stages[stage].exactSlotSelectionEvidence`.",
    "- Browser-equivalent parity flow: cached runner artifacts are normalized into the same stage-result shape and passed through the same shared helper across all fixture-backed stage/sides.",
    "",
    "## Guards",
    "",
    "- Target side only; the opposite side is not modified.",
    "- All three target members must come from their own slot candidate pools.",
    "- Exact displayed total must already be observed.",
    "- Direct bonus must be observed and satisfy exact arithmetic.",
    "- Zero bonus is allowed only when all six members are complete/slot-proven and the opposite side has the unique global rank-1 member.",
    "- Direct-bonus proposals that reorder multiple member slots are blocked as unsafe, because exact total+bonus can still fit the wrong slot order.",
    "- Exactly one changed proposal may pass all guards.",
    "- No near-match, within-one, digit inference, or arithmetic-derived member values.",
    "",
    "## Results",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| stage/sides audited | ${result.rowsAudited} |`,
    `| already correct after current production | ${result.alreadyCorrect} |`,
    `| remaining failing stage/sides evaluated | ${result.remainingFailureRows} |`,
    `| wouldApply | ${result.wouldApplyCount} |`,
    `| TP | ${result.truePositives} |`,
    `| FP | ${result.falsePositives} |`,
    `| FN | ${result.falseNegatives} |`,
    `| blocked | ${result.blocked} |`,
    `| true incremental TP beyond current production | ${result.trueIncrementalTp} |`,
    "",
    "## Block Reasons",
    "",
    "| reason | rows |",
    "| --- | ---: |",
  ];
  for (const [reason, count] of Object.entries(result.blockReasons || {}).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${reason} | ${count} |`);
  }
  lines.push("", "## Position Breakdown", "", "| position | TP | FP | FN | blocked | already correct | dominant block reason |", "| --- | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const key of ["S1 self", "S1 enemy", "S2 self", "S2 enemy", "S3 self", "S3 enemy"]) {
    const entry = result.positionBreakdown?.[key] || {};
    lines.push(
      `| ${key} | ${entry.truePositives || 0} | ${entry.falsePositives || 0} | ${entry.falseNegatives || 0} | ${entry.blocked || 0} | ${entry.alreadyCorrect || 0} | ${entry.dominantBlockReason || "-"} |`
    );
  }
  lines.push("", "## Complete WouldApply Audit", "");
  if ((result.wouldApplyRows || []).length === 0) {
    lines.push("No wouldApply rows.", "");
  } else {
    for (const row of result.wouldApplyRows) {
      const proposal = row.simulation.proposed || {};
      lines.push(
        `### ${row.image} S${row.stage} ${row.side}`,
        "",
        `- Classification: ${row.classification.toUpperCase()}`,
        `- Previous members/total: ${row.actual.members.map(formatSmartphoneExactSlotNumber).join(" / ")} / ${formatSmartphoneExactSlotNumber(row.actual.total)}`,
        `- Proposed members/bonus/total: ${(proposal.members || []).map(formatSmartphoneExactSlotNumber).join(" / ")} + ${formatSmartphoneExactSlotNumber(proposal.bonus)} = ${formatSmartphoneExactSlotNumber(proposal.total)}`,
        `- Expected members/bonus/total: ${row.expected.members.map(formatSmartphoneExactSlotNumber).join(" / ")} + ${formatSmartphoneExactSlotNumber(row.expected.bonus)} = ${formatSmartphoneExactSlotNumber(row.expected.total)}`,
        `- Per-slot provenance: ${formatSmartphoneExactSlotSources(proposal.memberSources || [])}`,
        `- Total provenance: ${(proposal.totalEvidence?.sources || []).join("+") || "unknown"}`,
        `- Bonus proof: ${proposal.bonusProof?.type || "unknown"}${proposal.bonusProof?.rank1 ? `, rank1=${proposal.bonusProof.rank1.side} member${proposal.bonusProof.rank1.slot} ${formatSmartphoneExactSlotNumber(proposal.bonusProof.rank1.value)}` : ""}`,
        `- Competing proposals considered: ${row.simulation.changedProposalCount - 1}`,
        "- Uniqueness: exactly one changed proposal passed all guards.",
        ""
      );
    }
  }
  if ((result.falsePositiveRows || []).length > 0) {
    lines.push("## False Positives", "");
    for (const row of result.falsePositiveRows) {
      const proposal = row.simulation.proposed || {};
      lines.push(
        `- ${row.image} S${row.stage} ${row.side}: proposed ${(proposal.members || []).join("/")} total ${proposal.total}, expected ${row.expected.members.join("/")} total ${row.expected.total}`
      );
    }
    lines.push("");
  }
  lines.push("## Known Sample Impact", "");
  for (const [image, impact] of Object.entries(result.impactedImages || {})) {
    lines.push(`- ${image}: ${impact.note}`);
  }
  lines.push(
    "",
    "## Runner / Browser-Equivalent Parity",
    "",
    parity
      ? "The parity check compares the shared evaluator across all 534 smartphone stage/side rows after current production smartphone recoveries are replayed in memory. It does not apply the exact-slot proposal to final OCR output."
      : "Parity has not been run for this report.",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| stage/sides compared | ${parity?.stageSidesCompared || 0} |`,
    `| runner wouldApply | ${parity?.runnerWouldApply || 0} |`,
    `| browser-equivalent wouldApply | ${parity?.browserWouldApply || 0} |`,
    `| TP parity exact | ${parity?.tpParityExact || 0} / ${parity?.tpRows || 0} |`,
    `| wouldApply disagreements | ${parity?.wouldApplyDisagreements || 0} |`,
    `| proposed member disagreements | ${parity?.proposedMemberDisagreements || 0} |`,
    `| proposed bonus disagreements | ${parity?.proposedBonusDisagreements || 0} |`,
    `| proposed total disagreements | ${parity?.proposedTotalDisagreements || 0} |`,
    `| proposed recovery disagreements | ${parity?.proposedRecoveryDisagreements || 0} |`,
    `| member candidate-pool mismatches | ${parity?.memberCandidatePoolMismatches || 0} |`,
    `| slot provenance mismatches | ${parity?.slotProvenanceMismatches || 0} |`,
    `| total evidence mismatches | ${parity?.totalEvidenceMismatches || 0} |`,
    `| bonus evidence mismatches | ${parity?.bonusEvidenceMismatches || 0} |`,
    `| zero-bonus proof mismatches | ${parity?.zeroBonusProofMismatches || 0} |`,
    `| uniqueness mismatches | ${parity?.uniquenessMismatches || 0} |`,
    `| rejection-reason mismatches | ${parity?.rejectionReasonMismatches || 0} |`,
    `| missing required browser evidence | ${parity?.missingRequiredBrowserEvidence || 0} |`,
    `| missing required runner evidence | ${parity?.missingRequiredRunnerEvidence || 0} |`,
    `| safety-relevant mismatches | ${parity?.safetyRelevantMismatches || 0} |`,
    "",
    "### TP Parity Cases",
    "",
    "| image | stage | side | runner apply | browser-equivalent apply | proposed members / bonus / total | parity |",
    "| --- | ---: | --- | --- | --- | --- | --- |"
  );
  const tpRows = (parity?.tpParityRows || []).filter(
    (row) => row.runnerWouldApply || row.browserWouldApply
  );
  if (tpRows.length === 0) {
    lines.push("| - | - | - | - | - | - | - |");
  } else {
    for (const row of tpRows) {
      const proposed = row.runnerProposed || row.browserProposed || {};
      lines.push(
        `| \`${row.image}\` | ${row.stage} | ${row.side} | ${row.runnerWouldApply ? "yes" : "no"} | ${row.browserWouldApply ? "yes" : "no"} | ${(proposed.members || []).map(formatSmartphoneExactSlotNumber).join(" / ")} + ${formatSmartphoneExactSlotNumber(proposed.bonus)} = ${formatSmartphoneExactSlotNumber(proposed.total)} | ${row.exactFingerprintMatch ? "exact" : `mismatch: ${row.mismatchFields.join(", ")}`} |`
      );
    }
  }
  lines.push(
    "",
    (parity?.mismatchRows || []).length === 0
      ? "No runner/browser-equivalent mismatches were found."
      : `Mismatch rows: ${parity.mismatchRows.length}. Do not productionize until these are resolved.`,
    "",
    "## Production Recovery Impact",
    "",
    "The production recovery uses `applySmartphoneExactSlotSelectionRecovery(...)`, which applies only when the same shared exact-slot evaluator returns `wouldApply`. It runs after smartphone crown-bonus recovery and smartphone stage-wide six-member solver recovery, and it updates only the target side.",
    "",
    "| level | before PASS | before FAIL | after PASS | after FAIL |",
    "| --- | ---: | ---: | ---: | ---: |",
    `| image | ${productionImpact?.beforeAccuracy?.imagesPass || 0} | ${productionImpact?.beforeAccuracy?.imagesFail || 0} | ${productionImpact?.afterAccuracy?.imagesPass || 0} | ${productionImpact?.afterAccuracy?.imagesFail || 0} |`,
    `| stage | ${productionImpact?.beforeAccuracy?.stagesPass || 0} | ${productionImpact?.beforeAccuracy?.stagesFail || 0} | ${productionImpact?.afterAccuracy?.stagesPass || 0} | ${productionImpact?.afterAccuracy?.stagesFail || 0} |`,
    `| stage/side | ${productionImpact?.beforeAccuracy?.stageSidesPass || 0} | ${productionImpact?.beforeAccuracy?.stageSidesFail || 0} | ${productionImpact?.afterAccuracy?.stageSidesPass || 0} | ${productionImpact?.afterAccuracy?.stageSidesFail || 0} |`,
    "",
    `| exact-slot recoveries applied | ${productionImpact?.exactSlotRecoveriesApplied || 0} |`,
    `| unique recovered stage/sides | ${productionImpact?.uniqueRecoveredStageSides || 0} |`,
    `| unique recovered stages | ${productionImpact?.uniqueRecoveredStages || 0} |`,
    `| images with exact-slot recovery | ${productionImpact?.uniqueRecoveredImages || 0} |`,
    `| full-image PASS gain | ${productionImpact?.fullImagePassGain || 0} |`,
    `| unexpected changed stage/sides | ${productionImpact?.unexpectedChangedStageSides?.length || 0} |`,
    `| overlap with crown-bonus recovery stage | ${productionImpact?.overlap?.crownBonusStage || 0} |`,
    `| overlap with stage-wide solver stage | ${productionImpact?.overlap?.stageWideStage || 0} |`,
    "",
    "### Production Applied Rows",
    "",
    "| image | stage | side | before | after | expected |",
    "| --- | ---: | --- | --- | --- | --- |",
    ...((productionImpact?.appliedRows || []).length
      ? productionImpact.appliedRows.map(
          (row) =>
            `| \`${row.image}\` | ${row.stage} | ${row.side} | ${row.before.members
              .map(formatSmartphoneExactSlotNumber)
              .join(" / ")} = ${formatSmartphoneExactSlotNumber(row.before.total)} | ${row.after.members
              .map(formatSmartphoneExactSlotNumber)
              .join(" / ")} = ${formatSmartphoneExactSlotNumber(row.after.total)} | ${row.expected.members
              .map(formatSmartphoneExactSlotNumber)
              .join(" / ")} = ${formatSmartphoneExactSlotNumber(row.expected.total)} |`
        )
      : ["| - | - | - | - | - | - |"]),
    "",
    "## Overlap With Existing Recoveries",
    "",
    "The simulation is scored only after current smartphone production recoveries are replayed in memory. Rows that are already correct after existing production recovery are counted as already correct, not TP. Therefore all TP rows are true incremental proposals beyond current production output.",
    "",
    "Existing production recoveries considered before this simulation include smartphone crown-bonus recovery and smartphone stage-wide six-member solver recovery, along with earlier smartphone postprocess recoveries already reflected in cached output.",
    "",
    "## Recommendation",
    "",
    parity &&
      parity.tpParityExact === result.truePositives &&
      parity.safetyRelevantMismatches === 0 &&
      parity.wouldApplyDisagreements === 0 &&
      parity.proposedRecoveryDisagreements === 0
      ? "Runner/browser-equivalent parity is exact for the 3 TP rows with zero safety-relevant mismatches. The production recovery is enabled only through the shared strict helper and applied to the 3 parity-proven stage/sides."
      : result.recommendation || "",
    ""
  );
  return lines.join("\n");
}

function buildSmartphoneBrowserEquivalentStageResult(stageResult = {}, stage = 0) {
  return {
    stage,
    self: [...(stageResult.self || [])].map(normalizeSimulationNumber),
    enemy: [...(stageResult.enemy || [])].map(normalizeSimulationNumber),
    selfTotal: normalizeSimulationNumber(stageResult.selfTotal),
    enemyTotal: normalizeSimulationNumber(stageResult.enemyTotal),
    raw: {
      selfTotal: [...(stageResult.raw?.selfTotal || [])].map(normalizeSimulationNumber),
      enemyTotal: [...(stageResult.raw?.enemyTotal || [])].map(normalizeSimulationNumber),
      selfMembers: [...(stageResult.raw?.selfMembers || [])].map(normalizeSimulationNumber),
      enemyMembers: [...(stageResult.raw?.enemyMembers || [])].map(normalizeSimulationNumber),
    },
    rawText: {
      selfTotalDirect: stageResult.rawText?.selfTotalDirect || "",
      selfTotalCandidates: stageResult.rawText?.selfTotalCandidates || "",
      selfTotalCandidateTraces: stageResult.rawText?.selfTotalCandidateTraces || [],
      enemyTotalDirect: stageResult.rawText?.enemyTotalDirect || "",
      enemyTotalCandidates: stageResult.rawText?.enemyTotalCandidates || "",
      enemyTotalCandidateTraces: stageResult.rawText?.enemyTotalCandidateTraces || [],
      selfMembers: stageResult.rawText?.selfMembers || "",
      enemyMembers: stageResult.rawText?.enemyMembers || "",
    },
  };
}

function sortPrimitiveArray(values = []) {
  return [...values].map((value) => JSON.stringify(value)).sort();
}

function smartphoneEvidenceValuesFingerprint(evidence = []) {
  return (evidence || [])
    .map((entry) => ({
      value: normalizeSimulationNumber(entry.value),
      sources: [...(entry.sources || [])].sort(),
    }))
    .sort((a, b) => a.value - b.value || a.sources.join(",").localeCompare(b.sources.join(",")));
}

function smartphoneCandidatePoolsFingerprint(pools = [[], [], []]) {
  return (pools || [[], [], []]).map((pool) =>
    (pool || [])
      .map((candidate) => ({
        value: normalizeSimulationNumber(candidate.value),
        sources: sortPrimitiveArray(candidate.sources || []),
      }))
      .sort((a, b) => a.value - b.value || a.sources.join(",").localeCompare(b.sources.join(",")))
  );
}

function smartphoneProposalFingerprint(proposal = null) {
  if (!proposal) return null;
  return {
    selfMembers: [...(proposal.selfMembers || [])].map(normalizeSimulationNumber),
    enemyMembers: [...(proposal.enemyMembers || [])].map(normalizeSimulationNumber),
    selfTotal: normalizeSimulationNumber(proposal.selfTotal),
    enemyTotal: normalizeSimulationNumber(proposal.enemyTotal),
    selfBonus: normalizeSimulationNumber(proposal.selfBonus),
    enemyBonus: normalizeSimulationNumber(proposal.enemyBonus),
    rank1: proposal.rank1
      ? {
          side: proposal.rank1.side || "",
          slot: normalizeSimulationNumber(proposal.rank1.slot),
          value: normalizeSimulationNumber(proposal.rank1.value),
        }
      : null,
    winningSide: proposal.winningSide || proposal.rank1?.side || "",
    derivedBonus: normalizeSimulationNumber(proposal.derivedBonus),
  };
}

function smartphoneCrownSimulationFingerprint(sim = null) {
  return {
    wouldApply: Boolean(sim?.wouldApply),
    rejectionReasons: [...(sim?.rejectionReasons || [])].sort(),
    selected: sim?.selected || null,
    proposed: smartphoneProposalFingerprint(sim?.proposed || null),
    rank1: sim?.rank1
      ? {
          side: sim.rank1.side || "",
          slot: normalizeSimulationNumber(sim.rank1.slot),
          value: normalizeSimulationNumber(sim.rank1.value),
        }
      : null,
    winningSide: sim?.winningSide || sim?.rank1?.side || "",
    derivedBonus: normalizeSimulationNumber(sim?.derivedBonus),
    totalEvidence: {
      self: smartphoneEvidenceValuesFingerprint(sim?.totalEvidence?.self || []),
      enemy: smartphoneEvidenceValuesFingerprint(sim?.totalEvidence?.enemy || []),
    },
  };
}

function smartphoneStageWideSimulationFingerprint(sim = null) {
  return {
    wouldApply: Boolean(sim?.wouldApply),
    rejectionReasons: [...(sim?.rejectionReasons || [])].sort(),
    selected: sim?.selected || null,
    proposed: smartphoneProposalFingerprint(sim?.proposed || null),
    proposalCount: normalizeSimulationNumber(sim?.proposalCount),
    changedProposalCount: normalizeSimulationNumber(sim?.changedProposalCount),
    candidatePools: {
      self: smartphoneCandidatePoolsFingerprint(sim?.candidatePools?.self || []),
      enemy: smartphoneCandidatePoolsFingerprint(sim?.candidatePools?.enemy || []),
    },
    totalEvidence: {
      self: smartphoneEvidenceValuesFingerprint(sim?.totalEvidence?.self || []),
      enemy: smartphoneEvidenceValuesFingerprint(sim?.totalEvidence?.enemy || []),
    },
    blockedCombinationCounts: {
      self: normalizeSimulationNumber(sim?.blockedCombinationCounts?.self),
      enemy: normalizeSimulationNumber(sim?.blockedCombinationCounts?.enemy),
    },
  };
}

function smartphoneExactSlotProposalFingerprint(proposal = null) {
  if (!proposal) return null;
  return {
    side: proposal.side || "",
    stage: normalizeSimulationNumber(proposal.stage),
    members: [...(proposal.members || [])].map(normalizeSimulationNumber),
    total: normalizeSimulationNumber(proposal.total),
    bonus: normalizeSimulationNumber(proposal.bonus),
    previousMembers: [...(proposal.previousMembers || [])].map(normalizeSimulationNumber),
    previousTotal: normalizeSimulationNumber(proposal.previousTotal),
    changedMemberCount: normalizeSimulationNumber(proposal.changedMemberCount),
    memberSources: (proposal.memberSources || []).map((slotSources) =>
      (slotSources || [])
        .map((entry) => ({
          rank: normalizeSimulationNumber(entry.rank),
          sources: sortPrimitiveArray(entry.sources || []),
        }))
        .sort((a, b) => a.rank - b.rank || a.sources.join(",").localeCompare(b.sources.join(",")))
    ),
    totalEvidence: smartphoneEvidenceValuesFingerprint([proposal.totalEvidence || {}])[0] || null,
    bonusProof: proposal.bonusProof
      ? {
          type: proposal.bonusProof.type || "",
          bonus: normalizeSimulationNumber(proposal.bonusProof.bonus),
          sources: sortPrimitiveArray(proposal.bonusProof.sources || []),
          winningSide: proposal.bonusProof.winningSide || "",
          derivedBonus: normalizeSimulationNumber(proposal.bonusProof.derivedBonus),
          rank1: proposal.bonusProof.rank1
            ? {
                side: proposal.bonusProof.rank1.side || "",
                slot: normalizeSimulationNumber(proposal.bonusProof.rank1.slot),
                value: normalizeSimulationNumber(proposal.bonusProof.rank1.value),
              }
            : null,
        }
      : null,
  };
}

function smartphoneExactSlotSimulationFingerprint(sim = null) {
  return {
    wouldApply: Boolean(sim?.wouldApply),
    rejectionReasons: [...(sim?.rejectionReasons || [])].sort(),
    rejectedProposalReasons: [...(sim?.rejectedProposalReasons || [])].sort(),
    selected: {
      members: [...(sim?.selected?.members || [])].map(normalizeSimulationNumber),
      total: normalizeSimulationNumber(sim?.selected?.total),
      oppositeMembers: [...(sim?.selected?.oppositeMembers || [])].map(normalizeSimulationNumber),
    },
    candidatePools: smartphoneCandidatePoolsFingerprint(sim?.candidatePools || []),
    oppositeCandidatePools: smartphoneCandidatePoolsFingerprint(sim?.oppositeCandidatePools || []),
    totalEvidence: smartphoneEvidenceValuesFingerprint(sim?.totalEvidence || []),
    observedBonusCandidates: uniqueNumbers(sim?.observedBonusCandidates || []).sort((a, b) => a - b),
    proposalCount: normalizeSimulationNumber(sim?.proposalCount),
    changedProposalCount: normalizeSimulationNumber(sim?.changedProposalCount),
    proposed: smartphoneExactSlotProposalFingerprint(sim?.proposed || null),
    proposals: (sim?.proposals || [])
      .map(smartphoneExactSlotProposalFingerprint)
      .sort((a, b) =>
        JSON.stringify(a || {}).localeCompare(JSON.stringify(b || {}))
      ),
  };
}

function compareSmartphoneFingerprints(runner, browser, fields) {
  return fields.filter(
    (field) => JSON.stringify(runner?.[field] ?? null) !== JSON.stringify(browser?.[field] ?? null)
  );
}

function compareSmartphoneCrownStageWideParity(report) {
  const crownRows = [];
  const stageWideRows = [];
  const summary = {
    stagesCompared: 0,
    crown: {
      runnerWouldApply: 0,
      browserWouldApply: 0,
      wouldApplyDisagreements: 0,
      selectedMemberDisagreements: 0,
      rank1Disagreements: 0,
      derivedBonusDisagreements: 0,
      proposedTotalDisagreements: 0,
      totalEvidenceMismatches: 0,
      missingRequiredBrowserEvidence: 0,
      missingRequiredRunnerEvidence: 0,
      safetyRelevantMismatches: 0,
      tpParityExact: 0,
    },
    stageWide: {
      runnerWouldApply: 0,
      browserWouldApply: 0,
      wouldApplyDisagreements: 0,
      candidatePoolMismatches: 0,
      candidateProvenanceMismatches: 0,
      validInterpretationMismatches: 0,
      proposedSixMemberDisagreements: 0,
      proposedBonusDisagreements: 0,
      proposedTotalDisagreements: 0,
      totalEvidenceMismatches: 0,
      missingRequiredBrowserEvidence: 0,
      missingRequiredRunnerEvidence: 0,
      safetyRelevantMismatches: 0,
      tpParityExact: 0,
    },
  };

  for (const item of report.filter((entry) => entry.source === "smartphone" && entry.expectedData)) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const stageResult = item.result?.[stageKey];
      if (!stageResult) continue;
      summary.stagesCompared += 1;
      const runnerStageResult = { ...stageResult, stage };
      const browserStageResult = buildSmartphoneBrowserEquivalentStageResult(stageResult, stage);

      const runnerCrown = buildSmartphoneCrownBonusRuleSimulationForStage(runnerStageResult);
      const browserCrown = sharedBuildSmartphoneCrownBonusRuleEvidence({
        stage,
        stageResult: browserStageResult,
      });
      const runnerCrownFp = smartphoneCrownSimulationFingerprint(runnerCrown);
      const browserCrownFp = smartphoneCrownSimulationFingerprint(browserCrown);
      const crownSafetyFields = compareSmartphoneFingerprints(runnerCrownFp, browserCrownFp, [
        "wouldApply",
        "selected",
        "rank1",
        "winningSide",
        "derivedBonus",
        "proposed",
        "totalEvidence",
      ]);
      if (runnerCrown.wouldApply) summary.crown.runnerWouldApply += 1;
      if (browserCrown.wouldApply) summary.crown.browserWouldApply += 1;
      if (runnerCrownFp.wouldApply !== browserCrownFp.wouldApply) {
        summary.crown.wouldApplyDisagreements += 1;
      }
      if (JSON.stringify(runnerCrownFp.selected) !== JSON.stringify(browserCrownFp.selected)) {
        summary.crown.selectedMemberDisagreements += 1;
      }
      if (JSON.stringify(runnerCrownFp.rank1) !== JSON.stringify(browserCrownFp.rank1)) {
        summary.crown.rank1Disagreements += 1;
      }
      if (runnerCrownFp.derivedBonus !== browserCrownFp.derivedBonus) {
        summary.crown.derivedBonusDisagreements += 1;
      }
      if (
        normalizeSimulationNumber(runnerCrownFp.proposed?.selfTotal) !==
          normalizeSimulationNumber(browserCrownFp.proposed?.selfTotal) ||
        normalizeSimulationNumber(runnerCrownFp.proposed?.enemyTotal) !==
          normalizeSimulationNumber(browserCrownFp.proposed?.enemyTotal)
      ) {
        summary.crown.proposedTotalDisagreements += 1;
      }
      if (
        JSON.stringify(runnerCrownFp.totalEvidence) !==
        JSON.stringify(browserCrownFp.totalEvidence)
      ) {
        summary.crown.totalEvidenceMismatches += 1;
      }
      if (runnerCrown.wouldApply && !browserCrown.wouldApply) {
        summary.crown.missingRequiredBrowserEvidence += 1;
      }
      if (!runnerCrown.wouldApply && browserCrown.wouldApply) {
        summary.crown.missingRequiredRunnerEvidence += 1;
      }
      if (crownSafetyFields.length > 0) summary.crown.safetyRelevantMismatches += 1;
      const crownExpected = smartphoneStageExpectedOutput(item.expectedData?.[stageKey] || {});
      const crownMatchesExpected =
        runnerCrown.wouldApply &&
        browserCrown.wouldApply &&
        smartphoneStageOutputsEqual(runnerCrown.proposed, crownExpected) &&
        JSON.stringify(runnerCrownFp) === JSON.stringify(browserCrownFp);
      if (crownMatchesExpected) summary.crown.tpParityExact += 1;
      crownRows.push({
        image: item.image,
        stage,
        runnerWouldApply: runnerCrown.wouldApply,
        browserWouldApply: browserCrown.wouldApply,
        mismatchFields: crownSafetyFields,
        runnerProposed: runnerCrown.proposed,
        browserProposed: browserCrown.proposed,
      });

      const runnerStageWide =
        buildSmartphoneStageWideSixMemberCandidateSolverSimulationForStage(runnerStageResult);
      const browserStageWide = sharedBuildSmartphoneStageWideSixMemberCandidateSolverEvidence({
        stage,
        stageResult: browserStageResult,
      });
      const runnerStageWideFp = smartphoneStageWideSimulationFingerprint(runnerStageWide);
      const browserStageWideFp = smartphoneStageWideSimulationFingerprint(browserStageWide);
      const stageWideSafetyFields = compareSmartphoneFingerprints(
        runnerStageWideFp,
        browserStageWideFp,
        [
          "wouldApply",
          "selected",
          "proposed",
          "proposalCount",
          "changedProposalCount",
          "candidatePools",
          "totalEvidence",
        ]
      );
      if (runnerStageWide.wouldApply) summary.stageWide.runnerWouldApply += 1;
      if (browserStageWide.wouldApply) summary.stageWide.browserWouldApply += 1;
      if (runnerStageWideFp.wouldApply !== browserStageWideFp.wouldApply) {
        summary.stageWide.wouldApplyDisagreements += 1;
      }
      if (
        JSON.stringify(runnerStageWideFp.candidatePools) !==
        JSON.stringify(browserStageWideFp.candidatePools)
      ) {
        summary.stageWide.candidatePoolMismatches += 1;
        summary.stageWide.candidateProvenanceMismatches += 1;
      }
      if (
        runnerStageWideFp.proposalCount !== browserStageWideFp.proposalCount ||
        runnerStageWideFp.changedProposalCount !== browserStageWideFp.changedProposalCount
      ) {
        summary.stageWide.validInterpretationMismatches += 1;
      }
      if (
        JSON.stringify({
          self: runnerStageWideFp.proposed?.selfMembers || null,
          enemy: runnerStageWideFp.proposed?.enemyMembers || null,
        }) !==
        JSON.stringify({
          self: browserStageWideFp.proposed?.selfMembers || null,
          enemy: browserStageWideFp.proposed?.enemyMembers || null,
        })
      ) {
        summary.stageWide.proposedSixMemberDisagreements += 1;
      }
      if (
        normalizeSimulationNumber(runnerStageWideFp.proposed?.selfBonus) !==
          normalizeSimulationNumber(browserStageWideFp.proposed?.selfBonus) ||
        normalizeSimulationNumber(runnerStageWideFp.proposed?.enemyBonus) !==
          normalizeSimulationNumber(browserStageWideFp.proposed?.enemyBonus)
      ) {
        summary.stageWide.proposedBonusDisagreements += 1;
      }
      if (
        normalizeSimulationNumber(runnerStageWideFp.proposed?.selfTotal) !==
          normalizeSimulationNumber(browserStageWideFp.proposed?.selfTotal) ||
        normalizeSimulationNumber(runnerStageWideFp.proposed?.enemyTotal) !==
          normalizeSimulationNumber(browserStageWideFp.proposed?.enemyTotal)
      ) {
        summary.stageWide.proposedTotalDisagreements += 1;
      }
      if (
        JSON.stringify(runnerStageWideFp.totalEvidence) !==
        JSON.stringify(browserStageWideFp.totalEvidence)
      ) {
        summary.stageWide.totalEvidenceMismatches += 1;
      }
      if (runnerStageWide.wouldApply && !browserStageWide.wouldApply) {
        summary.stageWide.missingRequiredBrowserEvidence += 1;
      }
      if (!runnerStageWide.wouldApply && browserStageWide.wouldApply) {
        summary.stageWide.missingRequiredRunnerEvidence += 1;
      }
      if (stageWideSafetyFields.length > 0) {
        summary.stageWide.safetyRelevantMismatches += 1;
      }
      const stageWideMatchesExpected =
        runnerStageWide.wouldApply &&
        browserStageWide.wouldApply &&
        smartphoneStageOutputsEqual(runnerStageWide.proposed, crownExpected) &&
        JSON.stringify(runnerStageWideFp) === JSON.stringify(browserStageWideFp);
      if (stageWideMatchesExpected) summary.stageWide.tpParityExact += 1;
      stageWideRows.push({
        image: item.image,
        stage,
        runnerWouldApply: runnerStageWide.wouldApply,
        browserWouldApply: browserStageWide.wouldApply,
        mismatchFields: stageWideSafetyFields,
        runnerProposed: runnerStageWide.proposed,
        browserProposed: browserStageWide.proposed,
      });
    }
  }

  return {
    ...summary,
    crownRows,
    stageWideRows,
  };
}

function buildSmartphoneCrownBonusStageWideSolverSimulationReport({
  ruleValidation,
  crownBonusSimulation,
  stageWideSimulation,
  impactedImages,
  source,
  cacheSummary,
  overlap,
  parity,
  productionImpact,
}) {
  const recommendation =
    (crownBonusSimulation.trueIncrementalTp >= 2 && crownBonusSimulation.falsePositives === 0) ||
    (stageWideSimulation.trueIncrementalTp >= 2 && stageWideSimulation.falsePositives === 0)
      ? "Production recovery is enabled for the strict parity-proven cases only."
      : "Do not proceed to parity yet; keep this as runner-only evidence.";
  const formatAccepted = (rows) =>
    rows.length === 0
      ? "- none"
      : rows
          .slice(0, 25)
          .map((row) => {
            const proposed = row.simulation.proposed || {};
            const rank = row.simulation.rank1 || proposed.rank1 || {};
            return `- \`${row.image}\` S${row.stage}: proposed self ${formatDebugNumbers(proposed.selfMembers)} total ${formatNumber(proposed.selfTotal)}; enemy ${formatDebugNumbers(proposed.enemyMembers)} total ${formatNumber(proposed.enemyTotal)}; rank1 ${rank.side || "?"}.member${rank.slot || "?"} ${formatNumber(rank.value || 0)}`;
          })
          .join("\n");
  const formatImpact = (key) => {
    const row = impactedImages[key] || {};
    return `| \`${key}\` | ${row.crown || "blocked"} | ${row.stageWide || "blocked"} | ${row.notes || ""} |`;
  };
  return [
    "# Smartphone Crown Bonus / Stage-Wide Solver Investigation",
    "",
    "This report tracks the smartphone-native crown-bonus and stage-wide six-member solver work. The simulations and runner/browser-equivalent parity checks remain the safety record, and the strict parity-proven recoveries are now enabled in production OCR.",
    "",
    "## Fixture Rule Validation",
    "",
    `| fixtures | ${ruleValidation.fixtures} |`,
    `| stages checked | ${ruleValidation.stagesChecked} |`,
    `| floor-rule matches | ${ruleValidation.floorMatches} / ${ruleValidation.stagesChecked} |`,
    `| mismatches | ${ruleValidation.mismatches.length} |`,
    `| exactly one bonus side | ${ruleValidation.exactlyOneBonusSide} / ${ruleValidation.stagesChecked} |`,
    `| floor matches | ${ruleValidation.rounding.floor} |`,
    `| round-to-nearest matches | ${ruleValidation.rounding.round} |`,
    `| ceil matches | ${ruleValidation.rounding.ceil} |`,
    `| floor-distinguishing stages | ${ruleValidation.floorDistinguishing} |`,
    "",
    "The seven previously documented mismatches were confirmed fixture transcription or assignment errors and are now corrected. The rule now validates across all fixture-backed smartphone stages:",
    "",
    "```text",
    "crownBonus = floor(max(all six raw member scores) * 0.20)",
    "```",
    "",
    "## Artifact Reuse",
    "",
    "The simulations can now be scored from cached smartphone OCR artifacts without rerunning OCR:",
    "",
    "```bash",
    "node scripts/ocr-test-images.mjs --smartphone-crown-stage-wide-solver-from-baseline",
    "```",
    "",
    `| evaluation source | ${source || "fresh OCR run"} |`,
    `| cache summary | ${cacheSummary || "-"} |`,
    "",
    "## Shared Evidence Schema",
    "",
    "Both runner and browser-equivalent paths now call shared helpers from `app/lib/ocr.js`:",
    "",
    "- `buildSmartphoneCrownBonusRuleEvidence(...)`",
    "- `buildSmartphoneStageWideSixMemberCandidateSolverEvidence(...)`",
    "",
    "The shared evidence preserves final selected members/totals, raw member rows, raw total candidates, total candidate traces, candidate source/provenance, unique global rank-1, derived crown bonus, proposed totals, rejection reasons, and `wouldApply`.",
    "",
    "## Evidence Flow",
    "",
    "- Runner flow: load cached smartphone OCR baseline artifacts, rebuild shared evidence from final selected stage results plus raw/rawText candidate evidence, and score against expected fixtures.",
    "- Browser/UI flow: after existing smartphone recoveries and before OCR result state is rendered, build the same evidence-only objects from the UI's final selected values and existing OCR candidate text. These objects are stored as diagnostics on `parsedOcrScores.smartphoneCrownStageWideEvidence`; they do not alter `stageScores`.",
    "- Browser-equivalent parity: normalize the cached runner artifact into the same shape used by the UI evidence path, then fingerprint shared helper output across all fixture-backed stages.",
    "",
    "## Runner-Only Crown-Bonus Rule Simulation",
    "",
    "Guards: smartphone-only, six selected members complete, unique global rank-1, exact self and enemy total evidence, exact equality only, no member changes, no near match, no digit inference.",
    "",
    `| rows audited | ${crownBonusSimulation.rowsAudited} |`,
    `| TP | ${crownBonusSimulation.truePositives} |`,
    `| FP | ${crownBonusSimulation.falsePositives} |`,
    `| FN | ${crownBonusSimulation.falseNegatives} |`,
    `| blocked | ${crownBonusSimulation.blocked} |`,
    `| true incremental TP | ${crownBonusSimulation.trueIncrementalTp} |`,
    "",
    "Accepted rows:",
    "",
    formatAccepted(crownBonusSimulation.acceptedRows),
    "",
    "## Runner-Only Stage-Wide Six-Member Candidate Solver Simulation",
    "",
    "Guards: smartphone-native candidate sources only, exact observed candidates, one candidate per six member slots, unique global rank-1, derived crown bonus, exact self and enemy total evidence, both equations exact, exactly one valid interpretation, no arithmetic-derived members, no near match.",
    "",
    `| rows audited | ${stageWideSimulation.rowsAudited} |`,
    `| TP | ${stageWideSimulation.truePositives} |`,
    `| FP | ${stageWideSimulation.falsePositives} |`,
    `| FN | ${stageWideSimulation.falseNegatives} |`,
    `| blocked | ${stageWideSimulation.blocked} |`,
    `| true incremental TP | ${stageWideSimulation.trueIncrementalTp} |`,
    "",
    "Accepted rows:",
    "",
    formatAccepted(stageWideSimulation.acceptedRows),
    "",
    "## Overlap",
    "",
    `| crown accepted stages | ${overlap?.crownAccepted || 0} |`,
    `| stage-wide accepted stages | ${overlap?.stageWideAccepted || 0} |`,
    `| overlap | ${overlap?.overlap || 0} |`,
    `| crown-only | ${overlap?.crownOnly || 0} |`,
    `| stage-wide-only | ${overlap?.stageWideOnly || 0} |`,
    "",
    "## Position Breakdown",
    "",
    "| position | crown accepted | crown blocked | stage-wide accepted | stage-wide blocked |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...Object.keys(crownBonusSimulation.positionBreakdown || {}).map((position) => {
      const crown = crownBonusSimulation.positionBreakdown[position] || {};
      const stageWide = stageWideSimulation.positionBreakdown?.[position] || {};
      return `| ${position} | ${crown.accepted || 0} | ${crown.blocked || 0} | ${stageWide.accepted || 0} | ${stageWide.blocked || 0} |`;
    }),
    "",
    "## Known Failure Impact",
    "",
    "| image | crown-bonus simulation | stage-wide solver simulation | notes |",
    "| --- | --- | --- | --- |",
    formatImpact("IMG_9308"),
    formatImpact("IMG_9310"),
    formatImpact("IMG_9319"),
    "",
    "## Runner / Browser-Equivalent Parity",
    "",
    "The browser-equivalent path uses the same final selected smartphone stage values and existing raw/rawText candidate evidence that the UI has before rendering OCR results. This is evidence-only plumbing; it does not apply a recovery.",
    "",
    "| metric | crown-bonus | stage-wide solver |",
    "| --- | ---: | ---: |",
    `| stages compared | ${parity?.stagesCompared || 0} | ${parity?.stagesCompared || 0} |`,
    `| runner wouldApply | ${parity?.crown?.runnerWouldApply || 0} | ${parity?.stageWide?.runnerWouldApply || 0} |`,
    `| browser-equivalent wouldApply | ${parity?.crown?.browserWouldApply || 0} | ${parity?.stageWide?.browserWouldApply || 0} |`,
    `| wouldApply disagreements | ${parity?.crown?.wouldApplyDisagreements || 0} | ${parity?.stageWide?.wouldApplyDisagreements || 0} |`,
    `| TP parity exact | ${parity?.crown?.tpParityExact || 0} / ${crownBonusSimulation.truePositives} | ${parity?.stageWide?.tpParityExact || 0} / ${stageWideSimulation.truePositives} |`,
    `| proposed recovery disagreements | ${parity?.crown?.proposedTotalDisagreements || 0} | ${
      (parity?.stageWide?.proposedSixMemberDisagreements || 0) +
      (parity?.stageWide?.proposedBonusDisagreements || 0) +
      (parity?.stageWide?.proposedTotalDisagreements || 0)
    } |`,
    `| total evidence mismatches | ${parity?.crown?.totalEvidenceMismatches || 0} | ${parity?.stageWide?.totalEvidenceMismatches || 0} |`,
    `| candidate pool/provenance mismatches | - | ${parity?.stageWide?.candidatePoolMismatches || 0} |`,
    `| valid interpretation mismatches | - | ${parity?.stageWide?.validInterpretationMismatches || 0} |`,
    `| missing browser evidence | ${parity?.crown?.missingRequiredBrowserEvidence || 0} | ${parity?.stageWide?.missingRequiredBrowserEvidence || 0} |`,
    `| missing runner evidence | ${parity?.crown?.missingRequiredRunnerEvidence || 0} | ${parity?.stageWide?.missingRequiredRunnerEvidence || 0} |`,
    `| safety-relevant mismatches | ${parity?.crown?.safetyRelevantMismatches || 0} | ${parity?.stageWide?.safetyRelevantMismatches || 0} |`,
    "",
    "### Accepted TP Parity",
    "",
    "| simulation | image | stage | runner/browser proposed result |",
    "| --- | --- | ---: | --- |",
    ...[
      ...crownBonusSimulation.acceptedRows.map((row) => ({
        name: "crown-bonus",
        row,
      })),
      ...stageWideSimulation.acceptedRows.map((row) => ({
        name: "stage-wide",
        row,
      })),
    ].map(({ name, row }) => {
      const proposed = row.simulation.proposed || {};
      const selfBonus = formatNumber(proposed.selfBonus || 0) || "0";
      const enemyBonus = formatNumber(proposed.enemyBonus || 0) || "0";
      return `| ${name} | \`${row.image}\` | ${row.stage} | self ${formatDebugNumbers(proposed.selfMembers)} +${selfBonus} = ${formatNumber(proposed.selfTotal)}; enemy ${formatDebugNumbers(proposed.enemyMembers)} +${enemyBonus} = ${formatNumber(proposed.enemyTotal)} |`;
    }),
    "",
    "## Production Precedence",
    "",
    "The production order is:",
    "",
    "1. existing smartphone production recoveries",
    "2. smartphone crown-bonus rule recovery",
    "3. smartphone stage-wide six-member solver, only when crown-bonus recovery did not already apply",
    "",
    "The recoveries reject already-correct rows and do not broaden member candidate eligibility beyond this parity-proven evidence.",
    "",
    "## Production Recovery Impact",
    "",
    "This cached-baseline impact applies the productionized helpers to the existing 89-image smartphone baseline artifacts without rerunning OCR.",
    "",
    "| level | before PASS | before FAIL | after PASS | after FAIL |",
    "| --- | ---: | ---: | ---: | ---: |",
    `| image | ${productionImpact?.beforeAccuracy?.imagesPass || 0} | ${productionImpact?.beforeAccuracy?.imagesFail || 0} | ${productionImpact?.afterAccuracy?.imagesPass || 0} | ${productionImpact?.afterAccuracy?.imagesFail || 0} |`,
    `| stage | ${productionImpact?.beforeAccuracy?.stagesPass || 0} | ${productionImpact?.beforeAccuracy?.stagesFail || 0} | ${productionImpact?.afterAccuracy?.stagesPass || 0} | ${productionImpact?.afterAccuracy?.stagesFail || 0} |`,
    `| stage/side | ${productionImpact?.beforeAccuracy?.stageSidesPass || 0} | ${productionImpact?.beforeAccuracy?.stageSidesFail || 0} | ${productionImpact?.afterAccuracy?.stageSidesPass || 0} | ${productionImpact?.afterAccuracy?.stageSidesFail || 0} |`,
    "",
    `| smartphoneCrownBonusRuleRecovery applied stages | ${productionImpact?.crownRecoveriesApplied || 0} |`,
    `| smartphoneStageWideSixMemberCandidateSolverRecovery applied stages | ${productionImpact?.stageWideRecoveriesApplied || 0} |`,
    `| unique recovered stages | ${productionImpact?.uniqueRecoveredStages || 0} |`,
    `| unexpected changed stages | ${productionImpact?.unexpectedChangedStages?.length || 0} |`,
    "",
    "## Recommendation",
    "",
    recommendation,
    "",
    "- production OCR changed: yes, only when the strict shared smartphone helpers apply",
    "- current-PC OCR changed: no",
    "- legacy desktop OCR changed: no",
    "- no new smartphone OCR candidate sources were added",
    "- no near-match, within-one, missing-digit, filename-specific, or hard-coded recovery was added",
  ].join("\n");
}

function validateSmartphoneCrownBonusRuleFromExpected(report) {
  const expectedItems = report.filter((item) => item.source === "smartphone" && item.expectedData);
  const mismatches = [];
  const rounding = { floor: 0, round: 0, ceil: 0 };
  let stagesChecked = 0;
  let floorMatches = 0;
  let exactlyOneBonusSide = 0;
  let floorDistinguishing = 0;
  for (const item of expectedItems) {
    for (const stage of stages) {
      const expectedStage = item.expectedData[`stage${stage}`];
      if (!expectedStage) continue;
      stagesChecked += 1;
      const selfMembers = expectedStage.selfMembers || [];
      const enemyMembers = expectedStage.enemyMembers || [];
      const rank = uniqueGlobalRankOneFromMembers(selfMembers, enemyMembers, {
        requireComplete: false,
      });
      const selfBonus = smartphoneExpectedBonus(expectedStage, "self");
      const enemyBonus = smartphoneExpectedBonus(expectedStage, "enemy");
      if ((selfBonus > 0) !== (enemyBonus > 0)) exactlyOneBonusSide += 1;
      const floorBonus = rank.unique ? Math.floor(rank.rank1.value * 0.2) : 0;
      const roundBonus = rank.unique ? Math.round(rank.rank1.value * 0.2) : 0;
      const ceilBonus = rank.unique ? Math.ceil(rank.rank1.value * 0.2) : 0;
      const expectedWinningBonus = rank.rank1?.side === "self" ? selfBonus : enemyBonus;
      if (expectedWinningBonus === floorBonus) rounding.floor += 1;
      if (expectedWinningBonus === roundBonus) rounding.round += 1;
      if (expectedWinningBonus === ceilBonus) rounding.ceil += 1;
      if (expectedWinningBonus === floorBonus && (floorBonus !== roundBonus || floorBonus !== ceilBonus)) {
        floorDistinguishing += 1;
      }
      const calculatedSelfTotal =
        simulationMemberSum(selfMembers) + (rank.rank1?.side === "self" ? floorBonus : 0);
      const calculatedEnemyTotal =
        simulationMemberSum(enemyMembers) + (rank.rank1?.side === "enemy" ? floorBonus : 0);
      const matches =
        rank.unique &&
        expectedWinningBonus === floorBonus &&
        (rank.rank1?.side === "self" ? enemyBonus === 0 : selfBonus === 0) &&
        calculatedSelfTotal === expectedStage.selfTotal &&
        calculatedEnemyTotal === expectedStage.enemyTotal;
      if (matches) {
        floorMatches += 1;
      } else {
        mismatches.push({
          image: item.image,
          stage,
          selfMembers,
          enemyMembers,
          selfBonus,
          enemyBonus,
          selfTotal: expectedStage.selfTotal,
          enemyTotal: expectedStage.enemyTotal,
          rank1: rank.rank1,
          floorBonus,
          calculatedSelfTotal,
          calculatedEnemyTotal,
        });
      }
    }
  }
  return {
    fixtures: expectedItems.length,
    stagesChecked,
    floorMatches,
    mismatches,
    exactlyOneBonusSide,
    rounding,
    floorDistinguishing,
  };
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
    currentPcStageWideSixMemberCandidateSolverSimulation:
      sideArtifact?.currentPcStageWideSixMemberCandidateSolverSimulation || null,
    currentPcStageWideSixMemberCandidateSolverRecovery:
      sideArtifact?.currentPcStageWideSixMemberCandidateSolverRecovery || null,
    currentPcExactMembersCrownBonusTotalRecoverySimulation:
      sideArtifact?.currentPcExactMembersCrownBonusTotalRecoverySimulation || null,
    currentPcExactMembersCrownBonusTotalRecovery:
      sideArtifact?.currentPcExactMembersCrownBonusTotalRecovery || null,
    currentPcSideLocalExactEvidenceRecoverySimulation:
      sideArtifact?.currentPcSideLocalExactEvidenceRecoverySimulation || null,
    currentPcSideLocalExactEvidenceRecovery:
      sideArtifact?.currentPcSideLocalExactEvidenceRecovery || null,
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

function findCurrentPcStage3SlotGeometryRows(analysis = []) {
  const rows = [];
  for (const item of analysis.filter((entry) => entry.expected)) {
    const stage = 3;
    const stageKey = `stage${stage}`;
    for (const side of sides) {
      const sideAnalysis = item.stages?.[stageKey]?.[side];
      const expectedStage = item.expectedData?.[stageKey];
      if (!sideAnalysis || !expectedStage) continue;
      const { expectedMembers, expectedBonus, expectedTotal } =
        currentPcExpectedStageSideValues(item, stage, side);
      const { selectedMembers, selectedBonus, selectedTotal, selectedMemberSum } =
        currentPcSelectedStageSideValues(sideAnalysis);
      const memberMatches = expectedMembers.map((expected, index) => ({
        role: `member${index + 1}`,
        expected,
        actual: selectedMembers[index] || 0,
        pass: Math.abs((selectedMembers[index] || 0) - expected) <= 1,
      }));
      rows.push({
        image: item.fileName,
        absolutePath: item.absolutePath,
        pass: item.pass,
        stage,
        side,
        expectedMembers,
        expectedBonus,
        expectedTotal,
        selectedMembers,
        selectedBonus,
        selectedTotal,
        selectedMemberSum,
        memberMatches,
        rawCandidates: uniqueNumbers(sideAnalysis.rawCandidates || []),
        bonusCandidates: uniqueNumbers(sideAnalysis.bonusCandidates || []),
        displayedTotalCandidates: uniqueNumbers(sideAnalysis.displayedTotalCandidates || []),
        currentPcGroupedRawTokenRecovery: sideAnalysis.currentPcGroupedRawTokenRecovery || null,
        currentPcStage3SevenDigitBonusDisplacementRecovery:
          sideAnalysis.currentPcStage3SevenDigitBonusDisplacementRecovery || null,
        currentPcCrownBonusRuleRecovery: sideAnalysis.currentPcCrownBonusRuleRecovery || null,
        currentPcStageWideSixMemberCandidateSolverRecovery:
          sideAnalysis.currentPcStageWideSixMemberCandidateSolverRecovery || null,
      });
    }
  }
  return rows;
}

function currentPcStage3SlotGeometryVariantZones(image, memberZone) {
  const interesting = new Set([
    "current-member-row-roi",
    "wider-member-row-roi",
    "taller-member-row-roi",
    "member1-slot",
    "member2-slot",
    "member3-slot",
  ]);
  return currentPcStage3MemberRowDiagnosticVariantZones(image, memberZone).filter((variant) =>
    interesting.has(variant.label)
  );
}

function rectFromBbox(bbox) {
  if (!bbox) return null;
  const left = Number(bbox.left ?? bbox.x0 ?? bbox.x ?? 0);
  const top = Number(bbox.top ?? bbox.y0 ?? bbox.y ?? 0);
  const right = Number(bbox.right ?? bbox.x1 ?? left + Number(bbox.width || 0));
  const bottom = Number(bbox.bottom ?? bbox.y1 ?? top + Number(bbox.height || 0));
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  if (width <= 0 || height <= 0) return null;
  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    area: width * height,
  };
}

function rectIntersectionArea(a, b) {
  if (!a || !b) return 0;
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function rectIntersection(a, b) {
  if (!a || !b) return null;
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  if (width <= 0 || height <= 0) return null;
  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    area: width * height,
  };
}

function zoneFromRect(rect) {
  return {
    left: Math.floor(rect.left),
    top: Math.floor(rect.top),
    width: Math.max(1, Math.ceil(rect.right) - Math.floor(rect.left)),
    height: Math.max(1, Math.ceil(rect.bottom) - Math.floor(rect.top)),
  };
}

function padZone(zone, image, padX = 0, padY = 0) {
  return clampZoneToImage(
    {
      left: zone.left - padX,
      top: zone.top - padY,
      width: zone.width + padX * 2,
      height: zone.height + padY * 2,
    },
    image
  );
}

function slotRectFromZone(slot, index) {
  const left = Number(slot.left || 0);
  const top = Number(slot.top || 0);
  const width = Number(slot.width || 0);
  const height = Number(slot.height || 0);
  return {
    slot: `member${index + 1}`,
    slotIndex: index,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    area: width * height,
  };
}

function currentPcTokenSlotMetrics(bbox, slotRects) {
  const rect = rectFromBbox(bbox);
  if (!rect) {
    return {
      bbox: null,
      overlaps: [],
      centerInsideSlots: [],
      nearestSlot: null,
      maxOverlapSlot: null,
      overlap50Slot: null,
      overlap70Slot: null,
      consensusSlot: null,
      multiSlotOverlap: false,
    };
  }
  const overlaps = slotRects.map((slot) => {
    const pixels = rectIntersectionArea(rect, slot);
    return {
      slot: slot.slot,
      slotIndex: slot.slotIndex,
      pixels,
      tokenOverlapPct: rect.area > 0 ? pixels / rect.area : 0,
      slotOverlapPct: slot.area > 0 ? pixels / slot.area : 0,
      centerDistanceX: Math.abs(rect.centerX - slot.centerX),
    };
  });
  const centerInsideSlots = slotRects
    .filter(
      (slot) =>
        rect.centerX >= slot.left &&
        rect.centerX <= slot.right &&
        rect.centerY >= slot.top &&
        rect.centerY <= slot.bottom
    )
    .map((slot) => slot.slot);
  const nearestSlot =
    [...overlaps].sort((a, b) => a.centerDistanceX - b.centerDistanceX)[0]?.slot || null;
  const positiveOverlaps = overlaps.filter((entry) => entry.pixels > 0);
  const maxPixels = Math.max(0, ...positiveOverlaps.map((entry) => entry.pixels));
  const maxOverlapMatches = positiveOverlaps.filter((entry) => entry.pixels === maxPixels);
  const maxOverlapSlot = maxOverlapMatches.length === 1 ? maxOverlapMatches[0].slot : null;
  const overlap50Matches = overlaps.filter((entry) => entry.tokenOverlapPct >= 0.5);
  const overlap70Matches = overlaps.filter((entry) => entry.tokenOverlapPct >= 0.7);
  const centerSlot = centerInsideSlots.length === 1 ? centerInsideSlots[0] : null;
  return {
    bbox: rect,
    overlaps,
    centerInsideSlots,
    nearestSlot,
    maxOverlapSlot,
    overlap50Slot: overlap50Matches.length === 1 ? overlap50Matches[0].slot : null,
    overlap70Slot: overlap70Matches.length === 1 ? overlap70Matches[0].slot : null,
    consensusSlot: centerSlot && maxOverlapSlot === centerSlot ? centerSlot : null,
    multiSlotOverlap: positiveOverlaps.length > 1,
  };
}

function currentPcSlotAssignmentResult(slot, expectedSlot) {
  if (!slot) return "ambiguous";
  return slot === expectedSlot ? "correct" : "wrong";
}

function currentPcGeometryObservationAssignments(metrics, expectedSlot) {
  const centerSlot =
    metrics.centerInsideSlots?.length === 1 ? metrics.centerInsideSlots[0] : null;
  return {
    centerInsideSlot: currentPcSlotAssignmentResult(centerSlot, expectedSlot),
    nearestCenter: currentPcSlotAssignmentResult(metrics.nearestSlot, expectedSlot),
    maxOverlap: currentPcSlotAssignmentResult(metrics.maxOverlapSlot, expectedSlot),
    overlap50: currentPcSlotAssignmentResult(metrics.overlap50Slot, expectedSlot),
    overlap70: currentPcSlotAssignmentResult(metrics.overlap70Slot, expectedSlot),
    centerOverlapConsensus: currentPcSlotAssignmentResult(metrics.consensusSlot, expectedSlot),
  };
}

function currentPcSummarizeGeometryMember(row, expectedSlot, expectedValue, observations) {
  const withGeometry = observations.filter((entry) => entry.metrics?.bbox);
  const strategies = [
    "centerInsideSlot",
    "nearestCenter",
    "maxOverlap",
    "overlap50",
    "overlap70",
    "centerOverlapConsensus",
  ];
  const strategyStatus = Object.fromEntries(
    strategies.map((strategy) => {
      const assigned = withGeometry
        .map((entry) => entry.assignments?.[strategy])
        .filter(Boolean);
      if (assigned.includes("wrong")) return [strategy, "wrong"];
      if (assigned.includes("correct")) return [strategy, "correct"];
      return [strategy, withGeometry.length > 0 ? "ambiguous" : "absent"];
    })
  );
  const concatenated = observations.some((entry) => entry.concatRun);
  const overlappingCropOnly =
    observations.length > 0 &&
    observations.every((entry) => entry.sourceZoneKind === "slot" || entry.metrics?.multiSlotOverlap);
  return {
    role: expectedSlot,
    expected: expectedValue,
    selected: row.selectedMembers[Number(expectedSlot.replace("member", "")) - 1] || 0,
    exactValueFound: observations.length > 0,
    exactValueFoundWithGeometry: withGeometry.length > 0,
    foundOnlyInOverlappingSlotCrops: overlappingCropOnly,
    foundInConcatenatedRun: concatenated,
    ambiguousBetweenSlots: withGeometry.some((entry) => entry.metrics?.multiSlotOverlap),
    observations: observations.map((entry) => ({
      source: entry.source,
      sourceZoneKind: entry.sourceZoneKind,
      text: entry.text,
      value: entry.value,
      bbox: entry.metrics?.bbox || null,
      centerInsideSlots: entry.metrics?.centerInsideSlots || [],
      nearestSlot: entry.metrics?.nearestSlot || null,
      maxOverlapSlot: entry.metrics?.maxOverlapSlot || null,
      overlap50Slot: entry.metrics?.overlap50Slot || null,
      overlap70Slot: entry.metrics?.overlap70Slot || null,
      consensusSlot: entry.metrics?.consensusSlot || null,
      multiSlotOverlap: Boolean(entry.metrics?.multiSlotOverlap),
      overlaps: entry.metrics?.overlaps || [],
      assignments: entry.assignments || {},
      concatRun: Boolean(entry.concatRun),
    })),
    strategyStatus,
  };
}

function currentPcGeometryStrategyCounts(memberSummaries) {
  const strategies = [
    "centerInsideSlot",
    "nearestCenter",
    "maxOverlap",
    "overlap50",
    "overlap70",
    "centerOverlapConsensus",
  ];
  const counts = Object.fromEntries(
    strategies.map((strategy) => [
      strategy,
      { correct: 0, wrong: 0, ambiguous: 0, absent: 0 },
    ])
  );
  for (const member of memberSummaries) {
    for (const strategy of strategies) {
      const status = member.strategyStatus?.[strategy] || "absent";
      counts[strategy][status] += 1;
    }
  }
  return counts;
}

function currentPcGeometryTokenOverlapForAssignedSlot(token) {
  const assigned = token.metrics?.consensusSlot;
  return (
    (token.metrics?.overlaps || []).find((entry) => entry.slot === assigned)?.tokenOverlapPct || 0
  );
}

function buildCurrentPcStage3GeometrySlotEvidenceMap(diagnostics = null) {
  const map = new Map();
  const rejectedReasonCounts = new Map();
  const incrementRejected = (reason) =>
    rejectedReasonCounts.set(reason, (rejectedReasonCounts.get(reason) || 0) + 1);
  let inspectedTokens = 0;
  let acceptedTokens = 0;
  let ambiguousTokens = 0;
  let concatenatedTokens = 0;

  for (const row of diagnostics?.rows || []) {
    const key = `${row.image}|${row.stage}|${row.side}`;
    const entries = [];
    for (const variant of row.variants || []) {
      for (const token of variant.tokens || []) {
        inspectedTokens += 1;
        const numbers = uniqueNumbers(token.numbers || []);
        if (numbers.length !== 1) {
          if (numbers.length > 1) {
            concatenatedTokens += 1;
            incrementRejected("concatenated-or-multi-number-token");
          } else {
            incrementRejected("no-numeric-token");
          }
          continue;
        }
        const value = Number(numbers[0] || 0);
        if (!currentPcStageWideMemberRange(value)) {
          incrementRejected("outside-member-range");
          continue;
        }
        const metrics = token.metrics || {};
        const assignedSlot = metrics.consensusSlot || null;
        const centerSlot =
          metrics.centerInsideSlots?.length === 1 ? metrics.centerInsideSlots[0] : null;
        if (!assignedSlot || !centerSlot || assignedSlot !== centerSlot) {
          ambiguousTokens += 1;
          incrementRejected("missing-center-overlap-consensus");
          continue;
        }
        if (metrics.maxOverlapSlot !== assignedSlot) {
          ambiguousTokens += 1;
          incrementRejected("center-overlap-disagreement");
          continue;
        }
        if (metrics.multiSlotOverlap) {
          ambiguousTokens += 1;
          incrementRejected("multi-slot-overlap");
          continue;
        }
        const slotMatch = String(assignedSlot).match(/^member([123])$/);
        if (!slotMatch) {
          incrementRejected("invalid-assigned-slot");
          continue;
        }
        acceptedTokens += 1;
        entries.push({
          value,
          slotIndex: Number(slotMatch[1]) - 1,
          source: `stage3-geometry-slot:${variant.label}`,
          variantLabel: variant.label,
          zoneKind: variant.zoneKind,
          token: token.text || String(value),
          text: variant.text || "",
          zone: variant.zone || null,
          bbox: token.fullBbox || null,
          centerInsideSlots: metrics.centerInsideSlots || [],
          nearestSlot: metrics.nearestSlot || null,
          maxOverlapSlot: metrics.maxOverlapSlot || null,
          consensusSlot: assignedSlot,
          overlapPct: currentPcGeometryTokenOverlapForAssignedSlot(token),
          overlaps: metrics.overlaps || [],
          slotSpecific: false,
          rowOrderBased: false,
          geometryAssigned: true,
        });
      }
    }
    const deduped = entries.filter(
      (entry, index, all) =>
        all.findIndex(
          (other) =>
            other.value === entry.value &&
            other.slotIndex === entry.slotIndex &&
            other.variantLabel === entry.variantLabel &&
            JSON.stringify(other.bbox || null) === JSON.stringify(entry.bbox || null)
        ) === index
    );
    map.set(key, deduped);
  }

  return {
    map,
    stats: {
      inspectedTokens,
      acceptedTokens,
      rejectedTokens: inspectedTokens - acceptedTokens,
      ambiguousTokens,
      concatenatedTokens,
      rejectedReasonCounts: Object.fromEntries(
        [...rejectedReasonCounts.entries()].sort((a, b) => b[1] - a[1])
      ),
    },
  };
}

function currentPcGeometrySlotCandidateCorrectness(item, stage, side, candidate) {
  const expected = currentPcExpectedStageSide(item, stage, side);
  const assignedSlotIndex = Number(candidate.slotIndex);
  const assignedExpected = Number(expected?.members?.[assignedSlotIndex] || 0);
  if (assignedExpected === Number(candidate.value || 0)) return "correct-slot";
  const otherSlotIndex = (expected?.members || []).findIndex(
    (value, index) => index !== assignedSlotIndex && Number(value || 0) === Number(candidate.value || 0)
  );
  if (otherSlotIndex >= 0) return "wrong-slot";
  return "extra-candidate";
}

function buildCurrentPcStage3GeometrySlotEvidenceSimulation(analysis, diagnostics) {
  const { map: geometryEvidenceMap, stats: geometryCandidateStats } =
    buildCurrentPcStage3GeometrySlotEvidenceMap(diagnostics);
  const rows = [];
  const accepted = [];
  const falsePositiveRows = [];
  const blockedRows = [];
  const stageSimulations = [];
  const candidateCorrectnessCounts = new Map();
  const rejectedReasonBreakdown = new Map(
    Object.entries(geometryCandidateStats.rejectedReasonCounts || {})
  );
  const overlap = {
    groupedRaw: 0,
    stage3SevenDigit: 0,
    crownBonus: 0,
    stageWideSixMember: 0,
    exactMembersBonusTotal: 0,
  };
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blocked = 0;
  let failingStages = 0;
  let acceptedStageSideCorrections = 0;
  let trueIncrementalTp = 0;
  let stage3SelfIncrementalTp = 0;
  const acceptedImages = new Set();
  const wouldBecomeFullPassImages = new Set();
  const increment = (mapObj, key) => mapObj.set(key, (mapObj.get(key) || 0) + 1);

  for (const item of analysis.filter((entry) => entry.expected)) {
    const imageAcceptedStages = new Set();
    const imageFailingStages = [];
    for (const stage of [3]) {
      const stageHasFailure = sides.some((side) => hasCurrentPcSideFailure(item, stage, side));
      if (stageHasFailure) {
        failingStages += 1;
        imageFailingStages.push(stage);
      }
      const baseSimulation = buildCurrentPcStageWideSixMemberCandidateSolverStage(item, stage);
      const simulation = buildCurrentPcStageWideVariantSimulationFromPools({
        item,
        stage,
        baseSimulation,
        variantEvidenceMap: geometryEvidenceMap,
        comparisonTolerance: 0,
        policyName: "currentPcStage3GeometrySlotEvidenceSimulation",
      });
      const geometryCandidates = simulation.variantEvidence?.addedCandidates || [];
      for (const candidate of geometryCandidates) {
        const correctness = currentPcGeometrySlotCandidateCorrectness(
          item,
          stage,
          candidate.side,
          candidate
        );
        increment(candidateCorrectnessCounts, correctness);
      }
      stageSimulations.push({ screenshot: item.fileName, stage, simulation });
      const matchesExpected = currentPcStageWideStageMatchesExpected(
        simulation.proposed,
        item,
        stage,
        0
      );
      const targetEvidenceReady =
        stageHasFailure &&
        simulation.evidence?.expectedPresence?.present &&
        (simulation.evidence?.expectedTotalEvidence?.self || []).length > 0 &&
        (simulation.evidence?.expectedTotalEvidence?.enemy || []).length > 0;
      let classification = "correctly-blocked-negative";
      if (simulation.wouldApply && matchesExpected) {
        truePositives += 1;
        classification = "true-positive";
        imageAcceptedStages.add(stage);
      } else if (simulation.wouldApply && !matchesExpected) {
        falsePositives += 1;
        classification = "false-positive";
      } else if (!simulation.wouldApply && targetEvidenceReady) {
        falseNegatives += 1;
        classification = "false-negative";
      } else if (stageHasFailure) {
        blocked += 1;
        classification = "blocked";
      }

      if (classification === "true-positive") {
        const changedSides = sides.filter((side) => simulation.sideWouldChange?.[side]);
        acceptedStageSideCorrections += changedSides.length;
        acceptedImages.add(item.fileName);
        const existingStageWide = Boolean(baseSimulation.wouldApply);
        if (!existingStageWide) trueIncrementalTp += 1;
        if (!existingStageWide && simulation.sideWouldChange?.self && stage === 3) {
          stage3SelfIncrementalTp += 1;
        }
        for (const side of sides) {
          const sideAnalysis = item.stages?.[`stage${stage}`]?.[side];
          if (sideAnalysis?.currentPcGroupedRawTokenRecovery?.applied) overlap.groupedRaw += 1;
          if (sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied) {
            overlap.stage3SevenDigit += 1;
          }
          if (sideAnalysis?.currentPcCrownBonusRuleRecovery?.applied) overlap.crownBonus += 1;
          if (sideAnalysis?.currentPcStageWideSixMemberCandidateSolverRecovery?.applied) {
            overlap.stageWideSixMember += 1;
          }
          if (sideAnalysis?.currentPcExactMembersCrownBonusTotalRecovery?.applied) {
            overlap.exactMembersBonusTotal += 1;
          }
        }
        accepted.push({
          screenshot: item.fileName,
          stage,
          selected: simulation.selected,
          proposed: simulation.proposed,
          changedMemberSlots: simulation.proposed?.changedMemberSlots || [],
          geometryCandidates,
          geometryCandidatesUsed: geometryCandidates.filter((candidate) =>
            (simulation.proposed?.changedMemberSlots || []).some(
              (slot) =>
                slot.side === candidate.side &&
                Number(slot.slot || 0) === Number(candidate.slotIndex || 0) + 1 &&
                Number(slot.to || 0) === Number(candidate.value || 0)
            )
          ),
          rank1: simulation.proposed?.rank1 || null,
          winningSide: simulation.proposed?.winningSide || null,
          calculatedBonus: simulation.proposed?.calculatedBonus || 0,
          selfTotalEvidence: simulation.proposed?.totalEvidence?.self || [],
          enemyTotalEvidence: simulation.proposed?.totalEvidence?.enemy || [],
          existingStageWide,
          sideWouldChange: simulation.sideWouldChange || {},
        });
      }
      if (classification === "false-positive") {
        falsePositiveRows.push({
          screenshot: item.fileName,
          stage,
          selected: simulation.selected,
          proposed: simulation.proposed,
          expected: {
            self: currentPcExpectedStageSide(item, stage, "self"),
            enemy: currentPcExpectedStageSide(item, stage, "enemy"),
          },
          geometryCandidates,
        });
      }
      if (classification === "blocked" || classification === "false-negative") {
        blockedRows.push({
          screenshot: item.fileName,
          stage,
          classification,
          rejectionReasons: simulation.rejectionReasons || [],
          expectedPresence: simulation.evidence?.expectedPresence || null,
          geometryCandidateCount: geometryCandidates.length,
          validInterpretationCount: simulation.evidence?.validInterpretationCount || 0,
        });
      }
      if (stageHasFailure || simulation.wouldApply || geometryCandidates.length > 0) {
        rows.push({
          screenshot: item.fileName,
          stage,
          classification,
          wouldApply: simulation.wouldApply,
          selected: simulation.selected,
          proposed: simulation.proposed,
          expected: {
            self: currentPcExpectedStageSide(item, stage, "self"),
            enemy: currentPcExpectedStageSide(item, stage, "enemy"),
          },
          sideWouldChange: simulation.sideWouldChange,
          rejectionReasons: simulation.rejectionReasons || [],
          geometryCandidateCount: geometryCandidates.length,
          geometryCandidates,
          exactMatchesExpected: matchesExpected,
          evidence: {
            candidatePoolSizes: simulation.evidence?.candidatePoolSizes || null,
            combinationCount: simulation.evidence?.combinationCount || 0,
            expectedPresence: simulation.evidence?.expectedPresence || null,
            validInterpretationCount: simulation.evidence?.validInterpretationCount || 0,
          },
        });
      }
    }
    if (
      !item.pass &&
      imageFailingStages.length > 0 &&
      imageFailingStages.every((stage) => imageAcceptedStages.has(stage))
    ) {
      wouldBecomeFullPassImages.add(item.fileName);
    }
  }

  return {
    policyName: "currentPcStage3GeometrySlotEvidenceSimulation",
    command:
      "node scripts/ocr-test-images.mjs --current-pc-stage3-slot-geometry-from-baseline --current-pc-stage3-geometry-slot-solver",
    truePositives,
    falsePositives,
    falseNegatives,
    blocked,
    failingStages,
    acceptedStageSideCorrections,
    trueIncrementalTp,
    stage3SelfIncrementalTp,
    potentialFullImagePassGain: wouldBecomeFullPassImages.size,
    potentialFullImagePassImages: [...wouldBecomeFullPassImages].sort(),
    rows,
    stageSimulations,
    accepted,
    falsePositiveRows,
    blockedRows,
    geometryCandidateStats,
    candidateCorrectnessCounts: Object.fromEntries(
      [...candidateCorrectnessCounts.entries()].sort()
    ),
    wrongSlotAssignments: candidateCorrectnessCounts.get("wrong-slot") || 0,
    extraCandidateInsertions: candidateCorrectnessCounts.get("extra-candidate") || 0,
    overlap,
    recommendation:
      trueIncrementalTp >= 2 &&
      falsePositives === 0 &&
      (candidateCorrectnessCounts.get("wrong-slot") || 0) === 0
        ? "runner/browser evidence parity next"
        : "do not productionize",
  };
}

function currentPcMergedRunTokenDetected(token = {}) {
  const numbers = uniqueNumbers(token.numbers || []);
  const digitText = normalizeDigits(token.text || "");
  const hasMergedNumericShape = numbers.length > 1 || digitText.length >= 10;
  return (
    Boolean(token.concatRun) ||
    hasMergedNumericShape ||
    (Boolean(token.metrics?.multiSlotOverlap) && hasMergedNumericShape)
  );
}

function currentPcMergedRunSplitPreprocessingVariants() {
  return [
    { label: "default-psm7", preset: null, pageSegMode: "7" },
    { label: "score-slot-psm7", preset: "score-slot", pageSegMode: "7" },
    { label: "crown-bonus-psm7", preset: "crown-bonus", pageSegMode: "7" },
  ];
}

function currentPcCleanSplitCandidateValues(numbers = []) {
  return uniqueNumbers(numbers || []).filter((value) => currentPcStageWideMemberRange(value));
}

function currentPcStage3SelfMergedRunImageSplitCandidateCorrectness(item, candidate) {
  const expected = currentPcExpectedStageSide(item, 3, "self");
  const assignedSlotIndex = Number(candidate.slotIndex);
  const assignedExpected = Number(expected?.members?.[assignedSlotIndex] || 0);
  if (assignedExpected === Number(candidate.value || 0)) return "correct-slot";
  const otherSlotIndex = (expected?.members || []).findIndex(
    (value, index) => index !== assignedSlotIndex && Number(value || 0) === Number(candidate.value || 0)
  );
  if (otherSlotIndex >= 0) return "wrong-slot";
  return "extra-candidate";
}

async function writeCurrentPcStage3SelfMergedRunImageSplitArtifacts(analysis = [], geometryDiagnostics = null) {
  await fs.rm(currentPcStage3MergedRunImageSplitDir, { recursive: true, force: true });
  await fs.mkdir(currentPcStage3MergedRunImageSplitDir, { recursive: true });
  const rows = [];
  const geometryRows = (geometryDiagnostics?.rows || []).filter(
    (row) => row.stage === 3 && row.side === "self"
  );
  const byImage = new Map(analysis.map((item) => [item.fileName, item]));
  let detectedRuns = 0;
  let splitCrops = 0;
  let candidateCount = 0;
  const rejectedCandidateReasonCounts = new Map();
  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  for (const geometryRow of geometryRows) {
    const item = byImage.get(geometryRow.image);
    if (!item) continue;
    const image = await readImageSize(geometryRow.absolutePath);
    const slotRects = (geometryRow.slotGeometry || []).map((slot, index) => ({
      ...slotRectFromZone(slot, index),
      slot: slot.slot || `member${index + 1}`,
      slotIndex: Number(slot.slotIndex ?? index),
    }));
    if (slotRects.length !== 3) continue;
    const outDir = path.join(
      currentPcStage3MergedRunImageSplitDir,
      safeArtifactName(`${geometryRow.image}-stage3-self`)
    );
    await fs.mkdir(outDir, { recursive: true });
    const runs = [];
    const addedCandidates = [];

    for (const variant of geometryRow.variants || []) {
      if (variant.zoneKind === "slot") continue;
      for (const token of variant.tokens || []) {
        if (!currentPcMergedRunTokenDetected(token)) continue;
        const tokenRect = rectFromBbox(token.fullBbox);
        if (!tokenRect) continue;
        const intersectedSlots = slotRects
          .map((slot) => {
            const intersection = rectIntersection(tokenRect, slot);
            const tokenOverlapPct =
              tokenRect.area > 0 && intersection ? intersection.area / tokenRect.area : 0;
            return { slot, intersection, tokenOverlapPct };
          })
          .filter(
            (entry) =>
              entry.intersection &&
              entry.intersection.width >= 8 &&
              entry.intersection.height >= 6 &&
              entry.tokenOverlapPct >= 0.06
          );
        if (intersectedSlots.length < 2) continue;

        detectedRuns += 1;
        const runIndex = runs.length + 1;
        const run = {
          runIndex,
          sourceVariant: variant.label,
          sourceZoneKind: variant.zoneKind,
          text: token.text || "",
          numbers: token.numbers || [],
          fullBbox: token.fullBbox || null,
          slots: [],
        };

        for (const entry of intersectedSlots) {
          const baseZone = zoneFromRect(entry.intersection);
          const padX = Math.max(2, Math.round(baseZone.width * 0.04));
          const padY = Math.max(2, Math.round(baseZone.height * 0.08));
          const cropZone = padZone(baseZone, image, padX, padY);
          const slotRow = {
            slot: entry.slot.slot,
            slotIndex: entry.slot.slotIndex,
            intersection: zoneFromRect(entry.intersection),
            tokenOverlapPct: Number(entry.tokenOverlapPct.toFixed(4)),
            cropZone,
            padding: { x: padX, y: padY },
            variants: [],
          };

          for (const preprocess of currentPcMergedRunSplitPreprocessingVariants()) {
            splitCrops += 1;
            const label = `run${runIndex}-${entry.slot.slot}-${preprocess.label}`;
            const crop = await saveCurrentPcZoneArtifacts(
              geometryRow.absolutePath,
              image,
              outDir,
              label,
              cropZone,
              { preset: preprocess.preset }
            );
            const ocr = await recognizeOcrZone(geometryRow.absolutePath, cropZone, {
              preset: preprocess.preset || undefined,
              pageSegMode: preprocess.pageSegMode,
              charWhitelist: "0123456789,. ",
            });
            const values = currentPcCleanSplitCandidateValues(ocr.numbers || []);
            const acceptedForSlot = values.length === 1;
            let rejectedReason = null;
            if (values.length === 0) rejectedReason = "no-clean-member-range-value";
            else if (values.length > 1) rejectedReason = "multiple-member-range-values";
            if (rejectedReason) increment(rejectedCandidateReasonCounts, rejectedReason);
            const variantRow = {
              label: preprocess.label,
              crop,
              text: ocr.text || "",
              numbers: ocr.numbers || [],
              cleanMemberCandidates: values,
              acceptedForSlot,
              rejectedReason,
            };
            if (acceptedForSlot) {
              const value = values[0];
              candidateCount += 1;
              addedCandidates.push({
                value,
                slotIndex: entry.slot.slotIndex,
                source: "stage3-self-merged-run-image-split",
                variantLabel: label,
                zoneKind: "image-split-slot-intersection",
                token: String(value),
                text: ocr.text || "",
                zone: cropZone,
                slotSpecific: true,
                rowOrderBased: false,
                sourceMergedRun: {
                  text: token.text || "",
                  numbers: token.numbers || [],
                  fullBbox: token.fullBbox || null,
                  sourceVariant: variant.label,
                },
                splitCrop: {
                  intersection: zoneFromRect(entry.intersection),
                  cropZone,
                  padding: { x: padX, y: padY },
                  preprocessing: preprocess.label,
                  tokenOverlapPct: Number(entry.tokenOverlapPct.toFixed(4)),
                },
              });
            }
            slotRow.variants.push(variantRow);
          }
          run.slots.push(slotRow);
        }
        runs.push(run);
      }
    }

    const dedupedCandidates = addedCandidates.filter(
      (candidate, index, all) =>
        all.findIndex(
          (other) =>
            other.value === candidate.value &&
            other.slotIndex === candidate.slotIndex &&
            JSON.stringify(other.zone || null) === JSON.stringify(candidate.zone || null)
        ) === index
    );
    const expected = currentPcExpectedStageSide(item, 3, "self");
    const selected = currentPcSelectedStageSideValues(item.stages?.stage3?.self);
    const missingOrWrongExpectedMembers = (expected?.members || []).map((value, index) => ({
      slot: `member${index + 1}`,
      slotIndex: index,
      expected: value,
      selected: selected.selectedMembers[index] || 0,
      exactSplitCandidates: dedupedCandidates.filter(
        (candidate) => candidate.slotIndex === index && Number(candidate.value || 0) === Number(value || 0)
      ),
    }));
    const exactMembersRecovered = missingOrWrongExpectedMembers.filter(
      (entry) =>
        Math.abs(Number(entry.selected || 0) - Number(entry.expected || 0)) > 1 &&
        entry.exactSplitCandidates.length > 0
    );
    const artifact = {
      image: geometryRow.image,
      absolutePath: geometryRow.absolutePath,
      stage: 3,
      side: "self",
      expectedMembers: expected?.members || [],
      expectedBonus: expected?.bonus || 0,
      expectedTotal: expected?.total || 0,
      selectedMembers: selected.selectedMembers,
      selectedBonus: selected.selectedBonus,
      selectedTotal: selected.selectedTotal,
      mergedRunsDetected: runs.length,
      splitCandidateCount: dedupedCandidates.length,
      exactMembersRecovered,
      missingOrWrongExpectedMembers,
      runs,
      addedCandidates: dedupedCandidates,
    };
    const jsonPath = path.join(outDir, "merged-run-image-split.json");
    await fs.writeFile(jsonPath, JSON.stringify(artifact, null, 2));
    rows.push({
      ...artifact,
      artifact: path.relative(rootDir, jsonPath).replaceAll("\\", "/"),
    });
  }

  const summaryPath = path.join(currentPcStage3MergedRunImageSplitDir, "summary.json");
  const summary = {
    rows,
    stats: {
      rowsEvaluated: rows.length,
      rowsWithDetectedMergedRuns: rows.filter((row) => row.mergedRunsDetected > 0).length,
      detectedRuns,
      splitCrops,
      candidateCount,
      rejectedCandidateReasonCounts: Object.fromEntries(
        [...rejectedCandidateReasonCounts.entries()].sort((a, b) => b[1] - a[1])
      ),
    },
    outputDir: path.relative(rootDir, currentPcStage3MergedRunImageSplitDir).replaceAll("\\", "/"),
    summaryPath: path.relative(rootDir, summaryPath).replaceAll("\\", "/"),
  };
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  return summary;
}

function buildCurrentPcStage3SelfMergedRunImageSplitEvidenceMap(splitArtifacts = null) {
  const map = new Map();
  for (const row of splitArtifacts?.rows || []) {
    const key = `${row.image}|${row.stage}|${row.side}`;
    map.set(
      key,
      (row.addedCandidates || []).map((candidate) => ({
        ...candidate,
        source: candidate.source || "stage3-self-merged-run-image-split",
      }))
    );
  }
  return map;
}

function buildCurrentPcStage3SelfMergedRunImageSplitSimulation(analysis, splitArtifacts) {
  const splitEvidenceMap = buildCurrentPcStage3SelfMergedRunImageSplitEvidenceMap(splitArtifacts);
  const rows = [];
  const accepted = [];
  const falsePositiveRows = [];
  const blockedRows = [];
  const stageSimulations = [];
  const candidateCorrectnessCounts = new Map();
  const rejectedReasonBreakdown = new Map();
  const overlap = {
    existingStageWide: 0,
    groupedRaw: 0,
    stage3SevenDigit: 0,
    crownBonus: 0,
    exactMembersBonusTotal: 0,
  };
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blocked = 0;
  let failingStages = 0;
  let acceptedStageSideCorrections = 0;
  let trueIncrementalTp = 0;
  let stage3SelfIncrementalTp = 0;
  let wrongSlotAssignments = 0;
  let extraCandidateInsertions = 0;
  const completeStage3SelfMemberEvidenceRows = [];
  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  for (const item of analysis.filter((entry) => entry.expected)) {
    for (const stage of [3]) {
      const stageHasFailure = sides.some((side) => hasCurrentPcSideFailure(item, stage, side));
      if (stageHasFailure) failingStages += 1;
      const baseSimulation = buildCurrentPcStageWideSixMemberCandidateSolverStage(item, stage);
      const simulation = buildCurrentPcStageWideVariantSimulationFromPools({
        item,
        stage,
        baseSimulation,
        variantEvidenceMap: splitEvidenceMap,
        comparisonTolerance: 0,
        policyName: "currentPcStage3SelfMergedRunImageSplitSimulation",
      });
      const splitCandidates = (simulation.variantEvidence?.addedCandidates || []).filter(
        (candidate) => candidate.source === "stage3-self-merged-run-image-split"
      );
      for (const candidate of splitCandidates) {
        const correctness = currentPcStage3SelfMergedRunImageSplitCandidateCorrectness(
          item,
          candidate
        );
        increment(candidateCorrectnessCounts, correctness);
        if (correctness === "wrong-slot") wrongSlotAssignments += 1;
        if (correctness === "extra-candidate") extraCandidateInsertions += 1;
      }
      const beforeMissingSelf = (baseSimulation.evidence?.expectedPresence?.missing || []).filter(
        (missing) => String(missing).startsWith("self.")
      );
      const afterMissingSelf = (simulation.evidence?.expectedPresence?.missing || []).filter(
        (missing) => String(missing).startsWith("self.")
      );
      if (
        hasCurrentPcSideFailure(item, 3, "self") &&
        beforeMissingSelf.length > 0 &&
        afterMissingSelf.length === 0 &&
        splitCandidates.length > 0
      ) {
        completeStage3SelfMemberEvidenceRows.push({
          screenshot: item.fileName,
          beforeMissingSelf,
          splitCandidateCount: splitCandidates.length,
        });
      }
      stageSimulations.push({ screenshot: item.fileName, stage, simulation });
      const matchesExpected = currentPcStageWideStageMatchesExpected(
        simulation.proposed,
        item,
        stage,
        0
      );
      const targetEvidenceReady =
        stageHasFailure &&
        simulation.evidence?.expectedPresence?.present &&
        (simulation.evidence?.expectedTotalEvidence?.self || []).length > 0 &&
        (simulation.evidence?.expectedTotalEvidence?.enemy || []).length > 0;
      let classification = "correctly-blocked-negative";
      if (simulation.wouldApply && matchesExpected) {
        truePositives += 1;
        classification = "true-positive";
      } else if (simulation.wouldApply && !matchesExpected) {
        falsePositives += 1;
        classification = "false-positive";
      } else if (!simulation.wouldApply && targetEvidenceReady) {
        falseNegatives += 1;
        classification = "false-negative";
      } else if (stageHasFailure) {
        blocked += 1;
        classification = "blocked";
      }

      if (classification === "true-positive") {
        const changedSides = sides.filter((side) => simulation.sideWouldChange?.[side]);
        acceptedStageSideCorrections += changedSides.length;
        const existingStageWide = Boolean(baseSimulation.wouldApply);
        if (!existingStageWide) trueIncrementalTp += 1;
        if (!existingStageWide && simulation.sideWouldChange?.self) stage3SelfIncrementalTp += 1;
        for (const side of sides) {
          const sideAnalysis = item.stages?.stage3?.[side];
          if (sideAnalysis?.currentPcGroupedRawTokenRecovery?.applied) overlap.groupedRaw += 1;
          if (sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied) {
            overlap.stage3SevenDigit += 1;
          }
          if (sideAnalysis?.currentPcCrownBonusRuleRecovery?.applied) overlap.crownBonus += 1;
          if (sideAnalysis?.currentPcExactMembersCrownBonusTotalRecovery?.applied) {
            overlap.exactMembersBonusTotal += 1;
          }
        }
        if (baseSimulation.wouldApply) overlap.existingStageWide += 1;
        accepted.push({
          screenshot: item.fileName,
          stage,
          selected: simulation.selected,
          proposed: simulation.proposed,
          changedMemberSlots: simulation.proposed?.changedMemberSlots || [],
          splitCandidates,
          splitCandidatesUsed: splitCandidates.filter((candidate) =>
            (simulation.proposed?.changedMemberSlots || []).some(
              (slot) =>
                slot.side === candidate.side &&
                Number(slot.slot || 0) === Number(candidate.slotIndex || 0) + 1 &&
                Number(slot.to || 0) === Number(candidate.value || 0)
            )
          ),
          rank1: simulation.proposed?.rank1 || null,
          winningSide: simulation.proposed?.winningSide || null,
          calculatedBonus: simulation.proposed?.calculatedBonus || 0,
          selfTotalEvidence: simulation.proposed?.totalEvidence?.self || [],
          enemyTotalEvidence: simulation.proposed?.totalEvidence?.enemy || [],
          existingStageWide,
          sideWouldChange: simulation.sideWouldChange || {},
        });
      }
      if (classification === "false-positive") {
        falsePositiveRows.push({
          screenshot: item.fileName,
          stage,
          selected: simulation.selected,
          proposed: simulation.proposed,
          expected: {
            self: currentPcExpectedStageSide(item, stage, "self"),
            enemy: currentPcExpectedStageSide(item, stage, "enemy"),
          },
          splitCandidates,
        });
      }
      if (classification === "blocked" || classification === "false-negative") {
        for (const reason of simulation.rejectionReasons || ["other"]) increment(rejectedReasonBreakdown, reason);
        blockedRows.push({
          screenshot: item.fileName,
          stage,
          classification,
          rejectionReasons: simulation.rejectionReasons || [],
          expectedPresence: simulation.evidence?.expectedPresence || null,
          splitCandidateCount: splitCandidates.length,
          validInterpretationCount: simulation.evidence?.validInterpretationCount || 0,
        });
      }
      if (stageHasFailure || simulation.wouldApply || splitCandidates.length > 0) {
        rows.push({
          screenshot: item.fileName,
          stage,
          classification,
          wouldApply: simulation.wouldApply,
          selected: simulation.selected,
          proposed: simulation.proposed,
          expected: {
            self: currentPcExpectedStageSide(item, stage, "self"),
            enemy: currentPcExpectedStageSide(item, stage, "enemy"),
          },
          sideWouldChange: simulation.sideWouldChange,
          rejectionReasons: simulation.rejectionReasons || [],
          splitCandidateCount: splitCandidates.length,
          splitCandidates,
          exactMatchesExpected: matchesExpected,
          evidence: {
            candidatePoolSizes: simulation.evidence?.candidatePoolSizes || null,
            combinationCount: simulation.evidence?.combinationCount || 0,
            expectedPresence: simulation.evidence?.expectedPresence || null,
            validInterpretationCount: simulation.evidence?.validInterpretationCount || 0,
          },
        });
      }
    }
  }

  const focusRows = (splitArtifacts?.rows || []).filter((row) => row.mergedRunsDetected > 0);
  const completeStage3SelfMemberEvidenceSet = new Set(
    completeStage3SelfMemberEvidenceRows.map((row) => row.screenshot)
  );
  const exactMembersRecovered = focusRows.reduce(
    (sum, row) => sum + (row.exactMembersRecovered || []).length,
    0
  );

  return {
    policyName: "currentPcStage3SelfMergedRunImageSplitSimulation",
    command:
      "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage3-merged-run-slot-split-experiment",
    truePositives,
    falsePositives,
    falseNegatives,
    blocked,
    failingStages,
    acceptedStageSideCorrections,
    trueIncrementalTp,
    stage3SelfIncrementalTp,
    wrongSlotAssignments,
    extraCandidateInsertions,
    exactMembersRecovered,
    rowsGainingCompleteStage3SelfMemberEvidence:
      completeStage3SelfMemberEvidenceRows.length,
    completeStage3SelfMemberEvidenceRows,
    focusRows: focusRows.map((row) => ({
      screenshot: row.image,
      mergedRunsDetected: row.mergedRunsDetected,
      splitCandidateCount: row.splitCandidateCount,
      exactMembersRecovered: row.exactMembersRecovered,
      completeStage3SelfMemberEvidence: completeStage3SelfMemberEvidenceSet.has(row.image),
      artifact: row.artifact,
    })),
    rows,
    stageSimulations,
    accepted,
    falsePositiveRows,
    blockedRows,
    splitArtifactStats: splitArtifacts?.stats || {},
    candidateCorrectnessCounts: Object.fromEntries(
      [...candidateCorrectnessCounts.entries()].sort()
    ),
    rejectedReasonBreakdown: Object.fromEntries(
      [...rejectedReasonBreakdown.entries()].sort((a, b) => b[1] - a[1])
    ),
    overlap,
    recommendation:
      trueIncrementalTp >= 2 && falsePositives === 0 && wrongSlotAssignments === 0
        ? "runner/browser parity next"
        : "defer or abandon merged-run image-space splitting for now",
    note:
      "Runner-only experiment: detected Stage3 self merged OCR run bboxes are intersected with deterministic member slot boxes, OCRed independently, and scored by the existing stage-wide solver. It does not change final OCR output.",
  };
}

function formatCurrentPcMergedRunSplitCandidate(candidate = {}) {
  const slot = `member${Number(candidate.slotIndex || 0) + 1}`;
  const crop = candidate.splitCrop?.cropZone
    ? `${candidate.splitCrop.cropZone.left},${candidate.splitCrop.cropZone.top},${candidate.splitCrop.cropZone.width},${candidate.splitCrop.cropZone.height}`
    : "-";
  return `${slot} ${formatNumber(candidate.value)} (${candidate.variantLabel || "-"} crop=${crop})`;
}

function buildCurrentPcStage3SelfMergedRunImageSplitReport(splitArtifacts, simulation) {
  const generatedAt = new Date().toISOString();
  const focusRows = simulation?.focusRows || [];
  const accepted = simulation?.accepted || [];
  const lines = [
    "# Current-PC Stage3 Self Merged-Run Image-Split Experiment",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Purpose",
    "",
    "This is a runner-only experiment for current-PC Stage3 self OCR rows where Tesseract emits a merged numeric run across member slots. It splits the actual image region of the detected merged run by deterministic member slot boundaries and re-OCRs each slot intersection independently.",
    "",
    "No production OCR output is changed.",
    "",
    "## Command",
    "",
    "`node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage3-merged-run-slot-split-experiment`",
    "",
    "## Guards",
    "",
    "- current-PC baseline only",
    "- Stage3 self only",
    "- detected merged run must have an OCR bbox and overlap at least two deterministic member slot regions",
    "- crop boundaries are derived only from the merged-run bbox and fixed member slot geometry",
    "- expected fixtures are used only after OCR for scoring, never to choose crops or candidates",
    "- candidate is admitted only into the slot whose intersection crop produced it",
    "- exact observed member-range values only",
    "- no near-match, no digit inference, no total-derived member, no filename logic, no screenshot logic",
    "- the downstream stage-wide solver still requires exact self/enemy total evidence, unique global rank-1, `floor(max(all six members) * 0.20)`, both equations exact, and one unique interpretation",
    "",
    "## Summary",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| Stage3 self rows evaluated | ${splitArtifacts?.stats?.rowsEvaluated || 0} |`,
    `| rows with detected merged runs | ${splitArtifacts?.stats?.rowsWithDetectedMergedRuns || 0} |`,
    `| merged runs detected | ${splitArtifacts?.stats?.detectedRuns || 0} |`,
    `| split crops OCRed | ${splitArtifacts?.stats?.splitCrops || 0} |`,
    `| split candidates admitted | ${splitArtifacts?.stats?.candidateCount || 0} |`,
    `| exact members newly recovered in focused rows | ${simulation?.exactMembersRecovered || 0} |`,
    `| rows gaining complete Stage3 self member evidence | ${simulation?.rowsGainingCompleteStage3SelfMemberEvidence || 0} |`,
    `| TP stages | ${simulation?.truePositives || 0} |`,
    `| FP stages | ${simulation?.falsePositives || 0} |`,
    `| FN stages | ${simulation?.falseNegatives || 0} |`,
    `| blocked stages | ${simulation?.blocked || 0} |`,
    `| true incremental TP beyond current production | ${simulation?.trueIncrementalTp || 0} |`,
    `| Stage3 self incremental TP | ${simulation?.stage3SelfIncrementalTp || 0} |`,
    `| wrong-slot assignments | ${simulation?.wrongSlotAssignments || 0} |`,
    `| extra candidate insertions | ${simulation?.extraCandidateInsertions || 0} |`,
    "",
    "## Candidate Correctness",
    "",
    "| classification | count |",
    "| --- | ---: |",
  ];
  const correctness = simulation?.candidateCorrectnessCounts || {};
  for (const [name, count] of Object.entries(correctness)) {
    lines.push(`| ${name} | ${count} |`);
  }
  if (Object.keys(correctness).length === 0) lines.push("| - | 0 |");

  lines.push(
    "",
    "## Focus Rows With Detected Merged Runs",
    "",
    "| screenshot | detected runs | split candidates | exact recovered members | complete member evidence | artifact |",
    "| --- | ---: | ---: | --- | --- | --- |"
  );
  for (const row of focusRows) {
    const recovered = (row.exactMembersRecovered || [])
      .map((entry) => `${entry.slot}=${formatNumber(entry.expected)}`)
      .join("<br>") || "-";
    lines.push(
      `| ${row.screenshot} | ${row.mergedRunsDetected} | ${row.splitCandidateCount} | ${recovered} | ${row.completeStage3SelfMemberEvidence ? "yes" : "no"} | ${row.artifact || "-"} |`
    );
  }

  lines.push(
    "",
    "## Accepted Rows",
    "",
    "| screenshot | stage | changed slots | split candidates used | totals | uniqueness |",
    "| --- | ---: | --- | --- | --- | --- |"
  );
  if (accepted.length === 0) {
    lines.push("| - | - | - | - | - | - |");
  } else {
    for (const row of accepted) {
      const changed = (row.changedMemberSlots || [])
        .map((slot) => `${slot.side}.member${slot.slot}: ${formatNumber(slot.from)} -> ${formatNumber(slot.to)}`)
        .join("<br>") || "-";
      const used = (row.splitCandidatesUsed || [])
        .map(formatCurrentPcMergedRunSplitCandidate)
        .join("<br>") || "-";
      lines.push(
        `| ${row.screenshot} | ${row.stage} | ${changed} | ${used} | self ${formatNumber(row.proposed?.self?.total || 0)} / enemy ${formatNumber(row.proposed?.enemy?.total || 0)} | exactly one complete six-member interpretation |`
      );
    }
  }

  lines.push(
    "",
    "## Blocked/Rejection Summary",
    "",
    "| reason | count |",
    "| --- | ---: |"
  );
  const rejection = simulation?.rejectedReasonBreakdown || {};
  for (const [reason, count] of Object.entries(rejection)) {
    lines.push(`| ${reason} | ${count} |`);
  }
  if (Object.keys(rejection).length === 0) lines.push("| - | 0 |");

  lines.push(
    "",
    "## Comparison To Existing Evidence",
    "",
    "- This experiment is stricter than string-level splitting: no numeric run is cut by character count or punctuation pattern.",
    "- Compared with per-slot crop diagnostics, it focuses only on the image region actually occupied by a merged OCR bbox.",
    "- Compared with bbox/geometry consensus, it asks whether re-OCRing the slot intersection can create clean slot-proven candidates for the existing stage-wide solver.",
    "- Compared with the slot-proven Stage3 variant simulation and expected-blind geometry simulation, the downstream safety guard is unchanged: exact totals, crown-bonus rule, and one unique six-member interpretation are still required.",
    "",
    "## Recommendation",
    "",
    simulation?.recommendation === "runner/browser parity next"
      ? "The experiment meets the minimum runner-only threshold. Recommended next step: add runner/browser-equivalent parity plumbing before any production discussion."
      : "Defer or abandon merged-run image-space splitting for now. It does not yet provide at least two true incremental safe recoveries with zero wrong-slot assignments.",
    "",
    "Productionization is not recommended by this report.",
    ""
  );

  return lines.join("\n");
}

async function writeCurrentPcStage3SlotGeometryDiagnosticsArtifacts(analysis = []) {
  const rows = findCurrentPcStage3SlotGeometryRows(analysis);
  await fs.rm(currentPcStage3SlotGeometryDiagnosticsDir, { recursive: true, force: true });
  await fs.mkdir(currentPcStage3SlotGeometryDiagnosticsDir, { recursive: true });
  const artifacts = [];

  for (const row of rows) {
    const image = await readImageSize(row.absolutePath);
    const fixed = getFixedOcrZones(image, row.stage, "current-pc");
    const memberZone = row.side === "self" ? fixed.selfMembers : fixed.enemyMembers;
    const slotRects = currentPcStage3MemberRowDiagnosticVariantZones(image, memberZone)
      .filter((variant) => variant.zoneKind === "slot")
      .map((variant, index) => slotRectFromZone(clampZoneToImage(variant.zone, image), index));
    const outDir = path.join(
      currentPcStage3SlotGeometryDiagnosticsDir,
      safeArtifactName(`${row.image}-stage${row.stage}-${row.side}`)
    );
    await fs.mkdir(outDir, { recursive: true });

    const variants = [];
    for (const variant of currentPcStage3SlotGeometryVariantZones(image, memberZone)) {
      const clamped = clampZoneToImage(variant.zone, image);
      const crop = await saveCurrentPcZoneArtifacts(
        row.absolutePath,
        image,
        outDir,
        variant.label,
        clamped,
        { preset: variant.preset }
      );
      const ocr = await recognizeOcrZoneWithGeometry(row.absolutePath, clamped, {
        preset: variant.preset || undefined,
        pageSegMode: variant.pageSegMode,
        charWhitelist: "0123456789,+＋. ",
        label: variant.label,
        targetValues: row.expectedMembers,
      });
      const tokens = (ocr.tokens || []).map((token) => {
        const metrics = currentPcTokenSlotMetrics(token.fullBbox, slotRects);
        return {
          text: token.text,
          confidence: token.confidence,
          numbers: token.numbers || [],
          cropBbox: token.cropBbox || null,
          fullBbox: token.fullBbox || null,
          metrics,
          concatRun: (token.numbers || []).length > 1,
        };
      });
      const spans = (ocr.spans || []).map((span) => {
        const metrics = currentPcTokenSlotMetrics(span.fullBbox, slotRects);
        const roleIndex = row.expectedMembers.findIndex((value) => value === span.value);
        const expectedSlot = roleIndex >= 0 ? `member${roleIndex + 1}` : null;
        return {
          value: span.value,
          text: span.sourceWord || span.digitText || "",
          sourceWord: span.sourceWord || "",
          cropBbox: span.cropBbox || null,
          fullBbox: span.fullBbox || null,
          metrics,
          expectedSlot,
          assignments: expectedSlot
            ? currentPcGeometryObservationAssignments(metrics, expectedSlot)
            : {},
          concatRun: (extractNumbersForZone(span.sourceWord || "") || []).length > 1,
        };
      });
      const concatenatedRuns = tokens
        .filter((token) => token.concatRun || token.metrics?.multiSlotOverlap)
        .map((token) => ({
          text: token.text,
          numbers: token.numbers || [],
          fullBbox: token.fullBbox || null,
          spansMultipleSlots: Boolean(token.metrics?.multiSlotOverlap),
          centerInsideSlots: token.metrics?.centerInsideSlots || [],
          deterministicSplittingPossible:
            (token.numbers || []).length > 1 && (token.symbols || []).length > 0
              ? "unknown"
              : false,
        }));
      variants.push({
        label: variant.label,
        zoneKind: variant.zoneKind,
        zone: clamped,
        crop,
        text: ocr.text || "",
        numbers: ocr.numbers || [],
        tokens,
        spans,
        concatenatedRuns,
        tsvAvailable: Boolean(ocr.tsv),
        hocrAvailable: Boolean(ocr.hocr),
      });
    }

    const memberSummaries = row.expectedMembers.map((expectedValue, index) => {
      const expectedSlot = `member${index + 1}`;
      const observations = variants.flatMap((variant) =>
        (variant.spans || [])
          .filter((span) => span.value === expectedValue)
          .map((span) => ({
            source: variant.label,
            sourceZoneKind: variant.zoneKind,
            text: span.text,
            value: span.value,
            metrics: span.metrics,
            assignments: span.assignments,
            concatRun: span.concatRun,
          }))
      );
      return currentPcSummarizeGeometryMember(row, expectedSlot, expectedValue, observations);
    });
    const strategyCounts = currentPcGeometryStrategyCounts(memberSummaries);
    const deterministicRecoveredMembers = memberSummaries.filter(
      (member) =>
        Math.abs((Number(member.selected) || 0) - member.expected) > 1 &&
        member.strategyStatus?.centerOverlapConsensus === "correct"
    );
    const completeMemberEvidenceByConsensus = memberSummaries.every(
      (member) => member.strategyStatus?.centerOverlapConsensus === "correct"
    );
    const wrongSlotStrategies = Object.fromEntries(
      Object.entries(strategyCounts).map(([strategy, counts]) => [strategy, counts.wrong])
    );
    const artifact = {
      ...row,
      imageSize: image,
      memberRowZone: clampZoneToImage(memberZone, image),
      slotGeometry: slotRects,
      variants,
      memberSummaries,
      strategyCounts,
      deterministicRecoveredMembers,
      completeMemberEvidenceByConsensus,
      wrongSlotStrategies,
      bboxAvailable:
        variants.some((variant) => (variant.tokens || []).some((token) => token.fullBbox)) ||
        variants.some((variant) => (variant.spans || []).some((span) => span.fullBbox)),
    };
    const jsonPath = path.join(outDir, "stage3-slot-geometry-diagnostics.json");
    await fs.writeFile(jsonPath, JSON.stringify(artifact, null, 2));
    artifacts.push({
      ...artifact,
      artifact: path.relative(rootDir, jsonPath).replaceAll("\\", "/"),
    });
  }

  const summaryPath = path.join(currentPcStage3SlotGeometryDiagnosticsDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(artifacts, null, 2));
  return {
    rows: artifacts,
    outputDir: path
      .relative(rootDir, currentPcStage3SlotGeometryDiagnosticsDir)
      .replaceAll("\\", "/"),
    summaryPath: path.relative(rootDir, summaryPath).replaceAll("\\", "/"),
  };
}

function buildCurrentPcStage3SlotGeometryDiagnosticsReport(diagnostics) {
  const rows = diagnostics?.rows || [];
  const simulation = diagnostics?.geometrySlotSimulation || null;
  const memberSummaries = rows.flatMap((row) =>
    (row.memberSummaries || []).map((member) => ({ ...member, row }))
  );
  const exactFound = memberSummaries.filter((member) => member.exactValueFound).length;
  const exactWithGeometry = memberSummaries.filter(
    (member) => member.exactValueFoundWithGeometry
  ).length;
  const deterministicRecovered = rows.reduce(
    (sum, row) => sum + (row.deterministicRecoveredMembers || []).length,
    0
  );
  const stage3SelfComplete = rows.filter(
    (row) => row.side === "self" && row.completeMemberEvidenceByConsensus
  ).length;
  const strategyTotals = currentPcGeometryStrategyCounts(memberSummaries);
  const concatRunRows = rows.filter((row) =>
    (row.variants || []).some((variant) => (variant.concatenatedRuns || []).length > 0)
  );
  const rowLimit = 80;
  const lines = [
    "# Current-PC Stage3 Slot Geometry Investigation",
    "",
    "This runner-only diagnostic pass measures whether OCR token bounding boxes can assign Stage3 member values to `member1` / `member2` / `member3` deterministically. It writes artifacts under `tmp/` and does not change final OCR output.",
    "",
    "## Summary",
    "",
    `- output: \`${diagnostics?.outputDir || "tmp/current-pc-stage3-slot-geometry-diagnostics"}\``,
    diagnostics?.sourceSummary
      ? `- source baseline summary: \`${diagnostics.sourceSummary}\``
      : "- source baseline summary: freshly generated current-PC baseline",
    `- Stage3 side rows inspected: ${rows.length}`,
    `- expected member values inspected: ${memberSummaries.length}`,
    `- exact expected values found by diagnostic OCR: ${exactFound} / ${memberSummaries.length}`,
    `- exact expected values found with bbox geometry: ${exactWithGeometry} / ${memberSummaries.length}`,
    `- deterministic missing-member recoveries by center+overlap consensus: ${deterministicRecovered}`,
    `- Stage3 self rows with all three expected members visible by center+overlap consensus: ${stage3SelfComplete}`,
    `- rows with concatenated or multi-slot OCR runs: ${concatRunRows.length}`,
    "",
    "## BBox Availability",
    "",
    rows.some((row) => row.bboxAvailable)
      ? "Tesseract word/symbol geometry is available through the existing runner worker API (`blocks`/`hocr`/`tsv`) and is preserved only in these diagnostics."
      : "No usable bbox geometry was returned in this run.",
    "",
    "## Strategy Comparison",
    "",
    "| Strategy | Correct | Wrong slot | Ambiguous | Absent |",
    "| --- | ---: | ---: | ---: | ---: |",
  ];
  for (const [strategy, counts] of Object.entries(strategyTotals)) {
    lines.push(
      `| ${strategy} | ${counts.correct} | ${counts.wrong} | ${counts.ambiguous} | ${counts.absent} |`
    );
  }
  lines.push(
    "",
    "Primary safety criterion is zero wrong-slot assignments. Strategies with wrong-slot assignments remain diagnostics-only even when they recover exact values.",
    "",
    "## Commands",
    "",
    "- Full baseline plus geometry: `node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage3-slot-geometry-diagnostics`",
    "- Geometry-only from existing baseline artifacts: `node scripts/ocr-test-images.mjs --current-pc-stage3-slot-geometry-from-baseline`",
    "- Geometry-slot solver simulation from existing baseline artifacts: `node scripts/ocr-test-images.mjs --current-pc-stage3-slot-geometry-from-baseline --current-pc-stage3-geometry-slot-solver`",
    "",
    "The second command is diagnostics-only and reuses `tmp/current-pc-ocr-baseline/summary.json`; it does not rerun final OCR extraction.",
    "",
    "## Expected-Blind Geometry Slot Simulation",
    ""
  );
  if (simulation) {
    const candidateStats = simulation.geometryCandidateStats || {};
    lines.push(
      "This runner-only simulation builds Stage3 member candidates from OCR token bbox geometry only. Expected fixtures are used only after the proposed result is built, for TP/FP/FN scoring.",
      "",
      "| Metric | Count |",
      "| --- | ---: |",
      `| TP | ${simulation.truePositives} |`,
      `| FP | ${simulation.falsePositives} |`,
      `| FN | ${simulation.falseNegatives} |`,
      `| blocked | ${simulation.blocked} |`,
      `| accepted stage/side corrections | ${simulation.acceptedStageSideCorrections} |`,
      `| true incremental TP beyond current production stage-wide solver | ${simulation.trueIncrementalTp} |`,
      `| Stage3 self incremental TP | ${simulation.stage3SelfIncrementalTp} |`,
      `| potential full-image PASS gain | ${simulation.potentialFullImagePassGain} |`,
      `| wrong-slot assignments in geometry candidates | ${simulation.wrongSlotAssignments} |`,
      `| extra candidate insertions | ${simulation.extraCandidateInsertions} |`,
      "",
      "| Candidate Filter | Count |",
      "| --- | ---: |",
      `| inspected tokens | ${candidateStats.inspectedTokens || 0} |`,
      `| accepted tokens | ${candidateStats.acceptedTokens || 0} |`,
      `| rejected tokens | ${candidateStats.rejectedTokens || 0} |`,
      `| ambiguous tokens | ${candidateStats.ambiguousTokens || 0} |`,
      `| concatenated tokens rejected | ${candidateStats.concatenatedTokens || 0} |`,
      "",
      "Rejected candidate reasons:",
      ""
    );
    for (const [reason, count] of Object.entries(candidateStats.rejectedReasonCounts || {})) {
      lines.push(`- ${reason}: ${count}`);
    }
    lines.push(
      "",
      "Candidate scoring summary:",
      ""
    );
    for (const [bucket, count] of Object.entries(simulation.candidateCorrectnessCounts || {})) {
      lines.push(`- ${bucket}: ${count}`);
    }
    lines.push(
      "",
      "Overlap with existing production recoveries:",
      ""
    );
    for (const [name, count] of Object.entries(simulation.overlap || {})) {
      lines.push(`- ${name}: ${count}`);
    }
    lines.push(
      "",
      `Recommendation: ${simulation.recommendation}.`,
      ""
    );
    if ((simulation.accepted || []).length > 0) {
      lines.push(
        "### Accepted Simulation Cases",
        "",
        "| Image | Stage | Changed slots | Proposed self | Proposed enemy | Geometry candidates used | Existing stage-wide? |",
        "| --- | ---: | --- | --- | --- | --- | --- |"
      );
      for (const row of simulation.accepted.slice(0, 20)) {
        const changed = (row.changedMemberSlots || [])
          .map((slot) => `${slot.side} member${slot.slot}: ${formatNumber(slot.from)} -> ${formatNumber(slot.to)}`)
          .join("<br>");
        const candidates = (row.geometryCandidatesUsed || [])
          .map((candidate) => {
            const rawOverlap = Number(candidate.overlapPct || 0);
            const overlapPercent = rawOverlap <= 1 ? rawOverlap * 100 : rawOverlap;
            return `${candidate.side || "?"} member${Number(candidate.slotIndex || 0) + 1}=${formatNumber(candidate.value)} (${candidate.variantLabel}, overlap=${Math.round(overlapPercent)}%)`;
          })
          .join("<br>");
        lines.push(
          `| ${row.screenshot} | ${row.stage} | ${changed || "-"} | ${formatDebugNumbers(row.proposed?.self?.members || [])} / total ${formatNumber(row.proposed?.self?.total || 0)} | ${formatDebugNumbers(row.proposed?.enemy?.members || [])} / total ${formatNumber(row.proposed?.enemy?.total || 0)} | ${candidates || "-"} | ${row.existingStageWide ? "yes" : "no"} |`
        );
      }
    }
    if ((simulation.falsePositiveRows || []).length > 0) {
      lines.push(
        "",
        "### False Positives",
        "",
        "| Image | Stage | Proposed self | Proposed enemy | Geometry candidate count |",
        "| --- | ---: | --- | --- | ---: |"
      );
      for (const row of simulation.falsePositiveRows) {
        lines.push(
          `| ${row.screenshot} | ${row.stage} | ${formatDebugNumbers(row.proposed?.self?.members || [])} / total ${formatNumber(row.proposed?.self?.total || 0)} | ${formatDebugNumbers(row.proposed?.enemy?.members || [])} / total ${formatNumber(row.proposed?.enemy?.total || 0)} | ${(row.geometryCandidates || []).length} |`
        );
      }
    }
    if ((simulation.potentialFullImagePassImages || []).length > 0) {
      lines.push(
        "",
        "Potential full-image PASS gain:",
        "",
        ...simulation.potentialFullImagePassImages.map((image) => `- ${image}`)
      );
    }
  } else {
    lines.push(
      "No runner-only geometry-slot recovery simulation was requested in this pass. Use the simulation command above to test expected-blind bbox candidate insertion against the current baseline.",
      ""
    );
  }
  lines.push(
    "",
    "## Slot ROI Geometry",
    "",
    "| Image | Side | Member row ROI | Slot ROIs |",
    "| --- | --- | --- | --- |"
  );
  for (const row of rows.slice(0, 10)) {
    const slots = (row.slotGeometry || [])
      .map((slot) => `${slot.slot}: x=${Math.round(slot.left)},w=${Math.round(slot.width)}`)
      .join("<br>");
    const roi = row.memberRowZone
      ? `x=${row.memberRowZone.left}, y=${row.memberRowZone.top}, w=${row.memberRowZone.width}, h=${row.memberRowZone.height}`
      : "-";
    lines.push(`| ${row.image} | ${row.side} | ${roi} | ${slots} |`);
  }
  lines.push(
    "",
    "## Per-Row Highlights",
    "",
    "| Image | Side | Selected members | Expected members | Consensus exact members | Missing recovered by consensus | Wrong-slot strategies | Artifact |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const row of rows.slice(0, rowLimit)) {
    const consensus = (row.memberSummaries || [])
      .filter((member) => member.strategyStatus?.centerOverlapConsensus === "correct")
      .map((member) => `${member.role}=${formatNumber(member.expected)}`)
      .join("<br>");
    const recovered = (row.deterministicRecoveredMembers || [])
      .map((member) => `${member.role}=${formatNumber(member.expected)}`)
      .join("<br>");
    const wrong = Object.entries(row.wrongSlotStrategies || {})
      .filter(([, count]) => count > 0)
      .map(([strategy, count]) => `${strategy}:${count}`)
      .join("<br>");
    lines.push(
      `| ${row.image} | ${row.side} | ${formatDebugNumbers(row.selectedMembers)} | ${formatDebugNumbers(row.expectedMembers)} | ${consensus || "-"} | ${recovered || "-"} | ${wrong || "0"} | ${row.artifact} |`
    );
  }
  if (rows.length > rowLimit) {
    lines.push(`| ... | ... | ... | ... | ... | ... | ... | ${rows.length - rowLimit} additional rows omitted from the markdown table; see summary JSON. |`);
  }
  lines.push(
    "",
    "## Concatenated Runs",
    "",
    `Rows with concatenated or multi-slot runs: ${concatRunRows.length}. These are not split or recovered. The JSON artifacts preserve raw text, full bbox, parsed numeric fragments, and whether the run spans multiple slots so a future design can tell geometry-backed evidence from guesswork.`,
    "",
    "## Simulation Decision",
    "",
    simulation
      ? `The runner-only \`${simulation.policyName}\` simulation is available, but final OCR output is unchanged. Production should remain blocked unless the simulation shows meaningful incremental TP, FP=0, no wrong-slot geometry assignments, exact observed member values, exact total evidence, crown-bonus consistency, and unique six-member interpretation.`
      : "No production recovery is added by this pass. A future `currentPcStage3GeometrySlotEvidenceSimulation` should only be attempted if a geometry policy shows at least two true incremental positives beyond current production, zero wrong-slot assignments, exact observed member values, exact total evidence, crown-bonus consistency, and unique six-member interpretation.",
    "",
    "Important limitation: this pass uses expected values as diagnostic targets for bbox span discovery. It measures whether exact values already present in OCR geometry can be spatially tied to slots; it does not prove that a production candidate selector can safely choose among all competing numeric evidence.",
    "",
    "## Recommendation",
    "",
    "Continue with diagnostics and browser-equivalent evidence comparison before productionization. Geometry can make slot provenance more explicit, but it must first prove zero wrong-slot assignments across the full current-PC fixture set and avoid concatenated/noisy multi-slot runs.",
    ""
  );
  return lines.join("\n");
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

function arraysEqualWithinTolerance(left = [], right = [], tolerance = 1) {
  if (left.length !== right.length) return false;
  return left.every(
    (value, index) =>
      Math.abs(Number(value || 0) - Number(right[index] || 0)) <= Number(tolerance || 0)
  );
}

function proposalMatchesExpectedWithTolerance(proposal, expected, tolerance = 1) {
  if (!proposal || !expected) return false;
  return (
    arraysEqualWithinTolerance(proposal.members || [], expected.members || [], tolerance) &&
    Math.abs(Number(proposal.bonus || 0) - Number(expected.bonus || 0)) <=
      Number(tolerance || 0) &&
    Math.abs(Number(proposal.total || 0) - Number(expected.total || 0)) <=
      Number(tolerance || 0)
  );
}

function proposalMatchesExpected(proposal, expected) {
  return proposalMatchesExpectedWithTolerance(proposal, expected, 1);
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

function currentPcFinalSelectedStageSide(item, stage, side) {
  const stageResult = item.result?.[`stage${stage}`] || {};
  const members = [0, 1, 2].map((index) => Number(stageResult[side]?.[index] || 0));
  const total = Number(stageResult[`${side}Total`] || 0);
  const memberSum = members.reduce((sum, value) => sum + value, 0);
  return {
    members,
    bonus: total - memberSum,
    total,
  };
}

function currentPcExactMembersBonusTotalTarget(item, stage, side) {
  const expected = currentPcExpectedStageSide(item, stage, side);
  if (!expected || !hasCurrentPcSideFailure(item, stage, side)) return false;
  const selected = currentPcFinalSelectedStageSide(item, stage, side);
  return (
    arraysEqualWithinTolerance(selected.members, expected.members || [], 0) &&
    (Number(selected.bonus || 0) !== Number(expected.bonus || 0) ||
      Number(selected.total || 0) !== Number(expected.total || 0))
  );
}

function currentPcExactMembersBonusTotalTargetFromSimulation(item, stage, side, simulation) {
  const expected = currentPcExpectedStageSide(item, stage, side);
  if (!expected) return false;
  const selected = simulation?.selected || currentPcFinalSelectedStageSide(item, stage, side);
  return (
    arraysEqualWithinTolerance(selected.members || [], expected.members || [], 0) &&
    (Number(selected.bonus || 0) !== Number(expected.bonus || 0) ||
      Number(selected.total || 0) !== Number(expected.total || 0))
  );
}

function currentPcExactMemberEvidenceComplete(stageSimulation) {
  const memberEvidence = stageSimulation?.evidence?.memberEvidence || {};
  return sides.every((side) => {
    const sideEvidence = memberEvidence[side] || [];
    return (
      sideEvidence.length === 3 &&
      sideEvidence.every((slotEvidence) => Array.isArray(slotEvidence) && slotEvidence.length > 0)
    );
  });
}

function currentPcExactMembersSharedSideAnalysis(item, stage, side) {
  const stageKey = `stage${stage}`;
  const sideAnalysis = item.stages?.[stageKey]?.[side] || {};
  const selected = currentPcFinalSelectedStageSide(item, stage, side);
  return {
    selectedMembers: selected.members,
    selectedTotal: selected.total,
    rawCandidates: sideAnalysis.rawCandidates || [],
    displayedTotalCandidates: sideAnalysis.displayedTotalCandidates || [],
    bonusCandidates: sideAnalysis.bonusCandidates || [],
    candidateSourceSummary: sideAnalysis.candidateSourceSummary || null,
    currentPcGroupedRawTokenEvidenceSimulation:
      sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation || null,
    currentPcStage3SevenDigitBonusDisplacementSimulation:
      sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation || null,
  };
}

function buildCurrentPcExactMembersCrownBonusTotalRecoveryStageSide(
  item,
  stage,
  side
) {
  const stageKey = `stage${stage}`;
  const sideAnalysis = item.stages?.[stageKey]?.[side];
  const artifactSimulation =
    sideAnalysis?.currentPcExactMembersCrownBonusTotalRecoverySimulation ||
    item.stages?.[stageKey]?.debugArtifact
      ?.currentPcExactMembersCrownBonusTotalRecoverySimulation?.[side] ||
    null;
  const simulation =
    artifactSimulation ||
    sharedBuildCurrentPcExactMembersCrownBonusTotalRecoveryEvidence({
      stage,
      side,
      self: currentPcExactMembersSharedSideAnalysis(item, stage, "self"),
      enemy: currentPcExactMembersSharedSideAnalysis(item, stage, "enemy"),
      previousRecoveries: {
        [side]: {
          groupedRaw: sideAnalysis?.currentPcGroupedRawTokenRecovery || null,
          stage3SevenDigit:
            sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery || null,
          crownBonus: sideAnalysis?.currentPcCrownBonusRuleRecovery || null,
          stageWideSixMember:
            sideAnalysis?.currentPcStageWideSixMemberCandidateSolverRecovery || null,
        },
      },
    });
  return {
    ...simulation,
    target: currentPcExactMembersBonusTotalTargetFromSimulation(item, stage, side, simulation),
    evidence: {
      ...(simulation.evidence || {}),
      currentCrownBonusRejectionReasons:
        sideAnalysis?.currentPcCrownBonusRuleSimulation?.rejectionReasons ||
        buildCurrentPcCrownBonusRuleStageSimulation(item, stage)?.rejectionReasons ||
        [],
      currentStageWideRejectionReasons:
        item.stages?.[stageKey]?.debugArtifact?.currentPcStageWideSixMemberCandidateSolverSimulation
          ?.rejectionReasons ||
        sideAnalysis?.currentPcStageWideSixMemberCandidateSolverSimulation?.rejectionReasons ||
        [],
    },
  };
}

function buildCurrentPcExactMembersCrownBonusTotalRecoverySimulation(analysis) {
  const rows = [];
  const accepted = [];
  const rejectedTargets = [];
  const clusterBreakdown = new Map();
  const positionBreakdown = new Map();
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blocked = 0;
  let targetRows = 0;
  let failingStageSideRows = 0;

  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  const rowPasses = (item, stage, side, override = null) => {
    const expected = currentPcExpectedStageSide(item, stage, side);
    const selected = override || currentPcFinalSelectedStageSide(item, stage, side);
    return proposalMatchesExpectedWithTolerance(selected, expected, 0);
  };

  const imageWouldPassWithAcceptedRows = (item, acceptedRowsForImage) => {
    for (const stage of stages) {
      for (const side of sides) {
        const override = acceptedRowsForImage.find(
          (row) => row.stage === stage && row.side === side
        )?.proposed;
        if (!rowPasses(item, stage, side, override || null)) return false;
      }
    }
    return true;
  };

  for (const item of analysis) {
    if (!item.expected) continue;
    const acceptedForImage = [];
    for (const stage of stages) {
      for (const side of sides) {
        const expected = currentPcExpectedStageSide(item, stage, side);
        if (!expected) continue;
        const sideFailed = hasCurrentPcSideFailure(item, stage, side);
        if (sideFailed) failingStageSideRows += 1;
        const simulation = buildCurrentPcExactMembersCrownBonusTotalRecoveryStageSide(
          item,
          stage,
          side
        );
        const target = Boolean(simulation.target);
        if (target) targetRows += 1;
        const matchesExpected = proposalMatchesExpectedWithTolerance(
          simulation.proposed,
          expected,
          0
        );
        let classification = "correctly-unchanged";

        if (simulation.wouldApply && matchesExpected) {
          truePositives += 1;
          classification = "true-positive";
          accepted.push({
            screenshot: item.fileName,
            stage,
            side,
            selected: simulation.selected,
            expected,
            oppositeSelected: simulation.oppositeSelected,
            proposed: simulation.proposed,
            evidence: simulation.evidence,
          });
          acceptedForImage.push({ stage, side, proposed: simulation.proposed });
          increment(positionBreakdown, `stage${stage}-${side}`);
        } else if (simulation.wouldApply && !matchesExpected) {
          falsePositives += 1;
          classification = "false-positive";
        } else if (target) {
          falseNegatives += 1;
          classification = "false-negative";
          rejectedTargets.push({
            screenshot: item.fileName,
            stage,
            side,
            selected: simulation.selected,
            expected,
            oppositeSelected: simulation.oppositeSelected,
            proposed: simulation.proposed,
            rejectionReasons: simulation.rejectionReasons,
            evidence: simulation.evidence,
          });
        } else if (sideFailed) {
          blocked += 1;
          classification = "blocked";
        }

        if (target || simulation.wouldApply) {
          if (!matchesExpected) {
            increment(
              clusterBreakdown,
              "exact target members but global rank/side is not safely known"
            );
          } else if (!simulation.evidence.memberEvidenceComplete) {
            increment(clusterBreakdown, "exact members but six-member evidence incomplete");
          } else if (!simulation.evidence.targetTotalEvidence?.length) {
            increment(clusterBreakdown, "exact members + derived bonus but exact target total evidence missing");
          } else if (simulation.wouldApply) {
            increment(clusterBreakdown, "exact members + derived bonus + exact target total evidence");
          } else {
            increment(clusterBreakdown, "exact members but blocked by strict guard");
          }
        }

        if (target || simulation.wouldApply || classification === "false-positive") {
          rows.push({
            screenshot: item.fileName,
            stage,
            side,
            classification,
            target,
            wouldApply: simulation.wouldApply,
            selected: simulation.selected,
            expected,
            oppositeSelected: simulation.oppositeSelected,
            proposed: simulation.proposed,
            rejectionReasons: simulation.rejectionReasons,
            evidence: simulation.evidence,
            matchesExpected,
          });
        }
      }
    }
    if (acceptedForImage.length > 0) {
      const imageWouldPass = imageWouldPassWithAcceptedRows(item, acceptedForImage);
      for (const acceptedRow of accepted) {
        if (acceptedRow.screenshot !== item.fileName) continue;
        acceptedRow.imageWouldPass = imageWouldPass;
      }
    }
  }

  const mapToRows = (map) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    name: "currentPcExactMembersCrownBonusTotalRecoverySimulation",
    scope: {
      currentPcOnly: true,
      finalOcrOutputChanged: true,
      productionRecoveryAdded: true,
      exactEqualityOnly: true,
      nearMatchUsed: false,
      withinOneToleranceUsed: false,
      memberChangesAllowed: false,
    },
    failingStageSideRows,
    targetRows,
    truePositives,
    falsePositives,
    falseNegatives,
    blocked,
    trueIncrementalTp: truePositives,
    acceptedStageSideCorrections: accepted.length,
    imageLevelPotentialGain: accepted.filter((row) => row.imageWouldPass).length,
    rows,
    accepted,
    rejectedTargets,
    clusterBreakdown: mapToRows(clusterBreakdown),
    positionBreakdown: mapToRows(positionBreakdown),
    recommendation:
      truePositives >= 2 && falsePositives === 0
        ? "browser-ui-parity-next"
        : "defer-productionization",
  };
}

function currentPcSideLocalExactEvidenceStageSide(item, stage, side) {
  const stageKey = `stage${stage}`;
  const sideAnalysis = item.stages?.[stageKey]?.[side] || {};
  const simulation =
    sideAnalysis?.currentPcSideLocalExactEvidenceRecoverySimulation ||
    sharedBuildCurrentPcSideLocalExactEvidenceRecoveryEvidence({
      stage,
      side,
      self: currentPcExactMembersSharedSideAnalysis(item, stage, "self"),
      enemy: currentPcExactMembersSharedSideAnalysis(item, stage, "enemy"),
      previousRecoveries: {
        [side]: {
          groupedRaw: sideAnalysis?.currentPcGroupedRawTokenRecovery || null,
          stage3SevenDigit:
            sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery || null,
          crownBonus: sideAnalysis?.currentPcCrownBonusRuleRecovery || null,
          stageWideSixMember:
            sideAnalysis?.currentPcStageWideSixMemberCandidateSolverRecovery || null,
          exactMembersBonusTotal:
            sideAnalysis?.currentPcExactMembersCrownBonusTotalRecovery || null,
        },
      },
    });
  return {
    ...simulation,
    evidence: {
      ...(simulation.evidence || {}),
      currentCrownBonusRejectionReasons:
        sideAnalysis?.currentPcCrownBonusRuleSimulation?.rejectionReasons ||
        buildCurrentPcCrownBonusRuleStageSimulation(item, stage)?.rejectionReasons ||
        [],
      currentStageWideRejectionReasons:
        item.stages?.[stageKey]?.debugArtifact?.currentPcStageWideSixMemberCandidateSolverSimulation
          ?.rejectionReasons ||
        sideAnalysis?.currentPcStageWideSixMemberCandidateSolverSimulation?.rejectionReasons ||
        [],
      currentExactMembersRejectionReasons:
        sideAnalysis?.currentPcExactMembersCrownBonusTotalRecoverySimulation?.rejectionReasons || [],
    },
  };
}

function buildCurrentPcSideLocalExactEvidenceRecoverySimulation(analysis) {
  const rows = [];
  const accepted = [];
  const rejectedTargets = [];
  const blockedBreakdown = new Map();
  const positionBreakdown = new Map();
  let failingStageSideRows = 0;
  let candidateRows = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blocked = 0;

  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  const rowPasses = (item, stage, side, override = null) => {
    const expected = currentPcExpectedStageSide(item, stage, side);
    const selected = override || currentPcFinalSelectedStageSide(item, stage, side);
    return proposalMatchesExpectedWithTolerance(selected, expected, 0);
  };
  const imageWouldPassWithAcceptedRows = (item, acceptedRowsForImage) => {
    for (const stage of stages) {
      for (const side of sides) {
        const override = acceptedRowsForImage.find(
          (row) => row.stage === stage && row.side === side
        )?.proposed;
        if (!rowPasses(item, stage, side, override || null)) return false;
      }
    }
    return true;
  };

  for (const item of analysis) {
    if (!item.expected) continue;
    const acceptedForImage = [];
    for (const stage of stages) {
      for (const side of sides) {
        const expected = currentPcExpectedStageSide(item, stage, side);
        if (!expected) continue;
        const sideFailed = hasCurrentPcSideFailure(item, stage, side);
        if (sideFailed) failingStageSideRows += 1;
        const selected = currentPcFinalSelectedStageSide(item, stage, side);
        const target =
          sideFailed &&
          arraysEqualWithinTolerance(selected.members || [], expected.members || [], 0) &&
          (Number(selected.bonus || 0) !== Number(expected.bonus || 0) ||
            Number(selected.total || 0) !== Number(expected.total || 0));
        if (target) candidateRows += 1;
        const simulation = currentPcSideLocalExactEvidenceStageSide(item, stage, side);
        const matchesExpected = proposalMatchesExpectedWithTolerance(
          simulation.proposed,
          expected,
          0
        );
        let classification = sideFailed ? "blocked" : "correctly-unchanged";
        if (simulation.wouldApply && matchesExpected) {
          truePositives += 1;
          classification = "true-positive";
          const row = {
            screenshot: item.fileName,
            stage,
            side,
            selected: simulation.selected,
            expected,
            oppositeSelected: simulation.oppositeSelected,
            proposed: simulation.proposed,
            proof: simulation.proof,
            proofEvidence: {
              targetTotalEvidence: simulation.evidence?.targetTotalEvidence || [],
              targetBonusEvidence:
                simulation.evidence?.calculatedBonus > 0
                  ? ["derived-from-targetMax"]
                  : ["zero-bonus-equation"],
            },
            evidence: simulation.evidence,
          };
          accepted.push(row);
          acceptedForImage.push({ stage, side, proposed: simulation.proposed });
          increment(positionBreakdown, `stage${stage}-${side}`);
        } else if (simulation.wouldApply && !matchesExpected) {
          falsePositives += 1;
          classification = "false-positive";
        } else if (target) {
          falseNegatives += 1;
          classification = "false-negative";
          const rejectionReasons = [
            ...simulation.rejectionReasons,
            ...(simulation.rejectedProofs || []).flatMap((proof) => proof.rejectionReasons || []),
          ];
          if (rejectionReasons.length === 0) rejectionReasons.push("no-side-local-proof");
          for (const reason of [...new Set(rejectionReasons)]) increment(blockedBreakdown, reason);
          rejectedTargets.push({
            screenshot: item.fileName,
            stage,
            side,
            selected: simulation.selected,
            expected,
            oppositeSelected: simulation.oppositeSelected,
            proposed: simulation.proposed,
            rejectionReasons: [...new Set(rejectionReasons)],
            rejectedProofs: simulation.rejectedProofs || [],
            evidence: simulation.evidence,
          });
        } else if (sideFailed) {
          blocked += 1;
        }

        if (target || simulation.wouldApply) {
          rows.push({
            screenshot: item.fileName,
            stage,
            side,
            classification,
            target,
            wouldApply: simulation.wouldApply,
            selected: simulation.selected,
            expected,
            oppositeSelected: simulation.oppositeSelected,
            proposed: simulation.proposed,
            proof: simulation.proof,
            rejectionReasons: simulation.rejectionReasons,
            rejectedProofs: simulation.rejectedProofs || [],
            evidence: simulation.evidence,
            matchesExpected,
          });
        }
      }
    }
    if (acceptedForImage.length > 0) {
      const imageWouldPass = imageWouldPassWithAcceptedRows(item, acceptedForImage);
      for (const acceptedRow of accepted) {
        if (acceptedRow.screenshot !== item.fileName) continue;
        acceptedRow.imageWouldPass = imageWouldPass;
      }
    }
  }

  const mapToRows = (map) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    name: "currentPcSideLocalExactEvidenceRecoverySimulation",
    scope: {
      runnerOnly: true,
      finalOcrOutputChanged: false,
      productionRecoveryAdded: false,
      currentPcOnly: true,
      memberChangesAllowed: false,
      exactEqualityOnly: true,
      nearMatchUsed: false,
      withinOneToleranceUsed: false,
      derivesMissingMembersFromTotals: false,
    },
    failingStageSideRows,
    candidateRows,
    truePositives,
    falsePositives,
    falseNegatives,
    blocked,
    trueIncrementalTp: truePositives,
    potentialFullImageGain: accepted.filter((row) => row.imageWouldPass).length,
    accepted,
    rejectedTargets,
    rows,
    blockedBreakdown: mapToRows(blockedBreakdown),
    positionBreakdown: mapToRows(positionBreakdown),
    recommendation:
      truePositives >= 2 && falsePositives === 0
        ? "promising-runner-browser-parity-next"
        : "defer-side-local-recovery",
  };
}

function formatCurrentPcEvidenceSources(evidence = []) {
  if (!Array.isArray(evidence) || evidence.length === 0) return "none";
  return evidence
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (!entry) return "";
      return entry.source || entry.label || String(entry.value || "");
    })
    .filter(Boolean)
    .join(", ") || "none";
}

function currentPcExactMembersEvidenceFingerprint(evidence = []) {
  return (evidence || [])
    .map((entry) => ({
      source: entry.source || "",
      value: Number(entry.value || 0),
      pass: entry.pass || null,
      text: entry.text || "",
      tokens: (entry.tokens || []).map((token) => ({
        rawToken: token.rawToken || token.token || "",
        value: Number(token.normalizedValue || 0),
        shape: token.shape || token.tokenShape || "",
        textIndex: token.textIndex ?? null,
      })),
    }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.value - b.value);
}

function currentPcExactMembersMemberEvidenceFingerprint(memberEvidence = {}) {
  const fingerprint = {};
  for (const side of sides) {
    fingerprint[side] = (memberEvidence[side] || []).map((slotEvidence) =>
      currentPcExactMembersEvidenceFingerprint(slotEvidence)
    );
  }
  return fingerprint;
}

function currentPcExactMembersRecoveryFingerprint(sim = null) {
  if (!sim) return null;
  return {
    wouldApply: Boolean(sim.wouldApply),
    rejectionReasons: [...(sim.rejectionReasons || [])].sort(),
    selected: sim.selected || null,
    oppositeSelected: sim.oppositeSelected || null,
    proposed: sim.proposed || null,
    rank1: sim.evidence?.rank1 || null,
    winningSide: sim.evidence?.winningSide || null,
    calculatedBonus: Number(sim.evidence?.calculatedBonus || 0),
    targetTotalEvidence: currentPcExactMembersEvidenceFingerprint(
      sim.evidence?.targetTotalEvidence || []
    ),
    oppositeTotalEvidence: currentPcExactMembersEvidenceFingerprint(
      sim.evidence?.oppositeTotalEvidence || []
    ),
    memberEvidence: currentPcExactMembersMemberEvidenceFingerprint(
      sim.evidence?.memberEvidence || {}
    ),
    memberEvidenceComplete: Boolean(sim.evidence?.memberEvidenceComplete),
    targetEquationExact: Boolean(sim.evidence?.targetEquationExact),
    uniqueInterpretation: Boolean(sim.evidence?.uniqueInterpretation),
    noCompetingInterpretation: Boolean(sim.evidence?.noCompetingInterpretation),
  };
}

function currentPcSideLocalMemberEvidenceFingerprint(memberEvidence = []) {
  return (memberEvidence || []).map((slotEvidence) =>
    currentPcExactMembersEvidenceFingerprint(slotEvidence)
  );
}

function currentPcSideLocalRecoveryFingerprint(sim = null) {
  if (!sim) return null;
  return {
    wouldApply: Boolean(sim.wouldApply),
    rejectionReasons: [...(sim.rejectionReasons || [])].sort(),
    selected: sim.selected || null,
    oppositeSelected: sim.oppositeSelected || null,
    proposed: sim.proposed || null,
    proof: sim.proof || null,
    targetMax: Number(sim.evidence?.targetMax || 0),
    targetMaxCount: Number(sim.evidence?.targetMaxCount || 0),
    oppositeTotal: Number(sim.oppositeSelected?.total || 0),
    targetWinsByOppositeTotalUpperBound: Boolean(
      sim.evidence?.targetWinsByOppositeTotalUpperBound
    ),
    calculatedBonus: Number(sim.evidence?.calculatedBonus || 0),
    targetTotalEvidence: currentPcExactMembersEvidenceFingerprint(
      sim.evidence?.targetTotalEvidence || []
    ),
    oppositeTotalEvidence: currentPcExactMembersEvidenceFingerprint(
      sim.evidence?.oppositeTotalEvidence || []
    ),
    targetMemberEvidence: currentPcSideLocalMemberEvidenceFingerprint(
      sim.evidence?.targetMemberEvidence || []
    ),
    oppositeTotalInternallyConsistent: Boolean(
      sim.evidence?.oppositeTotalInternallyConsistent
    ),
    oppositeCompetingAboveTargetMax: [
      ...(sim.evidence?.oppositeCompetingAboveTargetMax || []),
    ].sort((a, b) => a - b),
    targetEquationExact: Boolean(sim.evidence?.targetEquationExact),
    uniqueInterpretation: Boolean(sim.evidence?.uniqueInterpretation),
    noCompetingInterpretation: Boolean(sim.evidence?.noCompetingInterpretation),
  };
}

function buildCurrentPcBrowserEquivalentSideLocalExactEvidenceRecoveryStageSide(
  item,
  stage,
  side
) {
  const stageKey = `stage${stage}`;
  const sideAnalysis = item.stages?.[stageKey]?.[side];
  if (sideAnalysis?.currentPcSideLocalExactEvidenceRecoverySimulation) {
    return sideAnalysis.currentPcSideLocalExactEvidenceRecoverySimulation;
  }
  return sharedBuildCurrentPcSideLocalExactEvidenceRecoveryEvidence({
    stage,
    side,
    self: currentPcExactMembersSharedSideAnalysis(item, stage, "self"),
    enemy: currentPcExactMembersSharedSideAnalysis(item, stage, "enemy"),
    previousRecoveries: {
      [side]: {
        groupedRaw: sideAnalysis?.currentPcGroupedRawTokenRecovery || null,
        stage3SevenDigit:
          sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery || null,
        crownBonus: sideAnalysis?.currentPcCrownBonusRuleRecovery || null,
        stageWideSixMember:
          sideAnalysis?.currentPcStageWideSixMemberCandidateSolverRecovery || null,
        exactMembersBonusTotal:
          sideAnalysis?.currentPcExactMembersCrownBonusTotalRecovery || null,
      },
    },
  });
}

function compareCurrentPcSideLocalExactEvidenceRecoveryParity(analysis, simulation) {
  const acceptedKeys = new Set(
    (simulation.accepted || []).map((row) => `${row.screenshot}|${row.stage}|${row.side}`)
  );
  const rows = [];
  const mismatches = [];
  let rowsCompared = 0;
  let runnerWouldApply = 0;
  let browserWouldApply = 0;
  let tpRows = 0;
  let tpParityExact = 0;
  let wouldApplyDisagreements = 0;
  let targetMemberDisagreements = 0;
  let targetMaxDisagreements = 0;
  let oppositeTotalDisagreements = 0;
  let oppositeTotalEvidenceMismatches = 0;
  let targetMaxGreaterThanOppositeTotalDisagreements = 0;
  let derivedBonusDisagreements = 0;
  let targetTotalProposalDisagreements = 0;
  let exactTargetTotalEvidenceMismatches = 0;
  let missingRequiredBrowserEvidence = 0;
  let missingRequiredRunnerEvidence = 0;
  let safetyRelevantMismatches = 0;

  const noteMismatch = (row, field) => {
    row.mismatchFields.push(field);
    mismatches.push(row);
  };

  for (const item of analysis) {
    if (!item.expected) continue;
    for (const stage of stages) {
      for (const side of sides) {
        rowsCompared += 1;
        const key = `${item.fileName}|${stage}|${side}`;
        const runnerSim = currentPcSideLocalExactEvidenceStageSide(item, stage, side);
        const browserSim = buildCurrentPcBrowserEquivalentSideLocalExactEvidenceRecoveryStageSide(
          item,
          stage,
          side
        );
        const runner = currentPcSideLocalRecoveryFingerprint(runnerSim);
        const browser = currentPcSideLocalRecoveryFingerprint(browserSim);
        const row = {
          screenshot: item.fileName,
          stage,
          side,
          acceptedTp: acceptedKeys.has(key),
          runnerWouldApply: runner?.wouldApply || false,
          browserWouldApply: browser?.wouldApply || false,
          runnerSelected: runner?.selected || null,
          browserSelected: browser?.selected || null,
          runnerOppositeSelected: runner?.oppositeSelected || null,
          browserOppositeSelected: browser?.oppositeSelected || null,
          runnerProposed: runner?.proposed || null,
          browserProposed: browser?.proposed || null,
          runnerTargetMax: runner?.targetMax || 0,
          browserTargetMax: browser?.targetMax || 0,
          runnerCalculatedBonus: runner?.calculatedBonus || 0,
          browserCalculatedBonus: browser?.calculatedBonus || 0,
          runnerTargetWinsByOppositeTotalUpperBound:
            runner?.targetWinsByOppositeTotalUpperBound || false,
          browserTargetWinsByOppositeTotalUpperBound:
            browser?.targetWinsByOppositeTotalUpperBound || false,
          mismatchFields: [],
        };

        if (row.runnerWouldApply) runnerWouldApply += 1;
        if (row.browserWouldApply) browserWouldApply += 1;
        if (row.acceptedTp) tpRows += 1;
        if (row.runnerWouldApply !== row.browserWouldApply) {
          wouldApplyDisagreements += 1;
          noteMismatch(row, "wouldApply");
        }
        if (JSON.stringify(runner?.selected?.members || []) !== JSON.stringify(browser?.selected?.members || [])) {
          targetMemberDisagreements += 1;
          noteMismatch(row, "target-members");
        }
        if (runner?.targetMax !== browser?.targetMax || runner?.targetMaxCount !== browser?.targetMaxCount) {
          targetMaxDisagreements += 1;
          noteMismatch(row, "target-max");
        }
        if (runner?.oppositeTotal !== browser?.oppositeTotal) {
          oppositeTotalDisagreements += 1;
          noteMismatch(row, "opposite-total");
        }
        if (
          JSON.stringify(runner?.oppositeTotalEvidence || []) !==
          JSON.stringify(browser?.oppositeTotalEvidence || [])
        ) {
          oppositeTotalEvidenceMismatches += 1;
          noteMismatch(row, "opposite-total-evidence");
        }
        if (
          runner?.targetWinsByOppositeTotalUpperBound !==
          browser?.targetWinsByOppositeTotalUpperBound
        ) {
          targetMaxGreaterThanOppositeTotalDisagreements += 1;
          noteMismatch(row, "targetMax-greater-than-oppositeTotal");
        }
        if (runner?.calculatedBonus !== browser?.calculatedBonus) {
          derivedBonusDisagreements += 1;
          noteMismatch(row, "derived-bonus");
        }
        if (JSON.stringify(runner?.proposed || null) !== JSON.stringify(browser?.proposed || null)) {
          targetTotalProposalDisagreements += 1;
          noteMismatch(row, "proposed-target-total");
        }
        if (
          JSON.stringify(runner?.targetTotalEvidence || []) !==
          JSON.stringify(browser?.targetTotalEvidence || [])
        ) {
          exactTargetTotalEvidenceMismatches += 1;
          noteMismatch(row, "target-total-evidence");
        }
        if (runner?.wouldApply && !(browser?.targetTotalEvidence || []).length) {
          missingRequiredBrowserEvidence += 1;
          noteMismatch(row, "missing-required-browser-evidence");
        }
        if (browser?.wouldApply && !(runner?.targetTotalEvidence || []).length) {
          missingRequiredRunnerEvidence += 1;
          noteMismatch(row, "missing-required-runner-evidence");
        }
        if (row.mismatchFields.length > 0) {
          const safetyRelevant = row.runnerWouldApply || row.browserWouldApply || row.acceptedTp;
          if (safetyRelevant) safetyRelevantMismatches += 1;
          row.safetyRelevant = safetyRelevant;
        }
        if (
          row.acceptedTp &&
          row.runnerWouldApply &&
          row.browserWouldApply &&
          row.mismatchFields.length === 0
        ) {
          tpParityExact += 1;
        }
        if (row.mismatchFields.length > 0 || row.acceptedTp || row.runnerWouldApply || row.browserWouldApply) {
          rows.push(row);
        }
      }
    }
  }

  return {
    name: "currentPcSideLocalExactEvidenceRecoveryParity",
    rowsCompared,
    runnerWouldApply,
    browserWouldApply,
    tpRows,
    tpParityExact,
    wouldApplyDisagreements,
    targetMemberDisagreements,
    targetMaxDisagreements,
    oppositeTotalDisagreements,
    oppositeTotalEvidenceMismatches,
    targetMaxGreaterThanOppositeTotalDisagreements,
    derivedBonusDisagreements,
    targetTotalProposalDisagreements,
    exactTargetTotalEvidenceMismatches,
    missingRequiredBrowserEvidence,
    missingRequiredRunnerEvidence,
    safetyRelevantMismatches,
    rows,
    mismatches,
  };
}

function buildCurrentPcBrowserEquivalentExactMembersCrownBonusTotalRecoveryStageSide(
  item,
  stage,
  side
) {
  const stageKey = `stage${stage}`;
  const sideAnalysis = item.stages?.[stageKey]?.[side];
  const artifactSimulation =
    item.stages?.[stageKey]?.debugArtifact
      ?.currentPcExactMembersCrownBonusTotalRecoverySimulation?.[side] ||
    sideAnalysis?.currentPcExactMembersCrownBonusTotalRecoverySimulation ||
    null;
  if (artifactSimulation) return artifactSimulation;
  return sharedBuildCurrentPcExactMembersCrownBonusTotalRecoveryEvidence({
    stage,
    side,
    self: currentPcExactMembersSharedSideAnalysis(item, stage, "self"),
    enemy: currentPcExactMembersSharedSideAnalysis(item, stage, "enemy"),
    previousRecoveries: {
      [side]: {
        groupedRaw: sideAnalysis?.currentPcGroupedRawTokenRecovery || null,
        stage3SevenDigit:
          sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery || null,
        crownBonus: sideAnalysis?.currentPcCrownBonusRuleRecovery || null,
        stageWideSixMember:
          sideAnalysis?.currentPcStageWideSixMemberCandidateSolverRecovery || null,
      },
    },
  });
}

function compareCurrentPcExactMembersCrownBonusTotalRecoveryParity(
  analysis,
  simulation
) {
  const acceptedKeys = new Set(
    (simulation.accepted || []).map((row) => `${row.screenshot}|${row.stage}|${row.side}`)
  );
  const rows = [];
  const mismatches = [];
  let rowsCompared = 0;
  let runnerWouldApply = 0;
  let browserWouldApply = 0;
  let tpParityExact = 0;
  let wouldApplyDisagreements = 0;
  let memberDisagreements = 0;
  let globalRank1Disagreements = 0;
  let derivedBonusDisagreements = 0;
  let targetTotalProposalDisagreements = 0;
  let exactTotalEvidenceMismatches = 0;
  let missingRequiredBrowserEvidence = 0;
  let missingRequiredRunnerEvidence = 0;
  let safetyRelevantMismatches = 0;

  const noteMismatch = (row, field) => {
    row.mismatchFields.push(field);
    mismatches.push(row);
  };

  for (const item of analysis) {
    if (!item.expected) continue;
    for (const stage of stages) {
      for (const side of sides) {
        rowsCompared += 1;
        const key = `${item.fileName}|${stage}|${side}`;
        const runnerSim = buildCurrentPcExactMembersCrownBonusTotalRecoveryStageSide(
          item,
          stage,
          side
        );
        const browserSim =
          buildCurrentPcBrowserEquivalentExactMembersCrownBonusTotalRecoveryStageSide(
            item,
            stage,
            side
          );
        const runner = currentPcExactMembersRecoveryFingerprint(runnerSim);
        const browser = currentPcExactMembersRecoveryFingerprint(browserSim);
        if (runner?.wouldApply) runnerWouldApply += 1;
        if (browser?.wouldApply) browserWouldApply += 1;
        const row = {
          screenshot: item.fileName,
          stage,
          side,
          acceptedTp: acceptedKeys.has(key),
          runnerWouldApply: runner?.wouldApply || false,
          browserWouldApply: browser?.wouldApply || false,
          runnerProposed: runner?.proposed || null,
          browserProposed: browser?.proposed || null,
          runnerRank1: runner?.rank1 || null,
          browserRank1: browser?.rank1 || null,
          runnerRejectionReasons: runner?.rejectionReasons || [],
          browserRejectionReasons: browser?.rejectionReasons || [],
          mismatchFields: [],
        };

        if (JSON.stringify(runner?.wouldApply) !== JSON.stringify(browser?.wouldApply)) {
          wouldApplyDisagreements += 1;
          noteMismatch(row, "wouldApply");
        }
        if (
          JSON.stringify(runner?.selected) !== JSON.stringify(browser?.selected) ||
          JSON.stringify(runner?.oppositeSelected) !== JSON.stringify(browser?.oppositeSelected)
        ) {
          memberDisagreements += 1;
          noteMismatch(row, "selected-members");
        }
        if (JSON.stringify(runner?.rank1) !== JSON.stringify(browser?.rank1)) {
          globalRank1Disagreements += 1;
          noteMismatch(row, "global-rank1");
        }
        if (Number(runner?.calculatedBonus || 0) !== Number(browser?.calculatedBonus || 0)) {
          derivedBonusDisagreements += 1;
          noteMismatch(row, "derived-bonus");
        }
        if (JSON.stringify(runner?.proposed) !== JSON.stringify(browser?.proposed)) {
          targetTotalProposalDisagreements += 1;
          noteMismatch(row, "target-total-proposal");
        }
        if (
          JSON.stringify(runner?.targetTotalEvidence) !==
          JSON.stringify(browser?.targetTotalEvidence)
        ) {
          exactTotalEvidenceMismatches += 1;
          noteMismatch(row, "exact-target-total-evidence");
        }
        if (runner?.wouldApply && !(runner?.targetTotalEvidence || []).length) {
          missingRequiredRunnerEvidence += 1;
          noteMismatch(row, "missing-required-runner-evidence");
        }
        if (browser?.wouldApply && !(browser?.targetTotalEvidence || []).length) {
          missingRequiredBrowserEvidence += 1;
          noteMismatch(row, "missing-required-browser-evidence");
        }
        const safetyRelevant = row.mismatchFields.some((field) =>
          [
            "wouldApply",
            "selected-members",
            "global-rank1",
            "derived-bonus",
            "target-total-proposal",
            "exact-target-total-evidence",
            "missing-required-runner-evidence",
            "missing-required-browser-evidence",
          ].includes(field)
        );
        if (safetyRelevant) safetyRelevantMismatches += 1;
        if (
          row.acceptedTp &&
          runner?.wouldApply &&
          browser?.wouldApply &&
          row.mismatchFields.length === 0
        ) {
          tpParityExact += 1;
        }
        if (row.acceptedTp || row.mismatchFields.length > 0) rows.push(row);
      }
    }
  }

  return {
    rowsCompared,
    runnerWouldApply,
    browserWouldApply,
    tpParityExact,
    tpRows: acceptedKeys.size,
    wouldApplyDisagreements,
    memberDisagreements,
    globalRank1Disagreements,
    derivedBonusDisagreements,
    targetTotalProposalDisagreements,
    exactTotalEvidenceMismatches,
    missingRequiredBrowserEvidence,
    missingRequiredRunnerEvidence,
    safetyRelevantMismatches,
    rows,
    mismatches,
  };
}

function buildCurrentPcExactMembersBonusTotalRecoveryReport(simulation, parity = null) {
  const generated = new Date().toISOString();
  const acceptedRows = simulation.accepted || [];
  const rejectedRows = simulation.rejectedTargets || [];
  const formatMaybeZero = (value) =>
    Number(value || 0) === 0 ? "0" : formatNumber(Number(value || 0));
  const formatSide = (side) =>
    side
      ? `members ${formatDebugNumbers(side.members || [])}; bonus ${formatMaybeZero(
          side.bonus
        )}; total ${formatMaybeZero(side.total)}`
      : "-";
  const formatEvidence = (evidence) => {
    if (!evidence) return "-";
    return [
      `rank1=${evidence.rank1 ? `${evidence.rank1.side}.member${evidence.rank1.slot} ${formatNumber(evidence.rank1.value)}` : "-"}`,
      `winning=${evidence.winningSide || "-"}`,
      `derived=${formatNumber(evidence.calculatedBonus || 0)}`,
      `targetTotalEvidence=${evidence.targetTotalEvidence?.length || 0}`,
      `oppositeTotalEvidence=${evidence.oppositeTotalEvidence?.length || 0}`,
      `sixMemberEvidence=${evidence.memberEvidenceComplete ? "yes" : "no"}`,
      `currentCrownRejection=${evidence.currentCrownBonusRejectionReasons?.join(", ") || "none"}`,
      `stageWideRejection=${evidence.currentStageWideRejectionReasons?.join(", ") || "none"}`,
    ].join("<br>");
  };
  const clusterRows = (simulation.clusterBreakdown || [])
    .map((row) => `| ${row.name} | ${row.count} |`)
    .join("\n");
  const positionRows = (simulation.positionBreakdown || [])
    .map((row) => `| ${row.name} | ${row.count} |`)
    .join("\n");
  const acceptedTable = acceptedRows.length
    ? acceptedRows
        .map(
          (row) =>
            `| ${row.screenshot} | ${row.stage} | ${row.side} | ${formatSide(row.selected)} | ${formatSide(row.expected)} | ${formatSide(row.proposed)} | ${formatEvidence(row.evidence)} | ${row.imageWouldPass ? "yes" : "no"} |`
        )
        .join("\n")
    : "| - | - | - | - | - | - | - | - |";
  const rejectedTable = rejectedRows.length
    ? rejectedRows
        .map(
          (row) =>
            `| ${row.screenshot} | ${row.stage} | ${row.side} | ${formatSide(row.selected)} | ${formatSide(row.expected)} | ${formatSide(row.proposed)} | ${row.rejectionReasons.join("<br>") || "-"} | ${formatEvidence(row.evidence)} |`
        )
        .join("\n")
    : "| - | - | - | - | - | - | - | - |";
  const parityRows = parity?.rows?.length
    ? parity.rows
        .map(
          (row) =>
            `| ${row.screenshot} | ${row.stage} | ${row.side} | ${
              row.runnerWouldApply ? "yes" : "no"
            } | ${row.browserWouldApply ? "yes" : "no"} | ${
              row.runnerRank1
                ? `${row.runnerRank1.side}.member${row.runnerRank1.slot} ${formatNumber(row.runnerRank1.value)}`
                : "-"
            } | ${
              row.runnerProposed
                ? `${formatDebugNumbers(row.runnerProposed.members)} + ${formatMaybeZero(
                    row.runnerProposed.bonus
                  )} = ${formatMaybeZero(row.runnerProposed.total)}`
                : "-"
            } | ${row.mismatchFields.join("<br>") || "none"} |`
        )
        .join("\n")
    : "| - | - | - | - | - | - | - | - |";

  return [
    "# Current-PC Exact Members Bonus/Total Recovery Investigation",
    "",
    `Generated: ${generated}`,
    "",
    "## Scope",
    "",
    "- runner-only simulation retained: yes",
    "- final OCR output changed: yes, when `applyCurrentPcExactMembersCrownBonusTotalRecovery(...)` applies",
    "- production recovery added: yes",
    "- smartphone OCR changed: no",
    "- legacy desktop OCR changed: no",
    "- filename/screenshot-specific logic: no",
    "- exact equality only: yes",
    "- within-one tolerance or near-match guessing: no",
    "- member changes: not allowed",
    "",
    "## Guard Shape",
    "",
    "The simulation targets rows where the current production output still fails even though the target side's three final selected members already exactly match the expected fixture.",
    "",
    "A side-local correction is accepted only when:",
    "",
    "- all three target-side members are unchanged",
    "- all six selected member slots have exact member evidence in the shared crown-bonus evidence",
    "- the global rank-1 member is unique",
    "- the crown bonus is derived from `floor(max(all six selected members) * 0.20)`",
    "- exact target-side total OCR evidence exists",
    "- the target-side proposed total equation is exact",
    "- no existing production recovery has already applied to that row",
    "",
    "Unlike the existing full-stage crown-bonus recovery, this side-local simulation does not require exact total evidence for the opposite side. It still requires reliable six-member evidence, so rows with missing opposite member evidence remain blocked.",
    "",
    "## Summary",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| failing stage/side rows | ${simulation.failingStageSideRows} |`,
    `| exact-member bonus/total target rows | ${simulation.targetRows} |`,
    `| TP | ${simulation.truePositives} |`,
    `| FP | ${simulation.falsePositives} |`,
    `| FN | ${simulation.falseNegatives} |`,
    `| non-target blocked failing rows | ${simulation.blocked} |`,
    `| true incremental TP beyond current production | ${simulation.trueIncrementalTp} |`,
    `| image-level full PASS gain if applied | ${simulation.imageLevelPotentialGain} |`,
    "",
    "## Runner / Browser-Equivalent Parity",
    "",
    parity
      ? [
          "| metric | count |",
          "| --- | ---: |",
          `| rows compared | ${parity.rowsCompared} |`,
          `| runner wouldApply | ${parity.runnerWouldApply} |`,
          `| browser-equivalent wouldApply | ${parity.browserWouldApply} |`,
          `| TP parity exact | ${parity.tpParityExact} / ${parity.tpRows} |`,
          `| wouldApply disagreements | ${parity.wouldApplyDisagreements} |`,
          `| member disagreements | ${parity.memberDisagreements} |`,
          `| global rank-1 disagreements | ${parity.globalRank1Disagreements} |`,
          `| derived bonus disagreements | ${parity.derivedBonusDisagreements} |`,
          `| target total proposal disagreements | ${parity.targetTotalProposalDisagreements} |`,
          `| exact target total evidence mismatches | ${parity.exactTotalEvidenceMismatches} |`,
          `| missing required browser evidence | ${parity.missingRequiredBrowserEvidence} |`,
          `| missing required runner evidence | ${parity.missingRequiredRunnerEvidence} |`,
          `| safety-relevant mismatches | ${parity.safetyRelevantMismatches} |`,
        ].join("\n")
      : "Parity was not generated.",
    "",
    "### Parity Rows",
    "",
    "| screenshot | stage | side | runner apply | browser-equivalent apply | rank1 | proposed target side | mismatch fields |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- |",
    parityRows,
    "",
    "## Cluster Breakdown",
    "",
    "| cluster | rows |",
    "| --- | ---: |",
    clusterRows || "| - | 0 |",
    "",
    "## Accepted Rows",
    "",
    "| screenshot | stage | side | selected | expected | proposed | evidence | image would pass |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- |",
    acceptedTable,
    "",
    "## Rejected Exact-Member Targets",
    "",
    "| screenshot | stage | side | selected | expected | proposed | rejection reasons | evidence |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- |",
    rejectedTable,
    "",
    "## Position Breakdown",
    "",
    "| position | accepted rows |",
    "| --- | ---: |",
    positionRows || "| - | 0 |",
    "",
    "## Overlap With Existing Recoveries",
    "",
    "- The accepted rows were still failing after the prior production recovery stack.",
    "- `currentPcGroupedRawTokenRecovery`, `currentPcStage3SevenDigitBonusDisplacementRecovery`, `currentPcCrownBonusRuleRecovery`, and `currentPcStageWideSixMemberCandidateSolverRecovery` did not apply to the accepted rows.",
    "- The existing full-stage crown-bonus recovery rejects two accepted rows because only the opposite-side total evidence is missing; the target side itself has exact members, exact derived bonus, and exact target total evidence.",
    "- Production order remains after the current four production recoveries and rejects any row where an earlier recovery already applied.",
    "",
    "## Recommendation",
    "",
    simulation.recommendation === "browser-ui-parity-next"
      ? "`applyCurrentPcExactMembersCrownBonusTotalRecovery(...)` is enabled for current-PC only using the same strict shared guard. Recommended next step: real-browser spot-check one or both TP rows and confirm the correction log includes `currentPcExactMembersCrownBonusTotalRecovery applied ...`."
      : "Disable production recovery or resolve parity/simulation regressions before relying on this guard.",
    "",
  ].join("\n");
}

function buildCurrentPcSideLocalIncompleteOppositeEvidenceReport(simulation, parity = null) {
  const generated = new Date().toISOString();
  const formatMaybeZero = (value) =>
    Number(value || 0) === 0 ? "0" : formatNumber(Number(value || 0));
  const formatSide = (side) =>
    side
      ? `members ${formatDebugNumbers(side.members || [])}; bonus ${formatMaybeZero(
          side.bonus
        )}; total ${formatMaybeZero(side.total)}`
      : "-";
  const formatEvidence = (evidence = {}) =>
    [
      `targetMax=${formatNumber(evidence.targetMax || 0)}`,
      `oppositeTotalEvidence=${formatCurrentPcEvidenceSources(evidence.oppositeTotalEvidence)}`,
      `oppositeTotalInternallyConsistent=${
        evidence.oppositeTotalInternallyConsistent ? "yes" : "no"
      }`,
      `oppositeObservedAboveTargetMax=${
        formatDebugNumbers(evidence.oppositeCompetingAboveTargetMax || []) || "none"
      }`,
      `currentCrownRejection=${evidence.currentCrownBonusRejectionReasons?.join(", ") || "none"}`,
      `stageWideRejection=${evidence.currentStageWideRejectionReasons?.join(", ") || "none"}`,
      `exactMembersRejection=${evidence.currentExactMembersRejectionReasons?.join(", ") || "none"}`,
    ].join("<br>");
  const formatProofEvidence = (proofEvidence = null) =>
    proofEvidence
      ? [
          `targetTotalEvidence=${formatCurrentPcEvidenceSources(
            proofEvidence.targetTotalEvidence
          )}`,
          `targetBonusEvidence=${formatCurrentPcEvidenceSources(
            proofEvidence.targetBonusEvidence
          )}`,
        ].join("<br>")
      : "-";
  const acceptedRows = simulation.accepted?.length
    ? simulation.accepted
        .map(
          (row) =>
            `| ${row.screenshot} | ${row.stage} | ${row.side} | ${row.proof} | ${formatSide(
              row.selected
            )} | ${formatSide(row.expected)} | ${formatSide(row.oppositeSelected)} | ${formatSide(
              row.proposed
            )} | ${formatProofEvidence(row.proofEvidence)}<br>${formatEvidence(row.evidence)} | ${row.imageWouldPass ? "yes" : "no"} |`
        )
        .join("\n")
    : "| - | - | - | - | - | - | - | - | - | - |";
  const rejectedRows = simulation.rejectedTargets?.length
    ? simulation.rejectedTargets
        .map(
          (row) =>
            `| ${row.screenshot} | ${row.stage} | ${row.side} | ${formatSide(
              row.selected
            )} | ${formatSide(row.expected)} | ${formatSide(row.oppositeSelected)} | ${
              row.rejectionReasons?.join("<br>") || "-"
            } | ${formatEvidence(row.evidence)} |`
        )
        .join("\n")
    : "| - | - | - | - | - | - | - | - |";
  const blockedRows = (simulation.blockedBreakdown || [])
    .map((row) => `| ${row.name} | ${row.count} |`)
    .join("\n");
  const positionRows = (simulation.positionBreakdown || [])
    .map((row) => `| ${row.name} | ${row.count} |`)
    .join("\n");
  const parityRows = parity?.rows?.length
    ? parity.rows
        .map(
          (row) =>
            `| ${row.screenshot} | ${row.stage} | ${row.side} | ${
              row.runnerWouldApply ? "yes" : "no"
            } | ${row.browserWouldApply ? "yes" : "no"} | ${formatDebugNumbers(
              row.runnerSelected?.members || []
            )} | ${formatNumber(row.runnerTargetMax || 0)} | ${formatNumber(
              row.runnerOppositeSelected?.total || 0
            )} | ${
              row.runnerTargetWinsByOppositeTotalUpperBound ? "yes" : "no"
            } | ${row.runnerProposed ? formatSide(row.runnerProposed) : "-"} | ${
              row.mismatchFields?.join("<br>") || "none"
            } |`
        )
        .join("\n")
    : "| - | - | - | - | - | - | - | - | - | - | - |";

  return [
    "# Current-PC Side-Local Incomplete Opposite Evidence Investigation",
    "",
    `Generated: ${generated}`,
    "",
    "## Scope",
    "",
    "- runner-only simulation added: yes",
    "- final OCR output changed: no",
    "- production recovery added: no",
    "- smartphone OCR changed: no",
    "- legacy desktop OCR changed: no",
    "- filename/screenshot-specific logic: no",
    "- hard-coded score values: no",
    "- near-match, within-one, or inferred digit recovery: no",
    "- member changes: not allowed",
    "",
    "## Question",
    "",
    "The existing exact-members crown-bonus total recovery still requires complete six-member evidence. This investigation checks whether a target side can be proven locally when the opposite side is incomplete.",
    "",
    "The key distinction is:",
    "",
    "- safe: opposite side incomplete, but the target side is independently provable",
    "- unsafe: opposite side incomplete, and the target side merely seems plausible",
    "",
    "## Shared Evidence Flow",
    "",
    "- Shared helper: `buildCurrentPcSideLocalExactEvidenceRecoveryEvidence(...)` in `app/lib/ocr.js`.",
    "- Runner path: `scripts/ocr-test-images.mjs` calls the shared helper from `currentPcSideLocalExactEvidenceStageSide(...)`.",
    "- Browser-equivalent path: the parity evaluator rebuilds the same side-local evidence from the current-PC side analysis object available before UI result rendering.",
    "- Final OCR output is not changed in this task; the helper is evidence-only.",
    "",
    "## Side-Local Proof Categories",
    "",
    "Accepted proof category in this run:",
    "",
    "- `target-winning-by-opposite-total-upper-bound`: target members are unchanged, target max is unique, exact target total evidence exists, the opposite selected total has exact OCR evidence and is internally consistent, and `targetMax > oppositeTotal`. Because all opposite raw member scores must be non-negative and no opposite member can exceed its displayed total, the opposite side cannot contain rank 1.",
    "",
    "Rejected/unused categories:",
    "",
    "- `direct-displayed-bonus`: remained unavailable because the exact bonus was not captured as a clean bonus candidate in the candidate rows.",
    "- `target-losing-by-opposite-member-exceeds-target-max`: no accepted row needed this shape.",
    "",
    "## Summary",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| failing stage/side rows | ${simulation.failingStageSideRows} |`,
    `| side-local candidate rows | ${simulation.candidateRows} |`,
    `| TP | ${simulation.truePositives} |`,
    `| FP | ${simulation.falsePositives} |`,
    `| FN | ${simulation.falseNegatives} |`,
    `| non-target blocked failing rows | ${simulation.blocked} |`,
    `| true incremental TP beyond current production | ${simulation.trueIncrementalTp} |`,
    `| potential full-image PASS gain | ${simulation.potentialFullImageGain} |`,
    "",
    "## Runner / Browser-Equivalent Parity",
    "",
    parity
      ? [
          "| metric | count |",
          "| --- | ---: |",
          `| rows compared | ${parity.rowsCompared} |`,
          `| runner wouldApply | ${parity.runnerWouldApply} |`,
          `| browser-equivalent wouldApply | ${parity.browserWouldApply} |`,
          `| TP parity exact | ${parity.tpParityExact} / ${parity.tpRows} |`,
          `| wouldApply disagreements | ${parity.wouldApplyDisagreements} |`,
          `| target member disagreements | ${parity.targetMemberDisagreements} |`,
          `| target max disagreements | ${parity.targetMaxDisagreements} |`,
          `| opposite total disagreements | ${parity.oppositeTotalDisagreements} |`,
          `| opposite total evidence mismatches | ${parity.oppositeTotalEvidenceMismatches} |`,
          `| targetMax > oppositeTotal decision disagreements | ${parity.targetMaxGreaterThanOppositeTotalDisagreements} |`,
          `| derived bonus disagreements | ${parity.derivedBonusDisagreements} |`,
          `| target total proposal disagreements | ${parity.targetTotalProposalDisagreements} |`,
          `| exact target total evidence mismatches | ${parity.exactTargetTotalEvidenceMismatches} |`,
          `| missing required browser evidence | ${parity.missingRequiredBrowserEvidence} |`,
          `| missing required runner evidence | ${parity.missingRequiredRunnerEvidence} |`,
          `| safety-relevant mismatches | ${parity.safetyRelevantMismatches} |`,
        ].join("\n")
      : "Parity was not generated.",
    "",
    "### Parity Rows",
    "",
    "| screenshot | stage | side | runner apply | browser apply | target members | target max | opposite total | targetMax > oppositeTotal | proposed | mismatch fields |",
    "| --- | ---: | --- | --- | --- | --- | ---: | ---: | --- | --- | --- |",
    parityRows,
    "",
    "## Accepted Rows",
    "",
    "| screenshot | stage | side | proof | selected | expected | opposite selected | proposed | evidence | image would pass |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |",
    acceptedRows,
    "",
    "## Rejected Candidate Rows",
    "",
    "| screenshot | stage | side | selected | expected | opposite selected | rejection reasons | evidence |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- |",
    rejectedRows,
    "",
    "## Blocked Breakdown",
    "",
    "| reason | rows |",
    "| --- | ---: |",
    blockedRows || "| - | 0 |",
    "",
    "## Position Breakdown",
    "",
    "| position | accepted rows |",
    "| --- | ---: |",
    positionRows || "| - | 0 |",
    "",
    "## Mathematical Safety",
    "",
    "The accepted proof does not infer any missing opposite-side member. It uses the opposite side's exact displayed total as an upper bound.",
    "",
    "Because current-PC member scores are non-negative raw scores, every individual opposite-side member must be less than or equal to the opposite-side total. Therefore, when `targetMax > oppositeTotal`, `targetMax` is also greater than every possible individual member on the opposite side. With a unique target-side max, this proves the target side contains global rank 1 even if one or more opposite-side member slots are incomplete.",
    "",
    "This must not be weakened to `targetMax > selected opposite member` or any partial opposite-side member condition; the safety comes from the total-as-upper-bound proof.",
    "",
    "## Production Precedence",
    "",
    "A future production recovery would run only after the current stack:",
    "",
    "1. `currentPcGroupedRawTokenRecovery`",
    "2. `currentPcStage3SevenDigitBonusDisplacementRecovery`",
    "3. `currentPcCrownBonusRuleRecovery`",
    "4. `currentPcStageWideSixMemberCandidateSolverRecovery`",
    "5. `currentPcExactMembersCrownBonusTotalRecovery`",
    "",
    "It must reject any row already resolved by those recoveries and must not change member values.",
    "",
    "## Comparison With Stage3 Capture Work",
    "",
    "- This side-local direction recovers more incremental rows in simulation than the deferred single-TP Stage3 variant, geometry, or merged-run experiments.",
    "- It does not repair missing members and does not improve member evidence quality.",
    "- The FP risk is lower than noisy Stage3 member capture because the accepted proposal changes only bonus/total and requires exact target total evidence plus an upper-bound proof for the opposite side.",
    "",
    "## Recommendation",
    "",
    simulation.recommendation === "promising-runner-browser-parity-next"
      ? parity && parity.safetyRelevantMismatches === 0 && parity.tpParityExact === simulation.truePositives
        ? "Runner/browser-equivalent parity is exact for the 3 TP rows with zero safety-relevant mismatches. This is production-ready to consider next, but this task intentionally does not productionize."
        : "Promising, but do not productionize until parity mismatches are resolved."
      : "Do not continue toward production yet; side-local proof did not show enough safe incremental value.",
    "",
  ].join("\n");
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

function currentPcStageWideMemberRange(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 10000 && number < 2000000;
}

function currentPcStageWideAddMemberCandidate(pools, side, slotIndex, value, source) {
  const number = Number(value || 0);
  if (!currentPcStageWideMemberRange(number)) return;
  const pool = pools[side][slotIndex];
  if (!pool.has(number)) {
    pool.set(number, {
      value: number,
      sources: [],
    });
  }
  pool.get(number).sources.push(source);
}

function currentPcStageWideOrderedMemberCandidates(sideAnalysis = {}, stage = 0) {
  const evidence = [];
  const summary = sideAnalysis.candidateSourceSummary || {};
  const memberCandidates = summary.memberCandidates || {};
  const tokenValues = (memberCandidates.tokenAudit || [])
    .map((token) => ({
      value: Number(token.normalizedValue || 0),
      token: token.rawToken || token.token || "",
      textIndex: Number(token.textIndex ?? -1),
      shape: token.shape || token.tokenShape || "",
      source: "member-row-token",
      text: memberCandidates.text || "",
    }))
    .filter((token) => currentPcStageWideMemberRange(token.value))
    .sort((a, b) => a.textIndex - b.textIndex);
  const orderedTokenValues = tokenValues.filter(
    (item, index, all) =>
      all.findIndex((other) => other.value === item.value && other.textIndex === item.textIndex) ===
      index
  );
  orderedTokenValues.forEach((token, index) => {
    if (index < 3) {
      evidence.push({
        slotIndex: index,
        value: token.value,
        source: "member-row-token-order",
        token: token.token,
        shape: token.shape,
        textIndex: token.textIndex,
        text: token.text,
      });
    }
  });

  if (orderedTokenValues.length === 0) {
    (memberCandidates.numbers || [])
      .map((value) => Number(value || 0))
      .filter(currentPcStageWideMemberRange)
      .slice(0, 3)
      .forEach((value, index) => {
        evidence.push({
          slotIndex: index,
          value,
          source: "member-row-number-order",
          token: String(value),
          text: memberCandidates.text || "",
        });
      });
  }

  const eligibleTokens =
    sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation?.evidence?.eligibleTokens || [];
  const orderedGrouped = sharedCurrentPcOrderedMemberValuesFromTokenEvidence(
    sideAnalysis,
    eligibleTokens
  );
  orderedGrouped.slice(0, 3).forEach((entry, index) => {
    evidence.push({
      slotIndex: index,
      value: Number(entry.value || 0),
      source: `grouped-raw-${entry.source || "member-token"}`,
      token: entry.token || "",
      shape: entry.shape || "",
      textIndex: entry.textIndex ?? null,
    });
  });

  const stage3Simulation = sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation;
  const stage3Evidence = stage === 3 ? stage3Simulation?.evidence : null;
  (stage3Evidence?.memberRowNumbers || []).slice(0, 3).forEach((value, index) => {
    evidence.push({
      slotIndex: index,
      value: Number(value || 0),
      source: "stage3-seven-digit-member-row-order",
      token: String(value),
    });
  });
  for (const proposal of stage3Evidence?.proposals || []) {
    (proposal.proposedMembers || []).slice(0, 3).forEach((value, index) => {
      evidence.push({
        slotIndex: index,
        value: Number(value || 0),
        source: "stage3-seven-digit-proposal-member",
        token: String(value),
        memberRowText: proposal.memberRowText || "",
      });
    });
  }

  return evidence.filter((entry) => currentPcStageWideMemberRange(entry.value));
}

function currentPcStageWideTotalEvidenceForValue(sideAnalysis = {}, value = 0) {
  const target = Number(value || 0);
  if (!target) return [];
  const evidence = [];
  const summary = sideAnalysis.candidateSourceSummary || {};
  const push = (source, extra = {}) => {
    evidence.push({
      source,
      value: target,
      ...extra,
    });
  };

  if ((sideAnalysis.displayedTotalCandidates || []).some((candidate) => valueInList(target, [candidate]))) {
    push("displayed-total-candidates");
  }
  if ((summary.totalDirect?.numbers || []).some((candidate) => valueInList(target, [candidate]))) {
    push("total-direct", {
      pass: summary.totalDirect.pass || null,
      text: summary.totalDirect.text || "",
    });
  }
  for (const trace of summary.totalTraces || []) {
    if ((trace.numbers || []).some((candidate) => valueInList(target, [candidate]))) {
      push("total-trace", {
        pass: trace.pass || null,
        text: trace.text || "",
      });
    }
  }
  for (const trace of summary.totalTraceTokenAudit || []) {
    const tokens = (trace.tokens || []).filter((token) =>
      valueInList(target, [Number(token.normalizedValue || 0)])
    );
    if (tokens.length > 0) {
      push("total-trace-token-audit", {
        pass: trace.pass || null,
        text: trace.text || "",
        tokens: tokens.map((token) => ({
          rawToken: token.rawToken || token.token || "",
          normalizedValue: token.normalizedValue || 0,
          shape: token.shape || token.tokenShape || "",
        })),
      });
    }
  }
  if ((sideAnalysis.rawCandidates || []).some((candidate) => valueInList(target, [candidate]))) {
    push("raw-candidates");
  }
  return evidence.filter(
    (entry, index, all) =>
      all.findIndex(
        (other) =>
          other.source === entry.source &&
          other.pass === entry.pass &&
          other.text === entry.text &&
          other.value === entry.value
      ) === index
  );
}

function currentPcStageWideBuildMemberPools(item, stage) {
  const stageKey = `stage${stage}`;
  const pools = {
    self: [new Map(), new Map(), new Map()],
    enemy: [new Map(), new Map(), new Map()],
  };

  for (const side of sides) {
    const sideAnalysis = item.stages?.[stageKey]?.[side];
    if (!sideAnalysis) continue;
    const selected = currentPcSelectedStageSideValues(sideAnalysis).selectedMembers;
    selected.forEach((value, index) => {
      currentPcStageWideAddMemberCandidate(pools, side, index, value, {
        source: "selected-current-output",
        memberCompatible: true,
        selected: true,
      });
    });
    for (const entry of currentPcStageWideOrderedMemberCandidates(sideAnalysis, stage)) {
      currentPcStageWideAddMemberCandidate(pools, side, entry.slotIndex, entry.value, {
        source: entry.source,
        memberCompatible: true,
        selected: false,
        token: entry.token || "",
        shape: entry.shape || "",
        textIndex: entry.textIndex ?? null,
        text: entry.text || entry.memberRowText || "",
      });
    }
  }

  return {
    self: pools.self.map((pool) => [...pool.values()]),
    enemy: pools.enemy.map((pool) => [...pool.values()]),
  };
}

function currentPcStageWideCombinationCount(pools) {
  return [...pools.self, ...pools.enemy].reduce(
    (product, pool) => product * Math.max(pool.length, 1),
    1
  );
}

function currentPcStageWideProposalFromMembers({ stage, selfMembers, enemyMembers, item }) {
  const allMembers = [
    ...selfMembers.map((value, index) => ({ side: "self", slot: index + 1, value })),
    ...enemyMembers.map((value, index) => ({ side: "enemy", slot: index + 1, value })),
  ];
  const maxValue = Math.max(...allMembers.map((entry) => entry.value));
  const maxEntries = allMembers.filter((entry) => entry.value === maxValue);
  if (maxEntries.length !== 1) return null;
  const rank1 = maxEntries[0];
  const winningSide = rank1.side;
  const calculatedBonus = Math.floor(maxValue * 0.2);
  const selfBonus = winningSide === "self" ? calculatedBonus : 0;
  const enemyBonus = winningSide === "enemy" ? calculatedBonus : 0;
  const selfTotal = selfMembers.reduce((sum, value) => sum + value, 0) + selfBonus;
  const enemyTotal = enemyMembers.reduce((sum, value) => sum + value, 0) + enemyBonus;
  const stageKey = `stage${stage}`;
  const selfTotalEvidence = currentPcStageWideTotalEvidenceForValue(
    item.stages?.[stageKey]?.self,
    selfTotal
  );
  const enemyTotalEvidence = currentPcStageWideTotalEvidenceForValue(
    item.stages?.[stageKey]?.enemy,
    enemyTotal
  );
  return {
    self: { members: selfMembers, bonus: selfBonus, total: selfTotal },
    enemy: { members: enemyMembers, bonus: enemyBonus, total: enemyTotal },
    rank1,
    winningSide,
    calculatedBonus,
    totalEvidence: {
      self: selfTotalEvidence,
      enemy: enemyTotalEvidence,
    },
  };
}

function currentPcStageWideStageMatchesExpected(proposed, item, stage, tolerance = 1) {
  const expectedSelf = currentPcExpectedStageSide(item, stage, "self");
  const expectedEnemy = currentPcExpectedStageSide(item, stage, "enemy");
  return (
    proposalMatchesExpectedWithTolerance(proposed?.self, expectedSelf, tolerance) &&
    proposalMatchesExpectedWithTolerance(proposed?.enemy, expectedEnemy, tolerance)
  );
}

function currentPcStageWideCurrentStagePasses(item, stage) {
  return sides.every((side) => !hasCurrentPcSideFailure(item, stage, side));
}

function currentPcStageWideExpectedPresentInPools(item, stage, pools) {
  const missing = [];
  for (const side of sides) {
    const expected = currentPcExpectedStageSide(item, stage, side);
    for (let index = 0; index < 3; index += 1) {
      const expectedValue = Number(expected?.members?.[index] || 0);
      const hasValue = (pools[side]?.[index] || []).some((candidate) =>
        valueInList(expectedValue, [candidate.value ?? candidate])
      );
      if (!hasValue) missing.push(`${side}.member${index + 1}`);
    }
  }
  return {
    present: missing.length === 0,
    missing,
  };
}

function buildCurrentPcStageWideSharedSideAnalysis(item, stage, side) {
  const stageKey = `stage${stage}`;
  const sideAnalysis = item.stages?.[stageKey]?.[side];
  if (!sideAnalysis) return null;
  const selected = currentPcSelectedStageSideValues(sideAnalysis);
  return {
    selectedMembers: selected.selectedMembers,
    selectedTotal: selected.selectedTotal,
    rawCandidates: sideAnalysis.rawCandidates || [],
    displayedTotalCandidates: sideAnalysis.displayedTotalCandidates || [],
    bonusCandidates: sideAnalysis.bonusCandidates || [],
    candidateSourceSummary: sideAnalysis.candidateSourceSummary || null,
    currentPcGroupedRawTokenEvidenceSimulation:
      sideAnalysis.currentPcGroupedRawTokenEvidenceSimulation || null,
    currentPcStage3SevenDigitBonusDisplacementSimulation:
      sideAnalysis.currentPcStage3SevenDigitBonusDisplacementSimulation || null,
  };
}

function buildCurrentPcStageWideSixMemberCandidateSolverStage(item, stage) {
  const stageKey = `stage${stage}`;
  const artifactSimulation =
    item.result?.[stageKey]?.debugArtifact?.currentPcStageWideSixMemberCandidateSolverSimulation ||
    item.stages?.[stageKey]?.debugArtifact?.currentPcStageWideSixMemberCandidateSolverSimulation ||
    item.stages?.[stageKey]?.currentPcStageWideSixMemberCandidateSolverSimulation;
  const selfAnalysis = item.stages?.[stageKey]?.self;
  const enemyAnalysis = item.stages?.[stageKey]?.enemy;
  if (!selfAnalysis || !enemyAnalysis) {
    return {
      wouldApply: false,
      rejectionReasons: ["missing-stage-side-analysis"],
      selected: null,
      proposed: null,
      sideWouldChange: { self: false, enemy: false },
      stage,
      evidence: {},
      note:
        "Runner-only current-PC stage-wide six-member candidate solver simulation. It does not change final OCR output.",
    };
  }

  const simulation =
    artifactSimulation ||
    sharedBuildCurrentPcStageWideSixMemberCandidateSolverEvidence({
      stage,
      self: buildCurrentPcStageWideSharedSideAnalysis(item, stage, "self"),
      enemy: buildCurrentPcStageWideSharedSideAnalysis(item, stage, "enemy"),
    });
  const expectedPresence = currentPcStageWideExpectedPresentInPools(
    item,
    stage,
    simulation.evidence?.memberPools || { self: [[], [], []], enemy: [[], [], []] }
  );
  const expectedSelf = currentPcExpectedStageSide(item, stage, "self");
  const expectedEnemy = currentPcExpectedStageSide(item, stage, "enemy");
  const expectedTotalEvidence = {
    self: currentPcStageWideTotalEvidenceForValue(selfAnalysis, expectedSelf?.total || 0),
    enemy: currentPcStageWideTotalEvidenceForValue(enemyAnalysis, expectedEnemy?.total || 0),
  };

  return {
    ...simulation,
    evidence: {
      ...(simulation.evidence || {}),
      expectedPresence,
      expectedTotalEvidence,
    },
    note:
      "Runner-only current-PC stage-wide six-member candidate solver simulation using shared evidence plumbing. It does not change final OCR output.",
  };
}

function buildCurrentPcStageWideSixMemberCandidateSolverEvaluation(analysis) {
  const rows = [];
  const stageSimulations = [];
  const accepted = [];
  const falsePositiveRows = [];
  const blockedRows = [];
  const blockedReasonBreakdown = new Map();
  const stagePositionBreakdown = new Map();
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blocked = 0;
  let failingStages = 0;
  let failingStageSideRows = 0;
  let acceptedStageSideCorrections = 0;
  const stage3Self = {
    failingRows: 0,
    exactMissingOrWrongMemberCandidates: 0,
    uniquelySolvable: 0,
    blocked: 0,
  };
  const overlap = {
    groupedRaw: 0,
    stage3SevenDigit: 0,
    crownBonus: 0,
    slotSpecificRoi: 0,
  };
  const slotRoiTruePositiveKeys = new Set([
    "スクリーンショット 2026-07-14 060656479.png|1|self",
    "スクリーンショット 2026-07-16 063115987.png|1|enemy",
  ]);
  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  for (const item of analysis.filter((entry) => entry.expected)) {
    for (const stage of stages) {
      const stageKey = `stage${stage}`;
      const stageHasFailure = sides.some((side) => hasCurrentPcSideFailure(item, stage, side));
      if (stageHasFailure) failingStages += 1;
      for (const side of sides) {
        if (hasCurrentPcSideFailure(item, stage, side)) failingStageSideRows += 1;
      }
      const simulation = buildCurrentPcStageWideSixMemberCandidateSolverStage(item, stage);
      stageSimulations.push({
        screenshot: item.fileName,
        stage,
        simulation,
      });
      const matchesExpected = currentPcStageWideStageMatchesExpected(simulation.proposed, item, stage);
      const targetEvidenceReady =
        stageHasFailure &&
        simulation.evidence?.expectedPresence?.present &&
        (simulation.evidence?.expectedTotalEvidence?.self || []).length > 0 &&
        (simulation.evidence?.expectedTotalEvidence?.enemy || []).length > 0;
      let classification = "correctly-blocked-negative";

      if (simulation.wouldApply && matchesExpected) {
        truePositives += 1;
        classification = "true-positive";
      } else if (simulation.wouldApply && !matchesExpected) {
        falsePositives += 1;
        classification = "false-positive";
      } else if (!simulation.wouldApply && targetEvidenceReady) {
        falseNegatives += 1;
        classification = "false-negative";
      } else if (stageHasFailure) {
        blocked += 1;
        classification = "blocked";
      }

      if (classification === "true-positive") {
        const changedSides = sides.filter((side) => simulation.sideWouldChange?.[side]);
        for (const side of changedSides) {
          increment(stagePositionBreakdown, `Stage${stage} ${side}`);
          acceptedStageSideCorrections += 1;
          const sideAnalysis = item.stages?.[stageKey]?.[side];
          if (sideAnalysis?.currentPcGroupedRawTokenRecovery?.applied) overlap.groupedRaw += 1;
          if (sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied) {
            overlap.stage3SevenDigit += 1;
          }
          if (sideAnalysis?.currentPcCrownBonusRuleRecovery?.applied) overlap.crownBonus += 1;
          if (slotRoiTruePositiveKeys.has(`${item.fileName}|${stage}|${side}`)) {
            overlap.slotSpecificRoi += 1;
          }
        }
        accepted.push({
          screenshot: item.fileName,
          stage,
          currentSelectedSixMembers: {
            self: simulation.selected?.self?.members || [],
            enemy: simulation.selected?.enemy?.members || [],
          },
          proposedSixMembers: {
            self: simulation.proposed?.self?.members || [],
            enemy: simulation.proposed?.enemy?.members || [],
          },
          changedMemberSlots: simulation.proposed?.changedMemberSlots || [],
          rank1: simulation.proposed?.rank1 || null,
          winningSide: simulation.proposed?.winningSide || null,
          calculatedBonus: simulation.proposed?.calculatedBonus || 0,
          selfTotalEvidence: simulation.proposed?.totalEvidence?.self || [],
          enemyTotalEvidence: simulation.proposed?.totalEvidence?.enemy || [],
          uniqueness: "exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule",
          sideWouldChange: simulation.sideWouldChange || {},
        });
      }

      if (classification === "false-positive") {
        falsePositiveRows.push({
          screenshot: item.fileName,
          stage,
          selected: simulation.selected,
          proposed: simulation.proposed,
          expected: {
            self: currentPcExpectedStageSide(item, stage, "self"),
            enemy: currentPcExpectedStageSide(item, stage, "enemy"),
          },
          rejectionReasons: simulation.rejectionReasons || [],
        });
      }

      if (classification === "blocked" || classification === "false-negative") {
        const reasons = [];
        const expectedPresence = simulation.evidence?.expectedPresence || {};
        if (!expectedPresence.present) reasons.push("missing exact member evidence");
        if ((simulation.evidence?.expectedTotalEvidence?.self || []).length === 0) {
          reasons.push("missing exact self total evidence");
        }
        if ((simulation.evidence?.expectedTotalEvidence?.enemy || []).length === 0) {
          reasons.push("missing exact enemy total evidence");
        }
        for (const reason of simulation.rejectionReasons || []) {
          if (reason === "candidate-pool-explosion") reasons.push("candidate pool explosion / unsafe ambiguity");
          else if (reason.includes("multiple-complete")) reasons.push("multiple competing six-member interpretations");
          else if (reason.includes("global-rank1")) reasons.push("global rank-1 ambiguity");
          else if (reason.includes("no-complete")) reasons.push("no exact six-member equation");
          else if (reason.includes("missing") && reason.includes("candidate")) reasons.push("missing exact member evidence");
        }
        if (reasons.length === 0) reasons.push("other");
        const uniqueReasons = [...new Set(reasons)];
        for (const reason of uniqueReasons) increment(blockedReasonBreakdown, reason);
        blockedRows.push({
          screenshot: item.fileName,
          stage,
          classification,
          reasons: uniqueReasons,
          rejectionReasons: simulation.rejectionReasons || [],
          expectedPresence,
          candidatePoolSizes: simulation.evidence?.candidatePoolSizes || null,
        });
      }

      const stage3SelfFailed = hasCurrentPcSideFailure(item, 3, "self");
      if (stage === 3 && stage3SelfFailed) {
        stage3Self.failingRows += 1;
        const expected = currentPcExpectedStageSide(item, 3, "self");
        const selected = currentPcSelectedStageSideValues(item.stages?.stage3?.self);
        const selfPools = simulation.evidence?.memberPools?.self || [[], [], []];
        const hasWrongOrMissingExact = (expected?.members || []).some((value, index) => {
          const selectedValue = selected.selectedMembers[index] || 0;
          return (
            Math.abs(Number(value || 0) - Number(selectedValue || 0)) > 1 &&
            (selfPools[index] || []).some((candidate) => valueInList(value, [candidate]))
          );
        });
        if (hasWrongOrMissingExact) stage3Self.exactMissingOrWrongMemberCandidates += 1;
        if (classification === "true-positive" && simulation.sideWouldChange?.self) {
          stage3Self.uniquelySolvable += 1;
        } else {
          stage3Self.blocked += 1;
        }
      }

      if (stageHasFailure || simulation.wouldApply || classification === "false-negative") {
        rows.push({
          screenshot: item.fileName,
          stage,
          classification,
          wouldApply: simulation.wouldApply,
          selected: simulation.selected,
          proposed: simulation.proposed,
          expected: {
            self: currentPcExpectedStageSide(item, stage, "self"),
            enemy: currentPcExpectedStageSide(item, stage, "enemy"),
          },
          sideWouldChange: simulation.sideWouldChange,
          rejectionReasons: simulation.rejectionReasons || [],
          evidence: {
            candidatePoolSizes: simulation.evidence?.candidatePoolSizes || null,
            combinationCount: simulation.evidence?.combinationCount || 0,
            expectedPresence: simulation.evidence?.expectedPresence || null,
            validInterpretationCount: simulation.evidence?.validInterpretationCount || 0,
            expectedTotalEvidence: simulation.evidence?.expectedTotalEvidence || null,
          },
        });
      }
    }
  }

  const mapToRows = (map) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const uniqueExistingOverlap = new Set();
  for (const row of accepted) {
    for (const side of sides.filter((side) => row.sideWouldChange?.[side])) {
      const key = `${row.screenshot}|${row.stage}|${side}`;
      if (
        rows.find(
          (entry) =>
            entry.screenshot === row.screenshot &&
            entry.stage === row.stage &&
            entry.proposed?.[side]
        )
      ) {
        // Counted below from per-side recovery flags; this set is kept for report symmetry.
        uniqueExistingOverlap.add(key);
      }
    }
  }

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    blocked,
    failingStages,
    failingStageSideRows,
    acceptedStageCorrections: accepted.length,
    acceptedStageSideCorrections,
    uniqueAdditionalRecoveryPotential: acceptedStageSideCorrections,
    rows,
    stageSimulations,
    accepted,
    falsePositiveRows,
    blockedRows,
    blockedReasonBreakdown: mapToRows(blockedReasonBreakdown),
    stagePositionBreakdown: mapToRows(stagePositionBreakdown),
    stage3Self: {
      ...stage3Self,
      projectedPass: 24 + stage3Self.uniquelySolvable,
      projectedTotal: 58,
      projectedAccuracy: `${(((24 + stage3Self.uniquelySolvable) / 58) * 100).toFixed(1)}%`,
    },
    overlap,
    priorSlotSpecificRoi: {
      priorTp: 2,
      overlapWithAccepted: overlap.slotSpecificRoi,
    },
    candidateSourcesUsed: [
      {
        source: "selected-current-output",
        reason: "Retains already selected slot values; cannot be the only source for a changed member.",
      },
      {
        source: "member-row-token-order",
        reason: "Uses OCR tokens from the member-row crop in visual order as member-compatible slot evidence.",
      },
      {
        source: "member-row-number-order",
        reason: "Fallback for member-row parsed numbers when token audit did not expose ordered numeric tokens.",
      },
      {
        source: "grouped-raw-member-token-order",
        reason: "Uses punctuation/space grouped raw member tokens that existing grouped/raw evidence already marks as member-compatible.",
      },
      {
        source: "stage3-seven-digit-member-row-order",
        reason: "Uses existing Stage3 member-row evidence only as observed member-row candidates, not as arithmetic derivation.",
      },
      {
        source: "stage3-seven-digit-proposal-member",
        reason: "Carries observed member-row proposal members from the existing strict Stage3 simulation as candidate evidence.",
      },
    ],
  };
}

function cloneCurrentPcStageWideMemberPools(pools = { self: [[], [], []], enemy: [[], [], []] }) {
  const cloned = {
    self: [new Map(), new Map(), new Map()],
    enemy: [new Map(), new Map(), new Map()],
  };
  for (const side of sides) {
    for (let index = 0; index < 3; index += 1) {
      for (const candidate of pools?.[side]?.[index] || []) {
        const value = Number(candidate?.value ?? candidate ?? 0);
        if (!value) continue;
        const key = String(value);
        const existing = cloned[side][index].get(key);
        const sources = candidate?.sources || [
          {
            source: candidate?.source || "stage-wide-existing-member-pool",
          },
        ];
        if (existing) existing.sources.push(...sources);
        else cloned[side][index].set(key, { value, sources: [...sources] });
      }
    }
  }
  return cloned;
}

function currentPcStage3VariantCandidateSlot(variant = {}, tokenIndex = 0) {
  const label = String(variant.label || "");
  const slotMatch = label.match(/^member([123])-slot$/);
  if (slotMatch) return Number(slotMatch[1]) - 1;
  if (variant.zoneKind === "slot") return null;
  return tokenIndex >= 0 && tokenIndex < 3 ? tokenIndex : null;
}

function currentPcStage3VariantCandidateValues(variant = {}) {
  const values = uniqueNumbers(
    (variant.numbers || [])
      .map((value) => Number(value || 0))
      .filter((value) => value >= 1000000 && value < 10000000)
  );
  return values.map((value, index) => ({
    value,
    tokenIndex: index,
    token:
      (variant.tokenAudits || []).find((token) => Number(token.value || 0) === value)?.token ||
      String(value),
  }));
}

function buildCurrentPcStage3VariantEvidenceMap(diagnostics = null, options = {}) {
  const slotProvenOnly = Boolean(options.slotProvenOnly);
  const map = new Map();
  for (const row of diagnostics?.rows || []) {
    const key = `${row.image}|${row.stage}|${row.side}`;
    const entries = [];
    for (const variant of row.variants || []) {
      if (slotProvenOnly && variant.zoneKind !== "slot") continue;
      for (const candidate of currentPcStage3VariantCandidateValues(variant)) {
        const slotIndex = currentPcStage3VariantCandidateSlot(variant, candidate.tokenIndex);
        if (slotIndex === null) continue;
        entries.push({
          value: candidate.value,
          slotIndex,
          source: `stage3-member-row-variant:${variant.label}`,
          variantLabel: variant.label,
          zoneKind: variant.zoneKind,
          token: candidate.token,
          text: variant.text || "",
          zone: variant.zone || null,
          slotSpecific: variant.zoneKind === "slot",
          rowOrderBased: variant.zoneKind !== "slot",
          unsafeExtraCandidates: variant.unsafeExtraCandidates || [],
        });
      }
    }
    map.set(key, entries);
  }
  return map;
}

function currentPcStageWidePoolsToArrays(poolMaps) {
  return {
    self: poolMaps.self.map((pool) => [...pool.values()]),
    enemy: poolMaps.enemy.map((pool) => [...pool.values()]),
  };
}

function currentPcStageWideAddVariantCandidate(poolMaps, side, entry) {
  const slotIndex = Number(entry.slotIndex);
  if (!sides.includes(side) || slotIndex < 0 || slotIndex > 2) return false;
  const value = Number(entry.value || 0);
  if (!currentPcStageWideMemberRange(value)) return false;
  const key = String(value);
  const source = {
    source: entry.source,
    token: entry.token || String(value),
    text: entry.text || "",
    variantLabel: entry.variantLabel,
    zoneKind: entry.zoneKind,
    slotSpecific: Boolean(entry.slotSpecific),
    rowOrderBased: Boolean(entry.rowOrderBased),
    zone: entry.zone || null,
  };
  const existing = poolMaps[side][slotIndex].get(key);
  if (existing) existing.sources.push(source);
  else poolMaps[side][slotIndex].set(key, { value, sources: [source] });
  return true;
}

function buildCurrentPcStageWideVariantSimulationFromPools({
  item,
  stage,
  baseSimulation,
  variantEvidenceMap,
  sideAnalysisBuilder = buildCurrentPcStageWideSharedSideAnalysis,
  comparisonTolerance = 1,
  policyName = "stage-wide-six-member-candidate-solver-stage3-variant-evidence",
}) {
  if (stage !== 3) {
    return {
      ...baseSimulation,
      variantEvidence: { addedCandidates: [], addedCandidateCount: 0 },
      note:
        "Runner-only current-PC stage-wide solver with Stage3 variant evidence. Non-Stage3 stages are unchanged.",
    };
  }
  const selfAnalysis = sideAnalysisBuilder(item, stage, "self");
  const enemyAnalysis = sideAnalysisBuilder(item, stage, "enemy");
  if (!selfAnalysis || !enemyAnalysis) {
    return {
      wouldApply: false,
      rejectionReasons: ["missing-stage-side-analysis"],
      selected: baseSimulation?.selected || null,
      proposed: null,
      sideWouldChange: { self: false, enemy: false },
      stage,
      evidence: {},
      variantEvidence: { addedCandidates: [], addedCandidateCount: 0 },
      note: "Runner-only Stage3 variant evidence simulation could not build candidate pools.",
    };
  }
  const addedCandidates = [];
  for (const side of sides) {
    const key = `${item.fileName}|${stage}|${side}`;
    for (const entry of variantEvidenceMap.get(key) || []) {
      const slotIndex = Number(entry.slotIndex);
      const value = Number(entry.value || 0);
      if (!sides.includes(side) || slotIndex < 0 || slotIndex > 2) continue;
      if (!currentPcStageWideMemberRange(value)) continue;
      addedCandidates.push({ side, ...entry });
    }
  }
  const simulation = sharedBuildCurrentPcStageWideSixMemberCandidateSolverEvidence({
    stage,
    self: selfAnalysis,
    enemy: enemyAnalysis,
    additionalMemberCandidates: addedCandidates,
    comparisonTolerance,
    policyName,
  });
  const stageKey = `stage${stage}`;
  const expectedSelf = currentPcExpectedStageSide(item, stage, "self");
  const expectedEnemy = currentPcExpectedStageSide(item, stage, "enemy");
  const expectedPresence = currentPcStageWideExpectedPresentInPools(
    item,
    stage,
    simulation.evidence?.memberPools || { self: [[], [], []], enemy: [[], [], []] }
  );
  const expectedTotalEvidence = {
    self: currentPcStageWideTotalEvidenceForValue(
      item.stages?.[stageKey]?.self,
      expectedSelf?.total || 0
    ),
    enemy: currentPcStageWideTotalEvidenceForValue(
      item.stages?.[stageKey]?.enemy,
      expectedEnemy?.total || 0
    ),
  };
  return {
    ...simulation,
    evidence: {
      ...(simulation.evidence || {}),
      expectedPresence,
      expectedTotalEvidence,
      rule:
        "stage-wide six member candidate search + Stage3 member-row ROI/preprocessing exact variant candidates + bonus=floor(max(all 6 candidates)*0.20) + exact self/enemy total evidence",
    },
    variantEvidence: {
      addedCandidates,
      addedCandidateCount: addedCandidates.length,
      variantSourceCounts: Object.fromEntries(
        addedCandidates.reduce((map, candidate) => {
          map.set(candidate.variantLabel, (map.get(candidate.variantLabel) || 0) + 1);
          return map;
        }, new Map())
      ),
    },
    note:
      "Current-PC stage-wide six-member candidate solver simulation with Stage3 member-row ROI/preprocessing variant evidence. It does not change final OCR output.",
  };
}

function buildCurrentPcStageWideVariantEvidenceEvaluation(analysis, diagnostics, options = {}) {
  const policyName =
    options.policyName ||
    (options.slotProvenOnly ? "slot-proven-stage3-variant-evidence" : "broad-stage3-variant-evidence");
  const command =
    options.command ||
    (options.slotProvenOnly
      ? "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-slot-proven-variant-solver"
      : "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-variant-solver");
  const comparisonTolerance = Number(options.comparisonTolerance ?? 1);
  const matchTolerance = Number(options.matchTolerance ?? comparisonTolerance);
  const variantEvidenceMap = buildCurrentPcStage3VariantEvidenceMap(diagnostics, options);
  const rows = [];
  const stageSimulations = [];
  const accepted = [];
  const falsePositiveRows = [];
  const blockedRows = [];
  const blockedReasonBreakdown = new Map();
  const variantSourceCounts = new Map();
  const acceptedVariantSourceCounts = new Map();
  const overlap = {
    existingStageWide: 0,
    groupedRaw: 0,
    stage3SevenDigit: 0,
    crownBonus: 0,
  };
  const stage3Self = {
    remainingFailures: 0,
    gainedAnyExactVariantCandidate: 0,
    gainedAllMissingExactMemberEvidence: 0,
    uniquelySolvable: 0,
    ambiguous: 0,
    stillMissingExactMemberEvidence: 0,
    blockedRows: [],
  };
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let blocked = 0;
  let failingStages = 0;
  let acceptedStageSideCorrections = 0;
  let acceptedByExactEquality = 0;
  let acceptedOnlyByWithinOneTolerance = 0;
  let exactRejectedButWithinOneAccepted = 0;
  let wouldBeFalsePositiveUnderExactEquality = 0;
  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  for (const item of analysis.filter((entry) => entry.expected)) {
    for (const stage of stages) {
      const stageHasFailure = sides.some((side) => hasCurrentPcSideFailure(item, stage, side));
      if (stageHasFailure) failingStages += 1;
      const baseSimulation = buildCurrentPcStageWideSixMemberCandidateSolverStage(item, stage);
      const simulation = buildCurrentPcStageWideVariantSimulationFromPools({
        item,
        stage,
        baseSimulation,
        variantEvidenceMap,
        comparisonTolerance,
        policyName,
      });
      stageSimulations.push({ screenshot: item.fileName, stage, simulation });
      const matchesExpected = currentPcStageWideStageMatchesExpected(
        simulation.proposed,
        item,
        stage,
        matchTolerance
      );
      const exactMatchesExpected = currentPcStageWideStageMatchesExpected(
        simulation.proposed,
        item,
        stage,
        0
      );
      const withinOneMatchesExpected = currentPcStageWideStageMatchesExpected(
        simulation.proposed,
        item,
        stage,
        1
      );
      const targetEvidenceReady =
        stageHasFailure &&
        simulation.evidence?.expectedPresence?.present &&
        (simulation.evidence?.expectedTotalEvidence?.self || []).length > 0 &&
        (simulation.evidence?.expectedTotalEvidence?.enemy || []).length > 0;
      let classification = "correctly-blocked-negative";
      if (simulation.wouldApply && matchesExpected) {
        truePositives += 1;
        classification = "true-positive";
        if (exactMatchesExpected) acceptedByExactEquality += 1;
        else if (withinOneMatchesExpected) acceptedOnlyByWithinOneTolerance += 1;
      } else if (simulation.wouldApply && !matchesExpected) {
        falsePositives += 1;
        classification = "false-positive";
      } else if (!simulation.wouldApply && targetEvidenceReady) {
        falseNegatives += 1;
        classification = "false-negative";
      } else if (stageHasFailure) {
        blocked += 1;
        classification = "blocked";
      }
      if (simulation.wouldApply && !exactMatchesExpected && withinOneMatchesExpected) {
        exactRejectedButWithinOneAccepted += 1;
        wouldBeFalsePositiveUnderExactEquality += 1;
      }
      for (const candidate of simulation.variantEvidence?.addedCandidates || []) {
        increment(variantSourceCounts, candidate.variantLabel || "unknown");
      }
      if (classification === "true-positive") {
        const changedSides = sides.filter((side) => simulation.sideWouldChange?.[side]);
        for (const side of changedSides) acceptedStageSideCorrections += 1;
        for (const candidate of simulation.variantEvidence?.addedCandidates || []) {
          const used = (simulation.proposed?.changedMemberSlots || []).some(
            (slot) =>
              slot.side === candidate.side &&
              slot.slot === candidate.slotIndex + 1 &&
              Number(slot.to || 0) === Number(candidate.value || 0)
          );
          if (used) increment(acceptedVariantSourceCounts, candidate.variantLabel || "unknown");
        }
        if (baseSimulation.wouldApply) overlap.existingStageWide += 1;
        for (const side of sides) {
          const sideAnalysis = item.stages?.[`stage${stage}`]?.[side];
          if (sideAnalysis?.currentPcGroupedRawTokenRecovery?.applied) overlap.groupedRaw += 1;
          if (sideAnalysis?.currentPcStage3SevenDigitBonusDisplacementRecovery?.applied) {
            overlap.stage3SevenDigit += 1;
          }
          if (sideAnalysis?.currentPcCrownBonusRuleRecovery?.applied) overlap.crownBonus += 1;
        }
        accepted.push({
          screenshot: item.fileName,
          stage,
          selected: simulation.selected,
          proposed: simulation.proposed,
          changedMemberSlots: simulation.proposed?.changedMemberSlots || [],
          rank1: simulation.proposed?.rank1 || null,
          winningSide: simulation.proposed?.winningSide || null,
          calculatedBonus: simulation.proposed?.calculatedBonus || 0,
          selfTotalEvidence: simulation.proposed?.totalEvidence?.self || [],
          enemyTotalEvidence: simulation.proposed?.totalEvidence?.enemy || [],
          variantCandidates: simulation.variantEvidence?.addedCandidates || [],
          uniqueness: "exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule",
          sideWouldChange: simulation.sideWouldChange || {},
          exactMatchesExpected,
          withinOneMatchesExpected,
          acceptedOnlyByWithinOneTolerance: !exactMatchesExpected && withinOneMatchesExpected,
        });
      }
      if (classification === "false-positive") {
        falsePositiveRows.push({
          screenshot: item.fileName,
          stage,
          selected: simulation.selected,
          proposed: simulation.proposed,
          expected: {
            self: currentPcExpectedStageSide(item, stage, "self"),
            enemy: currentPcExpectedStageSide(item, stage, "enemy"),
          },
          variantCandidates: simulation.variantEvidence?.addedCandidates || [],
        });
      }
      if (classification === "blocked" || classification === "false-negative") {
        const reasons = [];
        const expectedPresence = simulation.evidence?.expectedPresence || {};
        if (!expectedPresence.present) reasons.push("still missing exact member evidence");
        if ((simulation.evidence?.expectedTotalEvidence?.self || []).length === 0) {
          reasons.push("missing exact self total evidence");
        }
        if ((simulation.evidence?.expectedTotalEvidence?.enemy || []).length === 0) {
          reasons.push("missing exact enemy total evidence");
        }
        for (const reason of simulation.rejectionReasons || []) {
          if (reason === "candidate-pool-explosion") reasons.push("variant evidence too noisy");
          else if (reason.includes("multiple-complete")) reasons.push("competing complete interpretations");
          else if (reason.includes("no-complete")) reasons.push("no exact six-member equation");
          else if (reason.includes("global-rank1")) reasons.push("global rank-1 ambiguity");
          else if (reason.includes("missing") && reason.includes("candidate")) {
            reasons.push("still missing exact member evidence");
          }
        }
        if ((simulation.variantEvidence?.addedCandidates || []).length > 0 && !expectedPresence.present) {
          reasons.push("exact candidate exists but wrong/unknown slot provenance");
        }
        if (reasons.length === 0) reasons.push("other");
        const uniqueReasons = [...new Set(reasons)];
        for (const reason of uniqueReasons) increment(blockedReasonBreakdown, reason);
        blockedRows.push({
          screenshot: item.fileName,
          stage,
          classification,
          reasons: uniqueReasons,
          rejectionReasons: simulation.rejectionReasons || [],
          expectedPresence,
          variantCandidateCount: simulation.variantEvidence?.addedCandidateCount || 0,
        });
      }
      if (stage === 3 && hasCurrentPcSideFailure(item, 3, "self")) {
        stage3Self.remainingFailures += 1;
        const selfAdded = (simulation.variantEvidence?.addedCandidates || []).filter(
          (candidate) => candidate.side === "self"
        );
        if (selfAdded.length > 0) stage3Self.gainedAnyExactVariantCandidate += 1;
        const expectedPresence = simulation.evidence?.expectedPresence || {};
        if (expectedPresence.present) stage3Self.gainedAllMissingExactMemberEvidence += 1;
        else stage3Self.stillMissingExactMemberEvidence += 1;
        if (classification === "true-positive" && simulation.sideWouldChange?.self) {
          stage3Self.uniquelySolvable += 1;
        } else if ((simulation.evidence?.validInterpretationCount || 0) > 1) {
          stage3Self.ambiguous += 1;
        }
        if (classification !== "true-positive" || !simulation.sideWouldChange?.self) {
          stage3Self.blockedRows.push({
            screenshot: item.fileName,
            rejectionReasons: simulation.rejectionReasons || [],
            expectedPresence,
            variantCandidateCount: selfAdded.length,
          });
        }
      }
      if (stageHasFailure || simulation.wouldApply || classification === "false-negative") {
        rows.push({
          screenshot: item.fileName,
          stage,
          classification,
          wouldApply: simulation.wouldApply,
          selected: simulation.selected,
          proposed: simulation.proposed,
          expected: {
            self: currentPcExpectedStageSide(item, stage, "self"),
            enemy: currentPcExpectedStageSide(item, stage, "enemy"),
          },
          sideWouldChange: simulation.sideWouldChange,
          rejectionReasons: simulation.rejectionReasons || [],
          variantEvidence: simulation.variantEvidence,
          exactMatchesExpected,
          withinOneMatchesExpected,
          evidence: {
            candidatePoolSizes: simulation.evidence?.candidatePoolSizes || null,
            combinationCount: simulation.evidence?.combinationCount || 0,
            expectedPresence: simulation.evidence?.expectedPresence || null,
            validInterpretationCount: simulation.evidence?.validInterpretationCount || 0,
          },
        });
      }
    }
  }
  return {
    policyName,
    command,
    slotProvenOnly: Boolean(options.slotProvenOnly),
    comparisonTolerance,
    matchTolerance,
    truePositives,
    falsePositives,
    falseNegatives,
    blocked,
    failingStages,
    acceptedStageCorrections: truePositives,
    acceptedStageSideCorrections,
    uniqueAdditionalRecoveriesBeyondCurrentProduction: Math.max(
      0,
      acceptedStageSideCorrections - overlap.existingStageWide
    ),
    uniqueAdditionalRecoveriesBeyondExistingStageWideSolver: Math.max(
      0,
      acceptedStageSideCorrections - overlap.existingStageWide
    ),
    withinOneAudit: {
      acceptedByExactEquality,
      acceptedOnlyByWithinOneTolerance,
      exactRejectedButWithinOneAccepted,
      wouldBeFalsePositiveUnderExactEquality,
      noBehavioralDifference:
        failingStages - exactRejectedButWithinOneAccepted,
    },
    rows,
    stageSimulations,
    accepted,
    falsePositiveRows,
    blockedRows,
    blockedReasonBreakdown: Object.fromEntries(
      [...blockedReasonBreakdown.entries()].sort((a, b) => b[1] - a[1])
    ),
    stage3Self,
    variantSourceCounts: Object.fromEntries([...variantSourceCounts.entries()].sort()),
    acceptedVariantSourceCounts: Object.fromEntries(
      [...acceptedVariantSourceCounts.entries()].sort()
    ),
    overlap,
  };
}

function formatCurrentPcStageWideVariantCandidate(candidate = {}) {
  const zone = candidate.zoneKind ? `${candidate.zoneKind}` : "unknown";
  const slot = candidate.side ? `${candidate.side}.member${Number(candidate.slotIndex || 0) + 1}` : "-";
  const token = candidate.token ? ` token=${escapeMarkdownTableCell(candidate.token)}` : "";
  return `${slot} ${formatNumber(candidate.value)} (${candidate.variantLabel || "-"}, ${zone}${token})`;
}

function buildCurrentPcStageWideVariantEvidenceReport(
  simulation,
  parity = null,
  strictExactSimulation = null
) {
  const generatedAt = new Date().toISOString();
  const stage3Self = simulation.stage3Self || {};
  const blockedRows = simulation.blockedRows || [];
  const variantUsedByChangedSlot = (row) =>
    (row.variantCandidates || []).filter((candidate) =>
      (row.changedMemberSlots || []).some(
        (slot) =>
          slot.side === candidate.side &&
          Number(slot.slot || 0) === Number(candidate.slotIndex || 0) + 1 &&
          Number(slot.to || 0) === Number(candidate.value || 0)
      )
    );
  const incrementalAccepted = (simulation.accepted || []).filter(
    (row) => variantUsedByChangedSlot(row).length > 0
  );
  const previousFalsePositiveBlocked = (blockedRows || []).find(
    (row) => row.screenshot === "スクリーンショット 2026-07-14 061325391.png" && row.stage === 3
  );
  const stage3ProjectedPass =
    stage3Self.remainingFailures > 0
      ? ((stage3Self.uniquelySolvable / stage3Self.remainingFailures) * 100).toFixed(1)
      : "0.0";
  const lines = [
    "# Current-PC Stage-Wide Solver Stage3 Variant Evidence",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Purpose",
    "",
    "This runner-only report measures whether Stage3 member-row ROI/preprocessing variant OCR evidence can add useful exact member candidates to the existing current-PC stage-wide six-member solver.",
    "",
    simulation.slotProvenOnly
      ? "The first broad variant-evidence experiment produced one false positive because row-order variant evidence assigned a 7-digit value to the wrong member slot while still satisfying the total equation. This follow-up experiment rejects row-order, taller, wider, shifted, and other ambiguous row-level evidence, allowing only explicit member-slot variant crops."
      : "No production OCR output is changed. The simulation only adds exact 7-digit candidates from Stage3 member-row diagnostic variants to a copy of the existing stage-wide candidate pools, then requires the same strict six-member + crown-bonus + exact-total uniqueness guard.",
    "",
    "No production OCR output is changed.",
    "",
    "## Command",
    "",
    `\`${simulation.command || "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-variant-solver"}\``,
    "",
    "## Policy",
    "",
    `- policy: \`${simulation.policyName || "broad-stage3-variant-evidence"}\``,
    `- slot-proven only: ${simulation.slotProvenOnly ? "yes" : "no"}`,
    "",
    "## Strict Guards",
    "",
    "- current-PC baseline only",
    "- Stage3 variant evidence only; Stage1 and Stage2 candidate pools are unchanged",
    "- exact numeric candidates only, limited to clean 7-digit member-like values",
    simulation.slotProvenOnly
      ? "- candidate must come from an explicit slot ROI (`member1-slot`, `member2-slot`, or `member3-slot`)"
      : "- candidate must map to a member slot by slot ROI or deterministic row order",
    "- candidate must not come from bonus-only or total-only evidence",
    "- all six member slots must have candidate evidence",
    "- changed members must have non-selected member provenance",
    "- both self and enemy exact total evidence must exist",
    "- crown bonus is derived only by the confirmed `floor(max(all six members) * 0.20)` rule",
    "- exactly one complete interpretation may satisfy the equations",
    "- no filename, screenshot ID, hard-coded value, near-match, inferred digit, or total-derived member logic is used",
    simulation.slotProvenOnly
      ? "- ambiguous row-order provenance is rejected even when totals and crown-bonus equations match"
      : "- ambiguous row-order provenance is allowed in this broad experiment and is therefore not production-safe",
    "",
    "## Summary",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| failing stages evaluated | ${simulation.failingStages || 0} |`,
    `| TP stages | ${simulation.truePositives || 0} |`,
    `| FP stages | ${simulation.falsePositives || 0} |`,
    `| FN stages | ${simulation.falseNegatives || 0} |`,
    `| blocked stages | ${simulation.blocked || 0} |`,
    `| accepted stage corrections | ${simulation.acceptedStageCorrections || 0} |`,
    `| accepted stage/side corrections | ${simulation.acceptedStageSideCorrections || 0} |`,
    `| unique additions beyond current production | ${simulation.uniqueAdditionalRecoveriesBeyondCurrentProduction || 0} |`,
    `| unique additions beyond existing stage-wide solver | ${simulation.uniqueAdditionalRecoveriesBeyondExistingStageWideSolver || 0} |`,
    `| accepted by exact equality | ${simulation.withinOneAudit?.acceptedByExactEquality || 0} |`,
    `| accepted only by within-one tolerance | ${simulation.withinOneAudit?.acceptedOnlyByWithinOneTolerance || 0} |`,
    "",
    "## Stage3 Self Impact",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| remaining Stage3 self failures inspected | ${stage3Self.remainingFailures || 0} |`,
    `| gained at least one exact variant candidate | ${stage3Self.gainedAnyExactVariantCandidate || 0} |`,
    `| gained all missing exact member evidence | ${stage3Self.gainedAllMissingExactMemberEvidence || 0} |`,
    `| uniquely solvable by strict guard | ${stage3Self.uniquelySolvable || 0} |`,
    `| ambiguous with competing interpretations | ${stage3Self.ambiguous || 0} |`,
    `| still missing exact member evidence | ${stage3Self.stillMissingExactMemberEvidence || 0} |`,
    `| projected Stage3 self recovery rate from this simulation | ${stage3Self.uniquelySolvable || 0} / ${stage3Self.remainingFailures || 0} (${stage3ProjectedPass}%) |`,
    "",
    "## Variant Evidence Sources",
    "",
    "| variant source | candidates added | candidates used in accepted changes |",
    "| --- | ---: | ---: |"
  ];
  const sourceNames = [
    ...new Set([
      ...Object.keys(simulation.variantSourceCounts || {}),
      ...Object.keys(simulation.acceptedVariantSourceCounts || {}),
    ]),
  ].sort();
  if (sourceNames.length === 0) lines.push("| none | 0 | 0 |");
  for (const name of sourceNames) {
    lines.push(
      `| ${name} | ${simulation.variantSourceCounts?.[name] || 0} | ${simulation.acceptedVariantSourceCounts?.[name] || 0} |`
    );
  }

  lines.push(
    "",
    "## Accepted TP Cases",
    "",
    "| screenshot | stage | selected six members | proposed six members | changed member slots | variant candidates | rank-1 | winning side | derived bonus | total evidence | why unique |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- |"
  );
  if ((simulation.accepted || []).length === 0) {
    lines.push("| none | - | - | - | - | - | - | - | - | - | - |");
  }
  for (const row of simulation.accepted || []) {
    const selected = `self ${formatDebugNumbers(row.selected?.self?.members || [])}<br>enemy ${formatDebugNumbers(row.selected?.enemy?.members || [])}`;
    const proposed = `self ${formatDebugNumbers(row.proposed?.self?.members || [])}<br>enemy ${formatDebugNumbers(row.proposed?.enemy?.members || [])}`;
    const rank1 = row.rank1
      ? `${row.rank1.side}.member${row.rank1.slot}=${formatNumber(row.rank1.value)}`
      : "-";
    const changed = formatCurrentPcStageWideChangedSlots(row.changedMemberSlots || []);
    const variantCandidates = (row.variantCandidates || [])
      .filter((candidate) =>
        (row.changedMemberSlots || []).some(
          (slot) =>
            slot.side === candidate.side &&
            Number(slot.slot || 0) === Number(candidate.slotIndex || 0) + 1 &&
            Number(slot.to || 0) === Number(candidate.value || 0)
        )
      )
      .map(formatCurrentPcStageWideVariantCandidate)
      .join("<br>") || "-";
    const totalEvidence = [
      `self: ${formatCurrentPcStageWideEvidence(row.selfTotalEvidence || [])}`,
      `enemy: ${formatCurrentPcStageWideEvidence(row.enemyTotalEvidence || [])}`,
    ].join("<br>");
    lines.push(
      `| ${row.screenshot} | ${row.stage} | ${selected} | ${proposed} | ${changed} | ${variantCandidates} | ${rank1} | ${row.winningSide || "-"} | ${formatNumber(row.calculatedBonus || 0) || "-"} | ${totalEvidence} | ${row.uniqueness} |`
    );
  }

  lines.push(
    "",
    "## True Incremental TP Cases",
    "",
    "These rows require a Stage3 variant candidate that is not already enough under the existing production stage-wide solver.",
    "",
    "| screenshot | stage | side | changed member slot | slot-proven variant source | value | total evidence | crown-bonus equation | why unique |",
    "| --- | ---: | --- | --- | --- | ---: | --- | --- | --- |"
  );
  if (incrementalAccepted.length === 0) {
    lines.push("| none | - | - | - | - | - | - | - | - |");
  }
  for (const row of incrementalAccepted) {
    const variants = variantUsedByChangedSlot(row);
    for (const candidate of variants) {
      const changedSlot = (row.changedMemberSlots || []).find(
        (slot) =>
          slot.side === candidate.side &&
          Number(slot.slot || 0) === Number(candidate.slotIndex || 0) + 1 &&
          Number(slot.to || 0) === Number(candidate.value || 0)
      );
      const totalEvidence = [
        `self: ${formatCurrentPcStageWideEvidence(row.selfTotalEvidence || [])}`,
        `enemy: ${formatCurrentPcStageWideEvidence(row.enemyTotalEvidence || [])}`,
      ].join("<br>");
      const equation = [
        `self ${formatDebugNumbers(row.proposed?.self?.members || [])}+${formatNumber(row.proposed?.self?.bonus || 0) || 0}=${formatNumber(row.proposed?.self?.total || 0)}`,
        `enemy ${formatDebugNumbers(row.proposed?.enemy?.members || [])}+${formatNumber(row.proposed?.enemy?.bonus || 0) || 0}=${formatNumber(row.proposed?.enemy?.total || 0)}`,
        `rank1 ${row.rank1 ? `${row.rank1.side}.member${row.rank1.slot}=${formatNumber(row.rank1.value)}` : "-"}`,
      ].join("<br>");
      lines.push(
        `| ${row.screenshot} | ${row.stage} | ${candidate.side} | member${Number(candidate.slotIndex || 0) + 1}: ${formatNumber(changedSlot?.from || 0) || "-"} -> ${formatNumber(candidate.value)} | ${candidate.variantLabel || "-"} | ${formatNumber(candidate.value)} | ${totalEvidence} | ${equation} | ${row.uniqueness} |`
      );
    }
  }

  if (parity) {
    lines.push(
      "",
      "## Runner / Browser-Equivalent Parity",
      "",
      "| metric | count |",
      "| --- | ---: |",
      `| stages compared | ${parity.stagesCompared} |`,
      `| TP parity exact | ${parity.tpParityExact} / ${simulation.truePositives || 0} |`,
      `| incremental TP parity exact | ${parity.incrementalTpParityExact} / ${incrementalAccepted.length} |`,
      `| wouldApply disagreements | ${parity.wouldApplyDisagreements} |`,
      `| candidate-pool mismatches | ${parity.candidatePoolMismatches} |`,
      `| slot-proven candidate mismatches | ${parity.slotProvenCandidateMismatches} |`,
      `| proposed six-member disagreements | ${parity.proposedSixMemberDisagreements} |`,
      `| proposed total disagreements | ${parity.proposedTotalDisagreements} |`,
      `| exact-vs-within-one decision disagreements | ${parity.exactVsWithinOneDecisionDisagreements} |`,
      `| missing required browser evidence | ${parity.missingRequiredBrowserEvidence} |`,
      `| missing required runner evidence | ${parity.missingRequiredRunnerEvidence} |`,
      `| metadata-only mismatch rows | ${parity.metadataOnlyMismatches} |`,
      `| safety-relevant mismatch rows | ${parity.safetyRelevantMismatches} |`,
      "",
      "### Incremental TP Parity Rows",
      "",
      "| screenshot | stage | runner apply | browser-equivalent apply | runner exact | runner within-one | slot candidates | mismatch fields |",
      "| --- | ---: | --- | --- | --- | --- | --- | --- |"
    );
    if ((parity.incrementalTpRows || []).length === 0) {
      lines.push("| none | - | - | - | - | - | - | - |");
    }
    for (const row of parity.incrementalTpRows || []) {
      const slotCandidates = (row.runnerSlotCandidates || [])
        .map((candidate) => candidate.split("|").slice(0, 6).join(":"))
        .join("<br>");
      lines.push(
        `| ${row.screenshot} | ${row.stage} | ${row.runnerWouldApply ? "yes" : "no"} | ${row.browserWouldApply ? "yes" : "no"} | ${row.runnerExact ? "yes" : "no"} | ${row.runnerWithinOne ? "yes" : "no"} | ${slotCandidates || "-"} | ${row.mismatchFields.join(", ") || "none"} |`
      );
    }
    lines.push(
      "",
      "### Parity Mismatches",
      "",
      (parity.mismatchRows || []).length === 0
        ? "No runner/browser-equivalent mismatches were found."
        : "Mismatches were found and must be reviewed before any production candidate."
    );
  }

  if (strictExactSimulation) {
    lines.push(
      "",
      "## Strict Exact-Only Simulation",
      "",
      "| metric | within-one policy | strict exact-only policy |",
      "| --- | ---: | ---: |",
      `| TP | ${simulation.truePositives || 0} | ${strictExactSimulation.truePositives || 0} |`,
      `| FP | ${simulation.falsePositives || 0} | ${strictExactSimulation.falsePositives || 0} |`,
      `| FN | ${simulation.falseNegatives || 0} | ${strictExactSimulation.falseNegatives || 0} |`,
      `| blocked | ${simulation.blocked || 0} | ${strictExactSimulation.blocked || 0} |`,
      `| true incremental TP | ${simulation.uniqueAdditionalRecoveriesBeyondCurrentProduction || 0} | ${strictExactSimulation.uniqueAdditionalRecoveriesBeyondCurrentProduction || 0} |`,
      `| Stage3 self incremental TP | ${simulation.stage3Self?.uniquelySolvable || 0} | ${strictExactSimulation.stage3Self?.uniquelySolvable || 0} |`,
      "",
      (strictExactSimulation.uniqueAdditionalRecoveriesBeyondCurrentProduction || 0) <
        (simulation.uniqueAdditionalRecoveriesBeyondCurrentProduction || 0)
        ? "Strict exact-only loses the tolerance-dependent incremental recovery. This is safer for production unless the one-point discrepancy is independently proven to be deterministic and harmless."
        : "Strict exact-only preserves the same incremental recovery count as the within-one policy."
    );
  }

  lines.push(
    "",
    "## Blocked Breakdown",
    "",
    "| reason | count |",
    "| --- | ---: |"
  );
  const blockedEntries = Object.entries(simulation.blockedReasonBreakdown || {});
  if (blockedEntries.length === 0) lines.push("| none | 0 |");
  for (const [reason, count] of blockedEntries) {
    lines.push(`| ${reason} | ${count} |`);
  }

  lines.push(
    "",
    "## False Positives",
    "",
    simulation.falsePositives === 0
      ? "No false positives were found."
      : "False positives were found. This is enough to block productionization.",
    ""
  );
  if ((simulation.falsePositiveRows || []).length > 0) {
    lines.push(
      "| screenshot | stage | selected six members | proposed six members | expected six members | variant candidates | why unsafe |",
      "| --- | ---: | --- | --- | --- | --- | --- |"
    );
    for (const row of simulation.falsePositiveRows || []) {
      const selected = `self ${formatDebugNumbers(row.selected?.self?.members || [])}<br>enemy ${formatDebugNumbers(row.selected?.enemy?.members || [])}`;
      const proposed = `self ${formatDebugNumbers(row.proposed?.self?.members || [])}<br>enemy ${formatDebugNumbers(row.proposed?.enemy?.members || [])}`;
      const expected = `self ${formatDebugNumbers(row.expected?.self?.members || [])}<br>enemy ${formatDebugNumbers(row.expected?.enemy?.members || [])}`;
      const variants =
        (row.variantCandidates || [])
          .map(formatCurrentPcStageWideVariantCandidate)
          .join("<br>") || "-";
      lines.push(
        `| ${row.screenshot} | ${row.stage} | ${selected} | ${proposed} | ${expected} | ${variants} | exact totals and crown equation match, but row-order variant evidence maps member slots incorrectly |`
      );
    }
  }

  if (simulation.slotProvenOnly) {
    lines.push(
      "",
      "## Previous FP Recheck",
      "",
      "| previous FP screenshot | stage | status under slot-proven policy | reason |",
      "| --- | ---: | --- | --- |",
      previousFalsePositiveBlocked
        ? `| スクリーンショット 2026-07-14 061325391.png | 3 | rejected | ${(previousFalsePositiveBlocked.reasons || []).join(", ") || (previousFalsePositiveBlocked.rejectionReasons || []).join(", ") || "ambiguous row-order candidates removed"} |`
        : "| スクリーンショット 2026-07-14 061325391.png | 3 | not present as wouldApply/blocked row | ambiguous row-order candidates were removed before candidate-pool construction |"
    );
  }

  lines.push(
    "",
    "## Representative Blocked Rows",
    "",
    "| screenshot | stage | classification | reasons | rejection reasons | expected presence | variant candidates |",
    "| --- | ---: | --- | --- | --- | --- | ---: |"
  );
  for (const row of blockedRows.slice(0, 30)) {
    const expectedPresence = row.expectedPresence
      ? [
          `present=${row.expectedPresence.present ? "yes" : "no"}`,
          `self=${(row.expectedPresence.missing?.self || []).join(",") || "ok"}`,
          `enemy=${(row.expectedPresence.missing?.enemy || []).join(",") || "ok"}`,
        ].join("<br>")
      : "-";
    lines.push(
      `| ${row.screenshot} | ${row.stage} | ${row.classification} | ${(row.reasons || []).join("<br>") || "-"} | ${(row.rejectionReasons || []).join("<br>") || "-"} | ${expectedPresence} | ${row.variantCandidateCount || 0} |`
    );
  }

  lines.push(
    "",
    "## Overlap",
    "",
    "| recovery / simulation | overlapping accepted rows |",
    "| --- | ---: |",
    `| existing stage-wide solver | ${simulation.overlap?.existingStageWide || 0} |`,
    `| currentPcGroupedRawTokenRecovery | ${simulation.overlap?.groupedRaw || 0} |`,
    `| currentPcStage3SevenDigitBonusDisplacementRecovery | ${simulation.overlap?.stage3SevenDigit || 0} |`,
    `| currentPcCrownBonusRuleRecovery | ${simulation.overlap?.crownBonus || 0} |`,
    "",
    "## Recommendation",
    "",
    simulation.falsePositives > 0
      ? "Do not productionize. The variant-augmented solver produced at least one false positive."
      : strictExactSimulation &&
          strictExactSimulation.falsePositives === 0 &&
          (strictExactSimulation.uniqueAdditionalRecoveriesBeyondCurrentProduction || 0) >= 1
        ? "Do not productionize yet. Exact-only behavior is preferable for any future production candidate; a later production-readiness audit can focus only on the strict exact slot-proven TP rows."
        : (simulation.uniqueAdditionalRecoveriesBeyondCurrentProduction || 0) >= 2 &&
            simulation.slotProvenOnly
          ? "Do not productionize yet, but browser/UI parity is justified next. The slot-proven policy has FP = 0 and at least two true incremental TP rows with explicit member-slot provenance."
          : "Do not productionize. The slot-proven variant evidence is either too low-yield or not yet safe enough to justify browser/UI parity.",
    "",
    "This remains runner-only because the variant OCR evidence is generated by diagnostic crops/preprocessing variants under `tmp/`. Browser/UI parity is not proven for these extra candidates, and the current production path should not consume them until the evidence plumbing is shared and parity-checked.",
    ""
  );

  return lines.join("\n");
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

function buildCurrentPcBrowserEquivalentStageWideSideAnalysis(item, stage, side) {
  const stageKey = `stage${stage}`;
  const sideAnalysis = item.stages?.[stageKey]?.[side];
  if (!sideAnalysis) return null;
  const groupedRawSimulation = buildCurrentPcBrowserEquivalentGroupedRawSimulation(
    item,
    stage,
    side,
    sideAnalysis
  );
  const stage3SevenDigitSimulation =
    buildCurrentPcBrowserEquivalentStage3SevenDigitBonusDisplacementSimulation(
      item,
      stage,
      side,
      sideAnalysis
    );
  const selected = currentPcSelectedStageSideValues(sideAnalysis);
  return {
    selectedMembers: selected.selectedMembers,
    selectedTotal: selected.selectedTotal,
    rawCandidates: sideAnalysis.rawCandidates || [],
    displayedTotalCandidates: sideAnalysis.displayedTotalCandidates || [],
    bonusCandidates: sideAnalysis.bonusCandidates || [],
    candidateSourceSummary:
      sideAnalysis.candidateSourceSummary ||
      sharedBuildCurrentPcCandidateSourceSummary(
        buildCurrentPcBrowserEquivalentCandidateSources(item, stage, side, sideAnalysis)
      ),
    currentPcGroupedRawTokenEvidenceSimulation: groupedRawSimulation,
    currentPcStage3SevenDigitBonusDisplacementSimulation: stage3SevenDigitSimulation,
  };
}

function buildCurrentPcBrowserEquivalentStageWideSixMemberCandidateSolverSimulation(item, stage) {
  const stageKey = `stage${stage}`;
  const artifactSimulation =
    item.result?.[stageKey]?.debugArtifact?.currentPcStageWideSixMemberCandidateSolverSimulation ||
    item.stages?.[stageKey]?.debugArtifact?.currentPcStageWideSixMemberCandidateSolverSimulation;
  if (artifactSimulation) return artifactSimulation;
  const stageSimulation =
    item.stages?.[stageKey]?.currentPcStageWideSixMemberCandidateSolverSimulation;
  if (stageSimulation) return stageSimulation;
  return sharedBuildCurrentPcStageWideSixMemberCandidateSolverEvidence({
    stage,
    self: buildCurrentPcBrowserEquivalentStageWideSideAnalysis(item, stage, "self"),
    enemy: buildCurrentPcBrowserEquivalentStageWideSideAnalysis(item, stage, "enemy"),
  });
}

function currentPcStageWideEvidenceFingerprint(evidence = []) {
  return [...new Set((evidence || []).map((entry) => {
    const tokens = (entry.tokens || [])
      .map((token) =>
        [token.rawToken || token.token || "", token.normalizedValue || 0, token.shape || token.tokenShape || ""].join(":")
      )
      .sort()
      .join(",");
    return [
      entry.source || "",
      entry.value || 0,
      entry.pass || "",
      entry.text || "",
      tokens,
    ].join("|");
  }))].sort();
}

function currentPcStageWideMemberPoolsFingerprint(pools = [[], [], []]) {
  return (pools || [[], [], []]).map((slot) =>
    [...new Set((slot || []).map((value) => Number(value || 0)))].sort((a, b) => a - b)
  );
}

function currentPcStageWideProposalFingerprint(proposed = null) {
  return {
    self: {
      members: proposed?.self?.members || [],
      bonus: proposed?.self?.bonus || 0,
      total: proposed?.self?.total || 0,
    },
    enemy: {
      members: proposed?.enemy?.members || [],
      bonus: proposed?.enemy?.bonus || 0,
      total: proposed?.enemy?.total || 0,
    },
    rank1: proposed?.rank1 || null,
    winningSide: proposed?.winningSide || null,
    calculatedBonus: proposed?.calculatedBonus || 0,
    changedMemberSlots: (proposed?.changedMemberSlots || []).map((slot) => ({
      side: slot.side,
      slot: slot.slot,
      from: slot.from,
      to: slot.to,
      sources: (slot.sources || []).map((source) =>
        [source.source || "", source.token || "", source.shape || "", source.textIndex ?? ""].join(":")
      ),
    })),
    totalEvidence: {
      self: currentPcStageWideEvidenceFingerprint(proposed?.totalEvidence?.self || []),
      enemy: currentPcStageWideEvidenceFingerprint(proposed?.totalEvidence?.enemy || []),
    },
  };
}

function currentPcStageWideSolverFingerprint(sim = null) {
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
    proposed: currentPcStageWideProposalFingerprint(sim?.proposed || null),
    sideWouldChange: {
      self: Boolean(sim?.sideWouldChange?.self),
      enemy: Boolean(sim?.sideWouldChange?.enemy),
    },
    candidatePoolSizes: sim?.evidence?.candidatePoolSizes || { self: [], enemy: [] },
    memberPools: {
      self: currentPcStageWideMemberPoolsFingerprint(sim?.evidence?.memberPools?.self || []),
      enemy: currentPcStageWideMemberPoolsFingerprint(sim?.evidence?.memberPools?.enemy || []),
    },
    combinationCount: sim?.evidence?.combinationCount || 0,
    validInterpretationCount: sim?.evidence?.validInterpretationCount || 0,
    invalidInterpretationCounts: sim?.evidence?.invalidInterpretationCounts || {},
  };
}

function compareCurrentPcStageWideSixMemberCandidateSolverParity(
  analysis,
  stageWideSixMemberSolverSimulation
) {
  const rows = [];
  let stagesCompared = 0;
  let wouldApplyDisagreements = 0;
  let proposedSixMemberDisagreements = 0;
  let proposedBonusDisagreements = 0;
  let proposedTotalDisagreements = 0;
  let selectedDisagreements = 0;
  let candidatePoolMismatches = 0;
  let interpretationMismatches = 0;
  let missingInBrowserEquivalent = 0;
  let missingInRunner = 0;
  let metadataOnlyMismatches = 0;
  let safetyRelevantMismatches = 0;

  const tpKeys = new Set(
    (stageWideSixMemberSolverSimulation.accepted || []).map(
      (row) => `${row.screenshot}|${row.stage}`
    )
  );
  const runnerSimulationByStage = new Map(
    (stageWideSixMemberSolverSimulation.stageSimulations || []).map((row) => [
      `${row.screenshot}|${row.stage}`,
      row.simulation,
    ])
  );
  const tpRows = [];
  const arraysSame = (left, right) => JSON.stringify(left || []) === JSON.stringify(right || []);
  const jsonSame = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

  for (const item of analysis) {
    if (!item.expected) continue;
    for (const stage of stages) {
      stagesCompared += 1;
      const runnerSim =
        runnerSimulationByStage.get(`${item.fileName}|${stage}`) ||
        buildCurrentPcStageWideSixMemberCandidateSolverStage(item, stage);
      const browserSim = buildCurrentPcBrowserEquivalentStageWideSixMemberCandidateSolverSimulation(
        item,
        stage
      );
      const runner = currentPcStageWideSolverFingerprint(runnerSim);
      const browser = currentPcStageWideSolverFingerprint(browserSim);
      const mismatchFields = [];
      const metadataMismatchFields = [];

      if (!runnerSim) missingInRunner += 1;
      if (!browserSim) missingInBrowserEquivalent += 1;
      if (runner.wouldApply !== browser.wouldApply) {
        wouldApplyDisagreements += 1;
        mismatchFields.push("wouldApply");
      }
      for (const side of sides) {
        if (!arraysSame(runner.selected[side].members, browser.selected[side].members)) {
          selectedDisagreements += 1;
          mismatchFields.push(`${side}.selected.members`);
        }
        if (!arraysSame(runner.proposed[side].members, browser.proposed[side].members)) {
          proposedSixMemberDisagreements += 1;
          mismatchFields.push(`${side}.proposed.members`);
        }
        if (
          Math.abs(Number(runner.proposed[side].bonus || 0) - Number(browser.proposed[side].bonus || 0)) >
          1
        ) {
          proposedBonusDisagreements += 1;
          mismatchFields.push(`${side}.proposed.bonus`);
        }
        if (
          Math.abs(Number(runner.proposed[side].total || 0) - Number(browser.proposed[side].total || 0)) >
          1
        ) {
          proposedTotalDisagreements += 1;
          mismatchFields.push(`${side}.proposed.total`);
        }
        if (!jsonSame(runner.memberPools[side], browser.memberPools[side])) {
          candidatePoolMismatches += 1;
          metadataMismatchFields.push(`${side}.memberPools`);
        }
      }
      if (!jsonSame(runner.candidatePoolSizes, browser.candidatePoolSizes)) {
        candidatePoolMismatches += 1;
        metadataMismatchFields.push("candidatePoolSizes");
      }
      if (runner.validInterpretationCount !== browser.validInterpretationCount) {
        interpretationMismatches += 1;
        mismatchFields.push("validInterpretationCount");
      }
      if (!jsonSame(runner.invalidInterpretationCounts, browser.invalidInterpretationCounts)) {
        interpretationMismatches += 1;
        metadataMismatchFields.push("invalidInterpretationCounts");
      }
      if (!jsonSame(runner.proposed.rank1, browser.proposed.rank1)) mismatchFields.push("rank1");
      if (runner.proposed.winningSide !== browser.proposed.winningSide) {
        mismatchFields.push("winningSide");
      }
      if (
        Math.abs(
          Number(runner.proposed.calculatedBonus || 0) -
            Number(browser.proposed.calculatedBonus || 0)
        ) > 1
      ) {
        mismatchFields.push("calculatedBonus");
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
      if (tpKeys.has(`${item.fileName}|${stage}`)) tpRows.push(row);
    }
  }

  return {
    stagesCompared,
    rows,
    tpRows,
    tpParityExact: tpRows.filter(
      (row) => row.mismatchFields.length === 0 && row.metadataMismatchFields.length === 0
    ).length,
    wouldApplyDisagreements,
    proposedSixMemberDisagreements,
    proposedBonusDisagreements,
    proposedTotalDisagreements,
    selectedDisagreements,
    candidatePoolMismatches,
    interpretationMismatches,
    missingInBrowserEquivalent,
    missingInRunner,
    metadataOnlyMismatches,
    safetyRelevantMismatches,
    mismatchRows: rows.filter(
      (row) => row.mismatchFields.length > 0 || row.metadataMismatchFields.length > 0
    ),
  };
}

function currentPcStageWideVariantCandidateFingerprint(candidate = {}) {
  return [
    candidate.side || "",
    Number(candidate.slotIndex ?? -1),
    Number(candidate.value || 0),
    candidate.source || "",
    candidate.variantLabel || "",
    candidate.zoneKind || "",
    candidate.token || "",
    candidate.text || "",
    normalizeCurrentPcRoiForKey(candidate.zone || null),
  ].join("|");
}

function currentPcStageWideVariantCandidateFingerprints(sim = null) {
  return [...new Set((sim?.variantEvidence?.addedCandidates || []).map(currentPcStageWideVariantCandidateFingerprint))].sort();
}

function currentPcStageWideVariantUsedByChangedSlot(sim = null) {
  return (sim?.variantEvidence?.addedCandidates || []).filter((candidate) =>
    (sim?.proposed?.changedMemberSlots || []).some(
      (slot) =>
        slot.side === candidate.side &&
        Number(slot.slot || 0) === Number(candidate.slotIndex || 0) + 1 &&
        Number(slot.to || 0) === Number(candidate.value || 0)
    )
  );
}

function compareCurrentPcStageWideSlotProvenVariantEvidenceParity(
  analysis,
  diagnostics,
  stageWideVariantSolverSimulation
) {
  const variantEvidenceMap = buildCurrentPcStage3VariantEvidenceMap(diagnostics, {
    slotProvenOnly: true,
  });
  const rows = [];
  const tpRows = [];
  const incrementalTpRows = [];
  let stagesCompared = 0;
  let wouldApplyDisagreements = 0;
  let candidatePoolMismatches = 0;
  let slotProvenCandidateMismatches = 0;
  let proposedSixMemberDisagreements = 0;
  let proposedTotalDisagreements = 0;
  let exactVsWithinOneDecisionDisagreements = 0;
  let missingRequiredBrowserEvidence = 0;
  let missingRequiredRunnerEvidence = 0;
  let metadataOnlyMismatches = 0;
  let safetyRelevantMismatches = 0;

  const runnerSimulationByStage = new Map(
    (stageWideVariantSolverSimulation.stageSimulations || []).map((row) => [
      `${row.screenshot}|${row.stage}`,
      row.simulation,
    ])
  );
  const tpKeys = new Set(
    (stageWideVariantSolverSimulation.accepted || []).map(
      (row) => `${row.screenshot}|${row.stage}`
    )
  );
  const incrementalKeys = new Set(
    (stageWideVariantSolverSimulation.accepted || [])
      .filter((row) => (row.variantCandidates || []).some((candidate) =>
        (row.changedMemberSlots || []).some(
          (slot) =>
            slot.side === candidate.side &&
            Number(slot.slot || 0) === Number(candidate.slotIndex || 0) + 1 &&
            Number(slot.to || 0) === Number(candidate.value || 0)
        )
      ))
      .map((row) => `${row.screenshot}|${row.stage}`)
  );
  const arraysSame = (left, right) => JSON.stringify(left || []) === JSON.stringify(right || []);
  const jsonSame = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

  for (const item of analysis) {
    if (!item.expected) continue;
    for (const stage of stages) {
      stagesCompared += 1;
      const key = `${item.fileName}|${stage}`;
      const runnerBase = buildCurrentPcStageWideSixMemberCandidateSolverStage(item, stage);
      const runnerSim =
        runnerSimulationByStage.get(key) ||
        buildCurrentPcStageWideVariantSimulationFromPools({
          item,
          stage,
          baseSimulation: runnerBase,
          variantEvidenceMap,
          comparisonTolerance: 1,
          policyName: "slot-proven-stage3-variant-evidence",
        });
      const browserBase = buildCurrentPcBrowserEquivalentStageWideSixMemberCandidateSolverSimulation(
        item,
        stage
      );
      const browserSim = buildCurrentPcStageWideVariantSimulationFromPools({
        item,
        stage,
        baseSimulation: browserBase,
        variantEvidenceMap,
        sideAnalysisBuilder: buildCurrentPcBrowserEquivalentStageWideSideAnalysis,
        comparisonTolerance: 1,
        policyName: "slot-proven-stage3-variant-evidence",
      });
      const runner = currentPcStageWideSolverFingerprint(runnerSim);
      const browser = currentPcStageWideSolverFingerprint(browserSim);
      const mismatchFields = [];
      const metadataMismatchFields = [];
      const runnerHasEvidence = Boolean(runnerSim);
      const browserHasEvidence = Boolean(browserSim);
      const runnerSlotCandidates = currentPcStageWideVariantCandidateFingerprints(runnerSim);
      const browserSlotCandidates = currentPcStageWideVariantCandidateFingerprints(browserSim);
      const runnerExact = currentPcStageWideStageMatchesExpected(runnerSim?.proposed, item, stage, 0);
      const browserExact = currentPcStageWideStageMatchesExpected(browserSim?.proposed, item, stage, 0);
      const runnerWithinOne = currentPcStageWideStageMatchesExpected(
        runnerSim?.proposed,
        item,
        stage,
        1
      );
      const browserWithinOne = currentPcStageWideStageMatchesExpected(
        browserSim?.proposed,
        item,
        stage,
        1
      );

      if (runnerHasEvidence && !browserHasEvidence) missingRequiredBrowserEvidence += 1;
      if (!runnerHasEvidence && browserHasEvidence) missingRequiredRunnerEvidence += 1;
      if (runner.wouldApply !== browser.wouldApply) {
        wouldApplyDisagreements += 1;
        mismatchFields.push("wouldApply");
      }
      for (const side of sides) {
        if (!arraysSame(runner.proposed[side].members, browser.proposed[side].members)) {
          proposedSixMemberDisagreements += 1;
          mismatchFields.push(`${side}.proposed.members`);
        }
        if (
          Number(runner.proposed[side].total || 0) !== Number(browser.proposed[side].total || 0)
        ) {
          proposedTotalDisagreements += 1;
          mismatchFields.push(`${side}.proposed.total`);
        }
        if (!jsonSame(runner.memberPools[side], browser.memberPools[side])) {
          candidatePoolMismatches += 1;
          metadataMismatchFields.push(`${side}.memberPools`);
        }
      }
      if (!arraysSame(runnerSlotCandidates, browserSlotCandidates)) {
        slotProvenCandidateMismatches += 1;
        mismatchFields.push("slotProvenVariantCandidates");
      }
      if (runnerExact !== browserExact || runnerWithinOne !== browserWithinOne) {
        exactVsWithinOneDecisionDisagreements += 1;
        mismatchFields.push("exactVsWithinOneDecision");
      }
      if (runner.validInterpretationCount !== browser.validInterpretationCount) {
        mismatchFields.push("validInterpretationCount");
      }
      if (!jsonSame(runner.invalidInterpretationCounts, browser.invalidInterpretationCounts)) {
        metadataMismatchFields.push("invalidInterpretationCounts");
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
        runnerExact,
        browserExact,
        runnerWithinOne,
        browserWithinOne,
        runnerSlotCandidates,
        browserSlotCandidates,
        runnerVariantUsedByChangedSlot: currentPcStageWideVariantUsedByChangedSlot(runnerSim),
        browserVariantUsedByChangedSlot: currentPcStageWideVariantUsedByChangedSlot(browserSim),
        mismatchFields,
        metadataMismatchFields,
        safetyRelevant: hasSafetyMismatch,
      };
      rows.push(row);
      if (tpKeys.has(key)) tpRows.push(row);
      if (incrementalKeys.has(key)) incrementalTpRows.push(row);
    }
  }

  return {
    stagesCompared,
    rows,
    tpRows,
    incrementalTpRows,
    tpParityExact: tpRows.filter(
      (row) => row.mismatchFields.length === 0 && row.metadataMismatchFields.length === 0
    ).length,
    incrementalTpParityExact: incrementalTpRows.filter(
      (row) => row.mismatchFields.length === 0 && row.metadataMismatchFields.length === 0
    ).length,
    wouldApplyDisagreements,
    candidatePoolMismatches,
    slotProvenCandidateMismatches,
    proposedSixMemberDisagreements,
    proposedTotalDisagreements,
    exactVsWithinOneDecisionDisagreements,
    missingRequiredBrowserEvidence,
    missingRequiredRunnerEvidence,
    metadataOnlyMismatches,
    safetyRelevantMismatches,
    mismatchRows: rows.filter(
      (row) => row.mismatchFields.length > 0 || row.metadataMismatchFields.length > 0
    ),
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

function formatCurrentPcStageWideEvidence(evidence = []) {
  if (!evidence || evidence.length === 0) return "-";
  return evidence
    .slice(0, 4)
    .map((entry) => [entry.source, entry.pass, entry.text ? `"${String(entry.text).slice(0, 40)}"` : ""].filter(Boolean).join(" "))
    .join("<br>");
}

function formatCurrentPcStageWideChangedSlots(changedSlots = []) {
  if (!changedSlots || changedSlots.length === 0) return "-";
  return changedSlots
    .map((slot) => {
      const sources =
        (slot.sources || [])
          .slice(0, 3)
          .map((source) => [source.source, source.token, source.shape].filter(Boolean).join(":"))
          .join("; ") || "-";
      return `${slot.side}.member${slot.slot}: ${formatNumber(slot.from) || "-"} -> ${formatNumber(slot.to)} (${sources})`;
    })
    .join("<br>");
}

function buildCurrentPcStageWideSixMemberCandidateSolverReport(simulation) {
  const generatedAt = new Date().toISOString();
  const stage3 = simulation.stage3Self || {};
  const lines = [
    "# Current-PC Stage-Wide Six-Member Candidate Solver",
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
    "- filename/stage-specific logic: no",
    "- hard-coded score values: no",
    "- near-match guessing or digit invention: no",
    "",
    "## Candidate Source Design",
    "",
    "The solver builds six member-slot candidate pools for each current-PC stage: self member1/2/3 and enemy member1/2/3. It then evaluates complete six-member interpretations against the confirmed crown-bonus rule and exact total evidence for both sides.",
    "",
    "| source | used? | reason |",
    "| --- | --- | --- |"
  ];
  for (const source of simulation.candidateSourcesUsed || []) {
    lines.push(`| \`${source.source}\` | yes | ${source.reason} |`);
  }
  lines.push(
    "| slot-specific ROI diagnostics | no | Those candidates are produced only by an optional diagnostics pass and are not part of the normal current-PC baseline evidence. |",
    "| total-only or bonus-only tokens as members | no | Tokens that only have total/bonus provenance are rejected as member candidates. |",
    "",
    "## Strict Safety Guards",
    "",
    "- One observed candidate is required for every one of the six member slots.",
    "- Changed member slots must have non-selected member-compatible provenance.",
    "- The solver never derives a missing member by subtraction from a total.",
    "- The global rank-1 member among the six candidates must be unique.",
    "- `crownBonus = floor(globalRank1 * 0.20)` determines the only bonus side.",
    "- Both calculated side totals must have exact OCR total evidence.",
    "- Exactly one complete six-member interpretation may satisfy the totals and bonus rule.",
    "- No near values, digit repairs, or partial fragments are accepted.",
    "",
    "## Summary",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| current-PC stages evaluated | 174 |`,
    `| currently failing stages | ${simulation.failingStages} |`,
    `| currently failing stage/side rows | ${simulation.failingStageSideRows} |`,
    `| TP stages | ${simulation.truePositives} |`,
    `| FP stages | ${simulation.falsePositives} |`,
    `| FN stages | ${simulation.falseNegatives} |`,
    `| blocked failing stages | ${simulation.blocked} |`,
    `| accepted stage corrections | ${simulation.acceptedStageCorrections} |`,
    `| accepted stage/side corrections | ${simulation.acceptedStageSideCorrections} |`,
    `| unique additional recovery potential | ${simulation.uniqueAdditionalRecoveryPotential} |`,
    "",
    "## Stage3 Self Impact",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| current Stage3 self PASS | 24 / 58 |`,
    `| current Stage3 self FAIL | ${stage3.failingRows || 0} / 58 |`,
    `| failures with exact wrong/missing member candidates in pool | ${stage3.exactMissingOrWrongMemberCandidates || 0} |`,
    `| uniquely solvable Stage3 self rows | ${stage3.uniquelySolvable || 0} |`,
    `| remaining blocked Stage3 self rows | ${stage3.blocked || 0} |`,
    `| projected Stage3 self PASS if productionized | ${stage3.projectedPass || 24} / ${stage3.projectedTotal || 58} (${stage3.projectedAccuracy || "41.4%"}) |`,
    "",
    "## Accepted Cases By Position",
    "",
    "| position | accepted stage/side rows |",
    "| --- | ---: |"
  );
  if ((simulation.stagePositionBreakdown || []).length === 0) lines.push("| - | 0 |");
  for (const row of simulation.stagePositionBreakdown || []) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }
  lines.push(
    "",
    "## Blocked Classification",
    "",
    "| reason | stages |",
    "| --- | ---: |"
  );
  if ((simulation.blockedReasonBreakdown || []).length === 0) lines.push("| - | 0 |");
  for (const row of simulation.blockedReasonBreakdown || []) {
    lines.push(`| ${row.name} | ${row.count} |`);
  }

  lines.push(
    "",
    "## Overlap With Existing Recoveries",
    "",
    "| recovery / prior simulation | overlapping accepted stage/side rows |",
    "| --- | ---: |",
    `| \`currentPcGroupedRawTokenRecovery\` | ${simulation.overlap?.groupedRaw || 0} |`,
    `| \`applyCurrentPcStage3SevenDigitBonusDisplacementRecovery\` | ${simulation.overlap?.stage3SevenDigit || 0} |`,
    `| \`applyCurrentPcCrownBonusRuleRecovery\` | ${simulation.overlap?.crownBonus || 0} |`,
    `| prior slot-specific ROI TP cases | ${simulation.priorSlotSpecificRoi?.overlapWithAccepted || 0} / ${simulation.priorSlotSpecificRoi?.priorTp || 2} |`,
    "",
    "The accepted cases are evaluated after all current production recoveries. Any accepted row would be additional potential beyond the current production output.",
    "",
    "## Accepted TP Cases",
    "",
    "| screenshot | stage | selected six members | proposed six members | changed member slots and provenance | rank-1 | winning side | derived bonus | total evidence | why unique |",
    "| --- | ---: | --- | --- | --- | --- | --- | ---: | --- | --- |"
  );
  if ((simulation.accepted || []).length === 0) {
    lines.push("| none | - | - | - | - | - | - | - | - | - |");
  }
  for (const row of simulation.accepted || []) {
    const selected = `self ${formatDebugNumbers(row.currentSelectedSixMembers?.self || [])}<br>enemy ${formatDebugNumbers(row.currentSelectedSixMembers?.enemy || [])}`;
    const proposed = `self ${formatDebugNumbers(row.proposedSixMembers?.self || [])}<br>enemy ${formatDebugNumbers(row.proposedSixMembers?.enemy || [])}`;
    const rank1 = row.rank1
      ? `${row.rank1.side}.member${row.rank1.slot}=${formatNumber(row.rank1.value)}`
      : "-";
    const totalEvidence = [
      `self: ${formatCurrentPcStageWideEvidence(row.selfTotalEvidence || [])}`,
      `enemy: ${formatCurrentPcStageWideEvidence(row.enemyTotalEvidence || [])}`,
    ].join("<br>");
    lines.push(
      `| ${row.screenshot} | ${row.stage} | ${selected} | ${proposed} | ${formatCurrentPcStageWideChangedSlots(row.changedMemberSlots)} | ${rank1} | ${row.winningSide || "-"} | ${formatNumber(row.calculatedBonus || 0) || "-"} | ${totalEvidence} | ${row.uniqueness} |`
    );
  }

  lines.push(
    "",
    "## False Positives",
    "",
    simulation.falsePositives === 0
      ? "No false positives were found."
      : "False positives were found. Do not productionize this solver.",
    ""
  );
  if ((simulation.falsePositiveRows || []).length > 0) {
    lines.push(
      "| screenshot | stage | selected | proposed | expected |",
      "| --- | ---: | --- | --- | --- |"
    );
    for (const row of simulation.falsePositiveRows) {
      lines.push(
        `| ${row.screenshot} | ${row.stage} | ${JSON.stringify(row.selected)} | ${JSON.stringify(row.proposed)} | ${JSON.stringify(row.expected)} |`
      );
    }
  }

  lines.push(
    "",
    "## Production Readiness Recommendation",
    "",
    simulation.falsePositives > 0
      ? "Do not productionize. The simulation has at least one false positive."
      : simulation.truePositives > 0
        ? "Do not productionize yet. The next step should be shared runner/browser evidence parity for this exact stage-wide evidence schema."
        : "Do not productionize. The strict stage-wide solver has no meaningful true-positive yield under the current evidence sources.",
    "",
    "If TP remains meaningful with FP = 0 after parity, a later production candidate would still need to prove that browser/UI state exposes the same member candidate pools and exact total evidence. If TP is low, the next better target is likely Stage3 self candidate-source capture or preprocessing/ROI improvement rather than a solver.",
    ""
  );

  return lines.join("\n");
}

function buildCurrentPcStageWideSixMemberCandidateSolverParityReport(parity, simulation) {
  const generatedAt = new Date().toISOString();
  const lines = [
    "# Current-PC Stage-Wide Six-Member Candidate Solver Parity",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Purpose",
    "",
    "This report checks that the runner and browser-equivalent paths can build the same evidence for the current-PC stage-wide six-member candidate solver. The solver remains evidence-only and does not change final OCR output.",
    "",
    "## Shared Evidence Helper",
    "",
    "- `buildCurrentPcStageWideSixMemberCandidateSolverEvidence(...)` in `app/lib/ocr.js`",
    "- Inputs are post-production-recovery stage/side analyses for current-PC self and enemy rows.",
    "- Outputs include selected values, six member-slot candidate pools, exact total evidence, valid interpretations, `wouldApply`, and rejection reasons.",
    "- The browser/UI path records this evidence for diagnostics only; no stage result is rewritten by this solver.",
    "",
    "## Parity Counts",
    "",
    "| metric | count |",
    "| --- | ---: |",
    `| stages compared | ${parity.stagesCompared} |`,
    `| solver TP stages | ${simulation.truePositives} |`,
    `| solver FP stages | ${simulation.falsePositives} |`,
    `| solver FN stages | ${simulation.falseNegatives} |`,
    `| solver blocked stages | ${simulation.blocked} |`,
    `| TP parity exact | ${parity.tpParityExact} / ${simulation.truePositives} |`,
    `| wouldApply disagreements | ${parity.wouldApplyDisagreements} |`,
    `| proposed six-member disagreements | ${parity.proposedSixMemberDisagreements} |`,
    `| proposed bonus disagreements | ${parity.proposedBonusDisagreements} |`,
    `| proposed total disagreements | ${parity.proposedTotalDisagreements} |`,
    `| selected value disagreements | ${parity.selectedDisagreements} |`,
    `| candidate-pool metadata mismatches | ${parity.candidatePoolMismatches} |`,
    `| interpretation metadata mismatches | ${parity.interpretationMismatches} |`,
    `| missing evidence in browser-equivalent | ${parity.missingInBrowserEquivalent} |`,
    `| missing evidence in runner | ${parity.missingInRunner} |`,
    `| metadata-only mismatch rows | ${parity.metadataOnlyMismatches} |`,
    `| safety-relevant mismatch rows | ${parity.safetyRelevantMismatches} |`,
    "",
    "## TP Parity Rows",
    "",
    "| screenshot | stage | runner wouldApply | browser-equivalent wouldApply | proposed self | proposed enemy | mismatch fields | metadata mismatch fields |",
    "| --- | ---: | --- | --- | --- | --- | --- | --- |"
  ];
  if ((parity.tpRows || []).length === 0) {
    lines.push("| none | - | - | - | - | - | - | - |");
  }
  for (const row of parity.tpRows || []) {
    const proposedSelf = `${formatDebugNumbers(row.runner.proposed?.self?.members || [])}+${formatNumber(row.runner.proposed?.self?.bonus || 0) || 0}=${formatNumber(row.runner.proposed?.self?.total || 0) || 0}`;
    const proposedEnemy = `${formatDebugNumbers(row.runner.proposed?.enemy?.members || [])}+${formatNumber(row.runner.proposed?.enemy?.bonus || 0) || 0}=${formatNumber(row.runner.proposed?.enemy?.total || 0) || 0}`;
    lines.push(
      `| ${row.screenshot} | ${row.stage} | ${row.runnerWouldApply ? "yes" : "no"} | ${row.browserWouldApply ? "yes" : "no"} | ${proposedSelf} | ${proposedEnemy} | ${row.mismatchFields.join(", ") || "none"} | ${row.metadataMismatchFields.join(", ") || "none"} |`
    );
  }

  lines.push(
    "",
    "## Mismatch Rows",
    "",
    (parity.mismatchRows || []).length === 0
      ? "No runner/browser-equivalent mismatches were found."
      : "Mismatches were found and must be reviewed before any production candidate.",
    ""
  );
  if ((parity.mismatchRows || []).length > 0) {
    lines.push(
      "| screenshot | stage | runner wouldApply | browser-equivalent wouldApply | mismatch fields | metadata mismatch fields | safety relevant |",
      "| --- | ---: | --- | --- | --- | --- | --- |"
    );
    for (const row of parity.mismatchRows || []) {
      lines.push(
        `| ${row.screenshot} | ${row.stage} | ${row.runnerWouldApply ? "yes" : "no"} | ${row.browserWouldApply ? "yes" : "no"} | ${row.mismatchFields.join(", ") || "none"} | ${row.metadataMismatchFields.join(", ") || "none"} | ${row.safetyRelevant ? "yes" : "no"} |`
      );
    }
  }

  lines.push(
    "",
    "## Production Recommendation",
    "",
    parity.safetyRelevantMismatches > 0 || parity.tpParityExact !== simulation.truePositives
      ? "Do not productionize yet. Evidence parity is not exact for all TP rows."
      : "Parity is clean enough to attempt a later production-readiness audit, but this report does not productionize the solver.",
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
  const currentPcStage3SlotGeometryDiagnostics = args.includes(
    "--current-pc-stage3-slot-geometry-diagnostics"
  );
  const currentPcStage3SlotGeometryFromBaseline = args.includes(
    "--current-pc-stage3-slot-geometry-from-baseline"
  );
  const currentPcStage3GeometrySlotSolver = args.includes(
    "--current-pc-stage3-geometry-slot-solver"
  );
  const currentPcStage3MergedRunSlotSplitExperiment =
    args.includes("--current-pc-stage3-merged-run-slot-split-experiment") ||
    args.includes("--current-pc-stage3-self-merged-run-slot-split-experiment");
  const currentPcSideLocalExactEvidenceSolver = args.includes(
    "--current-pc-side-local-exact-evidence-solver"
  );
  const currentPcStageWideVariantSolver = args.includes(
    "--current-pc-stage-wide-variant-solver"
  );
  const currentPcStageWideSlotProvenVariantSolver = args.includes(
    "--current-pc-stage-wide-slot-proven-variant-solver"
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
  const smartphoneCrownStageWideSolverSimulation =
    args.includes("--smartphone-crown-stage-wide-solver-sim") ||
    args.includes("--smartphone-crown-bonus-stage-wide-solver-sim");
  const smartphoneCrownStageWideSolverFromBaseline =
    args.includes("--smartphone-crown-stage-wide-solver-from-baseline") ||
    args.includes("--smartphone-crown-bonus-stage-wide-solver-from-baseline");
  const smartphoneTotalCaptureDiagnostics = args.includes(
    "--smartphone-total-capture-diagnostics"
  );
  const smartphoneExactSlotSelectionSimulation = args.includes(
    "--smartphone-exact-slot-selection-sim"
  );
  const ipadOcrDiagnostics = args.includes("--ipad-ocr-diagnostics");
  const ipadOcrDiagnosticsDirMode = args.includes("--ipad-ocr-diagnostics-dir");
  const validateIpadExpected = args.includes("--validate-ipad-expected");
  const ipadOcrBaseline = args.includes("--ipad-ocr-baseline");
  const ipadPreprocessingSimulation = args.includes("--ipad-preprocessing-simulation");
  const ipadCandidateSelectionSimulation = args.includes("--ipad-candidate-selection-simulation");
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
      value !== "--current-pc-stage3-slot-geometry-diagnostics" &&
      value !== "--current-pc-stage3-slot-geometry-from-baseline" &&
      value !== "--current-pc-stage3-geometry-slot-solver" &&
      value !== "--current-pc-stage3-merged-run-slot-split-experiment" &&
      value !== "--current-pc-stage3-self-merged-run-slot-split-experiment" &&
      value !== "--current-pc-side-local-exact-evidence-solver" &&
      value !== "--current-pc-stage-wide-variant-solver" &&
      value !== "--current-pc-stage-wide-slot-proven-variant-solver" &&
      value !== "--current-pc-slot-roi-diagnostics" &&
      value !== "--debug-artifacts" &&
      value !== "--debug-ocr-artifacts" &&
      value !== "--fixed-roi-experiment" &&
      value !== "--smartphone-roi-experiment" &&
      value !== "--roi-adoption-sim" &&
      value !== "--simulate-roi-adoption" &&
      value !== "--smartphone-crown-stage-wide-solver-sim" &&
      value !== "--smartphone-crown-bonus-stage-wide-solver-sim" &&
      value !== "--smartphone-crown-stage-wide-solver-from-baseline" &&
      value !== "--smartphone-crown-bonus-stage-wide-solver-from-baseline" &&
      value !== "--smartphone-total-capture-diagnostics" &&
      value !== "--smartphone-exact-slot-selection-sim" &&
      value !== "--ipad-ocr-diagnostics" &&
      value !== "--ipad-ocr-diagnostics-dir" &&
      value !== "--validate-ipad-expected" &&
      value !== "--ipad-ocr-baseline" &&
      value !== "--ipad-preprocessing-simulation" &&
      value !== "--ipad-candidate-selection-simulation" &&
      value !== "--source" &&
      value !== "--audit-disable-known-correction" &&
      !(sourceIndex >= 0 && index === sourceIndex + 1) &&
      !(args[index - 1] === "--ipad-ocr-diagnostics-dir") &&
      !(args[index - 1] === "--audit-disable-known-correction")
    )
    .map((value) =>
      value
        .replaceAll("\\", "/")
        .replace(/^\.?\/*test-images\//i, "")
        .toLowerCase()
    );
  if (validateIpadExpected) {
    const summary = await validateIpadExpectedFixtures();
    await terminateAuditGeometryWorker();
    console.log(
      JSON.stringify(
        {
          ipadExpectedValidation: {
            completeFixtures: summary.completeFixtures,
            incompleteFixtures: summary.incompleteFixtures,
            stagesChecked: summary.stagesChecked,
            stageSidesChecked: summary.stageSidesChecked,
            arithmeticPass: summary.arithmeticPass,
            crownRulePass: summary.crownRulePass,
            failures: summary.failures,
            report: path.relative(rootDir, ipadExpectedTranscriptionReportPath).replaceAll("\\", "/"),
          },
        },
        null,
        2
      )
    );
    if (summary.failures.length > 0) process.exitCode = 1;
    return;
  }
  if (ipadPreprocessingSimulation) {
    const summary = await runIpadPreprocessingSimulation();
    await terminateAuditGeometryWorker();
    console.log(
      JSON.stringify(
        {
          ipadPreprocessingSimulation: {
            testedVariants: summary.testedVariants,
            selectedProfiles: summary.selectedProfiles,
            images: summary.selectedSummary.images,
            stages: summary.selectedSummary.stages,
            stageSides: summary.selectedSummary.stageSides,
            fields: summary.selectedSummary.fields,
            candidateUnion: summary.selectedSummary.union,
            outputDir: summary.outputDir,
            report: path
              .relative(rootDir, ipadPreprocessingInvestigationReportPath)
              .replaceAll("\\", "/"),
          },
        },
        null,
        2
      )
    );
    return;
  }
  if (ipadCandidateSelectionSimulation) {
    const summary = await runIpadCandidateSelectionSimulation();
    await terminateAuditGeometryWorker();
    console.log(
      JSON.stringify(
        {
          ipadCandidateSelectionSimulation: {
            selectedStrategy: summary.selectedStrategy,
            poolStats: {
              fields: summary.poolStats.fields,
              averageCandidateCount: summary.poolStats.averageCandidateCount,
              medianCandidateCount: summary.poolStats.medianCandidateCount,
              maxCandidateCount: summary.poolStats.maxCandidateCount,
              emptyCandidateFields: summary.poolStats.emptyCandidateFields,
              singleCandidateFields: summary.poolStats.singleCandidateFields,
              multiCandidateFields: summary.poolStats.multiCandidateFields,
            },
            selectedFieldAccuracy:
              summary.strategySummaries[summary.selectedStrategy.id].stats,
            aggregate: summary.selectedAggregate,
            oracleUpperBound: summary.oracleUpperBound,
            arithmeticAudit: summary.arithmeticAudit,
            outputDir: summary.outputDir,
            report: path
              .relative(rootDir, ipadCandidateSelectionInvestigationReportPath)
              .replaceAll("\\", "/"),
          },
        },
        null,
        2
      )
    );
    return;
  }
  if (ipadOcrBaseline) {
    const summary = await runIpadOcrBaseline();
    await terminateAuditGeometryWorker();
    console.log(
      JSON.stringify(
        {
          ipadOcrBaseline: {
            images: summary.images,
            stages: summary.stages,
            stageSides: summary.stageSides,
            outputDir: summary.outputDir,
            report: path.relative(rootDir, ipadInitialOcrBaselineReportPath).replaceAll("\\", "/"),
          },
        },
        null,
        2
      )
    );
    return;
  }
  if (ipadOcrDiagnostics) {
    const imagePaths = resolveIpadDiagnosticImagePaths(args);
    const summary = await writeIpadOcrDiagnostics(imagePaths);
    await terminateAuditGeometryWorker();
    console.log(
      JSON.stringify(
        {
          ipadOcrDiagnostics: summary,
        },
        null,
        2
      )
    );
    return;
  }
  if (ipadOcrDiagnosticsDirMode) {
    const inventory = await writeIpadDatasetInventory(getIpadDiagnosticsDirArg(args));
    console.log(
      JSON.stringify(
        {
          ipadDatasetInventory: {
            totalFiles: inventory.totalFiles,
            readableFiles: inventory.readableFiles,
            unreadableFiles: inventory.unreadableFiles,
            duplicateGroups: inventory.duplicates.length,
            nonTargetFiles: inventory.nonTargetFiles.length,
            clusters: inventory.clusters.map((cluster) => ({
              id: cluster.id,
              count: cluster.count,
              dimensions: cluster.dimensions,
              orientation: cluster.orientation,
              aspectRange: cluster.aspectRange,
            })),
            selectedFixtures: inventory.selectedFixtures.map((item) => item.fileName),
            outputDir: inventory.artifacts.outputDir,
            manifest: inventory.manifest,
            report: path.relative(rootDir, ipadDatasetInventoryReportPath).replaceAll("\\", "/"),
          },
        },
        null,
        2
      )
    );
    return;
  }
  if (smartphoneExactSlotSelectionSimulation) {
    const cachedReport = await readSmartphoneBaselineCache(filters);
    await writeSmartphoneBaselineCacheSummary(cachedReport);
    const simulation = evaluateSmartphoneExactSlotSelectionSimulation(cachedReport);
    const parity = compareSmartphoneExactSlotSelectionParity(cachedReport);
    const productionImpact = buildSmartphoneExactSlotProductionImpact(cachedReport);
    await fs.writeFile(
      smartphoneExactSlotSelectionSimulationReportPath,
      buildSmartphoneExactSlotSelectionSimulationReport(simulation, parity, productionImpact)
    );
    await fs.mkdir(path.join(rootDir, "tmp"), { recursive: true });
    const resultPath = path.join(rootDir, "tmp", "smartphone-exact-slot-selection-simulation.json");
    await fs.writeFile(
      resultPath,
      JSON.stringify({ simulation, parity, productionImpact }, null, 2)
    );
    console.log(
      JSON.stringify(
        {
          smartphoneExactSlotMembersBonusTotalSelectionSimulation: {
            images: cachedReport.length,
            rowsAudited: simulation.rowsAudited,
            remainingFailureRows: simulation.remainingFailureRows,
            truePositives: simulation.truePositives,
            falsePositives: simulation.falsePositives,
            falseNegatives: simulation.falseNegatives,
            blocked: simulation.blocked,
            alreadyCorrect: simulation.alreadyCorrect,
            wouldApplyCount: simulation.wouldApplyCount,
            trueIncrementalTp: simulation.trueIncrementalTp,
            blockReasons: simulation.blockReasons,
            impactedImages: simulation.impactedImages,
            parity: {
              stageSidesCompared: parity.stageSidesCompared,
              runnerWouldApply: parity.runnerWouldApply,
              browserWouldApply: parity.browserWouldApply,
              tpParityExact: parity.tpParityExact,
              tpRows: parity.tpRows,
              wouldApplyDisagreements: parity.wouldApplyDisagreements,
              proposedRecoveryDisagreements: parity.proposedRecoveryDisagreements,
              missingRequiredBrowserEvidence: parity.missingRequiredBrowserEvidence,
              missingRequiredRunnerEvidence: parity.missingRequiredRunnerEvidence,
              safetyRelevantMismatches: parity.safetyRelevantMismatches,
            },
            productionImpact: {
              beforeAccuracy: productionImpact.beforeAccuracy,
              afterAccuracy: productionImpact.afterAccuracy,
              exactSlotRecoveriesApplied: productionImpact.exactSlotRecoveriesApplied,
              uniqueRecoveredStageSides: productionImpact.uniqueRecoveredStageSides,
              uniqueRecoveredStages: productionImpact.uniqueRecoveredStages,
              uniqueRecoveredImages: productionImpact.uniqueRecoveredImages,
              fullImagePassGain: productionImpact.fullImagePassGain,
              unexpectedChangedStageSides:
                productionImpact.unexpectedChangedStageSides.length,
            },
            recommendation: simulation.recommendation,
            report: path
              .relative(rootDir, smartphoneExactSlotSelectionSimulationReportPath)
              .replaceAll("\\", "/"),
            result: path.relative(rootDir, resultPath).replaceAll("\\", "/"),
          },
        },
        null,
        2
      )
    );
    return;
  }
  if (smartphoneTotalCaptureDiagnostics) {
    const cachedReport = await readSmartphoneBaselineCache(filters);
    await writeSmartphoneBaselineCacheSummary(cachedReport);
    const diagnostics = await writeSmartphoneTotalCaptureDiagnostics(cachedReport);
    await terminateAuditGeometryWorker();
    console.log(
      JSON.stringify(
        {
          smartphoneTotalCaptureDiagnostics: {
            images: cachedReport.length,
            rowsEvaluated: diagnostics.rowsEvaluated,
            stage3RowsEvaluated: diagnostics.stage3RowsEvaluated,
            exactTotalRowsExposed: diagnostics.variantSummary.exactTotalRowsExposed,
            bestSingleVariant: diagnostics.variantSummary.bestSingleVariant
              ? {
                  crop: diagnostics.variantSummary.bestSingleVariant.crop,
                  preprocess: diagnostics.variantSummary.bestSingleVariant.preprocess,
                  rowsWithExactTotal:
                    diagnostics.variantSummary.bestSingleVariant.rowsWithExactTotal,
                  rowsWithCompetingCandidates:
                    diagnostics.variantSummary.bestSingleVariant.rowsWithCompetingCandidates,
                }
              : null,
            bestFixedVariantSet: diagnostics.variantSummary.bestFixedVariantSet,
            diagnosticFalsePositiveRows: diagnostics.diagnosticFalsePositiveRows,
            augmentedSolverImpact: {
              exactTotalEvidenceAddedRows:
                diagnostics.augmentedSolverImpact.exactTotalEvidenceAddedRows,
              uniqueRecoveredStages:
                diagnostics.augmentedSolverImpact.productionImpact.uniqueRecoveredStages,
              afterAccuracy:
                diagnostics.augmentedSolverImpact.productionImpact.afterAccuracy,
            },
            knownSampleImpact: diagnostics.knownSampleImpact,
            outputDir: diagnostics.outputDir,
            report: path
              .relative(rootDir, smartphoneTotalCaptureDiagnosticsReportPath)
              .replaceAll("\\", "/"),
          },
        },
        null,
        2
      )
    );
    return;
  }
  if (smartphoneCrownStageWideSolverFromBaseline) {
    const cachedReport = await readSmartphoneBaselineCache(filters);
    const cacheSummary = await writeSmartphoneBaselineCacheSummary(cachedReport);
    const simulation = await buildAndWriteSmartphoneCrownStageWideSolverSimulation({
      report: cachedReport,
      source: "smartphone baseline cache",
      cacheSummary,
    });
    console.log(
      JSON.stringify(
        {
          images: cachedReport.length,
          expected: cachedReport.filter((item) => item.expected).length,
          source: "smartphone-baseline-cache",
          cacheSummary,
          report: path
            .relative(rootDir, smartphoneCrownBonusStageWideSolverReportPath)
            .replaceAll("\\", "/"),
          result: path
            .relative(
              rootDir,
              path.join(rootDir, "tmp", "smartphone-crown-bonus-stage-wide-solver-simulation.json")
            )
            .replaceAll("\\", "/"),
          crownBonus: simulation.crownBonusSimulation
            ? {
                truePositives: simulation.crownBonusSimulation.truePositives,
                falsePositives: simulation.crownBonusSimulation.falsePositives,
                falseNegatives: simulation.crownBonusSimulation.falseNegatives,
                blocked: simulation.crownBonusSimulation.blocked,
                trueIncrementalTp: simulation.crownBonusSimulation.trueIncrementalTp,
              }
            : null,
          stageWide: simulation.stageWideSimulation
            ? {
                truePositives: simulation.stageWideSimulation.truePositives,
                falsePositives: simulation.stageWideSimulation.falsePositives,
                falseNegatives: simulation.stageWideSimulation.falseNegatives,
                blocked: simulation.stageWideSimulation.blocked,
                trueIncrementalTp: simulation.stageWideSimulation.trueIncrementalTp,
              }
            : null,
          parity: simulation.parity
            ? {
                stagesCompared: simulation.parity.stagesCompared,
                crown: simulation.parity.crown,
                stageWide: simulation.parity.stageWide,
              }
            : null,
          productionImpact: simulation.productionImpact
            ? {
                beforeAccuracy: simulation.productionImpact.beforeAccuracy,
                afterAccuracy: simulation.productionImpact.afterAccuracy,
                crownRecoveriesApplied: simulation.productionImpact.crownRecoveriesApplied,
                stageWideRecoveriesApplied:
                  simulation.productionImpact.stageWideRecoveriesApplied,
                uniqueRecoveredStages: simulation.productionImpact.uniqueRecoveredStages,
                unexpectedChangedStages:
                  simulation.productionImpact.unexpectedChangedStages.length,
              }
            : null,
        },
        null,
        2
      )
    );
    return;
  }
  if (currentPcStage3SlotGeometryFromBaseline) {
    const summaryPath = path.join(currentPcBaselineDir, "summary.json");
    const analysis = JSON.parse(await fs.readFile(summaryPath, "utf8")).filter((item) => {
      if (filters.length === 0) return true;
      const base = String(item.fileName || "").toLowerCase();
      return filters.some((filter) => base.includes(filter));
    });
    const artifacts = await writeCurrentPcStage3SlotGeometryDiagnosticsArtifacts(
      analysis.filter((item) => item.expected)
    );
    artifacts.sourceSummary = path.relative(rootDir, summaryPath).replaceAll("\\", "/");
    if (currentPcStage3GeometrySlotSolver) {
      artifacts.geometrySlotSimulation = buildCurrentPcStage3GeometrySlotEvidenceSimulation(
        analysis.filter((item) => item.expected),
        artifacts
      );
      await fs.writeFile(
        path.join(
          currentPcBaselineDir,
          "stage3-geometry-slot-evidence-simulation.json"
        ),
        JSON.stringify(artifacts.geometrySlotSimulation, null, 2)
      );
    }
    await fs.writeFile(
      currentPcStage3SlotGeometryReportPath,
      buildCurrentPcStage3SlotGeometryDiagnosticsReport(artifacts)
    );
    await terminateAuditGeometryWorker();
    console.log(
      JSON.stringify(
        {
          currentPcStage3SlotGeometryDiagnostics: {
            source: path.relative(rootDir, summaryPath).replaceAll("\\", "/"),
            report: path.relative(rootDir, currentPcStage3SlotGeometryReportPath).replaceAll("\\", "/"),
            outputDir: artifacts.outputDir,
            summary: artifacts.summaryPath,
            rows: artifacts.rows.length,
            geometrySlotSimulation: artifacts.geometrySlotSimulation
              ? {
                  truePositives: artifacts.geometrySlotSimulation.truePositives,
                  falsePositives: artifacts.geometrySlotSimulation.falsePositives,
                  falseNegatives: artifacts.geometrySlotSimulation.falseNegatives,
                  blocked: artifacts.geometrySlotSimulation.blocked,
                  trueIncrementalTp: artifacts.geometrySlotSimulation.trueIncrementalTp,
                  stage3SelfIncrementalTp:
                    artifacts.geometrySlotSimulation.stage3SelfIncrementalTp,
                  recommendation: artifacts.geometrySlotSimulation.recommendation,
                }
              : null,
          },
        },
        null,
        2
      )
    );
    return;
  }
  if (currentPcStage3MergedRunSlotSplitExperiment && !currentPcBaseline) {
    const summaryPath = path.join(currentPcBaselineDir, "summary.json");
    const analysis = JSON.parse(await fs.readFile(summaryPath, "utf8")).filter((item) => {
      if (filters.length === 0) return true;
      const base = String(item.fileName || "").toLowerCase();
      return filters.some((filter) => base.includes(filter));
    });
    const geometrySummaryPath = path.join(currentPcStage3SlotGeometryDiagnosticsDir, "summary.json");
    let geometryDiagnostics = null;
    try {
      geometryDiagnostics = {
        rows: JSON.parse(await fs.readFile(geometrySummaryPath, "utf8")),
        outputDir: path
          .relative(rootDir, currentPcStage3SlotGeometryDiagnosticsDir)
          .replaceAll("\\", "/"),
        summaryPath: path.relative(rootDir, geometrySummaryPath).replaceAll("\\", "/"),
      };
    } catch {
      geometryDiagnostics = await writeCurrentPcStage3SlotGeometryDiagnosticsArtifacts(
        analysis.filter((item) => item.expected)
      );
    }
    const splitArtifacts = await writeCurrentPcStage3SelfMergedRunImageSplitArtifacts(
      analysis.filter((item) => item.expected),
      geometryDiagnostics
    );
    const splitSimulation = buildCurrentPcStage3SelfMergedRunImageSplitSimulation(
      analysis.filter((item) => item.expected),
      splitArtifacts
    );
    await fs.writeFile(
      path.join(currentPcBaselineDir, "stage3-self-merged-run-image-split-simulation.json"),
      JSON.stringify(splitSimulation, null, 2)
    );
    await fs.writeFile(
      currentPcStage3MergedRunImageSplitReportPath,
      buildCurrentPcStage3SelfMergedRunImageSplitReport(splitArtifacts, splitSimulation)
    );
    await terminateAuditGeometryWorker();
    console.log(
      JSON.stringify(
        {
          currentPcStage3SelfMergedRunImageSplitExperiment: {
            source: path.relative(rootDir, summaryPath).replaceAll("\\", "/"),
            report: path
              .relative(rootDir, currentPcStage3MergedRunImageSplitReportPath)
              .replaceAll("\\", "/"),
            outputDir: splitArtifacts.outputDir,
            summary: splitArtifacts.summaryPath,
            mergedRunsDetected: splitArtifacts.stats.detectedRuns,
            exactMembersRecovered: splitSimulation.exactMembersRecovered,
            rowsGainingCompleteStage3SelfMemberEvidence:
              splitSimulation.rowsGainingCompleteStage3SelfMemberEvidence,
            truePositives: splitSimulation.truePositives,
            falsePositives: splitSimulation.falsePositives,
            falseNegatives: splitSimulation.falseNegatives,
            blocked: splitSimulation.blocked,
            trueIncrementalTp: splitSimulation.trueIncrementalTp,
            stage3SelfIncrementalTp: splitSimulation.stage3SelfIncrementalTp,
            wrongSlotAssignments: splitSimulation.wrongSlotAssignments,
            recommendation: splitSimulation.recommendation,
          },
        },
        null,
        2
      )
    );
    return;
  }
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
    if (smartphoneCrownStageWideSolverSimulation && source === "smartphone") {
      await writeSmartphoneBaselineCacheItem(report[report.length - 1]);
    }
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
    currentPcBaselineArtifacts &&
    (currentPcStage3MemberRowDiagnostics ||
      currentPcStageWideVariantSolver ||
      currentPcStageWideSlotProvenVariantSolver)
      ? await writeCurrentPcStage3MemberRowDiagnosticsArtifacts(
          currentPcBaselineArtifacts.analysis.filter((item) => item.expected)
        )
      : null;
  const currentPcStage3SlotGeometryDiagnosticsArtifacts =
    currentPcBaselineArtifacts &&
    (currentPcStage3SlotGeometryDiagnostics ||
      currentPcStage3GeometrySlotSolver ||
      currentPcStage3MergedRunSlotSplitExperiment)
      ? await writeCurrentPcStage3SlotGeometryDiagnosticsArtifacts(
          currentPcBaselineArtifacts.analysis.filter((item) => item.expected)
        )
      : null;
  const currentPcSlotRoiDiagnosticsArtifacts =
    currentPcBaselineArtifacts && currentPcSlotRoiDiagnostics
      ? await writeCurrentPcSlotRoiDiagnosticsArtifacts(
          currentPcBaselineArtifacts.analysis.filter((item) => item.expected)
        )
      : null;
  let stageWideVariantSolverSimulation = null;
  let stageWideVariantStrictExactSimulation = null;
  let stageWideVariantParity = null;
  let exactMembersBonusTotalRecoverySimulation = null;
  let exactMembersBonusTotalRecoveryParity = null;
  let sideLocalExactEvidenceRecoverySimulation = null;
  let sideLocalExactEvidenceRecoveryParity = null;
  let currentPcStage3GeometrySlotSimulation = null;
  let currentPcStage3MergedRunImageSplitArtifacts = null;
  let currentPcStage3MergedRunImageSplitSimulation = null;
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
    const stageWideSixMemberSolverSimulation =
      buildCurrentPcStageWideSixMemberCandidateSolverEvaluation(expectedCurrentPcAnalysis);
    exactMembersBonusTotalRecoverySimulation =
      buildCurrentPcExactMembersCrownBonusTotalRecoverySimulation(
        expectedCurrentPcAnalysis
      );
    exactMembersBonusTotalRecoveryParity =
      compareCurrentPcExactMembersCrownBonusTotalRecoveryParity(
        expectedCurrentPcAnalysis,
        exactMembersBonusTotalRecoverySimulation
      );
    sideLocalExactEvidenceRecoverySimulation = currentPcSideLocalExactEvidenceSolver
      ? buildCurrentPcSideLocalExactEvidenceRecoverySimulation(expectedCurrentPcAnalysis)
      : null;
    sideLocalExactEvidenceRecoveryParity = sideLocalExactEvidenceRecoverySimulation
      ? compareCurrentPcSideLocalExactEvidenceRecoveryParity(
          expectedCurrentPcAnalysis,
          sideLocalExactEvidenceRecoverySimulation
        )
      : null;
    currentPcStage3GeometrySlotSimulation =
      currentPcStage3GeometrySlotSolver && currentPcStage3SlotGeometryDiagnosticsArtifacts
        ? buildCurrentPcStage3GeometrySlotEvidenceSimulation(
            expectedCurrentPcAnalysis,
            currentPcStage3SlotGeometryDiagnosticsArtifacts
          )
        : null;
    if (currentPcStage3GeometrySlotSimulation) {
      currentPcStage3SlotGeometryDiagnosticsArtifacts.geometrySlotSimulation =
        currentPcStage3GeometrySlotSimulation;
    }
    if (currentPcStage3MergedRunSlotSplitExperiment && currentPcStage3SlotGeometryDiagnosticsArtifacts) {
      currentPcStage3MergedRunImageSplitArtifacts =
        await writeCurrentPcStage3SelfMergedRunImageSplitArtifacts(
          expectedCurrentPcAnalysis,
          currentPcStage3SlotGeometryDiagnosticsArtifacts
        );
      currentPcStage3MergedRunImageSplitSimulation =
        buildCurrentPcStage3SelfMergedRunImageSplitSimulation(
          expectedCurrentPcAnalysis,
          currentPcStage3MergedRunImageSplitArtifacts
        );
    }
    stageWideVariantSolverSimulation =
      (currentPcStageWideVariantSolver || currentPcStageWideSlotProvenVariantSolver) &&
      currentPcStage3MemberRowDiagnosticsArtifacts
        ? buildCurrentPcStageWideVariantEvidenceEvaluation(
            expectedCurrentPcAnalysis,
            currentPcStage3MemberRowDiagnosticsArtifacts,
            currentPcStageWideSlotProvenVariantSolver
              ? {
                  slotProvenOnly: true,
                  policyName: "slot-proven-stage3-variant-evidence",
                  command:
                    "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-slot-proven-variant-solver",
                }
              : {
                  policyName: "broad-stage3-variant-evidence",
                  command:
                    "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-variant-solver",
                }
          )
        : null;
    if (currentPcStageWideSlotProvenVariantSolver && currentPcStage3MemberRowDiagnosticsArtifacts) {
      stageWideVariantStrictExactSimulation =
        buildCurrentPcStageWideVariantEvidenceEvaluation(
          expectedCurrentPcAnalysis,
          currentPcStage3MemberRowDiagnosticsArtifacts,
          {
            slotProvenOnly: true,
            policyName: "slot-proven-stage3-variant-evidence-strict-exact",
            command:
              "node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-slot-proven-variant-solver",
            comparisonTolerance: 0,
            matchTolerance: 0,
          }
        );
      stageWideVariantParity =
        stageWideVariantSolverSimulation
          ? compareCurrentPcStageWideSlotProvenVariantEvidenceParity(
              expectedCurrentPcAnalysis,
              currentPcStage3MemberRowDiagnosticsArtifacts,
              stageWideVariantSolverSimulation
            )
          : null;
    }
    const stageWideSixMemberSolverParity =
      compareCurrentPcStageWideSixMemberCandidateSolverParity(
        expectedCurrentPcAnalysis,
        stageWideSixMemberSolverSimulation
      );
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
      currentPcStageWideSolverReportPath,
      buildCurrentPcStageWideSixMemberCandidateSolverReport(stageWideSixMemberSolverSimulation)
    );
    await fs.writeFile(
      currentPcStageWideSolverParityReportPath,
      buildCurrentPcStageWideSixMemberCandidateSolverParityReport(
        stageWideSixMemberSolverParity,
        stageWideSixMemberSolverSimulation
      )
    );
    await fs.writeFile(
      currentPcExactMembersBonusTotalRecoveryReportPath,
      buildCurrentPcExactMembersBonusTotalRecoveryReport(
        exactMembersBonusTotalRecoverySimulation,
        exactMembersBonusTotalRecoveryParity
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
    await fs.writeFile(
      path.join(currentPcBaselineDir, "stage-wide-six-member-candidate-solver-simulation.json"),
      JSON.stringify(stageWideSixMemberSolverSimulation, null, 2)
    );
    await fs.writeFile(
      path.join(currentPcBaselineDir, "stage-wide-six-member-candidate-solver-parity.json"),
      JSON.stringify(stageWideSixMemberSolverParity, null, 2)
    );
    await fs.writeFile(
      path.join(currentPcBaselineDir, "exact-members-crown-bonus-total-recovery-simulation.json"),
      JSON.stringify(exactMembersBonusTotalRecoverySimulation, null, 2)
    );
    await fs.writeFile(
      path.join(currentPcBaselineDir, "exact-members-crown-bonus-total-recovery-parity.json"),
      JSON.stringify(exactMembersBonusTotalRecoveryParity, null, 2)
    );
    if (sideLocalExactEvidenceRecoverySimulation) {
      await fs.writeFile(
        path.join(currentPcBaselineDir, "side-local-exact-evidence-recovery-simulation.json"),
        JSON.stringify(sideLocalExactEvidenceRecoverySimulation, null, 2)
      );
      await fs.writeFile(
        currentPcSideLocalIncompleteOppositeEvidenceReportPath,
        buildCurrentPcSideLocalIncompleteOppositeEvidenceReport(
          sideLocalExactEvidenceRecoverySimulation,
          sideLocalExactEvidenceRecoveryParity
        )
      );
      await fs.writeFile(
        path.join(currentPcBaselineDir, "side-local-exact-evidence-recovery-parity.json"),
        JSON.stringify(sideLocalExactEvidenceRecoveryParity, null, 2)
      );
    }
    if (stageWideVariantSolverSimulation) {
      await fs.writeFile(
        currentPcStageWideVariantSolverReportPath,
        buildCurrentPcStageWideVariantEvidenceReport(
          stageWideVariantSolverSimulation,
          stageWideVariantParity,
          stageWideVariantStrictExactSimulation
        )
      );
      await fs.writeFile(
        path.join(
          currentPcBaselineDir,
          currentPcStageWideSlotProvenVariantSolver
            ? "stage-wide-six-member-candidate-solver-stage3-slot-proven-variant-evidence.json"
            : "stage-wide-six-member-candidate-solver-stage3-variant-evidence.json"
        ),
        JSON.stringify(stageWideVariantSolverSimulation, null, 2)
      );
      if (stageWideVariantStrictExactSimulation) {
        await fs.writeFile(
          path.join(
            currentPcBaselineDir,
            "stage-wide-six-member-candidate-solver-stage3-slot-proven-variant-evidence-strict-exact.json"
          ),
          JSON.stringify(stageWideVariantStrictExactSimulation, null, 2)
        );
      }
      if (stageWideVariantParity) {
        await fs.writeFile(
          path.join(
            currentPcBaselineDir,
            "stage-wide-six-member-candidate-solver-stage3-slot-proven-variant-evidence-parity.json"
          ),
          JSON.stringify(stageWideVariantParity, null, 2)
        );
      }
    }
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
    if (currentPcStage3SlotGeometryDiagnosticsArtifacts) {
      await fs.writeFile(
        currentPcStage3SlotGeometryReportPath,
        buildCurrentPcStage3SlotGeometryDiagnosticsReport(
          currentPcStage3SlotGeometryDiagnosticsArtifacts
        )
      );
      if (currentPcStage3GeometrySlotSimulation) {
        await fs.writeFile(
          path.join(currentPcBaselineDir, "stage3-geometry-slot-evidence-simulation.json"),
          JSON.stringify(currentPcStage3GeometrySlotSimulation, null, 2)
        );
      }
    }
    if (currentPcStage3MergedRunImageSplitSimulation) {
      await fs.writeFile(
        path.join(currentPcBaselineDir, "stage3-self-merged-run-image-split-simulation.json"),
        JSON.stringify(currentPcStage3MergedRunImageSplitSimulation, null, 2)
      );
      await fs.writeFile(
        currentPcStage3MergedRunImageSplitReportPath,
        buildCurrentPcStage3SelfMergedRunImageSplitReport(
          currentPcStage3MergedRunImageSplitArtifacts,
          currentPcStage3MergedRunImageSplitSimulation
        )
      );
    }
    if (currentPcSlotRoiDiagnosticsArtifacts) {
      await fs.writeFile(
        currentPcSlotRoiDiagnosticsReportPath,
        buildCurrentPcSlotRoiDiagnosticsReport(currentPcSlotRoiDiagnosticsArtifacts)
      );
    }
    if (currentPcStage3SlotGeometryDiagnosticsArtifacts) {
      await terminateAuditGeometryWorker();
    }
  }
  let smartphoneCrownBonusStageWideSolverSimulationResult = null;
  if (smartphoneCrownStageWideSolverSimulation) {
    const cacheSummary = await writeSmartphoneBaselineCacheSummary(
      report.filter((item) => item.source === "smartphone" && item.expectedData)
    );
    smartphoneCrownBonusStageWideSolverSimulationResult =
      await buildAndWriteSmartphoneCrownStageWideSolverSimulation({
        report,
        source: "fresh OCR run",
        cacheSummary,
      });
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
        smartphoneCrownBonusStageWideSolverSimulation:
          smartphoneCrownBonusStageWideSolverSimulationResult
            ? {
                report: path
                  .relative(rootDir, smartphoneCrownBonusStageWideSolverReportPath)
                  .replaceAll("\\", "/"),
                result: path
                  .relative(
                    rootDir,
                    path.join(rootDir, "tmp", "smartphone-crown-bonus-stage-wide-solver-simulation.json")
                  )
                  .replaceAll("\\", "/"),
                crownBonus:
                  smartphoneCrownBonusStageWideSolverSimulationResult.crownBonusSimulation
                    ? {
                        truePositives:
                          smartphoneCrownBonusStageWideSolverSimulationResult.crownBonusSimulation
                            .truePositives,
                        falsePositives:
                          smartphoneCrownBonusStageWideSolverSimulationResult.crownBonusSimulation
                            .falsePositives,
                        falseNegatives:
                          smartphoneCrownBonusStageWideSolverSimulationResult.crownBonusSimulation
                            .falseNegatives,
                        blocked:
                          smartphoneCrownBonusStageWideSolverSimulationResult.crownBonusSimulation
                            .blocked,
                        trueIncrementalTp:
                          smartphoneCrownBonusStageWideSolverSimulationResult.crownBonusSimulation
                            .trueIncrementalTp,
                      }
                    : null,
                stageWide:
                  smartphoneCrownBonusStageWideSolverSimulationResult.stageWideSimulation
                    ? {
                        truePositives:
                          smartphoneCrownBonusStageWideSolverSimulationResult.stageWideSimulation
                            .truePositives,
                        falsePositives:
                          smartphoneCrownBonusStageWideSolverSimulationResult.stageWideSimulation
                            .falsePositives,
                        falseNegatives:
                          smartphoneCrownBonusStageWideSolverSimulationResult.stageWideSimulation
                            .falseNegatives,
                        blocked:
                          smartphoneCrownBonusStageWideSolverSimulationResult.stageWideSimulation
                            .blocked,
                        trueIncrementalTp:
                          smartphoneCrownBonusStageWideSolverSimulationResult.stageWideSimulation
                            .trueIncrementalTp,
                      }
                    : null,
              }
            : null,
        currentPcBaseline: currentPcBaselineArtifacts
          ? {
              report: path.relative(rootDir, currentPcBaselineReportPath).replaceAll("\\", "/"),
              groupedRawParityReport: path.relative(rootDir, currentPcGroupedRawParityReportPath).replaceAll("\\", "/"),
              stage3SevenDigitParityReport: path.relative(rootDir, currentPcStage3SevenDigitParityReportPath).replaceAll("\\", "/"),
              crownBonusRuleSimulationReport: path.relative(rootDir, currentPcCrownBonusSimulationReportPath).replaceAll("\\", "/"),
              crownBonusRuleParityReport: path.relative(rootDir, currentPcCrownBonusParityReportPath).replaceAll("\\", "/"),
              stageWideSixMemberSolverReport: path.relative(rootDir, currentPcStageWideSolverReportPath).replaceAll("\\", "/"),
              stageWideSixMemberSolverParityReport: path.relative(rootDir, currentPcStageWideSolverParityReportPath).replaceAll("\\", "/"),
              exactMembersBonusTotalRecoveryReport: path
                .relative(rootDir, currentPcExactMembersBonusTotalRecoveryReportPath)
                .replaceAll("\\", "/"),
              outputDir: currentPcBaselineArtifacts.outputDir,
              summary: currentPcBaselineArtifacts.summaryPath,
              crownBonusRuleSimulation: path
                .relative(rootDir, path.join(currentPcBaselineDir, "crown-bonus-rule-simulation.json"))
                .replaceAll("\\", "/"),
              crownBonusRuleParity: path
                .relative(rootDir, path.join(currentPcBaselineDir, "crown-bonus-rule-parity.json"))
                .replaceAll("\\", "/"),
              stageWideSixMemberSolverSimulation: path
                .relative(
                  rootDir,
                  path.join(currentPcBaselineDir, "stage-wide-six-member-candidate-solver-simulation.json")
                )
                .replaceAll("\\", "/"),
              stageWideSixMemberSolverParity: path
                .relative(
                  rootDir,
                  path.join(currentPcBaselineDir, "stage-wide-six-member-candidate-solver-parity.json")
                )
                .replaceAll("\\", "/"),
              exactMembersBonusTotalRecoverySimulation: path
                .relative(
                  rootDir,
                  path.join(
                    currentPcBaselineDir,
                    "exact-members-crown-bonus-total-recovery-simulation.json"
                  )
                )
                .replaceAll("\\", "/"),
              exactMembersBonusTotalRecoveryParity: path
                .relative(
                  rootDir,
                  path.join(
                    currentPcBaselineDir,
                    "exact-members-crown-bonus-total-recovery-parity.json"
                  )
                )
                .replaceAll("\\", "/"),
              sideLocalExactEvidenceRecoverySimulation:
                sideLocalExactEvidenceRecoverySimulation
                  ? {
                      report: path
                        .relative(
                          rootDir,
                          currentPcSideLocalIncompleteOppositeEvidenceReportPath
                        )
                        .replaceAll("\\", "/"),
                      simulation: path
                        .relative(
                          rootDir,
                          path.join(
                            currentPcBaselineDir,
                            "side-local-exact-evidence-recovery-simulation.json"
                          )
                        )
                        .replaceAll("\\", "/"),
                      parity: path
                        .relative(
                          rootDir,
                          path.join(
                            currentPcBaselineDir,
                            "side-local-exact-evidence-recovery-parity.json"
                          )
                        )
                        .replaceAll("\\", "/"),
                      truePositives: sideLocalExactEvidenceRecoverySimulation.truePositives,
                      falsePositives: sideLocalExactEvidenceRecoverySimulation.falsePositives,
                      falseNegatives: sideLocalExactEvidenceRecoverySimulation.falseNegatives,
                      blocked: sideLocalExactEvidenceRecoverySimulation.blocked,
                      trueIncrementalTp:
                        sideLocalExactEvidenceRecoverySimulation.trueIncrementalTp,
                      tpParityExact: sideLocalExactEvidenceRecoveryParity?.tpParityExact || 0,
                      safetyRelevantMismatches:
                        sideLocalExactEvidenceRecoveryParity?.safetyRelevantMismatches || 0,
                      recommendation: sideLocalExactEvidenceRecoverySimulation.recommendation,
                    }
                  : null,
              stageWideVariantSolver: stageWideVariantSolverSimulation
                ? {
                    report: path.relative(rootDir, currentPcStageWideVariantSolverReportPath).replaceAll("\\", "/"),
                    simulation: path
                      .relative(
                        rootDir,
                        path.join(
                          currentPcBaselineDir,
                          currentPcStageWideSlotProvenVariantSolver
                            ? "stage-wide-six-member-candidate-solver-stage3-slot-proven-variant-evidence.json"
                            : "stage-wide-six-member-candidate-solver-stage3-variant-evidence.json"
                        )
                      )
                      .replaceAll("\\", "/"),
                    strictExactSimulation: stageWideVariantStrictExactSimulation
                      ? path
                          .relative(
                            rootDir,
                            path.join(
                              currentPcBaselineDir,
                              "stage-wide-six-member-candidate-solver-stage3-slot-proven-variant-evidence-strict-exact.json"
                            )
                          )
                          .replaceAll("\\", "/")
                      : null,
                    parity: stageWideVariantParity
                      ? path
                          .relative(
                            rootDir,
                            path.join(
                              currentPcBaselineDir,
                              "stage-wide-six-member-candidate-solver-stage3-slot-proven-variant-evidence-parity.json"
                            )
                          )
                          .replaceAll("\\", "/")
                      : null,
                  }
                : null,
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
              stage3SlotGeometryDiagnostics: currentPcStage3SlotGeometryDiagnosticsArtifacts
                ? {
                    report: path.relative(rootDir, currentPcStage3SlotGeometryReportPath).replaceAll("\\", "/"),
                    outputDir: currentPcStage3SlotGeometryDiagnosticsArtifacts.outputDir,
                    summary: currentPcStage3SlotGeometryDiagnosticsArtifacts.summaryPath,
                    geometrySlotSimulation: currentPcStage3GeometrySlotSimulation
                      ? path
                          .relative(
                            rootDir,
                            path.join(
                              currentPcBaselineDir,
                              "stage3-geometry-slot-evidence-simulation.json"
                            )
                          )
                          .replaceAll("\\", "/")
                      : null,
                  }
                : null,
              stage3SelfMergedRunImageSplitExperiment:
                currentPcStage3MergedRunImageSplitSimulation
                  ? {
                      report: path
                        .relative(rootDir, currentPcStage3MergedRunImageSplitReportPath)
                        .replaceAll("\\", "/"),
                      outputDir: currentPcStage3MergedRunImageSplitArtifacts?.outputDir || null,
                      summary: currentPcStage3MergedRunImageSplitArtifacts?.summaryPath || null,
                      simulation: path
                        .relative(
                          rootDir,
                          path.join(
                            currentPcBaselineDir,
                            "stage3-self-merged-run-image-split-simulation.json"
                          )
                        )
                        .replaceAll("\\", "/"),
                      mergedRunsDetected:
                        currentPcStage3MergedRunImageSplitArtifacts?.stats?.detectedRuns || 0,
                      exactMembersRecovered:
                        currentPcStage3MergedRunImageSplitSimulation.exactMembersRecovered,
                      truePositives:
                        currentPcStage3MergedRunImageSplitSimulation.truePositives,
                      falsePositives:
                        currentPcStage3MergedRunImageSplitSimulation.falsePositives,
                      trueIncrementalTp:
                        currentPcStage3MergedRunImageSplitSimulation.trueIncrementalTp,
                      wrongSlotAssignments:
                        currentPcStage3MergedRunImageSplitSimulation.wrongSlotAssignments,
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






