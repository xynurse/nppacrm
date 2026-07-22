"use client";

import { Check, CircleAlert, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LazyRichEditor } from "./rich-editor-lazy";
import { isEmptyDoc } from "@/lib/tiptap/serialize";
import type { RichDoc } from "@/lib/tiptap/types";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Rich editor that persists on a debounce — used for long-form notes, where
 * there is no natural submit button to hang a save off.
 *
 * Edits made while a save is in flight are not lost: the latest doc is parked
 * in a ref and flushed as soon as the current request settles.
 */
export function AutosaveRichEditor({
  value,
  placeholder,
  onSave,
  debounceMs = 900,
  minHeightClass,
}: {
  value: RichDoc | null;
  placeholder?: string;
  onSave: (doc: RichDoc | null) => Promise<{ ok: boolean; error?: string }>;
  debounceMs?: number;
  minHeightClass?: string;
}) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<RichDoc | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Self-reference so the tail call below always hits the latest closure.
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const flush = useCallback(async () => {
    if (inFlight.current) return;
    const doc = pending.current;
    if (!doc) return;

    pending.current = null;
    inFlight.current = true;
    if (mounted.current) setState("saving");

    const result = await onSave(isEmptyDoc(doc) ? null : doc);

    inFlight.current = false;
    if (!mounted.current) return;

    if (result.ok) {
      setError(null);
      setState("saved");
    } else {
      setError(result.error ?? "Could not save");
      setState("error");
    }

    // An edit landed while the request was in flight — save that too.
    if (pending.current) void flushRef.current();
  }, [onSave]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const handleChange = useCallback(
    (doc: RichDoc) => {
      pending.current = doc;
      setState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), debounceMs);
    },
    [debounceMs, flush],
  );

  return (
    <div className="space-y-1">
      <LazyRichEditor
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        minHeightClass={minHeightClass}
      />
      <div className="flex h-4 items-center justify-end text-xs text-slate-400 dark:text-slate-500">
        {state === "saving" ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        ) : state === "saved" ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" />
            Saved
          </span>
        ) : state === "error" ? (
          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
            <CircleAlert className="h-3 w-3" />
            {error}
          </span>
        ) : state === "dirty" ? (
          <span>Unsaved…</span>
        ) : null}
      </div>
    </div>
  );
}
