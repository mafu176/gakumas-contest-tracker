# Current-PC Stage-Wide Solver Stage3 Variant Evidence

Generated: 2026-07-18T23:53:56.910Z

## Purpose

This runner-only report measures whether Stage3 member-row ROI/preprocessing variant OCR evidence can add useful exact member candidates to the existing current-PC stage-wide six-member solver.

The first broad variant-evidence experiment produced one false positive because row-order variant evidence assigned a 7-digit value to the wrong member slot while still satisfying the total equation. This follow-up experiment rejects row-order, taller, wider, shifted, and other ambiguous row-level evidence, allowing only explicit member-slot variant crops.

No production OCR output is changed.

## Command

`node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-slot-proven-variant-solver`

## Policy

- policy: `slot-proven-stage3-variant-evidence`
- slot-proven only: yes

## Strict Guards

- current-PC baseline only
- Stage3 variant evidence only; Stage1 and Stage2 candidate pools are unchanged
- exact numeric candidates only, limited to clean 7-digit member-like values
- candidate must come from an explicit slot ROI (`member1-slot`, `member2-slot`, or `member3-slot`)
- candidate must not come from bonus-only or total-only evidence
- all six member slots must have candidate evidence
- changed members must have non-selected member provenance
- both self and enemy exact total evidence must exist
- crown bonus is derived only by the confirmed `floor(max(all six members) * 0.20)` rule
- exactly one complete interpretation may satisfy the equations
- no filename, screenshot ID, hard-coded value, near-match, inferred digit, or total-derived member logic is used
- ambiguous row-order provenance is rejected even when totals and crown-bonus equations match

## Summary

| metric | count |
| --- | ---: |
| failing stages evaluated | 46 |
| TP stages | 14 |
| FP stages | 0 |
| FN stages | 3 |
| blocked stages | 41 |
| accepted stage corrections | 14 |
| accepted stage/side corrections | 14 |
| unique additions beyond current production | 2 |
| unique additions beyond existing stage-wide solver | 2 |
| accepted by exact equality | 13 |
| accepted only by within-one tolerance | 1 |

## Stage3 Self Impact

| metric | count |
| --- | ---: |
| remaining Stage3 self failures inspected | 24 |
| gained at least one exact variant candidate | 7 |
| gained all missing exact member evidence | 3 |
| uniquely solvable by strict guard | 2 |
| ambiguous with competing interpretations | 0 |
| still missing exact member evidence | 21 |
| projected Stage3 self recovery rate from this simulation | 2 / 24 (8.3%) |

## Variant Evidence Sources

| variant source | candidates added | candidates used in accepted changes |
| --- | ---: | ---: |
| member1-slot | 4 | 0 |
| member2-slot | 3 | 0 |
| member3-slot | 6 | 2 |

## Accepted TP Cases

| screenshot | stage | selected six members | proposed six members | changed member slots | variant candidates | rank-1 | winning side | derived bonus | total evidence | why unique |
| --- | ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| 2026-07-11_223152331.png | 3 | self 698916, 0, 0<br>enemy 115012, 1059979, 1525970 | self 808246, 698916, 1002601<br>enemy 115012, 1059979, 1525970 | self.member1: 698,916 -> 808,246 (member-row-token-order:808,246:comma-grouped; grouped-raw-parsed-member-token:808,246:comma-grouped; stage3-seven-digit-member-row-order:808246)<br>self.member2: - -> 698,916 (member-row-token-order:698,916:comma-grouped; grouped-raw-parsed-member-token:698,916:comma-grouped; stage3-seven-digit-member-row-order:698916)<br>self.member3: - -> 1,002,601 (stage3-member-row-variant:member3-slot:1002601) | self.member3 1,002,601 (member3-slot, slot token=1002601) | enemy.member3=1,525,970 | enemy | 305,194 | self: displayed-total-candidates<br>total-trace pass1 "+ A 2,509,764"<br>total-trace pass1 "2,509,764"<br>total-trace pass1 "2,509,764"<br>enemy: displayed-total-candidates<br>total-trace pass1 "> + VIN 3,006,155¢"<br>total-trace pass1 "- bh ALLE 3,006,155:"<br>total-trace pass1 "3,006,155: 115 121.059 9781 /R25 O07)" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-11_223753187.png | 1 | self 482143, 434415, 13190<br>enemy 497467, 180814, 141128 | self 482143, 434415, 659532<br>enemy 497467, 180814, 141128 | self.member3: 13,190 -> 659,532 (member-row-token-order:659,532:comma-grouped; grouped-raw-parsed-member-token:659,532:comma-grouped) | - | self.member3=659,532 | self | 131,906 | self: displayed-total-candidates<br>total-direct pass1 "© 1,707,996m"<br>total-trace pass1 "Yin + AC 1,707,996¢"<br>total-trace pass1 "WWI ME 1,707,996m"<br>enemy: displayed-total-candidates<br>total-direct pass1 "© 819,409"<br>total-trace pass1 "a4 * 819,409%"<br>total-trace pass1 ""819,409" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-11_223753187.png | 2 | self 237023, 284827, 479567<br>enemy 158516, 248983, 323424 | self 397838, 237023, 284827<br>enemy 158516, 248983, 323424 | self.member1: 237,023 -> 397,838 (member-row-token-order:397,838:comma-grouped; grouped-raw-parsed-member-token:397,838:comma-grouped)<br>self.member2: 284,827 -> 237,023 (member-row-token-order:237,023:comma-grouped; grouped-raw-parsed-member-token:237,023:comma-grouped)<br>self.member3: 479,567 -> 284,827 (member-row-token-order:284,827:comma-grouped; grouped-raw-parsed-member-token:284,827:comma-grouped) | - | self.member1=397,838 | self | 79,567 | self: displayed-total-candidates<br>total-trace pass1 "~~ 999,255x"<br>total-trace-token-audit pass1 "Vin vA 999.255m"<br>total-trace-token-audit pass1 "WLI oo 999.255m"<br>enemy: displayed-total-candidates<br>total-trace pass1 "= 730,923"<br>total-trace-token-audit pass1 "= 730,923"<br>total-trace-token-audit pass1 "730.9230" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-15_184125225.png | 1 | self 228420, 601624, 67279<br>enemy 393994, 0, 0 | self 228420, 601624, 67279<br>enemy 224956, 592786, 393994 | enemy.member1: 393,994 -> 224,956 (member-row-token-order:224.956:period-grouped; grouped-raw-eligible-grouped-member-token:224.956:period-grouped)<br>enemy.member2: - -> 592,786 (member-row-token-order:592,786:comma-grouped; grouped-raw-parsed-member-token:592,786:comma-grouped)<br>enemy.member3: - -> 393,994 (member-row-token-order:393,994:comma-grouped; grouped-raw-parsed-member-token:393,994:comma-grouped) | - | self.member2=601,624 | self | 120,324 | self: displayed-total-candidates<br>total-direct pass1 "1,017,647»"<br>total-trace pass1 "* A 1,017,647"<br>total-trace pass1 "1,017,647»"<br>enemy: displayed-total-candidates<br>total-trace pass1 "A * WALIN 1,211,736¢"<br>total-trace pass1 "wn 7 LEN 1,211,736"<br>total-trace pass1 "1,211,736" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-15_184133120.png | 2 | self 95338, 240099, 390975<br>enemy 431286, 294591, 36257 | self 95338, 240099, 390975<br>enemy 214812, 431286, 294591 | enemy.member1: 431,286 -> 214,812 (member-row-token-order:214.812:period-grouped; grouped-raw-eligible-grouped-member-token:214.812:period-grouped)<br>enemy.member2: 294,591 -> 431,286 (member-row-token-order:431,286:comma-grouped; grouped-raw-parsed-member-token:431,286:comma-grouped)<br>enemy.member3: 36,257 -> 294,591 (member-row-token-order:294,591:comma-grouped; grouped-raw-parsed-member-token:294,591:comma-grouped) | - | enemy.member2=431,286 | enemy | 86,257 | self: displayed-total-candidates<br>total-trace pass1 "Tr A 726,412"<br>total-trace pass1 "726,412"<br>total-trace-token-audit pass1 "Tr A 726,412"<br>enemy: displayed-total-candidates<br>total-trace pass1 "YF 4 a WWII 1,026,946¢"<br>total-trace pass1 "a bi E LR 1,026,946¢"<br>total-trace pass1 "1,026,946r" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-15_184150257.png | 3 | self 987319, 944097, 20098<br>enemy 918339, 605478, 440916 | self 987319, 944097, 1004934<br>enemy 918339, 605478, 440916 | self.member3: 20,098 -> 1,004,934 (stage3-member-row-variant:member3-slot:1004934) | self.member3 1,004,934 (member3-slot, slot token=1004934) | self.member3=1,004,934 | self | 200,986 | self: displayed-total-candidates<br>total-trace pass1 "WWII pad 3,137,336m"<br>total-trace pass1 "3,137,336m SAT 319 944.097 1.004.932."<br>total-trace-token-audit pass1 "WWII pad 3,137,336m"<br>enemy: displayed-total-candidates<br>total-trace pass1 "2+ 1,964,733"<br>total-trace pass1 "aT 1,964,733"<br>total-trace pass1 "1,964,733m" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-15_184158330.png | 2 | self 232588, 249323, 398240<br>enemy 227112, 429827, 221941 | self 232588, 249323, 398240<br>enemy 221941, 227112, 429827 | enemy.member1: 227,112 -> 221,941 (member-row-token-order:221,941:comma-grouped; grouped-raw-parsed-member-token:221,941:comma-grouped)<br>enemy.member2: 429,827 -> 227,112 (member-row-token-order:227,112:comma-grouped; grouped-raw-parsed-member-token:227,112:comma-grouped)<br>enemy.member3: 221,941 -> 429,827 (member-row-token-order:429,827:comma-grouped; grouped-raw-parsed-member-token:429,827:comma-grouped) | - | enemy.member3=429,827 | enemy | 85,965 | self: displayed-total-candidates<br>total-trace pass1 "Tr A 880,151x"<br>total-trace pass1 "880,151- aes EAR SAG ITT 2008 14D"<br>total-trace-token-audit pass1 "Tr A 880,151x"<br>enemy: displayed-total-candidates<br>total-trace pass1 "LT YVIN 964,845"<br>total-trace pass1 "oT A ELE 964,845"<br>total-trace pass1 "964,845p S94 0A 97977 A499 A500 BOT" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 144908802.png | 1 | self 711565, 317040, 142513<br>enemy 141683, 60043, 69402 | self 711565, 317040, 96328<br>enemy 141683, 60043, 69402 | self.member3: 142,513 -> 96,328 (member-row-token-order:96,328:comma-grouped; grouped-raw-parsed-member-token:96,328:comma-grouped) | - | self.member1=711,565 | self | 142,313 | self: displayed-total-candidates<br>total-direct pass1 ""1,267,246"<br>total-trace pass1 "WWI ME 1,267,246m"<br>total-trace pass1 ""1,267,246"<br>enemy: displayed-total-candidates<br>total-direct pass1 "© 271,128"<br>total-trace pass1 "a4 * 271,128"<br>total-trace pass1 "© 271,128" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 144958188.png | 2 | self 92704, 79726, 43333<br>enemy 532105, 110594, 106421 | self 92704, 79726, 43333<br>enemy 532105, 70029, 110594 | enemy.member2: 110,594 -> 70,029 (member-row-token-order:70,029:comma-grouped; grouped-raw-parsed-member-token:70,029:comma-grouped)<br>enemy.member3: 106,421 -> 110,594 (member-row-token-order:110,594:comma-grouped; grouped-raw-parsed-member-token:110,594:comma-grouped) | - | enemy.member1=532,105 | enemy | 106,421 | self: displayed-total-candidates<br>total-trace pass1 "Tr A 215,763m"<br>total-trace pass1 "215,763"<br>total-trace-token-audit pass1 "Tr A 215,763m"<br>enemy: displayed-total-candidates<br>total-trace pass1 "LT YVIN 819,149"<br>total-trace pass1 "ao 7 ELE 819,149"<br>total-trace pass1 "819,149:" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 145038835.png | 2 | self 116426, 147501, 284590<br>enemy 135158, 123945, 62475 | self 116426, 284590, 147501<br>enemy 135158, 123945, 62475 | self.member2: 147,501 -> 284,590 (member-row-token-order:284,590:comma-grouped; grouped-raw-parsed-member-token:284,590:comma-grouped)<br>self.member3: 284,590 -> 147,501 (member-row-token-order:147,501:comma-grouped; grouped-raw-parsed-member-token:147,501:comma-grouped) | - | self.member2=284,590 | self | 56,918 | self: displayed-total-candidates<br>total-trace pass1 "Vein vA 605,435"<br>total-trace pass1 "WLI oo 605,435"<br>total-trace pass1 "~~ 605,435m"<br>enemy: total-trace-token-audit pass1 "© 321 578m"<br>total-trace-token-audit pass1 "321 578s" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-14 060811830.png | 2 | self 73387, 189866, 3757<br>enemy 151269, 148369, 91726 | self 149692, 173387, 189866<br>enemy 151269, 148369, 91726 | self.member1: 73,387 -> 149,692 (member-row-token-order:149,692:comma-grouped; grouped-raw-parsed-member-token:149,692:comma-grouped)<br>self.member2: 189,866 -> 173,387 (member-row-token-order:173,387:comma-grouped; grouped-raw-parsed-member-token:173,387:comma-grouped)<br>self.member3: 3,757 -> 189,866 (member-row-token-order:189,866:comma-grouped; grouped-raw-parsed-member-token:189,866:comma-grouped) | - | self.member3=189,866 | self | 37,973 | self: displayed-total-candidates<br>total-trace pass1 "Vein vA 550,918"<br>total-trace pass1 "WLI oo 550,918"<br>total-trace-token-audit pass1 "Vein vA 550,918"<br>enemy: total-trace-token-audit pass1 "~ 391 364m"<br>total-trace-token-audit pass1 "391 364s" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-14 061051531.png | 2 | self 54367, 86076, 116705<br>enemy 76162, 60673, 49173 | self 154367, 86076, 116705<br>enemy 76162, 60673, 49173 | self.member1: 54,367 -> 154,367 (member-row-token-order:154,367:comma-grouped; grouped-raw-parsed-member-token:154,367:comma-grouped) | - | self.member1=154,367 | self | 30,873 | self: displayed-total-candidates<br>total-trace pass1 "Vein vA 388,021"<br>total-trace pass1 "WLI oo 388,021"<br>total-trace pass1 "388,021. AEA TET BE MATE A14& THE"<br>enemy: displayed-total-candidates<br>total-direct pass1 "186,008"<br>total-trace pass1 "& 186,008:"<br>total-trace pass1 "© 186,008" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-17 081532057.png | 1 | self 353959, 198784, 70791<br>enemy 215534, 189997, 187882 | self 353959, 323803, 198784<br>enemy 215534, 189997, 187882 | self.member2: 198,784 -> 323,803 (member-row-token-order:323.803:period-grouped; grouped-raw-eligible-grouped-member-token:323.803:period-grouped)<br>self.member3: 70,791 -> 198,784 (member-row-token-order:198,784:comma-grouped; grouped-raw-parsed-member-token:198,784:comma-grouped) | - | self.member1=353,959 | self | 70,791 | self: displayed-total-candidates<br>total-trace pass1 "YvilN + AC 947,337"<br>total-trace pass1 "WWI oo 947,337"<br>total-trace pass1 "947,337 nw"<br>enemy: displayed-total-candidates<br>total-trace pass1 "a4 * 593,413"<br>total-trace pass1 "593,413"<br>total-trace-token-audit pass1 "a4 * 593,413" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-17 081837850.png | 2 | self 146994, 108788, 6841<br>enemy 278748, 108951, 37535 | self 342056, 146994, 108788<br>enemy 278748, 108951, 37535 | self.member1: 146,994 -> 342,056 (member-row-token-order:342,056:comma-grouped; grouped-raw-parsed-member-token:342,056:comma-grouped)<br>self.member2: 108,788 -> 146,994 (member-row-token-order:146,994:comma-grouped; grouped-raw-parsed-member-token:146,994:comma-grouped)<br>self.member3: 6,841 -> 108,788 (member-row-token-order:108,788:comma-grouped; grouped-raw-parsed-member-token:108,788:comma-grouped) | - | self.member1=342,056 | self | 68,411 | self: displayed-total-candidates<br>total-direct pass1 "666,249"<br>total-trace pass1 "Vwi vA 666,249"<br>total-trace pass1 "WLI oo 666,249"<br>enemy: displayed-total-candidates<br>total-trace pass1 "& 425,234m"<br>total-trace pass1 "425,234m"<br>total-trace-token-audit pass1 "& 425,234m" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |

## True Incremental TP Cases

These rows require a Stage3 variant candidate that is not already enough under the existing production stage-wide solver.

| screenshot | stage | side | changed member slot | slot-proven variant source | value | total evidence | crown-bonus equation | why unique |
| --- | ---: | --- | --- | --- | ---: | --- | --- | --- |
| 2026-07-11_223152331.png | 3 | self | member3: - -> 1,002,601 | member3-slot | 1,002,601 | self: displayed-total-candidates<br>total-trace pass1 "+ A 2,509,764"<br>total-trace pass1 "2,509,764"<br>total-trace pass1 "2,509,764"<br>enemy: displayed-total-candidates<br>total-trace pass1 "> + VIN 3,006,155¢"<br>total-trace pass1 "- bh ALLE 3,006,155:"<br>total-trace pass1 "3,006,155: 115 121.059 9781 /R25 O07)" | self 808246, 698916, 1002601+0=2,509,763<br>enemy 115012, 1059979, 1525970+305,194=3,006,155<br>rank1 enemy.member3=1,525,970 | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-15_184150257.png | 3 | self | member3: 20,098 -> 1,004,934 | member3-slot | 1,004,934 | self: displayed-total-candidates<br>total-trace pass1 "WWII pad 3,137,336m"<br>total-trace pass1 "3,137,336m SAT 319 944.097 1.004.932."<br>total-trace-token-audit pass1 "WWII pad 3,137,336m"<br>enemy: displayed-total-candidates<br>total-trace pass1 "2+ 1,964,733"<br>total-trace pass1 "aT 1,964,733"<br>total-trace pass1 "1,964,733m" | self 987319, 944097, 1004934+200,986=3,137,336<br>enemy 918339, 605478, 440916+0=1,964,733<br>rank1 self.member3=1,004,934 | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |

## Runner / Browser-Equivalent Parity

| metric | count |
| --- | ---: |
| stages compared | 174 |
| TP parity exact | 14 / 14 |
| incremental TP parity exact | 2 / 2 |
| wouldApply disagreements | 0 |
| candidate-pool mismatches | 0 |
| slot-proven candidate mismatches | 0 |
| proposed six-member disagreements | 0 |
| proposed total disagreements | 0 |
| exact-vs-within-one decision disagreements | 0 |
| missing required browser evidence | 0 |
| missing required runner evidence | 0 |
| metadata-only mismatch rows | 0 |
| safety-relevant mismatch rows | 0 |

### Incremental TP Parity Rows

| screenshot | stage | runner apply | browser-equivalent apply | runner exact | runner within-one | slot candidates | mismatch fields |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223152331.png | 3 | yes | yes | no | yes | self:2:1002601:stage3-member-row-variant:member3-slot:member3-slot:slot | none |
| 2026-07-15_184150257.png | 3 | yes | yes | yes | yes | self:2:1004934:stage3-member-row-variant:member3-slot:member3-slot:slot | none |

### Parity Mismatches

No runner/browser-equivalent mismatches were found.

## Strict Exact-Only Simulation

| metric | within-one policy | strict exact-only policy |
| --- | ---: | ---: |
| TP | 14 | 13 |
| FP | 0 | 0 |
| FN | 3 | 4 |
| blocked | 41 | 41 |
| true incremental TP | 2 | 1 |
| Stage3 self incremental TP | 2 | 1 |

Strict exact-only loses the tolerance-dependent incremental recovery. This is safer for production unless the one-point discrepancy is independently proven to be deterministic and harmless.

## Blocked Breakdown

| reason | count |
| --- | ---: |
| no exact six-member equation | 44 |
| still missing exact member evidence | 37 |
| exact candidate exists but wrong/unknown slot provenance | 9 |
| missing exact enemy total evidence | 3 |
| missing exact self total evidence | 2 |

## False Positives

No false positives were found.


## Previous FP Recheck

| previous FP screenshot | stage | status under slot-proven policy | reason |
| --- | ---: | --- | --- |
| スクリーンショット 2026-07-14 061325391.png | 3 | rejected | still missing exact member evidence, no exact six-member equation |

## Representative Blocked Rows

| screenshot | stage | classification | reasons | rejection reasons | expected presence | variant candidates |
| --- | ---: | --- | --- | --- | --- | ---: |
| 2026-07-11_223346581.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-11_223426685.png | 2 | blocked | missing exact self total evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=yes<br>self=ok<br>enemy=ok | 0 |
| 2026-07-11_223426685.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-11_223513004.png | 2 | blocked | missing exact self total evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=yes<br>self=ok<br>enemy=ok | 0 |
| 2026-07-11_223513004.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-11_223613166.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation<br>exact candidate exists but wrong/unknown slot provenance | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 1 |
| 2026-07-11_223714046.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | missing-self-member3-candidate<br>no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-11_223753187.png | 3 | blocked | still missing exact member evidence<br>missing exact enemy total evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-11_223834078.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation<br>exact candidate exists but wrong/unknown slot provenance | missing-enemy-member3-candidate<br>no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 2 |
| 2026-07-11_223907986.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation<br>exact candidate exists but wrong/unknown slot provenance | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 1 |
| 2026-07-11_223950902.png | 1 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-11_223950902.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation<br>exact candidate exists but wrong/unknown slot provenance | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 1 |
| 2026-07-15_184109879.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-15_184117455.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | missing-self-member2-candidate<br>missing-self-member3-candidate<br>no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-15_184125225.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation<br>exact candidate exists but wrong/unknown slot provenance | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 1 |
| 2026-07-15_184133120.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-15_184158330.png | 1 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| 2026-07-15_184205486.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation<br>exact candidate exists but wrong/unknown slot provenance | missing-self-member3-candidate<br>no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 1 |
| 2026-07-15_184217948.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation<br>exact candidate exists but wrong/unknown slot provenance | missing-self-member3-candidate<br>no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 2 |
| スクリーンショット 2026-07-11 144932916.png | 2 | blocked | missing exact enemy total evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=yes<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-11 145018419.png | 2 | blocked | missing exact enemy total evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=yes<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-11 145018419.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-11 145152780.png | 1 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-11 145215861.png | 1 | false-negative | no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=yes<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-12 223719983.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-12 223746520.png | 2 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-14 060656479.png | 1 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-14 060656479.png | 2 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-14 061325391.png | 3 | blocked | still missing exact member evidence<br>no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=no<br>self=ok<br>enemy=ok | 0 |
| スクリーンショット 2026-07-14 061545315.png | 3 | false-negative | no exact six-member equation | no-complete-six-member-exact-total-interpretation | present=yes<br>self=ok<br>enemy=ok | 0 |

## Overlap

| recovery / simulation | overlapping accepted rows |
| --- | ---: |
| existing stage-wide solver | 12 |
| currentPcGroupedRawTokenRecovery | 1 |
| currentPcStage3SevenDigitBonusDisplacementRecovery | 1 |
| currentPcCrownBonusRuleRecovery | 0 |

## Recommendation

Do not productionize yet. Exact-only behavior is preferable for any future production candidate; a later production-readiness audit can focus only on the strict exact slot-proven TP rows.

This remains runner-only because the variant OCR evidence is generated by diagnostic crops/preprocessing variants under `tmp/`. Browser/UI parity is not proven for these extra candidates, and the current production path should not consume them until the evidence plumbing is shared and parity-checked.
