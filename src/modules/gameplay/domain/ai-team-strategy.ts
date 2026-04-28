import type { PreGameXFactorPlan } from "./pre-game-x-factor";

export type AiTeamStrategyArchetype =
  | "BALANCED_MATCHUP"
  | "FAVORITE_CONTROL"
  | "PROTECT_WEAKENED"
  | "UNDERDOG_VARIANCE";

export type AiStrategyPlayerContext = {
  fatigue: number;
  injuryStatus: string;
  positionCode: string;
  positionOverall: number;
  rosterStatus: string;
  status: string;
};

export type AiStrategyTeamContext = {
  id: string;
  overallRating: number;
  roster: AiStrategyPlayerContext[];
};

export type AiTeamStrategyInput = {
  isHomeTeam?: boolean;
  opponent: AiStrategyTeamContext;
  team: AiStrategyTeamContext;
};

export type AiTeamStrategy = {
  archetype: AiTeamStrategyArchetype;
  defenseXFactorPlan: PreGameXFactorPlan;
  effectiveRating: number;
  matchupEdge: number;
  offenseXFactorPlan: PreGameXFactorPlan;
  pressureScore: number;
  rationale: string[];
};

const ACTIVE_ROSTER_STATUSES = new Set(["STARTER", "ROTATION", "BACKUP"]);
const KEY_POSITIONS = new Set(["QB", "RB", "WR", "LT", "CB", "FS", "SS", "MLB"]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function injuryPenalty(player: AiStrategyPlayerContext) {
  switch (player.injuryStatus) {
    case "QUESTIONABLE":
      return 0.7;
    case "DOUBTFUL":
      return 2.2;
    case "OUT":
      return 4.4;
    case "INJURED_RESERVE":
      return 6;
    default:
      return 0;
  }
}

function activeRoster(player: AiStrategyPlayerContext) {
  return player.status === "ACTIVE" && ACTIVE_ROSTER_STATUSES.has(player.rosterStatus);
}

function summarizeTeam(team: AiStrategyTeamContext, isHomeTeam: boolean | undefined) {
  const relevantRoster = team.roster.filter((player) => activeRoster(player));
  const roster = relevantRoster.length > 0 ? relevantRoster : team.roster;
  const weightedPlayers = roster.map((player) => {
    const starterWeight = player.rosterStatus === "STARTER" ? 1.25 : 1;
    const keyWeight = KEY_POSITIONS.has(player.positionCode) ? 1.15 : 1;

    return {
      player,
      weight: starterWeight * keyWeight,
    };
  });
  const totalWeight = weightedPlayers.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const averageFatigue = weightedPlayers.reduce(
    (sum, entry) => sum + entry.player.fatigue * entry.weight,
    0,
  ) / totalWeight;
  const injuryPressure = weightedPlayers.reduce(
    (sum, entry) => sum + injuryPenalty(entry.player) * entry.weight,
    0,
  ) / totalWeight;
  const keyInjuryCount = roster.filter((player) =>
    KEY_POSITIONS.has(player.positionCode) &&
    ["DOUBTFUL", "OUT", "INJURED_RESERVE"].includes(player.injuryStatus),
  ).length;
  const fatiguePenalty = clamp((averageFatigue - 42) / 9, 0, 5);
  const keyInjuryPenalty = Math.min(keyInjuryCount * 1.4, 4.2);
  const homeFieldBonus = isHomeTeam ? 1.2 : 0;
  const pressureScore = clamp(fatiguePenalty + injuryPressure + keyInjuryPenalty, 0, 12);
  const effectiveRating = clamp(team.overallRating + homeFieldBonus - pressureScore, 35, 99);

  return {
    averageFatigue,
    effectiveRating,
    keyInjuryCount,
    pressureScore,
  };
}

function buildPlan(archetype: AiTeamStrategyArchetype): PreGameXFactorPlan {
  switch (archetype) {
    case "FAVORITE_CONTROL":
      return {
        offensiveFocus: "RUN_FIRST",
        defensiveFocus: "STOP_RUN",
        aggression: "CONSERVATIVE",
        tempoPlan: "SLOW",
        protectionPlan: "STANDARD",
        offensiveMatchupFocus: "FEATURE_RB",
        defensiveMatchupFocus: "BALANCED",
        turnoverPlan: "PROTECT_BALL",
      };
    case "UNDERDOG_VARIANCE":
      return {
        offensiveFocus: "PASS_FIRST",
        defensiveFocus: "LIMIT_PASS",
        aggression: "AGGRESSIVE",
        tempoPlan: "HURRY_UP",
        protectionPlan: "FAST_RELEASE",
        offensiveMatchupFocus: "FEATURE_WR",
        defensiveMatchupFocus: "ATTACK_WEAK_OL",
        turnoverPlan: "HUNT_TURNOVERS",
      };
    case "PROTECT_WEAKENED":
      return {
        offensiveFocus: "BALANCED",
        defensiveFocus: "BALANCED",
        aggression: "CONSERVATIVE",
        tempoPlan: "SLOW",
        protectionPlan: "MAX_PROTECT",
        offensiveMatchupFocus: "PROTECT_QB",
        defensiveMatchupFocus: "BALANCED",
        turnoverPlan: "PROTECT_BALL",
      };
    default:
      return {
        offensiveFocus: "BALANCED",
        defensiveFocus: "BALANCED",
        aggression: "BALANCED",
        tempoPlan: "NORMAL",
        protectionPlan: "STANDARD",
        offensiveMatchupFocus: "BALANCED",
        defensiveMatchupFocus: "BALANCED",
        turnoverPlan: "BALANCED",
      };
  }
}

export function selectAiTeamStrategy(input: AiTeamStrategyInput): AiTeamStrategy {
  const teamSummary = summarizeTeam(input.team, input.isHomeTeam);
  const opponentSummary = summarizeTeam(input.opponent, input.isHomeTeam === false);
  const matchupEdge = teamSummary.effectiveRating - opponentSummary.effectiveRating;
  const rationale: string[] = [
    `effectiveRating=${teamSummary.effectiveRating.toFixed(1)}`,
    `matchupEdge=${matchupEdge.toFixed(1)}`,
    `pressure=${teamSummary.pressureScore.toFixed(1)}`,
  ];
  let archetype: AiTeamStrategyArchetype = "BALANCED_MATCHUP";

  if (teamSummary.pressureScore >= 5 || teamSummary.keyInjuryCount >= 2) {
    archetype = "PROTECT_WEAKENED";
    rationale.push("fatigue/injury pressure triggers protection");
  } else if (matchupEdge >= 6) {
    archetype = "FAVORITE_CONTROL";
    rationale.push("favorite protects advantage");
  } else if (matchupEdge <= -6) {
    archetype = "UNDERDOG_VARIANCE";
    rationale.push("underdog seeks variance");
  } else {
    rationale.push("balanced matchup");
  }

  const plan = buildPlan(archetype);

  return {
    archetype,
    defenseXFactorPlan: plan,
    effectiveRating: Number(teamSummary.effectiveRating.toFixed(2)),
    matchupEdge: Number(matchupEdge.toFixed(2)),
    offenseXFactorPlan: plan,
    pressureScore: Number(teamSummary.pressureScore.toFixed(2)),
    rationale,
  };
}
