import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customFieldDefinitions,
  type CustomFieldDefinition,
  type CustomFieldEntity,
} from "@/lib/db/schema";

export async function listFieldDefinitionsForEvent(
  eventId: string,
  entityType: CustomFieldEntity = "eventCompany",
): Promise<CustomFieldDefinition[]> {
  return db
    .select()
    .from(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.eventId, eventId),
        eq(customFieldDefinitions.entityType, entityType),
      ),
    )
    .orderBy(
      asc(customFieldDefinitions.displayOrder),
      asc(customFieldDefinitions.label),
    );
}

