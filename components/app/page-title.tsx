"use client";

import { usePathname } from "next/navigation";

const TITLES: { match: (path: string) => boolean; title: string }[] = [
  { match: (p) => p === "/", title: "Dashboard" },
  { match: (p) => p.startsWith("/event"), title: "Event" },
  { match: (p) => p.startsWith("/companies"), title: "Companies" },
  { match: (p) => p.startsWith("/contacts"), title: "Contacts" },
  { match: (p) => p.startsWith("/tasks"), title: "Tasks" },
  { match: (p) => p.startsWith("/calendar"), title: "Calendar" },
  { match: (p) => p.startsWith("/playbooks"), title: "Playbooks" },
  { match: (p) => p.startsWith("/pipeline"), title: "Pipeline" },
  { match: (p) => p.startsWith("/reports"), title: "Reports" },
  { match: (p) => p.startsWith("/admin/users"), title: "Users" },
  { match: (p) => p.startsWith("/admin/audit"), title: "Audit log" },
  { match: (p) => p.includes("/agents"), title: "Discover" },
  { match: (p) => p.includes("/import"), title: "Import" },
  { match: (p) => p.includes("/tiers"), title: "Tiers" },
  { match: (p) => p.includes("/fields"), title: "Custom fields" },
  { match: (p) => p.includes("/prospectus"), title: "Prospectus" },
  { match: (p) => p.startsWith("/admin/events"), title: "Events" },
  { match: (p) => p.startsWith("/admin"), title: "Admin" },
];

export function PageTitle() {
  const pathname = usePathname() ?? "/";
  const title =
    TITLES.find((t) => t.match(pathname))?.title ?? "LPD Sponsor CRM";

  return (
    <h1 className="truncate font-display text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
      {title}
    </h1>
  );
}
