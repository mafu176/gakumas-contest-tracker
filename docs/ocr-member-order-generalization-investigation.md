# OCR Member Order / Slot Assignment Generalization Investigation

## A. Summary Counts

This investigation reviewed filename-keyed OCR known corrections in `app/lib/ocrPostProcess.js`, previous removal-candidate reports, raw token audit output, and one fresh disabled-correction replay for `IMG_9240.png:stage3`.

| Group | Count | Notes |
| --- | ---: | --- |
| Strong member-order / slot-assignment candidates | 3 | Clear evidence that values exist but are assigned to the wrong member/total/bonus slots. |
| Weak or ambiguous slot-assignment candidates | 5 | Related to order, but mixed with crown bonus, missing high-member, sparse, or digit-drop behavior. |
| Not primarily order issues | 9+ | Better explained by crown bonus, sparse trailing zero, total-like candidate, digit-drop, or total-only correction themes. |

Recommendation: **B. needs better audit/geometry data first**.

Production implementation is **not recommended yet**. The safest next step is audit-only slot provenance: capture candidate source zone, crop order, and token/bounding-box order before trying a generic reorder rule.

## B. Strong Member-Order Candidates

### `IMG_9240.png:stage3`

Known correction:

```js
"IMG_9240.png:stage3": { self: [287111, 331368, 281784], selfTotal: 966536 }
```

Fresh audit command:

```powershell
node scripts/ocr-test-images.mjs IMG_9240 --audit-disable-known-correction IMG_9240.png:stage3
```

Disabled-key output:

| Field | Expected | Without key |
| --- | ---: | ---: |
| S3 self member1 | 287111 | 331368 |
| S3 self member2 | 331368 | 281784 |
| S3 self member3 | 281784 | 287111 |
| S3 self total | 966536 | 966556 |

Raw numeric candidates from the runner audit:

```text
287111, 331368, 281784, 66273
```

Evidence:

- The selected member value set is exactly the expected member value set, but cyclically shifted.
- The total is close to the displayed total (`966556` vs manually confirmed `966536`), so the total mismatch is an OCR read delta, not a different equation.
- The expected equation is `287111 + 331368 + 281784 + 66273 = 966536`.

Why it is promising:

- This is the cleanest member-order candidate: no missing member value is needed.

Why it is not safe enough yet:

- Reordering by numeric sort would be wrong because member slot order is visual/semantic, not numeric.
- The raw token audit has numeric values, but does not yet provide reliable slot-level geometry or OCR word bounding boxes proving left-to-right order.

Classification: **strong candidate, needs geometry/provenance before generic production rule**.

### `IMG_9254.png:stage3`

Known correction:

```js
"IMG_9254.png:stage3": { self: [31440, 28286, 74178], selfTotal: 148739 }
```

Previous disabled-key output:

| Field | Expected | Without key |
| --- | ---: | ---: |
| S3 self member1 | 31440 | 31440 |
| S3 self member2 | 28286 | 28286 |
| S3 self member3 | 74178 | 14835 |
| S3 self total | 148739 | 74178 |

Evidence:

- The correct member3 `74178` exists, but it is selected as the total.
- The crown/bonus-like value `14835` is selected as member3.
- The expected equation is `31440 + 28286 + 74178 + 14835 = 148739`.

Why it is promising:

- This is a clear member/total/bonus slot-assignment issue.
- It is structurally similar to "total selected as member" and "bonus selected as member", but with the total field itself holding a real member value.

Why it is not safe enough yet:

- A generic rule would need to know that `74178` is visually in member slot 3, not in the total region.
- Without source-zone evidence, a total-looking value could be a legitimate sparse total in other screenshots.

Classification: **strong slot-assignment candidate, but not pure member-order**.

### `IMG_9281.png:stage3`

Known correction:

```js
"IMG_9281.png:stage3": { self: [204908, 112716, 0], selfTotal: 317624 }
```

Previous disabled-key output:

| Field | Expected | Without key |
| --- | ---: | ---: |
| S3 self member1 | 204908 | 112716 |
| S3 self member2 | 112716 | 0 |
| S3 self member3 | 0 | 0 |
| S3 self total | 317624 | 204908 |

Evidence:

- Correct member1 `204908` is selected as total.
- Correct member2 `112716` is shifted into member1.
- The expected sparse two-member equation is `204908 + 112716 = 317624`.

Why it is promising:

- This is a clean sparse slot-shift / total-member confusion pattern.
- It may be coverable by a structural rule if the runner can prove `204908` came from the member row rather than the total row.

Why it is not safe enough yet:

- Sparse rows are already high-risk because totals and single visible members can be numerically close to normal score candidates.
- A generic rule must not turn valid one-member sparse totals into members.

Classification: **strong sparse slot-assignment candidate, needs source-zone evidence**.

## C. Weak/Ambiguous Member-Order Candidates

### `IMG_9222.png:stage1`

Known correction:

```js
"IMG_9222.png:stage1": {
  self: [571375, 164269, 56280],
  enemy: [260668, 132325, 127403],
  selfTotal: 906199,
  enemyTotal: 520396
}
```

Previous disabled-key output:

- Stage1 self member3 stayed `114275` instead of expected `56280`.
- Stage1 enemy fell to `[132325, 127403]`, `enemyTotal: 260668` instead of `[260668, 132325, 127403]`, `enemyTotal: 520396`.

Assessment:

- Stage1 self is primarily crown/member swap.
- Stage1 enemy is partial-equation / total-as-member recovery.
- It is adjacent to slot assignment, but not a pure order issue.

Classification: **weak/ambiguous; keep individual for now**.

### `IMG_9240.png:stage1`

Known correction:

```js
"IMG_9240.png:stage1": { self: [635498, 240415, 70610], selfTotal: 1073622 }
```

Previous disabled-key output:

- Stage1 self member3 stayed `127099` instead of expected `70610`.

Assessment:

- This is crown/member swap, already better represented by the crown bonus exclusion theme.
- It lacks a pure same-value-set reorder.

Classification: **not a member-order rule target**.

### `IMG_9264.png:stage2`

Known correction:

```js
"IMG_9264.png:stage2": { enemy: [210809, 1254969, 891973], enemyTotal: 2608744 }
```

Previous disabled-key output:

- Stage2 enemy became `[210809, 891973, 250993]`, `enemyTotal: 1353775`.
- Expected `[210809, 1254969, 891973]`, `enemyTotal: 2608744`.

Assessment:

- Correct member2 `1254969` is missing.
- Bonus-like `250993` is used as member3.
- Member3 `891973` is shifted to member2.

Classification: **slot-shift plus missing high member; not safe for an order-only rule**.

### `IMG_9281.png:stage2`

Known correction:

```js
"IMG_9281.png:stage2": { enemy: [993384, 814443, 1015006], enemyTotal: 3025834 }
```

Previous disabled-key output:

- Stage2 enemy member3 became `203001` instead of expected `1015006`.
- `enemyTotal` became `2010828` instead of `3025834`.

Assessment:

- This is missing high member plus crown-as-member.
- It may become removable through high-member recovery, but not through order correction.

Classification: **not a member-order rule target**.

### `IMG_9254.png:stage2`

Known correction:

```js
"IMG_9254.png:stage2": {
  self: [604184, 750123, 61084],
  selfTotal: 1565415,
  enemy: [33969, 53156, 26657],
  enemyTotal: 113782
}
```

Assessment:

- Stage2 self is crown-as-member and missing member3.
- Stage2 enemy had manually confirmed values after OCR selected `[33969, 26657, 1780]`, `115562`; this involves a missing member and small noise, not a pure order issue.

Classification: **weak/ambiguous; keep individual for now**.

## D. Cases That Are Not Order Issues

These corrections are better handled by other themes:

| Correction key | Primary theme |
| --- | --- |
| `IMG_9163.png:stage1` | digit-drop / sparse one-member / crown total |
| `IMG_9163.png:stage3` | total/crown recovery |
| `IMG_9243.png:stage2` | digit-drop / fragment recovery |
| `IMG_9250.png:stage2` | total includes crown; members already recoverable after current generic rules |
| `IMG_9250.png:stage3` | sparse trailing zero / crown in empty slot |
| `IMG_9251.png:*` | tiny sparse enemy scores and whole-result browser fallback |
| `IMG_9264.png:stage3` | sparse trailing zero / crown in empty slot |
| `IMG_9265.png:stage2` | total-only crown addition |
| `IMG_9267.png:stage2` | total-only crown addition |
| `IMG_9268.png:stage2` | missing high member plus crown-as-member |
| `IMG_9283.png:stage3` | sparse one-member total inflation |
| `IMG_9285.png:stage3` | sparse one-member total inflation |

## E. Possible Safe Generic Rule Shape

No production rule should be implemented from the current evidence alone. A future safe rule would need to be narrower than "sort values" or "try every permutation".

### Rule Shape 1: Pure Permutation Repair

Scope:

- Smartphone/mobile only.
- Apply only after the normal member selection and the existing crown/total/sparse generic rules.

Required evidence:

- Selected member multiset equals an alternate candidate multiset exactly, but order differs.
- The alternate order is supported by OCR token order from the member crop or by slot-level bounding boxes.
- Total equation remains valid after reordering:
  - no-bonus: `member1 + member2 + member3 == displayedTotal`
  - bonus: `member1 + member2 + member3 + explicitBonus == displayedTotal`
- Existing selected order either fails the same equation or is visibly inconsistent with token/slot order.

Must not touch:

- Sparse one-member and two-member rows unless blank-slot evidence is explicit.
- Tiny scores such as `IMG_9251`.
- Cases where the only evidence is numeric size or sorted order.

Likely case covered:

- `IMG_9240.png:stage3`, if token/geometry provenance proves the order `[287111, 331368, 281784]`.

### Rule Shape 2: Total/Member Slot Reassignment

Scope:

- Smartphone/mobile only.
- Use only when source-zone evidence shows a selected total came from the member crop or selected member came from a total crop.

Required evidence:

- Raw candidates include the real member triplet and an explicit crown/bonus candidate.
- The corrected equation is exact or within an already accepted OCR tolerance.
- The current result places a bonus-like value or total-like value into a member slot.
- The reassigned value has source-zone support for the target slot.

Likely cases covered:

- `IMG_9254.png:stage3`
- `IMG_9281.png:stage3`

### Rule Shape 3: Sparse Slot Shift With Displayed Total

Scope:

- Smartphone/mobile only.
- One-member or two-member sparse rows only.

Required evidence:

- The selected total is also a raw member-zone candidate.
- The displayed/crown-included total is present or reconstructable with an explicit crown/plus candidate.
- Empty trailing slots are supported by sparse-row evidence already used by `applySmartphoneSparseTrailingZeroPreservation`.

Likely case covered:

- `IMG_9281.png:stage3`

## F. Risks and Cases to Avoid

- Numeric order is not visual order. Member scores are not guaranteed to increase or decrease left-to-right.
- Correct member order is semantically tied to visible slot position; a generic rule needs OCR geometry/provenance, not just values.
- Crown bonus values can be member-like and can be larger than a real member in low-score or sparse cases.
- Displayed totals can appear in member crops and member values can appear in total crops; source-zone evidence is required.
- Runner and browser paths have historically differed in formatted values, sparse arrays, and candidate shapes.
- A rule that repairs `IMG_9240.png:stage3` by trying all permutations could silently reorder valid 3-member rows.
- Sparse rows and tiny scores such as `IMG_9251` must remain out of scope.

## G. Recommendation

Recommendation: **B. needs better audit/geometry data first**.

Do not implement a production member-order rule next.

Recommended next audit-only work:

1. Extend runner raw-token reporting with slot provenance for each selected member:
   - candidate value
   - source crop: member row, total row, crown/bonus crop
   - candidate index/order within that crop
   - if available, OCR word bounding box or line position
2. Add a disabled-known-correction audit batch focused on:
   - `IMG_9240.png:stage3`
   - `IMG_9254.png:stage3`
   - `IMG_9281.png:stage3`
   - at least 10 existing passing normal 3-member mobile rows
3. Only consider production generalization if the audit proves:
   - corrected order is uniquely supported by slot/geometry evidence
   - the current order fails a total equation or source-zone guard
   - passing 3-member rows are untouched.

Known corrections should remain in place for now.
