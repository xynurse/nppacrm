import { z } from "zod";
import {
  CUSTOM_FIELD_ENTITIES,
  CUSTOM_FIELD_TYPES,
} from "@/lib/db/schema";

const keyRegex = /^[a-z][a-z0-9_]*$/;

const optionsSchema = z
  .array(
    z.object({
      value: z.string().min(1).max(60),
      label: z.string().min(1).max(80),
    }),
  )
  .max(50)
  .optional();

const baseFieldDef = {
  eventId: z.uuid(),
  entityType: z.enum(CUSTOM_FIELD_ENTITIES).default("eventCompany"),
  key: z
    .string()
    .min(2)
    .max(40)
    .regex(keyRegex, "lowercase letters, numbers, underscores; must start with a letter"),
  label: z.string().min(1).max(80),
  fieldType: z.enum(CUSTOM_FIELD_TYPES),
  options: optionsSchema,
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(10000).default(0),
};

export const createFieldDefinitionSchema = z
  .object(baseFieldDef)
  .refine(
    (d) => d.fieldType !== "singleSelect" || (d.options && d.options.length > 0),
    { message: "singleSelect requires at least one option", path: ["options"] },
  );

export const updateFieldDefinitionSchema = z
  .object({
    id: z.uuid(),
    label: z.string().min(1).max(80).optional(),
    options: optionsSchema,
    isRequired: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(10000).optional(),
  });

export const deleteFieldDefinitionSchema = z.object({ id: z.uuid() });

export type CreateFieldDefinitionInput = z.infer<
  typeof createFieldDefinitionSchema
>;
export type UpdateFieldDefinitionInput = z.infer<
  typeof updateFieldDefinitionSchema
>;

const fileValueSchema = z.object({
  url: z.url(),
  pathname: z.string().min(1),
  contentType: z.string().nullable(),
  size: z.number().int().min(0),
  uploadedAt: z.string(),
});

export const customFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  fileValueSchema,
  z.null(),
]);

export const updateCustomFieldSchema = z.object({
  entityId: z.uuid(),
  definitionId: z.uuid(),
  value: customFieldValueSchema,
});
