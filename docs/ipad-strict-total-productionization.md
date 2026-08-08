# iPad Strict Total Productionization

## Summary

`applyIpadStrictTotalSelectionRecovery(...)` productionizes the verified iPad strict total-only selector for the real browser iPad OCR path.

The recovery identifier is `ipad-strict-total-selection`.

The rollback constant is `ENABLE_IPAD_STRICT_TOTAL_SELECTION` in `app/lib/ocr.js`. It defaults to `true` and disables only this recovery.

## Scope

- iPad portrait OCR only.
- Total-only replacement.
- Members and bonus are never changed.
- The corrected total must be a directly observed production T0 total candidate.
- The computed arithmetic total is validation context only and is never treated as OCR evidence.
- No smartphone, current-PC, or legacy desktop path is connected to this recovery.

## Production Order

The iPad browser path now runs:

1. Normal iPad browser OCR candidate collection.
2. Current primary selection.
3. Tier C exactly-one arithmetic recovery.
4. Strict total evidence attachment for the displayed Tier-C-corrected scores.
5. Strict total-only recovery.
6. Final OCR result rendering and correction-log output.

The strict-total recovery skips rows that are already identical after earlier recovery and does not overwrite member or bonus values.

## Guards

The shared `evaluateIpadStrictTotalSelection(...)` helper must return `wouldApply`.

Additional production assertions require:

- displayed members match the verified evidence members,
- proposal members equal selected members,
- proposal bonus equals selected bonus,
- `member1 + member2 + member3 + bonus === proposedTotal`,
- current displayed total differs from the proposed total.

If any assertion fails, the original row is preserved and a diagnostic rejection is recorded.

## Correction Log

Applied rows log:

`ipadStrictTotalSelectionRecovery applied recoveryId=ipad-strict-total-selection stage=... side=... members=... bonus=... previousTotal=... correctedTotal=... observedTotalProvenance=... candidateCount=... uniqueMatch=...`

## Metrics

Two real-browser production runs were stable:

| metric | before | after |
| --- | ---: | ---: |
| image PASS | 0 / 18 | 0 / 18 |
| stage PASS | 8 / 54 | 10 / 54 |
| stage/side PASS | 40 / 108 | 44 / 108 |
| total field PASS | 60 / 108 | 64 / 108 |
| Tier C applications | 24 | 24 |
| Tier C TP / FP | 24 / 0 | 24 / 0 |
| strict-total applications | 0 | 4 |
| strict-total TP / FP | 0 / 0 | 4 / 0 |

Production application rows were stable across both browser runs: 28 / 28.

## Four-Case Audit

| image | stage | side | unchanged members | unchanged bonus | previous total | corrected total |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| IMG_0264.png | 2 | enemy | 33386 / 91957 / 74459 | 0 | 7199802 | 199802 |
| IMG_0278.png | 1 | enemy | 310198 / 348665 / 180900 | 69733 | 909 | 909496 |
| IMG_0300.png | 2 | enemy | 9229 / 84982 / 54708 | 0 | 7148919 | 148919 |
| IMG_0326.png | 2 | enemy | 76798 / 23347 / 11952 | 0 | 112 | 112097 |

All four production applications exactly matched the prior real-browser diagnostic evidence: same image, stage, side, members, bonus, old total, observed total candidate, proposed total, provenance, and completeness state.

## Negative Control

`IMG_0792.png` Stage3 self remains rejected.

Block reasons:

- `truncated-total-candidate-pool`
- `missing-observed-total-for-current-fields`

## Isolation

The production verifier and strict-total browser verifier confirmed:

- Tier C remains 24 TP / 0 FP.
- Strict-total adds 4 TP / 0 FP.
- No unexpected additional applications occur.
- No smartphone, current-PC, or legacy desktop OCR output is changed by this recovery.

## Known Limitations

This recovery does not add total OCR candidates, change ROI/preprocessing, change ranking, repair members, repair bonus, infer missing digits, or use near-match arithmetic. Rows without a directly observed unique matching total candidate remain blocked.
