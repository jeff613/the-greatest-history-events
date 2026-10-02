import type { FeatureCollection, Point } from 'geojson';
import {
  type GeoJSONSource,
  type LayerSpecification,
  type MapLayerMouseEvent,
  MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useRef, useState } from 'react';
import type { HistoryEvent } from '../data/schema';
import { createLatestLoader, neighborSnapshots, snapshotFor, type Snapshot } from '../lib/borders';
import { useLatest } from '../state/useLatest';
import { CATEGORY_COLORS, MAP_COLORS } from '../theme';

// MapLibre 6 looks for its worker next to its own module, which bundling breaks; let Vite build and serve it.
setWorkerUrl(mapWorkerUrl);

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
  const [shownSnapshot, setShownSnapshot] = useState<string | null>(null);
  const callbacks = useLatest({ onHover, onSelect });
  const loader = useRef(createLatestLoader<FeatureCollection>((file) => fetchJson(asset(`borders/${file}`))));
  const activeSlot = useRef<Slot>('a');
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
        zoom: 1.6,
        attributionControl: false,
      });
    } catch (err) {
      console.error('Map failed to start', err);
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left');
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
      shownFile.current = null;
      activeSlot.current = 'a';
      highlight.current = { hover: null, selected: null };
      setShownSnapshot(null);
    };
  }, [callbacks]);

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
        await (map.getSource(`borders-${next}`) as GeoJSONSource).setData(data);
        if (swap !== swapSeq.current || mapRef.current !== map) return;
        setSlotOpacity(map, next, true);
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
    <div className="map" data-testid="map" data-borders={shownSnapshot ?? undefined}>
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
