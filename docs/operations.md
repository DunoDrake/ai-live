# AI Live operations

## 1. Requirements

- Node.js with ES module support.
- A local OMP session tree under `~/.omp/agent/sessions`, and/or a local Claude Code
  transcript tree under `~/.claude/projects`, or alternate paths for either.
- A browser reachable on the same machine.

No npm install or build is required.

## 2. Start

From this directory:

```bash
./start.sh
# or: ./start.sh 4874
```

Or directly from the repository root:

```bash
node server.mjs
```

Open:

```text
http://127.0.0.1:4873/
```

Alternate session roots or port:

```bash
OMP_SESSIONS_DIR=/absolute/omp/root CLAUDE_CODE_SESSIONS_DIR=/absolute/claude/root PORT=4874 node server.mjs
```

Do not bind or proxy this service to a remote interface without first adding authentication and secret redaction.

### Installing on another machine

Copy this whole directory (`server.mjs`, `index.html`, `start.sh`, `docs/`) to the target
machine — no build step, no `npm install`. Requires only Node.js on that machine. Run
`./start.sh` from inside the copied directory.

## 3. Basic health checks

```bash
curl -i http://127.0.0.1:4873/
curl -s http://127.0.0.1:4873/api/sessions
curl -s http://127.0.0.1:4873/api/session
curl -s http://127.0.0.1:4873/api/providers

Expected:

- HTML and JSON responses use `cache-control: no-store`.
- `/api/sessions` returns an array.
- `/api/session` returns a snapshot or 404 when no session exists.

## 4. Verification checklist for changes

### Parser/API changes

- Exercise a real or fixture JSONL with the changed record shape.
- Confirm incremental append updates without restarting.
- Confirm truncated-file reset behavior if touched.
- Confirm duplicate response ids do not double-count usage.
- Confirm pending call resolves to duration/error state.
- Confirm an invalid/outside `file` query does not resolve.
- Inspect the API payload, not only UI rendering.

### Provider quota changes

- Confirm `/api/providers` contains no token, credential or account fields.
- Confirm Codex prefers account usage, falls back to a bounded newest-file scan, and labels old fallback evidence `stale`.
- Confirm Claude network/auth failures become `Unavailable` without failing other providers.
- Confirm Antigravity CLI usage is requested server-side via local agy CLI and normalized to 5h and weekly windows.
- Confirm Antigravity CLI failure becomes `Unavailable` without failing other providers.
- Confirm OMP stays explicit `Unavailable` until a readable source exists.
- Confirm provider refresh is cached for 60 seconds.

### Live Trace changes

- Use a deterministic fixture containing session, prompt, execution start, successful/error result, compaction, reply and session exit.
- Confirm `tool-start` timestamp comes from `tool_execution_start`, not assistant proposal time.
- Confirm start/result pairing and final duration by `toolCallId`.
- Confirm a pending start renders a live duration and pulsing marker in Chrome.
- Confirm the fixed observed-only notice remains visible.
- Confirm the 80-event bound and selected-session replacement.

### UI changes

- Parse embedded JavaScript with Node.
- Start the real server and load the actual URL in Chrome.
- Exercise the changed click/keyboard/state path.
- Check browser console for exceptions, errors and warnings.
- Check 1440×900: document width/height equal viewport when Guides is closed; panels scroll internally.
- Check 390×844: no page-level horizontal overflow.
- Check dark and light themes when colors/styles change.
- Check `prefers-reduced-motion` when animation changes.

### Workflow changes

- Exercise idle, pending tool, recent success, recent error and reply states.
- Confirm only observed Tool/Output states use observed semantics.
- Confirm Context and Model remain inferred and Verify remains schematic.
- Confirm SVG remains mounted across ordinary 300 ms polling.
- Confirm session switch cancels stale handoff animation.

### Process Guide changes

- Validate every step references existing node/edge IDs.
- Validate active highlight exactly matches the current step.
- Check node/text bounds against each SVG viewBox.
- Exercise tabs, dots, Prev/Next, Play/Pause, Left/Right and Escape.
- Check desktop containment and mobile internal horizontal scrolling.

## 5. Common problems

### `EADDRINUSE`

Another process already owns the port. Determine whether it is the intended AI Live server before starting another instance. Use a different `PORT` when both are needed.

### Empty session list

Check:

- `OMP_SESSIONS_DIR` and `CLAUDE_CODE_SESSIONS_DIR` point to the roots above per-workspace directories.
- JSONL files are exactly one directory level below each root.
- Filenames end with `.jsonl` and do not start with `__`.
- The process can read files and directories.

### Session appears idle while work is occurring

The monitor marks Working from pending calls or recent file activity within 25 seconds. Model computation without new JSONL activity is inferred only within that window; this is an intentional limitation.

### Tool row animation stutters

Do not replace the running row without preserving its wall-clock phase. Existing code computes negative animation delay from `(Date.now() - event.at) % 1100`.

### Workflow animation resets every poll

Do not rebuild `#flow` for elapsed-time badge changes. The SVG is rebuilt only when the `<520px` topology changes; classes and text are updated in place.

### Browser shows stale UI

The server sends `no-store`, but a tab loaded through another server/export may still be stale. Confirm URL/port and reload. The historical desktop export zip is not a release artifact and may be outdated.

### Browser automation wrapper fails

Verification may use direct Chrome DevTools Protocol against a locally launched headless Chrome. Record this as the mechanism; do not claim wrapper coverage that did not run.

## 6. Data and privacy

The monitor displays local prompt/reply text, tool arguments, filesystem paths, model data, costs and todos. Treat screenshots and exports as potentially sensitive. The server performs no redaction.

Provider credentials remain server-side. `/api/providers` exposes only normalized percentages, reset times, freshness and bounded failure reasons. Claude quota requires a currently valid OAuth access token; AI Live does not refresh or persist credentials.

## 7. Release and git

- There is no build or packaged release process.
- Do not update historical desktop exports unless explicitly requested.
- Do not commit or push unless requested.
- When code behavior changes, update the canonical document in this directory and the current session handoff.
