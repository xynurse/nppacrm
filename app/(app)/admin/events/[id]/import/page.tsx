import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getEventById } from "@/lib/db/queries/events";
import { ImportWizard } from "@/components/admin/import-wizard";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

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
          Import prospects (CSV)
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste rows from a spreadsheet (Master List, NPPA workbook) or a CSV
          file. Existing companies match by name (case-insensitive); duplicates
          on the event are skipped.
        </p>
      </div>

      <ImportWizard eventId={id} />
    </div>
  );
}
