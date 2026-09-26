import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import { PlaybooksPanel } from "@/components/playbooks/playbooks-panel";

export default async function PlaybooksPage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Playbooks
        </h1>
        <p className="text-sm text-zinc-500">No active event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Playbooks
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Apply a sequenced set of follow-up tasks to a prospect.
        </p>
      </div>
      <PlaybooksPanel eventId={activeEvent.id} />
    </div>
  );
}
