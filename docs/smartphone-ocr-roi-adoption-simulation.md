# Smartphone OCR ROI Adoption Simulation

This is a runner-only simulation for future smartphone fixed-ROI candidate
adoption. It does not change the normal OCR result, browser output, known
corrections, or pass/fail calculation.

## Command

```bash
node scripts/ocr-test-images.mjs IMG_9243 IMG_9257 IMG_9268 IMG_9282 IMG_9285 --roi-adoption-sim
```

`--simulate-roi-adoption` is accepted as an alias.

## Output Location

Generated artifacts are written to:

```text
tmp/ocr-roi-adoption-sim/
```

The directory is generated output and should not be committed.

## What The Simulation Does

For each smartphone image, stage, and side, the runner:

1. Runs the existing OCR pipeline normally.
2. Builds fixed ROI evidence with the same runner-only extractor used by
   `--fixed-roi-experiment`.
3. Creates a simulated result object.
4. Considers only clean 7-digit candidates from `member-slot-*` zones.
5. Rejects joined, sliding-window, near, total-zone, bonus-zone, and broad-row
   candidates from adoption.
6. Requires an exact equation improvement before changing a simulated member
   slot.

The production result is never mutated.

## JSON Fields

Each per-image artifact contains:

- `current`: normal OCR final members and total.
- `simulated`: simulated ROI-adopted members and total.
- `expected`: expected fixture values when available.
- `bonusCandidates`: explicit bonus candidates from ROI bonus zones.
- `equation.before` and `equation.after`: member sum and best total equation
  error.
- `comparison.current` and `comparison.simulated`: mismatch counts against the
  expected fixture when available.
- `adoptedCandidates`: ROI candidates that passed every guard.
- `rejectedCandidates`: ROI candidates that were intentionally ignored, with a
  reason.
- `outcome`: one of:
  - `improved`
  - `regressed`
  - `changed-unvalidated`
  - `unchanged`

## Initial Interpretation

The first simulation target set is expected to be conservative. The current
runner already applies known corrections, so fixture-backed cases should usually
remain `unchanged`.

This is useful: it proves the adoption guard does not disturb passing OCR output
while still recording why ROI evidence was ignored.

Expected behavior for the first target set:

- `IMG_9257` S2 enemy: the clean `1054601` ROI candidate is already selected in
  the current final result, so the simulation should remain unchanged.
- `IMG_9285` S2 self: the clean `1001539` ROI candidate is already selected in
  the current final result, so the simulation should remain unchanged.
- `IMG_9282` S2 self: `1086075` is available only as joined evidence and the
  other two expected 7-digit values are near matches with digit deltas, so they
  must remain rejected/audit-only.
- `IMG_9268`: clean 7-digit ROI candidates exist, but there is no committed
  expected fixture for this image, so any simulated change would be
  unvalidated.
- `IMG_9243`: many sliding-window 7-digit values appear from adjacent 6-digit
  scores; these should be rejected as audit-only noise.

Initial run result:

```bash
node scripts/ocr-test-images.mjs IMG_9243 IMG_9257 IMG_9268 IMG_9282 IMG_9285 --roi-adoption-sim
```

- Images: 5
- Expected fixtures: 4
- Runner failures: 0
- Improved stage/sides: 0
- Regressed stage/sides: 0
- Changed unvalidated stage/sides: 0
- Unchanged stage/sides: 30

This is the intended conservative baseline. The current runner already includes
known corrections for the fixture-backed targets, and the simulation correctly
refuses to adopt joined/near/noisy ROI candidates.

## Why The Initial Simulation Produced No Changes

The zero-improvement result is acceptable for this first simulation batch. The
target images were run through the normal pipeline with existing generic rules
and filename-keyed known corrections still enabled, so the final `current`
values were already fixture-correct in the cases with expected JSON.

### IMG_9257

- S2 enemy expected 7-digit member `1054601` is already present in the final
  current OCR result.
- The clean `1054601` ROI evidence appears in broad member/total text, but not
  as a clean adoptable `member-slot-*` replacement.
- Slot-level and row-level joined values are rejected as
  `joined-or-near-candidate-audit-only`.
- Result: unchanged because the known correction already covers the target
  value and no exact equation-improving slot replacement remains.

## User-reported IMG_9308-IMG_9312 row-zone experiment

The user-reported sample batch added in `812503a` exposed a useful distinction:
the strict simulated adoption result must remain unchanged, but broad row-zone
evidence can still be reported as an audit-only proposal.

The simulation now includes `rowZoneExperimentalProposals` for direct
member-row bands. These proposals:

- are runner-only and do not mutate the normal OCR result,
- require a clean exact 7-digit value in the parsed row,
- treat the first three parsed row values as a proposed member set and the
  fourth value as a proposed bonus,
- compare the proposal against expected fixtures when available,
- are explicitly not production adoption because broad row bands can include
  totals or joined neighboring text.

Run:

```bash
node scripts/ocr-test-images.mjs IMG_9308 IMG_9309 IMG_9310 IMG_9311 IMG_9312 --roi-adoption-sim
```

Result summary:

| Image | Strict simulated adoption | Row-zone experimental proposal |
| --- | --- | --- |
| `IMG_9308.png` | unchanged | no safe S2 proposal; S1 row proposal regresses because the row starts with a total |
| `IMG_9309.png` | unchanged | no row-zone 7-digit member proposal |
| `IMG_9310.png` | unchanged | S2 self improves to `1199099 / 798677 / 884569`, total `3122164` |
| `IMG_9311.png` | unchanged | S2 self improves to `1124177 / 478609 / 438608`, total `2266229` |
| `IMG_9312.png` | unchanged | S1 row proposal regresses because the row starts with a total |

### IMG_9310

Current S2 self:

```text
members 144104 / 798677 / 884569
total   2067169
```

The direct member-row OCR text contains:

```text
1,199,099798,677 884,569
+239819
```

The row-zone proposal produces:

```text
members 1199099 / 798677 / 884569
bonus   239819
total   3122164
```

This exactly matches the expected S2 self fixture. The candidate is still broad
row-zone evidence, not slot-level evidence, so it remains simulation-only.

### IMG_9311

Current S2 self:

```text
members 478609 / 438608 / 224835
total   1142052
```

The direct member-row OCR text contains:

```text
1,124,177478,609 438,608
+224835
```

The row-zone proposal produces:

```text
members 1124177 / 478609 / 438608
bonus   224835
total   2266229
```

This exactly matches the expected S2 self fixture. It is a strong candidate for
future ROI work, but not for production adoption yet because broad row parsing
still needs a slot/geometry guard.

### Why IMG_9308 remains unsafe

`IMG_9308` S2 self only has a near candidate:

```text
expected 1020198
ROI near 1020194
```

The simulation must not use near candidates. It also does not cleanly recover
the second expected 7-digit member `1200635`. This remains blocked for a
separate digit/segmentation strategy.

### Why IMG_9309 and IMG_9312 are separate

Both failures are total/bonus digit-confusion cases with correct member scores:

- `IMG_9309` S1 self total: expected `1123775`, current `1125775`
- `IMG_9312` S1 self total: expected `1236139`, current `1256139`

They should not be handled by member ROI adoption. They need a separate
total/bonus candidate selection strategy.

### IMG_9285

- S2 self expected 7-digit member `1001539` is already present in the final
  current OCR result.
- Clean 7-digit values such as `1001539` and noisy `1200507` appear in
  non-adoptable zones such as broad member rows or bonus/wide bands.
- The simulation rejects these as `not-member-slot-zone` or
  `joined-or-near-candidate-audit-only`.
- Result: unchanged, which is desirable because this image previously exposed
  a malformed bonus/total guard risk.

### IMG_9282

- S2 self is already fixture-correct after known correction:
  `1204215 / 1259738 / 1086075`.
- ROI evidence for this row is still mostly joined/split text:
  `1086075` is visible as joined evidence, while `1204215` and `1259738` remain
  near candidates with OCR digit deltas.
- The simulation intentionally rejects all of these as audit-only joined/near
  candidates.
- Result: unchanged because the current result is already correct and the ROI
  evidence is not clean enough for safe adoption.

## Stop Or Continue?

This phase should stop here for production adoption. The simulation is doing its
job: it proves the documented guards do not perturb passing OCR output, but the
current sample set does not contain an uncorrected fixture-backed failure where
ROI has a clean slot-level value and current OCR is wrong.

The next useful work is not to loosen the guards. Instead, use the simulation
with selected known corrections disabled or add a new fixture-backed image where:

- current OCR is wrong before a known correction,
- a clean exact 7-digit candidate appears in the matching `member-slot-*` ROI,
- replacing that slot improves the total equation exactly, and
- negative-control images such as IMG_9243 remain unchanged.

## Next Step

Use this simulation with disabled known corrections when testing whether a
specific ROI adoption guard could replace a filename-keyed correction. Production
adoption should wait until the simulation shows repeated `improved` outcomes
without any regression in negative-control images.
