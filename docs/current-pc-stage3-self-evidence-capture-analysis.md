# Current-PC Stage3 Self Evidence Capture Analysis

## Summary

Source artifacts:

- `tmp/current-pc-ocr-baseline/summary.json`
- `tmp/current-pc-stage3-member-row-ocr-diagnostics/summary.json`
- `tmp/current-pc-stage3-slot-geometry-diagnostics/summary.json`
- `tmp/current-pc-ocr-baseline/stage-wide-six-member-candidate-solver-stage3-slot-proven-variant-evidence*.json`
- `tmp/current-pc-ocr-baseline/stage3-geometry-slot-evidence-simulation.json`

Scope:

- Current-PC expected fixtures: 68
- Remaining failing Stage3 self rows: 27
- Expected Stage3 self member values audited: 81
- Production OCR behavior changed: no
- New recovery rule: no
- New runner-only experiment: no

Main conclusion:

The dominant Stage3 self bottleneck is no longer pure OCR capture. The correct member digits usually exist somewhere in current evidence, but often in evidence that is too broad, merged, or weakly proven for safe production selection.

## 27-Row Audit

| Screenshot | Expected members | Selected members | Expected bonus/total | Selected bonus/total | Evidence states | Row class |
| --- | --- | --- | --- | --- | --- | --- |
| `2026-07-11_223152331.png` | `808246/698916/1002602` | `698916/0/0` | `+0=2509764` | `+109330=808246` | m1:A, m2:A, m3:C | selection/provenance |
| `2026-07-11_223346581.png` | `745929/1360665/937345` | `745929/364665/937345` | `+272133=3316072` | `+0=2047939` | m1:A, m2:E, m3:A | selection/provenance |
| `2026-07-11_223426685.png` | `903425/1262179/859213` | `262179/859213/252435` | `+252435=3277252` | `+0=1373827` | m1:F, m2:F, m3:A | concatenation |
| `2026-07-11_223513004.png` | `903425/1262179/859213` | `262179/859213/252435` | `+252435=3277252` | `+0=1373827` | m1:F, m2:F, m3:A | concatenation |
| `2026-07-11_223613166.png` | `717313/846891/1121803` | `717313/846891/0` | `+0=2686007` | `+1121803=2686007` | m1:A, m2:A, m3:C | selection/provenance |
| `2026-07-11_223714046.png` | `795562/1237121/1256926` | `795562/25138/0` | `+251385=3540994` | `+2720294=3540994` | m1:A, m2:F, m3:E | concatenation |
| `2026-07-11_223753187.png` | `1072082/820114/923776` | `820114/923776/214416` | `+214416=3030388` | `+0=1958306` | m1:F, m2:A, m3:A | concatenation |
| `2026-07-11_223834078.png` | `683470/941077/1406672` | `683470/1406/2813` | `+281334=3312553` | `+0=687689` | m1:A, m2:F, m3:F | concatenation |
| `2026-07-11_223907986.png` | `875583/930873/1130649` | `875583/930873/22612` | `+226129=3163234` | `+0=1829068` | m1:A, m2:A, m3:E | selection/provenance |
| `2026-07-15_184117455.png` | `1003606/1091318/1007255` | `182467/0/0` | `+218263=3320442` | `+3137975=3320442` | m1:H, m2:H, m3:E | partial capture |
| `2026-07-15_184133120.png` | `447116/958338/1064520` | `447116/958338/0` | `+0=2469974` | `+1064520=2469974` | m1:A, m2:A, m3:E | selection/provenance |
| `2026-07-15_184150257.png` | `987319/944097/1004934` | `987319/944097/20098` | `+200986=3137336` | `+0=1951514` | m1:A, m2:A, m3:C | selection/provenance |
| `2026-07-15_184205486.png` | `1020080/878532/1076541` | `878532/0/0` | `+0=2975153` | `+141548=1020080` | m1:A, m2:A, m3:E | selection/provenance |
| `2026-07-15_184217948.png` | `249725/917636/1171915` | `249725/917636/0` | `+0=2339276` | `+0=1167361` | m1:A, m2:A, m3:E | selection/provenance |
| `スクリーンショット 2026-07-11 145018419.png` | `756719/867029/805828` | `756719/867029/5828` | `+173405=2602981` | `+173405=1802981` | m1:A, m2:A, m3:D | selection/provenance |
| `スクリーンショット 2026-07-12 223719983.png` | `478991/440726/333713` | `478991/444726/333713` | `+95798=1349228` | `+95798=1353228` | m1:A, m2:D, m3:A | selection/provenance |
| `スクリーンショット 2026-07-14 061325391.png` | `1033971/1191935/883071` | `191935/883071/738387` | `+238387=3347364` | `+0=1813393` | m1:F, m2:F, m3:A | concatenation |
| `スクリーンショット 2026-07-14 061545315.png` | `810180/535044/909283` | `810180/535044/909283` | `+181856=2436363` | `+18185=2272692` | m1:A, m2:A, m3:A | selection/provenance |
| `スクリーンショット 2026-07-14 061634001.png` | `1275772/1126492/344320` | `126492/255154/0` | `+255154=3001738` | `+2620092=3001738` | m1:E, m2:G, m3:F | partial capture / concatenation |
| `スクリーンショット 2026-07-15 130038617.png` | `348940/855687/518619` | `348940/856687/518619` | `+0=1723246` | `+0=1724246` | m1:A, m2:D, m3:A | selection/provenance |
| `スクリーンショット 2026-07-16 062903692.png` | `721210/1162325/933236` | `162325/933236/232465` | `+232465=3049236` | `+0=1328026` | m1:F, m2:F, m3:A | concatenation |
| `スクリーンショット 2026-07-16 063115987.png` | `1147085/1065321/932605` | `932605/9417/0` | `+229417=3374428` | `+2432406=3374428` | m1:E, m2:G, m3:A | partial capture |
| `スクリーンショット 2026-07-16 063330034.png` | `1035782/1182459/1015625` | `236491/0/0` | `+236491=3470357` | `+3233866=3470357` | m1:F, m2:E, m3:E | concatenation |
| `スクリーンショット 2026-07-17 081921369.png` | `890501/869851/894265` | `890501/894265/17885` | `+178853=2833470` | `+0=1802651` | m1:A, m2:F, m3:A | concatenation |
| `スクリーンショット 2026-07-21 054837823.png` | `429630/561404/1299934` | `561404/25998/0` | `+259986=2550954` | `+1963552=2550954` | m1:F, m2:A, m3:E | concatenation |
| `スクリーンショット 2026-07-21 054906218.png` | `706926/1046567/609489` | `706926/46567/609489` | `+209313=2572295` | `+0=1362982` | m1:A, m2:F, m3:A | concatenation |
| `スクリーンショット 2026-07-21 055104928.png` | `619606/617485/774304` | `619606/617485/774304` | `+154860=2166255` | `+15486=2026881` | m1:A, m2:A, m3:A | selection/provenance |

Evidence states:

- A: exact value exists in normal production candidate evidence.
- B: exact value exists only in raw text / unparsed evidence.
- C: exact value exists only in Stage3 ROI/preprocessing variant evidence with slot-proven crop provenance.
- D: exact value exists only in per-slot/bbox geometry evidence.
- E: exact value exists but slot provenance is ambiguous, usually row-level variant evidence.
- F: exact value exists only as part of a concatenated OCR run.
- G: only partial fragments exist.
- H: only near/wrong OCR value exists.
- I: exact value absent from all current evidence.

## 81-Member Evidence Breakdown

| Evidence state | Count |
| --- | ---: |
| A. Normal production candidate evidence | 42 |
| B. Raw text / unparsed evidence only | 0 |
| C. Slot-proven Stage3 variant evidence only | 3 |
| D. Bbox/geometry evidence only | 3 |
| E. Ambiguous row-level variant evidence | 12 |
| F. Concatenated OCR run | 17 |
| G. Partial fragments only | 2 |
| H. Near/wrong OCR value only | 2 |
| I. Exact value absent | 0 |

Aggregates:

- Exact values found anywhere: 77 / 81
- Exact values absent as standalone evidence: 4 / 81
- Exact values in normal production evidence: 42 / 81
- Exact values only in diagnostics or unparsed/merged evidence: 35 / 81
- Exact values only in slot-proven diagnostics: 6 / 81
- Exact values only in ambiguous row-level or concatenated evidence: 29 / 81

## Row-Level Split

| Exact member values found somewhere | Rows |
| --- | ---: |
| All 3 exact members exist somewhere | 24 |
| Exactly 2 exact members exist somewhere | 2 |
| Exactly 1 exact member exists somewhere | 1 |
| 0 exact members exist somewhere | 0 |

Primary row classes:

| Row class | Rows | Meaning |
| --- | ---: | --- |
| Selection/provenance failure | 13 | All expected members are present in production, slot-proven diagnostics, or geometry, but current production cannot safely select them. |
| Concatenation failure | 11 | All expected members are present, but at least one appears only in a merged OCR run. |
| Partial capture failure | 3 | One or two expected members still lack exact standalone evidence. |

Broadly, `24 / 27` rows are not true evidence-capture failures for member values. They are selection, slot provenance, or tokenization failures.

The three rows with incomplete exact member evidence are:

| Screenshot | Missing/weak values | Shape |
| --- | --- | --- |
| `2026-07-15_184117455.png` | member1 `1003606`, member2 `1091318` | only near/wrong OCR values; member3 appears in ambiguous row-level variant evidence |
| `スクリーンショット 2026-07-14 061634001.png` | member2 `1126492` | partial fragment only; member1 appears in ambiguous row-level variant evidence; member3 appears in concatenated evidence |
| `スクリーンショット 2026-07-16 063115987.png` | member2 `1065321` | partial fragment only; member1 appears in ambiguous row-level variant evidence; member3 is in production evidence |

## Missing-Value Failure Shapes

Across the 4 member values without exact standalone evidence:

| Shape | Values |
| --- | ---: |
| OCR reads another plausible number | 2 |
| partial fragment only | 2 |
| leading digit(s) dropped / collapsed to suffix | 0 as primary state here, but appears inside the fragment cases |
| trailing digit(s) dropped | 0 |
| middle digit lost | 0 |
| multi-member concatenation | counted separately as F, 17 values |
| punctuation corruption | present as a contributor in concatenated/variant evidence, not as a standalone primary missing state |
| value completely absent | 0 |

No currently generated diagnostics show a single narrow preprocessing variant that recovers those 4 missing values cleanly and with reliable slot provenance.

## Existing Variant and Geometry Signal

The Stage3 member-row diagnostics still show strong evidence value:

| Variant source | Exact missing-member hits |
| --- | ---: |
| wider member-row ROI | 19 |
| shifted-right member-row ROI | 17 |
| crown-bonus threshold row variant | 11 |
| tighter vertical member-row ROI | 10 |
| shifted-left member-row ROI | 10 |
| shifted-down member-row ROI | 10 |
| baseline threshold row variant | 10 |
| current member-row ROI | 9 |
| taller member-row ROI | 9 |
| shifted-up member-row ROI | 8 |
| member2-slot | 4 |
| member3-slot | 4 |

However, most high-yield variants are row-level variants. They recover digits, but not always with independently reliable slot provenance.

The fresh 68-fixture slot-proven Stage3 variant solver still does not cross the production threshold:

- broad slot-proven variant policy: TP 16 / FP 0 / FN 4 / blocked 42
- true incremental beyond current production: 2
- strict exact-only policy: TP 15 / FP 0 / FN 5 / blocked 42
- strict exact-only true incremental beyond current production: 1
- parity: no wouldApply disagreements and no safety-relevant mismatches

The broad policy is not acceptable as production evidence because it still includes a within-one row:

- `2026-07-11_223152331.png` S3 proposes member3 `1002601` and total `2509763`, while expected is `1002602` and `2509764`.

Expected-blind geometry evidence also remains below threshold:

- TP 1 / FP 0 / FN 3 / blocked 26
- true incremental TP 1
- Stage3 self incremental TP 1

## Dominant Failure Type

Dominant problem: candidate selection/provenance.

Quantification:

- 24 / 27 failing Stage3 self rows have all three expected member values somewhere in existing evidence.
- 77 / 81 expected member values exist somewhere.
- Only 4 / 81 member values lack exact standalone evidence.

The pipeline is therefore mostly seeing the digits, but too often in a form that cannot be safely promoted:

- concatenated text runs,
- row-level variants without enough slot certainty,
- exact values present but competing with currently selected wrong slots,
- exact totals available but bonus/member evidence incomplete.

## Top OCR-Input Improvement Targets

### 1. Stage3 Self Row-Level ROI Quality With Slot Provenance

Potential:

- wider member-row ROI and shifted-right ROI produce the largest exact-hit counts.
- This directly targets the common 7-digit right-edge/crop-width failure shape.

Risk:

- Medium to high unless coupled with deterministic slot provenance.
- Row-level evidence alone previously produced unsafe wrong-slot risk.

Complexity:

- Medium. It likely needs OCR token geometry or per-slot re-OCR, not just a new row crop.

### 2. Per-Slot Stage3 Self OCR Crops

Potential:

- Lower hit count than row-level variants, but much cleaner provenance.
- Slot-proven `member2-slot` and `member3-slot` already account for 8 exact hits.

Risk:

- Lower than row-level variants, because the crop itself carries slot provenance.

Complexity:

- Medium. Needs better per-slot crop sizing for 7-digit values and careful overlap control.

### 3. Preprocessing Consensus for Stage3 Self Member Rows

Potential:

- Threshold and tighter/taller vertical variants repeatedly expose exact values.
- Could help when standard crop sees only a suffix or malformed punctuation.

Risk:

- Medium. Consensus must reject near, within-one, punctuation-corrupted, and merged-run evidence unless slot provenance is deterministic.

Complexity:

- Medium to high. The key is consensus and provenance, not just another OCR pass.

## Recommendation

Do not productionize a new Stage3 self recovery yet.

Do not add another runner-only preprocessing experiment in this task. The existing variant and geometry diagnostics already cover the obvious candidates, and the current bottleneck is not a lack of experiments; it is reliable slot provenance and safe promotion criteria.

Recommended next work:

1. Improve Stage3 self per-slot crop quality and bbox/geometry provenance as diagnostics.
2. Re-run the strict exact-only slot-proven solver after better per-slot evidence exists.
3. Productionize only if the strict exact-only path reaches at least 2 true incremental TP, 0 FP, no within-one rows, no wrong-slot evidence, and runner/browser parity remains exact.

## Validation

- `npm run build`: PASS.
