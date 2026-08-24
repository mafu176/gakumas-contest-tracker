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
