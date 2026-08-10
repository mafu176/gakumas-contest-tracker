# iPad Stage3 Full-Side / Word-Bbox OCR Investigation

## Scope

This is a diagnostic-only investigation. It does not change production OCR output, iPad Tier C, strict-total, strict-member2, grouped-number parsing, ROI/preprocessing, candidate ranking, smartphone OCR, current-PC OCR, or legacy desktop OCR.

Artifacts are generated under:

```text
tmp/ipad-stage3-fullside-wordbox/
```

Command:

```bash
node scripts/ipad-stage3-fullside-wordbox-investigation.mjs
```

## Baseline Confirmation

The investigation starts from the cached browser-native expanded iPad baseline:

| Metric | Result |
| --- | ---: |
| Completed iPad fixtures | 38 |
| Stage/sides | 228 |
| Stage/side PASS | 112 / 228 |
| Production recoveries | 81 TP / 0 FP |
| Stage3 sides | 76 |
| Stage3 PASS | 0 / 76 |

This matches the required starting point.

## Tested Architecture Definitions

The diagnostic script defines generalized Stage3 geometry from the browser diagnostic template. The definitions are saved in `architecture-definitions.json` and `crop-geometry.json`.

| Architecture | ROI | Status |
| --- | --- | --- |
| F1 | Full Stage3 member row, member1/member2/member3 only | ROI defined, full-side OCR not executed because current browser diagnostics do not export that OCR call |
| F2 | Full Stage3 side, member1/member2/member3/bonus/total | ROI defined, full-side OCR not executed because current browser diagnostics do not export that OCR call |
| F3 | Full Stage3 result row, both self and enemy sides | ROI defined, full-side OCR not executed because current browser diagnostics do not export that OCR call |

No filename-specific geometry was introduced.

## OCR Hierarchy Availability

Available in the current browser-native diagnostics:

- field candidate pools
- field crop zones
- field/profile raw text
- profile parsed candidates

Not available in the current browser-native diagnostics:

- new F1/F2/F3 full-side OCR calls
- line bbox
- word bbox
- symbol bbox
- baseline geometry

Because of that, true word-bbox token assignment cannot yet be measured. The script records this explicitly in `word-bboxes.json` instead of fabricating hierarchy.

## Token Extraction Rules

The script extracts literal numeric tokens only from already-observed browser field raw text:

- contiguous digit tokens
- strict comma/period grouped numbers
- strict whitespace grouped numbers

It does not:

- split continuous digit runs by expected length
- drop prefix/suffix digits
- substitute digits
- infer values arithmetically
- use expected values during token generation

Expected fixtures are used only afterward for scoring.

## Current Evidence Results

Current parsed candidate presence across 76 Stage3 sides:

| Field | Exact Candidate Present |
| --- | ---: |
| member1 | 2 / 76 |
| member2 | 0 / 76 |
| member3 | 0 / 76 |
| bonus | 11 / 76 |
| total | 2 / 76 |

Existing field raw text literal-token presence:

| Field | Exact Literal Token Present |
| --- | ---: |
| member1 | 2 / 76 |
| member2 | 0 / 76 |
| member3 | 0 / 76 |
| bonus | 11 / 76 |
| total | 2 / 76 |

All three member values present:

| Source | Result |
| --- | ---: |
| current parsed candidates | 0 / 76 |
| existing field raw literal tokens | 0 / 76 |

All five side fields present:

| Source | Result |
| --- | ---: |
| current parsed candidates | 0 / 76 |
| existing field raw literal tokens | 0 / 76 |

## Member2 / Member3 Audit

Member2 and member3 remain the critical blockers:

| Field | Current Candidate | Existing Raw Literal Token |
| --- | ---: | ---: |
| member2 | 0 / 76 | 0 / 76 |
| member3 | 0 / 76 | 0 / 76 |

No full-side word-bbox evidence is available yet, so the experiment cannot show whether F1/F2/F3 would recover member2 or member3.

## Slot Assignment Safety

The only assignable token tier in current artifacts is:

- A1: token source is an existing field crop with a fixed field zone

Unavailable until word-bbox export exists:

- A2: token center/overlap strongly favors one field
- A3: token spans fields but OCR word boundaries separate sub-tokens

Blocked:

- A4: ambiguous assignment

Observed wrong-slot rows from current field-crop candidate evidence:

```text
0 / 76
```

This is safe but low-coverage. Full-side wrong-slot risk cannot be measured until browser OCR exports token bboxes for F1/F2/F3.

## Selector Simulation

No candidate-pool expansion was run because F1/F2/F3 produced no measurable browser wordbox candidates in the current artifacts.

| Selector | TP | FP |
| --- | ---: | ---: |
| Tier C | 0 | 0 |
| strict-total | 0 | 0 |
| strict-member2 | 0 | 0 |

Stage3 PASS gain:

```text
0
```

Existing PASS losses:

```text
0
```

## Upper Bounds

| Metric | Result |
| --- | ---: |
| Current selector Stage3 PASS | 0 / 76 |
| Current candidate all-3-members evidence | 0 / 76 |
| Existing raw-token all-3-members evidence | 0 / 76 |
| Current candidate all-5-fields evidence | 0 / 76 |
| Existing raw-token all-5-fields evidence | 0 / 76 |
| F1/F2/F3 perfect-selection oracle | not measurable until wordbox export |

## Runtime And Stability

This run reused the cached expanded browser baseline diagnostics and did not issue extra OCR calls.

Two fresh best-architecture runs were not performed because no F1/F2/F3 architecture produced measurable wordbox candidates. Running stability checks before the browser exports word/symbol bbox data would only confirm that the missing data remains missing.

Pending unlabeled stress tests were also deferred for the same reason. They should be used only after a real F1/F2/F3 wordbox export exists, and only for geometry/noise stability rather than accuracy.

## Architecture Scorecard

| Architecture | Candidate Gain | Wrong-Slot Risk | Selector Gain | Recommendation |
| --- | ---: | ---: | ---: | --- |
| Current field crops | baseline only | 0 | 0 | not viable for Stage3 |
| Existing field raw literal tokens | 0 member2/member3 gain | 0 | 0 | diagnostic only |
| F1 full Stage3 member row | not measurable | not measurable | not run | blocked until word/symbol bbox export |
| F2 full Stage3 side | not measurable | not measurable | not run | blocked until word/symbol bbox export |
| F3 full Stage3 result row | not measurable | not measurable | not run | blocked until word/symbol bbox export |

## Recommendation

Stage3 full-side OCR is not production-viable from the current evidence. The diagnostic boundary is now clear:

1. The existing browser diagnostic path does not export the OCR hierarchy needed for full-side token geometry.
2. Existing field-level raw text still has 0 / 76 exact member2 and 0 / 76 exact member3 evidence.
3. Another selector cannot help when the relevant member evidence is absent.

Recommended next step:

```text
Add a developer-only browser OCR hierarchy export for F1/F2/F3 ROI calls, including word/symbol bboxes, or move to an alternate OCR engine/model for Stage3 digit capture.
```

If that future export shows member2 or member3 exact presence of at least 10 / 76 with wrong-slot 0 and FP 0 in selector simulation, then runner/browser-equivalent parity would be justified.

## Production Unchanged

Confirmed unchanged by design:

- grouped-number member parser
- Tier C
- strict-total
- strict-member2
- rollback constants
- Stage1/Stage2 OCR
- current Stage3 production OCR
- iPad ROI/preprocessing
- candidate ranking
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
