# Smartphone OCR Sparse Total-as-Member Investigation

## Summary

This note documents a runner-only simulation for a sparse Stage3 row pattern found in
`IMG_9310.png`.

No production OCR behavior is changed by this investigation.

## Target Case

`IMG_9310.png` Stage3 enemy currently parses as:

- members: `58192 / 54710 / 0`
- total: `113556`

Expected:

- members: `113556 / 58192 / 54710`
- total: `226458`

The selected total is actually the first member score. The correct total is visible in
the total candidate OCR trace and also equals the sum of the three member scores.

## Evidence

Debug artifact path:

- `tmp/ocr-debug-artifacts/user-reports__unreviewed__IMG_9310.png.debug.json`

Stage3 enemy evidence:

- selected member row OCR: `113,556 58,192 54,710`
- selected members after current OCR: `58192 / 54710 / 0`
- selected total after current OCR: `113556`
- exact total/member trace: `226458 / 113556 / 58192 / 54710`
- proposed members: `113556 / 58192 / 54710`
- proposed total: `226458`
- equation: `113556 + 58192 + 54710 = 226458`
- bonus candidates: none

## Runner-Only Simulation Guard

The runner now records `sparseTotalAsMemberSimulation` in smartphone debug artifacts.
It proposes a repair only when all of these are true:

- current selected members look like two non-zero members plus a trailing empty slot
- current selected total is a plausible member score
- current equation is not already exact
- no crown/bonus candidate is present for the side
- proposed members are `[currentTotal, currentMember1, currentMember2]`
- proposed total equals the proposed member sum
- an exact displayed total candidate exists
- exactly one ordered OCR trace contains the exact sequence: `proposedTotal / proposedMember1 / proposedMember2 / proposedMember3`
- exactly one ordered OCR trace in the side can be interpreted as `total / member1 / member2 / member3`
- the selected member row contains `proposedMember1 / proposedMember2 / proposedMember3`
- the selected member row sequence starts at the beginning of the row trace
- `proposedTotal` is not reused as a member candidate

The stricter trace guard is intentionally narrow: if noisy candidates create another
valid total/member interpretation, the simulation rejects the repair instead of
choosing between plausible rows.

## Current Simulation Result

| Image | wouldApply | Accepted side | Primary rejection / ambiguity notes |
| --- | --- | --- | --- |
| `IMG_9310` | yes | Stage3 enemy -> `113556 / 58192 / 54710`, total `226458` | One exact ordered total/member trace; competing numeric noise remains recorded but does not form another valid ordered interpretation for the accepted side. |
| `IMG_9308` | no | - | Row shape or exact total/member trace missing; no sparse total-as-member repair. |
| `IMG_9309` | no | - | Bonus candidates and missing exact trace block the repair. |
| `IMG_9311` | no | - | Current equations are already exact or row shape does not match. |
| `IMG_9312` | no | - | Bonus candidates and missing exact trace block the repair. |
| `IMG_9243` | no | - | Current equations are already exact or row shape does not match. |
| `IMG_9257` | no | - | Current equations are already exact or row shape does not match. |
| `IMG_9282` | no | - | Missing exact trace or ambiguous row evidence blocks the repair. |
| `IMG_9285` | no | - | Current equations are already exact or row shape does not match. |
| `IMG_9251` | no | - | Current equations are already exact or row shape does not match. |
| `IMG_9180` | no | - | Bonus candidates and missing exact trace block the repair. |
| `IMG_9315` | no | - | New sample; Stage3 self is a 7-digit member/bonus displacement case, not sparse total-as-member. |
| `IMG_9316` | no | - | New sample; Stage3 self drops the leading 7-digit member and promotes bonus, not sparse total-as-member. |
| `IMG_9317` | no | - | New sample; Stage3 self drops the leading 7-digit member and promotes bonus, not sparse total-as-member. |
| `IMG_9318` | no | - | New sample; Stage3 self drops the leading 7-digit member and promotes bonus, not sparse total-as-member. |
| `IMG_9319` | no | - | New sample; mixed small-score shift and Stage3 7-digit member/bonus displacement, not sparse total-as-member. |

## Negative Controls

The simulation was run over:

- `IMG_9308`
- `IMG_9309`
- `IMG_9310`
- `IMG_9311`
- `IMG_9312`
- `IMG_9243`
- `IMG_9257`
- `IMG_9282`
- `IMG_9285`
- `IMG_9251`
- `IMG_9180`
- `IMG_9315`
- `IMG_9316`
- `IMG_9317`
- `IMG_9318`
- `IMG_9319`

Only `IMG_9310.png` Stage3 enemy produced `wouldApply: true`.

## Production Recommendation

Do not enable this in production yet.

The guard is stronger now, but confidence is still limited because there is only one
positive example. The target crop also contains numeric noise such as `220400` and
`61197`; the stricter ordered-trace checks prevent that noise from becoming a valid
repair today, but one sample is not enough to prove the pattern is generally safe.
The `IMG_9315`-`IMG_9319` batch added five negative controls and no new positive
examples.

Recommended next step:

- keep collecting debug artifacts for sparse Stage3 failures
- look for at least two more independent cases with the same exact total/member trace shape
- require those additional cases to have no selected/raw bonus candidate and no competing valid ordered total/member trace
- keep negative-control batches at zero accepted repairs
- only then consider a smartphone-only production helper
