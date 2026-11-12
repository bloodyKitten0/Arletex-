#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8080}"
PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "Stopping llama-server on port $PORT (PIDs: $PIDS)..."
  kill $PIDS 2>/dev/null || true
  sleep 1
  REMAINING=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$REMAINING" ]; then
    kill -9 $REMAINING 2>/dev/null || true
  fi
fi
echo "Port $PORT is clear."
