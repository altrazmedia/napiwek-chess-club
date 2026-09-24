import { normalizeNamePart } from "./names";

/** ASCII-folded kebab slug: firstname-lastname (single segment for mononyms). */
export function playerSlugFromNames(firstName: string, lastName: string): string {
  const first = slugifyPart(firstName);
  const last = slugifyPart(lastName);
  if (!first || !last) {
    throw new Error(`Cannot build player slug from "${firstName}" "${lastName}"`);
  }
  if (first === last) {
    return first;
  }
  return `${first}-${last}`;
}

/** Tournament slug from held_on date: YYYY-MM-DD. */
export function tournamentSlugFromDate(heldOn: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(heldOn)) {
    throw new Error(`Invalid tournament date for slug: ${heldOn}`);
  }
  return heldOn;
}

function slugifyPart(value: string): string {
  return normalizeNamePart(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
