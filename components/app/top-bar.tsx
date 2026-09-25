import { CommandHint } from "@/components/command/command-hint";
import { DensityToggle } from "./density-toggle";
import { PageTitle } from "./page-title";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/75 px-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/75">
      <div className="min-w-0">
        <PageTitle />
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <CommandHint />
        <DensityToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
