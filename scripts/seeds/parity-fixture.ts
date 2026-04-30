export const PARITY_TEST_EMAIL = process.env.E2E_USER_EMAIL ?? "e2e-gm@example.test";
export const PARITY_TEST_PASSWORD = process.env.E2E_USER_PASSWORD ?? "e2e-password";

export const PRISMA_PARITY_IDS = {
  managerTeamId: "e2e-team-bos",
  opponentTeamId: "e2e-team-nyt",
  draftClassId: "e2e-draft-class-2027",
  nextWeekMatchId: "e2e-match-week-2",
  saveGameId: process.env.E2E_SAVEGAME_ID ?? "e2e-savegame-minimal",
  seasonId: "e2e-season-2026",
  upcomingMatchId: "e2e-match-week-1",
  userId: process.env.E2E_USER_ID ?? `dev-user:${PARITY_TEST_EMAIL}`,
} as const;

export const FIRESTORE_PARITY_IDS = {
  firstMatchId: "league-demo-2026_season-demo-2026_w1_m1",
  firstWeekId: "league-demo-2026_season-demo-2026_w1",
  leagueId: "league-demo-2026",
  nextWeekId: "league-demo-2026_season-demo-2026_w2",
  ownerId: "firebase-e2e-owner",
  seasonId: "season-demo-2026",
} as const;

export const PARITY_EXPECTED_COUNTS = {
  gameEvents: 0,
  leagueMembers: 1,
  leagues: 1,
  matches: 28,
  players: 64,
  playerStats: 64,
  reports: 1,
  seasons: 1,
  teams: 8,
  teamStats: 8,
  users: 1,
  weeks: 7,
} as const;

export const FIRESTORE_PARITY_TEAM_TEMPLATES = [
  ["team-demo-arrows", "Austin", "Arrows", "AUS"],
  ["team-demo-bison", "Boston", "Bison", "BOS"],
  ["team-demo-comets", "Chicago", "Comets", "CHI"],
  ["team-demo-dragons", "Denver", "Dragons", "DEN"],
  ["team-demo-eagles", "El Paso", "Eagles", "ELP"],
  ["team-demo-falcons", "Fresno", "Falcons", "FRE"],
  ["team-demo-guardians", "Georgia", "Guardians", "GEO"],
  ["team-demo-hawks", "Houston", "Hawks", "HOU"],
] as const;

export const PARITY_POSITION_TEMPLATES = [
  ["QB", "Quarterback", "OFFENSE"],
  ["RB", "Running Back", "OFFENSE"],
  ["WR", "Wide Receiver", "OFFENSE"],
  ["TE", "Tight End", "OFFENSE"],
  ["OT", "Offensive Tackle", "OFFENSE"],
  ["EDGE", "Edge Rusher", "DEFENSE"],
  ["LB", "Linebacker", "DEFENSE"],
  ["CB", "Cornerback", "DEFENSE"],
] as const;

export const PARITY_FIXTURE_MAPPING = {
  note: "Prisma E2E bleibt eine minimale Browser-Fixture; Firestore bleibt eine vollständige 8-Team-Emulator-Fixture. Dieses Mapping macht die fachlich vergleichbaren Einstiegspunkte explizit.",
  managerTeam: {
    firestoreId: FIRESTORE_PARITY_TEAM_TEMPLATES[0][0],
    prismaId: PRISMA_PARITY_IDS.managerTeamId,
  },
  nextWeekMatch: {
    firestoreId: "league-demo-2026_season-demo-2026_w2_m1",
    prismaId: PRISMA_PARITY_IDS.nextWeekMatchId,
  },
  opponentTeam: {
    firestoreId: FIRESTORE_PARITY_TEAM_TEMPLATES[1][0],
    prismaId: PRISMA_PARITY_IDS.opponentTeamId,
  },
  season: {
    firestoreId: FIRESTORE_PARITY_IDS.seasonId,
    prismaId: PRISMA_PARITY_IDS.seasonId,
  },
  upcomingMatch: {
    firestoreId: FIRESTORE_PARITY_IDS.firstMatchId,
    prismaId: PRISMA_PARITY_IDS.upcomingMatchId,
  },
  user: {
    firestoreId: FIRESTORE_PARITY_IDS.ownerId,
    prismaId: PRISMA_PARITY_IDS.userId,
  },
} as const;

export const PARITY_TEST_MATRIX = [
  {
    area: "Seed-Daten",
    firestoreCheck: "Counts und stabile Firestore-IDs aus scripts/seeds/firestore-verify.ts",
    prismaCheck: "npm run test:e2e:seed erzeugt Prisma-Minimal-Fixture",
  },
  {
    area: "Team Overview",
    firestoreCheck: "readModelRepositoryFirestore.getTeamOverview",
    prismaCheck: "Dashboard/Team-Route liest Manager-Team aus Prisma-SaveGame",
  },
  {
    area: "Player/Roster",
    firestoreCheck: "readModelRepositoryFirestore.getPlayerOverview und Team-Roster-Reads",
    prismaCheck: "Team-/Player-Routen lesen Prisma-RosterProfile",
  },
  {
    area: "Season Overview",
    firestoreCheck: "getSeasonOverviewForUser mit DATA_BACKEND=firestore",
    prismaCheck: "getSeasonOverviewForUser mit Prisma-Default",
  },
  {
    area: "Match Detail",
    firestoreCheck: "getMatchDetailForUser mit Firestore GameOutput/Stats",
    prismaCheck: "Match-/Game-Report gegen Prisma-Fixture",
  },
  {
    area: "Week Loop",
    firestoreCheck: "prepare/start/finish/advance gegen Firestore Emulator",
    prismaCheck: "week-flow.service.test.ts und E2E week-loop gegen Prisma",
  },
  {
    area: "Stats",
    firestoreCheck: "teamStats/playerStats Match- und Season-Aggregates",
    prismaCheck: "Prisma Match-/Season-/Career-Stats soweit Fixture vorhanden",
  },
  {
    area: "Reports",
    firestoreCheck: "readModelRepositoryFirestore.listReports und Match Summary",
    prismaCheck: "App-/Game-Report aus Prisma-Readpfaden",
  },
] as const;

export function makeFirestoreWeekId(weekNumber: number) {
  return `${FIRESTORE_PARITY_IDS.leagueId}_${FIRESTORE_PARITY_IDS.seasonId}_w${weekNumber}`;
}

export function makeFirestoreMatchId(weekNumber: number, matchNumber: number) {
  return `${makeFirestoreWeekId(weekNumber)}_m${matchNumber}`;
}
