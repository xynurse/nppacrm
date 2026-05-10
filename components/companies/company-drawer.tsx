"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { PriorityDot } from "./priority-dot";
import { StatusBadge } from "./status-badge";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function CompanyDrawer({ row }: { row: EventCompanyRow | null }) {
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
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/30 transition-opacity backdrop-blur-sm",
          row ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <Link
        id="close-drawer"
        href="/companies"
        scroll={false}
        className={cn(
          "fixed inset-0 z-30",
          row ? "block" : "hidden",
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
        {row ? <DrawerContent row={row} /> : null}
      </aside>
    </>
  );
}

function DrawerContent({ row }: { row: EventCompanyRow }) {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {row.companyIndustry ?? "Prospect"}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            {row.companyName}
          </h2>
          {row.companyWebsite ? (
            <a
              href={row.companyWebsite}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:underline dark:text-slate-400"
            >
              {row.companyWebsite}
            </a>
          ) : null}
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

      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Inline editing lands in chunk 4. Quick-log buttons in chunk 5.
      </div>

      <Section title="About" disabled>
        <KV label="Owner" value={row.ownerName ?? "—"} />
        <KV label="HQ" value={row.companyHqLocation ?? "—"} />
        <KV label="Industry" value={row.companyIndustry ?? "—"} />
        <KV
          label="Proposed"
          value={formatCurrency(row.proposedAmount, row.currency)}
        />
        <KV
          label="Confirmed"
          value={formatCurrency(row.confirmedAmount, row.currency)}
        />
        <KV
          label="Last contact"
          value={formatRelativeDate(row.lastContactedAt)}
        />
        <KV
          label="Next action"
          value={formatRelativeDate(row.nextActionAt)}
        />
      </Section>

      <Section title="Outreach" disabled>
        <Para label="Why they should attend" value={row.whyTheyShouldAttend} />
        <Para label="Key talking points" value={row.keyTalkingPoints} />
        <Para label="Email angle" value={row.emailAngle} />
        <Para label="Sponsorship hook" value={row.sponsorshipHook} />
      </Section>

      <Section title="Notes" disabled>
        <Para label="Company context" value={row.companyContext} />
        <Para label="Relationship notes" value={row.relationshipNotes} />
      </Section>

    </div>
  );
}

function Section({
  title,
  disabled,
  children,
}: {
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {disabled ? (
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Read-only
          </span>
        ) : null}
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="col-span-2 text-slate-900 dark:text-slate-100">
        {value}
      </dd>
    </div>
  );
}

function Para({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-sm">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-slate-900 dark:text-slate-100">
        {value || (
          <span className="italic text-slate-400 dark:text-slate-500">
            Not yet drafted
          </span>
        )}
      </div>
    </div>
  );
}
