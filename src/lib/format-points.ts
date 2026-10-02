const pointsFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatPoints(points: string) {
  return pointsFormat.format(Number(points));
}
