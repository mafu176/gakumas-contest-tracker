# Current-PC Slot-Specific ROI Candidate Investigation

This is runner-only diagnostics for current-PC slot-specific ROI candidate extraction. It does not change final OCR output, production recovery behavior, smartphone OCR, or legacy desktop OCR.

Run with:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-slot-roi-diagnostics
```

## ROI Definitions

- Layout gate: current-PC `541x961` / `current-pc-2026-07-result` geometry via the existing detector.
- `total-slot`: existing current-PC fixed total ROI for the stage/side.
- `member-row`: existing current-PC fixed member-row ROI for the stage/side.
- `member1-slot`, `member2-slot`, `member3-slot`: the fixed member-row ROI split into thirds with small horizontal overlap.
- `bonus-slot`: existing current-PC crown/plus bonus ROI for the stage/side.
- All coordinates are saved as image-relative normalized boxes in `tmp/current-pc-slot-roi-diagnostics/`.

## Summary

- current-PC fixtures evaluated: 58
- stage/side rows evaluated: 348
- failing stage/side rows with slot OCR diagnostics: 113
- exact current production result already correct: 235
- rows where slot-specific candidates contain all exact expected members: 12
- rows where slot-specific candidates contain exact expected bonus or no bonus needed: 23
- rows where slot-specific candidates contain exact expected total: 29
- rows with unique strict exact slot interpretation: 2
- blocked by missing/OCR-confused bonus evidence: 15
- blocked by competing/noisy interpretation: 0
- artifact directory: `tmp/current-pc-slot-roi-diagnostics`
- final OCR output changed: no
- production recovery enabled: no

## Runner-Only Hypothetical Solver

- simulation name: `currentPcSlotSpecificRoiCandidateSimulation`
- guard: corrected member values must come from their matching slot ROI, already-correct selected members may be retained, bonus must come from bonus ROI when nonzero, total must come from total ROI, and the exact equation must be unique.
- selected current values may be present in candidate sets only so the simulation can preserve already-correct slots while testing whether slot-specific evidence repairs the wrong slots.

| metric | count |
| --- | ---: |
| TP | 2 |
| FP | 0 |
| FN | 111 |
| blocked | 111 |

## Classification Counts

| classification | count |
| --- | ---: |
| exact current production result already correct | 235 |
| slot-specific candidates do not help | 58 |
| slot-specific candidates contain partial exact evidence only | 38 |
| slot-specific candidates do not help: missing exact bonus evidence | 15 |
| slot-specific candidates fix member role assignment | 2 |

## Accepted Simulation Cases

| image | stage | side | proposed members | bonus | total | overlaps existing recovery | artifact |
| --- | ---: | --- | --- | ---: | ---: | --- | --- |
| スクリーンショット 2026-07-14 060656479.png | 1 | self | 166324, 333611, 166324 | - | 666,259 | - | tmp/current-pc-slot-roi-diagnostics/スクリーンショット 2026-07-14 060656479.png-stage1-self/slot-specific-roi-diagnostics.json |
| スクリーンショット 2026-07-16 063115987.png | 1 | enemy | 99187, 74052, 88480 | - | 261,719 | - | tmp/current-pc-slot-roi-diagnostics/スクリーンショット 2026-07-16 063115987.png-stage1-enemy/slot-specific-roi-diagnostics.json |

## Unsafe / Blocked Examples

| image | stage | side | classification | rejection reasons | expected | selected | artifact |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223152331.png | 2 | self | slot-specific candidates do not help: missing exact bonus evidence | no-strict-slot-specific-equation | members 140204, 357612, 536797 bonus 107,359 total 1,141,972 | members 140204, 357612, 536797 bonus 10,735 total 1,045,348 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223152331.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223152331.png | 3 | self | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 808246, 698916, 1002602 bonus - total 2,509,764 | members 698916, 0, 0 bonus 109,330 total 808,246 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223152331.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223346581.png | 3 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 745929, 1360665, 937345 bonus 272,133 total 3,316,072 | members 745929, 364665, 937345 bonus - total 2,047,939 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223346581.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223426685.png | 2 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 401629, 286311, 563518 bonus 112,703 total 1,364,161 | members 401629, 286311, 563518 bonus 11,270 total 1,262,728 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223426685.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223426685.png | 3 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 903425, 1262179, 859213 bonus 252,435 total 3,277,252 | members 262179, 859213, 252435 bonus - total 1,373,827 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223426685.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223513004.png | 2 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 401629, 286311, 563518 bonus 112,703 total 1,364,161 | members 401629, 286311, 563518 bonus 11,270 total 1,262,728 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223513004.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223513004.png | 3 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 903425, 1262179, 859213 bonus 252,435 total 3,277,252 | members 262179, 859213, 252435 bonus - total 1,373,827 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223513004.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223613166.png | 2 | enemy | slot-specific candidates do not help | no-strict-slot-specific-equation | members 151208, 386408, 265967 bonus 77,281 total 880,864 | members 151208, 386408, 265967 bonus 77,251 total 880,834 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223613166.png-stage2-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-11_223613166.png | 3 | self | slot-specific candidates contain partial exact evidence only | missing-member-slot-candidate, no-strict-slot-specific-equation | members 717313, 846891, 1121803 bonus - total 2,686,007 | members 717313, 846891, 0 bonus 1,121,803 total 2,686,007 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223613166.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223613166.png | 3 | enemy | slot-specific candidates do not help: missing exact bonus evidence | no-strict-slot-specific-equation | members 1314244, 1043501, 841605 bonus 262,848 total 3,462,198 | members 43501, 841605, 262848 bonus - total 1,147,954 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223613166.png-stage3-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-11_223714046.png | 1 | self | slot-specific candidates do not help: missing exact bonus evidence | no-strict-slot-specific-equation | members 237911, 248700, 498800 bonus 99,760 total 1,085,171 | members 237911, 248700, 498800 bonus - total 985,411 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223714046.png-stage1-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223714046.png | 3 | self | slot-specific candidates contain partial exact evidence only | missing-member-slot-candidate, no-strict-slot-specific-equation | members 795562, 1237121, 1256926 bonus 251,385 total 3,540,994 | members 795562, 25138, 0 bonus 2,720,294 total 3,540,994 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223714046.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223753187.png | 1 | self | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 482143, 434415, 659532 bonus 131,906 total 1,707,996 | members 482143, 434415, 13190 bonus - total 929,748 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223753187.png-stage1-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223753187.png | 2 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 397838, 237023, 284827 bonus 79,567 total 999,255 | members 237023, 284827, 479567 bonus - total 1,001,417 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223753187.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223753187.png | 3 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 1072082, 820114, 923776 bonus 214,416 total 3,030,388 | members 820114, 923776, 214416 bonus - total 1,958,306 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223753187.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223834078.png | 3 | self | slot-specific candidates do not help | missing-member-slot-candidate, no-strict-slot-specific-equation | members 683470, 941077, 1406672 bonus 281,334 total 3,312,553 | members 683470, 1406, 2813 bonus - total 687,689 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223834078.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223834078.png | 3 | enemy | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 1017535, 580090, 905641 bonus - total 2,503,266 | members 580090, 905641, 0 bonus 1,017,535 total 2,503,266 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223834078.png-stage3-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-11_223907986.png | 3 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 875583, 930873, 1130649 bonus 226,129 total 3,163,234 | members 875583, 930873, 22612 bonus - total 1,829,068 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223907986.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223950902.png | 1 | self | slot-specific candidates do not help: missing exact bonus evidence | no-strict-slot-specific-equation | members 440366, 382382, 545988 bonus 109,197 total 1,477,933 | members 440366, 382382, 545983 bonus 10,919 total 1,379,650 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223950902.png-stage1-self/slot-specific-roi-diagnostics.json |
| 2026-07-11_223950902.png | 3 | enemy | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 764868, 1091658, 864388 bonus 218,331 total 2,939,245 | members 91658, 864388, 218351 bonus - total 1,174,397 | tmp/current-pc-slot-roi-diagnostics/2026-07-11_223950902.png-stage3-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184101432.png | 1 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 268326, 466573, 293299 bonus 183,314 total 1,211,512 | members 268326, 466573, 293299 bonus - total 1,028,198 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184101432.png-stage1-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184101432.png | 2 | self | slot-specific candidates do not help: missing exact bonus evidence | no-strict-slot-specific-equation | members 601646, 262403, 394726 bonus 120,329 total 1,379,104 | members 601646, 262403, 394726 bonus 120,326 total 1,379,101 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184101432.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184101432.png | 3 | enemy | slot-specific candidates do not help | no-strict-slot-specific-equation | members 626231, 957548, 611861 bonus 191,509 total 2,387,149 | members 626231, 957548, 611861 bonus 191,500 total 2,387,140 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184101432.png-stage3-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184109879.png | 3 | enemy | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 523915, 1114422, 1120363 bonus 224,072 total 2,982,772 | members 523915, 120363, 224072 bonus - total 868,350 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184109879.png-stage3-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184117455.png | 1 | enemy | slot-specific candidates do not help | no-strict-slot-specific-equation | members 295521, 412612, 189120 bonus 82,522 total 979,775 | members 295521, 412612, 189120 bonus 32,522 total 929,775 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184117455.png-stage1-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184117455.png | 2 | self | slot-specific candidates do not help: missing exact bonus evidence | no-strict-slot-specific-equation | members 389466, 332464, 438883 bonus 87,776 total 1,248,589 | members 389466, 332464, 438883 bonus - total 1,160,813 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184117455.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184117455.png | 3 | self | slot-specific candidates do not help | missing-member-slot-candidate, no-strict-slot-specific-equation | members 1003606, 1091318, 1007255 bonus 218,263 total 3,320,442 | members 182467, 0, 0 bonus 3,137,975 total 3,320,442 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184117455.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184125225.png | 1 | enemy | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 224956, 592786, 393994 bonus - total 1,211,736 | members 393994, 0, 0 bonus 198,792 total 592,786 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184125225.png-stage1-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184125225.png | 2 | self | slot-specific candidates do not help: missing exact bonus evidence | no-strict-slot-specific-equation | members 338240, 149884, 468397 bonus 93,679 total 1,050,200 | members 338240, 149884, 468397 bonus - total 956,521 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184125225.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184125225.png | 3 | enemy | slot-specific candidates do not help | no-strict-slot-specific-equation | members 1098592, 1043851, 344952 bonus 219,718 total 2,707,113 | members 43851, 344952, 219718 bonus - total 608,521 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184125225.png-stage3-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184133120.png | 2 | enemy | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 214812, 431286, 294591 bonus 86,257 total 1,026,946 | members 431286, 294591, 36257 bonus - total 762,134 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184133120.png-stage2-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184133120.png | 3 | self | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 447116, 958338, 1064520 bonus - total 2,469,974 | members 447116, 958338, 0 bonus 1,064,520 total 2,469,974 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184133120.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184133120.png | 3 | enemy | slot-specific candidates do not help | no-strict-slot-specific-equation | members 833676, 589174, 1352747 bonus 270,549 total 3,046,146 | members 333676, 589174, 270549 bonus - total 1,193,399 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184133120.png-stage3-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184150257.png | 1 | enemy | slot-specific candidates do not help | no-strict-slot-specific-equation | members 74959, 721228, 524924 bonus 144,245 total 1,465,356 | members 74959, 721228, 524924 bonus - total 1,321,111 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184150257.png-stage1-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184150257.png | 2 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 226525, 243276, 250460 bonus 50,092 total 770,353 | members 226525, 243276, 250460 bonus - total 720,261 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184150257.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184150257.png | 3 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 987319, 944097, 1004934 bonus 200,986 total 3,137,336 | members 987319, 944097, 20098 bonus - total 1,951,514 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184150257.png-stage3-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184158330.png | 1 | enemy | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 560330, 194288, 349031 bonus 112,066 total 1,215,715 | members 960330, 194258, 349031 bonus 112,066 total 1,615,685 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184158330.png-stage1-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184158330.png | 2 | enemy | slot-specific candidates contain partial exact evidence only | no-strict-slot-specific-equation | members 221941, 227112, 429827 bonus 85,965 total 964,845 | members 227112, 429827, 221941 bonus 85,965 total 964,845 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184158330.png-stage2-enemy/slot-specific-roi-diagnostics.json |
| 2026-07-15_184205486.png | 2 | self | slot-specific candidates do not help | no-strict-slot-specific-equation | members 163872, 205337, 243964 bonus 48,792 total 661,965 | members 163872, 205337, 243964 bonus - total 613,173 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184205486.png-stage2-self/slot-specific-roi-diagnostics.json |
| 2026-07-15_184205486.png | 3 | self | slot-specific candidates contain partial exact evidence only | missing-member-slot-candidate, no-strict-slot-specific-equation | members 1020080, 878532, 1076541 bonus - total 2,975,153 | members 878532, 0, 0 bonus 141,548 total 1,020,080 | tmp/current-pc-slot-roi-diagnostics/2026-07-15_184205486.png-stage3-self/slot-specific-roi-diagnostics.json |

## Overlap With Existing Recoveries

- accepted rows already covered by `currentPcGroupedRawTokenRecovery`: 0
- accepted rows already covered by `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery`: 0
- This report distinguishes actual production recovery application from diagnostic evidence. A row with slot candidates is not considered recovered unless the production result changed.

## Production Recommendation

Do not productionize yet. Although strict slot-specific evidence can produce unique exact interpretations, browser/UI parity and a separate production-readiness audit would be required before any adoption.

## Browser/UI Parity

Browser/UI parity would be required before productionization because this diagnostic path performs additional runner-only slot OCR over fixed ROIs. The browser would need to expose the same slot candidate provenance before any final-output recovery could safely use it.
