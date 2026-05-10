"use client";

import { Bookmark, ChevronDown, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createSavedView,
  deleteSavedView,
  updateSavedView,
} from "@/lib/actions/saved-views";
import type { SavedView } from "@/lib/db/schema";
import type { FilterAst, SortSpec } from "@/lib/views/types";

type Props = {
  eventId: string;
  views: SavedView[];
  activeViewId: string | null;
  filter: FilterAst;
  sort: SortSpec;
  isAdmin: boolean;
  isDirty: boolean;
  onSelectView: (view: SavedView | null) => void;
  onSavedNew: (id: string) => void;
};

export function ViewSwitcher({
  eventId,
  views,
  activeViewId,
  filter,
  sort,
  isAdmin,
  isDirty,
  onSelectView,
  onSavedNew,
}: Props) {
  const [open, setOpen] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSavingNew(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const active = views.find((v) => v.id === activeViewId) ?? null;
  const activeLabel = active ? active.name : "All prospects";

  const handleSaveNew = () => {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createSavedView({
        eventId,
        name: name.trim(),
        isShared: shared,
        filter,
        sort,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavingNew(false);
      setName("");
      setShared(false);
      onSavedNew(res.id);
    });
  };

  const handleUpdate = () => {
    if (!active) return;
    setError(null);
    startTransition(async () => {
      const res = await updateSavedView({
        id: active.id,
        eventId,
        name: active.name,
        isShared: active.isShared,
        filter,
        sort,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  };

  const handleDelete = (view: SavedView) => {
    if (!confirm(`Delete view "${view.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteSavedView({ id: view.id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (activeViewId === view.id) onSelectView(null);
    });
  };

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="h-8 gap-1.5 text-xs"
      >
        <Bookmark className="h-3.5 w-3.5" />
        {activeLabel}
        {isDirty ? (
          <span className="text-amber-600 dark:text-amber-400">•</span>
        ) : null}
        <ChevronDown className="h-3 w-3" />
      </Button>

      {active && isDirty ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleUpdate}
          disabled={pending}
          className="h-8 gap-1 text-xs text-slate-600 dark:text-slate-300"
        >
          <Save className="h-3 w-3" />
          {pending ? "Saving…" : "Save changes"}
        </Button>
      ) : null}

      {!active && (filter.conditions.length > 0 || sort.length > 0) ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSavingNew(true);
            setOpen(true);
          }}
          className="h-8 gap-1 text-xs text-slate-600 dark:text-slate-300"
        >
          <Save className="h-3 w-3" />
          Save view
        </Button>
      ) : null}

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 space-y-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              onSelectView(null);
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
              !activeViewId ? "font-medium" : ""
            }`}
          >
            <span>All prospects</span>
          </button>
          {views.length > 0 ? (
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          ) : null}
          {views.map((v) => {
            const isActive = v.id === activeViewId;
            return (
              <div
                key={v.id}
                className={`group flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  isActive ? "bg-slate-50 dark:bg-slate-800/60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectView(v);
                    setOpen(false);
                  }}
                  className="flex-1 text-left"
                >
                  <span className={isActive ? "font-medium" : ""}>{v.name}</span>
                  {v.isShared ? (
                    <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                      shared
                    </span>
                  ) : null}
                </button>
                {(isAdmin || !v.isShared) ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(v)}
                    aria-label="Delete view"
                    className="rounded p-1 text-slate-400 opacity-0 hover:bg-slate-200 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-slate-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            );
          })}

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          {savingNew ? (
            <div className="space-y-1.5 p-1">
              <Input
                autoFocus
                className="h-7 text-xs"
                placeholder="View name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNew();
                  if (e.key === "Escape") setSavingNew(false);
                }}
              />
              {isAdmin ? (
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={shared}
                    onChange={(e) => setShared(e.target.checked)}
                  />
                  Shared with team
                </label>
              ) : null}
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSavingNew(false)}
                  className="h-6 px-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNew}
                  disabled={pending || !name.trim()}
                  className="h-6 px-2 text-xs"
                >
                  {pending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSavingNew(true)}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Save className="h-3.5 w-3.5" />
              Save current as new view
            </button>
          )}

          {error ? (
            <p className="px-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
