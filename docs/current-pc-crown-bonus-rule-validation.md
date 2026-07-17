# Current-PC Crown Bonus Rule Validation

## Proposed Rule

For each current-PC result stage:

- There are six raw member scores: three self members and three enemy members.
- The highest raw member score among those six is rank 1.
- Only the side containing that rank-1 member receives a crown bonus.
- The displayed member values are raw scores before bonus.
- Proposed crown bonus:

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

## Result

| check | count |
| --- | ---: |
| stages checked | 174 |
| exact floor-rule matches | 173 |
| mismatches | 1 |
| stages with exactly one bonus side | 174 |
| stages where both totals match the floor rule | 173 |

The 20% floor rule is strongly supported but not fully confirmed against the fixture set because one expected fixture row is inconsistent with the rule.

## Rounding Comparison

The expected bonus for the rank-1 side was compared against `floor`, `round`, and `ceil`.

| method | matches |
| --- | ---: |
| floor | 173 |
| round-to-nearest | 99 |
| ceil | 36 |

Additional rounding facts:

- non-integer `maxScore * 0.20` cases: 138
- cases where floor, round, and ceil are all the same integer: 36
- cases that uniquely distinguish floor from round/ceil and match floor: 137

Conclusion: among the matching rows, the fixture set strongly favors `floor(maxScore * 0.20)` over round-to-nearest or ceil.

## Mismatches

### 2026-07-15-184101432.json Stage1

| field | value |
| --- | --- |
| screenshot / fixture | `2026-07-15-184101432.json` |
| stage | 1 |
| self raw members | `268326 / 466573 / 293299` |
| enemy raw members | `322573 / 164147 / 62645` |
| highest raw score | `466573` |
| winning side | self |
| fixture self bonus | `183314` |
| fixture enemy bonus | `0` |
| calculated floor bonus | `93314` |
| round-to-nearest bonus | `93315` |
| ceil bonus | `93315` |
| fixture self total | `1211512` |
| fixture enemy total | `549365` |
| calculated self total | `1121512` |
| calculated enemy total | `549365` |

The enemy side satisfies the rule exactly. The self side does not:

```text
268326 + 466573 + 293299 + 93314 = 1121512
```

The fixture currently has:

```text
selfBonus = 183314
selfTotal = 1211512
```

This mismatch is most likely a fixture transcription error rather than a different game rule, because:

- the fixture bonus differs from the calculated floor bonus by exactly `90000`
- the fixture total differs from the calculated self total by exactly `90000`
- all other 173 stages match the floor rule
- round and ceil are `93315`, which do not explain `183314`

The fixture was not changed by this validation task.

## Structural Rule

The stronger structural rule was also checked:

- exactly one side receives a nonzero bonus
- the rank-1 side total equals raw member sum plus `floor(maxScore * 0.20)`
- the other side total equals raw member sum

Result:

- exactly one side has a nonzero bonus in all 174 stages
- both totals satisfy the structural rule in 173 stages
- the only structural mismatch is `2026-07-15-184101432.json` Stage1

## OCR Impact Audit

The requested OCR impact audit was not performed because it was explicitly gated on the rule matching all 174 stages. The current fixture set has one mismatch, so using the rule as an OCR validation constraint would be premature until that fixture is reviewed or corrected.

If the Stage1 fixture for `2026-07-15-184101432` is confirmed/corrected and the rule reaches 174/174, the next diagnostics-only impact audit should classify failing current-PC rows by whether the rule can provide:

- deterministic bonus validation when all raw members are already correct
- deterministic total validation when all raw members are already correct
- a unique bonus/member displacement interpretation
- a unique total/bonus selection interpretation
- a blocked result because a member is missing or wrong
- a blocked result because multiple member candidate sets remain ambiguous

## Recommendation

Do not productionize crown-bonus OCR recovery yet.

Recommended next step:

1. Manually review `2026-07-15_184101432.png` Stage1 self.
2. If the visible bonus/total are `+93314` and `1121512`, correct only the expected fixture in a separate task.
3. Re-run this validation.
4. If the rule reaches 174/174, run the diagnostics-only OCR impact audit.

This rule looks more promising than slot-specific ROI candidate recovery as a future validation constraint because it is stage-global, game-rule-backed, and already matches 173/174 fixture stages. The current blocker is fixture consistency, not OCR evidence quality.
