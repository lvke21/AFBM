import { loadEnvConfig } from "@next/env";

import {
  getSaveGameFlowSnapshot,
  listSaveGames,
} from "../src/modules/savegames/application/savegame-query.service";
import {
  advanceWeekForUser,
  finishGameForUser,
  prepareWeekForUser,
  startGameForUser,
} from "../src/modules/savegames/application/week-flow.service";
import { getMatchDetailForUser } from "../src/modules/seasons/application/match-query.service";
import { getSeasonOverviewForUser } from "../src/modules/seasons/application/season-query.service";
import { getPlayerDetailForUser } from "../src/modules/players/application/player-query.service";
import { getTeamDetailForUser } from "../src/modules/teams/application/team-query.service";
import {
  type FirestoreUsageSummary,
  recordFirestoreUsage,
  withFirestoreUsageFlow,
} from "../src/server/repositories/firestoreUsageLogger";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import { readModelRepositoryFirestore } from "../src/server/repositories/readModelRepository.firestore";
import { gameOutputRepositoryFirestore } from "../src/server/repositories/gameOutputRepository.firestore";
import { statsRepositoryFirestore } from "../src/server/repositories/statsRepository.firestore";
import { resetFirestoreEmulator } from "./seeds/firestore-reset";
import { seedFirestoreEmulator } from "./seeds/firestore-seed";
import { prepareFirestoreBrowserE2eFixture } from "./seeds/firestore-browser-e2e-fixture";
import { resetAndSeedMultiplayerTestLeague } from "./seeds/multiplayer-test-league-reset-and-seed";
import { MULTIPLAYER_TEST_LEAGUE_ID } from "./seeds/multiplayer-test-league-firestore-seed";
import {
  FIRESTORE_PARITY_IDS,
  makeFirestoreMatchId,
} from "./seeds/parity-fixture";

loadEnvConfig(process.cwd());

process.env.DATA_BACKEND = "firestore";
process.env.FIREBASE_PROJECT_ID ??= "demo-afbm";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= "demo-afbm";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.USE_FIRESTORE_EMULATOR ??= "true";

const ownerId = FIRESTORE_PARITY_IDS.ownerId;
const leagueId = FIRESTORE_PARITY_IDS.leagueId;
const seasonId = FIRESTORE_PARITY_IDS.seasonId;
const teamId = "team-demo-arrows";
const playerId = "team-demo-arrows-qb";
const matchId = FIRESTORE_PARITY_IDS.firstMatchId;
const onlineLeagueId = MULTIPLAYER_TEST_LEAGUE_ID;
const onlineUserId = "firestore-usage-online-gm";
const onlineDraftInitialPlayerLimit = 120;

type MeasuredFlow = FirestoreUsageSummary & {
  notes?: string;
};

async function measure(flow: string, callback: () => Promise<unknown>, notes?: string) {
  const { summary } = await withFirestoreUsageFlow(flow, callback);
  return {
    ...summary,
    notes,
  } satisfies MeasuredFlow;
}

type FirestoreReadableQuery = {
  get(): Promise<{
    docs?: unknown[];
    empty?: boolean;
    exists?: boolean;
    size?: number;
  }>;
};

async function measuredGetDoc(
  query: FirestoreReadableQuery,
  collection: string,
  queryLabel = "doc",
) {
  const snapshot = await query.get();
  const exists = snapshot.exists === true || (snapshot.exists === undefined && !snapshot.empty);

  recordFirestoreUsage({
    collection,
    count: exists ? 1 : 0,
    operation: "read",
    query: queryLabel,
  });

  return snapshot;
}

async function measuredGetCollection(
  query: FirestoreReadableQuery,
  collection: string,
  queryLabel = "collection",
) {
  const snapshot = await query.get();

  recordFirestoreUsage({
    collection,
    count: snapshot.size ?? snapshot.docs?.length ?? 0,
    operation: "read",
    query: queryLabel,
  });

  return snapshot;
}

async function runMeasurements() {
  console.log("Preparing Firestore emulator seed for usage measurement...");
  await resetFirestoreEmulator();
  await seedFirestoreEmulator();
  await prepareFirestoreBrowserE2eFixture();
  await resetAndSeedMultiplayerTestLeague();

  process.env.FIRESTORE_USAGE_LOGGING = "true";

  const flows: MeasuredFlow[] = [];

  flows.push(await measure("SaveGame entry", async () => {
    await listSaveGames(ownerId);
    await getSaveGameFlowSnapshot(ownerId, leagueId);
  }, "Represents /app redirect plus dashboard SaveGame shell."));

  flows.push(await measure("Team Overview", async () => {
    await getTeamDetailForUser(ownerId, leagueId, teamId);
    await readModelRepositoryFirestore.getTeamOverview(ownerId, leagueId, teamId);
  }));

  flows.push(await measure("Roster", async () => {
    await getTeamDetailForUser(ownerId, leagueId, teamId);
  }, "Canonical roster page currently loads full team detail."));

  flows.push(await measure("Player Detail", async () => {
    await getPlayerDetailForUser(ownerId, leagueId, playerId);
    await readModelRepositoryFirestore.getPlayerOverview(ownerId, leagueId, playerId);
  }));

  flows.push(await measure("Season Overview", async () => {
    await getSeasonOverviewForUser(ownerId, leagueId, seasonId);
  }));

  flows.push(await measure("Match Detail", async () => {
    await getMatchDetailForUser(ownerId, leagueId, matchId);
    await readModelRepositoryFirestore.getMatchSummary(ownerId, leagueId, matchId);
  }));

  flows.push(await measure("Stats Views", async () => {
    await readModelRepositoryFirestore.getStatsViews(ownerId, leagueId, seasonId);
  }, "Season-scoped aggregate read."));

  flows.push(await measure("Reports", async () => {
    await readModelRepositoryFirestore.listReports(ownerId, leagueId);
  }));

  flows.push(await measure("Week Prepare", async () => {
    await prepareWeekForUser({ saveGameId: leagueId, userId: ownerId });
  }));

  flows.push(await measure("Match Start", async () => {
    await startGameForUser({ matchId, saveGameId: leagueId, userId: ownerId });
  }));

  flows.push(await measure("Game Finish", async () => {
    await finishGameForUser({ matchId, saveGameId: leagueId, userId: ownerId });
  }, "Week 1 side matches are pre-completed by the browser fixture."));

  flows.push(await measure("Game Output + Stats Persist", async () => {
    const context = buildSyntheticSimulationContext(makeFirestoreMatchId(2, 1));
    const result = buildSyntheticSimulationResult(context.matchId);

    await gameOutputRepositoryFirestore.persistMatchOutput({ context, result });
    await statsRepositoryFirestore.persistMatchStats({ context, result });
  }, "Synthetic non-production result against seeded week-2 match; measures gameEvents and stats aggregate writes."));

  flows.push(await measure("Week Advance", async () => {
    await advanceWeekForUser({ saveGameId: leagueId, userId: ownerId });
  }));

  flows.push(await measure("Next Week Return", async () => {
    await getSaveGameFlowSnapshot(ownerId, leagueId);
    await getMatchDetailForUser(ownerId, leagueId, makeFirestoreMatchId(2, 1));
  }));

  flows.push(await measure("Online Dashboard", async () => {
    const firestore = getFirebaseAdminFirestore();
    const lobbySnapshot = await measuredGetCollection(
      firestore
        .collection("leagues")
        .where("status", "==", "lobby")
        .where("settings.onlineBackbone", "==", true),
      "leagues",
      "online-dashboard-lobbies",
    );
    const mirrorSnapshot = await measuredGetCollection(
      firestore
        .collection("leagueMembers")
        .where("userId", "==", onlineUserId)
        .where("status", "==", "ACTIVE"),
      "leagueMembers",
      "online-dashboard-user-mirror-index",
    );

    await Promise.all(
      (mirrorSnapshot.docs ?? []).map(async (document) => {
        const leagueIdFromMirror = (document as { data(): { leagueId?: unknown } }).data().leagueId;

        if (typeof leagueIdFromMirror !== "string") {
          return;
        }

        await measuredGetDoc(
          firestore
            .collection("leagues")
            .doc(leagueIdFromMirror)
            .collection("memberships")
            .doc(onlineUserId),
          "leagues/{leagueId}/memberships",
          "online-dashboard-membership-canonical-check",
        );
      }),
    );

    await Promise.all(
      (lobbySnapshot.docs ?? []).map(async (document) => {
        await measuredGetCollection(
          firestore.collection("leagues").doc((document as { id: string }).id).collection("teams"),
          "leagues/{leagueId}/teams",
          "online-dashboard-public-lobby-teams",
        );
      }),
    );
  }, "Represents online landing/dashboard discovery: lobby query, user mirror index, canonical membership validation, public team summaries."));

  flows.push(await measure("Online League Load", async () => {
    await measureOnlineLeagueSnapshot(onlineLeagueId, "online-league-load", {
      includeDraftPlayerPool: false,
    });
  }, "Represents FirebaseOnlineLeagueRepository league-core snapshot for /online/league/[leagueId]; Draft available players are intentionally not loaded outside the Draft route."));

  flows.push(await measure("Online Draft", async () => {
    const firestore = getFirebaseAdminFirestore();
    const leagueRef = firestore.collection("leagues").doc(onlineLeagueId);
    const draftRef = leagueRef.collection("draft").doc("main");

    await measuredGetDoc(draftRef, "leagues/{leagueId}/draft", "online-draft-main-doc");
    await measuredGetCollection(
      draftRef.collection("picks"),
      "leagues/{leagueId}/draft/main/picks",
      "online-draft-picks",
    );
    await measuredGetCollection(
      draftRef.collection("availablePlayers").limit(onlineDraftInitialPlayerLimit),
      "leagues/{leagueId}/draft/main/availablePlayers",
      "online-draft-available-players",
    );
  }, `Draft route initial load: Draft Doc, Pick Docs, and first ${onlineDraftInitialPlayerLimit} Available-Player Docs.`));

  return flows;
}

async function measureOnlineLeagueSnapshot(
  leagueIdForMeasurement: string,
  queryPrefix: string,
  options: { includeDraftPlayerPool?: boolean } = {},
) {
  const firestore = getFirebaseAdminFirestore();
  const leagueRef = firestore.collection("leagues").doc(leagueIdForMeasurement);
  const draftRef = leagueRef.collection("draft").doc("main");

  await Promise.all([
    measuredGetDoc(leagueRef, "leagues", `${queryPrefix}-league-doc`),
    measuredGetCollection(
      leagueRef.collection("memberships"),
      "leagues/{leagueId}/memberships",
      `${queryPrefix}-memberships`,
    ),
    measuredGetCollection(
      leagueRef.collection("teams"),
      "leagues/{leagueId}/teams",
      `${queryPrefix}-teams`,
    ),
    measuredGetCollection(
      leagueRef.collection("events").orderBy("createdAt", "desc").limit(20),
      "leagues/{leagueId}/events",
      `${queryPrefix}-events-limit-20`,
    ),
    measuredGetDoc(draftRef, "leagues/{leagueId}/draft", `${queryPrefix}-draft-doc`),
    measuredGetCollection(
      draftRef.collection("picks"),
      "leagues/{leagueId}/draft/main/picks",
      `${queryPrefix}-draft-picks`,
    ),
    options.includeDraftPlayerPool === false
      ? Promise.resolve()
      : measuredGetCollection(
          draftRef.collection("availablePlayers"),
          "leagues/{leagueId}/draft/main/availablePlayers",
          `${queryPrefix}-draft-available-players`,
        ),
  ]);
}

function buildSyntheticSimulationContext(matchIdForContext: string) {
  return {
    awayTeam: {
      abbreviation: "CHI",
      city: "Chicago",
      id: "team-demo-comets",
      nickname: "Comets",
      overallRating: 76,
      roster: [syntheticPlayer("team-demo-comets-qb", "team-demo-comets", "QB", "Comets")],
    },
    homeTeam: {
      abbreviation: "BOS",
      city: "Boston",
      id: "team-demo-bison",
      nickname: "Bison",
      overallRating: 75,
      roster: [syntheticPlayer("team-demo-bison-qb", "team-demo-bison", "QB", "Bison")],
    },
    kind: "REGULAR_SEASON" as const,
    matchId: matchIdForContext,
    saveGameId: leagueId,
    scheduledAt: new Date("2026-09-02T18:00:00.000Z"),
    seasonId,
    seasonYear: 2026,
    simulationSeed: "cost-measurement-synthetic",
    week: 2,
  };
}

function syntheticPlayer(id: string, teamId: string, positionCode: string, lastName: string) {
  return {
    age: 25,
    attributes: {},
    captainFlag: positionCode === "QB",
    careerStat: null,
    depthChartSlot: 1,
    developmentFocus: false,
    developmentTrait: "NORMAL",
    fatigue: 0,
    firstName: positionCode,
    gameDayAvailability: "ACTIVE" as const,
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    id,
    injuryEndsOn: null,
    injuryName: null,
    injuryRisk: 0,
    injuryStatus: "HEALTHY",
    lastName,
    mentalOverall: 75,
    morale: 75,
    offensiveOverall: 75,
    physicalOverall: 75,
    positionCode,
    positionOverall: 75,
    potentialRating: 80,
    rosterStatus: "STARTER",
    seasonStat: null,
    secondaryPositionCode: null,
    specialTeamsOverall: null,
    status: "ACTIVE",
    teamId,
    defensiveOverall: null,
  };
}

function emptyPlayerLine(playerId: string, teamId: string) {
  return {
    blocking: {
      pancakes: 0,
      passBlockSnaps: 0,
      pressuresAllowed: 0,
      runBlockSnaps: 0,
      sacksAllowed: 0,
    },
    defensive: {
      assistedTackles: 0,
      coverageSnaps: 0,
      defensiveTouchdowns: 0,
      forcedFumbles: 0,
      fumbleRecoveries: 0,
      interceptions: 0,
      passesDefended: 0,
      quarterbackHits: 0,
      receptionsAllowed: 0,
      sacks: 0,
      tackles: 0,
      tacklesForLoss: 0,
      targetsAllowed: 0,
      yardsAllowed: 0,
    },
    kicking: {
      extraPointsAttempted: 0,
      extraPointsMade: 0,
      fieldGoalsAttempted: 0,
      fieldGoalsAttemptedLong: 0,
      fieldGoalsAttemptedMid: 0,
      fieldGoalsAttemptedShort: 0,
      fieldGoalsMade: 0,
      fieldGoalsMadeLong: 0,
      fieldGoalsMadeMid: 0,
      fieldGoalsMadeShort: 0,
      kickoffTouchbacks: 0,
      longestFieldGoal: 0,
    },
    passing: {
      attempts: 25,
      completions: 16,
      interceptions: 1,
      longestCompletion: 34,
      sackYardsLost: 12,
      sacksTaken: 2,
      touchdowns: 2,
      yards: 214,
    },
    playerId,
    punting: {
      fairCatchesForced: 0,
      hangTimeTotalTenths: 0,
      longestPunt: 0,
      netPuntYards: 0,
      puntYards: 0,
      punts: 0,
      puntsInside20: 0,
      touchbacks: 0,
    },
    receiving: {
      drops: 0,
      longestReception: 0,
      receptions: 0,
      targets: 0,
      touchdowns: 0,
      yards: 0,
      yardsAfterCatch: 0,
    },
    returns: {
      kickReturnFumbles: 0,
      kickReturnTouchdowns: 0,
      kickReturnYards: 0,
      kickReturns: 0,
      puntReturnFumbles: 0,
      puntReturnTouchdowns: 0,
      puntReturnYards: 0,
      puntReturns: 0,
    },
    rushing: {
      attempts: 2,
      brokenTackles: 0,
      fumbles: 0,
      longestRush: 8,
      touchdowns: 0,
      yards: 11,
    },
    snapsDefense: 0,
    snapsOffense: 54,
    snapsSpecialTeams: 0,
    started: true,
    teamId,
  };
}

function buildSyntheticSimulationResult(matchIdForResult: string) {
  return {
    awayScore: 17,
    awayTeam: {
      explosivePlays: 3,
      firstDowns: 18,
      passingYards: 188,
      penalties: 5,
      redZoneTouchdowns: 2,
      redZoneTrips: 3,
      rushingYards: 94,
      sacks: 1,
      score: 17,
      teamId: "team-demo-comets",
      timeOfPossessionSeconds: 1680,
      totalYards: 282,
      touchdowns: 2,
      turnovers: 2,
    },
    drives: [1, 2, 3, 4].map((sequence) => ({
      aggressiveGoForItResolution: null,
      coachingRiskProfile: null,
      defenseTeamAbbreviation: sequence % 2 === 0 ? "BOS" : "CHI",
      defenseTeamId: sequence % 2 === 0 ? "team-demo-bison" : "team-demo-comets",
      endedAwayScore: sequence >= 3 ? 17 : 10,
      endedHomeScore: sequence >= 4 ? 24 : 14,
      fourthDownAttempts: null,
      fourthDownBallPosition: null,
      fourthDownDecision: null,
      fourthDownDistance: null,
      fourthDownScoreDelta: null,
      fourthDownSecondsRemaining: null,
      highestReachedFieldPosition: null,
      offenseTeamAbbreviation: sequence % 2 === 0 ? "CHI" : "BOS",
      offenseTeamId: sequence % 2 === 0 ? "team-demo-comets" : "team-demo-bison",
      opp35To20FinishResult: null,
      passAttempts: 4,
      phaseLabel: `Q${Math.ceil(sequence / 1)}`,
      plays: 7,
      playsAfterConvert: null,
      playsAfterOpp35To20Entry: null,
      pointsScored: sequence % 2 === 0 ? 3 : 7,
      postConvertEnteredOpp35To20: null,
      postConvertOriginatedOpp35To20: null,
      postFourthDownConverted: null,
      postFourthDownYards: null,
      primaryDefenderName: null,
      primaryPlayerName: "QB Bison",
      redZoneTrip: sequence % 2 === 1,
      resultType: sequence % 2 === 0 ? "FIELD_GOAL" : "TOUCHDOWN",
      rushAttempts: 3,
      sequence,
      softFailCount: null,
      startFieldPosition: null,
      startSecondsRemainingInGame: null,
      startedAwayScore: 0,
      startedHomeScore: 0,
      summary: `Synthetic drive ${sequence}`,
      targetedAggressiveGoForIt: null,
      terminalPlayDistance: null,
      totalYards: 55,
      turnover: false,
    })),
    homeScore: 24,
    homeTeam: {
      explosivePlays: 4,
      firstDowns: 21,
      passingYards: 214,
      penalties: 4,
      redZoneTouchdowns: 3,
      redZoneTrips: 4,
      rushingYards: 121,
      sacks: 2,
      score: 24,
      teamId: "team-demo-bison",
      timeOfPossessionSeconds: 1920,
      totalYards: 335,
      touchdowns: 3,
      turnovers: 1,
    },
    matchId: matchIdForResult,
    playerLines: [
      emptyPlayerLine("team-demo-bison-qb", "team-demo-bison"),
      emptyPlayerLine("team-demo-comets-qb", "team-demo-comets"),
    ],
    simulationSeed: "cost-measurement-synthetic",
    totalDrivesPlanned: 4,
  };
}

function printSummary(flows: MeasuredFlow[]) {
  console.log("\nFirestore usage by flow:");
  console.table(
    flows.map((flow) => ({
      deletes: flow.deletes,
      flow: flow.flow,
      reads: flow.reads,
      writes: flow.writes,
    })),
  );

  const totals = flows.reduce(
    (sum, flow) => ({
      deletes: sum.deletes + flow.deletes,
      reads: sum.reads + flow.reads,
      writes: sum.writes + flow.writes,
    }),
    { deletes: 0, reads: 0, writes: 0 },
  );

  console.log("\nTotals:");
  console.log(JSON.stringify(totals, null, 2));
  console.log("\nDetailed JSON:");
  console.log(JSON.stringify(flows, null, 2));
}

void runMeasurements()
  .then(printSummary)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
