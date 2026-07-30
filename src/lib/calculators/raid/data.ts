/**
 * Raid calculator reference data.
 *
 * Source: wiki.rustclash.com (rustlabs.com now redirects there), fetched 2026-07-30.
 * - Tier HP: /building/{tier}-wall, /building/{tier}-foundation, /building/{tier}-floor,
 *   /building/{tier}-triangle-foundation, /building/{tier}-steps (all identical per tier).
 * - Door HP: /item/wooden-door, /item/sheet-metal-door, /item/garage-door, /item/armored-door.
 * - Damage per hit + sulfur cost: each explosive's item page, "Durability" tab
 *   (Hard Side / Soft Side toggle for generic pieces; doors have a single value, no toggle).
 *
 * "Soft side / hard side" is a real mechanic, but only for Foundation/Floor/Triangle/Steps,
 * and it has NO effect on Rocket, Satchel Charge, C4 or Beancan Grenade (identical both sides).
 * It only makes a small (~5-8%) difference for Explosive 5.56 Rifle Ammo. Doors have no side
 * concept at all. The `side` parameter is kept because it's part of the game mechanic and
 * matters for ammo, even though it's a no-op for the other four explosives.
 */

export type Tier = "twig" | "wood" | "stone" | "metal" | "armored";
export type Side = "hard" | "soft";
export type ExplosiveId = "rocket" | "satchel" | "c4" | "beancan" | "explosiveAmmo";
export type DoorType = "woodenDoor" | "sheetMetalDoor" | "garageDoor" | "armoredDoor";

export const TIER_HP: Record<Tier, number> = {
  twig: 10,
  wood: 250,
  stone: 500,
  metal: 1000,
  armored: 2000,
};

export const DOOR_HP: Record<DoorType, number> = {
  woodenDoor: 200,
  sheetMetalDoor: 250,
  garageDoor: 600,
  armoredDoor: 1000,
};

export const EXPLOSIVES: Record<ExplosiveId, { label: string; sulfurCostPerUnit: number }> = {
  rocket: { label: "Ракета", sulfurCostPerUnit: 1400 },
  satchel: { label: "Сачель-заряд", sulfurCostPerUnit: 480 },
  c4: { label: "C4 (Timed Explosive Charge)", sulfurCostPerUnit: 2200 },
  beancan: { label: "Бінкан-граната", sulfurCostPerUnit: 120 },
  explosiveAmmo: { label: "Вибухові патрони 5.56", sulfurCostPerUnit: 25 },
};

/**
 * Damage per hit against generic pieces (Wall/Foundation/Floor/Triangle/Steps).
 * `null` = exact per-hit damage not published for Twig on this explosive; the source table
 * only confirms "1 hit destroys it" (Twig HP is 10, trivially below any of these explosives'
 * real damage at every other tier). See `TWIG_ONE_HIT_KILL` below for how this is handled.
 */
export const GENERIC_PIECE_DAMAGE: Record<Tier, Record<ExplosiveId, Record<Side, number | null>>> = {
  twig: {
    rocket: { hard: null, soft: null },
    satchel: { hard: null, soft: null },
    c4: { hard: null, soft: null },
    beancan: { hard: null, soft: null },
    explosiveAmmo: { hard: 9.008, soft: 13.008 },
  },
  wood: {
    rocket: { hard: 247.65, soft: 247.65 },
    satchel: { hard: 91.5, soft: 91.5 },
    c4: { hard: 495, soft: 495 },
    beancan: { hard: 19.5, soft: 19.5 },
    explosiveAmmo: { hard: 5.1072, soft: 5.7072 },
  },
  stone: {
    rocket: { hard: 137.65, soft: 137.65 },
    satchel: { hard: 51.5, soft: 51.5 },
    c4: { hard: 275, soft: 275 },
    beancan: { hard: 11, soft: 11 },
    explosiveAmmo: { hard: 2.704, soft: 2.904 },
  },
  metal: {
    rocket: { hard: 137.575, soft: 137.575 },
    satchel: { hard: 43.5, soft: 43.5 },
    c4: { hard: 275, soft: 275 },
    beancan: { hard: 9, soft: 9 },
    explosiveAmmo: { hard: 2.506, soft: 2.508 },
  },
  armored: {
    rocket: { hard: 137.575, soft: 137.575 },
    satchel: { hard: 43.5, soft: 43.5 },
    c4: { hard: 275, soft: 275 },
    beancan: { hard: 9, soft: 9 },
    explosiveAmmo: { hard: 2.506, soft: 2.508 },
  },
};

/**
 * Sourced fact: on Twig (HP 10), Rocket/Satchel/C4/Beancan each destroy it in a single hit,
 * even though the wiki doesn't publish the exact per-hit damage for that cell.
 */
export const TWIG_ONE_HIT_KILL: ExplosiveId[] = ["rocket", "satchel", "c4", "beancan"];

/** Doors have no hard/soft side toggle — single damage value per explosive. */
export const DOOR_DAMAGE: Record<DoorType, Record<ExplosiveId, number>> = {
  woodenDoor: { rocket: 550.4, satchel: 170, c4: 1100, beancan: 35, explosiveAmmo: 11.0 },
  sheetMetalDoor: { rocket: 220.4, satchel: 70, c4: 440, beancan: 14.5, explosiveAmmo: 4.0 },
  garageDoor: { rocket: 220.4, satchel: 70, c4: 440, beancan: 14.5, explosiveAmmo: 4.0 },
  armoredDoor: { rocket: 220.4, satchel: 70, c4: 440, beancan: 14.5, explosiveAmmo: 4.0 },
};

export type RaidTarget =
  | { kind: "generic"; tier: Tier; side: Side }
  | { kind: "door"; door: DoorType };
