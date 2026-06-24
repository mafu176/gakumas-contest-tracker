# OCR digit-drop audit detector report

Generated: 2026-06-24T04:32:20.881Z

## Scope

This is an audit-only report produced by `scripts/ocr-test-images.mjs`.
It does not change OCR output and is not imported by the browser app.
When `--audit-disable-known-correction` is used, only the test runner skips the selected filename-keyed correction.

## Summary

- images scanned: 4
- possible digit-drop / fragment findings: 1
- high confidence: 0
- medium confidence: 1
- low confidence: 0

## Findings

| image | disabled correction | stage | side | slot | selected | candidate repair | expected | confidence | manual/browser confirmation | reason |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| user-reports/unreviewed/IMG_9243.png | IMG_9243.png:stage2 | S2 | enemy | 1 | 19,217 | 190,814 | 190,814 | medium | required | selected 19217 is a substring of raw candidate 119217 |

## Details

### user-reports/unreviewed/IMG_9243.png S2 enemy member1

- disabled known correction(s): IMG_9243.png:stage2
- selected members: 19217, 100783, 38162
- expected members: 190814, 119217, 100783
- selected total: 158,162
- expected total: 448,976
- raw candidates: 190814, 119217, 100783, 190814, 119217, 100783, 38162
- reason/evidence: selected 19217 is a substring of raw candidate 119217
- confidence: medium
- manual/browser confirmation: required

## Safety Notes

- Findings are diagnostic only; no repair is applied.
- Tiny sparse enemy rows still require manual/signature handling.
- A future production rule should require exact equation support and should avoid inventing digits unless the repaired candidate was observed.
