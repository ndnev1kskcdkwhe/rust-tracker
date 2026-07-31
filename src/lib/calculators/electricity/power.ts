/**
 * Power math for the electricity planner: what a set of consumers draws, whether a battery
 * can serve it and for how long, and how much generation keeps that going.
 *
 * Pure functions over `data.ts` — no UI, no DB, no circuit shape. Splitters, branches and the
 * depth limit are a separate concern and belong in circuit.ts.
 */

import {
  BATTERIES,
  BATTERY_EFFICIENCY,
  CONSUMERS,
  POWER_SOURCES,
  sustainingInput,
  type Battery,
  type Consumer,
  type PowerSource,
  type RW,
} from "./data";

const CONSUMERS_BY_ID = new Map(CONSUMERS.map((c) => [c.id, c]));
const BATTERIES_BY_ID = new Map(BATTERIES.map((b) => [b.id, b]));
const SOURCES_BY_ID = new Map(POWER_SOURCES.map((s) => [s.id, s]));

export function getConsumer(id: string): Consumer | undefined {
  return CONSUMERS_BY_ID.get(id);
}

export function getBattery(id: string): Battery | undefined {
  return BATTERIES_BY_ID.get(id);
}

export function getPowerSource(id: string): PowerSource | undefined {
  return SOURCES_BY_ID.get(id);
}

/**
 * rW figures in game are whole numbers, and the only operations here are ×1.25 and ×0.8, so
 * two decimals hold every real value exactly. Rounding is purely to strip float dust —
 * without it `32 / 0.8` reports 39.999999999999996 and then needs two 40 rW generators.
 */
function roundRW(value: RW): RW {
  return Math.round(value * 100) / 100;
}

/**
 * Math.ceil that ignores float dust, so a load that exactly fits one item never asks for two.
 * The max() also normalises the -0 that ceil(0 - epsilon) produces.
 */
function ceilCount(value: number): number {
  return Math.max(0, Math.ceil(value - 1e-9));
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite number >= 0, got ${value}`);
  }
}

// --- load ------------------------------------------------------------------

export interface LoadItem {
  consumerId: string;
  count: number;
}

export interface LoadLine {
  consumer: Consumer;
  count: number;
  /** consumption × count */
  draw: RW;
}

export interface Load {
  /** Everything the circuit pulls at once. Zero for an empty list. */
  totalDraw: RW;
  /** How many powered items in total — stage 2 needs it to lay out splitters. */
  totalItems: number;
  /** One line per distinct consumer, in first-seen order. Zero-count items are dropped. */
  lines: LoadLine[];
}

/**
 * Sums a shopping list of consumers. Repeated ids are merged, so `[furnace ×2, furnace ×7]`
 * is the same load as `[furnace ×9]`.
 *
 * Throws on an unknown id or a non-integer/negative count: both mean the caller built the
 * list wrong, and silently treating that as 0 rW would hide it behind a plausible number.
 */
export function totalConsumption(items: LoadItem[]): Load {
  const merged = new Map<string, LoadLine>();

  for (const item of items) {
    const consumer = CONSUMERS_BY_ID.get(item.consumerId);
    if (!consumer) {
      throw new Error(`Unknown consumer id "${item.consumerId}"`);
    }
    if (!Number.isInteger(item.count) || item.count < 0) {
      throw new Error(
        `Count for "${item.consumerId}" must be a whole number >= 0, got ${item.count}`
      );
    }
    if (item.count === 0) {
      continue;
    }

    const line = merged.get(consumer.id);
    if (line) {
      line.count += item.count;
      line.draw = consumer.consumption * line.count;
    } else {
      merged.set(consumer.id, {
        consumer,
        count: item.count,
        draw: consumer.consumption * item.count,
      });
    }
  }

  const lines = [...merged.values()];
  return {
    totalDraw: lines.reduce((sum, line) => sum + line.draw, 0),
    totalItems: lines.reduce((sum, line) => sum + line.count, 0),
    lines,
  };
}

// --- batteries -------------------------------------------------------------

export type BatteryFitStatus =
  /** Nothing is drawing — the battery just sits there charged. */
  | "idle"
  /** The draw is within the battery's output ceiling. */
  | "ok"
  /** The draw is above the ceiling: the battery cannot serve this circuit at all. */
  | "overCeiling";

export interface BatteryFit {
  battery: Battery;
  draw: RW;
  status: BatteryFitStatus;
  /**
   * Minutes of runtime from a full charge with no input. `null` when the draw is 0 (never
   * drains) or above the ceiling (the circuit does not run, so there is no runtime to quote).
   * Not rounded — formatting is the UI's job.
   */
  runtimeMinutes: number | null;
  /** rW that must reach the battery for the charge to hold steady under this draw (draw × 1.25). */
  sustainingInputRW: RW;
  /** How far the draw exceeds the output ceiling, in rW. 0 when it fits. */
  overCeilingBy: RW;
}

/**
 * Answers the three battery questions for one battery: does the output ceiling cover the
 * draw, how long does a full charge last, and what input holds that charge steady.
 */
export function fitBattery(battery: Battery, draw: RW): BatteryFit {
  assertNonNegative(draw, "draw");

  const overCeilingBy = roundRW(Math.max(0, draw - battery.maxOutput));
  const status: BatteryFitStatus = draw === 0 ? "idle" : overCeilingBy > 0 ? "overCeiling" : "ok";

  return {
    battery,
    draw,
    status,
    runtimeMinutes: status === "ok" ? battery.capacityRWm / draw : null,
    sustainingInputRW: roundRW(sustainingInput(draw)),
    overCeilingBy,
  };
}

/**
 * Smallest single battery that can serve `draw`, optionally lasting at least
 * `minRuntimeMinutes` on a full charge.
 *
 * `null` means no single battery does it — the draw is over even the large battery's 100 rW
 * ceiling, or no capacity lasts long enough. That case needs several batteries in parallel
 * (see `batteriesNeeded`), which is a circuit-shape problem: joining them costs Root Combiners
 * and those count toward the depth limit.
 */
export function pickBattery(
  draw: RW,
  options: { minRuntimeMinutes?: number } = {}
): BatteryFit | null {
  assertNonNegative(draw, "draw");
  const { minRuntimeMinutes } = options;

  const bySize = [...BATTERIES].sort(
    (a, b) => a.maxOutput - b.maxOutput || a.capacityRWm - b.capacityRWm
  );

  for (const battery of bySize) {
    const fit = fitBattery(battery, draw);
    if (fit.status === "overCeiling") {
      continue;
    }
    // runtimeMinutes === null here means "idle", i.e. it lasts indefinitely.
    if (minRuntimeMinutes != null && fit.runtimeMinutes != null && fit.runtimeMinutes < minRuntimeMinutes) {
      continue;
    }
    return fit;
  }

  return null;
}

/**
 * How many of one battery type must run in parallel to serve `draw` — enough of them to clear
 * the per-battery output ceiling, and enough stored rWm to last `minRuntimeMinutes`.
 *
 * Returns 0 for no load. Wiring them together is stage 2's problem; this is only the count.
 */
export function batteriesNeeded(
  battery: Battery,
  draw: RW,
  minRuntimeMinutes?: number
): number {
  assertNonNegative(draw, "draw");
  if (draw === 0) {
    return 0;
  }

  const forCeiling = ceilCount(draw / battery.maxOutput);
  const forRuntime =
    minRuntimeMinutes == null ? 0 : ceilCount((draw * minRuntimeMinutes) / battery.capacityRWm);

  return Math.max(1, forCeiling, forRuntime);
}

// --- generation ------------------------------------------------------------

export interface SourceRequirement {
  source: PowerSource;
  /**
   * rW the generation has to deliver: `draw × 1.25` when it feeds a battery (80% efficiency),
   * or plain `draw` when consumers are wired straight to the source.
   */
  requiredInputRW: RW;
  /** How many sources at their peak output — solar at noon, a turbine in strong wind. */
  countAtPeak: number;
  /**
   * How many to cover the source's worst output. `null` for solar, wind and water: their
   * minimum is 0 rW, so no quantity guarantees power at night or in dead air — that gap is
   * exactly what the battery is for.
   */
  countAtWorst: number | null;
}

/**
 * How many of one generator type it takes to hold a load.
 *
 * `throughBattery` defaults to true because that is how these get built: panels charge a
 * battery and the battery runs the base. Pass false only for consumers wired straight to the
 * source, where the 80% storage loss does not apply.
 */
export function sourcesNeeded(
  source: PowerSource,
  draw: RW,
  options: { throughBattery?: boolean } = {}
): SourceRequirement {
  assertNonNegative(draw, "draw");
  if (source.outputMax <= 0) {
    throw new Error(`Power source "${source.id}" has no positive output`);
  }

  const { throughBattery = true } = options;
  const requiredInputRW = roundRW(throughBattery ? sustainingInput(draw) : draw);

  return {
    source,
    requiredInputRW,
    countAtPeak: ceilCount(requiredInputRW / source.outputMax),
    countAtWorst:
      source.outputMin > 0 ? ceilCount(requiredInputRW / source.outputMin) : draw === 0 ? 0 : null,
  };
}

// --- charging --------------------------------------------------------------

export interface ChargeEstimate {
  /**
   * rWm actually banked per minute: `input × 0.8 − draw`. Charging and discharging happen at
   * the same time, so a load running off the battery eats into the charge rate.
   */
  netChargeRWmPerMinute: number;
  /** Minutes from empty to full. `null` when the net rate is <= 0 — it never fills. */
  minutesToFull: number | null;
}

/**
 * Time to charge a battery from zero at a given input, optionally while a load runs off it.
 *
 * data.ts records no input ceiling for batteries (the wiki lists Max Power *Output* only), so
 * none is applied here: 200 rW of input charges twice as fast as 100. If in-game testing shows
 * a charge-rate cap, it belongs in data.ts and then in this function.
 */
export function chargeTime(
  battery: Battery,
  inputRW: RW,
  drawWhileCharging: RW = 0
): ChargeEstimate {
  assertNonNegative(inputRW, "inputRW");
  assertNonNegative(drawWhileCharging, "drawWhileCharging");

  const netChargeRWmPerMinute = roundRW(inputRW * BATTERY_EFFICIENCY - drawWhileCharging);

  return {
    netChargeRWmPerMinute,
    minutesToFull:
      netChargeRWmPerMinute > 0 ? battery.capacityRWm / netChargeRWmPerMinute : null,
  };
}
