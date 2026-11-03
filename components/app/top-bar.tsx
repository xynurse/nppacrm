import { CommandHint } from "@/components/command/command-hint";
import { NotificationBell } from "./notification-bell";
import { DensityToggle } from "./density-toggle";
import { PageTitle } from "./page-title";
import type { NotificationRow } from "@/lib/db/queries/notifications";

export function TopBar({
  notifications = [],
  unreadCount = 0,
}: {
  notifications?: NotificationRow[];
  unreadCount?: number;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-8">
      <div className="min-w-0">
        <PageTitle />
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <CommandHint />
        <NotificationBell
          initialItems={notifications}
          unreadCount={unreadCount}
        />
        <DensityToggle />
      </div>
    </header>
  );
}
