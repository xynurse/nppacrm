"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatRelativeDate } from "@/lib/format";
import {
  confirmEventCompany,
  moveEventCompanyStatus,
} from "@/lib/actions/pipeline";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import {
  PROSPECT_STATUS_VALUES,
  type ProspectStatus,
} from "@/lib/db/schema";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import {
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "@/components/companies/status-badge";
import { PriorityDot } from "@/components/companies/priority-dot";
import type { TierOption } from "@/components/cells/types";
import { ConfirmModal } from "./confirm-modal";

const COLUMN_ORDER: ProspectStatus[] = [...PROSPECT_STATUS_VALUES];

type Props = {
  rows: EventCompanyRow[];
  tiers: TierOption[];
};

export function KanbanBoard({ rows: initialRows, tiers }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [confirmFor, setConfirmFor] = useState<EventCompanyRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const grouped = useMemo(() => {
    const map = new Map<ProspectStatus, EventCompanyRow[]>();
    for (const s of COLUMN_ORDER) map.set(s, []);
    for (const r of rows) {
      const list = map.get(r.status as ProspectStatus);
      if (list) list.push(r);
    }
    return map;
  }, [rows]);

  const totals = useMemo(() => {
    const t = new Map<ProspectStatus, { count: number; amount: number }>();
    for (const s of COLUMN_ORDER) t.set(s, { count: 0, amount: 0 });
    for (const r of rows) {
      const entry = t.get(r.status as ProspectStatus);
      if (!entry) continue;
      entry.count += 1;
      const v = r.confirmedAmount ?? r.proposedAmount;
      if (v) entry.amount += Number(v);
    }
    return t;
  }, [rows]);

  const draggingRow = draggingId
    ? rows.find((r) => r.id === draggingId)
    : null;

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const target = overId.startsWith("col:")
      ? (overId.slice(4) as ProspectStatus)
      : null;
    if (!target) return;
    const row = rows.find((r) => r.id === id);
    if (!row || row.status === target) return;

    if (target === "confirmed") {
      setConfirmFor(row);
      return;
    }

    const prevStatus = row.status;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: target } : r)),
    );

    startTransition(async () => {
      const res = await moveEventCompanyStatus({ id, status: target });
      if (!res.ok) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: prevStatus } : r)),
        );
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  const handleConfirmed = (input: {
    confirmedAmount: string;
    confirmedTierId: string;
  }) => {
    if (!confirmFor) return;
    const id = confirmFor.id;
    const prevStatus = confirmFor.status;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "confirmed" as ProspectStatus,
              confirmedAmount: input.confirmedAmount,
              confirmedTierId: input.confirmedTierId,
            }
          : r,
      ),
    );
    setConfirmFor(null);

    startTransition(async () => {
      const res = await confirmEventCompany({ id, ...input });
      if (!res.ok) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: prevStatus } : r)),
        );
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((status) => {
            const cards = grouped.get(status) ?? [];
            const total = totals.get(status) ?? { count: 0, amount: 0 };
            return (
              <Column
                key={status}
                status={status}
                cards={cards}
                count={total.count}
                amount={total.amount}
              />
            );
          })}
        </div>

        <DragOverlay>
          {draggingRow ? <Card row={draggingRow} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {confirmFor ? (
        <ConfirmModal
          row={confirmFor}
          tiers={tiers}
          onCancel={() => setConfirmFor(null)}
          onConfirm={handleConfirmed}
        />
      ) : null}
    </>
  );
}

function Column({
  status,
  cards,
  count,
  amount,
}: {
  status: ProspectStatus;
  cards: EventCompanyRow[];
  count: number;
  amount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/50 transition-[border-color,box-shadow] duration-150 dark:border-slate-800 dark:bg-slate-900/50",
        isOver &&
          "border-brand-400 shadow-[0_0_0_3px_var(--accent-tint)] dark:border-brand-500",
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {count}
          </span>
        </div>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {amount > 0 ? formatCurrency(amount) : ""}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {cards.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-2 py-4 text-center text-xs text-slate-400 dark:border-slate-700">
            Drop a card here
          </p>
        ) : (
          cards.map((row) => <DraggableCard key={row.id} row={row} />)
        )}
      </div>
    </div>
  );
}

function DraggableCard({ row }: { row: EventCompanyRow }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: row.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "transition-opacity duration-100",
        isDragging && "opacity-40",
      )}
    >
      <Card row={row} />
    </div>
  );
}

function Card({
  row,
  dragging,
}: {
  row: EventCompanyRow;
  dragging?: boolean;
}) {
  const amount = row.confirmedAmount ?? row.proposedAmount;
  const tierName = row.confirmedTierName ?? row.targetTierName;
  const tierColor = row.targetTierColor;
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-[var(--shadow-card)] transition-[box-shadow,border-color,transform] duration-150 ease-[var(--ease-out-soft)] hover:-translate-y-px hover:border-slate-300 hover:shadow-[var(--shadow-raised)] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
        dragging && "rotate-1 shadow-[var(--shadow-overlay)]",
      )}
    >
      <div className="flex items-start gap-1.5">
        <PriorityDot priority={row.priority} />
        <Link
          href={`/companies?record=${row.id}`}
          scroll={false}
          className="flex-1 font-medium text-slate-900 hover:underline dark:text-slate-100"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {row.companyName}
        </Link>
      </div>
      <div className="mt-1 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        {row.companyIndustry ? <p>{row.companyIndustry}</p> : null}
        <div className="flex items-center justify-between gap-1.5">
          {tierName ? (
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tierColor ?? "#94a3b8" }}
              />
              {tierName}
            </span>
          ) : (
            <span />
          )}
          {amount ? (
            <span className="tabular-nums text-slate-700 dark:text-slate-300">
              {formatCurrency(amount, row.currency)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-1">
          {row.ownerName ? (
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {row.ownerName}
            </span>
          ) : (
            <span />
          )}
          {row.lastContactedAt ? (
            <span
              className={cn(
                "shrink-0 tabular-nums",
                (() => {
                  const days =
                    (Date.now() - new Date(row.lastContactedAt).getTime()) /
                    86_400_000;
                  if (days >= 30) return "text-red-500 dark:text-red-400";
                  if (days >= 14) return "text-amber-500 dark:text-amber-400";
                  return "text-slate-400 dark:text-slate-500";
                })(),
              )}
              title={`Last contact: ${formatRelativeDate(row.lastContactedAt)}`}
            >
              {formatRelativeDate(row.lastContactedAt)}
            </span>
          ) : null}
        </div>
      </div>
      <span className="sr-only">Status: {PROSPECT_STATUS_LABELS[row.status]}</span>
    </div>
  );
}
