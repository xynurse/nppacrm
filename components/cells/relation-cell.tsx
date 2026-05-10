"use client";

import { SingleSelectEditor } from "./single-select-cell";
import type { CellEditorProps } from "./cell-shell";
import type { TierOption } from "./types";

export function TierEditor({
  options,
  ...props
}: CellEditorProps<string | null> & { options: TierOption[] }) {
  return (
    <SingleSelectEditor
      {...props}
      allowClear
      options={options.map((o) => ({ value: o.id, label: o.name }))}
    />
  );
}
