# iPad Bonus Candidate Capture Investigation

Diagnostic-only browser-native investigation after `9c9443b`.

No production OCR behavior was changed. The script uses the real browser upload/OCR path and writes artifacts under `tmp/ipad-bonus-candidate-capture/`.

## Production Gate

Before the bonus diagnostics, real-browser production verification was rerun with two fresh runs and resume after a dev-server timeout. The final combined result matched the required stable baseline:

| Metric | Result |
| --- | ---: |
| Images processed | 18 / 18 |
| Tier C | 24 TP / 0 FP |
| Strict total | 4 TP / 0 FP |
| Total production applications | 28 |
| Total production TP / FP | 28 / 0 |
| Stage/side PASS | 44 / 108 |
| Stage PASS | 10 / 54 |
| Stable application rows | 28 / 28 |

## Diagnostic Command

```bash
node scripts/ipad-bonus-candidate-capture-investigation.mjs --runs 2
```

The run completed through `--resume` because the browser session became slow during long OCR loops. Candidate signatures were stable across the two completed diagnostic runs.

## Production Bonus Path Inventory

The browser diagnostic path exposes per-field `fieldCandidatePools` from the iPad arithmetic diagnostics panel. For this investigation only `fieldType: "bonus"` pools are audited.

The production bonus evidence includes the existing iPad bonus candidate pool and current production browser output. Default zero is tracked separately: a fixture bonus of `0` with no OCR candidate is not counted as observed OCR evidence.

## Profiles Tested

| Profile | Description |
| --- | --- |
| `production-blue-bonus-mask-3x-psm7` | Browser-native reproduction of the production blue bonus mask |
| `blue-bonus-mask-3x-psm7-digits-only` | Same blue mask with digits-only whitelist |
| `white-mask-3x-psm7` | White digit mask profile |
| `grayscale-3x-psm7` | Grayscale 3x, PSM7 |
| `grayscale-3x-psm6` | Grayscale 3x, PSM6 |
| `grayscale-3x-psm8` | Grayscale 3x, PSM8 |

Parser/tokenization concepts:

| Parser | Meaning |
| --- | --- |
| `T0` | Current production candidate values |
| `T1` | Safe standalone numeric token, 5-6 digits, optional plus marker |
| `T2` | Strict comma/period grouped number |
| `T3` | Bounded numeric run with explicit text boundaries |

## Coverage

| Metric | Count |
| --- | ---: |
| Bonus fields audited | 108 |
| Expected zero bonus fields | 54 |
| Expected nonzero bonus fields | 54 |
| Production bonus coverage, including schema/default zero | 90 / 108 |
| Exact nonzero bonus present in production candidates | 36 / 54 |
| Nonzero bonus selected exact | 34 / 54 |
| Final bonus field exact, zero and nonzero | 67 / 108 |

Zero bonus taxonomy:

| Category | Count |
| --- | ---: |
| Selected zero by default only | 33 |
| Wrong nonzero/noise selected | 21 |

Nonzero bonus taxonomy:

| Category | Count |
| --- | ---: |
| Selected exact | 34 |
| Exact present but unselected | 2 |
| H - merged with nearby text | 18 |

All 18 nonzero missing exact cases were classified as merged-with-nearby-text. They are not parser-safe from the current production pool.

## Parser Results

| Parser | Expected present | Newly observed expected | Noise fields | Noise candidates |
| --- | ---: | ---: | ---: | ---: |
| T0 production | 90 / 108 | 0 | 0 | 0 |
| T1 standalone | 38 / 108 | 2 | 5 | 6 |
| T2 grouped comma/period | 0 / 108 | 0 | 40 | 89 |
| T3 numeric run | 37 / 108 | 3 | 14 | 16 |

Grouped comma/period parsing does not help bonus capture. It produced no exact bonus gains and added broad noise, so member T2-style grouped parsing is not a good bonus direction.

## Profile Results

| Profile | Expected present | Newly observed expected | Noise fields | Noise candidates | Avg ms/field | Recommendation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| production-blue-bonus-mask-3x-psm7 | 28 | 3 | 18 | 18 | 102 | reject/defer |
| blue-bonus-mask-3x-psm7-digits-only | 14 | 0 | 34 | 34 | 90 | reject/defer |
| white-mask-3x-psm7 | 3 | 1 | 33 | 51 | 113 | reject/defer |
| grayscale-3x-psm7 | 3 | 0 | 32 | 46 | 150 | reject/defer |
| grayscale-3x-psm6 | 8 | 0 | 92 | 173 | 287 | reject/defer |
| grayscale-3x-psm8 | 0 | 0 | 10 | 13 | 197 | reject/defer |

No profile is production-ready. The production-like blue mask and T3 parser are the only sources with at least three newly observed exact bonuses, but both add too much noisy evidence for direct candidate-pool expansion.

## Bonus-Only Addressable Sides

Only one failing side has exact members and exact total already selected while bonus evidence is the blocker:

| Image | Stage | Side | Expected bonus | Current bonus | Evidence |
| --- | ---: | --- | ---: | ---: | --- |
| IMG_0296.png | 2 | enemy | 84714 | 84 | T3 numeric-run |

This is not enough for productionization. It is a useful future browser-parity target only if a stricter bonus text-boundary proposal can prove zero FP.

## Stage3 / Side / Cluster Audit

Nonzero missing exact bonus cases:

| Group | Count |
| --- | ---: |
| Stage3 self | 11 |
| Stage3 enemy | 4 |
| Stage2 enemy | 1 |
| Stage1 self | 2 |
| Self side | 13 |
| Enemy side | 5 |
| ipad-01 | 14 |
| ipad-02 | 4 |

Stage3 remains the main bonus capture problem: 15 / 18 nonzero missing exact cases are Stage3, and all are merged/noisy text cases.

## Upper Bounds

| Scenario | Stage/side PASS upper bound |
| --- | ---: |
| A. Current production | 44 / 108 |
| B. Perfect bonus selection from existing candidates | 44 / 108 |
| C. Perfect bonus recognition, keeping current members/total | 49 / 108 |
| D. Perfect bonus recognition + current Tier C | 49 / 108 |
| E. Perfect bonus recognition + current Tier C + strict total | 49 / 108 |

Existing candidate selection is not the bottleneck for bonus fields. Recognition/capture is the bottleneck, but even perfect bonus recognition only has a five-row upper bound unless member and total evidence also improve.

## Recommendation

Do not productionize bonus candidate expansion.

The next best diagnostic experiment is a narrower T3-style bonus text-boundary investigation focused on `IMG_0296.png` S2 enemy and the two other newly observed exact bonuses. The goal would be to determine whether T3 can be restricted by plus-marker/blue-mask provenance enough to remove the 14 noisy fields. If not, bonus-specific work should defer behind member/total evidence improvements.

