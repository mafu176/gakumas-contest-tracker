# iPad Member2 OCR Quality Investigation

Commit under analysis: `ccc0b75` (`Investigate iPad member candidate capture`)

This is a diagnostic-only browser-native investigation. It does not change production OCR output, production preprocessing, iPad Tier C behavior, ROI geometry, candidate ranking, smartphone OCR, current-PC OCR, legacy desktop OCR, or expected fixtures.

## Command

```sh
node scripts/ipad-member2-investigation.mjs
```

Artifacts:

```text
tmp/ipad-member2-investigation/
```

The script opens the real app with `?ipadArithmeticDebug=1`, runs the existing browser production OCR path, then runs diagnostic-only browser-side Tesseract over `member2` crops with a bounded set of generalized preprocessing variants. Expected fixtures are used only after OCR finishes to score coverage.

## Scope

| Scope | Count |
| --- | ---: |
| iPad images | 18 |
| stages | 54 |
| stage/sides | 108 |
| member fields | 324 |
| diagnostic variant fields | 108 member2 fields only |

Ignored by design:

- bonus fields
- total fields
- candidate ranking
- Tier C proposal application
- production output

## Production Baseline

The current production browser baseline remains:

| Metric | Result |
| --- | ---: |
| Stage/side PASS | 25 / 108 |
| Tier C TP / FP | 9 / 0 |
| Member candidate coverage | 184 / 324 |

## Slot Comparison

`member2` is materially weaker than the outer slots.

| Slot | Selected exact | Exact candidate present | Empty OCR failures | Wrong selected fields | Avg candidate count | Truncation / length failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| member1 | 71 / 108 (65.7%) | 73 / 108 (67.6%) | 2 | 37 | 2.42 | 31 |
| member2 | 34 / 108 (31.5%) | 42 / 108 (38.9%) | 6 | 74 | 2.67 | 31 |
| member3 | 72 / 108 (66.7%) | 69 / 108 (63.9%) | 2 | 36 | 1.56 | 27 |

The problem is not only empty OCR. `member2` has the highest average candidate count and many failures where exact digits appear in normalized raw OCR but are not safely candidateized.

## Crop Statistics

| Slot | Crop width avg | Crop height avg | Foreground ratio avg | Components avg | Touches border | Char width est. avg | Char height est. avg |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| member1 | 200.889 | 68.722 | 0.152 | 9.269 | 96.3% | 20.973 | 52.472 |
| member2 | 217.167 | 68.722 | 0.165 | 10.880 | 91.7% | 21.311 | 59.093 |
| member3 | 217.167 | 68.722 | 0.122 | 8.222 | 75.9% | 20.404 | 50.019 |

`member2` has the densest foreground and highest connected-component count. That aligns with the observed candidate pollution and OCR text merging. The slot is wide enough, but the actual crop content appears more contaminated than `member3`.

## Member2 Failure Taxonomy

For the 74 `member2` fields where the selected production value is not exact:

| Failure class | Count |
| --- | ---: |
| length mismatch | 25 |
| exact digits in normalized raw text but unparsed | 22 |
| exact candidate present but not selected | 11 |
| empty OCR | 6 |
| wrong candidate | 4 |
| trailing digit loss | 4 |
| leading digit loss | 2 |

This points away from a pure recognition-only problem. A large fraction of `member2` failures are parser/provenance/crop-pollution failures where OCR sees useful digits but attaches adjacent noise or merges multiple numeric fragments.

## Cluster Breakdown

| Cluster | Fields | Selected exact | Candidate present | Failures |
| --- | ---: | ---: | ---: | ---: |
| ipad-01 | 78 | 29 (37.2%) | 40 (51.3%) | 49 |
| ipad-02 | 30 | 5 (16.7%) | 2 (6.7%) | 25 |

`ipad-02` is much worse for `member2`, but `ipad-01` still fails frequently. This is not isolated to one layout cluster.

## Stage And Side Breakdown

| Group | Fields | Selected exact | Candidate present | Failures |
| --- | ---: | ---: | ---: | ---: |
| Stage1 | 36 | 16 (44.4%) | 21 (58.3%) | 20 |
| Stage2 | 36 | 17 (47.2%) | 21 (58.3%) | 19 |
| Stage3 | 36 | 1 (2.8%) | 0 (0.0%) | 35 |
| self | 54 | 8 (14.8%) | 16 (29.6%) | 46 |
| enemy | 54 | 26 (48.1%) | 26 (48.1%) | 28 |

Stage3 `member2` is the starkest weakness: production candidate coverage is `0 / 36`. Self-side `member2` is also significantly weaker than enemy-side `member2`.

## Digit Length Breakdown

| Expected digit length | Fields | Selected exact | Candidate present | Failures |
| --- | ---: | ---: | ---: | ---: |
| 5 | 23 | 12 (52.2%) | 18 (78.3%) | 11 |
| 6 | 75 | 18 (24.0%) | 23 (30.7%) | 57 |
| 7 | 6 | 0 (0.0%) | 0 (0.0%) | 6 |

The failures concentrate in 6-digit and 7-digit values. The 7-digit `member2` fields are currently not represented as exact production candidates at all.

## Visual Statistics

Foreground-ratio buckets for `member2`:

| Foreground bucket | Fields | Selected exact | Candidate present | Failures |
| --- | ---: | ---: | ---: | ---: |
| <=0.08 | 2 | 2 | 0 | 0 |
| <=0.12 | 4 | 4 | 3 | 0 |
| <=0.16 | 35 | 15 | 22 | 20 |
| >0.16 | 67 | 13 | 17 | 54 |

Candidate-count buckets for `member2`:

| Candidate count | Fields | Selected exact | Candidate present | Failures |
| --- | ---: | ---: | ---: | ---: |
| 0 | 10 | 3 | 0 | 7 |
| 1 | 4 | 0 | 0 | 4 |
| 2 | 41 | 18 | 20 | 23 |
| >=3 | 53 | 13 | 22 | 40 |

The main risk signal is candidate pollution, not a clean absence of OCR. Higher foreground density and three-or-more candidates correlate with worse `member2` outcomes.

## Diagnostic Variants

All variants are browser-native, generalized, and applied only to `member2` crops.

| Profile | New expected member2 fields | Profile expected present | Noise fields | Noise candidates | Empty OCR fields | Avg ms/field | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `member2-pad06-white-mask-3x` | 15 | 36 | 40 | 44 | 53 | 37 | reject/defer |
| `member2-pad12-white-mask-2x` | 9 | 23 | 56 | 74 | 38 | 23 | reject/defer |
| `member2-pad12-white-mask-3x` | 8 | 21 | 56 | 76 | 37 | 34 | reject/defer |
| `member2-pad12-white-mask-4x` | 9 | 24 | 57 | 76 | 35 | 47 | reject/defer |
| `member2-pad20-white-mask-3x` | 8 | 25 | 69 | 103 | 34 | 39 | reject/defer |
| `member2-threshold160-white-mask-3x` | 6 | 21 | 57 | 76 | 37 | 34 | reject/defer |
| `member2-threshold192-white-mask-3x` | 4 | 17 | 58 | 79 | 36 | 34 | reject/defer |
| `member2-sharpen-light-3x` | 6 | 21 | 56 | 73 | 38 | 34 | reject/defer |

Best single profile:

| Profile | Observed member2 fields with production + profile | New expected fields | Noise fields | Noise candidates |
| --- | ---: | ---: | ---: | ---: |
| `member2-pad06-white-mask-3x` | 57 / 108 (52.8%) | 15 | 40 | 44 |

Best pair:

| Profiles | Observed member2 fields | New expected fields | Noise fields | Noise candidates |
| --- | ---: | ---: | ---: | ---: |
| `member2-pad06-white-mask-3x` + `member2-pad12-white-mask-2x` | 59 / 108 (54.6%) | 17 | 63 | 118 |

The smaller-padding profile is the clearest diagnostic signal. It gains the most expected values and adds far less noise than the normal/wider padding profiles. Pairing profiles is not attractive because noise rises sharply for only two additional expected fields.

## Newly Observed Member2 Fields

The best profile family newly observes expected `member2` values in 18 fields across the full variant set. The most important pattern is that several production outputs contain a left-side extra digit or marker merged into the score, for example:

| Image | Stage | Side | Expected | Production selected | Useful profile pattern |
| --- | ---: | --- | ---: | ---: | --- |
| `IMG_0278.png` | 1 | self | 333611 | 4333611 | smaller padding |
| `IMG_0287.png` | 1 | self | 367115 | 1367115 | smaller padding |
| `IMG_0317.png` | 1 | self | 132770 | 3132770 | smaller padding |
| `IMG_0326.png` | 1 | self | 186105 | 4186105 | smaller padding |
| `IMG_0332.png` | 1 | self | 157594 | 6157594 | smaller padding |
| `IMG_0337.png` | 1 | self | 211243 | 5211243 | smaller padding |
| `IMG_0497.png` | 1 | self | 762450 | 2762450 | smaller/normal padding |
| `IMG_0792.png` | 1 | self | 458571 | 6458571 | smaller/normal padding |
| `IMG_0796.png` | 1 | self | 327111 | 8327111 | smaller padding |

There are also fields where production has no candidate and multiple variants find the expected value, such as `IMG_0300.png` S1 enemy, `IMG_0497.png` S1 enemy, `IMG_0792.png` S1 enemy, and `IMG_0802.png` S1 enemy. These are useful diagnostics, but the variants still emit enough unrelated candidates that they are not safe as production candidate sources yet.

## Recommendation

Recommended next production experiment: none.

Recommended next diagnostic experiment: **member2 smaller horizontal padding / left-edge contamination suppression**.

Rationale:

- `member2-pad06-white-mask-3x` is the only tested profile with a strong gain/noise tradeoff: `+15` expected fields and `40` noisy fields.
- The largest visible pattern is extra leading digit or marker contamination in production selected values, often corrected by the smaller crop.
- Scaling and threshold changes are less promising. They add similar or lower expected coverage and materially more noise.
- Larger padding is actively worse: it increases candidate pollution.
- Any future production path would need an explicit low-noise quality gate before adding these candidates to selection.

Suggested next diagnostic constraints:

- test horizontal-only smaller padding, not symmetric padding
- compare left trim versus right trim separately
- keep `member2` only
- measure repeatability across two browser runs
- require no regression in member1/member3 production output because they should remain untouched
- continue using expected values only for post-run scoring

Productionization is not recommended from this run.

## Production Isolation

Confirmed unchanged by this investigation:

- production OCR output
- production iPad Tier C
- iPad ROI used by production
- production preprocessing
- candidate ranking
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
- expected fixtures

Generated `tmp/ipad-member2-investigation/` artifacts are not intended for commit.
