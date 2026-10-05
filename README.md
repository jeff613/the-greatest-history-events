# The Greatest History

[![CI](https://github.com/jeff613/the-greatest-history-events/actions/workflows/ci.yml/badge.svg)](https://github.com/jeff613/the-greatest-history-events/actions/workflows/ci.yml)

An interactive world map and timeline of history from 2000 BC to AD 2000, built to show what was happening in different parts of the world at the same time.

![The Tang dynasty selected: its territory on the map, its card on the right, and the timeline below](docs/images/screenshot.jpg)

## What it shows

- **One timeline for everything.** Each region has a lane with its states as solid bars, its periods (wars, movements, influential lives) as round-ended pills, and single moments as diamonds above them.
- **A map that follows the year.** Historical borders change as you move through time. Selecting a state highlights its territory; selecting a moment zooms to where it happened.
- **A reading pane.** With nothing selected it lists what was in progress and what happened around the current year. Select an entry for a short description, why it mattered, what it was part of, its key moments, and a Wikipedia link.
- **Shareable links.** The year, zoom and selected entry are kept in the URL.

The content is a curated focus on Europe and Asia, with major turning points elsewhere: about 470 entries in all.

## Getting started

Requires Node.js 20.11 or later.

```sh
git clone https://github.com/jeff613/the-greatest-history-events.git
cd the-greatest-history-events
npm run setup   # install dependencies, download map data, install Playwright's Chromium
npm run dev     # http://localhost:5173
```

`npm run setup` downloads the border and base map data into `public/` (about 50 MB once processed). That data is not stored in this repository.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Validate the data, typecheck, and build to `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright); builds and previews the site first |
| `npm run validate` | Validate everything in `data/` |
| `npm run check-links` | Check that every entry's Wikipedia link resolves |
| `npm run fetch-geo` | Download and correct the border and base map data again |

## Content

All content lives in `data/timeline/`, one JSON file per millennium. Every entry is the same kind of record:

```json
{
  "id": "fall-of-constantinople",
  "kind": "moment",
  "title": "Fall of Constantinople",
  "start": 1453,
  "end": null,
  "dateLabel": "29 May 1453",
  "region": "europe",
  "category": "politics",
  "importance": 3,
  "location": { "name": "Constantinople (Istanbul)", "lat": 41.02, "lng": 28.94 },
  "summary": "What happened, in two or three sentences.",
  "significance": "Why it mattered, in one or two sentences.",
  "wikipedia": "https://en.wikipedia.org/wiki/Fall_of_Constantinople"
}
```

- `kind` is `state`, `period` or `moment`. A moment has no `end`; a state or period must have one.
- A moment or period can name the states and periods it belongs to: `"partOf": ["byzantine", "ottoman"]`. These links are what the card shows as "Part of" and "Key moments".
- Years are signed integers with no year zero: `-44` is 44 BC.
- `npm run validate` checks every rule and names the file, entry and field when one is broken.

The conventions for working in the code are in [AGENTS.md](AGENTS.md), and the design is described in [docs/superpowers/specs](docs/superpowers/specs).

## Accuracy

Borders are approximate. Before the modern era most states had no fixed frontiers, and many overlapped, so treat the shaded areas as a rough picture of who held sway. The map shows the nearest border snapshot at or before the selected year, not a reconstruction of every year.

The entries are short summaries, and every one links to Wikipedia for further reading. If you find a mistake, please [open an issue](https://github.com/jeff613/the-greatest-history-events/issues).

## Data sources

- Historical borders: [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik and contributors, GPL-3.0, with wrong labels corrected.
- Replacement shapes and five added snapshots: [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) by the Seshat Global History Databank, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), cut to fit the surrounding borders.
- Land, lakes and rivers: [Natural Earth](https://www.naturalearthdata.com/), public domain.
- Type: Cinzel and Cormorant Garamond, SIL Open Font License, with Open Sans (Apache License 2.0) as the fallback for map labels. Map rendering: [MapLibre GL JS](https://maplibre.org/).

These datasets are downloaded by `npm run fetch-geo` and keep their own licenses. A site built from this project includes them, so it must follow their terms.

## License

[MIT](LICENSE) for the code and written content in this repository.
