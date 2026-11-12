#!/usr/bin/env bash
set -euo pipefail

COLIBRI_URL="${1:-http://127.0.0.1:8080}"
MODEL_ID="${2:-colibri-default}"

echo "=========================================================="
echo " Testing Colibri Local Inference Connection"
echo " Target Endpoint: $COLIBRI_URL"
echo " Model ID:        $MODEL_ID"
echo "=========================================================="

echo -n "1. Probing health / models endpoint... "
START_TIME=$(date +%s%N)
HTTP_CODE=$(curl -s -o /tmp/colibri_probe.json -w "%{http_code}" "$COLIBRI_URL/v1/models" || true)
END_TIME=$(date +%s%N)
LATENCY_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$HTTP_CODE" = "200" ]; then
  echo "OK ($LATENCY_MS ms)"
  echo "   Models response:"
  cat /tmp/colibri_probe.json | head -n 10
  echo ""
elif [ "$HTTP_CODE" = "000" ]; then
  echo "FAILED (Cannot connect to $COLIBRI_URL - connection refused)"
  echo "   Colibri daemon is not currently running on $COLIBRI_URL."
  exit 1
else
  echo "HTTP $HTTP_CODE ($LATENCY_MS ms)"
  echo "   Probing /health fallback..."
  HEALTH_CODE=$(curl -s -o /tmp/colibri_probe.json -w "%{http_code}" "$COLIBRI_URL/health" || true)
  if [ "$HEALTH_CODE" = "200" ]; then
    echo "   /health OK ($HEALTH_CODE)"
  else
    echo "   Both /v1/models and /health returned non-200."
  fi
fi

echo ""
echo "2. Testing chat completion streaming (/v1/chat/completions)..."
PAYLOAD=$(cat <<EOF
{
  "model": "$MODEL_ID",
  "messages": [
    {"role": "system", "content": "You are Arle. Respond concisely."},
    {"role": "user", "content": "Respond with the single word: READY."}
  ],
  "temperature": 0.2,
  "max_tokens": 30,
  "stream": true
}
EOF
)

curl -s -N -X POST "$COLIBRI_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | head -n 25

echo ""
echo "=========================================================="
echo " Colibri test probe complete."
echo "=========================================================="
