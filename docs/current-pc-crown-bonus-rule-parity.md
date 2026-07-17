# Current-PC Crown Bonus Rule Parity

Generated: 2026-07-17T10:34:44.573Z

## Purpose

This report proves that the evidence used by `currentPcCrownBonusRuleSimulation` is available through shared runner/browser-equivalent plumbing. It is evidence-only: final OCR members, bonuses, and totals are not changed.

## Shared Evidence Schema

The shared helper is `buildCurrentPcCrownBonusRuleEvidence(...)` in `app/lib/ocr.js`.

Stage-level inputs:

- `self.selectedMembers` / `enemy.selectedMembers`
- `self.selectedTotal` / `enemy.selectedTotal`
- `candidateSourceSummary.memberCandidates` for selected-member provenance
- `displayedTotalCandidates`, `totalDirect`, and `totalTrace` evidence for exact total provenance

Stage-level outputs:

- selected six-member interpretation
- selected self/enemy totals and implied current bonus
- member evidence per slot
- exact total evidence per side
- global rank-1 member
- winning side
- derived crown bonus: `floor(max(all 6 selected raw members) * 0.20)`
- proposed self/enemy totals
- `sideWouldChange`
- `wouldApply`
- rejection reasons

## Evidence Flow

Runner flow:

1. Current-PC OCR extracts stage/side member rows, total candidates, total traces, and candidate source summaries.
2. Existing production recoveries run first: grouped/raw token recovery, then Stage3 7-digit bonus-displacement recovery.
3. `buildCurrentPcCrownBonusRuleEvidence(...)` evaluates the post-recovery selected six-member stage state.
4. The simulation is recorded under baseline diagnostics only.

Browser/UI-equivalent flow:

1. The UI current-PC OCR path builds the same candidate source summaries for each side.
2. Existing production recoveries run first and may update the selected members/totals.
3. The UI path calls `buildCurrentPcCrownBonusRuleEvidence(...)` after those recoveries.
4. The result is attached to debug/evidence state only; final `stageScores` are unchanged by the crown-bonus rule.

Intended future precedence if productionized: grouped/raw recovery first, Stage3 7-digit bonus-displacement second, crown-bonus rule last. This task does not productionize that final step.

## Global Parity Counts

| metric | count |
| --- | ---: |
| stages compared | 174 |
| crown-bonus simulation TP | 34 |
| crown-bonus simulation FP | 0 |
| crown-bonus simulation FN | 7 |
| crown-bonus simulation blocked | 72 |
| TP parity exact | 34 / 34 |
| wouldApply disagreements | 0 |
| proposed member disagreements | 0 |
| proposed bonus disagreements | 0 |
| proposed total disagreements | 0 |
| selected member disagreements | 0 |
| selected total evidence mismatches | 0 |
| missing evidence in browser-equivalent | 0 |
| missing evidence in runner | 0 |
| metadata-only mismatches | 0 |
| safety-relevant mismatches | 0 |

## TP Parity Rows

| screenshot | stage | side | runner apply | browser-equivalent apply | rank-1 | winning side | derived bonus | proposed self total | proposed enemy total | parity |
| --- | ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 2026-07-11_223152331.png | 2 | self | yes | yes | self.member3=536,797 | self | 107,359 | 1,141,972 | 680,573 | exact |
| 2026-07-11_223613166.png | 2 | enemy | yes | yes | enemy.member2=386,408 | enemy | 77,281 | 788,303 | 880,864 | exact |
| 2026-07-11_223714046.png | 1 | self | yes | yes | self.member3=498,800 | self | 99,760 | 1,085,171 | 821,817 | exact |
| 2026-07-15_184101432.png | 1 | self | yes | yes | self.member2=466,573 | self | 93,314 | 1,121,512 | 549,365 | exact |
| 2026-07-15_184101432.png | 2 | self | yes | yes | self.member1=601,646 | self | 120,329 | 1,379,104 | 725,746 | exact |
| 2026-07-15_184101432.png | 3 | enemy | yes | yes | enemy.member2=957,548 | enemy | 191,509 | 1,953,183 | 2,387,149 | exact |
| 2026-07-15_184117455.png | 1 | enemy | yes | yes | enemy.member2=412,612 | enemy | 82,522 | 785,884 | 979,775 | exact |
| 2026-07-15_184117455.png | 2 | self | yes | yes | self.member3=438,883 | self | 87,776 | 1,248,589 | 562,578 | exact |
| 2026-07-15_184125225.png | 2 | self | yes | yes | self.member3=468,397 | self | 93,679 | 1,050,200 | 598,218 | exact |
| 2026-07-15_184150257.png | 1 | enemy | yes | yes | enemy.member2=721,228 | enemy | 144,245 | 1,578,291 | 1,465,356 | exact |
| 2026-07-15_184150257.png | 2 | self | yes | yes | self.member3=250,460 | self | 50,092 | 770,353 | 466,593 | exact |
| 2026-07-15_184205486.png | 2 | self | yes | yes | self.member3=243,964 | self | 48,792 | 661,965 | 477,646 | exact |
| 2026-07-15_184212413.png | 1 | self | yes | yes | self.member3=679,979 | self | 135,995 | 2,077,366 | 1,261,440 | exact |
| 2026-07-15_184212413.png | 3 | self | yes | yes | self.member1=1,006,667 | self | 201,333 | 2,014,198 | 2,146,305 | exact |
| スクリーンショット 2026-07-11 144932916.png | 3 | self | yes | yes | self.member2=1,135,373 | self | 227,074 | 3,207,172 | 252,176 | exact |
| スクリーンショット 2026-07-11 144958188.png | 3 | self | yes | yes | self.member3=800,021 | self | 160,004 | 2,337,361 | 673,006 | exact |
| スクリーンショット 2026-07-11 145100208.png | 1 | self | yes | yes | self.member1=413,479 | self | 82,695 | 998,177 | 271,881 | exact |
| スクリーンショット 2026-07-11 145152780.png | 2 | self | yes | yes | self.member2=333,301 | self | 66,660 | 642,066 | 123,489 | exact |
| スクリーンショット 2026-07-12 223719983.png | 1 | enemy | yes | yes | enemy.member1=321,459 | enemy | 64,291 | 630,659 | 676,388 | exact |
| スクリーンショット 2026-07-14 060926190.png | 1 | self | yes | yes | self.member1=765,002 | self | 153,000 | 1,122,271 | 558,895 | exact |
| スクリーンショット 2026-07-14 061051531.png | 1 | self | yes | yes | self.member1=406,378 | self | 81,275 | 731,958 | 793,118 | exact |
| スクリーンショット 2026-07-14 061151691.png | 3 | self | yes | yes | self.member1=862,800 | self | 172,560 | 2,525,889 | 1,087,940 | exact |
| スクリーンショット 2026-07-14 061545315.png | 2 | enemy | yes | yes | enemy.member1=386,335 | enemy | 77,267 | 345,267 | 614,081 | exact |
| スクリーンショット 2026-07-15 130019543.png | 2 | self | yes | yes | self.member1=257,373 | self | 51,474 | 531,028 | 416,131 | exact |
| スクリーンショット 2026-07-15 130032877.png | 1 | self | yes | yes | self.member1=494,739 | self | 98,947 | 920,920 | 636,346 | exact |
| スクリーンショット 2026-07-15 130032877.png | 2 | enemy | yes | yes | enemy.member1=428,255 | enemy | 85,651 | 306,724 | 818,412 | exact |
| スクリーンショット 2026-07-15 130038617.png | 1 | enemy | yes | yes | enemy.member2=383,687 | enemy | 76,737 | 537,047 | 820,983 | exact |
| スクリーンショット 2026-07-15 130038617.png | 2 | enemy | yes | yes | enemy.member1=423,571 | enemy | 84,714 | 420,962 | 786,184 | exact |
| スクリーンショット 2026-07-16 062903692.png | 1 | self | yes | yes | self.member2=408,931 | self | 81,786 | 955,294 | 553,776 | exact |
| スクリーンショット 2026-07-16 063215708.png | 2 | enemy | yes | yes | enemy.member1=251,194 | enemy | 50,238 | 440,901 | 430,710 | exact |
| スクリーンショット 2026-07-16 063330034.png | 1 | self | yes | yes | self.member1=317,169 | self | 63,433 | 691,006 | 688,567 | exact |
| スクリーンショット 2026-07-17 081649834.png | 1 | self | yes | yes | self.member1=402,878 | self | 80,575 | 705,379 | 400,348 | exact |
| スクリーンショット 2026-07-17 081649834.png | 2 | enemy | yes | yes | enemy.member1=202,764 | enemy | 40,552 | 311,428 | 605,487 | exact |
| スクリーンショット 2026-07-17 081731273.png | 1 | enemy | yes | yes | enemy.member3=496,229 | enemy | 99,245 | 500,944 | 991,295 | exact |

## Mismatch Rows

| screenshot | stage | mismatch type | fields | safety relevant |
| --- | ---: | --- | --- | --- |
| - | - | - | - | no |

## Production Readiness

Evidence parity is strong enough for a separate production-readiness audit next. This task still does not change final OCR output.

Recommended next step:

1. Perform a production-readiness audit for applying the same shared helper after existing current-PC recoveries.
2. Confirm browser/UI debug logs on representative TP rows.
3. Only then consider a production recovery that preserves these exact guards.
