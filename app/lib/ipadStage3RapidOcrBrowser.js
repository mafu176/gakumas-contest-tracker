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
const DET_MODEL_NAME = "ch_PP-OCRv4_det_infer.onnx";
const REC_MODEL_NAME = "ch_PP-OCRv4_rec_infer.onnx";
const REC_CHARACTER_NAME = "ch_PP-OCRv4_rec_character.txt";
const DET_LIMIT_SIDE_LEN = 736;
const DET_THRESH = 0.3;
const DET_BOX_THRESH = 0.5;
const DET_UNCLIP_RATIO = 1.6;
const REC_INPUT_HEIGHT = 48;
const REC_INPUT_WIDTH = 320;
const REC_CHANNELS = 3;
const STAGE3_FIELDS = ["member1", "member2", "member3", "bonus", "total"];
const DETECTION_CROP_KINDS = ["field", "f1-member-row", "f2-full-side"];

let runtimePromise = null;

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function safeLocalBaseUrl(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  if (!text.startsWith("/") || text.startsWith("//") || /https?:/i.test(text)) return fallback;
  return text.endsWith("/") ? text : `${text}/`;
}

function getRuntimeConfig() {
  const params =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const detectorEnabled = params.get("ipadStage3RapidOcrDetectorEnabled") !== "0";
  const roiVariantsEnabled = params.get("ipadStage3RapidOcrRoiVariants") === "1";
  const bonusTotalRoiVariantsEnabled = params.get("ipadStage3RapidOcrBonusTotalRoi") === "1";
  const member2RoiVariantsEnabled = params.get("ipadStage3RapidOcrMember2Roi") === "1";
  const member3RoiVariantsEnabled = params.get("ipadStage3RapidOcrMember3Roi") === "1";
  const nonZeroBonusRoiVariantsEnabled = params.get("ipadStage3RapidOcrNonZeroBonus") === "1";
  const cropKinds = String(params.get("ipadStage3RapidOcrDetectorCropKinds") || DETECTION_CROP_KINDS.join(","))
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => DETECTION_CROP_KINDS.includes(entry));
  const detLimitSideLen = Number(params.get("ipadStage3RapidOcrDetectorLimitSideLen") || DET_LIMIT_SIDE_LEN);
  return {
    modelBase: safeLocalBaseUrl(params.get("ipadStage3RapidOcrModelBase"), DEFAULT_MODEL_BASE),
    wasmBase: safeLocalBaseUrl(params.get("ipadStage3RapidOcrWasmBase"), DEFAULT_WASM_BASE),
    executionProvider: "wasm",
    detectorEnabled,
    roiVariantsEnabled,
    bonusTotalRoiVariantsEnabled,
    member2RoiVariantsEnabled,
    member3RoiVariantsEnabled,
    nonZeroBonusRoiVariantsEnabled,
    detectorCropKinds: cropKinds.length ? cropKinds : DETECTION_CROP_KINDS,
    detectorLimitSideLen:
      Number.isFinite(detLimitSideLen) && detLimitSideLen >= 96 && detLimitSideLen <= DET_LIMIT_SIDE_LEN
        ? detLimitSideLen
        : DET_LIMIT_SIDE_LEN,
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
    const totalStarted = nowMs();
    const config = getRuntimeConfig();
    const ort = await import("onnxruntime-web");
    ort.env.wasm.wasmPaths = config.wasmBase;
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    const detModelUrl = `${config.modelBase}${DET_MODEL_NAME}`;
    const recModelUrl = `${config.modelBase}${REC_MODEL_NAME}`;
    const characterUrl = `${config.modelBase}${REC_CHARACTER_NAME}`;
    const fetchStarted = nowMs();
    const [detModelBuffer, recModelBuffer, characterText] = await Promise.all([
      config.detectorEnabled ? fetchArrayBuffer(detModelUrl) : Promise.resolve(null),
      fetchArrayBuffer(recModelUrl),
      fetchText(characterUrl),
    ]);
    const modelFetchMs = Number((nowMs() - fetchStarted).toFixed(3));
    const detModelSha256 = detModelBuffer ? await sha256Hex(detModelBuffer) : null;
    const recModelSha256 = await sha256Hex(recModelBuffer);
    const detStarted = nowMs();
    const detSession = detModelBuffer
      ? await ort.InferenceSession.create(detModelBuffer, {
          executionProviders: [config.executionProvider],
          graphOptimizationLevel: "all",
        })
      : null;
    const detSessionCreateMs = Number((nowMs() - detStarted).toFixed(3));
    const recStarted = nowMs();
    const recSession = await ort.InferenceSession.create(recModelBuffer, {
      executionProviders: [config.executionProvider],
      graphOptimizationLevel: "all",
    });
    const recSessionCreateMs = Number((nowMs() - recStarted).toFixed(3));
    return {
      ort,
      config,
      detSession,
      recSession,
      characterList: buildCharacterList(characterText),
      modelInventory: {
        detector: detModelBuffer
          ? {
              name: DET_MODEL_NAME,
              url: detModelUrl,
              sha256: detModelSha256,
              bytes: detModelBuffer.byteLength,
              inputNames: detSession.inputNames,
              outputNames: detSession.outputNames,
              postprocess: {
                thresh: DET_THRESH,
                boxThresh: DET_BOX_THRESH,
                unclipRatio: DET_UNCLIP_RATIO,
                useDilation: true,
                approximation:
                  "browser diagnostic uses thresholded DB bitmap connected components and axis-aligned unclip; offline Python uses cv2.findContours/minAreaRect/pyclipper",
              },
            }
          : {
              name: DET_MODEL_NAME,
              loaded: false,
              reason: "detector disabled by developer-only query parameter",
            },
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
      phaseTimings: {
        modelFetchMs,
        detSessionCreateMs,
        recSessionCreateMs,
        totalModelLoadMs: Number((nowMs() - totalStarted).toFixed(3)),
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

function canvasForBlueBonusMask(cropCanvas) {
  const output = document.createElement("canvas");
  output.width = cropCanvas.width;
  output.height = cropCanvas.height;
  const sourceContext = cropCanvas.getContext("2d", { willReadFrequently: true });
  const outputContext = output.getContext("2d", { willReadFrequently: true });
  const imageData = sourceContext.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
  const data = imageData.data;
  for (let offset = 0; offset < data.length; offset += 4) {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const blueDominant = b > r + 12 && b > g + 4;
    const brightBlue = b > 90 && g > 45;
    const ink = blueDominant && brightBlue;
    data[offset] = ink ? 0 : 255;
    data[offset + 1] = ink ? 0 : 255;
    data[offset + 2] = ink ? 0 : 255;
  }
  outputContext.putImageData(imageData, 0, 0);
  return output;
}

function canvasForRecognitionProfile(cropCanvas, profileId = "recognizer-current") {
  if (profileId === "bonus-blue-mask") return canvasForBlueBonusMask(cropCanvas);
  return cropCanvas;
}

function preprocessRecognitionInput(cropCanvas, profileId = "recognizer-current") {
  const profileCanvas = canvasForRecognitionProfile(cropCanvas, profileId);
  const sourceWidth = profileCanvas.width;
  const sourceHeight = profileCanvas.height;
  const ratio = sourceWidth / Math.max(1, sourceHeight);
  const resizedWidth = Math.min(REC_INPUT_WIDTH, Math.max(1, Math.ceil(REC_INPUT_HEIGHT * ratio)));

  const resized = document.createElement("canvas");
  resized.width = resizedWidth;
  resized.height = REC_INPUT_HEIGHT;
  const resizedContext = resized.getContext("2d", { willReadFrequently: true });
  resizedContext.imageSmoothingEnabled = true;
  resizedContext.imageSmoothingQuality = "medium";
  resizedContext.drawImage(profileCanvas, 0, 0, sourceWidth, sourceHeight, 0, 0, resizedWidth, REC_INPUT_HEIGHT);
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
      recognitionProfileId: profileId,
      recognitionProfileDescription:
        profileId === "bonus-blue-mask"
          ? "deterministic blue-dominant pixel isolation rendered as black text on white background"
          : "current browser canvas recognizer input",
    },
  };
}

function roundToMultipleOf32(value) {
  return Math.max(32, Math.round(value / 32) * 32);
}

function preprocessDetectionInput(cropCanvas, limitSideLen = DET_LIMIT_SIDE_LEN) {
  const sourceWidth = cropCanvas.width;
  const sourceHeight = cropCanvas.height;
  const ratio =
    Math.min(sourceWidth, sourceHeight) < limitSideLen
      ? limitSideLen / Math.max(1, Math.min(sourceWidth, sourceHeight))
      : 1;
  const resizedWidth = roundToMultipleOf32(sourceWidth * ratio);
  const resizedHeight = roundToMultipleOf32(sourceHeight * ratio);

  const resized = document.createElement("canvas");
  resized.width = resizedWidth;
  resized.height = resizedHeight;
  const resizedContext = resized.getContext("2d", { willReadFrequently: true });
  resizedContext.imageSmoothingEnabled = true;
  resizedContext.imageSmoothingQuality = "medium";
  resizedContext.drawImage(cropCanvas, 0, 0, sourceWidth, sourceHeight, 0, 0, resizedWidth, resizedHeight);
  const imageData = resizedContext.getImageData(0, 0, resizedWidth, resizedHeight).data;

  const plane = resizedWidth * resizedHeight;
  const data = new Float32Array(REC_CHANNELS * plane);
  for (let y = 0; y < resizedHeight; y += 1) {
    for (let x = 0; x < resizedWidth; x += 1) {
      const rgbaOffset = (y * resizedWidth + x) * 4;
      const target = y * resizedWidth + x;
      const r = imageData[rgbaOffset] / 255;
      const g = imageData[rgbaOffset + 1] / 255;
      const b = imageData[rgbaOffset + 2] / 255;
      data[target] = (b - 0.5) / 0.5;
      data[plane + target] = (g - 0.5) / 0.5;
      data[plane * 2 + target] = (r - 0.5) / 0.5;
    }
  }

  return {
    data,
    shape: [1, REC_CHANNELS, resizedHeight, resizedWidth],
    metadata: {
      sourceWidth,
      sourceHeight,
      resizedWidth,
      resizedHeight,
      limitSideLen,
      limitType: "min",
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

function decodeRapidOcrRecognizerOutput(outputTensor, characterList) {
  const dims = outputTensor.dims || [];
  const data = outputTensor.data || [];
  const timeSteps = Number(dims[1] || 0);
  const classCount = Number(dims[2] || 0);
  let previous = -1;
  let text = "";
  const retained = [];
  const topSummary = [];

  for (let t = 0; t < timeSteps; t += 1) {
    const offset = t * classCount;
    let top1Index = 0;
    let top1Probability = Number.NEGATIVE_INFINITY;
    let top2Index = 0;
    let top2Probability = Number.NEGATIVE_INFINITY;
    for (let c = 0; c < classCount; c += 1) {
      const probability = Number(data[offset + c]);
      if (probability > top1Probability) {
        top2Index = top1Index;
        top2Probability = top1Probability;
        top1Index = c;
        top1Probability = probability;
      } else if (probability > top2Probability) {
        top2Index = c;
        top2Probability = probability;
      }
    }

    const char = characterList[top1Index] || "";
    const keep = top1Index !== 0 && top1Index !== previous;
    if (keep) {
      text += char;
      retained.push({
        timestep: t,
        index: top1Index,
        char,
        confidence: Number(top1Probability.toFixed(8)),
      });
    }
    topSummary.push({
      timestep: t,
      top1: {
        index: top1Index,
        char,
        probability: Number(top1Probability.toFixed(8)),
      },
      top2: {
        index: top2Index,
        char: characterList[top2Index] || "",
        probability: Number(top2Probability.toFixed(8)),
      },
      blankProbability: Number(Number(data[offset] || 0).toFixed(8)),
      retained: keep,
    });
    previous = top1Index;
  }

  const confidence = retained.length
    ? retained.reduce((sum, value) => sum + value.confidence, 0) / retained.length
    : 0;
  return {
    text,
    confidence,
    retained,
    topSummary,
    semantics: {
      blankIndex: 0,
      duplicateCollapse: "remove repeated adjacent class indices before blank removal",
      ignoredTokens: [0],
      confidence: "arithmetic mean of max probabilities at retained decoded timesteps",
    },
  };
}

function sampleFloatArray(data) {
  const indices = [
    0,
    1,
    2,
    17,
    31,
    32,
    47,
    48,
    319,
    320,
    1535,
    1536,
    4096,
    8192,
    data.length - 1,
  ].filter((index, offset, values) => index >= 0 && index < data.length && values.indexOf(index) === offset);
  return indices.map((index) => ({ index, value: Number(Number(data[index]).toFixed(8)) }));
}

function toFieldName(field) {
  if (field.field === "member") return `member${field.slot}`;
  return field.field;
}

function unionRects(rects, paddingRatio, image) {
  const valid = rects.filter(Boolean);
  if (!valid.length) return clampRect({ x: 0, y: 0, width: 1, height: 1 }, image);
  const left = Math.min(...valid.map((rect) => rect.x));
  const top = Math.min(...valid.map((rect) => rect.y));
  const right = Math.max(...valid.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...valid.map((rect) => rect.y + rect.height));
  const width = right - left;
  const height = bottom - top;
  const padX = Math.round(width * paddingRatio);
  const padY = Math.round(height * paddingRatio);
  return clampRect(
    {
      x: left - padX,
      y: top - padY,
      width: width + padX * 2,
      height: height + padY * 2,
    },
    image
  );
}

function relativeRect(rect, parentRect) {
  return {
    x: rect.x - parentRect.x,
    y: rect.y - parentRect.y,
    width: rect.width,
    height: rect.height,
  };
}

function absoluteRect(rect, parentRect) {
  return {
    x: parentRect.x + rect.x,
    y: parentRect.y + rect.y,
    width: rect.width,
    height: rect.height,
  };
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

function fieldSpecKey(field) {
  return toFieldName(field);
}

function scaledRectFromZone(zone, image, adjustments = {}) {
  const base = {
    x: Number(zone?.x || 0),
    y: Number(zone?.y || 0),
    width: Number(zone?.width || 1),
    height: Number(zone?.height || 1),
  };
  const dx = Math.round(base.width * Number(adjustments.dxRatio || 0));
  const dy = Math.round(base.height * Number(adjustments.dyRatio || 0));
  const dw = Math.round(base.width * Number(adjustments.dwRatio || 0));
  const dh = Math.round(base.height * Number(adjustments.dhRatio || 0));
  return clampRect(
    {
      x: base.x + dx - Math.floor(dw / 2),
      y: base.y + dy - Math.floor(dh / 2),
      width: base.width + dw,
      height: base.height + dh,
    },
    image
  );
}

function scaledRectFromRect(rect, image, adjustments = {}) {
  const base = {
    x: Number(rect?.x || 0),
    y: Number(rect?.y || 0),
    width: Number(rect?.width || 1),
    height: Number(rect?.height || 1),
  };
  const dx = Math.round(base.width * Number(adjustments.dxRatio || 0));
  const dy = Math.round(base.height * Number(adjustments.dyRatio || 0));
  const dw = Math.round(base.width * Number(adjustments.dwRatio || 0));
  const dh = Math.round(base.height * Number(adjustments.dhRatio || 0));
  return clampRect(
    {
      x: base.x + dx - Math.floor(dw / 2),
      y: base.y + dy - Math.floor(dh / 2),
      width: base.width + dw,
      height: base.height + dh,
    },
    image
  );
}

function buildBonusTotalRecognitionVariants(field, image, baseline) {
  const fieldName = toFieldName(field);
  if (fieldName === "bonus") {
    return [
      baseline,
      {
        id: "bonus-horizontal-expand-12pct",
        architecture: "F-detectorless-bonus-total-roi",
        rect: scaledRectFromRect(baseline.rect, image, { dwRatio: 0.12 }),
        description: "bonus-only horizontal expansion from the fixed baseline crop",
      },
      {
        id: "bonus-vertical-expand-12pct",
        architecture: "F-detectorless-bonus-total-roi",
        rect: scaledRectFromRect(baseline.rect, image, { dhRatio: 0.12 }),
        description: "bonus-only vertical expansion from the fixed baseline crop",
      },
      {
        id: "bonus-up-left-expand-8pct",
        architecture: "F-detectorless-bonus-total-roi",
        rect: scaledRectFromRect(baseline.rect, image, { dxRatio: -0.04, dyRatio: -0.04, dwRatio: 0.08, dhRatio: 0.08 }),
        description: "bonus-only small up-left shift/expansion toward the visible blue bonus digits",
      },
    ];
  }
  if (fieldName === "total") {
    return [
      baseline,
      {
        id: "total-horizontal-expand-8pct",
        architecture: "F-detectorless-bonus-total-roi",
        rect: scaledRectFromRect(baseline.rect, image, { dwRatio: 0.08 }),
        description: "total-only horizontal expansion from the fixed baseline crop",
      },
      {
        id: "total-vertical-expand-10pct",
        architecture: "F-detectorless-bonus-total-roi",
        rect: scaledRectFromRect(baseline.rect, image, { dhRatio: 0.1 }),
        description: "total-only vertical expansion from the fixed baseline crop",
      },
      {
        id: "total-down-trim-8pct",
        architecture: "F-detectorless-bonus-total-roi",
        rect: scaledRectFromRect(baseline.rect, image, { dyRatio: 0.03, dhRatio: -0.08 }),
        description: "total-only small downward trim to reduce title/neighboring text bleed",
      },
    ];
  }
  return [baseline];
}

function buildMember2RecognitionVariants(field, image, baseline) {
  const fieldName = toFieldName(field);
  if (fieldName !== "member2") return [baseline];
  return [
    baseline,
    {
      id: "member2-horizontal-expand-10pct",
      architecture: "G-detectorless-member2-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dwRatio: 0.1 }),
      description: "member2-only horizontal expansion from the fixed baseline crop",
    },
    {
      id: "member2-left-trim-right-expand-8pct",
      architecture: "G-detectorless-member2-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dxRatio: 0.04, dwRatio: 0.08 }),
      description: "member2-only slight right shift/expansion to test left-edge contamination",
    },
    {
      id: "member2-right-trim-left-expand-8pct",
      architecture: "G-detectorless-member2-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dxRatio: -0.04, dwRatio: 0.08 }),
      description: "member2-only slight left shift/expansion to test right-edge contamination",
    },
    {
      id: "member2-vertical-expand-8pct",
      architecture: "G-detectorless-member2-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dhRatio: 0.08 }),
      description: "member2-only modest vertical expansion from the fixed baseline crop",
    },
  ];
}

function buildMember3RecognitionVariants(field, image, baseline) {
  const fieldName = toFieldName(field);
  if (fieldName !== "member3") return [baseline];
  return [
    baseline,
    {
      id: "member3-horizontal-expand-10pct",
      architecture: "H-detectorless-member3-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dwRatio: 0.1 }),
      description: "member3-only horizontal expansion from the fixed baseline crop",
    },
    {
      id: "member3-left-expand-right-trim-8pct",
      architecture: "H-detectorless-member3-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dxRatio: -0.04, dwRatio: 0.08 }),
      description: "member3-only slight left shift/expansion to test clipped leading digits",
    },
    {
      id: "member3-right-expand-left-trim-8pct",
      architecture: "H-detectorless-member3-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dxRatio: 0.04, dwRatio: 0.08 }),
      description: "member3-only slight right shift/expansion to test trailing digit or neighbor bleed",
    },
    {
      id: "member3-vertical-expand-8pct",
      architecture: "H-detectorless-member3-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dhRatio: 0.08 }),
      description: "member3-only modest vertical expansion from the fixed baseline crop",
    },
  ];
}

function withRecognitionProfiles(variants, profileIds) {
  return variants.flatMap((variant) =>
    profileIds.map((profileId) => ({
      ...variant,
      id: profileId === "recognizer-current" ? variant.id : `${variant.id}__${profileId}`,
      baseVariantId: variant.id,
      preprocessingProfileId: profileId,
      description:
        profileId === "recognizer-current"
          ? variant.description
          : `${variant.description}; deterministic blue-mask recognizer input`,
    }))
  );
}

function buildNonZeroBonusRecognitionVariants(field, image, baseline) {
  const fieldName = toFieldName(field);
  if (fieldName !== "bonus") return [baseline];
  const roiVariants = [
    baseline,
    {
      id: "bonus-horizontal-expand-12pct",
      architecture: "I-detectorless-nonzero-bonus-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dwRatio: 0.12 }),
      description: "bonus-only horizontal expansion from the fixed baseline crop",
    },
    {
      id: "bonus-vertical-expand-12pct",
      architecture: "I-detectorless-nonzero-bonus-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dhRatio: 0.12 }),
      description: "bonus-only vertical expansion from the fixed baseline crop",
    },
    {
      id: "bonus-up-shift-8pct",
      architecture: "I-detectorless-nonzero-bonus-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dyRatio: -0.08 }),
      description: "bonus-only upward shift to test visible blue bonus baseline alignment",
    },
    {
      id: "bonus-left-expand-right-trim-8pct",
      architecture: "I-detectorless-nonzero-bonus-roi",
      rect: scaledRectFromRect(baseline.rect, image, { dxRatio: -0.04, dwRatio: 0.08 }),
      description: "bonus-only asymmetric expansion away from following member/label text",
    },
  ];
  return withRecognitionProfiles(roiVariants, ["recognizer-current", "bonus-blue-mask"]);
}

function buildFieldRecognitionVariants(
  field,
  image,
  enabled,
  bonusTotalOnlyEnabled = false,
  member2OnlyEnabled = false,
  member3OnlyEnabled = false,
  nonZeroBonusOnlyEnabled = false
) {
  const baseline = {
    id: "baseline-12pct-padding",
    architecture: "D-detectorless-fixed-roi",
    rect: clampRect(padIpadArithmeticFieldZone(field, image, 0.12), image),
    description: "existing Stage3 field ROI with 12% padding",
  };
  if (member2OnlyEnabled && toFieldName(field) === "member2") {
    return buildMember2RecognitionVariants(field, image, baseline);
  }
  if (member3OnlyEnabled && toFieldName(field) === "member3") {
    return buildMember3RecognitionVariants(field, image, baseline);
  }
  if (nonZeroBonusOnlyEnabled && toFieldName(field) === "bonus") {
    return buildNonZeroBonusRecognitionVariants(field, image, baseline);
  }
  if (bonusTotalOnlyEnabled) return buildBonusTotalRecognitionVariants(field, image, baseline);
  if (!enabled) return [baseline];
  return [
    baseline,
    {
      id: "left-trim-6pct",
      architecture: "E-detectorless-deterministic-variants",
      rect: scaledRectFromZone(field.zone, image, { dxRatio: 0.03, dwRatio: -0.06 }),
      description: "general left-edge trim to reduce preceding-symbol bleed",
    },
    {
      id: "right-trim-6pct",
      architecture: "E-detectorless-deterministic-variants",
      rect: scaledRectFromZone(field.zone, image, { dxRatio: -0.03, dwRatio: -0.06 }),
      description: "general right-edge trim to reduce following-symbol bleed",
    },
    {
      id: "horizontal-expand-10pct",
      architecture: "E-detectorless-deterministic-variants",
      rect: scaledRectFromZone(field.zone, image, { dwRatio: 0.1 }),
      description: "general horizontal expansion for clipped 7-digit values",
    },
    {
      id: "vertical-trim-8pct",
      architecture: "E-detectorless-deterministic-variants",
      rect: scaledRectFromZone(field.zone, image, { dhRatio: -0.08 }),
      description: "general vertical trim to reduce row-neighbor bleed",
    },
  ];
}

function buildCandidateRows({
  imageName,
  side,
  fieldName,
  recognition,
  cropMetadata,
  cropKind = "field",
  profileId = "browser-rapidocr-recognition-only",
  sourceField = fieldName,
  itemIndex = 0,
  bbox = null,
  assignment = null,
}) {
  const parsed = parseIpadArithmeticOcrNumbers(recognition.text);
  const grouped = parseIpadGroupedNumberTokens(recognition.text);
  const seen = new Set();
  const rows = [];
  const assignmentRecord =
    assignment || {
      assignedField: fieldName,
      ambiguous: false,
      candidates: [{ field: fieldName, overlap: 1 }],
    };
  for (const [index, candidate] of parsed.entries()) {
    const key = `parsed|${candidate.value}|${candidate.raw}|${index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      image: imageName,
      stage: 3,
      side,
      sourceField,
      assignedField: fieldName,
      cropKind,
      profileId,
      value: candidate.value,
      raw: candidate.raw,
      fullText: recognition.text,
      parser: "literal-contiguous-digits",
      confidence: recognition.confidence,
      rapidOcrCompatibleConfidence: recognition.rapidOcrCompatibleConfidence,
      decoderSemantics: recognition.decoderSemantics,
      decodedTrace: recognition.decodedTrace,
      outputShape: recognition.outputShape,
      outputChecksum: recognition.outputChecksum,
      outputTopSummary: recognition.outputTopSummary,
      itemIndex,
      bbox,
      assignment: assignmentRecord,
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
      sourceField,
      assignedField: fieldName,
      cropKind,
      profileId,
      value: token.value,
      raw: token.rawToken,
      fullText: recognition.text,
      parser: "ipad-grouped-number-token",
      confidence: recognition.confidence,
      rapidOcrCompatibleConfidence: recognition.rapidOcrCompatibleConfidence,
      decoderSemantics: recognition.decoderSemantics,
      decodedTrace: recognition.decodedTrace,
      outputShape: recognition.outputShape,
      outputChecksum: recognition.outputChecksum,
      outputTopSummary: recognition.outputTopSummary,
      itemIndex,
      bbox,
      assignment: assignmentRecord,
      durationMs: recognition.durationMs,
      crop: cropMetadata,
    });
  }
  return rows;
}

async function recognizeCanvas({ runtime, cropCanvas, profileId = "recognizer-current" }) {
  const totalStarted = nowMs();
  const preprocessStarted = nowMs();
  const input = preprocessRecognitionInput(cropCanvas, profileId);
  const preprocessMs = Number((nowMs() - preprocessStarted).toFixed(3));
  const checksumStarted = nowMs();
  const inputChecksum = await sha256Hex(input.data.buffer.slice(0));
  const checksumMs = Number((nowMs() - checksumStarted).toFixed(3));
  const tensor = new runtime.ort.Tensor("float32", input.data, input.shape);
  const feeds = { [runtime.recSession.inputNames[0]]: tensor };
  const started = nowMs();
  const outputs = await runtime.recSession.run(feeds);
  const durationMs = Number((nowMs() - started).toFixed(3));
  const outputTensor = outputs[runtime.recSession.outputNames[0]];
  const decodeStarted = nowMs();
  const decoded = decodeCtc(outputTensor, runtime.characterList);
  const rapidOcrDecoded = decodeRapidOcrRecognizerOutput(outputTensor, runtime.characterList);
  const decodeMs = Number((nowMs() - decodeStarted).toFixed(3));
  const outputChecksum = await sha256Hex(outputTensor.data.buffer.slice(0));
  return {
    text: decoded.text,
    confidence: Number(decoded.confidence.toFixed(6)),
    rapidOcrCompatibleConfidence: Number(rapidOcrDecoded.confidence.toFixed(6)),
    decodedLength: decoded.decoded.length,
    decoderSemantics: rapidOcrDecoded.semantics,
    decodedTrace: rapidOcrDecoded.retained,
    outputTopSummary: rapidOcrDecoded.topSummary,
    durationMs,
    outputShape: outputTensor.dims,
    outputChecksum,
    parsedCandidates: parseIpadArithmeticOcrNumbers(decoded.text),
    groupedCandidates: parseIpadGroupedNumberTokens(decoded.text),
    inputChecksum,
    inputSamples: sampleFloatArray(input.data),
    preprocessing: input.metadata,
    phaseTimings: {
      preprocessMs,
      checksumMs,
      sessionRunMs: durationMs,
      decodeMs,
      totalMs: Number((nowMs() - totalStarted).toFixed(3)),
    },
  };
}

async function recognizeFrozenTensor({ runtime, tensorData, shape }) {
  const started = nowMs();
  const data = tensorData instanceof Float32Array ? tensorData : new Float32Array(tensorData || []);
  const dims = Array.isArray(shape) && shape.length ? shape.map((value) => Number(value)) : [1, 3, 48, 320];
  const inputChecksum = await sha256Hex(data.buffer.slice(0));
  const tensor = new runtime.ort.Tensor("float32", data, dims);
  const outputs = await runtime.recSession.run({ [runtime.recSession.inputNames[0]]: tensor });
  const outputTensor = outputs[runtime.recSession.outputNames[0]];
  const rapidOcrDecoded = decodeRapidOcrRecognizerOutput(outputTensor, runtime.characterList);
  return {
    text: rapidOcrDecoded.text,
    confidence: Number(rapidOcrDecoded.confidence.toFixed(6)),
    decoderSemantics: rapidOcrDecoded.semantics,
    decodedTrace: rapidOcrDecoded.retained,
    outputTopSummary: rapidOcrDecoded.topSummary,
    outputShape: outputTensor.dims,
    outputChecksum: await sha256Hex(outputTensor.data.buffer.slice(0)),
    inputChecksum,
    inputSamples: sampleFloatArray(data),
    durationMs: Number((nowMs() - started).toFixed(3)),
  };
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode frozen RapidOCR crop image."));
    image.src = dataUrl;
  });
}

async function canvasFromDataUrl(dataUrl) {
  const image = await loadImageFromDataUrl(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return canvas;
}

function compareTensorSamples(a = [], b = []) {
  const bByIndex = new Map(b.map((entry) => [entry.index, Number(entry.value)]));
  const rows = [];
  for (const sample of a) {
    if (!bByIndex.has(sample.index)) continue;
    const browserValue = bByIndex.get(sample.index);
    rows.push({
      index: sample.index,
      frozen: Number(sample.value),
      browser: browserValue,
      delta: Number(Math.abs(Number(sample.value) - browserValue).toFixed(8)),
    });
  }
  return {
    compared: rows.length,
    maxDelta: rows.reduce((max, row) => Math.max(max, row.delta), 0),
    rows,
  };
}

export async function runIpadStage3RapidOcrFrozenTensorReplay({ observations = [] } = {}) {
  const runtime = await loadRapidOcrRuntime();
  const generatedAt = new Date().toISOString();
  const results = [];
  for (const observation of observations) {
    const level1 = await recognizeFrozenTensor({
      runtime,
      tensorData: observation.tensorData,
      shape: observation.shape,
    });
    let level2 = null;
    if (observation.cropDataUrl) {
      const cropCanvas = await canvasFromDataUrl(observation.cropDataUrl);
      const browserRecognition = await recognizeCanvas({
        runtime,
        cropCanvas,
        profileId: observation.profileId || "recognizer-current",
      });
      level2 = {
        text: browserRecognition.text,
        confidence: browserRecognition.rapidOcrCompatibleConfidence,
        inputChecksum: browserRecognition.inputChecksum,
        inputSamples: browserRecognition.inputSamples,
        preprocessing: browserRecognition.preprocessing,
        sampleComparison: compareTensorSamples(observation.inputSamples || [], browserRecognition.inputSamples || []),
        outputChecksum: browserRecognition.outputChecksum,
        outputShape: browserRecognition.outputShape,
        outputTopSummary: browserRecognition.outputTopSummary,
      };
    }
    results.push({
      observationId: observation.id,
      image: observation.image,
      stage: observation.stage,
      side: observation.side,
      field: observation.field,
      expectedPipelineAText: observation.pipelineAText,
      expectedPipelineAConfidence: observation.pipelineAConfidence,
      level1,
      level2,
      level1MatchesPipelineA:
        String(level1.text || "") === String(observation.pipelineAText || "") &&
        Math.abs(Number(level1.confidence || 0) - Number(observation.pipelineAConfidence || 0)) < 0.00001,
      level2MatchesFrozenTensor: level2 ? level2.inputChecksum === observation.inputChecksum : false,
    });
  }
  return {
    schema: "ipad-stage3-rapidocr-frozen-tensor-replay-v1",
    debugFlag: "ipadStage3RapidOcrFrozenReplay=1",
    productionOutputChanged: false,
    generatedAt,
    runtime: {
      framework: "onnxruntime-web",
      executionProvider: runtime.config.executionProvider,
      modelInventory: runtime.modelInventory,
    },
    observations: results,
  };
}

async function recognizeFieldVariant({ runtime, image, imageName, field, variant }) {
  const fieldStarted = nowMs();
  const cropStarted = nowMs();
  const cropCanvas = canvasForCrop(image, variant.rect);
  const cropCanvasMs = Number((nowMs() - cropStarted).toFixed(3));
  const cropBlobStarted = nowMs();
  const cropBlob = await new Promise((resolve) => cropCanvas.toBlob(resolve, "image/png"));
  const cropBuffer = cropBlob ? await cropBlob.arrayBuffer() : new ArrayBuffer(0);
  const cropEncodeMs = Number((nowMs() - cropBlobStarted).toFixed(3));
  const decoded = await recognizeCanvas({
    runtime,
    cropCanvas,
    profileId: variant.preprocessingProfileId || "recognizer-current",
  });
  const recognition = {
    text: decoded.text,
    confidence: decoded.confidence,
    rapidOcrCompatibleConfidence: decoded.rapidOcrCompatibleConfidence,
    decodedLength: decoded.decodedLength,
    decoderSemantics: decoded.decoderSemantics,
    decodedTrace: decoded.decodedTrace,
    durationMs: decoded.durationMs,
    outputShape: decoded.outputShape,
    outputChecksum: decoded.outputChecksum,
    outputTopSummary: decoded.outputTopSummary,
    parsedCandidates: parseIpadArithmeticOcrNumbers(decoded.text),
    groupedCandidates: parseIpadGroupedNumberTokens(decoded.text),
    phaseTimings: decoded.phaseTimings,
  };
  const fieldName = toFieldName(field);
  const cropMetadata = {
    rect: variant.rect,
    variantId: variant.id,
    baseVariantId: variant.baseVariantId || variant.id,
    architecture: variant.architecture,
    variantDescription: variant.description,
    preprocessingProfileId: variant.preprocessingProfileId || "recognizer-current",
    sha256: await sha256Hex(cropBuffer),
    preprocessingChecksum: decoded.inputChecksum,
    inputSamples: decoded.inputSamples,
    preprocessing: decoded.preprocessing,
    timings: {
      cropCanvasMs,
      cropEncodeMs,
      recognitionTotalMs: decoded.phaseTimings?.totalMs || decoded.durationMs,
      totalFieldVariantMs: Number((nowMs() - fieldStarted).toFixed(3)),
    },
  };
  return {
    stage: 3,
    side: field.side,
    field: fieldName,
    slot: field.slot,
    roi: field.zone,
    crop: cropMetadata,
    variant: {
      id: variant.id,
      architecture: variant.architecture,
      description: variant.description,
    },
    recognition,
    candidateRows: buildCandidateRows({
      imageName,
      side: field.side,
      fieldName,
      recognition,
      cropMetadata,
      profileId:
        variant.architecture === "E-detectorless-deterministic-variants"
          ? "browser-rapidocr-detectorless-variant"
          : "browser-rapidocr-detectorless-fixed-roi",
    }),
  };
}

async function recognizeField({ runtime, image, imageName, field }) {
  const variants = buildFieldRecognitionVariants(
    field,
    image,
    runtime.config.roiVariantsEnabled,
    runtime.config.bonusTotalRoiVariantsEnabled,
    runtime.config.member2RoiVariantsEnabled,
    runtime.config.member3RoiVariantsEnabled,
    runtime.config.nonZeroBonusRoiVariantsEnabled
  );
  const results = [];
  for (const variant of variants) {
    results.push(await recognizeFieldVariant({ runtime, image, imageName, field, variant }));
  }
  return results;
}

function dilateMask2x2(mask, width, height) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!mask[index]) continue;
      out[index] = 1;
      if (x + 1 < width) out[index + 1] = 1;
      if (y + 1 < height) out[index + width] = 1;
      if (x + 1 < width && y + 1 < height) out[index + width + 1] = 1;
    }
  }
  return out;
}

function componentBoxesFromScoreMap({ scores, width, height, cropWidth, cropHeight }) {
  const baseMask = new Uint8Array(width * height);
  for (let index = 0; index < scores.length; index += 1) {
    if (scores[index] > DET_THRESH) baseMask[index] = 1;
  }
  const mask = dilateMask2x2(baseMask, width, height);
  const visited = new Uint8Array(mask.length);
  const boxes = [];
  const stack = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length) {
      const index = stack.pop();
      const x = index % width;
      const y = Math.floor(index / width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      scoreSum += Number(scores[index] || 0);
      scoreCount += 1;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (const next of neighbors) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
        const nx = next % width;
        const ny = Math.floor(next / width);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
        visited[next] = 1;
        stack.push(next);
      }
    }
    const score = scoreCount ? scoreSum / scoreCount : 0;
    if (score < DET_BOX_THRESH) continue;
    const boxWidthMap = Math.max(1, maxX - minX + 1);
    const boxHeightMap = Math.max(1, maxY - minY + 1);
    const expandX = (boxWidthMap * (DET_UNCLIP_RATIO - 1)) / 2;
    const expandY = (boxHeightMap * (DET_UNCLIP_RATIO - 1)) / 2;
    const sx = cropWidth / width;
    const sy = cropHeight / height;
    const x = Math.max(0, Math.round((minX - expandX) * sx));
    const y = Math.max(0, Math.round((minY - expandY) * sy));
    const right = Math.min(cropWidth, Math.round((maxX + 1 + expandX) * sx));
    const bottom = Math.min(cropHeight, Math.round((maxY + 1 + expandY) * sy));
    const rect = { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
    if (rect.width <= 3 || rect.height <= 3) continue;
    boxes.push({
      rect,
      score: Number(score.toFixed(6)),
      componentPixels: scoreCount,
      mapRect: { x: minX, y: minY, width: boxWidthMap, height: boxHeightMap },
      polygon: [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y],
        [rect.x + rect.width, rect.y + rect.height],
        [rect.x, rect.y + rect.height],
      ],
    });
  }
  return boxes.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x).slice(0, 1000);
}

async function detectTextBoxes({ runtime, cropCanvas }) {
  if (!runtime.detSession) {
    return {
      boxes: [],
      durationMs: 0,
      outputShape: [],
      preprocessingChecksum: null,
      preprocessing: null,
      skipped: true,
      reason: "detector disabled",
    };
  }
  const input = preprocessDetectionInput(cropCanvas, runtime.config.detectorLimitSideLen);
  const checksum = await sha256Hex(input.data.buffer.slice(0));
  const tensor = new runtime.ort.Tensor("float32", input.data, input.shape);
  const feeds = { [runtime.detSession.inputNames[0]]: tensor };
  const started = nowMs();
  const outputs = await runtime.detSession.run(feeds);
  const durationMs = Number((nowMs() - started).toFixed(3));
  const outputTensor = outputs[runtime.detSession.outputNames[0]];
  const dims = outputTensor.dims || [];
  const mapHeight = Number(dims[2] || 0);
  const mapWidth = Number(dims[3] || 0);
  const boxes =
    mapWidth > 0 && mapHeight > 0
      ? componentBoxesFromScoreMap({
          scores: outputTensor.data || [],
          width: mapWidth,
          height: mapHeight,
          cropWidth: cropCanvas.width,
          cropHeight: cropCanvas.height,
        })
      : [];
  return {
    boxes,
    durationMs,
    outputShape: dims,
    preprocessingChecksum: checksum,
    preprocessing: input.metadata,
  };
}

function cropCanvasRect(sourceCanvas, rect) {
  const clamped = {
    x: Math.max(0, Math.min(sourceCanvas.width - 1, Math.round(rect.x))),
    y: Math.max(0, Math.min(sourceCanvas.height - 1, Math.round(rect.y))),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
  clamped.width = Math.min(clamped.width, sourceCanvas.width - clamped.x);
  clamped.height = Math.min(clamped.height, sourceCanvas.height - clamped.y);
  const canvas = document.createElement("canvas");
  canvas.width = clamped.width;
  canvas.height = clamped.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(sourceCanvas, clamped.x, clamped.y, clamped.width, clamped.height, 0, 0, clamped.width, clamped.height);
  return canvas;
}

function buildDetectionCropRecords({ image, template }) {
  const stage3Fields = (template.fields || []).filter((field) => field.stage === 3);
  const records = [];
  for (const side of ["self", "enemy"]) {
    const sideFields = stage3Fields.filter((field) => field.side === side);
    const fieldRects = Object.fromEntries(sideFields.map((field) => [fieldSpecKey(field), clampRect(field.zone, image)]));
    for (const field of sideFields) {
      const fieldName = fieldSpecKey(field);
      const rect = clampRect(padIpadArithmeticFieldZone(field, image, 0.12), image);
      records.push({
        stage: 3,
        side,
        sourceField: fieldName,
        cropKind: "field",
        rect,
        fieldRects: {
          [fieldName]: rect,
        },
      });
    }
    const memberRects = sideFields
      .filter((field) => field.field === "member")
      .map((field) => clampRect(field.zone, image));
    const f1Rect = unionRects(memberRects, 0.08, image);
    records.push({
      stage: 3,
      side,
      sourceField: "side",
      cropKind: "f1-member-row",
      rect: f1Rect,
      fieldRects: Object.fromEntries(
        sideFields
          .filter((field) => field.field === "member")
          .map((field) => [fieldSpecKey(field), clampRect(field.zone, image)])
      ),
    });
    const sideZone = (template.stageSideZones || []).find((zone) => zone.stage === 3 && zone.side === side);
    if (sideZone?.zone) {
      const f2Rect = clampRect(sideZone.zone, image);
      records.push({
        stage: 3,
        side,
        sourceField: "side",
        cropKind: "f2-full-side",
        rect: f2Rect,
        fieldRects,
      });
    }
  }
  return records;
}

async function detectAndRecognizeCrop({ runtime, image, imageName, record }) {
  const cropCanvas = canvasForCrop(image, record.rect);
  const cropBlob = await new Promise((resolve) => cropCanvas.toBlob(resolve, "image/png"));
  const cropBuffer = cropBlob ? await cropBlob.arrayBuffer() : new ArrayBuffer(0);
  const detection = await detectTextBoxes({ runtime, cropCanvas });
  const items = [];
  const candidateRows = [];
  for (const [itemIndex, box] of detection.boxes.entries()) {
    const boxCanvas = cropCanvasRect(cropCanvas, box.rect);
    const recognition = await recognizeCanvas({ runtime, cropCanvas: boxCanvas });
    const absBbox = absoluteRect(box.rect, record.rect);
    const assignment = assignDetectionToField(absBbox, record.fieldRects || {});
    const assignedField = assignment.assignedField;
    const item = {
      itemIndex,
      bbox: absBbox,
      localBbox: box.rect,
      detectionScore: box.score,
      componentPixels: box.componentPixels,
      assignment,
      recognition: {
        text: recognition.text,
        confidence: recognition.confidence,
        decodedLength: recognition.decodedLength,
        durationMs: recognition.durationMs,
        outputShape: recognition.outputShape,
        parsedCandidates: parseIpadArithmeticOcrNumbers(recognition.text),
        groupedCandidates: parseIpadGroupedNumberTokens(recognition.text),
      },
    };
    items.push(item);
    if (!assignedField) continue;
    candidateRows.push(
      ...buildCandidateRows({
        imageName,
        side: record.side,
        fieldName: assignedField,
        recognition: item.recognition,
        cropMetadata: {
          rect: record.rect,
          sourceCropSha256: await sha256Hex(cropBuffer),
          detectedLocalBbox: box.rect,
          detectedAbsBbox: absBbox,
          detectionScore: box.score,
          preprocessingChecksum: recognition.inputChecksum,
          preprocessing: recognition.preprocessing,
        },
        cropKind: record.cropKind,
        profileId: "browser-rapidocr-detect-recognize",
        sourceField: record.sourceField,
        itemIndex,
        bbox: absBbox,
        assignment,
      })
    );
  }
  return {
    stage: 3,
    side: record.side,
    sourceField: record.sourceField,
    cropKind: record.cropKind,
    crop: {
      rect: record.rect,
      sha256: await sha256Hex(cropBuffer),
      preprocessingChecksum: detection.preprocessingChecksum,
      preprocessing: detection.preprocessing,
    },
    detection: {
      durationMs: detection.durationMs,
      outputShape: detection.outputShape,
      boxCount: detection.boxes.length,
      boxes: detection.boxes,
      postprocessApproximation:
        "connected-components axis-aligned approximation of offline cv2.findContours/minAreaRect/pyclipper DB postprocess",
    },
    items,
    candidateRows,
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
  const totalStarted = nowMs();
  const decodeStarted = nowMs();
  const detection = detectIpadOcrLayout(image);
  const imageDecodeAndLayoutMs = Number((nowMs() - decodeStarted).toFixed(3));
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
      recognizerOnly: false,
      detectorEnabled: true,
      productionEnabled: false,
      phaseTimings: {
        imageDecodeAndLayoutMs,
      },
    },
    fields: [],
    detectionCrops: [],
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
  payload.status = "ran-detector-recognizer-diagnostic";
  payload.modelInventory = runtime.modelInventory;
  payload.runtime = {
    ...payload.runtime,
    modelBase: runtime.config.modelBase,
    wasmBase: runtime.config.wasmBase,
    phaseTimings: runtime.phaseTimings,
    detectorEnabled: runtime.config.detectorEnabled,
    roiVariantsEnabled: runtime.config.roiVariantsEnabled,
    bonusTotalRoiVariantsEnabled: runtime.config.bonusTotalRoiVariantsEnabled,
    member2RoiVariantsEnabled: runtime.config.member2RoiVariantsEnabled,
    member3RoiVariantsEnabled: runtime.config.member3RoiVariantsEnabled,
    nonZeroBonusRoiVariantsEnabled: runtime.config.nonZeroBonusRoiVariantsEnabled,
    detectorCropKinds: runtime.config.detectorCropKinds,
    detectorLimitSideLen: runtime.config.detectorLimitSideLen,
  };

  const template = buildIpadArithmeticRoiTemplate(image);
  const stage3Fields = (template.fields || []).filter((field) => field.stage === 3);
  const detectionCropRecords = runtime.config.detectorEnabled
    ? buildDetectionCropRecords({ image, template }).filter((record) => runtime.config.detectorCropKinds.includes(record.cropKind))
    : [];
  const started = nowMs();
  const roiStarted = nowMs();
  const fieldWorkItems = [...stage3Fields];
  payload.runtime.phaseTimings.roiFieldCount = fieldWorkItems.length;
  payload.runtime.phaseTimings.roiCropPlanMs = Number((nowMs() - roiStarted).toFixed(3));
  const recognitionStarted = nowMs();
  let firstRecognizerCallMs = null;
  let remainingRecognizerCallsMs = 0;
  for (const field of stage3Fields) {
    const results = await recognizeField({ runtime, image, imageName: imageName || "", field });
    const fieldRecognitionMs = results.reduce(
      (sum, result) => sum + Number(result.recognition?.phaseTimings?.totalMs || result.recognition?.durationMs || 0),
      0
    );
    if (firstRecognizerCallMs === null) {
      firstRecognizerCallMs = Number(fieldRecognitionMs.toFixed(3));
    } else {
      remainingRecognizerCallsMs += fieldRecognitionMs;
    }
    for (const result of results) {
      payload.fields.push(result);
      payload.candidateRows.push(...result.candidateRows);
    }
  }
  for (const record of detectionCropRecords) {
    const result = await detectAndRecognizeCrop({ runtime, image, imageName: imageName || "", record });
    payload.detectionCrops.push(result);
    payload.candidateRows.push(...result.candidateRows);
  }
  payload.elapsedMs = Number((nowMs() - started).toFixed(3));
  payload.runtime.phaseTimings.firstRecognizerCallMs = Number((firstRecognizerCallMs || 0).toFixed(3));
  payload.runtime.phaseTimings.remainingRecognizerCallsMs = Number(remainingRecognizerCallsMs.toFixed(3));
  payload.runtime.phaseTimings.totalRecognizerFieldInferenceMs = Number(
    (nowMs() - recognitionStarted).toFixed(3)
  );
  const r6Started = nowMs();
  payload.r6.rows = buildR6EvidenceRows({
    imageName: imageName || "",
    diagnostics,
    candidateRows: payload.candidateRows,
  });
  payload.runtime.phaseTimings.r6EvaluationMs = Number((nowMs() - r6Started).toFixed(3));
  payload.runtime.phaseTimings.totalElapsedMs = Number((nowMs() - totalStarted).toFixed(3));
  payload.r6.summary = {
    wouldApply: payload.r6.rows.filter((row) => row.evaluation?.wouldApply).length,
    tp: 0,
    fp: 0,
    blocked: payload.r6.rows.filter((row) => !row.evaluation?.wouldApply).length,
    note:
      "Browser detector/recognizer candidates are exported. Frozen R6 proposal scoring remains blocked until the RapidOCR arithmetic selector proposal stage is ported with exact shared-helper parity.",
  };
  payload.diagnosticsSummary = {
    fieldCount: payload.fields.length,
    fieldVariantCount: payload.fields.length,
    detectionCropCount: payload.detectionCrops.length,
    detectedBoxCount: payload.detectionCrops.reduce((sum, crop) => sum + Number(crop.detection?.boxCount || 0), 0),
    candidateRowCount: payload.candidateRows.length,
    nonEmptyFields: payload.fields.filter((field) => field.recognition.text).length,
    nonEmptyDetectedItems: payload.detectionCrops.reduce(
      (sum, crop) => sum + crop.items.filter((item) => item.recognition?.text).length,
      0
    ),
    exactProductionMutation: false,
  };
  return payload;
}
