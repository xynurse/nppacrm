"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Drive `?record=` without a full App Router navigation so the companies /
 * pipeline RSC payload (table rows) is not re-fetched on every open/close.
 *
 * Uses `history.pushState` for in-page changes; syncs from Next searchParams
 * when a real navigation happens (filters, views, hard load).
 */
export function useShallowRecord(initialRecordId: string | null = null) {
  const searchParams = useSearchParams();
  const [recordId, setRecordId] = useState<string | null>(
    () => initialRecordId ?? searchParams.get("record"),
  );

  useEffect(() => {
    setRecordId(searchParams.get("record"));
  }, [searchParams]);

  useEffect(() => {
    function onPop() {
      const sp = new URLSearchParams(window.location.search);
      setRecordId(sp.get("record"));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setRecord = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("record", id);
    else url.searchParams.delete("record");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.pushState(window.history.state, "", next);
    setRecordId(id);
  }, []);

  return { recordId, setRecord } as const;
}
