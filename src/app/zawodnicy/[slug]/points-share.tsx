import { listPlayerTournaments } from "@/lib/db/queries/players";
import { playerPointsShare, type PlayerPointsSharePoint } from "@/lib/stats/player";
import { PointsShareChart } from "./points-share-chart";
import { SectionHeader } from "@/components/section-header";
import { TrendingUpIcon } from "lucide-react";

export async function PointsShare({ playerId }: { playerId: string }) {
  const points = await loadPointsShare(playerId);

  if (points === "error") {
    return (
      <section className="mt-8">
        <SectionHeader title="Skuteczność punktowa w turniejach" icon={TrendingUpIcon} />
        <p className="mt-3">Nie udało się wczytać procentów punktów.</p>
      </section>
    );
  }

  if (points === null) {
    return null;
  }

  return (
    <section className="mt-8">
      <SectionHeader
        title="Skuteczność punktowa w turniejach"
        icon={TrendingUpIcon}
        className="mb-6"
      />
      <PointsShareChart points={points} />
    </section>
  );
}

async function loadPointsShare(
  playerId: string,
): Promise<PlayerPointsSharePoint[] | null | "error"> {
  try {
    return playerPointsShare(await listPlayerTournaments(playerId));
  } catch (error) {
    console.error(error);
    return "error";
  }
}
