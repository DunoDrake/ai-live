# OMP Live decision history

This file prevents later models from reviving superseded designs or treating historical session notes as current requirements.

## Current decisions

| Decision | Rationale | Evidence |
|---|---|---|
| Read local OMP JSONL only | Keep the monitor dependency-free, local and truthful | `server.mjs`; `_handoff-checkpoint.md` |
| Bind to loopback | No authentication or redaction exists | `server.mjs` |
| Compact monitor layout | Operational state must stay above the fold | `omp-live-monitor-redesign.md` |
| Five-node workflow | Context → Model, Model↔Tool, Model↔Verify, Verify→Output communicates loops without inventing Tool→Verify | `omp-live-card-workflow.md` |
| Label Context/Model inferred and Verify schematic | OMP JSONL does not expose those internal stages as events | `omp-live-context-workflow.md` |
| Keep workflow SVG mounted | Polling replacement reset visual continuity | `omp-live-smooth-workflow.md` |
| Event-triggered handoff pulses only | Motion should communicate state, not run as decoration | monitor redesign addenda |
| Flora visual skin | Lime accent, compact panels and theme-aware semantic colors | monitor redesign addendum |
| Process Guides are educational overlays | Source diagrams explain concepts; they are not runtime telemetry | monitor redesign Process Guides addendum |
| Mobile guide diagram scrolls internally | Preserves authored graph readability without page overflow | current `index.html` |
| Live Trace uses observed JSONL only | Exact runtime history is more useful than coloring unavailable internal stages; Context/reasoning/Verify remain absent | `server.mjs`, Live Trace implementation session |

## Superseded layouts

### Context workflow design B

Historical design placed a compact workflow beside a detail panel on desktop. Current layout still preserves persistent collapsible detail, but the exact earlier geometry is superseded by the five-card workflow and current monitor grid.

Evidence: `docs/sessions/omp-live-context-workflow.md`.

### Tall workflow cards

The former 190×110 cards with labels beneath icons were replaced by 150×64 cards with icon and title in one row.

Evidence: `docs/sessions/omp-live-card-workflow.md`.

### Landing-page monitor

Large hero metrics and unbounded page content were replaced by a compact status strip, bounded panels and one-screen desktop grid.

Evidence: `docs/sessions/omp-live-monitor-redesign.md`.

## Removed or rejected experiments

Do not restore these without an explicit new user direction:

- Drifting background grid/glow.
- Continuous connector animation.
- Layered SVG liquid waves.
- Drifting particles/sparks.
- State-aware ambient connector loop.
- Active-card energy fill.
- Completion ripple.
- Color-coded one-shot signal experiment.

The user rejected the visual direction and deferred ambient work. The only retained repair from the final experiment was unclipped active-node glow: `.flowsvg { overflow: visible }` and glow on the larger halo.

Evidence:

- `docs/sessions/omp-live-living-circuit.md`
- `docs/sessions/omp-live-safe-workflow-motion.md`

## Deliberately absent features

- Claude Code session reader: explicitly declined in OMP Live. Reversed in this fork
  (`scripts/claude-live/`, renamed "AI Live") on 2026-10-22, at user request, as a second
  independent parser reading `~/.claude/projects/**/*.jsonl` alongside the OMP parser.
  `scripts/omp-live/` itself is untouched.
- 9router API access: unnecessary; local JSONL is authoritative.
- Live Context assembly events: unavailable.
- Live Verify/hook/approval events: unavailable.
- Persistent analytics database: not requested.
- Remote hosting/authentication: not designed.

## Historical evidence map

| File | Use |
|---|---|
| `docs/sessions/omp-live-monitor-redesign.md` | Main monitor redesign, Flora skin, workflow motion, Process Guides and verification evidence |
| `docs/sessions/omp-live-card-workflow.md` | Current workflow topology and non-crossing responsive routes |
| `docs/sessions/omp-live-context-workflow.md` | Telemetry truth labels, Context illustration and detail-panel behavior |
| `docs/sessions/omp-live-smooth-workflow.md` | Stable DOM/SVG lifecycle across polling |
| `docs/sessions/omp-live-living-circuit.md` | Ambient rollback |
| `docs/sessions/omp-live-safe-workflow-motion.md` | Rejected motion set and retained clipping fix |
| `docs/sessions/_handoff-checkpoint.md` | Temporary operator handoff; may contain mock/export notes, not canonical behavior |

## Open decisions

- User visual approval remains pending.
- Ambient workflow treatment remains deferred.
- A full modal focus trap has not been selected or implemented.
- Packaging/export ownership is undefined; old desktop zip copies are not authoritative.
