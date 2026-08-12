# iPad Stage3 RapidOCR Fixture Expansion

Date: 2026-08-12

This task expands labeled iPad Stage3 coverage before any RapidOCR parity or production work. Production OCR was not changed, RapidOCR was not integrated, and the frozen `R6-hybrid-safe-side` rules were not tuned from the new expected values.

## Fixture Expansion

The labeled iPad fixture set increased from 38 to 53 complete fixtures.

Selected new fixtures:

| Image | Cluster | Selection reason |
| --- | --- | --- |
| `IMG_0282.png` | ipad-01 | Near the known `IMG_0283` suffix-fragment FP neighborhood; mixed 6/7-digit Stage3 with enemy crown. |
| `IMG_0284.png` | ipad-01 | High Stage3 self total with 7-digit member and self crown. |
| `IMG_0285.png` | ipad-01 | Stage2 enemy crown and Stage3 self crown; crowded Stage3 values. |
| `IMG_0286.png` | ipad-01 | Stage3 high 6-digit self crown control. |
| `IMG_0292.png` | ipad-01 | Stage3 self has 1.39M member and dense enemy row. |
| `IMG_0293.png` | ipad-01 | Stage1 enemy crown plus Stage3 self 7-digit member text. |
| `IMG_0294.png` | ipad-01 | Stage3 self 7-digit member with self crown. |
| `IMG_0295.png` | ipad-01 | Stage3 mixed 6/7-digit self row and slot diversity. |
| `IMG_0297.png` | ipad-01 | Stage1 enemy crown and Stage3 self crown, repeated 166,324 value. |
| `IMG_0298.png` | ipad-01 | Stage3 self includes 1.1M member and self crown. |
| `IMG_0795.png` | ipad-02 | Multiple Stage3 7-digit self values and high total. |
| `IMG_0798.png` | ipad-02 | Very high Stage3 self total and 7-digit members. |
| `IMG_0799.png` | ipad-02 | High Stage3 self total with large 7-digit members. |
| `IMG_0800.png` | ipad-02 | Stage1/2 enemy crown plus Stage3 self crown with 1.42M member. |
| `IMG_0801.png` | ipad-02 | Stage3 enemy crown and high self total without bonus. |

Validation:

- complete iPad fixtures: 53
- incomplete iPad fixtures: 31
- stages checked: 159
- stage/sides checked: 318
- arithmetic: PASS
- crown-bonus rule: PASS

## Production Baseline Note

The expanded browser-native production baseline ran across all 53 complete fixtures:

| Metric | Result |
| --- | ---: |
| images processed | 53 |
| stage/sides | 318 |
| stage/side PASS | 162 |
| production applications | 120 |
| TP | 119 |
| FP | 1 |

The FP is not caused by RapidOCR and no production code was changed here. It is an existing iPad production behavior exposed by the expanded labeled set, so it should be handled as a separate production bug/audit before using the expanded set as a release gate.

## RapidOCR Recognition

RapidOCR was run diagnostics-only over Stage3 crops for all 53 complete fixtures:

| Field | Exact observed | Total Stage3 sides |
| --- | ---: | ---: |
| member1 | 70 | 106 |
| member2 | 52 | 106 |
| member3 | 79 | 106 |
| bonus | 53 | 106 |
| total | 106 | 106 |

Split by fixture age:

| Field | Existing 38 exact / 76 | New 15 exact / 30 |
| --- | ---: | ---: |
| member1 | 51 / 76 | 19 / 30 |
| member2 | 41 / 76 | 11 / 30 |
| member3 | 56 / 76 | 23 / 30 |
| bonus | 38 / 76 | 15 / 30 |
| total | 76 / 76 | 30 / 30 |

## Selector And R6 Safety

The unsafe RapidOCR arithmetic selector still reproduces the known suffix-fragment hazard:

| Scope | would apply | TP | FP |
| --- | ---: | ---: | ---: |
| existing 38 | 8 | 7 | 1 |
| new 15 | 0 | 0 | 0 |
| combined 53 | 8 | 7 | 1 |

The frozen `R6-hybrid-safe-side` filter:

| Scope | would apply | TP | FP | blocked TP | blocked FP |
| --- | ---: | ---: | ---: | ---: | ---: |
| existing 38 | 4 | 4 | 0 | 3 | 1 |
| new 15 | 0 | 0 | 0 | 0 | 0 |
| combined 53 | 4 | 4 | 0 | 3 | 1 |

R6 accepted rows:

- `IMG_0265.png` Stage3 self
- `IMG_0265.png` Stage3 enemy
- `IMG_0283.png` Stage3 self
- `IMG_0491.png` Stage3 self

The known `IMG_0283.png` Stage3 enemy suffix-fragment FP remains blocked by R6.

## Stability

RapidOCR was run twice for the expanded Stage3 fixture set. The exact recognition counts, unsafe selector TP/FP counts, and R6 accepted proposals were stable across both runs:

- exact recognition counts stable: yes
- unsafe selector TP/FP stable: yes
- R6 accepted proposals stable: yes
- R6 FP across both runs: 0

Runtime was roughly 12 minutes per full 53-fixture RapidOCR diagnostic pass. The detect+recognize profile dominates the runtime.

## Deployment Feasibility

RapidOCR remains Python-only as tested. Browser production would require a separate deployable model path, likely ONNX Runtime Web/model conversion or a different bundled OCR model. No browser ONNX feasibility proof exists yet.

## Recommendation

Do not proceed directly to RapidOCR parity or production.

The expanded fixture set did not introduce an R6 false positive, which is encouraging, but it also did not add new R6 true positives. The next safe step is to first audit the newly exposed existing iPad production FP, then continue RapidOCR only if browser-deployable model feasibility can be proven without weakening the frozen R6 safety policy.

Generated diagnostics are under `tmp/ipad-stage3-rapidocr-fixture-expansion/` and are intentionally uncommitted.
