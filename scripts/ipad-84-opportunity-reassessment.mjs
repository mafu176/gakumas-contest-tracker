import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const outDir = path.join(rootDir, "tmp", "ipad-84-opportunity-reassessment");

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const fields = ["member1", "member2", "member3", "bonus", "total"];

const aggregate84 = {
  images: { pass: 0, fail: 84, total: 84 },
  stages: { pass: 88, fail: 164, total: 252 },
  stageSides: { pass: 248, fail: 256, total: 504 },
  recoveries: {
    totalTp: 155,
    totalFp: 0,
    tierC: 97,
    strictTotal: 18,
    strictMember2: 40,
  },
};

const sourceBlocks = [
  {
    name: "original selected + expanded safety set",
    fixtures: 53,
    source: "tmp/ipad-production-fp-investigation/after-fix-53-two-run-summary.json",
    compatibility: "same iPad production recovery stack; two-run stable summary only",
    images: { pass: 0, fail: 53, total: 53 },
    stages: { pass: 58, fail: 101, total: 159 },
    stageSides: { pass: 162, fail: 156, total: 318 },
    recoveries: { totalTp: 119, totalFp: 0, tierC: 72, strictTotal: 15, strictMember2: 32 },
    detail: "aggregate-only",
  },
  {
    name: "expansion batch 1",
    fixtures: 10,
    source: "docs/ipad-fixture-expansion-and-reassessment.md",
    compatibility: "documented compatible browser production run; aggregate-only retained",
    recoveries: { totalTp: 8, totalFp: 0, tierC: 3, strictTotal: 2, strictMember2: 3 },
    detail: "aggregate-only",
  },
  {
    name: "expansion batch 2",
    fixtures: 11,
    source: "tmp/ipad-fixture-expansion-batch2/browser-new-batch-summary.json",
    compatibility: "same expanded-baseline browser production script; per-failure rows retained",
    recoveries: { totalTp: 13, totalFp: 0, tierC: 12, strictTotal: 0, strictMember2: 1 },
    detail: "failure-rows",
  },
  {
    name: "final expansion pass",
    fixtures: 10,
    source: "tmp/ipad-expanded-baseline/combined-summary.json",
    compatibility: "latest post-99186bc browser production run for final 10",
    images: { pass: 0, fail: 10, total: 10 },
    stages: { pass: 12, fail: 18, total: 30 },
    stageSides: { pass: 29, fail: 31, total: 60 },
    recoveries: { totalTp: 15, totalFp: 0, tierC: 10, strictTotal: 1, strictMember2: 4 },
    detail: "full-per-side",
  },
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function pct(pass, total) {
  return total ? Number(((pass / total) * 100).toFixed(1)) : 0;
}

function sideExpected(stageData, side) {
  return {
    members: stageData[`${side}Members`].slice(0, 3),
    bonus: Number(stageData[`${side}Bonus`] || 0),
    total: Number(stageData[`${side}Total`] || 0),
  };
}

function normalizeSide(value = {}) {
  const members = Array.isArray(value.members) ? value.members.slice(0, 3).map(Number) : [0, 0, 0];
  while (members.length < 3) members.push(0);
  return {
    members,
    bonus: Number(value.bonus || 0),
    total: Number(value.total || 0),
  };
}

function diffFields(expected, actual) {
  const normalized = normalizeSide(actual);
  const diffs = [];
  expected.members.forEach((value, index) => {
    if (normalized.members[index] !== value) diffs.push(`member${index + 1}`);
  });
  if (normalized.bonus !== expected.bonus) diffs.push("bonus");
  if (normalized.total !== expected.total) diffs.push("total");
  return diffs;
}

function validateFixture(filename, fixture) {
  const mismatches = [];
  for (const stage of stages) {
    const data = fixture[`stage${stage}`];
    const self = sideExpected(data, "self");
    const enemy = sideExpected(data, "enemy");
    const allMembers = [...self.members, ...enemy.members];
    const max = Math.max(...allMembers);
    const winningSide = self.members.includes(max) ? "self" : "enemy";
    const derivedBonus = Math.floor(max * 0.2);
    const selfExpectedBonus = winningSide === "self" ? derivedBonus : 0;
    const enemyExpectedBonus = winningSide === "enemy" ? derivedBonus : 0;
    const selfTotal = self.members.reduce((a, b) => a + b, 0) + self.bonus;
    const enemyTotal = enemy.members.reduce((a, b) => a + b, 0) + enemy.bonus;
    if (self.bonus !== selfExpectedBonus) mismatches.push({ filename, stage, side: "self", field: "bonus" });
    if (enemy.bonus !== enemyExpectedBonus) mismatches.push({ filename, stage, side: "enemy", field: "bonus" });
    if (self.total !== selfTotal) mismatches.push({ filename, stage, side: "self", field: "total" });
    if (enemy.total !== enemyTotal) mismatches.push({ filename, stage, side: "enemy", field: "total" });
  }
  return mismatches;
}

function loadExpectedFixtures() {
  const expectedDir = path.join(rootDir, "regression-test", "expected-ipad");
  return fs.readdirSync(expectedDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({ file, data: readJson(path.join(expectedDir, file)) }))
    .filter((entry) => entry.data.stage1 && entry.data.stage2 && entry.data.stage3);
}

function productionRowsFromResult(result) {
  return (result.perSide || []).map((row) => ({
    image: result.image,
    stage: row.stage,
    side: row.side,
    pass: Boolean(row.pass),
    expected: normalizeSide(row.expected),
    actual: normalizeSide(row.actual),
    wrongFields: diffFields(normalizeSide(row.expected), row.actual),
    recovery: (result.applications || []).filter(
      (entry) => entry.stage === row.stage && entry.side === row.side
    ).map((entry) => entry.recoveryId),
    detailSource: "production-result",
  }));
}

function loadDetailedRows() {
  const rows = [];
  const resultDirs = [
    path.join(rootDir, "tmp", "ipad-browser-production-verification", "run-1"),
    path.join(rootDir, "tmp", "ipad-expanded-baseline", "run-1"),
  ];
  for (const dir of resultDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name, "production-result.json");
      if (entry.isDirectory() && fs.existsSync(file)) {
        rows.push(...productionRowsFromResult(readJson(file)));
      }
    }
  }
  const batch2 = path.join(rootDir, "tmp", "ipad-fixture-expansion-batch2", "browser-new-batch-summary.json");
  if (fs.existsSync(batch2)) {
    const data = readJson(batch2);
    for (const image of data.images || []) {
      for (const row of image.failRows || []) {
        rows.push({
          image: image.image,
          stage: row.stage,
          side: row.side,
          pass: false,
          expected: normalizeSide(row.expected),
          actual: normalizeSide(row.actual),
          wrongFields: row.diffs || diffFields(normalizeSide(row.expected), row.actual),
          recovery: (image.applications || [])
            .filter((entry) => entry.stage === row.stage && entry.side === row.side)
            .map((entry) => entry.recoveryId || "unknown"),
          detailSource: "batch2-failRows",
        });
      }
    }
  }
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.image}|${row.stage}|${row.side}`;
    byKey.set(key, row);
  }
  return [...byKey.values()].sort((a, b) =>
    `${a.image}|${a.stage}|${a.side}`.localeCompare(`${b.image}|${b.stage}|${b.side}`)
  );
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function positionKey(row) {
  return `stage${row.stage}_${row.side}`;
}

function structuralShape(row) {
  const d = row.wrongFields;
  if (row.stage === 3 && d.length >= 3) return "Stage3 broad recognition/candidate-capture failure";
  if (d.length === 1 && d[0] === "bonus") return "one bonus wrong, other fields correct";
  if (d.length === 1 && d[0] === "total") return "one total wrong, other fields correct";
  if (d.length === 1 && d[0].startsWith("member")) return "one member wrong, other fields correct";
  if (d.includes("bonus") && d.includes("total") && d.length === 2) return "bonus + total pair";
  if (d.includes("member2") && d.includes("bonus")) return "member2 + bonus displacement/noise";
  if (d.includes("member2") && d.includes("total")) return "member2 + total pair";
  if (d.filter((field) => field.startsWith("member")).length >= 2) return "multi-member recognition/displacement";
  return `other ${d.join("+")}`;
}

function aggregateDetailed(rows) {
  const total = rows.length;
  const pass = rows.filter((row) => row.pass).length;
  const failed = rows.filter((row) => !row.pass);
  const fieldWrong = Object.fromEntries(fields.map((field) => [field, 0]));
  const fieldPass = Object.fromEntries(fields.map((field) => [field, 0]));
  for (const row of rows) {
    for (const field of fields) {
      if (row.wrongFields.includes(field)) fieldWrong[field] += 1;
      else fieldPass[field] += 1;
    }
  }
  return {
    rows: total,
    pass,
    fail: total - pass,
    accuracy: pct(pass, total),
    stage: Object.fromEntries(stages.map((stage) => {
      const stageRows = rows.filter((row) => row.stage === stage);
      const stagePass = stageRows.filter((row) => row.pass).length;
      return [`stage${stage}`, { pass: stagePass, fail: stageRows.length - stagePass, total: stageRows.length }];
    })),
    position: Object.fromEntries(["stage1_self", "stage1_enemy", "stage2_self", "stage2_enemy", "stage3_self", "stage3_enemy"].map((key) => {
      const positionRows = rows.filter((row) => positionKey(row) === key);
      const positionPass = positionRows.filter((row) => row.pass).length;
      return [key, { pass: positionPass, fail: positionRows.length - positionPass, total: positionRows.length }];
    })),
    fieldPass,
    fieldWrong,
    wrongFieldHistogram: countBy(failed, (row) => String(row.wrongFields.length)),
    oneFieldAway: failed.filter((row) => row.wrongFields.length === 1),
    twoFieldAwayPairs: countBy(
      failed.filter((row) => row.wrongFields.length === 2),
      (row) => row.wrongFields.slice().sort().join("+")
    ),
    structuralShapes: countBy(failed, structuralShape),
  };
}

function summarizeOpportunities(detailedSummary) {
  const oneField = detailedSummary.oneFieldAway;
  const oneByField = countBy(oneField, (row) => row.wrongFields[0]);
  const oneByStage = countBy(oneField, (row) => `stage${row.stage}`);
  return {
    stage12Bonus: {
      old53TheoreticalCeiling: 5,
      old53ConfirmedPureSelection: 1,
      retainedFailureInventoryObservedCeiling: (oneByField.bonus || 0),
      confirmedCeiling: 1,
      unknownProvenance: Math.max(0, (oneByField.bonus || 0) - 1),
      recommendation: "needs focused real-browser candidate/provenance capture before any selector work",
    },
    stage1Members: {
      retainedDetailOneFieldMemberRows: oneField.filter((row) => row.stage === 1 && row.wrongFields[0].startsWith("member")).length,
      confirmedSelectionCeiling: 0,
    },
    stage2Members: {
      retainedDetailOneFieldMemberRows: oneField.filter((row) => row.stage === 2 && row.wrongFields[0].startsWith("member")).length,
      confirmedSelectionCeiling: 0,
    },
    stage12Total: {
      retainedDetailOneFieldRows: oneField.filter((row) => row.stage < 3 && row.wrongFields[0] === "total").length,
      confirmedSelectionCeiling: 0,
    },
    stage3: {
      sides: 168,
      exactSides: 0,
      failedSides: 168,
      confirmedSelectionCeiling: 0,
      conclusion: "no useful selection-only ceiling in retained detailed artifacts; Stage3 remains recognition/candidate-capture limited",
    },
    oneFieldByField: oneByField,
    oneFieldByStage: oneByStage,
  };
}

function bundleAudit() {
  const packageJson = readJson(path.join(rootDir, "package.json"));
  const dependencies = packageJson.dependencies || {};
  const appPage = fs.readFileSync(path.join(rootDir, "app", "page.js"), "utf8");
  return {
    onnxruntimeWebDependency: dependencies["onnxruntime-web"] || null,
    rapidOcrMentionsInAppPage: (appPage.match(/RapidOCR/g) || []).length,
    dynamicImportMentions: (appPage.match(/import\(/g) || []).length,
    normalRuntimeCost:
      "No retained docs/artifacts show ORT/model initialization during normal OCR; RapidOCR remains developer-only.",
    normalBundleCost:
      "onnxruntime-web is a dependency, so cleanup may be worth a later bundle-size audit even though normal OCR should not initialize it.",
    loadsModelAssetsDuringNormalUse: false,
  };
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const fixtures = loadExpectedFixtures();
const validationMismatches = fixtures.flatMap((entry) => validateFixture(entry.file, entry.data));
const detailedRows = loadDetailedRows();
const fullPerSideRows = detailedRows.filter((row) => row.detailSource === "production-result");
const fullPerSideSummary = aggregateDetailed(fullPerSideRows);
const remainingFailures = detailedRows.filter((row) => !row.pass);
const failureOnlySummary = aggregateDetailed(remainingFailures);
const opportunities = summarizeOpportunities(failureOnlySummary);
const sources = {
  createdAt: new Date().toISOString(),
  latestExpectedCommit: "99186bc",
  sourceBlocks,
  artifactCompatibilityDecision:
    "Aggregate 84 metrics are consolidated from stable documented browser production summaries. Candidate/provenance claims are limited to retained detailed artifacts only.",
  detailedRowsRetained: detailedRows.length,
  fullPerSideRowsRetained: fullPerSideRows.length,
  fullPerSideImagesRetained: new Set(fullPerSideRows.map((row) => row.image)).size,
  failureOnlyRowsRetained: remainingFailures.length,
  detailedImagesRetained: new Set(detailedRows.map((row) => row.image)).size,
};

writeJson("dataset-summary.json", {
  fixtures: fixtures.length,
  stages: fixtures.length * 3,
  stageSides: fixtures.length * 6,
  arithmeticAndCrownRule: validationMismatches.length ? "FAIL" : "PASS",
  validationMismatches,
});
writeJson("baseline-sources.json", sources);
writeJson("production-baseline.json", aggregate84);
writeJson("remaining-failures.json", remainingFailures);
writeJson("stage-summary.json", {
  all84: {
    stage1And2Combined: { pass: 248, fail: 88, total: 336, accuracy: pct(248, 336) },
    stage1: "not safely separable from retained aggregate summaries",
    stage2: "not safely separable from retained aggregate summaries",
    stage3: { pass: 0, fail: 168, total: 168, accuracy: 0 },
  },
  retainedFullPerSide: fullPerSideSummary.stage,
  retainedFullPerSidePosition: fullPerSideSummary.position,
  retainedFailureInventoryByStage: countBy(remainingFailures, (row) => `stage${row.stage}`),
  retainedFailureInventoryByPosition: countBy(remainingFailures, positionKey),
});
writeJson("field-summary.json", {
  all84: "not safely reconstructable from retained production aggregate summaries",
  retainedFullPerSide: {
    rows: fullPerSideSummary.rows,
    fieldPass: fullPerSideSummary.fieldPass,
    fieldWrong: fullPerSideSummary.fieldWrong,
  },
  retainedFailureInventory: {
    rows: remainingFailures.length,
    fieldWrong: failureOnlySummary.fieldWrong,
  },
});
writeJson("wrong-field-histogram.json", {
  all84: "not safely reconstructable from retained production aggregate summaries",
  retainedFullPerSide: fullPerSideSummary.wrongFieldHistogram,
  retainedFailureInventory: failureOnlySummary.wrongFieldHistogram,
});
writeJson("one-field-away.json", failureOnlySummary.oneFieldAway);
writeJson("two-field-away.json", failureOnlySummary.twoFieldAwayPairs);
writeJson("recognition-selection-classification.json", {
  retainedDetailedClassification: {
    unknownCandidateProvenance: remainingFailures.reduce((sum, row) => sum + row.wrongFields.length, 0),
    selectionConfirmed: 0,
    recognitionConfirmed: 0,
    guardBlockedConfirmed: 0,
    note: "Retained production-result artifacts do not preserve full per-field candidate pools for all remaining failures. Do not collapse unknown into recognition.",
  },
});
writeJson("unknown-provenance.json", {
  retainedDetailedWrongFields: remainingFailures.reduce((sum, row) => sum + row.wrongFields.length, 0),
  unknownCandidateProvenance: remainingFailures.reduce((sum, row) => sum + row.wrongFields.length, 0),
  confirmedNoCandidate: 0,
});
writeJson("candidate-upper-bound.json", {
  all84: "unknown with retained artifacts",
  retainedDetailed: {
    exactCandidateAlreadyPresent: 0,
    allExactValuesAlreadyPresent: 0,
    allButOnePresent: 0,
    allButTwoPresent: 0,
    reason: "candidate-rich per-field pools were not retained for the full 84 production baseline",
  },
});
writeJson("selection-only-ceiling.json", opportunities);
writeJson("stage12-bonus.json", opportunities.stage12Bonus);
writeJson("stage1-members.json", opportunities.stage1Members);
writeJson("stage2-members.json", opportunities.stage2Members);
writeJson("stage12-total.json", opportunities.stage12Total);
writeJson("stage3-summary.json", opportunities.stage3);
writeJson("structural-shapes.json", failureOnlySummary.structuralShapes);
writeJson("old-vs-new-opportunities.json", {
  stage12Bonus: { old53Ceiling: 5, new84ObservedOneFieldInRetainedDetail: opportunities.stage12Bonus.retainedFailureInventoryObservedCeiling },
  stage1MemberSelection: { old38OneField: 1, new84ObservedOneFieldInRetainedDetail: opportunities.stage1Members.retainedDetailOneFieldMemberRows },
  stage2MemberSelection: { old38OneField: 0, new84ObservedOneFieldInRetainedDetail: opportunities.stage2Members.retainedDetailOneFieldMemberRows },
  stage12Total: { old53Ceiling: 2, new84ObservedOneFieldInRetainedDetail: opportunities.stage12Total.retainedDetailOneFieldRows },
  stage3CandidateReuse: { oldConclusion: "poor", new84Conclusion: opportunities.stage3.conclusion },
});
writeJson("opportunity-ranking.json", [
  {
    rank: 1,
    family: "Stage1/2 bonus provenance refresh",
    confirmedCeiling: 1,
    possibleCeiling: opportunities.stage12Bonus.retainedFailureInventoryObservedCeiling,
    needsNewOcr: false,
    evidenceMissing: "candidate/provenance detail for expanded one-field bonus rows",
    fpRisk: "low-to-medium until provenance is refreshed",
    nextDiagnostic: "focused real-browser candidate/provenance capture for Stage1/2 one-field bonus rows",
  },
  {
    rank: 2,
    family: "Stage1/2 strict total follow-up",
    confirmedCeiling: 0,
    possibleCeiling: opportunities.stage12Total.retainedDetailOneFieldRows,
    needsNewOcr: false,
    evidenceMissing: "exact total candidate/provenance for expanded one-field rows",
    fpRisk: "low if strict-total provenance remains exact, but likely low gain",
    nextDiagnostic: "include in the same focused provenance capture",
  },
  {
    rank: 3,
    family: "Stage1/2 member one-field selection",
    confirmedCeiling: 0,
    possibleCeiling: opportunities.stage1Members.retainedDetailOneFieldMemberRows + opportunities.stage2Members.retainedDetailOneFieldMemberRows,
    needsNewOcr: false,
    evidenceMissing: "slot candidate/provenance detail",
    fpRisk: "medium",
    nextDiagnostic: "candidate provenance only if bundled with bonus/total capture",
  },
  {
    rank: 4,
    family: "Stage3 candidate reuse",
    confirmedCeiling: 0,
    possibleCeiling: 0,
    needsNewOcr: false,
    evidenceMissing: "retained evidence does not show a clean selection-only ceiling",
    fpRisk: "high",
    nextDiagnostic: "defer; do not tune Stage3 from this reassessment",
  },
  {
    rank: 5,
    family: "RapidOCR Stage3",
    confirmedCeiling: 0,
    possibleCeiling: 0,
    needsNewOcr: true,
    evidenceMissing: "production readiness review showed net gain 0",
    fpRisk: "not justified",
    nextDiagnostic: "none; close out unless architecture changes",
  },
]);
writeJson("top-five.json", readJson(path.join(outDir, "opportunity-ranking.json")));
writeJson("bundle-audit.json", bundleAudit());
writeJson("recommendation.json", {
  selectedNextInvestigation: "focused real-browser candidate/provenance capture for Stage1/2 one-field bonus and total rows",
  confirmedNetNewTpCeiling: 1,
  possibleNetNewTpCeiling: opportunities.stage12Bonus.retainedFailureInventoryObservedCeiling + opportunities.stage12Total.retainedDetailOneFieldRows,
  shouldContinueOptimizationNow:
    opportunities.stage12Bonus.retainedFailureInventoryObservedCeiling >= 2
      ? "YES, but only as focused provenance capture; no production selector yet"
      : "STOP",
  productionChanged: false,
});

console.log(`Wrote iPad 84 opportunity reassessment artifacts to ${path.relative(rootDir, outDir)}`);
console.log(JSON.stringify({
  fixtures: fixtures.length,
  validation: validationMismatches.length ? "FAIL" : "PASS",
  aggregate84,
  detailedRows: detailedRows.length,
  retainedDetailedFailures: remainingFailures.length,
}, null, 2));
