# Session State — LPD Sponsorship CRM

> **This file is the authoritative handoff document.**
> Claude must update it at the end of every session before stopping.
> At the start of every session, read this file first — it tells you exactly
> where things are and what to do next.

---

## Last updated
2026-07-20 — **UI retheme session.** Re-skinned the app from the clinical
medical-teal/heartbeat identity to a restrained **indigo-on-zinc "modern SaaS"**
look (Linear/Vercel lineage), per the user's ask for "more elegant, less
medical/AI, more startup." User picked the direction (indigo on cool zinc) and
scope (retheme + polish high-traffic surfaces) via a question prompt.

**Shipped (commit `1229900`, on `origin/main`):**
- `app/globals.css` — `--color-brand-*` cyan→**indigo** (`#6366f1`/`#4f46e5`);
  semantic neutral tokens **slate→zinc** (dark `--page` near-black `#09090b`);
  selection teal→indigo; crisper shadow tiers; comments rewritten.
- **New `components/app/logo-mark.tsx`** — shared ascending-bars glyph on an
  indigo tile, replacing the `Activity` heartbeat in the sidebar AND login.
- Sidebar → near-black zinc rail; auth backdrop → `zinc-950`; top bar blur;
  `Input`/`Button` neutrals → zinc; dashboard KPI hover + numeral polish.
- App-wide: dark surface bgs `bg-slate-900/950/800` → zinc across 64 files
  (pure color swap, no logic). typecheck + lint + build **all green**.

**Verification caveat (for next session):** authenticated pages were NOT
visually confirmed in-browser. Two dev-env snags: (1) no admin login creds this
session; (2) a dev-only `AUTH_URL`/`NEXTAUTH_URL` set to `http://localhost:3000`
makes `/` on the :3001 dev server redirect to `:3000/login` (a *different* app
runs on :3000). The **login page** WAS verified live (indigo button, new logo,
zinc backdrop render correctly). Everything else shares the same tokens/brand
classes, so it cascades — but eyeball the dashboard/companies/pipeline/drawer
once you can log in. To view locally: hit `http://localhost:3001/login`
directly, or fix the `AUTH_URL` in `.env.local` to `:3001` for dev.

**⚠️ Machine disk was ~99–100% full** this session (APFS container full from
other volumes/snapshots — the CRM's own volume only uses 24 GB). `.next` had to
be cleared twice to make room; the production build ultimately succeeded (disk
recovered to ~1.6 GB free). If builds start failing with `ENOSPC`, free disk
space — it's not a code problem.

Prior (2026-07-13) — **Mayo Clinic NPPA LPD 2026 outreach batch** applied (data-only):
24 companies → `contacted` + email interaction, 7 bounced → `BOUNCED` tag +
bounce interaction (status untouched), 34 deferred → **new `DEFERRED` tag** +
note interaction (status untouched). 65 interactions + 89 audit rows. Decided
**deferred is a tag, not a status** (mirrors BOUNCED — a workflow flag
orthogonal to the pipeline stage; avoids a `prospect_status` enum migration and
keeps deferred companies in the prospect funnel count). **Then shipped the
`DEFERRED` UI** (code commit) for visual parity with Bounced: violet "Deferred"
badge (clock icon) on the companies table, kanban cards, and drawer header; a
violet Deferred overlay bar on the dashboard funnel (`deferredCount` in
`getDashboardMetrics`); DEFERRED rendered as its own badge in the Tags column.
typecheck + lint + build all green. See the batch section below. Prior:

2026-07-09 — big session. **Platform UX pass** (4 chunks A–D) **+ contact
email-history feature** **+ bounced-email tracking suite** (BOUNCED tag,
red badge, Tags column + filter, dashboard funnel bar) + applied two
outreach batches (66 fresh prospects, then 40 more with bounce handling) +
tagged 33 companies BOUNCED. Also fixed a real `is_one_of` filter crash.
Prior session (2026-07-08): Chunk C (natural-language AI quick update).

**Session close:** user could not run migration 0010 (see ACTION REQUIRED);
all code is committed + pushed; docs updated. Next session should verify
0010 once applied, then resume the numbered backlog at Chunk 15 (TipTap).

## ⚠️ ACTION REQUIRED — apply migration 0010
`lib/db/migrations/0010_opposite_lady_vermin.sql` (contact email history)
is committed but **NOT yet applied to prod**. Run it manually:
`pnpm db:migrate` (or paste the SQL into the Neon console). The code is
written to degrade gracefully until then (email history shows empty,
archiving no-ops — verified against prod, 42P01 guarded), so deploying
before migrating is safe. Feature goes fully live once the table exists.

## Current git HEAD
`1229900` feat: retheme UI — indigo/zinc "modern SaaS" identity, drop medical
teal — plus this docs commit on top. (Prior notable HEAD:
`a0cca97` bounced count on the dashboard funnel.)
(this session, in order: `2c35b90` chunk A inline search · `93bb3d7` chunk B
pipeline search+edit · `c0c7608` chunk C dashboard drill-downs + is_one_of
fix · `b1357b5` chunk D event page · `f727d2f` docs · `e353f9c` contact
email history · `ab614ab` docs · `cdfc16e` bounced badge · `5fd131c` docs ·
`85abac1` tags column+filter · `9d80823` docs · `a0cca97` bounced funnel bar.
Two outreach batches + 33 BOUNCED taggings were applied to prod as data-only
writes, no commit.)

> ⚠️ **Naming note:** the "chunk A–D" in *this* session's commits are the
> UX pass described below — NOT the old lettered chunks. The backlog's
> next numbered item is still **Chunk 15 (TipTap)**.

---

## Outreach batch — APPLIED (2026-07-13, Mayo Clinic NPPA LPD 2026, data-only)

Third outreach batch, 65 companies, all matched exactly (0 unmatched). Applied
via a throwaway `apply-sync.tmp.ts` (deleted after; mirrors the app's own
`interaction.log` / `move_status` / `update_field` audit shapes, `userAgent:
"claude-code sync-outreach"`).
- **24 emails sent** → `email` interaction ("Initial sponsorship outreach email
  sent for Mayo Clinic NPPA LPD 2026."), status `prospect→contacted`, first +
  last contacted = 2026-07-13. (Regard, Wiley, Owens & Minor, Northwestern
  Mutual, 3D Systems Healthcare, Gaumard Scientific, Limbs & Things, Simulab,
  BoardVitals, McGraw Hill, Sigma Theta Tau, Arcadia, Lightbeam Health
  Solutions, Trilliant Health, NCQA, Medtronic, Stryker, Boston Scientific,
  Johnson & Johnson, GoodRx, BetterHelp, FIGS, Hyro, Kore.ai.)
- **7 bounced** → `email` interaction documenting the bounce, **`BOUNCED` tag**
  appended to `tagsCache` (red badge lights up everywhere). Status **not**
  changed, last-contact **not** bumped. (Whova, Oxford University Press,
  Mölnlycke, Ramsey Solutions, GE Vscan, SonoSite, Clarify Health.)
- **34 deferred** → `note` interaction ("Deferred for now… keep as future
  sponsorship prospect…"), **new `DEFERRED` tag** appended to `tagsCache`.
  Status **not** changed. (Hilton, Visit Salt Lake, Utah Office of Tourism,
  Delta Air Lines, Southwest Airlines, Cvent, Bizzabo, Springer Nature, Kaufman
  Hall, Medical Protective, Henry Schein, Ecolab, Flywire, Coronis Health,
  Merck, Novo Nordisk, Pfizer, Sanofi, Regeneron, CVS Caremark, Cencora,
  Evernorth, Baxter, AbbVie, Amgen, AstraZeneca, Bristol Myers Squibb, Eli
  Lilly, GSK, MDLive, Solv, Wheel, Hinge Health, Doctor On Demand.)

**New convention — `DEFERRED` tag** = intentionally held this batch, still a
future prospect. Chosen over adding a `deferred` enum status (that would need a
Postgres `ALTER TYPE` migration + edits across funnel/kanban/pipeline/dropdown/
CSV, and would drop these companies out of the prospect funnel count). Renders
filterable (`tags contains DEFERRED`) and keyword-searchable.

**DEFERRED UI — BUILT (2026-07-13, code commit)** for visual parity with
Bounced, mirroring the BOUNCED pattern file-for-file:
- `status-badge.tsx` — `DEFERRED_TAG`, `hasDeferredTag`, `DeferredBadge`
  (violet pill, `Clock` icon; violet is unused by any status hue so it's
  scannable and distinct from the red Bounced badge).
- Badge renders on the **companies table** name cell + as its own pill in the
  Tags column, **kanban** cards, and the **company drawer** header.
- **Dashboard funnel** gains a violet "Deferred" overlay bar below Bounced;
  `getDashboardMetrics` now returns `deferredCount` (counts the DEFERRED tag in
  `tagsCache`, same as `bouncedCount`). Links to `tags contains DEFERRED`.
- Still **not built** (possible later): a select-style tag picker in the filter
  UI, and a bulk "clear DEFERRED tag" action when a deferred prospect is
  reactivated (same gaps noted for BOUNCED).

## Outreach batches — APPLIED (2026-07-09, data-only, no commit)

**Batch 1 (66 fresh prospects, #1–66):** 66 `email` interactions (each
linked to the named recipient contact), 64 status flips `prospect→contacted`,
66 first/last-contacted bumps, 132 audit rows. Vivian Health (kept
`negotiating`) and Amwell (already `contacted`) not moved backward but still
got the email + last-contact bump.

**Batch 2 (40 companies) + bounce handling:**
- 16 *delivered* → `contacted` (GE HealthCare & Optum were already contacted
  → email logged + last-contact bump only). Companies incl. Osmosis, VisualDx,
  ShiftWizard, Berxi, Imprivata, TruBridge, Panacea Financial, Laurel Road,
  Quest Diagnostics, QuidelOrtho, Prime Therapeutics, Omada Health, Personify
  Health, CM&F Group.
- 24 *undeliverable/bounced* → **new `BOUNCED` tag** (color `#ef4444`;
  `tags` row + `companyTags` links + added to each `eventCompanies.tagsCache`),
  an `email` interaction marked UNDELIVERABLE, and a **follow-up task**
  "Replace undeliverable email — find valid address" (due 2026-07-12,
  assigned to Mike, priority high). Status deliberately **not** changed and
  last-contact **not** bumped (a bounce isn't a real contact). Per user's
  call, the 9 already-`contacted` bounced companies (Augmedix, Get Well,
  Premier Inc., DispatchHealth, Maxim Healthcare Services, Torch, Suki, Redox,
  Notable) were **not reverted** — just tagged/noted/tasked.
- Skipped (unmatched, per user): The Doctors Group, Summit Strategic
  Communication (PR agency), Ketchum (PR agency), Microsoft.

**Convention established:** `BOUNCED` tag = the address on file is dead / needs
replacing. **33 companies** now carry it (the 24 above + 9 added later: Huron,
Medline, TeamHealth, Top Echelon, ECG Management Consultants, Staff Care, AMN
Healthcare, Vizient, symplr — tag-only, no note/task for these 9). There are 24
open "Replace undeliverable email" tasks (only the first batch got tasks).

**Bounced now has UI (commits `cdfc16e`, `85abac1`, `a0cca97`):**
- Red **Bounced** badge (`BouncedBadge` in `status-badge.tsx`, driven by
  `hasBouncedTag(tagsCache)`) on the companies table name cell, pipeline cards,
  and drawer header.
- **Tags column** (toggleable, default on) renders `tagsCache` as pills, and a
  **Tags filter** field (contains / equals / is empty / is not empty, compiled
  against the `tagsCache` array in `compile.ts`). Filter "tags contains
  BOUNCED" → the 33. Tags are also matched by the keyword search boxes.
- **Dashboard pipeline funnel** has a red "Bounced" overlay bar (below the
  status bars, divider-separated) showing the BOUNCED count, linking to the
  filtered list. `getDashboardMetrics` now returns `bouncedCount`.
- Four ways to find bounced companies: badge, Tags filter, keyword search,
  funnel bar. **Not yet built** (possible follow-up): a select-style tag
  picker in the filter UI (currently a text field — type "BOUNCED"), and a
  bulk "clear BOUNCED tag" action once an email is fixed.

## Contact email history — BUILT (2026-07-09, commit `e353f9c`)
Captures & archives a contact's OLD email whenever it changes/clears.
- New `contact_email_history` table (migration **0010 — apply manually**,
  see ACTION REQUIRED above). Columns: `contactId`, `email` (archived),
  `changedBy`, `archivedAt`, `createdAt`.
- `updateContact` archives the old email on change (citext-aware compare);
  best-effort insert so it never blocks saving.
- Contacts tab in the company drawer shows a struck-through "Previous
  email(s)" list per contact with archived-when + by-whom. Fed by
  `listEmailHistoryForCompany` (drawer data on both /companies + /pipeline).
- Read + write both guard on Postgres 42P01 (`isUndefinedTableError`) so
  the deploy→migrate gap can't crash the drawer or contact editing.
- Deliberately NO multi-email model and NO restore button (user chose the
  minimal history-log scope). Restore could be added later.

## This session — Platform UX pass (all shipped, 2026-07-09)

**Chunk A — inline keyword search (Companies + Contacts)** `2c35b90`
- New `components/ui/search-input.tsx` — debounced box that drives a `q`
  URL param; server re-queries (no client filtering). Preserves other params.
- `listEventCompanies` gained a `keyword` opt: wide ILIKE across company
  name/website/industry/HQ/description, company+event tags, outreach/notes
  fields, and an EXISTS subquery over the company's contacts (name/email/
  title). Multi-term = AND-of-terms, OR-of-fields. LIKE wildcards escaped.
- `listContactsForEvent` gained `keyword` (name/email/title/phone/company).
- Search boxes wired into `views-toolbar.tsx` and the contacts page.

**Chunk B — pipeline search + edit-in-place** `93bb3d7`
- Client-side filter box on the kanban (company/owner/tier/tag, multi-term).
- Company drawer now renders on `/pipeline` (cards link to `/pipeline?record=`).
  `CompanyDrawer` took a `closeHref` prop so close/backdrop stay on-page.
- `KanbanBoard` syncs local state to `initialRows` via effect so drawer
  edits + drag persistence reflect after `router.refresh()`.

**Chunk C — dashboard drill-downs** `c0c7608`
- Static dashboard cards/sections now navigate: Confirmed→confirmed list,
  Pipeline value→/pipeline, Stalled→stalled filter, funnel bars→that status,
  goal/tier→/reports, hot prospects→hot filter, task rows→their drawer.
- **Bug fix:** funnel/stalled links used params (`?v=`, `?filter=stalled`)
  the companies page never read — they did nothing. Now use the real `f`
  param + `sanitizeFilter`; verified filtered counts equal the dashboard's.
- **Real bug fixed in `lib/views/compile.ts`:** `is_one_of` compiled to
  `= ANY((a,b,c))` (a row constructor) → Postgres error "requires array on
  right side". Now `IN (...)`. This crashed the companies filter UI too
  whenever anyone picked "is any of".

**Chunk D — event profile page** `b1357b5`
- New `/event` route + "Event" sidebar nav item (CalendarDays icon).
- Extensive: header (dates/tz/status/countdown), fundraising target vs goal
  + stat cards, prospects-by-stage (links to filtered lists), tiers & targets
  table, team leaderboard, outreach cadence health, avg days-in-stage,
  reviewer roster, admin manage links. All from existing report queries.

**Answered for the user:** dragging a pipeline card writes the single shared
`eventCompanies.status` — it propagates to dashboard/companies/reports
instantly (one source of truth), and revalidates `/companies` + `/pipeline`.

---

## What's deployed
**Production URL:** `nppacrm.vercel.app`

Deployed code: chunks A, B, and 14b are on `origin/main`. Vercel auto-deploys
from `main`, so 14b ships on the next deploy.

**Before the crons actually run in prod, two env vars must be set in Vercel:**
- `CRON_SECRET` — generate with `openssl rand -base64 32`. Required in prod or
  the cron routes return 500. Vercel cron sends `Authorization: Bearer <it>`.
- `AI_GATEWAY_API_KEY` — connect the Anthropic provider in the Vercel AI
  Gateway tab, or the routes return 503 ("AI not configured").

---

## Master List import — DONE (2026-07-08)

**The user ran the import — all 312 prospects are live in production.**
Admin login also recovered (password reset via `scripts/reset-admin-password.ts`;
user holds the new password). Historical context below:

Goal of the earlier session: migrate the real NPPA Master List (312 prospects)
from the restructured Excel workbook into the CRM via the in-app importer.

**Shipped (commits `9776150`, `2b43f88`):**
- `lib/actions/csv.ts` — the importer now ingests the full Master List, not just
  7 fields. New columns: `website`, `subcategory`, `owner`, `target_tier`, the
  four AI fields (`why_they_should_attend`, `key_talking_points`, `email_angle`,
  `sponsorship_hook`), `relationship_notes`, `first_contacted_at`,
  `last_contacted_at`, and `contact1_*`/`contact2_*`. Owner resolves by user
  name / first name / email local-part; tier resolves by name within the event;
  contacts are inserted (contact 1 = primary) deduped by email/name;
  `subcategory` is stashed in `eventCompanies.customFields` (no schema change).
  Owner default changed from "importing user" to **null** (unassigned) when
  unmatched.
- `components/admin/import-wizard.tsx` — `ParsedRow`, `FIELD_ALIASES`, and the
  recognized-columns help text expanded to match.
- `scripts/excel-to-import-csv.py` — converts the workbook → importer-ready CSV.
  Remaps status (`Not contacted`→`prospect`), tiers, composes `hq_location`, and
  aliases owner `Michael`→`Mike Thorn`. typecheck + lint + build all green.

**The generated CSV is on the Desktop (NOT committed — contains contact PII):**
`~/Desktop/NPPA_LPD_2026_master_list_import.csv` — 312 rows. Status: 249
prospect / 61 contacted / 2 declined. Owner: 77 Mike Thorn / 235 unassigned.
Tiers: 146 Bronze / 144 Silver / 21 Gold.
Source workbook: `~/Desktop/LPD 2026/NPPA_LPD_2026_Sponsor_Tracker_RESTRUCTURED.xlsx`.

**NEXT ACTION (manual — admin runs it, per the no-DB-from-Claude rule):**
1. `pnpm dev`, log in as admin.
2. Admin → Events → LPD 2026 → Import prospects.
3. Upload the CSV → Preview (expect ~312 new companies, 0 already on event) → Commit.
4. Spot-check `/companies`: a "Michael" row (e.g. 3D Systems Healthcare) should
   show owner = Mike Thorn, tier Bronze, AI fields populated, a primary contact.
   If preview shows many "already on event", STOP — the event already has data.

**Deferred features surfaced during the Excel review (not built — user chose
"just migrate for now"):**
- **Category as a structured field + a grouped "By Category" view** (workbook has
  24 categories and a dedicated category sheet; CRM only has free-text
  `industry`, which currently receives the Category value).
- **Payment & fulfillment fields/view** (agreement signed / invoice sent / paid /
  booth # / rep names — the workbook's Confirmed Sponsors sheet; empty now, but
  needed before the event).
- **Subcategory** currently lives in `customFields.subcategory` (lossless but not
  surfaced as a column/filter).

---

## Chunk C — DONE (2026-07-08, commit `fdddf09`)

Natural-language "AI quick update" — in-app twin of the `/sync-outreach` skill.

**Shipped:**
- `lib/ai/nl-update.ts` — model layer. Zod proposal schema (`matches[]` +
  `unmatched[]`) with a **flat op shape** (chosen over a discriminated union for
  robust structured-output across providers; per-kind required fields are
  re-validated in `applyNlUpdate`). Whitelisted ops: `set_status`,
  `log_interaction`, `bump_last_contacted`, `set_next_action_at`, `create_task`.
  `runNlUpdate` mirrors `runEnrichment` in `lib/ai/gateway.ts`; system prompt =
  static `/sync-outreach` rules, user prompt = prospect list + recap.
- `lib/actions/nl-update.ts` — `proposeNlUpdate` (read-only) and `applyNlUpdate`.
  Apply dispatches to the EXISTING actions (`moveEventCompanyStatus`,
  `logInteraction`, `updateField` for last-contact/next-action, `createTask`) so
  audit/validation/revalidation are free. `confirmed` is skipped + surfaced as
  "confirm in the pipeline modal" (amount + tier stay atomic).
- `components/ai/nl-update-dialog.tsx` (controlled modal) +
  `components/ai/nl-update-box.tsx` (dashboard box, autoRun).
- Wired into `command-palette.tsx` (Actions group) via a new `onAiQuickUpdate`
  prop hosted in `command-provider.tsx`, and into the dashboard (`app/(app)/page.tsx`).

**Verification:** typecheck + lint + build green. A throwaway read-only script
ran the real prospect list (prod DB) through `runNlUpdate` against the live AI
Gateway — request was well-formed; gateway returned
`403 byok_requires_paid_credits`. So the code path is correct end-to-end; **live
use is blocked only by the account-level AI billing gate** (below). No writes
were made; the write path (Apply) was intentionally not exercised because
`.env.local`'s `DATABASE_URL` points at prod.

**Prereq to make it work live (unchanged from before, now confirmed via 403):**
Enable the Anthropic provider **with paid credits** in Vercel → AI tab. This is
the same gate that blocks enrichment / email-draft / agents. Also note
`AI_MODEL_ID` currently resolves to **Opus 4.7** — override the env var to
Sonnet/Haiku if cheaper NL parsing is wanted (no code change).

## Chunk 14b — DONE

Shipped in commit `bc7a336`:
- `lib/agents/watch.ts` — watch agent (Valyu search + Claude Haiku signal
  assessment → creates follow-up tasks). Skips terminal statuses
  (`confirmed`/`declined`/`past_sponsor`) and anyone contacted in the last 7
  days. Max 10 companies/run.
- `app/api/cron/{discovery,watch}/route.ts` — GET handlers, Bearer auth via
  `CRON_SECRET`, gate on AI config, run for all `status = active` events with
  that agent enabled. `triggeredBy` passed as `null` (it's a UUID FK to users).
- `vercel.json` — discovery 6am UTC, watch 8am UTC.
- `lib/actions/agents.ts` — `runWatchAgent` (mirrors `runDiscoveryAgent`).
- `components/admin/agents-panel.tsx` — Watch row live (toggle, Run now,
  signal-task-count badge). `agents` page fetches the watch schedule.

All bugs from the prior session's notes were fixed: removed unused `gt`
import, `triggeredBy` now `string | null` (cron passes `null`), and
`events.isActive` → `events.status = "active"` (there is no `isActive`
column). typecheck + lint + build all green.

---

## Notes from 2026-07-02 session

- **Dark-mode toggle was silently broken** — `dark:` variants + semantic CSS
  vars were media-query based while next-themes toggles a `.dark` class. Fixed
  in globals.css (`@custom-variant dark` + `.dark` selector blocks). If any
  page looks wrong in dark mode now, it was always wrong — the toggle just
  never applied before.
- **Seeded "Stale (no contact 14+ days)" view was inverted** (`last_n_days`
  matched recently-contacted). New seed view "Needs follow-up (14+ days)" uses
  the new `older_than_n_days` op. **Prod DB still has the old broken view** —
  admin should delete it in the UI and either re-run `pnpm db:seed` or create
  the corrected view manually (it's name-keyed, so seeding inserts the new
  ones without touching anything else). Same for "Proposals expiring soon".
- `scripts/reset-admin-password.ts` is now committed (bcrypt password
  recovery helper, no secrets in it). The admin password is unrecoverable
  (bcrypt hash only; `SEED_ADMIN_PASSWORD` is a Vercel sensitive var that
  pulls back empty) — user was given the reset command to run themselves;
  unknown whether they've run it yet.
- `.claude/launch.json` added (preview server config, port 3001).
- Vercel CLI is now installed and logged in (`mike-9206`); project linked.
  `CRON_SECRET` + `AI_GATEWAY_API_KEY` **still unset in prod**.
- Repo is **public** on GitHub (`xynurse/nppacrm`) — user was offered
  `gh repo edit --visibility private` but hasn't decided yet.

## Decisions made (don't re-debate these)

| Decision | Why |
|---|---|
| Retheme = **indigo on cool zinc** (Linear/Vercel), not blue or warm-neutral | User picked it; indigo+zinc is the furthest from the clinical medical look and reads as modern startup SaaS |
| Retheme via brand-`*` palette + semantic tokens, not per-component rewrites | Everything routes through `--color-brand-*` and `--accent`/`--surface`/`--ink`, so one palette swap cascades app-wide at low risk |
| Kept all functional status colors (stage pills, Bounced red, Deferred violet) | Those encode meaning, not brand; recoloring them would break scannability. Only the brand hue + neutrals changed |
| Swapped only **dark surface bgs** slate→zinc app-wide, left text/border slate | slate vs zinc for text/borders is visually near-identical; the dark card-on-page seam was the only visible mismatch worth a 64-file sweep |
| New logo = abstract ascending-bars mark, not a lucide icon | A custom geometric mark reads "designed/startup"; the old `Activity` heartbeat was the strongest medical cue |
| Elevation via 3 shadow tokens + `surface-card` utility, not per-component classes | One place to tune depth; components opt in |
| CSS-first motion (transitions + easing token), no Framer Motion | It was dropped in chunk 12 for bundle size; CSS covers current needs |
| Replace (not rename) the broken Stale seed view | Seed is name-keyed/idempotent; renaming lets re-seed deliver the fix without migrations |
| Watch signals → tasks (not enrichment suggestions, not company suggestions) | `companySuggestions` has no `eventCompanyId`; `enrichmentSuggestions` field enum only allows 4 outreach fields. Tasks are immediately actionable and show in normal workflow. |
| Haiku model for Watch agent | Cost control — signal assessment is lightweight; no need for Sonnet |
| Max 10 companies per watch run | Cost cap; runs daily so stale ones cycle through |
| Skip companies contacted in last 7 days | Avoids noisy duplicate signals for active conversations |
| Signal task due date = today + 3 days | Urgency without being immediate noise |
| `CRON_SECRET` optional in dev, required in prod | Allows easy local testing without bearer header |
| Discovery cron: 6am UTC; Watch cron: 8am UTC | Staggered to avoid simultaneous cost spikes |
| Extend the in-app importer rather than write a one-shot migration script | Reusable for future uploads; user runs it via UI so the no-DB-from-Claude rule is respected |
| Master List `Category` → `companies.industry`; `Subcategory` → `customFields.subcategory` | No schema change needed for "just migrate" scope; a real category field/view is deferred |
| Unmatched import owner → null (unassigned), not the importing user | A blank owner in the source means genuinely unassigned; avoids 235 rows silently landing on the admin |
| Import CSV with PII stays on Desktop, uncommitted | Contains contact emails/names; only the generator script is committed |
| Companies/Contacts search = server-side `q` param; Pipeline search = client-side | Companies/Contacts already re-query per URL param and need cross-field/contact matching in SQL; pipeline loads all rows client-side and drag is optimistic, so instant client filtering is simpler and avoids refetch |
| `CompanyDrawer` reused on /pipeline via a `closeHref` prop, not a second drawer | One drawer component, one set of editors; only the close/backdrop target differs per host page |
| Dashboard drill-downs build the `f` filter param via `encodeToParam` + `sanitizeFilter` | Lands on a real filtered companies table (verified counts match dashboard); the old ad-hoc `?v=`/`?filter=` params were silently ignored |
| Fixed `is_one_of` → `IN (...)` instead of switching to drizzle `inArray` | `compileCondition` works on a `sql` column fragment, not a column object; `IN` with `sql.join` is the minimal correct fix and repairs the existing filter UI |

---

## Next sessions queue

Work through these in order. One chunk per session.

> **Chunk C is DONE (commit `fdddf09`).** Next up is Chunk 15.

### 1. Chunk 15 — TipTap rich notes ← START HERE
Replaces `interactions.body` and `tasks.description` (plain text) with TipTap
jsonb block editor. Needs DB migration.

**What it involves:**
- `pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`
- Migration: change `interactions.body` and `tasks.description` from `text` to `jsonb`
- `components/tiptap/rich-editor.tsx` — shared editor component with autosave on debounce
- Wire into `ActivityTab` (interaction logging) and `TasksTab` (task description)
- Add `companies.notesDoc` jsonb column for long-form company notes (new column, separate migration or same)
- Slash commands (`/`) + `@` mention extension (needed for chunk 20 notifications)

**Prerequisite for:** Chunk 20 (notifications needs `@` mentions)

### 2. Chunk 20 — Notification center
Bell icon in top bar, `notifications` table, in-app alerts for:
- Task assignments (`assignedTo` changes)
- `@` mentions in notes (needs TipTap first)
- Status changes on companies you own

**What it involves:**
- DB migration: `notifications` table (`id`, `userId`, `type`, `title`, `body`, `entityType`, `entityId`, `readAt`, `createdAt`)
- Bell icon in `TopBar` with unread count badge
- Dropdown list of recent notifications
- Hook into existing server actions to write notification rows on trigger events
- Mark-as-read action

---

## Known technical debt (not blocking)

| Issue | Where | Notes |
|---|---|---|
| `/companies` bundle is 204 kB | `app/(app)/companies/` | Target is 160 kB. Fix: `next/dynamic` import per cell type. |
| `experimental.typedRoutes` is off | `next.config.ts` | Can re-enable now that all routes exist. |
| `next lint` deprecation warning | CI | Migrate to `eslint .` flat config before Next 16. |

---

## Environment variables (production Vercel)

All set except:
- `CRON_SECRET` — **not yet set**. Generate with `openssl rand -base64 32` and add to Vercel project settings.
- `AI_GATEWAY_API_KEY` — connect Anthropic provider in Vercel AI Gateway tab to enable AI features in prod.

---

## Useful commands

```bash
export PATH="/Users/michaelthorn/.npm-global/bin:$PATH"
pnpm dev          # http://localhost:3001
pnpm typecheck    # tsc --noEmit
pnpm lint         # next lint
pnpm build        # next build
pnpm db:generate  # generate Drizzle migration after schema changes
pnpm db:migrate   # apply migrations (dev only — never run against prod from here)
pnpm db:seed      # first-run admin + event + tiers + saved views
git log --oneline -8
```

---

## Schema / migration state

| Migration | Applied in prod? | Notes |
|---|---|---|
| 0000 | ✅ | users, events, audit_log |
| 0001 | ✅ | companies, event_companies |
| 0002 | ✅ | contacts, interactions, tasks, reviews |
| 0003 | ✅ | saved_views |
| 0004 | ✅ | custom_fields, attachments |
| 0005 | ✅ | trigram indexes (manual append) |
| 0006 | ✅ | prospectuses, enrichment_jobs, enrichment_suggestions |
| 0007 | ✅ | company_benefits |
| 0008 | ✅ | proposal fields on event_companies |
| 0009 | ✅ | agent_schedules, agent_runs, company_suggestions (⚠️ its snapshot was never committed; `0010_snapshot.json` re-baselines the full schema) |
| 0010 | ❌ **apply manually** | `contact_email_history` (contact email archive). SQL trimmed to only this table; safe to apply — see ACTION REQUIRED at top. |

**Next migration:** Chunk 15 (TipTap) will be 0011 — `interactions.body` + `tasks.description` → jsonb, `companies.notes_doc` jsonb column. (0010 is taken by contact email history.)
