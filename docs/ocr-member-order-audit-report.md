# OCR Member Order / Slot Assignment Audit

Generated: 2026-06-24T20:54:49.826Z

## Scope

This is runner-only audit output produced by `scripts/ocr-test-images.mjs`.
It does not change OCR output, browser behavior, or known corrections.

## Available Evidence

- OCR zone name/source is available at the crop level: direct total crop, alternative total candidate traces, and selected member crop.
- Raw OCR token order is available as returned text order from those crops.
- Numeric candidate order is available per crop via parsed numbers from each raw OCR text block.
- Tesseract word bounding boxes are not currently preserved by the runner, so this report cannot prove per-token x/y geometry yet.

## Summary

- audit images scanned: 3

## user-reports/unreviewed/IMG_9240.png

- disabled known correction(s): IMG_9240.png:stage3, IMG_9254.png:stage3, IMG_9281.png:stage3
- expected JSON: yes
- pass: no

### S3 self

- failures: S3 self total expected 966536 actual 966556; S3 self member1 expected 287111 actual 331368; S3 self member2 expected 331368 actual 281784; S3 self member3 expected 281784 actual 287111
- selected members: slot1=331,368, slot2=281,784, slot3=287,111
- selected total: 966,556
- selected member sum: 900,263
- expected members: slot1=287,111, slot2=331,368, slot3=281,784
- expected total: 966,536
- expected member sum: 900,263
- same non-zero member value set: yes
- raw numeric candidates: 287111, 331368, 281784, 66273

#### Source Occurrence Map

| value | selected slot(s) | expected slot(s) | observed source(s) |
| ---: | --- | --- | --- |
| 331,368 | member1 | member2 | total candidate trace 2 #2; selected member crop #2 |
| 281,784 | member2 | member3 | total candidate trace 2 #3; selected member crop #3 |
| 287,111 | member3 | member1 | selected member crop #1 |
| 966,556 | total | - | total candidate trace 1 #1 |
| 966,536 | - | total | not observed in raw text numbers |

#### Ordered Source Numbers

- total direct crop: (none)
- total candidate trace 1: 1:966,556
- total candidate trace 2: 1:900,050, 2:331,368, 3:281,784
- total candidate trace 3: 1:6,527
- total candidate trace 4: 1:66,273
- total candidate trace 5: (none)
- total candidate trace 6: (none)
- total candidate trace 7: 1:72,621
- selected member crop: 1:287,111, 2:331,368, 3:281,784, 4:66,273

#### Raw OCR Text

```text
total direct: PE
> « X - 3 7 N .
44 - = “A 2 " 0
Nl a A
yd
total candidate traces:
- trace 1 [pass1]: text="VWIINI > AT -\n966,556k" numbers=966556
- trace 2 [pass1]: text="900,0506rt\n287.111 331,368 281,784\n_" numbers=900050, 331368, 281784
- trace 3 [pass1]: text="784\n* \"\n281,78 \\\n368 =\nass\n1; 6527 §\n7 >" numbers=6527
- trace 4 [pass1]: text="> 4 +66273 ' v\nERY ar SN \\" numbers=66273
- trace 5 [pass1]: text="> A TOOLS DD yes\n2 Tt 3\nNow lf 4" numbers=(none)
- trace 6 [pass1]: text="PE\n> « X - 3 7 N .\n44 - = “A 2 \" 0\nNl a A\nyd" numbers=(none)
- trace 7 [pass1]: text="BaP\nwan 72621" numbers=72621
members: 287,111 331,368 281,784
> (H+66273 f oo
| A a FA AI

Ce ® 4 ; . ! V
€)°€4.“ hal 6
```

#### Audit Assessment

- Values exist as the same set, but current runner output still lacks bounding-box proof for safe automatic reordering.
- Current evidence is useful for designing the next audit, but not enough by itself for production correction.

### S3 enemy

- failures: none
- selected members: slot1=211,104, slot2=263,616, slot3=58,211
- selected total: 532,931
- selected member sum: 532,931
- expected members: slot1=211,104, slot2=263,616, slot3=58,211
- expected total: 532,931
- expected member sum: 532,931
- same non-zero member value set: yes
- raw numeric candidates: 211104, 263616, 58211

#### Source Occurrence Map

| value | selected slot(s) | expected slot(s) | observed source(s) |
| ---: | --- | --- | --- |
| 211,104 | member1 | member1 | total candidate trace 1 #2; total candidate trace 2 #2; total candidate trace 3 #1; selected member crop #1 |
| 263,616 | member2 | member2 | total candidate trace 1 #3; total candidate trace 2 #3; total candidate trace 3 #2; selected member crop #2 |
| 58,211 | member3 | member3 | total candidate trace 1 #4; total candidate trace 2 #4; total candidate trace 3 #3; selected member crop #3 |
| 532,931 | total | total | not observed in raw text numbers |

#### Ordered Source Numbers

- total direct crop: (none)
- total candidate trace 1: 1:232,951, 2:211,104, 3:263,616, 4:58,211
- total candidate trace 2: 1:232,901, 2:211,104, 3:263,616, 4:58,211
- total candidate trace 3: 1:211,104, 2:263,616, 3:58,211
- total candidate trace 4: (none)
- total candidate trace 5: (none)
- total candidate trace 6: (none)
- total candidate trace 7: 1:65,277
- selected member crop: 1:211,104, 2:263,616, 3:58,211

#### Raw OCR Text

```text
total direct: e B P 4 byt RW
¥- § N=" 08S.
total candidate traces:
- trace 1 [pass1]: text="EA” 2g\n232,951r\n211,104 263,616 58,211" numbers=232951, 211104, 263616, 58211
- trace 2 [pass1]: text="232,901m\n211,104 263,616 58,211\ny Pp Q [ | J ’ = wa" numbers=232901, 211104, 263616, 58211
- trace 3 [pass1]: text="211,104 263,616 58,211\n50 vn || «tui TN" numbers=211104, 263616, 58211
- trace 4 [pass1]: text="PY | iy\np “~ \\ Jy\nnN, \" LE allio, ARE" numbers=(none)
- trace 5 [pass1]: text="e B P 4 byt RW\n¥- § N=\" 08S." numbers=(none)
- trace 6 [pass1]: text="DP 7v || EEE YZ\n- ; . N\n5 Lo ~ 238\n= tv 4 >\n20% (Ox" numbers=(none)
- trace 7 [pass1]: text="6%.0% (03: *\nDp wan 65277" numbers=65277
members: 211,104 263,616 58,211

\ py. * 7f IFR™
! HE ~ i gr.

RN HY / | le S24,
```

#### Audit Assessment

- Values exist as the same set, but current runner output still lacks bounding-box proof for safe automatic reordering.
- Current evidence is useful for designing the next audit, but not enough by itself for production correction.

## user-reports/unreviewed/IMG_9254.png

- disabled known correction(s): IMG_9240.png:stage3, IMG_9254.png:stage3, IMG_9281.png:stage3
- expected JSON: yes
- pass: no

### S3 self

- failures: S3 self total expected 148739 actual 74178; S3 self member3 expected 74178 actual 14835
- selected members: slot1=31,440, slot2=28,286, slot3=14,835
- selected total: 74,178
- selected member sum: 74,561
- expected members: slot1=31,440, slot2=28,286, slot3=74,178
- expected total: 148,739
- expected member sum: 133,904
- same non-zero member value set: no
- raw numeric candidates: 31440, 28286, 74178, 4114835

#### Source Occurrence Map

| value | selected slot(s) | expected slot(s) | observed source(s) |
| ---: | --- | --- | --- |
| 31,440 | member1 | member1 | total candidate trace 2 #1; total candidate trace 3 #1; selected member crop #1 |
| 28,286 | member2 | member2 | total candidate trace 2 #2; total candidate trace 3 #2; selected member crop #2 |
| 14,835 | member3 | - | total candidate trace 2 #4; total candidate trace 3 #4; total candidate trace 4 #1 |
| 74,178 | total | member3 | total candidate trace 2 #3; total candidate trace 3 #3; selected member crop #3 |
| 148,739 | - | total | not observed in raw text numbers |

#### Ordered Source Numbers

- total direct crop: (none)
- total candidate trace 1: (none)
- total candidate trace 2: 1:31,440, 2:28,286, 3:74,178, 4:14,835
- total candidate trace 3: 1:31,440, 2:28,286, 3:74,178, 4:14,835
- total candidate trace 4: 1:14,835
- total candidate trace 5: (none)
- total candidate trace 6: (none)
- total candidate trace 7: 1:58,488
- selected member crop: 1:31,440, 2:28,286, 3:74,178, 4:4,114,835

#### Raw OCR Text

```text
total direct: I NP Ess")
BR” 10%
total candidate traces:
- trace 1 [pass1]: text="VWIINI > AT -\n148.739m" numbers=(none)
- trace 2 [pass1]: text="148,73Yr\n31,440 28,286 74,178\n| VaR NY .  4+14835 18" numbers=31440, 28286, 74178, 14835
- trace 3 [pass1]: text="31,440 28,286 74,178\n7) ER. a+14835\nx AN | | | > NN \\ \\S on) a Vv" numbers=31440, 28286, 74178, 14835
- trace 4 [pass1]: text="a Eng § WW am Ta py Taw ¥ Wyma ¥§ WW\n— + +14835\n= TRA | \\3 oo\n* RH W B\noN 'Y ny > A N . AN cm" numbers=14835
- trace 5 [pass1]: text="SA oe . AES +L\np> | : Yo : ) nN aie 0) V\nTS - |" numbers=(none)
- trace 6 [pass1]: text="I NP Ess\")\nBR” 10%" numbers=(none)
- trace 7 [pass1]: text="og - 4 \\ a 1\\Y\no_o\n#ah 58488" numbers=58488
members: 31,440 28,286 74,178
PARR] «4114835
& gh\\< W B
```

#### Audit Assessment

- This is a broader slot-assignment issue, not a pure permutation; source-zone evidence is needed before any production rule.
- Current evidence is useful for designing the next audit, but not enough by itself for production correction.

### S3 enemy

- failures: none
- selected members: slot1=31,489, slot2=36,862, slot3=49,140
- selected total: 117,491
- selected member sum: 117,491
- expected members: slot1=31,489, slot2=36,862, slot3=49,140
- expected total: 117,491
- expected member sum: 117,491
- same non-zero member value set: yes
- raw numeric candidates: 31489, 36862, 49140

#### Source Occurrence Map

| value | selected slot(s) | expected slot(s) | observed source(s) |
| ---: | --- | --- | --- |
| 31,489 | member1 | member1 | total candidate trace 1 #2; total candidate trace 2 #1; selected member crop #1 |
| 36,862 | member2 | member2 | total candidate trace 1 #3; total candidate trace 2 #2; total candidate trace 3 #2; selected member crop #2 |
| 49,140 | member3 | member3 | total candidate trace 1 #4; total candidate trace 2 #3; selected member crop #3 |
| 117,491 | total | total | total candidate trace 1 #1 |

#### Ordered Source Numbers

- total direct crop: (none)
- total candidate trace 1: 1:117,491, 2:31,489, 3:36,862, 4:49,140
- total candidate trace 2: 1:31,489, 2:36,862, 3:49,140
- total candidate trace 3: 1:131,489, 2:36,862
- total candidate trace 4: (none)
- total candidate trace 5: (none)
- total candidate trace 6: (none)
- total candidate trace 7: 1:70,119
- selected member crop: 1:31,489, 2:36,862, 3:49,140

#### Raw OCR Text

```text
total direct: ~ or I CIA 4
AR ik o\P a
total candidate traces:
- trace 1 [pass1]: text="2 A\n117,491\n31,489 36,862 49,140" numbers=117491, 31489, 36862, 49140
- trace 2 [pass1]: text="117,49 1r\n31,489 36,862 49,140" numbers=31489, 36862, 49140
- trace 3 [pass1]: text="131,489 36,862 49,40\nGOAN 7\" ~~ \\ [ 4 |\ndS NEA Pa" numbers=131489, 36862
- trace 4 [pass1]: text="Teme mye Taye\n3 ) \\3 phi = ig 4 ) = 5) -" numbers=(none)
- trace 5 [pass1]: text="~ or I CIA 4\nAR ik o\\P a" numbers=(none)
- trace 6 [pass1]: text="3" numbers=(none)
- trace 7 [pass1]: text="A RIAA ~ SS ES\nwan 70119" numbers=70119
members: 31,489 36,862 49,140
ENP
4 RES 7 i | SN
```

#### Audit Assessment

- Values exist as the same set, but current runner output still lacks bounding-box proof for safe automatic reordering.
- Current evidence is useful for designing the next audit, but not enough by itself for production correction.

## user-reports/unreviewed/IMG_9281.png

- disabled known correction(s): IMG_9240.png:stage3, IMG_9254.png:stage3, IMG_9281.png:stage3
- expected JSON: yes
- pass: no

### S3 self

- failures: S3 self total expected 317624 actual 204908; S3 self member1 expected 204908 actual 112716; S3 self member2 expected 112716 actual 0
- selected members: slot1=112,716
- selected total: 204,908
- selected member sum: 112,716
- expected members: slot1=204,908, slot2=112,716, slot3=0
- expected total: 317,624
- expected member sum: 317,624
- same non-zero member value set: no
- raw numeric candidates: 204908, 112716

#### Source Occurrence Map

| value | selected slot(s) | expected slot(s) | observed source(s) |
| ---: | --- | --- | --- |
| 112,716 | member1 | member2 | total candidate trace 1 #3; total candidate trace 2 #3; total candidate trace 3 #2; selected member crop #2 |
| 204,908 | total | member1 | total candidate trace 1 #2; total candidate trace 2 #2; total candidate trace 3 #1; selected member crop #1 |
| 317,624 | - | total | total candidate trace 1 #1 |

#### Ordered Source Numbers

- total direct crop: (none)
- total candidate trace 1: 1:317,624, 2:204,908, 3:112,716
- total candidate trace 2: 1:217,024, 2:204,908, 3:112,716
- total candidate trace 3: 1:204,908, 2:112,716
- total candidate trace 4: (none)
- total candidate trace 5: (none)
- total candidate trace 6: (none)
- total candidate trace 7: 1:47,292
- selected member crop: 1:204,908, 2:112,716

#### Raw OCR Text

```text
total direct: CLA Zh cL, PN w
| -
total candidate traces:
- trace 1 [pass1]: text="* AT\n317,624p\n204,908 112,716  —" numbers=317624, 204908, 112716
- trace 2 [pass1]: text="217,024m\n204,908 112,716 —\nANY << EEL)" numbers=217024, 204908, 112716
- trace 3 [pass1]: text="204,908 112,716 —\nFan" numbers=204908, 112716
- trace 4 [pass1]: text="Hm TF 9% Eula §© mass\n¥ 4 ERS V\n# LW Xi\nmm BINS ad" numbers=(none)
- trace 5 [pass1]: text="S Wy h NN." numbers=(none)
- trace 6 [pass1]: text="CLA Zh cL, PN w\n| -" numbers=(none)
- trace 7 [pass1]: text="(SW\nodio ™~/ |\nwan 47292" numbers=47292
members: 204,908 112,716 —
 /
Dd
```

#### Audit Assessment

- This is a broader slot-assignment issue, not a pure permutation; source-zone evidence is needed before any production rule.
- Current evidence is useful for designing the next audit, but not enough by itself for production correction.

### S3 enemy

- failures: none
- selected members: slot1=343,001, slot2=343,056, slot3=257,235
- selected total: 1,011,905
- selected member sum: 943,292
- expected members: slot1=343,001, slot2=343,056, slot3=257,235
- expected total: 1,011,905
- expected member sum: 943,292
- same non-zero member value set: yes
- raw numeric candidates: 343001, 343056, 257235, 68611

#### Source Occurrence Map

| value | selected slot(s) | expected slot(s) | observed source(s) |
| ---: | --- | --- | --- |
| 343,001 | member1 | member1 | total candidate trace 1 #2; total candidate trace 2 #2; total candidate trace 3 #1; selected member crop #1 |
| 343,056 | member2 | member2 | total candidate trace 1 #3; total candidate trace 2 #3; total candidate trace 3 #2; selected member crop #2 |
| 257,235 | member3 | member3 | total candidate trace 1 #4; total candidate trace 2 #4; total candidate trace 3 #3; selected member crop #3 |
| 1,011,905 | total | total | total candidate trace 1 #1; total candidate trace 2 #1 |

#### Ordered Source Numbers

- total direct crop: (none)
- total candidate trace 1: 1:1,011,905, 2:343,001, 3:343,056, 4:257,235
- total candidate trace 2: 1:1,011,905, 2:343,001, 3:343,056, 4:257,235
- total candidate trace 3: 1:343,001, 2:343,056, 3:257,235
- total candidate trace 4: 1:68,611
- total candidate trace 5: (none)
- total candidate trace 6: (none)
- total candidate trace 7: 1:6,762
- selected member crop: 1:343,001, 2:343,056, 3:257,235, 4:68,611

#### Raw OCR Text

```text
total direct: EN wy TOOULl J Of. p
total candidate traces:
- trace 1 [pass1]: text="“at VVILIN\n1,011,905\n343,001 343,056 257,235" numbers=1011905, 343001, 343056, 257235
- trace 2 [pass1]: text="1,011,905m\n343,001 343,056 257,235\n|" numbers=1011905, 343001, 343056, 257235
- trace 3 [pass1]: text="343,001 343,056 257,235\noe BR NACL" numbers=343001, 343056, 257235
- trace 4 [pass1]: text="eo RAE AT ERR TE RAE pA ail Ake ile\nJ - AY : a +68611 CE xX\nPFs ree _\n, Ey Ws 11 be ’ 3 : Sg\nYu | i. 7 } - }\n~ ll [| \\ a A \\ A rk’?" numbers=68611
- trace 5 [pass1]: text="EN wy TOOULl J Of. p" numbers=(none)
- trace 6 [pass1]: text="> al\need A i > 3 c) Z j" numbers=(none)
- trace 7 [pass1]: text="_ n\nah 6762\n1 YEG" numbers=6762
members: 343,001 343,056 257,235
BN: SUA A +68611 em NL
```

#### Audit Assessment

- Values exist as the same set, but current runner output still lacks bounding-box proof for safe automatic reordering.
- Current evidence is useful for designing the next audit, but not enough by itself for production correction.

## Recommendation

- Keep this audit runner-only.
- Do not implement production member-order repair until selected values include per-token source geometry or explicit slot provenance.
- The most promising future target remains `IMG_9240.png:stage3`, because the selected and expected non-zero member sets are identical.
- `IMG_9254.png:stage3` and `IMG_9281.png:stage3` need total/member/crown slot provenance, not just value order.

## Broader BBox-Backed Batch Summary: 2026-06-25

This pass reviewed 14 remaining filename-keyed known correction entries that may involve member order, slot assignment, sparse slot shift, or crown/total confusion. The detailed evidence above remains the source-level audit for the strongest member-order cases; this section adds the broader batch classification.

| Correction key | Classification | Reason |
| --- | --- | --- |
| `IMG_9240.png:stage1` | C. keep individual | Crown/member swap remains; not a safe order-only removal. |
| `IMG_9240.png:stage3` | B. promising but needs more examples/evidence | Same non-zero member value set in a different order; bbox supports expected order, but total still has OCR delta. |
| `IMG_9250.png:stage2` | C. keep individual | Total is missing crown contribution; not member-order only. |
| `IMG_9250.png:stage3` | C. keep individual | Sparse enemy slot fills a blank with crown bonus. |
| `IMG_9251.png:stage1` | D. not enough data / missing expected JSON | No expected JSON in this batch; whole-result fallback remains individual. |
| `IMG_9251.png:stage2` | D. not enough data / missing expected JSON | No expected JSON in this batch; tiny sparse/browser fallback remains individual. |
| `IMG_9251.png:stage3` | D. not enough data / missing expected JSON | No expected JSON in this batch; tiny sparse/browser fallback remains individual. |
| `IMG_9254.png:stage2` | C. keep individual | Missing value/noise issue, not safe order-only correction. |
| `IMG_9254.png:stage3` | B. promising but needs more examples/evidence | Expected order is supported by member-zone evidence, but total/member/bonus assignment is confused. |
| `IMG_9264.png:stage2` | C. keep individual | Missing high member plus crown-as-member pattern. |
| `IMG_9264.png:stage3` | C. keep individual | Sparse/crown handling remains needed. |
| `IMG_9266.png:stage2` | C. keep individual | Missing high member plus crown-like value in member slot. |
| `IMG_9281.png:stage2` | C. keep individual | Crown-like value remains in member slot and high member is missing. |
| `IMG_9281.png:stage3` | B. promising but needs more examples/evidence | Sparse slot-shift evidence is promising, but total/member confusion remains high-risk. |

Classification counts:

| Classification | Count |
| --- | ---: |
| A. bbox-backed safe removal candidate | 0 |
| B. promising but needs more examples/evidence | 3 |
| C. keep individual | 8 |
| D. not enough data / missing expected JSON | 3 |

Production recommendation: do not implement member-order correction yet. The next useful step is to gather more repeated bbox-backed examples or expose stronger slot provenance before attempting a generic rule.
