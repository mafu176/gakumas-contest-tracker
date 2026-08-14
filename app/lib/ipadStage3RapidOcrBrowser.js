"use client";

import {
  buildIpadArithmeticRoiTemplate,
  detectIpadOcrLayout,
  evaluateIpadStage3RapidOcrR6,
  padIpadArithmeticFieldZone,
  parseIpadArithmeticOcrNumbers,
  parseIpadGroupedNumberTokens,
} from "./ocr";

const RAPIDOCR_DEBUG_SCHEMA = "ipad-stage3-rapidocr-browser-runtime-v1";
const DEFAULT_MODEL_BASE = "/diagnostic-models/rapidocr/";
const DEFAULT_WASM_BASE = "/diagnostic-models/ort/";
const REC_MODEL_NAME = "ch_PP-OCRv4_rec_infer.onnx";
const REC_CHARACTER_NAME = "ch_PP-OCRv4_rec_character.txt";
const REC_INPUT_HEIGHT = 48;
const REC_INPUT_WIDTH = 320;
const REC_CHANNELS = 3;
const STAGE3_FIELDS = ["member1", "member2", "member3", "bonus", "total"];

let runtimePromise = null;

function safeLocalBaseUrl(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  if (!text.startsWith("/") || text.startsWith("//") || /https?:/i.test(text)) return fallback;
  return text.endsWith("/") ? text : `${text}/`;
}

function getRuntimeConfig() {
  const params =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  return {
    modelBase: safeLocalBaseUrl(params.get("ipadStage3RapidOcrModelBase"), DEFAULT_MODEL_BASE),
    wasmBase: safeLocalBaseUrl(params.get("ipadStage3RapidOcrWasmBase"), DEFAULT_WASM_BASE),
    executionProvider: "wasm",
  };
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.arrayBuffer();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

function buildCharacterList(characterText) {
  const characters = String(characterText || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\r$/, ""));
  if (!characters.length) throw new Error("RapidOCR character metadata is empty.");
  return ["blank", ...characters, " "];
}

async function loadRapidOcrRuntime() {
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    const config = getRuntimeConfig();
    const ort = await import("onnxruntime-web");
    ort.env.wasm.wasmPaths = config.wasmBase;
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    const recModelUrl = `${config.modelBase}${REC_MODEL_NAME}`;
    const characterUrl = `${config.modelBase}${REC_CHARACTER_NAME}`;
    const [recModelBuffer, characterText] = await Promise.all([
      fetchArrayBuffer(recModelUrl),
      fetchText(characterUrl),
    ]);
    const recModelSha256 = await sha256Hex(recModelBuffer);
    const recSession = await ort.InferenceSession.create(recModelBuffer, {
      executionProviders: [config.executionProvider],
      graphOptimizationLevel: "all",
    });
    return {
      ort,
      config,
      recSession,
      characterList: buildCharacterList(characterText),
      modelInventory: {
        recognizer: {
          name: REC_MODEL_NAME,
          url: recModelUrl,
          sha256: recModelSha256,
          bytes: recModelBuffer.byteLength,
          inputNames: recSession.inputNames,
          outputNames: recSession.outputNames,
          expectedInputShape: [1, REC_CHANNELS, REC_INPUT_HEIGHT, REC_INPUT_WIDTH],
        },
        characterFile: {
          name: REC_CHARACTER_NAME,
          url: characterUrl,
          sha256: await sha256Hex(new TextEncoder().encode(characterText).buffer),
          characterCountWithCtcSpecials: buildCharacterList(characterText).length,
        },
      },
    };
  })();
  return runtimePromise;
}

function clampRect(rect, image) {
  const width = Number(image?.width || image?.naturalWidth || 0);
  const height = Number(image?.height || image?.naturalHeight || 0);
  const x = Math.max(0, Math.round(Number(rect?.x || 0)));
  const y = Math.max(0, Math.round(Number(rect?.y || 0)));
  const right = Math.min(width, x + Math.max(1, Math.round(Number(rect?.width || 1))));
  const bottom = Math.min(height, y + Math.max(1, Math.round(Number(rect?.height || 1))));
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}

function canvasForCrop(image, rect) {
  const crop = document.createElement("canvas");
  crop.width = rect.width;
  crop.height = rect.height;
  const context = crop.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return crop;
}

function preprocessRecognitionInput(cropCanvas) {
  const sourceWidth = cropCanvas.width;
  const sourceHeight = cropCanvas.height;
  const ratio = sourceWidth / Math.max(1, sourceHeight);
  const resizedWidth = Math.min(REC_INPUT_WIDTH, Math.max(1, Math.ceil(REC_INPUT_HEIGHT * ratio)));

  const resized = document.createElement("canvas");
  resized.width = resizedWidth;
  resized.height = REC_INPUT_HEIGHT;
  const resizedContext = resized.getContext("2d", { willReadFrequently: true });
  resizedContext.imageSmoothingEnabled = true;
  resizedContext.imageSmoothingQuality = "medium";
  resizedContext.drawImage(cropCanvas, 0, 0, sourceWidth, sourceHeight, 0, 0, resizedWidth, REC_INPUT_HEIGHT);
  const imageData = resizedContext.getImageData(0, 0, resizedWidth, REC_INPUT_HEIGHT).data;

  const plane = REC_INPUT_HEIGHT * REC_INPUT_WIDTH;
  const data = new Float32Array(REC_CHANNELS * plane);
  for (let y = 0; y < REC_INPUT_HEIGHT; y += 1) {
    for (let x = 0; x < resizedWidth; x += 1) {
      const rgbaOffset = (y * resizedWidth + x) * 4;
      const target = y * REC_INPUT_WIDTH + x;
      const r = imageData[rgbaOffset] / 255;
      const g = imageData[rgbaOffset + 1] / 255;
      const b = imageData[rgbaOffset + 2] / 255;
      // Python RapidOCR uses cv2.imread, so the recognizer sees BGR channel order.
      data[target] = (b - 0.5) / 0.5;
      data[plane + target] = (g - 0.5) / 0.5;
      data[plane * 2 + target] = (r - 0.5) / 0.5;
    }
  }
  return {
    data,
    shape: [1, REC_CHANNELS, REC_INPUT_HEIGHT, REC_INPUT_WIDTH],
    metadata: {
      sourceWidth,
      sourceHeight,
      resizedWidth,
      resizedHeight: REC_INPUT_HEIGHT,
      paddedWidth: REC_INPUT_WIDTH,
      colorOrder: "BGR",
      normalization: "(channel/255 - 0.5) / 0.5",
      tensorLayout: "NCHW",
      dtype: "float32",
      interpolation: "browser-canvas-medium",
    },
  };
}

function decodeCtc(outputTensor, characterList) {
  const dims = outputTensor.dims || [];
  const data = outputTensor.data || [];
  const timeSteps = Number(dims[1] || 0);
  const classCount = Number(dims[2] || 0);
  let previous = -1;
  let text = "";
  const confidences = [];
  const decoded = [];

  for (let t = 0; t < timeSteps; t += 1) {
    const offset = t * classCount;
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let c = 0; c < classCount; c += 1) {
      const score = Number(data[offset + c]);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = c;
      }
    }
    if (bestIndex !== 0 && bestIndex !== previous) {
      const char = characterList[bestIndex] || "";
      text += char;
      confidences.push(bestScore);
      decoded.push({ timestep: t, index: bestIndex, char, confidence: bestScore });
    }
    previous = bestIndex;
  }

  const confidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : 0;
  return { text, confidence, decoded };
}

function toFieldName(field) {
  if (field.field === "member") return `member${field.slot}`;
  return field.field;
}

function buildCandidateRows({ imageName, side, fieldName, recognition, cropMetadata }) {
  const parsed = parseIpadArithmeticOcrNumbers(recognition.text);
  const grouped = parseIpadGroupedNumberTokens(recognition.text);
  const seen = new Set();
  const rows = [];
  for (const [index, candidate] of parsed.entries()) {
    const key = `parsed|${candidate.value}|${candidate.raw}|${index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      image: imageName,
      stage: 3,
      side,
      sourceField: fieldName,
      assignedField: fieldName,
      cropKind: "field",
      profileId: "browser-rapidocr-recognition-only",
      value: candidate.value,
      raw: candidate.raw,
      fullText: recognition.text,
      parser: "literal-contiguous-digits",
      confidence: recognition.confidence,
      itemIndex: 0,
      bbox: null,
      assignment: {
        assignedField: fieldName,
        ambiguous: false,
        candidates: [{ field: fieldName, overlap: 1 }],
      },
      durationMs: recognition.durationMs,
      crop: cropMetadata,
    });
  }
  for (const [index, token] of grouped.entries()) {
    const key = `grouped|${token.value}|${token.rawToken}|${index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      image: imageName,
      stage: 3,
      side,
      sourceField: fieldName,
      assignedField: fieldName,
      cropKind: "field",
      profileId: "browser-rapidocr-recognition-only",
      value: token.value,
      raw: token.rawToken,
      fullText: recognition.text,
      parser: "ipad-grouped-number-token",
      confidence: recognition.confidence,
      itemIndex: 0,
      bbox: null,
      assignment: {
        assignedField: fieldName,
        ambiguous: false,
        candidates: [{ field: fieldName, overlap: 1 }],
      },
      durationMs: recognition.durationMs,
      crop: cropMetadata,
    });
  }
  return rows;
}

async function recognizeField({ runtime, image, imageName, field }) {
  const paddedRect = clampRect(padIpadArithmeticFieldZone(field, image, 0.12), image);
  const cropCanvas = canvasForCrop(image, paddedRect);
  const cropBlob = await new Promise((resolve) => cropCanvas.toBlob(resolve, "image/png"));
  const cropBuffer = cropBlob ? await cropBlob.arrayBuffer() : new ArrayBuffer(0);
  const input = preprocessRecognitionInput(cropCanvas);
  const inputChecksum = await sha256Hex(input.data.buffer.slice(0));
  const tensor = new runtime.ort.Tensor("float32", input.data, input.shape);
  const feeds = { [runtime.recSession.inputNames[0]]: tensor };
  const started = performance.now();
  const outputs = await runtime.recSession.run(feeds);
  const durationMs = Number((performance.now() - started).toFixed(3));
  const outputTensor = outputs[runtime.recSession.outputNames[0]];
  const decoded = decodeCtc(outputTensor, runtime.characterList);
  const recognition = {
    text: decoded.text,
    confidence: Number(decoded.confidence.toFixed(6)),
    decodedLength: decoded.decoded.length,
    durationMs,
    outputShape: outputTensor.dims,
    parsedCandidates: parseIpadArithmeticOcrNumbers(decoded.text),
    groupedCandidates: parseIpadGroupedNumberTokens(decoded.text),
  };
  const fieldName = toFieldName(field);
  const cropMetadata = {
    rect: paddedRect,
    sha256: await sha256Hex(cropBuffer),
    preprocessingChecksum: inputChecksum,
    preprocessing: input.metadata,
  };
  return {
    stage: 3,
    side: field.side,
    field: fieldName,
    slot: field.slot,
    roi: field.zone,
    crop: cropMetadata,
    recognition,
    candidateRows: buildCandidateRows({
      imageName,
      side: field.side,
      fieldName,
      recognition,
      cropMetadata,
    }),
  };
}

function groupCandidateRowsBySide(candidateRows) {
  const grouped = { self: [], enemy: [] };
  for (const row of candidateRows) {
    if (row.side === "self" || row.side === "enemy") grouped[row.side].push(row);
  }
  return grouped;
}

function buildR6EvidenceRows({ imageName, diagnostics, candidateRows }) {
  const rows = [];
  const productionStage = diagnostics?.displayedOcrStages?.[3] || {};
  const bySide = groupCandidateRowsBySide(candidateRows);
  for (const side of ["self", "enemy"]) {
    const currentMembers = (productionStage[side] || []).map((value) =>
      Number(String(value ?? "").replace(/[^\d]/g, ""))
    );
    const current = {
      members: currentMembers,
      bonus: 0,
      total: Number(
        String(productionStage[side === "self" ? "selfTotal" : "enemyTotal"] ?? "").replace(/[^\d]/g, "")
      ),
    };
    rows.push({
      image: imageName,
      stage: 3,
      side,
      status: "browser-recognizer-only-candidates",
      current,
      candidateRows: bySide[side],
      evaluation: evaluateIpadStage3RapidOcrR6({
        image: imageName,
        stage: 3,
        side,
        pass: false,
        proposal: current,
        changedFields: [],
        changedSupports: [],
        fieldSupports: {},
        featureSummary: { changedFieldsLowDigit: 0 },
      }),
      note:
        "R6 needs proposal rows produced by the offline RapidOCR arithmetic selector. The browser runtime currently exports recognizer-only candidates; proposal parity is therefore diagnostic-only and expected to be blocked until detector/selector plumbing is ported.",
    });
  }
  return rows;
}

export async function runIpadStage3RapidOcrBrowserDiagnostic({ image, imageName, diagnostics }) {
  const generatedAt = new Date().toISOString();
  const detection = detectIpadOcrLayout(image);
  const payload = {
    schema: RAPIDOCR_DEBUG_SCHEMA,
    debugFlag: "ipadStage3RapidOcrDebug=1",
    imageIdentifier: imageName || "",
    generatedAt,
    status: "not-run",
    productionOutputChanged: false,
    detection,
    runtime: {
      framework: "onnxruntime-web",
      executionProvider: "wasm",
      recognizerOnly: true,
      productionEnabled: false,
    },
    fields: [],
    candidateRows: [],
    r6: {
      policyId: "R6-hybrid-safe-side",
      productionEnabled: false,
      rows: [],
      summary: { wouldApply: 0, tp: 0, fp: 0, blocked: 0 },
    },
    diagnosticsSummary: {},
  };

  if (!detection.detected || detection.deviceMode !== "ipad") {
    return {
      ...payload,
      status: "blocked-not-ipad-layout",
      blockReason: "The developer-only RapidOCR runtime runs only for detected iPad portrait layouts.",
    };
  }

  const runtime = await loadRapidOcrRuntime();
  payload.status = "ran-recognizer-only";
  payload.modelInventory = runtime.modelInventory;
  payload.runtime = {
    ...payload.runtime,
    modelBase: runtime.config.modelBase,
    wasmBase: runtime.config.wasmBase,
  };

  const template = buildIpadArithmeticRoiTemplate(image);
  const stage3Fields = (template.fields || []).filter((field) => field.stage === 3);
  const started = performance.now();
  for (const field of stage3Fields) {
    const result = await recognizeField({ runtime, image, imageName: imageName || "", field });
    payload.fields.push(result);
    payload.candidateRows.push(...result.candidateRows);
  }
  payload.elapsedMs = Number((performance.now() - started).toFixed(3));
  payload.r6.rows = buildR6EvidenceRows({
    imageName: imageName || "",
    diagnostics,
    candidateRows: payload.candidateRows,
  });
  payload.r6.summary = {
    wouldApply: payload.r6.rows.filter((row) => row.evaluation?.wouldApply).length,
    tp: 0,
    fp: 0,
    blocked: payload.r6.rows.filter((row) => !row.evaluation?.wouldApply).length,
    note:
      "Recognizer-only browser candidates are exported. Frozen R6 proposal scoring remains blocked until the browser detector/selector path is ported.",
  };
  payload.diagnosticsSummary = {
    fieldCount: payload.fields.length,
    candidateRowCount: payload.candidateRows.length,
    nonEmptyFields: payload.fields.filter((field) => field.recognition.text).length,
    exactProductionMutation: false,
  };
  return payload;
}
