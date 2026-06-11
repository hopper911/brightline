#!/usr/bin/env bash
# Safe production deploy: migrate production DB first, then Vercel production.
# Run from repo root: npm run deploy:prod
# If your production branch is not `main`, either:
#   REQUIRED_GIT_BRANCH=your-branch npm run deploy:prod
#   npm run deploy:prod:studio-os   # studio-os-cms-production-20260425
# Requires: clean working tree (or ALLOW_DIRTY_WORKTREE=1), correct branch,
# DATABASE_URL + DIRECT_URL, Vercel CLI. A dirty tree fails so you do not run
# production migrations while the repo does not match what you intend to ship.
# Vercel CLI uploads the local directory—uncommitted files are included unless
# your project is Git-linked and you use dashboard-only deploys.
#
# Non-interactive (CI / automation): set BRIGHTLINE_PROD_DEPLOY=DEPLOY instead
# of typing DEPLOY at the prompt. Example: npm run deploy:prod:go:studio-os
#
# Git unusable on this machine (e.g. iCloud Desktop → mmap timeout on git status):
#   SKIP_GIT_CHECKS=1 npm run deploy:prod:go:studio-os
# Skips clean-tree and branch checks — only use if you accept that risk.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REQUIRED_BRANCH="${REQUIRED_GIT_BRANCH:-main}"

# Merge env the same way as local Prisma tooling: .env → .env.local → .env.production.local
# (later wins). Lets `npm run deploy:prod:go*` work when URLs live in gitignored files.
load_repo_env() {
  if [[ -n "${DATABASE_URL:-}" && -n "${DIRECT_URL:-}" ]]; then
    return 0
  fi
  local f
  for f in ".env" ".env.local" ".env.production.local"; do
    if [[ -f "$ROOT/$f" ]]; then
      echo "   Loading $f …"
      set -a
      # shellcheck disable=SC1091
      source "$ROOT/$f"
      set +a
    fi
  done
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Bright Line — production deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "→ Step 1/6: Check we are in a Git repository…"
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "   ERROR: Not a Git repository. cd to the app root (folder with package.json)."
  exit 1
fi
echo "   OK"
echo ""

echo "→ Step 2/6: Check working tree is clean (no uncommitted or untracked changes)…"
if [[ "${SKIP_GIT_CHECKS:-}" == "1" ]]; then
  echo "   WARN: SKIP_GIT_CHECKS=1 — not verifying working tree (dirty deploy possible)."
else
GIT_PORCELAIN=""
_GIT_EC=0
GIT_PORCELAIN="$(git status --porcelain 2>&1)" || _GIT_EC=$?
if [[ "$_GIT_EC" -ne 0 ]]; then
  echo "   ERROR: git status failed (exit ${_GIT_EC}). Often a repo on iCloud/Desktop cloud or network disk (mmap timeout)."
  echo "   Prefer: clone or move the project to a local folder (e.g. ~/Developer), then retry."
  echo "   If you must deploy from here:"
  echo "      npm run deploy:prod:go:studio-os:nogit"
  echo "   (same as SKIP_GIT_CHECKS=1 npm run deploy:prod:go:studio-os)"
  echo ""
  echo "   Git output:"
  echo "$GIT_PORCELAIN" | sed 's/^/      /' || true
  exit 1
fi
if [[ -n "$GIT_PORCELAIN" ]]; then
  if [[ "${ALLOW_DIRTY_WORKTREE:-}" == "1" ]]; then
    echo "   WARN: ALLOW_DIRTY_WORKTREE=1 — skipping clean-tree check."
    echo "   Migrations use your local Prisma files; Vercel CLI will upload whatever is on disk."
  else
    echo "   ERROR: Working tree is not clean."
    echo "   Commit, stash, or discard local changes, then retry."
    echo "   (You often see this right after editing package.json or this script without committing.)"
    echo ""
    echo "   Changed files:"
    git status --short | sed 's/^/      /' || true
    echo ""
    echo "   Override (know the risk): ALLOW_DIRTY_WORKTREE=1 npm run deploy:prod:studio-os"
    exit 1
  fi
else
  echo "   OK"
fi
fi
echo ""

echo "→ Step 2b: Load DATABASE_URL / DIRECT_URL from .env files if still unset…"
load_repo_env
echo ""

echo "→ Step 3/6: Check Git branch…"
if [[ "${SKIP_GIT_CHECKS:-}" == "1" ]]; then
  echo "   WARN: SKIP_GIT_CHECKS=1 — not verifying branch (expected: ${REQUIRED_BRANCH})."
else
CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
if [[ "$CURRENT_BRANCH" != "$REQUIRED_BRANCH" ]]; then
  echo "   ERROR: Current branch is '$CURRENT_BRANCH', required: '$REQUIRED_BRANCH'."
  echo "   Switch branches or override: REQUIRED_GIT_BRANCH=your-branch npm run deploy:prod"
  exit 1
fi
echo "   OK (branch: $CURRENT_BRANCH)"
fi
echo ""

echo "→ Step 4/6: Check database environment variables…"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "   ERROR: DATABASE_URL is not set."
  echo "   Export it, or add it to .env / .env.local / .env.production.local (see docs/deployment.md)."
  exit 1
fi
if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "   ERROR: DIRECT_URL is not set."
  echo "   This project's Prisma schema uses directUrl; set Neon direct (non-pooled) URL in env or those files."
  echo "   See docs/deployment.md."
  exit 1
fi
echo "   OK (DATABASE_URL and DIRECT_URL are set)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " WARNING: You are about to:"
echo "   • Run migrations on the PRODUCTION database (prisma migrate deploy)"
echo "   • Deploy to PRODUCTION on Vercel (vercel deploy --prod)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CONFIRM=""
if [[ "${BRIGHTLINE_PROD_DEPLOY:-}" == "DEPLOY" ]]; then
  echo "   OK (non-interactive: BRIGHTLINE_PROD_DEPLOY=DEPLOY)"
  CONFIRM="DEPLOY"
else
  read -r -p "Type DEPLOY to continue, or anything else to cancel: " CONFIRM
fi
if [[ "$CONFIRM" != "DEPLOY" ]]; then
  echo "Cancelled (expected exact text: DEPLOY)."
  echo "Tip: for scripts, export BRIGHTLINE_PROD_DEPLOY=DEPLOY (see npm run deploy:prod:go)."
  exit 1
fi
echo ""

echo "→ Step 5/6: Apply Prisma migrations (production)…"
npx prisma migrate deploy
echo "   OK"
echo ""

echo "→ Step 6/6: Deploy to Vercel production (hopper911s-projects/brightline only)…"
# Pin to the brightline project — do not deploy to brightline-marketing / brightline-portal.
export VERCEL_ORG_ID="${VERCEL_ORG_ID:-team_JsTP2jq77stixfXKhNHylNy1}"
export VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-prj_0enO0mw7g3Sec9vniRQ0POVajPQU}"
vercel deploy --prod --yes
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Done."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
