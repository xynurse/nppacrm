/** Extract a bare hostname from a company website URL for favicon lookups. */
export function domainFromWebsite(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const raw = website.trim();
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

/** Initials for avatar fallback (1–2 chars). */
export function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Favicon URL for a domain (Google's public favicon service). */
export function faviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}
