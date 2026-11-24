"use client";

import { ExternalLink, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { deleteContact, updateContact } from "@/lib/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContactDirectoryRow } from "@/lib/db/queries/contacts";
import { cn } from "@/lib/cn";

export function ContactDrawer({
  contact,
  onClose,
}: {
  contact: ContactDirectoryRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    if (!contact.email) return;
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; leave UI unchanged.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm"
        aria-label="Close drawer"
      />
      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 h-[100dvh] w-full overflow-y-auto overscroll-y-contain border-zinc-200 bg-white shadow-[var(--shadow-overlay)] lg:inset-x-auto lg:right-0 lg:top-0 lg:h-dvh lg:max-w-md lg:border-l",
        )}
        role="dialog"
        aria-label={contact.fullName}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display text-lg font-semibold tracking-tight text-zinc-900">
                {contact.fullName}
              </h2>
              {contact.isPrimary ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  Primary
                </span>
              ) : null}
            </div>
            {contact.title ? (
              <p className="mt-0.5 truncate text-sm text-zinc-500">
                {contact.title}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {editing ? (
            <ContactEditForm
              contact={contact}
              pending={pending}
              error={error}
              onCancel={() => {
                setEditing(false);
                setError(null);
              }}
              onSubmit={(values) =>
                startTransition(async () => {
                  const result = await updateContact({
                    id: contact.id,
                    ...values,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setEditing(false);
                  setError(null);
                  router.refresh();
                })
              }
            />
          ) : (
            <>
              <dl className="space-y-3 text-sm">
                <Field label="Company">
                  <Link
                    href={`/companies?record=${contact.eventCompanyId}`}
                    scroll={false}
                    className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                  >
                    {contact.companyName}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Field>
                <Field label="Email">
                  {contact.email ? (
                    <button
                      type="button"
                      onClick={() => void copyEmail()}
                      className="text-left font-medium text-zinc-900 hover:underline"
                      title="Copy email"
                    >
                      {contact.email}
                      {copied ? (
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          Copied
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </Field>
                <Field label="Phone">
                  {contact.phone ?? (
                    <span className="text-zinc-400">—</span>
                  )}
                </Field>
                <Field label="LinkedIn">
                  {contact.linkedinUrl ? (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-brand-700 hover:underline"
                    >
                      {contact.linkedinUrl}
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </Field>
              </dl>

              <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(true);
                    setError(null);
                  }}
                >
                  Edit
                </Button>
                {!contact.isPrimary ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await updateContact({
                          id: contact.id,
                          isPrimary: true,
                        });
                        router.refresh();
                      })
                    }
                  >
                    Make primary
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(`Delete ${contact.fullName}?`)) return;
                    startTransition(async () => {
                      await deleteContact({ id: contact.id });
                      onClose();
                      router.refresh();
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-zinc-800">{children}</dd>
    </div>
  );
}

type EditValues = {
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
};

function ContactEditForm({
  contact,
  onSubmit,
  onCancel,
  pending,
  error,
}: {
  contact: ContactDirectoryRow;
  onSubmit: (values: EditValues) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<EditValues>({
    firstName: contact.firstName,
    lastName: contact.lastName,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    linkedinUrl: contact.linkedinUrl,
    isPrimary: contact.isPrimary,
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
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
      <Input
        className="h-8"
        type="url"
        placeholder="LinkedIn URL"
        value={values.linkedinUrl ?? ""}
        onChange={(e) =>
          setValues((v) => ({
            ...v,
            linkedinUrl: e.target.value || null,
          }))
        }
      />
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={values.isPrimary}
          onChange={(e) =>
            setValues((v) => ({ ...v, isPrimary: e.target.checked }))
          }
        />
        Primary contact
      </label>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
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
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
