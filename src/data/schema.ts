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
