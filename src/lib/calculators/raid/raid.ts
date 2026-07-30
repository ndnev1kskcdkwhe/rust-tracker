import {
  DOOR_DAMAGE,
  DOOR_HP,
  EXPLOSIVES,
  GENERIC_PIECE_DAMAGE,
  TIER_HP,
  TWIG_ONE_HIT_KILL,
  type ExplosiveId,
  type RaidTarget,
} from "./data";

export function getTargetHp(target: RaidTarget): number {
  return target.kind === "door" ? DOOR_HP[target.door] : TIER_HP[target.tier];
}

function isTwigOneHitKill(target: RaidTarget, explosive: ExplosiveId): boolean {
  return target.kind === "generic" && target.tier === "twig" && TWIG_ONE_HIT_KILL.includes(explosive);
}

/** Effective damage per hit (resistance already baked in, as published by the source). */
export function getDamagePerHit(target: RaidTarget, explosive: ExplosiveId): number | null {
  if (target.kind === "door") {
    return DOOR_DAMAGE[target.door][explosive];
  }
  return GENERIC_PIECE_DAMAGE[target.tier][explosive][target.side];
}

/**
 * влучень = ceil(HP / (шкода_за_удар × (1 − resistance)))
 * The stored damage values already have resistance applied, so this is ceil(HP / dmgPerHit).
 * Returns null only if neither an exact damage value nor a known one-hit-kill fact exists.
 */
export function hitsNeeded(target: RaidTarget, explosive: ExplosiveId): number | null {
  if (isTwigOneHitKill(target, explosive)) {
    return 1;
  }
  const dmg = getDamagePerHit(target, explosive);
  if (dmg == null) {
    return null;
  }
  return Math.ceil(getTargetHp(target) / dmg);
}

export interface RaidCombinationResult {
  combination: Partial<Record<ExplosiveId, number>>;
  totalSulfurCost: number;
}

/**
 * Finds the cheapest (by sulfur cost) mix of the available explosive types that destroys
 * the target. Solved as an unbounded-knapsack "reach at least HP damage" DP over integer
 * damage steps 0..HP, which is exact for any single explosive type and near-optimal for
 * mixes (small ceiling-rounding per step, consistent with the game's own per-hit ceiling).
 */
export function cheapestCombination(
  target: RaidTarget,
  available: ExplosiveId[]
): RaidCombinationResult | null {
  if (available.length === 0) {
    return null;
  }

  const hp = getTargetHp(target);
  let best: RaidCombinationResult | null = null;

  const oneHitCandidates = available.filter((e) => isTwigOneHitKill(target, e));
  for (const explosive of oneHitCandidates) {
    const cost = EXPLOSIVES[explosive].sulfurCostPerUnit;
    if (!best || cost < best.totalSulfurCost) {
      best = { combination: { [explosive]: 1 }, totalSulfurCost: cost };
    }
  }

  const dmgItems = available
    .map((id) => ({ id, dmg: getDamagePerHit(target, id), cost: EXPLOSIVES[id].sulfurCostPerUnit }))
    .filter((item): item is { id: ExplosiveId; dmg: number; cost: number } => item.dmg != null);

  if (dmgItems.length > 0) {
    const INF = Number.POSITIVE_INFINITY;
    const dp = new Array<number>(hp + 1).fill(INF);
    const choice = new Array<ExplosiveId | null>(hp + 1).fill(null);
    dp[0] = 0;

    for (let remaining = 1; remaining <= hp; remaining++) {
      for (const item of dmgItems) {
        const prevRemaining = Math.max(0, Math.ceil(remaining - item.dmg));
        const candidateCost = dp[prevRemaining] + item.cost;
        if (candidateCost < dp[remaining]) {
          dp[remaining] = candidateCost;
          choice[remaining] = item.id;
        }
      }
    }

    if (dp[hp] < INF && (!best || dp[hp] < best.totalSulfurCost)) {
      const combination: Partial<Record<ExplosiveId, number>> = {};
      let remaining = hp;
      while (remaining > 0) {
        const id = choice[remaining];
        if (!id) break;
        combination[id] = (combination[id] ?? 0) + 1;
        const item = dmgItems.find((i) => i.id === id)!;
        remaining = Math.max(0, Math.ceil(remaining - item.dmg));
      }
      best = { combination, totalSulfurCost: dp[hp] };
    }
  }

  return best;
}
