"use client";

import { Check, Copy, ExternalLink, Loader2, Mail, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { draftOutreachEmail, markEmailSent } from "@/lib/actions/email";
import { buildMailtoUrl } from "@/lib/mailto";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Props = {
  eventCompanyId: string;
  companyName: string;
};

type DoneState = {
  phase: "done";
  subject: string;
  body: string;
  toEmail: string | null;
  toName: string | null;
  contactId: string | null;
};

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | DoneState
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
          setState({
            phase: "done",
            subject: res.subject,
            body: res.body,
            toEmail: res.toEmail,
            toName: res.toName,
            contactId: res.contactId,
          });
        } else {
          setState({ phase: "error", message: res.error });
        }
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
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
          eventCompanyId={eventCompanyId}
          companyName={companyName}
          state={state}
          pending={pending}
          onClose={handleClose}
          onRegenerate={() => {
            setState({ phase: "loading" });
            startTransition(async () => {
              const res = await draftOutreachEmail({ eventCompanyId });
              if (res.ok) {
                setState({
                  phase: "done",
                  subject: res.subject,
                  body: res.body,
                  toEmail: res.toEmail,
                  toName: res.toName,
                  contactId: res.contactId,
                });
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
  eventCompanyId,
  companyName,
  state,
  pending,
  onClose,
  onRegenerate,
}: {
  eventCompanyId: string;
  companyName: string;
  state: State;
  pending: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const router = useRouter();
  const [markPending, startMark] = useTransition();
  const [markMessage, setMarkMessage] = useState<string | null>(null);
  const [mailtoNote, setMailtoNote] = useState<string | null>(null);

  const openInMail = (done: DoneState) => {
    const { href, truncated } = buildMailtoUrl({
      to: done.toEmail,
      subject: done.subject,
      body: done.body,
    });
    if (truncated) {
      void navigator.clipboard.writeText(done.body);
      setMailtoNote(
        "Body was too long for mailto — full body copied to clipboard.",
      );
    } else {
      setMailtoNote(null);
    }
    window.location.href = href;
  };

  const markSent = (done: DoneState) => {
    setMarkMessage(null);
    startMark(async () => {
      const res = await markEmailSent({
        eventCompanyId,
        subject: done.subject,
        body: done.body,
        contactId: done.contactId,
      });
      if (!res.ok) {
        setMarkMessage(res.error);
        return;
      }
      setMarkMessage(
        res.statusAdvanced
          ? "Logged as sent · status → contacted"
          : "Logged as sent",
      );
      router.refresh();
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand-500" />
            <h2 className="text-sm font-semibold">
              Outreach draft — {companyName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {state.phase === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              <p className="text-sm text-slate-500">
                Drafting personalised email…
              </p>
            </div>
          ) : state.phase === "error" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {state.message}
            </div>
          ) : state.phase === "done" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  To
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  {state.toEmail ? (
                    <span>
                      {state.toName ? (
                        <span className="font-medium">{state.toName}</span>
                      ) : null}
                      {state.toName ? " · " : null}
                      <span className="text-slate-600">{state.toEmail}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      No contact email on file — fill To: in your mail client
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Subject
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="flex-1 font-medium">{state.subject}</span>
                  <CopyButton text={state.subject} label="subject" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email body
                </label>
                <div className="relative rounded-lg border border-slate-200 bg-slate-50">
                  <pre className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-slate-800">
                    {state.body}
                  </pre>
                  <div className="absolute right-2 top-2">
                    <CopyButton text={state.body} label="body" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                AI-generated — review before sending. Open in your mail client,
                then mark sent here so the CRM stays current.
              </p>

              {mailtoNote ? (
                <p className="text-xs text-amber-700">{mailtoNote}</p>
              ) : null}
              {markMessage ? (
                <p className="text-xs text-emerald-700">{markMessage}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {state.phase === "done" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
            <CopyButton
              text={`Subject: ${state.subject}\n\n${state.body}`}
              label="full email"
              variant="outline"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onRegenerate}
                disabled={pending || markPending}
              >
                Regenerate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => openInMail(state)}
                disabled={markPending}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in mail
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => markSent(state)}
                disabled={markPending}
              >
                {markPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Mark sent
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 px-5 py-3">
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
          ? "border border-slate-200 hover:bg-slate-50"
          : "hover:bg-slate-100",
        copied ? "text-emerald-600" : "text-slate-600",
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
