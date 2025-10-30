Background run helper (scripts/run-bg.sh)

Purpose:
- Provide a small cross-repo helper to start a command in the background and capture stdout/stderr to a logfile. Saves a .pid file next to the log for easy management.

Usage:

Run a dev server and store logs:

```bash
./scripts/run-bg.sh "npm run dev" logs/dev.log
MPID=$(cat logs/dev.log.pid)
echo "Started background process PID: $MPID"
```

Stop the process:

```bash
kill $MPID
rm logs/dev.log.pid
```

Notes:
- This helper is intentionally minimal. It runs the provided command with `bash -lc` in case you want shell features in the command string.
- The caller should manage PID lifecycle (kill on tear-down) and inspect logs for long-running output.
