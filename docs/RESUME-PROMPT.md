# Resume prompt

Paste the block below into the first message of any new Claude Code session
on this project. It loads full context from the four reference files
without burning tokens re-deriving anything.

---

```
You're picking up the Sponsorship CRM build. Read these in order before
doing anything else:

1. README.md — project purpose + target shape + current state
2. CHANGELOG.md — what was built across 18 chunks (and lost when the
   worktree was deleted before commits)
3. TODO.md — critical-path-to-deploy + chunk-by-chunk rebuild list
4. CLAUDE.md — project conventions (pnpm only, multi-event scoping,
   audit-log every mutation)
5. docs/sponsorship-crm-build-prompt.md — original product spec

Current state to understand without checking:
- The repo is at commit 3ce6b96 — only the spec + CLAUDE.md + .env.example
  are in source control. NO code has been committed.
- A previous session built the full v1 + most of v1.5 across 18 chunks in
  a worktree, but the worktree was deleted before any commits landed. The
  code is gone; CHANGELOG.md preserves the architectural decisions and
  chunk ordering.
- Local branches: claude/kind-banach-f3fa4b (where the lost build lived)
  and claude/competent-johnson-903715 (current worktree). All branches
  are at 3ce6b96.

POLICY CHANGE for this project: commit after every green build. The
"commit only when explicitly asked" default cost us 18 chunks of work.
Default behavior should be:
- After each chunk's typecheck + lint + build all pass, commit on the
  current branch with a clear message ("chunk N: <one-line summary>")
- Push the branch periodically (every 3–4 chunks or when asked)
- Still no force-pushes, no destructive ops, no merging to main without
  explicit ask

Key conventions worth knowing without re-reading:
- Multi-event everywhere. Companies + contacts global; everything
  prospecting-related is event-scoped via eventCompanies.
- Soft delete only on companies + eventCompanies (deletedAt column).
- TipTap deferred to chunk 15 — interactions.body / tasks.description
  are plain text in the chunked rebuild.
- types/next-auth.d.ts must stay under types/ (NOT project root).
- JWT module augmentation must target @auth/core/jwt (not next-auth/jwt).
- experimental.typedRoutes is OFF in next.config.ts during chunks 1–11;
  re-enable in chunk 12 polish.
- Edit tool blocks writes to files not previously Read in the same
  session — Read before Edit even if you've edited the file in earlier
  turns.
- Drizzle migrations: when manual SQL is appended (trigram, GIN, partial
  indexes), also add an entry to lib/db/migrations/meta/_journal.json.
  Don't run `db:push` — it bypasses the manual appends.
- pnpm lives at /Users/michaelthorn/.npm-global/bin/pnpm — must prepend
  PATH for every Bash invocation:
    export PATH="/Users/michaelthorn/.npm-global/bin:$PATH"
- Use ./node_modules/.bin/tsc --noEmit and ./node_modules/.bin/next
  directly when pnpm 11's verify-deps-before-run gets in the way.
- AI features (chunks 13–14) gate on ANTHROPIC_API_KEY / VALYU_API_KEY —
  they return a clean "not configured" error when keys are absent. No
  surprise costs.

What to do next is up to me, but the most likely options are:

A) Start the rebuild from chunk 1 — Foundation. Commit each chunk.
   Roughly the size of the original session, but cleanly committed
   throughout.

B) Skip ahead — pick a single chunk to rebuild standalone (e.g.
   chunk 2 auth + admin if I just want a working login).

C) Deploy the docs as-is to GitHub for safekeeping (just commit the
   four reference files + push). Doesn't ship product, but locks in
   the documentation.

Ask me which I want before starting. Confirm "commit after each green
build" is the policy I want before the first commit.
```

---

## Why this exists

The previous session built everything in a worktree and never committed,
following CLAUDE.md's "only commit when explicitly asked" rule. When the
worktree was deleted, all 18 chunks of work vanished. This file preserves
the resume prompt so the docs survive even if a future session tries the
same pattern. The prompt itself argues for changing the default.
