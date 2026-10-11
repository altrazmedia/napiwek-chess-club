import { playerMatchKey } from "./names";
import { playerSlugFromNames } from "./slug";

export type ReviewPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
};

export type PlayerResolution =
  | { startNumber: number; kind: "existing"; playerId: string }
  | { startNumber: number; kind: "new"; firstName: string; lastName: string };

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Polish sentence when the review cannot be saved. Null when the choices are usable.
 * Does not check the upload token or whether the tournament date is already taken.
 */
export function reviewValidationError(args: {
  name: string;
  heldOn: string;
  startNumbers: number[];
  resolutions: PlayerResolution[];
  dbPlayers: ReviewPlayer[];
}): string | null {
  if (!args.name.trim()) {
    return "Podaj nazwę turnieju.";
  }
  if (!isRealDate(args.heldOn)) {
    return "Podaj prawidłową datę.";
  }

  const expected = new Set(args.startNumbers);
  if (expected.size !== args.startNumbers.length) {
    return "Dane zawodników nie zgadzają się z plikiem.";
  }
  const seenStarts = new Set<number>();
  for (const resolution of args.resolutions) {
    if (!expected.has(resolution.startNumber) || seenStarts.has(resolution.startNumber)) {
      return "Dane zawodników nie zgadzają się z plikiem.";
    }
    seenStarts.add(resolution.startNumber);
  }
  if (seenStarts.size !== expected.size) {
    return "Dane zawodników nie zgadzają się z plikiem.";
  }

  const byId = new Map(args.dbPlayers.map((player) => [player.id, player]));
  const byKey = new Map(
    args.dbPlayers.map((player) => [playerMatchKey(player.firstName, player.lastName), player]),
  );

  const usedExisting = new Set<string>();
  for (const resolution of args.resolutions) {
    if (resolution.kind !== "existing") {
      continue;
    }
    if (!byId.has(resolution.playerId)) {
      return "Wybrany zawodnik nie istnieje.";
    }
    if (usedExisting.has(resolution.playerId)) {
      return "Ten sam zawodnik jest wybrany więcej niż raz.";
    }
    usedExisting.add(resolution.playerId);
  }

  const usedSlugs = new Set<string>();
  for (const resolution of args.resolutions) {
    if (resolution.kind !== "new") {
      continue;
    }
    const firstName = resolution.firstName.trim();
    const lastName = resolution.lastName.trim();
    if (!firstName || !lastName) {
      return "Podaj imię i nazwisko nowego zawodnika.";
    }

    const matched = byKey.get(playerMatchKey(firstName, lastName));
    if (matched) {
      return `Zawodnik ${matched.firstName} ${matched.lastName} już jest w bazie. Wybierz go z listy.`;
    }

    let slug: string;
    try {
      slug = playerSlugFromNames(firstName, lastName);
    } catch {
      return "Podaj imię i nazwisko, z którego da się utworzyć adres.";
    }
    if (usedSlugs.has(slug) || args.dbPlayers.some((player) => player.slug === slug)) {
      return `Adres zawodnika „${slug}” jest już zajęty.`;
    }
    usedSlugs.add(slug);
  }

  return null;
}
