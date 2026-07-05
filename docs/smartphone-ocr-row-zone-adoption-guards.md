# Smartphone OCR Row-Zone Adoption Guards

## Scope

This note originally documented a runner-only guard evaluation for broad
smartphone ROI row-zone proposals. A narrow production candidate has now been
promoted for the two confirmed user-reported Stage2 self patterns while the
broader ROI adoption simulation remains audit-only.

The production rule is intentionally smaller than the experiment: it is
smartphone-only, Stage2 self only, clean exact 7-digit row-zone values only, and
it still rejects near/joined/sliding-window evidence.

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

Each `rowZoneExperimentalProposals` entry includes
`strictRowZoneGuardEvaluation`:

- `wouldAdoptUnderStrictRowZoneGuards`: whether the audit-only proposal passes
  every proposed future guard.
- `matchedPattern`: the supported row-zone failure pattern, when one matched.
- `rejectionReasons`: exact reasons the proposal is not safe enough.
- `equationDelta`: current/proposed member sums, bonus, total, and total error.

The per-image summary also includes `strictRowZoneGuardAccepted`.

## Production Guard

The production recovery accepts only narrow, equation-backed row-zone shapes:

- Proposal must contain exactly three positive member values.
- Proposal must contain exactly one clean exact 7-digit member candidate from
  direct row-zone OCR text.
- Proposal must contain a positive row bonus.
- Every proposed member must be at least `300000`; this rejects
  `IMG_9308`-like rows where a 200k fragment/near value would otherwise look
  tempting.
- The rule is limited to smartphone Stage2 self rows.
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
| `IMG_9308.png` | rejected | S2 still has only near `1020194` for expected `1020198`, and the row contains a low `200635` fragment that fails the production member floor. |
| `IMG_9309.png` | rejected | No safe member-row 7-digit proposal; the failure is total/bonus digit confusion. |
| `IMG_9310.png` | S2 self recovered | Matches `single-first-slot-replacement`: `1199099 / 798677 / 884569`, bonus `239819`, total `3122164`. The image still has unrelated Stage3 OCR failures. |
| `IMG_9311.png` | recovered | Matches `leading-seven-digit-shift-with-bonus-member`: `1124177 / 478609 / 438608`, bonus `224835`, total `2266229`. |
| `IMG_9312.png` | rejected | S1 row-zone proposal starts with the current total and regresses; the failure is total/bonus digit confusion. |

The remaining rejected samples are intentionally not covered by this production
candidate.

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

## Remaining Blockers

Do not broaden row-zone ROI adoption beyond this narrow Stage2 self production
candidate yet.

The next safe step is still to collect more examples where:

- the same supported pattern appears,
- the proposal has exact fixture/browser confirmation,
- negative controls continue to reject noisy total/bonus rows,
- slot-level or bbox evidence can prove the 7-digit value belongs to member1.

Near candidates, Stage1/Stage3 cases, total/bonus digit-confusion cases, and
member-order recovery should remain outside this rule.
