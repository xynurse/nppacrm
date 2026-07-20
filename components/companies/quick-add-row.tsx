"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { quickAddEventCompany } from "@/lib/actions/cells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickAddRow({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-zinc-900/50"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setError(null);
        startTransition(async () => {
          const result = await quickAddEventCompany({
            eventId,
            name: name.trim(),
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setName("");
          router.refresh();
        });
      }}
    >
      <Plus className="h-4 w-4 text-slate-400" />
      <Input
        className="h-7 max-w-md text-sm"
        placeholder="Add prospect — type a company name and press Enter"
        value={name}
        disabled={pending}
        onChange={(e) => setName(e.target.value)}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending || !name.trim()}
      >
        {pending ? "Adding…" : "Add"}
      </Button>
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </form>
  );
}
