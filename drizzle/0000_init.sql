CREATE TYPE "public"."game_result" AS ENUM('white_win', 'black_win', 'draw', 'white_win_forfeit', 'black_win_forfeit', 'unplayed', 'bye');--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"white_player_id" uuid,
	"black_player_id" uuid,
	"result" "game_result" NOT NULL,
	CONSTRAINT "games_round_positive" CHECK ("games"."round" > 0),
	CONSTRAINT "games_distinct_players" CHECK ("games"."white_player_id" IS DISTINCT FROM "games"."black_player_id"),
	CONSTRAINT "games_bye_exactly_one_player" CHECK (("games"."result" = 'bye' AND ("games"."white_player_id" IS NULL) <> ("games"."black_player_id" IS NULL)) OR ("games"."result" <> 'bye' AND "games"."white_player_id" IS NOT NULL AND "games"."black_player_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"slug" text NOT NULL,
	"full_name" text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_slug_unique" UNIQUE("slug"),
	CONSTRAINT "players_slug_kebab" CHECK ("players"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"points" numeric(5, 1) NOT NULL,
	"buchholz" numeric(6, 1),
	"buchholz_cut1" numeric(6, 1),
	"sonneborn_berger" numeric(6, 1),
	CONSTRAINT "standings_tournament_id_player_id_pk" PRIMARY KEY("tournament_id","player_id"),
	CONSTRAINT "standings_tournament_id_position_unique" UNIQUE("tournament_id","position")
);
--> statement-breakpoint
CREATE TABLE "tournament_players" (
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	CONSTRAINT "tournament_players_tournament_id_player_id_pk" PRIMARY KEY("tournament_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"held_on" date NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tournaments_slug_kebab" CHECK ("tournaments"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_white_player_id_players_id_fk" FOREIGN KEY ("white_player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_black_player_id_players_id_fk" FOREIGN KEY ("black_player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_white_player_id_tournament_players_tournament_id_player_id_fk" FOREIGN KEY ("tournament_id","white_player_id") REFERENCES "public"."tournament_players"("tournament_id","player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_tournament_id_black_player_id_tournament_players_tournament_id_player_id_fk" FOREIGN KEY ("tournament_id","black_player_id") REFERENCES "public"."tournament_players"("tournament_id","player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_tournament_id_player_id_tournament_players_tournament_id_player_id_fk" FOREIGN KEY ("tournament_id","player_id") REFERENCES "public"."tournament_players"("tournament_id","player_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_players" ADD CONSTRAINT "tournament_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_tournament_id_round_idx" ON "games" USING btree ("tournament_id","round");--> statement-breakpoint
CREATE INDEX "games_white_player_id_idx" ON "games" USING btree ("white_player_id");--> statement-breakpoint
CREATE INDEX "games_black_player_id_idx" ON "games" USING btree ("black_player_id");--> statement-breakpoint
CREATE INDEX "tournaments_held_on_idx" ON "tournaments" USING btree ("held_on");