#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script can only build a macOS dmg on macOS."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.0.0 --activate
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is missing. Install Node.js 20+ first: https://nodejs.org/"
  exit 1
fi

if [[ ! -d node_modules ]] ||
  [[ ! -d node_modules/electron ]] ||
  [[ ! -d node_modules/electron-builder ]]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile
fi

echo "Building web assets..."
pnpm build

echo "Packaging macOS dmg..."
rm -rf desktop-release
export CSC_IDENTITY_AUTO_DISCOVERY=false
export ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
export ELECTRON_BUILDER_BINARIES_MIRROR="${ELECTRON_BUILDER_BINARIES_MIRROR:-https://npmmirror.com/mirrors/electron-builder-binaries/}"
pnpm exec electron-builder --mac dmg --config electron-builder.yml --publish never

DMG_PATH="$(find "$ROOT_DIR/desktop-release" -maxdepth 1 -name "*.dmg" -print -quit)"
if [[ -z "$DMG_PATH" ]]; then
  echo "Build finished, but no dmg was found in desktop-release."
  exit 1
fi

echo "Done: $DMG_PATH"
