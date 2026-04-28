import { selectAiTeamStrategy } from "@/modules/gameplay/domain/ai-team-strategy";
import { calculateWeeklyTrainingXp } from "@/modules/players/domain/player-progression";
import { MatchKind, PlayerStatus, InjuryStatus } from "@/modules/shared/domain/enums";

import { prepareTeamForSimulation } from "./depth-chart";
import { generateMatchStats } from "./match-engine";
import { buildPlayerConditionUpdate, buildWeeklyRecoveryUpdate } from "./player-condition";
import {
  average,
  buildProductionSimulationTeam,
  cloneProductionTeam,
  percentile,
  standardDeviation,
} from "./production-qa-suite";
import type {
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationTeamContext,
} from "./simulation.types";

export type ExtendedSeasonTeamProfile = "EQUAL" | "MEDIUM" | "STRONG" | "WEAK";
export type ExtendedSeasonScheduleVariant =
  | "balanced-rotation"
  | "legacy"
  | "randomized"
  | "round-robin";

export type ExtendedSeasonBalanceOptions = {
  scheduleSeed?: string;
  scheduleVariant?: ExtendedSeasonScheduleVariant;
  seasons?: number;
  weeksPerSeason?: number;
};

export type ExtendedSeasonScenarioResult = {
  averageAwayScore: number;
  averageFatigue: number;
  averageHomeScore: number;
  averageMargin: number;
  averageProgressionXp: number;
  averageScore: number;
  blowoutRate: number;
  closeGameRate: number;
  favoriteWinRate: number | null;
  gameCount: number;
  homeWinRate: number;
  injuryRate: number;
  name: string;
  severeInjuryRate: number;
};

export type ExtendedSeasonStrategyResult = {
  archetype: string;
  averageScore: number;
  games: number;
  winRate: number;
};

export type ExtendedSeasonDiagnosticBucket = {
  averageLoserScore: number;
  averageMargin: number;
  averageScore: number;
  averageWinnerScore: number;
  blowoutRate: number;
  closeGameRate: number;
  games: number;
  key: string;
};

export type ExtendedSeasonMarginCorrelation = {
  factor: string;
  correlation: number;
};

export type ExtendedSeasonScoreSpikePattern = {
  averageMargin: number;
  games: number;
  rate: number;
  type: string;
};

export type ExtendedSeasonMarginDiagnostics = {
  byAiArchetypePair: ExtendedSeasonDiagnosticBucket[];
  byAvailabilityBand: ExtendedSeasonDiagnosticBucket[];
  byBackupUsageBand: ExtendedSeasonDiagnosticBucket[];
  byEffectiveDepthRatingBand: ExtendedSeasonDiagnosticBucket[];
  byFatigueBand: ExtendedSeasonDiagnosticBucket[];
  byHomeAwayWinner: ExtendedSeasonDiagnosticBucket[];
  byInjuryCountBand: ExtendedSeasonDiagnosticBucket[];
  byLongTermPhase: ExtendedSeasonDiagnosticBucket[];
  byProfilePair: ExtendedSeasonDiagnosticBucket[];
  byWeek: ExtendedSeasonDiagnosticBucket[];
  correlations: ExtendedSeasonMarginCorrelation[];
  escalation: {
    firstWeekWithBlowoutRateAtLeast50: number | null;
    firstWeekWithMarginAtLeast24: number | null;
    highestMarginWeek: number | null;
  };
  scoreSpikePatterns: ExtendedSeasonScoreSpikePattern[];
};

export type ExtendedSeasonBalanceRun = {
  availability: {
    byTeam: Array<{
      averageAvailabilityIndex: number;
      averageBackupFatigue: number;
      averageBackupUsageRate: number;
      averageEffectiveDepthRating: number;
      averageStarterFatigue: number;
      averageStarterLossCount: number;
      maxStarterLossCount: number;
      samples: number;
      teamId: string;
      teamProfile: ExtendedSeasonTeamProfile;
    }>;
    byWeek: Array<{
      averageAvailabilityIndex: number;
      averageBackupUsageRate: number;
      averageEffectiveDepthRating: number;
      averageStarterLossCount: number;
      samples: number;
      week: number;
    }>;
  };
  diagnostics: ExtendedSeasonMarginDiagnostics;
  fingerprint: string;
  generatedAt: string;
  metrics: {
    averageMargin: number;
    averageScore: number;
    blowoutRate: number;
    closeGameRate: number;
    fatigueP10: number;
    fatigueMedian: number;
    fatigueP90: number;
    games: number;
    injuryRate: number;
    progressionXpAverage: number;
    scoreStdDev: number;
    severeInjuryRate: number;
  };
  schedule: {
    fairness: {
      averageOpponentRatingSpread: number;
      gamesPerTeamSpread: number;
      maxGamesPerOpponentPair: number;
      minGamesPerOpponentPair: number;
    };
    matchups: Array<{
      awayGames: number;
      games: number;
      homeGames: number;
      pair: string;
      profiles: string;
    }>;
    seed: string;
    strengthOfSchedule: Array<{
      averageOpponentRating: number;
      games: number;
      homeGames: number;
      awayGames: number;
      opponentProfiles: Record<ExtendedSeasonTeamProfile, number>;
      opponentRatings: Record<string, number>;
      ratingDeltaAverage: number;
      teamId: string;
      teamProfile: ExtendedSeasonTeamProfile;
      teamRating: number;
    }>;
    variant: ExtendedSeasonScheduleVariant;
  };
  scenarios: ExtendedSeasonScenarioResult[];
  seasons: number;
  strategies: ExtendedSeasonStrategyResult[];
  teams: Array<{
    averageFatigue: number;
    losses: number;
    newInjuries: number;
    profile: ExtendedSeasonTeamProfile;
    severeInjuries: number;
    teamId: string;
    winRate: number;
    wins: number;
  }>;
  weeksPerSeason: number;
};

type MutableTeamState = SimulationTeamContext & {
  fatigueSamples: number[];
  losses: number;
  newInjuries: number;
  profile: ExtendedSeasonTeamProfile;
  progressionXp: number[];
  severeInjuries: number;
  wins: number;
};

type ScenarioAccumulator = {
  awayScores: number[];
  fatigue: number[];
  favoriteWins: number;
  games: number;
  homeScores: number[];
  injuries: number;
  margins: number[];
  name: string;
  progressionXp: number[];
  severeInjuries: number;
};

type StrategyAccumulator = {
  games: number;
  scores: number[];
  wins: number;
};

type ScheduleTeamAccumulator = {
  awayGames: number;
  games: number;
  homeGames: number;
  opponentProfiles: Record<ExtendedSeasonTeamProfile, number>;
  opponentRatings: Record<string, number>;
  opponentRatingSamples: number[];
  ratingDeltaSamples: number[];
  teamId: string;
  teamProfile: ExtendedSeasonTeamProfile;
  teamRating: number;
};

type ScheduleMatchupAccumulator = {
  awayGames: number;
  firstTeamId: string;
  firstTeamProfile: ExtendedSeasonTeamProfile;
  games: number;
  homeGames: number;
  secondTeamId: string;
  secondTeamProfile: ExtendedSeasonTeamProfile;
};

type ScheduleAccumulator = {
  matchups: Map<string, ScheduleMatchupAccumulator>;
  teams: Map<string, ScheduleTeamAccumulator>;
};

type DiagnosticGameRecord = {
  aiArchetypePair: string;
  availabilityIndexDiffAbs: number;
  availabilityIndexMin: number;
  awayAverageFatigue: number;
  awayAvailabilityIndex: number;
  awayBackupUsageRate: number;
  awayEffectiveDepthRating: number;
  awayInjuryCount: number;
  awayStarterLossCount: number;
  awayScore: number;
  backupUsageRateMax: number;
  effectiveDepthRatingDiffAbs: number;
  effectiveDepthRatingMin: number;
  fatigueBand: string;
  fatigueDiffAbs: number;
  gameIndex: number;
  homeAverageFatigue: number;
  homeAvailabilityIndex: number;
  homeBackupUsageRate: number;
  homeEffectiveDepthRating: number;
  homeInjuryCount: number;
  homeStarterLossCount: number;
  homeScore: number;
  injuryCountBand: string;
  injuryDiffAbs: number;
  loserScore: number;
  margin: number;
  maxAverageFatigue: number;
  profilePair: string;
  season: number;
  totalInjuryCount: number;
  totalStarterLossCount: number;
  totalScore: number;
  week: number;
  weekIndex: number;
  winnerScore: number;
  winnerVenue: "AWAY" | "HOME" | "TIE";
};

type AvailabilitySnapshot = {
  availabilityIndex: number;
  backupFatigue: number;
  backupUsageRate: number;
  effectiveDepthRating: number;
  starterFatigue: number;
  starterLossCount: number;
};

type AvailabilityTeamWeekRecord = AvailabilitySnapshot & {
  teamId: string;
  teamProfile: ExtendedSeasonTeamProfile;
  week: number;
};

const DEFAULT_SEASONS = 18;
const DEFAULT_WEEKS_PER_SEASON = 14;
const DEFAULT_SCHEDULE_SEED = "extended-season-balance";
const DEFAULT_SCHEDULE_VARIANT: ExtendedSeasonScheduleVariant = "balanced-rotation";
const BLOWOUT_MARGIN = 24;
const CLOSE_MARGIN = 7;

const TEAM_DEFINITIONS: Array<{
  city: string;
  id: string;
  nickname: string;
  prestige: number;
  profile: ExtendedSeasonTeamProfile;
  rosterIndex: number;
}> = [
  { id: "STR1", city: "Strong City", nickname: "Anchors", rosterIndex: 4, prestige: 84, profile: "STRONG" },
  { id: "STR2", city: "North Strong", nickname: "Pilots", rosterIndex: 5, prestige: 82, profile: "STRONG" },
  { id: "MED1", city: "Middle City", nickname: "Comets", rosterIndex: 2, prestige: 76, profile: "MEDIUM" },
  { id: "MED2", city: "Metro Middle", nickname: "Voyagers", rosterIndex: 6, prestige: 75, profile: "MEDIUM" },
  { id: "WEK1", city: "Weak City", nickname: "Rivals", rosterIndex: 3, prestige: 68, profile: "WEAK" },
  { id: "WEK2", city: "South Weak", nickname: "Bears", rosterIndex: 7, prestige: 69, profile: "WEAK" },
  { id: "EQL1", city: "Equal East", nickname: "Titans", rosterIndex: 1, prestige: 74, profile: "EQUAL" },
  { id: "EQL2", city: "Equal West", nickname: "Guardians", rosterIndex: 0, prestige: 74, profile: "EQUAL" },
];

const WEEK_PAIRINGS = [
  [0, 4],
  [1, 5],
  [2, 3],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
] as const;

const ROUND_ROBIN_PAIRINGS = [
  [
    [0, 7],
    [1, 6],
    [2, 5],
    [3, 4],
  ],
  [
    [0, 6],
    [7, 5],
    [1, 4],
    [2, 3],
  ],
  [
    [0, 5],
    [6, 4],
    [7, 3],
    [1, 2],
  ],
  [
    [0, 4],
    [5, 3],
    [6, 2],
    [7, 1],
  ],
  [
    [0, 3],
    [4, 2],
    [5, 1],
    [6, 7],
  ],
  [
    [0, 2],
    [3, 1],
    [4, 7],
    [5, 6],
  ],
  [
    [0, 1],
    [2, 7],
    [3, 6],
    [4, 5],
  ],
] as const;

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function makeSeededRandom(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let value = hash;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledTeamIndexes(seed: string) {
  const random = makeSeededRandom(seed);
  const indexes = TEAM_DEFINITIONS.map((_, index) => index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = indexes[index];
    const swap = indexes[swapIndex];

    if (current == null || swap == null) {
      continue;
    }

    indexes[index] = swap;
    indexes[swapIndex] = current;
  }

  return indexes;
}

function pairKey(first: MutableTeamState, second: MutableTeamState) {
  return [first.id, second.id].sort().join("-vs-");
}

function averagePlayerFatigue(team: MutableTeamState) {
  return average(team.roster.map((player) => player.fatigue));
}

function activeInjuryCount(team: MutableTeamState) {
  return team.roster.filter((player) => player.injuryStatus !== InjuryStatus.HEALTHY).length;
}

function fatigueBand(value: number) {
  if (value >= 90) {
    return "90+";
  }

  if (value >= 70) {
    return "70-89";
  }

  if (value >= 50) {
    return "50-69";
  }

  if (value >= 30) {
    return "30-49";
  }

  return "0-29";
}

function injuryCountBand(value: number) {
  if (value >= 12) {
    return "12+";
  }

  if (value >= 8) {
    return "8-11";
  }

  if (value >= 4) {
    return "4-7";
  }

  if (value >= 1) {
    return "1-3";
  }

  return "0";
}

function availabilityBand(value: number) {
  if (value >= 0.95) {
    return "95-100";
  }

  if (value >= 0.85) {
    return "85-94";
  }

  if (value >= 0.75) {
    return "75-84";
  }

  return "under-75";
}

function backupUsageBand(value: number) {
  if (value >= 0.3) {
    return "30-plus";
  }

  if (value >= 0.2) {
    return "20-29";
  }

  if (value >= 0.1) {
    return "10-19";
  }

  return "0-9";
}

function effectiveDepthRatingBand(value: number) {
  if (value >= 80) {
    return "80-plus";
  }

  if (value >= 75) {
    return "75-79";
  }

  if (value >= 70) {
    return "70-74";
  }

  return "under-70";
}

function longTermPhase(record: DiagnosticGameRecord, totalGames: number) {
  const ratio = (record.gameIndex + 1) / Math.max(1, totalGames);

  if (ratio <= 1 / 3) {
    return "early";
  }

  if (ratio <= 2 / 3) {
    return "middle";
  }

  return "late";
}

function summarizeAvailability(team: MutableTeamState, simulationSeed: string): AvailabilitySnapshot {
  const prepared = prepareTeamForSimulation(team, simulationSeed);
  const gameDayEligible = team.roster.filter((player) => player.rosterStatus !== "PRACTICE_SQUAD");
  const availableRoster = gameDayEligible.filter(
    (player) =>
      player.status === PlayerStatus.ACTIVE &&
      player.injuryStatus !== InjuryStatus.OUT &&
      player.injuryStatus !== InjuryStatus.INJURED_RESERVE,
  );
  const expectedStarters = gameDayEligible.filter((player) => player.rosterStatus === "STARTER");
  const participantIds = new Set(prepared.participants.map((player) => player.id));
  const starterPlayers = prepared.participants.filter((player) => prepared.starterIds.has(player.id));
  const backupStarters = starterPlayers.filter((player) => player.rosterStatus !== "STARTER");
  const backupParticipants = prepared.participants.filter((player) => player.rosterStatus !== "STARTER");
  const weightedStarterRatings = starterPlayers.map((player) =>
    player.positionOverall * player.gameDayReadinessMultiplier,
  );

  return {
    availabilityIndex: round(availableRoster.length / Math.max(1, gameDayEligible.length), 3),
    backupFatigue: round(average(backupParticipants.map((player) => player.fatigue))),
    backupUsageRate: round(backupStarters.length / Math.max(1, prepared.starterIds.size), 3),
    effectiveDepthRating: round(average(weightedStarterRatings)),
    starterFatigue: round(average(expectedStarters.map((player) => player.fatigue))),
    starterLossCount: expectedStarters.filter((player) => !participantIds.has(player.id)).length,
  };
}

function makeTeamState(definition: typeof TEAM_DEFINITIONS[number]): MutableTeamState {
  const base = buildProductionSimulationTeam(
    definition.id,
    definition.city,
    definition.nickname,
    definition.rosterIndex,
    definition.prestige,
  );

  return {
    ...cloneProductionTeam(base),
    fatigueSamples: [],
    losses: 0,
    newInjuries: 0,
    profile: definition.profile,
    progressionXp: [],
    severeInjuries: 0,
    wins: 0,
  };
}

function selectDevelopmentFocusIds(team: MutableTeamState, season: number, week: number) {
  return [...team.roster]
    .filter((player) => player.rosterStatus !== "PRACTICE_SQUAD")
    .sort((left, right) => {
      const leftGap = left.potentialRating - left.positionOverall;
      const rightGap = right.potentialRating - right.positionOverall;
      const rotation = ((week + season + left.id.length) % 3) - ((week + season + right.id.length) % 3);

      return rightGap - leftGap || rotation || right.positionOverall - left.positionOverall;
    })
    .slice(0, 3)
    .map((player) => player.id);
}

function prepareWeek(team: MutableTeamState, scheduledAt: Date, season: number, week: number) {
  const focusIds = new Set(selectDevelopmentFocusIds(team, season, week));

  team.roster = team.roster.map((player) => {
    const recovered = player.injuryEndsOn && player.injuryEndsOn.getTime() <= scheduledAt.getTime();
    const injuryStatus = recovered ? InjuryStatus.HEALTHY : player.injuryStatus as InjuryStatus;
    const recovery = buildWeeklyRecoveryUpdate({
      fatigue: player.fatigue,
      morale: player.morale,
      status: recovered ? PlayerStatus.ACTIVE : player.status as PlayerStatus,
      injuryStatus,
    });
    const developmentFocus = focusIds.has(player.id);
    const nextPlayer = {
      ...player,
      developmentFocus,
      fatigue: recovery.fatigue,
      morale: recovery.morale,
      ...(recovered
        ? {
            status: PlayerStatus.ACTIVE,
            injuryStatus: InjuryStatus.HEALTHY,
            injuryName: null,
            injuryEndsOn: null,
          }
        : {}),
    };
    const xp = calculateWeeklyTrainingXp(nextPlayer);

    team.progressionXp.push(xp);

    return nextPlayer;
  });
}

function applyAiGameplans(context: SimulationMatchContext): SimulationMatchContext {
  const homeStrategy = selectAiTeamStrategy({
    team: context.homeTeam,
    opponent: context.awayTeam,
    isHomeTeam: true,
  });
  const awayStrategy = selectAiTeamStrategy({
    team: context.awayTeam,
    opponent: context.homeTeam,
    isHomeTeam: false,
  });

  return {
    ...context,
    teamGameplans: {
      [context.homeTeam.id]: {
        aiStrategyArchetype: homeStrategy.archetype,
        offenseXFactorPlan: homeStrategy.offenseXFactorPlan,
        defenseXFactorPlan: homeStrategy.defenseXFactorPlan,
      },
      [context.awayTeam.id]: {
        aiStrategyArchetype: awayStrategy.archetype,
        offenseXFactorPlan: awayStrategy.offenseXFactorPlan,
        defenseXFactorPlan: awayStrategy.defenseXFactorPlan,
      },
    },
  };
}

function scenarioName(home: MutableTeamState, away: MutableTeamState) {
  if (home.profile === away.profile) {
    return `${home.profile.toLowerCase()}-vs-${away.profile.toLowerCase()}`;
  }

  return `${home.profile.toLowerCase()}-vs-${away.profile.toLowerCase()}`;
}

function pairingsForWeek(input: {
  scheduleSeed: string;
  season: number;
  variant: ExtendedSeasonScheduleVariant;
  week: number;
}) {
  if (input.variant === "legacy") {
    return WEEK_PAIRINGS.map(([first, second]) => [first, second] as const);
  }

  if (input.variant === "randomized") {
    const indexes = shuffledTeamIndexes(`${input.scheduleSeed}:${input.season}:${input.week}`);
    const pairings: Array<readonly [number, number]> = [];

    for (let index = 0; index < indexes.length; index += 2) {
      const first = indexes[index];
      const second = indexes[index + 1];

      if (first != null && second != null) {
        pairings.push([first, second] as const);
      }
    }

    return pairings;
  }

  const roundIndex = (input.week - 1) % ROUND_ROBIN_PAIRINGS.length;
  const pairings = ROUND_ROBIN_PAIRINGS[roundIndex] ?? ROUND_ROBIN_PAIRINGS[0];

  if (input.variant === "round-robin") {
    return pairings.map(([first, second]) => [first, second] as const);
  }

  const cycle = Math.floor((input.week - 1) / ROUND_ROBIN_PAIRINGS.length);

  return pairings.map(([first, second], slot) => {
    const shouldFlip = (input.season + cycle + slot) % 2 === 1;

    return shouldFlip ? ([second, first] as const) : ([first, second] as const);
  });
}

function createScheduleAccumulator(teams: MutableTeamState[]): ScheduleAccumulator {
  return {
    matchups: new Map(),
    teams: new Map(
      teams.map((team) => [
        team.id,
        {
          awayGames: 0,
          games: 0,
          homeGames: 0,
          opponentProfiles: {
            EQUAL: 0,
            MEDIUM: 0,
            STRONG: 0,
            WEAK: 0,
          },
          opponentRatings: {},
          opponentRatingSamples: [],
          ratingDeltaSamples: [],
          teamId: team.id,
          teamProfile: team.profile,
          teamRating: team.overallRating,
        },
      ]),
    ),
  };
}

function recordTeamSchedule(
  accumulator: ScheduleAccumulator,
  team: MutableTeamState,
  opponent: MutableTeamState,
  venue: "away" | "home",
) {
  const entry = accumulator.teams.get(team.id);

  if (!entry) {
    return;
  }

  entry.games += 1;
  entry.homeGames += venue === "home" ? 1 : 0;
  entry.awayGames += venue === "away" ? 1 : 0;
  entry.opponentProfiles[opponent.profile] += 1;
  entry.opponentRatings[opponent.id] = (entry.opponentRatings[opponent.id] ?? 0) + 1;
  entry.opponentRatingSamples.push(opponent.overallRating);
  entry.ratingDeltaSamples.push(team.overallRating - opponent.overallRating);
}

function recordScheduleGame(
  accumulator: ScheduleAccumulator,
  home: MutableTeamState,
  away: MutableTeamState,
) {
  recordTeamSchedule(accumulator, home, away, "home");
  recordTeamSchedule(accumulator, away, home, "away");

  const [first, second] = [home, away].sort((left, right) => left.id.localeCompare(right.id));
  const key = pairKey(home, away);
  const entry = accumulator.matchups.get(key) ?? {
    awayGames: 0,
    firstTeamId: first?.id ?? home.id,
    firstTeamProfile: first?.profile ?? home.profile,
    games: 0,
    homeGames: 0,
    secondTeamId: second?.id ?? away.id,
    secondTeamProfile: second?.profile ?? away.profile,
  };

  entry.games += 1;
  entry.homeGames += home.id === entry.firstTeamId ? 1 : 0;
  entry.awayGames += away.id === entry.firstTeamId ? 1 : 0;
  accumulator.matchups.set(key, entry);
}

function summarizeSchedule(
  accumulator: ScheduleAccumulator,
  variant: ExtendedSeasonScheduleVariant,
  seed: string,
): ExtendedSeasonBalanceRun["schedule"] {
  const strengthOfSchedule = [...accumulator.teams.values()]
    .map((entry) => ({
      averageOpponentRating: round(average(entry.opponentRatingSamples)),
      awayGames: entry.awayGames,
      games: entry.games,
      homeGames: entry.homeGames,
      opponentProfiles: entry.opponentProfiles,
      opponentRatings: entry.opponentRatings,
      ratingDeltaAverage: round(average(entry.ratingDeltaSamples)),
      teamId: entry.teamId,
      teamProfile: entry.teamProfile,
      teamRating: entry.teamRating,
    }))
    .sort((left, right) => left.teamId.localeCompare(right.teamId));
  const averageOpponentRatings = strengthOfSchedule.map((entry) => entry.averageOpponentRating);
  const gamesPerTeam = strengthOfSchedule.map((entry) => entry.games);
  const matchupGames = [...accumulator.matchups.values()].map((entry) => entry.games);

  return {
    fairness: {
      averageOpponentRatingSpread: round(Math.max(...averageOpponentRatings) - Math.min(...averageOpponentRatings)),
      gamesPerTeamSpread: Math.max(...gamesPerTeam) - Math.min(...gamesPerTeam),
      maxGamesPerOpponentPair: Math.max(...matchupGames),
      minGamesPerOpponentPair: Math.min(...matchupGames),
    },
    matchups: [...accumulator.matchups.values()]
      .map((entry) => ({
        awayGames: entry.awayGames,
        games: entry.games,
        homeGames: entry.homeGames,
        pair: `${entry.firstTeamId}-vs-${entry.secondTeamId}`,
        profiles: `${entry.firstTeamProfile}-vs-${entry.secondTeamProfile}`,
      }))
      .sort((left, right) => left.pair.localeCompare(right.pair)),
    seed,
    strengthOfSchedule,
    variant,
  };
}

function getAccumulator(map: Map<string, ScenarioAccumulator>, name: string) {
  const existing = map.get(name);

  if (existing) {
    return existing;
  }

  const next: ScenarioAccumulator = {
    awayScores: [],
    fatigue: [],
    favoriteWins: 0,
    games: 0,
    homeScores: [],
    injuries: 0,
    margins: [],
    name,
    progressionXp: [],
    severeInjuries: 0,
  };

  map.set(name, next);

  return next;
}

function applyResult(team: MutableTeamState, result: MatchSimulationResult, scheduledAt: Date) {
  const lines = new Map(
    result.playerLines.filter((line) => line.teamId === team.id).map((line) => [line.playerId, line]),
  );

  team.roster = team.roster.map((player) => {
    const line = lines.get(player.id);

    if (!line) {
      return player;
    }

    const wasHealthy = player.injuryStatus === InjuryStatus.HEALTHY;
    const update = buildPlayerConditionUpdate(player, line, result, scheduledAt);
    const becameInjured = wasHealthy && update.injuryStatus !== InjuryStatus.HEALTHY;

    if (becameInjured) {
      team.newInjuries += 1;
      if (
        update.injuryStatus === InjuryStatus.OUT ||
        update.injuryStatus === InjuryStatus.INJURED_RESERVE
      ) {
        team.severeInjuries += 1;
      }
    }

    team.fatigueSamples.push(update.fatigue);

    return {
      ...player,
      fatigue: update.fatigue,
      injuryEndsOn: update.injuryEndsOn,
      injuryName: update.injuryName,
      injuryStatus: update.injuryStatus,
      morale: update.morale,
      status: update.status,
    };
  });
}

function recordStrategy(
  strategies: Map<string, StrategyAccumulator>,
  archetype: string | undefined,
  score: number,
  won: boolean,
) {
  const key = archetype ?? "UNKNOWN";
  const entry = strategies.get(key) ?? { games: 0, scores: [], wins: 0 };

  entry.games += 1;
  entry.scores.push(score);
  entry.wins += won ? 1 : 0;
  strategies.set(key, entry);
}

function playGame(input: {
  away: MutableTeamState;
  diagnostics: DiagnosticGameRecord[];
  gameIndex: number;
  home: MutableTeamState;
  availabilityRecords: AvailabilityTeamWeekRecord[];
  scenarioAccumulators: Map<string, ScenarioAccumulator>;
  season: number;
  strategies: Map<string, StrategyAccumulator>;
  week: number;
}) {
  const scheduledAt = new Date(Date.UTC(2026 + input.season, 8, input.week * 7 + input.gameIndex, 18, 0, 0));
  const simulationSeed = `extended-season-balance:${input.season}:${input.week}:${input.gameIndex}`;
  const homeAvailability = summarizeAvailability(input.home, simulationSeed);
  const awayAvailability = summarizeAvailability(input.away, simulationSeed);
  input.availabilityRecords.push(
    {
      ...homeAvailability,
      teamId: input.home.id,
      teamProfile: input.home.profile,
      week: input.week,
    },
    {
      ...awayAvailability,
      teamId: input.away.id,
      teamProfile: input.away.profile,
      week: input.week,
    },
  );
  const context = applyAiGameplans({
    matchId: `extended-season-${input.season}-${input.week}-${input.gameIndex}`,
    saveGameId: "extended-season-balance-savegame",
    seasonId: `extended-season-balance-${input.season}`,
    kind: MatchKind.REGULAR_SEASON,
    simulationSeed,
    seasonYear: 2026 + input.season,
    week: input.week,
    scheduledAt,
    homeTeam: cloneProductionTeam(input.home),
    awayTeam: cloneProductionTeam(input.away),
  });
  const result = generateMatchStats(context);
  const homeWon = result.homeScore > result.awayScore;
  const awayWon = result.awayScore > result.homeScore;
  const homeAverageFatigue = averagePlayerFatigue(input.home);
  const awayAverageFatigue = averagePlayerFatigue(input.away);
  const homeInjuryCount = activeInjuryCount(input.home);
  const awayInjuryCount = activeInjuryCount(input.away);
  const favorite =
    input.home.overallRating === input.away.overallRating
      ? null
      : input.home.overallRating > input.away.overallRating
        ? input.home.id
        : input.away.id;
  const scenario = getAccumulator(input.scenarioAccumulators, scenarioName(input.home, input.away));
  const margin = Math.abs(result.homeScore - result.awayScore);
  const beforeHomeInjuries = input.home.newInjuries;
  const beforeAwayInjuries = input.away.newInjuries;
  const beforeHomeSevere = input.home.severeInjuries;
  const beforeAwaySevere = input.away.severeInjuries;
  const homeArchetype = context.teamGameplans?.[input.home.id]?.aiStrategyArchetype ?? "UNKNOWN";
  const awayArchetype = context.teamGameplans?.[input.away.id]?.aiStrategyArchetype ?? "UNKNOWN";
  const weekIndex = input.gameIndex + 1;
  const winnerScore = Math.max(result.homeScore, result.awayScore);
  const loserScore = Math.min(result.homeScore, result.awayScore);

  input.home.wins += homeWon ? 1 : 0;
  input.home.losses += awayWon ? 1 : 0;
  input.away.wins += awayWon ? 1 : 0;
  input.away.losses += homeWon ? 1 : 0;

  applyResult(input.home, result, scheduledAt);
  applyResult(input.away, result, scheduledAt);

  scenario.games += 1;
  scenario.homeScores.push(result.homeScore);
  scenario.awayScores.push(result.awayScore);
  scenario.margins.push(margin);
  scenario.injuries += input.home.newInjuries - beforeHomeInjuries + input.away.newInjuries - beforeAwayInjuries;
  scenario.severeInjuries +=
    input.home.severeInjuries - beforeHomeSevere + input.away.severeInjuries - beforeAwaySevere;
  scenario.fatigue.push(...input.home.fatigueSamples.slice(-input.home.roster.length));
  scenario.fatigue.push(...input.away.fatigueSamples.slice(-input.away.roster.length));
  scenario.progressionXp.push(...input.home.progressionXp.slice(-input.home.roster.length));
  scenario.progressionXp.push(...input.away.progressionXp.slice(-input.away.roster.length));
  scenario.favoriteWins +=
    favorite === input.home.id && homeWon ? 1 : favorite === input.away.id && awayWon ? 1 : 0;

  input.diagnostics.push({
    aiArchetypePair: `${homeArchetype}-vs-${awayArchetype}`,
    availabilityIndexDiffAbs: Math.abs(homeAvailability.availabilityIndex - awayAvailability.availabilityIndex),
    availabilityIndexMin: Math.min(homeAvailability.availabilityIndex, awayAvailability.availabilityIndex),
    awayAverageFatigue,
    awayAvailabilityIndex: awayAvailability.availabilityIndex,
    awayBackupUsageRate: awayAvailability.backupUsageRate,
    awayEffectiveDepthRating: awayAvailability.effectiveDepthRating,
    awayInjuryCount,
    awayStarterLossCount: awayAvailability.starterLossCount,
    awayScore: result.awayScore,
    backupUsageRateMax: Math.max(homeAvailability.backupUsageRate, awayAvailability.backupUsageRate),
    effectiveDepthRatingDiffAbs: Math.abs(homeAvailability.effectiveDepthRating - awayAvailability.effectiveDepthRating),
    effectiveDepthRatingMin: Math.min(homeAvailability.effectiveDepthRating, awayAvailability.effectiveDepthRating),
    fatigueBand: fatigueBand(Math.max(homeAverageFatigue, awayAverageFatigue)),
    fatigueDiffAbs: Math.abs(homeAverageFatigue - awayAverageFatigue),
    gameIndex: input.gameIndex,
    homeAverageFatigue,
    homeAvailabilityIndex: homeAvailability.availabilityIndex,
    homeBackupUsageRate: homeAvailability.backupUsageRate,
    homeEffectiveDepthRating: homeAvailability.effectiveDepthRating,
    homeInjuryCount,
    homeStarterLossCount: homeAvailability.starterLossCount,
    homeScore: result.homeScore,
    injuryCountBand: injuryCountBand(homeInjuryCount + awayInjuryCount),
    injuryDiffAbs: Math.abs(homeInjuryCount - awayInjuryCount),
    loserScore,
    margin,
    maxAverageFatigue: Math.max(homeAverageFatigue, awayAverageFatigue),
    profilePair: scenario.name,
    season: input.season + 1,
    totalInjuryCount: homeInjuryCount + awayInjuryCount,
    totalStarterLossCount: homeAvailability.starterLossCount + awayAvailability.starterLossCount,
    totalScore: result.homeScore + result.awayScore,
    week: input.week,
    weekIndex,
    winnerScore,
    winnerVenue: homeWon ? "HOME" : awayWon ? "AWAY" : "TIE",
  });

  recordStrategy(
    input.strategies,
    context.teamGameplans?.[input.home.id]?.aiStrategyArchetype,
    result.homeScore,
    homeWon,
  );
  recordStrategy(
    input.strategies,
    context.teamGameplans?.[input.away.id]?.aiStrategyArchetype,
    result.awayScore,
    awayWon,
  );
}

function summarizeScenario(scenario: ScenarioAccumulator): ExtendedSeasonScenarioResult {
  const totalScores = scenario.homeScores.map((score, index) => score + (scenario.awayScores[index] ?? 0));

  return {
    averageAwayScore: round(average(scenario.awayScores)),
    averageFatigue: round(average(scenario.fatigue)),
    averageHomeScore: round(average(scenario.homeScores)),
    averageMargin: round(average(scenario.margins)),
    averageProgressionXp: round(average(scenario.progressionXp)),
    averageScore: round(average(totalScores)),
    blowoutRate: round(scenario.margins.filter((margin) => margin >= BLOWOUT_MARGIN).length / scenario.games, 3),
    closeGameRate: round(scenario.margins.filter((margin) => margin <= CLOSE_MARGIN).length / scenario.games, 3),
    favoriteWinRate:
      scenario.name.includes("equal") && !scenario.name.includes("strong") && !scenario.name.includes("weak")
        ? null
        : round(scenario.favoriteWins / Math.max(1, scenario.games), 3),
    gameCount: scenario.games,
    homeWinRate: round(
      scenario.homeScores.filter((score, index) => score > (scenario.awayScores[index] ?? 0)).length /
        scenario.games,
      3,
    ),
    injuryRate: round(scenario.injuries / scenario.games, 3),
    name: scenario.name,
    severeInjuryRate: round(scenario.severeInjuries / scenario.games, 3),
  };
}

function summarizeDiagnosticBucket(
  key: string,
  records: DiagnosticGameRecord[],
): ExtendedSeasonDiagnosticBucket {
  const games = records.length;

  return {
    averageLoserScore: round(average(records.map((record) => record.loserScore))),
    averageMargin: round(average(records.map((record) => record.margin))),
    averageScore: round(average(records.map((record) => record.totalScore))),
    averageWinnerScore: round(average(records.map((record) => record.winnerScore))),
    blowoutRate: round(records.filter((record) => record.margin >= BLOWOUT_MARGIN).length / Math.max(1, games), 3),
    closeGameRate: round(records.filter((record) => record.margin <= CLOSE_MARGIN).length / Math.max(1, games), 3),
    games,
    key,
  };
}

function groupDiagnostics(
  records: DiagnosticGameRecord[],
  keySelector: (record: DiagnosticGameRecord) => string,
) {
  const grouped = new Map<string, DiagnosticGameRecord[]>();

  for (const record of records) {
    const key = keySelector(record);
    const group = grouped.get(key) ?? [];

    group.push(record);
    grouped.set(key, group);
  }

  return [...grouped.entries()]
    .map(([key, entries]) => summarizeDiagnosticBucket(key, entries))
    .sort((left, right) => left.key.localeCompare(right.key, undefined, { numeric: true }));
}

function summarizeAvailabilityByTeam(records: AvailabilityTeamWeekRecord[]): ExtendedSeasonBalanceRun["availability"]["byTeam"] {
  const grouped = new Map<string, AvailabilityTeamWeekRecord[]>();

  for (const record of records) {
    const group = grouped.get(record.teamId) ?? [];

    group.push(record);
    grouped.set(record.teamId, group);
  }

  return [...grouped.entries()]
    .map(([teamId, entries]) => ({
      averageAvailabilityIndex: round(average(entries.map((entry) => entry.availabilityIndex)), 3),
      averageBackupFatigue: round(average(entries.map((entry) => entry.backupFatigue))),
      averageBackupUsageRate: round(average(entries.map((entry) => entry.backupUsageRate)), 3),
      averageEffectiveDepthRating: round(average(entries.map((entry) => entry.effectiveDepthRating))),
      averageStarterFatigue: round(average(entries.map((entry) => entry.starterFatigue))),
      averageStarterLossCount: round(average(entries.map((entry) => entry.starterLossCount))),
      maxStarterLossCount: Math.max(...entries.map((entry) => entry.starterLossCount)),
      samples: entries.length,
      teamId,
      teamProfile: entries[0]?.teamProfile ?? "EQUAL",
    }))
    .sort((left, right) => left.teamId.localeCompare(right.teamId));
}

function summarizeAvailabilityByWeek(records: AvailabilityTeamWeekRecord[]): ExtendedSeasonBalanceRun["availability"]["byWeek"] {
  const grouped = new Map<number, AvailabilityTeamWeekRecord[]>();

  for (const record of records) {
    const group = grouped.get(record.week) ?? [];

    group.push(record);
    grouped.set(record.week, group);
  }

  return [...grouped.entries()]
    .map(([week, entries]) => ({
      averageAvailabilityIndex: round(average(entries.map((entry) => entry.availabilityIndex)), 3),
      averageBackupUsageRate: round(average(entries.map((entry) => entry.backupUsageRate)), 3),
      averageEffectiveDepthRating: round(average(entries.map((entry) => entry.effectiveDepthRating))),
      averageStarterLossCount: round(average(entries.map((entry) => entry.starterLossCount))),
      samples: entries.length,
      week,
    }))
    .sort((left, right) => left.week - right.week);
}

function pearsonCorrelation(
  records: DiagnosticGameRecord[],
  valueSelector: (record: DiagnosticGameRecord) => number,
) {
  const xValues = records.map(valueSelector);
  const yValues = records.map((record) => record.margin);
  const xAverage = average(xValues);
  const yAverage = average(yValues);
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (const [index, xValue] of xValues.entries()) {
    const xDelta = xValue - xAverage;
    const yDelta = (yValues[index] ?? 0) - yAverage;

    numerator += xDelta * yDelta;
    xDenominator += xDelta ** 2;
    yDenominator += yDelta ** 2;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);

  return denominator === 0 ? 0 : round(numerator / denominator, 3);
}

function summarizeScoreSpikePatterns(records: DiagnosticGameRecord[]): ExtendedSeasonScoreSpikePattern[] {
  const patterns = [
    {
      type: "winner-42-plus",
      records: records.filter((record) => record.winnerScore >= 42),
    },
    {
      type: "loser-7-or-less",
      records: records.filter((record) => record.loserScore <= 7),
    },
    {
      type: "winner-42-plus-and-loser-7-or-less",
      records: records.filter((record) => record.winnerScore >= 42 && record.loserScore <= 7),
    },
  ];

  return patterns.map((pattern) => ({
    averageMargin: round(average(pattern.records.map((record) => record.margin))),
    games: pattern.records.length,
    rate: round(pattern.records.length / Math.max(1, records.length), 3),
    type: pattern.type,
  }));
}

function summarizeDiagnostics(records: DiagnosticGameRecord[]): ExtendedSeasonMarginDiagnostics {
  const byWeek = groupDiagnostics(records, (record) => `${record.week}`);
  const highestMarginWeek = [...byWeek].sort(
    (left, right) => right.averageMargin - left.averageMargin,
  )[0];

  return {
    byAiArchetypePair: groupDiagnostics(records, (record) => record.aiArchetypePair),
    byAvailabilityBand: groupDiagnostics(records, (record) => availabilityBand(record.availabilityIndexMin)),
    byBackupUsageBand: groupDiagnostics(records, (record) => backupUsageBand(record.backupUsageRateMax)),
    byEffectiveDepthRatingBand: groupDiagnostics(records, (record) =>
      effectiveDepthRatingBand(record.effectiveDepthRatingMin),
    ),
    byFatigueBand: groupDiagnostics(records, (record) => record.fatigueBand),
    byHomeAwayWinner: groupDiagnostics(records, (record) => record.winnerVenue),
    byInjuryCountBand: groupDiagnostics(records, (record) => record.injuryCountBand),
    byLongTermPhase: groupDiagnostics(records, (record) => longTermPhase(record, records.length)),
    byProfilePair: groupDiagnostics(records, (record) => record.profilePair),
    byWeek,
    correlations: [
      {
        factor: "chronologicalGameIndex",
        correlation: pearsonCorrelation(records, (record) => record.weekIndex),
      },
      {
        factor: "maxAverageFatigue",
        correlation: pearsonCorrelation(records, (record) => record.maxAverageFatigue),
      },
      {
        factor: "absoluteFatigueDiff",
        correlation: pearsonCorrelation(records, (record) => record.fatigueDiffAbs),
      },
      {
        factor: "totalActiveInjuries",
        correlation: pearsonCorrelation(records, (record) => record.totalInjuryCount),
      },
      {
        factor: "absoluteInjuryDiff",
        correlation: pearsonCorrelation(records, (record) => record.injuryDiffAbs),
      },
      {
        factor: "minAvailabilityIndex",
        correlation: pearsonCorrelation(records, (record) => record.availabilityIndexMin),
      },
      {
        factor: "absoluteAvailabilityIndexDiff",
        correlation: pearsonCorrelation(records, (record) => record.availabilityIndexDiffAbs),
      },
      {
        factor: "minEffectiveDepthRating",
        correlation: pearsonCorrelation(records, (record) => record.effectiveDepthRatingMin),
      },
      {
        factor: "absoluteEffectiveDepthRatingDiff",
        correlation: pearsonCorrelation(records, (record) => record.effectiveDepthRatingDiffAbs),
      },
      {
        factor: "maxBackupUsageRate",
        correlation: pearsonCorrelation(records, (record) => record.backupUsageRateMax),
      },
      {
        factor: "totalStarterLossCount",
        correlation: pearsonCorrelation(records, (record) => record.totalStarterLossCount),
      },
      {
        factor: "winnerScore",
        correlation: pearsonCorrelation(records, (record) => record.winnerScore),
      },
      {
        factor: "loserScore",
        correlation: pearsonCorrelation(records, (record) => record.loserScore),
      },
    ].sort((left, right) => Math.abs(right.correlation) - Math.abs(left.correlation)),
    escalation: {
      firstWeekWithBlowoutRateAtLeast50:
        byWeek.find((bucket) => bucket.blowoutRate >= 0.5)?.key != null
          ? Number(byWeek.find((bucket) => bucket.blowoutRate >= 0.5)?.key)
          : null,
      firstWeekWithMarginAtLeast24:
        byWeek.find((bucket) => bucket.averageMargin >= BLOWOUT_MARGIN)?.key != null
          ? Number(byWeek.find((bucket) => bucket.averageMargin >= BLOWOUT_MARGIN)?.key)
          : null,
      highestMarginWeek: highestMarginWeek ? Number(highestMarginWeek.key) : null,
    },
    scoreSpikePatterns: summarizeScoreSpikePatterns(records),
  };
}

function fingerprint(run: Omit<ExtendedSeasonBalanceRun, "fingerprint">) {
  return [
    run.metrics.games,
    run.metrics.averageScore,
    run.metrics.averageMargin,
    run.metrics.injuryRate,
    run.metrics.severeInjuryRate,
    run.schedule.variant,
    run.schedule.fairness.averageOpponentRatingSpread,
    run.schedule.fairness.gamesPerTeamSpread,
    run.diagnostics.escalation.firstWeekWithBlowoutRateAtLeast50,
    run.diagnostics.correlations.map((entry) => `${entry.factor}:${entry.correlation}`).join("|"),
    run.scenarios.map((scenario) => `${scenario.name}:${scenario.averageScore}:${scenario.injuryRate}`).join("|"),
    run.strategies.map((strategy) => `${strategy.archetype}:${strategy.games}:${strategy.winRate}`).join("|"),
  ].join("#");
}

export function runExtendedSeasonBalanceSuite(
  options: ExtendedSeasonBalanceOptions = {},
): ExtendedSeasonBalanceRun {
  const seasons = options.seasons ?? DEFAULT_SEASONS;
  const weeksPerSeason = options.weeksPerSeason ?? DEFAULT_WEEKS_PER_SEASON;
  const scheduleSeed = options.scheduleSeed ?? DEFAULT_SCHEDULE_SEED;
  const scheduleVariant = options.scheduleVariant ?? DEFAULT_SCHEDULE_VARIANT;
  const teams = TEAM_DEFINITIONS.map(makeTeamState);
  const diagnosticRecords: DiagnosticGameRecord[] = [];
  const availabilityRecords: AvailabilityTeamWeekRecord[] = [];
  const scheduleAccumulator = createScheduleAccumulator(teams);
  const scenarioAccumulators = new Map<string, ScenarioAccumulator>();
  const strategyAccumulators = new Map<string, StrategyAccumulator>();
  const margins: number[] = [];
  const scores: number[] = [];
  let gameIndex = 0;

  for (let season = 0; season < seasons; season += 1) {
    for (let week = 1; week <= weeksPerSeason; week += 1) {
      const scheduledAt = new Date(Date.UTC(2026 + season, 8, week * 7, 18, 0, 0));

      for (const team of teams) {
        prepareWeek(team, scheduledAt, season, week);
      }

      for (const [slot, [firstIndex, secondIndex]] of pairingsForWeek({
        scheduleSeed,
        season,
        variant: scheduleVariant,
        week,
      }).entries()) {
        const flip = scheduleVariant === "legacy" && (season + week + slot) % 2 === 0;
        const home = teams[flip ? secondIndex : firstIndex];
        const away = teams[flip ? firstIndex : secondIndex];

        if (!home || !away) {
          continue;
        }

        recordScheduleGame(scheduleAccumulator, home, away);
        playGame({
          availabilityRecords,
          away,
          diagnostics: diagnosticRecords,
          gameIndex,
          home,
          scenarioAccumulators,
          season,
          strategies: strategyAccumulators,
          week,
        });

        const latestScenario = scenarioAccumulators.get(scenarioName(home, away));
        const latestHomeScore = latestScenario?.homeScores.at(-1) ?? 0;
        const latestAwayScore = latestScenario?.awayScores.at(-1) ?? 0;

        scores.push(latestHomeScore + latestAwayScore);
        margins.push(Math.abs(latestHomeScore - latestAwayScore));
        gameIndex += 1;
      }
    }
  }

  const allFatigue = teams.flatMap((team) => team.fatigueSamples);
  const allProgressionXp = teams.flatMap((team) => team.progressionXp);
  const totalInjuries = teams.reduce((sum, team) => sum + team.newInjuries, 0);
  const totalSevereInjuries = teams.reduce((sum, team) => sum + team.severeInjuries, 0);
  const games = scores.length;
  const runWithoutFingerprint = {
    availability: {
      byTeam: summarizeAvailabilityByTeam(availabilityRecords),
      byWeek: summarizeAvailabilityByWeek(availabilityRecords),
    },
    diagnostics: summarizeDiagnostics(diagnosticRecords),
    generatedAt: "2026-04-26T00:00:00.000Z",
    metrics: {
      averageMargin: round(average(margins)),
      averageScore: round(average(scores)),
      blowoutRate: round(margins.filter((margin) => margin >= BLOWOUT_MARGIN).length / games, 3),
      closeGameRate: round(margins.filter((margin) => margin <= CLOSE_MARGIN).length / games, 3),
      fatigueP10: round(percentile(allFatigue, 0.1)),
      fatigueMedian: round(percentile(allFatigue, 0.5)),
      fatigueP90: round(percentile(allFatigue, 0.9)),
      games,
      injuryRate: round(totalInjuries / games, 3),
      progressionXpAverage: round(average(allProgressionXp)),
      scoreStdDev: round(standardDeviation(scores)),
      severeInjuryRate: round(totalSevereInjuries / games, 3),
    },
    schedule: summarizeSchedule(scheduleAccumulator, scheduleVariant, scheduleSeed),
    scenarios: [...scenarioAccumulators.values()].map(summarizeScenario).sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    seasons,
    strategies: [...strategyAccumulators.entries()]
      .map(([archetype, entry]) => ({
        archetype,
        averageScore: round(average(entry.scores)),
        games: entry.games,
        winRate: round(entry.wins / entry.games, 3),
      }))
      .sort((left, right) => left.archetype.localeCompare(right.archetype)),
    teams: teams.map((team) => ({
      averageFatigue: round(average(team.fatigueSamples)),
      losses: team.losses,
      newInjuries: team.newInjuries,
      profile: team.profile,
      severeInjuries: team.severeInjuries,
      teamId: team.id,
      winRate: round(team.wins / Math.max(1, team.wins + team.losses), 3),
      wins: team.wins,
    })),
    weeksPerSeason,
  };

  return {
    ...runWithoutFingerprint,
    fingerprint: fingerprint(runWithoutFingerprint),
  };
}
