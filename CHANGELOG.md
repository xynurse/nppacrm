# Changelog

## Active build (committed to main)

### Mayo Clinic NPPA LPD 2026 outreach batch _(2026-07-13, data-only, no code change)_
Applied via `/sync-outreach` against prod (65 companies, all matched exactly):
- **24 emails sent** → `email` interaction, status `prospect→contacted`, first +
  last contacted stamped 2026-07-13.
- **7 bounced** → bounce `email` interaction + existing **`BOUNCED` tag**;
  status and last-contact left untouched (a bounce isn't a real contact).
- **34 deferred** → `note` interaction + **new `DEFERRED` tag** on `tagsCache`;
  status left at `prospect`.
- **New `DEFERRED` tag convention** — a workflow flag for prospects intentionally
  held this batch, modeled as a tag (not a `prospect_status` enum value) so it
  overlays the pipeline without a migration and keeps them in the funnel count.
  Filterable via `tags contains DEFERRED`.

### Deferred-prospect UI _(2026-07-13, code commit)_
Visual parity with the Bounced suite, mirroring that pattern file-for-file.
- **Violet "Deferred" badge** (`DeferredBadge` + `hasDeferredTag` in
  `status-badge.tsx`, `Clock` icon) shown wherever a company appears — companies
  table name cell, kanban cards, and the drawer header — when it carries the
  `DEFERRED` tag. Rendered as its own violet pill in the Tags column too.
- **Dashboard pipeline funnel** gains a violet "Deferred" overlay bar (below the
  Bounced bar, shown only when > 0) linking to the filtered list;
  `getDashboardMetrics` now also returns `deferredCount`.
- Violet was chosen because it's unused by any status hue, so Deferred stays
  visually distinct from both the red Bounced badge and every stage pill.

### Bounced-email tracking _(2026-07-09, commits cdfc16e · 85abac1 · a0cca97)_
End-to-end handling of outreach that comes back undeliverable, built on a
`BOUNCED` tag (lives in `eventCompanies.tagsCache`; `tags` row + `companyTags`
link created too). Applied to 33 companies so far via the `/sync-outreach`
flow (data-only).
- **Red "Bounced" badge** (`BouncedBadge` + `hasBouncedTag` in
  `status-badge.tsx`) shown wherever a company appears — companies table name
  cell, pipeline cards, and the drawer header — when it carries the tag.
- **Tags column** on the companies table (toggleable, on by default) renders
  `tagsCache` as pills (BOUNCED in red, others neutral).
- **Tags filter** field — `contains` / `equals` / `is empty` / `is not empty`,
  compiled against the `tagsCache` array (`unnest`, case-insensitive) in
  `compile.ts`. "tags contains BOUNCED" → exactly the bounced companies.
- **Dashboard pipeline funnel** gains a red "Bounced" overlay bar (below the
  status bars, divider-separated, shown only when > 0) linking to the filtered
  list; `getDashboardMetrics` now returns `bouncedCount`.
- Undeliverable outreach also logs an `email` interaction marked UNDELIVERABLE
  and (for the first bounce batch) a "Replace undeliverable email" follow-up
  task. Bounces never advance status or bump last-contact — a bounce isn't a
  real contact.

### Contact email history — capture + archive old emails _(2026-07-09, commit e353f9c)_
- When a contact's email is changed or cleared, the **previous** address is now
  retained instead of being silently overwritten. New `contact_email_history`
  table (**migration 0010 — apply manually**) stores the old email, who changed
  it, and when. `contacts.email` remains the single current address.
- `updateContact` archives the old email on any real change (case/whitespace-
  insensitive compare, matching the citext column); the archive insert is
  best-effort so it can never block saving the contact.
- The company drawer's Contacts tab shows a struck-through "Previous email(s)"
  list under each contact, with when it was archived and by whom
  (`listEmailHistoryForCompany`, wired into both `/companies` and `/pipeline`
  drawers).
- Both the read and write **degrade gracefully** (empty list / skip archive) if
  the migration isn't applied yet, guarded on Postgres error `42P01` — verified
  against prod — so deploying ahead of the manual migration is safe.
- Scope was intentionally minimal: no multi-email model, no one-click restore
  (per the chosen scope); those can be added later.

### Platform UX pass — search + drill-downs + event page _(2026-07-09)_
Four self-contained UX chunks (commits `2c35b90`, `93bb3d7`, `c0c7608`,
`b1357b5`). All typecheck + lint + build green; DB-touching logic verified
with throwaway read-only scripts against prod.

- **Inline keyword search on Companies & Contacts.** New debounced
  `components/ui/search-input.tsx` drives a `q` URL param; server components
  re-query, so results update as you type (no client filtering) and coexist
  with saved views/filters. `listEventCompanies` matches `q` wide — company
  name/website/industry/HQ/description, company + event tags, outreach/notes
  fields, and the company's contacts (name/email/title) via an EXISTS
  subquery; multi-term is AND-of-terms, OR-of-fields, with LIKE wildcards
  escaped. `listContactsForEvent` matches name/email/title/phone/company.
- **Pipeline search + edit-in-place.** Client-side filter box on the kanban
  (company/owner/tier/tag). The company drawer now opens on `/pipeline`
  itself (cards link to `/pipeline?record=`; `CompanyDrawer` gained a
  `closeHref` prop). Board state syncs to server refreshes so drawer edits
  and drag persistence reflect immediately.
- **Clickable dashboard boxes.** The static KPI cards and section headers now
  drill into the matching view (confirmed list, /pipeline, stalled filter,
  per-status funnel, /reports, hot-prospects filter, task drawers). The old
  funnel/stalled links used params the companies page never read and silently
  did nothing — replaced with real `f`-param filters (counts verified against
  the dashboard's own numbers).
- **Event profile page.** New `/event` route + "Event" sidebar item. Shows
  event metadata + countdown, fundraising target vs goal, prospects-by-stage,
  sponsorship tiers & targets, team leaderboard, outreach cadence health,
  average days-in-stage, and the reviewer roster — all from existing report
  queries.
- **Bug fix (`lib/views/compile.ts`):** the `is_one_of` filter operator
  compiled to `col = ANY((a,b,c))`, which Postgres parses as a row
  constructor and rejects ("op ANY/ALL (array) requires array on right
  side"). Now compiles to `col IN (...)`. This also fixes the existing
  companies filter UI, which crashed whenever a user picked "is any of".

### Chunk C — Natural-language "AI quick update" _(2026-07-08, commit fdddf09)_
- In-app version of the `/sync-outreach` Claude Code skill. Paste a plain-English
  outreach recap; Claude proposes whitelisted, structured CRM updates per matched
  company; the user reviews individually-toggleable diff cards; accepted items are
  written through the **existing** server actions so audit rows, validation, and
  cache revalidation all come for free. Nothing is written until Apply.
- `lib/ai/nl-update.ts` — model layer (Zod proposal schema + `runNlUpdate`),
  mirroring `lib/ai/gateway.ts`. Whitelisted ops only: `set_status`,
  `log_interaction`, `bump_last_contacted`, `set_next_action_at`, `create_task`.
  Never deletes, never writes amount/tier; unknown company mentions go to
  `unmatched` instead of being guessed. Uses `AI_MODEL_ID` (currently Opus 4.7).
- `lib/actions/nl-update.ts` — `proposeNlUpdate` (read-only: AI-config gate +
  daily spend-cap pre-flight, loads the active event's prospects, drops
  hallucinated ids, audit `ai.nl_update_propose`) and `applyNlUpdate`
  (re-validates the whitelist server-side, dispatches to
  `moveEventCompanyStatus` / `logInteraction` / `updateField` / `createTask`,
  batch audit `ai.nl_update_apply`). `confirmed` is skipped and routed to the
  pipeline confirm modal so amount + tier + benefits stay atomic.
- `components/ai/nl-update-dialog.tsx` — input → loading → toggleable review
  cards + unmatched warnings → apply → per-company summary.
- `components/ai/nl-update-box.tsx` — dashboard entry box (parses on submit).
- Wired into the ⌘K palette (Actions group) and the dashboard header.
- No DB migration. typecheck + lint + build green. Read-only propose path
  verified end-to-end against the live gateway; the write path and live model
  output need the AI provider enabled **with credits** in Vercel (the gateway
  currently returns `403 byok_requires_paid_credits` — same prereq that gates
  enrichment / email-draft / agents).

### Admin password recovery script _(2026-07-02)_
- `scripts/reset-admin-password.ts` — resets a user's password by email
  (bcrypt cost 12, matching the seed). For recovering admin access when the
  original `SEED_ADMIN_PASSWORD` is lost — it's stored as a Vercel *sensitive*
  env var, so it can't be read back. Run manually:
  `RESET_EMAIL=… RESET_PASSWORD=… pnpm tsx scripts/reset-admin-password.ts`.
  Targets whatever `DATABASE_URL` points at; no plaintext is ever stored.

### UI polish phase 2 + view/filter quick wins _(2026-07-02)_
- **Elevation system** (`app/globals.css`): three shadow tiers
  (`--shadow-card`/`--shadow-raised`/`--shadow-overlay`, dark-aware),
  `--ease-out-soft` easing, and `surface-card`/`surface-card-hover`/`kbd-chip`
  utilities. Dashboard cards, tables, drawer, palette, and dialogs now share
  one consistent depth language.
- **Dark-mode toggle fixed**: `dark:` variants and the semantic CSS vars were
  keyed to `prefers-color-scheme`, but next-themes toggles a `.dark` class —
  the in-app theme toggle did nothing. Added `@custom-variant dark` and moved
  the var/body overrides to `.dark`, so light/dark/system all work.
- **Primitives**: Button gains a `loading` prop (spinner + disable), press
  scale, hover elevation; Input/Select get soft focus glow (brand ring + border)
  and hover border states.
- **Chrome**: sidebar active nav is now a teal left-indicator + subtle tint
  (was a solid block); top bar has a hairline shadow.
- **Tables**: inline-edit cells show a pencil affordance + brand tint on hover
  and a ring while editing; rows get a hover accent rail; richer empty state
  with icon and guidance.
- **Kanban**: cards lift on hover, drop-target columns glow teal, empty
  columns invite a drop.
- **Command palette / cheat sheet**: overlay shadow + scale-in, teal accent bar
  on the selected item, `kbd-chip` hints.
- **Drawer**: overlay shadow + eased slide, brand-underline tabs, and the
  Outreach section is now an accented "Outreach strategy" card (gradient tint +
  sparkles) so AI-enriched content stands out.
- **New filter operator `older_than_n_days`** (types, zod schema, compiler,
  filter bar). Fixes the seeded "Stale (no contact 14+ days)" view, which used
  `last_n_days` and matched *recently contacted* companies — the opposite of
  stale. Replaced by "Needs follow-up (14+ days)" (existing DBs keep the old
  view; delete it manually and re-run seed, or recreate via the filter bar).
- **`proposalValidUntil` is now filterable/sortable** + new default view
  "Proposals expiring soon" (proposal_sent/negotiating with proposal expiry in
  the next 14 days).
- **Shortcuts**: `/` opens the palette, `g r` → Reports; cheat sheet updated.

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
