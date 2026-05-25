# OCR test report

Generated: 2026-05-25T03:09:21.028Z

## Summary

- images: 1, expected: 1, failed: 0
- high-score: total 1, expected 1, failed 0, suspicious 1
- high-score suspicious: 1
- next-screen suspicious: 0
- suspicious values include member sum mismatches, raw power values, crown-like raw values, and missing totals.
- 7-digit totals are allowed. 8+ digit candidates remain abnormal.

## Results

| file | category | S1 self | S1 enemy | S2 self | S2 enemy | S3 self | S3 enemy | self total | enemy total | failures | suspicious |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high-score/high2.png | high-score | 766,720 | 359,417 | 1,037,652 | 783,708 | 1,075,396 | 1,158,564 | 2,879,768 | 2,301,689 | none | S1 self: member sum mismatch 689,390 != 766,720<br>S1 self: crown-like raw 77,330<br>S1 enemy: total OCR raw missing<br>S2 self: member sum mismatch 933,524 != 1,037,652<br>S2 self: crown-like raw 104,128, 104,128<br>S3 self: total OCR raw missing<br>S3 enemy: member sum mismatch 1,060,979 != 1,158,564<br>S3 enemy: total OCR raw missing |

## Improvement notes

- High-score images keep 7-digit totals valid.
- Crown bonus values are treated as bonus values, not member scores.
- Total power values are excluded from score candidates.
- 8+ digit joined values are treated as abnormal candidates.
- Next-screen images are unsupported/skipped.
- Normal-result images keep 5-digit member scores valid.

## Known misread patterns

- Rank numbers: 1-6 card rank badges are outside score targets.
- Crown bonus: +number values can be mixed into totals or members.
- Total power: 5-digit power values can appear near score rows.
- Detail button: outside OCR targets.
- Joined values: score/rank/crown concatenation can produce 8+ digits.
- Abnormal digits: 8+ digit values are excluded; 7-digit totals are valid.
