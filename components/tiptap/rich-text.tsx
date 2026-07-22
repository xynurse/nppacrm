import { Fragment } from "react";
import { docToPlainText, safeHref } from "@/lib/tiptap/serialize";
import type { RichMark, RichNode } from "@/lib/tiptap/types";
import { cn } from "@/lib/cn";

/**
 * Read-only renderer for stored rich documents.
 *
 * Deliberately a plain recursive React renderer rather than a TipTap editor in
 * `editable: false` mode: activity feeds and task lists render many docs at
 * once, and `/companies` is already over its bundle budget. Reading costs no
 * client JS at all; only the editor itself is lazily loaded.
 */

function markWrap(marks: RichMark[] | null | undefined, node: React.ReactNode) {
  if (!marks?.length) return node;
  return marks.reduce<React.ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "underline":
        return <u>{acc}</u>;
      case "strike":
        return <s>{acc}</s>;
      case "code":
        return (
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-zinc-800">
            {acc}
          </code>
        );
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) return acc;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
          >
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, node);
}

function renderNodes(nodes: RichNode[] | null | undefined): React.ReactNode {
  if (!nodes?.length) return null;
  return nodes.map((node, i) => (
    <Fragment key={i}>{renderNode(node)}</Fragment>
  ));
}

function renderNode(node: RichNode): React.ReactNode {
  if (typeof node.text === "string") {
    return markWrap(node.marks, node.text);
  }

  switch (node.type) {
    case "paragraph":
      return <p>{renderNodes(node.content)}</p>;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const cls =
        level <= 1
          ? "text-base font-semibold"
          : level === 2
            ? "text-sm font-semibold"
            : "text-sm font-medium";
      const Tag = (level <= 1 ? "h3" : level === 2 ? "h4" : "h5") as "h3";
      return <Tag className={cls}>{renderNodes(node.content)}</Tag>;
    }
    case "bulletList":
      return (
        <ul className="list-disc space-y-0.5 pl-5">
          {renderNodes(node.content)}
        </ul>
      );
    case "orderedList":
      return (
        <ol className="list-decimal space-y-0.5 pl-5">
          {renderNodes(node.content)}
        </ol>
      );
    case "listItem":
      return <li>{renderNodes(node.content)}</li>;
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-600 dark:border-slate-600 dark:text-slate-300">
          {renderNodes(node.content)}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre className="overflow-x-auto rounded-md bg-slate-100 p-2 font-mono text-xs dark:bg-zinc-800">
          <code>{renderNodes(node.content)}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr className="border-slate-200 dark:border-slate-700" />;
    case "hardBreak":
      return <br />;
    default:
      return renderNodes(node.content);
  }
}

/**
 * Renders `doc` when present, otherwise falls back to the plain-text mirror.
 * The fallback is what keeps every pre-TipTap row readable.
 */
export function RichText({
  doc,
  fallback,
  className,
}: {
  doc: RichNode | null | undefined;
  /** Plain-text value from the legacy column, for rows with no doc yet. */
  fallback?: string | null;
  className?: string;
}) {
  const hasDoc = !!doc?.content?.length && docToPlainText(doc).length > 0;

  if (!hasDoc) {
    if (!fallback) return null;
    return (
      <div className={cn("whitespace-pre-wrap", className)}>{fallback}</div>
    );
  }

  return (
    <div className={cn("space-y-1.5 [&_p:empty]:h-3", className)}>
      {renderNodes(doc?.content)}
    </div>
  );
}
