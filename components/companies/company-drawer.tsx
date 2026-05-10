"use client";

import { X } from "lucide-react";
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
import { PriorityDot } from "./priority-dot";
import {
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "./status-badge";
import {
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
} from "@/lib/db/schema";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export function CompanyDrawer({
  row,
  owners,
  tiers,
}: {
  row: EventCompanyRow | null;
  owners: PersonOption[];
  tiers: TierOption[];
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
        href="/companies"
        scroll={false}
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm transition-opacity",
          row ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-40 h-screen w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform dark:border-slate-800 dark:bg-slate-900",
          row ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!row}
      >
        {row ? <DrawerContent row={row} owners={owners} tiers={tiers} /> : null}
      </aside>
    </>
  );
}

function DrawerContent({
  row: initial,
  owners,
  tiers,
}: {
  row: EventCompanyRow;
  owners: PersonOption[];
  tiers: TierOption[];
}) {
  const [row, setRow] = useState(initial);
  useEffect(() => setRow(initial), [initial]);

  const update = <K extends keyof EventCompanyRow>(
    key: K,
    value: EventCompanyRow[K],
  ) => setRow((prev) => ({ ...prev, [key]: value }));

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
        <Link
          href="/companies"
          scroll={false}
          className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Close"
        >
          <X className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={row.status} />
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

      <Section title="Outreach">
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
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <header className="mb-3 flex items-center justify-between">
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
