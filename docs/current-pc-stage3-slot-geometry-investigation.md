# Current-PC Stage3 Slot Geometry Investigation

This runner-only diagnostic pass measures whether OCR token bounding boxes can assign Stage3 member values to `member1` / `member2` / `member3` deterministically. It writes artifacts under `tmp/` and does not change final OCR output.

## Summary

- output: `tmp/current-pc-stage3-slot-geometry-diagnostics`
- source baseline summary: `tmp/current-pc-ocr-baseline/summary.json`
- Stage3 side rows inspected: 116
- expected member values inspected: 348
- exact expected values found by diagnostic OCR: 335 / 348
- exact expected values found with bbox geometry: 335 / 348
- deterministic missing-member recoveries by center+overlap consensus: 60
- Stage3 self rows with all three expected members visible by center+overlap consensus: 54
- rows with concatenated or multi-slot OCR runs: 116

## BBox Availability

Tesseract word/symbol geometry is available through the existing runner worker API (`blocks`/`hocr`/`tsv`) and is preserved only in these diagnostics.

## Strategy Comparison

| Strategy | Correct | Wrong slot | Ambiguous | Absent |
| --- | ---: | ---: | ---: | ---: |
| centerInsideSlot | 335 | 0 | 0 | 13 |
| nearestCenter | 335 | 0 | 0 | 13 |
| maxOverlap | 335 | 0 | 0 | 13 |
| overlap50 | 335 | 0 | 0 | 13 |
| overlap70 | 335 | 0 | 0 | 13 |
| centerOverlapConsensus | 335 | 0 | 0 | 13 |

Primary safety criterion is zero wrong-slot assignments. Strategies with wrong-slot assignments remain diagnostics-only even when they recover exact values.

## Commands

- Full baseline plus geometry: `node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage3-slot-geometry-diagnostics`
- Geometry-only from existing baseline artifacts: `node scripts/ocr-test-images.mjs --current-pc-stage3-slot-geometry-from-baseline`
- Geometry-slot solver simulation from existing baseline artifacts: `node scripts/ocr-test-images.mjs --current-pc-stage3-slot-geometry-from-baseline --current-pc-stage3-geometry-slot-solver`

The second command is diagnostics-only and reuses `tmp/current-pc-ocr-baseline/summary.json`; it does not rerun final OCR extraction.

## Expected-Blind Geometry Slot Simulation

This runner-only simulation builds Stage3 member candidates from OCR token bbox geometry only. Expected fixtures are used only after the proposed result is built, for TP/FP/FN scoring.

| Metric | Count |
| --- | ---: |
| TP | 1 |
| FP | 0 |
| FN | 2 |
| blocked | 24 |
| accepted stage/side corrections | 1 |
| true incremental TP beyond current production stage-wide solver | 1 |
| Stage3 self incremental TP | 1 |
| potential full-image PASS gain | 1 |
| wrong-slot assignments in geometry candidates | 0 |
| extra candidate insertions | 16 |

| Candidate Filter | Count |
| --- | ---: |
| inspected tokens | 2644 |
| accepted tokens | 272 |
| rejected tokens | 2372 |
| ambiguous tokens | 433 |
| concatenated tokens rejected | 92 |

Rejected candidate reasons:

- no-numeric-token: 1765
- multi-slot-overlap: 392
- concatenated-or-multi-number-token: 92
- outside-member-range: 82
- missing-center-overlap-consensus: 41

Candidate scoring summary:

- correct-slot: 256
- extra-candidate: 16

Overlap with existing production recoveries:

- groupedRaw: 0
- stage3SevenDigit: 0
- crownBonus: 0
- stageWideSixMember: 0
- exactMembersBonusTotal: 0

Recommendation: do not productionize.

### Accepted Simulation Cases

| Image | Stage | Changed slots | Proposed self | Proposed enemy | Geometry candidates used | Existing stage-wide? |
| --- | ---: | --- | --- | --- | --- | --- |
| スクリーンショット 2026-07-11 145018419.png | 3 | self member3: 5,828 -> 805,828 | 756719, 867029, 805828 / total 2,602,981 | 296074, 110009, 27156 / total 433,239 | self member3=805,828 (current-member-row-roi, overlap=100%)<br>self member3=805,828 (wider-member-row-roi, overlap=100%) | no |

Potential full-image PASS gain:

- スクリーンショット 2026-07-11 145018419.png

## Slot ROI Geometry

| Image | Side | Member row ROI | Slot ROIs |
| --- | --- | --- | --- |
| 2026-07-11_223152331.png | self | x=24, y=621, w=221, h=107 | member1: x=18,w=86<br>member2: x=92,w=86<br>member3: x=166,w=82 |
| 2026-07-11_223152331.png | enemy | x=294, y=621, w=221, h=107 | member1: x=288,w=86<br>member2: x=362,w=86<br>member3: x=436,w=82 |
| 2026-07-11_223346581.png | self | x=24, y=621, w=221, h=107 | member1: x=18,w=86<br>member2: x=92,w=86<br>member3: x=166,w=82 |
| 2026-07-11_223346581.png | enemy | x=294, y=621, w=221, h=107 | member1: x=288,w=86<br>member2: x=362,w=86<br>member3: x=436,w=82 |
| 2026-07-11_223426685.png | self | x=24, y=621, w=221, h=107 | member1: x=18,w=86<br>member2: x=92,w=86<br>member3: x=166,w=82 |
| 2026-07-11_223426685.png | enemy | x=294, y=621, w=221, h=107 | member1: x=288,w=86<br>member2: x=362,w=86<br>member3: x=436,w=82 |
| 2026-07-11_223513004.png | self | x=24, y=621, w=221, h=107 | member1: x=18,w=86<br>member2: x=92,w=86<br>member3: x=166,w=82 |
| 2026-07-11_223513004.png | enemy | x=294, y=621, w=221, h=107 | member1: x=288,w=86<br>member2: x=362,w=86<br>member3: x=436,w=82 |
| 2026-07-11_223613166.png | self | x=24, y=621, w=221, h=107 | member1: x=18,w=86<br>member2: x=92,w=86<br>member3: x=166,w=82 |
| 2026-07-11_223613166.png | enemy | x=294, y=621, w=221, h=107 | member1: x=288,w=86<br>member2: x=362,w=86<br>member3: x=436,w=82 |

## Per-Row Highlights

| Image | Side | Selected members | Expected members | Consensus exact members | Missing recovered by consensus | Wrong-slot strategies | Artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223152331.png | self | 698916, 0, 0 | 808246, 698916, 1002602 | member1=808,246<br>member2=698,916<br>member3=1,002,602 | member1=808,246<br>member2=698,916<br>member3=1,002,602 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223152331.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223152331.png | enemy | 115012, 1059979, 1525970 | 115012, 1059979, 1525970 | member1=115,012<br>member3=1,525,970 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223152331.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223346581.png | self | 745929, 364665, 937345 | 745929, 1360665, 937345 | member1=745,929<br>member2=1,360,665<br>member3=937,345 | member2=1,360,665 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223346581.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223346581.png | enemy | 706573, 353903, 467485 | 706573, 353903, 467485 | member1=706,573<br>member2=353,903<br>member3=467,485 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223346581.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223426685.png | self | 262179, 859213, 252435 | 903425, 1262179, 859213 | member1=903,425<br>member2=1,262,179<br>member3=859,213 | member1=903,425<br>member2=1,262,179<br>member3=859,213 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223426685.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223426685.png | enemy | 277775, 441849, 545898 | 277775, 441849, 545898 | member1=277,775<br>member2=441,849<br>member3=545,898 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223426685.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223513004.png | self | 262179, 859213, 252435 | 903425, 1262179, 859213 | member1=903,425<br>member2=1,262,179<br>member3=859,213 | member1=903,425<br>member2=1,262,179<br>member3=859,213 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223513004.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223513004.png | enemy | 277775, 441849, 545898 | 277775, 441849, 545898 | member1=277,775<br>member2=441,849<br>member3=545,898 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223513004.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223613166.png | self | 717313, 846891, 0 | 717313, 846891, 1121803 | member1=717,313<br>member2=846,891<br>member3=1,121,803 | member3=1,121,803 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223613166.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223613166.png | enemy | 43501, 841605, 262848 | 1314244, 1043501, 841605 | member1=1,314,244<br>member3=841,605 | member1=1,314,244<br>member3=841,605 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223613166.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223714046.png | self | 795562, 25138, 0 | 795562, 1237121, 1256926 | member1=795,562<br>member2=1,237,121<br>member3=1,256,926 | member2=1,237,121<br>member3=1,256,926 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223714046.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223714046.png | enemy | 964257, 635156, 780475 | 964257, 635156, 780475 | member2=635,156<br>member3=780,475 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223714046.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223753187.png | self | 820114, 923776, 214416 | 1072082, 820114, 923776 | member1=1,072,082<br>member2=820,114<br>member3=923,776 | member1=1,072,082<br>member2=820,114<br>member3=923,776 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223753187.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223753187.png | enemy | 675677, 977766, 448030 | 675677, 977766, 448030 | member1=675,677<br>member2=977,766<br>member3=448,030 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223753187.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223834078.png | self | 683470, 1406, 2813 | 683470, 941077, 1406672 | member1=683,470<br>member2=941,077<br>member3=1,406,672 | member2=941,077<br>member3=1,406,672 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223834078.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223834078.png | enemy | 580090, 905641, 0 | 1017535, 580090, 905641 | member1=1,017,535<br>member2=580,090<br>member3=905,641 | member1=1,017,535<br>member2=580,090<br>member3=905,641 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223834078.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223907986.png | self | 875583, 930873, 22612 | 875583, 930873, 1130649 | member1=875,583<br>member2=930,873<br>member3=1,130,649 | member3=1,130,649 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223907986.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223907986.png | enemy | 727205, 666373, 599214 | 727205, 666373, 599214 | member1=727,205<br>member2=666,373<br>member3=599,214 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223907986.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223950902.png | self | 1029553, 809360, 723304 | 1029553, 809360, 723304 | member1=1,029,553<br>member2=809,360<br>member3=723,304 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223950902.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-11_223950902.png | enemy | 91658, 864388, 218351 | 764868, 1091658, 864388 | member1=764,868<br>member2=1,091,658<br>member3=864,388 | member1=764,868<br>member2=1,091,658<br>member3=864,388 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-11_223950902.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184101432.png | self | 316145, 879287, 757751 | 316145, 879287, 757751 | member1=316,145<br>member2=879,287<br>member3=757,751 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184101432.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184101432.png | enemy | 626231, 957548, 611861 | 626231, 957548, 611861 | member1=626,231<br>member2=957,548<br>member3=611,861 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184101432.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184109879.png | self | 742946, 1099253, 919939 | 742946, 1099253, 919939 | member1=742,946<br>member2=1,099,253<br>member3=919,939 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184109879.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184109879.png | enemy | 523915, 120363, 224072 | 523915, 1114422, 1120363 | member1=523,915<br>member2=1,114,422<br>member3=1,120,363 | member2=1,114,422<br>member3=1,120,363 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184109879.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184117455.png | self | 182467, 0, 0 | 1003606, 1091318, 1007255 | member3=1,007,255 | member3=1,007,255 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184117455.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184117455.png | enemy | 982614, 677727, 882215 | 982614, 677727, 882215 | member1=982,614<br>member2=677,727<br>member3=882,215 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184117455.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184125225.png | self | 574965, 953306, 990608 | 574965, 953306, 990608 | member1=574,965<br>member2=953,306<br>member3=990,608 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184125225.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184125225.png | enemy | 43851, 344952, 219718 | 1098592, 1043851, 344952 | member1=1,098,592<br>member3=344,952 | member1=1,098,592<br>member3=344,952 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184125225.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184133120.png | self | 447116, 958338, 0 | 447116, 958338, 1064520 | member1=447,116<br>member2=958,338<br>member3=1,064,520 | member3=1,064,520 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184133120.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184133120.png | enemy | 333676, 589174, 270549 | 833676, 589174, 1352747 | member1=833,676<br>member2=589,174<br>member3=1,352,747 | member1=833,676<br>member3=1,352,747 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184133120.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184150257.png | self | 987319, 944097, 20098 | 987319, 944097, 1004934 | member1=987,319<br>member2=944,097<br>member3=1,004,934 | member3=1,004,934 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184150257.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184150257.png | enemy | 918339, 605478, 440916 | 918339, 605478, 440916 | member1=918,339<br>member2=605,478<br>member3=440,916 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184150257.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184158330.png | self | 666499, 1232791, 815508 | 666499, 1232791, 815508 | member1=666,499<br>member2=1,232,791<br>member3=815,508 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184158330.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184158330.png | enemy | 976629, 312109, 1037100 | 976629, 312109, 1037100 | member1=976,629<br>member2=312,109<br>member3=1,037,100 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184158330.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184205486.png | self | 878532, 0, 0 | 1020080, 878532, 1076541 | member1=1,020,080<br>member2=878,532<br>member3=1,076,541 | member1=1,020,080<br>member2=878,532<br>member3=1,076,541 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184205486.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184205486.png | enemy | 196781, 974861, 239356 | 881533, 1196781, 974861 | member1=881,533<br>member2=1,196,781<br>member3=974,861 | member1=881,533<br>member2=1,196,781<br>member3=974,861 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184205486.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184212413.png | self | 1006667, 134597, 671601 | 1006667, 134597, 671601 | member1=1,006,667<br>member2=134,597<br>member3=671,601 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184212413.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184212413.png | enemy | 571968, 861050, 713287 | 571968, 861050, 713287 | member1=571,968<br>member2=861,050<br>member3=713,287 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184212413.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184217948.png | self | 249725, 917636, 0 | 249725, 917636, 1171915 | member1=249,725<br>member2=917,636<br>member3=1,171,915 | member3=1,171,915 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184217948.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| 2026-07-15_184217948.png | enemy | 840482, 283514, 0 | 1417574, 840482, 1065699 | member1=1,417,574<br>member2=840,482<br>member3=1,065,699 | member1=1,417,574<br>member2=840,482<br>member3=1,065,699 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/2026-07-15_184217948.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 144846091.png | self | 1078642, 705961, 667889 | 1078642, 705961, 667889 | member1=1,078,642<br>member2=705,961<br>member3=667,889 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 144846091.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 144846091.png | enemy | 100084, 260326, 41185 | 100084, 260326, 41185 | member1=100,084<br>member2=260,326<br>member3=41,185 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 144846091.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 144908802.png | self | 951228, 628395, 449753 | 951228, 628395, 449753 | member1=951,228<br>member2=628,395<br>member3=449,753 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 144908802.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 144908802.png | enemy | 370750, 46611, 26083 | 370750, 46611, 26083 | member1=370,750<br>member2=46,611<br>member3=26,083 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 144908802.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 144932916.png | self | 950088, 1135373, 894637 | 950088, 1135373, 894637 | member1=950,088<br>member2=1,135,373<br>member3=894,637 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 144932916.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 144932916.png | enemy | 85746, 68166, 98264 | 85746, 68166, 98264 | member1=85,746<br>member2=68,166<br>member3=98,264 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 144932916.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 144958188.png | self | 678900, 698436, 800021 | 678900, 698436, 800021 | member1=678,900<br>member2=698,436<br>member3=800,021 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 144958188.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 144958188.png | enemy | 361902, 275018, 36086 | 361902, 275018, 36086 | member1=361,902<br>member2=275,018<br>member3=36,086 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 144958188.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145018419.png | self | 756719, 867029, 5828 | 756719, 867029, 805828 | member1=756,719<br>member2=867,029<br>member3=805,828 | member3=805,828 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145018419.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145018419.png | enemy | 296074, 110009, 27156 | 296074, 110009, 27156 | member1=296,074<br>member2=110,009<br>member3=27,156 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145018419.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145038835.png | self | 899855, 1043301, 875583 | 899855, 1043301, 875583 | member1=899,855<br>member2=1,043,301<br>member3=875,583 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145038835.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145038835.png | enemy | 201826, 63205, 12929 | 201826, 63205, 12929 | member1=201,826<br>member2=63,205<br>member3=12,929 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145038835.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145100208.png | self | 1107136, 548299, 567465 | 1107136, 548299, 567465 | member1=1,107,136<br>member2=548,299<br>member3=567,465 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145100208.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145100208.png | enemy | 62564, 41265, 186125 | 62564, 41265, 186125 | member1=62,564<br>member2=41,265<br>member3=186,125 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145100208.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145126932.png | self | 1079689, 419172, 944928 | 1079689, 419172, 944928 | member1=1,079,689<br>member2=419,172<br>member3=944,928 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145126932.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145126932.png | enemy | 21502, 46021, 58987 | 21502, 46021, 58987 | member1=21,502<br>member2=46,021<br>member3=58,987 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145126932.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145152780.png | self | 877699, 569560, 744217 | 877699, 569560, 744217 | member1=877,699<br>member2=569,560<br>member3=744,217 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145152780.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145152780.png | enemy | 34917, 184256, 65797 | 34917, 184256, 65797 | member1=34,917<br>member2=184,256<br>member3=65,797 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145152780.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145215861.png | self | 822138, 287040, 942720 | 822138, 287040, 942720 | member1=822,138<br>member2=287,040<br>member3=942,720 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145215861.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-11 145215861.png | enemy | 21409, 66989, 56193 | 21409, 66989, 56193 | member1=21,409<br>member2=66,989<br>member3=56,193 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-11 145215861.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 223636381.png | self | 948374, 779894, 933262 | 948374, 779894, 933262 | member1=948,374<br>member2=779,894<br>member3=933,262 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 223636381.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 223636381.png | enemy | 35541, 136865, 82760 | 35541, 136865, 82760 | member1=35,541<br>member2=136,865<br>member3=82,760 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 223636381.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 223701314.png | self | 763742, 1081712, 237132 | 763742, 1081712, 237132 | member1=763,742<br>member2=1,081,712<br>member3=237,132 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 223701314.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 223701314.png | enemy | 768325, 596720, 633894 | 768325, 596720, 633894 | member1=768,325<br>member2=596,720<br>member3=633,894 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 223701314.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 223719983.png | self | 478991, 444726, 333713 | 478991, 440726, 333713 | member1=478,991<br>member2=440,726<br>member3=333,713 | member2=440,726 | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 223719983.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 223719983.png | enemy | 274926, 30418, 56720 | 274926, 30418, 56720 | member1=274,926<br>member2=30,418<br>member3=56,720 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 223719983.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 223746520.png | self | 704686, 301090, 550160 | 704686, 301090, 550160 | member1=704,686<br>member2=301,090<br>member3=550,160 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 223746520.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 223746520.png | enemy | 106161, 52697, 71046 | 106161, 52697, 71046 | member1=106,161<br>member2=52,697<br>member3=71,046 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 223746520.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 224905234.png | self | 948374, 779894, 933262 | 948374, 779894, 933262 | member1=948,374<br>member2=779,894<br>member3=933,262 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 224905234.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-12 224905234.png | enemy | 35541, 136865, 82760 | 35541, 136865, 82760 | member1=35,541<br>member2=136,865<br>member3=82,760 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-12 224905234.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 060656479.png | self | 645012, 979934, 523494 | 645012, 979934, 523494 | member1=645,012<br>member2=979,934<br>member3=523,494 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 060656479.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 060656479.png | enemy | 861383, 347237, 295373 | 861383, 347237, 295373 | member1=861,383<br>member2=347,237<br>member3=295,373 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 060656479.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 060811830.png | self | 381943, 1103040, 811714 | 381943, 1103040, 811714 | member1=381,943<br>member2=1,103,040<br>member3=811,714 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 060811830.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 060811830.png | enemy | 599824, 532290, 702579 | 599824, 532290, 702579 | member1=599,824<br>member2=532,290<br>member3=702,579 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 060811830.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 060926190.png | self | 1077558, 683656, 125626 | 1077558, 683656, 125626 | member1=1,077,558<br>member2=683,656<br>member3=125,626 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 060926190.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 060926190.png | enemy | 652741, 180591, 631358 | 652741, 180591, 631358 | member1=652,741<br>member2=180,591<br>member3=631,358 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 060926190.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 061051531.png | self | 835404, 835996, 648980 | 835404, 835996, 648980 | member1=835,404<br>member2=835,996<br>member3=648,980 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 061051531.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 061051531.png | enemy | 410671, 349464, 1221547 | 410671, 349464, 1221547 | member1=410,671<br>member2=349,464<br>member3=1,221,547 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 061051531.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 061151691.png | self | 862800, 789450, 701079 | 862800, 789450, 701079 | member1=862,800<br>member2=789,450<br>member3=701,079 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 061151691.png-stage3-self/stage3-slot-geometry-diagnostics.json |
| スクリーンショット 2026-07-14 061151691.png | enemy | 713461, 147206, 227273 | 713461, 147206, 227273 | member1=713,461<br>member2=147,206<br>member3=227,273 | - | 0 | tmp/current-pc-stage3-slot-geometry-diagnostics/スクリーンショット 2026-07-14 061151691.png-stage3-enemy/stage3-slot-geometry-diagnostics.json |
| ... | ... | ... | ... | ... | ... | ... | 36 additional rows omitted from the markdown table; see summary JSON. |

## Concatenated Runs

Rows with concatenated or multi-slot runs: 116. These are not split or recovered. The JSON artifacts preserve raw text, full bbox, parsed numeric fragments, and whether the run spans multiple slots so a future design can tell geometry-backed evidence from guesswork.

## Simulation Decision

The runner-only `currentPcStage3GeometrySlotEvidenceSimulation` simulation is available, but final OCR output is unchanged. Production should remain blocked unless the simulation shows meaningful incremental TP, FP=0, no wrong-slot geometry assignments, exact observed member values, exact total evidence, crown-bonus consistency, and unique six-member interpretation.

Important limitation: this pass uses expected values as diagnostic targets for bbox span discovery. It measures whether exact values already present in OCR geometry can be spatially tied to slots; it does not prove that a production candidate selector can safely choose among all competing numeric evidence.

## Recommendation

Continue with diagnostics and browser-equivalent evidence comparison before productionization. Geometry can make slot provenance more explicit, but it must first prove zero wrong-slot assignments across the full current-PC fixture set and avoid concatenated/noisy multi-slot runs.
