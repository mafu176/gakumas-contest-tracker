# Smartphone OCR ROI Adoption Plan

This document designs future adoption rules for the runner-only fixed ROI
candidate extractor. It does not enable ROI candidates in production OCR.

## Current Evidence

Command used for the current evidence set:

```bash
node scripts/ocr-test-images.mjs IMG_9243 IMG_9257 IMG_9268 IMG_9282 IMG_9285 --fixed-roi-experiment
```

Generated artifacts live under:

```text
tmp/ocr-roi-experiment/
```

The extractor now reports clean 7-digit candidates, split/join candidates,
exact expected 7-digit matches, and near expected 7-digit matches.

## Case Summary

| Image | Stage / side | Current status | ROI evidence | Classification |
| --- | --- | --- | --- | --- |
| IMG_9243 | all stages | Runner passes. No expected 7-digit member values. | ROI emits many joined 7-digit windows from adjacent 6-digit scores; these are mostly noise. | Blocked for adoption; useful negative case. |
| IMG_9257 | S2 enemy | Runner passes via existing correction. Expected 7-digit member `1054601`. | Clean ROI candidate `1054601` appears and exact expected match is reported. | Safe-looking evidence, but adoption still needs a no-regression proof path. |
| IMG_9268 | S2 self/enemy | No committed expected fixture. | Clean 7-digit candidates include `1479757`, `1155957`, and `1073008`. | Promising, but blocked by missing fixture and unresolved S3 enemy bonus evidence. |
| IMG_9282 | S2 self | Runner passes via known correction. Expected members `1204215`, `1259738`, `1086075`. | Exact joined candidate `1086075`; near joined candidates `1204211` and `1259734` with delta `4`. | Promising for diagnostics only; not safe for adoption. |
| IMG_9285 | S2 self | Runner passes via existing correction. Expected 7-digit member `1001539`. | Clean ROI candidate `1001539` appears and exact expected match is reported. | Safe-looking evidence, but noisy bonus ROI candidates remain a guard risk. |

## Future Adoption Rules

ROI candidates should only supplement or override current OCR candidates when all
of these guards pass.

### Required Guards

1. Smartphone-only scope

   The rule must run only for smartphone/mobile OCR. Desktop/PC mode must ignore
   fixed ROI candidates.

2. Correct zone and slot

   A member candidate must come from the matching `member-slot-N` crop or a
   member-row crop that can be mapped to the same slot. A candidate found only in
   a total band, bonus band, or unrelated joined row must not become a member.

3. Clean candidate preference

   Production adoption should initially accept only clean parsed 7-digit
   candidates from member zones. Joined candidates and near matches are audit
   evidence only until there is a separate visual/template proof.

4. Equation improvement

   The candidate replacement must improve score consistency. At minimum, the
   resulting member sum plus a reliable bonus candidate must match the selected
   or displayed total exactly.

5. No high-confidence conflict

   ROI must not override a current selected member when the current value already
   comes from a high-confidence member slot and participates in a valid equation.

6. Aggregate exclusion

   The ROI candidate must not be a displayed total, crown bonus, total-power-like
   value, or a fragment/window of a multi-value aggregate row.

7. Known noisy zones remain advisory

   Bonus and wide row zones can emit plausible-looking joined values such as
   `1200507` in IMG_9285 S2 self. These values must not be adopted without both
   zone and equation support.

### Explicit Non-Adoption Cases

- Near candidates such as IMG_9282 `1204211` for expected `1204215` and
  `1259734` for expected `1259738` must stay audit-only. A small numeric delta is
  not enough to repair OCR.
- Sliding-window candidates from adjacent 6-digit values, common in IMG_9243,
  must not be treated as real 7-digit scores.
- Candidates from images without expected fixtures, such as IMG_9268, should not
  drive production behavior until the fixture and visual values are confirmed.

## Runner-Only Comparison Fields

The existing ROI artifacts already provide the required comparison inputs:

- `current.members` and `current.total`
- `expected.members`, `expected.total`, and `expected.sevenDigitMembers`
- `roiCandidateNumbers`
- `expectedSevenDigitMembersFound`
- `expectedSevenDigitMembersNearFound`
- zone-level `cleanSevenDigitCandidates`
- zone-level `fragmentCandidates`
- zone-level `possibleJoinedCandidates`

No additional runner output is required before designing a prototype scorer.

## Candidate Scoring Shape

A future runner-only scorer can assign explanatory scores without changing OCR
output:

| Signal | Score impact |
| --- | --- |
| Clean 7-digit candidate in matching member slot | Strong positive |
| Clean 7-digit candidate in broad member row only | Medium positive |
| Candidate exact-match improves total equation | Strong positive |
| Candidate only appears as joined/sliding-window value | Audit-only |
| Candidate is near expected but not exact | Audit-only |
| Candidate appears in total/bonus zone | Strong negative for member adoption |
| Candidate creates or preserves invalid total equation | Strong negative |

The scorer should report a recommendation, not mutate the OCR result, until it
has enough fixture-backed examples.

## Classification

### Safe-Looking But Not Yet Adopted

- IMG_9257 S2 enemy: clean exact ROI candidate `1054601`.
- IMG_9285 S2 self: clean exact ROI candidate `1001539`.

These should be the first candidates for a runner-only adoption simulation.

### Promising But Not Safe

- IMG_9282 S2 self: exact joined `1086075`, but the other two expected members
  are near values with OCR digit errors. This needs better preprocessing or
  visual/template evidence before production recovery.
- IMG_9268 S2 self/enemy: clean 7-digit candidates are visible, but the image
  still lacks a committed expected fixture and has an unresolved S3 bonus
  blocker.

### Blocked / Negative Controls

- IMG_9243: joined 7-digit windows are produced from adjacent 6-digit scores.
  This is a useful false-positive guard case.

## Recommended Next Step

Do not enable ROI adoption in production yet.

The next safe implementation step is a runner-only ROI adoption simulation that
tries exact clean member-slot 7-digit replacements for IMG_9257 and IMG_9285,
then reports whether the replacement improves the equation without changing the
normal OCR output. IMG_9282 should remain a diagnostic target, not an adoption
target, until its near candidates become exact clean candidates or acquire
stronger template evidence.
