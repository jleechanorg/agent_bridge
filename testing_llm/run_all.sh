#!/bin/bash
# testing_llm/ runner — starts server in tmux, runs tests, records video
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$(dirname "$DIR")"
PORT=19899

echo "═══════════════════════════════════════"
echo "  testing_llm — run_all.sh"
echo "  $(date)"
echo "═══════════════════════════════════════"

# Start server if not running
if ! curl -s "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  echo "⏳ Starting gateway server on port $PORT..."
  tmux kill-session -t testing-llm 2>/dev/null || true
  tmux new-session -d -s testing-llm -c "$PROJECT" \
    "AUTH_TOKEN=e2e-test-token-12345 GATEWAY_PORT=$PORT GATEWAY_HOST=127.0.0.1 node --import tsx src/entry.ts gateway"
  sleep 3
fi

# Verify server
if ! curl -s "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  echo "❌ Server failed to start"
  exit 1
fi
echo "✅ Server running on port $PORT"
echo ""

# Run smoke test
echo "Running smoke tests..."
cd "$DIR"
AUTH_TOKEN=e2e-test-token-12345 GATEWAY_URL="http://127.0.0.1:$PORT" npx tsx test_health_smoke.ts

echo ""
echo "Done! Server still running in tmux session 'testing-llm'"
echo "Kill with: tmux kill-session -t testing-llm"
