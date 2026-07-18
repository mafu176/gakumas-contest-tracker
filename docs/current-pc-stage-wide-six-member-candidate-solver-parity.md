# Current-PC Stage-Wide Six-Member Candidate Solver Parity

Generated: 2026-07-18T01:39:17.557Z

## Purpose

This report checks that the runner and browser-equivalent paths can build the same evidence for the current-PC stage-wide six-member candidate solver. The solver remains evidence-only and does not change final OCR output.

## Shared Evidence Helper

- `buildCurrentPcStageWideSixMemberCandidateSolverEvidence(...)` in `app/lib/ocr.js`
- Inputs are post-production-recovery stage/side analyses for current-PC self and enemy rows.
- Outputs include selected values, six member-slot candidate pools, exact total evidence, valid interpretations, `wouldApply`, and rejection reasons.
- The browser/UI path records this evidence for diagnostics only; no stage result is rewritten by this solver.

## Parity Counts

| metric | count |
| --- | ---: |
| stages compared | 174 |
| solver TP stages | 23 |
| solver FP stages | 0 |
| solver FN stages | 3 |
| solver blocked stages | 43 |
| TP parity exact | 23 / 23 |
| wouldApply disagreements | 0 |
| proposed six-member disagreements | 0 |
| proposed bonus disagreements | 0 |
| proposed total disagreements | 0 |
| selected value disagreements | 0 |
| candidate-pool metadata mismatches | 0 |
| interpretation metadata mismatches | 0 |
| missing evidence in browser-equivalent | 0 |
| missing evidence in runner | 0 |
| metadata-only mismatch rows | 0 |
| safety-relevant mismatch rows | 0 |

## TP Parity Rows

| screenshot | stage | runner wouldApply | browser-equivalent wouldApply | proposed self | proposed enemy | mismatch fields | metadata mismatch fields |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223753187.png | 1 | yes | yes | 482143, 434415, 659532+131,906=1,707,996 | 497467, 180814, 141128+0=819,409 | none | none |
| 2026-07-11_223753187.png | 2 | yes | yes | 397838, 237023, 284827+79,567=999,255 | 158516, 248983, 323424+0=730,923 | none | none |
| 2026-07-15_184125225.png | 1 | yes | yes | 228420, 601624, 67279+120,324=1,017,647 | 224956, 592786, 393994+0=1,211,736 | none | none |
| 2026-07-15_184133120.png | 2 | yes | yes | 95338, 240099, 390975+0=726,412 | 214812, 431286, 294591+86,257=1,026,946 | none | none |
| 2026-07-15_184158330.png | 2 | yes | yes | 232588, 249323, 398240+0=880,151 | 221941, 227112, 429827+85,965=964,845 | none | none |
| スクリーンショット 2026-07-11 144908802.png | 1 | yes | yes | 711565, 317040, 96328+142,313=1,267,246 | 141683, 60043, 69402+0=271,128 | none | none |
| スクリーンショット 2026-07-11 144958188.png | 2 | yes | yes | 92704, 79726, 43333+0=215,763 | 532105, 70029, 110594+106,421=819,149 | none | none |
| スクリーンショット 2026-07-11 145038835.png | 2 | yes | yes | 116426, 284590, 147501+56,918=605,435 | 135158, 123945, 62475+0=321,578 | none | none |
| スクリーンショット 2026-07-11 145038835.png | 3 | yes | yes | 899855, 1043301, 875583+208,660=3,027,399 | 201826, 63205, 12929+0=277,960 | none | none |
| スクリーンショット 2026-07-11 145126932.png | 3 | yes | yes | 1079689, 419172, 944928+215,937=2,659,726 | 21502, 46021, 58987+0=126,510 | none | none |
| スクリーンショット 2026-07-11 145152780.png | 3 | yes | yes | 877699, 569560, 744217+175,539=2,367,015 | 34917, 184256, 65797+0=284,970 | none | none |
| スクリーンショット 2026-07-11 145215861.png | 3 | yes | yes | 822138, 287040, 942720+188,544=2,240,442 | 21409, 66989, 56193+0=144,591 | none | none |
| スクリーンショット 2026-07-12 223701314.png | 3 | yes | yes | 763742, 1081712, 237132+216,342=2,298,928 | 768325, 596720, 633894+0=1,998,939 | none | none |
| スクリーンショット 2026-07-14 060811830.png | 2 | yes | yes | 149692, 173387, 189866+37,973=550,918 | 151269, 148369, 91726+0=391,364 | none | none |
| スクリーンショット 2026-07-14 060926190.png | 3 | yes | yes | 1077558, 683656, 125626+215,511=2,102,351 | 652741, 180591, 631358+0=1,464,690 | none | none |
| スクリーンショット 2026-07-14 061051531.png | 2 | yes | yes | 154367, 86076, 116705+30,873=388,021 | 76162, 60673, 49173+0=186,008 | none | none |
| スクリーンショット 2026-07-15 130012999.png | 3 | yes | yes | 835922, 1392453, 826413+278,490=3,333,278 | 686707, 662075, 399656+0=1,748,438 | none | none |
| スクリーンショット 2026-07-15 130026795.png | 3 | yes | yes | 1011663, 938246, 505356+202,332=2,657,597 | 826565, 339339, 257247+0=1,423,151 | none | none |
| スクリーンショット 2026-07-16 063008443.png | 3 | yes | yes | 899122, 957760, 190124+0=2,047,006 | 364529, 396783, 1125345+225,069=2,111,726 | none | none |
| スクリーンショット 2026-07-16 063215708.png | 3 | yes | yes | 713048, 1176566, 759156+235,313=2,884,083 | 898281, 712378, 463340+0=2,073,999 | none | none |
| スクリーンショット 2026-07-17 081532057.png | 1 | yes | yes | 353959, 323803, 198784+70,791=947,337 | 215534, 189997, 187882+0=593,413 | none | none |
| スクリーンショット 2026-07-17 081731273.png | 3 | yes | yes | 718662, 947903, 547424+189,580=2,403,569 | 202735, 133414, 351644+0=687,793 | none | none |
| スクリーンショット 2026-07-17 081837850.png | 2 | yes | yes | 342056, 146994, 108788+68,411=666,249 | 278748, 108951, 37535+0=425,234 | none | none |

## Mismatch Rows

No runner/browser-equivalent mismatches were found.


## Production Recommendation

Parity is clean enough to attempt a later production-readiness audit, but this report does not productionize the solver.
