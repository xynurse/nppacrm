"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  /** URL query param this input reads from and writes to. */
  paramKey?: string;
  placeholder?: string;
  className?: string;
  /** Debounce before the URL updates, in ms. */
  debounceMs?: number;
};

/**
 * A keyword search box that syncs to a URL query param (debounced). Server
 * components read the param and re-query, so results update as you type
 * without any client-side filtering. Preserves all other query params.
 */
export function SearchInput({
  paramKey = "q",
  placeholder = "Search…",
  className,
  debounceMs = 300,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramKey) ?? "";

  const [value, setValue] = useState(current);
  const spRef = useRef(searchParams);
  spRef.current = searchParams;
  const lastPushed = useRef(current);

  // Sync local state when the param changes from elsewhere (nav, clear, etc.)
  useEffect(() => {
    if (current !== lastPushed.current) {
      setValue(current);
      lastPushed.current = current;
    }
  }, [current]);

  // Debounced push of the current input to the URL.
  useEffect(() => {
    if (value === (spRef.current.get(paramKey) ?? "")) return;
    const t = setTimeout(() => {
      const sp = new URLSearchParams(spRef.current.toString());
      if (value.trim()) sp.set(paramKey, value);
      else sp.delete(paramKey);
      lastPushed.current = value;
      const qs = sp.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, paramKey, pathname, router, debounceMs]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-7 text-sm shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
