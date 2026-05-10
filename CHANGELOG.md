# Changelog

> ⚠️ **Historical reference.** This log documents the 18-chunk build that
> happened in the `claude/kind-banach-f3fa4b` worktree on 2026-05-08 to -09.
> That worktree was deleted before any commits landed; none of the code below
> is in the repo right now. The architectural decisions, schema shape, and
> chunked ordering are preserved here for the rebuild.

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
