#!/usr/bin/env bash
set -euo pipefail

COLI_BIN="/home/proof/colibri/c/coli"

stop_port() {
  local p="$1"
  if [ -f "$COLI_BIN" ]; then
    "$COLI_BIN" stop --port "$p" 2>/dev/null || true
  fi

  local pids
  pids=$(lsof -ti :"$p" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Terminating process(es) on port $p: $pids"
    kill $pids 2>/dev/null || true
    sleep 1
    local remaining
    remaining=$(lsof -ti :"$p" 2>/dev/null || true)
    if [ -n "$remaining" ]; then
      kill -9 $remaining 2>/dev/null || true
    fi
  fi
  echo "Port $p is clear."
}

if [ -n "${1:-}" ]; then
  stop_port "$1"
else
  # Default: stop both primary (8000) and coding specialist (8001)
  stop_port 8000
  stop_port 8001
fi
