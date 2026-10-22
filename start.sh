#!/usr/bin/env bash
# Start AI Live: a read-only session monitor for OMP and Claude Code.
# Usage: ./start.sh [port]
# Env overrides: PORT, OMP_SESSIONS_DIR, CLAUDE_CODE_SESSIONS_DIR
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-${PORT:-4873}}"

if ! command -v node >/dev/null 2>&1; then
	echo "Node.js is required but was not found in PATH." >&2
	exit 1
fi

echo "Starting AI Live on http://127.0.0.1:${PORT}/ (Ctrl+C to stop)"
exec env PORT="$PORT" node "$HERE/server.mjs"
