# Bright Line R2 Upload Watcher — Best Practice

Single source of truth for the T9 watcher. Aligns with `tools/upload-watcher.mjs`, `tools/pillars.mjs`, and `brightline/lib/portfolioPillars.ts`.

## What It Does

1. **Watches:** `/Volumes/T9/05_EXPORTS/WEB_FULL/{architecture,campaign,corporate}`
2. **Appends** a NEW row to the "Brightline Image Uploads" Google Sheet (Filename_Base, Section_Slug, File_Path, File_Size)
3. **Fetches** pending rows from the sheet
4. **Uploads** full image to R2, generates WebP thumb, uploads thumb
5. **Updates** the sheet row (Filename_Final, R2_Key_Full, R2_Key_Thumb, Status=Uploaded)

**Filename format:** `bl-{arc,cam,cor}-{yyyymmdd}-{seq}.ext` (e.g. `bl-cam-20260227-001.jpg`)

## Pillars (3 Only)

| Slug | Label |
|------|-------|
| arc | Architecture & Real Estate |
| cam | Campaign & Advertising |
| cor | Corporate & Executive |

T9 folder names can be **short** (`arc`, `cam`, `cor`) or **full** (`architecture`, `campaign`, `corporate`). Lightroom presets like "BrightLine: Web - Architecture" typically export to full names; both work.

## T9 Folder Structure

Create on external drive T9 (use either naming style):

```
/Volumes/T9/05_EXPORTS/WEB_FULL/architecture   # or arc
/Volumes/T9/05_EXPORTS/WEB_FULL/campaign       # or cam
/Volumes/T9/05_EXPORTS/WEB_FULL/corporate      # or cor
```

WEB_THUMB is optional; the watcher generates thumbs.

## R2 Paths

Bucket name is **not** part of the key. Keys start at `portfolio/`.

- **web_full**: Full-size originals (JPG/PNG). No WebP.
- **web_thumb**: WebP thumbnails only.

| Asset | Path |
|-------|------|
| Full | `portfolio/{pillar}/web_full/bl-{pillar}-{yyyymmdd}-{seq}.ext` |
| Thumb | `portfolio/{pillar}/web_thumb/bl-{pillar}-{yyyymmdd}-{seq}.webp` |

## Install Dependencies

```bash
cd ~/brightline/tools
npm install dotenv chokidar sharp @aws-sdk/client-s3 mime-types
```

## Environment Variables

Create `.env` in the tools directory (e.g. `~/brightline/tools/.env`):

```
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://<your-public-domain>
SHEET_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_ID/exec
WEBHOOK_SECRET=<shared-secret>
```

- **R2 vars:** Required for uploads
- **SHEET_WEBHOOK_URL:** Required for full flow (sheet append → pending → upload → update)
- **WEBHOOK_SECRET:** Must match Apps Script Script Properties; if unset, sheet sync is skipped or auth is bypassed (dev)
- **R2_PUBLIC_URL:** Optional, for logged URLs

Add `.env` to `.gitignore`.

## Run Watcher

```bash
cd ~/brightline/tools
node upload-watcher.mjs
```

Export one image from Lightroom to `/Volumes/T9/05_EXPORTS/WEB_FULL/campaign` — you should see `[SHEET] Appended`, `[OK] Uploaded FULL`, and `[OK] Uploaded THUMB`.

## Fallback: No Sheet

If `SHEET_WEBHOOK_URL` is not set, the watcher falls back to direct upload (no sheet logging). Filenames still use `bl-{arc,cam,cor}-{yyyymmdd}-{seq}.ext`.

## Auto-Run on Login (LaunchAgent)

**Important:** launchd cannot run scripts under **Desktop**. Install the watcher in **`~/brightline/tools`**.

**Setup:**

1. **Sync tools:** `mkdir -p ~/brightline/tools && cp -R ~/Desktop/brightline/tools/* ~/brightline/tools/`
2. **Create `~/brightline/tools/.env`** with R2 vars, SHEET_WEBHOOK_URL, WEBHOOK_SECRET.
3. **Run `npm install`** in `~/brightline/tools`.
4. Copy and edit the plist:
   ```bash
   cp tools/com.brightline.r2watcher.plist.example ~/Library/LaunchAgents/com.brightline.r2watcher.plist
   ```
   Set ProgramArguments and WorkingDirectory to `~/brightline/tools`.
5. Load the agent:

```bash
launchctl unload ~/Library/LaunchAgents/com.brightline.r2watcher.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.brightline.r2watcher.plist
```

6. Verify:

```bash
launchctl list | grep brightline
tail -n 50 ~/Library/Logs/brightline-r2watcher.log
```

## What Happens to R2 Files

| Action | Result |
|--------|--------|
| **Full image** | Uploaded as bl-{pillar}-{yyyymmdd}-{seq}.ext (original format). |
| **Thumb** | Generated WebP (800px long edge, quality 80). |
| **Already exists** | Skipped. No overwrite. |
| **Re-export same file** | Skipped. Delete R2 object manually to replace. |
| **Delete from T9** | Nothing. R2 is unchanged. |

**Caching:** `Cache-Control: public, max-age=31536000, immutable` for all uploaded objects.

## Using Images in Admin

After upload, R2 keys look like:
- Full: `portfolio/cam/web_full/bl-cam-20260227-001.jpg`
- Thumb: `portfolio/cam/web_thumb/bl-cam-20260227-001.webp`

In Admin → Work → project → Media: paste the **full** key in "R2 key" and click "Add by key".

## Google Sheet Webhook

See `docs/APPS_SCRIPT.md` for the Apps Script handler (append, update, pending) and column layout.
