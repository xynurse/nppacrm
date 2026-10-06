/** Column manifest used by the column picker and CompaniesTable. */
export type ColumnDef = {
  key: string;
  label: string;
  /** Pinned columns can't be hidden. */
  pinned?: boolean;
  /** Off until the user turns them on in the column picker. */
  optional?: boolean;
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
  { key: "tags", label: "Tags" },
  { key: "category", label: "Category", optional: true },
  { key: "subcategory", label: "Subcategory", optional: true },
  { key: "agreementSignedAt", label: "Agreement signed", optional: true },
  { key: "invoiceSentAt", label: "Invoice sent", optional: true },
  { key: "paidAt", label: "Paid", optional: true },
  { key: "boothNumber", label: "Booth #", optional: true },
  { key: "repNames", label: "Reps", optional: true },
];

/** Keys shown until the user customizes columns. */
export const DEFAULT_COLUMNS: string[] = COMPANY_COLUMNS.filter(
  (c) => !c.optional,
).map((c) => c.key);

const BUILTIN_COLUMN_KEYS = new Set(COMPANY_COLUMNS.map((c) => c.key));

export function isBuiltinColumnKey(key: string): boolean {
  return BUILTIN_COLUMN_KEYS.has(key);
}
