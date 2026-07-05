# Smartphone OCR Row-Zone Adoption Guards

## Scope

This note documents a runner-only guard evaluation for broad smartphone ROI
row-zone proposals. It does not change production OCR output, browser behavior,
known corrections, or the strict ROI adoption simulation result.

The guard evaluation was added to help decide whether row-zone evidence could
ever be safe enough to promote into a future production rule. For now it remains
audit-only.

## Command

```bash
node scripts/ocr-test-images.mjs IMG_9308 IMG_9309 IMG_9310 IMG_9311 IMG_9312 --roi-adoption-sim
node scripts/ocr-test-images.mjs IMG_9243 IMG_9257 IMG_9268 IMG_9282 IMG_9285 --roi-adoption-sim
```

Artifacts are written to:

```text
tmp/ocr-roi-adoption-sim/
```

Generated artifacts are debug output and should not be committed.

## Guard Evaluation Fields

Each `rowZoneExperimentalProposals` entry now includes
`strictRowZoneGuardEvaluation`:

- `wouldAdoptUnderStrictRowZoneGuards`: whether the audit-only proposal passes
  every proposed future guard.
- `matchedPattern`: the supported row-zone failure pattern, when one matched.
- `rejectionReasons`: exact reasons the proposal is not safe enough.
- `equationDelta`: current/proposed member sums, bonus, total, and total error.

The per-image summary also includes `strictRowZoneGuardAccepted`.

## Proposed Future Guards

The current runner-only guard evaluation accepts only narrow, equation-backed
row-zone shapes:

- Proposal must contain exactly three positive member values.
- Proposal must contain exactly one clean exact 7-digit member candidate from
  direct row-zone OCR text.
- Proposal must contain a positive row bonus.
- Proposal must not start with the current selected total, which is a strong
  total-as-member signal.
- Proposed total must exactly equal proposed member sum plus the row bonus.
- Proposed total must increase the current total.
- Proposal must match one of two currently observed patterns:
  - `single-first-slot-replacement`: member1 is replaced by the clean 7-digit
    row-zone value while member2/member3 and the row bonus explain the current
    total.
  - `leading-seven-digit-shift-with-bonus-member`: a missing leading 7-digit
    member shifts the two real members left and the bonus is currently selected
    as member3.

Rejected evidence remains useful for analysis, but must not be promoted:

- near candidates, including small digit deltas,
- joined/sliding-window candidates,
- total-zone or bonus-zone fragments,
- rows with multiple competing 7-digit values,
- rows where the first value is the current displayed total,
- rows that do not produce an exact total equation.

## User-Reported Sample Results

| Image | Result | Reason |
| --- | --- | --- |
| `IMG_9308.png` | rejected | S2 still has only near `1020194` for expected `1020198`; S1 row-zone proposal starts with the current total and regresses. |
| `IMG_9309.png` | rejected | No safe member-row 7-digit proposal; the failure is total/bonus digit confusion. |
| `IMG_9310.png` | accepted by guard evaluation | S2 self matches `single-first-slot-replacement`: `1199099 / 798677 / 884569`, bonus `239819`, total `3122164`. |
| `IMG_9311.png` | accepted by guard evaluation | S2 self matches `leading-seven-digit-shift-with-bonus-member`: `1124177 / 478609 / 438608`, bonus `224835`, total `2266229`. |
| `IMG_9312.png` | rejected | S1 row-zone proposal starts with the current total and regresses; the failure is total/bonus digit confusion. |

The strict production-like adoption simulation remains unchanged for all five
samples. These guard results are proposal analysis only.

## Negative Control Results

The guard evaluation accepted no proposals for the existing control set:

| Image | Strict row-zone guard accepted |
| --- | ---: |
| `IMG_9243.png` | 0 |
| `IMG_9257.png` | 0 |
| `IMG_9268.png` | 0 |
| `IMG_9282.png` | 0 |
| `IMG_9285.png` | 0 |

This is important because some broad row-zone proposals in the control set are
known to be noisy or regressive. The guard correctly leaves them audit-only.

## Recommendation

Do not enable row-zone ROI adoption in production yet.

The guard evaluation is promising for the two user-reported S2 self failures,
but it is still based on broad row-zone text rather than slot-level geometry.
The next safe step is to collect more examples where:

- the same supported pattern appears,
- the proposal has exact fixture/browser confirmation,
- negative controls continue to reject noisy total/bonus rows,
- slot-level or bbox evidence can prove the 7-digit value belongs to member1.

Until then, row-zone proposals should stay runner-only.
