/** Build a `mailto:` URL. Some clients mishandle `+` for spaces, so encode
 * with `encodeURIComponent` instead of `URLSearchParams`. Caps total length so
 * Outlook/Gmail still open when the body is long — excess body is omitted. */

const MAX_MAILTO_LENGTH = 1800;

export function buildMailtoUrl(opts: {
  to?: string | null;
  subject?: string | null;
  body?: string | null;
}): { href: string; truncated: boolean } {
  const to = (opts.to ?? "").trim();
  const parts: string[] = [];
  if (opts.subject) parts.push(`subject=${encodeURIComponent(opts.subject)}`);

  let truncated = false;
  let body = opts.body ?? "";
  if (body) {
    const withFullBody = `mailto:${to}?${[...parts, `body=${encodeURIComponent(body)}`].join("&")}`;
    if (withFullBody.length > MAX_MAILTO_LENGTH) {
      truncated = true;
      // Keep as much body as fits under the cap.
      const base = `mailto:${to}?${parts.length ? `${parts.join("&")}&` : ""}body=`;
      const budget = Math.max(0, MAX_MAILTO_LENGTH - base.length - 40);
      while (
        body.length > 0 &&
        encodeURIComponent(body).length > budget
      ) {
        body = body.slice(0, Math.floor(body.length * 0.85));
      }
      if (body.length > 0) {
        body = `${body.trimEnd()}\n\n[…]`;
      }
    }
    if (body) parts.push(`body=${encodeURIComponent(body)}`);
  }

  const href = parts.length ? `mailto:${to}?${parts.join("&")}` : `mailto:${to}`;
  return { href, truncated };
}
