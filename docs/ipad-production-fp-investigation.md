# iPad Production FP Investigation

Status: production safety fix implemented for the expanded 53-fixture iPad set.

This investigation was triggered after the expanded iPad production browser baseline reported one existing-production false positive. It does not modify RapidOCR R6, add any Stage3 recovery, change iPad ROI/preprocessing, or affect smartphone/current-PC/legacy desktop OCR.

## Reproduction

The expanded browser-native iPad baseline over 53 complete expected fixtures reproduced:

| metric | before fix |
| --- | ---: |
| fixtures | 53 |
| stage/sides | 318 |
| production applications | 120 |
| production TP / FP | 119 / 1 |
| Tier C TP / FP | 72 / 0 |
| strict-total TP / FP | 15 / 1 |
| strict-member2 TP / FP | 32 / 0 |

The responsible recovery family was `ipad-strict-total-selection`.

## Exact FP Row

| field | value |
| --- | --- |
| image | `IMG_0801.png` |
| stage | 3 |
| side | self |
| recovery | `ipad-strict-total-selection` |
| before | members `1 / 5 / 1`, bonus `0`, total `2` |
| after | members `1 / 5 / 1`, bonus `0`, total `7` |
| expected | members `1470726 / 894660 / 1332227`, bonus `0`, total `3697613` |
| changed field | total |
| equation accepted before fix | `1+5+1+0=7` |
| observed total raw text | `VYVIIN + AT7T... 2 A007 A130:` |
| observed total candidates | `7`, `007`, `7` |

The current member values were OCR garbage with strong-looking provenance. The strict-total selector only checked that selected non-total fields had provenance and that the computed total appeared in the total candidate pool. It did not reject implausibly tiny arithmetic totals.

## Root Cause

This was not a RapidOCR issue and not a grouped-number member side effect. It was a strict-total safety gap:

- selected member evidence existed, but the values were `1 / 5 / 1`
- observed total evidence existed for `7`
- arithmetic was exact, but the entire row was numeric noise
- no earlier recovery had already resolved Stage3 self
- strict-total treated the noise equation as eligible

The initially visible `unexpectedApplications` entry for `IMG_0265.png` was not the actual FP. `IMG_0265.png` S2 enemy is correct after strict-total (`40141 / 28221 / 55389`, total `123751`). It was only absent from the older strict-total accepted-case list used for parity provenance comparison.

## TP vs FP Feature Comparison

The 15 strict-total TP rows after expansion all had proposed totals of at least `62452`.

The FP proposed total was `7`.

| group | rows | minimum proposed total | FP |
| --- | ---: | ---: | ---: |
| strict-total TP | 15 | 62452 | 0 |
| strict-total FP | 1 | 7 | 1 |

Fragment evidence was audited. Some TP rows include harmless suffix/prefix noise in the same OCR text, for example `123.7515` around a correct `123751` candidate. A blanket prefix/suffix fragment rejection would lose valid TP rows, so that was not chosen.

## Safety Variants

| policy | result |
| --- | --- |
| S0 current strict-total | 15 TP / 1 FP |
| reject all prefix/suffix candidates | rejected: would drop valid TP such as `IMG_0265.png` |
| require stronger duplicate profile agreement | rejected: FP also had repeated profile evidence |
| require observed total >= five digits | accepted: preserves all 15 TP and blocks the single FP |

Chosen guard:

`computedValidationTotal >= 10000`

This is expected-blind and iPad strict-total-only. It does not use filename, screenshot ID, expected values, near matching, member invention, or RapidOCR evidence.

## Recovery Ordering

Observed production order remains:

1. base browser OCR selection
2. grouped-number candidate contribution
3. Tier C
4. strict-total
5. strict-member2
6. final output

The FP did not depend on a prior recovery changing the same row. After the fix, `IMG_0801.png` S3 self is rejected by strict-total with:

`computed-total-below-strict-total-display-floor`

## After-Fix Verification

Two fresh browser runs were completed over all 53 complete fixtures. The first long run timed out after partial run 2 artifact generation, so the remaining five run-2 images were resumed and the full 53-image result was reconstructed from per-image browser artifacts.

| metric | run 1 | run 2 |
| --- | ---: | ---: |
| fixtures processed | 53 | 53 |
| image PASS | 0 | 0 |
| stage PASS | 58 | 58 |
| stage/side PASS | 162 | 162 |
| production applications | 119 | 119 |
| production TP / FP | 119 / 0 | 119 / 0 |
| Tier C TP / FP | 72 / 0 | 72 / 0 |
| strict-total TP / FP | 15 / 0 | 15 / 0 |
| strict-member2 TP / FP | 32 / 0 | 32 / 0 |
| stable application rows | 119 / 119 | 119 / 119 |

## Original38 / New15 Split

The 15 new fixtures are the manifest entries marked `stage3 RapidOCR safety expansion`.

| split | Tier C TP / FP | strict-total TP / FP | strict-member2 TP / FP |
| --- | ---: | ---: | ---: |
| original 38 | 50 / 0 | 10 / 0 | 21 / 0 |
| new 15 | 22 / 0 | 5 / 0 | 11 / 0 |
| combined 53 | 72 / 0 | 15 / 0 | 32 / 0 |

## Parity

The strict-total shared runner/browser-equivalent parity remains exact:

- compared stage/sides: 108
- exact parity: 108 / 108
- accepted-case TP / FP: 4 / 0
- safety-relevant mismatches: 0
- focused guard test added: `computed-total-too-small`

Strict-member2 parity remains exact:

- compared stage/sides: 108
- accepted-case TP / FP: 8 / 0
- safety-relevant mismatches: 0

## RapidOCR Roadmap

RapidOCR R6 can resume unchanged. This issue was an existing strict-total production guard gap, not a RapidOCR candidate-fragment issue. The only carry-forward lesson for R6 is to keep rejecting low-value exact arithmetic equations when the underlying member evidence is visibly OCR noise.

## Artifacts

Generated artifacts were written under `tmp/ipad-production-fp-investigation/` and are not committed:

- `strict-total-tp-vs-fp-features.json`
- `original38-new15-split.json`
- `after-fix-53-two-run-summary.json`

## Conclusion

Production iPad recovery safety is back to zero FP on the expanded 53-fixture set with no validated TP loss. The fix is narrow, shared, and expected-blind.
