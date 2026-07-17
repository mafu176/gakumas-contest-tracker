# Current-PC July 16/17 Combined Failure Analysis

This report analyzes the ten current-PC fixtures added in the July 16 and July 17 batches. It is investigation-only: no OCR production behavior, smartphone OCR behavior, legacy desktop behavior, recovery rule, expected fixture, or screenshot-specific correction is changed.

## Scope

Fixture-backed images:

- `2026-07-16-062903692`
- `2026-07-16-063008443`
- `2026-07-16-063115987`
- `2026-07-16-063215708`
- `2026-07-16-063330034`
- `2026-07-17-081532057`
- `2026-07-17-081649834`
- `2026-07-17-081731273`
- `2026-07-17-081837850`
- `2026-07-17-081921369`

Dataset status:

- current-PC fixtures after both batches: 58
- inferred full baseline: 3 PASS / 55 FAIL / 0 unresolved
- targeted 10-image baseline: 0 PASS / 10 FAIL / 0 unresolved
- all ten are current-PC layout and have arithmetic-valid expected fixtures
- no exact duplicates were found when each batch was added

Commands run:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline 062903692 063008443 063115987 063215708 063330034 081532057 081649834 081731273 081837850 081921369
node scripts/ocr-test-images.mjs --current-pc-baseline 062903692 063008443 063115987 063215708 063330034 081532057 081649834 081731273 081837850 081921369 --current-pc-stage3-member-row-diagnostics
```

## Important Distinction

The current-PC debug data stores both production recovery result objects and runner-only simulation evidence. In this report:

- **actual applied** means `currentPcGroupedRawTokenRecovery.applied === true` or `currentPcStage3SevenDigitBonusDisplacementRecovery.applied === true`, and the final OCR output was changed.
- **signal only** means a runner/debug simulation had evidence but did not change the final OCR output.
- **evidence only** means raw candidates, total traces, bonus traces, or member-row variants contain useful data but no production recovery applied.

No failing row in this ten-image set had signal-only `wouldApply` without actual application. All `wouldApply` cases were also actual production applications on rows that already pass after recovery.

## Per-Image Summary

| image | full result | failing stage/sides | actual production recovery applied | summary |
| --- | --- | --- | --- | --- |
| `2026-07-16-062903692` | FAIL | S1 self; S2 self; S3 self | grouped/raw on S3 enemy | S1/S2 self are bonus/row-shift issues; S3 self has multi-value Stage3 displacement and only partial 7-digit evidence. |
| `2026-07-16-063008443` | FAIL | S2 enemy; S3 enemy | none | S2 enemy is a small digit delta; S3 enemy has exact 7-digit member evidence but missing exact bonus evidence and competing variant evidence. |
| `2026-07-16-063115987` | FAIL | S1 self; S1 enemy; S2 self; S3 self | grouped/raw on S2 enemy | Mixed total/bonus omissions, one S1 enemy overread, and S3 self multi-member 7-digit loss. |
| `2026-07-16-063215708` | FAIL | S2 enemy; S3 self | none | S2 enemy is a tiny bonus/total delta; S3 self has exact 7-digit member evidence but missing exact bonus evidence. |
| `2026-07-16-063330034` | FAIL | S1 self; S3 self | none | S1 self bonus omitted; S3 self loses all three expected 7-digit members and has noisy variant evidence. |
| `2026-07-17-081532057` | FAIL | S1 self | Stage3 displacement on S3 self | Stage3 self is fixed by existing recovery; remaining failure is S1 self row/bonus displacement. |
| `2026-07-17-081649834` | FAIL | S1 self; S2 enemy | Stage3 displacement on S3 enemy | Stage3 enemy is fixed by existing recovery; remaining failures are total/bonus omissions. |
| `2026-07-17-081731273` | FAIL | S1 enemy; S2 enemy; S3 self | none | Bonus OCR confusion in S1/S2 and S3 self member/bonus displacement remain blocked. |
| `2026-07-17-081837850` | FAIL | S2 self | Stage3 displacement on S3 self; grouped/raw on S3 enemy | Both Stage3 rows are fixed by existing recoveries; remaining failure is S2 self row/bonus shift. |
| `2026-07-17-081921369` | FAIL | S1 self; S3 self; S3 enemy | none | S1 self leading digits drop; S3 self has bonus/member displacement; S3 enemy has a small digit delta. |

## Failing Stage/Side Details

| image | row | expected | selected | raw / rejected evidence | recovery state |
| --- | --- | --- | --- | --- | --- |
| `0716-062903692` | S1 self | `340401/408931/124176 +81786 = 955294` | `340401/408931/124176 +0 = 873508` | exact total present; exact members present; bonus appears only as `1786`, not exact `81786` | no recovery; blocked by missing exact bonus evidence |
| `0716-062903692` | S2 self | `249565/253334/42767 +50666 = 596332` | `253334/42767/50666 +0 = 346767` | exact members and bonus present; displayed total evidence is wrong/partial (`396332`, `296332`) | no recovery; row-shift plus missing exact total evidence |
| `0716-062903692` | S3 self | `721210/1162325/933236 +232465 = 3049236` | `162325/933236/232465 +0 = 1328026` | exact total and bonus present; variant evidence recovers `1162325`; `721210` is not reliably selected; Stage3 recovery rejects shape | no recovery; incomplete multi-value displacement |
| `0716-063008443` | S2 enemy | `87574/148001/160468 +0 = 396043` | `87567/148001/160468 +0 = 396036` | exact total present; `87574` missing, `87567` selected | no recovery; small OCR delta |
| `0716-063008443` | S3 enemy | `364529/396783/1125345 +225069 = 2111726` | `364529/396783/0 +1350414 = 2111726` | exact total and exact `1125345` present; exact bonus missing; member-row variants have unsafe extras and competing interpretations | no recovery; blocked by missing bonus evidence |
| `0716-063115987` | S1 self | `322660/198361/153346 +64532 = 738899` | `322660/198361/153346 +0 = 674367` | exact total and members present; bonus appears as `4532`, not exact | no recovery; missing exact bonus evidence |
| `0716-063115987` | S1 enemy | `99187/74052/88480 +0 = 261719` | `99187/74052/388430 +0 = 561669` | exact total present; expected member3 missing; wrong `388430` selected | no recovery; possible new S1 member overread shape, single example |
| `0716-063115987` | S2 self | `203712/141269/151188 +40742 = 536911` | `203712/141269/151188 +0 = 496169` | exact total and members present; exact bonus missing | no recovery; missing exact bonus evidence |
| `0716-063115987` | S3 self | `1147085/1065321/932605 +229417 = 3374428` | `932605/9417/0 +2432406 = 3374428` | exact total present; member-row diagnostics find noisy variants but no complete exact member set; exact bonus missing | no recovery; multi-member 7-digit loss |
| `0716-063215708` | S2 enemy | `251194/66761/62517 +50238 = 430710` | `251194/66761/62517 +50235 = 430707` | exact members and total present; bonus OCR is near `50235`, not exact `50238` | no recovery; near-match is unsafe |
| `0716-063215708` | S3 self | `713048/1176566/759156 +235313 = 2884083` | `713048/759156/0 +1411879 = 2884083` | exact total and members present; exact bonus missing; variants recover `1176566` but include unsafe extras | no recovery; missing bonus evidence and competing variants |
| `0716-063330034` | S1 self | `317169/137568/172836 +63433 = 691006` | `317169/137568/172836 +0 = 627573` | exact total and members present; exact bonus missing | no recovery; missing exact bonus evidence |
| `0716-063330034` | S3 self | `1035782/1182459/1015625 +236491 = 3470357` | `236491/0/0 +3233866 = 3470357` | exact total and bonus present; no exact members in raw candidates; member-row variants are noisy and incomplete | no recovery; all three 7-digit members lost |
| `0717-081532057` | S1 self | `353959/323803/198784 +70791 = 947337` | `353959/198784/70791 +0 = 623534` | exact total and bonus present; member2 missing from selected row, visible in period-grouped trace | no recovery; row/bonus displacement outside existing Stage3 scope |
| `0717-081649834` | S1 self | `402878/92866/129060 +80575 = 705379` | `402878/92866/129060 +0 = 624804` | exact total present; exact bonus missing | no recovery; missing exact bonus evidence |
| `0717-081649834` | S2 enemy | `202764/185374/176797 +40552 = 605487` | `202764/185374/176797 +0 = 564935` | exact total and members present; bonus only appears as `4055`, not exact | no recovery; missing exact bonus evidence |
| `0717-081731273` | S1 enemy | `181573/214248/496229 +99245 = 991295` | `181573/214248/496229 +59245 = 951295` | exact total and members present; selected bonus is wrong by 40000 | no recovery; bonus OCR confusion |
| `0717-081731273` | S2 enemy | `290366/76793/146082 +58073 = 571314` | `290366/76793/145082 +58073 = 570314` | exact bonus and expected member3 present; displayed total is `571514`/`271014`, not exact `571314` | no recovery; member/total small digit delta |
| `0717-081731273` | S3 self | `718662/947903/547424 +189580 = 2403569` | `718662/947903/139580 +189560 = 1995705` | exact total present; exact bonus missing; member3 not selected; selected bonus is near but wrong | no recovery; bonus/member OCR confusion |
| `0717-081837850` | S2 self | `342056/146994/108788 +68411 = 666249` | `146994/108788/6841 +0 = 262623` | exact total and members present; bonus digit-dropped as `6841` | no recovery; row shift plus bonus digit-drop |
| `0717-081921369` | S1 self | `911800/437754/145468 +182360 = 1677382` | `11800/437754/145468 +0 = 595022` | exact total present; member1 loses leading digits; bonus only appears as `2360` | no recovery; leading digit drop plus missing bonus |
| `0717-081921369` | S3 self | `890501/869851/894265 +178853 = 2833470` | `890501/894265/17885 +0 = 1802651` | exact total present; exact bonus missing; member2/member3 shifted, bonus fragment selected | no recovery; Stage3 member/bonus displacement but not strict enough |
| `0717-081921369` | S3 enemy | `378443/697055/463041 +0 = 1538539` | `378443/697065/463041 +0 = 1538549` | exact total present; `697055` missing, `697065` selected | no recovery; small OCR delta |

## Production Recovery Impact

Actual applied recoveries across all 60 stage/side rows in the ten-image target set:

| recovery | applied rows | affected rows | result |
| --- | ---: | --- | --- |
| `currentPcGroupedRawTokenRecovery` | 3 | `0716-062903692 S3 enemy`; `0716-063115987 S2 enemy`; `0717-081837850 S3 enemy` | all three recovered rows match their fixtures, but the images still fail elsewhere |
| `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery` | 3 | `0717-081532057 S3 self`; `0717-081649834 S3 enemy`; `0717-081837850 S3 self` | all three recovered rows match their fixtures, but the images still fail elsewhere |

Rows with runner/debug signal only but no actual production application: 0.

This means the existing production recoveries are behaving cleanly in this target set: they only apply where the strict guard is satisfied, and they do not create a conflicting proposal on the failing rows.

Applied rows:

- `0716-062903692 S3 enemy`: grouped/raw recovered `31446/597385/293948 +0 = 922779`.
- `0716-063115987 S2 enemy`: grouped/raw recovered `66102/129559/57325 +0 = 252986`.
- `0717-081837850 S3 enemy`: grouped/raw recovered `372430/1071707/850413 +0 = 2294550`.
- `0717-081532057 S3 self`: Stage3 displacement recovered `1252530/1108799/540758 +250506 = 3152593`.
- `0717-081649834 S3 enemy`: Stage3 displacement recovered `621393/1228235/775067 +245647 = 2870342`.
- `0717-081837850 S3 self`: Stage3 displacement recovered `830504/1116491/900834 +223298 = 3071127`.

## Combined Cluster Breakdown

Counts are by affected failing stage/side row unless noted.

| cluster | count | affected examples | conclusion |
| --- | ---: | --- | --- |
| total/bonus selection or omission | 15 | S1/S2 bonus rows across both days; S3 rows with selected total equal to incomplete member sum | Reinforces existing total/bonus blocker. |
| bonus evidence capture missing or OCR-confused | 14 | `0716-062903692 S1 self`; `0717-081649834 S2 enemy`; `0717-081731273 S1 enemy`; `0717-081837850 S2 self` | Most common blocker; exact total is often present but exact bonus is missing, truncated, or wrong. |
| Stage3 clean 7-digit present but unselected | 8 | `0716-063008443 S3 enemy`; `0716-063215708 S3 self`; `0717-081921369 S3 self` | Reinforces existing Stage3 7-digit evidence gap, but many rows still lack exact bonus or uniqueness. |
| Stage3 missing selected member | 7 | `0716-063008443 S3 enemy`; `0716-063330034 S3 self`; `0717-081731273 S3 self` | Usually mixed with bonus/member displacement or partial fragments. |
| partial fragment / digit-drop 7-digit | 6 | `0716-063115987 S3 self`; `0717-081921369 S1 self`; `0717-081921369 S3 self` | Still unsafe; exact digits are not fully available or are only noisy fragments. |
| multi-member displacement | 5 | `0716-062903692 S3 self`; `0716-063330034 S3 self`; `0717-081921369 S3 self` | Existing Stage3 rule intentionally rejects these because more than the strict shape is wrong. |
| small OCR delta / near value | 5 | `0716-063008443 S2 enemy`; `0716-063215708 S2 enemy`; `0717-081921369 S3 enemy` | Near-match inference remains unsafe. |
| already fixed by existing recovery but image still fails elsewhere | 6 rows / 5 images | all applied recovery rows listed above | Existing recoveries help but do not make full images pass when other rows fail. |
| possible new cluster candidate | 1 | `0716-063115987 S1 enemy` member3 overread `88480 -> 388430` | Single example only; not enough for simulation. |

## Stage3 7-Digit Analysis

Stage3 rows with 7-digit risk in this target set:

- failing Stage3 7-digit rows: 8
- exact expected 7-digit member present in raw candidates: 3
- exact expected 7-digit member only visible via text/variant diagnostics: 1 strong row (`0716-062903692 S3 self`) plus several noisy/partial rows
- rows with missing exact bonus evidence: 5
- rows with competing or unsafe member-row variant evidence: 4
- rows matching previous known blocked patterns: 8
- clearly new Stage3 shape: 0

The three actually-applied Stage3 displacement recoveries are not counted as failing rows because their final output already matches the expected rows. The remaining Stage3 failures are blocked by at least one strict guard:

- missing exact bonus evidence,
- incomplete member set,
- multiple missing 7-digit members,
- selected members do not match the strict bonus-displacement shape,
- noisy variant evidence,
- competing interpretations.

This reinforces the earlier conclusion: Stage3 7-digit recovery should not be broadened from the existing production guard yet.

## Total/Bonus Issue Analysis

Total/bonus affected rows in the failing set:

- total/bonus issue rows: 15
- rows with correct displayed total evidence: 13
- rows with exact members already selected: 7
- rows with exact bonus evidence: 3
- rows blocked by missing or OCR-confused bonus evidence: 14
- rows with complete evidence and unique interpretation: 0

The common pattern is not "missing total"; it is "exact total exists but exact bonus evidence is missing or corrupted." Examples:

- bonus dropped entirely: `0716-063115987 S2 self`, `0717-081649834 S1 self`
- bonus truncated: `0717-081649834 S2 enemy` (`4055` for `40552`)
- bonus near but wrong: `0716-063215708 S2 enemy` (`50235` for `50238`)
- bonus selected as member or member fragment: `0717-081837850 S2 self`, `0717-081921369 S3 self`

Because many rows require deriving bonus from `total - memberSum`, productionization would lean on inference rather than independent OCR evidence. That remains too risky.

## Generalization Assessment

No new runner-only simulation was added.

The ten-image batch reinforces existing clusters rather than revealing a new safe recurring target:

- Existing production recoveries are useful and correctly scoped.
- The remaining failures are split across bonus OCR capture, digit-drop, multi-member displacement, noisy variants, and near-value deltas.
- Several rows have exact total and exact members, but not exact bonus evidence.
- Several Stage3 rows have some exact 7-digit evidence, but not a complete unique equation.
- The only possible new cluster, S1 enemy member overread on `0716-063115987`, appears once.

Productionization is **not recommended** from this batch. The safest next work remains diagnostics/audit improvement for exact bonus evidence capture or additional samples that produce repeated exact-evidence positives without competing interpretations.

## Validation

- targeted 10-image current-PC baseline: 0 PASS / 10 FAIL / 0 unresolved
- member-row diagnostics: completed for the affected Stage3 rows
- `npm run build`: PASS
- `node --check scripts/ocr-test-images.mjs`: not run because no script files changed
