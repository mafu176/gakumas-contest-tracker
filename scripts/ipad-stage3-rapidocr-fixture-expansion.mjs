import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  buildIpadArithmeticRoiTemplate,
  padIpadArithmeticFieldZone,
} from "../app/lib/ocr.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const requireFromHere = createRequire(import.meta.url);

const ipadImageDir = path.join(rootDir, "regression-test", "ipad");
const ipadExpectedDir = path.join(rootDir, "regression-test", "expected-ipad");
const expandedBaselineDir = path.join(rootDir, "tmp", "ipad-expanded-baseline");
const artifactDir = path.join(rootDir, "tmp", "ipad-stage3-rapidocr-fixture-expansion");
const rapidOcrTargetDir = path.join(rootDir, "tmp", "rapidocr-python");

const stages = [3];
const sides = ["self", "enemy"];
const fields = ["member1", "member2", "member3", "bonus", "total"];
function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizePathForReport(value) {
  return path.relative(rootDir, value).replaceAll("\\", "/");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(name, value) {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
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

function pythonInventory() {
  const python =
    process.env.CODEX_PYTHON ||
    "C:\\Users\\gkhay\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
  const code = `
import importlib.util, json, sys
mods = ["easyocr","paddleocr","rapidocr_onnxruntime","rapidocr","onnxruntime","cv2","PIL","numpy","torch","tensorflow","keras_ocr"]
rows = []
for mod_name in mods:
    spec = importlib.util.find_spec(mod_name)
    version = None
    if spec:
        try:
            mod = __import__(mod_name)
            version = getattr(mod, "__version__", None)
        except Exception as exc:
            version = "import-error:" + str(exc)
    rows.append({"name": mod_name, "available": spec is not None, "version": version})
print(json.dumps({"python": sys.executable, "packages": rows}))
`;
  const base = fsSync.existsSync(python)
    ? spawnSync(python, ["-c", code], { encoding: "utf8" })
    : { status: 1, stderr: "python missing" };
  const withRapidTarget = fsSync.existsSync(rapidOcrTargetDir)
    ? spawnSync(
        python,
        [
          "-c",
          `import sys; sys.path.insert(0, r"${rapidOcrTargetDir}"); ${code}`,
        ],
        { encoding: "utf8" }
      )
    : null;
  return {
    python,
    base:
      base.status === 0
        ? JSON.parse(base.stdout || "{}")
        : { available: false, error: base.stderr || base.stdout || "python inventory failed" },
    withRapidOcrTarget:
      withRapidTarget?.status === 0
        ? JSON.parse(withRapidTarget.stdout || "{}")
        : {
            available: false,
            targetDir: normalizePathForReport(rapidOcrTargetDir),
            error: withRapidTarget ? withRapidTarget.stderr || withRapidTarget.stdout : "target directory missing",
          },
  };
}

function engineInventory() {
  const python = pythonInventory();
  const nodePackages = {
    "tesseract.js": packageVersion("tesseract.js"),
    sharp: packageVersion("sharp"),
    "onnxruntime-node": packageVersion("onnxruntime-node"),
    "onnxruntime-web": packageVersion("onnxruntime-web"),
    "@tensorflow/tfjs": packageVersion("@tensorflow/tfjs"),
  };
  const rapidPackage =
    python.withRapidOcrTarget?.packages?.find((entry) => entry.name === "rapidocr_onnxruntime") || null;
  return {
    generatedAt: new Date().toISOString(),
    localCommands: {
      tesseract: commandExists("tesseract"),
      paddleocr: commandExists("paddleocr"),
      rapidocr_onnxruntime: commandExists("rapidocr_onnxruntime"),
      python: commandExists("python"),
      node: commandExists("node"),
    },
    nodePackages,
    python,
    candidates: [
      {
        engine: "PaddleOCR",
        installed: Boolean(python.base?.packages?.find((entry) => entry.name === "paddleocr")?.available),
        languageRuntime: "Python",
        cpuSupport: true,
        gpuRequirement: "optional; CPU possible but heavy",
        offlineCapability: "after model download",
        modelDownloadRequirement: "yes",
        modelSize: "large",
        license: "Apache-2.0 upstream, dependency review required",
        browserDeployability: "not practical directly",
        nodeDeployability: "subprocess only",
        limitation: "large framework; not installed",
        integrationComplexity: "high",
        selectedForTesting: false,
      },
      {
        engine: "EasyOCR",
        installed: Boolean(python.base?.packages?.find((entry) => entry.name === "easyocr")?.available),
        languageRuntime: "Python/PyTorch",
        cpuSupport: true,
        gpuRequirement: "optional; PyTorch stack heavy",
        offlineCapability: "after model download",
        modelDownloadRequirement: "yes",
        modelSize: "large",
        license: "Apache-2.0 project, dependency review required",
        browserDeployability: "not practical directly",
        nodeDeployability: "subprocess only",
        limitation: "large PyTorch dependency; not installed",
        integrationComplexity: "high",
        selectedForTesting: false,
      },
      {
        engine: "RapidOCR ONNXRuntime",
        installed: Boolean(rapidPackage?.available),
        packageVersion: rapidPackage?.version || null,
        languageRuntime: "Python + ONNXRuntime + OpenCV",
        cpuSupport: true,
        gpuRequirement: "none for this diagnostic",
        offlineCapability: "yes after package/model install",
        modelDownloadRequirement: "no additional download observed after pip target install",
        modelSize: "moderate; temporary pip target under tmp/",
        license: "Apache-2.0/MIT-style dependency review required before product use",
        browserDeployability: "not direct; possible future ONNX Runtime Web rewrite/model conversion",
        nodeDeployability: "Python subprocess or ONNX port",
        limitation: "diagnostic-only Python dependency in tmp/",
        integrationComplexity: "medium-high",
        selectedForTesting: Boolean(rapidPackage?.available),
      },
      {
        engine: "ONNX Runtime OCR/digit model",
        installed: Boolean(nodePackages["onnxruntime-node"] || python.base?.packages?.find((entry) => entry.name === "onnxruntime")?.available),
        languageRuntime: "Node/Python/Browser possible depending model",
        cpuSupport: true,
        gpuRequirement: "not required",
        offlineCapability: "yes with bundled model",
        modelDownloadRequirement: "requires a model; none exists in repo",
        modelSize: "model-dependent",
        license: "model-dependent",
        browserDeployability: "possible via onnxruntime-web, but package not installed",
        nodeDeployability: "possible with onnxruntime-node, not installed",
        limitation: "no suitable OCR/digit model available locally",
        integrationComplexity: "medium if model chosen, high if trained",
        selectedForTesting: false,
      },
      {
        engine: "OpenCV/Pillow connected-component digit segmentation",
        installed: true,
        languageRuntime: "Node sharp + Python/Pillow/Numpy diagnostics",
        cpuSupport: true,
        gpuRequirement: "none",
        offlineCapability: "yes",
        modelDownloadRequirement: "none",
        modelSize: "none without classifier",
        license: "uses existing local libraries",
        browserDeployability: "possible as canvas/WASM segmentation, but classifier needed",
        nodeDeployability: "yes",
        limitation: "segmentation only; no digit classifier is available without training/model",
        integrationComplexity: "medium for segmentation, high for accurate classifier",
        selectedForTesting: true,
      },
      {
        engine: "Browser Shape Detection TextDetector",
        installed: false,
        languageRuntime: "Browser",
        cpuSupport: true,
        gpuRequirement: "none",
        offlineCapability: "browser-dependent",
        modelDownloadRequirement: "none exposed by app",
        modelSize: "browser-owned",
        license: "browser API",
        browserDeployability: "not available in current Chromium path",
        nodeDeployability: "no",
        limitation: "not exposed/portable",
        integrationComplexity: "low if available, currently unavailable",
        selectedForTesting: false,
      },
    ],
  };
}

async function collectFixtures() {
  const manifest = await readJson(path.join(ipadExpectedDir, "manifest.json"));
  const rows = [];
  for (const entry of manifest.images || []) {
    if (entry.expectedStatus !== "complete") continue;
    const expectedFixture = entry.expectedFixture || entry.filename.replace(/\.png$/i, ".json");
    rows.push({
      ...entry,
      imagePath: path.join(ipadImageDir, entry.filename),
      expectedPath: path.join(ipadExpectedDir, expectedFixture),
      expected: await readJson(path.join(ipadExpectedDir, expectedFixture)),
      productionResultPath: path.join(expandedBaselineDir, "run-1", entry.filename, "production-result.json"),
      productionResult: await readJson(path.join(expandedBaselineDir, "run-1", entry.filename, "production-result.json")),
    });
  }
  return rows;
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

function fieldSpecKey(field) {
  if (field.field === "member") return `member${field.slot}`;
  return field.field;
}

function clampRect(rect, image) {
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  return {
    x,
    y,
    width: Math.max(1, Math.min(Math.round(rect.width), image.width - x)),
    height: Math.max(1, Math.min(Math.round(rect.height), image.height - y)),
  };
}

function unionRects(rects, padRatio, image) {
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  const padX = Math.max(2, Math.round((right - left) * padRatio));
  const padY = Math.max(2, Math.round((bottom - top) * padRatio));
  return clampRect(
    {
      x: left - padX,
      y: top - padY,
      width: right - left + padX * 2,
      height: bottom - top + padY * 2,
    },
    image
  );
}

async function cropBuffer(sharp, imagePath, rect) {
  return await sharp(imagePath)
    .extract({ left: rect.x, top: rect.y, width: rect.width, height: rect.height })
    .png()
    .toBuffer();
}

async function createCropManifest(rows) {
  const sharp = requireFromHere("sharp");
  const records = [];
  const inputHashes = [];
  for (const row of rows) {
    const metadata = await sharp(row.imagePath).metadata();
    const image = { width: metadata.width, height: metadata.height };
    const imageBytes = await fs.readFile(row.imagePath);
    const template = buildIpadArithmeticRoiTemplate(image);
    inputHashes.push({
      image: row.filename,
      sourceImage: normalizePathForReport(row.imagePath),
      sourceSha256: sha256(imageBytes),
      width: image.width,
      height: image.height,
      clusterId: row.clusterId,
    });

    const stage3Fields = template.fields.filter((field) => field.stage === 3);
    for (const side of sides) {
      const sideFields = stage3Fields.filter((field) => field.side === side);
      const sideExpected = expectedSide(row.expected.stage3, side);
      for (const field of sideFields) {
        const label = fieldSpecKey(field);
        const rect = clampRect(padIpadArithmeticFieldZone(field, image, 0.12), image);
        const buffer = await cropBuffer(sharp, row.imagePath, rect);
        const cropPath = path.join(artifactDir, "crops", row.filename, `stage3-${side}-${label}.png`);
        await fs.mkdir(path.dirname(cropPath), { recursive: true });
        await fs.writeFile(cropPath, buffer);
        records.push({
          cropId: `${row.filename}|stage3|${side}|${label}|field`,
          image: row.filename,
          clusterId: row.clusterId,
          stage: 3,
          side,
          field: label,
          cropKind: "field",
          sourceImage: normalizePathForReport(row.imagePath),
          cropPath: normalizePathForReport(cropPath),
          rect,
          width: rect.width,
          height: rect.height,
          sha256: sha256(buffer),
          expected: sideExpected[label],
        });
      }

      const memberRects = sideFields
        .filter((field) => field.field === "member")
        .map((field) => clampRect(field.zone, image));
      const f1Rect = unionRects(memberRects, 0.08, image);
      const f1Buffer = await cropBuffer(sharp, row.imagePath, f1Rect);
      const f1Path = path.join(artifactDir, "crops", row.filename, `stage3-${side}-f1-member-row.png`);
      await fs.mkdir(path.dirname(f1Path), { recursive: true });
      await fs.writeFile(f1Path, f1Buffer);
      records.push({
        cropId: `${row.filename}|stage3|${side}|f1-member-row`,
        image: row.filename,
        clusterId: row.clusterId,
        stage: 3,
        side,
        field: "side",
        cropKind: "f1-member-row",
        sourceImage: normalizePathForReport(row.imagePath),
        cropPath: normalizePathForReport(f1Path),
        rect: f1Rect,
        width: f1Rect.width,
        height: f1Rect.height,
        sha256: sha256(f1Buffer),
        fieldRects: Object.fromEntries(
          sideFields
            .filter((field) => field.field === "member")
            .map((field) => [fieldSpecKey(field), clampRect(field.zone, image)])
        ),
      });

      const sideZone = template.stageSideZones.find((zone) => zone.stage === 3 && zone.side === side);
      const f2Rect = clampRect(sideZone.zone, image);
      const f2Buffer = await cropBuffer(sharp, row.imagePath, f2Rect);
      const f2Path = path.join(artifactDir, "crops", row.filename, `stage3-${side}-f2-full-side.png`);
      await fs.writeFile(f2Path, f2Buffer);
      records.push({
        cropId: `${row.filename}|stage3|${side}|f2-full-side`,
        image: row.filename,
        clusterId: row.clusterId,
        stage: 3,
        side,
        field: "side",
        cropKind: "f2-full-side",
        sourceImage: normalizePathForReport(row.imagePath),
        cropPath: normalizePathForReport(f2Path),
        rect: f2Rect,
        width: f2Rect.width,
        height: f2Rect.height,
        sha256: sha256(f2Buffer),
        fieldRects: Object.fromEntries(sideFields.map((field) => [fieldSpecKey(field), clampRect(field.zone, image)])),
      });
    }
  }
  const manifest = {
    schema: "ipad-stage3-alternate-model-crop-manifest-v1",
    fixtureCount: rows.length,
    stageSides: rows.length * 2,
    fieldCrops: records.filter((entry) => entry.cropKind === "field").length,
    f1Crops: records.filter((entry) => entry.cropKind === "f1-member-row").length,
    f2Crops: records.filter((entry) => entry.cropKind === "f2-full-side").length,
    records,
  };
  await writeJson("crop-manifest.json", manifest);
  await writeJson("input-hashes.json", inputHashes);
  return manifest;
}

function rapidOcrPythonScript() {
  return String.raw`
import json, os, sys, time, traceback
sys.path.insert(0, os.environ.get("RAPIDOCR_TARGET_DIR", ""))
from rapidocr_onnxruntime import RapidOCR

root = os.environ["ALT_OCR_ROOT"]
manifest_path = os.environ["ALT_OCR_MANIFEST"]
out_path = os.environ["ALT_OCR_OUT"]
with open(manifest_path, "r", encoding="utf-8") as handle:
    manifest = json.load(handle)

ocr = RapidOCR()
profiles = [
    {"id": "rapidocr-recognition-only", "use_det": False, "use_cls": False, "use_rec": True, "cropKinds": ["field"]},
    {"id": "rapidocr-detect-recognize", "use_det": True, "use_cls": False, "use_rec": True, "cropKinds": ["field", "f1-member-row", "f2-full-side"]},
]
results = []
load_done = time.perf_counter()
for record in manifest["records"]:
    crop_path = os.path.join(root, record["cropPath"].replace("/", os.sep))
    for profile in profiles:
        if record["cropKind"] not in profile["cropKinds"]:
            continue
        started = time.perf_counter()
        try:
            raw, elapsed = ocr(
                crop_path,
                use_det=profile["use_det"],
                use_cls=profile["use_cls"],
                use_rec=profile["use_rec"],
            )
            error = None
        except Exception as exc:
            raw = None
            elapsed = None
            error = str(exc) + "\n" + traceback.format_exc()
        duration = (time.perf_counter() - started) * 1000
        normalized = []
        if raw:
            if profile["use_det"]:
                for item in raw:
                    if not item:
                        continue
                    bbox = item[0] if len(item) > 0 else None
                    text = item[1] if len(item) > 1 else ""
                    confidence = item[2] if len(item) > 2 else None
                    normalized.append({"text": text, "confidence": confidence, "bbox": bbox})
            else:
                for item in raw:
                    text = item[0] if len(item) > 0 else ""
                    confidence = item[1] if len(item) > 1 else None
                    normalized.append({"text": text, "confidence": confidence, "bbox": None})
        results.append({
            "cropId": record["cropId"],
            "image": record["image"],
            "stage": record["stage"],
            "side": record["side"],
            "field": record["field"],
            "cropKind": record["cropKind"],
            "profileId": profile["id"],
            "durationMs": round(duration, 3),
            "engineElapsed": elapsed,
            "items": normalized,
            "error": error,
        })

with open(out_path, "w", encoding="utf-8") as handle:
    json.dump({
        "schema": "ipad-stage3-rapidocr-results-v1",
        "resultCount": len(results),
        "modelLoadAndSetupMs": round((load_done - time.perf_counter()) * -1000, 3),
        "results": results,
    }, handle, ensure_ascii=False, indent=2)
`;
}

async function runRapidOcr(manifest) {
  const inventory = pythonInventory();
  const rapidPackage =
    inventory.withRapidOcrTarget?.packages?.find((entry) => entry.name === "rapidocr_onnxruntime") || null;
  if (!rapidPackage?.available) {
    return {
      available: false,
      reason: "rapidocr_onnxruntime is not available in tmp/rapidocr-python",
      results: [],
    };
  }
  const python = inventory.python;
  const helperPath = path.join(artifactDir, "rapidocr_runner.py");
  const rawOutPath = path.join(artifactDir, "rapidocr-raw-results.json");
  await fs.writeFile(helperPath, rapidOcrPythonScript());
  const started = Date.now();
  const result = spawnSync(python, [helperPath], {
    cwd: rootDir,
    encoding: "utf8",
    timeout: 900000,
    env: {
      ...process.env,
      RAPIDOCR_TARGET_DIR: rapidOcrTargetDir,
      ALT_OCR_ROOT: rootDir,
      ALT_OCR_MANIFEST: path.join(artifactDir, "crop-manifest.json"),
      ALT_OCR_OUT: rawOutPath,
    },
  });
  if (result.status !== 0) {
    return {
      available: true,
      failed: true,
      durationMs: Date.now() - started,
      stdout: result.stdout,
      stderr: result.stderr,
      results: [],
    };
  }
  const payload = await readJson(rawOutPath);
  await writeJson("raw-results.json", payload);
  return {
    available: true,
    failed: false,
    durationMs: Date.now() - started,
    resultCount: payload.resultCount,
    results: payload.results || [],
  };
}

function parseCandidateText(text) {
  const candidates = [];
  const seen = new Set();
  const add = (raw, parser, index) => {
    const normalized = String(raw || "").replace(/[^\d]/g, "");
    if (!normalized) return;
    const value = Number(normalized);
    if (!Number.isInteger(value) || value <= 0 || value > 9999999) return;
    const key = `${value}|${raw}|${parser}|${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      value,
      raw,
      normalized,
      parser,
      index,
      digitCount: normalized.length,
    });
  };
  for (const match of String(text || "").matchAll(/\d+/g)) {
    add(match[0], "literal-contiguous-digits", match.index || 0);
  }
  for (const match of String(text || "").matchAll(/\d{1,3}(?:[,.]\d{3})+/g)) {
    add(match[0], "strict-comma-period-grouped-number", match.index || 0);
  }
  return candidates;
}

function bboxToAbsolute(itemBbox, cropRect) {
  if (!Array.isArray(itemBbox) || itemBbox.length === 0) return null;
  const xs = itemBbox.map((point) => Number(point?.[0] || 0));
  const ys = itemBbox.map((point) => Number(point?.[1] || 0));
  const x = cropRect.x + Math.min(...xs);
  const y = cropRect.y + Math.min(...ys);
  const right = cropRect.x + Math.max(...xs);
  const bottom = cropRect.y + Math.max(...ys);
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}

function rectOverlapRatio(a, b) {
  if (!a || !b) return 0;
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, right - left) * Math.max(0, bottom - top);
  const area = Math.max(1, a.width * a.height);
  return overlap / area;
}

function assignDetectionToField(absBbox, fieldRects = {}) {
  const ranked = Object.entries(fieldRects)
    .map(([field, rect]) => ({ field, overlap: rectOverlapRatio(absBbox, rect) }))
    .filter((entry) => entry.overlap > 0.12)
    .sort((a, b) => b.overlap - a.overlap);
  if (ranked.length === 0) return { assignedField: null, ambiguous: false, candidates: [] };
  const ambiguous = ranked.length > 1 && ranked[1].overlap > ranked[0].overlap * 0.75;
  return { assignedField: ambiguous ? null : ranked[0].field, ambiguous, candidates: ranked };
}

function buildCandidateResults(rapidResults, manifest) {
  const recordsById = new Map(manifest.records.map((record) => [record.cropId, record]));
  const rows = [];
  for (const result of rapidResults) {
    const record = recordsById.get(result.cropId);
    if (!record) continue;
    for (const [itemIndex, item] of (result.items || []).entries()) {
      const absBbox = bboxToAbsolute(item.bbox, record.rect);
      const assignment =
        record.cropKind === "field"
          ? { assignedField: record.field, ambiguous: false, candidates: [{ field: record.field, overlap: 1 }] }
          : assignDetectionToField(absBbox, record.fieldRects || {});
      for (const parsed of parseCandidateText(item.text)) {
        rows.push({
          image: result.image,
          stage: 3,
          side: result.side,
          sourceField: result.field,
          assignedField: assignment.assignedField,
          cropKind: result.cropKind,
          profileId: result.profileId,
          value: parsed.value,
          raw: parsed.raw,
          fullText: item.text,
          parser: parsed.parser,
          confidence: item.confidence,
          itemIndex,
          bbox: absBbox,
          assignment,
          durationMs: result.durationMs,
          exactExpected: false,
        });
      }
    }
  }
  return rows;
}

function buildExpectedLookup(rows) {
  const lookup = new Map();
  for (const row of rows) {
    for (const side of sides) {
      const expected = expectedSide(row.expected.stage3, side);
      for (const field of fields) {
        lookup.set(`${row.filename}|3|${side}|${field}`, expected[field]);
      }
    }
  }
  return lookup;
}

function fieldExactSummary(candidateRows, expectedLookup) {
  const summary = {};
  const exactKeys = new Set();
  const wrongKeys = new Set();
  for (const field of fields) {
    summary[field] = { exact: 0, wrongCandidateFields: 0, empty: 0, total: 0 };
  }
  for (const row of candidateRows) {
    if (!fields.includes(row.assignedField)) continue;
    const key = `${row.image}|3|${row.side}|${row.assignedField}`;
    const expected = expectedLookup.get(key);
    if (row.value === expected) {
      exactKeys.add(key);
      row.exactExpected = true;
    } else {
      wrongKeys.add(key);
    }
  }
  for (const field of fields) {
    const fieldKeys = [...expectedLookup.keys()].filter((key) => key.endsWith(`|${field}`));
    summary[field].total = fieldKeys.length;
    summary[field].exact = fieldKeys.filter((key) => exactKeys.has(key)).length;
    summary[field].wrongCandidateFields = fieldKeys.filter((key) => wrongKeys.has(key)).length;
    summary[field].empty = fieldKeys.length - fieldKeys.filter((key) => exactKeys.has(key) || wrongKeys.has(key)).length;
  }
  return summary;
}

function productionStage3Actual(row, side) {
  const perSide = (row.productionResult.perSide || []).find((entry) => entry.stage === 3 && entry.side === side);
  return perSide?.actual || { members: [0, 0, 0], bonus: 0, total: 0 };
}

function addCandidate(set, value) {
  const number = toNumber(value);
  if (Number.isInteger(number) && number >= 0 && number <= 9999999) set.add(number);
}

function buildStageCandidateSets(rows, candidateRows) {
  const byStage = new Map();
  for (const row of rows) {
    const key = `${row.filename}|3`;
    byStage.set(key, {
      image: row.filename,
      expected: row.expected.stage3,
      sets: Object.fromEntries(
        sides.map((side) => [
          side,
          Object.fromEntries(fields.map((field) => [field, new Set()])),
        ])
      ),
    });
    for (const side of sides) {
      const actual = productionStage3Actual(row, side);
      addCandidate(byStage.get(key).sets[side].member1, actual.members?.[0]);
      addCandidate(byStage.get(key).sets[side].member2, actual.members?.[1]);
      addCandidate(byStage.get(key).sets[side].member3, actual.members?.[2]);
      addCandidate(byStage.get(key).sets[side].bonus, actual.bonus);
      addCandidate(byStage.get(key).sets[side].total, actual.total);
      addCandidate(byStage.get(key).sets[side].bonus, 0);
    }
  }
  for (const candidate of candidateRows) {
    if (!fields.includes(candidate.assignedField)) continue;
    const stage = byStage.get(`${candidate.image}|3`);
    if (!stage) continue;
    addCandidate(stage.sets[candidate.side][candidate.assignedField], candidate.value);
  }
  return [...byStage.values()].map((stage) => ({
    ...stage,
    sets: Object.fromEntries(
      sides.map((side) => [
        side,
        Object.fromEntries(fields.map((field) => [field, [...stage.sets[side][field]].slice(0, 12)])),
      ])
    ),
  }));
}

function cartesian(arrays, limit = 50000) {
  let tuples = [[]];
  for (const values of arrays) {
    const next = [];
    for (const tuple of tuples) {
      for (const value of values) {
        next.push([...tuple, value]);
        if (next.length > limit) return { tuples: next, capped: true };
      }
    }
    tuples = next;
  }
  return { tuples, capped: false };
}

function evaluateStageWideSimulation(stageSets) {
  const accepted = [];
  const blocked = [];
  for (const stage of stageSets) {
    const arrays = [
      stage.sets.self.member1,
      stage.sets.self.member2,
      stage.sets.self.member3,
      stage.sets.enemy.member1,
      stage.sets.enemy.member2,
      stage.sets.enemy.member3,
    ];
    if (arrays.some((values) => values.length === 0)) {
      blocked.push({ image: stage.image, reason: "missing-member-candidate-set" });
      continue;
    }
    const { tuples, capped } = cartesian(arrays, 50000);
    if (capped) {
      blocked.push({ image: stage.image, reason: "candidate-combination-cap" });
      continue;
    }
    const valid = [];
    for (const tuple of tuples) {
      const selfMembers = tuple.slice(0, 3);
      const enemyMembers = tuple.slice(3, 6);
      const allMembers = [...selfMembers, ...enemyMembers];
      const max = Math.max(...allMembers);
      if (allMembers.filter((value) => value === max).length !== 1) continue;
      const winningSide = selfMembers.includes(max) ? "self" : "enemy";
      const bonus = Math.floor(max * 0.2);
      const selfBonus = winningSide === "self" ? bonus : 0;
      const enemyBonus = winningSide === "enemy" ? bonus : 0;
      const selfTotal = selfMembers.reduce((sum, value) => sum + value, 0) + selfBonus;
      const enemyTotal = enemyMembers.reduce((sum, value) => sum + value, 0) + enemyBonus;
      if (!stage.sets.self.total.includes(selfTotal)) continue;
      if (!stage.sets.enemy.total.includes(enemyTotal)) continue;
      if (!stage.sets.self.bonus.includes(selfBonus)) continue;
      if (!stage.sets.enemy.bonus.includes(enemyBonus)) continue;
      valid.push({ selfMembers, enemyMembers, selfBonus, enemyBonus, selfTotal, enemyTotal, winningSide, max });
      if (valid.length > 1) break;
    }
    if (valid.length === 1) {
      accepted.push({ image: stage.image, stage: 3, proposal: valid[0] });
    } else {
      blocked.push({ image: stage.image, reason: valid.length > 1 ? "multiple-valid-tuples" : "no-valid-tuple" });
    }
  }
  return { accepted, blocked };
}

function scoreSimulation(simulation, rows) {
  const expectedByImage = new Map(rows.map((row) => [row.filename, row.expected.stage3]));
  let tpSides = 0;
  let fpSides = 0;
  const acceptedRows = [];
  for (const entry of simulation.accepted) {
    const expected = expectedByImage.get(entry.image);
    const proposal = entry.proposal;
    for (const side of sides) {
      const actual = {
        members: side === "self" ? proposal.selfMembers : proposal.enemyMembers,
        bonus: side === "self" ? proposal.selfBonus : proposal.enemyBonus,
        total: side === "self" ? proposal.selfTotal : proposal.enemyTotal,
      };
      const expectedSideValues = expectedSide(expected, side);
      const pass =
        actual.members.join(",") ===
          [expectedSideValues.member1, expectedSideValues.member2, expectedSideValues.member3].join(",") &&
        actual.bonus === expectedSideValues.bonus &&
        actual.total === expectedSideValues.total;
      if (pass) tpSides += 1;
      else fpSides += 1;
      acceptedRows.push({ image: entry.image, stage: 3, side, pass, actual, expected: expectedSideValues });
    }
  }
  return {
    acceptedStages: simulation.accepted.length,
    tpStageSides: tpSides,
    fpStageSides: fpSides,
    blockedStages: simulation.blocked.length,
    stage3StageSidePass: tpSides,
    acceptedRows,
    blockedRows: simulation.blocked,
  };
}

function productionSideValues(row, side) {
  const actual = productionStage3Actual(row, side);
  return {
    member1: Number(actual.members?.[0] || 0),
    member2: Number(actual.members?.[1] || 0),
    member3: Number(actual.members?.[2] || 0),
    bonus: Number(actual.bonus || 0),
    total: Number(actual.total || 0),
  };
}

function proposalSideValues(proposal, side) {
  return {
    member1: Number((side === "self" ? proposal.selfMembers : proposal.enemyMembers)[0] || 0),
    member2: Number((side === "self" ? proposal.selfMembers : proposal.enemyMembers)[1] || 0),
    member3: Number((side === "self" ? proposal.selfMembers : proposal.enemyMembers)[2] || 0),
    bonus: Number(side === "self" ? proposal.selfBonus : proposal.enemyBonus),
    total: Number(side === "self" ? proposal.selfTotal : proposal.enemyTotal),
  };
}

function indexCandidateRows(candidateRows) {
  const byField = new Map();
  const byValue = new Map();
  for (const row of candidateRows) {
    if (!fields.includes(row.assignedField)) continue;
    const fieldKey = `${row.image}|${row.side}|${row.assignedField}`;
    if (!byField.has(fieldKey)) byField.set(fieldKey, []);
    byField.get(fieldKey).push(row);
    const valueKey = `${fieldKey}|${row.value}`;
    if (!byValue.has(valueKey)) byValue.set(valueKey, []);
    byValue.get(valueKey).push(row);
  }
  return { byField, byValue };
}

function summarizeCandidateSupport({ image, side, field, value, candidateIndex }) {
  const fieldRows = candidateIndex.byField.get(`${image}|${side}|${field}`) || [];
  const valueRows = candidateIndex.byValue.get(`${image}|${side}|${field}|${value}`) || [];
  const values = [...new Set(fieldRows.map((row) => Number(row.value)))].sort((a, b) => a - b);
  const confidences = valueRows.map((row) => Number(row.confidence || 0)).filter(Number.isFinite);
  return {
    field,
    value,
    candidateCount: fieldRows.length,
    distinctCandidateCount: values.length,
    supportCount: valueRows.length,
    digitCount: String(Math.abs(Number(value || 0))).length,
    confidence: {
      max: confidences.length ? Number(Math.max(...confidences).toFixed(4)) : null,
      mean: confidences.length
        ? Number((confidences.reduce((sum, entry) => sum + entry, 0) / confidences.length).toFixed(4))
        : null,
    },
    bbox: {
      ambiguousCount: valueRows.filter((row) => row.assignment?.ambiguous).length,
    },
    cropKinds: [...new Set(valueRows.map((row) => row.cropKind).filter(Boolean))],
    profiles: [...new Set(valueRows.map((row) => row.profileId).filter(Boolean))],
    rawTexts: [...new Set(valueRows.map((row) => row.fullText).filter(Boolean))].slice(0, 5),
  };
}

function buildFilterRows({ simulation, rows, candidateRows }) {
  const rowsByImage = new Map(rows.map((row) => [row.filename, row]));
  const candidateIndex = indexCandidateRows(candidateRows);
  const acceptedRows = [];
  for (const entry of simulation.accepted) {
    const imageRow = rowsByImage.get(entry.image);
    if (!imageRow) continue;
    for (const side of sides) {
      const production = productionSideValues(imageRow, side);
      const proposal = proposalSideValues(entry.proposal, side);
      const expected = expectedSide(imageRow.expected.stage3, side);
      const expectedValues = {
        member1: expected.member1,
        member2: expected.member2,
        member3: expected.member3,
        bonus: expected.bonus,
        total: expected.total,
      };
      const changedFields = fields.filter((field) => proposal[field] !== production[field]);
      const fieldSupports = Object.fromEntries(
        fields.map((field) => [
          field,
          summarizeCandidateSupport({
            image: entry.image,
            side,
            field,
            value: proposal[field],
            candidateIndex,
          }),
        ])
      );
      const changedSupports = changedFields.map((field) => fieldSupports[field]);
      const memberConfidences = ["member1", "member2", "member3"]
        .map((field) => fieldSupports[field].confidence.max)
        .filter((value) => Number.isFinite(value));
      const pass = fields.every((field) => proposal[field] === expectedValues[field]);
      acceptedRows.push({
        image: entry.image,
        stage: 3,
        side,
        pass,
        actual: {
          members: [proposal.member1, proposal.member2, proposal.member3],
          bonus: proposal.bonus,
          total: proposal.total,
        },
        expected,
        production,
        proposal,
        changedFields,
        changedSupports,
        fieldSupports,
        featureSummary: {
          changedFieldCount: changedFields.length,
          meanMemberConfidence: memberConfidences.length
            ? Number((memberConfidences.reduce((sum, value) => sum + value, 0) / memberConfidences.length).toFixed(4))
            : null,
          totalConfidence: fieldSupports.total.confidence.max,
          totalDigitCount: fieldSupports.total.digitCount,
          changedFieldsLowDigit: changedSupports.filter((support) => support.digitCount < 5).length,
        },
      });
    }
  }
  return acceptedRows;
}

function passR6HybridSafeSide(row) {
  const changed = row.changedSupports;
  const changedMembers = row.changedFields
    .filter((field) => field.startsWith("member"))
    .map((field) => row.fieldSupports[field]);
  const total = row.fieldSupports.total;
  const hasAllChangedSupport = changed.every((support) => support.supportCount > 0);
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
      "R6 frozen side-local hybrid: observed total anchor >=5 digits and >=0.90 confidence; changed members >=5 digits, >=0.90 confidence, low multiplicity, no ambiguous bbox",
  };
}

function scoreR6(rows) {
  const accepted = [];
  const blocked = [];
  for (const row of rows) {
    const result = passR6HybridSafeSide(row);
    const record = {
      image: row.image,
      stage: row.stage,
      side: row.side,
      pass: row.pass,
      changedFields: row.changedFields,
      proposal: row.actual,
      filterPass: result.pass,
      reason: result.reason,
    };
    if (result.pass) accepted.push(record);
    else blocked.push(record);
  }
  return {
    filterId: "R6-hybrid-safe-side",
    wouldApply: accepted.length,
    tp: accepted.filter((row) => row.pass).length,
    fp: accepted.filter((row) => !row.pass).length,
    blockedTp: blocked.filter((row) => row.pass).length,
    blockedFp: blocked.filter((row) => !row.pass).length,
    accepted,
    blocked,
  };
}

function splitAcceptedRows(acceptedRows, newImageSet) {
  const oldRows = acceptedRows.filter((row) => !newImageSet.has(row.image));
  const newRows = acceptedRows.filter((row) => newImageSet.has(row.image));
  const summarize = (items) => ({
    wouldApply: items.length,
    tp: items.filter((row) => row.pass).length,
    fp: items.filter((row) => !row.pass).length,
  });
  return { old: summarize(oldRows), new: summarize(newRows) };
}

function splitRecognitionSummary(candidateRows, rows, newImageSet) {
  const summarize = (subsetRows) => {
    const subsetImages = new Set(subsetRows.map((row) => row.filename));
    const subsetExpectedLookup = buildExpectedLookup(subsetRows);
    return fieldExactSummary(
      candidateRows.filter((row) => subsetImages.has(row.image)),
      subsetExpectedLookup
    );
  };
  const oldRows = rows.filter((row) => !newImageSet.has(row.filename));
  const newRows = rows.filter((row) => newImageSet.has(row.filename));
  return { old: summarize(oldRows), new: summarize(newRows) };
}

function stage3ProductionSummary(rows) {
  let pass = 0;
  let fail = 0;
  for (const row of rows) {
    for (const side of sides) {
      const actual = productionStage3Actual(row, side);
      const expected = expectedSide(row.expected.stage3, side);
      const exact =
        actual.members.join(",") === [expected.member1, expected.member2, expected.member3].join(",") &&
        Number(actual.bonus || 0) === expected.bonus &&
        Number(actual.total || 0) === expected.total;
      if (exact) pass += 1;
      else fail += 1;
    }
  }
  return { pass, fail, total: pass + fail };
}

async function segmentationDiagnostics(manifest) {
  const sharp = requireFromHere("sharp");
  const fieldRecords = manifest.records.filter((record) => record.cropKind === "field");
  const rows = [];
  for (const record of fieldRecords) {
    const filePath = path.join(rootDir, record.cropPath);
    const { data, info } = await sharp(filePath).greyscale().raw().toBuffer({ resolveWithObject: true });
    let dark = 0;
    for (const value of data) if (value < 150) dark += 1;
    rows.push({
      cropId: record.cropId,
      image: record.image,
      stage: record.stage,
      side: record.side,
      field: record.field,
      foregroundRatio: Number((dark / Math.max(1, data.length)).toFixed(4)),
      width: info.width,
      height: info.height,
      note: "segmentation-only diagnostic; no classifier available, so no digit candidates are produced",
    });
  }
  return {
    schema: "ipad-stage3-segmentation-diagnostics-v1",
    fields: rows.length,
    averageForegroundRatio: Number(
      (rows.reduce((sum, row) => sum + row.foregroundRatio, 0) / Math.max(1, rows.length)).toFixed(4)
    ),
    rows,
  };
}

function aggregateRuntime(rapidResults) {
  const byProfile = {};
  for (const result of rapidResults) {
    byProfile[result.profileId] ||= { calls: 0, totalMs: 0, errors: 0 };
    byProfile[result.profileId].calls += 1;
    byProfile[result.profileId].totalMs += Number(result.durationMs || 0);
    if (result.error) byProfile[result.profileId].errors += 1;
  }
  for (const profile of Object.values(byProfile)) {
    profile.averageMs = Number((profile.totalMs / Math.max(1, profile.calls)).toFixed(1));
    profile.totalMs = Number(profile.totalMs.toFixed(1));
  }
  return byProfile;
}

function buildUpperBounds(candidateRows, rows, expectedLookup) {
  const exactKeys = new Set(
    candidateRows
      .filter((row) => fields.includes(row.assignedField))
      .filter((row) => row.value === expectedLookup.get(`${row.image}|3|${row.side}|${row.assignedField}`))
      .map((row) => `${row.image}|3|${row.side}|${row.assignedField}`)
  );
  let all3Members = 0;
  let all5Fields = 0;
  for (const row of rows) {
    for (const side of sides) {
      const prefix = `${row.filename}|3|${side}`;
      const memberKeys = ["member1", "member2", "member3"].map((field) => `${prefix}|${field}`);
      const fieldKeys = fields.map((field) => `${prefix}|${field}`);
      if (memberKeys.every((key) => exactKeys.has(key))) all3Members += 1;
      if (fieldKeys.every((key) => exactKeys.has(key))) all5Fields += 1;
    }
  }
  return {
    candidatePresenceStage3UpperBoundSides: all5Fields,
    all3MembersExactSides: all3Members,
    all5FieldsExactSides: all5Fields,
    perfectSelectionStage3UpperBoundSides: all5Fields,
  };
}

function errorTaxonomy(candidateRows, expectedLookup) {
  const rows = [];
  for (const [key, expected] of expectedLookup.entries()) {
    const [image, stage, side, field] = key.split("|");
    const candidates = candidateRows.filter(
      (row) => row.image === image && String(row.stage) === stage && row.side === side && row.assignedField === field
    );
    const values = candidates.map((candidate) => candidate.value);
    let category = "empty";
    if (values.includes(expected)) category = "exact";
    else if (values.length > 1) category = "multiple-candidates";
    else if (values.length === 1) {
      const valueText = String(values[0]);
      const expectedText = String(expected);
      if (valueText.length < expectedText.length) category = "deletion";
      else if (valueText.length > expectedText.length) category = "insertion";
      else category = "substitution";
    }
    rows.push({ image, stage: Number(stage), side, field, expected, values, category });
  }
  const counts = {};
  for (const row of rows) counts[row.category] = (counts[row.category] || 0) + 1;
  return { counts, rows };
}

async function main() {
  await fs.rm(artifactDir, { recursive: true, force: true });
  await fs.mkdir(artifactDir, { recursive: true });

  const baseline = await readJson(path.join(expandedBaselineDir, "combined-summary.json"));
  const baselineRun = baseline.runs?.[0] || {};
  const rows = await collectFixtures();
  const expansionManifest = await readJson(path.join(ipadExpectedDir, "stage3-safety-expansion-manifest.json"));
  const newImageSet = new Set((expansionManifest.selected || []).map((entry) => entry.filename));
  const inventory = engineInventory();
  const manifest = await createCropManifest(rows);
  const rapid = await runRapidOcr(manifest);
  const candidateRows = buildCandidateResults(rapid.results || [], manifest);
  const expectedLookup = buildExpectedLookup(rows);
  const fieldSummary = fieldExactSummary(candidateRows, expectedLookup);
  const stageSets = buildStageCandidateSets(rows, candidateRows);
  const simulation = evaluateStageWideSimulation(stageSets);
  const simulationScore = scoreSimulation(simulation, rows);
  const filterRows = buildFilterRows({ simulation, rows, candidateRows });
  const r6Score = scoreR6(filterRows);
  const splitScore = (score) => {
    const countRows = (items, predicate) => items.filter(predicate);
    const oldAccepted = countRows(score.accepted || [], (row) => !newImageSet.has(row.image));
    const newAccepted = countRows(score.accepted || [], (row) => newImageSet.has(row.image));
    const oldBlocked = countRows(score.blocked || [], (row) => !newImageSet.has(row.image));
    const newBlocked = countRows(score.blocked || [], (row) => newImageSet.has(row.image));
    return {
      old: {
        wouldApply: oldAccepted.length,
        tp: oldAccepted.filter((row) => row.pass).length,
        fp: oldAccepted.filter((row) => !row.pass).length,
        blockedTp: oldBlocked.filter((row) => row.pass).length,
        blockedFp: oldBlocked.filter((row) => !row.pass).length,
      },
      new: {
        wouldApply: newAccepted.length,
        tp: newAccepted.filter((row) => row.pass).length,
        fp: newAccepted.filter((row) => !row.pass).length,
        blockedTp: newBlocked.filter((row) => row.pass).length,
        blockedFp: newBlocked.filter((row) => !row.pass).length,
      },
    };
  };
  const unsafeSplit = splitAcceptedRows(simulationScore.acceptedRows, newImageSet);
  const r6Split = splitScore(r6Score);
  const recognitionSplit = splitRecognitionSummary(candidateRows, rows, newImageSet);
  const segmentation = await segmentationDiagnostics(manifest);
  const taxonomy = errorTaxonomy(candidateRows, expectedLookup);
  const upperBounds = buildUpperBounds(candidateRows, rows, expectedLookup);
  const productionStage3 = stage3ProductionSummary(rows);
  const runtime = {
    rapidOcrWallMs: rapid.durationMs || 0,
    rapidOcrByProfile: aggregateRuntime(rapid.results || []),
  };
  const stability = {
    attemptedRuns: 1,
    secondRunAttempted: false,
    reason: "Single RapidOCR pass run for fixture expansion scoring; rerun this script for a second-pass stability check before parity.",
  };
  const scorecard = {
    currentProductionStage3: productionStage3,
    rapidOcr: {
      member1: fieldSummary.member1.exact,
      member2: fieldSummary.member2.exact,
      member3: fieldSummary.member3.exact,
      bonus: fieldSummary.bonus.exact,
      total: fieldSummary.total.exact,
      all3MembersExactSides: upperBounds.all3MembersExactSides,
      all5FieldsExactSides: upperBounds.all5FieldsExactSides,
      selectorTp: simulationScore.tpStageSides,
      selectorFp: simulationScore.fpStageSides,
      r6Tp: r6Score.tp,
      r6Fp: r6Score.fp,
      runtime,
      browserFeasibility:
        "Python-only as tested. Future browser path would require ONNX Runtime Web/model conversion or a different bundled model.",
    },
    segmentationOnly: {
      exactCandidates: 0,
      wrongSlot: 0,
      note: "No classifier; useful only to estimate custom digit-model feasibility.",
    },
  };
  const customModelFeasibility = {
    justified: false,
    reason:
      "Off-the-shelf RapidOCR materially improves candidate presence but still produces a selector FP. A custom model may be plausible only with a separate labeled train/validation/test split and stronger FP controls.",
    approximateFieldCropsFrom84Screenshots: 84 * 3 * 2 * 5,
    approximateStage3MemberFieldCropsFrom84Screenshots: 84 * 2 * 3,
    labelingBurden:
      "At minimum hundreds of digit-field labels plus held-out validation/test crops; glyph-level labels would be more expensive.",
    syntheticAugmentation:
      "Possible if game font/background effects can be reproduced, but real held-out screenshots remain required.",
  };
  const recommendation = {
    recognitionHeadroomExists: fieldSummary.member2.exact >= 10 || fieldSummary.member3.exact >= 10,
    alternateEngineIntegrationJustified: false,
    recommendedNextStep:
      r6Score.fp === 0 && r6Split.new.fp === 0 && r6Score.tp >= 2
        ? "R6 remains plausible after fixture expansion; run a second RapidOCR stability pass and then browser-equivalent evidence feasibility before any parity/production work."
        : "Do not proceed to RapidOCR parity or production. Investigate the new FP/blocked cases or defer RapidOCR.",
    reason:
      r6Score.fp > 0
        ? "The frozen R6 filter has at least one FP on the expanded labeled set."
        : "The frozen R6 filter has no FP in this run, but it remains Python-only diagnostics and needs stability/browser feasibility before parity.",
  };
  const summary = {
    schema: "ipad-stage3-rapidocr-fixture-expansion-summary-v1",
    productionBaseline: {
      fixtureCount: baseline.fixtureCount,
      imagesProcessed: baselineRun.imagesProcessed,
      stageSides: baselineRun.stageSidePass + baselineRun.stageSideFail,
      stageSidePass: baselineRun.stageSidePass,
      tp: baselineRun.tp,
      fp: baselineRun.fp,
      pass: Boolean(baseline.pass),
      note:
        baselineRun.fp === 0
          ? "Expanded production baseline reported no FP."
          : "Expanded production baseline exposed existing production FP(s) under the newly labeled fixture set; production code was not changed in this task.",
    },
    fixtureExpansion: {
      previousCompleteFixtures: rows.length - newImageSet.size,
      newCompleteFixtures: newImageSet.size,
      totalCompleteFixtures: rows.length,
      oldStage3Sides: (rows.length - newImageSet.size) * 2,
      newStage3Sides: newImageSet.size * 2,
      totalStage3Sides: rows.length * 2,
      selectedImages: [...newImageSet].sort(),
    },
    enginesAvailable: inventory.candidates,
    enginesTested: ["RapidOCR ONNXRuntime", "OpenCV/Pillow connected-component segmentation"],
    cropManifest: {
      fieldCrops: manifest.fieldCrops,
      f1Crops: manifest.f1Crops,
      f2Crops: manifest.f2Crops,
    },
    exactRecognition: fieldSummary,
    exactRecognitionSplit: recognitionSplit,
    unsafeSelectorSimulation: {
      ...simulationScore,
      split: unsafeSplit,
    },
    r6HybridSafeSide: {
      ...r6Score,
      split: r6Split,
    },
    upperBounds,
    runtime,
    stability,
    scorecard,
    customModelFeasibility,
    recommendation,
    productionUnchanged: true,
  };

  await writeJson("engine-inventory.json", inventory);
  await writeJson("selected-engines.json", summary.enginesTested);
  await writeJson("candidate-results.json", candidateRows);
  await writeJson("bbox-results.json", candidateRows.filter((row) => row.bbox));
  await writeJson("error-taxonomy.json", taxonomy);
  await writeJson("unsafe-selector-results.json", simulationScore);
  await writeJson("r6-results.json", r6Score);
  await writeJson("upper-bounds.json", upperBounds);
  await writeJson("runtime.json", runtime);
  await writeJson("stability.json", stability);
  await writeJson("browser-feasibility.json", scorecard.rapidOcr.browserFeasibility);
  await writeJson("architecture-scorecard.json", scorecard);
  await writeJson("custom-model-feasibility.json", customModelFeasibility);
  await writeJson("segmentation-diagnostics.json", segmentation);
  await writeJson("recommendation.json", recommendation);
  await writeJson("summary.json", summary);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
