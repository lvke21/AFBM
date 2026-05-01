export type SeededRngSnapshot = {
  algorithm: "fnv1a-mulberry32";
  draws: number;
  seed: string;
  state: number;
};

export type SeededRng = {
  base36(length: number): string;
  fork(scope: string): SeededRng;
  hex(length: number): string;
  int(min: number, max: number): number;
  next: () => number;
  snapshot: () => SeededRngSnapshot;
};

export type RandomSource = SeededRng | (() => number);

const ALGORITHM = "fnv1a-mulberry32" as const;

export function hashSeed(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function deriveSeed(seed: string, scope: string) {
  return `${seed}::${scope}`;
}

export function createRng(seedOrSnapshot: string | SeededRngSnapshot): SeededRng {
  const seed = typeof seedOrSnapshot === "string" ? seedOrSnapshot : seedOrSnapshot.seed;
  let state =
    typeof seedOrSnapshot === "string"
      ? hashSeed(seedOrSnapshot)
      : seedOrSnapshot.state >>> 0;
  let draws = typeof seedOrSnapshot === "string" ? 0 : seedOrSnapshot.draws;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    draws += 1;

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const rng: SeededRng = {
    base36(length: number) {
      let value = "";

      while (value.length < length) {
        value += Math.floor(next() * 0x100000000)
          .toString(36)
          .padStart(7, "0");
      }

      return value.slice(0, length);
    },
    fork(scope: string) {
      return createRng(deriveSeed(seed, scope));
    },
    hex(length: number) {
      let value = "";

      while (value.length < length) {
        value += Math.floor(next() * 0x100000000)
          .toString(16)
          .padStart(8, "0");
      }

      return value.slice(0, length);
    },
    int(min: number, max: number) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new Error("Invalid seeded RNG integer range");
      }

      return Math.floor(next() * (max - min + 1)) + min;
    },
    next,
    snapshot() {
      return {
        algorithm: ALGORITHM,
        draws,
        seed,
        state,
      };
    },
  };

  return rng;
}

export function createSeededRandom(seed: string) {
  return createRng(seed).next;
}

export function nextRandom(source: RandomSource) {
  return typeof source === "function" ? source() : source.next();
}

export function randomSourceNext(source: RandomSource) {
  return typeof source === "function" ? source : source.next;
}

export function createSeededId(prefix: string, seed: string, length = 12) {
  return `${prefix}-${createRng(seed).base36(length)}`;
}
