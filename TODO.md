# TODO

Living roadmap. See `docs/SESSION-STATE.md` for the authoritative current
state including in-progress work and known bugs.

Latest shipped commit: `d756c6a` (chunk B) — deployed at `nppacrm.vercel.app`.

## Critical path: remaining setup

- [x] Rebuild from spec (chunks 1–19 complete)
- [x] Push to GitHub
- [x] Provision Neon + run migrations (0000–0009 applied)
- [x] Vercel project + env vars wired
- [x] Vercel Blob integration installed
- [x] First deploy live
- [x] Admin account created (mike@thorn.ooo)
- [x] `pnpm db:seed` run (LPD 2026 event + tiers + default views)
- [ ] **Connect Anthropic provider in Vercel AI Gateway** (unlocks AI enrichment)
- [x] `/admin/events/[id]/import` to bulk-load real Master List CSV
- [ ] **Custom domain** _(deferred — pending final name decision)_

## v1 chunks to rebuild (in order)

These were all built and verified before the worktree was deleted. Order is
load-bearing — chunk N depends on chunks 1..N-1.

- [x] Chunk 1 — Foundation (Next 15, TS strict, Tailwind v4, Drizzle/Neon, env validation, ESLint, CI)
- [x] Chunk 2 — Auth + admin shell + events + audit log (migration 0000)
- [x] Chunk 3 — Companies + eventCompanies + table + drawer skeleton (migration 0001)
- [x] Chunk 4 — Inline-editable cells (9 types)
- [x] Chunk 5 — Contacts + interactions + tasks + reviews (migration 0002)
- [x] Chunk 6 — Saved views + filter chips + sort (migration 0003)
- [x] Chunk 7 — Kanban + `/pipeline`
- [x] Chunk 8 — Custom fields + Vercel Blob file uploads (migration 0004)
- [x] Chunk 9 — ⌘K palette + global keyboard shortcuts (migration 0005)
- [x] Chunk 10 — Dashboard + CSV import/export + admin tiers
- [x] Chunk 11 — Audit page + soft-delete recovery + mobile polish
- [x] Chunk 12 — Playwright e2e + bundle polish (drop framer-motion)
      framer-motion was never reintroduced in the rebuild; nothing to drop.
      typedRoutes still off — every dynamic href would need a `Route` cast
      (14+ sites). Tracked under "Bundle / perf debt" below.

## v1.5 chunks to rebuild (after v1 + first deploy)

- [x] Chunk 13 — Prospectus ingest + on-demand AI enrichment (migration 0006)
      Built with AI SDK v6 + Vercel AI Gateway (model id strings) and Valyu
      web search. Needs manual `pnpm db:migrate` against prod after merge
      AND env keys (`AI_GATEWAY_API_KEY`, `VALYU_API_KEY`,
      optional `AI_DAILY_SPEND_CAP_USD=2`) before the AI features actually run.
- [x] Chunk 14 — Discovery agent (manual run, migration 0009) — Watch agent deferred to 14b
- [x] Chunk 17 — Benefits tracking (migration 0007 in this rebuild — was 0008
      in the original lost chunk plan, but ordering shifted since chunk 14
      hasn't been built yet)
      Auto-instantiates `tier.benefits` onto event_companies when a prospect
      hits `confirmed` via any of the four confirm paths (pipeline modal,
      kanban drag, inline status cell). Needs `pnpm db:migrate` after merge.
- [x] Chunk 18 — Proposal flow + cadence warnings (migration 0008 in
      this rebuild — ordering shifted from the original chunk plan)
      `markProposalSent` action sets proposal_url/sent_at/valid_until,
      flips status, bumps lastContactedAt, auto-creates 7-day follow-up
      task. Drawer header "Mark proposal sent" dialog. /companies Last
      contact cell tints amber at 14+ days, red at 30+ for active
      statuses. Needs `pnpm db:migrate` after merge.

## Post-v1 lettered chunks (new work on top of the rebuild)

- [x] **Chunk A — Medical design system** (2026-06-01)
  Dark slate sidebar, teal brand colour (`brand-600`), Inter font, refined
  typography and spacing throughout.

- [x] **Chunk B — Outreach intelligence & UX enrichment** (2026-06-01)
  Dashboard v2 (funnel chart, tier mix, hot prospects, richer KPIs), contact
  creation with company picker, task timeline view + New Task form with
  assignee, pipeline cards with last-contact age tinting, AI email draft
  action + modal in company drawer, "Discover" nav link in admin sidebar.

- [ ] **Chunk 14b — Watch agent + Vercel cron** _(in progress — see SESSION-STATE.md)_
  Watch agent (`lib/agents/watch.ts`) written but not yet committed.
  Still needs: `vercel.json`, `runWatchAgent` action, agents UI update,
  fix 3 bugs (unused import, UUID FK mismatch × 2), then typecheck/build/commit.

## v1.5 — never built (still on the wishlist)

Listed in approximate decreasing-leverage order.

- ~~**Per-event branding**~~ _(removed from scope 2026-05-28)_

- [x] **Chunk 19 — Reports page**
  - Conversion funnel (cumulative ever-reached counts + stage-to-stage %)
  - Owner leaderboard (companies, confirmed $, proposed $, interactions)
  - Tier mix (confirmed count + $ per tier; target counts)
  - Revenue rollup (confirmed / proposed / expected vs goal, gap, %)
  - Cadence breakdown (ok / amber 14+d / red 30+d)
  - Average days in stage (computed from audit_log move_status entries)
  - CSV export per section + full-summary export
  - **Deferred**: PDF export. Not shipped because it would pull a heavy
    headless-Chromium / pdf-lib dep for a feature your team can get with
    "Save as PDF" in the browser. Easy to add later if needed.

- ~~**Renewal radar**~~ _(removed from scope 2026-05-28)_

- [x] **Chunk 23 — Polish**
  - AND/OR filter toggle on filter-bar (connector between chips toggles
    global op; FilterAst.op is now "and"|"or", compiler handles both)
  - Sort on column headers (click cycles: off → asc → desc → off;
    sort icons use ArrowUp/Down/UpDown; pushes ?s= URL param)
  - Column-picker per session (Columns button in toolbar, ?col= URL param,
    pinned: companyName always visible)
  - "Pending Team Review" hasPendingReview field with is_true/is_false
    operators backed by EXISTS subquery on event_reviewers
  - Deferred: drag-reorder of views/fields, Recharts pace chart upgrade

- [ ] **Chunk 22 — More custom-field types**
  - multiSelect, datetime, rating, person, relation
  - Surface custom fields as TABLE COLUMNS (drawer-only in chunk 8)
  - Custom-field filter operators in the FilterBar
    (`field: 'custom:fieldKey'` with type-aware jsonb predicates)

- [ ] **Chunk 20 — Notification center**
  - Bell icon in top bar
  - `notifications` table + dropdown UI
  - Triggers: `@mentions` (needs TipTap first), task assignments, status
    changes on owned companies

- [ ] **Chunk 14b — Watch agent + Vercel cron wiring**
  - Discovery agent shipped in chunk 14 (manual run only); the Watch agent
    schedule slot existed but the agent itself was just sketched
  - Need Vercel cron wiring (or Vercel Workflow for durable execution)
  - Watch monitors existing prospects for news / leadership / fundraising
    signals via Valyu, surfaces as enrichment suggestions

- [ ] **Chunk 15 — TipTap rich notes**
  - Replace `interactions.body`, `tasks.description` text columns with
    jsonb TipTap docs
  - Add `companies.notesDoc` for long-form notes
  - Slash commands, `@` mentions (powers chunk 20), `#` linked records,
    autosave on debounce

- [ ] **Chunk 16 — Calendar + Gallery views**
  - New view kinds in the existing saved-views machinery
  - Calendar for tasks (by due) / interactions (by occurredAt) / companies
    (by nextActionAt)
  - Gallery card grid for visual browsing

- [ ] **Chunk 21 — Real-time presence + Pusher**
  - Flip `REALTIME_ENABLED=true`, wire Pusher creds
  - Avatar dots on open records
  - Cell flash on remote edit
  - Lock indicator while another user is editing
  - Re-uses existing optimistic-UI plumbing — adapter pattern

## v2 — later

From the original spec's "v2 (later)" list, never chunked:

- [ ] Email send + IMAP sync (Resend)
- [ ] Google Calendar sync
- [ ] Workflow automations (when X happens, do Y)
- [ ] Public read-only share links
- [ ] Custom objects beyond the built-ins
- [ ] Two-factor auth
- [ ] Multi-conference / multi-tenant accounts (separate orgs)
- [ ] Sequences / playbooks
- [ ] Custom dashboards

## Bundle / perf debt (carried over from the lost build)

- [ ] `/companies` is 240 kB First Load JS — 40 kB over target
  - Biggest weight: the cell editor module (~12 cells loaded eagerly)
  - Remediation: `next/dynamic` import per cell type so only used cells load
- [ ] Re-enable `experimental.typedRoutes` in `next.config.ts` after
      chunk 12 (was off during the chunked build because chunks 3–11 added
      routes one-by-one)
- [ ] Migrate `next lint` → `eslint .` flat config (Next 16 deprecation)

## Operational

- [ ] One-time `pnpm approve-builds --all` per machine (configured in
      `package.json#pnpm.onlyBuiltDependencies` but local approval is
      per-machine)
- [ ] Decide retention for `agentRuns` and `enrichmentJobs` (currently
      indefinite — could grow if agents run daily)
- [ ] Document Anthropic + Valyu API key rotation policy
