# iPad Stage3 Full-Side Browser OCR Export

## Scope

This is developer-only diagnostic plumbing for iPad Stage3 F1/F2/F3 OCR export. It does not change production OCR output, Stage1/Stage2 behavior, current Stage3 production OCR, Tier C, strict-total, strict-member2, grouped-number parsing, ranking, smartphone OCR, current-PC OCR, or legacy desktop OCR.

Debug route:

```text
/?ipadArithmeticDebug=1&ipadStage3FullsideDebug=1
```

Automation command:

```bash
node scripts/ipad-stage3-fullside-browser-export.mjs --limit 10 --runs 1 --base-url http://127.0.0.1:55732
```

Artifacts:

```text
tmp/ipad-stage3-fullside-browser-export/
```

## Why This Was Needed

The previous Stage3 full-side / word-bbox investigation proved that F1/F2/F3 geometry could be defined, but the cached browser diagnostics did not actually run full-side OCR and did not export word/symbol bboxes.

This change adds the missing developer-only real-browser OCR export:

- F1: full Stage3 member row, per side
- F2: full Stage3 side, per side
- F3: full Stage3 result row, both sides

The export is stored in `window.__IPAD_STAGE3_FULLSIDE_OCR_EXPORT__` only when `ipadStage3FullsideDebug=1` is present.

## Production Safety

When `ipadStage3FullsideDebug=1` is absent:

- no F1/F2/F3 OCR runs
- no extra OCR cost is paid
- no extra UI appears
- no production score output changes

The normal iPad production recoveries remain separate:

- Tier C
- strict-total
- strict-member2

The full-side export is diagnostic-only and is not consumed by any production selector.

## OCR Configs

Bounded browser-native OCR config set:

| Config | Preset | PSM |
| --- | --- | --- |
| psm6 | ipad-white-mask | 6 |
| psm7 | ipad-white-mask | 7 |

No broad OCR matrix was added.

## 10-Image Diagnostic Run

| Metric | Result |
| --- | ---: |
| Images processed | 10 |
| F1/F2/F3 OCR calls | 100 |
| Runs | 1 |
| Wall time | about 6.5 minutes |

## Hierarchy Availability

Across all 10 images and all F1/F2/F3 configs:

| Hierarchy Level | Availability |
| --- | ---: |
| raw text | available |
| confidence | 100 / 100 |
| lines | 0 / 100 |
| words | 0 / 100 |
| symbols | 0 / 100 |
| bbox | 0 / 100 |

The browser Tesseract runtime used by the application did not expose line/word/symbol bbox hierarchy for these calls. The export records those levels as unavailable instead of fabricating geometry.

## Candidate Gains

Because no word/symbol bboxes were available, numeric tokens extracted from raw text had no source bbox and could not be assigned to member/bonus/total fields by geometry.

Assigned exact candidate gains:

| Architecture | Config | member1 | member2 | member3 | bonus | total | full side |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| F1 self | psm6 | 0 | 0 | 0 | 0 | 0 | 0 |
| F1 self | psm7 | 0 | 0 | 0 | 0 | 0 | 0 |
| F1 enemy | psm6 | 0 | 0 | 0 | 0 | 0 | 0 |
| F1 enemy | psm7 | 0 | 0 | 0 | 0 | 0 | 0 |
| F2 self | psm6 | 0 | 0 | 0 | 0 | 0 | 0 |
| F2 self | psm7 | 0 | 0 | 0 | 0 | 0 | 0 |
| F2 enemy | psm6 | 0 | 0 | 0 | 0 | 0 | 0 |
| F2 enemy | psm7 | 0 | 0 | 0 | 0 | 0 | 0 |
| F3 both | psm6 | 0 | 0 | 0 | 0 | 0 | 0 |
| F3 both | psm7 | 0 | 0 | 0 | 0 | 0 | 0 |

Member2 and member3, the main viability targets, remain:

```text
member2: 0 / 10
member3: 0 / 10
```

This does not move either field above the prior Stage3 baseline.

## Wrong-Slot And Ambiguity

Assigned-token wrong-slot count:

```text
0
```

However, this is not meaningful production evidence because no bbox-backed tokens were assignable. Raw-text tokens were unassigned:

| Architecture | Config | Unassigned Tokens |
| --- | --- | ---: |
| F1 self | psm6 | 10 |
| F1 self | psm7 | 10 |
| F1 enemy | psm6 | 2 |
| F1 enemy | psm7 | 2 |
| F2 self | psm6 | 132 |
| F2 self | psm7 | 132 |
| F2 enemy | psm6 | 107 |
| F2 enemy | psm7 | 107 |
| F3 both | psm6 | 266 |
| F3 both | psm7 | 266 |

The unassigned-token count confirms that full-side OCR is producing raw text, but not geometry usable by a safe selector.

## Selector Simulation

No selector expansion was productionized.

No meaningful Tier C / strict-total / strict-member2 simulation was run with F1/F2/F3 candidates because there were no bbox-assigned diagnostic candidates.

Result:

| Metric | Result |
| --- | ---: |
| TP | 0 |
| FP | 0 |
| Stage3 PASS gain | 0 |
| Existing PASS loss | 0 |

## Stability

Two fresh best-architecture runs were not performed. No architecture/config met even the first viability condition because:

- member2 exact presence stayed at 0
- member3 exact presence stayed at 0
- Stage3 simulated gain stayed at 0
- no bbox hierarchy was available for geometry assignment

Running stability checks on unassignable raw-text-only output would not prove production safety.

## Recommendation

Current browser Tesseract Stage3 full-side OCR is not viable for the next production phase.

Reason:

1. F1/F2/F3 real-browser OCR now runs.
2. The application’s browser Tesseract output does not expose word/symbol/line bboxes.
3. Without bboxes, geometry-only slot assignment cannot be performed.
4. Member2/member3 remain at 0 assigned exact candidates.
5. Selector work cannot help when safe assigned evidence is absent.

Recommended next step:

```text
Stop incremental Tesseract architecture tuning for iPad Stage3 and evaluate an alternate OCR engine/model or a specialized Stage3 digit detector/classifier.
```

If a future OCR engine can expose bbox-backed member2/member3 candidates with wrong-slot 0, then runner/browser-equivalent parity would become the next gate.

## Production Unchanged Confirmation

Confirmed unchanged by design:

- grouped-number member parser
- Tier C
- strict-total
- strict-member2
- Stage1/Stage2 OCR
- production Stage3 OCR
- iPad ROI/preprocessing and ranking
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
