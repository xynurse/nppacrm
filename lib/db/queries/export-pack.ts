import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  auditLog,
  companies,
  contacts,
  eventCompanies,
  events,
  interactions,
  sponsorshipTiers,
  tasks,
  users,
} from "@/lib/db/schema";

/** Read-only queries for the per-event export pack. Soft-deleted rows excluded. */

export async function getExportEvent(eventId: string) {
  const [row] = await db
    .select({ id: events.id, name: events.name, timezone: events.timezone })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return row ?? null;
}

const targetTier = alias(sponsorshipTiers, "target_tier");
const confirmedTier = alias(sponsorshipTiers, "confirmed_tier");

export async function exportSponsors(eventId: string) {
  return db
    .select({
      eventCompanyId: eventCompanies.id,
      company: companies.name,
      website: companies.website,
      industry: companies.industry,
      category: companies.category,
      hqLocation: companies.hqLocation,
      status: eventCompanies.status,
      priority: eventCompanies.priority,
      owner: users.name,
      targetTier: targetTier.name,
      confirmedTier: confirmedTier.name,
      proposedAmount: eventCompanies.proposedAmount,
      confirmedAmount: eventCompanies.confirmedAmount,
      currency: eventCompanies.currency,
      firstContactedAt: eventCompanies.firstContactedAt,
      lastContactedAt: eventCompanies.lastContactedAt,
      nextActionAt: eventCompanies.nextActionAt,
      proposalUrl: eventCompanies.proposalUrl,
      proposalSentAt: eventCompanies.proposalSentAt,
      tags: eventCompanies.tagsCache,
      customFields: eventCompanies.customFields,
      createdAt: eventCompanies.createdAt,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, eventCompanies.ownerId))
    .leftJoin(targetTier, eq(targetTier.id, eventCompanies.targetTierId))
    .leftJoin(confirmedTier, eq(confirmedTier.id, eventCompanies.confirmedTierId))
    .where(and(eq(eventCompanies.eventId, eventId), isNull(eventCompanies.deletedAt)))
    .orderBy(asc(companies.name));
}

export async function exportContacts(eventId: string) {
  return db
    .select({
      company: companies.name,
      fullName: contacts.fullName,
      title: contacts.title,
      email: contacts.email,
      phone: contacts.phone,
      linkedinUrl: contacts.linkedinUrl,
      isPrimary: contacts.isPrimary,
    })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .innerJoin(eventCompanies, eq(eventCompanies.companyId, companies.id))
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        isNull(contacts.deletedAt),
      ),
    )
    .orderBy(asc(companies.name), asc(contacts.fullName));
}

export async function exportInteractions(eventId: string) {
  return db
    .select({
      occurredAt: interactions.occurredAt,
      company: companies.name,
      type: interactions.type,
      subject: interactions.subject,
      body: interactions.body,
      by: users.name,
    })
    .from(interactions)
    .innerJoin(eventCompanies, eq(eventCompanies.id, interactions.eventCompanyId))
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, interactions.userId))
    .where(eq(interactions.eventId, eventId))
    .orderBy(asc(interactions.occurredAt));
}

/** Status moves come from the audit log (`eventCompany.move_status`). */
export async function exportPipelineHistory(eventId: string) {
  return db
    .select({
      changedAt: auditLog.createdAt,
      company: companies.name,
      from: sql<string | null>`${auditLog.changes}->>'from'`,
      to: sql<string | null>`${auditLog.changes}->>'to'`,
      source: sql<string | null>`${auditLog.changes}->>'source'`,
      by: users.name,
    })
    .from(auditLog)
    .innerJoin(eventCompanies, sql`${eventCompanies.id}::text = ${auditLog.entityId}`)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, auditLog.userId))
    .where(
      and(
        eq(auditLog.eventId, eventId),
        eq(auditLog.action, "eventCompany.move_status"),
      ),
    )
    .orderBy(asc(auditLog.createdAt));
}

export async function exportTasks(eventId: string) {
  return db
    .select({
      title: tasks.title,
      company: companies.name,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      assignedTo: users.name,
      completedAt: tasks.completedAt,
      description: tasks.description,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(eventCompanies, eq(eventCompanies.id, tasks.eventCompanyId))
    .leftJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, tasks.assignedTo))
    .where(and(eq(tasks.eventId, eventId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.dueDate));
}

export async function exportFulfillment(eventId: string) {
  return db
    .select({
      company: companies.name,
      confirmedTier: confirmedTier.name,
      confirmedAmount: eventCompanies.confirmedAmount,
      agreementSignedAt: eventCompanies.agreementSignedAt,
      invoiceSentAt: eventCompanies.invoiceSentAt,
      paidAt: eventCompanies.paidAt,
      boothNumber: eventCompanies.boothNumber,
      repNames: eventCompanies.repNames,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(confirmedTier, eq(confirmedTier.id, eventCompanies.confirmedTierId))
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        eq(eventCompanies.status, "confirmed"),
        isNull(eventCompanies.deletedAt),
      ),
    )
    .orderBy(asc(companies.name));
}
