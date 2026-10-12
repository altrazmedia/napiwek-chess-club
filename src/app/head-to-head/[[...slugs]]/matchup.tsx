import { GameCard, type GameCardPlayer } from "@/components/game-card";
import {
  GamesResultComparison,
  type GamesResultSegment,
} from "@/components/games-result-comparison";
import { SectionHeader } from "@/components/section-header";
import { listHeadToHeadGames, type PlayerOption } from "@/lib/db/queries/head-to-head";
import { formatHeldOn } from "@/lib/format-held-on";
import { routes } from "@/lib/routes";
import { headToHeadSummary, type HeadToHeadRecord } from "@/lib/stats/head-to-head";
import { ChessPawnIcon } from "lucide-react";

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

  if (games.length === 0) {
    return (
      <p className="mt-8 text-center text-2xl">Ci gracze nie rozegrali jeszcze żadnej partii</p>
    );
  }

  const summary = headToHeadSummary(games, playerA.id);

  return (
    <>
      <section className="mt-8">
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          <GamesResultComparison
            className="h-full"
            title="Ogólnie"
            segments={recordSegments(summary.overall, playerA, playerB)}
          />
          <GamesResultComparison
            className="h-full"
            title={`${fullName(playerA)} białymi`}
            segments={recordSegments(summary.aWhite, playerA, playerB)}
          />
          <GamesResultComparison
            className="h-full"
            title={`${fullName(playerB)} białymi`}
            segments={recordSegments(summary.bWhite, playerA, playerB)}
          />
        </div>
      </section>
      <section className="mt-8">
        <SectionHeader title="Lista partii" icon={ChessPawnIcon} />
        <ul className="mt-3 flex flex-col gap-4">
          {summary.games.map((game) => (
            <li key={game.id}>
              <GameCard
                white={cardPlayer(game.white)}
                black={cardPlayer(game.black)}
                result={game.result}
                nameLayout="inline"
                description={`${game.tournamentName} · ${formatHeldOn(game.heldOn)}`}
                descriptionHref={routes.tournament(game.tournamentSlug)}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function recordSegments(
  record: HeadToHeadRecord,
  playerA: PlayerOption,
  playerB: PlayerOption,
): GamesResultSegment[] {
  return [
    { label: fullName(playerA), value: record.winsA, colorClassName: "bg-pink" },
    { label: "Remisy", value: record.draws, colorClassName: "bg-muted-foreground" },
    { label: fullName(playerB), value: record.winsB, colorClassName: "bg-blue" },
  ];
}

function cardPlayer(player: { slug: string; firstName: string; lastName: string }): GameCardPlayer {
  return {
    firstName: player.firstName,
    lastName: player.lastName,
    href: routes.player(player.slug),
  };
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
