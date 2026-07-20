"use client";

import { Rows2, Rows3, Rows4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDensity, type Density } from "@/components/providers/density-provider";
import { cn } from "@/lib/cn";

const opts: { value: Density; Icon: typeof Rows2; label: string }[] = [
  { value: "compact", Icon: Rows4, label: "Compact" },
  { value: "comfy", Icon: Rows3, label: "Comfy" },
  { value: "spacious", Icon: Rows2, label: "Spacious" },
];

export function DensityToggle() {
  const { density, setDensity } = useDensity();
  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
      {opts.map(({ value, Icon, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="icon"
          title={label}
          className={cn(
            "h-7 w-7 rounded-sm",
            density === value &&
              "bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-slate-100",
          )}
          onClick={() => setDensity(value)}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
