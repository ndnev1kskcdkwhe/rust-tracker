import { GENES, GENE_INFO, GENOME_LENGTH, weightOf, type Gene } from "./data";

export function isValidGenome(input: string): boolean {
  if (input.length !== GENOME_LENGTH) {
    return false;
  }
  const letters = input.toUpperCase().split("");
  return letters.every((ch) => (GENES as string[]).includes(ch));
}

export function parseGenome(input: string): Gene[] {
  if (!isValidGenome(input)) {
    throw new Error(
      `Invalid genome "${input}" — must be exactly ${GENOME_LENGTH} letters from ${GENES.join("")}`
    );
  }
  return input.toUpperCase().split("") as Gene[];
}

export function greenGeneCount(genome: Gene[]): number {
  return genome.filter((gene) => GENE_INFO[gene].category === "green").length;
}

export type GenomeClassification = "target" | "keep" | "discard";

/**
 * Classifies a saved clone: an exact match to the chosen target is always kept, otherwise
 * it's kept if it has at least `keepThreshold` green genes (default 5 of 6), else discarded.
 */
export function classifyGenome(
  genome: Gene[],
  target: Gene[] | null,
  keepThreshold = 5
): GenomeClassification {
  if (target && genome.length === target.length && genome.every((gene, i) => gene === target[i])) {
    return "target";
  }
  return greenGeneCount(genome) >= keepThreshold ? "keep" : "discard";
}

export interface SlotOutcome {
  gene: Gene;
  probability: number;
}

/**
 * Crossbreeding mechanic per wiki.rustclash.com-style community tools (rustbreeder.com,
 * irust.ru/genetic — both state identical weight numbers): green genes weigh 0.6, red
 * genes weigh 1.0. Per gene slot, the neighbor plants' genes are grouped by identity and
 * their weights summed; the strongest neighbor group is compared against the center
 * plant's own gene weight. If the neighbor group's weight exceeds the center's, its gene
 * wins the slot; if it's lower, the center's gene is unchanged; if equal, it's a 50/50 (or
 * even split among however many genes are tied) roll between the center's gene and the
 * tied neighbor gene(s).
 *
 * No site publishes formal pseudocode for this, so this is our best-supported reading of
 * the stated rule ("if surrounding genes don't outweigh the center gene, it stays
 * unchanged") — it reproduces rustbreeder's own worked example exactly: 2 neighbors with
 * G + 2 with H (both green, weight 0.6 each → group weight 1.2 each) against any center
 * gene weighing less than 1.2 yields a 50/50 split between G and H (see genetics.test.ts).
 */
function predictSlot(centerGene: Gene, neighborGenesAtSlot: Gene[]): SlotOutcome[] {
  if (neighborGenesAtSlot.length === 0) {
    return [{ gene: centerGene, probability: 1 }];
  }

  const neighborGroupWeight = new Map<Gene, number>();
  for (const gene of neighborGenesAtSlot) {
    neighborGroupWeight.set(gene, (neighborGroupWeight.get(gene) ?? 0) + weightOf(gene));
  }

  const bestWeight = Math.max(...neighborGroupWeight.values());
  const bestNeighborGenes = Array.from(neighborGroupWeight.entries())
    .filter(([, weight]) => weight === bestWeight)
    .map(([gene]) => gene);

  const centerWeight = weightOf(centerGene);

  let contenders: Gene[];
  if (bestWeight > centerWeight) {
    contenders = bestNeighborGenes;
  } else if (bestWeight < centerWeight) {
    contenders = [centerGene];
  } else {
    contenders = Array.from(new Set([centerGene, ...bestNeighborGenes]));
  }

  const probability = 1 / contenders.length;
  return contenders.map((gene) => ({ gene, probability }));
}

/** Per-slot outcome probabilities for crossing `center` with one or more `neighbors`. */
export function predictCross(center: Gene[], neighbors: Gene[][]): SlotOutcome[][] {
  const slots: SlotOutcome[][] = [];
  for (let i = 0; i < GENOME_LENGTH; i++) {
    const neighborGenesAtSlot = neighbors.map((neighbor) => neighbor[i]);
    slots.push(predictSlot(center[i], neighborGenesAtSlot));
  }
  return slots;
}

/** Probability that crossing produces `target` exactly, given per-slot predictions. */
export function chanceOfExactGenome(slots: SlotOutcome[][], target: Gene[]): number {
  let probability = 1;
  for (let i = 0; i < GENOME_LENGTH; i++) {
    const outcome = slots[i].find((o) => o.gene === target[i]);
    probability *= outcome ? outcome.probability : 0;
  }
  return probability;
}
