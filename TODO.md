# TODO

Living roadmap. As of 2026-05-09 the repo is at the original `3ce6b96` commit
— spec only, no code. The 18-chunk build that happened earlier was lost when
the worktree got deleted before any commits landed. See [CHANGELOG.md](CHANGELOG.md)
for what was built and lost.

## Critical path: rebuild + first deploy

- [ ] **Decide commit policy.** Recommend: "commit after every green build"
      as the default, with a single confirm at the start of each session.
      The previous policy ("commit only when explicitly asked") cost us
      18 chunks of work. The CLAUDE.md rule should be relaxed for this
      project.
- [ ] **Rebuild from spec.** Use [docs/sponsorship-crm-build-prompt.md](docs/sponsorship-crm-build-prompt.md)
      as the source of truth. Follow the chunk ordering in
      [CHANGELOG.md](CHANGELOG.md) — that ordering is proven to compile
      cleanly through chunk 18.
- [ ] **Per-chunk verification:** `tsc --noEmit` + `next lint` + `next build`
      green, then commit, then move on.
- [ ] Push to GitHub (`xynurse/sponsorship-crm` already exists).
- [ ] Provision Neon (or install the Neon-Vercel integration —
      auto-provisions per-preview DB branches).
- [ ] `pnpm db:migrate` against prod Neon URL.
- [ ] Vercel project setup (`vercel link`, env vars, framework auto-detect).
- [ ] Set Vercel env: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`,
      `AUTH_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, optionally
      `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `VALYU_API_KEY`.
- [ ] Install Vercel Blob integration (auto-injects token).
- [ ] First deploy → preview URL.
- [ ] One-time `pnpm db:seed` against prod (creates admin + LPD 2026 + tiers
      + default views).
- [ ] `/admin/events/[id]/import` to bulk-load real Master List CSV.
- [ ] **Custom domain** _(deferred 2026-05-25 — pending final name decision)_
      Attach a real domain (e.g. `crm.nppa.org`, `sponsors.…`, etc.) via
      Vercel → Project → Settings → Domains so we stop sharing
      `nppacrm.vercel.app` with the team. Includes DNS records + automatic
      SSL. No code change needed.

Skill suggestions for ship: `vercel:bootstrap` then `vercel:deploy`.

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
- [ ] Chunk 14 — Background agents (Discovery + Watch — manual run only at first)
- [x] Chunk 17 — Benefits tracking (migration 0007 in this rebuild — was 0008
      in the original lost chunk plan, but ordering shifted since chunk 14
      hasn't been built yet)
      Auto-instantiates `tier.benefits` onto event_companies when a prospect
      hits `confirmed` via any of the four confirm paths (pipeline modal,
      kanban drag, inline status cell). Needs `pnpm db:migrate` after merge.
- [ ] Chunk 18 — Proposal flow + cadence warnings (migration 0007)

## v1.5 — never built (still on the wishlist)

Listed in approximate decreasing-leverage order.

- [ ] **Per-event branding** _(new — captured 2026-05-25)_
  - Each event row gets `brandColor` + `logoUrl`; active event drives top-bar
    logo and accent CSS variables. Lets us white-label LPD vs. future events.
  - Depth not decided yet — start with logo + one accent color; can expand
    to full color system later.
  - ~half day for logo + accent; ~1–2 days for full color system w/ admin UI.

- [ ] **Chunk 19 — Reports page**
  - Conversion rates per stage
  - Average days in stage
  - Owner leaderboard (companies, $ confirmed, interactions logged)
  - Tier mix vs goal
  - PDF / CSV export
  - Roughly the size of chunk 10's dashboard work

- [ ] **Renewal radar** _(deferred from chunk 18)_
  - Admin button "Generate renewal tasks" — for every prospect with
    `status=past_sponsor` in past events, create a task for the previous
    owner due 6 months before the active event's `startDate`
  - ~30 lines: 1 server action + 1 button on `/admin/events/[id]`

- [ ] **Chunk 23 — Polish**
  - AND/OR filter groups (chunk 6 AST is flat AND only)
  - Sort UI on column headers (compiler supports it; no UI binding)
  - Column-picker per saved view
  - Drag-reorder of views and field definitions
  - "Pending Team Review" default view (needs special "any null reviewer
    vote" operator in the filter compiler)
  - Recharts pace chart upgrade

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
