# Current-PC Partial Fragment 7-Digit Investigation

This investigation follows `docs/current-pc-remaining-7digit-member-failures.md` and focuses only on the 11 records classified as `partial-fragments-only`.

Scope:

- current-PC only
- investigation/docs only
- no final OCR output changes
- no production recovery
- no filename-specific or screenshot-specific logic
- no near-match guessing

## Summary

- partial-fragment-only records: 11
- affected stage/side rows: 8
- all affected rows are Stage3
- all fragments come from current-PC member-row OCR and sometimes the total-trace echo of that row
- exact total evidence exists for all 11 records
- exact bonus evidence exists for 7 records
- all seven digits of the expected member are not present as reliable ordered fragments in any record
- new runner-only simulation added: no
- productionization recommendation: no

These are not safe reconstruction cases. The recurring symptom is digit loss or segmentation collapse: OCR usually preserves a prefix-like fragment, suffix-like fragment, or low selected value, but not enough evidence to reconstruct the exact 7-digit member without guessing.

## Cluster Breakdown

| cluster | records | affected rows | examples | simulation safety |
| --- | ---: | ---: | --- | --- |
| leading digit(s) dropped, suffix selected | 5 | 5 | `1262179 -> 262179`, `1043501 -> 43501`, `1091658 -> 91658`, `1191935 -> 191935`, `1126492 -> 126492` | unsafe; missing leading digits must be inferred |
| prefix fragment only | 4 | 4 | `1002602 -> 1,002`, `1121803 -> 1,121`, `1406672 -> 1,406`, `1130649 -> 1,130` | unsafe; trailing digits missing or OCR-confused |
| multiple 7-digit members affected in one row | 3 | 3 | `223613166` S3 enemy, `061325391` S3 self, `061634001` S3 self | unsafe; competing reconstruction required |
| bonus/member displacement mixed with fragments | 5 | 5 | bonus or bonus-like value selected as a member | unsafe; overlaps with bonus evidence blockers |
| exact bonus missing or OCR-confused | 4 | 4 | `223834078`, `223907986`, `223950902`, `061325391` | unsafe; equation cannot be independently validated |

## Records

| screenshot | stage/side | expected member | expected members | expected bonus | expected total | selected members | selected bonus | selected total | fragments | fragment source | blocker |
| --- | --- | ---: | --- | ---: | ---: | --- | ---: | ---: | --- | --- | --- |
| `2026-07-11_223152331.png` | S3 self | 1002602 | `808246 / 698916 / 1002602` | 0 | 2509764 | `698916 / 0 / 0` | 0 | 808246 | `1,002` at member-row index 33; `1.002` at total-trace index 27 | member row + total trace | prefix fragment only; trailing digits missing. |
| `2026-07-11_223426685.png` | S3 self | 1262179 | `903425 / 1262179 / 859213` | 252435 | 3277252 | `262179 / 859213 / 252435` | 0 | 1373827 | `262,179` at member-row index 23; `262 179` at total-trace index 21 | member row + total trace | leading digit dropped; bonus selected as member3. |
| `2026-07-11_223513004.png` | S3 self | 1262179 | `903425 / 1262179 / 859213` | 252435 | 3277252 | `262179 / 859213 / 252435` | 0 | 1373827 | `262,179` at member-row index 23; `262 179` at total-trace index 21 | member row + total trace | duplicate OCR surface of previous row. |
| `2026-07-11_223613166.png` | S3 self | 1121803 | `717313 / 846891 / 1121803` | 0 | 2686007 | `717313 / 846891 / 0` | 0 | 1564204 | `1,121` at member-row index 33; `1.121` at total-trace index 28 | member row + total trace | prefix fragment only; total trace also includes noisy `BO`. |
| `2026-07-11_223613166.png` | S3 enemy | 1043501 | `1314244 / 1043501 / 841605` | 262848 | 3462198 | `43501 / 841605 / 262848` | 0 | 1147954 | `043,501` at member-row index 10 | member row | leading digits dropped; another 7-digit member exists cleanly but full row remains ambiguous. |
| `2026-07-11_223834078.png` | S3 self | 1406672 | `683470 / 941077 / 1406672` | 281334 | 3312553 | `683470 / 1406 / 2813` | 0 | 687689 | `1,406` at member-row index 37; `1.406` at total-trace index 27 | member row + total trace | prefix fragment only; bonus evidence is not exact. |
| `2026-07-11_223907986.png` | S3 self | 1130649 | `875583 / 930873 / 1130649` | 226129 | 3163234 | `875583 / 930873 / 22612` | 0 | 1829068 | `1,130` at member-row index 36 | member row | prefix fragment only; bonus evidence is not exact. |
| `2026-07-11_223950902.png` | S3 enemy | 1091658 | `764868 / 1091658 / 864388` | 218331 | 2939245 | `91658 / 864388 / 218351` | 0 | 1174397 | `091,658` at member-row index 10 | member row | leading digit dropped; bonus is OCR-confused as `218351`. |
| `スクリーンショット 2026-07-14 061325391.png` | S3 self | 1191935 | `1033971 / 1191935 / 883071` | 238387 | 3347364 | `191935 / 883071 / 738387` | 0 | 1813393 | `191,935` at member-row index 11 | member row | leading digit dropped; member1 is also raw-text-only, and bonus is confused. |
| `スクリーンショット 2026-07-14 061634001.png` | S3 self | 1275772 | `1275772 / 1126492 / 344320` | 255154 | 3001738 | `126492 / 255154 / 0` | 0 | 381646 | `1.275` at member-row index 0 | member row | only prefix fragment; multiple members affected. |
| `スクリーンショット 2026-07-14 061634001.png` | S3 self | 1126492 | `1275772 / 1126492 / 344320` | 255154 | 3001738 | `126492 / 255154 / 0` | 0 | 381646 | `126,492` at member-row index 12 | member row | leading digit dropped; multiple members affected. |

## Fragment Evidence Details

### Prefix-Only Fragments

These records retain the first group of the 7-digit score, but not the full value:

- `1002602` appears only as `1,002`
- `1121803` appears only as `1,121`
- `1406672` appears only as `1,406`
- `1130649` appears only as `1,130`
- `1275772` appears only as `1.275`

The fragments are in the correct row and rough member position, but trailing digits are missing or replaced by OCR noise. Reconstruction would require guessing missing digits from the expected fixture or total equation.

### Leading-Digit Drops

These records retain a suffix-like value:

- `1262179 -> 262179`
- `1043501 -> 043501`
- `1091658 -> 091658`
- `1191935 -> 191935`
- `1126492 -> 126492`

The suffix is usually adjacent to a member slot and appears in the correct visual order, but one or more leading digits are absent. Without exact leading-digit evidence, reconstructing the full value would be digit-drop inference.

### Multi-Value Rows

Three rows require more than one repair:

- `2026-07-11_223613166.png` S3 enemy: one clean 7-digit member exists, but the second expected 7-digit member is only a fragment.
- `スクリーンショット 2026-07-14 061325391.png` S3 self: one expected member is raw-text-only and another is a suffix fragment; bonus is also wrong.
- `スクリーンショット 2026-07-14 061634001.png` S3 self: two 7-digit members are fragment-only and member3 is not selected.

These rows cannot support a narrow single-fragment simulation.

## Simulation Decision

No runner-only simulation was added.

The partial-fragment cluster fails the required bar:

- at least 2 confirmed positives: yes
- all digits exist in fragments: no
- fragment order is spatially reliable: partial, but only text-index order is available in current artifacts
- exact total evidence exists: yes
- exact bonus evidence when needed: no for 4 records
- selected/reconstructable members are exact: no for multi-repair rows
- exact equation validates reconstructed value: only if missing digits are inferred
- unique interpretation: no
- zero false positives across 48 fixtures: not testable without unsafe reconstruction

## Overlap With Existing Recoveries

- `currentPcGroupedRawTokenRecovery` already handles complete grouped/raw token equations. These fragment rows lack complete exact grouped tokens.
- `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery` handles complete Stage3 member/member/member/bonus/total evidence. These fragment rows lack at least one exact member or exact bonus.
- Recovery precedence should not change. Any future fragment work should run as evidence capture before selection/recovery, not as a late correction.

## Production Recommendation

Do not productionize fragment reconstruction.

Most rows would require one of the unsafe actions this project has been avoiding:

- inventing missing leading digits,
- appending missing trailing digits,
- deriving members from total equations,
- treating low suffixes as repaired 7-digit values,
- recovering bonus from total delta.

## Recommended Next Step

The safest next step is runner-only evidence capture, not recovery:

1. Add slot-aligned OCR diagnostics for Stage3 current-PC member rows.
2. Capture per-slot crops around the third member area where prefix-only fragments occur.
3. Compare alternate preprocessing/PSM variants for exact 7-digit member recovery.
4. Only consider simulation if a variant produces exact full 7-digit candidates in at least two rows with zero false positives.

## Validation Notes

- This report uses the existing current-PC 48-fixture evidence artifacts.
- No OCR code was changed.
- `npm run build` was run after this docs-only investigation.

