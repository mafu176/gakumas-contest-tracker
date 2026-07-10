# Smartphone OCR Stage3 Self 7-Digit Displacement Investigation

## Summary

This report documents a runner-only simulation for a Stage3 self failure pattern
seen in the `IMG_9315`-`IMG_9319` user samples.

Production OCR now includes the strict version of this recovery for Stage3 self
only. No filename/stage-specific known correction was added.

## Pattern

The common shape is:

- Stage3 self has a real 7-digit member score.
- Current OCR drops that 7-digit member from the selected member set.
- The crown/bonus value is selected as a member, usually member3.
- Current total often becomes the sum of the wrong selected member set.

This differs from `sparseTotalAsMemberSimulation`: it is not a sparse enemy row
where the selected total is actually member1.

## Simulation And Production Guard

The debug artifact field is:

```text
stage3SelfSevenDigitDisplacementSimulation
```

It records:

- current members, total, member sum, and total-minus-member-sum
- clean 7-digit candidates seen in member/total/debug candidate pools
- explicit and inferred bonus candidates
- total evidence sources, including direct total crop, alternative total traces, selected member row text, parsed large total-like candidates, and audit-only split/joined digit candidates
- equation proposals using `[sevenDigitCandidate, currentMember1, currentMember2] + bonus`
- `wouldApply`, `wouldApplyWithEnhancedTotalEvidence`, and rejection reasons

The production recovery follows the same strict shape and only applies when:

- the source is smartphone OCR
- the side is exactly Stage3 self
- current total equals the selected member sum
- three non-zero values are selected as members
- selected member3 is a plausible bonus value
- a clean exact 7-digit candidate is available
- the 7-digit candidate is present in member-row candidates
- the candidate plus current member1/member2 plus bonus exactly matches an extracted displayed total candidate
- exactly one such equation is found

The enhanced total evidence reporting is still runner-only. It can show exact
split/joined totals such as `2` + `714` + `080` -> `2714080`, but those joined
values are marked audit-only and are not used by production OCR unless they are
already present as parsed numeric total candidates.

## IMG_9315-IMG_9319 Classification

| Image | Current Stage3 self | Expected Stage3 self | Classification | Simulation |
| --- | --- | --- | --- | --- |
| `IMG_9315.png` | `899249 / 252319 / 205294`, total `1377391` | `899249 / 252319 / 1026470`, total `2383332` | 7-digit member available, bonus selected as member, but current total is not selected-member sum and displayed-total evidence is inconsistent. | rejects |
| `IMG_9316.png` | `696275 / 382517 / 254602`, total `1333394` | `1273010 / 696275 / 382517`, total `2606404` | Leading 7-digit member dropped; bonus selected as member3. | rejects because exact displayed total evidence is still missing |
| `IMG_9317.png` | `276500 / 804645 / 212015`, total `1293160` | `1060079 / 276500 / 804645`, total `2353239` | Leading 7-digit member dropped; bonus selected as member3. | rejects because exact displayed total evidence is still missing |
| `IMG_9318.png` | `812662 / 938864 / 200281`, total `1951807` | `1001405 / 812662 / 938864`, total `2953212` | Leading 7-digit member dropped; bonus selected as member3. | rejects because exact displayed total evidence is still missing |
| `IMG_9319.png` | `736949 / 549609 / 237920`, total `1524478` | `1189602 / 736949 / 549609`, total `2714080` | Leading 7-digit member dropped; bonus selected as member3. | production recovery applies |

## Simulation Evidence

| Image | Clean 7-digit candidates | Bonus candidates | Result |
| --- | --- | --- | --- |
| `IMG_9315.png` | `1026470`, `2583533`, `2385532` | `20529`, `205294` | Rejects: current total is not selected-member sum; proposed visual total `2383332` has only near wrong evidence `2385532` (delta `2200`). |
| `IMG_9316.png` | `1273010`, `2000404` | `254602` | Rejects: proposed total `2606404` has no parsed or joined exact total evidence. |
| `IMG_9317.png` | `1060079`, `2323239` | `212015` | Rejects: proposed total `2353239` has no parsed or joined exact total evidence. |
| `IMG_9318.png` | `1001405`, `2955212`, `2925212` | `200281` | Rejects: proposed visual total `2953212` has only near wrong evidence `2955212` (delta `2000`). |
| `IMG_9319.png` | `1189602`, `2714080` | `237920` | Would propose `1189602 / 736949 / 549609`, bonus `237920`, total `2714080`; exact parsed and split/joined total evidence is present. |

## Enhanced Total Evidence Result

The enhanced reporting did not unlock `IMG_9316`, `IMG_9317`, or `IMG_9318`.
Those samples still lack exact displayed total evidence in the runner artifacts:

| Image | Expected total | Enhanced exact total evidence | Result |
| --- | ---: | --- | --- |
| `IMG_9315.png` | `2383332` | no; nearest parsed total-like value is `2385532` | rejected |
| `IMG_9316.png` | `2606404` | no exact parsed or split/joined candidate | rejected |
| `IMG_9317.png` | `2353239` | no exact parsed or split/joined candidate | rejected |
| `IMG_9318.png` | `2953212` | no; nearest parsed total-like value is `2955212` | rejected |
| `IMG_9319.png` | `2714080` | yes; parsed `2714080` and split/joined `2` + `714` + `080` | production recovery applies |

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
No false-positive `wouldApplyWithEnhancedTotalEvidence` appeared either.

## Production Status

Strict production recovery is enabled for exact Stage3 self cases only.

The current implementation intentionally fixes only the safe positive:

- `IMG_9319` Stage3 self recovers to `1189602 / 736949 / 549609`, total `2714080`

The other samples remain blocked:

- `IMG_9315` has current-total inconsistency and near-wrong total evidence
- `IMG_9316`-`IMG_9318` have the correct 7-digit candidate, but the displayed total
  is still not extracted as an exact parsed or split/joined candidate

Recommended next step for broader coverage:

- improve runner-only Stage3 self ROI total/member extraction
- look for more samples where the exact displayed total is captured cleanly
- do not loosen production beyond the strict exact-total guard

## IMG_9320-IMG_9337 Follow-up

The `IMG_9320`-`IMG_9337` batch added one new safe positive:

- `IMG_9329` Stage3 self has member-row order `1107136 / 548299 / 567465`
  followed by bonus `221427`, while selected OCR had shifted to
  `548299 / 567465 / 221427`.
- The displayed total was observed as exact joined total fragments
  `2` + `444` + `327` in total-candidate OCR text.
- Production recovery now accepts exact joined total fragments only when the
  member-row candidates contain the leading sequence
  `[sevenDigitCandidate, currentMember1, currentMember2]`.

This keeps the rule from reordering cases where the seven-digit value appears
after the selected members. In particular, `IMG_9319` remains a blocked control
with the current fixture order `736949 / 549609 / 1189602`; it is not corrected
by the new joined-fragment path.

The remaining new failures are classified as unsafe for automatic recovery:

| Pattern | Images |
| --- | --- |
| Stage3 enemy 7-digit/member/bonus displacement | `IMG_9321`, `IMG_9322`, `IMG_9333`, `IMG_9334`, `IMG_9335`, `IMG_9337` |
| Stage3 self displacement without exact guarded total/sequence evidence | `IMG_9323`, `IMG_9324`, `IMG_9328`, `IMG_9336`, `IMG_9337` |
| Stage1/Stage2 row shift, small-score, or total-as-member confusion | `IMG_9320`, `IMG_9323`, `IMG_9333`, `IMG_9335`, `IMG_9337` |

No filename-specific correction was added for those unresolved rows.
