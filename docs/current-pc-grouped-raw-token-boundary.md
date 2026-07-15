# Current-PC Grouped Raw Token Boundary Analysis

Generated from the current-PC baseline artifacts after `ab62a68 Add current PC grouped raw token simulation`.

This is runner-only analysis. It does not change production OCR, browser OCR, smartphone OCR, or legacy desktop OCR.

## Summary

- Dataset: 38 current-PC screenshots with expected fixtures
- Baseline result: 2 PASS / 36 FAIL / 0 unresolved
- Simulation: `currentPcGroupedRawTokenEvidenceSimulation`
- Result: 7 TP / 0 FP / 8 FN / 213 blocked
- Additional true positives beyond `currentPcExactRawEquationRecoverySimulation`: 4
- Production recommendation: do not productionize yet

The TP/FN boundary is clear: true positives have either an exact grouped member token in the member-row ROI with ordered member-row evidence, or exact grouped total evidence that unlocks a unique equation from already parsed members. The false negatives are not mostly over-strict guard rejects; they mix bonus digit-drop, 7-digit member split/drop, wrong bonus extraction, and selected member OCR errors.

## True Positives

| screenshot | stage/side | expected role/value unlocked | grouped token evidence | source ROI / provenance | equation | exact raw covered | extra beyond exact raw |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-07-11_223346581.png` | S2 enemy | total `356377`, member3 `45196` | `356 377` space total, `45.196` period total | total-direct/pass1, total-trace/pass1; member row parsed `178014,133167,45196` | `178014 + 133167 + 45196 = 356377` | yes | no |
| `2026-07-11_223753187.png` | S1 enemy | member1 `497467` | `497.467` period member | member-row/pass1, ordered before `180814,141128`; total `819409` parsed | `497467 + 180814 + 141128 = 819409` | no | yes |
| `2026-07-11_223950902.png` | S3 self | total `2562217` | `2 562 217` space total | total-direct/pass1 and total-trace/pass1; members parsed in member row | `1029553 + 809360 + 723304 = 2562217` | yes | no |
| `スクリーンショット 2026-07-11 145215861.png` | S1 enemy | member1 `147462` | `147.462` period member | member-row/pass1, ordered before `98618,34333`; total `280413` parsed | `147462 + 98618 + 34333 = 280413` | no | yes |
| `スクリーンショット 2026-07-14 061151691.png` | S1 self | member2 `94758` | `641.744`, `94.758`, `130.373` period total trace | total-trace/pass1; member row has parsed bonus `128348` | `641744 + 94758 + 130373 + 128348 = 995223` | yes | no |
| `スクリーンショット 2026-07-14 061545315.png` | S3 enemy | member1 `121819` | `121.819` period member | member-row/pass1, ordered before `148410,526989`; total `797218` parsed | `121819 + 148410 + 526989 = 797218` | no | yes |
| `スクリーンショット 2026-07-15 130026795.png` | S3 enemy | member3 `257247` | `257.247` period member | member-row/pass1, ordered after `826565,339339`; total `1423151` parsed | `826565 + 339339 + 257247 = 1423151` | no | yes |

## False Negatives

| screenshot | stage/side | expected | actual | grouped evidence | exact blocker | sub-pattern |
| --- | --- | --- | --- | --- | --- | --- |
| `2026-07-11_223152331.png` | S2 self | members `140204,357612,536797`, bonus `107359`, total `1141972` | members correct, total `1045348`, bonus missing | `357.612` period total trace | bonus OCR is `10735`, not exact `107359`; no exact bonus evidence | total-only bonus digit-drop |
| `2026-07-11_223714046.png` | S3 self | `795562,1237121,1256926`, bonus `251385`, total `3540994` | `795562,25138,0`, total correct | `3 540 994` total, `237.171` noisy total trace | 7-digit members are split/merged in raw text; bonus is `25138` not exact `251385` | 7-digit member split plus bonus digit-drop |
| `2026-07-11_223950902.png` | S1 self | `440366,382382,545988`, bonus `109197`, total `1477933` | member3 `545983`, total `1379650`, bonus missing | period total trace has `440.366,382.382,545.988` | member3 exact exists only in total trace; bonus OCR is `10919`; no exact bonus | member digit error plus bonus digit-drop |
| `スクリーンショット 2026-07-11 144908802.png` | S1 self | `711565,317040,96328`, bonus `142313`, total `1267246` | bonus `142513` selected as member3 | period/space total trace has member values | expected bonus is not exact in raw; wrong bonus `142513` competes | bonus OCR confusion |
| `スクリーンショット 2026-07-14 060926190.png` | S1 self | `765002,78697,125572`, bonus `153000`, total `1122271` | members correct, total `1102271`, bonus missing | period total trace has all members | raw bonus is `133000`, not exact `153000`; no exact bonus | total-only bonus OCR error |
| `スクリーンショット 2026-07-14 060926190.png` | S3 self | `1077558,683656,125626`, bonus `215511`, total `2102351` | `683656,125626,0`, total correct | `125 626` space total trace | member1 is parsed but selected drops it; bonus evidence is wrong (`58683`) | Stage3 self displacement plus missing bonus |
| `スクリーンショット 2026-07-14 061634001.png` | S3 self | `1275772,1126492,344320`, bonus `255154`, total `3001738` | `126492,255154,0`, total correct | `344.320` period member, `3 001 738` total | 7-digit member1/member2 are split/dropped; only member3 and bonus are exact | 7-digit member split/drop |
| `スクリーンショット 2026-07-15 130019543.png` | S1 enemy | `579071,170491,234685`, bonus `115814`, total `1100061` | member1 `979071`, total `1499561`, bonus missing | period/space total trace has expected members | bonus OCR is `115314`, not exact; selected member1 has wrong leading digit | member digit error plus bonus OCR error |

## TP vs FN Boundary

| dimension | TP behavior | FN behavior |
| --- | --- | --- |
| grouping shape | period or space grouped tokens; no comma promotion needed | same grouped shapes can appear, but not enough to solve the equation |
| role ROI | member-row tokens are strongest when ordered with parsed row values; total tokens are useful only when they complete an equation | many FNs have values in total trace only, or have member row text with split/merged 7-digit values |
| member evidence | all three members are either parsed, ordered in member row, or recoverable from a strict grouped member token | at least one member is a digit error, split 7-digit value, or not candidateized exactly |
| bonus evidence | exact bonus is absent when no bonus is needed, or exact bonus is parsed | expected bonus is missing, digit-dropped, or replaced by a nearby wrong bonus |
| total evidence | exact displayed total exists as parsed or grouped evidence | total often exists, but exact member/bonus evidence is incomplete |
| equation | exactly one interpretation | zero exact interpretations under strict guards |
| competing interpretations | none | mostly no competing exact interpretation; instead there is missing exact evidence |
| parser collision | safe when selected result differs but corrected equation is unique | unsafe where selected wrong bonus/member is close to expected but not exact |

## FN Sub-Patterns

| sub-pattern | count | cases | safe runner-only refinement? | reason |
| --- | ---: | --- | --- | --- |
| total-only bonus digit-drop/OCR error | 3 | `223152331 S2 self`, `060926190 S1 self`, partly `223950902 S1 self` | no | expected bonus is not exact in raw candidates; fixing would require digit repair or near-value inference |
| bonus OCR confusion | 2 | `144908802 S1 self`, `130019543 S1 enemy` | no | wrong bonus-like values are present and close; exact expected bonus is missing |
| 7-digit member split/drop | 3 | `223714046 S3 self`, `061634001 S3 self`, partly `060926190 S3 self` | no | current grouped-token simulation is not a 7-digit repair engine; exact members are split/merged or missing |
| exact member in grouped total trace but missing bonus | 1 | `223950902 S1 self` | no | member can be recovered, but exact bonus is still missing |

No FN sub-pattern has at least two confirmed positives with complete exact member, bonus, total, role, and unique-equation evidence. A separate runner-only refinement is therefore not justified yet.

## Combined Recovery Potential

- `currentPcExactRawEquationRecoverySimulation`: 4 TP / 0 FP
- `currentPcGroupedRawTokenEvidenceSimulation`: 7 TP / 0 FP
- Grouped/raw additional TPs beyond exact raw: 4
- Combined unique runner-only recoverable cases: 8

The combined set is not production-ready because the remaining FNs show multiple unresolved evidence gaps rather than one safely recurring strict shape.

## Recommendation

Do not productionize grouped/raw token promotion yet.

The next safe work is more evidence collection for:

- exact bonus extraction in current-PC result rows
- 7-digit member split/drop recovery in member-row text
- bbox or token geometry for total-trace values that look like member scores

Any future refinement should remain a separate runner-only simulation unless it has repeated positives, exact role/ROI evidence, exact equation support, no competing interpretations, and zero false positives across the full 38-sample current-PC baseline.
