import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { evaluateIpadStage3RapidOcrR6 } from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
let artifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-direct-runner");
const bonusTotalArtifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-bonus-total-roi");
const member2ArtifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-member2-roi");
const member3ArtifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-member3-roi");
const rapidOcrModelDir = path.join(
  rootDir,
  "tmp",
  "rapidocr-python",
  "rapidocr_onnxruntime",
  "models"
);
const rapidOcrTargetDir = path.join(rootDir, "tmp", "rapidocr-python");
const requireFromHere = createRequire(import.meta.url);
const bundledNodeModules = path.join(
  process.env.USERPROFILE || "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "node_modules"
);
const requireFromBundledNode = createRequire(path.join(bundledNodeModules, "package.json"));

const sides = ["self", "enemy"];
const fields = ["member1", "member2", "member3", "bonus", "total"];
const defaultSubset = [
  "IMG_0265.png",
  "IMG_0283.png",
  "IMG_0491.png",
  "IMG_0273.png",
  "IMG_0264.png",
  "IMG_0268.png",
  "IMG_0296.png",
  "IMG_0792.png",
  "IMG_0798.png",
  "IMG_0801.png",
];
const acceptedFourAuditTargets = [
  { image: "IMG_0265.png", side: "self" },
  { image: "IMG_0265.png", side: "enemy" },
  { image: "IMG_0283.png", side: "self" },
  { image: "IMG_0491.png", side: "self" },
];
const offlineCandidatePath = path.join(
  rootDir,
  "tmp",
  "ipad-stage3-rapidocr-fixture-expansion",
  "candidate-results.json"
);
const offlineUnsafeSelectorPath = path.join(
  rootDir,
  "tmp",
  "ipad-stage3-rapidocr-fixture-expansion",
  "unsafe-selector-results.json"
);
const offlineR6Path = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-fixture-expansion", "r6-results.json");
const bonusTotalPolicyIds = ["P0", "P1", "P2", "P3", "P4", "P5"];
const member2PolicyIds = ["Q0", "Q1", "Q2", "Q3"];
const member3PolicyIds = ["R0", "R1", "R2", "R3"];

function parseArgs() {
  const argValue = (name, fallback = "") => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] || fallback : fallback;
  };
  const only = argValue("--only")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (/\.(png|jpg|jpeg)$/i.test(entry) ? entry : `${entry}.png`));
  const from = argValue("--from");
  const limit = Number(argValue("--limit", "0") || 0);
  return {
    all: process.argv.includes("--all"),
    resume: process.argv.includes("--resume"),
    only,
    from: from ? (/\.(png|jpg|jpeg)$/i.test(from) ? from : `${from}.png`) : "",
    limit: Number.isFinite(limit) && limit > 0 ? limit : 0,
    port: Number(argValue("--port", "0") || 0),
    baseUrl: argValue("--base-url") || process.env.IPAD_RAPIDOCR_DIRECT_BASE_URL || "",
    runs: Math.max(1, Number(argValue("--runs", "1") || 1)),
    imageTimeoutMs: Math.max(30000, Number(argValue("--image-timeout-ms", "240000") || 240000)),
    roiVariants: process.argv.includes("--roi-variants"),
    bonusTotalRoi: process.argv.includes("--bonus-total-roi"),
    member2Roi: process.argv.includes("--member2-roi"),
    member3Roi: process.argv.includes("--member3-roi"),
  };
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function expectedBaseName(filename) {
  return filename.replace(/\.(png|jpg|jpeg)$/i, ".json");
}

function safeArtifactName(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function expectedSide(stage3, side) {
  return {
    member1: Number(stage3[`${side}Members`]?.[0] || 0),
    member2: Number(stage3[`${side}Members`]?.[1] || 0),
    member3: Number(stage3[`${side}Members`]?.[2] || 0),
    bonus: Number(stage3[`${side}Bonus`] || 0),
    total: Number(stage3[`${side}Total`] || 0),
  };
}

async function listRows(args) {
  const imageFiles = (await fs.readdir(ipadImageDir))
    .filter((name) => /\.(png|jpg|jpeg)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
  const selected = args.all ? imageFiles : args.only.length ? args.only : defaultSubset;
  const fromIndex = args.from ? selected.findIndex((name) => name === args.from) : -1;
  let sliced = fromIndex >= 0 ? selected.slice(fromIndex) : selected;
  if (args.limit) sliced = sliced.slice(0, args.limit);
  const rows = [];
  for (const filename of sliced) {
    const imagePath = path.join(ipadImageDir, filename);
    const expectedPath = path.join(ipadExpectedDir, expectedBaseName(filename));
    if (!fssync.existsSync(imagePath) || !fssync.existsSync(expectedPath)) continue;
    rows.push({
      filename,
      imagePath,
      expectedPath,
      expected: await loadJson(expectedPath),
    });
  }
  return rows;
}

function getPythonExecutable() {
  const candidates = [
    process.env.RAPIDOCR_PYTHON,
    path.join(
      process.env.USERPROFILE || "",
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "python",
      "python.exe"
    ),
    "python",
  ].filter(Boolean);
  return candidates.find((candidate) => {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    return result.status === 0;
  });
}

async function ensureRapidOcrCharacterFile() {
  const outPath = path.join(artifactDir, "local-model-assets", "ch_PP-OCRv4_rec_character.txt");
  if (fssync.existsSync(outPath)) return outPath;
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const python = getPythonExecutable();
  if (!python) throw new Error("No Python executable found for extracting RapidOCR character metadata.");
  const script = `
import os, sys
sys.path.insert(0, os.environ["RAPIDOCR_TARGET_DIR"])
import onnxruntime as ort
session = ort.InferenceSession(os.environ["RAPIDOCR_REC_MODEL"], providers=["CPUExecutionProvider"])
character = session.get_modelmeta().custom_metadata_map.get("character", "")
if not character:
    raise SystemExit("recognizer model has no character metadata")
with open(os.environ["RAPIDOCR_CHARACTER_OUT"], "w", encoding="utf-8") as handle:
    handle.write(character)
`;
  const result = spawnSync(python, ["-c", script], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      RAPIDOCR_TARGET_DIR: rapidOcrTargetDir,
      RAPIDOCR_REC_MODEL: path.join(rapidOcrModelDir, "ch_PP-OCRv4_rec_infer.onnx"),
      RAPIDOCR_CHARACTER_OUT: outPath,
    },
    timeout: 120000,
  });
  if (result.status !== 0) {
    throw new Error(`Failed to extract RapidOCR character metadata: ${result.stderr || result.stdout}`);
  }
  return outPath;
}

async function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function choosePort(requested) {
  if (requested && (await portAvailable(requested))) return requested;
  for (let port = 3340; port < 3370; port += 1) {
    if (await portAvailable(port)) return port;
  }
  throw new Error("No available local port for Next.js dev server.");
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function startServer(args) {
  if (args.baseUrl) return { baseUrl: args.baseUrl, stop: async () => {} };
  const port = await choosePort(args.port);
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", `npm run dev -- -p ${port}`], {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, PORT: String(port) },
          windowsHide: true,
        })
      : spawn("npm", ["run", "dev", "--", "-p", String(port)], {
          cwd: rootDir,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, PORT: String(port) },
        });
  const logPath = path.join(artifactDir, "next-dev.log");
  const logs = [];
  let exited = false;
  let exitCode = null;
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  child.on("exit", (code) => {
    exited = true;
    exitCode = code;
  });
  const baseUrl = `http://localhost:${port}`;
  const started = Date.now();
  while (!(await isServerReady(`${baseUrl}/?ipadStage3RapidOcrDirect=1`))) {
    if (exited) {
      await fs.writeFile(logPath, logs.join(""));
      throw new Error(`Next.js dev server exited before becoming ready (code=${exitCode}).`);
    }
    if (Date.now() - started > 120000) {
      await fs.writeFile(logPath, logs.join(""));
      throw new Error(`Timed out waiting for dev server at ${baseUrl}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await fs.writeFile(logPath, logs.join(""));
  return {
    baseUrl,
    stop: async () => {
      if (process.platform === "win32" && child.pid) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { encoding: "utf8" });
      } else {
        child.kill();
      }
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      child.unref?.();
      await fs.writeFile(logPath, logs.join(""));
    },
  };
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".onnx")) return "application/octet-stream";
  if (filePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

async function installDiagnosticRoutes(context, characterPath) {
  const ortDist = path.join(rootDir, "node_modules", "onnxruntime-web", "dist");
  await context.route("**/diagnostic-models/rapidocr/**", async (route) => {
    const url = new URL(route.request().url());
    const basename = path.basename(url.pathname);
    const filePath =
      basename === "ch_PP-OCRv4_rec_character.txt"
        ? characterPath
        : path.join(rapidOcrModelDir, basename);
    if (!fssync.existsSync(filePath)) {
      await route.fulfill({ status: 404, body: `Missing diagnostic model asset: ${basename}` });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: contentTypeFor(filePath),
      body: await fs.readFile(filePath),
    });
  });
  await context.route("**/diagnostic-models/ort/**", async (route) => {
    const basename = path.basename(new URL(route.request().url()).pathname);
    const filePath = path.join(ortDist, basename);
    if (!fssync.existsSync(filePath)) {
      await route.fulfill({ status: 404, body: `Missing ONNX Runtime Web asset: ${basename}` });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: contentTypeFor(filePath),
      body: await fs.readFile(filePath),
    });
  });
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function rowsForField(candidateRows, side, field) {
  return candidateRows.filter((row) => row.stage === 3 && row.side === side && row.assignedField === field);
}

function isBaselineCandidate(row) {
  return row.crop?.variantId === "baseline-12pct-padding";
}

function isBestTotalCandidate(row) {
  return ["baseline-12pct-padding", "total-horizontal-expand-8pct", "total-vertical-expand-10pct"].includes(
    row.crop?.variantId
  );
}

function isMember2CandidateForPolicy(row, policyId) {
  if (policyId === "Q1" || policyId === "Q2" || policyId === "Q3") return true;
  if (policyId.startsWith("R")) {
    return ["baseline-12pct-padding", "member2-vertical-expand-8pct"].includes(row.crop?.variantId);
  }
  return isBaselineCandidate(row);
}

function isMember3CandidateForPolicy(row, policyId) {
  if (policyId === "R1" || policyId === "R2" || policyId === "R3") return true;
  return isBaselineCandidate(row);
}

function rowsForPolicy(candidateRows, policyId) {
  return candidateRows.filter((row) => {
    const field = row.assignedField || row.sourceField;
    if (policyId.startsWith("R")) {
      if (field === "member1") return isBaselineCandidate(row);
      if (field === "member2") return isMember2CandidateForPolicy(row, policyId);
      if (field === "member3") return isMember3CandidateForPolicy(row, policyId);
      if (policyId === "R0") {
        if (field === "bonus") return true;
        if (field === "total") return isBestTotalCandidate(row);
      }
      if (policyId === "R2") return field === "total" ? isBestTotalCandidate(row) : isBaselineCandidate(row);
      if (policyId === "R3") {
        if (field === "bonus") return true;
        if (field === "total") return isBestTotalCandidate(row);
      }
      return isBaselineCandidate(row);
    }
    if (policyId.startsWith("Q")) {
      if (field === "member1" || field === "member3") return isBaselineCandidate(row);
      if (field === "member2") return isMember2CandidateForPolicy(row, policyId);
      if (policyId === "Q2") return field === "total" ? isBestTotalCandidate(row) : isBaselineCandidate(row);
      if (policyId === "Q3") {
        if (field === "bonus") return true;
        if (field === "total") return isBestTotalCandidate(row);
      }
      return isBaselineCandidate(row);
    }
    if (field === "member1" || field === "member2" || field === "member3") return isBaselineCandidate(row);
    if (policyId === "P0") return isBaselineCandidate(row);
    if (policyId === "P1" || policyId === "P3") return field === "bonus" ? true : isBaselineCandidate(row);
    if (policyId === "P2" || policyId === "P4") return field === "total" ? true : isBaselineCandidate(row);
    if (policyId === "P5") return field === "bonus" || field === "total" ? true : isBaselineCandidate(row);
    return isBaselineCandidate(row);
  });
}

function policyIdsForArgs(args = {}) {
  if (args.member3Roi) return member3PolicyIds;
  if (args.member2Roi) return member2PolicyIds;
  if (args.bonusTotalRoi) return bonusTotalPolicyIds;
  return [...bonusTotalPolicyIds, ...member2PolicyIds, ...member3PolicyIds];
}

function summarizeSupport({ candidateRows, image, side, field, value }) {
  const valueRows = candidateRows.filter(
    (row) =>
      row.image === image &&
      row.stage === 3 &&
      row.side === side &&
      row.assignedField === field &&
      Number(row.value) === Number(value)
  );
  const confidences = valueRows.map((row) => Number(row.confidence)).filter(Number.isFinite);
  return {
    field,
    value,
    supportCount: valueRows.length,
    distinctCandidateCount: new Set(
      candidateRows
        .filter((row) => row.image === image && row.stage === 3 && row.side === side && row.assignedField === field)
        .map((row) => Number(row.value))
        .filter(Number.isFinite)
    ).size,
    variants: [...new Set(valueRows.map((row) => row.crop?.variantId).filter(Boolean))],
    parsers: [...new Set(valueRows.map((row) => row.parser).filter(Boolean))],
    rawTexts: [...new Set(valueRows.map((row) => row.fullText).filter(Boolean))].slice(0, 8),
    confidence: {
      min: confidences.length ? Number(Math.min(...confidences).toFixed(4)) : null,
      max: confidences.length ? Number(Math.max(...confidences).toFixed(4)) : null,
      mean: confidences.length
        ? Number((confidences.reduce((sum, entry) => sum + entry, 0) / confidences.length).toFixed(4))
        : null,
    },
    bbox: {
      availableCount: valueRows.filter((row) => row.bbox).length,
      ambiguousCount: valueRows.filter((row) => row.assignment?.ambiguous).length,
    },
    digitCount: String(Math.abs(Number(value || 0))).length,
  };
}

function fieldValue(proposal, field) {
  if (field === "member1") return Number(proposal.members?.[0] || 0);
  if (field === "member2") return Number(proposal.members?.[1] || 0);
  if (field === "member3") return Number(proposal.members?.[2] || 0);
  return Number(proposal[field] || 0);
}

async function loadOfflineProposalEvidenceRows() {
  try {
    const unsafeSelector = await loadJson(offlineUnsafeSelectorPath);
    const r6Rows = await loadJson(offlineR6Path);
    const changedByRow = new Map(
      [...(r6Rows.accepted || []), ...(r6Rows.blocked || [])].map((row) => [
        `${row.image}|${row.stage}|${row.side}`,
        row.changedFields || [],
      ])
    );
    return (unsafeSelector.acceptedRows || []).map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      pass: Boolean(row.pass),
      proposal: row.actual,
      expected: row.expected,
      changedFields:
        changedByRow.get(`${row.image}|${row.stage}|${row.side}`) ||
        fields.filter((field) => fieldValue(row.actual, field) !== fieldValue(row.expected, field)),
    }));
  } catch {
    return [];
  }
}

async function loadOfflineCandidateMap() {
  try {
    const rows = await loadJson(offlineCandidatePath);
    const map = new Map();
    for (const row of rows) {
      if (row.stage !== 3) continue;
      const key = `${row.image}|${row.stage}|${row.side}|${row.assignedField || row.sourceField}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  } catch {
    return new Map();
  }
}

function evaluatePolicyR6({ candidateRows, offlineProposalRows, policyId }) {
  const policyRows = rowsForPolicy(candidateRows, policyId);
  const rows = offlineProposalRows.map((proposalRow) => {
    const fieldSupports = Object.fromEntries(
      fields.map((field) => [
        field,
        summarizeSupport({
          candidateRows: policyRows,
          image: proposalRow.image,
          side: proposalRow.side,
          field,
          value: fieldValue(proposalRow.proposal, field),
        }),
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
  });
  const accepted = rows.filter((row) => row.evaluation.wouldApply);
  return {
    policyId,
    eligibleRows: rows.length,
    wouldApply: accepted.length,
    tp: accepted.filter((row) => row.pass).length,
    fp: accepted.filter((row) => !row.pass).length,
    accepted: accepted.map((row) => ({
      image: row.image,
      stage: row.stage,
      side: row.side,
      proposal: row.proposal,
      changedFields: row.changedFields,
    })),
    rows,
  };
}

function scoreDiagnostic({ row, diagnostic, policyId = "P5" }) {
  const candidateRows = rowsForPolicy(diagnostic?.candidateRows || [], policyId);
  const comparisons = [];
  for (const side of sides) {
    const expected = expectedSide(row.expected.stage3, side);
    for (const field of fields) {
      const expectedValue = expected[field];
      const candidates = rowsForField(candidateRows, side, field);
      const values = [...new Set(candidates.map((candidate) => Number(candidate.value)).filter(Number.isFinite))].sort(
        (a, b) => a - b
      );
      comparisons.push({
        image: row.filename,
        stage: 3,
        side,
        field,
        expectedValue,
        values,
        hasExpected: values.includes(expectedValue),
        candidateCount: candidates.length,
        texts: [...new Set(candidates.map((candidate) => candidate.fullText || "").filter(Boolean))],
        profileIds: [...new Set(candidates.map((candidate) => candidate.profileId).filter(Boolean))],
        variantIds: [...new Set(candidates.map((candidate) => candidate.crop?.variantId).filter(Boolean))],
      });
    }
  }
  return comparisons;
}

function summarizeR6(diagnostic, row) {
  const rows = diagnostic?.r6?.rows || [];
  const accepted = rows.filter((entry) => entry.evaluation?.wouldApply);
  return {
    wouldApply: accepted.length,
    tp: accepted.filter((entry) => {
      const expected = expectedSide(row.expected.stage3, entry.side);
      return JSON.stringify(entry.proposal) === JSON.stringify(expected);
    }).length,
    fp: accepted.filter((entry) => {
      const expected = expectedSide(row.expected.stage3, entry.side);
      return JSON.stringify(entry.proposal) !== JSON.stringify(expected);
    }).length,
    rows,
  };
}

function summarizeVariantGains(results, field) {
  const rows = results.flatMap((result) => result.rawComparisons || []);
  const fieldRows = rows.filter((row) => row.field === field);
  const baselineExact = fieldRows.filter((row) => row.baselineHasExpected).length;
  const unionExact = fieldRows.filter((row) => row.hasExpected).length;
  const byVariant = {};
  for (const result of results) {
    const diagnosticRows = result.candidateRows || [];
    for (const side of sides) {
      const expected = result.expected?.[side]?.[field];
      for (const variantId of [
        ...new Set(
          diagnosticRows
            .filter((row) => row.side === side && row.assignedField === field)
            .map((row) => row.crop?.variantId)
            .filter(Boolean)
        ),
      ]) {
        const candidates = diagnosticRows.filter(
          (row) => row.side === side && row.assignedField === field && row.crop?.variantId === variantId
        );
        if (!byVariant[variantId]) {
          byVariant[variantId] = { fields: 0, exact: 0, candidates: 0, wrongCandidates: 0, nonEmptyFields: 0 };
        }
        byVariant[variantId].fields += 1;
        const values = candidates.map((row) => Number(row.value)).filter(Number.isFinite);
        byVariant[variantId].candidates += values.length;
        byVariant[variantId].wrongCandidates += values.filter((value) => value !== expected).length;
        if (candidates.some((row) => row.fullText)) byVariant[variantId].nonEmptyFields += 1;
        if (values.includes(expected)) byVariant[variantId].exact += 1;
      }
    }
  }
  return {
    field,
    baselineExact,
    unionExact,
    gain: unionExact - baselineExact,
    byVariant,
  };
}

function buildFieldDeficits(results, offlineCandidateMap) {
  const rows = [];
  for (const result of results) {
    for (const comparison of result.rawComparisons || []) {
      const offlineRows =
        offlineCandidateMap.get(`${result.image}|3|${comparison.side}|${comparison.field}`) || [];
      const offlineValues = [...new Set(offlineRows.map((row) => Number(row.value)).filter(Number.isFinite))];
      rows.push({
        ...comparison,
        offlineHasExpected: offlineValues.includes(comparison.expectedValue),
        offlineValues,
        browserDeficit: !comparison.hasExpected && offlineValues.includes(comparison.expectedValue),
      });
    }
  }
  return rows;
}

function buildPolicyResults({ results, offlineProposalRows, policyIds = bonusTotalPolicyIds }) {
  const candidateRows = results.flatMap((result) => result.candidateRows || []);
  return Object.fromEntries(
    policyIds.map((policyId) => [policyId, evaluatePolicyR6({ candidateRows, offlineProposalRows, policyId })])
  );
}

function buildOfflineBrowserDiffForField(results, offlineCandidateMap, fieldName) {
  const rows = buildFieldDeficits(results, offlineCandidateMap).filter((row) => row.field === fieldName);
  const categories = {
    offlineExactBrowserExact: 0,
    offlineExactBrowserWrong: 0,
    offlineExactBrowserEmpty: 0,
    offlineWrongBrowserExact: 0,
    bothWrong: 0,
    browserFragmentOfOfflineFullValue: 0,
    browserPrefixSuffixContamination: 0,
  };
  const details = rows.map((row) => {
    const browserValues = row.values || [];
    const offlineValues = row.offlineValues || [];
    const offlineExact = row.offlineHasExpected;
    const browserExact = row.hasExpected;
    const browserEmpty = browserValues.length === 0;
    const expectedText = String(row.expectedValue);
    const fragment = browserValues.some((value) => {
      const text = String(value);
      return text.length >= 2 && text.length < expectedText.length && expectedText.includes(text);
    });
    const contamination = browserValues.some((value) => {
      const text = String(value);
      return text.length > expectedText.length && text.includes(expectedText);
    });
    if (offlineExact && browserExact) categories.offlineExactBrowserExact += 1;
    else if (offlineExact && browserEmpty) categories.offlineExactBrowserEmpty += 1;
    else if (offlineExact) categories.offlineExactBrowserWrong += 1;
    else if (browserExact) categories.offlineWrongBrowserExact += 1;
    else categories.bothWrong += 1;
    if (fragment) categories.browserFragmentOfOfflineFullValue += 1;
    if (contamination) categories.browserPrefixSuffixContamination += 1;
    return {
      image: row.image,
      side: row.side,
      expectedValue: row.expectedValue,
      offlineExact,
      browserExact,
      browserEmpty,
      browserValues,
      offlineValues,
      fragment,
      contamination,
      texts: row.texts,
      variantIds: row.variantIds,
    };
  });
  return { categories, rows: details };
}

function buildCandidateUnion(results, field = "member2") {
  return results.flatMap((result) =>
    sides.map((side) => {
      const rows = (result.candidateRows || []).filter((row) => row.side === side && row.assignedField === field);
      const values = new Map();
      for (const row of rows) {
        const value = Number(row.value);
        if (!Number.isFinite(value)) continue;
        if (!values.has(value)) {
          values.set(value, {
            value,
            supportCount: 0,
            variants: new Set(),
            rawTexts: new Set(),
            confidences: [],
          });
        }
        const entry = values.get(value);
        entry.supportCount += 1;
        if (row.crop?.variantId) entry.variants.add(row.crop.variantId);
        if (row.fullText) entry.rawTexts.add(row.fullText);
        if (Number.isFinite(Number(row.confidence))) entry.confidences.push(Number(row.confidence));
      }
      return {
        image: result.image,
        side,
        field,
        expectedValue: result.expected?.[side]?.[field],
        candidates: [...values.values()]
          .map((entry) => ({
            value: entry.value,
            supportCount: entry.supportCount,
            variants: [...entry.variants].sort(),
            rawTexts: [...entry.rawTexts].slice(0, 8),
            confidence: {
              min: entry.confidences.length ? Number(Math.min(...entry.confidences).toFixed(4)) : null,
              max: entry.confidences.length ? Number(Math.max(...entry.confidences).toFixed(4)) : null,
            },
          }))
          .sort((a, b) => a.value - b.value),
      };
    })
  );
}

function buildFragmentAudit(candidateUnion) {
  const rows = candidateUnion.map((row) => {
    const values = row.candidates.map((candidate) => candidate.value);
    const relations = [];
    for (const value of values) {
      const text = String(value);
      for (const other of values) {
        if (value === other) continue;
        const otherText = String(other);
        if (text.length < otherText.length && otherText.startsWith(text)) {
          relations.push({ value, other, relation: "prefix-of" });
        } else if (text.length < otherText.length && otherText.endsWith(text)) {
          relations.push({ value, other, relation: "suffix-of" });
        } else if (text.length < otherText.length && otherText.includes(text)) {
          relations.push({ value, other, relation: "contained-in" });
        }
      }
    }
    return {
      image: row.image,
      side: row.side,
      expectedValue: row.expectedValue,
      candidateCount: row.candidates.length,
      hasExpected: row.candidates.some((candidate) => candidate.value === row.expectedValue),
      relations,
      conflictingValues: row.candidates.length > 1,
    };
  });
  return {
    rows,
    summary: {
      noCandidate: rows.filter((row) => row.candidateCount === 0).length,
      exactlyOneCandidate: rows.filter((row) => row.candidateCount === 1).length,
      multipleCandidates: rows.filter((row) => row.candidateCount > 1).length,
      fragmentConflicts: rows.filter((row) => row.relations.length > 0).length,
      averageCandidateCount: rows.length
        ? Number((rows.reduce((sum, row) => sum + row.candidateCount, 0) / rows.length).toFixed(3))
        : 0,
    },
  };
}

function buildRoiDefinitions(results, fieldName = "member2") {
  const examples = {};
  for (const result of results) {
    for (const row of result.candidateRows || []) {
      if (row.assignedField !== fieldName) continue;
      const id = row.crop?.variantId;
      if (!id || examples[id]) continue;
      examples[id] = {
        variantId: id,
        architecture: row.crop?.architecture,
        description: row.crop?.variantDescription,
        exampleImage: result.image,
        pixelRect: row.crop?.rect,
      };
    }
  }
  return {
    coordinateSystem: "source image pixels after direct-browser image decode",
    field: fieldName,
    variants: Object.values(examples).sort((a, b) => a.variantId.localeCompare(b.variantId)),
  };
}

function buildClusterResults(results, candidateUnion) {
  const fixtureExpansion = new Map([
    ["IMG_0282.png", "ipad-01"],
    ["IMG_0284.png", "ipad-01"],
    ["IMG_0285.png", "ipad-01"],
    ["IMG_0286.png", "ipad-01"],
    ["IMG_0292.png", "ipad-01"],
    ["IMG_0293.png", "ipad-01"],
    ["IMG_0294.png", "ipad-01"],
    ["IMG_0295.png", "ipad-01"],
    ["IMG_0297.png", "ipad-01"],
    ["IMG_0298.png", "ipad-01"],
    ["IMG_0795.png", "ipad-02"],
    ["IMG_0798.png", "ipad-02"],
    ["IMG_0799.png", "ipad-02"],
    ["IMG_0800.png", "ipad-02"],
    ["IMG_0801.png", "ipad-02"],
  ]);
  const byImage = new Map(results.map((result) => [result.image, result.detection?.cluster || fixtureExpansion.get(result.image) || "unknown"]));
  const summary = {};
  for (const row of candidateUnion) {
    const cluster = byImage.get(row.image) || "unknown";
    if (!summary[cluster]) summary[cluster] = { fields: 0, exact: 0, noCandidate: 0, multipleCandidates: 0 };
    summary[cluster].fields += 1;
    if (row.candidates.some((candidate) => candidate.value === row.expectedValue)) summary[cluster].exact += 1;
    if (row.candidates.length === 0) summary[cluster].noCandidate += 1;
    if (row.candidates.length > 1) summary[cluster].multipleCandidates += 1;
  }
  return summary;
}

function summarizeResults(results, offlineCandidateMap = new Map(), offlineProposalRows = [], args = {}) {
  const comparisons = results.flatMap((result) => result.comparisons || []);
  const rawComparisons = results.flatMap((result) => result.rawComparisons || []);
  const policyIds = policyIdsForArgs(args);
  const member2CandidateUnion = buildCandidateUnion(results, "member2");
  const member3CandidateUnion = buildCandidateUnion(results, "member3");
  const member2FragmentAudit = buildFragmentAudit(member2CandidateUnion);
  const member3FragmentAudit = buildFragmentAudit(member3CandidateUnion);
  const byField = Object.fromEntries(
    fields.map((field) => {
      const rows = comparisons.filter((comparison) => comparison.field === field);
      return [
        field,
        {
          exact: rows.filter((row) => row.hasExpected).length,
          total: rows.length,
          percentage: rows.length ? Number(((rows.filter((row) => row.hasExpected).length / rows.length) * 100).toFixed(2)) : 0,
        },
      ];
    })
  );
  const byCluster = Object.fromEntries(
    [...new Set(results.map((result) => result.detection?.cluster || result.detection?.layout || "unknown"))].map(
      (cluster) => {
        const clusterResults = results.filter(
          (result) => (result.detection?.cluster || result.detection?.layout || "unknown") === cluster
        );
        const clusterComparisons = clusterResults.flatMap((result) => result.comparisons || []);
        return [
          cluster,
          {
            images: clusterResults.length,
            exactFields: clusterComparisons.filter((row) => row.hasExpected).length,
            totalFields: clusterComparisons.length,
          },
        ];
      }
    )
  );
  const acceptedRows = results.flatMap((result) =>
    (result.r6?.rows || [])
      .filter((row) => row.evaluation?.wouldApply)
      .map((row) => ({ image: result.image, stage: 3, side: row.side, proposal: row.proposal }))
  );
  return {
    schema: "ipad-stage3-rapidocr-direct-runner-summary-v1",
    generatedAt: new Date().toISOString(),
    imageCount: results.length,
    stage3Sides: results.length * 2,
    fields: comparisons.length,
    exactFields: comparisons.filter((row) => row.hasExpected).length,
    byField,
    byCluster,
    r6: {
      wouldApply: acceptedRows.length,
      tp: results.reduce((sum, result) => sum + Number(result.r6?.tp || 0), 0),
      fp: results.reduce((sum, result) => sum + Number(result.r6?.fp || 0), 0),
      accepted: acceptedRows,
    },
    policies: buildPolicyResults({ results, offlineProposalRows, policyIds }),
    fieldDeficits: {
      offlineReference: {
        member1: "70 / 106",
        member2: "52 / 106",
        member3: "79 / 106",
        bonus: "53 / 106",
        total: "106 / 106",
      },
      browserVsOffline: buildFieldDeficits(results, offlineCandidateMap).reduce((acc, row) => {
        if (!acc[row.field]) acc[row.field] = { browserExact: 0, offlineExact: 0, browserDeficit: 0, total: 0 };
        acc[row.field].total += 1;
        if (row.hasExpected) acc[row.field].browserExact += 1;
        if (row.offlineHasExpected) acc[row.field].offlineExact += 1;
        if (row.browserDeficit) acc[row.field].browserDeficit += 1;
        return acc;
      }, {}),
    },
    variantGains: {
      member2: summarizeVariantGains(results, "member2"),
      bonus: summarizeVariantGains(results, "bonus"),
      total: summarizeVariantGains(results, "total"),
      member3: summarizeVariantGains(results, "member3"),
    },
    member2: {
      offlineBrowserDiff: buildOfflineBrowserDiffForField(results, offlineCandidateMap, "member2"),
      candidateUnion: member2CandidateUnion,
      fragmentAudit: member2FragmentAudit,
      roiDefinitions: buildRoiDefinitions(results, "member2"),
      clusterResults: buildClusterResults(results, member2CandidateUnion),
    },
    member3: {
      offlineBrowserDiff: buildOfflineBrowserDiffForField(results, offlineCandidateMap, "member3"),
      candidateUnion: member3CandidateUnion,
      fragmentAudit: member3FragmentAudit,
      roiDefinitions: buildRoiDefinitions(results, "member3"),
      clusterResults: buildClusterResults(results, member3CandidateUnion),
    },
    statuses: Object.fromEntries(
      [...new Set(results.map((result) => result.status))].map((status) => [
        status,
        results.filter((result) => result.status === status).length,
      ])
    ),
    timing: {
      totalElapsedMs: Number(results.reduce((sum, result) => sum + Number(result.elapsedMs || 0), 0).toFixed(3)),
      averageElapsedMs: results.length
        ? Number((results.reduce((sum, result) => sum + Number(result.elapsedMs || 0), 0) / results.length).toFixed(3))
        : 0,
      perImage: results.map((result) => ({
        image: result.image,
        elapsedMs: result.elapsedMs,
        phaseTimings: result.phaseTimings,
      })),
    },
  };
}

function compactPolicySummary(policies = {}) {
  return Object.fromEntries(
    Object.entries(policies).map(([policyId, policy]) => [
      policyId,
      {
        wouldApply: policy.wouldApply || 0,
        tp: policy.tp || 0,
        fp: policy.fp || 0,
        rows: Array.isArray(policy.rows) ? policy.rows.length : 0,
      },
    ])
  );
}

function compactRunSummary(summary) {
  return {
    imageCount: summary.imageCount,
    stage3Sides: summary.stage3Sides,
    fields: summary.fields,
    exactFields: summary.exactFields,
    byField: summary.byField,
    byCluster: summary.byCluster,
    r6: {
      wouldApply: summary.r6?.wouldApply || 0,
      tp: summary.r6?.tp || 0,
      fp: summary.r6?.fp || 0,
    },
    policies: compactPolicySummary(summary.policies),
    fieldDeficits: summary.fieldDeficits,
    variantGains: summary.variantGains,
    statuses: summary.statuses,
    timing: summary.timing
      ? {
          totalElapsedMs: summary.timing.totalElapsedMs,
          averageElapsedMs: summary.timing.averageElapsedMs,
        }
      : null,
  };
}

function outputSummaryName(args, rows) {
  if (args.member3Roi) return "member3-roi-results.json";
  if (args.member2Roi) return "member2-roi-results.json";
  if (args.bonusTotalRoi) return "bonus-total-roi-results.json";
  if (args.roiVariants) return "variant-comparison.json";
  if (rows.length === 1 && rows[0]?.filename === "IMG_0265.png") return "img0265-baseline.json";
  if (args.all) return "full-results.json";
  return "subset-results.json";
}

function buildAcceptedFourAudit(results) {
  return acceptedFourAuditTargets.map((target) => {
    const result = results.find((entry) => entry.image === target.image);
    const comparisons = (result?.comparisons || []).filter((entry) => entry.side === target.side);
    const r6Row = (result?.r6?.rows || []).find((entry) => entry.side === target.side);
    return {
      ...target,
      candidateEvidenceSufficient: comparisons.every((entry) => entry.hasExpected),
      exactFields: comparisons.filter((entry) => entry.hasExpected).length,
      totalFields: comparisons.length,
      r6WouldApply: Boolean(r6Row?.evaluation?.wouldApply),
      blockReasons: r6Row?.evaluation?.blockReasons || [],
      proposal: r6Row?.proposal || null,
      candidates: Object.fromEntries(
        fields.map((field) => [
          field,
          (result?.rawComparisons || []).find((entry) => entry.side === target.side && entry.field === field) || null,
        ])
      ),
    };
  });
}

async function processImage({ page, row, runDir, resume, imageTimeoutMs }) {
  const imageDir = path.join(runDir, safeArtifactName(row.filename));
  const resultPath = path.join(imageDir, "direct-rapidocr-result.json");
  if (resume && fssync.existsSync(resultPath)) return loadJson(resultPath);
  await fs.mkdir(imageDir, { recursive: true });
  const dataUrl = `data:image/png;base64,${(await fs.readFile(row.imagePath)).toString("base64")}`;
  const started = Date.now();
  try {
    const diagnostic = await withTimeout(
      page.evaluate(async ({ dataUrl: browserDataUrl, imageName }) => {
        if (typeof window.__IPAD_STAGE3_RAPIDOCR_DIRECT_RUN__ !== "function") {
          throw new Error("iPad Stage3 RapidOCR direct API is not available.");
        }
        return window.__IPAD_STAGE3_RAPIDOCR_DIRECT_RUN__({ dataUrl: browserDataUrl, imageName });
      }, { dataUrl, imageName: row.filename }),
      imageTimeoutMs,
      row.filename
    );
    const rawPolicyId = diagnostic?.runtime?.member3RoiVariantsEnabled
      ? "R3"
      : diagnostic?.runtime?.member2RoiVariantsEnabled
        ? "Q3"
        : "P5";
    const rawComparisons = scoreDiagnostic({ row, diagnostic, policyId: rawPolicyId }).map((comparison) => {
      const baselineCandidates = rowsForField(diagnostic?.candidateRows || [], comparison.side, comparison.field).filter(
        isBaselineCandidate
      );
      const baselineValues = [
        ...new Set(baselineCandidates.map((candidate) => Number(candidate.value)).filter(Number.isFinite)),
      ].sort((a, b) => a - b);
      return {
        ...comparison,
        baselineValues,
        baselineHasExpected: baselineValues.includes(comparison.expectedValue),
      };
    });
    const comparisons = scoreDiagnostic({ row, diagnostic, policyId: "P0" });
    const r6 = summarizeR6(diagnostic, row);
    const expectedStage3 = {
      self: expectedSide(row.expected.stage3, "self"),
      enemy: expectedSide(row.expected.stage3, "enemy"),
    };
    const result = {
      image: row.filename,
      imagePath: normalizePathForReport(row.imagePath),
      status: diagnostic?.status || "missing",
      elapsedMs: diagnostic?.directRunner?.elapsedMs || diagnostic?.runtime?.phaseTimings?.totalElapsedMs || 0,
      wallElapsedMs: Date.now() - started,
      detection: diagnostic?.detection || null,
      modelInventory: diagnostic?.modelInventory || null,
      phaseTimings: diagnostic?.runtime?.phaseTimings || {},
      diagnosticsSummary: diagnostic?.diagnosticsSummary || {},
      expected: expectedStage3,
      candidateRows: diagnostic?.candidateRows || [],
      rawComparisons,
      comparisons,
      r6,
    };
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    await fs.writeFile(path.join(imageDir, "direct-rapidocr-diagnostic.json"), JSON.stringify(diagnostic, null, 2));
    return result;
  } catch (error) {
    const result = {
      image: row.filename,
      imagePath: normalizePathForReport(row.imagePath),
      status: "failed",
      elapsedMs: 0,
      wallElapsedMs: Date.now() - started,
      error: { message: error.message, stack: error.stack },
      comparisons: [],
      r6: { wouldApply: 0, tp: 0, fp: 0, rows: [] },
    };
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
    return result;
  }
}

async function main() {
  const args = parseArgs();
  if (args.member3Roi) artifactDir = member3ArtifactDir;
  if (args.member2Roi) artifactDir = member2ArtifactDir;
  if (args.bonusTotalRoi) artifactDir = bonusTotalArtifactDir;
  await fs.mkdir(artifactDir, { recursive: true });
  const rows = await listRows(args);
  const offlineCandidateMap = await loadOfflineCandidateMap();
  const offlineProposalRows = await loadOfflineProposalEvidenceRows();
  const characterPath = await ensureRapidOcrCharacterFile();
  let chromium;
  try {
    ({ chromium } = requireFromHere("playwright"));
  } catch {
    ({ chromium } = requireFromBundledNode("playwright"));
  }
  const runnerConfig = {
    schema: "ipad-stage3-rapidocr-direct-runner-config-v1",
    generatedAt: new Date().toISOString(),
    args,
    imageCount: rows.length,
    imageDir: normalizePathForReport(ipadImageDir),
    expectedDir: normalizePathForReport(ipadExpectedDir),
    modelDir: normalizePathForReport(rapidOcrModelDir),
    architecture: "D-detectorless-fixed-roi",
    productionOcrBypassed: true,
    bonusTotalRoi: args.bonusTotalRoi,
    member2Roi: args.member2Roi,
    member3Roi: args.member3Roi,
  };
  await fs.writeFile(path.join(artifactDir, "runner-config.json"), JSON.stringify(runnerConfig, null, 2));
  const server = await startServer(args);
  const browser = await chromium.launch({ headless: true });
  const runSummaries = [];
  try {
    for (let run = 1; run <= args.runs; run += 1) {
      const runDir = path.join(artifactDir, `run-${run}`);
      await fs.mkdir(runDir, { recursive: true });
      const context = await browser.newContext({ acceptDownloads: true });
      await installDiagnosticRoutes(context, characterPath);
      const page = await context.newPage();
      const consoleMessages = [];
      const pageErrors = [];
      page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
      page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
      const params = new URLSearchParams({
        ipadStage3RapidOcrDirect: "1",
        ipadStage3RapidOcrDetectorEnabled: "0",
      });
      if (args.roiVariants) params.set("ipadStage3RapidOcrRoiVariants", "1");
      if (args.bonusTotalRoi) params.set("ipadStage3RapidOcrBonusTotalRoi", "1");
      if (args.member2Roi) {
        params.set("ipadStage3RapidOcrMember2Roi", "1");
        params.set("ipadStage3RapidOcrBonusTotalRoi", "1");
      }
      if (args.member3Roi) {
        params.set("ipadStage3RapidOcrMember2Roi", "1");
        params.set("ipadStage3RapidOcrMember3Roi", "1");
        params.set("ipadStage3RapidOcrBonusTotalRoi", "1");
      }
      await page.goto(`${server.baseUrl}/?${params.toString()}`, {
        waitUntil: "domcontentloaded",
        timeout: 300000,
      });
      await page.waitForFunction(() => typeof window.__IPAD_STAGE3_RAPIDOCR_DIRECT_RUN__ === "function", null, {
        timeout: 180000,
      });
      const results = [];
      for (const row of rows) {
        const result = await processImage({
          page,
          row,
          runDir,
          resume: args.resume,
          imageTimeoutMs: args.imageTimeoutMs,
        });
        results.push(result);
        await fs.writeFile(path.join(runDir, "checkpoint.json"), JSON.stringify({ completed: results.length }, null, 2));
      }
      await fs.writeFile(path.join(runDir, "console-messages.json"), JSON.stringify(consoleMessages, null, 2));
      await fs.writeFile(path.join(runDir, "page-errors.json"), JSON.stringify(pageErrors, null, 2));
      await page.close().catch(() => {});
      await context.close();
      const summary = summarizeResults(results, offlineCandidateMap, offlineProposalRows, args);
      await fs.writeFile(path.join(runDir, "results.json"), JSON.stringify(results, null, 2));
      await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
      await fs.writeFile(path.join(runDir, "baseline.json"), JSON.stringify(summary.byField, null, 2));
      await fs.writeFile(path.join(runDir, "field-accuracy.json"), JSON.stringify(summary.byField, null, 2));
      await fs.writeFile(path.join(runDir, "field-deficits.json"), JSON.stringify(summary.fieldDeficits, null, 2));
      await fs.writeFile(
        path.join(runDir, "offline-browser-member2-diff.json"),
        JSON.stringify(summary.member2.offlineBrowserDiff, null, 2)
      );
      await fs.writeFile(
        path.join(runDir, "offline-browser-member3-diff.json"),
        JSON.stringify(summary.member3.offlineBrowserDiff, null, 2)
      );
      const focusedField = args.member3Roi ? "member3" : "member2";
      const focusedSummary = summary[focusedField];
      await fs.writeFile(path.join(runDir, "roi-definitions.json"), JSON.stringify(focusedSummary.roiDefinitions, null, 2));
      await fs.writeFile(path.join(runDir, "variant-results.json"), JSON.stringify(summary.variantGains[focusedField], null, 2));
      await fs.writeFile(path.join(runDir, "candidate-union.json"), JSON.stringify(focusedSummary.candidateUnion, null, 2));
      await fs.writeFile(path.join(runDir, "fragment-audit.json"), JSON.stringify(focusedSummary.fragmentAudit, null, 2));
      await fs.writeFile(path.join(runDir, "q-policy-results.json"), JSON.stringify(summary.policies, null, 2));
      await fs.writeFile(path.join(runDir, "r-policy-results.json"), JSON.stringify(summary.policies, null, 2));
      await fs.writeFile(path.join(runDir, "runtime.json"), JSON.stringify(summary.timing, null, 2));
      await fs.writeFile(path.join(runDir, "cluster-results.json"), JSON.stringify(focusedSummary.clusterResults, null, 2));
      await fs.writeFile(path.join(runDir, "bonus-variant-results.json"), JSON.stringify(summary.variantGains.bonus, null, 2));
      await fs.writeFile(path.join(runDir, "member3-variant-results.json"), JSON.stringify(summary.variantGains.member3, null, 2));
      await fs.writeFile(path.join(runDir, "total-variant-results.json"), JSON.stringify(summary.variantGains.total, null, 2));
      await fs.writeFile(path.join(runDir, "policy-results.json"), JSON.stringify(summary.policies, null, 2));
      await fs.writeFile(path.join(runDir, "r6-results.json"), JSON.stringify(summary.r6, null, 2));
      await fs.writeFile(path.join(runDir, "accepted-four-audit.json"), JSON.stringify(buildAcceptedFourAudit(results), null, 2));
      const img0283 = results.find((result) => result.image === "IMG_0283.png");
      if (img0283) {
        await fs.writeFile(path.join(runDir, "img0283-audit.json"), JSON.stringify(img0283, null, 2));
      }
      runSummaries.push(summary);
    }
  } finally {
    await browser.close().catch(() => {});
    await server.stop();
  }
  const summary = {
    schema: "ipad-stage3-rapidocr-direct-runner-v1",
    command: "node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs",
    outputDir: normalizePathForReport(artifactDir),
    imageCount: rows.length,
    runs: runSummaries,
  };
  const consoleSummary = {
    ...summary,
    runs: runSummaries.map(compactRunSummary),
  };
  await fs.writeFile(path.join(artifactDir, "summary.json"), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(artifactDir, outputSummaryName(args, rows)), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(consoleSummary, null, 2));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
