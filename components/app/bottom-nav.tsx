"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  KanbanSquare,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const items: NavItem[] = [
  { href: "/", label: "Home", Icon: LayoutDashboard },
  { href: "/companies", label: "Companies", Icon: Building2 },
  { href: "/contacts", label: "Contacts", Icon: Users },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/pipeline", label: "Pipeline", Icon: KanbanSquare },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-zinc-900 lg:hidden"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              active
                ? "text-brand-600 dark:text-brand-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
