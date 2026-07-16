# Current-PC Stage3 Member-Row Variant Evidence Simulation Investigation

This is a docs-only investigation of whether the runner-only Stage3 member-row ROI/preprocessing diagnostics can support a strict recovery simulation. It does not change OCR output, does not add a runner simulation, and does not productionize any recovery.

## Source Artifacts

- Diagnostics report: `docs/current-pc-stage3-member-row-ocr-diagnostics.md`
- Diagnostics artifacts: `tmp/current-pc-stage3-member-row-ocr-diagnostics/`
- Latest diagnostics commit: `db6e4ed`

## Summary

- affected Stage3 rows audited: 20
- expected missing 7-digit members audited: 24
- exact 7-digit member found by at least one ROI/preprocessing variant: 23 / 24
- exact 7-digit member not found by any variant: 1 / 24
- rows with exact total evidence: 20 / 20
- rows with required exact bonus evidence, or no bonus required: 8 / 20
- rows where all missing 7-digit members were recovered and strict equation validation looked possible: 3 / 20
- rows with a unique-looking interpretation after diagnostic evidence: 3 / 20
- rows satisfying both strict equation and unique interpretation: 2 / 20
- runner-only simulation added: no
- productionization recommended: no

The diagnostics show that ROI variants are very good at surfacing exact 7-digit text evidence, but that is not the same as a safe recovery rule. Most rows still fail because bonus evidence is missing or OCR-confused, multiple members are displaced, variant OCR introduces competing member-sized values, or the candidate interpretation is not unique.

## Variant Evidence Recap

| variant | exact 7-digit recoveries | fragment hits | unsafe/noisy variant rows |
| --- | ---: | ---: | ---: |
| current-member-row-roi | 12 | 2 | 4 |
| wider-member-row-roi | 16 | 1 | 2 |
| shifted-left-member-row-roi | 14 | 3 | 2 |
| shifted-right-member-row-roi | 12 | 4 | 6 |
| shifted-up-member-row-roi | 10 | 2 | 3 |
| shifted-down-member-row-roi | 14 | 2 | 2 |
| taller-member-row-roi | 12 | 2 | 7 |
| tighter-vertical-member-row-roi | 12 | 1 | 4 |
| baseline-threshold-row-variant | 14 | 5 | 1 |
| crown-bonus-threshold-row-variant | 14 | 3 | 4 |
| member1-slot | 1 | 0 | 1 |
| member2-slot | 6 | 0 | 0 |
| member3-slot | 3 | 0 | 2 |
| per-slot crops combined | 10 | 0 | 3 |

Wider row ROI is the strongest raw extractor by count, but it is not independently safe as an adoption source. Per-slot crops are cleaner provenance in theory, but only recover 10 of 24 misses and still have noisy rows for member1/member3 slots.

## Strict Guard Candidate

A safe runner-only simulation would need all of these guards:

- current-PC only
- Stage3 only
- skip rows where `currentPcGroupedRawTokenRecovery` already applies
- skip rows where `currentPcStage3SevenDigitBonusDisplacementRecovery` already applies
- exact missing 7-digit member recovered by member-row ROI/preprocessing variant evidence
- no near-match, digit-drop, or inferred candidate
- exact displayed total evidence
- exact bonus evidence when a nonzero bonus is required
- selected/reconstructable non-variant members are exact
- exactly one arithmetic interpretation satisfies `member1 + member2 + member3 + bonus == total`
- no competing variant candidate set
- no unsafe/noisy member-sized variant extras
- no filename or screenshot ID logic

The current evidence does not satisfy this as a recurring pattern.

## Candidate Interpretation Audit

| image | side | exact 7-digit variant evidence | total evidence | bonus evidence | strict equation possible | unique interpretation | blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-07-11_223152331.png` | self | member3 recovered | yes | not needed | no | no | selected row has missing member/order displacement and an unsafe `1002650` variant candidate |
| `2026-07-11_223346581.png` | self | member2 recovered | yes | yes | no | no | multiple unsafe candidates, including near/confused `1364665`; bonus/member placement still ambiguous |
| `2026-07-11_223426685.png` | self | member2 recovered | yes | yes | no | no | expected member1 is also displaced; replacing only the 7-digit miss cannot form a unique row |
| `2026-07-11_223513004.png` | self | member2 recovered | yes | yes | no | no | duplicate of `223426685` pattern; still requires multi-field row reconstruction |
| `2026-07-11_223613166.png` | self | member3 recovered | yes | not needed | yes | yes | promising single-row case, but shape is missing member3 with selected total already equal to expected total |
| `2026-07-11_223613166.png` | enemy | member1/member2 recovered | yes | yes | yes | no | two 7-digit members displaced; full row is reconstructable with oracle values, but interpretation is not single-candidate safe |
| `2026-07-11_223714046.png` | self | member2/member3 recovered | yes | no | no | no | bonus evidence missing and multiple unsafe variant candidates |
| `2026-07-11_223753187.png` | self | member1 recovered | yes | yes | yes | yes | promising single-row case, but shape is bonus-as-member shift rather than same pattern as `223613166` self |
| `2026-07-11_223834078.png` | self | member3 recovered | yes | no | no | no | member2 is also wrong, bonus evidence missing, and variants include unsafe total-like values |
| `2026-07-11_223834078.png` | enemy | member1 recovered | yes | not needed | no | no | selected total already includes missing member as inferred bonus; unsafe variant candidates remain |
| `2026-07-11_223907986.png` | self | member3 recovered | yes | no | no | no | bonus evidence missing and only a single member can be repaired |
| `2026-07-11_223950902.png` | enemy | member2 recovered | yes | no | no | no | expected bonus is OCR-confused and many variants introduce unsafe candidate noise |
| `スクリーンショット 2026-07-11 145038835.png` | self | member2 recovered | yes | no | no | no | exact bonus evidence missing; selected member/bonus displacement remains ambiguous |
| `スクリーンショット 2026-07-11 145126932.png` | self | member1 recovered | yes | no | no | no | exact bonus evidence missing and selected row has bonus/member confusion |
| `スクリーンショット 2026-07-12 223701314.png` | self | member2 recovered | yes | no | no | no | exact bonus evidence missing; row needs bonus/member reassignment |
| `スクリーンショット 2026-07-14 060926190.png` | self | member1 recovered | yes | no | no | no | exact bonus evidence missing and selected row has sparse slot/bonus displacement |
| `スクリーンショット 2026-07-14 061325391.png` | self | member1/member2 recovered | yes | no | no | no | two 7-digit members affected and bonus evidence missing |
| `スクリーンショット 2026-07-14 061634001.png` | self | member1 recovered; member2 not recovered | yes | yes | no | no | one expected 7-digit member remains unrecovered and variants include unsafe total-like values |
| `スクリーンショット 2026-07-15 130012999.png` | self | member2 recovered | yes | no | no | no | exact bonus evidence missing; selected member3/bonus remains ambiguous |
| `スクリーンショット 2026-07-15 130026795.png` | self | member1 recovered | yes | no | no | yes | exact bonus evidence missing; cannot validate the nonzero bonus without inference |

## Why No Simulation Was Added

Only two rows are both strict-equation-possible and unique-looking:

- `2026-07-11_223613166.png` S3 self
- `2026-07-11_223753187.png` S3 self

They do not form a single narrow recurring rule:

- `223613166` self is a sparse/missing member3 case where the selected total already equals the expected total and the missing 7-digit member is effectively being inferred by the selected total gap.
- `223753187` self is a member-row shift where the expected bonus has exact evidence and the bonus was selected as a member.

Both are promising, but combining them into one simulation would immediately mix two different recovery shapes. Keeping them separate leaves only one positive example per shape, which is below the requested bar for a recurring safe pattern.

## Blocker Counts

Rows can have more than one blocker.

| blocker | rows |
| --- | ---: |
| missing exact bonus evidence where bonus is required | 12 |
| unsafe/noisy variant candidate present | 16 |
| multiple 7-digit members affected or missing | 5 |
| selected/reconstructable non-variant members not exact | 13 |
| exact variant evidence does not recover all missing 7-digit members | 1 |
| same narrow recovery shape has fewer than 2 positives | 2 |

## Overlap With Existing Recoveries

The diagnostics row finder already skips sides where either existing current-PC production recovery applied:

- `currentPcGroupedRawTokenRecovery`
- `currentPcStage3SevenDigitBonusDisplacementRecovery`

So the 20 audited rows have no direct overlap with the 10 grouped/raw production recoveries or the 8 Stage3 bonus-displacement production recoveries. The report is measuring the remaining Stage3 member-row failure space.

## Combined Recovery Potential

The variant evidence is valuable for future recovery design because it recovers exact missing members in 23 of 24 records. However, the limiting factor is no longer only member evidence. The remaining blockers are mostly:

- exact bonus capture failure
- member/bonus displacement
- sparse row displacement
- noisy candidate variants
- rows with multiple affected 7-digit members

The best next step is not production recovery. It is to split the two promising unique rows into separate runner-only investigations:

1. Sparse missing-member with selected total already exact.
2. Bonus-as-member shift with exact bonus and exact total evidence.

Each needs at least one more positive sample and negative-control evaluation before a simulation would be justified.

## Recommendation

- Do not productionize Stage3 member-row ROI variant evidence.
- Do not add a runner-only recovery simulation yet.
- Continue using the diagnostics artifacts to design narrower subpattern-specific simulations.
- Browser/UI parity would be required before any future productionization because ROI variant evidence would need to flow through the browser path exactly like the runner.

## Validation

- `node --check scripts/ocr-test-images.mjs`: PASS
- `npm run build`: PASS
