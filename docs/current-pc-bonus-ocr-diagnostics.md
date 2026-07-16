# Current-PC Bonus OCR Diagnostics

This report describes the runner-only current-PC bonus OCR diagnostics added behind:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-bonus-diagnostics
```

The diagnostics inspect bonus ROI crops, alternate ROI geometry, preprocessing variants, and plus-marker token evidence for current-PC rows where:

- selected members are exact,
- expected displayed total evidence exists,
- expected bonus evidence is missing or OCR-confused.

The diagnostics do not change final OCR output, do not add recovery rules, and do not affect smartphone or legacy desktop OCR.

## Artifact Output

Generated artifacts are written under:

```text
tmp/current-pc-bonus-ocr-diagnostics/
```

For each affected row the runner writes:

- `stageN-full.png`
- current bonus ROI crop and binarized crop
- wider bonus ROI crop
- taller bonus ROI crop
- shifted-left / shifted-right / shifted-up / shifted-down crops
- `score-slot` preprocessing variant
- PSM7 single-line variant
- per-variant OCR text
- parsed numbers
- numeric-like token audits
- plus-marker neighborhoods
- exact-bonus and digit-drop diagnostic flags
- `bonus-diagnostics.json`

The smoke validation command:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline 223152331 --current-pc-bonus-diagnostics
```

successfully generated diagnostics for `2026-07-11_223152331.png` Stage2 self at:

```text
tmp/current-pc-bonus-ocr-diagnostics/2026-07-11_223152331.png-stage2-self/bonus-diagnostics.json
```

That smoke row remained a digit-drop case: expected `107359`, captured `+10735`, and no variant recovered the exact bonus.

## Full 30-Row Audit Classification

The prior investigation identified 30 blocked rows. The new diagnostics are designed to run against those rows; the classification from existing evidence is:

| diagnostic cluster | rows | exact bonus evidence? | production status |
| --- | ---: | --- | --- |
| digit-drop / truncated bonus candidate | 13 | no | blocked |
| plus-marker OCR-confused nearby value | 3 | no | blocked |
| fragmented/noisy bonus text | 1 | no exact parsed evidence | blocked |
| nearby OCR-confused bonus candidate | 2 | no | blocked |
| bonus absent from captured evidence | 11 | no | blocked |

No cluster currently satisfies the bar for a runner-only recovery simulation.

## Variant Diagnostics

The diagnostic runner checks these variants for each affected row:

| variant | purpose |
| --- | --- |
| `current-bonus-roi` | baseline bonus crop using current crown-bonus preprocessing |
| `wider-bonus-roi` | catches horizontal clipping around `+` and trailing digits |
| `taller-bonus-roi` | catches vertical clipping or low descender/noise issues |
| `shifted-left-bonus-roi` | checks whether the plus marker or leading digit is outside the current crop |
| `shifted-right-bonus-roi` | checks whether trailing digits are clipped |
| `shifted-up-bonus-roi` | checks vertical alignment errors |
| `shifted-down-bonus-roi` | checks vertical alignment errors |
| `score-slot-threshold-variant` | compares score-slot preprocessing against crown-bonus preprocessing |
| `single-line-psm7-variant` | checks whether single-line segmentation improves bonus capture |

## Simulation Decision

No runner-only recovery simulation was added.

A later simulation should require all of:

- at least two exact positives from the same reliable variant/provenance,
- exact expected bonus evidence, not a near value,
- exact displayed total evidence,
- exact selected or safely reconstructable members,
- exact equation,
- unique interpretation,
- zero false positives across all current-PC fixtures,
- no filename or screenshot-specific logic,
- no hard-coded values,
- no near-match or digit-drop inference.

The current evidence does not meet that standard.

## Production Recommendation

Do not productionize yet.

The dominant failure is OCR evidence quality, not selection logic. Exact bonus values usually do not survive as reliable parsed candidates. The safest next step is to run the full diagnostic pass and inspect whether any specific variant repeatedly recovers exact bonuses. If it does, add a browser-equivalent parity report before considering production recovery.
