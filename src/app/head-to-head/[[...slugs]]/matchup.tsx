import Link from "next/link";
import { listHeadToHeadGames, type PlayerOption } from "@/lib/db/queries/head-to-head";
import { formatHeldOn } from "@/lib/format-held-on";
import { routes } from "@/lib/routes";
import {
  headToHeadSummary,
  type HeadToHeadGame,
  type HeadToHeadRecord,
} from "@/lib/stats/head-to-head";

export async function Matchup({
  playerA,
  playerB,
}: {
  playerA: PlayerOption;
  playerB: PlayerOption;
}) {
  const games = await loadGames(playerA.id, playerB.id);

  if (games === null) {
    return <p className="mt-8">Nie udało się wczytać partii.</p>;
  }

  const summary = headToHeadSummary(games, playerA.id);

  return (
    <>
      <section className="mt-8">
        <RecordBlock title="Ogólnie" record={summary.overall} playerA={playerA} playerB={playerB} />
        <RecordBlock
          title={`${fullName(playerA)} białymi`}
          record={summary.aWhite}
          playerA={playerA}
          playerB={playerB}
        />
        <RecordBlock
          title={`${fullName(playerB)} białymi`}
          record={summary.bWhite}
          playerA={playerA}
          playerB={playerB}
        />
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Partie</h2>
        {summary.games.length === 0 ? (
          <p className="mt-3">Ci zawodnicy nie rozegrali jeszcze partii.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {summary.games.map((game) => (
              <GameItem key={game.id} game={game} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function RecordBlock({
  title,
  record,
  playerA,
  playerB,
}: {
  title: string;
  record: HeadToHeadRecord;
  playerA: PlayerOption;
  playerB: PlayerOption;
}) {
  return (
    <div className="mt-4 flex flex-col gap-1 first:mt-0">
      <h2 className="font-semibold">{title}</h2>
      <p>{`Wygrane ${fullName(playerA)}: ${record.winsA}`}</p>
      <p>{`Wygrane ${fullName(playerB)}: ${record.winsB}`}</p>
      <p>Remisy: {record.draws}</p>
    </div>
  );
}

function GameItem({ game }: { game: HeadToHeadGame }) {
  const whiteWins = game.result === "white_win";
  const blackWins = game.result === "black_win";

  return (
    <li>
      <Link href={routes.tournament(game.tournamentSlug)} className="hover:underline">
        {game.tournamentName}
      </Link>
      <p>{formatHeldOn(game.heldOn)}</p>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-3">
        <div className="min-w-0 text-right">
          <PlayerName player={game.white} bold={whiteWins} />
        </div>
        <div>{scoreLabel(game.result)}</div>
        <div className="min-w-0 text-left">
          <PlayerName player={game.black} bold={blackWins} />
        </div>
      </div>
    </li>
  );
}

function PlayerName({ player, bold }: { player: HeadToHeadGame["white"]; bold: boolean }) {
  return (
    <Link
      href={routes.player(player.slug)}
      className={bold ? "font-bold hover:underline" : "hover:underline"}
    >
      {fullName(player)}
    </Link>
  );
}

function scoreLabel(result: HeadToHeadGame["result"]) {
  switch (result) {
    case "white_win":
      return "1 - 0";
    case "black_win":
      return "0 - 1";
    case "draw":
      return "½ - ½";
  }
}

function fullName(player: { firstName: string; lastName: string }) {
  return `${player.firstName} ${player.lastName}`;
}

async function loadGames(playerAId: string, playerBId: string) {
  try {
    return await listHeadToHeadGames(playerAId, playerBId);
  } catch (error) {
    console.error(error);
    return null;
  }
}
