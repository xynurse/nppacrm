"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import type { Event } from "@/lib/db/schema";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";
import { EventSwitcher } from "./event-switcher";
import { LogoMark } from "./logo-mark";
import {
  adminNav,
  discoverNavItem,
  isActive,
  mainNav,
  roleLabel,
  type NavItem,
  type Role,
} from "./nav-config";

interface SidebarProps {
  role: Role;
  user: { name: string; email: string; role: Role };
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

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-150",
        active
          ? "bg-zinc-100 font-medium text-zinc-900"
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-600 transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      />
      <item.Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-brand-600" : "text-zinc-400",
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ role, user, events, activeEventId }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const discover = discoverNavItem(activeEventId);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200/80 bg-white lg:flex">
      {/* Brand header */}
      <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-4">
        <LogoMark
          className="h-8 w-8 rounded-[9px] shadow-sm"
          glyphClassName="h-[18px] w-[18px]"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-none tracking-tight text-zinc-900">
            LPD Sponsor CRM
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            NPs &amp; PAs
          </p>
        </div>
      </div>

      {/* Event switcher */}
      {events.length > 0 && (
        <div className="border-b border-zinc-100 px-3 py-2.5">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Active Event
          </p>
          <EventSwitcher
            events={events}
            activeEventId={activeEventId}
            tone="light"
          />
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
        <div className="border-t border-zinc-100 px-3 pb-2">
          <p className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Admin
          </p>
          <div className="space-y-0.5">
            {discover ? (
              <NavLink item={discover} pathname={pathname} />
            ) : null}
            {adminNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-zinc-100 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-none text-zinc-900">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-zinc-400">
              {roleLabel(user.role)}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
