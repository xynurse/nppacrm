import { requireSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await requireSession();
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Welcome, {session.user.name ?? session.user.email}. Companies, contacts,
        and pipeline land in later chunks.
      </p>
    </div>
  );
}
