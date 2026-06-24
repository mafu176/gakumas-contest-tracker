# OCR digit-drop audit detector report

Generated: 2026-06-24T05:26:48.663Z

## Scope

This is an audit-only report produced by `scripts/ocr-test-images.mjs`.
It does not change OCR output and is not imported by the browser app.
When `--audit-disable-known-correction` is used, only the test runner skips the selected filename-keyed correction.

## Summary

- images scanned: 10
- possible digit-drop / fragment findings: 1
- high confidence: 0
- medium confidence: 1
- low confidence: 0

## Disabled Known-Correction Batch Classification

Command shape:

```bash
node scripts/ocr-test-images.mjs IMG_9243 IMG_9163 IMG_9283 IMG_9285 IMG_9222 IMG_9240 IMG_9250 IMG_9074 IMG_9245 --audit-disable-known-correction IMG_9243.png:stage2,IMG_9163.png:stage1,IMG_9163.png:stage3,IMG_9283.png:stage3,IMG_9285.png:stage3,IMG_9222.png:stage1,IMG_9240.png:stage1,IMG_9240.png:stage3,IMG_9250.png:stage2,IMG_9074.png:stage2,IMG_9245.png:stage1
```

Expected failures are intentional in this mode. The goal is to observe the pre-known-correction OCR symptoms and raw OCR text/fragments.

| Classification | Count | Correction keys |
| --- | ---: | --- |
| A. safe future generic/removal candidate | 2 | `IMG_9245.png:stage1`, `IMG_9074.png:stage2` |
| B. promising but needs more evidence | 3 | `IMG_9243.png:stage2`, `IMG_9163.png:stage1`, `IMG_9163.png:stage3` |
| C. keep individual for now | 3 | `IMG_9222.png:stage1`, `IMG_9240.png:stage1`, `IMG_9240.png:stage3` |
| D. not enough data / missing expected JSON | 3 | `IMG_9283.png:stage3`, `IMG_9285.png:stage3`, `IMG_9250.png:stage2` |

### Classification Notes

- `IMG_9243.png:stage2` remains the strongest digit-drop / fragment candidate. The runner now captures total-zone fragments such as `448 97 6p` and member-zone text such as `448.976m`, while the selected member `19217` is a substring of raw candidate `119217`.
- `IMG_9163.png:stage1` and `IMG_9163.png:stage3` are promising, but the raw evidence is still fragment-heavy rather than a clean exact equation. They should not be generalized yet.
- `IMG_9245.png:stage1` and `IMG_9074.png:stage2` still match expected output when their filename-keyed correction is disabled, so they are safe candidates for a later removal-only cleanup.
- `IMG_9222.png:stage1`, `IMG_9240.png:stage1`, and `IMG_9240.png:stage3` still fail without their individual corrections. These are mostly crown/member swap, order, or small-delta total cases rather than clean digit-drop recovery cases.
- `IMG_9283.png:stage3`, `IMG_9285.png:stage3`, and `IMG_9250.png:stage2` were useful raw-token audit samples, but this batch lacks expected JSON proof for them, so they remain D until manually registered or browser-confirmed.

### Production Recommendation

Do not implement production digit-drop recovery yet. The raw token report now provides the missing visibility, but a production rule still needs more no-known-correction replays that show:

1. a unique observed raw member triplet,
2. a unique observed or token-supported displayed total,
3. a bonus candidate that completes the equation,
4. no competing sparse/tiny-score interpretation.

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
