#!/usr/bin/env bash
set -euo pipefail

MODEL_PATH="/home/proof/colibri-models/qwen3-coder-heretic-gguf/Qwen3-Coder-30B-A3B-IT-Heretic.i1-Q4_K_M.colibri"
MODEL_ID="qwen3-coder-30b-a3b-colibri"
PORT="${1:-8000}"
HOST="127.0.0.1"

COLI_BIN="/home/proof/colibri/c/coli"

if [ ! -f "$COLI_BIN" ]; then
  echo "ERROR: Colibri CLI not found at: $COLI_BIN"
  exit 1
fi

if [ ! -d "$MODEL_PATH" ]; then
  echo "ERROR: Model directory not found at: $MODEL_PATH"
  exit 1
fi

echo "=========================================================="
echo " Starting Arletex Colibri Engine (Qwen3-Coder-30B-A3B Heretic)"
echo " Engine:    $COLI_BIN"
echo " Model:     $MODEL_PATH ($MODEL_ID)"
echo " Endpoint:  http://$HOST:$PORT/v1"
echo " Options:   --auto-tier --no-think"
echo "=========================================================="

exec "$COLI_BIN" serve \
  --model "$MODEL_PATH" \
  --model-id "$MODEL_ID" \
  --host "$HOST" \
  --port "$PORT" \
  --auto-tier \
  --no-think
