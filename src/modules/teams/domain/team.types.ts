import type { PlayerSpotlightRating } from "@/modules/players/domain/player-rating";

export type TeamNeedSummary = {
  positionCode: string;
  positionName: string;
  starterAverage: number;
  starterSchemeFit: number | null;
  playerCount: number;
  targetCount: number;
  needScore: number;
};

export type TeamPlayerSummary = {
  id: string;
  fullName: string;
  age: number;
  yearsPro: number;
  heightCm: number;
  weightKg: number;
  positionCode: string;
  positionName: string;
  secondaryPositionCode: string | null;
  secondaryPositionName: string | null;
  positionGroupName: string;
  archetypeName: string | null;
  schemeFitName: string | null;
  rosterStatus: string;
  depthChartSlot: number | null;
  captainFlag: boolean;
  developmentFocus: boolean;
  schemeFitScore: number | null;
  positionOverall: number;
  potentialRating: number;
  physicalOverall: number;
  mentalOverall: number;
  detailRatings: PlayerSpotlightRating[];
  status: string;
  injuryStatus: string;
  injuryName: string | null;
  morale: number;
  fatigue: number;
  keyAttributes: {
    speed: number;
    strength: number;
    awareness: number;
    leadership: number;
    discipline: number;
    durability: number;
    mobility: number;
    hands: number;
    coverageRange: number;
    linebackerCoverage: number;
    linebackerManCoverage: number;
    linebackerZoneCoverage: number;
    kickConsistency: number;
    returnVision: number;
    snapAccuracy: number;
    snapVelocity: number;
  };
  currentContract: {
    years: number;
    yearlySalary: number;
    signingBonus: number;
    capHit: number;
  } | null;
  developmentHistory?: Array<{
    id: string;
    type: string;
    week: number | null;
    title: string;
    description: string | null;
    occurredAt: Date;
  }>;
  seasonLine: {
    gamesPlayed: number;
    passingYards: number;
    passingTouchdowns: number;
    passingInterceptions: number;
    rushingYards: number;
    rushingTouchdowns: number;
    receivingYards: number;
    receptions: number;
    receivingTouchdowns: number;
    tackles: number;
    sacks: number;
    passesDefended: number;
    interceptions: number;
    targetsAllowed: number;
    receptionsAllowed: number;
    yardsAllowed: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    punts: number;
    puntsInside20: number;
    returnYards: number;
    returnTouchdowns: number;
    returnFumbles: number;
  };
};

export type TeamDetail = {
  id: string;
  name: string;
  abbreviation: string;
  conferenceName: string;
  divisionName: string;
  managerControlled: boolean;
  schemes: {
    offense: string | null;
    defense: string | null;
    specialTeams: string | null;
  };
  overallRating: number;
  morale: number;
  cashBalance: number;
  salaryCapSpace: number;
  currentRecord: string;
  contractOutlook: {
    activeCapCommitted: number;
    expiringCap: number;
    expiringPlayers: Array<{
      id: string;
      fullName: string;
      positionCode: string;
      years: number;
      capHit: number;
    }>;
  };
  recentFinanceEvents: Array<{
    id: string;
    type: string;
    amount: number;
    capImpact: number;
    cashBalanceAfter: number;
    description: string | null;
    occurredAt: Date;
    playerName: string | null;
  }>;
  recentDecisionEvents: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    occurredAt: Date;
    playerName: string | null;
  }>;
  teamNeeds: TeamNeedSummary[];
  players: TeamPlayerSummary[];
};
