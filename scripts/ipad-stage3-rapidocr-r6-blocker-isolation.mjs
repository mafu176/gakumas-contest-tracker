import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { evaluateIpadStage3RapidOcrR6 } from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-r6-blocker-isolation");
const browserRunDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-nonzero-bonus", "run-1");
const parityDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-browser");
const offlineDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-fixture-expansion");

const sides = ["self", "enemy"];
const fields = ["member1", "member2", "member3", "bonus", "total"];
const policyId = "BEST-CURRENT-BROWSER-EVIDENCE";

function normalizePathForReport(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.writeFile(path.join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function fieldValue(proposal, field) {
  if (field === "member1") return Number(proposal.members?.[0] || 0);
  if (field === "member2") return Number(proposal.members?.[1] || 0);
  if (field === "member3") return Number(proposal.members?.[2] || 0);
  return Number(proposal[field] || 0);
}

function rowKey(row) {
  return `${row.image}|${row.stage}|${row.side}`;
}

function isBaselineCandidate(row) {
  return !row.crop?.variantId || row.crop.variantId === "baseline-12pct-padding";
}

function isBestCurrentBrowserEvidence(row) {
  const field = row.assignedField || row.sourceField;
  const variantId = row.crop?.variantId;
  if (field === "member1") return isBaselineCandidate(row);
  if (field === "member2") {
    return ["baseline-12pct-padding", "member2-vertical-expand-8pct"].includes(variantId);
  }
  if (field === "member3") {
    return ["baseline-12pct-padding", "member3-left-expand-right-trim-8pct", "member3-vertical-expand-8pct"].includes(
      variantId
    );
  }
  if (field === "bonus") return true;
  if (field === "total") {
    return ["baseline-12pct-padding", "total-horizontal-expand-8pct", "total-vertical-expand-10pct"].includes(
      variantId
    );
  }
  return false;
}

function rowsForField(candidateRows, image, side, field) {
  return candidateRows.filter(
    (row) => row.image === image && row.stage === 3 && row.side === side && (row.assignedField || row.sourceField) === field
  );
}

function valuesFor(rows) {
  return [...new Set(rows.map((row) => Number(row.value)).filter(Number.isFinite))].sort((a, b) => a - b);
}

function fragmentRows(rows, expectedValue) {
  const expectedText = String(Math.abs(Number(expectedValue || 0)));
  if (expectedText.length <= 1) return [];
  return rows
    .filter((row) => {
      const valueText = String(Math.abs(Number(row.value || 0)));
      return valueText.length > 0 && valueText.length < expectedText.length && expectedText.includes(valueText);
    })
    .map((row) => ({
      value: Number(row.value),
      raw: row.raw,
      fullText: row.fullText,
      confidence: row.confidence,
      variantId: row.crop?.variantId,
      preprocessingProfileId: row.crop?.preprocessingProfileId,
    }));
}

function summarizeSupport(candidateRows, image, side, field, value) {
  const fieldRows = rowsForField(candidateRows, image, side, field);
  const exactRows = fieldRows.filter((row) => Number(row.value) === Number(value));
  const confidences = exactRows.map((row) => Number(row.confidence)).filter(Number.isFinite);
  return {
    field,
    value,
    supportCount: exactRows.length,
    distinctCandidateCount: valuesFor(fieldRows).length,
    sourceCount: fieldRows.length,
    values: valuesFor(fieldRows),
    variants: [...new Set(exactRows.map((row) => row.crop?.variantId).filter(Boolean))],
    preprocessingProfileIds: [...new Set(exactRows.map((row) => row.crop?.preprocessingProfileId).filter(Boolean))],
    parsers: [...new Set(exactRows.map((row) => row.parser).filter(Boolean))],
    rawTexts: [...new Set(exactRows.map((row) => row.fullText).filter(Boolean))].slice(0, 12),
    allRawTexts: [...new Set(fieldRows.map((row) => row.fullText).filter(Boolean))].slice(0, 20),
    confidence: {
      min: confidences.length ? Number(Math.min(...confidences).toFixed(4)) : null,
      max: confidences.length ? Number(Math.max(...confidences).toFixed(4)) : null,
      mean: confidences.length
        ? Number((confidences.reduce((sum, entry) => sum + entry, 0) / confidences.length).toFixed(4))
        : null,
    },
    bbox: {
      availableCount: exactRows.filter((row) => row.bbox).length,
      ambiguousCount: exactRows.filter((row) => row.assignment?.ambiguous).length,
    },
    digitCount: String(Math.abs(Number(value || 0))).length,
    fragments: fragmentRows(fieldRows, value),
  };
}

function supportCategory(support, offlineSupport) {
  if (support.supportCount > 0 && Number(support.confidence.max || 0) < 0.9) return "C";
  if (support.supportCount > 0 && Number(support.distinctCandidateCount || 0) > 8) return "E";
  if (support.supportCount > 0) {
    const offlineVariants = new Set(offlineSupport?.variants || []);
    const browserVariants = new Set(support.variants || []);
    const sameProvenance =
      offlineVariants.size === browserVariants.size && [...offlineVariants].every((entry) => browserVariants.has(entry));
    return sameProvenance ? "A" : "B";
  }
  if (support.fragments.length) return "G";
  return "F";
}

function categoryLabel(category) {
  return {
    A: "exact numeric candidate matches offline",
    B: "exact value exists but browser provenance differs",
    C: "exact value exists but confidence fails R6",
    D: "exact value exists but fragment guard blocks it",
    E: "exact value exists but multiplicity/ambiguity blocks it",
    F: "exact value absent",
    G: "browser only has prefix/suffix fragment",
    H: "other",
  }[category];
}

function buildEvidence(proposalRow, candidateRows) {
  const fieldSupports = Object.fromEntries(
    fields.map((field) => [
      field,
      summarizeSupport(candidateRows, proposalRow.image, proposalRow.side, field, fieldValue(proposalRow.proposal, field)),
    ])
  );
  const changedSupports = proposalRow.changedFields.map((field) => fieldSupports[field]);
  const evidence = {
    ...proposalRow,
    fieldSupports,
    changedSupports,
    featureSummary: {
      changedFieldsLowDigit: changedSupports.filter((support) => Number(support.digitCount || 0) < 5).length,
    },
  };
  return {
    ...evidence,
    evaluation: evaluateIpadStage3RapidOcrR6(evidence),
  };
}

function classifyBlockers(row) {
  const reasons = row.evaluation?.blockReasons || [];
  const counts = {
    member1Capture: 0,
    member2Capture: 0,
    member3Capture: 0,
    bonusCapture: 0,
    totalCapture: 0,
    confidence: 0,
    fragment: 0,
    ambiguity: 0,
    provenance: 0,
    multiplicity: 0,
    incompleteEvidence: 0,
    arithmeticNonUnique: 0,
    other: 0,
  };
  for (const field of fields) {
    if (!row.changedFields.includes(field) && field !== "total") continue;
    if (Number(row.fieldSupports[field]?.supportCount || 0) > 0) continue;
    if (field === "member1") counts.member1Capture += 1;
    else if (field === "member2") counts.member2Capture += 1;
    else if (field === "member3") counts.member3Capture += 1;
    else if (field === "bonus") counts.bonusCapture += 1;
    else if (field === "total") counts.totalCapture += 1;
  }
  for (const reason of reasons) {
    if (reason.includes("confidence")) counts.confidence += 1;
    else if (reason.includes("low-digit") || reason.includes("too-short")) counts.fragment += 1;
    else if (reason.includes("pool-too-wide")) counts.multiplicity += 1;
    else if (reason.includes("ambiguous")) counts.ambiguity += 1;
    else if (reason.includes("missing") || reason.includes("lacks")) counts.incompleteEvidence += 1;
    else counts.other += 1;
  }
  return counts;
}

function addCounts(total, addition) {
  for (const [key, value] of Object.entries(addition)) total[key] = (total[key] || 0) + value;
  return total;
}

function cloneRow(row) {
  return JSON.parse(JSON.stringify(row));
}

function rerunEvaluation(row, mutation) {
  const copy = cloneRow(row);
  mutation(copy);
  copy.changedSupports = copy.changedFields.map((field) => copy.fieldSupports[field]);
  copy.evaluation = evaluateIpadStage3RapidOcrR6(copy);
  return copy.evaluation.wouldApply;
}

function perfectSupport(row, field) {
  const support = row.fieldSupports[field];
  if (!support) return;
  support.supportCount = Math.max(1, Number(support.supportCount || 0));
  support.distinctCandidateCount = 1;
  support.confidence = { min: 0.99, max: 0.99, mean: 0.99 };
  support.bbox = { availableCount: 1, ambiguousCount: 0 };
  support.digitCount = Math.max(5, Number(support.digitCount || 0));
}

function buildHypotheticals(browserFour) {
  const scenarios = {
    H1_perfectMember1: (row) => perfectSupport(row, "member1"),
    H2_perfectMember2: (row) => perfectSupport(row, "member2"),
    H3_perfectBonus: (row) => perfectSupport(row, "bonus"),
    H4_browserConfidenceMatchedOffline: (row) => {
      for (const field of fields) {
        if (row.fieldSupports[field]) {
          row.fieldSupports[field].confidence = { min: 0.99, max: 0.99, mean: 0.99 };
        }
      }
    },
    H5_onlyExactFullCandidatesFragmentsRemoved: (row) => {
      row.featureSummary.changedFieldsLowDigit = 0;
      for (const field of fields) {
        if (row.fieldSupports[field]) {
          row.fieldSupports[field].fragments = [];
          row.fieldSupports[field].digitCount = Math.max(5, Number(row.fieldSupports[field].digitCount || 0));
        }
      }
    },
    H6_candidateMultiplicityCollapsed: (row) => {
      for (const field of fields) {
        if (row.fieldSupports[field]) row.fieldSupports[field].distinctCandidateCount = 1;
      }
    },
  };
  return Object.fromEntries(
    Object.entries(scenarios).map(([name, mutation]) => {
      const rows = browserFour.map((row) => ({
        image: row.image,
        stage: row.stage,
        side: row.side,
        wouldApply: rerunEvaluation(row, mutation),
      }));
      return [name, { wouldApply: rows.filter((row) => row.wouldApply).length, rows }];
    })
  );
}

function buildAllSidesWinningBlocker(results, browserFour) {
  const winningFamily = "confidence";
  const rows = [];
  for (const result of results) {
    for (const side of sides) {
      const fieldSummaries = fields.map((field) => {
        const expectedValue = Number(result.expected?.[side]?.[field] || 0);
        const support = summarizeSupport(
          (result.candidateRows || []).filter(isBestCurrentBrowserEvidence),
          result.image,
          side,
          field,
          expectedValue
        );
        return {
          field,
          expectedValue,
          exact: support.supportCount > 0,
          maxConfidence: support.confidence.max,
          distinctCandidateCount: support.distinctCandidateCount,
        };
      });
      rows.push({
        image: result.image,
        stage: 3,
        side,
        allExact: fieldSummaries.every((entry) => entry.exact),
        exactFields: fieldSummaries.filter((entry) => entry.exact).length,
        anyExactBelow090: fieldSummaries.some(
          (entry) => entry.exact && Number(entry.maxConfidence || 0) > 0 && Number(entry.maxConfidence || 0) < 0.9
        ),
        allExactAndConfidenceOnlyCandidate: fieldSummaries.every((entry) => entry.exact) &&
          fieldSummaries.some((entry) => Number(entry.maxConfidence || 0) < 0.9),
        fields: fieldSummaries,
      });
    }
  }
  return {
    winningFamily,
    summary: {
      rows: rows.length,
      allFiveExact: rows.filter((row) => row.allExact).length,
      allFiveExactWithAnyBelow090: rows.filter((row) => row.allExactAndConfidenceOnlyCandidate).length,
      fourOfflineTpRowsBlockedByConfidence: browserFour.filter((row) =>
        (row.evaluation?.blockReasons || []).some((reason) => reason.includes("confidence"))
      ).length,
    },
    rows,
  };
}

function productionBaselineFromParity(paritySummary) {
  const safety = paritySummary?.ipadStage3RapidOcrR6Parity?.productionSafety || paritySummary?.productionSafety || {};
  return {
    completedLabeledIpadFixtures: safety.fixtureCount,
    productionRecoveries: safety.totalProductionRecoveries,
    productionTp: safety.tp,
    productionFp: safety.fp,
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const browserSummary = await readJson(path.join(browserRunDir, "summary.json"));
  const browserResults = await readJson(path.join(browserRunDir, "results.json"));
  const paritySummary = await readJson(path.join(parityDir, "summary.json"));
  const offlineR6 = await readJson(path.join(offlineDir, "r6-results.json"));
  const offlineCandidates = await readJson(path.join(offlineDir, "candidate-results.json"));

  const bestCandidateRows = browserResults.flatMap((result) => result.candidateRows || []).filter(isBestCurrentBrowserEvidence);
  const offlineFour = (offlineR6.accepted || []).filter(
    (row) => row.pass && (row.filterPass === true || row.evaluation?.wouldApply === true)
  );
  const offlineFourKeys = new Set(offlineFour.map(rowKey));
  const browserFour = offlineFour.map((row) => buildEvidence(row, bestCandidateRows));
  const offlineEvidence = offlineFour.map((row) => buildEvidence(row, offlineCandidates));

  const fieldComparisonMatrix = browserFour.map((browserRow) => {
    const offlineRow = offlineEvidence.find((row) => rowKey(row) === rowKey(browserRow));
    return {
      image: browserRow.image,
      stage: browserRow.stage,
      side: browserRow.side,
      fields: Object.fromEntries(
        fields.map((field) => {
          const support = browserRow.fieldSupports[field];
          const offlineSupport = offlineRow?.fieldSupports[field];
          const category = supportCategory(support, offlineSupport);
          return [
            field,
            {
              category,
              categoryLabel: categoryLabel(category),
              expectedValue: support.value,
              browserSupport: support,
              offlineSupport,
            },
          ];
        })
      ),
    };
  });

  const r6Blockers = browserFour.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    wouldApply: row.evaluation.wouldApply,
    blockReasons: row.evaluation.blockReasons,
    blockerCounts: classifyBlockers(row),
    proposal: row.proposal,
    changedFields: row.changedFields,
  }));
  const blockerFrequency = r6Blockers.reduce((acc, row) => addCounts(acc, row.blockerCounts), {});

  const member1Audit = {
    fourRows: browserFour.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      offlineMember1Value: fieldValue(row.proposal, "member1"),
      browserCandidateSet: row.fieldSupports.member1.values,
      browserRawText: row.fieldSupports.member1.allRawTexts,
      exactCandidatePresent: row.fieldSupports.member1.supportCount > 0,
      confidence: row.fieldSupports.member1.confidence,
      member1AloneBlocksR6:
        Number(row.fieldSupports.member1.supportCount || 0) <= 0 ||
        (row.changedFields.includes("member1") && Number(row.fieldSupports.member1.confidence.max || 0) < 0.9),
    })),
    allSides: {
      exactCandidateCoverage: browserResults
        .flatMap((result) =>
          sides.map((side) => {
            const expectedValue = Number(result.expected?.[side]?.member1 || 0);
            return summarizeSupport(bestCandidateRows, result.image, side, "member1", expectedValue).supportCount > 0;
          })
        )
        .filter(Boolean).length,
      totalSides: browserResults.length * 2,
      offlineExactCoverage: 70,
      browserDeficitVsOffline: browserSummary.fieldDeficits?.browserVsOffline?.member1?.browserDeficit,
    },
  };

  const confidenceAudit = browserFour.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    threshold: 0.9,
    wouldApply: row.evaluation.wouldApply,
    confidenceBlockReasons: row.evaluation.blockReasons.filter((reason) => reason.includes("confidence")),
    exactSupports: Object.fromEntries(
      fields.map((field) => [
        field,
        {
          value: row.fieldSupports[field].value,
          exactPresent: row.fieldSupports[field].supportCount > 0,
          browserConfidence: row.fieldSupports[field].confidence,
          pass: Number(row.fieldSupports[field].confidence.max || 0) >= 0.9,
        },
      ])
    ),
  }));

  const fragmentAudit = browserFour.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    blockReasons: row.evaluation.blockReasons.filter((reason) => reason.includes("too-short") || reason.includes("low-digit")),
    fields: Object.fromEntries(
      fields.map((field) => [
        field,
        {
          expectedValue: row.fieldSupports[field].value,
          fullCandidates: row.fieldSupports[field].values.filter(
            (value) => String(Math.abs(value)).length >= String(Math.abs(row.fieldSupports[field].value)).length
          ),
          fragments: row.fieldSupports[field].fragments,
        },
      ])
    ),
  }));

  const multiplicityAudit = browserFour.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    blockReasons: row.evaluation.blockReasons.filter((reason) => reason.includes("pool-too-wide")),
    fields: Object.fromEntries(
      fields.map((field) => [
        field,
        {
          uniqueCandidates: row.fieldSupports[field].distinctCandidateCount,
          candidateSources: row.fieldSupports[field].sourceCount,
          exactSupportCount: row.fieldSupports[field].supportCount,
          duplicateSupport: Math.max(0, row.fieldSupports[field].supportCount - 1),
        },
      ])
    ),
  }));

  const eligibleVsExact = browserFour.map((row) => {
    const exactFields = fields.filter((field) => row.fieldSupports[field].supportCount > 0);
    const eligibleFields = fields.filter((field) => {
      const support = row.fieldSupports[field];
      if (support.supportCount <= 0) return false;
      if (field === "total" && (Number(support.confidence.max || 0) < 0.9 || Number(support.digitCount || 0) < 5)) {
        return false;
      }
      if (row.changedFields.includes(field) && String(field).startsWith("member")) {
        if (Number(support.confidence.max || 0) < 0.9) return false;
        if (Number(support.digitCount || 0) < 5) return false;
        if (Number(support.distinctCandidateCount || 0) > 8) return false;
      }
      if (row.changedFields.includes(field) && field === "bonus" && support.supportCount <= 0) return false;
      return true;
    });
    return {
      image: row.image,
      stage: row.stage,
      side: row.side,
      exactFields: exactFields.length,
      r6EligibleExactFields: eligibleFields.length,
      exactFieldNames: exactFields,
      r6EligibleFieldNames: eligibleFields,
      blockReasons: row.evaluation.blockReasons,
    };
  });

  const hypotheticals = buildHypotheticals(browserFour);
  const allSidesWinningBlocker = buildAllSidesWinningBlocker(browserResults, browserFour);

  const recommendation = {
    currentState: "E. mixed blockers",
    selectedNextExperiment:
      "offline-vs-browser recognizer confidence/preprocessing parity investigation for the exact same fixed crops and proposal rows",
    reason:
      "Confidence blocks all four offline TP rows. Bonus evidence improved for the non-zero bonus rows, but exact browser evidence is still not R6-usable because confidence and total-anchor guards fail; IMG_0265 enemy also retains a member2 capture gap.",
    doNotDo: [
      "do not weaken frozen R6 confidence or fragment guards",
      "do not add more bonus ROI variants before confidence/provenance parity is understood",
      "do not productionize RapidOCR Stage3",
    ],
  };

  const baseline = {
    production: productionBaselineFromParity(paritySummary),
    offlineFrozenR6: {
      member1Exact: "70 / 106",
      member2Exact: "52 / 106",
      member3Exact: "79 / 106",
      bonusExact: "53 / 106",
      totalExact: "106 / 106",
      tp: 4,
      fp: 0,
    },
    browserBestEvidence: {
      member1Exact: `${browserSummary.fieldDeficits.browserVsOffline.member1.browserExact} / 106`,
      member2Exact: `${browserSummary.fieldDeficits.browserVsOffline.member2.browserExact} / 106`,
      member3Exact: `${browserSummary.fieldDeficits.browserVsOffline.member3.browserExact} / 106`,
      bonusExact: `${browserSummary.fieldDeficits.browserVsOffline.bonus.browserExact} / 106`,
      totalExact: `${browserSummary.fieldDeficits.browserVsOffline.total.browserExact} / 106`,
      frozenR6: "0 TP / 0 FP",
    },
  };

  const bestBrowserEvidence = {
    policyId,
    member1: ["baseline-12pct-padding"],
    member2: ["baseline-12pct-padding", "member2-vertical-expand-8pct"],
    member3: ["baseline-12pct-padding", "member3-left-expand-right-trim-8pct", "member3-vertical-expand-8pct"],
    bonus: ["all non-zero bonus ROI/preprocessing candidates from --nonzero-bonus"],
    total: ["baseline-12pct-padding", "total-horizontal-expand-8pct", "total-vertical-expand-10pct"],
    sourceArtifact: normalizePathForReport(path.join(browserRunDir, "results.json")),
  };

  await writeJson("baseline.json", baseline);
  await writeJson("best-browser-evidence.json", bestBrowserEvidence);
  await writeJson("offline-four.json", offlineFour);
  await writeJson("browser-four.json", browserFour);
  await writeJson("field-comparison-matrix.json", fieldComparisonMatrix);
  await writeJson("r6-blockers.json", r6Blockers);
  await writeJson("blocker-frequency.json", blockerFrequency);
  await writeJson("member1-audit.json", member1Audit);
  await writeJson("confidence-audit.json", confidenceAudit);
  await writeJson("fragment-audit.json", fragmentAudit);
  await writeJson("multiplicity-audit.json", multiplicityAudit);
  await writeJson("eligible-vs-exact.json", eligibleVsExact);
  await writeJson("hypothetical-single-blocker.json", hypotheticals);
  await writeJson("all-sides-winning-blocker.json", allSidesWinningBlocker);
  await writeJson("recommendation.json", recommendation);

  const summary = {
    schema: "ipad-stage3-rapidocr-r6-blocker-isolation-v1",
    generatedAt: new Date().toISOString(),
    outputDir: normalizePathForReport(outputDir),
    baseline,
    bestBrowserEvidence,
    fourOfflineTpRows: offlineFour.map((row) => ({ image: row.image, stage: row.stage, side: row.side })),
    browserWouldApply: browserFour.filter((row) => row.evaluation.wouldApply).length,
    blockerFrequency,
    eligibleVsExact,
    hypotheticals,
    allSidesWinningBlocker: allSidesWinningBlocker.summary,
    recommendation,
  };
  await writeJson("summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
