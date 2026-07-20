import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProspectus } from "@/lib/db/queries/ai";
import { getEventById } from "@/lib/db/queries/events";
import { ProspectusManager } from "@/components/admin/prospectus-manager";
import { aiConfigurationStatus } from "@/lib/ai/gateway";
import { isSearchConfigured } from "@/lib/ai/search";
import { env } from "@/lib/env";

export default async function ProspectusAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, prospectus] = await Promise.all([
    getEventById(id),
    getActiveProspectus(id),
  ]);
  if (!event) notFound();

  const aiStatus = aiConfigurationStatus();
  const searchOk = isSearchConfigured();
  const blobOk = !!env.BLOB_READ_WRITE_TOKEN;

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
          Prospectus
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload the conference sponsorship prospectus PDF. The system extracts
          the text and uses it as grounding context for every AI enrichment on
          this event&apos;s prospects.
        </p>
      </div>

      <ProspectusManager
        eventId={id}
        prospectus={prospectus}
        blobConfigured={blobOk}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-zinc-900">
        <h2 className="font-semibold">AI configuration status</h2>
        <ul className="mt-2 space-y-1">
          <StatusItem
            label="Vercel Blob (PDF uploads)"
            ok={blobOk}
            hint="Set BLOB_READ_WRITE_TOKEN — usually via the Vercel Blob integration."
          />
          <StatusItem
            label="Anthropic / AI Gateway (drafting)"
            ok={aiStatus.ok}
            hint="Set AI_GATEWAY_API_KEY (Vercel → AI tab) or ANTHROPIC_API_KEY."
          />
          <StatusItem
            label="Valyu (web search grounding)"
            ok={searchOk}
            hint="Set VALYU_API_KEY. Enrichment still runs without it; suggestions are less grounded."
          />
        </ul>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Daily AI spend cap:{" "}
          <code className="font-mono">
            ${env.AI_DAILY_SPEND_CAP_USD.toFixed(2)}
          </code>
          . Adjust via <code className="font-mono">AI_DAILY_SPEND_CAP_USD</code> env.
        </p>
      </section>
    </div>
  );
}

function StatusItem({
  label,
  ok,
  hint,
}: {
  label: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={
          ok
            ? "mt-0.5 inline-block h-2 w-2 rounded-full bg-emerald-500"
            : "mt-0.5 inline-block h-2 w-2 rounded-full bg-amber-500"
        }
        aria-hidden
      />
      <div>
        <div>
          {label}{" "}
          <span
            className={
              ok
                ? "text-xs text-emerald-700 dark:text-emerald-300"
                : "text-xs text-amber-700 dark:text-amber-300"
            }
          >
            {ok ? "ready" : "not configured"}
          </span>
        </div>
        {!ok ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </div>
    </li>
  );
}
