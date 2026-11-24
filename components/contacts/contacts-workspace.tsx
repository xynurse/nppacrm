"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ContactDrawer } from "@/components/contacts/contact-drawer";
import { useShallowRecord } from "@/hooks/use-shallow-record";
import type { ContactDirectoryRow } from "@/lib/db/queries/contacts";
import { cn } from "@/lib/cn";

export function ContactsWorkspace({
  contacts,
  initialRecordId,
}: {
  contacts: ContactDirectoryRow[];
  initialRecordId: string | null;
}) {
  const { recordId, setRecord } = useShallowRecord(initialRecordId);
  const drawerContact = recordId
    ? (contacts.find((c) => c.id === recordId) ?? null)
    : null;

  const onClose = useCallback(() => setRecord(null), [setRecord]);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr className="border-b border-zinc-200">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {contacts.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                active={recordId === c.id}
                onOpen={() => setRecord(c.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {drawerContact ? (
        <ContactDrawer contact={drawerContact} onClose={onClose} />
      ) : null}
    </>
  );
}

function ContactRow({
  contact,
  active,
  onOpen,
}: {
  contact: ContactDirectoryRow;
  active: boolean;
  onOpen: () => void;
}) {
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
    <tr
      className={cn(
        "h-10 hover:bg-zinc-50",
        active && "bg-brand-50/60 hover:bg-brand-50/80",
      )}
    >
      <td className="px-3">
        <button
          type="button"
          onClick={onOpen}
          className="text-left font-medium text-zinc-900 hover:underline"
        >
          {contact.fullName}
        </button>
        {contact.isPrimary ? (
          <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
            Primary
          </span>
        ) : null}
      </td>
      <td className="px-3 text-zinc-600">{contact.title ?? "—"}</td>
      <td className="px-3">
        <Link
          href={`/companies?record=${contact.eventCompanyId}`}
          scroll={false}
          className="text-zinc-600 hover:text-zinc-900 hover:underline"
        >
          {contact.companyName}
        </Link>
      </td>
      <td className="px-3 text-zinc-600">
        {contact.email ? (
          <button
            type="button"
            onClick={() => void copyEmail()}
            className="text-left hover:underline"
            title="Copy email"
          >
            {contact.email}
            {copied ? (
              <span className="ml-1.5 text-[10px] text-zinc-400">Copied</span>
            ) : null}
          </button>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 text-zinc-600">{contact.phone ?? "—"}</td>
    </tr>
  );
}
