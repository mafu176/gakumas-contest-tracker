# PC/DMM OCR Status - 2026-06-29

This is a short status checkpoint for the resumed desktop/PC OCR cleanup. It does not claim browser PASS unless a real browser upload was separately confirmed.

## Asset Summary

- Desktop screenshots present locally: 66 under `test-images/desktop/`
- Desktop expected JSON files present locally: 22 under `regression-test/expected/`
- Most desktop screenshots and restored review assets are still untracked local audit/test materials.

## Confirmed / Continuing Safety Cases

| screenshot | current status | tracked state |
| --- | --- | --- |
| `スクリーンショット 2026-06-07 111709.png` | runner PASS / browser previously confirmed OK | image/fixture local untracked |
| `スクリーンショット 2026-06-07 111730.png` | runner PASS / browser previously confirmed OK; continuing safety check | image/fixture local untracked |
| `スクリーンショット 2026-06-07 111740.png` | browser previously confirmed OK; needs fixture/documentation follow-up | image local untracked |
| `スクリーンショット 2026-06-07 111748.png` | browser previously confirmed OK; needs fixture/documentation follow-up | image local untracked |
| `スクリーンショット 2026-06-07 111757.png` | runner PASS | image/fixture local untracked |

## This Run

Selected next-best screenshots:

| screenshot | before | after | note |
| --- | --- | --- | --- |
| `スクリーンショット 2026-05-31 132838.png` | runner FAIL at S2 enemy: `326409 / 82075 / 23813`, total `497578` | runner PASS | desktop Stage2 enemy now preserves leading member with trailing bonus when total crop picked member1 |
| `スクリーンショット 2026-05-31 132847.png` | runner FAIL at S1 self and S2 enemy | runner PASS | desktop Stage1 self now handles leading three members plus high trailing bonus; S2 enemy still treats leading exact member-sum as displayed total |

## Remaining Desktop Work

| group | status | next action |
| --- | --- | --- |
| Existing expected failures in older PC docs | some are stale after recent desktop fixes | re-run targeted screenshots before trusting old failure text |
| Screenshots without expected JSON | many are structurally complete but not human reviewed | add fixtures only after visual confirmation |
| `132954`, `133010`, `133053`, `200840`, `200846`, `200858`, `200904`, `111816`, `111824`, `224310`, `140301` | fixture-backed or documented candidates with historical failures/fixes | run one-by-one as future focused batches |
| `IMG` mobile OCR | out of PC scope; safety only | keep using selected mobile smoke when PC helper logic changes |

## Rule Added

Desktop-only member-shape handling was narrowed to cases where:

- the OCR mode/source is `desktop`;
- a row has three plausible member values followed by a trailing bonus-like value;
- Stage2 enemy uses the rule only when the total crop picked the leading member and that leading value is not itself explained by the following three values;
- Stage1 self allows the same pattern only for a high trailing bonus shape.

The runner copy and browser path were kept in sync.
