import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { Spinner } from "@/components/spinner";
import { listPlayerOptions, type PlayerOption } from "@/lib/db/queries/head-to-head";
import { routes } from "@/lib/routes";
import { Matchup } from "./matchup";
import { PlayerPicker } from "./player-picker";

export default async function HeadToHeadPage({ params }: PageProps<"/head-to-head/[[...slugs]]">) {
  const { slugs } = await params;
  const requested = slugs ?? [];

  if (requested.length > 2) {
    notFound();
  }

  const players = await loadPlayers();

  if (players === null) {
    return (
      <PageShell title="Bezpośrednio">
        <p className="mt-6">Nie udało się wczytać zawodników.</p>
      </PageShell>
    );
  }

  const selected = resolvePlayers(requested, players);
  const selectedSlugs = selected.map((player) => player.slug);
  if (!sameSlugs(requested, selectedSlugs)) {
    redirect(routes.headToHead(...selectedSlugs));
  }

  if (players.length === 0) {
    return (
      <PageShell title="Bezpośrednio">
        <p className="mt-6">Nie ma jeszcze zawodników.</p>
      </PageShell>
    );
  }

  const [playerA, playerB] = selected;

  return (
    <PageShell>
      <PlayerPicker
        key={selectedSlugs.join("/")}
        players={players.map(({ slug, firstName, lastName }) => ({ slug, firstName, lastName }))}
        initialFirstSlug={playerA?.slug ?? null}
        initialSecondSlug={playerB?.slug ?? null}
      />
      {playerA && playerB ? (
        <>
          <h1 className="mt-8 text-center text-2xl font-semibold">
            <span className="text-pink">
              {playerA.firstName} {playerA.lastName}
            </span>
            {" vs. "}
            <span className="text-blue">
              {playerB.firstName} {playerB.lastName}
            </span>
          </h1>
          <Suspense fallback={<Spinner />}>
            <Matchup playerA={playerA} playerB={playerB} />
          </Suspense>
        </>
      ) : null}
    </PageShell>
  );
}

function resolvePlayers(slugs: string[], players: PlayerOption[]) {
  const bySlug = new Map(players.map((player) => [player.slug, player]));
  const selected: PlayerOption[] = [];

  for (const slug of slugs) {
    const player = bySlug.get(slug);
    if (!player || selected.some((existing) => existing.slug === player.slug)) {
      continue;
    }
    selected.push(player);
  }

  return selected;
}

function sameSlugs(requested: string[], selected: string[]) {
  return (
    requested.length === selected.length &&
    requested.every((slug, index) => slug === selected[index])
  );
}

async function loadPlayers(): Promise<PlayerOption[] | null> {
  try {
    return await listPlayerOptions();
  } catch (error) {
    console.error(error);
    return null;
  }
}
