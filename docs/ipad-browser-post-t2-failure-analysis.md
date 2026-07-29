# iPad Browser Post-T2 Failure Analysis

## Scope

This is a diagnostic-only re-baseline after productionizing the iPad T2 grouped-number member parser.

No production OCR behavior was changed by this analysis. The following remain unchanged:

- T2 parser grammar and `ENABLE_IPAD_GROUPED_NUMBER_MEMBER_TOKENS`
- Tier C selector semantics and recovery identifier
- iPad ROI, preprocessing, and candidate ranking
- smartphone, current-PC, and legacy desktop OCR paths
- expected fixtures

Artifacts are written under:

```text
tmp/ipad-post-t2-failure-analysis/
```

The diagnostic command is:

```bash
node scripts/ipad-browser-post-t2-failure-analysis.mjs --runs 2 --base-url http://127.0.0.1:3107
```

## Production Baseline Confirmation

The authoritative production browser verification was rerun twice before this analysis.

| Metric | Result |
| --- | ---: |
| Images processed | 18 / 18 per run |
| Stage/side PASS | 40 / 108 |
| Stage PASS | 8 / 54 |
| Image PASS | 0 / 18 |
| Production Tier C applications | 24 |
| TP / FP | 24 / 0 |
| Stable application rows | 24 / 24 |

The post-T2 analysis also produced the same production baseline across two fresh browser diagnostic contexts.

| Metric | Result |
| --- | ---: |
| Field exact | 325 / 540 |
| Stage/side PASS | 40 / 108 |
| Stage PASS | 8 / 54 |
| Image PASS | 0 / 18 |
| Run stability | stable |

Known browser OCR console warnings remain the pre-existing tiny-crop warnings (`Image too small to scale!!`, `Line cannot be recognized!!`).

## T2 Contribution

The historical pre-T2 production baseline had 9 Tier C applications and 25 / 108 stage/side PASS. The current post-T2 production baseline has 24 Tier C applications and 40 / 108 stage/side PASS.

| Item | Count |
| --- | ---: |
| Original Tier C recovered rows | 9 |
| Additional T2-enabled recovered rows | 15 |
| Current production applications | 24 |
| Current TP / FP | 24 / 0 |

T2 candidate audit:

| Metric | Count |
| --- | ---: |
| T2 candidates emitted | 211 |
| Unique fields receiving T2 candidates | 210 |
| Comma grouped candidates | 29 |
| Period grouped candidates | 0 |
| Candidates used by new T2-enabled Tier C rows | 15 |
| Changed-member rows carrying T2 provenance | 20 |
| T2 candidates not used by Tier C | 196 |
| Deduped against existing evidence | 181 |
| Wrong T2 candidate fields against fixtures | 0 |

Distribution:

| Dimension | Counts |
| --- | --- |
| Member slots | member1 70, member2 70, member3 70 |
| Stages | Stage1 105, Stage2 105, Stage3 0 |
| Clusters | ipad-01 156, ipad-02 54 |

The important shape is that T2 improves Stage1/Stage2 member parsing, but it contributes no Stage3 candidates.

## Stage/Side Taxonomy

All 108 stage/sides are classified into exactly one category.

| Category | Count |
| --- | ---: |
| A. Primary PASS without recovery | 16 |
| B. Recovered by pre-existing Tier C evidence | 9 |
| C. Newly recoverable because of T2 member evidence | 15 |
| D. Expected tuple fully present but Tier C blocked safely | 0 |
| E. Partial expected evidence only | 19 |
| F. No useful expected evidence | 15 |
| G. Candidate pool incomplete/truncated | 34 |
| H. Infrastructure/export failure | 0 |

Remaining failing stage/sides: 68.

## Field Coverage

The table counts exact expected values observed in production browser candidate pools. Schema-default zero is not counted as observed OCR.

| Field | Final exact | Expected candidate present | Expected T2 candidate present | Expected absent | Empty pool | Truncated/incomplete |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| member1 | 71 / 108 | 73 / 108 | 70 / 108 | 35 | 2 | 2 |
| member2 | 54 / 108 | 70 / 108 | 70 / 108 | 38 | 3 | 5 |
| member3 | 73 / 108 | 70 / 108 | 70 / 108 | 38 | 5 | 1 |
| bonus | 67 / 108 | 51 / 108 | 0 / 108 | 57 | 3 | 18 |
| total | 60 / 108 | 68 / 108 | 0 / 108 | 40 | 0 | 8 |

Member candidate presence before T2 was approximately:

| Slot | Before T2 | After T2 |
| --- | ---: | ---: |
| member1 | 73 / 108 | 73 / 108 |
| member2 | 42 / 108 | 70 / 108 |
| member3 | 69 / 108 | 70 / 108 |

T2 mostly solved Stage1/Stage2 member2 candidate coverage, but did not touch Stage3.

| member2 slice | Final exact | Expected candidate present | Expected T2 candidate present | Expected absent |
| --- | ---: | ---: | ---: | ---: |
| Stage1 | 23 / 36 | 35 / 36 | 35 / 36 | 1 |
| Stage2 | 30 / 36 | 35 / 36 | 35 / 36 | 1 |
| Stage3 | 1 / 36 | 0 / 36 | 0 / 36 | 36 |

## Recognition vs Selection

Across the current production output, 215 fields are still wrong.

| Split | Count |
| --- | ---: |
| Selection failures, expected value exists but final value is wrong | 33 |
| Recognition failures, expected value absent from candidates | 182 |
| Incomplete/truncated among wrong fields | 23 |
| Empty pool among wrong fields | 4 |
| Default-zero-only bonus cases | 19 |

By field:

| Field | Selection | Recognition |
| --- | ---: | ---: |
| member1 | 2 | 35 |
| member2 | 19 | 35 |
| member3 | 0 | 35 |
| bonus | 4 | 37 |
| total | 8 | 40 |

By stage:

| Stage | Selection | Recognition |
| --- | ---: | ---: |
| Stage1 | 20 | 5 |
| Stage2 | 12 | 10 |
| Stage3 | 1 | 167 |

Recognition, not ranking, dominates the remaining failures. Stage3 is the heavy wall.

## Tier C Block Reasons

| Block class | Count |
| --- | ---: |
| Zero arithmetic-valid tuples | 42 |
| Candidate pool truncated | 30 |
| Missing member candidate | 6 |
| Already identical / no useful change | 6 |

Compared with the pre-T2 shape, member2 missing evidence is much less important in Stage1/Stage2. After T2, the dominant reasons are zero exact arithmetic tuples and truncated/incomplete pools, driven mainly by Stage3 recognition gaps.

## Stage3 Member2

Stage3 member2 remains the clearest single-slot recognition bottleneck.

| Metric | Count |
| --- | ---: |
| Fields audited | 36 |
| Final exact | 1 / 36 |
| Expected candidate present | 0 / 36 |
| T2 exact candidate present | 0 / 36 |
| Raw grouped-token opportunities | 0 |
| Remaining recognition failures | 35 |
| Missing-digit style current output | 31 |
| Empty OCR | 0 |
| Parser-safe grouped forms still missed | 0 |

This means another parser extension is not the right first move for Stage3 member2. The exact values are simply not entering the browser-native candidate pools.

## Bonus And Total

Bonus:

| Metric | Count |
| --- | ---: |
| Final exact | 67 / 108 |
| Expected candidate present | 51 / 108 |
| Expected absent | 57 |
| Empty pool | 3 |
| Truncated/incomplete | 18 |
| Zero-specific failures | 21 |
| Non-zero failures | 20 |

Total:

| Metric | Count |
| --- | ---: |
| Final exact | 60 / 108 |
| Expected candidate present | 68 / 108 |
| Expected absent | 40 |
| Empty pool | 0 |
| Truncated/incomplete | 8 |
| Selection failures | 8 |
| Recognition failures | 40 |

Bonus and total both still matter, but their isolated stage/side leverage is lower than Stage3 member2 in this post-T2 pass.

## Theoretical Upper Bounds

| Oracle layer | Fields | Stage/sides | Stages | Images |
| --- | ---: | ---: | ---: | ---: |
| Current production | 325 / 540 | 40 / 108 | 8 / 54 | 0 / 18 |
| Perfect observed-candidate selection | 332 / 540 | 42 / 108 | 10 / 54 | 0 / 18 |
| Perfect selection with schema-default bonus zero | 335 / 540 | 43 / 108 | 10 / 54 | 0 / 18 |
| Perfect arithmetic choice from existing candidates | 341 / 540 | 51 / 108 | 16 / 54 | 0 / 18 |
| Full candidate-presence upper bound | 335 / 540 | 43 / 108 | 10 / 54 | 0 / 18 |

Selection-only work has a low ceiling after T2. The current candidate pools do not contain enough exact evidence to unlock image-level PASS.

## Target Leverage

This estimates how many of the 68 currently failing stage/sides would become PASS if only one field family were made perfect, using expected fixtures only for evaluation.

| Target family | Addressable failing stage/sides |
| --- | ---: |
| member1 | 0 |
| member2 | 8 |
| member3 | 0 |
| all members | 8 |
| bonus | 5 |
| total | 6 |
| members + bonus | 20 |
| members + total | 27 |
| bonus + total | 13 |

## Ranked Next Directions

| Rank | Direction | Addressable stage/sides | Assessment |
| ---: | --- | ---: | --- |
| 1 | Stage3 member2 OCR-engine/configuration experiment | 8 | Best single narrow target; browser-native recognition problem; no ranking or parser broadening needed. |
| 2 | member OCR safe parser extension beyond T2 | 8 | Defer. Broad literal-token parsing was previously unsafe, and Stage3 member2 has no grouped-token opportunities. |
| 3 | total-specific browser-native candidate capture | 6 | Plausible later; exact total evidence can be isolated, but lower single-family leverage than Stage3 member2. |
| 4 | bonus-specific browser-native candidate capture | 5 | Plausible later with plus/crown provenance, but lower isolated leverage. |
| 5 | Tier C broadening | 0 | Reject. Tier C is intentionally strict and broadening risks FP. |
| 6 | candidate ranking | 0 | Reject. Previous ranking experiments regressed existing PASS cases and produced many FP field changes. |

Crop/padding changes and broad literal-token parsing remain previously rejected unless a future browser-native experiment produces materially different evidence.

## Recommended Next Experiment

Recommended: **Stage3 member2 OCR-engine/configuration experiment**.

Why this is the best next diagnostic:

- It is the largest single-field-family stage/side lever at 8 potential failing stage/sides.
- Stage3 member2 has 35 recognition failures and 0 exact observed candidates.
- T2 contributed 0 Stage3 member2 candidates, so parser work alone is not enough.
- The experiment can remain iPad-only, Stage3-member2-only, browser-native, and diagnostic-only.
- It avoids candidate ranking, Tier C broadening, expected-driven logic, and broad parser expansion.

No productionization is recommended from this report alone.
