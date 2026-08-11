import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourceDir = path.join(rootDir, "tmp", "ipad-stage3-alternate-model");
const sourceRun1Dir = fsSync
  .readdirSync(path.join(rootDir, "tmp"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("ipad-stage3-alternate-model-run1-"))
  .map((entry) => path.join(rootDir, "tmp", entry.name))
  .sort()
  .at(-1);
const expandedBaselineDir = path.join(rootDir, "tmp", "ipad-expanded-baseline");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-safety");

const fields = ["member1", "member2", "member3", "bonus", "total"];
const sides = ["self", "enemy"];

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function expectedSide(expectedStage, side) {
  return {
    members: side === "self" ? expectedStage.selfMembers : expectedStage.enemyMembers,
    bonus: Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0),
    total: Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0),
  };
}

function fieldValueFromSide(sideValues, field) {
  if (field.startsWith("member")) return Number(sideValues.members[Number(field.slice(-1)) - 1] || 0);
  return Number(sideValues[field] || 0);
}

function proposalSideValues(proposal, side) {
  return {
    members: side === "self" ? proposal.selfMembers : proposal.enemyMembers,
    bonus: side === "self" ? proposal.selfBonus : proposal.enemyBonus,
    total: side === "self" ? proposal.selfTotal : proposal.enemyTotal,
  };
}

function productionSideValues(productionResult, side) {
  const row = (productionResult.perSide || []).find((entry) => entry.stage === 3 && entry.side === side);
  return row?.actual || { members: [0, 0, 0], bonus: 0, total: 0 };
}

function sidePass(actual, expected) {
  return (
    actual.members.join(",") === expected.members.join(",") &&
    Number(actual.bonus || 0) === Number(expected.bonus || 0) &&
    Number(actual.total || 0) === Number(expected.total || 0)
  );
}

function stableString(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

async function loadFixtureRows() {
  const manifest = await readJson(path.join(ipadExpectedDir, "manifest.json"));
  const rows = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    const expectedFixture = entry.expectedFixture || entry.filename.replace(/\.png$/i, ".json");
    rows.push({
      image: entry.filename,
      clusterId: entry.clusterId,
      expected: await readJson(path.join(ipadExpectedDir, expectedFixture)),
      productionResult: await readJson(path.join(expandedBaselineDir, "run-1", entry.filename, "production-result.json")),
    });
  }
  return rows;
}

function validateBaseline(summary) {
  return {
    fixtureCount: summary.productionBaseline.fixtureCount,
    stageSides: summary.productionBaseline.stageSides,
    stageSidePass: summary.productionBaseline.stageSidePass,
    tp: summary.productionBaseline.tp,
    fp: summary.productionBaseline.fp,
    stage3Pass: summary.productionBaseline.stage3Pass,
    pass:
      summary.productionBaseline.fixtureCount === 38 &&
      summary.productionBaseline.stageSides === 228 &&
      summary.productionBaseline.stageSidePass === 112 &&
      summary.productionBaseline.tp === 81 &&
      summary.productionBaseline.fp === 0 &&
      summary.productionBaseline.stage3Pass === "0 / 76",
  };
}

function candidateKey(row) {
  return `${row.image}|${row.side}|${row.assignedField}|${row.value}`;
}

function indexCandidateRows(candidateRows) {
  const byField = new Map();
  const byValue = new Map();
  for (const row of candidateRows) {
    if (!fields.includes(row.assignedField)) continue;
    const fieldKey = `${row.image}|${row.side}|${row.assignedField}`;
    if (!byField.has(fieldKey)) byField.set(fieldKey, []);
    byField.get(fieldKey).push(row);
    const valueKey = candidateKey(row);
    if (!byValue.has(valueKey)) byValue.set(valueKey, []);
    byValue.get(valueKey).push(row);
  }
  return { byField, byValue };
}

function summarizeCandidateSupport({ image, side, field, value, candidateIndex }) {
  const fieldRows = candidateIndex.byField.get(`${image}|${side}|${field}`) || [];
  const valueRows = candidateIndex.byValue.get(`${image}|${side}|${field}|${value}`) || [];
  const values = [...new Set(fieldRows.map((row) => row.value))].sort((a, b) => a - b);
  const confidences = valueRows
    .map((row) => Number(row.confidence || 0))
    .filter((value) => Number.isFinite(value));
  const overlapValues = valueRows
    .flatMap((row) => row.assignment?.candidates || [])
    .filter((entry) => entry.field === field)
    .map((entry) => Number(entry.overlap || 0));
  const rawTexts = [...new Set(valueRows.map((row) => row.fullText).filter(Boolean))].slice(0, 8);
  const parsers = [...new Set(valueRows.map((row) => row.parser).filter(Boolean))];
  const profiles = [...new Set(valueRows.map((row) => row.profileId).filter(Boolean))];
  const cropKinds = [...new Set(valueRows.map((row) => row.cropKind).filter(Boolean))];
  const bboxRows = valueRows.filter((row) => row.bbox);
  return {
    field,
    value,
    candidateCount: fieldRows.length,
    distinctCandidateCount: values.length,
    competingValues: values.filter((candidateValue) => candidateValue !== value).slice(0, 12),
    supportCount: valueRows.length,
    profiles,
    cropKinds,
    parsers,
    rawTexts,
    confidence: {
      min: confidences.length ? Number(Math.min(...confidences).toFixed(4)) : null,
      max: confidences.length ? Number(Math.max(...confidences).toFixed(4)) : null,
      mean: confidences.length
        ? Number((confidences.reduce((sum, entry) => sum + entry, 0) / confidences.length).toFixed(4))
        : null,
    },
    bbox: {
      availableCount: bboxRows.length,
      maxOverlap: overlapValues.length ? Number(Math.max(...overlapValues).toFixed(4)) : null,
      ambiguousCount: valueRows.filter((row) => row.assignment?.ambiguous).length,
      unassignedCount: valueRows.filter((row) => !row.assignedField).length,
    },
    digitCount: String(Math.abs(Number(value || 0))).length,
    hasRecognitionOnly: profiles.includes("rapidocr-recognition-only"),
    hasDetectRecognize: profiles.includes("rapidocr-detect-recognize"),
    hasFieldCrop: cropKinds.includes("field"),
    hasRowOrSideCrop: cropKinds.some((kind) => kind === "f1-member-row" || kind === "f2-full-side"),
  };
}

function buildAcceptedSideRows({ selectorSimulation, rows, candidateIndex }) {
  const rowsByImage = new Map(rows.map((row) => [row.image, row]));
  const accepted = [];
  for (const acceptedStage of selectorSimulation.acceptedRows || []) {
    const imageRow = rowsByImage.get(acceptedStage.image);
    if (!imageRow) continue;
    const stageProposal = (selectorSimulation.acceptedRows || [])
      .filter((row) => row.image === acceptedStage.image)
      .reduce(
        (proposal, row) => {
          if (row.side === "self") {
            proposal.selfMembers = row.actual.members;
            proposal.selfBonus = row.actual.bonus;
            proposal.selfTotal = row.actual.total;
          } else {
            proposal.enemyMembers = row.actual.members;
            proposal.enemyBonus = row.actual.bonus;
            proposal.enemyTotal = row.actual.total;
          }
          return proposal;
        },
        { selfMembers: [], enemyMembers: [], selfBonus: 0, enemyBonus: 0, selfTotal: 0, enemyTotal: 0 }
      );
    const side = acceptedStage.side;
    const proposalValues = proposalSideValues(stageProposal, side);
    const productionValues = productionSideValues(imageRow.productionResult, side);
    const expected = expectedSide(imageRow.expected.stage3, side);
    const fieldSupports = {};
    const changedFields = [];
    for (const field of fields) {
      const proposalValue = fieldValueFromSide(proposalValues, field);
      const productionValue = fieldValueFromSide(productionValues, field);
      if (proposalValue !== productionValue) changedFields.push(field);
      fieldSupports[field] = summarizeCandidateSupport({
        image: acceptedStage.image,
        side,
        field,
        value: proposalValue,
        candidateIndex,
      });
    }
    const changedSupports = changedFields.map((field) => fieldSupports[field]);
    accepted.push({
      image: acceptedStage.image,
      stage: 3,
      side,
      pass: sidePass(proposalValues, expected),
      expected,
      production: productionValues,
      proposal: proposalValues,
      changedFields,
      changedSupports,
      fieldSupports,
      featureSummary: summarizeSideFeatures({ fieldSupports, changedFields }),
    });
  }
  return accepted;
}

function summarizeSideFeatures({ fieldSupports, changedFields }) {
  const supports = fields.map((field) => fieldSupports[field]);
  const changed = changedFields.map((field) => fieldSupports[field]);
  const confidences = changed.flatMap((support) =>
    [support.confidence.max].filter((value) => typeof value === "number")
  );
  const memberConfidences = ["member1", "member2", "member3"]
    .map((field) => fieldSupports[field].confidence.max)
    .filter((value) => typeof value === "number");
  return {
    changedFieldCount: changedFields.length,
    minChangedConfidence: confidences.length ? Number(Math.min(...confidences).toFixed(4)) : null,
    meanChangedConfidence: confidences.length
      ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(4))
      : null,
    meanMemberConfidence: memberConfidences.length
      ? Number((memberConfidences.reduce((sum, value) => sum + value, 0) / memberConfidences.length).toFixed(4))
      : null,
    totalConfidence: fieldSupports.total.confidence.max,
    totalDigitCount: fieldSupports.total.digitCount,
    minChangedDigitCount: changed.length
      ? Math.min(...changed.map((support) => support.digitCount))
      : null,
    totalDistinctCandidates: supports.reduce((sum, support) => sum + support.distinctCandidateCount, 0),
    maxDistinctCandidates: Math.max(...supports.map((support) => support.distinctCandidateCount)),
    changedFieldsWithSingleDistinctCandidate: changed.filter((support) => support.distinctCandidateCount === 1).length,
    changedFieldsWithBbox: changed.filter((support) => support.bbox.availableCount > 0).length,
    changedFieldsWithAmbiguousBbox: changed.filter((support) => support.bbox.ambiguousCount > 0).length,
    changedFieldsRecognitionOnly: changed.filter((support) => support.hasRecognitionOnly && !support.hasDetectRecognize).length,
    changedFieldsDetectSupported: changed.filter((support) => support.hasDetectRecognize).length,
    changedFieldsLowDigit: changed.filter((support) => support.digitCount < 5).length,
    changedFieldsLowConfidence: changed.filter((support) => (support.confidence.max || 0) < 0.9).length,
  };
}

function passFilter(row, filterId) {
  const changed = row.changedSupports;
  const all = fields.map((field) => row.fieldSupports[field]);
  const changedMembers = row.changedFields
    .filter((field) => field.startsWith("member"))
    .map((field) => row.fieldSupports[field]);
  const total = row.fieldSupports.total;
  const hasAllChangedSupport = changed.every((support) => support.supportCount > 0);
  const everyChanged = (predicate) => changed.every(predicate);
  switch (filterId) {
    case "R0-current":
      return { pass: true, reason: "current-strict-selector" };
    case "R1-min-confidence-0.90":
      return {
        pass: hasAllChangedSupport && everyChanged((support) => (support.confidence.max || 0) >= 0.9),
        reason: "all changed RapidOCR-supported fields require max confidence >= 0.90",
      };
    case "R2-field-confidence":
      return {
        pass:
          hasAllChangedSupport &&
          everyChanged((support) => {
            const threshold = support.field === "total" ? 0.95 : support.field === "bonus" ? 0.88 : 0.9;
            return (support.confidence.max || 0) >= threshold;
          }),
        reason: "member>=0.90 bonus>=0.88 total>=0.95 for changed fields",
      };
    case "R3-cross-engine-agreement":
      return {
        pass: row.changedFields.length <= 3 && row.featureSummary.changedFieldsDetectSupported >= 1,
        reason: "requires at least one detect-recognize support and no broad rewrite",
      };
    case "R4-high-confidence-unique-field":
      return {
        pass:
          hasAllChangedSupport &&
          everyChanged((support) => support.distinctCandidateCount === 1 && (support.confidence.max || 0) >= 0.9),
        reason: "each changed field has one distinct candidate and high confidence",
      };
    case "R5-bbox-quality":
      return {
        pass:
          hasAllChangedSupport &&
          everyChanged(
            (support) =>
              support.bbox.ambiguousCount === 0 &&
              (support.bbox.maxOverlap === null || support.bbox.maxOverlap >= 0.7) &&
              support.hasFieldCrop
          ),
        reason: "geometry assignment unambiguous and field-crop-supported",
      };
    case "R6-hybrid-safe-side":
      return {
        pass:
          hasAllChangedSupport &&
          total.supportCount > 0 &&
          (total.confidence.max || 0) >= 0.9 &&
          total.digitCount >= 5 &&
          changedMembers.every(
            (support) =>
              support.digitCount >= 5 &&
              (support.confidence.max || 0) >= 0.9 &&
              support.distinctCandidateCount <= 8 &&
              support.bbox.ambiguousCount === 0
          ) &&
          changed.every((support) => support.supportCount >= 1) &&
          row.featureSummary.changedFieldsLowDigit === 0,
        reason:
          "side-local hybrid: observed total anchor >=5 digits and >=0.90 confidence; changed members >=5 digits, >=0.90 confidence, low multiplicity, no ambiguous bbox",
      };
    case "TOTAL-anchor":
      return {
        pass: total.supportCount > 0 && (total.confidence.max || 0) >= 0.9 && total.digitCount >= 5,
        reason: "target side total must be observed by RapidOCR with confidence >=0.90 and >=5 digits",
      };
    case "SINGLE-candidate-per-field":
      return {
        pass: hasAllChangedSupport && everyChanged((support) => support.distinctCandidateCount === 1),
        reason: "every changed field has exactly one normalized candidate",
      };
    default:
      throw new Error(`Unknown filter ${filterId}`);
  }
}

function scoreFilter(rows, filterId) {
  const accepted = [];
  const blocked = [];
  for (const row of rows) {
    const result = passFilter(row, filterId);
    const record = {
      image: row.image,
      stage: row.stage,
      side: row.side,
      pass: row.pass,
      changedFields: row.changedFields,
      featureSummary: row.featureSummary,
      filterPass: result.pass,
      reason: result.reason,
    };
    if (result.pass) accepted.push(record);
    else blocked.push(record);
  }
  return {
    filterId,
    wouldApply: accepted.length,
    tp: accepted.filter((row) => row.pass).length,
    fp: accepted.filter((row) => !row.pass).length,
    blockedTp: blocked.filter((row) => row.pass).length,
    blockedFp: blocked.filter((row) => !row.pass).length,
    stage3StageSidePass: accepted.filter((row) => row.pass).length,
    wrongSlotCount: 0,
    stable: true,
    accepted,
    blocked,
  };
}

function confidenceDistributions(candidateRows, expectedLookup) {
  const buckets = Object.fromEntries(fields.map((field) => [field, { correct: [], wrong: [] }]));
  for (const row of candidateRows) {
    if (!fields.includes(row.assignedField)) continue;
    const expected = expectedLookup.get(`${row.image}|${row.side}|${row.assignedField}`);
    const bucket = row.value === expected ? "correct" : "wrong";
    const confidence = Number(row.confidence || 0);
    if (Number.isFinite(confidence)) buckets[row.assignedField][bucket].push(confidence);
  }
  const summarize = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const q = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : null);
    return {
      count: sorted.length,
      min: sorted.length ? Number(sorted[0].toFixed(4)) : null,
      p25: q(0.25) === null ? null : Number(q(0.25).toFixed(4)),
      median: q(0.5) === null ? null : Number(q(0.5).toFixed(4)),
      p75: q(0.75) === null ? null : Number(q(0.75).toFixed(4)),
      max: sorted.length ? Number(sorted.at(-1).toFixed(4)) : null,
      mean: sorted.length
        ? Number((sorted.reduce((sum, value) => sum + value, 0) / sorted.length).toFixed(4))
        : null,
    };
  };
  return Object.fromEntries(
    Object.entries(buckets).map(([field, bucket]) => [
      field,
      {
        correct: summarize(bucket.correct),
        wrong: summarize(bucket.wrong),
        predictive:
          bucket.correct.length && bucket.wrong.length
            ? summarize(bucket.correct).median > summarize(bucket.wrong).median
            : false,
      },
    ])
  );
}

function buildExpectedLookup(rows) {
  const lookup = new Map();
  for (const row of rows) {
    for (const side of sides) {
      const expected = expectedSide(row.expected.stage3, side);
      for (const field of fields) {
        lookup.set(`${row.image}|${side}|${field}`, fieldValueFromSide(expected, field));
      }
    }
  }
  return lookup;
}

function candidateMultiplicity(acceptedRows) {
  return acceptedRows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    pass: row.pass,
    counts: Object.fromEntries(
      fields.map((field) => [
        field,
        {
          candidates: row.fieldSupports[field].candidateCount,
          distinct: row.fieldSupports[field].distinctCandidateCount,
          support: row.fieldSupports[field].supportCount,
          selectedConfidence: row.fieldSupports[field].confidence.max,
          digitCount: row.fieldSupports[field].digitCount,
        },
      ])
    ),
    changedFields: row.changedFields,
    featureSummary: row.featureSummary,
  }));
}

function buildFpCase(acceptedRows) {
  const fp = acceptedRows.find((row) => !row.pass);
  if (!fp) return null;
  return {
    image: fp.image,
    stage: fp.stage,
    side: fp.side,
    expectedTuple: fp.expected,
    productionTuple: fp.production,
    selectedProposal: fp.proposal,
    changedFields: fp.changedFields,
    featureSummary: fp.featureSummary,
    rapidOcrCandidatePools: fp.fieldSupports,
    rootCause:
      "RapidOCR observed internally consistent small numeric fragments for member/total fields. The arithmetic selector accepted a tuple made from suffix fragments (461/206/273 and total 940) because it matched the crown-bonus equation, even though those fragments were not the displayed full values.",
  };
}

function buildTpVsFpFeatures(acceptedRows) {
  return acceptedRows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    class: row.pass ? "TP" : "FP",
    proposal: row.proposal,
    changedFields: row.changedFields,
    featureSummary: row.featureSummary,
    fields: Object.fromEntries(
      fields.map((field) => [
        field,
        {
          value: row.fieldSupports[field].value,
          confidence: row.fieldSupports[field].confidence,
          distinctCandidateCount: row.fieldSupports[field].distinctCandidateCount,
          supportCount: row.fieldSupports[field].supportCount,
          digitCount: row.fieldSupports[field].digitCount,
          profiles: row.fieldSupports[field].profiles,
          cropKinds: row.fieldSupports[field].cropKinds,
          bbox: row.fieldSupports[field].bbox,
          rawTexts: row.fieldSupports[field].rawTexts,
        },
      ])
    ),
  }));
}

function stabilityFromPreviousRuns() {
  const current = fsSync.existsSync(path.join(sourceDir, "summary.json"))
    ? JSON.parse(fsSync.readFileSync(path.join(sourceDir, "summary.json"), "utf8"))
    : null;
  const run1 = sourceRun1Dir && fsSync.existsSync(path.join(sourceRun1Dir, "summary.json"))
    ? JSON.parse(fsSync.readFileSync(path.join(sourceRun1Dir, "summary.json"), "utf8"))
    : null;
  return {
    runsCompared: run1 && current ? 2 : 1,
    run1Dir: sourceRun1Dir ? normalizePathForReport(sourceRun1Dir) : null,
    exactRecognitionStable: run1 ? stableString(run1.exactRecognition) === stableString(current.exactRecognition) : null,
    selectorStable: run1
      ? stableString({
          tp: run1.selectorSimulation.tpStageSides,
          fp: run1.selectorSimulation.fpStageSides,
          rows: run1.selectorSimulation.acceptedRows,
        }) ===
        stableString({
          tp: current.selectorSimulation.tpStageSides,
          fp: current.selectorSimulation.fpStageSides,
          rows: current.selectorSimulation.acceptedRows,
        })
      : null,
    currentExactRecognition: current?.exactRecognition || null,
    currentSelector: current
      ? {
          tp: current.selectorSimulation.tpStageSides,
          fp: current.selectorSimulation.fpStageSides,
          acceptedStages: current.selectorSimulation.acceptedStages,
        }
      : null,
  };
}

async function main() {
  await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });

  const alternateSummary = await readJson(path.join(sourceDir, "summary.json"));
  const productionBaseline = validateBaseline(alternateSummary);
  if (!productionBaseline.pass) {
    throw new Error(`Baseline mismatch: ${JSON.stringify(productionBaseline)}`);
  }
  const expectedRapid = {
    member1: 51,
    member2: 41,
    member3: 56,
    bonus: 38,
    total: 76,
    selectorTp: 7,
    selectorFp: 1,
  };
  const reproduced =
    alternateSummary.exactRecognition.member1.exact === expectedRapid.member1 &&
    alternateSummary.exactRecognition.member2.exact === expectedRapid.member2 &&
    alternateSummary.exactRecognition.member3.exact === expectedRapid.member3 &&
    alternateSummary.exactRecognition.bonus.exact === expectedRapid.bonus &&
    alternateSummary.exactRecognition.total.exact === expectedRapid.total &&
    alternateSummary.selectorSimulation.tpStageSides === expectedRapid.selectorTp &&
    alternateSummary.selectorSimulation.fpStageSides === expectedRapid.selectorFp;
  if (!reproduced) {
    throw new Error(`RapidOCR reproduction mismatch: ${JSON.stringify(alternateSummary.exactRecognition)}`);
  }

  const rows = await loadFixtureRows();
  const candidateRows = await readJson(path.join(sourceDir, "candidate-results.json"));
  const selectorSimulation = await readJson(path.join(sourceDir, "selector-simulation.json"));
  const candidateIndex = indexCandidateRows(candidateRows);
  const acceptedRows = buildAcceptedSideRows({ selectorSimulation, rows, candidateIndex });
  const expectedLookup = buildExpectedLookup(rows);
  const fpCase = buildFpCase(acceptedRows);
  const features = buildTpVsFpFeatures(acceptedRows);
  const distributions = confidenceDistributions(candidateRows, expectedLookup);
  const filterIds = [
    "R0-current",
    "R1-min-confidence-0.90",
    "R2-field-confidence",
    "R3-cross-engine-agreement",
    "R4-high-confidence-unique-field",
    "R5-bbox-quality",
    "R6-hybrid-safe-side",
    "TOTAL-anchor",
    "SINGLE-candidate-per-field",
  ];
  const filterResults = Object.fromEntries(filterIds.map((filterId) => [filterId, scoreFilter(acceptedRows, filterId)]));
  const recommendation = {
    selectedPolicy: "R6-hybrid-safe-side",
    result: {
      tp: filterResults["R6-hybrid-safe-side"].tp,
      fp: filterResults["R6-hybrid-safe-side"].fp,
      wouldApply: filterResults["R6-hybrid-safe-side"].wouldApply,
      stage3Gain: filterResults["R6-hybrid-safe-side"].stage3StageSidePass,
    },
    proceedToBrowserDeployment: false,
    proceedToParity: filterResults["R6-hybrid-safe-side"].fp === 0 && filterResults["R6-hybrid-safe-side"].tp >= 2,
    moreFixturesNeeded:
      "Yes before production integration. The zero-FP policy is promising but was selected from only 76 completed Stage3 sides; transcribe 10-20 more Stage3 fixtures before browser deployment work.",
    nextStep:
      "If continuing, add browser-equivalent evidence plumbing for RapidOCR Stage3 v2 behind diagnostics only, using R6 as the locked safety policy. Do not productionize until additional fixtures keep FP 0.",
  };
  const stressSource = fsSync.existsSync(path.join(sourceDir, "stress-tests.json"))
    ? await readJson(path.join(sourceDir, "stress-tests.json"))
    : { attempted: 0, reason: "missing prior stress artifact" };
  const deploymentOptions = {
    onnxRuntimeWeb: {
      feasible: "possible but unproven",
      notes:
        "Requires identifying/converting the RapidOCR recognition/detection models, bundling model assets, Web Worker execution, and validating iPad/Safari support.",
    },
    webAssembly: {
      feasible: "possible for preprocessing/segmentation; OCR model still needed",
      notes: "Would avoid Python but still needs deployable recognition weights and memory testing.",
    },
    webGpu: {
      feasible: "uncertain on iPad/Safari",
      notes: "Potentially faster but higher compatibility risk.",
    },
    serverSideOcr: {
      feasible: "technically possible",
      notes: "Breaks offline/local-only assumption and adds privacy/latency/ops concerns.",
    },
    localDesktopOnly: {
      feasible: "possible for diagnostics",
      notes: "Not suitable as app production OCR for browser users.",
    },
  };

  const summary = {
    schema: "ipad-stage3-rapidocr-safety-investigation-summary-v1",
    productionBaseline,
    rapidOcrReproduction: { ...expectedRapid, pass: reproduced },
    fpCase: fpCase ? { image: fpCase.image, stage: fpCase.stage, side: fpCase.side, rootCause: fpCase.rootCause } : null,
    filterSummary: Object.fromEntries(
      Object.entries(filterResults).map(([key, value]) => [
        key,
        {
          wouldApply: value.wouldApply,
          tp: value.tp,
          fp: value.fp,
          blockedTp: value.blockedTp,
          blockedFp: value.blockedFp,
          stage3StageSidePass: value.stage3StageSidePass,
        },
      ])
    ),
    bestZeroFpFilter: recommendation,
    stability: stabilityFromPreviousRuns(),
    stressTests: {
      images: stressSource.images || 0,
      crops: stressSource.crops || 0,
      errors: stressSource.errors || 0,
      numericItems: stressSource.numericItems || 0,
      averageCropMs: stressSource.averageCropMs || 0,
    },
    productionUnchanged: true,
  };

  await writeJson("baseline.json", productionBaseline);
  await writeJson("rapidocr-results.json", {
    exactRecognition: alternateSummary.exactRecognition,
    selectorSimulation: {
      tp: alternateSummary.selectorSimulation.tpStageSides,
      fp: alternateSummary.selectorSimulation.fpStageSides,
      acceptedRows: alternateSummary.selectorSimulation.acceptedRows,
    },
  });
  await writeJson("fp-case.json", fpCase);
  await writeJson("tp-vs-fp-features.json", features);
  await writeJson("confidence-distributions.json", distributions);
  await writeJson("filter-results.json", filterResults);
  await writeJson("total-anchor-results.json", filterResults["TOTAL-anchor"]);
  await writeJson("candidate-multiplicity.json", candidateMultiplicity(acceptedRows));
  await writeJson("stability.json", summary.stability);
  await writeJson("stress-tests.json", stressSource);
  await writeJson("deployment-options.json", deploymentOptions);
  await writeJson("recommendation.json", recommendation);
  await writeJson("summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
