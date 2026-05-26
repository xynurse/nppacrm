"use client";

import { Download } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportReportCsv } from "@/lib/actions/reports";

type Props = {
  eventId: string;
  kind: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

export function CsvDownloadButton({
  eventId,
  kind,
  label = "CSV",
  variant = "outline",
  size = "sm",
}: Props) {
  const [pending, startPending] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const trigger = () => {
    setError(null);
    startPending(async () => {
      const res = await exportReportCsv({ eventId, kind });
      if (!res.ok) {
        setError(res.error);
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
      // Defer revoking the URL so the download triggers cleanly.
      setTimeout(() => URL.revokeObjectURL(url), 500);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={trigger}
        disabled={pending}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        {pending ? "Building…" : label}
      </Button>
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
