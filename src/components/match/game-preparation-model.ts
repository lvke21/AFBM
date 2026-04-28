import {
  DEFAULT_PRE_GAME_X_FACTOR_PLAN,
  normalizePreGameXFactorPlan,
  type PreGameXFactorPlan,
} from "@/modules/gameplay/domain/pre-game-x-factor";
import {
  classifyMatchExpectation,
  selectUnderdogObjectives,
} from "@/modules/seasons/domain/weak-team-goals";

export type GamePreparationScheme = {
  code: string;
  name: string;
} | null;

export type GamePreparationTeam = {
  id: string;
  name: string;
  abbreviation: string;
  managerControlled: boolean;
  overallRating: number;
  morale: number;
  schemes: {
    offense: GamePreparationScheme;
    defense: GamePreparationScheme;
    specialTeams: GamePreparationScheme;
  };
  xFactorPlan?: {
    offense?: unknown;
    defense?: unknown;
  };
};

export type GamePreparationMatch = {
  status: string;
  homeTeam: GamePreparationTeam;
  awayTeam: GamePreparationTeam;
};

export function buildGamePreparationView(match: GamePreparationMatch) {
  const managerTeam =
    [match.homeTeam, match.awayTeam].find((team) => team.managerControlled) ?? null;

  if (!managerTeam) {
    return null;
  }

  const opponent =
    managerTeam.id === match.homeTeam.id ? match.awayTeam : match.homeTeam;
  const strengthDelta = managerTeam.overallRating - opponent.overallRating;
  const expectation = classifyMatchExpectation({
    opponentRating: opponent.overallRating,
    teamRating: managerTeam.overallRating,
  });
  const underdogObjectives = selectUnderdogObjectives(expectation);

  return {
    defenseXFactorPlan: normalizePreGameXFactorPlan(
      managerTeam.xFactorPlan?.defense as Partial<PreGameXFactorPlan> | null | undefined,
    ),
    defaultXFactorPlan: DEFAULT_PRE_GAME_X_FACTOR_PLAN,
    offenseXFactorPlan: normalizePreGameXFactorPlan(
      managerTeam.xFactorPlan?.offense as Partial<PreGameXFactorPlan> | null | undefined,
    ),
    managerTeam,
    opponent,
    canEditGameplan: match.status === "SCHEDULED",
    expectation,
    underdogObjectives,
    strengthDelta,
    strengthLabel:
      strengthDelta >= 5
        ? "Vorteil"
        : strengthDelta <= -5
          ? "Nachteil"
          : "Ausgeglichen",
  };
}
