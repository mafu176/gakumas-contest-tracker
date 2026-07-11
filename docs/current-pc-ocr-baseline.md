# Current PC OCR Baseline

Generated: 2026-07-11T07:30:38.709Z

## Scope

- Primary dataset: the 10 current PC/DMM screenshots in `C:\Users\gkhay\Pictures\DMMGamePlayer\学園アイドルマスター`.
- Legacy desktop screenshots are not included in the baseline counts.
- Smartphone samples are not included in the baseline counts.
- This is audit-first current-PC work. It does not add filename-specific corrections or production recovery rules.

## 10 Current-PC Screenshots

PowerShell filesystem inspection confirmed the source folder as `C:\Users\gkhay\Pictures\DMMGamePlayer\学園アイドルマスター` and these exact filenames:

1. スクリーンショット 2026-07-11 144846091.png
2. スクリーンショット 2026-07-11 144908802.png
3. スクリーンショット 2026-07-11 144932916.png
4. スクリーンショット 2026-07-11 144958188.png
5. スクリーンショット 2026-07-11 145018419.png
6. スクリーンショット 2026-07-11 145038835.png
7. スクリーンショット 2026-07-11 145100208.png
8. スクリーンショット 2026-07-11 145126932.png
9. スクリーンショット 2026-07-11 145152780.png
10. スクリーンショット 2026-07-11 145215861.png

The generated artifact paths below may show mojibake on this Windows/Node path because the current-PC source folder is outside the repository; the source files above are the authoritative names.

| # | filename | dimensions | aspect | last modified | artifact |
| ---: | --- | --- | ---: | --- | --- |
| 1 | スクリーンショット 2026-07-11 144846091.png | 541x961 | 0.562955 | 2026-07-11T05:48:46.317Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 144846091.png/analysis.json |
| 2 | スクリーンショット 2026-07-11 144908802.png | 541x961 | 0.562955 | 2026-07-11T05:49:09.035Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 144908802.png/analysis.json |
| 3 | スクリーンショット 2026-07-11 144932916.png | 541x961 | 0.562955 | 2026-07-11T05:49:33.155Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 144932916.png/analysis.json |
| 4 | スクリーンショット 2026-07-11 144958188.png | 541x961 | 0.562955 | 2026-07-11T05:49:58.422Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 144958188.png/analysis.json |
| 5 | スクリーンショット 2026-07-11 145018419.png | 541x961 | 0.562955 | 2026-07-11T05:50:18.657Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 145018419.png/analysis.json |
| 6 | スクリーンショット 2026-07-11 145038835.png | 541x961 | 0.562955 | 2026-07-11T05:50:39.058Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 145038835.png/analysis.json |
| 7 | スクリーンショット 2026-07-11 145100208.png | 541x961 | 0.562955 | 2026-07-11T05:51:00.431Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 145100208.png/analysis.json |
| 8 | スクリーンショット 2026-07-11 145126932.png | 541x961 | 0.562955 | 2026-07-11T05:51:27.167Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 145126932.png/analysis.json |
| 9 | スクリーンショット 2026-07-11 145152780.png | 541x961 | 0.562955 | 2026-07-11T05:51:53.001Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 145152780.png/analysis.json |
| 10 | スクリーンショット 2026-07-11 145215861.png | 541x961 | 0.562955 | 2026-07-11T05:52:16.079Z | tmp/current-pc-ocr-baseline/current-pc__スクリーンショット 2026-07-11 145215861.png/analysis.json |

## Layout Characteristics

- total current-PC samples: 10
- dimensions observed: 541x961
- aspect ratios observed: 0.562955
- all 10 share the same dimensions: yes
- layout geometry appears consistent across the 10 samples from dimensions and visual placement.
- browser/device scaling does not appear to vary inside this 10-sample folder; every file is 541x961.
- The layout is smartphone-like in aspect ratio but uses a DMM/PC screenshot family and is intentionally separated as `current-pc`.

## Architecture Inspection Summary

Current smartphone OCR principles reused for the current-PC baseline:

- direct fixed ROI extraction by stage/side/role
- alternative total/member candidate bands
- raw OCR text and numeric candidates preserved in debug artifacts
- member/total/bonus evidence kept separate where available
- exact integer member-sum and member-sum-plus-bonus validation
- suspicious-state reporting before recovery
- correction logs and final-result evidence are preserved together

Current-PC-specific adaptations:

- separate `current-pc` source mode in the runner
- separate normalized layout family `current-pc-2026-07-result`
- stage total/member ROIs are placed higher than smartphone ROIs and are not based on legacy desktop absolute geometry
- legacy desktop recovery logic is not used for current-PC baseline images
- current-PC debug artifacts include original screenshot, annotated ROI image, stage crops, side total/member/bonus crops, binarized crop images, JSON candidate evidence, structural checks, and audit-only retry plans

## Layout Detector

- Detector: image size/aspect based for the initial 10-sample family.
- Guard: width 541 +/- 2, height 961 +/- 2, aspect within 0.003 of 541/961.
- It does not use filenames, screenshot timestamps, score values, or hard-coded OCR contents.
- Future anchor-assisted adjustment may be added if another scale appears.

## ROI Strategy

- Stage regions: normalized vertical bands for S1/S2/S3.
- Side regions: fixed left/right bands with separate total/member/bonus role crops.
- Candidate metadata currently includes source role, stage/side, raw OCR text, numeric values, and ROI rectangle.
- Per-token bbox geometry is available in existing audit helpers but is not yet run by default for all current-PC crops.

## Structural Consistency Design

- Valid exact forms: `member1 + member2 + member3 == total` or `member1 + member2 + member3 + bonus == total`.
- Suspicious states are reported for missing member/total, total lower than member sum, total/member reuse, bonus/member reuse, unselected clean 7-digit candidates, and competing exact raw interpretations.
- Exact arithmetic only; no near-match guessing.

## Selective Retry Design

- This pass records retry triggers and proposed variants but does not alter final OCR output.
- Retry is scoped to suspicious stage/side/role only.
- Proposed variants: alternate threshold, alternate contrast, wider/narrower ROI, shifted ROI.
- Retry evidence should be merged as additional evidence only; a future recovery must still require a unique exact interpretation.

## Static-Image Adaptation

- No temporal voting, multi-frame consensus, best-frame selection, or frame stability logic is used.
- The static substitute is multi-pass ROI interpretation plus exact structural validation on a single screenshot.

## Baseline Results

| image | status | S1 self | S1 enemy | S2 self | S2 enemy | S3 self | S3 enemy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| スクリーンショット 2026-07-11 144846091.png | unresolved | members 169765, 296381, 167466; total 692,888; sum 633,612; bonus 59276; exact yes; suspicious none | members 185265, 220680, 126490; total 532,435; sum 532,435; bonus (none); exact yes; suspicious none | members 190770, 436081, 82001; total 796,068; sum 708,852; bonus 87216; exact yes; suspicious none | members 33386, 91957, 74459; total 199,802; sum 199,802; bonus (none); exact yes; suspicious unique-exact-raw-interpretation-differs-from-selected-result | members 705961, 667889, 215728; total 1,632,283; sum 1,589,578; bonus 42705; exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 100084, 260326, 41185; total 401,595; sum 401,595; bonus (none); exact yes; suspicious none |
| スクリーンショット 2026-07-11 144908802.png | unresolved | members 711565, 317040, 142513; total 1,267,246; sum 1,171,118; bonus 142513; exact no; suspicious selected-total-not-exact-member-sum-or-member-sum-plus-bonus, bonus-candidate-selected-as-member, clean-7digit-candidate-present-but-unselected | members 141683, 60043, 69402; total 271,128; sum 271,128; bonus (none); exact yes; suspicious none | members 259014, 182589, 42369; total 535,774; sum 483,972; bonus 51802; exact yes; suspicious none | members 40141, 28221, 55389; total 123,751; sum 123,751; bonus (none); exact yes; suspicious none | members 951228, 628395, 449753; total 2,219,621; sum 2,029,376; bonus 190245; exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 370750, 46611, 26083; total 443,444; sum 443,444; bonus (none); exact yes; suspicious none |
| スクリーンショット 2026-07-11 144932916.png | unresolved | members 62103, 366858, 173955; total 676,287; sum 602,916; bonus 73371; exact yes; suspicious none | members 18659, 69106, 38261; total 126,026; sum 126,026; bonus (none); exact yes; suspicious none | members 221508, 128329, 176419; total 526,256; sum 526,256; bonus (none); exact yes; suspicious none | members 60630, 34098, 26043; total 120,771; sum 120,771; bonus (none); exact yes; suspicious none | members 950088, 1135373, 894637; total 3,002,805; sum 2,980,098; bonus 22707; exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 85746, 68166, 98264; total 252,176; sum 252,176; bonus (none); exact yes; suspicious none |
| スクリーンショット 2026-07-11 144958188.png | unresolved | members 606205, 421605, 100044; total 1,127,854; sum 1,127,854; bonus (none); exact yes; suspicious clean-7digit-candidate-present-but-unselected, unique-exact-raw-interpretation-differs-from-selected-result | members 331886, 563429, 635036; total 1,657,358; sum 1,530,351; bonus 127007; exact yes; suspicious clean-7digit-candidate-present-but-unselected, unique-exact-raw-interpretation-differs-from-selected-result | members 92704, 79726, 43333; total 215,763; sum 215,763; bonus (none); exact yes; suspicious unique-exact-raw-interpretation-differs-from-selected-result | members 532105, 110594, 106421; total 819,149; sum 749,120; bonus 106421; exact no; suspicious selected-total-not-exact-member-sum-or-member-sum-plus-bonus, bonus-candidate-selected-as-member, unique-exact-raw-interpretation-differs-from-selected-result | members 678900, 698436, 800021; total 2,193,357; sum 2,177,357; bonus 16000; exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 361902, 275018, 36086; total 673,006; sum 673,006; bonus (none); exact yes; suspicious none |
| スクリーンショット 2026-07-11 145018419.png | unresolved | members 67096, 92023, 149844; total 308,963; sum 308,963; bonus (none); exact yes; suspicious none | members 109786, 129846, 306407; total 607,320; sum 546,039; bonus 61281; exact yes; suspicious none | members 262782, 104193, 143648; total 510,623; sum 510,623; bonus (none); exact yes; suspicious none | members 71656, 57380, 16318; total 145,354; sum 145,354; bonus (none); exact yes; suspicious unique-exact-raw-interpretation-differs-from-selected-result | members 756719, 867029, 5828; total 1,802,981; sum 1,629,576; bonus (none); exact no; suspicious selected-total-not-exact-member-sum-or-member-sum-plus-bonus, clean-7digit-candidate-present-but-unselected | members 296074, 110009, 27156; total 433,239; sum 433,239; bonus (none); exact yes; suspicious none |
| スクリーンショット 2026-07-11 145038835.png | unresolved | members 239364, 319952, 117433; total 740,739; sum 676,749; bonus 63990; exact yes; suspicious none | members 225319, 32290, 40570; total 298,179; sum 298,179; bonus (none); exact yes; suspicious none | members 116426, 147501, 284590; total 605,435; sum 548,517; bonus 56918; exact yes; suspicious none | members 135158, 123945, 62475; total 321,578; sum 321,578; bonus (none); exact yes; suspicious none | members 899855, 875583, 708660; total 2,484,098; sum 2,484,098; bonus (none); exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 201826, 63205, 12929; total 277,960; sum 277,960; bonus (none); exact yes; suspicious clean-7digit-candidate-present-but-unselected |
| スクリーンショット 2026-07-11 145100208.png | unresolved | members 413479, 318575, 183428; total 915,482; sum 915,482; bonus (none); exact yes; suspicious none | members 41330, 127105, 103446; total 271,881; sum 271,881; bonus (none); exact yes; suspicious none | members 100447, 206833, 82452; total 431,098; sum 389,732; bonus 41366; exact yes; suspicious none | members 31744, 104882, 56799; total 193,425; sum 193,425; bonus (none); exact yes; suspicious none | members 548299, 567465, 221427; total 1,373,739; sum 1,337,191; bonus 36548; exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 62564, 41265, 186125; total 289,954; sum 289,954; bonus (none); exact yes; suspicious none |
| スクリーンショット 2026-07-11 145126932.png | unresolved | members 108559, 404162, 155153; total 748,706; sum 667,874; bonus 80832; exact yes; suspicious none | members 58309, 42147, 78925; total 179,381; sum 179,381; bonus (none); exact yes; suspicious none | members 172602, 187488, 155370; total 552,957; sum 515,460; bonus 37497; exact yes; suspicious none | members 63697, 98884, 76285; total 238,866; sum 238,866; bonus (none); exact yes; suspicious none | members 419172, 944928, 215037; total 1,768,556; sum 1,579,137; bonus 189419; exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 21502, 46021, 58987; total 126,510; sum 126,510; bonus (none); exact yes; suspicious none |
| スクリーンショット 2026-07-11 145152780.png | unresolved | members 381727, 109498, 112716; total 680,286; sum 603,941; bonus 76345; exact yes; suspicious none | members 52611, 104418, 89610; total 246,639; sum 246,639; bonus (none); exact yes; suspicious none | members 132068, 333301, 110037; total 644,066; sum 575,406; bonus (none); exact no; suspicious selected-total-not-exact-member-sum-or-member-sum-plus-bonus | members 38629, 55991, 28869; total 123,489; sum 123,489; bonus (none); exact yes; suspicious none | members 877699, 744217, 175539; total 1,797,455; sum 1,797,455; bonus (none); exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 34917, 184256, 65797; total 284,970; sum 284,970; bonus (none); exact yes; suspicious none |
| スクリーンショット 2026-07-11 145215861.png | unresolved | members 433069, 362726, 149521; total 945,316; sum 945,316; bonus (none); exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 98618, 34333, 0; total 280,413; sum 132,951; bonus (none); exact no; suspicious missing-selected-member, selected-total-not-exact-member-sum-or-member-sum-plus-bonus | members 245836, 136947, 142024; total 573,974; sum 524,807; bonus 49167; exact yes; suspicious none | members 15401, 14531, 32520; total 62,452; sum 62,452; bonus (none); exact yes; suspicious none | members 822138, 942720, 18854; total 1,783,712; sum 1,783,712; bonus (none); exact yes; suspicious clean-7digit-candidate-present-but-unselected | members 21409, 66989, 56193; total 144,591; sum 144,591; bonus (none); exact yes; suspicious none |

## 10-Sample Summary

- total current-PC samples: 10
- PASS count: 0
- FAIL count: 0
- unresolved count: 10

These counts intentionally exclude legacy desktop and smartphone samples.

## Recurring Failure / Suspicious Groups

| rank | group | count | examples |
| ---: | --- | ---: | --- |
| 1 | clean-7digit-candidate-present-but-unselected | 15 | スクリーンショット 2026-07-11 144846091.png S3 self; スクリーンショット 2026-07-11 144908802.png S1 self; スクリーンショット 2026-07-11 144908802.png S3 self; スクリーンショット 2026-07-11 144932916.png S3 self; スクリーンショット 2026-07-11 144958188.png S1 self; スクリーンショット 2026-07-11 144958188.png S1 enemy; ... |
| 2 | unique-exact-raw-interpretation-differs-from-selected-result | 6 | スクリーンショット 2026-07-11 144846091.png S2 enemy; スクリーンショット 2026-07-11 144958188.png S1 self; スクリーンショット 2026-07-11 144958188.png S1 enemy; スクリーンショット 2026-07-11 144958188.png S2 self; スクリーンショット 2026-07-11 144958188.png S2 enemy; スクリーンショット 2026-07-11 145018419.png S2 enemy |
| 3 | selected-total-not-exact-member-sum-or-member-sum-plus-bonus | 5 | スクリーンショット 2026-07-11 144908802.png S1 self; スクリーンショット 2026-07-11 144958188.png S2 enemy; スクリーンショット 2026-07-11 145018419.png S3 self; スクリーンショット 2026-07-11 145152780.png S2 self; スクリーンショット 2026-07-11 145215861.png S1 enemy |
| 4 | bonus-candidate-selected-as-member | 2 | スクリーンショット 2026-07-11 144908802.png S1 self; スクリーンショット 2026-07-11 144958188.png S2 enemy |
| 5 | missing-selected-member | 1 | スクリーンショット 2026-07-11 145215861.png S1 enemy |

## Ranked Generalization Targets

1. Improve current-PC role classification where exact structural audit reports total/member/bonus reuse.
2. Add bbox-backed current-PC candidate provenance for any recurring 7-digit dropped-member cases.
3. Implement selective retry execution only after a recurring suspicious group has exact positive samples and negative controls.

## Recommendation

- Keep this first current-PC pass as audit-first infrastructure.
- Do not productionize a new current-PC recovery rule yet from only these 10 samples.
- Next step: manually confirm expected values for the highest-suspicion current-PC screenshots, then rerun with expected fixtures and only then design a narrow generic recovery.

## Artifact Location

- directory: tmp/current-pc-ocr-baseline
- summary: tmp/current-pc-ocr-baseline/summary.json
