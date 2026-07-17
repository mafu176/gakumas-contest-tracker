# Current-PC Crown Bonus Rule Validation

## Proposed Rule

For each current-PC result stage:

- There are six raw member scores: three self members and three enemy members.
- The highest raw member score among those six is rank 1.
- Only the side containing that rank-1 member receives a crown bonus.
- The displayed member values are raw scores before bonus.
- Crown bonus:

```text
crownBonus = floor(max(all 6 raw member scores) * 0.20)
```

The winning side total should be:

```text
member1 + member2 + member3 + crownBonus
```

The other side total should be:

```text
member1 + member2 + member3
```

Ties for rank 1 were not considered because no current fixture requires tie handling.

## Scope

- current-PC expected fixtures audited: 58
- stages audited: 174
- data source: `regression-test/expected/current-pc/*.json`
- OCR production output changed: no
- OCR recovery logic added: no
- smartphone OCR changed: no
- legacy desktop OCR changed: no

## Confirmed Fixture Correction

The previous validation found one mismatch in `2026-07-15-184101432.json` Stage1 self. The original screenshot was manually rechecked, and the mismatch was confirmed to be an expected-fixture transcription error.

Corrected Stage1 self values:

| field | corrected value |
| --- | --- |
| members | `268326 / 466573 / 293299` |
| bonus | `93314` |
| total | `1121512` |

Arithmetic:

```text
floor(466573 * 0.20) = 93314
268326 + 466573 + 293299 + 93314 = 1121512
```

The incorrect fixture values were:

```text
selfBonus = 183314
selfTotal = 1211512
```

No other expected fixture values were changed.

## Final Validation Result

After correcting the confirmed fixture transcription error, the crown-bonus rule matches the full current-PC expected fixture set.

| check | count |
| --- | ---: |
| stages checked | 174 |
| exact floor-rule matches | 174 |
| mismatches | 0 |
| stages with exactly one bonus side | 174 |
| stages where both totals match the floor rule | 174 |

Conclusion: `crownBonus = floor(max(all 6 raw member scores) * 0.20)` is confirmed for all 174 current-PC fixture stages.

## Rounding Comparison

The expected bonus for the rank-1 side was compared against `floor`, `round`, and `ceil`.

| method | matches |
| --- | ---: |
| floor | 174 |
| round-to-nearest | 99 |
| ceil | 36 |

Additional rounding facts:

- non-integer `maxScore * 0.20` cases: 138
- cases where floor, round, and ceil are all the same integer: 36
- cases that uniquely distinguish floor from round/ceil and match floor: 138

Conclusion: the fixture set confirms floor rounding. All non-integer bonus cases distinguish floor from round-to-nearest and ceil.

## Structural Rule

The stronger structural rule was also checked:

- exactly one side receives a nonzero bonus
- the rank-1 side total equals raw member sum plus `floor(maxScore * 0.20)`
- the other side total equals raw member sum

Result:

- exactly one side has a nonzero bonus in all 174 stages
- both side totals satisfy the structural rule in all 174 stages

## Diagnostics-Only OCR Impact Audit

Because the rule now matches all 174 stages, a diagnostics-only impact audit was run against the current 58-fixture OCR baseline. This did not change OCR output and did not add a recovery simulation.

The audit classified failing stage/side rows by whether the confirmed crown-bonus rule could help validate or potentially correct OCR output. Categories can overlap because a row may have both a wrong bonus and a wrong total, or may be useful for validation while still blocked by member uncertainty.

| impact category | rows |
| --- | ---: |
| failing stage/side rows audited | 113 |
| all six member scores already correct enough to determine rank 1 and exact bonus | 41 |
| one side's three members are correct and global rank 1 is safely known | 41 |
| correct members already known, current bonus is wrong or missing | 42 |
| correct members already known, current total is wrong | 42 |
| bonus/member displacement could be resolved by the rule | 20 |
| total/bonus selection could be resolved by the rule | 42 |
| Stage3 7-digit displacement could gain a unique interpretation | 0 |
| missing member prevents use | 17 |
| member OCR error prevents use | 54 |
| competing member candidate sets remain ambiguous | 52 |
| rule gives useful validation but not enough evidence to change output | 71 |
| potential unique safe correction under conservative evidence requirements | 41 |

Overlap with existing or recent recovery work:

| overlap category | rows |
| --- | ---: |
| overlap with `currentPcGroupedRawTokenRecovery` | 0 |
| overlap with `currentPcStage3SevenDigitBonusDisplacementRecovery` | 0 |
| overlap with slot-specific ROI true-positive cases | 2 |

The zero overlap with the two production recoveries is expected in this audit because it analyzed rows that still fail in the current baseline; rows already recovered by production logic no longer appear as failing rows.

## Interpretation

The crown-bonus rule is more promising than slot-specific ROI as the next diagnostics target:

- crown-bonus rule validation is game-rule-backed and matches 174/174 stages
- diagnostics found 41 potential unique safe correction rows
- slot-specific ROI previously had only 2 true-positive rows
- the rule provides exact bonus and total validation without relying on near-match OCR guesses

However, this still should not be productionized directly. A potential correction must still require reliable member evidence, reliable identification of the global highest raw member, exact total consistency, unique interpretation, and no competing member interpretation.

## Recommendation

Do not add production OCR recovery yet.

Recommended next step:

1. Add a runner-only `currentPcCrownBonusRuleSimulation`.
2. Require all six raw member scores to be reliable enough to identify the unique rank-1 member.
3. Require `bonus = floor(maxScore * 0.20)`.
4. Require exact side total equations.
5. Reject rows with missing members, member OCR errors, competing member sets, or ambiguous bonus/member displacement.
6. Measure TP / FP / FN / blocked across all 58 current-PC fixtures before considering production recovery.

The confirmed game rule is now strong enough for a dedicated runner-only simulation in the next task.
