import { PageShell } from "@/components/page-shell";
import { listPlayers, type PlayerListItem } from "@/lib/db/queries/players";
import { PlayerList } from "./player-list";

export default async function PlayersPage() {
  const players = await loadPlayers();

  if (players === null) {
    return (
      <PageShell title="Zawodnicy">
        <p className="mt-6">Nie udało się wczytać zawodników.</p>
      </PageShell>
    );
  }

  if (players.length === 0) {
    return (
      <PageShell title="Zawodnicy">
        <p className="mt-6">Nie ma jeszcze żadnych zawodników.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Zawodnicy">
      <PlayerList players={players} />
    </PageShell>
  );
}

async function loadPlayers(): Promise<PlayerListItem[] | null> {
  try {
    return await listPlayers();
  } catch (error) {
    console.error(error);
    return null;
  }
}
