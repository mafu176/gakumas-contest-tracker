# iPad Runner/Browser Candidate Mismatch Investigation

## Scope

This investigation compares the runner iPad Tier C arithmetic selector evidence with the real browser debug export. It is diagnostic-only:

- no iPad Tier C proposal is applied to final OCR output
- no production iPad OCR recovery is enabled
- smartphone, current-PC, and legacy desktop OCR behavior are intentionally unchanged
- expected values are used only after candidate generation for scoring, never to construct candidates

## Generalized Fixes Made

Two runner/browser implementation discrepancies were fixed or surfaced:

1. The runner iPad ROI template now uses the shared `buildIpadArithmeticRoiTemplate(...)` helper from `app/lib/ocr.js`.
   The runner converts the shared `{ x, y, width, height }` zones into Sharp-compatible `{ left, top, width, height }` zones only at the boundary.

2. iPad preprocessing profile definitions now come from the shared `getIpadArithmeticPreprocessingProfiles(...)` helper.
   The shared `white-mask-3x-psm7` profile now serializes its threshold (`176`), and the legacy baseline profile label now reflects the actual default 4x preprocessing path while preserving its existing profile id.

The browser debug path now exports per-profile diagnostic metadata:

- natural image dimensions
- ROI crop rectangle
- raw crop PNG hash
- processed crop PNG hash
- preprocessing profile metadata
- OCR engine/config
- OCR raw text and confidence
- parsed numeric candidates

The runner parity path now writes full field candidate pools to:

```bash
tmp/ipad-arithmetic-side-selection-parity/field-pools.json
```

## Commands

Runner/browser-equivalent parity:

```bash
node scripts/ocr-test-images.mjs --ipad-arithmetic-side-selection-parity
```

Real-browser mismatch investigation:

```bash
node scripts/ipad-arithmetic-browser-verification.mjs --investigate-candidate-mismatch
```

The mismatch command writes:

```bash
tmp/ipad-runner-browser-candidate-mismatch/
```

including `summary.json`, `per-case-comparison.json`, `per-field-comparison.json`, and per-case browser export artifacts.

## Before / After

Before this investigation, using the `d848298` real-browser verification artifacts:

| metric | result |
| --- | ---: |
| accepted cases expected | 5 |
| exact runner/browser matches | 0 / 5 |
| browser wouldApply | 1 / 5 |
| browser TP by proposal values | 1 |
| browser FP | 0 |
| output mutations | 0 |

After sharing the ROI template and profile definitions:

| metric | result |
| --- | ---: |
| runner/browser-equivalent rows | 108 / 108 exact |
| runner/browser-equivalent wouldApply | 4 |
| real-browser accepted cases compared | 4 |
| exact runner/real-browser matches | 0 / 4 |
| browser wouldApply | 0 / 4 |
| browser TP by proposal values | 0 |
| browser FP | 0 |
| output mutations | 0 |

One previous runner-accepted case disappeared after replacing the runner's local ROI copy with the shared ROI template. That indicates the older positive was dependent on runner-only evidence and should not be treated as production-ready.

## Field-Level Divergence

The mismatch investigation compared 20 fields from the 4 current runner-accepted cases:

| category | count |
| --- | ---: |
| image decode mismatch | 0 |
| ROI rectangle mismatch | 0 |
| preprocessing/profile mismatch | 20 |
| OCR raw-text mismatch after matching preprocessing hash | 0 |
| normalization mismatch after matching raw text | 0 |
| candidate-cap/dedup mismatch after matching OCR text | 0 |
| no mismatch | 0 |

Additional measured counts:

| check | result |
| --- | ---: |
| ROI rectangles matched | 20 / 20 |
| candidate pools matched | 6 / 20 |
| profile OCR raw text matched | 11 / 64 |
| profile parsed values matched | 33 / 64 |
| processed PNG hashes matched | 0 / 64 |

The earliest measured divergence is therefore no longer layout or crop geometry. It is the processed image/OCR boundary.

## Accepted Cases After Shared ROI

| image | stage | side | runner proposal | browser proposal | browser wouldApply |
| --- | ---: | --- | --- | --- | --- |
| `IMG_0264.png` | 1 | self | `169765 / 296381 / 167466 + 59276 = 692888` | none | false |
| `IMG_0270.png` | 1 | enemy | `41330 / 127105 / 103446 + 0 = 271881` | none | false |
| `IMG_0497.png` | 1 | self | `205442 / 762450 / 322186 + 152490 = 1442568` | none | false |
| `IMG_0792.png` | 1 | self | `690896 / 458571 / 123570 + 0 = 1273037` | none | false |

## Root Cause

The original 0/5 exact real-browser comparison had two causes:

1. The runner and browser diagnostic paths did not consume the same ROI/profile implementation. This was a generalized implementation discrepancy and has been fixed.

2. Even after shared ROI/profile definitions, real-browser preprocessing and OCR evidence still diverge from runner evidence. The browser path uses Canvas image processing and browser Tesseract.js, while the runner uses Sharp-generated PNGs and Node Tesseract.js. The processed PNG hashes differ for every compared profile, and OCR raw text differs for most profiles.

The remaining mismatch is therefore not a Tier C selector bug. The shared Tier C helper remains internally deterministic; the candidate evidence supplied to it is not identical between the real browser and runner.

## Production Recommendation

Do not productionize iPad Tier C from the current runner evidence.

The safest next experiment is to make browser-native iPad candidate evidence the source of truth for future iPad simulations, or to unify the OCR/preprocessing image pipeline enough that processed pixel hashes match before relying on runner-accepted proposals.

Until then:

- keep iPad Tier C diagnostic-only
- keep proposal application disabled in the UI
- continue using the browser debug export to judge production feasibility
- avoid reusing smartphone/current-PC recovery assumptions for iPad

