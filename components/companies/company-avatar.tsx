"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  companyInitials,
  domainFromWebsite,
  faviconUrl,
} from "@/lib/company-logo";

const SIZE = {
  xs: "h-5 w-5 text-[9px] rounded",
  sm: "h-6 w-6 text-[10px] rounded-md",
  md: "h-8 w-8 text-xs rounded-lg",
  lg: "h-10 w-10 text-sm rounded-xl",
} as const;

type Size = keyof typeof SIZE;

/**
 * Company mark — stored logoUrl, then domain favicon, then initials.
 * Keeps tables / kanban / drawer visually anchored without requiring uploads.
 */
export function CompanyAvatar({
  name,
  website,
  logoUrl,
  size = "sm",
  className,
}: {
  name: string;
  website?: string | null;
  logoUrl?: string | null;
  size?: Size;
  className?: string;
}) {
  const domain = domainFromWebsite(website);
  const remote = logoUrl?.trim() || (domain ? faviconUrl(domain, 128) : null);
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(remote) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        "bg-zinc-100 font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200/80",
        "dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700/80",
        SIZE[size],
        className,
      )}
      title={name}
      aria-hidden
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote favicons; next/image overkill
        <img
          src={remote!}
          alt=""
          className="h-full w-full object-contain p-0.5"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="leading-none tracking-tight">
          {companyInitials(name)}
        </span>
      )}
    </span>
  );
}
