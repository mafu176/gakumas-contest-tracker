# Current-PC Side-Local Incomplete Opposite Evidence Investigation

Generated: 2026-07-21T16:35:20.606Z

## Scope

- runner-only simulation added: yes
- final OCR output changed: no
- production recovery added: no
- smartphone OCR changed: no
- legacy desktop OCR changed: no
- filename/screenshot-specific logic: no
- hard-coded score values: no
- near-match, within-one, or inferred digit recovery: no
- member changes: not allowed

## Question

The existing exact-members crown-bonus total recovery still requires complete six-member evidence. This investigation checks whether a target side can be proven locally when the opposite side is incomplete.

The key distinction is:

- safe: opposite side incomplete, but the target side is independently provable
- unsafe: opposite side incomplete, and the target side merely seems plausible

## Side-Local Proof Categories

Accepted proof category in this run:

- `target-winning-by-opposite-total-upper-bound`: target members are unchanged, target max is unique, exact target total evidence exists, the opposite selected total has exact OCR evidence and is internally consistent, and `targetMax > oppositeTotal`. Because all opposite raw member scores must be non-negative and no opposite member can exceed its displayed total, the opposite side cannot contain rank 1.

Rejected/unused categories:

- `direct-displayed-bonus`: remained unavailable because the exact bonus was not captured as a clean bonus candidate in the candidate rows.
- `target-losing-by-opposite-member-exceeds-target-max`: no accepted row needed this shape.

## Summary

| metric | count |
| --- | ---: |
| failing stage/side rows | 58 |
| side-local candidate rows | 7 |
| TP | 3 |
| FP | 0 |
| FN | 4 |
| non-target blocked failing rows | 51 |
| true incremental TP beyond current production | 3 |
| potential full-image PASS gain | 3 |

## Accepted Rows

| screenshot | stage | side | proof | selected | expected | opposite selected | proposed | evidence | image would pass |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| スクリーンショット 2026-07-11 145215861.png | 1 | self | target-winning-by-opposite-total-upper-bound | members 433069, 362726, 149521; bonus 0; total 945,316 | members 433069, 362726, 149521; bonus 86,613; total 1,031,929 | members 147462, 98618, 34333; bonus 0; total 280,413 | members 433069, 362726, 149521; bonus 86,613; total 1,031,929 | targetTotalEvidence=displayedTotalCandidates, totalDirectText, totalTraceText1, totalTraceText2, totalTraceText3, totalTraceText4<br>targetBonusEvidence=none; derived from floor(targetMax * 0.20)<br>targetMax=433,069<br>oppositeTotalEvidence=displayedTotalCandidates, totalDirectText, totalTraceText1, totalTraceText2, totalTraceText3, totalTraceText4<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=(none)<br>currentCrownRejection=missing-enemy-member1-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-enemy-member1-evidence, missing-six-member-evidence | yes |
| スクリーンショット 2026-07-14 061545315.png | 3 | self | target-winning-by-opposite-total-upper-bound | members 810180, 535044, 909283; bonus 18,185; total 2,272,692 | members 810180, 535044, 909283; bonus 181,856; total 2,436,363 | members 121819, 148410, 526989; bonus 0; total 797,218 | members 810180, 535044, 909283; bonus 181,856; total 2,436,363 | targetTotalEvidence=displayedTotalCandidates, totalDirectText, totalTraceText1, totalTraceText2, totalTraceText3, totalTraceText4, totalTraceText5<br>targetBonusEvidence=none; derived from floor(targetMax * 0.20)<br>targetMax=909,283<br>oppositeTotalEvidence=displayedTotalCandidates, totalDirectText, totalTraceText1, totalTraceText2, totalTraceText3, totalTraceText4, totalTraceText5<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=(none)<br>currentCrownRejection=missing-enemy-member1-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-enemy-member1-evidence, missing-six-member-evidence | yes |
| スクリーンショット 2026-07-21 055104928.png | 3 | self | target-winning-by-opposite-total-upper-bound | members 619606, 617485, 774304; bonus 15,486; total 2,026,881 | members 619606, 617485, 774304; bonus 154,860; total 2,166,255 | members 144244, 58751, 453262; bonus 0; total 656,257 | members 619606, 617485, 774304; bonus 154,860; total 2,166,255 | targetTotalEvidence=displayedTotalCandidates, totalTraceText2, totalTraceText4, totalTraceText5<br>targetBonusEvidence=none; derived from floor(targetMax * 0.20)<br>targetMax=774,304<br>oppositeTotalEvidence=displayedTotalCandidates, totalDirectText, totalTraceText1, totalTraceText2, totalTraceText3, totalTraceText4, totalTraceText5<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=(none)<br>currentCrownRejection=missing-enemy-member1-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-enemy-member1-evidence, missing-six-member-evidence | yes |

## Rejected Candidate Rows

| screenshot | stage | side | selected | expected | opposite selected | rejection reasons | evidence |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223426685.png | 2 | self | members 401629, 286311, 563518; bonus 11,270; total 1,262,728 | members 401629, 286311, 563518; bonus 112,703; total 1,364,161 | members 201918, 279384, 206335; bonus 0; total 687,637 | no-side-local-proof<br>missing-target-exact-total-evidence<br>opposite-total-does-not-prove-target-rank1<br>opposite-observed-candidate-could-exceed-target-max<br>missing-opposite-member-above-target-max-evidence | targetMax=563,518<br>oppositeTotalEvidence=displayedTotalCandidates, totalDirectText, totalTraceText1, totalTraceText2, totalTraceText3, totalTraceText4<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=687637<br>currentCrownRejection=missing-self-exact-total-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-target-exact-total-evidence |
| 2026-07-11_223513004.png | 2 | self | members 401629, 286311, 563518; bonus 11,270; total 1,262,728 | members 401629, 286311, 563518; bonus 112,703; total 1,364,161 | members 201918, 279384, 206335; bonus 0; total 687,637 | no-side-local-proof<br>missing-target-exact-total-evidence<br>opposite-total-does-not-prove-target-rank1<br>opposite-observed-candidate-could-exceed-target-max<br>missing-opposite-member-above-target-max-evidence | targetMax=563,518<br>oppositeTotalEvidence=displayedTotalCandidates, totalDirectText, totalTraceText1, totalTraceText2, totalTraceText3, totalTraceText4<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=687637<br>currentCrownRejection=missing-self-exact-total-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-target-exact-total-evidence |
| スクリーンショット 2026-07-16 063115987.png | 1 | self | members 322660, 198361, 153346; bonus 0; total 674,367 | members 322660, 198361, 153346; bonus 64,532; total 738,899 | members 99187, 74052, 388430; bonus 0; total 561,669 | no-side-local-proof<br>missing-opposite-exact-total-evidence<br>opposite-total-does-not-prove-target-rank1<br>opposite-observed-candidate-could-exceed-target-max<br>missing-target-exact-total-evidence<br>side-already-matches-proposal | targetMax=322,660<br>oppositeTotalEvidence=none<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=388430<br>currentCrownRejection=missing-self-exact-total-evidence, missing-enemy-exact-total-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-target-exact-total-evidence, side-already-matches-proposal |
| スクリーンショット 2026-07-16 063115987.png | 2 | self | members 203712, 141269, 151188; bonus 0; total 496,169 | members 203712, 141269, 151188; bonus 40,742; total 536,911 | members 66102, 129559, 57325; bonus 0; total 252,986 | no-side-local-proof<br>opposite-total-does-not-prove-target-rank1<br>opposite-observed-candidate-could-exceed-target-max<br>missing-target-exact-total-evidence<br>missing-opposite-member-above-target-max-evidence<br>side-already-matches-proposal | targetMax=203,712<br>oppositeTotalEvidence=displayedTotalCandidates, totalDirectText, totalTraceText1, totalTraceText2, totalTraceText3, totalTraceText4<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=252986<br>currentCrownRejection=missing-enemy-member2-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-enemy-member2-evidence, missing-six-member-evidence |

## Blocked Breakdown

| reason | rows |
| --- | ---: |
| missing-target-exact-total-evidence | 4 |
| no-side-local-proof | 4 |
| opposite-observed-candidate-could-exceed-target-max | 4 |
| opposite-total-does-not-prove-target-rank1 | 4 |
| missing-opposite-member-above-target-max-evidence | 3 |
| side-already-matches-proposal | 2 |
| missing-opposite-exact-total-evidence | 1 |

## Position Breakdown

| position | accepted rows |
| --- | ---: |
| stage3-self | 2 |
| stage1-self | 1 |

## Comparison With Stage3 Capture Work

- This side-local direction recovers more incremental rows in simulation than the deferred single-TP Stage3 variant, geometry, or merged-run experiments.
- It does not repair missing members and does not improve member evidence quality.
- The FP risk is lower than noisy Stage3 member capture because the accepted proposal changes only bonus/total and requires exact target total evidence plus an upper-bound proof for the opposite side.

## Recommendation

Promising enough for a dedicated runner/browser-equivalent parity task next. Do not productionize until the same side-local evidence is shared with the browser path and parity is exact.
