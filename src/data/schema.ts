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

const text = z.string().min(1);
const location = z.strictObject({
  name: text,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const category = z.enum(CATEGORIES);
const importance = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be lowercase kebab-case');
/** The ids of the states and periods an entry belongs to: the dynasty a battle was fought under, the war it was part of. */
const partOf = z.array(id).min(1).optional();

const common = {
  id,
  title: text,
  start: year,
  dateLabel: text.optional(),
  region: z.enum(REGIONS),
  summary: text,
  significance: text,
  wikipedia: z.string().regex(/^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/, 'must be an en.wikipedia.org article URL'),
};

/** A polity with a territory: drawn as a solid bar. */
const stateSchema = z.strictObject({ ...common, kind: z.literal('state'), end: year });
/** Something that lasted years: a war, a movement, a life. Drawn as a round-ended pill; pinned on the map if it has a place. */
const periodSchema = z.strictObject({
  ...common,
  kind: z.literal('period'),
  end: year,
  partOf,
  location: location.optional(),
  category: category.optional(),
  importance: importance.optional(),
});
/** Something that happened on one date: drawn as a marker and pinned on the map. */
const momentSchema = z.strictObject({ ...common, kind: z.literal('moment'), end: z.null(), partOf, location, category, importance });

export const entrySchema = z
  .discriminatedUnion('kind', [stateSchema, periodSchema, momentSchema])
  .refine((e) => e.end === null || e.end > e.start, { message: 'end must be after start', path: ['end'] })
  .refine(
    (e) => e.kind !== 'period' || new Set([e.location, e.category, e.importance].map((v) => v === undefined)).size === 1,
    { message: 'a period has a location, category and importance together, or none of them', path: ['location'] },
  );

export type Entry = z.infer<typeof entrySchema>;
export type State = Extract<Entry, { kind: 'state' }>;
export type Period = Extract<Entry, { kind: 'period' }>;
export type Moment = Extract<Entry, { kind: 'moment' }>;
/** Entries with a span, drawn as bars on the timeline. */
export type Bar = State | Period;
/** Entries with a place, pinned on the map. */
export type Placed = Moment | (Period & Required<Pick<Period, 'location' | 'category' | 'importance'>>);

/** Each timeline file only holds entries whose `start` is inside its range (inclusive). */
export const ENTRY_FILES: Record<string, [number, number]> = {
  '2000bc-1001bc.json': [-2000, -1001],
  '1000bc-1bc.json': [-1000, -1],
  'ad1-ad1000.json': [1, 1000],
  'ad1001-ad2000.json': [1001, 2000],
};
