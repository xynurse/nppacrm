import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { todayInTimeZone } from "@/lib/dates";
import { listActiveEvents } from "@/lib/db/queries/events";
import { listTasksForEvent } from "@/lib/db/queries/tasks";
import { listUsers } from "@/lib/db/queries/users";
import { Button } from "@/components/ui/button";
import { CalendarWorkspace } from "@/components/calendar/calendar-workspace";

export default async function CalendarPage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Calendar
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">No active event.</p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const [tasks, allUsers] = await Promise.all([
    listTasksForEvent(activeEvent.id, { onlyOpen: true }),
    listUsers(),
  ]);

  const today = todayInTimeZone(activeEvent.timezone);
  const users = allUsers
    .filter((u) => u.isActive)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return (
    <CalendarWorkspace
      tasks={tasks}
      today={today}
      eventId={activeEvent.id}
      eventName={activeEvent.name}
      currentUserId={session.user.id}
      users={users}
    />
  );
}
