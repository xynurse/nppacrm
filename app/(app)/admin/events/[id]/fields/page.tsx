import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listFieldDefinitionsForEvent } from "@/lib/db/queries/custom-fields";
import { getEventById } from "@/lib/db/queries/events";
import { FieldsManager } from "@/components/admin/fields-manager";

export default async function CustomFieldsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const definitions = await listFieldDefinitionsForEvent(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/events/${id}`}
          className="text-xs text-slate-500 hover:underline dark:text-slate-400"
        >
          ← {event.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Custom fields
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Add fields that show on every prospect drawer for this event.
        </p>
      </div>

      <FieldsManager eventId={id} definitions={definitions} />
    </div>
  );
}
