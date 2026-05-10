import { listEvents } from "@/lib/db/queries/events";
import { CreateEventForm } from "@/components/admin/create-event-form";
import { EventsTable } from "@/components/admin/events-table";

export default async function AdminEventsPage() {
  const events = await listEvents();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Conferences and the prospecting cycles that go with them.
        </p>
      </div>
      <CreateEventForm />
      <EventsTable events={events} />
    </div>
  );
}
