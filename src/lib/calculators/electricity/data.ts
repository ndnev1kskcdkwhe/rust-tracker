/**
 * Rust electricity reference data.
 *
 * Sources, all read 2026-07-31:
 * - wiki.rustclash.com (RustLabs redirects here) — per-item Consumption / Capacity /
 *   Max Power Output / Generates Energy fields.
 * - rustrician.io/wiki — the community electrical handbook, for the mechanics that item
 *   pages state too tersely (battery efficiency, root-combiner depth limit).
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
 * NOT yet verified in game: whether the division rounds down and drops the remainder.
 * Anything that depends on it must be checked before shipping.
 */
export const SPLITTER_OUTPUTS = 3;

export const ELECTRICAL_BRANCH = {
  /** Branch Out takes the amount you set on the component; Power Out keeps the rest. */
  note: "Гілка забирає задану кількість у Branch Out, решта йде далі через Power Out.",
} as const;

export const ROOT_COMBINER = {
  inputs: 2,
  note: "Обʼєднує два кореневі джерела (батареї/панелі) в одну лінію. Рахується в ліміт глибини 16.",
} as const;

// --- consumers -------------------------------------------------------------

export type ConsumerCategory =
  | "production"
  | "defense"
  | "light"
  | "utility"
  | "sensor"
  | "industrial";

export interface Consumer {
  id: string;
  name: string;
  consumption: RW;
  category: ConsumerCategory;
  note?: string;
}

export const CONSUMERS: Consumer[] = [
  // production
  { id: "electricFurnace", name: "Електропічка", consumption: 3, category: "production" },
  { id: "industrialCrafter", name: "Industrial Crafter", consumption: 1, category: "industrial" },
  { id: "industrialConveyor", name: "Industrial Conveyor", consumption: 1, category: "industrial" },
  { id: "storageAdaptor", name: "Storage Adaptor", consumption: 1, category: "industrial" },
  { id: "hopper", name: "Hopper", consumption: 8, category: "industrial" },
  { id: "poweredWaterPurifier", name: "Очищувач води", consumption: 5, category: "utility" },
  { id: "waterPump", name: "Водяна помпа", consumption: 5, category: "utility" },

  // defense
  {
    id: "autoTurret",
    name: "Автотурель",
    consumption: 10,
    category: "defense",
    note: "10 rW щоб працювати; 11 — якщо задіяні виходи Has Target / Low Ammo / No Ammo (по 1 rW кожен).",
  },
  { id: "samSite", name: "SAM Site", consumption: 25, category: "defense" },
  { id: "teslaCoil", name: "Котушка Тесла", consumption: 25, category: "defense", note: "Більше живлення — більша шкода." },
  { id: "searchLight", name: "Прожектор (Search Light)", consumption: 10, category: "defense" },
  { id: "reactiveTarget", name: "Мішень", consumption: 1, category: "utility" },

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

  // utility
  { id: "fridge", name: "Холодильник", consumption: 5, category: "utility" },
  { id: "miniFridge", name: "Міні-холодильник", consumption: 2, category: "utility" },
  { id: "electricHeater", name: "Обігрівач", consumption: 3, category: "utility" },
  { id: "igniter", name: "Запальник", consumption: 2, category: "utility" },
  { id: "doorController", name: "Контролер дверей", consumption: 1, category: "utility" },
  { id: "elevator", name: "Ліфт", consumption: 5, category: "utility" },
  { id: "modularCarLift", name: "Підйомник для авто", consumption: 5, category: "utility" },
  { id: "computerStation", name: "Компʼютерна станція", consumption: 5, category: "utility" },
  { id: "ptzCctvCamera", name: "PTZ камера", consumption: 3, category: "utility" },
  { id: "audioAlarm", name: "Звукова сигналізація", consumption: 1, category: "utility" },
  { id: "smartAlarm", name: "Smart Alarm", consumption: 1, category: "utility" },
  { id: "digitalClock", name: "Цифровий годинник", consumption: 1, category: "utility" },
  { id: "cableTunnel", name: "Кабельний тунель", consumption: 1, category: "utility", note: "4 незалежні канали крізь стіну." },

  // sensors
  { id: "hbhfSensor", name: "HBHF-сенсор", consumption: 1, category: "sensor" },
  { id: "laserDetector", name: "Лазерний детектор", consumption: 1, category: "sensor" },
  { id: "seismicSensor", name: "Сейсмо-сенсор", consumption: 1, category: "sensor" },
  { id: "storageMonitor", name: "Storage Monitor", consumption: 1, category: "sensor" },
  { id: "rfBroadcaster", name: "RF-передавач", consumption: 1, category: "sensor" },
  { id: "rfReceiver", name: "RF-приймач", consumption: 1, category: "sensor" },
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
