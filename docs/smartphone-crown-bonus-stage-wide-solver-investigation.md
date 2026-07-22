# Smartphone Crown-Bonus And Stage-Wide Solver Investigation

This is a runner-only/docs-first investigation of whether the confirmed current-PC crown-bonus rule and stage-wide six-member reasoning can safely improve smartphone OCR. It does not change OCR output, does not add production recovery, and does not modify current-PC or legacy desktop OCR behavior.

## Scope

The smartphone expected fixture set currently contains `89` `IMG_*.json` fixtures.

| scope | count |
| --- | ---: |
| smartphone expected fixtures | 89 |
| stages checked | 267 |
| stage/side rows represented | 534 |

Current full-smartphone PASS/FAIL was not re-run across all 89 fixtures in this task because the crown-bonus rule validation failed the required gate below. Known targeted controls are still listed in the validation section.

## Crown-Bonus Rule Validation

Rule tested for each expected stage:

```text
crownBonus = floor(max(all 6 raw member scores) * 0.20)
```

The side containing the unique global rank-1 member should receive that bonus; the opposite side should receive `0`. Both side totals should equal member sum plus the applicable bonus.

| result | count |
| --- | ---: |
| stages checked | 267 |
| exact floor-rule matches | 260 |
| mismatches | 7 |
| stages with exactly one bonus side | 265 |
| winning-side bonus equals floor(max * 0.20) | 261 |
| winning-side bonus equals round(max * 0.20) | 159 |
| winning-side bonus equals ceil(max * 0.20) | 46 |
| stages distinguishing floor from round/ceil | 215 |

The rule is strongly supported for most smartphone fixtures, and floor is clearly the dominant rounding behavior. However, it is not `267 / 267`, so the requested gate blocks smartphone crown-rule simulation work for now.

## Mismatches

No fixture values were changed. These rows need manual fixture/game-rule review before the PC-derived crown-bonus rule can be treated as globally valid for smartphone OCR.

| fixture | stage | expected members | expected bonus/total | calculated rank-1 side | calculated bonus | calculated totals | mismatch |
| --- | ---: | --- | --- | --- | ---: | --- | --- |
| `IMG_9163.json` | 1 | self `544861 / 0 / 0`<br>enemy `162233 / 56973 / 138410` | self `+108974 = 653835`<br>enemy `+0 = 357616` | self | 108972 | self `653833`<br>enemy `357616` | expected self bonus/total are `+2` above floor |
| `IMG_9165.json` | 2 | self `158678 / 94205 / 0`<br>enemy `88082 / 51744 / 160340` | self `+0 = 252883`<br>enemy `+0 = 300166` | enemy | 32068 | self `252883`<br>enemy `332234` | winning enemy side has no expected bonus |
| `IMG_9250.json` | 1 | self `82360 / 124137 / 177424`<br>enemy `105866 / 516222 / 361331` | self `+0 = 383921`<br>enemy `+103246 = 1086665` | enemy | 103244 | self `383921`<br>enemy `1086663` | expected enemy bonus/total are `+2` above floor |
| `IMG_9264.json` | 2 | self `638016 / 755237 / 0`<br>enemy `210809 / 1254969 / 891973` | self `+1009315 = 2402568`<br>enemy `+250993 = 2608744` | enemy | 250993 | self `1393253`<br>enemy `2608744` | both sides have nonzero expected bonus; self total does not fit rule |
| `IMG_9281.json` | 3 | self `204908 / 112716 / 0`<br>enemy `343001 / 343056 / 257235` | self `+0 = 317624`<br>enemy `+68613 = 1011905` | enemy | 68611 | self `317624`<br>enemy `1011903` | expected enemy bonus/total are `+2` above floor |
| `IMG_9315.json` | 2 | self `179154 / 446623 / 162915`<br>enemy `83746 / 56196 / 41979` | self `+88924 = 877616`<br>enemy `+0 = 181921` | self | 89324 | self `878016`<br>enemy `181921` | expected self bonus/total are `-400` below floor |
| `IMG_9319.json` | 2 | self `208530 / 193243 / 149143`<br>enemy `11845 / 16081 / 11316` | self `+41466 = 592382`<br>enemy `+0 = 39242` | self | 41706 | self `592622`<br>enemy `39242` | expected self bonus/total are `-240` below floor |

## Simulation Decision

No `smartphoneCrownBonusRuleSimulation` was added.

Reason:

- the crown-bonus rule does not validate across all smartphone expected fixtures
- several mismatches involve older sparse rows or rows with zero/member placeholders
- two newer fixture rows (`IMG_9315` S2 and `IMG_9319` S2) differ by hundreds, not only small rounding noise
- applying a rule before resolving these fixtures could create false positives

No `smartphoneStageWideSixMemberCandidateSolverSimulation` was added.

Reason:

- the stage-wide solver depends on the same global rank-1 and derived bonus rule
- the rule mismatch gate means the solver cannot be safely scored as a smartphone-wide policy yet
- smartphone already has layout-specific Stage2/Stage3 recovery logic and should not inherit PC solver behavior until the expected fixtures agree with the game rule

## Known Failure Impact

Because the rule validation gate failed, known failures were not scored through a new simulation.

| image | current known status | crown-bonus rule impact | stage-wide solver impact |
| --- | --- | --- | --- |
| `IMG_9308` | unresolved expected failure; Stage2 self 7-digit split/drop and bonus-as-member | not evaluated; exact member evidence remains incomplete/unsafe | not evaluated; evidence-capture limited |
| `IMG_9310` | unresolved expected failure; S2 self 7-digit recovery, S3 sparse/total-as-member issue | not evaluated; mixed failure family | not evaluated; S3 enemy is not a six-member crown-bonus-only row |
| `IMG_9319` | known expected failure outside recovered Stage3 self; S2 values conflict with floor rule | blocked by rule mismatch in S2 fixture | blocked until fixture/game-rule mismatch is resolved |

## Overlap With Existing Smartphone Recoveries

No overlap was measured with a new simulation because no simulation was added.

Existing smartphone production recoveries remain untouched:

- row-zone 7-digit recovery
- strict Stage3 self 7-digit displacement recovery
- strict Stage3 fragment recovery
- Stage2 leading bonus recovery
- Stage3 enemy 7-digit recovery
- production evidence-flow/browser parity fixes

## Recommendation

Do not proceed to browser/UI parity for smartphone crown-bonus or stage-wide solver adoption yet.

Recommended next step:

1. Manually review the 7 mismatch stages against their source screenshots.
2. Decide whether they are expected-fixture transcription errors, older-layout exceptions, or real smartphone game-rule exceptions.
3. Rerun the crown-bonus rule validation after any confirmed fixture corrections.
4. Only if the rule reaches `267 / 267`, add a runner-only smartphone crown-bonus impact audit before considering a stage-wide solver simulation.

Until then, smartphone OCR work should continue through smartphone-native evidence-capture improvements rather than PC-derived solver adoption.

## Validation

- production OCR output changed: no
- smartphone production recoveries changed: no
- current-PC OCR changed: no
- legacy desktop OCR changed: no
- runner-only simulation added: no
- `IMG_9311`: PASS
- `IMG_9321`: PASS
- `IMG_9329`: PASS
- `IMG_9308`: remains known expected failure
- `IMG_9310`: remains known expected failure
- `IMG_9319`: remains known expected failure
- `test-images/desktop/pc-rehearsal-bonus-member-shift.png`: PASS
- `npm run build`: PASS
