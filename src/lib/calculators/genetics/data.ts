/**
 * Rust plant genetics reference data.
 *
 * Sources (fetched 2026-07-30): rustbreeder.com (calculator + /guide page),
 * grand-island.pp.ua/genetics + /crossbreeding, irust.ru/genetic. All three agree on the
 * gene set, the 6-slot genome, and — critically — the exact same crossbreeding weight
 * numbers (green = 0.6, red = 1.0), which is the core mechanic this module implements.
 *
 * Gene meaning, exactly as stated by the sources (no numeric % per gene is published
 * anywhere, only qualitative effect descriptions):
 * - G (Growth)    — green/good — faster growth
 * - Y (Yield)     — green/good — more yield per harvest
 * - H (Hardiness) — green/good — more resistance to environmental damage (cold/heat)
 * - W (Water)     — red/bad    — increases water consumption
 * - X (Empty)     — red/bad    — does nothing (dead slot)
 */

export type Gene = "G" | "Y" | "H" | "W" | "X";
export const GENES: Gene[] = ["G", "Y", "H", "W", "X"];

export const GENOME_LENGTH = 6;

export const GENE_INFO: Record<Gene, { label: string; category: "green" | "red" }> = {
  G: { label: "Ріст (Growth)", category: "green" },
  Y: { label: "Урожай (Yield)", category: "green" },
  H: { label: "Стійкість (Hardiness)", category: "green" },
  W: { label: "Вода (Water)", category: "red" },
  X: { label: "Порожній (Empty)", category: "red" },
};

/** Crossbreeding weight per gene category — identical numbers on rustbreeder.com and irust.ru. */
export const GENE_WEIGHT: Record<"green" | "red", number> = {
  green: 0.6,
  red: 1.0,
};

export function weightOf(gene: Gene): number {
  return GENE_WEIGHT[GENE_INFO[gene].category];
}

/** Matches the Prisma `PlantCrop` enum values exactly, so no translation layer is needed. */
export type Crop =
  | "HEMP"
  | "POTATO"
  | "PUMPKIN"
  | "CORN"
  | "BERRY_RED"
  | "BERRY_BLUE"
  | "BERRY_YELLOW"
  | "BERRY_WHITE";

export const CROPS: Crop[] = [
  "HEMP",
  "POTATO",
  "PUMPKIN",
  "CORN",
  "BERRY_RED",
  "BERRY_BLUE",
  "BERRY_YELLOW",
  "BERRY_WHITE",
];

export const CROP_LABELS: Record<Crop, string> = {
  HEMP: "Коноплі",
  POTATO: "Картопля",
  PUMPKIN: "Гарбуз",
  CORN: "Кукурудза",
  BERRY_RED: "Червона ягода",
  BERRY_BLUE: "Синя ягода",
  BERRY_YELLOW: "Жовта ягода",
  BERRY_WHITE: "Біла ягода",
};

export interface GodClone {
  genes: string;
  label: string;
  purpose: string;
}

/** "God clone" target templates, as named on rustbreeder.com/guide and irust.ru/genetic. */
export const GOD_CLONES: GodClone[] = [
  { genes: "GGGYYY", label: "Золотий стандарт (GOD clone)", purpose: "Найкраще співвідношення швидкості й урожаю" },
  { genes: "GGYYYY", label: "GOD clone (менше клонування)", purpose: "Рідше треба перезаклонювати" },
  { genes: "GGGGYY", label: "Турбо-ріст", purpose: "Дуже швидкий ріст, багато циклів збору за короткий час" },
  { genes: "YYYYYY", label: "Максимум урожаю", purpose: "Найбільший вихід за один збір, довгий ріст" },
  { genes: "HHHGGG", label: "Виживальщик", purpose: "Стійкість до холоду/спеки без обігріву чи світла" },
];
