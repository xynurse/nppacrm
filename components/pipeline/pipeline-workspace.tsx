"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import type { PersonOption, TierOption } from "@/components/cells/types";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { useShallowRecord } from "@/hooks/use-shallow-record";
import type { CustomFieldDefinition } from "@/lib/db/schema";
import type { EventCompanyRow } from "@/lib/db/queries/companies";

const CompanyDrawer = dynamic(
  () =>
    import("@/components/companies/company-drawer").then((m) => m.CompanyDrawer),
  { ssr: false },
);

export function PipelineWorkspace({
  rows,
  owners,
  tiers,
  initialRecordId,
  currentUserId,
  isAdmin,
  fieldDefinitions,
}: {
  rows: EventCompanyRow[];
  owners: PersonOption[];
  tiers: TierOption[];
  initialRecordId: string | null;
  currentUserId: string;
  isAdmin: boolean;
  fieldDefinitions: CustomFieldDefinition[];
}) {
  const { recordId, setRecord } = useShallowRecord(initialRecordId);
  const drawerRow = recordId
    ? (rows.find((r) => r.id === recordId) ?? null)
    : null;
  const onClose = useCallback(() => setRecord(null), [setRecord]);

  return (
    <>
      <KanbanBoard rows={rows} tiers={tiers} onOpenRecord={setRecord} />
      {recordId ? (
        <CompanyDrawer
          row={drawerRow}
          owners={owners}
          tiers={tiers}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          fieldDefinitions={fieldDefinitions}
          recordIds={rows.map((r) => r.id)}
          onClose={onClose}
          onNavigateRecord={setRecord}
        />
      ) : null}
    </>
  );
}
