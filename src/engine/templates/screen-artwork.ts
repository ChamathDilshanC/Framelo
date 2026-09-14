/** Allowlisted local artwork survives save/load without temporary asset URLs. */
export function templateScreenUrl(artwork: unknown): string | null {
  if (artwork === "nebula") return "/templates/nebula/player.svg";
  return artwork === "editorial" || artwork === "manifesto" || artwork === "landscape"
    ? `/templates/kinetic/${artwork}.svg`
    : null;
}
