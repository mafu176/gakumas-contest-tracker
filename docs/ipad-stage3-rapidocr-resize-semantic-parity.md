# iPad Stage3 RapidOCR Resize Semantic Parity

This investigation is diagnostic-only. Production OCR remains Tesseract-based, RapidOCR Stage3 remains developer-only, and no production selector, threshold, ROI, or crop geometry changed.

## Baseline

Source state:

- `bbb1de6 Investigate iPad RapidOCR OpenCV preprocessing parity`
- completed labeled iPad fixtures: 53
- production recoveries: 119 TP / 0 FP
- frozen historical R6: 4 TP / 0 FP

Frozen replay baseline:

| Check | Result |
| --- | ---: |
| Level 1 exact Pipeline A tensor -> browser ORT decoded text | 26 / 26 |
| Level 1 R6-support observations | 19 / 19 |
| OLD Level 2 canvas tensor checksum parity | 0 / 26 |
| current PARITY Level 2 raw crop parity | 26 / 26 |
| current PARITY Level 2 tensor checksum parity | 0 / 26 |
| current PARITY Level 2 decoded text parity | 23 / 26 |
| first A-vs-C divergence | A2/C2 resize for 26 / 26 |

## Current Level 2 R6 Result

The current near-parity Level 2 preprocessing was scored semantically through the existing R6 helper.

| Path | applications | TP | FP |
| --- | ---: | ---: | ---: |
| Historical Pipeline A | 4 | 4 | 0 |
| Level 1 exact tensor replay | 4 | 4 | 0 |
| current PARITY Level 2 | 4 | 4 | 0 |

Accepted identities under current PARITY Level 2:

| image | stage | side | proposal |
| --- | ---: | --- | --- |
| IMG_0265.png | 3 | self | 951228 / 628395 / 449753, bonus 190245, total 2219621 |
| IMG_0265.png | 3 | enemy | 370750 / 46611 / 26083, bonus 0, total 443444 |
| IMG_0283.png | 3 | self | 862800 / 789450 / 701079, bonus 172560, total 2525889 |
| IMG_0491.png | 3 | self | 756989 / 622972 / 706308, bonus 151397, total 2237666 |

Semantic success classification: **Outcome A**. Exact 26 / 26 tensor checksum parity is not required before moving to geometry replay for the four frozen R6 proposals.

## R6-Support Observations

The 19 support observations were compared against Pipeline A decoded text, candidate value, and the R6 confidence guard.

| Metric | Result |
| --- | ---: |
| text parity | 17 / 19 |
| candidate parity | 18 / 19 |
| confidence guard parity | 17 / 19 |

The mismatches do not change the four-proposal R6 outcome because alternate exact support remains available where needed.

## Text Mismatches

Current PARITY Level 2 has three decoded-text mismatches:

| observation | image | side | field | Pipeline A | Level 2 | R6-critical |
| --- | --- | --- | --- | --- | --- | --- |
| obs-3 | IMG_0265.png | self | member3 | 449753 | 5449753 | yes |
| obs-9 | IMG_0265.png | enemy | total | 443,444pt | 443.444pt | yes |
| obs-20 | IMG_0283.png | enemy | member1 | 713 461 14 | 71346214 | no |

The two R6-critical text differences do not create a missed proposal or false positive in the current semantic R6 run.

## Resize Delta Distribution

All 26 frozen crops were compared at A2/C2 resized-uint8 stage.

Browser NEAR helper vs Pipeline A `cv2.INTER_LINEAR`:

| Metric | Result |
| --- | ---: |
| crops compared | 26 |
| exact resized crops | 0 |
| total bytes | 969264 |
| differing bytes | 42135 |
| max byte delta | 1 |
| delta -1 | 28 |
| delta +1 | 42107 |
| delta beyond 1 | 0 |

Browser NEAR helper vs `cv2.INTER_LINEAR_EXACT`:

| Metric | Result |
| --- | ---: |
| crops compared | 26 |
| exact resized crops | 2 |
| total bytes | 969264 |
| differing bytes | 14592 |
| max byte delta | 1 |
| delta -1 | 7415 |
| delta +1 | 7177 |
| delta beyond 1 | 0 |

The current JS helper is still not byte-exact, but every observed real-crop resize difference is exactly +/-1 byte.

## OpenCV Details

Pipeline A source:

`tmp/rapidocr-python/rapidocr_onnxruntime/ch_ppocr_rec/text_recognize.py`

The recognizer calls:

```python
cv2.resize(img, (resized_w, img_height))
```

That means OpenCV default `INTER_LINEAR`.

Observed environment:

- `cv2.__version__`: 5.0.0
- source dtype: `uint8`
- resized destination dtype: `uint8`
- conversion to `float32` happens after resize

## Concrete +/-1 Trace

Synthetic case: `2x2 -> 3x3`, destination `(x=1, y=0, channel=0)`.

Source channel-0 pixels:

- `(0,0) = 10`
- `(1,0) = 47`

Browser NEAR mapping:

```text
x = (1 + 0.5) * 2 / 3 - 0.5 = 0.5
y = (0 + 0.5) * 2 / 3 - 0.5 = -0.1666667, clamped to top border
10 * 0.5 + 47 * 0.5 = 28.5
Math.round -> 29
```

OpenCV `INTER_LINEAR` output for the same byte is `28`. This identifies the remaining difference as OpenCV uint8 resize fixed-point / integer rounding semantics, not crop bytes, channel order, padding, normalization, ORT, or decoder behavior.

## Level 3

Because current PARITY Level 2 achieved 4 TP / 0 FP, a limited Level 3 geometry replay was run:

`historical source screenshot -> manifest crop rect -> local bbox -> raw BGR crop`

| Check | Result |
| --- | ---: |
| observations compared | 26 |
| raw crops matching frozen Pipeline A bytes | 26 |
| errors | 0 |

This confirms the frozen R6 observations use deterministic manifest geometry that can be recreated exactly from the source screenshots. It does not yet run a full browser image-decoding pipeline or the full 106-side expansion.

## IMG_0283

Current PARITY Level 2 accepted IMG_0283 self, matching historical R6. IMG_0283 enemy remains blocked; no false positive was introduced.

## Performance

The diagnostic artifact records per-observation browser PARITY preprocessing plus recognition time in:

`tmp/ipad-stage3-rapidocr-resize-semantic-parity/performance.json`

This is not a production performance benchmark because RapidOCR remains developer-only.

## Recommendation

Browser RapidOCR remains viable:

1. Level 1 proves ORT Web reproduces Pipeline A from exact tensors.
2. Current near-parity Level 2 already reproduces the frozen R6 outcome: 4 TP / 0 FP.
3. Historical geometry replay reproduces 26 / 26 frozen raw crops.

Do not spend more time chasing 26 / 26 tensor hashes before the next architecture step. The recommended next step is a narrow browser-side Level 3 review using the deterministic manifest geometry and current PARITY preprocessing, then decide whether the full 106-side expansion is justified.

Exact OpenCV fixed-point resize reproduction remains useful as a polish/follow-up, especially if a future Level 3 or full expansion loses R6-critical rows.
