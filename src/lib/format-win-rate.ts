const percentFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatWinRate(wins: number, played: number) {
  if (played === 0) {
    return "0,0% (0/0)";
  }
  return `${formatWinRatePercent(wins, played)} (${wins}/${played})`;
}

export function formatWinRatePercent(wins: number, played: number) {
  if (played === 0) {
    return "0,0%";
  }
  return `${percentFormat.format((wins / played) * 100)}%`;
}
