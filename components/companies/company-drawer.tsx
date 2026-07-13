"use client";

import { Gift, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CellShell } from "@/components/cells/cell-shell";
import { CurrencyEditor } from "@/components/cells/currency-cell";
import { DateEditor } from "@/components/cells/date-cell";
import { PersonEditor } from "@/components/cells/person-cell";
import { TierEditor } from "@/components/cells/relation-cell";
import { SingleSelectEditor } from "@/components/cells/single-select-cell";
import { LongTextEditor, TextEditor } from "@/components/cells/text-cell";
import { UrlDisplay, UrlEditor } from "@/components/cells/url-cell";
import type { PersonOption, TierOption } from "@/components/cells/types";
import { AiTab } from "@/components/companies/ai-tab";
import { BenefitsTab } from "@/components/companies/benefits-tab";
import { EmailDraftButton } from "@/components/companies/email-draft-dialog";
import { ProposalDialog } from "@/components/companies/proposal-dialog";
import { ContactsTab } from "@/components/contacts/contacts-tab";
import { CustomFieldsSection } from "@/components/custom-fields/custom-fields-section";
import { ActivityTab } from "@/components/interactions/activity-tab";
import { TasksTab } from "@/components/tasks/tasks-tab";
import type { CustomFieldDefinition } from "@/lib/db/schema";
import type { JobRow, SuggestionRow } from "@/lib/db/queries/ai";
import type { BenefitRow } from "@/lib/db/queries/benefits";
import { PriorityDot } from "./priority-dot";
import {
  BouncedBadge,
  DeferredBadge,
  hasBouncedTag,
  hasDeferredTag,
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "./status-badge";
import {
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
} from "@/lib/db/schema";
import type {
  ArchivedEmailRow,
  ContactRow,
} from "@/lib/db/queries/contacts";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import type { InteractionRow } from "@/lib/db/queries/interactions";
import type { TaskRow } from "@/lib/db/queries/tasks";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

type DrawerTab =
  | "overview"
  | "contacts"
  | "activity"
  | "tasks"
  | "benefits"
  | "ai";

export type DrawerData = {
  contacts: ContactRow[];
  emailHistory: ArchivedEmailRow[];
  interactions: InteractionRow[];
  tasks: TaskRow[];
  ai: {
    suggestions: SuggestionRow[];
    jobs: JobRow[];
    hasProspectus: boolean;
    prospectusFileName: string | null;
  };
  benefits: BenefitRow[];
};

export function CompanyDrawer({
  row,
  owners,
  tiers,
  data,
  currentUserId,
  isAdmin,
  fieldDefinitions,
  closeHref = "/companies",
}: {
  row: EventCompanyRow | null;
  owners: PersonOption[];
  tiers: TierOption[];
  data: DrawerData | null;
  currentUserId: string;
  isAdmin: boolean;
  fieldDefinitions: CustomFieldDefinition[];
  /** Where the backdrop/close control navigates. Lets the drawer close
   * in-place on whatever page it is rendered on (e.g. /pipeline). */
  closeHref?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && row) {
        const btn = document.getElementById("close-drawer");
        btn?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row]);

  return (
    <>
      <Link
        id="close-drawer"
        href={closeHref}
        scroll={false}
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm transition-opacity",
          row ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-40 h-screen w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-[var(--shadow-overlay)] transition-transform duration-200 ease-[var(--ease-out-soft)] dark:border-slate-800 dark:bg-slate-900",
          row ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!row}
      >
        {row && data ? (
          <DrawerContent
            row={row}
            owners={owners}
            tiers={tiers}
            data={data}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            fieldDefinitions={fieldDefinitions}
            closeHref={closeHref}
          />
        ) : null}
      </aside>
    </>
  );
}

function DrawerContent({
  row: initial,
  owners,
  tiers,
  data,
  currentUserId,
  isAdmin,
  fieldDefinitions,
  closeHref,
}: {
  row: EventCompanyRow;
  owners: PersonOption[];
  tiers: TierOption[];
  data: DrawerData;
  currentUserId: string;
  isAdmin: boolean;
  fieldDefinitions: CustomFieldDefinition[];
  closeHref: string;
}) {
  const [row, setRow] = useState(initial);
  const [tab, setTab] = useState<DrawerTab>("overview");
  useEffect(() => setRow(initial), [initial]);

  const update = <K extends keyof EventCompanyRow>(
    key: K,
    value: EventCompanyRow[K],
  ) => setRow((prev) => ({ ...prev, [key]: value }));

  const showBenefitsTab =
    row.status === "confirmed" ||
    row.status === "committed" ||
    data.benefits.length > 0;

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "contacts", label: "Contacts" },
    { id: "activity", label: "Activity" },
    { id: "tasks", label: "Tasks" },
    ...(showBenefitsTab ? [{ id: "benefits" as const, label: "Benefits" }] : []),
    { id: "ai", label: "AI" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {row.companyIndustry ?? "Prospect"}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            <CellShell
              fieldKey="company.name"
              entityId={row.companyId}
              value={row.companyName}
              display={row.companyName}
              onLocalChange={(v) => update("companyName", v ?? "")}
              Editor={TextEditor}
            />
          </h2>
          <CellShell
            fieldKey="company.website"
            entityId={row.companyId}
            value={row.companyWebsite}
            display={<UrlDisplay value={row.companyWebsite} />}
            onLocalChange={(v) => update("companyWebsite", v)}
            Editor={UrlEditor}
            className="text-xs"
          />
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <EmailDraftButton
            eventCompanyId={row.id}
            companyName={row.companyName}
          />
          <ProposalDialog
            eventCompanyId={row.id}
            companyName={row.companyName}
            status={row.status}
            existingProposalUrl={row.proposalUrl}
            existingProposalSentAt={row.proposalSentAt}
            existingProposalValidUntil={row.proposalValidUntil}
          />
          <Link
            href={closeHref}
            scroll={false}
            className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={row.status} />
        {hasBouncedTag(row.tagsCache) ? <BouncedBadge /> : null}
        {hasDeferredTag(row.tagsCache) ? <DeferredBadge /> : null}
        <PriorityDot priority={row.priority} />
        {row.targetTierName ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: row.targetTierColor ?? "#94a3b8" }}
            />
            Target: {row.targetTierName}
          </span>
        ) : null}
        {row.confirmedTierName ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Confirmed: {row.confirmedTierName}
          </span>
        ) : null}
      </div>

      <nav className="mt-5 flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150",
              tab === t.id
                ? "border-brand-600 text-slate-900 dark:border-brand-400 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200",
            )}
          >
            <span className="inline-flex items-center gap-1">
              {t.id === "ai" ? (
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              ) : null}
              {t.id === "benefits" ? (
                <Gift className="h-3.5 w-3.5 text-emerald-500" />
              ) : null}
              {t.label}
            </span>
            {t.id === "contacts" && data.contacts.length > 0 ? (
              <span className="ml-1 text-xs text-slate-400">
                {data.contacts.length}
              </span>
            ) : null}
            {t.id === "activity" && data.interactions.length > 0 ? (
              <span className="ml-1 text-xs text-slate-400">
                {data.interactions.length}
              </span>
            ) : null}
            {t.id === "tasks" && data.tasks.length > 0 ? (
              <span className="ml-1 text-xs text-slate-400">
                {data.tasks.filter((x) => !x.completedAt).length}
              </span>
            ) : null}
            {t.id === "ai" &&
            data.ai.suggestions.filter((s) => s.status === "pending").length >
              0 ? (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                {
                  data.ai.suggestions.filter((s) => s.status === "pending")
                    .length
                }
              </span>
            ) : null}
            {t.id === "benefits" && data.benefits.length > 0 ? (
              <span className="ml-1 text-xs text-slate-400">
                {
                  data.benefits.filter((b) => b.status !== "delivered" && b.status !== "skipped").length
                }
                /{data.benefits.length}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {tab === "overview" ? (
          <OverviewTab
            row={row}
            owners={owners}
            tiers={tiers}
            update={update}
            fieldDefinitions={fieldDefinitions}
          />
        ) : tab === "contacts" ? (
          <ContactsTab
            companyId={row.companyId}
            contacts={data.contacts}
            emailHistory={data.emailHistory}
          />
        ) : tab === "activity" ? (
          <ActivityTab
            eventCompanyId={row.id}
            interactions={data.interactions}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        ) : tab === "tasks" ? (
          <TasksTab
            eventCompanyId={row.id}
            tasks={data.tasks}
            owners={owners}
          />
        ) : tab === "benefits" ? (
          <BenefitsTab
            eventCompanyId={row.id}
            benefits={data.benefits}
            hasConfirmedTier={!!row.confirmedTierId}
            confirmedTierName={row.confirmedTierName}
          />
        ) : (
          <AiTab
            eventCompanyId={row.id}
            suggestions={data.ai.suggestions}
            jobs={data.ai.jobs}
            hasProspectus={data.ai.hasProspectus}
            prospectusFileName={data.ai.prospectusFileName}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  row,
  owners,
  tiers,
  update,
  fieldDefinitions,
}: {
  row: EventCompanyRow;
  owners: PersonOption[];
  tiers: TierOption[];
  update: <K extends keyof EventCompanyRow>(
    key: K,
    value: EventCompanyRow[K],
  ) => void;
  fieldDefinitions: CustomFieldDefinition[];
}) {
  return (
    <>
      <Section title="About">
        <KV
          label="Status"
          value={
            <CellShell<string | null>
              fieldKey="eventCompany.status"
              entityId={row.id}
              value={row.status}
              display={PROSPECT_STATUS_LABELS[row.status]}
              onLocalChange={(v) =>
                update("status", v as EventCompanyRow["status"])
              }
              Editor={(p) => (
                <SingleSelectEditor
                  {...p}
                  options={PROSPECT_STATUS_VALUES.map((s) => ({
                    value: s,
                    label: PROSPECT_STATUS_LABELS[s],
                  }))}
                />
              )}
            />
          }
        />
        <KV
          label="Priority"
          value={
            <CellShell<string | null>
              fieldKey="eventCompany.priority"
              entityId={row.id}
              value={row.priority}
              display={PRIORITY_LABELS[row.priority]}
              onLocalChange={(v) =>
                update("priority", v as EventCompanyRow["priority"])
              }
              Editor={(p) => (
                <SingleSelectEditor
                  {...p}
                  options={PROSPECT_PRIORITY_VALUES.map((s) => ({
                    value: s,
                    label: PRIORITY_LABELS[s],
                  }))}
                />
              )}
            />
          }
        />
        <KV
          label="Owner"
          value={
            <CellShell
              fieldKey="eventCompany.ownerId"
              entityId={row.id}
              value={row.ownerId}
              display={row.ownerName ?? "—"}
              onLocalChange={(v) => {
                update("ownerId", v);
                update("ownerName", owners.find((o) => o.id === v)?.name ?? null);
              }}
              Editor={(p) => <PersonEditor {...p} options={owners} />}
            />
          }
        />
        <KV
          label="Target tier"
          value={
            <CellShell
              fieldKey="eventCompany.targetTierId"
              entityId={row.id}
              value={row.targetTierId}
              display={row.targetTierName ?? "—"}
              onLocalChange={(v) => {
                const t = v ? tiers.find((tier) => tier.id === v) : null;
                update("targetTierId", v);
                update("targetTierName", t?.name ?? null);
                update("targetTierColor", t?.color ?? null);
              }}
              Editor={(p) => <TierEditor {...p} options={tiers} />}
            />
          }
        />
        <KV
          label="Confirmed tier"
          value={
            <CellShell
              fieldKey="eventCompany.confirmedTierId"
              entityId={row.id}
              value={row.confirmedTierId}
              display={row.confirmedTierName ?? "—"}
              onLocalChange={(v) => {
                const t = v ? tiers.find((tier) => tier.id === v) : null;
                update("confirmedTierId", v);
                update("confirmedTierName", t?.name ?? null);
              }}
              Editor={(p) => <TierEditor {...p} options={tiers} />}
            />
          }
        />
        <KV
          label="Proposed"
          value={
            <CellShell
              fieldKey="eventCompany.proposedAmount"
              entityId={row.id}
              value={row.proposedAmount}
              display={formatCurrency(row.proposedAmount, row.currency)}
              onLocalChange={(v) => update("proposedAmount", v)}
              Editor={CurrencyEditor}
            />
          }
        />
        <KV
          label="Confirmed"
          value={
            <CellShell
              fieldKey="eventCompany.confirmedAmount"
              entityId={row.id}
              value={row.confirmedAmount}
              display={formatCurrency(row.confirmedAmount, row.currency)}
              onLocalChange={(v) => update("confirmedAmount", v)}
              Editor={CurrencyEditor}
            />
          }
        />
        <KV
          label="Last contact"
          value={
            <CellShell
              fieldKey="eventCompany.lastContactedAt"
              entityId={row.id}
              value={row.lastContactedAt}
              display={formatRelativeDate(row.lastContactedAt)}
              onLocalChange={(v) => update("lastContactedAt", v)}
              Editor={DateEditor}
            />
          }
        />
        <KV
          label="Next action"
          value={
            <CellShell
              fieldKey="eventCompany.nextActionAt"
              entityId={row.id}
              value={row.nextActionAt}
              display={formatRelativeDate(row.nextActionAt)}
              onLocalChange={(v) => update("nextActionAt", v)}
              Editor={DateEditor}
            />
          }
        />
        <KV
          label="HQ"
          value={
            <CellShell
              fieldKey="company.hqLocation"
              entityId={row.companyId}
              value={row.companyHqLocation}
              display={row.companyHqLocation ?? "—"}
              onLocalChange={(v) => update("companyHqLocation", v)}
              Editor={TextEditor}
            />
          }
        />
        <KV
          label="Industry"
          value={
            <CellShell
              fieldKey="company.industry"
              entityId={row.companyId}
              value={row.companyIndustry}
              display={row.companyIndustry ?? "—"}
              onLocalChange={(v) => update("companyIndustry", v)}
              Editor={TextEditor}
            />
          }
        />
      </Section>

      <Section title="Outreach strategy" accent>
        <Para
          label="Why they should attend"
          fieldKey="eventCompany.whyTheyShouldAttend"
          entityId={row.id}
          value={row.whyTheyShouldAttend}
          onLocalChange={(v) => update("whyTheyShouldAttend", v)}
        />
        <Para
          label="Key talking points"
          fieldKey="eventCompany.keyTalkingPoints"
          entityId={row.id}
          value={row.keyTalkingPoints}
          onLocalChange={(v) => update("keyTalkingPoints", v)}
        />
        <Para
          label="Email angle"
          fieldKey="eventCompany.emailAngle"
          entityId={row.id}
          value={row.emailAngle}
          onLocalChange={(v) => update("emailAngle", v)}
        />
        <Para
          label="Sponsorship hook"
          fieldKey="eventCompany.sponsorshipHook"
          entityId={row.id}
          value={row.sponsorshipHook}
          onLocalChange={(v) => update("sponsorshipHook", v)}
        />
      </Section>

      <Section title="Notes">
        <Para
          label="Company context"
          fieldKey="eventCompany.companyContext"
          entityId={row.id}
          value={row.companyContext}
          onLocalChange={(v) => update("companyContext", v)}
        />
        <Para
          label="Relationship notes"
          fieldKey="eventCompany.relationshipNotes"
          entityId={row.id}
          value={row.relationshipNotes}
          onLocalChange={(v) => update("relationshipNotes", v)}
        />
      </Section>

      <CustomFieldsSection
        entityId={row.id}
        definitions={fieldDefinitions}
        values={row.customFields ?? {}}
      />
    </>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  /** Accent sections carry AI-enriched outreach content — worth the emphasis. */
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "mt-2 rounded-xl border p-4 shadow-[var(--shadow-card)]",
        accent
          ? "border-brand-200 bg-gradient-to-br from-brand-50/60 to-transparent dark:border-brand-900 dark:from-brand-950/40"
          : "border-slate-200 dark:border-slate-800",
      )}
    >
      <header className="mb-3 flex items-center gap-1.5">
        {accent ? (
          <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
        ) : null}
        <h3 className="text-sm font-semibold">{title}</h3>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 items-start gap-2 text-sm">
      <dt className="pt-1 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="col-span-2">{value}</dd>
    </div>
  );
}

function Para({
  label,
  fieldKey,
  entityId,
  value,
  onLocalChange,
}: {
  label: string;
  fieldKey: Parameters<typeof CellShell>[0]["fieldKey"];
  entityId: string;
  value: string | null;
  onLocalChange?: (next: string | null) => void;
}) {
  return (
    <div className="text-sm">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <CellShell
        fieldKey={fieldKey}
        entityId={entityId}
        value={value}
        display={
          value ? (
            <span className="whitespace-pre-wrap text-slate-900 dark:text-slate-100">
              {value}
            </span>
          ) : (
            <span className="italic text-slate-400 dark:text-slate-500">
              Click to draft
            </span>
          )
        }
        onLocalChange={onLocalChange}
        Editor={LongTextEditor}
      />
    </div>
  );
}
