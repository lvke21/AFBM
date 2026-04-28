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
const OPTIONAL_GAME_COUNT = 100;
const BASELINE = {
  puntsPerTeamGame: 6.91,
  fgAttemptsPerTeamGame: 4.75,
  touchdownsPerTeamGame: 0.62,
  pointsPerGame: 29.3,
  totalYardsPerGame: 1090.5,
} as const;

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

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function createMatchContext(index: number): SimulationMatchContext {
  return {
    matchId: `terminal-match-${index + 1}`,
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: `terminal-seed-${index + 1}`,
    seasonYear: 2026,
    week: (index % 10) + 1,
    scheduledAt: new Date("2026-10-01T18:00:00.000Z"),
    homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
    awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
  };
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toDistributionRows(counts: Map<string, number>, total: number) {
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [
      label,
      String(count),
      total === 0 ? "0" : String(round((count / total) * 100, 1)),
    ]);
}

function inTargetCorridor(value: number, min: number, max: number) {
  return value >= min && value <= max;
}

function simulateBatch(gameCount: number) {
  const driveEnds = new Map<string, number>();
  const fourthDownDecisions = new Map<string, number>();
  const plusTerritoryStarts = new Map<string, number>();
  const redZoneResults = new Map<string, number>();
  const sampleTerminalDrives: MatchDriveResult[] = [];
  let totalPoints = 0;
  let totalYards = 0;
  let punts = 0;
  let fgAttempts = 0;
  let touchdowns = 0;
  let turnoverOnDowns = 0;
  let plusTerritoryDriveCount = 0;
  let redZoneDriveCount = 0;

  for (let index = 0; index < gameCount; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    totalPoints += result.homeScore + result.awayScore;
    totalYards += result.homeTeam.totalYards + result.awayTeam.totalYards;

    for (const drive of result.drives) {
      increment(driveEnds, drive.resultType);
      if (drive.fourthDownDecision) {
        increment(fourthDownDecisions, drive.fourthDownDecision);
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

      if ((drive.highestReachedFieldPosition ?? 0) >= 55) {
        plusTerritoryDriveCount += 1;
        increment(plusTerritoryStarts, drive.resultType);
        if (sampleTerminalDrives.length < 15) {
          sampleTerminalDrives.push(drive);
        }
      }

      if ((drive.highestReachedFieldPosition ?? 0) >= 80) {
        redZoneDriveCount += 1;
        increment(redZoneResults, drive.resultType);
      }
    }
  }

  return {
    gameCount,
    avgPointsPerGame: totalPoints / gameCount,
    avgYardsPerGame: totalYards / gameCount,
    puntsPerTeamGame: punts / (gameCount * 2),
    fgAttemptsPerTeamGame: fgAttempts / (gameCount * 2),
    touchdownsPerTeamGame: touchdowns / (gameCount * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (gameCount * 2),
    driveEnds: toDistributionRows(
      driveEnds,
      [...driveEnds.values()].reduce((sum, count) => sum + count, 0),
    ),
    fourthDownDecisions: toDistributionRows(
      fourthDownDecisions,
      [...fourthDownDecisions.values()].reduce((sum, count) => sum + count, 0),
    ),
    plusTerritoryDriveCount,
    plusTerritoryRows: toDistributionRows(plusTerritoryStarts, plusTerritoryDriveCount),
    redZoneDriveCount,
    redZoneRows: toDistributionRows(redZoneResults, redZoneDriveCount),
    sampleTerminalDrives,
  };
}

function buildStatus(result: ReturnType<typeof simulateBatch>) {
  return inTargetCorridor(result.puntsPerTeamGame, 3, 4.5) &&
    inTargetCorridor(result.fgAttemptsPerTeamGame, 1, 2.5) &&
    inTargetCorridor(result.touchdownsPerTeamGame, 2, 3.5) &&
    inTargetCorridor(result.avgPointsPerGame, 40, 55) &&
    inTargetCorridor(result.avgYardsPerGame, 650, 850)
    ? "GRUEN"
    : "ROT";
}

function main() {
  const result50 = simulateBatch(GAME_COUNT);
  const status50 = buildStatus(result50);
  const result100 = status50 === "GRUEN" ? simulateBatch(OPTIONAL_GAME_COUNT) : null;

  const beforeAfterRows = [
    ["Punts / Team-Spiel", String(BASELINE.puntsPerTeamGame), String(round(result50.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(BASELINE.fgAttemptsPerTeamGame), String(round(result50.fgAttemptsPerTeamGame, 2))],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result50.touchdownsPerTeamGame, 2))],
    ["Punkte / Spiel", String(BASELINE.pointsPerGame), String(round(result50.avgPointsPerGame, 1))],
    ["Total Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result50.avgYardsPerGame, 1))],
    ["Turnover on Downs / Team-Spiel", "0.96", String(round(result50.turnoverOnDownsPerTeamGame, 2))],
  ];

  const terminalSampleRows = result50.sampleTerminalDrives.map((drive) => [
    drive.phaseLabel,
    drive.offenseTeamAbbreviation,
    String(drive.startFieldPosition ?? ""),
    String(drive.highestReachedFieldPosition ?? ""),
    drive.fourthDownDecision ?? "",
    drive.resultType,
    drive.coachingRiskProfile ?? "",
    String(drive.terminalPlayDistance ?? ""),
    drive.summary,
  ]);

  const recommendation =
    status50 === "GRUEN"
      ? "Die Terminal-Drive-Logik ist im Zielkorridor. Als naechstes sollte der 100-Spiele-Lauf als neuer Balancing-Benchmark etabliert werden."
      : result50.puntsPerTeamGame > 4.5
        ? "Als naechstes sollte weiter nur im Plus Territory kalibriert werden: weniger Punts zwischen gegnerischer 40 und 30, ohne Early Downs erneut anzuziehen."
        : result50.fgAttemptsPerTeamGame > 2.5
          ? "Als naechstes sollten lange Field Goals weiter ausgeduennt und nach konvertiertem 4th Down mehr echte TD- statt FG-Finishes erzeugt werden."
          : "Als naechstes sollte die Red-Zone-Finish-Rate leicht weiter angehoben werden.";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Terminal Drive Calibration Report ${REPORT_DATE}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 28px; color: #1f2a2a; background: #f6f1e8; }
    section { background: #fffdf8; border: 1px solid #ded4c6; border-radius: 18px; padding: 18px 20px; margin-bottom: 16px; }
    h1, h2 { margin: 0 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #e3dacd; vertical-align: top; }
    th { background: #efe5d8; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
    .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .green { background: #dcfce7; color: #166534; }
    .red { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <section>
    <h1>Terminal Drive Calibration Report</h1>
    <p>50-Spiele-Validierung mit Fokus auf Plus Territory, Red Zone und realistischere Drive-Enden ab gegnerischer 45-Yard-Linie.</p>
    <p><span class="pill ${status50 === "GRUEN" ? "green" : "red"}">${status50}</span></p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>Terminal-Drive-Verteilung</h2>
    ${renderTable(["Drive-Ende", "Count", "Anteil %"], result50.driveEnds)}
  </section>
  <section>
    <h2>Plus-Territory-Verteilung</h2>
    <p>Analysiert wurden ${escapeHtml(result50.plusTerritoryDriveCount)} Drives, die mindestens die gegnerische 45 erreicht haben.</p>
    ${renderTable(["Result", "Count", "Anteil %"], result50.plusTerritoryRows)}
  </section>
  <section>
    <h2>Red-Zone-Verteilung</h2>
    <p>Analysiert wurden ${escapeHtml(result50.redZoneDriveCount)} Drives mit hoechster Feldposition ab gegnerischer 20.</p>
    ${renderTable(["Result", "Count", "Anteil %"], result50.redZoneRows)}
  </section>
  <section>
    <h2>4th-Down-Decision-Verteilung</h2>
    ${renderTable(["Decision", "Count", "Anteil %"], result50.fourthDownDecisions)}
  </section>
  <section>
    <h2>Auffaellige Terminal Drives</h2>
    ${renderTable(["Quarter", "Off", "Start", "Peak", "Decision", "Result", "Coach", "Dist", "Summary"], terminalSampleRows)}
  </section>
  <section>
    <h2>Empfehlung</h2>
    <p>${escapeHtml(recommendation)}</p>
  </section>
  ${
    result100
      ? `<section><h2>Optionaler 100-Spiele-Lauf</h2><p>Punts/Team-Spiel: ${escapeHtml(round(result100.puntsPerTeamGame, 2))}, FG-Attempts/Team-Spiel: ${escapeHtml(round(result100.fgAttemptsPerTeamGame, 2))}, TD/Team-Spiel: ${escapeHtml(round(result100.touchdownsPerTeamGame, 2))}, Punkte/Spiel: ${escapeHtml(round(result100.avgPointsPerGame, 1))}, Total Yards/Spiel: ${escapeHtml(round(result100.avgYardsPerGame, 1))}.</p></section>`
      : ""
  }
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-terminal-drive-report-${REPORT_DATE}.html`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        reportPath,
        status: status50,
        avgPointsPerGame: round(result50.avgPointsPerGame, 1),
        avgYardsPerGame: round(result50.avgYardsPerGame, 1),
        puntsPerTeamGame: round(result50.puntsPerTeamGame, 2),
        fgAttemptsPerTeamGame: round(result50.fgAttemptsPerTeamGame, 2),
        touchdownsPerTeamGame: round(result50.touchdownsPerTeamGame, 2),
        turnoverOnDownsPerTeamGame: round(result50.turnoverOnDownsPerTeamGame, 2),
        plusTerritoryDriveCount: result50.plusTerritoryDriveCount,
        redZoneDriveCount: result50.redZoneDriveCount,
        ranOptional100: Boolean(result100),
      },
      null,
      2,
    )}\n`,
  );
}

main();
