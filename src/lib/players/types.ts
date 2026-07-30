/**
 * BattleMetrics is currently unreachable (their API requires a paid subscription as of
 * 2026-07-30, confirmed by a live 403 on every endpoint including unauthenticated ones —
 * see README). This section is modeled as a discriminated union so the UI can show a clear
 * "unavailable" state now, and the `available: true` branch is ready to fill in once a
 * subscription is added — no DTO/UI redesign needed then, just implement the BattleMetrics
 * client and populate this branch.
 */
export type BattlemetricsSection =
  | { available: false; reason: string }
  | {
      available: true;
      nameHistory: { name: string; firstSeen: string }[];
      recentServers: { id: string; name: string; lastSeen: string }[];
      bans: { reason: string; server: string; expires: string | null }[];
    };

export interface PlayerProfile {
  steamId: string;
  name: string;
  avatarUrl: string;
  profileUrl: string;
  /** null when the target's Steam privacy settings hide their game list. */
  hoursInRust: number | null;
  vacBanned: boolean;
  gameBans: number;
  communityBanned: boolean;
  /** "none" | "probation" | "banned" */
  economyBan: string;
  daysSinceLastBan: number;
  battlemetrics: BattlemetricsSection;
  /** ISO timestamp of when this profile was fetched from external APIs. */
  fetchedAt: string;
}
