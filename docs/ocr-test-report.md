# OCR test report

Generated: 2026-06-05T22:31:00.785Z

## Summary

- images: 6, expected: 6, failed: 2
- fewer-members: total 6, expected 6, failed 2, suspicious 6
- next-screen suspicious: 0
- suspicious values include member sum mismatches, raw power values, crown-like raw values, and missing totals.
- 7-digit totals are allowed. 8+ digit candidates remain abnormal.

## Results

| file | category | S1 self | S1 enemy | S2 self | S2 enemy | S3 self | S3 enemy | self total | enemy total | failures | suspicious |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fewer-members/HJ9X-pzbkAAZsBP.jpg | fewer-members | 972,329 | 1,106,745 | 1,140,260 | 644,897 | 1,559,674 | 1,006,590 | 3,672,263 | 2,758,232 | none | S1 enemy: member sum mismatch 1,009,513 != 1,106,745<br>S2 self: member sum mismatch 1,035,293 != 1,140,260<br>S2 enemy: member count 2/3<br>S2 enemy: total OCR raw missing<br>S3 self: member sum mismatch 1,439,004 != 1,559,674<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9162.png | fewer-members | 648,263 | 368,785 | 542,929 | 272,472 | 566,826 | 388,509 | 1,758,018 | 1,029,766 | none | S1 self: member count 2/3<br>S1 self: member sum mismatch 547,291 != 648,263<br>S2 self: member sum mismatch 488,134 != 542,929<br>S3 self: member sum mismatch 480,084 != 566,826<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9163.png | fewer-members | 660,368 | 357,616 | 428,775 | 250,236 | 427,721 | 170,770 | 1,516,864 | 778,622 | S1 self total: expected 653,835 / actual 660,368<br>S1 self member1: expected 544,861 / actual 6,535<br>S1 self member2: expected  / actual 544,861<br>S1 self member3: expected  / actual 108,972<br>S2 enemy total: expected 260,246 / actual 250,236<br>S2 enemy member3: expected 66,948 / actual 56,938 | S1 self: total OCR raw missing<br>S2 self: member sum mismatch 392,109 != 428,775<br>S3 self: member count 2/3<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9165.png | fewer-members | 705,662 | 220,305 | 252,883 | 300,166 | 422,946 | 445,207 | 1,381,491 | 965,678 | S2 self member2: expected 94,205 / actual 78,295 | S1 self: member sum mismatch 631,529 != 705,662<br>S2 self: member count 2/3<br>S2 self: member sum mismatch 236,973 != 252,883<br>S2 self: total OCR raw missing<br>S3 self: member count 1/3<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9166.png | fewer-members | 280,103 | 233,873 | 198,427 | 172,228 | 619,594 | 176,045 | 1,098,124 | 582,146 | none | S1 self: member count 2/3<br>S1 self: member sum mismatch 248,249 != 280,103<br>S1 enemy: total OCR raw missing<br>S2 self: member count 1/3<br>S2 self: member sum mismatch 165,356 != 198,427<br>S3 self: member sum mismatch 530,948 != 619,594<br>S3 self: total OCR raw missing<br>S3 enemy: member count 2/3<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9167.png | fewer-members | 181,066 | 685,829 | 298,263 | 534,795 | 731,747 | 301,721 | 1,211,076 | 1,522,345 | none | S1 self: member count 1/3<br>S1 enemy: member sum mismatch 638,062 != 685,829<br>S2 self: member count 2/3<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 493,393 != 534,795<br>S3 self: member sum mismatch 627,080 != 731,747<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |

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
