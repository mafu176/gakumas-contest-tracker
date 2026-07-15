# Current-PC 7-Digit Split/Drop OCR Investigation

Generated from `tmp/current-pc-ocr-baseline` after `32b4cfd Document current PC grouped raw token boundary`.

This is runner-only evidence analysis. It does not change production OCR, browser OCR, smartphone OCR, legacy desktop OCR, or any fixture values. Expected fixtures are used only to evaluate whether raw evidence would have produced the right answer.

## Summary

- Dataset: 38 current-PC screenshots with expected fixtures
- Baseline: 2 PASS / 36 FAIL / 0 unresolved
- Expected 7-digit member slot failures found: 33
- Glyph/word boxes: not available in the current baseline artifacts; positional evidence is limited to OCR source ROI, token text order (`textIndex`), crop path, and binarized crop path.
- New runner-only simulation added: no
- Production recommendation: do not productionize; collect stronger exact fragment/geometry evidence first.

## Cluster Counts

| cluster | cases | exact 7-digit evidence | exact total evidence | exact bonus evidence | unique equation ready | runner-only simulation justified |
| --- | ---: | --- | --- | --- | --- | --- |
| Clean exact 7-digit candidate present but unselected | 16 | 16/16 | 16/16 | 10/16 | 4/16 | partly covered by existing simulations; no new fragment simulation |
| Partial fragments only | 11 | 0/11 | 11/11 | 7/11 | 0/11 | no |
| Exact digits visible in raw text but unparsed | 4 | 0/4 | 4/4 | 2/4 | 0/4 | no |
| Exact value absent from available evidence | 2 | 0/2 | 2/2 | 1/2 | 0/2 | no |

## Detailed 7-Digit Member Failure Cases

| cluster | screenshot | stage/side/slot | expected -> actual | exact value exists | total / bonus evidence | existing sim coverage | raw/member evidence summary |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Clean exact 7-digit candidate present but unselected | `2026-07-11_223152331.png` | S3 enemy member2 | 1,059,979 -> 305,194 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | - | -; member text: 115,012 1,059,9791,525,970 RY: aL ia +305194 eo Fro all i ey |
| Clean exact 7-digit candidate present but unselected | `2026-07-11_223152331.png` | S3 enemy member3 | 1,525,970 -> 0 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | - | -; member text: 115,012 1,059,9791,525,970 RY: aL ia +305194 eo Fro all i ey |
| Clean exact 7-digit candidate present but unselected | `2026-07-11_223613166.png` | S3 enemy member1 | 1,314,244 -> 43,501 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | - | -; member text: 1,314,244 043,501 841,605 i +262848 F : BN - RE v3 fl. 3 ale Na \| le \| : |
| Clean exact 7-digit candidate present but unselected | `2026-07-11_223950902.png` | S3 self member1 | 1,029,553 -> 809,360 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | ExactRaw, GroupedRaw | fragments 1029; member text: FAP Arr SY SC Yl 1,029,553809,360 723,304 L ‘ ™ |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-11 144846091.png` | S3 self member1 | 1,078,642 -> 705,961 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | Stage3Self | fragments 1078; member text: F APL AA SY FA 1,078,642705,961 667,889 “af +215728 Mg ig o> (La \| |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-11 145038835.png` | S3 self member2 | 1,043,301 -> 875,583 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus no | - | -; member text: FSF FT TPL 899,8551,043,301 875,583 I ii + 708660 ; q 4 aalT 5 To \| CR Da |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-11 145100208.png` | S3 self member1 | 1,107,136 -> 548,299 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | Stage3Self | fragments 1 107; member text: FA pn on PYF 1,107,136548,299 567,465 raf +221427 8 hE |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-11 145126932.png` | S3 self member1 | 1,079,689 -> 419,172 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus no | - | -; member text: FAL ET At 1,079,689419,172 944,928 + 215037 & LEE. ; To \| A |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-12 223701314.png` | S3 self member2 | 1,081,712 -> 237,132 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus no | - | -; member text: gd FAP, TF L£OUPFL 763,7421,081,712 237,132 BNL if +716342 8 Lis, > (La \| A |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-14 060811830.png` | S3 self member2 | 1,103,040 -> 811,714 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | - | -; member text: FAY IE ddd 381,9431,103,040 811,714 BNL if +220608 8 Lis, > (La \| A |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-14 060926190.png` | S3 self member1 | 1,077,558 -> 683,656 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus no | - | fragments 1 077; member text: eT Ty TT Tw 1,077,558 683,656 125,626 x ro py! |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-14 061051531.png` | S3 enemy member3 | 1,221,547 -> 244,309 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | - | fragments 1.221; member text: FAY Fh lr Ay 410,671 349,464 1,221,547 > \ A 5 E . af + 244309 ¥ ! \| a oy bt? Ty w + i: r |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-15 130012999.png` | S3 self member2 | 1,392,453 -> 826,413 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus no | - | -; member text: al Fu af =f § Sa ¥ -r re 835,9221,392,453 826,413 IN Caf +278450 f Lise. Lg \| ] ] he ] |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-15 130019543.png` | S3 self member1 | 1,043,349 -> 632,026 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | Stage3Self | fragments 1 043; member text: FA AL dy 1,043,349632,026 552,609 “af +208669 ol if o> (La \| |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-15 130026795.png` | S3 self member1 | 1,011,663 -> 938,246 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus no | - | fragments 1011; member text: - es TF 7 7 = 7 1,011,663938,246 505,356 fw Tou - L J |
| Clean exact 7-digit candidate present but unselected | `スクリーンショット 2026-07-15 130032877.png` | S3 self member2 | 1,004,964 -> 833,982 | rawCandidates, memberRow, token, rawTextDigits | total yes / bonus yes | - | fragments 1.004; member text: eT TF TT 195,2451,004,964 833,982 BNL if +200992 8 Lis, I Lo \| . b =a |
| Partial fragments only | `2026-07-11_223152331.png` | S3 self member3 | 1,002,602 -> 0 | rawTextDigits | total yes / bonus yes | - | fragments 1,002, 1.002; member text: dy BNF T FWP EPY 808,246 698,916 1,002.60: L ‘ ™ |
| Partial fragments only | `2026-07-11_223426685.png` | S3 self member2 | 1,262,179 -> 859,213 | rawTextDigits | total yes / bonus yes | - | fragments 262,179, 262 179; member text: oe TT FT Tw 903.,4251,262,179 859,213 ’ Caf r252435 ¥ fi Af " y y—1 , 0 > : oe 74 "Te \| \ |
| Partial fragments only | `2026-07-11_223513004.png` | S3 self member2 | 1,262,179 -> 859,213 | rawTextDigits | total yes / bonus yes | - | fragments 262,179, 262 179; member text: oe TT FT Tw 903.,4251,262,179 859,213 ’ Caf r252435 ¥ fi Af " y y—1 , 0 > : oe 74 "Te \| \ |
| Partial fragments only | `2026-07-11_223613166.png` | S3 self member3 | 1,121,803 -> 0 | no | total yes / bonus yes | - | fragments 1,121, 1.121; member text: da AFI WINS T PR 717,313 846,891 1,121.80; L ‘ ™ |
| Partial fragments only | `2026-07-11_223613166.png` | S3 enemy member2 | 1,043,501 -> 841,605 | no | total yes / bonus yes | - | fragments 043,501, 043,501; member text: 1,314,244 043,501 841,605 i +262848 F : BN - RE v3 fl. 3 ale Na \| le \| : |
| Partial fragments only | `2026-07-11_223834078.png` | S3 self member3 | 1,406,672 -> 2,813 | rawTextDigits | total yes / bonus no | - | fragments 1,406, 1.406; member text: ar F= tend Eid ar ih 683,470 941.077 1,406.67. Wl A ad +2813 3 eg iw |
| Partial fragments only | `2026-07-11_223907986.png` | S3 self member3 | 1,130,649 -> 22,612 | no | total yes / bonus no | - | fragments 1,130; member text: -r F a rF FW ban JB 875,583 930,873 1,130,64 Psi +22612 5 . ¢ \| .- |
| Partial fragments only | `2026-07-11_223950902.png` | S3 enemy member2 | 1,091,658 -> 864,388 | rawTextDigits | total yes / bonus no | - | fragments 091,658, 091,658; member text: 764,.8681,091,658 864,388 lL a 218351 ye i & hn Ye ; vo . Th ” ho Fo yf r J ’ : . at’ |
| Partial fragments only | `スクリーンショット 2026-07-14 061325391.png` | S3 self member2 | 1,191,935 -> 883,071 | rawTextDigits | total yes / bonus no | - | fragments 191,935; member text: 1.033,971.,191,935 883,071 SN i + 738387 § fie. i & A ig -~ ] v 'S of = Fam +o 3 Wd |
| Partial fragments only | `スクリーンショット 2026-07-14 061634001.png` | S3 self member1 | 1,275,772 -> 126,492 | no | total yes / bonus yes | - | fragments 1.275; member text: 1.275. 77TA.126,492 344.320 “af +255154 ol if {> Hola \| ad I Fd NV \| kf |
| Partial fragments only | `スクリーンショット 2026-07-14 061634001.png` | S3 self member2 | 1,126,492 -> 255,154 | no | total yes / bonus yes | - | fragments 126,492; member text: 1.275. 77TA.126,492 344.320 “af +255154 ol if {> Hola \| ad I Fd NV \| kf |
| Exact digits visible in raw text but unparsed | `2026-07-11_223714046.png` | S3 self member2 | 1,237,121 -> 25,138 | rawTextDigits | total yes / bonus no | - | -; member text: -r F Sm TUE rF & & Tui 795,5621,237,121,256,92 Psi +25138 5 . ¢ \| .- |
| Exact digits visible in raw text but unparsed | `2026-07-11_223753187.png` | S3 self member1 | 1,072,082 -> 820,114 | rawTextDigits | total yes / bonus yes | - | -; member text: 1.072,082820,114 923,776 raf +214416 ys fi AF " ahaa , Nv PE. .- bar. Agilgh” gp 3 |
| Exact digits visible in raw text but unparsed | `2026-07-11_223834078.png` | S3 enemy member1 | 1,017,535 -> 580,090 | rawTextDigits | total yes / bonus yes | - | -; member text: ey a NF Fp WFP 1.017,535580,090 905,641 a x, di ) |
| Exact digits visible in raw text but unparsed | `スクリーンショット 2026-07-14 061325391.png` | S3 self member1 | 1,033,971 -> 191,935 | rawTextDigits | total yes / bonus no | - | -; member text: 1.033,971.,191,935 883,071 SN i + 738387 § fie. i & A ig -~ ] v 'S of = Fam +o 3 Wd |
| Exact value absent from available evidence | `2026-07-11_223346581.png` | S3 self member2 | 1,360,665 -> 364,665 | no | total yes / bonus yes | - | -; member text: 745,929], 364,665 937,345 ow +272133 Q fi y Ys " y y—1 , 0 > : \| ; i ) § ¥ . \| : a - . } |
| Exact value absent from available evidence | `2026-07-11_223714046.png` | S3 self member3 | 1,256,926 -> 0 | no | total yes / bonus no | - | -; member text: -r F Sm TUE rF & & Tui 795,5621,237,121,256,92 Psi +25138 5 . ¢ \| .- |

## Comparison With Existing Simulations

### `currentPcStage3SelfSevenDigitDisplacementSimulation`

- Covered: `スクリーンショット 2026-07-11 144846091.png` S3 self member1, expected 1,078,642. The member row has a clean leading 7-digit value, selected values match the member2/member3/bonus shift, exact displayed total evidence exists, and there is no competing exact interpretation.
- Covered: `スクリーンショット 2026-07-11 145100208.png` S3 self member1, expected 1,107,136. The member row has a clean leading 7-digit value, selected values match the member2/member3/bonus shift, exact displayed total evidence exists, and there is no competing exact interpretation.
- Covered: `スクリーンショット 2026-07-15 130019543.png` S3 self member1, expected 1,043,349. The member row has a clean leading 7-digit value, selected values match the member2/member3/bonus shift, exact displayed total evidence exists, and there is no competing exact interpretation.

Misses are genuinely different shapes: trailing fragment selected, missing or wrong bonus evidence, missing exact displayed total evidence, exact value in raw text but not candidateized, or multiple competing selected/member interpretations. Weakening the existing Stage3 self simulation would mix displacement with digit repair and is not recommended.

### `currentPcExactRawEquationRecoverySimulation` and `currentPcGroupedRawTokenEvidenceSimulation`

- Among the 33 7-digit member slot failures, one case is already covered by both exact raw and grouped/raw: `2026-07-11_223950902.png` S3 self member1 (`1029553`).
- Other grouped/raw true positives are mostly punctuation-grouped 5-6 digit member recovery or total evidence, not recurring 7-digit split/drop reconstruction.
- Combined unique recovery potential across the existing current-PC simulations remains 8 stage/side cases.

## Recurring Fragment/Split Shapes

| shape | cases | evidence boundary | why no simulation now |
| --- | ---: | --- | --- |
| Clean exact 7-digit exists but selection drops or shifts it | 16 | The exact value is in raw/member-row candidates, and total evidence is usually present. However the surrounding member/bonus role assignment differs by side and sample. | Already partially covered by Stage3 self displacement, exact raw, and grouped/raw. Remaining cases lack one recurring unique selected-shift guard or have missing/wrong bonus evidence. |
| Partial fragments only | 11 | Only suffixes or noisy fragments survive, often `5828`, `22612`, `126492`, or a wrong neighboring member. | Requires digit reconstruction from fragments or OCR repair. No exact concatenation with spatial/glyph evidence appears in at least two samples. |
| Raw text has exact digits but parser does not candidateize them | 4 | The digit sequence can be seen after stripping non-digits, but not as a clean parsed candidate; text order is noisy and no word/glyph boxes are available. | Needs token/glyph geometry or a parser experiment; using expected fixtures to find substrings would be leakage. |
| Exact value absent from evidence | 2 | Neither raw candidates, normalized tokens, nor stripped raw text contain the expected 7-digit value. | Not recoverable without OCR retry/preprocessing improvements. |

## Boundary For a Future Fragment Recovery Simulation

A future `currentPcSevenDigitFragmentRecoverySimulation` should still require all of the following before it exists:

- current-PC source/layout only
- role-specific member ROI provenance
- ordered spatial evidence from OCR tokens or glyph boxes, not just expected-value substring search
- exact digit concatenation into one 7-digit member
- exact displayed total evidence
- exact bonus evidence when bonus is required
- exact equation after reconstruction
- exactly one interpretation and no competing exact interpretation
- zero false positives across all 38 current-PC screenshots

The current artifacts do not satisfy this for two or more confirmed positives. Therefore no new runner-only simulation was added.

## Recommended Next Target

The next useful generalization target is evidence collection, not recovery: capture word/glyph bounding boxes for current-PC member rows or add runner-only alternate preprocessing focused on 7-digit member rows. That would separate ROI clipping, thresholding loss, and segmentation splits without using expected fixtures as recovery input.
