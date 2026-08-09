# iPad Browser OCR Post Strict-Total Failure Analysis

This is a diagnostic-only browser-native analysis after the production iPad Tier C and strict-total recoveries. It does not change production OCR behavior, Tier C semantics, strict-total semantics, T2 grouped-number parsing, ROI, preprocessing, candidate ranking, expected fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Commands

- Production verification: `node scripts/ipad-browser-production-verification.mjs --runs 2`
- Failure analysis: `node scripts/ipad-browser-post-strict-total-failure-analysis.mjs --runs 2`
- Artifacts: `tmp/ipad-post-strict-total-failure-analysis/`

The production verifier initially timed out during the second fresh run after completing run 1 and part of run 2. It was resumed with existing run artifacts and completed the same two-run verification set. The post-strict-total analysis also used one fresh run plus one fresh second run, then resumed only for deterministic report regeneration.

## Production Baseline

| Metric | Result |
| --- | ---: |
| iPad fixtures | 18 |
| Stage/sides | 108 |
| Image PASS | 0 / 18 |
| Stage PASS | 10 / 54 |
| Stage/side PASS | 44 / 108 |
| Exact fields | 329 / 540 |

Production recovery contribution:

| Recovery | Applications | TP | FP |
| --- | ---: | ---: | ---: |
| Tier C exactly-one arithmetic | 24 | 24 | 0 |
| Strict total selection | 4 | 4 | 0 |
| Combined | 28 | 28 | 0 |

## Stage/Side Taxonomy

All 108 stage/sides are classified into exactly one category.

| Category | Count |
| --- | ---: |
| A. Primary PASS without production recovery | 16 |
| B. Recovered by Tier C | 24 |
| C. Recovered by strict-total | 4 |
| D. Full expected tuple present but safely blocked | 11 |
| E. Partial expected evidence only | 16 |
| F. No useful expected evidence | 16 |
| G. Candidate pool incomplete/truncated | 21 |
| H. Infrastructure/export failure | 0 |

Remaining failing stage/sides: 64.

## Field Coverage

| Field status | Count |
| --- | ---: |
| selected exact | 329 |
| exact observed candidate present but not selected | 5 |
| exact grouped-number T2 candidate present | 20 |
| permitted default-zero only | 0 |
| exact candidate absent | 159 |
| candidate pool empty | 4 |
| candidate pool incomplete/truncated | 23 |

Current exact candidate coverage by field:

| Field | selected exact | exact candidate present | exact candidate absent |
| --- | ---: | ---: | ---: |
| member1 | 71 / 108 | 72 / 108 | 36 |
| member2 | 54 / 108 | 73 / 108 | 35 |
| member3 | 73 / 108 | 73 / 108 | 35 |
| bonus | 67 / 108 | 68 / 108 | 40 |
| total | 64 / 108 | 68 / 108 | 40 |

Recognition versus selection for wrong fields:

| Type | Count |
| --- | ---: |
| Wrong fields | 211 |
| Selection failures | 25 |
| Recognition failures | 186 |
| Incomplete/truncated | 23 |
| Empty pool | 4 |
| Parser-safe but unselected | 20 |

By field:

| Field | Selection | Recognition |
| --- | ---: | ---: |
| member1 | 1 | 36 |
| member2 | 19 | 35 |
| member3 | 0 | 35 |
| bonus | 1 | 40 |
| total | 4 | 40 |

By stage:

| Stage | Selection | Recognition |
| --- | ---: | ---: |
| Stage1 | 16 | 8 |
| Stage2 | 9 | 10 |
| Stage3 | 0 | 168 |

## Block Reasons

Tier C blocked rows:

| Reason | Count |
| --- | ---: |
| zero valid tuples | 42 |
| truncated candidate pool | 30 |
| missing member candidate | 6 |
| other | 6 |

Strict-total blocked rows:

| Reason | Count |
| --- | ---: |
| missing observed total | 49 |
| current total already correct | 40 |
| ineligible member/bonus provenance | 15 |

## Stage3 Status

Stage3 still dominates the remaining failures after T2 and strict-total productionization.

| Stage3 metric | Result |
| --- | ---: |
| Stage3 stage/side PASS | 0 / 36 |
| Stage3 self PASS | 0 / 18 |
| Stage3 enemy PASS | 0 / 18 |

Stage3 exact candidate coverage:

| Field | selected exact | exact candidate present | exact candidate absent | recognition failures |
| --- | ---: | ---: | ---: | ---: |
| member1 | 0 / 36 | 0 / 36 | 36 | 36 |
| member2 | 1 / 36 | 1 / 36 | 35 | 35 |
| member3 | 1 / 36 | 1 / 36 | 35 | 35 |
| bonus | 10 / 36 | 10 / 36 | 26 | 26 |
| total | 0 / 36 | 0 / 36 | 36 | 36 |

Stage3 member2 remains weak, but this analysis does not revive the previously rejected PSM, crop/padding, symbol/bbox, or broad OCR tuning directions. Current production evidence shows only 1 / 36 selected exact and 1 / 36 exact candidate present for Stage3 member2, with 35 recognition failures.

## Bonus Audit

| Bonus metric | Result |
| --- | ---: |
| selected exact | 67 / 108 |
| exact candidate present | 68 / 108 |
| exact candidate absent | 40 |
| zero bonus fields | 54 |
| non-zero bonus fields | 54 |
| selected wrong despite exact candidate | 1 |
| empty OCR pools | 0 |
| truncated/incomplete | 7 |
| recoverable if only bonus were fixed | 5 stage/sides |

Bonus is not the largest recognition gap by field count, but it is the highest narrow next target because fixing only bonus would convert 5 failing stage/sides to PASS. It is also more isolated than member recognition and less likely to require broad candidate ranking.

## Total Audit

| Total metric | Result |
| --- | ---: |
| selected exact | 64 / 108 |
| exact candidate present | 68 / 108 |
| exact candidate absent | 40 |
| strict-total recoveries | 4 |
| exact present but unselected | 4 |
| truncated/incomplete | 8 |
| recoverable if only total were fixed | 2 stage/sides |

Strict-total productionization consumed the safest total-only rows. Remaining total work has lower direct stage/side leverage than bonus and would likely need new capture evidence rather than broader selection.

## Theoretical Upper Bounds

| Scenario | Exact fields | Stage/side PASS | Stage PASS | Image PASS |
| --- | ---: | ---: | ---: | ---: |
| A. Current production | 329 / 540 | 44 / 108 | 10 / 54 | 0 / 18 |
| B. Perfect field selection from existing candidates | 354 / 540 | 55 / 108 | 19 / 54 | 0 / 18 |
| C. Perfect arithmetic tuple selection from existing candidates | 343 / 540 | 53 / 108 | 17 / 54 | 0 / 18 |
| D. Perfect member recognition, leaving bonus/total | 455 / 540 | 52 / 108 | 17 / 54 | 0 / 18 |
| E. Perfect bonus recognition, leaving members/total | 370 / 540 | 49 / 108 | 15 / 54 | 0 / 18 |
| F. Perfect total recognition, leaving members/bonus | 373 / 540 | 46 / 108 | 12 / 54 | 0 / 18 |
| G. Perfect all-member selection | 349 / 540 | 52 / 108 | 17 / 54 | 0 / 18 |
| H. Perfect members + bonus | 341 / 540 | 53 / 108 | 18 / 54 | 0 / 18 |
| I. Perfect members + total | 351 / 540 | 54 / 108 | 18 / 54 | 0 / 18 |
| J. Perfect bonus + total | 332 / 540 | 45 / 108 | 11 / 54 | 0 / 18 |

## Target Leverage

| Target family | Failing stage/sides that would become PASS |
| --- | ---: |
| member1 only | 0 |
| member2 only | 8 |
| member3 only | 0 |
| all members | 8 |
| bonus only | 5 |
| total only | 2 |
| members + bonus | 20 |
| members + total | 23 |
| bonus + total | 9 |

## Ranked Next Targets

| Target | Addressable fields | Addressable stage/sides | FP risk | Status |
| --- | ---: | ---: | --- | --- |
| Bonus candidate capture | 40 | 5 | medium | recommended next |
| Bonus candidate selection | 1 | 5 | medium-high | secondary |
| Bonus parser/tokenization | 0 | 5 | medium | secondary |
| Total candidate capture | 40 | 2 | low-medium | lower priority after strict-total |
| Total selection beyond strict-total | 4 | 2 | medium-high | defer |
| Member candidate capture | 106 | 8 | high | defer unless narrowed |
| Stage3 member2 work | 35 | 35 | high | defer; prior PSM/crop/symbol experiments were weak/rejected |
| Candidate ranking | 25 | 8 | high | reject for now; prior broad ranking regressed |
| Tier C broadening | 0 | 9 | high | reject for now |

## Recommended Next Experiment

Recommended next experiment: **diagnostic-only browser-native bonus candidate capture**.

Reason:

- Bonus-only improvement has 5 direct stage/side PASS leverage, higher than total-only after strict-total.
- Bonus recognition has 40 wrong fields where the exact candidate is absent, so this is a capture problem rather than a ranking problem.
- The scope can remain isolated to iPad bonus evidence capture diagnostics.
- It avoids the previously weak or rejected broad candidate ranking, broad literal extraction, Stage3 member2 PSM tuning, Stage3 member2 crop/padding tuning, and Stage3 member2 symbol/bbox segmentation paths.

No productionization is recommended from this analysis alone. The next step should measure whether browser-native bonus crops/preprocessing can increase exact observed bonus candidate coverage with stable evidence and no production output changes.

## Stability

Two analysis runs were stable for:

- production output
- production recovery applications
- candidate-pool-derived field classifications
- Tier C block reason counts
- strict-total block reason counts
- target leverage counts
- recommended target metrics

Run artifacts are under `tmp/ipad-post-strict-total-failure-analysis/` and are not committed.

