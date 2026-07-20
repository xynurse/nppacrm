"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-[88px]" />;
  }

  const opts: { value: "light" | "dark" | "system"; Icon: typeof Sun }[] = [
    { value: "light", Icon: Sun },
    { value: "dark", Icon: Moon },
    { value: "system", Icon: Monitor },
  ];

  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
      {opts.map(({ value, Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="icon"
          title={value}
          className={cn(
            "h-7 w-7 rounded-sm",
            theme === value &&
              "bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-slate-100",
          )}
          onClick={() => setTheme(value)}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
