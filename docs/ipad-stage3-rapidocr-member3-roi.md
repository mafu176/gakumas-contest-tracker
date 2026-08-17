# iPad Stage3 RapidOCR Member3 ROI Investigation

Date: 2026-08-17

This is a diagnostic-only direct-browser RapidOCR investigation. It does not change production OCR, iPad Tier C, strict-total, strict-member2, frozen RapidOCR R6 semantics, smartphone OCR, current-PC OCR, or legacy desktop OCR.

Generated artifacts:

```text
tmp/ipad-stage3-rapidocr-member3-roi/
```

Generated artifacts are intentionally untracked.

## Baseline Confirmation

Production safety was reconfirmed with the frozen R6 parity command:

| Check | Result |
| --- | ---: |
| completed labeled iPad fixtures | 53 |
| production recoveries | 119 TP / 0 FP |
| offline RapidOCR member1 exact | 70 / 106 |
| offline RapidOCR member2 exact | 52 / 106 |
| offline RapidOCR member3 exact | 79 / 106 |
| offline RapidOCR bonus exact | 53 / 106 |
| offline RapidOCR total exact | 106 / 106 |
| frozen offline R6 | 4 TP / 0 FP |
| `IMG_0283` suffix-fragment FP | blocked |

Direct-browser fixed ROI baseline also reproduced:

| Field | Exact |
| --- | ---: |
| member1 | 83 / 106 |
| member2 | 23 / 106 |
| member3 | 74 / 106 |
| bonus | 2 / 106 |
| total | 62 / 106 |
| all Stage3 fields | 244 / 530 |
| R6 | 0 TP / 0 FP |

The current diagnostic reference before member3 variants uses member1 baseline, the minimized member2 set (`baseline-12pct-padding` + `member2-vertical-expand-8pct`), member3 baseline, bonus variant union, and the best total set (`baseline-12pct-padding` + `total-horizontal-expand-8pct` + `total-vertical-expand-10pct`):

| Field | Exact |
| --- | ---: |
| member1 | 83 / 106 |
| member2 | 54 / 106 |
| member3 | 74 / 106 |
| bonus | 4 / 106 |
| total | 90 / 106 |

## Locked Member3 Variants

Only member3 was varied. Member1 stayed on the baseline ROI. Member2 used the minimized best member2 set from the previous investigation. Bonus and total used the current diagnostic policies only for R-policy evaluation.

| Variant | Scope | Geometry | Rationale |
| --- | --- | --- | --- |
| `baseline-12pct-padding` | member3 | Existing Stage3 field ROI with 12% padding. | Control. |
| `member3-horizontal-expand-10pct` | member3 | Expand width by 10%. | Test clipped left/right digits. |
| `member3-left-expand-right-trim-8pct` | member3 | Shift left 4%, expand width 8%. | Test clipped leading digits. |
| `member3-right-expand-left-trim-8pct` | member3 | Shift right 4%, expand width 8%. | Test trailing digits and neighbor bleed. |
| `member3-vertical-expand-8pct` | member3 | Expand height by 8%. | Test vertical clipping and grouped-number token stability. |

Representative pixel rectangles from the browser run:

| Cluster | Example | Variant | Pixel rect |
| --- | --- | --- | --- |
| ipad-01 | `IMG_0282.png` | baseline | `x=582 y=1519 w=268 h=83` |
| ipad-01 | `IMG_0282.png` | horizontal | `x=569 y=1519 w=295 h=83` |
| ipad-01 | `IMG_0282.png` | left-expand/right-trim | `x=561 y=1519 w=289 h=83` |
| ipad-01 | `IMG_0282.png` | right-expand/left-trim | `x=583 y=1519 w=289 h=83` |
| ipad-01 | `IMG_0282.png` | vertical | `x=582 y=1516 w=268 h=90` |
| ipad-02 | `IMG_0795.png` | baseline | `x=572 y=1481 w=265 h=82` |
| ipad-02 | `IMG_0795.png` | horizontal | `x=559 y=1481 w=292 h=82` |
| ipad-02 | `IMG_0795.png` | left-expand/right-trim | `x=551 y=1481 w=286 h=82` |
| ipad-02 | `IMG_0795.png` | right-expand/left-trim | `x=573 y=1481 w=286 h=82` |
| ipad-02 | `IMG_0795.png` | vertical | `x=572 y=1478 w=265 h=89` |

All variants are deterministic transforms of the current fixed member3 ROI. They do not use expected values, filenames, screenshot ids, or OCR results to construct crops.

## Offline vs Browser Member3 Gap

With the member3 variant union:

| Category | Count |
| --- | ---: |
| offline exact, browser exact | 79 |
| offline exact, browser wrong | 0 |
| offline exact, browser empty | 0 |
| offline wrong, browser exact | 13 |
| both wrong | 14 |
| browser fragment of expected full value | 57 |
| browser prefix/suffix contamination | 49 |

Primary comparison:

| Source | member3 exact |
| --- | ---: |
| offline RapidOCR | 79 / 106 |
| browser baseline | 74 / 106 |
| browser member3 union | 92 / 106 |

The browser member3 variants materially improve direct-browser candidate presence and exceed the offline member3 exact count. This is evidence that geometry variants can improve observed member3 coverage, but it is not enough by itself to unlock frozen R6.

## Per-Variant Member3 Result

| Variant | Exact | Candidate fields | Wrong candidates | Non-empty fields |
| --- | ---: | ---: | ---: | ---: |
| `baseline-12pct-padding` | 74 / 106 | 130 | 31 | 94 |
| `member3-horizontal-expand-10pct` | 52 / 106 | 141 | 71 | 91 |
| `member3-left-expand-right-trim-8pct` | 33 / 106 | 146 | 108 | 88 |
| `member3-right-expand-left-trim-8pct` | 80 / 106 | 130 | 22 | 96 |
| `member3-vertical-expand-8pct` | 69 / 106 | 191 | 59 | 98 |
| all member3 variants | 92 / 106 | 298 | 206 | 103 |

Fragment/noise summary for the full member3 union:

| Metric | Result |
| --- | ---: |
| no-candidate fields | 3 |
| exactly-one-candidate fields | 10 |
| multi-candidate fields | 93 |
| fragment-conflict fields | 86 |
| average candidates per field | 2.811 |

The smallest subset preserving the 92/106 member3 exact coverage is:

```text
baseline-12pct-padding
+ member3-left-expand-right-trim-8pct
+ member3-vertical-expand-8pct
```

That subset still has heavy noise:

| Metric | Result |
| --- | ---: |
| member3 exact | 92 / 106 |
| candidate values | 258 |
| wrong candidates | 166 |
| no-candidate fields | 3 |
| multi-candidate fields | 90 |
| fragment-conflict fields | 80 |
| average candidates per field | 2.434 |

The most production-minded small subset is weaker but much cleaner:

```text
baseline-12pct-padding + member3-vertical-expand-8pct
```

It reaches 87/106 member3 exact with 159 candidate values, 72 wrong candidates, 38 multi-candidate fields, and 27 fragment-conflict fields.

## R Policy Results

Frozen R6 was not changed.

| Policy | Member1 | Member2 | Member3 | Bonus | Total | TP | FP | wouldApply |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |
| R0 | baseline | best member2 set | baseline | bonus union | best total set | 0 | 0 | 0 |
| R1 | baseline | best member2 set | member3 union | baseline | baseline | 0 | 0 | 0 |
| R2 | baseline | best member2 set | member3 union | baseline | best total set | 0 | 0 | 0 |
| R3 | baseline | best member2 set | member3 union | bonus union | best total set | 0 | 0 | 0 |

`IMG_0283.png` Stage3 enemy remains blocked under R3. The known suffix-fragment false-positive shape was not revived.

Because no rows were accepted, no two-context accepted-row stability run was required.

## Four Offline R6 TP Rows

The four offline R6 TP rows remain blocked under R3:

| Image | Side | Exact fields under R3 | Blocker summary |
| --- | --- | ---: | --- |
| `IMG_0265.png` | self | 4 / 5 | member1/member2 exact, member3 exact, total exact; non-zero bonus `190245` absent and member/total confidence below R6 threshold. |
| `IMG_0265.png` | enemy | 3 / 5 | member1/member3/total exact; member2 `46611` absent and member confidences below threshold. |
| `IMG_0283.png` | self | 4 / 5 | all members and total exact; rejected by member confidence threshold, bonus remains absent. |
| `IMG_0491.png` | self | 4 / 5 | all members and total exact; non-zero bonus `151397` absent and member/total confidence below threshold. |

The member3-specific audit shows zero of the four offline TP rows are blocked by member3-only absence after this variant pass. The dominant blockers are:

- non-zero bonus evidence missing on `IMG_0265 self` and `IMG_0491 self`
- member2 still missing on `IMG_0265 enemy`
- low-confidence member/total support under the frozen R6 guard

## Combined Member2/Member3 Evidence

Using actual browser candidate pools under R3:

| Metric | Count |
| --- | ---: |
| sides with exact member2 candidate | 54 / 106 |
| sides with exact member3 candidate | 92 / 106 |
| sides with both exact member2 and member3 | 51 / 106 |
| sides with all 3 member candidates exact | 48 / 106 |
| sides with all 5 fields exact | 2 / 106 |

This is useful detectorless evidence coverage, but it is still far from a safe side-level selector because bonus evidence remains poor and candidate pools are noisy.

## Cluster View

| Cluster | member3 fields | exact | no candidate | multiple candidates |
| --- | ---: | ---: | ---: | ---: |
| unknown | 76 | 65 | 3 | 64 |
| ipad-01 | 20 | 18 | 0 | 20 |
| ipad-02 | 10 | 9 | 0 | 9 |

The member3 variant behavior is not a clean cluster-specific signal. Do not create cluster-specific variants from this evidence.

## Runtime

| Run | Recognizer profile | Total elapsed | Average per image | Approx calls per side |
| --- | --- | ---: | ---: | ---: |
| fixed baseline | 5 baseline fields per side | 59.90 s | 1.13 s | 5 |
| full member2 run | member2 five variants plus bonus/total diagnostic variants | 159.16 s | 3.00 s | 15 |
| full member3 run | member2 variants, member3 five variants, bonus/total diagnostic variants | 187.18 s | 3.53 s | 19 |
| minimized member3 set | baseline + left-expand/right-trim + vertical | not separately run | estimated below full run | 17 |

The full member3 experiment adds candidate coverage but also adds meaningful runtime and noise.

## Interpretation

Member3 ROI work is diagnostically useful:

- exact member3 presence rises from 74/106 to 92/106
- all offline-exact member3 cases are found by the browser union
- a three-variant minimized set preserves the full member3 coverage

But it does not unlock frozen R6:

- R0-R3 all remain 0 TP / 0 FP
- none of the four offline TP rows becomes accepted
- the previous `IMG_0283` unsafe suffix-fragment control remains blocked
- remaining blockers are mixed: missing non-zero bonus, one still-missing member2, and frozen confidence support

Detectorless Stage3 remains viable as a diagnostic architecture, but this member3-only ROI path is not enough to justify parity or production-readiness work.

## Recommended Next Step

Do not continue member3 ROI micro-tuning. Preserve the member3 variant evidence as diagnostic coverage only.

The exact next experiment should be a recognizer/support investigation rather than more geometry variants:

```text
diagnose why browser-observed exact member and total candidates fail the frozen R6 confidence/support guards,
while separately treating non-zero bonus capture as its own unresolved blocker.
```

If the goal is specifically to move the four offline R6 TP rows, the next dominant blockers are not member3 geometry:

- `IMG_0265 self`: bonus support + confidence
- `IMG_0265 enemy`: member2 exact support + confidence
- `IMG_0283 self`: confidence/support only
- `IMG_0491 self`: bonus support + confidence

Production remains unchanged.
