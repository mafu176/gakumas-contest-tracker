# Current-PC Expanded Baseline Update

Generated after adding expected fixtures for the 10 current-PC screenshots captured on 2026-07-15 around 18:41 JST.

This is documentation-only. No production OCR behavior, smartphone OCR behavior, legacy desktop OCR behavior, or filename-specific correction logic was changed.

## Summary

- Newly fixture-backed screenshots: 10
- New screenshot result: 0 PASS / 10 FAIL / 0 unresolved
- Expanded current-PC baseline: 48 total / 48 expected / 2 PASS / 46 FAIL / 0 unresolved
- Baseline command: `node scripts/ocr-test-images.mjs --current-pc-baseline`
- Baseline report: `docs/current-pc-ocr-baseline.md`
- Baseline artifacts: `tmp/current-pc-ocr-baseline/`

The newly added fixtures turn the previous unresolved 10-screenshot set into a true failure baseline. The failures are OCR/parser failures, not missing expected-data failures.

## Added Expected Fixtures

| screenshot | Stage1 self | Stage1 enemy | Stage2 self | Stage2 enemy | Stage3 self | Stage3 enemy |
| --- | --- | --- | --- | --- | --- | --- |
| `2026-07-15_184101432.png` | members 268326 / 466573 / 293299; bonus 183314; total 1211512 | members 322573 / 164147 / 62645; bonus 0; total 549365 | members 601646 / 262403 / 394726; bonus 120329; total 1379104 | members 230513 / 255687 / 239546; bonus 0; total 725746 | members 316145 / 879287 / 757751; bonus 0; total 1953183 | members 626231 / 957548 / 611861; bonus 191509; total 2387149 |
| `2026-07-15_184109879.png` | members 348617 / 431212 / 355754; bonus 86242; total 1221825 | members 424306 / 91591 / 186105; bonus 0; total 702002 | members 161593 / 225824 / 315810; bonus 0; total 703227 | members 360210 / 72878 / 206325; bonus 72042; total 711455 | members 742946 / 1099253 / 919939; bonus 0; total 2762138 | members 523915 / 1114422 / 1120363; bonus 224072; total 2982772 |
| `2026-07-15_184117455.png` | members 135684 / 402741 / 247459; bonus 0; total 785884 | members 295521 / 412612 / 189120; bonus 82522; total 979775 | members 389466 / 332464 / 438883; bonus 87776; total 1248589 | members 201132 / 105007 / 256439; bonus 0; total 562578 | members 1003606 / 1091318 / 1007255; bonus 218263; total 3320442 | members 982614 / 677727 / 882215; bonus 0; total 2542556 |
| `2026-07-15_184125225.png` | members 228420 / 601624 / 67279; bonus 120324; total 1017647 | members 224956 / 592786 / 393994; bonus 0; total 1211736 | members 338240 / 149884 / 468397; bonus 93679; total 1050200 | members 193870 / 222682 / 181666; bonus 0; total 598218 | members 574965 / 953306 / 990608; bonus 0; total 2518879 | members 1098592 / 1043851 / 344952; bonus 219718; total 2707113 |
| `2026-07-15_184133120.png` | members 434544 / 536525 / 241399; bonus 107305; total 1319773 | members 308544 / 426263 / 225713; bonus 0; total 960520 | members 95338 / 240099 / 390975; bonus 0; total 726412 | members 214812 / 431286 / 294591; bonus 86257; total 1026946 | members 447116 / 958338 / 1064520; bonus 0; total 2469974 | members 833676 / 589174 / 1352747; bonus 270549; total 3046146 |
| `2026-07-15_184150257.png` | members 512757 / 646199 / 419335; bonus 0; total 1578291 | members 74959 / 721228 / 524924; bonus 144245; total 1465356 | members 226525 / 243276 / 250460; bonus 50092; total 770353 | members 126445 / 114766 / 225382; bonus 0; total 466593 | members 987319 / 944097 / 1004934; bonus 200986; total 3137336 | members 918339 / 605478 / 440916; bonus 0; total 1964733 |
| `2026-07-15_184158330.png` | members 441718 / 369349 / 225291; bonus 0; total 1036358 | members 560330 / 194288 / 349031; bonus 112066; total 1215715 | members 232588 / 249323 / 398240; bonus 0; total 880151 | members 221941 / 227112 / 429827; bonus 85965; total 964845 | members 666499 / 1232791 / 815508; bonus 246558; total 2961356 | members 976629 / 312109 / 1037100; bonus 0; total 2325838 |
| `2026-07-15_184205486.png` | members 567395 / 342663 / 306524; bonus 113479; total 1330061 | members 363756 / 407880 / 174470; bonus 0; total 946106 | members 163872 / 205337 / 243964; bonus 48792; total 661965 | members 150419 / 156199 / 171028; bonus 0; total 477646 | members 1020080 / 878532 / 1076541; bonus 0; total 2975153 | members 881533 / 1196781 / 974861; bonus 239356; total 3292531 |
| `2026-07-15_184212413.png` | members 599518 / 661874 / 679979; bonus 135995; total 2077366 | members 517635 / 361620 / 382185; bonus 0; total 1261440 | members 391032 / 343697 / 287452; bonus 78206; total 1100387 | members 141787 / 203363 / 349926; bonus 0; total 695076 | members 1006667 / 134597 / 671601; bonus 201333; total 2014198 | members 571968 / 861050 / 713287; bonus 0; total 2146305 |
| `2026-07-15_184217948.png` | members 539050 / 592558 / 262003; bonus 118511; total 1512122 | members 528369 / 343884 / 341647; bonus 0; total 1213900 | members 664692 / 108098 / 225155; bonus 132938; total 1130883 | members 197364 / 93021 / 148268; bonus 0; total 438653 | members 249725 / 917636 / 1171915; bonus 0; total 2339276 | members 1417574 / 840482 / 1065699; bonus 283514; total 3607269 |

## True Result For New Screenshots

| screenshot | result | notable failures |
| --- | --- | --- |
| `2026-07-15_184101432.png` | FAIL | S1 self total omits bonus; S2 self and S3 enemy totals off by a few digits |
| `2026-07-15_184109879.png` | FAIL | S3 self drops 7-digit member; S3 enemy shifts 7-digit members and bonus |
| `2026-07-15_184117455.png` | FAIL | S1/S2 bonus total mismatch; S3 self drops all 7-digit members |
| `2026-07-15_184125225.png` | FAIL | S1/S2 enemy sparse/member shift; S3 enemy 7-digit displacement |
| `2026-07-15_184133120.png` | FAIL | S2 enemy member/bonus displacement; S3 self missing 7-digit member; S3 enemy 7-digit/drop pattern |
| `2026-07-15_184150257.png` | FAIL | S1/S2 total bonus omission; S3 self 7-digit member/bonus displacement |
| `2026-07-15_184158330.png` | FAIL | S1 enemy digit misread; S2 enemy order shift; S3 self/enemy 7-digit displacement |
| `2026-07-15_184205486.png` | FAIL | S2 total bonus omission; S3 self/enemy 7-digit displacement |
| `2026-07-15_184212413.png` | FAIL | S1 and S3 self total/bonus mismatch |
| `2026-07-15_184217948.png` | FAIL | S3 self missing 7-digit member; S3 enemy 7-digit/member shift |

## Confirmed Suspicious Groups In Expanded Baseline

From `docs/current-pc-ocr-baseline.md` after the 48-sample run:

| group | suspicious count | confirmed positives | false alarms | notes |
| --- | ---: | ---: | ---: | --- |
| `clean-7digit-candidate-present-but-unselected` | 129 | 71 | 58 | Highest-volume signal, but too broad for production by itself. Needs exact slot/provenance/equation guard. |
| `unique-exact-raw-interpretation-differs-from-selected-result` | 32 | 11 | 21 | Has some exact candidates but many false alarms. Keep as runner-only until source/slot evidence is stronger. |
| `selected-total-not-exact-member-sum-or-member-sum-plus-bonus` | 32 | 32 | 0 | Strong anomaly detector, not a recovery rule by itself. |
| `bonus-candidate-selected-as-member` | 3 | 3 | 0 | Real but low-count; overlaps with member displacement. |
| `missing-selected-member` | 23 | 23 | 0 | Real but heterogeneous: sparse row, 7-digit split/drop, member/total displacement. |

## Simulation Results In Expanded Baseline

- `currentPcStage3SelfSevenDigitDisplacementSimulation`: 3 true positive accepts, 0 false positive accepts, 2 false negatives, 43 correctly blocked negatives.
- `currentPcExactRawEquationRecoverySimulation`: 8 true positive accepts, 0 false positive accepts.
- `currentPcGroupedRawTokenEvidenceSimulation`: 10 true positive accepts, 0 false positive accepts, 11 false negatives.

The grouped/raw token evidence simulation is the strongest next runner-only generalization target because it adds two true positives over exact raw equation recovery without introducing false-positive accepts in the expanded baseline.

## Recommendation

Do not productionize a current-PC OCR recovery rule yet.

Recommended next target: keep improving runner-only grouped/raw token evidence flow for current-PC. It has exact arithmetic, no false-positive accepts in the current 48-sample baseline, and directly addresses punctuation-grouped/raw-token failures without using filename-specific corrections, hard-coded values, near matches, or broad digit-drop inference.

Productionization should wait until the grouped/raw simulation has clearer browser/runner parity evidence and negative controls across at least one more current-PC batch.
