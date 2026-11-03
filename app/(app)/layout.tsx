import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  countUnreadNotifications,
  listNotificationsForUser,
} from "@/lib/db/queries/notifications";
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

  const user = {
    name: session.user.name ?? session.user.email ?? "User",
    email: session.user.email ?? "",
    role: session.user.role,
  };

  let notifications: Awaited<ReturnType<typeof listNotificationsForUser>> = [];
  let unreadCount = 0;
  try {
    [notifications, unreadCount] = await Promise.all([
      listNotificationsForUser(session.user.id),
      countUnreadNotifications(session.user.id),
    ]);
  } catch {
    // notifications table may not exist until migration 0012
  }

  return (
    <div className="app-canvas flex h-dvh flex-col overflow-hidden lg:flex-row">
      <Sidebar
        role={session.user.role}
        user={user}
        events={events}
        activeEventId={activeEvent?.id ?? null}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar notifications={notifications} unreadCount={unreadCount} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-8 sm:py-8">
          {children}
        </main>
        <BottomNav
          role={session.user.role}
          user={user}
          events={events}
          activeEventId={activeEvent?.id ?? null}
        />
      </div>
      <CommandProvider
        eventId={activeEvent?.id ?? null}
        isAdmin={session.user.role === "admin"}
      />
    </div>
  );
}
