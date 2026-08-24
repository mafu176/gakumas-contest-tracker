import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const artifactDir = path.join(rootDir, "tmp", "ipad-post-rapidocr-opportunity-reassessment");
const baselineDir = path.join(rootDir, "tmp", "ipad-ocr-baseline");
const productionSafetyPath = path.join(
  rootDir,
  "tmp",
  "ipad-production-fp-investigation",
  "after-fix-53-two-run-summary.json"
);
const rapidReadinessPath = path.join(
  rootDir,
  "tmp",
  "ipad-stage3-rapidocr-production-readiness",
  "summary.json"
);
const rapidFieldCoveragePath = path.join(
  rootDir,
  "tmp",
  "ipad-stage3-rapidocr-production-readiness",
  "field-coverage.json"
);
const docPath = path.join(rootDir, "docs", "ipad-post-rapidocr-opportunity-reassessment.md");

const stages = [1, 2, 3];
const sides = ["self", "enemy"];
const labels = ["member1", "member2", "member3", "bonus", "total"];

function pct(pass, total, digits = 1) {
  return total ? Number(((pass / total) * 100).toFixed(digits)) : 0;
}

function formatPct(pass, total) {
  return `${pass} / ${total} (${pct(pass, total)}%)`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function safeReadJson(filePath, fallback = null) {
  if (!fssync.existsSync(filePath)) return fallback;
  return JSON.parse(fssync.readFileSync(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function increment(object, key, amount = 1) {
  object[key] = (object[key] || 0) + amount;
}

function valuesFromField(field = {}) {
  return (field.parsedCandidates || [])
    .map((candidate) => Number(candidate.value || 0))
    .filter((value) => Number.isFinite(value));
}

function rawContainsValue(field = {}, value) {
  const expectedDigits = String(Number(value || 0));
  if (!expectedDigits || expectedDigits === "0") return Number(value || 0) === 0;
  const rawDigits = String(field.rawText || "").replace(/\D/g, "");
  return rawDigits.includes(expectedDigits);
}

function fieldFor(row, label) {
  if (label.startsWith("member")) {
    const slot = Number(label.replace("member", ""));
    return (row.fields || []).find((field) => field.field === "member" && Number(field.slot) === slot) || {};
  }
  return (row.fields || []).find((field) => field.field === label) || {};
}

function rowValuesFromComparison(comparison = {}, type) {
  const source = comparison[type] || {};
  return {
    member1: Number(source.members?.[0] || 0),
    member2: Number(source.members?.[1] || 0),
    member3: Number(source.members?.[2] || 0),
    bonus: Number(source.bonus || 0),
    total: Number(source.total || 0),
  };
}

function rowWrongFields(expected, actual) {
  return labels.filter((label) => Number(expected[label] || 0) !== Number(actual[label] || 0));
}

function summarizeCandidateEvidence(row, expected) {
  return Object.fromEntries(
    labels.map((label) => {
      const field = fieldFor(row, label);
      const values = valuesFromField(field);
      const expectedValue = Number(expected[label] || 0);
      return [
        label,
        {
          expected: expectedValue,
          selected: Number(field.selected || 0),
          parsedValues: [...new Set(values)],
          exactInParsedCandidates: expectedValue === 0 ? Number(field.selected || 0) === 0 : values.includes(expectedValue),
          exactInRawText: rawContainsValue(field, expectedValue),
          rawText: field.rawText || "",
          cropClassification: field.cropClassification || "",
          candidateCount: values.length,
          touchesBorder: Boolean(field.quality?.touchesBorder),
          foregroundPixelRatio: field.quality?.foregroundPixelRatio ?? null,
        },
      ];
    })
  );
}

function classifyWrongField(evidence, label) {
  const entry = evidence[label] || {};
  if (entry.exactInParsedCandidates) return "R2-exact-candidate-present-but-not-selected";
  if (entry.exactInRawText) return "R4-exact-only-in-raw-text";
  if (entry.candidateCount === 0) return "R1-no-exact-candidate-empty-pool";
  if ((entry.parsedValues || []).some((value) => String(entry.expected).includes(String(value)) || String(value).includes(String(entry.expected)))) {
    return "R5-strict-fragment-or-grouped-token";
  }
  return "R1-no-exact-candidate";
}

async function loadBaselineRows(summary) {
  const rows = [];
  for (const detail of summary.imagesDetail || []) {
    const baselinePath = path.join(rootDir, detail.artifact);
    const baseline = await readJson(baselinePath);
    for (const stage of stages) {
      const stageData = baseline.stages?.[`stage${stage}`] || {};
      for (const side of sides) {
        const row = stageData[side];
        if (!row?.comparison) continue;
        const expected = rowValuesFromComparison(row.comparison, "expected");
        const actual = rowValuesFromComparison(row.comparison, "actual");
        const wrongFields = rowWrongFields(expected, actual);
        const candidateEvidence = summarizeCandidateEvidence(row, expected);
        rows.push({
          image: baseline.image,
          clusterId: baseline.clusterId,
          stage,
          side,
          expected,
          productionProxy: actual,
          pass: wrongFields.length === 0,
          wrongFields,
          wrongFieldCount: wrongFields.length,
          candidateEvidence,
          taxonomy: Object.fromEntries(
            wrongFields.map((label) => [label, classifyWrongField(candidateEvidence, label)])
          ),
          exactCandidateFields: labels.filter((label) => candidateEvidence[label]?.exactInParsedCandidates),
          rawOnlyFields: labels.filter(
            (label) =>
              !candidateEvidence[label]?.exactInParsedCandidates &&
              candidateEvidence[label]?.exactInRawText
          ),
        });
      }
    }
  }
  return rows;
}

function summarizeRows(rows) {
  const failed = rows.filter((row) => !row.pass);
  const stageSummary = {};
  const fieldSummary = Object.fromEntries(labels.map((label) => [label, { wrong: 0, exactCandidate: 0, rawOnly: 0 }]));
  const taxonomy = {};
  const wrongFieldHistogram = {};
  const oneFieldAway = [];
  const twoFieldAway = [];
  const candidateUpperBound = { all5: 0, fourOfFive: 0, threeOfFive: 0, twoOfFive: 0, oneOfFive: 0, zeroOfFive: 0 };
  const clusters = {};

  for (const row of rows) {
    const position = `stage${row.stage}_${row.side}`;
    stageSummary[position] ||= { total: 0, exact: 0, failed: 0, fieldErrors: Object.fromEntries(labels.map((label) => [label, 0])) };
    stageSummary[position].total += 1;
    if (row.pass) stageSummary[position].exact += 1;
    else stageSummary[position].failed += 1;

    clusters[row.clusterId] ||= { total: 0, exact: 0, failed: 0, stage3Failed: 0 };
    clusters[row.clusterId].total += 1;
    if (row.pass) clusters[row.clusterId].exact += 1;
    else clusters[row.clusterId].failed += 1;
    if (row.stage === 3 && !row.pass) clusters[row.clusterId].stage3Failed += 1;

    const exactCount = labels.filter((label) => row.candidateEvidence[label]?.exactInParsedCandidates).length;
    increment(
      candidateUpperBound,
      exactCount === 5
        ? "all5"
        : exactCount === 4
          ? "fourOfFive"
          : exactCount === 3
            ? "threeOfFive"
            : exactCount === 2
              ? "twoOfFive"
              : exactCount === 1
                ? "oneOfFive"
                : "zeroOfFive"
    );

    if (row.pass) continue;
    increment(wrongFieldHistogram, String(row.wrongFieldCount));
    if (row.wrongFieldCount === 1) oneFieldAway.push(row);
    if (row.wrongFieldCount === 2) twoFieldAway.push(row);
    for (const label of row.wrongFields) {
      stageSummary[position].fieldErrors[label] += 1;
      fieldSummary[label].wrong += 1;
      if (row.candidateEvidence[label]?.exactInParsedCandidates) fieldSummary[label].exactCandidate += 1;
      if (row.rawOnlyFields.includes(label)) fieldSummary[label].rawOnly += 1;
      increment(taxonomy, row.taxonomy[label] || "R8-other");
    }
  }

  return { failed, stageSummary, fieldSummary, taxonomy, wrongFieldHistogram, oneFieldAway, twoFieldAway, candidateUpperBound, clusters };
}

function buildOpportunityRanking({ production, summaries, rapid }) {
  const oneByField = {};
  for (const row of summaries.oneFieldAway) increment(oneByField, row.wrongFields[0]);
  const confirmedPostProductionOneFieldAway = {
    source: "docs/ipad-expanded-browser-baseline.md plus docs/ipad-browser-post-m3-leverage-review.md",
    bonus: 5,
    total: 2,
    member1: 1,
    member3: 1,
  };
  const stage3Failed = Object.entries(summaries.stageSummary)
    .filter(([key]) => key.startsWith("stage3_"))
    .reduce((sum, [, value]) => sum + value.failed, 0);
  const stage1Selection = ["stage1_self", "stage1_enemy"].reduce((sum, key) => {
    const value = summaries.stageSummary[key] || {};
    return sum + (value.fieldErrors?.bonus || 0) + (value.fieldErrors?.total || 0);
  }, 0);
  const stage2Selection = ["stage2_self", "stage2_enemy"].reduce((sum, key) => {
    const value = summaries.stageSummary[key] || {};
    return sum + (value.fieldErrors?.bonus || 0) + (value.fieldErrors?.total || 0);
  }, 0);
  const rows = [
    {
      family: "Stage1/2 strict bonus selection from existing exact candidates",
      affectedSides: confirmedPostProductionOneFieldAway.bonus,
      theoreticalNetTpCeiling: confirmedPostProductionOneFieldAway.bonus,
      recognitionRequired: false,
      selectionOnly: true,
      apparentFpRisk: "low-to-medium; needs exact candidate provenance audit",
      complexity: "low",
      isolationRisk: "low",
      rationale:
        "Confirmed post-production browser analyses show 5 one-field-away bonus rows; these are the cheapest remaining side completions if exact bonus evidence exists.",
    },
    {
      family: "Stage1/2 strict total follow-up from existing exact total evidence",
      affectedSides: confirmedPostProductionOneFieldAway.total,
      theoreticalNetTpCeiling: confirmedPostProductionOneFieldAway.total,
      recognitionRequired: false,
      selectionOnly: true,
      apparentFpRisk: "low but likely low gain after strict-total",
      complexity: "low",
      isolationRisk: "low",
      rationale: "Only useful if totals are already in direct production evidence and current guards block for narrow reasons.",
    },
    {
      family: "Raw evidence admission for exact values not in slot pools",
      affectedSides: summaries.failed.filter((row) => row.rawOnlyFields.length > 0).length,
      theoreticalNetTpCeiling: summaries.failed.filter((row) => row.rawOnlyFields.length > 0 && row.wrongFieldCount <= 2).length,
      recognitionRequired: false,
      selectionOnly: false,
      apparentFpRisk: "medium; raw text provenance must be mapped to slot/field",
      complexity: "medium",
      isolationRisk: "medium",
      rationale: "Uses existing OCR text without new recognition, but needs deterministic field admission rules.",
    },
    {
      family: "Stage3 Tesseract candidate reuse without RapidOCR",
      affectedSides: stage3Failed,
      theoreticalNetTpCeiling: rapid?.fieldCoverage?.summary?.allFiveExact || 15,
      recognitionRequired: false,
      selectionOnly: true,
      apparentFpRisk: "high until Stage3 provenance improves",
      complexity: "medium-high",
      isolationRisk: "medium",
      rationale: "RapidOCR closed out; Tesseract Stage3 still has some exact candidates but side completeness remains poor.",
    },
    {
      family: "Stage3 v2 OCR/crop architecture with Tesseract only",
      affectedSides: stage3Failed,
      theoreticalNetTpCeiling: stage3Failed,
      recognitionRequired: true,
      selectionOnly: false,
      apparentFpRisk: "high until diagnostic evidence proves stable",
      complexity: "high",
      isolationRisk: "medium-high",
      rationale: "Largest ceiling, but previous RapidOCR branch showed capture alone does not guarantee production value.",
    },
    {
      family: "Additional fixture expansion / browser artifact capture",
      affectedSides: production.stageSideFail,
      theoreticalNetTpCeiling: 0,
      recognitionRequired: false,
      selectionOnly: false,
      apparentFpRisk: "none",
      complexity: "manual-medium",
      isolationRisk: "none",
      rationale: "Per-row current production artifact gaps limit exact blocker ranking; more cached browser evidence improves future decisions.",
    },
  ];
  return rows.sort((a, b) => {
    const safeScore = (entry) => {
      const riskWeight = entry.apparentFpRisk.startsWith("low")
        ? 4
        : entry.apparentFpRisk.startsWith("medium")
          ? 1.5
          : 0.1;
      const evidenceWeight = entry.selectionOnly ? 3 : entry.recognitionRequired ? 0.25 : 1;
      return entry.theoreticalNetTpCeiling * riskWeight * evidenceWeight;
    };
    return safeScore(b) - safeScore(a);
  });
}

function buildMarkdown({ production, baseline, summaries, rapid, opportunities, attemptedRun }) {
  const rapidR6 = rapid.r6Applications?.summary || rapid.r6 || {};
  const rapidNet = rapid.netGain?.summary || rapid.netGain || {};
  const topFive = opportunities.slice(0, 5);
  const recommended = topFive.find(
    (entry) =>
      entry.theoreticalNetTpCeiling >= 2 &&
      !entry.recognitionRequired &&
      entry.apparentFpRisk.startsWith("low")
  ) || null;
  const selectedRecommendation =
    recommended?.family || "Capture a complete current-production per-row browser artifact before new recovery work";
  const lines = [
    "# iPad Post-RapidOCR Opportunity Reassessment",
    "",
    "Status: diagnostic-only. Production OCR behavior was not changed.",
    "",
    "## Current Production Baseline",
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    `| completed fixtures | ${production.fixtures} |`,
    `| images exact | ${formatPct(production.imagePass, production.images)} |`,
    `| stages exact | ${formatPct(production.stagePass, production.stages)} |`,
    `| stage/sides exact | ${formatPct(production.stageSidePass, production.stageSides)} |`,
    `| remaining failed stage/sides | ${production.stageSideFail} |`,
    `| production recoveries | ${production.productionTp} TP / ${production.productionFp} FP |`,
    `| Tier C | ${production.tierC.tp} TP / ${production.tierC.fp} FP |`,
    `| strict-total | ${production.strictTotal.tp} TP / ${production.strictTotal.fp} FP |`,
    `| strict-member2 | ${production.strictMember2.tp} TP / ${production.strictMember2.fp} FP |`,
    "",
    "The authoritative 53-fixture production safety summary is `tmp/ipad-production-fp-investigation/after-fix-53-two-run-summary.json`. A fresh full browser run was started for this task, but the current UI/Tesseract path advanced only to the second image after several minutes, so it was stopped and the existing two-run artifact was reused. This did not change OCR output.",
    "",
    "## RapidOCR Closeout",
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    `| direct browser RapidOCR fixtures | ${rapid.fullRun.imageCount} |`,
    `| Stage3 sides | ${rapid.fullRun.stage3Sides} |`,
    `| browser R6 applications | ${rapidR6.applications || 0} |`,
    `| TP / FP | ${rapidR6.tp || 0} / ${rapidR6.fp || 0} |`,
    `| NET_NEW_TP / NET_NEW_FP | ${rapidNet.netNewTp || 0} / ${rapidNet.netNewFp || 0} |`,
    "",
    "RapidOCR browser feasibility was proven, but production value was not: NET_NEW_TP is 0, the historical four are not recovered by the frozen browser candidate, and IMG_0283 enemy remains blocked. No further RapidOCR tuning is recommended unless the dataset or production OCR architecture changes materially.",
    "",
    "## Stage And Field Reassessment",
    "",
    "The table below is generated from the cached all-53 Tesseract iPad baseline artifact. It is used for opportunity classification; the aggregate production pass/fail counts above remain the release baseline.",
    "",
    "| Position | baseline exact | baseline failed | member1 err | member2 err | member3 err | bonus err | total err |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...Object.entries(summaries.stageSummary).map(([key, value]) =>
      `| ${key} | ${value.exact} / ${value.total} | ${value.failed} | ${value.fieldErrors.member1} | ${value.fieldErrors.member2} | ${value.fieldErrors.member3} | ${value.fieldErrors.bonus} | ${value.fieldErrors.total} |`
    ),
    "",
    "## Recognition Versus Selection Proxy",
    "",
    "| Field | wrong fields | exact parsed candidate present | exact only in raw text |",
    "| --- | ---: | ---: | ---: |",
    ...Object.entries(summaries.fieldSummary).map(
      ([field, value]) => `| ${field} | ${value.wrong} | ${value.exactCandidate} | ${value.rawOnly} |`
    ),
    "",
    "## Failure Taxonomy",
    "",
    "| Category | Count |",
    "| --- | ---: |",
    ...Object.entries(summaries.taxonomy)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Wrong-Field Histogram",
    "",
    "| wrong fields on side | rows |",
    "| ---: | ---: |",
    ...Object.entries(summaries.wrongFieldHistogram)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## One-Field-Away",
    "",
    "| wrong field | rows |",
    "| --- | ---: |",
    ...Object.entries(
      summaries.oneFieldAway.reduce((acc, row) => {
        increment(acc, row.wrongFields[0]);
        return acc;
      }, {})
    ).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "These one-field-away rows come from the cached pre-production baseline proxy. The opportunity ranking uses the confirmed post-production browser-analysis counts from `docs/ipad-expanded-browser-baseline.md` and `docs/ipad-browser-post-m3-leverage-review.md`: bonus 5, total 2, member1 1, member3 1.",
    "",
    "Detailed one-field-away and two-field-away rows are saved under `tmp/ipad-post-rapidocr-opportunity-reassessment/`.",
    "",
    "## Candidate Upper Bound",
    "",
    "| exact expected values currently parsed on side | rows |",
    "| --- | ---: |",
    `| 5 / 5 | ${summaries.candidateUpperBound.all5} |`,
    `| 4 / 5 | ${summaries.candidateUpperBound.fourOfFive} |`,
    `| 3 / 5 | ${summaries.candidateUpperBound.threeOfFive} |`,
    `| 2 / 5 | ${summaries.candidateUpperBound.twoOfFive} |`,
    `| 1 / 5 | ${summaries.candidateUpperBound.oneOfFive} |`,
    `| 0 / 5 | ${summaries.candidateUpperBound.zeroOfFive} |`,
    "",
    "## Stage3 Without RapidOCR",
    "",
    `Stage3 remains the largest unresolved surface: the current production aggregate leaves ${production.stageSideFail} failed sides overall, and cached all-53 baseline evidence still shows Stage3 as the only position family with no side-level pass before specialized production recoveries. RapidOCR did not create any new accepted R6 rows, so the next Stage3 path should not be another alternate OCR model by default.`,
    "",
    "## Bundle / Runtime Cost Of Retained RapidOCR Tooling",
    "",
    "- Normal production bundle: no production RapidOCR import was added by the readiness work.",
    "- Normal runtime: no ORT/model load occurs in normal OCR.",
    `- Retained diagnostic payload if later productionized: recognizer ONNX ${rapid.modelPayload.recognizerOnnx.bytes} bytes plus ORT WASM/JS ${rapid.modelPayload.ortWebSuggested.wasm.bytes + rapid.modelPayload.ortWebSuggested.js.bytes} bytes.`,
    "- Models remain tmp-only and uncommitted.",
    "",
    "## Top Five Opportunities",
    "",
    "| Rank | Family | affected sides | max net TP ceiling | source | FP risk | scope |",
    "| ---: | --- | ---: | ---: | --- | --- | --- |",
    ...topFive.map(
      (entry, index) =>
        `| ${index + 1} | ${entry.family} | ${entry.affectedSides} | ${entry.theoreticalNetTpCeiling} | ${entry.selectionOnly ? "existing candidates" : entry.recognitionRequired ? "new recognition/capture" : "raw evidence reuse"} | ${entry.apparentFpRisk} | ${entry.complexity} |`
    ),
    "",
    "## Recommendation",
    "",
    `Recommended next investigation: **${selectedRecommendation}**.`,
    "",
    recommended
      ? "This is the best low-cost candidate because it uses existing evidence and has an estimated NET_NEW_TP ceiling of at least 2. It still needs a dedicated runner/browser-equivalent parity task before any production work."
      : "No existing-candidate opportunity cleanly clears the NET_NEW_TP >= 2 and low-FP bar from the available all-53 artifacts. The next safest step is to capture complete current-production per-row browser artifacts or expand fixtures before designing another recovery.",
    "",
    "## Production Unchanged Confirmation",
    "",
    "This reassessment added only diagnostic reporting. It did not productionize RapidOCR, change iPad recovery semantics, touch smartphone/current-PC/legacy desktop OCR, or alter expected fixtures.",
    "",
    "## Fresh Run Attempt",
    "",
    `- attempted command: \`${attemptedRun.command}\``,
    `- result: ${attemptedRun.result}`,
    `- reason: ${attemptedRun.reason}`,
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const baselineSummary = await readJson(path.join(baselineDir, "summary.json"));
  const productionSummary = await readJson(productionSafetyPath);
  const rapidSummary = await readJson(rapidReadinessPath);
  const rapidFieldCoverage = safeReadJson(rapidFieldCoveragePath, {});
  const run = productionSummary.runs?.[0] || {};
  const production = {
    fixtures: productionSummary.fixtureCount,
    images: run.imagesProcessed,
    imagePass: run.imagePass,
    imageFail: run.imageFail,
    stages: run.stagePass + run.stageFail,
    stagePass: run.stagePass,
    stageFail: run.stageFail,
    stageSides: run.stageSidePass + run.stageSideFail,
    stageSidePass: run.stageSidePass,
    stageSideFail: run.stageSideFail,
    productionTp: run.tp,
    productionFp: run.fp,
    tierC: run.byRecovery?.["ipad-tier-c-exactly-one-arithmetic"] || { tp: 0, fp: 0 },
    strictTotal: run.byRecovery?.["ipad-strict-total-selection"] || { tp: 0, fp: 0 },
    strictMember2: run.byRecovery?.["ipad-strict-member2-selection"] || { tp: 0, fp: 0 },
  };

  const rows = await loadBaselineRows(baselineSummary);
  const summaries = summarizeRows(rows);
  const rapid = {
    ...rapidSummary,
    fieldCoverage: rapidFieldCoverage,
  };
  const opportunities = buildOpportunityRanking({ production, summaries, rapid });
  const attemptedRun = {
    command:
      'PLAYWRIGHT_NODE_MODULES="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" node scripts/ipad-browser-expanded-baseline.mjs --runs 1',
    result: "stopped-after-confirming-the-current-path-is-too-slow-for-this-turn",
    reason:
      "The process reached only IMG_0265 after several minutes; existing two-run 53-fixture production safety artifacts were reused.",
  };

  await writeJson("production-baseline.json", production);
  await writeJson("remaining-failures.json", summaries.failed);
  await writeJson("stage-summary.json", summaries.stageSummary);
  await writeJson("field-summary.json", summaries.fieldSummary);
  await writeJson("recognition-vs-selection.json", {
    note: "Classification is from cached all-53 baseline candidate evidence, not a fresh full browser-production rerun.",
    fieldSummary: summaries.fieldSummary,
  });
  await writeJson("failure-taxonomy.json", summaries.taxonomy);
  await writeJson("wrong-field-histogram.json", summaries.wrongFieldHistogram);
  await writeJson("one-field-away.json", summaries.oneFieldAway);
  await writeJson("two-field-away.json", summaries.twoFieldAway);
  await writeJson("candidate-upper-bound.json", summaries.candidateUpperBound);
  await writeJson("selectable-upper-bound.json", {
    note: "Conservative proxy only; no new recovery was simulated.",
    oneFieldAway: summaries.oneFieldAway.length,
    oneFieldAwayWithExactParsedCandidate: summaries.oneFieldAway.filter((row) =>
      row.wrongFields.every((label) => row.candidateEvidence[label]?.exactInParsedCandidates)
    ).length,
    twoFieldAway: summaries.twoFieldAway.length,
  });
  await writeJson("blocked-exact-candidates.json", summaries.failed.filter((row) => row.exactCandidateFields.length > 0));
  await writeJson("raw-evidence-leverage.json", summaries.failed.filter((row) => row.rawOnlyFields.length > 0));
  await writeJson("stage1-analysis.json", rows.filter((row) => row.stage === 1));
  await writeJson("stage2-analysis.json", rows.filter((row) => row.stage === 2));
  await writeJson("stage3-analysis.json", rows.filter((row) => row.stage === 3));
  await writeJson("opportunity-ranking.json", opportunities);
  await writeJson("top-five.json", opportunities.slice(0, 5));
  await writeJson("rapidocr-closeout.json", {
    fullRun: rapidSummary.fullRun,
    r6: rapidSummary.r6Applications?.summary || rapidSummary.r6 || {},
    netGain: rapidSummary.netGain,
    recommendation: rapidSummary.recommendation,
    productionOutputChanged: rapidSummary.productionOutputChanged,
  });
  await writeJson("bundle-audit.json", {
    productionImportAdded: false,
    normalRuntimeModelLoad: false,
    recognizerOnlyAddedPayloadEstimateBytes: rapidSummary.modelPayload?.totalAdditionalRecognizerOnlyBytes || 0,
    detectorBytesAvoided: rapidSummary.modelPayload?.detectorBytesAvoided || 0,
  });
  await writeJson("recommendation.json", {
    selected: opportunities[0]?.family || "",
    caveat: "Do not productionize from this reassessment alone; run a dedicated parity task for any chosen recovery.",
  });
  await fs.writeFile(docPath, buildMarkdown({ production, baseline: baselineSummary, summaries, rapid: rapidSummary, opportunities, attemptedRun }));
  await writeJson("summary.json", {
    production,
    baselineProxy: {
      rows: rows.length,
      pass: rows.filter((row) => row.pass).length,
      fail: summaries.failed.length,
      source: "tmp/ipad-ocr-baseline",
    },
    taxonomy: summaries.taxonomy,
    wrongFieldHistogram: summaries.wrongFieldHistogram,
    topFive: opportunities.slice(0, 5),
  });

  console.log(
    JSON.stringify(
      {
        outputDir: path.relative(rootDir, artifactDir).replaceAll("\\", "/"),
        doc: path.relative(rootDir, docPath).replaceAll("\\", "/"),
        production,
        topRecommendation: opportunities[0],
      },
      null,
      2
    )
  );
}

await main();
