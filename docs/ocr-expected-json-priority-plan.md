# OCR Expected JSON Priority Plan

## A. Summary

This plan identifies missing expected JSON files that would most improve proof for removing filename-keyed OCR known corrections.

Current state:

- Proven removed known corrections:
  - `IMG_9074.png:stage2`
  - `IMG_9245.png:stage1`
  - `IMG_9245.png:stage2`
- Remaining filename-keyed corrections are still kept unless a disabled-key runner replay or browser/manual replay proves generic OCR rules already cover them.
- The broad audit found many remaining candidates are blocked because the source image exists but no expected JSON exists.

Primary blockers:

- `IMG_9250`
- `IMG_9254`
- `IMG_9257`
- `IMG_9264` through `IMG_9268`
- `IMG_9281` through `IMG_9285`

All listed images are present under:

```text
test-images/user-reports/unreviewed/
```

## B. High Priority Expected JSON Additions

These images should be reviewed first because they each unlock one or more likely known-correction removal proofs.

| Image | Known correction keys | Expected JSON status | Why it matters | Likely correction type | Priority | Manual values needed |
| --- | --- | --- | --- | --- | --- | --- |
| `IMG_9250.png` | `IMG_9250.png:stage2`, `IMG_9250.png:stage3` | missing | One image covers both high-member/crown displacement and sparse trailing-zero behavior. It also has a multi-field stage3 correction, so full expected JSON is needed before removing anything. | crown/bonus, sparse trailing zero, total-only | high | Full 3-stage expected values. Pay special attention to S2 enemy, S3 self, and S3 enemy members/totals. |
| `IMG_9254.png` | `IMG_9254.png:stage2`, `IMG_9254.png:stage3` | missing | Two correction keys in one image. Stage2 is crown-as-member with missing real member; Stage3 includes member correction plus leading-digit total repair. | crown/bonus, sparse/noise, total repair | high | Full expected JSON. Confirm S2 self members/total and S3 self members/total. |
| `IMG_9264.png` | `IMG_9264.png:stage2`, `IMG_9264.png:stage3` | missing | Two correction keys in one image. Good test of high-member recovery plus sparse enemy blank-slot preservation. | crown/bonus, sparse trailing zero | high | Full expected JSON. Confirm S2 enemy members/total and S3 enemy `[member1, member2, 0]` / total. |
| `IMG_9266.png` | `IMG_9266.png:stage2`, `IMG_9266.png:stage3` | missing | Two correction keys in one image. Good coverage of high member replacing bonus-as-member and total missing crown bonus on another side. | crown/bonus, total-only | high | Full expected JSON. Confirm S2 self members/total and S3 enemy members/total. |
| `IMG_9281.png` | `IMG_9281.png:stage2`, `IMG_9281.png:stage3` | missing | Two correction keys. Stage2 high member + crown-as-member; Stage3 sparse two-member side. Good public-user sparse/high-score coverage. | crown/bonus, sparse trailing zero | high | Full expected JSON. Confirm S2 enemy members/total and S3 self `[member1, member2, 0]` / total. |

## C. Medium Priority Expected JSON Additions

These are valuable but either cover fewer correction keys or are less immediately useful than the high-priority batch.

| Image | Known correction keys | Expected JSON status | Why it matters | Likely correction type | Priority | Manual values needed |
| --- | --- | --- | --- | --- | --- | --- |
| `IMG_9265.png` | `IMG_9265.png:stage2` | missing | Single correction where members are believed correct but total needs crown bonus. Useful for proving total preservation/general total+crown handling. | total-only, crown/bonus | medium | Full expected JSON. Confirm S2 enemy total includes crown bonus. |
| `IMG_9267.png` | `IMG_9267.png:stage2` | missing | Single correction where members are believed correct but total misses crown bonus. Similar to `IMG_9265`, useful for repeated evidence. | total-only, crown/bonus | medium | Full expected JSON. Confirm S2 self members and crown-included total. |
| `IMG_9268.png` | `IMG_9268.png:stage2` | missing | Single high-member recovery correction. Adds evidence for seven-digit member handling. | crown/bonus, missing high member | medium | Full expected JSON. Confirm S2 self members/total. |
| `IMG_9282.png` | `IMG_9282.png:stage2`, `IMG_9282.png:stage3` | missing | Two keys, but Stage2 is a very high-score row and may remain image-specific; Stage3 sparse one-member is still useful. | crown/bonus, sparse trailing zero, high-score order | medium | Full expected JSON. Confirm S2 self high-score row and S3 self sparse one-member total. |
| `IMG_9284.png` | `IMG_9284.png:stage2`, `IMG_9284.png:stage3` | missing | Stage2 has both self and enemy corrections in one key, plus Stage3 sparse one-member. Useful but more complex to prove safely. | crown/bonus, sparse trailing zero, total-only | medium | Full expected JSON. Confirm S2 self, S2 enemy sparse, and S3 self sparse values. |
| `IMG_9285.png` | `IMG_9285.png:stage2`, `IMG_9285.png:stage3` | missing | Stage2 high-member/total-like displacement and Stage3 sparse one-member total. Useful after higher-priority examples are registered. | total-like, sparse trailing zero | medium | Full expected JSON. Confirm S2 self members/total and S3 self sparse total. |

## D. Low Priority / Postpone

| Image | Known correction keys | Expected JSON status | Reason to postpone |
| --- | --- | --- | --- |
| `IMG_9283.png` | `IMG_9283.png:stage2`, `IMG_9283.png:stage3` | missing | Useful, but similar to `IMG_9265`/`IMG_9267` for total-missing-crown and sparse one-member. Register after the first total-only and sparse examples are proven. |
| `IMG_9257.png` | `IMG_9257.png:stage2` | missing | Valuable high-member/crown-as-member case, but only one correction key. Register after multi-key images unless this exact screenshot is easy to manually confirm. |

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
| `IMG_9074` | exists | Known correction already removed after runner proof. |

## F. Recommended Next Batch Size

Recommended next manual/browser verification batch: **5 images**.

Best next batch:

1. `IMG_9250.png`
2. `IMG_9254.png`
3. `IMG_9264.png`
4. `IMG_9266.png`
5. `IMG_9281.png`

Why this batch:

- It covers 10 correction keys across 5 images.
- It includes both crown/high-member and sparse trailing-zero cases.
- It includes at least one multi-field key (`IMG_9250.png:stage3`) that should not be removed without full-stage proof.
- It provides stronger evidence than testing many single-key images with no expected JSON.

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
node scripts/ocr-test-images.mjs IMG_9250 IMG_9254 IMG_9264 IMG_9266 IMG_9281
```

7. Then replay removal proof one key at a time:

```bash
node scripts/ocr-test-images.mjs IMG_9250 --audit-disable-known-correction IMG_9250.png:stage2
node scripts/ocr-test-images.mjs IMG_9250 --audit-disable-known-correction IMG_9250.png:stage3
node scripts/ocr-test-images.mjs IMG_9254 --audit-disable-known-correction IMG_9254.png:stage2
node scripts/ocr-test-images.mjs IMG_9254 --audit-disable-known-correction IMG_9254.png:stage3
node scripts/ocr-test-images.mjs IMG_9264 --audit-disable-known-correction IMG_9264.png:stage2
node scripts/ocr-test-images.mjs IMG_9264 --audit-disable-known-correction IMG_9264.png:stage3
node scripts/ocr-test-images.mjs IMG_9266 --audit-disable-known-correction IMG_9266.png:stage2
node scripts/ocr-test-images.mjs IMG_9266 --audit-disable-known-correction IMG_9266.png:stage3
node scripts/ocr-test-images.mjs IMG_9281 --audit-disable-known-correction IMG_9281.png:stage2
node scripts/ocr-test-images.mjs IMG_9281 --audit-disable-known-correction IMG_9281.png:stage3
```

8. Classify each key:
   - A: safe removal with runner proof
   - B: promising but needs browser/manual confirmation
   - C: keep individual
   - D: not enough data

Do not remove a multi-field key unless every corrected field in that key is proven covered.
