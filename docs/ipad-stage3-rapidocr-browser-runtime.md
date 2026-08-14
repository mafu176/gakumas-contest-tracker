# iPad Stage3 RapidOCR Browser Runtime

This is a developer-only diagnostic implementation. It does not change iPad production OCR output, Tier C, strict-total, strict-member2, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Command

```bash
node scripts/ipad-stage3-rapidocr-browser-verification.mjs
```

Useful options:

- `--only IMG_0265,IMG_0283`
- `--all`
- `--from IMG_0491`
- `--resume`
- `--runs 2`
- `--base-url http://localhost:3310`

Artifacts are written to:

```text
tmp/ipad-stage3-rapidocr-browser-runtime/
```

## Runtime Boundary

The browser path is enabled only by:

```text
?ipadStage3RapidOcrDebug=1
```

Normal production use does not initialize ONNX Runtime Web, fetch RapidOCR models, or run RapidOCR inference.

The app accepts only local diagnostic model URLs. The verification script serves them through Playwright route handlers:

- `/diagnostic-models/rapidocr/ch_PP-OCRv4_rec_infer.onnx`
- `/diagnostic-models/rapidocr/ch_PP-OCRv4_rec_character.txt`
- `/diagnostic-models/ort/*`

Model weights and extracted character metadata remain under `tmp/` and are not committed.

## Model Inventory

Offline model assets currently live under:

```text
tmp/rapidocr-python/rapidocr_onnxruntime/models/
```

| Role | File | Size | SHA256 | ONNX |
| --- | --- | ---: | --- | --- |
| Detector | `ch_PP-OCRv4_det_infer.onnx` | 4,745,517 | `d2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9` | IR 8, opset 12 |
| Recognizer | `ch_PP-OCRv4_rec_infer.onnx` | 10,857,958 | `48fc40f24f6d2a207a2b1091d3437eb3cc3eb6b676dc3ef9c37384005483683b` | IR 8, opset 12 |
| Classifier | `ch_ppocr_mobile_v2.0_cls_infer.onnx` | 585,532 | `e47acedf663230f8863ff1ab0e64dd2d82b838fceb5957146dab185a89d6215c` | IR 7, opset 11 |

Recognizer input/output:

- input `x`: dynamic `[N, 3, H, W]`
- diagnostic input used in browser: `[1, 3, 48, 320]`
- output `softmax_11.tmp_0`: `[N, T, 6625]`
- dictionary: model metadata key `character`; the verification script extracts it to a tmp-only `ch_PP-OCRv4_rec_character.txt`

The exact upstream source/license still needs to be confirmed before any model file is committed or deployed.

## Preprocessing

The browser recognizer-only path mirrors the Python recognizer preprocessing:

- crop source: existing iPad arithmetic Stage3 field ROI with 12% padding
- resize height: `48`
- max padded width: `320`
- interpolation: browser canvas medium smoothing
- channel order: `BGR`, matching `cv2.imread`
- layout: `NCHW`
- dtype: `float32`
- normalization: `(channel / 255 - 0.5) / 0.5`
- right padding: zero-filled

Each field export includes crop hash and preprocessing checksum.

## Real Browser Result

The default 10-image subset covered all 4 prior R6 TP images, the `IMG_0283` enemy blocked control, both iPad layout clusters, and mixed 6/7-digit Stage3 samples.

Subset images completed:

- `IMG_0264.png`
- `IMG_0265.png`
- `IMG_0268.png`
- `IMG_0273.png`
- `IMG_0283.png`
- `IMG_0296.png`
- `IMG_0491.png`
- `IMG_0792.png`
- `IMG_0798.png`
- `IMG_0801.png`

10-image browser recognizer-only result:

| Metric | Result |
| --- | ---: |
| Images | 10 |
| Stage3 sides | 20 |
| Fields | 100 |
| Browser exact expected fields | 55 / 100 |
| Offline recognition-only exact fields | 30 / 100 |
| Browser/offline exact value parity fields | 13 / 100 |
| R6 wouldApply | 0 |

Field breakdown:

| Field | Browser exact | Offline recognition-only exact | Exact value parity |
| --- | ---: | ---: | ---: |
| member1 | 18 / 20 | 8 / 20 | 3 / 20 |
| member2 | 6 / 20 | 2 / 20 | 4 / 20 |
| member3 | 17 / 20 | 10 / 20 | 3 / 20 |
| bonus | 0 / 20 | 0 / 20 | 1 / 20 |
| total | 14 / 20 | 10 / 20 | 2 / 20 |

One-image two-context stability check:

- image: `IMG_0265.png`
- run 1 browser exact fields: 5 / 10
- run 2 browser exact fields: 5 / 10
- field breakdowns matched exactly

Performance observed on the 10-image artifacts:

- average recognizer field inference: about 74 ms
- max recognizer field inference: about 154 ms
- average end-to-end image diagnostic elapsed time reported by the browser: about 10.9 s

The full 53-fixture browser run was not attempted after the 10-image subset showed that recognizer-only output is not equivalent to the offline RapidOCR candidate set needed for R6.

## R6 Parity Status

The frozen offline/shared-helper baseline remains:

- production safety baseline: 119 TP / 0 FP
- Tier C: 72 / 0
- strict-total: 15 / 0
- strict-member2: 32 / 0
- offline RapidOCR labeled Stage3 sides: 106
- offline exact counts: member1 70 / 106, member2 52 / 106, member3 79 / 106, bonus 53 / 106, total 106 / 106
- frozen R6: 4 TP / 0 FP
- `IMG_0283.png` Stage3 enemy remains blocked

The browser runtime currently exports recognizer-only field candidates. The prior R6 TP proposals were built from the broader offline RapidOCR candidate artifacts, including detect-recognize crops and arithmetic selector rows. Therefore real browser R6 parity is not yet claimed.

Current browser status:

- ONNX Runtime Web loads in the real browser.
- The recognizer model runs against real Stage3 field crops.
- Candidate JSON export works.
- Normal OCR output is unchanged.
- Browser recognizer-only candidates do not reproduce the frozen offline R6 proposal set.

## Divergence

The current divergence is layer B/C:

- Browser preprocessing and recognizer inference are operational.
- The browser diagnostic has not ported RapidOCR detector/classifier output or the offline unsafe selector that creates candidate side proposals.
- Because those proposal rows are absent, R6 has no browser-native proposal to score and remains blocked.

## Production Readiness

Do not productionize RapidOCR from this state.

The next useful experiment is a developer-only browser detector + recognizer export, or an explicit proof that recognizer-only fixed field crops can replace the offline detect-recognize sources without losing the 4 R6 TP rows or introducing the `IMG_0283` suffix-fragment FP.

Before production can be considered:

- model source/license must be confirmed
- deploy packaging must be decided
- detector/selector browser parity must be proven
- 53-fixture real-browser run must complete
- two fresh browser contexts must be stable across the full accepted set
- R6 must remain 4 TP / 0 FP or better without retuning
- iPad/Safari memory and startup behavior must be measured
