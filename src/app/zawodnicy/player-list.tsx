"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { PlayerListItem } from "@/lib/db/queries/players";
import { PlayerCard } from "./player-card";

export function PlayerList({ players }: { players: PlayerListItem[] }) {
  const [query, setQuery] = useState("");
  const visible = players.filter((player) => matchesPlayer(player, query));

  return (
    <>
      <label className="mt-6 flex max-w-sm flex-col gap-2 text-sm font-medium">
        Szukaj
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Imię lub nazwisko"
          type="search"
        />
      </label>
      {visible.length === 0 ? (
        <p className="mt-6">Brak zawodników o tym imieniu lub nazwisku.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {visible.map((player) => (
            <li key={player.slug} className="h-full">
              <PlayerCard player={player} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function matchesPlayer(player: PlayerListItem, query: string) {
  const needle = query.trim().toLocaleLowerCase("pl");
  if (needle.length === 0) {
    return true;
  }

  const firstName = player.firstName.toLocaleLowerCase("pl");
  const lastName = player.lastName.toLocaleLowerCase("pl");
  return (
    firstName.includes(needle) ||
    lastName.includes(needle) ||
    `${firstName} ${lastName}`.includes(needle)
  );
}
