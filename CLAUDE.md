# Sponsorship CRM — Claude Code instructions

## What this project is
A modern, password-protected CRM for managing sponsor outreach for Leadership & Professional Development for NPs & PAs.
Design philosophy: spreadsheet-first, inline-editable, drawer detail, ⌘K palette.
References: Attio, Twenty, Linear, Notion.

**Primary reference files (read in this order at session start):**
1. `docs/SESSION-STATE.md` — current state, in-progress work, next tasks. **Read this first.**
2. `TODO.md` — full backlog with completion status.
3. `CHANGELOG.md` — history of what was built and when.
4. `docs/sponsorship-crm-build-prompt.md` — original product spec (read only if working on a new feature area).

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

## End-of-session protocol (REQUIRED before stopping or /clear)

Before ending any session, you **must** update `docs/SESSION-STATE.md` with:

1. **Last updated** — today's date and what session this was.
2. **Current git HEAD** — the commit hash and message after any commits this session.
3. **In progress** — any work started but not committed, with exact file paths and what each file still needs.
4. **Known bugs** — anything found but not yet fixed, with the exact fix needed.
5. **Decisions made** — choices made this session and why, so the next session doesn't re-debate them.
6. **Next sessions queue** — ordered list of what to work on next with enough detail to start cold.

Also update `TODO.md` to mark completed chunks and `CHANGELOG.md` to add an entry for anything that shipped.

**Then commit those doc updates and push to `origin/main` as the final act of the session.** Updating SESSION-STATE / TODO / CHANGELOG locally is not "done" — the session is only closed once the docs commit is on GitHub. Never end a session with uncommitted changes to these three files (typical close-out: a `docs: …` commit after the session's code commits).

**The goal:** a new session reading only `SESSION-STATE.md` should be able to pick up exactly where this one left off without any re-explanation from the user — including a session starting from a fresh GitHub clone on another machine, which is why the docs must be pushed, never just saved locally.

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