"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import type { PersonOption, TierOption } from "@/components/cells/types";
import { CompaniesTable } from "@/components/companies/companies-table";
import { useShallowRecord } from "@/hooks/use-shallow-record";
import type { CustomFieldDefinition } from "@/lib/db/schema";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import type { SortSpec } from "@/lib/views/types";

const CompanyDrawer = dynamic(
  () =>
    import("@/components/companies/company-drawer").then((m) => m.CompanyDrawer),
  { ssr: false },
);

type ReviewSummary = { yes: number; no: number; mine: "yes" | "no" | null };

export function CompaniesWorkspace({
  rows,
  owners,
  tiers,
  initialRecordId,
  isAdmin,
  currentUserId,
  reviewSummaries,
  reviewerCount,
  isReviewer,
  sort,
  visibleColumns,
  fieldDefinitions,
}: {
  rows: EventCompanyRow[];
  owners: PersonOption[];
  tiers: TierOption[];
  initialRecordId: string | null;
  isAdmin: boolean;
  currentUserId: string;
  reviewSummaries: Record<string, ReviewSummary>;
  reviewerCount: number;
  isReviewer: boolean;
  sort?: SortSpec;
  visibleColumns?: string[];
  fieldDefinitions?: CustomFieldDefinition[];
}) {
  const { recordId, setRecord } = useShallowRecord(initialRecordId);
  const drawerRow = recordId
    ? (rows.find((r) => r.id === recordId) ?? null)
    : null;

  const onClose = useCallback(() => setRecord(null), [setRecord]);

  return (
    <>
      <CompaniesTable
        rows={rows}
        owners={owners}
        tiers={tiers}
        activeRecordId={recordId}
        isAdmin={isAdmin}
        reviewSummaries={reviewSummaries}
        reviewerCount={reviewerCount}
        isReviewer={isReviewer}
        sort={sort}
        visibleColumns={visibleColumns}
        fieldDefinitions={fieldDefinitions}
        onOpenRecord={setRecord}
      />
      {recordId ? (
        <CompanyDrawer
          row={drawerRow}
          owners={owners}
          tiers={tiers}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          fieldDefinitions={fieldDefinitions ?? []}
          recordIds={rows.map((r) => r.id)}
          onClose={onClose}
          onNavigateRecord={setRecord}
        />
      ) : null}
    </>
  );
}
