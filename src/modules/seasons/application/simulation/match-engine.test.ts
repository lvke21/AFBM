import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/random/seeded-rng";
import { buildInitialRoster } from "../../../savegames/application/bootstrap/initial-roster";

import { prepareTeamForSimulation } from "./depth-chart";
import { generateMatchStats } from "./match-engine";
import { updateSeasonProgression } from "./season-progression";
import type {
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "./simulation.types";

function createStatAnchor(id: string): SimulationStatAnchor {
  return {
    id,
    passingLongestCompletion: 0,
    rushingLongestRush: 0,
    receivingLongestReception: 0,
    kickingLongestFieldGoal: 0,
    puntingLongestPunt: 0,
  };
}

function buildSimulationTeam(
  teamId: string,
  city: string,
  nickname: string,
  rosterIndex: number,
  prestige: number,
): SimulationTeamContext {
  const roster = buildInitialRoster(rosterIndex, prestige, 2026).map((seed, index) => ({
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
      Object.entries(seed.attributes).filter((entry): entry is [string, number] => entry[1] != null),
    ),
    gameDayAvailability: "ACTIVE" as const,
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    seasonStat: createStatAnchor(`season-${teamId}-${index}`),
    careerStat: createStatAnchor(`career-${teamId}-${index}`),
  }));

  return {
    id: teamId,
    city,
    nickname,
    abbreviation: teamId,
    overallRating: prestige,
    roster,
  };
}

function createSequenceRandom(values: number[]) {
  let index = 0;

  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

function applyQuarterbackProfile(
  player: SimulationTeamContext["roster"][number],
  profile: "strong" | "developing",
) {
  const value = profile === "strong" ? 80 : 74;

  player.positionOverall = value;
  player.offensiveOverall = value;
  player.mentalOverall = value;
  player.physicalOverall = profile === "strong" ? 77 : 73;
  player.morale = 70;
  player.fatigue = 30;
  Object.assign(player.attributes, {
    THROW_POWER: value,
    THROW_ACCURACY_SHORT: value,
    THROW_ACCURACY_MEDIUM: value,
    THROW_ACCURACY_DEEP: value - 2,
    DECISION_MAKING: value,
    POCKET_PRESENCE: value,
    AWARENESS: value,
    DISCIPLINE: value,
    MOBILITY: profile === "strong" ? 76 : 73,
    SCRAMBLING: profile === "strong" ? 74 : 72,
  });
}

function buildQuarterbackLineupTeam(strongStarter: boolean) {
  const team = buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74);
  const quarterbacks = team.roster
    .filter((player) => player.positionCode === "QB")
    .sort((left, right) => (left.depthChartSlot ?? 99) - (right.depthChartSlot ?? 99));
  const strong = quarterbacks[0];
  const developing = quarterbacks[1];

  if (!strong || !developing) {
    throw new Error("Expected two quarterbacks for lineup impact test");
  }

  applyQuarterbackProfile(strong, "strong");
  applyQuarterbackProfile(developing, "developing");
  strong.depthChartSlot = strongStarter ? 1 : 2;
  strong.rosterStatus = strongStarter ? "STARTER" : "ROTATION";
  developing.depthChartSlot = strongStarter ? 2 : 1;
  developing.rosterStatus = strongStarter ? "ROTATION" : "STARTER";

  return team;
}

describe("season simulation", () => {
  it("builds a usable depth chart with starter and return roles", () => {
    const team = buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74);
    const prepared = prepareTeamForSimulation(team);

    expect(prepared.quarterbacks[0]?.positionCode).toBe("QB");
    expect(prepared.kickReturner?.secondaryPositionCode).toBe("KR");
    expect(prepared.puntReturner?.secondaryPositionCode).toBe("PR");
    expect(prepared.longSnapper?.positionCode).toBe("LS");
    expect(prepared.starterIds.size).toBeGreaterThanOrEqual(20);
  });

  it("excludes inactive and practice squad players from the prepared lineup", () => {
    const team = buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74);
    const quarterback = team.roster.find((player) => player.positionCode === "QB" && player.depthChartSlot === 1);
    const nextQuarterback = team.roster.find((player) => player.positionCode === "QB" && player.depthChartSlot === 2);
    const returner = team.roster.find((player) => player.secondaryPositionCode === "KR");

    if (!quarterback || !nextQuarterback || !returner) {
      throw new Error("Expected seeded quarterback and returner setup");
    }

    quarterback.rosterStatus = "INACTIVE";
    returner.rosterStatus = "PRACTICE_SQUAD";

    const prepared = prepareTeamForSimulation(team);

    expect(prepared.quarterbacks[0]?.id).toBe(nextQuarterback.id);
    expect(prepared.participants.find((player) => player.id === quarterback.id)).toBeUndefined();
    expect(prepared.kickReturner?.id).not.toBe(returner.id);
  });

  it("generates drive-based match results with player and team stats", () => {
    const random = createSequenceRandom([
      0.12, 0.73, 0.41, 0.88, 0.34, 0.57, 0.26, 0.91, 0.49, 0.68,
    ]);
    const matchContext: SimulationMatchContext = {
      matchId: "match-1",
      saveGameId: "save-1",
      seasonId: "season-1",
      kind: "REGULAR_SEASON",
      simulationSeed: "match-1-seed",
      seasonYear: 2026,
      week: 1,
      scheduledAt: new Date("2026-09-01T18:00:00.000Z"),
      homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
      awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
    };

    const result = generateMatchStats(matchContext, random);
    const totalPassingYards = result.playerLines.reduce(
      (sum, line) => sum + line.passing.yards,
      0,
    );
    const totalTackles = result.playerLines.reduce(
      (sum, line) => sum + line.defensive.tackles,
      0,
    );
    const totalSpecialTeamsReturns = result.playerLines.reduce(
      (sum, line) =>
        sum +
        line.returns.kickReturns +
        line.returns.puntReturns +
        line.punting.punts,
      0,
    );
    const totalDrops = result.playerLines.reduce(
      (sum, line) => sum + line.receiving.drops,
      0,
    );

    expect(result.playerLines.length).toBeGreaterThan(20);
    expect(result.homeTeam.totalYards + result.awayTeam.totalYards).toBeGreaterThan(300);
    expect(totalPassingYards).toBeGreaterThan(150);
    expect(totalTackles).toBeGreaterThan(20);
    expect(totalSpecialTeamsReturns).toBeGreaterThan(0);
    expect(totalDrops).toBeGreaterThanOrEqual(0);
    expect(result.drives.length).toBeGreaterThan(10);
    expect(result.drives[0]?.summary.length).toBeGreaterThan(10);
  });

  it("replays the same match seed deterministically", () => {
    const matchContext: SimulationMatchContext = {
      matchId: "deterministic-1",
      saveGameId: "save-1",
      seasonId: "season-1",
      kind: "REGULAR_SEASON",
      simulationSeed: "deterministic-seed-1",
      seasonYear: 2026,
      week: 2,
      scheduledAt: new Date("2026-09-08T18:00:00.000Z"),
      homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
      awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
    };

    const first = generateMatchStats(matchContext);
    const second = generateMatchStats(matchContext);

    expect({
      homeScore: first.homeScore,
      awayScore: first.awayScore,
      homeYards: first.homeTeam.totalYards,
      awayYards: first.awayTeam.totalYards,
      drives: first.drives.map((drive) => ({
        resultType: drive.resultType,
        summary: drive.summary,
        endedHomeScore: drive.endedHomeScore,
        endedAwayScore: drive.endedAwayScore,
      })),
    }).toEqual({
      homeScore: second.homeScore,
      awayScore: second.awayScore,
      homeYards: second.homeTeam.totalYards,
      awayYards: second.awayTeam.totalYards,
      drives: second.drives.map((drive) => ({
        resultType: drive.resultType,
        summary: drive.summary,
        endedHomeScore: drive.endedHomeScore,
        endedAwayScore: drive.endedAwayScore,
      })),
    });
  });

  it("replays ten seeded matches with identical full simulation results", () => {
    for (let index = 0; index < 10; index += 1) {
      const seed = `full-determinism-seed-${index + 1}`;
      const matchContext: SimulationMatchContext = {
        matchId: `full-determinism-${index + 1}`,
        saveGameId: "save-1",
        seasonId: "season-1",
        kind: "REGULAR_SEASON",
        simulationSeed: seed,
        seasonYear: 2026,
        week: (index % 10) + 1,
        scheduledAt: new Date("2026-09-08T18:00:00.000Z"),
        homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
        awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
      };

      const first = generateMatchStats(matchContext);
      const second = generateMatchStats(matchContext);

      expect(first.simulationSeed).toBe(seed);
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
      expect(first).toEqual(second);
    }
  });

  it("replays explicit RNG instances from the same seed", () => {
    const matchContext: SimulationMatchContext = {
      matchId: "rng-propagation-1",
      saveGameId: "save-1",
      seasonId: "season-1",
      kind: "REGULAR_SEASON",
      simulationSeed: "rng-propagation-seed-1",
      seasonYear: 2026,
      week: 3,
      scheduledAt: new Date("2026-09-15T18:00:00.000Z"),
      homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
      awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
    };

    const first = generateMatchStats(matchContext, createRng(matchContext.simulationSeed));
    const second = generateMatchStats(matchContext, createRng(matchContext.simulationSeed));

    expect(first).toEqual(second);
    expect(first.simulationSeed).toBe(matchContext.simulationSeed);
  });

  it("makes depth-chart starter choices measurable without overwhelming the whole simulation", () => {
    let strongStarterPassingYards = 0;
    let developingStarterPassingYards = 0;
    let strongStarterTotalYards = 0;
    let developingStarterTotalYards = 0;

    for (let index = 0; index < 8; index += 1) {
      const seed = `depth-chart-impact-${index + 1}`;
      const baseContext = {
        matchId: `depth-chart-impact-${index + 1}`,
        saveGameId: "save-1",
        seasonId: "season-1",
        kind: "REGULAR_SEASON" as const,
        simulationSeed: seed,
        seasonYear: 2026,
        week: (index % 10) + 1,
        scheduledAt: new Date("2026-09-08T18:00:00.000Z"),
        awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 74),
      };

      const strongStarter = generateMatchStats({
        ...baseContext,
        homeTeam: buildQuarterbackLineupTeam(true),
      });
      const developingStarter = generateMatchStats({
        ...baseContext,
        homeTeam: buildQuarterbackLineupTeam(false),
      });

      expect(strongStarter.engineNotes).toContain(
        "BOS: Starter-Bonus angewendet (QB, RB, OL, Defense; Backups leicht reduziert).",
      );
      strongStarterPassingYards += strongStarter.homeTeam.passingYards;
      developingStarterPassingYards += developingStarter.homeTeam.passingYards;
      strongStarterTotalYards += strongStarter.homeTeam.totalYards;
      developingStarterTotalYards += developingStarter.homeTeam.totalYards;
    }

    const passingYardDiff = strongStarterPassingYards - developingStarterPassingYards;
    const totalYardDiff = strongStarterTotalYards - developingStarterTotalYards;

    expect(passingYardDiff).toBeGreaterThan(20);
    expect(totalYardDiff).toBeGreaterThan(15);
    expect(passingYardDiff / Math.max(developingStarterPassingYards, 1)).toBeLessThan(0.45);
  });

  it("distributes production across multiple rotation players instead of a single drive hero", () => {
    const matchContext: SimulationMatchContext = {
      matchId: "rotation-1",
      saveGameId: "save-1",
      seasonId: "season-1",
      kind: "REGULAR_SEASON",
      simulationSeed: "rotation-seed-1",
      seasonYear: 2026,
      week: 3,
      scheduledAt: new Date("2026-09-15T18:00:00.000Z"),
      homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
      awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
    };

    const result = generateMatchStats(matchContext);
    const rushContributors = result.playerLines.filter((line) => line.rushing.attempts > 0);
    const targetContributors = result.playerLines.filter((line) => line.receiving.targets > 0);
    const tackleContributors = result.playerLines.filter((line) => line.defensive.tackles > 0);

    expect(rushContributors.length).toBeGreaterThan(2);
    expect(targetContributors.length).toBeGreaterThan(4);
    expect(tackleContributors.length).toBeGreaterThan(4);
  });

  it("keeps team yards aligned with passing plus rushing and player rollups across seeded games", () => {
    const pairings: Array<
      [
        string,
        string,
        string,
        number,
        number,
        string,
        string,
        string,
        number,
        number,
      ]
    > = [
      ["BOS", "Boston", "Guardians", 0, 74, "NYT", "New York", "Titans", 1, 78],
      ["DAL", "Dallas", "Wranglers", 4, 80, "SEA", "Seattle", "Phantoms", 5, 77],
      ["DEN", "Denver", "Mountaineers", 6, 75, "ATL", "Atlanta", "Firebirds", 7, 73],
      ["BOS", "Boston", "Guardians", 0, 74, "DAL", "Dallas", "Wranglers", 4, 80],
      ["NYT", "New York", "Titans", 1, 78, "SEA", "Seattle", "Phantoms", 5, 77],
    ];

    for (const [homeId, homeCity, homeNick, homeRoster, homePrestige, awayId, awayCity, awayNick, awayRoster, awayPrestige] of pairings) {
      const matchContext: SimulationMatchContext = {
        matchId: `yard-balance-${homeId}-${awayId}`,
        saveGameId: "save-1",
        seasonId: "season-1",
        kind: "REGULAR_SEASON",
        simulationSeed: `yard-balance-seed-${homeId}-${awayId}`,
        seasonYear: 2026,
        week: 4,
        scheduledAt: new Date("2026-09-22T18:00:00.000Z"),
        homeTeam: buildSimulationTeam(homeId, homeCity, homeNick, homeRoster, homePrestige),
        awayTeam: buildSimulationTeam(awayId, awayCity, awayNick, awayRoster, awayPrestige),
      };

      const result = generateMatchStats(matchContext);
      const teamIds = [result.homeTeam.teamId, result.awayTeam.teamId];

      for (const teamId of teamIds) {
        const teamResult =
          result.homeTeam.teamId === teamId ? result.homeTeam : result.awayTeam;
        const playerLines = result.playerLines.filter((line) => line.teamId === teamId);
        const playerPassingYards = playerLines.reduce(
          (sum, line) => sum + line.passing.yards,
          0,
        );
        const playerRushingYards = playerLines.reduce(
          (sum, line) => sum + line.rushing.yards,
          0,
        );

        expect(teamResult.totalYards).toBe(
          teamResult.passingYards + teamResult.rushingYards,
        );
        expect(teamResult.passingYards).toBe(playerPassingYards);
        expect(teamResult.rushingYards).toBe(playerRushingYards);
        expect(teamResult.totalYards).toBe(playerPassingYards + playerRushingYards);
      }
    }
  });

  it("uses a shared game clock so total time of possession stays within regulation", () => {
    const matchContext: SimulationMatchContext = {
      matchId: "clock-balance-1",
      saveGameId: "save-1",
      seasonId: "season-1",
      kind: "REGULAR_SEASON",
      simulationSeed: "clock-balance-seed-1",
      seasonYear: 2026,
      week: 5,
      scheduledAt: new Date("2026-09-29T18:00:00.000Z"),
      homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
      awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
    };

    const result = generateMatchStats(matchContext);
    const totalTop =
      result.homeTeam.timeOfPossessionSeconds +
      result.awayTeam.timeOfPossessionSeconds;
    const quarterLabels = new Set(result.drives.map((drive) => drive.phaseLabel));

    expect(totalTop).toBe(3600);
    expect(result.homeTeam.timeOfPossessionSeconds).toBeGreaterThan(0);
    expect(result.awayTeam.timeOfPossessionSeconds).toBeGreaterThan(0);
    expect([...quarterLabels]).toEqual(
      expect.arrayContaining(["Q1", "Q2", "Q3", "Q4"]),
    );
  });

  it("produces punts, field goals, touchdowns and turnover on downs across seeded games", () => {
    const resultTypes = new Set<string>();

    for (let index = 0; index < 40; index += 1) {
      const matchContext: SimulationMatchContext = {
        matchId: `drive-end-${index + 1}`,
        saveGameId: "save-1",
        seasonId: "season-1",
        kind: "REGULAR_SEASON",
        simulationSeed: `drive-end-seed-${index + 1}`,
        seasonYear: 2026,
        week: (index % 10) + 1,
        scheduledAt: new Date("2026-10-01T18:00:00.000Z"),
        homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
        awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
      };

      const result = generateMatchStats(matchContext);

      for (const drive of result.drives) {
        resultTypes.add(drive.resultType);
      }
    }

    expect(resultTypes.has("PUNT")).toBe(true);
    expect(resultTypes.has("FIELD_GOAL_MADE")).toBe(true);
    expect(resultTypes.has("TOUCHDOWN")).toBe(true);
    expect(resultTypes.has("TURNOVER_ON_DOWNS")).toBe(true);
  });

  it("keeps red-zone trips aligned between team totals and drive logs", () => {
    let teamRedZoneTrips = 0;
    let teamRedZoneTouchdowns = 0;
    let driveRedZoneTrips = 0;
    let driveRedZoneTouchdowns = 0;

    for (let index = 0; index < 30; index += 1) {
      const matchContext: SimulationMatchContext = {
        matchId: `red-zone-integrity-${index + 1}`,
        saveGameId: "save-1",
        seasonId: "season-1",
        kind: "REGULAR_SEASON",
        simulationSeed: `red-zone-integrity-seed-${index + 1}`,
        seasonYear: 2026,
        week: (index % 10) + 1,
        scheduledAt: new Date("2026-10-08T18:00:00.000Z"),
        homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
        awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
      };

      const result = generateMatchStats(matchContext);
      teamRedZoneTrips += result.homeTeam.redZoneTrips + result.awayTeam.redZoneTrips;
      teamRedZoneTouchdowns +=
        result.homeTeam.redZoneTouchdowns + result.awayTeam.redZoneTouchdowns;

      for (const drive of result.drives) {
        if (drive.redZoneTrip) {
          expect(drive.highestReachedFieldPosition ?? 0).toBeGreaterThanOrEqual(80);
          driveRedZoneTrips += 1;

          if (drive.resultType === "TOUCHDOWN") {
            driveRedZoneTouchdowns += 1;
          }
        }
      }
    }

    expect(teamRedZoneTrips).toBe(driveRedZoneTrips);
    expect(teamRedZoneTouchdowns).toBe(driveRedZoneTouchdowns);
    expect(driveRedZoneTrips).toBeGreaterThan(driveRedZoneTouchdowns);
    expect(driveRedZoneTouchdowns).toBeGreaterThan(0);
  });

  it("forces playoff matches to finish with a decisive winner", () => {
    const matchContext: SimulationMatchContext = {
      matchId: "playoff-1",
      saveGameId: "save-1",
      seasonId: "season-1",
      kind: "PLAYOFF",
      simulationSeed: "playoff-1-seed",
      seasonYear: 2026,
      week: 15,
      scheduledAt: new Date("2026-12-01T18:00:00.000Z"),
      homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
      awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 0, 74),
    };

    const result = generateMatchStats(matchContext, () => 0);

    expect(result.homeScore).not.toBe(result.awayScore);
  });

  it("advances the season until the last week and then closes it", () => {
    expect(updateSeasonProgression(1, 14)).toEqual({
      isFinalWeek: false,
      nextPhase: "REGULAR_SEASON",
      nextWeek: 2,
    });

    expect(updateSeasonProgression(14, 14)).toEqual({
      isFinalWeek: true,
      nextPhase: "OFFSEASON",
      nextWeek: 14,
    });
  });
});
