"use client";

import { ExternalLink, FileSignature } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markProposalSent } from "@/lib/actions/pipeline";

const TERMINAL_STATUSES = new Set([
  "confirmed",
  "declined",
  "past_sponsor",
]);

type Props = {
  eventCompanyId: string;
  companyName: string;
  status: string;
  existingProposalUrl: string | null;
  existingProposalSentAt: Date | null;
  existingProposalValidUntil: string | null;
};

export function ProposalDialog({
  eventCompanyId,
  companyName,
  status,
  existingProposalUrl,
  existingProposalSentAt,
  existingProposalValidUntil,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startPending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState(existingProposalUrl ?? "");
  const [validUntil, setValidUntil] = useState(
    existingProposalValidUntil ?? "",
  );
  const urlRef = useRef<HTMLInputElement | null>(null);

  // Reset form values whenever the prospect changes.
  useEffect(() => {
    setUrl(existingProposalUrl ?? "");
    setValidUntil(existingProposalValidUntil ?? "");
    setError(null);
  }, [existingProposalUrl, existingProposalValidUntil, eventCompanyId]);

  useEffect(() => {
    if (open) {
      // Focus the URL field next tick (after dialog mounts).
      const id = window.setTimeout(() => urlRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Hide button entirely for terminal statuses where re-marking is nonsense.
  if (TERMINAL_STATUSES.has(status)) return null;

  const alreadySent = !!existingProposalSentAt;
  const buttonLabel = alreadySent ? "Update proposal" : "Mark proposal sent";

  const submit = () => {
    setError(null);
    startPending(async () => {
      const res = await markProposalSent({
        id: eventCompanyId,
        proposalUrl: url.trim(),
        proposalValidUntil: validUntil.trim() === "" ? null : validUntil,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          variant={alreadySent ? "outline" : "default"}
          onClick={() => setOpen(true)}
        >
          <FileSignature className="mr-1.5 h-3.5 w-3.5" />
          {buttonLabel}
        </Button>
        {alreadySent && existingProposalSentAt ? (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span>
              Sent {new Date(existingProposalSentAt).toLocaleDateString()}
            </span>
            {existingProposalUrl ? (
              <a
                href={existingProposalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center hover:underline"
                title="Open proposal"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {existingProposalValidUntil ? (
              <span className="ml-1">
                · valid until {existingProposalValidUntil}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold tracking-tight">
              {alreadySent ? "Update proposal" : "Mark proposal sent"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {alreadySent
                ? `Update the proposal record for ${companyName}.`
                : `Records the proposal, bumps last contact to today, and creates a 7-day follow-up task for ${companyName}.`}
            </p>

            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="proposal-url">Proposal URL</Label>
                <Input
                  id="proposal-url"
                  ref={urlRef}
                  type="url"
                  placeholder="https://docs.google.com/…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={pending}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Link to the doc/PDF the prospect can review.
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="proposal-valid">Valid until (optional)</Label>
                <Input
                  id="proposal-valid"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={pending}
                />
              </div>

              {error ? (
                <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={pending || url.trim().length === 0}
                >
                  {pending
                    ? "Saving…"
                    : alreadySent
                      ? "Save"
                      : "Mark sent + create follow-up"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
