# Unified Timeline Implementation Plan

**Goal:** One collection of timeline entries (states, periods, moments) shown together on the bottom timeline, with a reading pane and a card that work for all three kinds.

**Architecture:** Events and eras merge into `data/timeline/*.json` under one zod schema discriminated by `kind`. Pure functions compute the playhead slice, an entry's context, and the moment markers and labels for a zoom; the three views consume them through `useTimeState`, which holds a single selection.

**Tech Stack:** Vite, React, TypeScript, zod, MapLibre GL JS, Vitest, Playwright (all existing).

**Spec:** `docs/superpowers/specs/2026-10-04-unified-timeline-design.md`

**Execution:** native, in one session; the owner reviews the built result.

## Global Constraints

- Years are signed integers with no year zero; use `src/lib/years.ts` for arithmetic.
- Never use the em dash character anywhere, including content.
- Views read and write state only through `useTimeState`.
- State ids and moment ids do not change (territory matching and shared links depend on them).
- Each timeline file only holds entries whose `start` falls in its millennium.

## Review Focus

- An entry selected from a region that is switched off must still be visible on the timeline (the region switches on).
- Two moments in the same year and region must both be reachable: both markers drawn, neither label overlapping the other.
- A moment at the first or last visible year must keep its label inside the strip (flip to the other side).
- A state with no moments, and a moment inside no bar, must render a card without an empty context heading.
- An old `?event=<id>` link for a moment that was folded into a state must open that state rather than nothing.

## Tasks

### Task 1: Schema, validation and loader for entries

**Files:** modify `src/data/schema.ts`, `src/data/validate.ts`, `src/data/validate.test.ts`, `src/data/index.ts`, `src/data/focus.test.ts`, `scripts/loadDataFiles.ts`, `scripts/validate-data.ts`, `scripts/check-wikipedia.ts`.

**Produces:**
- `entrySchema`; types `Entry`, `State`, `Period`, `Moment`, `Bar = State | Period`, `Placed = Moment | (Period with location)`; `ENTRY_FILES`.
- `validateData(files: DataFile[]): string[]`.
- `ENTRIES`, `ENTRIES_BY_ID`, `MOMENTS`, `BARS`, `PLACED`, `isFocusEntry(entry)`, `hasPlace(entry): entry is Placed`, `FOLDED: Record<string, string>` (old moment id to the bar it folded into).

Tests: a moment with an end year fails; a state or period without one fails; a period with a location but no importance fails; duplicate ids across files fail; an entry in the wrong millennium file fails; focus rule unchanged for placed entries and true for unplaced ones.

### Task 2: Migration

**Files:** create and then delete `scripts/migrate-timeline.ts`; create `data/timeline/*.json`; delete `data/eras.json`, `data/events/`; create `data/folded.json`.

Applies the spec's merge table and fold list; fails if any id collides afterwards. Adds Wikipedia links to states. `npm run validate` and `npm run check-links` pass.

### Task 3: Slice, context and state

**Files:** create `src/lib/slice.ts` + test (replaces `selectEvents.ts` + test), `src/lib/context.ts` + test; modify `src/state/urlState.ts` + test, `src/state/useTimeState.ts`, `src/lib/packEras.ts`, `src/lib/eraTerritory.ts` + tests.

**Produces:**
- `windowHalfWidth(zoom)`, `distanceFromYear(entry, year)`, `pinnedEntries(placed, year, halfWidth): Placed[]`.
- `sliceAt(entries, year, halfWidth, regions): { groups: { region, inProgress: Bar[], moments: Moment[] }[]; elsewhere: number }`.
- `partOf(entry, bars): Bar[]`, `keyMoments(bar, moments): Moment[]`.
- URL state `{ year, view, selectedId }`; `item` and `event` params, with folded ids resolved.
- `useTimeState`: `selectedId`, `select(id | null)` (moves the playhead to `start`, switches the entry's region on), `hoveredId`, `hover(id | null)`, `showAllRegions()`.

### Task 4: Moment markers and labels

**Files:** create `src/lib/momentLayout.ts` + test.

**Produces:**
- `minImportance(visibleYears): 1 | 2 | 3` (3 above 1500 years, 2 above 300, else 1).
- `placeLabels(markers: { id, x, label, importance, distance }[], width, charW): Map<string, { side: 'right' | 'left' | 'above' }>`: greedy, most important first then nearest; beside the marker when the space is free of other markers and labels, else above when that row is free, else no label.

### Task 5: Timeline strip

**Files:** modify `src/components/TimelineStrip.tsx`, `src/styles.css`, `src/App.tsx`.

Each lane gets a moments area above its bars: diamonds (size by importance, colour by category), labelled pills for placed periods whose bar is too narrow for its name, labels from `placeLabels`. `data-entry` on every bar and marker; click selects; hover is shared. A drag handle on the strip's top edge sets its height (kept in `sessionStorage`).

### Task 6: Pane and card

**Files:** modify `src/components/EventPanel.tsx`, `src/components/MapView.tsx`, `src/App.tsx`, `src/styles.css`.

"At this moment" from `sliceAt`; one card for all kinds with "Part of" and "Key moments"; the map takes `Placed[]` pins and the selected state.

### Task 7: Content

**Files:** modify `data/timeline/*.json`, `src/data/schema.ts`.

Summary, significance and Wikipedia link for every state and period; then `summary`, `significance` and `wikipedia` become required for all kinds.

### Task 8: End-to-end tests and docs

**Files:** modify `e2e/*.spec.ts`, `AGENTS.md`, `src/components/About.tsx`.

New flows from the spec's testing section; existing flows updated for the single selection.
