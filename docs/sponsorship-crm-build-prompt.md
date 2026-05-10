# Build Prompt: Sponsorship CRM Dashboard

## Design philosophy
Build this in the spirit of **Attio** (attio.com) and **Twenty** (twenty.com) — modern, spreadsheet-first CRMs that feel like Notion meets a database. Also draw from **Linear** (issues table density) and **Notion** (block editor + databases). The app should feel:

- **Fast and dense.** Information-rich tables, no wasted space, sub-100ms interactions.
- **Inline-editable everywhere.** Click any cell, edit it, tab to the next. No separate "edit" buttons or modal forms for routine work.
- **Spreadsheet-first.** The table is the primary surface. Detail lives in a slide-over drawer so you never lose your place in the list.
- **Keyboard-driven.** ⌘K command palette, arrow keys navigate cells, every action has a shortcut.
- **Customizable.** Admins add custom fields, save filtered views, choose visible columns.
- **Real-time-feel.** Optimistic updates, smooth transitions, presence indicators when teammates edit.

If the build feels like a traditional Salesforce-style "form-and-button" CRM, it's wrong. The vibe target is: type a filter, see the table change instantly; click a row, drawer slides in; tab through cells like Excel; press ⌘K, jump anywhere.

---

## Goal
Build a password-protected web app to manage prospective sponsors for **[CONFERENCE NAME]**. A small admin team will use it to track companies from initial prospect through confirmed sponsorship, log every interaction, manage contacts, and forecast against a fundraising goal. Deploy to Vercel with a Neon Postgres backend.

---

## Tech stack
- **Framework:** Next.js 15 (App Router, TypeScript, Server Actions, Partial Prerendering)
- **Database:** Neon Postgres via `@neondatabase/serverless` driver
- **ORM:** Drizzle ORM + drizzle-kit
- **Auth:** Auth.js v5 (Credentials), JWT in httpOnly cookies, bcrypt cost 12
- **UI:** Tailwind CSS + shadcn/ui + Radix primitives + lucide-react icons
- **Tables:** TanStack Table v8 with custom cell editors per type
- **Drawer:** Vaul on mobile + custom slide-over on desktop, resizable via react-resizable-panels
- **Command palette:** `cmdk` (⌘K / Ctrl+K)
- **Rich text:** TipTap (Notion-style block editor with slash commands, mentions, embeds)
- **Forms/validation:** react-hook-form + zod (schemas shared client/server)
- **Charts:** Recharts
- **DnD:** @dnd-kit (kanban, row reorder, column reorder)
- **Real-time:** Pusher Channels (or Ably) — broadcast record updates so other open clients see changes within ~200ms. If `REALTIME_ENABLED=false`, fall back to optimistic UI + revalidation.
- **File uploads:** Vercel Blob
- **Notifications:** sonner (toasts) + in-app notification center
- **Animation:** Framer Motion (drawer, cell save flash, kanban drag)
- **Date:** date-fns
- **Deployment:** Vercel

Required env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `BLOB_READ_WRITE_TOKEN`, `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `REALTIME_ENABLED`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

---

## Core UX patterns (non-negotiable)

### 1. Inline-editable cells
- Single click selects a cell (highlighted border, action icons appear on hover).
- Double-click or Enter enters edit mode.
- Type-specific editors:
  - **Text** — inline input
  - **Number / currency** — inline input with formatting
  - **Date / datetime** — popover calendar
  - **Single-select** — popover with searchable options + "Create new"
  - **Multi-select** — same, with chips
  - **Person** — autocomplete over users
  - **Relation** — autocomplete over linked object (e.g. company picker)
  - **URL / email / phone** — input with click-to-open icon
  - **Checkbox** — inline toggle
  - **Rating** — 5-star inline
  - **File** — upload chip
- Tab/Shift-Tab moves horizontally; Enter moves down; Esc cancels; Cmd+Enter saves and exits.
- Save on blur with optimistic UI; failed saves show inline error and revert with a toast.

### 2. Slide-over detail drawer
- Clicking the title cell of a row opens a right-side drawer (default ~600px, resizable, ~95vw on mobile).
- Drawer contains the full record across tabs: **Overview · Contacts · Activity · Tasks · Benefits · Files · About**.
- Cells inside the drawer use the same inline editors as the table.
- URL-shareable: `/companies?record=abc123` preserves the table state.
- Drawer header has prev/next arrows that navigate through the currently filtered list.
- Esc or click-outside closes; ⌘\ toggles.

### 3. Saved views
- Each object (Companies, Contacts, Tasks) supports multiple **views** in the left sidebar.
- A view = name + icon + filters + sort + visible columns + group-by + view type.
- Default views shipped: *All Companies · My Pipeline · Hot Prospects · Stalled (>30d) · Confirmed Sponsors · Past Sponsors · Needs Follow-up*.
- Users create personal views; admins create shared views (visible to everyone).
- Switching views is instant (URL param + cached query).

### 4. Multiple view types per object
- **Table** — default, dense, all cells editable.
- **Kanban** — group by any single-select field (default: status). Drag cards between columns to update. Cards show logo, name, $ amount, owner avatar, tags.
- **Calendar** — for tasks (by due date), interactions (by occurredAt), and companies (by nextActionAt).
- **Gallery** — card grid with logo prominent; good for visual browsing.
- View type is per-saved-view.

### 5. Command palette (⌘K)
- Global, opens on ⌘K / Ctrl+K.
- Sections: **Recent · Records · Actions · Navigate**.
- Fuzzy search across companies, contacts, tasks.
- Run actions: *Add company · Add task · Log interaction · Switch view · Toggle theme · Open settings*.
- Each result shows the object icon + key context (e.g. company status pill).

### 6. Filter chips
- Filter bar above every table.
- Each filter is a chip: `Status is one of [Engaged, Negotiating]`. Click to edit, X to remove, "+ Add filter" to add.
- AND/OR groups for compound logic.
- Operators per field type (text: contains/starts-with/equals; number: >, <, =, between; date: before/after/between/relative like "last 7 days"; select: is/is-not/is-empty; relation: is/is-any-of).

### 7. Custom fields
- Admins add custom fields to Companies and Contacts at `/admin/fields`.
- Field types: text, long-text, number, currency, date, datetime, single-select, multi-select, checkbox, URL, email, phone, rating, person, relation, file.
- Custom fields appear as columns in tables, editable cells in drawers, and as filterable options in views.
- Stored as `customFields jsonb` on the parent record + a `customFieldDefinitions` table holding the schema.

### 8. Rich text notes (TipTap)
- Every Company has a "Notes" section (long-form, separate from the short description).
- Slash commands for blocks: `/heading`, `/bullet`, `/numbered`, `/todo`, `/quote`, `/code`, `/table`, `/divider`, `/image`.
- `@` mentions for users → in-app notification.
- `#` for linking other companies/contacts → clickable chip.
- Autosave on debounce (500ms).
- Same editor used for Interaction body and Task description.

### 9. Real-time presence & updates
- Avatar dots top-right of each open record show who else is viewing it.
- When another user edits a cell, the change appears within ~200ms with a brief flash highlight.
- Lock indicator on a cell while another user is actively editing it.
- Notification center (bell icon) for `@mentions`, task assignments, and status changes on owned companies.

### 10. Density, theme, motion
- Density toggle: **Compact** (32px rows) / **Comfy** (44px) / **Spacious** (56px). Persisted per user.
- Light / Dark / System theme.
- Subtle motion: drawer slide, cell save flash, kanban card lift on drag.
- All transitions ≤ 200ms; never block on animation.

---

## Database schema (Drizzle, Postgres)

```ts
users                  // id, email (citext, unique), passwordHash, name, role (admin|viewer),
                       // avatarUrl, isActive, lastLoginAt, createdAt, updatedAt

companies              // id, name, website, industry, size, hqLocation, logoUrl,
                       // shortDescription,
                       // targetTierId (fk sponsorshipTiers, nullable),
                       // status (prospect|contacted|engaged|proposal_sent|negotiating|
                       //         committed|confirmed|declined|past_sponsor),
                       // priority (high|medium|low),
                       // proposedAmount, confirmedAmount, currency,
                       // ownerId, nextActionAt, lastContactedAt,
                       // customFields (jsonb), tagsCache (text[] for filtering),
                       // notesDoc (jsonb TipTap),
                       // createdAt, updatedAt, deletedAt

contacts               // id, companyId, firstName, lastName, fullName (generated),
                       // title, email, phone, linkedinUrl, isPrimary,
                       // customFields (jsonb), notesDoc (jsonb),
                       // createdAt, updatedAt

interactions           // id, companyId, contactId (nullable), userId,
                       // type (email|call|meeting|note|linkedin|other),
                       // subject, body (jsonb TipTap), occurredAt, createdAt

tasks                  // id, companyId (nullable), assignedTo, title,
                       // description (jsonb TipTap), dueDate, completedAt,
                       // priority, createdAt, updatedAt

tags                   // id, name (unique), color
companyTags            // companyId, tagId

sponsorshipTiers       // id, name, displayOrder, suggestedAmount, color,
                       // benefits (jsonb array of {key, label, defaultDueOffsetDays})

companyBenefits        // id, companyId, tierId, benefitKey, label,
                       // status (pending|in_progress|delivered),
                       // dueDate, completedAt
                       // — instantiated when a company hits status = confirmed

attachments            // id, companyId, filename, url, sizeBytes, contentType,
                       // uploadedBy, createdAt

views                  // id, ownerId (nullable for shared), name, icon,
                       // objectType (company|contact|task),
                       // viewType (table|kanban|calendar|gallery),
                       // filters (jsonb), sort (jsonb),
                       // visibleColumns (jsonb), groupBy (text),
                       // isShared, displayOrder, createdAt, updatedAt

customFieldDefinitions // id, objectType, key, label, fieldType,
                       // options (jsonb), displayOrder, createdAt

notifications          // id, userId, type, title, body, link, readAt, createdAt

auditLog               // id, userId, action, entityType, entityId,
                       // changes (jsonb), ipAddress, createdAt

settings               // singleton: conferenceName, conferenceDate,
                       // fundraisingGoal, currency, timezone
```

**Indexes:** trigram index on `companies.name` for ⌘K search; `(status, ownerId)` on companies; `(companyId, occurredAt desc)` on interactions; `(assignedTo, dueDate) WHERE completedAt IS NULL` on tasks; GIN indexes on `customFields` for filtering.

---

## Pages & features

### `/` — Dashboard
- KPI strip: prospects · in-pipeline · committed $ · confirmed $ · gap-to-goal (with progress bar against `settings.fundraisingGoal`).
- Pipeline funnel (count + $ by status, clickable → filtered companies view).
- Revenue by tier (stacked bar: confirmed / committed / proposed).
- **Pace chart** — running total $ confirmed by week vs straight-line goal.
- Recent activity feed (last 20 interactions across all companies).
- My open tasks this week.
- Top 10 hot prospects (high priority, by `nextActionAt`).
- Stalled deals (>30 days no contact, in active pipeline).

### `/companies`
- Spreadsheet-first table with all the patterns above.
- Left sidebar lists saved views with live counts.
- View switcher (table/kanban/calendar/gallery) at the top.
- Filter chips · group-by · sort · column-picker · density picker · view options.
- Quick-add button → adds a blank row inline at the top, focused on the name cell.
- Bulk actions on selected rows: change status/owner, add tag, delete (admin only), export.
- CSV export reflects the current view (filters + columns).

### `/companies/[id]` (and as drawer at `/companies?record=…`)
- Header: logo, name (inline editable), status pill (popover to change), tier badge, $ chips (proposed/confirmed), owner avatar, priority dot.
- Action toolbar: **Log Email · Log Call · Log Meeting · Add Note · Add Task · Send Proposal**.
- Tabs: **Overview · Contacts · Activity · Tasks · Benefits · Files · About**.
  - **Overview:** short description + the long-form Notes editor (TipTap).
  - **Contacts:** inline-editable list, primary contact badge.
  - **Activity:** reverse-chronological timeline; click to expand body, edit, delete (own only).
  - **Tasks:** open + completed, inline-create, drag-reorder.
  - **Benefits:** appears once status = `confirmed`. Tier benefits as a checklist with delivery status and due dates.
  - **Files:** drag-and-drop to Vercel Blob, image/PDF preview, sort by date/name.
  - **About:** every field including custom fields, all inline-editable.
- Right rail: tags, key dates, audit trail (collapsible).

### `/contacts`
- Same modern table treatment.
- Cross-company directory; row click → opens that contact's company drawer scrolled to them.

### `/tasks`
- Table + Calendar views.
- Default views: *My tasks · All tasks · Overdue · This week · Unassigned*.
- Inline complete with a small confetti animation.

### `/pipeline`
- Dedicated kanban-only view of companies grouped by status.
- Each column header shows count and total $.
- Drag to change status; dropping on `confirmed` opens a modal to lock in `confirmedAmount` and instantiate benefits from the tier template.

### `/reports`
- Conversion rates per stage.
- Average days in stage.
- Owner leaderboard (companies, $ confirmed, interactions logged).
- Tier mix vs goal.
- Export PDF / CSV.

### `/admin` (admin only)
- `/admin/users` — invite, role, reset password, deactivate.
- `/admin/fields` — manage custom fields per object.
- `/admin/views` — manage shared views.
- `/admin/tiers` — define sponsorship tiers, suggested $, and benefit templates.
- `/admin/settings` — conference name, date, fundraising goal, currency, timezone.
- `/admin/import` — CSV import with column mapping + dry-run preview, then commit.
- `/admin/audit` — searchable audit log with filters.

---

## Sponsorship-specific features

- **Tier templates with benefits.** Setting a company's tier (or moving them to `confirmed`) instantiates a benefit checklist on the Benefits tab. Example: Gold = "Logo on website, 4 conference passes, dedicated booth, 1 social media shoutout, blurb in program." Each benefit has a status and due date.
- **Pipeline forecast.** Weighted by status: Engaged 25%, Proposal Sent 50%, Negotiating 75%, Committed 90%, Confirmed 100%. Dashboard shows weighted-expected $ vs goal.
- **Renewal radar.** Companies with status = `past_sponsor` auto-resurface 6 months before next conference with a "Renew?" task assigned to their previous owner.
- **Cadence warnings.** Hot prospects tint yellow at 14+ days since last contact, red at 30+. A "Needs Follow-up" view ships by default.
- **Proposal tracking.** When status moves to `proposal_sent`, capture proposal URL, sent date, and valid-until date. Auto-create a follow-up task for 7 days later.
- **Quick-log buttons.** From any company view, one click logs an Email / Call / Meeting interaction with body pre-filled with a template; updates `lastContactedAt` automatically.

---

## Quality bar
- Server Actions for all mutations (no separate API routes unless required by a third party).
- Optimistic UI on every common action (status change, task complete, tag add, cell edit).
- Skeleton loaders that match the user's density setting.
- Empty states with clear CTAs (e.g. "No companies yet — add one or import a CSV").
- Mobile-responsive: sidebar → bottom nav, tables → card list, drawer → fullscreen sheet.
- Keyboard shortcuts: `⌘K` palette, `/` focus search, `c` new company, `t` new task, `g d / g c / g p` go-to navigation, `?` show shortcut cheat-sheet.
- Zod validation on both client and server; server is the source of truth.
- Error boundaries per route, retry toasts on action failure.
- Soft deletes on companies (recoverable via admin audit page).
- Lighthouse ≥ 90 on dashboard and companies pages.
- Initial JS payload < 200KB gzipped per route (lazy-load TipTap, Recharts, kanban).

---

## Deployment
- GitHub → Vercel (`main` → prod, PRs → previews).
- Use the Neon-Vercel integration for per-preview database branches.
- Migrations: drizzle-kit generated, run via `pnpm db:migrate` in `vercel-build`.
- Pooled Neon connection for serverless functions; direct for migrations.
- Seed creates first admin from env vars + ships default tiers + default views.
- Pusher (or Ably) credentials configured per environment, or `REALTIME_ENABLED=false`.

---

## Deliverables
1. Full repo with the structure above.
2. `README.md` with Neon setup, env reference, local dev steps, seed, deploy steps, and a screenshot tour.
3. `.env.example`.
4. Drizzle migrations checked in.
5. Seed script (creates first admin + default tiers + default views + a few demo records gated behind `SEED_DEMO_DATA=true`).
6. Playwright e2e covering: login, add company inline, edit a cell, drag in kanban, log an interaction, complete a task, switch views, ⌘K search, custom field add, logout.

---

## Phased scope (ship v1, then iterate)

### v1 (must ship)
Auth + roles · companies CRUD with inline editing · contacts CRUD · interactions · tasks · tags · saved views · table view · kanban view · drawer detail · ⌘K palette · filter chips · custom fields · dashboard · CSV import/export · admin user management · audit log · soft deletes · density/theme · keyboard shortcuts · responsive mobile.

### v1.5 (next sprint)
Calendar/gallery views · real-time presence + broadcast · TipTap rich notes · benefits tracking · proposal tracking · cadence warnings · reports page · notification center.

### v2 (later)
Email send + IMAP sync (Resend) · Google Calendar sync · workflow automations · public read-only share links · custom objects beyond built-ins · two-factor auth · multi-conference / multi-tenant · sequences/playbooks · custom dashboards.

---

## Things to fill in before running this prompt
- `[CONFERENCE NAME]` — replace throughout
- Sponsorship tiers + suggested $ amounts (default: Platinum / Gold / Silver / Bronze; admin-editable)
- Default tier benefits (what each tier gets)
- Fundraising goal $
- Initial admin email + temp password (for seed)
- Pusher (or Ably) credentials, or set `REALTIME_ENABLED=false`
