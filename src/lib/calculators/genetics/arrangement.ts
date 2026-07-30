import { chanceOfExactGenome, predictCross } from "./genetics";
import type { Gene } from "./data";

export interface ArrangementResult {
  /** Index into the `pool` array passed to findBestArrangement. */
  centerIndex: number;
  /** Indices into `pool`, one per neighbor slot used (may repeat the same index). */
  neighborIndices: number[];
  /** Probability that this exact arrangement produces `target` in one cross. */
  chance: number;
  /** Expected number of times you'd need to harvest/clone this same arrangement to succeed once. */
  expectedAttempts: number;
}

/** All non-decreasing index sequences of the given length — i.e. multisets with repetition. */
function* multisetsOf(poolSize: number, size: number): Generator<number[]> {
  if (size === 0) {
    yield [];
    return;
  }
  if (poolSize === 0) {
    return;
  }
  function* helper(start: number, remaining: number): Generator<number[]> {
    if (remaining === 0) {
      yield [];
      return;
    }
    for (let i = start; i < poolSize; i++) {
      for (const rest of helper(i, remaining - 1)) {
        yield [i, ...rest];
      }
    }
  }
  yield* helper(0, size);
}

function similarity(genome: Gene[], target: Gene[]): number {
  return genome.filter((gene, i) => gene === target[i]).length;
}

/**
 * Searches for the center + neighbor arrangement (from the user's saved `pool` genomes)
 * that maximizes the chance of a single cross producing `target` exactly.
 *
 * Exhaustive over all center choices × all neighbor multisets up to `maxNeighbors`, which
 * is exact but combinatorial — so when `pool` is larger than `maxCandidatePoolSize`, the
 * search is restricted to the genomes most similar to the target (by matching-slot count)
 * to keep it fast. This is a heuristic restriction, not a claim that a large, dissimilar
 * pool has no better solution — it trades completeness for speed.
 */
export function findBestArrangement(
  pool: Gene[][],
  target: Gene[],
  maxNeighbors = 8,
  maxCandidatePoolSize = 8
): ArrangementResult | null {
  if (pool.length === 0) {
    return null;
  }

  const scored = pool
    .map((genome, index) => ({ index, genome, similarity: similarity(genome, target) }))
    .sort((a, b) => b.similarity - a.similarity);
  const candidates = scored.slice(0, maxCandidatePoolSize);

  let best: ArrangementResult | null = null;

  for (const center of candidates) {
    for (let neighborCount = 0; neighborCount <= maxNeighbors; neighborCount++) {
      for (const combo of multisetsOf(candidates.length, neighborCount)) {
        const neighborGenomes = combo.map((i) => candidates[i].genome);
        const slots = predictCross(center.genome, neighborGenomes);
        const chance = chanceOfExactGenome(slots, target);
        if (!best || chance > best.chance) {
          best = {
            centerIndex: center.index,
            neighborIndices: combo.map((i) => candidates[i].index),
            chance,
            expectedAttempts: chance > 0 ? Math.round(1 / chance) : Infinity,
          };
        }
      }
    }
  }

  return best;
}
