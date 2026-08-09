import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const expectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const productionArtifactDir = path.join(rootDir, "tmp", "ipad-browser-production-verification");
const browserEvidenceDir = path.join(rootDir, "tmp", "ipad-bonus-t3-boundary-investigation");
const outputDir = path.join(rootDir, "tmp", "ipad-global-leverage-review");

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fieldTypes = ["member1", "member2", "member3", "bonus", "total"];
const memberFields = ["member1", "member2", "member3"];

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
  const memberMatches = expected.members.map((expectedValue, index) => actual.members[index] === expectedValue);
  return {
    pass: memberMatches.every(Boolean) && actual.bonus === expected.bonus && actual.total === expected.total,
    fields: {
      member1: memberMatches[0],
      member2: memberMatches[1],
      member3: memberMatches[2],
      bonus: actual.bonus === expected.bonus,
      total: actual.total === expected.total,
    },
    actual,
    expected,
  };
}

function candidateValues(pool) {
  return (pool?.candidates || []).map((candidate) => toNumber(candidate.value)).filter((value) => Number.isFinite(value));
}

function candidateSummary(pool, expectedValue) {
  const values = candidateValues(pool);
  const exactIndexes = [];
  values.forEach((value, index) => {
    if (value === expectedValue) exactIndexes.push(index);
  });
  const exactCandidate = exactIndexes.length ? pool.candidates[exactIndexes[0]] : null;
  return {
    exactPresent: exactIndexes.length > 0,
    ranking: exactIndexes.length ? exactIndexes[0] + 1 : null,
    candidateCount: values.length,
    values,
    provenance: exactCandidate
      ? {
          profileId: exactCandidate.profileId || "",
          profileIds: exactCandidate.profileIds || [],
          sourceRank: exactCandidate.sourceRank ?? null,
          rawText: exactCandidate.rawText || "",
          normalizedText: exactCandidate.normalizedText || "",
          confidenceSignals: exactCandidate.confidenceSignals || {},
        }
      : null,
    truncated: Boolean(pool?.truncated),
    rawDistinctCandidateCount: Number(pool?.rawDistinctCandidateCount || values.length),
    completeness: pool?.candidateCompleteness || pool?.completeness || null,
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

function strictTotalReason(diagnostics, stage, side) {
  return (
    (diagnostics?.strictTotalProductionRecovery?.rejectedCases || []).find(
      (entry) => Number(entry.stage) === stage && entry.side === side
    )?.reason ||
    stageDataFromDiagnostics(diagnostics, stage, side)?.strictTotalSelection?.rejectionReason ||
    stageDataFromDiagnostics(diagnostics, stage, side)?.strictTotalSelection?.reason ||
    ""
  );
}

function sideKey(image, stage, side) {
  return `${image}|S${stage}|${side}`;
}

function fieldKey(image, stage, side, field) {
  return `${sideKey(image, stage, side)}|${field}`;
}

function clusterForImage(image) {
  const number = Number((image.match(/IMG_(\d+)/) || [])[1] || 0);
  return number >= 317 ? "ipad-02" : "ipad-01";
}

function selectedValue(side, field) {
  if (field.startsWith("member")) return side.members[Number(field.at(-1)) - 1] || 0;
  return side[field] || 0;
}

function withPerfectFields(row, fields) {
  const actual = normalizeSide(row.actual);
  for (const field of fields) {
    if (field.startsWith("member")) actual.members[Number(field.at(-1)) - 1] = row.expected.members[Number(field.at(-1)) - 1];
    else actual[field] = row.expected[field];
  }
  return compareSide(actual, row.expected).pass;
}

function summarizePass(rows) {
  const stageSidePass = rows.filter((row) => row.pass).length;
  const stageKeys = new Set(rows.map((row) => `${row.image}|${row.stage}`));
  const imageKeys = new Set(rows.map((row) => row.image));
  const stagePass = [...stageKeys].filter((key) => rows.filter((row) => `${row.image}|${row.stage}` === key).every((row) => row.pass)).length;
  const imagePass = [...imageKeys].filter((image) => rows.filter((row) => row.image === image).every((row) => row.pass)).length;
  return {
    imagePass,
    imageFail: imageKeys.size - imagePass,
    stagePass,
    stageFail: stageKeys.size - stagePass,
    stageSidePass,
    stageSideFail: rows.length - stageSidePass,
  };
}

function oracleSummary(rows, applyFields) {
  const oracleRows = rows.map((row) => ({
    ...row,
    pass: row.pass || withPerfectFields(row, applyFields(row)),
  }));
  return {
    ...summarizePass(oracleRows),
    additionalStageSidePass: oracleRows.filter((row, index) => row.pass && !rows[index].pass).length,
  };
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

function compactFieldRecord(record) {
  return {
    image: record.image,
    cluster: record.cluster,
    stage: record.stage,
    side: record.side,
    field: record.field,
    expected: record.expected,
    actual: record.actual,
    pass: record.pass,
    category: record.category,
    exactCandidatePresent: record.candidate.exactPresent,
    candidateCount: record.candidate.candidateCount,
    rawDistinctCandidateCount: record.candidate.rawDistinctCandidateCount,
    ranking: record.candidate.ranking,
    truncated: record.candidate.truncated,
    provenance: record.candidate.provenance,
    productionRecoveryTouchedSide: record.productionRecoveryTouchedSide,
  };
}

function classifyWrongField({ field, expected, actual, candidate, priorDiagnostic }) {
  if (candidate.exactPresent) return "A. exact candidate present, selected wrong";
  if (priorDiagnostic?.exactCandidatePresent) return "F. parser-safe evidence exists but is not productionized";
  if (candidate.candidateCount === 0) return "C. pool empty";
  if (candidate.truncated || candidate.rawDistinctCandidateCount > candidate.candidateCount) {
    return "D. pool incomplete/truncated";
  }
  if (actual === 0 && candidate.values.every((value) => value === 0)) return "E. default-zero-only evidence";
  if (field === "bonus" && expected > 0 && candidate.values.every((value) => value === 0)) {
    return "E. default-zero-only evidence";
  }
  return "B. exact candidate absent";
}

function missingEvidenceLabel(fields) {
  const missing = fields.filter((field) => !field.pass && !field.candidate.exactPresent);
  if (!missing.length) return "selection-only";
  const byPriority = ["member1", "member2", "member3", "bonus", "total"];
  return missing.sort((a, b) => byPriority.indexOf(a.field) - byPriority.indexOf(b.field))[0].field;
}

function oneFieldRepair(row) {
  const wrong = row.fields.filter((field) => !field.pass);
  return wrong.length === 1 ? wrong[0].field : null;
}

function twoFieldRepair(row) {
  const wrong = row.fields.filter((field) => !field.pass);
  return wrong.length === 2 ? wrong.map((field) => field.field).join("+") : null;
}

async function loadProductionResults(runIndex) {
  const runDir = path.join(productionArtifactDir, `run-${runIndex}`);
  const results = new Map();
  const entries = await fs.readdir(runDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const resultPath = path.join(runDir, entry.name, "production-result.json");
    try {
      const result = await loadJson(resultPath);
      results.set(result.image, result);
    } catch {
      // Non-image artifact directory.
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
    const resultPath = path.join(runDir, entry.name, "boundary-image.json");
    try {
      const result = await loadJson(resultPath);
      results.set(result.image, result);
    } catch {
      // Non-image artifact directory.
    }
  }
  return results;
}

async function loadFixtures() {
  const manifest = await loadJson(path.join(expectedDir, "manifest.json"));
  const rows = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    rows.push({
      filename: entry.filename,
      cluster: entry.clusterId || clusterForImage(entry.filename),
      expected: await loadJson(path.join(expectedDir, entry.expectedFixture || entry.filename.replace(/\.png$/i, ".json"))),
    });
  }
  if (rows.length !== 18) throw new Error(`Expected 18 iPad fixtures, found ${rows.length}`);
  return rows;
}

function buildRunAnalysis({ runIndex, fixtures, productionResults, browserEvidence, priorDiagnostics }) {
  const fieldMatrix = [];
  const sideRows = [];
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
        const productionSide = (production.perSide || []).find((row) => row.stage === stage && row.side === side);
        const comparison = compareSide(productionSide?.actual || {}, expected);
        const stageData = stageDataFromDiagnostics(diagnostics, stage, side);
        const application = productionApplicationFor(diagnostics, stage, side);
        const fieldRecords = fieldTypes.map((field) => {
          const pool = poolForField(stageData, field);
          const expectedValue = selectedValue(expected, field);
          const actualValue = selectedValue(comparison.actual, field);
          const candidate = candidateSummary(pool, expectedValue);
          const priorDiagnostic = priorDiagnostics.get(fieldKey(fixture.filename, stage, side, field)) || null;
          const pass = actualValue === expectedValue;
          const category = pass
            ? "PASS"
            : classifyWrongField({
                field,
                expected: expectedValue,
                actual: actualValue,
                candidate,
                priorDiagnostic,
              });
          return {
            image: fixture.filename,
            cluster: fixture.cluster,
            stage,
            side,
            field,
            expected: expectedValue,
            actual: actualValue,
            pass,
            category,
            candidate,
            priorDiagnostic,
            productionRecoveryTouchedSide: Boolean(application),
          };
        });
        fieldMatrix.push(...fieldRecords.map(compactFieldRecord));
        const wrongFields = fieldRecords.filter((field) => !field.pass);
        sideRows.push({
          image: fixture.filename,
          cluster: fixture.cluster,
          stage,
          side,
          pass: comparison.pass,
          expected,
          actual: comparison.actual,
          wrongFieldCount: wrongFields.length,
          wrongFields: wrongFields.map((field) => field.field),
          exactCandidatePresence: Object.fromEntries(fieldRecords.map((field) => [field.field, field.candidate.exactPresent])),
          candidateCounts: Object.fromEntries(fieldRecords.map((field) => [field.field, field.candidate.candidateCount])),
          categories: Object.fromEntries(fieldRecords.map((field) => [field.field, field.category])),
          tierCBlockReason: stageData?.blockReason || stageData?.tierC?.blockReason || "",
          strictTotalBlockReason: strictTotalReason(diagnostics, stage, side),
          validArithmeticTupleCount: Number(stageData?.validTupleCount || stageData?.tierC?.validTupleCount || 0),
          completenessTruncation: {
            missingLabels:
              stageData?.candidateCompleteness?.missingLabels ||
              stageData?.tierC?.candidateCompleteness?.missingLabels ||
              [],
            truncatedLabels:
              stageData?.candidateCompleteness?.truncatedLabels ||
              stageData?.tierC?.candidateCompleteness?.truncatedLabels ||
              fieldRecords.filter((field) => field.candidate.truncated).map((field) => field.field),
          },
          earliestMissingEvidence: comparison.pass ? "" : missingEvidenceLabel(fieldRecords),
          oneFieldOnlyRepairWouldPass: Boolean(oneFieldRepair({ fields: fieldRecords })),
          oneFieldRepairField: oneFieldRepair({ fields: fieldRecords }),
          twoFieldRepairRequired: Boolean(twoFieldRepair({ fields: fieldRecords })),
          twoFieldRepairPair: twoFieldRepair({ fields: fieldRecords }),
          threeOrMoreFieldsWrong: wrongFields.length >= 3,
          productionRecovery: application
            ? {
                recoveryId: application.recoveryId,
                changedFields: application.changedFields || [],
                oldValues: application.oldValues,
                newValues: application.newValues,
              }
            : null,
          fields: fieldRecords,
        });
      }
    }
  }

  return { runIndex, fieldMatrix, sideRows, applications };
}

function buildPriorDiagnostics() {
  return new Map();
}

async function buildPriorDiagnosticsFromArtifacts() {
  const map = new Map();
  try {
    const fieldRecords = await loadJson(path.join(browserEvidenceDir, "run-1", "field-records.json"));
    for (const record of fieldRecords) {
      if (record.expectedBonus && record.tiers) {
        const exactTiers = Object.entries(record.tiers)
          .filter(([, tier]) => (tier.values || []).includes(record.expectedBonus))
          .map(([name]) => name);
        if (exactTiers.length) {
          map.set(fieldKey(record.image, record.stage, record.side, "bonus"), {
            exactCandidatePresent: true,
            source: exactTiers.join(","),
            expected: record.expectedBonus,
          });
        }
      }
    }
  } catch {
    return buildPriorDiagnostics();
  }
  return map;
}

function analyze(run) {
  const fieldMatrix = run.fieldMatrix;
  const sideRows = run.sideRows;
  const failingSides = sideRows.filter((row) => !row.pass);
  const wrongFields = fieldMatrix.filter((field) => !field.pass);
  const baseline = summarizePass(sideRows);

  const wrongFieldCategories = {};
  for (const field of wrongFields) increment(wrongFieldCategories, field.category);

  const wrongFieldHistogram = {};
  for (const row of failingSides) increment(wrongFieldHistogram, String(row.wrongFieldCount));

  const oneFieldAway = failingSides.filter((row) => row.wrongFieldCount === 1);
  const twoFieldsAway = failingSides.filter((row) => row.wrongFieldCount === 2);
  const oneFieldAwayByField = {};
  for (const row of oneFieldAway) increment(oneFieldAwayByField, row.wrongFields[0]);
  const twoFieldPairs = {};
  for (const row of twoFieldsAway) increment(twoFieldPairs, row.twoFieldRepairPair);

  const selectionVsRecognition = {};
  for (const family of fieldTypes) {
    const wrongByFamily = wrongFields.filter((field) => field.field === family);
    const selection = wrongByFamily.filter((field) => field.exactCandidatePresent).length;
    selectionVsRecognition[family] = {
      wrong: wrongByFamily.length,
      selectionHeadroom: selection,
      recognitionHeadroom: wrongByFamily.length - selection,
    };
  }

  const singleFamilyOracles = {};
  for (const field of fieldTypes) {
    singleFamilyOracles[field] = oracleSummary(sideRows, () => [field]);
  }
  singleFamilyOracles.allMembers = oracleSummary(sideRows, () => memberFields);
  singleFamilyOracles.allMembersExceptStage3Member2 = oracleSummary(sideRows, (row) =>
    row.stage === 3 ? ["member1", "member3"] : memberFields
  );
  singleFamilyOracles.stage3Member2Only = oracleSummary(sideRows, (row) => (row.stage === 3 ? ["member2"] : []));

  const twoFamilyOracles = {
    "member1+member2": oracleSummary(sideRows, () => ["member1", "member2"]),
    "member2+member3": oracleSummary(sideRows, () => ["member2", "member3"]),
    "allMembers+bonus": oracleSummary(sideRows, () => [...memberFields, "bonus"]),
    "allMembers+total": oracleSummary(sideRows, () => [...memberFields, "total"]),
    "bonus+total": oracleSummary(sideRows, () => ["bonus", "total"]),
    "stage3Member2+bonus": oracleSummary(sideRows, (row) => (row.stage === 3 ? ["member2", "bonus"] : ["bonus"])),
    "stage3Member2+total": oracleSummary(sideRows, (row) => (row.stage === 3 ? ["member2", "total"] : ["total"])),
  };

  const byStage = {};
  for (const stage of stages) {
    const rows = sideRows.filter((row) => row.stage === stage);
    const fields = fieldMatrix.filter((field) => field.stage === stage && !field.pass);
    byStage[`stage${stage}`] = {
      pass: rows.filter((row) => row.pass).length,
      fail: rows.filter((row) => !row.pass).length,
      wrongFields: Object.fromEntries(fieldTypes.map((field) => [field, fields.filter((entry) => entry.field === field).length])),
      oneFieldAway: rows.filter((row) => !row.pass && row.wrongFieldCount === 1).length,
      twoFieldsAway: rows.filter((row) => !row.pass && row.wrongFieldCount === 2).length,
      dominantRecognitionFailures: Object.fromEntries(
        fieldTypes.map((field) => [
          field,
          fields.filter((entry) => entry.field === field && !entry.exactCandidatePresent).length,
        ])
      ),
      dominantSelectionFailures: Object.fromEntries(
        fieldTypes.map((field) => [
          field,
          fields.filter((entry) => entry.field === field && entry.exactCandidatePresent).length,
        ])
      ),
    };
  }

  const bySide = {};
  for (const side of sides) {
    const rows = sideRows.filter((row) => row.side === side);
    const fields = fieldMatrix.filter((field) => field.side === side && !field.pass);
    bySide[side] = {
      pass: rows.filter((row) => row.pass).length,
      fail: rows.filter((row) => !row.pass).length,
      wrongFields: Object.fromEntries(fieldTypes.map((field) => [field, fields.filter((entry) => entry.field === field).length])),
      oneFieldAway: rows.filter((row) => !row.pass && row.wrongFieldCount === 1).length,
      twoFieldsAway: rows.filter((row) => !row.pass && row.wrongFieldCount === 2).length,
    };
  }

  const byCluster = {};
  for (const cluster of [...new Set(sideRows.map((row) => row.cluster))].sort()) {
    const rows = sideRows.filter((row) => row.cluster === cluster);
    const fields = fieldMatrix.filter((field) => field.cluster === cluster && !field.pass);
    byCluster[cluster] = {
      pass: rows.filter((row) => row.pass).length,
      fail: rows.filter((row) => !row.pass).length,
      wrongFields: Object.fromEntries(fieldTypes.map((field) => [field, fields.filter((entry) => entry.field === field).length])),
    };
  }

  const truncationAudit = {
    failingSidesWithTruncatedPools: failingSides.filter((row) => row.completenessTruncation.truncatedLabels.length).length,
    wrongFieldsTruncated: wrongFields.filter((field) => field.truncated).length,
    candidateCapLossLikely: wrongFields.filter((field) => field.rawDistinctCandidateCount > field.candidateCount).length,
    byField: Object.fromEntries(
      fieldTypes.map((field) => [
        field,
        wrongFields.filter(
          (entry) =>
            entry.field === field &&
            (entry.truncated || entry.rawDistinctCandidateCount > entry.candidateCount)
        ).length,
      ])
    ),
  };

  const priorDiagnosticEvidence = {
    bonusT3: {
      exactCandidateGain: wrongFields.filter(
        (field) => field.field === "bonus" && field.category === "F. parser-safe evidence exists but is not productionized"
      ).length,
      reasonNotProductionized: "T3-B/T3-C exposed too much noisy token-looking evidence for too little stage/side gain.",
    },
    strictTotal: {
      status: "productionized",
      applications: run.applications.filter((entry) => entry.recoveryId === "ipad-strict-total-selection").length,
    },
  };

  const upperBounds = {
    currentProduction: baseline,
    perfectSelectionFromExistingProductionCandidates: oracleSummary(sideRows, (row) =>
      row.fields.filter((field) => !field.pass && field.candidate.exactPresent).map((field) => field.field)
    ),
    perfectRecognitionMember1Only: singleFamilyOracles.member1,
    perfectRecognitionMember2Only: singleFamilyOracles.member2,
    perfectRecognitionMember3Only: singleFamilyOracles.member3,
    perfectRecognitionBonusOnly: singleFamilyOracles.bonus,
    perfectRecognitionTotalOnly: singleFamilyOracles.total,
    perfectAllMembers: singleFamilyOracles.allMembers,
    perfectBonusAndTotal: twoFamilyOracles["bonus+total"],
    perfectAllFiveFields: oracleSummary(sideRows, () => fieldTypes),
  };

  const targets = [
    ["member1 selection", "member1", "selection"],
    ["member1 recognition", "member1", "recognition"],
    ["member2 selection", "member2", "selection"],
    ["member2 recognition", "member2", "recognition"],
    ["member3 selection", "member3", "selection"],
    ["member3 recognition", "member3", "recognition"],
    ["bonus selection", "bonus", "selection"],
    ["bonus recognition", "bonus", "recognition"],
    ["total selection", "total", "selection"],
    ["total recognition", "total", "recognition"],
  ].map(([target, field, type]) => {
    const wrong = wrongFields.filter((entry) => entry.field === field);
    const addressable = wrong.filter((entry) => (type === "selection" ? entry.exactCandidatePresent : !entry.exactCandidatePresent));
    const oneFieldAddressable = oneFieldAway.filter((row) =>
      row.wrongFields[0] === field &&
      row.fields.find((entry) => entry.field === field)?.candidate.exactPresent === (type === "selection")
    ).length;
    const oracle = oracleSummary(sideRows, () => [field]);
    const priorRisk =
      field === "bonus" && type === "recognition"
        ? "high noise in T3-B/T3-C"
        : field === "member2" && type === "recognition"
          ? "prior Stage3 member2 OCR/crop/config experiments produced low safe gain"
          : "unknown/needs bounded diagnostic";
    const score = oneFieldAddressable * 3 + oracle.additionalStageSidePass - (priorRisk.startsWith("high") ? 3 : 0);
    return {
      target,
      oneFieldAwayStageSidesAddressable: oneFieldAddressable,
      totalWrongFieldsAddressable: addressable.length,
      singleFamilyOracleAdditionalStageSidePass: oracle.additionalStageSidePass,
      recognitionVsSelection: type,
      priorExperiments: priorRisk,
      knownFpNoiseRisk: priorRisk,
      estimatedImplementationComplexity:
        type === "selection" ? "low-to-medium if provenance is stable" : "medium-to-high browser OCR/capture work",
      browserNativeStability: "uses current browser-native candidate matrix",
      likelyProductionPath: type === "selection" ? "shared selector parity first" : "diagnostic capture evidence before parity",
      recommendationScore: score,
    };
  });

  targets.push(
    {
      target: "candidate completeness/truncation plumbing",
      oneFieldAwayStageSidesAddressable: failingSides.filter((row) =>
        row.fields.some((field) => !field.pass && (field.candidate.truncated || field.candidate.rawDistinctCandidateCount > field.candidate.candidateCount))
      ).length,
      totalWrongFieldsAddressable: truncationAudit.candidateCapLossLikely,
      singleFamilyOracleAdditionalStageSidePass: 0,
      recognitionVsSelection: "plumbing",
      priorExperiments: "not directly tested; current metadata shows limited cap loss",
      knownFpNoiseRisk: "unknown",
      estimatedImplementationComplexity: "medium",
      browserNativeStability: "requires exact parity and cap-loss proof",
      likelyProductionPath: "diagnostic-only cap audit before any change",
      recommendationScore: truncationAudit.candidateCapLossLikely,
    },
    {
      target: "Stage3-specific architecture change",
      oneFieldAwayStageSidesAddressable: oneFieldAway.filter((row) => row.stage === 3).length,
      totalWrongFieldsAddressable: wrongFields.filter((field) => field.stage === 3).length,
      singleFamilyOracleAdditionalStageSidePass: 0,
      recognitionVsSelection: "architecture",
      priorExperiments: "member2/preprocessing/config/segmentation dead-ends indicate field-level tuning is weak",
      knownFpNoiseRisk: "lower if isolated, but implementation surface is large",
      estimatedImplementationComplexity: "high",
      browserNativeStability: "needs new fixture-backed design",
      likelyProductionPath: "separate Stage3 architecture investigation",
      recommendationScore: oneFieldAway.filter((row) => row.stage === 3).length + 2,
    }
  );
  targets.sort((a, b) => b.recommendationScore - a.recommendationScore);

  const stoppingRuleAnalysis = {
    easiestRemainingSingleFieldAwayTpCount: oneFieldAway.length,
    sidesRequiringTwoOrMoreIndependentFixes: failingSides.filter((row) => row.wrongFieldCount >= 2).length,
    sidesRequiringThreeOrMoreIndependentFixes: failingSides.filter((row) => row.wrongFieldCount >= 3).length,
    pass60Realism:
      baseline.stageSidePass + oneFieldAway.length >= 60
        ? "theoretical but requires nearly every one-field case"
        : "unlikely with single-field work alone",
    pass70Realism:
      upperBounds.perfectAllFiveFields.stageSidePass >= 70
        ? "requires broad recognition/selection improvements"
        : "not supported by current outputs",
    recommendation:
      oneFieldAway.length >= 2
        ? "One more narrow selection/plumbing experiment can be justified only if it targets one-field-away rows."
        : "Stop incremental tuning and gather more samples or redesign Stage3.",
  };

  const recommendation =
    targets[0].oneFieldAwayStageSidesAddressable >= 2
      ? {
          selectedNextExperiment: targets[0].target,
          rationale: "Highest score after weighting one-field-away stage/side gain above raw field error volume.",
          moreSamplesPreferredNow: false,
        }
      : {
          selectedNextExperiment: "stop incremental OCR recovery and gather more iPad samples",
          rationale: "No remaining low-risk single experiment clears a realistic +2 stage/side threshold.",
          moreSamplesPreferredNow: true,
        };

  return {
    productionBaseline: baseline,
    fieldMatrix,
    remainingSides: failingSides,
    wrongFieldCategories,
    wrongFieldHistogram,
    oneFieldAway,
    oneFieldAwayByField,
    twoFieldsAway,
    twoFieldPairs,
    singleFamilyOracles,
    twoFamilyOracles,
    stageBreakdown: byStage,
    sideBreakdown: bySide,
    clusterBreakdown: byCluster,
    selectionVsRecognition,
    truncationAudit,
    priorDiagnosticEvidence,
    upperBounds,
    rankedTargets: targets,
    stoppingRuleAnalysis,
    recommendation,
  };
}

function stabilitySummary(analyses) {
  const [first, second] = analyses;
  if (!first || !second) return { comparedRuns: analyses.length, stable: false, reason: "missing-run" };
  const firstApps = first.remainingSides
    ? null
    : null;
  const stable =
    JSON.stringify(first.productionBaseline) === JSON.stringify(second.productionBaseline) &&
    JSON.stringify(first.wrongFieldHistogram) === JSON.stringify(second.wrongFieldHistogram) &&
    JSON.stringify(first.oneFieldAwayByField) === JSON.stringify(second.oneFieldAwayByField) &&
    JSON.stringify(first.twoFieldPairs) === JSON.stringify(second.twoFieldPairs);
  return {
    comparedRuns: 2,
    stable,
    productionBaselineRun1: first.productionBaseline,
    productionBaselineRun2: second.productionBaseline,
    wrongFieldHistogramRun1: first.wrongFieldHistogram,
    wrongFieldHistogramRun2: second.wrongFieldHistogram,
  };
}

async function main() {
  const fixtures = await loadFixtures();
  const priorDiagnostics = await buildPriorDiagnosticsFromArtifacts();
  const runAnalyses = [];
  for (const runIndex of [1, 2]) {
    const productionResults = await loadProductionResults(runIndex);
    const browserEvidence = await loadBrowserEvidence(runIndex);
    const run = buildRunAnalysis({ runIndex, fixtures, productionResults, browserEvidence, priorDiagnostics });
    const analysis = analyze(run);
    runAnalyses.push(analysis);
    const runDir = path.join(outputDir, `run-${runIndex}`);
    await writeJson(path.join(runDir, "field-matrix.json"), analysis.fieldMatrix);
    await writeJson(path.join(runDir, "remaining-64.json"), analysis.remainingSides);
  }

  const analysis = runAnalyses[0];
  const outputs = {
    "production-baseline.json": analysis.productionBaseline,
    "field-matrix.json": analysis.fieldMatrix,
    "remaining-64.json": analysis.remainingSides,
    "wrong-field-histogram.json": analysis.wrongFieldHistogram,
    "one-field-away.json": {
      countsByField: analysis.oneFieldAwayByField,
      rows: analysis.oneFieldAway,
    },
    "two-fields-away.json": {
      countsByPair: analysis.twoFieldPairs,
      rows: analysis.twoFieldsAway,
    },
    "single-family-oracles.json": analysis.singleFamilyOracles,
    "two-family-oracles.json": analysis.twoFamilyOracles,
    "stage-breakdown.json": analysis.stageBreakdown,
    "side-breakdown.json": analysis.sideBreakdown,
    "cluster-breakdown.json": analysis.clusterBreakdown,
    "selection-vs-recognition.json": analysis.selectionVsRecognition,
    "truncation-audit.json": analysis.truncationAudit,
    "prior-diagnostic-evidence.json": analysis.priorDiagnosticEvidence,
    "upper-bounds.json": analysis.upperBounds,
    "ranked-targets.json": analysis.rankedTargets,
    "stopping-rule-analysis.json": analysis.stoppingRuleAnalysis,
    "recommendation.json": analysis.recommendation,
    "run-stability.json": stabilitySummary(runAnalyses),
    "summary.json": {
      artifactDir: rel(outputDir),
      sourceProductionArtifacts: rel(productionArtifactDir),
      sourceBrowserEvidenceArtifacts: rel(browserEvidenceDir),
      productionBaseline: analysis.productionBaseline,
      remainingFailingSides: analysis.remainingSides.length,
      wrongFieldCategories: analysis.wrongFieldCategories,
      wrongFieldHistogram: analysis.wrongFieldHistogram,
      oneFieldAwayByField: analysis.oneFieldAwayByField,
      twoFieldPairs: analysis.twoFieldPairs,
      selectionVsRecognition: analysis.selectionVsRecognition,
      recommendation: analysis.recommendation,
      runStability: stabilitySummary(runAnalyses),
    },
  };

  for (const [filename, value] of Object.entries(outputs)) {
    await writeJson(path.join(outputDir, filename), value);
  }

  console.log(JSON.stringify(outputs["summary.json"], null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
