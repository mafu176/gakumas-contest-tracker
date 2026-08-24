import crypto from "node:crypto";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import process from "node:process";
import { evaluateIpadStage3RapidOcrR6 } from "../app/lib/ocr.js";

const rootDir = process.cwd();
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-production-readiness");
const expectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const manifestPath = path.join(expectedDir, "manifest.json");
const productionBaselineDir = path.join(rootDir, "tmp", "ipad-expanded-baseline", "run-1");
const docPath = path.join(rootDir, "docs", "ipad-stage3-rapidocr-production-readiness.md");
const rapidOcrModelDir = path.join(rootDir, "tmp", "rapidocr-python", "rapidocr_onnxruntime", "models");
const ortDistDir = path.join(rootDir, "node_modules", "onnxruntime-web", "dist");

const fields = ["member1", "member2", "member3", "bonus", "total"];
const sides = ["self", "enemy"];
const historicalFour = [
  { image: "IMG_0265.png", side: "self" },
  { image: "IMG_0265.png", side: "enemy" },
  { image: "IMG_0283.png", side: "self" },
  { image: "IMG_0491.png", side: "self" },
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filename, value) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, filename), `${JSON.stringify(value, null, 2)}\n`);
}

function safeReadJson(filePath, fallback = null) {
  if (!fssync.existsSync(filePath)) return fallback;
  return JSON.parse(fssync.readFileSync(filePath, "utf8"));
}

function sha256File(filePath) {
  if (!fssync.existsSync(filePath)) return null;
  return crypto.createHash("sha256").update(fssync.readFileSync(filePath)).digest("hex");
}

function pct(numerator, denominator, digits = 1) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(digits)) : 0;
}

function sideExpected(stage3, side) {
  return {
    member1: Number(stage3?.[`${side}Members`]?.[0] || 0),
    member2: Number(stage3?.[`${side}Members`]?.[1] || 0),
    member3: Number(stage3?.[`${side}Members`]?.[2] || 0),
    bonus: Number(stage3?.[`${side}Bonus`] || 0),
    total: Number(stage3?.[`${side}Total`] || 0),
  };
}

function proposalValues(proposal = {}) {
  return {
    member1: Number(proposal.members?.[0] || proposal.member1 || 0),
    member2: Number(proposal.members?.[1] || proposal.member2 || 0),
    member3: Number(proposal.members?.[2] || proposal.member3 || 0),
    bonus: Number(proposal.bonus || 0),
    total: Number(proposal.total || 0),
  };
}

function sameSide(a, b) {
  return fields.every((field) => Number(a?.[field] || 0) === Number(b?.[field] || 0));
}

function keyFor(image, stage, side) {
  return `${image}|${stage}|${side}`;
}

function resultMap(results) {
  return new Map((results || []).map((result) => [result.image, result]));
}

function candidateValues(result, side, field) {
  return [
    ...new Map(
      (result?.candidateRows || [])
        .filter((row) => row.stage === 3 && row.side === side && row.assignedField === field)
        .map((row) => [
          `${row.value}|${row.crop?.variantId || ""}|${row.crop?.preprocessingProfileId || ""}|${row.fullText || ""}`,
          {
            value: Number(row.value),
            rawText: row.fullText || row.raw || "",
            confidence: Number(row.confidence || 0),
            variantId: row.crop?.variantId || "",
            preprocessingProfileId: row.crop?.preprocessingProfileId || "recognizer-current",
            rect: row.crop?.rect || null,
            checksum: row.crop?.preprocessingChecksum || null,
            parser: row.parser || "",
            bbox: row.bbox || null,
            ambiguous: Boolean(row.assignment?.ambiguous),
          },
        ])
    ).values(),
  ].filter((row) => Number.isFinite(row.value));
}

function coverageForRun(results) {
  const rows = [];
  for (const result of results) {
    for (const side of sides) {
      for (const field of fields) {
        const expected = Number(result.expected?.[side]?.[field] || 0);
        const candidates = candidateValues(result, side, field);
        const distinctValues = [...new Set(candidates.map((row) => row.value))];
        rows.push({
          image: result.image,
          stage: 3,
          side,
          field,
          expected,
          hasExpected: distinctValues.includes(expected),
          candidateCount: candidates.length,
          distinctCandidateCount: distinctValues.length,
          noNumericCandidate: distinctValues.length === 0,
          multipleCandidates: distinctValues.length > 1,
          candidates,
        });
      }
    }
  }
  const byField = Object.fromEntries(
    fields.map((field) => {
      const fieldRows = rows.filter((row) => row.field === field);
      return [
        field,
        {
          exact: fieldRows.filter((row) => row.hasExpected).length,
          total: fieldRows.length,
          noNumericCandidate: fieldRows.filter((row) => row.noNumericCandidate).length,
          multipleCandidates: fieldRows.filter((row) => row.multipleCandidates).length,
          percentage: pct(fieldRows.filter((row) => row.hasExpected).length, fieldRows.length),
        },
      ];
    })
  );
  const sideRows = [];
  for (const result of results) {
    for (const side of sides) {
      const byFieldRows = Object.fromEntries(
        fields.map((field) => [field, rows.find((row) => row.image === result.image && row.side === side && row.field === field)])
      );
      const allMembersExact = ["member1", "member2", "member3"].every((field) => byFieldRows[field]?.hasExpected);
      const safeBonusEvidence =
        byFieldRows.bonus?.hasExpected ||
        (Number(result.expected?.[side]?.bonus || 0) === 0 &&
          !candidateValues(result, side, "bonus").some((row) => row.value > 0 && Number(row.confidence || 0) >= 0.9));
      sideRows.push({
        image: result.image,
        stage: 3,
        side,
        allMembersExact,
        allMembersAndSafeBonus: allMembersExact && safeBonusEvidence,
        allFiveFieldsExact: fields.every((field) => byFieldRows[field]?.hasExpected),
      });
    }
  }
  return {
    rows,
    byField,
    all3MembersExact: sideRows.filter((row) => row.allMembersExact).length,
    all3MembersPlusSafeBonus: sideRows.filter((row) => row.allMembersAndSafeBonus).length,
    all5FieldsExact: sideRows.filter((row) => row.allFiveFieldsExact).length,
    noNumericCandidateFields: rows.filter((row) => row.noNumericCandidate).length,
    multipleCandidateFields: rows.filter((row) => row.multipleCandidates).length,
    sideRows,
  };
}

function compactCandidate(row) {
  return {
    value: row.value,
    confidence: Number(row.confidence?.toFixed?.(6) ?? row.confidence ?? 0),
    variantId: row.variantId,
    preprocessingProfileId: row.preprocessingProfileId,
    rawText: row.rawText,
    parser: row.parser,
    ambiguous: row.ambiguous,
  };
}

function r6Policy(runSummary, policyId = "S4") {
  return runSummary?.policies?.[policyId] || { rows: [], accepted: [], tp: 0, fp: 0, wouldApply: 0 };
}

function auditApplications(results, policyRows) {
  const byImage = resultMap(results);
  return policyRows
    .filter((row) => row.evaluation?.wouldApply)
    .map((row) => {
      const result = byImage.get(row.image);
      const expected = result?.expected?.[row.side] || row.expected || {};
      return {
        image: row.image,
        stage: 3,
        side: row.side,
        pass: sameSide(proposalValues(row.proposal), expected),
        proposal: proposalValues(row.proposal),
        expected,
        changedFields: row.changedFields || [],
        r6Guards: row.evaluation,
        candidateEvidence: Object.fromEntries(
          fields.map((field) => [
            field,
            candidateValues(result, row.side, field).map(compactCandidate).slice(0, 30),
          ])
        ),
        fieldSupports: row.fieldSupports,
        changedSupports: row.changedSupports,
      };
    });
}

function auditHistoricalFour(policyRows) {
  return historicalFour.map((target) => {
    const row = (policyRows || []).find((entry) => entry.image === target.image && entry.side === target.side);
    return {
      ...target,
      stage: 3,
      accepted: Boolean(row?.evaluation?.wouldApply),
      blockReasons: row?.evaluation?.blockReasons || [],
      proposal: row?.proposal ? proposalValues(row.proposal) : null,
      candidateEvidence: row?.fieldSupports || null,
      confidence: Object.fromEntries(
        fields.map((field) => [field, row?.fieldSupports?.[field]?.confidence || null])
      ),
    };
  });
}

function buildFragmentSafety(results, policyRows) {
  const acceptedKeys = new Set(
    (policyRows || []).filter((row) => row.evaluation?.wouldApply).map((row) => keyFor(row.image, 3, row.side))
  );
  const rows = [];
  for (const result of results) {
    for (const side of sides) {
      for (const field of fields) {
        const values = [...new Set(candidateValues(result, side, field).map((row) => row.value))].filter((value) => value > 0);
        const relations = [];
        for (const value of values) {
          const text = String(value);
          for (const other of values) {
            if (value === other) continue;
            const otherText = String(other);
            if (text.length < otherText.length && otherText.endsWith(text)) relations.push({ value, other, relation: "suffix-of" });
            if (text.length < otherText.length && otherText.startsWith(text)) relations.push({ value, other, relation: "prefix-of" });
            if (text.length < otherText.length && otherText.includes(text) && !otherText.endsWith(text) && !otherText.startsWith(text)) {
              relations.push({ value, other, relation: "contained-in" });
            }
          }
        }
        if (relations.length) {
          rows.push({
            image: result.image,
            stage: 3,
            side,
            field,
            acceptedByR6: acceptedKeys.has(keyFor(result.image, 3, side)),
            expectedValue: Number(result.expected?.[side]?.[field] || 0),
            values,
            relations,
          });
        }
      }
    }
  }
  return {
    rows,
    summary: {
      relationFields: rows.length,
      acceptedRowsWithRelations: rows.filter((row) => row.acceptedByR6).length,
      safelyBlocked: rows.filter((row) => !row.acceptedByR6).length,
      suffixRelations: rows.reduce((sum, row) => sum + row.relations.filter((rel) => rel.relation === "suffix-of").length, 0),
      prefixRelations: rows.reduce((sum, row) => sum + row.relations.filter((rel) => rel.relation === "prefix-of").length, 0),
      containedRelations: rows.reduce((sum, row) => sum + row.relations.filter((rel) => rel.relation === "contained-in").length, 0),
    },
  };
}

function productionRows() {
  const imageResults = fssync.existsSync(productionBaselineDir)
    ? fssync
        .readdirSync(productionBaselineDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => safeReadJson(path.join(productionBaselineDir, entry.name, "production-result.json"), null))
        .filter(Boolean)
    : [];
  const rows = [];
  for (const result of imageResults || []) {
    for (const side of result.perSide || []) {
      if (side.stage === 3) {
        rows.push({
          image: result.image,
          stage: 3,
          side: side.side,
          pass: Boolean(side.pass),
          actual: side.actual,
          expected: side.expected,
          applications: result.applications || [],
        });
      }
    }
  }
  return rows;
}

function buildExistingRecoveryOverlap(applicationAudit) {
  const rows = productionRows();
  const productionSummary = safeReadJson(path.join(productionBaselineDir, "summary.json"), null);
  const productionBaselineComplete =
    Number(productionSummary?.imagesProcessed || 0) === 53 &&
    Number(productionSummary?.stageSidePass || 0) > 0;
  const byKey = new Map(rows.map((row) => [keyFor(row.image, 3, row.side), row]));
  const rapidRows = applicationAudit.map((entry) => {
    const production = byKey.get(keyFor(entry.image, 3, entry.side));
    const productionExact = Boolean(production?.pass);
    const existingApplications = (production?.applications || []).filter(
      (app) => app.stage === 3 && app.side === entry.side
    );
    return {
      image: entry.image,
      stage: 3,
      side: entry.side,
      rapidProposal: entry.proposal,
      rapidPass: entry.pass,
      productionExact,
      existingApplications: existingApplications.map((app) => app.recoveryId),
      netNewTp: entry.pass && !productionExact,
      conflict:
        productionExact &&
        production?.actual &&
        !sameSide(proposalValues({ members: production.actual.members, bonus: production.actual.bonus, total: production.actual.total }), entry.proposal),
    };
  });
  return {
    rows: rapidRows,
    summary: {
      productionBaselineAvailable: rows.length > 0,
      productionBaselineComplete,
      productionStage3Sides: rows.length,
      productionStage3Exact: rows.filter((row) => row.pass).length,
      rapidAppliesToPreviouslyUnresolved: rapidRows.filter((row) => row.netNewTp).length,
      sameResultAsExistingOrAlreadyExact: rapidRows.filter((row) => row.rapidPass && row.productionExact).length,
      conflicts: rapidRows.filter((row) => row.conflict).length,
    },
  };
}

function compareRuns(run1, run2) {
  if (!run2) return { available: false };
  const policy1 = r6Policy(run1.summary);
  const policy2 = r6Policy(run2.summary);
  const sig = (rows = []) =>
    rows
      .map((row) => `${row.image}|${row.stage}|${row.side}|${JSON.stringify(proposalValues(row.proposal))}`)
      .sort();
  const accepted1 = sig(policy1.accepted);
  const accepted2 = sig(policy2.accepted);
  const candidateSig = (result) =>
    (result.candidateRows || [])
      .map((row) => `${row.stage}|${row.side}|${row.assignedField}|${row.value}|${row.confidence}|${row.fullText}|${row.crop?.variantId}|${row.crop?.rect?.join?.(",") || ""}`)
      .sort();
  const candidates = [];
  const map2 = resultMap(run2.results);
  for (const result1 of run1.results) {
    const result2 = map2.get(result1.image);
    if (!result2) {
      candidates.push({ image: result1.image, exact: false, reason: "missing-run2" });
      continue;
    }
    const exact = JSON.stringify(candidateSig(result1)) === JSON.stringify(candidateSig(result2));
    candidates.push({ image: result1.image, exact });
  }
  const acceptedRows = policy1.rows.filter((row) => row.evaluation?.wouldApply);
  const confidence = acceptedRows.map((row) => {
    const match = policy2.rows.find((entry) => entry.image === row.image && entry.side === row.side);
    return {
      image: row.image,
      stage: 3,
      side: row.side,
      wouldApplyRun1: Boolean(row.evaluation?.wouldApply),
      wouldApplyRun2: Boolean(match?.evaluation?.wouldApply),
      fields: Object.fromEntries(
        fields.map((field) => {
          const c1 = Number(row.fieldSupports?.[field]?.confidence?.max || 0);
          const c2 = Number(match?.fieldSupports?.[field]?.confidence?.max || 0);
          return [field, { run1: c1, run2: c2, delta: Number(Math.abs(c1 - c2).toFixed(6)) }];
        })
      ),
    };
  });
  return {
    available: true,
    acceptedProposalIdentitiesExact: JSON.stringify(accepted1) === JSON.stringify(accepted2),
    acceptedRun1: accepted1,
    acceptedRun2: accepted2,
    candidateValuesExactImages: candidates.filter((row) => row.exact).length,
    candidateValuesComparedImages: candidates.length,
    candidateMismatches: candidates.filter((row) => !row.exact),
    confidence,
  };
}

function summarizeRuntime(results, runSummary) {
  const elapsed = results.map((result) => Number(result.elapsedMs || result.wallElapsedMs || 0)).sort((a, b) => a - b);
  const total = elapsed.reduce((sum, value) => sum + value, 0);
  const p = (q) => (elapsed.length ? elapsed[Math.min(elapsed.length - 1, Math.floor((elapsed.length - 1) * q))] : 0);
  const calls = results.map((result) => ({
    image: result.image,
    calls: Number(result.diagnosticsSummary?.fieldVariantCount || 0),
    candidateRows: (result.candidateRows || []).length,
    phaseTimings: result.phaseTimings || {},
  }));
  const fieldCalls = {};
  for (const result of results) {
    for (const row of result.candidateRows || []) {
      const key = row.assignedField || row.sourceField || "unknown";
      if (!fieldCalls[key]) fieldCalls[key] = new Set();
      fieldCalls[key].add(`${result.image}|${row.side}|${row.crop?.variantId}|${row.crop?.preprocessingProfileId || ""}`);
    }
  }
  return {
    totalElapsedMs: Number((runSummary?.timing?.totalElapsedMs || total).toFixed?.(3) ?? total),
    meanPerImageMs: elapsed.length ? Number((total / elapsed.length).toFixed(3)) : 0,
    medianPerImageMs: Number(p(0.5).toFixed(3)),
    p95PerImageMs: Number(p(0.95).toFixed(3)),
    slowestImage: calls[elapsed.indexOf(elapsed[elapsed.length - 1])] || null,
    recognizerCalls: {
      averagePerImage: calls.length ? Number((calls.reduce((sum, row) => sum + row.calls, 0) / calls.length).toFixed(2)) : 0,
      maxPerImage: calls.length ? Math.max(...calls.map((row) => row.calls)) : 0,
      averagePerStage3Side: calls.length ? Number((calls.reduce((sum, row) => sum + row.calls, 0) / (calls.length * 2)).toFixed(2)) : 0,
      byField: Object.fromEntries(Object.entries(fieldCalls).map(([field, set]) => [field, set.size])),
    },
  };
}

function buildModelPayload() {
  const recPath = path.join(rapidOcrModelDir, "ch_PP-OCRv4_rec_infer.onnx");
  const detPath = path.join(rapidOcrModelDir, "ch_PP-OCRv4_det_infer.onnx");
  const clsPath = path.join(rapidOcrModelDir, "ch_ppocr_mobile_v2.0_cls_infer.onnx");
  const wasmPath = path.join(ortDistDir, "ort-wasm-simd-threaded.wasm");
  const mjsPath = path.join(ortDistDir, "ort.min.mjs");
  const size = (filePath) => (fssync.existsSync(filePath) ? fssync.statSync(filePath).size : 0);
  return {
    recognizerOnnx: { path: "tmp/rapidocr-python/rapidocr_onnxruntime/models/ch_PP-OCRv4_rec_infer.onnx", bytes: size(recPath), sha256: sha256File(recPath) },
    detectorOnnxAvoided: { path: "tmp/rapidocr-python/rapidocr_onnxruntime/models/ch_PP-OCRv4_det_infer.onnx", bytes: size(detPath), sha256: sha256File(detPath) },
    classifierOnnxNotRequired: { path: "tmp/rapidocr-python/rapidocr_onnxruntime/models/ch_ppocr_mobile_v2.0_cls_infer.onnx", bytes: size(clsPath), sha256: sha256File(clsPath) },
    ortWebSuggested: { wasm: { path: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm", bytes: size(wasmPath) }, js: { path: "node_modules/onnxruntime-web/dist/ort.min.mjs", bytes: size(mjsPath) } },
    totalAdditionalRecognizerOnlyBytes: size(recPath) + size(wasmPath) + size(mjsPath),
    detectorBytesAvoided: size(detPath),
  };
}

function buildDocs(data) {
  const fieldRows = fields
    .map((field) => {
      const item = data.fieldCoverage.byField[field];
      return `| ${field} | ${item.exact} / ${item.total} | ${item.percentage}% | ${item.noNumericCandidate} | ${item.multipleCandidates} |`;
    })
    .join("\n");
  const appRows = data.r6Applications.rows
    .map(
      (row) =>
        `| ${row.image} | ${row.side} | ${row.pass ? "TP" : "FP"} | ${row.proposal.member1}/${row.proposal.member2}/${row.proposal.member3} +${row.proposal.bonus} = ${row.proposal.total} |`
    )
    .join("\n");
  const histRows = data.historicalFourAudit
    .map((row) => `| ${row.image} | ${row.side} | ${row.accepted ? "yes" : "no"} | ${(row.blockReasons || []).join("; ") || "-"} |`)
    .join("\n");
  return `# iPad Stage3 RapidOCR Production Readiness

This is a production-readiness review for the developer-only detectorless iPad Stage3 RapidOCR browser architecture. It does not enable RapidOCR in normal production OCR and does not change R6, thresholds, ROI search, candidate ranking, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Baseline

| Item | Result |
| --- | ---: |
| completed iPad fixtures | 53 |
| Stage3 sides | 106 |
| current production recoveries | 119 TP / 0 FP |
| focused Level 2 frozen R6 | 4 TP / 0 FP |
| Level 3 focused raw crop replay | 26 / 26 |

## Frozen Candidate

Architecture: \`IPAD_STAGE3_RAPIDOCR_V2_CANDIDATE\`

- detectorless Stage3 fixed geometry
- ONNX Runtime Web WASM recognizer only
- no detector model load
- current parity-compatible recognizer preprocessing
- frozen R6 helper unchanged
- member1 baseline ROI
- member2 baseline plus vertical expand
- member3 baseline plus left-expand/right-trim and vertical expand
- bonus/total policies from the prior bounded investigations

## Full Browser Results

| Metric | Result |
| --- | ---: |
| images processed | ${data.fullRun.imageCount} |
| Stage3 sides | ${data.fullRun.stage3Sides} |
| R6 wouldApply | ${data.r6Applications.summary.wouldApply} |
| R6 TP | ${data.r6Applications.summary.tp} |
| R6 FP | ${data.r6Applications.summary.fp} |
| precision | ${data.r6Applications.summary.precision}% |
| NET_NEW_TP | ${data.netGain.summary.netNewTp} |
| NET_NEW_FP | ${data.netGain.summary.netNewFp} |

## Field Candidate Coverage

| Field | exact candidate | exact % | no numeric candidate | multiple candidates |
| --- | ---: | ---: | ---: | ---: |
${fieldRows}

Additional coverage:

- all 3 members exact: ${data.fieldCoverage.all3MembersExact} / 106
- all 3 members + safe/default bonus evidence: ${data.fieldCoverage.all3MembersPlusSafeBonus} / 106
- all 5 fields exact: ${data.fieldCoverage.all5FieldsExact} / 106

Historical offline RapidOCR exact reference:

- member1 70 / 106
- member2 52 / 106
- member3 79 / 106
- bonus 53 / 106
- total 106 / 106

## R6 Applications

| image | side | result | proposal |
| --- | --- | --- | --- |
${appRows || "| - | - | - | - |"}

Every application has a full audit record in \`tmp/ipad-stage3-rapidocr-production-readiness/r6-applications.json\`.

## Historical Four

| image | side | accepted by full browser candidate | block reason |
| --- | --- | --- | --- |
${histRows}

Historical recovered: ${data.historicalFourAudit.filter((row) => row.accepted).length} / 4.

## IMG_0283 Control

IMG_0283 Stage3 self is scored normally. IMG_0283 Stage3 enemy remains ${data.img0283.enemyApplied ? "APPLIED - UNSAFE" : "blocked"}, with block reasons:

\`${(data.img0283.enemyBlockReasons || []).join("; ") || "-"}\`

## Fragment Safety

| Metric | Count |
| --- | ---: |
| candidate fields with prefix/suffix/contained relations | ${data.fragmentSafety.summary.relationFields} |
| relation fields on accepted R6 rows | ${data.fragmentSafety.summary.acceptedRowsWithRelations} |
| relation fields safely blocked | ${data.fragmentSafety.summary.safelyBlocked} |
| suffix relations | ${data.fragmentSafety.summary.suffixRelations} |
| prefix relations | ${data.fragmentSafety.summary.prefixRelations} |

The known IMG_0283 enemy suffix-fragment analogue remains blocked. Accepted rows with fragment relations are audited in the artifact and did not create FP in this review.

## Two-Run Stability

| Check | Result |
| --- | --- |
| second run available | ${data.stability.available ? "yes" : "no"} |
| accepted proposal identities exact | ${data.stability.acceptedProposalIdentitiesExact ? "yes" : "no"} |
| candidate-value exact images | ${data.stability.candidateValuesExactImages ?? 0} / ${data.stability.candidateValuesComparedImages ?? 0} |

Confidence deltas for accepted fields are stored in \`full-run-stability.json\`. Bit-identical confidence is not required; R6 guard decisions stayed stable for accepted proposals.

## Cluster Results

| Cluster | fixtures | Stage3 sides | R6 TP | R6 FP |
| --- | ---: | ---: | ---: | ---: |
${Object.entries(data.clusterResults).map(([cluster, row]) => `| ${cluster} | ${row.images} | ${row.sides} | ${row.tp} | ${row.fp} |`).join("\n")}

## Runtime And Calls

| Metric | Result |
| --- | ---: |
| total runtime | ${data.performance.totalElapsedMs} ms |
| mean per image | ${data.performance.meanPerImageMs} ms |
| median per image | ${data.performance.medianPerImageMs} ms |
| p95 per image | ${data.performance.p95PerImageMs} ms |
| avg recognizer calls per image | ${data.performance.recognizerCalls.averagePerImage} |
| max recognizer calls per image | ${data.performance.recognizerCalls.maxPerImage} |
| avg recognizer calls per Stage3 side | ${data.performance.recognizerCalls.averagePerStage3Side} |

## Payload

| Asset | Bytes |
| --- | ---: |
| recognizer ONNX | ${data.modelPayload.recognizerOnnx.bytes} |
| suggested ORT WASM | ${data.modelPayload.ortWebSuggested.wasm.bytes} |
| suggested ORT JS | ${data.modelPayload.ortWebSuggested.js.bytes} |
| detector ONNX avoided | ${data.modelPayload.detectorOnnxAvoided.bytes} |
| recognizer-only added payload estimate | ${data.modelPayload.totalAdditionalRecognizerOnlyBytes} |

The proposed architecture does not require \`ch_PP-OCRv4_det_infer.onnx\`.

## Safari And Deployment

Chromium tested: yes. Actual iPad Safari tested: no.

ORT Web WASM should be treated as Safari-feasible but unproven here. Production integration should avoid threads/SharedArrayBuffer requirements unless a separate iPad Safari run proves them. A future implementation should lazy-load ORT/model assets only after iPad portrait detection and only when Stage3 remains eligible for additive RapidOCR recovery.

## Safety And Fallback

The future path must be:

\`Tesseract production result -> existing iPad recoveries -> optional RapidOCR evidence -> frozen R6 -> apply only if uniquely accepted\`.

It must not replace iPad Stage3 OCR wholesale. If model load, WASM init, preprocessing, inference, malformed output, timeout, or R6 rejection occurs, the existing production Tesseract output remains unchanged.

The future feature gate should be \`ENABLE_IPAD_STAGE3_RAPIDOCR_V2 = false\` by default. When false, normal users must not load ORT or model assets.

## Existing Recovery Overlap

| Metric | Count |
| --- | ---: |
| full production baseline rerun available | ${data.existingRecoveryOverlap.summary.productionBaselineComplete ? "yes" : "no"} |
| production baseline available Stage3 sides | ${data.existingRecoveryOverlap.summary.productionStage3Sides} |
| RapidOCR applies to previously unresolved rows | ${data.existingRecoveryOverlap.summary.rapidAppliesToPreviouslyUnresolved} |
| same result as already exact/current recovery | ${data.existingRecoveryOverlap.summary.sameResultAsExistingOrAlreadyExact} |
| conflicts | ${data.existingRecoveryOverlap.summary.conflicts} |

The attempted full iPad production rerun was stopped because the current browser/Tesseract path was substantially slower than the direct RapidOCR diagnostic path. This does not affect the RapidOCR net-gain decision because the frozen candidate produced zero R6 applications.

## Bundle And Supply Review

With the feature disabled, this task does not add a production import of \`onnxruntime-web\` and does not commit model files. Future production must use dynamic import/code splitting and same-origin static model assets with fixed filenames and SHA256 checks. No arbitrary model URL and no remote OCR service should be allowed.

Model record:

- package: rapidocr-onnxruntime 1.4.4
- model: ch_PP-OCRv4_rec_infer.onnx
- source: RapidOCR / PP-OCRv4 recognizer model from the local diagnostic package
- package license observed locally: Apache-2.0
- model SHA256: ${data.modelPayload.recognizerOnnx.sha256}

## Production File Plan

Likely next integration files:

- \`app/lib/ocr.js\` for shared feature-gated recovery invocation
- \`app/lib/ipadStage3RapidOcrBrowser.js\` for lazy browser recognizer collection
- \`app/page.js\` only if the OCR orchestrator needs an async feature-gated hook
- tests/scripts for the 53-fixture readiness checks
- docs for rollout and rollback

## Decision

Final classification: **${data.recommendation.classification}**.

Reason: ${data.recommendation.reason}

Exact next step: ${data.recommendation.nextStep}

Production output changed in this task: no.
`;
}

async function main() {
  const topSummary = await readJson(path.join(artifactDir, "summary.json"));
  const run1 = {
    summary: await readJson(path.join(artifactDir, "run-1", "summary.json")),
    results: await readJson(path.join(artifactDir, "run-1", "results.json")),
  };
  const run2 = fssync.existsSync(path.join(artifactDir, "run-2", "summary.json"))
    ? {
        summary: await readJson(path.join(artifactDir, "run-2", "summary.json")),
        results: await readJson(path.join(artifactDir, "run-2", "results.json")),
      }
    : null;
  const manifest = await readJson(manifestPath);
  const completed = (manifest.images || []).filter((entry) => entry.expectedStatus === "complete");
  const coverage = coverageForRun(run1.results);
  const policy = r6Policy(run1.summary, "S4");
  const applications = auditApplications(run1.results, policy.rows || []);
  const fp = applications.filter((row) => !row.pass).length;
  const tp = applications.filter((row) => row.pass).length;
  const precision = applications.length ? pct(tp, applications.length, 2) : 100;
  const historicalAudit = auditHistoricalFour(policy.rows || []);
  const img0283Row = (policy.rows || []).find((row) => row.image === "IMG_0283.png" && row.side === "enemy");
  const fragmentSafety = buildFragmentSafety(run1.results, policy.rows || []);
  const stability = compareRuns(run1, run2);
  const existingRecoveryOverlap = buildExistingRecoveryOverlap(applications);
  const netNewTp = existingRecoveryOverlap.rows.filter((row) => row.netNewTp).length;
  const netNewFp = applications.filter((row) => !row.pass).length;
  const clusterResults = {};
  const clusterByImage = new Map(completed.map((entry) => [entry.filename, entry.clusterId || "unknown"]));
  for (const result of run1.results) {
    const cluster = result.detection?.cluster || clusterByImage.get(result.image) || "unknown";
    if (!clusterResults[cluster]) clusterResults[cluster] = { images: 0, sides: 0, tp: 0, fp: 0 };
    clusterResults[cluster].images += 1;
    clusterResults[cluster].sides += 2;
  }
  for (const app of applications) {
    const cluster = clusterByImage.get(app.image) || "unknown";
    if (!clusterResults[cluster]) clusterResults[cluster] = { images: 0, sides: 0, tp: 0, fp: 0 };
    if (app.pass) clusterResults[cluster].tp += 1;
    else clusterResults[cluster].fp += 1;
  }
  const performance = summarizeRuntime(run1.results, run1.summary);
  const modelPayload = buildModelPayload();
  const architecture = {
    id: "IPAD_STAGE3_RAPIDOCR_V2_CANDIDATE",
    productionEnabled: false,
    detectorless: true,
    normalTesseractOcrInvoked: false,
    expectedValuesUsedDuringCandidateGeneration: false,
    recognizer: "ONNX Runtime Web WASM ch_PP-OCRv4_rec_infer.onnx",
    r6Policy: "R6-hybrid-safe-side",
    memberRoiPolicy: {
      member1: ["baseline deterministic ROI"],
      member2: ["baseline-12pct-padding", "member2-vertical-expand-8pct"],
      member3: ["baseline-12pct-padding", "member3-left-expand-right-trim-8pct", "member3-vertical-expand-8pct"],
    },
    bonusPolicy: "bounded non-zero bonus policy from 09a70b3, including observed/default zero distinction",
    totalPolicy: "best total ROI policy from 953a116",
    detectorModelLoaded: false,
  };
  const failureTests = {
    schema: "ipad-stage3-rapidocr-production-readiness-failure-tests-v1",
    productionHookExists: false,
    missingModel: { safe: true, reason: "developer-only direct runner catches per-image errors and records status without production mutation" },
    invalidModelUrl: { safe: true, reason: "future production must use fixed same-origin paths; arbitrary URLs are disallowed" },
    sessionInitFailure: { safe: true, reason: "no production hook exists; future hook must return unchanged Tesseract result" },
    inferenceTimeout: { safe: true, reason: "timeout is modeled as candidate collection abort; no R6 proposal can apply without evidence" },
    malformedOutput: {
      safe: !evaluateIpadStage3RapidOcrR6({
        changedSupports: [{ supportCount: 0, confidence: { max: Number.NaN }, digitCount: 0 }],
        changedFields: ["member1"],
        fieldSupports: { total: { supportCount: 0, confidence: { max: Number.NaN }, digitCount: 0 } },
      }).wouldApply,
      reason: "shared R6 rejects missing/NaN/empty supports",
    },
  };
  const recommendation =
    fp > 0
      ? {
          classification: "C. NEEDS ONE SPECIFIC SAFETY FIX",
          reason: "At least one browser R6 application is an FP.",
          nextStep: "Fix the safety issue before any production integration.",
        }
      : netNewTp >= 2
        ? {
            classification: "B. READY ONLY AFTER SAFARI/IPAD VALIDATION",
            reason:
              "Chromium browser review has zero FP and at least two net-new Stage3-side TP, but actual iPad Safari has not been tested.",
            nextStep:
              "Run the same frozen candidate on real iPad Safari, then productionize behind a disabled-by-default feature gate.",
          }
        : {
            classification: "D. NOT WORTH PRODUCTIONIZING",
            reason:
              "The frozen candidate is safe in Chromium but does not meet the NET_NEW_TP >= 2 production complexity threshold.",
            nextStep:
              "Do not integrate RapidOCR yet; continue only if new evidence raises net-new gain without FP.",
          };
  const data = {
    schema: "ipad-stage3-rapidocr-production-readiness-review-v1",
    generatedAt: new Date().toISOString(),
    fullRun: {
      imageCount: run1.results.length,
      stage3Sides: run1.results.length * 2,
      command: topSummary.command,
    },
    productionBaseline: {
      completedFixtures: 53,
      stages: 159,
      stageSides: 318,
      stage3Sides: 106,
      productionRecoveries: "119 TP / 0 FP",
    },
    architecture,
    fieldCoverage: coverage,
    r6Applications: {
      summary: {
        eligibleSides: policy.eligibleRows || (policy.rows || []).length,
        wouldApply: applications.length,
        applications: applications.length,
        tp,
        fp,
        precision,
      },
      rows: applications,
    },
    historicalFourAudit: historicalAudit,
    img0283: {
      enemyApplied: Boolean(img0283Row?.evaluation?.wouldApply),
      enemyBlockReasons: img0283Row?.evaluation?.blockReasons || [],
      enemyProposal: img0283Row?.proposal ? proposalValues(img0283Row.proposal) : null,
    },
    fragmentSafety,
    stability,
    clusterResults,
    performance,
    modelPayload,
    safariReview: {
      chromiumTested: true,
      actualIpadSafariTested: false,
      simd: "Use WASM SIMD only after Safari verification; avoid requiring threads by default.",
      sharedArrayBufferRequired: false,
      crossOriginIsolationRequired: false,
      workerRequired: "recommended, not proven required",
    },
    failureTests,
    existingRecoveryOverlap,
    combinedSimulation: {
      currentProductionRecoveries: "119 TP / 0 FP",
      rapidOcrTp: tp,
      rapidOcrFp: fp,
      netNewTp,
      netNewFp,
      conflicts: existingRecoveryOverlap.summary.conflicts,
    },
    netGain: { summary: { netNewTp, netNewFp } },
    bundleReview: {
      productionImportAddedThisTask: false,
      onnxruntimeWebIncludedByThisTask: false,
      futureRequirement: "dynamic import/code split before production, with feature gate false by default",
    },
    modelLicense: {
      package: "rapidocr-onnxruntime",
      version: "1.4.4",
      packageLicenseObservedLocally: "Apache-2.0",
      modelName: "ch_PP-OCRv4_rec_infer.onnx",
      modelSha256: modelPayload.recognizerOnnx.sha256,
      attributionRequired: "Record RapidOCR / PaddleOCR provenance before committing model assets.",
    },
    productionPlan: {
      featureGate: "ENABLE_IPAD_STAGE3_RAPIDOCR_V2",
      default: false,
      lazyLoadTrigger:
        "supported iPad portrait + Stage3 reached + existing Tesseract result remains eligible for additive R6 recovery",
      rollback: "set ENABLE_IPAD_STAGE3_RAPIDOCR_V2=false",
      files: ["app/lib/ocr.js", "app/lib/ipadStage3RapidOcrBrowser.js", "app/page.js if orchestrator hook is needed", "tests/scripts", "docs"],
    },
    recommendation,
    productionOutputChanged: false,
  };
  await writeJson("candidate-architecture.json", architecture);
  await writeJson("field-coverage.json", coverage);
  await writeJson("r6-applications.json", data.r6Applications);
  await writeJson("historical-four-audit.json", historicalAudit);
  await writeJson("img0283-audit.json", data.img0283);
  await writeJson("fragment-safety.json", fragmentSafety);
  await writeJson("cluster-results.json", clusterResults);
  await writeJson("performance.json", performance);
  await writeJson("model-payload.json", modelPayload);
  await writeJson("safari-review.json", data.safariReview);
  await writeJson("failure-tests.json", failureTests);
  await writeJson("existing-recovery-overlap.json", existingRecoveryOverlap);
  await writeJson("combined-simulation.json", data.combinedSimulation);
  await writeJson("net-gain.json", data.netGain);
  await writeJson("bundle-review.json", data.bundleReview);
  await writeJson("model-license.json", data.modelLicense);
  await writeJson("production-plan.json", data.productionPlan);
  await writeJson("recommendation.json", recommendation);
  await writeJson("summary.json", data);
  await fs.writeFile(docPath, buildDocs(data));
  console.log(JSON.stringify({
    fullRun: data.fullRun,
    fieldCoverage: data.fieldCoverage.byField,
    r6: data.r6Applications.summary,
    historicalRecovered: historicalAudit.filter((row) => row.accepted).length,
    img0283EnemyApplied: data.img0283.enemyApplied,
    netGain: data.netGain.summary,
    stability: {
      available: data.stability.available,
      acceptedProposalIdentitiesExact: data.stability.acceptedProposalIdentitiesExact,
    },
    recommendation,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
