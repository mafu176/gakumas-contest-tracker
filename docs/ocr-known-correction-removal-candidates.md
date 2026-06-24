# OCR Known Correction Removal Candidate Audit

## Scope

This audit reviews filename-keyed OCR known corrections in `app/lib/ocrPostProcess.js` after these generic mobile OCR rules were committed:

- `3d578d0` Generalize mobile OCR crown bonus exclusion
- `0d50108` Generalize mobile OCR sparse trailing zero preservation
- `737d966` Generalize mobile OCR total-like member suppression

No known corrections were removed in this audit. No production OCR logic was changed.

Important limitation: the normal regression runner still applies filename-keyed known corrections. This audit therefore treats removability conservatively. A correction is not marked as safe to remove unless there is exact no-known-correction proof or an equivalent browser/manual replay. In this pass, no such bypass proof was generated.

## A. Safe Removal Candidates

| Correction key | Proof | Validation command | Result |
| --- | --- | --- | --- |
| `IMG_9245.png:stage1` | Proven with runner by temporarily disabling only this key. | `node scripts/ocr-test-images.mjs IMG_9245` | Generic rules alone produced Stage1 enemy `[124447, 188031, 31083]` and `enemyTotal: 343561`. |

## B. Likely Removal Candidates But Need Confirmation

These corrections match patterns now targeted by generic mobile rules. They are plausible removal candidates, but each must be verified with the individual filename correction disabled or by using a browser input path where filename-keyed correction does not fire.

### Crown Bonus Exclusion / Missing High Member

Generic rule likely involved: smartphone crown bonus exclusion from member slots.

| Correction key | Reason | What to verify |
| --- | --- | --- |
| `IMG_9222.png:stage1` | Crown/member swap pattern. | Disable key and confirm Stage1 self/enemy members and totals still match expected. |
| `IMG_9240.png:stage1` | Crown/member swap pattern. | Confirm member3 remains member and crown does not enter members. |
| `IMG_9240.png:stage3` | Crown total handling with bonus-like candidate. | Confirm total and members remain exact without key. |
| `IMG_9250.png:stage2` | Crown bonus was used as a member while a real high member was missing. | Confirm Stage2 enemy selects the high member and preserves total. |
| `IMG_9254.png:stage2` | Crown bonus was used as member1 and real member3 was missing. | Confirm Stage2 self exact members/total. |
| `IMG_9254.png:stage3` | Crown/merged noise displaced members and total. | Confirm Stage3 self exact members/total. |
| `IMG_9257.png:stage2` | Crown bonus was used as member3 and real high member was missing. | Confirm Stage2 enemy exact members/total. |
| `IMG_9264.png:stage2` | Crown bonus was used as member3 and real high member was missing. | Confirm Stage2 enemy exact members/total. |
| `IMG_9265.png:stage2` | Total missing crown bonus. | Confirm Stage2 enemy total includes crown. |
| `IMG_9266.png:stage2` | Crown bonus was used as member3 and real high member was missing. | Confirm Stage2 self exact members/total. |
| `IMG_9266.png:stage3` | Total missing crown bonus. | Confirm Stage3 enemy total includes crown. |
| `IMG_9267.png:stage2` | Members correct but total missing crown bonus. | Confirm Stage2 self total includes crown. |
| `IMG_9268.png:stage2` | Crown bonus was used as member3 and real high member was missing. | Confirm Stage2 self exact members/total. |
| `IMG_9281.png:stage2` | Crown bonus was used as member3 and real high member was missing. | Confirm Stage2 enemy exact members/total. |
| `IMG_9282.png:stage2` | High-score row displaced by bonus/member confusion. | Confirm Stage2 self exact members/total. |
| `IMG_9283.png:stage2` | Members correct but total missing crown bonus. | Confirm Stage2 self total includes crown. |
| `IMG_9284.png:stage2` | Crown bonus was used as member3 and real high member was missing. | Confirm Stage2 self exact members/total. |
| `IMG_9285.png:stage2` | Total-like/member displacement with high member recovery. | Confirm Stage2 self exact members/total. |

### Sparse Trailing Zero Preservation

Generic rule likely involved: smartphone sparse trailing-zero preservation.

| Correction key | Reason | What to verify |
| --- | --- | --- |
| `IMG_9163.png:stage1` | Sparse one-member side with bonus/total candidates. | Confirm member2/member3 remain empty and total stays crown-included. |
| `IMG_9163.png:stage3` | Sparse two-member side with crown total. | Confirm trailing empty slot remains empty and total includes bonus. |
| `IMG_9166.png:stage2` | Sparse/partial member layout. | Confirm blank slots are not filled by unrelated OCR candidates. |
| `IMG_9250.png:stage3` | Sparse self/enemy fields are corrected in one key. | Verify both self and enemy corrections are now structurally covered before removing. |
| `IMG_9264.png:stage3` | Sparse two-member enemy formation with bonus-like candidate in blank slot. | Confirm third member stays `0` and total remains crown-included. |
| `IMG_9281.png:stage3` | Sparse two-member self formation. | Confirm trailing blank remains `0`. |
| `IMG_9282.png:stage3` | Sparse one-member self formation. | Confirm member2/member3 remain `0` and total includes crown. |
| `IMG_9283.png:stage3` | Sparse one-member self formation. | Confirm total is not inflated by nearby value. |
| `IMG_9284.png:stage3` | Sparse one-member self formation. | Confirm total is not inflated by nearby value. |
| `IMG_9285.png:stage3` | Sparse one-member self formation. | Confirm member2/member3 remain `0` and total is exact. |

### Total-Like Member Suppression

Generic rule likely involved: smartphone total-like member suppression.

| Correction key | Reason | What to verify |
| --- | --- | --- |
| `IMG_9165.png:stage2` | Displayed total was selected as a member in a two-member side. | Needs replay because earlier runner/browser recognition diverged for one member value. |
| `IMG_9245.png:stage1` | Strong candidate: raw pattern had total-like `345561` entering members while `124447 + 188031 + 31083 = 343561`. | Disable key and confirm no-bonus 3-member equation wins. |

## C. Keep Individual For Now

These corrections should remain filename-keyed until more evidence exists.

### Old Fixture / Full-Stage Replacement / No Raw Before-Value Evidence

These keys predate the current generic-rule work or replace broad stage outputs. They lack enough raw before-value evidence for safe removal.

- `next1.png:stage1`
- `next1.png:stage2`
- `next1.png:stage3`
- `next4.jpg:stage1`
- `next4.jpg:stage2`
- `next4.jpg:stage3`
- `normal4.png:stage1`
- `normal4.png:stage2`
- `normal4.png:stage3`
- `・托ｼ・png:stage1`
- `・托ｼ・png:stage2`
- `・托ｼ・png:stage3`
- `・托ｼ・png:stage2`
- `normal1.jpg:stage2`
- `normal1.jpg:stage3`
- `normal2.jpg:stage2`
- `IMG_8932.png:stage2`
- `IMG_8933.png:stage2`
- `IMG_8934.png:stage1`
- `IMG_8934.png:stage2`
- `IMG_8935.png:stage2`

### Total-Only Corrections Without Structural Proof

These mostly change totals. Some may be handled by future total-repair rules, but current generic rules do not prove removability.

- `high2.png:stage2`
- `high2.png:stage3`
- `high3.png:stage3`
- `normal3.png:stage2`
- `IMG_8936.png:stage3`
- `・托ｼ・png:stage3`
- `IMG_8942.png:stage2`
- `IMG_8943.png:stage1`
- `IMG_8944.png:stage3`
- `IMG_8946.png:stage3`
- `IMG_8948.png:stage2`
- `IMG_9070.png:stage2`
- `IMG_9085.png:stage1`
- `IMG_9166.png:stage1`

### Ambiguous Raw / Missing-Member Cases Needing Replay

These might eventually be generalized, but they need no-known replay or raw candidate review. Several involve missing displayed totals, browser/runner divergence, or manually confirmed OCR oddities.

- `IMG_8942.png:stage1`
- `IMG_8943.png:stage2`
- `IMG_8948.png:stage1`
- `IMG_9072.png:stage2`
- `IMG_9073.png:stage2`
- `IMG_9074.png:stage2`
- `IMG_9087.png:stage3`
- `IMG_9086.png:stage2`
- `IMG_9163.png:stage2`
- `IMG_9222.png:stage3`
- `IMG_9243.png:stage2`
- `IMG_9245.png:stage2`

### Tiny Sparse Enemy / Highly Image-Specific

These are intentionally kept individual. They correct very small sparse enemy scores and a browser filename fallback signature. Generic sparse rules should not try to infer these from numeric ranges.

- `IMG_9251.png:stage1`
- `IMG_9251.png:stage2`
- `IMG_9251.png:stage3`

## D. Summary Counts

| Category | Count |
| --- | ---: |
| Total filename-keyed corrections | 82 |
| Unique image files | 50 |
| Safe removal candidates | 1 |
| Likely candidates needing confirmation | 20 |
| Keep individual for now | 61 |

## Top 5 Safest Next Candidates

These are not approved for deletion yet, but they should be the first no-known replay targets.

1. `IMG_9254.png:stage2`  
   Crown bonus/member displacement candidate; verify exact Stage2 self members and total without the key.
2. `IMG_9254.png:stage3`  
   Crown/noise displacement candidate; verify exact Stage3 self members and total without the key.
3. `IMG_9257.png:stage2`  
   Missing high member plus crown-as-member candidate; verify Stage2 enemy without the key.
4. `IMG_9264.png:stage2`  
   Missing high member plus crown-as-member candidate; verify Stage2 enemy without the key.
5. `IMG_9264.png:stage3`  
   Sparse two-member enemy case; verify blank third slot and crown-included total without the key.

## Top Risks

- `IMG_9251.png:*` should remain individual for now. These are tiny sparse enemy score corrections and a browser fallback signature, not safe generic-rule candidates.
- Multi-field keys such as `IMG_9250.png:stage3` should not be removed unless every field in the key is proven covered.
- Total-only corrections are risky without raw before-value proof. They may need a separate total-repair audit.
- Old fixtures and broad stage replacements lack enough raw candidate evidence.
- Browser input can carry a different `sourceName` than the runner. Removal proof should include either filename-disabled runner replay or browser upload checks where relevant.


## Batch Proof Update: 2026-06-24

Method: each candidate below was tested by temporarily renaming only that filename-keyed correction key to `__DISABLED_*`, running the targeted OCR command, recording the output, and restoring `app/lib/ocrPostProcess.js` before moving to the next candidate. Existing generic mobile OCR rules remained active.

Previously proven:

| Correction key | Classification | Evidence |
| --- | --- | --- |
| `IMG_9245.png:stage1` | A. safe removal candidate with runner proof | With only this key disabled, `node scripts/ocr-test-images.mjs IMG_9245` still passed. Stage1 enemy remained `[124447, 188031, 31083]`, `enemyTotal: 343561`. |
| `IMG_9166.png:stage2` | C. keep individual | With only this key disabled, Stage2 self members remained sparse, but `selfTotal` became `363783` instead of expected `198427`. |

Batch tested candidates:

| Correction key | Validation command | Classification | Disabled-key output / reason |
| --- | --- | --- | --- |
| `IMG_9163.png:stage1` | `node scripts/ocr-test-images.mjs IMG_9163` | C. keep individual | Stage1 self became `[6535, 544861, 108972]`, `selfTotal: 660368`; expected `[544861, 0, 0]`, `selfTotal: 653835`. |
| `IMG_9163.png:stage3` | `node scripts/ocr-test-images.mjs IMG_9163` | C. keep individual | Stage3 self became `[393410, 34311]`, `selfTotal: 427721`; expected `[393410, 34311, 0]`, `selfTotal: 506403`. |
| `IMG_9283.png:stage3` | `node scripts/ocr-test-images.mjs IMG_9283` | C. keep individual | No expected JSON was available, but disabled-key output did not match the known correction: output `[177045]`, `selfTotal: 201312`; known correction is `[177045, 0, 0]`, `selfTotal: 177045`. |
| `IMG_9285.png:stage3` | `node scripts/ocr-test-images.mjs IMG_9285` | C. keep individual | No expected JSON was available, but disabled-key output did not match the known correction: output `[243617, 48723]`, `selfTotal: 292540`; known correction is `[243617, 0, 0]`, `selfTotal: 292340`. |
| `IMG_9222.png:stage1` | `node scripts/ocr-test-images.mjs IMG_9222` | C. keep individual | Stage1 self member3 stayed `114275` instead of `56280`; Stage1 enemy fell to `[132325, 127403]`, `enemyTotal: 260668` instead of `[260668, 132325, 127403]`, `enemyTotal: 520396`. |
| `IMG_9240.png:stage1` | `node scripts/ocr-test-images.mjs IMG_9240` | C. keep individual | Stage1 self member3 stayed `127099` instead of expected `70610`. |
| `IMG_9240.png:stage3` | `node scripts/ocr-test-images.mjs IMG_9240` | C. keep individual | Stage3 self became `[331368, 281784, 287111]`, `selfTotal: 966556`; expected `[287111, 331368, 281784]`, `selfTotal: 966536`. |
| `IMG_9250.png:stage2` | `node scripts/ocr-test-images.mjs IMG_9250` | C. keep individual | No expected JSON was available, but disabled-key output did not match the known correction total: enemy members matched `[813535, 805577, 1026618]`, but `enemyTotal` was `2645730` instead of known correction `2851053`. |

Batch classification counts:

| Classification | Count |
| --- | ---: |
| A. safe removal candidate with runner proof | 0 |
| B. likely but needs browser/manual confirmation | 0 |
| C. keep individual | 8 |

Safety checks after batch:

- `node scripts/ocr-test-images.mjs IMG_9251 IMG_9180`: failed `0`
- `node scripts/ocr-test-images.mjs --source desktop "desktop/スクリーンショット 2026-06-07 111730.png"`: PASS

Cleanup notes:

- `app/lib/ocrPostProcess.js` was restored after each temporary disable.
- Generated OCR reports were restored after validation.