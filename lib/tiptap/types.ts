/**
 * Minimal structural types for TipTap/ProseMirror JSON documents.
 *
 * Deliberately hand-rolled rather than re-exported from `@tiptap/core` so the
 * DB schema, server actions, and the read-only renderer can all describe rich
 * documents without pulling the editor runtime into their bundles.
 */

export type RichMark = {
  type: string;
  attrs?: Record<string, unknown> | null;
};

export type RichNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown> | null;
  marks?: RichMark[] | null;
  content?: RichNode[] | null;
};

export type RichDoc = RichNode & { type: "doc" };
