# Tech stack

This document is for implementers (including AI agents). It records **locked technical decisions and why they exist**. Product intent is in [app-overview.md](./app-overview.md). Postgres tables are in [schema.md](./schema.md).

Follow this document unless a later explicit decision supersedes it. Do not add tools “just in case.” The app is small; extra moving parts are a bug.

## Summary

| Layer | Choice | Why |
| --- | --- | --- |
| Starting point | Greenfield | Empty repo; no existing stack to inherit. |
| App shape | One fullstack **Next.js** app (App Router, TypeScript) | One language, one deploy, pages + upload API in the same repo. Asked for simple. |
| Hosting | **Vercel** Hobby | Native Next.js, git push → deploy, free at this scale. No server to babysit. |
| Database product | **Neon** Postgres | Serverless Vercel has no durable local disk; Neon is the low-friction hosted Postgres for Vercel. Local dev uses the same Neon project via `.env.local`. No Docker. Tables in [schema.md](./schema.md). |
| Package manager | **npm** | `create-next-app` default. |
| ORM | **Drizzle** + Drizzle Kit | Thin, SQL-shaped, typed, enough migrations. Less machinery than Prisma. |
| DB driver | **`pg`** + `attachDatabasePool` (`@vercel/functions`) | Current Neon/Vercel Fluid recommendation: TCP pool on Node, not Edge HTTP. |
| UI | **Tailwind CSS 4** + **shadcn/ui** + lucide-react | Table/filter-heavy UI; copy-paste components we own; keep the look plain. |
| Copy | Polish strings in source | Club site; no i18n library until a second language is a real requirement. |
| Access | Public GET/pages; **Bearer token** on upload `POST` | No user auth; still stop strangers writing to a public URL. |
| Stats | Compute **on each request** from raw rows | Dataset is tiny; new stats = new function, no backfill. Precompute later if needed. |
| Validation | **Zod** | Upload body and query/search params. |
| Formatting | **Prettier** + `eslint-config-prettier` + `prettier-plugin-tailwindcss` | ESLint lints. Prettier formats (`printWidth` 100). The Tailwind plugin sorts class strings. |
| Data fetching (browse) | **Server Components** + **URL search params** | No React Query. Time range and player pickers are shareable URLs. The players name box is the exception: it filters the loaded list in the browser and does not change the URL. |

**Current framework versions to start from (as of 2026-09):** Next.js **16** (LTS) + React **19**. Use `create-next-app` defaults (App Router, TypeScript, Tailwind, ESLint). Prefer current stable, not a frozen old major.

## Constraints that drove the stack

These are not optional flavor:

- Web app, **simple UI/UX**, **simple solutions**
- **No auth** for visitors; **no admin panel**
- **Free hosting** if possible
- Scale: **&lt;100 players**, **&lt;100 tournaments**, results only (no moves)
- Upload via **API**, operator-driven
- Stats over **all tournaments or a time range**
- **Do not** change the DB schema or add charts in the same breath as feature work unless that work’s session is about them. Schema is [schema.md](./schema.md).

Implication: no Redis, no worker, no second service, no monorepo, no Edge-only exotic runtime unless we are forced.

## Architecture

```text
Visitors  →  Next.js on Vercel (Server Components, pages)
Pages     →  src/lib/db/queries  →  Neon rows  →  src/lib/stats (pure)  →  HTML
Operator  →  POST /api/upload-tournament-trf  (Bearer token)  →  src/lib/db/writes  →  Neon
```

- **Source of truth:** rows in Neon (tournaments, players, games, official standings). See [schema.md](./schema.md).
- **Not stored:** derived career stats, all-time tables, head-to-head summaries (compute them).
- **Runtime:** Node.js (not Edge) so `pg` pooling works as recommended on Vercel Fluid.

### Why fullstack Next.js (not SPA + API, not static)

- Upload API + browse UI in one codebase and one Vercel project.
- Time-range stats need computation on request; a fully static site makes ranges awkward.
- A separate Vite SPA + backend is two deploys and two languages/runtimes for no gain at this size.

### Why Vercel (not Cloudflare OpenNext, not a VPS)

- Next.js is first-class; Hobby is enough for a club site.
- Cloudflare + OpenNext + D1 is extra adapter work. We already accepted “no SQLite file on the server.”
- Railway/Fly/VPS means a long-lived server and weaker/no free tier. Ops we do not want.

**Cost of Vercel:** ephemeral filesystem. Therefore **not** a SQLite file in the repo/process. Hosted DB is mandatory.

### Why Neon Postgres (not Turso, not JSON blobs)

- Need durable writes from a serverless upload handler.
- Postgres is ordinary; schema is [schema.md](./schema.md).
- Neon free tier + Vercel integration is enough for this size.
- Turso/SQLite would also work at this scale but is less default on Vercel.
- JSON in Blob/git is fewer services but shifts integrity, querying, and concurrent uploads onto us. Rejected.

**Local development:** no Docker and no second database. Copy `.env.example` to `.env.local`, point both URLs at a Neon database (a free project is enough), then `npm run db:migrate` and `npm run dev`.

**Connection strings (required):**

- Runtime (`DATABASE_URL`): Neon **pooled** URL (hostname contains `-pooler`).
- Migrations (`DATABASE_URL_UNPOOLED` or equivalent): Neon **direct** URL. PgBouncer breaks Drizzle Kit / session features.

Keep the `pg` `Pool` in **module scope**, `max` small (1–2), and register it with `attachDatabasePool` so Fluid compute can close idle connections before suspend. Do not open a new client per request. Do not use the Edge runtime for DB code.

### Why Drizzle (not Prisma, not raw SQL)

- Typed queries without Prisma’s generate/client weight.
- Schema-as-code copied from [schema.md](./schema.md) when the app is scaffolded; migrations via Drizzle Kit.
- Raw SQL would postpone migrations and typed rows until we reinvent them.

Do not introduce a second query layer (Kysely, Prisma, `postgres.js`) alongside Drizzle.

### Why on-request stats (with a door for later cache)

Dataset is small; aggregations are cheap. Operator must not re-upload career stats when we add a new metric.

**Rule for code:** stats live in **pure functions** in `src/lib/stats/` over plain rows from query functions. They must not import the database client or write derived tables in v1.

**Later, if data grows:** wrap the same functions with a cache (`unstable_cache` / ISR) or materialize tables on upload. UI should not depend on cache existing. Do not add Redis/cron/workers until a measured need exists.

### Why public browse + upload token (not full public write, not site password)

- Product is a public club site (see app-review).
- Unprotected `POST` on a known Vercel URL will collect junk.
- Whole-site Vercel Password Protection would block members and may not be free/simple on Hobby.

**Upload handler must:**

1. Reject missing/invalid `Authorization: Bearer` vs `UPLOAD_TOKEN` via shared `requireUploadToken` (`src/lib/auth/require-upload-token.ts`, constant-time compare).
2. Validate the body with Zod (non-empty TRF text).
3. Insert **raw** tournament data only (no derived stats writes).

**Upload route (locked):** `POST /api/upload-tournament-trf`. Body is raw TRF text (`Content-Type: text/plain`). Do not ship an open endpoint.

### Why no React Query / no client fetch layer

Browse pages are Server Components. Filters (time range, player ids) belong in the **URL** so links are shareable and the server can compute stats on the request. Add a client data library only if a later UI truly needs interactive client caching.

**Exception:** the name field on `/zawodnicy` filters the full player list in the browser. The server still loads every player. The URL stays `/zawodnicy`. That filter does not use a search param or a client data library.

### Why Tailwind + shadcn (not MUI, not CSS-only)

The UI is tables, selects, inputs, maybe a dialog (player picker). shadcn copies components into the repo (no heavy runtime kit). Keep styling boring. Do not install a second component library. Do not add a chart package until charts are in scope.

shadcn primitives (Radix or whatever the current shadcn default is) come along with the components we add. Add **only** components we use (table, select, input, button, dialog, etc.).

### Why Polish hardcoded (not next-intl)

One locale. i18n routing and message catalogs are extra machinery. If a second language appears later, extracting strings from a small app is cheaper than carrying `next-intl` from day one.

### Why Zod

Single schema for the upload body (non-empty TRF text) and for search-param parsing. Do not hand-roll validators. Do not add Yup/Valibot as well.

### Why Prettier

ESLint stays the linter (`npm run lint`). Prettier only formats. `eslint-config-prettier` is last in the ESLint flat config so stylistic rules do not fight the formatter. `prettier-plugin-tailwindcss` is the last Prettier plugin and sorts Tailwind classes; `tailwindStylesheet` points at `src/app/globals.css` because Tailwind 4 has no `tailwind.config.js`.

Defaults, except `printWidth` 100. Do not format Markdown or generated files (`docs/`, `*.md`, `next-env.d.ts`, `package-lock.json`, `drizzle/meta/`).

- `npm run format` — `eslint --fix`, then `prettier --write .` (Prettier last).
- `npm run check` — `tsc --noEmit`, then `eslint`, then `prettier --check .`. Run this before pushing.

## Explicitly not in the stack

Do not add these unless a later written decision says so:

| Do not add | Why |
| --- | --- |
| NextAuth / Clerk / any auth library | No user accounts. Upload token is an env var. |
| Admin UI / CMS | Operator uses API. |
| `next-intl` or similar | Polish only. |
| Redis, queues, cron, Inngest, workers | Stats are on-request; uploads are rare. |
| Prisma, second ORM | Drizzle only. |
| `@neondatabase/serverless` as default | Use `pg` + Fluid pool unless we are forced onto Edge. |
| TanStack Query / SWR | RSC + URL params. |
| Chart library (Recharts, etc.) | Charts out of scope. |
| Playwright/Vitest as a requirement for v1 | ESLint from `create-next-app` is enough; tests optional later. |
| Monorepo / separate API package | One Next.js app. |
| Edge runtime for DB routes | Conflicts with chosen `pg` pooling. |

## File structure

Organize by layer. No `features/` or `domains/` folders. Single package, `src/` directory:

```text
src/app/                      # routes, layouts, and the upload Route Handler
src/app/<route>/…             # components used by that route only
src/app/api/upload-tournament-trf/route.ts  # TRF upload POST
src/components/               # shared components, moved here on the second use
src/components/ui/            # shadcn only, added when a page uses them
src/lib/auth/                 # upload Bearer check (shared helper)
src/lib/trf/                  # TRF16 parse helpers for upload
src/lib/db/index.ts           # Drizzle client (private)
src/lib/db/schema.ts
src/lib/db/queries/           # read functions, added with the first caller
src/lib/db/writes/            # insert functions, added with the upload route
src/lib/stats/                # pure stats functions; no I/O (added with the first stat)
src/lib/utils.ts              # shadcn cn helper
drizzle/                      # migrations (0000_init.sql)
drizzle.config.ts             # Drizzle Kit; reads DATABASE_URL_UNPOOLED from .env.local
components.json               # shadcn (base-nova)
docs/                         # this documentation
```

Do not add empty `queries/` or `writes/` files ahead of a caller. A component stays beside its page until another route needs it, then it moves to `src/components`. Client components take props; they do not import queries.

### Reads

A page is an async Server Component. It parses the URL with Zod, calls a query function, and passes plain rows into a stats function when the number is derived. Official standings are rendered as stored.

Query functions live in `src/lib/db/queries/`, grouped by area (`tournaments.ts`, `players.ts`, `games.ts`). One function per page-shaped read (`getTournamentBySlug`, `loadGamesInRange`). Share a function when two pages need the same filter. They return plain row objects, including joins the read needs. They do not compute win%, rankings, or head-to-head.

A missing row returns `null`. An empty list returns `[]`. The page calls `notFound()`. Queries do not import `next/navigation`.

Query functions are plain async functions. They are not Server Functions: no `"use server"`. `"use server"` publishes an endpoint the browser can call. Use it only for a later client-triggered mutation.

Example for one tournament page (stored games and standings, so no stats call):

```text
src/app/turnieje/[slug]/page.tsx
src/app/turnieje/[slug]/standings-table.tsx
src/app/turnieje/[slug]/games-table.tsx
src/lib/db/queries/tournaments.ts    # getTournamentBySlug → rows or null
```

### Writes and API

The only HTTP API is the upload POST. There is no read API. Pages call query functions directly and do not fetch JSON.

`src/app/api/upload-tournament-trf/route.ts` checks the bearer token (`requireUploadToken`), validates the raw TRF body with Zod, parses TRF in `src/lib/trf/`, and calls `src/lib/db/writes/upload-tournament-trf.ts`. A later public JSON route, if added, would be another `route.ts` under `src/app/api/` calling the same query functions. Do not add it for the UI.

### Import boundary

Only files under `src/lib/db/` may import the Drizzle client (`@/lib/db`, `@/lib/db/index`, `@/lib/db/schema`). Pages, route handlers, `src/lib/stats`, and `src/components` import `@/lib/db/queries/...` or `@/lib/db/writes/...`. Mark `src/lib/db/index.ts` with `server-only` so a client bundle fails if it reaches the pool. Enforce the boundary with ESLint `no-restricted-imports` (no extra plugin).

## Environment

Names can vary but the split must exist:

- `DATABASE_URL` — pooled Neon URL (app runtime)
- `DATABASE_URL_UNPOOLED` — direct Neon URL (Drizzle Kit)
- `UPLOAD_TOKEN` — shared secret for write API

Never commit secrets. Never log the token.

## Implementation rules for agents

1. **Prefer the listed tools.** New dependencies need a real gap in this document, not taste.
2. **Do not invent a second DB schema.** Implement Drizzle from [schema.md](./schema.md) in a dedicated change; Drizzle is the only mapper.
3. **Upload contract is TRF** at `POST /api/upload-tournament-trf` (raw text body). Keep the route token-protected.
4. **Do not pick a final stats catalog** unless that task is in scope. Put new metrics in `src/lib/stats` as functions over games/standings.
5. **Do not add charts** while building tables.
6. **Keep UX simple:** lists, tables, filters. Polish copy.
7. **Compute stats in the request** from raw data; official tournament standings are displayed as stored.
8. **Node runtime** for anything that talks to Postgres.
9. **Follow [File structure](#file-structure).** No feature folders. Pages call query functions. Only `src/lib/db/` imports the Drizzle client. No read API.

## Deferred technical topics

Not decided; do not silently fill them in:

- Head-to-head stats (the statistics page and the player page are locked in [app-overview.md](./app-overview.md))
- Chart library and chart UI
- Edit/delete APIs after upload
- Test runner beyond ESLint

**Locked with the upload route:** player identity on upload is first+last name, case- and accent-insensitive (see [app-overview.md](./app-overview.md)). Payload is TRF at `POST /api/upload-tournament-trf`.
