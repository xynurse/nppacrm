"use client";

import {
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteInteraction,
  logInteraction,
} from "@/lib/actions/interactions";
import { LazyRichEditor } from "@/components/tiptap/rich-editor-lazy";
import { RichText } from "@/components/tiptap/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InteractionType } from "@/lib/db/schema";
import type { InteractionRow } from "@/lib/db/queries/interactions";
import { isEmptyDoc } from "@/lib/tiptap/serialize";
import type { RichDoc } from "@/lib/tiptap/types";
import { formatRelativeDate } from "@/lib/format";

const TYPE_META: Record<
  InteractionType,
  { label: string; Icon: typeof Mail; tone: string }
> = {
  email: { label: "Email", Icon: Mail, tone: "text-blue-600" },
  call: { label: "Call", Icon: Phone, tone: "text-emerald-600" },
  meeting: { label: "Meeting", Icon: Users, tone: "text-purple-600" },
  note: { label: "Note", Icon: StickyNote, tone: "text-amber-600" },
  linkedin: { label: "LinkedIn", Icon: Users, tone: "text-sky-600" },
  other: { label: "Other", Icon: MessageSquare, tone: "text-slate-500" },
};

export function ActivityTab({
  eventCompanyId,
  interactions,
  currentUserId,
  isAdmin,
}: {
  eventCompanyId: string;
  interactions: InteractionRow[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [composing, setComposing] = useState<InteractionType | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_META) as InteractionType[]).map((t) => {
          const meta = TYPE_META[t];
          const Icon = meta.Icon;
          return (
            <Button
              key={t}
              size="sm"
              variant={composing === t ? "default" : "outline"}
              onClick={() => setComposing(composing === t ? null : t)}
            >
              <Icon className={`h-3.5 w-3.5 ${meta.tone}`} />
              {meta.label}
            </Button>
          );
        })}
      </div>

      {composing ? (
        <QuickLogForm
          type={composing}
          pending={pending}
          onSubmit={(values) =>
            startTransition(async () => {
              const result = await logInteraction({
                eventCompanyId,
                type: composing,
                ...values,
              });
              if (!result.ok) return;
              setComposing(null);
              router.refresh();
            })
          }
          onCancel={() => setComposing(null)}
        />
      ) : null}

      {interactions.length === 0 ? (
        <p className="text-xs italic text-slate-500 dark:text-slate-400">
          No activity yet. Use the buttons above to log the first one.
        </p>
      ) : (
        <ul className="space-y-3">
          {interactions.map((i) => {
            const meta = TYPE_META[i.type];
            const Icon = meta.Icon;
            const canDelete = isAdmin || i.userId === currentUserId;
            return (
              <li
                key={i.id}
                className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-zinc-900"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium">
                      {i.subject ?? meta.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatRelativeDate(i.occurredAt)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {meta.label} · {i.userName ?? "system"}
                    {i.contactName ? ` · with ${i.contactName}` : ""}
                  </div>
                  {i.bodyDoc || i.body ? (
                    <RichText
                      doc={i.bodyDoc}
                      fallback={i.body}
                      className="mt-1 text-slate-700 dark:text-slate-200"
                    />
                  ) : null}
                </div>
                {canDelete ? (
                  <button
                    type="button"
                    className="self-start rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-zinc-800"
                    title="Delete"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm("Delete this entry?")) return;
                      startTransition(async () => {
                        await deleteInteraction({ id: i.id });
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuickLogForm({
  type,
  onSubmit,
  onCancel,
  pending,
}: {
  type: InteractionType;
  onSubmit: (values: {
    subject: string | null;
    bodyDoc: RichDoc | null;
  }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [subject, setSubject] = useState("");
  const [doc, setDoc] = useState<RichDoc | null>(null);

  const submit = () =>
    onSubmit({
      subject: subject.trim() || null,
      bodyDoc: doc && !isEmptyDoc(doc) ? doc : null,
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-zinc-900"
    >
      <Input
        className="h-8"
        placeholder={`${TYPE_META[type].label} subject (optional)`}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        autoFocus
      />
      <LazyRichEditor
        placeholder="What happened? (Cmd+Enter to log)"
        onChange={setDoc}
        onSubmit={submit}
        minHeightClass="min-h-[4.5rem]"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Logging…" : "Log"}
        </Button>
      </div>
    </form>
  );
}
