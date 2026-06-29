# OCR Expected JSON Priority Plan

## A. Summary

This plan identifies missing expected JSON files that would most improve proof for reducing filename-keyed OCR known corrections.

Current state after the fixture blocker fixes through `b81d8b2`:

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
  - `IMG_9282`
  - `IMG_9283`
  - `IMG_9284`
  - `IMG_9285`

The next useful fixtures are images that still have filename-keyed known corrections but no expected JSON. These are now mostly:

- `IMG_9257`
- `IMG_9268`

`IMG_9268` is still high value but currently blocked: Stage3 enemy visually needs a crown-included total, but the runner does not extract the visual `+77249` bonus as a reliable structured numeric candidate.

All listed images are expected under:

```text
test-images/user-reports/unreviewed/
```

## B. High Priority Expected JSON Additions

These images should be reviewed first because they unlock either repeated proof for an existing generic rule or useful evidence for the next narrow rule.

| Image | Known correction keys | Expected JSON status | Why it matters | Likely correction type | Priority | Manual values needed |
| --- | --- | --- | --- | --- | --- | --- |
| `IMG_9268.png` | `IMG_9268.png:stage2` | missing / blocked | Single Stage2 high-member recovery case, but the full fixture is blocked by Stage3 enemy total evidence: visual `964109 + 77249 = 1041358`, while `77249` is not extracted as a reliable structured bonus candidate. | crown/bonus, missing high member, Stage3 total crown blocker | high | Full 3-stage expected values. Confirm S2 self members `[1479757, 685860, 808810]` and total `3270378`; separately confirm S3 enemy bonus `77249` and total `1041358` before adding a fixture. |

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
| `IMG_9282` | exists | Added after the sparse row blocker was fixed with a targeted known correction. Replay `IMG_9282.png:stage2` and `IMG_9282.png:stage3` individually before removal decisions. |
| `IMG_9283` | exists | Stage2/Stage3 remain useful disabled-key replay targets. |
| `IMG_9284` | exists | Stage2/Stage3 remain useful disabled-key replay targets. |
| `IMG_9285` | exists | Added after tightening the Stage2 total bonus recovery guard. Replay Stage2/Stage3 keys individually before removal decisions. |
| `IMG_9074` | exists | Known correction already removed after runner proof. |

## F. Recommended Next Batch Size

Recommended next manual/browser verification batch: **2 images**.

Best next batch:

1. `IMG_9268.png`
2. `IMG_9257.png`

Why this batch:

- `IMG_9268` is the only former high-priority fixture still blocked, and resolving its Stage3 enemy bonus evidence would unlock the full fixture.
- `IMG_9257` is the remaining compact high-member/crown-as-member case without expected JSON.
- The former `IMG_9282`/`IMG_9283`/`IMG_9284`/`IMG_9285` batch now has fixtures, so the next work there should be disabled-key proof rather than fixture creation.

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
node scripts/ocr-test-images.mjs IMG_9268 IMG_9257
```

7. Then replay removal proof one key at a time:

```bash
node scripts/ocr-test-images.mjs IMG_9268 --audit-disable-known-correction IMG_9268.png:stage2
node scripts/ocr-test-images.mjs IMG_9257 --audit-disable-known-correction IMG_9257.png:stage2
```

8. Classify each key:
   - A: safe removal with runner proof
   - B: promising but needs browser/manual confirmation
   - C: keep individual
   - D: not enough data

Do not remove a multi-field key unless every corrected field in that key is proven covered.
