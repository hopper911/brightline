# Lightroom to Site Upload Workflow

The production pipeline ingests images from Lightroom exports into **client galleries** (Gallery + GalleryImage). For public Work section projects, use Admin → Work.

## Section Codes (arc, cam, cor)

| Code | Label |
|------|-------|
| arc | Architecture & Real Estate |
| cam | Campaign & Advertising |
| cor | Corporate & Executive |

## Folder Structure

```
BrightLine_images/
  _incoming/
    arc/
    cam/
    cor/
  pipeline/    (Node project)
```

## Step 1: Export from Lightroom

Export high-quality JPEG (or PNG/WebP) to:

- `~/BrightLine_images/_incoming/arc` (or `cam`, `cor`)

Or, if using the T9 watcher:

- `/Volumes/T9/05_EXPORTS/WEB_FULL/arc` (or cam, cor)

No thumb export from Lightroom. The pipeline generates full and thumb WebP automatically.

## Step 2: Run the Pipeline

```bash
cd BrightLine_images/pipeline
npm install
cp .env.example .env
# Edit .env: R2_*, SITE_URL, UPLOAD_TOKEN, SHEET_ID, GOOGLE_CREDENTIALS_PATH
npm start              # watch mode — processes new files as they arrive
npm run process:once   # one-off run — processes all files in _incoming
```

Flow: validate section → Sheet append → sequence → rename → Sharp (full + thumb) → R2 upload → POST `/api/admin/media/upsert` → Sheet update.

## R2 Keys

- Full: `portfolio/{arc,cam,cor}/web_full/{section}-{yyyymmdd}-{seq3}.webp`
- Thumb: `portfolio/{arc,cam,cor}/web_thumb/{section}-{yyyymmdd}-{seq3}.webp`

## After Upload

1. In Admin, open **Galleries**.
2. Find the import gallery (e.g. `arc-import-20260227`).
3. Set published and create an access code so clients can view it.

## T9 Watcher (Alternative)

For direct export to an external drive: configure the T9 watcher to watch `/Volumes/T9/05_EXPORTS/WEB_FULL/{arc,cam,cor}`. See `docs/WATCHER.md`.

## Environment Variables

In `BrightLine_images/pipeline/.env`:

- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_URL`
- `SITE_URL` — site base URL (e.g. https://brightlinephotography.co)
- `UPLOAD_TOKEN` — Bearer token for `/api/admin/media/upsert`
- `SHEET_ID` — Google Sheet ID (optional; pipeline skips Sheet ops if not set)
- `GOOGLE_CREDENTIALS_PATH` — path to service account JSON (for Sheet)
