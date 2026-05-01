import type {
  MinimalMatchSimulationResult,
  MinimalMatchTeamStats,
} from "@/modules/gameplay/application/minimal-match-simulation";

type ResultSide = "A" | "B";

export type MinimalMatchResultCopy = {
  headline: string;
  summary: string[];
};

type TeamSnapshot = {
  name: string;
  score: number;
  stats: MinimalMatchTeamStats;
};

function safeNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function normalizeMinimalMatchTeamStats(
  stats: Partial<MinimalMatchTeamStats> | null | undefined,
): MinimalMatchTeamStats {
  const passingYards = safeNonNegativeNumber(stats?.passingYards);
  const rushingYards = safeNonNegativeNumber(stats?.rushingYards);
  const totalYards = safeNonNegativeNumber(stats?.totalYards) || passingYards + rushingYards;

  return {
    firstDowns: safeNonNegativeNumber(stats?.firstDowns),
    passingYards,
    rushingYards,
    totalYards,
    turnovers: safeNonNegativeNumber(stats?.turnovers),
  };
}

function winnerSide(result: MinimalMatchSimulationResult): ResultSide | "DRAW" {
  if (result.scoreA === result.scoreB) {
    return "DRAW";
  }

  return result.winner;
}

function bySide(
  side: ResultSide,
  input: {
    teamA: TeamSnapshot;
    teamB: TeamSnapshot;
  },
) {
  return side === "A" ? input.teamA : input.teamB;
}

function scoreDiff(result: MinimalMatchSimulationResult) {
  return Math.abs(result.scoreA - result.scoreB);
}

function buildHeadline(input: {
  result: MinimalMatchSimulationResult;
  winner: TeamSnapshot | null;
  loser: TeamSnapshot | null;
}) {
  const diff = scoreDiff(input.result);

  if (!input.winner || !input.loser) {
    return "Unentschieden nach ausgeglichenem Spiel";
  }

  if (input.result.tiebreakerApplied) {
    return "Tiebreak entscheidet ein enges Spiel";
  }

  if (diff >= 21) {
    return "Blowout mit klarer Ansage";
  }

  if (diff <= 3) {
    return "Knapper Sieg nach hartem Kampf";
  }

  const yardEdge = input.winner.stats.totalYards - input.loser.stats.totalYards;

  if (diff >= 14 && yardEdge >= 80) {
    return "Dominanter Auftritt mit klarer Offense-Ueberlegenheit";
  }

  return "Solider Sieg mit sichtbaren Vorteilen";
}

function buildStatSentence(input: {
  diff: number;
  loser: TeamSnapshot;
  winner: TeamSnapshot;
}) {
  const yardEdge = input.winner.stats.totalYards - input.loser.stats.totalYards;
  const turnoverEdge = input.loser.stats.turnovers - input.winner.stats.turnovers;
  const firstDownEdge = input.winner.stats.firstDowns - input.loser.stats.firstDowns;

  if (turnoverEdge >= 2) {
    return `Turnovers geben den Ausschlag: ${input.loser.name} verliert den Ball ${turnoverEdge} Mal haeufiger.`;
  }

  if (yardEdge >= 100) {
    return `${input.winner.name} sammelt ${yardEdge} Yards mehr und wirkt offensiv deutlich effizienter.`;
  }

  if (firstDownEdge >= 6) {
    return `${input.winner.name} haelt Drives besser am Leben und holt ${firstDownEdge} First Downs mehr.`;
  }

  if (input.diff <= 7) {
    return "Die wichtigsten Team-Stats liegen eng beieinander, passend zum knappen Score.";
  }

  return "Yards, First Downs und Ballverluste ergeben ein stimmiges Bild zum Endstand.";
}

export function buildMinimalMatchResultCopy(input: {
  result: MinimalMatchSimulationResult;
  teamAName: string;
  teamBName: string;
}): MinimalMatchResultCopy {
  const teamA: TeamSnapshot = {
    name: input.teamAName,
    score: input.result.scoreA,
    stats: normalizeMinimalMatchTeamStats(input.result.teamAStats),
  };
  const teamB: TeamSnapshot = {
    name: input.teamBName,
    score: input.result.scoreB,
    stats: normalizeMinimalMatchTeamStats(input.result.teamBStats),
  };
  const side = winnerSide(input.result);

  if (side === "DRAW") {
    return {
      headline: buildHeadline({
        loser: null,
        result: input.result,
        winner: null,
      }),
      summary: [
        `${teamA.name} und ${teamB.name} trennen sich ${teamA.score}:${teamB.score}.`,
        "Score und Team-Stats zeigen ein Spiel ohne klaren Ausschlag.",
      ],
    };
  }

  const winner = bySide(side, { teamA, teamB });
  const loser = bySide(side === "A" ? "B" : "A", { teamA, teamB });
  const diff = scoreDiff(input.result);
  const summary = [
    `${winner.name} gewinnt ${winner.score}:${loser.score} gegen ${loser.name}.`,
  ];

  if (input.result.tiebreakerApplied) {
    summary.push("Die Entscheidung faellt erst im Tiebreak, deshalb wirkt der knappe Abstand passend.");
  } else {
    summary.push(buildStatSentence({ diff, loser, winner }));
  }

  return {
    headline: buildHeadline({
      loser,
      result: input.result,
      winner,
    }),
    summary,
  };
}
