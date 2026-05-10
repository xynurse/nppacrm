# Sponsorship CRM

A modern, password-protected CRM purpose-built for managing sponsor outreach
across multiple healthcare conferences. Spreadsheet-first, inline-editable,
drawer detail, ⌘K palette. Multi-event from day one. Built for Mayo Clinic's
**Leadership & Professional Development for NPs & PAs** program and any future
event the team takes on.

> ⚠️ **Project status.** A full v1 + most of v1.5 was built across an 18-chunk
> session in the `claude/kind-banach-f3fa4b` worktree (2026-05-08 → -09). That
> worktree was deleted before any commits landed, so the code is no longer in
> the repo. The architectural decisions, schema, chunked plan, and lessons
> learned are preserved here in [CHANGELOG.md](CHANGELOG.md), [TODO.md](TODO.md),
> and [docs/RESUME-PROMPT.md](docs/RESUME-PROMPT.md). The product spec at
> [docs/sponsorship-crm-build-prompt.md](docs/sponsorship-crm-build-prompt.md)
> is unchanged from before the build started.
>
> **Top priority:** rebuild from the spec, this time committing each chunk as
> it lands. The chunked plan in CHANGELOG is the proven ordering.

## Documentation map

- Spec: [docs/sponsorship-crm-build-prompt.md](docs/sponsorship-crm-build-prompt.md)
- What was built (and lost): [CHANGELOG.md](CHANGELOG.md)
- Roadmap + rebuild checklist: [TODO.md](TODO.md)
- Resume prompt for new sessions: [docs/RESUME-PROMPT.md](docs/RESUME-PROMPT.md)
- Conventions for Claude Code: [CLAUDE.md](CLAUDE.md)

## Purpose

Replace a 312-row Excel "Sponsor Tracker" workbook used by a 3-person admin
team. The workbook tracked one conference at a time across ~24 industry
categories; the CRM scales that up to a real multi-event tool with role-based
auth, audit trail, AI-assisted prospect research, and sponsor-workflow
automation.

The product is opinionated:
- **Spreadsheet-first.** The table is the primary surface, not a form view.
- **Inline editable.** Click any cell and type; save-on-blur with optimistic
  UI and rollback on failure.
- **Drawer detail.** Click a row title to open a slide-over with full record;
  the table stays in view behind it.
- **Keyboard driven.** ⌘K palette, `g <x>` navigation chord, `?` cheat sheet.
- **Multi-event aware.** Companies + contacts are global; the prospecting
  record is event-scoped.

## Functionality (target shape)

| Surface | What it does |
|---|---|
| `/` Dashboard | KPI strip · pipeline funnel · action items · pace histogram · owners · target tiers · priority · hot prospects · stalled (>30d) · recent activity · my open tasks |
| `/companies` | TanStack Table with inline-editable cells, saved views sidebar, filter chips; slide-over drawer with About / Contacts / Activity / Tasks / Files / Benefits / AI tabs |
| `/contacts` | Cross-company directory; deep-link to drawer |
| `/tasks` | Open + Completed sections for active event with confetti complete |
| `/pipeline` | `@dnd-kit` kanban, 10 status columns; drop on Confirmed opens atomic amount + tier modal |
| `/admin/users` | Invite, role, deactivate, reset password |
| `/admin/events` | CRUD + reviewer panel; per-event sub-pages: tiers · custom fields · CSV import · AI prospectus · agents |
| `/admin/audit` | Filterable log of every mutation, soft-delete recovery |

## Features

### v1 (chunks 1–12 — built then lost)
- **Multi-event** — one CRM, many conferences. Companies global; prospecting
  data event-scoped.
- **Auth** — Auth.js v5 Credentials, JWT cookies, bcrypt cost 12, role-gated
  admin routes.
- **Inline cells** — 11 types (text, long-text, number, currency, date,
  single-select with badges, person, relation, URL, email, phone, checkbox,
  file). Generic action with typed Zod registry; full audit log.
- **Drawer** — slide-over with 7 tabs; quick-log (Email/Call/Meeting/Note)
  bumps `lastContactedAt`.
- **Saved views** — typed filter AST, type-aware operators, parameterized
  Drizzle predicates. 8 default views per event: All Prospects · My Pipeline
  · Hot Prospects · Stalled (>30d) · Confirmed Sponsors · Past Sponsors ·
  Needs Follow-up · Confirmed - Payment Pending.
- **Reviewer panel** — N reviewers per event vote Yes/No on each prospect;
  "team approved" KPI when all said yes.
- **Custom fields** — per-event definitions for 11 field types; GIN-indexed
  jsonb storage.
- **Kanban** — drag between statuses, drop on Confirmed → modal captures
  amount + tier atomically.
- **Files** — Vercel Blob direct uploads (signed token).
- **⌘K palette** — fuzzy trigram search, 4 sections: Records / Navigate /
  Switch event / Theme.
- **Dashboard** — mirrors the workbook's KPI grid + adds pace histogram.
- **CSV import** — NPPA workbook column-aware mapper with dry-run preview;
  idempotent commit; splits each Master List row into companies +
  eventCompanies + contacts.
- **CSV export** — runs the active view filter sans pagination.
- **Audit log + soft-delete recovery** — every mutation is recorded; admins
  can restore deleted prospects.
- **Mobile** — bottom nav, full-width drawer.
- **Polish** — error boundaries, density-aware skeleton loaders, dark/light/
  system theme.

### v1.5 (chunks 13–14, 17–18 — built then lost)
- **AI prospectus + on-demand enrichment** — admin uploads the conference
  prospectus PDF; the system extracts text and prompt-caches it as grounding
  context. Per-prospect "Enrich with AI" button uses Sonnet 4.6 + Valyu web
  search to draft the four outreach fields. All suggestions land in a queue
  for admin review with source URLs and confidence scores. Daily spend cap.
  Nothing auto-applies without an admin click.
- **Background discovery agent** — given the prospectus + already-prospected
  list, Opus 4.7 suggests 5–8 NEW candidate companies. One-click adds the
  suggestion as a fresh prospect.
- **Benefits tracking** — when a prospect hits Confirmed, the system
  auto-instantiates a checklist from `tier.benefits` with computed due dates.
  Drawer Benefits tab tracks delivery status.
- **Proposal flow** — "Mark proposal sent" dialog captures URL + valid-until,
  bumps last contact, auto-creates a 7-day follow-up task.
- **Cadence warnings** — Last contact column tints amber at 14+ days, red at
  30+ (only for active prospect statuses).

See [TODO.md](TODO.md) for the full v1.5 + v2 backlog.

## Stack (target)

Next.js 15 (App Router) · TypeScript strict · Drizzle + Neon Postgres ·
Auth.js v5 · Tailwind v4 + shadcn-style primitives · TanStack Table v8 ·
`@dnd-kit` · cmdk · sonner · Vercel Blob · canvas-confetti · Anthropic SDK ·
pnpm.
