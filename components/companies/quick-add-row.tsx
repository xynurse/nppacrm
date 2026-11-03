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
      className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:bg-zinc-50/50"
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
      <Plus className="hidden h-4 w-4 shrink-0 text-zinc-400 sm:block" />
      <Input
        className="h-9 min-w-0 flex-1 text-sm sm:h-7 sm:max-w-md"
        placeholder="Add a company…"
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
        <span className="basis-full text-xs text-red-600 sm:basis-auto">
          {error}
        </span>
      ) : null}
    </form>
  );
}
