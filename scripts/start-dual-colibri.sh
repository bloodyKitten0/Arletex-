#!/usr/bin/env bash
set -euo pipefail

COLI_BIN="/home/proof/colibri/c/coli"
MODEL_35B="/home/proof/colibri-models/qwen36-heretic-i4"
MODEL_30B="/home/proof/colibri-models/qwen3-coder-heretic-gguf/Qwen3-Coder-30B-A3B-IT-Heretic.i1-Q4_K_M.colibri"

PORT_CENTRAL=8000
PORT_CODER=8001

echo "=========================================================="
echo " Starting Arletex Dual Colibri Inference Architecture"
echo " Central Agent (Executive):    Qwen 3.6-35B-A3B on port $PORT_CENTRAL"
echo " Coding Specialist:            Qwen3-Coder-30B-A3B on port $PORT_CODER"
echo " Options:                      --auto-tier --no-think"
echo "=========================================================="

if [ ! -f "$COLI_BIN" ]; then
  echo "ERROR: Colibri CLI not found at: $COLI_BIN"
  exit 1
fi

# Ensure ports 8000 and 8001 are free
"$(dirname "$0")/stop-colibri.sh" "$PORT_CENTRAL" || true
"$(dirname "$0")/stop-colibri.sh" "$PORT_CODER" || true

echo "Starting Central Agent (Qwen 3.6-35B) on port $PORT_CENTRAL..."
"$COLI_BIN" serve \
  --model "$MODEL_35B" \
  --model-id "qwen3.6-colibri" \
  --host "127.0.0.1" \
  --port "$PORT_CENTRAL" \
  --auto-tier \
  --no-think \
  --ctx 4096 \
  --queue-timeout 1800 \
  --max-queue 16 &

PID_CENTRAL=$!
echo "Central Agent running (PID: $PID_CENTRAL)"

echo "Starting Coding Specialist (Qwen3-Coder-30B) on port $PORT_CODER..."
"$COLI_BIN" serve \
  --model "$MODEL_30B" \
  --model-id "qwen3-coder-30b-a3b-colibri" \
  --host "127.0.0.1" \
  --port "$PORT_CODER" \
  --auto-tier \
  --no-think \
  --ctx 4096 \
  --queue-timeout 1800 \
  --max-queue 16 &

PID_CODER=$!
echo "Coding Specialist running (PID: $PID_CODER)"

cleanup() {
  echo ""
  echo "Shutting down Colibri engines..."
  kill "$PID_CENTRAL" "$PID_CODER" 2>/dev/null || true
  "$(dirname "$0")/stop-colibri.sh" "$PORT_CENTRAL" 2>/dev/null || true
  "$(dirname "$0")/stop-colibri.sh" "$PORT_CODER" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Waiting for engines to initialize..."
for i in {1..30}; do
  if curl -s "http://127.0.0.1:$PORT_CENTRAL/v1/models" >/dev/null 2>&1 && \
     curl -s "http://127.0.0.1:$PORT_CODER/v1/models" >/dev/null 2>&1; then
    echo "=========================================================="
    echo " Both Colibri Engines Online and Ready!"
    echo " Central Agent:      http://127.0.0.1:$PORT_CENTRAL/v1"
    echo " Coding Specialist:  http://127.0.0.1:$PORT_CODER/v1"
    echo " Press Ctrl+C to terminate both servers cleanly."
    echo "=========================================================="
    break
  fi
  sleep 1
done

wait "$PID_CENTRAL" "$PID_CODER"
