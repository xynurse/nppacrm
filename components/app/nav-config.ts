import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckSquare,
  History,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  Search,
  Settings,
  Users,
} from "lucide-react";

// Single source for app navigation so the desktop sidebar and the mobile
// bottom bar + "More" sheet can't drift apart.

export type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

export type Role = "admin" | "viewer";

export const mainNav: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/event", label: "Event", Icon: CalendarDays },
  { href: "/companies", label: "Companies", Icon: Building2 },
  { href: "/contacts", label: "Contacts", Icon: Users },
  { href: "/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/calendar", label: "Calendar", Icon: ListTodo },
  { href: "/pipeline", label: "Pipeline", Icon: KanbanSquare },
  { href: "/playbooks", label: "Playbooks", Icon: BookOpen },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
];

export const adminNav: NavItem[] = [
  { href: "/admin/events", label: "Events", Icon: Settings },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/audit", label: "Audit Log", Icon: History },
];

/** Admin "Discover" link — only exists when an event is active. */
export function discoverNavItem(activeEventId: string | null): NavItem | null {
  return activeEventId
    ? {
        href: `/admin/events/${activeEventId}/agents`,
        label: "Discover",
        Icon: Search,
      }
    : null;
}

/** Pages pinned to the mobile bottom bar; everything else lives under More. */
export const BOTTOM_BAR_HREFS = ["/", "/companies", "/pipeline", "/tasks"];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The "viewer" enum value is a normal teammate; it's shown as "Member". */
export function roleLabel(role: Role) {
  return role === "admin" ? "Admin" : "Member";
}
