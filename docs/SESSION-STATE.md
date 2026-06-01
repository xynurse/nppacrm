# Session State — LPD Sponsorship CRM

> **This file is the authoritative handoff document.**
> Claude must update it at the end of every session before stopping.
> At the start of every session, read this file first — it tells you exactly
> where things are and what to do next.

---

## Last updated
2026-06-01 — chunk 14b complete (committed + pushed)

## Current git HEAD
`bc7a336` — chunk 14b: Watch agent + Vercel cron wiring
(plus a follow-up docs commit updating this file)

---

## What's deployed
**Production URL:** `nppacrm.vercel.app`

Deployed code: chunks A, B, and 14b are on `origin/main`. Vercel auto-deploys
from `main`, so 14b ships on the next deploy.

**Before the crons actually run in prod, two env vars must be set in Vercel:**
- `CRON_SECRET` — generate with `openssl rand -base64 32`. Required in prod or
  the cron routes return 500. Vercel cron sends `Authorization: Bearer <it>`.
- `AI_GATEWAY_API_KEY` — connect the Anthropic provider in the Vercel AI
  Gateway tab, or the routes return 503 ("AI not configured").

---

## Chunk 14b — DONE

Shipped in commit `bc7a336`:
- `lib/agents/watch.ts` — watch agent (Valyu search + Claude Haiku signal
  assessment → creates follow-up tasks). Skips terminal statuses
  (`confirmed`/`declined`/`past_sponsor`) and anyone contacted in the last 7
  days. Max 10 companies/run.
- `app/api/cron/{discovery,watch}/route.ts` — GET handlers, Bearer auth via
  `CRON_SECRET`, gate on AI config, run for all `status = active` events with
  that agent enabled. `triggeredBy` passed as `null` (it's a UUID FK to users).
- `vercel.json` — discovery 6am UTC, watch 8am UTC.
- `lib/actions/agents.ts` — `runWatchAgent` (mirrors `runDiscoveryAgent`).
- `components/admin/agents-panel.tsx` — Watch row live (toggle, Run now,
  signal-task-count badge). `agents` page fetches the watch schedule.

All bugs from the prior session's notes were fixed: removed unused `gt`
import, `triggeredBy` now `string | null` (cron passes `null`), and
`events.isActive` → `events.status = "active"` (there is no `isActive`
column). typecheck + lint + build all green.

---

## Decisions made (don't re-debate these)

| Decision | Why |
|---|---|
| Watch signals → tasks (not enrichment suggestions, not company suggestions) | `companySuggestions` has no `eventCompanyId`; `enrichmentSuggestions` field enum only allows 4 outreach fields. Tasks are immediately actionable and show in normal workflow. |
| Haiku model for Watch agent | Cost control — signal assessment is lightweight; no need for Sonnet |
| Max 10 companies per watch run | Cost cap; runs daily so stale ones cycle through |
| Skip companies contacted in last 7 days | Avoids noisy duplicate signals for active conversations |
| Signal task due date = today + 3 days | Urgency without being immediate noise |
| `CRON_SECRET` optional in dev, required in prod | Allows easy local testing without bearer header |
| Discovery cron: 6am UTC; Watch cron: 8am UTC | Staggered to avoid simultaneous cost spikes |

---

## Next sessions queue

Work through these in order. One chunk per session.

### 1. Chunk 15 — TipTap rich notes
Replaces `interactions.body` and `tasks.description` (plain text) with TipTap
jsonb block editor. Needs DB migration.

**What it involves:**
- `pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`
- Migration: change `interactions.body` and `tasks.description` from `text` to `jsonb`
- `components/tiptap/rich-editor.tsx` — shared editor component with autosave on debounce
- Wire into `ActivityTab` (interaction logging) and `TasksTab` (task description)
- Add `companies.notesDoc` jsonb column for long-form company notes (new column, separate migration or same)
- Slash commands (`/`) + `@` mention extension (needed for chunk 20 notifications)

**Prerequisite for:** Chunk 20 (notifications needs `@` mentions)

### 2. Chunk 20 — Notification center
Bell icon in top bar, `notifications` table, in-app alerts for:
- Task assignments (`assignedTo` changes)
- `@` mentions in notes (needs TipTap first)
- Status changes on companies you own

**What it involves:**
- DB migration: `notifications` table (`id`, `userId`, `type`, `title`, `body`, `entityType`, `entityId`, `readAt`, `createdAt`)
- Bell icon in `TopBar` with unread count badge
- Dropdown list of recent notifications
- Hook into existing server actions to write notification rows on trigger events
- Mark-as-read action

---

## Known technical debt (not blocking)

| Issue | Where | Notes |
|---|---|---|
| `/companies` bundle is 204 kB | `app/(app)/companies/` | Target is 160 kB. Fix: `next/dynamic` import per cell type. |
| `experimental.typedRoutes` is off | `next.config.ts` | Can re-enable now that all routes exist. |
| `next lint` deprecation warning | CI | Migrate to `eslint .` flat config before Next 16. |

---

## Environment variables (production Vercel)

All set except:
- `CRON_SECRET` — **not yet set**. Generate with `openssl rand -base64 32` and add to Vercel project settings.
- `AI_GATEWAY_API_KEY` — connect Anthropic provider in Vercel AI Gateway tab to enable AI features in prod.

---

## Useful commands

```bash
export PATH="/Users/michaelthorn/.npm-global/bin:$PATH"
pnpm dev          # http://localhost:3001
pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint
pnpm build        # next build
pnpm db:generate  # generate Drizzle migration after schema changes
pnpm db:migrate   # apply migrations (dev only — never run against prod from here)
pnpm db:seed      # first-run admin + event + tiers + saved views
git log --oneline -8
```

---

## Schema / migration state

| Migration | Applied in prod? | Notes |
|---|---|---|
| 0000 | ✅ | users, events, audit_log |
| 0001 | ✅ | companies, event_companies |
| 0002 | ✅ | contacts, interactions, tasks, reviews |
| 0003 | ✅ | saved_views |
| 0004 | ✅ | custom_fields, attachments |
| 0005 | ✅ | trigram indexes (manual append) |
| 0006 | ✅ | prospectuses, enrichment_jobs, enrichment_suggestions |
| 0007 | ✅ | company_benefits |
| 0008 | ✅ | proposal fields on event_companies |
| 0009 | ✅ | agent_schedules, agent_runs, company_suggestions |

**Next migration:** Chunk 15 (TipTap) will need 0010 — `interactions.body` + `tasks.description` → jsonb, `companies.notes_doc` jsonb column.
