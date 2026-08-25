# iPad Stage1/2 Bonus V2 Full Coverage Audit

Status: diagnostic-only. The selector remains inert and is not wired into production OCR.

## Why This Audit Exists

The prior readiness review covered only 82 / 336 Stage1/Stage2 sides with candidate-rich retained evidence. This run fills the remaining coverage using the existing real-browser `ipadArithmeticDebug=1` diagnostics path, then runs the frozen helper expected-blind before fixture scoring.

## Production Baseline

| metric | current |
| --- | ---: |
| images exact | 0 / 84 |
| stages exact | 88 / 252 |
| stage/sides exact | 248 / 504 |
| production recoveries | 155 TP / 0 FP |
| Tier C | 97 |
| strict-total | 18 |
| strict-member2 | 40 |

## Coverage

| metric | count |
| --- | ---: |
| previous candidate-rich coverage | 82 / 336 |
| previous missing sides | 254 |
| final candidate-rich coverage | 336 / 336 |
| still unknown | 0 |

## Applications

| metric | count |
| --- | ---: |
| wouldApply rows | 7 |
| TP | 7 |
| FP | 0 |
| redundant | 0 |
| conflicts | 0 |
| known five recovered | 5 / 5 |

Would-apply inventory:

```json
[
  {
    "image": "IMG_0282.png",
    "stage": 1,
    "side": "enemy",
    "current": {
      "members": [
        333995,
        245881,
        213242
      ],
      "bonus": 3,
      "total": 793118
    },
    "proposed": {
      "members": [
        333995,
        245881,
        213242
      ],
      "bonus": 0,
      "total": 793118
    },
    "classification": "TP",
    "blockReasons": [],
    "validBonusValues": [
      0
    ],
    "provenance": {
      "matchingProfileIds": [
        "white-mask-3x-psm7"
      ],
      "matchingOrigins": [
        "observed"
      ]
    }
  },
  {
    "image": "IMG_0301.png",
    "stage": 1,
    "side": "enemy",
    "current": {
      "members": [
        333995,
        245881,
        213242
      ],
      "bonus": 3,
      "total": 793118
    },
    "proposed": {
      "members": [
        333995,
        245881,
        213242
      ],
      "bonus": 0,
      "total": 793118
    },
    "classification": "TP",
    "blockReasons": [],
    "validBonusValues": [
      0
    ],
    "provenance": {
      "matchingProfileIds": [
        "white-mask-3x-psm7"
      ],
      "matchingOrigins": [
        "observed"
      ]
    }
  },
  {
    "image": "IMG_0320.png",
    "stage": 1,
    "side": "self",
    "current": {
      "members": [
        298058,
        88866,
        122217
      ],
      "bonus": 1,
      "total": 568752
    },
    "proposed": {
      "members": [
        298058,
        88866,
        122217
      ],
      "bonus": 59611,
      "total": 568752
    },
    "classification": "TP",
    "blockReasons": [],
    "validBonusValues": [
      59611
    ],
    "provenance": {
      "matchingProfileIds": [
        "baseline-score-preprocess-3x-psm7",
        "invert-normalize-3x-psm7",
        "white-mask-3x-psm7"
      ],
      "matchingOrigins": [
        "observed"
      ]
    }
  },
  {
    "image": "IMG_0321.png",
    "stage": 1,
    "side": "self",
    "current": {
      "members": [
        298058,
        88866,
        122217
      ],
      "bonus": 1,
      "total": 568752
    },
    "proposed": {
      "members": [
        298058,
        88866,
        122217
      ],
      "bonus": 59611,
      "total": 568752
    },
    "classification": "TP",
    "blockReasons": [],
    "validBonusValues": [
      59611
    ],
    "provenance": {
      "matchingProfileIds": [
        "baseline-score-preprocess-3x-psm7",
        "invert-normalize-3x-psm7",
        "white-mask-3x-psm7"
      ],
      "matchingOrigins": [
        "observed"
      ]
    }
  },
  {
    "image": "IMG_0355.png",
    "stage": 1,
    "side": "self",
    "current": {
      "members": [
        95850,
        261366,
        169529
      ],
      "bonus": 0,
      "total": 579018
    },
    "proposed": {
      "members": [
        95850,
        261366,
        169529
      ],
      "bonus": 52273,
      "total": 579018
    },
    "classification": "TP",
    "blockReasons": [],
    "validBonusValues": [
      52273
    ],
    "provenance": {
      "matchingProfileIds": [
        "baseline-score-preprocess-3x-psm7",
        "invert-normalize-3x-psm7",
        "white-mask-3x-psm7"
      ],
      "matchingOrigins": [
        "observed"
      ]
    }
  },
  {
    "image": "IMG_0356.png",
    "stage": 1,
    "side": "self",
    "current": {
      "members": [
        96589,
        99732,
        216398
      ],
      "bonus": 0,
      "total": 455998
    },
    "proposed": {
      "members": [
        96589,
        99732,
        216398
      ],
      "bonus": 43279,
      "total": 455998
    },
    "classification": "TP",
    "blockReasons": [],
    "validBonusValues": [
      43279
    ],
    "provenance": {
      "matchingProfileIds": [
        "baseline-score-preprocess-3x-psm7",
        "invert-normalize-3x-psm7"
      ],
      "matchingOrigins": [
        "observed"
      ]
    }
  },
  {
    "image": "IMG_0491.png",
    "stage": 1,
    "side": "enemy",
    "current": {
      "members": [
        201,
        0,
        0
      ],
      "bonus": 1,
      "total": 201
    },
    "proposed": {
      "members": [
        201,
        0,
        0
      ],
      "bonus": 0,
      "total": 201
    },
    "classification": "TP",
    "blockReasons": [],
    "validBonusValues": [
      0
    ],
    "provenance": {
      "matchingProfileIds": [
        "white-mask-3x-psm7"
      ],
      "matchingOrigins": [
        "observed"
      ]
    }
  }
]
```

## Safety

| audit | result |
| --- | ---: |
| zero-bonus sides | 168 |
| zero-bonus FP | 0 |
| non-zero bonus sides | 168 |
| non-zero TP / FP | 4 / 0 |
| small-number candidate rows | 287 |
| small-number accepted / FP | 7 / 0 |
| fragment affected rows | 239 |
| fragment accepted / FP | 7 / 0 |
| multiple-valid rows | 0 |
| crown conflicts | 0 |
| correct-side harmful applications | 0 |
| non-bonus-error harmful applications | 0 |

## Breakdowns

Stage breakdown:

```json
{
  "stage1": {
    "sides": 168,
    "applications": 7,
    "tp": 7,
    "fp": 0
  },
  "stage2": {
    "sides": 168,
    "applications": 0,
    "tp": 0,
    "fp": 0
  }
}
```

Self/enemy breakdown:

```json
{
  "stage1_self": {
    "sides": 84,
    "applications": 4,
    "tp": 4,
    "fp": 0
  },
  "stage1_enemy": {
    "sides": 84,
    "applications": 3,
    "tp": 3,
    "fp": 0
  },
  "stage2_self": {
    "sides": 84,
    "applications": 0,
    "tp": 0,
    "fp": 0
  },
  "stage2_enemy": {
    "sides": 84,
    "applications": 0,
    "tp": 0,
    "fp": 0
  }
}
```

Cluster breakdown:

```json
{
  "sides": {
    "ipad-01": 256,
    "ipad-02": 80
  },
  "applications": {
    "ipad-01": 6,
    "ipad-02": 1
  },
  "tp": {
    "ipad-01": 6,
    "ipad-02": 1
  },
  "fp": {},
  "knownFive": {
    "ipad-01": 4,
    "ipad-02": 1
  }
}
```

Accepted provenance:

```json
{
  "white-mask-3x-psm7|TP": 6,
  "baseline-score-preprocess-3x-psm7|TP": 4,
  "invert-normalize-3x-psm7|TP": 4
}
```

## Recovery Overlap

```json
{
  "unresolvedOnly": 7,
  "harmlessOverlap": 0,
  "conflicts": 0,
  "rows": [
    {
      "image": "IMG_0282.png",
      "stage": 1,
      "side": "enemy",
      "appliedRecoveries": [],
      "conflict": false
    },
    {
      "image": "IMG_0301.png",
      "stage": 1,
      "side": "enemy",
      "appliedRecoveries": [],
      "conflict": false
    },
    {
      "image": "IMG_0320.png",
      "stage": 1,
      "side": "self",
      "appliedRecoveries": [],
      "conflict": false
    },
    {
      "image": "IMG_0321.png",
      "stage": 1,
      "side": "self",
      "appliedRecoveries": [],
      "conflict": false
    },
    {
      "image": "IMG_0355.png",
      "stage": 1,
      "side": "self",
      "appliedRecoveries": [],
      "conflict": false
    },
    {
      "image": "IMG_0356.png",
      "stage": 1,
      "side": "self",
      "appliedRecoveries": [],
      "conflict": false
    },
    {
      "image": "IMG_0491.png",
      "stage": 1,
      "side": "enemy",
      "appliedRecoveries": [],
      "conflict": false
    }
  ]
}
```

## Helper Parity

| metric | count |
| --- | ---: |
| rows | 336 |
| wouldApply disagreements | 0 |
| proposal disagreements | 0 |
| safety mismatches | 0 |

## Second Context Stability

Second-context images: IMG_0264.png, IMG_0265.png, IMG_0267.png, IMG_0282.png, IMG_0301.png, IMG_0320.png, IMG_0321.png, IMG_0324.png, IMG_0355.png, IMG_0356.png, IMG_0491.png

Accepted proposal stability: 7 / 7
Near-apply blocker stability: 1 / 1

## Combined Simulation

| metric | current | + V2 |
| --- | ---: | ---: |
| images exact | 0 / 84 | 0 / 84 |
| stages exact | 88 / 252 | 92 / 252 |
| stage/sides exact | 248 / 504 | 255 / 504 |
| NET_NEW_TP | - | 7 |
| NET_NEW_FP | - | 0 |

Newly exact stages:

```text
IMG_0282.png stage1
IMG_0301.png stage1
IMG_0355.png stage1
IMG_0491.png stage1
```

## Performance

Helper-only evaluation: 3.817 ms total, 0.011359 ms per side over 336 sides.

No new OCR, model, crop, preprocessing, or RapidOCR path is required for the helper itself; this audit only captured existing browser diagnostic evidence.

## Final Decision

A. READY FOR PRODUCTION INTEGRATION

Production integration justified: yes

Exact next step: Productionize iPad Stage1/Stage2 Strict Bonus Selection V2.

Future production details:

- kill switch: `ENABLE_IPAD_STAGE12_STRICT_BONUS_SELECTION_V2`
- recovery identifier: `ipad-stage12-strict-bonus-selection-v2`
- insertion point: after Tier C, strict-total, and strict-member2; only on post-recovery Stage1/Stage2 sides

Production unchanged: no OCR output, recovery ordering, ROI, preprocessing, smartphone OCR, current-PC OCR, legacy desktop OCR, idols data, or RapidOCR behavior was modified.
