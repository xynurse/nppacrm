"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CheckSquare,
  ChevronDown,
  History,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Users,
} from "lucide-react";
import type { Event } from "@/lib/db/schema";
import { setActiveEvent } from "@/lib/actions/events";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/companies", label: "Companies", Icon: Building2 },
  { href: "/contacts", label: "Contacts", Icon: Users },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/pipeline", label: "Pipeline", Icon: KanbanSquare },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { href: "/admin/events", label: "Events", Icon: Settings },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/audit", label: "Audit Log", Icon: History },
];

interface SidebarProps {
  role: "admin" | "viewer";
  user: { name: string; email: string; role: "admin" | "viewer" };
  events: Event[];
  activeEventId: string | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
        active
          ? "bg-white/[0.07] font-medium text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-400 transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
      <item.Icon
        className={cn("h-4 w-4 shrink-0", active && "text-brand-400")}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ role, user, events, activeEventId }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 lg:flex">
      {/* Brand header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 shadow-md">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-none text-white">
            LPD Sponsor CRM
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">NPs &amp; PAs</p>
        </div>
      </div>

      {/* Event switcher */}
      {events.length > 0 && (
        <div className="border-b border-white/10 px-3 py-2.5">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Active Event
          </p>
          <div className="relative">
            <select
              className="w-full cursor-pointer appearance-none rounded-md border border-white/10 bg-white/10 px-3 py-1.5 pr-7 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
              value={activeEventId ?? ""}
              disabled={pending}
              onChange={(e) => {
                const value = e.target.value || null;
                startTransition(async () => {
                  await setActiveEvent({ eventId: value });
                  router.refresh();
                });
              }}
            >
              {events.map((event) => (
                <option
                  key={event.id}
                  value={event.id}
                  className="bg-slate-900 text-white"
                >
                  {event.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Admin section */}
      {role === "admin" && (
        <div className="border-t border-white/10 px-3 pb-2">
          <p className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Admin
          </p>
          <div className="space-y-0.5">
            {activeEventId ? (
              <NavLink
                item={{
                  href: `/admin/events/${activeEventId}/agents`,
                  label: "Discover",
                  Icon: Search,
                }}
                pathname={pathname}
              />
            ) : null}
            {adminNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600/30 text-[11px] font-semibold text-brand-300">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-none text-white">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-[10px] capitalize text-slate-400">
              {user.role}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:text-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
