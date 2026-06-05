# fewer-members OCR review

Generated from current OCR output before tuning. Empty slots are based on visual review of the six fewer-than-3-idol smartphone samples.

## Summary

- Samples: 6
- Source folder: `test-images/fewer-members`
- OCR source: smartphone
- Enemy-side 1-member sample: not included / still unverified
- Common current failures:
  - Crown bonus values are sometimes selected as member scores when a slot is empty.
  - Displayed totals are sometimes selected as member scores.
  - One-member sides can duplicate the total/member value.
  - Some total values fall back to raw member sum instead of crown-included displayed total.

## HJ9X-pzbkAAZsBP.jpg

- Match result: not parsed by current OCR

### Stage 1

- self members: `285033, 422606, 264690`
- self total: `972329`
- self bonus: not selected; raw total OCR contains `972529`
- enemy members: `307260, 486160, 216093`
- enemy total: `1106745`
- enemy bonus: raw candidate `97232`
- detected empty slots: none

### Stage 2

- self members: `524836, 292907, 217550`
- self total: `1140260`
- self bonus: raw candidate `104967`
- enemy members: `644897, 260193, 384704`
- enemy total: `1289794`
- enemy bonus: none
- detected empty slots: enemy member3 is visually empty; current OCR incorrectly treats `644897` as member1

### Stage 3

- self members: `412526, 423125, 603353`
- self total: `1559674`
- self bonus: raw candidate `120670`
- enemy members: `414706, 303759, 288125`
- enemy total: `1006590`
- enemy bonus: none
- detected empty slots: none

## IMG_9162.png

- Match result: not parsed by current OCR

### Stage 1

- self members: `504862, 42429, 100972`
- self total: `648263`
- self bonus: raw candidate `100972`
- enemy members: `132257, 172308, 64220`
- enemy total: `368785`
- enemy bonus: none
- detected empty slots: self member3 is visually empty; current OCR selects crown bonus as member3

### Stage 2

- self members: `148365, 65791, 273978`
- self total: `542929`
- self bonus: raw candidate `54795`
- enemy members: `181039, 59773, 31660`
- enemy total: `272472`
- enemy bonus: none
- detected empty slots: none

### Stage 3

- self members: `433712, 12893, 33479`
- self total: `566826`
- self bonus: raw candidate `86742`
- enemy members: `181448, 144254, 62807`
- enemy total: `388509`
- enemy bonus: none
- detected empty slots: none

## IMG_9163.png

- Match result: not parsed by current OCR

### Stage 1

- self members: `6535, 544861, 108972`
- self total: `660368`
- self bonus: raw candidate `108972`
- enemy members: `162233, 56973, 138410`
- enemy total: `357616`
- enemy bonus: none
- detected empty slots: self member2/member3 are visually empty; current OCR includes a spurious `6535` and crown bonus as members

### Stage 2

- self members: `134263, 183334, 74512`
- self total: `428775`
- self bonus: raw candidate `36666`
- enemy members: `123530, 69768, 56938`
- enemy total: `250236`
- enemy bonus: none
- detected empty slots: none; current OCR misreads enemy member3/total

### Stage 3

- self members: `393410, 34311`
- self total: `393410`
- self bonus: raw candidate `78682`
- enemy members: `24244, 32067, 114459`
- enemy total: `170770`
- enemy bonus: none
- detected empty slots: self member3 is visually empty; current OCR misses crown-inclusive total

## IMG_9165.png

- Match result: not parsed by current OCR

### Stage 1

- self members: `140009, 370668, 120852`
- self total: `705662`
- self bonus: visible `74133`; current raw OCR has joined/noisy `741335`
- enemy members: `72882, 62944, 84479`
- enemy total: `220305`
- enemy bonus: none
- detected empty slots: none

### Stage 2

- self members: `158678, 78295`
- self total: `252883`
- self bonus: none
- enemy members: `88082, 51744, 160340`
- enemy total: `300166`
- enemy bonus: visible `32068`; current raw OCR has joined/noisy `432068`
- detected empty slots: self member3 is visually empty; current OCR misreads member2 and misses enemy crown-inclusive total `332234`

### Stage 3

- self members: `422946`
- self total: `422946`
- self bonus: raw candidate `84589`
- enemy members: `173165, 206033, 66009`
- enemy total: `445207`
- enemy bonus: none
- detected empty slots: self member2/member3 are visually empty; current OCR misses crown-inclusive total

## IMG_9166.png

- Match result: not parsed by current OCR

### Stage 1

- self members: `159273, 88976, 31854`
- self total: `280103`
- self bonus: raw candidate `31854`
- enemy members: `42758, 122028, 69087`
- enemy total: `233873`
- enemy bonus: none
- detected empty slots: self member3 is visually empty; current OCR selects crown bonus as member3

### Stage 2

- self members: `198427, 165356`
- self total: `165356`
- self bonus: raw candidate `55071`
- enemy members: `26320, 62220, 83688`
- enemy total: `172228`
- enemy bonus: none
- detected empty slots: self member2/member3 are visually empty; current OCR selects displayed total as member1 and misses crown-inclusive total

### Stage 3

- self members: `35646, 443231, 52071`
- self total: `619594`
- self bonus: raw candidate `88646`
- enemy members: `75680, 100365`
- enemy total: `176045`
- enemy bonus: none
- detected empty slots: enemy member3 is visually empty; current OCR correctly returns two enemy members

## IMG_9167.png

- Match result: not parsed by current OCR

### Stage 1

- self members: `181066, 181066`
- self total: `181066`
- self bonus: none
- enemy members: `85829, 166141, 238835`
- enemy total: `538572`
- enemy bonus: raw candidate `47767`
- detected empty slots: self member2/member3 are visually empty; current OCR duplicates the one visible self member

### Stage 2

- self members: `117482, 180781`
- self total: `180781`
- self bonus: none
- enemy members: `207013, 86554, 199826`
- enemy total: `534795`
- enemy bonus: raw candidate `41402`
- detected empty slots: self member3 is visually empty; current OCR misses the two-member sum total

### Stage 3

- self members: `523337, 55793, 47950`
- self total: `731747`
- self bonus: raw candidate `104667`
- enemy members: `112658, 102466, 86597`
- enemy total: `301721`
- enemy bonus: none
- detected empty slots: none
