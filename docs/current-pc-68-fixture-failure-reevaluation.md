# Current-PC 68-Fixture OCR Failure Reevaluation

## Summary

Baseline command:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline
```

Additional runner-only reevaluation commands:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-slot-proven-variant-solver
node scripts/ocr-test-images.mjs --current-pc-stage3-slot-geometry-from-baseline --current-pc-stage3-geometry-slot-solver
```

Scope:

- Expected current-PC fixtures: 68
- Stage checks: 204
- Stage/side row checks: 408
- Extra current-PC screenshots without fixtures in the scan folder: 5
- Production OCR behavior changed: no
- New recovery simulation added: no

Current production recoveries included in this baseline:

- `currentPcGroupedRawTokenRecovery`
- `currentPcStage3SevenDigitBonusDisplacementRecovery`
- `currentPcCrownBonusRuleRecovery`
- `currentPcStageWideSixMemberCandidateSolverRecovery`
- `currentPcExactMembersCrownBonusTotalRecovery`

## Current Accuracy

| Level | Pass | Fail | Accuracy |
| --- | ---: | ---: | ---: |
| Image | 28 / 68 | 40 / 68 | 41.2% |
| Stage | 156 / 204 | 48 / 204 | 76.5% |
| Stage/side | 350 / 408 | 58 / 408 | 85.8% |

## Position Breakdown

| Position | Pass | Fail |
| --- | ---: | ---: |
| Stage1 self | 63 | 5 |
| Stage1 enemy | 62 | 6 |
| Stage2 self | 61 | 7 |
| Stage2 enemy | 64 | 4 |
| Stage3 self | 41 | 27 |
| Stage3 enemy | 59 | 9 |

Stage3 self remains the main failure concentration.

## Field-Level Accuracy

| Field | Exact matches | Accuracy |
| --- | ---: | ---: |
| member1 | 380 / 408 | 93.1% |
| member2 | 374 / 408 | 91.7% |
| member3 | 371 / 408 | 90.9% |
| all 3 members | 357 / 408 | 87.5% |
| bonus | 366 / 408 | 89.7% |
| total | 362 / 408 | 88.7% |

## Remaining Failure Clusters

Primary cluster assignment for the 58 failing stage/side rows:

| Primary cluster | Rows |
| --- | ---: |
| Stage3 missing/truncated 7-digit member | 17 |
| Stage3 7-digit member displacement | 12 |
| small digit OCR error / near value | 12 |
| all members correct but bonus/total wrong | 7 |
| multi-member displacement | 6 |
| total/bonus selection or omission | 4 |

Secondary tags, where rows can appear in more than one category:

| Secondary tag | Rows |
| --- | ---: |
| total/bonus selection or omission | 56 |
| exact total in candidates but not selected | 41 |
| Stage3 7-digit member mismatch | 29 |
| multi-member displacement | 28 |
| exact member in primary candidates but unselected | 26 |
| exact bonus missing or OCR-confused | 22 |
| Stage3 missing or truncated 7-digit | 17 |
| exact bonus in candidates but not selected | 15 |
| small digit OCR error / near value | 12 |
| all members correct but bonus/total wrong | 7 |
| exact total missing or OCR-confused | 5 |
| partial fragment / digit drop | 5 |

Interpretation:

- The remaining failures are no longer mostly about the crown-bonus rule itself.
- Most rows have total evidence, but still lack reliable member-slot or bonus provenance.
- Exact candidates often exist somewhere, but assigning them to a slot or bonus role remains unsafe without stronger evidence.

## July 21 Fixture Outcomes

The 10 July 21 fixtures split into 6 full-image passes and 4 full-image failures.

| Screenshot | Result | Failing rows |
| --- | --- | --- |
| `スクリーンショット 2026-07-21 054816570.png` | FAIL | S1 enemy |
| `スクリーンショット 2026-07-21 054837823.png` | FAIL | S3 self |
| `スクリーンショット 2026-07-21 054906218.png` | FAIL | S3 self |
| `スクリーンショット 2026-07-21 054933546.png` | PASS | none |
| `スクリーンショット 2026-07-21 055004769.png` | PASS | none |
| `スクリーンショット 2026-07-21 055032320.png` | PASS | none |
| `スクリーンショット 2026-07-21 055104928.png` | FAIL | S3 self |
| `スクリーンショット 2026-07-21 055134699.png` | PASS | none |
| `スクリーンショット 2026-07-21 055158908.png` | PASS | none |
| `スクリーンショット 2026-07-21 055227743.png` | PASS | none |

## July 21 Deep Dives

### `2026-07-21-054816570` S1 enemy

Expected:

- members: `230442 / 184993 / 219244`
- bonus: `0`
- total: `634679`

Selected:

- members: `230442 / 134993 / 219244`
- bonus: `0`
- total: `584679`

Evidence:

- raw candidates: `634679, 54079, 230442, 134993, 219244`
- displayed total candidates: `634679, 54079`
- exact expected total exists in displayed-total evidence.
- exact expected member2 `184993` is absent from the primary parsed candidates.

Classification:

- Small digit OCR error / near value.
- Correcting `134993` to `184993` would require inventing a digit or using arithmetic/near-value inference.
- Not safe for recovery without independent exact member evidence.

Why current recoveries reject:

- Crown-bonus and exact-members recovery both reject because target exact-total/evidence conditions are not enough when a member is wrong.
- Stage-wide solver rejects because there is no complete six-member exact interpretation.

### `2026-07-21-054837823` S3 self

Expected:

- members: `429630 / 561404 / 1299934`
- bonus: `259986`
- total: `2550954`

Selected:

- members: `561404 / 25998 / 0`
- derived selected bonus: `1963552`
- total: `2550954`

Evidence:

- raw candidates: `92550, 2550954, 561404, 25998`
- displayed total candidates: `92550, 2550954`
- exact expected total exists.
- exact member2 exists as `561404`.
- exact member1 `429630`, member3 `1299934`, and bonus `259986` are not available as clean primary candidates.

Classification:

- Stage3 multi-member displacement with missing selected member and bonus/member displacement.
- The displayed total is correct, but the candidate pool is too incomplete for a safe reconstruction.

Why current recoveries reject:

- Stage3 7-digit bonus-displacement rejects because the member-row shape has fewer than four usable values and lacks an unselected clean 7-digit member proposal.
- Crown-bonus and stage-wide solver reject because member evidence is incomplete and not unique.

### `2026-07-21-054906218` S3 self

Expected:

- members: `706926 / 1046567 / 609489`
- bonus: `209313`
- total: `2572295`

Selected:

- members: `706926 / 46567 / 609489`
- bonus: `0`
- total: `1362982`

Evidence:

- raw candidates: `2572295, 9261, 706926, 46567, 609489, 709313`
- displayed total candidates: `2572295`
- exact expected total exists.
- exact member1 and member3 are selected.
- expected member2 appears only as a truncated fragment `46567`.
- expected bonus `209313` is OCR-confused as `709313`.

Classification:

- Stage3 partial-fragment / digit-drop 7-digit member plus bonus OCR confusion.
- This is not a near-value candidate; the exact corrected member is absent.

Why current recoveries reject:

- Stage3 7-digit bonus-displacement rejects because no clean unselected 7-digit member candidate exists and exact bonus evidence is missing.
- Stage-wide solver rejects because there is no complete six-member exact interpretation.

### `2026-07-21-055104928` S3 self

Expected:

- members: `619606 / 617485 / 774304`
- bonus: `154860`
- total: `2166255`

Selected:

- members: `619606 / 617485 / 774304`
- derived selected bonus: `15486`
- total: `2026881`

Evidence:

- raw candidates: `92166, 166255, 2166255, 619606, 617485, 774304, 15486`
- displayed total candidates: `92166, 166255, 2166255`
- exact expected total exists.
- all three self members are selected correctly.
- exact expected bonus `154860` is absent; only digit-dropped `15486` is present.

Classification:

- All members correct, but bonus/total wrong due bonus digit drop.
- This resembles exact-members crown-bonus total recovery, but still rejects because six-member evidence is incomplete on the opposite side.

Why current recoveries reject:

- `currentPcExactMembersCrownBonusTotalRecovery` rejects with `missing-enemy-member1-evidence` and incomplete six-member evidence.
- Recovering this would require loosening the global six-member evidence guard, which is not safe from this single row.

## Deferred Direction Rescore

### A. Slot-Proven Stage3 Variant Evidence

Fresh 68-fixture runner-only run:

- broad slot-proven policy: TP `16`, FP `0`, FN `4`, blocked `42`
- true incremental beyond current production: `2`
- true incremental beyond existing stage-wide solver: `2`
- parity: `16/16` TP exact, incremental TP parity `2/2`, wouldApply disagreements `0`, safety-relevant mismatches `0`

However, the broad policy still includes one within-one-only row:

- `2026-07-11_223152331.png` S3 proposes `1002601` and total `2509763`, while expected is `1002602` and total `2509764`.
- That row is not acceptable under the current no-near/no-within-one rule.

Strict exact-only slot-proven policy:

- TP `15`, FP `0`, FN `5`, blocked `42`
- true incremental beyond current production: `1`
- true incremental beyond existing stage-wide solver: `1`

Conclusion:

- The exact-only safe subset does not reach the renewed threshold of `true incremental TP >= 2`.
- Do not productionize from this direction yet.
- Keep it as a candidate if more exact slot-proven Stage3 samples arrive.

### B. Expected-Blind Stage3 Bbox/Geometry Slot Evidence

Fresh baseline-derived geometry solver run:

- Stage3 side rows evaluated: `136`
- TP `1`
- FP `0`
- FN `3`
- blocked `26`
- true incremental TP `1`
- Stage3 self incremental TP `1`
- recommendation from artifact: `do not productionize`

Conclusion:

- No false positives, but only one true incremental positive.
- Does not meet the production threshold.
- This remains useful as diagnostics, not as a production target.

### C. Exact-Members Crown-Bonus Total Recovery

Current simulation/parity artifacts still show the original strict shape:

- TP `2`
- FP `0`
- FN `7`
- blocked `51`
- true incremental TP `2`
- parity rows compared: `408`
- TP parity `2/2`
- wouldApply disagreements `0`
- safety-relevant mismatches `0`

This direction has already been productionized as `currentPcExactMembersCrownBonusTotalRecovery`.

Conclusion:

- The rule remains stable, but it is not a new deferred production target.
- Remaining related rows are blocked by incomplete six-member evidence, missing exact total evidence, or missing exact bonus/member evidence.
- `2026-07-21-055104928` is the clearest new adjacent case, but it is blocked by incomplete opposite-side member evidence and an absent exact bonus.

### D. Ambiguous Exact-Candidate Provenance Narrowing

Fresh 68-fixture signal from the baseline:

- `26` failing rows have at least one exact expected member value in the primary candidate lists but still fail.
- Many also have exact total evidence.
- The common blocker remains provenance: the exact value exists, but the runner cannot prove the correct member slot or role without risking wrong-slot assignment.

Conclusion:

- This does not cross the threshold because deterministic slot provenance and unique interpretation are still missing.
- The next useful work here is evidence quality, not recovery logic.

## Recommended Next Step

No deferred direction currently clears the productionization threshold.

Recommendation:

1. Do not productionize a new current-PC rule from this reevaluation.
2. Continue collecting current-PC expected fixtures.
3. Prioritize evidence capture for Stage3 self/member slots and exact bonus OCR:
   - Stage3 self has `27` failing rows, far more than any other position.
   - `22` failing rows still have missing or OCR-confused exact bonus evidence.
   - Exact totals are often present, but totals alone are not safe enough to assign missing members or bonuses.
4. Revisit slot-proven Stage3 variant evidence only after at least one more exact-only true incremental TP appears with zero FP and no within-one/near behavior.

## Validation

- `node scripts/ocr-test-images.mjs --current-pc-baseline`: PASS as a measurement run; 68 expected fixtures evaluated.
- `node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage-wide-slot-proven-variant-solver`: PASS as runner-only reevaluation.
- `node scripts/ocr-test-images.mjs --current-pc-stage3-slot-geometry-from-baseline --current-pc-stage3-geometry-slot-solver`: PASS as runner-only reevaluation.
- `npm run build`: PASS.
