#!/usr/bin/env bash
# Start the API and the website together for local development.
# Ctrl-C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping..."
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting API on http://127.0.0.1:8000 ..."
(
  cd "$ROOT/backend"
  if [[ -d .venv ]]; then source .venv/bin/activate; fi
  exec uvicorn app.main:app --reload --port 8000
) &
API_PID=$!

sleep 2

echo "Starting website on http://127.0.0.1:5000 ..."
(
  cd "$ROOT/site"
  [[ -d node_modules ]] || npm install
  exec node server.js
) &
WEB_PID=$!

echo ""
echo "  Website : http://localhost:5000"
echo "  API docs: http://localhost:8000/api/docs"
echo "  Health  : http://localhost:8000/api/health"
echo ""
echo "Press Ctrl-C to stop both."

wait
