"use client";

import { useEffect, useRef } from "react";
import type { CellEditorProps } from "./cell-shell";

export function UrlEditor({
  value,
  onSave,
  onCancel,
  autoFocus,
}: CellEditorProps<string | null>) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [autoFocus]);

  const commit = () => {
    const v = ref.current?.value.trim() || null;
    onSave(v);
  };

  return (
    <input
      ref={ref}
      type="url"
      defaultValue={value ?? ""}
      placeholder="https://"
      className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900"
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        } else if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

export function UrlDisplay({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="text-slate-700 hover:underline dark:text-slate-300"
      onClick={(e) => e.stopPropagation()}
    >
      {value.replace(/^https?:\/\//, "")}
    </a>
  );
}
