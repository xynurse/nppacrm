import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import { BottomNav } from "@/components/app/bottom-nav";
import { Sidebar } from "@/components/app/sidebar";
import { TopBar } from "@/components/app/top-bar";
import { CommandProvider } from "@/components/command/command-provider";

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
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
      <BottomNav />
      <CommandProvider
        eventId={activeEvent?.id ?? null}
        isAdmin={session.user.role === "admin"}
      />
    </div>
  );
}
