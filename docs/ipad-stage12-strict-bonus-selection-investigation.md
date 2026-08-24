# iPad Stage1/2 Strict Bonus Selection Investigation

Status: diagnostic-only. Production OCR behavior was not changed.

## Production Baseline

| metric | value |
| --- | ---: |
| completed fixtures | 53 |
| stages exact | 58 / 159 |
| stage/sides exact | 162 / 318 |
| production recoveries | 119 TP / 0 FP |
| Tier C | 72 TP / 0 FP |
| strict-total | 15 TP / 0 FP |
| strict-member2 | 32 TP / 0 FP |

The authoritative 53-fixture production artifact was reused. A full browser rerun was intentionally avoided because the stable two-run artifact already matches the required baseline.

## Detail Scope

- Authoritative aggregate scope: 53 completed fixtures.
- Available post-M3 per-field candidate matrix: 108 stage/sides from 18 images.
- Older global candidate matrix also exists, but it predates the latest strict-member2 production state and is used only as a cross-check.
- Candidate provenance in the retained matrix is field-level, not candidate-level; that is a blocker for direct productionization.

## Theoretical Bonus Opportunities

The post-M3 leverage review lists five one-field-away bonus rows. Four are recognition/evidence-absence cases; one is a selection-only row with an explicit zero candidate.

| image | stage | side | current bonus | expected bonus | exact candidate present | provenance | classification |
| --- | ---: | --- | ---: | ---: | --- | --- | --- |
| IMG_0270.png | 1 | enemy | 74 | 0 | no | - | recognition |
| IMG_0287.png | 1 | enemy | 71 | 0 | no | - | recognition |
| IMG_0296.png | 2 | enemy | 84 | 84714 | no | - | recognition |
| IMG_0306.png | 2 | enemy | 4 | 0 | no | - | recognition |
| IMG_0491.png | 1 | enemy | 1 | 0 | yes | white-mask-3x-psm7 | selection |

## Bonus Candidate Provenance

| provenance | rows | candidates | exact candidates | wrong candidates | zero rows | short fragments | truncated pools |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline-score-preprocess-3x-psm7 + invert-normalize-3x-psm7 + white-mask-3x-psm7 | 5 | 22 | 5 | 17 | 4 | 14 | 1 |
| invert-normalize-3x-psm7 + white-mask-3x-psm7 | 2 | 10 | 2 | 8 | 2 | 8 | 1 |
| blue-bonus-mask-3x-psm7 | 10 | 21 | 10 | 11 | 0 | 5 | 0 |
| no-provenance-recorded | 27 | 92 | 0 | 92 | 1 | 63 | 3 |
| baseline-score-preprocess-3x-psm7 + blue-bonus-mask-3x-psm7 | 6 | 24 | 6 | 18 | 3 | 15 | 3 |
| baseline-score-preprocess-3x-psm7 + blue-bonus-mask-3x-psm7 + white-mask-3x-psm7 | 1 | 6 | 1 | 5 | 1 | 3 | 1 |
| baseline-score-preprocess-3x-psm7 + white-mask-3x-psm7 | 1 | 6 | 1 | 5 | 1 | 4 | 1 |
| baseline-score-preprocess-3x-psm7 + blue-bonus-mask-3x-psm7 + invert-normalize-3x-psm7 + white-mask-3x-psm7 | 5 | 29 | 5 | 24 | 3 | 20 | 3 |
| invert-normalize-3x-psm7 | 3 | 11 | 3 | 8 | 3 | 5 | 1 |
| baseline-score-preprocess-3x-psm7 | 3 | 13 | 3 | 10 | 2 | 7 | 0 |
| blue-bonus-mask-3x-psm7 + white-mask-3x-psm7 | 2 | 9 | 2 | 7 | 0 | 1 | 0 |
| white-mask-3x-psm7 | 2 | 8 | 2 | 6 | 2 | 6 | 1 |
| baseline-score-preprocess-3x-psm7 + blue-bonus-mask-3x-psm7 + invert-normalize-3x-psm7 | 2 | 8 | 2 | 6 | 0 | 6 | 1 |
| baseline-score-preprocess-3x-psm7 + invert-normalize-3x-psm7 | 2 | 10 | 2 | 8 | 2 | 7 | 1 |
| blue-bonus-mask-3x-psm7 + invert-normalize-3x-psm7 | 1 | 2 | 1 | 1 | 0 | 0 | 0 |

## Policy Ladder

| policy | applications | TP | FP | Stage1 TP/FP | Stage2 TP/FP | ipad-01 TP/FP | ipad-02 TP/FP |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| S1-blue-nonzero-unique-arithmetic | 0 | 0 | 0 | 0/0 | 0/0 | 0/0 | 0/0 |
| S2-blue-plus-explicit-zero | 1 | 1 | 0 | 1/0 | 0/0 | 0/0 | 1/0 |
| S3-any-strong-profile-nontruncated | 1 | 1 | 0 | 1/0 | 0/0 | 0/0 | 1/0 |
| S4-any-strong-profile-with-truncated-audit | 1 | 1 | 0 | 1/0 | 0/0 | 0/0 | 1/0 |

Best diagnostic policy: **S2-blue-plus-explicit-zero**.

## Application Audit

| image | stage | side | before bonus | proposed bonus | arithmetic | provenance | result |
| --- | ---: | --- | ---: | ---: | --- | --- | --- |
| IMG_0491.png | 1 | enemy | 1 | 0 | 201+0+0+0=201 | white-mask-3x-psm7 | TP |

## Non-Application Audit For The Five

| image | stage | side | block reasons |
| --- | ---: | --- | --- |
| IMG_0270.png | 1 | enemy | required-bonus-not-in-existing-bonus-candidates, bonus-provenance-not-allowed, valid-bonus-candidate-not-unique |
| IMG_0287.png | 1 | enemy | required-bonus-not-in-existing-bonus-candidates, bonus-provenance-not-allowed, truncated-bonus-pool, valid-bonus-candidate-not-unique |
| IMG_0296.png | 2 | enemy | required-bonus-not-in-existing-bonus-candidates, bonus-provenance-not-allowed, valid-bonus-candidate-not-unique |
| IMG_0306.png | 2 | enemy | required-bonus-not-in-existing-bonus-candidates, bonus-provenance-not-allowed, valid-bonus-candidate-not-unique |

## Safety Audits

- currently correct Stage1/2 sides checked: 52; conflicting applications: 0
- zero-bonus sides checked: 36; selector applications: 1; unsafe applications: 0
- small-noise rows with candidates or applications: 63; applications: 1
- fragment rows with candidates or applications: 63; applications: 1
- multiple valid arithmetic candidate rows: 0
- crown-consistent applications: 1 / 1
- recovery overlap conflicts: 0

## Candidate Upper Bound

| measure | rows |
| --- | ---: |
| bonus-wrong Stage1/2 rows in detailed matrix | 15 |
| exact expected bonus exists in bonus candidates | 4 |
| arithmetic-valid existing bonus candidate | 1 |
| unique arithmetic-valid existing bonus candidate | 1 |
| survives strict safety | 1 |

## Runner / Browser-Equivalent Parity

The shared diagnostic evaluator was replayed through two identical evidence adapters. Proposal disagreements: 0; safety mismatches: 0.

No real-browser verification was run because the best policy is only 1 TP / 0 FP in the retained post-M3 detail artifact, below the requested >=2 TP threshold.

## Combined Simulation

- NET_NEW_TP lower bound: 1
- NET_NEW_FP lower bound: 0
- simulated stage/sides exact lower bound: 163 / 318
- simulated stages exact lower bound: 59 / 159

## Older Global Matrix Cross-Check

The older global candidate matrix produced 0 best-policy applications (0 TP / 0 FP). Because it predates the current production state, it is not used as production-readiness evidence.

## Recommendation

Do not productionize Stage1/2 strict bonus selection yet. The direction is safe in the retained detail artifact, but only one true selection-only TP is currently proven, and candidate-level provenance is missing from the saved matrix. The exact next step is to capture a complete current-production 53-fixture per-field browser artifact with candidate-level bonus provenance, then rerun this selector. If that confirms at least 2 TP / 0 FP, proceed to shared runner/browser parity and real-browser verification.

Production unchanged: no OCR behavior, preprocessing, RapidOCR, Stage3, smartphone, current-PC, or legacy desktop code was modified.
