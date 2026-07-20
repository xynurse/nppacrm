"use client";

import { useEffect, useRef } from "react";
import type { CellEditorProps } from "./cell-shell";

export function CurrencyEditor({
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
    const raw = ref.current?.value.trim() ?? "";
    if (raw === "") return onSave(null);
    const cleaned = raw.replace(/[^\d.]/g, "");
    onSave(cleaned);
  };

  return (
    <input
      ref={ref}
      inputMode="decimal"
      defaultValue={value ?? ""}
      className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-zinc-900"
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
