# iPad Preprocessing OCR Investigation

## Summary

- tested variants: 4
- member profile: `baseline-score-preprocess-3x-psm7`
- bonus profile: `blue-bonus-mask-3x-psm7`
- total profile: `white-mask-3x-psm7`
- selected-profile image PASS: 0 / 18 (0%)
- selected-profile stage PASS: 0 / 54 (0%)
- selected-profile stage/side PASS: 13 / 108 (12%)
- bounded candidate-union expected-value presence: 252 / 540 (46.7%)
- average bounded-union candidate count: 1.67
- ambiguous bounded-union fields: 261

This is diagnostic-only. It does not change ROI geometry, production OCR output, or any smartphone/current-PC/legacy desktop behavior.

## Current Preprocessing Baseline

- source format: screenshot RGB/RGBA crops via Sharp.
- baseline conversion: existing `createPreprocessedStageBuffer(...)` score preprocessing.
- OCR engine: Tesseract.js `eng`.
- baseline page segmentation: PSM 7 for isolated fields.
- whitelist: ASCII digits plus comma/period and plus-like bonus markers.
- candidate normalization: punctuation and non-digits are stripped, plus-like bonus candidates are preserved as provenance only.

## Tested Variant Matrix

| profile | fields | kind | scale | PSM |
| --- | --- | --- | ---: | ---: |
| `baseline-score-preprocess-3x-psm7` | member, bonus, total | existing | 3 | 7 |
| `invert-normalize-3x-psm7` | member, bonus, total | invert-normalize | 3 | 7 |
| `white-mask-3x-psm7` | member, bonus, total | white-mask | 3 | 7 |
| `blue-bonus-mask-3x-psm7` | bonus | blue-bonus-mask | 3 | 7 |

## Results By Field Type

| field | profile | exact | numeric candidates | empty | avg edit distance | digit length | newly correct | lost |
| --- | --- | --- | --- | --- | ---: | --- | ---: | ---: |
| member | `baseline-score-preprocess-3x-psm7` | 144 / 324 (44.4%) | 210 / 324 (64.8%) | 106 / 324 (32.7%) | 2.57 | 154 / 324 (47.5%) | 0 | 0 |
| member | `white-mask-3x-psm7` | 115 / 324 (35.5%) | 207 / 324 (63.9%) | 111 / 324 (34.3%) | 2.9 | 128 / 324 (39.5%) | 11 | 40 |
| member | `invert-normalize-3x-psm7` | 111 / 324 (34.3%) | 152 / 324 (46.9%) | 156 / 324 (48.1%) | 3.4 | 113 / 324 (34.9%) | 12 | 45 |
| bonus | `blue-bonus-mask-3x-psm7` | 59 / 108 (54.6%) | 77 / 108 (71.3%) | 25 / 108 (23.1%) | 1.05 | 59 / 108 (54.6%) | 39 | 17 |
| bonus | `baseline-score-preprocess-3x-psm7` | 37 / 108 (34.3%) | 41 / 108 (38%) | 59 / 108 (54.6%) | 3.29 | 10 / 108 (9.3%) | 0 | 0 |
| bonus | `white-mask-3x-psm7` | 35 / 108 (32.4%) | 46 / 108 (42.6%) | 53 / 108 (49.1%) | 3.31 | 13 / 108 (12%) | 8 | 10 |
| bonus | `invert-normalize-3x-psm7` | 32 / 108 (29.6%) | 42 / 108 (38.9%) | 58 / 108 (53.7%) | 3.44 | 10 / 108 (9.3%) | 9 | 14 |
| total | `white-mask-3x-psm7` | 56 / 108 (51.9%) | 103 / 108 (95.4%) | 2 / 108 (1.9%) | 2.04 | 59 / 108 (54.6%) | 10 | 4 |
| total | `baseline-score-preprocess-3x-psm7` | 50 / 108 (46.3%) | 102 / 108 (94.4%) | 6 / 108 (5.6%) | 2.24 | 52 / 108 (48.1%) | 0 | 0 |
| total | `invert-normalize-3x-psm7` | 49 / 108 (45.4%) | 90 / 108 (83.3%) | 5 / 108 (4.6%) | 2.63 | 52 / 108 (48.1%) | 10 | 11 |

## Per-Cluster Selected Profile Results

| cluster | image | stage | stage/side |
| --- | --- | --- | --- |
| ipad-01 1668x2420 | 0 / 13 (0%) | 0 / 39 (0%) | 11 / 78 (14.1%) |
| ipad-02 1640x2360 | 0 / 5 (0%) | 0 / 15 (0%) | 2 / 30 (6.7%) |

## Candidate Union

- member union profiles: `baseline-score-preprocess-3x-psm7`, `white-mask-3x-psm7`, `invert-normalize-3x-psm7`
- bonus union profiles: `blue-bonus-mask-3x-psm7`, `baseline-score-preprocess-3x-psm7`, `white-mask-3x-psm7`
- total union profiles: `white-mask-3x-psm7`, `baseline-score-preprocess-3x-psm7`, `invert-normalize-3x-psm7`
- Candidate union is an upper-bound diagnostic only. It does not choose values and does not use arithmetic.

## Regression Analysis

- member selected profile: 144 / 324 (44.4%), net 0, lost 0
- bonus selected profile: 59 / 108 (54.6%), net 22, lost 17
- total selected profile: 56 / 108 (51.9%), net 6, lost 4

## Visual Artifacts

- output directory: `tmp/ipad-preprocessing-investigation`
- representative comparison sheet: `tmp/ipad-preprocessing-investigation/representative-comparisons.png`

## Remaining Error Categories

- Many isolated white numeric fields still produce empty or non-numeric OCR after simple thresholding.
- Total/member fields remain sensitive to anti-aliased white text and patterned backgrounds.
- Bonus fields need separate treatment because blue bonus text responds differently from white score text.

## Recommendation

Proceed with a runner-only iPad candidate-selection experiment using a small bounded candidate union from the selected profiles. Do not productionize or apply arithmetic/crown/stage-wide solving until runner/browser-equivalent iPad evidence parity exists.

