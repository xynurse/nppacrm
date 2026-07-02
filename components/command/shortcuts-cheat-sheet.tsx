"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["/"], label: "Search (opens palette)" },
  { keys: ["?"], label: "Show this cheat sheet" },
  { keys: ["g", "d"], label: "Go to Dashboard" },
  { keys: ["g", "c"], label: "Go to Companies" },
  { keys: ["g", "p"], label: "Go to Pipeline" },
  { keys: ["g", "t"], label: "Go to Tasks" },
  { keys: ["g", "r"], label: "Go to Reports" },
  { keys: ["Esc"], label: "Close drawer / dialog" },
];

export function ShortcutsCheatSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-overlay)] transition-opacity dark:border-slate-700 dark:bg-slate-900",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-slate-600 dark:text-slate-300">
                {s.label}
              </span>
              <span className="flex gap-1">
                {s.keys.map((k, i) => (
                  <kbd key={i} className="kbd-chip">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
