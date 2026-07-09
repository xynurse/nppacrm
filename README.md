# Sponsorship CRM

A modern, password-protected CRM purpose-built for managing sponsor outreach
across multiple healthcare conferences. Spreadsheet-first, inline-editable,
drawer detail, ⌘K palette. Multi-event from day one. Built for Mayo Clinic's
**Leadership & Professional Development for NPs & PAs** program and any future
event the team takes on.

## Status

**Live at `nppacrm.vercel.app`.** v1 + v1.5 rebuild (chunks 1–19) are
committed and deployed, plus AI enrichment/agents (chunks 13–14b), a
natural-language "AI quick update", and a 2026-07-09 UX + data-quality pass
(inline search, event profile page, pipeline edit-in-place, dashboard
drill-downs, contact email history, and bounced-email tracking). The real
Master List (312 prospects) is loaded. See [TODO.md](TODO.md) for the backlog
and [docs/SESSION-STATE.md](docs/SESSION-STATE.md) for the authoritative
current state.

> **Pending prod migration:** `0010` (contact email history) is committed but
> not yet applied — run `pnpm db:migrate` against prod. The code degrades
> gracefully until then.

A prior session built the full v1 + most of v1.5 across 18 chunks in a
worktree that was deleted before any commits landed. This repo is the
ground-up rebuild, committing after every green build so it can't happen
again. The historical chunked plan is preserved in [CHANGELOG.md](CHANGELOG.md).

## Documentation map

- Spec (source of truth): [docs/sponsorship-crm-build-prompt.md](docs/sponsorship-crm-build-prompt.md)
- Roadmap + rebuild checklist: [TODO.md](TODO.md)
- Conventions for Claude Code: [CLAUDE.md](CLAUDE.md)
- What was built in the original v1.5 (and what's left to rebuild): [CHANGELOG.md](CHANGELOG.md)
- Resume prompt for new sessions: [docs/RESUME-PROMPT.md](docs/RESUME-PROMPT.md)

## Stack

Next.js 15 App Router · TypeScript strict · Drizzle + Neon Postgres ·
Auth.js v5 (Credentials) · Tailwind v4 + shadcn-style primitives ·
TanStack Table v8 · `@dnd-kit` · cmdk · Vercel Blob · Playwright · pnpm.

## What's shipped

| Surface | What it does |
|---|---|
| `/` Dashboard | KPI strip (clickable drill-downs) · pipeline funnel with a red **Bounced** overlay bar · fundraising goal · tier mix · hot / stalled prospects · recent activity · my open tasks |
| `/event` | Event profile: dates + countdown, fundraising target vs goal, prospects-by-stage, tiers & targets, team leaderboard, outreach cadence health, avg days-in-stage, reviewers |
| `/companies` | TanStack Table with inline-editable cells, **inline keyword search** (wide match incl. contacts), saved views, filter chips, **Tags column + filter**; slide-over drawer (Overview / Contacts / Activity / Tasks / Benefits / AI). Contacts tab shows archived **previous emails**; bounced companies show a **Bounced** badge |
| `/contacts` | Cross-company directory with keyword search; deep-link to drawer |
| `/tasks` | Open + Completed sections, filter chips |
| `/pipeline` | `@dnd-kit` kanban with a keyword filter; click a card to open/edit the drawer in place; drop on Confirmed opens the atomic amount + tier modal |
| `/admin/users` | Invite, role, deactivate, reset password |
| `/admin/events` | CRUD + reviewer panel; per-event sub-pages: tiers · custom fields · CSV import · prospectus · AI agents |
| `/admin/audit` | Filterable audit log, soft-delete recovery |

AI features (Vercel AI Gateway + Valyu search): on-demand prospect enrichment,
email drafting, discovery + watch agents, and a natural-language "AI quick
update" on the dashboard. They no-op cleanly until the provider is enabled
with credits.

**Bounced-email tracking:** outreach that bounces gets a `BOUNCED` tag →
red badge, a Tags filter, a dashboard funnel bar, and a follow-up task.

Product principles:
- **Spreadsheet-first.** The table is the primary surface, not a form view.
- **Inline editable.** Click any cell and type; save-on-blur with optimistic
  UI.
- **Drawer detail.** Click a row title to open a slide-over with the full
  record; the table stays in view behind it.
- **Keyboard driven.** ⌘K palette, `g <x>` navigation chord, `?` cheat sheet.
- **Multi-event aware.** Companies + contacts are global; the prospecting
  record is event-scoped via `eventCompanies`.
- **Mobile responsive.** Bottom nav under `lg`; pages and drawer adapt.
- **Audited.** Every mutation writes an `audit_log` row; admins can restore
  soft-deleted prospects from `/admin/audit`.

## Local development

```sh
pnpm install
cp .env.example .env.local      # fill in the required vars below
pnpm db:migrate                 # apply Drizzle migrations
pnpm db:seed                    # create first admin + LPD 2026 + tiers + default views
pnpm dev                        # http://localhost:3001
```

Required env vars (see [.env.example](.env.example) for the full list):

- `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — Neon Postgres connection strings
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_URL` — e.g. `http://localhost:3001`
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — first admin created by `db:seed`

Optional:
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (file uploads)
- `AI_GATEWAY_API_KEY` (+ `AI_MODEL_ID`) / `VALYU_API_KEY` — AI enrichment,
  agents, and the NL quick-update. No-op cleanly when absent; in prod they
  need the provider enabled **with credits** in the Vercel AI Gateway tab.
- `CRON_SECRET` — required in prod for the discovery/watch cron routes

## Quality gates

```sh
pnpm typecheck    # tsc --noEmit (strict)
pnpm lint         # next lint
pnpm build        # next build
pnpm test         # Playwright smoke specs (see below)
```

The CLAUDE.md policy is to commit after every green `typecheck + lint + build`.

## End-to-end tests

Playwright smoke specs live in [tests/e2e/](tests/e2e/) and cover:
- `auth.spec.ts` — login redirects, bad password, successful sign-in lands on
  the dashboard
- `companies.spec.ts` — `/companies` table renders, ⌘K palette opens / closes
- `multi-event.spec.ts` — top-bar event switcher exposes active events;
  `/admin/events` reachable

```sh
pnpm test:install         # one-time: download chromium binary
pnpm db:migrate && pnpm db:seed
pnpm test                 # auto-starts pnpm dev, runs headless
pnpm test:ui              # Playwright UI mode for debugging
```

The Playwright config boots `pnpm dev` on port `3001` automatically. The
tests reuse `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` to sign in. Set
`PLAYWRIGHT_NO_SERVER=1` to skip the auto-server when you already have one
running.

## Deploy

See the "Critical path: rebuild + first deploy" section in
[TODO.md](TODO.md). The short version:

1. Link a Neon project (or install the Neon-Vercel integration for
   per-preview DB branches).
2. `vercel link`, set env vars (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
   `AUTH_SECRET`, `AUTH_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`).
3. Install the Vercel Blob integration (auto-injects `BLOB_READ_WRITE_TOKEN`).
4. `pnpm db:migrate` against the prod Neon URL.
5. First deploy → preview URL.
6. One-time `pnpm db:seed` against prod (creates admin + LPD 2026 + tiers +
   default views).
7. `/admin/events/[id]/import` to bulk-load the Master List CSV.

## Project layout

```
app/
  (app)/            Authenticated app shell (sidebar + topbar + bottom nav)
    admin/          Admin-only routes (events, users, audit, per-event sub-pages)
    companies/      Spreadsheet view with drawer
    contacts/       Cross-company directory
    pipeline/       Kanban
    tasks/          Tasks list
    layout.tsx      Auth gate + chrome
  (auth)/login/     Login form
  api/              Auth + Blob upload routes
components/
  admin/            Admin-only widgets (events table, audit table, etc.)
  app/              Chrome (sidebar, top bar, bottom nav, theme/density)
  cells/            Inline cell editors (9 types)
  command/          ⌘K palette
  companies/        Companies table + drawer
  contacts/ interactions/ pipeline/ tasks/ views/  per-domain widgets
  ui/               Primitives (button, input, label, select)
lib/
  actions/          Server Actions, one file per domain
  auth/             Auth helpers (requireSession, requireAdmin)
  db/
    schema/         Drizzle table definitions, one file per object
    queries/        Read paths, one file per object
    migrations/     SQL + journal (managed by drizzle-kit + manual appends)
    seed.ts         First-run admin + default event + tiers + saved views
  views/            Saved-view filter AST + compiler
tests/e2e/          Playwright smoke specs
types/              Type augmentations (next-auth.d.ts)
```

## Contributing

Read [CLAUDE.md](CLAUDE.md) first. Highlights:
- pnpm only (no npm / yarn)
- Server Actions for mutations; queries in `lib/db/queries/`
- Every mutation writes an `audit_log` row
- Soft delete only on `companies` + `event_companies`
- Commit on `main` after every green `typecheck + lint + build`
