import {
  calculateTeamChemistryGameplayModifier,
} from "./online-league-metrics";
import {
  getStableOnlineNumberFromString as getStableNumberFromString,
} from "./online-league-derived-state";
import type {
  CoachingStaffProfile,
  FanbaseProfile,
  FranchiseFinanceProfile,
  GmJobSecurityScore,
  OnlineGmActivityMetrics,
  OnlineGmAdminRemovalState,
  OwnershipProfile,
  StadiumProfile,
  TeamChemistryProfile,
} from "./online-league-types";

const OWNER_PROFILE_TEMPLATES: Array<Omit<OwnershipProfile, "ownerId" | "ownerName">> = [
  {
    patience: 82,
    ambition: 52,
    financialPressure: 42,
    loyalty: 78,
    mediaSensitivity: 35,
    rebuildTolerance: 84,
  },
  {
    patience: 32,
    ambition: 88,
    financialPressure: 65,
    loyalty: 42,
    mediaSensitivity: 72,
    rebuildTolerance: 24,
  },
  {
    patience: 58,
    ambition: 72,
    financialPressure: 88,
    loyalty: 55,
    mediaSensitivity: 48,
    rebuildTolerance: 46,
  },
  {
    patience: 65,
    ambition: 68,
    financialPressure: 50,
    loyalty: 86,
    mediaSensitivity: 78,
    rebuildTolerance: 58,
  },
];

export function createDefaultOwnershipProfile(
  teamId: string,
  teamName: string,
): OwnershipProfile {
  const charTotal = Array.from(teamId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const template = OWNER_PROFILE_TEMPLATES[charTotal % OWNER_PROFILE_TEMPLATES.length];

  return {
    ownerId: `owner-${teamId}`,
    ownerName: `${teamName} Ownership Group`,
    ...template,
  };
}

export function createDefaultJobSecurityScore(
  currentWeek: number,
  currentSeason = 1,
): GmJobSecurityScore {
  return {
    score: 72,
    status: "stable",
    lastUpdatedWeek: currentWeek,
    lastUpdatedSeason: currentSeason,
    gmPerformanceHistory: [],
  };
}

export function createDefaultActivityMetrics(
  now = new Date().toISOString(),
): OnlineGmActivityMetrics {
  return {
    lastSeenAt: now,
    lastLeagueActionAt: now,
    missedWeeklyActions: 0,
    missedLineupSubmissions: 0,
    inactiveStatus: "active",
  };
}

export function createDefaultAdminRemovalState(): OnlineGmAdminRemovalState {
  return {
    status: "none",
  };
}

export function createDefaultStadiumProfile(
  teamId: string,
  teamName: string,
  cityName: string | undefined,
  season: number,
  now = new Date().toISOString(),
): StadiumProfile {
  const seed = getStableNumberFromString(teamId);
  const capacity = 35_000 + (seed % 56_000);

  return {
    stadiumId: `stadium-${teamId}`,
    teamId,
    name: `${teamName} Stadium`,
    city: cityName ?? "Local Market",
    capacity,
    condition: 60 + (seed % 31),
    comfort: 50 + (seed % 41),
    atmosphere: 50 + (seed % 46),
    ticketPriceLevel: 45 + (seed % 31),
    merchPriceLevel: 45 + ((seed + 11) % 31),
    parkingRevenueLevel: 35 + (seed % 41),
    concessionsQuality: 45 + (seed % 41),
    luxurySuitesLevel: 30 + (seed % 51),
    lastRenovatedSeason: season,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultFanbaseProfile(
  teamId: string,
  cityName: string | undefined,
  now = new Date().toISOString(),
): FanbaseProfile {
  const seed = getStableNumberFromString(`${teamId}-${cityName ?? ""}`);

  return {
    teamId,
    marketSize: 35 + (seed % 66),
    fanLoyalty: 45 + (seed % 46),
    fanMood: 58 + (seed % 18),
    expectations: 45 + (seed % 46),
    patience: 45 + (seed % 46),
    bandwagonFactor: 25 + (seed % 66),
    mediaPressure: 30 + (seed % 66),
    seasonTicketBase: 35 + (seed % 56),
    merchInterest: 35 + (seed % 56),
    rivalryIntensity: 35 + (seed % 61),
    updatedAt: now,
  };
}

export function createDefaultTeamChemistryProfile(
  teamId: string,
  currentWeek: number,
  currentSeason = 1,
  now = new Date().toISOString(),
): TeamChemistryProfile {
  const seed = getStableNumberFromString(teamId);
  const score = 56 + (seed % 14);

  return {
    teamId,
    score,
    playerSatisfaction: 58 + (seed % 16),
    gameplayModifier: calculateTeamChemistryGameplayModifier(score),
    recentTrend: 0,
    lastUpdatedSeason: currentSeason,
    lastUpdatedWeek: currentWeek,
    updatedAt: now,
  };
}

export function createDefaultFinanceProfile(
  teamId: string,
  now = new Date().toISOString(),
): FranchiseFinanceProfile {
  return {
    teamId,
    ticketRevenue: 0,
    concessionsRevenue: 0,
    parkingRevenue: 0,
    merchandiseRevenue: 0,
    sponsorshipRevenue: 0,
    mediaRevenue: 0,
    playoffRevenue: 0,
    totalRevenue: 0,
    playerPayroll: 0,
    staffPayroll: 0,
    stadiumMaintenance: 0,
    gameDayOperations: 0,
    travelCosts: 0,
    adminCosts: 0,
    totalExpenses: 0,
    weeklyProfitLoss: 0,
    seasonProfitLoss: 0,
    cashBalance: 25_000_000,
    ownerInvestment: 0,
    updatedAt: now,
  };
}

export function createDefaultCoachingStaffProfile(
  teamId: string,
  teamName: string,
): CoachingStaffProfile {
  const seed = getStableNumberFromString(`${teamId}-${teamName}`);
  const surnames = ["Keller", "Morgan", "Reeves", "Bennett", "Fischer", "Hayes"];
  const surname = surnames[seed % surnames.length];

  return {
    teamId,
    headCoachName: `${surname} Head Coach`,
    offensiveCoordinatorName: `${surname} OC`,
    defensiveCoordinatorName: `${surname} DC`,
    specialTeamsCoachName: `${surname} ST`,
    strengthCoachName: `${surname} Strength`,
    developmentCoachName: `${surname} Development`,
    offenseTraining: 48 + (seed % 35),
    defenseTraining: 46 + ((seed + 7) % 37),
    playerDevelopment: 45 + ((seed + 13) % 40),
    injuryPrevention: 48 + ((seed + 19) % 36),
    discipline: 45 + ((seed + 23) % 39),
    motivation: 48 + ((seed + 29) % 38),
    gamePreparation: 46 + ((seed + 31) % 40),
    adaptability: 45 + ((seed + 37) % 39),
  };
}
