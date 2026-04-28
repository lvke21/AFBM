import { describe, expect, it } from "vitest";

import { buildInitialRoster } from "../../../savegames/application/bootstrap/initial-roster";
import type { SimulationTeamContext } from "./simulation.types";
import { prepareTeamForSimulation, validateTeamForSimulation } from "./depth-chart";

function buildSimulationTeam(): SimulationTeamContext {
  const teamId = "BOS";

  return {
    id: teamId,
    city: "Boston",
    nickname: "Guardians",
    abbreviation: teamId,
    overallRating: 74,
    roster: buildInitialRoster(0, 74, 2026).map((seed, index) => ({
      id: `${teamId}-player-${index}`,
      teamId,
      firstName: seed.firstName,
      lastName: seed.lastName,
      age: seed.age,
      developmentTrait: seed.developmentTrait,
      potentialRating: seed.potentialRating,
      positionCode: seed.primaryPositionCode,
      secondaryPositionCode: seed.secondaryPositionCode ?? null,
      rosterStatus: seed.rosterStatus,
      depthChartSlot: seed.depthChartSlot,
      captainFlag: seed.captainFlag,
      developmentFocus: false,
      injuryRisk: seed.injuryRisk,
      status: "ACTIVE",
      injuryStatus: "HEALTHY",
      injuryName: null,
      injuryEndsOn: null,
      fatigue: seed.fatigue,
      morale: seed.morale,
      positionOverall: seed.positionOverall,
      offensiveOverall: seed.offensiveOverall ?? null,
      defensiveOverall: seed.defensiveOverall ?? null,
      specialTeamsOverall: seed.specialTeamsOverall ?? null,
      physicalOverall: seed.physicalOverall,
      mentalOverall: seed.mentalOverall,
      attributes: Object.fromEntries(
        Object.entries(seed.attributes).filter(
          (entry): entry is [string, number] => entry[1] != null,
        ),
      ),
      gameDayAvailability: "ACTIVE" as const,
      gameDayReadinessMultiplier: 1,
      gameDaySnapMultiplier: 1,
      seasonStat: {
        id: `season-${index}`,
        passingLongestCompletion: 0,
        rushingLongestRush: 0,
        receivingLongestReception: 0,
        kickingLongestFieldGoal: 0,
        puntingLongestPunt: 0,
      },
      careerStat: {
        id: `career-${index}`,
        passingLongestCompletion: 0,
        rushingLongestRush: 0,
        receivingLongestReception: 0,
        kickingLongestFieldGoal: 0,
        puntingLongestPunt: 0,
      },
    })),
  };
}

describe("validateTeamForSimulation", () => {
  it("flags incomplete critical positions instead of silently simulating invalid teams", () => {
    const team = buildSimulationTeam();

    for (const player of team.roster) {
      if (
        player.positionCode === "QB" ||
        player.positionCode === "K" ||
        player.positionCode === "P"
      ) {
        player.rosterStatus = "INACTIVE";
      }
    }

    const issues = validateTeamForSimulation(team);

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["QB_MISSING", "KICKER_MISSING", "PUNTER_MISSING"]),
    );
  });

  it("treats doubtful players as deterministic game-day risks", () => {
    const team = buildSimulationTeam();

    for (const player of team.roster) {
      if (player.positionCode === "QB") {
        player.injuryStatus = "DOUBTFUL";
      }
    }

    const blockingSeed = Array.from({ length: 40 }, (_, index) => `doubtful-seed-${index}`).find(
      (seed) =>
        validateTeamForSimulation(team, seed).some((issue) => issue.code === "QB_MISSING"),
    );

    expect(blockingSeed).toBeDefined();
    expect(
      validateTeamForSimulation(team, blockingSeed).map((issue) => issue.code),
    ).toContain("QB_MISSING");
  });

  it("treats out players as unavailable for critical game-day positions", () => {
    const team = buildSimulationTeam();

    for (const player of team.roster) {
      if (player.positionCode === "QB") {
        player.injuryStatus = "OUT";
      }
    }

    expect(validateTeamForSimulation(team).map((issue) => issue.code)).toContain("QB_MISSING");
  });

  it("keeps questionable players active but limits their snaps when available", () => {
    const team = buildSimulationTeam();
    const startingReceiver = team.roster.find(
      (player) => player.positionCode === "WR" && player.depthChartSlot === 1,
    );

    if (!startingReceiver) {
      throw new Error("Expected a seeded starting wide receiver");
    }

    startingReceiver.injuryStatus = "QUESTIONABLE";

    const activeSeed = Array.from({ length: 40 }, (_, index) => `questionable-seed-${index}`).find(
      (seed) =>
        prepareTeamForSimulation(team, seed).participants.some(
          (player) => player.id === startingReceiver.id,
        ),
    );

    if (!activeSeed) {
      throw new Error("Expected a deterministic seed that keeps the questionable player active");
    }

    const prepared = prepareTeamForSimulation(team, activeSeed);
    const preparedReceiver = prepared.participants.find(
      (player) => player.id === startingReceiver.id,
    );

    expect(preparedReceiver?.gameDayAvailability).toBe("LIMITED");
    expect(preparedReceiver?.gameDaySnapMultiplier).toBeLessThan(1);
  });

  it("applies moderate fatigue penalties to game-day readiness and snaps", () => {
    const team = buildSimulationTeam();
    const startingReceiver = team.roster.find(
      (player) => player.positionCode === "WR" && player.depthChartSlot === 1,
    );

    if (!startingReceiver) {
      throw new Error("Expected a seeded starting wide receiver");
    }

    startingReceiver.fatigue = 80;

    const prepared = prepareTeamForSimulation(team, "fatigue-seed");
    const preparedReceiver = prepared.participants.find(
      (player) => player.id === startingReceiver.id,
    );

    expect(preparedReceiver?.gameDayAvailability).toBe("ACTIVE");
    expect(preparedReceiver?.gameDayReadinessMultiplier).toBeCloseTo(0.96);
    expect(preparedReceiver?.gameDaySnapMultiplier).toBeCloseTo(0.968);
  });

  it("loads the updated depth chart starter order into the simulation context", () => {
    const team = buildSimulationTeam();
    const quarterbacks = team.roster
      .filter((player) => player.positionCode === "QB")
      .sort((left, right) => (left.depthChartSlot ?? 99) - (right.depthChartSlot ?? 99));

    if (quarterbacks.length < 2) {
      throw new Error("Expected at least two seeded quarterbacks");
    }

    quarterbacks[0]!.depthChartSlot = 2;
    quarterbacks[0]!.rosterStatus = "BACKUP";
    quarterbacks[1]!.depthChartSlot = 1;
    quarterbacks[1]!.rosterStatus = "STARTER";

    const prepared = prepareTeamForSimulation(team, "depth-chart-update");

    expect(prepared.quarterbacks[0]?.id).toBe(quarterbacks[1]!.id);
  });
});
