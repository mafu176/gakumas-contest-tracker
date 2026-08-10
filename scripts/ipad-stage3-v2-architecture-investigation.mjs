import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const expectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const baselineDir = path.join(rootDir, "tmp", "ipad-expanded-baseline", "run-1");
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-v2-architecture");

const stages = [3];
const sides = ["self", "enemy"];
const memberFields = ["member1", "member2", "member3"];
const fields = [...memberFields, "bonus", "total"];

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function percentage(pass, total) {
  return total ? Number(((pass / total) * 100).toFixed(1)) : 0;
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function extractBalancedJson(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
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
      if (depth === 0) return JSON.parse(text.slice(start, index + 1));
    }
  }
  return null;
}

function expectedSide(expectedStage, side) {
  return {
    members: side === "self" ? expectedStage.selfMembers.map(Number) : expectedStage.enemyMembers.map(Number),
    bonus: Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0),
    total: Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0),
  };
}

function actualSide(perSide, stage, side) {
  const row = perSide.find((entry) => entry.stage === stage && entry.side === side);
  return row?.actual || { members: [0, 0, 0], bonus: 0, total: 0 };
}

function fieldExpectedValue(expected, field) {
  if (field.startsWith("member")) {
    return expected.members[Number(field.replace("member", "")) - 1] || 0;
  }
  return expected[field] || 0;
}

function fieldActualValue(actual, field) {
  if (field.startsWith("member")) {
    return actual.members[Number(field.replace("member", "")) - 1] || 0;
  }
  return actual[field] || 0;
}

function poolFor(sideDiagnostics, field) {
  return sideDiagnostics?.candidatePools?.[field] || null;
}

function candidateValues(pool) {
  return new Set((pool?.candidates || []).map((candidate) => toNumber(candidate.value)).filter((value) => value > 0));
}

function rawTextsForPool(pool) {
  const texts = [];
  for (const candidate of pool?.candidates || []) {
    if (candidate.rawText) texts.push(candidate.rawText);
    for (const contribution of candidate.contributions || []) {
      if (contribution.rawText) texts.push(contribution.rawText);
      if (contribution.rawCandidate) texts.push(contribution.rawCandidate);
    }
  }
  for (const result of Object.values(pool?.profileResults || {})) {
    if (result.rawText) texts.push(result.rawText);
    if (result.normalizedText) texts.push(result.normalizedText);
    for (const parsed of result.parsedCandidates || []) {
      if (parsed.rawCandidate) texts.push(parsed.rawCandidate);
      if (parsed.normalizedText) texts.push(parsed.normalizedText);
    }
  }
  return [...new Set(texts.filter(Boolean))];
}

function normalizeDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function rawContainsExact(pool, expectedValue) {
  const needle = String(expectedValue);
  if (!expectedValue) return false;
  return rawTextsForPool(pool).some((text) => normalizeDigits(text).includes(needle));
}

function fieldPresence(sideDiagnostics, field, expectedValue) {
  const pool = poolFor(sideDiagnostics, field);
  const candidates = candidateValues(pool);
  return {
    candidatePresent: candidates.has(expectedValue),
    rawExactPresent: rawContainsExact(pool, expectedValue),
    candidateCount: candidates.size,
    rawTextCount: rawTextsForPool(pool).length,
    zone: pool?.zone || null,
    cropQuality: pool?.cropQuality || null,
    provenance: (pool?.candidates || [])
      .filter((candidate) => toNumber(candidate.value) === expectedValue)
      .map((candidate) => ({
        value: toNumber(candidate.value),
        profileIds: candidate.profileIds || [],
        sourceRank: candidate.sourceRank ?? null,
        digitCount: candidate.digitCount ?? null,
      })),
  };
}

function wrongSlotHits(sideDiagnostics, field, expectedValue) {
  if (!field.startsWith("member")) return [];
  return memberFields
    .filter((other) => other !== field)
    .filter((other) => {
      const pool = poolFor(sideDiagnostics, other);
      return candidateValues(pool).has(expectedValue) || rawContainsExact(pool, expectedValue);
    });
}

function sidePassFromFields(fieldMap, mode) {
  return fields.every((field) => Boolean(fieldMap[field]?.[mode]));
}

function summarizeRows(rows) {
  const summary = {
    sides: rows.length,
    selectedPass: 0,
    allFieldCandidatePresent: 0,
    allFieldCandidateOrRawPresent: 0,
    fieldSelected: {},
    fieldCandidatePresent: {},
    fieldRawExactPresent: {},
    bySide: {},
    byCluster: {},
    byDigitLength: {},
    wrongSlotRows: 0,
  };
  for (const field of fields) {
    summary.fieldSelected[field] = 0;
    summary.fieldCandidatePresent[field] = 0;
    summary.fieldRawExactPresent[field] = 0;
  }
  for (const side of sides) summary.bySide[side] = { sides: 0, selectedPass: 0, allFieldCandidatePresent: 0, allFieldCandidateOrRawPresent: 0 };
  for (const row of rows) {
    summary.selectedPass += row.selectedPass ? 1 : 0;
    summary.allFieldCandidatePresent += row.architectureB.allFieldsPresent ? 1 : 0;
    summary.allFieldCandidateOrRawPresent += row.architectureE.allFieldsPresent ? 1 : 0;
    const sideBucket = summary.bySide[row.side];
    sideBucket.sides += 1;
    sideBucket.selectedPass += row.selectedPass ? 1 : 0;
    sideBucket.allFieldCandidatePresent += row.architectureB.allFieldsPresent ? 1 : 0;
    sideBucket.allFieldCandidateOrRawPresent += row.architectureE.allFieldsPresent ? 1 : 0;
    summary.byCluster[row.cluster] ||= { sides: 0, selectedPass: 0, allFieldCandidatePresent: 0, allFieldCandidateOrRawPresent: 0 };
    summary.byCluster[row.cluster].sides += 1;
    summary.byCluster[row.cluster].selectedPass += row.selectedPass ? 1 : 0;
    summary.byCluster[row.cluster].allFieldCandidatePresent += row.architectureB.allFieldsPresent ? 1 : 0;
    summary.byCluster[row.cluster].allFieldCandidateOrRawPresent += row.architectureE.allFieldsPresent ? 1 : 0;
    const memberDigitShape = row.expected.members.map((value) => String(value).length).join("/");
    summary.byDigitLength[memberDigitShape] ||= { sides: 0, selectedPass: 0, allFieldCandidatePresent: 0, allFieldCandidateOrRawPresent: 0 };
    summary.byDigitLength[memberDigitShape].sides += 1;
    summary.byDigitLength[memberDigitShape].selectedPass += row.selectedPass ? 1 : 0;
    summary.byDigitLength[memberDigitShape].allFieldCandidatePresent += row.architectureB.allFieldsPresent ? 1 : 0;
    summary.byDigitLength[memberDigitShape].allFieldCandidateOrRawPresent += row.architectureE.allFieldsPresent ? 1 : 0;
    if (row.wrongSlotHits.length) summary.wrongSlotRows += 1;
    for (const field of fields) {
      summary.fieldSelected[field] += row.fields[field].selected ? 1 : 0;
      summary.fieldCandidatePresent[field] += row.fields[field].candidatePresent ? 1 : 0;
      summary.fieldRawExactPresent[field] += row.fields[field].rawExactPresent ? 1 : 0;
    }
  }
  return summary;
}

function withPercentages(bucket) {
  return {
    ...bucket,
    selectedPct: percentage(bucket.selectedPass, bucket.sides),
    candidateAllFieldPct: percentage(bucket.allFieldCandidatePresent, bucket.sides),
    candidateOrRawAllFieldPct: percentage(bucket.allFieldCandidateOrRawPresent, bucket.sides),
  };
}

function buildScorecard(summary) {
  return [
    {
      id: "A",
      name: "Current production per-field Stage3 OCR",
      browserFeasible: true,
      extraOcrNeeded: false,
      stage3SidePass: summary.selectedPass,
      stage3SideTotal: summary.sides,
      wrongSlotRows: 0,
      selectorTp: 0,
      selectorFp: 0,
      recommendation: "Baseline only; not viable for Stage3 because selected side pass remains 0.",
    },
    {
      id: "B",
      name: "Per-slot enlarged OCR, slot identity preserved",
      browserFeasible: true,
      extraOcrNeeded: true,
      currentEvidenceUpperBound: summary.allFieldCandidatePresent,
      wrongSlotRows: summary.wrongSlotRows,
      recommendation:
        "Promising only if a new browser OCR pass materially improves slot-proven candidate presence; current candidate pools are insufficient.",
    },
    {
      id: "C",
      name: "Full Stage3 member-row OCR with bbox ordering",
      browserFeasible: "requires word/bbox export",
      extraOcrNeeded: true,
      currentEvidenceUpperBound: null,
      wrongSlotRows: null,
      recommendation:
        "Needs browser-native word/bbox capture before safety can be measured; string-only row evidence is not production-ready.",
    },
    {
      id: "D",
      name: "Full-side OCR with geometry field separation",
      browserFeasible: "requires full-side OCR diagnostics",
      extraOcrNeeded: true,
      currentEvidenceUpperBound: null,
      wrongSlotRows: null,
      recommendation:
        "Worth comparing after bbox/token export, especially for total capture, but cannot be scored from current artifacts.",
    },
    {
      id: "E",
      name: "Multi-pass consensus over slot-proven candidate/raw evidence",
      browserFeasible: true,
      extraOcrNeeded: false,
      currentEvidenceUpperBound: summary.allFieldCandidateOrRawPresent,
      wrongSlotRows: summary.wrongSlotRows,
      recommendation:
        "Raw exact evidence adds diagnostic signal but does not yet meet production readiness because wrong-slot/ambiguity rows remain.",
    },
    {
      id: "F",
      name: "Hybrid slot-intersection for merged runs",
      browserFeasible: "requires OCR word/bbox geometry",
      extraOcrNeeded: true,
      currentEvidenceUpperBound: null,
      wrongSlotRows: null,
      recommendation:
        "Potential Stage3 v2 direction, but first needs word/bbox evidence and a fresh two-run browser stability check.",
    },
  ];
}

async function main() {
  const manifest = await loadJson(path.join(expectedDir, "manifest.json"));
  const fixtures = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    fixtures.push({
      ...entry,
      expected: await loadJson(path.join(expectedDir, entry.expectedFixture || entry.filename.replace(/\.png$/i, ".json"))),
    });
  }

  const rows = [];
  const missingDiagnostics = [];
  for (const fixture of fixtures) {
    const resultPath = path.join(baselineDir, fixture.filename, "production-result.json");
    let result;
    try {
      result = await loadJson(resultPath);
    } catch {
      missingDiagnostics.push(fixture.filename);
      continue;
    }
    const diagnostics = extractBalancedJson(
      result.ocrText || "",
      '{"schema":"ipad-arithmetic-browser-diagnostics-v1"'
    );
    if (!diagnostics) {
      missingDiagnostics.push(fixture.filename);
      continue;
    }
    for (const stage of stages) {
      for (const side of sides) {
        const expected = expectedSide(fixture.expected[`stage${stage}`], side);
        const actual = actualSide(result.perSide || [], stage, side);
        const sideDiagnostics = diagnostics.stages?.[`stage${stage}`]?.[side] || {};
        const fieldMap = {};
        const wrongSlot = [];
        for (const field of fields) {
          const expectedValue = fieldExpectedValue(expected, field);
          const presence = fieldPresence(sideDiagnostics, field, expectedValue);
          const selected = fieldActualValue(actual, field) === expectedValue;
          const wrongSlots = wrongSlotHits(sideDiagnostics, field, expectedValue);
          if (wrongSlots.length) wrongSlot.push({ field, expectedValue, wrongSlots });
          fieldMap[field] = {
            expected: expectedValue,
            actual: fieldActualValue(actual, field),
            selected,
            ...presence,
            wrongSlots,
          };
        }
        rows.push({
          image: fixture.filename,
          cluster: fixture.clusterId,
          stage,
          side,
          expected,
          actual,
          selectedPass: fields.every((field) => fieldMap[field].selected),
          wrongFieldCount: fields.filter((field) => !fieldMap[field].selected).length,
          fields: fieldMap,
          wrongSlotHits: wrongSlot,
          architectureB: {
            name: "per-slot-current-candidate-union",
            allFieldsPresent: sidePassFromFields(fieldMap, "candidatePresent"),
          },
          architectureE: {
            name: "slot-proven-candidate-or-raw-exact-union",
            allFieldsPresent: fields.every(
              (field) => fieldMap[field].candidatePresent || fieldMap[field].rawExactPresent
            ),
          },
        });
      }
    }
  }

  const summary = summarizeRows(rows);
  const scorecard = buildScorecard(summary);
  const recommendation =
    summary.selectedPass === 0 && summary.allFieldCandidatePresent < 8
      ? "C. Current Stage3 browser evidence is too weak for another selector; add browser-native word/bbox/full-side OCR diagnostics or evaluate a different OCR engine/model."
      : "A. A bounded Stage3 v2 parity phase may be justified only for an architecture with zero wrong-slot rows and at least eight Stage3 side gains.";

  const artifacts = {
    baseline: {
      fixtureCount: fixtures.length,
      missingDiagnostics,
      stage3Sides: rows.length,
      currentStage3Pass: summary.selectedPass,
      expectedStage3Pass: 0,
      currentProductionTpFpFromExpandedBaseline: "81 / 0",
    },
    summary: {
      ...summary,
      bySide: Object.fromEntries(Object.entries(summary.bySide).map(([key, value]) => [key, withPercentages(value)])),
      byCluster: Object.fromEntries(Object.entries(summary.byCluster).map(([key, value]) => [key, withPercentages(value)])),
      byDigitLength: Object.fromEntries(
        Object.entries(summary.byDigitLength).map(([key, value]) => [key, withPercentages(value)])
      ),
    },
    scorecard,
    recommendation,
  };

  await writeJson("baseline.json", artifacts.baseline);
  await writeJson("stage3-field-matrix.json", rows);
  await writeJson("architecture-definitions.json", scorecard);
  await writeJson("raw-candidate-results.json", rows.map(({ image, cluster, side, fields: fieldRows }) => ({ image, cluster, side, fields: fieldRows })));
  await writeJson("slot-assignment.json", rows.map(({ image, side, wrongSlotHits }) => ({ image, stage: 3, side, wrongSlotHits })));
  await writeJson("candidate-noise.json", {
    wrongSlotRows: summary.wrongSlotRows,
    wrongSlotDetails: rows.filter((row) => row.wrongSlotHits.length).map(({ image, side, wrongSlotHits }) => ({ image, stage: 3, side, wrongSlotHits })),
  });
  await writeJson("selector-simulations.json", {
    note: "No production selector was changed. Current Tier C / strict-total / strict-member2 semantics were not rerun with new OCR evidence because no new browser OCR architecture produced safe candidate pools in this task.",
    architectureBUpperBoundSides: summary.allFieldCandidatePresent,
    architectureEUpperBoundSides: summary.allFieldCandidateOrRawPresent,
    fp: 0,
  });
  await writeJson("upper-bounds.json", {
    currentSelected: summary.selectedPass,
    perSlotCandidateUnion: summary.allFieldCandidatePresent,
    slotProvenCandidateOrRawExactUnion: summary.allFieldCandidateOrRawPresent,
    totalSides: summary.sides,
  });
  await writeJson("runtime.json", {
    source: "cached expanded browser baseline diagnostics",
    extraOcrCalls: 0,
    note: "Architecture C/D/F require a future browser run with word/bbox or full-side OCR export.",
  });
  await writeJson("run-stability.json", {
    baselineSource: "tmp/ipad-expanded-baseline/run-1",
    secondFreshRun: "not-run; no architecture met the threshold for a two-run stability pass",
  });
  await writeJson("architecture-scorecard.json", scorecard);
  await writeJson("pending-stage3-stress-subset.json", {
    recommendation: "Select 10-15 pending screenshots only after adding word/bbox/full-side Stage3 diagnostics; use them for geometry/noise stability, not accuracy.",
    pendingCount: (manifest.images || []).filter((entry) => entry.expectedStatus !== "complete").length,
  });
  await writeJson("recommendation.json", { recommendation });

  console.log(
    JSON.stringify(
      {
        ipadStage3V2ArchitectureInvestigation: {
          artifactDir: path.relative(rootDir, artifactDir).replaceAll("\\", "/"),
          fixtures: fixtures.length,
          stage3Sides: rows.length,
          currentStage3Pass: `${summary.selectedPass} / ${summary.sides}`,
          perSlotCandidateUnionUpperBound: `${summary.allFieldCandidatePresent} / ${summary.sides}`,
          slotProvenCandidateOrRawExactUpperBound: `${summary.allFieldCandidateOrRawPresent} / ${summary.sides}`,
          fieldCandidatePresence: summary.fieldCandidatePresent,
          fieldRawExactPresence: summary.fieldRawExactPresent,
          wrongSlotRows: summary.wrongSlotRows,
          recommendation,
        },
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
