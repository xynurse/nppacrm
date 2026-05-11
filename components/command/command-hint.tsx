"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export function CommandHint() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const dispatch = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      }),
    );
  };

  return (
    <button
      type="button"
      onClick={dispatch}
      className="hidden items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 sm:inline-flex dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label="Open command palette"
    >
      <Search className="h-3 w-3" />
      <span>Search</span>
      <kbd className="ml-1 rounded border border-slate-200 px-1 text-[10px] dark:border-slate-700">
        {isMac ? "⌘K" : "Ctrl+K"}
      </kbd>
    </button>
  );
}
