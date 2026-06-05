# OCR test report

Generated: 2026-06-05T03:06:02.518Z

## Summary

- images: 6, expected: 6, failed: 6
- fewer-members: total 6, expected 6, failed 6, suspicious 6
- next-screen suspicious: 0
- suspicious values include member sum mismatches, raw power values, crown-like raw values, and missing totals.
- 7-digit totals are allowed. 8+ digit candidates remain abnormal.

## Results

| file | category | S1 self | S1 enemy | S2 self | S2 enemy | S3 self | S3 enemy | self total | enemy total | failures | suspicious |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fewer-members/HJ9X-pzbkAAZsBP.jpg | fewer-members | 972,329 | 1,106,745 | 1,140,260 | 644,897 | 1,559,674 | 303,759 | 3,672,263 | 2,055,401 | S3 enemy total: expected 1,006,590 / actual 303,759<br>S3 enemy member1: expected 414,706 / actual 303,759<br>S3 enemy member2: expected 303,759 / actual <br>S3 enemy member3: expected 288,125 / actual  | S1 enemy: member sum mismatch 1,009,513 != 1,106,745<br>S2 self: member sum mismatch 1,035,293 != 1,140,260<br>S2 enemy: member count 2/3<br>S2 enemy: total OCR raw missing<br>S3 self: member sum mismatch 1,439,004 != 1,559,674<br>S3 self: total OCR raw missing<br>S3 enemy: member count 1/3<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9162.png | fewer-members | 648,263 | 368,785 | 542,929 | 59,773 | 566,826 | 144,254 | 1,758,018 | 572,812 | S1 self member3: expected  / actual 100,972<br>S2 enemy total: expected 272,472 / actual 59,773<br>S2 enemy member1: expected 181,039 / actual 59,773<br>S2 enemy member2: expected 59,773 / actual <br>S2 enemy member3: expected 31,660 / actual <br>S3 enemy total: expected 388,509 / actual 144,254<br>S3 enemy member1: expected 181,448 / actual 144,254<br>S3 enemy member2: expected 144,254 / actual <br>S3 enemy member3: expected 62,807 / actual  | S2 self: member sum mismatch 488,134 != 542,929<br>S2 enemy: member count 1/3<br>S3 self: member sum mismatch 480,084 != 566,826<br>S3 self: total OCR raw missing<br>S3 enemy: member count 1/3<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9163.png | fewer-members | 544,861 | 56,973 | 428,775 | 123,530 | 506,403 | 170,770 | 1,480,039 | 351,273 | S1 self total: expected 653,833 / actual 544,861<br>S1 enemy total: expected 357,616 / actual 56,973<br>S1 enemy member1: expected 162,233 / actual 56,973<br>S1 enemy member2: expected 56,973 / actual <br>S1 enemy member3: expected 138,410 / actual <br>S2 enemy total: expected 260,246 / actual 123,530<br>S2 enemy member2: expected 69,768 / actual <br>S2 enemy member3: expected 66,948 / actual  | S1 self: member count 1/3<br>S1 self: total OCR raw missing<br>S1 enemy: member count 1/3<br>S2 self: member sum mismatch 392,109 != 428,775<br>S2 enemy: member count 1/3<br>S3 self: member count 2/3<br>S3 self: member sum mismatch 427,721 != 506,403<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9165.png | fewer-members | 705,662 | 220,305 | 94,205 | 51,744 | 422,946 | 445,207 | 1,222,813 | 717,256 | S1 self member3: expected 120,852 / actual <br>S2 self total: expected 252,883 / actual 94,205<br>S2 self member1: expected 158,678 / actual 78,295<br>S2 self member2: expected 94,205 / actual <br>S2 enemy total: expected 332,234 / actual 51,744<br>S2 enemy member1: expected 88,082 / actual 51,744<br>S2 enemy member2: expected 51,744 / actual <br>S2 enemy member3: expected 160,340 / actual <br>S3 self total: expected 507,535 / actual 422,946 | S1 self: member count 2/3<br>S1 self: member sum mismatch 510,677 != 705,662<br>S2 self: member count 1/3<br>S2 self: member sum mismatch 78,295 != 94,205<br>S2 self: total OCR raw missing<br>S2 enemy: member count 1/3<br>S3 self: member count 1/3<br>S3 self: total OCR raw missing<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9166.png | fewer-members | 280,103 | 233,873 | 165,356 | 172,228 | 619,594 | 176,045 | 1,065,053 | 582,146 | S1 self member3: expected  / actual 31,854<br>S2 self total: expected 198,427 / actual 165,356 | S1 enemy: total OCR raw missing<br>S2 self: member count 1/3<br>S3 self: member sum mismatch 530,948 != 619,594<br>S3 self: total OCR raw missing<br>S3 enemy: member count 2/3<br>S3 enemy: total OCR raw missing |
| fewer-members/IMG_9167.png | fewer-members | 181,066 | 685,829 | 298,263 | 534,795 | 731,747 | 102,466 | 1,211,076 | 1,323,090 | S3 enemy total: expected 301,721 / actual 102,466<br>S3 enemy member1: expected 112,658 / actual 102,466<br>S3 enemy member2: expected 102,466 / actual <br>S3 enemy member3: expected 86,597 / actual  | S1 self: member count 1/3<br>S1 enemy: member sum mismatch 638,062 != 685,829<br>S2 self: member count 2/3<br>S2 self: total OCR raw missing<br>S2 enemy: member sum mismatch 493,393 != 534,795<br>S3 self: member sum mismatch 627,080 != 731,747<br>S3 self: total OCR raw missing<br>S3 enemy: member count 1/3<br>S3 enemy: total OCR raw missing |

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
