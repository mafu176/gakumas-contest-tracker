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

## IMG_9283.png

Expected JSON path: `regression-test/expected/IMG_9283.json`

Status: confirmed fixture; committed in the passing split batch.

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 102964 / 384018 / 122494 | 686279 | visual image confirmation + runner OCR output |
| S1 | enemy | 380332 / 227781 / 202265 | 810378 | visual image confirmation + runner OCR output |
| S2 | self | 824061 / 483384 / 1044188 | 2560470 | visual image confirmation + known correction `IMG_9283.png:stage2` |
| S2 | enemy | 458374 / 834329 / 72665 | 1365368 | visual image confirmation + runner OCR output |
| S3 | self | 177045 / 0 / 0 | 177045 | visual image confirmation + known correction `IMG_9283.png:stage3` |
| S3 | enemy | 63337 / 263411 / 261118 | 640548 | visual image confirmation + runner OCR output |

Manual/browser confirmation notes:

- S2 self is the closest remaining total-only/crown candidate: member sum `2351633` plus visible `+208837` equals `2560470`.
- S3 self is a sparse one-member formation with two empty slots.
- This image now looks useful for future removal proof of `IMG_9283.png:stage2` and `IMG_9283.png:stage3`, but both should be tested separately with `--audit-disable-known-correction`.

## IMG_9285.png

Expected JSON path: `regression-test/expected/IMG_9285.json`

Status: draft/blocker; not committed yet because targeted validation fails.

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 498418 / 320768 / 165542 | 1084411 | visual image confirmation + runner OCR output |
| S1 | enemy | 317359 / 113070 / 132893 | 563322 | visual image confirmation + runner OCR output |
| S2 | self | 1001539 / 721827 / 659907 | 2583580 | visual image confirmation + known correction `IMG_9285.png:stage2` |
| S2 | enemy | 598088 / 281951 / 467563 | 1347602 | visual image confirmation; current runner output is wrong |
| S3 | self | 243617 / 0 / 0 | 292340 | visual image confirmation + known correction `IMG_9285.png:stage3` |
| S3 | enemy | 72249 / 33984 / 27179 | 133412 | visual image confirmation + runner OCR output |

Manual/browser confirmation notes:

- S2 enemy is clearly visible as `598088 / 281951 / 467563`, total `1347602`; the current runner previously returned total `1445690`, so this fixture exposes an existing OCR issue unrelated to the known correction key.
- Validation blocker: `IMG_9285` S2 enemy total expected `1347602`, actual `1445690`.
- S3 self is a sparse one-member formation with visible `+48723`.
- Future removal proof for `IMG_9285.png:stage2` and `IMG_9285.png:stage3` is blocked until the exposed S2 enemy OCR issue is handled or intentionally documented.

## IMG_9282.png

Expected JSON path: `regression-test/expected/IMG_9282.json`

Status: draft/blocker; not committed yet because targeted validation fails.

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 306578 / 352393 / 94156 | 823605 | visual image confirmation + runner OCR output |
| S1 | enemy | 128016 / 192931 / 201276 | 522223 | visual image confirmation + runner OCR output |
| S2 | self | 1204215 / 1259738 / 1086075 | 3801975 | visual image confirmation + known correction `IMG_9282.png:stage2` |
| S2 | enemy | 629383 / 877206 / 270747 | 1777336 | visual image confirmation + runner OCR output |
| S3 | self | 285046 / 0 / 0 | 342055 | visual image confirmation + known correction `IMG_9282.png:stage3` |
| S3 | enemy | 254591 / 273656 / 0 | 528247 | visual image confirmation; current runner output is wrong |

Manual/browser confirmation notes:

- S3 enemy is visually a sparse two-member formation: `254591 / 273656 / -`, total `528247`. The current runner previously selected only `273656`, total `317858`, so this fixture exposes an existing OCR issue.
- Validation blockers: `IMG_9282` S3 enemy member1 expected `254591`, actual `273656`; member2 expected `273656`, actual `0`; total expected `528247`, actual `317858`.
- S2 self is a high-score row with visible `+251947`; member sum plus bonus equals `3801975`.
- Future removal proof for `IMG_9282.png:stage2` and `IMG_9282.png:stage3` is blocked until the exposed S3 enemy OCR issue is handled or intentionally documented.

## IMG_9284.png

Expected JSON path: `regression-test/expected/IMG_9284.json`

Status: confirmed fixture; committed in the passing split batch.

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 294058 / 91830 / 111325 | 497213 | visual image confirmation + runner OCR output |
| S1 | enemy | 163703 / 514118 / 77594 | 858238 | visual image confirmation + runner OCR output |
| S2 | self | 633933 / 745845 / 1003018 | 2583399 | visual image confirmation + known correction `IMG_9284.png:stage2` |
| S2 | enemy | 894065 / 0 / 0 | 894065 | visual image confirmation + known correction `IMG_9284.png:stage2` |
| S3 | self | 322817 / 0 / 0 | 322817 | visual image confirmation + known correction `IMG_9284.png:stage3` |
| S3 | enemy | 523896 / 211497 / 372503 | 1212675 | visual image confirmation + runner OCR output |

Manual/browser confirmation notes:

- S2 enemy and S3 self are sparse one-member formations.
- S2 self is a high-score row with visible `+200603`.
- This image is useful for future proof, but `IMG_9284.png:stage2` is a multi-field key and should not be removed unless both self and enemy sides pass with the key disabled.

## IMG_9268.png

Expected JSON path: `regression-test/expected/IMG_9268.json`

Status: draft/blocker; not committed yet because targeted validation fails.

| Stage | Side | Members | Total | Source |
| --- | --- | --- | ---: | --- |
| S1 | self | 428375 / 227149 / 111124 | 766648 | visual image confirmation + runner OCR output |
| S1 | enemy | 151111 / 476282 / 161555 | 884204 | visual image confirmation + runner OCR output |
| S2 | self | 1479757 / 685860 / 808810 | 3270378 | visual image confirmation + known correction `IMG_9268.png:stage2` |
| S2 | enemy | 1155957 / 872801 / 1073008 | 3101766 | visual image confirmation + runner OCR output |
| S3 | self | 254674 / 42324 / 100984 | 397982 | visual image confirmation + runner OCR output |
| S3 | enemy | 319401 / 258461 / 386247 | 1041358 | visual image confirmation + runner OCR output |

Manual/browser confirmation notes:

- S2 self is a high-score row with visible `+295951`; member sum plus bonus equals `3270378`.
- Validation blocker: `IMG_9268` S3 enemy total expected `1041358`, actual `964109`.
- This is a likely future proof target for `IMG_9268.png:stage2`, but the key should be tested with `--audit-disable-known-correction` before removal.
