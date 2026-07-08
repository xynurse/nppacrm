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
    <div className="surface-card rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50/60 to-transparent p-4 dark:border-slate-800 dark:from-brand-950/30">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-500" />
        <h2 className="text-sm font-semibold">AI quick update</h2>
        <span className="text-xs text-slate-400">
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
          className="flex-1 resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-950"
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
