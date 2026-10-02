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
