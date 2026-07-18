# Current-PC Stage-Wide Six-Member Candidate Solver

Generated: 2026-07-18T01:39:17.554Z

## Scope

- runner-only simulation: yes
- final OCR output changed: no
- production recovery added: no
- smartphone OCR changed: no
- legacy desktop OCR changed: no
- filename/stage-specific logic: no
- hard-coded score values: no
- near-match guessing or digit invention: no

## Candidate Source Design

The solver builds six member-slot candidate pools for each current-PC stage: self member1/2/3 and enemy member1/2/3. It then evaluates complete six-member interpretations against the confirmed crown-bonus rule and exact total evidence for both sides.

| source | used? | reason |
| --- | --- | --- |
| `selected-current-output` | yes | Retains already selected slot values; cannot be the only source for a changed member. |
| `member-row-token-order` | yes | Uses OCR tokens from the member-row crop in visual order as member-compatible slot evidence. |
| `member-row-number-order` | yes | Fallback for member-row parsed numbers when token audit did not expose ordered numeric tokens. |
| `grouped-raw-member-token-order` | yes | Uses punctuation/space grouped raw member tokens that existing grouped/raw evidence already marks as member-compatible. |
| `stage3-seven-digit-member-row-order` | yes | Uses existing Stage3 member-row evidence only as observed member-row candidates, not as arithmetic derivation. |
| `stage3-seven-digit-proposal-member` | yes | Carries observed member-row proposal members from the existing strict Stage3 simulation as candidate evidence. |
| slot-specific ROI diagnostics | no | Those candidates are produced only by an optional diagnostics pass and are not part of the normal current-PC baseline evidence. |
| total-only or bonus-only tokens as members | no | Tokens that only have total/bonus provenance are rejected as member candidates. |

## Strict Safety Guards

- One observed candidate is required for every one of the six member slots.
- Changed member slots must have non-selected member-compatible provenance.
- The solver never derives a missing member by subtraction from a total.
- The global rank-1 member among the six candidates must be unique.
- `crownBonus = floor(globalRank1 * 0.20)` determines the only bonus side.
- Both calculated side totals must have exact OCR total evidence.
- Exactly one complete six-member interpretation may satisfy the totals and bonus rule.
- No near values, digit repairs, or partial fragments are accepted.

## Summary

| metric | count |
| --- | ---: |
| current-PC stages evaluated | 174 |
| currently failing stages | 69 |
| currently failing stage/side rows | 79 |
| TP stages | 23 |
| FP stages | 0 |
| FN stages | 3 |
| blocked failing stages | 43 |
| accepted stage corrections | 23 |
| accepted stage/side corrections | 23 |
| unique additional recovery potential | 23 |

## Stage3 Self Impact

| metric | count |
| --- | ---: |
| current Stage3 self PASS | 24 / 58 |
| current Stage3 self FAIL | 34 / 58 |
| failures with exact wrong/missing member candidates in pool | 17 |
| uniquely solvable Stage3 self rows | 10 |
| remaining blocked Stage3 self rows | 24 |
| projected Stage3 self PASS if productionized | 34 / 58 (58.6%) |

## Accepted Cases By Position

| position | accepted stage/side rows |
| --- | ---: |
| Stage3 self | 10 |
| Stage2 self | 5 |
| Stage1 self | 3 |
| Stage2 enemy | 3 |
| Stage1 enemy | 1 |
| Stage3 enemy | 1 |

## Blocked Classification

| reason | stages |
| --- | ---: |
| no exact six-member equation | 46 |
| missing exact member evidence | 39 |
| missing exact enemy total evidence | 3 |
| missing exact self total evidence | 2 |

## Overlap With Existing Recoveries

| recovery / prior simulation | overlapping accepted stage/side rows |
| --- | ---: |
| `currentPcGroupedRawTokenRecovery` | 0 |
| `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery` | 0 |
| `applyCurrentPcCrownBonusRuleRecovery` | 0 |
| prior slot-specific ROI TP cases | 0 / 2 |

The accepted cases are evaluated after all current production recoveries. Any accepted row would be additional potential beyond the current production output.

## Accepted TP Cases

| screenshot | stage | selected six members | proposed six members | changed member slots and provenance | rank-1 | winning side | derived bonus | total evidence | why unique |
| --- | ---: | --- | --- | --- | --- | --- | ---: | --- | --- |
| 2026-07-11_223753187.png | 1 | self 482143, 434415, 13190<br>enemy 497467, 180814, 141128 | self 482143, 434415, 659532<br>enemy 497467, 180814, 141128 | self.member3: 13,190 -> 659,532 (member-row-token-order:659,532:comma-grouped; grouped-raw-parsed-member-token:659,532:comma-grouped) | self.member3=659,532 | self | 131,906 | self: displayed-total-candidates<br>total-direct pass1 "© 1,707,996m"<br>total-trace pass1 "Yin + AC 1,707,996¢"<br>total-trace pass1 "WWI ME 1,707,996m"<br>enemy: displayed-total-candidates<br>total-direct pass1 "© 819,409"<br>total-trace pass1 "a4 * 819,409%"<br>total-trace pass1 ""819,409" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-11_223753187.png | 2 | self 237023, 284827, 479567<br>enemy 158516, 248983, 323424 | self 397838, 237023, 284827<br>enemy 158516, 248983, 323424 | self.member1: 237,023 -> 397,838 (member-row-token-order:397,838:comma-grouped; grouped-raw-parsed-member-token:397,838:comma-grouped)<br>self.member2: 284,827 -> 237,023 (member-row-token-order:237,023:comma-grouped; grouped-raw-parsed-member-token:237,023:comma-grouped)<br>self.member3: 479,567 -> 284,827 (member-row-token-order:284,827:comma-grouped; grouped-raw-parsed-member-token:284,827:comma-grouped) | self.member1=397,838 | self | 79,567 | self: displayed-total-candidates<br>total-trace pass1 "~~ 999,255x"<br>total-trace-token-audit pass1 "Vin vA 999.255m"<br>total-trace-token-audit pass1 "WLI oo 999.255m"<br>enemy: displayed-total-candidates<br>total-trace pass1 "= 730,923"<br>total-trace-token-audit pass1 "= 730,923"<br>total-trace-token-audit pass1 "730.9230" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-15_184125225.png | 1 | self 228420, 601624, 67279<br>enemy 393994, 0, 0 | self 228420, 601624, 67279<br>enemy 224956, 592786, 393994 | enemy.member1: 393,994 -> 224,956 (member-row-token-order:224.956:period-grouped; grouped-raw-eligible-grouped-member-token:224.956:period-grouped)<br>enemy.member2: - -> 592,786 (member-row-token-order:592,786:comma-grouped; grouped-raw-parsed-member-token:592,786:comma-grouped)<br>enemy.member3: - -> 393,994 (member-row-token-order:393,994:comma-grouped; grouped-raw-parsed-member-token:393,994:comma-grouped) | self.member2=601,624 | self | 120,324 | self: displayed-total-candidates<br>total-direct pass1 "1,017,647»"<br>total-trace pass1 "* A 1,017,647"<br>total-trace pass1 "1,017,647»"<br>enemy: displayed-total-candidates<br>total-trace pass1 "A * WALIN 1,211,736¢"<br>total-trace pass1 "wn 7 LEN 1,211,736"<br>total-trace pass1 "1,211,736" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-15_184133120.png | 2 | self 95338, 240099, 390975<br>enemy 431286, 294591, 36257 | self 95338, 240099, 390975<br>enemy 214812, 431286, 294591 | enemy.member1: 431,286 -> 214,812 (member-row-token-order:214.812:period-grouped; grouped-raw-eligible-grouped-member-token:214.812:period-grouped)<br>enemy.member2: 294,591 -> 431,286 (member-row-token-order:431,286:comma-grouped; grouped-raw-parsed-member-token:431,286:comma-grouped)<br>enemy.member3: 36,257 -> 294,591 (member-row-token-order:294,591:comma-grouped; grouped-raw-parsed-member-token:294,591:comma-grouped) | enemy.member2=431,286 | enemy | 86,257 | self: displayed-total-candidates<br>total-trace pass1 "Tr A 726,412"<br>total-trace pass1 "726,412"<br>total-trace-token-audit pass1 "Tr A 726,412"<br>enemy: displayed-total-candidates<br>total-trace pass1 "YF 4 a WWII 1,026,946¢"<br>total-trace pass1 "a bi E LR 1,026,946¢"<br>total-trace pass1 "1,026,946r" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| 2026-07-15_184158330.png | 2 | self 232588, 249323, 398240<br>enemy 227112, 429827, 221941 | self 232588, 249323, 398240<br>enemy 221941, 227112, 429827 | enemy.member1: 227,112 -> 221,941 (member-row-token-order:221,941:comma-grouped; grouped-raw-parsed-member-token:221,941:comma-grouped)<br>enemy.member2: 429,827 -> 227,112 (member-row-token-order:227,112:comma-grouped; grouped-raw-parsed-member-token:227,112:comma-grouped)<br>enemy.member3: 221,941 -> 429,827 (member-row-token-order:429,827:comma-grouped; grouped-raw-parsed-member-token:429,827:comma-grouped) | enemy.member3=429,827 | enemy | 85,965 | self: displayed-total-candidates<br>total-trace pass1 "Tr A 880,151x"<br>total-trace pass1 "880,151- aes EAR SAG ITT 2008 14D"<br>total-trace-token-audit pass1 "Tr A 880,151x"<br>enemy: displayed-total-candidates<br>total-trace pass1 "LT YVIN 964,845"<br>total-trace pass1 "oT A ELE 964,845"<br>total-trace pass1 "964,845p S94 0A 97977 A499 A500 BOT" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 144908802.png | 1 | self 711565, 317040, 142513<br>enemy 141683, 60043, 69402 | self 711565, 317040, 96328<br>enemy 141683, 60043, 69402 | self.member3: 142,513 -> 96,328 (member-row-token-order:96,328:comma-grouped; grouped-raw-parsed-member-token:96,328:comma-grouped) | self.member1=711,565 | self | 142,313 | self: displayed-total-candidates<br>total-direct pass1 ""1,267,246"<br>total-trace pass1 "WWI ME 1,267,246m"<br>total-trace pass1 ""1,267,246"<br>enemy: displayed-total-candidates<br>total-direct pass1 "© 271,128"<br>total-trace pass1 "a4 * 271,128"<br>total-trace pass1 "© 271,128" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 144958188.png | 2 | self 92704, 79726, 43333<br>enemy 532105, 110594, 106421 | self 92704, 79726, 43333<br>enemy 532105, 70029, 110594 | enemy.member2: 110,594 -> 70,029 (member-row-token-order:70,029:comma-grouped; grouped-raw-parsed-member-token:70,029:comma-grouped)<br>enemy.member3: 106,421 -> 110,594 (member-row-token-order:110,594:comma-grouped; grouped-raw-parsed-member-token:110,594:comma-grouped) | enemy.member1=532,105 | enemy | 106,421 | self: displayed-total-candidates<br>total-trace pass1 "Tr A 215,763m"<br>total-trace pass1 "215,763"<br>total-trace-token-audit pass1 "Tr A 215,763m"<br>enemy: displayed-total-candidates<br>total-trace pass1 "LT YVIN 819,149"<br>total-trace pass1 "ao 7 ELE 819,149"<br>total-trace pass1 "819,149:" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 145038835.png | 2 | self 116426, 147501, 284590<br>enemy 135158, 123945, 62475 | self 116426, 284590, 147501<br>enemy 135158, 123945, 62475 | self.member2: 147,501 -> 284,590 (member-row-token-order:284,590:comma-grouped; grouped-raw-parsed-member-token:284,590:comma-grouped)<br>self.member3: 284,590 -> 147,501 (member-row-token-order:147,501:comma-grouped; grouped-raw-parsed-member-token:147,501:comma-grouped) | self.member2=284,590 | self | 56,918 | self: displayed-total-candidates<br>total-trace pass1 "Vein vA 605,435"<br>total-trace pass1 "WLI oo 605,435"<br>total-trace pass1 "~~ 605,435m"<br>enemy: total-trace-token-audit pass1 "© 321 578m"<br>total-trace-token-audit pass1 "321 578s" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 145038835.png | 3 | self 899855, 875583, 708660<br>enemy 201826, 63205, 12929 | self 899855, 1043301, 875583<br>enemy 201826, 63205, 12929 | self.member2: 875,583 -> 1,043,301 (member-row-token-order:1,043,301:comma-grouped; grouped-raw-parsed-member-token:1,043,301:comma-grouped; stage3-seven-digit-member-row-order:1043301)<br>self.member3: 708,660 -> 875,583 (member-row-token-order:875,583:comma-grouped; grouped-raw-parsed-member-token:875,583:comma-grouped; stage3-seven-digit-member-row-order:875583) | self.member2=1,043,301 | self | 208,660 | self: displayed-total-candidates<br>total-trace pass1 "WWII had 3,027,399"<br>total-trace pass1 "© 3,027,399"<br>total-trace pass1 "3,027,399 8049 E51 043.301 A275. 582"<br>enemy: displayed-total-candidates<br>total-direct pass1 "© 277,960"<br>total-trace pass1 "2+ 277,960"<br>total-trace pass1 "aT 277,960m" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 145126932.png | 3 | self 419172, 944928, 215037<br>enemy 21502, 46021, 58987 | self 1079689, 419172, 944928<br>enemy 21502, 46021, 58987 | self.member1: 419,172 -> 1,079,689 (member-row-token-order:1,079,689:comma-grouped; grouped-raw-parsed-member-token:1,079,689:comma-grouped; stage3-seven-digit-member-row-order:1079689)<br>self.member2: 944,928 -> 419,172 (member-row-token-order:419,172:comma-grouped; grouped-raw-parsed-member-token:419,172:comma-grouped; stage3-seven-digit-member-row-order:419172)<br>self.member3: 215,037 -> 944,928 (member-row-token-order:944,928:comma-grouped; grouped-raw-parsed-member-token:944,928:comma-grouped; stage3-seven-digit-member-row-order:944928) | self.member1=1,079,689 | self | 215,937 | self: displayed-total-candidates<br>total-trace pass1 "WWII pad 2,659,726w"<br>total-trace pass1 "© 2,659,726m"<br>total-trace pass1 "2,659,726m 1 079 689419172 Q9AA 928"<br>enemy: displayed-total-candidates<br>total-direct pass1 "© 126,510"<br>total-trace pass1 "2+ 126,510"<br>total-trace pass1 "aT 126,510k" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 145152780.png | 3 | self 877699, 744217, 175539<br>enemy 34917, 184256, 65797 | self 877699, 569560, 744217<br>enemy 34917, 184256, 65797 | self.member2: 744,217 -> 569,560 (member-row-token-order:569.560:period-grouped; grouped-raw-eligible-grouped-member-token:569.560:period-grouped)<br>self.member3: 175,539 -> 744,217 (member-row-token-order:744,217:comma-grouped; grouped-raw-parsed-member-token:744,217:comma-grouped) | self.member1=877,699 | self | 175,539 | self: displayed-total-candidates<br>total-trace pass1 "pA jin) had 2,367,015"<br>total-trace pass1 "© 2,367,015x"<br>total-trace pass1 "2,367,015x 877 699 REO REN TAA INT"<br>enemy: displayed-total-candidates<br>total-direct pass1 ""284,970"<br>total-trace pass1 "2+ 284,970k"<br>total-trace pass1 "aT 284,970¢" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-11 145215861.png | 3 | self 822138, 942720, 18854<br>enemy 21409, 66989, 56193 | self 822138, 287040, 942720<br>enemy 21409, 66989, 56193 | self.member2: 942,720 -> 287,040 (member-row-token-order:287.040:period-grouped; grouped-raw-eligible-grouped-member-token:287.040:period-grouped)<br>self.member3: 18,854 -> 942,720 (member-row-token-order:942,720:comma-grouped; grouped-raw-parsed-member-token:942,720:comma-grouped) | self.member3=942,720 | self | 188,544 | self: displayed-total-candidates<br>total-direct pass1 "© 2,240,442%"<br>total-trace pass1 "WWI had 2,240,442x"<br>total-trace pass1 "© 2,240,442%"<br>enemy: displayed-total-candidates<br>total-direct pass1 "~ 144,5910"<br>total-trace pass1 "2+ 144,591"<br>total-trace pass1 "aT 144,591m" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-12 223701314.png | 3 | self 763742, 237132, 716342<br>enemy 768325, 596720, 633894 | self 763742, 1081712, 237132<br>enemy 768325, 596720, 633894 | self.member2: 237,132 -> 1,081,712 (member-row-token-order:1,081,712:comma-grouped; grouped-raw-parsed-member-token:1,081,712:comma-grouped; stage3-seven-digit-member-row-order:1081712)<br>self.member3: 716,342 -> 237,132 (member-row-token-order:237,132:comma-grouped; grouped-raw-parsed-member-token:237,132:comma-grouped; stage3-seven-digit-member-row-order:237132) | self.member2=1,081,712 | self | 216,342 | self: displayed-total-candidates<br>total-trace pass1 "WWI had 2,298,928"<br>total-trace pass1 "© 2,298,928n"<br>total-trace pass1 "2,298,928m 763. 7A21.081.712 2%7 1312"<br>enemy: displayed-total-candidates<br>total-trace pass1 "2+ 1,998,939:"<br>total-trace pass1 "aT 1,998,939"<br>total-trace pass1 "1,998,939" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-14 060811830.png | 2 | self 73387, 189866, 3757<br>enemy 151269, 148369, 91726 | self 149692, 173387, 189866<br>enemy 151269, 148369, 91726 | self.member1: 73,387 -> 149,692 (member-row-token-order:149,692:comma-grouped; grouped-raw-parsed-member-token:149,692:comma-grouped)<br>self.member2: 189,866 -> 173,387 (member-row-token-order:173,387:comma-grouped; grouped-raw-parsed-member-token:173,387:comma-grouped)<br>self.member3: 3,757 -> 189,866 (member-row-token-order:189,866:comma-grouped; grouped-raw-parsed-member-token:189,866:comma-grouped) | self.member3=189,866 | self | 37,973 | self: displayed-total-candidates<br>total-trace pass1 "Vein vA 550,918"<br>total-trace pass1 "WLI oo 550,918"<br>total-trace-token-audit pass1 "Vein vA 550,918"<br>enemy: total-trace-token-audit pass1 "~ 391 364m"<br>total-trace-token-audit pass1 "391 364s" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-14 060926190.png | 3 | self 683656, 125626, 0<br>enemy 652741, 180591, 631358 | self 1077558, 683656, 125626<br>enemy 652741, 180591, 631358 | self.member1: 683,656 -> 1,077,558 (member-row-token-order:1,077,558:comma-grouped; grouped-raw-parsed-member-token:1,077,558:comma-grouped; stage3-seven-digit-member-row-order:1077558)<br>self.member2: 125,626 -> 683,656 (member-row-token-order:683,656:comma-grouped; grouped-raw-parsed-member-token:683,656:comma-grouped; stage3-seven-digit-member-row-order:683656)<br>self.member3: - -> 125,626 (member-row-token-order:125,626:comma-grouped; grouped-raw-parsed-member-token:125,626:comma-grouped; stage3-seven-digit-member-row-order:125626) | self.member1=1,077,558 | self | 215,511 | self: displayed-total-candidates<br>total-trace pass1 "pA Ie) Dad 2,102,351"<br>total-trace pass1 "© 2,102,351"<br>total-trace pass1 "2,102,351x 1 077.5858683 EEE 125 626"<br>enemy: displayed-total-candidates<br>total-trace pass1 "2+ 1,464,690:"<br>total-trace pass1 "aT 1,464,690k:"<br>total-trace pass1 "1,464,690k" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-14 061051531.png | 2 | self 54367, 86076, 116705<br>enemy 76162, 60673, 49173 | self 154367, 86076, 116705<br>enemy 76162, 60673, 49173 | self.member1: 54,367 -> 154,367 (member-row-token-order:154,367:comma-grouped; grouped-raw-parsed-member-token:154,367:comma-grouped) | self.member1=154,367 | self | 30,873 | self: displayed-total-candidates<br>total-trace pass1 "Vein vA 388,021"<br>total-trace pass1 "WLI oo 388,021"<br>total-trace pass1 "388,021. AEA TET BE MATE A14& THE"<br>enemy: displayed-total-candidates<br>total-direct pass1 "186,008"<br>total-trace pass1 "& 186,008:"<br>total-trace pass1 "© 186,008" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-15 130012999.png | 3 | self 835922, 826413, 278450<br>enemy 686707, 662075, 399656 | self 835922, 1392453, 826413<br>enemy 686707, 662075, 399656 | self.member2: 826,413 -> 1,392,453 (member-row-token-order:1,392,453:comma-grouped; grouped-raw-parsed-member-token:1,392,453:comma-grouped; stage3-seven-digit-member-row-order:1392453)<br>self.member3: 278,450 -> 826,413 (member-row-token-order:826,413:comma-grouped; grouped-raw-parsed-member-token:826,413:comma-grouped; stage3-seven-digit-member-row-order:826413) | self.member2=1,392,453 | self | 278,490 | self: displayed-total-candidates<br>total-trace pass1 "WWI had 3,333,278n"<br>total-trace pass1 "3,333,278n ebm] HH ale. BT lo BF Ir E=1."<br>total-trace pass1 "3,333,278n 835 0921 309% ART A?&.4132"<br>enemy: displayed-total-candidates<br>total-trace pass1 "2+ 1,748,438:"<br>total-trace pass1 "aT 1,748,438"<br>total-trace pass1 "1,748,438" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-15 130026795.png | 3 | self 938246, 505356, 0<br>enemy 826565, 339339, 257247 | self 1011663, 938246, 505356<br>enemy 826565, 339339, 257247 | self.member1: 938,246 -> 1,011,663 (member-row-token-order:1,011,663:comma-grouped; grouped-raw-parsed-member-token:1,011,663:comma-grouped; stage3-seven-digit-member-row-order:1011663)<br>self.member2: 505,356 -> 938,246 (member-row-token-order:938,246:comma-grouped; grouped-raw-parsed-member-token:938,246:comma-grouped; stage3-seven-digit-member-row-order:938246)<br>self.member3: - -> 505,356 (member-row-token-order:505,356:comma-grouped; grouped-raw-parsed-member-token:505,356:comma-grouped; stage3-seven-digit-member-row-order:505356) | self.member1=1,011,663 | self | 202,332 | self: displayed-total-candidates<br>total-trace pass1 "WWII Mad 2,657,597x"<br>total-trace pass1 "© 2,657,597"<br>total-trace pass1 "2,657,597 x 1011. 6632028 246 BOE AIRE"<br>enemy: displayed-total-candidates<br>total-trace pass1 "aT 1,423,151:"<br>total-trace pass1 "1,423,151 A726 {85 3209 339 IRT PAT"<br>total-trace-token-audit pass1 "aT 1,423,151:" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-16 063008443.png | 3 | self 899122, 957760, 190124<br>enemy 364529, 396783, 0 | self 899122, 957760, 190124<br>enemy 364529, 396783, 1125345 | enemy.member3: - -> 1,125,345 (member-row-token-order:1,125,345:comma-grouped; grouped-raw-parsed-member-token:1,125,345:comma-grouped; stage3-seven-digit-member-row-order:1125345) | enemy.member3=1,125,345 | enemy | 225,069 | self: displayed-total-candidates<br>total-trace pass1 "+ A 2,047,006k"<br>total-trace pass1 "2,047,006¢"<br>total-trace pass1 "2,047,006¢"<br>enemy: displayed-total-candidates<br>total-trace pass1 "> + VIN 2,111,726"<br>total-trace pass1 "- -dLLE 2,111,726¢"<br>total-trace pass1 "2,111,726," | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-16 063215708.png | 3 | self 713048, 759156, 0<br>enemy 898281, 712378, 463340 | self 713048, 1176566, 759156<br>enemy 898281, 712378, 463340 | self.member2: 759,156 -> 1,176,566 (stage3-seven-digit-member-row-order:1176566)<br>self.member3: - -> 759,156 (stage3-seven-digit-member-row-order:759156) | self.member2=1,176,566 | self | 235,313 | self: displayed-total-candidates<br>total-trace pass1 "WWI Mad 2,884,083"<br>total-trace pass1 "© 2,884,083"<br>total-trace pass1 "2,884,083 131 0A81. 176.866 THE 156"<br>enemy: displayed-total-candidates<br>total-trace pass1 "2+ 2,073,999"<br>total-trace pass1 "© 2,073,999"<br>total-trace-token-audit pass1 "2+ 2,073,999" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-17 081532057.png | 1 | self 353959, 198784, 70791<br>enemy 215534, 189997, 187882 | self 353959, 323803, 198784<br>enemy 215534, 189997, 187882 | self.member2: 198,784 -> 323,803 (member-row-token-order:323.803:period-grouped; grouped-raw-eligible-grouped-member-token:323.803:period-grouped)<br>self.member3: 70,791 -> 198,784 (member-row-token-order:198,784:comma-grouped; grouped-raw-parsed-member-token:198,784:comma-grouped) | self.member1=353,959 | self | 70,791 | self: displayed-total-candidates<br>total-trace pass1 "YvilN + AC 947,337"<br>total-trace pass1 "WWI oo 947,337"<br>total-trace pass1 "947,337 nw"<br>enemy: displayed-total-candidates<br>total-trace pass1 "a4 * 593,413"<br>total-trace pass1 "593,413"<br>total-trace-token-audit pass1 "a4 * 593,413" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-17 081731273.png | 3 | self 718662, 947903, 139580<br>enemy 202735, 133414, 351644 | self 718662, 947903, 547424<br>enemy 202735, 133414, 351644 | self.member3: 139,580 -> 547,424 (member-row-token-order:547.424:period-grouped; grouped-raw-eligible-grouped-member-token:547.424:period-grouped) | self.member2=947,903 | self | 189,580 | self: displayed-total-candidates<br>total-trace pass1 "WWI had 2,403,569"<br>total-trace pass1 "© 2,403,569"<br>total-trace pass1 "2,403,569 718 662 0AT7T 903 EAT AA"<br>enemy: displayed-total-candidates<br>total-direct pass1 "© 687,793"<br>total-trace pass1 "2+ 687,793"<br>total-trace pass1 "aT 687,793m" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |
| スクリーンショット 2026-07-17 081837850.png | 2 | self 146994, 108788, 6841<br>enemy 278748, 108951, 37535 | self 342056, 146994, 108788<br>enemy 278748, 108951, 37535 | self.member1: 146,994 -> 342,056 (member-row-token-order:342,056:comma-grouped; grouped-raw-parsed-member-token:342,056:comma-grouped)<br>self.member2: 108,788 -> 146,994 (member-row-token-order:146,994:comma-grouped; grouped-raw-parsed-member-token:146,994:comma-grouped)<br>self.member3: 6,841 -> 108,788 (member-row-token-order:108,788:comma-grouped; grouped-raw-parsed-member-token:108,788:comma-grouped) | self.member1=342,056 | self | 68,411 | self: displayed-total-candidates<br>total-direct pass1 "666,249"<br>total-trace pass1 "Vwi vA 666,249"<br>total-trace pass1 "WLI oo 666,249"<br>enemy: displayed-total-candidates<br>total-trace pass1 "& 425,234m"<br>total-trace pass1 "425,234m"<br>total-trace-token-audit pass1 "& 425,234m" | exactly one complete six-member interpretation satisfies both exact totals and the crown-bonus rule |

## False Positives

No false positives were found.


## Production Readiness Recommendation

Do not productionize yet. The next step should be shared runner/browser evidence parity for this exact stage-wide evidence schema.

If TP remains meaningful with FP = 0 after parity, a later production candidate would still need to prove that browser/UI state exposes the same member candidate pools and exact total evidence. If TP is low, the next better target is likely Stage3 self candidate-source capture or preprocessing/ROI improvement rather than a solver.
