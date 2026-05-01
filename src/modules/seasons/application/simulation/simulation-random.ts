import {
  createSeededRandom as createRandomFromSeed,
  deriveSeed,
} from "@/lib/random/seeded-rng";

export function deriveSimulationSeed(seed: string, scope: string) {
  return deriveSeed(seed, scope);
}

export function createSeededRandom(seed: string) {
  return createRandomFromSeed(seed);
}
