/**
 * Extract plain text from a PDF buffer. Uses pdf-parse (server-only).
 *
 * Note: pdf-parse v2 ships its own loader that does NOT require Node's
 * `fs` shim, so it works under Vercel Functions. Don't import this from
 * client code.
 */
export async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  pages: number;
}> {
  const mod = (await import("pdf-parse")) as unknown as {
    default?: (b: Buffer) => Promise<{ text: string; numpages: number }>;
  } & ((b: Buffer) => Promise<{ text: string; numpages: number }>);
  const parser = (mod as unknown as { default?: typeof mod }).default ?? mod;
  // pdf-parse 2.x exports a callable; older versions expose .default.
  const result = await (parser as (b: Buffer) => Promise<{
    text: string;
    numpages: number;
  }>)(buffer);
  return {
    text: result.text ?? "",
    pages: result.numpages ?? 0,
  };
}

/** Cheap token estimator (~4 chars/token for English). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
