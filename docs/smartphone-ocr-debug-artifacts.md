# Smartphone OCR Debug Artifacts

Phase 1 smartphone OCR debug artifacts are runner-only JSON files for inspecting
candidate selection failures without changing production OCR behavior.

## Command

```bash
node scripts/ocr-test-images.mjs IMG_9243 IMG_9257 IMG_9268 IMG_9282 IMG_9285 --debug-artifacts
```

`--debug-ocr-artifacts` is also accepted as an alias.

## Output Location

Artifacts are written to:

```text
tmp/ocr-debug-artifacts/
```

The directory is ignored by git and is regenerated on each debug-artifact run.
Each smartphone image gets one `*.debug.json` file, plus `summary.json`.

## Artifact Shape

Each image artifact contains:

- `image`, `category`, `source`: runner image identity and OCR source.
- `expected`, `pass`, `failures`: normal regression comparison context.
- `stages.stageN`: per-stage debug data.
- `stages.stageN.self` / `enemy`: per-side OCR diagnostics.

Per-side data includes:

- `final.members`, `final.total`, `final.memberSum`, `final.totalMinusMemberSum`.
- `equationContext.totalReferences`: displayed-total candidates found by the runner.
- `equationContext.bonusCandidates`: crown/bonus-like candidates.
- `equationContext.matchingBonusCandidates`: bonuses that satisfy
  `memberSum + bonus ~= finalTotal`.
- `candidateSources.totalDirect`: direct total-zone OCR text and parsed numbers.
- `candidateSources.totalCandidates`: alternate total traces.
- `candidateSources.memberCandidates`: selected member-row OCR text and numbers.
- `candidateSources.originalMemberNumbers`: member numbers before slot fallback.
- `candidateSources.memberNumbersAfterSlotFallback`: member numbers after slot fallback.
- `selectionContext`: sparse-slot and crown-inference details already available in
  the runner.
- `knownCorrectionDeltas`: before/after snapshots when filename-keyed stage
  corrections or whole-result known corrections changed a result.

## How This Helps 7-Digit Failure Review

The target 7-digit failures usually come from one of these shapes:

- a real 7-digit member is present in raw OCR but loses to a bonus or total-like
  candidate;
- a crown bonus fills a member slot;
- a displayed total or total fragment is selected as a member;
- a sparse row keeps unrelated nearby text instead of trailing zero slots.

The debug JSON keeps the final values next to raw OCR text, parsed candidates,
bonus evidence, total evidence, and postprocess deltas so those cases can be
classified before adding any production rule.

## Current Limitations

This phase is JSON-only. It does not save crop images or binarized crop images.
Those can be added later if a failure cannot be understood from raw text,
candidate lists, and equation context.
