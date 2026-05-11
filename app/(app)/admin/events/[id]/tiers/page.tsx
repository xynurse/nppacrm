import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listTiersForEvent } from "@/lib/db/queries/companies";
import { getEventById } from "@/lib/db/queries/events";
import { TiersManager } from "@/components/admin/tiers-manager";

export default async function TiersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const tiers = await listTiersForEvent(id);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/admin/events/${id}`}
          className="text-xs text-slate-500 hover:underline dark:text-slate-400"
        >
          ← {event.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Sponsorship tiers
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Order, label, and price the sponsorship tiers offered for this event.
        </p>
      </div>

      <TiersManager
        eventId={id}
        tiers={tiers.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          displayOrder: t.displayOrder,
          suggestedAmount: t.suggestedAmount,
        }))}
      />
    </div>
  );
}
