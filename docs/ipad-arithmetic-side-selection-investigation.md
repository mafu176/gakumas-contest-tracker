# iPad Arithmetic Side Selection Investigation

## Summary

- command: `node scripts/ocr-test-images.mjs --ipad-arithmetic-side-selection-simulation`
- output directory: `tmp/ipad-arithmetic-side-selection`
- ROI geometry: `ipad-shared-portrait-v2`
- selected safest tier: `tier-c`
- selected tier TP / FP: 5 / 0
- selected tier changed proposals: 5
- selected tier net stage/side gain: 5
- before stage/side accuracy: 12 / 108 (11.1%)
- after selected tier stage/side accuracy: 17 / 108 (15.7%)

This is runner-only and diagnostic-only. It does not enable production iPad OCR, change app/UI output, change ROI geometry, change preprocessing profiles, or touch smartphone/current-PC/legacy desktop behavior.

## Candidate And Zero Semantics

- `observed`: A numeric value parsed from OCR text in the bounded field crop.
- `explicitZero`: An observed OCR numeric candidate whose value is 0. It is kept separate from defaulted zeros in reporting.
- `schemaDefaultBonusZero`: A diagnostic-only bonus value of 0 inserted only for Tier C when the bounded bonus pool has no observed candidates.
- `missingFallback`: No candidate is created for missing member or total fields. Missing fallback is never selectable.

Candidate pools are the existing bounded iPad pools capped at 6 numeric values per field. Values retain raw text, normalized text, profile IDs, source rank, confidence signals, and contribution provenance. Expected fixtures are used only after selection for scoring.

## Tuple Enumeration

- fields: member1, member2, member3, bonus, total
- equation: `member1 + member2 + member3 + bonus === total`
- candidate cap per field: 6
- enumeration safety cap: 10000
- side proposals are atomic: member1, member2, member3, bonus, and total are adopted together or not at all
- no numeric values are derived, repaired, padded, merged, truncated, or inferred

## Tier Definitions

- `tier-a`: Observed non-zero OCR numeric candidates only. No default or zero fallback is permitted.
- `tier-b`: Observed OCR numeric candidates, including explicit observed zero candidates.
- `tier-c`: Observed OCR numeric candidates plus schema-default bonus zero only when the bonus pool is empty. Members and total never use defaults.

## Previous 24-Combination Audit

- stage/sides: 108
- at least one arithmetic-valid combination: 24
- exactly one arithmetic-valid combination: 24
- multiple arithmetic-valid combinations: 0
- no arithmetic-valid combination: 84

The earlier count used observed member and total candidates plus an unconditional diagnostic bonus-zero candidate. This report splits that zero handling across Tier A/B/C so default-zero rows are not treated as observed evidence.

## Tier Results

| tier | eligible | exactly-one proposals | identical | changed | TP | FP | lost pass | net stage/side gain | image pass | stage pass | stage/side pass |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| `tier-a` | 6 | 6 | 2 | 4 | 4 | 0 | 0 | 4 | 0 / 18 (0%) | 2 / 54 (3.7%) | 16 / 108 (14.8%) |
| `tier-b` | 8 | 8 | 4 | 4 | 4 | 0 | 0 | 4 | 0 / 18 (0%) | 2 / 54 (3.7%) | 16 / 108 (14.8%) |
| `tier-c` | 12 | 12 | 7 | 5 | 5 | 0 | 0 | 5 | 0 / 18 (0%) | 2 / 54 (3.7%) | 17 / 108 (15.7%) |

## Field-Level Impact

| tier | field gains | field regressions | member accuracy | bonus accuracy | total accuracy |
| --- | ---: | ---: | --- | --- | --- |
| `tier-a` | 4 | 0 | 147 / 324 (45.4%) | 62 / 108 (57.4%) | 56 / 108 (51.9%) |
| `tier-b` | 4 | 0 | 147 / 324 (45.4%) | 62 / 108 (57.4%) | 56 / 108 (51.9%) |
| `tier-c` | 5 | 0 | 148 / 324 (45.7%) | 62 / 108 (57.4%) | 56 / 108 (51.9%) |

## Cluster Results

| tier | cluster | eligible | changed | TP | FP |
| --- | --- | ---: | ---: | ---: | ---: |
| `tier-a` | ipad-01 | 5 | 3 | 3 | 0 |
| `tier-a` | ipad-02 | 1 | 1 | 1 | 0 |
| `tier-b` | ipad-01 | 7 | 3 | 3 | 0 |
| `tier-b` | ipad-02 | 1 | 1 | 1 | 0 |
| `tier-c` | ipad-01 | 9 | 3 | 3 | 0 |
| `tier-c` | ipad-02 | 3 | 2 | 2 | 0 |

## Block Reasons

| tier | reason | count |
| --- | --- | ---: |
| `tier-a` | `missing-candidate:bonus` | 7 |
| `tier-a` | `no-arithmetic-valid-tuple` | 51 |
| `tier-a` | `missing-candidate:member1,member2,member3` | 26 |
| `tier-a` | `missing-candidate:member2,member3` | 7 |
| `tier-a` | `missing-candidate:member2` | 6 |
| `tier-a` | `missing-candidate:member1,member2,member3,total` | 2 |
| `tier-a` | `missing-candidate:member3` | 1 |
| `tier-a` | `truncated-pool:bonus` | 1 |
| `tier-a` | `missing-candidate:member1,member2` | 1 |
| `tier-b` | `missing-candidate:bonus` | 6 |
| `tier-b` | `no-arithmetic-valid-tuple` | 51 |
| `tier-b` | `missing-candidate:member1,member2,member3` | 27 |
| `tier-b` | `missing-candidate:member2,member3` | 7 |
| `tier-b` | `missing-candidate:member2` | 5 |
| `tier-b` | `missing-candidate:member3` | 1 |
| `tier-b` | `truncated-pool:bonus` | 1 |
| `tier-b` | `missing-candidate:member1,member2` | 2 |
| `tier-c` | `no-arithmetic-valid-tuple` | 53 |
| `tier-c` | `missing-candidate:member1,member2,member3` | 27 |
| `tier-c` | `missing-candidate:member2,member3` | 7 |
| `tier-c` | `missing-candidate:member2` | 5 |
| `tier-c` | `missing-candidate:member3` | 1 |
| `tier-c` | `truncated-pool:bonus` | 1 |
| `tier-c` | `missing-candidate:member1,member2` | 2 |

## Proposal Correctness Categories

| tier | category | count |
| --- | --- | ---: |
| `tier-a` | `all-five-fields-correct` | 6 |
| `tier-b` | `all-five-fields-correct` | 8 |
| `tier-c` | `all-five-fields-correct` | 12 |

## Selected Safest Tier

Selected tier: `tier-c`. The selector prioritizes zero false positives, no lost passing stage/sides, largest true gain, then stricter evidence. A looser tier is not preferred merely because it applies more often.

## Browser Parity Prerequisites

- expose the same bounded iPad candidate pools to the browser-equivalent path
- preserve candidate origin semantics for observed, explicit-zero, and schema-default bonus zero
- share tuple enumeration and block-reason logic instead of duplicating runner-only code
- prove runner/browser-equivalent parity before any production iPad OCR output path is enabled

## Recommendation

Runner/browser-equivalent parity is justified next for the selected tier.

The next useful experiment is browser-equivalent evidence plumbing only if the selected tier has zero FP and meaningful net gain. Otherwise, continue improving iPad OCR evidence capture before attempting selector productionization.

