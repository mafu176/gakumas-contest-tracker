# iPad Stage3 RapidOCR Preprocessing/Tensor Parity Investigation

## Scope

This is a diagnostic-only pipeline reconstruction and parity investigation for iPad Stage3 RapidOCR.

Production OCR is unchanged:

- iPad production OCR remains Tesseract-based.
- RapidOCR Stage3 remains developer-only.
- Frozen R6 thresholds and semantics are unchanged.
- Smartphone, current-PC, and legacy desktop OCR are unchanged.

Generated artifacts are under:

- `tmp/ipad-stage3-rapidocr-preprocessing-parity/`

## Baselines

The required baselines were confirmed from existing artifacts:

| Area | Result |
| --- | ---: |
| Completed labeled iPad fixtures | 53 |
| Production recoveries | 119 TP / 0 FP |
| Original frozen offline RapidOCR member1 | 70 / 106 |
| Original frozen offline RapidOCR member2 | 52 / 106 |
| Original frozen offline RapidOCR member3 | 79 / 106 |
| Original frozen offline RapidOCR bonus | 53 / 106 |
| Original frozen offline RapidOCR total | 106 / 106 |
| Original frozen offline R6 | 4 TP / 0 FP |
| Current browser best-current frozen R6 | 0 TP / 0 FP |

The previous confidence investigation ruled out a decoder semantic bug:

- Both paths use CTC argmax per timestep.
- Adjacent duplicate class indices are removed.
- Blank index `0` is removed.
- Confidence is the arithmetic mean of retained timestep max probabilities.

## Pipeline Definitions

### PIPELINE A: ORIGINAL-OFFLINE

Historical artifact path:

- Generator: `scripts/ipad-stage3-alternate-model-investigation.mjs`
- Python runner: `tmp/ipad-stage3-rapidocr-fixture-expansion/rapidocr_runner.py`
- Results: `tmp/ipad-stage3-rapidocr-fixture-expansion/`

Implementation:

- Stage3 field crops were generated with `sharp.extract(...).png()`.
- Field crops used `padIpadArithmeticFieldZone(..., 0.12)`.
- F1 crops used a union of the three member slots.
- F2 crops used the full Stage3 side zone.
- Python `rapidocr_onnxruntime.RapidOCR()` consumed saved crop PNG files.
- Profiles:
  - `rapidocr-recognition-only`: field crops, `use_det=False`, `use_cls=False`, `use_rec=True`
  - `rapidocr-detect-recognize`: field/F1/F2 crops, `use_det=True`, `use_cls=False`, `use_rec=True`

Model/package inventory was written to:

- `tmp/ipad-stage3-rapidocr-preprocessing-parity/pipeline-a-inventory.json`

### PIPELINE B: CURRENT-OFFLINE-SAME-CROP

Artifact path:

- `scripts/ipad-stage3-rapidocr-confidence-parity.mjs`
- `tmp/ipad-stage3-rapidocr-confidence-parity/offline_confidence_helper.py`

This is not the historical crop generator. It recomputes offline ONNXRuntime recognition over current browser/direct-runner support crop rectangles.

### PIPELINE C: CURRENT-BROWSER

Artifact path:

- Runtime: `app/lib/ipadStage3RapidOcrBrowser.js`
- Direct runner: `scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs`
- Browser artifacts: `tmp/ipad-stage3-rapidocr-nonzero-bonus/run-1/`

Implementation:

- Browser Canvas/ImageBitmap source decode.
- Canvas crop.
- Canvas resize to height `48`, width `ceil(48 * ratio)`, capped/padded to `320`.
- BGR channel order.
- NCHW tensor layout.
- Normalization: `(channel / 255 - 0.5) / 0.5`.
- ONNX Runtime Web WASM.

## Geometry Comparison

The focused set is the 20 fields from the four historical R6 TP rows:

- `IMG_0265.png` Stage3 self
- `IMG_0265.png` Stage3 enemy
- `IMG_0283.png` Stage3 self
- `IMG_0491.png` Stage3 self

Geometry results:

| Comparison | G0 same | G1 minor | G2 material | G3 missing/different |
| --- | ---: | ---: | ---: | ---: |
| A vs B | 7 | 0 | 11 | 2 |
| A vs C | 20 | 0 | 0 | 0 |
| B vs C | 7 | 0 | 11 | 2 |

Conclusion:

- PIPELINE A and the baseline fixed-ROI portion of PIPELINE C use the same field crop geometry for the focused 20 fields.
- PIPELINE B is not a faithful replay of PIPELINE A geometry. For 13 / 20 fields it uses materially different or missing current support geometry.
- Therefore the prior "same-crop offline confidence oracle" cannot be treated as a reproduction of original offline success.

Detailed rows:

- `tmp/ipad-stage3-rapidocr-preprocessing-parity/geometry-comparison.json`

## Source and Crop Pixels

PIPELINE A saved crop PNGs can be reproduced from the original source screenshots with `sharp.extract(...)`.

The current browser artifacts expose crop SHA/metadata but not lossless browser crop pixels. Therefore:

- A saved crop vs A re-crop pixel parity is measurable.
- C crop pixels are not directly measurable from current artifacts.
- A vs C source-pixel parity remains partial until browser crop PNG export is added.

Artifacts:

- `tmp/ipad-stage3-rapidocr-preprocessing-parity/source-pixel-parity.json`
- `tmp/ipad-stage3-rapidocr-preprocessing-parity/crop-pixel-parity.json`

## First Divergence

Primary finding:

1. A vs B first diverges at Stage 1: crop geometry.
2. A vs C baseline geometry matches for the 20 focused field crops.
3. For A/C-like geometry, the next confirmed divergence is preprocessing/tensor construction before logits.

This means the issue is not confidence semantics. It is at least geometry plus preprocessing/tensor construction.

## 0.39215692 Delta

The previous confidence parity run observed max sampled tensor delta `0.39215692`.

Under the current normalization:

```text
normalized = (byte / 255 - 0.5) / 0.5
step per byte = 2 / 255 = 0.0078431373
0.39215692 / (2 / 255) ~= 50
```

So the observed delta is equivalent to about 50 byte levels in one channel after normalization. That is consistent with a real resized-pixel/content difference, not a tiny floating-point-only discrepancy.

## Resize, Channel, and Normalization

The browser path and diagnostic offline helper both intentionally use BGR, NCHW, and `(channel / 255 - 0.5) / 0.5`.

However, the resize/canvas path is not identical:

- PIPELINE A uses RapidOCR package internals, based on OpenCV/Python behavior.
- PIPELINE C uses browser Canvas `drawImage` with `imageSmoothingQuality="medium"`.
- PIPELINE B helper used Pillow bilinear for current support crops.

In one observed same-crop support case:

- B saw `737x104 -> width 340`.
- C fixed field path caps/pads to width `320`.

This reinforces that width policy and interpolation are not yet A-compatible across paths.

## Tensor and Logit Parity

Prior confidence parity carried forward:

- tensor checksum parity: 0 / 20
- top-1 timestep disagreements: 79
- max top-1 probability delta: 0.79345967

Current focused artifact:

- `tmp/ipad-stage3-rapidocr-preprocessing-parity/tensor-parity.json`
- `tmp/ipad-stage3-rapidocr-preprocessing-parity/logit-parity.json`

Because input tensors are not equivalent, native ONNXRuntime vs WASM cannot be isolated yet.

## TEST P and TEST G

### TEST P: current browser crop + original-compatible preprocessing

Not expanded.

Reason: the existing current-offline-same-crop oracle already used current browser support crop rectangles and recovered:

- 0 TP / 0 FP

So current crop geometry is not enough to recover the four historical offline TP rows.

### TEST G: original geometry + original preprocessing

Represented by the historical PIPELINE A artifact:

- 4 TP / 0 FP

A fresh browser-equivalent TEST G was not run because original detector-derived/F1/F2 geometry and RapidOCR package internals are not yet reproduced in browser form.

## Four Historical TP Rows

The four historical R6 TP rows remain historical A-only positives:

- `IMG_0265.png` Stage3 self
- `IMG_0265.png` Stage3 enemy
- `IMG_0283.png` Stage3 self
- `IMG_0491.png` Stage3 self

Focused audit:

- `tmp/ipad-stage3-rapidocr-preprocessing-parity/four-row-audit.json`

## IMG_0283

`IMG_0283.png` Stage3 self remains blocked in current browser evidence:

- `member1-confidence-below-0.90`
- `member2-confidence-below-0.90`
- `member3-confidence-below-0.90`

The earlier `IMG_0283.png` Stage3 enemy false-positive shape remains blocked by frozen R6.

## Root Cause Assessment

Current best classification:

- Confidence semantics: ruled out.
- Geometry: definitely relevant for A vs B.
- Preprocessing/tensor construction: definitely relevant for A/C after geometry matches.
- WASM/native numerical drift: not yet isolated, because tensor parity does not exist.

Browser RapidOCR remains viable only if the original successful crop geometry and preprocessing can be reproduced in a browser-safe way.

## Recommendation

Production-readiness review is not justified.

Exact next step:

1. Add developer-only browser crop PNG export for the focused 20 fields.
2. Reproduce PIPELINE A preprocessing stage-by-stage on those exact browser-exported crop pixels.
3. Implement only deterministic parity helpers needed to match PIPELINE A:
   - manual pixel crop if Canvas crop differs
   - exact width calculation
   - OpenCV-compatible bilinear resize if required
   - explicit right padding
   - explicit BGR/NCHW normalization
4. Re-check tensor parity before any full 106-side scoring.

Do not tune thresholds, add ROIs, or change R6.
