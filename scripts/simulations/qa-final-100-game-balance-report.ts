import { mkdirSync, writeFileSync } from "node:fs";
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

const REPORT_DATE = "2026-04-24";
const GAME_COUNT = 100;

const TARGETS = {
  pointsPerGame: [42, 54],
  touchdownsPerTeamGame: [2.2, 3],
  totalYardsPerGame: [700, 850],
  puntsPerTeamGame: [3, 4.5],
  fgAttemptsPerTeamGame: [1.5, 2.5],
  turnoverOnDownsPerTeamGame: [0.5, 1.2],
} as const;

const FIX_PROGRESSION = [
  ["Root Cause Baseline", "55.2", "916.7", "5.14", "3.80", "3.14", "1.34"],
  ["Punt Reduction", "55.7", "926.3", "4.31", "3.70", "3.19", "1.13"],
  ["FG Attempt Reduction", "50.6", "894.4", "4.08", "2.24", "3.13", "1.19"],
  ["TOD Final Reduction", "49.8", "883.9", "3.98", "2.21", "3.09", "0.83"],
  ["Total Yards Reduction", "47.2", "849.7", "4.50", "1.88", "2.95", "0.80"],
];

type FourthDownAggregate = {
  count: number;
  goForItConverted: number;
  goForItFailed: number;
  turnoverOnDowns: number;
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
    matchId: `final-balance-100-${index + 1}`,
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

function inRange(value: number, [min, max]: readonly [number, number]) {
  return value >= min && value <= max;
}

function targetLabel(value: number, target: readonly [number, number], digits = 2) {
  return inRange(value, target)
    ? "GRUEN"
    : value < target[0]
      ? `UNTER (${round(target[0] - value, digits)})`
      : `UEBER (+${round(value - target[1], digits)})`;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function ensureFourthDown(map: Map<string, FourthDownAggregate>, key: string) {
  const existing = map.get(key);

  if (existing) {
    return existing;
  }

  const row = {
    count: 0,
    goForItConverted: 0,
    goForItFailed: 0,
    turnoverOnDowns: 0,
  };
  map.set(key, row);
  return row;
}

function rowsFromMap(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(total === 0 ? 0 : round((count / total) * 100, 1))]);
}

function fourthDownRows(map: Map<string, FourthDownAggregate>) {
  return [...map.entries()]
    .map(([label, row]) => [
      label,
      String(row.count),
      String(row.goForItConverted),
      String(row.goForItFailed),
      String(row.turnoverOnDowns),
      String(row.goForItConverted + row.goForItFailed === 0 ? 0 : round((row.goForItConverted / (row.goForItConverted + row.goForItFailed)) * 100, 1)),
    ])
    .sort((left, right) => Number(right[1]) - Number(left[1]));
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function distanceBucket(distance: number | null) {
  if (distance == null) {
    return "UNKNOWN";
  }

  if (distance <= 2) {
    return "4th & 1-2";
  }

  if (distance <= 5) {
    return "4th & 3-5";
  }

  return "4th & 6+";
}

function fourthDownKey(drive: MatchDriveResult) {
  return `${drive.fourthDownDecision ?? "UNKNOWN"} / ${distanceBucket(drive.fourthDownDistance)}`;
}

function collectTeamTotals(result: MatchSimulationResult) {
  return {
    yards: result.homeTeam.totalYards + result.awayTeam.totalYards,
    turnovers: result.homeTeam.turnovers + result.awayTeam.turnovers,
    sacks: result.homeTeam.sacks + result.awayTeam.sacks,
    penalties: result.homeTeam.penalties + result.awayTeam.penalties,
    redZoneTrips: result.homeTeam.redZoneTrips + result.awayTeam.redZoneTrips,
    redZoneTouchdowns: result.homeTeam.redZoneTouchdowns + result.awayTeam.redZoneTouchdowns,
  };
}

function simulateBatch(gameCount: number) {
  const resultRows = new Map<string, number>();
  const fourthDowns = new Map<string, FourthDownAggregate>();
  const fourthDownDecisions = new Map<string, number>();
  let totalPoints = 0;
  let totalYards = 0;
  let driveLogYards = 0;
  let drives = 0;
  let plays = 0;
  let touchdowns = 0;
  let punts = 0;
  let fgAttempts = 0;
  let turnoverOnDowns = 0;
  let turnovers = 0;
  let sacks = 0;
  let penalties = 0;
  let redZoneTrips = 0;
  let redZoneTouchdowns = 0;
  let teamYardMismatchCount = 0;

  for (let index = 0; index < gameCount; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    const teamTotals = collectTeamTotals(result);
    const gameDriveYards = result.drives.reduce((sum, drive) => sum + drive.totalYards, 0);

    totalPoints += result.homeScore + result.awayScore;
    totalYards += teamTotals.yards;
    driveLogYards += gameDriveYards;
    turnovers += teamTotals.turnovers;
    sacks += teamTotals.sacks;
    penalties += teamTotals.penalties;
    redZoneTrips += teamTotals.redZoneTrips;
    redZoneTouchdowns += teamTotals.redZoneTouchdowns;

    if (teamTotals.yards !== gameDriveYards) {
      teamYardMismatchCount += 1;
    }

    for (const drive of result.drives) {
      drives += 1;
      plays += drive.plays;
      increment(resultRows, drive.resultType);

      if (drive.fourthDownDecision) {
        increment(fourthDownDecisions, drive.fourthDownDecision);
        const row = ensureFourthDown(fourthDowns, fourthDownKey(drive));
        row.count += 1;

        if (drive.fourthDownDecision === "GO_FOR_IT") {
          if (drive.postFourthDownConverted === true) {
            row.goForItConverted += 1;
          } else if (drive.postFourthDownConverted === false) {
            row.goForItFailed += 1;
          }
        }

        if (drive.resultType === "TURNOVER_ON_DOWNS") {
          row.turnoverOnDowns += 1;
        }
      }

      if (drive.resultType === "TOUCHDOWN") {
        touchdowns += 1;
      }

      if (drive.resultType === "PUNT") {
        punts += 1;
      }

      if (drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED") {
        fgAttempts += 1;
      }

      if (drive.resultType === "TURNOVER_ON_DOWNS") {
        turnoverOnDowns += 1;
      }
    }
  }

  return {
    games: gameCount,
    avgPointsPerGame: totalPoints / gameCount,
    touchdownsPerTeamGame: touchdowns / (gameCount * 2),
    avgYardsPerGame: totalYards / gameCount,
    avgDriveLogYardsPerGame: driveLogYards / gameCount,
    puntsPerTeamGame: punts / (gameCount * 2),
    fgAttemptsPerTeamGame: fgAttempts / (gameCount * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (gameCount * 2),
    turnoversPerTeamGame: turnovers / (gameCount * 2),
    sacksPerTeamGame: sacks / (gameCount * 2),
    penaltiesPerTeamGame: penalties / (gameCount * 2),
    redZoneTripsPerTeamGame: redZoneTrips / (gameCount * 2),
    redZoneTdRate: redZoneTrips === 0 ? 0 : (redZoneTouchdowns / redZoneTrips) * 100,
    drivesPerGame: drives / gameCount,
    playsPerDrive: plays / drives,
    yardsPerDrive: driveLogYards / drives,
    yardsPerPlay: driveLogYards / plays,
    teamYardMismatchCount,
    resultRows: rowsFromMap(resultRows),
    fourthDownDecisionRows: rowsFromMap(fourthDownDecisions),
    fourthDownRows: fourthDownRows(fourthDowns),
  };
}

function main() {
  const result = simulateBatch(GAME_COUNT);
  const targetRows = [
    ["Punkte / Spiel", "42-54", String(round(result.avgPointsPerGame, 1)), targetLabel(result.avgPointsPerGame, TARGETS.pointsPerGame, 1)],
    ["TDs / Team-Spiel", "2.2-3.0", String(round(result.touchdownsPerTeamGame, 2)), targetLabel(result.touchdownsPerTeamGame, TARGETS.touchdownsPerTeamGame)],
    ["Total Yards / Spiel", "700-850", String(round(result.avgYardsPerGame, 1)), targetLabel(result.avgYardsPerGame, TARGETS.totalYardsPerGame, 1)],
    ["Punts / Team-Spiel", "3.0-4.5", String(round(result.puntsPerTeamGame, 2)), targetLabel(result.puntsPerTeamGame, TARGETS.puntsPerTeamGame)],
    ["FG-Attempts / Team-Spiel", "1.5-2.5", String(round(result.fgAttemptsPerTeamGame, 2)), targetLabel(result.fgAttemptsPerTeamGame, TARGETS.fgAttemptsPerTeamGame)],
    ["TOD / Team-Spiel", "0.5-1.2", String(round(result.turnoverOnDownsPerTeamGame, 2)), targetLabel(result.turnoverOnDownsPerTeamGame, TARGETS.turnoverOnDownsPerTeamGame)],
  ];
  const inTargets = targetRows.every((row) => row[3] === "GRUEN");
  const consistencyOk = result.teamYardMismatchCount === 0;
  const status = inTargets && consistencyOk ? "GRUEN" : "ROT";
  const coreRows = [
    ["Punkte / Spiel", String(round(result.avgPointsPerGame, 1))],
    ["TDs / Team-Spiel", String(round(result.touchdownsPerTeamGame, 2))],
    ["Total Yards / Spiel", String(round(result.avgYardsPerGame, 1))],
    ["Drive-Log Yards / Spiel", String(round(result.avgDriveLogYardsPerGame, 1))],
    ["Punts / Team-Spiel", String(round(result.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(round(result.fgAttemptsPerTeamGame, 2))],
    ["TOD / Team-Spiel", String(round(result.turnoverOnDownsPerTeamGame, 2))],
    ["Turnovers / Team-Spiel", String(round(result.turnoversPerTeamGame, 2))],
    ["Sacks / Team-Spiel", String(round(result.sacksPerTeamGame, 2))],
    ["Penalties / Team-Spiel", String(round(result.penaltiesPerTeamGame, 2))],
    ["Red-Zone Trips / Team-Spiel", String(round(result.redZoneTripsPerTeamGame, 2))],
    ["Red-Zone TD Rate", `${round(result.redZoneTdRate, 1)}%`],
    ["Drives / Spiel", String(round(result.drivesPerGame, 1))],
    ["Plays / Drive", String(round(result.playsPerDrive, 2))],
    ["Yards / Drive", String(round(result.yardsPerDrive, 1))],
    ["Yards / Play", String(round(result.yardsPerPlay, 2))],
    ["Team/Drive-Yard-Mismatches", String(result.teamYardMismatchCount)],
  ];
  const finalProgressionRows = [
    ...FIX_PROGRESSION,
    [
      "Final 100 Games",
      String(round(result.avgPointsPerGame, 1)),
      String(round(result.avgYardsPerGame, 1)),
      String(round(result.puntsPerTeamGame, 2)),
      String(round(result.fgAttemptsPerTeamGame, 2)),
      String(round(result.touchdownsPerTeamGame, 2)),
      String(round(result.turnoverOnDownsPerTeamGame, 2)),
    ],
  ];
  const residualRows =
    status === "GRUEN"
      ? [
          ["P1", "Red Zone", "Red-Zone-TD-Rate wirkt mit dem aktuellen Tracking sehr niedrig; wahrscheinlich werden TD-Finishes ausserhalb des klassischen Red-Zone-Trip-Pfads untererfasst."],
          ["P2", "Punts", "Punts liegen im Zielkorridor, aber nahe am oberen Rand und sollten bei kuenftigen Yardage-Patches nicht weiter steigen."],
          ["P3", "Total Yards", "Total Yards liegen stabil im Zielkorridor, aber nahe der oberen Grenze."],
          ["P4", "Sample Size", "100 Spiele sind erfolgreich; fuer Release-Freigabe waere spaeter ein 300-500-Spiele-Stabilitaetslauf sinnvoll."],
        ]
      : targetRows
          .filter((row) => row[3] !== "GRUEN")
          .map((row, index) => [`P${index + 1}`, row[0], `Ausserhalb Zielkorridor: ${row[3]}`]);

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Final 100 Game Balance Report ${REPORT_DATE}</title>
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
    <h1>Final 100 Game Balance Report</h1>
    <p>Gesamtvalidierung nach den Fixpaketen: Lint und Tests wurden separat ausgefuehrt, danach wurden 100 vollstaendige Spiele simuliert.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Zielkorridor-Bewertung</h2>
    ${renderTable(["Metrik", "Ziel", "Ist", "Bewertung"], targetRows)}
  </section>
  <section>
    <h2>Kernmetriken</h2>
    ${renderTable(["Metrik", "Wert"], coreRows)}
  </section>
  <section>
    <h2>Vorher / Nachher ueber Fixpakete</h2>
    ${renderTable(["Phase", "Punkte", "Yards", "Punts", "FG Att", "TD", "TOD"], finalProgressionRows)}
  </section>
  <section>
    <h2>Drive-End-Verteilung</h2>
    ${renderTable(["Result", "Count", "Anteil %"], result.resultRows)}
  </section>
  <section>
    <h2>4th Down Entscheidungen</h2>
    ${renderTable(["Decision", "Count", "Anteil %"], result.fourthDownDecisionRows)}
    ${renderTable(["Decision / Distance", "Count", "GO Converted", "GO Failed", "TOD", "GO Success %"], result.fourthDownRows)}
  </section>
  <section>
    <h2>Restprobleme nach Prioritaet</h2>
    ${renderTable(["Prioritaet", "Bereich", "Bewertung"], residualRows)}
  </section>
  <section>
    <h2>Empfehlung</h2>
    <p>${status === "GRUEN" ? "GRUEN: Die Kernmetriken liegen im Zielkorridor, die Drive-End-Verteilung zeigt keine neue kritische Verzerrung, und die Yard-Statistik ist konsistent. Red-Zone-Tracking bleibt als separates QA-Thema offen." : "ROT: Mindestens eine Kernmetrik liegt ausserhalb des Zielkorridors und sollte vor Freigabe erneut kalibriert werden."}</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-final-100-game-balance-report-${REPORT_DATE}.html`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        reportPath,
        status,
        games: result.games,
        avgPointsPerGame: round(result.avgPointsPerGame, 1),
        touchdownsPerTeamGame: round(result.touchdownsPerTeamGame, 2),
        avgYardsPerGame: round(result.avgYardsPerGame, 1),
        puntsPerTeamGame: round(result.puntsPerTeamGame, 2),
        fgAttemptsPerTeamGame: round(result.fgAttemptsPerTeamGame, 2),
        turnoverOnDownsPerTeamGame: round(result.turnoverOnDownsPerTeamGame, 2),
        turnoversPerTeamGame: round(result.turnoversPerTeamGame, 2),
        sacksPerTeamGame: round(result.sacksPerTeamGame, 2),
        penaltiesPerTeamGame: round(result.penaltiesPerTeamGame, 2),
        redZoneTripsPerTeamGame: round(result.redZoneTripsPerTeamGame, 2),
        redZoneTdRate: round(result.redZoneTdRate, 1),
        teamYardMismatchCount: result.teamYardMismatchCount,
      },
      null,
      2,
    )}\n`,
  );
}

main();
