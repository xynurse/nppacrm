"use client";

import Link from "next/link";
import { LogOut, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Event } from "@/lib/db/schema";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";
import { EventSwitcher } from "./event-switcher";
import {
  adminNav,
  discoverNavItem,
  isActive,
  roleLabel,
  type NavItem,
  type Role,
} from "./nav-config";

/**
 * Mobile-only bottom sheet holding everything that doesn't fit the bottom
 * bar: remaining pages, admin links, event switcher and sign-out.
 */
export function MoreSheet({
  open,
  onClose,
  pathname,
  items,
  role,
  user,
  events,
  activeEventId,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  items: NavItem[];
  role: Role;
  user: { name: string; email: string; role: Role };
  events: Event[];
  activeEventId: string | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the sheet and is trapped while open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const discover = discoverNavItem(activeEventId);
  const admin = role === "admin" ? [...(discover ? [discover] : []), ...adminNav] : [];

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        id="more-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="more-sheet-title"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            More
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <SheetLinks items={items} pathname={pathname} onNavigate={onClose} />

        {admin.length > 0 ? (
          <>
            <p className="mb-1.5 mt-4 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Admin
            </p>
            <SheetLinks items={admin} pathname={pathname} onNavigate={onClose} />
          </>
        ) : null}

        {events.length > 0 ? (
          <div className="mt-4">
            <label
              htmlFor="more-sheet-event"
              className="mb-1.5 block px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Active event
            </label>
            <EventSwitcher
              id="more-sheet-event"
              events={events}
              activeEventId={activeEventId}
            />
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {user.name}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {roleLabel(user.role)} · {user.email}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SheetLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-colors",
                active
                  ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
                  : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              <item.Icon className="h-5 w-5" />
              <span className="text-center">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
