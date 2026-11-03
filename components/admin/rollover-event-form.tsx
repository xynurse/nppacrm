"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { rolloverEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  sourceEventId: string;
  sourceName: string;
  sourceSlug: string;
  currency: string;
  timezone: string;
  fundraisingGoal: string | null;
};

function suggestNextSlug(slug: string): string {
  const yearMatch = slug.match(/(.*?)(\d{4})$/u);
  if (yearMatch?.[1] != null && yearMatch[2] != null) {
    const year = Number(yearMatch[2]);
    if (Number.isFinite(year)) return `${yearMatch[1]}${year + 1}`;
  }
  return `${slug}-next`;
}

function suggestNextName(name: string): string {
  const yearMatch = name.match(/(.*?)(\d{4})\s*$/u);
  if (yearMatch?.[1] != null && yearMatch[2] != null) {
    const year = Number(yearMatch[2]);
    if (Number.isFinite(year)) return `${yearMatch[1].trimEnd()} ${year + 1}`;
  }
  return `${name} (next)`;
}

export function RolloverEventForm({
  sourceEventId,
  sourceName,
  sourceSlug,
  currency,
  timezone,
  fundraisingGoal,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const defaults = useMemo(
    () => ({
      name: suggestNextName(sourceName),
      slug: suggestNextSlug(sourceSlug),
    }),
    [sourceName, sourceSlug],
  );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">
        Start next year from this event
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Creates a new event with copied tiers, custom fields, and reviewers.
        Confirmed sponsors become past sponsors (renewal targets). Pipeline
        rows reset to prospect. Tasks, emails, and fulfillment stay on the
        source year.
      </p>

      <form
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          const payload = {
            sourceEventId,
            name: String(fd.get("name") ?? ""),
            slug: String(fd.get("slug") ?? ""),
            startDate: String(fd.get("startDate") ?? ""),
            endDate: String(fd.get("endDate") ?? ""),
            fundraisingGoal: String(fd.get("fundraisingGoal") ?? ""),
            currency: String(fd.get("currency") ?? currency),
            timezone: String(fd.get("timezone") ?? timezone),
            includeConfirmed: fd.get("includeConfirmed") === "on",
            includePastSponsors: fd.get("includePastSponsors") === "on",
            includePipeline: fd.get("includePipeline") === "on",
            includeDeclined: fd.get("includeDeclined") === "on",
            archiveSource: fd.get("archiveSource") === "on",
          };
          setError(null);
          startTransition(async () => {
            const result = await rolloverEvent(payload);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/admin/events/${result.eventId}`);
            router.refresh();
          });
        }}
      >
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="rollover-name">New name</Label>
          <Input
            id="rollover-name"
            name="name"
            required
            defaultValue={defaults.name}
            disabled={pending}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="rollover-slug">New slug</Label>
          <Input
            id="rollover-slug"
            name="slug"
            required
            defaultValue={defaults.slug}
            disabled={pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rollover-start">Start date</Label>
          <Input
            id="rollover-start"
            name="startDate"
            type="date"
            disabled={pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rollover-end">End date</Label>
          <Input
            id="rollover-end"
            name="endDate"
            type="date"
            disabled={pending}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="rollover-goal">Fundraising goal</Label>
          <Input
            id="rollover-goal"
            name="fundraisingGoal"
            inputMode="decimal"
            defaultValue={fundraisingGoal ?? ""}
            placeholder="250000.00"
            disabled={pending}
          />
        </div>
        <input type="hidden" name="currency" value={currency} />
        <input type="hidden" name="timezone" value={timezone} />

        <fieldset className="sm:col-span-6 space-y-2 rounded-md border border-zinc-100 bg-zinc-50/80 p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Companies to carry over
          </legend>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="includeConfirmed"
              defaultChecked
              disabled={pending}
              className="rounded border-zinc-300"
            />
            Confirmed sponsors → past sponsor (renewals)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="includePastSponsors"
              defaultChecked
              disabled={pending}
              className="rounded border-zinc-300"
            />
            Existing past sponsors
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="includePipeline"
              defaultChecked
              disabled={pending}
              className="rounded border-zinc-300"
            />
            Open pipeline → prospect (clean slate)
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="includeDeclined"
              disabled={pending}
              className="rounded border-zinc-300"
            />
            Declined (usually leave off)
          </label>
          <label className="flex items-center gap-2 border-t border-zinc-200/80 pt-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="archiveSource"
              disabled={pending}
              className="rounded border-zinc-300"
            />
            Archive this source event after rollover
          </label>
        </fieldset>

        <div className="sm:col-span-6 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Starting next year…" : "Create next-year event"}
          </Button>
          {error ? (
            <span className="text-sm text-red-600">{error}</span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
