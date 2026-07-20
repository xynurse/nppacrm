"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createFieldDefinition,
  deleteFieldDefinition,
} from "@/lib/actions/custom-fields";
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldDefinition,
  type CustomFieldType,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  longText: "Long text",
  number: "Number",
  currency: "Currency",
  date: "Date",
  url: "URL",
  checkbox: "Checkbox",
  singleSelect: "Single select",
  file: "File",
};

type Props = {
  eventId: string;
  definitions: CustomFieldDefinition[];
};

export function FieldsManager({ eventId, definitions }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = (def: CustomFieldDefinition) => {
    if (
      !confirm(
        `Delete field "${def.label}"? Stored values on prospects remain in the database but will no longer be shown.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteFieldDefinition({ id: def.id });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Required</th>
              <th className="px-3 py-2 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {definitions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No custom fields yet.
                </td>
              </tr>
            ) : (
              definitions.map((d) => (
                <tr key={d.id} className="h-10">
                  <td className="px-3">{d.label}</td>
                  <td className="px-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {d.key}
                  </td>
                  <td className="px-3 text-slate-600 dark:text-slate-300">
                    {TYPE_LABELS[d.fieldType] ?? d.fieldType}
                  </td>
                  <td className="px-3 text-slate-500">
                    {d.isRequired ? "Yes" : "—"}
                  </td>
                  <td className="px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
                      disabled={pending}
                      aria-label="Delete field"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {adding ? (
        <AddFieldForm
          eventId={eventId}
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setAdding(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add field
        </Button>
      )}
    </div>
  );
}

function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]/, "f$&")
    .slice(0, 40);
}

function AddFieldForm({
  eventId,
  onClose,
  onCreated,
}: {
  eventId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [isRequired, setIsRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const finalKey = key || slugifyKey(label);
    const options =
      fieldType === "singleSelect"
        ? optionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => ({ value: slugifyKey(s) || s, label: s }))
        : undefined;
    startTransition(async () => {
      const res = await createFieldDefinition({
        eventId,
        entityType: "eventCompany",
        key: finalKey,
        label,
        fieldType,
        options,
        isRequired,
        displayOrder: 0,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated();
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-zinc-900"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cf-label">Label</Label>
          <Input
            id="cf-label"
            autoFocus
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!keyEdited) setKey(slugifyKey(e.target.value));
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-key">Key</Label>
          <Input
            id="cf-key"
            value={key}
            onChange={(e) => {
              setKey(e.target.value.toLowerCase());
              setKeyEdited(true);
            }}
            className="font-mono"
            placeholder="auto"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-type">Type</Label>
          <Select
            id="cf-type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
          >
            {CUSTOM_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />
          Required
        </label>
      </div>

      {fieldType === "singleSelect" ? (
        <div className="space-y-1.5">
          <Label htmlFor="cf-options">Options (one per line)</Label>
          <textarea
            id="cf-options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-zinc-900"
            placeholder={"Option A\nOption B"}
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={pending || !label.trim() || (key.length > 0 && key.length < 2)}
        >
          {pending ? "Creating…" : "Create field"}
        </Button>
      </div>
    </form>
  );
}
