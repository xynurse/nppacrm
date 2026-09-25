"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { markNotificationsRead } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/lib/db/queries/notifications";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function NotificationBell({
  initialItems,
  unreadCount,
}: {
  initialItems: NotificationRow[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(unreadCount);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setUnread(unreadCount);
  }, [initialItems, unreadCount]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const markAll = () => {
    startTransition(async () => {
      await markNotificationsRead({ all: true });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
      setUnread(0);
      router.refresh();
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50/80 text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[var(--shadow-overlay)] dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Notifications
            </p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-zinc-500">
                You’re all caught up.
              </li>
            ) : (
              items.map((n) => {
                const inner = (
                  <div className="px-3 py-2.5">
                    <p
                      className={cn(
                        "text-sm",
                        n.readAt
                          ? "text-zinc-600 dark:text-zinc-400"
                          : "font-medium text-zinc-900 dark:text-zinc-50",
                      )}
                    >
                      {n.title}
                    </p>
                    {n.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {formatRelativeDate(n.createdAt)}
                    </p>
                  </div>
                );
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "border-b border-zinc-50 last:border-0 dark:border-zinc-800/80",
                      !n.readAt && "bg-brand-50/40 dark:bg-brand-950/20",
                    )}
                  >
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          setOpen(false);
                          if (!n.readAt) {
                            startTransition(async () => {
                              await markNotificationsRead({ ids: [n.id] });
                              setUnread((u) => Math.max(0, u - 1));
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.id === n.id
                                    ? { ...x, readAt: new Date() }
                                    : x,
                                ),
                              );
                              router.refresh();
                            });
                          }
                        }}
                        className="block hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
