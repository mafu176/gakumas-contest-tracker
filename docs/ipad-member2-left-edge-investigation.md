# iPad Member2 Left-Edge Investigation

Commit under analysis: `d43a7dc` (`Investigate iPad member2 OCR quality`)

This is a diagnostic-only browser-native investigation. It does not change production OCR output, production preprocessing, iPad ROI definitions, candidate parsing, candidate ranking, Tier C, smartphone OCR, current-PC OCR, legacy desktop OCR, or expected fixtures.

## Production Baseline

The baseline was confirmed before the diagnostic run:

| Metric | Result |
| --- | ---: |
| iPad fixtures processed | 18 / 18 |
| Browser production stage/side PASS | 25 / 108 |
| Tier C applications | 9 |
| Tier C TP / FP | 9 / 0 |

The production member2 baseline remains:

| Metric | Result |
| --- | ---: |
| member2 fields | 108 |
| production candidate present | 42 / 108 (38.9%) |
| selected exact | 34 / 108 (31.5%) |
| Stage3 member2 candidate present | 0 / 36 |

## Command

```sh
node scripts/ipad-member2-left-edge-investigation.mjs --runs 2 --variants left-minus-2,left-minus-4,left-minus-6,prev-pad06
```

Artifacts:

```text
tmp/ipad-member2-left-edge-investigation/
```

The script uses the real browser OCR path through Playwright, then runs diagnostic-only browser-side Tesseract on iPad `member2` crops. Expected fixtures are used only after OCR completes for scoring.

## Crop Matrix

The implemented script supports a broader bounded matrix, including:

- production-equivalent symmetric padding
- symmetric padding reductions
- left-only padding reductions
- right-only padding reductions
- asymmetric left/right combinations
- normalized-ratio variants

The completed two-run diagnostic used the focused left-edge matrix:

| Variant | Crop rule |
| --- | --- |
| `left-minus-2` | left padding reduced by 2 source pixels |
| `left-minus-4` | left padding reduced by 4 source pixels |
| `left-minus-6` | left padding reduced by 6 source pixels |
| `prev-pad06` | previous best symmetric 6% padding |

Each crop variant was tested with:

| Profile | Description |
| --- | --- |
| `prod-like-3x` | production-like score preprocessing, 3x |
| `white-mask-3x` | white-mask, 3x, PSM7 |

Vertical geometry was fixed. The script changes only horizontal crop boundaries/padding for diagnostic OCR.

## Contamination Evidence

Member2 foreground/component metrics from the production source rectangle:

| Scope | left5 | left10 | left15 | right5 | right10 | right15 | left-border components | right-border components | components avg |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| all member2 | 0.0250 | 0.0699 | 0.1355 | 0.0554 | 0.1106 | 0.1433 | 80.6% | 85.2% | 10.94 |
| Stage1 | 0.0185 | 0.0653 | 0.1341 | 0.0606 | 0.1218 | 0.1471 | 41.7% | 55.6% | 8.64 |
| Stage2 | 0.0207 | 0.0640 | 0.1318 | 0.0629 | 0.1108 | 0.1372 | 100.0% | 100.0% | 9.92 |
| Stage3 | 0.0358 | 0.0804 | 0.1405 | 0.0426 | 0.0990 | 0.1455 | 100.0% | 100.0% | 14.25 |

Stage3 has the highest component density and left-edge foreground share, but right-edge contact is also universal for Stage2/Stage3. This does not support a clean "left edge only" explanation.

## Variant Results

Two fresh browser-context runs were completed. All tested variants were stable at the aggregate count level across the two runs.

| Variant/profile | New expected member2 fields | Stage3 gains | Candidate noise fields | Evidence loss fields | Avg ms/field | Stability | Recommendation |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `prev-pad06__prod-like-3x` | 19 | 0 | 56 | 21 | 34 | stable | reject |
| `prev-pad06__white-mask-3x` | 15 | 0 | 56 | 22 | 32 | stable | reject |
| `left-minus-6__prod-like-3x` | 14 | 0 | 41 | 23 | 36 | stable | reject |
| `left-minus-4__prod-like-3x` | 11 | 0 | 50 | 24 | 36 | stable | reject |
| `left-minus-2__white-mask-3x` | 11 | 0 | 51 | 26 | 34 | stable | reject |
| `left-minus-4__white-mask-3x` | 10 | 0 | 51 | 25 | 34 | stable | reject |
| `left-minus-2__prod-like-3x` | 9 | 0 | 53 | 26 | 46 | stable | reject |
| `left-minus-6__white-mask-3x` | 8 | 0 | 50 | 24 | 34 | stable | reject |

Noise definition:

- **candidate noise fields**: fields where the variant introduces at least one new non-expected numeric candidate not already present in production evidence.
- **evidence loss fields**: fields where production already contained the expected member2 candidate but the variant no longer contains it.
- **simulated output FP fields** are tracked separately by the script; no production output or candidate ranking is changed.

## Stage Breakdown

No tested horizontal crop variant produced any Stage3 expected member2 gain.

| Profile family | Stage1/2 gain | Stage3 gain | Interpretation |
| --- | ---: | ---: | --- |
| left-only reductions | yes | 0 | helps some lower-stage merged values but not Stage3 |
| previous symmetric 6% padding | yes | 0 | still noisy and loses existing evidence |

This is the key finding. If left-edge contamination were the dominant Stage3 member2 issue, a uniform left reduction should have recovered at least some Stage3 expected candidates. It did not.

## Cluster Notes

The previous member2 investigation showed:

| Cluster | member2 candidate present |
| --- | ---: |
| ipad-01 | 40 / 78 |
| ipad-02 | 2 / 30 |

The left-edge run did not show a safe cluster-specific crop correction. A cluster-specific parameter is not justified yet because the accepted evidence is noisy and Stage3 gains are zero.

## Tier C Diagnostic Effect

No production Tier C behavior was changed.

The candidate-pool-only result is not promising enough to run toward parity or production:

- best new expected count: `19`
- Stage3 gain: `0`
- best lower-noise left-only result: `left-minus-6__prod-like-3x`, `+14` expected with `41` noise fields and `23` evidence-loss fields
- previous baseline for comparison: `+15` expected with `40` noise fields

The new left-only variants do not improve the gain/noise tradeoff over the previous diagnostic baseline, and they lose too much existing evidence.

## Stage3 Root Cause

Stage3 member2 appears to have a distinct geometry/OCR quality issue:

- production candidate presence remains `0 / 36`
- all tested left-edge reductions produce `0` Stage3 expected gains
- Stage3 has higher component count (`14.25` avg) and universal border-touching components
- both left and right edge regions contain foreground evidence

This points away from simple left-edge contamination and toward one of:

- broader Stage3 crop overlap/clipping
- Stage3 row/slot alignment issue
- OCR tokenization failure where multiple groups are merged or discarded
- preprocessing not preserving Stage3 digit shapes

Do not productionize a Stage3-specific crop change from this evidence.

## Recommended Next Step

Selected next step: **C. Parser/tokenization investigation for raw OCR containing multiple groups**.

Reason:

- Horizontal crop reductions were stable but not useful for Stage3.
- The best left-edge variants did not beat the prior `+15 / 40 noise` tradeoff.
- Evidence loss is high across all tested variants.
- The remaining signal is that OCR often contains useful digits in merged or multi-group raw text, but not as clean candidate evidence.

No member2 crop change should be productionized yet.

## Production Isolation

Confirmed unchanged:

- production member2 crop
- iPad ROI templates
- production preprocessing
- candidate parser
- candidate ranking
- Tier C semantics
- Tier C production application count
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
- expected fixtures

Generated `tmp/ipad-member2-left-edge-investigation/` artifacts are not intended for commit.
