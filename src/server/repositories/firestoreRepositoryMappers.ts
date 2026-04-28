import type { PlayerDetailRecord } from "@/modules/players/infrastructure/player.repository";
import type { TeamDetailRecord } from "@/modules/teams/infrastructure/team.repository";

export type FirestoreTeamDoc = {
  id: string;
  leagueId: string;
  city: string;
  nickname: string;
  abbreviation: string;
  managerControlled: boolean;
  conferenceSnapshot?: { name?: string };
  divisionSnapshot?: { name?: string };
  schemes?: {
    offense?: { code?: string; name?: string } | null;
    defense?: { code?: string; name?: string } | null;
    specialTeams?: { code?: string; name?: string } | null;
  };
  overallRating?: number;
  morale?: number;
  cashBalanceCents?: number;
  salaryCapSpaceCents?: number;
  ownerUserId?: string | null;
};

export type FirestorePlayerDoc = {
  id: string;
  leagueId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  age: number;
  birthDate?: Date | null;
  heightCm: number;
  weightKg: number;
  yearsPro: number;
  college?: string | null;
  nationality?: string | null;
  dominantHand?: string | null;
  status: string;
  injury?: {
    status?: string;
    name?: string | null;
    endsOn?: Date | null;
  };
  condition?: {
    fatigue?: number;
    morale?: number;
  };
  developmentTrait?: string;
  roster?: {
    teamId?: string | null;
    teamSnapshot?: {
      teamId: string;
      city: string;
      nickname: string;
      abbreviation: string;
    } | null;
    rosterStatus?: string;
    depthChartSlot?: number | null;
    captainFlag?: boolean;
    developmentFocus?: boolean;
    practiceSquadEligible?: boolean | null;
    primaryPosition?: { code?: string; name?: string };
    secondaryPosition?: { code?: string; name?: string } | null;
    positionGroup?: { code?: string; name?: string };
    archetype?: { name?: string } | null;
    schemeFit?: { code?: string; name?: string } | null;
  };
  evaluation?: {
    positionOverall?: number;
    potentialRating?: number;
    offensiveOverall?: number | null;
    defensiveOverall?: number | null;
    specialTeamsOverall?: number | null;
    physicalOverall?: number | null;
    mentalOverall?: number | null;
  };
  attributes?: Record<string, number>;
  activeContractSummary?: {
    years: number;
    yearlySalaryCents: number;
    signingBonusCents: number;
    capHitCents: number;
    signedAt?: Date;
  } | null;
};

type FirestoreLeagueDoc = {
  id: string;
  ownerId: string;
  currentSeasonId?: string | null;
};

type FirestoreSeasonDoc = {
  id: string;
  year: number;
};

type FirestoreTeamStatDoc = {
  wins?: number;
  losses?: number;
  ties?: number;
};

type FirestorePlayerStatDoc = {
  teamId?: string;
  seasonId?: string;
  seasonYear?: number;
  stats?: {
    gamesPlayed?: number;
    gamesStarted?: number;
    yards?: number;
    touchdowns?: number;
    tackles?: number;
  };
};

export function mapFirestoreTeamDocument(id: string, data: FirestoreTeamDoc): FirestoreTeamDoc {
  return {
    ...data,
    id,
  };
}

export function mapFirestorePlayerDocument(
  id: string,
  data: FirestorePlayerDoc,
): FirestorePlayerDoc {
  return {
    ...data,
    id,
  };
}

export function mapFirestoreTeamToDetailRecord(input: {
  players: FirestorePlayerDoc[];
  team: FirestoreTeamDoc;
  teamStats?: FirestoreTeamStatDoc | null;
}): TeamDetailRecord {
  const { team } = input;

  return {
    id: team.id,
    city: team.city,
    nickname: team.nickname,
    abbreviation: team.abbreviation,
    managerControlled: team.managerControlled,
    overallRating: team.overallRating ?? 0,
    morale: team.morale ?? 0,
    cashBalance: centsToCurrencyUnits(team.cashBalanceCents),
    salaryCapSpace: centsToCurrencyUnits(team.salaryCapSpaceCents),
    conferenceDefinition: {
      name: team.conferenceSnapshot?.name ?? "Unknown Conference",
    },
    divisionDefinition: {
      name: team.divisionSnapshot?.name ?? "Unknown Division",
    },
    offensiveSchemeFit: nullableScheme(team.schemes?.offense),
    defensiveSchemeFit: nullableScheme(team.schemes?.defense),
    specialTeamsSchemeFit: nullableScheme(team.schemes?.specialTeams),
    teamSeasonStats: [
      {
        wins: input.teamStats?.wins ?? 0,
        losses: input.teamStats?.losses ?? 0,
        ties: input.teamStats?.ties ?? 0,
      },
    ],
    rosterProfiles: input.players.map((player) => mapPlayerToRosterProfile(player, team)),
    financeEvents: [],
    playerHistoryEvents: [],
  } as unknown as TeamDetailRecord;
}

export function mapFirestorePlayerToDetailRecord(input: {
  currentSeason?: FirestoreSeasonDoc | null;
  league: FirestoreLeagueDoc;
  player: FirestorePlayerDoc;
  playerStats?: FirestorePlayerStatDoc[];
  team?: FirestoreTeamDoc | null;
}): PlayerDetailRecord {
  const { player, team } = input;

  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    age: player.age,
    birthDate: normalizeDate(player.birthDate),
    heightCm: player.heightCm,
    weightKg: player.weightKg,
    yearsPro: player.yearsPro,
    college: player.college ?? null,
    nationality: player.nationality ?? null,
    dominantHand: player.dominantHand ?? null,
    status: player.status,
    injuryStatus: player.injury?.status ?? "HEALTHY",
    injuryName: player.injury?.name ?? null,
    injuryEndsOn: normalizeDate(player.injury?.endsOn),
    fatigue: player.condition?.fatigue ?? 0,
    morale: player.condition?.morale ?? 0,
    developmentTrait: player.developmentTrait ?? "NORMAL",
    saveGame: {
      currentSeason: input.currentSeason
        ? {
            id: input.currentSeason.id,
            year: input.currentSeason.year,
          }
        : null,
    },
    rosterProfile: player.roster?.teamId && team
      ? {
          team: mapTeamForPlayerRecord(team),
          primaryPosition: mapPosition(player.roster.primaryPosition),
          secondaryPosition: nullablePosition(player.roster.secondaryPosition),
          positionGroup: mapPositionGroup(player.roster.positionGroup),
          archetype: nullableName(player.roster.archetype),
          schemeFit: nullableScheme(player.roster.schemeFit),
          rosterStatus: player.roster.rosterStatus ?? "ACTIVE",
          depthChartSlot: player.roster.depthChartSlot ?? null,
          captainFlag: player.roster.captainFlag ?? false,
          developmentFocus: player.roster.developmentFocus ?? false,
          injuryRisk: 0,
          practiceSquadEligible: player.roster.practiceSquadEligible ?? null,
        }
      : null,
    evaluation: mapEvaluation(player),
    attributes: mapAttributes(player.attributes),
    contracts: mapContract(player),
    playerSeasonStats: (input.playerStats ?? []).map((stat) =>
      mapPlayerSeasonStat(stat, input.currentSeason, team),
    ),
    historyEvents: [],
    careerStat: null,
  } as unknown as PlayerDetailRecord;
}

function mapPlayerToRosterProfile(player: FirestorePlayerDoc, team: FirestoreTeamDoc) {
  return {
    primaryPosition: mapPosition(player.roster?.primaryPosition),
    secondaryPosition: nullablePosition(player.roster?.secondaryPosition),
    positionGroup: mapPositionGroup(player.roster?.positionGroup),
    archetype: nullableName(player.roster?.archetype),
    schemeFit: nullableScheme(player.roster?.schemeFit),
    rosterStatus: player.roster?.rosterStatus ?? "ACTIVE",
    depthChartSlot: player.roster?.depthChartSlot ?? null,
    captainFlag: player.roster?.captainFlag ?? false,
    developmentFocus: player.roster?.developmentFocus ?? false,
    player: {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      age: player.age,
      yearsPro: player.yearsPro,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      status: player.status,
      injuryStatus: player.injury?.status ?? "HEALTHY",
      injuryName: player.injury?.name ?? null,
      morale: player.condition?.morale ?? 0,
      fatigue: player.condition?.fatigue ?? 0,
      evaluation: mapEvaluation(player),
      attributes: mapAttributes(player.attributes),
      contracts: mapContract(player),
      playerSeasonStats: [],
    },
    team: mapTeamForPlayerRecord(team),
  };
}

function mapTeamForPlayerRecord(team: FirestoreTeamDoc) {
  return {
    id: team.id,
    city: team.city,
    nickname: team.nickname,
    abbreviation: team.abbreviation,
    offensiveSchemeFit: nullableScheme(team.schemes?.offense),
    defensiveSchemeFit: nullableScheme(team.schemes?.defense),
    specialTeamsSchemeFit: nullableScheme(team.schemes?.specialTeams),
  };
}

function mapEvaluation(player: FirestorePlayerDoc) {
  return player.evaluation
    ? {
        positionOverall: player.evaluation.positionOverall ?? 0,
        potentialRating: player.evaluation.potentialRating ?? 0,
        offensiveOverall: player.evaluation.offensiveOverall ?? null,
        defensiveOverall: player.evaluation.defensiveOverall ?? null,
        specialTeamsOverall: player.evaluation.specialTeamsOverall ?? null,
        physicalOverall: player.evaluation.physicalOverall ?? null,
        mentalOverall: player.evaluation.mentalOverall ?? null,
      }
    : null;
}

function mapAttributes(attributes: FirestorePlayerDoc["attributes"] = {}) {
  return Object.entries(attributes).map(([code, value], index) => {
    const normalizedCode = code.toUpperCase();

    return {
      value,
      attributeDefinition: {
        code: normalizedCode,
        name: titleCase(code),
        category: "GENERAL",
        sortOrder: index,
        description: null,
      },
    };
  });
}

function mapContract(player: FirestorePlayerDoc) {
  if (!player.activeContractSummary) {
    return [];
  }

  return [
    {
      years: player.activeContractSummary.years,
      yearlySalary: centsToCurrencyUnits(player.activeContractSummary.yearlySalaryCents),
      signingBonus: centsToCurrencyUnits(player.activeContractSummary.signingBonusCents),
      capHit: centsToCurrencyUnits(player.activeContractSummary.capHitCents),
      signedAt: normalizeDate(player.activeContractSummary.signedAt) ?? new Date(0),
    },
  ];
}

function mapPlayerSeasonStat(
  stat: FirestorePlayerStatDoc,
  currentSeason?: FirestoreSeasonDoc | null,
  team?: FirestoreTeamDoc | null,
) {
  return {
    season: {
      id: stat.seasonId ?? currentSeason?.id ?? "unknown-season",
      year: stat.seasonYear ?? currentSeason?.year ?? 0,
    },
    team: team
      ? {
          id: team.id,
          abbreviation: team.abbreviation,
          city: team.city,
          nickname: team.nickname,
        }
      : {
          id: stat.teamId ?? "unknown-team",
          abbreviation: "",
          city: "Unknown",
          nickname: "Team",
        },
    id: `${stat.seasonId ?? currentSeason?.id ?? "unknown-season"}_${stat.teamId ?? "unknown-team"}`,
    saveGameId: "",
    seasonId: stat.seasonId ?? currentSeason?.id ?? "unknown-season",
    teamId: stat.teamId ?? team?.id ?? "unknown-team",
    playerId: "",
    gamesPlayed: stat.stats?.gamesPlayed ?? 0,
    gamesStarted: stat.stats?.gamesStarted ?? 0,
    snapsOffense: 0,
    snapsDefense: 0,
    snapsSpecialTeams: 0,
    passing: null,
    rushing: stat.stats?.yards || stat.stats?.touchdowns
      ? {
          attempts: 0,
          yards: stat.stats.yards ?? 0,
          touchdowns: stat.stats.touchdowns ?? 0,
          fumbles: 0,
          longestRush: 0,
        }
      : null,
    receiving: null,
    blocking: null,
    defensive: stat.stats?.tackles
      ? {
          tackles: stat.stats.tackles,
          assistedTackles: 0,
          tacklesForLoss: 0,
          sacks: 0,
          interceptions: 0,
          forcedFumbles: 0,
          passesDefended: 0,
          coverageSnaps: 0,
          targetsAllowed: 0,
          receptionsAllowed: 0,
          yardsAllowed: 0,
        }
      : null,
    kicking: null,
    punting: null,
    returns: null,
  };
}

function nullableScheme(scheme?: { code?: string; name?: string } | null) {
  return scheme?.code || scheme?.name
    ? {
        code: scheme.code ?? "UNKNOWN",
        name: scheme.name ?? scheme.code ?? "Unknown",
      }
    : null;
}

function mapPosition(position?: { code?: string; name?: string } | null) {
  return {
    code: position?.code ?? "UNK",
    name: position?.name ?? "Unknown",
  };
}

function nullablePosition(position?: { code?: string; name?: string } | null) {
  return position ? mapPosition(position) : null;
}

function mapPositionGroup(positionGroup?: { code?: string; name?: string } | null) {
  return {
    code: positionGroup?.code ?? "GENERAL",
    name: positionGroup?.name ?? "General",
  };
}

function nullableName(value?: { name?: string } | null) {
  return value?.name
    ? {
        name: value.name,
      }
    : null;
}

function centsToCurrencyUnits(value?: number) {
  return Math.round((value ?? 0) / 100);
}

function normalizeDate(value?: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }

  return null;
}

function titleCase(value: string) {
  return value
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
