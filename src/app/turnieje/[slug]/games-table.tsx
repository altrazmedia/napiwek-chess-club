import Link from "next/link";
import type { TournamentGame, TournamentPlayer } from "@/lib/db/queries/tournaments";
import { routes } from "@/lib/routes";

function comparePlayers(a: TournamentPlayer, b: TournamentPlayer) {
  return (
    a.lastName.localeCompare(b.lastName, "pl") ||
    a.firstName.localeCompare(b.firstName, "pl") ||
    a.slug.localeCompare(b.slug, "pl")
  );
}

function leftPlayer(game: TournamentGame): TournamentPlayer | null {
  if (game.result === "bye") {
    return game.white ?? game.black;
  }
  return game.white;
}

function groupByRound(games: TournamentGame[]) {
  const byRound = new Map<number, TournamentGame[]>();
  for (const game of games) {
    const rows = byRound.get(game.round) ?? [];
    rows.push(game);
    byRound.set(game.round, rows);
  }

  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, rows]) => ({
      round,
      games: rows.sort((a, b) => {
        const leftA = leftPlayer(a);
        const leftB = leftPlayer(b);
        if (!leftA && !leftB) {
          return 0;
        }
        if (!leftA) {
          return 1;
        }
        if (!leftB) {
          return -1;
        }
        return comparePlayers(leftA, leftB);
      }),
    }));
}

function PlayerName({ player, bold }: { player: TournamentPlayer; bold?: boolean }) {
  return (
    <Link
      href={routes.player(player.slug)}
      className={bold ? "font-bold hover:underline" : "hover:underline"}
    >
      {player.firstName} {player.lastName}
    </Link>
  );
}

function scoreLabel(game: TournamentGame) {
  switch (game.result) {
    case "white_win":
    case "white_win_forfeit":
      return "1 - 0";
    case "black_win":
    case "black_win_forfeit":
      return "0 - 1";
    case "draw":
      return "½ - ½";
    case "bye":
      return "(bye)";
    case "unplayed":
      return "nie rozegrano";
  }
}

function GameRow({ game }: { game: TournamentGame }) {
  if (game.result === "bye") {
    const player = game.white ?? game.black;
    return (
      <div className="col-span-3 grid grid-cols-subgrid items-start gap-x-3">
        <div className="min-w-0 text-right">{player ? <PlayerName player={player} /> : null}</div>
        <div className="text-center">(bye)</div>
        <div />
      </div>
    );
  }

  const whiteWins = game.result === "white_win" || game.result === "white_win_forfeit";
  const blackWins = game.result === "black_win" || game.result === "black_win_forfeit";
  const forfeit = game.result === "white_win_forfeit" || game.result === "black_win_forfeit";

  return (
    <div className="col-span-3 grid grid-cols-subgrid items-start gap-x-3">
      <div className="min-w-0 text-right">
        {game.white ? <PlayerName player={game.white} bold={whiteWins} /> : null}
      </div>
      <div className="text-center">
        <div>{scoreLabel(game)}</div>
        {forfeit ? <div className="text-xs text-muted-foreground">walkower</div> : null}
      </div>
      <div className="min-w-0 text-left">
        {game.black ? <PlayerName player={game.black} bold={blackWins} /> : null}
      </div>
    </div>
  );
}

export function GamesTable({ games }: { games: TournamentGame[] }) {
  const rounds = groupByRound(games);

  return (
    <div className="mt-8 flex flex-col gap-8">
      {rounds.map((round) => (
        <section key={round.round}>
          <h2 className="text-lg font-semibold">Runda {round.round}</h2>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] gap-y-1">
            {round.games.map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
