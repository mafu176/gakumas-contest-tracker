# iPad Strict Total Selection Investigation

Status: diagnostic-only, browser-native.

This investigation does not change production OCR output, total candidate
generation, ROI, preprocessing, member T2 parsing, Tier C semantics, ranking,
expected fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Baseline

The production baseline was confirmed before the selection audit:

| Metric | Result |
| --- | ---: |
| iPad fixtures | 18 / 18 |
| Stage/side PASS | 40 / 108 |
| Production Tier C applications | 24 |
| Tier C TP / FP | 24 / 0 |
| Stable applications across browser runs | 24 / 24 |

The diagnostic was run twice against the real browser OCR path with
`?ipadArithmeticDebug=1`. Candidate pools and strategy decisions were stable
across both runs.

Command:

```bash
node scripts/ipad-total-selection-investigation.mjs --runs 2
```

Artifacts:

```text
tmp/ipad-total-selection-investigation/
```

Top-level artifacts:

- `production-baseline.json`
- `candidate-audit.json`
- `failure-classification.json`
- `strategy-results.json`
- `addressable-rows.json`
- `tier-c-block-root-causes.json`
- `would-apply-proposals.json`
- `run-stability.json`
- `recommendation.json`

## Candidate Semantics

The script uses only existing production browser candidate pools:

- member candidates from the current iPad production member pools
- bonus candidates from the current production bonus pool, with schema-default
  zero only where Tier C already permits it
- total candidates from the current production total pool

No new total OCR profiles, parser variants, calculated totals, near values, or
fixture-derived values are inserted into candidate pools.

Each total candidate audit row records:

- numeric value
- raw OCR text
- profile provenance
- source rank and candidate order
- OCR confidence
- duplicate support count
- crop-quality metadata
- border-touch metadata where present
- normalization path
- current-primary selection state

## Failure Classification

All 108 stage/sides were classified after production output:

| Classification | Count |
| --- | ---: |
| A. Exact total present and all other tuple fields available | 24 |
| B. Exact total present but member evidence incomplete | 1 |
| C. Exact total present but bonus evidence incomplete | 3 |
| D. Exact total present but multiple arithmetic-valid tuples exist | 0 |
| E. Exact total absent | 26 |
| F. Candidate pool incomplete/truncated | 14 |
| G. Current output already correct | 40 |
| H. Other | 0 |

The exact-total-present addressable row count is 24. This includes the 4
previously identified total-only rows where selected members and bonus are
already correct but the chosen total is wrong.

## Strategies

| Strategy | Definition |
| --- | --- |
| S0 | Current production output |
| S1 | Existing Tier C unchanged; baseline reference only |
| S2 | Arithmetic-filtered full tuple from existing production candidates |
| S3 | Strict total-only replacement, keeping selected members and bonus unchanged |
| S4 | Provenance-weighted arithmetic tuple; provenance never breaks ties between different numeric tuples |

S2 and S4 intentionally test a broader full-tuple path. They are diagnostic only
and are not safe because they admit one false positive.

## Results

| Strategy | wouldApply | TP | FP | Additional TP beyond production | Existing PASS loss | Stage/side PASS after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| S0 | 0 | 0 | 0 | 0 | 0 | 40 / 108 |
| S1 | 24 | 24 | 0 | 0 | 0 | 40 / 108 |
| S2 | 25 | 24 | 1 | 24 | 0 | 64 / 108 |
| S3 | 4 | 4 | 0 | 4 | 0 | 44 / 108 |
| S4 | 25 | 24 | 1 | 24 | 0 | 64 / 108 |

Run stability:

| Compared runs | Stable | Mismatches |
| ---: | --- | ---: |
| 2 | yes | 0 |

## S3 Total-Only Proposals

S3 changes only the total field. The selected members and bonus remain unchanged,
and the replacement total must already be directly observed in the production
total candidate pool.

| Image | Stage | Side | Current total | Proposed total | Equation | Result |
| --- | ---: | --- | ---: | ---: | --- | --- |
| IMG_0264.png | 2 | enemy | 7199802 | 199802 | 33386 + 91957 + 74459 + 0 = 199802 | TP |
| IMG_0278.png | 1 | enemy | 909 | 909496 | 310198 + 348665 + 180900 + 69733 = 909496 | TP |
| IMG_0300.png | 2 | enemy | 7148919 | 148919 | 9229 + 84982 + 54708 + 0 = 148919 | TP |
| IMG_0326.png | 2 | enemy | 112 | 112097 | 76798 + 23347 + 11952 + 0 = 112097 | TP |

The observed total candidates are direct OCR candidates from the production T0
total pool. No total is calculated and inserted.

## Unsafe S2/S4 Shape

S2/S4 recover many rows in evaluation, but both produce one false positive:

| Image | Stage | Side | Proposed tuple | Reason unsafe |
| --- | ---: | --- | --- | --- |
| IMG_0792.png | 3 | self | 4 / 2 / 1, bonus 0, total 7 | Numeric noise creates a unique arithmetic tuple even though every field is wrong |

This demonstrates why a full-tuple reselection rule is not ready. Arithmetic
validity alone is not enough when tiny numeric noise can satisfy an exact
equation.

## Why Tier C Did Not Recover The Four S3 Rows

The four S3 rows are not OCR-capture failures. The exact total already exists in
production T0 total evidence. The blocker is selection/plumbing:

| Image | Stage | Side | Tier C block | Root cause |
| --- | ---: | --- | --- | --- |
| IMG_0264.png | 2 | enemy | no-arithmetic-valid-tuple | Production final members/bonus are exact, but Tier C does not run a total-only final-output replacement path |
| IMG_0278.png | 1 | enemy | truncated-pool:bonus | Bonus pool truncation blocks full Tier C, but final selected bonus is exact |
| IMG_0300.png | 2 | enemy | truncated-pool:bonus | Bonus pool truncation blocks full Tier C, but final selected bonus is exact |
| IMG_0326.png | 2 | enemy | no-arithmetic-valid-tuple | Production final members/bonus are exact, but Tier C does not run a total-only final-output replacement path |

This looks like a narrow evidence-plumbing/selection gap rather than a need for
new OCR capture.

## Recommendation

Production review is justified for S3 only, not S2/S4.

S3 meets the review criteria:

- additional TP: 4
- FP: 0
- existing PASS loss: 0
- every selected total is directly OCR-observed
- no missing total is calculated
- selected members and bonus are unchanged
- decisions are stable across two browser runs
- iPad-only and narrower than adding noisy total OCR profiles

Next step:

Add shared runner/browser-equivalent parity plumbing for the strict S3
total-only selector using the same browser-native evidence. Keep it diagnostic
until parity is exact and the real browser output path is verified.

If parity exposes mismatches, fix the shared candidate flow rather than creating
a broader selector.
