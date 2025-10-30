#!/usr/bin/env bash
# Run the project's test suites while excluding test/fixtures
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
# Prefer explicit NODE_BIN env, otherwise resolve command path and trim whitespace
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
NODE_BIN="$(echo "$NODE_BIN" | tr -d '\r' | tr -d '\n')"

if [ -z "$NODE_BIN" ]; then
  echo "Node not found in PATH. Set NODE_BIN to absolute node path." >&2
  exit 2
fi

cd "$ROOT" || exit 2

echo "Running tests (excluding test/fixtures) with: $NODE_BIN --test test/unit test/functional test/integration"

# Default behavior: run in background so you don't have to babysit it.
# Use --fg to run in foreground (blocking).
FG=0
if [ "${1:-}" = "--fg" ]; then
  FG=1
fi

LOGFILE="$ROOT/logs/safe-test-run.log"

if [ "$FG" -eq 1 ]; then
  # Foreground run (blocking)
  trap 'echo "Caught SIGINT, terminating test run"; exit 130' INT
  "$NODE_BIN" --test test/unit test/functional test/integration
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "Some tests failed or process was interrupted (exit code: $EXIT_CODE)" >&2
  fi
  exit $EXIT_CODE
else
  # Background run using run-bg helper; prints pid file path
  mkdir -p "$(dirname "$LOGFILE")" || true
  CMD="$NODE_BIN --test test/unit test/functional test/integration"
  PIDFILE=$(bash scripts/run-bg.sh "$CMD" "$LOGFILE" "$ROOT")
  echo "Background test started. Log: $LOGFILE  (pid file: $PIDFILE)"
  echo "To follow the log: tail -f $LOGFILE"
  echo "To stop: kill \$(cat $PIDFILE) && rm $PIDFILE"
  exit 0
fi
