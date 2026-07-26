# iPad arithmetic real-browser verification

This report documents the real-browser diagnostic verification path for the iPad Tier C exactly-one arithmetic side selector.

## Command

```bash
node scripts/ocr-test-images.mjs --ipad-arithmetic-side-selection-parity
PLAYWRIGHT_NODE_MODULES=/path/to/node_modules node scripts/ipad-arithmetic-browser-verification.mjs
```

The browser verification script starts or connects to a local Next.js server, opens `/?ipadArithmeticDebug=1`, uploads iPad screenshots through the real file input, runs browser OCR, exports the developer-only iPad arithmetic diagnostics JSON, and compares the accepted Tier C rows against the runner parity artifacts.

Artifacts are written to:

```text
tmp/ipad-arithmetic-real-browser-verification/
```

Generated artifacts are not committed.

## Browser Debug Path

The browser debug path is enabled only by `ipadArithmeticDebug=1`.

For deterministic automation, the debug UI exposes:

- `data-testid="ocr-screenshot-file-input"`
- `data-testid="run-ocr-button"`
- `data-testid="ipad-arithmetic-diagnostics-panel"`
- `data-testid="export-ipad-arithmetic-diagnostics"`
- `data-testid="ipad-arithmetic-diagnostics-json"`

The page also exposes a development-only `window.__IPAD_ARITHMETIC_DIAGNOSTICS__` payload after OCR completes. The payload includes the candidate pools, Tier C proposal, exported JSON content, and a `proposalApplicationAudit` that confirms Tier C proposals are diagnostic-only and are not applied by this path.

The script narrows the diagnostic OCR to one accepted stage/side at a time with:

```text
ipadArithmeticDebugStage=<1|2|3>
ipadArithmeticDebugSide=<self|enemy>
```

This keeps the real-browser OCR workload bounded while still exercising the actual browser upload, canvas preprocessing, Tesseract OCR, diagnostic export, and proposal evaluation path.

## Verification Result

Latest run:

- images processed: 5
- stage/sides compared: 5
- accepted Tier C cases found: 5 / 5
- exact runner/browser diagnostic matches: 0 / 5
- browser wouldApply count: 1 / 5
- real-browser TP by proposal values: 1
- FP: 0
- export JSON mismatches: 0
- output mutation findings: 0
- page errors: 0

Accepted case comparison:

| image | stage | side | runner wouldApply | browser wouldApply | browser proposal value match | note |
| --- | --- | --- | --- | --- | --- | --- |
| IMG_0264.png | 1 | self | yes | no | no | browser member/bonus pools differ; no selected tuple |
| IMG_0278.png | 2 | self | yes | no | yes | browser finds the same tuple, but wouldApply is false because current-primary differs from runner |
| IMG_0317.png | 2 | self | yes | yes | yes | proposal values match; provenance/candidate-pool metadata differs |
| IMG_0792.png | 1 | self | yes | no | no | browser member2 evidence differs; no selected tuple |
| IMG_0796.png | 1 | self | yes | no | no | browser member2 evidence differs; no selected tuple |

The browser console reported repeated Tesseract messages such as "Image too small to scale" for narrow diagnostic crops. These were captured as console diagnostics; they did not produce page errors, but they correlate with browser candidate-pool differences.

## Conclusion

The real browser path is now automated end to end, including upload, OCR, export, and comparison against runner parity artifacts.

However, the real-browser candidate inputs are not yet identical to the runner/browser-equivalent parity evidence. Only one of the five accepted cases reaches `wouldApply` in the real browser diagnostic path. Therefore iPad Tier C productionization is not supported yet.

Recommended next step:

Investigate the browser/runner OCR evidence gap before productionization. The highest-signal areas are narrow diagnostic crops that produce browser-only Tesseract "too small to scale" errors and member-slot candidate differences for IMG_0264, IMG_0792, and IMG_0796.
