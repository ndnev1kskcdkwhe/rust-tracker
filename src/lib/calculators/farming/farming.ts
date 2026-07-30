import { FARMING_DATA, type Resource, type ToolId } from "./data";

function getToolData(resource: Resource, toolId: ToolId) {
  const data = FARMING_DATA[resource][toolId];
  if (!data) {
    throw new Error(`Unknown tool "${toolId}" for resource "${resource}"`);
  }
  return data;
}

/**
 * Average resource yielded per hit, derived from the node's total yield and the
 * midpoint of its published depletion-time range. See data.ts for why this is an
 * approximation rather than a stated game constant.
 */
export function averageYieldPerHit(resource: Resource, toolId: ToolId): number {
  const data = getToolData(resource, toolId);
  const hitsPerSecond = data.hitsPerMinute / 60;
  const avgDepletionTimeSec = (data.depletionTimeSecMin + data.depletionTimeSecMax) / 2;
  const hitsToDeplete = hitsPerSecond * avgDepletionTimeSec;
  return data.nodeYield / hitsToDeplete;
}

export function hitsPerSecond(resource: Resource, toolId: ToolId): number {
  return getToolData(resource, toolId).hitsPerMinute / 60;
}

/**
 * Number of hits needed to gather at least `targetQuantity` of a resource.
 * `gatherMultiplier` is the server's gather-rate setting (1x by default) — it scales
 * yield per hit linearly, matching how Rust server configs apply this multiplier.
 */
export function hitsNeeded(
  resource: Resource,
  toolId: ToolId,
  targetQuantity: number,
  gatherMultiplier = 1
): number {
  const yieldPerHit = averageYieldPerHit(resource, toolId) * gatherMultiplier;
  return Math.ceil(targetQuantity / yieldPerHit);
}

/** Estimated time in seconds to gather at least `targetQuantity` of a resource. */
export function timeNeededSeconds(
  resource: Resource,
  toolId: ToolId,
  targetQuantity: number,
  gatherMultiplier = 1
): number {
  const hits = hitsNeeded(resource, toolId, targetQuantity, gatherMultiplier);
  return hits / hitsPerSecond(resource, toolId);
}
