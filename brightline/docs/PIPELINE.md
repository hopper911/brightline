# Bright Line Pipeline — Production Ingestion

Sheet-first flow: validate → Sheet append → sequence → rename → Sharp → R2 → website API → Sheet update.

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
  _processed/
  _failed/
  _tmp/              (temporary Sharp output, deleted after upload)
  pipeline/          (Node project)
```

## Pipeline Project

```bash
cd BrightLine_images/pipeline
npm install
cp .env.example .env
# Edit .env: R2_*, SITE_URL, UPLOAD_TOKEN, SHEET_ID, GOOGLE_CREDENTIALS_PATH
npm start              # watch mode
npm run process:once   # one-off run
```

## Flow

1. **Validate** — Section from folder (`_incoming/{arc,cam,cor}`). Reject others → `_failed/`.
2. **Sheet append** — Append row with Status=QUEUED.
3. **Sequence** — Get next sequence from Sheet (Section + Captured_Date). Format: `{section}-{yyyymmdd}-{seq3}.webp`.
4. **Rename + archive** — Move to `_processed/`. Update Sheet Status=RENAMED.
5. **Sharp** — Full: 2400px long edge, WebP 82. Thumb: 800px, quality 68. Output to `_tmp/`, delete after upload.
6. **R2 upload** — Keys: `portfolio/{section}/web_full/{base}.webp`, `portfolio/{section}/web_thumb/{base}.webp`.
7. **Website API** — POST to `/api/admin/media/upsert`.
8. **Sheet update** — Status=DB_OK or ERROR.

## R2 Keys

- **Full:** `portfolio/{arc,cam,cor}/web_full/{section}-{yyyymmdd}-{seq3}.webp`
- **Thumb:** `portfolio/{arc,cam,cor}/web_thumb/{section}-{yyyymmdd}-{seq3}.webp`
- **Cache-Control:** `public, max-age=31536000, immutable`

## API: /api/admin/media/upsert

- **Auth:** Bearer `UPLOAD_TOKEN` or NextAuth admin session
- **Body:** `{ section, capturedDate, sequence, filename, fullUrl, thumbUrl, r2KeyFull, r2KeyThumb, projectId? }`
- **Response:** `{ ok: true, galleryId, imageId }`

## Google Sheet Schema

Columns (0-based): Original_Filename, Section, Captured_Date, Sequence, Filename_Final, R2_Key_Full, R2_Key_Thumb, Status, Error, Created_At, Updated_At.

| Column | Description |
|--------|-------------|
| Original_Filename | Source file name |
| Section | arc, cam, cor |
| Captured_Date | yyyyymmdd or yyyy-mm-dd |
| Sequence | 001, 002, ... |
| Filename_Final | e.g. arc-20260227-001.webp |
| R2_Key_Full | portfolio/arc/web_full/... |
| R2_Key_Thumb | portfolio/arc/web_thumb/... |
| Status | QUEUED, RENAMED, DB_OK, ERROR |
| Error | Error message if Status=ERROR |
| Created_At | ISO timestamp |
| Updated_At | ISO timestamp |

See `docs/APPS_SCRIPT.md` for setup.

## T9 Watcher (Alternative)

For direct T9 export: `/Volumes/T9/05_EXPORTS/WEB_FULL/{arc,cam,cor}/`. See `docs/WATCHER.md`.

## Lightroom Export

Export high-quality JPEG (or original format) to:
- `~/BrightLine_images/_incoming/arc` (or cam, cor)
- Or `/Volumes/T9/05_EXPORTS/WEB_FULL/arc` if using T9 watcher

No WebP, no thumb export from Lightroom. Pipeline generates everything.
