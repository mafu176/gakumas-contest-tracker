# iPad Strict Member2 Productionization

Status: production-enabled.

The iPad M3 strict member2 selector is now enabled through `ipad-strict-member2-selection`. It reuses the shared evidence builder and evaluator:

- `buildIpadStrictMember2SelectionEvidence(...)`
- `evaluateIpadStrictMember2Selection(...)`
- `applyIpadStrictMember2SelectionRecovery(...)`

No filename-specific or fixture-specific logic was added.

## Recovery Order

The iPad browser OCR production path now runs:

1. normal iPad OCR and candidate collection
2. current primary selection
3. Tier C exactly-one arithmetic recovery
4. strict total-only recovery
5. strict member2 selection recovery
6. final rendered/set OCR output

M3 receives the displayed output after Tier C and strict-total. It rejects any stage/side already changed by an earlier iPad production recovery.

## Guards

M3 applies only when all of these are true:

- supported iPad portrait layout
- member1, member3, bonus, and total stay unchanged
- unchanged member1/member3/bonus/total have strong observed provenance, except schema-default zero bonus
- member2 is directly observed in the existing production member2 candidate pool
- approved member2 provenance is limited to verified production profiles, including `ipad-grouped-number-token`
- member2 pool is complete and untruncated
- exactly one distinct observed member2 candidate satisfies `member1 + member2 + member3 + bonus === total`
- current member2 differs from the unique observed match
- proposal changes only member2
- final assertion is exact

Arithmetic is validation only. It never creates member2 evidence.

## Rollback

Rollback constant:

- `ENABLE_IPAD_STRICT_MEMBER2_SELECTION`

Default: `true`

This disables only M3 without reverting Tier C, strict-total, T2 grouped-number parsing, ROI, preprocessing, or other OCR paths.

## Before / After

| metric | before M3 | after M3 |
| --- | ---: | ---: |
| image PASS | 0 / 18 | 0 / 18 |
| stage PASS | 10 / 54 | 17 / 54 |
| stage/side PASS | 44 / 108 | 52 / 108 |
| production applications | 28 | 36 |
| production TP / FP | 28 / 0 | 36 / 0 |
| Tier C TP / FP | 24 / 0 | 24 / 0 |
| strict-total TP / FP | 4 / 0 | 4 / 0 |
| strict-member2 TP / FP | 0 / 0 | 8 / 0 |

## Application Audit

| image | stage | side | previous member2 | corrected member2 | total | provenance |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| IMG_0278.png | 1 | self | 4333611 | 333611 | 666259 | ipad-grouped-number-token |
| IMG_0283.png | 1 | self | 4 | 94758 | 995223 | baseline-score-preprocess-3x-psm7 + invert-normalize-3x-psm7 + white-mask-3x-psm7 + ipad-grouped-number-token |
| IMG_0332.png | 1 | self | 6157594 | 157594 | 480077 | ipad-grouped-number-token |
| IMG_0497.png | 1 | self | 2762450 | 762450 | 1442568 | ipad-grouped-number-token |
| IMG_0497.png | 2 | enemy | 0 | 420613 | 802184 | ipad-grouped-number-token |
| IMG_0792.png | 1 | self | 6458571 | 458571 | 1273037 | ipad-grouped-number-token |
| IMG_0792.png | 1 | enemy | 0 | 284090 | 1725244 | ipad-grouped-number-token |
| IMG_0796.png | 2 | enemy | 0 | 274726 | 598066 | ipad-grouped-number-token |

## Verification

Runner/browser-equivalent parity:

- compared stage/sides: 108
- exact parity: 108 / 108
- accepted cases: 8
- TP / FP: 8 / 0
- safety-relevant mismatches: 0

Real-browser accepted-case verification:

- accepted-case subset: 6 images / 36 stage-sides
- two fresh runs
- accepted rows found: 8 / 8 per run
- browser wouldApply: 8 / 8 per run
- exact proposal matches: 8 / 8 per run
- TP / FP: 8 / 0 per run
- stable accepted rows: 8 / 8
- UI application audit: PASS

Full production browser verification:

- 18 / 18 fixtures per run
- two runs
- production applications: 36
- production TP / FP: 36 / 0
- Tier C: 24 TP / 0 FP
- strict-total: 4 TP / 0 FP
- strict-member2: 8 TP / 0 FP
- stable application rows: 36 / 36
- stage/side PASS: 52 / 108

## Overlap And Isolation

- Tier C overlap: 0
- strict-total overlap: 0
- no unexpected M3 application
- smartphone controls unchanged
- known smartphone failures unchanged
- current-PC controls unchanged
- legacy desktop control unchanged

The production change does not alter T2 grouped-number parsing, iPad ROI/preprocessing, global candidate ranking, bonus OCR/parser, total OCR/parser, expected fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Limitations

M3 only addresses strict member2 replacement when the corrected value is already observed in a verified production member2 candidate source and the unchanged fields are strongly proven. It does not attempt member1/member3 selection, bonus correction, total correction, OCR capture improvement, near-match repair, missing digit inference, or generic candidate ranking changes.
