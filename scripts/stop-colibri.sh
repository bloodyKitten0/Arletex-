#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
COLI_BIN="/home/proof/colibri/c/coli"

if [ -f "$COLI_BIN" ]; then
  "$COLI_BIN" stop --port "$PORT" || true
else
  pkill -f "coli serve" || true
fi
