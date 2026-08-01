# iPad Total Candidate Capture Investigation

Status: diagnostic-only, browser-native.

Stable production baseline before this investigation:

| Metric | Result |
| --- | ---: |
| Images processed | 18 / 18 |
| Stage/side PASS | 40 / 108 |
| Tier C applications | 24 |
| Tier C TP / FP | 24 / 0 |
| Stable application rows | 24 / 24 |

This investigation does not change production OCR output, Tier C, ROI geometry, ranking,
smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Command

```bash
node scripts/ipad-total-candidate-capture-investigation.mjs --runs 2 --profiles production-white-mask-3x-psm7,white-mask-3x-psm7-digits-only
```

Artifacts are written to:

```text
tmp/ipad-total-candidate-capture/
```

Top-level artifacts:

- `production-baseline.json`
- `total-field-audit.json`
- `failure-taxonomy.json`
- `parser-opportunities.json`
- `profile-results.json`
- `candidate-noise.json`
- `addressable-sides.json`
- `tier-c-simulation.json`
- `run-stability.json`
- `recommendation.json`

## Diagnostic Scope

The script uses the real browser iPad OCR path with `?ipadArithmeticDebug=1` and
audits all 108 total fields from the 18 manually verified iPad fixtures.

The diagnostic compares:

- T0: current production total candidates from browser diagnostics.
- T1: safe standalone numeric tokens omitted by the current parser.
- T2-total: strict comma/period grouped-number parsing for total text.
- T3: independent numeric run extraction with explicit non-alphanumeric boundaries.
- Low-cost browser-native OCR profile checks:
  - production-like white-mask 3x PSM7
  - white-mask 3x PSM7 with digits-only whitelist

A broader five-profile run was attempted first and completed run 1, but two full
runs were too expensive for routine diagnostics. The stable two-run result uses
the low-cost subset above.

## Coverage

| Source | Expected total present | Newly observed expected totals | Noise fields | Notes |
| --- | ---: | ---: | ---: | --- |
| T0 production candidates | 68 / 108 | 0 | 0 | Current browser production evidence |
| T1 standalone tokens | 0 / 108 | 0 | 2 | No useful total recovery signal |
| T2 grouped parser | 38 / 108 | 0 | 0 | Mostly duplicates existing grouped evidence |
| T3 numeric run parser | 56 / 108 | 2 | 35 | Too noisy for production consideration |
| production-like white-mask 3x PSM7 | 42 / 108 | 3 | 24 | Adds evidence but also broad noise |
| white-mask 3x PSM7 digits-only | 42 / 108 | 3 | 37 | Adds the same gains with more noise |

Run stability:

| Compared runs | Stable | Mismatches |
| ---: | --- | ---: |
| 2 | yes | 0 |

## Failure Taxonomy

Among the 40 fields where the exact expected total is not in T0 production
candidate evidence:

| Category | Count |
| --- | ---: |
| exact total absent | 37 |
| exact total recovered by profile OCR | 3 |

The parser-only variants do not expose a low-risk production opportunity:

- T1 adds no exact expected totals.
- T2 adds no new exact expected totals beyond current production evidence.
- T3 finds 2 new exact totals but also introduces noise in 35 fields.

## Addressable Sides

Five failing stage/sides have exact selected members and exact bonus, and the
only displayed-result problem is total selection. This is a diagnostic upper
bound, not a production proposal:

| Image | Stage | Side | Current total | Expected total | Exact total source |
| --- | ---: | --- | ---: | ---: | --- |
| IMG_0264.png | 2 | enemy | 7199802 | 199802 | T0 already contains exact total |
| IMG_0278.png | 1 | enemy | 909 | 909496 | T0 already contains exact total |
| IMG_0300.png | 2 | enemy | 7148919 | 148919 | T0 already contains exact total |
| IMG_0326.png | 2 | self | 515 | 515373 | profile OCR only |
| IMG_0326.png | 2 | enemy | 112 | 112097 | T0 already contains exact total |

Four of the five are candidate-selection problems rather than capture problems:
the exact total is already present in T0 but loses to a truncated or polluted
selected value. Only `IMG_0326.png` Stage2 self gains exact total evidence from
the extra profile OCR.

## Tier C Impact Estimate

The diagnostic-only total evidence audit estimates:

| Metric | Count |
| --- | ---: |
| Potential total-only TP | 5 |
| Potential FP | 0 |
| Blocked stage/sides | 63 |

This is intentionally conservative: a row is counted only when final members and
bonus are already exact, final total is wrong, and an exact expected total exists
in T0 or the diagnostic total evidence.

This is not a recovery simulation and does not alter final OCR output.

## Recommendation

Do not productionize a new total-capture profile yet.

Reasons:

- Parser-only work is not enough: T1 and T2 add 0 new exact expected totals.
- T3 has useful signal but high noise.
- The profile variants add only 3 exact expected totals and introduce noise in
  24 to 37 fields.
- Most addressable total-only rows already have exact T0 evidence, so the next
  useful experiment should focus on strict total candidate selection, not OCR
  capture.

Recommended next experiment:

Add a runner/browser-equivalent diagnostic for a **total-selection-only guard**
that may choose an already-observed exact total when members and bonus are exact,
the equation is exact, and competing total interpretations are rejected. Keep it
diagnostic-only until parity and FP=0 are proven.
