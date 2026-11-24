"use client";

import { Archive } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportPack } from "@/lib/actions/export-pack";

export function ExportPackButton({ eventId }: { eventId: string }) {
  const [pending, startPending] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const trigger = () => {
    setError(null);
    startPending(async () => {
      const res = await exportPack({ eventId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const bytes = Uint8Array.from(atob(res.zipBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={trigger} disabled={pending}>
        <Archive className="mr-1.5 h-3.5 w-3.5" />
        {pending ? "Building pack…" : "Download export pack"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
