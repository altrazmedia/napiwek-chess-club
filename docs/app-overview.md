# App review

This document is for implementers (including AI agents). It describes **what the product is**, **who it is for**, and **product-level decisions**. For languages, libraries, hosting, and architecture, see [tech-stack.md](./tech-stack.md). For tables, enums, and indexes, see [schema.md](./schema.md).

Do not invent requirements that are not in these docs. If something is listed as deferred, do not decide it in passing while implementing something else.

## What this is

A small **public website** for a chess club. It stores historical tournament results and lets people **browse** that data and **derived statistics**.

It is **not**:

- a live tournament manager (no pairing, no clocks, no round control)
- a chess board / PGN viewer (we do **not** store moves)
- a rating platform (no FIDE/Elo engine unless a later decision adds it)
- a social network or membership portal
- an admin dashboard

Working name / repo: `napiwek-chess-club`.

## Who it is for

| Audience | How they use it |
| --- | --- |
| Club members and visitors | Open the site in a browser. No login. Browse tournaments, players, standings, and stats. |
| Site operator (club person who has the data) | Upload a new tournament by calling an API (curl, script, HTTP client). No admin UI. |

There are **no user accounts**. Visitors never authenticate. The operator does not log into the app either; they hold a **write token** and call the upload API.

UI language is **Polish only** (hardcoded copy). Assume club members are the primary readers.

## Data we keep

Each tournament includes:

- **Name and date** (single `held_on` date; see [schema.md](./schema.md))
- **List of players** (first-class rows with unique slugs)
- **List of games with results only**: white won, black won, draw, plus bye / forfeit / unplayed as pairing outcomes. We do **not** store moves.
- **Final standing**, as uploaded: place, points, Buchholz, Buchholz−1, Sonneborn-Berger

We do **not** keep:

- move lists / PGN bodies / clocks / openings as a first-class dataset
- user-generated content (comments, photos, bios) unless a later decision adds it

**Scale (design for this, do not over-engineer past it):**

- fewer than **100 players** for now; will not grow much in the near term
- fewer than **100 tournaments**
- write traffic is rare (someone uploading a finished tournament)
- read traffic is a small club site

At this size, loading relevant rows and computing stats in the request is expected to be fast.

## What the product must do

### Browse stored tournaments

Users should be able to look through the dataset in a simple UI: tournament list, a single tournament (players, games, official standings), and player-centric views.

The tournament index (`/turnieje`) is a single column of cards, newest `held_on` first, with no pagination. Each card shows the tournament name (link to that tournament), the date as `DD.MM.YYYY`, and official places 1–3 that exist: a medal icon and the player name (link to the player). Points are not shown on the card. An empty list and a failed load each show one sentence under the heading.

Keep UX **simple**. Prefer lists, tables, and filters over dashboards, widgets, or marketing layout.

### Statistics

Stats are a core part of the product, not a later add-on. They must support:

- **all tournaments**, or
- a **specific time range** (filter by tournament date)

The **statistics page** (`/statystyki`) is locked. It shows all tournaments (no date controls on the page). Stats functions still take an optional inclusive date range on `held_on` so a filter can be added later without rewriting the math.

Played games are only `white_win`, `black_win`, and `draw`. Byes, forfeits, and unplayed pairings are ignored in every game count, win, and win percentage.

The page shows:

- **Ogółem:** number of played games, white wins, black wins, and draws. Those three results add up to the game total. Zeros stay visible.
- **Najwięcej turniejów** (top 5): roster rows in `tournament_players`. Column: Turnieje.
- **Najwięcej wygranych partii** (top 5): played-game wins. Column: Wygrane.
- **Najlepszy procent wygranych** (top 5): wins / played games, draws in the denominator, minimum 15 played games. Rank by the exact ratio. Display one decimal and the fraction, e.g. `60,0% (12/20)`. Column: Procent.
- **Najwięcej wygranych turniejów** (top 5): official `standings.position = 1`. Column: Wygrane turnieje.

Each player block is a table: player name (link to the player page) and the number for that stat. Players with 0 do not qualify. If fewer than 5 qualify, show fewer. If the 5th place is tied, show everyone with that value, so a table can have more than 5 rows. Within one value, order by last name, then first name. An empty ranking is the heading plus one sentence.

Player-page stats and head-to-head stats are **not** decided yet. Examples (hints only):

- **Player profile:** tournaments played, total points, win percentage, win % as white / as black, most common opponent, strongest opponent, etc.
- **Head-to-head:** games between two selected players, plus aggregate stats for that pair

Build the **capability** (query games/standings in a date range, aggregate in one place) so new stats can be added as functions without a new data pipeline.

### Upload a tournament

There must be an **HTTP API** to add a new tournament. There is **no** admin panel and **no** upload UI.

**Payload (locked):** FIDE-style **TRF** text, posted as the raw body to `POST /api/upload-tournament-trf` with a Bearer token. The handler creates the tournament, roster, games, and official standings (place + points; tie-breaks null when absent from TRF). Do not invent a public file-import UI.

**Player identity on upload (locked):** match existing players by **first name + last name**, case-insensitive and accent-insensitive. TRF names are `"Lastname, Firstname"` or `"Firstname Lastname"`. New players get slug `firstname-lastname` (ASCII-folded kebab). Tournament slug is the start date `YYYY-MM-DD` (TRF `042`). Re-upload of the same date slug is rejected (`409`).

## Important product decisions

### Public read, token write

- **Anyone** may browse pages and (if we expose them) read APIs.
- **Uploading** requires a shared secret in an `Authorization: Bearer <token>` header. Token lives in an environment variable. Operator keeps it in a password manager / script env.
- This is **not** user auth: no sessions, no OAuth, no roles, no per-user permissions.

Rationale: the site is meant to be opened by club members without accounts. A public Vercel URL with an unprotected `POST` would allow anyone to inject fake results.

### No admin panel

Operator tasks (upload, and later maybe delete/edit if we add them) go through API endpoints. Do not build a back-office.

### Simple over complete

This is a small app. Prefer the boring solution. Do not add:

- accounts, invitations, or “club admin” roles
- live updates / websockets
- search platforms, analytics suites, or A/B tools
- CMS, blog, or news
- mobile native apps

### Stats are derived, not a second source of truth

Official tournament standings (points, Buchholz, tie-breaks) come **from the uploaded data**. They are what the tournament director published.

Club-wide stats (career win %, all-time tables, head-to-head) are **computed** from stored games and/or standings. Do not require the operator to upload pre-aggregated career stats.

If a computed number could disagree with an official standing, show official standings on the tournament page as uploaded; use computation for cross-tournament views.

### Time range is a first-class filter

All-time vs date-bounded views are part of the idea, not a nice-to-have. Implementation should make “filter games/tournaments by date, then aggregate” natural. Do not bake “all time only” into the data model or APIs in a way that makes ranges hard.

### Charts

Chart UI is **out of scope** until a later decision. Do not add a chart library or dashboard charts while building browse/stats tables.

## Out of scope / deferred (do not decide silently)

| Topic | Status |
| --- | --- |
| Postgres schema | Decided. See [schema.md](./schema.md). |
| How the same person is recognized across tournaments | Decided for upload: first+last, case- and accent-insensitive. Schema still stores non-unique names. |
| Statistics page catalog and layout | Decided. See [Statistics](#statistics). |
| Player-page and head-to-head stats | Later. Examples above are hints only. |
| Upload body format | Decided: TRF at `POST /api/upload-tournament-trf`. |
| Charts | Later. |
| Edit/delete tournament after upload | Not decided. Do not build unless asked. |
| Custom domain, SEO program, PWA | Not decided; not required for v1. |

## Success criteria (v1 direction)

A visitor can, without logging in, browse club tournaments and see useful aggregate stats in Polish, including over a chosen time range. The operator can add a finished tournament via a protected API. The project stays a single small web app on free-tier hosting, without auth or an admin UI.
