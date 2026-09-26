# Agent memory — LPD Sponsor CRM

> **Token-efficient handoff.** Read this first in new chats. Do NOT re-read
> `SESSION-STATE.md` / `TODO.md` / `CHANGELOG.md` / the build prompt unless
> this file is missing the fact you need. Prefer targeted greps over full-file reads.

**Last updated:** 2026-09-26  
**Open PR:** https://github.com/xynurse/nppacrm/pull/1 (`cursor/ui-phases-2341-896f`)  
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
- Commit policy conflict: workspace CLAUDE.md says commit `main`; Cloud Agents use `cursor/*-896f` PRs — follow the active environment’s rule.

## Shipped recently (PR #1 — Phases 2→3→4→1)
- **UI:** fonts, top-bar titles, CompanyAvatar, badge redesign, sticky drawer.
- **0012 migration:** `notifications`, `companies.category/subcategory`, fulfillment cols on `event_companies`.
- Notifications bell (assign / @mention / owned status change).
- Drawer prev/next · fulfillment section · category fields.
- `/calendar` · `/playbooks` · Dashboard **Today** queue.
- Bounced/Deferred filter chips + bulk clear tags.

**Before prod works:** `pnpm db:migrate` for **0012**. Also still need Vercel `CRON_SECRET` + AI Gateway credits.

## Deferred / not built
- Email send + IMAP (needs Resend dep approval).
- Custom fields as full table columns (partial).
- Real-time Pusher presence.
- Sequences as DB objects (playbooks are client templates only).

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
- TipTap `/` and `@` never browser-verified (needs login; `.env.local` → prod).
- Seed view “Stale…” may still be inverted in prod — use “Needs follow-up (14+ days)”.
- `/companies` First Load JS ~212 kB (target 160; dynamic cell imports).
- Repo is public — user undecided on private.

## How to work in new chats (token discipline)
1. Read **this file only** to start.
2. For one feature: open ≤3 related files via Grep/Glob — no whole-tree walks.
3. One chunk per session; plan if >2–3 files.
4. After ship: update **this file’s “Last updated / Shipped / Deferred”** (keep it short), then SESSION-STATE if needed.
5. Never dump SESSION-STATE / CHANGELOG into context “just in case.”

## User preference on roadmap order
When optimizing use/UI: preferred order was **Phase 2 (look) → 3 (features) → 4 (ambition) → 1 (daily unlock)**.
