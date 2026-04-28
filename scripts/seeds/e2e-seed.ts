import {
  ContractStatus,
  DevelopmentTrait,
  DraftClassStatus,
  DraftPlayerStatus,
  DraftRiskLevel,
  InjuryStatus,
  MatchKind,
  MatchStatus,
  PlayerStatus,
  PrismaClient,
  RosterStatus,
  SaveGameStatus,
  ScoutingLevel,
  SeasonPhase,
  TeamFinanceEventType,
} from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { Socket } from "node:net";

import { E2E_TEST_EMAIL, E2E_TEST_IDS } from "../../e2e/fixtures/minimal-e2e-context";
import { ensureReferenceData } from "../../src/modules/shared/infrastructure/reference-data";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const E2E_USER_EMAIL = E2E_TEST_EMAIL;
const E2E_USER_ID = E2E_TEST_IDS.userId;
const SAVEGAME_ID = E2E_TEST_IDS.saveGameId;
const SEASON_ID = E2E_TEST_IDS.seasonId;
const DRAFT_CLASS_ID = E2E_TEST_IDS.draftClassId;
const MANAGER_TEAM_ID = E2E_TEST_IDS.managerTeamId;
const OPPONENT_TEAM_ID = E2E_TEST_IDS.opponentTeamId;
const NEXT_WEEK_MATCH_ID = E2E_TEST_IDS.nextWeekMatchId;
const THIRD_WEEK_MATCH_ID = "e2e-match-week-3";
const UPCOMING_MATCH_ID = E2E_TEST_IDS.upcomingMatchId;
const DEFAULT_POSTGRES_PORT = 5432;
const seedProcessStartedAt = Date.now();

class E2eSeedSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "E2eSeedSetupError";
  }
}

type RequiredReference = {
  id: string;
};

type PlayerSeed = {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;
  positionCode: string;
  rosterStatus: RosterStatus;
  depthChartSlot: number;
  overall: number;
  potential?: number;
  fatigue?: number;
  injuryRisk?: number;
  age?: number;
  yearsPro?: number;
  attributes: Record<string, number>;
};

type DraftProspectSeed = {
  id: string;
  firstName: string;
  lastName: string;
  positionCode: string;
  age: number;
  college: string;
  heightCm: number;
  weightKg: number;
  trueOverall: number;
  truePotential: number;
  projectedRound: number;
  riskLevel: DraftRiskLevel;
  scoutingLevel: ScoutingLevel;
  strengths: string[];
  weaknesses: string[];
};

const DRAFT_PROSPECTS: DraftProspectSeed[] = [
  {
    id: "e2e-draft-qb-01",
    firstName: "Cole",
    lastName: "Harrison",
    positionCode: "QB",
    age: 22,
    college: "Great Lakes",
    heightCm: 191,
    weightKg: 101,
    trueOverall: 72,
    truePotential: 88,
    projectedRound: 1,
    riskLevel: DraftRiskLevel.MEDIUM,
    scoutingLevel: ScoutingLevel.FOCUSED,
    strengths: ["Decision making", "Short accuracy", "Leadership"],
    weaknesses: ["Deep velocity"],
  },
  {
    id: "e2e-draft-wr-01",
    firstName: "Jalen",
    lastName: "Brooks",
    positionCode: "WR",
    age: 21,
    college: "Pacific Tech",
    heightCm: 185,
    weightKg: 88,
    trueOverall: 70,
    truePotential: 86,
    projectedRound: 1,
    riskLevel: DraftRiskLevel.LOW,
    scoutingLevel: ScoutingLevel.BASIC,
    strengths: ["Route running", "Separation"],
    weaknesses: ["Blocking"],
  },
  {
    id: "e2e-draft-lt-01",
    firstName: "Owen",
    lastName: "Price",
    positionCode: "LT",
    age: 22,
    college: "Northern State",
    heightCm: 198,
    weightKg: 143,
    trueOverall: 69,
    truePotential: 84,
    projectedRound: 1,
    riskLevel: DraftRiskLevel.LOW,
    scoutingLevel: ScoutingLevel.NONE,
    strengths: ["Pass set", "Anchor"],
    weaknesses: ["Second-level angles"],
  },
  {
    id: "e2e-draft-cb-01",
    firstName: "Malik",
    lastName: "Vaughn",
    positionCode: "CB",
    age: 21,
    college: "Metro",
    heightCm: 183,
    weightKg: 86,
    trueOverall: 68,
    truePotential: 85,
    projectedRound: 1,
    riskLevel: DraftRiskLevel.HIGH,
    scoutingLevel: ScoutingLevel.BASIC,
    strengths: ["Man coverage", "Recovery speed"],
    weaknesses: ["Penalty risk"],
  },
  {
    id: "e2e-draft-rb-01",
    firstName: "Tariq",
    lastName: "Mills",
    positionCode: "RB",
    age: 22,
    college: "Capital",
    heightCm: 180,
    weightKg: 96,
    trueOverall: 67,
    truePotential: 81,
    projectedRound: 2,
    riskLevel: DraftRiskLevel.MEDIUM,
    scoutingLevel: ScoutingLevel.NONE,
    strengths: ["Vision", "Ball security"],
    weaknesses: ["Top speed"],
  },
  {
    id: "e2e-draft-mlb-01",
    firstName: "Isaiah",
    lastName: "Grant",
    positionCode: "MLB",
    age: 22,
    college: "Heartland",
    heightCm: 188,
    weightKg: 109,
    trueOverall: 66,
    truePotential: 82,
    projectedRound: 2,
    riskLevel: DraftRiskLevel.LOW,
    scoutingLevel: ScoutingLevel.FOCUSED,
    strengths: ["Play recognition", "Tackling"],
    weaknesses: ["Man coverage"],
  },
  {
    id: "e2e-draft-qb-02",
    firstName: "Drew",
    lastName: "Keller",
    positionCode: "QB",
    age: 23,
    college: "Mesa",
    heightCm: 193,
    weightKg: 103,
    trueOverall: 63,
    truePotential: 78,
    projectedRound: 3,
    riskLevel: DraftRiskLevel.HIGH,
    scoutingLevel: ScoutingLevel.NONE,
    strengths: ["Arm strength"],
    weaknesses: ["Pressure decisions", "Accuracy variance"],
  },
  {
    id: "e2e-draft-wr-02",
    firstName: "Silas",
    lastName: "Ford",
    positionCode: "WR",
    age: 22,
    college: "Appalachian",
    heightCm: 188,
    weightKg: 91,
    trueOverall: 64,
    truePotential: 79,
    projectedRound: 3,
    riskLevel: DraftRiskLevel.MEDIUM,
    scoutingLevel: ScoutingLevel.BASIC,
    strengths: ["Catch radius"],
    weaknesses: ["Release"],
  },
  {
    id: "e2e-draft-k-01",
    firstName: "Nico",
    lastName: "Santos",
    positionCode: "K",
    age: 22,
    college: "Coastal",
    heightCm: 181,
    weightKg: 84,
    trueOverall: 62,
    truePotential: 76,
    projectedRound: 4,
    riskLevel: DraftRiskLevel.LOW,
    scoutingLevel: ScoutingLevel.NONE,
    strengths: ["Short accuracy"],
    weaknesses: ["Long power"],
  },
  {
    id: "e2e-draft-p-01",
    firstName: "Wyatt",
    lastName: "Reese",
    positionCode: "P",
    age: 23,
    college: "Western Plains",
    heightCm: 188,
    weightKg: 92,
    trueOverall: 61,
    truePotential: 75,
    projectedRound: 4,
    riskLevel: DraftRiskLevel.MEDIUM,
    scoutingLevel: ScoutingLevel.NONE,
    strengths: ["Hang time"],
    weaknesses: ["Directional control"],
  },
];

const EXTRA_DRAFT_POSITIONS = ["QB", "RB", "WR", "LT", "MLB", "CB", "K", "P"] as const;

for (let index = 0; index < 14; index += 1) {
  const positionCode = EXTRA_DRAFT_POSITIONS[index % EXTRA_DRAFT_POSITIONS.length];
  const projectedRound = 2 + (index % 4);
  const trueOverall = 58 + (index % 9);
  const truePotential = Math.min(84, trueOverall + 9 + (index % 7));

  DRAFT_PROSPECTS.push({
    id: `e2e-draft-depth-${String(index + 1).padStart(2, "0")}`,
    firstName: `Depth${index + 1}`,
    lastName: "Prospect",
    positionCode,
    age: 21 + (index % 3),
    college: "E2E College",
    heightCm: positionCode === "LT" ? 197 : positionCode === "QB" ? 191 : 184,
    weightKg: positionCode === "LT" ? 140 : positionCode === "MLB" ? 108 : 92,
    trueOverall,
    truePotential,
    projectedRound,
    riskLevel:
      index % 5 === 0
        ? DraftRiskLevel.HIGH
        : index % 3 === 0
          ? DraftRiskLevel.LOW
          : DraftRiskLevel.MEDIUM,
    scoutingLevel:
      index % 6 === 0
        ? ScoutingLevel.FOCUSED
        : index % 2 === 0
          ? ScoutingLevel.BASIC
          : ScoutingLevel.NONE,
    strengths: ["Development upside", "Position fit"],
    weaknesses: ["Needs refinement"],
  });
}

function requireRecord<T extends RequiredReference>(record: T | null, label: string): T {
  if (!record) {
    throw new Error(`Missing E2E reference data: ${label}. Run prisma:seed or e2e seed again.`);
  }

  return record;
}

function getDatabaseEndpoint() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new E2eSeedSetupError(
      "DATABASE_URL fehlt. Lege sie in .env.local an oder exportiere sie vor dem E2E-Seed.",
    );
  }

  try {
    const url = new URL(databaseUrl);
    const port = Number(url.port || DEFAULT_POSTGRES_PORT);

    return {
      host: url.hostname || "localhost",
      port,
    };
  } catch {
    throw new E2eSeedSetupError("DATABASE_URL ist ungueltig und kann nicht gelesen werden.");
  }
}

function canOpenSocket(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = new Socket();

    socket.setTimeout(1_500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function assertDatabaseReachable() {
  const endpoint = getDatabaseEndpoint();
  const reachable = await canOpenSocket(endpoint.host, endpoint.port);

  if (!reachable) {
    throw new E2eSeedSetupError(
      `Datenbank nicht erreichbar unter ${endpoint.host}:${endpoint.port}. Starte die lokale Entwicklungs-DB mit "npm run db:up" oder einer eigenen PostgreSQL-Instanz. Fuehre danach "npm run prisma:migrate -- --name init" und erneut "npm run test:e2e:seed" aus.`,
    );
  }

  console.log(`[E2E seed] DB erreichbar unter ${endpoint.host}:${endpoint.port}`);
}

async function loadReferences() {
  const [
    league,
    bosTemplate,
    nytTemplate,
    offenseScheme,
    defenseScheme,
    specialTeamsScheme,
    positions,
    attributes,
  ] = await Promise.all([
    prisma.leagueDefinition.findUnique({ where: { code: "AFM" } }),
    prisma.franchiseTemplate.findUnique({
      where: { abbreviation: "BOS" },
      include: {
        conferenceDefinition: true,
        divisionDefinition: true,
      },
    }),
    prisma.franchiseTemplate.findUnique({
      where: { abbreviation: "NYT" },
      include: {
        conferenceDefinition: true,
        divisionDefinition: true,
      },
    }),
    prisma.schemeFitDefinition.findUnique({ where: { code: "BALANCED_OFFENSE" } }),
    prisma.schemeFitDefinition.findUnique({ where: { code: "FOUR_THREE_FRONT" } }),
    prisma.schemeFitDefinition.findUnique({ where: { code: "FIELD_POSITION" } }),
    prisma.positionDefinition.findMany({
      where: {
        code: {
          in: ["QB", "RB", "WR", "TE", "LT", "DT", "MLB", "CB", "K", "P"],
        },
      },
      include: {
        positionGroup: true,
      },
    }),
    prisma.attributeDefinition.findMany({
      where: {
        code: {
          in: [
            "SPEED",
            "STRENGTH",
            "AWARENESS",
            "LEADERSHIP",
            "DISCIPLINE",
            "DURABILITY",
            "THROW_POWER",
            "THROW_ACCURACY_SHORT",
            "DECISION_MAKING",
            "VISION",
            "BALL_SECURITY",
            "ROUTE_RUNNING",
            "CATCHING",
            "HANDS",
            "SEPARATION",
            "BLOCKING",
            "PASS_BLOCK",
            "RUN_BLOCK",
            "TACKLING",
            "BLOCK_SHEDDING",
            "PASS_RUSH",
            "PLAY_RECOGNITION",
            "MAN_COVERAGE",
            "ZONE_COVERAGE",
            "KICK_POWER",
            "KICK_ACCURACY",
            "PUNT_POWER",
            "PUNT_ACCURACY",
          ],
        },
      },
    }),
  ]);

  const positionByCode = new Map(positions.map((position) => [position.code, position]));
  const attributeByCode = new Map(attributes.map((attribute) => [attribute.code, attribute]));

  return {
    attributeByCode,
    bosTemplate: requireRecord(bosTemplate, "BOS franchise template"),
    defenseScheme: requireRecord(defenseScheme, "FOUR_THREE_FRONT scheme"),
    league: requireRecord(league, "AFM league"),
    nytTemplate: requireRecord(nytTemplate, "NYT franchise template"),
    offenseScheme: requireRecord(offenseScheme, "BALANCED_OFFENSE scheme"),
    positionByCode,
    specialTeamsScheme: requireRecord(specialTeamsScheme, "FIELD_POSITION scheme"),
  };
}

async function resetE2eUser() {
  const existingSaveGames = await prisma.saveGame.findMany({
    where: {
      userId: E2E_USER_ID,
    },
    select: {
      id: true,
    },
  });

  if (existingSaveGames.length > 0) {
    await prisma.saveGame.updateMany({
      where: {
        id: {
          in: existingSaveGames.map((saveGame) => saveGame.id),
        },
      },
      data: {
        currentSeasonId: null,
      },
    });
  }

  await prisma.user.deleteMany({
    where: {
      id: E2E_USER_ID,
    },
  });
}

async function createPlayer(
  input: PlayerSeed,
  refs: Awaited<ReturnType<typeof loadReferences>>,
) {
  const position = requireRecord(
    refs.positionByCode.get(input.positionCode) ?? null,
    `${input.positionCode} position`,
  );
  const player = await prisma.player.create({
    data: {
      id: input.id,
      saveGameId: SAVEGAME_ID,
      firstName: input.firstName,
      lastName: input.lastName,
      age: input.age ?? 26,
      heightCm: 188,
      weightKg: 102,
      yearsPro: input.yearsPro ?? 4,
      college: "E2E State",
      nationality: "USA",
      status: PlayerStatus.ACTIVE,
      injuryStatus: InjuryStatus.HEALTHY,
      fatigue: input.fatigue ?? 12,
      morale: 61,
      developmentTrait: DevelopmentTrait.NORMAL,
    },
  });

  await prisma.playerRosterProfile.create({
    data: {
      saveGameId: SAVEGAME_ID,
      playerId: player.id,
      teamId: input.teamId,
      primaryPositionDefinitionId: position.id,
      positionGroupDefinitionId: position.positionGroup.id,
      rosterStatus: input.rosterStatus,
      depthChartSlot: input.depthChartSlot,
      captainFlag: input.positionCode === "QB" || input.positionCode === "MLB",
      developmentFocus: input.positionCode === "WR" || (input.potential ?? 0) >= 84,
      injuryRisk: input.injuryRisk ?? 38,
    },
  });

  await prisma.playerEvaluation.create({
    data: {
      saveGameId: SAVEGAME_ID,
      playerId: player.id,
      potentialRating: input.potential ?? Math.min(input.overall + 6, 99),
      positionOverall: input.overall,
      offensiveOverall: ["QB", "RB", "WR", "TE", "LT"].includes(input.positionCode)
        ? input.overall
        : null,
      defensiveOverall: ["DT", "MLB", "CB"].includes(input.positionCode) ? input.overall : null,
      specialTeamsOverall: ["K", "P"].includes(input.positionCode) ? input.overall : null,
      physicalOverall: Math.max(input.overall - 2, 50),
      mentalOverall: Math.min(input.overall + 1, 99),
    },
  });

  await prisma.contract.create({
    data: {
      saveGameId: SAVEGAME_ID,
      playerId: player.id,
      teamId: input.teamId,
      startSeasonId: SEASON_ID,
      status: ContractStatus.ACTIVE,
      years: input.positionCode === "QB" ? 3 : 1,
      yearlySalary: input.positionCode === "QB" ? 12_000_000 : 2_000_000,
      signingBonus: input.positionCode === "QB" ? 2_000_000 : 250_000,
      capHit: input.positionCode === "QB" ? 14_000_000 : 2_250_000,
    },
  });

  const attributeRows = Object.entries({
    SPEED: 64,
    STRENGTH: 64,
    AWARENESS: input.overall,
    LEADERSHIP: input.positionCode === "QB" || input.positionCode === "MLB" ? 78 : 60,
    DISCIPLINE: 70,
    DURABILITY: 74,
    ...input.attributes,
  })
    .map(([code, value]) => {
      const attribute = refs.attributeByCode.get(code);

      if (!attribute) {
        return null;
      }

      return {
        saveGameId: SAVEGAME_ID,
        playerId: player.id,
        attributeDefinitionId: attribute.id,
        value,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (attributeRows.length > 0) {
    await prisma.playerAttributeRating.createMany({
      data: attributeRows,
    });
  }

  return player;
}

function visibleRange(value: number, level: ScoutingLevel) {
  if (level === ScoutingLevel.FOCUSED) {
    return {
      max: Math.min(99, value + 2),
      min: Math.max(35, value - 2),
    };
  }

  if (level === ScoutingLevel.BASIC) {
    return {
      max: Math.min(99, value + 5),
      min: Math.max(35, value - 5),
    };
  }

  return {
    max: Math.min(99, value + 9),
    min: Math.max(35, value - 9),
  };
}

async function createDraftFixture(refs: Awaited<ReturnType<typeof loadReferences>>) {
  await prisma.draftClass.create({
    data: {
      id: DRAFT_CLASS_ID,
      saveGameId: SAVEGAME_ID,
      seasonId: SEASON_ID,
      year: 2027,
      status: DraftClassStatus.ACTIVE,
      name: "2027 E2E Draft Class",
    },
  });

  for (let index = 0; index < DRAFT_PROSPECTS.length; index += 1) {
    const prospect = DRAFT_PROSPECTS[index];
    const position = requireRecord(
      refs.positionByCode.get(prospect.positionCode) ?? null,
      `${prospect.positionCode} draft position`,
    );

    await prisma.draftPlayer.create({
      data: {
        id: prospect.id,
        saveGameId: SAVEGAME_ID,
        draftClassId: DRAFT_CLASS_ID,
        positionDefinitionId: position.id,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        age: prospect.age,
        college: prospect.college,
        heightCm: prospect.heightCm,
        weightKg: prospect.weightKg,
        trueOverall: prospect.trueOverall,
        truePotential: prospect.truePotential,
        projectedRound: prospect.projectedRound,
        riskLevel: prospect.riskLevel,
        status: DraftPlayerStatus.AVAILABLE,
      },
    });

    const overallRange = visibleRange(prospect.trueOverall, prospect.scoutingLevel);
    const potentialRange = visibleRange(prospect.truePotential, prospect.scoutingLevel);

    await prisma.scoutingData.create({
      data: {
        saveGameId: SAVEGAME_ID,
        draftClassId: DRAFT_CLASS_ID,
        draftPlayerId: prospect.id,
        teamId: MANAGER_TEAM_ID,
        level: prospect.scoutingLevel,
        visibleOverallMin: overallRange.min,
        visibleOverallMax: overallRange.max,
        visiblePotentialMin: potentialRange.min,
        visiblePotentialMax: potentialRange.max,
        strengths: prospect.strengths,
        weaknesses: prospect.weaknesses,
        notes:
          prospect.scoutingLevel === ScoutingLevel.NONE
            ? null
            : `Deterministic E2E scouting note #${index + 1}`,
      },
    });
  }
}

async function createMinimalFixture() {
  const startedAt = Date.now();

  await assertDatabaseReachable();
  await ensureReferenceData(prisma);
  const refs = await loadReferences();
  await resetE2eUser();

  await prisma.user.create({
    data: {
      id: E2E_USER_ID,
      email: E2E_USER_EMAIL,
      name: "E2E Local GM",
    },
  });

  await prisma.saveGame.create({
    data: {
      id: SAVEGAME_ID,
      userId: E2E_USER_ID,
      leagueDefinitionId: refs.league.id,
      name: "E2E Minimal Savegame",
      status: SaveGameStatus.ACTIVE,
      settings: {
        create: {
          salaryCap: 180_000_000,
          activeRosterLimit: 24,
          practiceSquadSize: 2,
          seasonLengthWeeks: 3,
        },
      },
    },
  });

  await prisma.season.create({
    data: {
      id: SEASON_ID,
      saveGameId: SAVEGAME_ID,
      year: 2026,
      phase: SeasonPhase.REGULAR_SEASON,
      week: 1,
      startsAt: new Date("2026-09-01T12:00:00.000Z"),
      endsAt: new Date("2027-01-01T12:00:00.000Z"),
    },
  });

  await prisma.saveGame.update({
    where: {
      id: SAVEGAME_ID,
    },
    data: {
      currentSeasonId: SEASON_ID,
    },
  });

  await prisma.team.createMany({
    data: [
      {
        id: MANAGER_TEAM_ID,
        saveGameId: SAVEGAME_ID,
        franchiseTemplateId: refs.bosTemplate.id,
        conferenceDefinitionId: refs.bosTemplate.conferenceDefinition.id,
        divisionDefinitionId: refs.bosTemplate.divisionDefinition.id,
        offensiveSchemeFitDefinitionId: refs.offenseScheme.id,
        defensiveSchemeFitDefinitionId: refs.defenseScheme.id,
        specialTeamsSchemeFitDefinitionId: refs.specialTeamsScheme.id,
        city: "Boston",
        nickname: "Guardians",
        abbreviation: "BOS",
        managerControlled: true,
        overallRating: 74,
        morale: 62,
        cashBalance: 125_000_000,
        salaryCapSpace: 42_000_000,
      },
      {
        id: OPPONENT_TEAM_ID,
        saveGameId: SAVEGAME_ID,
        franchiseTemplateId: refs.nytTemplate.id,
        conferenceDefinitionId: refs.nytTemplate.conferenceDefinition.id,
        divisionDefinitionId: refs.nytTemplate.divisionDefinition.id,
        offensiveSchemeFitDefinitionId: refs.offenseScheme.id,
        defensiveSchemeFitDefinitionId: refs.defenseScheme.id,
        specialTeamsSchemeFitDefinitionId: refs.specialTeamsScheme.id,
        city: "New York",
        nickname: "Titans",
        abbreviation: "NYT",
        managerControlled: false,
        overallRating: 71,
        morale: 56,
        cashBalance: 118_000_000,
        salaryCapSpace: 46_000_000,
      },
    ],
  });

  await prisma.teamSeasonStat.createMany({
    data: [
      {
        saveGameId: SAVEGAME_ID,
        seasonId: SEASON_ID,
        teamId: MANAGER_TEAM_ID,
      },
      {
        saveGameId: SAVEGAME_ID,
        seasonId: SEASON_ID,
        teamId: OPPONENT_TEAM_ID,
      },
    ],
  });

  const players: PlayerSeed[] = [
    {
      id: "e2e-bos-qb",
      firstName: "Evan",
      lastName: "Stone",
      teamId: MANAGER_TEAM_ID,
      positionCode: "QB",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 78,
      potential: 82,
      fatigue: 72,
      attributes: {
        THROW_POWER: 79,
        THROW_ACCURACY_SHORT: 81,
        DECISION_MAKING: 77,
      },
    },
    {
      id: "e2e-bos-qb-stable",
      firstName: "Casey",
      lastName: "Hale",
      teamId: MANAGER_TEAM_ID,
      positionCode: "QB",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 74,
      potential: 78,
      fatigue: 12,
      age: 29,
      yearsPro: 7,
      attributes: {
        THROW_POWER: 73,
        THROW_ACCURACY_SHORT: 78,
        DECISION_MAKING: 80,
      },
    },
    {
      id: "e2e-bos-qb-upside",
      firstName: "Drew",
      lastName: "Fields",
      teamId: MANAGER_TEAM_ID,
      positionCode: "QB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 70,
      potential: 87,
      fatigue: 18,
      age: 22,
      yearsPro: 1,
      attributes: {
        THROW_POWER: 82,
        THROW_ACCURACY_SHORT: 70,
        DECISION_MAKING: 65,
        MOBILITY: 84,
      },
    },
    {
      id: "e2e-bos-rb",
      firstName: "Miles",
      lastName: "Grant",
      teamId: MANAGER_TEAM_ID,
      positionCode: "RB",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 73,
      potential: 77,
      fatigue: 64,
      attributes: {
        SPEED: 78,
        VISION: 76,
        BALL_SECURITY: 75,
      },
    },
    {
      id: "e2e-bos-rb-stable",
      firstName: "Owen",
      lastName: "Bell",
      teamId: MANAGER_TEAM_ID,
      positionCode: "RB",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 75,
      fatigue: 10,
      age: 27,
      yearsPro: 5,
      attributes: {
        SPEED: 72,
        VISION: 77,
        BALL_SECURITY: 83,
      },
    },
    {
      id: "e2e-bos-rb-upside",
      firstName: "Tariq",
      lastName: "Mills",
      teamId: MANAGER_TEAM_ID,
      positionCode: "RB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 68,
      potential: 84,
      fatigue: 16,
      age: 22,
      yearsPro: 1,
      attributes: {
        SPEED: 84,
        VISION: 67,
        BALL_SECURITY: 66,
      },
    },
    {
      id: "e2e-bos-wr",
      firstName: "Noah",
      lastName: "Reed",
      teamId: MANAGER_TEAM_ID,
      positionCode: "WR",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 75,
      potential: 80,
      fatigue: 58,
      attributes: {
        SPEED: 82,
        ROUTE_RUNNING: 77,
        CATCHING: 76,
      },
    },
    {
      id: "e2e-bos-wr-stable",
      firstName: "Parker",
      lastName: "Rowe",
      teamId: MANAGER_TEAM_ID,
      positionCode: "WR",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 72,
      potential: 76,
      fatigue: 8,
      age: 28,
      yearsPro: 6,
      attributes: {
        SPEED: 74,
        ROUTE_RUNNING: 80,
        CATCHING: 82,
      },
    },
    {
      id: "e2e-bos-wr-upside",
      firstName: "Jalen",
      lastName: "Brooks",
      teamId: MANAGER_TEAM_ID,
      positionCode: "WR",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 69,
      potential: 86,
      fatigue: 14,
      age: 21,
      yearsPro: 1,
      attributes: {
        SPEED: 86,
        ROUTE_RUNNING: 68,
        CATCHING: 70,
      },
    },
    {
      id: "e2e-bos-lt",
      firstName: "Caleb",
      lastName: "Moore",
      teamId: MANAGER_TEAM_ID,
      positionCode: "LT",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 72,
      potential: 76,
      fatigue: 62,
      attributes: {
        STRENGTH: 79,
        PASS_BLOCK: 74,
        RUN_BLOCK: 72,
      },
    },
    {
      id: "e2e-bos-lt-stable",
      firstName: "Jonah",
      lastName: "Price",
      teamId: MANAGER_TEAM_ID,
      positionCode: "LT",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 75,
      fatigue: 9,
      age: 30,
      yearsPro: 8,
      attributes: {
        STRENGTH: 77,
        PASS_BLOCK: 76,
        RUN_BLOCK: 69,
      },
    },
    {
      id: "e2e-bos-lt-upside",
      firstName: "Owen",
      lastName: "Vale",
      teamId: MANAGER_TEAM_ID,
      positionCode: "LT",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 68,
      potential: 83,
      fatigue: 16,
      injuryRisk: 48,
      age: 22,
      yearsPro: 1,
      attributes: {
        STRENGTH: 81,
        PASS_BLOCK: 66,
        RUN_BLOCK: 75,
      },
    },
    {
      id: "e2e-bos-te-now",
      firstName: "Micah",
      lastName: "Cross",
      teamId: MANAGER_TEAM_ID,
      positionCode: "TE",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 74,
      potential: 78,
      fatigue: 44,
      attributes: {
        CATCHING: 78,
        HANDS: 79,
        SEPARATION: 72,
        BLOCKING: 71,
      },
    },
    {
      id: "e2e-bos-te-block",
      firstName: "Grant",
      lastName: "Sutter",
      teamId: MANAGER_TEAM_ID,
      positionCode: "TE",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 74,
      fatigue: 11,
      age: 29,
      yearsPro: 6,
      attributes: {
        CATCHING: 68,
        HANDS: 70,
        SEPARATION: 65,
        BLOCKING: 80,
      },
    },
    {
      id: "e2e-bos-mlb",
      firstName: "Marcus",
      lastName: "Lane",
      teamId: MANAGER_TEAM_ID,
      positionCode: "MLB",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 76,
      potential: 79,
      fatigue: 66,
      attributes: {
        TACKLING: 79,
        PLAY_RECOGNITION: 78,
        STRENGTH: 73,
      },
    },
    {
      id: "e2e-bos-mlb-upside",
      firstName: "Isaiah",
      lastName: "Grant",
      teamId: MANAGER_TEAM_ID,
      positionCode: "MLB",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 72,
      potential: 85,
      fatigue: 11,
      age: 23,
      yearsPro: 2,
      attributes: {
        TACKLING: 73,
        PLAY_RECOGNITION: 70,
        STRENGTH: 76,
      },
    },
    {
      id: "e2e-bos-mlb-cover",
      firstName: "Liam",
      lastName: "Dawson",
      teamId: MANAGER_TEAM_ID,
      positionCode: "MLB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 69,
      potential: 76,
      fatigue: 8,
      age: 27,
      yearsPro: 5,
      attributes: {
        TACKLING: 70,
        PLAY_RECOGNITION: 77,
        ZONE_COVERAGE: 75,
      },
    },
    {
      id: "e2e-bos-dt-now",
      firstName: "Roman",
      lastName: "Holt",
      teamId: MANAGER_TEAM_ID,
      positionCode: "DT",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 75,
      potential: 79,
      fatigue: 60,
      attributes: {
        STRENGTH: 82,
        TACKLING: 76,
        BLOCK_SHEDDING: 79,
        PASS_RUSH: 70,
      },
    },
    {
      id: "e2e-bos-dt-rush",
      firstName: "Kai",
      lastName: "Mercer",
      teamId: MANAGER_TEAM_ID,
      positionCode: "DT",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 84,
      fatigue: 18,
      injuryRisk: 52,
      age: 23,
      yearsPro: 2,
      attributes: {
        STRENGTH: 76,
        TACKLING: 70,
        BLOCK_SHEDDING: 68,
        PASS_RUSH: 79,
      },
    },
    {
      id: "e2e-bos-cb-now",
      firstName: "Malik",
      lastName: "Vaughn",
      teamId: MANAGER_TEAM_ID,
      positionCode: "CB",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 74,
      potential: 78,
      fatigue: 61,
      attributes: {
        SPEED: 82,
        MAN_COVERAGE: 76,
        ZONE_COVERAGE: 72,
      },
    },
    {
      id: "e2e-bos-cb-upside",
      firstName: "Andre",
      lastName: "Knight",
      teamId: MANAGER_TEAM_ID,
      positionCode: "CB",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 84,
      fatigue: 13,
      age: 22,
      yearsPro: 1,
      attributes: {
        SPEED: 85,
        MAN_COVERAGE: 69,
        ZONE_COVERAGE: 68,
      },
    },
    {
      id: "e2e-bos-cb-zone",
      firstName: "Ellis",
      lastName: "Ford",
      teamId: MANAGER_TEAM_ID,
      positionCode: "CB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 68,
      potential: 75,
      fatigue: 8,
      age: 28,
      yearsPro: 6,
      attributes: {
        SPEED: 74,
        MAN_COVERAGE: 67,
        ZONE_COVERAGE: 78,
      },
    },
    {
      id: "e2e-bos-k-now",
      firstName: "Graham",
      lastName: "Bishop",
      teamId: MANAGER_TEAM_ID,
      positionCode: "K",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 72,
      potential: 74,
      fatigue: 8,
      age: 31,
      yearsPro: 9,
      attributes: {
        KICK_POWER: 78,
        KICK_ACCURACY: 73,
        KICK_CONSISTENCY: 72,
      },
    },
    {
      id: "e2e-bos-k-upside",
      firstName: "Theo",
      lastName: "Logan",
      teamId: MANAGER_TEAM_ID,
      positionCode: "K",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 2,
      overall: 67,
      potential: 81,
      fatigue: 7,
      age: 22,
      yearsPro: 1,
      attributes: {
        KICK_POWER: 84,
        KICK_ACCURACY: 65,
        KICK_CONSISTENCY: 63,
      },
    },
    {
      id: "e2e-bos-p-now",
      firstName: "Wyatt",
      lastName: "Reese",
      teamId: MANAGER_TEAM_ID,
      positionCode: "P",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 71,
      potential: 75,
      fatigue: 6,
      age: 30,
      yearsPro: 8,
      attributes: {
        PUNT_POWER: 76,
        PUNT_ACCURACY: 74,
      },
    },
    {
      id: "e2e-bos-p-leg",
      firstName: "Nico",
      lastName: "Rhodes",
      teamId: MANAGER_TEAM_ID,
      positionCode: "P",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 2,
      overall: 66,
      potential: 80,
      fatigue: 7,
      age: 22,
      yearsPro: 1,
      attributes: {
        PUNT_POWER: 83,
        PUNT_ACCURACY: 62,
      },
    },
    {
      id: "e2e-nyt-qb",
      firstName: "Ryan",
      lastName: "Cole",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "QB",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 72,
      attributes: {
        THROW_POWER: 74,
        THROW_ACCURACY_SHORT: 72,
        DECISION_MAKING: 70,
      },
    },
    {
      id: "e2e-nyt-qb-safe",
      firstName: "Logan",
      lastName: "Pierce",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "QB",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 69,
      potential: 74,
      fatigue: 9,
      age: 30,
      yearsPro: 8,
      attributes: {
        THROW_POWER: 68,
        THROW_ACCURACY_SHORT: 76,
        DECISION_MAKING: 78,
      },
    },
    {
      id: "e2e-nyt-qb-volatile",
      firstName: "Zane",
      lastName: "Maddox",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "QB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 66,
      potential: 84,
      fatigue: 15,
      injuryRisk: 50,
      age: 22,
      yearsPro: 1,
      attributes: {
        THROW_POWER: 83,
        THROW_ACCURACY_SHORT: 64,
        DECISION_MAKING: 61,
      },
    },
    {
      id: "e2e-nyt-rb-now",
      firstName: "Dante",
      lastName: "Young",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "RB",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 74,
      potential: 78,
      fatigue: 50,
      attributes: {
        SPEED: 80,
        VISION: 77,
        BALL_SECURITY: 76,
      },
    },
    {
      id: "e2e-nyt-rb-safe",
      firstName: "Nolan",
      lastName: "Ames",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "RB",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 74,
      fatigue: 8,
      age: 28,
      yearsPro: 6,
      attributes: {
        SPEED: 72,
        VISION: 78,
        BALL_SECURITY: 84,
      },
    },
    {
      id: "e2e-nyt-rb-burst",
      firstName: "Kian",
      lastName: "Frost",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "RB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 67,
      potential: 83,
      fatigue: 17,
      injuryRisk: 55,
      age: 22,
      yearsPro: 1,
      attributes: {
        SPEED: 86,
        VISION: 65,
        BALL_SECURITY: 64,
      },
    },
    {
      id: "e2e-nyt-wr",
      firstName: "Theo",
      lastName: "King",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "WR",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 71,
      attributes: {
        SPEED: 78,
        ROUTE_RUNNING: 71,
        CATCHING: 73,
      },
    },
    {
      id: "e2e-nyt-wr-hands",
      firstName: "Eli",
      lastName: "Marsh",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "WR",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 75,
      fatigue: 7,
      age: 27,
      yearsPro: 5,
      attributes: {
        SPEED: 72,
        ROUTE_RUNNING: 79,
        CATCHING: 82,
      },
    },
    {
      id: "e2e-nyt-wr-speed",
      firstName: "Arlo",
      lastName: "West",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "WR",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 68,
      potential: 85,
      fatigue: 13,
      age: 21,
      yearsPro: 1,
      attributes: {
        SPEED: 87,
        ROUTE_RUNNING: 66,
        CATCHING: 68,
      },
    },
    {
      id: "e2e-nyt-te-now",
      firstName: "Silas",
      lastName: "Brock",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "TE",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 73,
      potential: 77,
      fatigue: 36,
      attributes: {
        CATCHING: 76,
        HANDS: 77,
        SEPARATION: 71,
        BLOCKING: 72,
      },
    },
    {
      id: "e2e-nyt-te-block",
      firstName: "Cole",
      lastName: "Nash",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "TE",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 69,
      potential: 73,
      fatigue: 9,
      age: 29,
      yearsPro: 7,
      attributes: {
        CATCHING: 66,
        HANDS: 68,
        SEPARATION: 63,
        BLOCKING: 80,
      },
    },
    {
      id: "e2e-nyt-lt-now",
      firstName: "Mason",
      lastName: "Quinn",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "LT",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 75,
      potential: 78,
      fatigue: 47,
      attributes: {
        STRENGTH: 81,
        PASS_BLOCK: 78,
        RUN_BLOCK: 73,
      },
    },
    {
      id: "e2e-nyt-lt-road",
      firstName: "Asher",
      lastName: "Keane",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "LT",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 71,
      potential: 75,
      fatigue: 10,
      age: 28,
      yearsPro: 6,
      attributes: {
        STRENGTH: 82,
        PASS_BLOCK: 69,
        RUN_BLOCK: 79,
      },
    },
    {
      id: "e2e-nyt-lt-project",
      firstName: "Brett",
      lastName: "Lake",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "LT",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 67,
      potential: 84,
      fatigue: 14,
      injuryRisk: 49,
      age: 22,
      yearsPro: 1,
      attributes: {
        STRENGTH: 80,
        PASS_BLOCK: 65,
        RUN_BLOCK: 74,
      },
    },
    {
      id: "e2e-nyt-dt-now",
      firstName: "Tre",
      lastName: "Holland",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "DT",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 76,
      potential: 79,
      fatigue: 55,
      attributes: {
        STRENGTH: 84,
        TACKLING: 77,
        BLOCK_SHEDDING: 80,
        PASS_RUSH: 69,
      },
    },
    {
      id: "e2e-nyt-dt-rush",
      firstName: "Jace",
      lastName: "Rivers",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "DT",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 83,
      fatigue: 16,
      injuryRisk: 51,
      age: 23,
      yearsPro: 2,
      attributes: {
        STRENGTH: 75,
        TACKLING: 70,
        BLOCK_SHEDDING: 68,
        PASS_RUSH: 79,
      },
    },
    {
      id: "e2e-nyt-mlb-now",
      firstName: "Andre",
      lastName: "Stone",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "MLB",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 75,
      potential: 78,
      fatigue: 52,
      attributes: {
        TACKLING: 78,
        PLAY_RECOGNITION: 77,
        STRENGTH: 74,
      },
    },
    {
      id: "e2e-nyt-mlb-cover",
      firstName: "Finn",
      lastName: "Dorsey",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "MLB",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 71,
      potential: 76,
      fatigue: 9,
      age: 27,
      yearsPro: 5,
      attributes: {
        TACKLING: 71,
        PLAY_RECOGNITION: 78,
        ZONE_COVERAGE: 76,
      },
    },
    {
      id: "e2e-nyt-mlb-hit",
      firstName: "Rory",
      lastName: "Blake",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "MLB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 68,
      potential: 84,
      fatigue: 15,
      injuryRisk: 53,
      age: 22,
      yearsPro: 1,
      attributes: {
        TACKLING: 76,
        PLAY_RECOGNITION: 65,
        STRENGTH: 79,
      },
    },
    {
      id: "e2e-nyt-cb",
      firstName: "Dylan",
      lastName: "Price",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "CB",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 73,
      attributes: {
        SPEED: 80,
        MAN_COVERAGE: 74,
        ZONE_COVERAGE: 72,
      },
    },
    {
      id: "e2e-nyt-cb-zone",
      firstName: "Miles",
      lastName: "Fenn",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "CB",
      rosterStatus: RosterStatus.ROTATION,
      depthChartSlot: 2,
      overall: 70,
      potential: 75,
      fatigue: 9,
      age: 28,
      yearsPro: 6,
      attributes: {
        SPEED: 75,
        MAN_COVERAGE: 68,
        ZONE_COVERAGE: 79,
      },
    },
    {
      id: "e2e-nyt-cb-raw",
      firstName: "Niko",
      lastName: "Vale",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "CB",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 3,
      overall: 67,
      potential: 85,
      fatigue: 14,
      age: 21,
      yearsPro: 1,
      attributes: {
        SPEED: 86,
        MAN_COVERAGE: 66,
        ZONE_COVERAGE: 65,
      },
    },
    {
      id: "e2e-nyt-k-now",
      firstName: "Gavin",
      lastName: "Cole",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "K",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 71,
      potential: 74,
      fatigue: 6,
      age: 31,
      yearsPro: 9,
      attributes: {
        KICK_POWER: 76,
        KICK_ACCURACY: 74,
      },
    },
    {
      id: "e2e-nyt-k-leg",
      firstName: "Reid",
      lastName: "Atlas",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "K",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 2,
      overall: 66,
      potential: 81,
      fatigue: 8,
      age: 22,
      yearsPro: 1,
      attributes: {
        KICK_POWER: 84,
        KICK_ACCURACY: 64,
      },
    },
    {
      id: "e2e-nyt-p-now",
      firstName: "Hayes",
      lastName: "Ford",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "P",
      rosterStatus: RosterStatus.STARTER,
      depthChartSlot: 1,
      overall: 70,
      potential: 74,
      fatigue: 6,
      age: 30,
      yearsPro: 8,
      attributes: {
        PUNT_POWER: 75,
        PUNT_ACCURACY: 73,
      },
    },
    {
      id: "e2e-nyt-p-leg",
      firstName: "Tate",
      lastName: "Owens",
      teamId: OPPONENT_TEAM_ID,
      positionCode: "P",
      rosterStatus: RosterStatus.BACKUP,
      depthChartSlot: 2,
      overall: 65,
      potential: 79,
      fatigue: 7,
      age: 22,
      yearsPro: 1,
      attributes: {
        PUNT_POWER: 82,
        PUNT_ACCURACY: 61,
      },
    },
  ];

  for (const player of players) {
    await createPlayer(player, refs);
  }

  await prisma.match.create({
    data: {
      id: UPCOMING_MATCH_ID,
      saveGameId: SAVEGAME_ID,
      seasonId: SEASON_ID,
      week: 1,
      kind: MatchKind.REGULAR_SEASON,
      status: MatchStatus.SCHEDULED,
      homeTeamId: MANAGER_TEAM_ID,
      awayTeamId: OPPONENT_TEAM_ID,
      scheduledAt: new Date("2026-09-06T18:00:00.000Z"),
      stadiumName: "E2E Field",
      simulationSeed: "e2e-minimal-week-1",
    },
  });

  await prisma.match.create({
    data: {
      id: NEXT_WEEK_MATCH_ID,
      saveGameId: SAVEGAME_ID,
      seasonId: SEASON_ID,
      week: 2,
      kind: MatchKind.REGULAR_SEASON,
      status: MatchStatus.SCHEDULED,
      homeTeamId: OPPONENT_TEAM_ID,
      awayTeamId: MANAGER_TEAM_ID,
      scheduledAt: new Date("2026-09-13T18:00:00.000Z"),
      stadiumName: "E2E Field",
      simulationSeed: "e2e-minimal-week-2",
    },
  });

  await prisma.match.create({
    data: {
      id: THIRD_WEEK_MATCH_ID,
      saveGameId: SAVEGAME_ID,
      seasonId: SEASON_ID,
      week: 3,
      kind: MatchKind.REGULAR_SEASON,
      status: MatchStatus.SCHEDULED,
      homeTeamId: MANAGER_TEAM_ID,
      awayTeamId: OPPONENT_TEAM_ID,
      scheduledAt: new Date("2026-09-20T18:00:00.000Z"),
      stadiumName: "E2E Field",
      simulationSeed: "e2e-minimal-week-3",
    },
  });

  await prisma.teamFinanceEvent.create({
    data: {
      saveGameId: SAVEGAME_ID,
      teamId: MANAGER_TEAM_ID,
      seasonId: SEASON_ID,
      type: TeamFinanceEventType.SEASON_SALARY,
      amount: 0,
      capImpact: 0,
      cashBalanceAfter: 125_000_000,
      description: "E2E fixture initialized with a minimal roster and three playable matches.",
    },
  });

  await createDraftFixture(refs);

  const durationMs = Date.now() - startedAt;

  return {
    draftClassId: DRAFT_CLASS_ID,
    draftProspectCount: DRAFT_PROSPECTS.length,
    durationMs,
    matchId: UPCOMING_MATCH_ID,
    playerCount: players.length,
    saveGameId: SAVEGAME_ID,
    teamCount: 2,
    userId: E2E_USER_ID,
  };
}

createMinimalFixture()
  .then(async (result) => {
    console.log(
      `[E2E seed] OK in ${result.durationMs}ms: user=${result.userId}, savegame=${result.saveGameId}, teams=${result.teamCount}, players=${result.playerCount}, match=${result.matchId}, draftClass=${result.draftClassId}, prospects=${result.draftProspectCount}`,
    );
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    const durationMs = Date.now() - seedProcessStartedAt;

    console.error(`[E2E seed] FAILED after ${durationMs}ms`);
    if (error instanceof E2eSeedSetupError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    await prisma.$disconnect();
    process.exit(1);
  });
