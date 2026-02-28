# Bright Line — Startup & Commands

Quick reference for daily startup and common operations.

## What Runs Automatically

With the LaunchAgent installed, **nothing is required** each time you start your computer:

1. **Login** → launchd loads `com.brightline.r2watcher`
2. **T9 not yet connected** → Script waits (checks every 5 seconds)
3. **T9 connected** → Watcher starts automatically and monitors exports
4. **New export to T9** → Append to sheet, upload to R2, update sheet

Plug in T9 whenever; the watcher will start as soon as the drive and `WEB_FULL` exist.

---

## Commands (Copy-Paste)

### One-time setup (if not done)

```bash
# 1. Sync tools (run from project root)
mkdir -p ~/brightline/tools
cp -R ~/Desktop/brightline/tools/* ~/brightline/tools/
# Merge .env manually — keep your R2 + SHEET_WEBHOOK_URL in ~/brightline/tools/.env

# 2. Install deps
cd ~/brightline/tools && npm install dotenv chokidar sharp @aws-sdk/client-s3 mime-types

# 3. Install LaunchAgent
cp ~/Desktop/brightline/tools/com.brightline.r2watcher.plist.example ~/Library/LaunchAgents/com.brightline.r2watcher.plist
# Edit plist: ProgramArguments and WorkingDirectory must point to ~/brightline/tools

# 4. Load agent (starts watcher, waits for T9)
launchctl load ~/Library/LaunchAgents/com.brightline.r2watcher.plist
```

### When you need to restart the watcher

```bash
launchctl unload ~/Library/LaunchAgents/com.brightline.r2watcher.plist
launchctl load ~/Library/LaunchAgents/com.brightline.r2watcher.plist
```

### Check status

```bash
launchctl list | grep brightline
tail -30 ~/Library/Logs/brightline-r2watcher.log
```

### Sync tools after changes (e.g. new scripts)

```bash
cp -f ~/Desktop/brightline/tools/*.mjs ~/Desktop/brightline/tools/*.sh ~/brightline/tools/
# Do NOT overwrite ~/brightline/tools/.env
```

### Delete from R2

```bash
cd ~/brightline/tools

# Single object
node delete-from-r2.mjs portfolio/cam/web_full/bl-cam-20260227-001.jpg

# Delete full + thumb in one go
node delete-from-r2.mjs --with-thumb portfolio/cam/web_full/bl-cam-20260227-001.jpg

# Multiple objects
node delete-from-r2.mjs portfolio/arc/web_full/bl-arc-20260227-001.jpg portfolio/arc/web_thumb/bl-arc-20260227-001.webp
```

---

## T9 Folder Structure

```
/Volumes/T9/05_EXPORTS/WEB_FULL/architecture   (or arc)
/Volumes/T9/05_EXPORTS/WEB_FULL/campaign       (or cam)
/Volumes/T9/05_EXPORTS/WEB_FULL/corporate      (or cor)
```

See `docs/WATCHER.md` for full flow and env vars.
