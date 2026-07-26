# iPad Tier C Arithmetic Selector Productionization

## Scope

Commit scope: enable the browser-native iPad Tier C exactly-one arithmetic selector in the production browser OCR path.

Production recovery id:

`ipad-tier-c-exactly-one-arithmetic`

Rollback point:

`IPAD_TIER_C_EXACTLY_ONE_ARITHMETIC_RECOVERY_ENABLED` in `app/page.js`.

This recovery is iPad-only. It does not run for smartphone, current-PC, legacy desktop, unknown layouts, or landscape images.

## Evidence Source

The production path uses the same browser-native candidate pools that were validated in the iPad browser-native baseline:

- iPad layout detection: `detectIpadOcrLayout(...)`
- ROI template: `buildIpadArithmeticRoiTemplate(...)`
- browser OCR profiles: `getIpadArithmeticPreprocessingProfiles(...)`
- candidate pool builder: `buildIpadArithmeticFieldCandidatePool(...)`
- strict selector helper: `evaluateIpadArithmeticSideSelectionTier(...)`

The production path does not use the Node/Sharp runner candidate path and does not use expected fixture values.

## Production Guards

The production layer applies only when all of the following are true:

- positive iPad layout detection
- portrait orientation
- Tier C helper returns `wouldApply: true`
- exactly one arithmetic-valid tuple exists
- member, bonus, and total candidates are observed by the browser-native iPad field pools, except schema-default bonus zero under the helper's existing Tier C rule
- no truncated candidate pools
- no duplicate tuple provenance conflict
- proposal differs from the current browser-native primary tuple
- arithmetic assertion holds exactly:
  `member1 + member2 + member3 + bonus = total`

The recovery replaces only the affected side tuple atomically:

- member1
- member2
- member3
- side total

Bonus is retained in recovery metadata for diagnostics and validation. No crown/cross-side inference is used.

## Ordering

The iPad Tier C production recovery runs after the normal OCR stage extraction has completed and before final OCR scores are rendered/set.

It is independent from current-PC and smartphone production recoveries. Existing current-PC, smartphone, and legacy desktop paths remain unchanged.

## Metadata

Production diagnostics include:

- recovery id
- stage
- side
- old browser-native primary values
- displayed values before replacement
- new values
- changed fields
- selected tuple provenance
- valid tuple count
- candidate completeness
- schema-default bonus-zero usage
- exact equation

Counters include:

- evaluated
- eligible
- blocked incomplete
- blocked truncated
- blocked zero tuple
- blocked multiple
- blocked already identical
- applied
- arithmetic assertion failures

Debug export remains development-only via `?ipadArithmeticDebug=1`; the recovery itself does not require the debug panel.

## Production Verification

Command:

```bash
node scripts/ipad-browser-production-verification.mjs --runs 2
```

Artifacts:

`tmp/ipad-browser-production-verification/`

Expected result:

- 18 / 18 images processed per run
- production applications: 9
- TP: 9
- FP: 0
- final stage/side PASS: 25 / 108
- two fresh runs have stable application identities and tuples
- every application matches the prior browser-native Tier C simulation proposal

The verification script compares each production application against:

`tmp/ipad-browser-native-baseline/changed-proposals.json`

Verified production result:

- command: `PLAYWRIGHT_NODE_MODULES=tmp/playwright-env/node_modules node scripts/ipad-browser-production-verification.mjs --runs 2`
- two browser runs completed
- 18 / 18 images processed in both runs
- production applications: 9 in both runs
- TP: 9 in both runs
- FP: 0 in both runs
- final stage/side PASS: 25 / 108 in both runs
- application comparison against prior browser-native Tier C proposals: 9 / 9 exact in both runs
- stable application rows: 9 / 9

## Baseline Result

Browser-native diagnostic baseline before production:

- image PASS: 0 / 18
- stage PASS: 1 / 54
- stage/side PASS: 16 / 108
- exact fields: 293 / 540

Tier C browser-native simulation:

- eligible: 15
- wouldApply: 9
- TP: 9
- FP: 0
- simulated stage/side PASS: 25 / 108
- simulated stage PASS: 4 / 54
- simulated image PASS: 0 / 18

Production verification is expected to match the simulation exactly for the 9 accepted proposals.

## Non-Goals

This change does not:

- alter iPad ROI geometry
- alter iPad preprocessing
- broaden Tier C helper semantics
- add iPad crown-bonus or stage-wide solving
- use expected values in production
- change smartphone OCR
- change current-PC OCR
- change legacy desktop OCR
