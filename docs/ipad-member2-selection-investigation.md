# iPad Member2 Selection Investigation

Diagnostic-only browser-native investigation after `bc3e349`.

No production OCR behavior was changed. The investigation used the current real-browser production artifacts and browser-native candidate pools. Expected fixtures were used only after proposals were generated for scoring.

Artifacts are written under `tmp/ipad-member2-selection-investigation/`.

## Command

```bash
node scripts/ipad-member2-selection-investigation.mjs
```

The script reads the two completed browser-native runs from:

- `tmp/ipad-browser-production-verification/`
- `tmp/ipad-bonus-t3-boundary-investigation/`

It does not rerun alternate OCR profiles, add candidates, or apply proposals to production output.

## Production Baseline

The source browser production baseline remains:

| Metric | Result |
| --- | ---: |
| iPad fixtures | 18 / 18 |
| Stage/side PASS | 44 / 108 |
| Stage PASS | 10 / 54 |
| Image PASS | 0 / 18 |
| Production recoveries | 28 |
| Production TP / FP | 28 / 0 |

## Why Member2

The global leverage review found 15 one-field-away failing sides:

| Field | One-field-away sides |
| --- | ---: |
| member2 | 8 |
| bonus | 5 |
| total | 2 |

Member2 is the highest-leverage narrow target because the exact expected candidate is already present in production candidate pools for all 8 one-field-away member2 rows.

## Candidate Semantics

The investigation only considers existing observed member2 candidates. It never creates a value from:

- `total - member1 - member3 - bonus`
- expected fixtures
- near-match or tolerance logic
- digit insertion/deletion
- filename-specific logic

Arithmetic is used only as a validator: an observed candidate may be proposed only if it makes the already-selected side equation exact.

## Strategies

| Strategy | Definition |
| --- | --- |
| M1 | Keep member1/member3/bonus/total unchanged; choose member2 only if exactly one observed member2 candidate makes the equation exact; require complete/untruncated member2 pool. |
| M2 | M1 plus approved production provenance for member2: plain observed production profile or `ipad-grouped-number-token`. |
| M3 | M2 plus strong provenance for unchanged member1/member3/bonus/total; default-zero bonus semantics are preserved. |

All strategies are member2-only. No other field is changed.

## Results

| Strategy | Would apply | TP | FP | Additional stage/side PASS | Existing PASS loss | Member2 exact after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M1 | 8 | 8 | 0 | +8 | 0 | 62 / 108 |
| M2 | 8 | 8 | 0 | +8 | 0 | 62 / 108 |
| M3 | 8 | 8 | 0 | +8 | 0 | 62 / 108 |

M3 is preferred because it is the narrowest strategy and loses no TP compared with M1/M2.

Simulated aggregate metrics for M3:

| Metric | Before | After |
| --- | ---: | ---: |
| Stage/side PASS | 44 / 108 | 52 / 108 |
| Stage PASS | 10 / 54 | 17 / 54 |
| Image PASS | 0 / 18 | 0 / 18 |
| Member2 exact | 54 / 108 | 62 / 108 |

## Selection Failure Taxonomy

Member2 rows where exact member2 is present but not selected classify as:

| Category | Count |
| --- | ---: |
| D. grouped-number candidate loses to plain candidate | 14 |
| H. exact candidate present but not forwarded into the relevant selection layer | 5 |

For the 8 one-field-away TP rows, all proposed candidates are production `ipad-grouped-number-token` candidates. The root cause is therefore mostly selection/plumbing around existing T2 evidence, not OCR recognition.

## One-Field-Away Audit

| Image | Stage | Side | Current member2 | Proposed member2 | Candidate source | Result |
| --- | ---: | --- | ---: | ---: | --- | --- |
| IMG_0278.png | 1 | self | 4333611 | 333611 | `ipad-grouped-number-token` | TP |
| IMG_0283.png | 1 | self | 4 | 94758 | production profiles + `ipad-grouped-number-token` | TP |
| IMG_0332.png | 1 | self | 6157594 | 157594 | `ipad-grouped-number-token` | TP |
| IMG_0497.png | 1 | self | 2762450 | 762450 | `ipad-grouped-number-token` | TP |
| IMG_0497.png | 2 | enemy | 0 | 420613 | `ipad-grouped-number-token` | TP |
| IMG_0792.png | 1 | self | 6458571 | 458571 | `ipad-grouped-number-token` | TP |
| IMG_0792.png | 1 | enemy | 0 | 284090 | `ipad-grouped-number-token` | TP |
| IMG_0796.png | 2 | enemy | 0 | 274726 | `ipad-grouped-number-token` | TP |

Every row keeps member1/member3/bonus/total unchanged and satisfies:

`member1 + proposedMember2 + member3 + bonus = total`

## Negative Controls

The strict strategies block unsafe cases:

| Control | Result |
| --- | --- |
| Multiple member2 candidates satisfy equation | 0 cases |
| Incomplete/truncated member2 pool | 5 blocks |
| Current member2 already correct | no wouldApply |
| Total wrong | blocked unless unchanged total supports exact equation |
| Bonus wrong | blocked unless unchanged bonus supports exact equation |

No existing PASS row is changed.

## Production Overlap

| Overlap | Count |
| --- | ---: |
| Proposed rows | 8 |
| Overlaps Tier C production recovery | 0 |
| Overlaps strict-total production recovery | 0 |
| Uses T2 grouped-number candidate | 8 |

The proposed selector would not double-apply or undo an earlier production recovery in the diagnostic data.

## Run Stability

Two browser-native runs were compared:

| Stability check | Result |
| --- | --- |
| Member2 candidate pools | stable |
| M1 proposals | stable |
| M2 proposals | stable |
| M3 proposals | stable |

## Browser-Equivalent Feasibility

Future parity should share a pure helper that receives:

- current selected side values
- member2 candidate pool
- candidate provenance
- completeness/truncation metadata
- unchanged field provenance
- matching candidate set
- uniqueness result

The helper should return `wouldApply`, block reason, proposed member2, and provenance. Production should remain off until runner/browser-equivalent parity is exact.

## Recommendation

Proceed to runner/browser-equivalent parity for **M3 strict member2 selection**.

This clears the production-readiness threshold for a parity task:

- TP >= 2: yes, 8
- FP = 0: yes
- no existing PASS loss: yes
- direct observed member2 only: yes
- exact arithmetic validation: yes
- no arithmetic-derived member: yes
- stable across two browser-native runs: yes
- complete/untruncated pools for applications: yes
- generalized iPad-only behavior: yes
- no Stage3 or filename logic: yes

Do not productionize directly from this diagnostic. The next step should be shared runner/browser-equivalent parity plumbing for M3.

## Production Unchanged

This investigation did not change:

- member T2 parser
- Tier C
- strict-total
- iPad ROI
- preprocessing
- global candidate ranking
- bonus OCR/parser
- total OCR/parser
- expected fixtures
- smartphone OCR
- current-PC OCR
- legacy desktop OCR

