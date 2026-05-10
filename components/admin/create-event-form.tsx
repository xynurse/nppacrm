"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEvent } from "@/lib/actions/events";

export function CreateEventForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      id="create-event-form"
      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-6 dark:border-slate-800 dark:bg-slate-900"
      action={(formData) => {
        const payload = {
          name: String(formData.get("name") ?? ""),
          slug: String(formData.get("slug") ?? ""),
          startDate: String(formData.get("startDate") ?? ""),
          endDate: String(formData.get("endDate") ?? ""),
          fundraisingGoal: String(formData.get("fundraisingGoal") ?? ""),
          currency: String(formData.get("currency") ?? "USD"),
          timezone: String(formData.get("timezone") ?? "America/Chicago"),
        };
        setError(null);
        setSuccess(null);
        startTransition(async () => {
          const result = await createEvent(payload);
          if (!result.ok) setError(result.error);
          else {
            setSuccess(`Created ${payload.name}`);
            (
              document.getElementById("create-event-form") as HTMLFormElement
            )?.reset();
          }
        });
      }}
    >
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="event-name">Name</Label>
        <Input id="event-name" name="name" required disabled={pending} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="event-slug">Slug</Label>
        <Input
          id="event-slug"
          name="slug"
          required
          placeholder="lpd-2026"
          disabled={pending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="event-start">Start date</Label>
        <Input
          id="event-start"
          name="startDate"
          type="date"
          disabled={pending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="event-end">End date</Label>
        <Input id="event-end" name="endDate" type="date" disabled={pending} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="event-goal">Fundraising goal</Label>
        <Input
          id="event-goal"
          name="fundraisingGoal"
          inputMode="decimal"
          placeholder="250000.00"
          disabled={pending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="event-currency">Currency</Label>
        <Input
          id="event-currency"
          name="currency"
          defaultValue="USD"
          maxLength={3}
          disabled={pending}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="event-tz">Timezone</Label>
        <Input
          id="event-tz"
          name="timezone"
          defaultValue="America/Chicago"
          disabled={pending}
        />
      </div>
      <div className="sm:col-span-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create event"}
        </Button>
        {error ? (
          <span className="ml-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        ) : null}
        {success ? (
          <span className="ml-3 text-sm text-emerald-600 dark:text-emerald-400">
            {success}
          </span>
        ) : null}
      </div>
    </form>
  );
}
