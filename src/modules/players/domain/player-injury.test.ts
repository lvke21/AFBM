import { describe, expect, it } from "vitest";

import { InjuryStatus, PlayerStatus } from "@/modules/shared/domain/enums";

import { calculateMatchInjuryRisk, resolveMatchInjury } from "./player-injury";

const basePlayer = {
  attributes: {
    DURABILITY: 70,
    TOUGHNESS: 72,
  },
  fatigue: 30,
  injuryRisk: 50,
  physicalOverall: 72,
  positionCode: "WR",
  totalSnaps: 42,
};

function sequenceRandom(values: number[]) {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1];
    index += 1;
    return value;
  };
}

describe("player injury", () => {
  it("raises match injury risk when fatigue and exposure increase", () => {
    const restedRisk = calculateMatchInjuryRisk(basePlayer);
    const fatiguedRisk = calculateMatchInjuryRisk({
      ...basePlayer,
      fatigue: 88,
      totalSnaps: 68,
    });

    expect(fatiguedRisk).toBeGreaterThan(restedRisk);
    expect(fatiguedRisk).toBeLessThanOrEqual(0.11);
  });

  it("keeps idle players out of the injury roll", () => {
    const risk = calculateMatchInjuryRisk({
      ...basePlayer,
      fatigue: 99,
      totalSnaps: 0,
    });
    const injury = resolveMatchInjury({
      player: {
        ...basePlayer,
        fatigue: 99,
        totalSnaps: 0,
      },
      random: () => 0,
      scheduledAt: new Date("2026-09-08T18:00:00.000Z"),
    });

    expect(risk).toBe(0);
    expect(injury).toBeNull();
  });

  it("resolves deterministic injury outcomes from controlled rolls", () => {
    const scheduledAt = new Date("2026-09-08T18:00:00.000Z");
    const minor = resolveMatchInjury({
      player: basePlayer,
      random: sequenceRandom([0, 0.1]),
      scheduledAt,
    });
    const doubtful = resolveMatchInjury({
      player: basePlayer,
      random: sequenceRandom([0, 0.8]),
      scheduledAt,
    });
    const out = resolveMatchInjury({
      player: basePlayer,
      random: sequenceRandom([0, 0.91]),
      scheduledAt,
    });
    const injuredReserve = resolveMatchInjury({
      player: basePlayer,
      random: sequenceRandom([0, 0.99]),
      scheduledAt,
    });

    expect(minor).toMatchObject({
      status: PlayerStatus.ACTIVE,
      injuryStatus: InjuryStatus.QUESTIONABLE,
      moralePenalty: 2,
    });
    expect(minor?.injuryEndsOn.toISOString()).toBe("2026-09-15T18:00:00.000Z");

    expect(doubtful).toMatchObject({
      status: PlayerStatus.INJURED,
      injuryStatus: InjuryStatus.DOUBTFUL,
      moralePenalty: 5,
    });
    expect(doubtful?.injuryEndsOn.toISOString()).toBe("2026-09-18T18:00:00.000Z");

    expect(out).toMatchObject({
      status: PlayerStatus.INJURED,
      injuryStatus: InjuryStatus.OUT,
      moralePenalty: 5,
    });
    expect(out?.injuryEndsOn.toISOString()).toBe("2026-09-26T18:00:00.000Z");

    expect(injuredReserve).toMatchObject({
      status: PlayerStatus.INJURED,
      injuryStatus: InjuryStatus.INJURED_RESERVE,
      moralePenalty: 8,
    });
    expect(injuredReserve?.injuryEndsOn.toISOString()).toBe("2026-10-20T18:00:00.000Z");
  });

  it("returns no injury when the controlled risk roll misses", () => {
    const injury = resolveMatchInjury({
      player: basePlayer,
      random: () => 0.99,
      scheduledAt: new Date("2026-09-08T18:00:00.000Z"),
    });

    expect(injury).toBeNull();
  });
});
