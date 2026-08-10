# iPad Strict Member2 Real Browser Verification

Status: production-enabled real-browser verification.

The browser automation uploads the real iPad fixtures into the local app with `ipadArithmeticDebug=1`, reads browser-native strict member2-selection diagnostics, and compares them with the runner/browser-equivalent parity artifacts from `tmp/ipad-strict-member2-selection-parity`.

The M3 proposal is applied to visible OCR output and final parsed scores only for the eight previously verified exact cases.

## Coverage

- command: `node scripts/ipad-strict-member2-browser-verification.mjs`
- artifact directory: `tmp/ipad-strict-member2-real-browser-verification`
- browser runs: 2
- images processed per run: 6 / 6
- stage/sides compared per run: 36 / 36
- full fixture coverage: no; accepted-case image subset
- production baseline preserved: not measured by this subset run
- UI application audit: PASS

## M3 Semantics

- iPad portrait layout only
- selected member1, member3, bonus, and total are retained unchanged
- unchanged fields require strong observed provenance, except schema-default zero bonus
- member2 must be directly observed in the production browser-native member2 candidate pool
- approved member2 provenance is limited to existing production candidate profiles and grouped-number tokens
- candidate pool must be complete and untruncated
- exactly one observed member2 candidate must satisfy `member1 + member2 + member3 + bonus === total`
- no near-match, tolerance, missing digit inference, or arithmetic-generated member2

## Run Summary

| run | images | stage/sides | browser wouldApply | accepted found | exact proposal matches | TP | FP | UI applications |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 6 | 36 | 8 | 8 | 8 | 8 | 0 | 8 |
| 2 | 6 | 36 | 8 | 8 | 8 | 8 | 0 | 8 |

## Accepted Eight-Case Audit

| image | stage | side | current members | bonus | total | proposed member2 | provenance | result | UI output |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| IMG_0278.png | 1 | self | 166324 / 4333611 / 166324 | 0 | 666259 | 333611 | ipad-grouped-number-token | TP | mutated |
| IMG_0283.png | 1 | self | 641744 / 4 / 130373 | 128348 | 995223 | 94758 | baseline-score-preprocess-3x-psm7+invert-normalize-3x-psm7+white-mask-3x-psm7+ipad-grouped-number-token | TP | mutated |
| IMG_0332.png | 1 | self | 209636 / 6157594 / 70920 | 41927 | 480077 | 157594 | ipad-grouped-number-token | TP | mutated |
| IMG_0497.png | 1 | self | 205442 / 2762450 / 322186 | 152490 | 1442568 | 762450 | ipad-grouped-number-token | TP | mutated |
| IMG_0497.png | 2 | enemy | 209818 / 0 / 171753 | 0 | 802184 | 420613 | ipad-grouped-number-token | TP | mutated |
| IMG_0792.png | 1 | self | 690896 / 6458571 / 123570 | 0 | 1273037 | 458571 | ipad-grouped-number-token | TP | mutated |
| IMG_0792.png | 1 | enemy | 699672 / 0 / 601548 | 139934 | 1725244 | 284090 | ipad-grouped-number-token | TP | mutated |
| IMG_0796.png | 2 | enemy | 137787 / 0 / 185553 | 0 | 598066 | 274726 | ipad-grouped-number-token | TP | mutated |

All accepted rows have browser wouldApply = true, identical proposal to the runner/browser-equivalent artifact, directly observed member2 evidence, complete/untruncated pools, and production UI application.

## Parity Disagreements

| field | run-1 count |
| --- | ---: |
| currentTuple | 1 |
| member2CandidatePool | 0 |
| candidateProvenance | 0 |
| unchangedFieldProvenance | 1 |
| completeness | 0 |
| truncation | 0 |
| arithmeticValue | 1 |
| matchingCandidates | 0 |
| uniqueMember2 | 0 |
| eligibility | 0 |
| wouldApply | 0 |
| proposedMember2 | 0 |
| blockReason | 1 |
| missingEvidence | 0 |
| safety | 0 |

Safety-relevant mismatches across all runs: 0

## Negative Controls

| control | runner count | browser rejected count | result |
| --- | ---: | ---: | --- |
| multiple member2 candidates satisfy equation | 0 | 0 | PASS |
| candidate pool incomplete or truncated | 8 | 8 | PASS |
| unchanged-field provenance weak | 9 | 9 | PASS |
| current member2 already correct | 0 | 0 | PASS |
| matching member2 absent | 100 | 100 | PASS |

Unsupported non-iPad/device guard remains covered by the runner/browser-equivalent parity artifact. This real-browser pass covered the 18 supported iPad fixtures.

## Recovery Overlap

- Tier C overlap in parity artifact: 0
- strict-total overlap in parity artifact: 0
- browser production overlap rows: 16
- strict-member2 production rows: 16

No M3 proposal targets a side already recovered by Tier C or strict-total production recovery. The only production overlap rows are the M3 production applications themselves.

## Two-Run Stability

- accepted rows: 8
- stable accepted rows: 8
- unstable accepted rows: 0

## Production Baseline

Per full production run:

- stage/side PASS: 52 / 108
- production applications: 36
- production TP / FP: 36 / 0
- Tier C applications: 24
- strict-total applications: 4
- strict-member2 applications: 8

The strict-member2 production path does not change production Tier C, strict-total, T2 grouped-number parsing, iPad ROI/preprocessing, global candidate ranking, bonus/total OCR, expected fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Recommendation

Production strict-member2 behavior is verified for the eight accepted rows with no extra applications.
