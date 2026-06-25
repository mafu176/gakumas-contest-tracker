# OCR Total-Only Correction Investigation

Date: 2026-06-25

## Scope

This is a documentation-only investigation of filename-keyed OCR known corrections that only change totals, or primarily fix totals while member values are already correct.

No production OCR code was changed. No known corrections were removed.

Inputs reviewed:

- `app/lib/ocrPostProcess.js`
- `docs/ocr-known-correction-removal-candidates.md`
- `docs/ocr-geometry-audit-report.md`
- `docs/ocr-member-order-audit-report.md`
- `scripts/ocr-test-images.mjs`

## A. Summary Counts

| Category | Count |
| --- | ---: |
| Pure total-only known correction entries | 12 |
| Primary total-fix entries with member values also present | 6 |
| Strong total-only candidates remaining | 0 |
| Likely covered by existing generic rules | 1 |
| Should remain individual for now | 10 |
| Needs expected JSON / replay / browser confirmation | 5 |

Notes:

- Counts are conservative and focus on remaining filename-keyed entries in `app/lib/ocrPostProcess.js`.
- Duplicate legacy keys with mojibake filenames are treated as legacy fixture risk rather than safe total-only candidates.
- Several entries are total-like in effect but also change member slots; these are not safe to treat as total-only.

## B. Strong Total-Only Candidates

The previously strongest total-only candidates have now been handled by the smartphone total crown bonus recovery rule committed in `8639930`.

| Correction key | Known corrected values | Observed disabled-key evidence | Assessment |
| --- | --- | --- | --- |
| `IMG_9250.png:stage2` | `enemy: [813535, 805577, 1026618]`, `enemyTotal: 2851053` | Disabled-key replay showed members were correct and total was member sum only. | Removed after generic rule. |
| `IMG_9265.png:stage2` | `enemy: [958341, 1283744, 650240]`, `enemyTotal: 3149073` | Disabled-key replay with expected JSON showed members were correct and total was member sum only. | Removed after generic rule. |
| `IMG_9267.png:stage2` | `self: [1187687, 666434, 696773]`, `selfTotal: 2788431` | Disabled-key replay with expected JSON showed members were correct and total was member sum only. | Removed after generic rule. |

No active remaining correction is currently classified as a strong total-only removal candidate.

## C. Candidates Likely Covered By Existing Generic Rules

| Correction key | Reason | Removal status |
| --- | --- | --- |
| `IMG_9266.png:stage3` | Previously proven safe after adding expected JSON; full image still passed with this key disabled. | Already removed in `4b4f58f`, so it is no longer an active known correction. |

No additional active total-only correction is proven removable at this time.

## D. Candidates That Should Remain Individual

These either need the individual key based on existing replay evidence, or are old fixture/legacy corrections without enough raw before-value evidence.

| Correction key | Known corrected values | Reason to keep |
| --- | --- | --- |
| `IMG_9163.png:stage3` | `self: [393410, 34311, 0]`, `selfTotal: 506403` | Existing audit-disable replay produced `selfTotal: 427721`; this depends on crown/bonus total selection and sparse slots, not a safe generic total-only case. |
| `IMG_9166.png:stage1` | `selfTotal: 280103` | Pure total-only, but no safe structural proof yet. Needs targeted replay/browser confirmation. |
| `IMG_9166.png:stage2` | `self: [165356, 0, 0]`, `selfTotal: 198427` | Existing audit-disable replay kept sparse members but changed `selfTotal` to `363783`; keep individual until sparse displayed-total preservation is better proven. |
| `IMG_9283.png:stage3` | `self: [177045, 0, 0]`, `selfTotal: 177045` | Existing audit-disable replay output `[177045]`, `selfTotal: 201312`; sparse one-member total inflation remains individual. |
| `IMG_9285.png:stage3` | `self: [243617, 0, 0]`, `selfTotal: 292340` | Existing audit-disable replay output `[243617, 48723]`, `selfTotal: 292540`; sparse/crown and OCR delta are mixed. |
| `high2.png:stage2` | `selfTotal: 1037652` | Legacy high-score fixture, pure total-only but no raw disabled-key evidence in current reports. |
| `high2.png:stage3` | `enemyTotal: 1158564` | Legacy high-score fixture, pure total-only but no raw disabled-key evidence in current reports. |
| `high3.png:stage3` | `selfTotal: 836204` | Legacy high-score fixture, pure total-only but no raw disabled-key evidence in current reports. |
| `normal3.png:stage2` | `enemyTotal: 697625` | Legacy fixture, pure total-only but no raw disabled-key evidence in current reports. |
| `IMG_9085.png:stage1` | `selfTotal: 305080` | Pure total-only, but stage has normal member-sum mismatch/crown-like behavior; keep until targeted replay proves safe. |

## E. Cases Needing Expected JSON Or Browser Confirmation

| Correction key | Known corrected values | Needed evidence |
| --- | --- | --- |
| `IMG_9283.png:stage2` | `selfTotal: 2560470` | Add expected JSON and replay; user history suggests members may already be correct but total misses crown. This is the closest remaining total-only-like candidate. |
| `IMG_8942.png:stage2` | `enemyTotal: 362105` | Legacy total-only correction; needs targeted no-known replay and raw candidates. |
| `IMG_8943.png:stage1` | `enemyTotal: 248127` | Legacy total-only correction; needs targeted no-known replay and raw candidates. |
| `IMG_8944.png:stage3` | `selfTotal: 874690` | Legacy total-only correction; needs targeted no-known replay and raw candidates. |
| `IMG_8946.png:stage3` | `selfTotal: 954046` | Legacy total-only correction; needs targeted no-known replay and raw candidates. |
| `IMG_8948.png:stage2` | `enemyTotal: 316233` | Legacy total-only correction; needs targeted no-known replay and raw candidates. |
| `IMG_9070.png:stage2` | `selfTotal: 615933` | Legacy total-only correction; needs targeted no-known replay and raw candidates. |
| `IMG_8936.png:stage3` | `selfTotal: 605482` | Legacy total-only correction; needs targeted no-known replay and raw candidates. |

## F. Possible Safe Generic Rule Shape

Recommendation for a future rule, not implemented here:

1. Scope to smartphone/mobile OCR only.
2. Apply after member selection and after crown/bonus identification.
3. Require members to be stable:
   - selected non-zero member set must match the expected visible member candidates from member zones, or
   - the member set must be unchanged by the proposed repair.
4. Require strong total evidence:
   - a displayed total candidate exists in raw total candidates, or
   - `memberSum + explicitCrownBonus` exactly equals a candidate total, or
   - existing selected total equals `memberSum` while an explicit crown/plus candidate exists and `memberSum + crown` matches a known total candidate.
5. Do not repair totals from numeric range alone.
6. Do not apply to tiny sparse enemy-score cases such as `IMG_9251.png:*`.
7. Do not apply when member slots are also changing, unless the member repair has already been proven by a separate rule.

This shape now covers the `IMG_9250.png:stage2`, `IMG_9265.png:stage2`, and `IMG_9267.png:stage2` class through `applySmartphoneTotalCrownBonusRecovery(...)`. It may eventually cover `IMG_9283.png:stage2` after expected JSON and disabled-key proof exist.

## G. Recommendation

Classification: **C. needs more data** for any further total-only removals.

No additional production total-only implementation is recommended yet.

Why:

- The strongest three examples were already generalized and removed in `8639930`.
- Remaining promising cases are blocked by missing expected JSON or mixed sparse/member-order behavior.
- Legacy total-only corrections do not have enough disabled-key/raw-candidate evidence.
- Sparse rows mix total repair with blank-slot preservation, which is already high-risk.

Recommended next steps:

1. Add expected JSON for `IMG_9283` and any other remaining total-only-like user reports.
2. Re-run `--audit-disable-known-correction` for:
   - `IMG_9283.png:stage2`
3. Keep all existing remaining total-only known corrections until replay proof exists.

## Validation Notes

Earlier grouped replay commands for total-only candidates timed out in this environment. Later targeted replays and expected fixtures supported the `8639930` generic rule.

Refresh after `8639930`: targeted safety checks were rerun for the current total crown bonus class and related smoke images. Generated OCR reports were restored afterward.
