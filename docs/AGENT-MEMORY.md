# Agent memory — LPD Sponsor CRM

> **Token-efficient handoff.** Read this first in new chats. Do NOT re-read
> `SESSION-STATE.md` / `TODO.md` / `CHANGELOG.md` / the build prompt unless
> this file is missing the fact you need. Prefer targeted greps over full-file reads.

**Last updated:** 2026-09-26  
**main:** PR #1 merged (`8d64103`) + CI build env (`a630150`)  
**Open PR:** https://github.com/xynurse/nppacrm/pull/2 (`cursor/phase5-spreadsheet-75b2`)  
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
- Commit policy conflict: workspace CLAUDE.md says commit `main`; Cloud Agents use `cursor/*` PRs — follow the active environment’s rule. User asked for PR #1 to be merged to `main` (done).

## Shipped recently
**On main — PR #1 (Phases 2→3→4→1), merged 2026-09-26**
- UI polish, notifications, fulfillment + category fields, `/calendar`, `/playbooks`, Today queue, bounced/deferred chips.
- CI: drop the duplicate pnpm pin; build-only `DATABASE_URL` so `next build` can collect cron routes.

**Phase 5 (this branch) — spreadsheet columns**
- Optional companies columns: category, subcategory, agreement, invoice, paid, booth, reps. Inline edit via existing cells.
- Custom fields as opt-in table columns (`custom:<key>`), plus filter + sort. File fields are columns only.
- Saved views persist columns. New shared views: Unassigned, Bounced, By category.
- **0013** rewrites the inverted “Stale (no contact 14+ days)” view to older-than-14-days and renames it when the new name is free.

**Before prod works:** `pnpm db:migrate` for **0012** and **0013**. Still need Vercel `CRON_SECRET` + AI Gateway credits.

## Deferred / not built
- Email send + IMAP (needs Resend dep approval).
- New custom-field types (multiSelect, datetime, rating, person, relation).
- Gallery view. Real-time Pusher presence.
- Sequences as DB objects (playbooks are client templates only).
- `/companies` dynamic cell imports (First Load JS ~215 kB; target 160).

## High-traffic paths (edit here first)
| Area | Path |
|---|---|
| Tokens / look | `app/globals.css`, `app/layout.tsx` |
| Shell | `components/app/{sidebar,top-bar,page-title,notification-bell}.tsx` |
| Table / drawer | `components/companies/{companies-table,company-drawer,company-avatar,status-badge}.tsx` |
| Pipeline | `components/pipeline/kanban-board.tsx` |
| Queries | `lib/db/queries/companies.ts` |
| Cells registry | `lib/cells/registry.ts` |
| Views/filters | `lib/views/{fields,compile}.ts`, `components/views/views-toolbar.tsx` |
| Schema | `lib/db/schema/` · migrations `lib/db/migrations/` |

## Ops / known gaps
- TipTap `/` and `@` and Phase 5 columns were not browser-verified here (no `.env.local` / login).
- Stale view stays inverted until **0013** is applied.
- Repo is public — user undecided on private.

## How to work in new chats (token discipline)
1. Read **this file only** to start.
2. For one feature: open ≤3 related files via Grep/Glob — no whole-tree walks.
3. One chunk per session; plan if >2–3 files.
4. After ship: update **this file’s “Last updated / Shipped / Deferred”** (keep it short), then SESSION-STATE if needed.
5. Never dump SESSION-STATE / CHANGELOG into context “just in case.”

## User preference on roadmap order
When optimizing use/UI: preferred order was **Phase 2 (look) → 3 (features) → 4 (ambition) → 1 (daily unlock)**.
