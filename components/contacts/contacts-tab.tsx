"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createContact,
  deleteContact,
  updateContact,
} from "@/lib/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContactRow } from "@/lib/db/queries/contacts";
import { cn } from "@/lib/cn";

export function ContactsTab({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: ContactRow[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Contacts <span className="text-slate-400">({contacts.length})</span>
        </h3>
        {!adding ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdding(true);
              setError(null);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        ) : null}
      </div>

      {adding ? (
        <ContactForm
          submitLabel="Create"
          onSubmit={(values) =>
            startTransition(async () => {
              const result = await createContact({ companyId, ...values });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setAdding(false);
              router.refresh();
            })
          }
          onCancel={() => {
            setAdding(false);
            setError(null);
          }}
          pending={pending}
          error={error}
        />
      ) : null}

      {contacts.length === 0 && !adding ? (
        <p className="text-xs italic text-slate-500 dark:text-slate-400">
          No contacts yet. Click Add to create one.
        </p>
      ) : null}

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {contacts.map((c) => (
          <ContactItem key={c.id} contact={c} />
        ))}
      </ul>
    </div>
  );
}

function ContactItem({ contact }: { contact: ContactRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li className="py-3">
        <ContactForm
          submitLabel="Save"
          initial={contact}
          onSubmit={(values) =>
            startTransition(async () => {
              const result = await updateContact({ id: contact.id, ...values });
              if (!result.ok) return setError(result.error);
              setEditing(false);
              router.refresh();
            })
          }
          onCancel={() => {
            setEditing(false);
            setError(null);
          }}
          pending={pending}
          error={error}
          showPrimaryToggle
        />
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-2 py-2 text-sm">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => setEditing(true)}
      >
        <div className="flex items-center gap-1.5 font-medium">
          {contact.fullName}
          {contact.isPrimary ? (
            <Star
              className="h-3 w-3 fill-amber-400 text-amber-400"
              aria-label="Primary contact"
            />
          ) : null}
        </div>
        {contact.title ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {contact.title}
          </div>
        ) : null}
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          {contact.email ? <span>{contact.email}</span> : null}
          {contact.phone ? <span>{contact.phone}</span> : null}
        </div>
      </button>
      <div className="flex items-center gap-1">
        {!contact.isPrimary ? (
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800"
            disabled={pending}
            title="Make primary"
            onClick={() =>
              startTransition(async () => {
                await updateContact({ id: contact.id, isPrimary: true });
                router.refresh();
              })
            }
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
          disabled={pending}
          title="Delete"
          onClick={() => {
            if (!window.confirm(`Delete ${contact.fullName}?`)) return;
            startTransition(async () => {
              await deleteContact({ id: contact.id });
              router.refresh();
            });
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

type ContactFormValues = {
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary?: boolean;
};

function ContactForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  error,
  showPrimaryToggle,
}: {
  initial?: ContactRow;
  onSubmit: (values: ContactFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  showPrimaryToggle?: boolean;
}) {
  const [values, setValues] = useState<ContactFormValues>({
    firstName: initial?.firstName ?? null,
    lastName: initial?.lastName ?? null,
    title: initial?.title ?? null,
    email: initial?.email ?? null,
    phone: initial?.phone ?? null,
    linkedinUrl: initial?.linkedinUrl ?? null,
    isPrimary: initial?.isPrimary,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className={cn(
        "space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900",
      )}
    >
      <div className="grid grid-cols-2 gap-2">
        <Input
          className="h-8"
          placeholder="First name"
          value={values.firstName ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, firstName: e.target.value || null }))
          }
        />
        <Input
          className="h-8"
          placeholder="Last name"
          value={values.lastName ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, lastName: e.target.value || null }))
          }
        />
      </div>
      <Input
        className="h-8"
        placeholder="Title"
        value={values.title ?? ""}
        onChange={(e) =>
          setValues((v) => ({ ...v, title: e.target.value || null }))
        }
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          className="h-8"
          type="email"
          placeholder="Email"
          value={values.email ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, email: e.target.value || null }))
          }
        />
        <Input
          className="h-8"
          placeholder="Phone"
          value={values.phone ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, phone: e.target.value || null }))
          }
        />
      </div>
      <Input
        className="h-8"
        type="url"
        placeholder="LinkedIn URL"
        value={values.linkedinUrl ?? ""}
        onChange={(e) =>
          setValues((v) => ({ ...v, linkedinUrl: e.target.value || null }))
        }
      />
      {showPrimaryToggle ? (
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={values.isPrimary ?? false}
            onChange={(e) =>
              setValues((v) => ({ ...v, isPrimary: e.target.checked }))
            }
          />
          Primary contact
        </label>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
