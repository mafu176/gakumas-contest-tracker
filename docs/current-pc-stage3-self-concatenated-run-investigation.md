# Current-PC Stage3 Self Concatenated Run Investigation

## Summary

Scope:

- Remaining Stage3 self failures reviewed: 27
- Primary concatenation failures reviewed: 11
- Production OCR behavior changed: no
- Runner-only simulation added: no

Artifacts used:

- `tmp/current-pc-ocr-baseline/summary.json`
- `tmp/current-pc-stage3-member-row-ocr-diagnostics/summary.json`
- `tmp/current-pc-stage3-slot-geometry-diagnostics/summary.json`
- `tmp/current-pc-ocr-baseline/stage-wide-six-member-candidate-solver-stage3-slot-proven-variant-evidence.json`
- `tmp/current-pc-ocr-baseline/stage3-geometry-slot-evidence-simulation.json`

Conclusion:

Concatenated OCR runs are real and common in the remaining Stage3 self failures, but string-level splitting is not safe. The useful direction is image-space splitting by deterministic member slot boundaries. Existing diagnostics already approximate that with per-slot crops and bbox/geometry assignment, and they still do not produce at least 2 true incremental safe Stage3 self recoveries. Do not productionize or add another recovery simulation yet.

## Geometry Availability

Available:

- Stage3 self member-row crop geometry.
- Deterministic member1/member2/member3 slot boundaries.
- OCR word/token bounding boxes for many candidate observations.
- Token center X, overlap with member slots, nearest-slot, max-overlap, overlap-threshold, and consensus-slot assignment diagnostics.
- Per-slot crop variants such as `member1-slot`, `member2-slot`, and `member3-slot`.

Not available:

- Reliable per-symbol or per-glyph bounding boxes for splitting a single merged text run into characters.
- Character positions inside a merged OCR token.
- A safe way to split numeric strings such as `903.,4251,262,179` or `706,9261,.046,567` without using digit-count or expected-value knowledge.

Implication:

- String splitting would still require heuristic digit boundaries.
- Image-space splitting is safer because member slot provenance comes from crop/geometry, not from guessed character cuts.

## Concatenation Rows

| Screenshot | Shape | Raw concatenated text | Expected | Selected | Slot-proven exact members | Geometry exact members | Stage-wide blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-07-11_223426685.png` | member1+member2 | `903.,4251,262,179 859,213 ... +252435` | `903425/1262179/859213 +252435=3277252` | `262179/859213/252435 +0=1373827` | m1, m3 | m1, m2, m3 | no complete six-member exact-total interpretation |
| `2026-07-11_223513004.png` | member1+member2 | `903.,4251,262,179 859,213 ... +252435` | `903425/1262179/859213 +252435=3277252` | `262179/859213/252435 +0=1373827` | m1, m3 | m1, m2, m3 | no complete six-member exact-total interpretation |
| `2026-07-11_223714046.png` | member2+member3 | `795,5621,237,121,256,92 ... +25138` | `795562/1237121/1256926 +251385=3540994` | `795562/25138/0 +2720294=3540994` | m1 | m2, m3 | missing self member3 candidate; no complete six-member exact-total interpretation |
| `2026-07-11_223753187.png` | member1+member2 | `1.072,082820,114 923,776 ... +214416` | `1072082/820114/923776 +214416=3030388` | `820114/923776/214416 +0=1958306` | m3 | m1, m2, m3 | no complete six-member exact-total interpretation |
| `2026-07-11_223834078.png` | member2+noise | `683,470 941.077 1,406.67. ... +2813` | `683470/941077/1406672 +281334=3312553` | `683470/1406/2813 +0=687689` | m1, m2, m3 | m2, m3 | missing self/enemy member3 candidates; no complete six-member exact-total interpretation |
| `スクリーンショット 2026-07-14 061325391.png` | member1+member2 | `1.033,971.,191,935 883,071 ... +738387` | `1033971/1191935/883071 +238387=3347364` | `191935/883071/738387 +0=1813393` | none | m1, m2, m3 | no complete six-member exact-total interpretation |
| `スクリーンショット 2026-07-16 062903692.png` | member1+member2 | `721.,2101,162,325 933,236 ... +232465` | `721210/1162325/933236 +232465=3049236` | `162325/933236/232465 +0=1328026` | m1, m2, m3 | m1, m2, m3 | no complete six-member exact-total interpretation |
| `スクリーンショット 2026-07-16 063330034.png` | all 3 | `1,035,784,182,4591,015,62! ... +236491` | `1035782/1182459/1015625 +236491=3470357` | `236491/0/0 +3233866=3470357` | none | none | missing self member2/member3 candidates; no complete six-member exact-total interpretation |
| `スクリーンショット 2026-07-17 081921369.png` | mixed | no clean raw row text in diagnostic summary | `890501/869851/894265 +178853=2833470` | `890501/894265/17885 +0=1802651` | none | m2, m3 | no complete six-member exact-total interpretation |
| `スクリーンショット 2026-07-21 054837823.png` | mixed | `429 630 561,404 1,299.93. ... +25998` | `429630/561404/1299934 +259986=2550954` | `561404/25998/0 +1963552=2550954` | m1, m2 | m1, m2, m3 | missing self member3 candidate; no complete six-member exact-total interpretation |
| `スクリーンショット 2026-07-21 054906218.png` | member2+noise | `706,9261,.046,567 609,489 ... +709313` | `706926/1046567/609489 +209313=2572295` | `706926/46567/609489 +0=1362982` | m1, m3 | m2 | no complete six-member exact-total interpretation |

## Shape Breakdown

| Shape | Rows |
| --- | ---: |
| member1+member2 merged | 5 |
| member2+member3 merged | 1 |
| member2 merged with noise | 2 |
| all three member slots merged/noisy | 1 |
| mixed / incomplete diagnostic text | 2 |

The most common shape is member1+member2 concatenation, usually caused by missing punctuation or no gap between the right edge of member1 and the leading digit of member2.

## Strategy Review

### A. Split by OCR word/symbol bbox gap

Result:

- Not safe with current artifacts.
- Word/token bbox exists, but per-symbol or per-character bbox is not available.
- When OCR emits a merged token, there is no deterministic internal character boundary to split without guessing.

### B. Split by slot-boundary crossing

Result:

- Promising as diagnostics, not sufficient for production yet.
- Existing geometry diagnostics can assign many merged observations to expected member slots using center/overlap consensus.
- Wrong-slot count in these 11 rows: 0 in current diagnostics.
- Still, the stage-wide solver remains blocked because complete six-member exact-total interpretation is missing or not unique.

### C. Assign digit substrings based on bbox X distribution

Result:

- Not safe.
- Requires character positions that are not present.
- Would degenerate into digit-count or proportional string slicing.

### D. Segment image by known member slot geometry before OCR

Result:

- Safest conceptual direction.
- Existing per-slot crops are a partial implementation of this idea.
- Per-slot exact values for all three members exist in only 2 / 11 concatenation rows.

### E. Re-OCR concatenated bbox intersections with member slots

Result:

- Promising, but not proven by current artifacts.
- Current diagnostics do not yet run a dedicated “intersect merged-run bbox with each slot and OCR each intersection” pass.
- This could be a useful future runner-only experiment if implemented without expected values.

### F. Hybrid multi-slot run detection plus slot-intersection OCR

Result:

- Best future candidate.
- Detect a merged row token or row crop that spans multiple member slots, intersect it with deterministic slot boxes, then OCR each slot intersection independently.
- It avoids string cutting and preserves slot provenance.
- Needs new runner-only implementation and negative-control scoring before any browser parity work.

## Existing Evidence Counts

Across the 11 concatenation rows:

| Evidence capability | Rows |
| --- | ---: |
| all three members available in per-slot variant crops | 2 |
| all three members available through bbox/geometry consensus | 6 |
| all three members available through either slot crop or geometry consensus | 9 |
| wrong-slot assignments in current geometry diagnostics | 0 |
| stage-wide solver accepted from these rows | 0 |
| expected-blind geometry-slot solver accepted from these rows | 0 |

The zero wrong-slot result is encouraging, but it is not enough. The downstream solver still needs complete, exact, unique stage-wide evidence with total and crown-bonus consistency.

## Existing Simulation Overlap

The current slot-proven Stage3 variant solver and expected-blind geometry-slot solver were already run against the 68-fixture baseline.

For the 11 concatenation rows:

- `currentPcStageWideSixMemberCandidateSolverWithSlotProvenStage3VariantEvidenceSimulation`: all Stage3 rows remain blocked.
- `currentPcStage3GeometrySlotEvidenceSimulation`: all Stage3 rows remain blocked.
- Common rejection: `no-complete-six-member-exact-total-interpretation`.
- Additional rejections include missing self member3 candidate and missing opposite-side member evidence.

Therefore, adding a new simulation that merely reuses the same per-slot or geometry evidence would not produce meaningful TP.

## String Splitting vs Image-Space Splitting

String splitting is not recommended.

Unsafe examples:

- `903.,4251,262,179`
- `1.072,082820,114`
- `706,9261,.046,567`
- `1,035,784,182,4591,015,62!`

These can be interpreted only by guessing where one score ends and the next begins. Even when the expected answer is obvious to a human, the OCR artifact does not include reliable character boundaries.

Image-space splitting is the safer direction:

1. Detect a word/token or row text region that crosses member slot boundaries.
2. Use deterministic Stage3 self slot boxes.
3. Crop the intersection of the merged evidence region and each involved slot.
4. OCR each sub-crop separately.
5. Promote only exact observed values with direct slot provenance.

This should remain runner-only until it proves:

- at least 2 true incremental Stage3 self recoveries,
- 0 FP,
- 0 wrong-slot assignments,
- exact totals,
- crown-bonus consistency,
- unique six-member interpretation,
- runner/browser-equivalent parity.

## Recommendation

Do not add `currentPcStage3SelfConcatenatedRunSlotSplitSimulation` yet.

Reason:

- The existing artifacts already test the nearest available approximations: per-slot crops and bbox/geometry slot assignment.
- They recover useful exact values but do not produce accepted Stage3 self recoveries from the 11 concatenation rows.
- A meaningful new simulation would require a new OCR input-quality experiment: merged-run bbox intersection re-OCR by slot.

Recommended next step:

Implement a runner-only image-space experiment, not a string splitter:

- Suggested name: `currentPcStage3SelfMergedRunSlotIntersectionExperiment`
- Input: detected Stage3 self merged row/token bbox plus fixed slot boundaries
- Output: per-slot sub-crop OCR candidates with slot provenance
- Scoring: compare after OCR against fixtures only; do not use expected values during candidate construction

Productionization is not recommended from the current evidence.

## Validation

- `npm run build`: PASS.
