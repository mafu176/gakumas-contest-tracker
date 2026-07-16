# Current-PC Stage3 7-Digit Bonus-Displacement Parity Mismatch Audit

This audits the 26 rejected-row metadata mismatches reported by
`docs/current-pc-stage3-7digit-bonus-displacement-parity.md` after commit
`0c1cf91`.

## Summary

- Rows audited: 26
- Runner/browser-equivalent `wouldApply` disagreements: 0
- Runner/browser-equivalent proposed recovery disagreements: 0
- Runner/browser-equivalent rejection reason disagreements: 0
- Exact equation / uniqueness disagreements: 0
- Potentially unsafe mismatches: 0

All 26 mismatches are rejected by both runner and browser-equivalent evidence paths. The only differing field is `totalReferences`, and the difference is ordering only. The set of numbers is the same; browser-equivalent places member/alternative total references before the small direct-total fragments, while runner preserves the original source merge order.

## Category Breakdown

| category | count | safety impact |
| --- | ---: | --- |
| Harmless total-reference ordering mismatch on rejected rows | 26 | None. Same rejection, same no-proposal result, same exact-equation/uniqueness outcome. |
| Candidate ordering mismatch that changes `wouldApply` | 0 | None found. |
| Competing interpretation count mismatch | 0 | None found. |
| Missing optional rejected-case metadata | 0 | None found. |
| Potentially unsafe mismatch | 0 | None found. |

## Per-Row Audit

For every row below:

- runner `wouldApply`: `false`
- browser-equivalent `wouldApply`: `false`
- runner proposed members/bonus/total: none
- browser-equivalent proposed members/bonus/total: none
- runner and browser-equivalent rejection reasons: identical
- exact mismatch field: `totalReferences`
- mismatch type: same values, different order
- production safety: harmless; both sides still reject the case

| screenshot | stage | side | rejection summary | safety classification |
| --- | ---: | --- | --- | --- |
| `2026-07-11_223907986.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `2026-07-11_223950902.png` | 2 | self | non-Stage3, no unselected clean 7-digit member, competing exact interpretation | harmless ordering-only mismatch |
| `2026-07-11_223950902.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `2026-07-15_184125225.png` | 3 | self | fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `2026-07-15_184158330.png` | 2 | self | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `2026-07-15_184158330.png` | 2 | enemy | non-Stage3, no unselected clean 7-digit member, competing exact interpretation | harmless ordering-only mismatch |
| `2026-07-15_184212413.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-11 144846091.png` | 2 | self | non-Stage3, no unselected clean 7-digit member, competing exact interpretation | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-11 144908802.png` | 1 | self | non-Stage3, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-11 144932916.png` | 1 | self | non-Stage3, no unselected clean 7-digit member, competing exact interpretation | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-11 145100208.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-11 145126932.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-11 145152780.png` | 2 | self | non-Stage3, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-11 145215861.png` | 3 | enemy | fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-12 223636381.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-12 223701314.png` | 2 | enemy | non-Stage3, no unselected clean 7-digit member, competing exact interpretation | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-12 224905234.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-14 060811830.png` | 2 | self | non-Stage3, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-14 060926190.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-14 061325391.png` | 2 | enemy | non-Stage3, fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-14 061545315.png` | 1 | self | non-Stage3, no unselected clean 7-digit member, competing exact interpretation | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-15 130012999.png` | 1 | self | non-Stage3, no unselected clean 7-digit member, competing exact interpretation | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-15 130012999.png` | 2 | enemy | non-Stage3, no unselected clean 7-digit member, competing exact interpretation | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-15 130026795.png` | 3 | enemy | fewer than four member-row values, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-15 130032877.png` | 2 | enemy | non-Stage3, no exact displayed total evidence | harmless ordering-only mismatch |
| `スクリーンショット 2026-07-15 130038617.png` | 2 | enemy | non-Stage3, no exact displayed total evidence | harmless ordering-only mismatch |

## Productionization Decision

These 26 mismatches are not safety-relevant. They cannot produce a false positive under the current strict guard because:

- no row changes from reject to apply,
- no proposed recovery exists on either side,
- rejection reasons are identical,
- strict proposal counts and competing exact interpretation counts are identical,
- exact total evidence and uniqueness decisions are identical.

Productionization is safe to attempt next, as long as it uses the existing strict shared helper result and does not depend on the raw order of rejected-row `totalReferences`.

## Validation Snapshot

Confirmed from the current generated baseline artifacts:

- current-PC expected fixtures: 48
- current-PC baseline: 2 PASS / 46 FAIL
- `currentPcStage3SevenDigitBonusDisplacementSimulation`: TP 8 / FP 0 / FN 30
- parity rows compared: 288
- missing in browser-equivalent: 0
- missing in runner: 0
- TP parity: 8/8 exact

Recent safety checks in this working tree:

- `IMG_9311 IMG_9321 IMG_9329`: PASS
- `IMG_9308 IMG_9310 IMG_9319`: expected known failures only
- `test-images/desktop/pc-rehearsal-bonus-member-shift.png`: PASS
- `npm run build`: PASS
