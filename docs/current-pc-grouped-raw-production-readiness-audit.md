# Current-PC Grouped Raw Token Production Readiness Audit

This audit evaluates whether `currentPcGroupedRawTokenEvidenceSimulation` is ready to move from runner-only simulation to a production current-PC OCR recovery rule.

Conclusion: **A. Not ready**. Keep the rule runner-only for now.

No production OCR code was changed. No filename-specific, screenshot-specific, or hard-coded score correction was added.

## Baseline Context

- Latest fixture commit before this audit: `0529b0b Add current PC expected fixtures`
- Current-PC expected fixtures: 48
- Current-PC baseline: 2 PASS / 46 FAIL / 0 unresolved
- Simulation under audit: `currentPcGroupedRawTokenEvidenceSimulation`
- Current simulation result: 10 TP / 0 FP / 11 FN / 267 correctly blocked negatives
- Evaluated current-PC stage/side cases: 288
- Cases with eligible grouped/raw tokens: 250
- Accepted cases: 10
- Rejected cases: 278

## True Positive Accepts

| # | screenshot | stage/side | original selected result | proposed result | grouped/raw token evidence | exact equation | uniqueness / competing interpretations | why safe in runner |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `2026-07-11_223346581.png` | S2 enemy | members 133167 / 45196 / 0; total 178014 | members 178014 / 133167 / 45196; bonus 0; total 356377 | `356 377` -> 356377, space-grouped total ROI `stage2-enemy-total`; `45.196` -> 45196, period-grouped total trace | `178014 + 133167 + 45196 = 356377` | exactly 1 interpretation; no competing interpretation | selected total equation is broken; promoted grouped evidence creates one exact member/total equation |
| 2 | `2026-07-11_223753187.png` | S1 enemy | members 141128 / 0 / 0; total 321942 | members 497467 / 180814 / 141128; bonus 0; total 819409 | `497.467` -> 497467, period-grouped member ROI `stage1-enemy-members`; `814 141` was eligible total trace but not used in equation | `497467 + 180814 + 141128 = 819409` | exactly 1 interpretation; no competing interpretation | role-specific member ROI supplies missing member1 and exact total is already available |
| 3 | `2026-07-11_223950902.png` | S3 self | members 809360 / 723304 / 0; total 2562217 | members 1029553 / 809360 / 723304; bonus 0; total 2562217 | `2 562 217` -> 2562217, space-grouped total ROI `stage3-self-total` | `1029553 + 809360 + 723304 = 2562217` | exactly 1 interpretation; no competing interpretation | exact 7-digit total evidence validates the recovered member set |
| 4 | `2026-07-15_184109879.png` | S3 self | members 742946 / 919939 / 0; total 2762138 | members 742946 / 1099253 / 919939; bonus 0; total 2762138 | `2 762 138` -> 2762138, space-grouped total ROI `stage3-self-total` | `742946 + 1099253 + 919939 = 2762138` | exactly 1 interpretation; no competing interpretation | grouped total evidence makes the clean 3-member equation exact |
| 5 | `2026-07-15_184125225.png` | S2 enemy | members 181666 / 0 / 0; total 375536 | members 193870 / 222682 / 181666; bonus 0; total 598218 | `598.218` -> 598218, period-grouped total ROI `stage2-enemy-total`; `193.870` -> 193870, period-grouped member ROI `stage2-enemy-members` | `193870 + 222682 + 181666 = 598218` | exactly 1 interpretation; no competing interpretation | both recovered total and member evidence have role-specific ROI provenance |
| 6 | `2026-07-15_184158330.png` | S3 enemy | members 976629 / 312109 / 0; total 2325838 | members 976629 / 312109 / 1037100; bonus 0; total 2325838 | `1.037.100` -> 1037100, period-grouped total trace; total evidence uses existing selected total | `976629 + 312109 + 1037100 = 2325838` | exactly 1 interpretation; no competing interpretation | period-grouped 7-digit evidence supplies the missing member and preserves exact selected total |
| 7 | `スクリーンショット 2026-07-11 145215861.png` | S1 enemy | members 98618 / 34333 / 0; total 280413 | members 147462 / 98618 / 34333; bonus 0; total 280413 | `147.462` -> 147462, period-grouped member ROI `stage1-enemy-members`; total trace also has `147 462`, `98.618`, `34.333` | `147462 + 98618 + 34333 = 280413` | exactly 1 interpretation; no competing interpretation | missing member1 is recovered from member ROI and exact selected total remains valid |
| 8 | `スクリーンショット 2026-07-14 061151691.png` | S1 self | members 641744 / 130373 / 128348; total 995223 | members 641744 / 94758 / 130373; bonus 128348; total 995223 | `641.744` -> 641744, `94.758` -> 94758, `130.373` -> 130373 from total trace | `641744 + 94758 + 130373 + 128348 = 995223` | exactly 1 interpretation; no competing interpretation | selected total is exact only after treating 128348 as bonus and recovering 94758 |
| 9 | `スクリーンショット 2026-07-14 061545315.png` | S3 enemy | members 148410 / 526989 / 0; total 797218 | members 121819 / 148410 / 526989; bonus 0; total 797218 | `121.819` -> 121819, period-grouped member ROI `stage3-enemy-members` | `121819 + 148410 + 526989 = 797218` | exactly 1 interpretation; no competing interpretation | member ROI supplies only missing value and selected total validates the equation |
| 10 | `スクリーンショット 2026-07-15 130026795.png` | S3 enemy | members 826565 / 339339 / 0; total 1423151 | members 826565 / 339339 / 257247; bonus 0; total 1423151 | `257.247` -> 257247, period-grouped member ROI `stage3-enemy-members` | `826565 + 339339 + 257247 = 1423151` | exactly 1 interpretation; no competing interpretation | member ROI supplies only missing value and exact selected total validates the equation |

## Rejected Case Audit

| metric | count |
| --- | ---: |
| Total stage/side cases evaluated | 288 |
| Cases with at least one eligible grouped/raw token | 250 |
| Accepted cases | 10 |
| Rejected cases | 278 |

Rejection reason counts:

| reason | count |
| --- | ---: |
| `selected-total-equation-is-not-flagged` | 256 |
| `missing-unique-grouped-token-exact-interpretation` | 131 |
| `selected-result-already-matches-grouped-token-interpretation` | 123 |
| `missing-eligible-grouped-raw-token` | 38 |

Near-boundary cases are the 11 false negatives: they have a real expected mismatch but lack one of the strict production-grade requirements, usually unique exact interpretation or safely candidateized member/bonus evidence. These should remain blocked.

## Token Shape Coverage

Eligible grouped/raw token shape and role counts:

| shape / role | count |
| --- | ---: |
| `period-grouped:total` | 394 |
| `space-grouped:total` | 200 |
| `period-grouped:member` | 13 |
| `space-grouped:member` | 7 |

Digit count breakdown:

| digit count / role | count |
| --- | ---: |
| `5:total` | 84 |
| `6:total` | 434 |
| `7:total` | 76 |
| `5:member` | 1 |
| `6:member` | 19 |

The simulation verifies period-grouped tokens, space-grouped tokens, total-role tokens, member-role tokens, 6-digit values, and 7-digit values. Comma-grouped and plain/current-parser values remain excluded from promotion when they already reach the parsed candidate pool.

Blocked token shape counts confirm this:

| blocked shape / role | count |
| --- | ---: |
| `comma-grouped:total` | 1367 |
| `comma-grouped:member` | 818 |
| `plain-or-current-parser:total` | 255 |
| `plain-or-current-parser:member` | 159 |
| `space-grouped:total` | 56 |
| `period-grouped:total` | 22 |
| `space-grouped:member` | 4 |

The dominant blocked reason is `already-reaches-parsed-candidates`, which is intentional: the simulation should not re-promote normal comma/plain values that the current parser already understands.

## Comparison With Existing Simulations

| simulation | TP | FP | notes |
| --- | ---: | ---: | --- |
| `currentPcStage3SelfSevenDigitDisplacementSimulation` | 3 | 0 | No overlap with grouped/raw accepts. It handles a narrower Stage3 self displacement pattern. |
| `currentPcExactRawEquationRecoverySimulation` | 8 | 0 | 6 of the 10 grouped/raw accepts overlap with this simulation. |
| `currentPcGroupedRawTokenEvidenceSimulation` | 10 | 0 | Adds 4 true positives beyond exact raw equation recovery. |

Unique extra grouped/raw recoveries beyond exact raw:

- `2026-07-11_223753187.png` S1 enemy
- `2026-07-15_184125225.png` S2 enemy
- `2026-07-14 061545315.png` S3 enemy
- `2026-07-15 130026795.png` S3 enemy

Combined unique recoverable stage/side cases across these simulations remain small and exact-evidence constrained. This is promising for future production work, but not enough by itself to skip browser evidence parity.

## Browser / Runner Evidence Parity Audit

The runner-only simulation relies on evidence produced in the current-PC baseline artifact path:

- `debugArtifact.candidateSources.totalDirect`
- `debugArtifact.candidateSources.totalCandidates.traces`
- `debugArtifact.candidateSources.memberCandidates`
- `candidateSourceSummary.totalDirect.tokenAudit`
- `candidateSourceSummary.totalTraceTokenAudit`
- `candidateSourceSummary.memberCandidates.tokenAudit`
- source role labels such as `total-direct`, `total-trace`, and `member-row`
- ROI provenance such as `stage2-enemy-total` and `stage3-enemy-members`
- token fields including `token`, `textIndex`, `shape`, `normalizedValue`, `presentInSourceParsed`, `presentInCurrentParser`, and `punctuationNormalizationOnly`

The production/browser OCR flow currently keeps enough numeric evidence for existing smartphone and desktop guards, but it does **not** carry the same grouped-token provenance through the displayed-result path:

| evidence | runner baseline | browser/UI final path | parity |
| --- | --- | --- | --- |
| raw OCR text | available in debug artifacts and stage text | partially available in local `selfTotalResult.text`, member result text, and correction log text | partial |
| grouped token text | extracted by runner-only `extractNumericLikeTokenAudit` | not extracted in production UI path | missing |
| token shape | `period-grouped`, `space-grouped`, etc. | not preserved | missing |
| token normalized value | preserved in token audit | only parsed numbers survive; punctuation-only values may be lost | missing |
| source ROI | preserved as current-PC baseline artifact path and zone label | fixed zones exist during OCR, but source labels are not carried into final correction helper | partial/missing |
| role provenance | `total-direct`, `total-trace`, `member-row` | not represented as a shared production object | missing |
| positional metadata | ROI rectangle and token `textIndex` | ROI geometry exists locally, token order not stored for grouped tokens | partial/missing |
| final candidate pool | available in runner side analysis | available only as merged number arrays, without token shape/source role | partial |
| exact displayed total evidence | available in `displayedTotalCandidates` plus promoted totals | available numerically if parsed; punctuation-only total evidence may be absent | partial |
| exact member evidence | available from parsed candidates plus promoted member tokens | parsed candidates only; punctuation-only member evidence may be absent | partial |
| exact bonus evidence | available from candidate arrays | available numerically if parsed | partial |

Productionization would therefore require a **late-pass recovery** or a shared production evidence object that captures token audit data before the UI result is finalized. Applying the current simulation directly in `app/lib/ocr.js` or `app/page.js` without that evidence would either be impossible or would force the rule to broaden beyond the audited guard.

There is also an overwrite risk: the browser UI path applies multiple corrections, known corrections, late smartphone recoveries, then whole-result corrections before setting `stageScores`. A current-PC grouped-token recovery would need to run after all selected members/totals are stable but before `stageScores[stage]` is created, with a correction log entry. That exact production integration is not currently proven.

## Production Rule Design If Parity Is Added Later

Suggested name: `currentPcGroupedRawTokenRecovery`.

Required guards:

- current-PC layout only
- accepted grouped token shape only: strict `period-grouped` or `space-grouped`
- role-specific ROI provenance required
- exact normalized numeric value required
- exact displayed total evidence required
- exact member evidence required
- exact bonus evidence required when the equation uses a bonus
- selected result must have `selected-total-not-exact-member-sum-or-member-sum-plus-bonus`
- exactly one exact interpretation
- no competing interpretation
- no filename logic
- no screenshot ID logic
- no hard-coded values
- no near-match inference
- correction log: `currentPcGroupedRawTokenRecovery applied ...`

## Recommendation

Do **not** productionize `currentPcGroupedRawTokenEvidenceSimulation` yet.

The runner-only guard itself looks strong on the 48-sample current-PC baseline: 10 TP, 0 FP. The blocker is production evidence parity, not arithmetic safety. The browser path must first expose the same grouped-token audit evidence in a shared, current-PC-only structure and prove that the final UI output consumes the corrected object without being overwritten.

Recommended next step: implement runner/browser-equivalent evidence plumbing only, still without changing OCR output. Once browser-equivalent artifacts prove parity for the 10 TP cases and negative controls, production recovery can be reconsidered.
