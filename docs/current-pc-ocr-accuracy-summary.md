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
| image | 9 | 49 | 58 | 15.5% |
| stage | 105 | 69 | 174 | 60.3% |
| stage/side row | 269 | 79 | 348 | 77.3% |
| all 3 members | 277 | 71 | 348 | 79.6% |
| bonus | 286 | 62 | 348 | 82.2% |
| total | 288 | 60 | 348 | 82.8% |

## Stage/Side Position Breakdown

| position | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| Stage1 self | 50 | 8 | 58 | 86.2% |
| Stage1 enemy | 52 | 6 | 58 | 89.7% |
| Stage2 self | 44 | 14 | 58 | 75.9% |
| Stage2 enemy | 51 | 7 | 58 | 87.9% |
| Stage3 self | 24 | 34 | 58 | 41.4% |
| Stage3 enemy | 48 | 10 | 58 | 82.8% |

Stage3 self is the weakest remaining position after the current production recoveries.

## Field-Level Accuracy

| field | exact matches | total | accuracy |
| --- | ---: | ---: | ---: |
| member1 | 311 | 348 | 89.4% |
| member2 | 299 | 348 | 85.9% |
| member3 | 290 | 348 | 83.3% |
| all 3 members | 277 | 348 | 79.6% |
| bonus | 286 | 348 | 82.2% |
| total | 288 | 348 | 82.8% |

## Crown-Bonus Before/After

| state | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| before `applyCurrentPcCrownBonusRuleRecovery` | 235 | 113 | 348 | 67.5% |
| after current production recoveries | 269 | 79 | 348 | 77.3% |

The crown-bonus production recovery adds 34 exact stage/side row passes. This matches the 34 TP cases from `currentPcCrownBonusRuleSimulation`.

## Production Recovery Impact

| recovery | corrected stage/side rows |
| --- | ---: |
| `currentPcGroupedRawTokenRecovery` | 13 |
| `currentPcStage3SevenDigitBonusDisplacementRecovery` | 11 |
| `currentPcCrownBonusRuleRecovery` | 34 |
| unique corrected rows | 58 |
| rows still failing after all production recoveries | 79 |

Overlap between the three production recovery sets is 0 rows in this 58-fixture baseline.

## Counting Notes

- Row PASS requires exact `member1`, `member2`, `member3`, bonus, and total match.
- Bonus is measured from the final row output as `total - member1 - member2 - member3`.
- A zero-bonus row passes only when that computed difference is exactly 0.
- Stage PASS requires both self and enemy rows to pass.
- Image PASS requires all six stage/side rows to pass.
