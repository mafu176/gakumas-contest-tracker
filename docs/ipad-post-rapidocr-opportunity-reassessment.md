# iPad Post-RapidOCR Opportunity Reassessment

Status: diagnostic-only. Production OCR behavior was not changed.

## Current Production Baseline

| Metric | Result |
| --- | ---: |
| completed fixtures | 53 |
| images exact | 0 / 53 (0%) |
| stages exact | 58 / 159 (36.5%) |
| stage/sides exact | 162 / 318 (50.9%) |
| remaining failed stage/sides | 156 |
| production recoveries | 119 TP / 0 FP |
| Tier C | 72 TP / 0 FP |
| strict-total | 15 TP / 0 FP |
| strict-member2 | 32 TP / 0 FP |

The authoritative 53-fixture production safety summary is `tmp/ipad-production-fp-investigation/after-fix-53-two-run-summary.json`. A fresh full browser run was started for this task, but the current UI/Tesseract path advanced only to the second image after several minutes, so it was stopped and the existing two-run artifact was reused. This did not change OCR output.

## RapidOCR Closeout

| Metric | Result |
| --- | ---: |
| direct browser RapidOCR fixtures | 53 |
| Stage3 sides | 106 |
| browser R6 applications | 0 |
| TP / FP | 0 / 0 |
| NET_NEW_TP / NET_NEW_FP | 0 / 0 |

RapidOCR browser feasibility was proven, but production value was not: NET_NEW_TP is 0, the historical four are not recovered by the frozen browser candidate, and IMG_0283 enemy remains blocked. No further RapidOCR tuning is recommended unless the dataset or production OCR architecture changes materially.

## Stage And Field Reassessment

The table below is generated from the cached all-53 Tesseract iPad baseline artifact. It is used for opportunity classification; the aggregate production pass/fail counts above remain the release baseline.

| Position | baseline exact | baseline failed | member1 err | member2 err | member3 err | bonus err | total err |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| stage1_self | 10 / 53 | 43 | 0 | 3 | 0 | 38 | 23 |
| stage1_enemy | 26 / 53 | 27 | 2 | 1 | 4 | 20 | 6 |
| stage2_self | 0 / 53 | 53 | 50 | 53 | 46 | 52 | 50 |
| stage2_enemy | 0 / 53 | 53 | 53 | 52 | 49 | 33 | 47 |
| stage3_self | 0 / 53 | 53 | 53 | 53 | 53 | 50 | 53 |
| stage3_enemy | 0 / 53 | 53 | 53 | 52 | 52 | 36 | 53 |

## Recognition Versus Selection Proxy

| Field | wrong fields | exact parsed candidate present | exact only in raw text |
| --- | ---: | ---: | ---: |
| member1 | 211 | 0 | 2 |
| member2 | 214 | 0 | 0 |
| member3 | 204 | 0 | 2 |
| bonus | 229 | 0 | 84 |
| total | 232 | 0 | 12 |

## Failure Taxonomy

| Category | Count |
| --- | ---: |
| R1-no-exact-candidate-empty-pool | 466 |
| R1-no-exact-candidate | 383 |
| R5-strict-fragment-or-grouped-token | 141 |
| R4-exact-only-in-raw-text | 100 |

## Wrong-Field Histogram

| wrong fields on side | rows |
| ---: | ---: |
| 1 | 45 |
| 2 | 25 |
| 3 | 5 |
| 4 | 55 |
| 5 | 152 |

## One-Field-Away

| wrong field | rows |
| --- | ---: |
| bonus | 33 |
| total | 8 |
| member3 | 1 |
| member1 | 2 |
| member2 | 1 |

These one-field-away rows come from the cached pre-production baseline proxy. The opportunity ranking uses the confirmed post-production browser-analysis counts from `docs/ipad-expanded-browser-baseline.md` and `docs/ipad-browser-post-m3-leverage-review.md`: bonus 5, total 2, member1 1, member3 1.

Detailed one-field-away and two-field-away rows are saved under `tmp/ipad-post-rapidocr-opportunity-reassessment/`.

## Candidate Upper Bound

| exact expected values currently parsed on side | rows |
| --- | ---: |
| 5 / 5 | 36 |
| 4 / 5 | 45 |
| 3 / 5 | 25 |
| 2 / 5 | 5 |
| 1 / 5 | 55 |
| 0 / 5 | 152 |

## Stage3 Without RapidOCR

Stage3 remains the largest unresolved surface: the current production aggregate leaves 156 failed sides overall, and cached all-53 baseline evidence still shows Stage3 as the only position family with no side-level pass before specialized production recoveries. RapidOCR did not create any new accepted R6 rows, so the next Stage3 path should not be another alternate OCR model by default.

## Bundle / Runtime Cost Of Retained RapidOCR Tooling

- Normal production bundle: no production RapidOCR import was added by the readiness work.
- Normal runtime: no ORT/model load occurs in normal OCR.
- Retained diagnostic payload if later productionized: recognizer ONNX 10857958 bytes plus ORT WASM/JS 13840337 bytes.
- Models remain tmp-only and uncommitted.

## Top Five Opportunities

| Rank | Family | affected sides | max net TP ceiling | source | FP risk | scope |
| ---: | --- | ---: | ---: | --- | --- | --- |
| 1 | Stage1/2 strict bonus selection from existing exact candidates | 5 | 5 | existing candidates | low-to-medium; needs exact candidate provenance audit | low |
| 2 | Raw evidence admission for exact values not in slot pools | 96 | 20 | raw evidence reuse | medium; raw text provenance must be mapped to slot/field | medium |
| 3 | Stage1/2 strict total follow-up from existing exact total evidence | 2 | 2 | existing candidates | low but likely low gain after strict-total | low |
| 4 | Stage3 Tesseract candidate reuse without RapidOCR | 106 | 15 | existing candidates | high until Stage3 provenance improves | medium-high |
| 5 | Stage3 v2 OCR/crop architecture with Tesseract only | 106 | 106 | new recognition/capture | high until diagnostic evidence proves stable | high |

## Recommendation

Recommended next investigation: **Stage1/2 strict bonus selection from existing exact candidates**.

This is the best low-cost candidate because it uses existing evidence and has an estimated NET_NEW_TP ceiling of at least 2. It still needs a dedicated runner/browser-equivalent parity task before any production work.

## Production Unchanged Confirmation

This reassessment added only diagnostic reporting. It did not productionize RapidOCR, change iPad recovery semantics, touch smartphone/current-PC/legacy desktop OCR, or alter expected fixtures.

## Fresh Run Attempt

- attempted command: `PLAYWRIGHT_NODE_MODULES="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" node scripts/ipad-browser-expanded-baseline.mjs --runs 1`
- result: stopped-after-confirming-the-current-path-is-too-slow-for-this-turn
- reason: The process reached only IMG_0265 after several minutes; existing two-run 53-fixture production safety artifacts were reused.
