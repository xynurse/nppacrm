"use client";

import dynamic from "next/dynamic";

/**
 * Cell editors are only needed when a user opens a cell. Lazy-load them so
 * `/companies` First Load JS stays near the 160 kB target.
 */
export const TextEditor = dynamic(
  () => import("./text-cell").then((m) => m.TextEditor),
  { ssr: false },
);
export const LongTextEditor = dynamic(
  () => import("./text-cell").then((m) => m.LongTextEditor),
  { ssr: false },
);
export const CurrencyEditor = dynamic(
  () => import("./currency-cell").then((m) => m.CurrencyEditor),
  { ssr: false },
);
export const DateEditor = dynamic(
  () => import("./date-cell").then((m) => m.DateEditor),
  { ssr: false },
);
export const PersonEditor = dynamic(
  () => import("./person-cell").then((m) => m.PersonEditor),
  { ssr: false },
);
export const TierEditor = dynamic(
  () => import("./relation-cell").then((m) => m.TierEditor),
  { ssr: false },
);
export const SingleSelectEditor = dynamic(
  () => import("./single-select-cell").then((m) => m.SingleSelectEditor),
  { ssr: false },
);
export const UrlEditor = dynamic(
  () => import("./url-cell").then((m) => m.UrlEditor),
  { ssr: false },
);
