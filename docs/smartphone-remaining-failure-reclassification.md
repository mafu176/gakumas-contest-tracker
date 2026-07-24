# Smartphone Remaining Failure Reclassification

Post-production state: `95face2 Recover smartphone crown bonus stage-wide scores`.

This audit uses the completed `tmp/smartphone-ocr-baseline-cache/` artifacts and reapplies the production smartphone crown-bonus and stage-wide six-member solver helpers in-memory. It does not rerun all OCR, does not change production behavior, and does not add a recovery.

## Summary

| metric | count |
| --- | ---: |
| expected smartphone fixtures | 89 |
| image PASS after latest production recoveries | 62 / 89 |
| stage PASS after latest production recoveries | 237 / 267 |
| stage/side PASS after latest production recoveries | 503 / 534 |
| remaining failing images | 27 |
| remaining failing stages | 30 |
| remaining failing stage/sides | 31 |

Primary classification:

| primary class | rows | notes |
| --- | ---: | --- |
| A. Selection failure | 26 | Exact member/bonus/total evidence exists somewhere, but current production cannot safely assemble/select it. |
| B. Capture failure | 0 primary | No row is purely absent-evidence; several rows have secondary capture gaps. |
| C. Fixture or interpretation issue | 0 | No fixture ambiguity found from cached evidence in this pass. |
| D. Downstream assembly issue | 5 | Members are already correct, but total/bonus selection remains off or exact total evidence is absent. |

Secondary evidence gaps:

| condition | rows |
| --- | ---: |
| all expected members present somewhere in current evidence | 28 |
| at least one expected member absent from current evidence | 3 |
| exact expected total present somewhere in current evidence | 20 |
| exact expected total absent from current evidence | 11 |
| exact expected bonus present or zero/no-bonus | 31 |
| all expected members and exact expected total present | 17 |
| all expected members present but exact expected total absent | 11 |
| missing member evidence but exact expected total present | 3 |

Hypothetical upper bounds:

| upper bound | rows | caveat |
| --- | ---: | --- |
| Selection-only maximum if all exact evidence could be safely disambiguated | 17 | All three expected members and exact total are present. This is not automatically safe because many rows have competing interpretations. |
| Requires new capture evidence for exact displayed total | 11 | Mostly Stage3 self total evidence missing from current total traces. |
| Requires new capture evidence for exact member values | 3 rows / 4 member values | `IMG_9308` S2 self and `IMG_9323` S3 self. |
| Blocked by ambiguity even with exact evidence | at least 14 | Wrong-slot, bonus-as-member, total-as-member, or shifted sparse-row shapes remain. |

## Position Breakdown

| position | failing rows |
| --- | ---: |
| Stage1 self | 3 |
| Stage1 enemy | 1 |
| Stage2 self | 7 |
| Stage2 enemy | 4 |
| Stage3 self | 12 |
| Stage3 enemy | 4 |

## Error-Shape Breakdown

Rows can have multiple shapes.

| shape | rows |
| --- | ---: |
| exact candidate exists but not selected | 10 |
| wrong small digit / wrong-slot value with same scale | 20 |
| bonus exact exists but not selected | 28 |
| exact total absent from current evidence | 11 |
| exact total exists but not selected | 15 |
| missing selected member despite exact evidence | 6 |
| 7-digit digit drop | 11 |
| exact member absent or only fragmented | 1 |

## Complete Failure Table

Evidence columns use `Y` when the exact expected value appears somewhere in existing smartphone-native cached evidence, including selected values, raw member candidates, total traces, and cached solver candidate pools.

| image | stage | side | wrong fields | expected | actual | member evidence | bonus/total evidence | primary | shapes |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| IMG_8944 | S2 | self | member2, member3, bonus | 104457/50805/501796 +100359 = 757417 | 104457/501796/100359 +50805 = 757417 | 104457:Y<br>50805:Y<br>501796:Y | bonus Y; total Y | selection failure | exact exists but not selected; wrong small digit; bonus exact exists but not selected |
| IMG_9084 | S3 | self | bonus, total | 200294/379028/382431 +76486 = 1038239 | 200294/379028/382431 +76506 = 1038259 | 200294:Y<br>379028:Y<br>382431:Y | bonus Y; total N | downstream assembly issue | bonus exact exists but not selected; total exact absent |
| IMG_9086 | S3 | self | member1, member2, member3 | 264954/196342/293209 +58641 = 813146 | 196342/293209/264954 +58641 = 813146 | 264954:Y<br>196342:Y<br>293209:Y | bonus Y; total Y | selection failure | wrong small digit |
| IMG_8951 | S3 | enemy | member3, bonus, total | 18338/52841/72101 +0 = 143280 | 18338/52841/0 +922 = 72101 | 18338:Y<br>52841:Y<br>72101:Y | bonus Y; total Y | selection failure | missing selected member despite exact evidence; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9125 | S1 | enemy | member1, member2, member3, bonus, total | 60325/32993/26655 +0 = 119973 | 32993/26655/0 +677 = 60325 | 60325:Y<br>32993:Y<br>26655:Y | bonus Y; total Y | selection failure | wrong small digit; missing selected member despite exact evidence; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9152 | S2 | enemy | member2, member3, bonus, total | 123247/207281/106217 +41456 = 478201 | 123247/41456/42400 +178 = 207281 | 123247:Y<br>207281:Y<br>106217:Y | bonus Y; total Y | selection failure | exact exists but not selected; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9158 | S2 | self | bonus, total | 112317/136991/162992 +32598 = 444898 | 112317/136991/162992 +31770 = 444070 | 112317:Y<br>136991:Y<br>162992:Y | bonus Y; total Y | downstream assembly issue | bonus exact exists but not selected; total exact exists but not selected |
| IMG_9161 | S2 | self | member1, member2, member3, bonus, total | 61301/197199/100135 +39439 = 398074 | 77477/59459/59439 +824 = 197199 | 61301:Y<br>197199:Y<br>100135:Y | bonus Y; total Y | selection failure | wrong small digit; exact exists but not selected; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9163 | S1 | self | bonus, total | 544861/0/0 +108972 = 653833 | 544861/0/0 +108974 = 653835 | 544861:Y<br>0<br>0 | bonus Y; total Y | selection failure | bonus exact exists but not selected; total exact exists but not selected |
| IMG_9264 | S2 | self | member2, member3, bonus | 638016/1009315/755237 +0 = 2402568 | 638016/755237/0 +1009315 = 2402568 | 638016:Y<br>1009315:Y<br>755237:Y | bonus Y; total Y | selection failure | 7-digit digit drop; missing selected member despite exact evidence; bonus exact exists but not selected |
| IMG_9281 | S3 | enemy | bonus, total | 343001/343056/257235 +68611 = 1011903 | 343001/343056/257235 +68613 = 1011905 | 343001:Y<br>343056:Y<br>257235:Y | bonus Y; total N | downstream assembly issue | bonus exact exists but not selected; total exact absent |
| IMG_9308 | S2 | self | member1, member2, member3, bonus, total | 1020198/1200635/518149 +240127 = 2979109 | 200635/518149/240127 +0 = 958911 | 1020198:N<br>1200635:N<br>518149:Y | bonus Y; total Y | selection failure | 7-digit digit drop; wrong small digit; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9309 | S1 | self | bonus, total | 415986/394090/230502 +83197 = 1123775 | 415986/394090/230502 +85197 = 1125775 | 415986:Y<br>394090:Y<br>230502:Y | bonus Y; total N | downstream assembly issue | bonus exact exists but not selected; total exact absent |
| IMG_9310 | S3 | self | bonus, total | 212343/410425/48140 +82085 = 752993 | 212343/410425/48140 +0 = 670908 | 212343:Y<br>410425:Y<br>48140:Y | bonus Y; total N | downstream assembly issue | bonus exact exists but not selected; total exact absent |
| IMG_9310 | S3 | enemy | member1, member2, member3, bonus, total | 113556/58192/54710 +0 = 226458 | 58192/54710/0 +654 = 113556 | 113556:Y<br>58192:Y<br>54710:Y | bonus Y; total Y | selection failure | exact exists but not selected; wrong small digit; missing selected member despite exact evidence; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9315 | S3 | self | member3, bonus, total | 899249/252319/1026470 +205294 = 2383332 | 899249/252319/205294 +20529 = 1377391 | 899249:Y<br>252319:Y<br>1026470:Y | bonus Y; total N | selection failure | 7-digit digit drop; bonus exact exists but not selected; total exact absent |
| IMG_9316 | S3 | self | member1, member2, member3, bonus, total | 1273010/696275/382517 +254602 = 2606404 | 696275/382517/254602 +0 = 1333394 | 1273010:Y<br>696275:Y<br>382517:Y | bonus Y; total N | selection failure | 7-digit digit drop; wrong small digit; bonus exact exists but not selected; total exact absent |
| IMG_9317 | S3 | self | member1, member2, member3, bonus, total | 1060079/276500/804645 +212015 = 2353239 | 276500/804645/212015 +0 = 1293160 | 1060079:Y<br>276500:Y<br>804645:Y | bonus Y; total N | selection failure | 7-digit digit drop; wrong small digit; bonus exact exists but not selected; total exact absent |
| IMG_9318 | S3 | self | member1, member2, member3, bonus, total | 1001405/812662/938864 +200281 = 2953212 | 812662/938864/200281 +0 = 1951807 | 1001405:Y<br>812662:Y<br>938864:Y | bonus Y; total N | selection failure | 7-digit digit drop; wrong small digit; bonus exact exists but not selected; total exact absent |
| IMG_9319 | S2 | enemy | member1, member2, member3, bonus, total | 11845/16081/11316 +0 = 39242 | 39242/111845/16081 +11316 = 178484 | 11845:Y<br>16081:Y<br>11316:Y | bonus Y; total Y | selection failure | wrong small digit; exact exists but not selected; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9320 | S2 | enemy | member2, member3, bonus | 8192/167910/29870 +33582 = 239554 | 8192/29870/33582 +167910 = 239554 | 8192:Y<br>167910:Y<br>29870:Y | bonus Y; total Y | selection failure | exact exists but not selected; wrong small digit; bonus exact exists but not selected |
| IMG_9323 | S2 | self | member1, member2, member3, total | 256014/231609/16800 +51202 = 555625 | 235625/256014/231609 +51202 = 774450 | 256014:Y<br>231609:Y<br>16800:Y | bonus Y; total Y | selection failure | wrong small digit; exact exists but not selected; total exact exists but not selected |
| IMG_9323 | S3 | self | member1, member2, member3, bonus, total | 1165937/1007981/1093402 +233187 = 3500507 | 233187/70650/0 +789565 = 1093402 | 1165937:N<br>1007981:N<br>1093402:Y | bonus Y; total Y | selection failure | 7-digit digit drop; exact absent or fragmented; missing selected member despite exact evidence; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9324 | S3 | self | member1, member2, member3, bonus, total | 1065816/436774/942493 +213163 = 2658246 | 436774/942493/213163 +0 = 1592430 | 1065816:Y<br>436774:Y<br>942493:Y | bonus Y; total N | selection failure | 7-digit digit drop; wrong small digit; bonus exact exists but not selected; total exact absent |
| IMG_9328 | S3 | self | member2, member3, bonus, total | 899855/1043301/875583 +208660 = 3027399 | 899855/875583/208660 +0 = 1984098 | 899855:Y<br>1043301:Y<br>875583:Y | bonus Y; total N | selection failure | 7-digit digit drop; wrong small digit; bonus exact exists but not selected; total exact absent |
| IMG_9333 | S2 | self | member1, member2, member3, bonus, total | 135160/39827/191225 +0 = 366212 | 360212/135160/39827 +191225 = 726424 | 135160:Y<br>39827:Y<br>191225:Y | bonus Y; total Y | selection failure | wrong small digit; exact exists but not selected; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9333 | S3 | enemy | member2, member3, bonus, total | 435116/624040/393112 +124808 = 1577076 | 435116/124808/64998 +0 = 624040 | 435116:Y<br>624040:Y<br>393112:Y | bonus Y; total Y | selection failure | wrong small digit; exact exists but not selected; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9335 | S2 | enemy | member1, member2, member3 | 224651/228553/264964 +52992 = 771160 | 264964/224651/228553 +52992 = 771160 | 224651:Y<br>228553:Y<br>264964:Y | bonus Y; total Y | selection failure | wrong small digit |
| IMG_9336 | S3 | self | member1, member2, member3, bonus, total | 1029078/505711/672417 +205815 = 2413021 | 505711/672417/205815 +58615 = 1442558 | 1029078:Y<br>505711:Y<br>672417:Y | bonus Y; total N | selection failure | 7-digit digit drop; wrong small digit; bonus exact exists but not selected; total exact absent |
| IMG_9337 | S1 | self | member1, member2, member3, bonus, total | 85668/377010/132698 +0 = 595376 | 295576/85668/377010 +132698 = 890952 | 85668:Y<br>377010:Y<br>132698:Y | bonus Y; total Y | selection failure | exact exists but not selected; wrong small digit; bonus exact exists but not selected; total exact exists but not selected |
| IMG_9337 | S3 | self | member1, member2, member3, bonus, total | 1016790/573428/573265 +0 = 2163483 | 573428/573265/0 +958792 = 2105485 | 1016790:Y<br>573428:Y<br>573265:Y | bonus Y; total Y | selection failure | 7-digit digit drop; wrong small digit; missing selected member despite exact evidence; bonus exact exists but not selected; total exact exists but not selected |

## Capture Audit

The largest capture gap is not member evidence. Exact expected members are already present for 28 of 31 failing rows. The stronger capture gap is exact displayed total evidence, absent in 11 rows:

- Stage3 self: 9 rows
- Stage3 enemy: 1 row
- Stage1 self: 1 row

Rows with missing exact member evidence:

| image | stage | side | missing exact members | source-pixel observation |
| --- | ---: | --- | --- | --- |
| IMG_9308 | S2 | self | 1020198, 1200635 | Source screenshot visibly contains `1,020,198` and `1,200,635`, but they are tightly adjacent and current evidence keeps only dropped/near values such as `200635`. |
| IMG_9323 | S3 | self | 1165937, 1007981 | Source screenshot visibly contains a dense Stage3 self row with `1,165,937`, `1,007,981`, `1,093,402`; current evidence lacks the first two clean exact values. |

Likely capture causes:

- tightly packed 7-digit Stage3/member-row text
- comma/punctuation and adjacent member merging
- narrow or vertically imperfect row capture
- total crop/trace OCR missing exact displayed total, especially Stage3 self
- bonus/member displacement where the blue crown bonus is selected as a member

## Known Unresolved Controls

`IMG_9308`: Stage2 self remains unresolved. It is a mixed capture/selection failure: exact total and bonus evidence exist, but two 7-digit members are absent as clean exact candidates. The source screenshot shows the digits, so a better member-row or per-slot capture experiment is needed.

`IMG_9310`: Stage3 self has correct members and bonus evidence but missing exact total evidence. Stage3 enemy has all exact members and exact total evidence, but the selected total is member1 and the row is sparse-shifted. This remains a selection/assembly problem, not a crown-rule problem.

`IMG_9319`: Stage2 enemy has all exact expected values somewhere in evidence, but the selected row is shifted and polluted by `111845` / bonus-as-member style evidence. This is selection failure with exact evidence, not capture failure.

## Ranked Generalized Experiment Candidates

| rank | experiment | estimated affected rows | expected exact-value gain | risk | runtime cost | scope |
| ---: | --- | ---: | ---: | --- | --- | --- |
| 1 | Smartphone displayed-total ROI/preprocessing variants, focused on Stage3 total crops | 11 | up to 11 exact totals | Low to measurable, if runner-only and exact-evidence only | Moderate | Smartphone-general with Stage3 emphasis |
| 2 | Smartphone per-slot/overlapping member-row crops for tightly packed 7-digit rows | 3 rows / 4 missing member values | at least 4 clean member candidates if OCR improves | Measurable; wrong-slot risk must be audited | Moderate to high | Smartphone-general, strongest for Stage2/Stage3 dense rows |
| 3 | Runner-only exact-evidence row assembly audit using existing candidate pools | 17 | no new capture, but could prove some selection fixes | Medium; competing interpretations are common | Low | Smartphone-general |
| 4 | Merged-run image-space splitting for smartphone member rows | 2-4 likely values | Wrong-slot and segmentation risk | High | High | Narrowly useful for dense 7-digit rows |
| 5 | Alternate grayscale/non-binarized OCR pass for member and total rows | Unknown, likely overlaps 1 and 2 | Could expose both totals and members | Needs FP measurement | High | Smartphone-general |

## Recommendation

Recommended next experiment: runner-only smartphone displayed-total ROI/preprocessing diagnostics, with Stage3 total crops first.

Why this is the best next step:

- It targets the largest exact-evidence capture gap: 11 rows with exact total absent.
- Nine of those are Stage3 self, so the pattern is concentrated enough to measure.
- Many affected rows already have all three member values and exact bonus evidence, so adding exact total evidence could unblock strict equation-based simulations without inventing members.
- It is lower risk than member-row splitting because total evidence has one target value per side rather than three slot assignments.

Do not productionize from this report. The next task should be runner-only diagnostics that saves total ROI variants, OCR text, parsed exact totals, and false-positive counts across all 89 smartphone fixtures.
