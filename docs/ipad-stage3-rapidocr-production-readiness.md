# iPad Stage3 RapidOCR Production Readiness

This is a production-readiness review for the developer-only detectorless iPad Stage3 RapidOCR browser architecture. It does not enable RapidOCR in normal production OCR and does not change R6, thresholds, ROI search, candidate ranking, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Baseline

| Item | Result |
| --- | ---: |
| completed iPad fixtures | 53 |
| Stage3 sides | 106 |
| current production recoveries | 119 TP / 0 FP |
| focused Level 2 frozen R6 | 4 TP / 0 FP |
| Level 3 focused raw crop replay | 26 / 26 |

## Frozen Candidate

Architecture: `IPAD_STAGE3_RAPIDOCR_V2_CANDIDATE`

- detectorless Stage3 fixed geometry
- ONNX Runtime Web WASM recognizer only
- no detector model load
- current parity-compatible recognizer preprocessing
- frozen R6 helper unchanged
- member1 baseline ROI
- member2 baseline plus vertical expand
- member3 baseline plus left-expand/right-trim and vertical expand
- bonus/total policies from the prior bounded investigations

## Full Browser Results

| Metric | Result |
| --- | ---: |
| images processed | 53 |
| Stage3 sides | 106 |
| R6 wouldApply | 0 |
| R6 TP | 0 |
| R6 FP | 0 |
| precision | 100% |
| NET_NEW_TP | 0 |
| NET_NEW_FP | 0 |

## Field Candidate Coverage

| Field | exact candidate | exact % | no numeric candidate | multiple candidates |
| --- | ---: | ---: | ---: | ---: |
| member1 | 83 / 106 | 78.3% | 4 | 91 |
| member2 | 54 / 106 | 50.9% | 0 | 99 |
| member3 | 92 / 106 | 86.8% | 3 | 93 |
| bonus | 42 / 106 | 39.6% | 0 | 106 |
| total | 90 / 106 | 84.9% | 6 | 96 |

Additional coverage:

- all 3 members exact: 48 / 106
- all 3 members + safe/default bonus evidence: 47 / 106
- all 5 fields exact: 15 / 106

Historical offline RapidOCR exact reference:

- member1 70 / 106
- member2 52 / 106
- member3 79 / 106
- bonus 53 / 106
- total 106 / 106

## R6 Applications

| image | side | result | proposal |
| --- | --- | --- | --- |
| - | - | - | - |

Every application has a full audit record in `tmp/ipad-stage3-rapidocr-production-readiness/r6-applications.json`.

## Historical Four

| image | side | accepted by full browser candidate | block reason |
| --- | --- | --- | --- |
| IMG_0265.png | self | no | total-confidence-below-0.90; member1-confidence-below-0.90; member2-confidence-below-0.90 |
| IMG_0265.png | enemy | no | changed-field-missing-rapidocr-support; total-confidence-below-0.90; member1-confidence-below-0.90; member2-confidence-below-0.90; member3-confidence-below-0.90 |
| IMG_0283.png | self | no | member1-confidence-below-0.90; member2-confidence-below-0.90; member3-confidence-below-0.90 |
| IMG_0491.png | self | no | total-confidence-below-0.90; member1-confidence-below-0.90; member2-confidence-below-0.90; member3-confidence-below-0.90 |

Historical recovered: 0 / 4.

## IMG_0283 Control

IMG_0283 Stage3 self is scored normally. IMG_0283 Stage3 enemy remains blocked, with block reasons:

`changed-field-missing-rapidocr-support; total-confidence-below-0.90; total-anchor-too-short; member1-too-short; member1-confidence-below-0.90; member2-too-short; member2-confidence-below-0.90; member3-too-short; member3-confidence-below-0.90; changed-field-low-digit-fragment`

## Fragment Safety

| Metric | Count |
| --- | ---: |
| candidate fields with prefix/suffix/contained relations | 372 |
| relation fields on accepted R6 rows | 0 |
| relation fields safely blocked | 372 |
| suffix relations | 876 |
| prefix relations | 536 |

The known IMG_0283 enemy suffix-fragment analogue remains blocked. Accepted rows with fragment relations are audited in the artifact and did not create FP in this review.

## Two-Run Stability

| Check | Result |
| --- | --- |
| second run available | yes |
| accepted proposal identities exact | yes |
| candidate-value exact images | 53 / 53 |

Confidence deltas for accepted fields are stored in `full-run-stability.json`. Bit-identical confidence is not required; R6 guard decisions stayed stable for accepted proposals.

## Cluster Results

| Cluster | fixtures | Stage3 sides | R6 TP | R6 FP |
| --- | ---: | ---: | ---: | ---: |
| ipad-01 | 33 | 66 | 0 | 0 |
| ipad-02 | 20 | 40 | 0 | 0 |

## Runtime And Calls

| Metric | Result |
| --- | ---: |
| total runtime | 206395.9 ms |
| mean per image | 3894.262 ms |
| median per image | 3811.4 ms |
| p95 per image | 4444.7 ms |
| avg recognizer calls per image | 50 |
| max recognizer calls per image | 50 |
| avg recognizer calls per Stage3 side | 25 |

## Payload

| Asset | Bytes |
| --- | ---: |
| recognizer ONNX | 10857958 |
| suggested ORT WASM | 13479978 |
| suggested ORT JS | 360359 |
| detector ONNX avoided | 4745517 |
| recognizer-only added payload estimate | 24698295 |

The proposed architecture does not require `ch_PP-OCRv4_det_infer.onnx`.

## Safari And Deployment

Chromium tested: yes. Actual iPad Safari tested: no.

ORT Web WASM should be treated as Safari-feasible but unproven here. Production integration should avoid threads/SharedArrayBuffer requirements unless a separate iPad Safari run proves them. A future implementation should lazy-load ORT/model assets only after iPad portrait detection and only when Stage3 remains eligible for additive RapidOCR recovery.

## Safety And Fallback

The future path must be:

`Tesseract production result -> existing iPad recoveries -> optional RapidOCR evidence -> frozen R6 -> apply only if uniquely accepted`.

It must not replace iPad Stage3 OCR wholesale. If model load, WASM init, preprocessing, inference, malformed output, timeout, or R6 rejection occurs, the existing production Tesseract output remains unchanged.

The future feature gate should be `ENABLE_IPAD_STAGE3_RAPIDOCR_V2 = false` by default. When false, normal users must not load ORT or model assets.

## Existing Recovery Overlap

| Metric | Count |
| --- | ---: |
| full production baseline rerun available | no |
| production baseline available Stage3 sides | 2 |
| RapidOCR applies to previously unresolved rows | 0 |
| same result as already exact/current recovery | 0 |
| conflicts | 0 |

The attempted full iPad production rerun was stopped because the current browser/Tesseract path was substantially slower than the direct RapidOCR diagnostic path. This does not affect the RapidOCR net-gain decision because the frozen candidate produced zero R6 applications.

## Bundle And Supply Review

With the feature disabled, this task does not add a production import of `onnxruntime-web` and does not commit model files. Future production must use dynamic import/code splitting and same-origin static model assets with fixed filenames and SHA256 checks. No arbitrary model URL and no remote OCR service should be allowed.

Model record:

- package: rapidocr-onnxruntime 1.4.4
- model: ch_PP-OCRv4_rec_infer.onnx
- source: RapidOCR / PP-OCRv4 recognizer model from the local diagnostic package
- package license observed locally: Apache-2.0
- model SHA256: 48fc40f24f6d2a207a2b1091d3437eb3cc3eb6b676dc3ef9c37384005483683b

## Production File Plan

Likely next integration files:

- `app/lib/ocr.js` for shared feature-gated recovery invocation
- `app/lib/ipadStage3RapidOcrBrowser.js` for lazy browser recognizer collection
- `app/page.js` only if the OCR orchestrator needs an async feature-gated hook
- tests/scripts for the 53-fixture readiness checks
- docs for rollout and rollback

## Decision

Final classification: **D. NOT WORTH PRODUCTIONIZING**.

Reason: The frozen candidate is safe in Chromium but does not meet the NET_NEW_TP >= 2 production complexity threshold.

Exact next step: Do not integrate RapidOCR yet; continue only if new evidence raises net-new gain without FP.

Production output changed in this task: no.
