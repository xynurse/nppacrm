import Link from "next/link";
import { listActiveEvents } from "@/lib/db/queries/events";
import { listContactsForEvent } from "@/lib/db/queries/contacts";
import { listEventCompanies } from "@/lib/db/queries/companies";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { NewContactButton } from "@/components/contacts/new-contact-dialog";
import { ContactsWorkspace } from "@/components/contacts/contacts-workspace";

type SearchParams = Promise<{ q?: string; record?: string }>;

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
        <h1 className="font-display text-xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-sm text-zinc-600">
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
  const initialRecordId =
    typeof params.record === "string" ? params.record : null;

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
          <h1 className="font-display text-xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-zinc-600">
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
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-sm text-zinc-600">
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
        <ContactsWorkspace
          contacts={contacts}
          initialRecordId={initialRecordId}
        />
      )}
    </div>
  );
}
