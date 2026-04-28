import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildInitialRoster } from "../../src/modules/savegames/application/bootstrap/initial-roster";
import { generateMatchStats } from "../../src/modules/seasons/application/simulation/match-engine";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "../../src/modules/seasons/application/simulation/simulation.types";

type SimulatedGame = {
  context: SimulationMatchContext;
  result: MatchSimulationResult;
  validation: GameValidation;
};

type ValidationIssue = {
  severity: "critical" | "major" | "minor";
  category:
    | "team-aggregation"
    | "player-assignment"
    | "drive-stats"
    | "double-counting"
    | "missing-values"
    | "reporting-gap"
    | "plausibility";
  scope: string;
  message: string;
};

type GameValidation = {
  passed: boolean;
  issues: ValidationIssue[];
  metrics: {
    missingValueCount: number;
    criticalIssueCount: number;
    majorIssueCount: number;
    minorIssueCount: number;
  };
};

type TeamRollup = {
  score: number;
  touchdowns: number;
  firstDowns: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  sacks: number;
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
  penalties: number;
  timeOfPossessionSeconds: number;
};

type QuarterScore = {
  label: string;
  home: number;
  away: number;
  note?: string;
};

type PlayerReportRow = {
  player: string;
  team: string;
  started: string;
  pass: string;
  rush: string;
  rec: string;
  defense: string;
  snaps: string;
};

const REPORT_DATE = "2026-04-24";
const GAME_COUNT = 10;
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

function createMatchContexts(): SimulationMatchContext[] {
  const teams = LEAGUE_TEAMS.map(([id, city, nickname, rosterIndex, prestige]) =>
    buildSimulationTeam(id, city, nickname, rosterIndex, prestige),
  );
  const pairings: Array<[number, number]> = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 0],
    [0, 4],
    [1, 5],
  ];

  return pairings.map(([homeIndex, awayIndex], index) => ({
    matchId: `qa-match-${index + 1}`,
    saveGameId: "qa-savegame",
    seasonId: "qa-season-2026",
    kind: "REGULAR_SEASON",
    simulationSeed: `qa-seed-${index + 1}`,
    seasonYear: 2026,
    week: index + 1,
    scheduledAt: new Date(Date.UTC(2026, 8, 1 + index, 18, 0, 0)),
    homeTeam: cloneTeam(teams[homeIndex]),
    awayTeam: cloneTeam(teams[awayIndex]),
  }));
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

function simulateGames(): SimulatedGame[] {
  return createMatchContexts().map((context) => {
    const result = generateMatchStats(context);
    return {
      context,
      result,
      validation: validateGame(context, result),
    };
  });
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function teamName(team: SimulationTeamContext) {
  return `${team.city} ${team.nickname}`;
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function findTeamContext(context: SimulationMatchContext, teamId: string) {
  return context.homeTeam.id === teamId ? context.homeTeam : context.awayTeam;
}

function aggregateFromDrives(result: MatchSimulationResult): Map<string, TeamRollup> {
  const rollups = new Map<string, TeamRollup>();

  for (const teamId of [result.homeTeam.teamId, result.awayTeam.teamId]) {
    rollups.set(teamId, {
      score: 0,
      touchdowns: 0,
      firstDowns: 0,
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnovers: 0,
      sacks: 0,
      explosivePlays: 0,
      redZoneTrips: 0,
      redZoneTouchdowns: 0,
      penalties: 0,
      timeOfPossessionSeconds: 0,
    });
  }

  for (const drive of result.drives) {
    const offense = rollups.get(drive.offenseTeamId);
    const defense = rollups.get(drive.defenseTeamId);

    if (!offense || !defense) {
      continue;
    }

    offense.score += drive.pointsScored;
    offense.totalYards += drive.totalYards;
    offense.firstDowns += Math.max(1, Math.floor(drive.totalYards / 12));
    offense.timeOfPossessionSeconds += estimateDriveTimeSeconds(drive);

    const derivedPassing = Math.round((drive.totalYards * drive.passAttempts) / Math.max(1, drive.plays));
    const derivedRushing = drive.totalYards - derivedPassing;
    offense.passingYards += derivedPassing;
    offense.rushingYards += derivedRushing;

    if (drive.resultType === "TOUCHDOWN") {
      offense.touchdowns += 1;
    }
    if (drive.turnover) {
      offense.turnovers += 1;
    }
    if (drive.redZoneTrip) {
      offense.redZoneTrips += 1;
      if (drive.resultType === "TOUCHDOWN") {
        offense.redZoneTouchdowns += 1;
      }
    }
    if (drive.totalYards >= 20) {
      offense.explosivePlays += 1;
    }
    if (drive.resultType === "TURNOVER" || drive.resultType === "PUNT") {
      defense.sacks += 0;
    }
  }

  return rollups;
}

function estimateDriveTimeSeconds(drive: MatchDriveResult) {
  return Math.max(45, drive.plays * 24 + (drive.passAttempts > drive.rushAttempts ? 8 : 18));
}

function aggregateFromPlayers(result: MatchSimulationResult): Map<string, TeamRollup> {
  const rollups = new Map<string, TeamRollup>();

  for (const teamId of [result.homeTeam.teamId, result.awayTeam.teamId]) {
    rollups.set(teamId, {
      score: 0,
      touchdowns: 0,
      firstDowns: 0,
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnovers: 0,
      sacks: 0,
      explosivePlays: 0,
      redZoneTrips: 0,
      redZoneTouchdowns: 0,
      penalties: 0,
      timeOfPossessionSeconds: 0,
    });
  }

  for (const line of result.playerLines) {
    const team = rollups.get(line.teamId);

    if (!team) {
      continue;
    }

    team.passingYards += line.passing.yards;
    team.rushingYards += line.rushing.yards;
    team.totalYards += line.passing.yards + line.rushing.yards;
    team.touchdowns += line.passing.touchdowns + line.rushing.touchdowns;
    team.turnovers += line.passing.interceptions + line.rushing.fumbles;
    team.sacks += Math.round(line.defensive.sacks);
    team.explosivePlays +=
      Number(line.passing.longestCompletion >= 20) +
      Number(line.rushing.longestRush >= 20) +
      Number(line.receiving.longestReception >= 20);
    team.score +=
      (line.passing.touchdowns + line.rushing.touchdowns) * 6 +
      line.kicking.extraPointsMade +
      line.kicking.fieldGoalsMade * 3;
  }

  return rollups;
}

function compareNumber(
  issues: ValidationIssue[],
  input: {
    actual: number;
    expected: number;
    scope: string;
    category: ValidationIssue["category"];
    label: string;
    tolerance?: number;
    severity?: ValidationIssue["severity"];
  },
) {
  const tolerance = input.tolerance ?? 0;

  if (Math.abs(input.actual - input.expected) <= tolerance) {
    return;
  }

  issues.push({
    severity: input.severity ?? "major",
    category: input.category,
    scope: input.scope,
    message: `${input.label}: erwartet ${input.expected}, erhalten ${input.actual}.`,
  });
}

function validateGame(
  context: SimulationMatchContext,
  result: MatchSimulationResult,
): GameValidation {
  const issues: ValidationIssue[] = [];
  const driveRollups = aggregateFromDrives(result);
  const playerRollups = aggregateFromPlayers(result);
  const teamResults = [result.homeTeam, result.awayTeam];
  const teamIds = new Set(teamResults.map((team) => team.teamId));
  const rosterByPlayerId = new Map(
    [...context.homeTeam.roster, ...context.awayTeam.roster].map((player) => [player.id, player]),
  );
  const seenDriveSequences = new Set<number>();

  if (result.drives.length < 10) {
    issues.push({
      severity: "major",
      category: "plausibility",
      scope: result.matchId,
      message: `Nur ${result.drives.length} Drives erzeugt; fuer ein volles Spiel ist das niedrig.`,
    });
  }

  for (const drive of result.drives) {
    if (seenDriveSequences.has(drive.sequence)) {
      issues.push({
        severity: "critical",
        category: "double-counting",
        scope: `drive ${drive.sequence}`,
        message: "Drive-Sequenz ist doppelt vorhanden.",
      });
    }
    seenDriveSequences.add(drive.sequence);

    if (drive.sequence > 1) {
      const previous = result.drives[drive.sequence - 2];
      if (previous) {
        if (
          previous.endedHomeScore !== drive.startedHomeScore ||
          previous.endedAwayScore !== drive.startedAwayScore
        ) {
          issues.push({
            severity: "critical",
            category: "drive-stats",
            scope: `drive ${drive.sequence}`,
            message: "Scoreboard-Fortschreibung zwischen zwei Drives ist inkonsistent.",
          });
        }
      }
    }

    if (drive.pointsScored < 0 || drive.totalYards < 0 || drive.plays <= 0) {
      issues.push({
        severity: "major",
        category: "plausibility",
        scope: `drive ${drive.sequence}`,
        message: "Drive enthaelt unplausible negative oder leere Kernwerte.",
      });
    }
  }

  for (const team of teamResults) {
    const driveRollup = driveRollups.get(team.teamId);
    const playerRollup = playerRollups.get(team.teamId);

    compareNumber(issues, {
      actual: team.score,
      expected: team === result.homeTeam ? result.homeScore : result.awayScore,
      scope: team.teamId,
      category: "team-aggregation",
      label: "Team-Score vs. Match-Endstand",
      severity: "critical",
    });

    if (driveRollup) {
      compareNumber(issues, {
        actual: team.score,
        expected: driveRollup.score,
        scope: team.teamId,
        category: "drive-stats",
        label: "Team-Score vs. Drive-Summe",
        severity: "critical",
      });
      compareNumber(issues, {
        actual: team.totalYards,
        expected: driveRollup.totalYards,
        scope: team.teamId,
        category: "drive-stats",
        label: "Team Total Yards vs. Drive-Summe",
      });
    }

    if (playerRollup) {
      compareNumber(issues, {
        actual: team.totalYards,
        expected: playerRollup.totalYards,
        scope: team.teamId,
        category: "team-aggregation",
        label: "Team Total Yards vs. Player-Summe",
      });
      compareNumber(issues, {
        actual: team.passingYards,
        expected: playerRollup.passingYards,
        scope: team.teamId,
        category: "team-aggregation",
        label: "Team Passing Yards vs. Player-Summe",
      });
      compareNumber(issues, {
        actual: team.rushingYards,
        expected: playerRollup.rushingYards,
        scope: team.teamId,
        category: "team-aggregation",
        label: "Team Rushing Yards vs. Player-Summe",
      });
      compareNumber(issues, {
        actual: team.sacks,
        expected: playerRollup.sacks,
        scope: team.teamId,
        category: "team-aggregation",
        label: "Team Sacks vs. Player-Summe",
      });
      compareNumber(issues, {
        actual: team.turnovers,
        expected: playerRollup.turnovers,
        scope: team.teamId,
        category: "team-aggregation",
        label: "Team Turnovers vs. Player-Summe",
      });
    }

    if (team.totalYards !== team.passingYards + team.rushingYards) {
      issues.push({
        severity: "critical",
        category: "team-aggregation",
        scope: team.teamId,
        message: `Total Yards stimmen nicht mit Pass+Rush ueberein (${team.totalYards} vs. ${team.passingYards + team.rushingYards}).`,
      });
    }
  }

  for (const line of result.playerLines) {
    const player = rosterByPlayerId.get(line.playerId);

    if (!player) {
      issues.push({
        severity: "critical",
        category: "player-assignment",
        scope: line.playerId,
        message: "Spielerstatistik ohne passenden Roster-Eintrag gefunden.",
      });
      continue;
    }

    if (!teamIds.has(line.teamId) || player.teamId !== line.teamId) {
      issues.push({
        severity: "critical",
        category: "player-assignment",
        scope: line.playerId,
        message: `Spieler ist Team ${line.teamId} zugeordnet, Roster erwartet ${player.teamId}.`,
      });
    }

    for (const [key, value] of flattenNumbers(line)) {
      if (!Number.isFinite(value)) {
        issues.push({
          severity: "critical",
          category: "missing-values",
          scope: `${line.playerId}.${key}`,
          message: "Nicht-endlicher Wert in Player Stats.",
        });
      } else if (value < 0) {
        issues.push({
          severity: "major",
          category: "plausibility",
          scope: `${line.playerId}.${key}`,
          message: `Negativer Stats-Wert gefunden: ${value}.`,
        });
      }
    }
  }

  issues.push({
    severity: "major",
    category: "reporting-gap",
    scope: result.matchId,
    message: "Quarter Scores sind im produktiven Match-Result nicht nativ vorhanden und werden nur aus der Drive-Sequenz abgeleitet.",
  });
  issues.push({
    severity: "major",
    category: "reporting-gap",
    scope: result.matchId,
    message: "Ein echtes Play-by-Play existiert in dieser Simulationsstufe nicht; verfuegbar sind nur Drive-Summaries.",
  });
  issues.push({
    severity: "major",
    category: "reporting-gap",
    scope: result.matchId,
    message: "Penalty-Details werden nur als Team-Zaehler persistiert, nicht als vollstaendiges Ereignisprotokoll mit Spielern/Yards.",
  });

  const criticalIssueCount = issues.filter((issue) => issue.severity === "critical").length;
  const majorIssueCount = issues.filter((issue) => issue.severity === "major").length;
  const minorIssueCount = issues.filter((issue) => issue.severity === "minor").length;

  return {
    passed: criticalIssueCount === 0,
    issues,
    metrics: {
      missingValueCount: issues.filter((issue) => issue.category === "missing-values").length,
      criticalIssueCount,
      majorIssueCount,
      minorIssueCount,
    },
  };
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

function chooseFeaturedGame(games: SimulatedGame[]) {
  return [...games].sort((left, right) => {
    const leftScore =
      left.result.drives.filter((drive) => drive.turnover).length * 20 +
      left.result.drives.filter((drive) => drive.resultType === "TOUCHDOWN").length * 10 +
      left.result.homeScore +
      left.result.awayScore -
      left.validation.metrics.criticalIssueCount * 50;
    const rightScore =
      right.result.drives.filter((drive) => drive.turnover).length * 20 +
      right.result.drives.filter((drive) => drive.resultType === "TOUCHDOWN").length * 10 +
      right.result.homeScore +
      right.result.awayScore -
      right.validation.metrics.criticalIssueCount * 50;
    return rightScore - leftScore;
  })[0];
}

function deriveQuarterScores(game: SimulatedGame): QuarterScore[] {
  const drives = game.result.drives;
  const chunks = [0, 0.25, 0.5, 0.75, 1].map((value) => Math.round(drives.length * value));
  let previousHome = 0;
  let previousAway = 0;

  return ["Q1", "Q2", "Q3", "Q4"].map((label, index) => {
    const slice = drives.slice(chunks[index], chunks[index + 1]);
    const end = slice[slice.length - 1];
    const home = (end?.endedHomeScore ?? previousHome) - previousHome;
    const away = (end?.endedAwayScore ?? previousAway) - previousAway;

    if (end) {
      previousHome = end.endedHomeScore;
      previousAway = end.endedAwayScore;
    }

    return {
      label,
      home,
      away,
      note: "Abgeleitet aus Drive-Reihenfolge, nicht nativ als Quarter-Event gespeichert.",
    };
  });
}

function buildDriveTimeline(game: SimulatedGame) {
  return game.result.drives.map((drive) => ({
    phase: drive.phaseLabel,
    sequence: drive.sequence,
    offense: drive.offenseTeamAbbreviation,
    result: drive.resultType,
    score: `${drive.endedHomeScore}-${drive.endedAwayScore}`,
    summary: drive.summary,
  }));
}

function buildTurnoverRows(game: SimulatedGame) {
  return game.result.drives
    .filter((drive) => drive.turnover)
    .map((drive) => ({
      drive: drive.sequence,
      offense: drive.offenseTeamAbbreviation,
      defense: drive.defenseTeamAbbreviation,
      score: `${drive.endedHomeScore}-${drive.endedAwayScore}`,
      summary: drive.summary,
      primaryPlayer: drive.primaryPlayerName ?? "n/a",
      primaryDefender: drive.primaryDefenderName ?? "n/a",
    }));
}

function buildPenaltyRows(game: SimulatedGame) {
  return [game.result.homeTeam, game.result.awayTeam].map((team) => ({
    team: findTeamContext(game.context, team.teamId)?.abbreviation ?? team.teamId,
    penalties: team.penalties,
    detail: team.penalties > 0 ? "Nur Team-Zaehler vorhanden, keine Eventliste." : "Keine Penalties erfasst.",
  }));
}

function buildSpecialTeamsRows(game: SimulatedGame) {
  return game.result.playerLines
    .filter(
      (line) =>
        line.kicking.fieldGoalsAttempted > 0 ||
        line.kicking.extraPointsAttempted > 0 ||
        line.punting.punts > 0 ||
        line.returns.kickReturns > 0 ||
        line.returns.puntReturns > 0,
    )
    .map((line) => ({
      player: line.playerId,
      team: line.teamId,
      fg: `${line.kicking.fieldGoalsMade}/${line.kicking.fieldGoalsAttempted}`,
      xp: `${line.kicking.extraPointsMade}/${line.kicking.extraPointsAttempted}`,
      punts: line.punting.punts,
      puntYards: line.punting.puntYards,
      inside20: line.punting.puntsInside20,
      kr: `${line.returns.kickReturns} / ${line.returns.kickReturnYards}`,
      pr: `${line.returns.puntReturns} / ${line.returns.puntReturnYards}`,
    }))
    .sort((left, right) => right.puntYards - left.puntYards);
}

function buildKeyPlays(game: SimulatedGame) {
  return [...game.result.drives]
    .sort((left, right) => {
      const leftWeight = left.pointsScored * 10 + left.totalYards + (left.turnover ? 25 : 0);
      const rightWeight = right.pointsScored * 10 + right.totalYards + (right.turnover ? 25 : 0);
      return rightWeight - leftWeight;
    })
    .slice(0, 8)
    .map((drive) => ({
      drive: drive.sequence,
      phase: drive.phaseLabel,
      offense: drive.offenseTeamAbbreviation,
      result: drive.resultType,
      summary: drive.summary,
      impact:
        drive.turnover
          ? "Turnover Swing"
          : drive.pointsScored >= 6
            ? "Scoring Drive"
            : drive.totalYards >= 40
              ? "Field Position Swing"
              : "Efficiency Play",
    }));
}

function buildTeamStatsRows(game: SimulatedGame) {
  return [game.result.homeTeam, game.result.awayTeam].map((team) => ({
    team: findTeamContext(game.context, team.teamId)?.abbreviation ?? team.teamId,
    points: team.score,
    totalYards: team.totalYards,
    passingYards: team.passingYards,
    rushingYards: team.rushingYards,
    firstDowns: team.firstDowns,
    turnovers: team.turnovers,
    sacks: team.sacks,
    explosivePlays: team.explosivePlays,
    redZone: `${team.redZoneTouchdowns}/${team.redZoneTrips}`,
    penalties: team.penalties,
    top: formatSeconds(team.timeOfPossessionSeconds),
  }));
}

function buildPlayerRows(game: SimulatedGame): PlayerReportRow[] {
  return game.result.playerLines
    .filter(
      (line) =>
        line.passing.attempts > 0 ||
        line.rushing.attempts > 0 ||
        line.receiving.targets > 0 ||
        line.defensive.tackles > 0 ||
        line.kicking.fieldGoalsAttempted > 0 ||
        line.punting.punts > 0,
    )
    .map((line) => ({
      player: line.playerId,
      team: line.teamId,
      started: line.started ? "Y" : "N",
      pass: `${line.passing.completions}/${line.passing.attempts}, ${line.passing.yards}y, TD ${line.passing.touchdowns}, INT ${line.passing.interceptions}`,
      rush: `${line.rushing.attempts} car, ${line.rushing.yards}y, TD ${line.rushing.touchdowns}, FUM ${line.rushing.fumbles}`,
      rec: `${line.receiving.receptions}/${line.receiving.targets}, ${line.receiving.yards}y, TD ${line.receiving.touchdowns}`,
      defense: `${line.defensive.tackles} TKL, ${line.defensive.sacks} SK, ${line.defensive.interceptions} INT, FF ${line.defensive.forcedFumbles}`,
      snaps: `${line.snapsOffense}/${line.snapsDefense}/${line.snapsSpecialTeams}`,
    }))
    .sort((left, right) => rankPlayerRow(right) - rankPlayerRow(left));
}

function rankPlayerRow(row: PlayerReportRow) {
  const extractNumbers = row.pass.concat(row.rush, row.rec, row.defense).match(/\d+/g) ?? [];
  return sum(extractNumbers.map(Number));
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderIssues(issues: ValidationIssue[]) {
  const rows = issues.map((issue) => [
    issue.severity.toUpperCase(),
    issue.category,
    issue.scope,
    issue.message,
  ]);
  return renderTable(["Severity", "Category", "Scope", "Message"], rows);
}

function renderSummaryCards(games: SimulatedGame[]) {
  const successful = games.filter((game) => game.validation.passed).length;
  const critical = sum(games.map((game) => game.validation.metrics.criticalIssueCount));
  const major = sum(games.map((game) => game.validation.metrics.majorIssueCount));
  const totalTurnovers = sum(
    games.map((game) => game.result.drives.filter((drive) => drive.turnover).length),
  );

  return `
    <div class="cards">
      <div class="card"><div class="kicker">Simulierte Spiele</div><div class="value">${GAME_COUNT}</div></div>
      <div class="card"><div class="kicker">Erfolgreich</div><div class="value">${successful}/${GAME_COUNT}</div></div>
      <div class="card"><div class="kicker">Critical Issues</div><div class="value">${critical}</div></div>
      <div class="card"><div class="kicker">Major Issues</div><div class="value">${major}</div></div>
      <div class="card"><div class="kicker">Turnovers gesamt</div><div class="value">${totalTurnovers}</div></div>
    </div>
  `;
}

function renderFeaturedGameReport(games: SimulatedGame[]) {
  const featured = chooseFeaturedGame(games);
  if (!featured) {
    throw new Error("No featured game available.");
  }

  const quarterScores = deriveQuarterScores(featured);
  const teamRows = buildTeamStatsRows(featured).map((row) => [
    row.team,
    String(row.points),
    String(row.totalYards),
    String(row.passingYards),
    String(row.rushingYards),
    String(row.firstDowns),
    String(row.turnovers),
    String(row.sacks),
    String(row.explosivePlays),
    row.redZone,
    String(row.penalties),
    row.top,
  ]);
  const playerRows = buildPlayerRows(featured).map((row) => [
    row.player,
    row.team,
    row.started,
    row.pass,
    row.rush,
    row.rec,
    row.defense,
    row.snaps,
  ]);
  const driveRows = featured.result.drives.map((drive) => [
    String(drive.sequence),
    drive.phaseLabel,
    drive.offenseTeamAbbreviation,
    drive.defenseTeamAbbreviation,
    String(drive.plays),
    String(drive.totalYards),
    drive.resultType,
    String(drive.pointsScored),
    `${drive.startedHomeScore}-${drive.startedAwayScore}`,
    `${drive.endedHomeScore}-${drive.endedAwayScore}`,
    drive.summary,
  ]);
  const timelineRows = buildDriveTimeline(featured).map((item) => [
    `${item.phase} #${item.sequence}`,
    item.offense,
    item.result,
    item.score,
    item.summary,
  ]);
  const turnoverRows = buildTurnoverRows(featured).map((row) => [
    String(row.drive),
    row.offense,
    row.defense,
    row.score,
    row.primaryPlayer,
    row.primaryDefender,
    row.summary,
  ]);
  const penaltyRows = buildPenaltyRows(featured).map((row) => [
    row.team,
    String(row.penalties),
    row.detail,
  ]);
  const specialTeamsRows = buildSpecialTeamsRows(featured).map((row) => [
    row.player,
    row.team,
    row.fg,
    row.xp,
    String(row.punts),
    String(row.puntYards),
    String(row.inside20),
    row.kr,
    row.pr,
  ]);
  const keyPlayRows = buildKeyPlays(featured).map((row) => [
    String(row.drive),
    row.phase,
    row.offense,
    row.result,
    row.impact,
    row.summary,
  ]);
  const quarterRows = quarterScores.map((quarter) => [
    quarter.label,
    String(quarter.home),
    String(quarter.away),
    quarter.note ?? "",
  ]);
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>QA Match Report ${escapeHtml(featured.result.matchId)}</title>
  <style>
    :root {
      --bg: #f4efe6;
      --panel: #fffdf8;
      --ink: #1e2a2a;
      --muted: #5b6a6b;
      --line: #d9d0c3;
      --accent: #12343b;
      --accent-2: #d9843b;
      --warn: #b45309;
      --bad: #991b1b;
      --good: #166534;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background:
        radial-gradient(circle at top left, rgba(217, 132, 59, 0.18), transparent 30%),
        linear-gradient(180deg, #f6f0e6 0%, #efe7db 100%);
      color: var(--ink);
    }
    .shell {
      width: min(1380px, calc(100vw - 40px));
      margin: 28px auto 56px;
    }
    .hero, .section {
      background: rgba(255, 253, 248, 0.9);
      border: 1px solid rgba(18, 52, 59, 0.12);
      border-radius: 22px;
      box-shadow: 0 20px 60px rgba(18, 52, 59, 0.08);
      backdrop-filter: blur(8px);
      padding: 24px 26px;
      margin-bottom: 18px;
    }
    h1, h2, h3 { margin: 0 0 12px; line-height: 1.1; }
    h1 { font-size: 42px; }
    h2 { font-size: 26px; }
    p { margin: 0 0 12px; line-height: 1.5; }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .scoreline {
      display: flex;
      gap: 16px;
      align-items: center;
      font-size: 28px;
      font-weight: 700;
      margin: 16px 0 8px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .card {
      background: linear-gradient(180deg, rgba(18, 52, 59, 0.97), rgba(28, 65, 71, 0.92));
      color: #f7f4ee;
      border-radius: 18px;
      padding: 16px;
    }
    .kicker {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.78;
      margin-bottom: 8px;
    }
    .value {
      font-size: 28px;
      font-weight: 700;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .pill {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      margin-right: 8px;
    }
    .pill.good { background: rgba(22, 101, 52, 0.12); color: var(--good); }
    .pill.bad { background: rgba(153, 27, 27, 0.12); color: var(--bad); }
    .pill.warn { background: rgba(180, 83, 9, 0.12); color: var(--warn); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      overflow: hidden;
      background: rgba(255,255,255,0.65);
      border-radius: 14px;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    th {
      position: sticky;
      top: 0;
      background: #ece4d7;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    tr:last-child td { border-bottom: 0; }
    .small { color: var(--muted); font-size: 13px; }
    .section > .small { margin-bottom: 10px; }
    @media (max-width: 960px) {
      .grid { grid-template-columns: 1fr; }
      .scoreline { flex-direction: column; align-items: flex-start; }
      .shell { width: min(100vw - 20px, 1380px); }
      .hero, .section { padding: 18px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="eyebrow">AFBM QA Simulation Report · ${REPORT_DATE}</div>
      <h1>10 Spielsimulationen geprueft</h1>
      <p>Der Bericht basiert auf einer reproduzierbaren Ausfuehrung der produktiven Match-Engine. Geprueft wurden Team- und Player-Aggregation, Drive-Konsistenz, fehlende Werte, Doppelzaehlungen sowie die Nutzbarkeit des Reports fuer Anwender.</p>
      <div class="scoreline">
        <span>${escapeHtml(teamName(featured.context.homeTeam))} ${featured.result.homeScore}</span>
        <span>:</span>
        <span>${featured.result.awayScore} ${escapeHtml(teamName(featured.context.awayTeam))}</span>
      </div>
      <p class="small">Ausgewaehltes Spiel: ${escapeHtml(featured.result.matchId)} · Seed ${escapeHtml(featured.result.simulationSeed)} · Woche ${featured.context.week}</p>
      <div>
        <span class="pill ${games.every((game) => game.validation.passed) ? "good" : "bad"}">10 Spiele simuliert: ${games.length === GAME_COUNT ? "Ja" : "Nein"}</span>
        <span class="pill ${featured ? "good" : "bad"}">Einzelspielbericht vollstaendig: ${featured ? "Ja" : "Nein"}</span>
        <span class="pill ${games.some((game) => game.validation.metrics.criticalIssueCount > 0) ? "bad" : "good"}">Kritische Datenfehler: ${games.some((game) => game.validation.metrics.criticalIssueCount > 0) ? "Vorhanden" : "Keine"}</span>
        <span class="pill ${games.every((game) => game.validation.metrics.criticalIssueCount === 0) ? "warn" : "bad"}">Plausibilitaet: ${games.every((game) => game.validation.metrics.criticalIssueCount === 0) ? "Grundsaetzlich plausibel" : "Eingeschraenkt"}</span>
      </div>
      ${renderSummaryCards(games)}
    </section>

    <section class="section">
      <h2>Statuspruefung</h2>
      <div class="grid">
        <div>
          <p><strong>10 Spiele erfolgreich simuliert?</strong><br />${games.length}/${GAME_COUNT} Spiele wurden ohne Laufzeitabbruch erzeugt.</p>
          <p><strong>Einzelspielbericht vollstaendig?</strong><br />Ja, alle geforderten Inhaltsbloecke sind enthalten. Quarter Scores und Play-by-Play werden dabei als abgeleitete bzw. ersetzte Sichten kenntlich gemacht.</p>
        </div>
        <div>
          <p><strong>Stats plausibel?</strong><br />${games.every((game) => game.validation.metrics.criticalIssueCount === 0) ? "Ja, ohne kritische Aggregations- oder Zuordnungsfehler." : "Nein, mindestens ein kritischer Fehler wurde erkannt."}</p>
          <p><strong>Keine kritischen Datenfehler?</strong><br />${games.some((game) => game.validation.metrics.criticalIssueCount > 0) ? "Nein." : "Ja."}</p>
          <p><strong>Status</strong><br /><strong>${games.some((game) => game.validation.metrics.criticalIssueCount > 0) ? "ROT" : "GRUEN"}</strong></p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Endstand</h2>
      <p>${escapeHtml(teamName(featured.context.homeTeam))} ${featured.result.homeScore} : ${featured.result.awayScore} ${escapeHtml(teamName(featured.context.awayTeam))}</p>
    </section>

    <section class="section">
      <h2>Quarter Scores</h2>
      <p class="small">Hinweis: Die aktuelle Engine speichert keine echten Quarter-Events. Die Verteilung unten ist aus der chronologischen Drive-Reihenfolge abgeleitet.</p>
      ${renderTable(["Quarter", featured.context.homeTeam.abbreviation, featured.context.awayTeam.abbreviation, "Hinweis"], quarterRows)}
    </section>

    <section class="section">
      <h2>Team Stats</h2>
      ${renderTable(["Team", "Pts", "Yds", "Pass", "Rush", "1st", "TO", "Sacks", "Expl", "RZ", "Pen", "TOP"], teamRows)}
    </section>

    <section class="section">
      <h2>Player Stats</h2>
      <p class="small">Es werden nur Spieler mit relevanter Produktion angezeigt.</p>
      ${renderTable(["Player", "Team", "Start", "Passing", "Rushing", "Receiving", "Defense", "Snaps O/D/ST"], playerRows)}
    </section>

    <section class="section">
      <h2>Drive Summary</h2>
      ${renderTable(["Drive", "Phase", "Off", "Def", "Plays", "Yards", "Result", "Pts", "Start", "Ende", "Summary"], driveRows)}
    </section>

    <section class="section">
      <h2>Play-by-Play Uebersicht</h2>
      <p class="small">Die Engine liefert noch kein echtes Play-by-Play. Diese Tabelle ist deshalb eine chronologische Possession-/Drive-Timeline fuer Anwender.</p>
      ${renderTable(["Moment", "Offense", "Result", "Score", "Beschreibung"], timelineRows)}
    </section>

    <section class="section">
      <h2>Turnovers</h2>
      ${turnoverRows.length > 0
        ? renderTable(["Drive", "Off", "Def", "Score", "Balltraeger/Passer", "Defender", "Beschreibung"], turnoverRows)
        : "<p>Keine Turnovers im ausgewaehlten Spiel.</p>"}
    </section>

    <section class="section">
      <h2>Penalties</h2>
      ${renderTable(["Team", "Penalties", "Datenlage"], penaltyRows)}
    </section>

    <section class="section">
      <h2>Special Teams</h2>
      ${specialTeamsRows.length > 0
        ? renderTable(["Player", "Team", "FG", "XP", "Punts", "Punt Yds", "I20", "KR", "PR"], specialTeamsRows)
        : "<p>Keine relevanten Special-Teams-Eintraege gefunden.</p>"}
    </section>

    <section class="section">
      <h2>Key Plays</h2>
      ${renderTable(["Drive", "Phase", "Off", "Result", "Impact", "Summary"], keyPlayRows)}
    </section>

    <section class="section">
      <h2>Auffaelligkeiten und Datenprobleme</h2>
      <p class="small">Diese Punkte sind fuer Anwender und fuer die technische Weiterentwicklung relevant.</p>
      ${renderIssues(featured.validation.issues)}
    </section>

    <section class="section">
      <h2>Gesamtuebersicht ueber alle 10 Spiele</h2>
      ${renderIssues(games.flatMap((game) =>
        game.validation.issues.map((issue) => ({
          ...issue,
          scope: `${game.result.matchId} · ${issue.scope}`,
        })),
      ))}
    </section>
  </main>
</body>
</html>`;
}

function renderConsoleSummary(games: SimulatedGame[]) {
  const featured = chooseFeaturedGame(games);
  const criticalIssueGames = games.filter((game) => game.validation.metrics.criticalIssueCount > 0);
  const status = criticalIssueGames.length > 0 ? "ROT" : "GRUEN";

  return {
    status,
    simulatedGames: games.length,
    successfulSimulations: games.length === GAME_COUNT,
    featuredMatchId: featured?.result.matchId ?? null,
    featuredScore: featured
      ? `${featured.context.homeTeam.abbreviation} ${featured.result.homeScore} - ${featured.result.awayScore} ${featured.context.awayTeam.abbreviation}`
      : null,
    totalCriticalIssues: sum(games.map((game) => game.validation.metrics.criticalIssueCount)),
    totalMajorIssues: sum(games.map((game) => game.validation.metrics.majorIssueCount)),
    issues: games.flatMap((game) =>
      game.validation.issues.map((issue) => ({
        matchId: game.result.matchId,
        severity: issue.severity,
        category: issue.category,
        scope: issue.scope,
        message: issue.message,
      })),
    ),
  };
}

function main() {
  const games = simulateGames();
  const html = renderFeaturedGameReport(games);
  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-simulation-report-${REPORT_DATE}.html`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");
  process.stdout.write(`${JSON.stringify({
    reportPath,
    ...renderConsoleSummary(games),
  }, null, 2)}\n`);
}

main();
