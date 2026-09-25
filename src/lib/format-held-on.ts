export function formatHeldOn(heldOn: string) {
  const [year, month, day] = heldOn.split("-");
  if (!year || !month || !day) {
    return heldOn;
  }
  return `${day}.${month}.${year}`;
}
