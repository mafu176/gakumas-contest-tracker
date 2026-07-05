# Smartphone OCR sample analysis: IMG_9308-IMG_9312

## Summary

Five user-reported smartphone OCR samples were added under `test-images/user-reports/unreviewed/` with expected fixtures in `regression-test/expected/`.

Current production OCR output does not pass these fixtures yet. The failures are useful regression targets for the next smartphone OCR architecture work:

| Image | Current runner result | Main failure type | Fixed ROI finding | ROI adoption sim |
| --- | --- | --- | --- | --- |
| `IMG_9308.png` | FAIL | Stage2 self 7-digit split/drop, bonus promoted into member set | Near 7-digit candidate `1020194` for expected `1020198`; `1200635` not cleanly found | unchanged |
| `IMG_9309.png` | FAIL | Stage1 self total/bonus digit error | members found; no 7-digit issue | unchanged |
| `IMG_9310.png` | FAIL | Stage2 self missing 7-digit member, Stage3 total bonus missing, Stage3 enemy row shift | exact 7-digit candidates `1199099` and `1012731` found | unchanged |
| `IMG_9311.png` | FAIL | Stage2 self missing 7-digit member, bonus promoted into member set | exact 7-digit candidates `1124177` and `1057936` found | unchanged |
| `IMG_9312.png` | FAIL | Stage1 self total/bonus digit error | expected total found in ROI candidates; no 7-digit issue | unchanged |

The ROI adoption simulation stayed unchanged for all five images because the current guards accept only clean candidates from strict slot zones with exact equation improvement. These samples mostly expose broad row-zone 7-digit candidates, near candidates, bonus/total evidence gaps, or total-only digit errors.

## Commands Run

```powershell
node scripts/ocr-test-images.mjs IMG_9308 IMG_9309 IMG_9310 IMG_9311 IMG_9312
node scripts/ocr-test-images.mjs IMG_9308 IMG_9309 IMG_9310 IMG_9311 IMG_9312 --debug-artifacts
node scripts/ocr-test-images.mjs IMG_9308 IMG_9309 IMG_9310 IMG_9311 IMG_9312 --fixed-roi-experiment
node scripts/ocr-test-images.mjs IMG_9308 IMG_9309 IMG_9310 IMG_9311 IMG_9312 --roi-adoption-sim
```

Generated artifacts are intentionally uncommitted:

- `tmp/ocr-debug-artifacts/`
- `tmp/ocr-roi-experiment/`
- `tmp/ocr-roi-adoption-sim/`

## Fixture Files

| Image | Expected fixture |
| --- | --- |
| `IMG_9308.png` | `regression-test/expected/IMG_9308.json` |
| `IMG_9309.png` | `regression-test/expected/IMG_9309.json` |
| `IMG_9310.png` | `regression-test/expected/IMG_9310.json` |
| `IMG_9311.png` | `regression-test/expected/IMG_9311.json` |
| `IMG_9312.png` | `regression-test/expected/IMG_9312.json` |

The expected JSON schema tracks member scores and totals only. Crown/bonus values below are inferred from the member sum versus total and are not represented directly in the fixture schema.

## Image-by-image Analysis

### IMG_9308.png

Current failures:

| Field | Expected | Actual |
| --- | ---: | ---: |
| S2 self total | `2979109` | `958911` |
| S2 self member1 | `1020198` | `200635` |
| S2 self member2 | `1200635` | `518149` |
| S2 self member3 | `518149` | `240127` |

Expected Stage2 self equation:

```text
1020198 + 1200635 + 518149 + 240127 = 2979109
```

Current OCR selected `200635 / 518149 / 240127`, total `958911`, so the bonus `240127` is treated as a member and the two 7-digit members are lost or truncated. Fixed ROI saw a near candidate `1020194` for expected `1020198`, but did not cleanly recover `1200635`.

Classification: 7-digit split/truncation plus bonus-as-member. Not safe for current ROI adoption because the candidate is near, not exact, and comes from broad row evidence.

### IMG_9309.png

Current failure:

| Field | Expected | Actual |
| --- | ---: | ---: |
| S1 self total | `1123775` | `1125775` |

Members are correct: `415986 / 394090 / 230502`.

Expected member sum is `1040578`, so the expected bonus-equivalent delta is `83197`. Current OCR instead behaves as if the delta is `85197`. This is a narrow total/bonus digit error, not a 7-digit member recovery case.

Classification: total/bonus digit confusion. Needs targeted investigation before any generic total repair.

### IMG_9310.png

Current failures:

| Field | Expected | Actual |
| --- | ---: | ---: |
| S2 self total | `3122164` | `2067169` |
| S2 self member1 | `1199099` | `144104` |
| S3 self total | `752993` | `670908` |
| S3 enemy total | `226458` | `113556` |
| S3 enemy member1 | `113556` | `58192` |
| S3 enemy member2 | `58192` | `54710` |
| S3 enemy member3 | `54710` | `0` |

Fixed ROI found exact expected 7-digit candidates:

- S2 self `1199099`
- S2 enemy `1012731`

For S2 self, debug raw text includes the row-like sequence `1,199,099798,677 884,569` and bonus-like `+239819`, but current selection uses `144104 / 798677 / 884569`, total `2067169`.

S3 self members are correct but total is member sum only. Expected total requires a bonus-equivalent `82085`:

```text
212343 + 410425 + 48140 = 670908
670908 + 82085 = 752993
```

S3 enemy appears to be a row-shift or total/member displacement: expected members are `113556 / 58192 / 54710`, total `226458`, while current output uses `113556` as total and drops the first member slot.

Classification: mixed case. S2 self is a strong ROI evidence sample, but S3 enemy is not a simple 7-digit repair.

### IMG_9311.png

Current failures:

| Field | Expected | Actual |
| --- | ---: | ---: |
| S2 self total | `2266229` | `1142052` |
| S2 self member1 | `1124177` | `478609` |
| S2 self member2 | `478609` | `438608` |
| S2 self member3 | `438608` | `224835` |

Expected Stage2 self equation:

```text
1124177 + 478609 + 438608 + 224835 = 2266229
```

Current OCR selected `478609 / 438608 / 224835`, total `1142052`, so the bonus `224835` is promoted into the member set and the real 7-digit member `1124177` is dropped.

Fixed ROI found exact expected 7-digit candidates:

- S2 self `1124177`
- S2 enemy `1057936`

The adoption sim rejected `1124177` because it was from `direct-member-row-band` rather than a strict slot zone.

Classification: clean 7-digit candidate present in ROI, but current adoption guard intentionally refuses broad row-zone adoption.

### IMG_9312.png

Current failure:

| Field | Expected | Actual |
| --- | ---: | ---: |
| S1 self total | `1236139` | `1256139` |

Members are correct: `662516 / 324269 / 116851`.

Expected member sum is `1103636`, so the expected bonus-equivalent delta is `132503`. Current OCR behaves as if the delta is `152503`. Fixed ROI includes the expected total `1236139` in candidates.

Classification: total/bonus digit confusion. This is similar to `IMG_9309`, and should be investigated as a total candidate selection/bonus digit issue rather than a member recovery case.

## Recurring Patterns

1. **7-digit member split/truncation in Stage2 self**
   - `IMG_9308`, `IMG_9310`, and `IMG_9311` all involve Stage2 self losing a 7-digit member.
   - ROI found exact 7-digit candidates for `IMG_9310` and `IMG_9311`, and a near candidate for `IMG_9308`.

2. **Bonus promoted into member slots**
   - `IMG_9308` Stage2 self selects bonus `240127` as a member.
   - `IMG_9311` Stage2 self selects bonus `224835` as a member.

3. **Total/bonus digit confusion**
   - `IMG_9309` S1 self total is `2000` too high.
   - `IMG_9312` S1 self total is `20000` too high.
   - These are total-only failures with correct members.

4. **Stage3 total or row displacement**
   - `IMG_9310` S3 self misses a bonus-equivalent total delta of `82085`.
   - `IMG_9310` S3 enemy shifts members/total and needs separate sparse/row assignment investigation.

## ROI Adoption Simulation Outcome

All five images were unchanged:

| Image | Improved | Regressed | Changed unvalidated | Unchanged sides |
| --- | ---: | ---: | ---: | ---: |
| `IMG_9308.png` | 0 | 0 | 0 | 6 |
| `IMG_9309.png` | 0 | 0 | 0 | 6 |
| `IMG_9310.png` | 0 | 0 | 0 | 6 |
| `IMG_9311.png` | 0 | 0 | 0 | 6 |
| `IMG_9312.png` | 0 | 0 | 0 | 6 |

This is expected with the current conservative simulation rules. The useful 7-digit candidates often appear in broad member-row zones, joined strings, or near-candidate output, which are deliberately audit-only until a stronger slot/geometry guard exists.

## Recommended Next Step

The highest-value next runner-only improvement is to refine smartphone ROI slot extraction for Stage2 self rows. The specific goal is to split broad row-zone text like `1,124,177478,609 438,608` into reliable per-slot evidence without depending on near matches or sliding-window guesses.

Production adoption should remain paused until the runner can prove:

- exact 7-digit candidate in the correct slot zone,
- bonus candidate excluded from member slots,
- equation improves against displayed total evidence,
- no regression on existing mobile safety images.
