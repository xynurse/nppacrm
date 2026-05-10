import Link from "next/link";
import {
  Building2,
  CheckSquare,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
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
];

const adminNav: NavItem[] = [
  { href: "/admin/events", label: "Events", Icon: Settings },
  { href: "/admin/users", label: "Users", Icon: Users },
];

export function Sidebar({ role }: { role: "admin" | "viewer" }) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
      <nav className="space-y-1">
        {mainNav.map((item) => (
          <SidebarLink key={item.href} item={item} />
        ))}
      </nav>
      {role === "admin" ? (
        <>
          <div className="my-4 px-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Admin
          </div>
          <nav className="space-y-1">
            {adminNav.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </nav>
        </>
      ) : null}
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
      )}
    >
      <item.Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}
