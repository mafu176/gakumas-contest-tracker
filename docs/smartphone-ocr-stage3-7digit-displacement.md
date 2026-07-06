# Smartphone OCR Stage3 Self 7-Digit Displacement Investigation

## Summary

This report documents a runner-only simulation for a Stage3 self failure pattern
seen in the `IMG_9315`-`IMG_9319` user samples.

No production OCR behavior is changed. No filename/stage-specific known correction
was added.

## Pattern

The common shape is:

- Stage3 self has a real 7-digit member score.
- Current OCR drops that 7-digit member from the selected member set.
- The crown/bonus value is selected as a member, usually member3.
- Current total often becomes the sum of the wrong selected member set.

This differs from `sparseTotalAsMemberSimulation`: it is not a sparse enemy row
where the selected total is actually member1.

## Runner-Only Simulation

The debug artifact field is:

```text
stage3SelfSevenDigitDisplacementSimulation
```

It records:

- current members, total, member sum, and total-minus-member-sum
- clean 7-digit candidates seen in member/total/debug candidate pools
- explicit and inferred bonus candidates
- equation proposals using `[sevenDigitCandidate, currentMember1, currentMember2] + bonus`
- `wouldApply` and rejection reasons

The simulation only proposes a repair when:

- the side is exactly Stage3 self
- current total equals the selected member sum
- three non-zero values are selected as members
- selected member3 is a plausible bonus value
- a clean exact 7-digit candidate is available
- the candidate plus current member1/member2 plus bonus exactly matches a displayed total candidate
- exactly one such equation is found

## IMG_9315-IMG_9319 Classification

| Image | Current Stage3 self | Expected Stage3 self | Classification | Simulation |
| --- | --- | --- | --- | --- |
| `IMG_9315.png` | `899249 / 252319 / 205294`, total `1377391` | `899249 / 252319 / 1026470`, total `2383332` | 7-digit member available, bonus selected as member, but current total is not selected-member sum and displayed-total evidence is inconsistent. | rejects |
| `IMG_9316.png` | `696275 / 382517 / 254602`, total `1333394` | `1273010 / 696275 / 382517`, total `2606404` | Leading 7-digit member dropped; bonus selected as member3. | rejects because exact displayed total equation is not present in current candidate refs |
| `IMG_9317.png` | `276500 / 804645 / 212015`, total `1293160` | `1060079 / 276500 / 804645`, total `2353239` | Leading 7-digit member dropped; bonus selected as member3. | rejects because exact displayed total equation is not present in current candidate refs |
| `IMG_9318.png` | `812662 / 938864 / 200281`, total `1951807` | `1001405 / 812662 / 938864`, total `2953212` | Leading 7-digit member dropped; bonus selected as member3. | rejects because exact displayed total equation is not present in current candidate refs |
| `IMG_9319.png` | `736949 / 549609 / 237920`, total `1524478` | `1189602 / 736949 / 549609`, total `2714080` | Leading 7-digit member dropped; bonus selected as member3. | `wouldApply: true` |

## Simulation Evidence

| Image | Clean 7-digit candidates | Bonus candidates | Result |
| --- | --- | --- | --- |
| `IMG_9315.png` | `1026470`, `2583533`, `2385532` | `20529`, `205294` | Rejects: current total is not selected-member sum; no exact equation. |
| `IMG_9316.png` | `1273010`, `2000404` | `254602` | Rejects: no exact displayed-total equation. |
| `IMG_9317.png` | `1060079`, `2323239` | `212015` | Rejects: no exact displayed-total equation. |
| `IMG_9318.png` | `1001405`, `2955212`, `2925212` | `200281` | Rejects: no exact displayed-total equation. |
| `IMG_9319.png` | `1189602`, `2714080` | `237920` | Would propose `1189602 / 736949 / 549609`, bonus `237920`, total `2714080`. |

## Controls

The simulation was also checked against:

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

No false-positive `wouldApply` appeared in these controls.

## Production Recommendation

Do not enable this in production yet.

The pattern is real and repeated, but the current candidate evidence is not strong
enough for a browser/runtime rule:

- only `IMG_9319` passes the strict equation guard
- `IMG_9316`-`IMG_9318` have the correct 7-digit candidate, but the displayed total
  is not reliably extracted as an exact candidate
- `IMG_9315` has additional total inconsistency and competing total-like candidates
- a future rule would need stronger Stage3 self total extraction or ROI evidence

Recommended next step:

- improve runner-only Stage3 self ROI total/member extraction
- look for more samples where the exact displayed total is captured cleanly
- keep this as simulation-only until at least two more positive examples pass the
  strict guard with zero negative-control accepts
