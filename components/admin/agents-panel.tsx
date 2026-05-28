"use client";

import {
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  acceptCompanySuggestion,
  dismissCompanySuggestion,
  runDiscoveryAgent,
  toggleAgent,
} from "@/lib/actions/agents";
import { Button } from "@/components/ui/button";
import type { AgentRunRow, CompanySuggestionRow } from "@/lib/db/queries/agents";

type Props = {
  eventId: string;
  discoveryEnabled: boolean;
  lastRunAt: Date | null;
  suggestions: CompanySuggestionRow[];
  runs: AgentRunRow[];
};

export function AgentsPanel({
  eventId,
  discoveryEnabled,
  lastRunAt,
  suggestions,
  runs,
}: Props) {
  const router = useRouter();
  const [running, startRunning] = useTransition();
  const [toggling, startToggling] = useTransition();
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{
    count: number;
  } | null>(null);

  const handleRun = () => {
    setRunError(null);
    setRunResult(null);
    startRunning(async () => {
      const res = await runDiscoveryAgent({ eventId });
      if (!res.ok) {
        setRunError(res.error);
      } else {
        setRunResult({ count: res.count });
        router.refresh();
      }
    });
  };

  const handleToggle = (enabled: boolean) => {
    startToggling(async () => {
      await toggleAgent({ eventId, agentType: "discovery", enabled });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Agent controls */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">Agents</h2>
        <div className="mt-3 space-y-4">
          {/* Discovery */}
          <AgentRow
            icon={<Bot className="h-4 w-4" />}
            name="Discovery"
            description="Finds new company sponsorship candidates using web research + AI."
            enabled={discoveryEnabled}
            lastRunAt={lastRunAt}
            badge={
              suggestions.length > 0
                ? `${suggestions.length} pending`
                : undefined
            }
            onToggle={handleToggle}
            toggling={toggling}
            runButton={
              <Button
                size="sm"
                variant="outline"
                onClick={handleRun}
                disabled={running}
              >
                {running ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Run now
                  </>
                )}
              </Button>
            }
          />

          {/* Watch — coming soon */}
          <AgentRow
            icon={<Bot className="h-4 w-4 opacity-40" />}
            name="Watch"
            description="Monitors existing prospects for news, leadership changes, and funding signals."
            enabled={false}
            lastRunAt={null}
            disabled
            badge="Coming soon"
            onToggle={() => {}}
            toggling={false}
          />
        </div>

        {runError ? (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">
            {runError}
          </p>
        ) : null}
        {runResult ? (
          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Run complete — {runResult.count} new candidate
            {runResult.count === 1 ? "" : "s"} added to inbox below.
          </p>
        ) : null}
      </section>

      {/* Suggestions inbox */}
      {suggestions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Suggestions inbox ({suggestions.length})
          </h2>
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              eventId={eventId}
              onReviewed={() => router.refresh()}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No pending suggestions. Run the Discovery agent to generate candidates.
        </section>
      )}

      {/* Run history */}
      {runs.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Run history</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Agent
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Candidates
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Cost
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                    Run at
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {runs.map((r) => (
                  <tr key={r.id} className="bg-white dark:bg-slate-900">
                    <td className="px-3 py-2 capitalize text-slate-700 dark:text-slate-200">
                      {r.agentType}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} error={r.error} />
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {r.suggestionCount}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      ${Number(r.costUsd).toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentRow sub-component
// ---------------------------------------------------------------------------

function AgentRow({
  icon,
  name,
  description,
  enabled,
  lastRunAt,
  badge,
  disabled,
  onToggle,
  toggling,
  runButton,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  enabled: boolean;
  lastRunAt: Date | null;
  badge?: string;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
  toggling: boolean;
  runButton?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {name}
          </span>
          {badge ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
        {lastRunAt ? (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
            <Clock className="h-3 w-3" />
            Last run {new Date(lastRunAt).toLocaleString()}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {runButton}
        <button
          type="button"
          disabled={disabled || toggling}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            enabled
              ? "bg-emerald-500"
              : "bg-slate-200 dark:bg-slate-700"
          } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuggestionCard sub-component
// ---------------------------------------------------------------------------

function SuggestionCard({
  suggestion,
  eventId,
  onReviewed,
}: {
  suggestion: CompanySuggestionRow;
  eventId: string;
  onReviewed: () => void;
}) {
  const [accepting, startAccepting] = useTransition();
  const [dismissing, startDismissing] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    setError(null);
    startAccepting(async () => {
      const res = await acceptCompanySuggestion({
        suggestionId: suggestion.id,
        eventId,
      });
      if (!res.ok) setError(res.error);
      else onReviewed();
    });
  };

  const handleDismiss = () => {
    setError(null);
    startDismissing(async () => {
      const res = await dismissCompanySuggestion({
        suggestionId: suggestion.id,
        eventId,
      });
      if (!res.ok) setError(res.error);
      else onReviewed();
    });
  };

  const score = suggestion.matchScore
    ? Math.round(Number(suggestion.matchScore) * 100)
    : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {suggestion.companyName}
            </span>
            {suggestion.industry ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {suggestion.industry}
              </span>
            ) : null}
            {suggestion.hqLocation ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {suggestion.hqLocation}
              </span>
            ) : null}
            {score !== null ? (
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  score >= 80
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : score >= 60
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {score}% match
              </span>
            ) : null}
            {suggestion.website ? (
              <a
                href={
                  suggestion.website.startsWith("http")
                    ? suggestion.website
                    : `https://${suggestion.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {suggestion.rationale}
          </p>
          {suggestion.sourceUrls.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {suggestion.sourceUrls.slice(0, 3).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-[10px] text-slate-400 hover:underline dark:text-slate-500"
                  style={{ maxWidth: "200px" }}
                >
                  {url.replace(/^https?:\/\//, "").split("/")[0]}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAccept}
            disabled={accepting || dismissing}
            className="text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400"
          >
            {accepting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span className="ml-1">Add</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            disabled={accepting || dismissing}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            {dismissing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            <span className="ml-1">Dismiss</span>
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  error,
}: {
  status: string;
  error: string | null;
}) {
  if (status === "completed")
    return (
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    );
  if (status === "failed")
    return (
      <span
        className="flex items-center gap-1 text-red-600 dark:text-red-400"
        title={error ?? undefined}
      >
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
      <Loader2 className="h-3 w-3 animate-spin" />
      Running
    </span>
  );
}
