# OCR Raw Token / Fragment Audit

Generated: 2026-06-24T05:26:48.670Z

## Scope

This is a runner-only audit report produced by `scripts/ocr-test-images.mjs`.
It does not change OCR output and is not imported by the browser app.

## Availability

- Raw OCR text is available inside the runner from `recognizeOcrZone(...).text` before numeric parsing.
- Before this audit output, normal stage results preserved only numeric arrays under `result.stageN.raw`.
- This report preserves runner-only `rawText` fields for direct total crops, alternative total candidate crops, and selected member crops.
- It does not expose browser OCR text; app runtime code remains untouched.

## Target Data Needed For IMG_9243 Stage2

- Raw text for Stage2 enemy total direct crop.
- Raw text/traces for Stage2 enemy alternative total candidate crops.
- Raw text for Stage2 enemy member crop.
- Token fragments that might support a displayed total like `448 97 6m`.

## Summary

- images scanned: 10
- mobile audit images with disabled corrections/failures: 10

## Raw Token Details

### fewer-members/IMG_9163.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: yes
- pass: no

#### S1 self

- failures: S1 self total expected 653835 actual 660368; S1 self member1 expected 544861 actual 6535; S1 self member2 expected 0 actual 544861; S1 self member3 expected 0 actual 108972
- selected members: 6535, 544861, 108972
- selected total: 660,368
- expected members: 544861, 0, 0
- expected total: 653,835
- raw numeric candidates: 6535, 544861, 108972
- extracted raw text tokens/fragments: `WIN`, `+`, `27
653,83 3m`, `\`, `A`, `WIN`, `+`, `27
ALEX OXZX`, `WIN`, `+`, `27
6535 833k`, `:`, `WIN`, `+`, `27
653,83 3m`, `WIN`, `+`, `27`, `-`, `653,833m

WIN`, `+`, `27`, `-`, `LAAN`, `MARA`, `655,855m
544,`, `861`, `«—`, `—`, `aR.`, `CT`, `655,83 5n
544`, `,861`, `-`, `-`, `WIN`, `+`, `27`, `-`, `6535,833m
544`, `,861`, `—`, `_`, `&4+108972`

Raw OCR text:
```text
total direct: WIN + 27
653,83 3m
total candidate traces:
- trace 1 [pass1]: text="\\ A\nWIN + 27\nALEX OXZX" numbers=(none)
- trace 2 [pass1]: text="WIN + 27\n6535 833k:" numbers=6535
- trace 3 [pass1]: text="WIN + 27\n653,83 3m" numbers=(none)
- trace 4 [pass1]: text="WIN + 27-\n653,833m" numbers=653833
- trace 5 [pass1]: text="WIN + 27-" numbers=(none)
- trace 6 [pass1]: text="LAAN MARA\n655,855m\n544,861 «— —" numbers=655855, 544861
- trace 7 [pass1]: text="aR. CT\n655,83 5n\n544,861 - -" numbers=544861
members: WIN + 27-
6535,833m
544,861 — _
&4+108972
```

#### S1 enemy

- failures: none
- selected members: 162233, 56973, 138410
- selected total: 357,616
- expected members: 162233, 56973, 138410
- expected total: 357,616
- raw numeric candidates: 357616, 357616, 162233, 56973, 138410
- extracted raw text tokens/fragments: `BR`, `IN`, `357,616r

AA`, `JT`, `+`, `2 LT LA1 4L`, `ST`, `+`, `JT`, `+`, `357.616k

BR`, `IN`, `357,616r

v1`, `+`, `357,616`, `+`, `J`, `1`, `+`, `357,616`, `¢t`, `357,616rt
162`, `,233`, `56,973 138,41`, `0

357,616rt`, `162,233 56,97`, `3 138,410

JL`, `+`, `357,616`, `¢`, `162,233 56,97`, `3 138,410`

Raw OCR text:
```text
total direct: BR IN
357,616r
total candidate traces:
- trace 1 [pass1]: text="AA\nJT +\n2 LT LA1 4L" numbers=(none)
- trace 2 [pass1]: text="ST +\nJT +\n357.616k" numbers=(none)
- trace 3 [pass1]: text="BR IN\n357,616r" numbers=357616
- trace 4 [pass1]: text="v1 +\n357,616+" numbers=357616
- trace 5 [pass1]: text="J 1 +\n357,616¢t" numbers=357616
- trace 6 [pass1]: text="357,616rt\n162,233 56,973 138,410" numbers=357616, 162233, 56973, 138410
- trace 7 [pass1]: text="357,616rt\n162,233 56,973 138,410" numbers=357616, 162233, 56973, 138410
members: JL +
357,616¢
162,233 56,973 138,410
```

#### S2 self

- failures: none
- selected members: 134263, 183334, 74512
- selected total: 428,775
- expected members: 134263, 183334, 74512
- expected total: 428,775
- raw numeric candidates: 36666, 134263, 183334, 74512, 36666
- extracted raw text tokens/fragments: `adi`, `Pall`, `LADD`, `Im,`, `JALL`, `a»`, `Y`, `|`, `+36666`, `~`, `A`, `="`, `~'`, `;`, `74`, `|`, `|`, `b`, `>)`, `a`, `=o`, `1`, `»`, `»`, `|`, `o`, `/`, `L`, `~`, `CT`, `>,`, `}`, `428.77 5k
134`, `,263`, `183,334 74,51`, `2

LQ, 7 1 IP`, `L`, `134,263 183,3`, `34 74,512
y y`, `FRE`, `ie`, `LY`, `134,263 183,3`, `34 74,512
4 T`, `ON`, `1 is CW`, `)`, `“A.`, `ne`, `v`, `134,263 183,3`, `34 74,512
Fd`, `RR`, `4`, `+56666`, `=`, `V`, `¥`, `yi`, `2`, `)`, `l=`, `IV`, `i`, `|`, `bi`, `{`, `.`, `By`, `adi`, `Pall`, `LADD`, `Im,`, `JALL`, `a»`, `Y`, `|`, `+36666`, `~`, `A`, `="`, `~'`, `;`, `74`, `|`, `|`, `b`, `>)`, `a`, `=o`, `1`, `»`, `»`, `|`, `o`, `/`, `L`, `~`, `CT`, `>,`, `}`, `Fam`, `4`, `+36666 N`, `’`, `elf`, `nal`, `~`, `oT`, `Ch`, `a`, `Pat`, `Salt`, `3 df

ON ad`, `|`, `4 AI Z..`, `-`, `iii`, `h`, `2`, `“a`, `4 iy`, `~`, `ie`, `Vv`, `eid`, `“|`, `dha`, `~`, `4`, `)`, `A`, `’`, `A`, `EER`, `-`, `-`, `-`, `LAA`, `ME`, `428,77 Sp

13`, `4,263 183,334`, `74,512

PF am`, `HM`, `+36666 N`

Raw OCR text:
```text
total direct: adi Pall LADD Im, JALL
a» Y | +36666 ~
A =" ~' ; 74 | |
b >) a =o 1 » » | o /
L ~ CT >, }
total candidate traces:
- trace 1 [pass1]: text="428.77 5k\n134,263 183,334 74,512" numbers=134263, 183334, 74512
- trace 2 [pass1]: text="LQ, 7 1 IPL\n134,263 183,334 74,512\ny y FRE ie LY" numbers=134263, 183334, 74512
- trace 3 [pass1]: text="134,263 183,334 74,512\n4 TON 1 is CW) “A. ne v" numbers=134263, 183334, 74512
- trace 4 [pass1]: text="134,263 183,334 74,512\nFd RR 4 +56666 = V\n¥ yi 2 ) l= IV i | bi { . By" numbers=134263, 183334, 74512, 56666
- trace 5 [pass1]: text="adi Pall LADD Im, JALL\na» Y | +36666 ~\nA =\" ~' ; 74 | |\nb >) a =o 1 » » | o /\nL ~ CT >, }" numbers=36666
- trace 6 [pass1]: text="Fam 4 +36666 N\n’ elf nal ~\noT\n\nCh a Pat Salt 3 df\n\nON ad | 4 AI Z.." numbers=36666
- trace 7 [pass1]: text="- iii h 2 “a 4 iy ~ ie Vv\neid “| dha ~ 4) A\n’ A EER - - -" numbers=(none)
members: LAA ME
428,77 Sp

134,263 183,334 74,512

PF am HM +36666 N
```

#### S2 enemy

- failures: none
- selected members: 123530, 69768, 66948
- selected total: 260,246
- expected members: 123530, 69768, 66948
- expected total: 260,246
- raw numeric candidates: 123530, 69768, 66948, 260246, 123530, 69768, 56938
- extracted raw text tokens/fragments: `123,530 69,76`, `8 66,948
sexi`, `74

260,246`, `¢:`, `123,530 69,76`, `8 66,948`, `£`, `OV,`, `LS5UPt`, `123,530 69,76`, `8 66,948
FF N`, `EN`, `123,530 69,76`, `8 66,948
sexi`, `74

123,530 6`, `9,768 66,948`, `iho`, `dd`, `DT,`, `FOO`, `VO,`, `790
S`, `|`, `N`, `,`, `o`, `|`, `3 N`, `\`, `|`, `.`, `E`, `1. ar Ke i`, `———`, `d`, `r_`, `©`, `4 AD`, `“.`, `4
S`, `|`, `a}`, `NE)`, `'®`, `?`, `a`, `“`, `pad`, `J`, `N`, `on`, `58 mot`, `-`, `a`, `IPL"`, `Dan`, `de®`, `|`, `a”`, `k`, `AS`, `~`, `y`, `<`, `"7`, `260,246
123,5`, `30 69,768 56,`, `938`

Raw OCR text:
```text
total direct: 123,530 69,768 66,948
sexi 74
total candidate traces:
- trace 1 [pass1]: text="260,246¢:\n123,530 69,768 66,948" numbers=260246, 123530, 69768, 66948
- trace 2 [pass1]: text="£ OV, LS5UPt\n123,530 69,768 66,948\nFF NEN" numbers=123530, 69768, 66948
- trace 3 [pass1]: text="123,530 69,768 66,948\nsexi 74" numbers=123530, 69768, 66948
- trace 4 [pass1]: text="123,530 69,768 66,948" numbers=123530, 69768, 66948
- trace 5 [pass1]: text="iho dd DT, FOO VO, 790\nS | N , o | 3 N \\\n| . E 1. ar Ke i ———" numbers=(none)
- trace 6 [pass1]: text="d r_ © 4 AD “. 4\nS | a}\nNE) '®\n? a “ pad J N on 58 mot -\na IPL\" Dan de® | a”" numbers=(none)
- trace 7 [pass1]: text="k AS ~ y <" numbers=(none)
members: "7 260,246
123,530 69,768 56,938
```

#### S3 self

- failures: S3 self total expected 506403 actual 427721
- selected members: 393410, 34311
- selected total: 427,721
- expected members: 393410, 34311, 0
- expected total: 506,403
- raw numeric candidates: 393410, 34311, 78682
- extracted raw text tokens/fragments: `7`, `”`, `:`, `J`, `3 i ta`, `=`, `VVIIN`, `*`, `AT`, `-`, `506 403 Pt
39`, `3.410 34311`, `—`, `200,40 5p
393`, `,410`, `34,311`, `—`, `#+78682`, `aS`, `393,410 34,31`, `1`, `-`, `4`, `+78682 TR`, `=`, `7 al`, `#4+78682`, `»`, `v`, `va`, `-`, `Cs`, `oy`, `|`, `y`, `.`, `*18F»`, `So`, `}`, `EC`, `'`, `’`, `!`, `|`, `.`, `-`, `:`, `"Y`, `f`, `7`, `’`, `|`, `Vv`, `"1`, `ell`, `EVs`, `7`, `”`, `:`, `J`, `3 i ta`, `=`, `Bah`, `47640

393,41`, `0 34,311`, `—`, `4`, `+78682 BR`, `>`, `;`, `‘wt`, `2 Py`

Raw OCR text:
```text
total direct: 7” : J 3 i ta
=
total candidate traces:
- trace 1 [pass1]: text="VVIIN * AT -\n506 403 Pt\n393.410 34311 —" numbers=34311
- trace 2 [pass1]: text="200,40 5p\n393,410 34,311 —\n#+78682 aS" numbers=393410, 34311, 78682
- trace 3 [pass1]: text="393,410 34,311 -\n4+78682 TR\n= 7 al" numbers=393410, 34311, 78682
- trace 4 [pass1]: text="#4+78682 » v\nva - Cs oy | y" numbers=78682
- trace 5 [pass1]: text=". *18F» So } EC\n' ’ !\n| . - : \"Y f 7’ | Vv\n\"1 ell EVs" numbers=(none)
- trace 6 [pass1]: text="7” : J 3 i ta\n=" numbers=(none)
- trace 7 [pass1]: text="Bah 47640" numbers=47640
members: 393,410 34,311 —
4+78682 BR
> ; ‘wt 2 Py
```

#### S3 enemy

- failures: none
- selected members: 24244, 32067, 114459
- selected total: 170,770
- expected members: 24244, 32067, 114459
- expected total: 170,770
- raw numeric candidates: 24244, 32067, 114459
- extracted raw text tokens/fragments: `rT]`, `Ho,`, `j`, `1 NY
4`, `*`, `y`, `;`, `Sor`, `“y`, `S`, `wos`, `-`, `|`, `}`, `bi`, `=`, `-`, `.`, `‘`, `|`, `*`, `’`, `h`, `N`, `-`, `/`, `|`, `ARR:`, `_`, `)`, `EA`, `Ag`, `170,7 70k`, `:`, `24,244 32,067`, `114,459

170,`, `7 70k
24,240`, `32,067 114,45`, `9
,`, `[=I`, `7

24,244 32,`, `067 114,459
y`, `PA`, `4 y`, `|`, `g`, `A`, `|`, `_-_`, `yam`, `WW`, `a`, `my`, `WE`, `a`, `|`, `J`, `Taam`, `Ey`, `Faw`, `4
J . .`, `|`, `R`, `.`, `5`, `|`, `an`, `—`, `!`, `.`, `f`, `&`, `TE`, `"`, `.`, `‘`, `|`, `*`, `’`, `Fi`, `rT]`, `Ho,`, `j`, `1 NY
4`, `*`, `y`, `;`, `Sor`, `“y`, `S`, `wos`, `-`, `|`, `}`, `bi`, `=`, `-`, `.`, `‘`, `|`, `*`, `’`, `h`, `N`, `-`, `/`, `|`, `ARR:`, `_`, `)`, `Sills)`, `Al(2)`, `L`, `g`, `a`, `Sl`, `Al`, `6`, `[od`, `gan`, `53076

24,244`, `32,067 114,45`, `9`, `|`, `=)`, `ERE`, `SND`, `|`, `\`, `i`, `A`, `(5`, `ig`, `|`, `(4)`, `Vy`, `:`, `,`, `3`, `:`, `”`, `:`

Raw OCR text:
```text
total direct: rT] Ho, j 1 NY
4 * y ; Sor “y
S wos - |
} bi = -
. ‘ | * ’ h
N - / |
ARR: _ )
total candidate traces:
- trace 1 [pass1]: text="EA Ag\n170,7 70k:\n24,244 32,067 114,459" numbers=24244, 32067, 114459
- trace 2 [pass1]: text="170,7 70k\n24,240 32,067 114,459\n, [=I 7" numbers=24240, 32067, 114459
- trace 3 [pass1]: text="24,244 32,067 114,459\ny PA 4 y | g A |" numbers=24244, 32067, 114459
- trace 4 [pass1]: text="_-_ yam WW a my WE a | J Taam Ey Faw 4\nJ . . | R .\n5 | an — ! .\nf & TE \"\n. ‘ | * ’\nFi" numbers=(none)
- trace 5 [pass1]: text="rT] Ho, j 1 NY\n4 * y ; Sor “y\nS wos - |\n} bi = -\n. ‘ | * ’ h\nN - / |\nARR: _ )" numbers=(none)
- trace 6 [pass1]: text="Sills) Al(2)\nL g a" numbers=(none)
- trace 7 [pass1]: text="Sl Al\n6 [od\ngan 53076" numbers=53076
members: 24,244 32,067 114,459
| =) ERE SND
| \ i A

(5 ig | (4) Vy : , 3 : ” :
```

### user-reports/passed/IMG_9074.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: yes
- pass: yes

#### S1 self

- failures: none
- selected members: 73395, 48841, 35938
- selected total: 158,174
- expected members: 73395, 48841, 35938
- expected total: 158,174
- raw numeric candidates: 73395, 48841, 35938
- extracted raw text tokens/fragments: `NZ`, `+`, `A7-`, `158,17 4`, `+`, `AJ`, `+`, `25`, `-`, `1 E00 17 4

A`, `J`, `+`, `A7-`, `158.17 45

NZ`, `+`, `A7-`, `158,17 4`, `+`, `+`, `27`, `-`, `158,17 4e`, `:`, `+`, `A5-`, `158,17 45
7 2`, `05 AQ DAA 25`, `020

YY INS
1`, `58,17 4`, `-:`, `73,395 48,841`, `35,938

158,1`, `7 4`, `-:`, `73,395 48,841`, `35,938`, `+`, `AF7-`, `158,17 45
73,`, `395 48,841 35`, `,938`, `ola`, `Tm`, `FN`, `rel`, `Vv`

Raw OCR text:
```text
total direct: NZ
+ A7-
158,17 4+
total candidate traces:
- trace 1 [pass1]: text="AJ\n+ 25-\n1 E00 17 4" numbers=(none)
- trace 2 [pass1]: text="AJ\n+ A7-\n158.17 45" numbers=(none)
- trace 3 [pass1]: text="NZ\n+ A7-\n158,17 4+" numbers=(none)
- trace 4 [pass1]: text="+ 27-\n158,17 4e:" numbers=(none)
- trace 5 [pass1]: text="+ A5-\n158,17 45\n7 205 AQ DAA 25 020" numbers=(none)
- trace 6 [pass1]: text="YY INS\n158,17 4-:\n73,395 48,841 35,938" numbers=73395, 48841, 35938
- trace 7 [pass1]: text="158,17 4-:\n73,395 48,841 35,938" numbers=73395, 48841, 35938
members: + AF7-
158,17 45
73,395 48,841 35,938
ola Tm FN
rel Vv
```

#### S1 enemy

- failures: none
- selected members: 42126, 196723, 83667
- selected total: 361,860
- expected members: 42126, 196723, 83667
- expected total: 361,860
- raw numeric candidates: 361860, 361860, 42126, 196723, 83667, 39544
- extracted raw text tokens/fragments: `oH`, `EN.`, `361,860

AA
v`, `1`, `+`, `WIN`, `241 OLN

JUIN`, `.`, `361 8600

oH`, `EN.`, `361,860

SI`, `+`, `WIN`, `561,860

J 1`, `+`, `WIN`, `561,860k`, `:`, `7 mT WWI
361,`, `860k
42,126 1`, `96,723 83,667`, `To`, `-`, `Roa`, `A`, `RA`, `561,860

42,1`, `26 196,723 83`, `,667`, `EY`, `Lo`, `CE`, `Co`, `-—`, `LoL`, `ALFA`, `361,860k`, `:`, `42,126 196,72`, `3 83,667`, `:`, `I`, `4`, `+39544`, `)`, `|`, `|`, `N`, `NF`, `NS,`, `NY`, `|`, `.`, `i;`

Raw OCR text:
```text
total direct: oH EN.
361,860
total candidate traces:
- trace 1 [pass1]: text="AA\nv1 + WIN\n241 OLN" numbers=(none)
- trace 2 [pass1]: text="JUIN.\n361 8600" numbers=8600
- trace 3 [pass1]: text="oH EN.\n361,860" numbers=361860
- trace 4 [pass1]: text="SI + WIN\n561,860" numbers=561860
- trace 5 [pass1]: text="J 1 + WIN\n561,860k:" numbers=561860
- trace 6 [pass1]: text="7 mT WWI\n361,860k\n42,126 196,723 83,667" numbers=361860, 42126, 196723, 83667
- trace 7 [pass1]: text="To - Roa A RA\n561,860\n\n42,126 196,723 83,667\n\nEY Lo CE" numbers=561860, 42126, 196723, 83667
members: Co -— LoL ALFA
361,860k:
42,126 196,723 83,667
: I 4 +39544 ) |
| N NF NS, NY | . i;
```

#### S2 self

- failures: none
- selected members: 375977, 31268, 44701
- selected total: 527,141
- expected members: 375977, 31268, 44701
- expected total: 527,141
- raw numeric candidates: 75195, 375977, 31268, 44701, 75195
- extracted raw text tokens/fragments: `BD`, `IDg`, `7 IT WPAYLECD`, `D`, `phe,`, `FV`, `A`, `4`, `+75195 74 v`, `&`, `ON`, `/`, `E`, `i`, `\`, `&`, `4 yy ij`, `|`, `|`, `Le`, `a`, `|`, `A`, `BN`, `527.141
375,9`, `77 31,268 44,`, `701

SL`, `)`, `AA`, `APE`, `375,977 31,26`, `8 44,701`, `#475195`, `Ru`, `YR`, `375,977 31,26`, `8 44,701
2475`, `195 Summ`, `%;`, `375,977 31,26`, `8 44,701`, `#+75195`, `eum`, `5

BD IDg 7 I`, `T`, `WPAYLECDD`, `phe,`, `FV`, `A`, `4`, `+75195 74 v`, `&`, `ON`, `/`, `E`, `i`, `\`, `&`, `4 yy ij`, `|`, `|`, `Le`, `a`, `|`, `A`, `BN`, `#+75195`, `Zum`, `YREENCTs`, `it`, `/`, `“2`, `‘`, `SA`, `\`, `Fh`, `YX`, `-`, `Now`, `;`, `)`, `h`, `3 TR Vv
li s`, `)`, `3`, `/`, `~~`, `|`, `|`, `|`, `IR`, `|`, `!`, `+`, `N`, `x`, `=`, `’`, `)`, `£5.`, `n`, `|`, `i`, `)`, `EE`, `5 IR

E`, `_d`, `Ch`, `)`, `527,14 1s
375`, `,977`, `31,268 44,701`, `#+75195`, `SEEN`, `NG`, `9`, `|`, `/`, `“3`, `)`, `.`, `_`, `k`, `.`, `»`, `B`, `7 Vv`

Raw OCR text:
```text
total direct: BD IDg 7 IT WPAYLECDD phe, FV A

4+75195 74 v
& ON / E i \ & 4 yy ij |
| Le a | A BN
total candidate traces:
- trace 1 [pass1]: text="527.141\n375,977 31,268 44,701" numbers=375977, 31268, 44701
- trace 2 [pass1]: text="SL) AA APE\n375,977 31,268 44,701\n#475195 Ru YR" numbers=375977, 31268, 44701, 475195
- trace 3 [pass1]: text="375,977 31,268 44,701\n2475195 Summ %;" numbers=375977, 31268, 44701, 2475195
- trace 4 [pass1]: text="375,977 31,268 44,701\n#+75195 eum 5" numbers=375977, 31268, 44701, 75195
- trace 5 [pass1]: text="BD IDg 7 IT WPAYLECDD phe, FV A\n\n4+75195 74 v\n& ON / E i \\ & 4 yy ij |\n| Le a | A BN" numbers=75195
- trace 6 [pass1]: text="#+75195 Zum YREENCTs\nit / “2 ‘ SA \\ Fh" numbers=75195
- trace 7 [pass1]: text="YX - Now ; ) h 3 TR Vv\nli s ) 3 / ~~ | | |\nIR\n| ! + N x = ’ ) £5. n | i )\nEE 5 IR" numbers=(none)
members: E_d Ch )
527,14 1s
375,977 31,268 44,701
#+75195 SEEN NG
9 | / “3 ) . _ k . » B 7 Vv
```

#### S2 enemy

- failures: none
- selected members: 61448, 32066, 8457
- selected total: 101,971
- expected members: 61448, 32066, 8457
- expected total: 101,971
- raw numeric candidates: 61448, 32066, 8457, 61448, 32066, 8457
- extracted raw text tokens/fragments: `61,448 32,066`, `8,457
cs RON`, `io`, `FT`, `101,97 1`, `-`, `61,448 32,066`, `8,457

ah, 7`, `J`, `AP`, `61,448 32,066`, `8,457
Vor N02`, `61,448 32,066`, `8,457
cs RON`, `io`, `FT`, `61,448 32,066`, `8,457`, `>`, `NP`, `|`, `Isat)`, `|B`, `Lh`, `Vi`, `BU`, `JDL,`, `UV`, `Cyd`, `rs`, `CS`, `FORT`, `Vani`, `(BL`, `Natl`, `|`, `\`, `NGA`, `(BI`, `S`, `NS`, `LS`, `i`, `a)`, `|`, `I`, `be.`, `!`, `at`, `SEY`, `/`, `:`, `A`, `B`, `4`, `:`, `!`, `px`, `f`, `:`, `nw`, `Blam`, `ei`, `|`, `ga`, `ve`, `'`, `.`, `N`, `A`, `*`, `gui’`, `|`, `oe`, `.`, `3 NA`, `|`, `[/f`, `VAR`, `FE`, `\~`, `"`, `A`, `.`, `|`, `py`, `:`, `.`, `4`, `)`, `4`, `“gl`, `>`, `Wo`, `i,`, `Ve`, `vo`, `=`, `y`, `“8`, `h`, `3
101, Q7 1k`, `61,448 32,066`, `8,457`

Raw OCR text:
```text
total direct: 61,448 32,066 8,457
cs RON io FT
total candidate traces:
- trace 1 [pass1]: text="101,97 1-\n61,448 32,066 8,457" numbers=61448, 32066, 8457
- trace 2 [pass1]: text="ah, 7 J AP\n61,448 32,066 8,457\nVor N02" numbers=61448, 32066, 8457
- trace 3 [pass1]: text="61,448 32,066 8,457\ncs RON io FT" numbers=61448, 32066, 8457
- trace 4 [pass1]: text="61,448 32,066 8,457\n> NP | Isat) |B Lh" numbers=61448, 32066, 8457
- trace 5 [pass1]: text="Vi BU JDL, UV Cyd rs\nCS FORT Vani (BL\nNatl | \\ NGA (BI" numbers=(none)
- trace 6 [pass1]: text="S NS LS i a) | I be. !\nat SEY / : A B 4\n: ! px f :\nnw Blam ei | ga ve" numbers=(none)
- trace 7 [pass1]: text="' . N A * gui’ | oe .\n3 NA | [/f VAR FE\n\\~ \" A . | py : . 4 ) 4\n“gl > Wo i, Ve vo" numbers=(none)
members: = y “8 h 3
101, Q7 1k
61,448 32,066 8,457
```

#### S3 self

- failures: none
- selected members: 107711, 329872, 685754
- selected total: 1,260,487
- expected members: 107711, 329872, 685754
- expected total: 1,260,487
- raw numeric candidates: 107711, 329872, 685754, 1357150
- extracted raw text tokens/fragments: `pA`, `[NS`, `7a
i`, `£7"`, `w`, `-`, `3 LEV`, `(]`, `1 7 gy Lk
T r`, `r`, `IRA`, `i`, `~`, `o-`, `ww`, `id`, `|1.2`, `"A`, `&F`, `Ba,`, `=`, `I"`, `VVIIN`, `>`, `AT`, `-`, `1,.260,487r
1`, `07,711 329,87`, `2 685,754

1,`, `200,48`, `/rt`, `107,711 329,8`, `72 685,754
7`, `amie`, `Y`, `—`, `#4+137150`, `107,711 329,8`, `72 685,754
mN`, `BETOTSR`, `LA,`, `=`, `INN`, `EW`, `F`, `oj`, `§¥`, `=aum`, `ny`, `aw`, `Na.`, `-`, `ar`, `ary`, `¥`, `WWW`, `’`, `aman`, `"#4`, `+137150
BL UR`, `7`, `»`, `INSTR`, `|`, `EE`, `1`, `»`, `JIB`, `2
LS.`, `_`, `.`, `>`, `|`, `oa`, `LE`, `.`, `Te`, `~~`, `ny`, `I`, `—`, `;`, `¥y`, `-`, `§`, `i`, `AY`, `AITN`, `ALIV`, `2 4`, `-`, `ir`, `8 dee N Ky LR`, `)`, `Co`, `£(`, `i`, `X`, `|`, `CBNSAy`, `“Ey`, `wo`, `YP`, `J!`, `7`, `>`, `wy`, `4`, `’`, `IA`, `,`, `3`, `<`, `pA`, `[NS`, `7a
i`, `£7"`, `w`, `-`, `3 LEV`, `(]`, `1 7 gy Lk
T r`, `r`, `IRA`, `i`, `~`, `o-`, `ww`, `id`, `|1.2`, `"A`, `&F`, `Ba,`, `=`, `I"`, `£`, `N`, `=`, `Ph`, `kN`, `]`, `GC`, `Ln`, `Ben`, `67413

107,71`, `1 329,872 685`, `,754`, `r`, `-`, `|`, `|`, `_4+1357150`, `16`, `-`, `ww`, `(2,`, `\-`, `BR.`, `Wo`

Raw OCR text:
```text
total direct: pA [NS 7a
i £7" w -
3 LEV (] 1 7 gy Lk
T rr IRA i ~ o- ww
id |1.2 "A &F
Ba, = I"
total candidate traces:
- trace 1 [pass1]: text="VVIIN > AT -\n1,.260,487r\n107,711 329,872 685,754" numbers=260487, 107711, 329872, 685754
- trace 2 [pass1]: text="1,200,48/rt\n107,711 329,872 685,754\n7 amie Y —  #4+137150" numbers=107711, 329872, 685754, 137150
- trace 3 [pass1]: text="107,711 329,872 685,754\nmN\nBETOTSR LA, = INN" numbers=107711, 329872, 685754
- trace 4 [pass1]: text="EW F oj §¥ =aum ny aw Na. - ar ary ¥ WWW\n’ aman \"#4 +137150\nBL UR 7 » INSTR |\nEE 1 » JIB 2\nLS. _ . > | oa\nLE . Te ~~ ny I — ; ¥y -" numbers=137150
- trace 5 [pass1]: text="§ i AY AITN ALIV 2 4\n- ir 8 dee N Ky LR )\nCo £( i X | CBNSAy\n“Ey wo YP J! 7\n> wy 4 ’ IA , 3 <" numbers=(none)
- trace 6 [pass1]: text="pA [NS 7a\ni £7\" w -\n3 LEV (] 1 7 gy Lk\nT rr IRA i ~ o- ww\nid |1.2 \"A &F\nBa, = I\"" numbers=(none)
- trace 7 [pass1]: text="£ N = Ph kN ]\nGC Ln\nBen 67413" numbers=67413
members: 107,711 329,872 685,754
r - | | _4+1357150
16- ww (2, \- BR. Wo
```

#### S3 enemy

- failures: none
- selected members: 153493, 94997, 162804
- selected total: 411,294
- expected members: 153493, 94997, 162804
- expected total: 411,294
- raw numeric candidates: 63309
- extracted raw text tokens/fragments: `J`, `wo`, `S`, `FANG`, `,`, `qT`, `3. vg 7`, `\\d`, `Phe`, `21 J,`, `-~`, `TCA`, `0 El`, `[EC`, `4 Ag
411,294p`, `153,493 94,99`, `7 162,804

41`, `1 294m
153,49`, `3 94,997 162,`, `804

153,493`, `94,997 162,80`, `4`, `:`, `af`, `-`, `ve`, `>`, `Ys`, `<[R`, `[Eay`, `aie`, `ii`, `EEL`, `-`, `Wp`, `Fy`, `F&F`, `F`, `bake`, `ad`, `Be`, `ow,`, `dd`, `=`, `]`, `\`, `4`, `|`, `—`, `_`, `We`, `i`, `N`, `J`, `S`, `=`, `|`, `/`, `ae`, `N`, `Ref`, `Co`, `J`, `\`, `EL,`, `7`, `\\.a`, `k`, `r`, `FI`, `ks`, `.`, `»`, `,`, `I`, `a`, `A`, `&`, `|`, `Ed`, `ely`, `§`, `1 I`, `——`, `J`, `;`, `"ad`, `J`, `wo`, `S`, `FANG`, `,`, `qT`, `3. vg 7`, `\\d`, `Phe`, `21 J,`, `-~`, `TCA`, `0 El`, `[EC`, `h`, `WV`, `owe`, `NAY`, `+`, `oo`, `YF`, `CG`, `Jo`, `The`, `|`, `ala`, `«`, `“an`, `63309

d`, `(`, `7`, `)`, `ERS`, `®&n`, `63309`

Raw OCR text:
```text
total direct: J wo

S FANG , qT
3. vg 7 \\d
Phe 21 J, -~
TCA 0 El [EC
total candidate traces:
- trace 1 [pass1]: text="4 Ag\n411,294p\n153,493 94,997 162,804" numbers=411294, 153493, 94997, 162804
- trace 2 [pass1]: text="411 294m\n153,493 94,997 162,804" numbers=153493, 94997, 162804
- trace 3 [pass1]: text="153,493 94,997 162,804\n: af - ve >\nYs <[R [Eay" numbers=153493, 94997, 162804
- trace 4 [pass1]: text="aie ii EEL - Wp Fy F&F F bake ad Be\now, dd = ] \\\n4 | — _ We i N J\nS = | / ae N\nRef Co J \\\nEL, 7 \\\\.a\nk r FI ks .\n» , I a A & |\nEd ely § 1 I —— J ; \"ad" numbers=(none)
- trace 5 [pass1]: text="J wo\n\nS FANG , qT\n3. vg 7 \\\\d\nPhe 21 J, -~\nTCA 0 El [EC" numbers=(none)
- trace 6 [pass1]: text="h WV owe NAY +\noo YF" numbers=(none)
- trace 7 [pass1]: text="CG Jo The | ala «\n“an 63309" numbers=63309
members: d( 7) ERS
®&n 63309
```

### user-reports/unreviewed/IMG_9163.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: yes
- pass: no

#### S1 self

- failures: S1 self total expected 653835 actual 660368; S1 self member1 expected 544861 actual 6535; S1 self member2 expected 0 actual 544861; S1 self member3 expected 0 actual 108972
- selected members: 6535, 544861, 108972
- selected total: 660,368
- expected members: 544861, 0, 0
- expected total: 653,835
- raw numeric candidates: 6535, 544861, 108972
- extracted raw text tokens/fragments: `WIN`, `+`, `27
653,83 3m`, `\`, `A`, `WIN`, `+`, `27
ALEX OXZX`, `WIN`, `+`, `27
6535 833k`, `:`, `WIN`, `+`, `27
653,83 3m`, `WIN`, `+`, `27`, `-`, `653,833m

WIN`, `+`, `27`, `-`, `LAAN`, `MARA`, `655,855m
544,`, `861`, `«—`, `—`, `aR.`, `CT`, `655,83 5n
544`, `,861`, `-`, `-`, `WIN`, `+`, `27`, `-`, `6535,833m
544`, `,861`, `—`, `_`, `&4+108972`

Raw OCR text:
```text
total direct: WIN + 27
653,83 3m
total candidate traces:
- trace 1 [pass1]: text="\\ A\nWIN + 27\nALEX OXZX" numbers=(none)
- trace 2 [pass1]: text="WIN + 27\n6535 833k:" numbers=6535
- trace 3 [pass1]: text="WIN + 27\n653,83 3m" numbers=(none)
- trace 4 [pass1]: text="WIN + 27-\n653,833m" numbers=653833
- trace 5 [pass1]: text="WIN + 27-" numbers=(none)
- trace 6 [pass1]: text="LAAN MARA\n655,855m\n544,861 «— —" numbers=655855, 544861
- trace 7 [pass1]: text="aR. CT\n655,83 5n\n544,861 - -" numbers=544861
members: WIN + 27-
6535,833m
544,861 — _
&4+108972
```

#### S1 enemy

- failures: none
- selected members: 162233, 56973, 138410
- selected total: 357,616
- expected members: 162233, 56973, 138410
- expected total: 357,616
- raw numeric candidates: 357616, 357616, 162233, 56973, 138410
- extracted raw text tokens/fragments: `BR`, `IN`, `357,616r

AA`, `JT`, `+`, `2 LT LA1 4L`, `ST`, `+`, `JT`, `+`, `357.616k

BR`, `IN`, `357,616r

v1`, `+`, `357,616`, `+`, `J`, `1`, `+`, `357,616`, `¢t`, `357,616rt
162`, `,233`, `56,973 138,41`, `0

357,616rt`, `162,233 56,97`, `3 138,410

JL`, `+`, `357,616`, `¢`, `162,233 56,97`, `3 138,410`

Raw OCR text:
```text
total direct: BR IN
357,616r
total candidate traces:
- trace 1 [pass1]: text="AA\nJT +\n2 LT LA1 4L" numbers=(none)
- trace 2 [pass1]: text="ST +\nJT +\n357.616k" numbers=(none)
- trace 3 [pass1]: text="BR IN\n357,616r" numbers=357616
- trace 4 [pass1]: text="v1 +\n357,616+" numbers=357616
- trace 5 [pass1]: text="J 1 +\n357,616¢t" numbers=357616
- trace 6 [pass1]: text="357,616rt\n162,233 56,973 138,410" numbers=357616, 162233, 56973, 138410
- trace 7 [pass1]: text="357,616rt\n162,233 56,973 138,410" numbers=357616, 162233, 56973, 138410
members: JL +
357,616¢
162,233 56,973 138,410
```

#### S2 self

- failures: none
- selected members: 134263, 183334, 74512
- selected total: 428,775
- expected members: 134263, 183334, 74512
- expected total: 428,775
- raw numeric candidates: 36666, 134263, 183334, 74512, 36666
- extracted raw text tokens/fragments: `adi`, `Pall`, `LADD`, `Im,`, `JALL`, `a»`, `Y`, `|`, `+36666`, `~`, `A`, `="`, `~'`, `;`, `74`, `|`, `|`, `b`, `>)`, `a`, `=o`, `1`, `»`, `»`, `|`, `o`, `/`, `L`, `~`, `CT`, `>,`, `}`, `428.77 5k
134`, `,263`, `183,334 74,51`, `2

LQ, 7 1 IP`, `L`, `134,263 183,3`, `34 74,512
y y`, `FRE`, `ie`, `LY`, `134,263 183,3`, `34 74,512
4 T`, `ON`, `1 is CW`, `)`, `“A.`, `ne`, `v`, `134,263 183,3`, `34 74,512
Fd`, `RR`, `4`, `+56666`, `=`, `V`, `¥`, `yi`, `2`, `)`, `l=`, `IV`, `i`, `|`, `bi`, `{`, `.`, `By`, `adi`, `Pall`, `LADD`, `Im,`, `JALL`, `a»`, `Y`, `|`, `+36666`, `~`, `A`, `="`, `~'`, `;`, `74`, `|`, `|`, `b`, `>)`, `a`, `=o`, `1`, `»`, `»`, `|`, `o`, `/`, `L`, `~`, `CT`, `>,`, `}`, `Fam`, `4`, `+36666 N`, `’`, `elf`, `nal`, `~`, `oT`, `Ch`, `a`, `Pat`, `Salt`, `3 df

ON ad`, `|`, `4 AI Z..`, `-`, `iii`, `h`, `2`, `“a`, `4 iy`, `~`, `ie`, `Vv`, `eid`, `“|`, `dha`, `~`, `4`, `)`, `A`, `’`, `A`, `EER`, `-`, `-`, `-`, `LAA`, `ME`, `428,77 Sp

13`, `4,263 183,334`, `74,512

PF am`, `HM`, `+36666 N`

Raw OCR text:
```text
total direct: adi Pall LADD Im, JALL
a» Y | +36666 ~
A =" ~' ; 74 | |
b >) a =o 1 » » | o /
L ~ CT >, }
total candidate traces:
- trace 1 [pass1]: text="428.77 5k\n134,263 183,334 74,512" numbers=134263, 183334, 74512
- trace 2 [pass1]: text="LQ, 7 1 IPL\n134,263 183,334 74,512\ny y FRE ie LY" numbers=134263, 183334, 74512
- trace 3 [pass1]: text="134,263 183,334 74,512\n4 TON 1 is CW) “A. ne v" numbers=134263, 183334, 74512
- trace 4 [pass1]: text="134,263 183,334 74,512\nFd RR 4 +56666 = V\n¥ yi 2 ) l= IV i | bi { . By" numbers=134263, 183334, 74512, 56666
- trace 5 [pass1]: text="adi Pall LADD Im, JALL\na» Y | +36666 ~\nA =\" ~' ; 74 | |\nb >) a =o 1 » » | o /\nL ~ CT >, }" numbers=36666
- trace 6 [pass1]: text="Fam 4 +36666 N\n’ elf nal ~\noT\n\nCh a Pat Salt 3 df\n\nON ad | 4 AI Z.." numbers=36666
- trace 7 [pass1]: text="- iii h 2 “a 4 iy ~ ie Vv\neid “| dha ~ 4) A\n’ A EER - - -" numbers=(none)
members: LAA ME
428,77 Sp

134,263 183,334 74,512

PF am HM +36666 N
```

#### S2 enemy

- failures: none
- selected members: 123530, 69768, 66948
- selected total: 260,246
- expected members: 123530, 69768, 66948
- expected total: 260,246
- raw numeric candidates: 123530, 69768, 66948, 260246, 123530, 69768, 56938
- extracted raw text tokens/fragments: `123,530 69,76`, `8 66,948
sexi`, `74

260,246`, `¢:`, `123,530 69,76`, `8 66,948`, `£`, `OV,`, `LS5UPt`, `123,530 69,76`, `8 66,948
FF N`, `EN`, `123,530 69,76`, `8 66,948
sexi`, `74

123,530 6`, `9,768 66,948`, `iho`, `dd`, `DT,`, `FOO`, `VO,`, `790
S`, `|`, `N`, `,`, `o`, `|`, `3 N`, `\`, `|`, `.`, `E`, `1. ar Ke i`, `———`, `d`, `r_`, `©`, `4 AD`, `“.`, `4
S`, `|`, `a}`, `NE)`, `'®`, `?`, `a`, `“`, `pad`, `J`, `N`, `on`, `58 mot`, `-`, `a`, `IPL"`, `Dan`, `de®`, `|`, `a”`, `k`, `AS`, `~`, `y`, `<`, `"7`, `260,246
123,5`, `30 69,768 56,`, `938`

Raw OCR text:
```text
total direct: 123,530 69,768 66,948
sexi 74
total candidate traces:
- trace 1 [pass1]: text="260,246¢:\n123,530 69,768 66,948" numbers=260246, 123530, 69768, 66948
- trace 2 [pass1]: text="£ OV, LS5UPt\n123,530 69,768 66,948\nFF NEN" numbers=123530, 69768, 66948
- trace 3 [pass1]: text="123,530 69,768 66,948\nsexi 74" numbers=123530, 69768, 66948
- trace 4 [pass1]: text="123,530 69,768 66,948" numbers=123530, 69768, 66948
- trace 5 [pass1]: text="iho dd DT, FOO VO, 790\nS | N , o | 3 N \\\n| . E 1. ar Ke i ———" numbers=(none)
- trace 6 [pass1]: text="d r_ © 4 AD “. 4\nS | a}\nNE) '®\n? a “ pad J N on 58 mot -\na IPL\" Dan de® | a”" numbers=(none)
- trace 7 [pass1]: text="k AS ~ y <" numbers=(none)
members: "7 260,246
123,530 69,768 56,938
```

#### S3 self

- failures: S3 self total expected 506403 actual 427721
- selected members: 393410, 34311
- selected total: 427,721
- expected members: 393410, 34311, 0
- expected total: 506,403
- raw numeric candidates: 393410, 34311, 78682
- extracted raw text tokens/fragments: `7`, `”`, `:`, `J`, `3 i ta`, `=`, `VVIIN`, `*`, `AT`, `-`, `506 403 Pt
39`, `3.410 34311`, `—`, `200,40 5p
393`, `,410`, `34,311`, `—`, `#+78682`, `aS`, `393,410 34,31`, `1`, `-`, `4`, `+78682 TR`, `=`, `7 al`, `#4+78682`, `»`, `v`, `va`, `-`, `Cs`, `oy`, `|`, `y`, `.`, `*18F»`, `So`, `}`, `EC`, `'`, `’`, `!`, `|`, `.`, `-`, `:`, `"Y`, `f`, `7`, `’`, `|`, `Vv`, `"1`, `ell`, `EVs`, `7`, `”`, `:`, `J`, `3 i ta`, `=`, `Bah`, `47640

393,41`, `0 34,311`, `—`, `4`, `+78682 BR`, `>`, `;`, `‘wt`, `2 Py`

Raw OCR text:
```text
total direct: 7” : J 3 i ta
=
total candidate traces:
- trace 1 [pass1]: text="VVIIN * AT -\n506 403 Pt\n393.410 34311 —" numbers=34311
- trace 2 [pass1]: text="200,40 5p\n393,410 34,311 —\n#+78682 aS" numbers=393410, 34311, 78682
- trace 3 [pass1]: text="393,410 34,311 -\n4+78682 TR\n= 7 al" numbers=393410, 34311, 78682
- trace 4 [pass1]: text="#4+78682 » v\nva - Cs oy | y" numbers=78682
- trace 5 [pass1]: text=". *18F» So } EC\n' ’ !\n| . - : \"Y f 7’ | Vv\n\"1 ell EVs" numbers=(none)
- trace 6 [pass1]: text="7” : J 3 i ta\n=" numbers=(none)
- trace 7 [pass1]: text="Bah 47640" numbers=47640
members: 393,410 34,311 —
4+78682 BR
> ; ‘wt 2 Py
```

#### S3 enemy

- failures: none
- selected members: 24244, 32067, 114459
- selected total: 170,770
- expected members: 24244, 32067, 114459
- expected total: 170,770
- raw numeric candidates: 24244, 32067, 114459
- extracted raw text tokens/fragments: `rT]`, `Ho,`, `j`, `1 NY
4`, `*`, `y`, `;`, `Sor`, `“y`, `S`, `wos`, `-`, `|`, `}`, `bi`, `=`, `-`, `.`, `‘`, `|`, `*`, `’`, `h`, `N`, `-`, `/`, `|`, `ARR:`, `_`, `)`, `EA`, `Ag`, `170,7 70k`, `:`, `24,244 32,067`, `114,459

170,`, `7 70k
24,240`, `32,067 114,45`, `9
,`, `[=I`, `7

24,244 32,`, `067 114,459
y`, `PA`, `4 y`, `|`, `g`, `A`, `|`, `_-_`, `yam`, `WW`, `a`, `my`, `WE`, `a`, `|`, `J`, `Taam`, `Ey`, `Faw`, `4
J . .`, `|`, `R`, `.`, `5`, `|`, `an`, `—`, `!`, `.`, `f`, `&`, `TE`, `"`, `.`, `‘`, `|`, `*`, `’`, `Fi`, `rT]`, `Ho,`, `j`, `1 NY
4`, `*`, `y`, `;`, `Sor`, `“y`, `S`, `wos`, `-`, `|`, `}`, `bi`, `=`, `-`, `.`, `‘`, `|`, `*`, `’`, `h`, `N`, `-`, `/`, `|`, `ARR:`, `_`, `)`, `Sills)`, `Al(2)`, `L`, `g`, `a`, `Sl`, `Al`, `6`, `[od`, `gan`, `53076

24,244`, `32,067 114,45`, `9`, `|`, `=)`, `ERE`, `SND`, `|`, `\`, `i`, `A`, `(5`, `ig`, `|`, `(4)`, `Vy`, `:`, `,`, `3`, `:`, `”`, `:`

Raw OCR text:
```text
total direct: rT] Ho, j 1 NY
4 * y ; Sor “y
S wos - |
} bi = -
. ‘ | * ’ h
N - / |
ARR: _ )
total candidate traces:
- trace 1 [pass1]: text="EA Ag\n170,7 70k:\n24,244 32,067 114,459" numbers=24244, 32067, 114459
- trace 2 [pass1]: text="170,7 70k\n24,240 32,067 114,459\n, [=I 7" numbers=24240, 32067, 114459
- trace 3 [pass1]: text="24,244 32,067 114,459\ny PA 4 y | g A |" numbers=24244, 32067, 114459
- trace 4 [pass1]: text="_-_ yam WW a my WE a | J Taam Ey Faw 4\nJ . . | R .\n5 | an — ! .\nf & TE \"\n. ‘ | * ’\nFi" numbers=(none)
- trace 5 [pass1]: text="rT] Ho, j 1 NY\n4 * y ; Sor “y\nS wos - |\n} bi = -\n. ‘ | * ’ h\nN - / |\nARR: _ )" numbers=(none)
- trace 6 [pass1]: text="Sills) Al(2)\nL g a" numbers=(none)
- trace 7 [pass1]: text="Sl Al\n6 [od\ngan 53076" numbers=53076
members: 24,244 32,067 114,459
| =) ERE SND
| \ i A

(5 ig | (4) Vy : , 3 : ” :
```

### user-reports/unreviewed/IMG_9222.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: yes
- pass: no

#### S1 self

- failures: S1 self member3 expected 56280 actual 114275
- selected members: 571375, 164269, 114275
- selected total: 906,199
- expected members: 571375, 164269, 56280
- expected total: 906,199
- raw numeric candidates: 906199, 571375, 164269, 56280, 114275
- extracted raw text tokens/fragments: `ll`, `WIN`, `+`, `ATF-`, `906, 199`, `:`, `BW`, `WIN`, `+`, `ATF-`, `ONL`, `100

A 4
WIN`, `4`, `+`, `AT-`, `906. 199`, `:`, `ll`, `WIN`, `+`, `ATF-`, `906, 199`, `:`, `WIN`, `4 2F`, `-`, `WIN`, `+`, `ATF-`, `571,375 164,2`, `69 56,280

EE`, `EN)`, `=`, `5 7`, `%`, `571,375 164,2`, `69 56,280
UE`, `WIN`, `+`, `A7-`, `906,199`, `-`, `571,375 164,2`, `69 56,280

i`, `+114275 Jame`, `Ae`, `P=`

Raw OCR text:
```text
total direct: ll
WIN + ATF-
906, 199:
total candidate traces:
- trace 1 [pass1]: text="BW\nWIN + ATF-\nONL 100" numbers=(none)
- trace 2 [pass1]: text="A 4\nWIN 4+ AT-\n906. 199:" numbers=(none)
- trace 3 [pass1]: text="ll\nWIN + ATF-\n906, 199:" numbers=(none)
- trace 4 [pass1]: text="WIN 4 2F-" numbers=(none)
- trace 5 [pass1]: text="WIN + ATF-" numbers=(none)
- trace 6 [pass1]: text="571,375 164,269 56,280" numbers=571375, 164269, 56280
- trace 7 [pass1]: text="EE EN) = 5 7%\n571,375 164,269 56,280\nUE" numbers=571375, 164269, 56280
members: WIN + A7-
906,199-

571,375 164,269 56,280

i +114275 Jame

Ae P=
```

#### S1 enemy

- failures: S1 enemy total expected 520396 actual 260668; S1 enemy member1 expected 260668 actual 132325; S1 enemy member2 expected 132325 actual 127403; S1 enemy member3 expected 127403 actual 0
- selected members: 132325, 127403
- selected total: 260,668
- expected members: 260668, 132325, 127403
- expected total: 520,396
- raw numeric candidates: 520396, 520596, 260668, 132325, 127403
- extracted raw text tokens/fragments: `wr`, `v1`, `+`, `520,396

oF k`, `a`, `v1`, `+`, `ESM`, `XO`, `KL`, `OY`, `Ins`, `v1`, `+`, `520,.396`, `¢:`, `wr`, `v1`, `+`, `520,396

v1`, `+`, `520,396k

J`, `]`, `+`, `520, 396k
BEN`, `RAD`, `129 ADE 197 A`, `N`, `EA"`, `"Ug`, `520,396
260,6`, `68 132,325 12`, `7,403

520,59`, `6`, `¢:`, `260,668 132,3`, `25 127,403

A`, `N`, `Go`, `520,596
260,6`, `68 132,325 12`, `7,403`, `||.`, `4 A`, `|`, `»`, `si.)`

Raw OCR text:
```text
total direct: wr
v1 +
520,396
total candidate traces:
- trace 1 [pass1]: text="oF ka\nv1 +\nESM XO KL" numbers=(none)
- trace 2 [pass1]: text="OY Ins\nv1 +\n520,.396¢:" numbers=(none)
- trace 3 [pass1]: text="wr\nv1 +\n520,396" numbers=520396
- trace 4 [pass1]: text="v1 +\n520,396k" numbers=520396
- trace 5 [pass1]: text="J] +\n520, 396k\nBEN RAD 129 ADE 197 AN" numbers=(none)
- trace 6 [pass1]: text="EA\" \"Ug\n520,396\n260,668 132,325 127,403" numbers=520396, 260668, 132325, 127403
- trace 7 [pass1]: text="520,596¢:\n260,668 132,325 127,403" numbers=520596, 260668, 132325, 127403
members: AN Go
520,596
260,668 132,325 127,403
||. 4 A | »
si.)
```

#### S2 self

- failures: none
- selected members: 170091, 253786, 202964
- selected total: 626,841
- expected members: 170091, 253786, 202964
- expected total: 626,841
- raw numeric candidates: 626841, 170091, 253786, 202964
- extracted raw text tokens/fragments: `hf`, `WN`, `Td`, `mult`, `TOV`, `LVL,`, `70S`, `>`, `4 ow. 34 . oN`, `a`, `\`, `Lp`, `'`, `R{.`, `$f`, `|`, `626,841`, `:`, `170,091 253,7`, `86 202,964

V`, `ALAV,O&`, `APT`, `170,091 253,7`, `86 202,964
FF`, `N`, `Ny`, `170,091 253,7`, `86 202,964
2`, `%`, `[NL`, `170,091 253,7`, `86 202,964
FA`, `R`, `\`, `Vl...`, `|W`, `hf`, `WN`, `Td`, `mult`, `TOV`, `LVL,`, `70S`, `>`, `4 ow. 34 . oN`, `a`, `\`, `Lp`, `'`, `R{.`, `$f`, `|`, `I`, `[PY`, `TR`, `(EN`, `ht`, `pA`, `a`, `\`, `ph`, `YA`, `NTE`, `©`, `OANA`, `6`, `*`, `626,841
170,0`, `91 253,786 20`, `2,964
LY,`

Raw OCR text:
```text
total direct: hf WN Td mult TOV LVL, 70S
> 4 ow. 34 . oN a \ Lp '
R{. $f |
total candidate traces:
- trace 1 [pass1]: text="626,841:\n170,091 253,786 202,964" numbers=626841, 170091, 253786, 202964
- trace 2 [pass1]: text="VALAV,O& APT\n170,091 253,786 202,964\nFF N Ny" numbers=170091, 253786, 202964
- trace 3 [pass1]: text="170,091 253,786 202,964\n2% [NL" numbers=170091, 253786, 202964
- trace 4 [pass1]: text="170,091 253,786 202,964\nFAR  \\ Vl... |W" numbers=170091, 253786, 202964
- trace 5 [pass1]: text="hf WN Td mult TOV LVL, 70S\n> 4 ow. 34 . oN a \\ Lp '\nR{. $f |" numbers=(none)
- trace 6 [pass1]: text="I [PY TR" numbers=(none)
- trace 7 [pass1]: text="(EN ht pA a \\ ph\nYA NTE ©\nOANA 6 *" numbers=(none)
members: 626,841
170,091 253,786 202,964
LY,
```

#### S2 enemy

- failures: none
- selected members: 531049, 359955, 281849
- selected total: 1,279,062
- expected members: 531049, 359955, 281849
- expected total: 1,279,062
- raw numeric candidates: 531049, 359955, 281849, 1279062, 531049, 359955, 281849, 106209
- extracted raw text tokens/fragments: `531,049 359,9`, `55 281,849
SC`, `R`, `~~`, `)`, `1.279.062
531`, `,049`, `359,955 281,8`, `49
Ni`, `+106209 CRBC X`, `z`, `NR`, `531,049 359,9`, `55 281,849

5`, `31,049 359,95`, `5 281,849
SCR`, `~~`, `)`, `531,049 359,9`, `55 281,849`, `:`, `4`, `+106209 7`, `-`, `Yi`, `Vol`, `dy`, `WERT`, `JSST`, `Told`, `LDL`, `,INT`, `4`, `+106209 7`, `-`, `YER`, `3
di 7`, `%`, `x`, `_-`, `\`, `i`, `-:`, `SCRELLZLY`, `7`, `)`, `(VER`, `=`, `7 IY 9 4 NE a`, `hn`, `1 b`, `:`, `%`, `FA`, `1,279,0625
53`, `1,049 359,955`, `281,849
4`, `+106209 7 Bn`

Raw OCR text:
```text
total direct: 531,049 359,955 281,849
SCR ~~ )
total candidate traces:
- trace 1 [pass1]: text="1.279.062\n531,049 359,955 281,849\nNi +106209 CRBC Xz NR" numbers=531049, 359955, 281849, 106209
- trace 2 [pass1]: text="531,049 359,955 281,849" numbers=531049, 359955, 281849
- trace 3 [pass1]: text="531,049 359,955 281,849\nSCR ~~ )" numbers=531049, 359955, 281849
- trace 4 [pass1]: text="531,049 359,955 281,849\n: 4 +106209 7 - Yi" numbers=531049, 359955, 281849, 106209
- trace 5 [pass1]: text="Vol dy WERT JSST Told LDL ,INT\n4 +106209 7 - YER 3\ndi 7%\n\nx _- \\ i -:" numbers=106209
- trace 6 [pass1]: text="SCRELLZLY 7) (VER\n= 7 IY 9 4 NE a" numbers=(none)
- trace 7 [pass1]: text="hn 1 b: % FA" numbers=(none)
members: 1,279,0625
531,049 359,955 281,849
4 +106209 7 Bn
```

#### S3 self

- failures: none
- selected members: 452561, 181891, 139140
- selected total: 864,104
- expected members: 452561, 181891, 139140
- expected total: 864,104
- raw numeric candidates: 452561, 181891, 139140, 90512
- extracted raw text tokens/fragments: `3 Co`, `>|`, `A`, `w`, `oo`, `s`, `!`, `Fadl`, `75`, `>=`, `IP`, `a`, `ad`, `Tm`, `!`, `pen`, `*`, `AT-`, `864,104`, `:`, `452,561 181.8`, `91 139,140

8`, `04,104
452,56`, `1 181,891 139`, `,140`, `452,561 181,8`, `91 139,140`, `‘af`, `+90512 Nl`, `=`, `2ST
Co ah WS`, `Sal`, `UA`, `a`, `+90512`, `»`, `p=`, `v`, `TIT`, `LL`, `|`, `N`, `;`, `aR`, `y`, `4 y.`, `™`, `¥-`, `RE`, `2d
CC re IR A`, `F`, `3 Co`, `>|`, `A`, `w`, `oo`, `s`, `!`, `Fadl`, `75`, `>=`, `IP`, `a`, `ad`, `Tm`, `!`, `pen`, `E76`, `G2`, `wan`, `72621

452,56`, `1 181,891 139`, `,140`, `a`, `+90512`, `~~`, `wu`, `2 PL
bu Ed A`, `At`, `p`, `L`, `,`, `\`, `5`, `!`, `2`, `~`

Raw OCR text:
```text
total direct: 3 Co >| A w oo s !
Fadl 75 >= IP a
ad Tm ! pen
total candidate traces:
- trace 1 [pass1]: text="* AT-\n864,104:\n452,561 181.891 139,140" numbers=864104, 452561, 139140
- trace 2 [pass1]: text="804,104\n452,561 181,891 139,140" numbers=804104, 452561, 181891, 139140
- trace 3 [pass1]: text="452,561 181,891 139,140\n\n‘af +90512 Nl\n\n= 2ST\nCo ah WS Sal UA" numbers=452561, 181891, 139140, 90512
- trace 4 [pass1]: text="a +90512 » p= v" numbers=90512
- trace 5 [pass1]: text="TIT LL | N ;\naR y 4 y. ™\n¥- RE 2d\nCC re IR AF" numbers=(none)
- trace 6 [pass1]: text="3 Co >| A w oo s !\nFadl 75 >= IP a\nad Tm ! pen" numbers=(none)
- trace 7 [pass1]: text="E76 G2\nwan 72621" numbers=72621
members: 452,561 181,891 139,140
a +90512 ~~
wu 2 PL
bu Ed A At p L ,
\ 5 ! 2 ~
```

#### S3 enemy

- failures: none
- selected members: 408759, 306574, 281381
- selected total: 996,714
- expected members: 408759, 306574, 281381
- expected total: 996,714
- raw numeric candidates: 408759, 306574, 281381
- extracted raw text tokens/fragments: `fd`, `|`, `“ar`, `VVILIN`, `996,714
408,7`, `59 306,574 28`, `1,381

90,7 1`, `4m
408,759 30`, `6,574 281,381`, `,`, `TIESTO`, `408,759 306,5`, `74 281,381
Wg`, `Wa`, `ary`, `NX`, `_`, `ar`, `-`, `er`, `ar`, `yw`, `BL`, `En`, `TF`, `ih`, `pa`, `av`, `mim`, `te`, `|`, `3`, `»`, `Ty`, `Adi`, `in`, `oa`, `|`, `PO`, `5 4 al an za`, `)`, `fd`, `|`, `+)`, `=`, `)`, `j`, `.`, `oe`, `»`, `+`, `I`, `;`, `R`, `a`, `a)`, `,`, `)`, `2`, `*`, `ES`, `[2`, `vid`, `|Lad`, `(4)`, `Colo`, `Dp`, `wan`, `69621

408,75`, `9 306,574 281`, `,381`, `.`, `py`, `"a`, `A`, `in`, `2 idl 4`

Raw OCR text:
```text
total direct: fd |
total candidate traces:
- trace 1 [pass1]: text="“ar VVILIN\n996,714\n408,759 306,574 281,381" numbers=996714, 408759, 306574, 281381
- trace 2 [pass1]: text="90,7 14m\n408,759 306,574 281,381\n, TIESTO" numbers=408759, 306574, 281381
- trace 3 [pass1]: text="408,759 306,574 281,381\nWg" numbers=408759, 306574, 281381
- trace 4 [pass1]: text="Wa ary NX _ ar - er ar yw BL En TF ih pa av mim\nte |\n3 » Ty Adi in oa\n\n| PO 5 4 al an za)" numbers=(none)
- trace 5 [pass1]: text="fd |" numbers=(none)
- trace 6 [pass1]: text="+) = ) j  . oe\n» + I ; R a a)\n, ) 2 * ES\n[2 vid |Lad (4)" numbers=(none)
- trace 7 [pass1]: text="Colo\nDp wan 69621" numbers=69621
members: 408,759 306,574 281,381
. py "a A in
2 idl 4
```

### user-reports/unreviewed/IMG_9240.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: yes
- pass: no

#### S1 self

- failures: S1 self member3 expected 70610 actual 127099
- selected members: 635498, 240415, 127099
- selected total: 1,073,622
- expected members: 635498, 240415, 70610
- expected total: 1,073,622
- raw numeric candidates: 1073622, 635498, 240415, 70610, 127099, 22709
- extracted raw text tokens/fragments: `NZ\l`, `WIN`, `+`, `ATF-`, `\A_J`, `WIN`, `+`, `ATF-`, `1d NTI ADHD`, `\_A\_/`, `WIN`, `4`, `+`, `AT-`, `1.073 62 2p`, `NZ\l`, `WIN`, `+`, `ATF-`, `WIN`, `+`, `25`, `-`, `WIN`, `+`, `AF-`, `635,498 240,4`, `15 70,610

RE`, `NE`, `oT`, `TT`, `1, 073 y 622m`, `635,498 240,4`, `15 70,610
YT`, `WIN`, `+`, `27
1,073,6225`, `635,498 240,4`, `15 70,610

if`, `+127099 Jame`, `"`, `22709 ANY`

Raw OCR text:
```text
total direct: NZ\l
WIN + ATF-
total candidate traces:
- trace 1 [pass1]: text="\\A_J\nWIN + ATF-\n1d NTI ADHD" numbers=(none)
- trace 2 [pass1]: text="\\_A\\_/\nWIN 4+ AT-\n1.073 62 2p" numbers=(none)
- trace 3 [pass1]: text="NZ\\l\nWIN + ATF-" numbers=(none)
- trace 4 [pass1]: text="WIN + 25-" numbers=(none)
- trace 5 [pass1]: text="WIN + AF-" numbers=(none)
- trace 6 [pass1]: text="635,498 240,415 70,610" numbers=635498, 240415, 70610
- trace 7 [pass1]: text="RENE oT TT\n1, 073 y 622m\n635,498 240,415 70,610\nYT" numbers=635498, 240415, 70610
members: WIN + 27
1,073,6225

635,498 240,415 70,610

if +127099 Jame"

22709 ANY
```

#### S1 enemy

- failures: none
- selected members: 284925, 261719, 394243
- selected total: 940,887
- expected members: 284925, 261719, 394243
- expected total: 940,887
- raw numeric candidates: 8875, 940887, 284925, 261719, 394243
- extracted raw text tokens/fragments: `HE.`, `940 8875

AA`, `v1`, `+`, `O40`, `007

1`, `+`, `v1`, `+`, `940 887

HE.`, `940 8875

1`, `+`, `940,887

J 1`, `+`, `940 8875
SOA`, `OQOE`, `DAT`, `"7T10`, `204A DAR

EA`, `"`, `"Ug`, `940,887r
284,`, `925 261,719 3`, `94,243

940,8`, `87r
284,925 2`, `61,719 394,24`, `3

EA`, `"`, `"Ug`, `940,887 rt
28`, `4,925 261,719`, `394,243
5`, `|g)`

Raw OCR text:
```text
total direct: HE.
940 8875
total candidate traces:
- trace 1 [pass1]: text="AA\nv1 +\nO40 007" numbers=(none)
- trace 2 [pass1]: text="1+\nv1 +\n940 887" numbers=(none)
- trace 3 [pass1]: text="HE.\n940 8875" numbers=8875
- trace 4 [pass1]: text="1+\n940,887" numbers=940887
- trace 5 [pass1]: text="J 1 +\n940 8875\nSOA OQOE DAT \"7T10 204A DAR" numbers=8875
- trace 6 [pass1]: text="EA\" \"Ug\n940,887r\n284,925 261,719 394,243" numbers=940887, 284925, 261719, 394243
- trace 7 [pass1]: text="940,887r\n284,925 261,719 394,243" numbers=940887, 284925, 261719, 394243
members: EA" "Ug
940,887 rt
284,925 261,719 394,243
5 |g)
```

#### S2 self

- failures: none
- selected members: 88944, 67862, 149575
- selected total: 306,381
- expected members: 88944, 67862, 149575
- expected total: 306,381
- raw numeric candidates: 306581, 88944, 67862, 149575
- extracted raw text tokens/fragments: `Dr,`, `Tite`, `WI,`, `OVA`, `El`, `Ir`, `AT`, `FR`, `a`, `|`, `as`, `>`, `4 ow. ii AT a`, `\`, `Lp`, `|`, `R{.`, `$f`, `|`, `306,581
88,94`, `4 67,862 149,`, `575

SI, IO A`, `PL`, `88,944 67,862`, `149,575
FF N`, `Ny`, `re`, `»`, `~`, `|`, `|`, `3
2`, `%`, `[NL`, `88.944 67,862`, `149,575
o`, `—`, `y`, `a.`, `av`, `A`, `who`, `Lp`, `:`, `|`, `Dr,`, `Tite`, `WI,`, `OVA`, `El`, `Ir`, `AT`, `FR`, `a`, `|`, `as`, `>`, `4 ow. ii AT a`, `\`, `Lp`, `|`, `R{.`, `$f`, `|`, `Co`, `aX`, `»`, `4 ra Be Ve, N`, `=`, `A`, `=|`, `oN`, `;`, `?`, `yo—`, `-`, `XL`, `fay`, `Ck`, `|`, `V`, `:`, `)`, `r`, `»`, `i!`, `bo`, `==`, `|`, `¥`, `Y`, `-`, `wv`, `|`, `>`, `A`, `>`, `\`, `I`, `i`, `7`, `(ER`, `haf]`, `|`, `1508`, `|`, `a`, `\`, `Nh`, `oT`, `:`, `.`, `a`, `306,581r
88,9`, `44 67,862 149`, `,575`, `p`, `|g`, `|`, `\`, `3
on es i`, `»`, `v`

Raw OCR text:
```text
total direct: Dr, Tite WI, OVA El Ir AT FR
a | as
> 4 ow. ii AT a \ Lp |
R{. $f |
total candidate traces:
- trace 1 [pass1]: text="306,581\n88,944 67,862 149,575" numbers=306581, 88944, 67862, 149575
- trace 2 [pass1]: text="SI, IO APL\n88,944 67,862 149,575\nFF N Ny" numbers=88944, 67862, 149575
- trace 3 [pass1]: text="re » ~ | | 3\n2% [NL" numbers=(none)
- trace 4 [pass1]: text="88.944 67,862 149,575\no — y\na. av A who Lp : |" numbers=67862, 149575
- trace 5 [pass1]: text="Dr, Tite WI, OVA El Ir AT FR\na | as\n> 4 ow. ii AT a \\ Lp |\nR{. $f |" numbers=(none)
- trace 6 [pass1]: text="Co aX » 4 ra Be Ve, N =\nA =| oN\n; ? yo— - XL fay Ck | V\n: ) r » i! bo == | ¥ Y - wv |\n> A > \\ I i 7" numbers=(none)
- trace 7 [pass1]: text="(ER haf] | 1508 | a \\ Nh\noT : . a" numbers=1508
members: 306,581r
88,944 67,862 149,575
p |g | \ 3
on es i» v
```

#### S2 enemy

- failures: none
- selected members: 221922, 87095, 149957
- selected total: 503,358
- expected members: 221922, 87095, 149957
- expected total: 503,358
- raw numeric candidates: 221922, 87095, 149957, 503558, 221922, 87095, 149957, 44384
- extracted raw text tokens/fragments: `221,922 87,09`, `5 149,957
 CE`, `CIINPE`, `7
e SOLER A.`, `«Ii`, `Cin`, `Vi`, `503,358`, `:`, `221.922 87,09`, `5 149,957
Bl`, `ii`, `+44384 NQF ama`, `n,`, `DISD`, `I`, `POPL`, `221,922 87,09`, `5 149,957
CED`, `.`, `7`, `“Vemma`, `1

221,922 87`, `,095`, `149,957
 CECI`, `INPE`, `7
e SOLER A.`, `«Ii`, `Cin`, `Vi`, `221,922 87,09`, `5 149,957
af`, `+443 84 ON`, `)`, `)`, `hlhdy`, `Fdada`, `WI`, `,V7TJd`, `Av`, `TyrTW7`, `BN`, `ay`, `+44384 Br
ny w`, `all`, `~~`, `3
5 ay Rl Fe`, `pwn`, `IY`, `o_o`, `-`, `|`, `i`, `»`, `-`, `!`, `-`, `-`, `Pry`, `f`, `a`, `)`, `EK`, `:`, `RB`, `f`, `v`, `*`, `;`, `4 A d o`, `|`, `4 BD`, `!`, `“af`, `+4438 I`, `|`, `:`, `Tey`, `A`, `~`, `of`, `RSI`, `Aa`, `=`, `TYME`, `2`, `)`, `x`, `nt`, `Bh`, `=`, `4`, `—`, `"4`, `?`, `hy`, `wr`, `®-`, `/`, `be`, `2
Thi
A`, `«`, `nt`, `&`, `:`, `AR`, `ae`, `Led!`, `503,558
221,9`, `22 87,095 149`, `,957`, `Rl`, `(df`, `+44384`, `|`, `8`, `)`, `Jewry.`, `<|[#RN`

Raw OCR text:
```text
total direct: 221,922 87,095 149,957
 CECIINPE 7
e SOLER A. «Ii Cin Vi
total candidate traces:
- trace 1 [pass1]: text="503,358:\n221.922 87,095 149,957\nBl ii +44384 NQF aman," numbers=503358, 87095, 149957, 44384
- trace 2 [pass1]: text="DISD I POPL\n221,922 87,095 149,957\nCED. 7\n\n“Vemma 1" numbers=221922, 87095, 149957
- trace 3 [pass1]: text="221,922 87,095 149,957\n CECIINPE 7\ne SOLER A. «Ii Cin Vi" numbers=221922, 87095, 149957
- trace 4 [pass1]: text="221,922 87,095 149,957\naf +443 84 ON) )" numbers=221922, 87095, 149957
- trace 5 [pass1]: text="hlhdy Fdada WI ,V7TJd Av TyrTW7\nBN ay +44384 Br\nny wall ~~ 3\n5 ay Rl Fe pwn IY\no_o - | i » - !\n- - Pry f a ) EK\n: RB f v" numbers=44384
- trace 6 [pass1]: text="* ; 4 A d o\n| 4 BD!\n“af +4438 I |\n: Tey A\n~ of RSI" numbers=4438
- trace 7 [pass1]: text="Aa = TYME\n2) x nt Bh = 4 — \"4 ?\nhy wr ®- / be 2\nThi\nA « nt & : AR ae Led!" numbers=(none)
members: 503,558
221,922 87,095 149,957

Rl (df +44384 | 8 )
Jewry. <|[#RN
```

#### S3 self

- failures: S3 self total expected 966536 actual 966556; S3 self member1 expected 287111 actual 331368; S3 self member2 expected 331368 actual 281784; S3 self member3 expected 281784 actual 287111
- selected members: 331368, 281784, 287111
- selected total: 966,556
- expected members: 287111, 331368, 281784
- expected total: 966,536
- raw numeric candidates: 287111, 331368, 281784, 66273
- extracted raw text tokens/fragments: `PE`, `>`, `«`, `X`, `-`, `3 7 N .
44`, `-`, `=`, `“A`, `2`, `"`, `0
Nl a A
yd`, `VWIINI`, `>`, `AT`, `-`, `966,556k

900`, `,0506rt`, `287.111 331,3`, `68 281,784`, `_`, `784`, `*`, `"`, `281,78`, `\`, `368`, `=`, `ass`, `1`, `;`, `6527`, `§`, `7`, `>`, `>`, `4`, `+66273`, `'`, `v`, `ERY`, `ar`, `SN`, `\`, `>`, `A`, `TOOLS`, `DD`, `yes`, `2 Tt 3
Now lf`, `4

PE`, `>`, `«`, `X`, `-`, `3 7 N .
44`, `-`, `=`, `“A`, `2`, `"`, `0
Nl a A
yd`, `BaP`, `wan`, `72621

287,11`, `1 331,368 281`, `,784`, `>`, `(H+66273`, `f`, `oo`, `|`, `A`, `a`, `FA`, `AI`, `Ce`, `®`, `4`, `;`, `.`, `!`, `V`, `€)°€4.“`, `hal`, `6`

Raw OCR text:
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

#### S3 enemy

- failures: none
- selected members: 211104, 263616, 58211
- selected total: 532,931
- expected members: 211104, 263616, 58211
- expected total: 532,931
- raw numeric candidates: 211104, 263616, 58211
- extracted raw text tokens/fragments: `e`, `B`, `P`, `4 byt RW`, `¥-`, `§`, `N="`, `08S.

EA`, `”`, `2g
232,951r
2`, `11,104 263,61`, `6 58,211

232`, `,901m`, `211,104 263,6`, `16 58,211
y P`, `p`, `Q`, `[`, `|`, `J`, `’`, `=`, `wa`, `211,104 263,6`, `16 58,211
50`, `vn`, `||`, `«tui`, `TN`, `PY`, `|`, `iy`, `p`, `“~`, `\`, `Jy`, `nN,`, `"`, `LE`, `allio,`, `ARE`, `e`, `B`, `P`, `4 byt RW`, `¥-`, `§`, `N="`, `08S.

DP 7v`, `||`, `EEE`, `YZ`, `-`, `;`, `.`, `N`, `5 Lo`, `~`, `238`, `=`, `tv`, `4`, `>`, `20`, `%`, `(Ox`, `6`, `%.0%`, `(03:`, `*`, `Dp`, `wan`, `65277

211,10`, `4 263,616 58,`, `211`, `\`, `py.`, `*`, `7f IFR`, `™`, `!`, `HE`, `~`, `i`, `gr.`, `RN`, `HY`, `/`, `|`, `le`, `S24,`

Raw OCR text:
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

### user-reports/unreviewed/IMG_9243.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: yes
- pass: no

#### S1 self

- failures: none
- selected members: 434186, 121073, 65663
- selected total: 707,759
- expected members: 434186, 121073, 65663
- expected total: 707,759
- raw numeric candidates: 707759, 434186, 121073, 65663, 86837
- extracted raw text tokens/fragments: `NZ\l`, `WIN`, `+`, `ATF-`, `707, 75 Ort`, `AA`, `WIN`, `+`, `ATF-`, `AY`, `TEN`, `\_A\_/`, `WIN`, `4`, `+`, `AT-`, `707`, `-`, `75 Ort

NZ`, `\l`, `WIN`, `+`, `ATF-`, `707, 75 Ort`, `WIN`, `+`, `2F7`, `-`, `WIN`, `+`, `AF-`, `107,759

707`, `y`, `75 Ort
434,18`, `6 121,073 65,`, `663

a AN 7 T`, `F`, `707,759w
434,`, `186 121,073 6`, `5,663
Pe

WIN`, `+`, `27`, `-`, `707,759`, `:`, `434,186 121,0`, `73 65,663

Af`, `+86837 Jae

BO`, `a`, `Tov`

Raw OCR text:
```text
total direct: NZ\l
WIN + ATF-
707, 75 Ort
total candidate traces:
- trace 1 [pass1]: text="AA\nWIN + ATF-\nAY TEN" numbers=(none)
- trace 2 [pass1]: text="\\_A\\_/\nWIN 4+ AT-\n707 - 75 Ort" numbers=(none)
- trace 3 [pass1]: text="NZ\\l\nWIN + ATF-\n707, 75 Ort" numbers=(none)
- trace 4 [pass1]: text="WIN + 2F7-" numbers=(none)
- trace 5 [pass1]: text="WIN + AF-\n107,759" numbers=107759
- trace 6 [pass1]: text="707 y 75 Ort\n434,186 121,073 65,663" numbers=434186, 121073, 65663
- trace 7 [pass1]: text="a AN 7 TF\n707,759w\n434,186 121,073 65,663\nPe" numbers=707759, 434186, 121073, 65663
members: WIN + 27-
707,759:

434,186 121,073 65,663

Af +86837 Jae

BO a Tov
```

#### S1 enemy

- failures: none
- selected members: 198559, 166290, 188925
- selected total: 553,774
- expected members: 198559, 166290, 188925
- expected total: 553,774
- raw numeric candidates: 198559, 166290, 188925
- extracted raw text tokens/fragments: `HE.`, `553,77 4m

AA`, `v1`, `+`, `EEX`, `“T*7T`, `4

v1`, `+`, `v1`, `+`, `553. 77 4p`, `:`, `HE.`, `553,77 4m

1`, `+`, `553,77 4

JL`, `+`, `553,77 4m

EA`, `"Uh`, `553,77 4m
198`, `,559`, `166,290 188,9`, `25

553,77 4m`, `198,559 166,2`, `90 188,925

J`, `L`, `+`, `553,77 4m
198`, `,559`, `166,290 188,9`, `25`

Raw OCR text:
```text
total direct: HE.
553,77 4m
total candidate traces:
- trace 1 [pass1]: text="AA\nv1 +\nEEX “T*7T 4" numbers=(none)
- trace 2 [pass1]: text="v1+\nv1 +\n553. 77 4p:" numbers=(none)
- trace 3 [pass1]: text="HE.\n553,77 4m" numbers=(none)
- trace 4 [pass1]: text="1+\n553,77 4" numbers=(none)
- trace 5 [pass1]: text="JL +\n553,77 4m" numbers=(none)
- trace 6 [pass1]: text="EA \"Uh\n553,77 4m\n198,559 166,290 188,925" numbers=198559, 166290, 188925
- trace 7 [pass1]: text="553,77 4m\n198,559 166,290 188,925" numbers=198559, 166290, 188925
members: JL +
553,77 4m
198,559 166,290 188,925
```

#### S2 self

- failures: none
- selected members: 132118, 179231, 142959
- selected total: 454,308
- expected members: 132118, 179231, 142959
- expected total: 454,308
- raw numeric candidates: 454308, 132118, 179231, 142959
- extracted raw text tokens/fragments: `hota;`, `hdid`, `LAF`, `Fjbdd`, `ANAL,`, `FIT`, `a`, `|`, `rel’`, `7. em.`, `|`, `EFS`, `a`, `\`, `ph`, `|`, `|`, `‘`, `)`, `®`, `i`, `d`, `’`, `A54,308p`, `132,118 179,2`, `31 142,959

i`, `Ih;`, `IIOP`, `132,118 179,2`, `31 142,959
FF`, `N`, `Ny`, `132,118 179,2`, `31 142,959`, `+`, `=`, `|`, `TRL,`, `132,118 179,2`, `31 142,959`, `+`, `|`, `STA`, `hota;`, `hdid`, `LAF`, `Fjbdd`, `ANAL,`, `FIT`, `a`, `|`, `rel’`, `7. em.`, `|`, `EFS`, `a`, `\`, `ph`, `|`, `|`, `‘`, `)`, `®`, `i`, `d`, `’`, `Co`, `aX`, `»`, `4 ra Be Ve, N`, `=`, `A`, `=|`, `oN`, `;`, `?`, `yo—`, `-`, `XL`, `fay`, `Ck`, `|`, `V`, `:`, `)`, `r`, `»`, `i!`, `bo`, `==`, `|`, `¥`, `Y`, `-`, `wv`, `|`, `>`, `A`, `>`, `\`, `re`, `hy`, `7

a`, `=`, `|`, `SNL`, `iE`, `hy`, `12`, `)`, `BY`, `N'Y`, `ph`, `CANE`, `(4)`, `<<.`, `1`, `&)="`, `Ph`, `hh`, `SA`, `454,308
132,1`, `18 179,231 14`, `2,959
EY`

Raw OCR text:
```text
total direct: hota; hdid LAF Fjbdd ANAL, FIT

a | rel’
7. em. | EFS a \ ph | |
‘ ) ® i d ’
total candidate traces:
- trace 1 [pass1]: text="A54,308p\n132,118 179,231 142,959" numbers=54308, 132118, 179231, 142959
- trace 2 [pass1]: text="i Ih; IIOP\n132,118 179,231 142,959\nFF N Ny" numbers=132118, 179231, 142959
- trace 3 [pass1]: text="132,118 179,231 142,959\n+ = | TRL," numbers=132118, 179231, 142959
- trace 4 [pass1]: text="132,118 179,231 142,959\n+ | STA" numbers=132118, 179231, 142959
- trace 5 [pass1]: text="hota; hdid LAF Fjbdd ANAL, FIT\n\na | rel’\n7. em. | EFS a \\ ph | |\n‘ ) ® i d ’" numbers=(none)
- trace 6 [pass1]: text="Co aX » 4 ra Be Ve, N =\nA =| oN\n; ? yo— - XL fay Ck | V\n: ) r » i! bo == | ¥ Y - wv |\n> A > \\ re hy 7" numbers=(none)
- trace 7 [pass1]: text="a = | SNL\n\niE hy 12) BY N'Y ph\n\nCANE\n(4) <<. 1&)=\" Ph" numbers=(none)
members: hh SA

454,308
132,118 179,231 142,959
EY
```

#### S2 enemy

- failures: S2 enemy total expected 448976 actual 158162; S2 enemy member1 expected 190814 actual 19217; S2 enemy member2 expected 119217 actual 100783; S2 enemy member3 expected 100783 actual 38162
- selected members: 19217, 100783, 38162
- selected total: 158,162
- expected members: 190814, 119217, 100783
- expected total: 448,976
- raw numeric candidates: 190814, 119217, 100783, 190814, 119217, 100783, 38162
- extracted raw text tokens/fragments: `190,814 119,2`, `17 100,783
ol`, `RNY`, `A`, `Co`, `:`, `.`, `\¥`, `448 97 6p
190`, `,814`, `119,217 100,7`, `83

580,77 OP`, `190,814 119,2`, `17 100,783
J`, `2`, `+38162 gram VE`, `E`, `190,814 119,2`, `17 100,783
ol`, `RNY`, `A`, `Co`, `:`, `.`, `\¥`, `190,814 119,2`, `17 100,783
af`, `+38162 7`, `-`, `I`, `Pin,`, `XW`, `A`, `Co`, `:`, `.`, `\¥`, `YY`, `IV,`, `PAS`, `LAbTjadhl`, `LUV,`, `FOS`, `5 br RST`, `|`, `|`, `1A`, `-`, `&`, `IE,`, `.`, `«`, `Ny`, `-`, `bh.`, `WW`, `|`, `:`, `Wf`, `+38162 7 h I R`, `og`, `\¥`, `s`, `br`, `-`, `a`, `NS`, `|`, `]`, `=`, `5`, `&`, `c`, `:`, `)\`, `|`, `E`, `REG`, `NY`, `-`, `VEELF`, `AX`, `y`, `y`, `—`, `he`, `lle`, `Sas`, `/`, `|`, `Ra`, `TF`, `2 ,
s br Lo N`, `S`, `|`, `1`, `{R=`, `A`, `A`, `~`, `|`, `At`, `¥`, `|`, `bo`, `-`, `ui`, `A`, `ra,`, `he`, `“`, `¥`, `LE`, `a`, `1 Wy`, `"7`, `448.976m
190,`, `814 119,217 1`, `00,783
,`, `>`, `—`, `Te`, `oO`, `Iv,`, `+38162 R`, `’`, `TRE`, `oe`, `x`, `A`

Raw OCR text:
```text
total direct: 190,814 119,217 100,783
ol RNY
A Co : . \¥
total candidate traces:
- trace 1 [pass1]: text="448 97 6p\n190,814 119,217 100,783" numbers=190814, 119217, 100783
- trace 2 [pass1]: text="580,77 OP\n190,814 119,217 100,783\nJ 2 +38162 gram VEE" numbers=190814, 119217, 100783, 38162
- trace 3 [pass1]: text="190,814 119,217 100,783\nol RNY\nA Co : . \\¥" numbers=190814, 119217, 100783
- trace 4 [pass1]: text="190,814 119,217 100,783\naf +38162 7 - I Pin, XW\nA Co : . \\¥\nYY" numbers=190814, 119217, 100783, 38162
- trace 5 [pass1]: text="IV, PAS LAbTjadhl LUV, FOS\n\n5 br RST | | 1A -\n& IE, . «\nNy - bh. WW |" numbers=(none)
- trace 6 [pass1]: text=": Wf +38162 7 h I Rog \\¥\ns br - a NS | ] = 5\n& c :\n)\\ | E\nREG NY - VEELF AX" numbers=38162
- trace 7 [pass1]: text="y y — he lle Sas / | Ra TF 2 ,\ns br Lo NS | 1 {R= A\nA ~ | At\n¥ | bo - ui A ra, he “ ¥ LE a 1 Wy" numbers=(none)
members: "7 448.976m
190,814 119,217 100,783
, > — Te oO
Iv, +38162 R ’
TRE oe x A
```

#### S3 self

- failures: none
- selected members: 563812, 268887, 404971
- selected total: 1,350,432
- expected members: 563812, 268887, 404971
- expected total: 1,350,432
- raw numeric candidates: 563812, 268887, 404971, 112762
- extracted raw text tokens/fragments: `VERE`, `iam`, `|`, `[|`, `per`, `he`, `VWIINI`, `>`, `AT`, `-`, `1,350,432m

1`, `,500,452m`, `563,812 268,8`, `87 404,971

5`, `63,812 268,88`, `7 404,971

a`, `+112762 DT

Tl`, `A`, `Ta`, `.`, `[AYE`, `a.`, `LUC`, `a`, `+112762`, `~~`, `n`, `sw`, `2 VL`, `_`, `~`, `|`, `Co`, `if`, `.`, `»`, `|`, `=`, `TALALIT`, `UL`, `|`, `|`, `N`, `|`, `yes`, `BY`, `48 y. a
ce ro`, `)`, `16 Rl`, `€:`, `ow`, `Y`, `VERE`, `iam`, `|`, `[|`, `per`, `he`, `baad`, `ol`, `wan`, `72621

563,81`, `2 268,887 404`, `,971`, `a4`, `+112762`, `~~`, `bg;`, `vw!`, `)`, `pL`, `Pp`, `¥`, `}`

Raw OCR text:
```text
total direct: VERE iam | [| per he
total candidate traces:
- trace 1 [pass1]: text="VWIINI > AT -\n1,350,432m" numbers=1350432
- trace 2 [pass1]: text="1,500,452m\n563,812 268,887 404,971" numbers=1500452, 563812, 268887, 404971
- trace 3 [pass1]: text="563,812 268,887 404,971\n\na +112762 DT\n\nTl A Ta\n. [AYE a. LUC" numbers=563812, 268887, 404971, 112762
- trace 4 [pass1]: text="a +112762 ~~ n\nsw 2 VL\n_ ~ | Co if . » |" numbers=112762
- trace 5 [pass1]: text="= TALALIT UL | | N | yes\nBY 48 y. a\nce ro) 16 Rl €: ow Y" numbers=(none)
- trace 6 [pass1]: text="VERE iam | [| per he" numbers=(none)
- trace 7 [pass1]: text="baad ol\nwan 72621" numbers=72621
members: 563,812 268,887 404,971
a4 +112762 ~~
bg; vw! ) pL Pp ¥ }
```

#### S3 enemy

- failures: none
- selected members: 150117, 33224, 189899
- selected total: 373,240
- expected members: 150117, 33224, 189899
- expected total: 373,240
- raw numeric candidates: 150117, 33224, 189899
- extracted raw text tokens/fragments: `3 i of J`, `»`, `v`, `BN`, `!`, `|`, `man`, `|`, `[OA`, `|`, `TON`, `EA”`, `2g
373,240`, `¢`, `150,117 33,22`, `4 189,899

27`, `3,240
150,117`, `33,224 189,89`, `9`, `|`, `SRR`, `TESNA`, `7

150,117 33`, `,224`, `189,899
Raed`, `[AT`, `TW`, `Sl`, `s`, `[En`, `aml`, `SL`, `IRIN`, `|`, `CA`, `ET`, `WW`, `yma`, `¥`, `-`, `ay`, `pEmam`, `wv`, `HER`, `a`, `pW`, `NF`, `oN`, `70 VAR
J`, `/`, `:`, `*`, `v`, `thay`, `AY`, `i`, `)`, `s`, `|B`, `sui,`, `‘AY`, `0`, `%`, `Co`, `|`, `-`, `:`, `ys`, `&`, `A`, `ay`, `J`, `tv`, `Al`, `~`, `TI`, `"WI`, `pd`, `Pe`, `|,`, `hs`, `}`, `ry`, `CL`, `3 i of J`, `»`, `v`, `BN`, `!`, `|`, `man`, `|`, `[OA`, `|`, `TON`, `D`, `|`, `VRC`, `CR`, `am`, `aay`, `x`, `a`, `IR`, `ie`, `(5)`, `JLo`, `vd`, `4`, `)`, `B`, `\y`, `,`, `aT»`, `.`, `Om|0Z`, `10`, `"`, `|`, `On`, `od`, `2
gq Bah 6923`, `7

150,117 33`, `,224`, `189,899
PY RE`, `:`, `~~`, `b`, `73`, `)`, `v`, `!`, `~m-`, `Wma]`, `Hy`, `Oma`, `O="`, `@)`

Raw OCR text:
```text
total direct: 3 i of J » v BN ! |
man | [OA | TON
total candidate traces:
- trace 1 [pass1]: text="EA” 2g\n373,240¢\n150,117 33,224 189,899" numbers=373240, 150117, 33224, 189899
- trace 2 [pass1]: text="273,240\n150,117 33,224 189,899\n| SRR TESNA 7" numbers=273240, 150117, 33224, 189899
- trace 3 [pass1]: text="150,117 33,224 189,899\nRaed [AT TW Sl\n\ns [En aml\n\nSL IRIN | CA" numbers=150117, 33224, 189899
- trace 4 [pass1]: text="ET WW yma ¥ - ay pEmam wv HER a pW NF oN\n70 VAR\nJ / : *\nv thay AY i )\ns |B sui,\n‘AY 0 % Co | -\n: ys & A ay J\ntv Al ~ TI\n\"WI pd Pe |, hs } ry CL" numbers=(none)
- trace 5 [pass1]: text="3 i of J » v BN ! |\nman | [OA | TON" numbers=(none)
- trace 6 [pass1]: text="D | VRC CR am\naay x\na IR ie\n(5) JLo vd 4)\n\nB \\y , aT» ." numbers=(none)
- trace 7 [pass1]: text="Om|0Z 10\" |\nOn od 2\ngq Bah 69237" numbers=69237
members: 150,117 33,224 189,899
PY RE : ~~
b 73) v ! ~m-
Wma] Hy
Oma O=" @)
```

### user-reports/unreviewed/IMG_9245.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: yes
- pass: yes

#### S1 self

- failures: none
- selected members: 547881, 176180, 102110
- selected total: 935,747
- expected members: 547881, 176180, 102110
- expected total: 935,747
- raw numeric candidates: 935747, 547881, 176180, 102110, 109576, 2007
- extracted raw text tokens/fragments: `No`, `\`, `WIN`, `+`, `ATF-`, `93 5`, `’`, `747 wt

WW
WI`, `N`, `+`, `ATF-`, `OXLE`, `“TAT`, `\_A\_/`, `WIN`, `4`, `+`, `AT-`, `93 5`, `-`, `747`, `»`, `No`, `\`, `WIN`, `+`, `ATF-`, `93 5`, `’`, `747 wt

WIN`, `+`, `25`, `-`, `WIN`, `+`, `AF-`, `93 5 y 747 er`, `547,881 176,1`, `80 102,110

9`, `35,747
547,88`, `1 176,180 102`, `,110`, `UE`, `WIN`, `+`, `27
935,747
54`, `7,881 176,180`, `102,110

if`, `+`, `109576 Fame
2`, `007 ANY`

Raw OCR text:
```text
total direct: No \
WIN + ATF-
93 5 ’ 747 wt
total candidate traces:
- trace 1 [pass1]: text="WW\nWIN + ATF-\nOXLE “TAT" numbers=(none)
- trace 2 [pass1]: text="\\_A\\_/\nWIN 4+ AT-\n93 5 - 747»" numbers=(none)
- trace 3 [pass1]: text="No \\\nWIN + ATF-\n93 5 ’ 747 wt" numbers=(none)
- trace 4 [pass1]: text="WIN + 25-" numbers=(none)
- trace 5 [pass1]: text="WIN + AF-" numbers=(none)
- trace 6 [pass1]: text="93 5 y 747 er\n547,881 176,180 102,110" numbers=547881, 176180, 102110
- trace 7 [pass1]: text="935,747\n547,881 176,180 102,110\nUE" numbers=935747, 547881, 176180, 102110
members: WIN + 27
935,747
547,881 176,180 102,110

if + 109576 Fame
2007 ANY
```

#### S1 enemy

- failures: none
- selected members: 124447, 188031, 31083
- selected total: 343,561
- expected members: 124447, 188031, 31083
- expected total: 343,561
- raw numeric candidates: 343561, 124447, 188031, 31083
- extracted raw text tokens/fragments: `HE.`, `343 561m

AA`, `v1`, `+`, `X`, `AX`, `RLY`, `1`, `+`, `v1`, `+`, `343 561

HE.`, `343 561m

1`, `+`, `543,561

J 1`, `+`, `343 561m
179A`, `AA7`, `199 N21 219 H`, `i`, `EA`, `"Uh`, `343,561
124,4`, `47 188,031 31`, `,083`, `343,561
124,4`, `47 188,031 31`, `,083`, `>`, `LL`, `+`, `343,561
124,4`, `47 188,031 31`, `,083`, `|`, `3 0 ETA Pe y`, `”`, `;`, `s`, `RON`, `A)`

Raw OCR text:
```text
total direct: HE.
343 561m
total candidate traces:
- trace 1 [pass1]: text="AA\nv1 +\nX AX RLY" numbers=(none)
- trace 2 [pass1]: text="1+\nv1 +\n343 561" numbers=(none)
- trace 3 [pass1]: text="HE.\n343 561m" numbers=(none)
- trace 4 [pass1]: text="1+\n543,561" numbers=543561
- trace 5 [pass1]: text="J 1 +\n343 561m\n179A AA7 199 N21 219 Hi" numbers=(none)
- trace 6 [pass1]: text="EA \"Uh\n343,561\n124,447 188,031 31,083" numbers=343561, 124447, 188031, 31083
- trace 7 [pass1]: text="343,561\n124,447 188,031 31,083" numbers=343561, 124447, 188031, 31083
members: > LL +
343,561
124,447 188,031 31,083
| 3 0 ETA Pe y ” ;
s RON A)
```

#### S2 self

- failures: none
- selected members: 196600, 302113, 148921
- selected total: 708,056
- expected members: 196600, 302113, 148921
- expected total: 708,056
- raw numeric candidates: 60422, 196600, 302113, 148921, 60422
- extracted raw text tokens/fragments: `ha`, `FWWUVY`, `SVE`, `ALY`, `AU,`, `Fal`, `|`, `"Na`, `+60422 3`, `=`, `oA`, `=i`, `a`, `|W`, `7`, `=`, `a`, `Neng`, `|`, `¥`, `:`, `»`, `if`, `|`, `.`, `EB`, `A`, `ro.`, `a`, `:`, `:`, `RP`, `I.`, `-`, `A`, `AS`, `:`, `708,05 6k`, `:`, `196,600 302,1`, `13 148,921
N`, `71 VO, VIP
19`, `6,600 302,113`, `148,921

196,`, `600 302,113 1`, `48,921
aaa T`, `oY`, `A`, `de`, `nen`, `Th`, `“ho`, `po`, `v`, `196,600 302,1`, `13 148,921`, `-`, `"5`, `(af`, `+60422`, `|`, `=`, `v`, `=3`, `|`, `ht`, `iy`, `Ys.`, `Th`, `ik`, `|`, `ha`, `FWWUVY`, `SVE`, `ALY`, `AU,`, `Fal`, `|`, `"Na`, `+60422 3`, `=`, `oA`, `=i`, `a`, `|W`, `7`, `=`, `a`, `Neng`, `|`, `¥`, `:`, `»`, `if`, `|`, `.`, `EB`, `A`, `ro.`, `a`, `:`, `:`, `RP`, `I.`, `-`, `A`, `AS`, `:`, `NW`, `+60422 R`, `»`, `—`, `mY`, `A,`, `=~`, `A,`, `a`, `'{`, `Ph`, `V`, `1g aS g R i R`, `e`, `i.`, `-—`, `hdl`, `|`, `|`, `oN`, `V`, `pd`, `¥`, `$`, `-`, `of`, `&S`, `a`, `Wo`, `|`, `DEA`, `VF`, `NO`, `-`, `RB.`, `:`, `a`, `ad`, `Tr`, `Ff’`, `708,05 Ort
19`, `6,600 302,113`, `148,921`, `"5`, `(4`, `+60422`, `=`, `i.`, `-`, `=.`, `|`, `3`, `+.`, `<|`, `gen`, `AL`

Raw OCR text:
```text
total direct: ha FWWUVY SVE ALY AU, Fal
| "Na +60422 3 =
oA =i a |W
7 = a Neng | ¥
: » if | . EB
A ro. a : : RP
I. - A AS :
total candidate traces:
- trace 1 [pass1]: text="708,05 6k:\n196,600 302,113 148,921\nN" numbers=196600, 302113, 148921
- trace 2 [pass1]: text="71 VO, VIP\n196,600 302,113 148,921" numbers=196600, 302113, 148921
- trace 3 [pass1]: text="196,600 302,113 148,921\naaa T oY\nA de nen Th “ho po v" numbers=196600, 302113, 148921
- trace 4 [pass1]: text="196,600 302,113 148,921\n- \"5 (af +60422 | = v\n=3 | ht iy Ys. Th ik |" numbers=196600, 302113, 148921, 60422
- trace 5 [pass1]: text="ha FWWUVY SVE ALY AU, Fal\n| \"Na +60422 3 =\noA =i a |W\n7 = a Neng | ¥\n: » if | . EB\nA ro. a : : RP\nI. - A AS :" numbers=60422
- trace 6 [pass1]: text="NW +60422 R\n» — mY\nA, =~ A, a '{ Ph V\n1g aS g R i Re" numbers=60422
- trace 7 [pass1]: text="i. -— hdl | | oN V\npd ¥ $ - of &S a Wo |\nDEA VF NO\n\n- RB. : a" numbers=(none)
members: ad Tr Ff’
708,05 Ort
196,600 302,113 148,921
"5 (4 +60422 =
i. - =. | 3
+. <| gen AL
```

#### S2 enemy

- failures: none
- selected members: 211931, 147329, 219662
- selected total: 578,922
- expected members: 211931, 147329, 219662
- expected total: 578,922
- raw numeric candidates: 211931, 147329, 219662, 578922, 147329, 219662
- extracted raw text tokens/fragments: `211,931 147,3`, `29 219,662
r`, `CN`, `)`, `TW`, `578,922
211,9`, `31 147,329 21`, `9,662

27 QO,`, `7 LLP
211,931`, `147,329 219,6`, `62

211,931 1`, `47,329 219,66`, `2
r CN`, `)`, `TW`, `211,931 147,3`, `29 219,662
r`, `I`, `N`, `-`, `>`, `JETP`, `hdd`, `Fold`, `AES`, `dad`, `L&T`, `,UVA`, `]`, `-`, `-`, `&`, `"REE`, `JE`, `AE`, `~`, `|`, `R.`, `‘woll`, `¥`, `od`, `\`, `[`, `Nn`, `-`, `-.`, `s`, `of`, `K`, `wd,`, `Y`, `5`, `:`, `&`, `*`, `es`, `VINE`, `A`, `)`, `3 i Fa i ha 4`, `%`, `y`, `N`, `4 4

Ss by 3d`, `:`, `5`, `-`, `&`, `).`, `3 .. 1h c
JPR`, `SG`, `“Ny`, `*`, `ny`, `¥,`, `’`, `ww`, `a`, `7
578,922`, `:`, `211.931 147,3`, `29 219,662

J`, `ETP`

Raw OCR text:
```text
total direct: 211,931 147,329 219,662
r CN )
TW
total candidate traces:
- trace 1 [pass1]: text="578,922\n211,931 147,329 219,662" numbers=578922, 211931, 147329, 219662
- trace 2 [pass1]: text="27 QO, 7 LLP\n211,931 147,329 219,662" numbers=211931, 147329, 219662
- trace 3 [pass1]: text="211,931 147,329 219,662\nr CN )\nTW" numbers=211931, 147329, 219662
- trace 4 [pass1]: text="211,931 147,329 219,662\nr I N - >\nJETP" numbers=211931, 147329, 219662
- trace 5 [pass1]: text="hdd Fold AES dad L&T ,UVA\n] - -\n\n& \"REE JE\n\nAE ~ | R. ‘woll ¥ od \\" numbers=(none)
- trace 6 [pass1]: text="[ Nn - -.\n\ns of K wd, Y 5 :\n& * es VINE\n\nA ) 3 i Fa i ha 4% y N 4 4" numbers=(none)
- trace 7 [pass1]: text="Ss by 3d : 5 -\n& ). 3 .. 1h c\nJPR SG “Ny * ny ¥, ’" numbers=(none)
members: ww a 7
578,922:

211.931 147,329 219,662

JETP
```

#### S3 self

- failures: none
- selected members: 311614, 252161, 309577
- selected total: 935,674
- expected members: 311614, 252161, 309577
- expected total: 935,674
- raw numeric candidates: 311614, 252161, 309577, 62322
- extracted raw text tokens/fragments: `VERE`, `iam`, `|`, `[|`, `per`, `he`, `VWILINI`, `>`, `AT`, `-`, `935,67 4`, `»`, `¥35D,0/7`, `4r`, `:`, `311,614 252,1`, `61 309,577

3`, `11,614 252,16`, `1 309,577

a`, `+62322 NT`, `=`, `2 IT
Co ah WS`, `Sal`, `UA`, `a`, `+62322`, `»`, `p=`, `v`, `3 TOLILL`, `|`, `|`, `N`, `|`, `yes`, `BY`, `48 y. a
ic ro`, `)`, `167 Ru Ld Y`, `VERE`, `iam`, `|`, `[|`, `per`, `he`, `baad`, `ol`, `wan`, `72621

311,61`, `4 252,161 309`, `,577`, `‘a`, `+62322 a .
bg`, `;`, `vw!`, `)`, `pL`, `Pp`, `¥`, `}`

Raw OCR text:
```text
total direct: VERE iam | [| per he
total candidate traces:
- trace 1 [pass1]: text="VWILINI > AT -\n935,67 4»" numbers=(none)
- trace 2 [pass1]: text="¥35D,0/7 4r:\n311,614 252,161 309,577" numbers=311614, 252161, 309577
- trace 3 [pass1]: text="311,614 252,161 309,577\n\na +62322 NT\n\n= 2 IT\nCo ah WS Sal UA" numbers=311614, 252161, 309577, 62322
- trace 4 [pass1]: text="a +62322 » p= v" numbers=62322
- trace 5 [pass1]: text="3 TOLILL | | N | yes\nBY 48 y. a\nic ro) 167 Ru Ld Y" numbers=(none)
- trace 6 [pass1]: text="VERE iam | [| per he" numbers=(none)
- trace 7 [pass1]: text="baad ol\nwan 72621" numbers=72621
members: 311,614 252,161 309,577
‘a +62322 a .
bg; vw! ) pL Pp ¥ }
```

#### S3 enemy

- failures: none
- selected members: 132303, 249008, 99734
- selected total: 481,045
- expected members: 132303, 249008, 99734
- expected total: 481,045
- raw numeric candidates: 132303, 249008, 99734
- extracted raw text tokens/fragments: `RLY`, `i`, `[4`, `o«`, `18d`, `’`, `2 A
481,045
1`, `32,303 249.00`, `8 99,734

481`, `,045R`, `132,303 249,0`, `08 99,734

13`, `2,303 249,008`, `99,734
5 C5`, `|`, `samt`, `TERK`, `.`, `IE`, `a`, `:`, `.`, `ks`, `BLE`, `¥`, `/`, `\`, `!`, `:`, `«`, `(Ife`, `u`, `LN!`, `.`, `.`, `A`, `\`, `r.`, `Ne`, `:`, `wy;`, `RLY`, `i`, `[4`, `o«`, `18d`, `’`, `I)`, `|`, `DRE`, `[7`, `Py`, `Jl`, `+I)`, `«`, `p`, `=`, `j`, `fog`, `MN`, `4d`, `|`, `g`, `“ah`, `66081

132,30`, `3 249,008 99,`, `734
EE re ll`, `\`, `a`, `~`, `p`, `"J`, `«`, `(5)`, `All`, `4 klll 6`, `)`, `“9`

Raw OCR text:
```text
total direct: RLY i [4 o« 18d ’
total candidate traces:
- trace 1 [pass1]: text="2 A\n481,045\n132,303 249.008 99,734" numbers=481045, 132303, 99734
- trace 2 [pass1]: text="481,045R\n132,303 249,008 99,734" numbers=481045, 132303, 249008, 99734
- trace 3 [pass1]: text="132,303 249,008 99,734\n5 C5 | samt TERK" numbers=132303, 249008, 99734
- trace 4 [pass1]: text=". IE a\n: . ks BLE ¥ / \\ !\n: « (Ife\nu LN! . . A\n\\ r. Ne : wy;" numbers=(none)
- trace 5 [pass1]: text="RLY i [4 o« 18d ’" numbers=(none)
- trace 6 [pass1]: text="I) | DRE [7\nPy Jl +I) «\np = j fog MN 4d |" numbers=(none)
- trace 7 [pass1]: text="g “ah 66081" numbers=66081
members: 132,303 249,008 99,734
EE re ll
\ a ~ p "J «
(5) All 4 klll 6) “9
```

### user-reports/unreviewed/IMG_9250.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: no
- pass: yes

#### S1 self

- failures: none
- selected members: 82360, 124137, 177424
- selected total: 383,921
- expected members: (none)
- expected total: 
- raw numeric candidates: 385921, 385921, 82360, 124137, 177424
- extracted raw text tokens/fragments: `ll`, `+`, `AT-`, `385,921

BW
4`, `+`, `AF-`, `20 OD

hn`, `+`, `AT-`, `383.9215

ll`, `+`, `AT-`, `385,921

4 2F`, `-`, `383. 921m`, `+`, `AT7-`, `385,921
Q`, `%`, `WEN`, `194 1277 4777`, `7 ADA

INF
38`, `3,921`, `-`, `82,360 124,13`, `7 177,424

38`, `3,921`, `-`, `82,360 124,13`, `7 177,424`, `*`, `AT`, `385,921
82,36`, `0 124,137 177`, `,424`, `a.`, `EP`

Raw OCR text:
```text
total direct: ll
+ AT-
385,921
total candidate traces:
- trace 1 [pass1]: text="BW\n4+ AF-\n20 OD" numbers=(none)
- trace 2 [pass1]: text="hn\n+ AT-\n383.9215" numbers=(none)
- trace 3 [pass1]: text="ll\n+ AT-\n385,921" numbers=385921
- trace 4 [pass1]: text="4 2F-\n383. 921m" numbers=(none)
- trace 5 [pass1]: text="+ AT7-\n385,921\nQ% WEN 194 1277 47777 ADA" numbers=385921, 47777
- trace 6 [pass1]: text="INF\n383,921-\n82,360 124,137 177,424" numbers=383921, 82360, 124137, 177424
- trace 7 [pass1]: text="383,921-\n82,360 124,137 177,424" numbers=383921, 82360, 124137, 177424
members: * AT
385,921
82,360 124,137 177,424
a. EP
```

#### S1 enemy

- failures: none
- selected members: 105866, 516222, 361331
- selected total: 1,086,665
- expected members: (none)
- expected total: 
- raw numeric candidates: 1086663, 1086665, 105866, 516222, 361331, 105244
- extracted raw text tokens/fragments: `wr`, `v1`, `+`, `WIN`, `1,086,663

oo`, `v1`, `+`, `WIN`, `1d MOL A LX`, `«@`, `I=`, `v1l+`, `WIN`, `1.086.663

wr`, `v1`, `+`, `WIN`, `1,086,663

v1`, `l+`, `~~`, `WIN`, `1,086,665

IA`, `+`, `WIN`, `1,086,663

hl`, `fA`, `AULA)`, `1,086,665
105`, `,866`, `516,222 361,3`, `31

Cee RA AA`, `A`, `1,086,663
105`, `,866`, `516,222 361,3`, `31

hl WLI
1,`, `086,665`, `-`, `105,866 516,2`, `22 361,331
Fs`, `>`, `QA`, `+105244 oe
s`, `(78`, `Tc)`, `pe`

Raw OCR text:
```text
total direct: wr
v1 + WIN
1,086,663
total candidate traces:
- trace 1 [pass1]: text="oo\nv1 + WIN\n1d MOL A LX" numbers=(none)
- trace 2 [pass1]: text="«@ I=\nv1l+ WIN\n1.086.663" numbers=(none)
- trace 3 [pass1]: text="wr\nv1 + WIN\n1,086,663" numbers=1086663
- trace 4 [pass1]: text="v1l+ ~~ WIN\n1,086,665" numbers=1086665
- trace 5 [pass1]: text="IA + WIN\n1,086,663" numbers=1086663
- trace 6 [pass1]: text="hl fA AULA)\n1,086,665\n105,866 516,222 361,331" numbers=1086665, 105866, 516222, 361331
- trace 7 [pass1]: text="Cee RA AAA\n1,086,663\n105,866 516,222 361,331" numbers=1086663, 105866, 516222, 361331
members: hl WLI
1,086,665-
105,866 516,222 361,331
Fs > QA +105244 oe
s (78 Tc) pe
```

#### S2 self

- failures: none
- selected members: 716655, 641154, 168489
- selected total: 1,526,298
- expected members: (none)
- expected total: 
- raw numeric candidates: 1526298, 716655, 641154, 168489
- extracted raw text tokens/fragments: `ff`, `A&W;`, `Vdd`, `WRA,`, `AJ`, `AVOUT`, `"NT`, `SS`, `©`, `|`, `A`, `3`, `>,`, `1,526,298r
71`, `6,655 641,154`, `168,489

hyd`, `££`, `7 OP
716,655`, `641,154 168,4`, `89

ANE PY

7`, `16,655 641,15`, `4 168,489`, `(`, `o`, `J`, `MEP`, `KYER`, `ff`, `A&W;`, `Vdd`, `WRA,`, `AJ`, `AVOUT`, `"NT`, `SS`, `©`, `|`, `A`, `3`, `>,`, `ole`, `—`, `i`, `p`, `144`, `-`, `py`, `-`, `|`, `:`, `a`, `Ta`, `fo`, `»`, `Mi`, `4 AEN`, `\3`, `>`, `Pug`, `¥`, `S`, `y`, `AD"`, `j`, `x`, `|`, `“tf`, `-`, `&`, `y.!`, `Fa`, `BY`, `|`, `5 ul`, `[i`, `!`, `1,526,298
716`, `,655`, `641,154 168,4`, `89
ore 21`

Raw OCR text:
```text
total direct: ff A&W; Vdd WRA, AJ AVOUT
"NT SS
© | A 3 >,
total candidate traces:
- trace 1 [pass1]: text="1,526,298r\n716,655 641,154 168,489" numbers=1526298, 716655, 641154, 168489
- trace 2 [pass1]: text="hyd ££ 7 OP\n716,655 641,154 168,489" numbers=716655, 641154, 168489
- trace 3 [pass1]: text="ANE PY" numbers=(none)
- trace 4 [pass1]: text="716,655 641,154 168,489\n( o J MEP KYER" numbers=716655, 641154, 168489
- trace 5 [pass1]: text="ff A&W; Vdd WRA, AJ AVOUT\n\"NT SS\n© | A 3 >," numbers=(none)
- trace 6 [pass1]: text="ole\n— i p 144 - py -" numbers=(none)
- trace 7 [pass1]: text="| : a Ta fo\n» Mi 4 AEN\n\\3 > Pug\n¥ S y AD\"\nj x | “tf - &\ny.! Fa BY | 5 ul [i !" numbers=(none)
members: 1,526,298
716,655 641,154 168,489
ore 21
```

#### S2 enemy

- failures: none
- selected members: 813535, 805577, 1026618
- selected total: 2,645,730
- expected members: (none)
- expected total: 
- raw numeric candidates: 813535, 805577, 1026618, 205323, 2090, 813535, 805577, 1026618, 205323
- extracted raw text tokens/fragments: `813,535 805,5`, `77 1,026,618`, `TTC`, `4`, `+205323
nL agp`, `pr`, `2.851 0535
81`, `3,535 805,577`, `1,026,618`, `£2,090`, `4,VI IP
813,5`, `35 805,577 1,`, `026,618`, `~`, `RL`, `{a`, `my`, `813,535 805,5`, `77 1,026,618`, `TTC`, `4`, `+205323
nL agp`, `pr`, `813,535 805,5`, `77 1,026,618`, `TE`, `oN`, `a`, `+205323
Ss Vv`, `A`, `en`, `ry`, `|]`, `ER`, `VdiotyoFfodod`, `UWI`, `IT`, `JF`, `4, VAY, VAD
r`, `E`, `aE`, `,`, `-`, `r`, `>`, `(4`, `+205323
S AC`, `~aa`, `lyr`, `n`, `\`, `Mo`, `|`, `|`, `.`, `>)`, `SEY`, `|`, `A`, `y`, `—`, `A`, `&`, `,`, `No.`, `=`, `|`, `J`, `a`, `CL`, `4`, `+205323`, `*Z`, `ry`, `y`, `AR`, `2`, `:`, `™`, `\`, `”`, `»`, `N`, `[`, `v`, `|`, `4`, `|}`, `Ph`, `Wy`, `my`, `A`, `a`, `/`, `YT`, `VY`, `TE`, `Yami`, `AN`, `NY`, `a`, `ARR`, `S`, `r`, `Nd`, `A`, `hj,`, `|`, `.`, `nN`, `r`, `d`, `\`, `ol`, `rR`, `”`, `'`, `¥`, `.`, `,`, `CY`, `Hk`, `\`, `|,`, `~~`, `LE`, `“w`, `A`, `.`, `.`, `{`, `|`, `1 E`, `$`, `p`, `ff`, `Id`, `re`, `I,`, `-`, `I`, `4`, `£2,090`, `4,VI IP
813,5`, `35 805,577 1,`, `026,618
Te NW`, `+205323`, `>`, `J`, `Aa`, `»`, `y.`, `!`

Raw OCR text:
```text
total direct: 813,535 805,577 1,026,618
TTC 4 +205323
nL agp pr
total candidate traces:
- trace 1 [pass1]: text="2.851 0535\n813,535 805,577 1,026,618" numbers=813535, 805577, 1026618
- trace 2 [pass1]: text="£2,090 4,VI IP\n813,535 805,577 1,026,618\n~ RL {a my" numbers=2090, 813535, 805577, 1026618
- trace 3 [pass1]: text="813,535 805,577 1,026,618\nTTC 4 +205323\nnL agp pr" numbers=813535, 805577, 1026618, 205323
- trace 4 [pass1]: text="813,535 805,577 1,026,618\nTE oN a +205323\nSs Vv A en ry |] ER" numbers=813535, 805577, 1026618, 205323
- trace 5 [pass1]: text="VdiotyoFfodod UWI IT JF 4, VAY, VAD\nrE aE\n, - r > (4 +205323\nS AC ~aa lyr n \\\nMo | | .\n>) SEY | A\ny — A & ,\nNo. = | J" numbers=205323
- trace 6 [pass1]: text="a CL 4 +205323\n*Z ry y AR\n2 : ™ \\ ” » N [\nv | 4 |}\nPh Wy my A a /" numbers=205323
- trace 7 [pass1]: text="YT VY TE Yami\nAN NY a ARR\nS r Nd A hj, | . nN r d \\\nol rR ” ' ¥ . ,\nCY Hk\n\\ |, ~~ LE “w A\n. . { | 1 E $ p ff Id\nre I, - I 4" numbers=(none)
members: £2,090 4,VI IP
813,535 805,577 1,026,618
Te NW +205323
> J Aa » y. !
```

#### S3 self

- failures: none
- selected members: 65386, 18538, 82030
- selected total: 165,954
- expected members: (none)
- expected total: 
- raw numeric candidates: 58488
- extracted raw text tokens/fragments: `w`, `N`, `4
3

1d`, `*`, `AT`, `165,954
65386`, `18,538 82,030`, `100,924nm
65,`, `386 18,538 82`, `,030`, `|`, `VaR`, `\`, `ETE`, `(ZN)`, `-`, `4

7 EEN EEN`, `AA`, `1 rR L 3,

a`, `Ey`, `ER`, `amy`, `¥.,.`, `ky`, `PRS`, `\`, `v`, `ON`, `V`, `*`, `dl`, `No`, `\S`, `B`, `Bh`, `AVON`, `TRY`, `mn`, `|`, `9`, `)`, `&`, `.`, `i`, `<`, `a`, `w`, `N`, `4
3

1d

4`, `\`, `a`, `1`, `\Y`, `er`, `Det`, `#ah`, `58488`, `(`, `_ip™`, `ZnS`, `58488`, `€`, `Ff`

Raw OCR text:
```text
total direct: w
N 4
3

1d
total candidate traces:
- trace 1 [pass1]: text="* AT\n165,954\n65386 18,538 82,030" numbers=165954, 65386, 18538, 82030
- trace 2 [pass1]: text="100,924nm\n65,386 18,538 82,030\n| VaR \\ ETE (ZN) - 4" numbers=100924, 65386, 18538, 82030
- trace 3 [pass1]: text="7 EEN EEN\nAA 1 rR L 3," numbers=(none)
- trace 4 [pass1]: text="a Ey ER amy\n¥.,. ky PRS \\ v ON V\n* dl No \\S B\n\nBh AVON TRY mn" numbers=(none)
- trace 5 [pass1]: text="| 9) & .\ni <\na" numbers=(none)
- trace 6 [pass1]: text="w\nN 4\n3\n\n1d" numbers=(none)
- trace 7 [pass1]: text="4 \\ a 1\\Y\ner Det\n#ah 58488" numbers=58488
members: ( _ip™ ZnS
58488 €
Ff
```

#### S3 enemy

- failures: none
- selected members: 463998, 0, 0
- selected total: 556,797
- expected members: (none)
- expected total: 
- raw numeric candidates: 463998, 92799
- extracted raw text tokens/fragments: `Gali`, `EA”`, `2g VVIIN
556,`, `797
463,998`, `—`, `—`, `220,79 7m
463`, `,998`, `—`, `—`, `a+`, `02799 a

463,`, `998`, `—`, `—`, `ST`, `[`, `)`, `Ji`, `Gali`, `“wl`, `|`, `{TA`, `RY`, `>`, `1`, `:`, `3 2

ID wan 2`, `2476

463,998`, `—`, `—`, `ar`, `+92799
v. A`, `§`

Raw OCR text:
```text
total direct: Gali
total candidate traces:
- trace 1 [pass1]: text="EA” 2g VVIIN\n556,797\n463,998 — —" numbers=556797, 463998
- trace 2 [pass1]: text="220,79 7m\n463,998 — —\na+ 02799 a" numbers=463998, 2799
- trace 3 [pass1]: text="463,998 — —\nST [ )" numbers=463998
- trace 4 [pass1]: text="Ji" numbers=(none)
- trace 5 [pass1]: text="Gali" numbers=(none)
- trace 6 [pass1]: text="“wl | {TA RY\n> 1\n: 3 2" numbers=(none)
- trace 7 [pass1]: text="ID wan 22476" numbers=22476
members: 463,998 — —
ar +92799
v. A§
```

### user-reports/unreviewed/IMG_9283.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: no
- pass: yes

#### S1 self

- failures: none
- selected members: 102964, 384018, 122494
- selected total: 686,279
- expected members: (none)
- expected total: 
- raw numeric candidates: 686279, 686279, 102964, 384018, 122494, 76803
- extracted raw text tokens/fragments: `ll`, `+`, `AT-`, `686,279`, `¢`, `BW`, `4`, `+`, `AF-`, `L204`, `DTH`, `hn`, `+`, `AT-`, `686.2795`, `:`, `ll`, `+`, `AT-`, `686,279`, `¢`, `4 2F`, `-`, `686,279r`, `+`, `AT-`, `686,279
109 O`, `LA`, `ABA`, `O18`, `199 AOA

vv I`, `NT`, `686,279
102,9`, `64 384,018 12`, `2,494

686,27`, `9
102,964 384`, `,018`, `122,494`, `+`, `AT`, `686,279
102,9`, `64 384,018 12`, `2,494
a A`, `+76803 a
v`

Raw OCR text:
```text
total direct: ll
+ AT-
686,279¢
total candidate traces:
- trace 1 [pass1]: text="BW\n4+ AF-\nL204 DTH" numbers=(none)
- trace 2 [pass1]: text="hn\n+ AT-\n686.2795:" numbers=(none)
- trace 3 [pass1]: text="ll\n+ AT-\n686,279¢" numbers=686279
- trace 4 [pass1]: text="4 2F-\n686,279r" numbers=686279
- trace 5 [pass1]: text="+ AT-\n686,279\n109 OLA ABA O18 199 AOA" numbers=686279
- trace 6 [pass1]: text="vv INT\n686,279\n102,964 384,018 122,494" numbers=686279, 102964, 384018, 122494
- trace 7 [pass1]: text="686,279\n102,964 384,018 122,494" numbers=686279, 102964, 384018, 122494
members: + AT
686,279
102,964 384,018 122,494
a A +76803 a
v
```

#### S1 enemy

- failures: none
- selected members: 380332, 227781, 202265
- selected total: 810,378
- expected members: (none)
- expected total: 
- raw numeric candidates: 810378, 810578, 380332, 227781, 202265
- extracted raw text tokens/fragments: `wr`, `v1+`, `WIN`, `810,378m

oo`, `v1+`, `WIN`, `O1M`, `X70`, `OW`, `Ie`, `v1+`, `WIN`, `810 378

wr
v`, `1`, `+`, `WIN`, `810,378m

v1l`, `+`, `WIN`, `810,578

IA`, `+`, `WIN`, `810,378m
290`, `2D DOT T7009`, `TY7NYD`, `DAE`, `7 aT JA AUK`, `)`, `810,378`, `:`, `380,332 227,7`, `81 202,265

C`, `o`, `Eee`, `RA`, `ANA`, `810,378m
380,`, `332 227,781 2`, `02,265

1`, `+`, `WIN`, `810,578m
380,`, `332 227,781 2`, `02,265
i a`, `“|`, `F`, `N`, `.`, `-`, `FE`, `VS`

Raw OCR text:
```text
total direct: wr
v1+ WIN
810,378m
total candidate traces:
- trace 1 [pass1]: text="oo\nv1+ WIN\nO1M X70" numbers=(none)
- trace 2 [pass1]: text="OW Ie\nv1+ WIN\n810 378" numbers=(none)
- trace 3 [pass1]: text="wr\nv1+ WIN\n810,378m" numbers=810378
- trace 4 [pass1]: text="v1l+ WIN\n810,578" numbers=810578
- trace 5 [pass1]: text="IA + WIN\n810,378m\n290 2D DOT T7009 TY7NYD DAE" numbers=810378, 7009
- trace 6 [pass1]: text="7 aT JA AUK)\n810,378:\n380,332 227,781 202,265" numbers=810378, 380332, 227781, 202265
- trace 7 [pass1]: text="Co Eee RA ANA\n810,378m\n380,332 227,781 202,265" numbers=810378, 380332, 227781, 202265
members: 1+ WIN
810,578m
380,332 227,781 202,265
i a “| F N . -
FE VS
```

#### S2 self

- failures: none
- selected members: 824061, 483384, 1044188
- selected total: 2,560,470
- expected members: (none)
- expected total: 
- raw numeric candidates: 308837, 824061, 483384, 1044188, 208837
- extracted raw text tokens/fragments: `BVO`, `yd`, `UE`, `LA,`, `Vip,`, `LOO`, `Wat`, `p,`, `WA`, `308837`, `(|`, `ART`, `|`, `W`, `C8`, `1x

2,560,470`, `824,061 483,3`, `84 1,044,188`, `AEE`, `WY`, `|`, `Ly`, `IO`, `5`, `]`, `UPL`, `824,061 483,3`, `84 1,044,188`, `AER`, `A»`, `205557`, `§`, `ry`, `Y`, `Zia)`, `7

824,061 48`, `3,384 1,044,1`, `88
TRY

824,0`, `61 483,384 1,`, `044,188
BL 4`, `+208837
k SE`, `\`, `A`, `|`, `|`, `BVO`, `yd`, `UE`, `LA,`, `Vip,`, `LOO`, `Wat`, `p,`, `WA`, `308837`, `(|`, `ART`, `|`, `W`, `C8`, `1x

IP 4`, `+208837`, `»`, `k`, `SE`, `\`, `I`, `,`, `|`, `|`, `NI`, `5 dP`, `|`, `i`, `Pg`, `h`, `EAN`, `f`, `W/`, `A`, `ld`, `NN`, `OV`, `Dy`, `——`, `Pa.`, `|`, `Y`, `r`, `:`, `\`, `I`, `,`, `|`, `-`, `Bly`, `»`, `.`, `;`, `&-`, `J`, `¥:`, `A`, `N="`, `le`, `824,061 483,3`, `84 1,044,188`, `Yul`, `id`, `af`, `+208837

fi i`, `\`, `a.`, `|`, `|`, `<8`, `£`, `C`, `&>`

Raw OCR text:
```text
total direct: BVO yd UE LA, Vip, LOO

Wat p, WA 308837
(| ART | W

C8 1x
total candidate traces:
- trace 1 [pass1]: text="2,560,470\n824,061 483,384 1,044,188\nAEE WY |" numbers=2560470, 824061, 483384, 1044188
- trace 2 [pass1]: text="Ly IO 5] UPL\n824,061 483,384 1,044,188\nAER A» 205557 §\nry Y Zia) 7" numbers=824061, 483384, 1044188, 205557
- trace 3 [pass1]: text="824,061 483,384 1,044,188\nTRY" numbers=824061, 483384, 1044188
- trace 4 [pass1]: text="824,061 483,384 1,044,188\nBL 4 +208837\nk SE \\ A | |" numbers=824061, 483384, 1044188, 208837
- trace 5 [pass1]: text="BVO yd UE LA, Vip, LOO\n\nWat p, WA 308837\n(| ART | W\n\nC8 1x" numbers=308837
- trace 6 [pass1]: text="IP 4 +208837\n» k SE \\ I , | |\nNI\n5 dP | i\nPg h EAN f W/ A ld" numbers=208837
- trace 7 [pass1]: text="NN OV Dy ——\nPa. | Y r : \\ I , |\n- Bly » . ; &- J\n¥: A N=\" le" numbers=(none)
members: 824,061 483,384 1,044,188
Yul id af +208837

fi i \ a. | |
<8 £ C &>
```

#### S2 enemy

- failures: none
- selected members: 458374, 834329, 72665
- selected total: 1,365,368
- expected members: (none)
- expected total: 
- raw numeric candidates: 458374, 834329, 72665, 1565568, 458374, 834329, 72665
- extracted raw text tokens/fragments: `458,374 834,3`, `29 72,665
es`, `|W.`, `TN`, `1,565,368
458`, `,374`, `834,329 72,66`, `5

dy FVD IOO`, `PL`, `458,374 834,3`, `29 72,665

45`, `8,374 834,329`, `72,665
es`, `|W.`, `TN`, `458,374 834,3`, `29 72,665
TT`, `fr`, `i.`, `2 f is`, `/`, `a\-`, `>`, `cP`, `RIS`, `IT`, `DIN`, `ddaT`, `FT`, `4`, `&,VUVS`, `rr`, `PEN`, `a`, `:`, `7 iy`, `|`, `A`, `;`, `:`, `7 J J 4`, `)`, `\`, `S`, `al`, `gE`, `|`, `iy`, `;`, `’`, `pr`, `)`, `E)`, `fF`, `/`, `%`, `pn`, `HF`, `14 wv`, `-`, `i`, `“4`, `3`, `\:`, `3`, `+`, `J`, `]`, `i`, `Sf`, `po`, `,`, `A`, `»-`, `4`, `‘iat`, `re`, `Sw`, `Yi`, `F`, `.`, `:`, `hy`, `I`, `PEE`, `-`, `y`, `:`, `JA`, `!`, `v`, `xf.`, `.`, `h)`, `W`, `\`, `5 in By oe`, `~`, `4`, `~`, `i`, `g?`, `h`, `—~`, `kT`, `“la`, `-`, `b`, `pie`, `a,`, `--`, `ia”`, `1`, `)`, `iu`, `.`, `)`, `mn`, `Foy`, `ae`, `-`, `-`, `.`, `ou`, `¥`, `emit`, `|`, `¥-`, `Cha`, `J`, `BE`, `Wak`, `rT,`, `\`, `--`, `ie`, `|`, `RY`, `-,`, `ol`, `Nil`, `¥-`, `wr`, `i,`, `3 y`, `/`, `|`, `te`, `vw`, `-`, `hall`, `{`, `.`, `y`, `AEE`, `x`, `J`, `55 2 Sl 6 Y`, `ww`, `=m`, `7
1,565,568
4`, `58,374 834,32`, `9 72,665
TAR`, `rv`, `)`, `r`, `/`, `hy`, `=.`, `VE`, `\`, `\`, `s`, `|g`

Raw OCR text:
```text
total direct: 458,374 834,329 72,665
es |W. TN
total candidate traces:
- trace 1 [pass1]: text="1,565,368\n458,374 834,329 72,665" numbers=1565368, 458374, 834329, 72665
- trace 2 [pass1]: text="dy FVD IOOPL\n458,374 834,329 72,665" numbers=458374, 834329, 72665
- trace 3 [pass1]: text="458,374 834,329 72,665\nes |W. TN" numbers=458374, 834329, 72665
- trace 4 [pass1]: text="458,374 834,329 72,665\nTT\nfr i. 2 f is/ a\\-\n> cP" numbers=458374, 834329, 72665
- trace 5 [pass1]: text="RIS IT DIN ddaT FT 4&,VUVS\nrr PEN a\n\n: 7 iy | A ; : 7 J J 4) \\\n\nS al gE | iy ; ’ pr ) E) fF / % pn HF\n14 wv - i “4 3 \\: 3 + J\n\n] i Sf po , A »- 4 ‘iat" numbers=(none)
- trace 6 [pass1]: text="re Sw Yi\nF . : hy I PEE - y\n: JA ! v xf. . h) W \\\n5 in By oe ~ 4 ~ i g? h —~\nkT “la - b pie a, --\nia” 1) iu\n. ) mn Foy ae - - . ou\n¥ emit | ¥- Cha J" numbers=(none)
- trace 7 [pass1]: text="BE Wak rT, \\ -- ie | RY\n-, ol Nil ¥- wr i, 3 y/ |\nte vw - hall { .\ny AEE x J\n55 2 Sl 6 Y" numbers=(none)
members: ww =m 7
1,565,568
458,374 834,329 72,665
TAR rv )
r / hy =. VE \ \
s |g
```

#### S3 self

- failures: none
- selected members: 177045
- selected total: 201,312
- expected members: (none)
- expected total: 
- raw numeric candidates: 177045
- extracted raw text tokens/fragments: `Am`, `iy`, `ERS`, `ava`, `wg`, `a`, `+`, `AT`, `177,045p
177,`, `045`, `—`, `—`, `177,04Dp
177,`, `045`, `—`, `-`, `BY`, `SS`, `OA`, `A,`, `wa`, `J`, `wv`, `Y`, `4 v
.`, `-`, `ZZ`, `y`, `1 oh`, `|`, `/`, `/`, `|`, `Am`, `iy`, `ERS`, `ava`, `wg`, `a`, `ad`, `|`, `Bah`, `24267

177,04`, `5`, `_`, `—`, `Ty`

Raw OCR text:
```text
total direct: Am iy

ERS

ava
wg

a
total candidate traces:
- trace 1 [pass1]: text="+ AT\n177,045p\n177,045 — —" numbers=177045, 177045
- trace 2 [pass1]: text="177,04Dp\n177,045 — -\nBY SS OA A," numbers=177045
- trace 3 [pass1]: text="wa J wv" numbers=(none)
- trace 4 [pass1]: text="Y 4 v\n.- ZZ y" numbers=(none)
- trace 5 [pass1]: text="1 oh | /\n/ |" numbers=(none)
- trace 6 [pass1]: text="Am iy\n\nERS\n\nava\nwg\n\na" numbers=(none)
- trace 7 [pass1]: text="ad |\nBah 24267" numbers=24267
members: 177,045 _ —
Ty
```

#### S3 enemy

- failures: none
- selected members: 63337, 263411, 261118
- selected total: 640,548
- expected members: (none)
- expected total: 
- raw numeric candidates: 63337, 263411, 261118, 52682
- extracted raw text tokens/fragments: `}`, `-`, `oo`, `ofa`, `a`, `aT`, `.`, `or`, `BE`, `—`, `ERS`, `4`, `;`, `a`, `:`, `AN`, `ey`, `A`, `|.`, `A`, `ret`, `a`, `ad`, `-`, `Hd`, `}`, `A`, `VVIIN`, `640,548
63.33`, `7 263411 261,`, `118

040,048`, `63,337 263,41`, `1 261,118`, `|`, `63,337 263,41`, `1 261,118
SN`, `(Af`, `+52682 . ATR`, `f`, `\`, `C`, `"AN`, `Si...`, `(IV`, `AAP`, `ea`, `pa`, `ay`, `5 nara y TEE`, `NY`, `ER`, `gy`, `EER`, `En`, `a`, `4 EN
VAR`, `&`, `+52682 ST
7g m`, `y`, `5
. pl.`, `>,`, `pr`, `a`, `}`, `-`, `oo`, `ofa`, `a`, `aT`, `.`, `or`, `BE`, `—`, `ERS`, `4`, `;`, `a`, `:`, `AN`, `ey`, `A`, `|.`, `A`, `ret`, `a`, `ad`, `-`, `Hd`, `}`, `D`, `A`, `aw`, `A`, `2`, `;`, `R`, `ag`, `~`, `J.`, `Ba`, `63,337 263,41`, `1 261,118
y`, `-`, `ES`, `af`, `+52682`, `-~`, `-\`, `7`, `’`, `Il.`, `2`, `|e:`

Raw OCR text:
```text
total direct: } - oo ofa a aT . or
BE — ERS 4
; a : AN
ey A |. A
ret a ad - Hd }
total candidate traces:
- trace 1 [pass1]: text="A VVIIN\n640,548\n63.337 263411 261,118" numbers=640548, 263411, 261118
- trace 2 [pass1]: text="040,048\n63,337 263,411 261,118\n|" numbers=40048, 63337, 263411, 261118
- trace 3 [pass1]: text="63,337 263,411 261,118\nSN (Af +52682 . ATR\n\nf \\ C \"AN\n\nSi... (IV AAP" numbers=63337, 263411, 261118, 52682
- trace 4 [pass1]: text="ea pa ay 5 nara y TEE NY ER gy EER En\na 4 EN\nVAR & +52682 ST\n7g my 5\n. pl. >, pr a" numbers=52682
- trace 5 [pass1]: text="} - oo ofa a aT . or\nBE — ERS 4\n; a : AN\ney A |. A\nret a ad - Hd }" numbers=(none)
- trace 6 [pass1]: text="D A aw A\n2; R" numbers=(none)
- trace 7 [pass1]: text="ag ~ J.\nBa" numbers=(none)
members: 63,337 263,411 261,118
y - ES af +52682 -~ -\
7’ Il. 2 |e:
```

### user-reports/unreviewed/IMG_9285.png

- disabled known correction(s): IMG_9243.png:stage2, IMG_9163.png:stage1, IMG_9163.png:stage3, IMG_9283.png:stage3, IMG_9285.png:stage3, IMG_9222.png:stage1, IMG_9240.png:stage1, IMG_9240.png:stage3, IMG_9250.png:stage2, IMG_9074.png:stage2, IMG_9245.png:stage1
- expected: no
- pass: yes

#### S1 self

- failures: none
- selected members: 498418, 320768, 165542
- selected total: 1,084,411
- expected members: (none)
- expected total: 
- raw numeric candidates: 1084411, 498418, 320768, 165542, 99683
- extracted raw text tokens/fragments: `NZ\l`, `WIN`, `+`, `ATF-`, `AJ`, `WIN`, `+`, `ATF-`, `1d NO 4d 414`, `J`, `WIN`, `4`, `+`, `AT-`, `1 084 41 1rt`, `NZ\l`, `WIN`, `+`, `ATF-`, `WIN`, `+`, `25`, `-`, `WIN`, `+`, `AF-`, `498,418 320,7`, `68 165,542

1`, `,084,411`, `498,418 320,7`, `68 165,542
TE`, `V`, `1,084,411n
49`, `8,418 320,768`, `165,542
Af`, `+99683 Pate
We`, `NN,`, `®`, `Th`, `EA`

Raw OCR text:
```text
total direct: NZ\l
WIN + ATF-
total candidate traces:
- trace 1 [pass1]: text="AJ\nWIN + ATF-\n1d NO 4d 414" numbers=(none)
- trace 2 [pass1]: text="J\nWIN 4+ AT-\n1 084 41 1rt" numbers=(none)
- trace 3 [pass1]: text="NZ\\l\nWIN + ATF-" numbers=(none)
- trace 4 [pass1]: text="WIN + 25-" numbers=(none)
- trace 5 [pass1]: text="WIN + AF-" numbers=(none)
- trace 6 [pass1]: text="498,418 320,768 165,542" numbers=498418, 320768, 165542
- trace 7 [pass1]: text="1,084,411\n498,418 320,768 165,542\nTEV" numbers=1084411, 498418, 320768, 165542
members: 1,084,411n
498,418 320,768 165,542
Af +99683 Pate
We NN, ® Th EA
```

#### S1 enemy

- failures: none
- selected members: 317359, 113070, 132893
- selected total: 563,322
- expected members: (none)
- expected total: 
- raw numeric candidates: 563322, 317359, 113070, 132893
- extracted raw text tokens/fragments: `HE.`, `563, 322m

AA`, `v1`, `+`, `BAX`, `XPHH`, `v1+`, `v1`, `+`, `563 3225

HE.`, `563, 322m

1`, `+`, `563,322`, `¢`, `J`, `1`, `+`, `563, 322m
217`, `20 112A 07H 1`, `729 20`, `%`, `EA`, `"Uh`, `563,322p
317,`, `359 113,070 1`, `32,893

563,3`, `22
317,359 11`, `3,070 132,893`, `A"`, `"Ug`, `563,322p

317`, `,359`, `113,070 132,8`, `93

s ul Nf A`, `)`

Raw OCR text:
```text
total direct: HE.
563, 322m
total candidate traces:
- trace 1 [pass1]: text="AA\nv1 +\nBAX XPHH" numbers=(none)
- trace 2 [pass1]: text="v1+\nv1 +\n563 3225" numbers=3225
- trace 3 [pass1]: text="HE.\n563, 322m" numbers=(none)
- trace 4 [pass1]: text="1+\n563,322¢" numbers=563322
- trace 5 [pass1]: text="J 1 +\n563, 322m\n217 20 112A 07H 1729 20%" numbers=1729
- trace 6 [pass1]: text="EA \"Uh\n563,322p\n317,359 113,070 132,893" numbers=563322, 317359, 113070, 132893
- trace 7 [pass1]: text="563,322\n317,359 113,070 132,893" numbers=563322, 317359, 113070, 132893
members: A" "Ug
563,322p

317,359 113,070 132,893

s ul Nf A)
```

#### S2 self

- failures: none
- selected members: 1001539, 721827, 659907
- selected total: 2,583,580
- expected members: (none)
- expected total: 
- raw numeric candidates: 200307, 2583580, 1001539, 721827, 659907, 200507
- extracted raw text tokens/fragments: `hy`, `WN`, `hyd`, `TF`, `Tad`, `Vf`, `UJI`, `I7,7G7F`, `y`, `+200307 7 EN`, `|`, `ay`, `y`, `Nl.`, `V`, `2.583 580
1,0`, `01,539721,827`, `659,907

oy I`, `OI`, `IOUVPL`, `1,001,539721,`, `827 659,907`, `§+200307`, `B`, `LE`, `“,`, `4`, `+200307`, `§`, `Jogo`, `Y`, `SURRY`, `1,001,539721,`, `827 659,907
y`, `+200307 2 SRA`, `7 AL

1,001,5`, `39721,827 659`, `,907`, `§+200307`, `|`, `VEE`, `a`, `a`, `|v`, `hy`, `WN`, `hyd`, `TF`, `Tad`, `Vf`, `UJI`, `I7,7G7F`, `y`, `+200307 7 EN`, `|`, `ay`, `y`, `Nl.`, `V`, `y`, `+`, `200 307 ve d`, `3, V`, `|`, `»`, `SE`, `\`, `Avy,`, `|`, `EE`, `«`, `a`, `&`, `|`, `|`, `ER`, `-`, `I`, `1

p 3 oy`, `=`, `A`, `n`, `f`, `44 my

ST Bs`, `.`, `II`, `TE`, `:`, `«`, `.`, `|`, `a`, `,`, `yw`, `I`, `NEAR`, `BENT`, `2,583,580

1,`, `001,539721,82`, `7 659,907`, `¥+200507`, `|`, `EEE`, `v`

Raw OCR text:
```text
total direct: hy WN hyd TF Tad Vf UJI I7,7G7F
y +200307 7 EN |
ay y Nl. V
total candidate traces:
- trace 1 [pass1]: text="2.583 580\n1,001,539721,827 659,907" numbers=1001539, 721827, 659907
- trace 2 [pass1]: text="oy IOI IOUVPL\n1,001,539721,827 659,907\n§+200307 B LE “,\n4+200307 § Jogo Y SURRY" numbers=1001539, 721827, 659907, 200307, 200307
- trace 3 [pass1]: text="1,001,539721,827 659,907\ny+200307 2 SRA\n7 AL" numbers=1001539, 721827, 659907, 200307
- trace 4 [pass1]: text="1,001,539721,827 659,907\n§+200307 | VEE\na a |v" numbers=1001539, 721827, 659907, 200307
- trace 5 [pass1]: text="hy WN hyd TF Tad Vf UJI I7,7G7F\ny +200307 7 EN |\nay y Nl. V" numbers=200307
- trace 6 [pass1]: text="y + 200 307 ve d 3, V\n| » SE \\ Avy, |\nEE « a & |\n| ER - I 1\n\np 3 oy = A n f 44 my" numbers=(none)
- trace 7 [pass1]: text="ST Bs . II TE\n: « . | a , yw I" numbers=(none)
members: NEAR BENT
2,583,580

1,001,539721,827 659,907

¥+200507 | EEE v
```

#### S2 enemy

- failures: none
- selected members: 598088, 281951, 467563
- selected total: 1,347,602
- expected members: (none)
- expected total: 
- raw numeric candidates: 98088, 281951, 467563, 1347602, 598088, 281951, 467563
- extracted raw text tokens/fragments: `$98,088`, `281,951 467,5`, `63

A Ale WY`, `TT`, `RE`, `EEN`, `a`, `A`, `A`, `|`, `SF`, `SE`, `-`, `|`, `IPR`, `i`, `1,347,6025
59`, `8,088 281,951`, `467,563

dy F`, `EET`, `OV`, `LPL`, `598,088 281,9`, `51 467,563`, `$98,088`, `281,951 467,5`, `63

A Ale WY`, `TT`, `RE`, `EEN`, `a`, `A`, `A`, `|`, `SF`, `SE`, `-`, `|`, `IPR`, `i`, `598,088 281,9`, `51 467,563
TT`, `EN`, `Aa`, `s`, `|`, `ctl`, `S|`, `FIT`, `VO0`, `LOL,`, `FSA`, `BOT,`, `JIVS`, `mn`, `ETRE`, `age`, `PAT`, `y`, `ARS`, `X`, `23
3 La 3`, `;`, `A`, `fr`, `JU`, `|`, `CIP`, `||`, `Ele]`, `i`, `{I~`, `-`, `AW,`, `«ds`, `“w`, `AL`, `i`, `:`, `|`, `A`, `I`, `hil`, `FPA`, `a.`, `aw`, `ET`, `nN`, `dni`, `[REN`, `2`, `-`, `LY`, `3`, `:`, `EF`, `i-`, `r`, `4`, `=`, `}`, `--`, `I`, `a`, `|`, `y`, `v`, `!`, `A`, `YL`, `.`, `Ya`, `|`, `Lag`, `f`, `L`, `yt`, `K`, `4A`, `\`, `|`, `wr;`, `ro`, `l`, `IAS`, `4 dq YY  N`, `-B`, `Ay`, `r—-`, `oa`, `:`, `LA`, `he`, `1 end

5`, `|`, `mill`, `Ny`, `|`, `(RD:`, `No`, `Ty`, `fg`, `a`, `|`, `¢`, `pd`, `L`, `|`, `|.`, `a`, `ad`, `ww`, `a`, `7
1,347,602`, `¢`, `598,088 281,9`, `51 467,563
TV`, `DEEN`, `[Aa`, `J`

Raw OCR text:
```text
total direct: $98,088 281,951 467,563

A Ale WY
TT RE
EEN a A A | SF SE - | IPR i
total candidate traces:
- trace 1 [pass1]: text="1,347,6025\n598,088 281,951 467,563" numbers=1347602, 598088, 281951, 467563
- trace 2 [pass1]: text="dy FEET OV LPL\n598,088 281,951 467,563" numbers=598088, 281951, 467563
- trace 3 [pass1]: text="$98,088 281,951 467,563\n\nA Ale WY\nTT RE\nEEN a A A | SF SE - | IPR i" numbers=98088, 281951, 467563
- trace 4 [pass1]: text="598,088 281,951 467,563\nTT EN Aa\ns | ctl S|" numbers=598088, 281951, 467563
- trace 5 [pass1]: text="FIT VO0 LOL, FSA BOT, JIVS\nmn ETRE age PAT\ny ARS X 23\n3 La 3 ; A fr\nJU | CIP || Ele]\ni {I~ - AW, «ds\n“w AL i : | A I hil" numbers=(none)
- trace 6 [pass1]: text="FPA a. aw ET nN\ndni [REN 2 -\nLY 3 : EF i-\nr 4\n= } -- I a | y\nv ! A YL\n. Ya | Lag f L yt K 4A \\\n| wr; ro l IAS\n4 dq YY  N-B Ay r—- oa" numbers=(none)
- trace 7 [pass1]: text=": LA he 1 end\n\n5 | mill Ny | (RD:\nNo Ty fg a\n| ¢ pd L | |. a ad" numbers=(none)
members: ww a 7
1,347,602¢
598,088 281,951 467,563
TV DEEN [Aa
J
```

#### S3 self

- failures: none
- selected members: 243617, 48723
- selected total: 292,540
- expected members: (none)
- expected total: 
- raw numeric candidates: 243617, 48723
- extracted raw text tokens/fragments: `Sod`, `wo`, `fi`, `“`, `.`, `iF`, `2`, `|`, `VWILINI`, `>`, `AT`, `-`, `292,35 40k
24`, `3617`, `—`, `—`, `292,540m
243,`, `617`, `—`, `—`, `af`, `+48723 Eu a

2`, `43,617`, `—`, `—`, `af`, `+48723
wa`, `|v`, `a`, `+48723

Si`, `|`, `wy`, `J`, `-`, `Sod`, `wo`, `fi`, `“`, `.`, `iF`, `2`, `|`, `Pa`, `wan`, `24267

243617`, `—`, `—`, `|`, `+48723`, `%`, `-`, `_Z`, `-`, `>.`

Raw OCR text:
```text
total direct: Sod wo
fi “ .
iF 2 |
total candidate traces:
- trace 1 [pass1]: text="VWILINI > AT -\n292,35 40k\n243617 —  —" numbers=243617
- trace 2 [pass1]: text="292,540m\n243,617 — —\naf +48723 Eu a" numbers=292540, 243617, 48723
- trace 3 [pass1]: text="243,617 — —\naf +48723\nwa |v" numbers=243617, 48723
- trace 4 [pass1]: text="a +48723" numbers=48723
- trace 5 [pass1]: text="Si | wy J\n-" numbers=(none)
- trace 6 [pass1]: text="Sod wo\nfi “ .\niF 2 |" numbers=(none)
- trace 7 [pass1]: text="Pa\nwan 24267" numbers=24267
members: 243617 —  —
| +48723%

- _Z

- >.
```

#### S3 enemy

- failures: none
- selected members: 72249, 33984, 27179
- selected total: 133,412
- expected members: (none)
- expected total: 
- raw numeric candidates: 72249, 33984, 27179
- extracted raw text tokens/fragments: `y`, `A`, `Vj`, `ZI`, `N`, `f`, `pam`, `|.`, `p/`, `d:`, `fl`, `i`, `-`, `oe`, `1
OC`, `):`, `LR`, `(4`, `0

EA`, `”`, `2g
133,412
72`, `,249`, `33,984 27,179`, `135,412p
72,2`, `49 33,984 27,`, `179

72,249 3`, `3,984 27,179`, `x`, `A.`, `|`, `EAD`, `§`, `SEmpEm`, `§T`, `-_ar`, `ys`, `ww`, `_-`, `yyy`, `FF`, `J`, `|`, `!`, `\`, `yp`, `’`, `iY`, `ETN`, `\`, `ha)`, `v`, `LF`, `1`, `!`, `3`, `;`, `;`, `~~`, `or`, `rm`, `—`, `.`, `-`, `ey`, `Fy`, `SR`, `J`, `J`, `y`, `A`, `Vj`, `ZI`, `N`, `f`, `pam`, `|.`, `p/`, `d:`, `fl`, `i`, `-`, `oe`, `1
OC`, `):`, `LR`, `(4`, `0

or i a`, `:`, `Let`, `1`, `|`, `(2)`, `-`, `|`, `¢`, `454

a7 53067`, `72,249 33,984`, `27,179
2`, `)`, `TIGER]`, `(4`

Raw OCR text:
```text
total direct: y A Vj ZI N f
pam |. p/
d: fl i - oe 1
OC): LR (4 0
total candidate traces:
- trace 1 [pass1]: text="EA” 2g\n133,412\n72,249 33,984 27,179" numbers=133412, 72249, 33984, 27179
- trace 2 [pass1]: text="135,412p\n72,249 33,984 27,179" numbers=135412, 72249, 33984, 27179
- trace 3 [pass1]: text="72,249 33,984 27,179\nx A. | EAD" numbers=72249, 33984, 27179
- trace 4 [pass1]: text="§ SEmpEm §T -_ar ys ww _- yyy FF\nJ | ! \\ yp ’ iY ETN \\ ha) v\nLF 1 ! 3 ;\n; ~~ or rm\n— . - ey Fy SR J J" numbers=(none)
- trace 5 [pass1]: text="y A Vj ZI N f\npam |. p/\nd: fl i - oe 1\nOC): LR (4 0" numbers=(none)
- trace 6 [pass1]: text="or i a: Let 1 |\n(2) - | ¢ 454" numbers=(none)
- trace 7 [pass1]: text="a7 53067" numbers=53067
members: 72,249 33,984 27,179
2) TIGER] (4
```

## Implementation Notes

- Raw text/fragments can be captured safely in the runner without production changes.
- Current token data can prove whether a complete value was observed, but may still miss visual fragments if Tesseract drops them before returning text.
- Production digit-drop recovery should wait for exact equation support plus either clean total candidates or total-fragment token evidence.

## Recommendation

Continue with audit-only reporting. Do not implement production digit-drop recovery until multiple no-known replays show unique raw-member triplets and total-fragment support.
