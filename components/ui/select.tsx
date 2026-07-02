import * as React from "react";
import { cn } from "@/lib/cn";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 hover:border-slate-300 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
