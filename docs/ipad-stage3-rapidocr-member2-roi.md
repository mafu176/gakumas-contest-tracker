# iPad Stage3 RapidOCR Member2 ROI Investigation

Date: 2026-08-17

This is a diagnostic-only direct-browser RapidOCR investigation. It does not change production OCR, iPad Tier C, strict-total, strict-member2, frozen RapidOCR R6 semantics, smartphone OCR, current-PC OCR, or legacy desktop OCR.

Generated artifacts:

```text
tmp/ipad-stage3-rapidocr-member2-roi/
```

Generated artifacts are intentionally untracked.

## Baseline Confirmation

Production safety was confirmed through the frozen R6 parity command:

| Check | Result |
| --- | ---: |
| completed labeled iPad fixtures | 53 |
| production recoveries | 119 TP / 0 FP |
| offline RapidOCR member2 exact | 52 / 106 |
| frozen offline R6 | 4 TP / 0 FP |
| `IMG_0283` suffix-fragment FP | blocked |

Direct-browser fixed ROI baseline:

| Field | Exact |
| --- | ---: |
| member1 | 83 / 106 |
| member2 | 23 / 106 |
| member3 | 74 / 106 |
| bonus | 2 / 106 |
| total | 62 / 106 |
| all Stage3 fields | 244 / 530 |
| R6 | 0 TP / 0 FP |

The fixed baseline still matches the previous direct-browser result.

## Locked Member2 Variants

Only member2 was varied. Member1 and member3 stayed on the baseline fixed ROI. Bonus/total used the diagnostic-only variant support from the previous bonus/total ROI task when evaluating Q policies.

| Variant | Scope | Geometry | Rationale |
| --- | --- | --- | --- |
| `baseline-12pct-padding` | member2 | Existing Stage3 field ROI with 12% padding. | Control. |
| `member2-horizontal-expand-10pct` | member2 | Expand width by 10%. | Test clipped left/right digits. |
| `member2-left-trim-right-expand-8pct` | member2 | Shift right 4%, expand width 8%. | Test left-edge contamination such as leading rank/noise. |
| `member2-right-trim-left-expand-8pct` | member2 | Shift left 4%, expand width 8%. | Test right-edge contamination and missing left digits. |
| `member2-vertical-expand-8pct` | member2 | Expand height by 8%. | Test vertical clipping and grouped-number token stability. |

All variants are deterministic transforms of the current fixed member2 ROI. They do not use expected values, filenames, screenshot ids, or OCR results to construct crops.

The artifact `roi-definitions.json` records source pixel rectangles observed in the browser run. The direct-runner diagnostic payload does not currently expose stable `ipad-01` / `ipad-02` geometry ids, so cluster-specific pixel examples are limited to available fixture metadata and observed source-image pixel rects.

## Offline vs Browser Member2 Gap

With the member2 variant union:

| Category | Count |
| --- | ---: |
| offline exact, browser exact | 38 |
| offline exact, browser wrong | 14 |
| offline exact, browser empty | 0 |
| offline wrong, browser exact | 16 |
| both wrong | 38 |
| browser fragment of expected full value | 41 |
| browser prefix/suffix contamination | 36 |

Primary comparison:

| Source | member2 exact |
| --- | ---: |
| offline RapidOCR | 52 / 106 |
| browser baseline | 23 / 106 |
| browser member2 union | 54 / 106 |

The variant union materially improves direct-browser member2 candidate presence and slightly exceeds the offline member2 exact count.

## Per-Variant Member2 Result

| Variant | Exact | Candidate fields | Wrong candidates | Non-empty fields |
| --- | ---: | ---: | ---: | ---: |
| `baseline-12pct-padding` | 23 / 106 | 199 | 175 | 99 |
| `member2-horizontal-expand-10pct` | 7 / 106 | 131 | 123 | 63 |
| `member2-left-trim-right-expand-8pct` | 12 / 106 | 134 | 120 | 67 |
| `member2-right-trim-left-expand-8pct` | 6 / 106 | 173 | 167 | 89 |
| `member2-vertical-expand-8pct` | 46 / 106 | 234 | 178 | 102 |
| all member2 variants | 54 / 106 | 474 | 420 | 106 |

The useful variant is clearly `member2-vertical-expand-8pct`. The smallest candidate set preserving the full 54/106 member2 coverage is:

```text
baseline-12pct-padding + member2-vertical-expand-8pct
```

That minimized set has:

| Metric | Result |
| --- | ---: |
| member2 exact | 54 / 106 |
| candidate values | 305 |
| wrong candidates | 251 |
| no-candidate fields | 0 |
| multi-candidate fields | 94 |
| average candidates per field | 2.877 |

The full five-variant union is noisier:

| Metric | Result |
| --- | ---: |
| no-candidate fields | 0 |
| exactly-one-candidate fields | 7 |
| multi-candidate fields | 99 |
| fragment-conflict fields | 81 |
| average candidates per field | 4.472 |

## Q Policy Results

Frozen R6 was not changed.

| Policy | Member2 | Bonus | Total | TP | FP | wouldApply |
| --- | --- | --- | --- | ---: | ---: | ---: |
| Q0 | baseline | baseline | baseline | 0 | 0 | 0 |
| Q1 | member2 union | baseline | baseline | 0 | 0 | 0 |
| Q2 | member2 union | baseline | best total set | 0 | 0 | 0 |
| Q3 | member2 union | bonus union | best total set | 0 | 0 | 0 |

Best total set:

```text
baseline-12pct-padding + total-horizontal-expand-8pct + total-vertical-expand-10pct
```

`total-down-trim-8pct` remains excluded from the best policy because it adds noise without increasing exact total coverage.

## Four Offline R6 TP Rows

The four offline R6 TP rows remain blocked under Q3:

| Image | Side | Member2 after variants | Bonus/total after variants | R6 blocker summary |
| --- | --- | --- | --- | --- |
| `IMG_0265.png` | self | exact `628395` appears via `member2-vertical-expand-8pct`, but confidence is `0.7991`. | total exact appears; bonus `190245` absent. | changed-field support missing for bonus; total/member confidence below R6 threshold. |
| `IMG_0265.png` | enemy | expected `46611` still absent; only fragments/noise such as `46644`, `11426`, `466`. | total exact appears. | member2 still missing; all changed members below confidence threshold. |
| `IMG_0283.png` | self | exact `789450` appears from baseline and vertical variant, confidence around `0.816`. | total exact appears; bonus is not a changed field for the offline proposal. | member1/member2/member3 confidence below R6 threshold. |
| `IMG_0491.png` | self | exact `622972` appears via right-trim-left and vertical variants, confidence `0.7968-0.8107`. | total exact appears; bonus `151397` absent. | changed-field support missing for bonus; member/total confidence below R6 threshold. |

Member2 was a real blocker for at least three of the four rows before the variant pass, so the target was valid. After the pass, the remaining blocker is no longer simple member2 absence: it is low-confidence member support plus missing non-zero bonus support on bonus-changing rows.

## IMG_0283 Safety Control

`IMG_0283.png` Stage3 enemy remains blocked under every Q policy:

| Policy | wouldApply | Block reason summary |
| --- | ---: | --- |
| Q0 | no | short total/member fragments and low confidence. |
| Q1 | no | member2 union does not support the unsafe `206` proposal. |
| Q2 | no | total remains a short/low-confidence suffix-fragment proposal. |
| Q3 | no | same suffix-fragment and low-confidence guards still block. |

The known unsafe suffix-fragment proposal is not reintroduced.

## Runtime

| Run | Recognizer profile | Total elapsed | Average per image | Approx calls per side |
| --- | --- | ---: | ---: | ---: |
| fixed baseline | 5 baseline fields per side | 56.88 s | 1.07 s | 5 |
| full member2 run | member2 five variants plus bonus/total diagnostic variants | 160.45 s | 3.03 s | 15 |
| minimized candidate | baseline + member2 vertical + best total set + baseline bonus | not separately run | estimated below full run | 8 |

Because Q0-Q3 all remain `0 TP / 0 FP`, no two-context accepted-row stability run was required. There are no accepted identities to stabilize.

## Cluster View

The run reports clusters as `unknown` unless fixture metadata already identifies the expansion cluster.

| Cluster | member2 fields | exact | no candidate | multiple candidates |
| --- | ---: | ---: | ---: | ---: |
| unknown | 76 | 41 | 0 | 70 |
| ipad-01 | 20 | 10 | 0 | 20 |
| ipad-02 | 10 | 3 | 0 | 9 |

The variant behavior is not cleanly cluster-specific from this payload. Do not create cluster-specific variants from this evidence.

## Interpretation

Member2 ROI work is diagnostically useful:

- exact member2 presence rises from `23 / 106` to `54 / 106`
- the improvement is mostly from one generalized variant, `member2-vertical-expand-8pct`
- the minimized useful set is small: baseline + vertical expansion

But it is not enough for frozen R6:

- Q0-Q3 all remain `0 TP / 0 FP`
- R6 is still blocked by confidence thresholds and missing changed-field support
- non-zero bonus evidence remains weak
- member2 candidate noise is high, with fragment conflicts in `81 / 106` fields

Detectorless Stage3 remains plausible as a diagnostic architecture, but this result does not justify production-readiness or parity work yet.

## Recommended Next Step

Do not add more member2 variants immediately. Preserve:

```text
baseline-12pct-padding + member2-vertical-expand-8pct
```

as the best member2 diagnostic candidate set, then run one targeted experiment on member confidence support for the offline R6 TP rows. The highest-leverage next target is member1/member3 high-confidence support, because the four offline TP rows still fail R6 on member confidence even when member2 and total values are observed.

Production remains unchanged.

