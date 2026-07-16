# Current-PC Stage3 Member-Row OCR Diagnostics

This is runner-only diagnostics for current-PC Stage3 member-row OCR quality. It writes ROI/preprocessing variants and per-slot crops under `tmp/`; it does not change final OCR output.

Run with:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage3-member-row-diagnostics
```

The committed report contains a smoke run on one known affected screenshot:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline 223753187 --current-pc-stage3-member-row-diagnostics
```

A full 48-fixture diagnostics run is supported by the flag above, but was not run for this commit because the variant OCR pass is expensive. The smoke run verifies that artifact generation, per-variant OCR, per-slot crops, JSON output, and markdown output all work.

## Summary

- affected Stage3 rows audited: 1
- artifact directory: `tmp/current-pc-stage3-member-row-ocr-diagnostics`
- rows where any variant found an exact missing 7-digit member: 1
- rows where a per-slot crop found an exact missing 7-digit member: 0
- final OCR output changed: no
- production recovery enabled: no

## ROI / Preprocessing Variants

The diagnostics currently test:

- current member-row ROI
- wider member-row ROI
- shifted-left / shifted-right member-row ROI
- shifted-up / shifted-down member-row ROI
- taller member-row ROI
- tighter vertical member-row ROI
- baseline/default preprocessing row variant
- crown-bonus threshold row variant
- per-slot member1 / member2 / member3 crops using PSM7

## Diagnostic Outcome Categories

| category | count |
| --- | ---: |
| exact 7-digit recovered by shifted ROI | 2 |
| exact 7-digit recovered by threshold variant | 2 |
| exact 7-digit already present in current ROI OCR | 1 |
| exact 7-digit recovered by taller/tighter vertical ROI | 1 |
| exact 7-digit recovered by wider ROI | 1 |

## Rows

| image | side | expected members | selected members | expected bonus | expected total | missing 7-digit members | exact variant hits | per-slot helped | artifact |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| 2026-07-11_223753187.png | self | 1072082, 820114, 923776 | 820114, 923776, 214416 | 214,416 | 3,030,388 | member1 1,072,082->820,114 | current-member-row-roi: member1=1072082<br>wider-member-row-roi: member1=1072082<br>shifted-left-member-row-roi: member1=1072082<br>shifted-down-member-row-roi: member1=1072082<br>tighter-vertical-member-row-roi: member1=1072082<br>baseline-threshold-row-variant: member1=1072082<br>crown-bonus-threshold-row-variant: member1=1072082 | - | tmp/current-pc-stage3-member-row-ocr-diagnostics/2026-07-11_223753187.png-stage3-self/stage3-member-row-diagnostics.json |

## Smoke Finding

For `2026-07-11_223753187.png` S3 self, the current selected result drops member1:

- expected members: `1072082 / 820114 / 923776`
- selected members: `820114 / 923776 / 214416`
- expected bonus: `214416`
- expected total: `3030388`

Several full-row variants recover exact `1072082`, but per-slot crops do not. This suggests the evidence problem is not simply a too-wide row crop. The useful signal still comes from row-level OCR text, where the value is adjacent to member2 and can be parsed by some preprocessing/ROI variants.

## Simulation Decision

No recovery simulation is enabled by this diagnostics pass. A future simulation should require at least two exact positives from the same variant/provenance, exact total evidence, exact bonus evidence when needed, a unique equation, and zero false positives across all 48 current-PC fixtures.

## Production Recommendation

Do not productionize ROI or preprocessing changes from this report until diagnostics show a repeatable exact-evidence capture pattern. The purpose here is to find whether better OCR input can produce exact candidates before selection.
