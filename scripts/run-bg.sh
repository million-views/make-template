#!/usr/bin/env bash
# run-bg.sh — Run a command in the background and log stdout/stderr to a file.
# Usage: ./scripts/run-bg.sh "npm run dev" dev.log
# This script prints the PID to stdout so callers can capture it with MPID=$PID

set -u

if [ $# -lt 2 ]; then
  echo "Usage: $0 \"<command>\" <logfile> [cwd]"
  exit 2
fi

COMMAND="$1"
LOGFILE="$2"
CWD="${3:-.}"

mkdir -p "$(dirname "$LOGFILE")" || true

# Start the command in a subshell, redirect output, and run in background
(
  cd "$CWD" || exit 2
  # Use bash -lc so the command string is interpreted with shell expansions
  bash -lc "$COMMAND" > "$LOGFILE" 2>&1 &
  echo $! > "$LOGFILE".pid
) &

# Print the pid file path for the caller
echo "$LOGFILE.pid"

exit 0
