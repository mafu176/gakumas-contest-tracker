# iPad Stage3 RapidOCR Safety Investigation

## Scope

This is a diagnostic-only investigation of the RapidOCR-based iPad Stage3 candidate path. It does not change production OCR, existing iPad Tier C / strict-total / strict-member2 recoveries, smartphone OCR, current-PC OCR, or legacy desktop OCR.

Artifacts were generated under:

`tmp/ipad-stage3-rapidocr-safety/`

Source diagnostic artifacts came from the prior RapidOCR Stage3 investigation:

`tmp/ipad-stage3-alternate-model/`

## Production Baseline

The current authoritative iPad production baseline was confirmed before scoring RapidOCR filters:

| Metric | Result |
| --- | ---: |
| Completed iPad fixtures | 38 / 38 |
| Stage/side rows | 228 |
| Production stage/side PASS | 112 / 228 |
| Production recoveries | 81 TP / 0 FP |
| Stage3 PASS | 0 / 76 |

## RapidOCR Reproduction

The RapidOCR diagnostic results reproduced the prior investigation exactly:

| Field | Exact candidate presence |
| --- | ---: |
| member1 | 51 / 76 |
| member2 | 41 / 76 |
| member3 | 56 / 76 |
| bonus | 38 / 76 |
| total | 76 / 76 |

The current strict Stage3 selector reproduced:

| Selector | TP | FP |
| --- | ---: | ---: |
| Current RapidOCR Stage3 strict selector | 7 | 1 |

RapidOCR total recognition is the strongest signal in this dataset, but it is not safe by itself because the FP also includes a short suffix total fragment that forms a valid small-number equation.

## FP Root Cause

The single FP is:

| Image | Stage | Side |
| --- | ---: | --- |
| `IMG_0283.png` | 3 | enemy |

Expected:

- members: `713461 / 147206 / 227273`
- bonus: `0`
- total: `1087940`

Production before RapidOCR proposal:

- members: `712 / 270 / 29`
- bonus: `0`
- total: `1`

RapidOCR selector proposal:

- members: `461 / 206 / 273`
- bonus: `0`
- total: `940`

Root cause:

RapidOCR observed internally consistent small numeric suffix fragments. The selector accepted `461 + 206 + 273 = 940`, but these are suffix fragments of the displayed values, not the actual member/total values. The total crop also contained the true total text shape, for example `1,087,940`, while the candidate parser exposed the suffix `940` as an arithmetic-valid total.

The FP is safety-relevant because the arithmetic equation is exact. A future policy must reject short digit fragments rather than relying on equation consistency alone.

## TP vs FP Features

Accepted rows under the current selector:

| Image | Side | Class | Min changed confidence | Total confidence | Total digits | Min changed digits | Recognition-only changed fields | Low-digit changed fields |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `IMG_0265.png` | self | TP | 0.9073 | 0.9310 | 7 | 6 | 0 | 0 |
| `IMG_0265.png` | enemy | TP | 0.9120 | 0.9203 | 6 | 5 | 0 | 0 |
| `IMG_0273.png` | self | TP | 0.8813 | 0.9623 | 7 | 6 | 0 | 0 |
| `IMG_0273.png` | enemy | TP | 0.8489 | 0.9494 | 6 | 5 | 1 | 0 |
| `IMG_0283.png` | self | TP | 0.9007 | 0.9007 | 7 | 6 | 0 | 0 |
| `IMG_0283.png` | enemy | FP | 0.8466 | 0.9273 | 3 | 3 | 1 | 4 |
| `IMG_0491.png` | self | TP | 0.9359 | 0.9359 | 7 | 6 | 0 | 0 |
| `IMG_0491.png` | enemy | TP | 0.8821 | 0.8821 | 3 | 1 | 0 | 3 |

The strongest expected-blind FP separator is not confidence alone. The FP has:

- all changed numeric fields with very short digit lengths
- total digit count `3`
- suffix-fragment raw text
- one changed field supported only by recognition-only OCR

The `IMG_0491` enemy TP is also short, so a zero-FP policy that rejects all short-digit proposals sacrifices that TP. That tradeoff is acceptable for a safety-first RapidOCR v2 candidate path.

## Confidence Calibration

Confidence is only partially predictive.

| Field | Correct mean | Wrong mean | Predictive |
| --- | ---: | ---: | --- |
| member1 | 0.9107 | 0.9083 | no |
| member2 | 0.9291 | 0.9136 | weak |
| member3 | 0.9197 | 0.9158 | no |
| bonus | 0.9928 | 0.9221 | yes |
| total | 0.8957 | 0.9090 | no |

Because correct and wrong confidence distributions overlap heavily for members and totals, confidence should not be the main safety guard. It is useful only when combined with digit-length and source/provenance checks.

## Safety Filter Results

| Filter | Would apply | TP | FP | Blocked TP | Blocked FP | Stage3 gain |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| R0 current selector | 8 | 7 | 1 | 0 | 0 | 7 |
| R1 min confidence >= 0.90 | 4 | 4 | 0 | 3 | 1 | 4 |
| R2 per-field confidence | 0 | 0 | 0 | 7 | 1 | 0 |
| R3 cross-engine agreement | 1 | 1 | 0 | 6 | 1 | 1 |
| R4 high-confidence unique-field | 0 | 0 | 0 | 7 | 1 | 0 |
| R5 bbox quality | 1 | 0 | 1 | 7 | 0 | 0 |
| R6 hybrid safe side | 4 | 4 | 0 | 3 | 1 | 4 |
| Total-anchor only | 6 | 6 | 0 | 1 | 1 | 6 |
| Single candidate per field | 0 | 0 | 0 | 7 | 1 | 0 |

R5 proves geometry/bbox quality is insufficient by itself: it still accepts the FP. R2/R4 are too restrictive. Total-anchor is promising, but R6 is the recommended locked safety policy because it explicitly rejects short suffix-fragment proposals.

## Recommended Zero-FP Policy

Recommended diagnostic policy:

`RapidOCR Stage3 v2 + R6 hybrid safe side`

R6 requires:

- exact observed RapidOCR candidates only
- high-confidence total evidence
- total digit count at least 5
- every changed member candidate has at least 5 digits
- every changed member confidence at least 0.90
- changed member candidate pools are bounded
- no ambiguous bbox assignment for changed members
- all changed fields have support
- no near-match, digit repair, or arithmetic-derived OCR candidates

R6 result:

| Metric | Result |
| --- | ---: |
| wouldApply | 4 |
| TP | 4 |
| FP | 0 |
| Stage3 gain | 4 |
| wrong-slot count | 0 |

Accepted rows:

- `IMG_0265.png` Stage3 self
- `IMG_0265.png` Stage3 enemy
- `IMG_0283.png` Stage3 self
- `IMG_0491.png` Stage3 self

Blocked FP:

- `IMG_0283.png` Stage3 enemy, because the proposal depends on 3-digit suffix fragments.

## Stability

Two RapidOCR runs were compared:

| Metric | Result |
| --- | --- |
| runs compared | 2 |
| exact recognition stable | yes |
| selector stable | yes |
| selector TP / FP | 7 / 1 in both runs |

Latest run1 artifact:

`tmp/ipad-stage3-alternate-model-run1-20260811082347/`

## Stress Test

The unlabeled Stage3 stress subset completed without runtime errors:

| Metric | Result |
| --- | ---: |
| images | 12 |
| crops | 24 |
| errors | 0 |
| numeric items | 95 |
| average crop runtime | 793.7 ms |

This supports basic runtime stability, but it does not prove accuracy because the stress subset is unlabeled.

## Deployment Options

| Option | Feasibility | Notes |
| --- | --- | --- |
| ONNX Runtime Web | possible, high integration cost | Closest to current RapidOCR runtime, but model packaging, worker setup, Safari/iPad memory, and startup time must be tested. |
| WebAssembly | possible | Better offline story than server-side OCR, but may still be heavy for iPad Safari. |
| WebGPU | uncertain | Performance could help, but iPad Safari support and fallback paths add risk. |
| Server-side OCR | technically easiest | Avoids browser model constraints but changes deployment/privacy/offline assumptions. |
| Local desktop-only OCR | useful for diagnostics | Not sufficient for production iPad browser OCR. |

No browser deployment is recommended yet.

## Recommendation

Proceed only to diagnostic runner/browser-equivalent parity for RapidOCR Stage3 v2 using R6 as a locked expected-blind safety policy.

Do not productionize RapidOCR yet. The policy is promising (`4 TP / 0 FP`) but is still based on only 76 completed Stage3 sides. Before any browser deployment or production integration, transcribe 10-20 additional Stage3 fixtures and require R6 to remain `FP 0`.

Recommended next step:

1. Add browser-equivalent evidence plumbing for RapidOCR Stage3 v2 behind diagnostics only.
2. Keep R6 locked before scoring.
3. Re-score after more labeled Stage3 fixtures are added.
4. Consider production only if parity is exact and FP remains 0.

## Production Unchanged

This investigation added only diagnostic tooling and documentation. It does not alter:

- Stage1/Stage2 OCR
- Stage3 production Tesseract path
- iPad Tier C
- iPad strict-total
- iPad strict-member2
- rollback constants
- iPad ROI/preprocessing
- smartphone OCR
- current-PC OCR
- legacy desktop OCR

