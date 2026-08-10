# iPad Browser Post-M3 Leverage Review

Status: diagnostic-only. Production OCR output was not changed.

## Production Baseline

- source: actual browser production verification artifacts, run-1 and run-2
- iPad fixtures: 18
- image PASS: 0 / 18
- stage PASS: 17 / 54
- stage/side PASS: 52 / 108
- production applications: 36
- production TP / FP: 36 / 0
- recovery counts: ipad-tier-c-exactly-one-arithmetic=24, ipad-strict-total-selection=4, ipad-strict-member2-selection=8

M3 contribution is preserved: stage/side 44 / 108 -> 52 / 108, stage 10 / 54 -> 17 / 54, member2 exact 54 / 108 -> 62 / 108.

## Run Stability

- production output stable: yes
- candidate pools stable: yes
- failure classifications stable: yes
- one-field-away counts stable: yes
- leverage ranking stable: yes
- mismatch count: 0

## 108-Side Taxonomy

| category | all sides | remaining failures |
| --- | --- | --- |
| A. Primary PASS | 16 | 0 |
| B. Recovered by Tier C | 24 | 0 |
| C. Recovered by strict-total | 4 | 0 |
| D. Recovered by strict-member2 | 8 | 0 |
| G. No useful expected evidence | 56 | 56 |

Counts total 108 stage/sides. Remaining failures total 56.

## Field Coverage

| field | selected exact | expected candidate present | candidate absent | exact present but not selected |
| --- | --- | --- | --- | --- |
| member1 | 71 / 108 (65.7%) | 73 / 108 | 35 | 2 |
| member2 | 62 / 108 (57.4%) | 70 / 108 | 38 | 11 |
| member3 | 73 / 108 (67.6%) | 70 / 108 | 38 | 0 |
| bonus | 67 / 108 (62%) | 51 / 108 | 57 | 4 |
| total | 64 / 108 (59.3%) | 68 / 108 | 40 | 4 |

## Recognition Versus Selection

Wrong fields are selection failures only when the exact expected value is already present in the production candidate pool. Otherwise they are recognition/capture failures.

| field.reason | count |
| --- | --- |
| bonus.recognition | 37 |
| bonus.selection | 4 |
| bonus.truncated | 7 |
| member1.emptyPool | 2 |
| member1.recognition | 35 |
| member1.selection | 2 |
| member1.truncated | 2 |
| member2.recognition | 35 |
| member2.selection | 11 |
| member2.truncated | 5 |
| member3.emptyPool | 2 |
| member3.recognition | 35 |
| member3.truncated | 1 |
| total.recognition | 40 |
| total.selection | 4 |
| total.truncated | 8 |

## Wrong-Field Histogram

Pre-M3 histogram was: 1 wrong=15, 2 wrong=11, 3 wrong=3, 4 wrong=10, 5 wrong=25.

Post-M3:

| wrong fields | remaining sides |
| --- | --- |
| 1 | 7 |
| 2 | 11 |
| 3 | 3 |
| 4 | 10 |
| 5 | 25 |

M3 moved eight member2-only or member2-dominated rows out of the remaining failure set, increasing clean side/stage completions while leaving recognition-heavy rows as the dominant residual group.

## One-Field-Away

| field | count |
| --- | --- |
| bonus | 5 |
| total | 2 |

Detailed rows are saved to `tmp/ipad-post-m3-leverage-review/one-field-away.json`.

## Two-Field-Away Pairs

| field pair | count |
| --- | --- |
| member2 + bonus | 6 |
| member2 + total | 3 |
| bonus + total | 2 |

## Single-Field Oracle Leverage

| oracle | added side PASS | added stage PASS | image PASS |
| --- | --- | --- | --- |
| member1 | 0 | 0 | 0 |
| member2 | 0 | 0 | 0 |
| member3 | 0 | 0 | 0 |
| bonus | 5 | 5 | 0 |
| total | 2 | 2 | 0 |
| allMembers | 0 | 0 | 0 |
| stage1MembersOnly | 0 | 0 | 0 |
| stage2MembersOnly | 0 | 0 | 0 |
| stage3MembersOnly | 0 | 0 | 0 |

## Selection-Only Leverage

| field | added side PASS | added stage PASS | image PASS |
| --- | --- | --- | --- |
| member1 | 0 | 0 | 0 |
| member2 | 0 | 0 | 0 |
| member3 | 0 | 0 | 0 |
| bonus | 1 | 1 | 0 |
| total | 0 | 0 | 0 |

## Recognition-Only Leverage

| field | added side PASS | added stage PASS | image PASS |
| --- | --- | --- | --- |
| member1 | 0 | 0 | 0 |
| member2 | 0 | 0 | 0 |
| member3 | 0 | 0 | 0 |
| bonus | 4 | 4 | 0 |
| total | 2 | 2 | 0 |

## Member1 / Member3 Audit

| field | wrong | exact present but unselected | one-field-away | candidate complete |
| --- | --- | --- | --- | --- |
| member1 | 37 | 2 | 0 | 1 |
| member3 | 35 | 0 | 0 | 0 |

Member1/member3 can reuse the M3 idea only if a future guard proves unchanged fields, a single observed matching candidate, and exact arithmetic without competing interpretations.

## Bonus Leverage

- one-field-away bonus sides: 5
- exact candidate present among those: 1
- exact candidate absent among those: 4

Strict arithmetic using existing bonus candidates is worth investigating only if those candidates are already browser-observed and provenance is not from noisy diagnostic-only sources.

## Total Leverage

- one-field-away total sides: 2
- exact candidate present among those: 0
- exact candidate absent among those: 2

Remaining total cases blocked after strict-total are not automatically safe; exact candidate presence must still be paired with direct provenance and no competing interpretation.

## Stage3 Status

- Stage3 self PASS: 0 / 18
- Stage3 enemy PASS: 0 / 18
- Stage3 stage/side PASS: 0 / 36
- one-field-away Stage3 sides: 0
- two-field-away Stage3 sides: 0
- 3+ wrong-field Stage3 sides: 36

| field | wrong / total | exact candidate present when wrong |
| --- | --- | --- |
| member1 | 36 / 36 | 1 |
| member2 | 35 / 36 | 0 |
| member3 | 35 / 36 | 0 |
| bonus | 26 / 36 | 0 |
| total | 36 / 36 | 0 |

Stage3 remains a separate architecture problem unless a narrow existing-candidate selector shows at least two stable, low-risk side gains.

## Stage Completion Leverage

| target field | stage completions |
| --- | --- |
| bonus | 5 |
| total | 2 |

## Image Completion Leverage

Nearest fixtures to full-image PASS:

| image | passing stages | failing sides | one-field-away failing sides | two-field-away failing sides |
| --- | --- | --- | --- | --- |
| IMG_0283.png | 2 | 2 | 0 | 0 |
| IMG_0317.png | 2 | 2 | 0 | 0 |
| IMG_0332.png | 2 | 2 | 0 | 0 |
| IMG_0497.png | 2 | 2 | 0 | 0 |
| IMG_0796.png | 2 | 2 | 0 | 0 |
| IMG_0306.png | 1 | 3 | 1 | 0 |
| IMG_0264.png | 1 | 3 | 0 | 1 |
| IMG_0278.png | 1 | 3 | 0 | 1 |
| IMG_0300.png | 1 | 3 | 0 | 1 |
| IMG_0322.png | 1 | 3 | 0 | 1 |

## Candidate Completeness / Truncation

- wrong fields with expected candidate present but truncated metadata: 4
- wrong fields with truncated pool: 23
- wrong fields with missing pool: 0

## Ranked Next Targets

| target | one-field-away | selection-only sides | theoretical sides | stage completions | FP risk | complexity | score |
| --- | --- | --- | --- | --- | --- | --- | --- |
| strict bonus selection | 5 | 1 | 5 | 5 | low but low gain | low-to-medium | 56 |
| bonus recognition | 5 | 1 | 5 | 5 | medium-to-high | medium-to-high | 42 |
| total selection follow-up | 2 | 0 | 2 | 2 | low but low gain | low-to-medium | 22 |
| total recognition | 2 | 0 | 2 | 2 | medium-to-high | medium-to-high | 8 |
| strict member1 selection | 0 | 0 | 0 | 0 | low but low gain | low-to-medium | 6 |
| strict member3 selection | 0 | 0 | 0 | 0 | low but low gain | low-to-medium | 6 |
| remaining member2 selection | 0 | 0 | 0 | 0 | low but low gain | low-to-medium | 6 |
| candidate completeness/plumbing | 0 | 0 | 4 | 0 | low if output remains unchanged | low | -4 |
| member1 recognition | 0 | 0 | 0 | 0 | medium-to-high | medium-to-high | -8 |
| member2 recognition | 0 | 0 | 0 | 0 | medium-to-high | medium-to-high | -8 |
| member3 recognition | 0 | 0 | 0 | 0 | medium-to-high | medium-to-high | -8 |
| Stage3 architecture redesign | 0 | 0 | 36 | 0 | high until separately proven | high | -10 |
| more iPad fixtures/sample expansion | 0 | 0 | 0 | 0 | none | medium manual work | -10 |

## Recommendation

Recommended next experiment: **more iPad fixtures/sample expansion**.

Rationale: No narrow existing-candidate selector reaches the >=2 realistic stage/side gain threshold with stable low-FP browser evidence. It should remain diagnostic-only first, use only browser-native evidence, and require the same style of runner/browser parity and real-browser verification before production.

Fixture expansion: Expand expected fixtures from the remaining iPad screenshots before another production recovery.

## Production Unchanged Confirmation

This task changed no production OCR behavior. It preserves:

- T2 grouped-number parser
- Tier C
- strict-total
- strict-member2
- all rollback constants
- iPad ROI/preprocessing
- candidate ranking
- expected fixtures
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
