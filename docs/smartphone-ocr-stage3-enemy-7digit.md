# Smartphone Stage3 Enemy 7-Digit Recovery

This note documents the generic Stage3 enemy recovery investigated from the
`IMG_9320`-`IMG_9337` smartphone sample batch.

The production rule is intentionally narrow:

- smartphone OCR only
- Stage3 enemy only
- no filename or image ID checks
- no hard-coded score values
- no near-match total or member inference
- selected enemy member3 must be a plausible bonus value
- the ordered member-row OCR must contain three proposed members followed by
  that same bonus value
- exactly one proposed member must be a clean observed 7-digit member that was
  dropped from the selected enemy row
- removing that 7-digit member from the proposed row must reproduce the first
  two selected enemy members in order
- proposed members plus the selected bonus must equal an exact displayed total
  from parsed total candidates or exact joined total fragments
- exactly one proposal may satisfy the guard

The correction log entry is:

```text
stage3EnemySevenDigitRecovery applied ...
```

## Positive Samples

| Image | Current bad Stage3 enemy shape | Recovered Stage3 enemy | Pattern |
| --- | --- | --- | --- |
| `IMG_9321.png` | `256186 / 543227 / 308718`, total `1108131` | `1543590 / 256186 / 543227`, bonus `308718`, total `2651721` | leading 7-digit member dropped; bonus selected as member3 |
| `IMG_9334.png` | `957950 / 841305 / 260864`, total `2086205` | `957950 / 1304323 / 841305`, bonus `260864`, total `3364442` | middle 7-digit member dropped; bonus selected as member3 |
| `IMG_9335.png` | `955667 / 987148 / 315444`, total `2309803` | `1577222 / 955667 / 987148`, bonus `315444`, total `3835481` | leading 7-digit member dropped; bonus selected as member3 |
| `IMG_9337.png` | `922114 / 516104 / 232381`, total `1670599` | `1161905 / 922114 / 516104`, bonus `232381`, total `2832504` | leading 7-digit member dropped; bonus selected as member3 |

All four positives had exact member-row evidence, exact total evidence, and a
single exact equation.

## Blocked Sample

`IMG_9322.png` remains blocked. Its Stage3 enemy row has a different shape:

```text
selected: 756949 / 275407 / 275107
selected total: 1377038
expected: 367211 / 756949 / 1377038
expected bonus: 275407
expected total: 2776605
```

The 7-digit value is selected as the total, not cleanly dropped from the member
row in the same way as the positive samples. The selected third value is also a
near but wrong bonus-like value. The strict exact-equation guard therefore does
not apply.

## Safety Controls

The rule was tested against the newer sample batch, older smartphone controls,
and the desktop safety fixture. It should not affect desktop OCR because the
helper exits unless OCR mode is `smartphone`.
