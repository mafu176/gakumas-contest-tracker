# iPad Stage1/2 Bonus/Total Provenance Investigation

Status: diagnostic-only. Production OCR behavior was not changed.

## Baseline

| metric | exact / result |
| --- | ---: |
| expected fixtures | 84 |
| stages | 88 / 252 |
| stage/sides | 248 / 504 |
| production recoveries | 155 TP / 0 FP |
| Tier C | 97 TP / 0 FP |
| strict total | 18 TP / 0 FP |
| strict member2 | 40 TP / 0 FP |

This investigation used the one-field-away rows from `tmp/ipad-84-opportunity-reassessment/one-field-away.json` and ran only the minimum target screenshot set through the existing production browser diagnostics path.

## Target Set

| family | rows | unique images |
| --- | ---: | ---: |
| bonus | 15 | 13 |
| total | 4 | 4 |
| combined | 19 | 15 |

Target images:

```text
IMG_0270.png
IMG_0287.png
IMG_0296.png
IMG_0306.png
IMG_0320.png
IMG_0321.png
IMG_0324.png
IMG_0325.png
IMG_0326.png
IMG_0330.png
IMG_0334.png
IMG_0350.png
IMG_0355.png
IMG_0356.png
IMG_0491.png
```

Two fresh Chromium contexts completed. Candidate generation came from `?ipadArithmeticDebug=1`; no OCR pass, ROI, preprocessing, production recovery, or ranking behavior was modified.

## Initial Breakdown

| family | Stage1 | Stage2 | self | enemy |
| --- | ---: | ---: | ---: | ---: |
| bonus | 11 | 4 | 6 | 9 |
| total | 0 | 4 | 2 | 2 |

## Bonus Findings

| step | count |
| --- | ---: |
| one-field-away targets | 15 |
| exact bonus candidate present | 6 |
| stable exact bonus | 6 |
| exact candidate arithmetic-valid | 6 |
| uniquely arithmetic-valid | 6 |
| provenance-safe | 6 |
| fragment-safe | 14 |
| zero/crown-safe | 7 |
| TRUE_STAGE12_BONUS_SELECTION_CEILING | 5 |

Classification:

```json
{
  "P4": 9,
  "P1": 5,
  "P2": 1
}
```

Decision: STRONG PRODUCTION CANDIDATE.

## Total Findings

| step | count |
| --- | ---: |
| one-field-away targets | 4 |
| exact total candidate present | 0 |
| stable exact total | 0 |
| exact candidate arithmetic-valid | 0 |
| uniquely arithmetic-valid | 0 |
| provenance-safe | 0 |
| fragment-safe | 3 |
| magnitude/plausibility-safe | 3 |
| TRUE_STAGE12_TOTAL_SELECTION_CEILING | 0 |

Existing strict-total blocker frequencies:

```json
{
  "missing-observed-total-for-current-fields": 3,
  "selected-non-total-field-lacks-strong-provenance:member2,member3": 1
}
```

Decision: CLOSE FAMILY.

## Safety Controls

| control | result |
| --- | --- |
| zero-bonus safety | 1 policy-eligible zero rows |
| small-number safety | 1 rows blocked by small-number guard |
| fragment safety | 2 rows blocked by fragment guard |
| multiple-valid safety | 13 rows blocked by non-unique arithmetic candidates |
| recovery conflicts | 0 |

Because bonus reached the >=2 TP / 0 FP threshold, an inert shared diagnostic helper was added and evaluated without changing production output:

| parity metric | count |
| --- | ---: |
| rows compared | 15 |
| accepted TP | 5 |
| accepted FP | 0 |
| wouldApply disagreements | 0 |
| proposed recovery disagreements | 0 |
| safety-relevant mismatches | 0 |

## Stage, Side, And Cluster Breakdown

Bonus positions:

```json
{
  "stage1_enemy": 6,
  "stage2_enemy": 3,
  "stage1_self": 5,
  "stage2_self": 1
}
```

Total positions:

```json
{
  "stage2_enemy": 2,
  "stage2_self": 2
}
```

Cluster breakdown:

```json
{
  "bonus": {
    "ipad-01": 14,
    "ipad-02": 1
  },
  "total": {
    "ipad-01": 3,
    "ipad-02": 1
  }
}
```

## Simulated Net Gain

| simulation | NET_NEW_TP | NET_NEW_FP | stage/sides | stages | images |
| --- | ---: | ---: | --- | --- | --- |
| bonus V2 | 5 | 0 | 253 / 504 | 93 / 252 | 0 / 84 |
| total V2 | 0 | 0 | 248 / 504 | 88 / 252 | 0 / 84 |
| combined qualified selectors | 5 | 0 | 253 / 504 | 93 / 252 | 0 / 84 |

The simulated rows are diagnostic-only and are not production proposals unless a family reaches the required threshold.

## Recommendation

Continue with Stage1/2 bonus selection.

Neither Stage3 tuning nor RapidOCR was reopened. The focused Stage1/2 bonus/total provenance capture did not justify a new production rule unless the counts above meet the >=2 TP / 0 FP rule.

Artifacts:

```text
tmp/ipad-stage12-bonus-total-provenance/
```

Production unchanged: no OCR output, recovery guards, ROI, preprocessing, smartphone OCR, current-PC OCR, legacy desktop OCR, idols data, or RapidOCR behavior was modified.
