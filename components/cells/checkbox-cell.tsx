"use client";

import { useState } from "react";
import { updateField } from "@/lib/actions/cells";
import type { FieldKey } from "@/lib/cells/registry";

export function CheckboxCell({
  fieldKey,
  entityId,
  value,
  onLocalChange,
}: {
  fieldKey: FieldKey;
  entityId: string;
  value: boolean;
  onLocalChange?: (next: boolean) => void;
}) {
  const [checked, setChecked] = useState(value);
  const [pending, setPending] = useState(false);

  return (
    <input
      type="checkbox"
      className="h-4 w-4"
      checked={checked}
      disabled={pending}
      onChange={async (e) => {
        const next = e.target.checked;
        setChecked(next);
        onLocalChange?.(next);
        setPending(true);
        const result = await updateField({
          fieldKey,
          entityId,
          value: next,
        });
        setPending(false);
        if (!result.ok) {
          setChecked(value);
          onLocalChange?.(value);
        }
      }}
    />
  );
}
