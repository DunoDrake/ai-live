# AI Live product specification

Status: implemented baseline (forked from OMP Live, extended to Claude Code)
Last consolidated: 2026-10-22

## 1. Purpose

AI Live is a local, read-only monitor for OMP agent sessions and Claude Code sessions. It
converts append-only session JSONL (either source) into a compact operational surface
showing what a session is doing now, what it recently did, and which information is
observed versus inferred. The rest of this document describes the OMP-only design this
fork started from; see `README.md` for what changed to add Claude Code support.

The product is for an operator supervising local agent work. It is not an agent control plane, tracing backend, analytics service or replacement for the OMP or Claude Code terminal UI.

## 2. Product principles

1. **Observed truth first.** Tool calls, results, messages, usage and todo data come from JSONL. Inferred or schematic stages MUST be labeled as such.
2. **Read-only by construction.** The server MUST NOT write to session files or expose mutation endpoints.
3. **Local by default.** The HTTP server MUST bind to `127.0.0.1`; no authentication is assumed.
4. **Monitor, not landing page.** At desktop sizes, current state and recent activity SHOULD fit in one viewport with bounded panel scrolling.
5. **Motion communicates state.** Animation SHOULD indicate active work or a handoff. Decorative ambient effects are not part of the current product.
6. **Cost is logged, never estimated.** The dashboard MUST sum only positive prices present in transcript usage records and MUST disclose replies that contain usage but no logged price.
7. **Degrade honestly.** Missing context, model, usage, todo or plan data appears as absent/unknown; the UI MUST NOT fabricate it.

## 3. Primary user tasks

- Identify the latest or a selected recent session.
- See whether it is working, idle or ended.
- See the currently running tool, intent, arguments and elapsed time.
- Distinguish running, successful and failed recent tool calls.
- Inspect the latest user prompt and assistant reply.
- Inspect todo phases and local `*-plan.md` progress.
- Understand the conceptual Context → Model ↔ Tool → Verify → Output workflow without mistaking schematic stages for telemetry.
- Follow the exact observed session lifecycle in Live Trace while AI work is running.
- Open Process Guides for explanatory diagrams about prompting, context, harnesses and RAG.

## 4. Functional requirements

### 4.1 Session discovery and selection

- List up to 30 JSONL sessions, newest file modification first.
- Exclude files whose names begin with `__`.
- Show title, working state, workspace basename and relative age.
- Provide `Auto · latest session`; this always resolves the newest available session.
- Preserve explicit selection while polling; a stale response for a previously selected session MUST NOT replace the current view.

### 4.2 Status strip

Display:

- Status: `WORKING`, `IDLE` or `ENDED`.
- Now: first pending tool and intent, or a truthful idle/ended message.
- Context token snapshot and compaction count when supplied by OMP.
- Logged cost and input/output token totals.
- Prompt and assistant-turn counts.
- Tool error count.
- Model name and thinking level when supplied.

### 4.3 Agent workflow

The surface contains five selectable stages:

- Context
- Model
- Tool
- Verify
- Output

Each node MUST open a persistent detail panel. The collapsed panel MUST retain a summary. Nodes MUST be keyboard-operable.

Telemetry semantics are specified in [ui-state-spec.md](ui-state-spec.md). Context loading and Verify MUST NOT be presented as observed events.

### 4.4 Tool calls

- Display the recent event window newest first.
- Filters: All, Running, Errors.
- A running row displays live elapsed time and a continuous progress/spinner phase across DOM refreshes.
- Completed and failed states remain distinct from running.
- Calls to the `task` tool are marked as subagent calls.
- Prompt and reply events MAY appear in the All stream but do not count as tool calls.

### 4.5 Live Trace

- Provide a `Live trace` tab beside Tool Calls without increasing the desktop page height.
- Show newest observed JSONL events first: session start/end, prompt, model/thinking changes, tool execution start/result, assistant reply, compaction and todo changes.
- Tool execution starts MUST come from `custom/tool_execution_start`, not from an assistant-proposed `toolCall`.
- Pair tool start/result by `toolCallId`; show live elapsed duration while pending and final duration after result.
- Every trace event is observed. The panel MUST explicitly state that Context assembly, reasoning and Verify are absent rather than inferred.
- Keep at most 80 trace events per cached session.
- Switching sessions MUST replace the trace with the selected session's events.
- Render the latest observed Prompt→Reply turn as a bounded flowchart beside Raw Timeline; stack them on narrower screens.
- Use Start/End terminals for Prompt/Reply, process nodes for grouped tool lifecycles and dashed annotation nodes for metadata.
- Wrap at three columns in a snake layout and cap at 12 flow nodes.
- Collapse each tool lifecycle into one node keyed by `toolCallId`; attach Todo only by matching observed ID.
- Follow observed event order and never invent dependency branches or unavailable internal stages.
- Update pending duration in place while Raw Timeline retains all bounded evidence.

### 4.6 Supporting panels


- **Sessions:** recent selectable sessions and live count.
- **Conversation:** latest user and assistant text, clipped for monitoring.
- **Todo:** phases, completion ratio and up to eight tasks for the active phase.
- **Session:** token/cache/cost/start metadata, top tools and local `*-plan.md` progress.

### 4.7 Process Guides

Provide an explanatory modal with these source-derived guides:

| Guide | Steps | Purpose |
|---|---:|---|
| Prompt · Context · Harness | 5 | Explain the progression from wording to information to an execution harness |
| RAG in 3 steps | 7 | Explain prepare, retrieve and generate/retry |
| Wiki search as a graph | 11 | Explain authentication, ACL-filtered retrieval, citation checking and human escalation |

Requirements:

- Source label: `HackProduct · schematic, not OMP telemetry`.
- Controls: tabs, direct step dots, Prev, Next, Play/Pause, Left/Right keys, Escape/Close.
- Current nodes/edges are highlighted; prior steps remain visible but subdued.
- Vietnamese `Setup của bạn` notes compare the source schematic with observed OMP capabilities without claiming equivalence.
- Reduced-motion preference disables animation and autoplay.

## 5. Visual and responsive requirements

- Use JetBrains Mono with system monospace fallbacks.
- Support dark and light themes; persist theme in local storage.
- Desktop ≥1200px: workflow/tool columns side by side and four bottom panels in one row.
- Tablet: one main column and two-column bottom grid.
- Mobile ≤760px: one-column document with no page-level horizontal overflow.
- Process Guide diagrams MAY use an internal horizontal scroller on mobile; the document itself MUST remain viewport-width.
- Interactive focus MUST remain visible.
- `prefers-reduced-motion: reduce` MUST disable animations and transitions.

## 6. Non-functional requirements

- No runtime package installation or build step.
- Incremental JSONL reading; do not reread complete unchanged files on every poll.
- API and HTML responses use `cache-control: no-store`.
- Session polling MUST be single-flight.
- Current SVG workflow SHOULD remain mounted across polls; rebuild only when its responsive topology changes.
- User-provided strings MUST be HTML-escaped before insertion.
- Requested session files MUST resolve under the configured session root and end in `.jsonl`.

## 7. Explicit non-goals

- Writing, stopping, approving or modifying OMP or Claude Code sessions.
- Calling 9router or Anthropic APIs; data comes from local JSONL only.
- Claiming live telemetry for context assembly, model execution, Verify, hooks or approvals.
- Persistent historical analytics beyond the bounded recent event window.
- Multi-user or remote hosting.
- Ambient grid drift, liquid waves, particles, continuous connector loops, energy fills or completion ripples.

## 8. Acceptance criteria

A change is acceptable when relevant checks prove:

- Server starts and responds on loopback.
- `/api/sessions` and `/api/session` retain their documented shapes and path safety.
- Embedded JavaScript parses.
- The changed state is exercised in real Chrome, not only source-inspected.
- Desktop 1440×900 has no document overflow and retains bounded internal panels.
- Mobile 390×844 has no page-level horizontal overflow.
- Dark/light and reduced-motion behavior remain valid when affected.
- Browser console has no new errors or warnings.
- Observed, inferred and schematic labels remain truthful.

## 9. Pending product decisions

- User visual acceptance of the current monitor and Process Guides.
- Any future ambient treatment requires a new explicit direction; prior ambient concepts are rejected/deferred.
- Remote access, authentication, persistence and packaging are not approved scope.
