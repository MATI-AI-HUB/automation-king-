#!/usr/bin/env bash
set -euo pipefail
# Vercel Ignored Build Step: exit 0 skips the build, exit 1 proceeds.
# Skip every branch except main. On main, skip when frontend/ is unchanged.

ref="${VERCEL_GIT_COMMIT_REF:-}"
if [ -n "$ref" ] && [ "$ref" != "main" ]; then
  echo "Skipping Vercel build: branch '${ref}' is not main"
  exit 0
fi

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
exit 1
