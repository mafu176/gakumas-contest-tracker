# iPad Browser-Native Failure Analysis

Commit under analysis: `83bc754` (`Productionize iPad Tier C arithmetic selector`)

This is a diagnostic-only browser-native audit. It does not change iPad OCR production behavior, Tier C semantics, ROI geometry, preprocessing, candidate generation, smartphone OCR, current-PC OCR, legacy desktop OCR, or expected fixtures.

## Commands

Production baseline confirmation:

```sh
node scripts/ipad-browser-production-verification.mjs --runs 2 --resume
```

Failure analysis:

```sh
node scripts/ipad-browser-failure-analysis.mjs --runs 2 --resume
```

Artifacts are written under:

```text
tmp/ipad-browser-failure-analysis/
```

The root of that directory mirrors the latest run's report files, while `run-1/` and `run-2/` keep per-run image artifacts and JSON.

## Production Baseline Confirmation

The existing real-browser production verification still matches the expected stable Tier C result:

| Metric | Result |
| --- | ---: |
| Images processed per run | 18 / 18 |
| Stage/sides | 108 |
| Tier C applications | 9 |
| TP / FP | 9 / 0 |
| Stage/side PASS after Tier C | 25 / 108 |
| Stable application rows | 9 / 9 |
| Unexpected applications | 0 |
| Page errors | 0 |

The failure-analysis command independently measured the same production stage/side result:

| Level | PASS / Total | Accuracy |
| --- | ---: | ---: |
| Image | 0 / 18 | 0.0% |
| Stage | 4 / 54 | 7.4% |
| Stage/side | 25 / 108 | 23.1% |
| Final fields | 302 / 540 | 55.9% |

For field-level context, browser primary exact fields before Tier C were `293 / 540`; production Tier C raises final exact fields to `302 / 540`.

## Stage/Side Taxonomy

All 108 stage/sides were assigned exactly one top-level category:

| Category | Count |
| --- | ---: |
| A. Primary PASS without Tier C | 16 |
| B. Recovered by production Tier C | 9 |
| C. Expected tuple fully present but Tier C correctly blocked | 0 |
| D. Expected tuple fully present but primary selection is wrong | 0 |
| E. Some expected fields present, complete tuple unavailable | 29 |
| F. No useful expected candidate evidence | 15 |
| G. Candidate pool incomplete or truncated | 39 |
| H. OCR/export infrastructure failure | 0 |
| Total | 108 |

Remaining failing stage/sides after Tier C: `83`.

Remaining failures by iPad layout cluster:

| Cluster | Remaining failures |
| --- | ---: |
| ipad-01 | 55 |
| ipad-02 | 28 |

Remaining failures by position:

| Position | Count |
| --- | ---: |
| Stage1 self | 14 |
| Stage1 enemy | 9 |
| Stage2 self | 11 |
| Stage2 enemy | 13 |
| Stage3 self | 18 |
| Stage3 enemy | 18 |

## Field Taxonomy

All 540 expected numeric fields were classified:

| Field presence category | Count |
| --- | ---: |
| selected primary | 302 |
| present in observed browser candidates but not selected | 23 |
| present only through permitted schema-default bonus zero | 0 |
| absent from all candidates | 182 |
| candidate pool empty | 10 |
| candidate pool truncated/incomplete | 23 |
| OCR field unavailable | 0 |
| Total | 540 |

Presence by field type:

| Field type | Selected | Present not selected | Absent | Empty | Truncated |
| --- | ---: | ---: | ---: | ---: | ---: |
| member | 182 | 7 | 117 | 10 | 8 |
| bonus | 64 | 4 | 33 | 0 | 7 |
| total | 56 | 12 | 32 | 0 | 8 |

Wrong primary fields: `247`.

Final wrong fields after Tier C: `238`.

Wrong final fields by field name:

| Field | Wrong final count |
| --- | ---: |
| member1 | 37 |
| member2 | 69 |
| member3 | 36 |
| bonus | 44 |
| total | 52 |

## Selection vs Recognition

Selection failures are cases where the expected value exists in the browser candidate pool but is not selected.

Recognition failures are cases where the expected value does not exist in the browser candidate pool.

| Split | Count |
| --- | ---: |
| Wrong primary fields | 247 |
| Selection failures | 23 |
| Recognition failures | 182 |
| Default-zero-only cases | 0 |
| Incomplete or unavailable candidate cases | 33 |

By cluster:

| Cluster | Selected primary | Present not selected | Absent | Empty | Truncated |
| --- | ---: | ---: | ---: | ---: | ---: |
| ipad-01 | 222 | 19 | 129 | 4 | 16 |
| ipad-02 | 80 | 4 | 53 | 6 | 7 |

The data says selection ranking is not the dominant remaining blocker. Most remaining wrong fields are recognition or candidate-completeness failures, especially member fields.

## Tier C Block Reasons

For stage/sides where Tier C did not apply:

| Block reason | Count |
| --- | ---: |
| no-arithmetic-valid-tuple | 52 |
| no-changed-fields-or-already-identical | 6 |
| missing-candidate:member1 | 1 |
| missing-candidate:member1,member2,member3 | 1 |
| missing-candidate:member2 | 6 |
| missing-candidate:member2,member3 | 2 |
| missing-candidate:member3 | 2 |
| truncated-pool:bonus | 16 |
| truncated-pool:member1,total | 2 |
| truncated-pool:member2 | 4 |
| truncated-pool:member2,bonus | 1 |
| truncated-pool:member3 | 1 |
| truncated-pool:total | 5 |

Only five remaining failures had the expected tuple present in observed browser evidence. They were blocked because candidate completeness/truncation or Tier C arithmetic uniqueness did not meet the existing safety bar. The block is correct and should not be weakened from this dataset.

## Upper Bounds

These are evaluation-only oracle metrics. They do not describe a production algorithm.

| Scenario | Fields | Stage/sides | Stages | Images |
| --- | ---: | ---: | ---: | ---: |
| Current production | 302 / 540 | 25 / 108 | 4 / 54 | 0 / 18 |
| Perfect observed-candidate selection | 303 / 540 | 22 / 108 | 4 / 54 | 0 / 18 |
| Perfect observed selection plus default bonus zero | 306 / 540 | 22 / 108 | 4 / 54 | 0 / 18 |
| Perfect arithmetic selection from candidates | 309 / 540 | 30 / 108 | 8 / 54 | 0 / 18 |
| Full browser candidate-presence bound | 306 / 540 | 22 / 108 | 4 / 54 | 0 / 18 |

The upper bounds reinforce the same conclusion: selection-only improvements have a low ceiling unless candidate capture improves first.

## Ranking Strategy Simulations

The analysis command tested simple diagnostic-only candidate-ranking strategies using browser-native candidates. Expected values were used only after strategy execution for scoring.

| Strategy | Changed fields | TP field changes | FP field changes | Stage/side gains | Stage/side regressions | Existing PASS sides lost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| agreement | 278 | 11 | 267 | 0 | 16 | 16 |
| agreement-default-zero | 243 | 13 | 230 | 0 | 16 | 16 |
| profile-reliability | 243 | 13 | 230 | 0 | 16 | 16 |
| profile-reliability-default-zero | 243 | 13 | 230 | 0 | 16 | 16 |

All tested ranking strategies are rejected. They introduce many field-level false positives and lose existing passing stage/sides. No standalone ranking simulation was added because the zero-FP and useful-gain bar is not met.

The two analysis runs were stable: taxonomy counts, field counts, strategy outcomes, and Tier C application counts matched exactly.

## Improvement Ranking

| Candidate improvement | Estimated addressable issue | Risk | Recommendation |
| --- | --- | --- | --- |
| Member-specific preprocessing/candidate-capture experiment | Largest observed gap: 117 member values absent, 10 member candidate pools empty, 8 member pools truncated | Medium, diagnostic-only if kept browser-native | Recommended next |
| Candidate cap/completeness adjustment | 39 stage/sides are category G; 23 fields are truncated/incomplete | Medium-high; could expose noisy candidates | Investigate only after identifying truncation source |
| Total-specific preprocessing experiment | 32 total values absent, 8 total pools truncated, 12 present-but-unselected | Medium | Secondary |
| Bonus-specific candidate recovery | 33 bonus values absent, 7 truncated, 4 present-not-selected | Medium | Secondary |
| New arithmetic selector tier | Perfect arithmetic oracle reaches only 30 / 108 stage/sides | Low benefit until candidates improve | Defer |
| Browser candidate-ranking refinement | Selection failures are only 23 fields and tested strategies regress heavily | High FP risk | Reject for now |
| ROI refinement | Could help recognition, but broader surface than targeted preprocessing | Higher implementation risk | Defer until crop/preprocessing diagnostics localize the issue |

## Recommended Next Experiment

Recommended next experiment: a browser-native, diagnostic-only member candidate capture/preprocessing experiment for iPad.

Why this is the safest next step:

- The dominant failure is recognition/candidate absence, not selection.
- Member fields are the largest gap: `117` expected member values are absent from all candidates.
- Tier C and ranking strategies cannot recover values that are never observed.
- The experiment can be isolated to iPad diagnostics and kept out of production output.
- It can measure whether additional browser-native profiles recover missing member values without touching smartphone, current-PC, or legacy desktop paths.

Suggested guard for the next task: do not rank or apply new candidates yet. First measure per-member-slot OCR evidence quality, candidate stability across two browser runs, truncation behavior, and whether newly observed values create exact arithmetic tuples without increasing ambiguity.

## Production Isolation

Confirmed unchanged by this task:

- Production Tier C helper semantics
- Tier C application count and recovery identifier
- iPad ROI and preprocessing
- iPad candidate generation
- Smartphone recovery order
- Current-PC OCR
- Legacy desktop OCR
- Expected fixture files

No new recovery runs in the normal UI. The new script is browser-native diagnostics only.
