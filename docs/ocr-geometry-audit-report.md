# OCR Geometry Audit Report

Generated: 2026-06-24T21:38:16.472Z

## Scope

This is runner-only audit output from `scripts/ocr-test-images.mjs`.
It uses Tesseract.js worker output options to capture `blocks`/symbol bounding boxes for audit targets only.
It does not change OCR selection, browser behavior, or known corrections.

## Summary

- audit images scanned: 3
- geometry source: Tesseract.js `worker.recognize(..., { text: true, blocks: true, hocr: true, tsv: true })`
- bbox coordinates are reported as crop-relative and full-image-relative rectangles.

## user-reports/unreviewed/IMG_9240.png

- disabled known correction(s): IMG_9240.png:stage3, IMG_9254.png:stage3, IMG_9281.png:stage3
- expected JSON: yes
- pass: no
- image size: 1206x2622

### S3 self

- failures: S3 self total expected 966536 actual 966556; S3 self member1 expected 287111 actual 331368; S3 self member2 expected 331368 actual 281784; S3 self member3 expected 281784 actual 287111
- selected members: slot1=331,368, slot2=281,784, slot3=287,111
- selected total: 966,556
- expected members: slot1=287,111, slot2=331,368, slot3=281,784
- expected total: 966,536
- bbox-derived member-zone order for expected values: 287111, 331368, 281784
- values appear visually in expected order: yes
- selected order differs from bbox order: yes
- future generic rule looks safe now: no

#### Geometry Span Matches

| value | selected slot(s) | expected slot(s) | crop bbox | full-image bbox | source word | min symbol confidence |
| ---: | --- | --- | --- | --- | --- | ---: |
| 966,556 | total | - | (440,196)-(1488,396) | (506,1769)-(1554,1969) | `966,5565` | 98 |
| 331,368 | member1 | member2 | (720,336)-(1264,448) | (786,1961)-(1330,2073) | `287.111331,368281,784` | 0 |
| 281,784 | member2 | member3 | (1368,336)-(1912,464) | (1434,1961)-(1978,2089) | `287.111331,368281,784` | 0 |
| 287,111 | member3 | member1 | (96,336)-(636,448) | (162,1961)-(702,2073) | `287.111331,368281,784` | 98 |
| 331,368 | member1 | member2 | (720,124)-(1264,236) | (786,1802)-(1330,1914) | `287,111331,368281,784` | 0 |
| 281,784 | member2 | member3 | (1368,124)-(1912,252) | (1434,1802)-(1978,1930) | `287,111331,368281,784` | 8 |
| 287,111 | member3 | member1 | (96,124)-(636,236) | (162,1802)-(702,1914) | `287,111331,368281,784` | 98 |
| 331,368 | member1 | member2 | (720,124)-(1264,236) | (786,1802)-(1330,1914) | `287,111331,368281,784` | 0 |
| 281,784 | member2 | member3 | (1368,124)-(1912,252) | (1434,1802)-(1978,1930) | `287,111331,368281,784` | 8 |
| 287,111 | member3 | member1 | (96,124)-(636,236) | (162,1802)-(702,1914) | `287,111331,368281,784` | 98 |
| 331,368 | member1 | member2 | (720,124)-(1264,236) | (786,1802)-(1330,1914) | `287,111331,368281,784` | 0 |
| 281,784 | member2 | member3 | (1368,124)-(1912,252) | (1434,1802)-(1978,1930) | `287,111331,368281,784` | 8 |
| 287,111 | member3 | member1 | (96,124)-(636,236) | (162,1802)-(702,1914) | `287,111331,368281,784` | 98 |
| 331,368 | member1 | member2 | (720,124)-(1264,236) | (786,1802)-(1330,1914) | `287,111331,368281,784` | 0 |
| 281,784 | member2 | member3 | (1368,124)-(1912,252) | (1434,1802)-(1978,1930) | `287,111331,368281,784` | 8 |
| 287,111 | member3 | member1 | (96,124)-(636,236) | (162,1802)-(702,1914) | `287,111331,368281,784` | 98 |
| 331,368 | member1 | member2 | (720,124)-(1264,236) | (786,1802)-(1330,1914) | `287,111331,368281,784` | 0 |
| 281,784 | member2 | member3 | (1368,124)-(1912,252) | (1434,1802)-(1978,1930) | `287,111331,368281,784` | 8 |
| 287,111 | member3 | member1 | (96,124)-(636,236) | (162,1802)-(702,1914) | `287,111331,368281,784` | 98 |

#### OCR Zone Tokens

##### self total direct

- zone: left=66, top=1809, width=536, height=170
- raw text: "5   3 7  .\n44   2 0"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `5` | (none) | (140,252)-(236,528) | (206,2061)-(302,2337) | 7 |
| `3` | (none) | (1072,108)-(1192,484) | (1138,1917)-(1258,2293) | 81 |
| `7` | (none) | (1188,56)-(1556,300) | (1254,1865)-(1622,2109) | 0 |
| `.` | (none) | (1664,0)-(2144,232) | (1730,1809)-(2210,2041) | 25 |
| `44` | (none) | (72,444)-(290,592) | (138,2253)-(356,2401) | 0 |
| `2` | (none) | (1368,336)-(1559,540) | (1434,2145)-(1625,2349) | 50 |
| `0` | (none) | (1768,280)-(1924,420) | (1834,2089)-(1990,2229) | 43 |

##### self total candidate 1

- zone: left=66, top=1573, width=536, height=170
- raw text: "966,5565"
- parsed zone numbers: 966556

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `966,5565` | 966556 | (440,196)-(1635,432) | (506,1769)-(1701,2005) | 0 |

##### self total candidate 2

- zone: left=66, top=1625, width=536, height=170
- raw text: "900,0506\n287.111331,368281,784"
- parsed zone numbers: 900050, 331368, 281784

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `900,0506` | 900050 | (440,0)-(1640,224) | (506,1625)-(1706,1849) | 0 |
| `287.111331,368281,784` | 331368, 281784 | (96,336)-(1912,464) | (162,1961)-(1978,2089) | 0 |

##### self total candidate 3

- zone: left=66, top=1678, width=536, height=170
- raw text: "784\n281,78\n368\n1  6527\n7"
- parsed zone numbers: 6527

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `784` | (none) | (1664,124)-(1912,236) | (1730,1802)-(1978,1914) | 96 |
| `281,78` | (none) | (1368,124)-(1640,368) | (1434,1802)-(1706,2046) | 76 |
| `368` | (none) | (940,0)-(1264,236) | (1006,1678)-(1330,1914) | 43 |
| `1` | (none) | (560,128)-(736,320) | (626,1806)-(802,1998) | 61 |
| `6527` | 6527 | (912,328)-(1220,604) | (978,2006)-(1286,2282) | 61 |
| `7` | (none) | (40,284)-(1940,680) | (106,1962)-(2006,2358) | 17 |

##### self total candidate 4

- zone: left=66, top=1730, width=536, height=170
- raw text: "466273     ."
- parsed zone numbers: 466273

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `466273` | 466273 | (524,108)-(1300,228) | (590,1838)-(1366,1958) | 0 |
| `.` | (none) | (1824,160)-(1846,176) | (1890,1890)-(1912,1906) | 0 |

##### self total candidate 5

- zone: left=66, top=1769, width=536, height=170
- raw text: "23\n     4"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `23` | (none) | (72,0)-(1932,680) | (138,1769)-(1998,2449) | 0 |
| `4` | (none) | (1604,528)-(1804,636) | (1670,2297)-(1870,2405) | 8 |

##### self total candidate 6

- zone: left=66, top=1809, width=536, height=170
- raw text: "5   3 7  .\n44   2 0"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `5` | (none) | (140,252)-(236,528) | (206,2061)-(302,2337) | 7 |
| `3` | (none) | (1072,108)-(1192,484) | (1138,1917)-(1258,2293) | 81 |
| `7` | (none) | (1188,56)-(1556,300) | (1254,1865)-(1622,2109) | 0 |
| `.` | (none) | (1664,0)-(2144,232) | (1730,1809)-(2210,2041) | 25 |
| `44` | (none) | (72,444)-(290,592) | (138,2253)-(356,2401) | 0 |
| `2` | (none) | (1368,336)-(1559,540) | (1434,2145)-(1625,2349) | 50 |
| `0` | (none) | (1768,280)-(1924,420) | (1834,2089)-(1990,2229) | 43 |

##### self total candidate 7

- zone: left=66, top=1861, width=536, height=170
- raw text: "72621"
- parsed zone numbers: 72621

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `72621` | 72621 | (400,484)-(1700,644) | (466,2345)-(1766,2505) | 0 |

##### self member candidate 1

- zone: left=66, top=1678, width=536, height=275
- raw text: "287,111331,368281,784\n\n166273\n\n   30\n 4       .\n\n4.6"
- parsed zone numbers: 287111, 331368, 281784, 166273

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `287,111331,368281,784` | 287111, 331368, 281784 | (96,124)-(1912,252) | (162,1802)-(1978,1930) | 0 |
| `166273` | 166273 | (524,316)-(1300,436) | (590,1994)-(1366,2114) | 0 |
| `30` | (none) | (1740,472)-(1908,544) | (1806,2150)-(1974,2222) | 0 |
| `4` | (none) | (860,468)-(1172,704) | (926,2146)-(1238,2382) | 17 |
| `.` | (none) | (1480,548)-(1552,660) | (1546,2226)-(1618,2338) | 59 |
| `4.6` | (none) | (72,864)-(1864,1100) | (138,2542)-(1930,2778) | 0 |

##### self member candidate 2

- zone: left=66, top=1678, width=536, height=275
- raw text: "287,111331,368281,784\n\n166273\n\n   30\n 4       .\n\n4.6"
- parsed zone numbers: 287111, 331368, 281784, 166273

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `287,111331,368281,784` | 287111, 331368, 281784 | (96,124)-(1912,252) | (162,1802)-(1978,1930) | 0 |
| `166273` | 166273 | (524,316)-(1300,436) | (590,1994)-(1366,2114) | 0 |
| `30` | (none) | (1740,472)-(1908,544) | (1806,2150)-(1974,2222) | 0 |
| `4` | (none) | (860,468)-(1172,704) | (926,2146)-(1238,2382) | 17 |
| `.` | (none) | (1480,548)-(1552,660) | (1546,2226)-(1618,2338) | 59 |
| `4.6` | (none) | (72,864)-(1864,1100) | (138,2542)-(1930,2778) | 0 |

##### self member candidate 3

- zone: left=66, top=1678, width=536, height=275
- raw text: "287,111331,368281,784\n\n166273\n\n   30\n 4       .\n\n4.6"
- parsed zone numbers: 287111, 331368, 281784, 166273

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `287,111331,368281,784` | 287111, 331368, 281784 | (96,124)-(1912,252) | (162,1802)-(1978,1930) | 0 |
| `166273` | 166273 | (524,316)-(1300,436) | (590,1994)-(1366,2114) | 0 |
| `30` | (none) | (1740,472)-(1908,544) | (1806,2150)-(1974,2222) | 0 |
| `4` | (none) | (860,468)-(1172,704) | (926,2146)-(1238,2382) | 17 |
| `.` | (none) | (1480,548)-(1552,660) | (1546,2226)-(1618,2338) | 59 |
| `4.6` | (none) | (72,864)-(1864,1100) | (138,2542)-(1930,2778) | 0 |

##### self member candidate 4

- zone: left=66, top=1678, width=536, height=275
- raw text: "287,111331,368281,784\n\n166273\n\n   30\n 4       .\n\n4.6"
- parsed zone numbers: 287111, 331368, 281784, 166273

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `287,111331,368281,784` | 287111, 331368, 281784 | (96,124)-(1912,252) | (162,1802)-(1978,1930) | 0 |
| `166273` | 166273 | (524,316)-(1300,436) | (590,1994)-(1366,2114) | 0 |
| `30` | (none) | (1740,472)-(1908,544) | (1806,2150)-(1974,2222) | 0 |
| `4` | (none) | (860,468)-(1172,704) | (926,2146)-(1238,2382) | 17 |
| `.` | (none) | (1480,548)-(1552,660) | (1546,2226)-(1618,2338) | 59 |
| `4.6` | (none) | (72,864)-(1864,1100) | (138,2542)-(1930,2778) | 0 |

##### self member candidate 5

- zone: left=66, top=1678, width=536, height=275
- raw text: "287,111331,368281,784\n\n166273\n\n   30\n 4       .\n\n4.6"
- parsed zone numbers: 287111, 331368, 281784, 166273

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `287,111331,368281,784` | 287111, 331368, 281784 | (96,124)-(1912,252) | (162,1802)-(1978,1930) | 0 |
| `166273` | 166273 | (524,316)-(1300,436) | (590,1994)-(1366,2114) | 0 |
| `30` | (none) | (1740,472)-(1908,544) | (1806,2150)-(1974,2222) | 0 |
| `4` | (none) | (860,468)-(1172,704) | (926,2146)-(1238,2382) | 17 |
| `.` | (none) | (1480,548)-(1552,660) | (1546,2226)-(1618,2338) | 59 |
| `4.6` | (none) | (72,864)-(1864,1100) | (138,2542)-(1930,2778) | 0 |

##### self member candidate 6

- zone: left=66, top=1743, width=536, height=275
- raw text: "4\n2 1  5\n792621"
- parsed zone numbers: 792621

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `4` | (none) | (1504,348)-(1588,564) | (1570,2091)-(1654,2307) | 32 |
| `2` | (none) | (72,660)-(236,828) | (138,2403)-(302,2571) | 2 |
| `1` | (none) | (700,624)-(1032,856) | (766,2367)-(1098,2599) | 0 |
| `5` | (none) | (1344,620)-(1864,856) | (1410,2363)-(1930,2599) | 0 |
| `792621` | 792621 | (400,920)-(2144,1100) | (466,2663)-(2210,2843) | 0 |

##### self member candidate 7

- zone: left=66, top=1809, width=536, height=275
- raw text: "4  .\n24\n72621"
- parsed zone numbers: 72621

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `4` | (none) | (184,192)-(228,316) | (250,2001)-(294,2125) | 46 |
| `.` | (none) | (700,160)-(1277,484) | (766,1969)-(1343,2293) | 0 |
| `24` | (none) | (72,396)-(292,592) | (138,2205)-(358,2401) | 0 |
| `72621` | 72621 | (400,692)-(1700,852) | (466,2501)-(1766,2661) | 0 |

##### self member candidate 8

- zone: left=66, top=1874, width=536, height=275
- raw text: "72621"
- parsed zone numbers: 72621

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `72621` | 72621 | (400,432)-(1700,592) | (466,2306)-(1766,2466) | 0 |

#### Assessment

- Geometry supports the expected member order in member candidate crops.
- This is still audit-only evidence; production member-order correction should wait for more repeated cases and a stricter rule.

## user-reports/unreviewed/IMG_9254.png

- disabled known correction(s): IMG_9240.png:stage3, IMG_9254.png:stage3, IMG_9281.png:stage3
- expected JSON: yes
- pass: no
- image size: 1206x2622

### S3 self

- failures: S3 self total expected 148739 actual 74178; S3 self member3 expected 74178 actual 14835
- selected members: slot1=31,440, slot2=28,286, slot3=14,835
- selected total: 74,178
- expected members: slot1=31,440, slot2=28,286, slot3=74,178
- expected total: 148,739
- bbox-derived member-zone order for expected values: 31440, 28286, 74178
- values appear visually in expected order: yes
- selected order differs from bbox order: yes
- future generic rule looks safe now: no

#### Geometry Span Matches

| value | selected slot(s) | expected slot(s) | crop bbox | full-image bbox | source word | min symbol confidence |
| ---: | --- | --- | --- | --- | --- | ---: |
| 148,739 | - | total | (452,192)-(1640,396) | (518,1765)-(1706,1969) | `148.739` | 55 |
| 148,739 | - | total | (452,0)-(1640,188) | (518,1625)-(1706,1813) | `148,739` | 56 |
| 31,440 | member1 | member1 | (136,336)-(596,448) | (202,1961)-(662,2073) | `31,44028,28674,178` | 98 |
| 28,286 | member2 | member2 | (764,336)-(1224,448) | (830,1961)-(1290,2073) | `31,44028,28674,178` | 19 |
| 74,178 | total | member3 | (1412,336)-(1868,448) | (1478,1961)-(1934,2073) | `31,44028,28674,178` | 7 |
| 14,835 | member3 | - | (1520,492)-(1975,680) | (1586,2117)-(2041,2305) | `.441483518` | 55 |
| 31,440 | member1 | member1 | (136,124)-(596,236) | (202,1802)-(662,1914) | `31,44028,28674,178` | 98 |
| 28,286 | member2 | member2 | (764,124)-(1224,236) | (830,1802)-(1290,1914) | `31,44028,28674,178` | 30 |
| 74,178 | total | member3 | (1412,124)-(1868,236) | (1478,1802)-(1934,1914) | `31,44028,28674,178` | 7 |
| 14,835 | member3 | - | (1560,328)-(1944,420) | (1626,2006)-(2010,2098) | `.414835` | 88 |
| 14,835 | member3 | - | (1560,120)-(1944,212) | (1626,1850)-(2010,1942) | `414835` | 48 |
| 31,440 | member1 | member1 | (136,124)-(596,236) | (202,1802)-(662,1914) | `31,44028,28674,178` | 98 |
| 28,286 | member2 | member2 | (764,124)-(1224,236) | (830,1802)-(1290,1914) | `31,44028,28674,178` | 10 |
| 74,178 | total | member3 | (1412,124)-(1868,236) | (1478,1802)-(1934,1914) | `31,44028,28674,178` | 10 |
| 14,835 | member3 | - | (1540,328)-(1944,484) | (1606,2006)-(2010,2162) | `4114835` | 90 |
| 31,440 | member1 | member1 | (136,124)-(596,236) | (202,1802)-(662,1914) | `31,44028,28674,178` | 98 |
| 28,286 | member2 | member2 | (764,124)-(1224,236) | (830,1802)-(1290,1914) | `31,44028,28674,178` | 10 |
| 74,178 | total | member3 | (1412,124)-(1868,236) | (1478,1802)-(1934,1914) | `31,44028,28674,178` | 10 |
| 14,835 | member3 | - | (1540,328)-(1944,484) | (1606,2006)-(2010,2162) | `4114835` | 90 |
| 31,440 | member1 | member1 | (136,124)-(596,236) | (202,1802)-(662,1914) | `31,44028,28674,178` | 98 |
| 28,286 | member2 | member2 | (764,124)-(1224,236) | (830,1802)-(1290,1914) | `31,44028,28674,178` | 10 |
| 74,178 | total | member3 | (1412,124)-(1868,236) | (1478,1802)-(1934,1914) | `31,44028,28674,178` | 10 |
| 14,835 | member3 | - | (1540,328)-(1944,484) | (1606,2006)-(2010,2162) | `4114835` | 90 |
| 31,440 | member1 | member1 | (136,124)-(596,236) | (202,1802)-(662,1914) | `31,44028,28674,178` | 98 |
| 28,286 | member2 | member2 | (764,124)-(1224,236) | (830,1802)-(1290,1914) | `31,44028,28674,178` | 10 |
| 74,178 | total | member3 | (1412,124)-(1868,236) | (1478,1802)-(1934,1914) | `31,44028,28674,178` | 10 |
| 14,835 | member3 | - | (1540,328)-(1944,484) | (1606,2006)-(2010,2162) | `4114835` | 90 |
| 31,440 | member1 | member1 | (136,124)-(596,236) | (202,1802)-(662,1914) | `31,44028,28674,178` | 98 |
| 28,286 | member2 | member2 | (764,124)-(1224,236) | (830,1802)-(1290,1914) | `31,44028,28674,178` | 10 |
| 74,178 | total | member3 | (1412,124)-(1868,236) | (1478,1802)-(1934,1914) | `31,44028,28674,178` | 10 |
| 14,835 | member3 | - | (1540,328)-(1944,484) | (1606,2006)-(2010,2162) | `4114835` | 90 |
| 14,835 | member3 | - | (1560,68)-(1944,224) | (1626,1811)-(2010,1967) | `414835` | 81 |

#### OCR Zone Tokens

##### self total direct

- zone: left=66, top=1809, width=536, height=170
- raw text: "10"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `10` | (none) | (80,156)-(1768,592) | (146,1965)-(1834,2401) | 0 |

##### self total candidate 1

- zone: left=66, top=1573, width=536, height=170
- raw text: "148.739"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `148.739` | (none) | (452,192)-(1640,432) | (518,1765)-(1706,2005) | 0 |

##### self total candidate 2

- zone: left=66, top=1625, width=536, height=170
- raw text: "148,739\n31,44028,28674,178\n  .441483518"
- parsed zone numbers: 148739, 31440, 28286, 74178

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `148,739` | 148739 | (452,0)-(1640,224) | (518,1625)-(1706,1849) | 0 |
| `31,44028,28674,178` | 31440, 28286, 74178 | (136,336)-(1868,464) | (202,1961)-(1934,2089) | 0 |
| `.441483518` | (none) | (616,492)-(2132,680) | (682,2117)-(2198,2305) | 0 |

##### self total candidate 3

- zone: left=66, top=1678, width=536, height=170
- raw text: "31,44028,28674,178\n7 .414835"
- parsed zone numbers: 31440, 28286, 74178, 414835

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `31,44028,28674,178` | 31440, 28286, 74178 | (136,124)-(1868,252) | (202,1802)-(1934,1930) | 0 |
| `7` | (none) | (40,328)-(651,680) | (106,2006)-(717,2358) | 34 |
| `.414835` | 414835 | (304,316)-(1944,468) | (370,1994)-(2010,2146) | 0 |

##### self total candidate 4

- zone: left=66, top=1730, width=536, height=170
- raw text: ".\n    414835\n 3\n ."
- parsed zone numbers: 414835

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `.` | (none) | (764,0)-(1216,44) | (830,1730)-(1282,1774) | 0 |
| `414835` | 414835 | (896,108)-(1944,228) | (962,1838)-(2010,1958) | 0 |
| `3` | (none) | (1400,292)-(1540,508) | (1466,2022)-(1606,2238) | 0 |
| `.` | (none) | (1244,596)-(1272,668) | (1310,2326)-(1338,2398) | 0 |

##### self total candidate 5

- zone: left=66, top=1769, width=536, height=170
- raw text: ".\n 0"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `.` | (none) | (616,88)-(632,112) | (682,1857)-(698,1881) | 0 |
| `0` | (none) | (1776,228)-(1899,372) | (1842,1997)-(1965,2141) | 44 |

##### self total candidate 6

- zone: left=66, top=1809, width=536, height=170
- raw text: "10"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `10` | (none) | (80,156)-(1768,592) | (146,1965)-(1834,2401) | 0 |

##### self total candidate 7

- zone: left=66, top=1861, width=536, height=170
- raw text: "4    1\n0\n58488"
- parsed zone numbers: 58488

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `4` | (none) | (72,0)-(491,184) | (138,1861)-(557,2045) | 0 |
| `1` | (none) | (1168,0)-(1424,92) | (1234,1861)-(1490,1953) | 0 |
| `0` | (none) | (40,0)-(1940,396) | (106,1861)-(2006,2257) | 0 |
| `58488` | 58488 | (400,480)-(1696,644) | (466,2341)-(1762,2505) | 0 |

##### self member candidate 1

- zone: left=66, top=1678, width=536, height=275
- raw text: "31,44028,28674,178\n4114835"
- parsed zone numbers: 31440, 28286, 74178, 4114835

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `31,44028,28674,178` | 31440, 28286, 74178 | (136,124)-(1868,252) | (202,1802)-(1934,1930) | 0 |
| `4114835` | 4114835 | (92,316)-(1944,488) | (158,1994)-(2010,2166) | 0 |

##### self member candidate 2

- zone: left=66, top=1678, width=536, height=275
- raw text: "31,44028,28674,178\n4114835"
- parsed zone numbers: 31440, 28286, 74178, 4114835

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `31,44028,28674,178` | 31440, 28286, 74178 | (136,124)-(1868,252) | (202,1802)-(1934,1930) | 0 |
| `4114835` | 4114835 | (92,316)-(1944,488) | (158,1994)-(2010,2166) | 0 |

##### self member candidate 3

- zone: left=66, top=1678, width=536, height=275
- raw text: "31,44028,28674,178\n4114835"
- parsed zone numbers: 31440, 28286, 74178, 4114835

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `31,44028,28674,178` | 31440, 28286, 74178 | (136,124)-(1868,252) | (202,1802)-(1934,1930) | 0 |
| `4114835` | 4114835 | (92,316)-(1944,488) | (158,1994)-(2010,2166) | 0 |

##### self member candidate 4

- zone: left=66, top=1678, width=536, height=275
- raw text: "31,44028,28674,178\n4114835"
- parsed zone numbers: 31440, 28286, 74178, 4114835

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `31,44028,28674,178` | 31440, 28286, 74178 | (136,124)-(1868,252) | (202,1802)-(1934,1930) | 0 |
| `4114835` | 4114835 | (92,316)-(1944,488) | (158,1994)-(2010,2166) | 0 |

##### self member candidate 5

- zone: left=66, top=1678, width=536, height=275
- raw text: "31,44028,28674,178\n4114835"
- parsed zone numbers: 31440, 28286, 74178, 4114835

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `31,44028,28674,178` | 31440, 28286, 74178 | (136,124)-(1868,252) | (202,1802)-(1934,1930) | 0 |
| `4114835` | 4114835 | (92,316)-(1944,488) | (158,1994)-(2010,2166) | 0 |

##### self member candidate 6

- zone: left=66, top=1743, width=536, height=275
- raw text: "414835\n\n4 ,\n\n0\n5488"
- parsed zone numbers: 414835, 5488

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `414835` | 414835 | (92,56)-(1944,224) | (158,1799)-(2010,1967) | 0 |
| `4` | (none) | (56,368)-(736,480) | (122,2111)-(802,2223) | 0 |
| `,` | (none) | (780,380)-(940,508) | (846,2123)-(1006,2251) | 0 |
| `0` | (none) | (80,620)-(1768,856) | (146,2363)-(1834,2599) | 0 |
| `5488` | 5488 | (400,920)-(2144,1100) | (466,2663)-(2210,2843) | 0 |

##### self member candidate 7

- zone: left=66, top=1809, width=536, height=275
- raw text: "248758488"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `248758488` | (none) | (400,688)-(1696,852) | (466,2497)-(1762,2661) | 0 |

##### self member candidate 8

- zone: left=66, top=1874, width=536, height=275
- raw text: "5 0\n5758488"
- parsed zone numbers: 5758488

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `5` | (none) | (40,0)-(304,344) | (106,1874)-(370,2218) | 0 |
| `0` | (none) | (400,0)-(1922,568) | (466,1874)-(1988,2442) | 0 |
| `5758488` | 5758488 | (548,428)-(1696,592) | (614,2302)-(1762,2466) | 0 |

#### Assessment

- Geometry supports the expected member order in member candidate crops.
- This is still audit-only evidence; production member-order correction should wait for more repeated cases and a stricter rule.

## user-reports/unreviewed/IMG_9281.png

- disabled known correction(s): IMG_9240.png:stage3, IMG_9254.png:stage3, IMG_9281.png:stage3
- expected JSON: yes
- pass: no
- image size: 1206x2622

### S3 self

- failures: S3 self total expected 317624 actual 204908; S3 self member1 expected 204908 actual 112716; S3 self member2 expected 112716 actual 0
- selected members: slot1=112,716
- selected total: 204,908
- expected members: slot1=204,908, slot2=112,716, slot3=0
- expected total: 317,624
- bbox-derived member-zone order for expected values: 204908, 112716
- values appear visually in expected order: yes
- selected order differs from bbox order: yes
- future generic rule looks safe now: no

#### Geometry Span Matches

| value | selected slot(s) | expected slot(s) | crop bbox | full-image bbox | source word | min symbol confidence |
| ---: | --- | --- | --- | --- | --- | ---: |
| 317,624 | - | total | (444,192)-(1640,396) | (510,1765)-(1706,1969) | `317,624` | 46 |
| 112,716 | member1 | member2 | (720,544)-(1700,656) | (786,2117)-(1766,2229) | `204,908112,716` | 0 |
| 204,908 | total | member1 | (96,544)-(636,656) | (162,2117)-(702,2229) | `204,908112,716` | 98 |
| 112,716 | member1 | member2 | (720,336)-(1700,448) | (786,1961)-(1766,2073) | `204,908112,716` | 0 |
| 204,908 | total | member1 | (96,336)-(636,448) | (162,1961)-(702,2073) | `204,908112,716` | 99 |
| 112,716 | member1 | member2 | (720,124)-(1264,236) | (786,1802)-(1330,1914) | `204,908112,716` | 0 |
| 204,908 | total | member1 | (96,124)-(636,236) | (162,1802)-(702,1914) | `204,908112,716` | 98 |
| 112,716 | member1 | member2 | (676,52)-(1936,252) | (742,1730)-(2002,1930) | `204,908112,716` | 34 |
| 204,908 | total | member1 | (40,52)-(677,252) | (106,1730)-(743,1930) | `204,908112,716` | 97 |
| 112,716 | member1 | member2 | (676,52)-(1936,252) | (742,1730)-(2002,1930) | `204,908112,716` | 34 |
| 204,908 | total | member1 | (40,52)-(677,252) | (106,1730)-(743,1930) | `204,908112,716` | 97 |
| 112,716 | member1 | member2 | (676,52)-(1936,252) | (742,1730)-(2002,1930) | `204,908112,716` | 34 |
| 204,908 | total | member1 | (40,52)-(677,252) | (106,1730)-(743,1930) | `204,908112,716` | 97 |
| 112,716 | member1 | member2 | (676,52)-(1936,252) | (742,1730)-(2002,1930) | `204,908112,716` | 34 |
| 204,908 | total | member1 | (40,52)-(677,252) | (106,1730)-(743,1930) | `204,908112,716` | 97 |
| 112,716 | member1 | member2 | (676,52)-(1936,252) | (742,1730)-(2002,1930) | `204,908112,716` | 34 |
| 204,908 | total | member1 | (40,52)-(677,252) | (106,1730)-(743,1930) | `204,908112,716` | 97 |

#### OCR Zone Tokens

##### self total direct

- zone: left=66, top=1809, width=536, height=170
- raw text: ","
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `,` | (none) | (488,4)-(1236,120) | (554,1813)-(1302,1929) | 0 |

##### self total candidate 1

- zone: left=66, top=1573, width=536, height=170
- raw text: "7\n317,624\n204,908112,716"
- parsed zone numbers: 317624, 204908, 112716

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `7` | (none) | (1504,0)-(2144,124) | (1570,1573)-(2210,1697) | 0 |
| `317,624` | 317624 | (444,192)-(1640,432) | (510,1765)-(1706,2005) | 0 |
| `204,908112,716` | 204908, 112716 | (96,544)-(1700,672) | (162,2117)-(1766,2245) | 0 |

##### self total candidate 2

- zone: left=66, top=1625, width=536, height=170
- raw text: "217,024\n204,908112,716"
- parsed zone numbers: 217024, 204908, 112716

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `217,024` | 217024 | (444,0)-(1640,224) | (510,1625)-(1706,1849) | 0 |
| `204,908112,716` | 204908, 112716 | (96,336)-(1700,464) | (162,1961)-(1766,2089) | 0 |

##### self total candidate 3

- zone: left=66, top=1678, width=536, height=170
- raw text: "204,908112,716"
- parsed zone numbers: 204908, 112716

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `204,908112,716` | 204908, 112716 | (96,124)-(1264,252) | (162,1802)-(1330,1930) | 0 |

##### self total candidate 4

- zone: left=66, top=1730, width=536, height=170
- raw text: "9\n4 3"
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `9` | (none) | (96,0)-(1260,44) | (162,1730)-(1326,1774) | 0 |
| `4` | (none) | (216,136)-(520,444) | (282,1866)-(586,2174) | 0 |
| `3` | (none) | (700,256)-(1284,400) | (766,1986)-(1350,2130) | 8 |

##### self total candidate 5

- zone: left=66, top=1769, width=536, height=170
- raw text: "."
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `.` | (none) | (1000,100)-(1284,224) | (1066,1869)-(1350,1993) | 0 |

##### self total candidate 6

- zone: left=66, top=1809, width=536, height=170
- raw text: ","
- parsed zone numbers: (none)

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `,` | (none) | (488,4)-(1236,120) | (554,1813)-(1302,1929) | 0 |

##### self total candidate 7

- zone: left=66, top=1861, width=536, height=170
- raw text: "47292"
- parsed zone numbers: 47292

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `47292` | 47292 | (400,480)-(1696,640) | (466,2341)-(1762,2501) | 0 |

##### self member candidate 1

- zone: left=66, top=1678, width=536, height=275
- raw text: "204,908112,716"
- parsed zone numbers: 204908, 112716

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `204,908112,716` | 204908, 112716 | (40,52)-(1940,252) | (106,1730)-(2006,1930) | 0 |

##### self member candidate 2

- zone: left=66, top=1678, width=536, height=275
- raw text: "204,908112,716"
- parsed zone numbers: 204908, 112716

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `204,908112,716` | 204908, 112716 | (40,52)-(1940,252) | (106,1730)-(2006,1930) | 0 |

##### self member candidate 3

- zone: left=66, top=1678, width=536, height=275
- raw text: "204,908112,716"
- parsed zone numbers: 204908, 112716

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `204,908112,716` | 204908, 112716 | (40,52)-(1940,252) | (106,1730)-(2006,1930) | 0 |

##### self member candidate 4

- zone: left=66, top=1678, width=536, height=275
- raw text: "204,908112,716"
- parsed zone numbers: 204908, 112716

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `204,908112,716` | 204908, 112716 | (40,52)-(1940,252) | (106,1730)-(2006,1930) | 0 |

##### self member candidate 5

- zone: left=66, top=1678, width=536, height=275
- raw text: "204,908112,716"
- parsed zone numbers: 204908, 112716

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `204,908112,716` | 204908, 112716 | (40,52)-(1940,252) | (106,1730)-(2006,1930) | 0 |

##### self member candidate 6

- zone: left=66, top=1743, width=536, height=275
- raw text: "4792909"
- parsed zone numbers: 4792909

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `4792909` | 4792909 | (400,920)-(2144,1100) | (466,2663)-(2210,2843) | 0 |

##### self member candidate 7

- zone: left=66, top=1809, width=536, height=275
- raw text: "7\n47292"
- parsed zone numbers: 47292

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `7` | (none) | (56,100)-(948,224) | (122,1909)-(1014,2033) | 0 |
| `47292` | 47292 | (400,688)-(1696,848) | (466,2497)-(1762,2657) | 0 |

##### self member candidate 8

- zone: left=66, top=1874, width=536, height=275
- raw text: "47292"
- parsed zone numbers: 47292

| token text | normalized numeric value(s) | crop bbox | full-image bbox | confidence |
| --- | --- | --- | --- | ---: |
| `47292` | 47292 | (400,428)-(1696,588) | (466,2302)-(1762,2462) | 0 |

#### Assessment

- Geometry supports the expected member order in member candidate crops.
- This is still audit-only evidence; production member-order correction should wait for more repeated cases and a stricter rule.

## Recommendation

- Keep geometry capture runner-only.
- Do not implement production member-order correction yet.
- The next useful step is to collect more bbox-backed examples and design a rule that requires member-zone span order plus equation consistency.
