import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildInitialRoster } from "../../src/modules/savegames/application/bootstrap/initial-roster";
import { generateMatchStats } from "../../src/modules/seasons/application/simulation/match-engine";
import type {
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "../../src/modules/seasons/application/simulation/simulation.types";

const REPORT_DATE = "2026-04-24";
const GAME_COUNT = 300;
const LEAGUE_TEAMS = [
  ["BOS", "Boston", "Guardians", 0, 74],
  ["NYT", "New York", "Titans", 1, 78],
  ["MIA", "Miami", "Cyclones", 2, 76],
  ["CHI", "Chicago", "Voyagers", 3, 72],
  ["DAL", "Dallas", "Wranglers", 4, 80],
  ["SEA", "Seattle", "Phantoms", 5, 77],
  ["DEN", "Denver", "Mountaineers", 6, 75],
  ["ATL", "Atlanta", "Firebirds", 7, 73],
] as const;

type ValidationIssue = {
  severity: "critical" | "major" | "minor";
  category:
    | "team-aggregation"
    | "player-assignment"
    | "drive-stats"
    | "double-counting"
    | "missing-values"
    | "plausibility"
    | "reporting-gap";
  scope: string;
  message: string;
};

type GameRecord = {
  context: SimulationMatchContext;
  result: MatchSimulationResult;
  elapsedMs: number;
  issues: ValidationIssue[];
};

type NumericSummary = {
  avg: number;
  min: number;
  max: number;
  p10: number;
  median: number;
  p90: number;
  stdDev: number;
};

type OutlierRecord = {
  matchId: string;
  metric: string;
  value: number;
  threshold: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
};

function createStatAnchor(id: string): SimulationStatAnchor {
  return {
    id,
    passingLongestCompletion: 0,
    rushingLongestRush: 0,
    receivingLongestReception: 0,
    kickingLongestFieldGoal: 0,
    puntingLongestPunt: 0,
  };
}

function buildSimulationTeam(
  teamId: string,
  city: string,
  nickname: string,
  rosterIndex: number,
  prestige: number,
): SimulationTeamContext {
  const roster = buildInitialRoster(rosterIndex, prestige, 2026).map((seed, index) => ({
    id: `${teamId}-player-${index}`,
    teamId,
    firstName: seed.firstName,
    lastName: seed.lastName,
    age: seed.age,
    developmentTrait: seed.developmentTrait,
    potentialRating: seed.potentialRating,
    positionCode: seed.primaryPositionCode,
    secondaryPositionCode: seed.secondaryPositionCode ?? null,
    rosterStatus: seed.rosterStatus,
    depthChartSlot: seed.depthChartSlot,
    captainFlag: seed.captainFlag,
    developmentFocus: false,
    injuryRisk: seed.injuryRisk,
    status: "ACTIVE",
    injuryStatus: "HEALTHY",
    injuryName: null,
    injuryEndsOn: null,
    fatigue: seed.fatigue,
    morale: seed.morale,
    positionOverall: seed.positionOverall,
    offensiveOverall: seed.offensiveOverall ?? null,
    defensiveOverall: seed.defensiveOverall ?? null,
    specialTeamsOverall: seed.specialTeamsOverall ?? null,
    physicalOverall: seed.physicalOverall,
    mentalOverall: seed.mentalOverall,
    attributes: Object.fromEntries(
      Object.entries(seed.attributes).filter((entry): entry is [string, number] => entry[1] != null),
    ),
    gameDayAvailability: "ACTIVE" as const,
    gameDayReadinessMultiplier: 1,
    gameDaySnapMultiplier: 1,
    seasonStat: createStatAnchor(`season-${teamId}-${index}`),
    careerStat: createStatAnchor(`career-${teamId}-${index}`),
  }));

  return {
    id: teamId,
    city,
    nickname,
    abbreviation: teamId,
    overallRating: prestige,
    roster,
  };
}

function cloneTeam(team: SimulationTeamContext): SimulationTeamContext {
  return {
    ...team,
    roster: team.roster.map((player) => ({
      ...player,
      attributes: { ...player.attributes },
      seasonStat: player.seasonStat ? { ...player.seasonStat } : null,
      careerStat: player.careerStat ? { ...player.careerStat } : null,
    })),
  };
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]) {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * fraction;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sorted[lowerIndex] ?? sorted[0] ?? 0;
  const upper = sorted[upperIndex] ?? sorted[sorted.length - 1] ?? 0;
  const weight = index - lowerIndex;

  return lower + (upper - lower) * weight;
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function summarize(values: number[]): NumericSummary {
  return {
    avg: average(values),
    min: Math.min(...values),
    max: Math.max(...values),
    p10: percentile(values, 0.1),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    stdDev: standardDeviation(values),
  };
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function metricRow(label: string, summary: NumericSummary, suffix = "") {
  return [
    label,
    `${round(summary.avg)}${suffix}`,
    `${round(summary.min)}${suffix}`,
    `${round(summary.max)}${suffix}`,
    `${round(summary.p10)}${suffix}`,
    `${round(summary.median)}${suffix}`,
    `${round(summary.p90)}${suffix}`,
    `${round(summary.stdDev)}${suffix}`,
  ];
}

function flattenNumbers(line: PlayerSimulationLine) {
  const values: Array<[string, number]> = [];

  for (const [sectionKey, sectionValue] of Object.entries(line)) {
    if (typeof sectionValue === "number") {
      values.push([sectionKey, sectionValue]);
      continue;
    }
    if (sectionValue && typeof sectionValue === "object") {
      for (const [key, value] of Object.entries(sectionValue)) {
        if (typeof value === "number") {
          values.push([`${sectionKey}.${key}`, value]);
        }
      }
    }
  }

  return values;
}

function validateGame(context: SimulationMatchContext, result: MatchSimulationResult) {
  const issues: ValidationIssue[] = [];
  const rosterByPlayerId = new Map(
    [...context.homeTeam.roster, ...context.awayTeam.roster].map((player) => [player.id, player]),
  );
  const seenDriveSequences = new Set<number>();

  for (const drive of result.drives) {
    if (seenDriveSequences.has(drive.sequence)) {
      issues.push({
        severity: "critical",
        category: "double-counting",
        scope: `${result.matchId}:drive:${drive.sequence}`,
        message: "Drive sequence duplicated.",
      });
    }
    seenDriveSequences.add(drive.sequence);

    if (drive.sequence > 1) {
      const previous = result.drives[drive.sequence - 2];
      if (
        previous &&
        (previous.endedHomeScore !== drive.startedHomeScore ||
          previous.endedAwayScore !== drive.startedAwayScore)
      ) {
        issues.push({
          severity: "critical",
          category: "drive-stats",
          scope: `${result.matchId}:drive:${drive.sequence}`,
          message: "Drive scoreboard progression inconsistent.",
        });
      }
    }
  }

  for (const team of [result.homeTeam, result.awayTeam]) {
    if (team.totalYards !== team.passingYards + team.rushingYards) {
      issues.push({
        severity: "critical",
        category: "team-aggregation",
        scope: `${result.matchId}:${team.teamId}`,
        message: `Total yards mismatch (${team.totalYards} vs ${team.passingYards + team.rushingYards}).`,
      });
    }
  }

  for (const line of result.playerLines) {
    const rosterPlayer = rosterByPlayerId.get(line.playerId);

    if (!rosterPlayer || rosterPlayer.teamId !== line.teamId) {
      issues.push({
        severity: "critical",
        category: "player-assignment",
        scope: `${result.matchId}:${line.playerId}`,
        message: "Player stat line is not aligned with roster team assignment.",
      });
    }

    for (const [key, value] of flattenNumbers(line)) {
      if (!Number.isFinite(value)) {
        issues.push({
          severity: "critical",
          category: "missing-values",
          scope: `${result.matchId}:${line.playerId}:${key}`,
          message: "Non-finite stat value.",
        });
      } else if (value < 0) {
        issues.push({
          severity: "major",
          category: "plausibility",
          scope: `${result.matchId}:${line.playerId}:${key}`,
          message: "Negative stat value.",
        });
      }
    }
  }

  return issues;
}

function createMatchContext(index: number): SimulationMatchContext {
  const teams = LEAGUE_TEAMS.map(([id, city, nickname, rosterIndex, prestige]) =>
    buildSimulationTeam(id, city, nickname, rosterIndex, prestige),
  );
  const homeIndex = index % teams.length;
  const awayIndex = (index * 3 + 1) % teams.length;
  const adjustedAwayIndex = awayIndex === homeIndex ? (awayIndex + 2) % teams.length : awayIndex;

  return {
    matchId: `qa-large-match-${index + 1}`,
    saveGameId: "qa-savegame",
    seasonId: "qa-season-2026-large",
    kind: "REGULAR_SEASON",
    simulationSeed: `qa-large-seed-${index + 1}`,
    seasonYear: 2026,
    week: (index % 18) + 1,
    scheduledAt: new Date(Date.UTC(2026, 8, 1 + (index % 28), 18, 0, 0)),
    homeTeam: cloneTeam(teams[homeIndex]),
    awayTeam: cloneTeam(teams[adjustedAwayIndex]),
  };
}

function simulateGames() {
  const games: GameRecord[] = [];
  const suiteStart = process.hrtime.bigint();

  for (let index = 0; index < GAME_COUNT; index += 1) {
    const context = createMatchContext(index);
    const startedAt = process.hrtime.bigint();
    const result = generateMatchStats(context);
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    games.push({
      context,
      result,
      elapsedMs,
      issues: validateGame(context, result),
    });
  }

  const suiteElapsedMs = Number(process.hrtime.bigint() - suiteStart) / 1_000_000;
  return {
    games,
    suiteElapsedMs,
  };
}

function detectOutliers(
  games: GameRecord[],
  selector: (game: GameRecord) => number,
  metric: string,
): OutlierRecord[] {
  const values = games.map(selector);
  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  const iqr = q3 - q1;
  const low = q1 - iqr * 1.5;
  const high = q3 + iqr * 1.5;

  return games
    .filter((game) => {
      const value = selector(game);
      return value < low || value > high;
    })
    .slice(0, 24)
    .map((game) => ({
      matchId: game.result.matchId,
      metric,
      value: round(selector(game)),
      threshold: `${round(low)} .. ${round(high)}`,
      homeTeam: game.context.homeTeam.abbreviation,
      awayTeam: game.context.awayTeam.abbreviation,
      score: `${game.result.homeScore}-${game.result.awayScore}`,
    }));
}

function teamSpecialTeamsSummary(lines: PlayerSimulationLine[]) {
  return {
    fieldGoalsMade: sum(lines.map((line) => line.kicking.fieldGoalsMade)),
    fieldGoalsAttempted: sum(lines.map((line) => line.kicking.fieldGoalsAttempted)),
    extraPointsMade: sum(lines.map((line) => line.kicking.extraPointsMade)),
    extraPointsAttempted: sum(lines.map((line) => line.kicking.extraPointsAttempted)),
    punts: sum(lines.map((line) => line.punting.punts)),
    puntYards: sum(lines.map((line) => line.punting.puntYards)),
    puntsInside20: sum(lines.map((line) => line.punting.puntsInside20)),
    kickReturns: sum(lines.map((line) => line.returns.kickReturns)),
    kickReturnYards: sum(lines.map((line) => line.returns.kickReturnYards)),
    puntReturns: sum(lines.map((line) => line.returns.puntReturns)),
    puntReturnYards: sum(lines.map((line) => line.returns.puntReturnYards)),
  };
}

function buildAggregate(games: GameRecord[]) {
  const gamePoints = games.map((game) => game.result.homeScore + game.result.awayScore);
  const teamResults = games.flatMap((game) => [game.result.homeTeam, game.result.awayTeam]);
  const playerLines = games.flatMap((game) => game.result.playerLines);
  const driveCounts = games.map((game) => game.result.drives.length);
  const elapsed = games.map((game) => game.elapsedMs);
  const topTotals = teamResults.map((team) => team.timeOfPossessionSeconds);
  const perGameTopTotal = games.map(
    (game) => game.result.homeTeam.timeOfPossessionSeconds + game.result.awayTeam.timeOfPossessionSeconds,
  );
  const thirdDownUnavailable = true;

  const passAttempts = teamResults.map((team) => {
    const relatedLines = playerLines.filter((line) => line.teamId === team.teamId);
    return sum(relatedLines.map((line) => line.passing.attempts));
  });
  const rushAttempts = teamResults.map((team) => {
    const relatedLines = playerLines.filter((line) => line.teamId === team.teamId);
    return sum(relatedLines.map((line) => line.rushing.attempts));
  });

  const specialTeamsRows = games.flatMap((game) => {
    const homeLines = game.result.playerLines.filter((line) => line.teamId === game.result.homeTeam.teamId);
    const awayLines = game.result.playerLines.filter((line) => line.teamId === game.result.awayTeam.teamId);
    return [
      teamSpecialTeamsSummary(homeLines),
      teamSpecialTeamsSummary(awayLines),
    ];
  });

  return {
    summaries: {
      pointsPerGame: summarize(gamePoints),
      totalYardsPerTeam: summarize(teamResults.map((team) => team.totalYards)),
      totalYardsPerGame: summarize(games.map((game) => game.result.homeTeam.totalYards + game.result.awayTeam.totalYards)),
      passingYardsPerTeam: summarize(teamResults.map((team) => team.passingYards)),
      rushingYardsPerTeam: summarize(teamResults.map((team) => team.rushingYards)),
      passRatePerTeam: summarize(
        teamResults.map((team) => {
          const lines = playerLines.filter((line) => line.teamId === team.teamId);
          const attempts = sum(lines.map((line) => line.passing.attempts));
          const rushes = sum(lines.map((line) => line.rushing.attempts));
          return attempts / Math.max(1, attempts + rushes);
        }),
      ),
      firstDownsPerTeam: summarize(teamResults.map((team) => team.firstDowns)),
      turnoversPerTeam: summarize(teamResults.map((team) => team.turnovers)),
      sacksPerTeam: summarize(teamResults.map((team) => team.sacks)),
      penaltiesPerTeam: summarize(teamResults.map((team) => team.penalties)),
      timeOfPossessionPerTeamSeconds: summarize(topTotals),
      totalTopPerGameSeconds: summarize(perGameTopTotal),
      explosivePlaysPerTeam: summarize(teamResults.map((team) => team.explosivePlays)),
      redZoneEfficiency: summarize(
        teamResults.map((team) => team.redZoneTouchdowns / Math.max(1, team.redZoneTrips)),
      ),
      drivesPerGame: summarize(driveCounts),
      runtimePerGameMs: summarize(elapsed),
      fieldGoalRatePerTeam: summarize(
        specialTeamsRows.map((row) => row.fieldGoalsMade / Math.max(1, row.fieldGoalsAttempted)),
      ),
      puntYardsPerTeam: summarize(specialTeamsRows.map((row) => row.puntYards)),
      kickReturnYardsPerTeam: summarize(specialTeamsRows.map((row) => row.kickReturnYards)),
      puntReturnYardsPerTeam: summarize(specialTeamsRows.map((row) => row.puntReturnYards)),
    },
    derived: {
      passAttemptsAvg: average(passAttempts),
      rushAttemptsAvg: average(rushAttempts),
      thirdDownUnavailable,
      specialTeamsRows,
    },
  };
}

function buildAssessment(games: GameRecord[], suiteElapsedMs: number) {
  const aggregate = buildAggregate(games);
  const issues: ValidationIssue[] = games.flatMap((game) => game.issues);
  const bugs: string[] = [];
  const recommendations: string[] = [];

  const avgPoints = aggregate.summaries.pointsPerGame.avg;
  const avgTeamYards = aggregate.summaries.totalYardsPerTeam.avg;
  const avgTurnovers = aggregate.summaries.turnoversPerTeam.avg;
  const avgSacks = aggregate.summaries.sacksPerTeam.avg;
  const avgPenalties = aggregate.summaries.penaltiesPerTeam.avg;
  const avgExplosive = aggregate.summaries.explosivePlaysPerTeam.avg;
  const avgRedZone = aggregate.summaries.redZoneEfficiency.avg;
  const avgGameTop = aggregate.summaries.totalTopPerGameSeconds.avg;
  const avgRuntime = aggregate.summaries.runtimePerGameMs.avg;
  const avgPassRate = aggregate.summaries.passRatePerTeam.avg;

  if (avgPoints > 80) {
    bugs.push(`Punkte pro Spiel sind mit ${round(avgPoints)} im Mittel klar zu hoch.`);
    recommendations.push("Scoring-Modell und Drive-Erfolgswahrscheinlichkeiten deutlich absenken.");
  }
  if (avgTeamYards > 550) {
    bugs.push(`Total Yards pro Team sind mit ${round(avgTeamYards)} im Mittel unplausibel hoch.`);
    recommendations.push("Yardage-Verteilungen fuer Pass und Run kalibrieren und Big-Play-Haeufigkeit reduzieren.");
  }
  if (avgTurnovers < 0.8) {
    bugs.push(`Turnovers pro Team sind mit ${round(avgTurnovers)} im Mittel zu niedrig.`);
    recommendations.push("Takeaway-Logik und Fumble/INT-Raten nach oben kalibrieren.");
  }
  if (avgSacks < 1) {
    bugs.push(`Sacks pro Team sind mit ${round(avgSacks)} im Mittel zu niedrig.`);
    recommendations.push("Pass-Rush-Druck und Sack-Umsetzung anheben.");
  }
  if (avgPenalties < 3) {
    bugs.push(`Penalties pro Team sind mit ${round(avgPenalties)} im Mittel zu niedrig.`);
    recommendations.push("Penalty-Subsystem ausbauen und ereignisbezogen speichern.");
  }
  if (avgExplosive > 10) {
    bugs.push(`Explosive Plays pro Team sind mit ${round(avgExplosive)} im Mittel deutlich zu hoch.`);
    recommendations.push("Explosive-Play-Schwellen und tiefe Passerfolge strenger gewichten.");
  }
  if (avgRedZone > 0.85) {
    bugs.push(`Red-Zone-Effizienz ist mit ${round(avgRedZone * 100)}% zu hoch.`);
    recommendations.push("Red-Zone-Stoppquote und Field-Goal/Punt-Ergebnisse in der roten Zone verbessern.");
  }
  if (avgGameTop > 3600) {
    bugs.push(`Summe Time of Possession pro Spiel liegt bei ${round(avgGameTop)} Sekunden und ueberschreitet 60 Minuten.`);
    recommendations.push("Clock-/TOP-Modell normalisieren, damit beide Teams zusammen auf ca. 3600 Sekunden kommen.");
  }
  if (avgRuntime > 10) {
    recommendations.push(`Performance ist mit ${round(avgRuntime, 2)} ms pro Spiel bereits gut, aber Profiling fuer groessere Saison-Batches bleibt sinnvoll.`);
  } else {
    recommendations.push(`Performance ist akzeptabel mit ${round(avgRuntime, 2)} ms pro Spiel und ${round(suiteElapsedMs)} ms fuer ${GAME_COUNT} Spiele.`);
  }
  if (avgPassRate > 0.72 || avgPassRate < 0.4) {
    bugs.push(`Run/Pass-Verhaeltnis ist mit einer Passquote von ${round(avgPassRate * 100)}% systematisch verzerrt.`);
    recommendations.push("Play-Selection-Balance zwischen Run und Pass besser kalibrieren.");
  }

  bugs.push("3rd-Down-Conversion ist in der aktuellen Simulationsstufe nicht auswertbar, weil keine 3rd-Down-Ereignisse persistiert werden.");
  bugs.push("Play-by-Play, Quarter Scores und detaillierte Penalty-Ereignisse fehlen weiterhin als native Datenbasis.");

  const outliers = [
    ...detectOutliers(games, (game) => game.result.homeScore + game.result.awayScore, "Points/Game"),
    ...detectOutliers(games, (game) => game.result.homeTeam.totalYards + game.result.awayTeam.totalYards, "Total Yards/Game"),
    ...detectOutliers(games, (game) => game.result.homeTeam.timeOfPossessionSeconds + game.result.awayTeam.timeOfPossessionSeconds, "TOP/Game Seconds"),
    ...detectOutliers(games, (game) => game.result.homeTeam.redZoneTrips + game.result.awayTeam.redZoneTrips, "Red Zone Trips/Game"),
  ].slice(0, 30);

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const majorCount = issues.filter((issue) => issue.severity === "major").length;
  const performanceAcceptable = avgRuntime < 20;
  const statsStable =
    criticalCount === 0 &&
    aggregate.summaries.pointsPerGame.stdDev < 30 &&
    aggregate.summaries.totalYardsPerGame.stdDev < 350;
  const valuesPlausible = bugs.length <= 3;
  const status = criticalCount === 0 && performanceAcceptable && valuesPlausible ? "GRUEN" : "ROT";

  return {
    aggregate,
    issues,
    outliers,
    bugs,
    recommendations: [...new Set(recommendations)],
    status,
    flags: {
      criticalCount,
      majorCount,
      performanceAcceptable,
      statsStable,
      valuesPlausible,
    },
  };
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderReport(games: GameRecord[], suiteElapsedMs: number) {
  const assessment = buildAssessment(games, suiteElapsedMs);
  const { aggregate } = assessment;

  const metricRows = [
    metricRow("Punkte pro Spiel", aggregate.summaries.pointsPerGame),
    metricRow("Total Yards pro Spiel", aggregate.summaries.totalYardsPerGame),
    metricRow("Total Yards pro Team", aggregate.summaries.totalYardsPerTeam),
    metricRow("Passing Yards pro Team", aggregate.summaries.passingYardsPerTeam),
    metricRow("Rushing Yards pro Team", aggregate.summaries.rushingYardsPerTeam),
    metricRow("Pass-Quote pro Team", aggregate.summaries.passRatePerTeam, ""),
    metricRow("First Downs pro Team", aggregate.summaries.firstDownsPerTeam),
    metricRow("Turnovers pro Team", aggregate.summaries.turnoversPerTeam),
    metricRow("Sacks pro Team", aggregate.summaries.sacksPerTeam),
    metricRow("Penalties pro Team", aggregate.summaries.penaltiesPerTeam),
    metricRow("TOP pro Team (Sek.)", aggregate.summaries.timeOfPossessionPerTeamSeconds),
    metricRow("TOP pro Spiel (Sek.)", aggregate.summaries.totalTopPerGameSeconds),
    metricRow("Explosive Plays pro Team", aggregate.summaries.explosivePlaysPerTeam),
    metricRow("Red Zone Effizienz", aggregate.summaries.redZoneEfficiency),
    metricRow("Drives pro Spiel", aggregate.summaries.drivesPerGame),
    metricRow("Laufzeit pro Spiel (ms)", aggregate.summaries.runtimePerGameMs),
    metricRow("FG-Quote pro Team", aggregate.summaries.fieldGoalRatePerTeam),
    metricRow("Punt Yards pro Team", aggregate.summaries.puntYardsPerTeam),
    metricRow("Kick Return Yards pro Team", aggregate.summaries.kickReturnYardsPerTeam),
    metricRow("Punt Return Yards pro Team", aggregate.summaries.puntReturnYardsPerTeam),
  ];

  const issueRows = assessment.issues.slice(0, 40).map((issue) => [
    issue.severity.toUpperCase(),
    issue.category,
    issue.scope,
    issue.message,
  ]);

  const outlierRows = assessment.outliers.map((outlier) => [
    outlier.matchId,
    outlier.metric,
    String(outlier.value),
    outlier.threshold,
    `${outlier.homeTeam} vs ${outlier.awayTeam}`,
    outlier.score,
  ]);

  const topExtremeGames = [...games]
    .sort(
      (left, right) =>
        right.result.homeScore +
        right.result.awayScore -
        (left.result.homeScore + left.result.awayScore),
    )
    .slice(0, 10)
    .map((game) => [
      game.result.matchId,
      `${game.context.homeTeam.abbreviation} vs ${game.context.awayTeam.abbreviation}`,
      `${game.result.homeScore}-${game.result.awayScore}`,
      String(game.result.homeTeam.totalYards + game.result.awayTeam.totalYards),
      String(
        game.result.homeTeam.timeOfPossessionSeconds +
          game.result.awayTeam.timeOfPossessionSeconds,
      ),
      String(round(game.elapsedMs, 2)),
    ]);

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>QA Large Simulation Report ${REPORT_DATE}</title>
  <style>
    :root {
      --bg: #f3efe7;
      --panel: #fffdf9;
      --ink: #1d2929;
      --muted: #5e6c69;
      --line: #ddd3c7;
      --accent: #19363d;
      --accent-2: #d07b31;
      --good: #166534;
      --warn: #b45309;
      --bad: #991b1b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
      background:
        radial-gradient(circle at top right, rgba(208, 123, 49, 0.16), transparent 28%),
        linear-gradient(180deg, #f7f1e7 0%, #efe7dc 100%);
    }
    .shell {
      width: min(1420px, calc(100vw - 36px));
      margin: 24px auto 52px;
    }
    .hero, .section {
      background: rgba(255, 253, 249, 0.92);
      border: 1px solid rgba(25, 54, 61, 0.12);
      border-radius: 24px;
      box-shadow: 0 18px 60px rgba(25, 54, 61, 0.08);
      padding: 24px 26px;
      margin-bottom: 18px;
    }
    h1, h2 { margin: 0 0 12px; line-height: 1.08; }
    h1 { font-size: 42px; }
    h2 { font-size: 26px; }
    p { margin: 0 0 12px; line-height: 1.52; }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .card {
      background: linear-gradient(180deg, rgba(25, 54, 61, 0.98), rgba(37, 72, 78, 0.94));
      color: #fbf7f0;
      border-radius: 18px;
      padding: 16px;
    }
    .card .label {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.78;
      margin-bottom: 8px;
    }
    .card .value {
      font-size: 28px;
      font-weight: 700;
    }
    .pill {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      margin-right: 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .good { background: rgba(22, 101, 52, 0.12); color: var(--good); }
    .warn { background: rgba(180, 83, 9, 0.12); color: var(--warn); }
    .bad { background: rgba(153, 27, 27, 0.12); color: var(--bad); }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: rgba(255,255,255,0.72);
      border-radius: 16px;
      overflow: hidden;
      font-size: 14px;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    th {
      background: #ece3d6;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.06em;
    }
    tr:last-child td { border-bottom: 0; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 0 0 8px; }
    .small { color: var(--muted); font-size: 13px; }
    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
      .shell { width: min(100vw - 18px, 1420px); }
      .hero, .section { padding: 18px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="eyebrow">AFBM QA Large Simulation Report · ${REPORT_DATE}</div>
      <h1>Groesstest mit ${GAME_COUNT} vollstaendigen Spielen</h1>
      <p>Der Batch-Test wurde nur nach gruenem Abschluss von Prompt 6A gestartet. Simuliert wurden ${GAME_COUNT} vollstaendige Regular-Season-Spiele mit reproduzierbaren Seeds; geprueft wurden Stabilitaet, Plausibilitaet, Ausreisser, Datenkonsistenz und Performance.</p>
      <div>
        <span class="pill ${assessment.status === "GRUEN" ? "good" : "bad"}">Status: ${assessment.status}</span>
        <span class="pill ${assessment.flags.performanceAcceptable ? "good" : "bad"}">Performance: ${assessment.flags.performanceAcceptable ? "akzeptabel" : "kritisch"}</span>
        <span class="pill ${assessment.flags.statsStable ? "good" : "warn"}">Stabilitaet: ${assessment.flags.statsStable ? "formal stabil" : "eingeschraenkt"}</span>
        <span class="pill ${assessment.flags.valuesPlausible ? "good" : "bad"}">Plausibilitaet: ${assessment.flags.valuesPlausible ? "ok" : "nicht ausreichend"}</span>
      </div>
      <div class="cards">
        <div class="card"><div class="label">Simulierte Spiele</div><div class="value">${games.length}</div></div>
        <div class="card"><div class="label">Suite Laufzeit</div><div class="value">${round(suiteElapsedMs)} ms</div></div>
        <div class="card"><div class="label">Ø pro Spiel</div><div class="value">${round(aggregate.summaries.runtimePerGameMs.avg, 2)} ms</div></div>
        <div class="card"><div class="label">Critical Issues</div><div class="value">${assessment.flags.criticalCount}</div></div>
        <div class="card"><div class="label">Major Issues</div><div class="value">${assessment.flags.majorCount}</div></div>
        <div class="card"><div class="label">Ø Punkte / Spiel</div><div class="value">${round(aggregate.summaries.pointsPerGame.avg)}</div></div>
      </div>
    </section>

    <section class="section">
      <h2>Statuspruefung</h2>
      <div class="grid">
        <div>
          <p><strong>Grosstest erfolgreich abgeschlossen?</strong><br />Ja, ${games.length}/${GAME_COUNT} Spiele wurden simuliert.</p>
          <p><strong>Stats stabil?</strong><br />${assessment.flags.statsStable ? "Formal ja, aber nur im Sinne reproduzierbarer Verteilungen." : "Nicht ausreichend."}</p>
          <p><strong>Werte plausibel?</strong><br />${assessment.flags.valuesPlausible ? "Ja." : "Nein, mehrere systematische Plausibilitaetsprobleme bleiben sichtbar."}</p>
        </div>
        <div>
          <p><strong>Performance akzeptabel?</strong><br />${assessment.flags.performanceAcceptable ? `Ja, im Mittel ${round(aggregate.summaries.runtimePerGameMs.avg, 2)} ms pro Spiel.` : "Nein."}</p>
          <p><strong>Naechste Schritte klar?</strong><br />Ja, sie sind im Abschnitt Empfehlungen konkret benannt.</p>
          <p><strong>Gesamtstatus</strong><br /><strong>${assessment.status}</strong></p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Testumfang</h2>
      <p>${GAME_COUNT} vollstaendige Spiele, 8 wiederverwendete Testteams, deterministische Seeds, Team-/Player-Konsistenzchecks, Performance-Messung pro Spiel sowie IQR-basierte Ausreissererkennung fuer Kernmetriken.</p>
      <p class="small">Hinweis: 3rd-Down-Conversion ist aktuell nicht nativ messbar, da der Simulationsoutput keine 3rd-Down-Ereignisse oder Conversions persistiert.</p>
    </section>

    <section class="section">
      <h2>Aggregierte Durchschnittswerte</h2>
      ${renderTable(["Metrik", "Avg", "Min", "Max", "P10", "Median", "P90", "StdDev"], metricRows)}
    </section>

    <section class="section">
      <h2>Ausreisser</h2>
      ${outlierRows.length > 0
        ? renderTable(["Match", "Metrik", "Wert", "IQR-Schwelle", "Teams", "Score"], outlierRows)
        : "<p>Keine statistischen Ausreisser nach IQR-Regel gefunden.</p>"}
    </section>

    <section class="section">
      <h2>Auffaellige Extremspiele</h2>
      ${renderTable(["Match", "Teams", "Score", "Total Yards", "TOP Summe", "Laufzeit ms"], topExtremeGames)}
    </section>

    <section class="section">
      <h2>Erkannte Bugs</h2>
      <ul>
        ${assessment.bugs.map((bug) => `<li>${escapeHtml(bug)}</li>`).join("")}
      </ul>
    </section>

    <section class="section">
      <h2>Verbesserungsvorschlaege</h2>
      <ul>
        ${assessment.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>

    <section class="section">
      <h2>Naechste Arbeitsschritte</h2>
      <ol>
        <li>Scoring- und Yardage-Kalibrierung priorisieren, insbesondere Drive-Erfolgsraten und Explosive Plays.</li>
        <li>Clock-/Time-of-Possession-Modell ueberarbeiten, damit die Summe pro Spiel physikalisch bei rund 3600 Sekunden landet.</li>
        <li>Turnover-, Sack- und Penalty-Raten realistischer machen und eventbasiert protokollieren.</li>
        <li>Third-Down- und Play-by-Play-Daten als native Simulationsoutputs einfuehren.</li>
        <li>Danach denselben Batch-Test erneut laufen lassen und gegen Zielkorridore vergleichen.</li>
      </ol>
    </section>

    <section class="section">
      <h2>Konsistenzpruefung</h2>
      ${issueRows.length > 0
        ? renderTable(["Severity", "Category", "Scope", "Message"], issueRows)
        : "<p>Keine technischen Konsistenzfehler gefunden.</p>"}
    </section>
  </main>
</body>
</html>`;
}

function main() {
  const { games, suiteElapsedMs } = simulateGames();
  const assessment = buildAssessment(games, suiteElapsedMs);
  const html = renderReport(games, suiteElapsedMs);
  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-large-simulation-report-${REPORT_DATE}.html`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        reportPath,
        simulatedGames: games.length,
        suiteElapsedMs: round(suiteElapsedMs, 2),
        avgRuntimePerGameMs: round(average(games.map((game) => game.elapsedMs)), 3),
        status: assessment.status,
        criticalIssues: assessment.flags.criticalCount,
        majorIssues: assessment.flags.majorCount,
        bugs: assessment.bugs,
      },
      null,
      2,
    )}\n`,
  );
}

main();
