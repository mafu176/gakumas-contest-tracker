# iPad Expanded Fixture Transcription

## Scope

This pass expanded the manually verified iPad expected-fixture set from the original 18 selected screenshots to 38 completed screenshots.

The source folder was re-inventoried from:

`C:/Users/gkhay/Pictures/DMMGamePlayer/ipad`

The source folder no longer matches the earlier 75-image inventory. It currently contains 84 readable iPad result screenshots:

| Cluster | Dimensions | Source images | Complete fixtures | Pending fixtures |
| --- | ---: | ---: | ---: | ---: |
| ipad-01 | 1668x2420 | 64 | 23 | 41 |
| ipad-02 | 1640x2360 | 20 | 15 | 5 |
| Total | - | 84 | 38 | 46 |

No unreadable files or exact duplicates were found during this pass.

## Newly Completed Fixtures

20 new fixtures were manually transcribed from the source screenshots:

- IMG_0265.png
- IMG_0267.png
- IMG_0268.png
- IMG_0269.png
- IMG_0271.png
- IMG_0272.png
- IMG_0273.png
- IMG_0279.png
- IMG_0280.png
- IMG_0281.png
- IMG_0492.png
- IMG_0493.png
- IMG_0494.png
- IMG_0495.png
- IMG_0498.png
- IMG_0499.png
- IMG_0500.png
- IMG_0501.png
- IMG_0793.png
- IMG_0794.png

The screenshots were copied into `regression-test/ipad/`, and expected JSON fixtures were added under `regression-test/expected-ipad/`.

## Validation

Expected values were not inferred from OCR output. The screenshot image was used as the source of truth, then each completed fixture was validated by arithmetic and by the iPad crown-bonus rule.

Validation command:

```powershell
node scripts/ocr-test-images.mjs --validate-ipad-expected
```

Result:

| Metric | Result |
| --- | ---: |
| Complete fixtures | 38 |
| Pending fixtures | 46 |
| Stages checked | 114 |
| Stage/sides checked | 228 |
| Arithmetic mismatches | 0 |
| Crown-rule mismatches | 0 |

For every completed stage:

- exactly one side receives the crown bonus
- the bonus is `floor(max(all six raw members) * 0.20)`
- both side totals match `member1 + member2 + member3 + bonus`

## Pending Work

46 source screenshots remain pending. Because the inventory drifted from the earlier 75-image count to 84 images, the remaining set should be completed in audited batches rather than assumed to match the old inventory.

Recommended next intake step: transcribe another 20-30 screenshots, then rerun the expanded browser baseline before starting another production-tuning cycle.
