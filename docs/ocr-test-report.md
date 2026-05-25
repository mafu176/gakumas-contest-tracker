# OCR test report

Generated: 2026-05-25T15:20:58.858Z

## Summary

- images: 22, expected: 17, failed: 0
- high-score: total 4, expected 4, failed 0, suspicious 4
- next-screen: total 5, expected 0, failed 0, suspicious 0
- normal-result: total 8, expected 8, failed 0, suspicious 8
- user-reports: total 5, expected 5, failed 0, suspicious 5
- high-score suspicious: 4
- next-screen suspicious: 0
- suspicious values include member sum mismatches, raw power values, crown-like raw values, and missing totals.
- 7-digit totals are allowed. 8+ digit candidates remain abnormal.

## Results

| file | category | S1 self | S1 enemy | S2 self | S2 enemy | S3 self | S3 enemy | self total | enemy total | failures | suspicious |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high-score/high1.png | high-score | 534,463 | 687,231 | 953,048 | 1,378,829 | 820,824 | 801,239 | 2,308,335 | 2,867,299 | none | S1 enemy: member sum mismatch 614,217 != 687,231<br>S1 enemy: total OCR raw missing<br>S1 enemy: crown-like raw 73,014<br>S2 self: total OCR raw missing<br>S2 enemy: crown-like raw 100,709<br>S3 self: total OCR raw missing<br>S3 enemy: member sum mismatch 724,742 != 801,239<br>S3 enemy: total OCR raw missing<br>S3 enemy: crown-like raw 76,497 |
| high-score/high2.png | high-score | 766,720 | 359,417 | 1,037,652 | 783,708 | 1,075,396 | 1,158,564 | 2,879,768 | 2,301,689 | none | S1 self: member sum mismatch 689,390 != 766,720<br>S1 self: crown-like raw 77,330<br>S1 enemy: total OCR raw missing<br>S2 self: member sum mismatch 933,524 != 1,037,652<br>S2 self: crown-like raw 104,128, 104,128<br>S3 self: total OCR raw missing<br>S3 enemy: member sum mismatch 1,060,979 != 1,158,564<br>S3 enemy: total OCR raw missing |
| high-score/high3.png | high-score | 546,760 | 573,909 | 1,140,183 | 1,182,186 | 836,204 | 841,196 | 2,523,147 | 2,597,291 | none | S1 enemy: member sum mismatch 507,170 != 573,909<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 1,096,426 != 1,182,186<br>S2 enemy: crown-like raw 85,760, 85,760<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| high-score/high4.png | high-score | 609,546 | 550,038 | 869,661 | 1,061,552 | 1,159,137 | 1,307,381 | 2,638,344 | 2,918,971 | none | S1 self: member sum mismatch 561,722 != 609,546<br>S1 self: crown-like raw 47,824<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 984,004 != 1,061,552<br>S2 enemy: crown-like raw 77,548, 77,548<br>S3 self: total OCR raw missing<br>S3 enemy: member sum mismatch 1,207,044 != 1,307,381<br>S3 enemy: total OCR raw missing<br>S3 enemy: crown-like raw 100,337 |
| next-screen/next1.png | next-screen |  |  |  |  |  |  |  |  | unsupported/skipped | Next screen is unsupported for OCR. Use normal result or high-score screen. |
| next-screen/next2.png | next-screen |  |  |  |  |  |  |  |  | unsupported/skipped | Next screen is unsupported for OCR. Use normal result or high-score screen. |
| next-screen/next3.png | next-screen |  |  |  |  |  |  |  |  | unsupported/skipped | Next screen is unsupported for OCR. Use normal result or high-score screen. |
| next-screen/next4.jpg | next-screen |  |  |  |  |  |  |  |  | unsupported/skipped | Next screen is unsupported for OCR. Use normal result or high-score screen. |
| next-screen/next5.png | next-screen |  |  |  |  |  |  |  |  | unsupported/skipped | Next screen is unsupported for OCR. Use normal result or high-score screen. |
| normal-result/normal1.jpg | normal-result | 271,520 | 65,559 | 138,451 | 95,056 | 228,141 | 84,591 | 638,112 | 245,206 | none | S1 self: member sum mismatch 250,204 != 271,520<br>S1 self: crown-like raw 21,316<br>S2 self: crown-like raw 11,937<br>S3 self: member sum mismatch 204,741 != 228,141<br>S3 self: total OCR raw missing<br>S3 self: crown-like raw 23,400<br>S3 enemy: total OCR raw missing |
| normal-result/normal2.jpg | normal-result | 252,674 | 51,675 | 155,110 | 83,067 | 205,242 | 128,848 | 613,026 | 263,590 | none | S1 self: member sum mismatch 225,149 != 252,674<br>S1 self: total OCR raw missing<br>S2 self: crown-like raw 18,487, 18,487<br>S3 self: member sum mismatch 188,741 != 205,242<br>S3 self: total OCR raw missing<br>S3 self: crown-like raw 16,501 |
| normal-result/normal3.png | normal-result | 367,757 | 914,658 | 615,529 | 697,625 | 686,660 | 797,349 | 1,669,946 | 2,409,632 | none | S1 enemy: member sum mismatch 832,000 != 914,658<br>S2 self: total OCR raw missing<br>S3 self: total OCR raw missing<br>S3 enemy: member sum mismatch 740,535 != 797,349<br>S3 enemy: total OCR raw missing<br>S3 enemy: crown-like raw 56,814 |
| normal-result/normal4.png | normal-result | 490,885 | 524,569 | 370,865 | 429,432 | 650,145 | 354,228 | 1,511,895 | 1,308,229 | none | S2 self: crown-like raw 48,899, 48,899<br>S3 self: total OCR raw missing<br>S3 self: crown-like raw 66,170<br>S3 enemy: total OCR raw missing |
| normal-result/１１.png | normal-result | 184,319 | 114,468 | 140,980 | 68,278 | 772,141 | 208,602 | 1,097,440 | 391,348 | none | S1 self: member sum mismatch 170,707 != 184,319<br>S1 self: crown-like raw 13,612<br>S2 self: member sum mismatch 126,993 != 140,980<br>S2 self: crown-like raw 13,987<br>S3 self: member sum mismatch 670,061 != 772,141<br>S3 self: total OCR raw missing<br>S3 self: crown-like raw 102,080<br>S3 enemy: total OCR raw missing |
| normal-result/１２.png | normal-result | 281,949 | 138,203 | 148,411 | 77,540 | 973,653 | 142,519 | 1,404,013 | 358,262 | none | S1 self: member sum mismatch 255,866 != 281,949<br>S2 self: member sum mismatch 132,137 != 148,411<br>S3 self: member sum mismatch 849,162 != 973,653<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| normal-result/１３.png | normal-result | 298,072 | 206,967 | 130,373 | 358,837 | 944,889 | 252,150 | 1,373,334 | 817,954 | none | S1 self: member sum mismatch 272,000 != 298,072<br>S1 self: total OCR raw missing<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 328,163 != 358,837<br>S3 self: member sum mismatch 825,270 != 944,889<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| normal-result/１４.png | normal-result | 264,506 | 92,737 | 168,670 | 127,066 | 558,362 | 157,403 | 991,538 | 377,206 | none | S1 self: member sum mismatch 243,922 != 264,506<br>S2 self: member sum mismatch 149,061 != 168,670<br>S3 self: member sum mismatch 495,518 != 558,362<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/passed/IMG_8932.png | user-reports | 364,692 | 114,155 | 134,955 | 87,898 | 830,173 | 277,845 | 1,329,820 | 479,898 | none | S1 self: member sum mismatch 334,473 != 364,692<br>S2 self: member sum mismatch 123,984 != 134,955<br>S3 self: member sum mismatch 719,796 != 830,173<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/passed/IMG_8933.png | user-reports | 380,140 | 408,908 | 102,834 | 210,574 | 678,751 | 1,147,912 | 1,161,725 | 1,767,394 | none | S1 enemy: member sum mismatch 358,363 != 408,908<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 195,286 != 210,574<br>S3 self: total OCR raw missing<br>S3 enemy: member sum mismatch 1,040,018 != 1,147,912<br>S3 enemy: total OCR raw missing |
| user-reports/passed/IMG_8934.png | user-reports | 263,148 | 288,711 | 130,680 | 211,472 | 643,096 | 346,123 | 1,036,924 | 846,306 | none | S1 enemy: member sum mismatch 250,206 != 288,711<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 185,490 != 211,472<br>S3 self: member sum mismatch 567,679 != 643,096<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/passed/IMG_8935.png | user-reports | 254,224 | 127,545 | 141,464 | 115,848 | 752,311 | 248,143 | 1,147,999 | 491,536 | none | S1 self: member sum mismatch 227,392 != 254,224<br>S1 self: total OCR raw missing<br>S1 enemy: total OCR raw missing<br>S2 self: member sum mismatch 127,186 != 141,464<br>S3 self: member sum mismatch 657,446 != 752,311<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| user-reports/passed/IMG_8936.png | user-reports | 426,041 | 251,308 | 102,699 | 251,763 | 605,482 | 285,597 | 1,134,222 | 788,668 | none | S1 self: member sum mismatch 388,033 != 426,041<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 230,059 != 251,763<br>S3 self: member sum mismatch 528,604 != 605,482<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |

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
