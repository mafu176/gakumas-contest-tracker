# iPad Browser-Native OCR Baseline

## Scope

This report establishes the real browser OCR path as the source of truth for iPad diagnostics.

The command is diagnostic-only:

```bash
node scripts/ipad-browser-native-baseline.mjs
```

It launches the actual application with `?ipadArithmeticDebug=1`, uploads every image from `regression-test/ipad/`, exports browser diagnostics, compares against `regression-test/expected-ipad/`, and writes artifacts under:

```bash
tmp/ipad-browser-native-baseline/
```

No iPad Tier C proposal is applied to displayed OCR output. No iPad production recovery is enabled.

## Architecture Decision

The previous runner/browser-equivalent iPad parity remains useful, but it is no longer treated as authoritative for production feasibility.

Current classification:

- Node/Sharp baseline: offline diagnostic and architecture/unit test
- runner candidate-selection simulation: offline candidate-quality diagnostic
- arithmetic/Tier C simulation: offline selector-unit diagnostic
- runner/browser-equivalent parity: shared-helper parity test using runner-generated candidate evidence
- browser-native baseline: authoritative evidence for real browser OCR feasibility

The reason is documented in `docs/ipad-runner-browser-candidate-mismatch-investigation.md`: ROI geometry can now match, but Canvas/browser preprocessing plus browser Tesseract output still diverges from Sharp/Node preprocessing plus Node Tesseract output.

## Automation

The browser-native baseline script:

- starts the app on a configurable local port unless `--base-url` is supplied
- opens Chromium through Playwright
- uses `?ipadArithmeticDebug=1`
- uploads all 18 fixtures
- executes real browser image decode, Canvas preprocessing, and browser OCR
- exports browser diagnostics JSON
- scores primary output, candidate-pool upper bound, and an isolated Tier C simulation
- repeats in fresh browser contexts for stability

Useful options:

```bash
node scripts/ipad-browser-native-baseline.mjs --runs 2
node scripts/ipad-browser-native-baseline.mjs --runs 2 --resume
node scripts/ipad-browser-native-baseline.mjs --base-url http://127.0.0.1:3000
```

`--resume` reuses completed `image-result.json` artifacts and processes only missing images.

## Fixture Coverage

Latest run:

| metric | count |
| --- | ---: |
| browser runs | 2 |
| images per run | 18 |
| stages per run | 54 |
| stage/sides per run | 108 |
| member fields per run | 324 |
| bonus fields per run | 108 |
| total fields per run | 108 |
| total numeric fields per run | 540 |

Cluster coverage:

| cluster | images |
| --- | ---: |
| ipad-01 | 13 |
| ipad-02 | 5 |

## Browser Primary Baseline

Browser primary means the current browser-selected values from real browser candidate pools. Tier C proposals are not applied.

| level | PASS | FAIL | accuracy |
| --- | ---: | ---: | ---: |
| image | 0 / 18 | 18 | 0.0% |
| stage | 1 / 54 | 53 | 1.9% |
| stage/side | 16 / 108 | 92 | 14.8% |
| all fields | 293 / 540 | 247 | 54.3% |

Position breakdown:

| position | PASS | FAIL | accuracy |
| --- | ---: | ---: | ---: |
| Stage1 self | 2 / 18 | 16 | 11.1% |
| Stage1 enemy | 7 / 18 | 11 | 38.9% |
| Stage2 self | 3 / 18 | 15 | 16.7% |
| Stage2 enemy | 4 / 18 | 14 | 22.2% |
| Stage3 self | 0 / 18 | 18 | 0.0% |
| Stage3 enemy | 0 / 18 | 18 | 0.0% |

Field accuracy:

| field | exact | total | accuracy |
| --- | ---: | ---: | ---: |
| member1 | 71 | 108 | 65.7% |
| member2 | 34 | 108 | 31.5% |
| member3 | 72 | 108 | 66.7% |
| all 3 members | 33 | 108 | 30.6% |
| bonus | 62 | 108 | 57.4% |
| total | 54 | 108 | 50.0% |

OCR field quality:

| metric | count |
| --- | ---: |
| empty OCR fields | 2 |
| fields with numeric candidates | 521 / 540 |

## Candidate-Pool Upper Bound

This is evaluation-only. Expected values are used after browser candidate generation for scoring only.

Observed-only upper bound does not count schema-default zero as OCR evidence. Selectable upper bound permits default zero only where the existing Tier C rules permit it for bonus.

| field group | observed present | selectable present | empty pools |
| --- | ---: | ---: | ---: |
| members | 184 / 324 (56.8%) | 184 / 324 (56.8%) | 16 |
| bonus | 51 / 108 (47.2%) | 90 / 108 (83.3%) | 3 |
| total | 68 / 108 (63.0%) | 68 / 108 (63.0%) | 0 |
| all fields | 303 / 540 (56.1%) | 342 / 540 (63.3%) | 19 |

Candidate count:

| metric | value |
| --- | ---: |
| average candidates per field | 2.72 |
| median candidates per field | 2 |
| max candidates per field | 6 |

Cluster upper bound:

| cluster | observed present | selectable present | empty pools |
| --- | ---: | ---: | ---: |
| ipad-01 | 226 / 390 (57.9%) | 258 / 390 (66.2%) | 7 |
| ipad-02 | 77 / 150 (51.3%) | 84 / 150 (56.0%) | 12 |

## Browser Tier C Simulation

Tier C was run only against real browser candidate pools.

Preserved rules:

- observed numeric candidates for members and totals
- observed bonus candidates
- schema-default zero only for bonus under the documented conditions
- exactly one distinct arithmetic-valid tuple
- complete bounded enumeration
- atomic side replacement
- no crown or cross-side evidence
- no displayed OCR mutation

Result:

| metric | count |
| --- | ---: |
| stage/sides | 108 |
| eligible sides | 15 |
| valid unique sides | 15 |
| wouldApply | 9 |
| changed proposals | 9 |
| already identical | 0 |
| TP | 9 |
| FP | 0 |
| partially improving | 9 |
| partially regressing | 0 |
| existing PASS sides lost | 0 |
| net stage/side gain | 9 |
| field gains | 9 |
| field regressions | 0 |

Position breakdown:

| position | eligible | wouldApply | TP | FP |
| --- | ---: | ---: | ---: | ---: |
| Stage1 self | 2 | 2 | 2 | 0 |
| Stage1 enemy | 5 | 2 | 2 | 0 |
| Stage2 self | 6 | 4 | 4 | 0 |
| Stage2 enemy | 2 | 1 | 1 | 0 |
| Stage3 self | 0 | 0 | 0 | 0 |
| Stage3 enemy | 0 | 0 | 0 | 0 |

Changed proposals:

| image | stage | side | changed field | current | proposal |
| --- | ---: | --- | --- | --- | --- |
| IMG_0264.png | 1 | enemy | bonus | `185265 / 220680 / 126490 + 5 = 532435` | `185265 / 220680 / 126490 + 0 = 532435` |
| IMG_0264.png | 2 | self | total | `190770 / 436081 / 82001 + 87216 = 796` | `190770 / 436081 / 82001 + 87216 = 796068` |
| IMG_0270.png | 2 | self | member2 | `100447 / 7206833 / 82452 + 41366 = 431098` | `100447 / 206833 / 82452 + 41366 = 431098` |
| IMG_0306.png | 1 | self | member2 | `618445 / 5279371 / 122804 + 123689 = 1144309` | `618445 / 279371 / 122804 + 123689 = 1144309` |
| IMG_0306.png | 1 | enemy | total | `169592 / 184405 / 96881 + 0 = 450` | `169592 / 184405 / 96881 + 0 = 450878` |
| IMG_0317.png | 2 | self | member2 | `193311 / 5 / 54603 + 38662 = 342939` | `193311 / 56363 / 54603 + 38662 = 342939` |
| IMG_0322.png | 2 | self | member2 | `130472 / 2 / 62766 + 26094 = 251534` | `130472 / 32202 / 62766 + 26094 = 251534` |
| IMG_0337.png | 2 | enemy | member2 | `114779 / 0 / 157738 + 44062 = 536892` | `114779 / 220313 / 157738 + 44062 = 536892` |
| IMG_0491.png | 1 | self | bonus | `133870 / 215059 / 382105 + 0 = 807455` | `133870 / 215059 / 382105 + 76421 = 807455` |

## Simulated Aggregate After Browser Tier C

Tier C proposals are applied only to an isolated simulated result object.

| level | primary | simulated | delta |
| --- | ---: | ---: | ---: |
| image PASS | 0 / 18 | 0 / 18 | +0 |
| stage PASS | 1 / 54 | 4 / 54 | +3 |
| stage/side PASS | 16 / 108 | 25 / 108 | +9 |
| all-field exact | 293 / 540 | 302 / 540 | +9 |

Field-level after simulation:

| field | primary | simulated | delta |
| --- | ---: | ---: | ---: |
| member1 | 71 / 108 | 71 / 108 | +0 |
| member2 | 34 / 108 | 39 / 108 | +5 |
| member3 | 72 / 108 | 72 / 108 | +0 |
| all 3 members | 33 / 108 | 38 / 108 | +5 |
| bonus | 62 / 108 | 64 / 108 | +2 |
| total | 54 / 108 | 56 / 108 | +2 |

## Stability Audit

Two fresh browser-context runs completed. Run 1 was fully generated before a timeout in an earlier two-run attempt; `--resume` reused completed artifacts and generated the missing run 2 images.

| stability check | result |
| --- | ---: |
| fields stable across all runs | 540 / 540 |
| fields with OCR variance | 0 |
| fields with candidate-pool variance | 0 |
| proposals stable across all runs | 108 / 108 |
| proposals appearing only in some runs | 0 |
| proposal value disagreements | 0 |
| TP by run | 9 / 9 |
| FP by run | 0 / 0 |

## UI Non-Application Audit

The diagnostic path did not write Tier C proposals into final OCR output.

| check | result |
| --- | ---: |
| output mutation findings | 0 |
| export/window JSON mismatches | 0 |
| proposalAppliedByThisPath | false for all runs |
| diagnosticsOnly | true for all runs |

## Errors And Timeouts

The full two-run command initially timed out after run 1 and the first 4 images of run 2 because full browser OCR is expensive. The resumed command completed the remaining images successfully.

Page errors: 0.

Console diagnostics include repeated Tesseract messages such as `Image too small to scale!!` and `Line cannot be recognized!!`. They are recorded under `tmp/ipad-browser-native-baseline/console-errors.json`. These are OCR-engine diagnostics on tiny crops, not page exceptions; the browser export completed for all images.

## Production Readiness

Browser-native Tier C evidence is materially stronger than the Node/Sharp proxy:

- FP is 0 in both browser runs
- all 9 changed proposals are stable across runs
- no existing PASS stage/side is lost
- UI output remains unaffected in diagnostic mode
- all proposal inputs come from browser-generated candidate pools

Recommendation: a future productionization review is justified for the browser-native Tier C selector. This task does not productionize it.

The likely next step is to add shared browser-path parity/proof documentation for the 9 stable proposals, then productionize only if the implementation can call the same helper without changing iPad candidate generation, iPad preprocessing, smartphone OCR, current-PC OCR, or legacy desktop OCR.
