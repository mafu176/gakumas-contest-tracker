# iPad Stage1/2 Bonus Provenance Verification

Status: diagnostic-only. Production OCR behavior was not changed.

## Production Baseline

| metric | value |
| --- | ---: |
| completed fixtures | 53 |
| stages exact | 58 / 159 |
| stage/sides exact | 162 / 318 |
| production recoveries | 119 TP / 0 FP |
| Tier C | 72 TP / 0 FP |
| strict-total | 15 TP / 0 FP |
| strict-member2 | 32 TP / 0 FP |

The authoritative 53-fixture production summary was reused. The focused candidate/provenance evidence below was captured with the real browser OCR path for the five target images only.

## Five Target Rows

| image | stage | side | production bonus | expected bonus | previous classification | retained-artifact reason |
| --- | ---: | --- | ---: | ---: | --- | --- |
| IMG_0270.png | 1 | enemy | 74 | 0 | recognition | G. No useful expected evidence |
| IMG_0287.png | 1 | enemy | 71 | 0 | recognition | G. No useful expected evidence |
| IMG_0296.png | 2 | enemy | 84 | 84714 | recognition | G. No useful expected evidence |
| IMG_0306.png | 2 | enemy | 4 | 0 | recognition | G. No useful expected evidence |
| IMG_0491.png | 1 | enemy | 1 | 0 | selection | G. No useful expected evidence |

## Browser Capture

- browser base URL: http://127.0.0.1:63001
- runs: 2 fresh Chromium contexts
- source: `window.__IPAD_ARITHMETIC_DIAGNOSTICS__` with `ipadArithmeticDebug=1`
- OCR path: actual browser production OCR path
- production output mutation by this script: none

## Two-Context Stability

| image | stage | side | stability | exact candidate/provenance | same numeric candidates | same policy |
| --- | ---: | --- | --- | --- | --- | --- |
| IMG_0270.png | 1 | enemy | A. identical | yes | yes | yes |
| IMG_0287.png | 1 | enemy | A. identical | yes | yes | yes |
| IMG_0296.png | 2 | enemy | A. identical | yes | yes | yes |
| IMG_0306.png | 2 | enemy | A. identical | yes | yes | yes |
| IMG_0491.png | 1 | enemy | A. identical | yes | yes | yes |

## Reclassification

| image | stage | side | class | exact bonus present | stable exact | arithmetic valid | wouldApply | result |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| IMG_0270.png | 1 | enemy | P4 | no | no | no | no | blocked |
| IMG_0287.png | 1 | enemy | P4 | no | no | no | no | blocked |
| IMG_0296.png | 2 | enemy | P4 | no | no | no | no | blocked |
| IMG_0306.png | 2 | enemy | P4 | no | no | no | no | blocked |
| IMG_0491.png | 1 | enemy | P1 | yes | yes | yes | yes | TP |

Classification legend: P1 exact bonus exists as stable eligible field candidate; P2 exact bonus exists in another generated source; P3 exact bonus exists only as unsafe fragment/noise; P4 exact bonus absent; P5 another field is unresolved; P6 unstable browser evidence.

## True Pure-Selection Ceiling

| metric | value |
| --- | ---: |
| exact bonus present in current browser evidence | 1 / 5 |
| stable exact bonus present | 1 / 5 |
| arithmetic-valid exact bonus | 1 / 5 |
| uniquely arithmetic-valid exact bonus | 1 / 5 |
| survives provenance/fragment/zero safety | 1 / 5 |
| genuinely bonus-only recoverable | 1 / 5 |

## Strict V2 Policy

Policy: **STAGE12_STRICT_BONUS_PROVENANCE_V2**

- Stage1/Stage2 only.
- Uses only existing browser bonus candidates.
- Members and total remain unchanged.
- Requires exactly one eligible bonus candidate satisfying `member1 + member2 + member3 + bonus = displayed total`.
- Non-zero bonus candidates must come from `blue-bonus-mask-3x-psm7`.
- Zero bonus candidates must be observed explicit zero candidates from established bonus profiles; schema-default zero alone is not enough.
- Rejects short non-zero fragments and prefix/suffix fragment relationships.
- Rejects multiple arithmetic-valid candidates.
- No expected values, near-match, or arithmetic-derived candidate generation are used.

| applications | TP | FP | NET_NEW_TP | NET_NEW_FP |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 0 | 1 | 0 |

## Safety Audits

| audit | result |
| --- | ---: |
| zero-bonus rows checked in retained Stage1/2 matrix | 36 |
| zero-bonus browser-verified rows among target set | 4 |
| zero-bonus unsafe non-zero policy applications | 0 |
| fragment-control rows in retained matrix | 63 |
| fragment unsafe applications | 0 |
| small-number rows in retained matrix | 63 |
| small-number unsafe applications | 0 |
| multiple-valid browser rows | 0 |
| multiple-valid unsafe applications | 0 |
| recovery overlap conflicts | 0 |

## Combined Simulation

| metric | current | simulated lower bound |
| --- | ---: | ---: |
| stages exact | 58 / 159 | 59 / 159 |
| stage/sides exact | 162 / 318 | 163 / 318 |
| recovery TP/FP | 119 / 0 | 120 / 0 |

No accepted-case production parity helper or manual real-browser productionization verification was added because the true ceiling remains one TP.

## Closeout

The real-browser evidence confirms only one genuinely recoverable Stage1/2 bonus-selection side. Per the threshold, this family should be closed and not productionized.

Next ranked family: **iPad Stage3 recognition/candidate capture quality**.

Recommended next step: Return to the post-RapidOCR opportunity list and prioritize Stage3 recognition/candidate coverage, where the remaining ceiling is higher than one-field Stage1/2 bonus selection.

