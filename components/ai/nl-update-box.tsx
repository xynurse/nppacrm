"use client";

import { ChevronDown, ChevronRight, Mail, Sparkles } from "lucide-react";
import { useState } from "react";
import { NlUpdateDialog } from "@/components/ai/nl-update-dialog";
import { Button } from "@/components/ui/button";

/**
 * Dashboard entry point for the natural-language "AI quick update". Collects a
 * recap (or pasted email thread) and opens the review dialog, which parses
 * immediately (autoRun).
 */
export function NlUpdateBox() {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-brand-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Quick update
        </h3>
        <span className="hidden text-xs text-zinc-400 sm:inline">
          paste a recap or email — review before anything is written
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
          placeholder="e.g. Met Boston Scientific — want the Gold prospectus; Stryker no reply to 2nd email, follow up next week. Or paste a full email thread."
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

      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        className="mt-2 flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        aria-expanded={helpOpen}
      >
        {helpOpen ? (
          <ChevronDown className="h-3 w-3" aria-hidden />
        ) : (
          <ChevronRight className="h-3 w-3" aria-hidden />
        )}
        <Mail className="h-3 w-3" aria-hidden />
        How email parsing works
      </button>
      {helpOpen ? (
        <div className="mt-2 space-y-1.5 rounded-lg border border-zinc-200/80 bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400">
          <p>
            There is no inbox sync yet. Copy the email (or thread) from your mail
            client and paste it above, then hit Parse.
          </p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              AI matches company names in the text to prospects on the{" "}
              <strong className="font-medium text-zinc-700 dark:text-zinc-200">
                active event
              </strong>
              .
            </li>
            <li>
              It proposes CRM updates (status, notes, follow-up tasks). Nothing
              writes until you approve each change in the review dialog.
            </li>
            <li>
              Tip: keep company names clear (“Boston Scientific replied…”) so
              matching is reliable. Unmatched lines are listed for you to fix.
            </li>
          </ol>
          <p>
            Drafting a fresh outreach email is separate — use{" "}
            <strong className="font-medium text-zinc-700 dark:text-zinc-200">
              Draft email
            </strong>{" "}
            on a company drawer. Full IMAP/inbox ingest is still on the backlog.
          </p>
        </div>
      ) : null}

      <NlUpdateDialog
        open={open}
        onOpenChange={setOpen}
        initialText={text}
        autoRun
      />
    </div>
  );
}
