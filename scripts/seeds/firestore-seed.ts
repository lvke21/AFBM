import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";

import {
  FIRESTORE_PARITY_IDS,
  FIRESTORE_PARITY_TEAM_TEMPLATES,
  makeFirestoreMatchId,
  makeFirestoreWeekId,
  PARITY_EXPECTED_COUNTS,
  PARITY_POSITION_TEMPLATES,
} from "./parity-fixture";

type SeedDocument = {
  collection: SeedCollection;
  id: string;
  data: Record<string, unknown>;
};

export const FIRESTORE_SEED_PROJECT_ID = "demo-afbm";
export const FIRESTORE_SEED_EMULATOR_HOST = "127.0.0.1:8080";
export const FIRESTORE_EMULATOR_OPERATION_TIMEOUT_MS = 10_000;

export const FIRESTORE_SEED_COLLECTIONS = [
  "users",
  "leagues",
  "leagueMembers",
  "teams",
  "players",
  "seasons",
  "weeks",
  "matches",
  "gameEvents",
  "playerStats",
  "teamStats",
  "reports",
] as const;

type SeedCollection = (typeof FIRESTORE_SEED_COLLECTIONS)[number];

const ownerId = FIRESTORE_PARITY_IDS.ownerId;
const leagueId = FIRESTORE_PARITY_IDS.leagueId;
const seasonId = FIRESTORE_PARITY_IDS.seasonId;
const createdAt = new Date("2026-04-26T09:00:00.000Z");
const updatedAt = createdAt;
const teamTemplates = FIRESTORE_PARITY_TEAM_TEMPLATES;
const positionTemplates = PARITY_POSITION_TEMPLATES;

export function ensureFirestoreEmulatorEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  env.FIREBASE_PROJECT_ID ??= FIRESTORE_SEED_PROJECT_ID;
  env.FIRESTORE_EMULATOR_HOST ??= FIRESTORE_SEED_EMULATOR_HOST;

  const emulatorHost = env.FIRESTORE_EMULATOR_HOST ?? env.FIREBASE_EMULATOR_HOST;
  const projectId = env.FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!emulatorHost) {
    throw new Error(
      "Refusing to seed Firestore without FIRESTORE_EMULATOR_HOST or FIREBASE_EMULATOR_HOST.",
    );
  }

  if (!projectId || !projectId.startsWith("demo-")) {
    throw new Error(
      `Refusing to seed Firestore project "${projectId ?? "<missing>"}". Use a demo-* emulator project.`,
    );
  }
}

export function buildFirestoreSeedDocuments(): SeedDocument[] {
  const documents: SeedDocument[] = [
    {
      collection: "users",
      id: ownerId,
      data: {
        createdAt,
        defaultLeagueId: leagueId,
        displayName: "Firebase E2E Owner",
        email: "firebase-owner@example.test",
        id: ownerId,
        lastActiveLeagueId: leagueId,
        updatedAt,
      },
    },
    {
      collection: "leagues",
      id: leagueId,
      data: {
        counts: {
          matchCount: PARITY_EXPECTED_COUNTS.matches,
          playerCount: PARITY_EXPECTED_COUNTS.players,
          teamCount: PARITY_EXPECTED_COUNTS.teams,
        },
        createdAt,
        currentSeasonId: seasonId,
        currentSeasonSnapshot: {
          phase: "REGULAR_SEASON",
          weekNumber: 1,
          year: 2026,
        },
        currentWeekId: FIRESTORE_PARITY_IDS.firstWeekId,
        id: leagueId,
        leagueDefinitionSnapshot: {
          code: "DEMO",
          name: "Firebase Demo League",
        },
        managerTeamId: teamTemplates[0][0],
        name: "Firebase Demo League 2026",
        ownerId,
        settings: {
          activeRosterLimit: 53,
          practiceSquadSize: 16,
          salaryCapCents: 255_400_000_00,
          seasonLengthWeeks: 7,
        },
        status: "ACTIVE",
        updatedAt,
        weekState: "READY",
      },
    },
    {
      collection: "leagueMembers",
      id: `${leagueId}_${ownerId}`,
      data: {
        createdAt,
        id: `${leagueId}_${ownerId}`,
        leagueId,
        leagueSnapshot: {
          currentSeasonLabel: "2026 Week 1",
          name: "Firebase Demo League 2026",
          status: "ACTIVE",
          updatedAt,
          weekState: "READY",
        },
        role: "OWNER",
        status: "ACTIVE",
        teamId: teamTemplates[0][0],
        teamSnapshot: makeTeamSnapshot(teamTemplates[0]),
        updatedAt,
        userId: ownerId,
      },
    },
    {
      collection: "seasons",
      id: seasonId,
      data: {
        createdAt,
        currentWeekNumber: 1,
        id: seasonId,
        leagueId,
        phase: "REGULAR_SEASON",
        regularSeasonWeeks: 7,
        status: "ACTIVE",
        updatedAt,
        year: 2026,
      },
    },
    {
      collection: "reports",
      id: `${leagueId}_seed_readiness`,
      data: {
        createdAt,
        id: `${leagueId}_seed_readiness`,
        leagueId,
        payload: {
          summary: "Seed data created for Firestore emulator validation.",
          teamCount: teamTemplates.length,
        },
        title: "Firebase seed readiness",
        type: "QA",
        updatedAt,
      },
    },
  ];

  for (const [index, team] of teamTemplates.entries()) {
    documents.push(makeTeamDocument(team, index));
    documents.push(makeTeamStatDocument(team, index));
  }

  for (const [teamIndex, team] of teamTemplates.entries()) {
    for (const [positionIndex, position] of positionTemplates.entries()) {
      documents.push(makePlayerDocument(team, position, teamIndex, positionIndex));
      documents.push(makePlayerStatDocument(team, position, teamIndex, positionIndex));
    }
  }

  for (let weekNumber = 1; weekNumber <= 7; weekNumber += 1) {
    const weekId = makeFirestoreWeekId(weekNumber);
    documents.push({
      collection: "weeks",
      id: weekId,
      data: {
        createdAt,
        id: weekId,
        leagueId,
        seasonId,
        state: weekNumber === 1 ? "READY" : "PRE_WEEK",
        updatedAt,
        weekNumber,
      },
    });

    for (let matchIndex = 0; matchIndex < teamTemplates.length / 2; matchIndex += 1) {
      const homeTeam = teamTemplates[(matchIndex * 2 + weekNumber - 1) % teamTemplates.length];
      const awayTeam = teamTemplates[(matchIndex * 2 + 1 + weekNumber - 1) % teamTemplates.length];
      const matchId = makeFirestoreMatchId(weekNumber, matchIndex + 1);
      documents.push({
        collection: "matches",
        id: matchId,
        data: {
          awayScore: null,
          awayTeamId: awayTeam[0],
          awayTeamSnapshot: makeTeamSnapshot(awayTeam),
          createdAt,
          homeScore: null,
          homeTeamId: homeTeam[0],
          homeTeamSnapshot: makeTeamSnapshot(homeTeam),
          id: matchId,
          kind: "REGULAR_SEASON",
          leagueId,
          scheduledAt: new Date(Date.UTC(2026, 8, weekNumber, 18 + matchIndex, 0, 0)),
          seasonId,
          status: "SCHEDULED",
          updatedAt,
          weekId,
          weekNumber,
        },
      });
    }
  }

  return documents;
}

export async function seedFirestoreEmulator() {
  ensureFirestoreEmulatorEnvironment();
  const firestore = getFirebaseAdminFirestore();
  const documents = buildFirestoreSeedDocuments();
  const batch = firestore.batch();

  for (const seedDocument of documents) {
    batch.set(
      firestore.collection(seedDocument.collection).doc(seedDocument.id),
      seedDocument.data,
    );
  }

  await withEmulatorOperationTimeout(batch.commit(), "seed Firestore emulator");
  return summarizeSeedDocuments(documents);
}

export async function withEmulatorOperationTimeout<T>(
  operation: Promise<T>,
  label: string,
  timeoutMs = FIRESTORE_EMULATOR_OPERATION_TIMEOUT_MS,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms while trying to ${label}. Is the Firestore emulator running at ${process.env.FIRESTORE_EMULATOR_HOST ?? process.env.FIREBASE_EMULATOR_HOST ?? FIRESTORE_SEED_EMULATOR_HOST}?`,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function summarizeSeedDocuments(documents: SeedDocument[]) {
  return FIRESTORE_SEED_COLLECTIONS.reduce<Record<SeedCollection, number>>(
    (summary, collection) => {
      summary[collection] = documents.filter((document) => document.collection === collection).length;
      return summary;
    },
    {} as Record<SeedCollection, number>,
  );
}

function makeTeamDocument(team: (typeof teamTemplates)[number], index: number): SeedDocument {
  const [teamId, city, nickname, abbreviation] = team;

  return {
    collection: "teams",
    id: teamId,
    data: {
      abbreviation,
      cashBalanceCents: 75_000_000_00 + index * 1_000_000_00,
      city,
      conferenceSnapshot: {
        code: index < 4 ? "AFC" : "NFC",
        id: index < 4 ? "conference-afc" : "conference-nfc",
        name: index < 4 ? "American Football Conference" : "National Football Conference",
      },
      createdAt,
      divisionSnapshot: {
        code: index % 2 === 0 ? "NORTH" : "SOUTH",
        id: index % 2 === 0 ? "division-north" : "division-south",
        name: index % 2 === 0 ? "North" : "South",
      },
      franchiseTemplateId: `franchise-template-${abbreviation.toLowerCase()}`,
      id: teamId,
      leagueId,
      managerControlled: index === 0,
      morale: 70 + index,
      nickname,
      overallRating: 74 + index,
      ownerUserId: index === 0 ? ownerId : null,
      rosterCounts: {
        active: positionTemplates.length,
        injuredReserve: 0,
        practiceSquad: 0,
        total: positionTemplates.length,
      },
      salaryCapSpaceCents: 38_000_000_00 - index * 800_000_00,
      schemes: {
        defense: { code: "4-3", id: "scheme-defense-43", name: "4-3 Base" },
        offense: { code: "PRO", id: "scheme-offense-pro", name: "Pro Style" },
        specialTeams: { code: "BAL", id: "scheme-special-balanced", name: "Balanced" },
      },
      updatedAt,
    },
  };
}

function makePlayerDocument(
  team: (typeof teamTemplates)[number],
  position: (typeof positionTemplates)[number],
  teamIndex: number,
  positionIndex: number,
): SeedDocument {
  const [teamId] = team;
  const [positionCode, positionName, positionGroupCode] = position;
  const playerId = makePlayerId(team, position);
  const fullName = `${positionCode} ${team[2]} ${positionIndex + 1}`;
  const rating = 68 + ((teamIndex + positionIndex) % 18);

  return {
    collection: "players",
    id: playerId,
    data: {
      age: 22 + ((teamIndex + positionIndex) % 11),
      attributes: {
        agility: rating,
        awareness: rating + 1,
        strength: rating - 2,
        speed: rating + 2,
      },
      condition: {
        fatigue: 0,
        morale: 70 + teamIndex,
      },
      createdAt,
      developmentTrait: positionIndex % 5 === 0 ? "IMPACT" : "NORMAL",
      evaluation: {
        defensiveOverall: positionGroupCode === "DEFENSE" ? rating : null,
        mentalOverall: rating,
        offensiveOverall: positionGroupCode === "OFFENSE" ? rating : null,
        physicalOverall: rating,
        positionOverall: rating,
        potentialRating: rating + 7,
        specialTeamsOverall: null,
      },
      firstName: positionCode,
      fullName,
      heightCm: 182 + positionIndex,
      id: playerId,
      injury: {
        endsOn: null,
        name: null,
        status: "HEALTHY",
      },
      lastName: `${team[2]} ${positionIndex + 1}`,
      leagueId,
      roster: {
        captainFlag: positionCode === "QB",
        depthChartSlot: 1,
        developmentFocus: positionIndex === 0,
        practiceSquadEligible: true,
        primaryPosition: {
          code: positionCode,
          id: `position-${positionCode.toLowerCase()}`,
          name: positionName,
        },
        positionGroup: {
          code: positionGroupCode,
          id: `position-group-${positionGroupCode.toLowerCase()}`,
          name: positionGroupCode === "OFFENSE" ? "Offense" : "Defense",
        },
        rosterStatus: positionIndex < 4 ? "STARTER" : "ROTATION",
        schemeFit: null,
        secondaryPosition: null,
        teamId,
        teamSnapshot: makeTeamSnapshot(team),
      },
      status: "ACTIVE",
      updatedAt,
      weightKg: 90 + positionIndex * 3,
      yearsPro: (teamIndex + positionIndex) % 8,
    },
  };
}

function makePlayerStatDocument(
  team: (typeof teamTemplates)[number],
  position: (typeof positionTemplates)[number],
  teamIndex: number,
  positionIndex: number,
): SeedDocument {
  const playerId = makePlayerId(team, position);
  const [teamId] = team;
  const [positionCode] = position;
  const id = `season_${seasonId}_${playerId}_${teamId}`;

  return {
    collection: "playerStats",
    id,
    data: {
      createdAt,
      id,
      leagueId,
      playerId,
      playerSnapshot: {
        fullName: `${positionCode} ${team[2]} ${positionIndex + 1}`,
        playerId,
        positionCode,
        teamAbbreviation: team[3],
        teamId,
      },
      scope: "SEASON",
      seasonId,
      seasonYear: 2026,
      stats: {
        gamesPlayed: 0,
        tackles: positionIndex >= 5 ? teamIndex + positionIndex : 0,
        touchdowns: positionIndex < 4 ? teamIndex : 0,
        yards: positionIndex < 4 ? (teamIndex + 1) * 25 : 0,
      },
      teamId,
      teamSnapshot: makeTeamSnapshot(team),
      updatedAt,
    },
  };
}

function makeTeamStatDocument(team: (typeof teamTemplates)[number], index: number): SeedDocument {
  const [teamId] = team;
  const id = `season_${seasonId}_${teamId}`;

  return {
    collection: "teamStats",
    id,
    data: {
      createdAt,
      id,
      leagueId,
      losses: 0,
      pointsAgainst: 0,
      pointsFor: 0,
      scope: "SEASON",
      seasonId,
      seasonYear: 2026,
      teamId,
      teamSnapshot: makeTeamSnapshot(team),
      ties: 0,
      updatedAt,
      wins: index === 0 ? 1 : 0,
    },
  };
}

function makePlayerId(
  team: (typeof teamTemplates)[number],
  position: (typeof positionTemplates)[number],
) {
  return `${team[0]}-${position[0].toLowerCase()}`;
}

function makeTeamSnapshot(team: (typeof teamTemplates)[number]) {
  const [teamId, city, nickname, abbreviation] = team;

  return {
    abbreviation,
    city,
    nickname,
    teamId,
  };
}

async function main() {
  const summary = await seedFirestoreEmulator();

  console.log("Seeded Firestore emulator collections:");
  for (const collection of FIRESTORE_SEED_COLLECTIONS) {
    console.log(`- ${collection}: ${summary[collection]}`);
  }
}

if (process.argv[1]?.endsWith("firestore-seed.ts")) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
