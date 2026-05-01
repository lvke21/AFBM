import { getFirebaseAdminFirestore } from "../../src/lib/firebase/admin";
import type {
  FirestoreOnlineEventDoc,
  FirestoreOnlineLeagueDoc,
  FirestoreOnlineTeamDoc,
} from "../../src/lib/online/types";
import {
  configureMultiplayerFirestoreEnvironment,
  logMultiplayerFirestoreEnvironment,
  withMultiplayerFirestoreTimeout,
} from "./multiplayer-firestore-env";

export const MULTIPLAYER_TEST_LEAGUE_ID = "afbm-multiplayer-test-league";
export const MULTIPLAYER_TEST_LEAGUE_SLUG = "afbm-multiplayer-test-league";
export const MULTIPLAYER_TEST_LEAGUE_NAME = "AFBM Multiplayer Test League";
export const MULTIPLAYER_TEST_LEAGUE_CREATED_AT = "2026-05-01T09:00:00.000Z";
export const MULTIPLAYER_TEST_LEAGUE_ADMIN_USER_ID = "server-foundation-seed";
export const MULTIPLAYER_TEST_LEAGUE_SEED_KEY = "afbm-multiplayer-foundation-v1";

export type MultiplayerTestLeagueSeedTeam = {
  id: string;
  city: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
};

export const MULTIPLAYER_TEST_LEAGUE_TEAMS: MultiplayerTestLeagueSeedTeam[] = [
  {
    id: "zurich-guardians",
    city: "Zurich",
    name: "Guardians",
    abbreviation: "ZUR",
    primaryColor: "#1D4ED8",
    secondaryColor: "#F8FAFC",
  },
  {
    id: "basel-rhinos",
    city: "Basel",
    name: "Rhinos",
    abbreviation: "BAS",
    primaryColor: "#991B1B",
    secondaryColor: "#E5E7EB",
  },
  {
    id: "geneva-falcons",
    city: "Geneva",
    name: "Falcons",
    abbreviation: "GEN",
    primaryColor: "#047857",
    secondaryColor: "#FDE68A",
  },
  {
    id: "bern-wolves",
    city: "Bern",
    name: "Wolves",
    abbreviation: "BER",
    primaryColor: "#334155",
    secondaryColor: "#FACC15",
  },
  {
    id: "lausanne-lions",
    city: "Lausanne",
    name: "Lions",
    abbreviation: "LAU",
    primaryColor: "#C2410C",
    secondaryColor: "#ECFCCB",
  },
  {
    id: "winterthur-titans",
    city: "Winterthur",
    name: "Titans",
    abbreviation: "WIN",
    primaryColor: "#0F766E",
    secondaryColor: "#CCFBF1",
  },
  {
    id: "st-gallen-bears",
    city: "St. Gallen",
    name: "Bears",
    abbreviation: "STG",
    primaryColor: "#7C2D12",
    secondaryColor: "#FED7AA",
  },
  {
    id: "lucerne-hawks",
    city: "Lucerne",
    name: "Hawks",
    abbreviation: "LUC",
    primaryColor: "#4338CA",
    secondaryColor: "#DBEAFE",
  },
];

export type MultiplayerTestLeagueSeedDocuments = {
  league: FirestoreOnlineLeagueDoc;
  teams: FirestoreOnlineTeamDoc[];
  event: FirestoreOnlineEventDoc;
};

export function buildMultiplayerTestLeagueSeedDocuments(
  now = MULTIPLAYER_TEST_LEAGUE_CREATED_AT,
): MultiplayerTestLeagueSeedDocuments {
  const maxTeams = MULTIPLAYER_TEST_LEAGUE_TEAMS.length;

  return {
    league: {
      id: MULTIPLAYER_TEST_LEAGUE_ID,
      name: MULTIPLAYER_TEST_LEAGUE_NAME,
      status: "lobby",
      createdByUserId: MULTIPLAYER_TEST_LEAGUE_ADMIN_USER_ID,
      createdAt: now,
      updatedAt: now,
      maxTeams,
      memberCount: 0,
      currentWeek: 1,
      currentSeason: 1,
      weekStatus: "pre_week",
      settings: {
        onlineBackbone: true,
        slug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
        testData: true,
        createdBySeed: true,
        foundationStatus: "draft_ready",
        seedSource: "multiplayer-test-league-firestore-seed",
        playersSeeded: false,
        draftExecuted: false,
      },
      version: 1,
    },
    teams: MULTIPLAYER_TEST_LEAGUE_TEAMS.map((team) => ({
      id: team.id,
      cityId: team.id.split("-")[0],
      cityName: team.city,
      teamNameId: team.name.toLowerCase(),
      teamName: team.name,
      displayName: `${team.city} ${team.name}`,
      contractRoster: [],
      depthChart: [],
      assignedUserId: null,
      status: "available",
      createdAt: now,
      updatedAt: now,
      abbreviation: team.abbreviation,
      branding: {
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
      },
      draftStatus: "ready",
      seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
      testData: true,
      leagueSlug: MULTIPLAYER_TEST_LEAGUE_SLUG,
      createdBySeed: true,
    }) as FirestoreOnlineTeamDoc),
    event: {
      type: "league_created",
      createdAt: now,
      createdByUserId: MULTIPLAYER_TEST_LEAGUE_ADMIN_USER_ID,
      payload: {
        source: "multiplayer-test-league-firestore-seed",
        seedKey: MULTIPLAYER_TEST_LEAGUE_SEED_KEY,
        testData: true,
        slug: MULTIPLAYER_TEST_LEAGUE_SLUG,
        teamCount: maxTeams,
        playersSeeded: false,
        draftExecuted: false,
      },
    },
  };
}

export async function seedMultiplayerTestLeague() {
  const environment = configureMultiplayerFirestoreEnvironment();
  logMultiplayerFirestoreEnvironment(environment, "seed multiplayer test league");

  const firestore = getFirebaseAdminFirestore();
  const documents = buildMultiplayerTestLeagueSeedDocuments();
  const leagueRef = firestore.collection("leagues").doc(MULTIPLAYER_TEST_LEAGUE_ID);
  const batch = firestore.batch();

  batch.set(leagueRef, documents.league, { merge: true });

  documents.teams.forEach((team) => {
    batch.set(leagueRef.collection("teams").doc(team.id), team, { merge: true });
  });

  batch.set(
    leagueRef.collection("events").doc("foundation-seed-created"),
    documents.event,
    { merge: true },
  );

  await withMultiplayerFirestoreTimeout(
    batch.commit(),
    "seed multiplayer test league",
    environment,
  );

  return {
    leagueId: MULTIPLAYER_TEST_LEAGUE_ID,
    slug: MULTIPLAYER_TEST_LEAGUE_SLUG,
    teamCount: documents.teams.length,
    status: documents.league.status,
    foundationStatus: documents.league.settings.foundationStatus,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMultiplayerTestLeague()
    .then((summary) => {
      console.log(
        `Seeded ${summary.leagueId} (${summary.slug}) with ${summary.teamCount} draft-ready teams.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
