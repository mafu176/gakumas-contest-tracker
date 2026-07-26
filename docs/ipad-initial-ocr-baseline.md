# iPad Initial OCR Baseline

## Summary

- complete expected fixtures: 18
- incomplete fixtures excluded: 0
- image-level PASS: 0 / 18 (0%)
- stage-level PASS: 0 / 54 (0%)
- stage/side-level PASS: 0 / 108 (0%)

This is a diagnostic-only baseline for the new iPad fixture lane. It uses estimated iPad stage/side crops, writes artifacts under `tmp/ipad-ocr-baseline/`, and does not change production OCR output.

## Field Accuracy

| field | pass | total | accuracy |
| --- | ---: | ---: | ---: |
| member1 | 0 | 108 | 0% |
| member2 | 0 | 108 | 0% |
| member3 | 2 | 108 | 1.9% |
| all3Members | 0 | 108 | 0% |
| bonus | 79 | 108 | 73.1% |
| total | 2 | 108 | 1.9% |

## Stage/Side Position Accuracy

| position | pass | fail |
| --- | ---: | ---: |
| S1 self | 0 | 18 |
| S1 enemy | 0 | 18 |
| S2 self | 0 | 18 |
| S2 enemy | 0 | 18 |
| S3 self | 0 | 18 |
| S3 enemy | 0 | 18 |

## Per-Image Result

| image | result | failing stage/sides | artifact |
| --- | --- | --- | --- |
| `IMG_0264.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0264.png/baseline.json` |
| `IMG_0270.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0270.png/baseline.json` |
| `IMG_0278.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0278.png/baseline.json` |
| `IMG_0283.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0283.png/baseline.json` |
| `IMG_0287.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0287.png/baseline.json` |
| `IMG_0296.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0296.png/baseline.json` |
| `IMG_0300.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0300.png/baseline.json` |
| `IMG_0306.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0306.png/baseline.json` |
| `IMG_0317.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0317.png/baseline.json` |
| `IMG_0322.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0322.png/baseline.json` |
| `IMG_0326.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0326.png/baseline.json` |
| `IMG_0332.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0332.png/baseline.json` |
| `IMG_0337.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0337.png/baseline.json` |
| `IMG_0491.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0491.png/baseline.json` |
| `IMG_0497.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0497.png/baseline.json` |
| `IMG_0792.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0792.png/baseline.json` |
| `IMG_0796.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0796.png/baseline.json` |
| `IMG_0802.png` | FAIL | S1 self, S1 enemy, S2 self, S2 enemy, S3 self, S3 enemy | `tmp/ipad-ocr-baseline/IMG_0802.png/baseline.json` |

## Initial Interpretation

- The baseline establishes a repeatable PASS/FAIL harness for iPad fixtures, not a production OCR claim.
- The broad diagnostic crops are expected to fail frequently because iPad-specific ROI calibration and preprocessing are still unproven.
- The next useful iPad step is to inspect the generated crop artifacts and choose one geometry family for runner-only ROI calibration.

