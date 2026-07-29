# iPad Stage3 Member2 OCR Config Investigation

## Scope

This is a diagnostic-only browser-native investigation. It does not change production OCR output, iPad Tier C, T2 parsing, ROI geometry, preprocessing, candidate ranking, smartphone OCR, current-PC OCR, or legacy desktop OCR.

The experiment targets only iPad Stage3 `member2` recognition because the post-T2 failure analysis showed:

- iPad production stage/side accuracy: 40 / 108
- Tier C applications: 24, TP 24, FP 0
- Stage3 `member2` exact observed candidates: 0 / 36
- Stage3 recognition failures: 167 fields
- Estimated member2-only leverage from the post-T2 audit: up to 8 failing stage/sides

## Production Baseline

Before running the OCR config matrix, the production browser verification was rerun twice with `scripts/ipad-browser-production-verification.mjs --runs 2 --resume`.

| Metric | Run 1 | Run 2 |
| --- | ---: | ---: |
| Images processed | 18 / 18 | 18 / 18 |
| Stage/side PASS | 40 / 108 | 40 / 108 |
| Tier C applications | 24 | 24 |
| TP | 24 | 24 |
| FP | 0 | 0 |
| Stable applications | 24 / 24 | 24 / 24 |

The authoritative production baseline is unchanged.

## Diagnostic Command

```bash
node scripts/ipad-stage3-member2-ocr-config-investigation.mjs --runs 2
```

Artifacts are written under:

```text
tmp/ipad-stage3-member2-ocr-config/
```

The script uses the real browser OCR path through Playwright and browser image decode. It freezes the current Stage3 member2 crop geometry and the current browser-native preprocessing input, then varies only Tesseract OCR configuration.

## Current OCR Config

The current production member OCR path uses Tesseract.js in the browser with English trained data and numeric-oriented parameters.

| Setting | Value |
| --- | --- |
| OCR library | `tesseract.js` |
| Version | `7.0.0` |
| Engine path | browser / Tesseract.js worker |
| Language | `eng` |
| Production PSM | `7` |
| Whitelist | `0123456789,.` |
| Preserve spaces | `1` |
| Numeric mode | not set |
| Primary member profiles | baseline score preprocess, invert-normalize, white-mask |
| Production candidate parsing | current parser plus existing T2 grouped-number parser |

The diagnostic script records raw OCR text, confidence, words, symbols, normalized candidates, T2 candidates, and runtime for every field/config/profile result.

## Config Matrix

| Config | PSM | Whitelist | Preserve Spaces | Numeric Mode |
| --- | ---: | --- | ---: | --- |
| production-psm7-digits-punctuation-preserve | 7 | digits + comma/period | 1 | off |
| psm6-digits-punctuation-preserve | 6 | digits + comma/period | 1 | off |
| psm8-digits-punctuation-preserve | 8 | digits + comma/period | 1 | off |
| psm10-digits-punctuation-preserve | 10 | digits + comma/period | 1 | off |
| psm13-digits-punctuation-preserve | 13 | digits + comma/period | 1 | off |
| psm7-digits-only-preserve | 7 | digits only | 1 | off |
| psm7-digits-punctuation-no-preserve | 7 | digits + comma/period | 0 | off |
| psm7-digits-punctuation-numeric-mode | 7 | digits + comma/period | 1 | on |
| psm8-digits-only-preserve | 8 | digits only | 1 | off |

## Stage3 Member2 Results

Two fresh browser runs produced identical decision signatures.

| Config | Exact + T2 / 36 | New Exact Fields | Wrong Numeric Fields | Empty Fields | Avg Candidates | Avg Runtime |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| production-psm7-digits-punctuation-preserve | 0 | 0 | 0 | 36 | 0.00 | 108 ms |
| psm6-digits-punctuation-preserve | 0 | 0 | 36 | 0 | 3.72 | 233 ms |
| psm8-digits-punctuation-preserve | 0 | 0 | 0 | 36 | 0.00 | 85 ms |
| psm10-digits-punctuation-preserve | 0 | 0 | 0 | 36 | 0.00 | 84 ms |
| psm13-digits-punctuation-preserve | 0 | 0 | 0 | 36 | 0.00 | 84 ms |
| psm7-digits-only-preserve | 0 | 0 | 0 | 36 | 0.00 | 85 ms |
| psm7-digits-punctuation-no-preserve | 0 | 0 | 0 | 36 | 0.00 | 84 ms |
| psm7-digits-punctuation-numeric-mode | 0 | 0 | 0 | 36 | 0.00 | 84 ms |
| psm8-digits-only-preserve | 0 | 0 | 0 | 36 | 0.00 | 84 ms |

The only non-empty setting was PSM 6, but it produced wrong numeric candidates for every Stage3 member2 field and no exact candidates.

## Failure Taxonomy

| Config | Failure Shape |
| --- | --- |
| production PSM 7 | 36 empty OCR |
| PSM 6 | 19 wrong numeric candidates, 8 substitutions, 7 insertion/merged candidates, 1 raw exact unparsed, 1 normalized exact unparsed |
| PSM 8 / 10 / 13 | 36 empty OCR each |
| PSM 7 digits-only / no-preserve / numeric-mode | 36 empty OCR each |
| PSM 8 digits-only | 36 empty OCR |

The two PSM 6 raw exact/unparsed cases are not usable under this task because the current parser and existing T2 parser are intentionally unchanged. No new parser logic was added.

## T2 Interaction

For every config, the script evaluates both raw/current parser output and raw/current parser plus existing T2 grouped-number parser. T2 did not convert any Stage3 member2 OCR config output into an exact candidate:

- Production + T2: 0 / 36
- PSM 6 + T2: 0 / 36
- All other configs + T2: 0 / 36

This confirms the bottleneck is not safely addressed by the existing grouped-number parser when the OCR engine/config is changed alone.

## Tier C Simulation

For each config, the diagnostic simulation starts from production candidates, adds or replaces only Stage3 member2 OCR evidence from that config in a diagnostic copy, keeps T2/ranking/Tier C unchanged, then evaluates Tier C.

| Config | Tier C TP | Tier C FP | Stage/Side Gain | Existing PASS Lost | Final Stage/Side PASS |
| --- | ---: | ---: | ---: | ---: | ---: |
| production PSM 7 | 0 | 0 | 0 | 0 | 40 |
| PSM 6 | 0 | 0 | 0 | 0 | 40 |
| PSM 8 | 0 | 0 | 0 | 0 | 40 |
| PSM 10 | 0 | 0 | 0 | 0 | 40 |
| PSM 13 | 0 | 0 | 0 | 0 | 40 |
| PSM 7 digits-only | 0 | 0 | 0 | 0 | 40 |
| PSM 7 no-preserve | 0 | 0 | 0 | 0 | 40 |
| PSM 7 numeric-mode | 0 | 0 | 0 | 0 | 40 |
| PSM 8 digits-only | 0 | 0 | 0 | 0 | 40 |

No config produces a useful Tier C proposal, no config creates a Tier C FP, and no existing PASS side is lost.

## Addressable Stage/Sides

The prior post-T2 audit estimated up to 8 failing stage/sides could become addressable if member2 evidence were fixed. This config-only experiment did not recover any exact Stage3 member2 candidate, so the config-specific addressable list is empty:

- Stage3 member2 exact candidates introduced: 0
- Addressable stage/sides converted by this experiment: 0
- Tier C proposals produced from new Stage3 member2 evidence: 0

The earlier 8-row estimate remains an upper bound for a future recognition improvement, not an observed gain from this OCR config matrix.

## Stability

The two browser runs were stable:

- Raw OCR / candidate / T2 / Tier C decision signature: stable
- Tier C proposal stability: stable
- Production baseline stability: stable
- Fresh-worker spot checks matched the reused-worker result shape for the sampled current-config Stage3 member2 fields.

## Runtime

The PSM 6 profile was the slowest and noisiest:

- Production PSM 7: 108 ms average per field/config/profile merge
- PSM 6: 233 ms average, 36 / 36 wrong numeric candidate fields
- Other tested configs: roughly 84-85 ms average, but all empty

The runtime/candidate tradeoff does not justify a production review.

## Recommendation

No tested OCR engine/configuration setting materially improves Stage3 member2. A production PSM/config change is not recommended.

Recommended next experiment:

```text
symbol/bbox-aware segmentation investigation
```

Rationale:

- Production OCR and most PSM variants return empty output for Stage3 member2.
- PSM 6 can force numbers out of the crop, but they are consistently wrong/noisy and do not pass the existing parser/T2/Tier C path.
- The remaining bottleneck appears closer to raw pixel quality, symbol segmentation, or bbox-level recognition limits than to a simple Tesseract config switch.

## Production Isolation

Confirmed unchanged:

- T2 parser
- `ENABLE_IPAD_GROUPED_NUMBER_MEMBER_TOKENS`
- Tier C semantics
- Tier C production application count
- iPad ROI geometry
- production preprocessing
- candidate ranking
- expected fixtures
- smartphone OCR
- current-PC OCR
- legacy desktop OCR
