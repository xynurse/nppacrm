import { CommandHint } from "@/components/command/command-hint";
import { DensityToggle } from "./density-toggle";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-end border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-2">
        <CommandHint />
        <DensityToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
