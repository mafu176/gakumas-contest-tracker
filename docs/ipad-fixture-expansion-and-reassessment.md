# iPad Fixture Expansion and Reassessment

Status: fixture/data expansion only. Production OCR behavior was not changed.

## Final Expansion Scope

This pass completed the remaining 10 readable pending iPad screenshots from the `ipad-01` layout family. The readable iPad fixture inventory is now fully fixture-backed:

| metric | count |
| --- | ---: |
| readable source screenshots | 84 |
| complete expected fixtures | 84 |
| pending readable screenshots | 0 |
| `ipad-01` complete | 64 |
| `ipad-02` complete | 20 |

All 10 final-pass screenshots are 1668x2420 portrait images from:

```text
C:\Users\gkhay\Pictures\DMMGamePlayer\ipad
```

The source screenshots were copied into `regression-test/ipad/`, and manually verified expected fixtures were added under `regression-test/expected-ipad/`.

## Pending Inventory Before This Pass

| image | dimensions | cluster | prior status | reason |
| --- | --- | --- | --- | --- |
| IMG_0321.png | 1668x2420 | ipad-01 | pending | manual transcription pending; content-near-duplicate review required |
| IMG_0350.png | 1668x2420 | ipad-01 | pending | manual transcription pending |
| IMG_0351.png | 1668x2420 | ipad-01 | pending | manual transcription pending |
| IMG_0353.png | 1668x2420 | ipad-01 | pending | manual transcription pending |
| IMG_0354.png | 1668x2420 | ipad-01 | pending | manual transcription pending |
| IMG_0355.png | 1668x2420 | ipad-01 | pending | manual transcription pending |
| IMG_0356.png | 1668x2420 | ipad-01 | pending | manual transcription pending |
| IMG_0357.png | 1668x2420 | ipad-01 | pending | manual transcription pending |
| IMG_0358.png | 1668x2420 | ipad-01 | pending | manual transcription pending |
| IMG_0359.png | 1668x2420 | ipad-01 | pending | manual transcription pending |

Exact duplicate check found 0 exact duplicate groups. `IMG_0321.png` is not an exact file duplicate, but it is a content-near-duplicate of `IMG_0320.png`: the numerical result screen is the same while incidental visual/card presentation differs. It is included as a fixture, but it should not be counted as independent structural evidence in future generalization analysis.

Generated audit artifacts were saved under:

```text
tmp/ipad-fixture-expansion-final/
```

These artifacts are generated diagnostics and were not committed.

## Expected Fixtures Added

All expected values were read from the source screenshots, then checked by arithmetic and the confirmed crown-bonus rule:

```text
crownBonus = floor(max(all six raw member scores in the stage) * 0.20)
```

| image | stage | self members | self bonus | self total | enemy members | enemy bonus | enemy total |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: |
| IMG_0321.png | 1 | 298058 / 88866 / 122217 | 59611 | 568752 | 67329 / 41829 / 19985 | 0 | 129143 |
| IMG_0321.png | 2 | 109120 / 175972 / 79382 | 35194 | 399668 | 45722 / 15870 / 20211 | 0 | 81803 |
| IMG_0321.png | 3 | 711990 / 594103 / 481896 | 142398 | 1930387 | 19494 / 18841 / 7785 | 0 | 46120 |
| IMG_0350.png | 1 | 307636 / 50410 / 122991 | 61527 | 542564 | 251604 / 163989 / 265495 | 0 | 681088 |
| IMG_0350.png | 2 | 191028 / 44394 / 69947 | 38205 | 343574 | 62586 / 17783 / 29798 | 0 | 110167 |
| IMG_0350.png | 3 | 516288 / 597959 / 440176 | 119591 | 1674014 | 366040 / 327321 / 514380 | 0 | 1207741 |
| IMG_0351.png | 1 | 281234 / 231850 / 164227 | 56246 | 733557 | 81601 / 198533 / 68982 | 0 | 349116 |
| IMG_0351.png | 2 | 151272 / 97706 / 40911 | 30254 | 320143 | 38528 / 36429 / 41774 | 0 | 116731 |
| IMG_0351.png | 3 | 707063 / 560380 / 622292 | 141412 | 2031147 | 45673 / 42782 / 25186 | 0 | 113641 |
| IMG_0353.png | 1 | 240310 / 47753 / 108089 | 48062 | 444214 | 216688 / 179711 / 220230 | 0 | 616629 |
| IMG_0353.png | 2 | 55345 / 288033 / 60241 | 57606 | 461225 | 132914 / 161080 / 99665 | 0 | 393659 |
| IMG_0353.png | 3 | 833451 / 672718 / 150951 | 166690 | 1823810 | 167082 / 26071 / 5938 | 0 | 199091 |
| IMG_0354.png | 1 | 256851 / 96354 / 154906 | 51370 | 559481 | 82993 / 51397 / 203327 | 0 | 337717 |
| IMG_0354.png | 2 | 114498 / 262503 / 65499 | 52500 | 495000 | 94505 / 116953 / 100764 | 0 | 312222 |
| IMG_0354.png | 3 | 685267 / 738284 / 719036 | 147656 | 2290243 | 450523 / 37828 / 55359 | 0 | 543710 |
| IMG_0355.png | 1 | 95850 / 261366 / 169529 | 52273 | 579018 | 165002 / 57665 / 97951 | 0 | 320618 |
| IMG_0355.png | 2 | 184270 / 89281 / 16085 | 36854 | 326490 | 16457 / 50880 / 145093 | 0 | 212430 |
| IMG_0355.png | 3 | 619705 / 661238 / 418631 | 132247 | 1831821 | 205446 / 348870 / 417186 | 0 | 971502 |
| IMG_0356.png | 1 | 96589 / 99732 / 216398 | 43279 | 455998 | 57402 / 42815 / 117253 | 0 | 217470 |
| IMG_0356.png | 2 | 153418 / 161613 / 36555 | 32322 | 383908 | 39945 / 57005 / 19960 | 0 | 116910 |
| IMG_0356.png | 3 | 425869 / 787379 / 104976 | 157475 | 1475699 | 41315 / 51630 / 14889 | 0 | 107834 |
| IMG_0357.png | 1 | 310569 / 72196 / 136309 | 62113 | 581187 | 45178 / 36849 / 24795 | 0 | 106822 |
| IMG_0357.png | 2 | 220565 / 190363 / 45636 | 44113 | 500677 | 40871 / 92325 / 8572 | 0 | 141768 |
| IMG_0357.png | 3 | 185117 / 547189 / 235622 | 109437 | 1077365 | 324068 / 39997 / 69806 | 0 | 433871 |
| IMG_0358.png | 1 | 196455 / 159387 / 123364 | 0 | 479206 | 94271 / 53804 / 294168 | 58833 | 501076 |
| IMG_0358.png | 2 | 170075 / 80555 / 48845 | 0 | 299475 | 205569 / 176374 / 112077 | 41113 | 535133 |
| IMG_0358.png | 3 | 379358 / 720559 / 265018 | 144111 | 1509046 | 119967 / 296362 / 628167 | 0 | 1044496 |
| IMG_0359.png | 1 | 199523 / 44064 / 90303 | 39904 | 373794 | 59495 / 99480 / 179340 | 0 | 338315 |
| IMG_0359.png | 2 | 148314 / 105288 / 76336 | 0 | 329938 | 109453 / 149972 / 136120 | 29994 | 425539 |
| IMG_0359.png | 3 | 954656 / 624148 / 360853 | 190931 | 2130588 | 163290 / 405531 / 318593 | 0 | 887414 |

## Expected Validation

Command:

```powershell
node scripts/ocr-test-images.mjs --validate-ipad-expected
```

Result:

| metric | result |
| --- | ---: |
| complete fixtures | 84 |
| incomplete fixtures | 0 |
| stages checked | 252 |
| stage/sides checked | 504 |
| arithmetic | PASS |
| crown rule | PASS |

## Final 10-Image Browser Production Baseline

Command:

```powershell
$env:PLAYWRIGHT_NODE_MODULES='C:\Users\gkhay\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node scripts/ipad-browser-expanded-baseline.mjs --runs 1 --only IMG_0321,IMG_0350,IMG_0351,IMG_0353,IMG_0354,IMG_0355,IMG_0356,IMG_0357,IMG_0358,IMG_0359
```

Result:

| metric | count |
| --- | ---: |
| images PASS / FAIL | 0 / 10 |
| stages PASS / FAIL | 12 / 18 |
| stage/sides PASS / FAIL | 29 / 31 |
| recovery applications | 15 |
| recovery TP / FP | 15 / 0 |
| Tier C TP / FP | 10 / 0 |
| strict-total TP / FP | 1 / 0 |
| strict-member2 TP / FP | 4 / 0 |

The script's `unexpectedApplications` field listed `IMG_0357.png` S2 enemy because the historical expected-application registry did not know the new final-pass fixture yet. Direct comparison against the newly added expected fixture confirms it is an exact TP: total `141768`.

## Per-Image Result

| image | image result | stage pass | stage/side pass | existing production recoveries applied |
| --- | --- | ---: | ---: | --- |
| IMG_0321.png | FAIL | 1 / 3 | 2 / 6 | Tier C S2 self |
| IMG_0350.png | FAIL | 1 / 3 | 2 / 6 | strict-member2 S1 self |
| IMG_0351.png | FAIL | 2 / 3 | 4 / 6 | Tier C S1 self, Tier C S2 self, strict-member2 S2 enemy |
| IMG_0353.png | FAIL | 2 / 3 | 4 / 6 | Tier C S1 self, strict-member2 S2 enemy |
| IMG_0354.png | FAIL | 1 / 3 | 3 / 6 | none |
| IMG_0355.png | FAIL | 1 / 3 | 3 / 6 | none |
| IMG_0356.png | FAIL | 1 / 3 | 2 / 6 | strict-member2 S2 enemy |
| IMG_0357.png | FAIL | 2 / 3 | 4 / 6 | Tier C S1 self, Tier C S2 self, strict-total S2 enemy |
| IMG_0358.png | FAIL | 1 / 3 | 3 / 6 | Tier C S1 self, Tier C S1 enemy, Tier C S2 enemy |
| IMG_0359.png | FAIL | 0 / 3 | 2 / 6 | Tier C S1 self |

## Field And Position Summary

Final 10-image field exactness:

| field | pass / total |
| --- | ---: |
| member1 | 38 / 60 |
| member2 | 37 / 60 |
| member3 | 40 / 60 |
| bonus | 43 / 60 |
| total | 36 / 60 |

Stage/side position summary:

| position | PASS | FAIL |
| --- | ---: | ---: |
| Stage1 self | 6 | 4 |
| Stage1 enemy | 7 | 3 |
| Stage2 self | 7 | 3 |
| Stage2 enemy | 9 | 1 |
| Stage3 self | 0 | 10 |
| Stage3 enemy | 0 | 10 |

Wrong-field histogram across failing stage/sides:

| wrong fields in row | rows |
| ---: | ---: |
| 1 | 7 |
| 2 | 1 |
| 3 | 3 |
| 4 | 12 |
| 5 | 8 |

One-field-away rows:

| image | stage | side | field | expected | actual |
| --- | ---: | --- | --- | ---: | ---: |
| IMG_0321.png | 1 | self | bonus | 59611 | 1 |
| IMG_0321.png | 1 | enemy | bonus | 0 | 3 |
| IMG_0350.png | 2 | self | total | 343574 | 343 |
| IMG_0350.png | 2 | enemy | bonus | 0 | 4 |
| IMG_0355.png | 1 | self | bonus | 52273 | 0 |
| IMG_0356.png | 1 | self | bonus | 43279 | 0 |
| IMG_0359.png | 1 | enemy | member1 | 59495 | 99495 |

Candidate-level evidence for these one-field-away failures was not re-audited in this fixture-intake task. The next reassessment should decide whether any of these rows have exact observed evidence before proposing a new recovery.

## Stage3 Summary

Stage3 remains the dominant failure surface in this final batch:

| metric | count |
| --- | ---: |
| Stage3 stage/sides | 20 |
| Stage3 stage/side PASS | 0 |
| Stage3 stage/side FAIL | 20 |
| Stage3 one-field-away rows | 0 |

The observed Stage3 failures mostly match existing known iPad recognition/candidate-capture shapes: severe member truncation, collapsed 6-digit values into rank/noise fragments, missing totals, and occasional bonus/total confusion. No new production-safe structural recovery shape is established by this fixture-only pass.

## Combined 84-Fixture Baseline

Conservative combined baseline after this final pass, using the prior 74-fixture browser baseline plus the final 10-image browser run:

| metric | result |
| --- | ---: |
| images PASS / total | 0 / 84 |
| stages PASS / total | 88 / 252 |
| stage/sides PASS / total | 248 / 504 |
| production recovery TP / FP | 155 / 0 |
| Tier C TP / FP | 97 / 0 |
| strict-total TP / FP | 18 / 0 |
| strict-member2 TP / FP | 40 / 0 |

Recovery generalization by fixture generation:

| fixture generation | fixtures | recovery TP / FP | Tier C | strict-total | strict-member2 |
| --- | ---: | ---: | ---: | ---: | ---: |
| original selected set | 53 | 119 / 0 | 72 | 15 | 32 |
| expansion batch 1 | 10 | 8 / 0 | 3 | 2 | 3 |
| expansion batch 2 | 11 | 13 / 0 | 12 | 0 | 1 |
| final expansion pass | 10 | 15 / 0 | 10 | 1 | 4 |
| combined | 84 | 155 / 0 | 97 | 18 | 40 |

The existing production recoveries continue to generalize without observed false positives in the final batch.

## Structural Assessment

Confirmed recurring clusters in the final batch:

- Stage1/Stage2 member2 correction remains useful, especially where grouped-number token evidence is present.
- Strict-total selection still has occasional value when the selected members are already correct and the displayed total candidate is exact.
- Bonus capture remains uneven: one-field-away rows include missing positive bonus and false tiny bonus values.
- Stage3 remains broad recognition/candidate-capture failure rather than a clean selection-only problem.

No genuinely new safe structural shape was found. This pass primarily reinforces the prior conclusion: the next high-leverage work should reassess the expanded 84-fixture dataset globally, then prioritize Stage3 recognition/candidate capture rather than adding another narrow rule immediately.

## Safety Validation

| check | result |
| --- | --- |
| smartphone PASS controls: `IMG_9311 IMG_9321 IMG_9329` | PASS, 3 / 3 |
| smartphone known failures: `IMG_9308 IMG_9310 IMG_9319` | unchanged expected failures, 3 / 3 failed |
| current-PC representative: `--current-pc-baseline 144932916` | PASS |
| legacy desktop representative: `pc-rehearsal-bonus-member-shift.png` | PASS |
| `npm run build` | PASS |

Generated tracked OCR reports were restored before commit.

## Recommendation

Fixture expansion is complete for the 84 readable iPad screenshots. The recommended next task is a final expanded-dataset reassessment:

```text
FINAL IPAD OCR EXPANDED-DATASET REASSESSMENT
```

That reassessment should use the 84-fixture set as the new source of truth for prioritizing Stage3 capture work, bonus-capture weaknesses, and any remaining selection-only opportunities. RapidOCR remains closed as a production direction unless a separate browser-deployable path is reopened with stronger parity and runtime evidence.
