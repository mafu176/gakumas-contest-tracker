# Current-PC Small-Digit / Near-Value OCR Investigation

Generated: 2026-07-21

## Scope

- Investigation only.
- Production OCR output changed: no.
- New recovery simulation added: no.
- Smartphone OCR changed: no.
- Legacy desktop OCR changed: no.
- Filename/stage-specific logic: no.
- Near-match guessing, edit-distance repair, or missing-digit invention: no.

## Baseline Source

Latest pushed production state includes:

- `currentPcGroupedRawTokenRecovery`
- `currentPcStage3SevenDigitBonusDisplacementRecovery`
- `currentPcCrownBonusRuleRecovery`
- `currentPcStageWideSixMemberCandidateSolverRecovery`
- current-PC browser mode selection fix

The latest documented production accuracy is:

| level | pass | fail | total | accuracy |
| --- | ---: | ---: | ---: | ---: |
| image | 22 | 36 | 58 | 37.9% |
| stage | 130 | 44 | 174 | 74.7% |
| stage/side row | 294 | 54 | 348 | 84.5% |

The previous post-solver reclassification identified 3 remaining rows in the `small digit OCR error / near value` cluster. A targeted current-PC baseline was rerun for those screenshots:

```bash
node scripts/ocr-test-images.mjs --current-pc-baseline 184109879 184125225 081921369
```

The full `--current-pc-baseline` command was also attempted, but it timed out after 20 minutes in this run. No production code was changed.

## Summary

| metric | count |
| --- | ---: |
| near-value cluster rows reviewed | 3 |
| clean true small-digit rows | 1 |
| rows reclassified as broader Stage3 7-digit fragmentation/displacement | 2 |
| rows with exact corrected member value in selected/current parsed candidates | 0 |
| rows where exact corrected member value exists only in raw text | 1 |
| rows where exact corrected total exists in raw/total evidence | 3 |
| rows safe for runner-only near-value recovery simulation | 0 |

Conclusion: near-value work should be deferred as a recovery direction. The only clean small-digit case has exact total evidence, but the corrected member value itself is absent from current OCR evidence. Fixing it would require deriving the member from the total or making a numeric-nearness edit, both of which are explicitly unsafe.

## Case List

| screenshot | stage | side | affected field | expected | selected | diff | exact corrected evidence | root cause | recommendation |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `2026-07-15_184109879.png` | 3 | enemy | member2 | 1114422 | 120363 | -994059 | absent | 7-digit split/truncation plus bonus/member displacement | not a near-value target |
| `2026-07-15_184109879.png` | 3 | enemy | member3 | 1120363 | 224072 | -896291 | absent as reliable member candidate | 7-digit member lost; bonus selected as member | not a near-value target |
| `2026-07-15_184125225.png` | 3 | enemy | member1 | 1098592 | 43851 | -1054741 | raw text / grouped token evidence exists | selected parser dropped the leading 7-digit member and shifted the row | unsafe without complete member2 evidence |
| `2026-07-15_184125225.png` | 3 | enemy | member2 | 1043851 | 344952 | -698899 | absent; raw text has `,043,851` without the leading digit | partial fragment / digit drop | not a near-value target |
| `2026-07-17 081921369.png` | 3 | enemy | member2 | 697055 | 697065 | +10 | absent | OCR digit confusion in member row | no exact evidence, so do not correct |

## Evidence Details

### `2026-07-15_184109879.png` Stage3 Enemy

Expected:

- members: `523915 / 1114422 / 1120363`
- bonus: `224072`
- total: `2982772`

Selected:

- members: `523915 / 120363 / 224072`
- bonus: `0`
- total: `868350`

Evidence:

- Raw member text contains `523,9151,114,421.,120,363` and `+224072`.
- The selected member2 `120363` is the trailing fragment of the expected member3 `1120363`.
- The expected member2 `1114422` is not present as a clean parsed candidate. The closest raw shape is `1,114,421`, which is off by 1 and therefore cannot be used.
- The expected member3 `1120363` is not present as a reliable member candidate; current evidence has only fragments such as `120363`.
- The expected total `2982772` appears in total evidence, including direct text like `"2982772` and split text like `2,982,77 2p`.
- The bonus value `224072` is present, but it is selected as member3 in the current row rather than safely assigned as bonus.

Recovery status:

- grouped/raw recovery rejected: missing a unique grouped-token exact interpretation.
- Stage3 7-digit bonus-displacement recovery rejected: no strict proposal; member evidence is incomplete.
- crown-bonus rule recovery rejected: exact total evidence is not sufficient with the selected incomplete members.
- stage-wide solver rejected: no complete six-member exact-total interpretation.

Classification: this is not a safe small-digit near-value case. It is a Stage3 7-digit fragmentation and bonus/member displacement case.

### `2026-07-15_184125225.png` Stage3 Enemy

Expected:

- members: `1098592 / 1043851 / 344952`
- bonus: `219718`
- total: `2707113`

Selected:

- members: `43851 / 344952 / 219718`
- bonus: `0`
- total: `608521`

Evidence:

- Raw member text contains `1,098,592 ,043,851 344,952` and `+219718`.
- The expected member1 `1098592` appears exactly in raw/member-row text and grouped token evidence.
- The expected member2 `1043851` does not appear exactly. The raw text contains `,043,851`, which is missing the leading `1`.
- The expected member3 `344952` appears exactly, but is shifted into member2 in the selected output.
- The expected bonus `219718` appears exactly, but is shifted into member3 in the selected output.
- The expected total `2707113` appears in total evidence, including `2,707,113`.

Recovery status:

- grouped/raw recovery rejected: missing a unique grouped-token exact interpretation for the complete row.
- Stage3 7-digit bonus-displacement recovery rejected: exact total evidence exists, but there is no strict complete proposal because member2 is not exact.
- crown-bonus rule recovery rejected: selected members do not support the expected equation.
- stage-wide solver rejected: no complete six-member exact-total interpretation.

Classification: one expected 7-digit value exists in raw text but the row still lacks exact member2 evidence. A safe rule would need to invent or infer the missing leading digit of member2, so this is not a near-value candidate.

### `スクリーンショット 2026-07-17 081921369.png` Stage3 Enemy

Expected:

- members: `378443 / 697055 / 463041`
- bonus: `0`
- total: `1538539`

Selected:

- members: `378443 / 697065 / 463041`
- bonus: `0`
- total: `1538549`

Evidence:

- Raw member text contains `378,443 697,065 463,041`.
- The exact corrected member2 `697055` does not appear in current parsed candidates, grouped/raw evidence, or the raw member text inspected for this row.
- The expected total `1538539` appears repeatedly in total evidence, including `1,538,539`.
- The selected total `1538549` is the arithmetic sum of the selected members, so the pipeline is internally consistent with the wrong member value.

Recovery status:

- grouped/raw recovery rejected: no unique exact grouped-token interpretation.
- Stage3 7-digit bonus-displacement recovery rejected: row has only three member values and no bonus-displacement shape.
- crown-bonus rule recovery rejected: exact target total evidence exists, but the corrected member is absent.
- stage-wide solver rejected: no complete exact six-member interpretation.

Classification: this is the only clean true small-digit OCR error in the reviewed cluster. It is still not safe to recover because the exact corrected member value is absent. Correcting it would require a near-match or equation-derived member repair.

## Exact Evidence Availability

| evidence category | cases |
| --- | --- |
| exact value exists in another parsed candidate | none for the corrected near/member values |
| exact value exists in raw text but is unparsed | `2026-07-15_184125225.png` S3 enemy member1 |
| exact value exists in grouped/raw token evidence | `2026-07-15_184125225.png` S3 enemy member1 only |
| exact value exists in Stage3 ROI/preprocessing variant evidence | not used as a safe current-production evidence source in this investigation |
| exact value exists in slot-specific ROI evidence | no safe slot-specific exact-evidence pattern identified |
| exact value absent; only near or partial value exists | `2026-07-15_184109879.png` member2/member3, `2026-07-15_184125225.png` member2, `2026-07-17 081921369.png` member2 |
| exact value fragmented | `2026-07-15_184109879.png`, `2026-07-15_184125225.png` |
| multiple competing exact values | no safe accepted exact interpretation |

## Rejected Approaches

The following approaches remain unsafe and were not implemented:

- Change a digit because the expected total is nearby.
- Apply `+/-1`, within-one, or edit-distance correction.
- Replace `697065` with `697055` because `1538539` is visible.
- Infer `1043851` from the total and the other selected values.
- Use `1,114,421` as `1114422` or `1,098,597` as `1098592`.
- Treat a value selected in the wrong role as a reliable bonus/member without complete unique row evidence.

## Simulation Decision

No `currentPcExactEvidenceNearValueRecoverySimulation` was added.

Reason:

- There are only 3 reviewed near-value cluster rows.
- Only 1 row is a clean small-digit OCR error.
- That clean row lacks exact corrected member evidence.
- The other 2 rows are broader Stage3 7-digit fragmentation/displacement cases.
- No recurring exact-evidence pattern appears in at least 2 confirmed positives.
- A safe guard would need exact corrected value evidence, reliable slot provenance, exact total evidence, crown-bonus consistency where relevant, unique interpretation, and zero false positives across all 58 fixtures. This cluster does not meet that bar.

## Recommendation

Defer or abandon near-value work as a production recovery direction for now.

The current data says small-digit closeness is mostly a symptom, not a safe source of truth. Future work should prioritize evidence quality and provenance instead:

- better Stage3 member-row evidence for missing 7-digit members,
- safer slot-proven ROI evidence,
- bonus evidence capture quality,
- or additional samples that contain exact corrected values in reliable OCR evidence.

Near-value correction should only be revisited if future diagnostics find exact corrected values in reliable slot-specific evidence. Numeric closeness alone should remain explicitly non-actionable.
