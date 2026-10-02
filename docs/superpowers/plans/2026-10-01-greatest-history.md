# The Greatest History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static website showing the most influential events from 2000 BC to AD 2000 on a world map with historical borders, a "meanwhile around the world" event panel, and an empire/era timeline strip that doubles as the time slider.

**Architecture:** Vite + React single-page app with no backend. Pure, unit-tested modules (`years`, `timeScale`, `selectEvents`, `borders`, `packEras`, `urlState`, `playback`) hold all logic; three views (`MapView`, `EventPanel`, `TimelineStrip`) read from one state hook (`useTimeState`) and never talk to each other. Event and era content is JSON in `data/`, validated at build time; map assets (historical borders, Natural Earth base map, label fonts) are downloaded from pinned commits by scripts and self-hosted.

**Tech Stack:** Node 26, TypeScript, Vite 8, React 19, MapLibre GL JS 6, zod 4, Vitest 5, Playwright, tsx.

**Spec:** `docs/superpowers/specs/2026-10-01-greatest-history-design.md`

## Global Constraints

- Never use the em dash character anywhere: code, comments, UI copy, event content, commit messages. Use a plain hyphen `-`.
- Commit messages must NOT include any `Co-Authored-By` line or agent name.
- Years are signed integers in `-2000..2000` with **no year zero**: `-44` is 44 BC, `1` is AD 1, `-1` is immediately followed by `1`. Year arithmetic across the boundary goes through `src/lib/years.ts` (`toAstronomical`, `yearDiff`, `addYears`), never raw subtraction.
- Year display: `44 BC`, `AD 476` (AD prefix only below 1000), `1492` (plain from 1000 on).
- Regions (exact ids, this order everywhere): `europe`, `mena`, `sub-saharan-africa`, `central-asia`, `south-asia`, `east-asia`, `southeast-asia-oceania`, `americas`.
- Region assignment for ambiguous places: Egypt, Anatolia, Iran and the Levant are `mena`; Constantinople is `europe`; European Russia is `europe`; Siberia, the Caucasus steppe, Kazakhstan and Mongolia are `central-asia`; Afghanistan is `central-asia`; Pakistan is `south-asia`; Australia, New Zealand and Pacific islands are `southeast-asia-oceania`.
- Categories (exact ids): `politics` (politics, war, upheaval, pandemics and crises), `religion` (incl. philosophy), `science` (incl. technology and medicine), `culture` (incl. arts, writing, architecture), `trade` (incl. exploration and migration).
- Event `importance`: 1 notable, 2 major, 3 world-changing.
- Time window half-width: `max(10, round(100 / zoom))` years. Only importance 2-3 events get map pins when the half-width is above 50. Panel shows at most 5 events per region with a "+N more" button.
- Time scale: `x ∝ -ln(SCALE_REF - astronomicalYear)` with `SCALE_REF = 2700`; the last 1000 years must take 40-50% of the axis. Zoom range 1..40.
- Borders: snapshot shown is the latest with `year <= current year`; switching crossfades over 300 ms; failed loads keep the previous snapshot.
- No third-party map tile or font services at runtime. All geo assets are fetched by scripts from pinned commit SHAs into `public/` (gitignored):
  - historical-basemaps `da7a4b735ecef70aebdc9c73e409d8a2500d50f3` (GPL-3.0, must be credited in the About overlay)
  - natural-earth-vector `ca96624a56bd078437bca8184e78163e5039ad19` (public domain)
  - openmaptiles/fonts `025ff2b2f84cc0fdf11f7b1d74b3a784595fe7a4` (font stack `Open Sans Italic`)
- Map projection: MapLibre `globe`.
- URL state: `?year=<int>&zoom=<number>&event=<id>`; updated with `history.replaceState` only.
- Default year when the URL has none: `-500`.

## Review Focus

1. **WebGL unavailable** (old browser, locked-down device, some headless setups): the page must not go blank. The map area shows a short message and the panel and timeline keep working. Test: Task 9, `e2e/map.spec.ts` "without WebGL...".
2. **Fast scrubbing across many border snapshots**: slow downloads arriving out of order must never leave the map showing borders for a year the user already left. Test: Task 6, `createLatestLoader` tests "superseded loads resolve to null" and "invalidate drops pending loads".
3. **Hand-edited or shared URLs with garbage** (`year=abc`, `year=0`, `year=99999`, `zoom=-5`, unknown `event`): the app opens at a sensible place, never crashes. Tests: Task 7 `urlState.test.ts` and Task 10 `e2e/panel.spec.ts` "bad URL values fall back safely".
4. **Windows that cross 1 BC / AD 1, and long-running events**: an event 10 years before AD 1 is "within 10 years" of AD 1 (no off-by-one from the missing year zero), and the Han dynasty or the Black Death show up when the playhead is in the middle of them. Tests: Task 5 `selectEvents.test.ts`.
5. **Pressing play at AD 2000 or holding play to the end**: playback restarts from 2000 BC when started at the end, stops cleanly at AD 2000, and a long frame (tab switched away) does not jump centuries. Tests: Task 7 `playback.test.ts`.

---

## File Structure

```
AGENTS.md                         agent instructions (canonical); CLAUDE.md -> AGENTS.md symlink
package.json, tsconfig.json, vite.config.ts, playwright.config.ts, index.html
data/
  events/2000bc-1001bc.json       events, one file per millennium
  events/1000bc-1bc.json
  events/ad1-ad1000.json
  events/ad1001-ad2000.json
  eras.json                       empire/era bands
scripts/
  loadDataFiles.ts                reads data/ from disk (shared by validate script and tests)
  validate-data.ts                CLI: validate data/, exit 1 on problems
  check-wikipedia.ts              CLI: verify every wikipedia URL resolves
  fetch-borders.ts                CLI: download border snapshots into public/borders/
  fetch-basemap.ts                CLI: download Natural Earth + glyphs into public/basemap/, public/glyphs/
src/
  main.tsx, App.tsx, styles.css, theme.ts
  lib/years.ts                    year formatting and arithmetic without year zero
  lib/timeScale.ts                compressed axis, view (zoom/pan), ticks
  lib/selectEvents.ts             window, filtering, grouping, pins
  lib/borders.ts                  snapshot lookup, polity colors, latest-wins loader
  lib/packEras.ts                 era bands into rows per region
  data/schema.ts                  zod schemas, types, REGIONS, CATEGORIES
  data/validate.ts                pure validation of all data files
  data/index.ts                   bundled EVENTS, ERAS, EVENTS_BY_ID
  state/urlState.ts               parse/serialize URL
  state/playback.ts               playback stepping
  state/useLatest.ts              ref that always holds the latest value
  state/useTimeState.ts           the single source of truth hook
  components/TimelineStrip.tsx
  components/MapView.tsx
  components/EventPanel.tsx
  components/About.tsx
e2e/timeline.spec.ts, e2e/map.spec.ts, e2e/panel.spec.ts, e2e/about.spec.ts
```

Unit tests live next to their module as `*.test.ts`.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `AGENTS.md`, `CLAUDE.md` (symlink)
- Modify: `.gitignore`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `test`, `test:e2e`, `validate`, `check-links`, `fetch-geo`, `setup`. `src/App.tsx` default export `App`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "the-greatest-history",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20.11" },
  "scripts": {
    "dev": "vite",
    "build": "npm run validate && tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "validate": "tsx scripts/validate-data.ts",
    "check-links": "tsx scripts/check-wikipedia.ts",
    "fetch-geo": "tsx scripts/fetch-borders.ts && tsx scripts/fetch-basemap.ts",
    "setup": "npm install && npm run fetch-geo && npx playwright install chromium"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install react react-dom maplibre-gl zod
npm install -D vite @vitejs/plugin-react typescript vitest @playwright/test tsx @types/react @types/react-dom @types/node @types/geojson
```
Expected: installs without errors; `package.json` now has `dependencies` and `devDependencies`.

- [ ] **Step 3: Write config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    passWithNoTests: true,
  },
});
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Greatest History</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (placeholder, replaced in Task 8):
```tsx
export default function App() {
  return <h1>The Greatest History</h1>;
}
```

`src/styles.css`:
```css
:root {
  --bg: #0b141d;
  --panel: #111c27;
  --panel-raised: #172431;
  --text: #efe6d2;
  --muted: #9aa7b4;
  --accent: #e0b45a;
  --line: #22303e;
  --strip-h: max(160px, 30vh);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--text);
  background: var(--bg);
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

Append to `.gitignore`:
```
public/borders/
public/basemap/
public/glyphs/
test-results/
playwright-report/
```

- [ ] **Step 4: Write `AGENTS.md` and the `CLAUDE.md` symlink**

`AGENTS.md`:
```markdown
# The Greatest History

Interactive world map + timeline of the most influential events from 2000 BC to AD 2000.
Design: `docs/superpowers/specs/2026-10-01-greatest-history-design.md`.

## Commands

- `npm run setup` - install deps, download map assets (borders, base map, fonts), install Playwright's Chromium. Run once after cloning.
- `npm run dev` - dev server.
- `npm test` - unit tests (Vitest).
- `npm run test:e2e` - Playwright smoke tests (builds and previews the site).
- `npm run validate` - validate `data/` (also runs as part of `npm run build`).
- `npm run check-links` - verify every event's Wikipedia URL resolves.
- `npm run build` - validate, typecheck, build to `dist/`.

## Conventions

- Years are signed integers with no year zero (-44 = 44 BC, 1 = AD 1). Use helpers in `src/lib/years.ts` for any arithmetic.
- Event and era content lives in `data/` and is validated by `src/data/schema.ts`. Each event file only holds events whose `year` falls in its millennium.
- Views (`MapView`, `EventPanel`, `TimelineStrip`) read and write state only through `useTimeState`; they never call each other.
- Never use the em dash character anywhere, including content.
- Map assets in `public/borders`, `public/basemap`, `public/glyphs` are generated by `npm run fetch-geo` and are gitignored.
```

Run:
```bash
ln -s AGENTS.md CLAUDE.md
```

- [ ] **Step 5: Verify the scaffold builds and tests run**

Run: `npx tsc --noEmit && npx vite build && npm test`
Expected: typecheck passes, `dist/` is produced, Vitest reports "No test files found" and exits 0.
(Do not run `npm run build` yet: `validate` does not exist until Task 4.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

### Task 2: Year helpers

**Files:**
- Create: `src/lib/years.ts`
- Test: `src/lib/years.test.ts`

**Interfaces:**
- Produces:
  - `MIN_YEAR = -2000`, `MAX_YEAR = 2000`
  - `toAstronomical(year: number): number` (1 BC -> 0, 2 BC -> -1)
  - `fromAstronomical(astro: number): number`
  - `yearDiff(from: number, to: number): number` (signed number of years from `from` to `to`)
  - `addYears(year: number, n: number): number`
  - `clampYear(year: number): number` (rounds, clamps to range, 0 -> 1; caller guarantees finite)
  - `formatYear(year: number): string`
  - `formatSpan(start: number, end: number | null): string`

- [ ] **Step 1: Write the failing tests**

`src/lib/years.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  addYears,
  clampYear,
  formatSpan,
  formatYear,
  fromAstronomical,
  MAX_YEAR,
  MIN_YEAR,
  toAstronomical,
  yearDiff,
} from './years';

describe('formatYear', () => {
  it('formats BC years', () => {
    expect(formatYear(-44)).toBe('44 BC');
    expect(formatYear(-2000)).toBe('2000 BC');
  });
  it('prefixes AD below 1000', () => {
    expect(formatYear(1)).toBe('AD 1');
    expect(formatYear(476)).toBe('AD 476');
    expect(formatYear(999)).toBe('AD 999');
  });
  it('uses a plain number from 1000 on', () => {
    expect(formatYear(1000)).toBe('1000');
    expect(formatYear(1492)).toBe('1492');
  });
});

describe('formatSpan', () => {
  it('returns a single year when there is no end', () => {
    expect(formatSpan(-44, null)).toBe('44 BC');
  });
  it('joins two BC years with one suffix', () => {
    expect(formatSpan(-431, -404)).toBe('431-404 BC');
  });
  it('joins AD years with one prefix', () => {
    expect(formatSpan(618, 907)).toBe('AD 618-907');
    expect(formatSpan(960, 1279)).toBe('AD 960-1279');
    expect(formatSpan(1914, 1918)).toBe('1914-1918');
  });
  it('spells out both eras across the boundary', () => {
    expect(formatSpan(-27, 476)).toBe('27 BC - AD 476');
    expect(formatSpan(-221, 1912)).toBe('221 BC - 1912');
  });
});

describe('astronomical conversion', () => {
  it('maps 1 BC to 0 and back', () => {
    expect(toAstronomical(-1)).toBe(0);
    expect(toAstronomical(1)).toBe(1);
    expect(fromAstronomical(0)).toBe(-1);
  });
  it('round-trips every year in range', () => {
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      if (y === 0) continue;
      expect(fromAstronomical(toAstronomical(y))).toBe(y);
    }
  });
});

describe('yearDiff and addYears', () => {
  it('skip the missing year zero', () => {
    expect(yearDiff(-1, 1)).toBe(1);
    expect(yearDiff(-44, 14)).toBe(57);
    expect(yearDiff(1, -1)).toBe(-1);
    expect(addYears(-1, 1)).toBe(1);
    expect(addYears(1, -1)).toBe(-1);
    expect(addYears(-5, 10)).toBe(6);
  });
});

describe('clampYear', () => {
  it('clamps to the range and replaces zero', () => {
    expect(clampYear(-5000)).toBe(-2000);
    expect(clampYear(3000)).toBe(2000);
    expect(clampYear(0)).toBe(1);
    expect(clampYear(-0.3)).toBe(1);
    expect(clampYear(12.6)).toBe(13);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/years.test.ts`
Expected: FAIL, cannot resolve `./years`.

- [ ] **Step 3: Implement**

`src/lib/years.ts`:
```ts
export const MIN_YEAR = -2000;
export const MAX_YEAR = 2000;

/** Calendar year -> astronomical year (1 BC = 0, 2 BC = -1), which has no gap. */
export function toAstronomical(year: number): number {
  return year < 0 ? year + 1 : year;
}

export function fromAstronomical(astro: number): number {
  return astro <= 0 ? astro - 1 : astro;
}

/** Signed number of years from `from` to `to`, accounting for the missing year zero. */
export function yearDiff(from: number, to: number): number {
  return toAstronomical(to) - toAstronomical(from);
}

export function addYears(year: number, n: number): number {
  return fromAstronomical(toAstronomical(year) + n);
}

export function clampYear(year: number): number {
  const rounded = Math.round(year);
  if (rounded === 0) return 1;
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, rounded));
}

export function formatYear(year: number): string {
  if (year < 0) return `${-year} BC`;
  if (year < 1000) return `AD ${year}`;
  return String(year);
}

export function formatSpan(start: number, end: number | null): string {
  if (end === null) return formatYear(start);
  if (end < 0) return `${-start}-${-end} BC`;
  if (start > 0) return start < 1000 ? `AD ${start}-${end}` : `${start}-${end}`;
  return `${formatYear(start)} - ${formatYear(end)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/years.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/years.ts src/lib/years.test.ts
git commit -m "feat: year formatting and arithmetic without year zero"
```

---

### Task 3: Compressed time scale, view and ticks

**Files:**
- Create: `src/lib/timeScale.ts`
- Test: `src/lib/timeScale.test.ts`

**Interfaces:**
- Consumes: `MIN_YEAR`, `MAX_YEAR`, `toAstronomical`, `fromAstronomical`, `addYears` from `./years`.
- Produces:
  - `SCALE_REF = 2700`, `MAX_ZOOM = 40`
  - `yearToU(year: number): number` (0..1 across the full axis)
  - `uToYear(u: number): number` (nearest valid year, clamped)
  - `interface View { zoom: number; center: number }` (`center` is in u-space)
  - `FULL_VIEW: View = { zoom: 1, center: 0.5 }`
  - `clampView(v: View): View`
  - `visibleURange(v: View): [number, number]`
  - `yearToPx(year: number, v: View, width: number): number`
  - `pxToYear(px: number, v: View, width: number): number`
  - `zoomAt(v: View, factor: number, anchorPx: number, width: number): View`
  - `panBy(v: View, dxPx: number, width: number): View` (positive dx = content moves right = earlier years)
  - `ticks(v: View, width: number, minGapPx?: number): number[]`

- [ ] **Step 1: Write the failing tests**

`src/lib/timeScale.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  clampView,
  FULL_VIEW,
  MAX_ZOOM,
  panBy,
  pxToYear,
  ticks,
  uToYear,
  yearToPx,
  yearToU,
  zoomAt,
  type View,
} from './timeScale';
import { MAX_YEAR, MIN_YEAR } from './years';

describe('yearToU and uToYear', () => {
  it('maps the range ends to 0 and 1', () => {
    expect(yearToU(MIN_YEAR)).toBeCloseTo(0, 12);
    expect(yearToU(MAX_YEAR)).toBeCloseTo(1, 12);
  });
  it('is strictly increasing', () => {
    let prev = -Infinity;
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      if (y === 0) continue;
      const u = yearToU(y);
      expect(u).toBeGreaterThan(prev);
      prev = u;
    }
  });
  it('round-trips every year', () => {
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      if (y === 0) continue;
      expect(uToYear(yearToU(y))).toBe(y);
    }
  });
  it('gives the last 1000 years 40-50% of the axis', () => {
    const share = 1 - yearToU(1000);
    expect(share).toBeGreaterThanOrEqual(0.4);
    expect(share).toBeLessThanOrEqual(0.5);
  });
  it('clamps positions outside 0..1', () => {
    expect(uToYear(-0.5)).toBe(MIN_YEAR);
    expect(uToYear(2)).toBe(MAX_YEAR);
  });
});

describe('views', () => {
  it('clampView keeps zoom in 1..MAX_ZOOM and the window inside the axis', () => {
    expect(clampView({ zoom: 0.2, center: 0.9 })).toEqual({ zoom: 1, center: 0.5 });
    expect(clampView({ zoom: 1000, center: 0.5 }).zoom).toBe(MAX_ZOOM);
    expect(clampView({ zoom: 4, center: 0.99 }).center).toBeCloseTo(0.875);
  });
  it('yearToPx and pxToYear are inverses on a zoomed view', () => {
    const v = clampView({ zoom: 5, center: yearToU(-44) });
    const px = yearToPx(-44, v, 1000);
    expect(px).toBeCloseTo(500);
    expect(pxToYear(px, v, 1000)).toBe(-44);
  });
  it('zoomAt keeps the year under the cursor fixed', () => {
    const px = yearToPx(1066, FULL_VIEW, 1000);
    const zoomed = zoomAt(FULL_VIEW, 3, px, 1000);
    expect(zoomed.zoom).toBe(3);
    expect(yearToPx(1066, zoomed, 1000)).toBeCloseTo(px, 6);
  });
  it('zoomAt cannot go beyond the zoom limits', () => {
    const max: View = { zoom: MAX_ZOOM, center: 0.5 };
    const v = zoomAt(max, 2, 500, 1000);
    expect(v.zoom).toBe(MAX_ZOOM);
    expect(v.center).toBeCloseTo(0.5, 9);
    expect(zoomAt(FULL_VIEW, 0.1, 300, 1000)).toEqual(FULL_VIEW);
  });
  it('panBy moves toward earlier years when dragging right and stops at the edges', () => {
    const v = clampView({ zoom: 2, center: 0.5 });
    expect(panBy(v, 100, 1000).center).toBeLessThan(0.5);
    expect(panBy(FULL_VIEW, 500, 1000)).toEqual(FULL_VIEW);
  });
});

describe('ticks', () => {
  const cases: [string, View][] = [
    ['full view', FULL_VIEW],
    ['zoomed on Rome', clampView({ zoom: 12, center: yearToU(-44) })],
    ['zoomed on the 1900s', clampView({ zoom: 30, center: yearToU(1950) })],
  ];
  for (const [name, view] of cases) {
    it(`are increasing, spaced, inside the view and never year 0 (${name})`, () => {
      const width = 1200;
      const minGap = 70;
      const t = ticks(view, width, minGap);
      expect(t.length).toBeGreaterThan(3);
      const first = pxToYear(0, view, width);
      const last = pxToYear(width, view, width);
      t.forEach((year, i) => {
        expect(year).not.toBe(0);
        expect(year).toBeGreaterThanOrEqual(first);
        expect(year).toBeLessThanOrEqual(last);
        if (i > 0) {
          expect(year).toBeGreaterThan(t[i - 1]);
          expect(yearToPx(year, view, width) - yearToPx(t[i - 1], view, width)).toBeGreaterThanOrEqual(minGap);
        }
      });
    });
  }
  it('start at 2000 BC and use round centuries on the full view', () => {
    const t = ticks(FULL_VIEW, 1200, 70);
    expect(t[0]).toBe(-2000);
    for (const year of t) expect(year % 100 === 0 || year === 1).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/timeScale.test.ts`
Expected: FAIL, cannot resolve `./timeScale`.

- [ ] **Step 3: Implement**

`src/lib/timeScale.ts`:
```ts
import { addYears, fromAstronomical, MAX_YEAR, MIN_YEAR, toAstronomical } from './years';

/**
 * Reference point after the end of the range. The axis position is -ln(SCALE_REF - year),
 * so recent centuries get more width. 2700 gives the last 1000 years about 47% of the axis.
 */
export const SCALE_REF = 2700;
export const MAX_ZOOM = 40;

const curve = (astro: number) => -Math.log(SCALE_REF - astro);
const C_MIN = curve(toAstronomical(MIN_YEAR));
const C_MAX = curve(toAstronomical(MAX_YEAR));

export function yearToU(year: number): number {
  return (curve(toAstronomical(year)) - C_MIN) / (C_MAX - C_MIN);
}

export function uToYear(u: number): number {
  const c = C_MIN + u * (C_MAX - C_MIN);
  const year = fromAstronomical(Math.round(SCALE_REF - Math.exp(-c)));
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
}

export interface View {
  zoom: number;
  /** Center of the visible window, in 0..1 axis units. */
  center: number;
}

export const FULL_VIEW: View = { zoom: 1, center: 0.5 };

export function clampView(v: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
  const half = 0.5 / zoom;
  const center = Math.min(1 - half, Math.max(half, v.center));
  return { zoom, center };
}

export function visibleURange(v: View): [number, number] {
  const half = 0.5 / v.zoom;
  return [v.center - half, v.center + half];
}

export function yearToPx(year: number, v: View, width: number): number {
  const [u0] = visibleURange(v);
  return (yearToU(year) - u0) * v.zoom * width;
}

export function pxToYear(px: number, v: View, width: number): number {
  const [u0] = visibleURange(v);
  return uToYear(u0 + px / (v.zoom * width));
}

export function zoomAt(v: View, factor: number, anchorPx: number, width: number): View {
  const [u0] = visibleURange(v);
  const anchorU = u0 + anchorPx / (v.zoom * width);
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom * factor));
  const newU0 = anchorU - anchorPx / (zoom * width);
  return clampView({ zoom, center: newU0 + 0.5 / zoom });
}

export function panBy(v: View, dxPx: number, width: number): View {
  return clampView({ zoom: v.zoom, center: v.center - dxPx / (v.zoom * width) });
}

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

/** Smallest multiple of `step` strictly after `year`; year 0 does not exist, so it becomes AD 1. */
function nextMultiple(year: number, step: number): number {
  const m = Math.floor(year / step) * step + step;
  return m === 0 ? 1 : m;
}

/**
 * Tick years for the visible window. The step adapts to the local density of the
 * compressed axis, so ticks stay at least `minGapPx` apart everywhere.
 */
export function ticks(v: View, width: number, minGapPx = 72): number[] {
  const px = (year: number) => yearToPx(year, v, width);
  const first = pxToYear(0, v, width);
  const last = pxToYear(width, v, width);
  const firstStep = NICE_STEPS.find((s) => px(addYears(first, s)) - px(first) >= minGapPx) ?? 1000;
  const out: number[] = [];
  let t = first % firstStep === 0 ? first : nextMultiple(first, firstStep);
  while (t <= last) {
    out.push(t);
    const tPx = px(t);
    const next = NICE_STEPS.map((s) => nextMultiple(t, s)).find((c) => px(c) - tPx >= minGapPx);
    if (next === undefined) break;
    t = next;
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/timeScale.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timeScale.ts src/lib/timeScale.test.ts
git commit -m "feat: compressed time scale with zoom, pan and adaptive ticks"
```

---

### Task 4: Data schema, validation, loader and seed content

**Files:**
- Create: `src/data/schema.ts`, `src/data/validate.ts`, `src/data/index.ts`, `scripts/loadDataFiles.ts`, `scripts/validate-data.ts`
- Create: `data/events/2000bc-1001bc.json`, `data/events/1000bc-1bc.json`, `data/events/ad1-ad1000.json`, `data/events/ad1001-ad2000.json`, `data/eras.json`
- Test: `src/data/validate.test.ts`

**Interfaces:**
- Consumes: `MIN_YEAR`, `MAX_YEAR` from `src/lib/years.ts`.
- Produces:
  - `REGIONS`, `CATEGORIES` (readonly tuples), types `Region`, `Category`, `HistoryEvent`, `Era`
  - `eventSchema`, `eraSchema`
  - `EVENT_FILES: Record<string, [number, number]>` (file name -> inclusive year range)
  - `interface DataFile { file: string; records: unknown }`
  - `validateData(eventFiles: DataFile[], erasFile: DataFile): string[]` (empty array = valid)
  - `loadDataFiles(): { eventFiles: DataFile[]; erasFile: DataFile }` (in `scripts/loadDataFiles.ts`)
  - `EVENTS: HistoryEvent[]`, `ERAS: Era[]`, `EVENTS_BY_ID: Map<string, HistoryEvent>` (in `src/data/index.ts`)

- [ ] **Step 1: Write the failing tests**

`src/data/validate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadDataFiles } from '../../scripts/loadDataFiles';
import { validateData, type DataFile } from './validate';

const goodEvent = {
  id: 'caesar-assassination',
  title: 'Julius Caesar assassinated',
  year: -44,
  endYear: null,
  dateLabel: '15 March 44 BC',
  region: 'europe',
  category: 'politics',
  location: { name: 'Rome', lat: 41.9, lng: 12.48 },
  importance: 3,
  summary: 'Summary.',
  significance: 'Significance.',
  wikipedia: 'https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar',
};
const goodEra = { id: 'han', name: 'Han dynasty', start: -206, end: 220, region: 'east-asia' };

const events = (file: string, ...records: unknown[]): DataFile => ({ file: `events/${file}`, records });
const eras = (...records: unknown[]): DataFile => ({ file: 'eras.json', records });

describe('validateData', () => {
  it('accepts valid data', () => {
    expect(validateData([events('1000bc-1bc.json', goodEvent)], eras(goodEra))).toEqual([]);
  });

  it('rejects year 0 with a clear message', () => {
    const errors = validateData([events('ad1-ad1000.json', { ...goodEvent, year: 0 })], eras());
    expect(errors.join('\n')).toMatch(/caesar-assassination year: year 0 does not exist/);
  });

  it('rejects endYear before year', () => {
    const errors = validateData([events('1000bc-1bc.json', { ...goodEvent, endYear: -50 })], eras());
    expect(errors.join('\n')).toMatch(/endYear/);
  });

  it('rejects unknown regions and extra fields', () => {
    const errors = validateData(
      [events('1000bc-1bc.json', { ...goodEvent, region: 'atlantis', colour: 'red' })],
      eras(),
    );
    expect(errors.some((e) => e.includes('region'))).toBe(true);
    expect(errors.some((e) => e.includes('colour'))).toBe(true);
  });

  it('rejects duplicate event ids across files', () => {
    const errors = validateData(
      [events('1000bc-1bc.json', goodEvent), events('ad1-ad1000.json', { ...goodEvent, year: 14 })],
      eras(),
    );
    expect(errors.join('\n')).toMatch(/duplicate id "caesar-assassination"/);
  });

  it('rejects an event stored in the wrong millennium file', () => {
    const errors = validateData([events('ad1-ad1000.json', goodEvent)], eras());
    expect(errors.join('\n')).toMatch(/belongs in a file covering/);
  });

  it('rejects unknown file names and non-array files', () => {
    const errors = validateData([events('misc.json', goodEvent)], { file: 'eras.json', records: {} });
    expect(errors.join('\n')).toMatch(/events\/misc.json: unknown events file/);
    expect(errors.join('\n')).toMatch(/eras.json: expected an array/);
  });

  it('rejects eras that end before they start and duplicate era ids', () => {
    const errors = validateData([], eras({ ...goodEra, id: 'bad', end: -300 }, goodEra, goodEra));
    expect(errors.join('\n')).toMatch(/bad end/);
    expect(errors.join('\n')).toMatch(/duplicate id "han"/);
  });

  it('passes on the real data in data/', () => {
    const { eventFiles, erasFile } = loadDataFiles();
    expect(validateData(eventFiles, erasFile)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/validate.test.ts`
Expected: FAIL, cannot resolve `../../scripts/loadDataFiles`.

- [ ] **Step 3: Implement schema, validation and loaders**

`src/data/schema.ts`:
```ts
import { z } from 'zod';
import { MAX_YEAR, MIN_YEAR } from '../lib/years';

export const REGIONS = [
  'europe',
  'mena',
  'sub-saharan-africa',
  'central-asia',
  'south-asia',
  'east-asia',
  'southeast-asia-oceania',
  'americas',
] as const;
export type Region = (typeof REGIONS)[number];

export const CATEGORIES = ['politics', 'religion', 'science', 'culture', 'trade'] as const;
export type Category = (typeof CATEGORIES)[number];

const year = z
  .number()
  .int()
  .min(MIN_YEAR)
  .max(MAX_YEAR)
  .refine((y) => y !== 0, 'year 0 does not exist (1 BC is followed by AD 1)');

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lowercase kebab-case');

export const eventSchema = z
  .strictObject({
    id,
    title: z.string().min(1),
    year,
    endYear: year.nullable(),
    dateLabel: z.string().min(1).optional(),
    region: z.enum(REGIONS),
    category: z.enum(CATEGORIES),
    location: z.strictObject({
      name: z.string().min(1),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    importance: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    summary: z.string().min(1),
    significance: z.string().min(1),
    wikipedia: z.string().regex(/^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/, 'must be an en.wikipedia.org article URL'),
  })
  .refine((e) => e.endYear === null || e.endYear > e.year, {
    message: 'endYear must be after year',
    path: ['endYear'],
  });
export type HistoryEvent = z.infer<typeof eventSchema>;

export const eraSchema = z
  .strictObject({
    id,
    name: z.string().min(1),
    start: year,
    end: year,
    region: z.enum(REGIONS),
  })
  .refine((e) => e.end > e.start, { message: 'end must be after start', path: ['end'] });
export type Era = z.infer<typeof eraSchema>;

/** Each events file only holds events whose `year` is inside its range (inclusive). */
export const EVENT_FILES: Record<string, [number, number]> = {
  '2000bc-1001bc.json': [-2000, -1001],
  '1000bc-1bc.json': [-1000, -1],
  'ad1-ad1000.json': [1, 1000],
  'ad1001-ad2000.json': [1001, 2000],
};
```

`src/data/validate.ts`:
```ts
import type { z } from 'zod';
import { formatYear } from '../lib/years';
import { eraSchema, EVENT_FILES, eventSchema } from './schema';

export interface DataFile {
  file: string;
  records: unknown;
}

function recordId(record: unknown, index: number): string {
  const id = (record as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : `#${index}`;
}

function checkFile(
  df: DataFile,
  schema: z.ZodType<{ id: string }>,
  seen: Map<string, string>,
  errors: string[],
  extra?: (record: { id: string }) => string | null,
): void {
  if (!Array.isArray(df.records)) {
    errors.push(`${df.file}: expected an array of records`);
    return;
  }
  df.records.forEach((record, i) => {
    const label = `${df.file} ${recordId(record, i)}`;
    const result = schema.safeParse(record);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join('.') || '(record)';
        const keys = 'keys' in issue && Array.isArray(issue.keys) ? ` (${issue.keys.join(', ')})` : '';
        errors.push(`${label} ${path}: ${issue.message}${keys}`);
      }
      return;
    }
    const previous = seen.get(result.data.id);
    if (previous) errors.push(`${label}: duplicate id "${result.data.id}" (also in ${previous})`);
    else seen.set(result.data.id, df.file);
    const problem = extra?.(result.data);
    if (problem) errors.push(`${label}: ${problem}`);
  });
}

export function validateData(eventFiles: DataFile[], erasFile: DataFile): string[] {
  const errors: string[] = [];
  const eventIds = new Map<string, string>();
  for (const df of eventFiles) {
    const name = df.file.replace(/^events\//, '');
    const range = EVENT_FILES[name];
    if (!range) {
      errors.push(`${df.file}: unknown events file; use one of ${Object.keys(EVENT_FILES).join(', ')}`);
      continue;
    }
    checkFile(df, eventSchema, eventIds, errors, (record) => {
      const { year } = record as { year: number };
      if (year >= range[0] && year <= range[1]) return null;
      const home = Object.entries(EVENT_FILES).find(([, [lo, hi]]) => year >= lo && year <= hi)?.[0];
      return `year ${formatYear(year)} belongs in a file covering it (${home ?? 'none'})`;
    });
  }
  checkFile(erasFile, eraSchema, new Map(), errors);
  return errors;
}
```

`scripts/loadDataFiles.ts`:
```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataFile } from '../src/data/validate';

const DATA_DIR = join(import.meta.dirname, '..', 'data');

function readJson(relative: string): DataFile {
  const text = readFileSync(join(DATA_DIR, relative), 'utf8');
  try {
    return { file: relative, records: JSON.parse(text) };
  } catch (err) {
    throw new Error(`data/${relative}: invalid JSON: ${(err as Error).message}`);
  }
}

export function loadDataFiles(): { eventFiles: DataFile[]; erasFile: DataFile } {
  const eventFiles = readdirSync(join(DATA_DIR, 'events'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(`events/${f}`));
  return { eventFiles, erasFile: readJson('eras.json') };
}
```

`scripts/validate-data.ts`:
```ts
import { validateData } from '../src/data/validate';
import { loadDataFiles } from './loadDataFiles';

const { eventFiles, erasFile } = loadDataFiles();
const errors = validateData(eventFiles, erasFile);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) in data/`);
  process.exit(1);
}
const eventCount = eventFiles.reduce((n, f) => n + (f.records as unknown[]).length, 0);
console.log(`data OK: ${eventCount} events, ${(erasFile.records as unknown[]).length} eras`);
```

`src/data/index.ts`:
```ts
import erasJson from '../../data/eras.json';
import type { Era, HistoryEvent } from './schema';

// Data is validated at build time (npm run validate), so the casts here are safe.
const eventModules = import.meta.glob<HistoryEvent[]>('../../data/events/*.json', {
  eager: true,
  import: 'default',
});

export const EVENTS: HistoryEvent[] = Object.values(eventModules).flat();
export const ERAS = erasJson as Era[];
export const EVENTS_BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
```

- [ ] **Step 4: Write seed content**

These are real, final records that stay in the dataset. Content tasks 12-15 add the rest.

`data/events/2000bc-1001bc.json`:
```json
[
  {
    "id": "code-of-hammurabi",
    "title": "Code of Hammurabi",
    "year": -1754,
    "endYear": null,
    "dateLabel": "c. 1754 BC",
    "region": "mena",
    "category": "politics",
    "location": { "name": "Babylon", "lat": 32.54, "lng": 44.42 },
    "importance": 3,
    "summary": "King Hammurabi of Babylon has 282 laws carved on stone pillars set up across his kingdom. The laws cover trade, property, family and crime, with punishments that often depend on the social rank of the people involved.",
    "significance": "One of the earliest and most complete written law codes, it established the idea that a ruler publishes fixed laws that apply across a whole state.",
    "wikipedia": "https://en.wikipedia.org/wiki/Code_of_Hammurabi"
  },
  {
    "id": "shang-dynasty-founded",
    "title": "Shang dynasty founded",
    "year": -1600,
    "endYear": null,
    "dateLabel": "c. 1600 BC",
    "region": "east-asia",
    "category": "politics",
    "location": { "name": "Zhengzhou", "lat": 34.75, "lng": 113.65 },
    "importance": 3,
    "summary": "According to tradition, Tang of Shang overthrows the last Xia king and founds a dynasty that rules the Yellow River valley for about 500 years. The Shang build walled cities, cast elaborate bronze vessels and consult their ancestors with oracle bones.",
    "significance": "The Shang is the earliest Chinese dynasty confirmed by archaeology and its own writing, and that script is the direct ancestor of modern Chinese characters.",
    "wikipedia": "https://en.wikipedia.org/wiki/Shang_dynasty"
  }
]
```

`data/events/1000bc-1bc.json`:
```json
[
  {
    "id": "qin-unifies-china",
    "title": "Qin unifies China",
    "year": -221,
    "endYear": null,
    "region": "east-asia",
    "category": "politics",
    "location": { "name": "Xianyang", "lat": 34.33, "lng": 108.71 },
    "importance": 3,
    "summary": "King Ying Zheng of Qin conquers the last of the rival Warring States and takes the title Qin Shi Huang, the First Emperor. His government standardizes writing, coins, weights, measures and even cart axle widths across the empire.",
    "significance": "It created the first unified Chinese empire and the model of a centralized imperial state that lasted, through many dynasties, until 1912.",
    "wikipedia": "https://en.wikipedia.org/wiki/Qin%27s_wars_of_unification"
  },
  {
    "id": "caesar-assassination",
    "title": "Julius Caesar assassinated",
    "year": -44,
    "endYear": null,
    "dateLabel": "15 March 44 BC",
    "region": "europe",
    "category": "politics",
    "location": { "name": "Rome", "lat": 41.8955, "lng": 12.4769 },
    "importance": 3,
    "summary": "On the Ides of March, a group of Roman senators led by Brutus and Cassius stab Julius Caesar to death at a meeting of the Senate. They claim to be saving the Republic from a man who had just been named dictator for life.",
    "significance": "Instead of restoring the Republic, the murder sets off new civil wars that end with Caesar's heir Octavian becoming Rome's first emperor.",
    "wikipedia": "https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar"
  }
]
```

`data/events/ad1-ad1000.json`:
```json
[
  {
    "id": "fall-of-western-roman-empire",
    "title": "Fall of the Western Roman Empire",
    "year": 476,
    "endYear": null,
    "region": "europe",
    "category": "politics",
    "location": { "name": "Ravenna", "lat": 44.42, "lng": 12.2 },
    "importance": 3,
    "summary": "The Germanic general Odoacer deposes Romulus Augustulus, the last Western Roman emperor, and rules Italy as king without naming a new emperor. By then the Western Empire had already lost most of its provinces to Germanic kingdoms.",
    "significance": "The date is the traditional end of the ancient world in Western Europe, while the Eastern Roman (Byzantine) Empire carries on for nearly another thousand years.",
    "wikipedia": "https://en.wikipedia.org/wiki/Fall_of_the_Western_Roman_Empire"
  },
  {
    "id": "tang-dynasty-founded",
    "title": "Tang dynasty founded",
    "year": 618,
    "endYear": null,
    "region": "east-asia",
    "category": "politics",
    "location": { "name": "Chang'an", "lat": 34.27, "lng": 108.95 },
    "importance": 3,
    "summary": "Li Yuan, a general of the collapsing Sui dynasty, seizes power and founds the Tang with its capital at Chang'an. The city grows into one of the largest and most cosmopolitan in the world, at the eastern end of the Silk Road.",
    "significance": "The Tang is remembered as a golden age of Chinese poetry, art and trade, and its culture and institutions shaped Korea, Japan and Vietnam.",
    "wikipedia": "https://en.wikipedia.org/wiki/Tang_dynasty"
  }
]
```

`data/events/ad1001-ad2000.json`:
```json
[
  {
    "id": "gutenberg-printing-press",
    "title": "Gutenberg's printing press",
    "year": 1440,
    "endYear": null,
    "dateLabel": "c. 1440",
    "region": "europe",
    "category": "science",
    "location": { "name": "Mainz", "lat": 50.0, "lng": 8.27 },
    "importance": 3,
    "summary": "Johannes Gutenberg develops a printing press that combines movable metal type, oil-based ink and a screw press. His Bible, finished around 1455, is the first major book printed this way in Europe.",
    "significance": "Cheap printed books spread literacy and new ideas across Europe, helping drive the Reformation, the Scientific Revolution and the Enlightenment.",
    "wikipedia": "https://en.wikipedia.org/wiki/Printing_press"
  },
  {
    "id": "apollo-11-moon-landing",
    "title": "Apollo 11 Moon landing",
    "year": 1969,
    "endYear": null,
    "dateLabel": "20 July 1969",
    "region": "americas",
    "category": "science",
    "location": { "name": "Kennedy Space Center", "lat": 28.57, "lng": -80.65 },
    "importance": 3,
    "summary": "NASA's Apollo 11 mission lands Neil Armstrong and Buzz Aldrin on the Moon while Michael Collins orbits above. The two astronauts spend about two and a half hours walking on the lunar surface before returning safely to Earth.",
    "significance": "It was the first time humans set foot on another world, and the high point of the Cold War space race between the United States and the Soviet Union.",
    "wikipedia": "https://en.wikipedia.org/wiki/Apollo_11"
  }
]
```

`data/eras.json`:
```json
[
  { "id": "old-babylonian-period", "name": "Old Babylonian period", "start": -1894, "end": -1595, "region": "mena" },
  { "id": "shang", "name": "Shang dynasty", "start": -1600, "end": -1046, "region": "east-asia" },
  { "id": "roman-republic", "name": "Roman Republic", "start": -509, "end": -27, "region": "europe" },
  { "id": "han", "name": "Han dynasty", "start": -206, "end": 220, "region": "east-asia" },
  { "id": "roman-empire", "name": "Roman Empire", "start": -27, "end": 476, "region": "europe" },
  { "id": "tang", "name": "Tang dynasty", "start": 618, "end": 907, "region": "east-asia" }
]
```

- [ ] **Step 5: Run tests and the validator**

Run: `npx vitest run src/data/validate.test.ts && npm run validate`
Expected: tests PASS; validator prints `data OK: 8 events, 6 eras`.

- [ ] **Step 6: Commit**

```bash
git add src/data scripts/loadDataFiles.ts scripts/validate-data.ts data
git commit -m "feat: data schema, build-time validation and seed content"
```

---

### Task 5: Event selection

**Files:**
- Create: `src/lib/selectEvents.ts`
- Test: `src/lib/selectEvents.test.ts`

**Interfaces:**
- Consumes: `HistoryEvent`, `Region`, `REGIONS` from `src/data/schema.ts`; `yearDiff` from `./years`.
- Produces:
  - `MIN_HALF_WINDOW = 10`, `MAX_HALF_WINDOW = 100`, `ALL_PINS_MAX_HALF_WINDOW = 50`
  - `windowHalfWidth(zoom: number): number`
  - `distanceFromYear(event: HistoryEvent, year: number): number` (0 when inside the event's span)
  - `eventsInWindow(events: HistoryEvent[], year: number, halfWidth: number): HistoryEvent[]`
  - `interface RegionGroup { region: Region; events: HistoryEvent[] }`
  - `groupByRegion(events: HistoryEvent[], year: number): RegionGroup[]` (fixed region order, empty regions skipped, sorted by importance desc, distance asc, id asc; uncapped)
  - `pinnedEvents(events: HistoryEvent[], halfWidth: number): HistoryEvent[]`

- [ ] **Step 1: Write the failing tests**

`src/lib/selectEvents.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { HistoryEvent } from '../data/schema';
import {
  distanceFromYear,
  eventsInWindow,
  groupByRegion,
  pinnedEvents,
  windowHalfWidth,
} from './selectEvents';

const ev = (id: string, year: number, extra: Partial<HistoryEvent> = {}): HistoryEvent => ({
  id,
  title: id,
  year,
  endYear: null,
  region: 'europe',
  category: 'politics',
  location: { name: 'X', lat: 0, lng: 0 },
  importance: 2,
  summary: 's',
  significance: 's',
  wikipedia: 'https://en.wikipedia.org/wiki/X',
  ...extra,
});

describe('windowHalfWidth', () => {
  it('is 100 years zoomed out and shrinks with zoom down to 10', () => {
    expect(windowHalfWidth(1)).toBe(100);
    expect(windowHalfWidth(2)).toBe(50);
    expect(windowHalfWidth(4)).toBe(25);
    expect(windowHalfWidth(10)).toBe(10);
    expect(windowHalfWidth(40)).toBe(10);
  });
});

describe('eventsInWindow', () => {
  it('includes events exactly at the window edge and excludes ones just beyond', () => {
    const ids = eventsInWindow([ev('in', -144), ev('out', -145), ev('right', 57)], -44, 100).map((e) => e.id);
    expect(ids).toEqual(['in', 'right']);
  });
  it('counts across 1 BC / AD 1 without a year zero', () => {
    const ids = eventsInWindow([ev('ten-before', -10), ev('eleven-before', -11)], 1, 10).map((e) => e.id);
    expect(ids).toEqual(['ten-before']);
  });
  it('includes long-running events when the year is inside their span', () => {
    const han = ev('han', -206, { endYear: 220 });
    expect(distanceFromYear(han, 1)).toBe(0);
    expect(eventsInWindow([han], 1, 10)).toEqual([han]);
    expect(eventsInWindow([han], 300, 10)).toEqual([]);
    expect(eventsInWindow([han], 230, 10)).toEqual([han]);
  });
});

describe('groupByRegion', () => {
  it('uses the fixed region order and skips empty regions', () => {
    const groups = groupByRegion(
      [ev('a', 1, { region: 'americas' }), ev('b', 1, { region: 'europe' }), ev('c', 1, { region: 'east-asia' })],
      1,
    );
    expect(groups.map((g) => g.region)).toEqual(['europe', 'east-asia', 'americas']);
  });
  it('sorts by importance, then closeness to the year, then id', () => {
    const groups = groupByRegion(
      [
        ev('far-major', -80, { importance: 2 }),
        ev('near-major', -40, { importance: 2 }),
        ev('world-changing', -90, { importance: 3 }),
        ev('b-tie', -50, { importance: 1 }),
        ev('a-tie', -38, { importance: 1 }),
      ],
      -44,
    );
    expect(groups[0].events.map((e) => e.id)).toEqual([
      'world-changing',
      'near-major',
      'far-major',
      'a-tie',
      'b-tie',
    ]);
  });
});

describe('pinnedEvents', () => {
  const events = [ev('minor', 1, { importance: 1 }), ev('major', 1, { importance: 2 })];
  it('drops importance-1 pins when the window is wide', () => {
    expect(pinnedEvents(events, 100).map((e) => e.id)).toEqual(['major']);
  });
  it('keeps every pin when the window is 50 years or narrower', () => {
    expect(pinnedEvents(events, 50).map((e) => e.id)).toEqual(['minor', 'major']);
  });
});
```

Note on the tie case: `a-tie` (-38) is 6 years from -44 and `b-tie` (-50) is 6 years too, so equal distance falls back to id order.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/selectEvents.test.ts`
Expected: FAIL, cannot resolve `./selectEvents`.

- [ ] **Step 3: Implement**

`src/lib/selectEvents.ts`:
```ts
import { REGIONS, type HistoryEvent, type Region } from '../data/schema';
import { yearDiff } from './years';

export const MIN_HALF_WINDOW = 10;
export const MAX_HALF_WINDOW = 100;
/** Above this half-width, only importance 2-3 events get pins on the map. */
export const ALL_PINS_MAX_HALF_WINDOW = 50;

export function windowHalfWidth(zoom: number): number {
  return Math.max(MIN_HALF_WINDOW, Math.round(MAX_HALF_WINDOW / zoom));
}

export function distanceFromYear(event: HistoryEvent, year: number): number {
  const end = event.endYear ?? event.year;
  if (year < event.year) return yearDiff(year, event.year);
  if (year > end) return yearDiff(end, year);
  return 0;
}

export function eventsInWindow(events: HistoryEvent[], year: number, halfWidth: number): HistoryEvent[] {
  return events.filter((e) => distanceFromYear(e, year) <= halfWidth);
}

export interface RegionGroup {
  region: Region;
  events: HistoryEvent[];
}

export function groupByRegion(events: HistoryEvent[], year: number): RegionGroup[] {
  return REGIONS.flatMap((region) => {
    const inRegion = events
      .filter((e) => e.region === region)
      .sort(
        (a, b) =>
          b.importance - a.importance ||
          distanceFromYear(a, year) - distanceFromYear(b, year) ||
          a.id.localeCompare(b.id),
      );
    return inRegion.length > 0 ? [{ region, events: inRegion }] : [];
  });
}

export function pinnedEvents(events: HistoryEvent[], halfWidth: number): HistoryEvent[] {
  if (halfWidth <= ALL_PINS_MAX_HALF_WINDOW) return events;
  return events.filter((e) => e.importance >= 2);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/selectEvents.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/selectEvents.ts src/lib/selectEvents.test.ts
git commit -m "feat: select, group and pin events around a year"
```

---

### Task 6: Borders logic and map asset scripts

**Files:**
- Create: `src/lib/borders.ts`, `scripts/fetch-borders.ts`, `scripts/fetch-basemap.ts`
- Test: `src/lib/borders.test.ts`

**Interfaces:**
- Consumes: `MIN_YEAR`, `MAX_YEAR` from `src/lib/years.ts`.
- Produces:
  - `interface Snapshot { year: number; file: string }`
  - `snapshotFor(index: Snapshot[], year: number): Snapshot | null` (index sorted ascending)
  - `neighborSnapshots(index: Snapshot[], year: number): Snapshot[]` (the snapshots just before and after the current one)
  - `POLITY_PALETTE: readonly string[]`
  - `polityKey(props: { NAME: string | null; SUBJECTO: string | null }): string`
  - `polityColor(key: string): string`
  - `createLatestLoader<T>(fetcher: (key: string) => Promise<T>): { load(key: string): Promise<T | null>; invalidate(): void; prefetch(key: string): void }`
  - Files on disk after `npm run fetch-geo`: `public/borders/index.json` (`Snapshot[]`), `public/borders/<file>.geojson` (features with properties `NAME`, `SUBJECTO`, `BORDERPRECISION`, `COLOR`), `public/borders/LICENSE.txt`, `public/basemap/{land,lakes,rivers}.geojson`, `public/glyphs/Open Sans Italic/<range>.pbf`

- [ ] **Step 1: Write the failing tests**

`src/lib/borders.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import {
  createLatestLoader,
  neighborSnapshots,
  POLITY_PALETTE,
  polityColor,
  polityKey,
  snapshotFor,
  type Snapshot,
} from './borders';

const index: Snapshot[] = [
  { year: -2000, file: 'a.geojson' },
  { year: -1500, file: 'b.geojson' },
  { year: -1, file: 'c.geojson' },
  { year: 100, file: 'd.geojson' },
];

describe('snapshotFor', () => {
  it('returns the latest snapshot at or before the year', () => {
    expect(snapshotFor(index, -2000)?.file).toBe('a.geojson');
    expect(snapshotFor(index, -1600)?.file).toBe('a.geojson');
    expect(snapshotFor(index, -1500)?.file).toBe('b.geojson');
    expect(snapshotFor(index, 50)?.file).toBe('c.geojson');
    expect(snapshotFor(index, 2000)?.file).toBe('d.geojson');
  });
  it('returns null before the first snapshot or with no index', () => {
    expect(snapshotFor(index, -2500)).toBeNull();
    expect(snapshotFor([], 100)).toBeNull();
  });
});

describe('neighborSnapshots', () => {
  it('returns the snapshots on either side of the current one', () => {
    expect(neighborSnapshots(index, -1600).map((s) => s.file)).toEqual(['b.geojson']);
    expect(neighborSnapshots(index, 50).map((s) => s.file)).toEqual(['b.geojson', 'd.geojson']);
    expect(neighborSnapshots(index, 2000).map((s) => s.file)).toEqual(['c.geojson']);
  });
});

describe('polity colors', () => {
  it('prefers the overlord (SUBJECTO) so colonies share the empire color', () => {
    expect(polityKey({ NAME: 'British India', SUBJECTO: 'United Kingdom' })).toBe('United Kingdom');
    expect(polityKey({ NAME: 'Roman Empire', SUBJECTO: null })).toBe('Roman Empire');
  });
  it('is stable and always from the palette', () => {
    for (const name of ['Roman Empire', 'Han Empire', 'Maurya Empire', '']) {
      expect(polityColor(name)).toBe(polityColor(name));
      expect(POLITY_PALETTE).toContain(polityColor(name));
    }
  });
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createLatestLoader', () => {
  it('superseded loads resolve to null, even if they finish last', async () => {
    const pending = { x: deferred<string>(), y: deferred<string>() };
    const loader = createLatestLoader((key) => pending[key as 'x' | 'y'].promise);
    const first = loader.load('x');
    const second = loader.load('y');
    pending.y.resolve('Y');
    pending.x.resolve('X');
    expect(await second).toBe('Y');
    expect(await first).toBeNull();
  });

  it('invalidate drops pending loads', async () => {
    const d = deferred<string>();
    const loader = createLatestLoader(() => d.promise);
    const load = loader.load('x');
    loader.invalidate();
    d.resolve('X');
    expect(await load).toBeNull();
  });

  it('fetches each key once and retries after a failure', async () => {
    const fetcher = vi.fn<(key: string) => Promise<string>>();
    fetcher.mockRejectedValueOnce(new Error('offline')).mockResolvedValue('ok');
    const loader = createLatestLoader(fetcher);
    await expect(loader.load('x')).rejects.toThrow('offline');
    expect(await loader.load('x')).toBe('ok');
    expect(await loader.load('x')).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('a superseded failure resolves to null instead of throwing', async () => {
    const d = deferred<string>();
    const loader = createLatestLoader((key) => (key === 'x' ? d.promise : Promise.resolve('Y')));
    const first = loader.load('x');
    await loader.load('y');
    d.reject(new Error('late failure'));
    expect(await first).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/borders.test.ts`
Expected: FAIL, cannot resolve `./borders`.

- [ ] **Step 3: Implement `src/lib/borders.ts`**

```ts
export interface Snapshot {
  year: number;
  file: string;
}

export function snapshotFor(index: Snapshot[], year: number): Snapshot | null {
  let found: Snapshot | null = null;
  for (const s of index) {
    if (s.year > year) break;
    found = s;
  }
  return found;
}

export function neighborSnapshots(index: Snapshot[], year: number): Snapshot[] {
  const current = snapshotFor(index, year);
  const i = current ? index.indexOf(current) : -1;
  return [index[i - 1], index[i + 1]].filter((s): s is Snapshot => s !== undefined);
}

/** Muted colors that read well at ~50% opacity on the dark base map. */
export const POLITY_PALETTE = [
  '#c96f5b',
  '#d6a35b',
  '#b9b65a',
  '#7fae6b',
  '#5ea79a',
  '#5c8fc0',
  '#7f78c7',
  '#b06fae',
  '#c8758f',
  '#9c8a6e',
  '#6f9a7d',
  '#a3865c',
] as const;

export function polityKey(props: { NAME: string | null; SUBJECTO: string | null }): string {
  return props.SUBJECTO || props.NAME || '';
}

/** FNV-1a hash into the palette, so a polity keeps its color across snapshots. */
export function polityColor(key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return POLITY_PALETTE[(hash >>> 0) % POLITY_PALETTE.length];
}

/**
 * Caching loader where only the most recent `load` call wins: earlier calls resolve to
 * null once a newer one (or `invalidate`) has happened, so out-of-order responses are ignored.
 */
export function createLatestLoader<T>(fetcher: (key: string) => Promise<T>) {
  const cache = new Map<string, Promise<T>>();
  let token = 0;

  const get = (key: string): Promise<T> => {
    let promise = cache.get(key);
    if (!promise) {
      promise = fetcher(key);
      cache.set(key, promise);
      promise.catch(() => cache.delete(key));
    }
    return promise;
  };

  return {
    async load(key: string): Promise<T | null> {
      const mine = ++token;
      try {
        const value = await get(key);
        return mine === token ? value : null;
      } catch (err) {
        if (mine !== token) return null;
        throw err;
      }
    },
    invalidate(): void {
      token++;
    },
    prefetch(key: string): void {
      get(key).catch(() => {});
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/borders.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `scripts/fetch-borders.ts`**

```ts
import type { FeatureCollection, Geometry } from 'geojson';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { polityColor, polityKey, type Snapshot } from '../src/lib/borders';
import { MAX_YEAR, MIN_YEAR } from '../src/lib/years';

const SHA = 'da7a4b735ecef70aebdc9c73e409d8a2500d50f3';
const BASE = `https://raw.githubusercontent.com/aourednik/historical-basemaps/${SHA}`;
const OUT = join(import.meta.dirname, '..', 'public', 'borders');

interface SourceProps {
  NAME: string | null;
  SUBJECTO: string | null;
  BORDERPRECISION: number | null;
}

async function get(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res;
}

const sourceIndex = (await (await get(`${BASE}/index.json`)).json()) as {
  years: { year: number; filename: string }[];
};
const sorted = [...sourceIndex.years].sort((a, b) => a.year - b.year);
const start = sorted.filter((y) => y.year <= MIN_YEAR).at(-1);
const wanted = [...(start ? [start] : []), ...sorted.filter((y) => y.year > MIN_YEAR && y.year <= MAX_YEAR)];

mkdirSync(OUT, { recursive: true });
const index: Snapshot[] = [];
for (const { year, filename } of wanted) {
  const geo = (await (await get(`${BASE}/geojson/${filename}`)).json()) as FeatureCollection<Geometry, SourceProps>;
  // Features without a NAME are unclaimed land; the base map already draws it.
  const features = geo.features
    .filter((f) => f.geometry && f.properties?.NAME)
    .map((f) => ({
      type: 'Feature' as const,
      geometry: f.geometry,
      properties: {
        NAME: f.properties.NAME,
        SUBJECTO: f.properties.SUBJECTO,
        BORDERPRECISION: f.properties.BORDERPRECISION,
        COLOR: polityColor(polityKey(f.properties)),
      },
    }));
  writeFileSync(join(OUT, filename), JSON.stringify({ type: 'FeatureCollection', features }));
  index.push({ year, file: filename });
  console.log(`borders ${year}: ${features.length} polities`);
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
writeFileSync(join(OUT, 'LICENSE.txt'), await (await get(`${BASE}/LICENSE`)).text());
console.log(`wrote ${index.length} snapshots to public/borders`);
```

- [ ] **Step 6: Write `scripts/fetch-basemap.ts`**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NE_SHA = 'ca96624a56bd078437bca8184e78163e5039ad19';
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_SHA}/geojson`;
const FONTS_SHA = '025ff2b2f84cc0fdf11f7b1d74b3a784595fe7a4';
const FONT_STACK = 'Open Sans Italic';
const FONTS_BASE = `https://raw.githubusercontent.com/openmaptiles/fonts/${FONTS_SHA}/${encodeURIComponent(FONT_STACK)}`;
const PUBLIC = join(import.meta.dirname, '..', 'public');

async function get(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res;
}

const basemapDir = join(PUBLIC, 'basemap');
mkdirSync(basemapDir, { recursive: true });
const layers: Record<string, string> = {
  land: 'ne_50m_land',
  lakes: 'ne_50m_lakes',
  rivers: 'ne_50m_rivers_lake_centerlines',
};
for (const [name, source] of Object.entries(layers)) {
  writeFileSync(join(basemapDir, `${name}.geojson`), await (await get(`${NE_BASE}/${source}.geojson`)).text());
  console.log(`basemap ${name}`);
}

// Latin, Latin-1, Latin Extended and combining marks cover the polity names in the border data.
const glyphDir = join(PUBLIC, 'glyphs', FONT_STACK);
mkdirSync(glyphDir, { recursive: true });
for (let start = 0; start < 2048; start += 256) {
  const range = `${start}-${start + 255}`;
  const res = await get(`${FONTS_BASE}/${range}.pbf`);
  writeFileSync(join(glyphDir, `${range}.pbf`), Buffer.from(await res.arrayBuffer()));
}
writeFileSync(
  join(PUBLIC, 'glyphs', 'README.txt'),
  `${FONT_STACK} glyphs from openmaptiles/fonts @ ${FONTS_SHA}. Open Sans is licensed under the Apache License 2.0.\n`,
);
console.log('glyphs done');
```

- [ ] **Step 7: Run the scripts and check the output**

Run: `npm run fetch-geo && ls public/borders | head && cat public/borders/index.json | head -12 && ls "public/glyphs/Open Sans Italic"`
Expected: about 47 `borders <year>: <n> polities` lines from -2000 to 2000; `index.json` starts with `{ "year": -2000, "file": "world_bc2000.geojson" }`; 8 `.pbf` files. `git status` shows nothing new under `public/` (gitignored).

- [ ] **Step 8: Commit**

```bash
git add src/lib/borders.ts src/lib/borders.test.ts scripts/fetch-borders.ts scripts/fetch-basemap.ts
git commit -m "feat: border snapshot logic and pinned map asset download scripts"
```

---

### Task 7: URL state, playback and the time state hook

**Files:**
- Create: `src/state/urlState.ts`, `src/state/playback.ts`, `src/state/useLatest.ts`, `src/state/useTimeState.ts`
- Test: `src/state/urlState.test.ts`, `src/state/playback.test.ts`

**Interfaces:**
- Consumes: `clampYear` (years), `clampView`, `visibleURange`, `yearToU`, `uToYear`, `MAX_ZOOM`, `View` (timeScale), `EVENTS_BY_ID` (data).
- Produces:
  - `DEFAULT_YEAR = -500`
  - `interface UrlState { year: number; view: View; selectedEventId: string | null }`
  - `parseUrlState(search: string, lookupEvent: (id: string) => { year: number } | undefined): UrlState`
  - `serializeUrlState(state: UrlState): string` (always starts with `?`)
  - `PLAY_RATE`, `playbackStart(u: number): number`, `advancePlayback(u: number, dtSec: number, zoom: number): { u: number; done: boolean }`
  - `useLatest<T>(value: T): { readonly current: T }`
  - `interface TimeStore { year; view; selectedEventId; hoveredEventId; playing; setYear(y: number): void; setView(v: View): void; selectEvent(id: string | null): void; hoverEvent(id: string | null): void; togglePlaying(): void }`
  - `useTimeState(): TimeStore`

- [ ] **Step 1: Write the failing tests**

`src/state/urlState.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, yearToU } from '../lib/timeScale';
import { DEFAULT_YEAR, parseUrlState, serializeUrlState } from './urlState';

const known: Record<string, { year: number }> = { 'caesar-assassination': { year: -44 } };
const lookup = (id: string) => known[id];

describe('parseUrlState', () => {
  it('uses defaults for an empty query', () => {
    expect(parseUrlState('', lookup)).toEqual({
      year: DEFAULT_YEAR,
      view: { zoom: 1, center: 0.5 },
      selectedEventId: null,
    });
  });

  it('reads year and zoom and centers the view on the year', () => {
    const s = parseUrlState('?year=-44&zoom=4', lookup);
    expect(s.year).toBe(-44);
    expect(s.view.zoom).toBe(4);
    expect(s.view.center).toBeCloseTo(yearToU(-44));
  });

  it('falls back safely on garbage', () => {
    expect(parseUrlState('?year=abc', lookup).year).toBe(DEFAULT_YEAR);
    expect(parseUrlState('?year=', lookup).year).toBe(DEFAULT_YEAR);
    expect(parseUrlState('?year=0', lookup).year).toBe(1);
    expect(parseUrlState('?year=99999', lookup).year).toBe(2000);
    expect(parseUrlState('?year=-12.4', lookup).year).toBe(-12);
    expect(parseUrlState('?zoom=-5', lookup).view.zoom).toBe(1);
    expect(parseUrlState('?zoom=abc', lookup).view.zoom).toBe(1);
    expect(parseUrlState('?zoom=1e9', lookup).view.zoom).toBe(MAX_ZOOM);
  });

  it('ignores unknown events and shows the year', () => {
    expect(parseUrlState('?year=300&event=nope', lookup)).toMatchObject({ year: 300, selectedEventId: null });
  });

  it('opens a known event at its own year when no year is given', () => {
    expect(parseUrlState('?event=caesar-assassination', lookup)).toMatchObject({
      year: -44,
      selectedEventId: 'caesar-assassination',
    });
  });

  it('lets an explicit year win over the event year', () => {
    expect(parseUrlState('?year=-40&event=caesar-assassination', lookup).year).toBe(-40);
  });
});

describe('serializeUrlState', () => {
  it('omits default zoom and missing event', () => {
    expect(serializeUrlState({ year: -44, view: { zoom: 1, center: 0.5 }, selectedEventId: null })).toBe(
      '?year=-44',
    );
  });
  it('writes zoom compactly and the event', () => {
    expect(
      serializeUrlState({ year: -44, view: { zoom: 2.5, center: 0.4 }, selectedEventId: 'caesar-assassination' }),
    ).toBe('?year=-44&zoom=2.5&event=caesar-assassination');
  });
  it('round-trips through parse', () => {
    const state = parseUrlState('?year=1066&zoom=3&event=caesar-assassination', lookup);
    expect(parseUrlState(serializeUrlState(state), lookup)).toEqual(state);
  });
});
```

`src/state/playback.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { advancePlayback, PLAY_RATE, playbackStart } from './playback';

describe('playback', () => {
  it('restarts from the beginning when started at the end', () => {
    expect(playbackStart(1)).toBe(0);
    expect(playbackStart(0.3)).toBe(0.3);
  });
  it('moves at the same on-screen speed regardless of zoom', () => {
    expect(advancePlayback(0.5, 0.05, 1).u).toBeCloseTo(0.5 + 0.05 * PLAY_RATE);
    expect(advancePlayback(0.5, 0.05, 2).u).toBeCloseTo(0.5 + (0.05 * PLAY_RATE) / 2);
  });
  it('ignores long frames such as a backgrounded tab', () => {
    expect(advancePlayback(0.5, 10, 1).u).toBeCloseTo(0.5 + 0.1 * PLAY_RATE);
  });
  it('stops exactly at the end', () => {
    expect(advancePlayback(0.999, 0.1, 1)).toEqual({ u: 1, done: true });
    expect(advancePlayback(0.5, 0.05, 1).done).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state`
Expected: FAIL, cannot resolve `./urlState` and `./playback`.

- [ ] **Step 3: Implement `urlState.ts` and `playback.ts`**

`src/state/urlState.ts`:
```ts
import { clampView, yearToU, type View } from '../lib/timeScale';
import { clampYear } from '../lib/years';

export const DEFAULT_YEAR = -500;

export interface UrlState {
  year: number;
  view: View;
  selectedEventId: string | null;
}

function numberParam(params: URLSearchParams, name: string): number | null {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseUrlState(
  search: string,
  lookupEvent: (id: string) => { year: number } | undefined,
): UrlState {
  const params = new URLSearchParams(search);
  const eventId = params.get('event');
  const event = eventId ? lookupEvent(eventId) : undefined;
  const yearParam = numberParam(params, 'year');
  const year = yearParam !== null ? clampYear(yearParam) : (event?.year ?? DEFAULT_YEAR);
  const zoom = numberParam(params, 'zoom') ?? 1;
  return {
    year,
    view: clampView({ zoom, center: yearToU(year) }),
    selectedEventId: event && eventId ? eventId : null,
  };
}

export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  params.set('year', String(state.year));
  if (state.view.zoom > 1) params.set('zoom', String(Math.round(state.view.zoom * 100) / 100));
  if (state.selectedEventId) params.set('event', state.selectedEventId);
  return `?${params.toString()}`;
}
```

`src/state/playback.ts`:
```ts
/** Fraction of the visible strip the playhead crosses per second (about 40 s per screen). */
export const PLAY_RATE = 0.025;
const MAX_FRAME_SEC = 0.1;

export function playbackStart(u: number): number {
  return u >= 1 ? 0 : u;
}

export function advancePlayback(u: number, dtSec: number, zoom: number): { u: number; done: boolean } {
  const next = Math.min(1, u + (Math.min(dtSec, MAX_FRAME_SEC) * PLAY_RATE) / zoom);
  return { u: next, done: next >= 1 };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state`
Expected: PASS.

- [ ] **Step 5: Implement the hooks**

`src/state/useLatest.ts`:
```ts
import { useLayoutEffect, useRef } from 'react';

/** A ref that always holds the latest value, for use inside long-lived event listeners. */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
```

`src/state/useTimeState.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import { EVENTS_BY_ID } from '../data';
import { clampView, uToYear, visibleURange, yearToU, type View } from '../lib/timeScale';
import { clampYear } from '../lib/years';
import { advancePlayback, playbackStart } from './playback';
import { useLatest } from './useLatest';
import { parseUrlState, serializeUrlState } from './urlState';

export interface TimeStore {
  year: number;
  view: View;
  selectedEventId: string | null;
  hoveredEventId: string | null;
  playing: boolean;
  setYear(year: number): void;
  setView(view: View): void;
  selectEvent(id: string | null): void;
  hoverEvent(id: string | null): void;
  togglePlaying(): void;
}

export function useTimeState(): TimeStore {
  const [initial] = useState(() => parseUrlState(window.location.search, (id) => EVENTS_BY_ID.get(id)));
  const [year, setYearRaw] = useState(initial.year);
  const [view, setViewRaw] = useState(initial.view);
  const [selectedEventId, selectEvent] = useState(initial.selectedEventId);
  const [hoveredEventId, hoverEvent] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const latest = useLatest({ year, view });

  // A user moving the playhead takes over from playback.
  const setYear = useCallback((y: number) => {
    setPlaying(false);
    setYearRaw(clampYear(y));
  }, []);
  const setView = useCallback((v: View) => setViewRaw(clampView(v)), []);
  const togglePlaying = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    const query = serializeUrlState({ year, view, selectedEventId });
    window.history.replaceState(null, '', `${window.location.pathname}${query}`);
  }, [year, view, selectedEventId]);

  useEffect(() => {
    if (!playing) return;
    let u = playbackStart(yearToU(latest.current.year));
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const step = advancePlayback(u, (now - last) / 1000, latest.current.view.zoom);
      last = now;
      u = step.u;
      setYearRaw(uToYear(u));
      const v = latest.current.view;
      const [u0, u1] = visibleURange(v);
      // Keep the playhead on screen: when it leaves, page so it sits 10% in from the left.
      if (u < u0 || u > u1) setViewRaw(clampView({ zoom: v.zoom, center: u + 0.4 / v.zoom }));
      if (step.done) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, latest]);

  return {
    year,
    view,
    selectedEventId,
    hoveredEventId,
    playing,
    setYear,
    setView,
    selectEvent,
    hoverEvent,
    togglePlaying,
  };
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/state
git commit -m "feat: URL state, playback stepping and the time state hook"
```

---

### Task 8: Timeline strip, theme, app shell and Playwright setup

**Files:**
- Create: `src/theme.ts`, `src/lib/packEras.ts`, `src/components/TimelineStrip.tsx`, `playwright.config.ts`, `e2e/timeline.spec.ts`
- Modify: `src/App.tsx` (replace placeholder), `src/styles.css` (append)
- Test: `src/lib/packEras.test.ts`, `e2e/timeline.spec.ts`

**Interfaces:**
- Consumes: `ERAS` (data), `REGIONS`, `Region`, `Category`, `Era` (schema), timeScale functions, `formatYear`, `formatSpan`, `useTimeState`, `useLatest`.
- Produces:
  - `src/theme.ts`: `REGION_LABELS`, `REGION_SHORT_LABELS`, `REGION_COLORS` (`Record<Region, string>`), `CATEGORY_LABELS`, `CATEGORY_COLORS` (`Record<Category, string>`), `MAP_COLORS`
  - `interface Lane { region: Region; rows: Era[][] }`, `packEras(eras: Era[]): Lane[]`
  - `TimelineStrip` props: `{ year: number; view: View; playing: boolean; onYear(y: number): void; onView(v: View): void; onTogglePlay(): void }`
  - Test ids used by later E2E tests: `strip-year`, `timeline-axis`, and `data-era="<era id>"` on each band
  - App grid areas `header`, `map`, `panel`, `strip` (Tasks 9-10 fill `map` and `panel`)

- [ ] **Step 1: Write the failing `packEras` test**

`src/lib/packEras.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Era } from '../data/schema';
import { packEras } from './packEras';

const era = (id: string, start: number, end: number, region: Era['region'] = 'europe'): Era => ({
  id,
  name: id,
  start,
  end,
  region,
});

describe('packEras', () => {
  it('puts non-overlapping and touching eras in one row', () => {
    const [lane] = packEras([era('rome-empire', -27, 476), era('rome-republic', -509, -27)]);
    expect(lane.rows.map((r) => r.map((e) => e.id))).toEqual([['rome-republic', 'rome-empire']]);
  });
  it('moves overlapping eras to extra rows', () => {
    const [lane] = packEras([era('zhou', -1046, -256), era('warring', -475, -221), era('qin', -221, -206)]);
    expect(lane.rows.map((r) => r.map((e) => e.id))).toEqual([['zhou', 'qin'], ['warring']]);
  });
  it('orders lanes by the fixed region order and skips empty regions', () => {
    const lanes = packEras([era('inca', 1438, 1533, 'americas'), era('han', -206, 220, 'east-asia')]);
    expect(lanes.map((l) => l.region)).toEqual(['east-asia', 'americas']);
  });
});
```

Note: `zhou` ends at -256, so `qin` (-221) fits after it in row 0; `warring` overlaps `zhou` and goes to row 1.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/packEras.test.ts`
Expected: FAIL, cannot resolve `./packEras`.

- [ ] **Step 3: Implement `packEras`**

`src/lib/packEras.ts`:
```ts
import { REGIONS, type Era, type Region } from '../data/schema';

export interface Lane {
  region: Region;
  rows: Era[][];
}

/** Greedy interval packing: each era goes in the first row where it does not overlap. */
export function packEras(eras: Era[]): Lane[] {
  return REGIONS.flatMap((region) => {
    const sorted = eras
      .filter((e) => e.region === region)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const rows: Era[][] = [];
    for (const era of sorted) {
      const row = rows.find((r) => r[r.length - 1].end <= era.start);
      if (row) row.push(era);
      else rows.push([era]);
    }
    return rows.length > 0 ? [{ region, rows }] : [];
  });
}
```

Run: `npx vitest run src/lib/packEras.test.ts`
Expected: PASS.

- [ ] **Step 4: Write `src/theme.ts`**

```ts
import type { Category, Region } from './data/schema';

export const REGION_LABELS: Record<Region, string> = {
  europe: 'Europe',
  mena: 'Middle East & North Africa',
  'sub-saharan-africa': 'Sub-Saharan Africa',
  'central-asia': 'Central Asia & Steppe',
  'south-asia': 'South Asia',
  'east-asia': 'East Asia',
  'southeast-asia-oceania': 'Southeast Asia & Oceania',
  americas: 'Americas',
};

export const REGION_SHORT_LABELS: Record<Region, string> = {
  europe: 'Europe',
  mena: 'Mid. East',
  'sub-saharan-africa': 'Africa',
  'central-asia': 'Steppe',
  'south-asia': 'S. Asia',
  'east-asia': 'E. Asia',
  'southeast-asia-oceania': 'SE Asia',
  americas: 'Americas',
};

/** Era band colors on the timeline strip. */
export const REGION_COLORS: Record<Region, string> = {
  europe: '#8c4a44',
  mena: '#94703a',
  'sub-saharan-africa': '#7a6a33',
  'central-asia': '#5e6a3a',
  'south-asia': '#3f7354',
  'east-asia': '#3c6280',
  'southeast-asia-oceania': '#5b4f86',
  americas: '#80466f',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  politics: 'Politics, war & upheaval',
  religion: 'Religion & philosophy',
  science: 'Science & technology',
  culture: 'Culture & the arts',
  trade: 'Trade & exploration',
};

/** Event pin and dot colors. */
export const CATEGORY_COLORS: Record<Category, string> = {
  politics: '#e0645a',
  religion: '#b48ce0',
  science: '#4fb3d9',
  culture: '#e6b84f',
  trade: '#6cc28b',
};

export const MAP_COLORS = {
  ocean: '#0e1a26',
  land: '#2b3440',
  river: '#1d3346',
  border: '#0e1a26',
  label: '#f1e6cf',
  labelHalo: '#0e1a26',
};
```

- [ ] **Step 5: Write `src/components/TimelineStrip.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ERAS } from '../data';
import { packEras } from '../lib/packEras';
import { FULL_VIEW, panBy, pxToYear, ticks, yearToPx, zoomAt, type View } from '../lib/timeScale';
import { formatSpan, formatYear } from '../lib/years';
import { useLatest } from '../state/useLatest';
import { REGION_COLORS, REGION_SHORT_LABELS } from '../theme';

const GUTTER = 72;
const AXIS_H = 24;
const LANE_GAP = 4;
const ZOOM_STEP = 1.5;

interface Props {
  year: number;
  view: View;
  playing: boolean;
  onYear(year: number): void;
  onView(view: View): void;
  onTogglePlay(): void;
}

export function TimelineStrip({ year, view, playing, onYear, onView, onTogglePlay }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [size, setSize] = useState({ width: 800, height: 200 });
  const lanes = useMemo(() => packEras(ERAS), []);

  useEffect(() => {
    const el = canvasRef.current!;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const trackW = Math.max(100, size.width - GUTTER);
  const totalRows = lanes.reduce((n, lane) => n + lane.rows.length, 0);
  const rowH = Math.max(8, Math.min(16, (size.height - AXIS_H - LANE_GAP * lanes.length) / Math.max(1, totalRows)));
  const x = (y: number) => GUTTER + yearToPx(y, view, trackW);
  const laneTops = lanes.reduce<number[]>(
    (tops, lane, i) => [...tops, i === 0 ? AXIS_H : tops[i - 1] + lanes[i - 1].rows.length * rowH + LANE_GAP],
    [],
  );

  // Wheel: vertical zooms around the cursor, horizontal pans. Needs a non-passive listener.
  const latest = useLatest({ view, trackW, onView });
  useEffect(() => {
    const svg = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { view: v, trackW: w, onView: set } = latest.current;
      const px = e.clientX - svg.getBoundingClientRect().left - GUTTER;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) set(panBy(v, -e.deltaX, w));
      else set(zoomAt(v, Math.exp(-e.deltaY * 0.002), px, w));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [latest]);

  const yearAt = (clientX: number) =>
    pxToYear(clientX - svgRef.current!.getBoundingClientRect().left - GUTTER, view, trackW);
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-era]')) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onYear(yearAt(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (dragging.current) onYear(yearAt(e.clientX));
  };
  const endDrag = () => {
    dragging.current = false;
  };
  const zoomAroundPlayhead = (factor: number) => onView(zoomAt(view, factor, yearToPx(year, view, trackW), trackW));

  const playheadX = x(year);
  const playheadVisible = playheadX >= GUTTER && playheadX <= size.width;

  return (
    <section className="strip" aria-label="Timeline">
      <div className="strip-controls">
        <button onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="strip-year" data-testid="strip-year">
          {formatYear(year)}
        </span>
        <span className="strip-spacer" />
        <button onClick={() => zoomAroundPlayhead(ZOOM_STEP)} aria-label="Zoom in">
          +
        </button>
        <button onClick={() => zoomAroundPlayhead(1 / ZOOM_STEP)} aria-label="Zoom out">
          -
        </button>
        <button onClick={() => onView(FULL_VIEW)}>All years</button>
      </div>
      <div className="strip-canvas" ref={canvasRef}>
        <svg
          ref={svgRef}
          width={size.width}
          height={size.height}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <rect data-testid="timeline-axis" className="axis-bg" x={GUTTER} y={0} width={trackW} height={AXIS_H} />
          {ticks(view, trackW).map((t) => (
            <g key={t}>
              <line className="tick-line" x1={x(t)} x2={x(t)} y1={AXIS_H - 6} y2={size.height} />
              <text className="tick-label" x={x(t) + 3} y={AXIS_H - 9}>
                {formatYear(t)}
              </text>
            </g>
          ))}
          {lanes.map((lane, laneIndex) => {
            const top = laneTops[laneIndex];
            return (
              <g key={lane.region}>
                <text className="lane-label" x={6} y={top + Math.min(rowH, 12) - 2}>
                  {REGION_SHORT_LABELS[lane.region]}
                </text>
                {lane.rows.map((row, rowIndex) =>
                  row.map((era) => {
                    const x0 = Math.max(GUTTER, x(era.start));
                    const x1 = Math.min(size.width, x(era.end));
                    if (x1 <= x0) return null;
                    const y = top + rowIndex * rowH;
                    const showLabel = rowH >= 11 && x1 - x0 > era.name.length * 6 + 8;
                    return (
                      <g key={era.id} data-era={era.id} className="era" onClick={() => onYear(era.start)}>
                        <title>{`${era.name} (${formatSpan(era.start, era.end)})`}</title>
                        <rect x={x0} y={y + 1} width={x1 - x0} height={rowH - 2} rx={2} fill={REGION_COLORS[lane.region]} />
                        {showLabel && (
                          <text className="era-label" x={x0 + 4} y={y + rowH - 3.5}>
                            {era.name}
                          </text>
                        )}
                      </g>
                    );
                  }),
                )}
              </g>
            );
          })}
          {playheadVisible && (
            <g className="playhead" pointerEvents="none">
              <line x1={playheadX} x2={playheadX} y1={0} y2={size.height} />
              <circle cx={playheadX} cy={AXIS_H / 2} r={6} />
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Replace `src/App.tsx`**

```tsx
import { TimelineStrip } from './components/TimelineStrip';
import { useTimeState } from './state/useTimeState';

export default function App() {
  const t = useTimeState();
  return (
    <div className="app">
      <header className="app-header">
        <h1>The Greatest History</h1>
      </header>
      <main className="map-area" />
      <aside className="panel-area" />
      <TimelineStrip
        year={t.year}
        view={t.view}
        playing={t.playing}
        onYear={t.setYear}
        onView={t.setView}
        onTogglePlay={t.togglePlaying}
      />
    </div>
  );
}
```

- [ ] **Step 7: Append layout and strip styles to `src/styles.css`**

```css
.app {
  display: grid;
  grid-template-columns: 1fr 360px;
  grid-template-rows: auto 1fr var(--strip-h);
  grid-template-areas:
    'header header'
    'map panel'
    'strip strip';
  height: 100%;
}

.app-header {
  grid-area: header;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
}

.app-header h1 {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.map-area {
  grid-area: map;
  position: relative;
  min-height: 0;
}

.panel-area {
  grid-area: panel;
  min-height: 0;
}

button {
  font: inherit;
  color: var(--text);
  background: var(--panel-raised);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}

button:hover {
  border-color: var(--accent);
}

.strip {
  grid-area: strip;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--panel);
  border-top: 1px solid var(--line);
}

.strip-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
}

.strip-year {
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  font-size: 20px;
  color: var(--accent);
  min-width: 7ch;
}

.strip-spacer {
  flex: 1;
}

.strip-canvas {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.strip-canvas svg {
  display: block;
  touch-action: none;
  user-select: none;
  cursor: ew-resize;
}

.axis-bg {
  fill: transparent;
}

.tick-line {
  stroke: var(--line);
}

.tick-label {
  fill: var(--muted);
  font-size: 11px;
}

.lane-label {
  fill: var(--muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.era {
  cursor: pointer;
}

.era rect {
  opacity: 0.85;
}

.era:hover rect {
  opacity: 1;
}

.era-label {
  fill: var(--text);
  font-size: 10px;
  pointer-events: none;
}

.playhead line {
  stroke: #e0564a;
  stroke-width: 2;
}

.playhead circle {
  fill: #e0564a;
}
```

- [ ] **Step 8: Set up Playwright and write the E2E test**

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

`e2e/timeline.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('scrubbing the timeline changes the year and the URL', async ({ page }) => {
  await page.goto('/?year=-44');
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
  const box = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(page.getByTestId('strip-year')).not.toHaveText('44 BC');
  await expect(page).toHaveURL(/year=(19\d\d|2000)/);
});

test('clicking an era band jumps to its start', async ({ page }) => {
  await page.goto('/?year=-44');
  await page.locator('[data-era="han"] rect').click();
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
  await expect(page).toHaveURL(/year=-206/);
});
```

Run:
```bash
npx playwright install chromium
npm run test:e2e
```
Expected: 2 passed.

- [ ] **Step 9: Manual check**

Run: `npm run dev` and open the printed URL. Check: era bands for Shang, Roman Republic, Han, Roman Empire, Tang appear in labeled lanes; dragging on the strip moves the red playhead and the big year label; the mouse wheel zooms around the cursor; a horizontal trackpad swipe pans; "All years" resets; Play animates and stops at 2000; the URL `year=` updates while dragging.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: timeline strip with era bands, scrubbing, zoom and playback"
```

---

### Task 9: Map view

**Files:**
- Create: `src/components/MapView.tsx`, `e2e/map.spec.ts`
- Modify: `src/App.tsx`, `src/styles.css` (append)

**Interfaces:**
- Consumes: `snapshotFor`, `neighborSnapshots`, `createLatestLoader`, `Snapshot` (borders); `CATEGORY_COLORS`, `MAP_COLORS` (theme); `HistoryEvent` (schema); `useLatest`; `eventsInWindow`, `pinnedEvents`, `windowHalfWidth` (selectEvents); `EVENTS`, `EVENTS_BY_ID` (data).
- Produces: `MapView` props `{ year: number; pins: HistoryEvent[]; selectedEvent: HistoryEvent | null; hoveredEventId: string | null; onHover(id: string | null): void; onSelect(id: string): void }`. Test id `map`. Fallback text starts with "The map needs WebGL".

- [ ] **Step 1: Write the failing E2E tests**

`e2e/map.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('the map renders a canvas', async ({ page }) => {
  await page.goto('/?year=-44');
  await expect(page.getByTestId('map').locator('canvas')).toBeVisible();
});

test('without WebGL the map shows a fallback and the timeline still works', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith('webgl')) return null;
      return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/?year=-44');
  await expect(page.getByText('The map needs WebGL')).toBeVisible();
  await page.locator('[data-era="han"] rect').click();
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
});
```

Run: `npm run test:e2e -- e2e/map.spec.ts`
Expected: FAIL (no `map` test id, no fallback text).

- [ ] **Step 2: Write `src/components/MapView.tsx`**

```tsx
import type { FeatureCollection, Point } from 'geojson';
import maplibregl, {
  type GeoJSONSource,
  type LayerSpecification,
  type MapLayerMouseEvent,
  type Map as MapLibreMap,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { HistoryEvent } from '../data/schema';
import { createLatestLoader, neighborSnapshots, snapshotFor, type Snapshot } from '../lib/borders';
import { useLatest } from '../state/useLatest';
import { CATEGORY_COLORS, MAP_COLORS } from '../theme';

const FADE_MS = 300;
const BORDER_FILL_OPACITY = 0.5;
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
type Slot = 'a' | 'b';

/** MapLibre fetches from a worker, so asset URLs must be absolute. */
const asset = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, window.location.href).href;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

function borderLayers(slot: Slot): { fills: LayerSpecification[]; label: LayerSpecification } {
  const fade = { duration: FADE_MS, delay: 0 };
  return {
    fills: [
      {
        id: `borders-${slot}-fill`,
        type: 'fill',
        source: `borders-${slot}`,
        paint: { 'fill-color': ['get', 'COLOR'], 'fill-opacity': 0, 'fill-opacity-transition': fade },
      },
      {
        id: `borders-${slot}-line`,
        type: 'line',
        source: `borders-${slot}`,
        paint: {
          'line-color': MAP_COLORS.border,
          'line-width': 0.6,
          'line-opacity': 0,
          'line-opacity-transition': fade,
        },
      },
    ],
    label: {
      id: `borders-${slot}-label`,
      type: 'symbol',
      source: `borders-${slot}`,
      layout: {
        'text-field': ['get', 'NAME'],
        'text-font': ['Open Sans Italic'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 5, 15],
        'text-max-width': 8,
      },
      paint: {
        'text-color': MAP_COLORS.label,
        'text-halo-color': MAP_COLORS.labelHalo,
        'text-halo-width': 1.2,
        'text-opacity': 0,
        'text-opacity-transition': fade,
      },
    },
  };
}

function buildStyle(): StyleSpecification {
  const a = borderLayers('a');
  const b = borderLayers('b');
  const highlighted = [
    'any',
    ['boolean', ['feature-state', 'hover'], false],
    ['boolean', ['feature-state', 'selected'], false],
  ];
  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: `${asset('glyphs/')}{fontstack}/{range}.pbf`,
    sources: {
      land: { type: 'geojson', data: asset('basemap/land.geojson') },
      lakes: { type: 'geojson', data: asset('basemap/lakes.geojson') },
      rivers: { type: 'geojson', data: asset('basemap/rivers.geojson') },
      'borders-a': { type: 'geojson', data: EMPTY },
      'borders-b': { type: 'geojson', data: EMPTY },
      events: { type: 'geojson', data: EMPTY, promoteId: 'id' },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': MAP_COLORS.ocean } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': MAP_COLORS.land } },
      ...a.fills,
      ...b.fills,
      { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': MAP_COLORS.ocean } },
      {
        id: 'rivers',
        type: 'line',
        source: 'rivers',
        paint: {
          'line-color': MAP_COLORS.river,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1.5],
        },
      },
      a.label,
      b.label,
      {
        id: 'pins',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': [
            '+',
            ['match', ['get', 'importance'], 3, 7, 2, 5.5, 4],
            ['case', highlighted, 3, 0],
          ],
          'circle-color': [
            'match',
            ['get', 'category'],
            'politics',
            CATEGORY_COLORS.politics,
            'religion',
            CATEGORY_COLORS.religion,
            'science',
            CATEGORY_COLORS.science,
            'culture',
            CATEGORY_COLORS.culture,
            'trade',
            CATEGORY_COLORS.trade,
            '#888888',
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['case', highlighted, 2.5, 1],
        },
      },
    ],
  } as StyleSpecification;
}

function setSlotOpacity(map: MapLibreMap, slot: Slot, visible: boolean): void {
  map.setPaintProperty(`borders-${slot}-fill`, 'fill-opacity', visible ? BORDER_FILL_OPACITY : 0);
  map.setPaintProperty(`borders-${slot}-line`, 'line-opacity', visible ? 0.8 : 0);
  map.setPaintProperty(`borders-${slot}-label`, 'text-opacity', visible ? 1 : 0);
}

function pinsToGeoJson(pins: HistoryEvent[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: pins.map((e) => ({
      type: 'Feature',
      properties: { id: e.id, category: e.category, importance: e.importance },
      geometry: { type: 'Point', coordinates: [e.location.lng, e.location.lat] },
    })),
  };
}

interface Props {
  year: number;
  pins: HistoryEvent[];
  selectedEvent: HistoryEvent | null;
  hoveredEventId: string | null;
  onHover(id: string | null): void;
  onSelect(id: string): void;
}

export function MapView({ year, pins, selectedEvent, hoveredEventId, onHover, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState<Snapshot[]>([]);
  const callbacks = useLatest({ onHover, onSelect });
  const loader = useRef(createLatestLoader<FeatureCollection>((file) => fetchJson(asset(`borders/${file}`))));
  const activeSlot = useRef<Slot>('a');
  const shownFile = useRef<string | null>(null);
  const highlight = useRef<{ hover: string | null; selected: string | null }>({ hover: null, selected: null });

  useEffect(() => {
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current!,
        style: buildStyle(),
        center: [45, 30],
        zoom: 1.6,
        attributionControl: false,
      });
    } catch (err) {
      console.error('Map failed to start', err);
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.on('load', () => setReady(true));
    const pinId = (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      return typeof id === 'string' ? id : null;
    };
    map.on('mousemove', 'pins', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      callbacks.current.onHover(pinId(e));
    });
    map.on('mouseleave', 'pins', () => {
      map.getCanvas().style.cursor = '';
      callbacks.current.onHover(null);
    });
    map.on('click', 'pins', (e) => {
      const id = pinId(e);
      if (id) callbacks.current.onSelect(id);
    });
    fetchJson<Snapshot[]>(asset('borders/index.json'))
      .then(setIndex)
      .catch((err) => console.warn('Border index unavailable; showing the base map only', err));
    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [callbacks]);

  const snapshotFile = snapshotFor(index, year)?.file ?? null;

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !snapshotFile) return;
    for (const s of neighborSnapshots(index, year)) loader.current.prefetch(s.file);
    if (snapshotFile === shownFile.current) {
      loader.current.invalidate();
      return;
    }
    loader.current
      .load(snapshotFile)
      .then((data) => {
        if (!data || mapRef.current !== map) return;
        const next: Slot = activeSlot.current === 'a' ? 'b' : 'a';
        (map.getSource(`borders-${next}`) as GeoJSONSource).setData(data);
        setSlotOpacity(map, next, true);
        setSlotOpacity(map, activeSlot.current, false);
        activeSlot.current = next;
        shownFile.current = snapshotFile;
      })
      .catch((err) => console.warn(`Border snapshot ${snapshotFile} failed to load; keeping the previous one`, err));
    // `year` only matters through snapshotFile and the prefetch neighbors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, snapshotFile, index]);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current!.getSource('events') as GeoJSONSource).setData(pinsToGeoJson(pins));
  }, [ready, pins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const prev = highlight.current;
    if (prev.hover) map.setFeatureState({ source: 'events', id: prev.hover }, { hover: false });
    if (prev.selected) map.setFeatureState({ source: 'events', id: prev.selected }, { selected: false });
    if (hoveredEventId) map.setFeatureState({ source: 'events', id: hoveredEventId }, { hover: true });
    if (selectedEvent) map.setFeatureState({ source: 'events', id: selectedEvent.id }, { selected: true });
    highlight.current = { hover: hoveredEventId, selected: selectedEvent?.id ?? null };
  }, [ready, pins, hoveredEventId, selectedEvent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedEvent) return;
    const point: [number, number] = [selectedEvent.location.lng, selectedEvent.location.lat];
    if (!map.getBounds().contains(point)) map.easeTo({ center: point, duration: 800 });
  }, [ready, selectedEvent]);

  return (
    <div className="map" data-testid="map">
      {failed ? (
        <p className="map-fallback">
          The map needs WebGL, which this browser could not start. The timeline and event list still work.
        </p>
      ) : (
        <div ref={containerRef} className="map-canvas" />
      )}
    </div>
  );
}
```

Notes for the implementer:
- There is no ESLint in this project; the `eslint-disable` comment documents intent for future readers. Keep it.
- The style object is cast with `as StyleSpecification` because MapLibre's expression tuple types do not infer through the shared `highlighted` constant. All other typing stays checked.

- [ ] **Step 3: Wire the map into `src/App.tsx`**

Replace `src/App.tsx` with:
```tsx
import { useMemo } from 'react';
import { MapView } from './components/MapView';
import { TimelineStrip } from './components/TimelineStrip';
import { EVENTS, EVENTS_BY_ID } from './data';
import { eventsInWindow, pinnedEvents, windowHalfWidth } from './lib/selectEvents';
import { useTimeState } from './state/useTimeState';

export default function App() {
  const t = useTimeState();
  const halfWidth = windowHalfWidth(t.view.zoom);
  const inWindow = useMemo(() => eventsInWindow(EVENTS, t.year, halfWidth), [t.year, halfWidth]);
  const selectedEvent = t.selectedEventId ? (EVENTS_BY_ID.get(t.selectedEventId) ?? null) : null;
  const pins = useMemo(() => {
    const base = pinnedEvents(inWindow, halfWidth);
    // The selected event keeps its pin even when it is outside the window or below the pin threshold.
    return selectedEvent && !base.includes(selectedEvent) ? [...base, selectedEvent] : base;
  }, [inWindow, halfWidth, selectedEvent]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>The Greatest History</h1>
      </header>
      <main className="map-area">
        <MapView
          year={t.year}
          pins={pins}
          selectedEvent={selectedEvent}
          hoveredEventId={t.hoveredEventId}
          onHover={t.hoverEvent}
          onSelect={t.selectEvent}
        />
      </main>
      <aside className="panel-area" />
      <TimelineStrip
        year={t.year}
        view={t.view}
        playing={t.playing}
        onYear={t.setYear}
        onView={t.setView}
        onTogglePlay={t.togglePlaying}
      />
    </div>
  );
}
```

- [ ] **Step 4: Append map styles to `src/styles.css`**

```css
.map,
.map-canvas {
  position: absolute;
  inset: 0;
}

.map {
  background: #0e1a26;
}

.map-fallback {
  max-width: 32ch;
  margin: 20vh auto 0;
  color: var(--muted);
  text-align: center;
  line-height: 1.5;
}
```

- [ ] **Step 5: Run the E2E tests**

Run: `npm run test:e2e`
Expected: 4 passed (2 timeline, 2 map). If "the map renders a canvas" fails only because headless Chromium has no WebGL, add `launchOptions: { args: ['--enable-unsafe-swiftshader'] }` to the chromium project's `use` in `playwright.config.ts` and re-run.

- [ ] **Step 6: Manual check**

Run: `npm run dev`. Check: a dark globe with land, rivers and lakes; shaded polities with italic names; dragging the strip across 323 BC, AD 1 and 1492 swaps borders with a short crossfade and the colors of a long-lived empire stay the same; pins for the seed events appear near their years (for example Rome at 44 BC), grow on hover and show a pointer cursor; scrubbing back and forth quickly never leaves borders from the wrong era on screen.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: globe map with crossfading historical borders and event pins"
```

---

### Task 10: Event panel

**Files:**
- Create: `src/components/EventPanel.tsx`, `e2e/panel.spec.ts`
- Modify: `src/App.tsx`, `src/styles.css` (append)

**Interfaces:**
- Consumes: `RegionGroup`, `groupByRegion` (selectEvents); `HistoryEvent`, `Region` (schema); `REGION_LABELS`, `CATEGORY_LABELS`, `CATEGORY_COLORS` (theme); `formatYear`, `formatSpan` (years).
- Produces: `EventPanel` props `{ year: number; halfWidth: number; groups: RegionGroup[]; selectedEvent: HistoryEvent | null; hoveredEventId: string | null; onHover(id: string | null): void; onSelect(id: string | null): void }`. `REGION_CAP = 5`. Test id `event-panel`. Region headings are `h3`; the event card title is `h2`; event rows are buttons whose accessible name starts with the event title.

- [ ] **Step 1: Write the failing E2E tests**

`e2e/panel.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('lists events around the current year grouped by region', async ({ page }) => {
  await page.goto('/?year=-44');
  const panel = page.getByTestId('event-panel');
  await expect(panel).toContainText('Around 44 BC');
  await expect(panel.getByRole('heading', { level: 3, name: 'Europe' })).toBeVisible();
  await expect(panel.getByRole('button', { name: /^Julius Caesar assassinated/ })).toBeVisible();
});

test('the list changes after scrubbing to the end', async ({ page }) => {
  await page.goto('/?year=-44');
  const box = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  const panel = page.getByTestId('event-panel');
  await expect(panel).not.toContainText('Around 44 BC');
  await expect(panel.getByRole('button', { name: /^Julius Caesar assassinated/ })).toHaveCount(0);
});

test('selecting an event opens its card, updates the URL and survives reload', async ({ page }) => {
  await page.goto('/?year=-44');
  const panel = page.getByTestId('event-panel');
  await panel.getByRole('button', { name: /^Julius Caesar assassinated/ }).click();
  await expect(panel.getByRole('heading', { level: 2, name: 'Julius Caesar assassinated' })).toBeVisible();
  await expect(panel).toContainText('Why it mattered');
  await expect(page).toHaveURL(/event=caesar-assassination/);
  await page.reload();
  await expect(panel.getByRole('heading', { level: 2, name: 'Julius Caesar assassinated' })).toBeVisible();
  await panel.getByRole('button', { name: /All events/ }).click();
  await expect(panel).toContainText('Around 44 BC');
  await expect(page).not.toHaveURL(/event=/);
});

test('bad URL values fall back safely', async ({ page }) => {
  await page.goto('/?year=0&event=nope&zoom=-3');
  const panel = page.getByTestId('event-panel');
  await expect(panel).toContainText('Around AD 1');
  await expect(panel.getByRole('heading', { level: 2 })).toHaveCount(0);
  await page.goto('/?year=99999');
  await expect(panel).toContainText('Around 2000');
});
```

Run: `npm run test:e2e -- e2e/panel.spec.ts`
Expected: FAIL (no `event-panel`).

- [ ] **Step 2: Write `src/components/EventPanel.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { HistoryEvent, Region } from '../data/schema';
import type { RegionGroup } from '../lib/selectEvents';
import { formatSpan, formatYear } from '../lib/years';
import { CATEGORY_COLORS, CATEGORY_LABELS, REGION_LABELS } from '../theme';

export const REGION_CAP = 5;
const SWIPE_PX = 30;

interface Props {
  year: number;
  halfWidth: number;
  groups: RegionGroup[];
  selectedEvent: HistoryEvent | null;
  hoveredEventId: string | null;
  onHover(id: string | null): void;
  onSelect(id: string | null): void;
}

export function EventPanel({ year, halfWidth, groups, selectedEvent, hoveredEventId, onHover, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<Region>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);

  // On phones, choosing an event (for example from a map pin) opens the sheet.
  useEffect(() => {
    if (selectedEvent) setSheetOpen(true);
  }, [selectedEvent]);

  return (
    <aside className={`panel${sheetOpen ? ' is-open' : ''}`} data-testid="event-panel">
      <button
        className="sheet-handle"
        aria-label={sheetOpen ? 'Collapse events' : 'Expand events'}
        onPointerDown={(e) => {
          swipeStart.current = e.clientY;
        }}
        onPointerUp={(e) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (start !== null && Math.abs(e.clientY - start) > SWIPE_PX) {
            swiped.current = true;
            setSheetOpen(e.clientY < start);
          }
        }}
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          setSheetOpen((open) => !open);
        }}
      />
      {selectedEvent ? (
        <EventCard event={selectedEvent} onBack={() => onSelect(null)} />
      ) : (
        <div className="panel-list">
          <header className="panel-header">
            <h2>Around {formatYear(year)}</h2>
            <p className="panel-sub">Events within {halfWidth} years either side</p>
          </header>
          {groups.length === 0 && (
            <p className="panel-empty">
              No recorded events in this window. Zoom out the timeline or move the playhead.
            </p>
          )}
          {groups.map((group) => {
            const shown = expanded.has(group.region) ? group.events : group.events.slice(0, REGION_CAP);
            const more = group.events.length - shown.length;
            return (
              <section key={group.region} className="region">
                <h3>{REGION_LABELS[group.region]}</h3>
                <ul>
                  {shown.map((event) => (
                    <li key={event.id}>
                      <EventRow
                        event={event}
                        hovered={event.id === hoveredEventId}
                        onHover={onHover}
                        onSelect={onSelect}
                      />
                    </li>
                  ))}
                </ul>
                {more > 0 && (
                  <button className="more" onClick={() => setExpanded((s) => new Set(s).add(group.region))}>
                    +{more} more
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function EventRow({
  event,
  hovered,
  onHover,
  onSelect,
}: {
  event: HistoryEvent;
  hovered: boolean;
  onHover(id: string | null): void;
  onSelect(id: string): void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (hovered) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [hovered]);
  return (
    <button
      ref={ref}
      className={`event-row${hovered ? ' is-hovered' : ''}`}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(event.id)}
    >
      <span className="dot" style={{ background: CATEGORY_COLORS[event.category] }} aria-hidden />
      <span className="event-title">{event.title}</span>
      <span className="event-date">{formatSpan(event.year, event.endYear)}</span>
    </button>
  );
}

function EventCard({ event, onBack }: { event: HistoryEvent; onBack(): void }) {
  return (
    <article className="card">
      <button className="back" onClick={onBack}>
        ← All events
      </button>
      <p className="card-category">
        <span className="dot" style={{ background: CATEGORY_COLORS[event.category] }} aria-hidden />
        {CATEGORY_LABELS[event.category]}
      </p>
      <h2>{event.title}</h2>
      <p className="card-meta">
        {event.dateLabel ?? formatSpan(event.year, event.endYear)} · {event.location.name},{' '}
        {REGION_LABELS[event.region]}
      </p>
      <p>{event.summary}</p>
      <h3>Why it mattered</h3>
      <p>{event.significance}</p>
      <a href={event.wikipedia} target="_blank" rel="noreferrer">
        Read more on Wikipedia
      </a>
    </article>
  );
}
```

- [ ] **Step 3: Wire the panel into `src/App.tsx`**

In `src/App.tsx`:
1. Add imports:
```tsx
import { EventPanel } from './components/EventPanel';
import { eventsInWindow, groupByRegion, pinnedEvents, windowHalfWidth } from './lib/selectEvents';
```
(replacing the existing `selectEvents` import line).
2. After the `inWindow` line, add:
```tsx
  const groups = useMemo(() => groupByRegion(inWindow, t.year), [inWindow, t.year]);
```
3. Replace `<aside className="panel-area" />` with:
```tsx
      <div className="panel-area">
        <EventPanel
          year={t.year}
          halfWidth={halfWidth}
          groups={groups}
          selectedEvent={selectedEvent}
          hoveredEventId={t.hoveredEventId}
          onHover={t.hoverEvent}
          onSelect={t.selectEvent}
        />
      </div>
```

- [ ] **Step 4: Append panel styles to `src/styles.css`**

```css
.panel {
  height: 100%;
  overflow-y: auto;
  background: var(--panel);
  border-left: 1px solid var(--line);
  padding: 12px 16px 24px;
}

.sheet-handle {
  display: none;
}

.panel-header h2 {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  font-size: 22px;
  font-weight: 600;
}

.panel-sub,
.panel-empty {
  margin: 4px 0 12px;
  color: var(--muted);
  font-size: 13px;
}

.region h3 {
  margin: 16px 0 6px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.region ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.event-row {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
}

.event-row:hover,
.event-row.is-hovered {
  background: var(--panel-raised);
  border-color: var(--line);
}

.event-date {
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.more {
  margin-top: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--muted);
}

.card h2 {
  margin: 4px 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  font-size: 26px;
  line-height: 1.2;
}

.card h3 {
  margin: 18px 0 4px;
  color: var(--accent);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.card p {
  line-height: 1.55;
}

.card-category,
.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.card-meta {
  margin: 0 0 12px;
}

.card a {
  color: var(--accent);
}

@media (max-width: 720px) {
  .app {
    grid-template-columns: 1fr;
    grid-template-areas:
      'header'
      'map'
      'strip';
  }

  .panel-area {
    position: fixed;
    left: 0;
    right: 0;
    bottom: var(--strip-h);
    z-index: 2;
    height: 56px;
    transition: height 200ms ease;
  }

  .panel {
    border-left: none;
    border-top: 1px solid var(--line);
    border-radius: 12px 12px 0 0;
    padding-top: 0;
  }

  .panel-area:has(.panel.is-open) {
    height: 60vh;
  }

  .sheet-handle {
    display: block;
    width: 100%;
    height: 22px;
    border: none;
    background: transparent;
    position: relative;
  }

  .sheet-handle::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 8px;
    width: 40px;
    height: 4px;
    margin-left: -20px;
    border-radius: 2px;
    background: var(--muted);
  }
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test && npm run test:e2e`
Expected: all unit tests pass; 8 E2E tests pass.

- [ ] **Step 6: Manual check**

Run: `npm run dev`. Check on desktop: hovering a list row grows its pin on the map and the reverse; clicking a pin opens the card; "Read more on Wikipedia" opens a new tab; at full zoom-out the subtitle says 100 years, after zooming in it shrinks to 10. Then use the browser's device toolbar at 390px width: the panel is a bottom sheet above the strip, tapping or swiping the handle opens and closes it, and selecting a pin opens it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: around-this-time event panel with event cards and mobile sheet"
```

---

### Task 11: About overlay and credits

**Files:**
- Create: `src/components/About.tsx`, `e2e/about.spec.ts`
- Modify: `src/App.tsx`, `src/styles.css` (append)

**Interfaces:**
- Produces: `About` props `{ onClose(): void }`; header button with accessible name "About"; dialog role `dialog` named "About The Greatest History".

- [ ] **Step 1: Write the failing E2E test**

`e2e/about.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('About explains the borders and credits the data sources', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'About' }).click();
  const dialog = page.getByRole('dialog', { name: 'About The Greatest History' });
  await expect(dialog).toContainText('approximate');
  await expect(dialog).toContainText('historical-basemaps');
  await expect(dialog).toContainText('GPL-3.0');
  await expect(dialog).toContainText('Natural Earth');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
```

Run: `npm run test:e2e -- e2e/about.spec.ts`
Expected: FAIL (no About button).

- [ ] **Step 2: Write `src/components/About.tsx`**

```tsx
import { useEffect } from 'react';

export function About({ onClose }: { onClose(): void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="about-backdrop" onClick={onClose}>
      <div
        className="about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="about-title">About The Greatest History</h2>
        <p>
          The most influential events from 2000 BC to AD 2000 on one map, so you can see what was happening in
          different parts of the world at the same time. Drag the timeline, scroll to zoom, or press play.
        </p>
        <p>
          Borders are approximate. Before the modern era most states had no fixed frontiers, and many overlapped.
          Treat the shaded areas as a rough picture of who held sway, not a precise map.
        </p>
        <h3>Sources</h3>
        <ul>
          <li>
            Historical borders:{' '}
            <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noreferrer">
              historical-basemaps
            </a>{' '}
            by André Ourednik and contributors, GPL-3.0.
          </li>
          <li>
            Land, lakes and rivers:{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
              Natural Earth
            </a>{' '}
            (public domain).
          </li>
          <li>Map labels: Open Sans (Apache License 2.0). Map rendering: MapLibre GL JS.</li>
          <li>Event descriptions link to Wikipedia for further reading.</li>
        </ul>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `src/App.tsx`**

1. Change the React import to `import { useMemo, useState } from 'react';` and add `import { About } from './components/About';`.
2. At the top of `App`, add `const [aboutOpen, setAboutOpen] = useState(false);`.
3. Replace the header with:
```tsx
      <header className="app-header">
        <h1>The Greatest History</h1>
        <button onClick={() => setAboutOpen(true)}>About</button>
      </header>
```
4. Just before the closing `</div>` of `.app`, add:
```tsx
      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
```

- [ ] **Step 4: Append styles to `src/styles.css`**

```css
.about-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(0 0 0 / 0.55);
}

.about {
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px 24px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  line-height: 1.55;
}

.about h2 {
  margin-top: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
}

.about a {
  color: var(--accent);
}
```

- [ ] **Step 5: Run all tests**

Run: `npm test && npm run test:e2e`
Expected: all pass (9 E2E tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: About overlay with border disclaimer and data credits"
```

---

### Content tasks (12-15): shared instructions

Each content task adds the events listed in its table to the given file, plus the eras listed, then validates. The event and era lists below were chosen for global balance and are what the owner reviews in this plan; the summaries are written during the task.

**For every event, write a full record** following `src/data/schema.ts`:
- `id`, `year`, `endYear`, `title`, `region`, `category`, `importance` exactly as in the table (`endYear` is `null` when the table shows `-`).
- `dateLabel`: set it when the date is approximate (`"c. 1600 BC"`), traditional or disputed (`"c. 528 BC (traditional)"`), or more precise than a year (`"15 March 44 BC"`). Omit it when the plain year (or span) is accurate.
- `location`: the place most associated with the event (capital, battle site, city), with `lat`/`lng` to 2 decimals. For migrations and long processes, use a representative point and name it (for example "Lake Chad basin").
- `summary`: 2-3 plain sentences in the present tense for a curious non-expert: who did what, where. No jargon without a short explanation.
- `significance`: 1-2 sentences on why it mattered for the world or the region afterward.
- `wikipedia`: the English Wikipedia article that best covers the event. Use `%27` for apostrophes.
- Never use the em dash. Prefer neutral, well-established framing; where dates or historicity are disputed, say so briefly in the summary.

**Per task steps:**

- [ ] **Step 1:** Add the records to the events file (keep existing seed records; keep the array sorted by `year`, then `id`).
- [ ] **Step 2:** Add the eras to `data/eras.json` (keep the array sorted by `start`).
- [ ] **Step 3:** Run `npm run validate`. Expected: `data OK: <n> events, <m> eras` with the counts given in the task. Fix every reported problem.
- [ ] **Step 4:** Run `npm run check-links`. Expected: `all <n> Wikipedia links OK`. Replace any 404 link; for redirects, switch to the target article it prints.
- [ ] **Step 5:** Run `npm test`. Expected: PASS (the real-data validation test included).
- [ ] **Step 6:** Spot-check in `npm run dev`: scrub through the period and confirm every region with events shows them, pins land in the right places, and era bands do not overflow into more than 3 rows per region.
- [ ] **Step 7:** Commit with `git add data && git commit -m "content: <period> events and eras"`.

The link checker is created in Task 12 Step 0.

---

### Task 12: Content, 2000 BC - 1001 BC

**Files:**
- Create: `scripts/check-wikipedia.ts`
- Modify: `data/events/2000bc-1001bc.json`, `data/eras.json`

- [ ] **Step 0: Write the Wikipedia link checker**

`scripts/check-wikipedia.ts`:
```ts
import { loadDataFiles } from './loadDataFiles';

const CONCURRENCY = 4;
const { eventFiles } = loadDataFiles();
const events = eventFiles.flatMap((f) => f.records as { id: string; wikipedia: string }[]);

const problems: string[] = [];
let next = 0;
async function worker(): Promise<void> {
  while (next < events.length) {
    const { id, wikipedia } = events[next++];
    const res = await fetch(wikipedia, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'User-Agent': 'TheGreatestHistory/0.1 (personal history timeline; link check)' },
    });
    if (res.status >= 300 && res.status < 400) {
      problems.push(`${id}: redirects to ${res.headers.get('location')}`);
    } else if (!res.ok) {
      problems.push(`${id}: HTTP ${res.status} for ${wikipedia}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`all ${events.length} Wikipedia links OK`);
```

Run: `npm run check-links`
Expected: `all 8 Wikipedia links OK`. Commit: `git add scripts/check-wikipedia.ts && git commit -m "chore: Wikipedia link checker"`.

Then follow the shared content steps with these lists.

**Events** (the seed `code-of-hammurabi` and `shang-dynasty-founded` already exist):

| id | year | endYear | title | region | category | imp |
|---|---|---|---|---|---|---|
| sintashta-chariot | -2000 | - | Spoked-wheel chariot invented | central-asia | science | 3 |
| assyrian-trade-kanesh | -1900 | - | Assyrian merchants trade at Kanesh | mena | trade | 1 |
| indus-valley-decline | -1900 | -1300 | Decline of the Indus Valley Civilization | south-asia | politics | 3 |
| epic-of-gilgamesh | -1800 | - | Epic of Gilgamesh written down | mena | culture | 2 |
| poverty-point | -1700 | - | Poverty Point earthworks built | americas | culture | 1 |
| knossos-palace-height | -1700 | - | Minoan palace of Knossos at its height | europe | culture | 2 |
| kerma-kingdom-height | -1700 | - | Kingdom of Kerma at its height | sub-saharan-africa | politics | 2 |
| andronovo-culture | -1700 | - | Andronovo culture spreads across the steppe | central-asia | culture | 1 |
| hittite-old-kingdom | -1650 | - | Hittite kingdom founded | mena | politics | 2 |
| mycenaean-greece-rises | -1600 | - | Mycenaean civilization rises | europe | politics | 2 |
| nebra-sky-disc | -1600 | - | Nebra sky disc made | europe | science | 1 |
| hittites-sack-babylon | -1595 | - | Hittites sack Babylon | mena | politics | 1 |
| egypt-new-kingdom | -1550 | - | Egypt's New Kingdom begins | mena | politics | 2 |
| rigveda-composed | -1500 | -1200 | Rigveda composed | south-asia | religion | 3 |
| indo-aryan-migrations | -1500 | - | Indo-Aryan migrations into South Asia | south-asia | trade | 2 |
| lapita-expansion | -1500 | - | Lapita voyagers begin settling the Pacific | southeast-asia-oceania | trade | 3 |
| ban-chiang-bronze | -1500 | - | Bronze working at Ban Chiang | southeast-asia-oceania | science | 1 |
| thutmose-conquers-kush | -1504 | - | Egypt conquers Kush | sub-saharan-africa | politics | 1 |
| hatshepsut-pharaoh | -1479 | - | Hatshepsut becomes pharaoh | mena | politics | 2 |
| punt-expedition | -1470 | - | Hatshepsut's expedition to Punt | sub-saharan-africa | trade | 1 |
| battle-of-megiddo | -1457 | - | Battle of Megiddo | mena | politics | 1 |
| akhenaten-aten | -1353 | - | Akhenaten's religious revolution | mena | religion | 2 |
| tutankhamun-burial | -1323 | - | Tutankhamun buried | mena | culture | 1 |
| battle-of-kadesh | -1274 | - | Battle of Kadesh | mena | politics | 2 |
| egyptian-hittite-treaty | -1259 | - | Egyptian-Hittite peace treaty | mena | politics | 2 |
| oracle-bone-script | -1250 | - | Oracle bone script, earliest Chinese writing | east-asia | culture | 3 |
| late-bronze-age-collapse | -1200 | -1150 | Late Bronze Age collapse | mena | politics | 3 |
| iron-working-spreads | -1200 | - | Iron working spreads | mena | science | 3 |
| olmec-civilization | -1200 | - | Olmec civilization emerges | americas | culture | 3 |
| zoroaster | -1200 | - | Zoroaster founds Zoroastrianism | central-asia | religion | 2 |
| sea-peoples-defeated | -1177 | - | Ramesses III defeats the Sea Peoples | mena | politics | 1 |
| phoenician-alphabet | -1050 | - | Phoenician alphabet | mena | culture | 3 |
| zhou-conquer-shang | -1046 | - | Zhou overthrow the Shang | east-asia | politics | 3 |

Notes: `zoroaster` needs `dateLabel` "c. 1500-1000 BC (disputed)"; mark approximate dates with "c.".

**Eras:**

| id | name | start | end | region |
|---|---|---|---|---|
| minoan | Minoan civilization | -2000 | -1450 | europe |
| mycenaean | Mycenaean Greece | -1600 | -1100 | europe |
| egypt-middle-kingdom | Egyptian Middle Kingdom | -2000 | -1650 | mena |
| hittite-empire | Hittite Empire | -1650 | -1178 | mena |
| egypt-new-kingdom | Egyptian New Kingdom | -1550 | -1070 | mena |
| kerma | Kingdom of Kerma | -2000 | -1500 | sub-saharan-africa |
| andronovo | Andronovo culture | -2000 | -900 | central-asia |
| late-harappan | Late Harappan period | -2000 | -1300 | south-asia |
| vedic-period | Vedic period | -1500 | -500 | south-asia |
| xia | Xia dynasty (traditional) | -2000 | -1600 | east-asia |
| zhou | Zhou dynasty | -1046 | -256 | east-asia |
| lapita | Lapita culture | -1600 | -500 | southeast-asia-oceania |
| olmec | Olmec civilization | -1200 | -400 | americas |

(`egypt-middle-kingdom`, `kerma` and `xia` began before 2000 BC; their `start` is clamped to the range.)

Expected validate counts after this task: `41 events, 19 eras`.

---

### Task 13: Content, 1000 BC - 1 BC

**Files:** Modify `data/events/1000bc-1bc.json`, `data/eras.json`

Follow the shared content steps.

**Events** (seed `qin-unifies-china` and `caesar-assassination` already exist):

| id | year | endYear | title | region | category | imp |
|---|---|---|---|---|---|---|
| bantu-expansion | -1000 | 500 | Bantu expansion | sub-saharan-africa | trade | 3 |
| dong-son-culture | -1000 | - | Dong Son bronze culture | southeast-asia-oceania | culture | 2 |
| first-temple-jerusalem | -957 | - | First Temple built in Jerusalem | mena | religion | 2 |
| neo-assyrian-empire | -911 | - | Neo-Assyrian Empire rises | mena | politics | 3 |
| chavin-culture | -900 | - | Chavin culture and temple | americas | religion | 2 |
| lapita-reach-tonga-samoa | -850 | - | Lapita settlers reach Tonga and Samoa | southeast-asia-oceania | trade | 2 |
| carthage-founded | -814 | - | Carthage founded | mena | trade | 2 |
| upanishads | -800 | - | Early Upanishads composed | south-asia | religion | 2 |
| greek-alphabet | -800 | - | Greeks adopt the alphabet | europe | culture | 2 |
| adena-culture | -800 | - | Adena mound-building culture | americas | culture | 1 |
| first-olympic-games | -776 | - | First recorded Olympic Games | europe | culture | 2 |
| eastern-zhou | -770 | - | Zhou court moves east | east-asia | politics | 1 |
| founding-of-rome | -753 | - | Founding of Rome (traditional) | europe | politics | 2 |
| homer-epics | -750 | - | Homer's Iliad and Odyssey | europe | culture | 3 |
| kush-conquers-egypt | -744 | - | Kush conquers Egypt | sub-saharan-africa | politics | 2 |
| library-of-ashurbanipal | -668 | - | Library of Ashurbanipal | mena | culture | 2 |
| lydian-coins | -630 | - | First coins minted in Lydia | mena | trade | 3 |
| fall-of-nineveh | -612 | - | Fall of Nineveh | mena | politics | 2 |
| mahavira-jainism | -599 | - | Mahavira and Jainism | south-asia | religion | 2 |
| kush-capital-meroe | -590 | - | Kush moves its capital to Meroe | sub-saharan-africa | politics | 2 |
| babylonian-exile | -587 | - | Babylon destroys Jerusalem; exile begins | mena | religion | 2 |
| cyrus-founds-persia | -550 | - | Cyrus the Great founds the Persian Empire | mena | politics | 3 |
| cyrus-takes-babylon | -539 | - | Cyrus takes Babylon | mena | politics | 2 |
| buddha-enlightenment | -528 | - | The Buddha's enlightenment | south-asia | religion | 3 |
| roman-republic-founded | -509 | - | Roman Republic founded | europe | politics | 3 |
| athenian-democracy | -508 | - | Athenian democracy | europe | politics | 3 |
| confucius | -500 | - | Confucius teaches | east-asia | religion | 3 |
| laozi-tao-te-ching | -500 | - | Laozi and the Tao Te Ching | east-asia | religion | 2 |
| sun-tzu-art-of-war | -500 | - | Sun Tzu's Art of War | east-asia | culture | 1 |
| monte-alban-founded | -500 | - | Zapotecs found Monte Alban | americas | politics | 2 |
| nok-culture | -500 | - | Nok terracottas and iron smelting | sub-saharan-africa | culture | 2 |
| battle-of-marathon | -490 | - | Battle of Marathon | europe | politics | 2 |
| battle-of-salamis | -480 | - | Battles of Thermopylae and Salamis | europe | politics | 2 |
| warring-states | -475 | - | Warring States period begins | east-asia | politics | 2 |
| parthenon-built | -447 | -432 | Parthenon built | europe | culture | 2 |
| peloponnesian-war | -431 | -404 | Peloponnesian War | europe | politics | 1 |
| death-of-socrates | -399 | - | Death of Socrates | europe | religion | 2 |
| plato-academy | -387 | - | Plato founds the Academy | europe | religion | 2 |
| aristotle-lyceum | -335 | - | Aristotle founds the Lyceum | europe | science | 2 |
| alexander-conquers-persia | -334 | -323 | Alexander the Great conquers Persia | mena | politics | 3 |
| alexandria-founded | -331 | - | Alexandria founded | mena | culture | 2 |
| alexander-in-india | -326 | - | Alexander reaches India | south-asia | politics | 1 |
| maurya-empire-founded | -322 | - | Chandragupta founds the Maurya Empire | south-asia | politics | 3 |
| yayoi-rice-farming | -300 | - | Yayoi culture brings rice farming to Japan | east-asia | science | 1 |
| euclid-elements | -300 | - | Euclid's Elements | mena | science | 3 |
| el-mirador | -300 | - | Maya city of El Mirador flourishes | americas | politics | 2 |
| ashoka-buddhism | -260 | - | Ashoka embraces Buddhism | south-asia | religion | 3 |
| first-punic-war | -264 | -241 | First Punic War | europe | politics | 1 |
| archimedes | -250 | - | Archimedes at Syracuse | europe | science | 2 |
| greco-bactrian-kingdom | -250 | - | Greco-Bactrian Kingdom | central-asia | politics | 1 |
| parthian-empire-founded | -247 | - | Parthian Empire founded | mena | politics | 2 |
| hannibal-crosses-alps | -218 | - | Hannibal crosses the Alps | europe | politics | 2 |
| great-wall-qin | -214 | - | Qin builds the first Great Wall | east-asia | science | 2 |
| xiongnu-confederation | -209 | - | Modu Chanyu unites the Xiongnu | central-asia | politics | 2 |
| han-dynasty-founded | -206 | - | Han dynasty founded | east-asia | politics | 3 |
| rome-destroys-carthage | -146 | - | Rome destroys Carthage and Corinth | europe | politics | 2 |
| silk-road-opens | -138 | -126 | Zhang Qian's journeys open the Silk Road | central-asia | trade | 3 |
| han-conquers-nanyue | -111 | - | Han conquers Nanyue | southeast-asia-oceania | politics | 1 |
| teotihuacan-founded | -100 | - | Teotihuacan founded | americas | politics | 2 |
| antikythera-mechanism | -100 | - | Antikythera mechanism | europe | science | 1 |
| sima-qian-shiji | -94 | - | Sima Qian completes the Records of the Grand Historian | east-asia | culture | 2 |
| julian-calendar | -46 | - | Julian calendar introduced | europe | science | 2 |
| battle-of-actium | -31 | - | Battle of Actium | europe | politics | 2 |
| cleopatra-death | -30 | - | Death of Cleopatra; Rome annexes Egypt | mena | politics | 2 |
| augustus-first-emperor | -27 | - | Augustus becomes the first Roman emperor | europe | politics | 3 |
| birth-of-jesus | -4 | - | Birth of Jesus | mena | religion | 3 |

Notes: `buddha-enlightenment` dateLabel "c. 528 BC (traditional; dates disputed)"; `confucius` dateLabel "c. 500 BC (551-479 BC)"; `laozi-tao-te-ching` and `founding-of-rome` should say the dates are traditional; `birth-of-jesus` dateLabel "c. 6-4 BC".

**Eras:**

| id | name | start | end | region |
|---|---|---|---|---|
| classical-greece | Classical Greece | -510 | -323 | europe |
| neo-assyrian | Neo-Assyrian Empire | -911 | -609 | mena |
| neo-babylonian | Neo-Babylonian Empire | -626 | -539 | mena |
| achaemenid | Achaemenid Persian Empire | -550 | -330 | mena |
| ptolemaic-egypt | Ptolemaic Egypt | -305 | -30 | mena |
| seleucid | Seleucid Empire | -312 | -63 | mena |
| parthian | Parthian Empire | -247 | 224 | mena |
| kush | Kingdom of Kush | -1070 | 350 | sub-saharan-africa |
| nok | Nok culture | -1000 | 300 | sub-saharan-africa |
| scythians | Scythians | -800 | 300 | central-asia |
| xiongnu | Xiongnu | -209 | 93 | central-asia |
| maurya | Maurya Empire | -322 | -185 | south-asia |
| qin | Qin dynasty | -221 | -206 | east-asia |
| dong-son | Dong Son culture | -1000 | 43 | southeast-asia-oceania |
| chavin | Chavin culture | -900 | -200 | americas |
| teotihuacan | Teotihuacan | -100 | 550 | americas |

Expected validate counts after this task: `107 events, 35 eras`.

---

### Task 14: Content, AD 1 - AD 1000

**Files:** Modify `data/events/ad1-ad1000.json`, `data/eras.json`

Follow the shared content steps.

**Events** (seed `fall-of-western-roman-empire` and `tang-dynasty-founded` already exist):

| id | year | endYear | title | region | category | imp |
|---|---|---|---|---|---|---|
| crucifixion-of-jesus | 30 | - | Crucifixion of Jesus | mena | religion | 3 |
| kushan-empire | 30 | - | Kushan Empire rises | central-asia | politics | 2 |
| roman-conquest-britain | 43 | - | Roman conquest of Britain | europe | politics | 1 |
| buddhism-reaches-china | 68 | - | Buddhism reaches China | east-asia | religion | 2 |
| destruction-second-temple | 70 | - | Destruction of the Second Temple | mena | religion | 2 |
| pompeii-vesuvius | 79 | - | Vesuvius buries Pompeii | europe | culture | 1 |
| aksum-rises | 100 | - | Kingdom of Aksum rises | sub-saharan-africa | trade | 2 |
| funan-kingdom | 100 | - | Kingdom of Funan | southeast-asia-oceania | trade | 2 |
| moche-culture | 100 | - | Moche culture | americas | culture | 1 |
| nazca-lines | 100 | - | Nazca Lines | americas | culture | 1 |
| cai-lun-paper | 105 | - | Cai Lun improves papermaking | east-asia | science | 3 |
| roman-empire-greatest-extent | 117 | - | Roman Empire at its greatest extent | europe | politics | 2 |
| ptolemy-almagest | 150 | - | Ptolemy's Almagest | mena | science | 2 |
| yellow-turban-rebellion | 184 | - | Yellow Turban Rebellion | east-asia | politics | 1 |
| teotihuacan-pyramid-sun | 200 | - | Pyramid of the Sun at Teotihuacan | americas | culture | 2 |
| han-falls-three-kingdoms | 220 | - | Han dynasty falls; Three Kingdoms | east-asia | politics | 2 |
| sasanian-empire-founded | 224 | - | Sasanian Empire founded | mena | politics | 2 |
| classic-maya-period | 250 | - | Classic Maya period begins | americas | politics | 3 |
| kofun-japan | 250 | - | Kofun period in Japan | east-asia | politics | 1 |
| ghana-empire-rises | 300 | - | Ghana Empire rises | sub-saharan-africa | trade | 2 |
| edict-of-milan | 313 | - | Edict of Milan | europe | religion | 3 |
| gupta-empire-founded | 320 | - | Gupta Empire founded | south-asia | politics | 3 |
| council-of-nicaea | 325 | - | Council of Nicaea | mena | religion | 2 |
| constantinople-founded | 330 | - | Constantinople founded | europe | politics | 2 |
| aksum-christianity | 330 | - | Aksum adopts Christianity | sub-saharan-africa | religion | 2 |
| huns-cross-volga | 375 | - | Huns move west; Migration Period begins | central-asia | politics | 2 |
| visigoths-sack-rome | 410 | - | Visigoths sack Rome | europe | politics | 2 |
| nalanda-founded | 427 | - | Nalanda university founded | south-asia | culture | 2 |
| aryabhata | 499 | - | Aryabhata's astronomy and mathematics | south-asia | science | 3 |
| justinian-code | 529 | - | Code of Justinian | europe | politics | 2 |
| hagia-sophia | 537 | - | Hagia Sophia completed | europe | culture | 2 |
| plague-of-justinian | 541 | - | Plague of Justinian | europe | politics | 2 |
| buddhism-reaches-japan | 552 | - | Buddhism reaches Japan | east-asia | religion | 1 |
| gokturk-khaganate | 552 | - | Gokturk Khaganate founded | central-asia | politics | 2 |
| tiwanaku-wari | 600 | - | Tiwanaku and Wari states | americas | politics | 2 |
| sui-grand-canal | 605 | - | Sui dynasty builds the Grand Canal | east-asia | science | 2 |
| harsha-empire | 606 | - | Harsha's empire in North India | south-asia | politics | 1 |
| muhammad-first-revelation | 610 | - | Muhammad's first revelation | mena | religion | 3 |
| hijra | 622 | - | The Hijra to Medina | mena | religion | 3 |
| early-islamic-conquests | 632 | 661 | Early Islamic conquests | mena | politics | 3 |
| taika-reforms | 645 | - | Taika reforms in Japan | east-asia | politics | 1 |
| srivijaya-rises | 650 | - | Srivijaya maritime empire rises | southeast-asia-oceania | trade | 2 |
| umayyad-caliphate | 661 | - | Umayyad Caliphate founded | mena | politics | 2 |
| kanem-empire | 700 | - | Kanem Empire | sub-saharan-africa | trade | 1 |
| umayyad-conquest-iberia | 711 | - | Umayyad conquest of Iberia | europe | politics | 2 |
| arab-conquest-sindh | 712 | - | Arab conquest of Sindh | south-asia | politics | 1 |
| battle-of-tours | 732 | - | Battle of Tours | europe | politics | 1 |
| abbasid-caliphate | 750 | - | Abbasid Caliphate founded | mena | politics | 3 |
| battle-of-talas | 751 | - | Battle of Talas | central-asia | politics | 2 |
| an-lushan-rebellion | 755 | - | An Lushan Rebellion | east-asia | politics | 2 |
| baghdad-founded | 762 | - | Baghdad founded | mena | trade | 2 |
| lindisfarne-viking-age | 793 | - | Viking raid on Lindisfarne | europe | politics | 2 |
| borobudur | 800 | - | Borobudur built | southeast-asia-oceania | religion | 2 |
| charlemagne-crowned | 800 | - | Charlemagne crowned emperor | europe | politics | 3 |
| khmer-empire-founded | 802 | - | Khmer Empire founded | southeast-asia-oceania | politics | 2 |
| al-khwarizmi-algebra | 820 | - | Al-Khwarizmi and algebra | mena | science | 3 |
| gunpowder | 850 | - | Gunpowder discovered | east-asia | science | 3 |
| chaco-canyon | 850 | - | Chaco Canyon great houses | americas | culture | 1 |
| diamond-sutra | 868 | - | Diamond Sutra, oldest dated printed book | east-asia | science | 2 |
| kievan-rus | 882 | - | Kievan Rus founded | europe | politics | 2 |
| classic-maya-collapse | 900 | - | Classic Maya collapse | americas | politics | 2 |
| polynesians-settle-hawaii | 900 | - | Polynesians settle Hawaii | southeast-asia-oceania | trade | 2 |
| fatimid-caliphate | 909 | - | Fatimid Caliphate founded | mena | politics | 1 |
| song-dynasty-founded | 960 | - | Song dynasty founded | east-asia | politics | 2 |
| holy-roman-empire | 962 | - | Holy Roman Empire founded | europe | politics | 2 |
| rajaraja-chola | 985 | - | Rajaraja Chola expands the Chola Empire | south-asia | politics | 2 |
| norse-vinland | 1000 | - | Norse reach Vinland | americas | trade | 2 |

**Eras:**

| id | name | start | end | region |
|---|---|---|---|---|
| byzantine | Byzantine Empire | 330 | 1453 | europe |
| carolingian | Carolingian Empire | 800 | 888 | europe |
| viking-age | Viking Age | 793 | 1066 | europe |
| sasanian | Sasanian Empire | 224 | 651 | mena |
| rashidun | Rashidun Caliphate | 632 | 661 | mena |
| umayyad | Umayyad Caliphate | 661 | 750 | mena |
| abbasid | Abbasid Caliphate | 750 | 1258 | mena |
| aksum | Kingdom of Aksum | 100 | 940 | sub-saharan-africa |
| ghana | Ghana Empire | 300 | 1200 | sub-saharan-africa |
| kushan | Kushan Empire | 30 | 375 | central-asia |
| gokturk | Gokturk Khaganate | 552 | 744 | central-asia |
| gupta | Gupta Empire | 320 | 550 | south-asia |
| chola | Chola Empire | 848 | 1279 | south-asia |
| three-kingdoms | Three Kingdoms | 220 | 280 | east-asia |
| sui | Sui dynasty | 581 | 618 | east-asia |
| heian | Heian Japan | 794 | 1185 | east-asia |
| song | Song dynasty | 960 | 1279 | east-asia |
| funan | Funan | 50 | 550 | southeast-asia-oceania |
| srivijaya | Srivijaya | 650 | 1377 | southeast-asia-oceania |
| khmer | Khmer Empire | 802 | 1431 | southeast-asia-oceania |
| classic-maya | Classic Maya | 250 | 900 | americas |
| moche | Moche culture | 100 | 700 | americas |
| tiwanaku | Tiwanaku | 500 | 1000 | americas |

Expected validate counts after this task: `174 events, 58 eras`.

---

### Task 15: Content, AD 1001 - AD 2000

**Files:** Modify `data/events/ad1001-ad2000.json`, `data/eras.json`

Follow the shared content steps.

**Events** (seed `gutenberg-printing-press` and `apollo-11-moon-landing` already exist):

| id | year | endYear | title | region | category | imp |
|---|---|---|---|---|---|---|
| mahmud-of-ghazni | 1001 | 1027 | Mahmud of Ghazni raids India | south-asia | politics | 1 |
| avicenna-canon | 1025 | - | Avicenna's Canon of Medicine | mena | science | 2 |
| great-schism | 1054 | - | Great Schism between East and West | europe | religion | 2 |
| norman-conquest | 1066 | - | Norman conquest of England | europe | politics | 2 |
| battle-of-manzikert | 1071 | - | Battle of Manzikert | mena | politics | 2 |
| university-of-bologna | 1088 | - | University of Bologna founded | europe | culture | 2 |
| first-crusade | 1096 | 1099 | First Crusade | mena | religion | 2 |
| great-zimbabwe | 1100 | - | Great Zimbabwe built | sub-saharan-africa | trade | 2 |
| angkor-wat | 1113 | 1150 | Angkor Wat built | southeast-asia-oceania | religion | 2 |
| kamakura-shogunate | 1185 | - | Kamakura shogunate | east-asia | politics | 2 |
| easter-island-moai | 1200 | - | Rapa Nui and the moai | southeast-asia-oceania | culture | 1 |
| genghis-khan-unites-mongols | 1206 | - | Genghis Khan unites the Mongols | central-asia | politics | 3 |
| delhi-sultanate | 1206 | - | Delhi Sultanate founded | south-asia | politics | 2 |
| magna-carta | 1215 | - | Magna Carta | europe | politics | 2 |
| mali-empire-founded | 1235 | - | Sundiata founds the Mali Empire | sub-saharan-africa | politics | 2 |
| mongols-sack-baghdad | 1258 | - | Mongols sack Baghdad | mena | politics | 3 |
| battle-of-ain-jalut | 1260 | - | Battle of Ain Jalut | mena | politics | 1 |
| yuan-conquers-song | 1279 | - | Yuan dynasty conquers the Song | east-asia | politics | 2 |
| majapahit-founded | 1293 | - | Majapahit Empire founded | southeast-asia-oceania | politics | 2 |
| ottoman-state-founded | 1299 | - | Ottoman state founded | mena | politics | 2 |
| mansa-musa-hajj | 1324 | - | Mansa Musa's pilgrimage to Mecca | sub-saharan-africa | trade | 2 |
| tenochtitlan-founded | 1325 | - | Tenochtitlan founded | americas | politics | 2 |
| black-death | 1347 | 1351 | Black Death | europe | politics | 3 |
| ming-dynasty-founded | 1368 | - | Ming dynasty founded | east-asia | politics | 2 |
| timur-conquests | 1370 | 1405 | Timur's conquests | central-asia | politics | 2 |
| zheng-he-voyages | 1405 | 1433 | Zheng He's treasure voyages | east-asia | trade | 2 |
| inca-empire-pachacuti | 1438 | - | Pachacuti builds the Inca Empire | americas | politics | 3 |
| fall-of-constantinople | 1453 | - | Fall of Constantinople | europe | politics | 3 |
| songhai-empire | 1464 | - | Songhai Empire rises | sub-saharan-africa | politics | 2 |
| columbus-reaches-americas | 1492 | - | Columbus reaches the Americas | americas | trade | 3 |
| da-gama-reaches-india | 1498 | - | Vasco da Gama reaches India | south-asia | trade | 2 |
| italian-renaissance | 1500 | - | High Renaissance in Italy | europe | culture | 2 |
| safavid-empire | 1501 | - | Safavid Empire founded | mena | politics | 2 |
| portuguese-take-malacca | 1511 | - | Portuguese take Malacca | southeast-asia-oceania | trade | 1 |
| luther-95-theses | 1517 | - | Luther's Ninety-five Theses | europe | religion | 3 |
| magellan-circumnavigation | 1519 | 1522 | First circumnavigation of the globe | europe | trade | 2 |
| cortes-conquers-aztecs | 1521 | - | Spanish conquest of the Aztec Empire | americas | politics | 3 |
| mughal-empire-founded | 1526 | - | Babur founds the Mughal Empire | south-asia | politics | 3 |
| atlantic-slave-trade | 1526 | 1867 | Transatlantic slave trade | sub-saharan-africa | trade | 3 |
| pizarro-conquers-inca | 1532 | - | Spanish conquest of the Inca Empire | americas | politics | 2 |
| copernicus | 1543 | - | Copernicus puts the Sun at the center | europe | science | 3 |
| manila-galleons | 1571 | - | Manila galleon trade begins | southeast-asia-oceania | trade | 2 |
| songhai-falls | 1591 | - | Morocco defeats Songhai | sub-saharan-africa | politics | 1 |
| east-india-company | 1600 | - | English East India Company founded | europe | trade | 2 |
| tokugawa-shogunate | 1603 | - | Tokugawa shogunate | east-asia | politics | 2 |
| thirty-years-war | 1618 | 1648 | Thirty Years' War | europe | politics | 2 |
| dutch-batavia | 1619 | - | Dutch found Batavia | southeast-asia-oceania | trade | 1 |
| taj-mahal | 1632 | 1653 | Taj Mahal built | south-asia | culture | 2 |
| qing-conquest | 1644 | - | Qing dynasty takes Beijing | east-asia | politics | 2 |
| siege-of-vienna | 1683 | - | Siege of Vienna | europe | politics | 1 |
| newton-principia | 1687 | - | Newton's Principia | europe | science | 3 |
| battle-of-plassey | 1757 | - | Battle of Plassey | south-asia | politics | 2 |
| industrial-revolution | 1760 | 1840 | Industrial Revolution | europe | science | 3 |
| watt-steam-engine | 1769 | - | Watt's steam engine | europe | science | 2 |
| american-independence | 1776 | - | American Declaration of Independence | americas | politics | 3 |
| first-fleet-australia | 1788 | - | First Fleet arrives in Australia | southeast-asia-oceania | politics | 2 |
| french-revolution | 1789 | - | French Revolution | europe | politics | 3 |
| haitian-revolution | 1791 | 1804 | Haitian Revolution | americas | politics | 2 |
| latin-american-independence | 1810 | 1826 | Latin American wars of independence | americas | politics | 2 |
| congress-of-vienna | 1815 | - | Waterloo and the Congress of Vienna | europe | politics | 2 |
| first-opium-war | 1839 | 1842 | First Opium War | east-asia | politics | 2 |
| treaty-of-waitangi | 1840 | - | Treaty of Waitangi | southeast-asia-oceania | politics | 1 |
| revolutions-of-1848 | 1848 | - | Revolutions of 1848 and the Communist Manifesto | europe | politics | 2 |
| indian-rebellion-1857 | 1857 | - | Indian Rebellion of 1857 | south-asia | politics | 2 |
| origin-of-species | 1859 | - | Darwin's On the Origin of Species | europe | science | 3 |
| american-civil-war | 1861 | 1865 | American Civil War | americas | politics | 2 |
| meiji-restoration | 1868 | - | Meiji Restoration | east-asia | politics | 3 |
| suez-canal | 1869 | - | Suez Canal opens | mena | trade | 2 |
| scramble-for-africa | 1884 | - | Berlin Conference and the Scramble for Africa | sub-saharan-africa | politics | 3 |
| wright-brothers | 1903 | - | Wright brothers' first powered flight | americas | science | 2 |
| einstein-relativity | 1905 | - | Einstein's theory of relativity | europe | science | 2 |
| xinhai-revolution | 1911 | - | Xinhai Revolution ends imperial China | east-asia | politics | 2 |
| world-war-i | 1914 | 1918 | World War I | europe | politics | 3 |
| russian-revolution | 1917 | - | Russian Revolution | europe | politics | 3 |
| turkish-republic | 1923 | - | Republic of Turkey founded | mena | politics | 1 |
| penicillin | 1928 | - | Discovery of penicillin | europe | science | 2 |
| great-depression | 1929 | - | Great Depression begins | americas | trade | 2 |
| world-war-ii | 1939 | 1945 | World War II | europe | politics | 3 |
| hiroshima-nagasaki | 1945 | - | Atomic bombings of Hiroshima and Nagasaki | east-asia | politics | 3 |
| united-nations-founded | 1945 | - | United Nations founded | americas | politics | 2 |
| indonesian-independence | 1945 | - | Indonesia declares independence | southeast-asia-oceania | politics | 2 |
| india-independence-partition | 1947 | - | Independence and Partition of India | south-asia | politics | 3 |
| israel-founded | 1948 | - | State of Israel founded | mena | politics | 2 |
| peoples-republic-of-china | 1949 | - | People's Republic of China founded | east-asia | politics | 3 |
| dna-double-helix | 1953 | - | Structure of DNA discovered | europe | science | 2 |
| vietnam-war | 1955 | 1975 | Vietnam War | southeast-asia-oceania | politics | 2 |
| ghana-independence | 1957 | - | Ghana's independence leads African decolonization | sub-saharan-africa | politics | 2 |
| sputnik | 1957 | - | Sputnik, the first satellite | central-asia | science | 2 |
| cuban-missile-crisis | 1962 | - | Cuban Missile Crisis | americas | politics | 2 |
| cultural-revolution | 1966 | 1976 | Cultural Revolution | east-asia | politics | 2 |
| deng-reforms | 1978 | - | Deng Xiaoping's economic reforms | east-asia | trade | 2 |
| iranian-revolution | 1979 | - | Iranian Revolution | mena | politics | 2 |
| fall-of-berlin-wall | 1989 | - | Fall of the Berlin Wall | europe | politics | 3 |
| world-wide-web | 1991 | - | World Wide Web goes public | europe | science | 3 |
| dissolution-of-ussr | 1991 | - | Dissolution of the Soviet Union | europe | politics | 3 |
| rwandan-genocide | 1994 | - | Rwandan genocide | sub-saharan-africa | politics | 2 |
| end-of-apartheid | 1994 | - | End of apartheid in South Africa | sub-saharan-africa | politics | 2 |

Notes: `sputnik` location is Baikonur (Kazakhstan), hence `central-asia`; `magellan-circumnavigation` location is Seville; `atlantic-slave-trade` location is a West African port such as Ouidah.

**Eras:**

| id | name | start | end | region |
|---|---|---|---|---|
| holy-roman-empire | Holy Roman Empire | 962 | 1806 | europe |
| british-empire | British Empire | 1600 | 1997 | europe |
| soviet-union | Soviet Union | 1922 | 1991 | europe |
| seljuk | Seljuk Empire | 1037 | 1194 | mena |
| mamluk | Mamluk Sultanate | 1250 | 1517 | mena |
| ottoman | Ottoman Empire | 1299 | 1922 | mena |
| safavid | Safavid Empire | 1501 | 1736 | mena |
| mali | Mali Empire | 1235 | 1600 | sub-saharan-africa |
| great-zimbabwe | Kingdom of Zimbabwe | 1100 | 1450 | sub-saharan-africa |
| kongo | Kingdom of Kongo | 1390 | 1857 | sub-saharan-africa |
| songhai | Songhai Empire | 1464 | 1591 | sub-saharan-africa |
| mongol-empire | Mongol Empire | 1206 | 1368 | central-asia |
| golden-horde | Golden Horde | 1242 | 1502 | central-asia |
| timurid | Timurid Empire | 1370 | 1507 | central-asia |
| delhi-sultanate | Delhi Sultanate | 1206 | 1526 | south-asia |
| vijayanagara | Vijayanagara Empire | 1336 | 1646 | south-asia |
| mughal | Mughal Empire | 1526 | 1857 | south-asia |
| british-raj | British Raj | 1858 | 1947 | south-asia |
| yuan | Yuan dynasty | 1271 | 1368 | east-asia |
| ming | Ming dynasty | 1368 | 1644 | east-asia |
| qing | Qing dynasty | 1644 | 1912 | east-asia |
| joseon | Joseon Korea | 1392 | 1897 | east-asia |
| tokugawa | Tokugawa Japan | 1603 | 1868 | east-asia |
| prc | People's Republic of China | 1949 | 2000 | east-asia |
| majapahit | Majapahit | 1293 | 1527 | southeast-asia-oceania |
| dutch-east-indies | Dutch East Indies | 1800 | 1949 | southeast-asia-oceania |
| aztec | Aztec Empire | 1428 | 1521 | americas |
| inca | Inca Empire | 1438 | 1533 | americas |
| new-spain | New Spain | 1521 | 1821 | americas |
| united-states | United States | 1776 | 2000 | americas |

(`prc` and `united-states` continue past 2000; their `end` is clamped to the range.)

Expected validate counts after this task: `271 events, 88 eras`.

After this task, also check that no region lane in the strip needs more than 3 rows (step 6). If one does, tell the owner which eras overlap rather than silently dropping any.

---

### Task 16: Serve on the tailnet

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Full verification**

Run: `npm test && npm run test:e2e && npm run check-links`
Expected: all pass.

- [ ] **Step 2: Confirm with the owner, then serve**

Ask the owner before running this, because it changes their Tailscale configuration. Then:

```bash
npm run build
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg "$PWD/dist"
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status
```

Expected: `serve status` shows `https://<mac-mini>.<tailnet>.ts.net` proxying `/` to the `dist` path, tailnet only.

- [ ] **Step 3: Verify from another device**

Ask the owner to open the printed URL on their phone and confirm: the globe loads with borders, the strip scrubs, the bottom sheet opens. Check `curl -sI https://<mac-mini>.<tailnet>.ts.net/` from this Mac returns `200`.

- [ ] **Step 4: Document hosting in `AGENTS.md`**

Append:
```markdown
## Hosting

Served from the Mac mini to the owner's devices over Tailscale (tailnet only):

- `npm run build` - rebuilding updates `dist/` in place; no restart needed.
- `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg "$PWD/dist"` - one-time setup (persists across reboots).
- `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status` - check what is served.
- Making it public later would use `tailscale funnel`; not enabled.
```

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs: hosting over Tailscale"
```
