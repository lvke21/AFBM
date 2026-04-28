import { describe, expect, it } from "vitest";

import {
  ALL_FILTER_VALUE,
  canReleasePlayer,
  filterRosterPlayers,
  buildRosterContractSnapshot,
  getCapSharePercent,
  getRosterContractRisk,
  getRosterActionState,
  getRosterFilterOptions,
  getRosterStatusLabel,
  getVisibleRosterPlayers,
  selectRosterQuickInfoPlayer,
  sortRosterPlayersBy,
} from "./roster-model";
import type { TeamPlayerSummary } from "@/modules/teams/domain/team.types";

const shell = {
  age: 25,
  yearsPro: 3,
  heightCm: 185,
  weightKg: 95,
  positionName: "Position",
  secondaryPositionCode: null,
  secondaryPositionName: null,
  positionGroupName: "Group",
  archetypeName: null,
  schemeFitName: null,
  captainFlag: false,
  developmentFocus: false,
  schemeFitScore: null,
  physicalOverall: 75,
  mentalOverall: 75,
  detailRatings: [],
  status: "ACTIVE",
  injuryStatus: "HEALTHY",
  injuryName: null,
  morale: 70,
  fatigue: 10,
  keyAttributes: {
    speed: 70,
    strength: 70,
    awareness: 70,
    leadership: 70,
    discipline: 70,
    durability: 70,
    mobility: 70,
    hands: 70,
    coverageRange: 70,
    linebackerCoverage: 70,
    linebackerManCoverage: 70,
    linebackerZoneCoverage: 70,
    kickConsistency: 70,
    returnVision: 70,
    snapAccuracy: 70,
    snapVelocity: 70,
  },
  currentContract: null,
  seasonLine: {
    gamesPlayed: 0,
    passingYards: 0,
    passingTouchdowns: 0,
    passingInterceptions: 0,
    rushingYards: 0,
    rushingTouchdowns: 0,
    receivingYards: 0,
    receptions: 0,
    receivingTouchdowns: 0,
    tackles: 0,
    sacks: 0,
    passesDefended: 0,
    interceptions: 0,
    targetsAllowed: 0,
    receptionsAllowed: 0,
    yardsAllowed: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    punts: 0,
    puntsInside20: 0,
    returnYards: 0,
    returnTouchdowns: 0,
    returnFumbles: 0,
  },
} satisfies Omit<
  TeamPlayerSummary,
  | "id"
  | "fullName"
  | "positionCode"
  | "rosterStatus"
  | "depthChartSlot"
  | "positionOverall"
  | "potentialRating"
>;

const players: TeamPlayerSummary[] = [
  {
    ...shell,
    id: "qb",
    fullName: "Quinn QB",
    positionCode: "QB",
    rosterStatus: "STARTER",
    depthChartSlot: 1,
    positionOverall: 82,
    potentialRating: 86,
    currentContract: {
      capHit: 9_000_000,
      signingBonus: 1_000_000,
      yearlySalary: 8_000_000,
      years: 3,
    },
  },
  {
    ...shell,
    id: "wr",
    age: 23,
    fullName: "Wes WR",
    positionCode: "WR",
    rosterStatus: "BACKUP",
    depthChartSlot: 2,
    positionOverall: 74,
    potentialRating: 81,
    currentContract: {
      capHit: 2_500_000,
      signingBonus: 500_000,
      yearlySalary: 2_000_000,
      years: 2,
    },
  },
  {
    ...shell,
    id: "cb",
    fullName: "Casey CB",
    positionCode: "CB",
    rosterStatus: "ROTATION",
    depthChartSlot: 1,
    positionOverall: 88,
    potentialRating: 90,
    currentContract: {
      capHit: 12_000_000,
      signingBonus: 2_000_000,
      yearlySalary: 10_000_000,
      years: 4,
    },
  },
  {
    ...shell,
    id: "fb",
    fullName: "Finn FB",
    positionCode: "FB",
    rosterStatus: "BACKUP",
    depthChartSlot: 2,
    positionOverall: 66,
    potentialRating: 72,
  },
];

describe("roster model", () => {
  it("filters by position and status", () => {
    expect(
      filterRosterPlayers(players, {
        positionCode: "WR",
        playerRole: ALL_FILTER_VALUE,
        ratingTier: ALL_FILTER_VALUE,
        rosterStatus: ALL_FILTER_VALUE,
      }).map((player) => player.id),
    ).toEqual(["wr"]);

    expect(
      filterRosterPlayers(players, {
        positionCode: ALL_FILTER_VALUE,
        playerRole: ALL_FILTER_VALUE,
        ratingTier: ALL_FILTER_VALUE,
        rosterStatus: "ROTATION",
      }).map((player) => player.id),
    ).toEqual(["cb"]);
  });

  it("filters by rating tier", () => {
    expect(
      filterRosterPlayers(players, {
        positionCode: ALL_FILTER_VALUE,
        playerRole: ALL_FILTER_VALUE,
        ratingTier: "80_PLUS",
        rosterStatus: ALL_FILTER_VALUE,
      }).map((player) => player.id),
    ).toEqual(["qb", "cb"]);

    expect(
      filterRosterPlayers(players, {
        positionCode: ALL_FILTER_VALUE,
        playerRole: ALL_FILTER_VALUE,
        ratingTier: "UNDER_70",
        rosterStatus: ALL_FILTER_VALUE,
      }).map((player) => player.id),
    ).toEqual(["fb"]);
  });

  it("filters by derived player role", () => {
    expect(
      filterRosterPlayers(players, {
        positionCode: ALL_FILTER_VALUE,
        playerRole: "starter-fit",
        ratingTier: ALL_FILTER_VALUE,
        rosterStatus: ALL_FILTER_VALUE,
      }).map((player) => player.id),
    ).toEqual(["qb", "cb"]);

    expect(
      filterRosterPlayers(players, {
        positionCode: ALL_FILTER_VALUE,
        playerRole: "development-upside",
        ratingTier: ALL_FILTER_VALUE,
        rosterStatus: ALL_FILTER_VALUE,
      }).map((player) => player.id),
    ).toEqual(["wr"]);
  });

  it("sorts by position, overall and status", () => {
    expect(sortRosterPlayersBy(players, "position").map((player) => player.id)).toEqual([
      "qb",
      "fb",
      "wr",
      "cb",
    ]);
    expect(sortRosterPlayersBy(players, "overall").map((player) => player.id)).toEqual([
      "cb",
      "qb",
      "wr",
      "fb",
    ]);
    expect(sortRosterPlayersBy(players, "status").map((player) => player.id)).toEqual([
      "qb",
      "cb",
      "fb",
      "wr",
    ]);
    expect(sortRosterPlayersBy(players, "capHit").map((player) => player.id)).toEqual([
      "cb",
      "qb",
      "wr",
      "fb",
    ]);
  });

  it("combines filter and sorting for visible roster players", () => {
    expect(
      getVisibleRosterPlayers(
        players,
        {
          positionCode: ALL_FILTER_VALUE,
          playerRole: ALL_FILTER_VALUE,
          ratingTier: ALL_FILTER_VALUE,
          rosterStatus: ALL_FILTER_VALUE,
        },
        "overall",
      ).map((player) => player.id),
    ).toEqual(["cb", "qb", "wr", "fb"]);
  });

  it("returns stable filter options", () => {
    expect(getRosterFilterOptions(players)).toEqual({
      positions: ["QB", "FB", "WR", "CB"],
      statuses: ["STARTER", "ROTATION", "BACKUP"],
    });
  });

  it("formats roster status labels consistently for UI", () => {
    expect(getRosterStatusLabel("STARTER")).toBe("Starter");
    expect(getRosterStatusLabel("ROTATION")).toBe("Rotation");
    expect(getRosterStatusLabel("BACKUP")).toBe("Backup");
    expect(getRosterStatusLabel("INACTIVE")).toBe("Inaktiv");
    expect(getRosterStatusLabel(null)).toBe("Kein Status");
  });

  it("validates release actions for manager teams only", () => {
    expect(canReleasePlayer(players[0], true)).toBe(true);
    expect(canReleasePlayer(players[0], false)).toBe(false);
    expect(getRosterActionState(players[0], false).releaseReason).toBe(
      "Release nur fuer das Managerteam.",
    );
  });

  it("selects the strongest visible player for quick info", () => {
    expect(selectRosterQuickInfoPlayer(players)?.id).toBe("cb");
    expect(selectRosterQuickInfoPlayer([])).toBeNull();
  });

  it("derives contract risk indicators from existing contract data", () => {
    expect(getCapSharePercent(8_000_000, 100_000_000)).toBe(8);
    expect(getRosterContractRisk(players[0], 100_000_000)).toMatchObject({
      capSharePercent: 9,
      isExpiring: false,
      label: "Hoher Cap",
      tone: "warning",
    });
    expect(
      getRosterContractRisk(
        {
          ...players[1],
          currentContract: {
            capHit: 9_000_000,
            signingBonus: 1_000_000,
            yearlySalary: 8_000_000,
            years: 1,
          },
        },
        100_000_000,
      ),
    ).toMatchObject({
      isExpiring: true,
      label: "High Risk",
      tone: "danger",
    });
    expect(getRosterContractRisk(players[3], 100_000_000)).toMatchObject({
      label: "Kein Vertrag",
      tone: "warning",
    });
  });

  it("builds a roster contract snapshot for the roster cap panel", () => {
    const team = {
      contractOutlook: {
        activeCapCommitted: 25_000_000,
        expiringCap: 2_500_000,
        expiringPlayers: [
          {
            capHit: 2_500_000,
            fullName: "Wes WR",
            id: "wr",
            positionCode: "WR",
            years: 1,
          },
        ],
      },
      players: [
        players[0],
        {
          ...players[1],
          currentContract: {
            capHit: 2_500_000,
            signingBonus: 500_000,
            yearlySalary: 2_000_000,
            years: 1,
          },
        },
        players[3],
      ],
      salaryCapSpace: 75_000_000,
    };

    const snapshot = buildRosterContractSnapshot(team);

    expect(snapshot.capLimit).toBe(100_000_000);
    expect(snapshot.contractCount).toBe(2);
    expect(snapshot.expiringCount).toBe(1);
    expect(snapshot.expiringPlayers.map((player) => player.id)).toEqual(["wr"]);
    expect(snapshot.noContractCount).toBe(1);
    expect(snapshot.topCapPlayers.map((player) => player.id)).toEqual(["qb", "wr"]);
  });
});
