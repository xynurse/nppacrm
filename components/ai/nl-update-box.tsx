"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { NlUpdateDialog } from "@/components/ai/nl-update-dialog";
import { Button } from "@/components/ui/button";

/**
 * Dashboard entry point for the natural-language "AI quick update". Collects a
 * recap and opens the review dialog, which parses immediately (autoRun).
 */
export function NlUpdateBox() {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-brand-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Quick update
        </h3>
        <span className="hidden text-xs text-zinc-400 sm:inline">
          paste a recap — review before anything is written
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && text.trim()) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          rows={2}
          placeholder="e.g. Met Boston Scientific — want the Gold prospectus; Stryker no reply to 2nd email, follow up next week."
          className="flex-1 resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-brand-400/20"
        />
        <Button
          className="shrink-0 gap-1.5 self-start"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={text.trim().length === 0}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Parse
        </Button>
      </div>

      <NlUpdateDialog
        open={open}
        onOpenChange={setOpen}
        initialText={text}
        autoRun
      />
    </div>
  );
}
