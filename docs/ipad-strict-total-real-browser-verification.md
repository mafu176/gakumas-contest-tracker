# iPad Strict Total Real Browser Verification

Status: diagnostic-only real-browser verification.

The browser automation uploads the real iPad fixtures into the local app with `ipadArithmeticDebug=1`, reads the browser-native strict total-selection diagnostics, and compares them with the runner/browser-equivalent parity artifacts from `tmp/ipad-strict-total-selection-parity`.

No strict-total proposal is applied to visible OCR output or final parsed scores in this task.

## Coverage

- command: `node scripts/ipad-strict-total-browser-verification.mjs`
- artifact directory: `tmp/ipad-strict-total-real-browser-verification`
- browser runs: 2
- images processed per run: 18 / 18
- stage/sides compared per run: 108 / 108
- production baseline preserved: yes
- UI mutation audit: PASS

## Run Summary

| run | images | stage/sides | browser wouldApply | accepted found | exact proposal matches | TP | FP | UI mutations |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 18 | 108 | 4 | 4 | 4 | 4 | 0 | 0 |
| 2 | 18 | 108 | 4 | 4 | 4 | 4 | 0 | 0 |

## Accepted Four-Case Audit

| image | stage | side | current members | bonus | current selected total | proposed total | result |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| IMG_0264.png | 2 | enemy | 33386 / 91957 / 74459 | 0 | 7199802 | 199802 | TP |
| IMG_0278.png | 1 | enemy | 310198 / 348665 / 180900 | 69733 | 909 | 909496 | TP |
| IMG_0300.png | 2 | enemy | 9229 / 84982 / 54708 | 0 | 7148919 | 148919 | TP |
| IMG_0326.png | 2 | enemy | 76798 / 23347 / 11952 | 0 | 112 | 112097 | TP |

All accepted rows used directly observed browser total candidates from the production T0 total pool. The computed sum is retained only as validation context.

## Parity Disagreements

| field | run-1 count |
| --- | ---: |
| selectedMembers | 0 |
| bonus | 0 |
| currentTotal | 0 |
| totalCandidatePool | 0 |
| completeness | 0 |
| computedValidationTotal | 0 |
| matchingCandidates | 0 |
| uniqueMatchingTotal | 40 |
| eligibility | 0 |
| wouldApply | 0 |
| proposedTotal | 0 |
| blockReason | 0 |
| provenance | 14 |
| missingEvidence | 0 |
| safety | 0 |

Safety-relevant mismatches across all runs: 0

## Negative Control

| image | stage | side | wouldApply by run | run-1 block reasons | result |
| --- | ---: | --- | --- | --- | --- |
| IMG_0792.png | 3 | self | false / false | truncated-total-candidate-pool; missing-observed-total-for-current-fields | PASS |

The known S2/S4 false-positive shape remains rejected without filename-specific logic.

## Two-Run Stability

- accepted rows: 4
- stable accepted rows: 4
- unstable accepted rows: 0

## Production Baseline

Per run:

- stage/side PASS: 40 / 108
- Tier C production applications: 24
- Tier C TP / FP: 24 / 0

The strict-total diagnostic does not change production Tier C, T2 parsing, total candidate generation, ROI/preprocessing, ranking, smartphone OCR, current-PC OCR, legacy desktop OCR, or expected fixtures.

## Recommendation

Production-readiness review is justified next. Do not productionize from this diagnostic task alone.
