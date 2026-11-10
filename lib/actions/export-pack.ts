"use server";

import { strToU8, zipSync } from "fflate";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { escapeCsv } from "@/lib/csv";
import { todayInTimeZone } from "@/lib/dates";
import { exportReportCsv } from "@/lib/actions/reports";
import {
  exportContacts,
  exportFulfillment,
  exportInteractions,
  exportPipelineHistory,
  exportSponsors,
  exportTasks,
  getExportEvent,
} from "@/lib/db/queries/export-pack";
import { exportPackSchema } from "@/lib/schemas/export-pack";

type Result =
  | { ok: true; filename: string; zipBase64: string; fileCount: number }
  | { ok: false; error: string };

const REPORT_KINDS = ["summary", "funnel", "leaderboard", "tier-mix", "days-in-stage"] as const;

function cell(v: unknown): string {
  if (v instanceof Date) return escapeCsv(v.toISOString());
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (v !== null && typeof v === "object") return escapeCsv(JSON.stringify(v));
  return escapeCsv(v);
}

/** Header from the first object's keys (or `fallback` when empty). */
function toCsv(rows: Record<string, unknown>[], fallback: string[]): string {
  const header = rows[0] ? Object.keys(rows[0]) : fallback;
  const lines = rows.map((r) => header.map((k) => cell(r[k])).join(","));
  // BOM so Excel opens UTF-8 (names with accents) correctly.
  return "﻿" + [header.join(","), ...lines].join("\n");
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
}

export async function exportPack(raw: unknown): Promise<Result> {
  const session = await requireSession();
  const parsed = exportPackSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { eventId } = parsed.data;

  const event = await getExportEvent(eventId);
  if (!event) return { ok: false, error: "Event not found" };

  const [sponsors, contacts, history, interactions, tasks, fulfillment, reports] =
    await Promise.all([
      exportSponsors(eventId),
      exportContacts(eventId),
      exportPipelineHistory(eventId),
      exportInteractions(eventId),
      exportTasks(eventId),
      exportFulfillment(eventId),
      Promise.all(REPORT_KINDS.map((kind) => exportReportCsv({ eventId, kind }))),
    ]);

  const date = todayInTimeZone(event.timezone);
  const files: Record<string, Uint8Array> = {
    "sponsors.csv": strToU8(toCsv(sponsors, ["company"])),
    "contacts.csv": strToU8(toCsv(contacts, ["company"])),
    "pipeline-history.csv": strToU8(toCsv(history, ["changedAt"])),
    "interactions.csv": strToU8(toCsv(interactions, ["occurredAt"])),
    "tasks.csv": strToU8(toCsv(tasks, ["title"])),
    "fulfillment.csv": strToU8(toCsv(fulfillment, ["company"])),
  };
  reports.forEach((r, i) => {
    if (r.ok) files[`reports/${REPORT_KINDS[i]}.csv`] = strToU8("﻿" + r.csv);
  });

  files["README.txt"] = strToU8(
    [
      `Export pack — ${event.name}`,
      `Exported ${date} by ${session.user.name ?? session.user.email ?? "unknown"}`,
      "",
      `sponsors.csv          ${sponsors.length} companies in this event: status, owner, tiers, amounts, dates, tags, custom fields (JSON).`,
      `contacts.csv          ${contacts.length} contacts at those companies.`,
      `pipeline-history.csv  ${history.length} status changes, oldest first.`,
      `interactions.csv      ${interactions.length} logged emails, calls, meetings and notes.`,
      `tasks.csv             ${tasks.length} tasks (open and completed).`,
      `fulfillment.csv       ${fulfillment.length} confirmed sponsors: agreement / invoice / paid / booth.`,
      "reports/              The same CSVs as the buttons on the Reports page.",
      "",
      "Amounts are as stored (2 decimals). Timestamps are UTC (ISO 8601).",
      "Cells starting with = + - @ are prefixed with ' so spreadsheets do not run them as formulas.",
    ].join("\n"),
  );

  const zip = zipSync(files, { level: 6 });

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "event.export_pack",
    entityType: "event",
    entityId: eventId,
    changes: {
      sponsors: sponsors.length,
      contacts: contacts.length,
      tasks: tasks.length,
      interactions: interactions.length,
    },
  });

  return {
    ok: true,
    filename: `${slugify(event.name)}-export-${date}.zip`,
    zipBase64: Buffer.from(zip).toString("base64"),
    fileCount: Object.keys(files).length,
  };
}
