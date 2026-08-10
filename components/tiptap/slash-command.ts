"use client";

import { Extension, type Editor, type Range } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import { createSuggestionRenderer } from "./suggestion-popup";

/**
 * `/` slash menu — inserts block-level nodes that already exist in StarterKit,
 * so the read-only renderer needs no new cases. Built on TipTap's Suggestion
 * plugin and rendered through the shared caret popup.
 */

type SlashItem = {
  key: string;
  title: string;
  hint?: string;
  run: (editor: Editor, range: Range) => void;
};

const ITEMS: SlashItem[] = [
  {
    key: "h1",
    title: "Heading 1",
    hint: "#",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setNode("heading", { level: 1 }).run(),
  },
  {
    key: "h2",
    title: "Heading 2",
    hint: "##",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run(),
  },
  {
    key: "h3",
    title: "Heading 3",
    hint: "###",
    run: (e, r) =>
      e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run(),
  },
  {
    key: "bullet",
    title: "Bullet list",
    hint: "-",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    key: "ordered",
    title: "Numbered list",
    hint: "1.",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    key: "quote",
    title: "Quote",
    hint: ">",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run(),
  },
  {
    key: "code",
    title: "Code block",
    hint: "```",
    run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run(),
  },
  {
    key: "divider",
    title: "Divider",
    hint: "---",
    run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
];

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: "/",
        pluginKey: new PluginKey("slashCommand"),
        // Only fire at the start of an empty-ish line, so a stray "/" mid-word
        // (URLs, "and/or") never pops the menu.
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const isStart = $from.parentOffset <= 1;
          return isStart && $from.parent.type.name === "paragraph";
        },
        command: ({ editor, range, props }) => props.run(editor, range),
        items: ({ query }) => {
          const q = query.toLowerCase();
          return ITEMS.filter((i) => i.title.toLowerCase().includes(q)).slice(
            0,
            8,
          );
        },
        render: createSuggestionRenderer<SlashItem>((i) => ({
          key: i.key,
          label: i.title,
          hint: i.hint,
        })),
      }),
    ];
  },
});
