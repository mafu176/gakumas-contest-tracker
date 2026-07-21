# Current-PC Ambiguous Exact Candidate Investigation

Generated: 2026-07-21

## Scope

- Investigation only.
- Production OCR output changed: no.
- Runner-only recovery simulation added: no.
- Smartphone OCR changed: no.
- Legacy desktop OCR changed: no.
- Filename/stage-specific logic: no.
- Near-match guessing, within-one tolerance, edit-distance repair, or arithmetic-derived member invention: no.

## Latest Production State

Latest pushed production state includes:

- `currentPcGroupedRawTokenRecovery`
- `currentPcStage3SevenDigitBonusDisplacementRecovery`
- `currentPcCrownBonusRuleRecovery`
- `currentPcStageWideSixMemberCandidateSolverRecovery`
- `currentPcExactMembersCrownBonusTotalRecovery`
- current-PC browser mode selection fix

Latest confirmed production accuracy:

| level | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| image | 22 | 36 | 58 | 37.9% |
| stage | 130 | 44 | 174 | 74.7% |
| stage/side row | 294 | 54 | 348 | 84.5% |

The latest full current-PC row artifact was not regenerated in this task. The previous full-run attempt timed out in the local environment, so this investigation recomputes the ambiguous-exact cluster from the latest tracked remaining-failure table and removes the 2 rows since recovered by `currentPcExactMembersCrownBonusTotalRecovery`.

## Cluster Definition

Rows counted here satisfy both conditions:

- the row still fails after the latest production recoveries,
- at least one currently wrong or missing expected member value exists exactly somewhere in available OCR evidence,
- but the current production pipeline cannot prove one unique safe interpretation.

This intentionally excludes rows where only the total/bonus is wrong and members are already correct, and it also excludes pure near-value cases where the corrected member does not exist exactly in evidence.

## Summary Counts

| metric | count |
| --- | ---: |
| remaining stage/side rows after latest production state | 54 |
| ambiguous exact-member evidence rows | 36 |
| rows outside this cluster | 18 |
| runner-only simulation added | 0 |

Position breakdown:

| position | rows |
| --- | ---: |
| Stage1 self | 2 |
| Stage1 enemy | 5 |
| Stage2 self | 4 |
| Stage2 enemy | 4 |
| Stage3 self | 14 |
| Stage3 enemy | 7 |

Prior cluster origin:

| previous classification | rows now in this cluster |
| --- | ---: |
| Stage3 self exact member evidence missing/partial | 11 |
| exact candidates exist but interpretation not uniquely safe | 20 |
| exact member absent or partial fragment only | 4 |
| small digit OCR error / near value | 1 |

## Ambiguity Category Breakdown

Primary blocker categories:

| category | rows | meaning |
| --- | ---: | --- |
| E. incomplete member or opposite-side evidence | 16 | At least one wrong expected member exists exactly, but another required member needed for a complete six-member equation is absent, partial, or role-displaced. |
| G. competing exact-looking OCR candidate | 16 | The correct value appears, but another exact-looking selected candidate or noisy candidate also fits a local parse; changing it would require stronger provenance or near-value judgment. |
| A/I. slot, role, or permutation ambiguity | 4 | The right value set is mostly present, but member slot identity or member/bonus role assignment is not uniquely proven. |

Secondary blockers seen repeatedly:

| secondary blocker | rows affected |
| --- | ---: |
| exact displayed total evidence exists, but cannot select members | 36 |
| `no-complete-six-member-exact-total-interpretation` from stage-wide solver | 36 |
| exact/zero bonus evidence available | 29 |
| exact bonus evidence missing or OCR-confused | 7 |
| Stage3 rows | 21 |

## Progressive Uniqueness Analysis

The available tracked evidence does not preserve full interpretation cardinalities for every row, but the existing strict production solvers record the final safety outcome. Under those solvers, all 36 rows remain rejected.

| step | added guard | rows becoming uniquely safe at this step | rows still ambiguous/blocked | note |
| --- | --- | ---: | ---: | --- |
| 1 | member candidate / slot provenance only | 0 | 36 | Candidate presence is not enough; slot identity is often broad or shifted. |
| 2 | + exact displayed total evidence | 0 | 36 | Exact total evidence is already present for these rows, yet members remain unsafe. |
| 3 | + confirmed crown-bonus rule | 0 | 36 | Crown rule validates totals but cannot invent or safely reorder member values. |
| 4 | + complete six-member cross-side consistency | 0 | 36 | Stage-wide solver still reports no complete unique six-member interpretation. |
| 5 | + existing production recovery precedence | 0 | 36 | Earlier recoveries already ran; these rows are residual rejects. |

Interpretation: exact totals are no longer the bottleneck for this cluster. The limiting factor is trustworthy member provenance, especially slot identity and complete six-member evidence.

## Per-Row Audit

Evidence shorthand:

- `exact wrong members` lists wrong/missing expected member slots whose exact value appears somewhere in current available evidence.
- `total` and `bonus` reflect the compact evidence flags from the current tracked audit.
- Raw OCR text and detailed token traces are available in generated artifacts when that screenshot was rerun; for the full 58-set historical rows the tracked docs preserve compact evidence, selected values, and recovery rejection summaries rather than full raw text.

| screenshot | stage | side | expected | selected | wrong/missing slots | exact wrong members | total | bonus | primary blocker | recovery rejection |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-07-11_223152331.png` | 3 | self | `808246 / 698916 / 1002602 +0 = 2509764` | `698916 / 0 / 0 +109330 = 808246` | member1, member2, member3, bonus, total | member1 `808246`; member2 `698916` | exact | exact/zero | E | missing self member3; no complete six-member interpretation |
| `2026-07-11_223426685.png` | 3 | self | `903425 / 1262179 / 859213 +252435 = 3277252` | `262179 / 859213 / 252435 +0 = 1373827` | member1, member2, member3, bonus, total | member3 `859213` | exact | exact/zero | E | no complete six-member interpretation |
| `2026-07-11_223513004.png` | 3 | self | `903425 / 1262179 / 859213 +252435 = 3277252` | `262179 / 859213 / 252435 +0 = 1373827` | member1, member2, member3, bonus, total | member3 `859213` | exact | exact/zero | E | no complete six-member interpretation |
| `2026-07-11_223613166.png` | 3 | self | `717313 / 846891 / 1121803 +0 = 2686007` | `717313 / 846891 / 0 +1121803 = 2686007` | member3, bonus | member3 `1121803` | exact | exact/zero | A/I | missing self member3; member/bonus role ambiguity |
| `2026-07-11_223613166.png` | 3 | enemy | `1314244 / 1043501 / 841605 +262848 = 3462198` | `43501 / 841605 / 262848 +0 = 1147954` | member1, member2, member3, bonus, total | member1 `1314244`; member3 `841605` | exact | exact/zero | E | missing self member3; incomplete enemy row |
| `2026-07-11_223753187.png` | 3 | self | `1072082 / 820114 / 923776 +214416 = 3030388` | `820114 / 923776 / 214416 +0 = 1958306` | member1, member2, member3, bonus, total | member2 `820114`; member3 `923776` | exact | exact/zero | E | no complete six-member interpretation |
| `2026-07-11_223834078.png` | 3 | self | `683470 / 941077 / 1406672 +281334 = 3312553` | `683470 / 1406 / 2813 +0 = 687689` | member2, member3, bonus, total | member2 `941077` | exact | missing | E | missing self/enemy member3; bonus evidence missing |
| `2026-07-11_223834078.png` | 3 | enemy | `1017535 / 580090 / 905641 +0 = 2503266` | `580090 / 905641 / 0 +1017535 = 2503266` | member1, member2, member3, bonus | member1 `1017535`; member2 `580090`; member3 `905641` | exact | exact/zero | A/I | member1 selected as bonus; row role ambiguity |
| `2026-07-11_223950902.png` | 1 | self | `440366 / 382382 / 545988 +109197 = 1477933` | `440366 / 382382 / 545983 +10919 = 1379650` | member3, bonus, total | member3 `545988` | exact | missing | G | exact candidate competes with near selected member and missing bonus |
| `2026-07-11_223950902.png` | 3 | enemy | `764868 / 1091658 / 864388 +218331 = 2939245` | `91658 / 864388 / 218351 +0 = 1174397` | member1, member2, member3, bonus, total | member3 `864388` | exact | missing | E | incomplete 7-digit member evidence |
| `2026-07-15_184125225.png` | 3 | enemy | `1098592 / 1043851 / 344952 +219718 = 2707113` | `43851 / 344952 / 219718 +0 = 608521` | member1, member2, member3, bonus, total | member1 `1098592`; member3 `344952` | exact | exact/zero | E | member2 only appears as partial `,043,851`; no complete row |
| `2026-07-15_184133120.png` | 3 | self | `447116 / 958338 / 1064520 +0 = 2469974` | `447116 / 958338 / 0 +1064520 = 2469974` | member3, bonus | member3 `1064520` | exact | exact/zero | A/I | member3 selected as bonus; role ambiguity |
| `2026-07-15_184133120.png` | 3 | enemy | `833676 / 589174 / 1352747 +270549 = 3046146` | `333676 / 589174 / 270549 +0 = 1193399` | member1, member3, bonus, total | member3 `1352747` | exact | exact/zero | E | member1 absent/partial; no complete row |
| `2026-07-15_184158330.png` | 1 | enemy | `560330 / 194288 / 349031 +112066 = 1215715` | `960330 / 194258 / 349031 +112066 = 1615685` | member1, member2, total | member1 `560330`; member2 `194288` | exact | exact/zero | G | exact values compete with wrong selected values |
| `2026-07-15_184205486.png` | 3 | self | `1020080 / 878532 / 1076541 +0 = 2975153` | `878532 / 0 / 0 +141548 = 1020080` | member1, member2, member3, bonus, total | member1 `1020080`; member2 `878532` | exact | exact/zero | E | missing self member3; no complete row |
| `2026-07-15_184205486.png` | 3 | enemy | `881533 / 1196781 / 974861 +239356 = 3292531` | `196781 / 974861 / 239356 +56331 = 1467329` | member1, member2, member3, bonus, total | member3 `974861` | exact | exact/zero | E | missing 7-digit members; no complete row |
| `2026-07-15_184217948.png` | 3 | enemy | `1417574 / 840482 / 1065699 +283514 = 3607269` | `840482 / 283514 / 0 +2483273 = 3607269` | member1, member2, member3, bonus | member1 `1417574`; member2 `840482`; member3 `1065699` | exact | exact/zero | A/I | exact values present but member/bonus permutation is not safely proven |
| `スクリーンショット 2026-07-11 145152780.png` | 1 | enemy | `62611 / 104418 / 89610 +0 = 256639` | `52611 / 104418 / 89610 +0 = 246639` | member1, total | member1 `62611` | exact | exact/zero | G | exact member competes with wrong selected near value |
| `スクリーンショット 2026-07-12 223746520.png` | 2 | self | `317640 / 167543 / 76281 +63528 = 624992` | `317640 / 76281 / 63528 +0 = 457449` | member2, member3, bonus, total | member2 `167543`; member3 `76281` | exact | exact/zero | G | bonus/member displacement with competing candidates |
| `スクリーンショット 2026-07-12 223746520.png` | 2 | enemy | `66615 / 43654 / 18781 +0 = 129050` | `66615 / 43656 / 18781 +0 = 129052` | member2, total | member2 `43654` | exact | exact/zero | G | exact member competes with near selected value |
| `スクリーンショット 2026-07-14 060656479.png` | 1 | self | `166324 / 333611 / 166324 +0 = 666259` | `164324 / 333611 / 166324 +0 = 664259` | member1, total | member1 `166324` | exact | exact/zero | G | duplicate value and near selected member compete |
| `スクリーンショット 2026-07-14 060656479.png` | 1 | enemy | `310198 / 348665 / 180900 +69733 = 909496` | `180900 / 310198 / 348665 +69733 = 909496` | member1, member2, member3 | member1 `310198`; member2 `348665`; member3 `180900` | exact | exact/zero | A/I | pure member permutation; total cannot prove order |
| `スクリーンショット 2026-07-14 060656479.png` | 2 | self | `147170 / 116778 / 147255 +29451 = 440654` | `147170 / 116778 / 147265 +0 = 411213` | member3, bonus, total | member3 `147255` | exact | missing | G | exact member competes with near selected value; bonus missing |
| `スクリーンショット 2026-07-14 061325391.png` | 3 | self | `1033971 / 1191935 / 883071 +238387 = 3347364` | `191935 / 883071 / 738387 +0 = 1813393` | member1, member2, member3, bonus, total | member1 `1033971`; member3 `883071` | exact | missing | E | member2 missing and bonus confused |
| `スクリーンショット 2026-07-14 061634001.png` | 3 | self | `1275772 / 1126492 / 344320 +255154 = 3001738` | `126492 / 255154 / 0 +2620092 = 3001738` | member1, member2, member3, bonus | member3 `344320` | exact | exact/zero | E | member1/member2 missing or partial |
| `スクリーンショット 2026-07-15 130019543.png` | 1 | enemy | `579071 / 170491 / 234685 +115814 = 1100061` | `979071 / 170491 / 234685 +115314 = 1499561` | member1, bonus, total | member1 `579071` | exact | missing | G | exact member competes with wrong selected value; bonus near/missing |
| `スクリーンショット 2026-07-15 130026795.png` | 2 | self | `107122 / 238594 / 128026 +47718 = 521460` | `107122 / 128026 / 238594 +47718 = 521460` | member2, member3 | member2 `238594`; member3 `128026` | exact | exact/zero | G | member2/member3 permutation; total unchanged |
| `スクリーンショット 2026-07-15 130026795.png` | 2 | enemy | `84880 / 197773 / 119648 +0 = 402301` | `84868 / 197773 / 119648 +0 = 402289` | member1, total | member1 `84880` | exact | exact/zero | G | exact member competes with near selected value |
| `スクリーンショット 2026-07-16 062903692.png` | 2 | self | `249565 / 253334 / 42767 +50666 = 596332` | `253334 / 42767 / 50666 +0 = 346767` | member1, member2, member3, bonus, total | member1 `249565`; member2 `253334`; member3 `42767` | exact | exact/zero | G | member/bonus displacement with broad candidate pool |
| `スクリーンショット 2026-07-16 062903692.png` | 3 | self | `721210 / 1162325 / 933236 +232465 = 3049236` | `162325 / 933236 / 232465 +0 = 1328026` | member1, member2, member3, bonus, total | member3 `933236` | exact | exact/zero | E | member1/member2 missing or partial |
| `スクリーンショット 2026-07-16 063008443.png` | 2 | enemy | `87574 / 148001 / 160468 +0 = 396043` | `87567 / 148001 / 160468 +0 = 396036` | member1, total | member1 `87574` | exact | exact/zero | G | exact member competes with near selected value |
| `スクリーンショット 2026-07-16 063115987.png` | 1 | enemy | `99187 / 74052 / 88480 +0 = 261719` | `99187 / 74052 / 388430 +0 = 561669` | member3, total | member3 `88480` | exact | exact/zero | G | exact member competes with larger wrong selected value |
| `スクリーンショット 2026-07-16 063115987.png` | 3 | self | `1147085 / 1065321 / 932605 +229417 = 3374428` | `932605 / 9417 / 0 +2432406 = 3374428` | member1, member2, member3, bonus | member3 `932605` | exact | missing | E | member1/member2 missing; bonus confused |
| `スクリーンショット 2026-07-16 063330034.png` | 3 | self | `1035782 / 1182459 / 1015625 +236491 = 3470357` | `236491 / 0 / 0 +3233866 = 3470357` | member1, member2, member3, bonus | member1 `1035782` | exact | exact/zero | E | member2/member3 missing or partial |
| `スクリーンショット 2026-07-17 081731273.png` | 2 | enemy | `290366 / 76793 / 146082 +58073 = 571314` | `290366 / 76793 / 145082 +58073 = 570314` | member3, total | member3 `146082` | exact | exact/zero | G | exact member competes with near selected value |
| `スクリーンショット 2026-07-17 081921369.png` | 3 | self | `890501 / 869851 / 894265 +178853 = 2833470` | `890501 / 894265 / 17885 +0 = 1802651` | member2, member3, bonus, total | member2 `869851`; member3 `894265` | exact | exact/zero | G | member/bonus displacement with competing exact candidates |

## Provenance-Loss Findings

Recurring provenance problems:

| provenance problem | observed effect |
| --- | --- |
| One candidate can appear in multiple roles | Bonus values are selected as members or members are selected as bonus-like values. |
| Row-order evidence loses slot identity | Pure permutations and shifted rows cannot be safely reordered by total arithmetic alone. |
| Grouped/raw candidates lose enough geometry | A grouped token may prove a value exists, but not that it belongs to the required side/slot. |
| Stage3 candidates lose x/y ordering or are partial | Exact totals are common, but member1/member2/member3 evidence is incomplete or displaced. |
| Total/bonus text leaks into member pools | The pipeline can become internally consistent with the wrong member set. |
| Duplicate or near OCR readings are treated as plausible alternatives | Exact values may exist, but a wrong selected value is also locally plausible. |

## Recurring Patterns Worth Tracking

Potentially useful patterns:

| pattern | rows | safe now? | reason |
| --- | ---: | --- | --- |
| Stage3 rows with at least one exact member but incomplete row | 21 | no | The exact value often proves only one slot; another required 7-digit member or bonus remains missing/confused. |
| Member/bonus displacement with exact values present | 8+ | no | Needs stronger role and slot provenance; arithmetic alone can be satisfied by wrong assignments. |
| Pure or near member permutation | 4+ | no | Total remains unchanged, so totals do not prove member order. Requires geometry/slot proof. |
| Exact value competes with wrong selected near value | 10+ | no | Choosing exact over selected would be near-match behavior unless provenance is stronger. |

No pattern meets the threshold for a new simulation: at least 2 rows with exact corrected values, deterministic provenance narrowing, exact equation, unique interpretation, and zero-FP potential across all 58 fixtures.

## Simulation Decision

No `currentPcAmbiguousExactCandidateProvenanceSimulation` was added.

Reasons:

- The cluster is broad rather than one narrow failure shape.
- The strongest common blocker is provenance loss, not missing arithmetic logic.
- Exact displayed totals already exist for all 36 rows, but strict solvers still reject them.
- Many rows would require choosing between exact and near selected candidates.
- Several rows require member order or role reassignment, which is unsafe without stronger geometry.
- Stage3 rows often require missing 7-digit member evidence, not just interpretation.

## Comparison With Stage3 Missing/Partial Evidence

| direction | affected rows | exact evidence availability | generalization likelihood | risk | recommendation |
| --- | ---: | --- | --- | --- | --- |
| ambiguous exact candidates | 36 | partial; exact totals common, exact member evidence incomplete or broad | medium only if provenance can be narrowed | high if done from arithmetic alone | defer until slot/geometry provenance improves |
| Stage3 missing/partial member evidence | 21+ | exact totals common; members often missing or partial | higher if OCR evidence capture improves | medium/high but measurable | prioritize diagnostics/evidence capture |

Recommendation: prioritize Stage3 member evidence quality and provenance over ambiguous exact-candidate selection. The next useful work is not a recovery rule; it is better slot-proven evidence capture or geometry-preserving diagnostics that can narrow candidate provenance before selection.

## Recommended Next Step

Investigate slot/geometry provenance improvements for Stage3 current-PC rows, especially:

- preserving deterministic member slot identity for exact candidates,
- preventing row-order-only evidence from assigning values to slots,
- separating bonus/total text from member pools,
- and measuring whether stronger slot provenance reduces the 36-row ambiguous cluster without introducing false positives.

Do not productionize ambiguous exact-candidate recovery until a narrow provenance rule produces zero false positives in runner and browser-equivalent parity.
