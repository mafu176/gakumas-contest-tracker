import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-fullside-browser-export");
const requireFromHere = createRequire(import.meta.url);

const stages = [3];
const sides = ["self", "enemy"];
const fields = ["member1", "member2", "member3", "bonus", "total"];

function parseArgs() {
  const limitIndex = process.argv.indexOf("--limit");
  const runsIndex = process.argv.indexOf("--runs");
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    limit: process.argv.includes("--all") ? Infinity : Math.max(1, Number((limitIndex >= 0 && process.argv[limitIndex + 1]) || 10)),
    runs: Math.max(1, Number((runsIndex >= 0 && process.argv[runsIndex + 1]) || 1)),
    baseUrl: baseUrlIndex >= 0 ? process.argv[baseUrlIndex + 1] : "",
    resume: process.argv.includes("--resume"),
  };
}

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

async function loadPlaywright() {
  try {
    return requireFromHere("playwright");
  } catch (error) {
    const configuredModuleDir = process.env.PLAYWRIGHT_NODE_MODULES;
    if (configuredModuleDir) {
      return createRequire(path.join(path.resolve(configuredModuleDir), "noop.js"))("playwright");
    }
    throw new Error(`Playwright is required. Set PLAYWRIGHT_NODE_MODULES if needed. Original error: ${error.message}`);
  }
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "no response"}`);
}

function startDevServer(port) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCommand, ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: rootDir,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push({ stream: "stdout", text: chunk.toString() }));
  child.stderr.on("data", (chunk) => logs.push({ stream: "stderr", text: chunk.toString() }));
  return { child, logs };
}

async function stopDevServer(server) {
  if (!server?.child || server.child.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  server.child.kill();
}

async function collectIpadFixtures(limit) {
  const manifest = await loadJson(path.join(ipadExpectedDir, "manifest.json"));
  const complete = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    const imagePath = path.join(ipadImageDir, entry.filename);
    const expectedPath = path.join(ipadExpectedDir, entry.expectedFixture || entry.filename.replace(/\.png$/i, ".json"));
    await fs.access(imagePath);
    await fs.access(expectedPath);
    complete.push({
      ...entry,
      imagePath,
      expected: await loadJson(expectedPath),
    });
  }
  const selected = [];
  const clusters = [...new Set(complete.map((entry) => entry.clusterId || "unknown"))];
  for (const cluster of clusters) {
    const row = complete.find((entry) => (entry.clusterId || "unknown") === cluster && !selected.includes(entry));
    if (row) selected.push(row);
  }
  for (const row of complete) {
    if (selected.length >= limit) break;
    if (!selected.includes(row)) selected.push(row);
  }
  return selected.slice(0, limit);
}

function expectedSide(expectedStage, side) {
  return {
    member1: Number((side === "self" ? expectedStage.selfMembers : expectedStage.enemyMembers)[0] || 0),
    member2: Number((side === "self" ? expectedStage.selfMembers : expectedStage.enemyMembers)[1] || 0),
    member3: Number((side === "self" ? expectedStage.selfMembers : expectedStage.enemyMembers)[2] || 0),
    bonus: Number(expectedStage[side === "self" ? "selfBonus" : "enemyBonus"] || 0),
    total: Number(expectedStage[side === "self" ? "selfTotal" : "enemyTotal"] || 0),
  };
}

function expectedFieldValue(expected, side, field) {
  return expectedSide(expected.stage3, side)[field] || 0;
}

function targetFieldKeysForResult(result) {
  if (result.side === "both") return sides.flatMap((side) => fields.map((field) => `${side}:${field}`));
  return fields.map((field) => `${result.side}:${field}`);
}

function summarizeExport(exportPayload, expected) {
  const rows = [];
  const score = {};
  for (const result of exportPayload.results || []) {
    const resultKey = `${result.architecture}|${result.side}|${result.ocrConfig?.id || "unknown"}`;
    score[resultKey] ||= {
      architecture: result.architecture,
      side: result.side,
      config: result.ocrConfig?.id || "unknown",
      fields: Object.fromEntries(targetFieldKeysForResult(result).map((key) => [key, false])),
      wrongSlot: 0,
      ambiguous: 0,
      unassigned: 0,
      tokenCount: 0,
      elapsedMs: 0,
    };
    score[resultKey].elapsedMs += Number(result.elapsedMs || 0);
    for (const token of result.tokens || []) {
      score[resultKey].tokenCount += 1;
      const assigned = token.geometryAssignment?.assignedField || null;
      if (!assigned) {
        if (token.geometryAssignment?.ambiguous) score[resultKey].ambiguous += 1;
        else score[resultKey].unassigned += 1;
        continue;
      }
      const [side, field] = assigned.split(":");
      const expectedValue = expectedFieldValue(expected, side, field);
      if (expectedValue && toNumber(token.value) === expectedValue) {
        score[resultKey].fields[assigned] = true;
      } else if (fields.includes(field)) {
        for (const candidateSide of sides) {
          for (const candidateField of fields) {
            const value = expectedFieldValue(expected, candidateSide, candidateField);
            if (value && toNumber(token.value) === value && `${candidateSide}:${candidateField}` !== assigned) {
              score[resultKey].wrongSlot += 1;
            }
          }
        }
      }
      rows.push({
        architecture: result.architecture,
        side: result.side,
        config: result.ocrConfig?.id || "unknown",
        tokenValue: toNumber(token.value),
        assignedField: assigned,
        assignmentTier: token.geometryAssignment?.assignmentTier || "",
        ambiguous: Boolean(token.geometryAssignment?.ambiguous),
      });
    }
  }
  return { score: Object.values(score), tokenRows: rows };
}

async function processImage({ browser, baseUrl, row, runIndex }) {
  const page = await browser.newPage({ acceptDownloads: true });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push({ message: error.message, stack: error.stack }));
  try {
    await page.goto(`${baseUrl}/?ipadArithmeticDebug=1&ipadStage3FullsideDebug=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector('[data-testid="ocr-screenshot-file-input"]', { state: "attached", timeout: 30000 });
    await page.setInputFiles('[data-testid="ocr-screenshot-file-input"]', row.imagePath);
    await page.waitForFunction(() => typeof window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__ === "function", null, {
      timeout: 30000,
    });
    await page.evaluate((label) => {
      const input = document.querySelector('[data-testid="ocr-screenshot-file-input"]');
      const file = input?.files?.[0];
      if (!file) throw new Error("No uploaded file available for Stage3 full-side export.");
      window.__IPAD_ARITHMETIC_SET_IMAGE_FILE__(file, label);
    }, row.filename);
    const startedAt = Date.now();
    await page.click('[data-testid="run-ocr-button"]');
    await page.waitForFunction(() => Boolean(window.__IPAD_STAGE3_FULLSIDE_OCR_EXPORT__?.results?.length), null, {
      timeout: 900000,
    });
    const exportPayload = await page.evaluate(() => window.__IPAD_STAGE3_FULLSIDE_OCR_EXPORT__);
    const elapsedMs = Date.now() - startedAt;
    const evaluation = summarizeExport(exportPayload, row.expected);
    return {
      image: row.filename,
      clusterId: row.clusterId || "",
      runIndex,
      imagePath: normalizePathForReport(row.imagePath),
      elapsedMs,
      export: exportPayload,
      evaluation,
      consoleMessages,
      pageErrors,
    };
  } finally {
    await page.close();
  }
}

function aggregate(results) {
  const byArchitecture = {};
  const hierarchyAvailability = {};
  const tokenCandidates = [];
  const fieldAssignments = [];
  const pageErrors = [];
  const consoleErrors = [];
  for (const imageResult of results) {
    for (const [key, availability] of Object.entries(imageResult.export?.hierarchyAvailability || {})) {
      hierarchyAvailability[key] ||= { runs: 0, words: 0, symbols: 0, lines: 0, bbox: 0, confidence: 0 };
      hierarchyAvailability[key].runs += 1;
      for (const field of ["words", "symbols", "lines", "bbox", "confidence"]) {
        hierarchyAvailability[key][field] += availability?.[field] ? 1 : 0;
      }
    }
    for (const result of imageResult.export?.results || []) {
      const key = `${result.architecture}|${result.side}|${result.ocrConfig?.id || "unknown"}`;
      byArchitecture[key] ||= {
        architecture: result.architecture,
        side: result.side,
        config: result.ocrConfig?.id || "unknown",
        images: 0,
        member1: 0,
        member2: 0,
        member3: 0,
        bonus: 0,
        total: 0,
        all3Members: 0,
        fullSide: 0,
        wrongSlot: 0,
        ambiguous: 0,
        unassigned: 0,
        tokenCount: 0,
        elapsedMs: 0,
      };
    }
    for (const score of imageResult.evaluation.score) {
      const key = `${score.architecture}|${score.side}|${score.config}`;
      const bucket = byArchitecture[key];
      bucket.images += 1;
      bucket.elapsedMs += score.elapsedMs;
      bucket.wrongSlot += score.wrongSlot;
      bucket.ambiguous += score.ambiguous;
      bucket.unassigned += score.unassigned;
      bucket.tokenCount += score.tokenCount;
      const fieldValues = score.fields || {};
      const keys = Object.keys(fieldValues);
      for (const field of fields) {
        bucket[field] += keys.some((key) => key.endsWith(`:${field}`) && fieldValues[key]) ? 1 : 0;
      }
      bucket.all3Members += ["member1", "member2", "member3"].every((field) =>
        keys.some((key) => key.endsWith(`:${field}`) && fieldValues[key])
      )
        ? 1
        : 0;
      bucket.fullSide += fields.every((field) =>
        keys.some((key) => key.endsWith(`:${field}`) && fieldValues[key])
      )
        ? 1
        : 0;
    }
    tokenCandidates.push(
      ...(imageResult.export?.results || []).flatMap((result) =>
        (result.tokens || []).map((token) => ({
          image: imageResult.image,
          architecture: result.architecture,
          side: result.side,
          config: result.ocrConfig?.id || "unknown",
          value: toNumber(token.value),
          raw: token.raw,
          source: token.source,
          assignedField: token.geometryAssignment?.assignedField || null,
          assignmentTier: token.geometryAssignment?.assignmentTier || null,
          ambiguous: Boolean(token.geometryAssignment?.ambiguous),
        }))
      )
    );
    fieldAssignments.push(...imageResult.evaluation.tokenRows.map((row) => ({ image: imageResult.image, ...row })));
    pageErrors.push(...imageResult.pageErrors.map((entry) => ({ image: imageResult.image, ...entry })));
    consoleErrors.push(
      ...imageResult.consoleMessages
        .filter((entry) => ["error", "warning"].includes(entry.type))
        .map((entry) => ({ image: imageResult.image, ...entry }))
    );
  }
  const scorecard = Object.values(byArchitecture).sort((a, b) => {
    const aGain = a.member2 + a.member3 + a.fullSide;
    const bGain = b.member2 + b.member3 + b.fullSide;
    return bGain - aGain || a.wrongSlot - b.wrongSlot || a.architecture.localeCompare(b.architecture);
  });
  const best = scorecard[0] || null;
  const viable = Boolean(best && (best.member2 >= 10 || best.member3 >= 10 || best.fullSide >= 8) && best.wrongSlot === 0);
  return {
    scorecard,
    hierarchyAvailability,
    tokenCandidates,
    fieldAssignments,
    pageErrors,
    consoleErrors,
    recommendation: viable
      ? {
          viable: true,
          nextStep: `Run runner/browser parity for ${best.architecture} ${best.side} ${best.config}.`,
          best,
        }
      : {
          viable: false,
          nextStep: "Current browser Tesseract Stage3 full-side architecture is below the viability threshold; evaluate an alternate OCR engine/model for Stage3.",
          best,
        },
  };
}

async function main() {
  const args = parseArgs();
  const rows = await collectIpadFixtures(args.limit);
  await fs.mkdir(artifactDir, { recursive: true });
  const port = args.baseUrl ? 0 : await findFreePort();
  const server = args.baseUrl ? null : startDevServer(port);
  const baseUrl = args.baseUrl || `http://127.0.0.1:${port}`;
  let browser;
  try {
    if (server) await waitForServer(baseUrl);
    const { chromium } = await loadPlaywright();
    browser = await chromium.launch({ headless: true });
    const allResults = [];
    for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
      for (const row of rows) {
        const result = await processImage({ browser, baseUrl, row, runIndex });
        allResults.push(result);
        const safeName = row.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        await fs.writeFile(
          path.join(artifactDir, `${safeName}.run-${runIndex}.export.json`),
          JSON.stringify(result.export, null, 2)
        );
      }
    }
    const aggregated = aggregate(allResults);
    await writeJson("run-summary.json", {
      baseUrl,
      imagesProcessed: rows.length,
      runs: args.runs,
      resultCount: allResults.length,
      totalElapsedMs: allResults.reduce((sum, result) => sum + result.elapsedMs, 0),
      recommendation: aggregated.recommendation,
    });
    await writeJson("f1-results.json", allResults.flatMap((result) => (result.export.results || []).filter((row) => row.architecture === "F1")));
    await writeJson("f2-results.json", allResults.flatMap((result) => (result.export.results || []).filter((row) => row.architecture === "F2")));
    await writeJson("f3-results.json", allResults.flatMap((result) => (result.export.results || []).filter((row) => row.architecture === "F3")));
    await writeJson("hierarchy-availability.json", aggregated.hierarchyAvailability);
    await writeJson("token-candidates.json", aggregated.tokenCandidates);
    await writeJson("field-assignments.json", aggregated.fieldAssignments);
    await writeJson("console-errors.json", aggregated.consoleErrors);
    await writeJson("page-errors.json", aggregated.pageErrors);
    await writeJson("architecture-scorecard.json", aggregated.scorecard);
    await writeJson("recommendation.json", aggregated.recommendation);
    console.log(
      JSON.stringify(
        {
          ipadStage3FullsideBrowserExport: {
            artifactDir: normalizePathForReport(artifactDir),
            imagesProcessed: rows.length,
            runs: args.runs,
            f1f2f3OcrCalls: allResults.reduce((sum, result) => sum + (result.export.results || []).length, 0),
            scorecard: aggregated.scorecard,
            hierarchyAvailability: aggregated.hierarchyAvailability,
            recommendation: aggregated.recommendation,
          },
        },
        null,
        2
      )
    );
  } finally {
    if (browser) await browser.close();
    if (server) await stopDevServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
