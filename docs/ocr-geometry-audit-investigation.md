# OCR Geometry Audit Investigation

Generated: 2026-06-25

## A. Current OCR Data Flow

The production browser OCR path and the regression runner currently follow the same broad OCR shape:

1. Crop a stage/side/total/member zone.
2. Preprocess the crop into a high-contrast image.
3. Run Tesseract OCR.
4. Keep `result.data.text`.
5. Parse numeric candidates from text.
6. Run member/total/crown selection and post-processing.

In production, `app/lib/ocr.js` uses `recognizeOcrZone(...)`, which calls:

```js
Tesseract.recognize(blob, "eng", tesseractOptions)
```

and returns only:

```js
{
  text: result.data.text || "",
  numbers: extractNumbersForZone(result.data.text || "")
}
```

The runner in `scripts/ocr-test-images.mjs` mirrors this pattern. Its local `recognizeOcrZone(...)` also calls `Tesseract.recognize(...)` and returns only text, parsed numbers, and pass metadata.

Current member-order audit output therefore has:

- crop/source-level evidence
- raw OCR text order
- parsed numeric order
- total candidate traces

It does not have word/symbol bounding boxes because neither wrapper preserves Tesseract geometry output.

## B. Where Geometry Is Available Or Lost

Geometry is lost at the OCR wrapper boundary.

The current `Tesseract.recognize(...)` shortcut returns a `data` object containing keys such as `text`, `hocr`, `tsv`, `blocks`, and `layoutBlocks`, but only `text` is enabled by the shortcut path currently used by the app and runner. A scratch probe on `IMG_9240.png` confirmed:

- `data.text` is populated.
- `data.words` is not present.
- `data.blocks` is `null` when using the shortcut.
- `data.tsv` and `data.hocr` keys exist but are empty in the current shortcut call.

Tesseract.js v7 supports richer output through the worker API:

```js
const worker = await createWorker("eng");
const result = await worker.recognize(image, options, {
  text: true,
  blocks: true,
  hocr: true,
  tsv: true
});
```

A scratch probe with this worker API returned `data.blocks` as an array with nested paragraphs, lines, words, symbols, confidence, and `bbox` objects. It also returned TSV/HOCR geometry text.

Example evidence from an `IMG_9240.png` Stage3 self crop:

- line bbox for the member row: `x0=42, y0=85, x1=495, y1=116`
- member-row OCR text: `287,111331,368281,784`
- symbol-level boxes existed for each digit/comma
- one OCR "word" covered the entire merged member row, but symbol geometry exposed x positions inside that word

This means word-level boxes may be coarse when Tesseract merges adjacent scores into one word, but symbol-level geometry is available and could still support slot-order auditing.

## C. Whether Runner-Only Geometry Audit Is Feasible

Recommendation: **A. implement runner-only geometry audit next**.

Runner-only geometry capture is feasible without changing production OCR behavior.

The minimal route is to add an optional audit-only recognition path in `scripts/ocr-test-images.mjs` that uses `createWorker(...).recognize(..., { blocks: true, hocr: true, tsv: true })` only when geometry audit output is requested or when member-order audit targets are being generated.

This should not be imported by `app/page.js` or `app/lib/ocr.js`.

Important implementation note:

- The existing shortcut `Tesseract.recognize(image, "eng", options)` cannot request `blocks`.
- The runner-only audit path needs `createWorker` because `worker.recognize(image, opts, output)` accepts the `output` argument.

## D. Minimal Implementation Plan If Feasible

1. Keep normal runner OCR unchanged by default.
2. Add a runner-only helper, for example:

```js
async function recognizeOcrZoneWithGeometry(imagePath, zone, options = {}) {
  const image = await createPreprocessedStageBuffer(imagePath, zone, options);
  const worker = await getAuditGeometryWorker();
  const result = await worker.recognize(image, tesseractOptions, {
    text: true,
    blocks: true,
    hocr: true,
    tsv: true
  });
  return {
    text: result.data.text || "",
    numbers: extractNumbersForZone(result.data.text || ""),
    blocks: result.data.blocks || [],
    hocr: result.data.hocr || "",
    tsv: result.data.tsv || ""
  };
}
```

3. Use the helper only for member-order audit targets, not for normal validation.
4. Flatten `blocks -> paragraphs -> lines -> words -> symbols`.
5. Map symbol runs and number-like text spans to:

- crop-relative bbox
- source zone name
- line index
- word index
- symbol x/y range
- confidence

6. Add geometry sections to `docs/ocr-member-order-audit-report.md` or create a separate geometry report.
7. Avoid production changes until the audit proves repeated, safe slot-order evidence.

## E. Risks / Performance Cost

Performance risks:

- Requesting `blocks`, `hocr`, and `tsv` adds CPU and memory cost.
- Creating a worker per zone would be expensive.
- A reusable runner-only audit worker should be used if implemented.

Data quality risks:

- Tesseract may merge adjacent score values into one word.
- Word-level bbox alone may not separate slots.
- Symbol-level bbox appears available and is more useful, but converting symbols into numeric spans requires careful parsing.
- Geometry is crop-relative; reports must preserve the crop zone rectangle to map back to full-image coordinates.

False-positive risks for future production correction:

- Geometry can prove visual order only if number spans are reliably reconstructed.
- Some OCR text may merge values without separators, e.g. `287,111331,368281,784`.
- A production member-order rule should not rely on numeric sorting or text order alone.

## F. Whether Production OCR Behavior Would Be Affected

Production OCR behavior does not need to be affected.

The feasible implementation path is runner-only:

- no changes to `app/page.js`
- no changes to browser preview
- no changes to production result selection
- no changes to known corrections

Changing `app/lib/ocr.js` is not required for the next audit step. If shared helper extraction is desired later, it should be structured so the default production return shape remains unchanged.

## G. Recommendation

Recommendation: **A. implement runner-only geometry audit next**.

Geometry capture is feasible in the test runner through Tesseract.js worker output options. It is not available through the current shortcut call and is currently discarded by both OCR wrappers.

The next step should be audit-only:

1. Add a runner-only geometry recognition helper using `createWorker`.
2. Capture `blocks`/symbol bbox data for the member-order target cases:
   - `IMG_9240.png:stage3`
   - `IMG_9254.png:stage3`
   - `IMG_9281.png:stage3`
3. Report crop-relative and full-image-relative geometry for recognized number spans.
4. Keep production member-order correction disabled until geometry evidence is strong enough.

No production implementation should be attempted yet.
