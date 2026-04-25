#!/usr/bin/env bash
# Run from the repo root (the folder that contains .git).
# For repo at Desktop: run from /Users/kiril/Desktop
# For repo at brightline/brightline: run from /Users/kiril/Desktop/brightline/brightline

set -e
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "Repo root: $REPO_ROOT"
echo "Branch: $(git branch --show-current)"
echo ""

# If repo root is Desktop, add only brightline/
if [[ "$REPO_ROOT" == *"/Desktop" ]] && [[ "$REPO_ROOT" != *"/brightline" ]]; then
  git add brightline/
else
  git add -A
fi

git status -s
echo ""
read -p "Commit with message 'Brightline: lib/storage + image-strategy + env, lint fixes, admin Link'? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git commit -m "Brightline: lib/storage + image-strategy + env, lint fixes, admin Link"
  echo ""
  echo "Push to origin? Choose: 1) main (merge work-v2 into main first if needed)  2) work-v2  3) skip"
  read -p "1/2/3: " choice
  case $choice in
    1) git checkout main 2>/dev/null; git merge work-v2 2>/dev/null; git push origin main ;;
    2) git push origin work-v2 ;;
    *) echo "Skipped push. Run manually: git push origin <branch>" ;;
  esac
fi
