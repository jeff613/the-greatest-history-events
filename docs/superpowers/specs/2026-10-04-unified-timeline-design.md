# Unified Timeline - Design

Date: 2026-10-04
Status: Built on 2026-10-04. Section 10 records what changed during and after the build.

## 1. Purpose

Today the app splits history in two. Moments (the fall of Constantinople, the birth of Jesus) live in the right pane and as map pins. Periods and states (a war, a dynasty, the Renaissance) live as bands in the bottom timeline. To see the whole picture you have to look in two places, and some things exist twice.

This change makes one timeline that shows both, so that at a glance you can see which moments fall inside which periods and what was happening in parallel across regions.

Success looks like: on the bottom timeline, each region shows its states and periods as bars with its moments as markers above them; selecting anything opens the same kind of card, with a description, why it mattered, what it is part of or what happened inside it, and a Wikipedia link.

Decisions the owner made:

1. A single view replaces the two (not an improvement to one of them).
2. Layout: one horizontal timeline along the bottom; the right pane becomes a reading pane.
3. Rule: anything with an end year is a period; anything on a single date is a moment.
4. Foundings: ordinary ones fold into their state; world-changing ones (importance 3) stay as moments.
5. Every state and period gets a description and significance, like events have.
6. Every record has a Wikipedia link.
7. With nothing selected, the pane shows "At this moment".
8. One collection and one schema, not a merge at load time.

## 2. Data

### 2.1 One record type

All content lives in `data/timeline/<millennium>.json` (same four files as events today, split by the millennium of `start`), replacing `data/eras.json` and `data/events/`. Each file is an array of entries:

```json
{
  "id": "fall-of-constantinople",
  "kind": "moment",
  "title": "Fall of Constantinople",
  "start": 1453,
  "end": null,
  "dateLabel": "29 May 1453",
  "region": "europe",
  "summary": "2-3 sentences.",
  "significance": "1-2 sentences on why it mattered.",
  "wikipedia": "https://en.wikipedia.org/wiki/Fall_of_Constantinople",
  "category": "politics",
  "importance": 3,
  "location": { "name": "Constantinople (Istanbul)", "lat": 41.02, "lng": 28.94 }
}
```

| Kind | `end` | Drawn as | On the map | `location`, `category`, `importance` |
|---|---|---|---|---|
| `state` | required, after `start` | solid bar | its territory when selected | none of them |
| `period` | required, after `start` | dashed bar | a pin if it has a location | all three or none |
| `moment` | must be null | diamond | a pin | all three required |

Required on every entry: `id` (unique kebab-case across all files), `kind`, `title`, `start`, `end`, `region`, `summary`, `significance`, `wikipedia`. `dateLabel` stays optional.

The validator enforces the table. Errors name the file, the id and the field, as today.

### 2.2 Migration (one-off)

A script converts the current data, then is deleted; the result is committed data.

- Every era becomes a `state` (today's `polity` or unset) or a `period`; `name` becomes `title`.
- Every event without `endYear` becomes a `moment`; `year` becomes `start`.
- Every event with `endYear` becomes a `period`, keeping its location, category and importance.
- **Merged duplicates** (one `period` each, with the event's text, place, category and importance):

| Result id | Span | Notes |
|---|---|---|
| `black-death` | 1346-1353 | the pandemic's full course; the event had 1347-1351 for Europe |
| `thirty-years-war` | 1618-1648 | |
| `french-revolution` | 1789-1799 | the event was a single year |
| `industrial-revolution` | 1760-1840 | title "Industrial Revolution" |
| `world-war-i` | 1914-1918 | replaces `world-war-one` |
| `world-war-ii` | 1939-1945 | replaces `world-war-two` |
| `vietnam-war` | 1955-1975 | |
| `an-lushan-rebellion` | 755-763 | |

- **Folded foundings** (importance below 3): the moment is removed and its state or period gets its Wikipedia link where it has none. The fold list is explicit in the migration: Egypt's New Kingdom, Hittite kingdom, Mycenaean Greece, Andronovo, Dong Son, Nok, Chavin, Warring States, Parthian, Xiongnu, Teotihuacan, Kushan, Aksum, Moche, Three Kingdoms, Sasanian, Ghana, Gokturk, Tiwanaku, Srivijaya, Umayyad, Khmer, Song, Holy Roman Empire, Great Zimbabwe, Kamakura, Delhi Sultanate, Mali, Majapahit, Ottoman, Ming, Songhai, Safavid, Tokugawa, Qing.
- Foundings of importance 3 stay as moments (Qin unifies China, Han dynasty founded, Genghis Khan unites the Mongols and so on).
- State ids do not change, so `src/lib/eraTerritory.ts` keeps working. Moment ids do not change, so shared links keep working.

### 2.3 Content

- Every state and period gets a `summary` (2-3 sentences: what it was) and a `significance` (1-2 sentences: why it mattered), written in the past tense like the existing period summaries, plus a Wikipedia link.
- Existing rule: no em dashes anywhere.
- `npm run check-links` checks every entry.

### 2.4 Unchanged

The Europe and Asia focus filter (`isFocusEntry`) applies to entries that have a location, exactly as it applies to events today.

## 3. Timeline strip

Each region lane, top to bottom:

1. **Moments rows** (two label rows): a diamond per moment, coloured by category, sized by importance. A period whose bar is too narrow to carry its name at the current zoom also gets a labelled pill here; its bar stays in place below so the rows do not reshuffle while zooming. Moments that share a year are fanned out a few pixels apart so each can be clicked.
2. **Bars**: states (solid) and periods (dashed), packed into rows as today.

Thinning, by the width of the visible window:

| Window | Moments drawn |
|---|---|
| wider than about 1500 years | importance 3 |
| wider than about 300 years | importance 2 and 3 |
| otherwise | all |

Labels are placed greedily, most important first, then earliest (so they do not shift as the playhead moves), beside the marker or in a row above it, and skipped when they would overlap one already placed. An unlabelled marker still shows its title on hover and opens on click. Bars are never thinned.

Selecting: clicking a bar or a marker selects it, opens its card, and moves the playhead to its `start`. Drag, scrub, play, zoom and the region toggles work as today.

The strip's top edge is a drag handle that resizes the strip between a minimum and most of the screen; the chosen height is remembered for the session.

## 4. Pane

### 4.1 At this moment (nothing selected)

For the playhead year, for each region that is switched on in the strip:

- **In progress**: states and periods whose span contains the year.
- **Around this time**: moments within the zoom-scaled window (as today), most important first, then nearest; five shown with "+N more".

If moments exist in the window in regions that are switched off, one line at the bottom says how many and offers to show those regions. Clicking any line selects that entry.

### 4.2 Card (one for all kinds)

Kind and category; title; dates and place or region; summary; "Why it mattered"; context; Wikipedia link; back to "At this moment".

Context:

- On a moment or a period: **Part of** - the states and periods in the same region whose span contains its start.
- On a state or a period: **Key moments** - the moments, and the periods that began, in the same region inside its span, most important first, five shown with "+N more".
- Every line selects that entry.

Matching is by region only. Cross-region links are out of scope.

## 5. Map, selection and links

- Pins: moments in the window with the existing importance thinning, plus periods with a location while the playhead is inside them. Pins are not filtered by the region toggles.
- Selecting an entry in a region that is switched off switches that region on.
- Selecting a state highlights its territory, as today.
- Hover is linked three ways: pane line, timeline marker or bar, map pin.
- One selection at a time, of any kind: `selectedId` replaces the separate event and era selections. The map's territory selection (clicking a polity) stays separate.
- Moving the playhead (scrubbing or pressing play) clears the selection, so the pane goes back to following the playhead.
- URL: `?item=<id>` for any kind; `?event=<id>` is still read.

## 6. Architecture

| Unit | Responsibility |
|---|---|
| `data/schema.ts` | `entrySchema` (discriminated by `kind`), types `Entry`, `Moment`, `Bar` |
| `data/validate.ts` | per-file validation, unique ids, file range by `start` |
| `data/index.ts` | `ENTRIES`, `ENTRIES_BY_ID`, `MOMENTS`, `BARS`, `isFocusEntry` |
| `lib/slice.ts` | "At this moment": bars in progress and moments in the window, per region |
| `lib/context.ts` | "Part of" and "Key moments" |
| `lib/momentLayout.ts` | which moments are drawn at a zoom, and greedy label placement |
| `lib/packEras.ts` | unchanged apart from the type |
| `components/TimelineStrip` | lanes with moments rows and bars; resize handle |
| `components/EventPanel` | "At this moment" and the card |
| `components/MapView` | pins from moments and placed periods |
| `state/useTimeState` | single `selectedId`; region auto-enable; strip height |

Views still talk only through `useTimeState`.

## 7. Testing

- Unit: schema rules per kind; migration-independent validation; `slice`; `context`; `momentLayout` (thinning thresholds, no overlapping labels, importance order); URL parsing of `item` and `event`.
- E2E: a moment appears on the timeline and opens its card when clicked; the card's "Part of" line opens the state; a state's card lists key moments; "At this moment" lists in-progress bars; existing flows (scrub, pan, zoom, region toggles, territory highlight) still pass.

## 8. Build order

1. Data: schema, migration, validation, loader; the app runs on the new data with the old UI behaviour.
2. Timeline: moments rows, thinning, labels, pills, resize.
3. Pane: "At this moment", the unified card, single selection, links.
4. Content: summaries, significance and links for all states and periods; the validator then requires them.

## 9. Out of scope

Cross-region context links, search, category filters, and moving the map's pins onto region toggles.

## 10. As built

Where the build differs from, or adds to, the sections above.

### 10.1 Differences

- The pane's default view is titled "Around {year}" (section 4.1 calls it "At this moment").
- The strip keeps its own height, in `sessionStorage`, not in `useTimeState`.
- The playhead can only be grabbed on the axis row. Over the lanes it lets clicks through, so that a marker or bar under it can still be selected.
- Moments that share a year sit 16px apart, twice the click radius of a marker.
- `data/index.ts` also exports `PLACED` (entries with a location) and `FOLDED`. An `?event=` link to a folded founding opens the state it was folded into.
- `data/folded.json` holds 31 of the foldings. Five foundings in 2.2 need no mapping because the moment had the same id as its state (Egypt's New Kingdom, Holy Roman Empire, Great Zimbabwe, Kamakura, Delhi Sultanate). One was added later: "Kofun period in Japan" folded into the new Yamato Japan state.

### 10.2 Added after the first build

- **Selecting moves the map.** A moment, or a period with a place, centers the map on it at zoom 4 or closer. A state fits its territory, up to zoom 5. A period without a place, or a state with no territory in the borders, fits its region (`REGION_BOUNDS` in `src/theme.ts`).
- **A card opens at its top.** The pane is one scroll container for the list and every card, so it resets its scroll position whenever the selection changes.
- **Recorded relationships.** "Part of" and "Key moments" no longer match by region and date (section 4.2), which listed unrelated things: the Hundred Years' War appeared as part of the Byzantine Empire. A moment or period now names what it belongs to in an optional `partOf` list of state and period ids, and the two lists come only from those links. Links may cross regions. 249 of the 305 moments and periods have them; an entry with none shows neither list.
- **Periods are pills.** A period is drawn as a round-ended pill in its lane's pigment, not a dashed bar (sections 2.1 and 3), because a dashed outline read as provisional. Each period is drawn once: in its row when its name fits, otherwise as a small labelled pill in the moments rows, with no empty bar left below.
- **East Asia content.** 74 more entries for China, Korea and Japan (19 states, 19 periods, 36 moments), which takes the region from 59 to 132 entries.
- **More states.** 55 major states that were missing, mostly in Europe and the Middle East (the kingdoms of France and England, the Russian line from Kievan Rus to the Russian Empire, the Spanish and Portuguese empires, Carthage, and others), each with a territory on the map. Six founding moments were folded into them. The collection now holds 234 moments, 71 periods and 163 states.

### 10.3 Known gaps

- Summaries and significance text were written from general knowledge and have not been checked against sources. Only the Wikipedia links are verified (`npm run check-links`).
- Lapita and Nok have no territory in either border dataset, so selecting them fits the region.
- The East Asia lane is tall, because China, Korea and Japan share it.
- 56 moments and periods have no `partOf` link, mostly because the state they belong to has no entry yet.
- First load is slow in a very wide window (2560px). Not investigated.

### 10.4 Look

After the build the dark theme was replaced by an ancient-scroll look, chosen from three sketched directions (illuminated manuscript, engraved atlas, ancient scroll). It changes no behaviour or layout. `AGENTS.md` records its conventions under "Look".

### 10.5 Timeline and reading-pane polish (2026-10-08)

- **Shape filters.** States, periods and moments have independent toggle buttons with square-bar, pill and diamond symbols. The controls share a rounded ink-colored group, visually distinct from the region color buttons. Turning all types off shows a prompt to select a type. Selecting an entry from the reading pane enables its type and region.
- **Zoom controls.** The timeline uses only minus and plus buttons, labelled "Timeline zoom" in both languages. Preset buttons, the span dropdown and instructional hint lines were removed. Filters and zoom controls share one row; at timeline container widths of 1100px or less, filters move into an expandable panel above the timeline.
- **Compact regions.** Only bars overlapping the visible time window participate in packing. Periods drawn among the markers reserve no bar row, and regions with no visible markers reserve no marker area. Region order stays fixed while rows repack on zoom, pan and type changes.
- **Reading pane.** Dates appear below entry titles. On phones the pane slides horizontally from the right over the map, stopping above the timeline. Its edge tab supports taps and horizontal swipes, reports its expanded state and stays reachable while the pane scrolls. Closed content is hidden; selecting an entry opens the drawer, and reopening starts at the top.
- **Decorative initials.** English retains the original drop cap. Chinese uses a separate size and line height so the enlarged red first character fits alongside two opening lines.
- **Map overlays.** One compact year label contains play/pause. The repeated timeline year and play control, map event count, border visibility toggle and snapshot information box were removed. Historical borders stay visible; About retains the explanation of approximate snapshots.
- **Phone layout.** Dynamic viewport height accounts for browser chrome. The timeline has more vertical space and a smaller label gutter, while the header is compact. Play/pause uses CSS shapes to avoid emoji rendering.
- **Website icon.** A pixel-art parchment scroll supplies the 32px favicon, 180px Apple touch icon and 512px artwork. Assets live in `public/icons/`; `docs/images/scroll-icon.prompt.txt` records the built-in image-generation prompt.

