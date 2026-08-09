# iPad Global Leverage Review

Diagnostic-only browser-native review after `7698c46`.

No production OCR behavior was changed. The review used the current real-browser production verification artifacts and browser-native diagnostic candidate pools from the completed iPad bonus T3 boundary investigation. Expected fixtures were used only after browser OCR output and candidate generation were complete.

Artifacts are written under `tmp/ipad-global-leverage-review/`.

## Command

```bash
node scripts/ipad-global-leverage-review.mjs
```

The script compares two completed browser-native runs and writes the field matrix, failing-side matrix, oracle leverage tables, and recommendation artifacts. It does not invoke new OCR, modify candidates, or apply proposals.

## Production Baseline

The two source browser runs were stable for the global review metrics.

| Metric | Result |
| --- | ---: |
| Fixtures | 18 / 18 |
| Stages | 54 |
| Stage/sides | 108 |
| Image PASS | 0 / 18 |
| Stage PASS | 10 / 54 |
| Stage/side PASS | 44 / 108 |
| Remaining failing stage/sides | 64 |
| Production applications | 28 |
| Production TP / FP | 28 / 0 |

Current production recoveries remain Tier C and strict-total only for iPad. The review did not alter member T2 parsing, Tier C, strict-total, ROI, preprocessing, candidate ranking, bonus parsing, total parsing, fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Wrong Field Categories

All 540 fields were rebuilt as:

18 images x 3 stages x 2 sides x 5 fields.

Wrong fields classify as:

| Primary category | Count |
| --- | ---: |
| A. exact candidate present, selected wrong | 29 |
| B. exact candidate absent | 159 |
| C. pool empty | 4 |
| D. pool incomplete/truncated | 19 |
| E. default-zero-only evidence | 0 |
| F. parser-safe evidence exists but is not productionized | 0 |
| G. infrastructure/export issue | 0 |

Selection headroom exists, but recognition/capture absence is still the dominant global problem.

## Remaining Side Histogram

The 64 failing stage/sides break down as:

| Wrong fields on side | Count |
| --- | ---: |
| 1 | 15 |
| 2 | 11 |
| 3 | 3 |
| 4 | 10 |
| 5 | 25 |

This is the most important leverage signal: only 15 sides are one-field-away. The remaining 49 need at least two independent fixes, and 35 need three or more.

## One-Field-Away

| Field | Count |
| --- | ---: |
| member2 | 8 |
| bonus | 5 |
| total | 2 |

The member2 group is the only one-field-away family with enough immediate leverage to justify a focused next experiment. These are selection failures in the current browser-native candidate matrix, not recognition failures.

Representative member2-only rows:

| Image | Stage | Side | Current member2 | Expected member2 | Exact candidate present |
| --- | ---: | --- | ---: | ---: | --- |
| IMG_0278.png | 1 | self | 4333611 | 333611 | yes |
| IMG_0283.png | 1 | self | 4 | 94758 | yes |
| IMG_0332.png | 1 | self | 6157594 | 157594 | yes |
| IMG_0497.png | 1 | self | 2762450 | 762450 | yes |
| IMG_0497.png | 2 | enemy | 0 | 420613 | yes |
| IMG_0792.png | 1 | self | 6458571 | 458571 | yes |
| IMG_0792.png | 1 | enemy | 0 | 284090 | yes |
| IMG_0796.png | 2 | enemy | 0 | 274726 | yes |

Bonus-only rows exist, but recent T3 work showed the capture path is noisy and low stage/side yield. Total-only rows are only two sides and total selection was already productionized for the safe strict subset.

## Two-Field-Away

Dominant pairs:

| Pair | Count |
| --- | ---: |
| member2 + bonus | 6 |
| member2 + total | 3 |
| bonus + total | 2 |

Member2 appears in 9 of 11 two-field-away sides. This reinforces that member2 selection is a better small next target than restarting bonus capture.

## Single-Family Oracle Leverage

This oracle makes only one field family perfect and leaves all other production output unchanged.

| Oracle | Additional stage/side PASS | Stage/side PASS | Stage PASS | Image PASS |
| --- | ---: | ---: | ---: | ---: |
| member1 only | 0 | 44 / 108 | 10 / 54 | 0 / 18 |
| member2 only | 8 | 52 / 108 | 17 / 54 | 0 / 18 |
| member3 only | 0 | 44 / 108 | 10 / 54 | 0 / 18 |
| bonus only | 5 | 49 / 108 | 15 / 54 | 0 / 18 |
| total only | 2 | 46 / 108 | 12 / 54 | 0 / 18 |
| all members | 8 | 52 / 108 | 17 / 54 | 0 / 18 |
| all members except Stage3 member2 | 8 | 52 / 108 | 17 / 54 | 0 / 18 |
| Stage3 member2 only | 0 | 44 / 108 | 10 / 54 | 0 / 18 |

The surprising result is that perfect all-member repair has the same side-level gain as member2 alone. The current one-field-away member leverage is concentrated in Stage1/Stage2 member2, not Stage3.

## Two-Family Oracle Leverage

| Oracle | Additional stage/side PASS | Stage/side PASS | Stage PASS | Image PASS |
| --- | ---: | ---: | ---: | ---: |
| member1 + member2 | 8 | 52 / 108 | 17 / 54 | 0 / 18 |
| member2 + member3 | 8 | 52 / 108 | 17 / 54 | 0 / 18 |
| all members + bonus | 20 | 64 / 108 | 28 / 54 | 0 / 18 |
| all members + total | 23 | 67 / 108 | 23 / 54 | 2 / 18 |
| bonus + total | 9 | 53 / 108 | 19 / 54 | 0 / 18 |
| Stage3 member2 + bonus | 5 | 49 / 108 | 15 / 54 | 0 / 18 |
| Stage3 member2 + total | 2 | 46 / 108 | 12 / 54 | 0 / 18 |

Large gains require multiple field families. That makes broad production changes risky unless a solver can prove exact uniqueness from observed candidates.

## Selection vs Recognition

| Field | Wrong | Selection headroom | Recognition headroom |
| --- | ---: | ---: | ---: |
| member1 | 37 | 2 | 35 |
| member2 | 54 | 19 | 35 |
| member3 | 35 | 0 | 35 |
| bonus | 41 | 4 | 37 |
| total | 44 | 4 | 40 |

The best selection headroom is member2. Most other remaining problems are recognition/capture problems, not selector problems.

## Stage Breakdown

| Stage | PASS | FAIL | One-field-away | Two-fields-away | Dominant wrong fields |
| --- | ---: | ---: | ---: | ---: | --- |
| Stage1 | 20 | 16 | 9 | 6 | member2 13, bonus 8 |
| Stage2 | 24 | 12 | 6 | 5 | bonus 7, total 6, member2 6 |
| Stage3 | 0 | 36 | 0 | 0 | member1 36, total 36, member2 35, member3 35 |

Stage3 remains categorically different. Every Stage3 side still fails, and none are one-field-away. Field-by-field Stage3 micro-tuning is unlikely to produce visible image-level progress from this dataset.

## Self / Enemy And Cluster Breakdown

| Group | PASS | FAIL | Notes |
| --- | ---: | ---: | --- |
| self | 24 | 30 | member2 and total are common blockers |
| enemy | 20 | 34 | bonus and total are slightly heavier |
| ipad-01 | 35 | 43 | more total wrong fields because this cluster has more fixtures |
| ipad-02 | 9 | 21 | same structural shape, not a separate hidden bottleneck |

No evidence suggests a cluster-specific fix is the next best target.

## Candidate Completeness

| Metric | Count |
| --- | ---: |
| Failing sides with truncated pools | 27 |
| Wrong fields marked truncated | 23 |
| Candidate cap loss likely | 23 |

Completeness metadata is worth auditing later, but it is not the top next step because it spans many noisy recognition failures and does not map cleanly to immediate one-field-away recovery.

## Prior Diagnostic Evidence

| Direction | Result | Decision |
| --- | --- | --- |
| Bonus broad T3 | +3 exact bonus candidates, 14 noisy fields | rejected |
| Bonus T3-B | +3 exact candidates, 9 noisy fields, +1 side TP | rejected for production review |
| Bonus T3-C | +2 exact candidates, 4 noisy fields, +0 side TP | rejected |
| Total strict selector | +4 TP / 0 FP | productionized |
| Stage3 member2 crop/config/segmentation | no safe production candidate | rejected/deferred |

The global review does not justify reviving bonus T3 now.

## Upper Bounds

| Scenario | Stage/side PASS | Stage PASS | Image PASS |
| --- | ---: | ---: | ---: |
| Current production | 44 / 108 | 10 / 54 | 0 / 18 |
| Perfect selection from existing candidates | 58 / 108 | 22 / 54 | 0 / 18 |
| Perfect member2 only | 52 / 108 | 17 / 54 | 0 / 18 |
| Perfect bonus + total | 53 / 108 | 19 / 54 | 0 / 18 |
| Perfect all members | 52 / 108 | 17 / 54 | 0 / 18 |
| Perfect all five fields | 108 / 108 | 54 / 54 | 18 / 18 |

Selection-only work can improve stage/sides, but image PASS remains blocked by Stage3 multi-field failures.

## Ranked Next Targets

| Rank | Target | One-field-away sides | Selection/recognition | Risk note | Recommendation score |
| ---: | --- | ---: | --- | --- | ---: |
| 1 | member2 selection | 8 | selection | needs bounded selector proof | 32 |
| 2 | candidate completeness/truncation plumbing | 20 | plumbing | broad, unclear direct TP path | 23 |
| 3 | bonus recognition | 4 | recognition | high T3 noise already observed | 14 |
| 4 | member2 recognition | 0 | recognition | previous Stage3 diagnostics low-gain | 8 |
| 5 | bonus selection | 1 | selection | low leverage | 8 |
| 6 | total recognition | 2 | recognition | capture problem, unclear safety | 8 |

## Stage3 Architecture Conclusion

Stage3 should remain a separate architecture problem, not the next small production candidate. The current evidence says Stage3 failures usually require several fields at once. Existing member2-focused Stage3 investigations did not produce safe candidate coverage, and no Stage3 side is one-field-away after current production recoveries.

A future Stage3 redesign may still be necessary, but it should be treated as a larger architecture effort with fresh evidence and probably more samples.

## Diminishing Returns

The easiest remaining pool is 15 one-field-away sides. A perfect member2 selector would raise stage/side PASS from 44 to 52. Reaching 60 / 108 would require almost every one-field-away fix plus additional two-field repairs. Reaching 70 / 108 is not realistic through small independent OCR rules on the current 18-fixture set.

Incremental OCR tuning is therefore entering diminishing returns. One more bounded selector experiment is justified because it targets an observed exact-candidate selection problem with 8 immediate sides. If that does not produce a zero-FP path, the better next move is more iPad samples or a Stage3 architecture redesign.

## Recommendation

Recommended next experiment:

**Strict member2 selection investigation.**

Scope:

- browser-native diagnostic only at first
- focus on exact candidate present but selected wrong
- start with the 8 one-field-away member2 sides
- also evaluate the 11 two-field-away sides where member2 participates
- require exact candidate provenance and zero FP across all 18 fixtures
- do not touch member capture, bonus T3, total capture, Tier C, strict-total, or Stage3 architecture

More samples are not required before this one narrow experiment. They should become the preferred path if member2 selection cannot clear a realistic +2 stage/side, zero-FP threshold.

