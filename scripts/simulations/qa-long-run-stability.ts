import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { join, resolve } from "node:path";

import { buildInitialRoster } from "../../src/modules/savegames/application/bootstrap/initial-roster";
import { generateMatchStats } from "../../src/modules/seasons/application/simulation/match-engine";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "../../src/modules/seasons/application/simulation/simulation.types";

const GAME_COUNT = 500;
const REPORT_FILE_NAME = "qa-long-run-stability.html";

const ACCEPTED_BASELINE = {
  pointsPerGame: 45.8,
  totalYardsPerGame: 825.1,
  touchdownsPerTeamGame: 2.89,
  puntsPerTeamGame: 4.55,
  fgAttemptsPerTeamGame: 1.82,
  turnoverOnDownsPerTeamGame: 0.97,
  playsPerDrive: 6.38,
} as const;

type MetricSummary = {
  avg: number;
  min: number;
  max: number;
  p10: number;
  median: number;
  p90: number;
  stdDev: number;
};

type GameMetrics = {
  index: number;
  points: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  touchdownsPerTeam: number;
  puntsPerTeam: number;
  fgAttemptsPerTeam: number;
  turnoverOnDownsPerTeam: number;
  turnoversPerTeam: number;
  sacksPerTeam: number;
  penaltiesPerTeam: number;
  explosivePlaysPerTeam: number;
  redZoneTripsPerTeam: number;
  redZoneTdRate: number;
  fourthDownGoRate: number;
  fourthDownSuccessRate: number;
  drives: number;
  playsPerDrive: number;
  yardsPerDrive: number;
  topTotal: number;
  runtimeMs: number;
  teamDriveYardMismatch: boolean;
};

type BatchResult = {
  games: number;
  runtimeMs: number;
  metrics: GameMetrics[];
  summaries: Record<string, MetricSummary>;
  driveEndRows: string[][];
  fourthDownRows: string[][];
  coachRows: string[][];
  outlierRows: string[][];
  driftRows: string[][];
  mismatchCount: number;
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

function createMatchContext(index: number): SimulationMatchContext {
  return {
    matchId: `long-run-stability-${index + 1}`,
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: `long-run-stability-seed-${index + 1}`,
    seasonYear: 2026,
    week: (index % 10) + 1,
    scheduledAt: new Date("2026-10-01T18:00:00.000Z"),
    homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
    awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
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

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower] ?? 0;
  }

  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (index - lower);
}

function summarize(values: number[]): MetricSummary {
  const avg = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    Math.max(values.length, 1);

  return {
    avg,
    min: Math.min(...values),
    max: Math.max(...values),
    p10: percentile(values, 0.1),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    stdDev: Math.sqrt(variance),
  };
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function rowsFromMap(map: Map<string, number>, totalOverride?: number) {
  const total = totalOverride ?? [...map.values()].reduce((sum, count) => sum + count, 0);

  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [
      label,
      String(count),
      total === 0 ? "0%" : `${round((count / total) * 100, 1)}%`,
    ]);
}

function countFieldGoals(drives: MatchDriveResult[]) {
  return drives.filter(
    (drive) => drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED",
  ).length;
}

function countFourthDownDecisions(drives: MatchDriveResult[]) {
  return drives.filter((drive) => drive.fourthDownDecision != null).length;
}

function countGoForItSuccess(drives: MatchDriveResult[]) {
  return drives.filter(
    (drive) => drive.fourthDownDecision === "GO_FOR_IT" && drive.postFourthDownConverted === true,
  ).length;
}

function collectGameMetrics(
  index: number,
  result: MatchSimulationResult,
  runtimeMs: number,
): GameMetrics {
  const drives = result.drives.length;
  const driveYards = result.drives.reduce((sum, drive) => sum + drive.totalYards, 0);
  const fourthDownDecisions = countFourthDownDecisions(result.drives);
  const goForIt = result.drives.filter((drive) => drive.fourthDownDecision === "GO_FOR_IT").length;
  const redZoneTrips = result.homeTeam.redZoneTrips + result.awayTeam.redZoneTrips;
  const redZoneTouchdowns =
    result.homeTeam.redZoneTouchdowns + result.awayTeam.redZoneTouchdowns;

  return {
    index,
    points: result.homeScore + result.awayScore,
    totalYards: result.homeTeam.totalYards + result.awayTeam.totalYards,
    passingYards: result.homeTeam.passingYards + result.awayTeam.passingYards,
    rushingYards: result.homeTeam.rushingYards + result.awayTeam.rushingYards,
    touchdownsPerTeam:
      (result.homeTeam.touchdowns + result.awayTeam.touchdowns) / 2,
    puntsPerTeam:
      result.drives.filter((drive) => drive.resultType === "PUNT").length / 2,
    fgAttemptsPerTeam: countFieldGoals(result.drives) / 2,
    turnoverOnDownsPerTeam:
      result.drives.filter((drive) => drive.resultType === "TURNOVER_ON_DOWNS").length / 2,
    turnoversPerTeam:
      (result.homeTeam.turnovers + result.awayTeam.turnovers) / 2,
    sacksPerTeam: (result.homeTeam.sacks + result.awayTeam.sacks) / 2,
    penaltiesPerTeam: (result.homeTeam.penalties + result.awayTeam.penalties) / 2,
    explosivePlaysPerTeam:
      (result.homeTeam.explosivePlays + result.awayTeam.explosivePlays) / 2,
    redZoneTripsPerTeam: redZoneTrips / 2,
    redZoneTdRate: redZoneTrips === 0 ? 0 : (redZoneTouchdowns / redZoneTrips) * 100,
    fourthDownGoRate:
      fourthDownDecisions === 0 ? 0 : (goForIt / fourthDownDecisions) * 100,
    fourthDownSuccessRate:
      goForIt === 0 ? 0 : (countGoForItSuccess(result.drives) / goForIt) * 100,
    drives,
    playsPerDrive:
      result.drives.reduce((sum, drive) => sum + drive.plays, 0) / Math.max(drives, 1),
    yardsPerDrive: driveYards / Math.max(drives, 1),
    topTotal:
      result.homeTeam.timeOfPossessionSeconds + result.awayTeam.timeOfPossessionSeconds,
    runtimeMs,
    teamDriveYardMismatch:
      result.homeTeam.totalYards + result.awayTeam.totalYards !== driveYards,
  };
}

function addOutliers(rows: string[][], metric: GameMetrics) {
  const push = (name: string, value: number | string, note: string) => {
    if (rows.length < 24) {
      rows.push([String(metric.index + 1), name, String(value), note]);
    }
  };

  if (metric.points > 70 || metric.points < 24) {
    push("Punkte", metric.points, "Ausserhalb breitem Long-Run-Korridor 24-70.");
  }

  if (metric.totalYards > 1050 || metric.totalYards < 560) {
    push("Total Yards", metric.totalYards, "Ausserhalb breitem Long-Run-Korridor 560-1050.");
  }

  if (metric.puntsPerTeam > 7) {
    push("Punts / Team", metric.puntsPerTeam, "Sehr puntlastiges Einzelspiel.");
  }

  if (metric.turnoverOnDownsPerTeam > 2) {
    push("TOD / Team", metric.turnoverOnDownsPerTeam, "Sehr viele Turnover on Downs.");
  }

  if (metric.topTotal !== 3600) {
    push("TOP total", metric.topTotal, "Clock/TOP-Summe weicht von Regulation ab.");
  }

  if (metric.teamDriveYardMismatch) {
    push("Yard Mismatch", "true", "Team-Yards stimmen nicht mit Drive-Yards ueberein.");
  }
}

function avgForWindow(metrics: GameMetrics[], key: keyof GameMetrics) {
  return average(metrics.map((metric) => Number(metric[key])));
}

function driftRows(metrics: GameMetrics[]) {
  const first = metrics.slice(0, 100);
  const last = metrics.slice(-100);
  const keys: Array<[keyof GameMetrics, string, number]> = [
    ["points", "Punkte / Spiel", 3],
    ["totalYards", "Total Yards / Spiel", 35],
    ["touchdownsPerTeam", "TDs / Team-Spiel", 0.25],
    ["puntsPerTeam", "Punts / Team-Spiel", 0.35],
    ["fgAttemptsPerTeam", "FG / Team-Spiel", 0.25],
    ["turnoverOnDownsPerTeam", "TOD / Team-Spiel", 0.25],
    ["playsPerDrive", "Plays / Drive", 0.18],
  ];

  return keys.map(([key, label, tolerance]) => {
    const firstAvg = avgForWindow(first, key);
    const lastAvg = avgForWindow(last, key);
    const delta = lastAvg - firstAvg;
    return [
      label,
      String(round(firstAvg, 2)),
      String(round(lastAvg, 2)),
      delta > 0 ? `+${round(delta, 2)}` : String(round(delta, 2)),
      Math.abs(delta) <= tolerance ? "STABIL" : "DRIFT",
    ];
  });
}

function summarizeBatch(): BatchResult {
  const metrics: GameMetrics[] = [];
  const driveEnds = new Map<string, number>();
  const fourthDownDecisions = new Map<string, number>();
  const coachProfiles = new Map<string, number>();
  const outlierRows: string[][] = [];
  let mismatchCount = 0;
  const batchStartedAt = performance.now();

  for (let index = 0; index < GAME_COUNT; index += 1) {
    const gameStartedAt = performance.now();
    const result = generateMatchStats(createMatchContext(index));
    const runtimeMs = performance.now() - gameStartedAt;
    const gameMetrics = collectGameMetrics(index, result, runtimeMs);
    metrics.push(gameMetrics);
    addOutliers(outlierRows, gameMetrics);

    if (gameMetrics.teamDriveYardMismatch) {
      mismatchCount += 1;
    }

    for (const drive of result.drives) {
      increment(driveEnds, drive.resultType);

      if (drive.fourthDownDecision != null) {
        increment(fourthDownDecisions, drive.fourthDownDecision);
      }

      if (drive.coachingRiskProfile != null) {
        increment(coachProfiles, drive.coachingRiskProfile);
      }
    }
  }

  const runtimeMs = performance.now() - batchStartedAt;
  const summaries = {
    points: summarize(metrics.map((metric) => metric.points)),
    totalYards: summarize(metrics.map((metric) => metric.totalYards)),
    passingYards: summarize(metrics.map((metric) => metric.passingYards)),
    rushingYards: summarize(metrics.map((metric) => metric.rushingYards)),
    touchdownsPerTeam: summarize(metrics.map((metric) => metric.touchdownsPerTeam)),
    puntsPerTeam: summarize(metrics.map((metric) => metric.puntsPerTeam)),
    fgAttemptsPerTeam: summarize(metrics.map((metric) => metric.fgAttemptsPerTeam)),
    turnoverOnDownsPerTeam: summarize(metrics.map((metric) => metric.turnoverOnDownsPerTeam)),
    turnoversPerTeam: summarize(metrics.map((metric) => metric.turnoversPerTeam)),
    sacksPerTeam: summarize(metrics.map((metric) => metric.sacksPerTeam)),
    penaltiesPerTeam: summarize(metrics.map((metric) => metric.penaltiesPerTeam)),
    explosivePlaysPerTeam: summarize(metrics.map((metric) => metric.explosivePlaysPerTeam)),
    redZoneTripsPerTeam: summarize(metrics.map((metric) => metric.redZoneTripsPerTeam)),
    redZoneTdRate: summarize(metrics.map((metric) => metric.redZoneTdRate)),
    fourthDownGoRate: summarize(metrics.map((metric) => metric.fourthDownGoRate)),
    fourthDownSuccessRate: summarize(metrics.map((metric) => metric.fourthDownSuccessRate)),
    drives: summarize(metrics.map((metric) => metric.drives)),
    playsPerDrive: summarize(metrics.map((metric) => metric.playsPerDrive)),
    yardsPerDrive: summarize(metrics.map((metric) => metric.yardsPerDrive)),
    topTotal: summarize(metrics.map((metric) => metric.topTotal)),
    runtimeMs: summarize(metrics.map((metric) => metric.runtimeMs)),
  };

  return {
    games: GAME_COUNT,
    runtimeMs,
    metrics,
    summaries,
    driveEndRows: rowsFromMap(driveEnds),
    fourthDownRows: rowsFromMap(fourthDownDecisions),
    coachRows: rowsFromMap(coachProfiles),
    outlierRows,
    driftRows: driftRows(metrics),
    mismatchCount,
  };
}

function summaryRows(result: BatchResult) {
  const rows: Array<[string, MetricSummary, number]> = [
    ["Punkte / Spiel", result.summaries.points, 1],
    ["Total Yards / Spiel", result.summaries.totalYards, 1],
    ["Passing Yards / Spiel", result.summaries.passingYards, 1],
    ["Rushing Yards / Spiel", result.summaries.rushingYards, 1],
    ["TDs / Team-Spiel", result.summaries.touchdownsPerTeam, 2],
    ["Punts / Team-Spiel", result.summaries.puntsPerTeam, 2],
    ["FG Attempts / Team-Spiel", result.summaries.fgAttemptsPerTeam, 2],
    ["TOD / Team-Spiel", result.summaries.turnoverOnDownsPerTeam, 2],
    ["Turnovers / Team-Spiel", result.summaries.turnoversPerTeam, 2],
    ["Sacks / Team-Spiel", result.summaries.sacksPerTeam, 2],
    ["Penalties / Team-Spiel", result.summaries.penaltiesPerTeam, 2],
    ["Explosive Plays / Team-Spiel", result.summaries.explosivePlaysPerTeam, 2],
    ["Red-Zone Trips / Team-Spiel", result.summaries.redZoneTripsPerTeam, 2],
    ["Red-Zone TD Rate", result.summaries.redZoneTdRate, 1],
    ["4th Down GO Rate", result.summaries.fourthDownGoRate, 1],
    ["4th Down Success Rate", result.summaries.fourthDownSuccessRate, 1],
    ["Drives / Spiel", result.summaries.drives, 1],
    ["Plays / Drive", result.summaries.playsPerDrive, 2],
    ["Yards / Drive", result.summaries.yardsPerDrive, 2],
    ["TOP total", result.summaries.topTotal, 0],
    ["Runtime / Spiel ms", result.summaries.runtimeMs, 2],
  ];

  return rows.map(([label, summary, digits]) => [
    label,
    String(round(summary.avg, digits)),
    String(round(summary.min, digits)),
    String(round(summary.max, digits)),
    String(round(summary.p10, digits)),
    String(round(summary.median, digits)),
    String(round(summary.p90, digits)),
    String(round(summary.stdDev, digits)),
  ]);
}

function stabilityRows(result: BatchResult) {
  const pointsStable =
    Math.abs(result.summaries.points.avg - ACCEPTED_BASELINE.pointsPerGame) <= 3;
  const yardsStable =
    Math.abs(result.summaries.totalYards.avg - ACCEPTED_BASELINE.totalYardsPerGame) <= 35;
  const touchdownsStable =
    Math.abs(result.summaries.touchdownsPerTeam.avg - ACCEPTED_BASELINE.touchdownsPerTeamGame) <= 0.25;
  const puntsStable =
    Math.abs(result.summaries.puntsPerTeam.avg - ACCEPTED_BASELINE.puntsPerTeamGame) <= 0.35;
  const fgStable =
    Math.abs(result.summaries.fgAttemptsPerTeam.avg - ACCEPTED_BASELINE.fgAttemptsPerTeamGame) <= 0.25;
  const todStable =
    Math.abs(result.summaries.turnoverOnDownsPerTeam.avg - ACCEPTED_BASELINE.turnoverOnDownsPerTeamGame) <= 0.25;
  const noStateIntegrityIssues =
    result.mismatchCount === 0 &&
    result.summaries.topTotal.min === 3600 &&
    result.summaries.topTotal.max === 3600;
  const noDrift = result.driftRows.every((row) => row[4] === "STABIL");
  const performanceOk = result.summaries.runtimeMs.avg < 20;

  return {
    status:
      noStateIntegrityIssues &&
      noDrift &&
      performanceOk
        ? "GRUEN"
        : "ROT",
    rows: [
      ["Punkte im historischen Balance-Korridor", pointsStable ? "GRUEN" : "BEOBACHTEN"],
      ["Total Yards im historischen Balance-Korridor", yardsStable ? "GRUEN" : "BEOBACHTEN"],
      ["TDs im historischen Balance-Korridor", touchdownsStable ? "GRUEN" : "BEOBACHTEN"],
      ["Punts im historischen Balance-Korridor", puntsStable ? "GRUEN" : "BEOBACHTEN"],
      ["FG im historischen Balance-Korridor", fgStable ? "GRUEN" : "BEOBACHTEN"],
      ["TOD im historischen Balance-Korridor", todStable ? "GRUEN" : "BEOBACHTEN"],
      ["Keine State-Integritaetsfehler", noStateIntegrityIssues ? "GRUEN" : "ROT"],
      ["Keine First/Last-100 Drift", noDrift ? "GRUEN" : "ROT"],
      ["Performance akzeptabel", performanceOk ? "GRUEN" : "ROT"],
    ],
  };
}

function main() {
  const result = summarizeBatch();
  const stability = stabilityRows(result);
  const outlierRows =
    result.outlierRows.length === 0
      ? [["-", "-", "-", "Keine kritischen Ausreisser nach definierten Long-Run-Grenzen."]]
      : result.outlierRows;
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>QA Long Run Stability</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 28px; color: #202726; background: #f4efe7; }
    section { background: #fffdf8; border: 1px solid #ded4c6; border-radius: 18px; padding: 18px 20px; margin-bottom: 16px; }
    h1, h2 { margin: 0 0 10px; }
    p { line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
    th, td { text-align: left; padding: 8px 9px; border-bottom: 1px solid #e3dacd; vertical-align: top; }
    th { background: #eadcc8; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
    .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .green { background: #dcfce7; color: #166534; }
    .red { background: #fee2e2; color: #991b1b; }
    .note { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 10px 12px; }
  </style>
</head>
<body>
  <section>
    <h1>QA Long Run Stability</h1>
    <p>Long-Run-Test mit ${result.games} vollstaendigen Spielen. Gemessen wurden Kernmetriken, Verteilungen, Extremwerte, First/Last-100-Drift und Laufzeit.</p>
    <p><span class="pill ${stability.status === "GRUEN" ? "green" : "red"}">${stability.status}</span></p>
  </section>
  <section>
    <h2>Statuspruefung</h2>
    ${renderTable(["Check", "Status"], stability.rows)}
    <p class="note">Referenz ist die zuletzt gruen akzeptierte Coach-/Playcount-Konfiguration. Ziel: stabile Mittelwerte, keine neue Drift, keine kritischen Extremwerte.</p>
  </section>
  <section>
    <h2>Mittelwerte und Min/Max</h2>
    ${renderTable(["Metrik", "Avg", "Min", "Max", "P10", "Median", "P90", "StdDev"], summaryRows(result))}
  </section>
  <section>
    <h2>Drift First 100 vs Last 100</h2>
    ${renderTable(["Metrik", "First 100", "Last 100", "Delta", "Bewertung"], result.driftRows)}
  </section>
  <section>
    <h2>Drive-End-Verteilung</h2>
    ${renderTable(["Result", "Count", "Anteil"], result.driveEndRows)}
  </section>
  <section>
    <h2>4th Down Verteilung</h2>
    ${renderTable(["Decision", "Count", "Anteil"], result.fourthDownRows)}
  </section>
  <section>
    <h2>Coach-Verteilung</h2>
    ${renderTable(["Coach", "Count", "Anteil"], result.coachRows)}
  </section>
  <section>
    <h2>Auffaelligkeiten / Ausreisser</h2>
    ${renderTable(["Game", "Metrik", "Wert", "Bewertung"], outlierRows)}
  </section>
  <section>
    <h2>Performance</h2>
    <p>${result.games} Spiele in ${round(result.runtimeMs, 1)} ms, durchschnittlich ${round(result.runtimeMs / result.games, 2)} ms pro Spiel.</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, REPORT_FILE_NAME);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        reportPath,
        status: stability.status,
        games: result.games,
        runtimeMs: round(result.runtimeMs, 1),
        msPerGame: round(result.runtimeMs / result.games, 2),
        pointsPerGame: round(result.summaries.points.avg, 1),
        totalYardsPerGame: round(result.summaries.totalYards.avg, 1),
        touchdownsPerTeamGame: round(result.summaries.touchdownsPerTeam.avg, 2),
        puntsPerTeamGame: round(result.summaries.puntsPerTeam.avg, 2),
        fgAttemptsPerTeamGame: round(result.summaries.fgAttemptsPerTeam.avg, 2),
        turnoverOnDownsPerTeamGame: round(result.summaries.turnoverOnDownsPerTeam.avg, 2),
        playsPerDrive: round(result.summaries.playsPerDrive.avg, 2),
        outliers: result.outlierRows.length,
        mismatchCount: result.mismatchCount,
      },
      null,
      2,
    )}\n`,
  );
}

main();
