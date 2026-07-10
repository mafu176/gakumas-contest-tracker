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

## Additional user samples: IMG_9315-IMG_9319

Five more user-reported smartphone screenshots were added under
`test-images/user-reports/unreviewed/` with expected fixtures in
`regression-test/expected/`.

No filename/stage-specific known correction was added for these images. The user
preference remains to use these as evidence for generalizable OCR improvements,
not as individual hardcoded fixes.

| Image | Current runner result | Main failure type | sparseTotalAsMemberSimulation |
| --- | --- | --- | --- |
| `IMG_9315.png` | FAIL | S2 self digit error; S3 self misses 7-digit member `1026470` and promotes bonus `205294` as member3 | no `wouldApply` |
| `IMG_9316.png` | FAIL | S3 self drops leading 7-digit member `1273010`, shifts members left, and promotes bonus `254602` as member3 | no `wouldApply` |
| `IMG_9317.png` | FAIL | S3 self drops leading 7-digit member `1060079`, shifts members left, and promotes bonus `212015` as member3 | no `wouldApply` |
| `IMG_9318.png` | FAIL | S3 self drops leading 7-digit member `1001405`, shifts members left, and promotes bonus `200281` as member3 | no `wouldApply` |
| `IMG_9319.png` | FAIL | S2 self small digit error; S2 enemy sparse/total-as-member-like small row shift; S3 self misses 7-digit member `1189602` and promotes bonus `237920` as member3 | no `wouldApply` |

Current OCR failures:

| Image | Field | Expected | Actual |
| --- | --- | ---: | ---: |
| `IMG_9315.png` | S2 self member3 | `162915` | `162515` |
| `IMG_9315.png` | S3 self total | `2383332` | `1377391` |
| `IMG_9315.png` | S3 self member3 | `1026470` | `205294` |
| `IMG_9316.png` | S3 self total | `2606404` | `1333394` |
| `IMG_9316.png` | S3 self member1 | `1273010` | `696275` |
| `IMG_9316.png` | S3 self member2 | `696275` | `382517` |
| `IMG_9316.png` | S3 self member3 | `382517` | `254602` |
| `IMG_9317.png` | S3 self total | `2353239` | `1293160` |
| `IMG_9317.png` | S3 self member1 | `1060079` | `276500` |
| `IMG_9317.png` | S3 self member2 | `276500` | `804645` |
| `IMG_9317.png` | S3 self member3 | `804645` | `212015` |
| `IMG_9318.png` | S3 self total | `2953212` | `1951807` |
| `IMG_9318.png` | S3 self member1 | `1001405` | `812662` |
| `IMG_9318.png` | S3 self member2 | `812662` | `938864` |
| `IMG_9318.png` | S3 self member3 | `938864` | `200281` |
| `IMG_9319.png` | S2 self member1 | `208530` | `208330` |
| `IMG_9319.png` | S2 enemy total | `39242` | `178484` |
| `IMG_9319.png` | S2 enemy member1 | `11845` | `39242` |
| `IMG_9319.png` | S2 enemy member2 | `16081` | `111845` |
| `IMG_9319.png` | S2 enemy member3 | `11316` | `16081` |
| `IMG_9319.png` | S3 self total | `2714080` | `1524478` |
| `IMG_9319.png` | S3 self member3 | `1189602` | `237920` |

The new batch strengthens the evidence for a broader Stage3 self pattern: a
leading 7-digit member is dropped from the member set while the crown bonus is
selected as a member. This is related to the ROI/row-zone work, but it is not the
sparse total-as-member pattern from `IMG_9310` Stage3 enemy.

`IMG_9319` also has a small-score S2 enemy row shift where the displayed total
`39242` is selected as member1 and a nearby `111845` appears where `11845` is
expected. That resembles total/member displacement plus digit confusion, so it
should not be folded into the current sparse total-as-member simulation without
separate evidence.

Production recommendation:

- keep sparse total-as-member recovery out of production for now
- do not add filename/stage-specific corrections for `IMG_9315`-`IMG_9319`
- investigate a separate general Stage3 self 7-digit member recovery path using
  ROI/debug artifacts
- keep `IMG_9319` S2 enemy as a separate sparse small-row/digit-confusion
  investigation target

## Stage3 self 7-digit displacement investigation

A runner-only debug simulation was added for this family of failures:

```text
stage3SelfSevenDigitDisplacementSimulation
```

It is documented in `docs/smartphone-ocr-stage3-7digit-displacement.md`.

The simulation does not change production OCR output. It checks whether Stage3 self
has:

- a clean exact 7-digit candidate,
- current member3 acting like the crown/bonus,
- current total equal to the wrong selected member sum,
- an exact displayed total equation for `[sevenDigitCandidate, currentMember1, currentMember2] + bonus`.

Result for the new samples:

| Image | Simulation result | Notes |
| --- | --- | --- |
| `IMG_9315.png` | rejects | 7-digit candidate `1026470` is visible, but current total is not selected-member sum and total evidence is inconsistent. |
| `IMG_9316.png` | rejects | 7-digit candidate `1273010` is visible, but exact displayed total evidence is still missing. |
| `IMG_9317.png` | rejects | 7-digit candidate `1060079` is visible, but exact displayed total evidence is still missing. |
| `IMG_9318.png` | rejects | 7-digit candidate `1001405` is visible, but exact displayed total evidence is still missing. |
| `IMG_9319.png` | production recovery applies | Recovers Stage3 self to `1189602 / 736949 / 549609`, bonus `237920`, total `2714080`; enhanced total evidence also finds parsed and split/joined exact total evidence. |

The latest runner-only total evidence reporting adds direct total crop, alternative
total trace, selected member-row, large total-like candidate, and split/joined
candidate evidence to the debug artifacts. It did not add exact total evidence
for `IMG_9316`, `IMG_9317`, or `IMG_9318`; `IMG_9315` remains rejected with
near-but-wrong total evidence, while `IMG_9319` remains the only strict positive.

No false-positive `wouldApply` appeared in the existing controls:

- `IMG_9308`-`IMG_9312`
- `IMG_9243`
- `IMG_9257`
- `IMG_9282`
- `IMG_9285`
- `IMG_9251`
- `IMG_9180`

Strict production recovery is now enabled only for the exact Stage3 self guard
documented in `docs/smartphone-ocr-stage3-7digit-displacement.md`.

It does not add filename/stage-specific known corrections and does not loosen
row-zone Stage2 recovery. At the time of that investigation `IMG_9319` was the
only strict Stage3 self positive under the then-documented member order, while
`IMG_9315` through `IMG_9318` remained blocked until their displayed total
evidence was exact. The later `IMG_9320`-`IMG_9337` follow-up below adds a
narrower source-order guard and identifies `IMG_9329` as the safe production
positive for the current fixtures.

## Additional user samples: IMG_9320-IMG_9337

Fifteen smartphone screenshots were added with expected fixtures:

```text
IMG_9320 IMG_9321 IMG_9322 IMG_9323 IMG_9324
IMG_9328 IMG_9329 IMG_9330 IMG_9331 IMG_9332
IMG_9333 IMG_9334 IMG_9335 IMG_9336 IMG_9337
```

Baseline OCR passed 3 of 15 images (`IMG_9330`, `IMG_9331`, `IMG_9332`).
After the safe Stage3 self joined-fragment improvement, 4 of 15 pass; the new
passing image is `IMG_9329`.

The only production change from this batch is generic and guarded:

- Stage3 self only.
- Current total must equal the wrong selected member sum.
- Member-row candidates must contain the ordered sequence
  `[sevenDigitCandidate, currentMember1, currentMember2]`.
- Selected member3 must be the bonus-like value.
- The proposed total must have exact parsed total evidence or exact joined
  digit-fragment evidence from total-candidate OCR text.
- Exactly one resulting proposal may match.

`IMG_9329` satisfies those guards and recovers to:

```text
self members: 1107136 / 548299 / 567465
self total:   2444327
bonus:        221427
```

Remaining failures were not auto-corrected:

| Image | Classification |
| --- | --- |
| `IMG_9320` | Stage2 enemy small-row member shift; unsafe small-score/digit-confusion pattern. |
| `IMG_9321` | Stage3 enemy 7-digit/member/bonus displacement; recovery is self-side only for now. |
| `IMG_9322` | Stage3 enemy displacement with conflicting member/total selection. |
| `IMG_9323` | Stage2 self row shift plus severe Stage3 self displacement; no exact guarded production proposal. |
| `IMG_9324` | Stage3 self displacement remains blocked by guard evidence. |
| `IMG_9328` | Stage3 self partial displacement remains blocked by guard evidence. |
| `IMG_9333` | Stage2 self row shift plus Stage3 enemy displacement. |
| `IMG_9334` | Stage3 self order/slot issue and Stage3 enemy displacement. |
| `IMG_9335` | Stage2 enemy order issue plus Stage3 enemy displacement. |
| `IMG_9336` | Stage3 self displacement remains blocked by guard evidence. |
| `IMG_9337` | Stage1 self row shift plus Stage3 self and enemy displacement. |

No filename/stage-specific corrections were added. No near-match totals or
arbitrary digit inference were used.

Control observations:

- `IMG_9308` remains blocked.
- `IMG_9310` Stage3 sparse total-as-member remains simulation-only.
- `IMG_9329` is the only new pass from the production change.
- Desktop safety image `pc-rehearsal-bonus-member-shift.png` still reports zero
  failures.
