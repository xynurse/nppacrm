import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import type { RichDoc } from "@/lib/tiptap/types";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  href?: string | null;
};

/** Best-effort insert — never throws into the caller’s mutation path. */
export async function createNotification(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      href: input.href ?? null,
    });
  } catch {
    // Table may not exist yet (deploy→migrate gap) or duplicate noise — ignore.
  }
}

export async function createNotifications(
  inputs: NotifyInput[],
): Promise<void> {
  await Promise.all(inputs.map((i) => createNotification(i)));
}

/** Walk a TipTap doc for mention nodes; returns unique user ids. */
export function mentionUserIdsFromDoc(doc: RichDoc | null | undefined): string[] {
  if (!doc) return [];
  const ids = new Set<string>();
  const walk = (node: { type?: string; attrs?: Record<string, unknown>; content?: unknown[] }) => {
    if (node.type === "mention") {
      const id = node.attrs?.id;
      if (typeof id === "string" && id.length > 0) ids.add(id);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (child && typeof child === "object") {
          walk(child as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] });
        }
      }
    }
  };
  walk(doc as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] });
  return [...ids];
}
