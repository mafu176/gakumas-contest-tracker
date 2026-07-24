# Smartphone Candidate-Selection Audit

Generated: 2026-07-24T22:42:09.191Z

## Scope

This is a runner-only audit of the remaining smartphone OCR failures after the current production recoveries. It uses cached OCR evidence from `tmp/smartphone-ocr-baseline-cache/` and reapplies the production smartphone crown-bonus and stage-wide solver helpers in memory. It does not rerun OCR capture, does not change production output, and does not add a recovery.

The audit focuses on candidate selection: when an exact expected value is already observed somewhere in the cached evidence, why did it lose to the selected/competing value? Rows with missing exact candidate evidence are listed but are not counted as selection-only recoverable.

## Summary

| metric | count |
| --- | ---: |
| expected smartphone fixtures audited | 89 |
| remaining failing stage/sides | 31 |
| selection-only upper bound: all expected members somewhere + exact total evidence | 12 |
| stronger upper bound: all expected members in expected slots + exact total evidence | 5 |
| rows where an expected-side exact proposal exists in solver proposals | 0 |
| rows with exactly one expected-side proposal and no broad competing changed proposal | 0 |

## Deterministic Rejection Categories

| category | rows |
| --- | ---: |
| safety guard: exact displayed total absent | 16 |
| wrong-slot assignment / slot ambiguity | 7 |
| not-selection-only: exact member absent from candidate pools | 3 |
| candidate ordering or bonus-total selection | 2 |
| missing selected member despite exact candidate | 1 |
| total-as-member / sparse row shift | 1 |
| bonus selected as member / polluted candidate pool | 1 |

## Position Breakdown

| position | failing rows |
| --- | ---: |
| S1 self | 3 |
| S1 enemy | 1 |
| S2 self | 7 |
| S2 enemy | 4 |
| S3 self | 12 |
| S3 enemy | 4 |

## Theoretical Upper Bound for Selection Improvements

Selection improvements alone cannot exceed 12 stage/side rows under the broad definition that all expected members appear somewhere and exact total evidence exists. The safer slot-proven upper bound is 5 rows. Rows outside those bounds need capture, new total evidence, or stronger slot provenance before selection can safely help.

The practical near-term target is smaller than the upper bound because several rows have exact values in the wrong slot, bonus-as-member pollution, or competing exact interpretations. A conservative generalized experiment should begin with rows where the target side already has exact slot-proven members and exact total evidence, but bonus/total selection picked the wrong candidate.

## Recommended Generalized Selection Experiment

Recommended experiment: `smartphoneExactSlotMembersBonusTotalSelectionSimulation`.

Strict runner-only guards:
- smartphone only; no OCR recapture;
- target side member1/member2/member3 must already be exact in the expected member slot pools;
- exact target total evidence must already exist;
- expected/derived bonus must exist as observed evidence, or be zero under the confirmed crown-bonus rule;
- current target side must fail only bonus/total or bonus-as-member selection, not missing member evidence;
- no competing exact stage-wide proposal;
- exact equality only; no near-match, no digit inference, no member invention.

Estimated recoverable rows for this experiment: at most 2 directly categorized rows, with additional candidates possible inside the 5 slot-proven upper-bound rows after stricter no-competing checks. This is the only selection-only direction with a plausible path to at least 3 additional stage/sides while preserving FP=0, because it avoids wrong-slot and missing-total cases.

Do not productionize from this audit. The next step should be a runner-only simulation with full FP measurement across all 89 fixtures.

## Per-Row Candidate Audit

### IMG_8944 S2 self

- Expected: members 104,457 / 50,805 / 501,796, bonus 100,359, total 757,417
- Selected: members 104,457 / 501,796 / 100,359, total 757,417
- Category: wrong-slot assignment / slot ambiguity
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (104,457, 50,805, 501,796, 100,359)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 104,457: slot rank 1, selected/high, selected-current-output
  - member2 50,805: wrong slot: self3 rank 2
  - member3 501,796: wrong slot: self2 rank 1

| slot | candidates |
| --- | --- |
| self member1 | 1:104,457 <small>selected-current-output</small><br>2:757,417 <small>self.raw.member-row-order</small> |
| self member2 | 1:501,796 <small>selected-current-output</small><br>2:104,457 <small>self.raw.member-row-order</small> |
| self member3 | 1:100,359 <small>selected-current-output</small><br>2:50,805 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:165,140 <small>selected-current-output</small><br>2:535,546 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:179,610 <small>selected-current-output</small><br>2:165,140 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:190,796 <small>selected-current-output</small><br>2:179,610 <small>enemy.raw.member-row-order</small> |

### IMG_9084 S3 self

- Expected: members 200,294 / 379,028 / 382,431, bonus 76,486, total 1,038,239
- Selected: members 200,294 / 379,028 / 382,431, total 1,038,259
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (1,038,259, 1,058,259, 200,294, 379,028, 382,431, 76,486, 17,587, 73,869)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 200,294: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order
  - member2 379,028: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order
  - member3 382,431: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:200,294 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:379,028 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:382,431 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:97,213 <small>selected-current-output</small> |
| enemy member2 | 1:75,805 <small>selected-current-output</small> |
| enemy member3 | 1:108,996 <small>selected-current-output</small> |

### IMG_9086 S3 self

- Expected: members 264,954 / 196,342 / 293,209, bonus 58,641, total 813,146
- Selected: members 196,342 / 293,209 / 264,954, total 813,146
- Category: candidate ordering or bonus-total selection
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (813,146, 196,342, 293,209, 815,140, 264,954, 58,641, 73,869)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 264,954: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member2 196,342: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 293,209: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:196,342 <small>selected-current-output</small><br>2:264,954 <small>self.raw.member-row-order</small> |
| self member2 | 1:293,209 <small>selected-current-output</small><br>2:196,342 <small>self.raw.member-row-order</small> |
| self member3 | 1:264,954 <small>selected-current-output</small><br>2:293,209 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:69,688 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:126,309 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:149,877 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_8951 S3 enemy

- Expected: members 18,338 / 52,841 / 72,101, bonus 0, total 143,280
- Selected: members 18,338 / 52,841 / 0, total 72,101
- Category: missing selected member despite exact candidate
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (143,280, 18,338, 52,841, 72,101, 145,280, 56,973)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 18,338: slot rank 1, selected/high, selected-current-output+enemy.raw.member-row-order
  - member2 52,841: slot rank 1, selected/high, selected-current-output+enemy.raw.member-row-order
  - member3 72,101: slot rank 1, raw/order-medium, enemy.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:153,691 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:36,461 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:216,184 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:18,338 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:52,841 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:72,101 <small>enemy.raw.member-row-order</small> |

### IMG_9125 S1 enemy

- Expected: members 60,325 / 32,993 / 26,655, bonus 0, total 119,973
- Selected: members 32,993 / 26,655 / 0, total 60,325
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (60,325, 32,993, 26,655)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 60,325: slot rank 2, raw/order-medium, enemy.raw.member-row-order
  - member2 32,993: slot rank 2, raw/order-medium, enemy.raw.member-row-order
  - member3 26,655: slot rank 1, raw/order-medium, enemy.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:218,728 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:707,239 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:104,153 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:32,993 <small>selected-current-output</small><br>2:60,325 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:26,655 <small>selected-current-output</small><br>2:32,993 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:26,655 <small>enemy.raw.member-row-order</small> |

### IMG_9152 S2 enemy

- Expected: members 123,247 / 207,281 / 106,217, bonus 41,456, total 478,201
- Selected: members 123,247 / 41,456 / 42,400, total 207,281
- Category: wrong-slot assignment / slot ambiguity
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (123,247, 207,281, 106,217, 41,456)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 123,247: slot rank 1, selected/high, selected-current-output
  - member2 207,281: wrong slot: enemy3 rank 2
  - member3 106,217: broad evidence only, not slot-proven

| slot | candidates |
| --- | --- |
| self member1 | 1:182,066 <small>selected-current-output</small><br>2:481,862 <small>self.raw.member-row-order</small> |
| self member2 | 1:125,319 <small>selected-current-output</small><br>2:182,066 <small>self.raw.member-row-order</small> |
| self member3 | 1:174,477 <small>selected-current-output</small><br>2:125,319 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:123,247 <small>selected-current-output</small><br>2:478,201 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:41,456 <small>selected-current-output</small><br>2:123,247 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:42,400 <small>selected-current-output</small><br>2:207,281 <small>enemy.raw.member-row-order</small> |

### IMG_9158 S2 self

- Expected: members 112,317 / 136,991 / 162,992, bonus 32,598, total 444,898
- Selected: members 112,317 / 136,991 / 162,992, total 444,070
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (32,598, 112,317, 136,991, 162,992)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 112,317: slot rank 1, selected/high, selected-current-output
  - member2 136,991: slot rank 1, selected/high, selected-current-output
  - member3 162,992: slot rank 1, selected/high, selected-current-output

| slot | candidates |
| --- | --- |
| self member1 | 1:112,317 <small>selected-current-output</small><br>2:444,070 <small>self.raw.member-row-order</small> |
| self member2 | 1:136,991 <small>selected-current-output</small><br>2:112,317 <small>self.raw.member-row-order</small> |
| self member3 | 1:162,992 <small>selected-current-output</small><br>2:136,991 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:121,422 <small>selected-current-output</small><br>2:375,495 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:99,477 <small>selected-current-output</small><br>2:121,422 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:154,596 <small>selected-current-output</small><br>2:99,477 <small>enemy.raw.member-row-order</small> |

### IMG_9161 S2 self

- Expected: members 61,301 / 197,199 / 100,135, bonus 39,439, total 398,074
- Selected: members 77,477 / 59,459 / 59,439, total 197,199
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (77,477, 39,439, 61,301, 197,199, 100,135, 59,459, 59,439)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 61,301: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member2 197,199: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 100,135: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:77,477 <small>selected-current-output</small><br>2:61,301 <small>self.raw.member-row-order</small> |
| self member2 | 1:59,459 <small>selected-current-output</small><br>2:197,199 <small>self.raw.member-row-order</small> |
| self member3 | 1:59,439 <small>selected-current-output</small><br>2:100,135 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:134,870 <small>selected-current-output</small><br>2:70,417 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:79,378 <small>selected-current-output</small><br>2:134,870 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:64,024 <small>selected-current-output</small><br>2:79,378 <small>enemy.raw.member-row-order</small> |

### IMG_9163 S1 self

- Expected: members 544,861 / 0 / 0, bonus 108,972, total 653,833
- Selected: members 544,861 / 0 / 0, total 653,835
- Category: not-selection-only: exact member absent from candidate pools
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (653,833, 655,855, 544,861)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 544,861: slot rank 1, selected/high, selected-current-output
  - member2 0: absent
  - member3 0: absent

| slot | candidates |
| --- | --- |
| self member1 | 1:544,861 <small>selected-current-output</small><br>2:6,535 <small>self.raw.member-row-order</small> |
| self member2 | 1:544,861 <small>self.raw.member-row-order</small> |
| self member3 | 1:108,972 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:162,233 <small>selected-current-output</small><br>2:357,616 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:56,973 <small>selected-current-output</small><br>2:162,233 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:138,410 <small>selected-current-output</small><br>2:56,973 <small>enemy.raw.member-row-order</small> |

### IMG_9264 S2 self

- Expected: members 638,016 / 1,009,315 / 755,237, bonus 0, total 2,402,568
- Selected: members 638,016 / 755,237, total 2,402,568
- Category: candidate ordering or bonus-total selection
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (2,402,568, 638,016, 1,009,315, 755,237)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 638,016: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order
  - member2 1,009,315: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 755,237: slot rank 1, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:638,016 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:755,237 <small>selected-current-output</small><br>2:1,009,315 <small>self.raw.member-row-order</small> |
| self member3 | 1:755,237 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:210,809 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:1,254,969 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:891,973 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9281 S3 enemy

- Expected: members 343,001 / 343,056 / 257,235, bonus 68,611, total 1,011,903
- Selected: members 343,001 / 343,056 / 257,235, total 1,011,905
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (1,011,905, 343,001, 343,056, 257,235, 68,611)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 343,001: slot rank 1, selected/high, selected-current-output+enemy.raw.member-row-order
  - member2 343,056: slot rank 1, selected/high, selected-current-output+enemy.raw.member-row-order
  - member3 257,235: slot rank 1, selected/high, selected-current-output+enemy.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:204,908 <small>selected-current-output</small> |
| self member2 | 1:112,716 <small>selected-current-output</small> |
| self member3 | - |
| enemy member1 | 1:343,001 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:343,056 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:257,235 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9308 S2 self

- Expected: members 1,020,198 / 1,200,635 / 518,149, bonus 240,127, total 2,979,109
- Selected: members 200,635 / 518,149 / 240,127, total 958,911
- Category: not-selection-only: exact member absent from candidate pools
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (240,127, 518,149)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 1,020,198: absent
  - member2 1,200,635: absent
  - member3 518,149: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:200,635 <small>selected-current-output</small><br>2:1,020,194 <small>self.raw.member-row-order</small> |
| self member2 | 1:518,149 <small>selected-current-output</small><br>2:200,635 <small>self.raw.member-row-order</small> |
| self member3 | 1:240,127 <small>selected-current-output</small><br>2:518,149 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:782,516 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:568,799 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:751,402 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9309 S1 self

- Expected: members 415,986 / 394,090 / 230,502, bonus 83,197, total 1,123,775
- Selected: members 415,986 / 394,090 / 230,502, total 1,125,775
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (415,986, 394,090, 230,502)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 415,986: slot rank 1, selected/high, selected-current-output
  - member2 394,090: slot rank 1, selected/high, selected-current-output
  - member3 230,502: slot rank 1, selected/high, selected-current-output

| slot | candidates |
| --- | --- |
| self member1 | 1:415,986 <small>selected-current-output</small><br>2:1,125,775 <small>self.raw.member-row-order</small> |
| self member2 | 1:394,090 <small>selected-current-output</small><br>2:415,986 <small>self.raw.member-row-order</small> |
| self member3 | 1:230,502 <small>selected-current-output</small><br>2:394,090 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:44,812 <small>selected-current-output</small><br>2:706,906 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:369,544 <small>selected-current-output</small><br>2:44,812 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:292,550 <small>selected-current-output</small><br>2:369,544 <small>enemy.raw.member-row-order</small> |

### IMG_9310 S3 self

- Expected: members 212,343 / 410,425 / 48,140, bonus 82,085, total 752,993
- Selected: members 212,343 / 410,425 / 48,140, total 670,908
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (212,343, 410,425, 48,140, 82,085, 71,232)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 212,343: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order
  - member2 410,425: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order
  - member3 48,140: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:212,343 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:410,425 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:48,140 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:58,192 <small>selected-current-output</small><br>2:113,556 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:54,710 <small>selected-current-output</small><br>2:58,192 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:54,710 <small>enemy.raw.member-row-order</small> |

### IMG_9310 S3 enemy

- Expected: members 113,556 / 58,192 / 54,710, bonus 0, total 226,458
- Selected: members 58,192 / 54,710 / 0, total 113,556
- Category: total-as-member / sparse row shift
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (226,458, 113,556, 58,192, 54,710, 220,400, 61,197)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 113,556: slot rank 2, raw/order-medium, enemy.raw.member-row-order
  - member2 58,192: slot rank 2, raw/order-medium, enemy.raw.member-row-order
  - member3 54,710: slot rank 1, raw/order-medium, enemy.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:212,343 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:410,425 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:48,140 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:58,192 <small>selected-current-output</small><br>2:113,556 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:54,710 <small>selected-current-output</small><br>2:58,192 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:54,710 <small>enemy.raw.member-row-order</small> |

### IMG_9315 S3 self

- Expected: members 899,249 / 252,319 / 1,026,470, bonus 205,294, total 2,383,332
- Selected: members 899,249 / 252,319 / 205,294, total 1,377,391
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (2,583,533, 2,385,532, 899,249, 252,319, 1,026,470, 205,294, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 899,249: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order
  - member2 252,319: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order
  - member3 1,026,470: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:899,249 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:252,319 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:205,294 <small>selected-current-output</small><br>2:1,026,470 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:76,635 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:31,489 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:69,690 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9316 S3 self

- Expected: members 1,273,010 / 696,275 / 382,517, bonus 254,602, total 2,606,404
- Selected: members 696,275 / 382,517 / 254,602, total 1,333,394
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (2,000,404, 1,273,010, 696,275, 382,517, 254,602, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 1,273,010: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member2 696,275: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 382,517: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:696,275 <small>selected-current-output</small><br>2:1,273,010 <small>self.raw.member-row-order</small> |
| self member2 | 1:382,517 <small>selected-current-output</small><br>2:696,275 <small>self.raw.member-row-order</small> |
| self member3 | 1:254,602 <small>selected-current-output</small><br>2:382,517 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:250,499 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:86,476 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:344,601 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9317 S3 self

- Expected: members 1,060,079 / 276,500 / 804,645, bonus 212,015, total 2,353,239
- Selected: members 276,500 / 804,645 / 212,015, total 1,293,160
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (2,323,239, 1,060,079, 276,500, 804,645, 212,015, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 1,060,079: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member2 276,500: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 804,645: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:276,500 <small>selected-current-output</small><br>2:1,060,079 <small>self.raw.member-row-order</small> |
| self member2 | 1:804,645 <small>selected-current-output</small><br>2:276,500 <small>self.raw.member-row-order</small> |
| self member3 | 1:212,015 <small>selected-current-output</small><br>2:804,645 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:187,225 <small>selected-current-output</small> |
| enemy member2 | 1:101,611 <small>selected-current-output</small> |
| enemy member3 | 1:62,207 <small>selected-current-output</small> |

### IMG_9318 S3 self

- Expected: members 1,001,405 / 812,662 / 938,864, bonus 200,281, total 2,953,212
- Selected: members 812,662 / 938,864 / 200,281, total 1,951,807
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (2,955,212, 2,925,212, 1,001,405, 812,662, 938,864, 200,281, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 1,001,405: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member2 812,662: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 938,864: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:812,662 <small>selected-current-output</small><br>2:1,001,405 <small>self.raw.member-row-order</small> |
| self member2 | 1:938,864 <small>selected-current-output</small><br>2:812,662 <small>self.raw.member-row-order</small> |
| self member3 | 1:200,281 <small>selected-current-output</small><br>2:938,864 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:101,677 <small>selected-current-output</small> |
| enemy member2 | 1:116,916 <small>selected-current-output</small> |
| enemy member3 | 1:39,875 <small>selected-current-output</small> |

### IMG_9319 S2 enemy

- Expected: members 11,845 / 16,081 / 11,316, bonus 0, total 39,242
- Selected: members 39,242 / 111,845 / 16,081, total 178,484
- Category: wrong-slot assignment / slot ambiguity
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (11,845, 16,081, 11,316, 39,242)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 11,845: broad evidence only, not slot-proven
  - member2 16,081: wrong slot: enemy3 rank 1
  - member3 11,316: broad evidence only, not slot-proven

| slot | candidates |
| --- | --- |
| self member1 | 1:208,330 <small>selected-current-output</small><br>2:292,358 <small>self.raw.member-row-order</small> |
| self member2 | 1:193,243 <small>selected-current-output</small><br>2:208,330 <small>self.raw.member-row-order</small> |
| self member3 | 1:149,143 <small>selected-current-output</small><br>2:193,243 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:39,242 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:111,845 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:16,081 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9320 S2 enemy

- Expected: members 8,192 / 167,910 / 29,870, bonus 33,582, total 239,554
- Selected: members 8,192 / 29,870 / 33,582, total 239,554
- Category: wrong-slot assignment / slot ambiguity
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (167,910, 29,870, 239,554, 33,582, 55,582)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 8,192: slot rank 1, selected/high, selected-current-output
  - member2 167,910: wrong slot: enemy3 rank 2
  - member3 29,870: wrong slot: enemy2 rank 1

| slot | candidates |
| --- | --- |
| self member1 | 1:141,371 <small>selected-current-output</small><br>2:347,432 <small>self.raw.member-row-order</small> |
| self member2 | 1:119,768 <small>selected-current-output</small><br>2:141,371 <small>self.raw.member-row-order</small> |
| self member3 | 1:86,293 <small>selected-current-output</small><br>2:119,768 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:8,192 <small>selected-current-output</small><br>2:5,545 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:29,870 <small>selected-current-output</small><br>2:8,192 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:33,582 <small>selected-current-output</small><br>2:167,910 <small>enemy.raw.member-row-order</small> |

### IMG_9323 S2 self

- Expected: members 256,014 / 231,609 / 16,800, bonus 51,202, total 555,625
- Selected: members 235,625 / 256,014 / 231,609, total 774,450
- Category: wrong-slot assignment / slot ambiguity
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (51,202, 555,625, 256,014, 231,609, 16,800)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 256,014: wrong slot: self2 rank 1
  - member2 231,609: wrong slot: self3 rank 1
  - member3 16,800: broad evidence only, not slot-proven

| slot | candidates |
| --- | --- |
| self member1 | 1:235,625 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:256,014 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:231,609 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:78,426 <small>selected-current-output</small><br>2:327,035 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:139,761 <small>selected-current-output</small><br>2:78,426 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:108,848 <small>selected-current-output</small><br>2:139,761 <small>enemy.raw.member-row-order</small> |

### IMG_9323 S3 self

- Expected: members 1,165,937 / 1,007,981 / 1,093,402, bonus 233,187, total 3,500,507
- Selected: members 233,187 / 70,650, total 1,093,402
- Category: not-selection-only: exact member absent from candidate pools
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (3,500,507, 3,200,007, 1,093,402, 233,187, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 1,165,937: absent
  - member2 1,007,981: absent
  - member3 1,093,402: broad evidence only, not slot-proven

| slot | candidates |
| --- | --- |
| self member1 | 1:233,187 <small>selected-current-output</small> |
| self member2 | 1:70,650 <small>selected-current-output</small> |
| self member3 | - |
| enemy member1 | 1:186,543 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:213,698 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:631,200 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9324 S3 self

- Expected: members 1,065,816 / 436,774 / 942,493, bonus 213,163, total 2,658,246
- Selected: members 436,774 / 942,493 / 213,163, total 1,592,430
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (2,008,240, 1,065,816, 436,774, 942,493, 213,163, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 1,065,816: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member2 436,774: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 942,493: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:436,774 <small>selected-current-output</small><br>2:1,065,816 <small>self.raw.member-row-order</small> |
| self member2 | 1:942,493 <small>selected-current-output</small><br>2:436,774 <small>self.raw.member-row-order</small> |
| self member3 | 1:213,163 <small>selected-current-output</small><br>2:942,493 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:289,079 <small>selected-current-output</small> |
| enemy member2 | 1:636,508 <small>selected-current-output</small> |
| enemy member3 | 1:216,851 <small>selected-current-output</small> |

### IMG_9328 S3 self

- Expected: members 899,855 / 1,043,301 / 875,583, bonus 208,660, total 3,027,399
- Selected: members 899,855 / 875,583 / 208,660, total 1,984,098
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (3,027,359, 899,855, 1,043,301, 875,583, 208,660, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 899,855: slot rank 1, selected/high, selected-current-output+self.raw.member-row-order
  - member2 1,043,301: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 875,583: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:899,855 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:875,583 <small>selected-current-output</small><br>2:1,043,301 <small>self.raw.member-row-order</small> |
| self member3 | 1:208,660 <small>selected-current-output</small><br>2:875,583 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:201,826 <small>selected-current-output</small> |
| enemy member2 | 1:63,205 <small>selected-current-output</small> |
| enemy member3 | 1:12,929 <small>selected-current-output</small> |

### IMG_9333 S2 self

- Expected: members 135,160 / 39,827 / 191,225, bonus 0, total 366,212
- Selected: members 360,212 / 135,160 / 39,827, total 726,424
- Category: wrong-slot assignment / slot ambiguity
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (366,212, 135,160, 39,827, 191,225)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 135,160: wrong slot: self2 rank 1
  - member2 39,827: wrong slot: self3 rank 1
  - member3 191,225: broad evidence only, not slot-proven

| slot | candidates |
| --- | --- |
| self member1 | 1:360,212 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:135,160 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:39,827 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:54,738 <small>selected-current-output</small><br>2:535,985 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:193,481 <small>selected-current-output</small><br>2:54,738 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:239,805 <small>selected-current-output</small><br>2:193,481 <small>enemy.raw.member-row-order</small> |

### IMG_9333 S3 enemy

- Expected: members 435,116 / 624,040 / 393,112, bonus 124,808, total 1,577,076
- Selected: members 435,116 / 124,808 / 64,998, total 624,040
- Category: bonus selected as member / polluted candidate pool
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (1,577,076, 435,116, 624,040, 393,112, 1,077,070, 124,808, 64,998)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 435,116: slot rank 1, selected/high, selected-current-output+enemy.raw.member-row-order
  - member2 624,040: slot rank 2, raw/order-medium, enemy.raw.member-row-order
  - member3 393,112: slot rank 2, raw/order-medium, enemy.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:543,723 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:326,251 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:542,184 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:435,116 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:124,808 <small>selected-current-output</small><br>2:624,040 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:64,998 <small>selected-current-output</small><br>2:393,112 <small>enemy.raw.member-row-order</small> |

### IMG_9335 S2 enemy

- Expected: members 224,651 / 228,553 / 264,964, bonus 52,992, total 771,160
- Selected: members 264,964 / 224,651 / 228,553, total 771,160
- Category: wrong-slot assignment / slot ambiguity
- Stage-wide solver rejection: current-output-already-matches-unique-equation
- Proposal counts: total 1, changed 0, expected-side proposals 0
- Exact total evidence for side: yes (264,964, 52,992, 771,160, 224,651, 228,553)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 224,651: wrong slot: enemy2 rank 1
  - member2 228,553: wrong slot: enemy3 rank 1
  - member3 264,964: wrong slot: enemy1 rank 1

| slot | candidates |
| --- | --- |
| self member1 | 1:194,058 <small>selected-current-output</small><br>2:381,341 <small>self.raw.member-row-order</small> |
| self member2 | 1:115,510 <small>selected-current-output</small><br>2:194,058 <small>self.raw.member-row-order</small> |
| self member3 | 1:71,773 <small>selected-current-output</small><br>2:115,510 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:264,964 <small>selected-current-output</small><br>2:771,160 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:224,651 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:228,553 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9336 S3 self

- Expected: members 1,029,078 / 505,711 / 672,417, bonus 205,815, total 2,413,021
- Selected: members 505,711 / 672,417 / 205,815, total 1,442,558
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (2,415,021, 1,029,078, 505,711, 672,417, 205,815, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 1,029,078: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member2 505,711: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 672,417: slot rank 2, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:505,711 <small>selected-current-output</small><br>2:1,029,078 <small>self.raw.member-row-order</small> |
| self member2 | 1:672,417 <small>selected-current-output</small><br>2:505,711 <small>self.raw.member-row-order</small> |
| self member3 | 1:205,815 <small>selected-current-output</small><br>2:672,417 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:586,790 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:693,279 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:804,639 <small>selected-current-output+enemy.raw.member-row-order</small> |

### IMG_9337 S1 self

- Expected: members 85,668 / 377,010 / 132,698, bonus 0, total 595,376
- Selected: members 295,576 / 85,668 / 377,010, total 890,952
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (85,668, 377,010, 132,698)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 85,668: wrong slot: self2 rank 1
  - member2 377,010: wrong slot: self3 rank 1
  - member3 132,698: broad evidence only, not slot-proven

| slot | candidates |
| --- | --- |
| self member1 | 1:295,576 <small>selected-current-output+self.raw.member-row-order</small> |
| self member2 | 1:85,668 <small>selected-current-output+self.raw.member-row-order</small> |
| self member3 | 1:377,010 <small>selected-current-output+self.raw.member-row-order</small> |
| enemy member1 | 1:455,095 <small>selected-current-output</small><br>2:1,712,804 <small>enemy.raw.member-row-order</small> |
| enemy member2 | 1:830,582 <small>selected-current-output</small><br>2:455,095 <small>enemy.raw.member-row-order</small> |
| enemy member3 | 1:261,011 <small>selected-current-output</small><br>2:830,582 <small>enemy.raw.member-row-order</small> |

### IMG_9337 S3 self

- Expected: members 1,016,790 / 573,428 / 573,265, bonus 0, total 2,163,483
- Selected: members 573,428 / 573,265, total 2,105,485
- Category: safety guard: exact displayed total absent
- Stage-wide solver rejection: no-exact-six-member-equation
- Proposal counts: total 0, changed 0, expected-side proposals 0
- Exact total evidence for side: no (1,016,790, 573,428, 573,265, 2,105,485, 70,650)
- Exact bonus evidence: yes
- Expected member candidate findings:
  - member1 1,016,790: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member2 573,428: slot rank 2, raw/order-medium, self.raw.member-row-order
  - member3 573,265: slot rank 1, raw/order-medium, self.raw.member-row-order

| slot | candidates |
| --- | --- |
| self member1 | 1:573,428 <small>selected-current-output</small><br>2:1,016,790 <small>self.raw.member-row-order</small> |
| self member2 | 1:573,265 <small>selected-current-output</small><br>2:573,428 <small>self.raw.member-row-order</small> |
| self member3 | 1:573,265 <small>self.raw.member-row-order</small> |
| enemy member1 | 1:1,161,905 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member2 | 1:922,114 <small>selected-current-output+enemy.raw.member-row-order</small> |
| enemy member3 | 1:516,104 <small>selected-current-output+enemy.raw.member-row-order</small> |
