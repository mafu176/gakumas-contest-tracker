# iPad Stage3 Member2 Symbol Segmentation Investigation

## Scope

This is a diagnostic-only browser-native investigation for iPad Stage3 `member2`.

It does not change production OCR, T2 grouped-number parsing, Tier C, ROI geometry, preprocessing, ranking, fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Production Baseline

The real-browser production verification was rerun twice before the diagnostic work.

| Metric | Result |
| --- | ---: |
| Images processed | 18 / 18 |
| Stage/side PASS | 40 / 108 |
| Tier C applications | 24 |
| TP | 24 |
| FP | 0 |
| Stable applications | 24 / 24 |

The baseline remained exactly as expected.

## Diagnostic Command

```bash
node scripts/ipad-stage3-member2-symbol-segmentation.mjs --runs 2
```

Artifacts are written under:

```text
tmp/ipad-stage3-member2-symbol-segmentation/
```

The script uses the actual browser OCR path, Playwright, the production Stage3 member2 field crop, production preprocessing profiles, and the current production Tesseract config. Expected fixtures are used only after candidate generation for scoring.

## OCR Hierarchy Availability

The browser Tesseract production config did not expose usable OCR hierarchy for these crops.

| Level | Available Profile Results |
| --- | ---: |
| Blocks | 0 / 108 |
| Paragraphs | 0 / 108 |
| Lines | 0 / 108 |
| Words | 0 / 108 |
| Symbols | 0 / 108 |
| Choices / alternatives | 0 / 108 |
| Baselines | 0 / 108 |

This is the critical result: there are no literal OCR word or symbol labels with bboxes to segment.

## Bbox And Component Evidence

The script also computed connected components from the same production-processed bitmaps.

| Metric | Result |
| --- | ---: |
| Profile results inspected | 108 |
| Fields with image components | 36 / 36 |
| Average components per profile result | 19.38 |
| Profile results with border-touching components | 108 / 108 |
| Max component-gap / median-width ratio | 1.91 |

Connected components confirm that foreground pixels exist, but they do not provide digit labels. Because the OCR hierarchy is empty, component geometry alone cannot emit literal numeric candidates without adding a separate classifier or expected-driven digit inference.

## Segmentation Tiers

| Tier | Rule | Status |
| --- | --- | --- |
| S1 | Use independent OCR words when Tesseract exposes digit-only word boxes. | Blocked: no word hierarchy |
| S2 | Cluster literal OCR symbols using an aggregate gap rule. | Blocked: no symbol hierarchy |
| S3 | Compare connected components to OCR bboxes. | Diagnostic-only: no OCR labels to assign |
| S4 | Ambiguous boundary requiring expected-driven reasoning. | Blocked by design |

The locked S2 rule would require symbol bboxes and a gap at least 2.5x median symbol width with non-overlapping clusters. It was not eligible because no symbols were returned.

## Stage3 Member2 Taxonomy

| Category | Count |
| --- | ---: |
| A. Correct full value appears as one OCR word | 0 |
| B. Correct value appears across multiple OCR words | 0 |
| C. Correct digits appear as ordered OCR symbols but flattened text is malformed | 0 |
| D. Correct digits appear in image components but OCR symbol labels are wrong | 0 |
| E. One or more symbol labels are substitutions | 0 |
| F. One or more digits are missing entirely | 36 |
| G. Extra symbols/digits have no safe geometric separation | 0 |
| H. OCR hierarchy unavailable | 36 |
| I. No useful evidence | 36 |

Because OCR hierarchy is unavailable, the parser-vs-recognition split lands on recognition/engine evidence absence, not a flattening/parser problem.

## Candidate Results

| Metric | Result |
| --- | ---: |
| Stage3 member2 exact candidates | 0 / 36 |
| Wrong segmentation candidate rows | 0 |
| Harmless extra candidates | 0 |
| Ambiguity-producing candidates | 0 |
| Tier C-blocking candidates | 0 |
| Wrong unique Tier C proposals | 0 |
| Tier C FP | 0 |

The low noise count is not a success signal; it reflects that the safe segmentation tiers emitted no candidates.

## Tier C Simulation

Production candidates + existing T2 + symbol-segmentation candidates were evaluated with unchanged Tier C semantics.

| Metric | Result |
| --- | ---: |
| Tier C applications from segmentation | 0 |
| TP | 0 |
| FP | 0 |
| New TP beyond current 24 | 0 |
| Lost TP | 0 |
| Final stage/side PASS | 40 / 108 |
| Existing PASS losses | 0 |

## Addressable Stage/Sides

The previous post-T2 audit estimated up to 8 failing stage/sides could become addressable if Stage3 member2 recognition improved. This experiment did not expose any literal Stage3 member2 candidates, so no addressable row became recoverable.

| Metric | Result |
| --- | ---: |
| Previously estimated member2 leverage | 8 stage/sides |
| Rows with literal correct OCR hierarchy evidence | 0 |
| Rows recovered by safe segmentation | 0 |
| Rows still blocked | 8 / 8 |

## Stability

Two fresh browser diagnostic runs completed and produced stable signatures for:

- production baseline
- OCR hierarchy availability
- candidate extraction
- Tier C simulation
- recommendation

Worker reuse was kept to one reused browser worker per image. A fresh-worker comparison was skipped because the full browser-native OCR diagnostic is already expensive; no production code depends on the diagnostic worker strategy.

## Comparison Against Bonus/Total Leverage

The post-T2 report showed:

- bonus candidate presence: 51 / 108
- total candidate presence: 68 / 108

This symbol/bbox segmentation path recovers 0 stage/sides. Bonus or total capture still has more evidence leverage than Stage3 member2 symbol segmentation with the current browser Tesseract path.

## Production Readiness

No safe segmentation rule exists from this evidence.

The rule fails production-readiness because:

- no OCR word boxes are available
- no OCR symbol boxes are available
- no literal digit labels are available to reconstruct candidates
- connected components cannot be converted into digits without a new classifier
- exact Stage3 member2 gain is 0
- final stage/side gain is 0

## Recommendation

Recommended next experiment:

```text
alternate OCR engine diagnostic
```

Reason: the current browser Tesseract path provides neither text nor hierarchy for Stage3 member2 under production preprocessing. A symbol/bbox-aware layer cannot operate unless another recognizer exposes literal digit evidence or a specialized digit classifier is introduced. Between those, an alternate OCR engine diagnostic is the smaller next diagnostic step.

## Production Isolation

Confirmed unchanged:

- production OCR config
- T2 parser
- `ENABLE_IPAD_GROUPED_NUMBER_MEMBER_TOKENS`
- Tier C
- iPad ROI
- iPad preprocessing
- ranking
- fixtures
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
