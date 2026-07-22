# Current-PC Side-Local Incomplete Opposite Evidence Investigation

Generated: 2026-07-22T01:31:36.157Z

## Scope

- runner-only simulation added: yes
- final OCR output changed: yes, when `applyCurrentPcSideLocalExactEvidenceRecovery(...)` applies
- production recovery added: yes
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

## Shared Evidence Flow

- Shared helper: `buildCurrentPcSideLocalExactEvidenceRecoveryEvidence(...)` in `app/lib/ocr.js`.
- Runner path: `scripts/ocr-test-images.mjs` calls the shared helper from `currentPcSideLocalExactEvidenceStageSide(...)`.
- Browser-equivalent path: the parity evaluator rebuilds the same side-local evidence from the current-PC side analysis object available before UI result rendering.
- Production path: `applyCurrentPcSideLocalExactEvidenceRecovery(...)` applies only when the shared helper says `wouldApply`.
- The recovery changes only the target side bonus/total. Target-side member values remain unchanged.

## Side-Local Proof Categories

Accepted proof category in this run:

- `target-winning-by-opposite-total-upper-bound`: target members are unchanged, target max is unique, exact target total evidence exists, the opposite selected total has exact OCR evidence and is internally consistent, and `targetMax > oppositeTotal`. Because all opposite raw member scores must be non-negative and no opposite member can exceed its displayed total, the opposite side cannot contain rank 1.

Rejected/unused categories:

- `direct-displayed-bonus`: remained unavailable because the exact bonus was not captured as a clean bonus candidate in the candidate rows.
- `target-losing-by-opposite-member-exceeds-target-max`: no accepted row needed this shape.

## Summary

| metric | count |
| --- | ---: |
| full fixture stage/side rows evaluated | 408 |
| TP | 3 |
| FP | 0 |
| FN | 4 |
| blocked | 51 |
| true incremental TP beyond current production | 3 |
| potential full-image PASS gain | 3 |

## Runner / Browser-Equivalent Parity

| metric | count |
| --- | ---: |
| rows compared | 408 |
| runner wouldApply | 3 |
| browser-equivalent wouldApply | 3 |
| TP parity exact | 3 / 3 |
| wouldApply disagreements | 0 |
| target member disagreements | 0 |
| target max disagreements | 0 |
| opposite total disagreements | 0 |
| opposite total evidence mismatches | 0 |
| targetMax > oppositeTotal decision disagreements | 0 |
| derived bonus disagreements | 0 |
| target total proposal disagreements | 0 |
| exact target total evidence mismatches | 0 |
| missing required browser evidence | 0 |
| missing required runner evidence | 0 |
| safety-relevant mismatches | 0 |

### Parity Rows

| screenshot | stage | side | runner apply | browser apply | target members | target max | opposite total | targetMax > oppositeTotal | proposed | mismatch fields |
| --- | ---: | --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| スクリーンショット 2026-07-11 145215861.png | 1 | self | yes | yes | 433069, 362726, 149521 | 433,069 | 280,413 | yes | members 433069, 362726, 149521; bonus 86,613; total 1,031,929 | none |
| スクリーンショット 2026-07-14 061545315.png | 3 | self | yes | yes | 810180, 535044, 909283 | 909,283 | 797,218 | yes | members 810180, 535044, 909283; bonus 181,856; total 2,436,363 | none |
| スクリーンショット 2026-07-21 055104928.png | 3 | self | yes | yes | 619606, 617485, 774304 | 774,304 | 656,257 | yes | members 619606, 617485, 774304; bonus 154,860; total 2,166,255 | none |

## Accepted Rows

| screenshot | stage | side | proof | selected | expected | opposite selected | proposed | evidence | image would pass |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| スクリーンショット 2026-07-11 145215861.png | 1 | self | target-winning-by-opposite-total-upper-bound | members 433069, 362726, 149521; bonus 0; total 945,316 | members 433069, 362726, 149521; bonus 86,613; total 1,031,929 | members 147462, 98618, 34333; bonus 0; total 280,413 | members 433069, 362726, 149521; bonus 86,613; total 1,031,929 | targetTotalEvidence=displayed-total-candidates, total-direct, total-trace, total-trace, total-trace, total-trace, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit<br>targetBonusEvidence=derived-from-targetMax<br>targetMax=433,069<br>oppositeTotalEvidence=displayed-total-candidates, total-direct, total-trace, total-trace, total-trace, total-trace, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=(none)<br>currentCrownRejection=missing-enemy-member1-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-enemy-member1-evidence, missing-six-member-evidence | yes |
| スクリーンショット 2026-07-14 061545315.png | 3 | self | target-winning-by-opposite-total-upper-bound | members 810180, 535044, 909283; bonus 18,185; total 2,272,692 | members 810180, 535044, 909283; bonus 181,856; total 2,436,363 | members 121819, 148410, 526989; bonus 0; total 797,218 | members 810180, 535044, 909283; bonus 181,856; total 2,436,363 | targetTotalEvidence=displayed-total-candidates, total-trace, total-trace, total-trace, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit<br>targetBonusEvidence=derived-from-targetMax<br>targetMax=909,283<br>oppositeTotalEvidence=displayed-total-candidates, total-direct, total-trace, total-trace, total-trace, total-trace, total-trace, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=(none)<br>currentCrownRejection=missing-enemy-member1-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-enemy-member1-evidence, missing-six-member-evidence | yes |
| スクリーンショット 2026-07-21 055104928.png | 3 | self | target-winning-by-opposite-total-upper-bound | members 619606, 617485, 774304; bonus 15,486; total 2,026,881 | members 619606, 617485, 774304; bonus 154,860; total 2,166,255 | members 144244, 58751, 453262; bonus 0; total 656,257 | members 619606, 617485, 774304; bonus 154,860; total 2,166,255 | targetTotalEvidence=displayed-total-candidates, total-trace, total-trace, total-trace, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit<br>targetBonusEvidence=derived-from-targetMax<br>targetMax=774,304<br>oppositeTotalEvidence=displayed-total-candidates, total-direct, total-trace, total-trace, total-trace, total-trace, total-trace, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit, total-trace-token-audit<br>oppositeTotalInternallyConsistent=yes<br>oppositeObservedAboveTargetMax=(none)<br>currentCrownRejection=missing-enemy-member1-evidence<br>stageWideRejection=no-complete-six-member-exact-total-interpretation<br>exactMembersRejection=missing-enemy-member1-evidence, missing-six-member-evidence | yes |

## Rejected Candidate Rows

| screenshot | stage | side | selected | expected | opposite selected | rejection reasons | evidence |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| - | - | - | - | - | - | - | - |

## Blocked Breakdown

| reason | rows |
| --- | ---: |
| - | 0 |

## Position Breakdown

| position | accepted rows |
| --- | ---: |
| stage3-self | 2 |
| stage1-self | 1 |

## Mathematical Safety

The accepted proof does not infer any missing opposite-side member. It uses the opposite side's exact displayed total as an upper bound.

Because current-PC member scores are non-negative raw scores, every individual opposite-side member must be less than or equal to the opposite-side total. Therefore, when `targetMax > oppositeTotal`, `targetMax` is also greater than every possible individual member on the opposite side. With a unique target-side max, this proves the target side contains global rank 1 even if one or more opposite-side member slots are incomplete.

This must not be weakened to `targetMax > selected opposite member` or any partial opposite-side member condition; the safety comes from the total-as-upper-bound proof.

## Production Precedence

The production recovery runs only after the current stack:

1. `currentPcGroupedRawTokenRecovery`
2. `currentPcStage3SevenDigitBonusDisplacementRecovery`
3. `currentPcCrownBonusRuleRecovery`
4. `currentPcStageWideSixMemberCandidateSolverRecovery`
5. `currentPcExactMembersCrownBonusTotalRecovery`
6. `currentPcSideLocalExactEvidenceRecovery`

It rejects any row already resolved by those recoveries and does not change member values.

Productionization result:

- `applyCurrentPcSideLocalExactEvidenceRecovery(...)` is enabled for current-PC only.
- Targeted production baseline for the 3 TP rows: `3 PASS / 0 FAIL`.
- The accepted rows became full-image PASS rows.
- The correction log includes `currentPcSideLocalExactEvidenceRecovery applied ...` with stage, side, unchanged members, `targetMax`, `oppositeTotal`, derived bonus, previous total, corrected total, and exact total evidence.

## Comparison With Stage3 Capture Work

- This side-local direction recovers more incremental rows in simulation than the deferred single-TP Stage3 variant, geometry, or merged-run experiments.
- It does not repair missing members and does not improve member evidence quality.
- The FP risk is lower than noisy Stage3 member capture because the accepted proposal changes only bonus/total and requires exact target total evidence plus an upper-bound proof for the opposite side.

## Recommendation

Runner/browser-equivalent parity is exact for the 3 TP rows with zero safety-relevant mismatches. Production recovery is now enabled for the exact side-local upper-bound proof only. Real-browser spot-check is recommended before push/deploy.
