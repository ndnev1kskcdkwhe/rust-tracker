/**
 * Farming calculator reference data.
 *
 * Source: wiki.rustclash.com, fetched 2026-07-30 — each tool's "Gather" tab.
 *
 * The site does not publish a flat "yield per hit" constant anywhere (checked the raw
 * page data, no such field exists). What it publishes per tool/resource node is:
 *   - total yield from fully depleting one node
 *   - a time-to-deplete range (server-tick variance, hence a range not a fixed number)
 *   - the tool's damage + attack speed (HPM — hits per minute), on the tool's own page
 *
 * Average yield per hit is therefore *derived*, not a stated game constant:
 *   hitsToDeplete = hitsPerSecond × avgDepletionTimeSeconds
 *   yieldPerHit   = nodeYield / hitsToDeplete
 * This is an approximation (the depletion time is a range, we use its midpoint) — flagged
 * here and in the calculator UI rather than presented as an exact figure.
 */

export type Resource = "wood" | "stone" | "metalOre" | "sulfurOre";

export interface ToolNodeData {
  toolLabel: string;
  hitsPerMinute: number;
  nodeYield: number;
  depletionTimeSecMin: number;
  depletionTimeSecMax: number;
}

export const RESOURCE_LABELS: Record<Resource, string> = {
  wood: "Дерево",
  stone: "Камінь",
  metalOre: "Металева руда",
  sulfurOre: "Сірчана руда",
};

export const FARMING_DATA: Record<Resource, Record<string, ToolNodeData>> = {
  wood: {
    stoneHatchet: { toolLabel: "Кам'яна сокира", hitsPerMinute: 67, nodeYield: 608, depletionTimeSecMin: 26, depletionTimeSecMax: 26 },
    hatchet: { toolLabel: "Сокира (метал)", hitsPerMinute: 67, nodeYield: 651, depletionTimeSecMin: 19, depletionTimeSecMax: 19 },
    salvagedAxe: { toolLabel: "Salvaged Axe", hitsPerMinute: 48, nodeYield: 750, depletionTimeSecMin: 20, depletionTimeSecMax: 20 },
    chainsaw: { toolLabel: "Бензопила", hitsPerMinute: 300, nodeYield: 750, depletionTimeSecMin: 5, depletionTimeSecMax: 5 },
  },
  stone: {
    stonePickaxe: { toolLabel: "Кам'яна кирка", hitsPerMinute: 67, nodeYield: 794, depletionTimeSecMin: 9, depletionTimeSecMax: 23 },
    pickaxe: { toolLabel: "Кирка (метал)", hitsPerMinute: 40, nodeYield: 1000, depletionTimeSecMin: 12, depletionTimeSecMax: 27 },
    salvagedIcepick: { toolLabel: "Salvaged Icepick", hitsPerMinute: 48, nodeYield: 1000, depletionTimeSecMin: 7, depletionTimeSecMax: 13 },
    jackhammer: { toolLabel: "Джекхаммер", hitsPerMinute: 400, nodeYield: 1000, depletionTimeSecMin: 1, depletionTimeSecMax: 3 },
  },
  metalOre: {
    stonePickaxe: { toolLabel: "Кам'яна кирка", hitsPerMinute: 67, nodeYield: 485, depletionTimeSecMin: 9, depletionTimeSecMax: 23 },
    pickaxe: { toolLabel: "Кирка (метал)", hitsPerMinute: 40, nodeYield: 600, depletionTimeSecMin: 12, depletionTimeSecMax: 27 },
    salvagedIcepick: { toolLabel: "Salvaged Icepick", hitsPerMinute: 48, nodeYield: 600, depletionTimeSecMin: 7, depletionTimeSecMax: 13 },
    jackhammer: { toolLabel: "Джекхаммер", hitsPerMinute: 400, nodeYield: 600, depletionTimeSecMin: 1, depletionTimeSecMax: 2 },
  },
  sulfurOre: {
    stonePickaxe: { toolLabel: "Кам'яна кирка", hitsPerMinute: 67, nodeYield: 257, depletionTimeSecMin: 10, depletionTimeSecMax: 26 },
    pickaxe: { toolLabel: "Кирка (метал)", hitsPerMinute: 40, nodeYield: 300, depletionTimeSecMin: 12, depletionTimeSecMax: 27 },
    salvagedIcepick: { toolLabel: "Salvaged Icepick", hitsPerMinute: 48, nodeYield: 300, depletionTimeSecMin: 7, depletionTimeSecMax: 13 },
    jackhammer: { toolLabel: "Джекхаммер", hitsPerMinute: 400, nodeYield: 300, depletionTimeSecMin: 1, depletionTimeSecMax: 2 },
  },
};

export type ToolId = string;
