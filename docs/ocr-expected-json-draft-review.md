# OCR Expected JSON Draft Review

These expected JSON files are drafts for high-priority mobile OCR images that previously blocked known-correction removal proof.

The values below are intended for runner proof and review. Values marked as runner-derived should still be manually/browser confirmed before using them as final authoritative screenshot truth.

## Summary

Created draft expected JSON:

- `regression-test/expected/IMG_9250.json`
- `regression-test/expected/IMG_9254.json`
- `regression-test/expected/IMG_9264.json`
- `regression-test/expected/IMG_9266.json`
- `regression-test/expected/IMG_9265.json`
- `regression-test/expected/IMG_9267.json`
- `regression-test/expected/IMG_9281.json`

## IMG_9250.png

Expected JSON path: `regression-test/expected/IMG_9250.json`

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 82360 / 124137 / 177424 | 383921 | runner OCR output |
| S1 | enemy | 105866 / 516222 / 361331 | 1086665 | runner OCR output |
| S2 | self | 716655 / 641154 / 168489 | 1526298 | runner OCR output |
| S2 | enemy | 813535 / 805577 / 1026618 | 2851053 | known correction `IMG_9250.png:stage2` |
| S3 | self | 65386 / 18538 / 82030 | 165954 | known correction `IMG_9250.png:stage3` |
| S3 | enemy | 463998 / 0 / 0 | 556797 | known correction `IMG_9250.png:stage3` |

Manual/browser confirmation needed:

- Confirm all runner-derived S1 and S2 self values.
- Confirm S3 self member1 is `65386`, not the previously observed browser misread `165386`.
- Confirm S3 enemy is a sparse one-member side with trailing empty slots.

## IMG_9254.png

Expected JSON path: `regression-test/expected/IMG_9254.json`

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 325945 / 425171 / 101178 | 937328 | runner OCR output |
| S1 | enemy | 138101 / 90788 / 144733 | 373622 | runner OCR output |
| S2 | self | 604184 / 750123 / 61084 | 1565415 | known correction `IMG_9254.png:stage2` |
| S2 | enemy | 33969 / 53156 / 26657 | 113782 | manually confirmed screenshot value |
| S3 | self | 31440 / 28286 / 74178 | 148739 | known correction `IMG_9254.png:stage3` |
| S3 | enemy | 31489 / 36862 / 49140 | 117491 | runner OCR output |

Manual/browser confirmation needed:

- `S2 enemy` was manually confirmed from the screenshot and is covered by the `IMG_9254.png:stage2` known correction.
- Confirm S1 and S3 enemy runner-derived values.

## IMG_9264.png

Expected JSON path: `regression-test/expected/IMG_9264.json`

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 456435 / 358239 / 149872 | 964546 | runner OCR output |
| S1 | enemy | 262055 / 515956 / 265443 | 1146645 | runner OCR output |
| S2 | self | 638016 / 755237 / 0 | 2402568 | runner OCR output, sparse slot explicit as 0 |
| S2 | enemy | 210809 / 1254969 / 891973 | 2608744 | known correction `IMG_9264.png:stage2` |
| S3 | self | 233868 / 20835 / 141986 | 396689 | runner OCR output |
| S3 | enemy | 438665 / 31240 / 0 | 557638 | known correction `IMG_9264.png:stage3` |

Manual/browser confirmation needed:

- S2 self has a crown-included total much larger than the two selected members. Confirm whether the third slot is truly empty and whether a visible bonus accounts for the total.
- Confirm S3 enemy sparse two-member formation and trailing empty slot.

## IMG_9266.png

Expected JSON path: `regression-test/expected/IMG_9266.json`

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 350036 / 383043 / 105632 | 838711 | runner OCR output |
| S1 | enemy | 443721 / 534728 / 356720 | 1442114 | runner OCR output |
| S2 | self | 1089035 / 505323 / 544232 | 2356397 | known correction `IMG_9266.png:stage2` |
| S2 | enemy | 75128 / 912084 / 237123 | 1224335 | runner OCR output |
| S3 | self | 276953 / 62184 / 65747 | 404884 | runner OCR output |
| S3 | enemy | 457164 / 230203 / 231977 | 1010776 | known correction `IMG_9266.png:stage3` |

Manual/browser confirmation needed:

- Confirm S2 enemy and S3 self runner-derived values.
- Confirm S3 enemy total includes the crown bonus as expected by the known correction.

## IMG_9265.png

Expected JSON path: `regression-test/expected/IMG_9265.json`

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 392912 / 315942 / 72195 | 859631 | visual image confirmation + runner OCR output |
| S1 | enemy | 112831 / 125029 / 361819 | 599679 | visual image confirmation + runner OCR output |
| S2 | self | 813754 / 163188 / 726897 | 1703839 | visual image confirmation + runner OCR output |
| S2 | enemy | 958341 / 1283744 / 650240 | 3149073 | visual image confirmation + known correction `IMG_9265.png:stage2` |
| S3 | self | 214463 / 19753 / 67004 | 301220 | visual image confirmation + runner OCR output |
| S3 | enemy | 250041 / 204352 / 204352 | 708753 | visual image confirmation + runner OCR output |

Manual/browser confirmation notes:

- S2 enemy is the total-only bonus case: member sum `2892325` plus visible `+256748` equals total `3149073`.
- S3 enemy has duplicated visible member scores `204352 / 204352`; this was confirmed from the source image rather than assumed from OCR output.

## IMG_9267.png

Expected JSON path: `regression-test/expected/IMG_9267.json`

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 65243 / 310968 / 132524 | 508735 | visual image confirmation + runner OCR output |
| S1 | enemy | 393908 / 116161 / 265540 | 854390 | visual image confirmation; current runner misreads member2 as `16161` |
| S2 | self | 1187687 / 666434 / 696773 | 2788431 | visual image confirmation + known correction `IMG_9267.png:stage2` |
| S2 | enemy | 667979 / 192696 / 675265 | 1535940 | visual image confirmation + runner OCR output |
| S3 | self | 412456 / 54145 / 125425 | 592026 | visual image confirmation + runner OCR output |
| S3 | enemy | 204661 / 477913 / 102032 | 880188 | visual image confirmation + runner OCR output |

Manual/browser confirmation notes:

- S2 self is the total-only bonus case: member sum `2550894` plus visible `+237537` equals total `2788431`.
- S1 enemy is independently visible in the source image as `393908 / 116161 / 265540`, total `854390` with visible `+78781`; current runner output without a known correction reads `16161` and total `675609`, so adding this fixture is expected to expose an existing OCR failure until a separate correction is added.

## IMG_9281.png

Expected JSON path: `regression-test/expected/IMG_9281.json`

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 448574 / 279885 / 179466 | 997639 | runner OCR output |
| S1 | enemy | 419092 / 198274 / 226789 | 844155 | runner OCR output |
| S2 | self | 983877 / 589026 / 634685 | 2207588 | runner OCR output |
| S2 | enemy | 993384 / 814443 / 1015006 | 3025834 | known correction `IMG_9281.png:stage2` |
| S3 | self | 204908 / 112716 / 0 | 317624 | known correction `IMG_9281.png:stage3` |
| S3 | enemy | 343001 / 343056 / 257235 | 1011905 | runner OCR output |

Manual/browser confirmation needed:

- Confirm S1, S2 self, and S3 enemy runner-derived values.
- Confirm S3 self sparse two-member formation.
