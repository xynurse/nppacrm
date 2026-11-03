"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Event } from "@/lib/db/schema";
import { cn } from "@/lib/cn";
import { MoreSheet } from "./more-sheet";
import {
  BOTTOM_BAR_HREFS,
  isActive,
  mainNav,
  type Role,
} from "./nav-config";

const barItems = BOTTOM_BAR_HREFS.map(
  (href) => mainNav.find((item) => item.href === href)!,
).map((item) => (item.href === "/" ? { ...item, label: "Home" } : item));

const moreItems = mainNav.filter(
  (item) => !BOTTOM_BAR_HREFS.includes(item.href),
);

const tabClass =
  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors";
const tabColor = (active: boolean) =>
  active
    ? "text-brand-600"
    : "text-zinc-500 hover:text-zinc-800";

export function BottomNav({
  role,
  user,
  events,
  activeEventId,
}: {
  role: Role;
  user: { name: string; email: string; role: Role };
  events: Event[];
  activeEventId: string | null;
}) {
  const pathname = usePathname() ?? "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const closeMore = useCallback(() => {
    setMoreOpen(false);
    moreButtonRef.current?.focus();
  }, []);

  // Close if the route changes underneath (e.g. browser back).
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const moreActive =
    moreItems.some((item) => isActive(pathname, item.href)) ||
    pathname.startsWith("/admin");

  return (
    <>
      <nav
        className="z-30 grid shrink-0 grid-cols-5 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary"
      >
        {barItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(tabClass, tabColor(active))}
              aria-current={active ? "page" : undefined}
            >
              <item.Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          ref={moreButtonRef}
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(tabClass, tabColor(moreActive))}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-controls="more-sheet"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
      <MoreSheet
        open={moreOpen}
        onClose={closeMore}
        pathname={pathname}
        items={moreItems}
        role={role}
        user={user}
        events={events}
        activeEventId={activeEventId}
      />
    </>
  );
}
