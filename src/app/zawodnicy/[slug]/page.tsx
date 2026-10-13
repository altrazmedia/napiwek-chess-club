import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Spinner } from "@/components/spinner";
import { getPlayerBySlug, type PlayerIdentity } from "@/lib/db/queries/players";
import { FrequentOpponents } from "./frequent-opponents";
import { GameStats } from "./game-stats";
import { PointsShare } from "./points-share";
import { TournamentResults } from "./tournament-results";

export default async function PlayerPage({ params }: PageProps<"/zawodnicy/[slug]">) {
  const { slug } = await params;
  const player = await loadPlayer(slug);

  if (player === "error") {
    return (
      <PageShell title="Zawodnik">
        <p className="mt-6">Nie udało się wczytać zawodnika.</p>
      </PageShell>
    );
  }

  if (player === null) {
    notFound();
  }

  return (
    <PageShell title={`${player.firstName} ${player.lastName}`}>
      <Suspense fallback={<Spinner />}>
        <GameStats playerId={player.id} />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <PointsShare playerId={player.id} />
      </Suspense>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2 [&>*]:min-w-0 [&>*:only-child]:lg:col-span-2">
        <Suspense fallback={<Spinner />}>
          <TournamentResults playerId={player.id} />
        </Suspense>
        <Suspense fallback={<Spinner />}>
          <FrequentOpponents playerId={player.id} playerSlug={player.slug} />
        </Suspense>
      </div>
    </PageShell>
  );
}

async function loadPlayer(slug: string): Promise<PlayerIdentity | null | "error"> {
  try {
    return await getPlayerBySlug(slug);
  } catch (error) {
    console.error(error);
    return "error";
  }
}
