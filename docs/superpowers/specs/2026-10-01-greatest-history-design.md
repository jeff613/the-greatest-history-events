# The Greatest History - Design

Date: 2026-10-01
Status: Built. Its data model, timeline bands and event panel are superseded by `2026-10-04-unified-timeline-design.md`.

## 1. Purpose

An interactive website showing the most influential events on Earth from 2000 BC to AD 2000 on a single world map, so you can see what was happening in different parts of the world at the same time.

Goals (in priority order):

1. **Portfolio / showpiece** - a beautiful, impressive interactive visualization.
2. **Learning tool** - curious people explore and understand how civilizations coexisted.

Non-goals: authoritative academic reference. Accuracy matters but depth of sourcing does not; each event links to Wikipedia rather than carrying its own citations.

Success looks like: dragging the slider to any moment between 2000 BC and AD 2000 shows the empires that existed, the major events happening around that time grouped by region, and a readable explanation of each event - all smooth and good-looking on a desktop browser, usable on a phone.

## 2. Experience

### 2.1 Layout (desktop first)

- **Map** (fills most of the screen). Historical borders shaded and labeled with polity names. Pins for events in the current time window, colored by category.
- **Right panel - "Around <year>"**. Events in the current window grouped by region, then sorted (see 4.2). Clicking an event opens the **event card** inside the panel: title, date label, place, summary (2-3 sentences), significance (1-2 sentences), Wikipedia link, and a back button to the list.
- **Bottom strip - timeline and slider**. Era/empire bands stacked in rows by region on one time axis, a draggable red playhead, a play/pause button that animates through time, and scroll-to-zoom with drag-to-pan.

### 2.2 Linking between views

- Hovering an event in the panel highlights its pin; hovering a pin highlights its panel entry.
- Clicking a pin or a panel entry selects the event: the card opens and the map eases to the pin if it is off-screen.
- Clicking an era band moves the playhead to the band's start year.

### 2.3 Time window ("around this time")

The window half-width scales with the strip zoom: about ±100 years when fully zoomed out, shrinking proportionally with zoom down to a minimum of ±10 years. Events with an `endYear` are included if their span overlaps the window.

### 2.4 Borders

Show the latest border snapshot whose year is at or before the current year. On snapshot change, crossfade the old and new layers (about 300 ms). No geometric interpolation between snapshots.

Before 2000 BC there is no snapshot in range; if the first available snapshot is after 2000 BC, show the base map with no borders until it applies.

### 2.5 Shareable state

URL query string holds `year`, `zoom`, and `event` (e.g. `?year=-44&event=caesar-assassination`). Loading a URL restores that view. URL updates use `history.replaceState` (no history spam while dragging).

### 2.6 Mobile

Map full screen, bottom strip stays fixed at the bottom, the region panel becomes a bottom sheet swiped up over the map. Must work; not the primary design target.

### 2.7 Attribution

A small "About" overlay: what the site is, "borders are approximate" disclaimer, credits for historical-basemaps (GPL-3.0) and Natural Earth.

## 3. Time scale

The strip uses a **compressed scale**: recent centuries get more horizontal space than ancient ones, because event density rises toward the present.

- Implemented as a single smooth, monotonic function `yearToX(year)` with exact inverse `xToYear(x)`, based on log distance from a reference point after the end of the range (e.g. `x ∝ -log(2100 - year)`, normalized to the strip width). The reference constant is tuned during implementation so that the last 1000 years take roughly 40-50% of the width.
- Tick marks are generated in "nice" year intervals that adapt to the local density, so the uneven spacing is visible and honest.
- Zoom and pan operate on the scaled axis (zooming magnifies the current region of the curve).

## 4. Data

All content lives in `data/` as JSON, validated against a schema (zod) at build time. Invalid data fails the build with a message naming the file, record id, and field.

### 4.1 Years

Years are signed integers with **no year zero**: -44 is 44 BC, 1 is AD 1, and -1 is immediately followed by 1. Year 0 is a validation error. A single `formatYear` helper renders `44 BC` / `AD 1066` (AD prefix only for years below 1000; plain `1492` from AD 1000 onward). Arithmetic across the BC/AD boundary goes through a helper that accounts for the missing zero.

### 4.2 Events - `data/events/<millennium>.json`

Files split by millennium (`2000bc-1001bc.json`, `1000bc-1bc.json`, `ad1-ad1000.json`, `ad1001-ad2000.json`) for manageable editing. Each file is an array of:

```json
{
  "id": "caesar-assassination",
  "title": "Julius Caesar assassinated",
  "year": -44,
  "endYear": null,
  "dateLabel": "15 March 44 BC",
  "region": "europe",
  "category": "politics",
  "location": { "name": "Rome", "lat": 41.89, "lng": 12.49 },
  "importance": 3,
  "summary": "2-3 sentences.",
  "significance": "1-2 sentences on why it mattered.",
  "wikipedia": "https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar"
}
```

Rules:

- `id`: unique kebab-case across all files.
- `year`, `endYear`: within -2000..2000, non-zero, `endYear` null or greater than `year`.
- `dateLabel`: optional; defaults to `formatYear(year)` (or a range).
- `region`: one of the fixed regions below.
- `category`: one of `politics` (incl. war), `religion` (incl. philosophy), `science` (incl. technology), `culture`, `trade` (incl. exploration).
- `importance`: 1 (notable), 2 (major), 3 (world-changing).
- `wikipedia`: `https://en.wikipedia.org/wiki/...`.

**Regions (fixed, 8):** `europe`, `mena` (Middle East & North Africa), `sub-saharan-africa`, `central-asia` (incl. steppe), `south-asia`, `east-asia`, `southeast-asia-oceania`, `americas`.

**Panel ordering:** regions in the fixed order above, skipping empty ones; within a region, sort by importance descending, then by distance from the current year ascending. Cap at 5 events per region with a "+N more" expander.

**Pins at low zoom:** when the strip is zoomed out (window above ±50 years), only importance 2-3 events get pins; all events in the window still appear in the panel.

### 4.3 Eras - `data/eras.json`

```json
{ "id": "han", "name": "Han dynasty", "start": -206, "end": 220, "region": "east-asia" }
```

Same year rules. Bands are laid out in rows grouped by region; overlapping eras within a region go to additional sub-rows (greedy interval packing).

### 4.4 Borders

- Source: [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps), GPL-3.0. Feature properties used: `NAME`, `SUBJECTO`, `BORDERPRECISION`.
- `scripts/fetch-borders` downloads the snapshots from the repo's `index.json` whose years fall within (or are the last one before) -2000..2000, pinned to a specific commit SHA, into `public/borders/`, along with the license file and a generated `public/borders/index.json` (year -> file).
- Polity colors: deterministic from `SUBJECTO` (or `NAME`) via hashing into a fixed muted palette, so the same empire keeps its color across snapshots.

### 4.5 Base map

Natural Earth (public domain) land, ocean, lakes, and major rivers at 1:50m, as one GeoJSON in `public/basemap/`. No modern borders or labels, and no third-party tile service.

### 4.6 Content plan (v1)

About 200 events and about 60 eras, drafted by Claude in batches of about 50 grouped by period, reviewed and edited by the owner before each is committed. Aim for global balance: every region must have events in each millennium where the historical record allows.

Growing later toward 1000+ events (e.g. Wikidata import) means adding more files in the same format; no app changes.

## 5. Architecture

Static single-page app: **Vite + React + TypeScript + MapLibre GL JS**. No backend.

### 5.1 Units

| Unit | Responsibility | Depends on |
|---|---|---|
| `lib/years.ts` | `formatYear`, year arithmetic without year zero | - |
| `lib/timeScale.ts` | `yearToX`, `xToYear`, zoom/pan transforms, tick generation | - |
| `lib/selectEvents.ts` | Window computation from zoom; filter, group by region, sort, cap | `years` |
| `lib/borders.ts` | Snapshot lookup for a year; polity color hashing | - |
| `data/schema.ts` | zod schemas and types for events and eras | - |
| `state/useTimeState.ts` | Single source of truth: `year`, `zoom`, `pan`, `selectedEventId`, `hoveredEventId`, `playing`; syncs with URL | - |
| `components/MapView` | MapLibre: base layer, border layer(s) with crossfade, pins, highlighting | `borders`, state |
| `components/EventPanel` | Region list, event card, mobile bottom sheet | `selectEvents`, state |
| `components/TimelineStrip` | SVG bands, ticks, playhead drag, play, zoom/pan | `timeScale`, state |
| `components/About` | Overlay with disclaimer and credits | - |
| `scripts/validate-data.ts` | Loads all data, validates schema and cross-record rules (unique ids) | `schema` |
| `scripts/fetch-borders.ts` | Downloads and indexes border snapshots | - |

Views never talk to each other directly; they read from and write to `useTimeState`.

### 5.2 Data loading

Events and eras are imported as JSON at build time (bundled). Border snapshots are fetched lazily per snapshot at runtime and cached in memory; the next and previous snapshots are prefetched while the playhead moves.

### 5.3 Playback

Play advances the year at a speed in screen pixels per second on the scaled axis, so playback feels the same speed across the compressed scale. Playback stops at AD 2000.

### 5.4 Error handling

- A border snapshot that fails to load: keep showing the previous one and log to the console; no user-facing error.
- An unknown `event` id in the URL: ignore it and show the year.
- An out-of-range or zero `year` in the URL: clamp to the range (zero becomes 1).

## 6. Testing

- **Unit (Vitest):** `years` (formatting, BC/AD boundary arithmetic), `timeScale` (round-trip `xToYear(yearToX(y)) == y`, monotonicity, endpoints, tick generation), `selectEvents` (window edges, span overlap, ordering, caps), `borders` (snapshot lookup at, before, and between snapshot years; color stability).
- **Data validation:** `npm run validate` runs in the build; also run as a test.
- **E2E smoke (Playwright):** load `/?year=-44`, assert the panel lists Caesar's assassination under Europe; drag the playhead, assert the panel contents change; click an event, assert the card opens and the URL contains `event=`.

## 7. Hosting

Served from this Mac mini to the owner's own devices over Tailscale:

- `npm run build` produces `dist/`.
- `tailscale serve --bg <absolute path to dist>` serves it over HTTPS at `https://<mac-mini>.<tailnet>.ts.net` to tailnet devices only. (The CLI binary is at `/Applications/Tailscale.app/Contents/MacOS/Tailscale` because it is not on PATH.)
- Rebuilding updates the served files in place; no restart needed.
- Going public later: `tailscale funnel` (out of scope for v1).

## 8. Out of scope (v1)

Search, category filters, multiple languages, an admin/editing UI, Wikidata import, animated border changes between snapshots, public hosting, and accounts.

## 9. Repo conventions

- `AGENTS.md` is the canonical agent instructions file; `CLAUDE.md` is a symlink to it.
- `.superpowers/`, `node_modules/`, `dist/` are gitignored.
