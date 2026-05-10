"use client";

import { SingleSelectEditor } from "./single-select-cell";
import type { CellEditorProps } from "./cell-shell";
import type { PersonOption } from "./types";

export function PersonEditor({
  options,
  ...props
}: CellEditorProps<string | null> & { options: PersonOption[] }) {
  return (
    <SingleSelectEditor
      {...props}
      allowClear
      options={options.map((o) => ({ value: o.id, label: o.name }))}
    />
  );
}
