# Smartphone Total Capture Diagnostics

Generated: 2026-07-24T10:19:22.160Z

## Scope

Runner-only diagnostics for smartphone rows where the current production output still fails and the exact expected displayed total is absent from existing total evidence. The first focus is Stage3 total crop capture quality.

This report does not change production OCR output, member selection, or recovery eligibility.

## Summary

- Baseline source: smartphone baseline cache
- Missing-total rows evaluated: 11
- Stage3 rows evaluated: 11
- Rows where an exact expected total was newly exposed by a diagnostic variant: 0
- Diagnostic false-positive rows with exact expected total plus competing total candidates: 0

## Best Variants

- Best single variant: none

Best fixed variant set:
- none

## Hypothetical Solver Impact

This is a diagnostic-only estimate of what would happen if exact displayed-total evidence from the best fixed variant set were appended to total evidence and the existing smartphone crown/stage-wide simulations were re-scored. It is not production adoption.

- Exact total evidence added rows: 0
- Cached original image accuracy before existing production solver replay: 56 / 89
- Image accuracy after existing production solver replay plus diagnostic total evidence: 62 / 89
- Unique recovered stages after augmented evidence: 7

## Known Sample Impact

- IMG_9308: 0 rows with new exact total evidence; not in missing-total Stage3 diagnostic set
- IMG_9310: 0 rows with new exact total evidence; S3 self still missing exact total
- IMG_9319: 0 rows with new exact total evidence; not in missing-total Stage3 diagnostic set

## Per-Row Results

### user-reports/passed/IMG_9084.png S3 self

- Expected members: `200294`, `379028`, `382431`
- Expected bonus: `76486`
- Expected total: `1038239`
- Current members: `200294`, `379028`, `382431`
- Current total: `1038259`
- Existing total evidence: `1038259`, `1058259`, `200294`, `379028`, `382431`, `76486`, `17587`, `73869`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 0

### user-reports/unreviewed/IMG_9281.png S3 enemy

- Expected members: `343001`, `343056`, `257235`
- Expected bonus: `68611`
- Expected total: `1011903`
- Current members: `343001`, `343056`, `257235`
- Current total: `1011905`
- Existing total evidence: `1011905`, `343001`, `343056`, `257235`, `68611`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 7

### user-reports/unreviewed/IMG_9310.png S3 self

- Expected members: `212343`, `410425`, `48140`
- Expected bonus: `82085`
- Expected total: `752993`
- Current members: `212343`, `410425`, `48140`
- Current total: `670908`
- Existing total evidence: `212343`, `410425`, `48140`, `82085`, `71232`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 1

### user-reports/unreviewed/IMG_9315.png S3 self

- Expected members: `899249`, `252319`, `1026470`
- Expected bonus: `205294`
- Expected total: `2383332`
- Current members: `899249`, `252319`, `205294`
- Current total: `1377391`
- Existing total evidence: `2583533`, `2385532`, `899249`, `252319`, `1026470`, `205294`, `70650`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 1

### user-reports/unreviewed/IMG_9316.png S3 self

- Expected members: `1273010`, `696275`, `382517`
- Expected bonus: `254602`
- Expected total: `2606404`
- Current members: `696275`, `382517`, `254602`
- Current total: `1333394`
- Existing total evidence: `2000404`, `1273010`, `696275`, `382517`, `254602`, `70650`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 0

### user-reports/unreviewed/IMG_9317.png S3 self

- Expected members: `1060079`, `276500`, `804645`
- Expected bonus: `212015`
- Expected total: `2353239`
- Current members: `276500`, `804645`, `212015`
- Current total: `1293160`
- Existing total evidence: `2323239`, `1060079`, `276500`, `804645`, `212015`, `70650`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 0

### user-reports/unreviewed/IMG_9318.png S3 self

- Expected members: `1001405`, `812662`, `938864`
- Expected bonus: `200281`
- Expected total: `2953212`
- Current members: `812662`, `938864`, `200281`
- Current total: `1951807`
- Existing total evidence: `2955212`, `2925212`, `1001405`, `812662`, `938864`, `200281`, `70650`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 0

### user-reports/unreviewed/IMG_9324.png S3 self

- Expected members: `1065816`, `436774`, `942493`
- Expected bonus: `213163`
- Expected total: `2658246`
- Current members: `436774`, `942493`, `213163`
- Current total: `1592430`
- Existing total evidence: `2008240`, `1065816`, `436774`, `942493`, `213163`, `70650`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 0

### user-reports/unreviewed/IMG_9328.png S3 self

- Expected members: `899855`, `1043301`, `875583`
- Expected bonus: `208660`
- Expected total: `3027399`
- Current members: `899855`, `875583`, `208660`
- Current total: `1984098`
- Existing total evidence: `3027359`, `899855`, `1043301`, `875583`, `208660`, `70650`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 0

### user-reports/unreviewed/IMG_9336.png S3 self

- Expected members: `1029078`, `505711`, `672417`
- Expected bonus: `205815`
- Expected total: `2413021`
- Current members: `505711`, `672417`, `205815`
- Current total: `1442558`
- Existing total evidence: `2415021`, `1029078`, `505711`, `672417`, `205815`, `70650`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 0

### user-reports/unreviewed/IMG_9337.png S3 self

- Expected members: `1016790`, `573428`, `573265`
- Expected bonus: `0`
- Expected total: `2163483`
- Current members: `573428`, `573265`
- Current total: `2105485`
- Existing total evidence: `1016790`, `573428`, `573265`, `2105485`, `70650`
- Exact total exposed by variants: 0
- Best exact variants: none
- Competing exact/near diagnostic candidates: 0

## Recommendation

The tested Stage3 total crop variants did not expose enough exact displayed-total evidence for recovery work. Productionization and parity are not recommended from this diagnostic result.
