"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTier, deleteTier, updateTier } from "@/lib/actions/tiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tier = {
  id: string;
  name: string;
  color: string;
  displayOrder: number;
  suggestedAmount: string | null;
};

export function TiersManager({
  eventId,
  tiers: initial,
}: {
  eventId: string;
  tiers: Tier[];
}) {
  const router = useRouter();
  const [tiers, setTiers] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSave = (id: string, patch: Partial<Tier>) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
    startTransition(async () => {
      const res = await updateTier({ id, ...patch });
      if (!res.ok) {
        alert(res.error);
        router.refresh();
      }
    });
  };

  const handleDelete = (t: Tier) => {
    if (!confirm(`Delete tier "${t.name}"? Prospects targeting/confirmed at this tier will be cleared.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteTier({ id: t.id });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Color</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-right">Suggested $</th>
              <th className="px-3 py-2 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {tiers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No tiers yet.
                </td>
              </tr>
            ) : (
              tiers.map((t) => (
                <tr key={t.id} className="h-12">
                  <td className="px-3">
                    <Input
                      type="number"
                      defaultValue={t.displayOrder}
                      className="h-7 w-16 text-xs"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== t.displayOrder) {
                          handleSave(t.id, { displayOrder: v });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3">
                    <input
                      type="color"
                      defaultValue={t.color}
                      className="h-7 w-10 cursor-pointer rounded border border-slate-200 dark:border-slate-700"
                      onBlur={(e) => {
                        if (e.target.value !== t.color) {
                          handleSave(t.id, { color: e.target.value });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3">
                    <Input
                      defaultValue={t.name}
                      className="h-7 text-sm"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== t.name) handleSave(t.id, { name: v });
                      }}
                    />
                  </td>
                  <td className="px-3">
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={t.suggestedAmount ?? ""}
                      className="h-7 text-right text-sm tabular-nums"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const next =
                          v === ""
                            ? null
                            : /^\d+(\.\d{1,2})?$/.test(v)
                              ? v
                              : t.suggestedAmount;
                        if (next !== t.suggestedAmount) {
                          handleSave(t.id, { suggestedAmount: next });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      disabled={pending}
                      aria-label="Delete tier"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {adding ? (
        <AddTierForm
          eventId={eventId}
          nextOrder={(tiers[tiers.length - 1]?.displayOrder ?? 0) + 10}
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setAdding(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add tier
        </Button>
      )}
    </div>
  );
}

function AddTierForm({
  eventId,
  nextOrder,
  onClose,
  onCreated,
}: {
  eventId: string;
  nextOrder: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTier({
        eventId,
        name: name.trim(),
        color,
        displayOrder: nextOrder,
        suggestedAmount: amount.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs text-slate-500">Name</label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="block h-8 w-full cursor-pointer rounded border border-slate-200 dark:border-slate-700"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Suggested amount</label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8"
          />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Creating…" : "Create tier"}
        </Button>
      </div>
    </form>
  );
}
