# OCR Expected JSON Priority Plan

## A. Summary

This plan identifies missing expected JSON files that would most improve proof for reducing filename-keyed OCR known corrections.

Current state after `545bceb`:

- Remaining filename-keyed known corrections: `76`
- Proven removed known corrections: `7`
  - `IMG_9074.png:stage2`
  - `IMG_9245.png:stage1`
  - `IMG_9245.png:stage2`
  - `IMG_9266.png:stage3`
  - `IMG_9250.png:stage2`
  - `IMG_9265.png:stage2`
  - `IMG_9267.png:stage2`
- Expected JSON now exists for the former high-priority batch:
  - `IMG_9250`
  - `IMG_9254`
  - `IMG_9264`
  - `IMG_9265`
  - `IMG_9266`
  - `IMG_9267`
  - `IMG_9281`

The next useful fixtures are images that still have filename-keyed known corrections but no expected JSON. These are mostly:

- `IMG_9257`
- `IMG_9268`
- `IMG_9282`
- `IMG_9283`
- `IMG_9284`
- `IMG_9285`

All listed images are expected under:

```text
test-images/user-reports/unreviewed/
```

## B. High Priority Expected JSON Additions

These images should be reviewed first because they unlock either repeated proof for an existing generic rule or useful evidence for the next narrow rule.

| Image | Known correction keys | Expected JSON status | Why it matters | Likely correction type | Priority | Manual values needed |
| --- | --- | --- | --- | --- | --- | --- |
| `IMG_9283.png` | `IMG_9283.png:stage2`, `IMG_9283.png:stage3` | missing | Stage2 is the closest remaining total-only-like case after total crown bonus recovery. Stage3 is sparse one-member total inflation. This image can test whether the new total recovery should eventually cover another case or whether it remains individual. | total-only/crown, sparse trailing zero, possible total inflation | high | Full 3-stage expected values. Confirm S2 self members/total and visible bonus; confirm S3 self one-member sparse total. |
| `IMG_9285.png` | `IMG_9285.png:stage2`, `IMG_9285.png:stage3` | missing | Covers a Stage2 high-member/total-like displacement and a Stage3 sparse one-member total correction. The raw-token audit already flagged it as blocked by missing expected JSON. | total-like member suppression, sparse trailing zero, total delta | high | Full 3-stage expected values. Confirm S2 self members/total and S3 self `[member1, 0, 0]` / total. |
| `IMG_9282.png` | `IMG_9282.png:stage2`, `IMG_9282.png:stage3` | missing | Two correction keys. Stage2 is a high-score row with bonus/member displacement; Stage3 is sparse one-member with crown total. Adds coverage for seven-digit members and sparse preservation. | crown/bonus, high-score row, sparse trailing zero | high | Full 3-stage expected values. Confirm S2 self high-score members/total and S3 self sparse one-member total. |
| `IMG_9284.png` | `IMG_9284.png:stage2`, `IMG_9284.png:stage3` | missing | Stage2 has a multi-field key correcting both self and enemy, and Stage3 is sparse one-member. This is high payoff, but more complex than single-side keys. | crown/bonus, sparse trailing zero, multi-field stage correction | high | Full 3-stage expected values. Confirm S2 self, S2 enemy `[member1, 0, 0]`, and S3 self sparse total. |
| `IMG_9268.png` | `IMG_9268.png:stage2` | missing | Single Stage2 high-member recovery case. Useful repeated evidence for crown bonus exclusion where a seven-digit member is missing and bonus is selected as a member. | crown/bonus, missing high member | high | Full 3-stage expected values. Confirm S2 self members `[1479757, 685860, 808810]` and total `3270378`, plus all other stages. |

## C. Medium Priority Expected JSON Additions

These are valuable but either cover fewer correction keys or are likely to remain individual without a broader structural rule.

| Image | Known correction keys | Expected JSON status | Why it matters | Likely correction type | Priority | Manual values needed |
| --- | --- | --- | --- | --- | --- | --- |
| `IMG_9257.png` | `IMG_9257.png:stage2` | missing | Single high-member/crown-as-member case. It would provide another seven-digit member recovery example, but it has lower payoff than the multi-key `IMG_928x` images. | crown/bonus, missing high member | medium | Full expected JSON. Confirm S2 enemy members `[653777, 1054601, 859926]`, total `2779224`, and visible bonus `210920`. |

## D. Low Priority / Postpone

| Image or group | Reason to postpone |
| --- | --- |
| Legacy fixture keys such as `next1`, `next4`, `normal*`, `high*`, mojibake filenames | These are old fixture or broad replacement corrections with little raw before-value evidence. Expected JSON alone is unlikely to make them safely removable. |
| Tiny sparse enemy corrections for `IMG_9251.png:*` | Expected JSON already exists through the browser fallback path, but these should remain individual because generic numeric rules would be too risky. |
| Digit-drop candidates such as `IMG_9243.png:stage2` | Expected JSON exists, but production digit-drop recovery is not recommended yet. More raw-token/geometry evidence is needed before removing individual corrections. |
| Member-order candidates such as `IMG_9240.png:stage3`, `IMG_9254.png:stage3`, `IMG_9281.png:stage3` | Expected JSON exists for these, but bbox-backed audits still classify them as risky. Missing expected JSON is not the primary blocker. |

## E. Images Already Covered By Expected JSON

These images already have expected JSON and can be used for disabled-key proof without adding new expected files:

| Image | Current status | Notes |
| --- | --- | --- |
| `IMG_9163` | exists | Known corrections currently remain individual; disabled-key replay still fails stage1/stage3. |
| `IMG_9165` | exists | `IMG_9165.png:stage2` remains individual; disabled-key replay produces member2 `78295` instead of expected `94205`. |
| `IMG_9166` | exists | `IMG_9166.png:stage2` remains individual because total regresses without the key. |
| `IMG_9180` | exists | Safety smoke target. |
| `IMG_9203` | exists | Regression target. |
| `IMG_9211` | exists | Regression target. |
| `IMG_9222` | exists | Multiple stage1 issues remain individual without key. |
| `IMG_9240` | exists | Stage1/stage3 corrections remain individual without key. |
| `IMG_9243` | exists | Digit-drop/fragment candidate; not safe for production generalization yet. |
| `IMG_9245` | exists | Stage1 and stage2 known corrections already removed after runner proof. |
| `IMG_9250` | exists | Stage2 correction removed by total crown bonus recovery. Stage3 remains individual. |
| `IMG_9254` | exists | Stage2 and Stage3 remain individual; expected JSON is no longer the blocker. |
| `IMG_9264` | exists | Stage2 and Stage3 remain individual; expected JSON is no longer the blocker. |
| `IMG_9265` | exists | Stage2 correction removed by total crown bonus recovery. |
| `IMG_9266` | exists | Stage3 correction removed; Stage2 remains individual. |
| `IMG_9267` | exists | Stage2 correction removed by total crown bonus recovery; Stage1 remains individual. |
| `IMG_9281` | exists | Stage2/Stage3 remain individual; expected JSON is no longer the blocker. |
| `IMG_9074` | exists | Known correction already removed after runner proof. |

## F. Recommended Next Batch Size

Recommended next manual/browser verification batch: **5 images**.

Best next batch:

1. `IMG_9283.png`
2. `IMG_9285.png`
3. `IMG_9282.png`
4. `IMG_9284.png`
5. `IMG_9268.png`

Why this batch:

- It covers `9` remaining filename-keyed correction keys across `5` images.
- It includes the closest remaining total-only-like candidate: `IMG_9283.png:stage2`.
- It includes several sparse one-member/two-member cases needed to evaluate trailing-zero preservation limits.
- It adds more seven-digit member / crown-as-member examples without touching production logic.
- It avoids cases where expected JSON already exists and the blocker is now digit-drop/member-order risk rather than fixture coverage.

## G. Exact Next Manual / Browser Verification Checklist

For each image in the next batch:

1. Open the image in the actual browser OCR UI using normal mobile/smartphone mode.
2. Record full expected values, not just the corrected stage:
   - Stage1 self members and total
   - Stage1 enemy members and total
   - Stage2 self members and total
   - Stage2 enemy members and total
   - Stage3 self members and total
   - Stage3 enemy members and total
3. Preserve sparse empty slots as `0` in expected JSON.
4. Confirm visible crown/bonus behavior:
   - identify whether the displayed total includes a crown bonus
   - verify that crown bonus is not a member score
5. Create one expected JSON file per image using the existing regression schema.
6. Run targeted validation:

```bash
node scripts/ocr-test-images.mjs IMG_9283 IMG_9285 IMG_9282 IMG_9284 IMG_9268
```

7. Then replay removal proof one key at a time:

```bash
node scripts/ocr-test-images.mjs IMG_9283 --audit-disable-known-correction IMG_9283.png:stage2
node scripts/ocr-test-images.mjs IMG_9283 --audit-disable-known-correction IMG_9283.png:stage3
node scripts/ocr-test-images.mjs IMG_9285 --audit-disable-known-correction IMG_9285.png:stage2
node scripts/ocr-test-images.mjs IMG_9285 --audit-disable-known-correction IMG_9285.png:stage3
node scripts/ocr-test-images.mjs IMG_9282 --audit-disable-known-correction IMG_9282.png:stage2
node scripts/ocr-test-images.mjs IMG_9282 --audit-disable-known-correction IMG_9282.png:stage3
node scripts/ocr-test-images.mjs IMG_9284 --audit-disable-known-correction IMG_9284.png:stage2
node scripts/ocr-test-images.mjs IMG_9284 --audit-disable-known-correction IMG_9284.png:stage3
node scripts/ocr-test-images.mjs IMG_9268 --audit-disable-known-correction IMG_9268.png:stage2
```

8. Classify each key:
   - A: safe removal with runner proof
   - B: promising but needs browser/manual confirmation
   - C: keep individual
   - D: not enough data

Do not remove a multi-field key unless every corrected field in that key is proven covered.
