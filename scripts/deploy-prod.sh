#!/usr/bin/env bash
# Safe production deploy: migrate production DB first, then Vercel production.
# Run from repo root: npm run deploy:prod
# If your production branch is not `main`, either:
#   REQUIRED_GIT_BRANCH=your-branch npm run deploy:prod
#   npm run deploy:prod:studio-os   # studio-os-cms-production-20260425
# Requires: git clean tree, correct branch, DATABASE_URL + DIRECT_URL, Vercel CLI.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REQUIRED_BRANCH="${REQUIRED_GIT_BRANCH:-main}"

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
if [[ -n "$(git status --porcelain)" ]]; then
  echo "   ERROR: Working tree is not clean."
  echo "   Commit, stash, or remove local changes before production deploy."
  echo "   Run: git status"
  exit 1
fi
echo "   OK"
echo ""

echo "→ Step 3/6: Check Git branch…"
CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
if [[ "$CURRENT_BRANCH" != "$REQUIRED_BRANCH" ]]; then
  echo "   ERROR: Current branch is '$CURRENT_BRANCH', required: '$REQUIRED_BRANCH'."
  echo "   Switch branches or override: REQUIRED_GIT_BRANCH=your-branch npm run deploy:prod"
  exit 1
fi
echo "   OK (branch: $CURRENT_BRANCH)"
echo ""

echo "→ Step 4/6: Check database environment variables…"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "   ERROR: DATABASE_URL is not set."
  echo "   Export production Neon Postgres URL before running (see docs/deployment.md)."
  exit 1
fi
if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "   ERROR: DIRECT_URL is not set."
  echo "   This project's Prisma schema uses directUrl; set Neon direct (non-pooled) URL."
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
read -r -p "Type DEPLOY to continue, or anything else to cancel: " CONFIRM
if [[ "$CONFIRM" != "DEPLOY" ]]; then
  echo "Cancelled (expected exact text: DEPLOY)."
  exit 1
fi
echo ""

echo "→ Step 5/6: Apply Prisma migrations (production)…"
npx prisma migrate deploy
echo "   OK"
echo ""

echo "→ Step 6/6: Deploy to Vercel production…"
vercel deploy --prod
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Done."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
