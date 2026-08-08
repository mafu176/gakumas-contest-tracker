# iPad Strict Total Selection Parity

Status: diagnostic-only, browser-equivalent parity.

This report does not productionize the S3 strict total-only selector, change final iPad OCR output, change Tier C semantics, add total OCR candidates, change ROI/preprocessing, or affect smartphone/current-PC/legacy desktop OCR.

## S3 Semantics

- device mode must be positively identified as iPad portrait
- selected member1/member2/member3 and selected bonus are kept unchanged
- all selected non-total fields need strong provenance; bonus 0 may use the existing schema-default zero semantics
- the proposed total must come from the existing directly observed production T0 total candidate pool
- the arithmetic value is only a computed validation total, not OCR evidence
- exactly one distinct observed total candidate must equal selected members plus selected bonus
- the total pool must be present and not truncated
- the current selected total must differ from the unique observed matching total
- no member or bonus value may be replaced

## Summary

- command: `node scripts/ocr-test-images.mjs --ipad-strict-total-selection-parity`
- output directory: `tmp/ipad-strict-total-selection-parity`
- compared stage/sides: 108
- runner eligible: 4
- browser-equivalent eligible: 4
- runner wouldApply: 4
- browser-equivalent wouldApply: 4
- exact parity: 108 / 108
- accepted-case TP / FP: 4 / 0
- final OCR output changed: no

## Production Baseline Preserved

| metric | value |
| --- | ---: |
| iPad fixtures | 18 / 18 |
| stage/side PASS | 40 / 108 |
| production Tier C applications | 24 |
| production Tier C TP | 24 |
| production Tier C FP | 0 |

## Parity Metrics

| metric | count |
| --- | ---: |
| eligibility disagreements | 0 |
| wouldApply disagreements | 0 |
| computed-total disagreements | 0 |
| matching-candidate disagreements | 0 |
| proposed-total disagreements | 0 |
| changed-field disagreements | 0 |
| block-reason disagreements | 0 |
| completeness/truncation disagreements | 0 |
| provenance disagreements | 0 |
| missing evidence | 0 |
| safety-relevant mismatches | 0 |

## Accepted Four-Case Audit

| image | stage | side | current members | bonus | current total | observed/proposed total | result |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| IMG_0264.png | 2 | enemy | 33386 / 91957 / 74459 | 0 | 7199802 | 199802 | TP |
| IMG_0278.png | 1 | enemy | 310198 / 348665 / 180900 | 69733 | 909 | 909496 | TP |
| IMG_0300.png | 2 | enemy | 9229 / 84982 / 54708 | 0 | 7148919 | 148919 | TP |
| IMG_0326.png | 2 | enemy | 76798 / 23347 / 11952 | 0 | 112 | 112097 | TP |

Each accepted case has runner wouldApply = yes and browser-equivalent wouldApply = yes with identical current values, computed validation total, observed matching total candidate, proposed total, block state, and provenance summary.

## S2/S4 False-Positive Negative Control

| image | stage | side | S3 wouldApply | S3 block reasons | pass |
| --- | ---: | --- | --- | --- | --- |
| IMG_0792.png | 3 | self | no | truncated-total-candidate-pool; missing-observed-total-for-current-fields | yes |

The known S2/S4 full-tuple false positive remains rejected by S3 without any fixture-specific logic.

## Non-iPad Guards

| mode | eligible | wouldApply | block reasons | pass |
| --- | --- | --- | --- | --- |
| smartphone | no | no | non-ipad-mode:smartphone; ipad-layout-not-detected; unsupported-ipad-layout | yes |
| current-pc | no | no | non-ipad-mode:current-pc; ipad-layout-not-detected; unsupported-ipad-layout | yes |
| desktop | no | no | non-ipad-mode:desktop; ipad-layout-not-detected; unsupported-ipad-layout | yes |
| legacy-desktop | no | no | non-ipad-mode:legacy-desktop; ipad-layout-not-detected; unsupported-ipad-layout | yes |
| unknown | no | no | non-ipad-mode:unknown; ipad-layout-not-detected; unsupported-ipad-layout | yes |
| empty | no | no | non-ipad-mode:unknown; ipad-layout-not-detected; unsupported-ipad-layout | yes |
| ipad-landscape | no | no | unsupported-ipad-orientation:landscape; unsupported-ipad-layout | yes |

## Evidence Boundary

- runner flow uses bounded iPad candidate pools and current-primary selections from the existing diagnostic collector
- browser-equivalent flow uses cloned browser-shaped candidate pools, current selections, candidate completeness, truncation, and provenance
- actual real-browser production verification is still pending
- generated parity artifacts are written under `tmp/ipad-strict-total-selection-parity/` and are not committed

## Recommendation

S3 strict total-only selector is ready for production-readiness review after real-browser verification. Do not productionize from browser-equivalent parity alone.

