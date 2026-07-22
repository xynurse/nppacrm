"use client";

import Placeholder from "@tiptap/extension-placeholder";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type UseEditorOptions,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { safeHref } from "@/lib/tiptap/serialize";
import type { RichDoc } from "@/lib/tiptap/types";
import { cn } from "@/lib/cn";

/**
 * Shared TipTap editor. Always reach for this through `rich-editor-lazy` so the
 * ProseMirror runtime stays out of the initial bundle.
 *
 * Uncontrolled by design: TipTap owns the document while it is focused, and the
 * parent receives every change via `onChange`. To reset the editor (e.g. after
 * submitting a log form), change its React `key` — that remounts it with fresh
 * `value`, which is cheaper and less bug-prone than diffing content back in.
 */

export type RichEditorProps = {
  value?: RichDoc | null;
  placeholder?: string;
  onChange?: (doc: RichDoc) => void;
  /** Fired on Cmd/Ctrl+Enter. */
  onSubmit?: () => void;
  autoFocus?: boolean;
  editable?: boolean;
  className?: string;
  minHeightClass?: string;
  toolbar?: boolean;
};

export function RichEditor({
  value,
  placeholder,
  onChange,
  onSubmit,
  autoFocus = false,
  editable = true,
  className,
  minHeightClass = "min-h-[5rem]",
  toolbar = true,
}: RichEditorProps) {
  // Callbacks live in refs: TipTap captures `editorProps` once at creation, so
  // reading them directly would pin the first render's closures.
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
  }, [onChange, onSubmit]);

  const editor = useEditor({
    // We only ever render this behind a client-side dynamic import, but Next
    // still complains about SSR hydration without it.
    immediatelyRender: false,
    editable,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write something…",
      }),
    ],
    // `RichDoc` is deliberately looser than TipTap's `JSONContent` (it tolerates
    // the nulls that come back out of jsonb), so the shapes need reconciling.
    content: (value ?? undefined) as UseEditorOptions["content"],
    onUpdate: ({ editor: e }) => {
      onChangeRef.current?.(e.getJSON() as RichDoc);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose-none focus:outline-none",
          "[&_p]:my-0 [&_p+p]:mt-2",
          "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_h1]:text-base [&_h1]:font-semibold",
          "[&_h2]:text-sm [&_h2]:font-semibold",
          "[&_h3]:text-sm [&_h3]:font-medium",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic dark:[&_blockquote]:border-slate-600",
          "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] dark:[&_code]:bg-zinc-800",
          "[&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-brand-400",
          minHeightClass,
        ),
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          if (onSubmitRef.current) {
            event.preventDefault();
            onSubmitRef.current();
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return <EditorSkeleton minHeightClass={minHeightClass} />;
  }

  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 bg-white text-sm transition-shadow focus-within:ring-2 focus-within:ring-brand-500/40 dark:border-slate-700 dark:bg-zinc-900 dark:text-slate-100",
        className,
      )}
    >
      {toolbar && editable ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} className="px-3 py-2" />
    </div>
  );
}

export function EditorSkeleton({
  minHeightClass = "min-h-[5rem]",
}: {
  minHeightClass?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-zinc-900",
        minHeightClass,
      )}
    />
  );
}

type EditorInstance = NonNullable<ReturnType<typeof useEditor>>;

function Toolbar({ editor }: { editor: EditorInstance }) {
  // Subscribes to editor transactions so the active states stay in sync
  // without re-rendering the whole editor on every keystroke.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
    }),
  });

  function toggleLink() {
    if (state.link) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const input = window.prompt("Link URL");
    if (!input) return;
    const href = safeHref(input.trim());
    if (!href) {
      window.alert("That link protocol isn't supported.");
      return;
    }
    editor.chain().focus().setLink({ href }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-1.5 py-1 dark:border-slate-700">
      <ToolbarButton
        label="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Link" active={state.link} onClick={toggleLink}>
        <Link2 className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700"
    />
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // Keep focus in the document so the command applies to the selection.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-zinc-800 dark:hover:text-slate-100",
        active &&
          "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
      )}
    >
      {children}
    </button>
  );
}
