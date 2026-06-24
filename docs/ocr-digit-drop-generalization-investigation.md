# OCR Digit-Drop Generalization Investigation

## Scope

This investigation reviews whether remaining filename-keyed OCR known corrections can be generalized as missing-digit, dropped-digit, or split-fragment recovery rules.

Read inputs:

- `docs/ocr-known-correction-removal-candidates.md`
- `docs/ocr-known-correction-generalization-audit.md`
- `app/lib/ocrPostProcess.js`
- `app/lib/ocr.js`
- `scripts/ocr-test-images.mjs`

No production OCR code was changed. No known corrections were removed.

## A. Summary Counts

| Classification | Count |
| --- | ---: |
| Promising digit-drop / fragment candidates | 4 |
| Possible digit-drop but needs raw/browser confirmation | 8 |
| Likely unrelated / not digit-drop | 12 |
| Keep individual / avoid generic rule for now | 3 |

The strongest evidence is not a broad "missing one digit" pattern. It is narrower:

- A short fragment is selected as a member while the complete total equation is present or derivable.
- A 5-digit member is selected but a raw 6-digit candidate with one extra leading digit is present.
- A displayed total is visually split and not available as one clean raw candidate.

## B. Promising Digit-Drop Candidates

### `IMG_9163.png:stage1`

Known correction:

- self members `[544861, 0, 0]`
- `selfTotal: 653835`

Observed with `IMG_9163.png:stage1` disabled:

- self members `[6535, 544861, 108972]`
- `selfTotal: 660368`

Classification:

- likely split/fragmented number
- likely total fragment selected as member

Why it suggests digit-drop:

- `6535` is not a plausible member in this row and resembles a leading fragment of displayed total `653835`.
- The expected equation is effectively `544861 + 108972 ~= 653835`.
- The selected `6535` behaves like OCR debris from the displayed total, not a member.

Safe generic rule possibility:

- Possible, but not yet safe.
- A rule could reject a short candidate when it is a prefix-like fragment of a displayed/inferred total and when a sparse one-member-plus-bonus equation explains the side.

False-positive risk:

- Medium to high. Very small true scores exist in sparse enemy rows, especially `IMG_9251`.
- Must require side context, total equation support, and probably self-side / non-tiny-member evidence.

### `IMG_9243.png:stage2`

Known correction:

- enemy members `[190814, 119217, 100783]`
- `enemyTotal: 448976`

Historical browser/raw evidence:

- wrong output was reported as members `[19217, 100783, 38162]`, total `158162`
- raw candidates included `119217`, `100783`, `190814`, `38162`
- displayed total appeared visually as fragmented text like `448 97 6m`, not as clean raw `448976`

Classification:

- likely missing leading digit
- likely split/fragmented displayed total
- crown/bonus value selected as member

Why it suggests digit-drop:

- `19217` is close to `119217` with a dropped leading `1`.
- The correct raw member `119217` was available, but the selected value used the shortened form.
- The total was not a clean raw candidate, which makes generic equation recovery harder.

Safe generic rule possibility:

- Promising only if the raw candidate set contains both `19217` and `119217`, or if geometry strongly identifies the complete member.
- Without the complete raw member, a generic rule would be too risky.

False-positive risk:

- Medium. Adding a leading `1` to arbitrary 5-digit values can corrupt valid scores.

### `IMG_9251.png:stage1`

Known correction:

- enemy members `[219, 0, 0]`
- `enemyTotal: 219`

Known wrong browser pattern:

- enemy members `[2195, 0, 0]`
- `enemyTotal: 2195`

Classification:

- likely extra trailing digit, not dropped digit

Why it suggests digit repair:

- The OCR output appends an extra `5` to a tiny one-member sparse score.

Safe generic rule possibility:

- Not recommended as a general rule yet.
- Tiny true scores are rare but possible, and OCR noise is common.

False-positive risk:

- High. Do not infer tiny scores by stripping trailing digits without a strong visual or signature guard.

### `IMG_9285.png:stage3`

Known correction:

- self members `[243617, 0, 0]`
- `selfTotal: 292340`

Observed with `IMG_9285.png:stage3` disabled:

- self members `[243617, 48723]`
- `selfTotal: 292540`

Classification:

- likely total digit substitution or OCR delta
- sparse slot filled by bonus/noise

Why it suggests digit-drop/digit-error:

- Total differs by `200`, not by a pure crown/member equation.
- This looks more like digit substitution (`340` read as `540`) than missing digit.

Safe generic rule possibility:

- Low for digit-drop.
- Better handled by sparse + total consistency if a reliable displayed total candidate exists.

False-positive risk:

- Medium. A generic `200` correction would be unsafe.

## C. Cases That Are Not Digit-Drop

These cases still need individual known corrections or another generalization theme, but they do not primarily look like missing/dropped digit errors.

| Correction key | Reason |
| --- | --- |
| `IMG_9163.png:stage3` | Disabled output keeps members `[393410, 34311]` but total falls to raw member sum `427721`; this is crown-included total selection, not digit-drop. |
| `IMG_9166.png:stage2` | Disabled output keeps sparse member but total becomes `363783` instead of `198427`; this is wrong total reconstruction, not digit-drop. |
| `IMG_9222.png:stage1` | Disabled output has crown/member swap and partial enemy equation; no clear single digit recovery. |
| `IMG_9240.png:stage1` | Disabled output swaps member3 and crown bonus; not digit-drop. |
| `IMG_9240.png:stage3` | Disabled output order is wrong and total is `966556` vs expected `966536`; this is OCR substitution/order, not dropped digit. |
| `IMG_9250.png:stage2` | Disabled output gets enemy members but total misses crown; not digit-drop. |
| `IMG_9250.png:stage3` | Sparse one-member enemy and sparse self corrections; mainly bonus/empty-slot handling. |
| `IMG_9254.png:stage2` | Crown bonus selected as member and real member missing; high-member recovery theme, not digit-drop unless raw member is a dropped candidate. |
| `IMG_9254.png:stage3` | Merged/noise candidate and extra leading total issue; not a clean dropped-digit pattern. |
| `IMG_9257.png:stage2` | Missing 7-digit member and crown-as-member; high-member recovery, not digit-drop. |
| `IMG_9264.png:stage2` | Missing high member and crown-as-member; high-member recovery. |
| `IMG_9264.png:stage3` | Sparse trailing zero with bonus-like member; not digit-drop. |

## D. Cases Needing Manual / Browser Confirmation

These keys may involve digit loss, but the current report does not contain enough raw before-value evidence to prove it.

| Correction key | Current known correction | Why more evidence is needed |
| --- | --- | --- |
| `IMG_8942.png:stage1` | enemy `[80908, 50235, 60437]`, total `207761` | Raw wrong values are not encoded in the known table. Need no-known replay with raw candidates. |
| `IMG_8943.png:stage2` | enemy `[30066, 19634, 9175]`, total `58875` | Could involve small member digit issues, but raw before-values are unknown. |
| `IMG_8948.png:stage1` | enemy `[153458, 119594, 36758]`, total `340501` | Previous OCR work had plan/total issues, but not enough digit-drop evidence here. |
| `IMG_9072.png:stage2` | enemy `[35472, 23596, 0]`, total `59068` | Sparse two-member row; need raw wrong values to distinguish sparse handling from digit-drop. |
| `IMG_9073.png:stage2` | self `[281279, 34002, 26224]`, total `397760` | Possible missing member/total issue, but raw before-values are unknown. |
| `IMG_9074.png:stage2` | enemy `[61448, 32066, 8457]`, total `101971` | Small third member could be digit-sensitive; needs raw replay. |
| `IMG_9086.png:stage2` | enemy `[326409, 82075, 23813]`, total `497578` | Unknown raw before-values. |
| `IMG_9087.png:stage3` | self `[210000, 281439, 615387]`, total `1229903` | Likely member/total selection issue, but raw before-values are needed. |

## E. Suggested Safe Rule Shape

Implementation is not recommended immediately. The safe rule shape should first be prototyped as a debug/audit helper that reports matches without changing output.

Suggested non-mutating detector:

1. Scope to smartphone/mobile only.
2. Collect selected members, raw member candidates, total candidates, and explicit bonus candidates.
3. Look for a selected member candidate that is suspiciously short:
   - fewer digits than neighboring members,
   - not needed by any valid total equation,
   - and prefix/suffix-related to a displayed or inferred total.
4. Look for a complete alternative candidate already present in raw OCR:
   - example: selected `19217`, raw also contains `119217`.
   - prefer the raw complete candidate only if it participates in an exact member sum or member+bonus total equation.
5. Never repair tiny sparse enemy rows by numeric manipulation alone.
6. Never add a leading digit unless the repaired value is already present in raw candidates or uniquely implied by a displayed total with exact equation support.

Potential later production rule:

```text
If selected member X is 4-5 digits,
and raw candidates contain repaired member R where R ends with X or differs by one leading digit,
and replacing X with R creates exactly one valid member/member+bonus=total equation,
then use R.
```

This rule should not repair values by inventing a missing digit unless the repaired candidate was actually observed.

## F. Risks And Cases To Avoid

- Avoid applying digit repair to `IMG_9251.png:*` tiny sparse enemy corrections. These are high-risk and should remain signature/known corrections.
- Avoid stripping trailing digits from small values without visual evidence.
- Avoid adding leading `1` to every 5-digit score. Earlier OCR work already found false leading-one repair bugs.
- Avoid using only numeric range. Real member scores, crown bonuses, and UI noise overlap.
- Avoid generic correction when the correct total is not present and no exact equation exists.
- Be careful with totals like `966556` vs `966536`; this is substitution/tolerance, not digit-drop.

## Recommendation

Do not implement a production digit-drop generalization yet.

Recommended next step:

1. Add an audit-only/no-output-change detector for candidate digit-drop repairs.
2. Run it against known corrections and browser-reported failures.
3. Only promote to production after it proves exact equations on several images without touching `IMG_9251` tiny-score cases.

Top 3 safest investigation candidates:

1. `IMG_9243.png:stage2` - selected `19217` vs raw/correct `119217`, plus fragmented displayed total.
2. `IMG_9163.png:stage1` - selected `6535` appears to be a displayed-total fragment, not a member.
3. `IMG_9074.png:stage2` - small third member correction may be digit-sensitive, but needs raw replay first.

