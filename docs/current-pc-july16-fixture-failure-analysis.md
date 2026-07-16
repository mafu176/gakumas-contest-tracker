# Current-PC July 16 Fixture Failure Analysis

This report analyzes the five current-PC fixtures added in `69142b5`. It is docs-only investigation; no OCR output, production recovery, smartphone OCR, or legacy desktop OCR behavior is changed.

## Scope

New fixtures:

- `2026-07-16-062903692`
- `2026-07-16-063008443`
- `2026-07-16-063115987`
- `2026-07-16-063215708`
- `2026-07-16-063330034`

Baseline after adding them:

- current-PC fixtures: 53
- PASS: 3
- FAIL: 50
- unresolved: 0
- all five July 16 fixtures fail current OCR

Existing production recoveries:

- `currentPcGroupedRawTokenRecovery`
- `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery`

## Per-Image Summary

| image | status | summary | existing recovery application |
| --- | --- | --- | --- |
| `スクリーンショット 2026-07-16 062903692.png` | FAIL | S1/S2 self bonus/total or row-shift issues; S3 self has Stage3 7-digit/member-bonus displacement with an additional non-7-digit member loss. | grouped/raw applied on S3 enemy only; image still fails elsewhere. |
| `スクリーンショット 2026-07-16 063008443.png` | FAIL | S2 enemy has a small OCR delta; S3 enemy has missing 7-digit member and missing exact bonus evidence. | no production recovery on failing sides. |
| `スクリーンショット 2026-07-16 063115987.png` | FAIL | S1/S2 total/bonus issues; S1 enemy member overread; S3 self has multiple 7-digit losses/fragments. | grouped/raw applied on S2 enemy only; image still fails elsewhere. |
| `スクリーンショット 2026-07-16 063215708.png` | FAIL | S2 enemy has a small bonus OCR delta; S3 self has missing/displaced 7-digit member and missing exact bonus evidence. | no production recovery on failing sides. |
| `スクリーンショット 2026-07-16 063330034.png` | FAIL | S1 self bonus omitted; S3 self has three displaced/missing members and noisy variant evidence. | no production recovery on failing sides. |

## Failing Stage/Side Details

| image | stage/side | expected | selected | raw / total / bonus evidence | recovery state | cluster |
| --- | --- | --- | --- | --- | --- | --- |
| `062903692` | S1 self | members `340401 / 408931 / 124176`, bonus `81786`, total `955294` | members exact, bonus `0`, total `873508` | raw includes exact total `955294`, members, and bonus fragment `1786`; no bonus candidate parsed. | grouped/raw rejected; Stage3 recovery not applicable. | matches total/bonus selection and bonus evidence capture failure. |
| `062903692` | S2 self | members `249565 / 253334 / 42767`, bonus `50666`, total `596332` | `253334 / 42767 / 50666`, bonus `0`, total `346767` | raw includes members and bonus; displayed total candidates are wrong/partial (`396332`, `296332`). | grouped/raw rejected; Stage3 recovery not applicable. | member/bonus displacement plus total OCR confusion. |
| `062903692` | S3 self | members `721210 / 1162325 / 933236`, bonus `232465`, total `3049236` | `162325 / 933236 / 232465`, bonus `0`, total `1328026` | raw includes exact total and exact member2/member3/bonus, but member1 `721210` is not cleanly captured; member-row variants recover member2 `1162325`. | grouped/raw rejected; Stage3 bonus-displacement rejected. | extends Stage3 member-row variant evidence cluster; unsafe because a non-7-digit member is also wrong. |
| `063008443` | S2 enemy | members `87574 / 148001 / 160468`, bonus `0`, total `396043` | `87567 / 148001 / 160468`, bonus `0`, total `396036` | raw includes exact total but member1 is OCR-confused by 7. | grouped/raw rejected; Stage3 recovery not applicable. | small digit OCR delta; unsafe for near-match recovery. |
| `063008443` | S3 enemy | members `364529 / 396783 / 1125345`, bonus `225069`, total `2111726` | `364529 / 396783 / 0`, inferred bonus `1350414`, total `2111726` | raw includes exact total and exact 7-digit member3; no exact bonus evidence. ROI variants recover member3 but introduce noisy candidates. | grouped/raw rejected; Stage3 bonus-displacement rejected. | matches missing selected member plus missing bonus evidence. |
| `063115987` | S1 self | members `322660 / 198361 / 153346`, bonus `64532`, total `738899` | members exact, bonus `0`, total `674367` | raw includes exact total and bonus fragment `4532`; no exact bonus candidate. | grouped/raw rejected; Stage3 recovery not applicable. | total/bonus selection with digit-drop bonus evidence. |
| `063115987` | S1 enemy | members `99187 / 74052 / 88480`, bonus `0`, total `261719` | `99187 / 74052 / 388430`, bonus `0`, total `561669` | raw includes exact total plus wrong member3-like value `388430`. | grouped/raw rejected; Stage3 recovery not applicable. | new/rare lower-stage member overread; likely OCR-confused member value. |
| `063115987` | S2 self | members `203712 / 141269 / 151188`, bonus `40742`, total `536911` | members exact, bonus `0`, total `496169` | raw includes exact total but no exact bonus candidate. | grouped/raw rejected; Stage3 recovery not applicable. | total/bonus selection with missing bonus evidence. |
| `063115987` | S3 self | members `1147085 / 1065321 / 932605`, bonus `229417`, total `3374428` | `932605 / 9417 / 0`, inferred bonus `2432406`, total `3374428` | raw includes exact total and member3; member-row variants recover member1 only; member2 appears only as fragment `65321` and noisy `9065321`. | grouped/raw rejected; Stage3 bonus-displacement rejected. | matches partial-fragment 7-digit and multi-member displacement; unsafe. |
| `063215708` | S2 enemy | members `251194 / 66761 / 62517`, bonus `50238`, total `430710` | members exact, bonus `50235`, total `430707` | raw includes exact total and near bonus `50235`, not exact bonus. | grouped/raw rejected; Stage3 recovery not applicable. | small bonus OCR delta; unsafe for near-match recovery. |
| `063215708` | S3 self | members `713048 / 1176566 / 759156`, bonus `235313`, total `2884083` | `713048 / 759156 / 0`, inferred bonus `1411879`, total `2884083` | raw includes exact total, member1, member2, member3; no exact bonus evidence. ROI variants recover member2 but include unsafe extras. | grouped/raw rejected; Stage3 bonus-displacement rejected. | matches missing selected member plus missing bonus evidence. |
| `063330034` | S1 self | members `317169 / 137568 / 172836`, bonus `63433`, total `691006` | members exact, bonus `0`, total `627573` | raw includes exact total but no exact bonus candidate. | grouped/raw rejected; Stage3 recovery not applicable. | total/bonus selection with absent bonus evidence. |
| `063330034` | S3 self | members `1035782 / 1182459 / 1015625`, bonus `236491`, total `3470357` | `236491 / 0 / 0`, inferred bonus `3233866`, total `3470357` | raw includes exact total and bonus/member-like `236491`; variants recover different exact 7-digit members in different noisy variants. | grouped/raw rejected; Stage3 bonus-displacement rejected. | extends multi-member 7-digit displacement; unsafe due competing/noisy interpretation. |

## Stage3 Recovery Rejection Analysis

| image | stage/side | why `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery` did not apply |
| --- | --- | --- |
| `062903692` S3 self | The strict shape is not met. Exact member2 evidence exists, but member1 `721210` is also wrong and not cleanly recovered. The selected members do not match the Stage3 bonus-displacement proposal shape. |
| `063008443` S3 enemy | Exact member3 `1125345` exists, but the selected row has fewer than four member-row values and exact bonus `225069` is absent. Variants also introduce unsafe extras. |
| `063115987` S3 self | Multiple members are affected. Exact member1 appears in current ROI, member2 is fragment/noisy only, and exact bonus evidence is absent. |
| `063215708` S3 self | Exact member2 is present, but exact bonus `235313` is absent and row variants introduce unsafe extras. |
| `063330034` S3 self | Three members are affected. Different variants recover different 7-digit values, with noisy extras; no unique interpretation is available. |

The recurring rejection reasons are:

- missing exact bonus evidence
- selected members do not match the strict bonus-displacement shape
- member-row has fewer than four values
- multiple 7-digit members affected
- member-row variant evidence exists but is noisy or incomplete

## Member-Row Variant Evidence

The filtered diagnostics pass found:

| image | stage/side | member-row variant result | safety assessment |
| --- | --- | --- | --- |
| `062903692` S3 self | member2 `1162325` recovered by multiple row variants and member2 slot; no unsafe variant extras. | Still unsafe: expected member1 `721210` is also wrong and not recovered, so exact equation recovery would need more than the 7-digit evidence. |
| `063008443` S3 enemy | member3 `1125345` recovered by many variants. | Unsafe: exact bonus missing and variants introduce several unrelated member-sized candidates. |
| `063115987` S3 self | member1 `1147085` recovered; member2 only fragment/noisy evidence. | Unsafe: multiple 7-digit members affected and member2 exact evidence absent. |
| `063215708` S3 self | member2 `1176566` recovered by all major variants including member2 slot. | Unsafe: exact bonus missing and variants include unsafe extras. |
| `063330034` S3 self | member1/member2/member3 appear in separate variants, not as one clean row. | Unsafe: three members affected and variant evidence is noisy/competing. |

## Comparison To Previous Clusters

| cluster | July 16 matches | notes |
| --- | ---: | --- |
| total/bonus selection failure | 5 | S1/S2 self bonus omitted or near bonus selected; same blocker as previous total/bonus reports. |
| bonus evidence capture failure | 5 | Exact bonus often absent, truncated, or near-wrong. This remains the main blocker. |
| Stage3 clean 7-digit present but unselected | 5 | All five have at least one Stage3 7-digit value visible in raw or ROI evidence. |
| Stage3 missing selected member | 4 | Seen in `063008443`, `063115987`, `063215708`, `063330034`. |
| partial fragment / digit-drop 7-digit | 2 | `063115987` member2 and parts of `063330034` match the fragment/noisy shape. |
| multi-member displacement | 2 | `063115987` and `063330034` have multiple affected Stage3 members. |
| small OCR delta / near value | 2 | `063008443` S2 enemy and `063215708` S2 enemy; near-match guessing remains disallowed. |
| already fixed by existing recovery but image fails elsewhere | 2 | grouped/raw applied on `062903692` S3 enemy and `063115987` S2 enemy. |
| possible new cluster candidate | 1 | `063115987` S1 enemy overreads member3 as `388430`; one example only, no rule candidate. |

## Recovery Application Table

| image | production recovery applied | failing-side impact |
| --- | --- | --- |
| `062903692` | grouped/raw on S3 enemy | That side is correct; failures remain on S1 self, S2 self, S3 self. |
| `063008443` | none on failing sides | Stage3 enemy remains blocked by missing bonus evidence. |
| `063115987` | grouped/raw on S2 enemy | That side is correct; failures remain on S1 self/enemy, S2 self, S3 self. |
| `063215708` | none on failing sides | Stage3 self remains blocked by missing bonus evidence and unsafe extras. |
| `063330034` | none on failing sides | Stage3 self remains blocked by multi-member/noisy evidence. |

## Generalization Assessment

No new runner-only simulation was added.

The only recurring shape across at least two new samples is still not safe:

- exact Stage3 7-digit evidence exists,
- but exact bonus evidence is often missing,
- or multiple members are displaced,
- or variant evidence is noisy,
- or the selected row does not match an existing strict recovery shape.

The July 16 samples strengthen the existing conclusion: the next useful work should improve exact bonus evidence capture and possibly separate Stage3 member-row evidence into narrower subpatterns. Productionization is not recommended from this batch.

## Validation

- `npm run build`: PASS.
- `node --check scripts/ocr-test-images.mjs`: not needed; no script changes.
