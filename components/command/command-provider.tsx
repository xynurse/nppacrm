"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "./command-palette";
import { ShortcutsCheatSheet } from "./shortcuts-cheat-sheet";
import { NlUpdateDialog } from "@/components/ai/nl-update-dialog";

type Props = {
  eventId: string | null;
  isAdmin: boolean;
};

const NAV_CHORD: Record<string, string> = {
  d: "/",
  c: "/companies",
  p: "/pipeline",
  t: "/tasks",
  r: "/reports",
};

export function CommandProvider({ eventId, isAdmin }: Props) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [nlOpen, setNlOpen] = useState(false);
  const chordRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      if (isEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setCheatOpen((v) => !v);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        if (cheatOpen) setCheatOpen(false);
        return;
      }

      const now = Date.now();
      const prev = chordRef.current;
      if (prev && prev.key === "g" && now - prev.at < 1500) {
        chordRef.current = null;
        const target = NAV_CHORD[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        return;
      }

      if (e.key === "g") {
        chordRef.current = { key: "g", at: now };
      } else {
        chordRef.current = null;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, paletteOpen, cheatOpen]);

  return (
    <>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        eventId={eventId}
        isAdmin={isAdmin}
        onAiQuickUpdate={() => setNlOpen(true)}
      />
      <ShortcutsCheatSheet open={cheatOpen} onClose={() => setCheatOpen(false)} />
      <NlUpdateDialog open={nlOpen} onOpenChange={setNlOpen} />
    </>
  );
}
