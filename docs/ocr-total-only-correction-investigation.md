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
| Pure total-only known correction entries | 13 |
| Primary total-fix entries with member values also present | 9 |
| Strong total-only candidates | 3 |
| Likely covered by existing generic rules | 1 |
| Should remain individual for now | 10 |
| Needs expected JSON / replay / browser confirmation | 8 |

Notes:

- Counts are conservative and focus on remaining filename-keyed entries in `app/lib/ocrPostProcess.js`.
- Duplicate legacy keys with mojibake filenames are treated as legacy fixture risk rather than safe total-only candidates.
- Several entries are total-like in effect but also change member slots; these are not safe to treat as total-only.

## B. Strong Total-Only Candidates

These are the best future candidates for removal or a narrow total repair rule, but none should be removed yet without targeted replay proof.

| Correction key | Known corrected values | Observed disabled-key evidence | Assessment |
| --- | --- | --- | --- |
| `IMG_9250.png:stage2` | `enemy: [813535, 805577, 1026618]`, `enemyTotal: 2851053` | Existing audit shows disabled output kept the enemy members correct but `enemyTotal` became `2645730`. | Strong total/crown candidate. The known correction primarily restores the crown-included total once members are already correct. |
| `IMG_9265.png:stage2` | `enemy: [958341, 1283744, 650240]`, `enemyTotal: 3149073` | No expected JSON yet. User-provided reason says members are correct and total is missing bonus `256748`. | Strong pattern match, but blocked by missing expected JSON. |
| `IMG_9267.png:stage2` | `self: [1187687, 666434, 696773]`, `selfTotal: 2788431` | No expected JSON yet. User-provided reason says members are correct and total is missing bonus `237537`. | Strong pattern match, but blocked by missing expected JSON. |

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
| `IMG_9265.png:stage2` | `enemyTotal: 3149073` | Add expected JSON and replay with key disabled. |
| `IMG_9267.png:stage2` | `selfTotal: 2788431` | Add expected JSON and replay with key disabled. |
| `IMG_9283.png:stage2` | `selfTotal: 2560470` | Add expected JSON and replay; user history suggests members may already be correct but total misses crown. |
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

This shape would likely cover the `IMG_9250.png:stage2` class, and may eventually cover `IMG_9265.png:stage2`, `IMG_9267.png:stage2`, and `IMG_9283.png:stage2` after expected JSON exists.

## G. Recommendation

Classification: **C. needs more data**.

Production implementation is not recommended yet.

Why:

- The strongest active proven example, `IMG_9250.png:stage2`, still needs a narrow total+crown rule that can distinguish explicit crown totals from unrelated aggregate values.
- Several promising cases are blocked by missing expected JSON.
- Legacy total-only corrections do not have enough disabled-key/raw-candidate evidence.
- Sparse rows mix total repair with blank-slot preservation, which is already high-risk.

Recommended next steps:

1. Add expected JSON for `IMG_9265`, `IMG_9267`, and `IMG_9283`.
2. Re-run `--audit-disable-known-correction` for:
   - `IMG_9250.png:stage2`
   - `IMG_9265.png:stage2`
   - `IMG_9267.png:stage2`
   - `IMG_9283.png:stage2`
3. If at least three cases show "members unchanged, total missing explicit crown", design a small smartphone-only total+crown restoration rule.
4. Keep all existing total-only known corrections until replay proof exists.

## Validation Notes

Attempted grouped replay commands for total-only candidates timed out in this environment. No production files were changed.

Normal safety checks were not re-run to completion in this pass because OCR commands were timing out; generated OCR reports were restored afterward.
