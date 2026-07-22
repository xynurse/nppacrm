import { z } from "zod";
import type { RichDoc, RichNode } from "./types";

/**
 * Rich documents are stored in jsonb `*_doc` columns, but every one of them
 * keeps a plain-text mirror in the original `text` column. The mirror is what
 * AI prompts, CSV export, keyword search, and the `/sync-outreach` skill read,
 * so those paths never have to understand ProseMirror JSON.
 *
 * These helpers are the only place that conversion happens. They are pure and
 * DOM-free so they run identically on the server and in the browser.
 */

/** Serialized docs larger than this are rejected by `richDocSchema`. */
export const MAX_DOC_BYTES = 200_000;

/** Marks we know how to render. Anything else is ignored on read. */
export const KNOWN_MARKS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Structural check only — we do not validate against the full schema. */
export function isRichDoc(value: unknown): value is RichDoc {
  if (!isRecord(value)) return false;
  if (value.type !== "doc") return false;
  if (value.content !== undefined && value.content !== null) {
    if (!Array.isArray(value.content)) return false;
  }
  try {
    return JSON.stringify(value).length <= MAX_DOC_BYTES;
  } catch {
    // Circular or otherwise unserializable.
    return false;
  }
}

/** Zod validator for server actions. Uses `custom` so nested content survives
 * intact — `z.object()` would strip the unknown keys that make up the doc. */
export const richDocSchema = z.custom<RichDoc>(isRichDoc, {
  message: "Invalid rich text document",
});

/** Concatenate a run of inline nodes, turning hard breaks into newlines. */
function inlineToText(nodes: RichNode[] | null | undefined): string {
  if (!nodes) return "";
  let out = "";
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      out += "\n";
    } else if (typeof node.text === "string") {
      out += node.text;
    } else if (node.content) {
      out += inlineToText(node.content);
    }
  }
  return out;
}

/** Render one block-level node to a (possibly multi-line) chunk of text. */
function blockToChunk(node: RichNode): string {
  switch (node.type) {
    case "bulletList":
    case "orderedList": {
      const ordered = node.type === "orderedList";
      const items = node.content ?? [];
      return items
        .map((item, i) => {
          const marker = ordered ? `${i + 1}. ` : "- ";
          const body = (item.content ?? [])
            .map(blockToChunk)
            .filter(Boolean)
            .join("\n");
          // Continuation lines align under the marker.
          return body
            .split("\n")
            .map((line, idx) =>
              idx === 0 ? marker + line : " ".repeat(marker.length) + line,
            )
            .join("\n");
        })
        .join("\n");
    }
    case "blockquote": {
      return (node.content ?? [])
        .map(blockToChunk)
        .filter(Boolean)
        .join("\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }
    case "horizontalRule":
      return "---";
    case "codeBlock":
      return inlineToText(node.content);
    default:
      return inlineToText(node.content);
  }
}

/**
 * Doc → plain text. Top-level blocks are separated by a blank line so the
 * result reads the way the author laid it out.
 */
export function docToPlainText(doc: RichNode | null | undefined): string {
  if (!doc?.content) return "";
  return doc.content
    .map(blockToChunk)
    .filter((chunk) => chunk.length > 0)
    .join("\n\n")
    .trim();
}

/**
 * Plain text → doc. Used to lift the legacy `text` rows into the editor when
 * someone opens an interaction or task written before this feature shipped.
 *
 * Blank lines start a new paragraph; single newlines become hard breaks. That
 * mapping is the exact inverse of `docToPlainText` (which joins paragraphs
 * with a blank line), so lifting a legacy row and saving it back leaves the
 * plain-text mirror byte-identical instead of silently double-spacing it.
 */
export function plainTextToDoc(text: string | null | undefined): RichDoc {
  const normalized = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return { type: "doc", content: [{ type: "paragraph" }] };

  return {
    type: "doc",
    content: normalized.split(/\n{2,}/).map((block) => {
      const lines = block.split("\n");
      const content: RichNode[] = [];
      lines.forEach((line, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line });
      });
      return content.length
        ? { type: "paragraph", content }
        : { type: "paragraph" };
    }),
  };
}

/** True when the doc carries no rendered content worth storing. */
export function isEmptyDoc(doc: RichNode | null | undefined): boolean {
  if (!doc?.content?.length) return true;
  if (docToPlainText(doc).length > 0) return false;
  // Text is empty, but a rule or other atom still counts as content.
  return !doc.content.some((n) => n.type === "horizontalRule");
}

/**
 * Normalize an incoming doc for storage: returns the doc plus its plain-text
 * mirror, or nulls for both when the doc is effectively blank.
 */
export function prepareDocForStorage(
  doc: RichDoc | null | undefined,
): { doc: RichDoc | null; text: string | null } {
  if (!doc || isEmptyDoc(doc)) return { doc: null, text: null };
  const text = docToPlainText(doc);
  return { doc, text: text || null };
}

const SAFE_LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

/**
 * Only let known-safe protocols through to a rendered `href`. Docs are written
 * by authenticated users, but the renderer should not be the thing standing
 * between a pasted `javascript:` URL and a click.
 */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw, "https://example.invalid");
    return SAFE_LINK_PROTOCOLS.includes(url.protocol) ? raw : null;
  } catch {
    return null;
  }
}
