import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import { Sidebar } from "@/components/app/sidebar";
import { TopBar } from "@/components/app/top-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <TopBar
        user={{
          name: session.user.name ?? session.user.email ?? "User",
          email: session.user.email ?? "",
          role: session.user.role,
        }}
        events={events}
        activeEventId={activeEvent?.id ?? null}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={session.user.role} />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
