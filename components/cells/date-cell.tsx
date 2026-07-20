"use client";

import { useEffect, useRef } from "react";
import type { CellEditorProps } from "./cell-shell";

function toDateInputValue(value: Date | null): string {
  if (!value) return "";
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function DateEditor({
  value,
  onSave,
  onCancel,
  autoFocus,
}: CellEditorProps<Date | null>) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus]);

  const commit = () => onSave(fromDateInputValue(ref.current?.value ?? ""));

  return (
    <input
      ref={ref}
      type="date"
      defaultValue={toDateInputValue(value)}
      className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-zinc-900"
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
