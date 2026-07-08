---
name: sync-outreach
description: Apply bulk outreach updates to the CRM from pasted conversational text or uploaded meeting minutes/notes. Parses what happened per company, previews all changes, and only writes to the database after explicit user approval. Use when the user pastes outreach updates, uploads meeting minutes, or says things like "update the CRM with...", "log these conversations", "I emailed X and Y last week".
---

# Sync outreach updates into the CRM

Turn the user's informal recap (pasted text, meeting minutes, call notes,
transcripts — any file or inline text) into proper CRM writes against the
production Neon database.

**Golden rule: never write without showing a preview table and getting an
explicit "yes" from the user first.** The preview is the product; the writes
are mechanical.

## Process

### 1. Collect input
- Inline text in the conversation, or file paths the user provides (.txt, .md,
  .docx, .pdf — read/convert as needed).
- If no input was given, ask the user to paste their updates. Do not guess.

### 2. Load current CRM state (read-only)
Write a throwaway tsx script (see Script conventions below) that selects from
`eventCompanies` joined to `companies` for the active event: id, company name,
status, ownerId, lastContactedAt, priority. Also load `contacts` (fullName,
email, companyId) if people are mentioned. The active event is the single
`events` row with `status = 'active'` (currently LPD 2026).

### 3. Match and interpret
- Fuzzy-match mentioned company names against `companies.name` (case-
  insensitive, substring, common abbreviations — "BSC" → "Boston Scientific").
  If a match is ambiguous or missing, list it in the preview as UNMATCHED and
  ask rather than guessing.
- For each matched company, derive:
  - **Interaction row** — type from context (`email`, `call`, `meeting`,
    `note`, `linkedin`, `other`), subject = one-line summary, body = the
    relevant excerpt of the user's text, `occurredAt` = the date mentioned
    (ask if a date is ambiguous; default to today only if the user says it
    was today).
  - **Status transition** — only when the text clearly implies one, using the
    enum: prospect → contacted → engaged → proposal_sent → negotiating →
    committed → confirmed, or declined / past_sponsor. Never move a company
    *backwards* without flagging it.
  - **lastContactedAt** — bump to occurredAt when the interaction is an
    actual touch (email/call/meeting, not internal notes).
  - **Follow-up task** — only if the user asked for one or the text names a
    concrete next step with a date.
- Statuses `confirmed` requires amount + tier — if the user says a company
  confirmed, ask for the amount/tier rather than writing a bare status flip
  (the app's confirm flow instantiates tier benefits; a raw status write
  skips that — see step 5).

### 4. Preview (mandatory)
Show one table: Company | Matched as | Status change | Interaction (type,
date, subject) | Other field changes | Task. Include an UNMATCHED section.
Wait for explicit approval; apply corrections and re-preview if the user
edits anything.

### 5. Apply
Write one throwaway tsx script that, per company, inside the same run:
- `INSERT` into `interactions` (eventCompanyId, type, subject, body,
  occurredAt, createdBy = the acting user's id).
- `UPDATE eventCompanies` for status/lastContactedAt/etc. (set updatedBy,
  updatedAt).
- **Audit rows are non-negotiable** — insert into `auditLog` directly
  (the app's `recordAudit` helper needs next/headers and won't run in a
  script). Use the app's action names: `interaction.log`,
  `eventCompany.update_field` (changes = `{field: {from, to}}`),
  `task.create`. Set `userAgent: "claude-code sync-outreach"` and
  `ipAddress: null` so these writes are identifiable in the audit page.
- If a status lands on `confirmed`: also mirror `lib/actions/cells.ts`
  `benefits.auto_instantiate` behavior, or tell the user to confirm via the
  app UI instead (preferred — the pipeline confirm modal captures amount +
  tier + benefits atomically).
- Acting user: look up `users` by email `mike@thorn.ooo` (do not hardcode the
  id) and use it for createdBy/updatedBy/audit userId.

### 6. Report
Summarize what was written (counts + per-company one-liners) and remind the
user the changes are visible in the app's Activity tabs and audit log.

## Script conventions
- Temp scripts go at the project root (module resolution fails from outside),
  named `*.tmp.ts`, and are DELETED after running. Never commit them.
- Boilerplate: `config({ path: ".env.local" })` (dotenv), then
  `drizzle(neon(process.env.DATABASE_URL!), { schema })` with
  `import * as schema from "./lib/db/schema"`. Run via `pnpm tsx <file>`.
- `.env.local` DATABASE_URL points at the production database — verified
  2026-07-08. Treat every write accordingly: preview first, small batches,
  never delete rows (soft-delete convention: set `deletedAt`).
- Money fields are Postgres `numeric` — pass strings, never JS floats.

## Out of scope
- Reading email directly (no connector for the outreach mailbox — user
  supplies text/files instead).
- Creating new companies (route the user to the app's quick-add or CSV
  import so ownership/tier defaults apply). Flag mentions of unknown
  companies in the preview instead.
