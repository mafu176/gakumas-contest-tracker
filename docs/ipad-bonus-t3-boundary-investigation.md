# iPad Bonus T3 Boundary Investigation

Diagnostic-only browser-native investigation after `b684663`.

No production OCR behavior was changed. No production parser, preprocessing, ROI, Tier C, strict-total, member T2 parser, ranking, fixture, smartphone, current-PC, or legacy desktop behavior was modified.

Artifacts are written under `tmp/ipad-bonus-t3-boundary-investigation/`.

## Production Baseline Gate

Real-browser production verification was rerun for two runs before this diagnostic. The final verification matched the required baseline:

| Metric | Result |
| --- | ---: |
| iPad fixtures | 18 / 18 |
| Stage/side PASS | 44 / 108 |
| Tier C | 24 TP / 0 FP |
| Strict total | 4 TP / 0 FP |
| Combined production | 28 TP / 0 FP |
| Stable application rows | 28 / 28 |

The long browser OCR loop timed out once and completed with `--resume`; the final combined production artifact is stable.

## Command

```bash
node scripts/ipad-bonus-t3-boundary-investigation.mjs --runs 2
```

The diagnostic was also completed with `--resume` after the long browser run timed out. Both completed run summaries are identical for raw OCR text, broad T3 values, tier values, candidate pools, and Tier C proposals.

## Broad T3 Reproduction

The previous broad T3 result was reproduced:

| Metric | Result |
| --- | ---: |
| Expected bonus present | 37 / 108 |
| Newly observed exact expected bonus | 3 |
| Noisy fields | 14 |
| Noise candidates | 17 |
| Candidate pool increase | 20 |
| Existing exact evidence lost | 0 |

The three newly observed exact bonuses are:

| Image | Stage | Side | Expected bonus | Boundary shape | Side becomes PASS |
| --- | ---: | --- | ---: | --- | --- |
| IMG_0296.png | 2 | enemy | 84714 | whitespace-separated run | yes |
| IMG_0322.png | 1 | self | 54774 | whitespace-separated run | no |
| IMG_0326.png | 1 | self | 50922 | whitespace-separated run | no |

Only `IMG_0296.png` S2 enemy is a bonus-only addressable stage/side. The other two still fail due to non-bonus evidence.

## Missing 18 Taxonomy

The 18 missing nonzero bonus fields classify as:

| Category | Count |
| --- | ---: |
| B. Exact bonus appears as numeric run separated by whitespace | 3 |
| F. Exact bonus embedded in continuous numeric run with no safe boundary | 2 |
| H. OCR is missing digit(s) | 4 |
| J. No useful exact digit evidence | 9 |

No missing case was classified as an independent OCR numeric token, punctuation-separated exact bonus, separate-line exact bonus, deterministic non-digit boundary only, digit substitution, or extra-digit exact case.

## Locked T3 Tiers

The tier rules were defined before expected-value scoring:

| Tier | Rule |
| --- | --- |
| T3-A | Raw OCR line/token is exactly optional plus plus 5-6 digits |
| T3-B | 5-6 digit numeric run separated by explicit whitespace or line break |
| T3-C | 5-6 digit run has explicit non-alphanumeric token boundaries on both sides |
| T3-D | T3-C plus numeric-only line and a locked `>=2` character horizontal whitespace gap |

Disallowed in every tier:

- arbitrary substring extraction
- splitting continuous numeric runs by expected length
- leading/trailing digit dropping
- digit substitution
- arithmetic-derived bonus values

## Tier Results

| Tier | Newly observed exact | Noise fields | Noise candidates | Ambiguity fields | Candidate pool increase |
| --- | ---: | ---: | ---: | ---: | ---: |
| T3-A | 0 | 0 | 0 | 0 | 0 |
| T3-B | 3 | 9 | 10 | 12 | 13 |
| T3-C | 2 | 4 | 4 | 8 | 6 |
| T3-D | 0 | 0 | 0 | 0 | 0 |

T3-B reduces broad T3 noise from 14 to 9 fields but still only creates one additional stage/side TP. T3-C reduces noise to 4 fields but creates no stage/side TP.

## Breakdown

Exact gains by tier:

| Group | T3-A | T3-B | T3-C | T3-D |
| --- | ---: | ---: | ---: | ---: |
| Stage1 | 0 | 2 | 2 | 0 |
| Stage2 | 0 | 1 | 0 | 0 |
| Stage3 | 0 | 0 | 0 | 0 |
| Self | 0 | 2 | 2 | 0 |
| Enemy | 0 | 1 | 0 | 0 |
| ipad-01 | 0 | 3 | 2 | 0 |
| ipad-02 | 0 | 0 | 0 | 0 |

Noise fields by tier:

| Group | T3-A | T3-B | T3-C | T3-D |
| --- | ---: | ---: | ---: | ---: |
| Stage1 | 0 | 7 | 4 | 0 |
| Stage2 | 0 | 2 | 0 | 0 |
| Stage3 | 0 | 0 | 0 | 0 |
| Self | 0 | 7 | 2 | 0 |
| Enemy | 0 | 2 | 2 | 0 |
| ipad-01 | 0 | 7 | 3 | 0 |
| ipad-02 | 0 | 2 | 1 | 0 |

No tier produces Stage3 exact bonus gains.

## Tier C Simulation

Candidate-pool expansion was simulated diagnostics-only with:

production bonus candidates + diagnostic T3 tier + production member/T2 + production Tier C + production strict-total.

Ranking was unchanged.

| Tier | Tier C TP / FP | Additional TP beyond current 28 | Existing PASS lost | Multiple-valid increase | Final stage/side PASS |
| --- | ---: | ---: | ---: | ---: | ---: |
| T3-A | 24 / 0 | 0 | 0 | 0 | 44 / 108 |
| T3-B | 24 / 0 | 1 | 0 | 0 | 45 / 108 |
| T3-C | 24 / 0 | 0 | 0 | 0 | 44 / 108 |
| T3-D | 24 / 0 | 0 | 0 | 0 | 44 / 108 |

Strict-total interactions remain the existing 4. No tier creates a wrong unique arithmetic proposal in this diagnostic.

## Previous 14 Noise Fields

Broad T3 emitted noise in 14 fields. Narrow tiers reduce but do not eliminate it:

| Tier | Remaining noisy fields |
| --- | ---: |
| T3-A | 0 |
| T3-B | 9 |
| T3-C | 4 |
| T3-D | 0 |

Most T3-B noise is a 6-digit value formed by a neighboring digit attached to the bonus run, such as `482695`, `697335`, `547747`, `260947`, `250522`, `450022`, `419277`, `475157`, and `667494`. T3-C blocks some but not all of these because the OCR text still provides token-looking boundaries.

The previous broad noise fields did not create an FP in the diagnostic simulation, but they are too noisy for production parser expansion.

## Decision

No narrow deterministic T3 rule is production-review-ready.

Reasons:

- The best stage/side gain is only 1.
- T3-B still has 9 noisy fields and 12 ambiguity fields.
- T3-C is cleaner but yields no additional stage/side TP.
- T3-D is safe but yields no exact gains.
- The 18 missing nonzero bonuses are mostly missing-digits or no-useful-evidence cases, not safe boundary/tokenization misses.
- No tier improves Stage3 bonus evidence.

This confirms broad T3 is too noisy and iPad bonus parser/tokenization has reached diminishing returns for the current 18-fixture dataset.

## Recommended Next Step

Move away from bonus OCR and perform a fresh global leverage review of the remaining 64 iPad stage/sides. Bonus work should resume only if new browser-native evidence appears, especially a generalized capture source that produces exact Stage3 bonus values without noisy attached digits.

