# iPad Stage3 RapidOCR R6 Blocker Isolation

Date: 2026-08-17

This is a diagnostic-only blocker isolation investigation for the four frozen offline RapidOCR R6 true-positive rows. It does not change production OCR, frozen R6 semantics, RapidOCR Stage3 availability, iPad Tier C, strict-total, strict-member2, smartphone OCR, current-PC OCR, or legacy desktop OCR.

Generated artifacts:

```text
tmp/ipad-stage3-rapidocr-r6-blocker-isolation/
```

Generated artifacts are intentionally untracked.

## Baseline

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
| direct-browser best-evidence frozen R6 | 0 TP / 0 FP |

Production remains Tesseract-based. RapidOCR Stage3 remains developer-only.

## BEST-CURRENT-BROWSER-EVIDENCE

The canonical browser evidence policy used for this investigation is:

| Field | Candidate sources |
| --- | --- |
| member1 | `baseline-12pct-padding` |
| member2 | `baseline-12pct-padding`, `member2-vertical-expand-8pct` |
| member3 | `baseline-12pct-padding`, `member3-left-expand-right-trim-8pct`, `member3-vertical-expand-8pct` |
| bonus | all non-zero bonus ROI/preprocessing candidates from `--nonzero-bonus` |
| total | `baseline-12pct-padding`, `total-horizontal-expand-8pct`, `total-vertical-expand-10pct` |

This policy reuses existing diagnostic evidence only. No ROI, parser, confidence, or R6 guard was changed.

Field coverage under this policy:

| Field | Browser exact |
| --- | ---: |
| member1 | 83 / 106 |
| member2 | 54 / 106 |
| member3 | 92 / 106 |
| bonus | 42 / 106 |
| total | 90 / 106 |

## Four Offline R6 TP Rows

| Image | Stage | Side | Offline proposal | Offline R6 |
| --- | ---: | --- | --- | --- |
| `IMG_0265.png` | 3 | self | `951228 / 628395 / 449753`, bonus `190245`, total `2219621` | PASS |
| `IMG_0265.png` | 3 | enemy | `370750 / 46611 / 26083`, bonus `0`, total `443444` | PASS |
| `IMG_0283.png` | 3 | self | `862800 / 789450 / 701079`, bonus `172560`, total `2525889` | PASS |
| `IMG_0491.png` | 3 | self | `756989 / 622972 / 706308`, bonus `151397`, total `2237666` | PASS |

All four remain blocked in the direct-browser best-evidence policy.

## Field Comparison Matrix

Categories:

| Code | Meaning |
| --- | --- |
| A | exact numeric candidate matches offline |
| B | exact value exists but browser provenance differs |
| C | exact value exists but confidence fails R6 |
| D | exact value exists but fragment guard blocks it |
| E | exact value exists but multiplicity/ambiguity blocks it |
| F | exact value absent |
| G | browser only has prefix/suffix fragment |
| H | other |

| Row | member1 | member2 | member3 | bonus | total |
| --- | --- | --- | --- | --- | --- |
| `IMG_0265` self | C, `0.886` | C, `0.7991` | B, `0.939` | C, `0.8073` | C, `0.8427` |
| `IMG_0265` enemy | C, `0.8456` | F | C, `0.8698` | F/default zero | C, `0.8469` |
| `IMG_0283` self | C, `0.7725` | C, `0.8185` | C, `0.8275` | C, `0.7706` | B, `0.9073` |
| `IMG_0491` self | C, `0.867` | C, `0.7968` | C, `0.8817` | C, `0.7986` | C, `0.7432` |

Key distinction: several fields have exact candidates, but they are not R6-usable because the frozen browser-side confidence is below `0.90`.

## R6 Blocker Decomposition

| Row | Frozen R6 block reasons |
| --- | --- |
| `IMG_0265` self | `total-confidence-below-0.90`, `member1-confidence-below-0.90`, `member2-confidence-below-0.90` |
| `IMG_0265` enemy | `changed-field-missing-rapidocr-support`, `total-confidence-below-0.90`, `member1-confidence-below-0.90`, `member2-confidence-below-0.90`, `member3-confidence-below-0.90` |
| `IMG_0283` self | `member1-confidence-below-0.90`, `member2-confidence-below-0.90`, `member3-confidence-below-0.90` |
| `IMG_0491` self | `total-confidence-below-0.90`, `member1-confidence-below-0.90`, `member2-confidence-below-0.90`, `member3-confidence-below-0.90` |

Frequency across the four rows:

| Blocker family | Count |
| --- | ---: |
| confidence blockers | 14 |
| member2 capture blockers | 1 |
| incomplete evidence blockers | 1 |
| member1 capture blockers | 0 |
| member3 capture blockers | 0 |
| bonus capture blockers | 0 |
| total capture blockers | 0 |
| fragment blockers | 0 |
| ambiguity blockers | 0 |
| multiplicity blockers | 0 |
| provenance blockers | 0 |

The dominant blocker is confidence, not missing ROI evidence.

## Member1 Audit

Member1 has not received targeted browser ROI work, but it is not the primary capture blocker for the four rows.

| Row | Offline member1 | Browser exact present | Max confidence | Alone blocks R6 |
| --- | ---: | --- | ---: | --- |
| `IMG_0265` self | `951228` | yes | `0.886` | yes, confidence only |
| `IMG_0265` enemy | `370750` | yes | `0.8456` | yes, confidence only |
| `IMG_0283` self | `862800` | yes | `0.7725` | yes, confidence only |
| `IMG_0491` self | `756989` | yes | `0.867` | yes, confidence only |

Across all 106 Stage3 sides:

| Metric | Result |
| --- | ---: |
| direct-browser member1 exact candidate coverage | 83 / 106 |
| offline member1 exact candidate coverage | 70 / 106 |
| browser deficit vs offline | 5 fields |

Member1 ROI work may help other rows later, but it is not the highest-leverage blocker for these four frozen R6 positives.

## Confidence Audit

R6 requires:

```text
changed members >= 0.90 confidence
total anchor >= 0.90 confidence
```

Rows where all or most exact values exist but confidence blocks:

| Row | Exact fields available | R6-eligible exact fields | Main confidence failures |
| --- | ---: | ---: | --- |
| `IMG_0265` self | 5 / 5 | 2 / 5 | total, member1, member2 |
| `IMG_0265` enemy | 3 / 5 | 0 / 5 | total, member1, member2, member3; member2 exact absent |
| `IMG_0283` self | 5 / 5 | 2 / 5 | member1, member2, member3 |
| `IMG_0491` self | 5 / 5 | 1 / 5 | total, member1, member2, member3 |

All four rows have confidence blockers. Three of the four would satisfy R6 if browser confidence matched offline-quality confidence while all other current browser evidence stayed the same.

## Fragment Audit

Fragment relationships exist in the richer browser candidate pools, especially for bonus and total, but they are not the active frozen R6 blockers for these four rows.

| Row | Fragment-related R6 block? | Notes |
| --- | --- | --- |
| `IMG_0265` self | no | Total and member/bonus fragments are present, but active blockers are confidence. |
| `IMG_0265` enemy | no | Missing member2 and confidence dominate. |
| `IMG_0283` self | no | Total exact is high enough; member confidence blocks. |
| `IMG_0491` self | no | Fragments exist, but active blockers are confidence. |

Do not weaken fragment guards.

## Multiplicity Audit

Candidate union expansion produces many candidates, especially for bonus, but no row is blocked by the frozen R6 candidate-pool-too-wide guard.

| Row | Multiplicity block? | Notes |
| --- | --- | --- |
| `IMG_0265` self | no | Bonus has 17 distinct values, but bonus multiplicity is not an R6 blocker. |
| `IMG_0265` enemy | no | Member2 is absent; confidence dominates. |
| `IMG_0283` self | no | Bonus has 17 distinct values; member confidence dominates. |
| `IMG_0491` self | no | Bonus has 11 distinct values; confidence dominates. |

Do not collapse candidate pools as a next step; the single-blocker oracle shows it would recover 0 / 4.

## Exact vs R6-usable Evidence

| Row | Exact fields available | R6-eligible exact fields | Explanation |
| --- | ---: | ---: | --- |
| `IMG_0265` self | 5 / 5 | 2 / 5 | exact evidence exists, but total/member confidence fails |
| `IMG_0265` enemy | 3 / 5 | 0 / 5 | member2 absent and all available changed/total supports are low confidence |
| `IMG_0283` self | 5 / 5 | 2 / 5 | exact evidence exists, but member confidence fails |
| `IMG_0491` self | 5 / 5 | 1 / 5 | exact evidence exists, but total/member confidence fails |

This is the important finding: browser evidence availability and R6 usability are now different problems.

## Single-blocker Oracle

This oracle is diagnostic only. It uses expected values after evidence generation to estimate leverage without changing R6.

| Hypothesis | Rows that would satisfy remaining R6 conditions |
| --- | ---: |
| H1: perfect member1 evidence | 0 / 4 |
| H2: perfect member2 evidence | 0 / 4 |
| H3: perfect bonus evidence | 0 / 4 |
| H4: browser confidence matched offline confidence | 3 / 4 |
| H5: only exact full candidates existed, fragments removed | 0 / 4 |
| H6: candidate multiplicity collapsed to the correct existing candidate | 0 / 4 |

H4 is the only high-leverage single blocker.

## All-side Confidence Scope

For the winning blocker family, the all-side audit found:

| Metric | Result |
| --- | ---: |
| Stage3 sides audited | 106 |
| sides with all five exact fields under best browser evidence | 15 |
| sides with all five exact fields and at least one exact below `0.90` | 15 |
| four offline TP rows blocked by confidence | 4 / 4 |

This reinforces that the next issue is confidence/preprocessing parity, not simply more micro-ROI capture.

## Classification

Current state:

```text
E. mixed blockers
```

The dominant blocker is exact-candidate confidence mismatch between offline and direct-browser evidence. There is one remaining capture blocker: `IMG_0265` enemy member2 `46611` is still absent. Bonus capture is no longer the main blocker for the non-zero bonus TP rows because `190245`, `172560`, and `151397` are now observed.

## Recommendation

Next experiment:

```text
offline-vs-browser recognizer confidence/preprocessing parity investigation for the exact same fixed crops and proposal rows
```

Why:

- confidence blocks all four offline R6 TP rows
- H4 alone recovers 3 / 4 in the oracle
- member1/member2/bonus isolated perfection each recovers 0 / 4 alone
- fragment and multiplicity isolated changes recover 0 / 4
- no production behavior should change until confidence provenance is understood

Do not:

- weaken frozen R6 confidence or fragment guards
- add more bonus ROI variants before confidence/provenance parity is understood
- productionize RapidOCR Stage3
- use filename-specific or expected-value-driven candidate generation

Production OCR remains unchanged.
