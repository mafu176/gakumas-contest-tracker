# iPad Stage1/Stage2 Strict Bonus Selection V2 Production

Status: production-enabled with a repository-local kill switch.

## Scope

The production recovery uses the already-audited
`evaluateIpadStage12StrictBonusSelectionV2` helper without changing its
selection semantics. It is limited to iPad Stage1 and Stage2 sides and changes
only the selected bonus. Member values and the displayed total remain
unchanged.

The recovery identifier is:

`ipad-stage12-strict-bonus-selection-v2`

The kill switch is:

`ENABLE_IPAD_STAGE12_STRICT_BONUS_SELECTION_V2`

The committed state is `true`. Set it to `false` in `app/lib/ocr.js` to restore
pre-V2 production behavior.

## Production Order

The effective iPad production order is:

1. Normal iPad candidate processing
2. Tier C exactly-one arithmetic recovery
3. Strict total recovery
4. Strict member2 recovery
5. Stage1/Stage2 strict bonus V2 recovery
6. Final displayed side result

V2 receives the post-recovery Stage1/Stage2 side state and the existing bonus
candidate pools. A stage/side already changed by an earlier recovery is rejected
as an overlap. Stage3 is never evaluated by the production apply function.

## Frozen Guards

An application requires the frozen shared evaluator to return `wouldApply`.
The helper continues to require exact arithmetic and one safe observed bonus
interpretation. Fragment protection, zero handling, provenance acceptance, and
uniqueness rules are unchanged.

The production wrapper adds assertions that:

- displayed members equal the evidence members;
- displayed total equals the evidence total;
- the proposal does not change any member;
- the proposal does not change the total;
- the proposed bonus differs from the current bonus; and
- member sum plus proposed bonus equals the unchanged total exactly.

Malformed or incomplete evidence, overlap with an earlier recovery, a competing
valid interpretation, or any failed assertion produces no application.

## Full-Coverage Audit

The final safety audit covered all 336 Stage1/Stage2 sides from 84 labeled iPad
fixtures:

| Metric | Result |
| --- | ---: |
| Candidate-rich coverage | 336 / 336 |
| V2 wouldApply | 7 |
| TP / FP | 7 / 0 |
| Redundant / conflicts | 0 / 0 |
| Helper parity rows | 336 |
| wouldApply disagreements | 0 |
| Proposal disagreements | 0 |
| Safety mismatches | 0 |

The seven accepted production identities are:

| Image | Stage | Side | Previous bonus | Corrected bonus | Unchanged total |
| --- | ---: | --- | ---: | ---: | ---: |
| IMG_0282.png | 1 | enemy | 3 | 0 | 793118 |
| IMG_0301.png | 1 | enemy | 3 | 0 | 793118 |
| IMG_0320.png | 1 | self | 1 | 59611 | 568752 |
| IMG_0321.png | 1 | self | 1 | 59611 | 568752 |
| IMG_0355.png | 1 | self | 0 | 52273 | 579018 |
| IMG_0356.png | 1 | self | 0 | 43279 | 455998 |
| IMG_0491.png | 1 | enemy | 1 | 0 | 201 |

## Integrated Results

Feature-off behavior reproduces the authoritative pre-V2 baseline:

| Metric | Feature off | Feature on |
| --- | ---: | ---: |
| Exact images | 0 / 84 | 0 / 84 |
| Exact stages | 88 / 252 | 92 / 252 |
| Exact stage/sides | 248 / 504 | 255 / 504 |
| Combined recovery TP / FP | 155 / 0 | 162 / 0 |
| V2 TP / FP | 0 / 0 | 7 / 0 |

`NET_NEW_TP` is 7 and `NET_NEW_FP` is 0. The newly exact stages are:

- IMG_0282.png Stage1
- IMG_0301.png Stage1
- IMG_0355.png Stage1
- IMG_0491.png Stage1

No full image becomes exact from V2 alone.

## Browser Verification

All seven accepted applications were exercised through the normal production
iPad browser path in two fresh Chromium contexts. Both contexts produced the
same seven identities, selected bonuses, final proposals, and recovery
provenance. Each run scored 7 TP / 0 FP, and all 16 production applications in
the focused set were stable across contexts.

The integration does not require a query parameter, developer mode, expected
fixture data, or manually injected candidates. Applied cases are recorded in
the combined iPad production recovery report and the OCR correction log.

## Negative Controls

The focused production regression covers:

- feature-off behavior;
- all seven accepted bonus-only proposals;
- a fragment-hazard candidate;
- a zero/default-zero row whose bonus is already valid;
- a noisy non-matching candidate;
- Stage3 isolation; and
- malformed or incomplete evidence.

The final audit additionally confirmed rejection of multiple-valid,
prefix/suffix fragment, small-number noise, crown-conflict, and harmful
correct-side cases. No candidate-ranking or OCR-capture behavior was changed.

The integrated normal browser path was also run for `IMG_0264.png`,
`IMG_0265.png`, `IMG_0267.png`, and the known fragment-hazard image
`IMG_0324.png`. V2 applied zero times. Existing iPad recoveries produced 8 TP /
0 FP for that focused set, with no unexpected V2 application.

## Cost And Isolation

Productionization adds zero OCR calls, zero crops, zero preprocessing profiles,
and zero model loads. It evaluates only evidence already produced by the iPad
browser path. Smartphone, current-PC, legacy desktop, and iPad Stage3 behavior
remain outside this recovery.

## Rollback

Set `ENABLE_IPAD_STAGE12_STRICT_BONUS_SELECTION_V2` to `false` in
`app/lib/ocr.js`, rebuild, and rerun the focused production regression. The
feature-off branch returns the input stage scores unchanged and records zero V2
applications.

## Production Validation

- iPad expected fixture validation: 84 complete fixtures, 252 stages, 504
  stage/sides; arithmetic and crown rules pass.
- Tier C parity: 504 / 504 exact, 20 TP / 0 FP in the parity fixture set.
- Strict-total parity: 108 / 108 exact, 4 TP / 0 FP.
- Strict-member2 parity: 108 / 108 exact, 8 TP / 0 FP.
- Bonus V2 production regression: feature-off 0 applications; feature-on 7
  applications; malformed, incomplete, fragment, noise, multiple-valid, and
  Stage3 controls 0 applications.
- Smartphone controls `IMG_9311`, `IMG_9321`, and `IMG_9329`: PASS.
- Smartphone known failures `IMG_9308`, `IMG_9310`, and `IMG_9319`: unchanged
  expected failures.
- Current-PC control `144932916`: PASS.
- Legacy desktop `pc-rehearsal-bonus-member-shift.png`: PASS.
- Production build: PASS.
