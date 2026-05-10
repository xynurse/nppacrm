import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, contacts, eventCompanies } from "@/lib/db/schema";

export type ContactRow = {
  id: string;
  companyId: string;
  companyName: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactDirectoryRow = ContactRow & {
  eventCompanyId: string;
};

export async function listContactsForCompany(
  companyId: string,
): Promise<ContactRow[]> {
  const rows = await db
    .select({
      id: contacts.id,
      companyId: contacts.companyId,
      companyName: companies.name,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      fullName: contacts.fullName,
      title: contacts.title,
      email: contacts.email,
      phone: contacts.phone,
      linkedinUrl: contacts.linkedinUrl,
      isPrimary: contacts.isPrimary,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .where(
      and(eq(contacts.companyId, companyId), isNull(contacts.deletedAt)),
    )
    .orderBy(desc(contacts.isPrimary), asc(contacts.fullName));
  return rows;
}

export async function listContactsForEvent(
  eventId: string,
): Promise<ContactDirectoryRow[]> {
  const rows = await db
    .select({
      id: contacts.id,
      companyId: contacts.companyId,
      companyName: companies.name,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      fullName: contacts.fullName,
      title: contacts.title,
      email: contacts.email,
      phone: contacts.phone,
      linkedinUrl: contacts.linkedinUrl,
      isPrimary: contacts.isPrimary,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      eventCompanyId: eventCompanies.id,
    })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .innerJoin(
      eventCompanies,
      eq(eventCompanies.companyId, contacts.companyId),
    )
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        isNull(contacts.deletedAt),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(asc(companies.name), desc(contacts.isPrimary), asc(contacts.fullName));
  return rows;
}
