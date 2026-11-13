# Agent memory — LPD Sponsor CRM

> **Token-efficient handoff.** Read this first in new chats. Do NOT re-read
> `SESSION-STATE.md` / `TODO.md` / `CHANGELOG.md` / the build prompt unless
> this file is missing the fact you need. Prefer targeted greps over full-file reads.

**Last updated:** 2026-11-13  
**Branch:** `main` — Mayo blue theme landing (NPB-3); AI Gateway fix `2bccbf0` + agents soft-fail `b186d42`.  
**Prod:** `nppacrm.vercel.app` · Repo: `xynurse/nppacrm`

---

## What this is
Spreadsheet-first sponsorship CRM (Attio/Linear vibe) for Mayo Clinic NPPA LPD outreach.  
Stack: Next 15 · Neon · Drizzle · Auth.js · Tailwind/shadcn · TanStack Table · TipTap · pnpm.

## Design decisions (don't re-debate)
- Brand: **Mayo blue on zinc** (`#0057b8`), Plus Jakarta Sans (not Inter). Status colors stay semantic; Deferred uses stone (not purple).
- **Light-only UI** (Attio/Twenty) — no dark theme, no black sidebar. Forced `light` in ThemeProvider.
- Rich text: additive `*_doc` jsonb + plain-text mirror (not convert columns).
- BOUNCED / DEFERRED = **tags**, not pipeline statuses.
- Mutations → Server Actions + `auditLog`. Soft deletes via `deletedAt`.
- Commit policy: **Claude Code is the primary environment** — follow CLAUDE.md (commit + push to `main` after every green build). Any `cursor/*` or `claude/*` branch must be merged to `main` before the session ends.
- Home IA: Today → money pulse → Watch → thin activity (funnel/tier live on Reports).

## Shipped recently
**Mayo blue theme (2026-11-13)** — Brand tokens indigo→Mayo `#0057b8` in `app/globals.css`; Deferred badge stone (not violet); meeting icon teal. Cascades via `brand-*` / `--accent`.

**Email helpers + export pack (2026-11-13)** — Draft dialog: To: (primary contact), **Open in mail** / **Mark sent**; Export pack CSVs. No migration.

**Digest `86460961`:** missing `agent_schedules` — soft-fail on Agents page (`b186d42`); still need `pnpm db:migrate` / `0009`.

**AI Gateway fix (`2bccbf0`):** honor `ANTHROPIC_API_KEY` on Vercel; don’t treat bare `VERCEL=1` as AI-ready; soften optional env typos.

**Vercel env:** `ANTHROPIC_API_KEY` on Production; `AI_GATEWAY_*` / `AI_MODEL_ID` / `VALYU_API_KEY` / spend cap still Development-only; `CRON_SECRET` unset.

**Forecast / fulfillment / duplicates (merged PR #11)** · **Mobile shell (PR #10)** · **Renewal rollover (PR #9)** · **Light Attio (PR #8)**

**Prod DB:** claimed through **0016**, but agents tables missing. Neon `nppacrm` = `young-cell-40419191`.  
**Still needed:** apply agents migration; `CRON_SECRET`; extend AI Gateway/MODEL/VALYU to Production; rotate Neon owner password.

**Next up:** sponsor self-service link · vitest for `compile.ts`/serializer/reports.

## Deferred / not built
- Email send + IMAP (needs Resend dep approval).
- New custom-field types (multiSelect, datetime, rating, person, relation).
- Gallery view. Real-time Pusher presence.
- Sequences as DB objects (playbooks are client templates only).
- `/companies` First Load still ~229 kB vs 160 target.

## Considerations (not scheduled — Bonsai / post-commit UX)
From hellobonsai.com review. Steal post-commit ideas only; keep Attio/Twenty for outreach UX.
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
| Email draft | `components/companies/email-draft-dialog.tsx` · `lib/actions/email.ts` · `lib/mailto.ts` |
| Export | `components/views/export-button.tsx` · `lib/actions/csv.ts` |

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
