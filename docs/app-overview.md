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

The tournament page (`/turnieje/[slug]`) shows, from top to bottom, the tournament name, the date as `DD.MM.YYYY`, the standings, and the games. A missing slug is a 404. A failed load is one sentence.

**Klasyfikacja** lists every player, ordered by official `position`. Columns: Miejsce, Zawodnik (link to the player), Punkty. Points use a Polish decimal comma and drop a trailing zero (`4`, `4,5`). Buchholz, Buchholz−1, and Sonneborn-Berger stay in the database and are not shown here yet. An empty table is the heading plus one sentence.

Games have no extra section heading. They are grouped under `Runda N`, rounds ascending. Inside a round, rows are ordered by the left-side player's last name, then first name (Polish collation). That player is White, or the only player on a bye. This is not the pairing-sheet order.

Each game is three columns: White's name on the left (right-aligned), the result centered, Black's name on the right (left-aligned). Names link to the player. The winner's name is bold. A draw bolds neither name. Played scores are `1 - 0`, `0 - 1`, and `½ - ½`. A forfeit uses that same score, with `walkower` in smaller text under it. A bye keeps the player on the left and centers `(bye)` in the result column; the name is not bold. `(bye)` is the one English label on this page. An unplayed game shows both names and `nie rozegrano` in the result column, with neither name bold. If there are no games, the page shows one sentence.

The players index (`/zawodnicy`) lists every player, with no pagination. Order is last name, then first name, then slug, A to Z, Polish collation. Layout is one card per row below the `md` breakpoint and three equal columns from `md` up. A short last row stays left-aligned. Each card is one link to that player. It shows the full name, then `Rozegrane turnieje: N` (roster rows in `tournament_players`) and `Rozegrane partie: N` (played games only: `white_win`, `black_win`, `draw`; the player is white or black). Zeros stay visible. A **Szukaj** field above the list filters as you type in the browser. The URL stays `/zawodnicy`. The match is a case-insensitive substring of the first name, the last name, or `first last`, with Polish case-folding and no accent folding. An empty club and a failed load each show one sentence under the heading, and no field. No matches keeps the field and shows one sentence under it.

The player page (`/zawodnicy/[slug]`) shows the full name, then **Statystyki partii**, **Rozegrane turnieje**, and **Najczęstsi przeciwnicy**. A missing slug is a 404. A failed player lookup is one sentence under the title `Zawodnik`. Each block loads on its own. A failed block is one sentence in that block. The page shows all tournaments (no date controls). The stats functions still take an optional inclusive date range on `held_on`, and both the roster gate and the game counts use that range. The page is plain text until charts are in scope.

**Statystyki partii** has Ogólnie, Białymi, and Czarnymi. Played games are only `white_win`, `black_win`, and `draw`. Byes, forfeits, and unplayed pairings are ignored. A win is the player's own color winning; the other color's win is a loss. Each block shows Rozegrane, Zwycięstwa, Remisy, and Porażki. Zeros stay visible, including a color with no games. A result line is the count and the same win-rate form as the statistics page: one decimal, a Polish comma, and the fraction, e.g. `Zwycięstwa: 12 (60,0% (12/20))`. Zero played games in that block read `0 (0,0% (0/0))`. Each percentage is rounded on its own.

**Rozegrane turnieje** is the roster count in `tournament_players`, including a tournament with no played games. **Zwycięstwa w turniejach** is official `standings.position = 1`. **Podium w turniejach** is official `position` 1–3, so a win is also a podium. Then every tournament, newest `held_on` first. Each row links the tournament name, then the date as `DD.MM.YYYY`, the place, and points: `{name} — {date} — {position}. miejsce, {points} pkt`. Points use a Polish decimal comma and drop a trailing zero (`4`, `4,5`). No tournaments: both counts are 0 and one sentence replaces the list.

**Najczęstsi przeciwnicy** is omitted when the player has fewer than 3 roster tournaments. Otherwise opponents are ranked by played games together. Each row links the opponent's name and shows the game count with Polish pluralization (`1 partia`, `2 partie`, `5 partii`, `22 partie`). If several opponents share the 3rd-place count, show all of them. If fewer than 3 qualify, show those. Within one count, order by last name, then first name, Polish collation. Three or more tournaments but no played opponents: the heading plus one sentence.

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

The player page is locked under [Browse stored tournaments](#browse-stored-tournaments). Head-to-head is locked under [Head-to-head](#head-to-head).

Build the **capability** (query games/standings in a date range, aggregate in one place) so new stats can be added as functions without a new data pipeline.

### Head-to-head

The head-to-head page (`/head-to-head`, `/head-to-head/[slug]`, `/head-to-head/[slug]/[slug]`) compares two players. More than two slugs is a 404.

Slugs are resolved in order. A slug with no player is dropped. A second slug that repeats the first is dropped. If the cleaned path differs from the request, the page redirects to it. `/missing/jan` and `/jan/jan` both become `/head-to-head/jan`. Two unknown slugs become `/head-to-head`. One remaining slug fills the first picker and leaves the second empty. Totals and the game list appear only when two different players are in the URL.

`/a/b` and `/b/a` load the same games. The first slug is the left player in the summary. Submit keeps the order of the two pickers. The game list does not swap: White is always on the left.

The page shows all tournaments (no date controls). The query and the aggregate function still take an optional inclusive date range on `held_on`.

Two comboboxes list every player, ordered by last name, then first name, then slug, Polish collation. Labels are `Pierwszy zawodnik` and `Drugi zawodnik`. Each closed value shows the full name. Placeholder: `Wybierz zawodnika`. Each filters on its own in the browser. The match is a case-insensitive substring of the first name, the last name, or `first last`, with Polish case-folding and no accent folding. The URL does not change while typing. No matches: `Brak zawodników o tym imieniu lub nazwisku.` The second list omits whoever is selected in the first. If the first selection becomes the player in the second, the second selection clears.

**Pokaż** is disabled until two different players are selected. It navigates to `/head-to-head/{first}/{second}` in that order.

An empty club shows `Nie ma jeszcze zawodników.` A failed player load shows `Nie udało się wczytać zawodników.` Neither shows the pickers. Unknown slugs are still removed before the empty-club sentence, when the player list loaded.

Page title is `Bezpośrednio` with zero or one player. With two: `Bezpośrednio: {A} — {B}`.

Played games are only `white_win`, `black_win`, and `draw`. Byes, forfeits, and unplayed pairings are ignored.

**Ogólnie**, **{A} białymi**, and **{B} białymi** each show `Wygrane {name}: N`, `Wygrane {name}: N`, and `Remisy: N`. Zeros stay visible. No percentages. In a White block, that player's wins are white wins and the opponent's wins are black wins. The two color blocks add up to Ogólnie.

**Partie** lists those games, newest `held_on` first. The same date is ordered by tournament name (Polish collation), then round ascending. Each item links the tournament name, then the date as `DD.MM.YYYY`, then White's name (link to the player), the score (`1 - 0`, `0 - 1`, or `½ - ½`), and Black's name (link to the player). The winner's name is bold. A draw bolds neither name. No games: the three blocks at zero and `Ci zawodnicy nie rozegrali jeszcze partii.` A failed game load keeps the pickers and shows `Nie udało się wczytać partii.`

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
| Player page | Decided. See [Browse stored tournaments](#browse-stored-tournaments). |
| Head-to-head | Decided. See [Head-to-head](#head-to-head). |
| Upload body format | Decided: TRF at `POST /api/upload-tournament-trf`. |
| Charts | Later. |
| Tie-break columns on the tournament page | Later. Values stay in `standings`. The page shows place, player, and points. |
| Edit/delete tournament after upload | Not decided. Do not build unless asked. |
| Custom domain, SEO program, PWA | Not decided; not required for v1. |

## Success criteria (v1 direction)

A visitor can, without logging in, browse club tournaments and see useful aggregate stats in Polish, including over a chosen time range. The operator can add a finished tournament via a protected API. The project stays a single small web app on free-tier hosting, without auth or an admin UI.
