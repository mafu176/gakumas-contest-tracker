# iPad Stage3 RapidOCR Bonus/Total ROI Investigation

Date: 2026-08-17

This is a diagnostic-only direct-browser RapidOCR investigation. It does not change production OCR, iPad Tier C, strict-total, strict-member2, frozen RapidOCR R6 semantics, smartphone OCR, current-PC OCR, or legacy desktop OCR.

Generated artifacts:

```text
tmp/ipad-stage3-rapidocr-direct-runner/
tmp/ipad-stage3-rapidocr-bonus-total-roi/
```

Generated artifacts are intentionally untracked.

## Goal

The previous direct-browser RapidOCR runner proved that detectorless fixed ROIs are fast enough for iPad Stage3 diagnostics, but R6 still produced `0 TP / 0 FP` in the browser path. This pass tests whether small expected-blind bonus/total ROI variants can provide the missing support while keeping member fields frozen.

Member fields were intentionally not changed:

- `member1`: current single fixed ROI only
- `member2`: current single fixed ROI only
- `member3`: current single fixed ROI only

Only `bonus` and `total` fields received bounded ROI variants.

## Variant Set

Baseline for every field:

| Variant | Scope | Description |
| --- | --- | --- |
| `baseline-12pct-padding` | all fields | Existing detectorless fixed ROI with 12% padding. |

Bonus variants:

| Variant | Adjustment |
| --- | --- |
| `bonus-horizontal-expand-12pct` | Expand width by 12%. |
| `bonus-vertical-expand-12pct` | Expand height by 12%. |
| `bonus-up-left-expand-8pct` | Shift up/left by 4% and expand width/height by 8%. |

Total variants:

| Variant | Adjustment |
| --- | --- |
| `total-horizontal-expand-8pct` | Expand width by 8%. |
| `total-vertical-expand-10pct` | Expand height by 10%. |
| `total-down-trim-8pct` | Shift down 3% and trim height by 8%. |

All adjustments are generalized ratio-based transforms of the current fixed ROI. They do not use filename, screenshot, expected value, or result-specific logic.

## Commands

Baseline:

```bash
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --limit 10
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --all
```

Bonus/total ROI variants:

```bash
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --limit 10 --bonus-total-roi
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --all --bonus-total-roi
```

The `--bonus-total-roi` flag enables the developer-only browser query:

```text
?ipadStage3RapidOcrBonusTotalRoi=1
```

Normal production usage never enables this path.

## Policy Evaluation

The frozen R6 policy was not changed. The runner scores existing offline RapidOCR proposal rows against browser-observed candidate support under these diagnostic policies:

| Policy | Member evidence | Bonus evidence | Total evidence |
| --- | --- | --- | --- |
| P0 | baseline only | baseline only | baseline only |
| P1 | baseline only | union variants | baseline only |
| P2 | baseline only | baseline only | union variants |
| P3 | baseline only | union variants | baseline only |
| P4 | baseline only | baseline only | union variants |
| P5 | baseline only | union variants | union variants |

P1 and P3 are intentionally equivalent. P2 and P4 are intentionally equivalent. They are kept separate so later policy reports can align with the requested matrix.

## Baseline Result

Full 53-fixture direct-browser fixed ROI baseline:

| Field | Direct-browser fixed ROI | Offline RapidOCR reference |
| --- | ---: | ---: |
| member1 | 83 / 106 | 70 / 106 |
| member2 | 23 / 106 | 52 / 106 |
| member3 | 74 / 106 | 79 / 106 |
| bonus | 2 / 106 | 53 / 106 |
| total | 62 / 106 | 106 / 106 |
| all fields | 244 / 530 | 360 / 530 |

R6:

| Scope | TP | FP | wouldApply |
| --- | ---: | ---: | ---: |
| 10-image baseline | 0 | 0 | 0 |
| full 53 baseline | 0 | 0 | 0 |

Runtime:

| Scope | Total elapsed | Average per image |
| --- | ---: | ---: |
| 10-image baseline | 16.85 s | 1.68 s |
| full 53 baseline | 58.92 s | 1.11 s |

The direct-browser diagnostic payload does not currently expose a stable `ipad-01` / `ipad-02` cluster id, so the artifact reports this run as `unknown`. The fixture-expansion docs still contain the source fixture cluster labels.

## Bonus/Total ROI Result

Full 53-fixture bonus/total ROI run:

| Field | Baseline exact | Variant union exact | Gain |
| --- | ---: | ---: | ---: |
| bonus | 2 / 106 | 4 / 106 | +2 |
| total | 62 / 106 | 90 / 106 | +28 |

Important bonus finding:

- All 4 exact bonus rows are expected `0`.
- Non-zero crown bonus capture remains `0 / 106`.
- Bonus variants therefore do not provide useful R6 bonus support.

Total variants are much more useful as OCR capture diagnostics:

| Total variant set | Exact totals | Distinct candidates | Wrong candidates |
| --- | ---: | ---: | ---: |
| baseline only | 62 / 106 | 123 | 61 |
| horizontal only | 73 / 106 | 125 | 52 |
| baseline + horizontal | 80 / 106 | 168 | 88 |
| horizontal + vertical | 86 / 106 | 234 | 148 |
| baseline + horizontal + vertical | 90 / 106 | 267 | 177 |
| all total variants | 90 / 106 | 328 | 238 |

The best minimal total set is:

```text
baseline-12pct-padding + total-horizontal-expand-8pct + total-vertical-expand-10pct
```

`total-down-trim-8pct` adds no exact total coverage beyond that set and increases candidate noise.

Bonus variants do not justify a minimal production-minded set:

| Bonus variant set | Exact bonus rows | Non-zero exact bonus rows | Distinct candidates | Wrong candidates |
| --- | ---: | ---: | ---: | ---: |
| baseline only | 2 / 106 | 0 / 106 | 274 | 272 |
| baseline + up-left | 4 / 106 | 0 / 106 | 457 | 453 |
| all bonus variants | 4 / 106 | 0 / 106 | 772 | 768 |

## P0-P5 R6 Results

Full 53-fixture results:

| Policy | TP | FP | wouldApply |
| --- | ---: | ---: | ---: |
| P0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 0 |
| P2 | 0 | 0 | 0 |
| P3 | 0 | 0 | 0 |
| P4 | 0 | 0 | 0 |
| P5 | 0 | 0 | 0 |

The bonus/total ROI variants improve total candidate capture but do not recover any R6 proposal. The R6 blockers remain mostly member-support and high-confidence anchor requirements, not just missing totals.

## Offline R6 TP Audit

The four frozen offline R6 TP rows remain blocked in direct-browser evaluation:

| Image | Side | Exact fields under P5 | Primary block reason |
| --- | --- | ---: | --- |
| `IMG_0265.png` | self | 2 / 5 | missing/low-confidence total anchor plus member2 not captured as exact. |
| `IMG_0265.png` | enemy | 3 / 5 | member2 missing; total/member confidence below R6 threshold. |
| `IMG_0283.png` | self | 4 / 5 | member candidates are exact, but changed-member confidence is below R6 threshold and bonus is not captured. |
| `IMG_0491.png` | self | 2 / 5 | member2 not captured as exact; bonus absent; total improves but R6 still lacks member support. |

Representative candidate evidence:

- `IMG_0265 self member2`: expected `628395`, browser text `8 628 395 44`, parsed as `8628395` and `44`.
- `IMG_0265 self total`: expected `2219621`, found by total variants from text such as `W2219.621`, but the row still lacks exact member2 and bonus evidence.
- `IMG_0283 self`: members `862800 / 789450 / 701079` and total `2525889` are observed, but bonus `172560` is absent and R6 still rejects on confidence guards.
- `IMG_0491 self member2`: expected `622972`, browser text `9 622 972 70`, parsed as `9622972` and `70`.

## IMG_0283 Audit

`IMG_0283.png` remains the important suffix-fragment control:

- Stage3 self: exact members and total are observed, but the exact bonus is not.
- Stage3 enemy: exact total `1087940` is found by total variants, while the member/bonus crop pool still contains noisy fragments.
- R6 remains blocked; the previous suffix-fragment false-positive shape is not reintroduced.

## Interpretation

The result is useful, but not production-ready:

- Total ROI capture can be improved substantially in direct-browser RapidOCR.
- Bonus ROI capture remains effectively unusable for non-zero crown bonuses.
- R6 still has `0 TP / 0 FP` under every policy.
- The accepted offline rows are blocked by member2 parsing/capture and confidence constraints, which this task intentionally did not change.

Because R6 remains below the requested `>= 2 TP / 0 FP` bar, a production-readiness review is not justified from bonus/total ROI work.

## Recommendation

Stop this direction for now as a recovery path. The exact next diagnostic step should be a targeted member-field ROI experiment, especially member2 parsing/crop behavior for texts like:

- `8 628 395 44`
- `9 622 972 70`

That experiment should remain direct-browser and diagnostic-only, keep R6 frozen, and test whether member candidates can be observed with exact slot provenance without introducing suffix/concatenation hazards.

