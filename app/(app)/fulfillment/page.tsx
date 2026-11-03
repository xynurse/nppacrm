import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import { listConfirmedForFulfillment } from "@/lib/db/queries/fulfillment";
import { FulfillmentBoard } from "@/components/fulfillment/fulfillment-board";
import { Button } from "@/components/ui/button";

export default async function FulfillmentPage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Fulfillment
        </h1>
        <p className="text-sm text-zinc-500">
          No event yet. Create one to track confirmed sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const rows = await listConfirmedForFulfillment(activeEvent.id);
  const complete = rows.filter(
    (r) => r.agreementSignedAt && r.invoiceSentAt && r.paidAt,
  ).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-900">
          Fulfillment
        </h1>
        <p className="text-sm text-zinc-500">
          {activeEvent.name} · {complete}/{rows.length} sponsors fully closed
          (agreement + invoice + paid)
        </p>
      </div>
      <FulfillmentBoard rows={rows} />
    </div>
  );
}
