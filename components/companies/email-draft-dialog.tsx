"use client";

import { Check, Copy, Loader2, Mail, X } from "lucide-react";
import { useState, useTransition } from "react";
import { draftOutreachEmail } from "@/lib/actions/email";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Props = {
  eventCompanyId: string;
  companyName: string;
};

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; subject: string; body: string }
  | { phase: "error"; message: string };

export function EmailDraftButton({ eventCompanyId, companyName }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ phase: "idle" });
  const [pending, startTransition] = useTransition();

  const handleOpen = () => {
    setOpen(true);
    if (state.phase === "idle") {
      startTransition(async () => {
        setState({ phase: "loading" });
        const res = await draftOutreachEmail({ eventCompanyId });
        if (res.ok) {
          setState({ phase: "done", subject: res.subject, body: res.body });
        } else {
          setState({ phase: "error", message: res.error });
        }
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset so the next open regenerates
    setState({ phase: "idle" });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
        onClick={handleOpen}
        disabled={pending}
        title="Draft outreach email with AI"
      >
        <Mail className="h-3.5 w-3.5" />
        Draft email
      </Button>

      {open ? (
        <EmailDraftModal
          companyName={companyName}
          state={state}
          onClose={handleClose}
          onRegenerate={() => {
            setState({ phase: "loading" });
            startTransition(async () => {
              const res = await draftOutreachEmail({ eventCompanyId });
              if (res.ok) {
                setState({ phase: "done", subject: res.subject, body: res.body });
              } else {
                setState({ phase: "error", message: res.error });
              }
            });
          }}
        />
      ) : null}
    </>
  );
}

function EmailDraftModal({
  companyName,
  state,
  onClose,
  onRegenerate,
}: {
  companyName: string;
  state: State;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand-500" />
            <h2 className="text-sm font-semibold">
              Outreach draft — {companyName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {state.phase === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              <p className="text-sm text-slate-500">
                Drafting personalised email…
              </p>
            </div>
          ) : state.phase === "error" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {state.message}
            </div>
          ) : state.phase === "done" ? (
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Subject
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <span className="flex-1 font-medium">{state.subject}</span>
                  <CopyButton text={state.subject} label="subject" />
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email body
                </label>
                <div className="relative rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  <pre className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                    {state.body}
                  </pre>
                  <div className="absolute right-2 top-2">
                    <CopyButton text={state.body} label="body" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                AI-generated — review before sending. Edit as needed in your
                email client.
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {state.phase === "done" ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            <CopyButton
              text={`Subject: ${state.subject}\n\n${state.body}`}
              label="full email"
              variant="outline"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onRegenerate}>
                Regenerate
              </Button>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function CopyButton({
  text,
  label,
  variant = "ghost",
}: {
  text: string;
  label: string;
  variant?: "ghost" | "outline";
}) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
        variant === "outline"
          ? "border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          : "hover:bg-slate-100 dark:hover:bg-slate-700",
        copied ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300",
      )}
      title={`Copy ${label}`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy {label}
        </>
      )}
    </button>
  );
}
