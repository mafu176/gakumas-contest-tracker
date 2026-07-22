# Smartphone Crown Bonus / Stage-Wide Solver Investigation

This is a runner-only investigation. It corrects confirmed smartphone expected-fixture transcription errors and adds smartphone-native crown-bonus and stage-wide six-member solver simulations behind an explicit runner flag. It does not change production OCR output.

## Corrected Fixture Errors

The 7 mismatch stages from `docs/smartphone-crown-bonus-rule-mismatch-investigation.md` were all confirmed as expected-fixture transcription or assignment errors from the source screenshots. Only those fields were changed:

| fixture | stage | correction |
| --- | --- | --- |
| `IMG_9163.json` | S1 self | total `653835` -> `653833` |
| `IMG_9165.json` | S2 enemy | total `300166` -> `332234` |
| `IMG_9250.json` | S1 enemy | total `1086665` -> `1086663` |
| `IMG_9264.json` | S2 self | members `[638016, 755237, 0]` -> `[638016, 1009315, 755237]` |
| `IMG_9281.json` | S3 enemy | total `1011905` -> `1011903` |
| `IMG_9315.json` | S2 self | member3 `162915` -> `162515` |
| `IMG_9319.json` | S2 self | member1 `208530` -> `208330` |

## Fixture Rule Validation

After those corrections, the smartphone expected fixture set validates against the crown-bonus rule:

```text
crownBonus = floor(max(all six raw member scores) * 0.20)
```

| metric | count |
| --- | ---: |
| smartphone expected fixtures | 89 |
| stages checked | 267 |
| floor-rule matches | 267 / 267 |
| mismatches | 0 |
| exactly one bonus side | 267 / 267 |
| floor matches | 267 |
| round-to-nearest matches | 164 |
| ceil matches | 48 |
| floor-distinguishing stages | 219 |

Conclusion: the fixture-backed smartphone samples now support the same `floor(max * 0.20)` crown-bonus rule as current-PC. There are no known genuine game-rule exceptions in the 89-fixture smartphone set.

## Runner-Only Simulations Added

`scripts/ocr-test-images.mjs` now supports:

```bash
node scripts/ocr-test-images.mjs IMG_9308 IMG_9310 IMG_9319 IMG_9311 IMG_9321 IMG_9329 --smartphone-crown-stage-wide-solver-sim
```

The flag writes the normal runner reports plus:

```text
tmp/smartphone-crown-bonus-stage-wide-solver-simulation.json
docs/smartphone-crown-bonus-stage-wide-solver-investigation.md
```

### `smartphoneCrownBonusRuleSimulation`

Strict guards:

- smartphone-only runner analysis
- six currently selected members complete
- unique global rank-1
- `crownBonus = floor(globalMax * 0.20)`
- exact self total evidence
- exact enemy total evidence
- exact equality only
- no member changes
- no near-match or within-one tolerance
- no digit inference
- no missing-member invention

### `smartphoneStageWideSixMemberCandidateSolverSimulation`

Strict guards:

- smartphone-native candidate sources only
- selected members plus normal-path raw member-row candidates
- exact observed candidates only
- one candidate per six member slots
- unique global rank-1
- derived crown bonus
- exact self total evidence
- exact enemy total evidence
- both equations exact
- exactly one changed six-member interpretation
- no arithmetic-derived members
- no near-match or within-one tolerance

The stage-wide solver intentionally does not import current-PC ROI, grouped/raw token, or current-PC recovery evidence.

## Targeted OCR Evaluation

Full OCR evaluation across all 89 smartphone fixtures was attempted with the new simulation flag but did not complete inside a 2-hour runner window. Because the script writes the aggregate report only at completion, no all-89 simulation counts were produced in this run.

The required known-failure and PASS-control set was run successfully:

```bash
node scripts/ocr-test-images.mjs IMG_9308 IMG_9310 IMG_9319 IMG_9311 IMG_9321 IMG_9329 --smartphone-crown-stage-wide-solver-sim
```

Targeted result:

| set | result |
| --- | --- |
| images | 6 |
| expected | 6 |
| failed | 3 |
| `IMG_9311` | PASS |
| `IMG_9321` | PASS |
| `IMG_9329` | PASS |
| `IMG_9308` | known failure remains |
| `IMG_9310` | known failure remains |
| `IMG_9319` | known failure remains |

Targeted simulation counts:

| simulation | stages audited | TP | FP | FN | blocked | true incremental TP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `smartphoneCrownBonusRuleSimulation` | 18 | 0 | 0 | 0 | 18 | 0 |
| `smartphoneStageWideSixMemberCandidateSolverSimulation` | 18 | 0 | 0 | 0 | 18 | 0 |

## Known Failure Impact

| image | crown-bonus simulation | stage-wide solver simulation | reason |
| --- | --- | --- | --- |
| `IMG_9308` | no help | no help | strict evidence still cannot accept the near 7-digit candidate |
| `IMG_9310` | no help | no help | Stage3 sparse total-as-member/member displacement remains outside these guards |
| `IMG_9319` | no help | no help | remaining S2 enemy mismatch is not solved by exact crown/stage-wide evidence |

## Recommendation

The fixture rule itself is now confirmed `267 / 267`, so smartphone crown-bonus reasoning is valid as a game rule.

Productionization is not recommended from this task. The runner-only simulations exist, but the full 89-fixture OCR evaluation did not complete in this run, and the targeted known-failure set produced `0` true incremental TP. The next safe step is either:

1. run the new simulation flag in a longer OCR job or in smaller committed-summary batches until all 89 fixtures are measured, or
2. continue smartphone-native evidence-capture work for the known failures before considering parity.

- production OCR changed: no
- current-PC OCR changed: no
- legacy desktop OCR changed: no
