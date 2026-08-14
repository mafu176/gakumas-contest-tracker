# iPad Stage3 RapidOCR Browser Investigation

This is a diagnostic-only browser-deployability and R6 parity investigation. It does not enable RapidOCR in production, modify the production Tesseract Stage3 OCR path, retune R6, or change iPad Tier C / strict-total / strict-member2.

## Production Safety Baseline

- fixtures: 53
- production recoveries: 119 TP / 0 FP
- Tier C: 72 TP / 0 FP
- strict-total: 15 TP / 0 FP
- strict-member2: 32 TP / 0 FP

## Offline RapidOCR R6 Reproduction

- Stage3 sides: 106
- member1 exact: 70/106
- member2 exact: 52/106
- member3 exact: 79/106
- bonus exact: 53/106
- total exact: 106/106
- R6: 4 TP / 0 FP
- accepted rows: IMG_0265.png S3 self, IMG_0265.png S3 enemy, IMG_0283.png S3 self, IMG_0491.png S3 self
- blocked suffix-fragment control: blocked

## Browser Deployability

- selected architecture: ONNX Runtime Web + WASM
- status: architecture-selected-runtime-not-bundled
- ONNX Runtime Web dependency: not installed
- model assets are tmp-only: yes

| model | bytes | sha256 |
| --- | ---: | --- |
| ch_PP-OCRv4_det_infer.onnx | 4745517 | d2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9 |
| ch_PP-OCRv4_rec_infer.onnx | 10857958 | 48fc40f24f6d2a207a2b1091d3437eb3cc3eb6b676dc3ef9c37384005483683b |
| ch_ppocr_mobile_v2.0_cls_infer.onnx | 585532 | e47acedf663230f8863ff1ab0e64dd2d82b838fceb5957146dab185a89d6215c |

The app exposes a developer-only `?ipadStage3RapidOcrDebug=1` diagnostic export surface. Because the runtime dependency and model assets are intentionally not committed, the browser export reports `blocked-runtime-not-bundled` and does not run inference or alter displayed OCR output.

## R6 Parity

- rows compared: 8
- runner wouldApply: 4
- browser-equivalent wouldApply: 4
- wouldApply disagreements: 0
- proposed recovery disagreements: 0
- safety-relevant mismatches: 0

This parity is shared-helper parity over the frozen RapidOCR artifacts, not real browser ONNX inference. Real browser inference remains blocked until the ONNX Runtime Web/model asset path is added behind the debug flag.

## Recommendation

Do not productionize RapidOCR. Continue only if a future diagnostic task bundles a reviewed `onnxruntime-web` runtime and model assets behind the debug flag, then proves real-browser candidate parity for the four R6 accepted rows and the `IMG_0283.png` Stage3 enemy blocked control.
