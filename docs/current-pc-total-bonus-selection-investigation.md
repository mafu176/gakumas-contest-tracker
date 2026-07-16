# Current-PC Total/Bonus Selection Failure Investigation

This investigation audits current-PC cases where member selection is already correct or structurally stable, but the selected total and/or inferred bonus differs from the expected fixture. It is documentation-only: no OCR behavior is changed and no production rule is enabled.

## Summary

- current-PC expected fixtures audited: 48
- current-PC stage/side rows audited: 288
- total/bonus rows with exact selected members and expected total evidence: 31
- exact total plus exact bonus evidence rows: 1
- exact total evidence but missing/unreliable exact bonus evidence rows: 30
- existing grouped/raw production recoveries observed: 10
- existing Stage3 7-digit bonus-displacement recoveries observed: 8

## Cluster Breakdown

| cluster | positives | expected members correct | expected total evidence | expected bonus evidence | exact equation | interpretation uniqueness | production recommendation |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| exact total and exact bonus evidence, wrong selected pair | 1 | yes | yes | yes | yes | unique in the one case | do not productionize: only one positive, and existing exact/raw simulation currently rejects because the suspicious selected-equation flag is absent |
| exact total evidence, bonus evidence missing or OCR-confused | 30 | yes | yes | no reliable parsed exact bonus | equation is visually/fixture-valid but not evidence-complete | not unique enough; bonus must not be inferred from fixture | blocked pending better bonus OCR evidence |

## Exact Total And Bonus Evidence Case

| image | stage/side | expected members | expected bonus | expected total | selected members | selected inferred bonus | selected total | evidence | exact interpretations | notes |
| --- | --- | --- | ---: | ---: | --- | ---: | ---: | --- | ---: | --- |
| スクリーンショット 2026-07-14 061151691.png | S3 self | 862,800 / 789,450 / 701,079 | 172,560 | 2,525,889 | 862,800 / 789,450 / 701,079 | 172,050 | 2,525,379 | total: raw, displayed-total, total-trace, raw-text; bonus: raw, bonus, member-row, raw-text | 1/1 | grouped/raw simulation proposes the expected pair but rejects with existing guard; this is a good future rule candidate only after more positives or browser parity. |

## Exact Total Evidence But Bonus Evidence Missing Or Unreliable

These rows have correct selected members and exact expected total evidence, but the expected bonus does not appear as reliable parsed bonus evidence. Many selected totals are member-sum only, or member sum plus a digit-dropped/confused bonus. A generic production rule would have to infer the bonus from `expectedTotal - memberSum`, which is exactly the unsafe step this audit avoids.

| image | stage/side | expected members | expected bonus | expected total | selected inferred bonus | selected total | expected total evidence | selected-state note |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 2026-07-11_223152331.png | S2 self | 140,204 / 357,612 / 536,797 | 107,359 | 1,141,972 | 10,735 | 1,045,348 | raw, displayed-total, total-direct, total-trace, raw-text | selected bonus-like value 10,735 |
| 2026-07-11_223613166.png | S2 enemy | 151,208 / 386,408 / 265,967 | 77,281 | 880,864 | 77,251 | 880,834 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 77,251 |
| 2026-07-11_223714046.png | S1 self | 237,911 / 248,700 / 498,800 | 99,760 | 1,085,171 | 0 | 985,411 | raw, displayed-total, total-direct, total-trace, raw-text | selected total is member sum only |
| 2026-07-15_184101432.png | S2 self | 601,646 / 262,403 / 394,726 | 120,329 | 1,379,104 | 120,326 | 1,379,101 | raw, displayed-total, total-direct, total-trace, raw-text | selected bonus-like value 120,326 |
| 2026-07-15_184101432.png | S3 enemy | 626,231 / 957,548 / 611,861 | 191,509 | 2,387,149 | 191,500 | 2,387,140 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 191,500 |
| 2026-07-15_184117455.png | S1 enemy | 295,521 / 412,612 / 189,120 | 82,522 | 979,775 | 32,522 | 929,775 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 32,522 |
| 2026-07-15_184117455.png | S2 self | 389,466 / 332,464 / 438,883 | 87,776 | 1,248,589 | 0 | 1,160,813 | raw, displayed-total, total-direct, total-trace, raw-text | selected total is member sum only |
| 2026-07-15_184125225.png | S2 self | 338,240 / 149,884 / 468,397 | 93,679 | 1,050,200 | 0 | 956,521 | raw, displayed-total, total-direct, total-trace, raw-text | selected total is member sum only |
| 2026-07-15_184150257.png | S1 enemy | 74,959 / 721,228 / 524,924 | 144,245 | 1,465,356 | 0 | 1,321,111 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| 2026-07-15_184150257.png | S2 self | 226,525 / 243,276 / 250,460 | 50,092 | 770,353 | 0 | 720,261 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| 2026-07-15_184205486.png | S2 self | 163,872 / 205,337 / 243,964 | 48,792 | 661,965 | 0 | 613,173 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| 2026-07-15_184212413.png | S1 self | 599,518 / 661,874 / 679,979 | 135,995 | 2,077,366 | 13,599 | 1,954,970 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 13,599 |
| 2026-07-15_184212413.png | S3 self | 1,006,667 / 134,597 / 671,601 | 201,333 | 2,014,198 | 20,153 | 1,833,018 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 20,153 |
| スクリーンショット 2026-07-11 144932916.png | S2 self | 221,508 / 128,329 / 176,419 | 44,301 | 570,557 | 0 | 526,256 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-11 144932916.png | S3 self | 950,088 / 1,135,373 / 894,637 | 227,074 | 3,207,172 | 22,707 | 3,002,805 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 22,707 |
| スクリーンショット 2026-07-11 144958188.png | S3 self | 678,900 / 698,436 / 800,021 | 160,004 | 2,337,361 | 16,000 | 2,193,357 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 16,000 |
| スクリーンショット 2026-07-11 145018419.png | S2 self | 262,782 / 104,193 / 143,648 | 52,556 | 563,179 | 0 | 510,623 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-11 145100208.png | S1 self | 413,479 / 318,575 / 183,428 | 82,695 | 998,177 | 0 | 915,482 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-11 145152780.png | S2 self | 132,068 / 333,301 / 110,037 | 66,660 | 642,066 | 68,660 | 644,066 | raw, displayed-total, total-direct, total-trace, raw-text | selected bonus-like value 68,660 |
| スクリーンショット 2026-07-11 145215861.png | S1 self | 433,069 / 362,726 / 149,521 | 86,613 | 1,031,929 | 0 | 945,316 | raw, displayed-total, total-direct, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-12 223719983.png | S1 enemy | 321,459 / 151,997 / 138,641 | 64,291 | 676,388 | 0 | 612,097 | raw, displayed-total, total-direct, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-14 060926190.png | S1 self | 765,002 / 78,697 / 125,572 | 153,000 | 1,122,271 | 133,000 | 1,102,271 | raw, displayed-total, total-direct, total-trace, raw-text | selected bonus-like value 133,000 |
| スクリーンショット 2026-07-14 061051531.png | S1 self | 406,378 / 80,579 / 163,726 | 81,275 | 731,958 | 0 | 650,683 | raw, displayed-total, total-direct, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-14 061545315.png | S2 enemy | 386,335 / 56,050 / 94,429 | 77,267 | 614,081 | 0 | 536,814 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-14 061545315.png | S3 self | 810,180 / 535,044 / 909,283 | 181,856 | 2,436,363 | 18,185 | 2,272,692 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 18,185 |
| スクリーンショット 2026-07-15 130019543.png | S2 self | 257,373 / 143,225 / 78,956 | 51,474 | 531,028 | 0 | 479,554 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-15 130032877.png | S1 self | 494,739 / 214,923 / 112,311 | 98,947 | 920,920 | 0 | 821,973 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-15 130032877.png | S2 enemy | 428,255 / 183,317 / 121,189 | 85,651 | 818,412 | 54,651 | 787,412 | raw, displayed-total, total-trace, raw-text | selected bonus-like value 54,651 |
| スクリーンショット 2026-07-15 130038617.png | S1 enemy | 146,065 / 383,687 / 214,494 | 76,737 | 820,983 | 0 | 744,246 | raw, displayed-total, total-direct, total-trace, raw-text | selected total is member sum only |
| スクリーンショット 2026-07-15 130038617.png | S2 enemy | 423,571 / 227,245 / 50,654 | 84,714 | 786,184 | 0 | 701,470 | raw, displayed-total, total-trace, raw-text | selected total is member sum only |

## Overlap With Existing Recoveries

- `currentPcGroupedRawTokenRecovery` remains a separate pattern: 10 applied rows. It fixes cases where strict grouped/raw token evidence creates a unique exact member/bonus/total interpretation.
- `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery` remains a separate pattern: 8 applied rows. It fixes Stage3 member/bonus displacement with clean unselected 7-digit member evidence and exact displayed-total evidence.
- The total/bonus selection cluster here is mostly not overlap: selected members are already correct, but bonus evidence is absent or OCR-confused. Precedence should not be changed until a separate browser-equivalent evidence path proves the total/bonus pair selection is safe.

## Runner-Only Simulation Decision

No new runner-only simulation was added. The only case with exact total and exact bonus evidence is a single positive (`スクリーンショット 2026-07-14 061151691.png` Stage3 self), below the requested threshold of at least two confirmed positives. The broader 30-row cluster lacks reliable exact bonus evidence, so a simulation would either be fixture-driven or would infer bonus from the total delta; both are intentionally out of scope.

## Recommended Next Step

The safest next target is not production recovery. First improve current-PC bonus OCR evidence capture in runner/debug artifacts: identify whether the visible crown bonus can be extracted from role-specific bonus crops, not derived from total deltas. Once at least two rows have exact selected members, exact total evidence, exact bonus evidence, a unique equation, and zero false positives, add a browser-equivalent parity report before any productionization.

## Validation Notes

- This report was generated from the current `tmp/current-pc-ocr-baseline/summary.json` artifact after commit `6ecbe7c`.
- Because this change is documentation-only, normal OCR output is unchanged. Generated OCR reports should remain uncommitted.
