"use client";

import { useEffect, useRef } from "react";
import type { CellEditorProps } from "./cell-shell";

export type SelectOption = { value: string; label: string };

export function SingleSelectEditor({
  value,
  onSave,
  onCancel,
  autoFocus,
  options,
  allowClear,
}: CellEditorProps<string | null> & {
  options: SelectOption[];
  allowClear?: boolean;
}) {
  const ref = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus]);

  return (
    <select
      ref={ref}
      defaultValue={value ?? ""}
      className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-zinc-900"
      onBlur={() => onSave(ref.current?.value || null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onChange={(e) => onSave(e.target.value || null)}
    >
      {allowClear ? <option value="">—</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
