#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo " Starting Arletex (Arle Artificial Individual)"
echo " Central Executive:  Qwen 3.6-35B-A3B (Port 8000)"
echo " Coding Specialist:  Qwen3-Coder-30B-A3B (Port 8001)"
echo "=========================================================="

# 1. Start dual Colibri engines if not already running
if ! (curl -s "http://127.0.0.1:8000/v1/models" >/dev/null 2>&1 && \
      curl -s "http://127.0.0.1:8001/v1/models" >/dev/null 2>&1); then
  echo "Starting Colibri dual engines..."
  ./scripts/start-dual-colibri.sh &
  COLIBRI_LAUNCHER_PID=$!

  cleanup() {
    echo ""
    echo "Stopping Arletex and releasing memory..."
    kill "$COLIBRI_LAUNCHER_PID" 2>/dev/null || true
    "$PROJECT_DIR/scripts/stop-colibri.sh" 2>/dev/null || true
    exit 0
  }
  trap cleanup INT TERM EXIT

  echo "Waiting for inference engines to come online..."
  for i in {1..35}; do
    if curl -s "http://127.0.0.1:8000/v1/models" >/dev/null 2>&1 && \
       curl -s "http://127.0.0.1:8001/v1/models" >/dev/null 2>&1; then
      echo "Engines ready!"
      break
    fi
    sleep 1
  done
else
  echo "Colibri dual engines are already online and ready."
  cleanup() {
    exit 0
  }
  trap cleanup INT TERM EXIT
fi

# 2. Launch the Electron Desktop application
echo "Opening Arletex Desktop App..."
pnpm start
