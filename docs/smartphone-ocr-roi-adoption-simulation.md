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

## Next Step

Use this simulation with disabled known corrections when testing whether a
specific ROI adoption guard could replace a filename-keyed correction. Production
adoption should wait until the simulation shows repeated `improved` outcomes
without any regression in negative-control images.
