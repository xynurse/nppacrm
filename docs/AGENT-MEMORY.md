# Agent memory — LPD Sponsor CRM

> **Token-efficient handoff.** Read this first in new chats. Do NOT re-read
> `SESSION-STATE.md` / `TODO.md` / `CHANGELOG.md` / the build prompt unless
> this file is missing the fact you need. Prefer targeted greps over full-file reads.

**Last updated:** 2026-11-24 (prod migrations 0009 + 0017 applied)
**Branch:** `main` — Claude Code handoff after UX PRs **#18–#25** (parent `7e21c6e` + this docs commit).  
**Prod:** `nppacrm.vercel.app` · Repo: `xynurse/nppacrm`

---

## What this is
Spreadsheet-first sponsorship CRM (Attio/Linear vibe) for Mayo Clinic NPPA LPD outreach.  
Stack: Next 15 · Neon · Drizzle · Auth.js · Tailwind/shadcn · TanStack Table · TipTap · pnpm.

## Design decisions (don't re-debate)
- Brand: **Mayo Clinic blue on zinc** (`#0057b8`), Plus Jakarta Sans — Notion/Linear look. **No purple** (Deferred = stone).
- **Light-only UI** (Attio/Twenty) — no dark theme, no black sidebar. Forced `light` in ThemeProvider.
- Rich text: additive `*_doc` jsonb + plain-text mirror (not convert columns).
- BOUNCED / DEFERRED = **tags**, not pipeline statuses.
- Mutations → Server Actions + `auditLog`. Soft deletes via `deletedAt`.
- Commit policy: **Claude Code is primary** — commit + push `main` after green build. Merge any `cursor/*` / `claude/*` before session end.
- Home IA: Today → money pulse → Watch → thin activity (funnel/tier on Reports).
- Calendar: month grid + list; priority via CSS vars (`--priority-*`); `date-fns` only.
- **Never** `db:migrate` / `db:seed` against prod from an agent (`.env.local` → prod Neon).

## Shipped recently
**2026-11-24:** PR #13 zip export pack on Reports (`lib/actions/export-pack.ts`, `fflate`) merged · prod migrations 0009 + 0017 applied via Neon MCP. Both export packs kept (Companies menu = current-view CSVs; Reports = full-event zip).

**NPB-3 UX + follow-ons (2026-11-13/14, PRs #18–#25 on `main`):**
- #18 Mayo blue theme · #19 contacts row actions · #20 Todoist calendar + priorities · #21 dashboard activity filters/collapse · #22 company size/sector filters · #23 tasks assign/kanban/timeline · #24 event profile (directors/goals/metrics, mig **0017**) · #25 Today collapse/multiselect/due date · research-notes inject on Enrich · Event switcher + prospectus upload/revise · Quick update email-parse help.

**Also:** Email helpers + export pack (#14) · AI Gateway honor `ANTHROPIC_API_KEY` · Agents page soft-fail without `agent_schedules` · forecast/fulfillment/dupes (#11) · mobile (#10) · rollover (#9) · light Attio (#8).

**Prod DB:** **0000–0017 all applied** (2026-11-24 via Neon MCP: 0009 agents tables + 0017 event profile, recorded in `drizzle.__drizzle_migrations`, 18 rows). Next migration: 0018. Neon `nppacrm` = `young-cell-40419191`.

## Deferred / not built
- **Inbound email agent ingest (NPB-6)** — needs mailbox/domain + provider (Gmail/Outlook/forward). IMAP/Resend still needs dep approval.
- Sponsor self-service portal · vitest · gallery · Pusher presence · sequences as DB objects.
- `/companies` First Load ~229 kB vs 160 target.
- Cloud Agent has **no `SEED_ADMIN_*`** — cannot signed-in browser smoke against prod.

## High-traffic paths
| Area | Path |
|---|---|
| Tokens / look | `app/globals.css`, `app/layout.tsx` |
| Shell | `components/app/{sidebar,top-bar,page-title,notification-bell}.tsx` |
| Home | `app/(app)/page.tsx` · `components/dashboard/{today-tasks,recent-activity}.tsx` |
| Table / drawer | `components/companies/{companies-table,company-drawer,companies-workspace,ai-tab}.tsx` |
| Tasks / calendar | `components/tasks/*` · `app/(app)/calendar/` |
| Event | `app/(app)/event/page.tsx` · `components/event/*` · prospectus admin |
| Schema | `lib/db/schema/` · `lib/db/migrations/` |
| Email draft / NL | `components/companies/email-draft-dialog.tsx` · `components/ai/nl-update-box.tsx` |

## How to work in new chats
1. Read **this file only** to start.
2. For one feature: ≤3 related files via Grep/Glob.
3. One chunk per session; plan if >2–3 files.
4. After ship: update Last updated / Shipped / Deferred here, then SESSION-STATE / TODO / CHANGELOG + push.
5. Green build in cloud: `pnpm typecheck && pnpm lint && pnpm build:offline`.

## User preference on roadmap order
When optimizing use/UI: **Phase 2 (look) → 3 (features) → 4 (ambition) → 1 (daily unlock)**.
