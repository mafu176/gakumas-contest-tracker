# Current-PC OCR Accuracy Summary

Generated: 2026-07-18

Source command:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline
```

Fixture set: 58 expected current-PC screenshots, 174 stages, 348 stage/side rows.

## Summary

| level / field | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| image | 22 | 36 | 58 | 37.9% |
| stage | 130 | 44 | 174 | 74.7% |
| stage/side row | 294 | 54 | 348 | 84.5% |
| all 3 members | 300 | 48 | 348 | 86.2% |
| bonus | 309 | 39 | 348 | 88.8% |
| total | 305 | 43 | 348 | 87.6% |

## Stage/Side Position Breakdown

| position | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| Stage1 self | 53 | 5 | 58 | 91.4% |
| Stage1 enemy | 53 | 5 | 58 | 91.4% |
| Stage2 self | 51 | 7 | 58 | 87.9% |
| Stage2 enemy | 54 | 4 | 58 | 93.1% |
| Stage3 self | 34 | 24 | 58 | 58.6% |
| Stage3 enemy | 49 | 9 | 58 | 84.5% |

Stage3 self is the weakest remaining position after the current production recoveries.

## Field-Level Accuracy

| field | exact matches | total | accuracy |
| --- | ---: | ---: | ---: |
| member1 | 321 | 348 | 92.2% |
| member2 | 317 | 348 | 91.1% |
| member3 | 312 | 348 | 89.7% |
| all 3 members | 300 | 348 | 86.2% |
| bonus | 309 | 348 | 88.8% |
| total | 305 | 348 | 87.6% |

## Crown-Bonus Before/After

| state | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| before `applyCurrentPcCrownBonusRuleRecovery` | 235 | 113 | 348 | 67.5% |
| after crown-bonus recovery | 269 | 79 | 348 | 77.3% |
| after stage-wide six-member solver recovery | 292 | 56 | 348 | 83.9% |
| after exact-members crown-bonus total recovery | 294 | 54 | 348 | 84.5% |

The crown-bonus production recovery adds 34 exact stage/side row passes. The stage-wide six-member solver adds 23 more exact stage/side row passes after grouped/raw, Stage3 7-digit bonus-displacement, and crown-bonus recovery have already run. The exact-members crown-bonus total recovery adds 2 more exact Stage2 self row passes and 1 full-image pass without changing member values.

## Production Recovery Impact

| recovery | corrected stage/side rows |
| --- | ---: |
| `currentPcGroupedRawTokenRecovery` | 13 |
| `currentPcStage3SevenDigitBonusDisplacementRecovery` | 11 |
| `currentPcCrownBonusRuleRecovery` | 34 |
| `currentPcStageWideSixMemberCandidateSolverRecovery` | 23 |
| `currentPcExactMembersCrownBonusTotalRecovery` | 2 |
| unique corrected rows | 83 |
| rows still failing after all production recoveries | 54 |

Overlap between the five production recovery sets is 0 rows in this 58-fixture baseline.

## Counting Notes

- Row PASS requires exact `member1`, `member2`, `member3`, bonus, and total match.
- Bonus is measured from the final row output as `total - member1 - member2 - member3`.
- A zero-bonus row passes only when that computed difference is exactly 0.
- Stage PASS requires both self and enemy rows to pass.
- Image PASS requires all six stage/side rows to pass.
