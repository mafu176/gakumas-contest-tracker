# Current-PC Stage3 Self Merged-Run Image-Split Experiment

Generated: 2026-07-21T14:47:12.673Z

## Purpose

This is a runner-only experiment for current-PC Stage3 self OCR rows where Tesseract emits a merged numeric run across member slots. It splits the actual image region of the detected merged run by deterministic member slot boundaries and re-OCRs each slot intersection independently.

No production OCR output is changed.

## Command

`node scripts/ocr-test-images.mjs --current-pc-baseline --current-pc-stage3-merged-run-slot-split-experiment`

## Guards

- current-PC baseline only
- Stage3 self only
- detected merged run must have an OCR bbox and overlap at least two deterministic member slot regions
- crop boundaries are derived only from the merged-run bbox and fixed member slot geometry
- expected fixtures are used only after OCR for scoring, never to choose crops or candidates
- candidate is admitted only into the slot whose intersection crop produced it
- exact observed member-range values only
- no near-match, no digit inference, no total-derived member, no filename logic, no screenshot logic
- the downstream stage-wide solver still requires exact self/enemy total evidence, unique global rank-1, `floor(max(all six members) * 0.20)`, both equations exact, and one unique interpretation

## Summary

| metric | count |
| --- | ---: |
| Stage3 self rows evaluated | 68 |
| rows with detected merged runs | 37 |
| merged runs detected | 101 |
| split crops OCRed | 795 |
| split candidates admitted | 388 |
| exact members newly recovered in focused rows | 11 |
| rows gaining complete Stage3 self member evidence | 1 |
| TP stages | 1 |
| FP stages | 0 |
| FN stages | 2 |
| blocked stages | 27 |
| true incremental TP beyond current production | 1 |
| Stage3 self incremental TP | 1 |
| wrong-slot assignments | 0 |
| extra candidate insertions | 27 |

## Candidate Correctness

| classification | count |
| --- | ---: |
| correct-slot | 38 |
| extra-candidate | 27 |

## Focus Rows With Detected Merged Runs

| screenshot | detected runs | split candidates | exact recovered members | complete member evidence | artifact |
| --- | ---: | ---: | --- | --- | --- |
| 2026-07-11_223346581.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-11_223346581.png-stage3-self/merged-run-image-split.json |
| 2026-07-11_223426685.png | 3 | 1 | member1=903,425 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-11_223426685.png-stage3-self/merged-run-image-split.json |
| 2026-07-11_223513004.png | 3 | 1 | member1=903,425 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-11_223513004.png-stage3-self/merged-run-image-split.json |
| 2026-07-11_223714046.png | 3 | 5 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-11_223714046.png-stage3-self/merged-run-image-split.json |
| 2026-07-11_223753187.png | 3 | 2 | member1=1,072,082 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-11_223753187.png-stage3-self/merged-run-image-split.json |
| 2026-07-11_223950902.png | 3 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-11_223950902.png-stage3-self/merged-run-image-split.json |
| 2026-07-15_184109879.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-15_184109879.png-stage3-self/merged-run-image-split.json |
| 2026-07-15_184117455.png | 3 | 3 | member1=1,003,606 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-15_184117455.png-stage3-self/merged-run-image-split.json |
| 2026-07-15_184158330.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-15_184158330.png-stage3-self/merged-run-image-split.json |
| 2026-07-15_184205486.png | 3 | 2 | member1=1,020,080 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-15_184205486.png-stage3-self/merged-run-image-split.json |
| 2026-07-15_184212413.png | 3 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/2026-07-15_184212413.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-11 144846091.png | 3 | 3 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-11 144846091.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-11 144932916.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-11 144932916.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-11 145038835.png | 2 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-11 145038835.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-11 145100208.png | 3 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-11 145100208.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-11 145126932.png | 3 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-11 145126932.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-12 223701314.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-12 223701314.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-14 060811830.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-14 060811830.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-14 060926190.png | 3 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-14 060926190.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-14 061151691.png | 1 | 0 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-14 061151691.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-14 061325391.png | 3 | 1 | member1=1,033,971 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-14 061325391.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-14 061545315.png | 1 | 0 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-14 061545315.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-14 061634001.png | 3 | 2 | member1=1,275,772 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-14 061634001.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-15 130012999.png | 4 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-15 130012999.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-15 130019543.png | 4 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-15 130019543.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-15 130026795.png | 3 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-15 130026795.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-15 130032877.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-15 130032877.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-16 062903692.png | 3 | 3 | member1=721,210<br>member2=1,162,325 | yes | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-16 062903692.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-16 063115987.png | 2 | 2 | member1=1,147,085 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-16 063115987.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-16 063215708.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-16 063215708.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-16 063330034.png | 2 | 6 | member1=1,035,782 | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-16 063330034.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-17 081532057.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-17 081532057.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-17 081837850.png | 3 | 2 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-17 081837850.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-21 054906218.png | 3 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-21 054906218.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-21 055004769.png | 1 | 3 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-21 055004769.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-21 055134699.png | 1 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-21 055134699.png-stage3-self/merged-run-image-split.json |
| スクリーンショット 2026-07-21 055158908.png | 2 | 1 | - | no | tmp/current-pc-stage3-self-merged-run-image-split-experiment/スクリーンショット 2026-07-21 055158908.png-stage3-self/merged-run-image-split.json |

## Accepted Rows

| screenshot | stage | changed slots | split candidates used | totals | uniqueness |
| --- | ---: | --- | --- | --- | --- |
| スクリーンショット 2026-07-16 062903692.png | 3 | self.member1: 162,325 -> 721,210<br>self.member2: 933,236 -> 1,162,325<br>self.member3: 232,465 -> 933,236 | member1 721,210 (run1-member1-score-slot-psm7 crop=38,638,69,18)<br>member2 1,162,325 (run1-member2-default-psm7 crop=89,638,92,18) | self 3,049,236 / enemy 922,779 | exactly one complete six-member interpretation |

## Blocked/Rejection Summary

| reason | count |
| --- | ---: |
| no-complete-six-member-exact-total-interpretation | 29 |
| missing-self-member3-candidate | 7 |
| missing-self-member2-candidate | 2 |
| missing-enemy-member3-candidate | 1 |

## Comparison To Existing Evidence

- This experiment is stricter than string-level splitting: no numeric run is cut by character count or punctuation pattern.
- Compared with per-slot crop diagnostics, it focuses only on the image region actually occupied by a merged OCR bbox.
- Compared with bbox/geometry consensus, it asks whether re-OCRing the slot intersection can create clean slot-proven candidates for the existing stage-wide solver.
- Compared with the slot-proven Stage3 variant simulation and expected-blind geometry simulation, the downstream safety guard is unchanged: exact totals, crown-bonus rule, and one unique six-member interpretation are still required.

## Recommendation

Defer or abandon merged-run image-space splitting for now. It does not yet provide at least two true incremental safe recoveries with zero wrong-slot assignments.

Productionization is not recommended by this report.
