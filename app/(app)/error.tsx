"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App segment error:", error);
  }, [error]);

  const omittedInProd =
    typeof error.message === "string" &&
    error.message.includes("omitted in production builds");

  return (
    <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
      <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
        Something went wrong.
      </h2>
      <p className="text-sm text-red-800 dark:text-red-200">
        {error.message || "An unexpected error occurred."}
      </p>
      {omittedInProd ? (
        <p className="text-sm text-red-800 dark:text-red-200">
          Check Vercel → Project → Logs for this request. Common causes: bad
          optional env values (<code className="font-mono">CRON_SECRET</code>{" "}
          must be ≥16 chars;{" "}
          <code className="font-mono">AI_DAILY_SPEND_CAP_USD</code> must be a
          number) or a database/query failure after deploy.
        </p>
      ) : null}
      {error.digest ? (
        <p className="font-mono text-xs text-red-700 dark:text-red-300">
          digest: {error.digest}
        </p>
      ) : null}
      <div>
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
