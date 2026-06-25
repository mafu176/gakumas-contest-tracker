# OCR Total-Only Deep Dive: IMG_9250.png Stage2

Date: 2026-06-25

## A. IMG_9250 Stage2 Known Correction Details

Known correction entry in `app/lib/ocrPostProcess.js`:

```js
"IMG_9250.png:stage2": {
  enemy: [813535, 805577, 1026618],
  enemyTotal: 2851053
}
```

The expected JSON for `IMG_9250` agrees:

| Field | Expected |
| --- | ---: |
| S2 enemy member1 | 813,535 |
| S2 enemy member2 | 805,577 |
| S2 enemy member3 | 1,026,618 |
| S2 enemy total | 2,851,053 |

The correction does not touch Stage2 self. It only ensures Stage2 enemy uses the crown-included total.

## B. Disabled-Correction Observed Output

Command:

```bash
node scripts/ocr-test-images.mjs IMG_9250 --audit-disable-known-correction IMG_9250.png:stage2
```

Result:

- images: 1
- expected: 1
- failed: 1
- only mismatch: `S2 enemy total`

Observed Stage2 enemy with the known correction disabled:

| Field | Observed without key |
| --- | ---: |
| member1 | 813,535 |
| member2 | 805,577 |
| member3 | 1,026,618 |
| total | 2,645,730 |

The members are already correct without the key.

Raw runner evidence for Stage2 enemy:

- `enemyMembers`: `2090, 813535, 805577, 1026618, 205323`
- `enemyTotal`: `813535, 805577, 1026618, 205323`
- total trace text includes `2.851 0535`
- total traces also include explicit crown text such as `+205323`

Important raw traces:

```text
2.851 0535
813,535 805,577 1,026,618
```

```text
813,535 805,577 1,026,618
TTC 4 +205323
```

```text
813,535 805,577 1,026,618
TE oN a +205323
```

## C. Expected Output

Expected Stage2 enemy:

| Field | Expected |
| --- | ---: |
| member1 | 813,535 |
| member2 | 805,577 |
| member3 | 1,026,618 |
| total | 2,851,053 |
| explicit crown/bonus | 205,323 |

Equation:

```text
813535 + 805577 + 1026618 = 2645730
2645730 + 205323 = 2851053
```

## D. Exact Mismatch Analysis

With the known correction disabled:

- selected members are correct
- selected total equals the member sum only:

```text
813535 + 805577 + 1026618 = 2645730
```

- expected total equals selected member sum plus explicit crown/bonus:

```text
2645730 + 205323 = 2851053
```

The correct displayed total is present in OCR text as a fragmented value, `2.851 0535`, but the numeric parser does not normalize it into `2851053`.

The explicit bonus `205323` is reliably present in both total and member OCR raw candidates, including plus-mark text.

## E. Whether Safe Removal Is Possible

Recommendation: **not safe to remove yet**.

Reason:

- Disabling only `IMG_9250.png:stage2` causes the expected runner test to fail.
- The current generic rules do not restore `enemyTotal` from `memberSum + explicitBonus`.
- The known correction is still required for this image today.

Classification for removal:

```text
D. keep individual for now
```

## F. Whether A Small Generic Total-Only Rule Is Possible

A small generic rule appears possible, but it should not be implemented from one example alone.

Potential rule shape:

1. Smartphone/mobile only.
2. Apply only when selected members are stable and unchanged.
3. Require selected total to exactly equal the selected member sum.
4. Require an explicit crown/plus bonus candidate in the same side/stage raw OCR text.
5. Require `memberSum + explicitBonus` to produce a plausible larger total.
6. Prefer a raw fragmented total text hint if available, such as a total trace containing the same digit sequence with punctuation/spacing noise.
7. Do not apply to tiny sparse rows or cases where member slots are also changing.

For IMG_9250 Stage2 enemy, this rule would compute:

```text
memberSum = 2645730
explicitBonus = 205323
repairedTotal = 2851053
```

False-positive guards needed:

- The bonus must be explicit crown/plus-like, not just any smaller candidate.
- The selected members must be the same before and after repair.
- The selected total must be exactly the member sum; otherwise this could overwrite a legitimate displayed total.
- The rule should avoid sparse one-member/tiny-score cases like `IMG_9251`.

## G. Recommendation

Classification: **B. promising but needs more evidence**.

Why not A:

- The key cannot be removed now; disabled-key runner output fails.

Why not C yet:

- A small generic rule is plausible, but only one expected-backed active case has been deeply proven.
- The related candidates `IMG_9265.png:stage2` and `IMG_9267.png:stage2` still need expected JSON before they can become repeat evidence.

Recommended next step:

1. Add expected JSON for `IMG_9265` and `IMG_9267`.
2. Replay those keys disabled.
3. If they show the same pattern, implement a smartphone-only total+crown restoration rule guarded by:
   - selected total equals member sum
   - explicit plus/crown bonus exists
   - repaired total equals member sum plus bonus
   - members are unchanged

No production implementation is recommended from this single case alone.

## Validation

Targeted validation:

- `node scripts/ocr-test-images.mjs IMG_9250 --audit-disable-known-correction IMG_9250.png:stage2`: expected failure, only `S2 enemy total` mismatched.
- `node scripts/ocr-test-images.mjs IMG_9250`: PASS, failed `0`.

No production code was changed.

## H. Follow-Up Candidates: IMG_9265 and IMG_9267

The next two strong total-only candidates were replayed with their filename-keyed Stage2 corrections disabled. Neither image currently has expected JSON, so they cannot prove safe removal yet. They do, however, show the same member-sum-plus-explicit-bonus shape as `IMG_9250.png:stage2`.

### IMG_9265.png:stage2

Known correction entry:

```js
"IMG_9265.png:stage2": {
  enemy: [958341, 1283744, 650240],
  enemyTotal: 3149073
}
```

Expected JSON status:

- `regression-test/expected/IMG_9265.json`: missing

Command:

```bash
node scripts/ocr-test-images.mjs IMG_9265 --audit-disable-known-correction IMG_9265.png:stage2
```

Observed Stage2 enemy with the known correction disabled:

| Field | Observed without key |
| --- | ---: |
| member1 | 958,341 |
| member2 | 1,283,744 |
| member3 | 650,240 |
| total | 2,892,325 |

Known corrected Stage2 enemy:

| Field | Known correction |
| --- | ---: |
| member1 | 958,341 |
| member2 | 1,283,744 |
| member3 | 650,240 |
| total | 3,149,073 |
| explicit crown/bonus | 256,748 |

Equation:

```text
958341 + 1283744 + 650240 = 2892325
2892325 + 256748 = 3149073
```

Raw runner evidence:

- selected members are already the same as the known correction
- selected total equals member sum only
- `enemyTotal` raw candidates contain `958341, 1283744, 650240`
- total trace text contains fragmented displayed total text: `3 149.07 3m`
- total traces contain explicit crown/plus text:
  - `+2567 48`
  - `+256748`

Classification:

```text
A. same member-sum-plus-bonus pattern
```

Removal status:

```text
C. not enough evidence for removal until expected JSON is added
```

### IMG_9267.png:stage2

Known correction entry:

```js
"IMG_9267.png:stage2": {
  self: [1187687, 666434, 696773],
  selfTotal: 2788431
}
```

Expected JSON status:

- `regression-test/expected/IMG_9267.json`: missing

Command:

```bash
node scripts/ocr-test-images.mjs IMG_9267 --audit-disable-known-correction IMG_9267.png:stage2
```

Observed Stage2 self with the known correction disabled:

| Field | Observed without key |
| --- | ---: |
| member1 | 1,187,687 |
| member2 | 666,434 |
| member3 | 696,773 |
| total | 2,550,894 |

Known corrected Stage2 self:

| Field | Known correction |
| --- | ---: |
| member1 | 1,187,687 |
| member2 | 666,434 |
| member3 | 696,773 |
| total | 2,788,431 |
| explicit crown/bonus | 237,537 |

Equation:

```text
1187687 + 666434 + 696773 = 2550894
2550894 + 237537 = 2788431
```

Raw runner evidence:

- selected members are already the same as the known correction
- selected total equals member sum only
- `selfTotal` raw candidates include explicit bonus `237537`
- total trace text contains fragmented displayed total text: `2.788. 43 1p`
- total traces contain explicit crown/plus text:
  - `§+237537`
  - `W+237537`
- one trace also contains a noisy joined value `2375357`, so a future rule must prefer explicit plus/crown context rather than arbitrary large number parsing

Classification:

```text
A. same member-sum-plus-bonus pattern
```

Removal status:

```text
C. not enough evidence for removal until expected JSON is added
```

## I. Updated Recommendation

`IMG_9250.png:stage2`, `IMG_9265.png:stage2`, and `IMG_9267.png:stage2` now all show the same structural pattern:

1. member slots are already correct when the known correction is disabled
2. selected total equals member sum only
3. raw OCR contains an explicit plus/crown bonus candidate
4. known corrected total equals `memberSum + explicitBonus`
5. raw total text includes a fragmented displayed total matching the corrected total shape

This is enough to design a small generic rule, but not enough to commit one yet because `IMG_9265` and `IMG_9267` still lack expected JSON.

Updated recommendation:

```text
B. promising but needs expected fixtures for repeated proof
```

Suggested next step:

1. Add expected JSON for `IMG_9265` and `IMG_9267`.
2. Replay both with the Stage2 key disabled.
3. If they pass except for the total field as documented here, implement a smartphone-only total+crown restoration rule.

Rule shape remains:

- smartphone/mobile only
- selected total must equal selected member sum
- selected members must remain unchanged
- explicit plus/crown bonus must be visible in raw OCR text/candidates
- repaired total is exactly `memberSum + bonus`
- avoid tiny sparse rows and any case where member slots are changing

## J. Generic Rule Implemented After Expected Fixtures

After expected JSON was added for `IMG_9265` and `IMG_9267`, the three candidates were replayed again with their Stage2 known corrections disabled.

Disabled-key results:

| Image/key | Side | Members without key | Total without key | Expected total | Mismatch |
| --- | --- | --- | ---: | ---: | --- |
| `IMG_9250.png:stage2` | enemy | `813535 / 805577 / 1026618` | 2,645,730 | 2,851,053 | total only |
| `IMG_9265.png:stage2` | enemy | `958341 / 1283744 / 650240` | 2,892,325 | 3,149,073 | total only |
| `IMG_9267.png:stage2` | self | `1187687 / 666434 / 696773` | 2,550,894 | 2,788,431 | total only |

All three cases share the same equation shape:

- selected members are already correct
- selected total equals the selected member sum
- a plus/crown-like bonus candidate is present in the same stage/side OCR evidence
- expected total equals `memberSum + bonus`

Implemented guard in `applySmartphoneTotalCrownBonusRecovery(...)`:

- smartphone mode only
- Stage2 only
- exactly three selected members
- every selected member is at least `100000`
- selected member sum is at least `500000`
- selected total exactly equals selected member sum
- exactly one bonus candidate in `10000..399999` remains after excluding selected members and the selected total
- repaired total must be greater than selected total and below `5000000`

Removed known correction keys:

- `IMG_9250.png:stage2`
- `IMG_9265.png:stage2`
- `IMG_9267.png:stage2`

Safety intent:

- no digit-drop repair
- no member-order reassignment
- no sparse/tiny enemy score handling
- no desktop/PC behavior change

Validation after implementation:

- `node scripts/ocr-test-images.mjs IMG_9250 IMG_9265 IMG_9267`: PASS, `3` expected / `0` failed
- `node scripts/ocr-test-images.mjs IMG_9251 IMG_9180`: PASS, `1` expected / `0` failed
- `node scripts/ocr-test-images.mjs IMG_9245 IMG_9074`: PASS, `2` expected / `0` failed
- `node scripts/ocr-test-images.mjs IMG_9254 IMG_9264 IMG_9266 IMG_9281`: PASS, `4` expected / `0` failed
- `node scripts/ocr-test-images.mjs --source desktop "desktop/スクリーンショット 2026-06-07 111730.png"`: PASS, `1` expected / `0` failed
- `npm run build`: PASS
