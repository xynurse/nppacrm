"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";
import { exportEventCompaniesCsv } from "@/lib/actions/csv";
import { Button } from "@/components/ui/button";
import type { FilterAst, SortSpec } from "@/lib/views/types";

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

  const handleClick = () => {
    startTransition(async () => {
      const res = await exportEventCompaniesCsv({ eventId, filter, sort });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="h-8 gap-1 text-xs"
      title="Export current view as CSV"
    >
      <Download className="h-3.5 w-3.5" />
      {pending ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
