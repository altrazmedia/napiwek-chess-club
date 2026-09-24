/** Strip diacritics and lowercase for accent-blind matching. */
export function normalizeNamePart(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function playerMatchKey(firstName: string, lastName: string): string {
  return `${normalizeNamePart(firstName)}\0${normalizeNamePart(lastName)}`;
}

/**
 * TRF names are "Lastname, Firstname" or "Firstname Lastname".
 */
export function parsePlayerName(raw: string): { firstName: string; lastName: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) {
    throw new Error("Empty player name");
  }

  if (name.includes(",")) {
    const [last, ...rest] = name.split(",");
    const firstName = rest.join(",").trim();
    const lastName = last.trim();
    if (!firstName || !lastName) {
      throw new Error(`Invalid name (expected "Lastname, Firstname"): ${raw}`);
    }
    return { firstName, lastName };
  }

  const parts = name.split(" ");
  if (parts.length === 1) {
    // Mononym / nickname (e.g. "Mr.Slavi") — store as both parts for matching.
    return { firstName: name, lastName: name };
  }
  const lastName = parts[parts.length - 1]!;
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}
