# Current-PC Crown Bonus Rule Simulation

Generated: 2026-07-17T09:29:41.196Z

## Scope

- runner-only simulation: yes
- final OCR output changed: no
- production recovery added: no
- smartphone OCR changed: no
- legacy desktop OCR changed: no
- filename/stage-specific correction logic: no

## Confirmed Game Rule

For each current-PC stage, six raw member scores are visible: three self and three enemy. The highest raw member score is rank 1, only that side receives the crown bonus, and the bonus is:

```text
crownBonus = floor(max(all 6 raw member scores) * 0.20)
```

The winning side total must equal member sum plus the calculated bonus. The other side total must equal its raw member sum.

## Simulation Guards

- Uses only the six currently selected member values as member evidence.
- Every selected member must be nonzero and present in current OCR member/raw evidence.
- No missing member is invented from arithmetic.
- No missing digit, near-match, digit-drop, or filename-specific inference is allowed.
- The global rank-1 member must be unique.
- Bonus is derived only from the confirmed game rule, not from OCR bonus text.
- Both self and enemy proposed totals must have exact OCR total evidence.
- The interpretation must be unique under this strict selected-member-only model.
- The simulation may propose bonus/total corrections, but it never changes final OCR output.

## Summary

| metric | count |
| --- | ---: |
| failing stage/side rows evaluated | 113 |
| TP | 34 |
| FP | 0 |
| FN | 7 |
| blocked | 72 |
| accepted case count | 34 |

## Helped Failure Families

| family | rows |
| --- | ---: |
| missing bonus OCR | 33 |
| clean 7-digit signal | 14 |
| total/bonus selection failures | 4 |

## Stage Breakdown

| stage | accepted rows |
| --- | ---: |
| stage1 | 15 |
| stage2 | 14 |
| stage3 | 5 |

## Blocked Breakdown

| reason | rows |
| --- | ---: |
| insufficient cross-side evidence | 72 |
| missing exact total evidence | 72 |
| member OCR error | 71 |
| missing member evidence | 28 |
| existing result already correct | 12 |

## Recovery Overlap

| category | rows |
| --- | ---: |
| overlap with `currentPcGroupedRawTokenRecovery` | 0 |
| overlap with `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery` | 0 |
| overlap with documented slot-specific ROI TP cases | 0 |
| unique additional recovery potential | 34 |

## Accepted Cases

| screenshot | stage | side | selected before | proposed self | proposed enemy | rank-1 | winning side | calculated bonus | existing OCR bonus | total evidence | why unique |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| 2026-07-11_223152331.png | 2 | self | members 140204, 357612, 536797; bonus 10,735; total 1,045,348 | members 140204, 357612, 536797; bonus 107,359; total 1,141,972 | members 152243, 337736, 190594; bonus -; total 680,573 | self member3=536,797 | self | 107,359 | wrong-or-displaced | self: displayed-total-candidates<br>total-direct pass1 1,141,972<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace-token-audit pass1 680,573 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-11_223613166.png | 2 | enemy | members 151208, 386408, 265967; bonus 77,251; total 880,834 | members 205097, 370808, 212398; bonus -; total 788,303 | members 151208, 386408, 265967; bonus 77,281; total 880,864 | enemy member2=386,408 | enemy | 77,281 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace-token-audit pass1 788 303<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-11_223714046.png | 1 | self | members 237911, 248700, 498800; bonus -; total 985,411 | members 237911, 248700, 498800; bonus 99,760; total 1,085,171 | members 269760, 437948, 114109; bonus -; total 821,817 | self member3=498,800 | self | 99,760 | missing | self: displayed-total-candidates<br>total-direct pass1 1,085,171<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 821,817<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184101432.png | 1 | self | members 268326, 466573, 293299; bonus -; total 1,028,198 | members 268326, 466573, 293299; bonus 93,314; total 1,121,512 | members 322573, 164147, 62645; bonus -; total 549,365 | self member2=466,573 | self | 93,314 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184101432.png | 2 | self | members 601646, 262403, 394726; bonus 120,326; total 1,379,101 | members 601646, 262403, 394726; bonus 120,329; total 1,379,104 | members 230513, 255687, 239546; bonus -; total 725,746 | self member1=601,646 | self | 120,329 | wrong-or-displaced | self: displayed-total-candidates<br>total-direct pass1 1,379,104<br>total-trace pass1<br>enemy: total-trace-token-audit pass1 725.746<br>total-trace-token-audit pass1 725.746 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184101432.png | 3 | enemy | members 626231, 957548, 611861; bonus 191,500; total 2,387,140 | members 316145, 879287, 757751; bonus -; total 1,953,183 | members 626231, 957548, 611861; bonus 191,509; total 2,387,149 | enemy member2=957,548 | enemy | 191,509 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184117455.png | 1 | enemy | members 295521, 412612, 189120; bonus 32,522; total 929,775 | members 135684, 402741, 247459; bonus -; total 785,884 | members 295521, 412612, 189120; bonus 82,522; total 979,775 | enemy member2=412,612 | enemy | 82,522 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184117455.png | 2 | self | members 389466, 332464, 438883; bonus -; total 1,160,813 | members 389466, 332464, 438883; bonus 87,776; total 1,248,589 | members 201132, 105007, 256439; bonus -; total 562,578 | self member3=438,883 | self | 87,776 | missing | self: displayed-total-candidates<br>total-direct pass1 1,248,589<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 562,578<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184125225.png | 2 | self | members 338240, 149884, 468397; bonus -; total 956,521 | members 338240, 149884, 468397; bonus 93,679; total 1,050,200 | members 193870, 222682, 181666; bonus -; total 598,218 | self member3=468,397 | self | 93,679 | missing | self: displayed-total-candidates<br>total-direct pass1 1,050,200<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184150257.png | 1 | enemy | members 74959, 721228, 524924; bonus -; total 1,321,111 | members 512757, 646199, 419335; bonus -; total 1,578,291 | members 74959, 721228, 524924; bonus 144,245; total 1,465,356 | enemy member2=721,228 | enemy | 144,245 | missing | self: displayed-total-candidates<br>total-direct pass1 1,578,291<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184150257.png | 2 | self | members 226525, 243276, 250460; bonus -; total 720,261 | members 226525, 243276, 250460; bonus 50,092; total 770,353 | members 126445, 114766, 225382; bonus -; total 466,593 | self member3=250,460 | self | 50,092 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 466,593<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184205486.png | 2 | self | members 163872, 205337, 243964; bonus -; total 613,173 | members 163872, 205337, 243964; bonus 48,792; total 661,965 | members 150419, 156199, 171028; bonus -; total 477,646 | self member3=243,964 | self | 48,792 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184212413.png | 1 | self | members 599518, 661874, 679979; bonus 13,599; total 1,954,970 | members 599518, 661874, 679979; bonus 135,995; total 2,077,366 | members 517635, 361620, 382185; bonus -; total 1,261,440 | self member3=679,979 | self | 135,995 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| 2026-07-15_184212413.png | 3 | self | members 1006667, 134597, 671601; bonus 20,153; total 1,833,018 | members 1006667, 134597, 671601; bonus 201,333; total 2,014,198 | members 571968, 861050, 713287; bonus -; total 2,146,305 | self member1=1,006,667 | self | 201,333 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-11 144932916.png | 3 | self | members 950088, 1135373, 894637; bonus 22,707; total 3,002,805 | members 950088, 1135373, 894637; bonus 227,074; total 3,207,172 | members 85746, 68166, 98264; bonus -; total 252,176 | self member2=1,135,373 | self | 227,074 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: total-trace-token-audit pass1 252 176 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-11 144958188.png | 3 | self | members 678900, 698436, 800021; bonus 16,000; total 2,193,357 | members 678900, 698436, 800021; bonus 160,004; total 2,337,361 | members 361902, 275018, 36086; bonus -; total 673,006 | self member3=800,021 | self | 160,004 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 673,006<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-11 145100208.png | 1 | self | members 413479, 318575, 183428; bonus -; total 915,482 | members 413479, 318575, 183428; bonus 82,695; total 998,177 | members 41330, 127105, 103446; bonus -; total 271,881 | self member1=413,479 | self | 82,695 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 271,881<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-11 145152780.png | 2 | self | members 132068, 333301, 110037; bonus 68,660; total 644,066 | members 132068, 333301, 110037; bonus 66,660; total 642,066 | members 38629, 55991, 28869; bonus -; total 123,489 | self member2=333,301 | self | 66,660 | wrong-or-displaced | self: displayed-total-candidates<br>total-direct pass1 642,066<br>total-trace pass1<br>enemy: total-trace-token-audit pass1 123 489<br>total-trace-token-audit pass1 123 489 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-12 223719983.png | 1 | enemy | members 321459, 151997, 138641; bonus -; total 612,097 | members 198195, 263845, 168619; bonus -; total 630,659 | members 321459, 151997, 138641; bonus 64,291; total 676,388 | enemy member1=321,459 | enemy | 64,291 | missing | self: displayed-total-candidates<br>total-direct pass1 630,659<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 676,388<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-14 060926190.png | 1 | self | members 765002, 78697, 125572; bonus 133,000; total 1,102,271 | members 765002, 78697, 125572; bonus 153,000; total 1,122,271 | members 236072, 201022, 121801; bonus -; total 558,895 | self member1=765,002 | self | 153,000 | wrong-or-displaced | self: displayed-total-candidates<br>total-direct pass1 1,122,271<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 558,895<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-14 061051531.png | 1 | self | members 406378, 80579, 163726; bonus -; total 650,683 | members 406378, 80579, 163726; bonus 81,275; total 731,958 | members 333995, 245881, 213242; bonus -; total 793,118 | self member1=406,378 | self | 81,275 | missing | self: displayed-total-candidates<br>total-direct pass1 731,958<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-14 061151691.png | 3 | self | members 862800, 789450, 701079; bonus 172,050; total 2,525,379 | members 862800, 789450, 701079; bonus 172,560; total 2,525,889 | members 713461, 147206, 227273; bonus -; total 1,087,940 | self member1=862,800 | self | 172,560 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 1,087,940<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-14 061545315.png | 2 | enemy | members 386335, 56050, 94429; bonus -; total 536,814 | members 95546, 128657, 121064; bonus -; total 345,267 | members 386335, 56050, 94429; bonus 77,267; total 614,081 | enemy member1=386,335 | enemy | 77,267 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-15 130019543.png | 2 | self | members 257373, 143225, 78956; bonus -; total 479,554 | members 257373, 143225, 78956; bonus 51,474; total 531,028 | members 160462, 104747, 150922; bonus -; total 416,131 | self member1=257,373 | self | 51,474 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-15 130032877.png | 1 | self | members 494739, 214923, 112311; bonus -; total 821,973 | members 494739, 214923, 112311; bonus 98,947; total 920,920 | members 225274, 159760, 251312; bonus -; total 636,346 | self member1=494,739 | self | 98,947 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 636,346<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-15 130032877.png | 2 | enemy | members 428255, 183317, 121189; bonus 54,651; total 787,412 | members 178706, 112138, 15880; bonus -; total 306,724 | members 428255, 183317, 121189; bonus 85,651; total 818,412 | enemy member1=428,255 | enemy | 85,651 | wrong-or-displaced | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-15 130038617.png | 1 | enemy | members 146065, 383687, 214494; bonus -; total 744,246 | members 336969, 86072, 114006; bonus -; total 537,047 | members 146065, 383687, 214494; bonus 76,737; total 820,983 | enemy member2=383,687 | enemy | 76,737 | missing | self: displayed-total-candidates<br>total-direct pass1 537,047<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 820,983<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-15 130038617.png | 2 | enemy | members 423571, 227245, 50654; bonus -; total 701,470 | members 185662, 104396, 130904; bonus -; total 420,962 | members 423571, 227245, 50654; bonus 84,714; total 786,184 | enemy member1=423,571 | enemy | 84,714 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-16 062903692.png | 1 | self | members 340401, 408931, 124176; bonus -; total 873,508 | members 340401, 408931, 124176; bonus 81,786; total 955,294 | members 227112, 122059, 204605; bonus -; total 553,776 | self member2=408,931 | self | 81,786 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: total-trace-token-audit pass1 553 776<br>total-trace-token-audit pass1 553 776 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-16 063215708.png | 2 | enemy | members 251194, 66761, 62517; bonus 50,235; total 430,707 | members 204978, 98167, 137756; bonus -; total 440,901 | members 251194, 66761, 62517; bonus 50,238; total 430,710 | enemy member1=251,194 | enemy | 50,238 | wrong-or-displaced | self: displayed-total-candidates<br>total-direct pass1 440,901<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 430,710<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-16 063330034.png | 1 | self | members 317169, 137568, 172836; bonus -; total 627,573 | members 317169, 137568, 172836; bonus 63,433; total 691,006 | members 228630, 203609, 256328; bonus -; total 688,567 | self member1=317,169 | self | 63,433 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 688,567<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-17 081649834.png | 1 | self | members 402878, 92866, 129060; bonus -; total 624,804 | members 402878, 92866, 129060; bonus 80,575; total 705,379 | members 178121, 71062, 151165; bonus -; total 400,348 | self member1=402,878 | self | 80,575 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-direct pass1 400,348<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-17 081649834.png | 2 | enemy | members 202764, 185374, 176797; bonus -; total 564,935 | members 120953, 117808, 72667; bonus -; total 311,428 | members 202764, 185374, 176797; bonus 40,552; total 605,487 | enemy member1=202,764 | enemy | 40,552 | missing | self: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |
| スクリーンショット 2026-07-17 081731273.png | 1 | enemy | members 181573, 214248, 496229; bonus 59,245; total 951,295 | members 297237, 133624, 70083; bonus -; total 500,944 | members 181573, 214248, 496229; bonus 99,245; total 991,295 | enemy member3=496,229 | enemy | 99,245 | wrong-or-displaced | self: displayed-total-candidates<br>total-direct pass1 500,944<br>total-trace pass1<br>enemy: displayed-total-candidates<br>total-trace pass1<br>total-trace pass1 | selected six-member interpretation is unique; no alternate member values are considered by this strict simulation |

## False Positives

No false positives were found.

## Production Readiness

Productionization is not recommended in this task. The next step should be browser/UI evidence parity for the same member and total provenance before any final-output recovery is considered.

Recommended next step:

1. Add browser/UI parity for the exact evidence used here: selected member provenance, exact total evidence, and final state timing.
2. Confirm parity on all 58 current-PC fixtures.
3. Only then consider a production candidate with the same guards and no added inference.
