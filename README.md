# CoachDesk

Coaching-centre management — batches, students, attendance, exams, notes,
finance and SMS — rebuilt as a single Next.js application on PostgreSQL.

Staff see only the modules their role grants; students look up their own
results, attendance and dues through a public portal with no login. The whole
interface is bilingual (Bangla / English) in a light and dark theme.

This replaces the previous split of a Laravel API (`backend/`) and a separate
Next.js client (`frontend/`) with one codebase, one deployment and one database.

**Live:** <https://coachdesk-app.vercel.app>

---

## Stack

| Concern    | Choice                                                    |
| ---------- | --------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, Server Actions)          |
| Language   | TypeScript, strict                                         |
| Database   | PostgreSQL (Neon) via Prisma 7 + `@prisma/adapter-pg`      |
| Styling    | Tailwind CSS v4 with a RetroUI (neo-brutalist) token set   |
| Components | Radix UI primitives, wrapped in `src/components/ui`        |
| Icons      | lucide-react                                               |
| Auth       | Signed session cookie (`jose`) + revocable `sessions` rows |
| i18n       | Bangla / English dictionaries, cookie-persisted            |

---

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and AUTH_SECRET
npx prisma migrate deploy   # create the schema
npx prisma db seed          # load demo data
npm run dev                 # http://localhost:3020
```

### Seeded accounts

| Email                    | Password       | Access                              |
| ------------------------ | -------------- | ----------------------------------- |
| `admin@coachdesk.test`   | `Password123!` | everything                          |
| `manager@coachdesk.test` | `Password123!` | no users / SMS / public-site modules |
| `staff@coachdesk.test`   | `Password123!` | students + attendance only          |

### Scripts

| Command              | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Development server                             |
| `npm run build`      | `prisma generate` then a production build      |
| `npm run db:migrate` | Create and apply a migration from schema edits |
| `npm run db:deploy`  | Apply pending migrations (production)          |
| `npm run db:seed`    | Load demo data                                 |
| `npm run db:reset`   | **Destructive.** Drop, re-migrate, re-seed     |
| `npm run db:studio`  | Prisma Studio                                  |

---

## URL structure

There is no `/admin` or `/subadmin` in any URL. Every authenticated screen lives
in the `(dashboard)` route group, so the folder is an organisational device that
never reaches the address bar:

```
src/app/
  (public)/        /            landing page
                   /portal      student self-service lookup
  (auth)/          /login
  (dashboard)/     /dashboard  /batches  /students  /attendance
                   /exams      /notes    /payments  /expenses
                   /colleges   /homepage /sms       /users  /profile
  api/             /api/auth/logout
                   /api/students/search   typeahead for the admin forms
                   /api/portal/search     typeahead for the student portal
                   /api/export/[dataset]  CSV downloads (see Exporting)
```

What a user can reach is decided by **RBAC**, not by which folder a page is in.

---

## Access control

Access is granted **per module**, and every module is one of twelve fixed names
listed in `src/lib/rbac/modules.ts`:

```
dashboard  batches   students  attendance  exams   notes
payments   expenses  colleges  homepage    sms     users
```

Each `(user, module)` pair carries four flags — `view`, `create`, `update`,
`delete` — stored in `user_permissions`. A missing row means no access at all,
so a new account starts locked down rather than open.

One list drives three things, which is what stops the menu from drifting away
from what the server actually allows:

- **the sidebar** — `src/lib/navigation.ts` tags each entry with its module, and
  `SidebarNav` hides anything `can(user, module, action)` rejects;
- **the page guard** — `requirePermission("payments", "create")` at the top of a
  server component, which renders the 403 boundary inside the shell;
- **the write guard** — `apiPermission(...)` as the first line of every server
  action and route handler.

Admins bypass the matrix by role. Gating the account that edits permissions on
its own permission rows would let one bad save lock everybody out permanently.

Three modules — `users`, `homepage`, `sms` — are admin-only regardless of what
the matrix says.

> One caveat: `forbidden()` is thrown while the response is already streaming, so
> a blocked page returns HTTP 200 with the 403 screen rather than a 403 status.
> The protected content is never serialised into the response.

---

## Internationalisation

Bangla is the default; English is one click away in the header. Both dictionaries
live in `src/lib/i18n/dictionaries/`, and `bn.ts` is typed against `en.ts` — a
missing translation is a build error, not a blank label.

Numbers, currency, dates, months and weekdays all render in the active locale:
`৳৭১,৫০০` in Bangla, `৳71,500` in English, from the same row. Bangla text uses
Hind Siliguri, since the Latin display face has no Bengali glyphs.

Weekday keys are stored in English in the database (`["saturday", "monday"]`) so
the data does not change meaning when the interface language does.

---

## Theming

Colour lives entirely in tokens on `:root` in `src/app/globals.css` — `ink`,
`canvas`, `surface`, `muted`, plus the accent and semantic pairs. Components
reference the tokens (`bg-surface`, `border-line`, `text-ink`) rather than
Tailwind palette colours, which is what lets one variable swap recolour the
whole app. The only palette colour left in `src` is the `bg-black/50` scrim on
the portal's two modals; the app shell's own drawer uses `bg-ink/40`.

The theme is chosen by `next-themes` writing `data-theme` on `<html>`, with the
system preference as the pre-hydration fallback.

> **If you write a `dark:` utility, read this first.** Tailwind v4's built-in
> `dark:` variant compiles to a `prefers-color-scheme` media query, which does
> *not* agree with `data-theme`: a user on a light-OS machine who picks dark
> would get the base utility and never its `dark:` counterpart. `globals.css`
> therefore redefines `dark:` with `@custom-variant` to follow `data-theme`.
> Prefer the tokens over `dark:` regardless — the tokens already flip.

---

## SMS pipeline

**Delivery is off.** `SMS_ENABLED=false`, and the only registered provider is a
no-op. Nothing in this build sends a message.

The pipeline around it is complete and exercised on every trigger:

```
trigger (attendance / result / payment / admission / broadcast)
   └─ enqueueSms()          composes from the template, substitutes placeholders,
        │                   normalises phones, drops invalid numbers
        ├─ SMS off  → row written as `skipped`, reason `sms_disabled`
        └─ SMS on   → row written as `queued`
                          └─ dispatchQueued() hands it to the provider adapter
```

Every message is recorded in `sms_messages` whichever way it goes, so the queue
screen shows exactly what *would* have been sent, to which number, with the
rendered body.

Three screens read that table: `/sms/queue` for the raw log, `/sms/report` for
delivery statistics with a category breakdown, and `/sms/reports/payment` for
the same report scoped to payment messages. The last two share one component,
differing only in whether the category set is pinned. Their status counts track
the active filters, so the totals always describe the rows on screen.

Date filters on those reports bound a **UTC** day: `created_at` is a
`Timestamptz` rather than a `@db.Date` like `payment_date`, and the app has no
timezone setting to key the bounds to. If one is added, key them to it. Turning delivery on later means writing one adapter that satisfies
`SmsProvider` and registering it in `src/server/sms/provider.ts` — no calling
code changes.

---

## Exporting

Every list screen with a filter bar has an **Export** button that downloads the
table as CSV: students (all three lists), payments, today's collection,
outstanding dues, expenses and the SMS log.

The download is generated server-side by `/api/export/[dataset]`, which re-runs
the page's own query with the page's own search params. Two consequences worth
knowing:

- the file covers the **whole filtered set**, not the page you were looking at —
  `page` is deliberately dropped from the forwarded params;
- permission is re-checked in the route, because the URL is reachable directly.

Adding a dataset means adding one entry to the `DATASETS` table in that route.
The `dataset()` helper ties a column list to its row type, so pairing the wrong
columns with the wrong query is a compile error rather than a broken file.

Three details in `src/lib/csv.ts` that look odd but are load-bearing:

- **a UTF-8 BOM** is prepended, or Excel reads the file as the system codepage
  and mangles every Bangla label;
- **leading `=`, `+`, `-` and `@` are prefixed with an apostrophe** on strings,
  so a crafted name cannot become a formula when the file is opened;
- **numbers are exempt from that guard**, because prefixing a negative amount
  would land it in Excel as text instead of a number.

CSV rather than `.xlsx`: the previous app produced workbooks client-side with
SheetJS, whose npm package carries known advisories and is no longer the
publisher's distribution channel. CSV opens directly in Excel, carries the same
data and needs no dependency. If true workbook output is ever required, do it
server-side with a maintained library.

---

## Notable schema changes from the legacy database

| Was                                        | Now                                                       |
| ------------------------------------------ | --------------------------------------------------------- |
| `payments` + near-identical `modeltest_payments` | one `payments` table with `is_model_test`             |
| `exams.marks` as the string `"25,25"`      | `mcq_marks` and `cq_marks` as integers                     |
| `batch_days_in_week` as CSV text           | a real `text[]` column                                     |
| seven `*_access` booleans on `users`       | `user_permissions` rows, module × action                   |
| free-text status columns                   | Postgres enums                                             |
| mixed camelCase / PascalCase table names   | `snake_case` throughout, camelCase in TypeScript via `@map` |
| `batch_infos` duplicating batch data       | showcase columns on `batches` itself                        |

Attendance also gained a denormalised `batch_id`, so a student's history stays
correct after a batch transfer.

---

## Business rules worth knowing

- **Dues** bill from whichever came later, the student's admission date or the
  batch's start date — and a student inside their first month is not yet a
  defaulter (`graceMonths`, default 1).
- **Archiving a batch archives its students**, and restoring it restores them.
- **Restoring an archived student requires choosing an active batch**, because
  their old one may itself have been archived since.
- **Manual attendance only upgrades absent → present.** It can never mark someone
  absent, so a second pass cannot silently undo the register.
- **Attendance rates count only classes actually held** (`classes_held`), and
  cells before a student enrolled read `not_started`, not `absent`.
- **Exam ranking is dense** — tied marks share a rank and the next distinct mark
  takes the following rank.
- **Note stock is transactional**: printing (an expense) adds, distribution
  subtracts, and editing an expense rolls back the units it previously added.
- **The public batch schedule reads by class time**, not by batch number: HSC
  year descending, then earliest weekday, then start time, then the shorter
  week, then name. The week starts **Saturday** — Friday is the weekend here, so
  a `Date.getDay()` ordering would wrongly surface Friday batches first.
- **The HSC year on a batch card is colour-coded by cohort** — graduated,
  sitting this year, next, the year after — and an admin-chosen colour on the
  batch overrides that default.

---

## Layout

```
public/                  static assets (the logo)
prisma/
  schema.prisma          the data model
  migrations/            generated SQL
  seed.ts                demo data
src/
  app/                   routes (see URL structure above)
  components/
    ui/                  RetroUI primitives over Radix
    shell/               sidebar, header, locale + theme toggles
    providers/           i18n, theme, session
  lib/
    i18n/                dictionaries, formatters, locale config
    rbac/                module list, permission helpers
    navigation.ts        the sidebar, tagged by module
    csv.ts               CSV builder used by the export route
    batch-order.ts       public schedule ordering
    batch-display.ts     HSC cohort colour
  server/
    db.ts                Prisma client (pooled, dev-safe singleton)
    auth/                sessions, password hashing, guards
    queries/             read paths, one module per file
    actions/             server actions (writes), each guarded
    services/dues.ts     the fee/dues calculation
    sms/                 pipeline, provider seam, templates
```

Reads live in `server/queries`, writes in `server/actions`. Both guard on the
same `can()` helper the sidebar uses.
