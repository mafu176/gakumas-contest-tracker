# iPad Stage3 RapidOCR Non-zero Bonus Investigation

Date: 2026-08-17

This is a diagnostic-only direct-browser RapidOCR investigation. It does not change production OCR, iPad Tier C, strict-total, strict-member2, frozen RapidOCR R6 semantics, smartphone OCR, current-PC OCR, or legacy desktop OCR.

Generated artifacts:

```text
tmp/ipad-stage3-rapidocr-nonzero-bonus/
```

Generated artifacts are intentionally untracked.

## Command

```bash
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --all --nonzero-bonus
```

The command enables the existing direct-browser RapidOCR path plus:

- the current minimized member2 evidence set
- the current member3 evidence set
- existing bonus/total diagnostic ROI support
- a new bonus-only deterministic blue-mask preprocessing profile
- S0-S4 diagnostic policies

No proposal is applied to production OCR output.

## Baseline Confirmation

The frozen RapidOCR parity command was rerun before evaluating the new bonus diagnostics:

| Check | Result |
| --- | ---: |
| completed labeled iPad fixtures | 53 |
| Stage3 sides | 106 |
| production recoveries | 119 TP / 0 FP |
| offline RapidOCR member1 exact | 70 / 106 |
| offline RapidOCR member2 exact | 52 / 106 |
| offline RapidOCR member3 exact | 79 / 106 |
| offline RapidOCR bonus exact | 53 / 106 |
| offline RapidOCR total exact | 106 / 106 |
| frozen offline R6 | 4 TP / 0 FP |
| `IMG_0283` suffix-fragment FP | blocked |

The direct-browser fixed ROI baseline also remains unchanged:

| Field | Exact |
| --- | ---: |
| member1 | 83 / 106 |
| member2 | 23 / 106 |
| member3 | 74 / 106 |
| bonus | 2 / 106 |
| total | 62 / 106 |
| all Stage3 fields | 244 / 530 |
| R6 | 0 TP / 0 FP |

## Bonus ROI and Preprocessing Variants

The experiment evaluates five deterministic bonus ROI geometries. Each is run with the current browser recognizer preprocessing and with a bonus-only blue-mask profile.

| Variant | Scope | Geometry |
| --- | --- | --- |
| `baseline-12pct-padding` | bonus | Existing fixed Stage3 bonus ROI with 12% padding. |
| `bonus-horizontal-expand-12pct` | bonus | Horizontal expansion from the fixed bonus crop. |
| `bonus-vertical-expand-12pct` | bonus | Vertical expansion from the fixed bonus crop. |
| `bonus-up-shift-8pct` | bonus | Upward shift to test blue bonus baseline alignment. |
| `bonus-left-expand-right-trim-8pct` | bonus | Asymmetric expansion away from following member/label text. |

| Preprocessing profile | Description |
| --- | --- |
| `recognizer-current` | Existing browser canvas recognizer input. |
| `bonus-blue-mask` | Deterministic blue-dominant pixel isolation rendered as black text on white background. |

The blue-mask profile is diagnostic-only and is only reachable through `?ipadStage3RapidOcrNonZeroBonus=1` or `--nonzero-bonus`.

## Field Coverage

The diagnostic run processed 53 completed iPad fixtures, 106 Stage3 sides, and 530 Stage3 fields.

| Field | Fixed baseline exact | Diagnostic union exact |
| --- | ---: | ---: |
| member1 | 83 / 106 | 83 / 106 |
| member2 | 23 / 106 | 54 / 106 |
| member3 | 74 / 106 | 92 / 106 |
| bonus | 2 / 106 | 42 / 106 |
| total | 62 / 106 | 90 / 106 |

Bonus exact coverage improved substantially, but it does not create a safe frozen R6 acceptance by itself.

## Bonus Variant Results

| Variant | Exact | Candidate fields | Candidates | Wrong candidates |
| --- | ---: | ---: | ---: | ---: |
| `bonus-vertical-expand-12pct__bonus-blue-mask` | 38 / 106 | 53 | 55 | 17 |
| `baseline-12pct-padding__bonus-blue-mask` | 10 / 106 | 53 | 56 | 46 |
| `bonus-horizontal-expand-12pct__bonus-blue-mask` | 4 / 106 | 56 | 57 | 53 |
| `bonus-left-expand-right-trim-8pct__bonus-blue-mask` | 4 / 106 | 59 | 63 | 59 |
| `baseline-12pct-padding` | 2 / 106 | 103 | 302 | 299 |
| `bonus-horizontal-expand-12pct` | 1 / 106 | 100 | 244 | 243 |
| `bonus-vertical-expand-12pct` | 1 / 106 | 104 | 304 | 303 |
| `bonus-up-shift-8pct` | 1 / 106 | 104 | 328 | 326 |
| `bonus-up-shift-8pct__bonus-blue-mask` | 1 / 106 | 50 | 66 | 65 |
| `bonus-left-expand-right-trim-8pct` | 1 / 106 | 104 | 237 | 236 |

The only strong bonus-specific capture signal is `bonus-vertical-expand-12pct__bonus-blue-mask`.

## Zero vs Non-zero Bonus

| Group | Rows | Exact present | Exact absent | Noise / blocker |
| --- | ---: | ---: | ---: | --- |
| expected bonus = 0 | 53 | 3 observed zero candidates | n/a | 53 / 53 polluted by non-zero candidates; 490 wrong non-zero candidates total |
| expected bonus > 0 | 53 | 39 | 14 | 53 / 53 also contained wrong OCR candidates; all exact rows had confidence below 0.90 |

This is the main safety concern. The blue-mask ROI is useful for observing non-zero bonus text, but it is not a clean selector. Zero-bonus sides are heavily polluted by member fragments and neighboring text.

## S Policy Results

Frozen R6 semantics were not changed.

| Policy | Member evidence | Bonus evidence | Total evidence | TP | FP | wouldApply |
| --- | --- | --- | --- | ---: | ---: | ---: |
| S0 | best member2/member3 sets | baseline current bonus only | best total set | 0 | 0 | 0 |
| S1 | best member2/member3 sets | current-profile bonus ROI union | baseline total | 0 | 0 | 0 |
| S2 | best member2/member3 sets | all bonus ROI/preprocessing variants | baseline total | 0 | 0 | 0 |
| S3 | best member2/member3 sets | all bonus ROI/preprocessing variants | best total set | 0 | 0 | 0 |
| S4 | best member2/member3 sets | all bonus ROI/preprocessing variants | best total set | 0 | 0 | 0 |

No accepted rows means there was no accepted-row stability run to perform.

## Four Offline R6 TP Rows

The four offline R6 TP rows remain blocked under S4:

| Image | Side | Bonus evidence under S4 | Total evidence under S4 | Blocker summary |
| --- | --- | --- | --- | --- |
| `IMG_0265.png` | self | exact `190245` appears, but with low confidence and many wrong candidates | exact total appears | blocked by missing/low-confidence total anchor and low-confidence member/total support |
| `IMG_0265.png` | enemy | expected bonus is 0, but non-zero noise appears | exact total appears | member2 exact `46611` remains absent; low-confidence support |
| `IMG_0283.png` | self | exact `172560` appears, with many competing values | exact total appears | negative-control shape remains blocked by total-anchor and confidence guards |
| `IMG_0491.png` | self | exact `151397` appears, with competing near/wrong values | exact total appears | low-confidence total/member support still blocks |

The investigation answers the original blocker: non-zero bonus exact evidence is now observable for all three bonus-changing offline TP rows. However, frozen R6 still does not accept them because confidence and total-anchor guards remain unsatisfied.

## IMG_0283 Safety Control

`IMG_0283.png` remains blocked:

| Side | Result |
| --- | --- |
| self | all expected values can appear in the raw candidate pool, including bonus `172560` and total `2525889`, but R6 rejects due to missing/low-confidence total anchor. |
| enemy | suffix-fragment false-positive shape remains rejected. |

This is good safety behavior. The new bonus evidence does not revive the known unsafe false positive.

## Combined Side Evidence

Under the S4 raw candidate pool:

| Metric | Count |
| --- | ---: |
| Stage3 sides | 106 |
| all 3 members exact | 48 |
| all 5 fields exact | 15 |
| frozen R6 wouldApply | 0 |

The combined evidence shows that capture is improving, but the direct-browser detectorless path still lacks a safe proposal layer. The current blocker is no longer simply non-zero bonus absence.

## Runtime

| Run | Total elapsed | Average per image |
| --- | ---: | ---: |
| full non-zero bonus diagnostic | 193.66 s | 3.65 s |

The runtime is comparable to the member3 ROI investigation and acceptable for diagnostic use. It is not suitable for production as-is.

## Recommendation

Do not productionize this bonus ROI/preprocessing set.

The most promising diagnostic profile is:

```text
bonus-vertical-expand-12pct__bonus-blue-mask
```

It raises non-zero bonus visibility to 38 exact rows on its own and 42 exact rows in union, but it also introduces enough wrong candidates that it should remain diagnostic-only.

The next exact step should not retune frozen R6 or broaden acceptance. Instead, investigate a browser-native proposal/anchor layer that can distinguish exact total anchors and high-quality bonus evidence from polluted candidate pools. In particular:

- preserve frozen R6 semantics as the safety reference
- keep `IMG_0283` enemy as the negative control
- focus on total-anchor confidence and candidate provenance, because non-zero bonus absence is no longer the sole blocker
- do not use zero/non-zero bonus candidate presence alone as a selector

Detectorless Stage3 remains viable as a diagnostic architecture, but not yet production-ready from this bonus-only evidence.
