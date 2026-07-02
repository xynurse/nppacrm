import { CommandHint } from "@/components/command/command-hint";
import { DensityToggle } from "./density-toggle";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2">
        <CommandHint />
        <DensityToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
