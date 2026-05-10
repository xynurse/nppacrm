# Sponsorship CRM — Claude Code instructions

## What this project is
A modern, password-protected CRM for managing sponsor outreach for Leadership & Professional Development for NPs & PAs.
Design philosophy: spreadsheet-first, inline-editable, drawer detail, ⌘K palette.
References: Attio, Twenty, Linear, Notion.
Full spec: `docs/sponsorship-crm-build-prompt.md`. Project status, what was
built and lost, and the chunk-by-chunk rebuild plan: `README.md`,
`CHANGELOG.md`, `TODO.md`. Resume prompt for new sessions:
`docs/RESUME-PROMPT.md`.

## Stack — do not deviate without asking
- Next.js 15 App Router, TypeScript strict, Server Actions for mutations
- Neon Postgres via `@neondatabase/serverless`
- Drizzle ORM + drizzle-kit
- Auth.js v5 Credentials, JWT cookies, bcrypt cost 12
- Tailwind + shadcn/ui + Radix + lucide-react
- TanStack Table v8 for all tables
- cmdk for ⌘K
- TipTap for rich text
- Pusher Channels for real-time (gated on REALTIME_ENABLED)
- Vercel Blob for files
- sonner for toasts
- Framer Motion for transitions

## Conventions
- pnpm for package management. No npm or yarn.
- All mutations go through Server Actions, not API routes (unless a third party requires a webhook).
- Zod schemas live in `lib/schemas/` and are imported by both client forms and server actions.
- Database queries live in `lib/db/queries/` (one file per object). Never query DB from a component directly.
- UI components go in `components/`. Shared primitives in `components/ui/` (shadcn). Domain-specific in `components/companies/`, `components/contacts/`, etc.
- File names: kebab-case for files, PascalCase for components, camelCase for functions.
- All money stored as Postgres `numeric(14,2)`, never as a JS number — use `decimal.js` for arithmetic if needed.
- All timestamps stored as `timestamptz`.
- Soft deletes use `deletedAt` column; default queries must filter it out.

## Non-negotiables
- Never commit secrets. `.env*` is gitignored. Use `.env.example` for documentation.
- Never run `drizzle-kit migrate` or `db:seed` against production from inside Claude Code — those are manual.
- Every mutation writes an `auditLog` row.
- Every list/detail view has a loading skeleton and an empty state.
- Optimistic UI on common actions (status change, task complete, cell edit).
- Mobile-responsive from day one — don't bolt it on later.

## How I want you to work
- Plan before coding for any change touching more than 2–3 files. Show me the plan, wait for approval.
- One chunk per session. If we finish a chunk, stop and let me /clear.
- After implementing, run `pnpm typecheck && pnpm lint` and fix anything that breaks. Don't ship type errors.
- If you find yourself making the same correction twice, stop and ask whether the approach is wrong.
- Prefer existing libraries already in the project. Ask before adding a new dependency.

## Commit policy (overrides the global "ask before commit" default)
- **Commit directly to `main` after every green build. No per-chunk feature branches.** As soon as `tsc --noEmit + next lint + next build` all pass for a chunk, stage the work and create a commit on `main` with a clear message ("chunk N: <one-line summary>" or similar). Don't wait to be asked.
- **Push to `origin/main` after each commit** so every other session/worktree sees the same state immediately. This is the default — no explicit ask needed for these pushes.
- If you find yourself on a non-`main` branch (e.g. a Claude Code worktree spawned its own branch), fast-forward `main` to your work before pushing — don't leave divergent foundations sitting around.
- A previous session built v1 + most of v1.5 across 18 chunks without committing and lost everything when the worktree was deleted. A later attempt committed but only on a per-session branch that never reached `main`, so the next session couldn't see the work and started chunk 1 over. This policy exists to make both failures impossible to repeat.
- Still applies: no force-pushes, no destructive ops, never rewrite shared history.
- If a build is red, fix it before committing — never commit broken state.

## Useful commands
- `pnpm dev` — local dev server
- `pnpm typecheck` — TS check
- `pnpm lint` — ESLint
- `pnpm db:generate` — generate Drizzle migration
- `pnpm db:migrate` — apply migrations (dev only from here)
- `pnpm db:seed` — seed first admin + defaults
- `pnpm test` — Playwright e2e