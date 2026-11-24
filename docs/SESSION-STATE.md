# Session State — LPD Sponsorship CRM

> **Authoritative handoff.** Read after `docs/AGENT-MEMORY.md` when you need
> HEAD / in-progress / bugs / next queue. Update this file at end of every
> session, then commit + push to `origin/main`.

---

## Last updated
2026-11-24 (America/Chicago) — **Claude Code session close-out:** prod DB caught up (0009 + 0017), zip export pack (PR #13) merged, docs refreshed. No code in progress.

---

## Current git HEAD
Docs close-out commit on `main` (parent `375f9dd` Merge PR #13 — export pack zip + prod DB caught up).  
This session's code: `b6a8f6c` playbooks from drawer (PR #12) · `5a724e6` export pack zip (PR #13).

Repo: `xynurse/nppacrm` · Prod: `nppacrm.vercel.app` (auto-deploys `main`) · Neon: `young-cell-40419191`.

---

## In progress
Nothing. All work merged to `main`.

---

## Known bugs / gaps
- **Not browser-verified:** zip export pack (Reports → Download export pack), playbooks from drawer, agents page and event profile after the 0009/0017 apply. Spot-check on prod.
- **Two export packs exist by design:** Companies → Export menu (3 CSVs for current view, PR #14) and Reports → zip of the whole event (PR #13).
- **Inbound email ingest not built (NPB-6)** — blocked on mailbox/domain + provider choice.
- **Cloud Agent cannot signed-in smoke** — no `SEED_ADMIN_*` / `.env.local` login.
- **`/companies` First Load** ~229 kB vs 160 kB target.
- **Vercel Production env gaps (user):** `CRON_SECRET` unset; `AI_GATEWAY_API_KEY` / `AI_MODEL_ID` / `VALYU_API_KEY` / `AI_DAILY_SPEND_CAP_USD` still Development-only (`ANTHROPIC_API_KEY` is on Production). Rotate Neon `neondb_owner` password still owed.

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
- Prod migrations may be applied by Claude **through the Neon MCP only when the user explicitly asks**, after reading the SQL and checking state; record each in `drizzle.__drizzle_migrations` (sha256 of the file + journal `when`). 0009 + 0017 applied this way 2026-11-24.
- Keep both export packs (user chose "merge 13").

---

## Next sessions queue

Work one chunk per session. Prefer browser verify on a machine with login before starting net-new UI.

### 0. (User, manual — not Claude)
1. Vercel → Environment Variables: add `CRON_SECRET`; tick Production on `AI_GATEWAY_API_KEY`, `AI_MODEL_ID`, `VALYU_API_KEY`, `AI_DAILY_SPEND_CAP_USD`; redeploy.
2. Rotate Neon owner password → update `DATABASE_URL` / `DATABASE_URL_UNPOOLED` in Vercel + `.env.local`.
3. Spot-check prod: Run playbook (drawer), Reports → Download export pack, Agents page, Event profile, Today tasks.

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
