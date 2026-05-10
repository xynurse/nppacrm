import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createEventSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(slugRegex, "Use lowercase letters, numbers, and dashes only"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  fundraisingGoal: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/u)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  currency: z.string().length(3).default("USD"),
  timezone: z.string().min(1).default("America/Chicago"),
});

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.uuid(),
  status: z.enum(["active", "archived"]).optional(),
});

export const setActiveEventSchema = z.object({
  eventId: z.uuid().nullable(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
