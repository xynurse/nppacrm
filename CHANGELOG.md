# Changelog

## Active build (committed to main)

### Master List CSV import — full-fidelity importer _(2026-06-02, commits 9776150, 2b43f88)_
- `lib/actions/csv.ts` — the prospect importer now ingests the whole NPPA
  Master List instead of 7 fields. Added columns: `website`, `subcategory`,
  `owner`, `target_tier`, the four AI outreach fields (`why_they_should_attend`,
  `key_talking_points`, `email_angle`, `sponsorship_hook`), `relationship_notes`,
  `first_contacted_at`, `last_contacted_at`, and `contact1_*`/`contact2_*`.
  Owner resolves by user name/email, tier by name within the event, contacts are
  created (contact 1 = primary) deduped by email/name, and `subcategory` is
  stored in `eventCompanies.customFields`. Unmatched owner → unassigned (null).
- `components/admin/import-wizard.tsx` — parsed-row shape, header aliases, and
  help text expanded to match.
- `scripts/excel-to-import-csv.py` — workbook → importer-ready CSV converter
  (status/tier remap, `hq_location` composition, owner alias `Michael`→`Mike
  Thorn`). Generated CSV is kept out of git (contact PII).
- Data load itself is a manual step (admin runs it via the import UI).

### Chunk 14b — Watch agent + Vercel cron _(2026-06-01)_
- `lib/agents/watch.ts` — Watch agent: for each active prospect runs a Valyu
  search for recent news/funding/leadership signals, calls Claude Haiku to
  assess signal relevance, creates a follow-up task on the company if a real
  signal is found. Max 10 companies/run, skips terminal statuses and anyone
  contacted within the last 7 days.
- `app/api/cron/discovery/route.ts` — GET handler with Bearer auth, runs
  discovery for all active events where the Discovery agent is enabled.
- `app/api/cron/watch/route.ts` — GET handler with Bearer auth, runs watch
  for all active events where the Watch agent is enabled.
- `vercel.json` — daily cron schedule (Discovery 6am UTC, Watch 8am UTC).
- `lib/actions/agents.ts` — `runWatchAgent` server action added.
- `components/admin/agents-panel.tsx` — Watch row live with toggle, Run now,
  and a signal-task-count badge.
- `lib/env.ts` / `.env.example` — `CRON_SECRET` added (required in prod).

### Chunk B — Outreach intelligence & UX enrichment _(2026-06-01, commit d756c6a)_
- **Dashboard v2:** colour-accented KPI cards, horizontal pipeline funnel bar
  chart, tier-mix confirmed-revenue breakdown, hot-prospects panel (high
  priority + active status), activity feed with user initials.
- **Contact creation:** "New contact" button on `/contacts` with searchable
  company picker; marks primary contact; empty-state copy updated.
- **Task management:** timeline view grouping tasks into Overdue / Today /
  This Week / Later / No Due Date buckets with colour banding. List ↔
  Timeline toggle. Standalone "New task" inline form with due date, priority,
  and assignee picker across all active users.
- **Pipeline cards:** last-contacted date shown per card; amber at 14d, red
  at 30d (matches cadence logic in companies table).
- **AI email draft:** `draftOutreachEmail` server action (Claude Sonnet, cached
  prospectus context, company profile + CRM notes + primary contact). Drawer
  header button opens modal with subject + body, per-field copy buttons,
  full-email copy, regenerate. System-prompt rules block AI slop phrasing.
- **Discover nav link:** admin sidebar item pointing straight to the AI agents
  page for the active event.

### Chunk A — Medical design system _(2026-06-01, commit 4e71273)_
- Dark slate sidebar (`bg-slate-900`) matching clinical/enterprise aesthetic.
- Teal brand colour (`brand-600 = #0d9488`, teal-600) replacing generic blue.
- Inter font via `next/font/google` with `--font-inter` CSS variable.
- Refined typography scale and spacing throughout shell components.

---

> ⚠️ **Historical reference below.** This documents the 18-chunk build that
> happened in the `claude/kind-banach-f3fa4b` worktree on 2026-05-08 to -09.
> That worktree was deleted before any commits landed. Architectural decisions
> and schema shape are preserved here for reference.

## v1.5 — AI + sponsor-workflow extensions (built then lost)

Migrations 0006–0008 in the lost branch.

### Chunk 18 — Proposal flow + cadence warnings _(2026-05-09)_
- `eventCompanies.proposalUrl`, `proposalSentAt`, `proposalValidUntil`
- `markProposalSent` server action — atomic status flip + URL/dates +
  bump `lastContactedAt` + auto-create 7-day follow-up task
- Drawer "Mark proposal sent" dialog (URL + valid-until inputs)
- Cadence tinting on `/companies` table — Last contact cell goes amber at
  14+ days, red at 30+ (only for active prospect statuses)
- **Deferred:** renewal radar (auto "Renew?" task for past_sponsor rows
  6 months before next event)

### Chunk 17 — Benefits tracking _(2026-05-09)_
- `companyBenefits` table with `benefit_status` enum
  (pending / in_progress / delivered / skipped)
- `instantiateBenefits` action — copies `tier.benefits` jsonb into per-prospect
  rows; idempotent by `benefitKey`; due dates computed from
  `event.startDate + tier.benefits[].defaultDueOffsetDays`
- `confirmEventCompany` auto-instantiates after successful confirm
- Drawer **Benefits tab** — list with status select, due-date display,
  delete, and "Instantiate" / "Sync from tier" buttons. Only renders when
  status is `confirmed` or benefits already exist.

### Chunk 14 — Background agents _(2026-05-09)_
- `agentSchedules`, `agentRuns`, `companySuggestions` tables
- `runDiscoveryNow` server action — Opus 4.7 + prospectus context →
  proposes 5–8 NEW candidate companies (skipping already-prospected)
- `acceptCompanySuggestion` — creates company + eventCompany on accept
- `dismissCompanySuggestion` — soft-rejects with audit trail
- `toggleAgent` — enable/disable Discovery + Watch agents per event
- `/admin/events/[id]/agents` page — toggle controls, manual run, suggestions
  inbox, recent run history with cost
- **Deferred:** Vercel cron wiring (manual run only); Watch agent
  implementation

### Chunk 13 — Prospectus ingest + on-demand AI enrichment _(2026-05-09)_
- 3 new tables: `prospectuses`, `enrichmentJobs`, `enrichmentSuggestions`
- Anthropic SDK + `@vercel/blob` direct uploads + `pdf-parse` text extraction
- `SearchProvider` interface with Valyu implementation (REST API)
- `enrichSingle` action — Sonnet 4.6 with prospect prompt, prospectus as
  ephemeral cached system context, daily spend cap (default $5)
- `acceptSuggestion` / `rejectSuggestion` — admin-reviewed; only writes to
  whitelisted outreach fields (whyTheyShouldAttend / keyTalkingPoints /
  emailAngle / sponsorshipHook)
- Drawer **AI tab** — pending suggestion count badge, source URLs,
  confidence display, accept/reject actions
- Drawer header **"Enrich with AI"** button
- `/admin/events/[id]/prospectus` — PDF upload (Blob), extracted text, delete
- All AI calls gate on `ANTHROPIC_API_KEY` / `VALYU_API_KEY` — no surprise
  costs without explicit env config

## v1.0 — Initial release (built then lost) (2026-05-08)

12-chunk build, fully shippable. Migrations 0000–0005.

### Chunk 12 — Playwright e2e + bundle polish
- `tests/e2e/` — auth, companies flow, multi-event smoke specs
- Dropped framer-motion (saved 40 kB on `/companies`); replaced cell flash
  with `@keyframes cell-flash` CSS animation
- Comprehensive README rewrite

### Chunk 11 — Audit page + soft-delete recovery + mobile polish
- `/admin/audit` — searchable + filterable by user/event/entity-type, JSON
  diff dumps, restore button on `*.soft_delete` rows
- `restoreEventCompany` / `restoreCompany` actions
- `BottomNav` for mobile (under `lg`)
- `error.tsx` + `loading.tsx` boundaries for the (app) segment
- `audit_log.changes` typed as `Record<string, unknown>`

### Chunk 10 — Dashboard + CSV import/export + admin tiers
- Dashboard with KPI strip · pipeline funnel · action items · pace
  histogram · owners · sponsorship targets · priority breakdown · hot
  prospects · stalled (>30d) · recent activity · my open tasks
- `/admin/events/[id]/tiers` CRUD
- `/admin/events/[id]/import` — NPPA workbook CSV wizard with dry-run
  preview + idempotent commit
- CSV export server action (active view, no pagination)

### Chunk 9 — ⌘K palette + global keyboard shortcuts
- Trigram functional indexes on contacts.fullName + tasks.title (manual
  migration 0005)
- `searchAll` query — parallel ILIKE across companies/contacts/tasks for
  active event
- `cmdk`-based palette: Records / Navigate / Switch event / Theme sections
- Shortcuts: `⌘K`, `?`, `g <d|c|p|t>` chord
- Cheat sheet modal

### Chunk 8 — Custom fields (per event) + Vercel Blob file uploads
- `customFieldDefinitions` + `attachments` tables, GIN on customFields jsonb
- `/admin/events/[id]/fields` — CRUD with 11 field types
- Direct-to-Blob client uploads via signed token route
- Drawer Files tab + file-type custom field cell
- About-tab "Custom" section appended when defs exist
- Cached per-event Zod registry that busts on mutation

### Chunk 7 — Kanban + `/pipeline`
- `@dnd-kit` board, 10 status columns, optimistic moves
- `moveEventCompanyStatus` action
- Drop-on-Confirmed modal: atomic `confirmedAmount` + `confirmedTierId` set

### Chunk 6 — Saved views + filter chips + sort
- `views` table; typed filter AST + Drizzle compiler (parameterized)
- 8 default views shipped per event (auto-seeded on event create)
- View sidebar (Default / Shared / My views), filter bar with chips,
  save-view dialog
- URL state encoding (`?view=...` or `?v=<encoded>`)

### Chunk 5 — Contacts + interactions + tasks + reviews
- `interactions`, `tasks`, `eventCompanyReviews` tables (migration 0002)
- Drawer Contacts / Activity / Tasks tabs
- Quick-log buttons (Email/Call/Meeting/Note) bump `lastContactedAt`
- ReviewerCell — Yes/No/clear popover; team-approved logic
- `InlineComplete` with `canvas-confetti` burst
- `/contacts` directory, `/tasks` page

### Chunk 4 — Inline-editable cells
- `CellShell` abstraction; 9 cell types built (text, longText, url,
  currency, date, checkbox, singleSelect, person, relation)
- Generic `updateField` server action with typed registry
- `quickAddEventCompany` row, `bulkUpdateEventCompanies` action
- BulkActionBar (status/priority/owner/admin-only delete)
- About tab fully editable

### Chunk 3 — Companies + eventCompanies + table + drawer skeleton
- 5 schema tables (migration 0001 with manual trigram + GIN appends)
- `eventCompanies` 33-column join with all prospecting fields
- TanStack Table v8 with density-aware row heights
- Slide-over drawer with About tab (read-only)
- Density toggle + theme toggle (next-themes) wired into top bar
- Seed extended with 4 sponsorship tiers + 15 fixture prospects

### Chunk 2 — Auth + admin + audit log
- `users`, `events`, `auditLog` (migration 0000)
- Auth.js v5 Credentials, JWT cookies, bcrypt cost 12
- Login page, middleware route protection
- `/admin/users` (invite/role/active/reset)
- `/admin/events` CRUD with reviewer panel
- TopBar event switcher, Sidebar with admin gate, UserMenu
- Seed creates admin + LPD 2026 event

### Chunk 1 — Foundation
- Next.js 15 + TypeScript strict + Tailwind v4 + shadcn primitives
- Drizzle wired to Neon
- Env validation (@t3-oss/env-nextjs)
- ESLint config, GitHub Actions CI

## Lessons learned (from the lost build)

- **Commit each chunk as it lands.** The whole build was lost because
  nothing was committed and the worktree was deleted. Default to "commit
  after every green build" going forward.
- **`pnpm` lives at `/Users/michaelthorn/.npm-global/bin/pnpm`** —
  prepend PATH for every Bash invocation.
- **`pnpm 11` requires `pnpm approve-builds --all`** once per machine for
  esbuild/sharp/unrs-resolver postinstall scripts. Configured in
  `package.json#pnpm.onlyBuiltDependencies` but the local approval cache
  is per-machine.
- **`types/next-auth.d.ts` must stay under `types/`** (not project root,
  not same name as a package).
- **JWT module augmentation must target `@auth/core/jwt`** — `next-auth/jwt`
  re-exports from there, but augmentation only sticks at the source module.
- **`experimental.typedRoutes` must be OFF during the chunked build** —
  routes are added one chunk at a time; safe to re-enable in a later polish
  chunk.
- **Drizzle migrations need manual SQL appends** for trigram extensions, GIN
  indexes, partial indexes. Add an entry to `_meta/_journal.json` so
  `db:migrate` picks them up. Do NOT use `db:push` — it bypasses manual
  appends.
- **Edit tool blocks writes to files not previously Read in the same
  session** — Read before Edit even after editing the file in earlier turns.
- **Dynamic import inside a server action** is a clean way to avoid
  circular module deps in actions that hook into other actions
  (e.g. `confirmEventCompany` → `instantiateBenefits`).
