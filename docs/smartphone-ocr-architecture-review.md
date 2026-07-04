# Smartphone OCR Architecture Review

## Scope

This review focuses on smartphone/mobile OCR reliability, especially 7-digit member scores and totals.

No production OCR code was changed. No known corrections were removed. Desktop/PC OCR behavior is out of scope except where it provides useful runner/audit lessons.

Inputs reviewed:

- `app/lib/ocr.js`
- `app/lib/ocrPostProcess.js`
- `app/page.js`
- `scripts/ocr-test-images.mjs`
- `regression-test/expected/`
- `docs/ocr-known-correction-removal-candidates.md`
- `docs/ocr-expected-json-draft-review.md`
- `docs/ocr-digit-drop-rule-design.md`
- `docs/ocr-member-order-audit-report.md`
- `docs/ocr-total-only-deep-dive.md`
- `docs/pc-ocr-status-current.md`

Reference-app lesson:

- Do not trust one OCR pass.
- Use fixed score-focused geometry.
- Preserve OCR token/line evidence.
- Validate with member/bonus/total equations.
- Retry only suspicious rows.
- Save debug artifacts for every crop and decision.

## Current Smartphone OCR Pipeline

### Preprocessing

The current OCR path uses `createPreprocessedStageBlob(...)` with preset-specific contrast, brightness, hard threshold, color preservation, and upscaling. Score-specific presets include:

- `score-slot`
- `crown-bonus`
- next-screen fallback presets

The current preprocessing is useful, but it is still a shared crop-level transform. It does not yet provide a dedicated smartphone white-text-only pass that aggressively preserves bright score text while suppressing idol art, colored UI, and decoration noise.

### Crop Strategy

The OCR pipeline uses fixed layout helpers:

- `getFixedOcrZones(...)`
- `getAlternativeTotalZones(...)`
- `getAlternativeMemberZones(...)`
- `getCrownBonusZones(...)`
- `getMemberScoreSlotZones(...)`

The browser path in `app/page.js` extracts per-stage self/enemy totals, member rows, alternative total candidates, crown bonus candidates, and sometimes slot-level member candidates. The runner mirrors this in `scripts/ocr-test-images.mjs`.

This is directionally correct, but current smartphone member selection still frequently depends on broader row crops and raw numeric candidate lists. When a 7-digit score is split, truncated, or adjacent to a bonus/total, the final selector may choose a plausible but wrong equation.

### Parsing And Candidate Selection

Raw OCR text is converted with `extractNumbersForZone(...)`, then totals and members are selected through:

- `pickTotalNumber(...)`
- `pickMemberNumbers(...)`
- `inferCrownBonusFromMemberNumbers(...)`
- `pickTotalWithMemberFallback(...)`
- smartphone generic post-process rules:
  - `applySmartphoneCrownBonusMemberExclusion(...)`
  - `applySmartphoneSparseTrailingZeroPreservation(...)`
  - `applySmartphoneTotalLikeMemberSuppression(...)`
  - `applySmartphoneTotalCrownBonusRecovery(...)`

Filename-keyed known corrections remain in `applyKnownOcrCorrections(...)`, and whole-result fallback exists for the IMG_9251 browser filename mismatch.

### Debug And Audit

The runner already produces useful reports:

- `docs/ocr-test-report.md`
- `docs/ocr-raw-token-fragment-audit.md`
- `docs/ocr-member-order-audit-report.md`
- `docs/ocr-geometry-audit-report.md`
- `docs/ocr-digit-drop-audit-detector-report.md`

Runner-only geometry audit can capture Tesseract word/symbol bbox data, but this is not yet integrated into a next-generation smartphone extraction candidate model.

## Why 7-Digit Scores Are Fragile

### 1. Split Or Truncated Member Values

7-digit scores are often rendered tightly, close to commas, adjacent slots, plus signs, or idol artwork. OCR may return:

- a suffix fragment instead of the full value
- a value split across tokens
- a malformed comma/period version
- a joined total/member/bonus string

Representative cases:

| Image/key | Failure shape | Current status |
| --- | --- | --- |
| `IMG_9243.png:stage2` | selected `19217` while raw candidates contain `119217`; correct enemy members are `190814 / 119217 / 100783` with bonus `38162` | Keep individual; digit-drop production rule not safe yet |
| `IMG_9257.png:stage3` | runner read `65563` instead of visual `65532` | Narrow known correction; not enough for generic digit repair |
| `IMG_9267.png:stage1` | enemy member2 read `16161` instead of `116161` | Narrow known correction |
| `IMG_9282.png:stage3` | `254.591` was present in raw text but parser only selected `273656` | Narrow known correction |

### 2. Crown Bonus Selected As Member

High-score Stage2 rows often have 7-digit members plus a 5-6 digit crown bonus. When a real 7-digit member is missed, the bonus may be selected as member3.

Representative cases:

- `IMG_9257.png:stage2`
- `IMG_9264.png:stage2`
- `IMG_9266.png:stage2`
- `IMG_9268.png:stage2`
- `IMG_9281.png:stage2`
- `IMG_9282.png:stage2`
- `IMG_9285.png:stage2`

Existing generic crown exclusion helps only when enough equation evidence exists. Many remaining cases still need filename corrections because the missing high member is not reliably recovered.

### 3. Total Or Aggregate Candidate Selected As Member

When total-like values are in the same broad crop, the selector may pick a displayed total or member-sum fragment as a member. The current total-like suppression rule reduced some cases, but broad production digit/total repair remains risky.

Representative cases:

- `IMG_9245.png:stage1` and `IMG_9245.png:stage2` were proven safe and removed after generic rules.
- `IMG_9165.png:stage2` still needs individual handling.
- `IMG_9240.png:stage3` is primarily slot/order and total-delta risk.

### 4. Total Equals Member Sum But Should Include Bonus

For some 7-digit Stage2 rows, members are already correct but the total is only the member sum. The generic Stage2 total crown bonus recovery now handles proven cases:

- `IMG_9250.png:stage2`
- `IMG_9265.png:stage2`
- `IMG_9267.png:stage2`

The guard was tightened after `IMG_9285` showed a malformed `$98,088`-like fragment could masquerade as a bonus.

### 5. Missing Geometry In Production Selection

The runner can audit geometry, but production selection still largely compares lists of numbers after OCR. Without token bbox/slot provenance in the candidate model, the code cannot reliably know whether a number belongs to:

- member slot 1, 2, or 3
- displayed total
- crown bonus
- total-power UI
- unrelated image/UI text

This is the main blocker for safe generic member-order or digit-fragment recovery.

## Representative Risky Images

High priority 7-digit/member recovery examples:

- `IMG_9257.png`: Stage2 high member missing/crown-as-member; Stage3 local digit misread.
- `IMG_9264.png`: Stage2 high member missing; Stage3 sparse/crown blank-slot risk.
- `IMG_9266.png`: Stage2 high member missing/crown-like member.
- `IMG_9268.png`: Stage2 high member case; Stage3 total needs `+77249` but bonus is not reliably extracted.
- `IMG_9281.png`: Stage2 high member missing; Stage3 sparse total/member shift.
- `IMG_9282.png`: Stage2 high-score row; Stage3 sparse row with `254.591` parser issue.
- `IMG_9285.png`: Stage2 total bonus guard issue fixed; Stage3 sparse case still individual.
- `IMG_9243.png`: digit fragment plus missing clean total candidate.

Safety fixtures that must remain stable:

- `IMG_9251`
- `IMG_9180`
- `IMG_9250`
- `IMG_9265`
- `IMG_9267`
- `IMG_9282`
- `IMG_9285`
- desktop `スクリーンショット 2026-06-07 111730.png`

## Next-Generation Smartphone OCR Design

### A. ROI And Crop Strategy

Use fixed smartphone layout first, not broad image OCR.

For each stage and side, extract:

- stage total band
- member slot 1
- member slot 2
- member slot 3
- full member row band
- crown bonus band
- narrow plus/bonus candidate zones
- optional total-row wide band for fallback only

Each OCR token should carry:

- stage
- side
- semantic zone: `member-slot`, `member-row`, `total`, `bonus`, `wide-row`
- slot index if applicable
- raw text
- parsed numeric candidates
- confidence
- bbox relative to crop
- bbox relative to full image
- preprocessing preset/pass id

### B. Preprocessing Strategy

Add a smartphone score-only preprocessing family in the runner first:

1. Current preprocessing baseline.
2. White-text binarization:
   - preserve pixels where RGB is bright and near-white, starting around `r/g/b > 190`
   - suppress saturated backgrounds and idol art
   - tune by stage/side samples rather than globally
3. Stronger white-text binarization:
   - higher brightness threshold
   - slightly expanded white mask
4. Slot upscaling:
   - 2x or 4x crop upscaling
   - single-line OCR for individual slots
5. Wide sparse-text pass:
   - use only when slot pass fails or equation is inconsistent

The goal is not to make every crop sharper; it is to make score glyphs survive while non-score text disappears.

### C. OCR Pass Strategy

Use multi-pass OCR with lazy retries:

1. First pass:
   - total band
   - three member slots
   - crown bonus band
2. Build candidate graph and validate equations.
3. If valid, stop.
4. If suspicious, retry only the failing row/slot:
   - alternate white-text binarization
   - single-line slot OCR
   - wider row sparse-text OCR
   - bonus-specific OCR
5. Re-run equation solver with new candidates.

Suspicious row triggers:

- selected member is 4-5 digits but nearby raw candidate has 6-7 digits containing it
- selected total equals member sum while bonus candidate exists
- selected member equals explicit bonus candidate
- selected member equals displayed total or total-like candidate
- fewer than expected visible member slots and no sparse evidence
- total/member equation cannot be satisfied
- 7-digit member expected by row scale but only 5-6 digit candidates selected

### D. Candidate Model

Model OCR output as candidates, not final numbers:

```text
candidate {
  value,
  rawText,
  normalizedText,
  stage,
  side,
  zoneKind,
  slotIndex,
  passId,
  confidence,
  bbox,
  sourcePriority,
  reasons: []
}
```

Source priority should generally be:

1. member slot crop with good confidence and slot bbox
2. member row crop with bbox matching the slot
3. total band for displayed total only
4. crown bonus band for bonus only
5. wide row fallback as evidence, not direct selection

7-digit values must remain valid member candidates. Large values should be rejected only when geometry/equation proves they are totals or joined noise.

### E. Geometry Scoring

Assign values to slots using x-position and crop provenance before arithmetic repair:

- member slot crop value is preferred for its slot
- row-band tokens are assigned by x center to slot boundaries
- total-band values should not become members unless the same value appears in member zone or equation demands it
- bonus-band values should not become members unless there is no plus/bonus evidence and geometry says it is inside a member slot

Keep y-position grouping simple:

- Stage1/2/3 known y bands from fixed layout
- side determined by known self/enemy x bands
- crop-local bbox converted to full-image bbox for audit

### F. Equation Solver

Treat member slots as primary, totals and bonuses as validation evidence.

For each stage/side:

1. Generate candidate sets for slot1/slot2/slot3.
2. Generate bonus candidates from explicit bonus zones.
3. Generate displayed total candidates from total zones.
4. Score combinations:
   - slot provenance
   - confidence
   - 7-digit preservation
   - no explicit bonus in member slot
   - no total candidate in member slot
   - equation match
5. Accept only when the best combination is unique and clears a confidence margin.

Equation forms:

```text
member1 + member2 + member3 = total
member1 + member2 + member3 + bonus = total
member1 + bonus = total for sparse one-member rows
member1 + member2 + bonus = total for sparse two-member rows
```

Digit-fragment repair should remain conservative:

- never invent digits
- require the full replacement value to be observed
- require the selected fragment to be substring/suffix of observed replacement
- require a unique equation
- require total evidence from clean total OCR or token-fragment audit

### G. Known Correction Compatibility

Keep existing known corrections as final fallback while the new extractor is evaluated.

Recommended execution order during rollout:

1. current pipeline
2. new candidate extractor in audit-only mode
3. compare current output vs candidate output vs expected JSON
4. if candidate output is better and has no regressions, optionally enable behind a local flag
5. only after repeated proof, remove covered filename corrections

Do not remove `IMG_9251` tiny sparse known corrections until the new pipeline proves those exact cases.

### H. Debug Output Format

Add a runner-only debug bundle per image:

```text
tmp-ocr-debug/
  IMG_XXXX/
    stage2-self/
      total-original.png
      total-binarized-white.png
      member-slot1-original.png
      member-slot1-binarized-white.png
      member-slot2-original.png
      member-slot2-binarized-white.png
      member-slot3-original.png
      member-slot3-binarized-white.png
      bonus-original.png
      bonus-binarized-white.png
      candidates.json
      decisions.md
```

`candidates.json` should include:

- every raw token
- bbox
- confidence
- zone/pass
- parsed numeric values
- normalized numeric values
- rejected/adopted reason
- equation attempts and scores

`decisions.md` should include:

- selected members/bonus/total
- competing equations
- why suspicious retry did or did not run
- known correction applied, if any

## Staged Implementation Plan

### Phase 1: Audit And Debug Artifacts

Production output unchanged.

Tasks:

1. Add runner-only smartphone debug artifact mode, for example:

```bash
node scripts/ocr-test-images.mjs IMG_9282 --smartphone-ocr-debug
```

2. Save original and white-binarized crops for total/member slots/bonus zones.
3. Capture Tesseract word/symbol bbox data for smartphone crops, like the existing geometry audit does.
4. Emit `candidates.json` and `decisions.md`.
5. Add a report section that compares:
   - current OCR output
   - known-corrected output
   - candidate extractor proposal
   - expected JSON

Highest-impact Phase 1 target images:

- `IMG_9243`
- `IMG_9257`
- `IMG_9264`
- `IMG_9268`
- `IMG_9281`
- `IMG_9282`
- `IMG_9285`

### Phase 2: Parallel Smartphone Extractor

Production output unchanged by default.

Tasks:

1. Implement `extractSmartphoneScoreCandidates(...)` in a runner-only or disabled-by-default module.
2. Add white-text binarization presets.
3. OCR per-slot and per-total crops with multiple passes.
4. Build candidate graph with geometry provenance.
5. Run equation solver.
6. Produce candidate output without mutating app output.

Implementation location:

- Prefer a new helper under `scripts/` or a non-default export from `app/lib/ocr.js` only if it does not alter runtime behavior.
- Do not wire into `app/page.js` until Phase 4.

### Phase 3: Evaluation

Run existing fixtures and new 7-digit samples.

Required mobile fixture set:

- `IMG_9180`
- `IMG_9250`
- `IMG_9251`
- `IMG_9254`
- `IMG_9257`
- `IMG_9264`
- `IMG_9265`
- `IMG_9266`
- `IMG_9267`
- `IMG_9281`
- `IMG_9282`
- `IMG_9283`
- `IMG_9284`
- `IMG_9285`

Add or confirm more expected fixtures for:

- `IMG_9268`
- any new 7-digit user screenshots
- browser-upload cases where filename-keyed known correction does not fire

Metrics:

- exact stage/side/member/total accuracy
- count of fixed 7-digit member failures
- count of regressions
- count of known corrections made redundant
- ambiguous candidate count
- average OCR time per image
- retry count per image
- confidence/equation score margin

### Phase 4: Controlled Enablement

Enable only after Phase 3 proves improvement.

Options:

1. Add an experimental OCR mode in runner only.
2. Add browser debug toggle hidden from normal users.
3. Enable for smartphone only when:
   - current pipeline fails equation validation
   - new extractor has unique high-confidence equation
   - output does not conflict with sparse/tiny-score guards

Do not enable globally until:

- all existing mobile fixtures pass
- at least 10-20 7-digit-heavy samples pass
- no desktop/PC code path imports the new smartphone extractor

## Evaluation Requirements

### Must-Pass Existing Cases

Minimum smoke before any production enablement:

```bash
node scripts/ocr-test-images.mjs IMG_9257
node scripts/ocr-test-images.mjs IMG_9282 IMG_9285
node scripts/ocr-test-images.mjs IMG_9251 IMG_9180
node scripts/ocr-test-images.mjs IMG_9250 IMG_9265 IMG_9267
node scripts/ocr-test-images.mjs IMG_9254 IMG_9264 IMG_9266 IMG_9281
node scripts/ocr-test-images.mjs --source desktop "desktop/スクリーンショット 2026-06-07 111730.png"
npm run build
```

Additional full mobile regression can be run after the candidate pipeline stabilizes.

### Needed User Screenshots

The most valuable user-provided screenshots are:

- smartphone result screens with Stage2 7-digit member scores
- cases where a visible 7-digit member is dropped and crown bonus becomes member3
- cases where total displays as 7 digits but runner sees fragments like `2.851 0535`
- cases where browser upload differs from runner due to filename/sourceName
- sparse Stage3 rows with one or two members and a visible crown bonus
- screenshots before any cropping or compression by chat apps

For each screenshot, manual confirmation should include:

- stage
- self/enemy side
- three member values including blanks
- crown bonus if visible
- displayed total

## Root Causes

1. Current candidate selection sometimes trusts broad OCR rows where total, members, and bonus are mixed.
2. 7-digit values are not rejected, but they are fragile because they are often split, truncated, or displaced before selection.
3. Existing arithmetic repair runs after OCR parsing, but it lacks enough source geometry to decide whether a raw value is a slot member, total, or bonus.
4. Bonus extraction is useful but incomplete; some visible bonuses are not clean numeric candidates.
5. Displayed totals often appear as fragments, so equation validation sometimes lacks a clean total candidate.
6. Known corrections have accumulated because the current pipeline can fix individual symptoms but cannot yet prove safe generic repairs for digit-drop/member-order cases.

## Recommended Next Step

Implement **Phase 1: runner-only smartphone OCR debug artifacts**.

This has the best risk/reward ratio:

- no production OCR behavior changes
- no mobile regression risk
- directly addresses missing evidence for 7-digit failures
- lets us compare current OCR, known corrections, and a future candidate extractor
- creates artifacts that users and developers can inspect visually

The first implementation should target `IMG_9243`, `IMG_9282`, `IMG_9268`, and `IMG_9257`, because together they cover digit fragments, missing high members, sparse row recovery, and crown/total evidence gaps.

## Risks

- A generic digit-drop rule can easily corrupt legitimate small scores if it infers digits instead of using observed replacements.
- A generic member-order rule can reorder correct rows without bbox/slot evidence.
- A broad total crown rule can inflate correct totals using malformed member fragments as bonuses, as seen in the `IMG_9285` guard issue.
- More OCR passes can slow browser uploads unless retries are limited to suspicious rows.
- Debug artifacts may become large; keep them runner-only and opt-in.
- Tesseract bbox output may vary across versions, so geometry should be a scoring signal rather than the only truth.

## Decision

Do not rewrite production OCR yet.

Proceed with runner-only debug artifacts and a parallel smartphone candidate extractor. Promote to production only after fixture-backed evaluation proves that it fixes 7-digit score failures without regressing existing mobile and desktop safety cases.
