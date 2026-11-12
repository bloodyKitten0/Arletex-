#!/usr/bin/env bash
set -euo pipefail

MODEL_PATH="${1:-/home/proof/models/qwen-heretic/Qwen3.5-9B-Heretic-Q4_K_M.gguf}"
PORT="${2:-8080}"
HOST="127.0.0.1"
CTX_SIZE="8192"
THREADS="8"
N_GPU_LAYERS="99"

LLAMA_SERVER="/home/linuxbrew/.linuxbrew/bin/llama-server"

if [ ! -f "$LLAMA_SERVER" ]; then
  if command -v llama-server >/dev/null 2>&1; then
    LLAMA_SERVER="$(command -v llama-server)"
  else
    echo "ERROR: llama-server executable not found."
    exit 1
  fi
fi

if [ ! -f "$MODEL_PATH" ]; then
  echo "ERROR: Model file not found at: $MODEL_PATH"
  exit 1
fi

echo "=========================================================="
echo " Starting Arletex Local Inference (llama-server)"
echo " Binary:    $LLAMA_SERVER"
echo " Model:     $MODEL_PATH"
echo " Host/Port: $HOST:$PORT"
echo " Context:   $CTX_SIZE"
echo " Offload:   Vulkan (ngl: $N_GPU_LAYERS)"
echo " Threads:   $THREADS"
echo "=========================================================="

exec "$LLAMA_SERVER" \
  -m "$MODEL_PATH" \
  --host "$HOST" \
  --port "$PORT" \
  -c "$CTX_SIZE" \
  -t "$THREADS" \
  -ngl "$N_GPU_LAYERS"
