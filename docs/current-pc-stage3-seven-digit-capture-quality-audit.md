# Current-PC Stage3 7-Digit Capture Quality Audit

This is a runner-only/docs-only audit of current-PC Stage3 7-digit member evidence capture quality. It does not change OCR output, does not add production recovery, and does not modify smartphone or legacy desktop OCR behavior.

## Source State

- latest production baseline: `31 / 68` images PASS, `159 / 204` stages PASS, `353 / 408` stage/side rows PASS
- remaining failing stage/side rows: 55
- source baseline artifact: `tmp/current-pc-ocr-baseline/summary.json`
- source diagnostics:
  - `tmp/current-pc-stage3-member-row-ocr-diagnostics/`
  - `tmp/current-pc-stage3-slot-geometry-diagnostics/`
  - `tmp/current-pc-stage3-self-merged-run-image-split-experiment/`
- related reports:
  - `docs/current-pc-stage3-member-row-variant-evidence-simulation.md`
  - `docs/current-pc-stage3-self-merged-run-image-split-experiment.md`
  - `docs/current-pc-latest-remaining-failure-reclassification.md`

Expected fixtures were used only after OCR evidence generation for scoring/classification.

## Summary

| metric | count |
| --- | ---: |
| affected Stage3 rows with 7-digit member failures | 29 |
| affected expected 7-digit member values | 42 |
| exact values already present in production evidence | 11 |
| exact values found by diagnostic ROI/preprocessing evidence | 32 |
| exact values found by deterministic per-slot crop evidence | 11 |
| exact values represented by bbox/geometry diagnostics | 42 |
| exact values absent from all current evidence | 0 |
| newly found exact values beyond production evidence | 22 |

The main result is not that 7-digit values are impossible to OCR. They are frequently visible in diagnostic evidence. The blocker is preserving safe slot provenance while avoiding noisy or competing candidates.

## Failure Shape Breakdown

Classes overlap because one expected member can be both fragmented and merged with an adjacent value.

| shape | affected member values |
| --- | ---: |
| exact in production evidence | 11 |
| exact only/new in diagnostic evidence | 22 |
| exact in per-slot evidence | 11 |
| exact in bbox/geometry diagnostics | 42 |
| fragmented text evidence | 42 |
| merged with adjacent member text | 40 |
| leading digit(s) dropped in selected value | 1 |
| trailing digit(s) dropped in selected value | 0 |
| absent from all current evidence | 0 |

The strict leading/trailing-drop counters understate the practical OCR problem. Most misses appear as punctuation loss, merged adjacent member runs, or partial fragments in raw row text rather than as a clean selected-value suffix/prefix.

## Variant Comparison

| evidence source / variant | exact 7-digit hits |
| --- | ---: |
| wider-member-row-roi | 24 |
| shifted-right-member-row-roi | 19 |
| taller-member-row-roi | 18 |
| tighter-vertical-member-row-roi | 15 |
| shifted-down-member-row-roi | 14 |
| crown-bonus-threshold-row-variant | 14 |
| current-member-row-roi | 13 |
| shifted-left-member-row-roi | 12 |
| shifted-up-member-row-roi | 11 |
| baseline-threshold-row-variant | 9 |
| member3-slot | 5 |
| member2-slot | 4 |
| member1-slot | 2 |

The best raw extractor is `wider-member-row-roi`, but it is row-level evidence and often contains merged neighboring values. It improves capture, not safe assignment.

The safest provenance is the explicit `member1-slot` / `member2-slot` / `member3-slot` crop family. It produces only 11 exact hits, so its incremental solver gain is currently too small for productionization.

## Crop And Geometry Findings

- Bbox/geometry diagnostics can account for all 42 affected expected 7-digit members, but that is diagnostic evidence, not yet a safe candidate source.
- Most failures are not simple crop-edge clipping. The dominant shape is a merged or adjacent row text run, such as two member scores touching or punctuation being lost between them.
- Per-slot evidence has deterministic slot provenance, but current slot crops miss many 7-digit values or produce slot noise for member1/member3.
- Wider and shifted row crops recover more exact values, especially for fragmented 7-digit runs, but they do not independently prove which member slot owns the recovered number.
- Merged-run image-space splitting preserved deterministic slot assignment and had wrong-slot count `0`, but introduced extra candidates and produced only one true incremental TP.

## Merged-Run Image-Space Split Result

The existing runner-only image-space split experiment is the strongest safety-oriented capture attempt so far:

| metric | count |
| --- | ---: |
| Stage3 self rows evaluated | 68 |
| rows with detected merged runs | 37 |
| merged runs detected | 101 |
| split crops OCRed | 795 |
| split candidates admitted | 388 |
| exact members newly recovered in focused rows | 11 |
| rows gaining complete Stage3 self member evidence | 1 |
| TP stages | 1 |
| FP stages | 0 |
| FN stages | 2 |
| blocked stages | 27 |
| true incremental TP beyond current production | 1 |
| Stage3 self incremental TP | 1 |
| wrong-slot assignments | 0 |
| extra candidate insertions | 27 |

This meets the wrong-slot safety target, but it does not meet the requested `true incremental TP >= 2` threshold.

## Best Capture Strategies

| rank | strategy | benefit | risk | recommendation |
| ---: | --- | --- | --- | --- |
| 1 | wider Stage3 member-row ROI | highest exact hit count (`24`) | row-level provenance, merged adjacent values, noisy candidates | useful for diagnostics only |
| 2 | deterministic per-slot crops | safest slot provenance | only `11` exact hits, limited solver gain | best next capture-quality target |
| 3 | merged-run image-space slot split | wrong-slot `0`, exact-only, expected-blind | true incremental TP only `1`, extra candidates `27` | defer production/parity |

## Simulation Decision

No new `currentPcStage3SevenDigitCaptureQualitySimulation` was added.

Reason:

- broad row variants recover many exact 7-digit values but do not preserve safe slot ownership
- deterministic per-slot evidence is safer but does not yet provide at least two true incremental recoveries
- merged-run image-space splitting has `FP = 0` and `wrong-slot = 0`, but only `true incremental TP = 1`
- no narrow capture policy currently satisfies all success criteria:
  - true incremental TP >= 2
  - FP = 0
  - wrong-slot = 0
  - exact-only
  - deterministic provenance
  - no within-one tolerance

## Production Readiness

Productionization is not recommended from this audit.

Browser/UI parity is also not justified as the next step because no deterministic capture policy reached the required incremental benefit threshold.

## Recommended Next Step

Focus on a runner-only per-slot capture-quality improvement rather than another solver:

- Stage3 member-slot crops only
- deterministic slot provenance only
- small fixed horizontal padding variants
- limited 2x or 3x horizontal upscale variant
- one alternate threshold/preprocessing path
- explicit scoring of:
  - exact 7-digit hits
  - wrong-slot assignments
  - extra numeric candidate noise
  - rows gaining complete member evidence
  - rows accepted by the existing strict stage-wide solver

This is more promising than broad row-level ROI adoption because it attacks capture quality while preserving slot ownership.

## Validation

- no production OCR code changed
- no runner simulation added
- no smartphone OCR changes
- no legacy desktop OCR changes
- generated tmp artifacts remain uncommitted
