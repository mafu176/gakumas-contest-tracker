# Smartphone OCR Fixed ROI Experiment

This is a runner-only Phase 2 experiment for smartphone OCR. It extracts
candidate numbers from fixed score-focused regions of interest (ROIs) and writes
comparison JSON without changing the normal OCR result.

## Command

```bash
node scripts/ocr-test-images.mjs IMG_9243 IMG_9257 IMG_9268 IMG_9282 IMG_9285 --fixed-roi-experiment
```

`--smartphone-roi-experiment` is accepted as an alias.

## Output Location

Generated artifacts are written to:

```text
tmp/ocr-roi-experiment/
```

The directory is ignored by git and regenerated on each ROI experiment run.

## Current ROI Zones

For each smartphone image, stage, and side, the runner extracts:

- `direct-total-band`: the fixed total band used by the current OCR path.
- `direct-member-row-band`: the fixed member row band used by the current OCR path.
- `member-slot-1`, `member-slot-2`, `member-slot-3`: fixed per-slot score crops
  using the existing member score slot geometry.
- `bonus-wide-plus-band`: a wide crown/plus bonus crop that requires explicit
  plus evidence.
- `bonus-slot-band-1..3`: narrower bonus/slot-adjacent crops.

Desktop/PC images are skipped. The experiment is not used by `app/page.js`.

## JSON Fields

Each image artifact includes:

- `image`, `source`, `category`, and `imageSize`.
- `expected`, `pass`, and `failures` from the normal runner comparison.
- `stages.stageN.self` and `stages.stageN.enemy` sections.

Each stage/side section includes:

- `current.members` and `current.total`: the normal OCR output after existing
  postprocess/known corrections.
- `expected.members`, `expected.total`, `expected.sevenDigitMembers`: fixture
  values when an expected JSON exists.
- `roiCandidateNumbers`: unique values parsed from all fixed ROI crops.
- `expectedValuesFound`: expected member/total values present in ROI candidates.
- `expectedSevenDigitMembersFound`: expected 7-digit member values present in
  ROI candidates.
- `expectedSevenDigitMembersNearFound`: expected 7-digit member values with a
  nearby ROI candidate, currently using a tight delta for audit evidence only.
- `zones`: per-ROI details with:
  - `zoneType`
  - `zoneRole`
  - `slotIndex` when applicable
  - crop coordinates
  - raw OCR text
  - parsed candidates
  - clean 7-digit candidates parsed directly from the zone text
  - fragment candidates from long digit/separator runs
  - possible joined candidates from split comma/period/space groups and
    7-digit sliding windows
  - bonus-specific candidates for bonus zones
  - OCR pass/preset name

## How To Use It

Use this output to answer whether a missing value is absent from OCR entirely or
present in a better-scoped ROI than the current broad row selection.

Useful questions:

- Does a missing 7-digit member appear in `member-slot-*`, only in the broad
  member row, or only as a fragment/join suggestion?
- Does a bonus value appear only in `bonus-*` zones, or is it bleeding into
  member slots?
- Does a displayed total appear in the total band but not as a member-slot
  candidate?
- Are expected 7-digit values present in ROI candidates even when the current
  selected members rely on a known correction?

## Current Limitations

This experiment only emits candidate evidence. It does not propose a replacement
result, score equations, or affect pass/fail. It also does not save crop images
yet; crop coordinates are included so image export can be added later.

## Initial Target Run Notes

Initial command:

```bash
node scripts/ocr-test-images.mjs IMG_9243 IMG_9257 IMG_9268 IMG_9282 IMG_9285 --fixed-roi-experiment
```

The normal runner comparison still passed for the fixture-backed target images.
The ROI experiment wrote five per-image JSON files plus `summary.json`.

Updated observations after split-value candidate extraction:

- `IMG_9257` S2 enemy expected 7-digit member `1054601` appears in ROI
  candidates.
- `IMG_9285` S2 self expected 7-digit member `1001539` appears in ROI
  candidates.
- `IMG_9268` has no committed expected fixture, but ROI candidates include
  7-digit values such as `1479757`, `1155957`, and `1073008`.
- `IMG_9282` S2 self now surfaces split/join evidence from the raw member-row
  text. The exact expected `1086075` appears as a joined candidate, while
  `1204215` and `1259738` have nearby joined candidates `1204211` and
  `1259734` with delta `4`. These near matches are useful audit evidence, but
  not production-safe corrections.
- Some bonus ROIs can still emit joined or noisy values, for example `1200507`
  in `IMG_9285` S2 self, so bonus candidates must remain advisory until an
  equation/zone guard is added.

## Split 7-Digit Candidate Extraction

The experiment now records split/truncated 7-digit evidence without changing
normal OCR output:

- Long digit/separator runs are preserved as `fragmentCandidates`, including
  the raw OCR text and continuous digit string.
- `possibleJoinedCandidates` includes 7-digit sliding windows across continuous
  digit runs. This catches cases where OCR merges adjacent scores into one long
  run.
- `possibleJoinedCandidates` also includes separator-group joins, such as
  comma, period, or space-separated fragments that may form one score.
- `summary.json` reports exact and near expected 7-digit hits so target images
  can be triaged quickly.

The joined candidates are intentionally audit-only. For IMG_9282, the useful
near matches still contain OCR digit errors, so a future production rule would
need stronger evidence than simple substring/window matching.
