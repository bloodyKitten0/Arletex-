#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
COLI_BIN="/home/proof/colibri/c/coli"

if [ -f "$COLI_BIN" ]; then
  "$COLI_BIN" stop --port "$PORT" 2>/dev/null || true
fi

PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "Terminating process(es) on port $PORT: $PIDS"
  kill $PIDS 2>/dev/null || true
  sleep 1
  # Force kill if still lingering
  REMAINING=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$REMAINING" ]; then
    kill -9 $REMAINING 2>/dev/null || true
  fi
fi
echo "Port $PORT is clear."
