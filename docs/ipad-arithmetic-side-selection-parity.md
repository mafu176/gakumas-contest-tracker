# iPad Arithmetic Side Selection Parity

## Summary

- command: `node scripts/ocr-test-images.mjs --ipad-arithmetic-side-selection-parity`
- output directory: `tmp/ipad-arithmetic-side-selection-parity`
- tier: `tier-c`
- compared stage/sides: 108
- runner eligible: 11
- browser-equivalent eligible: 11
- runner wouldApply: 4
- browser-equivalent wouldApply: 4
- exact proposal parity: 108 / 108
- safety mismatches: 0
- accepted-case TP / FP: 4 / 0

This is browser-equivalent parity only. It does not enable production iPad OCR, change app/UI output, change final stage scores, or claim real browser PASS.

## Shared Helper Boundary

- shared helpers live in `app/lib/ocr.js`
- `buildIpadArithmeticSideSelectionCandidateSets(...)` normalizes observed candidates and Tier C schema-default bonus zero
- `evaluateIpadArithmeticSideSelectionTier(...)` applies device-mode guard, candidate completeness checks, tuple enumeration, uniqueness, and atomic side proposal creation
- `summarizeIpadArithmeticSideSelectionTuple(...)` serializes tuple values and provenance for runner/browser-equivalent comparison
- helpers are pure: they do not read filenames, expected fixtures, filesystem state, or mutable global state

## Tier C Semantics

- members and total may use observed OCR numeric candidates only
- bonus may use observed OCR numeric candidates
- bonus may use `schema-default-bonus-zero` only when the observed bonus pool is empty
- no default member values, default total values, digit repair, crown-derived bonus, cross-side evidence, or arithmetic-derived candidates are allowed

## Parity Metrics

| metric | count |
| --- | ---: |
| eligibility disagreements | 0 |
| wouldApply disagreements | 0 |
| selected tuple disagreements | 0 |
| block-reason disagreements | 0 |
| provenance disagreements | 0 |
| candidate-pool disagreements | 0 |
| missing evidence mismatches | 0 |
| safety mismatches | 0 |

## Accepted Five-Case Audit

| image | stage | side | changed fields | tuple | expected result |
| --- | ---: | --- | --- | --- | --- |
| IMG_0264.png | 1 | self | member2, bonus | 169765 / 296381 / 167466 + 59276 = 692888 | TP |
| IMG_0270.png | 1 | enemy | bonus | 41330 / 127105 / 103446 + 0 = 271881 | TP |
| IMG_0497.png | 1 | self | member2, total | 205442 / 762450 / 322186 + 152490 = 1442568 | TP |
| IMG_0792.png | 1 | self | member2 | 690896 / 458571 / 123570 + 0 = 1273037 | TP |

## Non-iPad Guard Audit

| device mode | eligible | wouldApply | block reason | pass |
| --- | --- | --- | --- | --- |
| smartphone | no | no | non-ipad-mode:smartphone | yes |
| current-pc | no | no | non-ipad-mode:current-pc | yes |
| desktop | no | no | non-ipad-mode:desktop | yes |
| legacy-desktop | no | no | non-ipad-mode:legacy-desktop | yes |
| unknown | no | no | non-ipad-mode:unknown | yes |
| empty | no | no | non-ipad-mode:unknown | yes |

## Browser Feasibility

- required evidence is available in the diagnostic browser-equivalent flow: bounded field candidates, provenance, profile identity, current-primary values, candidate caps, raw distinct counts, and truncation flags
- real browser iPad OCR remains unimplemented; this report only proves the selector can consume browser-shaped evidence deterministically
- generated artifacts are written under `tmp/` and are not intended for commit

## Recommendation

Browser-equivalent parity is exact for Tier C; iPad productionization can be considered only after a real browser evidence path exists and is manually verified.
