# iPad Stage3 Alternate OCR / Model Investigation

## Scope

This is a diagnostic-only investigation. It does not replace Tesseract, does not change production OCR output, and does not modify Stage1/Stage2, T2, Tier C, strict-total, strict-member2, current-PC, smartphone, or legacy desktop behavior.

Current production checkpoint before the experiment:

| Metric | Result |
| --- | ---: |
| Completed iPad fixtures | 38 |
| Stage/sides | 228 |
| Production stage/side PASS | 112 / 228 |
| Production recoveries | 81 TP / 0 FP |
| Stage3 stage/side PASS | 0 / 76 |

The existing browser Tesseract Stage3 evidence remains exhausted:

| Field | Tesseract exact candidate presence |
| --- | ---: |
| member1 | 2 / 76 |
| member2 | 0 / 76 |
| member3 | 0 / 76 |
| bonus | 11 / 76 |
| total | 2 / 76 |

## Engine Inventory

| Engine / approach | Installed | Tested | Notes |
| --- | --- | --- | --- |
| PaddleOCR | No | No | Large Python framework, model download required, high integration cost. |
| EasyOCR | No | No | PyTorch stack, large dependency and model download required. |
| RapidOCR ONNXRuntime | Yes, diagnostic install under `tmp/rapidocr-python/` | Yes | CPU/offline after temporary install. Python-only as tested. |
| ONNX Runtime OCR/digit model | No suitable model | No | Potential future browser path via ONNX Runtime Web, but no model exists in the repo. |
| OpenCV/Pillow connected-component segmentation | Existing local image tooling | Yes, segmentation-only | No digit classifier is available, so it produces no numeric candidates by itself. |
| Browser Shape Detection `TextDetector` | No | No | Not available in the current browser path. |

Artifacts are written under `tmp/ipad-stage3-alternate-model/` and are intentionally uncommitted.

## Dataset

The script generated fixed, expected-blind crops from the 38 completed fixtures:

| Crop type | Count |
| --- | ---: |
| Stage3 per-field crops | 380 |
| F1 member-row crops | 76 |
| F2 full-side crops | 76 |

Each crop records source image hash, crop rectangle, crop hash, and dimensions in `crop-manifest.json` / `input-hashes.json`.

## RapidOCR Results

RapidOCR was tested with:

- `rapidocr-recognition-only` on per-field crops.
- `rapidocr-detect-recognize` on per-field, F1, and F2 crops.

Expected fixtures were used only after recognition output was generated.

| Field | RapidOCR exact candidate presence | Tesseract baseline |
| --- | ---: | ---: |
| member1 | 51 / 76 | 2 / 76 |
| member2 | 41 / 76 | 0 / 76 |
| member3 | 56 / 76 | 0 / 76 |
| bonus | 38 / 76 | 11 / 76 |
| total | 76 / 76 | 2 / 76 |

Upper bounds:

| Metric | Result |
| --- | ---: |
| All 3 member fields exact on a side | 34 / 76 |
| All 5 fields exact on a side | 13 / 76 |
| Perfect-selection Stage3 side upper bound | 13 / 76 |

This shows real recognition headroom, especially for member2/member3.

## Selector Simulation

Diagnostic simulation combined current production selected values with alternate OCR candidates and applied a strict Stage-wide equation check:

- exact observed values only
- unique global rank-1
- `crownBonus = floor(globalMax * 0.20)`
- exact self/enemy totals
- exact bonus consistency
- no near-match, no digit repair, no arithmetic-derived members

Result:

| Metric | Result |
| --- | ---: |
| Accepted stages | 4 |
| Stage/side TP | 7 |
| Stage/side FP | 1 |
| Blocked stages | 34 |
| Stage3 PASS gain candidate | 7 / 76 |

Accepted TP rows:

- `IMG_0265.png` Stage3 self/enemy
- `IMG_0273.png` Stage3 self/enemy
- `IMG_0283.png` Stage3 self
- `IMG_0491.png` Stage3 self/enemy

False positive:

- `IMG_0283.png` Stage3 enemy proposed `461 / 206 / 273`, total `940`, while expected is `713461 / 147206 / 227273`, total `1087940`.

The FP is safety-relevant. RapidOCR must not be productionized or sent to parity with the current selector policy.

## Runtime And Stability

Two full RapidOCR runs were executed. Exact candidate counts and selector simulation output were stable:

| Metric | Run 1 | Run 2 |
| --- | ---: | ---: |
| member1 exact | 51 / 76 | 51 / 76 |
| member2 exact | 41 / 76 | 41 / 76 |
| member3 exact | 56 / 76 | 56 / 76 |
| bonus exact | 38 / 76 | 38 / 76 |
| total exact | 76 / 76 | 76 / 76 |
| selector TP / FP | 7 / 1 | 7 / 1 |

Runtime:

| Profile | Calls | Avg/call | Total |
| --- | ---: | ---: | ---: |
| recognition-only | 380 | 25-28 ms | about 10 s |
| detect+recognize | 532 | 1.31-1.43 s | about 11.6-12.7 min |

The recognition-only path is fast enough for diagnostics. Detection is expensive.

## Stress Test

Twelve unlabeled source screenshots were processed as a stress subset using Stage3 F2 full-side crops:

| Metric | Result |
| --- | ---: |
| Images | 12 |
| Crops | 24 |
| Errors/timeouts | 0 |
| Text boxes | 127 |
| Numeric boxes | 95 |
| Average crop runtime | about 794 ms |

The engine is stable on unlabeled crops, but candidate volume is high and would need stricter geometry/provenance controls.

## Browser Feasibility

RapidOCR as tested is Python + ONNXRuntime + OpenCV. It is not directly deployable in the browser.

Possible future paths:

- identify or convert the recognition model for ONNX Runtime Web
- run OCR/model inference in a Web Worker
- evaluate model bundle size, startup latency, CSP constraints, and iPad/Safari compatibility
- design stricter selector guards to eliminate the observed FP before any parity phase

This is a browser-model architecture project, not a drop-in production recovery.

## Custom Model Feasibility

A custom digit model is not implemented here.

Approximate labeling pool if the full 84 iPad screenshots are completed:

| Label type | Approximate count |
| --- | ---: |
| All Stage1/2/3 field crops | 2,520 |
| Stage3 member field crops | 504 |

A custom model would require a separate train/validation/test split. Training and evaluating on the same 38 fixture values would be invalid. Synthetic augmentation may help only if the game font/background effects are reproduced and real held-out screenshots remain available.

## Scorecard

| Architecture | member1 | member2 | member3 | bonus | total | Selector TP / FP | Browser feasibility |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current Tesseract | 2 | 0 | 0 | 11 | 2 | current Stage3 0 / 76 | already deployed, exhausted |
| RapidOCR | 51 | 41 | 56 | 38 | 76 | 7 / 1 | Python-only as tested |
| Segmentation only | 0 | 0 | 0 | 0 | 0 | 0 / 0 | possible only with classifier |

## Recommendation

Recognition headroom exists, but alternate-engine integration is not justified yet because the strict selector simulation produced `1 FP` and only `7` Stage3 TP sides.

Recommended next step:

1. Do not productionize RapidOCR.
2. Do not run runner/browser parity yet.
3. If Stage3 OCR work continues, investigate a browser-deployable digit/model path with stricter FP controls, or finish the broader iPad fixture set before considering custom model training.

Production behavior remained unchanged throughout this investigation.
