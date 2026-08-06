# Handofflog — Figma Plugin (Phase 01 Technical Prototype)

Snapshot-based change tracking for Figma handoffs. Select a frame, capture a
baseline, make design changes, re-scan, review the property-level diff, and
export it as JSON. This prototype is fully local — no design data leaves Figma.

## The loop

```
Select → Snapshot (baseline) → Change → Scan → Review → Publish → Export
```

Reviewed changes can be **published as a versioned Release** (name, version,
suggested type from impact, description); publishing promotes the scanned
snapshot to the new baseline and appends to the local release history. Export
still produces baseline / changeset JSON, and the changeset export respects the
include selection. Anonymous usage telemetry is **opt-in, off by default**.

CI (`.github/workflows/ci.yml`) runs `typecheck → test → build` on every push/PR.

## Architecture

```
src/
  shared/   Zod schema + typed message contract (no Figma, no DOM)
  core/     Figma-independent diff engine (pure TypeScript, unit-tested in node)
  plugin/   Figma main thread: selection, normalize, snapshot, storage, wiring
  ui/       React iframe: overview, empty states, change cards, JSON export
```

Key boundaries (enforced by design):

- The **core diff engine** (`src/core`) never references the `figma` global or
  the DOM. It is a pure function `diffSnapshots(baseline, current)` and is fully
  exercised by unit tests in a plain node environment.
- The **normalizer** (`src/plugin/normalize.ts`) is the only place that reads
  live Figma API objects; it converts them into plain, serializable shapes.
- Main and UI communicate **only** through the typed, Zod-validated message
  contract in `src/shared/messages.ts`.
- Snapshots carry a mandatory `schemaVersion`. Storage/parse failures never
  delete an existing baseline.

## Prerequisites

- Node.js 18+
- Figma desktop app

## Install & build

```bash
cd plugin
npm install
npm run build        # → dist/code.js and dist/ui.html
```

Useful scripts:

| Script              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `npm run typecheck` | `tsc --noEmit` (strict mode)                |
| `npm run test`      | Run the vitest suite once                   |
| `npm run build`     | Bundle main + UI into `dist/`               |
| `npm run build:watch` | Rebuild on change during development      |
| `npm run verify`    | typecheck + test + build (pre-commit gate)  |

## Load the plugin in Figma

1. Run `npm run build` so `dist/code.js` and `dist/ui.html` exist.
2. In the Figma desktop app: **Plugins → Development → Import plugin from
   manifest…**
3. Select `plugin/manifest.json`.
4. Run it from **Plugins → Development → Handofflog**.

## Manual test (the completion criterion)

1. Draw a frame (e.g. `Checkout`) with a text layer and a button frame inside.
2. Select the frame → **Create Baseline**. Note the tracked-node count.
3. Make three changes:
   - resize the button's **width** (e.g. 320 → 360),
   - edit the text layer's content (e.g. `Continue` → `Pay Now`),
   - add a **new child** to the frame.
4. Re-select the frame → **Scan Changes**.
5. Expect: the width change under **Modified** (`layout`), the text change under
   **Modified** (`content`), and the new child under **Added**.
6. **Export ChangeSet** to download the diff as JSON.

## Notes & limits (Phase 01)

Out of scope by design: background monitoring, pixel-level visual diff,
Jira/Linear sync, org-wide scanning, AI change detection, GitHub comparison,
billing. See `../01_PRODUCT` and `../03_TECHNICAL` for the full specs, and
`../06_REFERENCE/DECISION_LOG.md` for recorded decisions.
