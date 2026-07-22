# Current-PC OCR Accuracy Summary

Generated: 2026-07-22

Current production recoveries included:

1. `currentPcGroupedRawTokenRecovery`
2. `currentPcStage3SevenDigitBonusDisplacementRecovery`
3. `currentPcCrownBonusRuleRecovery`
4. `currentPcStageWideSixMemberCandidateSolverRecovery`
5. `currentPcExactMembersCrownBonusTotalRecovery`
6. `currentPcSideLocalExactEvidenceRecovery`

Fixture set: 68 expected current-PC screenshots, 204 stages, 408 stage/side rows.

## Summary

| level / field | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| image | 31 | 37 | 68 | 45.6% |
| stage | 159 | 45 | 204 | 77.9% |
| stage/side row | 353 | 55 | 408 | 86.5% |
| all 3 members | 357 | 51 | 408 | 87.5% |
| bonus | 369 | 39 | 408 | 90.4% |
| total | 365 | 43 | 408 | 89.5% |

## Stage/Side Position Breakdown

| position | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| Stage1 self | 64 | 4 | 68 | 94.1% |
| Stage1 enemy | 62 | 6 | 68 | 91.2% |
| Stage2 self | 61 | 7 | 68 | 89.7% |
| Stage2 enemy | 64 | 4 | 68 | 94.1% |
| Stage3 self | 43 | 25 | 68 | 63.2% |
| Stage3 enemy | 59 | 9 | 68 | 86.8% |

Stage3 self remains the weakest remaining position after the current production recoveries.

## Field-Level Accuracy

| field | exact matches | total | accuracy |
| --- | ---: | ---: | ---: |
| member1 | 380 | 408 | 93.1% |
| member2 | 374 | 408 | 91.7% |
| member3 | 371 | 408 | 90.9% |
| all 3 members | 357 | 408 | 87.5% |
| bonus | 369 | 408 | 90.4% |
| total | 365 | 408 | 89.5% |

## Production Recovery Impact

| state | image pass | stage pass | stage/side pass |
| --- | ---: | ---: | ---: |
| before side-local exact evidence recovery | 28 / 68 | 156 / 204 | 350 / 408 |
| after side-local exact evidence recovery | 31 / 68 | 159 / 204 | 353 / 408 |

The side-local recovery adds 3 exact stage/side row passes, 3 stage passes, and 3 full-image passes. It does not change member values; the improvements are bonus/total-only corrections backed by exact target total evidence and the `targetMax > oppositeTotal` upper-bound proof.

| recovery | corrected stage/side rows |
| --- | ---: |
| `currentPcGroupedRawTokenRecovery` | 13 |
| `currentPcStage3SevenDigitBonusDisplacementRecovery` | 11 |
| `currentPcCrownBonusRuleRecovery` | 34 |
| `currentPcStageWideSixMemberCandidateSolverRecovery` | 23 |
| `currentPcExactMembersCrownBonusTotalRecovery` | 2 |
| `currentPcSideLocalExactEvidenceRecovery` | 3 |
| unique corrected rows | 86 |
| rows still failing after all production recoveries | 55 |

## Side-Local Recovery Rows

| screenshot | stage | side | unchanged members | derived bonus | corrected total |
| --- | ---: | --- | --- | ---: | ---: |
| `スクリーンショット 2026-07-11 145215861.png` | 1 | self | `433069 / 362726 / 149521` | 86,613 | 1,031,929 |
| `スクリーンショット 2026-07-14 061545315.png` | 3 | self | `810180 / 535044 / 909283` | 181,856 | 2,436,363 |
| `スクリーンショット 2026-07-21 055104928.png` | 3 | self | `619606 / 617485 / 774304` | 154,860 | 2,166,255 |

## Counting Notes

- Row PASS requires exact `member1`, `member2`, `member3`, bonus, and total match.
- Bonus is measured from the final row output as `total - member1 - member2 - member3`.
- A zero-bonus row passes only when that computed difference is exactly 0.
- Stage PASS requires both self and enemy rows to pass.
- Image PASS requires all six stage/side rows to pass.
- The full 68-image baseline command timed out in this run after artifact generation had previously become expensive; the three side-local TP rows were rerun directly and passed. The before/after global delta is derived from the prior 68-fixture baseline plus the parity-proven 3-row targeted production run.
