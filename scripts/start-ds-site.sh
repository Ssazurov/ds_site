#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORE_DIR="/home/vector/projects/gar-core-api"
CORE_HOST="127.0.0.1"
CORE_PORT="8100"
UI_HOST="127.0.0.1"
UI_PORT="3001"

kill_by_port() {
  local port="$1"
  local pids=()
  while IFS= read -r pid; do
    [[ -n "${pid}" ]] && pids+=("${pid}")
  done < <(
    ss -H -ltnp "sport = :${port}" 2>/dev/null \
      | awk -F'pid=' '{for (i = 2; i <= NF; i++) { split($i, parts, ","); print parts[1] }}' \
      | sort -u
  )
  for pid in "${pids[@]}"; do
    kill -TERM "${pid}" 2>/dev/null || true
  done
  sleep 1
  for pid in "${pids[@]}"; do
    kill -KILL "${pid}" 2>/dev/null || true
  done
}

cleanup_previous_processes() {
  pkill -TERM -f "uvicorn main:app" 2>/dev/null || true
  pkill -TERM -f "next dev.*--port ${UI_PORT}" 2>/dev/null || true
  kill_by_port "${CORE_PORT}"
  kill_by_port "${UI_PORT}"
  sleep 1
  kill_by_port "${CORE_PORT}"
  kill_by_port "${UI_PORT}"
}

start_core() {
  if curl -fsS "http://${CORE_HOST}:${CORE_PORT}/health" >/dev/null 2>&1; then
    echo "Core API already running on http://${CORE_HOST}:${CORE_PORT}"
    return 0
  fi

  echo "Starting Core API on http://${CORE_HOST}:${CORE_PORT}..."
  (
    cd "${CORE_DIR}"
    if [[ -x .venv/bin/python ]]; then
      .venv/bin/python -m uvicorn main:app --host "${CORE_HOST}" --port "${CORE_PORT}"
    else
      python3 -m uvicorn main:app --host "${CORE_HOST}" --port "${CORE_PORT}"
    fi
  )
}

start_ui() {
  if curl -fsS "http://${UI_HOST}:${UI_PORT}" >/dev/null 2>&1; then
    echo "ds_site already running on http://${UI_HOST}:${UI_PORT}"
    return 0
  fi

  echo "Starting ds_site on http://${UI_HOST}:${UI_PORT}..."
  (
    cd "${ROOT_DIR}"
    npm run dev -- --hostname "${UI_HOST}" --port "${UI_PORT}"
  )
}

cleanup_previous_processes
start_core &
CORE_PID=$!
trap 'kill ${CORE_PID} 2>/dev/null || true; cleanup_previous_processes' EXIT INT TERM

sleep 2
start_ui
