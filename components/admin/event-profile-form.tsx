"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEvent } from "@/lib/actions/events";
import type { Event, EventCourseDirector } from "@/lib/db/schema";

type DirectorDraft = EventCourseDirector;

function emptyDirector(): DirectorDraft {
  return { name: "", title: "", credentials: "" };
}

export function EventProfileForm({ event }: { event: Event }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [location, setLocation] = useState(event.location ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [attendeeGoal, setAttendeeGoal] = useState(
    event.attendeeGoal != null ? String(event.attendeeGoal) : "",
  );
  const [sponsorCountGoal, setSponsorCountGoal] = useState(
    event.sponsorCountGoal != null ? String(event.sponsorCountGoal) : "",
  );
  const [fundraisingGoal, setFundraisingGoal] = useState(
    event.fundraisingGoal ?? "",
  );
  const [directors, setDirectors] = useState<DirectorDraft[]>(
    event.courseDirectors.length > 0
      ? event.courseDirectors.map((d) => ({
          name: d.name,
          title: d.title ?? "",
          credentials: d.credentials ?? "",
        }))
      : [emptyDirector()],
  );
  const [goals, setGoals] = useState<string[]>(
    event.goals.length > 0 ? [...event.goals] : [""],
  );

  return (
    <form
      className="space-y-5 rounded-lg border border-zinc-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const cleanedDirectors = directors
          .map((d) => ({
            name: d.name.trim(),
            title: d.title?.trim() || null,
            credentials: d.credentials?.trim() || null,
          }))
          .filter((d) => d.name.length > 0);

        const cleanedGoals = goals.map((g) => g.trim()).filter(Boolean);

        startTransition(async () => {
          const result = await updateEvent({
            id: event.id,
            location: location.trim() || null,
            description: description.trim() || null,
            fundraisingGoal: fundraisingGoal.trim() || undefined,
            attendeeGoal: attendeeGoal.trim() === "" ? null : attendeeGoal,
            sponsorCountGoal:
              sponsorCountGoal.trim() === "" ? null : sponsorCountGoal,
            courseDirectors: cleanedDirectors,
            goals: cleanedGoals,
          });
          if (!result.ok) setError(result.error);
          else setSuccess("Saved event details");
        });
      }}
    >
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Event profile</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Course directors, goals, and targets shown on the Event page.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Rochester, MN · Mayo Civic Center"
            disabled={pending}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="event-description">Description</Label>
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={pending}
            placeholder="Short summary for outreach context…"
            className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="event-fund-goal">Fundraising goal</Label>
          <Input
            id="event-fund-goal"
            value={fundraisingGoal}
            onChange={(e) => setFundraisingGoal(e.target.value)}
            inputMode="decimal"
            placeholder="250000.00"
            disabled={pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="event-attendee-goal">Attendee goal</Label>
          <Input
            id="event-attendee-goal"
            value={attendeeGoal}
            onChange={(e) => setAttendeeGoal(e.target.value)}
            inputMode="numeric"
            placeholder="400"
            disabled={pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="event-sponsor-goal">Sponsor count goal</Label>
          <Input
            id="event-sponsor-goal"
            value={sponsorCountGoal}
            onChange={(e) => setSponsorCountGoal(e.target.value)}
            inputMode="numeric"
            placeholder="25"
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Course directors</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setDirectors((prev) => [...prev, emptyDirector()])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {directors.map((d, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-md border border-zinc-100 bg-zinc-50/60 p-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Input
                value={d.name}
                onChange={(e) =>
                  setDirectors((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, name: e.target.value } : row,
                    ),
                  )
                }
                placeholder="Name"
                disabled={pending}
                aria-label={`Director ${i + 1} name`}
              />
              <Input
                value={d.title ?? ""}
                onChange={(e) =>
                  setDirectors((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? { ...row, title: e.target.value } : row,
                    ),
                  )
                }
                placeholder="Title / role"
                disabled={pending}
                aria-label={`Director ${i + 1} title`}
              />
              <Input
                value={d.credentials ?? ""}
                onChange={(e) =>
                  setDirectors((prev) =>
                    prev.map((row, idx) =>
                      idx === i
                        ? { ...row, credentials: e.target.value }
                        : row,
                    ),
                  )
                }
                placeholder="Credentials"
                disabled={pending}
                aria-label={`Director ${i + 1} credentials`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending || directors.length <= 1}
                onClick={() =>
                  setDirectors((prev) => prev.filter((_, idx) => idx !== i))
                }
                aria-label={`Remove director ${i + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-zinc-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Goals</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setGoals((prev) => [...prev, ""])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {goals.map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={g}
                onChange={(e) =>
                  setGoals((prev) =>
                    prev.map((row, idx) =>
                      idx === i ? e.target.value : row,
                    ),
                  )
                }
                placeholder={`Goal ${i + 1}`}
                disabled={pending}
                aria-label={`Goal ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending || goals.length <= 1}
                onClick={() =>
                  setGoals((prev) => prev.filter((_, idx) => idx !== i))
                }
                aria-label={`Remove goal ${i + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-zinc-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {error ? (
          <span className="text-sm text-red-600">{error}</span>
        ) : null}
        {success ? (
          <span className="text-sm text-emerald-600">{success}</span>
        ) : null}
      </div>
    </form>
  );
}
