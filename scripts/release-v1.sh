#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Syncing main branch"
git checkout main
git pull origin main

TAG_VERSION="v1.0.0"
TAG_MAJOR="v1"
TAG_MESSAGE="Release v1.0.0 - Policy-driven PII & Secret Protection"
TAG_MAJOR_MESSAGE="Release v1 - Major version pointer"

if git rev-parse "$TAG_VERSION" >/dev/null 2>&1; then
  echo "Tag $TAG_VERSION already exists locally; recreating annotated tag."
  git tag -d "$TAG_VERSION" || true
fi

git tag -a "$TAG_VERSION" -m "$TAG_MESSAGE"
git tag -f "$TAG_MAJOR" -m "$TAG_MAJOR_MESSAGE"

echo "==> Pushing tags to origin"
git push origin --force "$TAG_VERSION"
git push origin --force "$TAG_MAJOR"

echo "Done. Published tags: $TAG_VERSION and $TAG_MAJOR"
