# AI Live decision history

This file records durable design decisions and prevents superseded experiments from being restored without explicit direction.

## Current decisions

| Decision | Rationale | Evidence |
|---|---|---|
| Read local OMP and Claude Code JSONL | Keep the monitor dependency-free, local and truthful | `server.mjs` |
| Bind to loopback | No authentication or redaction exists | `server.mjs` |
| Compact monitor layout | Operational state must stay above the fold | `index.html` |
| Five-node Agent Workflow | Context → Model, Model↔Tool, Model↔Verify, Verify→Output communicates loops without inventing Tool→Verify | `index.html` |
| Label Context/Model inferred and Verify schematic | Transcript JSONL does not expose those internal stages as exact runtime events | `index.html`, `docs/ui-state-spec.md` |
| Keep workflow SVG mounted | Polling replacement resets visual continuity | `index.html` |
| Event-triggered handoff pulses only | Motion should communicate state, not run as decoration | `docs/ui-state-spec.md` |
| Flora visual skin | Lime accent, compact panels and theme-aware semantic colors | `index.html` |
| Process Guides are educational overlays | Source diagrams explain concepts; they are not runtime telemetry | `docs/product-spec.md` |
| Mobile guide diagram scrolls internally | Preserves authored graph readability without page overflow | `index.html` |
| Live Trace uses observed JSONL only | Exact runtime state is more useful than coloring unavailable internal stages | `server.mjs`, `docs/ui-state-spec.md` |

## Superseded layouts

### Context workflow design B

Historical design placed a compact workflow beside a detail panel on desktop. Current layout still preserves persistent collapsible detail, but the exact earlier geometry is superseded by the five-card workflow and current monitor grid.

The current layout remains authoritative in `index.html`.

### Tall workflow cards

The former 190×110 cards with labels beneath icons were replaced by 150×64 cards with icon and title in one row.

The current compact card geometry is authoritative in `index.html`.

### Landing-page monitor

Large hero metrics and unbounded page content were replaced by a compact status strip, bounded panels and one-screen desktop grid.

The current bounded dashboard grid is authoritative in `index.html`.

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

These experiments remain rejected unless a new product decision supersedes this record.

## Deliberately absent features

- OMP and Claude Code use independent parsers because their transcript shapes differ. Both are supported by the standalone AI Live server.
- 9router API access: unnecessary; local JSONL is authoritative.
- Live Context assembly events: unavailable.
- Live Verify/hook/approval events: unavailable.
- Persistent analytics database: not requested.
- Remote hosting/authentication: not designed.

## Historical evidence

Pre-publication implementation notes were intentionally excluded because they referenced private workspace paths. Source and canonical documents in this repository are the complete public authority.

## Open decisions

- User visual approval remains pending.
- Ambient workflow treatment remains deferred.
- A full modal focus trap has not been selected or implemented.
- Packaging/export ownership is undefined; old desktop zip copies are not authoritative.
