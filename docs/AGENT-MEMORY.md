# Agent memory — LPD Sponsor CRM

> **Token-efficient handoff.** Read this first in new chats. Do NOT re-read
> `SESSION-STATE.md` / `TODO.md` / `CHANGELOG.md` / the build prompt unless
> this file is missing the fact you need. Prefer targeted greps over full-file reads.

**Last updated:** 2026-11-03  
**Branch:** `cursor/chunk-5-performance-eed9` (Chunk 5 perf Pass 2) — merge to `main` after review.  
**Prior main:** `e525c53` — chunk 4 on main.  
**Prod:** `nppacrm.vercel.app` · Repo: `xynurse/nppacrm`

---

## What this is
Spreadsheet-first sponsorship CRM (Attio/Linear vibe) for Mayo Clinic NPPA LPD outreach.  
Stack: Next 15 · Neon · Drizzle · Auth.js · Tailwind/shadcn · TanStack Table · TipTap · pnpm.

## Design decisions (don't re-debate)
- Brand: **indigo on zinc**, Plus Jakarta Sans (not Inter). Status colors stay semantic.
- Rich text: additive `*_doc` jsonb + plain-text mirror (not convert columns).
- BOUNCED / DEFERRED = **tags**, not pipeline statuses.
- Mutations → Server Actions + `auditLog`. Soft deletes via `deletedAt`.
- Commit policy: **Claude Code is the primary environment** — follow CLAUDE.md (commit + push to `main` after every green build). Any `cursor/*` or `claude/*` branch must be merged to `main` before the session ends.

## Shipped recently
**Chunk 5 — performance Pass 2 (this branch, 2026-11-03)**
- Drawer data via `loadCompanyDrawerData` + shallow `?record=` (`useShallowRecord`) so opening a row does not re-fetch the table RSC payload.
- Dropped `companyNotesDoc` from `listEventCompanies`; notes load only in the drawer.
- `/companies` parallelises event-scoped fetches; lazy ⌘K palette, drawer tabs, cell editors, drawer shell.
- Edge-only `lib/auth/edge-config.ts` for middleware (**~85 kB**, was ~Node/bcrypt pull).
- Cron `maxDuration=300`, event concurrency, watch prospect pool (3), spend cap includes `agent_runs` + NL audit; `failStaleAgentRuns`; fixed agents `checkSpendCap().ok` bug.
- `bulkRemoveTag` → one `array_remove` UPDATE.
- Bundle: middleware 85.5 kB; `/pipeline` First Load ~155 kB; `/companies` still ~228 kB (table+TanStack; 160 target deferred).

**Chunk 4 — integrity (`1e5c70b` + soft-delete `0046823`, 2026-11-02)**
- `runAtomic` + audit-in-batch; CSV atomic import; custom-field jsonb patch; real dates; CSV formula escape; event TZ "today".
- **Migration 0015** journaled; soft-delete active after manual migrate (falls back to hard delete on `42703`).

**Chunk 3 — mobile nav (`39830a3`)** · **Chunk 2 — status path (`8cbddeb`)** · **Chunk 1 — security (`7e48a0f`)**

**Prod DB:** migrations **0000–0014 applied**. **0015 committed, not applied** — user `pnpm db:migrate`. Next free: **0016**.  
**Still needed in prod:** Vercel `CRON_SECRET` + AI Gateway credits; rotate exposed Neon owner password.

**Next up:** Merge Chunk 5 → main. User migrates **0015**. Then feature backlog (renewal rollover, etc.) or further `/companies` FL JS trim.

## Deferred / not built
- Email send + IMAP (needs Resend dep approval).
- New custom-field types (multiSelect, datetime, rating, person, relation).
- Gallery view. Real-time Pusher presence.
- Sequences as DB objects (playbooks are client templates only).
- `/companies` First Load still ~228 kB vs 160 target (drawer/editors already lazy; remaining is table shell).

## High-traffic paths (edit here first)
| Area | Path |
|---|---|
| Tokens / look | `app/globals.css`, `app/layout.tsx` |
| Shell | `components/app/{sidebar,top-bar,page-title,notification-bell}.tsx` |
| Table / drawer | `components/companies/{companies-table,company-drawer,companies-workspace}.tsx` |
| Pipeline | `components/pipeline/{kanban-board,pipeline-workspace}.tsx` |
| Auth edge | `lib/auth/edge-config.ts`, `middleware.ts` |
| Queries | `lib/db/queries/companies.ts` |
| Cells registry | `lib/cells/registry.ts` · lazy editors `components/cells/lazy-editors.tsx` |
| Schema | `lib/db/schema/` · migrations `lib/db/migrations/` |

## Ops / known gaps
- TipTap `/` and `@` and Phase 5 columns were not browser-verified here (no `.env.local` / login).
- Repo is public — user undecided on private.

## How to work in new chats (token discipline)
1. Read **this file only** to start.
2. For one feature: open ≤3 related files via Grep/Glob — no whole-tree walks.
3. One chunk per session; plan if >2–3 files.
4. After ship: update **this file’s “Last updated / Shipped / Deferred”** (keep it short), then SESSION-STATE if needed.
5. Never dump SESSION-STATE / CHANGELOG into context “just in case.”

## User preference on roadmap order
When optimizing use/UI: preferred order was **Phase 2 (look) → 3 (features) → 4 (ambition) → 1 (daily unlock)**.
