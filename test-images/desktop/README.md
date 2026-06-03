# Desktop OCR test images

Place DMM PC version contest result screenshots here.

Recommended names:

- desktop_001.png
- desktop_002.png
- desktop_003.png

Run desktop-only OCR investigation:

```bash
node scripts/ocr-test-images.mjs desktop
```

Force desktop OCR source for selected files:

```bash
node scripts/ocr-test-images.mjs --source desktop desktop_001
```

Expected JSON files use the same format as smartphone regression files and should be placed in:

```text
regression-test/expected/
```
