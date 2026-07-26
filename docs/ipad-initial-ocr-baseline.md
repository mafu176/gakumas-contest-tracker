# iPad Initial OCR Baseline

## Summary

- complete expected fixtures: 18
- incomplete fixtures excluded: 0
- image-level PASS: 0 / 18 (0%)
- stage-level PASS: 4 / 54 (7.4%)
- stage/side-level PASS: 13 / 108 (12%)
- ROI template: `ipad-shared-portrait-v2`

This is a diagnostic-only baseline for the new iPad fixture lane. It uses isolated iPad field crops, writes artifacts under `tmp/ipad-ocr-baseline/`, and does not change production OCR output.

## Field Accuracy

| field | pass | total | accuracy |
| --- | ---: | ---: | ---: |
| member1 | 42 | 108 | 38.9% |
| member2 | 39 | 108 | 36.1% |
| member3 | 51 | 108 | 47.2% |
| all3Members | 34 | 108 | 31.5% |
| bonus | 34 | 108 | 31.5% |
| total | 38 | 108 | 35.2% |

## OCR Field Evidence Rates

- fields checked: 540
- non-empty OCR text: 379 / 540 (70.2%)
- numeric candidate present: 359 / 540 (66.5%)
- exact member fields: 132
- exact bonus fields: 34
- exact total fields: 38


## Stage/Side Position Accuracy

| position | pass | fail |
| --- | ---: | ---: |
| S1 self | 6 | 12 |
| S1 enemy | 7 | 11 |
| S2 self | 0 | 18 |
| S2 enemy | 0 | 18 |
| S3 self | 0 | 18 |
| S3 enemy | 0 | 18 |

## Per-Image Result

| image | result | failing stage/sides | artifact |
| --- | --- | --- | --- |
| `IMG_0264.png` | FAIL | S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0264.png/baseline.json` |
| `IMG_0270.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0270.png/baseline.json` |
| `IMG_0278.png` | FAIL | S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0278.png/baseline.json` |
| `IMG_0283.png` | FAIL | S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0283.png/baseline.json` |
| `IMG_0287.png` | FAIL | S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0287.png/baseline.json` |
| `IMG_0296.png` | FAIL | S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0296.png/baseline.json` |
| `IMG_0300.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0300.png/baseline.json` |
| `IMG_0306.png` | FAIL | S1 self, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0306.png/baseline.json` |
| `IMG_0317.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0317.png/baseline.json` |
| `IMG_0322.png` | FAIL | S1 self, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0322.png/baseline.json` |
| `IMG_0326.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0326.png/baseline.json` |
| `IMG_0332.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0332.png/baseline.json` |
| `IMG_0337.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0337.png/baseline.json` |
| `IMG_0491.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0491.png/baseline.json` |
| `IMG_0497.png` | FAIL | S1 self, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0497.png/baseline.json` |
| `IMG_0792.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0792.png/baseline.json` |
| `IMG_0796.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0796.png/baseline.json` |
| `IMG_0802.png` | FAIL | S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0802.png/baseline.json` |

## Per-Cluster Accuracy

| cluster | image | stage | stage/side | member fields | bonus fields | total fields |
| --- | --- | --- | --- | --- | --- | --- |
| ipad-01 1668x2420 | 0 / 13 (0%) | 3 / 39 (7.7%) | 10 / 78 (12.8%) | 90 / 234 (38.5%) | 21 / 78 (26.9%) | 27 / 78 (34.6%) |
| ipad-02 1640x2360 | 0 / 5 (0%) | 1 / 15 (6.7%) | 3 / 30 (10%) | 42 / 90 (46.7%) | 13 / 30 (43.3%) | 11 / 30 (36.7%) |

## Initial Interpretation

- The baseline establishes a repeatable PASS/FAIL harness for iPad fixtures, not a production OCR claim.
- The corrected field geometry makes Stage1 partially readable, but Stage2/Stage3 still need preprocessing work.
- The next useful iPad step is a runner-only preprocessing experiment over these isolated field crops.

