# iPad 84-Fixture OCR Opportunity Reassessment

Status: diagnostic-only. Production OCR behavior was not changed.

## Dataset Status

The complete readable iPad dataset is now fixture-backed.

| metric | result |
| --- | ---: |
| expected fixtures | 84 |
| stages | 252 |
| stage/sides | 504 |
| pending readable screenshots | 0 |
| exact duplicate groups requiring exclusion | 0 |
| expected arithmetic | PASS |
| crown-bonus floor rule | PASS |

Validation command:

```powershell
node scripts/ocr-test-images.mjs --validate-ipad-expected
```

## Artifact Provenance

The full browser OCR path is expensive, so this reassessment consolidates retained authoritative artifacts instead of rerunning all 84 images.

| source block | fixtures | artifact | detail level | compatibility |
| --- | ---: | --- | --- | --- |
| original selected + expanded safety set | 53 | `tmp/ipad-production-fp-investigation/after-fix-53-two-run-summary.json` | aggregate only | same production recovery stack, two-run stable |
| expansion batch 1 | 10 | `docs/ipad-fixture-expansion-and-reassessment.md` | aggregate only | documented compatible browser production run |
| expansion batch 2 | 11 | `tmp/ipad-fixture-expansion-batch2/browser-new-batch-summary.json` | failed rows | compatible expanded-baseline browser script |
| final expansion pass | 10 | `tmp/ipad-expanded-baseline/combined-summary.json` | full per-side | latest post-`99186bc` browser production run |

Generated reassessment artifacts are under:

```text
tmp/ipad-84-opportunity-reassessment/
```

Candidate/provenance claims below are limited to retained detailed artifacts. Missing candidate-level detail is reported as unknown, not as recognition absence.

## Production Baseline

Conservative combined 84-fixture baseline:

| level | exact | fail | total |
| --- | ---: | ---: | ---: |
| image | 0 | 84 | 84 |
| stage | 88 | 164 | 252 |
| stage/side | 248 | 256 | 504 |

Recovery safety:

| recovery | TP | FP |
| --- | ---: | ---: |
| Tier C | 97 | 0 |
| strict-total | 18 | 0 |
| strict-member2 | 40 | 0 |
| combined | 155 | 0 |

## Stage Summary

Full 84 aggregate:

| scope | exact | fail | total |
| --- | ---: | ---: | ---: |
| Stage1+Stage2 combined sides | 248 | 88 | 336 |
| Stage3 sides | 0 | 168 | 168 |

The retained aggregate summaries do not safely separate all84 Stage1 from Stage2. In the retained full per-side subset, Stage1 and Stage2 remain comparatively healthy while Stage3 remains 0%.

| retained full per-side subset | exact | fail | total |
| --- | ---: | ---: | ---: |
| Stage1 | 39 | 17 | 56 |
| Stage2 | 42 | 14 | 56 |
| Stage3 | 0 | 56 | 56 |

## Field And Histogram Limits

All84 field-level exactness is not safely reconstructable from retained production aggregate summaries. The retained full per-side subset has:

| field | pass | wrong | total |
| --- | ---: | ---: | ---: |
| member1 | 109 | 59 | 168 |
| member2 | 99 | 69 | 168 |
| member3 | 113 | 55 | 168 |
| bonus | 110 | 58 | 168 |
| total | 100 | 68 | 168 |

Retained failure-inventory wrong-field histogram:

| wrong fields | rows |
| ---: | ---: |
| 1 | 20 |
| 2 | 19 |
| 3 | 9 |
| 4 | 31 |
| 5 | 45 |

## One-Field-Away

Retained failure inventory:

| wrong field | rows |
| --- | ---: |
| bonus | 15 |
| total | 4 |
| member1 | 1 |

By stage:

| stage | rows |
| --- | ---: |
| Stage1 | 12 |
| Stage2 | 8 |
| Stage3 | 0 |

The old 53-fixture Stage1/2 bonus ceiling was `5 theoretical / 1 confirmed`. The 84-fixture retained inventory now shows 15 one-field bonus rows, but only 1 remains confirmed pure-selection from prior browser provenance. The other 14 are provenance-unknown until a focused browser capture is run.

## Two-Field-Away

Dominant retained pairs:

| fields | rows |
| --- | ---: |
| member2 + bonus | 19 |
| member2 + total | 3 |
| bonus + total | 3 |
| member1 + bonus | 1 |

These are not directly production-ready. They likely need candidate/provenance refresh, and some may still be recognition failures.

## Recognition Vs Selection

For retained detailed failures, full candidate pools are not preserved consistently. Current classification is therefore conservative:

| classification | count |
| --- | ---: |
| confirmed selection | 0 |
| confirmed recognition | 0 |
| guard-blocked | 0 |
| unknown candidate provenance | 434 wrong fields |

Do not treat the 434 unknown fields as recognition absence. They are a provenance gap in retained artifacts.

## Structural Shapes

Repeated retained failure shapes:

| shape | rows |
| --- | ---: |
| Stage3 broad recognition/candidate-capture failure | 78 |
| member2 + bonus displacement/noise | 19 |
| one bonus wrong, other fields correct | 15 |
| one total wrong, other fields correct | 4 |
| bonus + total pair | 3 |
| member2 + total pair | 3 |

## Opportunity Ranking

| rank | family | confirmed ceiling | possible retained ceiling | needs new OCR? | next diagnostic |
| ---: | --- | ---: | ---: | --- | --- |
| 1 | Stage1/2 bonus provenance refresh | 1 | 15 | no | focused real-browser candidate/provenance capture |
| 2 | Stage1/2 strict total follow-up | 0 | 4 | no | include in same provenance capture |
| 3 | Stage1/2 member one-field selection | 0 | 1 | no | only if bundled with bonus/total capture |
| 4 | Stage3 candidate reuse | 0 | 0 | no | defer |
| 5 | RapidOCR Stage3 | 0 | 0 | yes | close out unless architecture changes |

## Stage3 Conclusion

Across the complete 84-fixture dataset, Stage3 remains the dominant failure surface:

| metric | result |
| --- | ---: |
| Stage3 sides | 168 |
| exact Stage3 sides | 0 |
| failed Stage3 sides | 168 |
| confirmed selection-only ceiling | 0 |

The added fixtures did not change the previous Stage3 conclusion. Stage3 still looks like recognition/candidate-capture weakness, not a clean selector problem. Missing detailed Stage3 artifacts are not counted as an opportunity.

## RapidOCR Closeout And Bundle Audit

RapidOCR remains closed as a production direction for now:

- browser feasibility was proven
- production-readiness review found `NET_NEW_TP = 0` and `NET_NEW_FP = 0`
- no productionization is recommended
- no further tuning is recommended from this reassessment

Bundle/runtime audit:

| item | result |
| --- | --- |
| `onnxruntime-web` dependency | present, `1.27.0` |
| normal OCR runtime model load | no retained evidence of ORT/model initialization |
| normal OCR behavior | developer-only RapidOCR paths stay inactive |
| cleanup value | a later bundle-size cleanup audit may be worthwhile, but no refactor was done here |

## Recommendation

Selected next investigation:

```text
focused real-browser candidate/provenance capture for Stage1/2 one-field bonus and total rows
```

Reason:

- confirmed net-new ceiling is only 1, so no production selector should be built now
- retained failure inventory shows a possible 15 bonus rows and 4 total rows, but candidate provenance is missing
- focused capture is cheaper and safer than full 84-image browser rerun
- Stage3 and RapidOCR should not be reopened from this reassessment

Should iPad OCR optimization continue now?

Yes, but only as a focused provenance-capture task. If that capture does not show at least 2 generalized exact-evidence TP with 0 FP risk, stop current iPad OCR optimization until new screenshots or a materially different OCR architecture appears.

Production unchanged: no OCR output, recovery guards, ROI, preprocessing, smartphone OCR, current-PC OCR, legacy desktop OCR, idols data, or RapidOCR production behavior was modified.
