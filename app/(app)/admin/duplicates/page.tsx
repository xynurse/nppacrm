import { requireAdmin } from "@/lib/auth";
import {
  countEventLinksForCompanies,
  findDuplicateCompanyGroups,
} from "@/lib/db/queries/duplicates";
import { DuplicatesPanel } from "@/components/admin/duplicates-panel";

export default async function AdminDuplicatesPage() {
  await requireAdmin();
  const groups = await findDuplicateCompanyGroups();
  const allIds = groups.flatMap((g) => g.companies.map((c) => c.id));
  const counts = await countEventLinksForCompanies(allIds);
  const linkCounts = Object.fromEntries(counts.entries());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-900">
          Duplicate companies
        </h1>
        <p className="text-sm text-zinc-500">
          Groups that share a normalized name (Inc/LLC stripped). Pick the
          survivor, then merge each duplicate into it.
        </p>
      </div>
      <DuplicatesPanel groups={groups} linkCounts={linkCounts} />
    </div>
  );
}
