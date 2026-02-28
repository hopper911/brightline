#!/bin/bash
set -euo pipefail

DRIVE="T9"
TOOLS_DIR="$(cd "$(dirname "$0")" && pwd)"
WATCHER="$TOOLS_DIR/upload-watcher.mjs"
LOG_DIR="/Users/kiril/Library/Logs"

# Where we expect Lightroom exports to land (watcher only needs WEB_FULL; thumbs are auto-generated)
WEB_FULL="/Volumes/${DRIVE}/05_EXPORTS/WEB_FULL"

mkdir -p "$LOG_DIR"

echo "[START] $(date) BrightLine watcher launcher" >> "$LOG_DIR/brightline-r2watcher.log"
echo "[INFO] Waiting for drive /Volumes/${DRIVE} ..." >> "$LOG_DIR/brightline-r2watcher.log"

# Wait until the external drive and WEB_FULL exist (WEB_THUMB optional; watcher generates thumbs)
while true; do
  if [ -d "/Volumes/${DRIVE}" ] && [ -d "$WEB_FULL" ]; then
    echo "[OK] $(date) Drive mounted + WEB_FULL found. Starting watcher..." >> "$LOG_DIR/brightline-r2watcher.log"
    break
  fi
  sleep 5
done

cd "$TOOLS_DIR"

# Find node reliably for launchd (PATH may be minimal)
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "${NODE_BIN}" ]; then
  echo "[ERR] $(date) node not found in PATH for launchd." >> "$LOG_DIR/brightline-r2watcher.error.log"
  exit 1
fi

echo "[INFO] Using node: ${NODE_BIN}" >> "$LOG_DIR/brightline-r2watcher.log"

# Run watcher (forever). Output goes to LaunchAgent log paths.
exec "$NODE_BIN" "$WATCHER"
