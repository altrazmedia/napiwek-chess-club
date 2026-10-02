import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Spinner } from "@/components/spinner";
import { getPlayerBySlug, type PlayerIdentity } from "@/lib/db/queries/players";
import { FrequentOpponents } from "./frequent-opponents";
import { GameStats } from "./game-stats";
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
        <TournamentResults playerId={player.id} />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <FrequentOpponents playerId={player.id} />
      </Suspense>
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
