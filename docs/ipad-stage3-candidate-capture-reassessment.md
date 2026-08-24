# iPad Stage3 Candidate-Capture Reassessment

Status: diagnostic-only. Production OCR behavior was not changed.

## Current Production Baseline

The current authoritative production summary remains:

| Metric | Result |
| --- | ---: |
| completed iPad fixtures | 53 |
| stages exact | 58 / 159 |
| stage/sides exact | 162 / 318 |
| production recoveries | 119 TP / 0 FP |
| Tier C | 72 TP / 0 FP |
| strict-total | 15 TP / 0 FP |
| strict-member2 | 32 TP / 0 FP |

Source: `tmp/ipad-production-fp-investigation/after-fix-53-two-run-summary.json`.

The available detailed browser-Tesseract Stage3 candidate artifact still covers 38 fixtures / 76 Stage3 sides, not all 53 fixtures / 106 Stage3 sides. This report uses the 53-fixture artifact only for release-baseline confirmation and uses the 38-fixture detailed Stage3 matrix only for candidate-level conclusions. It does not invent missing per-field evidence for the remaining 15 fixtures.

Artifacts from this reassessment are written to:

```text
tmp/ipad-stage3-candidate-capture-reassessment/
```

Command:

```powershell
node scripts/ipad-stage3-candidate-capture-reassessment.mjs
```

## Closed Families

The previous Stage1/Stage2 strict bonus review is closed:

| Item | Result |
| --- | ---: |
| theoretical rows checked in real browser | 5 |
| exact stable bonus present | 1 / 5 |
| strict V2 | 1 TP / 0 FP |
| true pure-selection ceiling | 1 |

RapidOCR Stage3 is also closed for now:

| Item | Result |
| --- | ---: |
| browser feasibility | proven |
| production-readiness full run | NET_NEW_TP 0 / NET_NEW_FP 0 |
| recommendation | do not resume RapidOCR tuning |

## Current Stage3 Inventory

Detailed current browser-Tesseract Stage3 evidence available for this report:

| Metric | Result |
| --- | ---: |
| detailed fixtures | 38 |
| Stage3 sides | 76 |
| exact Stage3 sides | 0 / 76 |
| failed Stage3 sides | 76 / 76 |

Wrong field counts across the 76 detailed Stage3 sides:

| Field | Wrong |
| --- | ---: |
| member1 | 75 |
| member2 | 75 |
| member3 | 75 |
| bonus | 44 |
| total | 76 |

Breakdown by side:

| Field | self | enemy |
| --- | ---: | ---: |
| member1 | 37 | 38 |
| member2 | 38 | 37 |
| member3 | 38 | 37 |
| bonus | 25 | 19 |
| total | 38 | 38 |

Breakdown by cluster:

| Field | ipad-01 | ipad-02 |
| --- | ---: | ---: |
| member1 | 46 | 29 |
| member2 | 46 | 29 |
| member3 | 46 | 29 |
| bonus | 28 | 16 |
| total | 46 | 30 |

This remains a cross-cluster Stage3 problem, not an ipad-01-only or ipad-02-only quirk.

## Recognition Versus Selection

For wrong Stage3 fields in the detailed evidence:

| Field | R | S | RAW |
| --- | ---: | ---: | ---: |
| member1 | 74 | 1 | 0 |
| member2 | 75 | 0 | 0 |
| member3 | 75 | 0 | 0 |
| bonus | 38 | 1 | 5 |
| total | 72 | 2 | 2 |

Definitions:

- `R`: expected value absent from current production candidate evidence.
- `S`: expected value exists but final selection/recovery does not use it.
- `RAW`: expected value appears only in raw OCR evidence and is not admitted to the field pool.
- `FRAGMENT`: expected value appears only as a strict fragment.
- `AMBIGUOUS`: multiple plausible candidates prevent safe selection.

The Stage3 bottleneck is still recognition/candidate capture. Selection-only opportunities are too small and are not concentrated in a safe Stage3 family.

## Wrong-Field Histogram

There are no one-field-away or two-field-away Stage3 sides in the detailed matrix:

| Wrong fields on side | Rows |
| ---: | ---: |
| 1 | 0 |
| 2 | 0 |
| 3 | 1 |
| 4 | 33 |
| 5 | 42 |

## One-Field-Away Leverage

No one-field-away Stage3 sides are present in the available detailed browser-Tesseract evidence.

| Field | One-field-away sides | Candidate-capture ceiling |
| --- | ---: | ---: |
| member1 | 0 | 0 |
| member2 | 0 | 0 |
| member3 | 0 | 0 |
| bonus | 0 | 0 |
| total | 0 | 0 |

Because every detailed failed Stage3 side still has at least three wrong fields, adding one exact OCR candidate to one field family would not produce a realistic new Stage3 side PASS under the current safe recovery architecture.

## Exhausted Approach Matrix

| Approach | Fixture scope | Gain | Noise / FP risk | Why rejected | Revisit now? |
| --- | --- | --- | --- | --- | --- |
| Stage3 member2 PSM 6/7/8/10/13 and numeric configs | 18 fixtures / 36 member2 fields | 0 exact Stage3 member2 candidates | PSM6 emitted wrong numeric candidates for every field | Config-only tuning did not produce exact candidates | No |
| member2 left-edge crop / padding | 18 fixtures | no production-safe gain | unstable exact values | Member2 evidence remained recognition-limited | No |
| symbol / word hierarchy segmentation | 18 fixtures / 36 member2 fields | 0 | no candidates emitted | Browser Tesseract returned no usable word/symbol bboxes | No |
| full-side F1/F2/F3 Tesseract | 10 images | 0 assigned candidate gains | many unassigned raw tokens | No bbox-backed field assignment | No |
| grouped-number token work | 18 fixtures / all stage sides | 15 TP, Stage1/2 only | T2-only 0 FP; T1/T3 unsafe | Safe part already productionized; Stage3 emitted 0 T2 candidates | No |
| total candidate capture / selection | 18 fixtures / 108 totals | strict-total safe part productionized | capture profiles too noisy | Remaining value was selection-only or noisy capture | No |
| Stage3 RapidOCR / detector / detectorless browser | 53 fixtures / 106 Stage3 sides | NET_NEW_TP 0 / NET_NEW_FP 0 | safe but no accepted applications | Frozen browser candidate did not survive strict readiness | No |

## Structural Groups

Current recurrent Stage3 wrong-field shapes in the detailed matrix:

| Family | Count |
| --- | ---: |
| total:not-recognized-at-all | 76 |
| member1:not-recognized-at-all | 75 |
| member2:not-recognized-at-all | 75 |
| member3:not-recognized-at-all | 75 |
| bonus:not-recognized-at-all | 44 |

The raw exact pockets for bonus and total do not produce one-field-away Stage3 sides. They may be useful as diagnostics, but they do not justify a production or parity direction by themselves.

## Opportunity Ranking

| Family | Affected sides | One-field-away sides | Potential NET_NEW_TP | Both clusters? | Recommended |
| --- | ---: | ---: | ---: | --- | --- |
| member1 candidate capture | 75 | 0 | 0 | yes | no |
| member2 candidate capture | 75 | 0 | 0 | yes | no |
| member3 candidate capture | 75 | 0 | 0 | yes | no |
| bonus candidate capture | 44 | 0 | 0 | yes | no |
| total candidate capture | 76 | 0 | 0 | yes | no |

No family satisfies the task threshold of potential `NET_NEW_TP >= 2`.

## Candidate Experiment Decision

No new browser-Tesseract profile experiment was run.

Reason:

```text
No Stage3 field family has a verified candidate-capture ceiling >= 2 in the available browser-Tesseract detailed artifacts.
```

Running another bounded Tesseract profile over Stage3 would likely repeat previously exhausted work without a concrete structural target. The current evidence says Stage3 is not one missing field away; it is a multi-field recognition/capture problem.

## Candidate Gains And Safety

Because no candidate experiment was justified:

| Metric | Result |
| --- | ---: |
| new exact candidate gain | 0 |
| realistic existing-recovery NET_NEW_TP | 0 |
| apparent FP / conflict | 0 |
| two-context browser stability | not run; gated on >=2 gains |
| full 53 safety expansion | not run; gated on >=2 gains |

No diagnostic-only candidate source was added, so no new fragment/noise surface was created.

## Recommendation

Do not continue Stage3 browser-Tesseract tuning under the current evidence.

Recommended next step:

1. Refresh or regenerate detailed browser diagnostics for all 53 fixtures only if a full current Stage3 matrix is needed for audit completeness.
2. Otherwise close iPad OCR optimization for now and expand fixtures or wait for a genuinely new Stage3 recognition architecture.
3. Do not resume RapidOCR, PSM/config sweeps, grouped-token parsing, or full-side string-only OCR without new structural evidence such as stable field-safe bbox/provenance.

Production unchanged confirmation:

- no production OCR behavior changed
- no new OCR engine added
- no iPad recovery/selection rules changed
- no smartphone OCR changed
- no current-PC OCR changed
- no legacy desktop OCR changed
