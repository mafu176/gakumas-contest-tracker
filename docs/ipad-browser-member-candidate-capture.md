# iPad Browser Member Candidate Capture Investigation

Commit under analysis: `9acf36c` (`Analyze iPad browser OCR failures`)

This is a diagnostic-only browser-native OCR investigation. It does not change production OCR output, production preprocessing, iPad Tier C behavior, ROI geometry, candidate ranking, smartphone OCR, current-PC OCR, legacy desktop OCR, or expected fixtures.

## Command

```sh
node scripts/ipad-browser-member-candidate-capture.mjs
```

Artifacts:

```text
tmp/ipad-browser-member-candidate-capture/
```

The script opens the real app with `?ipadArithmeticDebug=1`, runs the existing browser production OCR path first, then injects a local browser-side Tesseract bundle for diagnostic-only member-crop OCR experiments. Expected fixtures are used only after OCR finishes to score candidate coverage.

## Scope

Dataset:

| Scope | Count |
| --- | ---: |
| iPad images | 18 |
| stages | 54 |
| stage/sides | 108 |
| member fields audited | 324 |

Ignored by design:

- bonus fields
- total fields
- candidate ranking
- arithmetic recovery
- production application

## Production Baseline

The current production browser baseline remains:

| Metric | Result |
| --- | ---: |
| Stage/side PASS | 25 / 108 |
| Tier C TP / FP | 9 / 0 |

For member candidate coverage, the existing production/debug candidate pool already observes the expected member value in:

```text
184 / 324 member fields = 56.8%
```

## Profiles Tested

All profiles are generalized browser-side preprocessing variants. No filename or fixture-specific logic is used.

| Profile | New expected fields | Expected fields seen by profile | Noise fields | Noise candidates | Empty OCR fields | Avg OCR ms/field | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `grayscale-3x-psm7` | 6 | 96 | 69 | 89 | 141 | 38 | reject/defer |
| `contrast-3x-psm7` | 6 | 108 | 108 | 129 | 110 | 28 | reject/defer |
| `white-mask-3x-psm7` | 9 | 101 | 115 | 140 | 102 | 28 | reject/defer |
| `white-mask-4x-psm7` | 7 | 105 | 114 | 138 | 100 | 39 | reject/defer |
| `invert-3x-psm7` | 6 | 95 | 69 | 89 | 140 | 32 | reject/defer |
| `otsu-3x-psm7` | 7 | 106 | 111 | 135 | 101 | 28 | reject/defer |
| `sharpen-3x-psm7` | 6 | 108 | 108 | 129 | 110 | 28 | reject/defer |
| `dilate-white-mask-3x-psm7` | 8 | 108 | 106 | 126 | 115 | 27 | reject/defer |

Total wall-clock for the all-profile browser diagnostic run was about 61 minutes. The per-field OCR time after browser worker initialization was low, but the full matrix is still expensive because it evaluates 324 member crops across eight profiles.

## Coverage Impact

Best single profile:

| Combination | Observed member fields | Coverage | New expected fields | Noise fields | Noise candidates |
| --- | ---: | ---: | ---: | ---: | ---: |
| production + `white-mask-3x-psm7` | 193 / 324 | 59.6% | 9 | 115 | 140 |

Best combinations did not improve beyond 9 newly observed expected member fields, and combinations increased noise:

| Combination | New expected fields | Noise fields | Noise candidates |
| --- | ---: | ---: | ---: |
| `white-mask-3x-psm7` | 9 | 115 | 140 |
| `white-mask-3x-psm7` + `dilate-white-mask-3x-psm7` | 9 | 121 | 266 |
| `white-mask-3x-psm7` + `otsu-3x-psm7` | 9 | 122 | 275 |
| `white-mask-4x-psm7` + `dilate-white-mask-3x-psm7` | 9 | 122 | 264 |

The new expected fields are:

| Image | Stage | Side | Field | Expected |
| --- | ---: | --- | --- | ---: |
| `IMG_0300.png` | 1 | enemy | member2 | 201022 |
| `IMG_0497.png` | 1 | self | member2 | 762450 |
| `IMG_0497.png` | 1 | enemy | member2 | 302579 |
| `IMG_0792.png` | 1 | self | member2 | 458571 |
| `IMG_0792.png` | 1 | enemy | member2 | 284090 |
| `IMG_0792.png` | 2 | self | member3 | 629178 |
| `IMG_0792.png` | 2 | enemy | member2 | 176003 |
| `IMG_0802.png` | 1 | self | member2 | 608121 |
| `IMG_0802.png` | 1 | enemy | member2 | 409764 |

Eight of the nine newly observed expected values are `member2`. That is the most interesting signal in this run.

## Noise Assessment

The added profiles recover a small number of missing expected values, but they also introduce a large amount of extra numeric evidence:

- Best gain: `+9` expected member fields.
- Best profile noise: `115` member fields receive at least one new non-expected candidate.
- Best profile noise candidates: `140`.
- Combination profiles increase noise sharply without increasing expected coverage.

This is not safe enough for production candidate inclusion. It would likely make later arithmetic or ranking stages more ambiguous unless a separate slot-quality gate can isolate the useful cases.

## Recommendation

Recommended production experiment: none yet.

Recommended next diagnostic experiment: a narrow browser-native `member2` slot quality investigation.

Rationale:

- The useful signal is real: 9 expected member fields become newly observable.
- The signal is strongly slot-skewed: 8 / 9 are `member2`.
- The current generalized profiles are too noisy for direct candidate-pool inclusion.
- A safer next experiment should measure why `member2` benefits: crop centering, horizontal padding, overlap with adjacent labels, or white-mask threshold behavior.
- Do not add the profile to production until a member-slot-specific quality gate shows low noise and stable evidence.

Proposed next diagnostic constraints:

- browser-native only
- member fields only
- focus first on `member2`
- compare slightly narrower/wider horizontal slot crops
- keep expected values scoring-only
- do not rank or apply candidates
- require two fresh browser runs before considering parity or production

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

No generated `tmp/` artifacts are intended for commit.
