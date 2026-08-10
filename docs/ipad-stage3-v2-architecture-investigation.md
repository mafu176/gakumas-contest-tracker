# iPad Stage3 v2 OCR Architecture Investigation

## Scope

This is a diagnostic-only Stage3 v2 architecture investigation using the expanded 38-fixture iPad browser-native baseline.

Production OCR behavior was not changed. The current iPad production recoveries remain:

- grouped-number member parsing
- Tier C exactly-one arithmetic recovery
- strict-total recovery
- strict-member2 recovery

The expanded production baseline remains the authority for this investigation:

| Metric | Result |
| --- | ---: |
| Completed fixtures | 38 |
| Stage/sides | 228 |
| Stage3 stage/sides | 76 |
| Overall stage/side PASS | 112 / 228 |
| Production recovery TP / FP | 81 / 0 |
| Stage3 stage/side PASS | 0 / 76 |

Artifacts are written under `tmp/ipad-stage3-v2-architecture/`.

## Method

The diagnostic script reads the browser-native debug evidence embedded in the expanded baseline artifacts. It does not use expected values during candidate generation; expected fixtures are used only afterward for scoring.

Command:

```powershell
node scripts/ipad-stage3-v2-architecture-investigation.mjs
```

The script extracts, for every Stage3 side:

- expected and current selected member1/member2/member3/bonus/total
- current browser candidate pools
- candidate provenance and crop zones where available
- exact expected candidate presence
- exact expected raw-text presence in slot-proven field evidence
- wrong-field count
- wrong-slot evidence within current slot-proven pools

## Stage3 Field Coverage

Current selected output:

| Field | Exact selected |
| --- | ---: |
| member1 | 1 / 76 |
| member2 | 1 / 76 |
| member3 | 1 / 76 |
| bonus | 32 / 76 |
| total | 0 / 76 |
| full side | 0 / 76 |

Exact parsed candidate presence in current browser Stage3 pools:

| Field | Exact candidate present |
| --- | ---: |
| member1 | 2 / 76 |
| member2 | 0 / 76 |
| member3 | 0 / 76 |
| bonus | 11 / 76 |
| total | 2 / 76 |

Exact value present in slot-proven raw text:

| Field | Raw exact present |
| --- | ---: |
| member1 | 2 / 76 |
| member2 | 0 / 76 |
| member3 | 0 / 76 |
| bonus | 16 / 76 |
| total | 4 / 76 |

Member2 remains the hardest Stage3 slot: exact member2 candidate presence is `0 / 76`, and exact member2 raw-text presence is also `0 / 76`.

## Side and Cluster Breakdown

Exact parsed candidate presence by side:

| Side | member1 | member2 | member3 | bonus | total |
| --- | ---: | ---: | ---: | ---: | ---: |
| self, 38 sides | 2 | 0 | 0 | 9 | 1 |
| enemy, 38 sides | 0 | 0 | 0 | 2 | 1 |

Exact parsed candidate presence by cluster:

| Cluster | Sides | member1 | member2 | member3 | bonus | total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ipad-01 | 46 | 0 | 0 | 0 | 6 | 2 |
| ipad-02 | 30 | 2 | 0 | 0 | 5 | 0 |

The failure is shared across self/enemy and both layout clusters.

## Architecture Scorecard

| ID | Architecture | Evidence scored now | Stage3 side upper bound | Wrong-slot rows | Recommendation |
| --- | --- | --- | ---: | ---: | --- |
| A | Current per-field Stage3 OCR | selected output | 0 / 76 | 0 | Baseline only; not viable. |
| B | Per-slot enlarged OCR | current slot candidate union proxy | 0 / 76 | 0 | Needs a new browser OCR pass; current pools are insufficient. |
| C | Full Stage3 member-row OCR | not available | n/a | n/a | Needs browser word/bbox export before safety can be measured. |
| D | Full-side OCR | not available | n/a | n/a | Worth comparing after full-side OCR diagnostics, especially for total capture. |
| E | Multi-pass consensus | slot-proven candidate or raw exact union | 0 / 76 | 0 | Raw evidence still cannot complete any Stage3 side. |
| F | Hybrid slot-intersection | not available | n/a | n/a | Potential direction only after word/bbox geometry exists. |

No current-evidence architecture reaches the future parity threshold of at least 8 Stage3 side gains.

## Selector Simulation

The current Stage3 candidate evidence is too sparse to justify rerunning or broadening Tier C, strict-total, or strict-member2 semantics:

- per-slot candidate-union full-side upper bound: `0 / 76`
- slot-proven candidate-or-raw full-side upper bound: `0 / 76`
- wrong-slot rows in current slot-proven evidence: `0`
- selector TP / FP from new Stage3 evidence: not applicable; no architecture produced complete candidate pools

This confirms that Stage3 failure is primarily evidence capture / OCR recognition, not candidate selection.

## Runtime

This pass reused cached expanded browser evidence:

- extra OCR calls: 0
- analyzed fixtures: 38
- analyzed Stage3 sides: 76

Architectures C/D/F require a future browser run that exports word/bbox or full-side OCR evidence. They should be measured in two fresh browser contexts only after that evidence path exists.

## Recommendation

Recommended next step: **C. Current OCR evidence is the blocker; add browser-native word/bbox/full-side Stage3 diagnostics or evaluate a different OCR engine/model.**

Do not productionize another Stage3 selector from the current evidence. The next diagnostic should capture real browser word/bbox data for Stage3 member rows and full sides, then measure whether geometry can assign tokens to slots with `wrong-slot = 0`.

More expected fixtures are useful, but not the immediate blocker. The existing 38 fixtures already show a systematic Stage3 capture failure across both clusters.

Production unchanged confirmation:

- no production OCR code changed
- no iPad ROI/preprocessing/ranking semantics changed
- no smartphone/current-PC/legacy desktop behavior changed
- generated diagnostic artifacts remain under `tmp/`
