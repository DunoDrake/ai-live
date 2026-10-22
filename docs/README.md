# AI Live documentation

Canonical specifications for the local session monitor in `scripts/claude-live/`, a fork of
`scripts/omp-live/` extended to read both OMP and Claude Code transcripts. Display name is
"AI Live"; the documents below still describe the OMP-only design this fork started from
except where noted.

## Claude Code support (this fork only)

- `server.mjs` reads a second root, `~/.claude/projects/**/*.jsonl` (override with
  `CLAUDE_CODE_SESSIONS_DIR`), alongside the original OMP root (`OMP_SESSIONS_DIR`).
- Each session row carries a `source` field (`"omp"` or `"claude-code"`); the UI shows it
  next to the project name.
- Claude Code's transcript shape differs from OMP's (flat `type: "user"|"assistant"`
  entries, `tool_use`/`tool_result` content parts, Anthropic-style usage field names) and is
  parsed by a separate function (`ccApplyEntry` and friends in `server.mjs`), left independent
  of the OMP parser so neither format's quirks leak into the other.

## Source of truth

1. `server.mjs` and `index.html` are authoritative for implemented behavior.
2. Files in this directory define the intended current contract for future changes.
3. Repository files under `docs/sessions/omp-live-*.md` are historical implementation evidence. They are not current specifications when they conflict with this directory or source code.

## Documents

| Document | Purpose |
|---|---|
| [product-spec.md](product-spec.md) | Product scope, users, surfaces, requirements, non-goals, acceptance criteria |
| [architecture.md](architecture.md) | Runtime, parser, cache, HTTP API, browser polling and trust boundaries |
| [ui-state-spec.md](ui-state-spec.md) | Layout, telemetry semantics, workflow states, motion, Process Guides and accessibility |
| [operations.md](operations.md) | Start, configure, inspect, verify and troubleshoot |
| [decision-history.md](decision-history.md) | Kept decisions, superseded designs, rejected experiments and historical evidence |

## Handoff order

A model continuing implementation SHOULD read:

1. This file.
2. `product-spec.md`.
3. The document matching its change area.
4. Relevant source ranges in `server.mjs` or `index.html`.
5. `decision-history.md` before changing workflow topology, telemetry semantics or ambient motion.

## Current status

- Implementation: one dependency-free Node server plus one standalone HTML document.
- Data source: local OMP JSONL sessions only.
- Network binding: loopback only, default port `4873`.
- UI language: English; guide explanations include Vietnamese comparison notes.
- Current visual system: compact Flora/Archify-inspired monitor, dark/light themes.
- Current open product checks: user visual acceptance; ambient workflow effects remain deferred.
- No commit or deployment contract is defined here.
