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
- a single OCR trace contains the exact sequence: `proposedTotal / proposedMember1 / proposedMember2 / proposedMember3`
- the selected member row contains `proposedMember1 / proposedMember2 / proposedMember3`

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

Only `IMG_9310.png` Stage3 enemy produced `wouldApply: true`.

## Production Recommendation

Do not enable this in production yet.

The guard is promising, but it has only one positive example. The target crop also
contains competing numeric noise such as `220400` and `61197`, so more samples are
needed before this becomes a browser/runtime OCR rule.

Recommended next step:

- keep collecting debug artifacts for sparse Stage3 failures
- look for at least two more cases with the same exact total/member trace shape
- only then consider a smartphone-only production helper
