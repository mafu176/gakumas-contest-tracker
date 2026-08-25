# iPad Stage1/2 Strict Bonus Selection V2 Production Readiness

Status: diagnostic-only. The selector is still not wired into production OCR.

## Baseline

| metric | result |
| --- | ---: |
| images exact | 0 / 84 |
| stages exact | 88 / 252 |
| stage/sides exact | 248 / 504 |
| existing recoveries | 155 TP / 0 FP |
| Tier C | 97 TP |
| strict-total | 18 TP |
| strict-member2 | 40 TP |

## Frozen Helper

Reviewed helper:

```text
evaluateIpadStage12StrictBonusSelectionV2
```

The helper is expected-blind. It receives only iPad layout metadata, stage/side, current primary values, and existing browser candidate pools. Expected fixtures are loaded only after proposals are generated for scoring.

Important guards:

- iPad only
- Stage1/Stage2 only
- member values are unchanged
- total is unchanged
- proposed bonus must already exist as an observed bonus candidate
- schema-default zero is rejected
- zero proposals require explicit observed zero
- nonzero bonus below 1000 is rejected
- exactly one arithmetic-valid bonus candidate is required
- prefix/suffix fragment hazards reject
- already arithmetic-valid current bonus blocks application

## Artifact Coverage

| scope | count |
| --- | ---: |
| total Stage1/2 sides | 336 |
| candidate/provenance-rich sides evaluated | 82 |
| insufficient candidate-rich evidence | 254 |

Coverage by position:

```json
{
  "stage1_self": 23,
  "stage1_enemy": 21,
  "stage2_self": 19,
  "stage2_enemy": 19
}
```

Coverage by cluster:

```json
{
  "ipad-01": 62,
  "ipad-02": 20
}
```

Unknown sides are explicitly not treated as safe non-applications.

## Applications And Scoring

| metric | count |
| --- | ---: |
| V2 applications in evaluable evidence | 5 |
| TP | 5 |
| FP | 0 |
| redundant same-value | 0 |
| conflicts | 0 |

Applications:

```json
[
  {
    "image": "IMG_0320.png",
    "stage": 1,
    "side": "self",
    "classification": "TP",
    "proposed": {
      "members": [
        298058,
        88866,
        122217
      ],
      "bonus": 59611,
      "total": 568752
    }
  },
  {
    "image": "IMG_0321.png",
    "stage": 1,
    "side": "self",
    "classification": "TP",
    "proposed": {
      "members": [
        298058,
        88866,
        122217
      ],
      "bonus": 59611,
      "total": 568752
    }
  },
  {
    "image": "IMG_0355.png",
    "stage": 1,
    "side": "self",
    "classification": "TP",
    "proposed": {
      "members": [
        95850,
        261366,
        169529
      ],
      "bonus": 52273,
      "total": 579018
    }
  },
  {
    "image": "IMG_0356.png",
    "stage": 1,
    "side": "self",
    "classification": "TP",
    "proposed": {
      "members": [
        96589,
        99732,
        216398
      ],
      "bonus": 43279,
      "total": 455998
    }
  },
  {
    "image": "IMG_0491.png",
    "stage": 1,
    "side": "enemy",
    "classification": "TP",
    "proposed": {
      "members": [
        201,
        0,
        0
      ],
      "bonus": 0,
      "total": 201
    }
  }
]
```

Original five preserved:

```json
[
  {
    "key": "IMG_0320.png|1|self",
    "present": true,
    "wouldApply": true,
    "secondWouldApply": true,
    "proposalStable": true,
    "classification": "TP",
    "blockReasons": []
  },
  {
    "key": "IMG_0321.png|1|self",
    "present": true,
    "wouldApply": true,
    "secondWouldApply": true,
    "proposalStable": true,
    "classification": "TP",
    "blockReasons": []
  },
  {
    "key": "IMG_0355.png|1|self",
    "present": true,
    "wouldApply": true,
    "secondWouldApply": true,
    "proposalStable": true,
    "classification": "TP",
    "blockReasons": []
  },
  {
    "key": "IMG_0356.png|1|self",
    "present": true,
    "wouldApply": true,
    "secondWouldApply": true,
    "proposalStable": true,
    "classification": "TP",
    "blockReasons": []
  },
  {
    "key": "IMG_0491.png|1|enemy",
    "present": true,
    "wouldApply": true,
    "secondWouldApply": true,
    "proposalStable": true,
    "classification": "TP",
    "blockReasons": []
  }
]
```

## Sixth Exact-Candidate Rejection

The previous provenance capture found six stable exact bonus candidates but only five safety-survived. The rejected row remains blocked by the frozen safety policy:

```json
{
  "image": "IMG_0324.png",
  "stage": 1,
  "side": "self",
  "classification": "P2",
  "expectedValue": 54185,
  "reason": "fragment-hazard / safetySurviving=false"
}
```

The guard should not be weakened.

## Safety Audits

| audit | result |
| --- | ---: |
| correct-side harmful applications | 0 |
| non-bonus-error harmful applications | 0 |
| zero-bonus applications | 1 |
| zero-bonus FP | 0 |
| nonzero-bonus TP | 4 |
| nonzero-bonus FP | 0 |
| crown conflicts | 0 |

Small-number, fragment, and multi-valid safety artifacts are written under `tmp/ipad-stage12-bonus-v2-production-readiness/`.

## Breakdowns

Stage breakdown:

```json
{
  "stage1": {
    "evaluable": 44,
    "applications": 5,
    "tp": 5,
    "fp": 0
  },
  "stage2": {
    "evaluable": 38,
    "applications": 0,
    "tp": 0,
    "fp": 0
  }
}
```

Self/enemy breakdown:

```json
{
  "stage1_self_TP": 4,
  "stage1_enemy_TP": 1
}
```

Cluster breakdown:

```json
{
  "evaluable": {
    "ipad-01": 62,
    "ipad-02": 20
  },
  "applications": {
    "ipad-01": 4,
    "ipad-02": 1
  },
  "tp": {
    "ipad-01": 4,
    "ipad-02": 1
  },
  "fp": {}
}
```

Accepted provenance breakdown:

```json
{
  "baseline-score-preprocess-3x-psm7|TP": 4,
  "invert-normalize-3x-psm7|TP": 4,
  "white-mask-3x-psm7|TP": 4
}
```

## Helper Parity And Stability

| metric | count |
| --- | ---: |
| rows compared | 82 |
| wouldApply disagreements | 0 |
| proposed disagreements | 0 |
| safety mismatches | 0 |

Accepted rows retain two-context stability in the focused browser artifacts.

## Combined Simulation

| metric | current | + bonus V2 |
| --- | ---: | ---: |
| images exact | 0 / 84 | 0 / 84 |
| stages exact | 88 / 252 | 93 / 252 |
| stage/sides exact | 248 / 504 | 253 / 504 |
| recovery TP / FP | 155 / 0 | 160 / 0 |
| NET_NEW_TP | - | 5 |
| NET_NEW_FP | - | 0 |

Newly exact stages:

```text
IMG_0320.png stage1
IMG_0321.png stage1
IMG_0355.png stage1
IMG_0356.png stage1
IMG_0491.png stage1
```

## Production Plan

Future kill switch:

```text
ENABLE_IPAD_STAGE12_STRICT_BONUS_SELECTION_V2
```

Recommended recovery identifier:

```text
ipad-stage12-strict-bonus-selection-v2
```

Recommended insertion order:

1. Tier C
2. strict-total
3. strict-member2
4. Stage1/2 strict bonus V2, only on post-recovery Stage1/2 sides

No new OCR cost is required: no new Tesseract call, crop, preprocessing, alternate engine, model load, or RapidOCR path. The helper evaluated 82 rows in 1.265 ms total, about 0.015428 ms per row.

## Final Classification

B. READY AFTER ONE SPECIFIC SAFETY CHECK

Reason:

Candidate-rich Stage1/2 evidence is not retained for every one of the 84 fixtures; perform a focused full Stage1/2 V2 audit or accept ORDER-B scope before production wiring.

Exact next step:

Complete the specific safety check, then productionize Stage1/Stage2 Strict Bonus Selection V2.

Production unchanged: no OCR output, recovery ordering, ROI, preprocessing, smartphone OCR, current-PC OCR, legacy desktop OCR, idols data, or RapidOCR behavior was modified.
