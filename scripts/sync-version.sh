#!/usr/bin/env bash
# Sync root VERSION file to package manifests and app metadata.
#
# Usage: bash scripts/sync-version.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_FILE="${REPO_ROOT}/VERSION"

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "ERROR: VERSION file not found at ${VERSION_FILE}" >&2
  exit 1
fi

VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
BUILD_DATE="$(date -u +%Y-%m-%d)"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: Invalid version format: ${VERSION}" >&2
  exit 1
fi

export REPO_ROOT VERSION BUILD_DATE

node <<'NODE'
const fs = require('fs');
const path = require('path');

const repoRoot = process.env.REPO_ROOT;
const version = process.env.VERSION;
const buildDate = process.env.BUILD_DATE;

function updateJsonVersion(file) {
  const full = path.join(repoRoot, file);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  data.version = version;
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n');
}

updateJsonVersion('package.json');
updateJsonVersion('backend/package.json');

const lockPath = path.join(repoRoot, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.version = version;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = version;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}

const versionTsPath = path.join(repoRoot, 'src/lib/version.ts');
let versionTs = fs.readFileSync(versionTsPath, 'utf8');
versionTs = versionTs.replace(
  /export const APP_VERSION = "[^"]+";/,
  `export const APP_VERSION = "${version}";`,
);
versionTs = versionTs.replace(
  /export const APP_BUILD_DATE = "[^"]+";/,
  `export const APP_BUILD_DATE = "${buildDate}";`,
);
fs.writeFileSync(versionTsPath, versionTs);

fs.copyFileSync(path.join(repoRoot, 'VERSION'), path.join(repoRoot, 'backend/VERSION'));
NODE

echo "Synced version ${VERSION} (build ${BUILD_DATE})"
