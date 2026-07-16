# Current-PC Bonus Evidence Capture Investigation

This investigation follows `docs/current-pc-total-bonus-selection-investigation.md` and focuses on the 30 current-PC rows where selected members are exact, expected total evidence exists, but expected bonus evidence is missing or OCR-confused. It is documentation-only: no OCR behavior is changed and no production rule is enabled.

## Summary

- rows audited: 30
- exact bonus parsed evidence rows: 0 in this blocked set
- exact bonus in raw text but not parsed: 0
- digit-drop / truncated bonus candidate: 13
- plus-marker bonus OCR-confused nearby value: 3
- bonus digits only inside noisy concatenated text: 1
- nearby OCR-confused bonus candidate without exact evidence: 2
- bonus absent from captured evidence: 11

The only exact total + exact bonus case remains `スクリーンショット 2026-07-14 061151691.png` Stage3 self from the previous report. It is a singleton and does not justify a new simulation by itself.

## Cluster Breakdown

| cluster | positives | expected bonus evidence exists | parsing path | equation validation | interpretation uniqueness | simulation justified | production recommendation |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| digit-drop / truncated bonus candidate | 13 | no exact value; usually `+bonus` loses trailing digit(s) | possible future retry/OCR improvement, not safe parsing | expected total validates fixture equation, but bonus is not independently exact | not evidence-complete | no | blocked until bonus OCR captures exact value |
| plus-marker bonus OCR-confused nearby value | 3 | no exact value; nearby value appears after `+` | possible future bonus crop/preprocessing improvement | total evidence exists, nearby bonus creates wrong total | unsafe | no | blocked |
| bonus digits only inside noisy concatenated text | 1 | fragmented text only | possible future token-fragment audit | not exact parsed evidence | singleton and weak | no | blocked |
| nearby OCR-confused bonus candidate | 2 | no exact value | no safe parser-only rule | wrong nearby bonus competes with expected total | unsafe | no | blocked |
| bonus absent from captured evidence | 11 | no | requires better ROI/crop/OCR evidence | cannot infer from total delta | unsafe | no | blocked |

## Digit-Drop / Truncated Bonus Candidate

These rows usually show a visible `+` marker in the member-row OCR text, but the numeric bonus is truncated, such as `+10735` for expected `107359` or `+22707` for expected `227074`.

| image | stage/side | expected bonus | selected bonus | bonus candidates | raw/member evidence snippet |
| --- | --- | ---: | ---: | --- | --- |
| 2026-07-11_223152331.png | S2 self | 107,359 | 10,735 | - | `+10735` |
| 2026-07-15_184117455.png | S2 self | 87,776 | 0 | - | `+8777` |
| 2026-07-15_184125225.png | S2 self | 93,679 | 0 | - | `+9367` |
| 2026-07-15_184150257.png | S2 self | 50,092 | 0 | 5,009 | `+5009` |
| 2026-07-15_184205486.png | S2 self | 48,792 | 0 | - | `+4879` |
| 2026-07-15_184212413.png | S1 self | 135,995 | 13,599 | 13,599 | `+13599` |
| スクリーンショット 2026-07-11 144932916.png | S2 self | 44,301 | 0 | - | `+4430` |
| スクリーンショット 2026-07-11 144932916.png | S3 self | 227,074 | 22,707 | 22,707 | `+22707` |
| スクリーンショット 2026-07-11 144958188.png | S3 self | 160,004 | 16,000 | 16,000 | `+16000` |
| スクリーンショット 2026-07-11 145100208.png | S1 self | 82,695 | 0 | - | `B2695` |
| スクリーンショット 2026-07-14 061545315.png | S3 self | 181,856 | 18,185 | 18,185 | `+18185` |
| スクリーンショット 2026-07-15 130019543.png | S2 self | 51,474 | 0 | 5,147 | `+5147` |
| スクリーンショット 2026-07-15 130038617.png | S2 enemy | 84,714 | 0 | - | `+4714` |

Risk: a rule that appends or repairs trailing digits would be digit-drop inference. The expected total can validate the fixture, but the exact bonus is not independently captured, so this should remain investigation-only.

## Plus-Marker Nearby OCR Confusion

These rows have a visible plus marker and a nearby bonus-like value, but the value is wrong by several digits or small deltas.

| image | stage/side | expected bonus | selected bonus | observed nearby value | evidence snippet |
| --- | --- | ---: | ---: | ---: | --- |
| 2026-07-11_223613166.png | S2 enemy | 77,281 | 77,251 | 77,251 | `+77251` |
| 2026-07-15_184101432.png | S2 self | 120,329 | 120,326 | 120,326 | `+120326` |
| 2026-07-15_184101432.png | S3 enemy | 191,509 | 191,500 | 191,500 | `+ 191500` |

Risk: these are near-looking but not exact. The project should continue rejecting near-match guessing.

## Fragmented Or Noisy Bonus Text

| image | stage/side | expected bonus | selected bonus | evidence |
| --- | --- | ---: | ---: | --- |
| 2026-07-11_223714046.png | S1 self | 99,760 | 0 | member-row text contains a noisy split like `+997 60` |

Risk: this might be recoverable by a future token-fragment detector, but it is a singleton in this cluster and needs geometry/token proof before simulation.

## Nearby OCR-Confused Bonus Candidate

| image | stage/side | expected bonus | selected bonus | observed nearby value | evidence |
| --- | --- | ---: | ---: | ---: | --- |
| スクリーンショット 2026-07-11 145152780.png | S2 self | 66,660 | 68,660 | 68,660 | member-row text has `68660` |
| スクリーンショット 2026-07-14 061051531.png | S1 self | 81,275 | 0 | 80,579 | member value is numerically nearby but not bonus evidence |

Risk: these are not safe for OCR recovery. The second row especially shows why numeric proximity is dangerous: the nearby number is a member score, not bonus evidence.

## Bonus Absent From Captured Evidence

These rows have exact member values and exact total evidence, but the expected bonus is not captured as a reliable parsed value or exact raw text in the current evidence.

| image | stage/side | expected bonus | selected bonus | note |
| --- | --- | ---: | ---: | --- |
| 2026-07-15_184117455.png | S1 enemy | 82,522 | 32,522 | wrong plus value captured |
| 2026-07-15_184150257.png | S1 enemy | 144,245 | 0 | plus marker/noise but no exact bonus |
| 2026-07-15_184212413.png | S3 self | 201,333 | 20,153 | wrong low value captured |
| スクリーンショット 2026-07-11 145018419.png | S2 self | 52,556 | 0 | no exact bonus evidence |
| スクリーンショット 2026-07-11 145215861.png | S1 self | 86,613 | 0 | no exact bonus evidence |
| スクリーンショット 2026-07-12 223719983.png | S1 enemy | 64,291 | 0 | noisy `+0429]1` text, no exact parse |
| スクリーンショット 2026-07-14 060926190.png | S1 self | 153,000 | 133,000 | wrong low value captured |
| スクリーンショット 2026-07-14 061545315.png | S2 enemy | 77,267 | 0 | wrong low value captured |
| スクリーンショット 2026-07-15 130032877.png | S1 self | 98,947 | 0 | no exact bonus evidence |
| スクリーンショット 2026-07-15 130032877.png | S2 enemy | 85,651 | 54,651 | wrong plus value captured |
| スクリーンショット 2026-07-15 130038617.png | S1 enemy | 76,737 | 0 | no exact bonus evidence |

Risk: any recovery here would have to derive `bonus = expectedTotal - memberSum` from a displayed total. That is not independent bonus OCR evidence and can false-positive when the total is a trace artifact or a member/total mix-up.

## Overlap With Existing Recoveries

- `currentPcGroupedRawTokenRecovery` still covers the separate strict grouped/raw exact-equation pattern and remains at 10 applied rows.
- `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery` still covers Stage3 7-digit member/bonus displacement and remains at 8 applied rows.
- Bonus evidence capture would help the 30 total/bonus rows, but only after the exact bonus is independently visible in role-specific evidence. It should not change recovery precedence yet.
- It may also help future grouped/raw candidates by turning currently incomplete equations into exact interpretations, but browser-equivalent parity would be required before any production behavior change.

## Runner-Only Simulation Decision

No runner-only simulation was added. None of the recurring clusters satisfies the required guards:

- at least two positives with exact expected bonus evidence,
- exact expected total evidence,
- exact selected or reconstructable members,
- exact unique equation,
- zero false positives without filename/screenshot logic,
- no near-match or digit-drop inference.

The best evidence-complete positive remains the singleton from the previous report:

- `スクリーンショット 2026-07-14 061151691.png` S3 self
- expected members `862800 / 789450 / 701079`
- expected bonus `172560`
- expected total `2525889`

## Recommended Next Step

The next safest rule is not production recovery. First add runner-only bonus OCR evidence diagnostics:

1. Save and compare all bonus ROI crops and binarized variants for the 30 blocked rows.
2. Add token-level plus-marker extraction for bonus ROI/member-row text, but report it as audit-only.
3. Track whether a candidate is exact, digit-dropped, fragmented, nearby, or absent.
4. Only after two or more rows show exact bonus evidence with unique total equations should a new runner-only simulation be considered.

## Validation Notes

- This report was generated from `tmp/current-pc-ocr-baseline/summary.json` after commit `4b5fea5`.
- This is docs-only, so OCR behavior is unchanged.
