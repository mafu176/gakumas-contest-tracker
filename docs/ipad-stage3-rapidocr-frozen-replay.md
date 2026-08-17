# iPad Stage3 RapidOCR Frozen-Input Replay

Status: diagnostic-only. No production OCR output changed.

## Purpose

This replay isolates the iPad Stage3 RapidOCR browser gap by removing crop geometry and browser image-processing ambiguity.

The investigation asks three questions:

1. Can ONNX Runtime Web reproduce the original offline recognizer when given the exact same final Float32 recognizer tensor?
2. Can browser JavaScript reproduce the Pipeline A recognizer tensor from the same Pipeline A crop pixels?
3. Can the browser recreate the four original frozen R6 proposals when fed Pipeline A-equivalent evidence?

## Command

```bash
node scripts/ipad-stage3-rapidocr-frozen-replay.mjs
```

Artifacts are written under:

```text
tmp/ipad-stage3-rapidocr-frozen-replay/
```

Generated artifacts include:

- `selected-observations.json`
- `offline-frozen-tensor-results.json`
- `browser-frozen-replay-results.json`
- `summary.json`
- `recognizer-crops/`
- `tensors/`

These artifacts are generated diagnostics and are not committed.

## Inputs

The replay uses existing Pipeline A artifacts, not current browser crops:

- `tmp/ipad-stage3-rapidocr-fixture-expansion/crop-manifest.json`
- `tmp/ipad-stage3-rapidocr-fixture-expansion/candidate-results.json`
- `tmp/ipad-stage3-rapidocr-fixture-expansion/r6-results.json`
- `tmp/ipad-stage3-rapidocr-fixture-expansion/unsafe-selector-results.json`

The focused replay set contains 26 recognizer observations:

- 19 observations supporting the four original frozen R6 TP rows
- IMG_0283 Stage3 enemy unsafe-selector negative-control observations
- a small set of blocked-control observations

Original frozen R6 baseline:

| metric | value |
| --- | ---: |
| wouldApply | 4 |
| TP | 4 |
| FP | 0 |

## Level 1: Frozen Tensor to Browser ONNX Runtime Web

The Python helper exports the final recognizer tensor immediately before recognizer ONNX inference using the same Pipeline A crop PNG and saved detection bbox provenance. That Float32 tensor is then sent directly to the browser-only debug hook:

```text
window.__IPAD_STAGE3_RAPIDOCR_FROZEN_REPLAY__
```

Result:

| metric | value |
| --- | ---: |
| observations compared | 26 |
| text matches Pipeline A | 26 |
| confidence matches within 0.00001 | 25 |
| confidence matches within 0.0002 | 26 |
| max confidence delta | 0.000189 |
| R6 support rows matching Pipeline A | 19 / 19 |

Conclusion:

ONNX Runtime Web can reproduce the Pipeline A recognizer text from the frozen final tensor. The one confidence delta is tiny and does not alter decoded text or candidate values.

## Level 2: Same Crop PNG to Browser Tensor

The browser also preprocesses the same target crop PNG with the current canvas recognizer path and compares that input against the frozen Python/cv2 tensor.

Result:

| metric | value |
| --- | ---: |
| observations compared | 26 |
| browser input checksum matches frozen tensor | 0 |
| result | mismatch |

Conclusion:

The blocker is not recognizer model execution or CTC decoding. The browser tensor created from the same crop pixels differs from the Pipeline A tensor. This keeps the issue in preprocessing/tensor construction, most likely canvas resize/interpolation and pixel handling versus Python `cv2.resize`.

## Level 3: R6 Proposal Recreation

Level 3 was not run as a production-adjacent adoption step because Level 2 failed.

The browser can replay the frozen recognizer tensors, but it cannot yet reproduce the Pipeline A tensors from crop pixels. Feeding Pipeline A-equivalent proposal evidence into R6 before fixing Level 2 would only prove an artificial path, not the real browser capture path.

## IMG_0283 Negative Control

IMG_0283 Stage3 enemy remains a negative control. Its unsafe selector proposal is included in the frozen replay sample, but this task does not apply any proposal and does not change UI output.

## Interpretation

The current evidence narrows the blocker:

- Model identity is not the primary blocker.
- Decoder confidence semantics are not the primary blocker.
- ONNX Runtime Web recognizer execution is not the primary blocker.
- Current browser crop-to-tensor preprocessing is the primary remaining mismatch.

The most useful next diagnostic is a browser implementation of Pipeline A-compatible recognizer preprocessing, starting with deterministic resize behavior that more closely matches Python `cv2.resize` for the already-frozen crop pixels.

## Production Safety

This work adds only developer-only replay plumbing:

- Normal OCR output is unchanged.
- RapidOCR production behavior is unchanged.
- iPad Tier C, strict total, and strict member2 recoveries are unchanged.
- Smartphone, current-PC, and legacy desktop OCR paths are unchanged.

Productionization is not recommended from this task.
