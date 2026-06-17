# OCR test report

Generated: 2026-06-17T00:26:04.884Z

## Summary

- images: 9, expected: 9, failed: 0
- user-reports: total 9, expected 9, failed 0, suspicious 9
- next-screen suspicious: 0
- suspicious values include member sum mismatches, raw power values, crown-like raw values, and missing totals.
- 7-digit totals are allowed. 8+ digit candidates remain abnormal.

## Results

| file | category | S1 self | S1 enemy | S2 self | S2 enemy | S3 self | S3 enemy | self total | enemy total | failures | suspicious |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| user-reports/passed/IMG_8933.png | user-reports | 380,140 | 408,908 | 102,834 | 210,574 | 678,751 | 1,147,912 | 1,161,725 | 1,767,394 | none | S1 enemy: member sum mismatch 358,363 != 408,908<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 195,286 != 210,574<br>S3 self: total OCR raw missing<br>S3 enemy: member sum mismatch 1,040,018 != 1,147,912<br>S3 enemy: total OCR raw missing |
| user-reports/passed/IMG_8934.png | user-reports | 263,148 | 288,711 | 130,680 | 211,472 | 643,096 | 346,123 | 1,036,924 | 846,306 | none | S1 enemy: member sum mismatch 250,206 != 288,711<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 185,490 != 211,472<br>S3 self: member sum mismatch 567,679 != 643,096<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/passed/IMG_9085.png | user-reports | 305,080 | 146,199 | 485,660 | 134,810 | 1,126,424 | 299,045 | 1,917,164 | 580,054 | none | S1 self: member sum mismatch 270,285 != 305,080<br>S2 self: member sum mismatch 420,036 != 485,660<br>S3 self: member sum mismatch 1,025,929 != 1,126,424<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/unreviewed/IMG_9180.png | user-reports | 669,749 | 478,545 | 634,489 | 416,193 | 1,226,296 | 337,219 | 2,530,534 | 1,231,957 | none | S1 self: member sum mismatch 603,307 != 669,749<br>S1 enemy: total OCR raw missing<br>S2 self: member sum mismatch 580,566 != 634,489<br>S3 self: member sum mismatch 1,087,421 != 1,226,296<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/unreviewed/IMG_9203.png | user-reports | 681,964 | 504,573 | 724,562 | 577,963 | 1,069,551 | 245,651 | 2,476,077 | 1,328,187 | none | S1 self: member sum mismatch 611,124 != 681,964<br>S1 enemy: total OCR raw missing<br>S2 self: member sum mismatch 670,608 != 724,562<br>S3 self: member sum mismatch 978,449 != 1,069,551<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/unreviewed/IMG_9211.png | user-reports | 649,435 | 476,686 | 622,177 | 421,868 | 1,558,263 | 640,337 | 2,829,875 | 1,538,891 | none | S1 self: member sum mismatch 591,098 != 649,435<br>S1 self: total OCR raw missing<br>S2 self: member sum mismatch 578,320 != 622,177<br>S3 self: member sum mismatch 1,417,233 != 1,558,263<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/unreviewed/IMG_9222.png | user-reports | 906,199 | 520,396 | 626,841 | 1,279,062 | 864,104 | 996,714 | 2,397,144 | 2,796,172 | none | S1 self: member sum mismatch 791,924 != 906,199<br>S1 self: total OCR raw missing<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 1,172,853 != 1,279,062<br>S3 self: member sum mismatch 773,592 != 864,104<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/unreviewed/IMG_9240.png | user-reports | 1,073,622 | 940,887 | 306,381 | 503,358 | 966,536 | 532,931 | 2,346,539 | 1,977,176 | none | S1 self: member sum mismatch 946,523 != 1,073,622<br>S1 self: total OCR raw missing<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 458,974 != 503,358<br>S3 self: member sum mismatch 900,263 != 966,536<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/unreviewed/IMG_9243.png | user-reports | 707,759 | 553,774 | 454,308 | 448,976 | 1,350,432 | 373,240 | 2,512,499 | 1,375,990 | none | S1 self: member sum mismatch 620,922 != 707,759<br>S1 self: total OCR raw missing<br>S1 enemy: total OCR raw missing<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 410,814 != 448,976<br>S3 self: member sum mismatch 1,237,670 != 1,350,432<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |

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
