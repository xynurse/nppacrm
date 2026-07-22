"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";

/**
 * The only entry point other components should import.
 *
 * ProseMirror + the TipTap extensions are ~90 kB gzipped, and `/companies` is
 * already over its First Load JS budget — so the editor is fetched on demand
 * (when a drawer tab actually renders one) instead of shipping with the page.
 */
export const LazyRichEditor = dynamic(
  () => import("./rich-editor").then((m) => m.RichEditor),
  {
    ssr: false,
    loading: () => <LoadingBox />,
  },
);

function LoadingBox() {
  return (
    <div
      className={cn(
        "min-h-[5rem] animate-pulse rounded-md border border-slate-200 bg-slate-50",
        "dark:border-slate-700 dark:bg-zinc-900",
      )}
    />
  );
}
