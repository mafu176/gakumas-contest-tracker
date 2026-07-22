# Smartphone Crown-Bonus Rule Mismatch Investigation

This is a docs-only investigation of the 7 smartphone expected-fixture stages that did not match the crown-bonus rule in `docs/smartphone-crown-bonus-stage-wide-solver-investigation.md`.

No expected fixture was changed in this task. No OCR production behavior, smartphone recovery, current-PC OCR, or legacy desktop OCR was changed.

## Summary

Previous validation:

| metric | count |
| --- | ---: |
| smartphone expected fixtures | 89 |
| stages checked | 267 |
| floor-rule matches | 260 |
| mismatches | 7 |
| stages with exactly one bonus side | 265 |

Result of this investigation:

| classification | count |
| --- | ---: |
| A. Confirmed expected fixture transcription error | 7 |
| B. Likely fixture error, needs human visual review | 0 |
| C. Source screenshot supports current fixture | 0 |
| D. Source screenshot supports the 20% floor rule | 7 |
| E. Arithmetic-only inconsistency | 0 |
| F. Genuine possible game-rule exception | 0 |
| G. Source evidence unavailable / insufficient | 0 |

All 7 source screenshots were available and visually support the 20% floor rule rather than the current fixture values.

## Mismatch Rows

| fixture | source screenshot | stage | fixture members | fixture bonus / total | global max | winning side | floor(max * 0.20) | calculated totals | mismatched fields |
| --- | --- | ---: | --- | --- | ---: | --- | ---: | --- | --- |
| `IMG_9163.json` | `test-images/fewer-members/IMG_9163.png` and duplicate `test-images/user-reports/unreviewed/IMG_9163.png` | 1 | self `544861 / 0 / 0`<br>enemy `162233 / 56973 / 138410` | self `+108974 = 653835`<br>enemy `+0 = 357616` | 544861 | self | 108972 | self `653833`<br>enemy `357616` | self bonus `+2`; self total `+2` |
| `IMG_9165.json` | `test-images/fewer-members/IMG_9165.png` and duplicate `test-images/user-reports/unreviewed/IMG_9165.png` | 2 | self `158678 / 94205 / 0`<br>enemy `88082 / 51744 / 160340` | self `+0 = 252883`<br>enemy `+0 = 300166` | 160340 | enemy | 32068 | self `252883`<br>enemy `332234` | enemy bonus missing; enemy total short by `32068` |
| `IMG_9250.json` | `test-images/user-reports/unreviewed/IMG_9250.png` | 1 | self `82360 / 124137 / 177424`<br>enemy `105866 / 516222 / 361331` | self `+0 = 383921`<br>enemy `+103246 = 1086665` | 516222 | enemy | 103244 | self `383921`<br>enemy `1086663` | enemy bonus `+2`; enemy total `+2` |
| `IMG_9264.json` | `test-images/user-reports/unreviewed/IMG_9264.png` | 2 | self `638016 / 755237 / 0`<br>enemy `210809 / 1254969 / 891973` | self `+1009315 = 2402568`<br>enemy `+250993 = 2608744` | 1254969 | enemy | 250993 | self `1393253` with fixture members, but visual self members sum to `2402568`<br>enemy `2608744` | self member/bonus displacement in fixture; both sides show nonzero fixture bonus |
| `IMG_9281.json` | `test-images/user-reports/unreviewed/IMG_9281.png` | 3 | self `204908 / 112716 / 0`<br>enemy `343001 / 343056 / 257235` | self `+0 = 317624`<br>enemy `+68613 = 1011905` | 343056 | enemy | 68611 | self `317624`<br>enemy `1011903` | enemy bonus `+2`; enemy total `+2` |
| `IMG_9315.json` | `test-images/user-reports/unreviewed/IMG_9315.png` | 2 | self `179154 / 446623 / 162915`<br>enemy `83746 / 56196 / 41979` | self `+88924 = 877616`<br>enemy `+0 = 181921` | 446623 | self | 89324 | self `878016` with fixture members, but visual self members sum to `788292` and total is `877616`<br>enemy `181921` | self member3 and bonus transcribed incorrectly |
| `IMG_9319.json` | `test-images/user-reports/unreviewed/IMG_9319.png` | 2 | self `208530 / 193243 / 149143`<br>enemy `11845 / 16081 / 11316` | self `+41466 = 592382`<br>enemy `+0 = 39242` | 208530 | self | 41706 | self `592622` with fixture member1, but visual member1 is `208330` and total is `592382`<br>enemy `39242` | self member1 and bonus transcribed incorrectly |

## Source Evidence Review

### IMG_9163 Stage1

Source screenshot shows:

- self members: `544,861 / - / -`
- self bonus: `+108972`
- self total: `653,833`
- enemy members: `162,233 / 56,973 / 138,410`
- enemy total: `357,616`

`floor(544861 * 0.20) = 108972`, and `544861 + 108972 = 653833`.

Classification: A and D. Confirmed expected fixture transcription error.

Likely corrected fixture values:

- Stage1 self bonus: `108972`
- Stage1 self total: `653833`

Manual review checklist:

- Stage1 self member1 `544,861`
- Stage1 self bonus `+108972`
- Stage1 self total `653,833`
- Stage1 enemy total `357,616`

### IMG_9165 Stage2

Source screenshot shows:

- self members: `158,678 / 94,205 / -`
- self total: `252,883`
- enemy members: `88,082 / 51,744 / 160,340`
- enemy bonus: `+32068`
- enemy total: `332,234`

`floor(160340 * 0.20) = 32068`, and `88082 + 51744 + 160340 + 32068 = 332234`.

Classification: A and D. Confirmed expected fixture transcription error.

Likely corrected fixture values:

- Stage2 enemy bonus: `32068`
- Stage2 enemy total: `332234`

Manual review checklist:

- Stage2 enemy member3 `160,340`
- Stage2 enemy bonus `+32068`
- Stage2 enemy total `332,234`
- Stage2 self total `252,883`

### IMG_9250 Stage1

Source screenshot shows:

- self members: `82,360 / 124,137 / 177,424`
- self total: `383,921`
- enemy members: `105,866 / 516,222 / 361,331`
- enemy bonus: `+103244`
- enemy total: `1,086,663`

`floor(516222 * 0.20) = 103244`, and `105866 + 516222 + 361331 + 103244 = 1086663`.

Classification: A and D. Confirmed expected fixture transcription error.

Likely corrected fixture values:

- Stage1 enemy bonus: `103244`
- Stage1 enemy total: `1086663`

Manual review checklist:

- Stage1 enemy member2 `516,222`
- Stage1 enemy bonus `+103244`
- Stage1 enemy total `1,086,663`

### IMG_9264 Stage2

Source screenshot shows:

- self members: `638,016 / 1,009,315 / 755,237`
- self total: `2,402,568`
- enemy members: `210,809 / 1,254,969 / 891,973`
- enemy bonus: `+250993`
- enemy total: `2,608,744`

`floor(1254969 * 0.20) = 250993`, and `210809 + 1254969 + 891973 + 250993 = 2608744`.

The fixture appears to have moved self member2 `1,009,315` into `selfBonus`, shifted `755,237` into member2, and left member3 as `0`.

Classification: A and D. Confirmed expected fixture transcription error.

Likely corrected fixture values:

- Stage2 self members: `638016 / 1009315 / 755237`
- Stage2 self bonus: `0`
- Stage2 self total: `2402568`
- Stage2 enemy bonus/total remain `250993 / 2608744`

Manual review checklist:

- Stage2 self member2 `1,009,315`
- Stage2 self member3 `755,237`
- confirm no self-side bonus display
- Stage2 enemy member2 `1,254,969`
- Stage2 enemy bonus `+250993`

### IMG_9281 Stage3

Source screenshot shows:

- self members: `204,908 / 112,716 / -`
- self total: `317,624`
- enemy members: `343,001 / 343,056 / 257,235`
- enemy bonus: `+68611`
- enemy total: `1,011,903`

`floor(343056 * 0.20) = 68611`, and `343001 + 343056 + 257235 + 68611 = 1011903`.

Classification: A and D. Confirmed expected fixture transcription error.

Likely corrected fixture values:

- Stage3 enemy bonus: `68611`
- Stage3 enemy total: `1011903`

Manual review checklist:

- Stage3 enemy member2 `343,056`
- Stage3 enemy bonus `+68611`
- Stage3 enemy total `1,011,903`

### IMG_9315 Stage2

Source screenshot shows:

- self members: `179,154 / 446,623 / 162,515`
- self bonus: `+89324`
- self total: `877,616`
- enemy members: `83,746 / 56,196 / 41,979`
- enemy total: `181,921`

`floor(446623 * 0.20) = 89324`, and `179154 + 446623 + 162515 + 89324 = 877616`.

The fixture appears to have transcribed member3 as `162915` instead of `162515`, then used the smaller `88924` bonus to preserve the displayed total.

Classification: A and D. Confirmed expected fixture transcription error.

Likely corrected fixture values:

- Stage2 self member3: `162515`
- Stage2 self bonus: `89324`
- Stage2 self total: `877616`

Manual review checklist:

- Stage2 self member3 `162,515`
- Stage2 self bonus `+89324`
- Stage2 self total `877,616`

### IMG_9319 Stage2

Source screenshot shows:

- self members: `208,330 / 193,243 / 149,143`
- self bonus: `+41666`
- self total: `592,382`
- enemy members: `11,845 / 16,081 / 11,316`
- enemy total: `39,242`

`floor(208330 * 0.20) = 41666`, and `208330 + 193243 + 149143 + 41666 = 592382`.

The fixture appears to have transcribed member1 as `208530` instead of `208330`, then used `41466` bonus to preserve the displayed total.

Classification: A and D. Confirmed expected fixture transcription error.

Likely corrected fixture values:

- Stage2 self member1: `208330`
- Stage2 self bonus: `41666`
- Stage2 self total: `592382`

Manual review checklist:

- Stage2 self member1 `208,330`
- Stage2 self bonus `+41666`
- Stage2 self total `592,382`

## Exactly-One-Bonus Violations

The 2 stages that violated exactly-one-bonus are both among the 7 mismatch stages:

| fixture | stage | fixture bonus state | source evidence |
| --- | ---: | --- | --- |
| `IMG_9165.json` | 2 | both sides bonus `0` | enemy side clearly shows `+32068` |
| `IMG_9264.json` | 2 | both sides nonzero (`self +1009315`, `enemy +250993`) | self `1009315` is a member score, not a bonus; enemy alone shows `+250993` |

Both are likely fixture transcription/assignment errors rather than game-rule exceptions.

## Hypothetical Validation After Confirmed Corrections

If only the 7 confirmed fixture transcription errors above were corrected, the smartphone crown-bonus rule validation would become:

| metric | current | hypothetical after confirmed corrections |
| --- | ---: | ---: |
| stages checked | 267 | 267 |
| floor-rule matches | 260 | 267 |
| mismatches | 7 | 0 |
| exactly one bonus side | 265 | 267 |

This means the crown-bonus rule is likely valid for all currently fixture-backed smartphone stages, but fixture edits should be done in a separate explicit correction task.

## Recommendation

Recommended next step:

1. Correct only the 7 confirmed expected fixture transcription errors in a separate fixture-correction task.
2. Rerun the smartphone crown-bonus validation and confirm `267 / 267`.
3. Only after that, add runner-only `smartphoneCrownBonusRuleSimulation`.
4. Keep any future stage-wide six-member solver smartphone-native; do not import current-PC ROI/candidate extraction.

Production OCR recovery is not recommended from this task because no fixture was corrected and no simulation was added.

## Validation

- production OCR changed: no
- expected fixtures changed: no
- smartphone recovery code changed: no
- current-PC OCR changed: no
- legacy desktop OCR changed: no
