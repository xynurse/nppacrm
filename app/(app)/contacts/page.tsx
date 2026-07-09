import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { listActiveEvents } from "@/lib/db/queries/events";
import { listContactsForEvent } from "@/lib/db/queries/contacts";
import { listEventCompanies } from "@/lib/db/queries/companies";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { NewContactButton } from "@/components/contacts/new-contact-dialog";

type SearchParams = Promise<{ q?: string }>;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No event yet. Create one to start tracking contacts.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const keyword = typeof params.q === "string" ? params.q : null;

  const [contacts, allEventCompanies] = await Promise.all([
    listContactsForEvent(activeEvent.id, { keyword }),
    listEventCompanies(activeEvent.id),
  ]);

  // Deduplicate to unique companies for the picker
  const companyOptions = Array.from(
    new Map(
      allEventCompanies.map((ec) => [ec.companyId, { id: ec.companyId, name: ec.companyName }]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {activeEvent.name} · {contacts.length} contacts
            {keyword ? ` matching “${keyword}”` : ""}
          </p>
        </div>
        <NewContactButton companies={companyOptions} />
      </div>

      <SearchInput
        placeholder="Search contacts by name, email, title, company…"
        className="w-full sm:w-96"
      />

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {keyword ? (
              <>No contacts match “{keyword}”. Try a different search.</>
            ) : (
              <>
                No contacts yet. Click <strong>New contact</strong> above or add
                contacts inside a prospect&apos;s drawer.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  className="h-10 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3">
                    <span className="font-medium">{c.fullName}</span>
                    {c.isPrimary ? (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        Primary
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 text-slate-600 dark:text-slate-300">
                    {c.title ?? "—"}
                  </td>
                  <td className="px-3 text-slate-600 dark:text-slate-300">
                    {c.companyName}
                  </td>
                  <td className="px-3 text-slate-600 dark:text-slate-300">
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="hover:underline"
                      >
                        {c.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 text-slate-600 dark:text-slate-300">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-3 text-right">
                    <Link
                      href={`/companies?record=${c.eventCompanyId}`}
                      scroll={false}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
