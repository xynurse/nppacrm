import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalMoney = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/u)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalInt = z
  .union([
    z.number().int().nonnegative(),
    z
      .string()
      .regex(/^\d+$/u)
      .transform((v) => Number(v)),
    z.literal("").transform(() => undefined),
    z.null().transform(() => null),
  ])
  .optional();

export const courseDirectorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  title: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  credentials: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export const createEventSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(slugRegex, "Use lowercase letters, numbers, and dashes only"),
  startDate: optionalDate,
  endDate: optionalDate,
  fundraisingGoal: optionalMoney,
  currency: z.string().length(3).default("USD"),
  timezone: z.string().min(1).default("America/Chicago"),
  location: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  courseDirectors: z.array(courseDirectorSchema).max(20).optional(),
  goals: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
  attendeeGoal: optionalInt,
  sponsorCountGoal: optionalInt,
});

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.uuid(),
  status: z.enum(["active", "archived"]).optional(),
  /** Explicit clear for nullable scalar fields. */
  location: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  courseDirectors: z.array(courseDirectorSchema).max(20).optional(),
  goals: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
  attendeeGoal: optionalInt,
  sponsorCountGoal: optionalInt,
});

export const setActiveEventSchema = z.object({
  eventId: z.uuid().nullable(),
});

/** Clone an event year: tiers, fields, reviewers, and selected prospects. */
export const rolloverEventSchema = createEventSchema.extend({
  sourceEventId: z.uuid(),
  includeConfirmed: z.boolean().default(true),
  includePastSponsors: z.boolean().default(true),
  includePipeline: z.boolean().default(true),
  includeDeclined: z.boolean().default(false),
  archiveSource: z.boolean().default(false),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type RolloverEventInput = z.infer<typeof rolloverEventSchema>;
export type CourseDirectorInput = z.infer<typeof courseDirectorSchema>;
