/**
 * Rust electricity reference data.
 *
 * Sources, all read 2026-07-31:
 * - wiki.rustclash.com (RustLabs redirects here) — per-item Consumption / Capacity /
 *   Max Power Output / Generates Energy fields.
 * - rustrician.io/wiki — the community electrical handbook, for the mechanics that item
 *   pages state too tersely (battery efficiency, root-combiner depth limit).
 *
 * Added 2026-08-01 from `rust-grid.html`, a circuit sandbox built in a separate session:
 * only the structural facts it carries — which components pass power through, which emit a
 * fixed signal instead, and the container/adaptor rule. Its consumption numbers were left
 * alone: where they disagree with the wiki figures above (neon signs, Tesla Coil, Igniter)
 * its own handoff marks them as unverified guesses from rustrician.
 *
 * Numbers here are balance values and Facepunch changes them in patches. Anything derived
 * from them belongs in pure functions with tests, not inlined in UI, so a re-check is a
 * one-file edit.
 */

/** Power unit. Rust calls it "rW"; storage is "rWm" = rW sustained for one minute. */
export type RW = number;

// --- mechanics constants ---------------------------------------------------

/**
 * Batteries store at 80% efficiency: 20 rW in for a minute banks 16 rWm.
 * Consequence used everywhere below: to hold a draw D without losing charge you must feed
 * the battery at least D / 0.8 (= D × 1.25).
 */
export const BATTERY_EFFICIENCY = 0.8;

/** Minimum input that keeps a battery from draining while it sustains `draw`. */
export function sustainingInput(draw: RW): RW {
  return draw / BATTERY_EFFICIENCY;
}

/**
 * A Root Combiner errors with "Max Depth" past 16 components counted from it back to the
 * power source, which caps how deep a generated circuit may nest. Source: rustrician wiki.
 */
export const MAX_CIRCUIT_DEPTH = 16;

// --- power sources ---------------------------------------------------------

export interface PowerSource {
  id: string;
  name: string;
  /** Peak output. Renewables swing with sun/wind/water, hence the min. */
  outputMax: RW;
  outputMin: RW;
  note?: string;
}

export const POWER_SOURCES: PowerSource[] = [
  {
    id: "largeSolarPanel",
    name: "Велика сонячна панель",
    outputMin: 0,
    outputMax: 20,
    note: "Залежить від кута до сонця й часу доби; вночі — 0.",
  },
  {
    id: "windTurbine",
    name: "Вітрогенератор",
    outputMin: 0,
    outputMax: 150,
    note: "Залежить від вітру; вище розміщення — сильніший вітер.",
  },
  { id: "waterWheel", name: "Водяне колесо", outputMin: 0, outputMax: 60 },
  {
    id: "smallGenerator",
    name: "Малий генератор",
    outputMin: 40,
    outputMax: 40,
    note: "Стабільні 40 rW, але їсть Low Grade Fuel.",
  },
  {
    id: "testGenerator",
    name: "Тестовий генератор",
    outputMin: 100,
    outputMax: 100,
    note: "Тільки для адмінів — у звичайній грі недоступний.",
  },
];

// --- batteries -------------------------------------------------------------

export interface Battery {
  id: string;
  name: string;
  /** rW-minutes. Divide by draw to get runtime in minutes. */
  capacityRWm: number;
  /** Hard ceiling on what the battery can push out, regardless of stored charge. */
  maxOutput: RW;
}

export const BATTERIES: Battery[] = [
  { id: "small", name: "Мала батарея", capacityRWm: 400, maxOutput: 15 },
  { id: "medium", name: "Середня батарея", capacityRWm: 9000, maxOutput: 50 },
  { id: "large", name: "Велика батарея", capacityRWm: 24000, maxOutput: 100 },
];

/*
 * No max *input* field above, on purpose. The wiki pages list Max Power Output only, so
 * `power.ts` charges a battery at whatever you feed it.
 *
 * rust-grid claims a ceiling of 40 / 200 / 400 rW and explains it as "four times the output",
 * but 15 × 4 is 60, not 40 — the rule and its own numbers disagree and neither is sourced. If
 * a real ceiling turns up in game it becomes a field on Battery.
 */

// --- distribution ----------------------------------------------------------

/**
 * Splitter output rule, quoted from the item page: "the amount passed through is equal to
 * the input amount divided by the number of used output slots."
 *
 * So an unused slot is not wasted power — a splitter feeding 2 things gives each half, not
 * a third. This is the single most load-bearing fact for laying out a circuit, and it is
 * why the naive "battery → splitter → 3 splitters → 9 furnaces" shape is not automatically
 * the cheapest one.
 *
 * The used-outputs rule itself is confirmed twice over: the item page states it, and the
 * project owner reports the same from play — 30 rW to two turrets gives 15 each, to three
 * gives 10 each.
 *
 * STILL OPEN, and narrower than it first looked: both of those divide evenly, so they say
 * nothing about a remainder. Feeding 10 rW to three outputs could give 3.33 each, or floor to
 * 3 and lose 1 rW, or hand 4/3/3. It matters because thresholds are hard: an Auto Turret needs
 * a full 10 rW to switch on, so a leg carrying 9.67 powers nothing, and a generator that
 * assumes exact division would emit circuits that look right and fail in game.
 *
 * To settle it: wire a source to a splitter with three Counters on the outputs (a Counter
 * displays the power it receives) and feed it an amount that does not divide by three.
 */
export const SPLITTER_OUTPUTS = 3;

export const ELECTRICAL_BRANCH = {
  /** Branch Out takes the amount you set on the component; Power Out keeps the rest. */
  note: "Гілка забирає задану кількість у Branch Out, решта йде далі через Power Out.",
  /** branchOut = min(input, amount), powerOut = input − branchOut. Takes nothing for itself. */
  split(input: RW, amount: RW): { branchOut: RW; powerOut: RW } {
    const branchOut = Math.min(input, Math.max(0, amount));
    return { branchOut, powerOut: input - branchOut };
  },
} as const;

export const ROOT_COMBINER = {
  inputs: 2,
  note: "Обʼєднує два кореневі джерела (батареї/панелі) в одну лінію. Рахується в ліміт глибини 16.",
  /** Straight sum of its two inputs. */
  combine(a: RW, b: RW): RW {
    return a + b;
  },
} as const;

/**
 * A component that passes power through hands the next one `input − its own consumption`.
 * Chaining consumers this way needs no splitter at all, which is often cheaper than a tree —
 * stage 2 should try it before reaching for distribution parts.
 */
export function passthroughOutput(input: RW, consumption: RW): RW {
  return Math.max(0, input - consumption);
}

// --- consumers -------------------------------------------------------------

export type ConsumerCategory =
  | "production"
  | "defense"
  | "light"
  | "utility"
  | "sensor"
  | "industrial";

/**
 * What leaves a consumer's power output — the fact stage 2 needs to decide whether a run of
 * consumers can be daisy-chained or whether every one of them needs its own splitter leg.
 *
 * - absent — a dead end. The item eats what it gets and has no power output at all.
 * - "passthrough" — Power Out carries the input minus this item's own consumption, always, so
 *   the next consumer hangs straight off it and costs no distribution parts.
 * - "gated" — the same leftover, but only while the item is triggered. A furnace behind a
 *   laser detector runs only when someone walks through the beam, so a generated circuit must
 *   never treat this as a permanent line.
 * - "signal" — the output is a small fixed value the item generates for logic (1 rW and the
 *   like), not the leftover. Never route a load from it; it will not carry one.
 */
export type PowerOut = "passthrough" | "gated" | "signal";

export interface Consumer {
  id: string;
  name: string;
  consumption: RW;
  category: ConsumerCategory;
  powerOut?: PowerOut;
  note?: string;
}

export const CONSUMERS: Consumer[] = [
  // production
  { id: "electricFurnace", name: "Електропічка", consumption: 3, category: "production" },
  { id: "industrialCrafter", name: "Industrial Crafter", consumption: 1, category: "industrial" },
  {
    id: "industrialConveyor",
    name: "Industrial Conveyor",
    consumption: 1,
    category: "industrial",
    powerOut: "passthrough",
  },
  {
    id: "storageAdaptor",
    name: "Storage Adaptor",
    consumption: 1,
    category: "industrial",
    note: "СПІРНЕ: rust-grid дає адаптеру взагалі не потребувати живлення, без порту живлення. Жодне з двох не звірене — перевірити в грі.",
  },
  { id: "hopper", name: "Hopper", consumption: 8, category: "industrial" },
  { id: "poweredWaterPurifier", name: "Очищувач води", consumption: 5, category: "utility" },
  { id: "waterPump", name: "Водяна помпа", consumption: 5, category: "utility" },

  // defense
  {
    id: "autoTurret",
    name: "Автотурель",
    consumption: 10,
    category: "defense",
    powerOut: "signal",
    note: "10 rW щоб працювати; 11 — якщо задіяні виходи Has Target / Low Ammo / No Ammo (по 1 rW кожен).",
  },
  {
    id: "samSite",
    name: "SAM Site",
    consumption: 25,
    category: "defense",
    powerOut: "passthrough",
    note: "Крім Passthrough має сигнальні виходи Has Target / Low Ammo.",
  },
  { id: "teslaCoil", name: "Котушка Тесла", consumption: 25, category: "defense", note: "Більше живлення — більша шкода. rust-grid дає стелю 35 rW (1 hp/с за кожен rW), але не звірено." },
  {
    id: "searchLight",
    name: "Прожектор (Search Light)",
    consumption: 10,
    category: "defense",
    powerOut: "passthrough",
  },
  { id: "reactiveTarget", name: "Мішень", consumption: 1, category: "utility", powerOut: "signal" },

  // light
  { id: "simpleLight", name: "Проста лампа", consumption: 1, category: "light" },
  { id: "ceilingLight", name: "Стельова лампа", consumption: 2, category: "light", note: "Прискорює ріст рослин у 2 рази." },
  { id: "industrialWallLight", name: "Industrial Wall Light", consumption: 1, category: "light" },
  { id: "fluorescentLight", name: "Люмінесцентна лампа", consumption: 1, category: "light" },
  { id: "electricTableLamp", name: "Настільна лампа", consumption: 1, category: "light" },
  { id: "chandelier", name: "Люстра", consumption: 4, category: "light" },
  { id: "spotLight", name: "Spot Light", consumption: 5, category: "light" },
  { id: "tripodSpotLight", name: "Tripod Spot Light", consumption: 5, category: "light" },
  { id: "bulbStringLights", name: "Гірлянда", consumption: 5, category: "light" },
  { id: "fairyLights", name: "Fairy Lights", consumption: 5, category: "light" },
  { id: "deluxeChristmasLights", name: "Deluxe Christmas Lights", consumption: 5, category: "light" },
  { id: "smallNeonSign", name: "Мала неонова вивіска", consumption: 2, category: "light" },
  { id: "mediumNeonSign", name: "Середня неонова вивіска", consumption: 4, category: "light" },
  { id: "largeNeonSign", name: "Велика неонова вивіска", consumption: 6, category: "light" },
  { id: "mediumAnimatedNeonSign", name: "Середня анімована вивіска", consumption: 5, category: "light" },
  { id: "largeAnimatedNeonSign", name: "Велика анімована вивіска", consumption: 7, category: "light" },
  { id: "flasherLight", name: "Блималка", consumption: 1, category: "light" },
  { id: "sirenLight", name: "Сирена-мигалка", consumption: 1, category: "light" },
  { id: "strobeLight", name: "Strobe Light", consumption: 1, category: "light" },

  // utility
  {
    id: "fridge",
    name: "Холодильник",
    consumption: 5,
    category: "utility",
    note: "СПІРНЕ: rust-grid тримає холодильник за пасивний контейнер без живлення. Перевірити в грі.",
  },
  { id: "miniFridge", name: "Міні-холодильник", consumption: 2, category: "utility" },
  { id: "electricHeater", name: "Обігрівач", consumption: 3, category: "utility", powerOut: "passthrough" },
  { id: "igniter", name: "Запальник", consumption: 2, category: "utility" },
  {
    id: "doorController",
    name: "Контролер дверей",
    consumption: 1,
    category: "utility",
    powerOut: "passthrough",
    note: "Passthrough узятий з rust-grid і там не звірений.",
  },
  {
    id: "elevator",
    name: "Ліфт",
    consumption: 5,
    category: "utility",
    note: "5 rW на кабіну; кнопка виклику на поверсі — ще 1 rW окремо.",
  },
  { id: "modularCarLift", name: "Підйомник для авто", consumption: 5, category: "utility" },
  { id: "computerStation", name: "Компʼютерна станція", consumption: 5, category: "utility" },
  { id: "ptzCctvCamera", name: "PTZ камера", consumption: 3, category: "utility" },
  { id: "cctvCamera", name: "CCTV камера", consumption: 3, category: "utility" },
  {
    id: "fogger",
    name: "Fogger-3000",
    consumption: 1,
    category: "utility",
    note: "Сам струму не тягне — 1 rW іде на кожен задіяний вхід (Turn On / Toggle / Turn Off). Не звірено.",
  },
  {
    id: "snowMachine",
    name: "Snow Machine",
    consumption: 1,
    category: "utility",
    note: "Як Fogger: 1 rW за кожен задіяний керуючий вхід. Не звірено.",
  },
  { id: "audioAlarm", name: "Звукова сигналізація", consumption: 1, category: "utility" },
  { id: "smartAlarm", name: "Smart Alarm", consumption: 1, category: "utility" },
  { id: "digitalClock", name: "Цифровий годинник", consumption: 1, category: "utility" },
  { id: "cableTunnel", name: "Кабельний тунель", consumption: 1, category: "utility", note: "4 незалежні канали крізь стіну." },

  // sensors
  {
    id: "hbhfSensor",
    name: "HBHF-сенсор",
    consumption: 1,
    category: "sensor",
    powerOut: "signal",
    note: "Радіус 10 м. На виході — 1 rW за кожну виявлену людину, а не вхідна потужність.",
  },
  {
    id: "laserDetector",
    name: "Лазерний детектор",
    consumption: 1,
    category: "sensor",
    powerOut: "gated",
    note: "Промінь до 4.5 м. Віддає далі лише поки спрацював.",
  },
  { id: "seismicSensor", name: "Сейсмо-сенсор", consumption: 1, category: "sensor" },
  {
    id: "storageMonitor",
    name: "Storage Monitor",
    consumption: 1,
    category: "sensor",
    powerOut: "signal",
    note: "Видає рівно 1 rW, а не вхідну потужність.",
  },
  { id: "rfBroadcaster", name: "RF-передавач", consumption: 1, category: "sensor" },
  {
    id: "rfReceiver",
    name: "RF-приймач",
    consumption: 1,
    category: "sensor",
    powerOut: "gated",
    note: "Віддає живлення лише поки на його частоті йде передача. Не звірено.",
  },
];

/**
 * Logic and switching parts. The wiki lists no Consumption field for these — they pass power
 * through rather than draw it — so they are kept apart from CONSUMERS so nothing accidentally
 * adds a zero into a load total and implies it was measured.
 */
export const PASSIVE_COMPONENTS = [
  { id: "switch", name: "Вимикач" },
  { id: "smartSwitch", name: "Smart Switch" },
  { id: "button", name: "Кнопка" },
  { id: "pressurePad", name: "Натискна плита" },
  { id: "timer", name: "Таймер" },
  { id: "blocker", name: "Blocker" },
  { id: "memoryCell", name: "Memory Cell" },
  { id: "counter", name: "Лічильник" },
  { id: "andSwitch", name: "AND" },
  { id: "orSwitch", name: "OR" },
  { id: "xorSwitch", name: "XOR" },
  { id: "randSwitch", name: "RAND" },
  { id: "splitter", name: "Спліттер" },
  { id: "rootCombiner", name: "Root Combiner" },
  { id: "electricalBranch", name: "Гілка (Branch)" },
  { id: "industrialSplitter", name: "Industrial Splitter" },
  { id: "industrialCombiner", name: "Industrial Combiner" },
  { id: "fluidSplitter", name: "Fluid Splitter" },
  { id: "fluidCombiner", name: "Fluid Combiner" },
] as const;

/**
 * Logic gates pass the larger of their two inputs when they are open, and take nothing for
 * themselves — so a gate in the middle of a run costs no power, only depth.
 *
 * AND opens on both inputs live, OR on either, XOR on exactly one. Blocker is the inverse:
 * live Block Passthrough closes it. AND/OR are confirmed; XOR and Blocker come from the
 * rust-grid sandbox and are not.
 */
export const LOGIC_GATES = {
  and: (a: RW, b: RW): RW => (a > 0 && b > 0 ? Math.max(a, b) : 0),
  or: (a: RW, b: RW): RW => Math.max(a, b),
  xor: (a: RW, b: RW): RW => (a > 0 !== b > 0 ? Math.max(a, b) : 0),
  blocker: (input: RW, block: RW): RW => (block > 0 ? 0 : input),
} as const;

// --- industrial pipes (stage 5) --------------------------------------------

/**
 * Containers an Industrial Conveyor can pull from or push into. They need no power of their
 * own; the cost is the adaptor rule below.
 *
 * Kept as a plain id/name list because stage 5 has not researched pipe mechanics yet (transfer
 * rates, filters, connection limits) — this is only enough to name the endpoints.
 */
export const PIPE_CONTAINERS = [
  { id: "boxLarge", name: "Large Wood Box" },
  { id: "boxSmall", name: "Wood Storage Box" },
  { id: "furnace", name: "Furnace" },
  { id: "furnaceLarge", name: "Large Furnace" },
  { id: "refinery", name: "Small Oil Refinery" },
  { id: "recycler", name: "Recycler" },
  { id: "mixingTable", name: "Mixing Table" },
  { id: "vendingMachine", name: "Vending Machine" },
  { id: "toolCupboard", name: "Tool Cupboard" },
  { id: "repairBench", name: "Repair Bench" },
  { id: "researchTable", name: "Research Table" },
  { id: "dropBox", name: "Drop Box" },
  { id: "composter", name: "Composter" },
  { id: "workbench", name: "Workbench" },
] as const;

export const PIPE_RULES = {
  /**
   * Every pipe attached to a container costs its own Storage Adaptor — two pipes into one box
   * means two adaptors. A parts list that counts pipes but not adaptors is wrong.
   */
  adaptorsPerConnection: 1,
  note: "Кожне під'єднання труби до контейнера потребує окремого Storage Adaptor. Два конвеєри напряму один в одного не з'єднуються.",
} as const;
