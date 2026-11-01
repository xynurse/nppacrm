/** Shared CSV cell encoder. Prefixes a quote on formula-like strings so a
 * spreadsheet does not execute them. Real numbers, including negatives such
 * as -500, are left unchanged. */

const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const NUMERIC = /^-?\d+(\.\d+)?$/;

export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  const raw = String(value);
  const guarded =
    !NUMERIC.test(raw) && FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}
