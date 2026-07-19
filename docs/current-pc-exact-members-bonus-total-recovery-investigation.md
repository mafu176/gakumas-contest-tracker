# Current-PC Exact Members Bonus/Total Recovery Investigation

Generated: 2026-07-19T17:20:19.391Z

## Scope

- runner-only simulation: yes
- final OCR output changed: no
- production recovery added: no
- smartphone OCR changed: no
- legacy desktop OCR changed: no
- filename/screenshot-specific logic: no
- exact equality only: yes
- within-one tolerance or near-match guessing: no
- member changes: not allowed

## Guard Shape

The simulation targets rows where the current production output still fails even though the target side's three final selected members already exactly match the expected fixture.

A side-local correction is accepted only when:

- all three target-side members are unchanged
- all six selected member slots have exact member evidence in the shared crown-bonus evidence
- the global rank-1 member is unique
- the crown bonus is derived from `floor(max(all six selected members) * 0.20)`
- exact target-side total OCR evidence exists
- the target-side proposed total equation is exact
- no existing production recovery has already applied to that row

Unlike the existing full-stage crown-bonus recovery, this side-local simulation does not require exact total evidence for the opposite side. It still requires reliable six-member evidence, so rows with missing opposite member evidence remain blocked.

## Summary

| metric | count |
| --- | ---: |
| failing stage/side rows | 56 |
| exact-member bonus/total target rows | 8 |
| TP | 2 |
| FP | 0 |
| FN | 6 |
| non-target blocked failing rows | 48 |
| true incremental TP beyond current production | 2 |
| image-level full PASS gain if applied | 1 |

## Runner / Browser-Equivalent Parity

| metric | count |
| --- | ---: |
| rows compared | 348 |
| runner wouldApply | 2 |
| browser-equivalent wouldApply | 2 |
| TP parity exact | 2 / 2 |
| wouldApply disagreements | 0 |
| member disagreements | 0 |
| global rank-1 disagreements | 0 |
| derived bonus disagreements | 0 |
| target total proposal disagreements | 0 |
| exact target total evidence mismatches | 0 |
| missing required browser evidence | 0 |
| missing required runner evidence | 0 |
| safety-relevant mismatches | 0 |

### Parity Rows

| screenshot | stage | side | runner apply | browser-equivalent apply | rank1 | proposed target side | mismatch fields |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| スクリーンショット 2026-07-11 144932916.png | 2 | self | yes | yes | self.member1 221,508 | 221508, 128329, 176419 + 44,301 = 570,557 | none |
| スクリーンショット 2026-07-11 145018419.png | 2 | self | yes | yes | self.member1 262,782 | 262782, 104193, 143648 + 52,556 = 563,179 | none |

## Cluster Breakdown

| cluster | rows |
| --- | ---: |
| exact members but six-member evidence incomplete | 3 |
| exact members + derived bonus + exact target total evidence | 2 |
| exact members + derived bonus but exact target total evidence missing | 2 |
| exact target members but global rank/side is not safely known | 1 |

## Accepted Rows

| screenshot | stage | side | selected | expected | proposed | evidence | image would pass |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| スクリーンショット 2026-07-11 144932916.png | 2 | self | members 221508, 128329, 176419; bonus 0; total 526,256 | members 221508, 128329, 176419; bonus 44,301; total 570,557 | members 221508, 128329, 176419; bonus 44,301; total 570,557 | rank1=self.member1 221,508<br>winning=self<br>derived=44,301<br>targetTotalEvidence=5<br>oppositeTotalEvidence=0<br>sixMemberEvidence=yes<br>currentCrownRejection=missing-enemy-exact-total-evidence<br>stageWideRejection=none | yes |
| スクリーンショット 2026-07-11 145018419.png | 2 | self | members 262782, 104193, 143648; bonus 0; total 510,623 | members 262782, 104193, 143648; bonus 52,556; total 563,179 | members 262782, 104193, 143648; bonus 52,556; total 563,179 | rank1=self.member1 262,782<br>winning=self<br>derived=52,556<br>targetTotalEvidence=5<br>oppositeTotalEvidence=0<br>sixMemberEvidence=yes<br>currentCrownRejection=missing-enemy-exact-total-evidence<br>stageWideRejection=none | no |

## Rejected Exact-Member Targets

| screenshot | stage | side | selected | expected | proposed | rejection reasons | evidence |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 2026-07-11_223426685.png | 2 | self | members 401629, 286311, 563518; bonus 11,270; total 1,262,728 | members 401629, 286311, 563518; bonus 112,703; total 1,364,161 | members 401629, 286311, 563518; bonus 112,703; total 1,364,161 | missing-target-exact-total-evidence | rank1=self.member3 563,518<br>winning=self<br>derived=112,703<br>targetTotalEvidence=0<br>oppositeTotalEvidence=8<br>sixMemberEvidence=yes<br>currentCrownRejection=missing-self-exact-total-evidence<br>stageWideRejection=none |
| 2026-07-11_223513004.png | 2 | self | members 401629, 286311, 563518; bonus 11,270; total 1,262,728 | members 401629, 286311, 563518; bonus 112,703; total 1,364,161 | members 401629, 286311, 563518; bonus 112,703; total 1,364,161 | missing-target-exact-total-evidence | rank1=self.member3 563,518<br>winning=self<br>derived=112,703<br>targetTotalEvidence=0<br>oppositeTotalEvidence=8<br>sixMemberEvidence=yes<br>currentCrownRejection=missing-self-exact-total-evidence<br>stageWideRejection=none |
| スクリーンショット 2026-07-11 145215861.png | 1 | self | members 433069, 362726, 149521; bonus 0; total 945,316 | members 433069, 362726, 149521; bonus 86,613; total 1,031,929 | members 433069, 362726, 149521; bonus 86,613; total 1,031,929 | missing-enemy-member1-evidence<br>missing-six-member-evidence | rank1=self.member1 433,069<br>winning=self<br>derived=86,613<br>targetTotalEvidence=11<br>oppositeTotalEvidence=11<br>sixMemberEvidence=no<br>currentCrownRejection=missing-enemy-member1-evidence<br>stageWideRejection=none |
| スクリーンショット 2026-07-14 061545315.png | 3 | self | members 810180, 535044, 909283; bonus 18,185; total 2,272,692 | members 810180, 535044, 909283; bonus 181,856; total 2,436,363 | members 810180, 535044, 909283; bonus 181,856; total 2,436,363 | missing-enemy-member1-evidence<br>missing-six-member-evidence | rank1=self.member3 909,283<br>winning=self<br>derived=181,856<br>targetTotalEvidence=10<br>oppositeTotalEvidence=13<br>sixMemberEvidence=no<br>currentCrownRejection=missing-enemy-member1-evidence<br>stageWideRejection=none |
| スクリーンショット 2026-07-16 063115987.png | 1 | self | members 322660, 198361, 153346; bonus 0; total 674,367 | members 322660, 198361, 153346; bonus 64,532; total 738,899 | members 322660, 198361, 153346; bonus 0; total 674,367 | missing-target-exact-total-evidence<br>side-already-matches-proposal | rank1=enemy.member3 388,430<br>winning=enemy<br>derived=77,686<br>targetTotalEvidence=0<br>oppositeTotalEvidence=0<br>sixMemberEvidence=yes<br>currentCrownRejection=missing-self-exact-total-evidence, missing-enemy-exact-total-evidence<br>stageWideRejection=none |
| スクリーンショット 2026-07-16 063115987.png | 2 | self | members 203712, 141269, 151188; bonus 0; total 496,169 | members 203712, 141269, 151188; bonus 40,742; total 536,911 | members 203712, 141269, 151188; bonus 40,742; total 536,911 | missing-enemy-member2-evidence<br>missing-six-member-evidence | rank1=self.member1 203,712<br>winning=self<br>derived=40,742<br>targetTotalEvidence=5<br>oppositeTotalEvidence=8<br>sixMemberEvidence=no<br>currentCrownRejection=missing-enemy-member2-evidence<br>stageWideRejection=none |

## Position Breakdown

| position | accepted rows |
| --- | ---: |
| stage2-self | 2 |

## Overlap With Existing Recoveries

- The accepted rows are still failing after the current production recovery stack.
- `currentPcGroupedRawTokenRecovery`, `currentPcStage3SevenDigitBonusDisplacementRecovery`, `currentPcCrownBonusRuleRecovery`, and `currentPcStageWideSixMemberCandidateSolverRecovery` did not apply to the accepted rows.
- The existing full-stage crown-bonus recovery rejects two accepted rows because only the opposite-side total evidence is missing; the target side itself has exact members, exact derived bonus, and exact target total evidence.
- Future production order, if pursued, should remain after the current four production recoveries and should reject any row where an earlier recovery already applied.

## Recommendation

Proceed to shared runner/browser-equivalent parity for this exact-only side-local recovery before any production work. Productionization is not recommended from this report alone.
