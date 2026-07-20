"use client";

import { upload } from "@vercel/blob/client";
import { FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteProspectus,
  uploadProspectus,
} from "@/lib/actions/ai";

type Props = {
  eventId: string;
  prospectus: {
    id: string;
    fileName: string;
    fileSize: number;
    blobUrl: string;
    textTokenEstimate: number;
    createdAt: Date;
  } | null;
  blobConfigured: boolean;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProspectusManager({ eventId, prospectus, blobConfigured }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingPending, startDelete] = useTransition();

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File is over 50 MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      const res = await uploadProspectus({
        eventId,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        fileName: file.name,
        fileSize: file.size,
      });
      if (!res.ok) {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    if (!prospectus) return;
    if (!window.confirm(`Delete "${prospectus.fileName}"? AI enrichment will stop working for this event until you upload a new one.`)) {
      return;
    }
    startDelete(async () => {
      const res = await deleteProspectus({ id: prospectus.id });
      if (!res.ok) setError(res.error);
    });
  };

  if (!blobConfigured) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <p className="font-medium">Vercel Blob is not configured.</p>
        <p className="mt-1">
          Install the Vercel Blob integration in your project settings so this
          page can accept PDF uploads. Once installed,{" "}
          <code className="font-mono">BLOB_READ_WRITE_TOKEN</code> is auto-injected
          across all three environments and the upload button below will work.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />

      {prospectus ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-slate-500" />
            <div className="min-w-0 flex-1">
              <a
                href={prospectus.blobUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-medium hover:underline"
              >
                {prospectus.fileName}
              </a>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {formatBytes(prospectus.fileSize)} ·{" "}
                ~{prospectus.textTokenEstimate.toLocaleString()} tokens · uploaded{" "}
                {new Date(prospectus.createdAt).toLocaleDateString()}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deletingPending}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {deletingPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Replace it by uploading a new PDF below; the current one will be
            soft-deleted.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
        <Button onClick={handlePick} disabled={uploading}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading
            ? "Uploading…"
            : prospectus
              ? "Upload replacement PDF"
              : "Upload prospectus PDF"}
        </Button>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          PDF, max 50 MB. We extract the text and use it as grounding context
          for every AI enrichment on this event.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
