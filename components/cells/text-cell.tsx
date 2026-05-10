"use client";

import { useEffect, useRef } from "react";
import type { CellEditorProps } from "./cell-shell";

export function TextEditor({
  value,
  onSave,
  onCancel,
  autoFocus,
  multiline = false,
}: CellEditorProps<string | null> & { multiline?: boolean }) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      ref.current.select?.();
    }
  }, [autoFocus]);

  const commit = () => onSave(ref.current?.value || null);

  if (multiline) {
    return (
      <textarea
        ref={(el) => {
          ref.current = el;
        }}
        defaultValue={value ?? ""}
        rows={3}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900"
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
        }}
      />
    );
  }

  return (
    <input
      ref={(el) => {
        ref.current = el;
      }}
      defaultValue={value ?? ""}
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

export function LongTextEditor(props: CellEditorProps<string | null>) {
  return <TextEditor {...props} multiline />;
}
