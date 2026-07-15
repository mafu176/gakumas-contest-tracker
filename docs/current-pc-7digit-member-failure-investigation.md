# Current-PC 7-Digit Member Failure Investigation

Date: 2026-07-16

Baseline source:

- `node scripts/ocr-test-images.mjs --current-pc-baseline`
- Debug artifacts: `tmp/current-pc-ocr-baseline/`
- Current production recovery: `currentPcGroupedRawTokenRecovery`

This is an audit/runner-only report. No production OCR behavior is changed by the new simulation in this investigation.

## Summary

- Current-PC fixtures scanned: 48
- Current baseline result: 2 PASS / 46 FAIL / 0 unresolved
- Stage/side cases where an expected member is 7 digits and is absent from the final selected members: 38
- Existing production grouped/raw recovery remains: 10 recovered stage/side cases, 0 known false positives
- Existing `currentPcStage3SelfSevenDigitDisplacementSimulation`: 3 TP / 0 FP
- New runner-only `currentPcStage3SevenDigitBonusDisplacementSimulation`: 8 TP / 0 FP
- Production recommendation: do not productionize the new simulation yet. It is promising, but it intentionally broadens the older Stage3-self-only simulation to both sides and to middle/trailing 7-digit loss, so browser evidence parity should be proven separately first.

## New Runner-Only Simulation

Name: `currentPcStage3SevenDigitBonusDisplacementSimulation`

Purpose:

- Detect Stage3 current-PC rows where the member-row OCR has a strict ordered sequence:
  `member1, member2, member3, bonus`
- The selected OCR result drops at least one clean 7-digit member.
- The bonus is selected as a member slot.
- Exact displayed total evidence supports:
  `member1 + member2 + member3 + bonus = total`

Strict guards:

- Current-PC Stage3 only
- Both `self` and `enemy` are allowed, but no other stage is allowed
- Proposal must come from member-row OCR numbers at row start index 0
- At least one proposed member must be a clean exact 7-digit value and currently unselected
- Selected non-zero members must appear in order as a subsequence of `[member1, member2, member3, bonus]`
- Selected values must include the proposed bonus
- Proposed bonus must be 50,000-499,999
- Exact displayed total evidence must exist and be non-ambiguous
- Exactly one strict proposal may exist
- Competing exact Stage3 interpretations reject the case
- No filenames, screenshot IDs, hard-coded score values, or near-match inference

## Simulation Results

| Simulation/recovery | TP | FP | Notes |
| --- | ---: | ---: | --- |
| `currentPcGroupedRawTokenRecovery` production | 10 | 0 | Already real-browser verified for representative current-PC samples |
| `currentPcGroupedRawTokenEvidenceSimulation` | 10 | 0 | Same 10 as production recovery |
| `currentPcStage3SelfSevenDigitDisplacementSimulation` | 3 | 0 | Existing runner-only Stage3 self leading-member displacement |
| `currentPcStage3SevenDigitBonusDisplacementSimulation` | 8 | 0 | New runner-only broader Stage3 bonus displacement simulation |
| `currentPcExactRawEquationRecoverySimulation` | 1 | 1 | Still unsafe because one exact raw equation FP remains |

Combined unique recovery potential:

- Production grouped/raw recovery: 10 unique stage/side cases
- Existing Stage3 self simulation: 3 unique stage/side cases
- New Stage3 seven-digit bonus displacement simulation: 8 cases total, 5 unique additions beyond existing Stage3 self simulation
- Exact raw equation simulation: 1 unique TP, but still not production-safe due to 1 FP
- Total unique runner-known recoverable cases if all safe simulations were eventually productionized: 19 including the unsafe exact-raw TP, or 18 excluding exact-raw

## New Simulation TP Cases

| Screenshot | Stage | Side | Expected members | Bonus | Total | Current selected | Current total | Evidence |
| --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |
| `2026-07-11_223152331.png` | S3 | enemy | `115012 / 1059979 / 1525970` | 305194 | 3006155 | `115012 / 305194 / 0` | 3006155 | clean parsed members, member-row evidence, exact total |
| `2026-07-15_184158330.png` | S3 | self | `666499 / 1232791 / 815508` | 246558 | 2961356 | `666499 / 815508 / 246558` | 1728565 | clean parsed member, member-row evidence, exact total |
| `スクリーンショット 2026-07-11 144846091.png` | S3 | self | `1078642 / 705961 / 667889` | 215728 | 2668220 | `705961 / 667889 / 215728` | 1632283 | existing Stage3 self TP, exact total |
| `スクリーンショット 2026-07-11 145100208.png` | S3 | self | `1107136 / 548299 / 567465` | 221427 | 2444327 | `548299 / 567465 / 221427` | 1373739 | existing Stage3 self TP, exact total |
| `スクリーンショット 2026-07-14 060811830.png` | S3 | self | `381943 / 1103040 / 811714` | 220608 | 2517305 | `381943 / 811714 / 220608` | 1414265 | clean parsed member, member-row evidence, exact total |
| `スクリーンショット 2026-07-14 061051531.png` | S3 | enemy | `410671 / 349464 / 1221547` | 244309 | 2225991 | `410671 / 349464 / 244309` | 1004444 | clean parsed member, member-row evidence, exact total |
| `スクリーンショット 2026-07-15 130019543.png` | S3 | self | `1043349 / 632026 / 552609` | 208669 | 2436653 | `632026 / 552609 / 208669` | 1542936 | existing Stage3 self TP, exact total |
| `スクリーンショット 2026-07-15 130032877.png` | S3 | self | `195245 / 1004964 / 833982` | 200992 | 2235183 | `195245 / 833982 / 200992` | 1230219 | clean parsed member, member-row evidence, exact total |

## 7-Digit Failure Clusters

All cases below have at least one expected 7-digit member missing from the final selected members. Full raw OCR text, token audit, ROI provenance, preprocessing provenance, and segmentation provenance are in each case's `tmp/current-pc-ocr-baseline/current-pc__*/analysis.json` file under `candidateSourceSummary`.

| Cluster | Count | Exact 7-digit evidence | Exact total evidence | Unique equation | Simulation justified | Production justified |
| --- | ---: | --- | --- | --- | --- | --- |
| Strict Stage3 bonus displacement | 8 | parsed member-row candidates | yes | yes | yes, added | not yet |
| Exact 7-digit absent or not captured | 13 | no | mixed | no | no | no |
| Grouped/raw suffix-only evidence | 5 | grouped/raw or suffix fragment only | mixed | no | no | no |
| Grouped-token evidence only | 4 | grouped token evidence | mixed | no | no | no |
| Clean 7-digit present, other selection error | 3 | parsed candidate exists | mixed | no | no | no |
| Clean 7-digit plus bonus-as-member but not strict | 2 | parsed candidate exists | partial/ambiguous | no | no | no |
| Clean 7-digit plus blank slot | 2 | parsed candidate exists | mixed | no | no | no |
| Raw-text-only exact | 1 | raw text only | mixed | no | no | no |

## Cluster Case List

### Strict Stage3 Bonus Displacement

These are the 8 new simulation TP rows listed above. They have exact member-row order, exact bonus, exact total, and no competing exact interpretation.

### Exact 7-Digit Absent Or Not Captured

| Screenshot | Stage | Side | Expected | Actual | Notes |
| --- | --- | --- | --- | --- | --- |
| `2026-07-11_223152331.png` | S3 | self | `808246 / 698916 / 1002602`, bonus 0, total 2509764 | `698916 / 0 / 0`, total 808246 | exact `1002602` absent from parsed/grouped/raw evidence |
| `2026-07-11_223346581.png` | S3 | self | `745929 / 1360665 / 937345`, bonus 272133, total 3316072 | `745929 / 364665 / 937345`, total 2047939 | leading digits dropped; exact value absent |
| `2026-07-11_223613166.png` | S3 | self | `717313 / 846891 / 1121803`, bonus 0, total 2686007 | `717313 / 846891 / 0`, total 2686007 | selected total is already correct, member missing |
| `2026-07-11_223613166.png` | S3 | enemy | `1314244 / 1043501 / 841605`, bonus 262848, total 3462198 | `43501 / 841605 / 262848`, total 1147954 | suffix-only symptoms but exact values absent |
| `2026-07-11_223714046.png` | S3 | self | `795562 / 1237121 / 1256926`, bonus 251385, total 3540994 | `795562 / 25138 / 0`, total 3540994 | exact values absent; selected total correct |
| `2026-07-11_223907986.png` | S3 | self | `875583 / 930873 / 1130649`, bonus 226129, total 3163234 | `875583 / 930873 / 22612`, total 1829068 | bonus fragment selected |
| `2026-07-15_184109879.png` | S3 | enemy | `523915 / 1114422 / 1120363`, bonus 224072, total 2982772 | `523915 / 120363 / 224072`, total 868350 | suffix evidence only, exact values absent |
| `2026-07-15_184117455.png` | S3 | self | `1003606 / 1091318 / 1007255`, bonus 218263, total 3320442 | `182467 / 0 / 0`, total 3320442 | exact values absent; selected total correct |
| `2026-07-15_184125225.png` | S3 | enemy | `1098592 / 1043851 / 344952`, bonus 219718, total 2707113 | `43851 / 344952 / 219718`, total 608521 | suffix symptoms, exact values absent |
| `2026-07-15_184133120.png` | S3 | self | `447116 / 958338 / 1064520`, bonus 0, total 2469974 | `447116 / 958338 / 0`, total 2469974 | exact value absent; selected total correct |
| `2026-07-15_184150257.png` | S3 | self | `987319 / 944097 / 1004934`, bonus 200986, total 3137336 | `987319 / 944097 / 20098`, total 1951514 | bonus fragment selected |
| `2026-07-15_184217948.png` | S3 | self | `249725 / 917636 / 1171915`, bonus 0, total 2339276 | `249725 / 917636 / 0`, total 1167361 | exact value absent |
| `スクリーンショット 2026-07-14 061634001.png` | S3 | self | `1275772 / 1126492 / 344320`, bonus 255154, total 3001738 | `126492 / 255154 / 0`, total 3001738 | exact values absent; selected total correct |

### Grouped/Raw Suffix-Only Evidence

| Screenshot | Stage | Side | Expected | Actual | Notes |
| --- | --- | --- | --- | --- | --- |
| `2026-07-11_223426685.png` | S3 | self | `903425 / 1262179 / 859213`, bonus 252435, total 3277252 | `262179 / 859213 / 252435`, total 1373827 | suffix `262179` survives; exact value only grouped/raw |
| `2026-07-11_223513004.png` | S3 | self | `903425 / 1262179 / 859213`, bonus 252435, total 3277252 | `262179 / 859213 / 252435`, total 1373827 | duplicate layout of prior case |
| `2026-07-11_223950902.png` | S3 | enemy | `764868 / 1091658 / 864388`, bonus 218331, total 2939245 | `91658 / 864388 / 218351`, total 1174397 | recent browser shape; grouped/raw has evidence but not a clean parsed candidate |
| `2026-07-15_184205486.png` | S3 | enemy | `881533 / 1196781 / 974861`, bonus 239356, total 3292531 | `196781 / 974861 / 239356`, total 1467329 | suffix-only member evidence |
| `スクリーンショット 2026-07-14 061325391.png` | S3 | self | `1033971 / 1191935 / 883071`, bonus 238387, total 3347364 | `191935 / 883071 / 738387`, total 1813393 | suffix plus bonus confusion |

### Other Remaining Clusters

Grouped-token evidence only:

- `2026-07-11_223753187.png` S3 self
- `2026-07-11_223834078.png` S3 self
- `2026-07-11_223834078.png` S3 enemy
- `2026-07-15_184217948.png` S3 enemy

Clean 7-digit present, other selection error:

- `スクリーンショット 2026-07-11 145038835.png` S3 self
- `スクリーンショット 2026-07-11 145126932.png` S3 self
- `スクリーンショット 2026-07-12 223701314.png` S3 self

Clean 7-digit plus bonus-as-member but not strict:

- `2026-07-15_184133120.png` S3 enemy: exact total exists, but member1 is also wrong (`333676` selected instead of `833676`), so the strict row equation does not hold.
- `スクリーンショット 2026-07-15 130012999.png` S3 self: bonus evidence is off by 40 (`278450` selected vs expected `278490`), so exact bonus evidence is not strict enough.

Clean 7-digit plus blank slot:

- `スクリーンショット 2026-07-14 060926190.png` S3 self
- `スクリーンショット 2026-07-15 130026795.png` S3 self

Raw-text-only exact:

- `2026-07-15_184205486.png` S3 self

## Comparison With Existing Stage3 Self Simulation

Already covered:

- `スクリーンショット 2026-07-11 144846091.png` S3 self
- `スクリーンショット 2026-07-11 145100208.png` S3 self
- `スクリーンショット 2026-07-15 130019543.png` S3 self

Missed but same broader structural family:

- `2026-07-15_184158330.png` S3 self: middle 7-digit member dropped instead of leading 7-digit member.
- `スクリーンショット 2026-07-14 060811830.png` S3 self: middle 7-digit member dropped.
- `スクリーンショット 2026-07-15 130032877.png` S3 self: middle 7-digit member dropped.
- `2026-07-11_223152331.png` S3 enemy: two 7-digit members dropped, bonus selected.
- `スクリーンショット 2026-07-14 061051531.png` S3 enemy: trailing 7-digit member dropped.

Why broadening the old simulation directly would be unsafe:

- The old simulation is Stage3 self only and checks a specific left-shift shape.
- The new cluster crosses `self` and `enemy` and includes middle/trailing loss, so it needs a separate named simulation and separate browser parity audit before any production consideration.

## Comparison With Grouped/Raw Recovery

Already production-recovered grouped/raw cases:

- `2026-07-11_223346581.png` S2 enemy
- `2026-07-11_223753187.png` S1 enemy
- `2026-07-11_223950902.png` S3 self
- `2026-07-15_184109879.png` S3 self
- `2026-07-15_184125225.png` S2 enemy
- `2026-07-15_184158330.png` S3 enemy
- `スクリーンショット 2026-07-11 145215861.png` S1 enemy
- `スクリーンショット 2026-07-14 061151691.png` S1 self
- `スクリーンショット 2026-07-14 061545315.png` S3 enemy
- `スクリーンショット 2026-07-15 130026795.png` S3 enemy

Overlap with the new simulation:

- None at the same stage/side. One screenshot (`2026-07-15_184158330.png`) has grouped/raw production recovery on S3 enemy and the new simulation TP on S3 self, so recovery order should not conflict for the observed data.

Remaining distinct from grouped/raw:

- The new simulation uses clean member-row OCR plus exact total evidence.
- The grouped/raw recovery uses punctuation/space-normalized token evidence.
- The suffix-only Stage3 enemy case (`2026-07-11_223950902.png` S3 enemy) remains distinct and is not safe for this new simulation.

## Browser/Runner Readiness

The new simulation is runner-only. Productionization should wait until browser/UI parity is proven for the same evidence timing:

- Browser must expose the same member-row sequence numbers.
- Browser must expose the same total candidates and exact total evidence.
- Browser must preserve side/stage ROI provenance.
- The recovery must run before displayed result state is finalized.
- It must not be overwritten by later total/bonus corrections.

No browser production change is recommended in this task.

## Recommendation

Next safest generalization target:

1. Keep `currentPcStage3SevenDigitBonusDisplacementSimulation` as runner-only.
2. Add a browser-equivalent parity audit for this simulation before productionizing.
3. If parity is exact and still 0 FP, productionize it as a separate Stage3 current-PC recovery, not by weakening the older Stage3 self simulation.

Do not pursue suffix-only or raw-text-only 7-digit recovery next. Those clusters are larger, but they lack clean exact parsed evidence and carry higher false-positive risk.
