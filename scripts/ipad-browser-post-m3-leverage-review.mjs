import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const productionVerificationDir = path.join(rootDir, "tmp", "ipad-browser-production-verification");
const outputDir = path.join(rootDir, "tmp", "ipad-post-m3-leverage-review");
const reportPath = path.join(rootDir, "docs", "ipad-browser-post-m3-leverage-review.md");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fieldFamilies = ["member1", "member2", "member3", "bonus", "total"];
const recoveryOrder = [
  ["ipad-tier-c-exactly-one-arithmetic", "B. Recovered by Tier C"],
  ["ipad-strict-total-selection", "C. Recovered by strict-total"],
  ["ipad-strict-member2-selection", "D. Recovered by strict-member2"],
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function keyFor(image, stage, side) {
  return `${image}|${stage}|${side}`;
}

function fieldKeyFor(image, stage, side, field) {
  return `${image}|${stage}|${side}|${field}`;
}

function pct(num, den) {
  return den ? Number(((num / den) * 100).toFixed(1)) : 0;
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, name), JSON.stringify(value, null, 2));
}

function extractBalancedJson(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return "";
}

function extractDiagnosticsFromOcrText(text) {
  const marker = '{"schema":"ipad-arithmetic-browser-diagnostics-v1"';
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const jsonText = extractBalancedJson(text, start);
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function expectedSide(expectedStage, side) {
  return {
    members: side === "self" ? expectedStage.selfMembers.map(Number) : expectedStage.enemyMembers.map(Number),
    bonus: Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0),
    total: Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0),
  };
}

function expectedFieldValue(sideExpected, field) {
  if (field.startsWith("member")) return sideExpected.members[Number(field.replace("member", "")) - 1] || 0;
  return Number(sideExpected[field] || 0);
}

function actualFieldValue(sideActual, field) {
  if (field.startsWith("member")) return sideActual.members[Number(field.replace("member", "")) - 1] || 0;
  return Number(sideActual[field] || 0);
}

function fieldPoolKey(stage, side, field) {
  if (field.startsWith("member")) return { fieldType: "member", slot: Number(field.replace("member", "")) };
  return { fieldType: field, slot: 0 };
}

function buildFieldPools(diagnostics) {
  const map = new Map();
  for (const pool of diagnostics?.fieldPools || []) {
    map.set(`${pool.stage}|${pool.side}|${pool.fieldType}|${pool.slot}`, pool);
  }
  return map;
}

function candidatesForPool(pool) {
  return (pool?.candidates || []).map((candidate) => ({
    value: toNumber(candidate.value),
    profileIds: candidate.profileIds || (candidate.profileId ? [candidate.profileId] : []),
    profileId: candidate.profileId || "",
    sourceRank: Number(candidate.sourceRank || 0),
    rawText: candidate.rawText || "",
    normalizedText: candidate.normalizedText || "",
    confidenceSignals: candidate.confidenceSignals || {},
  }));
}

function candidateInfo(fieldPools, stage, side, field, expectedValue) {
  const { fieldType, slot } = fieldPoolKey(stage, side, field);
  const pool = fieldPools.get(`${stage}|${side}|${fieldType}|${slot}`);
  const candidates = candidatesForPool(pool);
  const matches = candidates.filter((candidate) => candidate.value === expectedValue);
  return {
    present: matches.length > 0,
    count: candidates.length,
    candidateValues: candidates.map((candidate) => candidate.value),
    truncated: Boolean(pool?.truncated),
    rawDistinctCandidateCount: Number(pool?.rawDistinctCandidateCount || candidates.length),
    candidateCap: Number(pool?.candidateCap || 0),
    completeness: pool
      ? {
          truncated: Boolean(pool.truncated),
          rawDistinctCandidateCount: Number(pool.rawDistinctCandidateCount || candidates.length),
          candidateCap: Number(pool.candidateCap || 0),
        }
      : { missingPool: true },
    provenance: matches[0]?.profileIds || [],
    firstMatch: matches[0] || null,
  };
}

function rowWrongFields(row) {
  return fieldFamilies.filter((field) => actualFieldValue(row.actual, field) !== expectedFieldValue(row.expected, field));
}

function applicationFor(applicationsByRow, image, stage, side) {
  return applicationsByRow.get(keyFor(image, stage, side)) || null;
}

function classifyRow({ row, image, app, fieldMatrixByKey, diagnosticsPresent }) {
  if (!diagnosticsPresent) return "I. Infrastructure/export issue";
  if (row.pass) {
    if (!app) return "A. Primary PASS";
    const found = recoveryOrder.find(([id]) => app.recoveryId === id);
    return found?.[1] || "A. Primary PASS";
  }
  const wrong = rowWrongFields(row);
  const fieldRows = wrong.map((field) => fieldMatrixByKey.get(fieldKeyFor(image, row.stage, row.side, field)));
  if (fieldRows.some((fieldRow) => fieldRow?.candidate?.truncated || fieldRow?.candidate?.completeness?.missingPool)) {
    return "H. Candidate pool incomplete/truncated";
  }
  const present = fieldRows.filter((fieldRow) => fieldRow?.candidate?.present).length;
  if (wrong.length > 0 && present === wrong.length) return "E. Full expected tuple already present but safely blocked";
  if (present > 0) return "F. Partial expected evidence only";
  return "G. No useful expected evidence";
}

function applyOracle(rows, predicate) {
  const byImageStage = new Map();
  const byImage = new Map();
  let stageSidePass = 0;
  for (const row of rows) {
    const fixed = { ...row.actual, members: [...row.actual.members] };
    for (const field of fieldFamilies) {
      if (!predicate(row, field)) continue;
      if (field.startsWith("member")) fixed.members[Number(field.replace("member", "")) - 1] = expectedFieldValue(row.expected, field);
      else fixed[field] = expectedFieldValue(row.expected, field);
    }
    const pass = fieldFamilies.every((field) => actualFieldValue(fixed, field) === expectedFieldValue(row.expected, field));
    if (pass) stageSidePass += 1;
    const stageKey = `${row.image}|${row.stage}`;
    const imageRows = byImageStage.get(stageKey) || [];
    imageRows.push(pass);
    byImageStage.set(stageKey, imageRows);
  }
  let stagePass = 0;
  for (const [stageKey, passes] of byImageStage) {
    if (passes.length === 2 && passes.every(Boolean)) stagePass += 1;
    const image = stageKey.split("|")[0];
    const imageStages = byImage.get(image) || [];
    imageStages.push(passes.length === 2 && passes.every(Boolean));
    byImage.set(image, imageStages);
  }
  let imagePass = 0;
  for (const stagesForImage of byImage.values()) {
    if (stagesForImage.length === 3 && stagesForImage.every(Boolean)) imagePass += 1;
  }
  return { stageSidePass, addedStageSidePass: stageSidePass - 52, stagePass, addedStagePass: stagePass - 17, imagePass };
}

function analyzeRun(runName, imageResults, fixtureMeta) {
  const applications = [];
  const applicationsByRow = new Map();
  const fieldMatrix = [];
  const stageSideRows = [];
  const diagnosticIssues = [];

  for (const result of imageResults) {
    const diagnostics = extractDiagnosticsFromOcrText(result.ocrText || "");
    const fieldPools = buildFieldPools(diagnostics);
    const imageApps = (result.applications || []).map((app) => ({ image: result.image, ...app }));
    for (const app of imageApps) {
      applications.push(app);
      applicationsByRow.set(keyFor(result.image, app.stage, app.side), app);
    }
    if (!diagnostics) diagnosticIssues.push(result.image);
    for (const row of result.perSide || []) {
      const clusterId = fixtureMeta.get(result.image)?.clusterId || "unknown";
      const app = applicationFor(applicationsByRow, result.image, row.stage, row.side);
      stageSideRows.push({ image: result.image, clusterId, ...row, application: app || null, diagnosticsPresent: Boolean(diagnostics) });
      for (const field of fieldFamilies) {
        const expectedValue = expectedFieldValue(row.expected, field);
        const actualValue = actualFieldValue(row.actual, field);
        const candidate = candidateInfo(fieldPools, row.stage, row.side, field, expectedValue);
        fieldMatrix.push({
          image: result.image,
          clusterId,
          stage: row.stage,
          side: row.side,
          field,
          selected: actualValue,
          expected: expectedValue,
          selectedExact: actualValue === expectedValue,
          expectedCandidatePresent: candidate.present,
          provenance: candidate.provenance,
          candidateCount: candidate.count,
          candidateValues: candidate.candidateValues,
          completeness: candidate.completeness,
          truncated: candidate.truncated,
          recoveryId: app?.recoveryId || "",
          rowPass: Boolean(row.pass),
          rowKey: keyFor(result.image, row.stage, row.side),
        });
      }
    }
  }
  const fieldMatrixByKey = new Map(
    fieldMatrix.map((fieldRow) => [fieldKeyFor(fieldRow.image, fieldRow.stage, fieldRow.side, fieldRow.field), fieldRow])
  );
  const taxonomy = stageSideRows.map((row) => ({
    image: row.image,
    clusterId: row.clusterId,
    stage: row.stage,
    side: row.side,
    pass: row.pass,
    wrongFields: rowWrongFields(row),
    applicationRecoveryId: row.application?.recoveryId || "",
    category: classifyRow({ row, image: row.image, app: row.application, fieldMatrixByKey, diagnosticsPresent: row.diagnosticsPresent }),
  }));

  const taxonomyCounts = {};
  const remainingTaxonomyCounts = {};
  for (const row of taxonomy) {
    increment(taxonomyCounts, row.category);
    if (!row.pass) increment(remainingTaxonomyCounts, row.category);
  }

  const selectedCandidateCoverage = {};
  for (const field of fieldFamilies) {
    const rows = fieldMatrix.filter((entry) => entry.field === field);
    const selectedExact = rows.filter((entry) => entry.selectedExact).length;
    const candidatePresent = rows.filter((entry) => entry.expectedCandidatePresent).length;
    selectedCandidateCoverage[field] = {
      selectedExact,
      selectedTotal: rows.length,
      selectedPct: pct(selectedExact, rows.length),
      expectedCandidatePresent: candidatePresent,
      expectedCandidateAbsent: rows.length - candidatePresent,
      exactPresentButNotSelected: rows.filter((entry) => !entry.selectedExact && entry.expectedCandidatePresent).length,
    };
  }

  const breakdown = {};
  for (const field of fieldFamilies) {
    for (const entry of fieldMatrix.filter((row) => row.field === field)) {
      for (const dimension of [
        `stage${entry.stage}`,
        entry.side,
        `${entry.clusterId}`,
        `stage${entry.stage}-${entry.side}`,
      ]) {
        const key = `${field}|${dimension}`;
        if (!breakdown[key]) breakdown[key] = { selectedExact: 0, candidatePresent: 0, total: 0 };
        breakdown[key].total += 1;
        if (entry.selectedExact) breakdown[key].selectedExact += 1;
        if (entry.expectedCandidatePresent) breakdown[key].candidatePresent += 1;
      }
    }
  }

  const wrongFields = fieldMatrix.filter((entry) => !entry.selectedExact);
  const recognitionSelection = {};
  const recognitionSelectionByStage = {};
  for (const entry of wrongFields) {
    const type = entry.expectedCandidatePresent ? "selection" : "recognition";
    increment(recognitionSelection, `${entry.field}.${type}`);
    increment(recognitionSelectionByStage, `stage${entry.stage}.${entry.field}.${type}`);
    if (entry.candidateCount === 0) increment(recognitionSelection, `${entry.field}.emptyPool`);
    if (entry.truncated) increment(recognitionSelection, `${entry.field}.truncated`);
    if (entry.candidateValues.length === 1 && entry.candidateValues[0] === 0) increment(recognitionSelection, `${entry.field}.defaultZeroOnly`);
  }

  const wrongFieldHistogram = {};
  for (const row of taxonomy.filter((entry) => !entry.pass)) increment(wrongFieldHistogram, String(row.wrongFields.length));

  const oneFieldAway = taxonomy
    .filter((entry) => !entry.pass && entry.wrongFields.length === 1)
    .map((entry) => {
      const field = entry.wrongFields[0];
      const fieldRow = fieldMatrixByKey.get(fieldKeyFor(entry.image, entry.stage, entry.side, field));
      return {
        ...entry,
        onlyWrongField: field,
        current: fieldRow?.selected,
        expected: fieldRow?.expected,
        exactCandidatePresent: Boolean(fieldRow?.expectedCandidatePresent),
        selectionOrRecognition: fieldRow?.expectedCandidatePresent ? "selection" : "recognition",
        provenance: fieldRow?.provenance || [],
        blockReason: entry.category,
      };
    });
  const oneFieldAwayCounts = {};
  for (const row of oneFieldAway) increment(oneFieldAwayCounts, row.onlyWrongField);

  const twoFieldAway = taxonomy.filter((entry) => !entry.pass && entry.wrongFields.length === 2);
  const twoFieldPairs = {};
  for (const row of twoFieldAway) increment(twoFieldPairs, row.wrongFields.join(" + "));

  const currentPassRows = stageSideRows.filter((row) => row.pass).length;
  const singleFieldOracles = {};
  for (const field of fieldFamilies) {
    singleFieldOracles[field] = applyOracle(stageSideRows, (row, candidateField) => candidateField === field);
  }
  singleFieldOracles.allMembers = applyOracle(stageSideRows, (row, field) => field.startsWith("member"));
  for (const stage of stages) {
    singleFieldOracles[`stage${stage}MembersOnly`] = applyOracle(
      stageSideRows,
      (row, field) => row.stage === stage && field.startsWith("member")
    );
  }

  const selectionOnlyLeverage = {};
  const recognitionOnlyLeverage = {};
  for (const field of fieldFamilies) {
    selectionOnlyLeverage[field] = applyOracle(stageSideRows, (row, candidateField) => {
      if (candidateField !== field) return false;
      const fieldRow = fieldMatrixByKey.get(fieldKeyFor(row.image, row.stage, row.side, field));
      return Boolean(fieldRow && !fieldRow.selectedExact && fieldRow.expectedCandidatePresent);
    });
    recognitionOnlyLeverage[field] = applyOracle(stageSideRows, (row, candidateField) => {
      if (candidateField !== field) return false;
      const fieldRow = fieldMatrixByKey.get(fieldKeyFor(row.image, row.stage, row.side, field));
      return Boolean(fieldRow && !fieldRow.selectedExact && !fieldRow.expectedCandidatePresent);
    });
  }

  const member13Audit = {};
  for (const field of ["member1", "member3"]) {
    const fieldRows = fieldMatrix.filter((entry) => entry.field === field && !entry.selectedExact);
    member13Audit[field] = {
      wrong: fieldRows.length,
      exactPresentButUnselected: fieldRows.filter((entry) => entry.expectedCandidatePresent).length,
      oneFieldAway: oneFieldAway.filter((entry) => entry.onlyWrongField === field).length,
      candidateComplete: fieldRows.filter((entry) => entry.expectedCandidatePresent && !entry.truncated).length,
      provenanceCounts: countProfileIds(fieldRows.filter((entry) => entry.expectedCandidatePresent)),
    };
  }

  const bonusLeverage = {
    oneFieldAway: oneFieldAway.filter((entry) => entry.onlyWrongField === "bonus"),
    exactCandidatePresent: oneFieldAway.filter((entry) => entry.onlyWrongField === "bonus" && entry.exactCandidatePresent).length,
    exactCandidateAbsent: oneFieldAway.filter((entry) => entry.onlyWrongField === "bonus" && !entry.exactCandidatePresent).length,
  };
  const totalLeverage = {
    oneFieldAway: oneFieldAway.filter((entry) => entry.onlyWrongField === "total"),
    exactCandidatePresent: oneFieldAway.filter((entry) => entry.onlyWrongField === "total" && entry.exactCandidatePresent).length,
    exactCandidateAbsent: oneFieldAway.filter((entry) => entry.onlyWrongField === "total" && !entry.exactCandidatePresent).length,
  };

  const stage3Rows = stageSideRows.filter((row) => row.stage === 3);
  const stage3Audit = {
    selfPass: stage3Rows.filter((row) => row.side === "self" && row.pass).length,
    enemyPass: stage3Rows.filter((row) => row.side === "enemy" && row.pass).length,
    stageSidePass: stage3Rows.filter((row) => row.pass).length,
    stageSideTotal: stage3Rows.length,
    oneFieldAway: taxonomy.filter((entry) => entry.stage === 3 && !entry.pass && entry.wrongFields.length === 1).length,
    twoFieldAway: taxonomy.filter((entry) => entry.stage === 3 && !entry.pass && entry.wrongFields.length === 2).length,
    threePlusWrong: taxonomy.filter((entry) => entry.stage === 3 && !entry.pass && entry.wrongFields.length >= 3).length,
    failureRates: {},
    recognitionSelection: {},
  };
  for (const field of fieldFamilies) {
    const fieldRows = fieldMatrix.filter((entry) => entry.stage === 3 && entry.field === field);
    stage3Audit.failureRates[field] = {
      wrong: fieldRows.filter((entry) => !entry.selectedExact).length,
      total: fieldRows.length,
      exactCandidatePresentWhenWrong: fieldRows.filter((entry) => !entry.selectedExact && entry.expectedCandidatePresent).length,
    };
  }

  const stageCompletionLeverage = [];
  const rowsByStage = new Map();
  for (const row of taxonomy) {
    const k = `${row.image}|${row.stage}`;
    const arr = rowsByStage.get(k) || [];
    arr.push(row);
    rowsByStage.set(k, arr);
  }
  for (const [stageKey, rows] of rowsByStage) {
    const passRows = rows.filter((row) => row.pass);
    const failRows = rows.filter((row) => !row.pass);
    if (passRows.length === 1 && failRows.length === 1 && failRows[0].wrongFields.length === 1) {
      stageCompletionLeverage.push({
        image: failRows[0].image,
        stage: failRows[0].stage,
        targetSide: failRows[0].side,
        targetField: failRows[0].wrongFields[0],
        exactCandidatePresent: Boolean(
          fieldMatrixByKey.get(
            fieldKeyFor(failRows[0].image, failRows[0].stage, failRows[0].side, failRows[0].wrongFields[0])
          )?.expectedCandidatePresent
        ),
      });
    }
  }
  const stageCompletionByField = {};
  for (const row of stageCompletionLeverage) increment(stageCompletionByField, row.targetField);

  const imageCompletionLeverage = [];
  const rowsByImage = new Map();
  for (const row of taxonomy) {
    const arr = rowsByImage.get(row.image) || [];
    arr.push(row);
    rowsByImage.set(row.image, arr);
  }
  for (const [image, rows] of rowsByImage) {
    const passingStages = stages.filter((stage) =>
      rows.filter((row) => row.stage === stage).every((row) => row.pass)
    ).length;
    imageCompletionLeverage.push({
      image,
      passingStages,
      failingStageSides: rows.filter((row) => !row.pass).length,
      oneFieldAwayFailingSides: rows.filter((row) => !row.pass && row.wrongFields.length === 1).length,
      twoFieldAwayFailingSides: rows.filter((row) => !row.pass && row.wrongFields.length === 2).length,
    });
  }
  imageCompletionLeverage.sort(
    (a, b) =>
      b.passingStages - a.passingStages ||
      a.failingStageSides - b.failingStageSides ||
      b.oneFieldAwayFailingSides - a.oneFieldAwayFailingSides
  );

  const truncationAudit = {
    expectedPresentButTruncated: fieldMatrix.filter(
      (entry) => !entry.selectedExact && entry.expectedCandidatePresent && entry.truncated
    ).length,
    wrongWithTruncatedPool: fieldMatrix.filter((entry) => !entry.selectedExact && entry.truncated).length,
    wrongWithMissingPool: fieldMatrix.filter(
      (entry) => !entry.selectedExact && entry.completeness?.missingPool
    ).length,
  };

  const rankedTargets = buildRankedTargets({
    oneFieldAwayCounts,
    selectionOnlyLeverage,
    recognitionOnlyLeverage,
    stageCompletionByField,
    member13Audit,
    bonusLeverage,
    totalLeverage,
    stage3Audit,
    truncationAudit,
  });
  const recommendation = chooseRecommendation(rankedTargets);

  return {
    runName,
    productionBaseline: {
      images: imageResults.length,
      imagePass: imageResults.filter((result) => result.imagePass).length,
      imageTotal: imageResults.length,
      stagePass: imageResults.reduce((sum, result) => sum + Number(result.stagePassCount || 0), 0),
      stageTotal: imageResults.length * 3,
      stageSidePass: currentPassRows,
      stageSideTotal: stageSideRows.length,
      productionApplications: applications.length,
      productionTp: applications.filter((app) => app.newValues).length,
      productionFp: applications.filter((app) => !stageSideRows.find((row) => row.image === app.image && row.stage === app.stage && row.side === app.side)?.pass).length,
      recoveryCounts: countBy(applications, "recoveryId"),
    },
    taxonomy,
    taxonomyCounts,
    remainingTaxonomyCounts,
    fieldMatrix,
    selectedCandidateCoverage,
    breakdown,
    recognitionSelection,
    recognitionSelectionByStage,
    wrongFieldHistogram,
    oneFieldAway,
    oneFieldAwayCounts,
    twoFieldAway,
    twoFieldPairs,
    singleFieldOracles,
    selectionOnlyLeverage,
    recognitionOnlyLeverage,
    member13Audit,
    bonusLeverage,
    totalLeverage,
    stage3Audit,
    stageCompletionLeverage,
    stageCompletionByField,
    imageCompletionLeverage,
    truncationAudit,
    rankedTargets,
    recommendation,
    diagnosticIssues,
  };
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) increment(counts, row[key] || "");
  return counts;
}

function countProfileIds(rows) {
  const counts = {};
  for (const row of rows) {
    for (const profile of row.provenance || []) increment(counts, profile);
  }
  return counts;
}

function buildRankedTargets(input) {
  const targetSpecs = [
    ["strict member1 selection", "member1", "existing exact candidates + strict deterministic selection", 1],
    ["strict member3 selection", "member3", "existing exact candidates + strict deterministic selection", 1],
    ["strict bonus selection", "bonus", "existing exact candidates + strict deterministic selection", 1],
    ["remaining member2 selection", "member2", "existing exact candidates + strict deterministic selection", 1],
    ["total selection follow-up", "total", "existing exact candidates + strict deterministic selection", 1],
    ["candidate completeness/plumbing", null, "neutral evidence plumbing", 2],
    ["member1 recognition", "member1", "OCR/capture work", 4],
    ["member2 recognition", "member2", "OCR/capture work", 4],
    ["member3 recognition", "member3", "OCR/capture work", 4],
    ["bonus recognition", "bonus", "OCR/capture work", 4],
    ["total recognition", "total", "OCR/capture work", 4],
    ["Stage3 architecture redesign", null, "larger architecture redesign", 5],
    ["more iPad fixtures/sample expansion", null, "sample expansion", 5],
  ];
  const rows = targetSpecs.map(([name, field, kind, complexityRank]) => {
    const selectionGain = field ? input.selectionOnlyLeverage[field]?.addedStageSidePass || 0 : 0;
    const recognitionGain = field ? input.recognitionOnlyLeverage[field]?.addedStageSidePass || 0 : 0;
    const stageCompletions = field ? input.stageCompletionByField[field] || 0 : 0;
    const oneField = field ? input.oneFieldAwayCounts[field] || 0 : 0;
    let theoretical = selectionGain + recognitionGain;
    let fpRisk = "medium";
    let priorSafety = "limited";
    let complexity = "medium";
    let browserStability = "unknown";
    if (kind.startsWith("existing exact")) {
      fpRisk = selectionGain >= 2 ? "low-to-medium" : "low but low gain";
      priorSafety = name.includes("member2") ? "strong M3 precedent" : "M3/Tier C precedent, field-specific proof still needed";
      complexity = "low-to-medium";
      browserStability = "measurable from current artifacts";
    } else if (kind === "neutral evidence plumbing") {
      theoretical = input.truncationAudit.expectedPresentButTruncated;
      fpRisk = "low if output remains unchanged";
      priorSafety = "diagnostic-only";
      complexity = "low";
      browserStability = "high";
    } else if (name === "Stage3 architecture redesign") {
      theoretical = 36 - input.stage3Audit.stageSidePass;
      fpRisk = "high until separately proven";
      priorSafety = "remaining Stage3 failures are mostly recognition-heavy";
      complexity = "high";
      browserStability = "unknown";
    } else if (name.includes("fixtures")) {
      theoretical = 0;
      fpRisk = "none";
      priorSafety = "improves confidence, no output change";
      complexity = "medium manual work";
      browserStability = "not applicable";
    } else {
      fpRisk = "medium-to-high";
      priorSafety = "recognition work has prior noise risk";
      complexity = "medium-to-high";
      browserStability = "requires new browser diagnostics";
    }
    const score =
      selectionGain * 10 +
      stageCompletions * 6 +
      oneField * 2 +
      (kind.startsWith("existing exact") ? 8 : 0) -
      complexityRank * 2;
    return {
      target: name,
      field,
      kind,
      oneFieldAwaySides: oneField,
      selectionOnlyAddressableSides: selectionGain,
      theoreticalTotalAddressableSides: theoretical,
      stageCompletions,
      possibleImageCompletions: 0,
      priorSafetyEvidence: priorSafety,
      expectedFpRisk: fpRisk,
      implementationComplexity: complexity,
      browserNativeStability: browserStability,
      recommendationScore: score,
    };
  });
  rows.sort((a, b) => b.recommendationScore - a.recommendationScore);
  return rows;
}

function chooseRecommendation(rankedTargets) {
  const safeSelector = rankedTargets.find(
    (entry) =>
      entry.kind.startsWith("existing exact") &&
      entry.selectionOnlyAddressableSides >= 2 &&
      /low/.test(entry.expectedFpRisk)
  );
  if (safeSelector) return safeSelector;
  const sampleExpansion = rankedTargets.find((entry) => entry.target === "more iPad fixtures/sample expansion");
  return {
    ...sampleExpansion,
    recommendationScore: Math.max(sampleExpansion?.recommendationScore || 0, 100),
    stoppingThresholdApplied: true,
    stoppingThresholdReason:
      "No narrow existing-candidate selector reaches the >=2 realistic stage/side gain threshold with stable low-FP browser evidence.",
  };
}

async function loadFixtureMeta() {
  const manifest = await readJson(path.join(ipadExpectedDir, "manifest.json"));
  const meta = new Map();
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    meta.set(entry.filename, entry);
  }
  return meta;
}

async function loadProductionRun(runIndex) {
  const runDir = path.join(productionVerificationDir, `run-${runIndex}`);
  const entries = await fs.readdir(runDir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const resultPath = path.join(runDir, entry.name, "production-result.json");
    try {
      results.push(await readJson(resultPath));
    } catch {
      // Ignore non-image directories.
    }
  }
  results.sort((a, b) => a.image.localeCompare(b.image));
  return results;
}

function compareRunStability(run1, run2) {
  const fieldMatrix1 = new Map(run1.fieldMatrix.map((row) => [fieldKeyFor(row.image, row.stage, row.side, row.field), row]));
  const taxonomy1 = new Map(run1.taxonomy.map((row) => [keyFor(row.image, row.stage, row.side), row]));
  const mismatches = [];
  for (const row of run2.fieldMatrix) {
    const other = fieldMatrix1.get(fieldKeyFor(row.image, row.stage, row.side, row.field));
    if (!other) {
      mismatches.push({ type: "missing-run1-field", row });
      continue;
    }
    if (
      other.selected !== row.selected ||
      other.expectedCandidatePresent !== row.expectedCandidatePresent ||
      other.candidateCount !== row.candidateCount ||
      other.truncated !== row.truncated
    ) {
      mismatches.push({
        type: "field-mismatch",
        image: row.image,
        stage: row.stage,
        side: row.side,
        field: row.field,
        run1: {
          selected: other.selected,
          expectedCandidatePresent: other.expectedCandidatePresent,
          candidateCount: other.candidateCount,
          truncated: other.truncated,
        },
        run2: {
          selected: row.selected,
          expectedCandidatePresent: row.expectedCandidatePresent,
          candidateCount: row.candidateCount,
          truncated: row.truncated,
        },
      });
    }
  }
  for (const row of run2.taxonomy) {
    const other = taxonomy1.get(keyFor(row.image, row.stage, row.side));
    if (
      !other ||
      other.category !== row.category ||
      other.pass !== row.pass ||
      other.wrongFields.join(",") !== row.wrongFields.join(",")
    ) {
      mismatches.push({ type: "taxonomy-mismatch", row, run1: other || null });
    }
  }
  return {
    productionOutputStable:
      run1.productionBaseline.stageSidePass === run2.productionBaseline.stageSidePass &&
      run1.productionBaseline.stagePass === run2.productionBaseline.stagePass &&
      run1.productionBaseline.productionApplications === run2.productionBaseline.productionApplications,
    candidatePoolsStable: !mismatches.some((entry) => entry.type === "field-mismatch"),
    classificationsStable: !mismatches.some((entry) => entry.type === "taxonomy-mismatch"),
    oneFieldAwayStable: JSON.stringify(run1.oneFieldAwayCounts) === JSON.stringify(run2.oneFieldAwayCounts),
    leverageStable:
      JSON.stringify(run1.selectionOnlyLeverage) === JSON.stringify(run2.selectionOnlyLeverage) &&
      JSON.stringify(run1.rankedTargets.map((row) => row.target)) ===
        JSON.stringify(run2.rankedTargets.map((row) => row.target)),
    mismatchCount: mismatches.length,
    mismatches: mismatches.slice(0, 100),
  };
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function buildReport(run, runStability) {
  const oneRows = Object.entries(run.oneFieldAwayCounts).map(([field, count]) => [field, String(count)]);
  const fieldRows = fieldFamilies.map((field) => {
    const c = run.selectedCandidateCoverage[field];
    return [
      field,
      `${c.selectedExact} / ${c.selectedTotal} (${c.selectedPct}%)`,
      `${c.expectedCandidatePresent} / ${c.selectedTotal}`,
      String(c.expectedCandidateAbsent),
      String(c.exactPresentButNotSelected),
    ];
  });
  const rankedRows = run.rankedTargets.map((entry) => [
    entry.target,
    String(entry.oneFieldAwaySides),
    String(entry.selectionOnlyAddressableSides),
    String(entry.theoreticalTotalAddressableSides),
    String(entry.stageCompletions),
    entry.expectedFpRisk,
    entry.implementationComplexity,
    String(entry.recommendationScore),
  ]);
  const recommendation = run.recommendation;
  const fixtureExpansionRecommendation =
    recommendation.target === "more iPad fixtures/sample expansion"
      ? "Expand expected fixtures from the remaining iPad screenshots before another production recovery."
      : "Continue tuning on the 18 fixtures first; a narrow existing-candidate selector has enough post-M3 signal to investigate before expanding fixtures.";

  return `# iPad Browser Post-M3 Leverage Review

Status: diagnostic-only. Production OCR output was not changed.

## Production Baseline

- source: actual browser production verification artifacts, run-1 and run-2
- iPad fixtures: ${run.productionBaseline.images}
- image PASS: ${run.productionBaseline.imagePass} / ${run.productionBaseline.imageTotal}
- stage PASS: ${run.productionBaseline.stagePass} / ${run.productionBaseline.stageTotal}
- stage/side PASS: ${run.productionBaseline.stageSidePass} / ${run.productionBaseline.stageSideTotal}
- production applications: ${run.productionBaseline.productionApplications}
- production TP / FP: ${run.productionBaseline.productionTp} / ${run.productionBaseline.productionFp}
- recovery counts: ${Object.entries(run.productionBaseline.recoveryCounts)
    .map(([key, value]) => `${key || "unknown"}=${value}`)
    .join(", ")}

M3 contribution is preserved: stage/side 44 / 108 -> 52 / 108, stage 10 / 54 -> 17 / 54, member2 exact 54 / 108 -> 62 / 108.

## Run Stability

- production output stable: ${runStability.productionOutputStable ? "yes" : "no"}
- candidate pools stable: ${runStability.candidatePoolsStable ? "yes" : "no"}
- failure classifications stable: ${runStability.classificationsStable ? "yes" : "no"}
- one-field-away counts stable: ${runStability.oneFieldAwayStable ? "yes" : "no"}
- leverage ranking stable: ${runStability.leverageStable ? "yes" : "no"}
- mismatch count: ${runStability.mismatchCount}

## 108-Side Taxonomy

${table(
  ["category", "all sides", "remaining failures"],
  Object.keys(run.taxonomyCounts)
    .sort()
    .map((category) => [category, String(run.taxonomyCounts[category] || 0), String(run.remainingTaxonomyCounts[category] || 0)])
)}

Counts total ${Object.values(run.taxonomyCounts).reduce((sum, value) => sum + value, 0)} stage/sides. Remaining failures total ${Object.values(run.remainingTaxonomyCounts).reduce((sum, value) => sum + value, 0)}.

## Field Coverage

${table(["field", "selected exact", "expected candidate present", "candidate absent", "exact present but not selected"], fieldRows)}

## Recognition Versus Selection

Wrong fields are selection failures only when the exact expected value is already present in the production candidate pool. Otherwise they are recognition/capture failures.

${table(
  ["field.reason", "count"],
  Object.entries(run.recognitionSelection)
    .sort()
    .map(([key, value]) => [key, String(value)])
)}

## Wrong-Field Histogram

Pre-M3 histogram was: 1 wrong=15, 2 wrong=11, 3 wrong=3, 4 wrong=10, 5 wrong=25.

Post-M3:

${table(
  ["wrong fields", "remaining sides"],
  ["1", "2", "3", "4", "5"].map((key) => [key, String(run.wrongFieldHistogram[key] || 0)])
)}

M3 moved eight member2-only or member2-dominated rows out of the remaining failure set, increasing clean side/stage completions while leaving recognition-heavy rows as the dominant residual group.

## One-Field-Away

${table(["field", "count"], oneRows)}

Detailed rows are saved to \`tmp/ipad-post-m3-leverage-review/one-field-away.json\`.

## Two-Field-Away Pairs

${table(
  ["field pair", "count"],
  Object.entries(run.twoFieldPairs)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => [key, String(value)])
)}

## Single-Field Oracle Leverage

${table(
  ["oracle", "added side PASS", "added stage PASS", "image PASS"],
  Object.entries(run.singleFieldOracles).map(([key, value]) => [
    key,
    String(value.addedStageSidePass),
    String(value.addedStagePass),
    String(value.imagePass),
  ])
)}

## Selection-Only Leverage

${table(
  ["field", "added side PASS", "added stage PASS", "image PASS"],
  fieldFamilies.map((field) => [
    field,
    String(run.selectionOnlyLeverage[field].addedStageSidePass),
    String(run.selectionOnlyLeverage[field].addedStagePass),
    String(run.selectionOnlyLeverage[field].imagePass),
  ])
)}

## Recognition-Only Leverage

${table(
  ["field", "added side PASS", "added stage PASS", "image PASS"],
  fieldFamilies.map((field) => [
    field,
    String(run.recognitionOnlyLeverage[field].addedStageSidePass),
    String(run.recognitionOnlyLeverage[field].addedStagePass),
    String(run.recognitionOnlyLeverage[field].imagePass),
  ])
)}

## Member1 / Member3 Audit

${table(
  ["field", "wrong", "exact present but unselected", "one-field-away", "candidate complete"],
  ["member1", "member3"].map((field) => {
    const audit = run.member13Audit[field];
    return [
      field,
      String(audit.wrong),
      String(audit.exactPresentButUnselected),
      String(audit.oneFieldAway),
      String(audit.candidateComplete),
    ];
  })
)}

Member1/member3 can reuse the M3 idea only if a future guard proves unchanged fields, a single observed matching candidate, and exact arithmetic without competing interpretations.

## Bonus Leverage

- one-field-away bonus sides: ${run.bonusLeverage.oneFieldAway.length}
- exact candidate present among those: ${run.bonusLeverage.exactCandidatePresent}
- exact candidate absent among those: ${run.bonusLeverage.exactCandidateAbsent}

Strict arithmetic using existing bonus candidates is worth investigating only if those candidates are already browser-observed and provenance is not from noisy diagnostic-only sources.

## Total Leverage

- one-field-away total sides: ${run.totalLeverage.oneFieldAway.length}
- exact candidate present among those: ${run.totalLeverage.exactCandidatePresent}
- exact candidate absent among those: ${run.totalLeverage.exactCandidateAbsent}

Remaining total cases blocked after strict-total are not automatically safe; exact candidate presence must still be paired with direct provenance and no competing interpretation.

## Stage3 Status

- Stage3 self PASS: ${run.stage3Audit.selfPass} / 18
- Stage3 enemy PASS: ${run.stage3Audit.enemyPass} / 18
- Stage3 stage/side PASS: ${run.stage3Audit.stageSidePass} / ${run.stage3Audit.stageSideTotal}
- one-field-away Stage3 sides: ${run.stage3Audit.oneFieldAway}
- two-field-away Stage3 sides: ${run.stage3Audit.twoFieldAway}
- 3+ wrong-field Stage3 sides: ${run.stage3Audit.threePlusWrong}

${table(
  ["field", "wrong / total", "exact candidate present when wrong"],
  fieldFamilies.map((field) => {
    const item = run.stage3Audit.failureRates[field];
    return [field, `${item.wrong} / ${item.total}`, String(item.exactCandidatePresentWhenWrong)];
  })
)}

Stage3 remains a separate architecture problem unless a narrow existing-candidate selector shows at least two stable, low-risk side gains.

## Stage Completion Leverage

${table(
  ["target field", "stage completions"],
  Object.entries(run.stageCompletionByField)
    .sort((a, b) => b[1] - a[1])
    .map(([field, count]) => [field, String(count)])
)}

## Image Completion Leverage

Nearest fixtures to full-image PASS:

${table(
  ["image", "passing stages", "failing sides", "one-field-away failing sides", "two-field-away failing sides"],
  run.imageCompletionLeverage.slice(0, 10).map((row) => [
    row.image,
    String(row.passingStages),
    String(row.failingStageSides),
    String(row.oneFieldAwayFailingSides),
    String(row.twoFieldAwayFailingSides),
  ])
)}

## Candidate Completeness / Truncation

- wrong fields with expected candidate present but truncated metadata: ${run.truncationAudit.expectedPresentButTruncated}
- wrong fields with truncated pool: ${run.truncationAudit.wrongWithTruncatedPool}
- wrong fields with missing pool: ${run.truncationAudit.wrongWithMissingPool}

## Ranked Next Targets

${table(
  [
    "target",
    "one-field-away",
    "selection-only sides",
    "theoretical sides",
    "stage completions",
    "FP risk",
    "complexity",
    "score",
  ],
  rankedRows
)}

## Recommendation

Recommended next experiment: **${recommendation.target}**.

Rationale: ${
    recommendation.stoppingThresholdApplied
      ? recommendation.stoppingThresholdReason
      : "it is the highest-ranked post-M3 target under the preference order."
  } It should remain diagnostic-only first, use only browser-native evidence, and require the same style of runner/browser parity and real-browser verification before production.

Fixture expansion: ${fixtureExpansionRecommendation}

## Production Unchanged Confirmation

This task changed no production OCR behavior. It preserves:

- T2 grouped-number parser
- Tier C
- strict-total
- strict-member2
- all rollback constants
- iPad ROI/preprocessing
- candidate ranking
- expected fixtures
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
`;
}

async function main() {
  const combined = await readJson(path.join(productionVerificationDir, "combined-summary.json"));
  if (!combined.pass) throw new Error("Production verification combined summary is not passing.");
  for (const run of combined.runs || []) {
    if (
      run.stageSidePass !== 52 ||
      run.stagePass !== 17 ||
      run.productionApplications !== 36 ||
      run.tp !== 36 ||
      run.fp !== 0
    ) {
      throw new Error(`Unexpected production baseline in run ${run.runIndex}: ${JSON.stringify(run)}`);
    }
  }
  const fixtureMeta = await loadFixtureMeta();
  const run1 = analyzeRun("run-1", await loadProductionRun(1), fixtureMeta);
  const run2 = analyzeRun("run-2", await loadProductionRun(2), fixtureMeta);
  const runStability = compareRunStability(run1, run2);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  await writeJson("production-baseline.json", run1.productionBaseline);
  await writeJson("stage-side-taxonomy.json", run1.taxonomy);
  await writeJson("field-matrix.json", run1.fieldMatrix);
  await writeJson("remaining-56.json", run1.taxonomy.filter((row) => !row.pass));
  await writeJson("wrong-field-histogram.json", run1.wrongFieldHistogram);
  await writeJson("one-field-away.json", run1.oneFieldAway);
  await writeJson("two-field-away.json", { rows: run1.twoFieldAway, pairs: run1.twoFieldPairs });
  await writeJson("single-field-oracles.json", run1.singleFieldOracles);
  await writeJson("selection-only-leverage.json", run1.selectionOnlyLeverage);
  await writeJson("recognition-only-leverage.json", run1.recognitionOnlyLeverage);
  await writeJson("member1-member3-audit.json", run1.member13Audit);
  await writeJson("bonus-leverage.json", run1.bonusLeverage);
  await writeJson("total-leverage.json", run1.totalLeverage);
  await writeJson("stage3-audit.json", run1.stage3Audit);
  await writeJson("stage-completion-leverage.json", run1.stageCompletionLeverage);
  await writeJson("image-completion-leverage.json", run1.imageCompletionLeverage);
  await writeJson("truncation-audit.json", run1.truncationAudit);
  await writeJson("ranked-targets.json", run1.rankedTargets);
  await writeJson("sample-expansion-analysis.json", {
    currentFixtures: 18,
    availableScreenshots: 75,
    remainingUnfixtureBackedEstimate: 57,
    recommendation:
      run1.recommendation.selectionOnlyAddressableSides >= 2
        ? "continue tuning on 18 first"
        : "expand fixtures before next production recovery",
  });
  await writeJson("run-stability.json", runStability);
  await writeJson("recommendation.json", run1.recommendation);
  await writeJson("run-2-summary.json", {
    productionBaseline: run2.productionBaseline,
    wrongFieldHistogram: run2.wrongFieldHistogram,
    oneFieldAwayCounts: run2.oneFieldAwayCounts,
    rankedTargets: run2.rankedTargets,
  });
  await fs.writeFile(reportPath, buildReport(run1, runStability));

  const result = {
    productionBaseline: run1.productionBaseline,
    remainingFailures: run1.taxonomy.filter((row) => !row.pass).length,
    wrongFieldHistogram: run1.wrongFieldHistogram,
    oneFieldAwayCounts: run1.oneFieldAwayCounts,
    twoFieldPairs: run1.twoFieldPairs,
    selectedCandidateCoverage: run1.selectedCandidateCoverage,
    selectionOnlyLeverage: Object.fromEntries(
      fieldFamilies.map((field) => [field, run1.selectionOnlyLeverage[field].addedStageSidePass])
    ),
    stageCompletionByField: run1.stageCompletionByField,
    stage3: run1.stage3Audit,
    recommendation: run1.recommendation,
    runStability,
    outputDir: path.relative(rootDir, outputDir).replaceAll("\\", "/"),
    report: path.relative(rootDir, reportPath).replaceAll("\\", "/"),
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
