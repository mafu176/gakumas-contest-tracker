import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const expectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const baselineDir = path.join(rootDir, "tmp", "ipad-expanded-baseline", "run-1");
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-fullside-wordbox");

const stage = 3;
const sides = ["self", "enemy"];
const memberFields = ["member1", "member2", "member3"];
const fields = [...memberFields, "bonus", "total"];
const diagnosticMarker = '{"schema":"ipad-arithmetic-browser-diagnostics-v1"';

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function pct(pass, total) {
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

function actualSide(perSide, side) {
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

function rectUnion(rects) {
  const valid = rects.filter(Boolean);
  if (!valid.length) return null;
  const left = Math.min(...valid.map((rect) => rect.x));
  const top = Math.min(...valid.map((rect) => rect.y));
  const right = Math.max(...valid.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...valid.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function normalizeRect(rect, image) {
  if (!rect || !image?.width || !image?.height) return null;
  return {
    left: Number((rect.x / image.width).toFixed(6)),
    top: Number((rect.y / image.height).toFixed(6)),
    width: Number((rect.width / image.width).toFixed(6)),
    height: Number((rect.height / image.height).toFixed(6)),
  };
}

function poolFor(sideDiagnostics, field) {
  return sideDiagnostics?.candidatePools?.[field] || null;
}

function rawTextsForPool(pool) {
  const texts = [];
  for (const candidate of pool?.candidates || []) {
    if (candidate.rawText) texts.push({ source: "candidate.rawText", text: candidate.rawText, profileId: candidate.profileId || null });
    if (candidate.normalizedText) {
      texts.push({ source: "candidate.normalizedText", text: candidate.normalizedText, profileId: candidate.profileId || null });
    }
    for (const contribution of candidate.contributions || []) {
      if (contribution.rawText) {
        texts.push({ source: "contribution.rawText", text: contribution.rawText, profileId: contribution.profileId || null });
      }
      if (contribution.rawCandidate) {
        texts.push({
          source: "contribution.rawCandidate",
          text: contribution.rawCandidate,
          profileId: contribution.profileId || null,
        });
      }
      if (contribution.normalizedText) {
        texts.push({
          source: "contribution.normalizedText",
          text: contribution.normalizedText,
          profileId: contribution.profileId || null,
        });
      }
    }
  }
  for (const [profileId, result] of Object.entries(pool?.profileResults || {})) {
    if (result.rawText) texts.push({ source: "profile.rawText", text: result.rawText, profileId });
    if (result.normalizedText) texts.push({ source: "profile.normalizedText", text: result.normalizedText, profileId });
    for (const parsed of result.parsedCandidates || []) {
      if (parsed.rawCandidate) texts.push({ source: "profile.parsed.rawCandidate", text: parsed.rawCandidate, profileId });
      if (parsed.normalizedText) {
        texts.push({ source: "profile.parsed.normalizedText", text: parsed.normalizedText, profileId });
      }
    }
  }
  const seen = new Set();
  return texts.filter((entry) => {
    const key = `${entry.source}|${entry.profileId || ""}|${entry.text}`;
    if (!entry.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractNumericTokens(text) {
  const tokens = [];
  const patterns = [
    { kind: "strict-grouped", regex: /\b\d{1,3}(?:[,.]\d{3})+\b/g },
    { kind: "space-grouped", regex: /\b\d{1,3}(?:\s+\d{3})+\b/g },
    { kind: "contiguous-digits", regex: /\b\d{2,8}\b/g },
  ];
  const seen = new Set();
  for (const { kind, regex } of patterns) {
    for (const match of text.matchAll(regex)) {
      const raw = match[0];
      const normalized = raw.replace(/\D/g, "");
      if (!normalized) continue;
      const key = `${kind}|${match.index}|${raw}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tokens.push({
        kind,
        raw,
        normalized,
        value: toNumber(normalized),
        start: match.index,
        end: match.index + raw.length,
      });
    }
  }
  return tokens;
}

function candidateValues(pool) {
  return new Set((pool?.candidates || []).map((candidate) => toNumber(candidate.value)).filter((value) => value > 0));
}

function buildSlotProvenTokens(image, side, field, pool) {
  const zone = pool?.zone || null;
  const tokenRows = [];
  for (const textEntry of rawTextsForPool(pool)) {
    for (const token of extractNumericTokens(textEntry.text)) {
      tokenRows.push({
        image,
        stage,
        side,
        field,
        assignmentTier: zone ? "A1-field-crop-provenance" : "blocked-no-field-zone",
        architectureSource: "existing-field-crop-raw-text",
        zone,
        token,
        profileId: textEntry.profileId,
        rawTextSource: textEntry.source,
        rawText: textEntry.text,
      });
    }
  }
  return tokenRows;
}

function buildArchitectureDefinitions(firstDiagnostics, firstImage) {
  const template = firstDiagnostics?.template || {};
  const definitions = [];
  const stageRow = template.stageRows?.find((row) => row.stage === stage)?.zone || null;
  const sideZones = Object.fromEntries(
    (template.stageSideZones || []).filter((row) => row.stage === stage).map((row) => [row.side, row.zone])
  );
  for (const side of sides) {
    const sideDiagnostics = firstDiagnostics.stages?.stage3?.[side] || {};
    const fieldZones = Object.fromEntries(fields.map((field) => [field, poolFor(sideDiagnostics, field)?.zone || null]));
    const memberRow = rectUnion(memberFields.map((field) => fieldZones[field]));
    const fullSide = rectUnion(fields.map((field) => fieldZones[field]));
    definitions.push({
      architecture: "F1",
      name: "Full Stage3 member row",
      stage,
      side,
      roi: memberRow,
      normalizedRoi: normalizeRect(memberRow, firstImage),
      slotBoundaries: Object.fromEntries(memberFields.map((field) => [field, fieldZones[field]])),
      status: "defined-not-executed-no-browser-fullside-wordbox-export",
    });
    definitions.push({
      architecture: "F2",
      name: "Full Stage3 side",
      stage,
      side,
      roi: fullSide || sideZones[side],
      normalizedRoi: normalizeRect(fullSide || sideZones[side], firstImage),
      slotBoundaries: fieldZones,
      status: "defined-not-executed-no-browser-fullside-wordbox-export",
    });
  }
  definitions.push({
    architecture: "F3",
    name: "Full Stage3 result row",
    stage,
    side: "both",
    roi: stageRow,
    normalizedRoi: normalizeRect(stageRow, firstImage),
    selfEnemySplit: sideZones,
    status: "defined-not-executed-no-browser-fullside-wordbox-export",
  });
  return definitions;
}

function summarize(rows) {
  const summary = {
    stage3Sides: rows.length,
    selectedPass: 0,
    fieldCandidatePresence: {},
    fieldLiteralTokenPresence: {},
    all3MembersCandidatePresence: 0,
    all3MembersLiteralTokenPresence: 0,
    all5FieldCandidatePresence: 0,
    all5FieldLiteralTokenPresence: 0,
    wrongSlotRows: 0,
    ambiguousAssignments: 0,
    multiFieldSpans: 0,
    unassignedTokens: 0,
  };
  for (const field of fields) {
    summary.fieldCandidatePresence[field] = 0;
    summary.fieldLiteralTokenPresence[field] = 0;
  }
  for (const row of rows) {
    summary.selectedPass += row.selectedPass ? 1 : 0;
    summary.wrongSlotRows += row.wrongSlotHits.length ? 1 : 0;
    const candidateAllMembers = memberFields.every((field) => row.fields[field].candidatePresent);
    const tokenAllMembers = memberFields.every((field) => row.fields[field].literalTokenPresent);
    const candidateAllFields = fields.every((field) => row.fields[field].candidatePresent);
    const tokenAllFields = fields.every((field) => row.fields[field].literalTokenPresent);
    summary.all3MembersCandidatePresence += candidateAllMembers ? 1 : 0;
    summary.all3MembersLiteralTokenPresence += tokenAllMembers ? 1 : 0;
    summary.all5FieldCandidatePresence += candidateAllFields ? 1 : 0;
    summary.all5FieldLiteralTokenPresence += tokenAllFields ? 1 : 0;
    for (const field of fields) {
      summary.fieldCandidatePresence[field] += row.fields[field].candidatePresent ? 1 : 0;
      summary.fieldLiteralTokenPresence[field] += row.fields[field].literalTokenPresent ? 1 : 0;
    }
  }
  return summary;
}

function scorecard(summary) {
  const unavailable = {
    exactMember1Gain: 0,
    exactMember2Gain: 0,
    exactMember3Gain: 0,
    exactBonusGain: 0,
    exactTotalGain: 0,
    stage3PassGain: 0,
    selectorTp: 0,
    selectorFp: 0,
    wrongSlot: "not-measurable-without-word-bboxes",
    ambiguous: "not-measurable-without-word-bboxes",
    runtime: "not-run",
    recommendation: "Blocked until browser diagnostics export full-side OCR word/symbol bbox hierarchy.",
  };
  return [
    {
      architecture: "current-field-crops",
      member1: `${summary.fieldCandidatePresence.member1} / ${summary.stage3Sides}`,
      member2: `${summary.fieldCandidatePresence.member2} / ${summary.stage3Sides}`,
      member3: `${summary.fieldCandidatePresence.member3} / ${summary.stage3Sides}`,
      bonus: `${summary.fieldCandidatePresence.bonus} / ${summary.stage3Sides}`,
      total: `${summary.fieldCandidatePresence.total} / ${summary.stage3Sides}`,
      stage3Pass: `${summary.selectedPass} / ${summary.stage3Sides}`,
      wrongSlot: summary.wrongSlotRows,
      recommendation: "Baseline only; Stage3 remains 0 / 76.",
    },
    {
      architecture: "slot-proven-literal-token-from-existing-field-raw",
      member1: `${summary.fieldLiteralTokenPresence.member1} / ${summary.stage3Sides}`,
      member2: `${summary.fieldLiteralTokenPresence.member2} / ${summary.stage3Sides}`,
      member3: `${summary.fieldLiteralTokenPresence.member3} / ${summary.stage3Sides}`,
      bonus: `${summary.fieldLiteralTokenPresence.bonus} / ${summary.stage3Sides}`,
      total: `${summary.fieldLiteralTokenPresence.total} / ${summary.stage3Sides}`,
      fullSideEvidence: `${summary.all5FieldLiteralTokenPresence} / ${summary.stage3Sides}`,
      wrongSlot: summary.wrongSlotRows,
      recommendation: "Diagnostic-only upper bound from existing raw field text; no new full-side OCR evidence.",
    },
    { architecture: "F1-full-stage3-member-row", ...unavailable },
    { architecture: "F2-full-stage3-side", ...unavailable },
    { architecture: "F3-full-stage3-result-row", ...unavailable },
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
  const tokenCandidates = [];
  const rawOcr = [];
  const missingDiagnostics = [];
  let firstDiagnostics = null;
  let firstImage = null;

  for (const fixture of fixtures) {
    const resultPath = path.join(baselineDir, fixture.filename, "production-result.json");
    let result;
    try {
      result = await loadJson(resultPath);
    } catch {
      missingDiagnostics.push({ image: fixture.filename, reason: "missing-production-result" });
      continue;
    }
    const diagnostics = extractBalancedJson(result.ocrText || "", diagnosticMarker);
    if (!diagnostics) {
      missingDiagnostics.push({ image: fixture.filename, reason: "missing-browser-diagnostics-json" });
      continue;
    }
    if (!firstDiagnostics) {
      firstDiagnostics = diagnostics;
      firstImage = diagnostics.image || null;
    }

    for (const side of sides) {
      const expected = expectedSide(fixture.expected.stage3, side);
      const actual = actualSide(result.perSide || [], side);
      const sideDiagnostics = diagnostics.stages?.stage3?.[side] || {};
      const fieldMap = {};
      const wrongSlotHits = [];

      for (const field of fields) {
        const expectedValue = fieldExpectedValue(expected, field);
        const actualValue = fieldActualValue(actual, field);
        const pool = poolFor(sideDiagnostics, field);
        const candidates = candidateValues(pool);
        const slotTokens = buildSlotProvenTokens(fixture.filename, side, field, pool);
        tokenCandidates.push(...slotTokens);
        rawOcr.push({
          image: fixture.filename,
          stage,
          side,
          field,
          zone: pool?.zone || null,
          rawTexts: rawTextsForPool(pool),
          candidateValues: [...candidates],
        });

        const literalTokenPresent = slotTokens.some((candidate) => candidate.token.value === expectedValue);
        const candidatePresent = candidates.has(expectedValue);
        if (field.startsWith("member")) {
          for (const otherField of memberFields.filter((other) => other !== field)) {
            const otherPool = poolFor(sideDiagnostics, otherField);
            const otherValues = candidateValues(otherPool);
            if (otherValues.has(expectedValue)) wrongSlotHits.push({ field, value: expectedValue, foundIn: otherField });
          }
        }
        fieldMap[field] = {
          expected: expectedValue,
          actual: actualValue,
          selected: actualValue === expectedValue,
          candidatePresent,
          literalTokenPresent,
          candidateCount: candidates.size,
          literalTokenCount: slotTokens.length,
          zone: pool?.zone || null,
        };
      }

      rows.push({
        image: fixture.filename,
        cluster: fixture.clusterId || null,
        stage,
        side,
        expected,
        actual,
        selectedPass: fields.every((field) => fieldMap[field].selected),
        fields: fieldMap,
        wrongSlotHits,
      });
    }
  }

  const summary = summarize(rows);
  const definitions = firstDiagnostics ? buildArchitectureDefinitions(firstDiagnostics, firstImage) : [];
  const architectureScorecard = scorecard(summary);
  const member2Audit = rows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    expected: row.fields.member2.expected,
    actual: row.fields.member2.actual,
    selected: row.fields.member2.selected,
    currentCandidatePresent: row.fields.member2.candidatePresent,
    existingRawLiteralTokenPresent: row.fields.member2.literalTokenPresent,
    fullsideArchitectureEvidence: "not-available-no-word-bbox-export",
  }));
  const member3Audit = rows.map((row) => ({
    image: row.image,
    stage: row.stage,
    side: row.side,
    expected: row.fields.member3.expected,
    actual: row.fields.member3.actual,
    selected: row.fields.member3.selected,
    currentCandidatePresent: row.fields.member3.candidatePresent,
    existingRawLiteralTokenPresent: row.fields.member3.literalTokenPresent,
    fullsideArchitectureEvidence: "not-available-no-word-bbox-export",
  }));

  const baseline = {
    source: path.relative(rootDir, baselineDir).replaceAll("\\", "/"),
    fixtures: fixtures.length,
    stageSides: fixtures.length * 3 * 2,
    stageSidePass: "112 / 228",
    productionRecoveries: "81 TP / 0 FP",
    stage3Sides: rows.length,
    stage3Pass: `${summary.selectedPass} / ${summary.stage3Sides}`,
    missingDiagnostics,
  };
  const hierarchy = {
    available: ["field candidate pools", "field crop zones", "field/profile raw text", "profile parsed candidates"],
    unavailable: ["new full-side OCR calls", "word bbox", "symbol bbox", "line bbox", "baseline geometry"],
    consequence:
      "F1/F2/F3 ROI definitions can be generated, but their token/bbox gain cannot be scored until browser diagnostics export OCR hierarchy for those ROIs.",
  };
  const selectorSimulation = {
    status: "not-run-no-new-fullside-candidates",
    tierC: { tp: 0, fp: 0 },
    strictTotal: { tp: 0, fp: 0 },
    strictMember2: { tp: 0, fp: 0 },
    stage3PassGain: 0,
    existingPassLosses: 0,
    note: "Selector semantics were intentionally unchanged. No candidate-pool expansion was simulated because F1/F2/F3 produced no measured browser wordbox candidates in current artifacts.",
  };
  const upperBounds = {
    currentSelectorStage3Pass: `${summary.selectedPass} / ${summary.stage3Sides}`,
    currentCandidatePresence: summary.fieldCandidatePresence,
    existingFieldRawLiteralTokenPresence: summary.fieldLiteralTokenPresence,
    all3MembersCurrentCandidatePresence: `${summary.all3MembersCandidatePresence} / ${summary.stage3Sides}`,
    all3MembersExistingRawLiteralTokenPresence: `${summary.all3MembersLiteralTokenPresence} / ${summary.stage3Sides}`,
    all5FieldsCurrentCandidatePresence: `${summary.all5FieldCandidatePresence} / ${summary.stage3Sides}`,
    all5FieldsExistingRawLiteralTokenPresence: `${summary.all5FieldLiteralTokenPresence} / ${summary.stage3Sides}`,
    f1f2f3PerfectSelectionOracle: "not-measurable-until-wordbox-export",
  };
  const recommendation = {
    viable: false,
    reason:
      "The current browser-native diagnostics do not expose full-side OCR word/symbol bounding boxes, and existing field-level raw token evidence still leaves member2/member3 at zero exact presence.",
    nextStep:
      "Add a developer-only browser OCR hierarchy export for F1/F2/F3 ROI calls, or move to an alternate OCR engine/model for Stage3 digit capture instead of another selector.",
  };

  await writeJson("baseline.json", baseline);
  await writeJson("architecture-definitions.json", definitions);
  await writeJson("crop-geometry.json", definitions.map(({ architecture, stage: rowStage, side, roi, normalizedRoi, slotBoundaries, selfEnemySplit }) => ({ architecture, stage: rowStage, side, roi, normalizedRoi, slotBoundaries, selfEnemySplit })));
  await writeJson("raw-ocr.json", rawOcr);
  await writeJson("word-bboxes.json", { status: "unavailable", hierarchy });
  await writeJson("token-candidates.json", tokenCandidates);
  await writeJson("slot-assignment.json", {
    assignmentTiers: {
      A1: "token source is an existing field crop with a fixed field zone",
      A2: "requires word bbox center/overlap; unavailable",
      A3: "requires separated sub-token bboxes; unavailable",
      A4: "ambiguous; blocked",
    },
    wrongSlotRows: summary.wrongSlotRows,
    rows: rows.map(({ image, side, wrongSlotHits }) => ({ image, stage, side, wrongSlotHits })),
  });
  await writeJson("member2-audit.json", member2Audit);
  await writeJson("member3-audit.json", member3Audit);
  await writeJson("selector-simulation.json", selectorSimulation);
  await writeJson("upper-bounds.json", upperBounds);
  await writeJson("architecture-scorecard.json", architectureScorecard);
  await writeJson("run-stability.json", {
    status: "not-run",
    reason: "No F1/F2/F3 architecture produced measurable wordbox candidates from current diagnostics.",
    baselineRun: "tmp/ipad-expanded-baseline/run-1",
  });
  await writeJson("pending-stress-tests.json", {
    status: "not-run",
    reason: "Pending screenshots should be used after F1/F2/F3 wordbox export exists; unlabeled stress testing cannot score accuracy.",
  });
  await writeJson("recommendation.json", recommendation);

  console.log(
    JSON.stringify(
      {
        ipadStage3FullsideWordboxInvestigation: {
          artifactDir: path.relative(rootDir, artifactDir).replaceAll("\\", "/"),
          baseline,
          hierarchy,
          currentCandidatePresence: summary.fieldCandidatePresence,
          existingFieldRawLiteralTokenPresence: summary.fieldLiteralTokenPresence,
          all3MembersCurrentCandidatePresence: `${summary.all3MembersCandidatePresence} / ${summary.stage3Sides}`,
          all3MembersExistingRawLiteralTokenPresence: `${summary.all3MembersLiteralTokenPresence} / ${summary.stage3Sides}`,
          wrongSlotRows: summary.wrongSlotRows,
          selectorSimulation,
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
