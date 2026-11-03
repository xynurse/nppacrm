# Agent memory — LPD Sponsor CRM

> **Token-efficient handoff.** Read this first in new chats. Do NOT re-read
> `SESSION-STATE.md` / `TODO.md` / `CHANGELOG.md` / the build prompt unless
> this file is missing the fact you need. Prefer targeted greps over full-file reads.

**Last updated:** 2026-11-03  
**main:** `bce3386` — Chunk 5 perf + dashboard calm UX (PRs #6 + #7).  
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
- Home IA: Today → money pulse → Watch → thin activity (funnel/tier live on Reports).

## Shipped recently
**Dashboard calm UX (merged 2026-11-03)**
- Home: greeting + Today queue, Confirmed/Pipeline/Goal pulse, Hot + Stalled, activity feed.
- Quieter badges (no rings), shell padding, zinc headers, softer AI update chrome.

**Chunk 5 — performance Pass 2 (merged 2026-11-03)**
- Drawer via `loadCompanyDrawerData` + shallow `?record=`; no `notesDoc` on list rows.
- Lazy ⌘K / drawer tabs / cell editors / drawer shell; edge auth middleware (~85 kB).
- Cron `maxDuration` + concurrency + spend cap (`agent_runs` + NL); `bulkRemoveTag` one-shot.
- `/companies` First Load still ~228 kB (table shell; 160 target deferred).

**Chunk 4 — integrity + soft-delete (`1e5c70b` / `0046823`)**
- Atomic writes, CSV batch, custom-field jsonb patch, real dates, CSV escape, event TZ.
- **Migration 0015** journaled; soft-delete active after manual migrate (`42703` fallback until then).

**Chunk 3 — mobile nav** · **Chunk 2 — status path** · **Chunk 1 — security**

**Prod DB:** **0000–0014 applied**. **0015 not applied** — user `pnpm db:migrate`. Next: **0016**.  
**Still needed:** Vercel `CRON_SECRET` + AI Gateway credits; rotate exposed Neon owner password.

**Next up:** User migrates **0015**. Optional: deeper companies/pipeline polish; `/companies` FL JS trim.

## Deferred / not built
- Email send + IMAP (needs Resend dep approval).
- New custom-field types (multiSelect, datetime, rating, person, relation).
- Gallery view. Real-time Pusher presence.
- Sequences as DB objects (playbooks are client templates only).
- `/companies` First Load still ~228 kB vs 160 target.

## High-traffic paths (edit here first)
| Area | Path |
|---|---|
| Tokens / look | `app/globals.css`, `app/layout.tsx` |
| Shell | `components/app/{sidebar,top-bar,page-title,notification-bell}.tsx` |
| Home | `app/(app)/page.tsx` |
| Table / drawer | `components/companies/{companies-table,company-drawer,companies-workspace}.tsx` |
| Pipeline | `components/pipeline/{kanban-board,pipeline-workspace}.tsx` |
| Auth edge | `lib/auth/edge-config.ts`, `middleware.ts` |
| Queries | `lib/db/queries/companies.ts` |
| Cells | `lib/cells/registry.ts` · `components/cells/lazy-editors.tsx` |
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
