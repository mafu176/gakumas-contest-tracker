# iPad Stage3 RapidOCR Detectorless Investigation

This is a diagnostic-only investigation. It does not change production OCR output, Stage3 Tesseract, Tier C, strict-total, strict-member2, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Baseline Confirmation

Latest starting commit: `0ffea42 Add iPad RapidOCR browser detector diagnostics`.

Production safety baseline remains:

| Metric | Result |
| --- | ---: |
| completed labeled iPad fixtures | 53 |
| iPad stage/sides | 318 |
| production recoveries | 119 TP / 0 FP |
| Tier C | 72 TP / 0 FP |
| strict-total | 15 TP / 0 FP |
| strict-member2 | 32 TP / 0 FP |

Offline RapidOCR/shared R6 baseline remains:

| Metric | Result |
| --- | ---: |
| Stage3 sides | 106 |
| member1 exact | 70 / 106 |
| member2 exact | 52 / 106 |
| member3 exact | 79 / 106 |
| bonus exact | 53 / 106 |
| total exact | 106 / 106 |
| frozen R6 | 4 TP / 0 FP |
| `IMG_0283.png` Stage3 enemy | blocked |

The `IMG_0283.png` Stage3 enemy blocked reasons remain:

- `total-anchor-too-short`
- `member1-too-short`
- `member1-confidence-below-0.90`
- `member2-too-short`
- `member3-too-short`
- `changed-field-low-digit-fragment`

## Diagnostic Runtime Changes

The developer-only browser runtime now supports an explicit detectorless mode:

```text
?ipadStage3RapidOcrDebug=1&ipadStage3RapidOcrDetectorEnabled=0
```

The verification script exposes the same control:

```bash
node scripts/ipad-stage3-rapidocr-browser-verification.mjs --only IMG_0265 --detector-enabled 0
```

When disabled, the browser runtime does not fetch or initialize `ch_PP-OCRv4_det_infer.onnx`. The recognizer model and character metadata are still loaded from tmp-only diagnostic routes.

The runtime also supports deterministic fixed-ROI variants:

```text
?ipadStage3RapidOcrDebug=1&ipadStage3RapidOcrDetectorEnabled=0&ipadStage3RapidOcrRoiVariants=1
```

```bash
node scripts/ipad-stage3-rapidocr-browser-verification.mjs --only IMG_0265 --detector-enabled 0 --roi-variants
```

Variant geometry is frozen before scoring and does not use expected values:

| Variant | Architecture | Definition |
| --- | --- | --- |
| `baseline-12pct-padding` | D | existing Stage3 field ROI with 12% padding |
| `left-trim-6pct` | E | trim left edge by fixed geometry |
| `right-trim-6pct` | E | trim right edge by fixed geometry |
| `horizontal-expand-10pct` | E | expand horizontally by fixed geometry |
| `vertical-trim-8pct` | E | trim vertical extent by fixed geometry |

Each value remains an observed OCR candidate with provenance. No candidate is selected with expected values, no arithmetic-derived candidates are added, and R6 semantics are unchanged.

## Architecture Definitions

| ID | Architecture | Status |
| --- | --- | --- |
| A | current full detector path | Implemented diagnostically, but real-browser run did not complete in practical local runtime |
| B | detector per fixed field | Implemented as `--detector-crop-kinds field`, but still did not complete in practical local runtime even with reduced detector limit |
| C | row/side detector | Implemented as `f1-member-row` / `f2-full-side`; not expanded because field-only detector already timed out |
| D | detectorless fixed ROI recognizer | Implemented and completed on `IMG_0265.png` |
| E | detectorless deterministic sub-ROI variants | Implemented, but one-image run exceeded practical local runtime |
| F | lightweight hybrid | Not implemented; current evidence points first to direct diagnostic invocation rather than a hybrid recovery architecture |

## Detector Bottleneck

The prior full detector verification stalled even with:

```bash
node scripts/ipad-stage3-rapidocr-browser-verification.mjs --only IMG_0265 --base-url http://localhost:3321
node scripts/ipad-stage3-rapidocr-browser-verification.mjs --only IMG_0265 --base-url http://localhost:3321 --detector-crop-kinds field --detector-limit-side-len 192
```

This investigation separated detector loading from recognizer-only execution by disabling the detector entirely. The fixed-ROI recognizer completed, so the previous blocker is not merely the debug export mechanism. It is either detector initialization/inference/postprocess or the extra detector crop loop interacting with the already-heavy UI OCR path.

The current browser verification path still triggers the normal OCR button workflow before the RapidOCR diagnostic export. That makes detector profiling noisy because the measurement includes production Tesseract OCR work. A future profiling script should call the developer-only diagnostic directly after image decode so phase timings isolate RapidOCR.

## One-Image Results

Representative image: `IMG_0265.png`.

### D - Detectorless Fixed ROI

Command:

```bash
node scripts/ipad-stage3-rapidocr-browser-verification.mjs --only IMG_0265 --runs 1 --base-url http://localhost:3322 --detector-enabled 0
```

Result:

| Metric | Result |
| --- | ---: |
| images | 1 |
| Stage3 sides | 2 |
| fields | 10 |
| browser exact fields | 5 / 10 |
| offline exact fields from full candidate artifact | 9 / 10 |
| browser detector exact fields | 0 |
| offline detector exact fields | 9 / 10 |
| candidate rows | 21 |
| diagnostic elapsed inside browser | 10.817 s |
| R6 wouldApply | 0 |

Field breakdown:

| Field | Browser exact | Offline exact |
| --- | ---: | ---: |
| member1 | 2 / 2 | 2 / 2 |
| member2 | 0 / 2 | 2 / 2 |
| member3 | 2 / 2 | 2 / 2 |
| bonus | 0 / 2 | 1 / 2 |
| total | 1 / 2 | 2 / 2 |

This confirms fixed-ROI recognizer-only is much more practical than the detector path, but it does not reproduce enough of the offline candidate evidence for the frozen R6 proposals.

### E - Deterministic ROI Variants

Command:

```bash
node scripts/ipad-stage3-rapidocr-browser-verification.mjs --only IMG_0265 --runs 1 --base-url http://localhost:3322 --detector-enabled 0 --roi-variants
```

Result: stopped after exceeding practical local runtime. The variant set multiplies recognition calls from 10 to 50 for one image. Under the current UI-driven verification flow, this is not practical enough to expand to the 10-image safety subset.

## Frozen R6 Result

No tested browser architecture produced browser-native R6 applications.

This is expected because the frozen R6 evaluator consumes proposal rows from the offline RapidOCR arithmetic selector. The browser runtime now exports candidate evidence, but the selector proposal stage is still not ported. This task did not retune or change R6.

## Architecture Efficiency

| Architecture | Models | Detector calls | Recognizer calls per image | Runtime observed | Candidate coverage | R6 TP / FP | Complexity |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| A full detector | detector + recognizer | field + F1 + F2 crops | detector boxes + fields | did not complete | unknown | not scored | high |
| B field detector | detector + recognizer | 10 field crops | detector boxes + fields | did not complete | unknown | not scored | medium |
| C row/side detector | detector + recognizer | 4 row/side crops | detector boxes + fields | not expanded | unknown | not scored | medium |
| D fixed ROI | recognizer only | 0 | 10 | completed; browser diagnostic 10.817 s, UI command about 38 s | 5 / 10 exact on `IMG_0265.png` | 0 / 0 | low |
| E fixed ROI variants | recognizer only | 0 | 50 | did not complete | unknown | not scored | medium |
| F hybrid | TBD | TBD | TBD | not implemented | unknown | not scored | TBD |

## Model Payload

| Bundle | Bytes |
| --- | ---: |
| Detector ONNX | 4,745,517 |
| Recognizer ONNX | 10,857,958 |
| Detector + recognizer | 15,603,475 |
| Recognizer only | 10,857,958 |

Dropping the detector would remove 4,745,517 bytes, about 30.4% of the detector+recognizer payload. It also avoids detector session creation and DB postprocess entirely.

## Stability and Clusters

Two fresh browser-context stability for the best completed architecture was attempted:

```bash
node scripts/ipad-stage3-rapidocr-browser-verification.mjs --only IMG_0265 --runs 2 --base-url http://localhost:3322 --detector-enabled 0
```

The run exceeded practical local runtime and was stopped. Cluster-specific ipad-01/ipad-02 expansion was therefore not performed in this pass.

## Failure Handling

Detector disabled mode is fail-safe:

- detector model is not fetched
- detector session is not created
- diagnostic JSON marks the detector as `loaded: false`
- production OCR output remains unchanged

Missing model/session/malformed-output failure handling for direct detectorless diagnostics still needs a direct diagnostic harness. The current UI-driven script can exercise route failures, but it is too slow to use as the main failure-test loop.

## Does Stage3 v2 Need a Detector?

Current answer: **C. hybrid or detectorless-first is preferable to exact full-detector parity, but production-readiness is not justified yet.**

Evidence:

- Full detector and field-only detector verification did not complete in practical runtime.
- Fixed-ROI recognizer-only completed and avoided the detector payload.
- Fixed-ROI recognizer-only was materially weaker than offline full RapidOCR on the R6 positive image tested.
- Deterministic variants were too expensive when run through the current UI-driven harness.
- R6 still has no browser-native selector proposals, so FP=0 production safety cannot be claimed for a RapidOCR recovery path.

## Recommended Next Step

Build a direct developer-only browser diagnostic runner that bypasses the normal OCR button workflow:

1. load image into the browser
2. call `runIpadStage3RapidOcrBrowserDiagnostic` directly
3. run D fixed-ROI and a much smaller E variant set independently
4. record per-phase timings without production Tesseract noise
5. only then expand to the 10-image safety subset

Do not continue exact detector parity as the default goal. The detector is too expensive in the current browser path, and a recognizer-only architecture has better payload and runtime potential if candidate coverage can be recovered safely.

## Production Confirmation

Production behavior is unchanged:

- no RapidOCR production path enabled
- Stage3 remains Tesseract-based
- Tier C unchanged
- strict-total unchanged
- strict-member2 unchanged
- smartphone OCR unchanged
- current-PC OCR unchanged
- legacy desktop OCR unchanged
