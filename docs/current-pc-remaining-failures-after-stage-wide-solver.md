# Current-PC Remaining Failures After Stage-Wide Solver

Generated: 2026-07-18

## Scope

- Investigation only.
- Production OCR output changed: no.
- New recovery rule added: no.
- Smartphone OCR changed: no.
- Legacy desktop OCR changed: no.
- Filename/stage-specific logic: no.
- Near-match guessing or missing-digit invention: no.

## Confirmed Baseline

Latest production commit: `c8cb81a48d1c3cdaa50981b21af3e2e85a0e8b9b`.

The full current-PC baseline was rerun after all current production recoveries. The counts match the expected deployment checkpoint.

| metric | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| image | 21 | 37 | 58 | 36.2% |
| stage | 128 | 46 | 174 | 73.6% |
| stage/side row | 292 | 56 | 348 | 83.9% |

Current production recoveries remain, in order: grouped/raw token, Stage3 7-digit bonus-displacement, crown-bonus rule, and stage-wide six-member solver.

## Position Breakdown

| position | remaining failing rows |
| --- | ---: |
| Stage1 self | 5 |
| Stage1 enemy | 5 |
| Stage2 self | 9 |
| Stage2 enemy | 4 |
| Stage3 self | 24 |
| Stage3 enemy | 9 |

Stage3 self remains the main bottleneck: 24 of 56 remaining failing rows (42.9%).

## Failure Cluster Breakdown

| cluster | rows |
| --- | ---: |
| Stage3 self exact member evidence missing/partial | 20 |
| exact candidates exist but interpretation not uniquely safe | 20 |
| members exact, bonus wrong/missing | 8 |
| exact member absent or partial fragment only | 5 |
| small digit OCR error / near value | 3 |

Interpretation notes:

- The largest Stage3 self cluster is not a total-selection problem: exact self total evidence is present for all 24 remaining Stage3 self rows.
- The blocker is usually member evidence quality or provenance. At least one expected member is missing from the normal candidate pool in 20 Stage3 self rows.
- Rows with exact candidates but unsafe interpretation still fail because the solver cannot prove one unique complete six-member equation without accepting noisy or displaced sources.

## Stage3 Self Deep Dive

| check | count |
| --- | ---: |
| remaining Stage3 self failing rows | 24 |
| expected member1 appears in current evidence | 17 / 24 |
| expected member2 appears in current evidence | 12 / 24 |
| expected member3 appears in current evidence | 14 / 24 |
| all three expected members appear somewhere | 4 / 24 |
| exact self total evidence appears | 24 / 24 |
| exact bonus evidence appears or bonus is zero | 18 / 24 |
| missing / partial member evidence | 21 / 24 |
| present but ambiguous / unsafe | 3 / 24 |
| members exact but bonus wrong/missing | 1 / 24 |

### Stage3 Self Rows

| screenshot | expected self | selected self | evidence presence m1/m2/m3 | total evidence | bonus evidence | cluster | stage-wide rejection |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223152331.png | 808246 / 698916 / 1002602 +0 = 2509764 | 698916 / 0 / 0 +109330 = 808246 | true/true/false | yes | yes | Stage3 self exact member evidence missing/partial | missing-self-member3-candidate; no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223346581.png | 745929 / 1360665 / 937345 +272133 = 3316072 | 745929 / 364665 / 937345 +0 = 2047939 | true/false/true | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223426685.png | 903425 / 1262179 / 859213 +252435 = 3277252 | 262179 / 859213 / 252435 +0 = 1373827 | false/false/true | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223513004.png | 903425 / 1262179 / 859213 +252435 = 3277252 | 262179 / 859213 / 252435 +0 = 1373827 | false/false/true | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223613166.png | 717313 / 846891 / 1121803 +0 = 2686007 | 717313 / 846891 / 0 +1121803 = 2686007 | true/true/true | yes | yes | exact candidates exist but interpretation not uniquely safe | missing-self-member3-candidate; no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223714046.png | 795562 / 1237121 / 1256926 +251385 = 3540994 | 795562 / 25138 / 0 +2720294 = 3540994 | true/false/false | yes | yes | Stage3 self exact member evidence missing/partial | missing-self-member3-candidate; no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223753187.png | 1072082 / 820114 / 923776 +214416 = 3030388 | 820114 / 923776 / 214416 +0 = 1958306 | false/true/true | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223834078.png | 683470 / 941077 / 1406672 +281334 = 3312553 | 683470 / 1406 / 2813 +0 = 687689 | true/true/false | yes | no | Stage3 self exact member evidence missing/partial | missing-self-member3-candidate; missing-enemy-member3-candidate; no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223907986.png | 875583 / 930873 / 1130649 +226129 = 3163234 | 875583 / 930873 / 22612 +0 = 1829068 | true/true/false | yes | no | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184117455.png | 1003606 / 1091318 / 1007255 +218263 = 3320442 | 182467 / 0 / 0 +3137975 = 3320442 | false/false/false | yes | no | Stage3 self exact member evidence missing/partial | missing-self-member2-candidate; missing-self-member3-candidate; no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184133120.png | 447116 / 958338 / 1064520 +0 = 2469974 | 447116 / 958338 / 0 +1064520 = 2469974 | true/true/true | yes | yes | exact candidates exist but interpretation not uniquely safe | no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184150257.png | 987319 / 944097 / 1004934 +200986 = 3137336 | 987319 / 944097 / 20098 +0 = 1951514 | true/true/false | yes | no | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184205486.png | 1020080 / 878532 / 1076541 +0 = 2975153 | 878532 / 0 / 0 +141548 = 1020080 | true/true/false | yes | yes | Stage3 self exact member evidence missing/partial | missing-self-member3-candidate; no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184217948.png | 249725 / 917636 / 1171915 +0 = 2339276 | 249725 / 917636 / 0 +0 = 1167361 | true/true/false | yes | yes | Stage3 self exact member evidence missing/partial | missing-self-member3-candidate; no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-11 145018419.png | 756719 / 867029 / 805828 +173405 = 2602981 | 756719 / 867029 / 5828 +173405 = 1802981 | true/true/false | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-12 223719983.png | 478991 / 440726 / 333713 +95798 = 1349228 | 478991 / 444726 / 333713 +95798 = 1353228 | true/false/true | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 061325391.png | 1033971 / 1191935 / 883071 +238387 = 3347364 | 191935 / 883071 / 738387 +0 = 1813393 | true/false/true | yes | no | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 061545315.png | 810180 / 535044 / 909283 +181856 = 2436363 | 810180 / 535044 / 909283 +18185 = 2272692 | true/true/true | yes | yes | members exact, bonus wrong/missing | no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 061634001.png | 1275772 / 1126492 / 344320 +255154 = 3001738 | 126492 / 255154 / 0 +2620092 = 3001738 | false/false/true | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-15 130038617.png | 348940 / 855687 / 518619 +0 = 1723246 | 348940 / 856687 / 518619 +0 = 1724246 | true/false/true | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 062903692.png | 721210 / 1162325 / 933236 +232465 = 3049236 | 162325 / 933236 / 232465 +0 = 1328026 | false/false/true | yes | yes | Stage3 self exact member evidence missing/partial | no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 063115987.png | 1147085 / 1065321 / 932605 +229417 = 3374428 | 932605 / 9417 / 0 +2432406 = 3374428 | false/false/true | yes | no | Stage3 self exact member evidence missing/partial | missing-self-member2-candidate; missing-self-member3-candidate; no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 063330034.png | 1035782 / 1182459 / 1015625 +236491 = 3470357 | 236491 / 0 / 0 +3233866 = 3470357 | true/false/false | yes | yes | Stage3 self exact member evidence missing/partial | missing-self-member2-candidate; missing-self-member3-candidate; no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-17 081921369.png | 890501 / 869851 / 894265 +178853 = 2833470 | 890501 / 894265 / 17885 +0 = 1802651 | true/true/true | yes | yes | exact candidates exist but interpretation not uniquely safe | no-complete-six-member-exact-total-interpretation |

## All Remaining Failing Rows

The evidence columns are compact: member presence indicates whether each expected member appeared in current production evidence for that side; total/bonus evidence indicates exact expected value evidence. Full raw OCR text, token traces, and per-image artifacts are under `tmp/current-pc-ocr-baseline/` and `tmp/ocr-debug-artifacts/`.

| screenshot | stage | side | expected | selected | mismatches | member evidence | total | bonus | cluster | current recovery rejection summary |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223152331.png | 3 | self | 808246 / 698916 / 1002602 +0 = 2509764 | 698916 / 0 / 0 +109330 = 808246 | member1, member2, member3, bonus, total | true/true/false | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: missing-self-member3-candidate, no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223346581.png | 3 | self | 745929 / 1360665 / 937345 +272133 = 3316072 | 745929 / 364665 / 937345 +0 = 2047939 | member2, bonus, total | true/false/true | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223426685.png | 2 | self | 401629 / 286311 / 563518 +112703 = 1364161 | 401629 / 286311 / 563518 +11270 = 1262728 | bonus, total | true/true/true | exact | exact/zero | members exact, bonus wrong/missing | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223426685.png | 3 | self | 903425 / 1262179 / 859213 +252435 = 3277252 | 262179 / 859213 / 252435 +0 = 1373827 | member1, member2, member3, bonus, total | false/false/true | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223513004.png | 2 | self | 401629 / 286311 / 563518 +112703 = 1364161 | 401629 / 286311 / 563518 +11270 = 1262728 | bonus, total | true/true/true | exact | exact/zero | members exact, bonus wrong/missing | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223513004.png | 3 | self | 903425 / 1262179 / 859213 +252435 = 3277252 | 262179 / 859213 / 252435 +0 = 1373827 | member1, member2, member3, bonus, total | false/false/true | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223613166.png | 3 | self | 717313 / 846891 / 1121803 +0 = 2686007 | 717313 / 846891 / 0 +1121803 = 2686007 | member3, bonus | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: missing-self-member3-candidate, no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223613166.png | 3 | enemy | 1314244 / 1043501 / 841605 +262848 = 3462198 | 43501 / 841605 / 262848 +0 = 1147954 | member1, member2, member3, bonus, total | true/false/true | exact | exact/zero | exact member absent or partial fragment only | stage-wide: missing-self-member3-candidate, no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223714046.png | 3 | self | 795562 / 1237121 / 1256926 +251385 = 3540994 | 795562 / 25138 / 0 +2720294 = 3540994 | member2, member3, bonus | true/false/false | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: missing-self-member3-candidate, no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223753187.png | 3 | self | 1072082 / 820114 / 923776 +214416 = 3030388 | 820114 / 923776 / 214416 +0 = 1958306 | member1, member2, member3, bonus, total | false/true/true | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223834078.png | 3 | self | 683470 / 941077 / 1406672 +281334 = 3312553 | 683470 / 1406 / 2813 +0 = 687689 | member2, member3, bonus, total | true/true/false | exact | missing | Stage3 self exact member evidence missing/partial | stage-wide: missing-self-member3-candidate, missing-enemy-member3-candidate |
| 2026-07-11_223834078.png | 3 | enemy | 1017535 / 580090 / 905641 +0 = 2503266 | 580090 / 905641 / 0 +1017535 = 2503266 | member1, member2, member3, bonus | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: missing-self-member3-candidate, missing-enemy-member3-candidate |
| 2026-07-11_223907986.png | 3 | self | 875583 / 930873 / 1130649 +226129 = 3163234 | 875583 / 930873 / 22612 +0 = 1829068 | member3, bonus, total | true/true/false | exact | missing | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223950902.png | 1 | self | 440366 / 382382 / 545988 +109197 = 1477933 | 440366 / 382382 / 545983 +10919 = 1379650 | member3, bonus, total | true/true/true | exact | missing | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-11_223950902.png | 3 | enemy | 764868 / 1091658 / 864388 +218331 = 2939245 | 91658 / 864388 / 218351 +0 = 1174397 | member1, member2, member3, bonus, total | false/false/true | exact | missing | exact member absent or partial fragment only | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184109879.png | 3 | enemy | 523915 / 1114422 / 1120363 +224072 = 2982772 | 523915 / 120363 / 224072 +0 = 868350 | member2, member3, bonus, total | true/false/false | exact | exact/zero | small digit OCR error / near value | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184117455.png | 3 | self | 1003606 / 1091318 / 1007255 +218263 = 3320442 | 182467 / 0 / 0 +3137975 = 3320442 | member1, member2, member3, bonus | false/false/false | exact | missing | Stage3 self exact member evidence missing/partial | stage-wide: missing-self-member2-candidate, missing-self-member3-candidate |
| 2026-07-15_184125225.png | 3 | enemy | 1098592 / 1043851 / 344952 +219718 = 2707113 | 43851 / 344952 / 219718 +0 = 608521 | member1, member2, member3, bonus, total | true/false/true | exact | exact/zero | small digit OCR error / near value | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184133120.png | 3 | self | 447116 / 958338 / 1064520 +0 = 2469974 | 447116 / 958338 / 0 +1064520 = 2469974 | member3, bonus | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184133120.png | 3 | enemy | 833676 / 589174 / 1352747 +270549 = 3046146 | 333676 / 589174 / 270549 +0 = 1193399 | member1, member3, bonus, total | false/true/true | exact | exact/zero | exact member absent or partial fragment only | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184150257.png | 3 | self | 987319 / 944097 / 1004934 +200986 = 3137336 | 987319 / 944097 / 20098 +0 = 1951514 | member3, bonus, total | true/true/false | exact | missing | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184158330.png | 1 | enemy | 560330 / 194288 / 349031 +112066 = 1215715 | 960330 / 194258 / 349031 +112066 = 1615685 | member1, member2, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184205486.png | 3 | self | 1020080 / 878532 / 1076541 +0 = 2975153 | 878532 / 0 / 0 +141548 = 1020080 | member1, member2, member3, bonus, total | true/true/false | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: missing-self-member3-candidate, no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184205486.png | 3 | enemy | 881533 / 1196781 / 974861 +239356 = 3292531 | 196781 / 974861 / 239356 +56331 = 1467329 | member1, member2, member3, bonus, total | false/false/true | exact | exact/zero | exact member absent or partial fragment only | stage-wide: missing-self-member3-candidate, no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184217948.png | 3 | self | 249725 / 917636 / 1171915 +0 = 2339276 | 249725 / 917636 / 0 +0 = 1167361 | member3, total | true/true/false | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: missing-self-member3-candidate, no-complete-six-member-exact-total-interpretation |
| 2026-07-15_184217948.png | 3 | enemy | 1417574 / 840482 / 1065699 +283514 = 3607269 | 840482 / 283514 / 0 +2483273 = 3607269 | member1, member2, member3, bonus | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: missing-self-member3-candidate, no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-11 144932916.png | 2 | self | 221508 / 128329 / 176419 +44301 = 570557 | 221508 / 128329 / 176419 +0 = 526256 | bonus, total | true/true/true | exact | exact/zero | members exact, bonus wrong/missing | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-11 145018419.png | 2 | self | 262782 / 104193 / 143648 +52556 = 563179 | 262782 / 104193 / 143648 +0 = 510623 | bonus, total | true/true/true | exact | exact/zero | members exact, bonus wrong/missing | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-11 145018419.png | 3 | self | 756719 / 867029 / 805828 +173405 = 2602981 | 756719 / 867029 / 5828 +173405 = 1802981 | member3, total | true/true/false | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-11 145152780.png | 1 | enemy | 62611 / 104418 / 89610 +0 = 256639 | 52611 / 104418 / 89610 +0 = 246639 | member1, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-11 145215861.png | 1 | self | 433069 / 362726 / 149521 +86613 = 1031929 | 433069 / 362726 / 149521 +0 = 945316 | bonus, total | true/true/true | exact | exact/zero | members exact, bonus wrong/missing | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-12 223719983.png | 3 | self | 478991 / 440726 / 333713 +95798 = 1349228 | 478991 / 444726 / 333713 +95798 = 1353228 | member2, total | true/false/true | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-12 223746520.png | 2 | self | 317640 / 167543 / 76281 +63528 = 624992 | 317640 / 76281 / 63528 +0 = 457449 | member2, member3, bonus, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-12 223746520.png | 2 | enemy | 66615 / 43654 / 18781 +0 = 129050 | 66615 / 43656 / 18781 +0 = 129052 | member2, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 060656479.png | 1 | self | 166324 / 333611 / 166324 +0 = 666259 | 164324 / 333611 / 166324 +0 = 664259 | member1, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 060656479.png | 1 | enemy | 310198 / 348665 / 180900 +69733 = 909496 | 180900 / 310198 / 348665 +69733 = 909496 | member1, member2, member3 | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 060656479.png | 2 | self | 147170 / 116778 / 147255 +29451 = 440654 | 147170 / 116778 / 147265 +0 = 411213 | member3, bonus, total | true/true/true | exact | missing | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 061325391.png | 3 | self | 1033971 / 1191935 / 883071 +238387 = 3347364 | 191935 / 883071 / 738387 +0 = 1813393 | member1, member2, member3, bonus, total | true/false/true | exact | missing | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 061545315.png | 3 | self | 810180 / 535044 / 909283 +181856 = 2436363 | 810180 / 535044 / 909283 +18185 = 2272692 | bonus, total | true/true/true | exact | exact/zero | members exact, bonus wrong/missing | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-14 061634001.png | 3 | self | 1275772 / 1126492 / 344320 +255154 = 3001738 | 126492 / 255154 / 0 +2620092 = 3001738 | member1, member2, member3, bonus | false/false/true | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-15 130019543.png | 1 | enemy | 579071 / 170491 / 234685 +115814 = 1100061 | 979071 / 170491 / 234685 +115314 = 1499561 | member1, bonus, total | true/true/true | exact | missing | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-15 130026795.png | 2 | self | 107122 / 238594 / 128026 +47718 = 521460 | 107122 / 128026 / 238594 +47718 = 521460 | member2, member3 | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-15 130026795.png | 2 | enemy | 84880 / 197773 / 119648 +0 = 402301 | 84868 / 197773 / 119648 +0 = 402289 | member1, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-15 130038617.png | 3 | self | 348940 / 855687 / 518619 +0 = 1723246 | 348940 / 856687 / 518619 +0 = 1724246 | member2, total | true/false/true | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 062903692.png | 2 | self | 249565 / 253334 / 42767 +50666 = 596332 | 253334 / 42767 / 50666 +0 = 346767 | member1, member2, member3, bonus, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 062903692.png | 3 | self | 721210 / 1162325 / 933236 +232465 = 3049236 | 162325 / 933236 / 232465 +0 = 1328026 | member1, member2, member3, bonus, total | false/false/true | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 063008443.png | 2 | enemy | 87574 / 148001 / 160468 +0 = 396043 | 87567 / 148001 / 160468 +0 = 396036 | member1, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 063115987.png | 1 | self | 322660 / 198361 / 153346 +64532 = 738899 | 322660 / 198361 / 153346 +0 = 674367 | bonus, total | true/true/true | exact | missing | members exact, bonus wrong/missing | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 063115987.png | 1 | enemy | 99187 / 74052 / 88480 +0 = 261719 | 99187 / 74052 / 388430 +0 = 561669 | member3, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 063115987.png | 2 | self | 203712 / 141269 / 151188 +40742 = 536911 | 203712 / 141269 / 151188 +0 = 496169 | bonus, total | true/true/true | exact | exact/zero | members exact, bonus wrong/missing | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-16 063115987.png | 3 | self | 1147085 / 1065321 / 932605 +229417 = 3374428 | 932605 / 9417 / 0 +2432406 = 3374428 | member1, member2, member3, bonus | false/false/true | exact | missing | Stage3 self exact member evidence missing/partial | stage-wide: missing-self-member2-candidate, missing-self-member3-candidate |
| スクリーンショット 2026-07-16 063330034.png | 3 | self | 1035782 / 1182459 / 1015625 +236491 = 3470357 | 236491 / 0 / 0 +3233866 = 3470357 | member1, member2, member3, bonus | true/false/false | exact | exact/zero | Stage3 self exact member evidence missing/partial | stage-wide: missing-self-member2-candidate, missing-self-member3-candidate |
| スクリーンショット 2026-07-17 081731273.png | 2 | enemy | 290366 / 76793 / 146082 +58073 = 571314 | 290366 / 76793 / 145082 +58073 = 570314 | member3, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-17 081921369.png | 1 | self | 911800 / 437754 / 145468 +182360 = 1677382 | 11800 / 437754 / 145468 +0 = 595022 | member1, bonus, total | false/true/true | exact | missing | exact member absent or partial fragment only | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-17 081921369.png | 3 | self | 890501 / 869851 / 894265 +178853 = 2833470 | 890501 / 894265 / 17885 +0 = 1802651 | member2, member3, bonus, total | true/true/true | exact | exact/zero | exact candidates exist but interpretation not uniquely safe | stage-wide: no-complete-six-member-exact-total-interpretation |
| スクリーンショット 2026-07-17 081921369.png | 3 | enemy | 378443 / 697055 / 463041 +0 = 1538539 | 378443 / 697065 / 463041 +0 = 1538549 | member2, total | true/false/true | exact | exact/zero | small digit OCR error / near value | stage-wide: no-complete-six-member-exact-total-interpretation |

## Recovery Rejection Summary

- Grouped/raw token recovery mostly rejects the remaining rows because there is no unique grouped-token exact interpretation, or the selected row is not in the specific grouped/raw shape it was designed to repair.
- Stage3 7-digit bonus-displacement recovery only applies to the narrow Stage3 bonus-as-member displacement shape with exact total and bonus evidence. Most remaining Stage3 self rows are missing at least one exact member in the normal pool or have multiple displaced members.
- Crown-bonus recovery can validate many totals, but it does not invent missing members and cannot determine rank-1 safely when member evidence is incomplete.
- Stage-wide six-member solver rejects rows when a complete six-member interpretation is unavailable, non-unique, lacks exact total evidence, or would require candidate sources outside the strict normal pool.

## Candidate Next Directions

| option | likely recoverable rows | risk | complexity | current evidence sufficient? | recommendation |
| --- | --- | --- | --- | --- | --- |
| A. Add Stage3 member-row ROI/preprocessing variant evidence to a runner-only stage-wide solver simulation | Highest potential, especially the 20 Stage3 self rows with missing normal member evidence | Medium to high unless provenance is sharply restricted; variant evidence is noisy | Medium | Not for production; sufficient to justify a runner-only simulation | Best next investigation target |
| B. Improve Stage3 OCR preprocessing/ROI | Could improve the same Stage3 self bottleneck upstream | Medium; OCR changes can shift many candidates | Medium/high | Needs controlled diagnostics first | Secondary, after A clarifies useful variant sources |
| C. Improve raw-text candidate parsing | Useful for some raw-text/punctuation failures, but less dominant in this post-solver set | Medium; raw text often concatenates multiple values | Medium | Not enough as a production target | Lower priority |
| D. Improve exact total selection | Low marginal value: exact total evidence already exists for all remaining Stage3 self rows and many other failures | Low/medium | Low | Total evidence is not the main blocker | Not the next target |
| E. Stop implementing and collect more samples | Sensible if no runner-only guard emerges from A | Lowest implementation risk | Low | Current data still has a clear Stage3 self bottleneck to investigate | Keep as fallback |

## Recommended Next Target

Recommendation: A. Add Stage3 member-row ROI/preprocessing variant evidence to a runner-only stage-wide solver simulation.

This should remain simulation-only at first. A safe future guard would need all of the following before production: exact member candidates from narrowly trusted Stage3 member-row variant provenance, exact totals for both sides, crown-bonus consistency, one unique six-member interpretation, no competing interpretation, and zero false positives across all 58 fixtures.

No new simulation was added in this task because this pass only reclassified the final production failures.
