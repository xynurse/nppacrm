import type { TaskRow } from "@/lib/db/queries/tasks";

export type DueBucketId =
  | "overdue"
  | "today"
  | "this_week"
  | "later"
  | "no_date"
  | "done";

export type DueBucket = {
  id: DueBucketId;
  label: string;
  tasks: TaskRow[];
};

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function classifyDueBucket(task: TaskRow, today = startOfToday()): DueBucketId {
  if (task.completedAt) return "done";
  if (!task.dueDate) return "no_date";
  const d = new Date(task.dueDate);
  d.setHours(0, 0, 0, 0);
  if (d < today) return "overdue";
  if (d.getTime() === today.getTime()) return "today";
  if (d < addDays(today, 7)) return "this_week";
  return "later";
}

/** Suggested due date when dropping a card into a due-date column. */
export function dueDateForBucket(
  bucket: Exclude<DueBucketId, "done">,
  today = startOfToday(),
): string | null {
  switch (bucket) {
    case "overdue":
      return toDateInput(addDays(today, -1));
    case "today":
      return toDateInput(today);
    case "this_week":
      return toDateInput(addDays(today, 3));
    case "later":
      return toDateInput(addDays(today, 14));
    case "no_date":
      return null;
  }
}

const BUCKET_ORDER: DueBucketId[] = [
  "overdue",
  "today",
  "this_week",
  "later",
  "no_date",
  "done",
];

const BUCKET_LABELS: Record<DueBucketId, string> = {
  overdue: "Overdue",
  today: "Today",
  this_week: "This week",
  later: "Later",
  no_date: "No due date",
  done: "Done",
};

export function bucketTasks(
  tasks: TaskRow[],
  options: { includeDone?: boolean } = {},
): DueBucket[] {
  const includeDone = options.includeDone ?? false;
  const map = new Map<DueBucketId, TaskRow[]>();
  for (const id of BUCKET_ORDER) map.set(id, []);

  for (const t of tasks) {
    const id = classifyDueBucket(t);
    if (id === "done" && !includeDone) continue;
    map.get(id)!.push(t);
  }

  return BUCKET_ORDER.filter((id) => id !== "done" || includeDone).map((id) => ({
    id,
    label: BUCKET_LABELS[id],
    tasks: map.get(id) ?? [],
  }));
}
