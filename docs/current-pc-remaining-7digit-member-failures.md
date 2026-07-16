# Current-PC Remaining 7-Digit Member Failures

This is an investigation-only audit after the current-PC production recoveries:

- `currentPcGroupedRawTokenRecovery`
- `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery`

It intentionally does not change OCR output and does not add a new simulation. The remaining failures are focused on expected 7-digit member values that are still not selected after excluding the known production-recovered true positives.

## Summary

- current-PC expected fixtures: 48
- 7-digit member miss records before excluding production recoveries: 33
- remaining 7-digit member miss records after excluding grouped/raw and Stage3 bonus-displacement TP rows: 24
- remaining affected stage/side rows: 20
- rows with clean exact 7-digit member evidence still unselected: 7 records across 7 stage/sides
- rows with only raw-text exact digits, fragments, or absent exact value: 17 records
- new runner-only simulation added: no
- production recommendation: do not productionize yet

The most promising residual cluster is `clean-exact-7digit-present-unselected`, but most positives are blocked by missing or OCR-confused bonus evidence. A generic rule would otherwise have to infer bonus from total deltas, which is exactly the unsafe pattern called out by the bonus diagnostics.

## Cluster Breakdown

| cluster | 7-digit miss records | affected stage/sides | notes |
| --- | ---: | ---: | --- |
| partial-fragments-only | 11 | 8 | Expected member appears only as fragments such as `1,002` for `1,002,602`, or a low suffix selected as a member. |
| clean-exact-7digit-present-unselected | 7 | 7 | Exact 7-digit candidate exists, usually in member-row evidence, but bonus/member displacement prevents a unique safe equation. |
| raw-text-exact-digits-unparsed | 4 | 4 | Exact digits appear in raw text, often concatenated with adjacent values, but are not parsed as a clean candidate. |
| exact-value-absent-from-evidence | 2 | 2 | Expected 7-digit value is not present in parsed candidates, grouped tokens, or useful raw text. |

## Remaining Affected Cases

| image | stage/side | missing expected 7-digit members | selected members | expected bonus | expected total | evidence class | exact member evidence | exact total evidence | exact bonus evidence | blocker |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| `2026-07-11_223152331.png` | S3 self | member3 `1002602 -> 0` | `698916 / 0 / 0` | 0 | 2509764 | partial-fragments-only | no | yes | yes | member appears only as fragmented text; selected total is member1-like. |
| `2026-07-11_223346581.png` | S3 self | member2 `1360665 -> 364665` | `745929 / 364665 / 937345` | 272133 | 3316072 | exact-value-absent-from-evidence | no | yes | yes | exact expected member absent. |
| `2026-07-11_223426685.png` | S3 self | member2 `1262179 -> 859213` | `262179 / 859213 / 252435` | 252435 | 3277252 | partial-fragments-only | no | yes | yes | member appears as suffix/fragment; bonus selected as member3. |
| `2026-07-11_223513004.png` | S3 self | member2 `1262179 -> 859213` | `262179 / 859213 / 252435` | 252435 | 3277252 | partial-fragments-only | no | yes | yes | duplicate surface of the previous pattern. |
| `2026-07-11_223613166.png` | S3 self | member3 `1121803 -> 0` | `717313 / 846891 / 0` | 0 | 2686007 | partial-fragments-only | no | yes | yes | member appears only as low fragment text. |
| `2026-07-11_223613166.png` | S3 enemy | member1 `1314244 -> 43501`; member2 `1043501 -> 841605` | `43501 / 841605 / 262848` | 262848 | 3462198 | clean exact plus partial fragment | partial | yes | yes | member1 has exact evidence, but member2 is not exact; no complete unique interpretation. |
| `2026-07-11_223714046.png` | S3 self | member2 `1237121 -> 25138`; member3 `1256926 -> 0` | `795562 / 25138 / 0` | 251385 | 3540994 | raw-text exact plus absent | raw text only | yes | yes | concatenated raw text is not a clean candidate; second 7-digit absent. |
| `2026-07-11_223753187.png` | S3 self | member1 `1072082 -> 820114` | `820114 / 923776 / 214416` | 214416 | 3030388 | raw-text-exact-digits-unparsed | raw text only | yes | yes | exact digits are concatenated with member2; not parsed as a clean candidate. |
| `2026-07-11_223834078.png` | S3 self | member3 `1406672 -> 2813` | `683470 / 1406 / 2813` | 281334 | 3312553 | partial-fragments-only | no | yes | yes | member is split into low fragments; no clean member candidate. |
| `2026-07-11_223834078.png` | S3 enemy | member1 `1017535 -> 580090` | `580090 / 905641 / 0` | 0 | 2503266 | raw-text-exact-digits-unparsed | raw text only | yes | yes | exact digits are concatenated with selected member text. |
| `2026-07-11_223907986.png` | S3 self | member3 `1130649 -> 22612` | `875583 / 930873 / 22612` | 226129 | 3163234 | partial-fragments-only | no | yes | yes | member is only partially represented. |
| `2026-07-11_223950902.png` | S3 enemy | member2 `1091658 -> 864388` | `91658 / 864388 / 218351` | 218331 | 2939245 | partial-fragments-only | no | yes | no | member appears as suffix; bonus evidence is OCR-confused. |
| `スクリーンショット 2026-07-11 145038835.png` | S3 self | member2 `1043301 -> 875583` | `899855 / 875583 / 708660` | 208660 | 3027399 | clean-exact-7digit-present-unselected | yes | yes | no | clean member exists, but selected bonus/member value is wrong; exact bonus absent. |
| `スクリーンショット 2026-07-11 145126932.png` | S3 self | member1 `1079689 -> 419172` | `419172 / 944928 / 215037` | 215937 | 2659726 | clean-exact-7digit-present-unselected | yes | yes | no | clean member exists; bonus is near-wrong (`215037` vs `215937`). |
| `スクリーンショット 2026-07-12 223701314.png` | S3 self | member2 `1081712 -> 237132` | `763742 / 237132 / 716342` | 216342 | 2298928 | clean-exact-7digit-present-unselected | yes | yes | no | clean member exists, but bonus-like selected value is wrong. |
| `スクリーンショット 2026-07-14 060926190.png` | S3 self | member1 `1077558 -> 683656` | `683656 / 125626 / 0` | 215511 | 2102351 | clean-exact-7digit-present-unselected | yes | yes | no | clean member exists, but bonus evidence is missing/wrong and row has blank slot. |
| `スクリーンショット 2026-07-14 061325391.png` | S3 self | member1 `1033971 -> 191935`; member2 `1191935 -> 883071` | `191935 / 883071 / 738387` | 238387 | 3347364 | raw-text exact plus partial fragment | raw text only | yes | no | two 7-digit members affected; bonus selected as member3. |
| `スクリーンショット 2026-07-14 061634001.png` | S3 self | member1 `1275772 -> 126492`; member2 `1126492 -> 255154` | `126492 / 255154 / 0` | 255154 | 3001738 | partial-fragments-only | no | yes | yes | two 7-digit members are fragments; no clean candidate. |
| `スクリーンショット 2026-07-15 130012999.png` | S3 self | member2 `1392453 -> 826413` | `835922 / 826413 / 278450` | 278490 | 3333278 | clean-exact-7digit-present-unselected | yes | yes | no | clean member exists; bonus is near-wrong (`278450` vs `278490`). |
| `スクリーンショット 2026-07-15 130026795.png` | S3 self | member1 `1011663 -> 938246` | `938246 / 505356 / 0` | 202332 | 2657597 | clean-exact-7digit-present-unselected | yes | yes | no | clean member exists; exact bonus absent and selected row has blank slot. |

## Evidence Completeness

### Clean Exact Member Evidence

Seven records have a clean exact 7-digit expected member candidate in parsed/raw member evidence. They are the only plausible near-term recovery surface.

However:

- 6 of 7 are blocked by missing or OCR-confused exact bonus evidence.
- 1 of 7 (`2026-07-11_223613166.png` S3 enemy) has exact bonus and one exact 7-digit member, but another expected 7-digit member is still only a fragment/low-value displacement, so the full row is not uniquely reconstructable.

This means there is no recurring cluster that satisfies the full simulation guard.

### Raw Text Only

Four records include exact digits only in raw text, often because member values are concatenated:

- `1.072,082820,114`
- `1.017,535580,090`
- `1.033,971.,191,935`
- similar adjacent member-row strings

These need better token/geometry parsing before they can support a safe recovery.

### Fragment-Only / Missing Evidence

Thirteen records are fragment-only or exact-value-absent. These are not candidates for selection recovery; they need OCR evidence capture improvement first.

## Overlap With Existing Recoveries

- The 10 grouped/raw production TP rows were excluded from this audit.
- The 8 Stage3 7-digit bonus-displacement production TP rows were excluded from this audit.
- The remaining clean-member cases overlap strongly with the bonus OCR diagnostics: exact total and exact 7-digit member may exist, but exact bonus evidence is missing or wrong.
- Bonus OCR diagnostics remain the blocker for most clean-member residuals, but bonus inference from total delta is still unsafe.

## Simulation Decision

No runner-only simulation was added.

The closest candidate shape would be a `currentPcStage3CleanSevenDigitMemberWithBonusEvidenceSimulation`, but it does not meet the required bar:

- at least 2 confirmed positives with exact member evidence: yes
- exact displayed total evidence: yes
- exact bonus evidence when needed: no for most positives
- exact equation with unique interpretation: no
- no competing interpretation: not proven
- zero false positives across all 48 fixtures: not testable without a complete guard

## Recommended Next Safest Work

Do not productionize a member-selection rule yet.

The next safest work is still evidence capture:

1. Improve current-PC Stage3 member-row tokenization for concatenated adjacent members, while keeping it runner-only first.
2. Improve bonus OCR evidence capture enough that exact bonuses like `208660`, `215937`, `216342`, `278490`, and `202332` appear as exact candidates.
3. Re-run this audit after bonus/member-row evidence improves. A strict recovery may become possible if exact member, exact bonus, exact total, and a unique equation are all present.

## Validation Notes

- A full current-PC baseline rerun was attempted but timed out after producing partial artifacts.
- This report uses the existing full current-PC 48-fixture evidence artifacts from the latest current-PC investigation, then excludes the grouped/raw and Stage3 bonus-displacement true-positive keys from the production recoveries.
- `npm run build` was run after this docs-only investigation.

