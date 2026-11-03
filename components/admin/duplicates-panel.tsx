"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { mergeCompanies } from "@/lib/actions/duplicates";
import type { DuplicateGroup } from "@/lib/db/queries/duplicates";
import { Button } from "@/components/ui/button";

export function DuplicatesPanel({
  groups,
  linkCounts,
}: {
  groups: DuplicateGroup[];
  linkCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [survivorByGroup, setSurvivorByGroup] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        groups.map((g) => [
          g.key,
          // Prefer the company with the most event links.
          [...g.companies].sort(
            (a, b) =>
              (linkCounts[b.id] ?? 0) - (linkCounts[a.id] ?? 0) ||
              a.name.localeCompare(b.name),
          )[0]!.id,
        ]),
      ),
  );

  if (groups.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No duplicate company names detected. Matching ignores Inc/LLC and
        punctuation.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {groups.map((g) => {
        const survivorId = survivorByGroup[g.key] ?? g.companies[0]!.id;
        const losers = g.companies.filter((c) => c.id !== survivorId);
        return (
          <section
            key={g.key}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-[var(--shadow-card)]"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Match · {g.key}
            </p>
            <ul className="mt-3 space-y-2">
              {g.companies.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="radio"
                      name={`survivor-${g.key}`}
                      checked={survivorId === c.id}
                      onChange={() =>
                        setSurvivorByGroup((prev) => ({
                          ...prev,
                          [g.key]: c.id,
                        }))
                      }
                      disabled={pending}
                    />
                    <span className="truncate font-medium text-zinc-900">
                      {c.name}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {linkCounts[c.id] ?? 0} event
                      {(linkCounts[c.id] ?? 0) === 1 ? "" : "s"}
                      {c.website ? ` · ${c.website}` : ""}
                    </span>
                  </label>
                  {survivorId === c.id ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Keep
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {losers.map((loser) => (
                <Button
                  key={loser.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !confirm(
                        `Merge “${loser.name}” into “${
                          g.companies.find((c) => c.id === survivorId)?.name
                        }”? The duplicate will be soft-deleted.`,
                      )
                    ) {
                      return;
                    }
                    setError(null);
                    startTransition(async () => {
                      const res = await mergeCompanies({
                        survivorId,
                        loserId: loser.id,
                      });
                      if (!res.ok) {
                        setError(res.error);
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  Merge “{loser.name}” → keep
                </Button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
