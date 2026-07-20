"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import { updateField } from "@/lib/actions/cells";
import type { FieldKey } from "@/lib/cells/registry";

export type CellEditorProps<V> = {
  value: V;
  onSave: (next: V) => void;
  onCancel: () => void;
  autoFocus?: boolean;
};

export type CellShellProps<V> = {
  fieldKey: FieldKey;
  entityId: string;
  value: V;
  display: ReactNode;
  Editor: (props: CellEditorProps<V>) => ReactNode;
  onLocalChange?: (next: V) => void;
  className?: string;
  align?: "left" | "right";
};

export function CellShell<V>({
  fieldKey,
  entityId,
  value,
  display,
  Editor,
  onLocalChange,
  className,
  align = "left",
}: CellShellProps<V>) {
  const [editing, setEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState<V>(value);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPendingValue(value);
  }, [value]);

  const cancel = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);

  const save = useCallback(
    async (next: V) => {
      setEditing(false);
      setError(null);
      onLocalChange?.(next);
      const result = await updateField({
        fieldKey,
        entityId,
        value: next as unknown,
      });
      if (!result.ok) {
        setError(result.error);
        onLocalChange?.(value);
      }
    },
    [entityId, fieldKey, onLocalChange, value],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative w-full cursor-text rounded px-1 py-0.5 transition-colors duration-100 hover:bg-brand-50/60 dark:hover:bg-brand-950/40",
        editing &&
          "bg-white ring-1 ring-brand-500/50 dark:bg-zinc-900 dark:ring-brand-400/50",
        align === "right" && "text-right",
        className,
      )}
      onClick={() => !editing && setEditing(true)}
      onKeyDown={(e) => {
        if (!editing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setEditing(true);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {editing ? (
        <Editor
          value={pendingValue}
          onSave={save}
          onCancel={cancel}
          autoFocus
        />
      ) : (
        <>
          <span className="block truncate">{display}</span>
          <Pencil
            className={cn(
              "pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 opacity-0 transition-opacity duration-100 group-hover:opacity-100 dark:text-slate-500",
              align === "right" ? "left-1" : "right-1",
            )}
            aria-hidden
          />
        </>
      )}
      {error ? (
        <span className="absolute -bottom-4 left-0 text-[10px] text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}
