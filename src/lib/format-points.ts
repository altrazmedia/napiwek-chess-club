const percentFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatPoints(points: string) {
  return Number(points).toFixed(1);
}

export function formatPointsShare(points: string, rounds: number) {
  if (rounds === 0) {
    return "0,0%";
  }
  return `${percentFormat.format((Number(points) / rounds) * 100)}%`;
}
