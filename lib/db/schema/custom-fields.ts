import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { events } from "./events";

export const CUSTOM_FIELD_TYPES = [
  "text",
  "longText",
  "number",
  "currency",
  "date",
  "url",
  "checkbox",
  "singleSelect",
  "file",
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_ENTITIES = ["eventCompany"] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

export type CustomFieldConfig = {
  options?: Array<{ value: string; label: string }>;
};

export const customFieldDefinitions = pgTable(
  "custom_field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    entityType: text("entity_type")
      .$type<CustomFieldEntity>()
      .notNull()
      .default("eventCompany"),
    key: text("key").notNull(),
    label: text("label").notNull(),
    fieldType: text("field_type").$type<CustomFieldType>().notNull(),
    config: jsonb("config")
      .$type<CustomFieldConfig>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    isRequired: boolean("is_required").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("custom_fields_event_entity_idx").on(table.eventId, table.entityType),
    unique("custom_fields_event_entity_key_unique").on(
      table.eventId,
      table.entityType,
      table.key,
    ),
  ],
);

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type NewCustomFieldDefinition =
  typeof customFieldDefinitions.$inferInsert;

export type FileFieldValue = {
  url: string;
  pathname: string;
  contentType: string | null;
  size: number;
  uploadedAt: string;
};
