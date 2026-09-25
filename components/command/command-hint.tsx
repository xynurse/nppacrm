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
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 text-xs text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      aria-label="Open command palette"
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="kbd-chip ml-0.5 hidden sm:inline-flex">
        {isMac ? "⌘K" : "Ctrl+K"}
      </kbd>
    </button>
  );
}
