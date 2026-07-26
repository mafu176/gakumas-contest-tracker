# iPad Candidate Selection Investigation

## Summary

- command: `node scripts/ocr-test-images.mjs --ipad-candidate-selection-simulation`
- output directory: `tmp/ipad-candidate-selection`
- ROI geometry: `ipad-shared-portrait-v2`
- selected Candidate Selection v1 strategy: `current-primary` (Current primary-profile selection)
- selected exact fields: 261 / 540 (48.3%)
- selected net gain vs current primary: 0
- selected regressions vs current primary: 0
- observed numeric candidate-pool upper bound: 252 / 540 (46.7%)
- selectable output upper bound including zero defaults: 307 / 540 (56.9%)
- expected-present-but-not-selected fields: 25

This is runner-only and diagnostic-only. It does not change iPad production output, ROI geometry, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Candidate Pool Structure

Each field candidate preserves `value`, `rawText`, `normalizedText`, `fieldType`, contributing `profileIds`, deterministic `sourceRank`, crop quality (`foregroundRatio`, `connectedComponents`, `touchesBorder`), `digitCount`, and confidence signals. Identical numeric values are deduplicated while retaining all contributing profiles. Pools are capped at 6 values per field.

## Candidate Sources

| profile | fields | kind |
| --- | --- | --- |
| `baseline-score-preprocess-3x-psm7` | member, bonus, total | existing |
| `invert-normalize-3x-psm7` | member, bonus, total | invert-normalize |
| `white-mask-3x-psm7` | member, bonus, total | white-mask |
| `blue-bonus-mask-3x-psm7` | bonus | blue-bonus-mask |

## Candidate Count Statistics

- fields: 540
- average candidate count: 1.76
- median candidate count: 2
- max candidate count: 6
- empty candidate fields: 111
- single-candidate fields: 155
- multi-candidate fields: 274

| field | fields | avg candidates | empty | single | multi | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| total | 108 | 2.15 | 0 | 36 | 72 | 6 |
| bonus | 108 | 2.67 | 6 | 36 | 66 | 6 |
| member | 324 | 1.34 | 105 | 83 | 136 | 5 |

## Observed Digit-Length Schema

| field | min | max | non-zero min | non-zero max | length distribution |
| --- | ---: | ---: | ---: | ---: | --- |
| member | 1 | 7 | 3 | 7 | {"1":6,"3":3,"4":2,"5":74,"6":216,"7":23} |
| bonus | 1 | 6 | 5 | 6 | {"1":54,"5":27,"6":27} |
| total | 3 | 7 | 3 | 7 | {"3":3,"5":4,"6":61,"7":40} |

## Strategy Results

| strategy | exact fields | accuracy | net gain | newly correct | lost | present but not selected | expected absent |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `current-primary` | 261 / 540 (48.3%) | 48.3% | 0 | 0 | 0 | 25 | 288 |
| `profile-priority` | 238 / 540 (44.1%) | 44.1% | -23 | 2 | 25 | 25 | 288 |
| `consensus` | 184 / 540 (34.1%) | 34.1% | -77 | 4 | 81 | 79 | 288 |
| `quality-weighted` | 216 / 540 (40%) | 40% | -45 | 11 | 56 | 47 | 288 |
| `consensus-plus-quality` | 219 / 540 (40.6%) | 40.6% | -42 | 11 | 53 | 44 | 288 |

## Selected Strategy Field Results

| field | exact | accuracy | net gain | newly correct | lost |
| --- | --- | ---: | ---: | ---: | ---: |
| member | 144 / 324 (44.4%) | 44.4% | 0 | 0 | 0 |
| bonus | 61 / 108 (56.5%) | 56.5% | 0 | 0 | 0 |
| total | 56 / 108 (51.9%) | 51.9% | 0 | 0 | 0 |

## Per-Cluster Selected Strategy Results

| cluster | exact | accuracy | net gain | lost |
| --- | --- | ---: | ---: | ---: |
| ipad-01 | 188 / 390 (48.2%) | 48.2% | 0 | 0 |
| ipad-02 | 73 / 150 (48.7%) | 48.7% | 0 | 0 |

## Aggregate Simulated Accuracy

- image PASS: 0 / 18 (0%)
- stage PASS: 0 / 54 (0%)
- stage/side PASS: 12 / 108 (11.1%)
- member field accuracy: 144 / 324 (44.4%)
- bonus field accuracy: 61 / 108 (56.5%)
- total field accuracy: 56 / 108 (51.9%)

Aggregate PASS is calculated only from selected field-local outputs. No arithmetic, crown rule, or stage-wide solver is applied.

## Oracle Candidate-Pool Upper Bound

- expected present as observed numeric candidate: 252 / 540 (46.7%)
- expected absent from observed numeric candidates: 288
- selectable upper bound including zero defaults for blank member/bonus fields: 307 / 540 (56.9%)

| field | expected present | expected absent | present rate |
| --- | --- | ---: | ---: |
| member | 155 / 324 (47.8%) | 169 | 47.8% |
| bonus | 34 / 108 (31.5%) | 74 | 31.5% |
| total | 63 / 108 (58.3%) | 45 | 58.3% |

## Headroom Classification

| category | fields |
| --- | ---: |
| correct | 261 |
| expected present only in non-selected profile | 2 |
| expected absent from candidate pool | 154 |
| expected present but wrong candidate selected | 23 |
| candidate pool empty | 100 |

## Arithmetic-Combination Audit

This audit is not used for selection. It only measures whether a future arithmetic-aware stage/side selector could have enough evidence.

- stage/side rows: 108
- expected all 3 members present: 31
- expected bonus present: 83
- expected total present: 63
- all expected side fields present: 24
- at least one arithmetic-valid combination: 24
- exactly one arithmetic-valid combination: 24
- multiple arithmetic-valid combinations: 0
- no arithmetic-valid combination: 84

## Recommendation

Field-local candidate selection alone is useful for measuring candidate quality, but the selected v1 strategy still leaves broad ambiguity and does not improve aggregate stage/side PASS. The next experiment should remain runner-only and test a narrowly guarded iPad arithmetic-aware side selector only for rows with exactly one arithmetic-valid candidate combination and no missing member evidence.

