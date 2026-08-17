# iPad Stage3 RapidOCR Confidence Parity Investigation

## Scope

This is a diagnostic-only offline-vs-browser RapidOCR recognizer preprocessing and confidence parity investigation.

Production OCR is unchanged:

- iPad production OCR remains Tesseract-based.
- RapidOCR Stage3 remains developer-only.
- Tier C, strict total, strict member2, smartphone OCR, current-PC OCR, and legacy desktop OCR are unchanged.
- Frozen R6 semantics and thresholds are unchanged.

## Baselines

Source artifacts:

- `tmp/ipad-stage3-rapidocr-r6-blocker-isolation/`
- `tmp/ipad-stage3-rapidocr-nonzero-bonus/run-1/`
- `tmp/ipad-stage3-rapidocr-fixture-expansion/`

Confirmed baseline:

| Area | Result |
| --- | ---: |
| Completed labeled iPad fixtures | 53 |
| Production recoveries | 119 TP / 0 FP |
| Offline frozen R6 | 4 TP / 0 FP |
| Browser best-current frozen R6 | 0 TP / 0 FP |
| Browser best-current member1 exact | 83 / 106 |
| Browser best-current member2 exact | 54 / 106 |
| Browser best-current member3 exact | 92 / 106 |
| Browser best-current bonus exact | 42 / 106 |
| Browser best-current total exact | 90 / 106 |

The four frozen offline R6 TP rows remain:

- `IMG_0265.png` Stage3 self
- `IMG_0265.png` Stage3 enemy
- `IMG_0283.png` Stage3 self
- `IMG_0491.png` Stage3 self

## Crop Set

The diagnostic freezes the browser best-current exact support crops for the four offline TP rows, then runs an offline ONNXRuntime recognizer pass on the same source image rectangle and preprocessing profile where possible.

Generated artifacts:

- `tmp/ipad-stage3-rapidocr-confidence-parity/crop-parity.json`
- `tmp/ipad-stage3-rapidocr-confidence-parity/offline-preprocessing.json`
- `tmp/ipad-stage3-rapidocr-confidence-parity/browser-preprocessing.json`
- `tmp/ipad-stage3-rapidocr-confidence-parity/tensor-parity.json`

Findings:

- Browser support rects are deterministic and source-image based.
- Tensor checksums do not match offline recomputation.
- Sampled tensor deltas are usually small but non-zero.
- Largest sampled delta: `0.39215692`.
- Mean sampled-value delta across compared fields: about `0.01089`.

The first measurable divergence is preprocessing/tensor construction, not the R6 selector.

## RapidOCR Decoder Semantics

Offline RapidOCR `CTCLabelDecode` semantics were inspected from `rapidocr_onnxruntime/ch_ppocr_rec/utils.py`.

Exact semantics:

- Argmax class per timestep.
- Remove adjacent duplicate class indices.
- Remove blank index `0`.
- Join retained characters.
- Confidence is the arithmetic mean of max probabilities at retained decoded timesteps.

The browser developer RapidOCR decoder now exports the same retained-timestep semantics for diagnostics:

- `rapidOcrCompatibleConfidence`
- `decoderSemantics`
- `decodedTrace`
- `outputTopSummary`
- `outputChecksum`
- `inputSamples`

The previous browser confidence was already using the same retained-character arithmetic mean over browser logits. No decoder/confidence semantic mismatch was found.

Synthetic decoder checks are covered by:

```bash
node scripts/ipad-stage3-rapidocr-confidence-parity-tests.mjs
```

## Logit Parity

Generated artifact:

- `tmp/ipad-stage3-rapidocr-confidence-parity/logit-parity.json`

Summary over the frozen crop fields with browser top-k data:

- Output checksums do not match.
- Total top-1 timestep disagreements: `79`.
- Maximum top-1 probability delta: `0.79345967`.
- Mean of per-field max probability deltas: about `0.23779`.

Many fields decode to the same text despite different logits. The confidence differences are therefore caused by preprocessing/inference numeric differences, not by a different confidence aggregation formula.

## Confidence Block Audit

Generated artifacts:

- `tmp/ipad-stage3-rapidocr-confidence-parity/confidence-comparison.json`
- `tmp/ipad-stage3-rapidocr-confidence-parity/confidence-blocks-14.json`

The previous blocker isolation found 14 R6 confidence blockers. This audit reviewed the below-threshold exact support fields in the same frozen rows.

Result:

- Previous field-level confidence blocks: `14`
- Below-threshold exact support fields audited: `16`
- Resolved by same-crop offline confidence oracle: `0`

Representative rows:

| Image | Side | Field | Browser conf | Same-crop offline conf | Corrected pass |
| --- | --- | --- | ---: | ---: | --- |
| IMG_0265 | self | total | 0.842745 | 0.835026 | no |
| IMG_0265 | self | member1 | 0.886002 | 0.882097 | no |
| IMG_0265 | self | member2 | 0.799068 | 0.846070 | no |
| IMG_0265 | enemy | total | 0.846910 | 0.851970 | no |
| IMG_0283 | self | member1 | 0.772519 | 0.803989 | no |
| IMG_0491 | self | total | 0.743221 | 0.875055 | no |

The same-crop offline pass sometimes raises confidence but not enough to clear R6's `>= 0.90` guard.

## R6 Before / After

Generated artifact:

- `tmp/ipad-stage3-rapidocr-confidence-parity/r6-before-after.json`

R6 before:

- Browser best-current: `0 TP / 0 FP`

R6 after replacing browser confidence with same-crop offline confidence as a diagnostic oracle:

- `0 TP / 0 FP`
- Accepted rows: none

This means a pure browser confidence formula correction is not enough.

## IMG_0283 Safety

Generated artifact:

- `tmp/ipad-stage3-rapidocr-confidence-parity/img0283-audit.json`

`IMG_0283.png` Stage3 self remains blocked:

- `member1-confidence-below-0.90`
- `member2-confidence-below-0.90`
- `member3-confidence-below-0.90`

The known unsafe suffix-fragment behavior is not weakened. R6 remains frozen.

## All-106 Browser Safety

The current best browser evidence was reproduced across all 106 labeled Stage3 sides:

- Browser R6 wouldApply: `0`
- Browser R6 TP: `0`
- Browser R6 FP: `0`

No production or diagnostic acceptance was introduced.

## Stability

Two fresh browser contexts were run for the focused frozen TP images. R6 decision stability:

- Run 1: `0 TP / 0 FP`
- Run 2: `0 TP / 0 FP`
- Stable R6 decision: yes

The full all-106 best-current run also reproduced `0 TP / 0 FP`.

## Interpretation

Confidence can be classified as:

**D. incompatible confidence magnitude for frozen R6 use**

Not because the decoder formula differs, but because browser preprocessing/inference logits are numerically different enough that the frozen `0.90` confidence guard does not recover the offline TP rows.

The one member2 capture gap remains on `IMG_0265.png` Stage3 enemy, but it is not the only blocker. Even after a same-crop offline confidence oracle, the row remains blocked by missing member2 support and low confidence on other fields.

## Recommendation

Do not productionize browser RapidOCR Stage3 now.

Do not weaken R6 confidence thresholds.

Do not start another broad ROI search.

The next useful experiment is narrower:

1. Reproduce browser preprocessing more closely to offline RapidOCR/OpenCV preprocessing, starting with interpolation and exact tensor construction.
2. Re-test only the frozen proposal crop set.
3. Proceed only if the exact same frozen R6 guard reaches at least 2 TP / 0 FP without threshold tuning.

If preprocessing parity cannot move at least 2 TP above the frozen R6 confidence threshold, defer browser RapidOCR Stage3.
