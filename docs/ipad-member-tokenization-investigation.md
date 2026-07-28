# iPad Member Tokenization Investigation

Commit under analysis: `be21a8d` (`Investigate iPad member2 left-edge OCR`)

This is a diagnostic-only browser-native investigation. It does not change production OCR, preprocessing, ROI geometry, candidate ranking, Tier C, expected fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Production Baseline

The browser production baseline was confirmed before the tokenization run:

| Metric | Result |
| --- | ---: |
| iPad fixtures processed | 18 / 18 |
| Stage/side PASS | 25 / 108 |
| Tier C applications | 9 |
| Tier C TP / FP | 9 / 0 |

The production member candidate coverage remains:

| Slot | Exact candidate presence |
| --- | ---: |
| member1 | 73 / 108 |
| member2 | 42 / 108 |
| member3 | 69 / 108 |
| all members | 184 / 324 |

Stage3 is still the weakest area:

| Stage | Exact member candidate presence |
| --- | ---: |
| Stage1 | 92 / 108 |
| Stage2 | 91 / 108 |
| Stage3 | 1 / 108 |
| Stage3 member2 | 0 / 36 |

## Command

```sh
node scripts/ipad-member-tokenization-investigation.mjs --runs 2
```

Artifacts:

```text
tmp/ipad-member-tokenization-investigation/
```

The script uses the real browser OCR path through `?ipadArithmeticDebug=1`. Expected fixtures are used only after token generation for scoring.

## Tokenizer Rules

Allowed diagnostic transformations:

- extract literal digit runs already present in raw OCR text
- reconstruct values separated by validated thousands separators, such as `123,456` or `123.456`
- keep multiple independent OCR numeric runs separate
- strip surrounding non-digit OCR noise for reporting

Forbidden transformations:

- digit substitution
- missing digit insertion
- internal digit deletion
- arithmetic-derived member values
- expected-length slicing
- expected-value matching
- cross-side inference
- blind split of a continuous 12/13/14 digit run

## Diagnostic Tiers

| Tier | Meaning | Production implication |
| --- | --- | --- |
| T1 | literal standalone digit run omitted by the current parser | unsafe as-is; creates a small-number FP |
| T2 | grouped number reconstructed only from validated comma/period thousands separators | promising |
| T3 | whitespace-separated groups with explicit OCR boundaries | no extra safe gain over T2 in this run |
| T4 | continuous long run without independent structural boundary | blocked; not admitted as a candidate |

`production+T2-only` was added as a diagnostic split because cumulative `T1+T2` includes the unsafe T1 small-token behavior.

## Candidate Coverage

| Expansion | Exact member coverage | New expected fields | Wrong new candidates | Noise fields | Stage3 member2 gain |
| --- | ---: | ---: | ---: | ---: | ---: |
| production | 184 / 324 (56.8%) | 0 | 0 | 0 | 0 |
| production + T1 | 184 / 324 (56.8%) | 0 | 115 | 71 | 0 |
| production + T2 only | 213 / 324 (65.7%) | 29 | 0 | 0 | 0 |
| production + T1 + T2 | 213 / 324 (65.7%) | 29 | 115 | 71 | 0 |
| production + T1 + T2 + T3 | 213 / 324 (65.7%) | 29 | 165 | 76 | 0 |
| production + T1 + T2 + T3 + T4 | 213 / 324 (65.7%) | 29 | 165 | 76 | 0 |

T2-only is the useful boundary: it exposes 28 member2 fields and 1 member3 field without adding wrong member candidates.

## Tier C Expansion

| Expansion | wouldApply | TP | FP | Existing PASS lost | Ambiguity-producing noise | Wrong unique proposal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| production | 9 | 0 | 0 | 0 | 0 | 0 |
| production + T1 | 10 | 0 | 1 | 0 | 0 | 1 |
| production + T2 only | 24 | 15 | 0 | 0 | 0 | 0 |
| production + T1 + T2 | 25 | 15 | 1 | 0 | 0 | 1 |
| production + T1 + T2 + T3 | 25 | 15 | 1 | 0 | 0 | 1 |
| production + T1 + T2 + T3 + T4 | 25 | 15 | 1 | 0 | 0 | 1 |

The T1 false positive is `IMG_0802.png` Stage3 self. Small literal tokens form a unique arithmetic tuple `1 / 1 / 6 + 0 = 8`, which is exact arithmetic but visually wrong. This makes broad literal digit-run extraction unsafe.

T2-only has:

- 15 Tier C TP
- 0 FP
- 0 existing PASS losses
- 0 ambiguity-producing noise
- 0 wrong unique proposals

The 15 T2-only gains are Stage1/Stage2 only:

| Position | TP |
| --- | ---: |
| Stage1 self | 4 |
| Stage1 enemy | 2 |
| Stage2 self | 9 |
| Stage2 enemy | 0 |
| Stage3 self | 0 |
| Stage3 enemy | 0 |

## Member2 Taxonomy

For member2 fields where production lacks the expected candidate:

| Category | Count | Meaning |
| --- | ---: | --- |
| B | 28 | exact grouped digits exist with safe separator structure |
| E | 31 | raw OCR has numeric evidence, but not exact digits; likely substitution or contamination |
| F | 4 | useful fragments exist, but one or more digits are missing |
| H | 3 | no useful numeric evidence |

Total: 66 member2 recognition failures.

The Category B cases are the core parser/tokenization opportunity. They are mostly Stage1/Stage2 member2 values that appear as period/comma-grouped numbers in raw OCR but are not represented as clean production candidates.

## Stage3 Member2

Stage3 member2 remains unresolved by parser/tokenization:

| Metric | Result |
| --- | ---: |
| fields | 36 |
| production exact candidate presence | 0 / 36 |
| exact literal digits anywhere in raw OCR | 0 / 36 |
| safe tokenization can expose expected value | 0 / 36 |
| only ambiguous repair/fragments could help | 27 / 36 |
| no useful path from raw text | 9 / 36 |

Dominant Stage3 member2 root cause:

- raw OCR digits are wrong, missing, or contaminated before parsing
- expected values do not appear literally in browser raw OCR
- safe separator parsing provides no Stage3 member2 gain
- ambiguous fragment/repair logic would be required, which remains out of scope

This points away from parser productionization for Stage3 member2 and toward OCR-engine/configuration or crop-quality work for Stage3 specifically.

## Stability

Two fresh browser contexts were compared:

| Stability check | Result |
| --- | ---: |
| raw evidence fields stable | 324 / 324 |
| diagnostic candidate fields stable | 324 / 324 |
| tier classification stable | 324 / 324 |
| Tier C simulation variance rows | 0 |
| raw variance fields | 0 |
| token variance fields | 0 |

## Recommendation

Recommended next step: **Production review for safe grouped-number parsing**.

Specifically review a narrow T2-only parser change:

- parse only validated comma/period thousands separators
- do not add general literal digit-run extraction
- do not add whitespace joins unless separately proven
- do not add continuous-run segmentation
- continue to require Tier C exact arithmetic and uniqueness before output changes

Why this is worth a follow-up:

- T2-only produces 29 additional exact member candidates
- T2-only yields 15 additional Tier C TP
- T2-only has 0 FP in this diagnostic run
- browser evidence is stable across two fresh contexts

Why this does not solve Stage3 member2:

- Stage3 member2 gains remain 0
- expected values are not literally present in raw OCR
- remaining Stage3 issues are recognition/crop quality, not parser omission

Production remains unchanged.
