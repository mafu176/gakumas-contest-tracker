# Desktop OCR Investigation

## Current Scope

This document records the desktop OCR investigation setup for DMM PC screenshots.

## Dataset

Desktop screenshots should be stored under:

```text
test-images/desktop/
```

The current desktop investigation dataset contains 15 DMM PC screenshots.

No reviewed expected-value JSON files exist yet, so true numeric pass/fail accuracy is not available. The current report measures structural extraction coverage only.

## OCR Source Support

The OCR regression runner now supports two internal sources:

- smartphone
- desktop

Images under `test-images/desktop/` automatically use the desktop source.

## Current Desktop Approach

Desktop mode uses desktop-specific crop regions while keeping the existing OCR recognition and post-processing flow.

This is intentionally investigative only. Smartphone OCR behavior remains unchanged.

## Investigation Result

Command:

```bash
node scripts/ocr-test-images.mjs desktop
```

Result:

- Images: 15
- Expected JSON files: 0
- Full side extraction: 70 / 90
- Total extraction: 71 / 90
- Member slot extraction: 212 / 270

Complete structural extraction was observed for:

- `スクリーンショット 2026-06-02 200840.png`
- `スクリーンショット 2026-06-02 200904.png`

Common failure patterns:

- Stage 3 self side is frequently missing.
- Some Stage 2 self/enemy and Stage 3 enemy sides are also missed.
- Failures look crop-position related rather than post-processing related.

Estimated structural recognition coverage is about 78%. Numeric accuracy still requires manual expected values.

## Recommended Next Step

Manually review the 15 DMM screenshots, create expected JSON files in `regression-test/expected/`, then run:

```bash
node scripts/ocr-test-images.mjs desktop
```

Desktop support should use desktop-specific crop regions with the existing OCR recognition and post-processing pipeline. A separate OCR pipeline does not look necessary yet.
