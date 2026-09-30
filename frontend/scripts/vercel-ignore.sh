#!/usr/bin/env bash
set -euo pipefail
# Vercel Ignored Build Step: exit 0 skips (shows Canceled), exit 1 proceeds.
# Never skip solely because the branch is not main — that canceled Hobby
# preview/PR deploys. Skip only when frontend/ is unchanged vs previous SHA.

root="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -n "$prev" ] && git -C "$root" cat-file -e "${prev}^{commit}" 2>/dev/null; then
  if git -C "$root" diff --quiet "$prev" HEAD -- frontend/; then
    echo "No frontend/ changes since $prev; skipping Vercel build"
    exit 0
  fi
  echo "frontend/ changed since $prev; building"
  exit 1
fi
if git -C "$root" rev-parse --verify HEAD^ >/dev/null 2>&1 && git -C "$root" diff --quiet HEAD^ HEAD -- frontend/; then
  echo "No frontend/ changes in HEAD; skipping Vercel build"
  exit 0
fi
echo "frontend/ changed or no parent SHA; building"
exit 1
