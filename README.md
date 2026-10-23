# AI Live

A dependency-free, read-only local dashboard for observing live [OMP](https://github.com/commandcode-ai/omp) and Claude Code session transcripts.

AI Live reads local JSONL session files, derives bounded runtime state in memory, and serves a single-page dashboard on loopback. It never writes to session files and exposes no mutation endpoints.

## Features

- OMP and Claude Code transcript parsers
- Live session status, model, context, usage, cost, and errors
- Multi-provider quota row for Codex, Claude, Antigravity and OMP with truthful unavailable/stale states
- Fixed Prompt → Tool ⇄ Todo → Reply trace with active/completed states
- Tool lifecycle, durations, pending calls, and errors
- Todo and plan progress
- Responsive dark/light interface
- No runtime dependencies or build step

## Requirements

- Node.js with ES module support
- At least one local transcript tree:
  - OMP: `~/.omp/agent/sessions`
  - Claude Code: `~/.claude/projects`

## Run

```bash
./start.sh
```

Then open <http://127.0.0.1:4873/>.

Use another port:

```bash
./start.sh 4874
```

Use alternate transcript roots:

```bash
OMP_SESSIONS_DIR=/path/to/omp/sessions \
CLAUDE_CODE_SESSIONS_DIR=/path/to/claude/projects \
PORT=4874 node server.mjs
```

## Security

AI Live is intentionally local-only and binds to `127.0.0.1`. Session transcripts can contain prompts, responses, file paths, tool arguments, and other sensitive data. Do not expose or proxy the service to a network without authentication and redaction.

The browser receives parsed session data from the local server. No transcript data is sent to an external service by AI Live.

Provider quota credentials are read only by the local server. The browser receives normalized percentages, reset times and availability—not access tokens, account identifiers or raw provider responses. Claude quota requires a valid existing OAuth access token; AI Live does not refresh credentials.

## Documentation

- [Documentation index](docs/README.md)
- [Product specification](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [UI state specification](docs/ui-state-spec.md)
- [Operations](docs/operations.md)
- [Decision history](docs/decision-history.md)

## License

No license has been granted yet. Source is publicly visible, but reuse rights are reserved unless a license is added later.
