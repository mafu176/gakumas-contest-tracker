# Current-PC Stage3 Slot Provenance Investigation

Generated: 2026-07-21

## Scope

- Diagnostics / runner-only investigation.
- Production OCR output changed: no.
- New recovery simulation added: no.
- Smartphone OCR changed: no.
- Legacy desktop OCR changed: no.
- Existing current-PC recoveries changed: no.
- Filename/stage-specific logic: no.
- Near-match, within-one tolerance, missing-digit inference, or total-derived member invention: no.

## Starting Point

Latest investigation commit before this task: `7be37a1 Investigate current PC ambiguous exact candidates`.

Latest confirmed current-PC production accuracy:

| level | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| image | 22 | 36 | 58 | 37.9% |
| stage | 130 | 44 | 174 | 74.7% |
| stage/side row | 294 | 54 | 348 | 84.5% |

The ambiguous exact-candidate investigation found 36 rows where at least one wrong expected member value exists exactly somewhere in OCR evidence, but selection is not uniquely safe. The strongest recurring blocker was broad provenance: exact values exist, but the pipeline cannot prove which member slot or role they belong to.

## Current Stage3 Geometry

Current-PC screenshots are `541x961`. The current-PC layout uses:

- `leftX = 0.045`
- `rightX = 0.545`
- `sideWidth = 0.410`
- Stage3 member row top: `0.647`
- Stage3 member row height: `0.112`

Primary Stage3 member row ROIs:

| side | normalized x/y/w/h | pixel x/y/w/h |
| --- | --- | --- |
| self full member row | `0.045 / 0.647 / 0.410 / 0.112` | `24 / 621 / 221 / 107` |
| enemy full member row | `0.545 / 0.647 / 0.410 / 0.112` | `294 / 621 / 221 / 107` |

Current per-slot score crops use three overlapping horizontal slots inside the side ROI:

| side | slot | normalized x range | pixel x/y/w/h |
| --- | --- | --- | --- |
| self | member1 | `0.0450..0.1924` | `24 / 615 / 79 / 38` |
| self | member2 | `0.1721..0.3195` | `92 / 615 / 79 / 38` |
| self | member3 | `0.2992..0.4466` | `161 / 615 / 79 / 38` |
| enemy | member1 | `0.5450..0.6924` | `294 / 615 / 79 / 38` |
| enemy | member2 | `0.6721..0.8195` | `362 / 615 / 79 / 38` |
| enemy | member3 | `0.7992..0.9466` | `431 / 615 / 79 / 38` |

Diagnostics local slot crops derived from the Stage3 member row use similar overlap:

| side | slot | normalized x range | pixel x/y/w/h |
| --- | --- | --- | --- |
| self | member1-slot | `0.0444..0.1941` | `24 / 618 / 81 / 40` |
| self | member2-slot | `0.1701..0.3235` | `92 / 618 / 83 / 40` |
| self | member3-slot | `0.2976..0.4510` | `161 / 618 / 83 / 40` |
| enemy | member1-slot | `0.5434..0.6932` | `294 / 618 / 81 / 40` |
| enemy | member2-slot | `0.6691..0.8226` | `362 / 618 / 83 / 40` |
| enemy | member3-slot | `0.7967..0.9501` | `431 / 618 / 83 / 40` |

Notes:

- The slot crops overlap by roughly 10 to 14 pixels between adjacent slots.
- That overlap is intentional for 7-digit width, but it means crop-level provenance is not as strong as token-center/bounding-box provenance.
- Current diagnostic artifacts preserve crop/variant provenance and raw text, but they do not preserve per-token bounding boxes for every current-PC Stage3 variant crop.
- Without bbox center evidence, a full-row OCR token cannot be deterministically assigned to a slot unless it came from an explicit slot crop.

## Existing Diagnostics Reviewed

Inputs reviewed:

- `docs/current-pc-stage3-member-row-ocr-diagnostics.md`
- `docs/current-pc-stage-wide-solver-stage3-variant-evidence.md`
- `docs/current-pc-ambiguous-exact-candidate-investigation.md`
- existing `tmp/current-pc-stage3-member-row-ocr-diagnostics` artifacts

Relevant existing diagnostics:

| metric | count |
| --- | ---: |
| Stage3 diagnostic artifact rows available under `tmp/` | 27 |
| remaining Stage3 self failures from latest reclassification | 24 |
| missing 7-digit members audited in prior Stage3 row diagnostics | 24 |
| missing 7-digit members recovered by any row/variant OCR | 23 |
| missing 7-digit members recovered by per-slot crops | 10 |
| rows where a per-slot crop found an exact missing 7-digit member | 10 |
| unsafe/noisy variant rows in broad diagnostics | 38 |

Variant exact recovery from prior diagnostics:

| strategy / source | exact 7-digit recoveries | fragment hits | unsafe/noisy rows |
| --- | ---: | ---: | ---: |
| current member-row ROI | 12 | 2 | 4 |
| wider member-row ROI | 16 | 1 | 2 |
| shifted-left ROI | 14 | 3 | 2 |
| shifted-right ROI | 12 | 4 | 6 |
| shifted-up ROI | 10 | 2 | 3 |
| shifted-down ROI | 14 | 2 | 2 |
| taller member-row ROI | 12 | 2 | 7 |
| tighter vertical ROI | 12 | 1 | 4 |
| baseline threshold row variant | 14 | 5 | 1 |
| crown-bonus threshold row variant | 14 | 3 | 4 |
| member1-slot | 1 | 0 | 1 |
| member2-slot | 6 | 0 | 0 |
| member3-slot | 3 | 0 | 2 |
| per-slot crops combined | 10 | 0 | 3 |

## Strategy Evaluation

| strategy | evidence recovered | deterministic slot provenance | wrong-slot risk | result |
| --- | ---: | --- | --- | --- |
| A. fixed normalized thirds | not separately proven | medium | medium | Not enough because 7-digit widths cross boundaries. |
| B. empirically adjusted centers/widths | implied by existing slot crops | medium | low/medium | Helps if used as crop provenance, but still lacks token-center proof. |
| C. non-overlapping narrow slot ROIs | not tested in existing artifacts | potentially high | unknown | Promising diagnostic target, but may drop wide 7-digit text. |
| D. overlapping read ROIs + bbox center assignment | not available in current artifacts | high if bbox exists | low | Best theoretical direction; needs bbox capture for variant OCR. |
| E. OCR full row once, assign by x-position | not available safely without bbox | low today | high | Unsafe with current text-only row evidence. |
| F. hybrid per-slot + full-row consensus | partially tested | medium | medium | Useful for diagnostics, but row-order evidence caused a prior FP. |

Best current strategy: **explicit per-slot crop provenance**.

Why:

- It avoids the previous row-order false positive.
- It recovered 10 missing 7-digit members in prior diagnostics.
- No expected-value wrong-slot assignment was observed when matching explicit slot labels to expected slots.

Why it is still not enough:

- Per-slot crops can emit noisy exact-looking candidates.
- Adjacent slot overlap means crop provenance is weaker than bbox-center provenance.
- The strict exact-only stage-wide solver gets too little incremental full-stage yield.

## Slot-Proven Solver Evidence

The existing slot-proven Stage3 variant solver already tested the safe subset:

- only explicit `member1-slot`, `member2-slot`, `member3-slot` candidates,
- exact numeric candidates only,
- no row-order evidence,
- exact totals and crown-bonus rule,
- unique six-member interpretation.

Results:

| metric | count |
| --- | ---: |
| TP stages with slot-proven policy | 14 |
| FP stages | 0 |
| FN stages | 3 |
| blocked stages | 41 |
| unique additions beyond current production | 2 |
| Stage3 self incremental TP | 2 |
| accepted only by within-one tolerance | 1 |
| strict exact-only true incremental TP | 1 |

Important safety note:

- One incremental TP depends on a `1002601` candidate for expected `1002602`.
- That is within-one, not exact.
- The current task forbids near-match/within-one behavior, so only the strict exact-only incremental TP counts as safe evidence here.

Strict exact-only outcome:

| metric | count |
| --- | ---: |
| strict exact-only TP | 13 |
| strict exact-only FP | 0 |
| strict exact-only true incremental TP | 1 |
| strict exact-only Stage3 self incremental TP | 1 |

## Stage3 Exact-Member Provenance Breakdown

| category | count / status |
| --- | --- |
| exact member value found in row-level variants | high, but unsafe without slot proof |
| exact member value found in explicit per-slot crop | 10 missing 7-digit members in prior diagnostics |
| exact member with deterministic slot provenance and no wrong-slot assignment observed | 10 per-slot hits |
| exact member only in row-order or shifted/taller/wider evidence | common; unsafe |
| exact member absent or partial even after variants | still present in many Stage3 rows |
| exact member found but full six-member equation still incomplete | common |
| exact member found but bonus evidence missing/OCR-confused | common |

This confirms the main bottleneck: capture is often possible, but slot-safe integration is low-yield without bbox-level proof and complete cross-side evidence.

## Why Existing Per-Slot Evidence Is Not Production-Ready

The evidence is stronger than full-row OCR, but still not enough for a new production path:

- The slot crops overlap, so crop membership is not equivalent to token-center membership.
- Current artifacts usually provide crop-level provenance, not word-level bbox/center data.
- Some per-slot crops produce unsafe/noisy extra candidates.
- Strict exact-only incremental gain is only 1 stage beyond current production.
- The original broad variant simulation had 1 FP from row-order provenance, proving that total/crown equations alone can accept wrong slot assignment.

## Simulation Decision

No new `currentPcStage3DeterministicSlotEvidenceSimulation` was added.

Reason:

- A related slot-proven simulation already exists and has been documented.
- Under the current task's exact-only requirement, it does not reach the threshold of at least 2 additional strict exact recoveries.
- The evidence does not yet show at least 2 currently failing stages becoming uniquely solvable with deterministic slot provenance and zero wrong-slot assignment.

## Recommendation

This direction remains promising as diagnostics, not as immediate recovery.

Recommended next step:

1. Add bbox/word-geometry capture for current-PC Stage3 variant crops in a runner-only diagnostics pass.
2. For each numeric token, record:
   - raw token,
   - normalized value,
   - bbox,
   - token center,
   - overlap against all six Stage3 member-slot ROIs,
   - nearest slot center,
   - whether the token crosses slot boundaries,
   - whether it belongs to a concatenated multi-member text run.
3. Test non-overlapping narrow slot windows and bbox-center assignment separately.
4. Only after that, re-run the strict stage-wide solver with bbox-proven slot candidates.

Productionization is not recommended from the current evidence. The exact-only incremental gain is too small, and the remaining failures still need better deterministic slot provenance rather than more arithmetic.
