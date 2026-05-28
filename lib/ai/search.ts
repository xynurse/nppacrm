import { env } from "@/lib/env";

/**
 * Valyu search response — typed against the public /v1/knowledge endpoint.
 * https://platform.valyu.network/docs/api/knowledge
 *
 * Kept minimal — we only need title, url, content snippets for grounding.
 */
export type SearchHit = {
  title: string;
  url: string;
  content: string;
  source?: string;
  publishedAt?: string;
};

export type SearchResult = {
  hits: SearchHit[];
  callCount: number;
};

export function isSearchConfigured(): boolean {
  return !!env.VALYU_API_KEY;
}

/**
 * Call Valyu's deepsearch endpoint and return normalized hits.
 * Network or API errors are caught and returned as empty hits so a single
 * search failure doesn't block the whole enrichment job — the model still
 * gets the prospectus + record as grounding, just no fresh web context.
 */
export async function valyuSearch(opts: {
  query: string;
  maxResults?: number;
  searchType?: "web" | "all";
}): Promise<SearchResult> {
  if (!env.VALYU_API_KEY) {
    return { hits: [], callCount: 0 };
  }

  const body = {
    query: opts.query,
    search_type: opts.searchType ?? "web",
    max_num_results: opts.maxResults ?? 5,
    response_length: "medium",
  };

  try {
    const res = await fetch("https://api.valyu.network/v1/deepsearch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.VALYU_API_KEY,
      },
      body: JSON.stringify(body),
      // Hard cap so a hung search doesn't tie up the function.
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return { hits: [], callCount: 1 };
    }

    const data = (await res.json()) as {
      success?: boolean;
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        source?: string;
        published_date?: string;
      }>;
    };

    if (!data.success) {
      return { hits: [], callCount: 1 };
    }

    const hits: SearchHit[] = (data.results ?? [])
      .filter((r) => r.url && r.title)
      .map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        content: (r.content ?? "").slice(0, 2000),
        source: r.source,
        publishedAt: r.published_date,
      }));

    return { hits, callCount: 1 };
  } catch {
    return { hits: [], callCount: 1 };
  }
}

/**
 * Compact a list of hits into a single context block to embed in the prompt.
 */
export function formatHitsForPrompt(hits: SearchHit[]): string {
  if (hits.length === 0) return "(no web context available)";
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] ${h.title}\nURL: ${h.url}\n${h.content.slice(0, 600)}\n`,
    )
    .join("\n");
}
