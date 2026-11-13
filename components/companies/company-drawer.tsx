"use client";

import { Gift, Sparkles, ChevronLeft, ChevronRight, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { CellShell } from "@/components/cells/cell-shell";
import {
  CurrencyEditor,
  DateEditor,
  LongTextEditor,
  PersonEditor,
  SingleSelectEditor,
  TextEditor,
  TierEditor,
  UrlEditor,
} from "@/components/cells/lazy-editors";
import { UrlDisplay } from "@/components/cells/url-cell";
import type { PersonOption, TierOption } from "@/components/cells/types";
import { CompanyAvatar } from "@/components/companies/company-avatar";
import type { DrawerData } from "@/components/companies/drawer-types";
import { CustomFieldsSection } from "@/components/custom-fields/custom-fields-section";
import { loadCompanyDrawerData } from "@/lib/actions/drawer";
import { updateCompanyNotes } from "@/lib/actions/notes";
import type { CustomFieldDefinition } from "@/lib/db/schema";
import { PriorityDot } from "./priority-dot";
import {
  BouncedBadge,
  DeferredBadge,
  hasBouncedTag,
  hasDeferredTag,
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "./status-badge";
import { PROSPECT_PRIORITY_VALUES } from "@/lib/db/schema";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import type { RichDoc } from "@/lib/tiptap/types";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { StatusCell } from "./status-cell";

export type { DrawerData };

const ContactsTab = dynamic(
  () =>
    import("@/components/contacts/contacts-tab").then((m) => m.ContactsTab),
  { loading: () => <TabLoading /> },
);
const ActivityTab = dynamic(
  () =>
    import("@/components/interactions/activity-tab").then((m) => m.ActivityTab),
  { loading: () => <TabLoading /> },
);
const TasksTab = dynamic(
  () => import("@/components/tasks/tasks-tab").then((m) => m.TasksTab),
  { loading: () => <TabLoading /> },
);
const BenefitsTab = dynamic(
  () =>
    import("@/components/companies/benefits-tab").then((m) => m.BenefitsTab),
  { loading: () => <TabLoading /> },
);
const AiTab = dynamic(
  () => import("@/components/companies/ai-tab").then((m) => m.AiTab),
  { loading: () => <TabLoading /> },
);
const PlaybookMenu = dynamic(
  () => import("./playbook-menu").then((m) => m.PlaybookMenu),
  { ssr: false },
);
const EmailDraftButton = dynamic(
  () =>
    import("@/components/companies/email-draft-dialog").then(
      (m) => m.EmailDraftButton,
    ),
  { ssr: false },
);
const ProposalDialog = dynamic(
  () =>
    import("@/components/companies/proposal-dialog").then(
      (m) => m.ProposalDialog,
    ),
  { ssr: false },
);
const AutosaveRichEditor = dynamic(
  () =>
    import("@/components/tiptap/autosave-rich-editor").then(
      (m) => m.AutosaveRichEditor,
    ),
  { ssr: false, loading: () => <TabLoading /> },
);

function TabLoading() {
  return (
    <div className="space-y-3 py-2">
      <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

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
  | "notes"
  | "benefits"
  | "ai";

export function CompanyDrawer({
  row,
  owners,
  tiers,
  currentUserId,
  isAdmin,
  fieldDefinitions,
  recordIds,
  onClose,
  onNavigateRecord,
}: {
  row: EventCompanyRow | null;
  owners: PersonOption[];
  tiers: TierOption[];
  currentUserId: string;
  isAdmin: boolean;
  fieldDefinitions: CustomFieldDefinition[];
  /** Ordered IDs of the current filtered list — enables prev/next. */
  recordIds?: string[];
  onClose: () => void;
  onNavigateRecord: (id: string) => void;
}) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && row) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row, onClose]);

  const rowId = row?.id ?? null;
  const [reloadKey, setReloadKey] = useState(0);
  const loadedRowRef = useRef<string | null>(null);

  useEffect(() => {
    if (!rowId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    // Keep current data on an in-place reload; clear it when the record changes.
    if (loadedRowRef.current !== rowId) setData(null);
    loadedRowRef.current = rowId;

    void loadCompanyDrawerData({ eventCompanyId: rowId }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [rowId, reloadKey]);

  const idx = row && recordIds ? recordIds.indexOf(row.id) : -1;
  const prevId = idx > 0 ? recordIds![idx - 1]! : null;
  const nextId =
    idx >= 0 && recordIds && idx < recordIds.length - 1
      ? recordIds[idx + 1]!
      : null;

  return (
    <>
      <button
        type="button"
        id="close-drawer"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm transition-opacity lg:bg-zinc-900/30",
          row ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Close drawer"
        tabIndex={row ? 0 : -1}
      />
      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 h-[100dvh] w-full overflow-y-auto overscroll-y-contain border-zinc-200 bg-white shadow-[var(--shadow-overlay)] transition-transform duration-200 ease-[var(--ease-out-soft)] lg:inset-x-auto lg:right-0 lg:top-0 lg:h-dvh lg:max-w-2xl lg:border-l",
          row ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-y-0 lg:translate-x-full",
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
            onClose={onClose}
            onNavigateRecord={onNavigateRecord}
            onDataChanged={() => setReloadKey((k) => k + 1)}
            prevId={prevId}
            nextId={nextId}
            positionLabel={
              idx >= 0 && recordIds
                ? `${idx + 1} / ${recordIds.length}`
                : null
            }
          />
        ) : row && loading ? (
          <div className="space-y-4 p-6">
            <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="mt-8 h-40 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ) : row && error ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
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
  onClose,
  onNavigateRecord,
  onDataChanged,
  prevId,
  nextId,
  positionLabel,
}: {
  row: EventCompanyRow;
  owners: PersonOption[];
  tiers: TierOption[];
  data: DrawerData;
  currentUserId: string;
  isAdmin: boolean;
  fieldDefinitions: CustomFieldDefinition[];
  onClose: () => void;
  onNavigateRecord: (id: string) => void;
  onDataChanged: () => void;
  prevId: string | null;
  nextId: string | null;
  positionLabel: string | null;
}) {
  const [row, setRow] = useState(initial);
  const [tab, setTab] = useState<DrawerTab>("overview");
  useEffect(() => setRow(initial), [initial]);
  useEffect(() => setTab("overview"), [initial.id]);

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
    { id: "notes", label: "Notes" },
    ...(showBenefitsTab ? [{ id: "benefits" as const, label: "Benefits" }] : []),
    { id: "ai", label: "AI" },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-zinc-200/90 bg-white/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-6 sm:pb-4 sm:pt-5 dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-3">
            <CompanyAvatar
              name={row.companyName}
              website={row.companyWebsite}
              logoUrl={row.companyLogoUrl}
              size="lg"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {row.companyIndustry ?? "Prospect"}
              </div>
              <h2 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
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
          </div>
          <div className="flex shrink-0 items-start gap-1.5">
            {(prevId || nextId) && (
              <div className="mr-1 flex items-center gap-0.5 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
                {prevId ? (
                  <button
                    type="button"
                    onClick={() => onNavigateRecord(prevId)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    title="Previous"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="p-1.5 text-zinc-300 dark:text-zinc-700">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                )}
                {positionLabel ? (
                  <span className="px-1 text-[10px] tabular-nums text-zinc-400">
                    {positionLabel}
                  </span>
                ) : null}
                {nextId ? (
                  <button
                    type="button"
                    onClick={() => onNavigateRecord(nextId)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    title="Next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="p-1.5 text-zinc-300 dark:text-zinc-700">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            )}
            <PlaybookMenu
              eventCompanyId={row.id}
              onChanged={onDataChanged}
            />
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={row.status} />
          {hasBouncedTag(row.tagsCache) ? <BouncedBadge /> : null}
          {hasDeferredTag(row.tagsCache) ? <DeferredBadge /> : null}
          <PriorityDot priority={row.priority} />
          {row.targetTierName ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: row.targetTierColor ?? "#94a3b8" }}
              />
              Target: {row.targetTierName}
            </span>
          ) : null}
          {row.confirmedTierName ? (
            <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Confirmed: {row.confirmedTierName}
            </span>
          ) : null}
        </div>

        <nav className="mt-4 -mb-px flex gap-0.5 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150",
                tab === t.id
                  ? "border-brand-600 text-zinc-900 dark:border-brand-400 dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200",
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
                <span className="ml-1 text-xs text-zinc-400">
                  {data.contacts.length}
                </span>
              ) : null}
              {t.id === "activity" && data.interactions.length > 0 ? (
                <span className="ml-1 text-xs text-zinc-400">
                  {data.interactions.length}
                </span>
              ) : null}
              {t.id === "tasks" && data.tasks.length > 0 ? (
                <span className="ml-1 text-xs text-zinc-400">
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
                <span className="ml-1 text-xs text-zinc-400">
                  {
                    data.benefits.filter((b) => b.status !== "delivered" && b.status !== "skipped").length
                  }
                  /{data.benefits.length}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 px-6 py-5">
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
        ) : tab === "notes" ? (
          <NotesTab
            companyId={row.companyId}
            companyName={row.companyName}
            notesDoc={data.notesDoc}
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

/**
 * Long-form notes on the company record itself (not the event prospect), so
 * they persist across events. Autosaves on a debounce — there is no submit
 * button to hang a save off.
 */
function NotesTab({
  companyId,
  companyName,
  notesDoc,
}: {
  companyId: string;
  companyName: string;
  notesDoc: RichDoc | null;
}) {
  const onSave = useCallback(
    (doc: RichDoc | null) => updateCompanyNotes({ companyId, doc }),
    [companyId],
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Notes about {companyName}. Shared across every event this company
        appears in.
      </p>
      <AutosaveRichEditor
        value={notesDoc}
        placeholder="Background, relationship history, who knows whom…"
        onSave={onSave}
        minHeightClass="min-h-[18rem]"
      />
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
            <StatusCell
              row={row}
              tiers={tiers}
              display={PROSPECT_STATUS_LABELS[row.status]}
              onStatusChange={(v) => update("status", v)}
              onConfirmed={(input) => {
                update("confirmedAmount", input.confirmedAmount);
                update("confirmedTierId", input.confirmedTierId);
              }}
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
        <KV
          label="Size"
          value={
            <CellShell
              fieldKey="company.sizeBand"
              entityId={row.companyId}
              value={row.companySizeBand}
              display={row.companySizeBand ?? "—"}
              onLocalChange={(v) => update("companySizeBand", v)}
              Editor={TextEditor}
            />
          }
        />
        <KV
          label="Sector"
          value={
            <CellShell
              fieldKey="company.category"
              entityId={row.companyId}
              value={row.companyCategory}
              display={row.companyCategory ?? "—"}
              onLocalChange={(v) => update("companyCategory", v)}
              Editor={TextEditor}
            />
          }
        />
        <KV
          label="Sub-sector"
          value={
            <CellShell
              fieldKey="company.subcategory"
              entityId={row.companyId}
              value={
                row.companySubcategory ??
                (typeof row.customFields?.subcategory === "string"
                  ? row.customFields.subcategory
                  : null)
              }
              display={
                row.companySubcategory ??
                (typeof row.customFields?.subcategory === "string"
                  ? row.customFields.subcategory
                  : null) ??
                "—"
              }
              onLocalChange={(v) => update("companySubcategory", v)}
              Editor={TextEditor}
            />
          }
        />
      </Section>

      {(row.status === "confirmed" ||
        row.status === "committed" ||
        row.agreementSignedAt ||
        row.invoiceSentAt ||
        row.paidAt ||
        row.boothNumber ||
        row.repNames) && (
        <Section title="Fulfillment">
          <KV
            label="Agreement signed"
            value={
              <CellShell
                fieldKey="eventCompany.agreementSignedAt"
                entityId={row.id}
                value={row.agreementSignedAt}
                display={formatRelativeDate(row.agreementSignedAt)}
                onLocalChange={(v) => update("agreementSignedAt", v)}
                Editor={DateEditor}
              />
            }
          />
          <KV
            label="Invoice sent"
            value={
              <CellShell
                fieldKey="eventCompany.invoiceSentAt"
                entityId={row.id}
                value={row.invoiceSentAt}
                display={formatRelativeDate(row.invoiceSentAt)}
                onLocalChange={(v) => update("invoiceSentAt", v)}
                Editor={DateEditor}
              />
            }
          />
          <KV
            label="Paid"
            value={
              <CellShell
                fieldKey="eventCompany.paidAt"
                entityId={row.id}
                value={row.paidAt}
                display={formatRelativeDate(row.paidAt)}
                onLocalChange={(v) => update("paidAt", v)}
                Editor={DateEditor}
              />
            }
          />
          <KV
            label="Booth #"
            value={
              <CellShell
                fieldKey="eventCompany.boothNumber"
                entityId={row.id}
                value={row.boothNumber}
                display={row.boothNumber ?? "—"}
                onLocalChange={(v) => update("boothNumber", v)}
                Editor={TextEditor}
              />
            }
          />
          <KV
            label="Rep names"
            value={
              <CellShell
                fieldKey="eventCompany.repNames"
                entityId={row.id}
                value={row.repNames}
                display={row.repNames ?? "—"}
                onLocalChange={(v) => update("repNames", v)}
                Editor={TextEditor}
              />
            }
          />
        </Section>
      )}

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
