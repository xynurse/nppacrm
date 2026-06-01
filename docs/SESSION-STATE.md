# Session State — LPD Sponsorship CRM

> **This file is the authoritative handoff document.**
> Claude must update it at the end of every session before stopping.
> At the start of every session, read this file first — it tells you exactly
> where things are and what to do next.

---

## Last updated
2026-06-01 — end of chunk 14b session (partial)

## Current git HEAD
`d756c6a` — chunk B committed and pushed to `origin/main`

Chunk 14b files were written but **not yet committed** (typecheck/lint/build
not run yet). See "In progress" below.

---

## What's deployed
**Production URL:** `nppacrm.vercel.app`

Deployed code: everything through commit `d756c6a` (chunk B).

Chunks A and B are live. Chunk 14b is local only, not committed.

---

## In progress: Chunk 14b — Watch agent + Vercel cron

### Files written this session (not yet committed):
| File | Status |
|---|---|
| `lib/agents/watch.ts` | Written — watch agent logic complete |
| `lib/env.ts` | Updated — `CRON_SECRET` added |
| `app/api/cron/discovery/route.ts` | Written |
| `app/api/cron/watch/route.ts` | Written |

### Files still to write before chunk 14b is done:
| File | What it needs |
|---|---|
| `vercel.json` | New file at repo root: `{"crons":[{"path":"/api/cron/discovery","schedule":"0 6 * * *"},{"path":"/api/cron/watch","schedule":"0 8 * * *"}]}` |
| `.env.example` | Add line: `CRON_SECRET=` (secret for Vercel → project → cron auth) |
| `lib/actions/agents.ts` | Add `runWatchAgent` server action (mirrors `runDiscoveryAgent`, calls `runWatch` from `lib/agents/watch`) |
| `components/admin/agents-panel.tsx` | Wire Watch row: remove `disabled`/`"Coming soon"`, add real toggle + "Run now" button, show task-count badge |
| `app/(app)/admin/events/[id]/agents/page.tsx` | Fetch `watchSchedule` and pass `watchEnabled`/`watchLastRunAt` to `AgentsPanel` |

### Known bugs to fix before committing:
1. **`lib/agents/watch.ts`** — imports `gt` from drizzle-orm but never uses it → remove the import or it'll warn
2. **`app/api/cron/discovery/route.ts`** — `triggeredBy: "cron"` is a plain string, not a UUID. `agentRuns.triggeredBy` is a UUID FK. Fix: pass `null` instead of `"cron"`.
3. **`app/api/cron/watch/route.ts`** — same issue, same fix.
4. **`events.isActive` column** — both cron routes query `events.isActive`. Verify this column exists in `lib/db/schema/events.ts` before typechecking; if it doesn't exist, use `events.archivedAt IS NULL` or just remove that WHERE condition.

### Build gates (must all pass before committing):
```
export PATH="/Users/michaelthorn/.npm-global/bin:$PATH"
pnpm typecheck && pnpm lint && pnpm build
```

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

### 1. Finish chunk 14b (next session's first task)
See "In progress" section above. ~4 files to write + fix 3 bugs + typecheck/lint/build/commit/push.

### 2. Chunk 15 — TipTap rich notes
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

### 3. Chunk 20 — Notification center
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
