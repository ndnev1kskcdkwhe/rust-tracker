export interface ExternalPlayerLink {
  id: string;
  label: string;
  /** Shown under the label — sets expectations when the link can't jump straight to the player. */
  hint: string;
  href: string;
}

/**
 * Links out to the other Rust player-tracking sites.
 *
 * BattleMetrics gets a real deep link: their public player search takes a SteamID64 as a
 * query filter, so the visitor lands on the right player. Their own API is paywalled for us
 * (verified: every endpoint returns 403 without a subscription), but sending a *person's
 * browser* to their site is just a normal outbound link.
 *
 * Atlas only gets a link to its lookup tool, not to the player: checked live on 2026-07-31 —
 * no URL shape carries a SteamID (`/player-lookup/<id>` and every `?steamid=`/`?q=` variant
 * 404s), and submitting the form redirects to a Steam login first. Pretending we can deep
 * link there would just produce dead links, so the hint says to paste the ID.
 */
export function buildExternalPlayerLinks(steamId: string): ExternalPlayerLink[] {
  return [
    {
      id: "steam",
      label: "Steam",
      hint: "Профіль, ігри, друзі",
      href: `https://steamcommunity.com/profiles/${steamId}`,
    },
    {
      id: "battlemetrics",
      label: "BattleMetrics",
      hint: "Сесії, сервери, бани",
      href: `https://www.battlemetrics.com/players?filter[search]=${encodeURIComponent(steamId)}`,
    },
    {
      id: "atlas",
      label: "Atlas Rust",
      hint: "Встав SteamID у їхній пошук — прямого посилання немає",
      href: "https://atlasrust.com/player-lookup",
    },
  ];
}
