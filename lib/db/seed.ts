import { config } from "dotenv";
import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

const TIERS = [
  {
    name: "Platinum",
    color: "#0ea5e9",
    displayOrder: 1,
    suggestedAmount: "50000.00",
    benefits: [
      { key: "logo_main_stage", label: "Logo on main stage", defaultDueOffsetDays: -30 },
      { key: "passes_8", label: "8 conference passes", defaultDueOffsetDays: -14 },
      { key: "booth_premium", label: "Premium booth placement", defaultDueOffsetDays: -21 },
      { key: "social_3", label: "3 social media shoutouts", defaultDueOffsetDays: -7 },
      { key: "program_full_page", label: "Full-page program ad", defaultDueOffsetDays: -45 },
    ],
  },
  {
    name: "Gold",
    color: "#f59e0b",
    displayOrder: 2,
    suggestedAmount: "25000.00",
    benefits: [
      { key: "logo_website", label: "Logo on website", defaultDueOffsetDays: -45 },
      { key: "passes_4", label: "4 conference passes", defaultDueOffsetDays: -14 },
      { key: "booth", label: "Dedicated booth", defaultDueOffsetDays: -21 },
      { key: "social_1", label: "1 social media shoutout", defaultDueOffsetDays: -7 },
      { key: "program_blurb", label: "Blurb in program", defaultDueOffsetDays: -45 },
    ],
  },
  {
    name: "Silver",
    color: "#94a3b8",
    displayOrder: 3,
    suggestedAmount: "10000.00",
    benefits: [
      { key: "logo_website", label: "Logo on website", defaultDueOffsetDays: -45 },
      { key: "passes_2", label: "2 conference passes", defaultDueOffsetDays: -14 },
      { key: "table", label: "Tabletop display", defaultDueOffsetDays: -21 },
    ],
  },
  {
    name: "Bronze",
    color: "#92400e",
    displayOrder: 4,
    suggestedAmount: "5000.00",
    benefits: [
      { key: "logo_website", label: "Logo on website", defaultDueOffsetDays: -45 },
      { key: "passes_1", label: "1 conference pass", defaultDueOffsetDays: -14 },
    ],
  },
];

const FIXTURE_PROSPECTS: {
  name: string;
  industry: string;
  hq: string;
  status: schema.ProspectStatus;
  priority: schema.ProspectPriority;
  proposedAmount?: string;
  confirmedAmount?: string;
  targetTier?: string;
  confirmedTier?: string;
  whyTheyShouldAttend?: string;
  emailAngle?: string;
  lastContactedDaysAgo?: number;
  nextActionInDays?: number;
}[] = [
  {
    name: "Vertex Therapeutics",
    industry: "Pharma",
    hq: "Boston, MA",
    status: "confirmed",
    priority: "high",
    confirmedAmount: "50000.00",
    confirmedTier: "Platinum",
    lastContactedDaysAgo: 7,
    whyTheyShouldAttend: "Active NP/PA hiring across cardiology and pulmonology lines.",
  },
  {
    name: "Eli Lilly & Company",
    industry: "Pharma",
    hq: "Indianapolis, IN",
    status: "negotiating",
    priority: "high",
    proposedAmount: "50000.00",
    targetTier: "Platinum",
    lastContactedDaysAgo: 4,
    nextActionInDays: 5,
    whyTheyShouldAttend: "Diabetes & obesity portfolio aligns with attendee specialties.",
    emailAngle: "Tie sponsorship to Mounjaro NP/PA education roadshow.",
  },
  {
    name: "Pfizer Inc.",
    industry: "Pharma",
    hq: "New York, NY",
    status: "engaged",
    priority: "high",
    targetTier: "Gold",
    lastContactedDaysAgo: 12,
    nextActionInDays: 2,
  },
  {
    name: "AbbVie",
    industry: "Pharma",
    hq: "North Chicago, IL",
    status: "proposal_sent",
    priority: "medium",
    proposedAmount: "25000.00",
    targetTier: "Gold",
    lastContactedDaysAgo: 9,
    nextActionInDays: 5,
  },
  {
    name: "Stryker",
    industry: "Medical devices",
    hq: "Kalamazoo, MI",
    status: "committed",
    priority: "high",
    proposedAmount: "25000.00",
    confirmedAmount: "25000.00",
    confirmedTier: "Gold",
    lastContactedDaysAgo: 3,
  },
  {
    name: "Boston Scientific",
    industry: "Medical devices",
    hq: "Marlborough, MA",
    status: "engaged",
    priority: "medium",
    targetTier: "Silver",
    lastContactedDaysAgo: 18,
    nextActionInDays: 1,
  },
  {
    name: "Medtronic",
    industry: "Medical devices",
    hq: "Minneapolis, MN",
    status: "contacted",
    priority: "medium",
    targetTier: "Gold",
    lastContactedDaysAgo: 24,
  },
  {
    name: "Edwards Lifesciences",
    industry: "Medical devices",
    hq: "Irvine, CA",
    status: "prospect",
    priority: "medium",
    targetTier: "Silver",
  },
  {
    name: "Athenahealth",
    industry: "Health IT",
    hq: "Watertown, MA",
    status: "engaged",
    priority: "low",
    targetTier: "Bronze",
    lastContactedDaysAgo: 11,
  },
  {
    name: "Epic Systems",
    industry: "Health IT",
    hq: "Verona, WI",
    status: "contacted",
    priority: "low",
    targetTier: "Bronze",
    lastContactedDaysAgo: 31,
  },
  {
    name: "Oracle Health",
    industry: "Health IT",
    hq: "Austin, TX",
    status: "prospect",
    priority: "low",
  },
  {
    name: "Doximity",
    industry: "Health media",
    hq: "San Francisco, CA",
    status: "past_sponsor",
    priority: "medium",
    confirmedAmount: "10000.00",
    confirmedTier: "Silver",
  },
  {
    name: "WebMD",
    industry: "Health media",
    hq: "New York, NY",
    status: "declined",
    priority: "low",
    lastContactedDaysAgo: 65,
  },
  {
    name: "BMS",
    industry: "Pharma",
    hq: "New York, NY",
    status: "prospect",
    priority: "high",
    targetTier: "Gold",
  },
  {
    name: "Regeneron",
    industry: "Pharma",
    hq: "Tarrytown, NY",
    status: "prospect",
    priority: "medium",
    targetTier: "Silver",
  },
];

function daysOffset(days: number, base = new Date()): Date {
  const d = new Date(base);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to seed");

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed",
    );
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  // Admin user
  let adminId: string;
  const existingAdmin = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await hash(adminPassword, 12);
    const [created] = await db
      .insert(schema.users)
      .values({
        email: adminEmail,
        name: "Admin",
        role: "admin",
        passwordHash,
      })
      .returning({ id: schema.users.id });
    if (!created) throw new Error("Failed to create admin");
    adminId = created.id;
    console.log(`Created admin user ${adminEmail}.`);
  } else {
    const row = existingAdmin[0]!;
    adminId = row.id;
    console.log(`Admin user ${adminEmail} already exists; skipping.`);
  }

  // Event
  const lpdSlug = "lpd-2026";
  let eventId: string;
  const existingEvent = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(eq(schema.events.slug, lpdSlug))
    .limit(1);
  if (existingEvent.length === 0) {
    const [created] = await db
      .insert(schema.events)
      .values({
        name: "Leadership & Professional Development for NPs & PAs 2026",
        slug: lpdSlug,
        startDate: "2026-09-10",
        endDate: "2026-09-12",
        currency: "USD",
        timezone: "America/Chicago",
        fundraisingGoal: "250000.00",
      })
      .returning({ id: schema.events.id });
    if (!created) throw new Error("Failed to create event");
    eventId = created.id;
    console.log(`Created event ${lpdSlug}.`);
  } else {
    const row = existingEvent[0]!;
    eventId = row.id;
    console.log(`Event ${lpdSlug} already exists; skipping.`);
  }

  // Tiers
  const existingTiers = await db
    .select({ name: schema.sponsorshipTiers.name })
    .from(schema.sponsorshipTiers)
    .where(eq(schema.sponsorshipTiers.eventId, eventId));
  const existingTierNames = new Set(existingTiers.map((t) => t.name));
  const tiersToInsert = TIERS.filter((t) => !existingTierNames.has(t.name));
  if (tiersToInsert.length > 0) {
    await db.insert(schema.sponsorshipTiers).values(
      tiersToInsert.map((t) => ({
        eventId,
        name: t.name,
        color: t.color,
        displayOrder: t.displayOrder,
        suggestedAmount: t.suggestedAmount,
        benefits: t.benefits,
      })),
    );
    console.log(`Inserted ${tiersToInsert.length} sponsorship tiers.`);
  } else {
    console.log("Sponsorship tiers already seeded; skipping.");
  }

  const tiers = await db
    .select()
    .from(schema.sponsorshipTiers)
    .where(eq(schema.sponsorshipTiers.eventId, eventId));
  const tierByName = new Map(tiers.map((t) => [t.name, t.id]));

  // Default saved views
  const existingViews = await db
    .select({ name: schema.savedViews.name })
    .from(schema.savedViews)
    .where(eq(schema.savedViews.eventId, eventId));
  const existingViewNames = new Set(existingViews.map((v) => v.name));

  const DEFAULT_VIEWS: Array<{
    name: string;
    isDefault?: boolean;
    filter: schema.SavedView["filter"];
    sort: schema.SavedView["sort"];
    displayOrder: number;
  }> = [
    {
      name: "All prospects",
      isDefault: true,
      filter: { op: "and", conditions: [] },
      sort: [{ field: "companyName", dir: "asc" }],
      displayOrder: 0,
    },
    {
      name: "Hot pipeline",
      filter: {
        op: "and",
        conditions: [
          {
            field: "status",
            op: "is_one_of",
            value: ["engaged", "proposal_sent", "negotiating", "committed"],
          },
        ],
      },
      sort: [{ field: "lastContactedAt", dir: "desc" }],
      displayOrder: 10,
    },
    {
      name: "Confirmed sponsors",
      filter: {
        op: "and",
        conditions: [{ field: "status", op: "is", value: "confirmed" }],
      },
      sort: [{ field: "confirmedAmount", dir: "desc" }],
      displayOrder: 20,
    },
    {
      // Replaces "Stale (no contact 14+ days)", whose last_n_days op matched
      // recently-contacted companies — the opposite of stale. Existing DBs
      // keep the old view (seed is name-keyed); delete it manually.
      name: "Needs follow-up (14+ days)",
      filter: {
        op: "and",
        conditions: [
          {
            field: "status",
            op: "is_one_of",
            value: ["contacted", "engaged", "proposal_sent", "negotiating"],
          },
          { field: "lastContactedAt", op: "older_than_n_days", value: 14 },
        ],
      },
      sort: [{ field: "lastContactedAt", dir: "asc" }],
      displayOrder: 30,
    },
    {
      name: "Proposals expiring soon",
      filter: {
        op: "and",
        conditions: [
          {
            field: "status",
            op: "is_one_of",
            value: ["proposal_sent", "negotiating"],
          },
          { field: "proposalValidUntil", op: "next_n_days", value: 14 },
        ],
      },
      sort: [{ field: "proposalValidUntil", dir: "asc" }],
      displayOrder: 40,
    },
  ];

  const viewsToInsert = DEFAULT_VIEWS.filter((v) => !existingViewNames.has(v.name));
  if (viewsToInsert.length > 0) {
    await db.insert(schema.savedViews).values(
      viewsToInsert.map((v) => ({
        eventId,
        ownerId: null,
        scope: "companies" as const,
        name: v.name,
        isShared: true,
        isDefault: v.isDefault ?? false,
        displayOrder: v.displayOrder,
        filter: v.filter,
        sort: v.sort,
      })),
    );
    console.log(`Inserted ${viewsToInsert.length} default saved views.`);
  } else {
    console.log("Default saved views already seeded; skipping.");
  }

  // Fixture prospects
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("Skipping demo prospects (set SEED_DEMO_DATA=true to seed).");
    console.log("Seed complete.");
    return;
  }

  for (const p of FIXTURE_PROSPECTS) {
    const existingCompany = await db
      .select({ id: schema.companies.id })
      .from(schema.companies)
      .where(eq(schema.companies.name, p.name))
      .limit(1);

    let companyId: string;
    if (existingCompany.length === 0) {
      const [created] = await db
        .insert(schema.companies)
        .values({
          name: p.name,
          industry: p.industry,
          hqLocation: p.hq,
        })
        .returning({ id: schema.companies.id });
      if (!created) continue;
      companyId = created.id;
    } else {
      companyId = existingCompany[0]!.id;
    }

    const existingEC = await db
      .select({ id: schema.eventCompanies.id })
      .from(schema.eventCompanies)
      .where(
        and(
          eq(schema.eventCompanies.eventId, eventId),
          eq(schema.eventCompanies.companyId, companyId),
        ),
      )
      .limit(1);

    if (existingEC.length > 0) continue;

    await db.insert(schema.eventCompanies).values({
      eventId,
      companyId,
      ownerId: adminId,
      status: p.status,
      priority: p.priority,
      proposedAmount: p.proposedAmount ?? null,
      confirmedAmount: p.confirmedAmount ?? null,
      targetTierId: p.targetTier ? (tierByName.get(p.targetTier) ?? null) : null,
      confirmedTierId: p.confirmedTier
        ? (tierByName.get(p.confirmedTier) ?? null)
        : null,
      whyTheyShouldAttend: p.whyTheyShouldAttend ?? null,
      emailAngle: p.emailAngle ?? null,
      lastContactedAt:
        p.lastContactedDaysAgo !== undefined
          ? daysOffset(-p.lastContactedDaysAgo)
          : null,
      nextActionAt:
        p.nextActionInDays !== undefined ? daysOffset(p.nextActionInDays) : null,
      createdBy: adminId,
      updatedBy: adminId,
    });
  }

  console.log(`Seeded ${FIXTURE_PROSPECTS.length} demo prospects.`);
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
