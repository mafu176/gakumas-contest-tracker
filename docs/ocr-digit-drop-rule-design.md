# OCR Digit-Drop Rule Design

## Scope

This document designs a possible production rule shape for IMG_9243 stage2-like digit-drop / number-fragment recovery.

No production OCR code was changed. No known corrections were removed.

Inputs reviewed:

- `docs/ocr-digit-drop-audit-detector-report.md`
- `docs/ocr-digit-drop-generalization-investigation.md`
- `docs/ocr-known-correction-removal-candidates.md`
- `app/lib/ocr.js`
- `app/lib/ocrPostProcess.js`
- `scripts/ocr-test-images.mjs`

## Recommendation

**B. Needs better detector/audit data first.**

IMG_9243 stage2 is promising, but it is not yet safe enough for a production generic rule. The raw candidate set contains the correct three members, but the displayed total is not available as a clean OCR candidate. A production rule should not reconstruct or trust a fragmented total until the audit runner can expose stronger evidence for the total fragment and prove that the alternative member set is unique across more images.

Recommended next step:

1. Extend the audit-only detector to report complete raw-member triplets whose sum can be explained by a fragmented/expected total.
2. Include the raw OCR text or token fragments for the total zone, not only parsed numeric candidates.
3. Re-run no-known-correction audits for IMG_9243-like cases.
4. Only then promote the narrow rule if it shows unique equation support and does not touch tiny sparse enemy cases.

Update after adding runner-only raw token/fragment audit:

- The runner can now preserve raw OCR text for total/member crops in `docs/ocr-raw-token-fragment-audit.md`.
- IMG_9243 stage2 now shows useful fragment evidence such as `448 97 6p` in total-candidate text and `448.976m` in member-crop text.
- This improves diagnosis, but it is still not enough to ship production digit-drop recovery. The current batch only produced one medium-confidence digit-drop finding, and several adjacent corrections remain crown/member swap or order-specific cases.
- Recommendation remains **B. Needs better detector/audit data first.**

## IMG_9243 Stage2 Deep Dive

Command used:

```bash
node scripts/ocr-test-images.mjs IMG_9243 --audit-disable-known-correction IMG_9243.png:stage2
```

With `IMG_9243.png:stage2` disabled, the runner produced:

| Field | Value |
| --- | --- |
| Stage2 self members | `[132118, 179231, 142959]` |
| Stage2 self total | `454308` |
| Stage2 enemy members | `[19217, 100783, 38162]` |
| Stage2 enemy total | `158162` |

Known corrected / expected Stage2 enemy:

| Field | Value |
| --- | --- |
| Stage2 enemy members | `[190814, 119217, 100783]` |
| Stage2 enemy total | `448976` |

Raw Stage2 enemy candidates from `regression-test/ocr-report.json` during the disabled-key replay:

```json
{
  "enemyTotal": [190814, 119217, 100783],
  "enemyMembers": [190814, 119217, 100783, 38162]
}
```

Relevant equations:

```text
wrong selected sum:
19217 + 100783 + 38162 = 158162

correct member sum:
190814 + 119217 + 100783 = 410814

correct total with bonus:
410814 + 38162 = 448976
```

### Why `119217` should replace `19217`

`19217` is a selected member, but the raw OCR candidate list also contains `119217`.

Evidence:

- `19217` is a substring/suffix-like fragment of `119217`.
- `119217` is present as a raw candidate in both `enemyTotal` and `enemyMembers`.
- Replacing `19217` with `119217` participates in the correct complete member set.
- Keeping `19217` only supports a too-small reconstructed total (`158162`), which does not match the visible/expected total.

This is a likely dropped-leading-digit or fragment-selection error. It should not be repaired by inventing a leading digit; it is only plausible because the complete value `119217` was observed.

### Where `190814` comes from

`190814` is not inferred. It is directly present in both raw Stage2 enemy candidate arrays:

- `raw.enemyTotal`
- `raw.enemyMembers`

The current selected output omitted it because the candidate-selection path chose a smaller partial equation (`19217 + 100783 + 38162 = 158162`) instead of a complete member triplet plus bonus.

Generic recovery for `190814` is possible only if the rule evaluates raw member candidates, not just the currently selected members.

### Why `38162` should be removed or reclassified

`38162` is present in `raw.enemyMembers`, but it behaves like a crown/bonus value:

```text
190814 + 119217 + 100783 + 38162 = 448976
```

It should not be selected as member3 when a complete three-member set is available and `38162` uniquely completes the crown-included total.

This resembles the existing crown bonus exclusion theme, but the existing generic crown rule cannot safely fire because the displayed total `448976` is not present as a clean total candidate.

## Similar Cases Found

### Closest Similar Cases

| Correction key | Similarity | Current status |
| --- | --- | --- |
| `IMG_9163.png:stage1` | Selected `6535` appears to be a total fragment; sparse member-plus-bonus equation exists. | Keep individual. Total/bonus evidence is different; false-positive risk with tiny scores. |
| `IMG_9074.png:stage2` | Small member correction may be digit-sensitive. | Needs raw replay/browser confirmation; disabled-key runner still passed in the latest targeted audit. |
| `IMG_8942.png:stage1` | Known correction replaces enemy member set; raw wrong values not encoded. | Needs no-known replay with raw candidates. |
| `IMG_8943.png:stage2` | Small enemy row may involve digit issues. | Needs raw wrong values. |
| `IMG_9072.png:stage2` | Sparse two-member row may look like digit repair if over-generalized. | Avoid for digit-drop; likely sparse handling. |

### Non-Matching Keep Cases

These should not be handled by an IMG_9243-like digit-drop rule:

- `IMG_9251.png:*`: tiny sparse enemy scores. Numeric digit manipulation is too risky.
- `IMG_9163.png:stage3`: crown-included total selection, not digit-drop.
- `IMG_9222.png:stage1`: crown/member swap and partial enemy equation, not a clean observed replacement.
- `IMG_9240.png:stage1`: crown/member swap.
- `IMG_9240.png:stage3`: order/total substitution around `966556` vs `966536`, not a missing digit.
- `IMG_9250.png:stage2`: total missing crown, not a selected digit fragment.

## Possible Rule Shapes

### Rule Shape 1: Observed Raw Replacement With Clean Total Candidate

This is the safest rule, but it does **not** currently cover IMG_9243 because `448976` is not a clean raw total candidate.

Required evidence:

1. Smartphone/mobile source only.
2. Selected members contain a short value `X` with 4-5 digits.
3. Raw member candidates contain a longer value `R` where:
   - `R !== X`
   - `R` contains `X` as a suffix or substring
   - `R` is not total-like and not a known noise number
4. A clean displayed total candidate `T` exists.
5. A bonus candidate `B` exists or is explicitly parsed.
6. Replacing `X` with `R`, and selecting two other observed raw members, creates exactly one equation:

```text
member1 + member2 + member3 + bonus = displayedTotal
```

Equation guard:

- exactly one matching member triplet
- exact or <= 1000 OCR tolerance
- no competing match using the original fragment `X`

Geometry/layout guard:

- prefer raw member candidates from the member crop over total crop candidates
- if slot-level geometry is available, `R` must be in the same side/stage region as the selected fragment

Scope:

- smartphone only

Cases it could fix:

- future IMG_9243-like cases where the total is parsed cleanly

Cases it must not touch:

- tiny sparse enemy rows
- rows with no clean total
- rows where the repaired value is not observed

False-positive risk:

- low, but coverage is limited

### Rule Shape 2: Observed Raw Triplet Plus Fragmented Total Evidence

This is the minimal rule shape that could cover IMG_9243, but it needs better audit data before production.

Required evidence:

1. Smartphone/mobile source only.
2. Selected output has a too-small total reconstructed from selected members.
3. Raw candidates contain at least three plausible member values, including a replacement `R` for selected fragment `X`.
4. One selected member is a short fragment of an observed raw candidate:

```text
selected X = 19217
observed R = 119217
```

5. Another selected member is a plausible bonus candidate:

```text
B = 38162
```

6. The raw member triplet plus `B` produces a plausible total:

```text
190814 + 119217 + 100783 + 38162 = 448976
```

7. The plausible total must be supported by raw OCR total-zone text fragments, not just expected JSON. For IMG_9243, historical browser evidence says the displayed total appeared as text like `448 97 6m`. The runner currently does not preserve enough token-level data in the audit report to prove that.

Equation guard:

- exactly one raw triplet and bonus produce a total in the valid stage total range
- produced total must be supported by either:
  - clean parsed total candidate, or
  - token-fragment evidence from total OCR text
- produced total must be greater than selected total by a meaningful margin
- selected total must equal or nearly equal a partial/incorrect equation

Geometry/layout guard:

- replacement `R` must come from the same side/stage raw member candidate set
- bonus `B` should be from explicit crown/plus OCR or a bonus-like raw zone, not simply any low number
- if only member-zone raw numbers are available, keep as audit-only

Scope:

- smartphone only

Cases it could fix:

- `IMG_9243.png:stage2`
- possibly future cases where all real members are observed but a partial member fragment is selected

Cases it must not touch:

- `IMG_9251.png:*` tiny sparse enemy scores
- sparse rows where a 4-5 digit selected score is a legitimate visible member
- rows without a total-fragment proof
- rows where multiple raw triplets can satisfy plausible totals

False-positive risk:

- medium unless total-fragment proof is added
- high if it tries to infer displayed total without OCR text evidence

### Rule Shape 3: Audit-Only Candidate Ranking

This is the recommended next step.

Required evidence:

1. Run after normal parse and before known corrections in the test runner.
2. For each stage/side, enumerate:
   - selected members
   - raw member candidates
   - raw total candidates
   - explicit crown/bonus candidates
   - raw OCR text tokens from total/member zones
3. Report alternatives where:
   - a selected fragment can be replaced by an observed raw candidate
   - the alternative triplet plus bonus explains a clean or fragmented total
   - the alternative uses more raw member candidates than the selected output

Equation guard:

- report only; do not mutate output
- mark as high confidence only when a clean total candidate exists
- mark as medium when total is fragment-supported
- mark as low when only expected JSON proves the total

Geometry/layout guard:

- include candidate source zone/pass when available

Scope:

- test runner only

Cases it could clarify:

- `IMG_9243.png:stage2`
- `IMG_9163.png:stage1`
- `IMG_9074.png:stage2`
- the `needs raw before-value evidence` rows in the known-correction audit

False-positive risk:

- none for production, because it is audit-only

## Safest Possible Production Rule Shape

The safest production shape is a strict variant of Rule Shape 1:

```text
If smartphone mode,
and selected members contain a 4-5 digit fragment X,
and raw member candidates contain observed longer value R that contains X,
and there is a clean displayed total candidate T,
and there is an explicit crown/plus bonus candidate B,
and replacing X with R plus two other observed raw member candidates creates exactly one member1+member2+member3+B=T equation,
and the original selected members do not create any valid equation,
then replace the selected member set with the unique observed raw triplet and preserve T.
```

This rule should not invent digits. The repaired value must already be observed.

Even this safe production shape probably would **not** fix IMG_9243 yet, because the clean displayed total `448976` is not available. That is the main reason to choose recommendation B rather than A.

## Additional Audit Data Needed

Before attempting production implementation, capture these fields in the audit report:

1. Raw OCR text for each total/member zone, not only parsed numbers.
2. Candidate source labels:
   - direct total crop
   - alternative total crop
   - member crop
   - crown/bonus crop
3. Token-level total fragments, for example whether `448 97 6m` can be normalized to `448976`.
4. All alternative raw triplets and their sums.
5. Whether a bonus candidate was explicit crown/plus text or merely a low raw number.
6. A no-known-correction replay table for every suspected digit-drop known correction.

## Final Decision

Do not implement production digit-drop recovery next.

Recommendation: **B. Needs better detector/audit data first.**

The next useful implementation should be audit-only:

- preserve raw OCR text/token fragments in runner reports,
- enumerate raw triplet + bonus equations,
- classify whether a displayed total is clean, fragmented, or expected-only,
- and keep production output unchanged.
