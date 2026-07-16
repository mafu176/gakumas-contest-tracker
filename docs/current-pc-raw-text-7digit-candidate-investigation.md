# Current-PC Raw Text 7-Digit Candidate Investigation

This investigation follows `docs/current-pc-remaining-7digit-member-failures.md` and focuses only on the four remaining cases classified as `raw-text-exact-digits-unparsed`.

Scope:

- current-PC only
- investigation/docs only
- no final OCR output changes
- no production recovery
- no filename-specific or screenshot-specific logic
- no near-match guessing

## Summary

- raw-text exact 7-digit unparsed records: 4
- affected stage/side rows: 4
- all are Stage3 rows
- exact expected 7-digit digits appear in OCR text, but not as accepted parsed member candidates
- new runner-only simulation added: no
- productionization recommendation: no

The common surface is adjacent OCR text merging. The exact expected 7-digit digits are visible only after reading across punctuation/spacing/adjacent member boundaries, but the current parser correctly avoids treating those merged strings as safe candidates.

## Case Details

| screenshot | stage/side | expected 7-digit member | expected members | expected bonus | expected total | selected members | selected bonus | selected total | raw text containing digits | parser failure shape |
| --- | --- | ---: | --- | ---: | ---: | --- | ---: | ---: | --- | --- |
| `2026-07-11_223714046.png` | S3 self | 1237121 | `795562 / 1237121 / 1256926` | 251385 | 3540994 | `795562 / 25138 / 0` | 0 | 3540994 | `795,5621,237,121,256,92 ... +25138` | exact digits for member2 are embedded in a merged member-row run; member3 is not independently captured cleanly. |
| `2026-07-11_223753187.png` | S3 self | 1072082 | `1072082 / 820114 / 923776` | 214416 | 3030388 | `820114 / 923776 / 214416` | 0 | 1958306 | `1.072,082820,114 923,776 ... +214416` | member1 and member2 are concatenated; punctuation makes `1072082` visually present but not a clean token. |
| `2026-07-11_223834078.png` | S3 enemy | 1017535 | `1017535 / 580090 / 905641` | 0 | 2503266 | `580090 / 905641 / 0` | 0 | 2503266 | `1.017,535580,090 905,641` | member1 and member2 are concatenated; current OCR also surfaces total-like candidates, so role separation matters. |
| `スクリーンショット 2026-07-14 061325391.png` | S3 self | 1033971 | `1033971 / 1191935 / 883071` | 238387 | 3347364 | `191935 / 883071 / 738387` | 0 | 1813393 | `1.033,971.,191,935 883,071 ... + 738387` | member1 digits are present in raw text, but member2 is also affected and bonus is OCR-confused as member3. |

## Per-Case Evidence

### 2026-07-11_223714046.png S3 Self

- expected members: `795562 / 1237121 / 1256926`
- expected bonus: `251385`
- expected total: `3540994`
- selected members: `795562 / 25138 / 0`
- selected total: `3540994`
- raw candidates: `3540994, 795562, 25138`
- displayed total evidence: `3540994`
- raw member text: `-r F Sm TUE rF & & Tui 795,5621,237,121,256,92 Psi +25138 5 . ¢ | .-`
- total trace text includes: `... 3,540,994n TOR REZ1. 237.1711. 256 O92`

Why parsing failed:

- `1237121` is not a separate token; it appears inside the merged string `795,5621,237,121,256,92`.
- The nearby text also contains member3-like digits and a truncated bonus-like `+25138`.
- The row needs at least two member repairs plus bonus recovery, so a narrow single-candidate extraction simulation would not produce a unique exact interpretation.

Classification: adjacent OCR text merged with digits; multi-member and bonus ambiguity.

### 2026-07-11_223753187.png S3 Self

- expected members: `1072082 / 820114 / 923776`
- expected bonus: `214416`
- expected total: `3030388`
- selected members: `820114 / 923776 / 214416`
- selected total: `1958306`
- raw candidates: `3030388, 20114, 820114, 923776, 214416`
- displayed total evidence: `3030388`
- raw member text: `1.072,082820,114 923,776 raf +214416 ys fi AF " ahaa , Nv PE. .- bar. Agilgh” gp 3`
- total trace text includes: `... 1072082820114 923 T76`

Why parsing failed:

- The exact digits `1072082` are present, but they are attached to member2 as `1.072,082820,114`.
- The source is member-row and total-trace text, but not a clean grouped numeric token.
- A parser that scans arbitrary 7-digit windows could recover this value, but would also create many competing candidates from adjacent member concatenations.

Classification: punctuation-split 7-digit member attached to adjacent member digits.

### 2026-07-11_223834078.png S3 Enemy

- expected members: `1017535 / 580090 / 905641`
- expected bonus: `0`
- expected total: `2503266`
- selected members: `580090 / 905641 / 0`
- selected total: `2503266`
- raw candidates: `2503286, 2503266, 535580, 580090, 905641`
- displayed total evidence: `2503286, 2503266, 535580`
- raw member text: `ey a NF Fp WFP 1.017,535580,090 905,641 a x, di )`
- total trace text includes: `... 1. 017. 535580 090 905.641`

Why parsing failed:

- The exact digits `1017535` appear only across `1.017,535580,090`.
- The parser sees a valid low candidate `535580` from the same merged area and correctly avoids extracting arbitrary windows.
- The selected total is correct, so a recovery could be equation-valid, but the extraction step is not yet safe enough.

Classification: punctuation-split 7-digit member attached to adjacent member digits; two-member/blank selected row.

### スクリーンショット 2026-07-14 061325391.png S3 Self

- expected members: `1033971 / 1191935 / 883071`
- expected bonus: `238387`
- expected total: `3347364`
- selected members: `191935 / 883071 / 738387`
- selected total: `1813393`
- raw candidates: `3347364, 3547, 191935, 883071, 738387`
- displayed total evidence: `3347364`
- raw member text: `1.033,971.,191,935 883,071 SN i + 738387 § fie. i & A ig -~ ] v 'S of = Fam +o 3 Wd`
- total trace text includes: `... 1 013.991.191.938 B83 071`

Why parsing failed:

- `1033971` is visible in the raw member text as `1.033,971`, but the following punctuation and adjacent `191,935` confuse token boundaries.
- The second expected 7-digit member, `1191935`, is also not cleanly parsed.
- The selected member3 is a bonus-confused `738387` instead of expected bonus `238387`.
- A candidate extractor for only the first 7-digit value would not repair the row; the row needs multi-value reconstruction and safer bonus evidence.

Classification: punctuation-split exact member plus multi-member displacement and bonus confusion.

## Parser-Failure Categories

| category | cases | count | safe candidate extraction? |
| --- | --- | ---: | --- |
| adjacent OCR text merged with digits | all four | 4 | not yet; arbitrary windows would create competing values |
| punctuation-split 7-digit value | `223753187`, `223834078`, `061325391` | 3 | promising for diagnostics, unsafe for selection |
| multiple member values concatenated in one text run | all four | 4 | needs geometry/token boundary evidence |
| total/member trace source not candidateized as member | `223753187`, `223834078` | 2 | unsafe without source-role and ROI guards |
| bonus/member displacement also present | `223714046`, `061325391` | 2 | blocked until bonus evidence improves |
| two 7-digit members affected | `223714046`, `061325391` | 2 | not a narrow single-candidate pattern |

## Simulation Decision

No runner-only simulation was added.

The four cases share a textual symptom, but they do not satisfy the requested simulation bar:

- at least 2 confirmed positives: yes
- exact 7-digit value exists in raw or normalized text: yes
- reliable source/ROI provenance: partial; member-row text exists, but token boundaries are merged
- extraction does not broaden unsafe OCR noise: no
- exact total evidence exists: yes
- exact bonus evidence exists when needed: not consistently; two cases include bonus confusion
- selected/reconstructable members are exact: no for the multi-member rows
- exact equation validates the whole proposal: not uniquely from extracted candidates
- unique interpretation: no
- zero false positives across all 48 fixtures: not testable without broad unsafe extraction

## Overlap With Existing Recoveries

- `currentPcGroupedRawTokenRecovery` already handles strict punctuation/space grouped tokens when a full unique equation is available.
- `applyCurrentPcStage3SevenDigitBonusDisplacementRecovery` already handles the safer Stage3 displacement shape with exact member/member/member/bonus/total evidence.
- These four rows fall outside both recoveries because the exact 7-digit value is not a clean parsed/grouped token, or the row also needs bonus/multiple-member reconstruction.

## Recommendation

Do not productionize raw-text 7-digit extraction yet.

Recommended next step:

1. Add runner-only token-boundary diagnostics for merged Stage3 member-row text.
2. Report candidate windows only when they align with visual/ROI member-slot boundaries.
3. Keep arbitrary sliding-window 7-digit extraction audit-only until it has geometry-backed boundaries and a zero-FP report across all 48 current-PC fixtures.

The highest-value future experiment is not recovery, but evidence capture: split merged member-row text into slot-aligned candidate spans before feeding candidate selection.

