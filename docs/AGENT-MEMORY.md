# Agent memory — LPD Sponsor CRM

> **Token-efficient handoff.** Read this first in new chats. Do NOT re-read
> `SESSION-STATE.md` / `TODO.md` / `CHANGELOG.md` / the build prompt unless
> this file is missing the fact you need. Prefer targeted greps over full-file reads.

**Last updated:** 2026-11-03  
**Branch:** `cursor/renewal-rollover-eed9` — start next year from an event.  
**main:** `9207604` — light Attio shell merged (PR #8).  
**Prod:** `nppacrm.vercel.app` · Repo: `xynurse/nppacrm`

---

## What this is
Spreadsheet-first sponsorship CRM (Attio/Linear vibe) for Mayo Clinic NPPA LPD outreach.  
Stack: Next 15 · Neon · Drizzle · Auth.js · Tailwind/shadcn · TanStack Table · TipTap · pnpm.

## Design decisions (don't re-debate)
- Brand: **indigo on zinc**, Plus Jakarta Sans (not Inter). Status colors stay semantic.
- **Light-only UI** (Attio/Twenty) — no dark theme, no black sidebar. Forced `light` in ThemeProvider.
- Rich text: additive `*_doc` jsonb + plain-text mirror (not convert columns).
- BOUNCED / DEFERRED = **tags**, not pipeline statuses.
- Mutations → Server Actions + `auditLog`. Soft deletes via `deletedAt`.
- Commit policy: **Claude Code is the primary environment** — follow CLAUDE.md (commit + push to `main` after every green build). Any `cursor/*` or `claude/*` branch must be merged to `main` before the session ends.
- Home IA: Today → money pulse → Watch → thin activity (funnel/tier live on Reports).

## Shipped recently
**Renewal rollover (in PR — `cursor/renewal-rollover-eed9`, 2026-11-03)**
- Admin event detail: “Start next year from this event” → `rolloverEvent`.
- Copies tiers (remapped), custom fields, reviewers, selected companies.
- Confirmed → `past_sponsor`; pipeline → `prospect`; no tasks/interactions/fulfillment.
- No new migration.

**Light Attio/Twenty shell (merged to main, PR #8, 2026-11-03)**
- White sidebar, light login, forced light theme; theme toggle removed.

**Dashboard calm UX · Chunk 5 perf · Chunk 4 integrity** (merged earlier 2026-11-03 / Oct)

**Prod DB:** **0000–0014 applied**. **0015 not applied** — user `pnpm db:migrate`.  
**Still needed:** Vercel `CRON_SECRET` + AI Gateway credits; rotate exposed Neon owner password.

**Next up:** Merge rollover PR → tier inventory + weighted forecast/pace. User migrates **0015**.

## Deferred / not built
- Email send + IMAP (needs Resend dep approval).
- New custom-field types (multiSelect, datetime, rating, person, relation).
- Gallery view. Real-time Pusher presence.
- Sequences as DB objects (playbooks are client templates only).
- `/companies` First Load still ~228 kB vs 160 target.

## Considerations (not scheduled — Bonsai / post-commit UX)
From hellobonsai.com review (agency CRM, not sponsorship-native). Steal post-commit ideas only; keep Attio/Twenty for outreach UX.
1. Sponsor self-service portal (narrow: docs + invoice/booth status)
2. Proposal view/accept tracking (beyond “sent”)
3. Confirmed → fulfillment board handoff
4. Interest/intake forms → new prospect
5. Fixed automations (few triggers, not a rules engine)
6. Meeting → interaction/tasks (AI path) — larger lift  
Skip for us: time tracking, Gantt, full Stripe invoicing, e-sign product.

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
