import { createRng, nextRandom, type RandomSource } from "@/lib/random/seeded-rng";

export type MinimalMatchTeam = {
  id?: string;
  name?: string;
  overall?: number;
  rating?: number;
};

export type MinimalMatchWinner = "A" | "B";

export type MinimalMatchTeamStats = {
  firstDowns: number;
  passingYards: number;
  rushingYards: number;
  totalYards: number;
  turnovers: number;
};

export type MinimalMatchSimulationResult = {
  scoreA: number;
  scoreB: number;
  teamAStats: MinimalMatchTeamStats;
  teamBStats: MinimalMatchTeamStats;
  tiebreakerApplied: boolean;
  winner: MinimalMatchWinner;
};

export type MinimalMatchSimulationOptions = {
  rng?: RandomSource;
  seed?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function teamRating(team: MinimalMatchTeam) {
  const rating = team.rating ?? team.overall ?? 70;

  return Number.isFinite(rating) ? clamp(Math.round(rating), 0, 100) : 70;
}

function resolveRng(
  teamA: MinimalMatchTeam,
  teamB: MinimalMatchTeam,
  options: MinimalMatchSimulationOptions,
) {
  if (options.rng) {
    return options.rng;
  }

  return createRng(
    options.seed ??
      `minimal-match:${teamA.id ?? teamA.name ?? "team-a"}:${teamB.id ?? teamB.name ?? "team-b"}`,
  );
}

function rollScore(rng: RandomSource, ownRating: number, opponentRating: number) {
  const baseScore = 10 + Math.floor(nextRandom(rng) * 22);
  const volatility = Math.round((nextRandom(rng) - 0.5) * 10);
  const ratingBonus = Math.round((ownRating - 70) * 0.18 + (ownRating - opponentRating) * 0.12);

  return clamp(baseScore + volatility + ratingBonus, 0, 60);
}

function rollTeamStats(input: {
  opponentRating: number;
  ownRating: number;
  rng: RandomSource;
  score: number;
  won: boolean;
}): MinimalMatchTeamStats {
  const ratingEdge = input.ownRating - input.opponentRating;
  const yardageFromScore = input.score * 8;
  const ratingYardage = Math.round((input.ownRating - 70) * 2.2 + ratingEdge * 1.4);
  const volatility = Math.round((nextRandom(input.rng) - 0.5) * 95);
  const totalYards = Math.round(
    clamp(185 + yardageFromScore + ratingYardage + volatility, 90, 620),
  );
  const passingShare = clamp(
    0.54 + (input.ownRating - 70) * 0.002 + (nextRandom(input.rng) - 0.5) * 0.18,
    0.38,
    0.68,
  );
  const passingYards = Math.round(totalYards * passingShare);
  const rushingYards = totalYards - passingYards;
  const turnoverPressure =
    1.55 -
    input.score / 34 +
    (input.opponentRating - input.ownRating) / 45 +
    (input.won ? -0.35 : 0.35) +
    nextRandom(input.rng) * 1.45;
  const turnovers = Math.round(clamp(turnoverPressure, 0, 5));
  const firstDowns = Math.round(
    clamp(totalYards / 18 + input.score / 7 - turnovers * 0.7 + nextRandom(input.rng) * 2.5, 4, 34),
  );

  return {
    firstDowns,
    passingYards,
    rushingYards,
    totalYards,
    turnovers,
  };
}

export function simulateMatch(
  teamA: MinimalMatchTeam,
  teamB: MinimalMatchTeam,
  options: MinimalMatchSimulationOptions = {},
): MinimalMatchSimulationResult {
  const rng = resolveRng(teamA, teamB, options);
  const ratingA = teamRating(teamA);
  const ratingB = teamRating(teamB);
  let scoreA = rollScore(rng, ratingA, ratingB);
  let scoreB = rollScore(rng, ratingB, ratingA);
  let tiebreakerApplied = false;

  if (scoreA === scoreB) {
    tiebreakerApplied = true;
    const tiebreakerA = ratingA + nextRandom(rng) * 12;
    const tiebreakerB = ratingB + nextRandom(rng) * 12;

    if (tiebreakerA >= tiebreakerB) {
      scoreA += 3;
    } else {
      scoreB += 3;
    }
  }
  const winner = scoreA > scoreB ? "A" : "B";

  return {
    scoreA,
    scoreB,
    teamAStats: rollTeamStats({
      opponentRating: ratingB,
      ownRating: ratingA,
      rng,
      score: scoreA,
      won: winner === "A",
    }),
    teamBStats: rollTeamStats({
      opponentRating: ratingA,
      ownRating: ratingB,
      rng,
      score: scoreB,
      won: winner === "B",
    }),
    tiebreakerApplied,
    winner,
  };
}
