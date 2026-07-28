# iPad Grouped-Number Parser Review

## Scope

This review covers only the T2 safe grouped-number parser for iPad member OCR candidate construction.

The production change is intentionally narrow:

- iPad mode only.
- Member fields only.
- Comma or period thousands-grouped tokens only, such as `333,611` and `1.137.669`.
- No bonus or total parsing changes.
- No ROI, preprocessing, ranking, Tier C semantics, smartphone, current-PC, or legacy desktop changes.
- No substring repair, digit repair, near-match, filename logic, or expected-driven behavior.

## Baseline Before Production

The authoritative browser production baseline was confirmed first:

| Metric | Baseline |
| --- | ---: |
| Images processed | 18 / 18 |
| Stage/side PASS | 25 / 108 |
| Tier C applications | 9 |
| Tier C TP / FP | 9 / 0 |

## Parser Grammar

The shared helper is `parseIpadGroupedNumberTokens`.

Accepted tokens must satisfy all of:

- one separator type, either comma or period;
- first group has 1-3 digits;
- every following group has exactly 3 digits;
- at least one separator;
- token is bounded by non-digit and non-comma/period characters;
- reconstructed value is a positive integer no larger than 9,999,999.

Rejected shapes include:

- malformed grouping such as `12,34` or `1,23,456`;
- mixed separators such as `123,456.789`;
- space grouping such as `1 234`;
- ungrouped digits such as `123456`;
- OCR slash/noise cases such as `1 / 1 / 6`.

The parser provenance is `ipad-grouped-number-token`, and the rollback switch is the internal constant `ENABLE_IPAD_GROUPED_NUMBER_MEMBER_TOKENS` in `app/lib/ocr.js`.

## Diagnostic Simulation

The dedicated diagnostic command is:

```bash
node scripts/ipad-grouped-number-parser-simulation.mjs --runs 2 --base-url http://127.0.0.1:3107
```

Artifacts are written to:

```text
tmp/ipad-grouped-number-parser-review/
```

The pre-production diagnostic run found:

| Metric | Result |
| --- | ---: |
| T2 candidates added | 30 |
| Fields affected | 29 |
| Expected candidate gains | 30 |
| Wrong candidate additions | 0 |
| Tier C FP | 0 |
| Existing PASS sides lost | 0 |
| Multiple valid tuple count | 0 |
| Readiness criteria | PASS |

By separator:

| Separator | Opportunities | Recoveries | Wrong |
| --- | ---: | ---: | ---: |
| Comma | 29 | 29 | 0 |
| Period | 1 | 1 | 0 |

By member slot:

| Slot | Recoveries | Wrong |
| --- | ---: | ---: |
| member1 | 0 | 0 |
| member2 | 29 | 0 |
| member3 | 1 | 0 |

By stage:

| Stage | Recoveries | Wrong |
| --- | ---: | ---: |
| Stage1 | 14 | 0 |
| Stage2 | 16 | 0 |
| Stage3 | 0 | 0 |

The two-run stability checks were stable for grouped strings, reconstructed candidates, wrong candidates, Tier C output, and summary stats.

Candidate-cap review found no unsafe expansion:

- candidate-cap findings reviewed: 37
- fields exceeding cap after T2: 0
- truncated pools with T2 additions: 0
- max expanded candidate count: 6

## Production Integration

Production integration adds T2 evidence in `buildIpadArithmeticFieldCandidatePool` after normal OCR candidate parsing and before Tier C evaluation.

The added candidate:

- is only created for `fieldType === "member"`;
- keeps the current primary selection unchanged by using `profileIds: ["ipad-grouped-number-token"]`, which is not a primary-priority profile;
- records source profile, raw token, separator, groups, context, and rule version in provenance;
- is then available to the existing iPad Tier C exactly-one arithmetic selector.

No displayed OCR value changes unless the existing Tier C selector finds one exact arithmetic interpretation.

## Production Verification

The real browser production verification command is:

```bash
node scripts/ipad-browser-production-verification.mjs --runs 2 --base-url http://127.0.0.1:3107
```

The final production result was stable across two runs:

| Metric | Before | After |
| --- | ---: | ---: |
| Stage/side PASS | 25 / 108 | 40 / 108 |
| Stage PASS | 4 / 54 | 8 / 54 |
| Image PASS | 0 / 18 | 0 / 18 |
| Production applications | 9 | 24 |
| TP / FP | 9 / 0 | 24 / 0 |
| Stable application rows | 9 | 24 |

The production run recovered one more exact TP than the pre-production simulation estimate. The final browser-native production result is authoritative for the production path: 24 applications, 24 TP, 0 FP, and no unstable rows.

Known browser console OCR warnings remained limited to pre-existing tiny crop warnings such as `Image too small to scale!! (2x36 vs min width of 3)` and `Line cannot be recognized!!`.

## Safety

Confirmed unchanged:

- smartphone PASS controls: `IMG_9311`, `IMG_9321`, `IMG_9329`
- known smartphone failures: `IMG_9308`, `IMG_9310`, `IMG_9319`
- current-PC representative controls
- legacy desktop `pc-rehearsal-bonus-member-shift.png`

The iPad expected fixture arithmetic and crown rule validation remains clean for all 18 fixtures.

## Recommendation

T2 grouped-number parsing is production-ready and now enabled for iPad member candidate construction only. The next iPad work should focus on remaining recognition/capture failures, especially Stage3, because this parser did not add Stage3 recoveries.
