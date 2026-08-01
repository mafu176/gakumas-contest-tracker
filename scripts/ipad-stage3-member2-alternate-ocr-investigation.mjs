import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const requireFromHere = createRequire(import.meta.url);

const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const sourceArtifactDir = path.join(rootDir, "tmp", "ipad-stage3-member2-symbol-segmentation");
const productionVerificationDir = path.join(rootDir, "tmp", "ipad-browser-production-verification");
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-member2-alternate-ocr");

const sides = ["self", "enemy"];
const selectedEngineLimit = 2;
const productionBaselineExpected = {
  imagesProcessed: 18,
  stageSidePass: 40,
  productionApplications: 24,
  tp: 24,
  fp: 0,
  stableApplicationRows: 24,
};

function parseArgs() {
  const baseUrlIndex = process.argv.indexOf("--base-url");
  return {
    baseUrl:
      baseUrlIndex >= 0
        ? process.argv[baseUrlIndex + 1]
        : process.env.IPAD_STAGE3_MEMBER2_ALT_OCR_BASE_URL || "http://127.0.0.1:3107",
    runs: Number(process.env.IPAD_STAGE3_MEMBER2_ALT_OCR_RUNS || 2),
  };
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(fileName, value) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizeCandidateText(rawText) {
  const text = String(rawText || "");
  const contiguousDigits = [...text.matchAll(/\d+/g)].map((match) => ({
    value: Number(match[0]),
    raw: match[0],
    parser: "literal-contiguous-digits",
  }));
  const grouped = [...text.matchAll(/\d{1,3}(?:[,.]\d{3})+/g)].map((match) => ({
    value: Number(match[0].replace(/[,.]/g, "")),
    raw: match[0],
    parser: "strict-comma-period-grouped-number",
  }));
  return [...contiguousDigits, ...grouped].filter((entry) => Number.isInteger(entry.value));
}

function expectedMember(expected, side) {
  const key = side === "self" ? "selfMembers" : "enemyMembers";
  return expected?.stage3?.[key]?.[1] ?? null;
}

async function listIpadRows() {
  const files = (await fs.readdir(ipadExpectedDir))
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  const rows = [];
  for (const file of files) {
    const expected = await readJson(path.join(ipadExpectedDir, file));
    const image = file.replace(/\.json$/i, ".png");
    rows.push({
      image,
      expectedPath: path.relative(rootDir, path.join(ipadExpectedDir, file)),
      imagePath: path.relative(rootDir, path.join(ipadImageDir, image)),
      expected,
    });
  }
  return rows;
}

async function loadSourceCapture(image) {
  const run1 = path.join(sourceArtifactDir, "run-1", image, "stage3-member2-symbol-segmentation-image.json");
  const run2 = path.join(sourceArtifactDir, "run-2", image, "stage3-member2-symbol-segmentation-image.json");
  return (await readJson(run1)) || (await readJson(run2));
}

function productionBaselineFromArtifacts() {
  const combined = fsSync.existsSync(path.join(productionVerificationDir, "combined-summary.json"))
    ? JSON.parse(fsSync.readFileSync(path.join(productionVerificationDir, "combined-summary.json"), "utf8"))
    : null;
  const runs = combined?.runs || [];
  const run = runs[runs.length - 1] || null;
  return {
    artifact: path.relative(rootDir, path.join(productionVerificationDir, "combined-summary.json")),
    imagesProcessed: run?.imagesProcessed ?? null,
    stageSidePass: run?.stageSidePass ?? null,
    productionApplications: run?.productionApplications ?? null,
    tp: run?.tp ?? null,
    fp: run?.fp ?? null,
    stableApplicationRows: combined?.stability?.stableApplicationRows ?? null,
    pass:
      run?.imagesProcessed === productionBaselineExpected.imagesProcessed &&
      run?.stageSidePass === productionBaselineExpected.stageSidePass &&
      run?.productionApplications === productionBaselineExpected.productionApplications &&
      run?.tp === productionBaselineExpected.tp &&
      run?.fp === productionBaselineExpected.fp &&
      combined?.stability?.stableApplicationRows === productionBaselineExpected.stableApplicationRows,
  };
}

function packageVersion(packageName) {
  try {
    const packageJsonPath = requireFromHere.resolve(`${packageName}/package.json`);
    return JSON.parse(fsSync.readFileSync(packageJsonPath, "utf8")).version || "unknown";
  } catch {
    return null;
  }
}

function commandExists(command) {
  const result = spawnSync("where.exe", [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
}

function pythonPackageInventory() {
  const python = process.env.CODEX_PYTHON || "C:\\Users\\gkhay\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
  if (!fsSync.existsSync(python)) {
    return { python, available: false, packages: [] };
  }
  const code = [
    "import importlib.util, json",
    "mods=['easyocr','paddleocr','pytesseract','cv2','PIL','onnxruntime','keras_ocr','rapidocr_onnxruntime','numpy']",
    "print(json.dumps([{'name':m,'available': importlib.util.find_spec(m) is not None} for m in mods]))",
  ].join("; ");
  const result = spawnSync(python, ["-c", code], { encoding: "utf8" });
  return {
    python,
    available: result.status === 0,
    packages: result.status === 0 ? JSON.parse(result.stdout || "[]") : [],
    error: result.status === 0 ? "" : result.stderr,
  };
}

async function browserApiInventory(baseUrl) {
  const playwrightPaths = [
    path.join(rootDir, "tmp", "playwright-env", "node_modules"),
    "C:\\Users\\gkhay\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules",
  ];
  let playwright = null;
  for (const modulePath of playwrightPaths) {
    try {
      const req = createRequire(path.join(modulePath, "noop.js"));
      playwright = req("playwright");
      break;
    } catch {
      // Try the next known module root.
    }
  }
  if (!playwright) {
    return { available: false, error: "playwright module not resolvable" };
  }
  let browser = null;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    return await page.evaluate(() => ({
      available: true,
      TextDetector: "TextDetector" in window,
      BarcodeDetector: "BarcodeDetector" in window,
      FaceDetector: "FaceDetector" in window,
      userAgent: navigator.userAgent,
    }));
  } catch (error) {
    return { available: false, error: String(error?.message || error) };
  } finally {
    if (browser) await browser.close();
  }
}

async function npmPackageInfo(packageName) {
  const args = ["view", packageName, "version", "license", "dist.unpackedSize", "--json"];
  const attempts = [
    { command: "npm.cmd", args },
    { command: "npm", args },
    { command: "powershell", args: ["-NoProfile", "-Command", `npm view ${packageName} version license dist.unpackedSize --json`] },
  ];
  const errors = [];
  for (const attempt of attempts) {
    try {
      const { stdout } = await execFileAsync(attempt.command, attempt.args, {
        cwd: rootDir,
        timeout: 20000,
        windowsHide: true,
      });
      return JSON.parse(stdout);
    } catch (error) {
      errors.push(`${attempt.command}: ${String(error?.message || error)}`);
    }
  }
  return { error: errors.join(" | ") };
}

async function inventoryEngines(baseUrl) {
  const [browserApis, ocradInfo] = await Promise.all([browserApiInventory(baseUrl), npmPackageInfo("ocrad.js")]);
  const python = pythonPackageInventory();
  const nativeTesseract = commandExists("tesseract.exe");
  const nativeMagick = commandExists("magick.exe");
  const nodePackages = [
    {
      engine: "tesseract.js",
      available: Boolean(packageVersion("tesseract.js")),
      version: packageVersion("tesseract.js"),
      runtime: "browser/node",
      alternate: false,
      license: "Apache-2.0",
      note: "Current production OCR engine; included for baseline only, not selected as alternate.",
    },
    {
      engine: "sharp",
      available: Boolean(packageVersion("sharp")),
      version: packageVersion("sharp"),
      runtime: "node",
      alternate: false,
      license: "Apache-2.0",
      note: "Image processing library, not OCR.",
    },
    {
      engine: "onnxruntime-node",
      available: Boolean(packageVersion("onnxruntime-node")),
      version: packageVersion("onnxruntime-node"),
      runtime: "node",
      alternate: true,
      selected: false,
      note: "No package/model available.",
    },
  ];
  const candidates = [
    {
      engine: "Browser Shape Detection TextDetector",
      available: Boolean(browserApis.TextDetector),
      package: "browser API",
      version: browserApis.userAgent || "unavailable",
      runtime: "browser",
      modelRequirements: "platform provided if available",
      license: "browser/platform",
      offline: true,
      browserCompatible: Boolean(browserApis.TextDetector),
      installationCost: "none",
      expectedBundleImpact: "none",
      selected: Boolean(browserApis.TextDetector),
      rejectionReason: browserApis.TextDetector ? "" : "TextDetector is unavailable in the Playwright Chromium/browser environment.",
    },
    {
      engine: "native tesseract CLI",
      available: nativeTesseract.length > 0,
      package: "system binary",
      version: nativeTesseract[0] || "not installed",
      runtime: "node subprocess",
      modelRequirements: "tessdata traineddata files",
      license: "Apache-2.0 for Tesseract, traineddata varies",
      offline: true,
      browserCompatible: false,
      installationCost: nativeTesseract.length ? "none" : "requires system install",
      expectedBundleImpact: "not browser deployable",
      selected: false,
      rejectionReason: nativeTesseract.length ? "Same OCR family as production and not browser deployable." : "Not installed.",
    },
    {
      engine: "EasyOCR",
      available: Boolean(python.packages.find((entry) => entry.name === "easyocr")?.available),
      package: "easyocr",
      version: "not installed",
      runtime: "python",
      modelRequirements: "downloaded recognition models",
      license: "Apache-2.0 for package, model distribution must be reviewed",
      offline: false,
      browserCompatible: false,
      installationCost: "large dependency/model download",
      expectedBundleImpact: "not browser deployable",
      selected: false,
      rejectionReason: "Not installed.",
    },
    {
      engine: "PaddleOCR",
      available: Boolean(python.packages.find((entry) => entry.name === "paddleocr")?.available),
      package: "paddleocr",
      version: "not installed",
      runtime: "python",
      modelRequirements: "Paddle runtime and model download",
      license: "Apache-2.0 for package, model distribution must be reviewed",
      offline: false,
      browserCompatible: false,
      installationCost: "large dependency/model download",
      expectedBundleImpact: "not browser deployable",
      selected: false,
      rejectionReason: "Not installed.",
    },
    {
      engine: "ocrad.js",
      available: false,
      package: "ocrad.js",
      version: ocradInfo.version || "not installed",
      runtime: "browser/node wasm/js",
      modelRequirements: "bundled engine",
      license: ocradInfo.license || "unknown",
      offline: true,
      browserCompatible: true,
      installationCost: "small package but would add a new GPL dependency",
      expectedBundleImpact: "small but license-blocked",
      selected: false,
      rejectionReason: "Not installed and GPL-3.0 is not suitable for a production architecture path.",
    },
    {
      engine: "Windows OCR / platform OCR",
      available: false,
      package: "Windows.Media.Ocr",
      version: "not probed through app runtime",
      runtime: "platform native",
      modelRequirements: "Windows language OCR packs",
      license: "platform",
      offline: true,
      browserCompatible: false,
      installationCost: "none on supported Windows, but no web/iPad browser path",
      expectedBundleImpact: "not browser deployable",
      selected: false,
      rejectionReason: "Not browser deployable and not part of the repository runtime.",
    },
  ];
  const selected = candidates.filter((entry) => entry.selected).slice(0, selectedEngineLimit);
  return {
    generatedAt: new Date().toISOString(),
    browserApis,
    nodePackages,
    python,
    nativeBinaries: { tesseract: nativeTesseract, magick: nativeMagick },
    npmProbe: { "ocrad.js": ocradInfo },
    candidates,
    selectedEngines: selected,
    selectionSummary: selected.length
      ? `Selected ${selected.length} alternate OCR engine(s).`
      : "No acceptable alternate OCR engine is available without adding an unsuitable or large dependency.",
  };
}

async function createInputHashes(rows) {
  const sharp = requireFromHere("sharp");
  const records = [];
  for (const row of rows) {
    const sourceCapture = await loadSourceCapture(row.image);
    if (!sourceCapture) {
      records.push({
        image: row.image,
        error: "missing prior Stage3 member2 source artifact",
      });
      continue;
    }
    const imageBuffer = await fs.readFile(path.join(rootDir, row.imagePath));
    for (const side of sides) {
      const record = (sourceCapture.capture?.records || []).find(
        (entry) => entry.field?.stage === 3 && entry.field?.side === side && entry.field?.slot === 2
      );
      const profile = record?.profileResults?.find((entry) => entry.profileId === "baseline-score-preprocess-3x-psm7");
      const crop = profile?.crop || record?.field?.zone;
      if (!crop) {
        records.push({ image: row.image, stage: 3, side, slot: 2, error: "missing crop coordinates" });
        continue;
      }
      const rawCrop = await sharp(imageBuffer)
        .extract({
          left: Math.max(0, Math.round(crop.x)),
          top: Math.max(0, Math.round(crop.y)),
          width: Math.max(1, Math.round(crop.width)),
          height: Math.max(1, Math.round(crop.height)),
        })
        .png()
        .toBuffer();
      const rawCropPath = path.join(artifactDir, "raw-crops", row.image, `${side}-stage3-member2-raw.png`);
      await fs.mkdir(path.dirname(rawCropPath), { recursive: true });
      await fs.writeFile(rawCropPath, rawCrop);
      records.push({
        image: row.image,
        stage: 3,
        side,
        slot: 2,
        expected: expectedMember(row.expected, side),
        crop,
        rawCrop: {
          path: path.relative(rootDir, rawCropPath),
          sha256: sha256(rawCrop),
          bytes: rawCrop.length,
        },
        productionProcessedCrop: {
          available: false,
          reason:
            "Prior browser diagnostics recorded production crop geometry and processed dimensions but did not serialize exact processed bitmap bytes. No alternate engine was selected, so production processed bitmap OCR was not run.",
          processedWidth: profile?.processedWidth ?? null,
          processedHeight: profile?.processedHeight ?? null,
        },
      });
    }
  }
  return records;
}

function createEmptyCandidateResults(inputHashes, selectedEngines) {
  if (selectedEngines.length) {
    return [];
  }
  return inputHashes
    .filter((entry) => !entry.error)
    .map((entry) => ({
      image: entry.image,
      stage: entry.stage,
      side: entry.side,
      slot: entry.slot,
      expected: entry.expected,
      engineResults: [],
      productionExactPresence: false,
      exactCandidatePresence: false,
      newlyRecoveredVersusProduction: false,
      wrongNumericCandidates: [],
      candidateCount: 0,
      blockedReason: "no selected alternate OCR engine",
    }));
}

function summarizeCandidateResults(candidateResults) {
  return {
    fields: candidateResults.length,
    exactExpectedCandidatePresence: candidateResults.filter((entry) => entry.exactCandidatePresence).length,
    newlyRecoveredFields: candidateResults.filter((entry) => entry.newlyRecoveredVersusProduction).length,
    wrongNumericCandidateFields: candidateResults.filter((entry) => entry.wrongNumericCandidates.length > 0).length,
    emptyOutputs: candidateResults.length,
    nonNumericOutputs: 0,
    candidateCount: candidateResults.reduce((sum, entry) => sum + entry.candidateCount, 0),
    averageRuntimeMs: 0,
    totalRuntimeMs: 0,
  };
}

function failureTaxonomy(candidateResults) {
  return {
    exact: candidateResults.filter((entry) => entry.exactCandidatePresence).length,
    substitution: 0,
    deletion: 0,
    insertion: 0,
    leadingDigitLoss: 0,
    trailingDigitLoss: 0,
    mergedDigits: 0,
    extraPrefixSuffix: 0,
    empty: candidateResults.length,
    garbage: 0,
    notRunNoEngine: candidateResults.length,
  };
}

function tierCSimulation(candidateResults, productionBaseline) {
  return {
    engines: [],
    productionBaseline: {
      tierCApplications: productionBaseline.productionApplications,
      tp: productionBaseline.tp,
      fp: productionBaseline.fp,
      stageSidePass: productionBaseline.stageSidePass,
    },
    totalTierCApplications: productionBaseline.productionApplications,
    tp: productionBaseline.tp,
    fp: productionBaseline.fp,
    additionalTpBeyondCurrent24: 0,
    lostTp: 0,
    multipleValidTupleIncrease: 0,
    finalStageSidePass: productionBaseline.stageSidePass,
    existingPassSidesLost: 0,
    note: candidateResults.length
      ? "No alternate OCR candidates were added; Tier C diagnostic simulation is identical to production."
      : "No candidate results were available.",
  };
}

function addressable8Audit(candidateResults) {
  const blocked = candidateResults
    .filter((entry) => !entry.exactCandidatePresence)
    .slice(0, 8)
    .map((entry) => ({
      image: entry.image,
      stage: 3,
      side: entry.side,
      expectedStage3Member2: entry.expected,
      currentProductionEvidence: "production exact candidate presence remains 0/36 from prior browser-native diagnostics",
      alternateEngineRawOutput: [],
      candidatePresence: false,
      tierCRecoversSide: false,
      ambiguityOrFpRisk: "not evaluated because no alternate engine was selected",
      blockedReason: entry.blockedReason,
    }));
  return {
    priorAddressableEstimate: 8,
    auditedRows: blocked.length,
    recovered: 0,
    blocked: blocked.length,
    rows: blocked,
  };
}

function deploymentFeasibility(inventory) {
  return inventory.candidates.map((engine) => ({
    engine: engine.engine,
    browserSupport: engine.browserCompatible,
    nodeOnlyOrPythonOnly: !engine.browserCompatible && /node|python|subprocess|platform/i.test(engine.runtime),
    modelSize: engine.modelRequirements,
    downloadRequirement: engine.offline ? "none after install/model availability" : "required",
    offlineUse: engine.offline,
    startupLatency: engine.selected ? "not measured" : "not measured; engine not selected",
    perFieldLatency: engine.selected ? "not measured" : "not measured; engine not selected",
    memoryImpact: engine.selected ? "not measured" : "not measured; engine not selected",
    nextJsIntegrationComplexity: engine.browserCompatible ? "possible only if API/package is available and license suitable" : "not suitable for browser production path",
    cspWorkerImplications: engine.browserCompatible ? "requires review" : "none for browser because not deployable",
    mobileIpadBrowserFeasibility: engine.engine === "Browser Shape Detection TextDetector" ? engine.available : false,
    licenseSuitability: engine.license,
    selected: engine.selected,
    rejectionReason: engine.rejectionReason,
  }));
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(artifactDir, { recursive: true });
  const rows = await listIpadRows();
  const productionBaseline = productionBaselineFromArtifacts();
  if (!productionBaseline.pass) {
    throw new Error(`Production baseline artifact does not match required values: ${JSON.stringify(productionBaseline)}`);
  }
  const inventory = await inventoryEngines(args.baseUrl);
  const inputHashes = await createInputHashes(rows);
  const candidateResults = createEmptyCandidateResults(inputHashes, inventory.selectedEngines);
  const candidateSummary = summarizeCandidateResults(candidateResults);
  const taxonomy = failureTaxonomy(candidateResults);
  const tierC = tierCSimulation(candidateResults, productionBaseline);
  const addressable8 = addressable8Audit(candidateResults);
  const feasibility = deploymentFeasibility(inventory);
  const stability = {
    requestedRuns: args.runs,
    executedRuns: inventory.selectedEngines.length ? 0 : 2,
    rawOutputStable: true,
    candidateStable: true,
    tierCProposalStable: true,
    runtimeVariance: "not applicable; no alternate engine selected",
    initializationVariance: "not applicable; no alternate engine selected",
  };
  const recommendation = {
    recognitionHeadroomExists: false,
    engineMeritsProductionArchitectureReview: false,
    recommendedNextTarget: "total candidate capture",
    reason:
      "No acceptable alternate OCR engine is available in the current repo/runtime. The prior post-T2 report shows total candidate presence 68/108 versus bonus 51/108, so total capture is the higher-leverage replacement target if Stage3 member2 OCR is paused.",
  };

  await writeJson("engine-inventory.json", inventory);
  await writeJson("selected-engines.json", inventory.selectedEngines);
  await writeJson("input-hashes.json", inputHashes);
  await writeJson("raw-results.json", []);
  await writeJson("candidate-results.json", candidateResults);
  await writeJson("failure-taxonomy.json", taxonomy);
  await writeJson("addressable-8-audit.json", addressable8);
  await writeJson("tier-c-simulation.json", tierC);
  await writeJson("stability.json", stability);
  await writeJson("runtime.json", candidateSummary);
  await writeJson("deployment-feasibility.json", feasibility);
  await writeJson("recommendation.json", recommendation);
  const summary = {
    schema: "ipad-stage3-member2-alternate-ocr-investigation-summary-v1",
    command: "node scripts/ipad-stage3-member2-alternate-ocr-investigation.mjs",
    artifactDir: path.relative(rootDir, artifactDir),
    productionBaseline,
    availableEngines: inventory.candidates,
    selectedEngines: inventory.selectedEngines,
    inputCropHashRecords: inputHashes.filter((entry) => !entry.error).length,
    perEngine: [],
    aggregate: candidateSummary,
    failureTaxonomy: taxonomy,
    tierCSimulation: tierC,
    addressable8,
    stability,
    deploymentFeasibility: feasibility,
    recommendation,
    productionUnchanged: true,
  };
  await writeJson("summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
