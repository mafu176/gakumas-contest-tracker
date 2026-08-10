# iPad Strict Member2 Selection Parity

Status: parity-proven and production-enabled as `ipad-strict-member2-selection`.

This report extracts the strict M3 member2 selector into shared runner/browser-equivalent evidence and evaluator helpers. Production uses the same shared helper and only changes member2 when the exact strict guard passes. It does not change candidate generation, ROI, preprocessing, Tier C, strict-total, smartphone, current-PC, or legacy desktop OCR.

## M3 Semantics

- device mode must be positively identified as supported iPad portrait
- member1, member3, bonus, and total are retained unchanged
- unchanged member1/member3/bonus/total must have strong provenance; bonus 0 may use schema-default zero semantics
- member2 may come only from existing observed production candidates
- approved member2 provenance is limited to production profiles, including plain observed production numeric candidates and `ipad-grouped-number-token`
- member2 candidate pool must be complete and untruncated
- exactly one distinct observed member2 candidate must satisfy `member1 + member2 + member3 + bonus === total`
- arithmetic is only a comparison value; it is never represented as OCR evidence
- proposal changes member2 only

## Summary

- command: `node scripts/ocr-test-images.mjs --ipad-strict-member2-selection-parity`
- output directory: `tmp/ipad-strict-member2-selection-parity`
- compared stage/sides: 108
- runner eligible: 8
- browser-equivalent eligible: 8
- runner wouldApply: 8
- browser-equivalent wouldApply: 8
- exact parity: 108 / 108
- accepted-case TP / FP: 8 / 0
- final OCR output changed: yes
- real browser verified: yes

## Production Baseline Preserved

| metric | value |
| --- | ---: |
| iPad fixtures | 18 / 18 |
| stage/side PASS | 52 / 108 |
| stage PASS | 17 / 54 |
| image PASS | 0 / 18 |
| production applications | 36 |
| production TP / FP | 36 / 0 |
| Tier C TP / FP | 24 / 0 |
| strict-total TP / FP | 4 / 0 |
| strict-member2 TP / FP | 8 / 0 |

## Parity Metrics

| metric | count |
| --- | ---: |
| eligibility disagreements | 0 |
| wouldApply disagreements | 0 |
| arithmetic-value disagreements | 0 |
| matching-candidate disagreements | 0 |
| proposed-member2 disagreements | 0 |
| changed-field disagreements | 0 |
| block-reason disagreements | 0 |
| completeness/truncation disagreements | 0 |
| provenance disagreements | 0 |
| missing evidence | 0 |
| safety-relevant mismatches | 0 |

## Accepted Eight-Case Audit

| image | stage | side | current member2 | proposed member2 | total | candidate provenance | result |
| --- | ---: | --- | ---: | ---: | ---: | --- | --- |
| IMG_0278.png | 1 | self | 4333611 | 333611 | 666259 | ipad-grouped-number-token | TP |
| IMG_0283.png | 1 | self | 4 | 94758 | 995223 | baseline-score-preprocess-3x-psm7+invert-normalize-3x-psm7+white-mask-3x-psm7+ipad-grouped-number-token | TP |
| IMG_0332.png | 1 | self | 6157594 | 157594 | 480077 | ipad-grouped-number-token | TP |
| IMG_0497.png | 1 | self | 2762450 | 762450 | 1442568 | ipad-grouped-number-token | TP |
| IMG_0497.png | 2 | enemy | 0 | 420613 | 802184 | ipad-grouped-number-token | TP |
| IMG_0792.png | 1 | self | 6458571 | 458571 | 1273037 | ipad-grouped-number-token | TP |
| IMG_0792.png | 1 | enemy | 0 | 284090 | 1725244 | ipad-grouped-number-token | TP |
| IMG_0796.png | 2 | enemy | 0 | 274726 | 598066 | ipad-grouped-number-token | TP |

Each accepted row has runner wouldApply = yes and browser-equivalent wouldApply = yes with identical current tuple, arithmetic comparison member2, matching observed member2 candidate, proposed member2, changed fields, block state, completeness/truncation state, and provenance.

## Negative Controls

| control | count | pass |
| --- | ---: | --- |
| multiple member2 candidates satisfy equation | 0 | yes |
| candidate pool incomplete or truncated | 8 | yes |
| unchanged-field provenance weak | 9 | yes |
| current member2 already correct | 0 | yes |
| matching member2 absent | 100 | yes |

## Focused Guard Tests

| case | eligible | wouldApply | expected reason | block reasons | pass |
| --- | --- | --- | --- | --- | --- |
| single-observed-member2-match | yes | yes | wouldApply |  | yes |
| member2-candidate-absent | no | no | missing-observed-member2-candidates | missing-observed-member2-candidates; member2-pool-incomplete-or-truncated; no-observed-member2-candidate-makes-equation | yes |
| member2-pool-truncated | no | no | member2-pool-incomplete-or-truncated | member2-pool-incomplete-or-truncated | yes |
| member2-provenance-not-approved | no | no | member2-candidate-provenance-not-approved | member2-candidate-provenance-not-approved | yes |
| current-member2-already-identical | no | no | already-identical | no-observed-member2-candidate-makes-equation; already-identical | yes |
| unchanged-member1-provenance-missing | no | no | unchanged-field-lacks-strong-provenance:member1 | unchanged-field-lacks-strong-provenance:member1 | yes |
| unchanged-total-provenance-missing | no | no | unchanged-field-lacks-strong-provenance:total | unchanged-field-lacks-strong-provenance:total | yes |
| unsupported-device-mode | no | no | non-ipad-mode:smartphone | non-ipad-mode:smartphone | yes |
| unsupported-landscape-layout | no | no | unsupported-ipad-orientation:landscape | unsupported-ipad-orientation:landscape; unsupported-ipad-layout | yes |

## Existing Recovery Overlap

| recovery | overlap rows |
| --- | ---: |
| Tier C | 0 |
| strict-total | 0 |

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

## Production Impact

- stage/side PASS after strict M3 member2 selection: 44 / 108 -> 52 / 108
- production changes are limited to the eight browser-verified member2 rows

## Recommendation

Runner/browser-equivalent parity remains exact for production-enabled strict M3 member2 selection. Keep the production recovery constrained to the shared guards and browser-verified evidence.

Real-browser verification proved the same eight proposals with real UI evidence, no unexpected applications, and stable production output across two browser runs.

