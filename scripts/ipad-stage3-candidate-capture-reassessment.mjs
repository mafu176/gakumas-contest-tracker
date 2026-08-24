import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const outDir = path.join(rootDir, "tmp", "ipad-stage3-candidate-capture-reassessment");
const expectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const manifestPath = path.join(expectedDir, "manifest.json");
const productionSummaryPath = path.join(
  rootDir,
  "tmp",
  "ipad-production-fp-investigation",
  "after-fix-53-two-run-summary.json"
);
const stage3MatrixPath = path.join(rootDir, "tmp", "ipad-stage3-v2-architecture", "stage3-field-matrix.json");
const stage3FullsideScorecardPath = path.join(rootDir, "tmp", "ipad-stage3-fullside-browser-export", "architecture-scorecard.json");
const rapidOcrReadinessPath = path.join(
  rootDir,
  "tmp",
  "ipad-stage3-rapidocr-production-readiness",
  "summary.json"
);

const fields = ["member1", "member2", "member3", "bonus", "total"];
const memberFields = ["member1", "member2", "member3"];

function toNumber(value) {
  const n = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function pct(numerator, denominator) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(1)) : 0;
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(name, value) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function currentProductionBaseline(summary) {
  const run = summary?.runs?.[0] || {};
  return {
    fixtureCount: Number(summary?.fixtureCount || 0),
    stagesExact: Number(run.stagePass || 0),
    stagesTotal: Number(run.stagePass || 0) + Number(run.stageFail || 0),
    stageSidesExact: Number(run.stageSidePass || 0),
    stageSidesTotal: Number(run.stageSidePass || 0) + Number(run.stageSideFail || 0),
    productionTp: Number(run.tp || 0),
    productionFp: Number(run.fp || 0),
    byRecovery: run.byRecovery || {},
    source: path.relative(rootDir, productionSummaryPath).replaceAll("\\", "/"),
  };
}

function expectedDetailAvailableRows(rows) {
  const images = new Set(rows.map((row) => row.image));
  const clusterCounts = {};
  for (const row of rows) increment(clusterCounts, row.cluster || "unknown");
  return {
    source: path.relative(rootDir, stage3MatrixPath).replaceAll("\\", "/"),
    images: images.size,
    stage3Sides: rows.length,
    clusters: clusterCounts,
  };
}

function candidateValues(field = {}) {
  return Array.isArray(field.candidateValues)
    ? field.candidateValues.map(toNumber).filter((value) => value > 0)
    : [];
}

function fieldRawTexts(field = {}) {
  const texts = [];
  for (const item of field.rawTexts || []) {
    if (typeof item === "string") texts.push(item);
  }
  for (const item of field.provenance || []) {
    if (item?.rawText) texts.push(item.rawText);
  }
  return [...new Set(texts.filter(Boolean))];
}

function digitString(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function textShapeForExpected(text, expectedValue) {
  const expected = digitString(expectedValue);
  const digits = digitString(text);
  if (!expected) return "other";
  if (digits === expected) return "full-correct-digits";
  if (digits.includes(expected)) return "merged-with-another-number";
  if (expected.includes(digits) && digits.length >= 2) {
    if (expected.startsWith(digits)) return "missing-trailing-digits";
    if (expected.endsWith(digits)) return "missing-leading-digits";
    return "split-or-internal-fragment";
  }
  if (/[,.]\d/.test(text) || /\d[,.]/.test(text)) return "digits-with-punctuation-or-grouping";
  if (/\d/.test(text)) {
    const digitOverlap = [...new Set(digits)].filter((digit) => expected.includes(digit)).length;
    if (digitOverlap >= Math.min(3, new Set(expected).size)) return "character-substitution-or-contamination";
    return "unrelated-numeric-noise";
  }
  return "not-recognized-at-all";
}

function bestRawShape(field = {}) {
  const texts = fieldRawTexts(field);
  if (!texts.length) return "not-recognized-at-all";
  const priority = [
    "full-correct-digits",
    "merged-with-another-number",
    "digits-with-punctuation-or-grouping",
    "missing-leading-digits",
    "missing-trailing-digits",
    "split-or-internal-fragment",
    "character-substitution-or-contamination",
    "unrelated-numeric-noise",
    "not-recognized-at-all",
  ];
  const shapes = texts.map((text) => textShapeForExpected(text, field.expected));
  return shapes.sort((a, b) => priority.indexOf(a) - priority.indexOf(b))[0] || "not-recognized-at-all";
}

function classifyWrongField(field = {}) {
  if (field.candidatePresent) return "S";
  if (field.rawExactPresent) return "RAW";
  const values = candidateValues(field);
  const expectedDigits = digitString(field.expected);
  if (
    values.some((value) => {
      const digits = digitString(value);
      return digits.length >= 2 && expectedDigits.includes(digits);
    })
  ) {
    return "FRAGMENT";
  }
  if (values.length > 1) return "AMBIGUOUS";
  if (bestRawShape(field) !== "not-recognized-at-all") return "R";
  return "R";
}

function normalizeField(row, fieldName) {
  const field = row.fields?.[fieldName] || {};
  return {
    field: fieldName,
    expected: toNumber(field.expected),
    production: toNumber(field.actual),
    selectedExact: Boolean(field.selected),
    candidatePresent: Boolean(field.candidatePresent),
    rawExactPresent: Boolean(field.rawExactPresent),
    candidateCount: Number(field.candidateCount || 0),
    candidateValues: candidateValues(field).slice(0, 12),
    rawShape: bestRawShape(field),
    rejectionClass: field.selected ? "correct" : classifyWrongField(field),
    provenance: field.provenance || [],
  };
}

function stage3FailureInventory(rows) {
  return rows
    .filter((row) => !row.selectedPass)
    .map((row) => {
      const normalizedFields = Object.fromEntries(fields.map((field) => [field, normalizeField(row, field)]));
      const wrongFields = fields.filter((field) => !normalizedFields[field].selectedExact);
      return {
        image: row.image,
        stage: 3,
        side: row.side,
        cluster: row.cluster,
        production: row.actual,
        expected: row.expected,
        wrongFields,
        existingCandidatePools: Object.fromEntries(
          fields.map((field) => [
            field,
            {
              candidates: normalizedFields[field].candidateValues,
              candidateCount: normalizedFields[field].candidateCount,
              expectedPresent: normalizedFields[field].candidatePresent,
              rawExactPresent: normalizedFields[field].rawExactPresent,
              rawShape: normalizedFields[field].rawShape,
            },
          ])
        ),
        recoveryProvenance: row.recoveryId || "",
        finalRecoveryBlockReason:
          wrongFields.length >= 3
            ? "multi-field Stage3 recognition failure; current safe selectors lack complete exact evidence"
            : wrongFields.length === 1
              ? "single-field unresolved after current selectors"
              : "multi-field unresolved after current selectors",
      };
    });
}

function buildFieldSummary(rows) {
  const stage3Sides = rows.length;
  const exactSides = rows.filter((row) => row.selectedPass).length;
  const failedSides = stage3Sides - exactSides;
  const wrongFieldCounts = {};
  const wrongFieldBySide = {};
  const wrongFieldByCluster = {};
  const recognitionSelection = {};
  const rawShapes = {};
  const oneFieldAway = [];
  const histogram = {};

  for (const field of fields) wrongFieldCounts[field] = 0;

  for (const row of rows) {
    const wrongFields = fields.filter((field) => !row.fields?.[field]?.selected);
    if (wrongFields.length > 0) increment(histogram, String(wrongFields.length));
    if (!row.selectedPass && wrongFields.length === 1) {
      const field = wrongFields[0];
      const normalized = normalizeField(row, field);
      oneFieldAway.push({
        image: row.image,
        stage: 3,
        side: row.side,
        cluster: row.cluster,
        wrongField: field,
        expected: normalized.expected,
        production: normalized.production,
        candidatePresent: normalized.candidatePresent,
        rawExactPresent: normalized.rawExactPresent,
        rawShape: normalized.rawShape,
        candidateValues: normalized.candidateValues,
        otherFieldsAlreadyCorrect: fields.filter((candidate) => candidate !== field).every(
          (candidate) => row.fields?.[candidate]?.selected
        ),
        currentRecoveryBlockReason: "current production selectors did not produce a safe final side",
      });
    }

    for (const field of wrongFields) {
      const normalized = normalizeField(row, field);
      increment(wrongFieldCounts, field);
      increment(wrongFieldBySide, `${row.side}.${field}`);
      increment(wrongFieldByCluster, `${row.cluster || "unknown"}.${field}`);
      increment(recognitionSelection, `${field}.${normalized.rejectionClass}`);
      increment(rawShapes, `${field}.${normalized.rawShape}`);
    }
  }

  const oneFieldAwayCounts = {};
  for (const row of oneFieldAway) increment(oneFieldAwayCounts, row.wrongField);

  const candidateCaptureCeiling = Object.fromEntries(
    fields.map((field) => [
      field,
      oneFieldAway.filter((row) => row.wrongField === field && !row.candidatePresent).length,
    ])
  );

  return {
    stage3Sides,
    exactSides,
    failedSides,
    exactPct: pct(exactSides, stage3Sides),
    wrongFieldCounts,
    wrongFieldBySide,
    wrongFieldByCluster,
    recognitionSelection,
    rawShapes,
    wrongFieldHistogram: histogram,
    oneFieldAway,
    oneFieldAwayCounts,
    candidateCaptureCeiling,
  };
}

function structuralGroups(inventory) {
  const groups = {};
  for (const row of inventory) {
    for (const field of row.wrongFields) {
      const info = row.existingCandidatePools[field];
      const group = `${field}:${info.rawShape}`;
      increment(groups, group);
    }
  }
  return Object.entries(groups)
    .map(([family, count]) => ({ family, count }))
    .filter((row) => row.count >= 2)
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));
}

function exhaustedApproaches() {
  return [
    {
      approach: "Stage3 member2 PSM 6/7/8/10/13 and numeric configs",
      fixtureScope: "18 fixtures / 36 Stage3 member2 fields",
      gain: "0 exact Stage3 member2 candidates; 0 Tier C TP",
      noise: "PSM6 emitted wrong numeric candidates for every field",
      rejectedBecause: "config-only tuning did not produce exact candidates and introduced noise",
      revisitWith53: "no, no new structural reason",
    },
    {
      approach: "member2 left-edge crop/padding",
      fixtureScope: "18 fixtures",
      gain: "no production-safe gain",
      noise: "edge changes did not produce stable exact values",
      rejectedBecause: "member2 evidence remained recognition-limited",
      revisitWith53: "no, same Stage3 missing-evidence shape",
    },
    {
      approach: "symbol/word hierarchy segmentation",
      fixtureScope: "18 fixtures / 36 member2 fields",
      gain: "0",
      noise: "0 emitted candidates because hierarchy was unavailable",
      rejectedBecause: "browser Tesseract returned no usable word/symbol bboxes",
      revisitWith53: "no, unless browser OCR hierarchy export changes",
    },
    {
      approach: "full-side F1/F2/F3 Tesseract",
      fixtureScope: "10 images",
      gain: "0 assigned candidate gains",
      noise: "many unassigned raw tokens; no bbox-backed assignment",
      rejectedBecause: "raw text existed without field-safe geometry",
      revisitWith53: "no, not without bbox/provenance improvement",
    },
    {
      approach: "grouped-number token work",
      fixtureScope: "18 fixtures / all stage sides",
      gain: "15 TP, Stage1/2 only",
      noise: "T2-only 0 FP; T1/T3 unsafe",
      rejectedBecause: "already productionized safe part; Stage3 emitted 0 T2 candidates",
      revisitWith53: "no, Stage3 remains untouched by T2",
    },
    {
      approach: "total candidate capture/selection",
      fixtureScope: "18 fixtures / 108 totals",
      gain: "strict-total safe part productionized; capture profiles too noisy",
      noise: "T3/profile variants introduced broad noise",
      rejectedBecause: "remaining value was selection-only or noisy capture",
      revisitWith53: "no for Stage3 candidate capture; total-only is not a Stage3 recognition fix",
    },
    {
      approach: "Stage3 RapidOCR / detector browser / detectorless browser",
      fixtureScope: "53 fixtures / 106 Stage3 sides",
      gain: "NET_NEW_TP 0 / NET_NEW_FP 0",
      noise: "safe but no accepted applications under frozen R6",
      rejectedBecause: "browser-feasible candidate did not survive strict production-readiness",
      revisitWith53: "no, explicitly closed",
    },
  ];
}

function rankOpportunities(fieldSummary, groups) {
  const groupByField = {};
  for (const group of groups) {
    const [field] = group.family.split(":");
    groupByField[field] ||= [];
    groupByField[field].push(group);
  }
  return fields.map((field) => {
    const potential = fieldSummary.candidateCaptureCeiling[field] || 0;
    const wrong = fieldSummary.wrongFieldCounts[field] || 0;
    const recurrentShapes = groupByField[field] || [];
    const previouslyTested =
      field.startsWith("member")
        ? "member OCR configs, tokenization, fullside, RapidOCR"
        : field === "total"
          ? "total capture/selection, fullside, RapidOCR"
          : "bonus capture/strict bonus, fullside, RapidOCR";
    return {
      family: `${field} candidate capture`,
      field,
      affectedSides: wrong,
      oneFieldAwaySides: fieldSummary.oneFieldAwayCounts[field] || 0,
      potentialNetNewTp: potential,
      currentRawEvidenceShape: recurrentShapes.slice(0, 3).map((row) => `${row.family} (${row.count})`),
      previouslyTested,
      expectedFpOrNoiseRisk: potential >= 2 ? "unknown; would require fresh browser profile run" : "not worth measuring",
      implementationComplexity: field.startsWith("member") ? "high" : "medium",
      bothClusters:
        (fieldSummary.wrongFieldByCluster[`ipad-01.${field}`] || 0) > 0 &&
        (fieldSummary.wrongFieldByCluster[`ipad-02.${field}`] || 0) > 0,
      recommended: potential >= 2 ? "candidate experiment eligible" : "no; ceiling below threshold",
    };
  });
}

function selectedFamily(ranking) {
  const eligible = ranking.filter((row) => row.potentialNetNewTp >= 2);
  if (!eligible.length) {
    return {
      selected: false,
      reason:
        "No Stage3 field family has a verified candidate-capture ceiling >= 2 in the available browser-Tesseract detailed artifacts.",
      experimentRun: false,
      frozenProfiles: [],
    };
  }
  const winner = eligible.sort(
    (a, b) =>
      b.potentialNetNewTp - a.potentialNetNewTp ||
      Number(b.bothClusters) - Number(a.bothClusters) ||
      b.affectedSides - a.affectedSides
  )[0];
  return {
    selected: true,
    family: winner.family,
    reason: "Highest verified one-field-away candidate-capture ceiling.",
    experimentRun: false,
    frozenProfiles: [
      {
        id: "baseline-production-profile",
        note: "Placeholder only. A fresh browser run should freeze at most three additional deterministic profiles before scoring.",
      },
    ],
  };
}

async function main() {
  const manifest = await readJson(manifestPath, { images: [] });
  const completeFixtures = (manifest.images || []).filter((entry) => entry.expectedStatus === "complete");
  const productionSummary = await readJson(productionSummaryPath, null);
  if (!productionSummary) throw new Error(`Missing production summary: ${productionSummaryPath}`);
  const stage3Rows = await readJson(stage3MatrixPath, []);
  const fullsideScorecard = await readJson(stage3FullsideScorecardPath, []);
  const rapidOcrReadiness = await readJson(rapidOcrReadinessPath, null);

  const baseline = currentProductionBaseline(productionSummary);
  const detailAvailability = expectedDetailAvailableRows(stage3Rows);
  const inventory = stage3FailureInventory(stage3Rows);
  const fieldSummary = buildFieldSummary(stage3Rows);
  const groups = structuralGroups(inventory);
  const exhausted = exhaustedApproaches();
  const ranking = rankOpportunities(fieldSummary, groups);
  const decision = selectedFamily(ranking);

  const recognitionVsSelection = {};
  for (const [key, count] of Object.entries(fieldSummary.recognitionSelection)) {
    const [field, classification] = key.split(".");
    recognitionVsSelection[field] ||= {};
    recognitionVsSelection[field][classification] = count;
  }

  const candidateHelp = fieldSummary.oneFieldAway.map((row) => ({
    ...row,
    helpClass: row.candidatePresent
      ? "B. candidate exists; selection still required"
      : "C. exact candidate is absent and no current safe selector can be tested without new capture evidence",
  }));

  const candidateGains = {
    experimentRun: false,
    reason: decision.selected
      ? "A family is theoretically eligible, but this script does not run browser OCR by default."
      : decision.reason,
    targetFieldsTested: 0,
    exactCandidatePresent: 0,
    newExactCandidateVsBaseline: 0,
    wrongNumericCandidates: 0,
    emptyOcr: 0,
    fragmentCandidates: 0,
    duplicateCandidates: 0,
  };

  const recommendation = decision.selected
    ? "Run a separate bounded real-browser Tesseract profile pass for the selected family before any selector work."
    : "Do not run another Stage3 browser-Tesseract tuning pass now. Current detailed evidence has no one-field-away Stage3 candidate-capture ceiling >= 2; expand/refresh full 53 detailed browser artifacts or close iPad OCR optimization until new evidence arrives.";

  const report = {
    baseline,
    detailAvailability: {
      ...detailAvailability,
      currentCompletedFixtures: completeFixtures.length,
      currentStage3SidesExpected: completeFixtures.length * 2,
      detailedCoverageNote:
        detailAvailability.stage3Sides === completeFixtures.length * 2
          ? "Detailed Stage3 candidate artifacts cover all current fixtures."
          : "Detailed Stage3 candidate artifacts do not cover all current fixtures; current 53-fixture aggregate is used only for release baseline confirmation.",
    },
    stage3Failures: inventory,
    fieldSummary,
    recognitionVsSelection,
    candidateHelp,
    exhaustedApproaches: exhausted,
    rawOcrShapes: fieldSummary.rawShapes,
    structuralGroups: groups,
    opportunityRanking: ranking,
    selectedFamily: decision,
    profileDefinitions: decision.frozenProfiles,
    candidateGains,
    candidateUnion: { experimentRun: false, candidates: [] },
    fragmentNoise: {
      experimentRun: false,
      currentStructuralGroups: groups,
      note: "No new candidate source was added, so no new fragment/noise surface was created.",
    },
    existingRecoverySimulation: {
      experimentRun: false,
      realisticNetNewTp: 0,
      note: "Existing recoveries were not rerun with new evidence because no bounded candidate-capture experiment was justified.",
    },
    browserStability: {
      experimentRun: false,
      reason: "Two-context verification is gated on >=2 realistic TP candidate gain.",
    },
    fullSafety: {
      experimentRun: false,
      reason: "Full safety expansion is gated on >=2 candidate gains.",
      fullsideScorecardPresent: Boolean(fullsideScorecard),
      rapidOcrReadinessPresent: Boolean(rapidOcrReadiness),
    },
    recommendation,
  };

  await writeJson("baseline.json", report.baseline);
  await writeJson("stage3-failures.json", report.stage3Failures);
  await writeJson("field-summary.json", report.fieldSummary);
  await writeJson("recognition-selection.json", report.recognitionVsSelection);
  await writeJson("one-field-away.json", report.fieldSummary.oneFieldAway);
  await writeJson("candidate-leverage.json", {
    candidateCaptureCeiling: report.fieldSummary.candidateCaptureCeiling,
    candidateHelp,
  });
  await writeJson("exhausted-approaches.json", report.exhaustedApproaches);
  await writeJson("raw-ocr-shapes.json", report.rawOcrShapes);
  await writeJson("structural-groups.json", report.structuralGroups);
  await writeJson("opportunity-ranking.json", report.opportunityRanking);
  await writeJson("selected-family.json", report.selectedFamily);
  await writeJson("profile-definitions.json", report.profileDefinitions);
  await writeJson("target-browser-results.json", { experimentRun: false, reason: candidateGains.reason });
  await writeJson("candidate-gains.json", report.candidateGains);
  await writeJson("candidate-union.json", report.candidateUnion);
  await writeJson("fragment-noise.json", report.fragmentNoise);
  await writeJson("existing-recovery-simulation.json", report.existingRecoverySimulation);
  await writeJson("browser-stability.json", report.browserStability);
  await writeJson("full-safety.json", report.fullSafety);
  await writeJson("recommendation.json", { recommendation });

  console.log(
    JSON.stringify(
      {
        artifactDir: path.relative(rootDir, outDir).replaceAll("\\", "/"),
        currentBaseline: {
          fixtures: baseline.fixtureCount,
          stagesExact: `${baseline.stagesExact} / ${baseline.stagesTotal}`,
          stageSidesExact: `${baseline.stageSidesExact} / ${baseline.stageSidesTotal}`,
          productionTpFp: `${baseline.productionTp} / ${baseline.productionFp}`,
        },
        detailedStage3Coverage: `${detailAvailability.stage3Sides} / ${completeFixtures.length * 2}`,
        stage3ExactSides: `${fieldSummary.exactSides} / ${fieldSummary.stage3Sides}`,
        wrongFieldCounts: fieldSummary.wrongFieldCounts,
        oneFieldAwayCounts: fieldSummary.oneFieldAwayCounts,
        candidateCaptureCeiling: fieldSummary.candidateCaptureCeiling,
        selectedFamily: decision,
        realisticNetNewTp: report.existingRecoverySimulation.realisticNetNewTp,
        recommendation,
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
