"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  acceptSuggestion,
  enrichSingle,
  rejectSuggestion,
} from "@/lib/actions/ai";
import type { JobRow, SuggestionRow } from "@/lib/db/queries/ai";
import { ENRICHMENT_FIELD_LABELS, type EnrichmentField } from "@/lib/db/schema";

type Props = {
  eventCompanyId: string;
  suggestions: SuggestionRow[];
  jobs: JobRow[];
  hasProspectus: boolean;
  prospectusFileName: string | null;
  isAdmin: boolean;
};

const ALL_FIELDS: EnrichmentField[] = [
  "whyTheyShouldAttend",
  "keyTalkingPoints",
  "emailAngle",
  "sponsorshipHook",
];

export function AiTab({
  eventCompanyId,
  suggestions,
  jobs,
  hasProspectus,
  prospectusFileName,
  isAdmin,
}: Props) {
  const [running, startRun] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pending = suggestions.filter((s) => s.status === "pending");
  const pendingByField = new Map<string, SuggestionRow[]>();
  for (const s of pending) {
    const list = pendingByField.get(s.field) ?? [];
    list.push(s);
    pendingByField.set(s.field, list);
  }

  const latestJob = jobs[0];

  const runEnrich = () => {
    setError(null);
    setSuccessMessage(null);
    startRun(async () => {
      const res = await enrichSingle({ eventCompanyId });
      if (!res.ok) {
        setError(res.error);
      } else {
        setSuccessMessage(
          `Generated ${res.suggestionCount} suggestion${res.suggestionCount === 1 ? "" : "s"}. Refresh the drawer to review.`,
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI enrichment
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {hasProspectus
                ? `Drafts outreach copy grounded in ${prospectusFileName ?? "the uploaded prospectus"} + a web search about this company.`
                : "Upload a prospectus PDF for this event first (Admin → Events → Prospectus)."}
            </p>
          </div>
          <Button
            size="sm"
            onClick={runEnrich}
            disabled={!hasProspectus || running}
            title={
              !hasProspectus
                ? "Prospectus required"
                : "Generate fresh suggestions"
            }
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {running ? "Thinking…" : "Enrich with AI"}
          </Button>
        </div>
        {error ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {successMessage ? (
          <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {successMessage}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Pending suggestions</h4>
        {pending.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No pending suggestions. Click <strong>Enrich with AI</strong> above
            to generate fresh drafts.
          </div>
        ) : (
          ALL_FIELDS.map((field) => {
            const list = pendingByField.get(field);
            if (!list || list.length === 0) return null;
            return (
              <div
                key={field}
                className="rounded-lg border border-slate-200 dark:border-slate-800"
              >
                <header className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-zinc-900 dark:text-slate-300">
                  {ENRICHMENT_FIELD_LABELS[field as EnrichmentField] ?? field}
                </header>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {list.map((s) => (
                    <SuggestionRowItem
                      key={s.id}
                      suggestion={s}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      {latestJob ? (
        <section className="rounded-lg border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <h4 className="font-semibold text-slate-700 dark:text-slate-200">
            Recent runs
          </h4>
          <ul className="mt-1 space-y-1">
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center gap-2">
                <span
                  className={
                    j.status === "succeeded"
                      ? "inline-block h-2 w-2 rounded-full bg-emerald-500"
                      : j.status === "failed"
                        ? "inline-block h-2 w-2 rounded-full bg-red-500"
                        : "inline-block h-2 w-2 rounded-full bg-amber-500"
                  }
                />
                <span>{new Date(j.createdAt).toLocaleString()}</span>
                <span className="font-mono text-slate-400">{j.model}</span>
                <span className="ml-auto">${Number(j.costUsd).toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SuggestionRowItem({
  suggestion,
  isAdmin,
}: {
  suggestion: SuggestionRow;
  isAdmin: boolean;
}) {
  const [pending, startPending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const confidence = suggestion.confidence
    ? Math.round(Number(suggestion.confidence) * 100)
    : null;

  const accept = () => {
    setError(null);
    startPending(async () => {
      const res = await acceptSuggestion({ id: suggestion.id });
      if (!res.ok) setError(res.error);
    });
  };
  const reject = () => {
    setError(null);
    startPending(async () => {
      const res = await rejectSuggestion({ id: suggestion.id });
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="p-3">
      <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
        {suggestion.suggestion}
      </p>
      {suggestion.reasoning ? (
        <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
          {suggestion.reasoning}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-2 text-xs">
        {confidence !== null ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-zinc-800 dark:text-slate-300">
            {confidence}% confidence
          </span>
        ) : null}
        {suggestion.sourceUrls.length > 0 ? (
          <span className="text-slate-500 dark:text-slate-400">
            {suggestion.sourceUrls.length} source
            {suggestion.sourceUrls.length === 1 ? "" : "s"}:{" "}
            {suggestion.sourceUrls.slice(0, 3).map((u, i) => (
              <span key={u}>
                {i > 0 ? ", " : ""}
                <a
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  [{i + 1}]
                </a>
              </span>
            ))}
          </span>
        ) : null}
        {isAdmin ? (
          <div className="ml-auto flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={reject}
              disabled={pending}
              className="h-7 px-2"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Reject</span>
            </Button>
            <Button
              size="sm"
              onClick={accept}
              disabled={pending}
              className="h-7 px-2"
            >
              <Check className="mr-1 h-3 w-3" />
              {pending ? "…" : "Accept"}
            </Button>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
