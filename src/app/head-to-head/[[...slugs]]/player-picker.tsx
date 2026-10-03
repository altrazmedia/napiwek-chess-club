"use client";

import { Combobox } from "@base-ui/react/combobox";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { routes } from "@/lib/routes";

export type PlayerChoice = {
  slug: string;
  firstName: string;
  lastName: string;
};

export function PlayerPicker({
  players,
  initialFirstSlug,
  initialSecondSlug,
}: {
  players: PlayerChoice[];
  initialFirstSlug: string | null;
  initialSecondSlug: string | null;
}) {
  const router = useRouter();
  const [first, setFirst] = useState(() => findPlayer(players, initialFirstSlug));
  const [second, setSecond] = useState(() => findPlayer(players, initialSecondSlug));
  const secondPlayers = players.filter((player) => player.slug !== first?.slug);
  const canShow = first != null && second != null && first.slug !== second.slug;

  function selectFirst(player: PlayerChoice | null) {
    setFirst(player);
    if (player && second?.slug === player.slug) {
      setSecond(null);
    }
  }

  function showMatchup() {
    if (!first || !second || first.slug === second.slug) {
      return;
    }
    router.push(routes.headToHead(first.slug, second.slug));
  }

  return (
    <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end">
      <PlayerField
        label="Pierwszy zawodnik"
        players={players}
        value={first}
        onChange={selectFirst}
      />
      <PlayerField
        label="Drugi zawodnik"
        players={secondPlayers}
        value={second}
        onChange={setSecond}
      />
      <button
        type="button"
        onClick={showMatchup}
        disabled={!canShow}
        className="h-8 shrink-0 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        Pokaż
      </button>
    </div>
  );
}

function PlayerField({
  label,
  players,
  value,
  onChange,
}: {
  label: string;
  players: PlayerChoice[];
  value: PlayerChoice | null;
  onChange: (player: PlayerChoice | null) => void;
}) {
  const inputId = useId();

  return (
    <Combobox.Root
      items={players}
      value={value}
      onValueChange={onChange}
      itemToStringLabel={playerLabel}
      isItemEqualToValue={(item, selected) => item.slug === selected.slug}
      filter={(player, query) => matchesPlayer(player, query)}
      autoHighlight
    >
      <div className="flex w-full min-w-0 flex-col gap-2 md:flex-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <Combobox.InputGroup className="flex h-8 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <Combobox.Input
            id={inputId}
            placeholder="Wybierz zawodnika"
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          />
          <Combobox.Trigger
            aria-label={`Otwórz listę: ${label}`}
            className="flex size-8 shrink-0 items-center justify-center text-muted-foreground"
          >
            <ChevronDown className="size-4" aria-hidden />
          </Combobox.Trigger>
        </Combobox.InputGroup>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4} align="start">
          <Combobox.Popup className="max-h-60 w-(--anchor-width) overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none">
            <Combobox.Empty className="text-sm text-muted-foreground">
              <span className="block px-2 py-1.5">Brak zawodników o tym imieniu lub nazwisku.</span>
            </Combobox.Empty>
            <Combobox.List>
              {(player: PlayerChoice) => (
                <Combobox.Item
                  key={player.slug}
                  value={player}
                  className="cursor-default rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {playerLabel(player)}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function findPlayer(players: PlayerChoice[], slug: string | null) {
  if (!slug) {
    return null;
  }
  return players.find((player) => player.slug === slug) ?? null;
}

function playerLabel(player: PlayerChoice) {
  return `${player.firstName} ${player.lastName}`;
}

function matchesPlayer(player: PlayerChoice, query: string) {
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
