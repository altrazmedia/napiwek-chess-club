import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const gameResult = pgEnum("game_result", [
  "white_win",
  "black_win",
  "draw",
  "white_win_forfeit",
  "black_win_forfeit",
  "unplayed",
  "bye",
]);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    slug: text("slug").notNull().unique(),
    fullName: text("full_name")
      .generatedAlwaysAs(sql`first_name || ' ' || last_name`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("players_slug_kebab", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`)],
);

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    heldOn: date("held_on").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tournaments_held_on_idx").on(table.heldOn),
    check("tournaments_slug_kebab", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
  ],
);

export const tournamentPlayers = pgTable(
  "tournament_players",
  {
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.tournamentId, table.playerId] })],
);

export const standings = pgTable(
  "standings",
  {
    tournamentId: uuid("tournament_id").notNull(),
    playerId: uuid("player_id").notNull(),
    position: integer("position").notNull(),
    points: numeric("points", { precision: 5, scale: 1 }).notNull(),
    buchholz: numeric("buchholz", { precision: 6, scale: 1 }),
    buchholzCut1: numeric("buchholz_cut1", { precision: 6, scale: 1 }),
    sonnebornBerger: numeric("sonneborn_berger", { precision: 6, scale: 1 }),
  },
  (table) => [
    primaryKey({ columns: [table.tournamentId, table.playerId] }),
    unique("standings_tournament_id_position_unique").on(table.tournamentId, table.position),
    foreignKey({
      columns: [table.tournamentId, table.playerId],
      foreignColumns: [tournamentPlayers.tournamentId, tournamentPlayers.playerId],
    }).onDelete("cascade"),
  ],
);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    whitePlayerId: uuid("white_player_id").references(() => players.id, {
      onDelete: "restrict",
    }),
    blackPlayerId: uuid("black_player_id").references(() => players.id, {
      onDelete: "restrict",
    }),
    result: gameResult("result").notNull(),
  },
  (table) => [
    index("games_tournament_id_round_idx").on(table.tournamentId, table.round),
    index("games_white_player_id_idx").on(table.whitePlayerId),
    index("games_black_player_id_idx").on(table.blackPlayerId),
    check("games_round_positive", sql`${table.round} > 0`),
    check(
      "games_distinct_players",
      sql`${table.whitePlayerId} IS DISTINCT FROM ${table.blackPlayerId}`,
    ),
    check(
      "games_bye_exactly_one_player",
      sql`(${table.result} = 'bye' AND (${table.whitePlayerId} IS NULL) <> (${table.blackPlayerId} IS NULL)) OR (${table.result} <> 'bye' AND ${table.whitePlayerId} IS NOT NULL AND ${table.blackPlayerId} IS NOT NULL)`,
    ),
    foreignKey({
      columns: [table.tournamentId, table.whitePlayerId],
      foreignColumns: [tournamentPlayers.tournamentId, tournamentPlayers.playerId],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.tournamentId, table.blackPlayerId],
      foreignColumns: [tournamentPlayers.tournamentId, tournamentPlayers.playerId],
    }).onDelete("cascade"),
  ],
);
