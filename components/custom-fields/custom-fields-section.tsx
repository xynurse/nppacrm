"use client";

import { useState } from "react";
import { updateCustomField } from "@/lib/actions/custom-fields";
import type {
  CustomFieldDefinition,
  CustomFieldType,
  FileFieldValue,
} from "@/lib/db/schema";
import { CurrencyEditor } from "@/components/cells/currency-cell";
import { DateEditor } from "@/components/cells/date-cell";
import { SingleSelectEditor } from "@/components/cells/single-select-cell";
import { LongTextEditor, TextEditor } from "@/components/cells/text-cell";
import { UrlDisplay, UrlEditor } from "@/components/cells/url-cell";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { FileFieldCell } from "./file-field-cell";

type CustomFieldValue = string | number | boolean | FileFieldValue | null;

type Props = {
  entityId: string;
  definitions: CustomFieldDefinition[];
  values: Record<string, unknown>;
};

export function CustomFieldsSection({
  entityId,
  definitions,
  values: initialValues,
}: Props) {
  const [values, setValues] =
    useState<Record<string, unknown>>(initialValues ?? {});

  if (definitions.length === 0) return null;

  const setValue = (key: string, value: CustomFieldValue) => {
    setValues((prev) => {
      const next = { ...prev };
      if (value === null || value === "") delete next[key];
      else next[key] = value;
      return next;
    });
  };

  return (
    <section className="mt-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Custom</h3>
      </header>
      <div className="space-y-2">
        {definitions.map((def) => (
          <div
            key={def.id}
            className="grid grid-cols-3 items-start gap-2 text-sm"
          >
            <dt className="pt-1 text-slate-500 dark:text-slate-400">
              {def.label}
              {def.isRequired ? (
                <span className="ml-0.5 text-red-500">*</span>
              ) : null}
            </dt>
            <dd className="col-span-2">
              <CustomFieldCell
                entityId={entityId}
                def={def}
                value={values[def.key] ?? null}
                onLocalChange={(v) => setValue(def.key, v)}
              />
            </dd>
          </div>
        ))}
      </div>
    </section>
  );
}

function CustomFieldCell({
  entityId,
  def,
  value,
  onLocalChange,
}: {
  entityId: string;
  def: CustomFieldDefinition;
  value: unknown;
  onLocalChange: (next: CustomFieldValue) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: CustomFieldValue) => {
    setEditing(false);
    setError(null);
    onLocalChange(next);
    const res = await updateCustomField({
      entityId,
      definitionId: def.id,
      value: next,
    });
    if (!res.ok) {
      setError(res.error);
      onLocalChange(value as CustomFieldValue);
    }
  };

  if (def.fieldType === "checkbox") {
    return (
      <div className="px-1 py-0.5">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={value === true}
          onChange={(e) => save(e.target.checked)}
        />
        {error ? (
          <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
    );
  }

  if (def.fieldType === "file") {
    return (
      <FileFieldCell
        entityId={entityId}
        definitionId={def.id}
        value={(value as FileFieldValue | null) ?? null}
        onLocalChange={(v) => onLocalChange(v)}
      />
    );
  }

  return (
    <div
      className={cn(
        "group rounded px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800",
        !editing && "cursor-text",
      )}
      onClick={() => !editing && setEditing(true)}
      onKeyDown={(e) => {
        if (!editing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setEditing(true);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {editing ? (
        <Editor
          fieldType={def.fieldType}
          options={def.config.options ?? []}
          value={value}
          onSave={save}
          onCancel={() => {
            setEditing(false);
            setError(null);
          }}
        />
      ) : (
        <Display
          fieldType={def.fieldType}
          options={def.config.options ?? []}
          value={value}
        />
      )}
      {error ? (
        <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Display({
  fieldType,
  options,
  value,
}: {
  fieldType: CustomFieldType;
  options: Array<{ value: string; label: string }>;
  value: unknown;
}) {
  if (value === null || value === undefined || value === "") {
    return (
      <span className="italic text-slate-400 dark:text-slate-500">
        Click to set
      </span>
    );
  }
  switch (fieldType) {
    case "currency":
      return (
        <span className="tabular-nums">
          {formatCurrency(value as string | number)}
        </span>
      );
    case "number":
      return <span className="tabular-nums">{String(value)}</span>;
    case "date":
      return <span>{formatDate(value as string)}</span>;
    case "url":
      return <UrlDisplay value={String(value)} />;
    case "longText":
      return (
        <span className="whitespace-pre-wrap">{String(value)}</span>
      );
    case "singleSelect": {
      const opt = options.find((o) => o.value === value);
      return <span>{opt?.label ?? String(value)}</span>;
    }
    default:
      return <span>{String(value)}</span>;
  }
}

function Editor({
  fieldType,
  options,
  value,
  onSave,
  onCancel,
}: {
  fieldType: CustomFieldType;
  options: Array<{ value: string; label: string }>;
  value: unknown;
  onSave: (next: CustomFieldValue) => void;
  onCancel: () => void;
}) {
  switch (fieldType) {
    case "text":
      return (
        <TextEditor
          value={(value as string | null) ?? null}
          onSave={(v) => onSave(v)}
          onCancel={onCancel}
          autoFocus
        />
      );
    case "longText":
      return (
        <LongTextEditor
          value={(value as string | null) ?? null}
          onSave={(v) => onSave(v)}
          onCancel={onCancel}
          autoFocus
        />
      );
    case "url":
      return (
        <UrlEditor
          value={(value as string | null) ?? null}
          onSave={(v) => onSave(v)}
          onCancel={onCancel}
          autoFocus
        />
      );
    case "number":
      return (
        <NumberEditor
          value={(value as string | number | null) ?? null}
          onSave={(v) => onSave(v)}
          onCancel={onCancel}
        />
      );
    case "currency":
      return (
        <CurrencyEditor
          value={
            value === null || value === undefined ? null : String(value)
          }
          onSave={(v) => onSave(v)}
          onCancel={onCancel}
          autoFocus
        />
      );
    case "date": {
      const d = value
        ? new Date(typeof value === "string" ? value : String(value))
        : null;
      return (
        <DateEditor
          value={d && !Number.isNaN(d.getTime()) ? d : null}
          onSave={(v) => onSave(v ? v.toISOString() : null)}
          onCancel={onCancel}
          autoFocus
        />
      );
    }
    case "singleSelect":
      return (
        <SingleSelectEditor
          value={(value as string | null) ?? null}
          onSave={(v) => onSave(v)}
          onCancel={onCancel}
          autoFocus
          allowClear
          options={options}
        />
      );
    default:
      return null;
  }
}

function NumberEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string | number | null;
  onSave: (next: string | null) => void;
  onCancel: () => void;
}) {
  return (
    <input
      type="number"
      autoFocus
      defaultValue={value === null || value === undefined ? "" : String(value)}
      className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900"
      onBlur={(e) => {
        const v = e.currentTarget.value.trim();
        onSave(v === "" ? null : v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        } else if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}
