import { env } from "@/lib/env";

export { MAX_UPLOAD_BYTES, UPLOAD_PREFIX } from "@/lib/blob-limits";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * The store id is embedded in the read-write token
 * (`vercel_blob_rw_<storeId>_<secret>`), which lets us pin URLs to *our*
 * store rather than any Vercel Blob store.
 */
function ownBlobHost(): string | null {
  const storeId = env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  return storeId ? `${storeId.toLowerCase()}${BLOB_HOST_SUFFIX}` : null;
}

/** True only for https URLs served from this project's Blob store. */
export function isOwnBlobUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  const own = ownBlobHost();
  return own ? host === own : host.endsWith(BLOB_HOST_SUFFIX);
}
