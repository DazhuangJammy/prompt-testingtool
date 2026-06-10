#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${PROMPT_TOOL_REPO_URL:-https://github.com/DazhuangJammy/prompt-testingtool.git}"
BRANCH="${PROMPT_TOOL_BRANCH:-main}"
INSTALL_DIR="${PROMPT_TOOL_DIR:-$HOME/Desktop/prompt-testingtool}"
HOST="${PROMPT_TOOL_HOST:-127.0.0.1}"
PORT="${PROMPT_TOOL_PORT:-8787}"
OPEN_BROWSER="${PROMPT_TOOL_OPEN:-1}"

if [ "${1:-}" = "--server" ]; then
  HOST="0.0.0.0"
  OPEN_BROWSER="0"
fi

if [ "$(id -u 2>/dev/null || echo 1)" = "0" ] && [ -z "${PROMPT_TOOL_DIR:-}" ]; then
  INSTALL_DIR="/opt/prompt-testingtool"
fi

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required. $2"
    exit 1
  fi
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return
  fi
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.0.0 --activate
  fi
  if ! command -v pnpm >/dev/null 2>&1; then
    npm install -g pnpm
  fi
}

need_command git "Install Git first."
need_command node "Install Node.js 20+ first: https://nodejs.org/"
need_command npm "Install Node.js with npm first."
ensure_pnpm

mkdir -p "$(dirname "$INSTALL_DIR")"

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating $INSTALL_DIR..."
  git -C "$INSTALL_DIR" fetch origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
elif [ -e "$INSTALL_DIR" ]; then
  echo "$INSTALL_DIR already exists but is not a Git repository."
  echo "Set PROMPT_TOOL_DIR to another path or remove that directory."
  exit 1
else
  echo "Cloning $REPO_URL..."
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

START_ARGS=(start --install --build --host "$HOST" --port "$PORT")
if [ "$OPEN_BROWSER" = "1" ]; then
  START_ARGS+=(--open)
fi

node scripts/prompt-tool.mjs "${START_ARGS[@]}"
