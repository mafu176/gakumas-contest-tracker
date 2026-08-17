# iPad Stage3 RapidOCR OpenCV Preprocessing Parity

This is a diagnostic-only investigation. It does not enable RapidOCR in production and does not change iPad, smartphone, current-PC, or legacy desktop OCR output.

## Baseline

Source commit: `6988ad2 Investigate iPad RapidOCR frozen replay`

Frozen replay baseline:

| Level | Result |
| --- | --- |
| Level 1: Pipeline A tensor -> browser ORT Web | 26 / 26 decoded text parity |
| Level 1 R6-support observations | 19 / 19 text parity |
| Level 2 OLD: Pipeline A crop PNG -> browser canvas preprocessing -> tensor | 0 / 26 tensor checksum parity |
| Frozen R6 | 4 TP / 0 FP |

This confirms ONNX Runtime Web and decoder behavior are not the blocker. The blocker is crop-to-tensor preprocessing.

## Pipeline A Preprocessing

The exact installed source is:

`tmp/rapidocr-python/rapidocr_onnxruntime/ch_ppocr_rec/text_recognize.py`

Function:

`TextRecognizer.resize_norm_img`

Observed code-level semantics:

| Step | Semantics |
| --- | --- |
| Input crop | OpenCV `cv2.imread(..., cv2.IMREAD_COLOR)` / BGR / `uint8` / HWC |
| Channel conversion | None before recognizer preprocessing |
| Recognizer shape | `[3, 48, 320]` |
| Base width ratio | `320 / 48` |
| Per-image ratio | `w / h` |
| Padded width | `int(48 * max(320 / 48, w / h))` |
| Resized width | `ceil(48 * w / h)`, clamped to padded width |
| Resize | `cv2.resize(img, (resized_w, 48))` |
| Interpolation | OpenCV default `INTER_LINEAR` |
| Float conversion | `astype("float32")` after resize |
| Layout | HWC -> CHW via `transpose((2, 0, 1))` |
| Normalization | `/ 255`, `-= 0.5`, `/= 0.5` |
| Padding | `np.zeros((3, 48, padded_w), dtype=np.float32)` |
| Placement | Left-aligned, `padding_im[:, :, 0:resized_w] = resized_image` |
| Batch | `padding_im[np.newaxis, :]` |

OpenCV version from the local RapidOCR environment: `5.0.0`.

## New Diagnostic Artifacts

Command:

```bash
node scripts/ipad-stage3-rapidocr-frozen-replay.mjs
```

Artifacts:

`tmp/ipad-stage3-rapidocr-opencv-preprocessing/`

Key files:

| File | Purpose |
| --- | --- |
| `pipeline-a-stage-metadata.json` | A0-A6 Pipeline A stage hashes, shapes, stats, samples |
| `browser-old-and-parity-stage-metadata.json` | OLD canvas metadata plus PARITY C0-C6 metadata |
| `first-divergence.json` | Earliest A-vs-C mismatch per observation |
| `opencv-resize-reference.json` | Synthetic OpenCV resize oracle fixtures |
| `resize-parity.json` | JS resize-helper comparison against OpenCV oracle |
| `summary.json` | Level 1 / Level 2 aggregate result |
| `recommendation.json` | Whether Level 3 is justified |

## A-vs-C Stages

Pipeline A exports:

| Stage | Meaning |
| --- | --- |
| A0 | raw BGR crop bytes |
| A1 | BGR crop before resize |
| A2 | resized uint8 image |
| A3 | right-padded uint8 image |
| A4 | normalized float HWC diagnostic equivalent |
| A5 | padded CHW float image |
| A6 | final batched Float32 tensor |

Browser PARITY exports the matching C0-C6 stages from the same frozen raw BGR bytes.

## First Divergence

Latest focused run:

| First divergence | Count |
| --- | ---: |
| A2/C2 resize | 26 |

A0/C0 raw crop parity is now 26 / 26. An earlier mismatch was caused by duplicate diagnostic observation ids, not by crop bytes.

## Resize Parity

The current browser helper no longer uses Canvas resize for the PARITY path. It uses a deterministic JS bilinear resize with OpenCV-style half-pixel source mapping and border clamping.

Synthetic OpenCV oracle comparison:

| Result | Count |
| --- | ---: |
| Exact cases | 1 / 5 |
| Max byte delta | 1 |

The remaining mismatch is OpenCV `INTER_LINEAR` byte rounding / fixed-point coefficient behavior, not geometry, channel order, padding, normalization, or layout.

## Padding, Normalization, Layout

Because every real frozen sample first diverges at A2/C2, later stages are downstream of resize mismatch. The implemented PARITY stages nevertheless mirror Pipeline A:

- BGR input
- right padding
- zero padding
- CHW layout
- NCHW batch
- `(byte / 255 - 0.5) / 0.5` normalization

Exact padding/normalization/layout parity can be rechecked after A2 is byte-exact.

## 0.39215692 Delta

`0.39215692` corresponds to about 50 byte levels after the normalization formula:

```text
50 / 255 * 2 = 0.39215686
```

This investigation shows the first real divergence now occurs before normalization at A2/C2 resize. Therefore a delta of that scale maps to different resized uint8 source bytes before float conversion, not to ORT, decoding, or selector logic.

## Level 2 Results

Latest run:

| Path | Tensor checksum parity | Decoded text parity |
| --- | ---: | ---: |
| OLD browser canvas preprocessing | 0 / 26 | not used as parity target |
| PARITY JS BGR preprocessing | 0 / 26 | 23 / 26 |

The PARITY helper materially improves decoded text alignment but has not reached exact tensor parity.

## R6 and IMG_0283

Frozen R6 remains the production-safety reference:

| Case | Result |
| --- | --- |
| Historical Pipeline A frozen R6 | 4 TP / 0 FP |
| Level 1 exact tensor replay | text parity supports the same frozen evidence |
| OLD Level 2 | 0 tensor parity |
| PARITY Level 2 | not sufficient for R6 replay yet |
| IMG_0283 | remains blocked by frozen R6; no filename-specific behavior added |

Level 3 was not run because Level 2 tensor parity remains 0 / 26.

## Performance

The PARITY helper records per-observation elapsed preprocessing plus recognition time in `browser-old-and-parity-stage-metadata.json`. Since A2 parity is not solved, no production performance conclusion should be drawn yet.

## Recommendation

Browser RapidOCR remains viable because Level 1 proved browser ORT Web can reproduce Pipeline A recognition from exact tensors.

The detectorless browser architecture is still blocked at deterministic preprocessing parity:

1. Implement OpenCV `INTER_LINEAR` uint8 resize fixed-point coefficient behavior exactly.
2. Re-run Level 2 until tensor parity approaches 26 / 26.
3. Only then recreate Level 2 R6 and consider Level 3 crop geometry replay.

Production-readiness review is not justified yet.
