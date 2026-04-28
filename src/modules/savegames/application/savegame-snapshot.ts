import {
  normalizePreGameXFactorPlan,
  type PreGameXFactorPlan,
} from "@/modules/gameplay/domain/pre-game-x-factor";
import { generateMatchStats } from "@/modules/seasons/application/simulation/match-engine";
import type {
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationTeamContext,
} from "@/modules/seasons/application/simulation/simulation.types";

export const SAVE_GAME_JSON_VERSION = 1;
export const SAVE_GAME_JSON_SCHEMA = "afbm.save-game";

export type SaveGameCoachingProfile =
  | "ENGINE_AUTO"
  | "CONSERVATIVE"
  | "BALANCED"
  | "AGGRESSIVE";

export type SaveGameTeamGameplan = {
  coachingProfile: SaveGameCoachingProfile;
  offenseXFactorPlan: PreGameXFactorPlan;
  defenseXFactorPlan: PreGameXFactorPlan;
};

export type SaveGameSnapshotPlayer = Omit<
  SimulationPlayerContext,
  "injuryEndsOn"
> & {
  injuryEndsOn: string | null;
};

export type SaveGameSnapshotTeam = Omit<
  SimulationTeamContext,
  "roster"
> & {
  roster: SaveGameSnapshotPlayer[];
};

export type SaveGameSnapshotMatch = {
  matchId: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  kind: SimulationMatchContext["kind"];
  week: number;
  scheduledAt: string;
  homeTeamId: string;
  awayTeamId: string;
  simulationSeed: string;
  result: MatchSimulationResult | null;
};

export type SaveGameSnapshot = {
  schema: typeof SAVE_GAME_JSON_SCHEMA;
  version: typeof SAVE_GAME_JSON_VERSION;
  savedAt: string;
  saveGame: {
    id: string;
    name: string;
    status: "ACTIVE" | "ARCHIVED";
    currentSeasonId: string;
  };
  season: {
    id: string;
    year: number;
    phase: string;
    week: number;
  };
  seeds: {
    globalSeed: string;
    matches: Array<{
      matchId: string;
      simulationSeed: string;
    }>;
  };
  gameplan: {
    teams: Record<string, SaveGameTeamGameplan>;
  };
  teams: SaveGameSnapshotTeam[];
  matches: SaveGameSnapshotMatch[];
  currentMatchId: string;
};

export type CreateSaveGameSnapshotInput = {
  saveGameId: string;
  saveGameName?: string;
  saveGameStatus?: "ACTIVE" | "ARCHIVED";
  currentSeasonId: string;
  seasonId: string;
  seasonYear: number;
  seasonPhase?: string;
  week: number;
  currentMatch: SimulationMatchContext;
  currentMatchStatus?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  currentMatchResult?: MatchSimulationResult | null;
  teams?: SimulationTeamContext[];
  globalSeed?: string;
  gameplan?: {
    teams?: Record<string, Partial<SaveGameTeamGameplan>>;
  };
  savedAt?: Date | string;
};

export type LoadedSaveGameSnapshot = {
  snapshot: SaveGameSnapshot;
  currentMatch: SimulationMatchContext;
  currentMatchResult: MatchSimulationResult | null;
  gameplan: SaveGameSnapshot["gameplan"];
  seeds: SaveGameSnapshot["seeds"];
};

function normalizeSavedAt(value: Date | string | undefined) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? new Date(0).toISOString();
}

function serializePlayer(player: SimulationPlayerContext): SaveGameSnapshotPlayer {
  return {
    ...player,
    injuryEndsOn: player.injuryEndsOn?.toISOString() ?? null,
  };
}

function restorePlayer(player: SaveGameSnapshotPlayer): SimulationPlayerContext {
  return {
    ...player,
    injuryEndsOn: player.injuryEndsOn ? new Date(player.injuryEndsOn) : null,
  };
}

function serializeTeam(team: SimulationTeamContext): SaveGameSnapshotTeam {
  return {
    ...team,
    roster: team.roster.map(serializePlayer),
  };
}

function restoreTeam(team: SaveGameSnapshotTeam): SimulationTeamContext {
  return {
    ...team,
    roster: team.roster.map(restorePlayer),
  };
}

function normalizeTeamGameplan(
  value: Partial<SaveGameTeamGameplan> | undefined,
): SaveGameTeamGameplan {
  return {
    coachingProfile: value?.coachingProfile ?? "ENGINE_AUTO",
    offenseXFactorPlan: normalizePreGameXFactorPlan(value?.offenseXFactorPlan),
    defenseXFactorPlan: normalizePreGameXFactorPlan(value?.defenseXFactorPlan),
  };
}

function uniqueTeams(teams: SimulationTeamContext[]) {
  const byId = new Map<string, SimulationTeamContext>();

  for (const team of teams) {
    byId.set(team.id, team);
  }

  return [...byId.values()];
}

function parseSnapshot(input: SaveGameSnapshot | string): SaveGameSnapshot {
  return typeof input === "string" ? JSON.parse(input) as SaveGameSnapshot : input;
}

function assertValidSnapshot(snapshot: SaveGameSnapshot) {
  if (snapshot.schema !== SAVE_GAME_JSON_SCHEMA) {
    throw new Error(`Unsupported save-game schema: ${snapshot.schema}`);
  }

  if (snapshot.version !== SAVE_GAME_JSON_VERSION) {
    throw new Error(`Unsupported save-game version: ${snapshot.version}`);
  }

  if (!snapshot.currentMatchId) {
    throw new Error("Save-game snapshot is missing currentMatchId");
  }
}

export function createSaveGameSnapshot(
  input: CreateSaveGameSnapshotInput,
): SaveGameSnapshot {
  const teams = uniqueTeams([
    ...(input.teams ?? []),
    input.currentMatch.homeTeam,
    input.currentMatch.awayTeam,
  ]);
  const gameplanTeams = Object.fromEntries(
    teams.map((team) => [
      team.id,
      normalizeTeamGameplan(input.gameplan?.teams?.[team.id]),
    ]),
  );
  const currentMatch: SaveGameSnapshotMatch = {
    matchId: input.currentMatch.matchId,
    status:
      input.currentMatchStatus ??
      (input.currentMatchResult ? "COMPLETED" : "IN_PROGRESS"),
    kind: input.currentMatch.kind,
    week: input.currentMatch.week,
    scheduledAt: input.currentMatch.scheduledAt.toISOString(),
    homeTeamId: input.currentMatch.homeTeam.id,
    awayTeamId: input.currentMatch.awayTeam.id,
    simulationSeed: input.currentMatch.simulationSeed,
    result: input.currentMatchResult ?? null,
  };

  return {
    schema: SAVE_GAME_JSON_SCHEMA,
    version: SAVE_GAME_JSON_VERSION,
    savedAt: normalizeSavedAt(input.savedAt),
    saveGame: {
      id: input.saveGameId,
      name: input.saveGameName ?? "Imported Save",
      status: input.saveGameStatus ?? "ACTIVE",
      currentSeasonId: input.currentSeasonId,
    },
    season: {
      id: input.seasonId,
      year: input.seasonYear,
      phase: input.seasonPhase ?? "REGULAR_SEASON",
      week: input.week,
    },
    seeds: {
      globalSeed: input.globalSeed ?? input.currentMatch.simulationSeed,
      matches: [
        {
          matchId: currentMatch.matchId,
          simulationSeed: currentMatch.simulationSeed,
        },
      ],
    },
    gameplan: {
      teams: gameplanTeams,
    },
    teams: teams.map(serializeTeam),
    matches: [currentMatch],
    currentMatchId: currentMatch.matchId,
  };
}

export function serializeSaveGameSnapshot(snapshot: SaveGameSnapshot) {
  assertValidSnapshot(snapshot);
  return JSON.stringify(snapshot, null, 2);
}

export function loadSaveGameSnapshot(
  input: SaveGameSnapshot | string,
): LoadedSaveGameSnapshot {
  const snapshot = parseSnapshot(input);
  assertValidSnapshot(snapshot);

  const currentMatch = snapshot.matches.find(
    (match) => match.matchId === snapshot.currentMatchId,
  );

  if (!currentMatch) {
    throw new Error(`Current match ${snapshot.currentMatchId} not found in save-game snapshot`);
  }

  const teamsById = new Map(
    snapshot.teams.map((team) => [team.id, restoreTeam(team)]),
  );
  const homeTeam = teamsById.get(currentMatch.homeTeamId);
  const awayTeam = teamsById.get(currentMatch.awayTeamId);

  if (!homeTeam || !awayTeam) {
    throw new Error(
      `Save-game snapshot is missing teams for match ${currentMatch.matchId}`,
    );
  }

  return {
    snapshot,
    currentMatch: {
      matchId: currentMatch.matchId,
      saveGameId: snapshot.saveGame.id,
      seasonId: snapshot.season.id,
      kind: currentMatch.kind,
      simulationSeed: currentMatch.simulationSeed,
      seasonYear: snapshot.season.year,
      week: currentMatch.week,
      scheduledAt: new Date(currentMatch.scheduledAt),
      homeTeam,
      awayTeam,
    },
    currentMatchResult: currentMatch.result,
    gameplan: snapshot.gameplan,
    seeds: snapshot.seeds,
  };
}

export function continueLoadedSaveGameSnapshot(
  input: SaveGameSnapshot | string,
): MatchSimulationResult {
  return generateMatchStats(loadSaveGameSnapshot(input).currentMatch);
}
