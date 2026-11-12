#!/usr/bin/env bash
set -euo pipefail

CHOICE="${1:-qwen36}"
PORT="${2:-8000}"

if [ "$CHOICE" = "coder" ] || [ "$CHOICE" = "30b" ]; then
  exec "$(dirname "$0")/start-colibri-coder.sh" "$PORT"
else
  exec "$(dirname "$0")/start-colibri-qwen36.sh" "$PORT"
fi
