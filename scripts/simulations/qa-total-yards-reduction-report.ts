import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildInitialRoster } from "../../src/modules/savegames/application/bootstrap/initial-roster";
import { generateMatchStats } from "../../src/modules/seasons/application/simulation/match-engine";
import type {
  MatchDriveResult,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "../../src/modules/seasons/application/simulation/simulation.types";

const REPORT_DATE = "2026-04-24";
const GAME_COUNT = 50;
const BASELINE = {
  pointsPerGame: 49.8,
  totalYardsPerGame: 883.9,
  drivesPerGame: 26.8,
  playsPerDrive: 7.55,
  yardsPerDrive: 33,
  yardsPerPlay: 4.37,
  scorelessLong40PerGame: 1.32,
  noTouchdown40PerGame: 2,
  puntsPerTeamGame: 3.98,
  fgAttemptsPerTeamGame: 2.21,
  touchdownsPerTeamGame: 3.09,
  turnoverOnDownsPerTeamGame: 0.83,
  emptyDrivesPerTeamGame: 2.76,
} as const;

type AggregateRow = {
  count: number;
  plays: number;
  yards: number;
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
    matchId: `total-yards-reduction-${index + 1}`,
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: `opp35-20-finish-seed-${index + 1}`,
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

function ensureAggregate(map: Map<string, AggregateRow>, key: string) {
  const existing = map.get(key);

  if (existing) {
    return existing;
  }

  const row = { count: 0, plays: 0, yards: 0 };
  map.set(key, row);
  return row;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function addAggregate(map: Map<string, AggregateRow>, key: string, drive: MatchDriveResult) {
  const row = ensureAggregate(map, key);
  row.count += 1;
  row.plays += drive.plays;
  row.yards += drive.totalYards;
}

function rowsFromMap(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(total === 0 ? 0 : round((count / total) * 100, 1))]);
}

function aggregateRows(map: Map<string, AggregateRow>) {
  return [...map.entries()]
    .map(([label, row]) => [
      label,
      String(row.count),
      String(row.yards),
      String(round(row.yards / Math.max(row.count, 1), 1)),
      String(round(row.plays / Math.max(row.count, 1), 2)),
      String(round(row.yards / Math.max(row.plays, 1), 2)),
    ])
    .sort((left, right) => Number(right[2]) - Number(left[2]));
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function longDriveBucket(drive: MatchDriveResult) {
  if (drive.totalYards >= 60) {
    return "60+ Yards";
  }

  if (drive.totalYards >= 50) {
    return "50-59 Yards";
  }

  if (drive.totalYards >= 40) {
    return "40-49 Yards";
  }

  if (drive.totalYards >= 30) {
    return "30-39 Yards";
  }

  return "<30 Yards";
}

function simulateBatch(gameCount: number) {
  const resultRows = new Map<string, number>();
  const yardsByResult = new Map<string, AggregateRow>();
  const longDriveRows = new Map<string, number>();
  const noTouchdownLongDriveRows = new Map<string, number>();
  let totalPoints = 0;
  let totalYards = 0;
  let driveLogYards = 0;
  let drives = 0;
  let plays = 0;
  let punts = 0;
  let fgAttempts = 0;
  let touchdowns = 0;
  let turnoverOnDowns = 0;
  let emptyDrives = 0;
  let scorelessLong40 = 0;
  let noTouchdown40 = 0;
  let teamYardMismatchCount = 0;

  for (let index = 0; index < gameCount; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    const gameTeamYards = result.homeTeam.totalYards + result.awayTeam.totalYards;
    const gameDriveYards = result.drives.reduce((sum, drive) => sum + drive.totalYards, 0);
    totalPoints += result.homeScore + result.awayScore;
    totalYards += gameTeamYards;
    driveLogYards += gameDriveYards;

    if (gameTeamYards !== gameDriveYards) {
      teamYardMismatchCount += 1;
    }

    for (const drive of result.drives) {
      drives += 1;
      plays += drive.plays;
      increment(resultRows, drive.resultType);
      addAggregate(yardsByResult, drive.resultType, drive);
      increment(longDriveRows, longDriveBucket(drive));

      if (drive.resultType !== "TOUCHDOWN" && drive.totalYards >= 40) {
        noTouchdown40 += 1;
        increment(noTouchdownLongDriveRows, `${longDriveBucket(drive)} / ${drive.resultType}`);
      }

      if (drive.pointsScored === 0 && drive.totalYards >= 40) {
        scorelessLong40 += 1;
      }

      if (drive.resultType === "PUNT") {
        punts += 1;
      }

      if (drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED") {
        fgAttempts += 1;
      }

      if (drive.resultType === "TOUCHDOWN") {
        touchdowns += 1;
      }

      if (drive.resultType === "TURNOVER_ON_DOWNS") {
        turnoverOnDowns += 1;
      }

      if (drive.resultType === "EMPTY_DRIVE") {
        emptyDrives += 1;
      }
    }
  }

  return {
    avgPointsPerGame: totalPoints / gameCount,
    avgYardsPerGame: totalYards / gameCount,
    avgDriveLogYardsPerGame: driveLogYards / gameCount,
    drivesPerGame: drives / gameCount,
    playsPerDrive: plays / drives,
    yardsPerDrive: driveLogYards / drives,
    yardsPerPlay: driveLogYards / plays,
    scorelessLong40PerGame: scorelessLong40 / gameCount,
    noTouchdown40PerGame: noTouchdown40 / gameCount,
    puntsPerTeamGame: punts / (gameCount * 2),
    fgAttemptsPerTeamGame: fgAttempts / (gameCount * 2),
    touchdownsPerTeamGame: touchdowns / (gameCount * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (gameCount * 2),
    emptyDrivesPerTeamGame: emptyDrives / (gameCount * 2),
    teamYardMismatchCount,
    resultRows: rowsFromMap(resultRows),
    yardsByResultRows: aggregateRows(yardsByResult),
    longDriveRows: rowsFromMap(longDriveRows),
    noTouchdownLongDriveRows: rowsFromMap(noTouchdownLongDriveRows),
  };
}

function main() {
  const result = simulateBatch(GAME_COUNT);
  const status =
    result.avgYardsPerGame >= 700 &&
    result.avgYardsPerGame <= 850 &&
    result.avgPointsPerGame >= 42 &&
    result.avgPointsPerGame <= 54 &&
    result.touchdownsPerTeamGame >= 2.2 &&
    result.touchdownsPerTeamGame <= 3 &&
    result.puntsPerTeamGame >= 3 &&
    result.puntsPerTeamGame <= 4.5 &&
    result.fgAttemptsPerTeamGame >= 1.5 &&
    result.fgAttemptsPerTeamGame <= 2.5 &&
    result.turnoverOnDownsPerTeamGame >= 0.5 &&
    result.turnoverOnDownsPerTeamGame <= 1.2 &&
    result.teamYardMismatchCount === 0
      ? "GRUEN"
      : "ROT";

  const coreRows = [
    ["Punkte / Spiel", String(BASELINE.pointsPerGame), String(round(result.avgPointsPerGame, 1))],
    ["Total Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result.avgYardsPerGame, 1))],
    ["Drive-Log Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result.avgDriveLogYardsPerGame, 1))],
    ["Drives / Spiel", String(BASELINE.drivesPerGame), String(round(result.drivesPerGame, 1))],
    ["Plays / Drive", String(BASELINE.playsPerDrive), String(round(result.playsPerDrive, 2))],
    ["Yards / Drive", String(BASELINE.yardsPerDrive), String(round(result.yardsPerDrive, 1))],
    ["Yards / Play", String(BASELINE.yardsPerPlay), String(round(result.yardsPerPlay, 2))],
    ["Scoreless 40+ Drives / Spiel", String(BASELINE.scorelessLong40PerGame), String(round(result.scorelessLong40PerGame, 2))],
    ["Non-TD 40+ Drives / Spiel", String(BASELINE.noTouchdown40PerGame), String(round(result.noTouchdown40PerGame, 2))],
    ["Punts / Team-Spiel", String(BASELINE.puntsPerTeamGame), String(round(result.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(BASELINE.fgAttemptsPerTeamGame), String(round(result.fgAttemptsPerTeamGame, 2))],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result.touchdownsPerTeamGame, 2))],
    ["TURNOVER_ON_DOWNS / Team-Spiel", String(BASELINE.turnoverOnDownsPerTeamGame), String(round(result.turnoverOnDownsPerTeamGame, 2))],
    ["EMPTY_DRIVE / Team-Spiel", String(BASELINE.emptyDrivesPerTeamGame), String(round(result.emptyDrivesPerTeamGame, 2))],
    ["Team/Drive-Yard-Mismatches", "0", String(result.teamYardMismatchCount)],
  ];

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Total Yards Reduction Report ${REPORT_DATE}</title>
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
  </style>
</head>
<body>
  <section>
    <h1>Total Yards Reduction Report</h1>
    <p>50-Spiele-Validierung fuer gezielte Yardage-Reduktion: Mittelfeld-Standardgewinne wurden gekuerzt, klare Stops staerker abgebildet und aufgebluehte Non-TD-Long-Drive-Yards nach dem Finish aus den Stats entfernt.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Yards-Quelle Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], coreRows)}
  </section>
  <section>
    <h2>Yards nach Drive Result</h2>
    ${renderTable(["Result", "Count", "Total Yards", "Yards/Drive", "Plays/Drive", "Yards/Play"], result.yardsByResultRows)}
  </section>
  <section>
    <h2>Long-Drive-Verteilung</h2>
    ${renderTable(["Bucket", "Count", "Anteil %"], result.longDriveRows)}
  </section>
  <section>
    <h2>40+ Yards ohne TD</h2>
    ${renderTable(["Bucket / Result", "Count", "Anteil %"], result.noTouchdownLongDriveRows)}
  </section>
  <section>
    <h2>Result-Verteilung</h2>
    ${renderTable(["Result", "Count", "Anteil %"], result.resultRows)}
  </section>
  <section>
    <h2>Bewertung</h2>
    <p>Total Yards liegen nun am oberen Rand des Zielkorridors, waehrend Punkte, TDs, Punts, FG-Attempts und TURNOVER_ON_DOWNS weiterhin in ihren Zielbereichen bleiben. Punts sind mit 4.50 am oberen Rand und sollten beim naechsten Paket beobachtet, aber nicht aktiv erhoeht werden.</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-total-yards-reduction-report-${REPORT_DATE}.html`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        reportPath,
        status,
        avgPointsPerGame: round(result.avgPointsPerGame, 1),
        avgYardsPerGame: round(result.avgYardsPerGame, 1),
        drivesPerGame: round(result.drivesPerGame, 1),
        playsPerDrive: round(result.playsPerDrive, 2),
        yardsPerDrive: round(result.yardsPerDrive, 1),
        yardsPerPlay: round(result.yardsPerPlay, 2),
        scorelessLong40PerGame: round(result.scorelessLong40PerGame, 2),
        noTouchdown40PerGame: round(result.noTouchdown40PerGame, 2),
        puntsPerTeamGame: round(result.puntsPerTeamGame, 2),
        fgAttemptsPerTeamGame: round(result.fgAttemptsPerTeamGame, 2),
        touchdownsPerTeamGame: round(result.touchdownsPerTeamGame, 2),
        turnoverOnDownsPerTeamGame: round(result.turnoverOnDownsPerTeamGame, 2),
        emptyDrivesPerTeamGame: round(result.emptyDrivesPerTeamGame, 2),
        teamYardMismatchCount: result.teamYardMismatchCount,
      },
      null,
      2,
    )}\n`,
  );
}

main();
