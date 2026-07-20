import { cn } from "@/lib/cn";

/**
 * Brand mark — an ascending-pipeline glyph on an indigo tile.
 * Abstract and product-neutral (deliberately no medical/heartbeat cue).
 * Shared by the sidebar and the login screen so the mark stays in sync.
 */
export function LogoMark({
  className,
  glyphClassName,
}: {
  /** Sizing + radius for the tile (e.g. "h-8 w-8 rounded-[9px]"). */
  className?: string;
  /** Sizing for the inner glyph (e.g. "h-[18px] w-[18px]"). */
  glyphClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 ring-1 ring-inset ring-white/15",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className={glyphClassName} fill="none" aria-hidden>
        <rect x="4" y="13" width="4" height="7" rx="1.5" fill="#fff" fillOpacity="0.55" />
        <rect x="10" y="9" width="4" height="11" rx="1.5" fill="#fff" fillOpacity="0.8" />
        <rect x="16" y="4" width="4" height="16" rx="1.5" fill="#fff" />
      </svg>
    </div>
  );
}
