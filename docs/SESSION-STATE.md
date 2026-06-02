# Session State — LPD Sponsorship CRM

> **This file is the authoritative handoff document.**
> Claude must update it at the end of every session before stopping.
> At the start of every session, read this file first — it tells you exactly
> where things are and what to do next.

---

## Last updated
2026-06-02 — Master List CSV import prep (importer extended; data load pending)

## Current git HEAD
`2b43f88` — chore: map Master List owner 'Michael' to Mike Thorn on CSV export
(prior: `9776150` feat: extend prospect CSV importer to ingest full Master List)

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

## Master List import — IN PROGRESS (data not yet loaded)

Goal this session: migrate the real NPPA Master List (312 prospects) from the
restructured Excel workbook into the CRM via the in-app importer.

**Shipped (commits `9776150`, `2b43f88`):**
- `lib/actions/csv.ts` — the importer now ingests the full Master List, not just
  7 fields. New columns: `website`, `subcategory`, `owner`, `target_tier`, the
  four AI fields (`why_they_should_attend`, `key_talking_points`, `email_angle`,
  `sponsorship_hook`), `relationship_notes`, `first_contacted_at`,
  `last_contacted_at`, and `contact1_*`/`contact2_*`. Owner resolves by user
  name / first name / email local-part; tier resolves by name within the event;
  contacts are inserted (contact 1 = primary) deduped by email/name;
  `subcategory` is stashed in `eventCompanies.customFields` (no schema change).
  Owner default changed from "importing user" to **null** (unassigned) when
  unmatched.
- `components/admin/import-wizard.tsx` — `ParsedRow`, `FIELD_ALIASES`, and the
  recognized-columns help text expanded to match.
- `scripts/excel-to-import-csv.py` — converts the workbook → importer-ready CSV.
  Remaps status (`Not contacted`→`prospect`), tiers, composes `hq_location`, and
  aliases owner `Michael`→`Mike Thorn`. typecheck + lint + build all green.

**The generated CSV is on the Desktop (NOT committed — contains contact PII):**
`~/Desktop/NPPA_LPD_2026_master_list_import.csv` — 312 rows. Status: 249
prospect / 61 contacted / 2 declined. Owner: 77 Mike Thorn / 235 unassigned.
Tiers: 146 Bronze / 144 Silver / 21 Gold.
Source workbook: `~/Desktop/LPD 2026/NPPA_LPD_2026_Sponsor_Tracker_RESTRUCTURED.xlsx`.

**NEXT ACTION (manual — admin runs it, per the no-DB-from-Claude rule):**
1. `pnpm dev`, log in as admin.
2. Admin → Events → LPD 2026 → Import prospects.
3. Upload the CSV → Preview (expect ~312 new companies, 0 already on event) → Commit.
4. Spot-check `/companies`: a "Michael" row (e.g. 3D Systems Healthcare) should
   show owner = Mike Thorn, tier Bronze, AI fields populated, a primary contact.
   If preview shows many "already on event", STOP — the event already has data.

**Deferred features surfaced during the Excel review (not built — user chose
"just migrate for now"):**
- **Category as a structured field + a grouped "By Category" view** (workbook has
  24 categories and a dedicated category sheet; CRM only has free-text
  `industry`, which currently receives the Category value).
- **Payment & fulfillment fields/view** (agreement signed / invoice sent / paid /
  booth # / rep names — the workbook's Confirmed Sponsors sheet; empty now, but
  needed before the event).
- **Subcategory** currently lives in `customFields.subcategory` (lossless but not
  surfaced as a column/filter).

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
| Extend the in-app importer rather than write a one-shot migration script | Reusable for future uploads; user runs it via UI so the no-DB-from-Claude rule is respected |
| Master List `Category` → `companies.industry`; `Subcategory` → `customFields.subcategory` | No schema change needed for "just migrate" scope; a real category field/view is deferred |
| Unmatched import owner → null (unassigned), not the importing user | A blank owner in the source means genuinely unassigned; avoids 235 rows silently landing on the admin |
| Import CSV with PII stays on Desktop, uncommitted | Contains contact emails/names; only the generator script is committed |

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
