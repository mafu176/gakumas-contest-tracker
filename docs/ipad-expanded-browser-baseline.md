# iPad Expanded Browser Baseline

## Summary

The iPad browser-native production baseline was expanded from 18 completed fixtures to 38 completed fixtures. Production OCR behavior was frozen for this run; no recovery rules, ROI, preprocessing, ranking, or parser behavior were changed.

The expanded browser baseline was run through the real browser OCR path with resume/checkpoint support:

```powershell
node scripts/ipad-browser-expanded-baseline.mjs --runs 1 --resume
```

Artifacts were written under `tmp/ipad-expanded-baseline/`.

## Inventory

| Set | Images | Stages | Stage/sides |
| --- | ---: | ---: | ---: |
| Original completed fixtures | 18 | 54 | 108 |
| Newly completed fixtures | 20 | 60 | 120 |
| Expanded completed fixtures | 38 | 114 | 228 |
| Pending source screenshots | 46 | - | - |

The source folder currently contains 84 readable screenshots, not the earlier 75-image inventory.

## Production Accuracy

| Set | Image PASS | Stage PASS | Stage/side PASS |
| --- | ---: | ---: | ---: |
| Original 18 | 0 / 18 (0.0%) | 17 / 54 (31.5%) | 52 / 108 (48.1%) |
| New 20 | 0 / 20 (0.0%) | 21 / 60 (35.0%) | 60 / 120 (50.0%) |
| Combined 38 | 0 / 38 (0.0%) | 38 / 114 (33.3%) | 112 / 228 (49.1%) |

Field-level accuracy on the combined 38-fixture set:

| Field | PASS |
| --- | ---: |
| member1 | 151 / 228 (66.2%) |
| member2 | 127 / 228 (55.7%) |
| member3 | 150 / 228 (65.8%) |
| bonus | 162 / 228 (71.1%) |
| total | 129 / 228 (56.6%) |

Stage/side position breakdown:

| Position | PASS |
| --- | ---: |
| Stage1 self | 29 / 38 (76.3%) |
| Stage1 enemy | 31 / 38 (81.6%) |
| Stage2 self | 29 / 38 (76.3%) |
| Stage2 enemy | 23 / 38 (60.5%) |
| Stage3 self | 0 / 38 (0.0%) |
| Stage3 enemy | 0 / 38 (0.0%) |

## Recovery Generalization

All existing iPad production recoveries remained false-positive free on the expanded set.

| Recovery | Original TP / FP | New TP / FP | Combined TP / FP |
| --- | ---: | ---: | ---: |
| Tier C exactly-one arithmetic | 24 / 0 | 26 / 0 | 50 / 0 |
| Strict total selection | 4 / 0 | 6 / 0 | 10 / 0 |
| Strict member2 selection | 8 / 0 | 13 / 0 | 21 / 0 |
| Combined production recoveries | 36 / 0 | 45 / 0 | 81 / 0 |

The 20 new fixtures added 45 correct production recovery applications and 0 false positives. This supports the existing recovery architecture as generalized enough for the larger 38-fixture set.

## Failure Structure

Remaining stage/side rows by wrong-field count on the combined set:

| Wrong fields | Rows |
| ---: | ---: |
| 0 | 112 |
| 1 | 9 |
| 2 | 26 |
| 3 | 6 |
| 4 | 33 |
| 5 | 42 |

One-field-away rows:

| Field | Rows |
| --- | ---: |
| bonus | 5 |
| total | 2 |
| member3 | 1 |
| member1 | 1 |

Two-field-away rows:

| Fields | Rows |
| --- | ---: |
| member2 + total | 12 |
| member2 + bonus | 8 |
| bonus + total | 5 |
| member2 + member3 | 1 |

## Stage3 Generalization

Stage3 remains the dominant architecture problem:

| Stage3 Metric | Original 18 | New 20 | Combined 38 |
| --- | ---: | ---: | ---: |
| Stage3 side PASS | 0 / 36 | 0 / 40 | 0 / 76 |
| Stage3 self PASS | 0 / 18 | 0 / 20 | 0 / 38 |
| Stage3 enemy PASS | 0 / 18 | 0 / 20 | 0 / 38 |
| Stage3 member1 exact | 0 / 36 | 1 / 40 | 1 / 76 |
| Stage3 member2 exact | 1 / 36 | 0 / 40 | 1 / 76 |
| Stage3 member3 exact | 1 / 36 | 0 / 40 | 1 / 76 |
| Stage3 bonus exact | 10 / 36 | 22 / 40 | 32 / 76 |
| Stage3 total exact | 0 / 36 | 0 / 40 | 0 / 76 |

The original 18-fixture Stage3 difficulty was representative, not an outlier. The newly completed fixtures show the same 0% Stage3 side-pass rate.

## Decision

The expanded baseline supports three conclusions:

1. Existing iPad production recoveries generalize cleanly: combined TP / FP is 81 / 0.
2. The remaining high-leverage problem is not another narrow selector on the current evidence. Stage3 recognition/capture remains structurally poor.
3. Future iPad OCR work should use the expanded fixture set and prioritize a Stage3 v2 architecture investigation, while continuing fixture expansion in audited batches.

Recommendation: finish the remaining 46 pending screenshots before making broad iPad production changes, unless a Stage3 v2 diagnostic needs a smaller representative subset first.
