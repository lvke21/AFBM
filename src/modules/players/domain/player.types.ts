import type {
  PlayerCompositeRatings,
  PlayerSpotlightRating,
} from "@/modules/players/domain/player-rating";

export type PlayerAttributeGroup = {
  category: string;
  label: string;
  attributes: Array<{
    code: string;
    name: string;
    value: number;
    description: string | null;
  }>;
};

export type PlayerDetail = {
  id: string;
  fullName: string;
  age: number;
  birthDate: Date | null;
  heightCm: number;
  weightKg: number;
  yearsPro: number;
  college: string | null;
  nationality: string | null;
  dominantHand: string | null;
  status: string;
  injuryStatus: string;
  injuryName: string | null;
  injuryEndsOn: Date | null;
  fatigue: number;
  morale: number;
  developmentTrait: string;
  team: {
    id: string;
    name: string;
    abbreviation: string;
  } | null;
  roster: {
    primaryPositionCode: string;
    primaryPositionName: string;
    secondaryPositionCode: string | null;
    secondaryPositionName: string | null;
    positionGroupName: string;
    rosterStatus: string;
    depthChartSlot: number | null;
    captainFlag: boolean;
    developmentFocus: boolean;
    injuryRisk: number;
    practiceSquadEligible: boolean | null;
    archetypeName: string | null;
    schemeFitName: string | null;
  } | null;
  teamSchemes: {
    offense: string | null;
    defense: string | null;
    specialTeams: string | null;
  } | null;
  schemeFitScore: number | null;
  evaluation: {
    positionOverall: number;
    potentialRating: number;
    offensiveOverall: number | null;
    defensiveOverall: number | null;
    specialTeamsOverall: number | null;
    physicalOverall: number | null;
    mentalOverall: number | null;
  } | null;
  currentContract: {
    years: number;
    yearlySalary: number;
    signingBonus: number;
    capHit: number;
    signedAt: Date;
  } | null;
  history: Array<{
    id: string;
    type: string;
    week: number | null;
    title: string;
    description: string | null;
    occurredAt: Date;
  }>;
  detailRatings: PlayerSpotlightRating[];
  compositeRatings: PlayerCompositeRatings;
  attributeGroups: PlayerAttributeGroup[];
  latestSeason: {
    label: string;
    isCurrentTeamSeason: boolean;
    year: number;
    teamName: string;
    gamesPlayed: number;
    gamesStarted: number;
    snapsOffense: number;
    snapsDefense: number;
    snapsSpecialTeams: number;
    passing: {
      attempts: number;
      completions: number;
      yards: number;
      touchdowns: number;
      interceptions: number;
      longestCompletion: number;
    };
    rushing: {
      attempts: number;
      yards: number;
      touchdowns: number;
      fumbles: number;
      longestRush: number;
    };
    receiving: {
      targets: number;
      receptions: number;
      yards: number;
      touchdowns: number;
      drops: number;
      longestReception: number;
      yardsAfterCatch: number;
    };
    blocking: {
      passBlockSnaps: number;
      runBlockSnaps: number;
      sacksAllowed: number;
      pressuresAllowed: number;
      pancakes: number;
    };
    defensive: {
      tackles: number;
      assistedTackles: number;
      tacklesForLoss: number;
      sacks: number;
      interceptions: number;
      forcedFumbles: number;
      passesDefended: number;
      coverageSnaps: number;
      targetsAllowed: number;
      receptionsAllowed: number;
      yardsAllowed: number;
    };
    kicking: {
      fieldGoalsMade: number;
      fieldGoalsAttempted: number;
      fieldGoalsMadeShort: number;
      fieldGoalsAttemptedShort: number;
      fieldGoalsMadeMid: number;
      fieldGoalsAttemptedMid: number;
      fieldGoalsMadeLong: number;
      fieldGoalsAttemptedLong: number;
      extraPointsMade: number;
      extraPointsAttempted: number;
      longestFieldGoal: number;
    };
    punting: {
      punts: number;
      puntYards: number;
      netPuntYards: number;
      fairCatchesForced: number;
      hangTimeTotalTenths: number;
      puntsInside20: number;
      longestPunt: number;
    };
    returns: {
      kickReturns: number;
      kickReturnYards: number;
      kickReturnTouchdowns: number;
      kickReturnFumbles: number;
      puntReturns: number;
      puntReturnYards: number;
      puntReturnTouchdowns: number;
      puntReturnFumbles: number;
    };
  } | null;
  career: {
    gamesPlayed: number;
    gamesStarted: number;
    snapsOffense: number;
    snapsDefense: number;
    snapsSpecialTeams: number;
    passing: {
      attempts: number;
      completions: number;
      yards: number;
      touchdowns: number;
      interceptions: number;
      longestCompletion: number;
    };
    rushing: {
      attempts: number;
      yards: number;
      touchdowns: number;
      fumbles: number;
      longestRush: number;
    };
    receiving: {
      targets: number;
      receptions: number;
      yards: number;
      touchdowns: number;
      drops: number;
      longestReception: number;
      yardsAfterCatch: number;
    };
    defensive: {
      tackles: number;
      sacks: number;
      interceptions: number;
      forcedFumbles: number;
      passesDefended: number;
      coverageSnaps: number;
      targetsAllowed: number;
      receptionsAllowed: number;
      yardsAllowed: number;
    };
    blocking: {
      passBlockSnaps: number;
      runBlockSnaps: number;
      sacksAllowed: number;
      pressuresAllowed: number;
      pancakes: number;
    };
    kicking: {
      fieldGoalsMade: number;
      fieldGoalsAttempted: number;
      fieldGoalsMadeShort: number;
      fieldGoalsAttemptedShort: number;
      fieldGoalsMadeMid: number;
      fieldGoalsAttemptedMid: number;
      fieldGoalsMadeLong: number;
      fieldGoalsAttemptedLong: number;
      extraPointsMade: number;
      extraPointsAttempted: number;
      longestFieldGoal: number;
    };
    punting: {
      punts: number;
      puntYards: number;
      netPuntYards: number;
      fairCatchesForced: number;
      hangTimeTotalTenths: number;
      puntsInside20: number;
      longestPunt: number;
    };
    returns: {
      kickReturns: number;
      kickReturnYards: number;
      kickReturnTouchdowns: number;
      kickReturnFumbles: number;
      puntReturns: number;
      puntReturnYards: number;
      puntReturnTouchdowns: number;
      puntReturnFumbles: number;
    };
  } | null;
};
