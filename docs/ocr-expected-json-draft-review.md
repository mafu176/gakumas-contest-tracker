# OCR Expected JSON Draft Review

These expected JSON files are drafts for high-priority mobile OCR images that previously blocked known-correction removal proof.

The values below are intended for runner proof and review. Values marked as runner-derived should still be manually/browser confirmed before using them as final authoritative screenshot truth.

## Summary

Created draft expected JSON:

- `regression-test/expected/IMG_9250.json`
- `regression-test/expected/IMG_9254.json`
- `regression-test/expected/IMG_9264.json`
- `regression-test/expected/IMG_9266.json`
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
