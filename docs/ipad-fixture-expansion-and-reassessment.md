# iPad Fixture Expansion and Reassessment

Status: fixture/data expansion only. Production OCR behavior was not changed.

## Scope

This batch adds 10 previously pending readable iPad screenshots from the `ipad-01` layout family. All 10 source screenshots are 1668x2420 portrait images from:

```text
C:\Users\gkhay\Pictures\DMMGamePlayer\ipad
```

The source screenshots were copied into `regression-test/ipad/`, and manually verified expected fixtures were added under `regression-test/expected-ipad/`.

The remaining pending iPad screenshots after this batch are 21. They were left pending because this task was kept to a confidently verified 10-image batch.

## Expected Fixtures Added

All expected values below were read from the source screenshots and then checked by arithmetic and the confirmed crown-bonus rule:

```text
crownBonus = floor(max(all six raw member scores in the stage) * 0.20)
```

| image | stage | self members | self bonus | self total | enemy members | enemy bonus | enemy total |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: |
| IMG_0299.png | 1 | 203521 / 105719 / 177325 | 40704 | 527269 | 118956 / 83521 / 128284 | 0 | 330761 |
| IMG_0299.png | 2 | 267642 / 112152 / 179940 | 53528 | 613262 | 96342 / 46044 / 52994 | 0 | 195380 |
| IMG_0299.png | 3 | 973243 / 855723 / 311385 | 194648 | 2334999 | 797280 / 218307 / 661544 | 0 | 1677131 |
| IMG_0301.png | 1 | 406378 / 80579 / 163726 | 81275 | 731958 | 333995 / 245881 / 213242 | 0 | 793118 |
| IMG_0301.png | 2 | 154367 / 86076 / 116705 | 30873 | 388021 | 76162 / 60673 / 49173 | 0 | 186008 |
| IMG_0301.png | 3 | 835404 / 835996 / 648980 | 0 | 2320380 | 410671 / 349464 / 1221547 | 244309 | 2225991 |
| IMG_0303.png | 1 | 317169 / 137568 / 172836 | 63433 | 691006 | 228630 / 203609 / 256328 | 0 | 688567 |
| IMG_0303.png | 2 | 174534 / 54349 / 104337 | 34906 | 368126 | 115080 / 130100 / 103068 | 0 | 348248 |
| IMG_0303.png | 3 | 1035782 / 1182459 / 1015625 | 236491 | 3470357 | 267764 / 697425 / 71189 | 0 | 1036378 |
| IMG_0304.png | 1 | 388543 / 62845 / 122827 | 77708 | 651923 | 269675 / 240372 / 183137 | 0 | 693184 |
| IMG_0304.png | 2 | 204978 / 98167 / 137756 | 0 | 440901 | 251194 / 66761 / 62517 | 50238 | 430710 |
| IMG_0304.png | 3 | 713048 / 1176566 / 759156 | 235313 | 2884083 | 898281 / 712378 / 463340 | 0 | 2073999 |
| IMG_0305.png | 1 | 322660 / 198361 / 153346 | 64532 | 738899 | 99187 / 74052 / 88480 | 0 | 261719 |
| IMG_0305.png | 2 | 203712 / 141269 / 151188 | 40742 | 536911 | 66102 / 129559 / 57325 | 0 | 252986 |
| IMG_0305.png | 3 | 1147085 / 1065321 / 932605 | 229417 | 3374428 | 481456 / 761170 / 758593 | 0 | 2001219 |
| IMG_0307.png | 1 | 340401 / 408931 / 124176 | 81786 | 955294 | 227112 / 122059 / 204605 | 0 | 553776 |
| IMG_0307.png | 2 | 249565 / 253334 / 42767 | 50666 | 596332 | 187674 / 71835 / 135494 | 0 | 395003 |
| IMG_0307.png | 3 | 721210 / 1162325 / 933236 | 232465 | 3049236 | 31446 / 597385 / 293948 | 0 | 922779 |
| IMG_0308.png | 1 | 911800 / 437754 / 145468 | 182360 | 1677382 | 175569 / 164050 / 331032 | 0 | 670651 |
| IMG_0308.png | 2 | 264349 / 203324 / 154143 | 52869 | 674685 | 162930 / 40697 / 62356 | 0 | 265983 |
| IMG_0308.png | 3 | 890501 / 869851 / 894265 | 178853 | 2833470 | 378443 / 697055 / 463041 | 0 | 1538539 |
| IMG_0316.png | 1 | 191705 / 74138 / 394370 | 78874 | 739087 | 23655 / 49468 / 32956 | 0 | 106079 |
| IMG_0316.png | 2 | 149828 / 190741 / 43313 | 38148 | 422030 | 20992 / 11390 / 17306 | 0 | 49688 |
| IMG_0316.png | 3 | 442099 / 490814 / 404152 | 98162 | 1435227 | 23666 / 11401 / 25182 | 0 | 60249 |
| IMG_0318.png | 1 | 346646 / 192554 / 262438 | 69329 | 870967 | 17761 / 37149 / 13131 | 0 | 68041 |
| IMG_0318.png | 2 | 136596 / 243077 / 55080 | 48615 | 483368 | 36647 / 70140 / 23340 | 0 | 130127 |
| IMG_0318.png | 3 | 64669 / 722393 / 512387 | 144478 | 1443927 | 51901 / 95565 / 31646 | 0 | 179112 |
| IMG_0319.png | 1 | 205090 / 95671 / 101087 | 41018 | 442866 | 156626 / 91455 / 61079 | 0 | 309160 |
| IMG_0319.png | 2 | 201771 / 78093 / 17998 | 40354 | 338216 | 57926 / 10309 / 11909 | 0 | 80144 |
| IMG_0319.png | 3 | 224538 / 756109 / 215971 | 151221 | 1347839 | 104744 / 27857 / 29512 | 0 | 162113 |

## Fixture Validation

Command:

```powershell
node scripts/ocr-test-images.mjs --validate-ipad-expected
```

Result:

| metric | result |
| --- | ---: |
| complete fixtures | 63 |
| incomplete fixtures | 21 |
| stages checked | 189 |
| stage/sides checked | 378 |
| arithmetic | PASS |
| crown rule | PASS |

## Browser Production Baseline

The new 10-image batch was run through the real browser production path:

```powershell
$env:PLAYWRIGHT_NODE_MODULES='C:\Users\gkhay\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node scripts/ipad-browser-expanded-baseline.mjs --runs 1 --only IMG_0299,IMG_0301,IMG_0303,IMG_0304,IMG_0305,IMG_0307,IMG_0308,IMG_0316,IMG_0318,IMG_0319
```

Artifacts:

```text
tmp/ipad-expanded-baseline/
```

New 10-image result:

| metric | result |
| --- | ---: |
| images | 0 / 10 PASS |
| stages | 9 / 30 PASS |
| stage/sides | 28 / 60 PASS |
| production recovery applications | 8 |
| production recovery TP / FP | 8 / 0 |
| Tier C | 3 / 0 |
| strict-total | 2 / 0 |
| strict-member2 | 3 / 0 |

The baseline script's comparison section labels two new strict-total applications as `unexpectedApplications` because the persisted expected-application registry still describes older fixtures. Against the newly added expected fixtures, all 8 actual applications are true positives and there are 0 false positives.

Combined with the previous stable 53-fixture two-run baseline from `tmp/ipad-production-fp-investigation/after-fix-53-two-run-summary.json`:

| metric | previous 53 | new 10 | combined 63 |
| --- | ---: | ---: | ---: |
| image PASS | 0 / 53 | 0 / 10 | 0 / 63 |
| stage PASS | 58 / 159 | 9 / 30 | 67 / 189 |
| stage/side PASS | 162 / 318 | 28 / 60 | 190 / 378 |
| production recovery TP / FP | 119 / 0 | 8 / 0 | 127 / 0 |
| Tier C TP / FP | 72 / 0 | 3 / 0 | 75 / 0 |
| strict-total TP / FP | 15 / 0 | 2 / 0 | 17 / 0 |
| strict-member2 TP / FP | 32 / 0 | 3 / 0 | 35 / 0 |

The combined numbers are a conservative aggregation of the prior completed 53-fixture stable run plus the targeted browser run for the 10 newly labeled fixtures. A full 63-fixture browser rerun was not performed because the real-browser OCR path is slow and the task requested no production behavior changes.

## Per-Image Result

| image | image | stages | stage/sides | production recoveries applied | dominant remaining failures |
| --- | --- | ---: | ---: | --- | --- |
| IMG_0299.png | FAIL | 1 / 3 | 3 / 6 | strict-total S2 enemy; strict-member2 S1 self | S2 self member2/total; Stage3 both sides member/bonus/total recognition |
| IMG_0301.png | FAIL | 1 / 3 | 3 / 6 | Tier C S2 self; strict-total S2 enemy | S1 enemy bonus false positive; Stage3 both sides severe recognition |
| IMG_0303.png | FAIL | 1 / 3 | 3 / 6 | strict-member2 S1 self | S2 self member2/total; Stage3 both sides severe recognition |
| IMG_0304.png | FAIL | 0 / 3 | 2 / 6 | none | S1/S2 member2+total; Stage3 both sides severe recognition |
| IMG_0305.png | FAIL | 2 / 3 | 4 / 6 | Tier C S2 self | Stage3 both sides severe recognition |
| IMG_0307.png | FAIL | 1 / 3 | 3 / 6 | Tier C S1 self | S2 enemy bonus false positive; Stage3 both sides severe recognition |
| IMG_0308.png | FAIL | 1 / 3 | 3 / 6 | strict-member2 S1 enemy | S1 self member3 inflated; Stage3 both sides severe recognition |
| IMG_0316.png | FAIL | 1 / 3 | 2 / 6 | none | S1 bonus selection errors; Stage3 both sides severe recognition |
| IMG_0318.png | FAIL | 1 / 3 | 3 / 6 | none | S1 member2/bonus; Stage3 both sides severe recognition |
| IMG_0319.png | FAIL | 0 / 3 | 2 / 6 | none | S1 bonus false positive; S2 self member2/total; Stage3 both sides severe recognition |

## Failure Reassessment

The new batch reinforces the already documented iPad failure landscape rather than opening a new safe production target.

New 10-image failing stage/side rows:

| category | count / note |
| --- | ---: |
| total failing stage/side rows | 32 |
| Stage1/Stage2 failing rows | 12 |
| Stage3 failing rows | 20 / 20 |
| rows with any member mismatch | 30 |
| rows with bonus mismatch | 17 |
| rows with total mismatch | 25 |
| rows with bonus or total mismatch | 31 |
| Stage3 rows with seven-digit expected members involved | 5 |

Recurring shapes:

- Stage3 remains the largest blocker: every new Stage3 side fails, usually with multiple member fields reduced to fragments or small noisy values, and total recognition also failing.
- Stage1/Stage2 still show smaller selection/capture problems: false positive bonus values such as `3`, `4`, or `1`; member2 inflated by adjacent rank/text digits; and truncated totals.
- Existing production recoveries continue to generalize safely. The 8 new applications are all correct and add no false positives.
- No new recovery should be productionized from this batch. The apparent opportunities are either already covered by existing Tier C / strict-total / strict-member2 recoveries or remain blocked by missing/noisy Stage3 candidate capture.

## Decision

This task added 10 new fixture-backed iPad screenshots and produced a true browser-production baseline for that batch.

No OCR code, ROI, preprocessing, ranking, Tier C, strict-total, strict-member2, smartphone, current-PC, or legacy desktop behavior was changed.

Recommended next step: continue fixture intake for the remaining 21 readable pending iPad screenshots, then rerun the same targeted browser baseline. New recovery work should remain deferred until the expanded labeled set shows at least two zero-FP, exact-evidence cases for the same narrow pattern.

## Batch 2 Scope

Batch 2 continued the fixture/data expansion from the 21 remaining readable `ipad-01` screenshots. It added 11 confidently verified fixtures and left 10 images pending.

All 11 added screenshots are 1668x2420 portrait `ipad-01` images from:

```text
C:\Users\gkhay\Pictures\DMMGamePlayer\ipad
```

Exact file-hash duplicate detection across tracked iPad fixtures and pending source images found no duplicate groups. `IMG_0321.png` was left pending because it is visually duplicate-like with `IMG_0320.png` but not an exact file-hash duplicate, so it needs separate review rather than duplicate fixture creation.

Pending after Batch 2:

| image | dimensions | cluster | status | reason |
| --- | --- | --- | --- | --- |
| IMG_0321.png | 1668x2420 | ipad-01 | pending | visually duplicate-like with IMG_0320 but not exact hash duplicate; needs separate review |
| IMG_0350.png | 1668x2420 | ipad-01 | pending | pending manual transcription |
| IMG_0351.png | 1668x2420 | ipad-01 | pending | pending manual transcription |
| IMG_0353.png | 1668x2420 | ipad-01 | pending | pending manual transcription |
| IMG_0354.png | 1668x2420 | ipad-01 | pending | pending manual transcription |
| IMG_0355.png | 1668x2420 | ipad-01 | pending | pending manual transcription |
| IMG_0356.png | 1668x2420 | ipad-01 | pending | pending manual transcription |
| IMG_0357.png | 1668x2420 | ipad-01 | pending | pending manual transcription |
| IMG_0358.png | 1668x2420 | ipad-01 | pending | pending manual transcription |
| IMG_0359.png | 1668x2420 | ipad-01 | pending | pending manual transcription |

## Batch 2 Expected Fixtures Added

All values were manually read from the source screenshots, then validated by arithmetic and the confirmed iPad crown-bonus rule:

```text
crownBonus = floor(max(all six raw member scores in the stage) * 0.20)
```

| image | stage | self members | self bonus | self total | enemy members | enemy bonus | enemy total |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: |
| IMG_0320.png | 1 | 298058 / 88866 / 122217 | 59611 | 568752 | 67329 / 41829 / 19985 | 0 | 129143 |
| IMG_0320.png | 2 | 109120 / 175972 / 79382 | 35194 | 399668 | 45722 / 15870 / 20211 | 0 | 81803 |
| IMG_0320.png | 3 | 711990 / 594103 / 481896 | 142398 | 1930387 | 19494 / 18841 / 7785 | 0 | 46120 |
| IMG_0323.png | 1 | 248445 / 30666 / 106895 | 0 | 386006 | 308142 / 162417 / 152146 | 61628 | 684333 |
| IMG_0323.png | 2 | 128445 / 80390 / 42381 | 25689 | 276905 | 121318 / 33342 / 28943 | 0 | 183603 |
| IMG_0323.png | 3 | 535268 / 314623 / 375891 | 107053 | 1332835 | 75648 / 55206 / 57633 | 0 | 188487 |
| IMG_0324.png | 1 | 179410 / 185878 / 270927 | 54185 | 690400 | 72463 / 17019 / 30253 | 0 | 119735 |
| IMG_0324.png | 2 | 199593 / 115392 / 49703 | 39918 | 404606 | 40031 / 16560 / 51344 | 0 | 107935 |
| IMG_0324.png | 3 | 684886 / 593020 / 501536 | 136977 | 1916419 | 63945 / 65414 / 35628 | 0 | 164987 |
| IMG_0325.png | 1 | 262339 / 71504 / 339493 | 67898 | 741234 | 30275 / 13155 / 10237 | 0 | 53667 |
| IMG_0325.png | 2 | 257997 / 114303 / 40500 | 51599 | 464399 | 19526 / 17771 / 8974 | 0 | 46271 |
| IMG_0325.png | 3 | 629633 / 469056 / 473673 | 125926 | 1698288 | 21031 / 13026 / 5628 | 0 | 39685 |
| IMG_0327.png | 1 | 233921 / 82110 / 365474 | 73094 | 754599 | 273155 / 60931 / 164549 | 0 | 498635 |
| IMG_0327.png | 2 | 82322 / 40315 / 38532 | 0 | 161169 | 129648 / 133046 / 237083 | 47416 | 547193 |
| IMG_0327.png | 3 | 712837 / 562843 / 411636 | 142567 | 1829883 | 140569 / 364955 / 389169 | 0 | 894693 |
| IMG_0328.png | 1 | 173270 / 34401 / 102989 | 34654 | 345314 | 16330 / 12665 / 42795 | 0 | 71790 |
| IMG_0328.png | 2 | 109807 / 96496 / 63988 | 21961 | 292252 | 9114 / 36351 / 55678 | 0 | 101143 |
| IMG_0328.png | 3 | 671773 / 616826 / 174313 | 134354 | 1597266 | 24139 / 54203 / 30677 | 0 | 109019 |
| IMG_0329.png | 1 | 231173 / 103920 / 96227 | 46234 | 477554 | 158827 / 15873 / 37963 | 0 | 212663 |
| IMG_0329.png | 2 | 167809 / 10470 / 37420 | 33561 | 249260 | 105919 / 31951 / 13490 | 0 | 151360 |
| IMG_0329.png | 3 | 826023 / 719118 / 524011 | 165204 | 2234356 | 98916 / 76242 / 256331 | 0 | 431489 |
| IMG_0330.png | 1 | 255093 / 88280 / 133709 | 51018 | 528100 | 13275 / 164949 / 173365 | 0 | 351589 |
| IMG_0330.png | 2 | 96358 / 154130 / 47902 | 30826 | 329216 | 98961 / 24446 / 30545 | 0 | 153952 |
| IMG_0330.png | 3 | 372813 / 507782 / 527885 | 105577 | 1514057 | 34667 / 37174 / 42022 | 0 | 113863 |
| IMG_0333.png | 1 | 165927 / 25327 / 135692 | 33185 | 360131 | 46702 / 112259 / 90362 | 0 | 249323 |
| IMG_0333.png | 2 | 129064 / 110441 / 27603 | 25812 | 292920 | 55465 / 20232 / 57739 | 0 | 133436 |
| IMG_0333.png | 3 | 403714 / 217697 / 245976 | 80742 | 948129 | 100866 / 64403 / 50334 | 0 | 215603 |
| IMG_0334.png | 1 | 116149 / 311464 / 228837 | 62292 | 718742 | 196715 / 150873 / 87353 | 0 | 434941 |
| IMG_0334.png | 2 | 75470 / 47606 / 70404 | 0 | 193480 | 117159 / 23494 / 49575 | 23431 | 213659 |
| IMG_0334.png | 3 | 696601 / 499999 / 222648 | 139320 | 1558568 | 64286 / 26972 / 5943 | 0 | 97201 |
| IMG_0335.png | 1 | 163451 / 99406 / 63614 | 32690 | 359161 | 131288 / 95310 / 106829 | 0 | 333427 |
| IMG_0335.png | 2 | 133753 / 258475 / 46780 | 51695 | 490703 | 118781 / 84424 / 185441 | 0 | 388646 |
| IMG_0335.png | 3 | 941390 / 626776 / 541794 | 188278 | 2298238 | 590739 / 527597 / 589734 | 0 | 1708070 |

## Batch 2 Fixture Validation

Command:

```powershell
node scripts/ocr-test-images.mjs --validate-ipad-expected
```

Result:

| metric | result |
| --- | ---: |
| complete fixtures | 74 |
| incomplete fixtures | 10 |
| stages checked | 222 |
| stage/sides checked | 444 |
| arithmetic | PASS |
| crown rule | PASS |

## Batch 2 Browser Production Baseline

The new 11-image batch was run through the real browser production path:

```powershell
$env:PLAYWRIGHT_NODE_MODULES='C:\Users\gkhay\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node scripts/ipad-browser-expanded-baseline.mjs --runs 1 --only IMG_0320,IMG_0323,IMG_0324,IMG_0325,IMG_0327,IMG_0328,IMG_0329,IMG_0330,IMG_0333,IMG_0334,IMG_0335
```

Artifacts:

```text
tmp/ipad-expanded-baseline/
tmp/ipad-fixture-expansion-batch2/
```

New 11-image result:

| metric | result |
| --- | ---: |
| images | 0 / 11 PASS |
| stages | 9 / 33 PASS |
| stage/sides | 29 / 66 PASS |
| production recovery applications | 13 |
| production recovery TP / FP | 13 / 0 |
| Tier C | 12 / 0 |
| strict-total | 0 / 0 |
| strict-member2 | 1 / 0 |
| stable application rows | 13 / 13 |

Combined with the prior conservative 63-fixture aggregation:

| metric | previous 63 | new 11 | combined 74 |
| --- | ---: | ---: | ---: |
| image PASS | 0 / 63 | 0 / 11 | 0 / 74 |
| stage PASS | 67 / 189 | 9 / 33 | 76 / 222 |
| stage/side PASS | 190 / 378 | 29 / 66 | 219 / 444 |
| production recovery TP / FP | 127 / 0 | 13 / 0 | 140 / 0 |
| Tier C TP / FP | 75 / 0 | 12 / 0 | 87 / 0 |
| strict-total TP / FP | 17 / 0 | 0 / 0 | 17 / 0 |
| strict-member2 TP / FP | 35 / 0 | 1 / 0 | 36 / 0 |

The combined numbers are a conservative aggregation of the prior completed 63-fixture data plus the targeted browser run for the 11 newly labeled fixtures. A full 74-fixture browser rerun was not performed because the browser-native OCR path is slow and this task was data-only.

## Batch 2 Per-Image Result

| image | image | stages | stage/sides | production recoveries applied | dominant remaining failures |
| --- | --- | ---: | ---: | --- | --- |
| IMG_0320.png | FAIL | 1 / 3 | 2 / 6 | Tier C S2 self | S1 tiny bonus false positives; Stage3 both sides severe member/bonus/total recognition |
| IMG_0323.png | FAIL | 2 / 3 | 4 / 6 | Tier C S1 self, S2 self | Stage3 both sides member/total recognition |
| IMG_0324.png | FAIL | 0 / 3 | 2 / 6 | none | S1/S2 bonus/member2 capture; Stage3 both sides severe recognition |
| IMG_0325.png | FAIL | 0 / 3 | 2 / 6 | Tier C S2 self | S1 member2/bonus; S2 enemy total truncation; Stage3 both sides severe recognition |
| IMG_0327.png | FAIL | 1 / 3 | 3 / 6 | Tier C S1 self; strict-member2 S1 enemy | S2 self bonus/total truncation; Stage3 both sides severe recognition |
| IMG_0328.png | FAIL | 0 / 3 | 2 / 6 | none | S1/S2 member2 and bonus capture; Stage3 both sides severe recognition |
| IMG_0329.png | FAIL | 1 / 3 | 3 / 6 | Tier C S2 self | S1 self member2/bonus/total; Stage3 both sides severe recognition |
| IMG_0330.png | FAIL | 1 / 3 | 3 / 6 | Tier C S1 self, S2 self | S1 enemy tiny bonus false positive; Stage3 both sides severe recognition |
| IMG_0333.png | FAIL | 2 / 3 | 4 / 6 | Tier C S1 self, S2 self | Stage3 both sides severe recognition |
| IMG_0334.png | FAIL | 0 / 3 | 1 / 6 | none | S1/S2 member2/bonus; Stage3 both sides severe recognition |
| IMG_0335.png | FAIL | 1 / 3 | 3 / 6 | Tier C S1 enemy, S2 self | S1 self member2/bonus; Stage3 both sides recognition |

## Batch 2 Failure Reassessment

New 11-image failing stage/side rows:

| category | count / note |
| --- | ---: |
| total failing stage/side rows | 37 |
| Stage1/Stage2 failing rows | 15 |
| Stage3 failing rows | 22 / 22 |
| rows with any member mismatch | 30 |
| member1 mismatches | 22 |
| member2 mismatches | 30 |
| member3 mismatches | 22 |
| rows with bonus mismatch | 26 |
| rows with total mismatch | 25 |
| one-field-away rows | 6 |

Recurring shapes:

- Stage3 is still the dominant blocker. Every new Stage3 side fails, usually with member values reduced to fragments, single digits, or noisy merged values; totals are also often truncated to tiny values.
- Stage1/Stage2 retains the known iPad shapes: member2 missing/inflated by adjacent text, small false-positive bonuses such as `1`/`3`, and occasional truncated totals.
- Existing production recoveries continue to apply safely. The 13 new applications are all correct and introduce no false positives.
- No new production recovery is recommended from Batch 2. The batch mainly reinforces the known Stage3 capture-quality problem and the already-served Stage1/Stage2 arithmetic/member2 recovery families.

## Batch 2 Decision

This batch added 11 new fixture-backed iPad screenshots and produced a true browser-production baseline for those new fixtures.

No OCR code, ROI, preprocessing, ranking, Tier C, strict-total, strict-member2, smartphone, current-PC, or legacy desktop behavior was changed.

Recommended next step: finish intake for the remaining 10 pending `ipad-01` screenshots, then run a final combined reclassification over all complete iPad fixtures. New production recovery work should remain deferred until the expanded labeled set shows a repeated zero-FP exact-evidence pattern that is not already handled by Tier C or strict-member2.
