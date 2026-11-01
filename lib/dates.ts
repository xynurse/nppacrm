/** Calendar-date helpers. Date-only values are stored at 12:00 UTC so they
 * still fall on the intended day in US timezones. */

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/u;

export const DEFAULT_TIME_ZONE = "America/Chicago";

/** True for a real calendar day, including an optional ISO time suffix.
 * Rejects impossible days such as 2026-13-45 and 2026-02-31. */
export function isRealCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

/** YYYY-MM-DD in `timeZone` (en-CA parts). Invalid zones fall back to Chicago. */
export function todayInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): string {
  const zone = timeZone.trim() || DEFAULT_TIME_ZONE;
  try {
    return formatYmd(now, zone);
  } catch {
    return formatYmd(now, DEFAULT_TIME_ZONE);
  }
}

/** Add calendar days to a YYYY-MM-DD string, ignoring clock time and DST. */
export function addCalendarDays(isoDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !isRealCalendarDate(isoDate)) {
    throw new Error(`Invalid date: ${isoDate}`);
  }
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date-only inputs become 12:00 UTC. Timestamps that are not UTC midnight
 * are left alone so a real time of day is not rewritten. */
export function dateOnlyToNoonUtc(value: string | Date): Date {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && isRealCalendarDate(value)) {
      return new Date(`${value}T12:00:00.000Z`);
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime()) && isUtcMidnight(parsed)) {
      return noonUtc(parsed);
    }
    return parsed;
  }
  if (Number.isNaN(value.getTime()) || !isUtcMidnight(value)) return value;
  return noonUtc(value);
}

function noonUtc(value: Date): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      12,
    ),
  );
}

function isUtcMidnight(value: Date): boolean {
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

function formatYmd(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error(`Could not format date in ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}
