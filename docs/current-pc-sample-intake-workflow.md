# Current-PC OCR Sample Intake Workflow

This workflow is for adding the next batch of DMM/current-PC result screenshots and expected fixtures. It is documentation-only; it does not change OCR output.

## Current State

- Latest analyzed baseline: 48 fixture-backed current-PC screenshots.
- Current production recoveries:
  - `currentPcGroupedRawTokenRecovery`
  - `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery`
- Current conclusion: the remaining 48-sample failures are not safe for more production rules yet. New samples are needed before further productionization.

## Screenshot Location

Place new DMM result screenshots in the normal DMM screenshot folder:

```text
C:\Users\gkhay\Pictures\DMMGamePlayer\学園アイドルマスター
```

The current-PC baseline scanner reads image files directly from this folder. It does not require copying current-PC screenshots into `test-images/`.

## Naming And Layout Assumptions

The current scanner accepts `.png`, `.jpg`, and `.jpeg` files from the DMM folder and then filters by current-PC layout geometry.

Current-PC layout guard:

- width: `541 +/- 2`
- height: `961 +/- 2`
- aspect ratio: within `0.003` of `541 / 961`
- layout family: `current-pc-2026-07-result`

Expected fixture lookup is timestamp-based. For a screenshot named like either of these:

```text
2026-07-11_223152331.png
スクリーンショット 2026-07-11 145038835.png
```

the fixture path is:

```text
regression-test/expected/current-pc/YYYY-MM-DD-NNNNNNNNN.json
```

Examples:

```text
regression-test/expected/current-pc/2026-07-11-223152331.json
regression-test/expected/current-pc/2026-07-11-145038835.json
```

## Duplicate Detection

Run the current-PC baseline scan:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline
```

The scanner computes a SHA-256 hash for each current-PC candidate image and deduplicates exact image duplicates before OCR. Duplicate groups are reported in:

```text
docs/current-pc-ocr-baseline.md
```

Look for:

- `duplicate count`
- `unique current-PC screenshots`
- `Duplicate Groups`

Only one file from an exact duplicate group needs an expected fixture.

## Baseline Artifacts For Manual Reading

The baseline command writes review artifacts under:

```text
tmp/current-pc-ocr-baseline/
```

For each deduplicated screenshot, the artifact folder contains:

- `original.png`
- `annotated-rois.png`
- `analysis.json`
- stage full crops
- stage/side total crops
- stage/side member-row crops
- stage/side bonus crops
- binarized crop variants where available

Use `annotated-rois.png`, the original screenshot, and the role crops to manually read the expected values. Do not copy OCR output blindly into fixtures.

## Expected Fixture Schema

Each current-PC fixture should include all three stages and both sides:

```json
{
  "stage1": {
    "selfMembers": [0, 0, 0],
    "selfBonus": 0,
    "selfTotal": 0,
    "enemyMembers": [0, 0, 0],
    "enemyBonus": 0,
    "enemyTotal": 0
  },
  "stage2": {
    "selfMembers": [0, 0, 0],
    "selfBonus": 0,
    "selfTotal": 0,
    "enemyMembers": [0, 0, 0],
    "enemyBonus": 0,
    "enemyTotal": 0
  },
  "stage3": {
    "selfMembers": [0, 0, 0],
    "selfBonus": 0,
    "selfTotal": 0,
    "enemyMembers": [0, 0, 0],
    "enemyBonus": 0,
    "enemyTotal": 0
  }
}
```

Use `0` for absent bonus. Use three member slots for every side, even when a visual member slot is blank.

## Manual Value Rules

For each stage and side, record:

- member1
- member2
- member3
- crown bonus, if visible
- total

Arithmetic must validate exactly:

```text
member1 + member2 + member3 == total
```

or:

```text
member1 + member2 + member3 + crownBonus == total
```

If the screenshot cannot be read confidently, do not invent a value. Leave the fixture uncommitted and document the blocker in a review note until the value is confirmed.

## Fixture Validation Loop

1. Add or update the fixture under `regression-test/expected/current-pc/`.
2. Run the target screenshot only, using a timestamp filter:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline 223152331
```

3. Check the output and `docs/current-pc-ocr-baseline.md`.
4. If the image is `FAIL`, confirm whether it is a real OCR failure or a fixture mistake.
5. Restore generated tracked reports before committing unless the report update is intentional:

```bash
git restore docs/ocr-test-report.md regression-test/ocr-report.json
```

## Full Baseline Command

After adding a batch of fixtures, run:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline
```

This updates:

- `docs/current-pc-ocr-baseline.md`
- `docs/current-pc-grouped-raw-evidence-parity.md`
- `docs/current-pc-stage3-7digit-bonus-displacement-parity.md`
- generated generic OCR reports
- `tmp/current-pc-ocr-baseline/`

Commit docs only when they are intentional audit outputs. Always restore generic generated reports before commit unless the task explicitly asks to commit them.

## Reading Baseline Status

The baseline separates these cases:

| status | meaning | next action |
| --- | --- | --- |
| `PASS` | OCR result matches expected fixture | no fixture action needed |
| `FAIL` | expected fixture exists and OCR differs | investigate OCR or fixture accuracy |
| `unresolved` | no expected fixture was found | manually read screenshot and add fixture if reliable |
| duplicate group | exact image duplicate detected by hash | fixture only one representative |
| non-current-PC screenshot | file was scanned but rejected by 541x961 layout guard | ignore for current-PC workflow or handle in another OCR path |
| old-PC/legacy desktop | not 541x961 current-PC layout | use legacy desktop workflow, not current-PC baseline |

## Contact Sheets And Crops

There is no separate contact-sheet helper at this time. Use the baseline artifact folders instead:

```text
tmp/current-pc-ocr-baseline/current-pc__<filename>/
```

Recommended manual reading order:

1. open `original.png`
2. open `annotated-rois.png` to confirm the detected stage/side crop locations
3. inspect `stageN-self-members` and `stageN-enemy-members` crops
4. inspect `stageN-self-total` and `stageN-enemy-total` crops
5. inspect bonus crops when the arithmetic requires a crown bonus
6. write the expected JSON only after arithmetic is exact

## New Batch Checklist

For each new screenshot batch:

1. Save images into `C:\Users\gkhay\Pictures\DMMGamePlayer\学園アイドルマスター`.
2. Run `node scripts/ocr-test-images.mjs --current-pc-baseline`.
3. Check duplicate groups and unresolved count in `docs/current-pc-ocr-baseline.md`.
4. For unresolved unique current-PC screenshots, inspect `tmp/current-pc-ocr-baseline/` artifacts.
5. Add expected JSON fixtures under `regression-test/expected/current-pc/`.
6. Validate each fixture with a filtered baseline command.
7. Run the full current-PC baseline after the batch.
8. Run `npm run build` before committing.
9. Restore generated reports that are not intentionally part of the task.
10. Commit only explicit fixture/docs/helper paths; do not use `git add .`.

## When To Stop And Ask For Human Review

Stop before committing a fixture when:

- any visible digit is ambiguous
- the total equation does not validate
- the visible bonus is unclear
- the screenshot is not the current 541x961 layout
- OCR output disagrees with the image but the visual value is not independently confirmable
- the screenshot appears to be a duplicate but the duplicate group is not obvious

## Helper Command Decision

No new helper command is added for this intake round. The existing `--current-pc-baseline` command already performs the useful intake work:

- scans the DMM screenshot folder
- filters current-PC geometry
- deduplicates exact screenshots
- reports missing fixtures as `unresolved`
- writes annotated ROI/crop artifacts for manual reading
- compares fixture-backed screenshots as `PASS` or `FAIL`

If future batches become large enough that manual review is slow, the next small helper should be a runner-only unresolved-image summary that prints fixture paths and artifact directories without rerunning OCR.

