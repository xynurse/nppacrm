import type { Event } from "@/lib/db/schema";
import { CommandHint } from "@/components/command/command-hint";
import { DensityToggle } from "./density-toggle";
import { EventSwitcher } from "./event-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function TopBar({
  user,
  events,
  activeEventId,
}: {
  user: { name: string; email: string; role: "admin" | "viewer" };
  events: Event[];
  activeEventId: string | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight">
          Sponsorship CRM
        </span>
        <EventSwitcher events={events} activeEventId={activeEventId} />
      </div>
      <div className="flex items-center gap-3">
        <CommandHint />
        <DensityToggle />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
