# iPad ROI Geometry Investigation

## Summary

- investigation type: diagnostic-only iPad ROI geometry and crop quality
- production OCR behavior changed: no
- smartphone/current-PC/legacy desktop OCR behavior changed: no
- initial broad-crop baseline before this correction: 0 / 18 images, 0 / 54 stages, 0 / 108 stage/sides
- corrected ROI baseline images: 0 / 18 (0%)
- corrected ROI baseline stages: 4 / 54 (7.4%)
- corrected ROI baseline stage/sides: 13 / 108 (12%)

## Root Cause

The original diagnostic iPad baseline used broad stage/side rows whose vertical starts were too low for the visible score table. Total and member text frequently sat above or at the edge of the crop, so the OCR pass mostly saw card art, buttons, or partial score text rather than isolated numeric fields.

## Original Geometry

- Stage rows were estimated at normalized tops `0.14`, `0.40`, and `0.66` with height `0.20`.
- Self/enemy columns were estimated as broad side crops: self `left=0.08 width=0.40`, enemy `left=0.52 width=0.40`.
- The first baseline did not split total, individual member slots, and bonus fields.
- OCR used Tesseract.js `eng` with the existing score preprocessing, mostly page segmentation modes 6/7.

## Corrected Diagnostic Geometry

- Template: `ipad-shared-portrait-v2`.
- Stage total tops: `0.112`, `0.351`, `0.593`.
- Stage member tops: `0.149`, `0.388`, `0.631`.
- Stage bonus tops: `0.166`, `0.405`, `0.648`.
- Self total/member/bonus fields are separated from enemy fields; each member slot now has a distinct field crop.
- The same normalized template is used for both portrait clusters because the 1668x2420 and 1640x2360 screenshots align by normalized score-table coordinates.

## Visual Artifacts

- overlays: `tmp/ipad-roi-investigation/overlays`
- contact sheets: `tmp/ipad-roi-investigation/contact-sheets`
- contact sheet: `tmp/ipad-roi-investigation/contact-sheets/ipad-01 1668x2420.png`
- contact sheet: `tmp/ipad-roi-investigation/contact-sheets/ipad-02 1640x2360.png`

## Crop Classification Counts

Initial broad-crop visual classification: all 108 stage/side crops were vertically late for score-table extraction, and all 108 had no member/bonus/total field split. The corrected template below is field-level; these counts classify OCR evidence from the corrected field crops.

| category | count |
| --- | ---: |
| OCR mismatch | 188 |
| correct region | 204 |
| numeric OCR absent | 148 |

## Per-Cluster Results

| cluster | images | stages | stage/sides | member fields | bonus fields | total fields |
| --- | --- | --- | --- | --- | --- | --- |
| ipad-01 1668x2420 | 0 / 13 (0%) | 3 / 39 (7.7%) | 10 / 78 (12.8%) | 90 / 234 (38.5%) | 21 / 78 (26.9%) | 27 / 78 (34.6%) |
| ipad-02 1640x2360 | 0 / 5 (0%) | 1 / 15 (6.7%) | 3 / 30 (10%) | 42 / 90 (46.7%) | 13 / 30 (43.3%) | 11 / 30 (36.7%) |

## Remaining Error Categories

- Exact OCR is still weak even after fields are better isolated, especially on white member and total text over patterned backgrounds.
- Bonus accuracy is comparatively high because most non-winning sides have true zero bonus and blank bonus crops.
- The dominant next issue is OCR preprocessing/recognition quality for isolated white numeric fields, not arithmetic recovery.

## Recommended Next Experiment

Run a runner-only iPad preprocessing experiment on the isolated field crops. Start with total/member fields only, compare threshold/contrast/upscale variants by exact field accuracy, and keep all arithmetic/crown/solver recoveries disabled until iPad evidence parity exists.

