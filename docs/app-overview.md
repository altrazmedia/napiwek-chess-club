# App review

This document is for implementers (including AI agents). It describes **what the product is**, **who it is for**, and **product-level decisions**: features and the rules that make them correct. For languages, libraries, hosting, and architecture, see [tech-stack.md](./tech-stack.md). For tables, enums, and indexes, see [schema.md](./schema.md).

It does **not** lock page layout, visual design, component structure, or exact UI copy. Change those in the UI without updating this file. Update this file when a feature, a rule that changes results, or the scope changes.

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
| Site operator (club person who has the data) | Upload a new tournament from the hidden `/upload` page, or by calling the upload API (curl, script, HTTP client). `/upload` is not in the navigation. |

There are **no user accounts**. Visitors never authenticate. The operator does not log into the app either; they hold a **write token**, type it on `/upload`, or send it as a Bearer token to the upload API.

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

Users should be able to look through the dataset: a tournament list, a single tournament (players, games, official standings), and player-centric views.

Keep UX **simple**. Prefer lists, tables, and filters over dashboards, widgets, or marketing pages. How those views are laid out is not locked here.

The tournament index (`/turnieje`) lists every tournament, newest `held_on` first, with no pagination. Each entry links to that tournament and shows the date, official places 1–3 that exist (player, points, and round count), and the roster count. The round count is `max(games.round)` and stays visible when it is 0. The Chess Manager URL is not shown. An empty list and a failed load are each an empty or error state.

The tournament page (`/turnieje/[slug]`) shows the tournament name, the date, the standings, and the games. It does not show the Chess Manager URL. A missing slug is a 404. A failed load is an error state.

**Standings** list every player, ordered by official `position`, with place, player (link), points, and that tournament's derived record. Buchholz, Buchholz−1, and Sonneborn-Berger stay in the database and are not shown here yet. An empty standings list is an empty state.

The record shows played wins, draws, and losses. Zeros stay visible. Unplayed wins appear in parentheses after the wins count, and that parenthesis is omitted when the count is 0. Wins, draws, and losses count only `white_win`, `black_win`, and `draw`. A win is the player's own color; the other color's win is a loss; a draw counts for both players. Unplayed wins are a bye for that player, or a forfeit win (`white_win_forfeit` as White, `black_win_forfeit` as Black). A forfeit loss and an `unplayed` pairing increment none of these. A player with no counted games has zeros. These are game counts, not points.

Games are grouped by round. The page shows one round at a time. Round buttons run from the first round that has games through the last, ascending, in a horizontal scroll. The last round is selected when the page opens. Choosing a round does not change the URL. The game list can be dragged horizontally to the next or previous round. Inside a round, byes and unplayed games come after the other games. Within each of those groups, rows are ordered by the left-side player's last name, then first name (Polish collation). That player is White, or the only player on a bye. This is not the pairing-sheet order. Names link to the player. The winner is indicated; a draw has no winner. Played results are a white win, a black win, or a draw. A forfeit uses that same score and is marked as a forfeit. A bye has one player and is marked as a bye (the English label `(bye)` is the exception to Polish-only copy). An unplayed game shows both players and is marked unplayed. If there are no games, the page says so.

The players index (`/zawodnicy`) lists every player, with no pagination. Order is last name, then first name, then slug, A to Z, Polish collation. Each player links to their page and shows how many tournaments they entered (roster rows in `tournament_players`) and how many games they played (`white_win`, `black_win`, `draw` only; the player is white or black). Zeros stay visible. A search field above the list filters as you type in the browser. The URL stays `/zawodnicy`. The match is a case-insensitive substring of the first name, the last name, or `first last`, with Polish case-folding and no accent folding. An empty club and a failed load each show an empty or error state and no search field. No matches keeps the field and shows an empty state.

The player page (`/zawodnicy/[slug]`) shows the full name, game stats, tournaments played, and frequent opponents. A missing slug is a 404. A failed player lookup is an error state. Each block loads on its own; a failed block is an error in that block only. The page shows all tournaments (no date controls). The stats functions still take an optional inclusive date range on `held_on`, and both the roster gate and the game counts use that range. Charts are out of scope.

**Game stats** cover all games, games as White, and games as Black. Played games are only `white_win`, `black_win`, and `draw`. Byes, forfeits, and unplayed pairings are ignored. A win is the player's own color winning; the other color's win is a loss. Each block shows games played, wins, draws, and losses. Zeros stay visible, including a color with no games. Each result that has a rate shows the count and the win rate: wins divided by played games in that block, one decimal, each percentage rounded on its own. Zero played games in that block is 0%.

**Tournaments played** counts roster rows in `tournament_players`, including a tournament with no played games. **Tournament wins** are official `standings.position = 1`. **Podiums** are official `position` 1–3, so a win is also a podium. Then every tournament, newest `held_on` first, with the date, place, and points. No tournaments: both counts are 0 and the list is an empty state.

**Frequent opponents** are omitted when the player has fewer than 3 roster tournaments. Otherwise opponents are ranked by played games together. If several opponents share the 3rd-place count, show all of them. If fewer than 3 qualify, show those. Within one count, order by last name, then first name, Polish collation. Three or more tournaments but no played opponents: an empty state under the heading.

### Statistics

Stats are a core part of the product, not a later add-on. They must support:

- **all tournaments**, or
- a **specific time range** (filter by tournament date)

The **statistics page** (`/statystyki`) shows all tournaments (no date controls on the page). Stats functions still take an optional inclusive date range on `held_on` so a filter can be added later without rewriting the math.

Played games are only `white_win`, `black_win`, and `draw`. Byes, forfeits, and unplayed pairings are ignored in every game count, win, and win percentage.

The page shows:

- **Overall:** number of played games, white wins, black wins, and draws. Those three results add up to the game total. Zeros stay visible.
- **Most tournaments** (top 5): roster rows in `tournament_players`.
- **Most won games** (top 5): played-game wins.
- **Best win percentage** (top 5): wins / played games, draws in the denominator, minimum 15 played games. Rank by the exact ratio. Display one decimal.
- **Most tournament wins** (top 5): official `standings.position = 1`.

Each ranked player links to that player and shows the stat (for win rate, the percentage only). Equal values share a place and the next place skips. Players with 0 do not qualify. If fewer than 5 qualify, show fewer. If the 5th place is tied, show everyone with that value, so a block can have more than 5 players. Within one value, order by last name, then first name. An empty ranking is an empty state under its heading.

The player page is locked under [Browse stored tournaments](#browse-stored-tournaments). Head-to-head is locked under [Head-to-head](#head-to-head).

Build the **capability** (query games/standings in a date range, aggregate in one place) so new stats can be added as functions without a new data pipeline.

### Head-to-head

The head-to-head page (`/head-to-head`, `/head-to-head/[slug]`, `/head-to-head/[slug]/[slug]`) compares two players. More than two slugs is a 404.

Slugs are resolved in order. A slug with no player is dropped. A second slug that repeats the first is dropped. If the cleaned path differs from the request, the page redirects to it. `/missing/jan` and `/jan/jan` both become `/head-to-head/jan`. Two unknown slugs become `/head-to-head`. One remaining slug fills the first picker and leaves the second empty. Totals and the game list appear only when two different players are in the URL.

`/a/b` and `/b/a` load the same games. The first slug is the left player in the summary. Submit keeps the order of the two pickers. The game list does not swap sides: White is always the white player.

The page shows all tournaments (no date controls). The query and the aggregate function still take an optional inclusive date range on `held_on`.

Two pickers list every player, ordered by last name, then first name, then slug, Polish collation. Each filters on its own in the browser. The match is a case-insensitive substring of the first name, the last name, or `first last`, with Polish case-folding and no accent folding. The URL does not change while typing. The second list omits whoever is selected in the first. If the first selection becomes the player in the second, the second selection clears.

Submit stays unavailable until two different players are selected. It navigates to `/head-to-head/{first}/{second}` in that order.

An empty club and a failed player load are each an empty or error state with no pickers. Unknown slugs are still removed before the empty-club state, when the player list loaded.

The page title names neither player, one player, or both, matching how many distinct players are selected.

Played games are only `white_win`, `black_win`, and `draw`. Byes, forfeits, and unplayed pairings are ignored.

**Overall**, **first player as White**, and **second player as White** each show both players' wins and the draws. Zeros stay visible. No percentages. In a White block, that player's wins are white wins and the opponent's wins are black wins. The two color blocks add up to overall.

**Games** lists those games, newest `held_on` first. The same date is ordered by tournament name (Polish collation), then round ascending. Each item links the tournament, shows the date, and shows White, the score, and Black, with White and Black linking to those players. The winner is indicated; a draw has no winner. No games: the three blocks at zero and an empty state. A failed game load keeps the pickers and shows an error.

### Upload a tournament

There is an **HTTP API** and one unlinked page. `/upload` is the only operator UI. Do not add it to the navigation. Do not build a back-office (no accounts, no delete, no edit after save, no other admin pages).

**API (locked):** FIDE-style **TRF** text, posted as the raw body to `POST /api/upload-tournament-trf` with a Bearer token. The handler creates the tournament, roster, games, and official standings (place + points; tie-breaks null when absent from TRF). Player matching on this route is automatic. Do not add another write route.

**Page (locked):** `/upload`. A failed player-list load is an error and no form. An empty club still shows the form.

1. The operator picks a TRF file. The browser reads it and parses it with the same TRF parser as the API. A bad file shows an error and stays on this step.
2. Review: editable name and date, prefilled from the file. The public address is that date. Optional Chess Manager URL, stored as null when blank. A non-blank value must be an `https` URL on `chessmanager.com` or `www.chessmanager.com`, with no username, password, or explicit port. Any path, query, or fragment is kept as typed. Anything else blocks save. Players are ordered by official place. Each row shows place, points, the name from the file, and whether the initial name match found a database player. That match status does not change if the operator overrides the row. Every row can stay a new player or be attached to an existing one (players listed by last name, then first name). A match defaults to that player. A miss defaults to a new player, with editable first and last name prefilled from the file. Choosing an existing player does not rename them. Choosing a new player again prefills the file name. Games are read-only, in parsed round order (not re-sorted by last name), and use the same result kinds as the tournament page. Names in the games follow the current choice. The token is entered for this save and is not stored. Cancel returns to the file step and clears the token.
3. Success: clear the form and the token, and link to `/turnieje/{slug}`. Choosing another file clears that success state.
4. Errors: one message. A save error keeps the review data and the token.

Save is a server action. It checks the token, re-parses the TRF, and writes places, points, and games from the file. The operator's name, date, player choices, and optional Chess Manager URL override only identity, the tournament title/date, and that URL. The TRF API leaves the URL null. Block save when the name, date, token, or a new player's first or last name is empty; the Chess Manager field is not a valid https URL on chessmanager.com; two rows use the same existing player; a new name matches an existing player; or a new player's slug would collide with another new player or an existing one.

**Player identity on upload (locked):** match existing players by **first name + last name**, case-insensitive and accent-insensitive. TRF names are `"Lastname, Firstname"` or `"Firstname Lastname"`. The API attaches that match automatically. The page uses the same match to prefill each row, then saves the operator's choice: an existing player id, or a new first and last name. A new name that matches an existing player is rejected; the operator must pick that player. New players get slug `firstname-lastname` (ASCII-folded kebab). Tournament slug is the start date `YYYY-MM-DD` (API: TRF `042`; page: the edited date). Re-upload of the same date slug is rejected (`409` on the API; an error on the page).

## Important product decisions

### Public read, token write

- **Anyone** may browse pages and (if we expose them) read APIs.
- **Uploading** requires a shared secret. The curl route reads it from an `Authorization: Bearer <token>` header. The `/upload` page sends the same secret to its server action. Token lives in an environment variable. Operator keeps it in a password manager / script env. The page does not store it.
- This is **not** user auth: no sessions, no OAuth, no roles, no per-user permissions.

Rationale: the site is meant to be opened by club members without accounts. A public Vercel URL with an unprotected `POST` would allow anyone to inject fake results.

### No admin panel

The only operator UI is the unlinked `/upload` page described above. Other operator tasks (and later maybe delete/edit if we add them) go through API endpoints. Do not build a back-office.

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
| Statistics page catalog | Decided. See [Statistics](#statistics). |
| Player page | Decided. See [Browse stored tournaments](#browse-stored-tournaments). |
| Head-to-head | Decided. See [Head-to-head](#head-to-head). |
| Upload body format | Decided: TRF at `POST /api/upload-tournament-trf`. The hidden `/upload` page reviews that file, then saves through a server action. |
| Charts | Later. |
| Tie-breaks on the tournament page | Later. Values stay in `standings`. The page shows place, player, and points. |
| Chess Manager URL on public pages | Later. The value stays in `tournaments.chess_manager_url`. Public tournament views do not show it. |
| Edit/delete tournament after upload | Not decided. Do not build unless asked. |
| Custom domain, SEO program, PWA | Not decided; not required for v1. |

## Success criteria (v1 direction)

A visitor can, without logging in, browse club tournaments and see useful aggregate stats in Polish, including over a chosen time range. The operator can add a finished tournament via the hidden `/upload` page or the protected API. The project stays a single small web app on free-tier hosting, without accounts or an admin dashboard.
