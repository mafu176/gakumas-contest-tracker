# iPad OCR Architecture Investigation

## Status

This document starts the iPad OCR lane as a separate architecture investigation. It does not claim iPad OCR accuracy yet, and the new runner command is diagnostic-only.

Current diagnostic command:

```bash
node scripts/ocr-test-images.mjs --ipad-ocr-diagnostics <image...>
```

Artifacts are written to:

```text
tmp/ipad-ocr-diagnostics/
```

## Existing OCR Mode Boundaries

### Current-PC

- Detector: `detectCurrentPcLayout(image)` in `app/lib/ocr.js`.
- Current known layout family: `current-pc-2026-07-result`.
- Current detector expects the DMM current-PC screenshot family at approximately `541x961`, aspect `0.562955`.
- Browser path: when the UI is in PC/browser mode and `detectCurrentPcLayout(...)` detects this geometry, `activeOcrMode` becomes `current-pc`.
- Runner path: `--current-pc-baseline` or `--source current-pc` forces `current-pc`.
- Current-PC has its own expected fixtures under `regression-test/expected/current-pc/` and its own diagnostics under `tmp/current-pc-*`.
- Production recoveries are gated to current-PC layout/mode and are separate from smartphone recovery logic.

### Legacy Desktop

- Mode name: `desktop` after `normalizeOcrMode("pc")`.
- Browser path: PC/browser mode stays `desktop` when the current-PC detector does not match.
- Runner path: `--source desktop`.
- Layout uses the `desktop` entry in `getDeviceOcrLayout(...)`.
- Legacy desktop regression samples stay separate from current-PC and smartphone samples.

### Smartphone

- Default runner source is smartphone unless a desktop/current-PC source is selected.
- Browser path uses `activeOcrMode === "smartphone"` for smartphone-specific evidence and recoveries.
- Smartphone layout uses the `smartphone` entry in `getDeviceOcrLayout(...)`.
- Smartphone-specific ROI, row-zone evidence, exact-slot selection, crown-bonus, and stage-wide solver recoveries are gated by `mode === "smartphone"`.
- Smartphone fixtures remain under `regression-test/expected/`.

## iPad Separation Boundary

The iPad OCR path must not silently reuse smartphone production behavior. The new diagnostic detector is:

- `detectIpadOcrLayout(image)`
- returned `deviceMode`: `ipad`
- diagnostic family: `ipad-result-diagnostic-unverified`

The detector is deliberately conservative:

- It excludes the known current-PC `541x961` family.
- It looks for large 4:3-family screenshots by normalized aspect ratio.
- It reports diagnostic confidence only.

At this stage, iPad detection does not modify final `stageScores`, does not apply smartphone recoveries, and does not participate in production OCR.

## Diagnostic Workflow

`--ipad-ocr-diagnostics` accepts one or more image paths and writes per-image artifacts:

- source metadata
- image dimensions and aspect ratio
- detected orientation
- detected OCR mode candidate
- current-PC exclusion/detection data
- estimated stage row positions
- estimated self/enemy side columns
- crop previews
- binarized crop previews
- raw OCR text per crop
- normalized numeric candidates per crop

The estimated iPad geometry is intentionally labeled unverified. It exists only to inspect where real iPad scores appear in image space.

## Fixture Locations

Dedicated iPad fixture folders are reserved:

```text
regression-test/ipad/
regression-test/expected-ipad/
```

Do not move smartphone or current-PC fixtures into these folders. iPad baselines should start only after real iPad screenshots and manually verified expected JSON are available.

## Shared vs Isolated Components

Safe device-independent helpers may be shared later:

- exact arithmetic validation
- crown-bonus rule evaluation
- unique global rank-1 checks
- stage-wide solver proposal uniqueness checks
- exact equality comparison helpers

iPad-specific components must remain isolated until iPad evidence parity is proven:

- layout detection
- ROI coordinates
- preprocessing variants
- candidate generation
- fixture baseline runner
- diagnostics reports
- production recoveries

No smartphone ROI, smartphone row-zone recovery, or smartphone exact-slot recovery should be enabled for iPad by default.

## Recommended Phases

1. Collect real iPad result screenshots in a dedicated folder.
2. Run `--ipad-ocr-diagnostics` and inspect crop/candidate artifacts.
3. Manually create iPad expected fixtures only from screenshot source truth.
4. Calibrate iPad ROI and preprocessing in runner-only diagnostics.
5. Add an iPad baseline command once fixture format is stable.
6. Add runner-only simulations for exact evidence patterns.
7. Add runner/browser-equivalent parity only after simulations show value with zero false positives.
8. Consider production iPad OCR only after parity proves the browser path sees the same evidence.

## Risks of Smartphone Reuse

iPad screenshots may look "mobile" but can differ in:

- canvas aspect ratio
- score row spacing
- left/right score columns
- crown-bonus placement
- text scale and antialiasing
- crop margins around totals and member rows

Reusing smartphone ROI would risk wrong-slot assignment, polluted candidate pools, and recoveries firing from evidence that was never validated for iPad geometry.

## Required Next Inputs

The next useful inputs are real iPad result screenshots with:

- original image files
- device orientation
- manually verified expected values for all 3 stages
- self and enemy member scores
- visible crown bonus side and value
- self and enemy totals

Until those exist, iPad OCR remains an architecture and diagnostics track, not an accuracy claim.
