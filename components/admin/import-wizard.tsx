"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  importEventCompaniesCsv,
  type ImportPreview,
} from "@/lib/actions/csv";
import {
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ParsedRow = {
  name: string;
  industry?: string | null;
  hqLocation?: string | null;
  status?: string;
  priority?: string;
  proposedAmount?: string | null;
  confirmedAmount?: string | null;
};

const FIELD_ALIASES: Record<string, keyof ParsedRow> = {
  name: "name",
  company: "name",
  company_name: "name",
  companyname: "name",
  industry: "industry",
  sector: "industry",
  hq: "hqLocation",
  hq_location: "hqLocation",
  headquarters: "hqLocation",
  location: "hqLocation",
  status: "status",
  priority: "priority",
  proposed: "proposedAmount",
  proposed_amount: "proposedAmount",
  confirmed: "confirmedAmount",
  confirmed_amount: "confirmedAmount",
};

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cur.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      cur.push(field);
      field = "";
      if (cur.some((c) => c.trim() !== "")) rows.push(cur);
      cur = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    if (cur.some((c) => c.trim() !== "")) rows.push(cur);
  }
  if (rows.length === 0) return { header: [], rows: [] };
  return { header: rows[0]!, rows: rows.slice(1) };
}

function normalizeHeader(h: string): keyof ParsedRow | null {
  const cleaned = h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return FIELD_ALIASES[cleaned] ?? null;
}

function rowsFromText(text: string): {
  parsed: ParsedRow[];
  unmapped: string[];
} {
  const { header, rows } = parseCsv(text);
  const colMap = header.map(normalizeHeader);
  const unmapped = header.filter((h, i) => colMap[i] === null);
  const parsed: ParsedRow[] = [];
  for (const r of rows) {
    const row: ParsedRow = { name: "" };
    for (let i = 0; i < r.length; i += 1) {
      const key = colMap[i];
      if (!key) continue;
      const raw = r[i]?.trim() ?? "";
      if (raw === "") continue;
      if (key === "status") {
        const lower = raw.toLowerCase().replace(/\s+/g, "_");
        row.status = (PROSPECT_STATUS_VALUES as readonly string[]).includes(
          lower,
        )
          ? lower
          : undefined;
      } else if (key === "priority") {
        const lower = raw.toLowerCase();
        row.priority = (PROSPECT_PRIORITY_VALUES as readonly string[]).includes(
          lower,
        )
          ? lower
          : undefined;
      } else if (key === "proposedAmount" || key === "confirmedAmount") {
        const cleaned = raw.replace(/[$,]/g, "");
        row[key] = /^\d+(\.\d{1,2})?$/.test(cleaned) ? cleaned : null;
      } else {
        (row as Record<string, unknown>)[key] = raw;
      }
    }
    if (row.name) parsed.push(row);
  }
  return { parsed, unmapped };
}

export function ImportWizard({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"paste" | "preview" | "done">("paste");

  const { parsed, unmapped } = useMemo(() => rowsFromText(text), [text]);

  const handleFile = async (file: File) => {
    const t = await file.text();
    setText(t);
  };

  const runPreview = () => {
    setError(null);
    if (parsed.length === 0) {
      setError("No valid rows found. Make sure there's a header with a name column.");
      return;
    }
    startTransition(async () => {
      const res = await importEventCompaniesCsv({
        eventId,
        rows: parsed,
        commit: false,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview(res.preview);
      setStep("preview");
    });
  };

  const commit = () => {
    setError(null);
    startTransition(async () => {
      const res = await importEventCompaniesCsv({
        eventId,
        rows: parsed,
        commit: true,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview(res.preview);
      setStep("done");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {step === "paste" ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <Label htmlFor="import-csv">CSV content</Label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 hover:underline dark:text-slate-300">
              <Upload className="h-3 w-3" />
              Choose file…
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <textarea
            id="import-csv"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full rounded-md border border-slate-200 bg-white p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900"
            placeholder={`name,industry,hq_location,status,priority\nVertex Therapeutics,Pharma,Boston MA,prospect,high`}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recognized columns: name, industry, hq_location, status, priority,
            proposed_amount, confirmed_amount.
          </p>
          {unmapped.length > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Ignored columns: {unmapped.join(", ")}
            </p>
          ) : null}
          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Parsed {parsed.length} row{parsed.length === 1 ? "" : "s"}.
            </p>
            <Button
              type="button"
              onClick={runPreview}
              disabled={pending || parsed.length === 0}
            >
              {pending ? "Checking…" : "Preview import"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "preview" && preview ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold">Dry-run preview</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <span className="text-slate-500">Total rows:</span>{" "}
              <strong>{preview.totalRows}</strong>
            </li>
            <li>
              <span className="text-slate-500">New companies to create:</span>{" "}
              <strong>{preview.toCreate}</strong>
            </li>
            <li>
              <span className="text-slate-500">Attach existing companies:</span>{" "}
              <strong>{preview.toAttachExisting}</strong>
            </li>
            <li>
              <span className="text-slate-500">Already on event (skip):</span>{" "}
              <strong>{preview.alreadyOnEvent}</strong>
            </li>
          </ul>
          {preview.errors.length > 0 ? (
            <details className="text-xs text-amber-600 dark:text-amber-400">
              <summary>{preview.errors.length} warning(s)</summary>
              <ul className="mt-1 list-disc pl-4">
                {preview.errors.slice(0, 20).map((e) => (
                  <li key={e.index}>
                    Row {e.index + 1}: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("paste");
                setPreview(null);
              }}
            >
              Back
            </Button>
            <Button type="button" onClick={commit} disabled={pending}>
              {pending ? "Importing…" : `Commit import (${parsed.length})`}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" && preview ? (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
          <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            Import complete
          </h2>
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            Created {preview.toCreate} companies · attached{" "}
            {preview.toAttachExisting} existing · skipped{" "}
            {preview.alreadyOnEvent} already on event.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setText("");
              setPreview(null);
              setStep("paste");
            }}
          >
            Import another batch
          </Button>
        </div>
      ) : null}
    </div>
  );
}
