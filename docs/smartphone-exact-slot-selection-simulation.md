# Smartphone Exact-Slot Selection Simulation

Generated: 2026-07-25T01:57:20.637Z

## Scope

Runner/browser-equivalent evidence audit for smartphone exact-slot member / bonus / total selection. It uses cached all-fixture smartphone OCR evidence and reapplies current production smartphone recoveries in memory before evaluating only the remaining failing stage/side rows.

It does not change production OCR output, does not use current-PC evidence, and does not use expected values to build proposals. Expected fixtures are used only after proposal construction for diagnostic scoring.

## Evidence Schema

- Shared helper: `buildSmartphoneExactSlotSelectionEvidence(...)` in `app/lib/ocr.js`.
- Member evidence: slot-specific smartphone candidate pools from the shared smartphone stage-wide evidence helper. Candidates keep value, slot index, rank, and source tags such as selected output or raw member-row order.
- Total evidence: exact target-side displayed-total candidates from existing smartphone total evidence.
- Bonus evidence: either direct observed numeric bonus evidence from smartphone-native observed OCR numbers, or strict zero-bonus proof from complete slot-proven six-member evidence and the confirmed crown-bonus rule.
- Browser/UI evidence-only flow: after current smartphone production recoveries and before result rendering, the UI builds the same evidence for both sides and stores it under `parsedOcrScores.smartphoneCrownStageWideEvidence.stages[stage].exactSlotSelectionEvidence`.
- Browser-equivalent parity flow: cached runner artifacts are normalized into the same stage-result shape and passed through the same shared helper across all fixture-backed stage/sides.

## Guards

- Target side only; the opposite side is not modified.
- All three target members must come from their own slot candidate pools.
- Exact displayed total must already be observed.
- Direct bonus must be observed and satisfy exact arithmetic.
- Zero bonus is allowed only when all six members are complete/slot-proven and the opposite side has the unique global rank-1 member.
- Direct-bonus proposals that reorder multiple member slots are blocked as unsafe, because exact total+bonus can still fit the wrong slot order.
- Exactly one changed proposal may pass all guards.
- No near-match, within-one, digit inference, or arithmetic-derived member values.

## Results

| metric | count |
| --- | ---: |
| stage/sides audited | 534 |
| already correct after current production | 503 |
| remaining failing stage/sides evaluated | 31 |
| wouldApply | 3 |
| TP | 3 |
| FP | 0 |
| FN | 0 |
| blocked | 28 |
| true incremental TP beyond current production | 3 |

## Block Reasons

| reason | rows |
| --- | ---: |
| no-valid-member-bonus-total-proposal | 24 |
| already-correct-or-no-change | 3 |
| would-apply | 3 |
| member-slot-lacks-exact-observed-candidate | 1 |

## Position Breakdown

| position | TP | FP | FN | blocked | already correct | dominant block reason |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| S1 self | 0 | 0 | 0 | 3 | 86 | no-valid-member-bonus-total-proposal |
| S1 enemy | 0 | 0 | 0 | 1 | 88 | no-valid-member-bonus-total-proposal |
| S2 self | 1 | 0 | 0 | 6 | 82 | no-valid-member-bonus-total-proposal |
| S2 enemy | 0 | 0 | 0 | 4 | 85 | no-valid-member-bonus-total-proposal |
| S3 self | 0 | 0 | 0 | 12 | 77 | no-valid-member-bonus-total-proposal |
| S3 enemy | 2 | 0 | 0 | 2 | 85 | would-apply |

## Complete WouldApply Audit

### user-reports/unreviewed/IMG_8951.png S3 enemy

- Classification: TP
- Previous members/total: 18,338 / 52,841 / 0 / 72,101
- Proposed members/bonus/total: 18,338 / 52,841 / 72,101 + 0 = 143,280
- Expected members/bonus/total: 18,338 / 52,841 / 72,101 + 0 = 143,280
- Per-slot provenance: member1: selected-current-output+enemy.raw.member-row-order; member2: selected-current-output+enemy.raw.member-row-order; member3: enemy.raw.member-row-order
- Total provenance: enemy.rawText.totalCandidateTraces
- Bonus proof: zero-bonus-proof, rank1=self member3 216,184
- Competing proposals considered: 0
- Uniqueness: exactly one changed proposal passed all guards.

### user-reports/unreviewed/IMG_9264.png S2 self

- Classification: TP
- Previous members/total: 638,016 / 755,237 / 2,402,568
- Proposed members/bonus/total: 638,016 / 1,009,315 / 755,237 + 0 = 2,402,568
- Expected members/bonus/total: 638,016 / 1,009,315 / 755,237 + 0 = 2,402,568
- Per-slot provenance: member1: selected-current-output+self.raw.member-row-order; member2: self.raw.member-row-order; member3: self.raw.member-row-order
- Total provenance: self.rawText.totalCandidateTraces
- Bonus proof: zero-bonus-proof, rank1=enemy member2 1,254,969
- Competing proposals considered: 0
- Uniqueness: exactly one changed proposal passed all guards.

### user-reports/unreviewed/IMG_9310.png S3 enemy

- Classification: TP
- Previous members/total: 58,192 / 54,710 / 0 / 113,556
- Proposed members/bonus/total: 113,556 / 58,192 / 54,710 + 0 = 226,458
- Expected members/bonus/total: 113,556 / 58,192 / 54,710 + 0 = 226,458
- Per-slot provenance: member1: enemy.raw.member-row-order; member2: enemy.raw.member-row-order; member3: enemy.raw.member-row-order
- Total provenance: enemy.rawText.totalCandidateTraces
- Bonus proof: zero-bonus-proof, rank1=self member2 410,425
- Competing proposals considered: 0
- Uniqueness: exactly one changed proposal passed all guards.

## Known Sample Impact

- IMG_9308: S2 self blocked: no-valid-member-bonus-total-proposal
- IMG_9310: S3 self blocked: no-valid-member-bonus-total-proposal; S3 enemy would apply
- IMG_9319: S2 enemy blocked: no-valid-member-bonus-total-proposal
- IMG_9311: no remaining failing row after current production output
- IMG_9321: no remaining failing row after current production output
- IMG_9329: no remaining failing row after current production output

## Runner / Browser-Equivalent Parity

The parity check compares the shared evaluator across all 534 smartphone stage/side rows after current production smartphone recoveries are replayed in memory. It does not apply the exact-slot proposal to final OCR output.

| metric | count |
| --- | ---: |
| stage/sides compared | 534 |
| runner wouldApply | 3 |
| browser-equivalent wouldApply | 3 |
| TP parity exact | 3 / 3 |
| wouldApply disagreements | 0 |
| proposed member disagreements | 0 |
| proposed bonus disagreements | 0 |
| proposed total disagreements | 0 |
| proposed recovery disagreements | 0 |
| member candidate-pool mismatches | 0 |
| slot provenance mismatches | 0 |
| total evidence mismatches | 0 |
| bonus evidence mismatches | 0 |
| zero-bonus proof mismatches | 0 |
| uniqueness mismatches | 0 |
| rejection-reason mismatches | 0 |
| missing required browser evidence | 0 |
| missing required runner evidence | 0 |
| safety-relevant mismatches | 0 |

### TP Parity Cases

| image | stage | side | runner apply | browser-equivalent apply | proposed members / bonus / total | parity |
| --- | ---: | --- | --- | --- | --- | --- |
| `user-reports/unreviewed/IMG_8951.png` | 3 | enemy | yes | yes | 18,338 / 52,841 / 72,101 + 0 = 143,280 | exact |
| `user-reports/unreviewed/IMG_9264.png` | 2 | self | yes | yes | 638,016 / 1,009,315 / 755,237 + 0 = 2,402,568 | exact |
| `user-reports/unreviewed/IMG_9310.png` | 3 | enemy | yes | yes | 113,556 / 58,192 / 54,710 + 0 = 226,458 | exact |

No runner/browser-equivalent mismatches were found.

## Overlap With Existing Recoveries

The simulation is scored only after current smartphone production recoveries are replayed in memory. Rows that are already correct after existing production recovery are counted as already correct, not TP. Therefore all TP rows are true incremental proposals beyond current production output.

Existing production recoveries considered before this simulation include smartphone crown-bonus recovery and smartphone stage-wide six-member solver recovery, along with earlier smartphone postprocess recoveries already reflected in cached output.

## Recommendation

Runner/browser-equivalent parity is exact for the 3 TP rows with zero safety-relevant mismatches. Productionization can be considered next, but this task intentionally does not change final OCR output.
