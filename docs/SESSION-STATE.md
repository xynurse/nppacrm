# Session State — LPD Sponsorship CRM

> **Authoritative handoff.** Read after `docs/AGENT-MEMORY.md` when you need
> HEAD / in-progress / bugs / next queue. Update this file at end of every
> session, then commit + push to `origin/main`.

---

## Last updated
2026-11-14 (America/Chicago) — **Claude Code handoff after UX PRs #18–#25.**  
UI for NPB-3 (plus Today/research/prospectus/email-parse) is on `main`. No code in progress. Docs-only close-out this session.

---

## Current git HEAD
This docs handoff commit on `main` (parent `7e21c6e` `docs: record UX pack PR #25 merged to main`).  
UX code: `a4f867b` merge PR #25 · `d5f6a0e` Today/research/prospectus/email-parse · `4f8a5d8` event #24 · `f548a0f` tasks #23 · `0bfed3f` company filters #22 · `0a52d15` activity #21 · `f37a3ab` calendar #20 · `9efd104` contacts #19 · `f98dbd8` Mayo blue #18.

Repo: `xynurse/nppacrm` · Prod: `nppacrm.vercel.app` · Neon: `young-cell-40419191`.

---

## In progress
Nothing uncommitted for product code. This handoff updates AGENT-MEMORY / SESSION-STATE / TODO / CHANGELOG only.

---

## Known bugs / gaps
- **Prod migration 0017 not applied** — event profile columns (course directors / goals / metrics) from PR #24. User runs `pnpm db:migrate` manually. Tracker: **NPB-13**.
- **Agents tables missing in prod** — `agent_schedules` / related from **0009**; Agents page soft-fails (`b186d42`). Tracker: **NPB-12**. Do **not** migrate from a cloud agent.
- **Inbound email ingest not built (NPB-6)** — blocked on mailbox/domain + provider choice. Paste → Quick update Parse is the interim path.
- **Cloud Agent cannot signed-in smoke** — no `SEED_ADMIN_*` / no `.env.local` login. TipTap `/` `@`, Phase 5 columns, and new Today/Event UX were not browser-verified here.
- **`/companies` First Load** still ~229 kB vs 160 kB target (needs splitting the table itself).
- **Vercel Production env gaps:** `CRON_SECRET` unset; `AI_GATEWAY_*` / `AI_MODEL_ID` / `VALYU_API_KEY` / spend cap still Development-only (`ANTHROPIC_API_KEY` is on Production). Rotate Neon `neondb_owner` password still owed.

---

## Decisions made (don't re-debate)
- Theme: **Mayo Clinic blue** (`#0057b8`) + Notion/Linear chrome — **no purple**; Deferred = stone.
- Light-only Attio/Twenty shell; Claude Code primary; commit + push `main` after green; **never** `db:migrate` / `db:seed` against prod from agents.
- Rich text = additive `*_doc` + plain-text mirror.
- BOUNCED / DEFERRED = tags, not pipeline statuses.
- Home Today is interactive client (`components/dashboard/today-tasks.tsx`); activity collapse pattern reused.
- Enrich `userContext` is **ephemeral** (not written to CRM fields).
- Email ingest = future product; Quick update documents paste-to-parse until then.
- PR #19 may show GitHub `CLOSED` after rebase; commit `9efd104` is on `main`.

---

## Next sessions queue

Work one chunk per session. Prefer browser verify on a machine with login before starting net-new UI.

### 0. (User, manual — not Claude)
1. `pnpm db:migrate` on prod for **0017** (event profile) — NPB-13.  
2. Recreate / migrate agents tables (**0009** / `agent_schedules`) — NPB-12.  
3. Set `CRON_SECRET`; extend AI Gateway / MODEL / VALYU / spend cap to Production; rotate Neon owner password.  
4. Spot-check prod: Today tasks, Event prospectus, AI research notes, Quick update help. Mark **NPB-3 Done** in tracker after verify.

### 1. NPB-6 — Inbound email agent ingest
Blocked until Michael picks mailbox/domain + provider (Gmail / Outlook / forward-only). Needs Resend (or similar) dep approval for send/IMAP. Until then, paste threads into Quick update → Parse → review.

### 2. Sponsor self-service link (narrow)
Post-commit surface: docs + invoice/booth status for confirmed sponsors. Steal Bonsai ideas only; keep Attio/Twenty for outreach.

### 3. Vitest unit tests
`compile.ts` / TipTap serializer / reports helpers. Needs dep approval; no runner in repo today.

### 4. Bundle / housekeeping (when idle)
`/companies` First Load toward 160 kB · Pass 3 drop unused `tags` / `company_tags` via migration · trim historical SESSION-STATE further if it grows again · Dependabot for security bumps.

### Considerations (not scheduled — Bonsai)
Sponsor portal · proposal view tracking · fulfillment handoff · intake forms · fixed automations · meeting→CRM. Skip: time tracking, Gantt, Stripe product, e-sign suite.

---

## Schema / migration state (prod)

| Through | Status |
|---|---|
| 0000–0016 | ✅ applied (0015 tasks.deleted_at, 0016 tier inventory) |
| 0009 agents tables | ⚠️ journal says applied historically but `agent_schedules` missing in prod — recreate |
| 0017 `event_profile_details` | ❌ not applied — needs manual migrate |

---

## Useful commands

```bash
pnpm typecheck && pnpm lint && pnpm build:offline   # cloud green build
pnpm dev                                            # local (needs .env.local)
# User only, never from Claude/cloud against prod:
# pnpm db:migrate · pnpm db:seed
```

Older session narratives (chunks 1–5, TipTap, outreach batches) live in `CHANGELOG.md` and git history — do not re-litigate fixed audit items from 2026-10.
