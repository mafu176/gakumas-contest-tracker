# Smartphone Crown Bonus / Stage-Wide Solver Investigation

This is a runner/browser-equivalent evidence investigation. It uses the already-corrected smartphone expected fixtures and evaluates smartphone-native crown-bonus and stage-wide six-member solver simulations. It does not change final OCR output.

## Fixture Rule Validation

| fixtures | 89 |
| stages checked | 267 |
| floor-rule matches | 267 / 267 |
| mismatches | 0 |
| exactly one bonus side | 267 / 267 |
| floor matches | 267 |
| round-to-nearest matches | 164 |
| ceil matches | 48 |
| floor-distinguishing stages | 219 |

The seven previously documented mismatches were confirmed fixture transcription or assignment errors and are now corrected. The rule now validates across all fixture-backed smartphone stages:

```text
crownBonus = floor(max(all six raw member scores) * 0.20)
```

## Artifact Reuse

The simulations can now be scored from cached smartphone OCR artifacts without rerunning OCR:

```bash
node scripts/ocr-test-images.mjs --smartphone-crown-stage-wide-solver-from-baseline
```

| evaluation source | smartphone baseline cache |
| cache summary | tmp/smartphone-ocr-baseline-cache/summary.json |

## Shared Evidence Schema

Both runner and browser-equivalent paths now call shared helpers from `app/lib/ocr.js`:

- `buildSmartphoneCrownBonusRuleEvidence(...)`
- `buildSmartphoneStageWideSixMemberCandidateSolverEvidence(...)`

The shared evidence preserves final selected members/totals, raw member rows, raw total candidates, total candidate traces, candidate source/provenance, unique global rank-1, derived crown bonus, proposed totals, rejection reasons, and `wouldApply`.

## Evidence Flow

- Runner flow: load cached smartphone OCR baseline artifacts, rebuild shared evidence from final selected stage results plus raw/rawText candidate evidence, and score against expected fixtures.
- Browser/UI flow: after existing smartphone recoveries and before OCR result state is rendered, build the same evidence-only objects from the UI's final selected values and existing OCR candidate text. These objects are stored as diagnostics on `parsedOcrScores.smartphoneCrownStageWideEvidence`; they do not alter `stageScores`.
- Browser-equivalent parity: normalize the cached runner artifact into the same shape used by the UI evidence path, then fingerprint shared helper output across all fixture-backed stages.

## Runner-Only Crown-Bonus Rule Simulation

Guards: smartphone-only, six selected members complete, unique global rank-1, exact self and enemy total evidence, exact equality only, no member changes, no near match, no digit inference.

| rows audited | 267 |
| TP | 2 |
| FP | 0 |
| FN | 0 |
| blocked | 265 |
| true incremental TP | 2 |

Accepted rows:

- `user-reports/unreviewed/IMG_9250.png` S1: proposed self 82360, 124137, 177424 total 383,921; enemy 105866, 516222, 361331 total 1,086,663; rank1 enemy.member2 516,222
- `user-reports/unreviewed/IMG_9312.png` S1: proposed self 662516, 324269, 116851 total 1,236,139; enemy 384933, 341392, 84205 total 810,530; rank1 self.member1 662,516

## Runner-Only Stage-Wide Six-Member Candidate Solver Simulation

Guards: smartphone-native candidate sources only, exact observed candidates, one candidate per six member slots, unique global rank-1, derived crown bonus, exact self and enemy total evidence, both equations exact, exactly one valid interpretation, no arithmetic-derived members, no near match.

| rows audited | 267 |
| TP | 7 |
| FP | 0 |
| FN | 0 |
| blocked | 260 |
| true incremental TP | 7 |

Accepted rows:

- `user-reports/passed/IMG_8944.png` S3: proposed self 136696, 76641, 551128 total 874,690; enemy 92426, 102511, 40117 total 235,054; rank1 self.member3 551,128
- `user-reports/passed/IMG_9070.png` S3: proposed self 75991, 457212, 701071 total 1,374,488; enemy 69001, 65419, 44589 total 179,009; rank1 self.member3 701,071
- `user-reports/unreviewed/IMG_8950.png` S3: proposed self 180512, 63387, 550993 total 905,090; enemy 87580, 148478, 46127 total 282,185; rank1 self.member3 550,993
- `user-reports/unreviewed/IMG_9250.png` S1: proposed self 82360, 124137, 177424 total 383,921; enemy 105866, 516222, 361331 total 1,086,663; rank1 enemy.member2 516,222
- `user-reports/unreviewed/IMG_9312.png` S1: proposed self 662516, 324269, 116851 total 1,236,139; enemy 384933, 341392, 84205 total 810,530; rank1 self.member1 662,516
- `user-reports/unreviewed/IMG_9322.png` S3: proposed self 806192, 482823, 405555 total 1,694,570; enemy 367211, 756949, 1377038 total 2,776,605; rank1 enemy.member3 1,377,038
- `user-reports/unreviewed/IMG_9334.png` S3: proposed self 1117179, 622324, 498570 total 2,238,073; enemy 957950, 1304323, 841305 total 3,364,442; rank1 enemy.member2 1,304,323

## Overlap

| crown accepted stages | 2 |
| stage-wide accepted stages | 7 |
| overlap | 2 |
| crown-only | 0 |
| stage-wide-only | 5 |

## Position Breakdown

| position | crown accepted | crown blocked | stage-wide accepted | stage-wide blocked |
| --- | ---: | ---: | ---: | ---: |
| S1 self | 1 | 3 | 1 | 3 |
| S1 enemy | 1 | 1 | 1 | 1 |
| S2 self | 0 | 7 | 0 | 7 |
| S2 enemy | 0 | 4 | 0 | 4 |
| S3 self | 0 | 16 | 4 | 12 |
| S3 enemy | 0 | 5 | 1 | 4 |

## Known Failure Impact

| image | crown-bonus simulation | stage-wide solver simulation | notes |
| --- | --- | --- | --- |
| `IMG_9308` | no help | no help | remains blocked by strict evidence guards |
| `IMG_9310` | no help | no help | remains blocked by strict evidence guards |
| `IMG_9319` | no help | no help | remains blocked by strict evidence guards |

## Runner / Browser-Equivalent Parity

The browser-equivalent path uses the same final selected smartphone stage values and existing raw/rawText candidate evidence that the UI has before rendering OCR results. This is evidence-only plumbing; it does not apply a recovery.

| metric | crown-bonus | stage-wide solver |
| --- | ---: | ---: |
| stages compared | 267 | 267 |
| runner wouldApply | 2 | 7 |
| browser-equivalent wouldApply | 2 | 7 |
| wouldApply disagreements | 0 | 0 |
| TP parity exact | 2 / 2 | 7 / 7 |
| proposed recovery disagreements | 0 | 0 |
| total evidence mismatches | 0 | 0 |
| candidate pool/provenance mismatches | - | 0 |
| valid interpretation mismatches | - | 0 |
| missing browser evidence | 0 | 0 |
| missing runner evidence | 0 | 0 |
| safety-relevant mismatches | 0 | 0 |

### Accepted TP Parity

| simulation | image | stage | runner/browser proposed result |
| --- | --- | ---: | --- |
| crown-bonus | `user-reports/unreviewed/IMG_9250.png` | 1 | self 82360, 124137, 177424 +0 = 383,921; enemy 105866, 516222, 361331 +103,244 = 1,086,663 |
| crown-bonus | `user-reports/unreviewed/IMG_9312.png` | 1 | self 662516, 324269, 116851 +132,503 = 1,236,139; enemy 384933, 341392, 84205 +0 = 810,530 |
| stage-wide | `user-reports/passed/IMG_8944.png` | 3 | self 136696, 76641, 551128 +110,225 = 874,690; enemy 92426, 102511, 40117 +0 = 235,054 |
| stage-wide | `user-reports/passed/IMG_9070.png` | 3 | self 75991, 457212, 701071 +140,214 = 1,374,488; enemy 69001, 65419, 44589 +0 = 179,009 |
| stage-wide | `user-reports/unreviewed/IMG_8950.png` | 3 | self 180512, 63387, 550993 +110,198 = 905,090; enemy 87580, 148478, 46127 +0 = 282,185 |
| stage-wide | `user-reports/unreviewed/IMG_9250.png` | 1 | self 82360, 124137, 177424 +0 = 383,921; enemy 105866, 516222, 361331 +103,244 = 1,086,663 |
| stage-wide | `user-reports/unreviewed/IMG_9312.png` | 1 | self 662516, 324269, 116851 +132,503 = 1,236,139; enemy 384933, 341392, 84205 +0 = 810,530 |
| stage-wide | `user-reports/unreviewed/IMG_9322.png` | 3 | self 806192, 482823, 405555 +0 = 1,694,570; enemy 367211, 756949, 1377038 +275,407 = 2,776,605 |
| stage-wide | `user-reports/unreviewed/IMG_9334.png` | 3 | self 1117179, 622324, 498570 +0 = 2,238,073; enemy 957950, 1304323, 841305 +260,864 = 3,364,442 |

## Future Production Precedence

If productionized later, the safest conceptual order is:

1. existing smartphone production recoveries
2. smartphone crown-bonus rule recovery
3. smartphone stage-wide six-member solver

The future recoveries should reject already-correct rows and must not broaden member candidate eligibility beyond this parity-proven evidence.

## Recommendation

Runner/browser-equivalent parity is justified next for the qualifying simulation.

- production OCR changed: no
- current-PC OCR changed: no
- legacy desktop OCR changed: no