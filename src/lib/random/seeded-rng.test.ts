import { describe, expect, it } from "vitest";

import { createRng } from "./seeded-rng";

describe("seeded RNG", () => {
  it("replays the same seed deterministically", () => {
    const first = createRng("rng-seed-1");
    const second = createRng("rng-seed-1");

    expect(Array.from({ length: 20 }, () => first.next())).toEqual(
      Array.from({ length: 20 }, () => second.next()),
    );
  });

  it("can resume from a serializable snapshot", () => {
    const rng = createRng("rng-snapshot-seed");

    const prefix = [rng.next(), rng.next(), rng.next()];
    const snapshot = rng.snapshot();
    const expectedSuffix = [rng.next(), rng.next(), rng.next()];
    const resumed = createRng(snapshot);

    expect(prefix).toHaveLength(3);
    expect(resumed.snapshot()).toEqual(snapshot);
    expect([resumed.next(), resumed.next(), resumed.next()]).toEqual(expectedSuffix);
  });
});
