"use client";

import { ChevronDown, Download, Package } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  exportEventCompaniesCsv,
  exportEventPack,
} from "@/lib/actions/csv";
import { Button } from "@/components/ui/button";
import type { FilterAst, SortSpec } from "@/lib/views/types";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportButton({
  eventId,
  filter,
  sort,
}: {
  eventId: string;
  filter: FilterAst;
  sort: SortSpec;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const exportCsv = () => {
    setOpen(false);
    startTransition(async () => {
      const res = await exportEventCompaniesCsv({ eventId, filter, sort });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      downloadCsv(res.filename, res.csv);
    });
  };

  const exportPack = () => {
    setOpen(false);
    startTransition(async () => {
      const res = await exportEventPack({ eventId, filter, sort });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      // Stagger slightly so the browser doesn't coalesce downloads.
      for (let i = 0; i < res.files.length; i++) {
        const file = res.files[i]!;
        downloadCsv(file.filename, file.csv);
        if (i < res.files.length - 1) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    });
  };

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="h-8 gap-1 text-xs"
        title="Export current view"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-3.5 w-3.5" />
        {pending ? "Exporting…" : "Export"}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
            onClick={exportCsv}
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            Prospects CSV
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
            onClick={exportPack}
          >
            <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span>
              <span className="block font-medium">Export pack</span>
              <span className="block text-[10px] text-zinc-400">
                Prospects + contacts + interactions
              </span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
