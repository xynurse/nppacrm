import Link from "next/link";
import { listActiveEvents } from "@/lib/db/queries/events";
import { listTasksForEvent } from "@/lib/db/queries/tasks";
import { listUsers } from "@/lib/db/queries/users";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";

type SearchParams = Promise<{ filter?: string; view?: string }>;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;
  const params = await searchParams;
  const filter = (params.filter ?? "open") as
    | "open"
    | "mine"
    | "overdue"
    | "all";
  const view = (params.view ?? "list") as "list" | "timeline";

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No event yet.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const [tasks, allUsers] = await Promise.all([
    listTasksForEvent(activeEvent.id, {
      onlyOpen: filter !== "all",
      assigneeId: filter === "mine" ? session.user.id : undefined,
    }),
    listUsers(),
  ]);

  const filtered = (() => {
    if (filter !== "overdue") return tasks;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < today && !t.completedAt,
    );
  })();

  const userOptions = allUsers
    .filter((u) => u.isActive)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {activeEvent.name} · {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
      <TasksPageClient
        tasks={filtered}
        currentUserId={session.user.id}
        currentFilter={filter}
        currentView={view}
        eventId={activeEvent.id}
        users={userOptions}
      />
    </div>
  );
}
