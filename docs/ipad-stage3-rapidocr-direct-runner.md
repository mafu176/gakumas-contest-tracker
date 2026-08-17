# iPad Stage3 RapidOCR Direct Browser Runner

This is a developer-only diagnostic path. It bypasses the normal upload/OCR button flow and does not invoke production OCR, Tesseract, Stage1/Stage2 OCR, Tier C, strict-total, strict-member2, smartphone OCR, current-PC OCR, or legacy desktop OCR.

## Command

```bash
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --only IMG_0265
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --limit 10
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --all
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --limit 10 --roi-variants
```

Supported runner options:

- `--only IMG_0265.png,IMG_0283.png`
- `--from IMG_0283.png`
- `--resume`
- `--limit 10`
- `--all`
- `--runs 2`
- `--base-url http://localhost:3340`
- `--port 3340`
- `--image-timeout-ms 240000`
- `--roi-variants`

Artifacts are written to:

```text
tmp/ipad-stage3-rapidocr-direct-runner/
```

Generated artifacts are diagnostic-only and should not be committed.

## Browser Entry Point

The direct bridge is enabled only by:

```text
?ipadStage3RapidOcrDirect=1
```

When enabled, the page exposes:

```js
window.__IPAD_STAGE3_RAPIDOCR_DIRECT_RUN__({ dataUrl, imageName })
```

The function decodes the image, calls the isolated direct runner, and returns diagnostic JSON. Normal production OCR state is not modified. The Playwright runner passes image data URLs directly to this function and never clicks the production OCR button.

The direct runner uses:

- `app/lib/ipadStage3RapidOcrDirectRunner.js`
- `app/lib/ipadStage3RapidOcrBrowser.js`

The existing browser RapidOCR recognizer implementation is reused for ONNX Runtime Web loading, preprocessing, CTC decoding, grouped-number parsing, crop hashes, candidate rows, and frozen R6 diagnostic evaluation.

## Architecture

Initial architecture is detectorless fixed ROI only:

- Stage3 only.
- Two sides: self and enemy.
- Five fields per side: `member1`, `member2`, `member3`, `bonus`, `total`.
- Total recognizer calls per image: 10.
- Detector model is disabled by query parameter: `ipadStage3RapidOcrDetectorEnabled=0`.

The direct runner records per-image phase timings:

- image decode/layout detection
- ROI crop plan
- model load
- first recognizer call
- remaining recognizer calls
- total 10-field recognizer inference
- R6 evaluation
- total elapsed

Each field export includes:

- Stage3 side/field
- ROI and crop rectangle
- crop hash
- preprocessing checksum and metadata
- raw OCR text
- confidence
- parsed numeric candidates
- grouped-number candidates
- runtime
- candidate provenance

## Results

### Safety Baseline

The existing frozen iPad RapidOCR R6 parity command remains the safety baseline:

```bash
node scripts/ocr-test-images.mjs --ipad-stage3-rapidocr-r6-parity
```

Expected baseline:

- production safety: 119 TP / 0 FP
- frozen offline R6: 4 TP / 0 FP

This direct runner does not change production OCR output.

### IMG_0265 Direct Baseline

Command:

```bash
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --only IMG_0265 --limit 1
```

Result:

- fields: 10
- exact fields: 5 / 10
- member1: 2 / 2
- member2: 0 / 2
- member3: 2 / 2
- bonus: 0 / 2
- total: 1 / 2
- R6: 0 TP / 0 FP
- elapsed: about 2.49 s
- model load: about 1.42 s
- 10-field inference: about 1.06 s

This confirms the direct path completes without the normal OCR/Tesseract workflow. The previous normal-flow detectorless experiment timed out while waiting on the full application OCR path; direct Stage3-only execution is practical.

### 10-Image Fixed ROI Subset

Command:

```bash
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --limit 10
```

Subset:

- `IMG_0265.png`
- `IMG_0283.png`
- `IMG_0491.png`
- `IMG_0273.png`
- `IMG_0264.png`
- `IMG_0268.png`
- `IMG_0296.png`
- `IMG_0792.png`
- `IMG_0798.png`
- `IMG_0801.png`

Result:

| Field | Exact |
| --- | ---: |
| member1 | 18 / 20 |
| member2 | 6 / 20 |
| member3 | 17 / 20 |
| bonus | 0 / 20 |
| total | 14 / 20 |
| all fields | 55 / 100 |

R6:

- wouldApply: 0
- TP: 0
- FP: 0

Runtime:

- total elapsed: about 11.82 s
- average image elapsed: about 1.18 s
- first image includes model load
- warm images generally complete around 0.9-1.45 s

### Full 53-Fixture Fixed ROI Run

Command:

```bash
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --all
```

Result:

| Field | Browser detectorless exact | Offline RapidOCR reference |
| --- | ---: | ---: |
| member1 | 83 / 106 | 70 / 106 |
| member2 | 23 / 106 | 52 / 106 |
| member3 | 74 / 106 | 79 / 106 |
| bonus | 2 / 106 | 53 / 106 |
| total | 62 / 106 | 106 / 106 |
| all fields | 244 / 530 | 360 / 530 |

R6:

- wouldApply: 0
- TP: 0
- FP: 0

Runtime:

- total elapsed: about 44.90 s
- average image elapsed: about 0.85 s
- model load: about 1.60 s on the first image
- warm 10-field inference is generally under 1 s per image

The direct browser recognizer is fast enough for further diagnostic iteration, but fixed ROI recognition quality is not yet sufficient for R6 acceptance.

### Accepted Four Audit

The four offline R6 TP identities were audited:

| Image | Side | Exact fields | R6 |
| --- | --- | ---: | --- |
| `IMG_0265.png` | self | 2 / 5 | blocked |
| `IMG_0265.png` | enemy | 3 / 5 | blocked |
| `IMG_0283.png` | self | 4 / 5 | blocked |
| `IMG_0491.png` | self | 3 / 5 | blocked |

Common block reasons:

- missing total anchor
- total confidence below 0.90
- total anchor too short

### IMG_0283 Audit

With deterministic ROI variants enabled, `IMG_0283.png` has many exact member and total candidates, but bonus candidates remain polluted by side-row text:

- self members: exact candidates present for all three slots
- self total: exact candidate present
- self bonus: exact bonus not present
- enemy members: exact candidates present for all three slots
- enemy total: exact candidate present
- enemy bonus: expected zero is not represented as a positive OCR candidate
- R6: blocked, no proposal applied

This remains a useful blocked control. No filename-specific logic was added.

### Single ROI vs Variant Union

The runner can enable the existing deterministic ROI variants with:

```bash
node scripts/ipad-stage3-rapidocr-direct-browser-runner.mjs --limit 10 --roi-variants
```

The current implementation tests five total variants per field:

- baseline 12% padding
- left trim 6%
- right trim 6%
- horizontal expand 10%
- vertical trim 8%

10-image comparison:

| Mode | Exact fields | R6 TP / FP | Total elapsed |
| --- | ---: | ---: | ---: |
| single fixed ROI | 55 / 100 | 0 / 0 | about 11.82 s |
| 5-variant union | 62 / 100 | 0 / 0 | about 40.09 s |

The variant union improves field coverage by 7 fields but is about 3.4x slower and still produces no R6 acceptance. The next variant experiment should be smaller than the current five-variant set, ideally one or two targeted total/bonus profiles.

## Session Reuse and Stability

The Playwright runner reuses one browser page and one ONNX recognizer runtime across the image batch by default. This is the stable and faster mode:

- recognizer session is created once
- later images reuse the existing browser runtime
- the 53-image run completed without browser crash
- no visible runtime degradation was observed over the batch

No accepted R6 rows were found, so the two-context accepted-row stability check was not applicable in this run.

## Payload

Detectorless direct mode loads only the recognizer-side assets:

- recognizer ONNX: 10,857,958 bytes
- detector ONNX avoided: 4,745,517 bytes

Compared with loading detector + recognizer only, detectorless mode avoids about 30.4% of ONNX model bytes. The classifier model remains outside this direct path.

## Safari and iPad Feasibility

Chromium measurement is promising for runtime:

- fewer model bytes than detector-based RapidOCR
- no detector session
- no Stage1/Stage2 OCR
- warm Stage3 10-field inference usually under 1 s per image on this machine

Safari/iPad feasibility is still unknown:

- ONNX Runtime Web WASM support and memory behavior must be tested on real Safari/iPad.
- Cold start will include model download and recognizer session creation.
- Current fixed ROI recognition is not enough for production; bonus and total capture are the major blockers.

## Recommendation

Do not start production-readiness review yet.

The direct runner proves that browser RapidOCR recognizer-only Stage3 execution is practical when isolated from the normal OCR flow. However:

- R6 remains 0 TP / 0 FP.
- Offline 4 TP cases are still blocked in browser direct mode.
- `IMG_0283` stays blocked.
- bonus evidence is especially weak.
- total evidence is weaker than the offline reference.
- the broad 5-variant union is too expensive for its current gain.

Recommended next step:

Run a diagnostic-only, direct-browser Stage3 total/bonus ROI experiment that keeps the 10-field member fixed ROI baseline but tests a very small number of targeted total/bonus crop/preprocessing alternatives. Keep expected values for scoring only, preserve R6 unchanged, and require FP = 0 before parity work.

Production OCR is unchanged.
