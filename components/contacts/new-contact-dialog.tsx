"use client";

import { UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createContact } from "@/lib/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CompanyOption = { id: string; name: string };

type Props = {
  companies: CompanyOption[];
};

export function NewContactButton({ companies }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <UserPlus className="h-3.5 w-3.5" />
        New contact
      </Button>
      {open ? (
        <NewContactDialog
          companies={companies}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function NewContactDialog({
  companies,
  onClose,
}: {
  companies: CompanyOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState("");

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()),
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const companyId = fd.get("companyId") as string;
    if (!companyId) {
      setError("Please select a company.");
      return;
    }

    const payload = {
      companyId,
      firstName: (fd.get("firstName") as string) || null,
      lastName: (fd.get("lastName") as string) || null,
      title: (fd.get("title") as string) || null,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      isPrimary: fd.get("isPrimary") === "on",
    };

    setError(null);
    startTransition(async () => {
      const res = await createContact(payload);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-sm font-semibold">New contact</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Company picker */}
          <div className="space-y-1.5">
            <Label htmlFor="companySearch">Company *</Label>
            <input
              type="text"
              placeholder="Search companies…"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-zinc-800 dark:text-white"
            />
            {companySearch && (
              <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-zinc-800">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">
                    No companies match
                  </p>
                ) : (
                  filtered.slice(0, 8).map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <input
                        type="radio"
                        name="companyId"
                        value={c.id}
                        className="accent-brand-600"
                        onClick={() => setCompanySearch(c.name)}
                      />
                      {c.name}
                    </label>
                  ))
                )}
              </div>
            )}
            {/* Hidden for validation hint */}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" placeholder="Jane" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" placeholder="Smith" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="VP of Marketing"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPrimary"
              className="accent-brand-600"
            />
            Mark as primary contact
          </label>

          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save contact"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
