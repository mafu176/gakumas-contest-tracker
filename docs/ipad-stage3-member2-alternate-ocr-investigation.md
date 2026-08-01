# iPad Stage3 Member2 Alternate OCR Investigation

## Scope

This is a diagnostic-only investigation for iPad Stage3 `member2` OCR.

It does not change production OCR, the production Tesseract config, iPad ROI geometry, iPad preprocessing, T2 grouped-number parsing, Tier C semantics, candidate ranking, expected fixtures, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Production Baseline

The real-browser production verification was rerun twice before this diagnostic pass.

| Metric | Required | Observed |
| --- | ---: | ---: |
| Images processed | 18 / 18 | 18 / 18 |
| Stage/side PASS | 40 / 108 | 40 / 108 |
| Tier C applications | 24 | 24 |
| TP | 24 | 24 |
| FP | 0 | 0 |
| Stable application rows | 24 / 24 | 24 / 24 |

The baseline matched, so the alternate OCR investigation was allowed to continue.

## Diagnostic Command

```bash
node scripts/ipad-stage3-member2-alternate-ocr-investigation.mjs
```

Artifacts are written under:

```text
tmp/ipad-stage3-member2-alternate-ocr/
```

The script reads the prior browser-native Stage3 member2 crop evidence from:

```text
tmp/ipad-stage3-member2-symbol-segmentation/
```

It records the exact production crop rectangle for all 36 Stage3 member2 fields and saves raw crop hashes. Expected fixtures are used only after candidate generation for scoring.

## Engine Inventory

| Engine | Available | Runtime | Browser path | License / cost | Decision |
| --- | --- | --- | --- | --- | --- |
| Browser Shape Detection `TextDetector` | No | Browser | Would be ideal if present | Platform API | Rejected: unavailable in Playwright Chromium |
| Native Tesseract CLI | No | Node subprocess | No | Apache-2.0, traineddata varies | Rejected: not installed and same OCR family |
| EasyOCR | No | Python | No | Apache-2.0 package, model review needed | Rejected: not installed, large model dependency |
| PaddleOCR | No | Python | No | Apache-2.0 package, model review needed | Rejected: not installed, large model dependency |
| `ocrad.js` | Not installed | Browser/Node JS | Possible technically | GPL-3.0 | Rejected: unsuitable license for production path |
| Windows OCR / platform OCR | Not selected | Native platform | No | Platform | Rejected: not browser-deployable and outside repo runtime |

Repository/runtime packages present:

- `tesseract.js` 7.0.0: current production OCR engine, not an alternate.
- `sharp` 0.34.5: image processing only, not OCR.
- Python packages: `PIL` and `numpy` are present; EasyOCR, PaddleOCR, pytesseract, OpenCV, ONNX Runtime, and RapidOCR are absent.

## Engine Selection

No alternate OCR engine was selected.

This is deliberate. The task allowed at most two engines, but the only near-zero setup browser candidate, `TextDetector`, is unavailable. The only small npm OCR package found by metadata probing, `ocrad.js`, is GPL-3.0 and was rejected as unsuitable for a realistic production architecture path. The Python OCR candidates require large dependency/model installation and do not map to the browser production path.

## Identical Input Verification

The script captured 36 raw Stage3 member2 crop hashes from the exact production crop rectangles recorded by the prior browser-native diagnostic.

| Input | Records | Status |
| --- | ---: | --- |
| Raw production crop | 36 / 36 | SHA-256 recorded |
| Production processed crop bytes | 0 / 36 | Prior diagnostics recorded processed dimensions but did not serialize exact bitmap bytes |
| Alternate engine input crop | 0 / 36 | No engine selected, so no alternate input generated |

The absence of selected engines means no OCR output was generated from the crops. The raw crop hashes still provide a reproducible starting point for a later engine-specific diagnostic.

## Per-Engine Accuracy

No selected engine ran.

| Metric | Result |
| --- | ---: |
| Stage3 member2 fields | 36 |
| Exact expected candidate presence | 0 / 36 |
| Newly recovered fields versus production | 0 |
| Wrong numeric candidate fields | 0 |
| Candidate count | 0 |
| Empty / not-run fields | 36 |

This does not prove that alternate OCR cannot help. It proves that this repository/runtime currently has no acceptable alternate engine available to test without adding a new dependency or model.

## Error Taxonomy

| Category | Count |
| --- | ---: |
| Exact | 0 |
| Substitution | 0 |
| Deletion | 0 |
| Insertion | 0 |
| Leading digit loss | 0 |
| Trailing digit loss | 0 |
| Merged digits | 0 |
| Extra prefix/suffix | 0 |
| Empty / not run | 36 |
| Garbage | 0 |
| Not run because no engine selected | 36 |

Recognition headroom is therefore still unknown, not disproven.

## Tier C Simulation

Because no alternate OCR candidates were produced, diagnostic Tier C is identical to the current production baseline.

| Metric | Result |
| --- | ---: |
| Total Tier C applications | 24 |
| TP | 24 |
| FP | 0 |
| Additional TP beyond current 24 | 0 |
| Lost TP | 0 |
| Multiple-valid-tuple increase | 0 |
| Final stage/side PASS | 40 / 108 |
| Existing PASS sides lost | 0 |

## Addressable 8 Audit

The previous post-T2 analysis estimated up to 8 stage/sides could become addressable if Stage3 member2 evidence improved.

| Metric | Result |
| --- | ---: |
| Prior addressable estimate | 8 |
| Rows audited | 8 |
| Rows with alternate OCR candidate presence | 0 |
| Rows recovered by Tier C | 0 |
| Rows still blocked | 8 / 8 |

All 8 remain blocked because no alternate engine produced raw output.

## Stability

No selected engine was run, so OCR-output stability is not applicable. The inventory, input-hash generation, and no-candidate Tier C simulation completed deterministically.

| Stability item | Result |
| --- | --- |
| Raw output stability | Not applicable |
| Candidate stability | Stable no-candidate result |
| Tier C proposal stability | Stable; no new proposal |
| Runtime variance | Not applicable |
| Initialization variance | Not applicable |

## Runtime And Memory

| Metric | Result |
| --- | ---: |
| Input hashing and inventory runtime | About 5 seconds |
| OCR initialization time | 0 ms |
| Average OCR runtime per field | 0 ms |
| Measured memory impact | Not measured; no engine selected |

## Deployment Feasibility

No engine merits production architecture review from this environment.

- `TextDetector` would be attractive because it is browser-native, but it is unavailable in the tested browser.
- EasyOCR and PaddleOCR may measure recognition headroom in a future offline diagnostic, but they are Python/model-heavy and not a direct iPad browser production path.
- `ocrad.js` is browser-capable but GPL-3.0, so it is not a good production candidate.
- Windows OCR is not usable in an iPad browser architecture.

## Recommendation

Recommended next target:

```text
total candidate capture
```

Reason: no acceptable alternate OCR engine is available in the current repo/runtime. The post-T2 report shows total candidate presence at `68 / 108`, versus bonus candidate presence at `51 / 108`. If Stage3 member2 OCR is paused, total capture has better observed evidence leverage than bonus capture.

A future alternate OCR architecture review is still possible, but it should start with an explicit engine/model decision, license review, and browser-deployment strategy rather than an opportunistic dependency probe.

## Production Isolation

Confirmed unchanged:

- production OCR engine
- production Tesseract config
- iPad ROI
- iPad preprocessing
- T2 parser
- `ENABLE_IPAD_GROUPED_NUMBER_MEMBER_TOKENS`
- Tier C semantics
- candidate ranking
- expected fixtures
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
