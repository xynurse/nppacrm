// Client-safe upload limits (no env access). Server-side checks live in lib/blob.ts.

/** Every client upload goes under this prefix; /api/upload rejects others. */
export const UPLOAD_PREFIX = "crm/";

/** Matches the prospectus picker's existing 50 MB client-side limit. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
