"use client";

import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { cn } from "@/lib/cn";

/**
 * One popup UI + one lifecycle bridge, shared by the `/` slash-command and `@`
 * mention extensions. Both drive TipTap's Suggestion plugin, whose `render()`
 * hook hands us the current items, a `command()` to apply the chosen one, and a
 * `clientRect()` for the trigger position.
 *
 * We position a plain floating div at the caret with `clientRect()` rather than
 * pull in tippy.js — the CRM already avoids extra runtime deps, and the editor
 * is behind a dynamic import so this code never touches the initial bundle.
 */

/** What the list actually renders. The raw item is closed over in `run`. */
type DisplayItem = {
  key: string;
  label: string;
  hint?: string;
  run: () => void;
};

export type SuggestionListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const SuggestionList = forwardRef<
  SuggestionListHandle,
  { items: DisplayItem[] }
>(function SuggestionList({ items }, ref) {
  const [selected, setSelected] = useState(0);

  // A fresh items array means the query changed — restart at the top.
  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: (event) => {
        if (!items.length) return false;
        if (event.key === "ArrowUp") {
          setSelected((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          items[selected]?.run();
          return true;
        }
        return false;
      },
    }),
    [items, selected],
  );

  if (!items.length) {
    return (
      <div className="w-64 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-500 shadow-lg dark:border-slate-700 dark:bg-zinc-900 dark:text-slate-400">
        No matches
      </div>
    );
  }

  return (
    <div className="max-h-60 w-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-zinc-900">
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          // Keep the editor selection intact so the command applies to it.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => item.run()}
          onMouseEnter={() => setSelected(i)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
            i === selected
              ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
              : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800",
          )}
        >
          <span className="truncate">{item.label}</span>
          {item.hint ? (
            <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
              {item.hint}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
});

function place(el: HTMLElement, clientRect?: (() => DOMRect | null) | null) {
  const rect = clientRect?.();
  if (!rect) return;
  el.style.top = `${rect.bottom + window.scrollY + 4}px`;
  el.style.left = `${rect.left + window.scrollX}px`;
}

/**
 * Builds the `render` function TipTap's Suggestion config expects. `toDisplay`
 * maps a raw suggestion item to its list-row fields; selecting a row calls the
 * plugin's own `command()` with the raw item.
 */
export function createSuggestionRenderer<T>(
  toDisplay: (item: T) => { key: string; label: string; hint?: string },
) {
  return () => {
    let root: Root | null = null;
    let container: HTMLDivElement | null = null;
    let dismissed = false;
    const handle: { current: SuggestionListHandle | null } = { current: null };

    const draw = (props: SuggestionProps<T>) => {
      if (!root || !container || dismissed) return;
      const items: DisplayItem[] = props.items.map((raw) => ({
        ...toDisplay(raw),
        run: () => props.command(raw),
      }));
      root.render(<SuggestionList ref={handle} items={items} />);
      place(container, props.clientRect);
    };

    return {
      onStart: (props: SuggestionProps<T>) => {
        dismissed = false;
        container = document.createElement("div");
        container.style.position = "absolute";
        container.style.zIndex = "60";
        document.body.appendChild(container);
        root = createRoot(container);
        draw(props);
      },
      onUpdate: (props: SuggestionProps<T>) => draw(props),
      onKeyDown: (props: SuggestionKeyDownProps) => {
        // Esc dismisses the menu for this trigger session (matches the tippy
        // reference behaviour); it re-opens only on a fresh trigger.
        if (props.event.key === "Escape") {
          dismissed = true;
          if (container) container.style.display = "none";
          return true;
        }
        return handle.current?.onKeyDown(props.event) ?? false;
      },
      onExit: () => {
        root?.unmount();
        root = null;
        container?.remove();
        container = null;
        handle.current = null;
      },
    };
  };
}
