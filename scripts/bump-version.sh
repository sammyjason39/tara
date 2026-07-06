#!/usr/bin/env bash
# Bump TARA version (A.B.C) in the root VERSION file.
#
# A (major) — perubahan platform sangat besar (generasi produk baru)
# B (minor) — upgrade besar: UI masif, fitur mayor, perubahan signifikan
# C (patch) — perbaikan bug, penyesuaian kecil, hotfix
#
# Usage: bash scripts/bump-version.sh [major|minor|patch]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_FILE="${REPO_ROOT}/VERSION"
BUMP="${1:-patch}"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "ERROR: VERSION file not found at ${VERSION_FILE}" >&2
  exit 1
fi

CURRENT="$(tr -d '[:space:]' < "$VERSION_FILE")"
if [[ ! "$CURRENT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: Invalid version format in VERSION: ${CURRENT}" >&2
  exit 1
fi

IFS='.' read -r A B C <<< "$CURRENT"

case "$BUMP" in
  major|a|A)
    A=$((A + 1))
    B=0
    C=0
    ;;
  minor|b|B)
    B=$((B + 1))
    C=0
    ;;
  patch|c|C)
    C=$((C + 1))
    ;;
  *)
    echo "Usage: $0 [major|minor|patch]" >&2
    exit 1
    ;;
esac

NEW_VERSION="${A}.${B}.${C}"
echo "$NEW_VERSION" > "$VERSION_FILE"
echo "Version bumped: ${CURRENT} → ${NEW_VERSION} (${BUMP})"
