/** Column manifest used by the column picker and CompaniesTable. */
export type ColumnDef = {
  key: string;
  label: string;
  /** Pinned columns can't be hidden. */
  pinned?: boolean;
};

export const COMPANY_COLUMNS: ColumnDef[] = [
  { key: "companyName", label: "Company", pinned: true },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "ownerId", label: "Owner" },
  { key: "targetTierId", label: "Target tier" },
  { key: "proposedAmount", label: "Proposed" },
  { key: "confirmedAmount", label: "Confirmed" },
  { key: "review", label: "Review" },
  { key: "lastContactedAt", label: "Last contact" },
  { key: "nextActionAt", label: "Next action" },
];

/** Keys shown by default (all non-select columns). */
export const DEFAULT_COLUMNS: string[] = COMPANY_COLUMNS.map((c) => c.key);
