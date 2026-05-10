"use client";

import { upload } from "@vercel/blob/client";
import { Paperclip, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { updateCustomField } from "@/lib/actions/custom-fields";
import type { FileFieldValue } from "@/lib/db/schema";

type Props = {
  entityId: string;
  definitionId: string;
  value: FileFieldValue | null;
  onLocalChange: (next: FileFieldValue | null) => void;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileFieldCell({
  entityId,
  definitionId,
  value,
  onLocalChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      const next: FileFieldValue = {
        url: blob.url,
        pathname: blob.pathname,
        contentType: file.type || null,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      onLocalChange(next);
      const res = await updateCustomField({
        entityId,
        definitionId,
        value: next,
      });
      if (!res.ok) {
        setError(res.error);
        onLocalChange(value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    onLocalChange(null);
    const res = await updateCustomField({
      entityId,
      definitionId,
      value: null,
    });
    if (!res.ok) {
      setError(res.error);
      onLocalChange(value);
    }
  };

  return (
    <div className="space-y-1 px-1 py-0.5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
      />
      {value ? (
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
          <a
            href={value.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-slate-700 hover:underline dark:text-slate-300"
          >
            {value.pathname.split("/").pop() ?? value.pathname}
          </a>
          <span className="text-xs text-slate-400">
            {formatBytes(value.size)}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove file"
            className="ml-auto rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Upload className="h-3 w-3" />
          {uploading ? "Uploading…" : "Upload file"}
        </button>
      )}
      {error ? (
        <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
