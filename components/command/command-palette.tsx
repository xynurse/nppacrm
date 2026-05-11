"use client";

import { Command } from "cmdk";
import {
  Building2,
  CheckSquare,
  KanbanSquare,
  LayoutDashboard,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState, useTransition } from "react";
import { searchPalette } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/db/queries/search";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  isAdmin: boolean;
};

export function CommandPalette({
  open,
  onOpenChange,
  eventId,
  isAdmin,
}: Props) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !eventId) return;
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await searchPalette({ eventId, query: q });
        if (res.ok) setResults(res.results);
      });
    }, 150);
    return () => window.clearTimeout(handle);
  }, [query, eventId, open]);

  const grouped = useMemo(() => {
    const map: Record<SearchResult["kind"], SearchResult[]> = {
      company: [],
      contact: [],
      task: [],
    };
    for (const r of results) map[r.kind].push(r);
    return map;
  }, [results]);

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <>
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={cn(
          "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={cn(
          "fixed left-1/2 top-24 z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl transition-opacity dark:border-slate-700 dark:bg-slate-900",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {open ? (
          <Command
            label="Command palette"
            shouldFilter={false}
            loop
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
              <Search className="h-4 w-4 text-slate-400" />
              <Command.Input
                autoFocus
                placeholder="Search companies, contacts, tasks…"
                value={query}
                onValueChange={setQuery}
                className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline dark:border-slate-700 dark:text-slate-400">
                Esc
              </kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-sm text-slate-500">
                {query.trim().length === 0
                  ? "Start typing or pick a quick action below."
                  : "No matches."}
              </Command.Empty>

              {grouped.company.length > 0 ? (
                <Command.Group
                  heading="Companies"
                  className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                >
                  {grouped.company.map((r) => (
                    <Item
                      key={`c-${r.id}`}
                      icon={<Building2 className="h-3.5 w-3.5" />}
                      label={r.label}
                      hint={r.hint}
                      onSelect={() => navigate(r.href)}
                    />
                  ))}
                </Command.Group>
              ) : null}

              {grouped.contact.length > 0 ? (
                <Command.Group
                  heading="Contacts"
                  className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                >
                  {grouped.contact.map((r) => (
                    <Item
                      key={`p-${r.id}`}
                      icon={<Users className="h-3.5 w-3.5" />}
                      label={r.label}
                      hint={r.hint}
                      onSelect={() => navigate(r.href)}
                    />
                  ))}
                </Command.Group>
              ) : null}

              {grouped.task.length > 0 ? (
                <Command.Group
                  heading="Tasks"
                  className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
                >
                  {grouped.task.map((r) => (
                    <Item
                      key={`t-${r.id}`}
                      icon={<CheckSquare className="h-3.5 w-3.5" />}
                      label={r.label}
                      hint={r.hint}
                      onSelect={() => navigate(r.href)}
                    />
                  ))}
                </Command.Group>
              ) : null}

              <Command.Group
                heading="Navigate"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
              >
                <Item
                  icon={<LayoutDashboard className="h-3.5 w-3.5" />}
                  label="Dashboard"
                  hint="g then d"
                  onSelect={() => navigate("/")}
                />
                <Item
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Companies"
                  hint="g then c"
                  onSelect={() => navigate("/companies")}
                />
                <Item
                  icon={<KanbanSquare className="h-3.5 w-3.5" />}
                  label="Pipeline"
                  hint="g then p"
                  onSelect={() => navigate("/pipeline")}
                />
                <Item
                  icon={<CheckSquare className="h-3.5 w-3.5" />}
                  label="Tasks"
                  hint="g then t"
                  onSelect={() => navigate("/tasks")}
                />
                <Item
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Contacts"
                  onSelect={() => navigate("/contacts")}
                />
                {isAdmin ? (
                  <Item
                    icon={<Settings className="h-3.5 w-3.5" />}
                    label="Admin · Events"
                    onSelect={() => navigate("/admin/events")}
                  />
                ) : null}
              </Command.Group>

              <Command.Group
                heading="Actions"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
              >
                <Item
                  icon={
                    resolvedTheme === "dark" ? (
                      <Sun className="h-3.5 w-3.5" />
                    ) : (
                      <Moon className="h-3.5 w-3.5" />
                    )
                  }
                  label={
                    resolvedTheme === "dark"
                      ? "Switch to light theme"
                      : "Switch to dark theme"
                  }
                  onSelect={() => {
                    setTheme(resolvedTheme === "dark" ? "light" : "dark");
                    onOpenChange(false);
                  }}
                />
              </Command.Group>
            </Command.List>
          </Command>
        ) : null}
      </div>
    </>
  );
}

function Item({
  icon,
  label,
  hint,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string | null;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 aria-selected:bg-slate-100 dark:text-slate-200 dark:aria-selected:bg-slate-800"
    >
      <span className="text-slate-400">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {hint ? (
        <span className="ml-2 truncate text-xs text-slate-400">{hint}</span>
      ) : null}
    </Command.Item>
  );
}
