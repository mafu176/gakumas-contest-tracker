# Current-PC Latest Remaining Failure Reclassification

Generated: 2026-07-22

## Scope

- Codebase: latest production state at `dd9103e`, including `eb5c33b` side-local exact evidence recovery.
- Dataset scanned by the runner: 73 current-PC candidates.
- Expected fixtures counted for accuracy: 68.
- Unresolved scanned images without expected fixtures: 5; these are not included in PASS/FAIL counts.
- This is investigation-only. No production OCR output, smartphone OCR, or legacy desktop OCR was changed.
- No new runner-only simulation was added.

## Confirmed Latest Baseline

The full current-PC baseline completed successfully in this run.

| level | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| image | 31 | 37 | 68 | 45.6% |
| stage | 159 | 45 | 204 | 77.9% |
| stage/side row | 353 | 55 | 408 | 86.5% |

Remaining failing stage/side rows: **55**.

## Position Breakdown

| position | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| Stage1 self | 64 | 4 | 68 | 94.1% |
| Stage1 enemy | 62 | 6 | 68 | 91.2% |
| Stage2 self | 61 | 7 | 68 | 89.7% |
| Stage2 enemy | 64 | 4 | 68 | 94.1% |
| Stage3 self | 43 | 25 | 68 | 63.2% |
| Stage3 enemy | 59 | 9 | 68 | 86.8% |

Stage3 self is still the dominant weak point with 25 remaining failing rows. Stage3 enemy is the next largest current-PC position cluster with 9 failing rows.

## Field Failure Breakdown

A failing row can have multiple mismatching fields.

| field | failing rows with field mismatch |
| --- | ---: |
| member1 | 28 |
| member2 | 34 |
| member3 | 37 |
| anyMember | 51 |
| bonus | 39 |
| total | 43 |

Member errors still drive most remaining failures: 51 / 55 failing rows have at least one wrong member value. Bonus and total mismatches often accompany those member failures because current-PC totals depend on the exact six-member/crown-bonus equation.

## Structural Cluster Breakdown

Primary category is assigned once per failing stage/side row.

| primary category | rows |
| --- | ---: |
| K. 7-digit digit-drop / truncation | 19 |
| D. Exact members exist but multiple interpretations remain | 17 |
| C. Exact member exists but slot provenance unsafe | 5 |
| B. Partial / fragmented member evidence only | 5 |
| F. Members correct, bonus wrong/missing | 4 |
| J. Clean 7-digit member present but unselected | 4 |
| L. Small digit OCR error with no independent exact evidence | 1 |

Interpretation:

- The largest cluster is still 7-digit member evidence capture failure: digit-drop, truncation, partial fragments, or exact values absent from reliable slot evidence.
- The next major cluster is exact values present but unsafe to promote because the slot/order/provenance is not deterministic enough.
- The remaining bonus/total-only cluster is small after crown-bonus, exact-members, and side-local recoveries.
- The small-digit/near-value direction has only one remaining primary row and still lacks independent exact evidence, so it remains deferred.

## Selection vs Evidence Capture Split

| group | stage/side rows |
| --- | ---: |
| GROUP 1: correct mismatching value exists somewhere in OCR evidence but cannot safely be selected/promoted | 22 |
| GROUP 2: at least one mismatching value is absent as exact OCR evidence and needs better capture | 33 |

Member-value view:

| member evidence group | wrong member values |
| --- | ---: |
| exact expected member evidence present somewhere | 57 |
| exact expected member evidence absent | 42 |

This split is the main practical boundary: GROUP 1 may become selectable if a deterministic provenance signal appears, while GROUP 2 needs OCR/evidence capture improvements before a safe solver can help.

## Deferred Direction Recheck

| direction | latest evidence changed? | conclusion |
| --- | --- | --- |
| Stage3 slot-proven variant evidence | no material change | Still deferred. Previous slot-proven narrowing removed the FP but retained too little unique incremental value. |
| Stage3 geometry/bbox slot evidence | no material change | Still useful diagnostically, but not enough deterministic value for production selection. |
| Merged-run image splitting | no material change | Still deferred. It did not produce enough true incremental TP with zero wrong-slot risk. |
| Ambiguous exact-candidate promotion | no material change | Still unsafe. Exact values often exist, but row/order provenance is ambiguous. |
| Near-value repair | no material change | Still deferred. Numerical closeness is not independent evidence; no tolerance rule is recommended. |

## Top 3 Remaining Improvement Targets

| rank | target | affected rows | exact evidence | likely true incremental TP | FP risk | complexity | simulation recommendation |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| #1 | Stage3 7-digit member evidence capture / digit-drop reduction | 28 | mixed; many rows lack at least one exact member | unknown; likely requires better OCR evidence, not selection | medium until evidence provenance is deterministic | high | not yet; previous ROI/geometry/split experiments did not yield safe recurring incremental TP |
| #2 | Exact members present but interpretation/provenance remains ambiguous | 26 | yes for at least one/all wrong members | possible but blocked by slot/order ambiguity | medium/high based on previous false-positive from row-order evidence | medium | defer until a new deterministic provenance signal is found |
| #3 | Members-correct bonus/total-only rows | 4 | mostly yes for total/bonus | small; 4 rows remain after crown/side-local recoveries | low if a new proof exists, but no new shared proof yet | low/medium | not justified without a distinct proof beyond existing crown/side-local helpers |

## Recommended Single Next Task

Recommended next task: **current-PC Stage3 7-digit evidence capture quality audit focused on deterministic slot evidence, not another promotion rule.**

Rationale:

- It covers the largest remaining cluster: Stage3 member failures, especially 7-digit digit-drop/truncation and partial evidence.
- Existing exact-candidate promotion work has repeatedly hit provenance ambiguity; adding another selector without better evidence would likely repeat the same blocker.
- The useful next signal would be a deterministic way to capture exact slot-specific member OCR evidence for Stage3 rows, with wrong-slot count 0 and no value inference.

Do not productionize from this reclassification alone. A future simulation is justified only if a new evidence-capture path produces at least two expected-blind, slot-proven exact member recoveries with zero FP potential across all 68 fixtures.

## Remaining Failure Rows

| screenshot | row | expected | final production output | mismatching fields | primary category | group | production recoveries applied | missing exact evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223152331.png | S3 self | `808,246 / 698,916 / 1,002,602` + 0 = 2,509,764 | `698,916 / 0 / 0` + 109,330 = 808,246 | member1, member2, member3, bonus, total | C. Exact member exists but slot provenance unsafe | G2 capture/evidence | none | member3 |
| 2026-07-11_223346581.png | S3 self | `745,929 / 1,360,665 / 937,345` + 272,133 = 3,316,072 | `745,929 / 364,665 / 937,345` + 0 = 2,047,939 | member2, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member2 |
| 2026-07-11_223426685.png | S2 self | `401,629 / 286,311 / 563,518` + 112,703 = 1,364,161 | `401,629 / 286,311 / 563,518` + 11,270 = 1,262,728 | bonus, total | F. Members correct, bonus wrong/missing | G1 selection/promotion | none | none |
| 2026-07-11_223426685.png | S3 self | `903,425 / 1,262,179 / 859,213` + 252,435 = 3,277,252 | `262,179 / 859,213 / 252,435` + 0 = 1,373,827 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1, member2 |
| 2026-07-11_223513004.png | S2 self | `401,629 / 286,311 / 563,518` + 112,703 = 1,364,161 | `401,629 / 286,311 / 563,518` + 11,270 = 1,262,728 | bonus, total | F. Members correct, bonus wrong/missing | G1 selection/promotion | none | none |
| 2026-07-11_223513004.png | S3 self | `903,425 / 1,262,179 / 859,213` + 252,435 = 3,277,252 | `262,179 / 859,213 / 252,435` + 0 = 1,373,827 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1, member2 |
| 2026-07-11_223613166.png | S3 self | `717,313 / 846,891 / 1,121,803` + 0 = 2,686,007 | `717,313 / 846,891 / 0` + 1,121,803 = 2,686,007 | member3, bonus | J. Clean 7-digit member present but unselected | G1 selection/promotion | none | none |
| 2026-07-11_223613166.png | S3 enemy | `1,314,244 / 1,043,501 / 841,605` + 262,848 = 3,462,198 | `43,501 / 841,605 / 262,848` + 0 = 1,147,954 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member2 |
| 2026-07-11_223714046.png | S3 self | `795,562 / 1,237,121 / 1,256,926` + 251,385 = 3,540,994 | `795,562 / 25,138 / 0` + 2,720,294 = 3,540,994 | member2, member3, bonus | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member2, member3 |
| 2026-07-11_223753187.png | S3 self | `1,072,082 / 820,114 / 923,776` + 214,416 = 3,030,388 | `820,114 / 923,776 / 214,416` + 0 = 1,958,306 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1 |
| 2026-07-11_223834078.png | S3 self | `683,470 / 941,077 / 1,406,672` + 281,334 = 3,312,553 | `683,470 / 1,406 / 2,813` + 0 = 687,689 | member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member3, bonus |
| 2026-07-11_223834078.png | S3 enemy | `1,017,535 / 580,090 / 905,641` + 0 = 2,503,266 | `580,090 / 905,641 / 0` + 1,017,535 = 2,503,266 | member1, member2, member3, bonus | J. Clean 7-digit member present but unselected | G1 selection/promotion | none | none |
| 2026-07-11_223907986.png | S3 self | `875,583 / 930,873 / 1,130,649` + 226,129 = 3,163,234 | `875,583 / 930,873 / 22,612` + 0 = 1,829,068 | member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member3, bonus |
| 2026-07-11_223950902.png | S1 self | `440,366 / 382,382 / 545,988` + 109,197 = 1,477,933 | `440,366 / 382,382 / 545,983` + 10,919 = 1,379,650 | member3, bonus, total | D. Exact members exist but multiple interpretations remain | G2 capture/evidence | none | bonus |
| 2026-07-11_223950902.png | S3 enemy | `764,868 / 1,091,658 / 864,388` + 218,331 = 2,939,245 | `91,658 / 864,388 / 218,351` + 0 = 1,174,397 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1, member2, bonus |
| 2026-07-15_184109879.png | S3 enemy | `523,915 / 1,114,422 / 1,120,363` + 224,072 = 2,982,772 | `523,915 / 120,363 / 224,072` + 0 = 868,350 | member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member2, member3 |
| 2026-07-15_184117455.png | S3 self | `1,003,606 / 1,091,318 / 1,007,255` + 218,263 = 3,320,442 | `182,467 / 0 / 0` + 3,137,975 = 3,320,442 | member1, member2, member3, bonus | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1, member2, member3, bonus |
| 2026-07-15_184125225.png | S3 enemy | `1,098,592 / 1,043,851 / 344,952` + 219,718 = 2,707,113 | `43,851 / 344,952 / 219,718` + 0 = 608,521 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member2 |
| 2026-07-15_184133120.png | S3 self | `447,116 / 958,338 / 1,064,520` + 0 = 2,469,974 | `447,116 / 958,338 / 0` + 1,064,520 = 2,469,974 | member3, bonus | J. Clean 7-digit member present but unselected | G1 selection/promotion | none | none |
| 2026-07-15_184133120.png | S3 enemy | `833,676 / 589,174 / 1,352,747` + 270,549 = 3,046,146 | `333,676 / 589,174 / 270,549` + 0 = 1,193,399 | member1, member3, bonus, total | C. Exact member exists but slot provenance unsafe | G2 capture/evidence | none | member1 |
| 2026-07-15_184150257.png | S3 self | `987,319 / 944,097 / 1,004,934` + 200,986 = 3,137,336 | `987,319 / 944,097 / 20,098` + 0 = 1,951,514 | member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member3, bonus |
| 2026-07-15_184158330.png | S1 enemy | `560,330 / 194,288 / 349,031` + 112,066 = 1,215,715 | `960,330 / 194,258 / 349,031` + 112,066 = 1,615,685 | member1, member2, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| 2026-07-15_184205486.png | S3 self | `1,020,080 / 878,532 / 1,076,541` + 0 = 2,975,153 | `878,532 / 0 / 0` + 141,548 = 1,020,080 | member1, member2, member3, bonus, total | C. Exact member exists but slot provenance unsafe | G2 capture/evidence | none | member3 |
| 2026-07-15_184205486.png | S3 enemy | `881,533 / 1,196,781 / 974,861` + 239,356 = 3,292,531 | `196,781 / 974,861 / 239,356` + 56,331 = 1,467,329 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1, member2 |
| 2026-07-15_184217948.png | S3 self | `249,725 / 917,636 / 1,171,915` + 0 = 2,339,276 | `249,725 / 917,636 / 0` + 0 = 1,167,361 | member3, total | B. Partial / fragmented member evidence only | G2 capture/evidence | none | member3 |
| 2026-07-15_184217948.png | S3 enemy | `1,417,574 / 840,482 / 1,065,699` + 283,514 = 3,607,269 | `840,482 / 283,514 / 0` + 2,483,273 = 3,607,269 | member1, member2, member3, bonus | J. Clean 7-digit member present but unselected | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-11 145018419.png | S3 self | `756,719 / 867,029 / 805,828` + 173,405 = 2,602,981 | `756,719 / 867,029 / 5,828` + 173,405 = 1,802,981 | member3, total | B. Partial / fragmented member evidence only | G2 capture/evidence | none | member3 |
| スクリーンショット 2026-07-11 145152780.png | S1 enemy | `62,611 / 104,418 / 89,610` + 0 = 256,639 | `52,611 / 104,418 / 89,610` + 0 = 246,639 | member1, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-12 223719983.png | S3 self | `478,991 / 440,726 / 333,713` + 95,798 = 1,349,228 | `478,991 / 444,726 / 333,713` + 95,798 = 1,353,228 | member2, total | B. Partial / fragmented member evidence only | G2 capture/evidence | none | member2 |
| スクリーンショット 2026-07-12 223746520.png | S2 self | `317,640 / 167,543 / 76,281` + 63,528 = 624,992 | `317,640 / 76,281 / 63,528` + 0 = 457,449 | member2, member3, bonus, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-12 223746520.png | S2 enemy | `66,615 / 43,654 / 18,781` + 0 = 129,050 | `66,615 / 43,656 / 18,781` + 0 = 129,052 | member2, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-14 060656479.png | S1 self | `166,324 / 333,611 / 166,324` + 0 = 666,259 | `164,324 / 333,611 / 166,324` + 0 = 664,259 | member1, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-14 060656479.png | S1 enemy | `310,198 / 348,665 / 180,900` + 69,733 = 909,496 | `180,900 / 310,198 / 348,665` + 69,733 = 909,496 | member1, member2, member3 | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-14 060656479.png | S2 self | `147,170 / 116,778 / 147,255` + 29,451 = 440,654 | `147,170 / 116,778 / 147,265` + 0 = 411,213 | member3, bonus, total | D. Exact members exist but multiple interpretations remain | G2 capture/evidence | none | bonus |
| スクリーンショット 2026-07-14 061325391.png | S3 self | `1,033,971 / 1,191,935 / 883,071` + 238,387 = 3,347,364 | `191,935 / 883,071 / 738,387` + 0 = 1,813,393 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member2, bonus |
| スクリーンショット 2026-07-14 061634001.png | S3 self | `1,275,772 / 1,126,492 / 344,320` + 255,154 = 3,001,738 | `126,492 / 255,154 / 0` + 2,620,092 = 3,001,738 | member1, member2, member3, bonus | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1, member2 |
| スクリーンショット 2026-07-15 130019543.png | S1 enemy | `579,071 / 170,491 / 234,685` + 115,814 = 1,100,061 | `979,071 / 170,491 / 234,685` + 115,314 = 1,499,561 | member1, bonus, total | D. Exact members exist but multiple interpretations remain | G2 capture/evidence | none | bonus |
| スクリーンショット 2026-07-15 130026795.png | S2 self | `107,122 / 238,594 / 128,026` + 47,718 = 521,460 | `107,122 / 128,026 / 238,594` + 47,718 = 521,460 | member2, member3 | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-15 130026795.png | S2 enemy | `84,880 / 197,773 / 119,648` + 0 = 402,301 | `84,868 / 197,773 / 119,648` + 0 = 402,289 | member1, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-15 130038617.png | S3 self | `348,940 / 855,687 / 518,619` + 0 = 1,723,246 | `348,940 / 856,687 / 518,619` + 0 = 1,724,246 | member2, total | B. Partial / fragmented member evidence only | G2 capture/evidence | none | member2 |
| スクリーンショット 2026-07-16 062903692.png | S2 self | `249,565 / 253,334 / 42,767` + 50,666 = 596,332 | `253,334 / 42,767 / 50,666` + 0 = 346,767 | member1, member2, member3, bonus, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-16 062903692.png | S3 self | `721,210 / 1,162,325 / 933,236` + 232,465 = 3,049,236 | `162,325 / 933,236 / 232,465` + 0 = 1,328,026 | member1, member2, member3, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1, member2 |
| スクリーンショット 2026-07-16 063008443.png | S2 enemy | `87,574 / 148,001 / 160,468` + 0 = 396,043 | `87,567 / 148,001 / 160,468` + 0 = 396,036 | member1, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-16 063115987.png | S1 self | `322,660 / 198,361 / 153,346` + 64,532 = 738,899 | `322,660 / 198,361 / 153,346` + 0 = 674,367 | bonus, total | F. Members correct, bonus wrong/missing | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-16 063115987.png | S1 enemy | `99,187 / 74,052 / 88,480` + 0 = 261,719 | `99,187 / 74,052 / 388,430` + 0 = 561,669 | member3, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-16 063115987.png | S2 self | `203,712 / 141,269 / 151,188` + 40,742 = 536,911 | `203,712 / 141,269 / 151,188` + 0 = 496,169 | bonus, total | F. Members correct, bonus wrong/missing | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-16 063115987.png | S3 self | `1,147,085 / 1,065,321 / 932,605` + 229,417 = 3,374,428 | `932,605 / 9,417 / 0` + 2,432,406 = 3,374,428 | member1, member2, member3, bonus | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member1, member2, bonus |
| スクリーンショット 2026-07-16 063330034.png | S3 self | `1,035,782 / 1,182,459 / 1,015,625` + 236,491 = 3,470,357 | `236,491 / 0 / 0` + 3,233,866 = 3,470,357 | member1, member2, member3, bonus | C. Exact member exists but slot provenance unsafe | G2 capture/evidence | none | member2, member3 |
| スクリーンショット 2026-07-17 081731273.png | S2 enemy | `290,366 / 76,793 / 146,082` + 58,073 = 571,314 | `290,366 / 76,793 / 145,082` + 58,073 = 570,314 | member3, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-17 081921369.png | S1 self | `911,800 / 437,754 / 145,468` + 182,360 = 1,677,382 | `11,800 / 437,754 / 145,468` + 0 = 595,022 | member1, bonus, total | B. Partial / fragmented member evidence only | G2 capture/evidence | none | member1, bonus |
| スクリーンショット 2026-07-17 081921369.png | S3 self | `890,501 / 869,851 / 894,265` + 178,853 = 2,833,470 | `890,501 / 894,265 / 17,885` + 0 = 1,802,651 | member2, member3, bonus, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-17 081921369.png | S3 enemy | `378,443 / 697,055 / 463,041` + 0 = 1,538,539 | `378,443 / 697,065 / 463,041` + 0 = 1,538,549 | member2, total | L. Small digit OCR error with no independent exact evidence | G2 capture/evidence | none | member2 |
| スクリーンショット 2026-07-21 054816570.png | S1 enemy | `230,442 / 184,993 / 219,244` + 0 = 634,679 | `230,442 / 134,993 / 219,244` + 0 = 584,679 | member2, total | D. Exact members exist but multiple interpretations remain | G1 selection/promotion | none | none |
| スクリーンショット 2026-07-21 054837823.png | S3 self | `429,630 / 561,404 / 1,299,934` + 259,986 = 2,550,954 | `561,404 / 25,998 / 0` + 1,963,552 = 2,550,954 | member1, member2, member3, bonus | C. Exact member exists but slot provenance unsafe | G2 capture/evidence | none | member3, bonus |
| スクリーンショット 2026-07-21 054906218.png | S3 self | `706,926 / 1,046,567 / 609,489` + 209,313 = 2,572,295 | `706,926 / 46,567 / 609,489` + 0 = 1,362,982 | member2, bonus, total | K. 7-digit digit-drop / truncation | G2 capture/evidence | none | member2, bonus |
