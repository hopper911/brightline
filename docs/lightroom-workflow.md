# Lightroom to Site Upload Workflow

This pipeline uploads images from Lightroom exports into **client galleries** (password-protected galleries with access codes). It does not create public Work section projects; use Admin → Work to manage those.

## Folder structure (one-time setup)

Under your Exports root (e.g. `BrightLine_images/Exports` or custom `EXPORTS_ROOT`):

- **`_incoming/full`** — full-size exports from Lightroom (JPG or PNG).
- **`_incoming/thumb`** — matching thumbnails; **same count and order** as full.

Sections: `acd`, `rea`, `cul`, `biz`, `tri`.

## Step 1: Export from Lightroom

1. Create two export presets: one for full (e.g. 2400px long edge), one for thumb (e.g. 800px).
2. Export fulls into `_incoming/full`, thumbs into `_incoming/thumb`. Filenames can be anything (e.g. `IMG_001.jpg`); prep-images pairs by **index** (first full with first thumb, etc.).
3. Optional: set Title, Caption, and Keywords in Lightroom; prep reads them via `exiftool` if installed and stores them in the manifest.

## Step 2: Prep (resize + WebP + manifest)

```bash
cd brightline
npm run prep -- --root "/path/to/Exports" --section acd
```

Optional: `--date 20260223` for a fixed `yyyymmdd` in output filenames.

- Reads `_incoming/full` and `_incoming/thumb`.
- Writes `_out/full/*.webp` and `_out/thumb/*.webp` (e.g. `acd-20260223-001.webp`) and `_out/manifest.json`.
- Full and thumb counts must match.

## Step 3: Upload to R2 and create gallery (blupload)

```bash
npm run blupload -- --root "/path/to/Exports" --section acd --project ci-siamo --location nyc --year 2026
```

- Uploads each full/thumb pair to R2 under keys like `acd/2026-02-23/full/acd-20260223-001.webp`.
- Upserts a **Gallery** with slug `acd-ci-siamo-nyc-2026` and creates **GalleryImage** rows.
- Add `--clean` to remove `_incoming` and `_out` after a successful run.

## Fastest: one command (prep + upload + clean)

```bash
npm run blpublish -- --root "/path/to/Exports" --section acd --project ci-siamo --location nyc --year 2026 --clean
```

## Environment variables

In `.env` or `.env.local`:

- `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `DATABASE_URL` (or `DIRECT_URL` for scripts)

## After upload

1. In Admin, open **Galleries**.
2. Find the new gallery (e.g. `acd-ci-siamo-nyc-2026`).
3. Set it published and create an access code so clients can view it.

## Scripts reference

- **prep-images.mjs** — resize, WebP, manifest; see `scripts/prep-images.mjs`.
- **blupload.mjs** — upload to R2 and upsert Gallery + GalleryImage; see `scripts/blupload.mjs`.
- **blpublish.mjs** — runs prep then blupload with `--clean`; see `scripts/blpublish.mjs`.
