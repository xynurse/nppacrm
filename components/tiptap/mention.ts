"use client";

import Mention from "@tiptap/extension-mention";
import { listMentionUsers, type MentionUser } from "@/lib/actions/mentions";
import { createSuggestionRenderer } from "./suggestion-popup";

/**
 * `@` mentions. The node stores `{ id, label }` where `id` is the user id —
 * Chunk 20 resolves notifications from the id, so it must survive a display-name
 * change. The plain-text mirror (see `serialize.ts`) emits `@label`.
 *
 * Users are fetched once per page and filtered client-side; the team is small
 * enough that a per-keystroke round trip would be wasteful.
 */

let cache: Promise<MentionUser[]> | null = null;
function loadUsers(): Promise<MentionUser[]> {
  if (!cache) cache = listMentionUsers().catch(() => []);
  return cache;
}

export const MentionExtension = Mention.configure({
  HTMLAttributes: {
    class:
      "rounded bg-brand-50 px-1 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  },
  renderText({ node }) {
    return `@${node.attrs.label ?? node.attrs.id}`;
  },
  suggestion: {
    char: "@",
    items: async ({ query }) => {
      const all = await loadUsers();
      const q = query.toLowerCase();
      return all
        .filter((u) => u.label.toLowerCase().includes(q))
        .slice(0, 8);
    },
    render: createSuggestionRenderer<MentionUser>((u) => ({
      key: u.id,
      label: u.label,
    })),
  },
});
