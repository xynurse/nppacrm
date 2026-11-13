import Link from "next/link";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  listCompanyTaxonomyFacets,
  listEventCompanies,
  listTiersForEvent,
} from "@/lib/db/queries/companies";
import { listFieldDefinitionsForEvent } from "@/lib/db/queries/custom-fields";
import {
  listReviewerIdsForEvent,
  listReviewsForEvent,
} from "@/lib/db/queries/reviews";
import { listSavedViewsForUser } from "@/lib/db/queries/saved-views";
import { listUsers } from "@/lib/db/queries/users";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CompaniesWorkspace } from "@/components/companies/companies-workspace";
import { QuickAddRow } from "@/components/companies/quick-add-row";
import { ViewsToolbar } from "@/components/views/views-toolbar";
import {
  decodeFromParam,
  sanitizeFilter,
  sanitizeSort,
} from "@/lib/views/schema";
import type { FilterAst, SortSpec } from "@/lib/views/types";
import { EMPTY_FILTER } from "@/lib/views/types";
import {
  DEFAULT_COLUMNS,
  isBuiltinColumnKey,
} from "@/lib/views/columns";
import {
  customFieldFilterKey,
  fieldMetaForCustom,
} from "@/lib/views/fields";

type SearchParams = Promise<{
  record?: string;
  view?: string;
  f?: string;
  s?: string;
  col?: string;
  q?: string;
}>;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [session, params] = await Promise.all([
    requireSession(),
    searchParams,
  ]);
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No event yet. Create one to start tracking sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  // Event-scoped lookups that don't depend on the active view/filter can all
  // run together — tiers/users/reviews don't wait on saved views.
  const [
    savedViews,
    fieldDefinitions,
    tiers,
    users,
    reviewerIds,
    reviews,
    taxonomyFacets,
  ] = await Promise.all([
    listSavedViewsForUser(activeEvent.id, session.user.id),
    listFieldDefinitionsForEvent(activeEvent.id),
    listTiersForEvent(activeEvent.id),
    listUsers(),
    listReviewerIdsForEvent(activeEvent.id),
    listReviewsForEvent(activeEvent.id),
    listCompanyTaxonomyFacets(activeEvent.id),
  ]);

  const extraFields = fieldDefinitions.flatMap((def) => {
    const meta = fieldMetaForCustom(def);
    return meta ? [meta] : [];
  });
  const customFieldTypes = new Map(
    fieldDefinitions.map((def) => [def.key, def.fieldType]),
  );
  const customColumnKeys = new Set(
    fieldDefinitions.map((def) => customFieldFilterKey(def.key)),
  );
  const allowColumn = (key: string) =>
    isBuiltinColumnKey(key) || customColumnKeys.has(key);
  const requestedView =
    typeof params.view === "string"
      ? (savedViews.find((v) => v.id === params.view) ?? null)
      : null;
  const fallbackDefault =
    !params.view && !params.f && !params.s
      ? (savedViews.find((v) => v.isDefault) ?? null)
      : null;
  const activeView = requestedView ?? fallbackDefault;

  const adHocFilter = sanitizeFilter(decodeFromParam(params.f), extraFields);
  const adHocSort = sanitizeSort(decodeFromParam(params.s), extraFields);

  const filter: FilterAst =
    params.f != null
      ? adHocFilter
      : (activeView?.filter ?? EMPTY_FILTER);
  const sort: SortSpec =
    params.s != null
      ? adHocSort
      : (activeView?.sort ?? []);

  const rawColumns = params.col != null ? decodeFromParam(params.col) : null;
  const viewColumns = (activeView?.columns ?? []).filter(allowColumn);
  const visibleColumns: string[] = Array.isArray(rawColumns)
    ? rawColumns.filter((k): k is string => typeof k === "string" && allowColumn(k))
    : viewColumns.length > 0
      ? viewColumns
      : DEFAULT_COLUMNS;

  const keyword = typeof params.q === "string" ? params.q : null;

  const rows = await listEventCompanies(activeEvent.id, {
    filter,
    sort,
    keyword,
    customFieldTypes,
  });

  const owners = users
    .filter((u) => u.isActive)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));
  const tierOptions = tiers.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

  const ownerFieldOptions = owners.map((o) => ({ value: o.id, label: o.name }));
  const tierFieldOptions = tiers.map((t) => ({ value: t.id, label: t.name }));
  const toOptions = (values: string[]) =>
    values.map((v) => ({ value: v, label: v }));
  const taxonomyFieldOptions = {
    sizeBand: toOptions(taxonomyFacets.sizeBands),
    category: toOptions(taxonomyFacets.sectors),
    subcategory: toOptions(taxonomyFacets.subSectors),
  };

  const recordId = typeof params.record === "string" ? params.record : null;

  const reviewIndex = new Map<
    string,
    { yes: number; no: number; mine: "yes" | "no" | null }
  >();
  for (const row of rows) {
    reviewIndex.set(row.id, { yes: 0, no: 0, mine: null });
  }
  for (const r of reviews) {
    const entry = reviewIndex.get(r.eventCompanyId);
    if (!entry) continue;
    if (r.vote === "yes") entry.yes += 1;
    else entry.no += 1;
    if (r.reviewerId === session.user.id) entry.mine = r.vote;
  }
  const reviewSummaries = Object.fromEntries(reviewIndex.entries());

  const isReviewer = reviewerIds.includes(session.user.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Companies
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {activeEvent.name} · {rows.length} prospects
            {keyword ? ` matching “${keyword}”` : ""}
          </p>
        </div>
      </div>

      <ViewsToolbar
        eventId={activeEvent.id}
        views={savedViews}
        initialFilter={filter}
        initialSort={sort}
        initialViewId={activeView?.id ?? null}
        initialColumns={visibleColumns}
        ownerOptions={ownerFieldOptions}
        tierOptions={tierFieldOptions}
        fieldOptions={taxonomyFieldOptions}
        resultCount={rows.length}
        isAdmin={session.user.role === "admin"}
        extraFields={extraFields}
        extraColumns={fieldDefinitions.map((def) => ({
          key: customFieldFilterKey(def.key),
          label: def.label,
        }))}
      />

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <QuickAddRow eventId={activeEvent.id} />
      </div>

      <CompaniesWorkspace
        rows={rows}
        owners={owners}
        tiers={tierOptions}
        initialRecordId={recordId}
        isAdmin={session.user.role === "admin"}
        currentUserId={session.user.id}
        reviewSummaries={reviewSummaries}
        reviewerCount={reviewerIds.length}
        isReviewer={isReviewer}
        sort={sort}
        visibleColumns={visibleColumns}
        fieldDefinitions={fieldDefinitions}
      />
    </div>
  );
}
