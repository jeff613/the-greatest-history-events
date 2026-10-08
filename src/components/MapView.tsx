import type { FeatureCollection, Point } from 'geojson';
import {
  type GeoJSONSource,
  type LayerSpecification,
  type MapLayerMouseEvent,
  MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useRef, useState } from 'react';
import type { Bar, Placed } from '../data/schema';
import { createLatestLoader, neighborSnapshots, snapshotFor, territoryName, type Snapshot } from '../lib/borders';
import { territoryFor } from '../lib/eraTerritory';
import { useLocale } from '../state/LocaleContext';
import mapLabels from '../../data/locales/map.zh.json';
import type { TerritorySelection } from '../state/useTimeState';
import { useLatest } from '../state/useLatest';
import { CATEGORY_COLORS, INK, MAP_COLORS, REGION_BOUNDS } from '../theme';
import cinzelLatinExt from '@fontsource-variable/cinzel/files/cinzel-latin-ext-wght-normal.woff2';
import cinzelLatin from '@fontsource-variable/cinzel/files/cinzel-latin-wght-normal.woff2';

// MapLibre 6 looks for its worker next to its own module, which bundling breaks; let Vite build and serve it.
setWorkerUrl(mapWorkerUrl);

const chineseMapLabels: Record<string, string> = mapLabels;
const translateTerritory = (name: string) => chineseMapLabels[name] ?? name;

const FADE_MS = 300;
/** Close enough to see a place among its neighbors; selecting an entry zooms in at least this far. */
const SPOT_ZOOM = 4;
/** A state's territory fills the map up to this zoom, so that a small one is still seen in context. */
const TERRITORY_MAX_ZOOM = 5;
const BORDER_FILL_OPACITY = 0.55;
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
type Slot = 'a' | 'b';

/** MapLibre fetches from a worker, so asset URLs must be absolute. */
const absolute = (url: string) => new URL(url, window.location.href).href;
const asset = (path: string) => absolute(`${import.meta.env.BASE_URL}${path}`);

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
          'line-width': ['match', ['get', 'BORDERPRECISION'], 3, 1, 2, 0.7, 0.5],
          'line-blur': ['match', ['get', 'BORDERPRECISION'], 3, 0, 2, 0.5, 1.5],
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
        visibility: 'none',
        'text-field': ['get', 'NAME'],
        'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.5,
        'text-font': ['Cinzel'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1,
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9, 5, 13],
        'text-max-width': 8,
      },
      paint: {
        'text-color': MAP_COLORS.label,
        'text-halo-color': MAP_COLORS.labelHalo,
        'text-halo-width': 1.4,
        'text-opacity': 0,
        'text-opacity-transition': fade,
      },
    },
  };
}

/** One tile of the sea: a wavy pen line on the wash, drawn at twice the size it is shown. */
function wavePattern(): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 40;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = MAP_COLORS.ocean;
  ctx.fillRect(0, 0, 96, 40);
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.quadraticCurveTo(24, 6, 48, 20);
  ctx.quadraticCurveTo(72, 34, 96, 20);
  ctx.stroke();
  return ctx.getImageData(0, 0, 96, 40);
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
    projection: { type: 'mercator' },
    // Labels are drawn from the Cinzel files; the glyphs URL only serves characters those lack.
    'font-faces': {
      Cinzel: [
        { url: absolute(cinzelLatin), 'unicode-range': ['U+0000-00FF', 'U+0131-0131', 'U+0152-0153', 'U+2000-206F'] },
        { url: absolute(cinzelLatinExt), 'unicode-range': ['U+0100-0130', 'U+0132-0151', 'U+0154-02FF', 'U+1E00-1EFF'] },
      ],
    },
    glyphs: `${asset('glyphs/')}{fontstack}/{range}.pbf`,
    sources: {
      land: { type: 'geojson', data: asset('basemap/land.geojson') },
      lakes: { type: 'geojson', data: asset('basemap/lakes.geojson') },
      rivers: { type: 'geojson', data: asset('basemap/rivers.geojson') },
      'borders-a': { type: 'geojson', data: EMPTY },
      'borders-b': { type: 'geojson', data: EMPTY },
      territory: { type: 'geojson', data: EMPTY },
      events: { type: 'geojson', data: EMPTY, promoteId: 'id' },
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': MAP_COLORS.ocean } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': MAP_COLORS.land } },
      ...a.fills,
      ...b.fills,
      { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': MAP_COLORS.ocean, 'fill-outline-color': INK } },
      {
        id: 'coast',
        type: 'line',
        source: 'land',
        paint: { 'line-color': INK, 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.9, 6, 1.8] },
      },
      {
        id: 'rivers',
        type: 'line',
        source: 'rivers',
        paint: {
          'line-color': MAP_COLORS.river,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1.5],
        },
      },
      { id: 'territory-fill', type: 'fill', source: 'territory', paint: {
        'fill-color': MAP_COLORS.territory, 'fill-opacity': 0.55,
      } },
      { id: 'territory-outline', type: 'line', source: 'territory', paint: {
        'line-color': INK, 'line-width': 2.5,
      } },
      a.label,
      b.label,
      {
        id: 'pins',
        type: 'circle',
        source: 'events',
        // Where events share a place, the most important one is drawn on top and gets the click.
        layout: { 'circle-sort-key': ['get', 'importance'] },
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
          'circle-stroke-color': INK,
          'circle-stroke-width': ['case', highlighted, 2.5, 1],
        },
      },
    ],
  } as StyleSpecification;
}

function setSlotOpacity(map: MapLibreMap, slot: Slot, visible: boolean): void {
  map.setPaintProperty(`borders-${slot}-fill`, 'fill-opacity', visible ? BORDER_FILL_OPACITY : 0);
  map.setPaintProperty(`borders-${slot}-line`, 'line-opacity', visible ? 0.8 : 0);
  map.setLayoutProperty(`borders-${slot}-label`, 'visibility', visible ? 'visible' : 'none');
  map.setPaintProperty(`borders-${slot}-label`, 'text-opacity', visible ? 1 : 0);
}

function pinsToGeoJson(pins: Placed[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: pins.map((e) => ({
      type: 'Feature',
      properties: { id: e.id, title: e.title, category: e.category, importance: e.importance },
      geometry: { type: 'Point', coordinates: [e.location.lng, e.location.lat] },
    })),
  };
}

interface Props {
  year: number;
  /** The selected state or period; a state has its territory highlighted. */
  selectedBar: Bar | null;
  selectedTerritory: TerritorySelection | null;
  onSelectTerritory(territory: TerritorySelection | null): void;
  pins: Placed[];
  selectedPlaced: Placed | null;
  hoveredId: string | null;
  onHover(id: string | null): void;
  onSelect(id: string): void;
}

export function MapView({ year, selectedBar, selectedTerritory, onSelectTerritory, pins, selectedPlaced, hoveredId, onHover, onSelect }: Props) {
  const { language, text, localize, formatYear } = useLocale();
  const locale = useLatest({ language, localize });
  const territoryLabel = (name: string) => language === 'zh' ? translateTerritory(name) : name;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const territoryPopupRef = useRef<Popup | null>(null);
  const [showBorders, setShowBorders] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState<Snapshot[]>([]);
  const [highlightedRegion, setHighlightedRegion] = useState<string | null>(null);
  const [territoryStatus, setTerritoryStatus] = useState<{ eraId: string; year?: number; status: 'loading' | 'shown' | 'missing' | 'failed' } | null>(null);
  const territoryLoader = useRef(createLatestLoader<FeatureCollection>((file) => fetchJson(asset(`borders/${file}`))));
  const [shownSnapshot, setShownSnapshot] = useState<string | null>(null);
  /** Center and zoom after the last move, published on the element like the other map state. */
  const [settledView, setSettledView] = useState<string | null>(null);
  const callbacks = useLatest({ onHover, onSelect, onSelectTerritory });
  const loader = useRef(createLatestLoader<FeatureCollection>((file) => fetchJson(asset(`borders/${file}`))));
  const activeSlot = useRef<Slot>('a');
  const barSelection = useLatest(selectedBar);
  const bordersVisible = useLatest(showBorders);
  const shownFile = useRef<string | null>(null);
  /** Bumped for every new border target, so a slower earlier swap never fades in after a newer one. */
  const swapSeq = useRef(0);
  const highlight = useRef<{ hover: string | null; selected: string | null }>({ hover: null, selected: null });

  useEffect(() => {
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: containerRef.current!,
        style: buildStyle(),
        center: [45, 30],
        zoom: 1.8,
        renderWorldCopies: false,
        maxPitch: 0,
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: false,
        localIdeographFontFamily: 'Songti SC, Noto Serif CJK SC, SimSun, serif',
      });
    } catch (err) {
      console.error('Map failed to start', err);
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    map.on('load', () => {
      map.addImage('waves', wavePattern(), { pixelRatio: 2 });
      map.setPaintProperty('ocean', 'background-pattern', 'waves');
      setReady(true);
    });
    map.on('moveend', () => {
      const { lng, lat } = map.getCenter();
      setSettledView(`${lng.toFixed(1)},${lat.toFixed(1)},${map.getZoom().toFixed(1)}`);
    });
    const territoryPopup = new Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'territory-popup' });
    territoryPopupRef.current = territoryPopup;
    map.on('movestart', () => territoryPopup.remove());
    const inspectTerritory = (event: { point: { x: number; y: number }; lngLat: { lng: number; lat: number } }) => {
      if (!map.isStyleLoaded()) return;
      const layers = ['pins', ...(bordersVisible.current || barSelection.current ? ['territory-fill'] : []), ...(bordersVisible.current ? [`borders-${activeSlot.current}-fill`] : [])];
      const features = map.queryRenderedFeatures([event.point.x, event.point.y], { layers });
      map.getCanvas().style.cursor = features.length ? 'pointer' : '';
      if (!features.length) {
        territoryPopup.remove();
        return;
      }
      const { layer, properties } = features[0];
      const name = territoryName(properties);
      territoryPopup.setLngLat(event.lngLat).setText(layer.id === 'pins' ? properties.title
        : locale.current.language === 'zh' ? translateTerritory(name) : name).addTo(map);
    };
    map.on('mousemove', inspectTerritory);
    map.on('click', (event) => {
      inspectTerritory(event);
      if (!map.isStyleLoaded()) return;
      const features = map.queryRenderedFeatures(event.point, { layers: ['pins', 'territory-fill',
        ...(bordersVisible.current ? [`borders-${activeSlot.current}-fill`] : [])] });
      if (features[0]?.layer.id === 'pins') return;
      // Timeline empire selections already have a complete highlighted territory.
      if (features[0]?.layer.id === 'territory-fill' && barSelection.current) return;
      const feature = bordersVisible.current ? features[0] : undefined;
      callbacks.current.onSelectTerritory(feature && shownFile.current
        ? { name: territoryName(feature.properties), snapshotFile: shownFile.current } : null);
    });
    map.getCanvas().addEventListener('mouseleave', () => territoryPopup.remove());

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
      territoryPopup.remove();
      territoryPopupRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
      shownFile.current = null;
      activeSlot.current = 'a';
      highlight.current = { hover: null, selected: null };
      setShownSnapshot(null);
    };
  }, [callbacks, locale]);

  useEffect(() => {
    if (ready && mapRef.current) setSlotOpacity(mapRef.current, activeSlot.current, showBorders);
  }, [ready, showBorders]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const visible = !selectedTerritory || showBorders;
    map.setPaintProperty('territory-fill', 'fill-opacity', visible ? 0.55 : 0);
    map.setPaintProperty('territory-outline', 'line-opacity', visible ? 1 : 0);
  }, [ready, selectedTerritory, showBorders]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const slot of ['a', 'b']) {
      map.setLayoutProperty(`borders-${slot}-label`, 'text-field', ['get', language === 'zh' ? 'NAME_ZH' : 'NAME']);
    }
    // MapLibre owns these controls, so update their accessible labels without rebuilding the map.
    for (const [selector, label] of [
      ['.maplibregl-ctrl-zoom-in', text('Zoom in', '放大')],
      ['.maplibregl-ctrl-zoom-out', text('Zoom out', '缩小')],
      ['.maplibregl-canvas', text('Map', '地图')],
    ]) {
      const element = containerRef.current?.querySelector(selector);
      element?.setAttribute('aria-label', label);
      if (element?.tagName === 'BUTTON') element.setAttribute('title', label);
    }
  }, [ready, language, text]);

  useEffect(() => { territoryPopupRef.current?.remove(); }, [year, showBorders, selectedBar, shownSnapshot, language]);

  const snapshotFile = snapshotFor(index, year)?.file ?? null;

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !snapshotFile) return;
    for (const s of neighborSnapshots(index, year)) loader.current.prefetch(s.file);
    const swap = ++swapSeq.current;
    if (snapshotFile === shownFile.current) {
      loader.current.invalidate();
      return;
    }
    loader.current
      .load(snapshotFile)
      .then(async (data) => {
        if (!data || mapRef.current !== map) return;
        const next: Slot = activeSlot.current === 'a' ? 'b' : 'a';
        // setData parses in a worker; fade only once the new borders are actually in the source.
        await (map.getSource(`borders-${next}`) as GeoJSONSource).setData({
          ...data,
          features: data.features.map((feature) => ({
            ...feature, properties: { ...feature.properties, NAME: territoryName(feature.properties ?? {}), NAME_ZH: translateTerritory(territoryName(feature.properties ?? {})) },
          })),
        });
        if (swap !== swapSeq.current || mapRef.current !== map) return;
        setSlotOpacity(map, next, bordersVisible.current);
        setSlotOpacity(map, activeSlot.current, false);
        activeSlot.current = next;
        shownFile.current = snapshotFile;
        setShownSnapshot(snapshotFile);
      })
      .catch((err) => console.warn(`Border snapshot ${snapshotFile} failed to load; keeping the previous one`, err));
    // `year` only matters through snapshotFile and the prefetch neighbors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, snapshotFile, index]);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current!.getSource('events') as GeoJSONSource).setData(pinsToGeoJson(pins.map(localize)));
  }, [ready, pins, localize]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const prev = highlight.current;
    if (prev.hover) map.setFeatureState({ source: 'events', id: prev.hover }, { hover: false });
    if (prev.selected) map.setFeatureState({ source: 'events', id: prev.selected }, { selected: false });
    if (hoveredId) map.setFeatureState({ source: 'events', id: hoveredId }, { hover: true });
    if (selectedPlaced) map.setFeatureState({ source: 'events', id: selectedPlaced.id }, { selected: true });
    highlight.current = { hover: hoveredId, selected: selectedPlaced?.id ?? null };
  }, [ready, pins, hoveredId, selectedPlaced]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedPlaced) return;
    const point: [number, number] = [selectedPlaced.location.lng, selectedPlaced.location.lat];
    map.easeTo({ center: point, zoom: Math.max(map.getZoom(), SPOT_ZOOM), duration: 800 });
  }, [ready, selectedPlaced]);

  // A period with no place of its own belongs to its region as a whole.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || selectedBar?.kind !== 'period' || selectedPlaced) return;
    map.fitBounds(REGION_BOUNDS[selectedBar.region], { padding: 40, duration: 700 });
  }, [ready, selectedBar, selectedPlaced]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let cancelled = false;
    const source = map.getSource('territory') as GeoJSONSource;
    source.setData(EMPTY);
    setHighlightedRegion(null);
    if (selectedTerritory) {
      setTerritoryStatus(null);
      territoryLoader.current.load(selectedTerritory.snapshotFile).then(async (geo) => {
        if (cancelled || !geo || mapRef.current !== map) return;
        await source.setData({ ...geo, features: geo.features.filter((feature) =>
          territoryName(feature.properties ?? {}) === selectedTerritory.name) });
        if (!cancelled && mapRef.current === map) setHighlightedRegion(selectedTerritory.name);
      }).catch((err) => {
        if (!cancelled) console.warn('Selected map territory failed to load', err);
      });
      return () => { cancelled = true; territoryLoader.current.invalidate(); };
    }
    if (!selectedBar || selectedBar.kind === 'period') {
      territoryLoader.current.invalidate();
      setTerritoryStatus(null);
      return;
    }
    setTerritoryStatus({ eraId: selectedBar.id, status: 'loading' });
    if (!index.length) return;
    // Never highlight a predecessor state from before the era. Selecting an era moves the playhead to
    // its start, so try the snapshots within the empire's lifespan from the earliest on.
    const candidates = index.filter((snapshot) => snapshot.year >= selectedBar.start && snapshot.year <= selectedBar.end);
    async function showTerritory() {
      for (const snapshot of candidates) {
        const geo = await territoryLoader.current.load(snapshot.file);
        if (cancelled || !geo || mapRef.current !== map) return;
        const territory = territoryFor(geo, selectedBar!);
        if (!territory.features.length) continue;
        await source.setData(territory);
        if (cancelled || mapRef.current !== map) return;
        const coordinates: number[][] = [];
        const visit = (value: unknown): void => {
          if (!Array.isArray(value)) return;
          if (typeof value[0] === 'number' && typeof value[1] === 'number') coordinates.push(value as number[]);
          else value.forEach(visit);
        };
        for (const feature of territory.features) {
          if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') visit(feature.geometry.coordinates);
        }
        if (coordinates.length) {
          const lngs = coordinates.map((point) => point[0]);
          const lats = coordinates.map((point) => point[1]);
          map!.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 60, maxZoom: TERRITORY_MAX_ZOOM, duration: 700 });
        }
        setTerritoryStatus({ eraId: selectedBar!.id, year: snapshot.year, status: 'shown' });
        return;
      }
      if (cancelled) return;
      // With no territory to show, the state's region is the closest the map can get.
      map!.fitBounds(REGION_BOUNDS[selectedBar!.region], { padding: 40, duration: 700 });
      setTerritoryStatus({ eraId: selectedBar!.id, status: 'missing' });
    }
    showTerritory().catch((err) => {
      if (!cancelled) {
        console.warn('Empire territory failed to load', err);
        setTerritoryStatus({ eraId: selectedBar.id, status: 'failed' });
      }
    });
    return () => { cancelled = true; territoryLoader.current.invalidate(); };
  }, [ready, selectedBar, selectedTerritory, index]);

  const shownYear = index.find((snapshot) => snapshot.file === shownSnapshot)?.year;

  return (
    <div className="map" data-testid="map" data-borders={shownSnapshot ?? undefined}
      data-view={settledView ?? undefined}
      data-region={highlightedRegion ?? undefined}
      data-territory={territoryStatus?.status === 'shown' ? territoryStatus.eraId : undefined}>
      <div className="map-caption">
        <span className="eyebrow">{text('THE WORLD AROUND', '世界此时')}</span>
        <strong>{formatYear(year)}</strong>
        <span>{text(`${pins.length} events on the map`, `地图上有${pins.length}条记录`)}</span>
      </div>
      {!failed && <div className="map-context">
        <button aria-pressed={showBorders} onClick={() => setShowBorders((shown) => !shown)}>
          {showBorders ? text('Historical borders', '历史疆界') : text('Geography only', '仅看地理')}
        </button>
        {selectedTerritory && <p className="territory-caption">
          <strong>{territoryLabel(selectedTerritory.name)}</strong> · {text('Selected territory', '所选疆域')}
          <button aria-label={text('Clear territory selection', '清除疆域选择')} onClick={() => onSelectTerritory(null)}>×</button>
        </p>}
        {selectedBar && <p className="territory-caption">
          <strong>{localize(selectedBar).title}</strong>{' · '}
          {selectedBar.kind === 'period' ? text('Historical period', '历史时期')
            : territoryStatus?.eraId !== selectedBar.id || territoryStatus.status === 'loading' ? text('Loading territory...', '正在加载疆域……')
            : territoryStatus.status === 'shown' ? text(`Highlighted territory: ${formatYear(territoryStatus.year!)}`, `高亮疆域：${formatYear(territoryStatus.year!)}`)
            : territoryStatus.status === 'failed' ? text('Territory could not load. Select the era again to retry.', '无法加载疆域，请重新选择该时期以重试。')
            : text('No matching territory in the available snapshots.', '可用快照中未找到匹配疆域。')}
        </p>}
        <p>{showBorders
          ? shownYear !== undefined ? text(`Border snapshot: ${formatYear(shownYear)}. Approximate areas of influence.`, `疆界快照：${formatYear(shownYear)}。仅示意大致势力范围。`) : text('Loading historical borders...', '正在加载历史疆界……')
          : text('Physical geography without political boundaries.', '仅显示自然地理，不显示政治疆界。')}</p>
        {showBorders && shownYear !== undefined && shownYear !== year && <p>{text('Boundaries between snapshots are not reconstructed.', '未重建各快照年代之间的疆界。')}</p>}
      </div>}
      {failed ? (
        <p className="map-fallback">
          {text('The map needs WebGL, which this browser could not start. The timeline and event list still work.', '地图需要 WebGL，但此浏览器无法启动它。时间轴与事件列表仍可使用。')}
        </p>
      ) : (
        <div ref={containerRef} className="map-canvas" />
      )}
    </div>
  );
}
