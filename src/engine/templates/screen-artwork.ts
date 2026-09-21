/** Allowlisted local artwork survives save/load without temporary asset URLs. */
export function templateScreenUrl(artwork: unknown): string | null {
  if (typeof artwork === "string" && PREMIUM_ARTWORK.has(artwork)) return `/templates/studio/${artwork}.svg`;
  if (artwork === "studio-tablet" || artwork === "studio-desktop") return `/templates/studio/${artwork}.svg`;
  if (artwork === "nebula") return "/templates/nebula/player.svg";
  if (artwork === "emerald") return "/templates/emerald/finance.svg";
  return artwork === "editorial" || artwork === "manifesto" || artwork === "landscape"
    ? `/templates/kinetic/${artwork}.svg`
    : null;
}

const PREMIUM_ARTWORK = new Set([
  "crimson-editorial", "neon-portfolio", "midnight-sales", "bold-studio", "floating-commerce",
  "amber-agency", "amber-tablet", "lime-campaign", "amber-mobile", "lime-mobile",
]);
