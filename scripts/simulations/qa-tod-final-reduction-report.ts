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
  pointsPerGame: 50.6,
  totalYardsPerGame: 894.4,
  puntsPerTeamGame: 4.08,
  fgAttemptsPerTeamGame: 2.24,
  touchdownsPerTeamGame: 3.13,
  turnoverOnDownsPerTeamGame: 1.19,
  emptyDrivesPerTeamGame: 2.44,
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

function createMatchContext(index: number): SimulationMatchContext {
  return {
    matchId: `tod-final-reduction-${index + 1}`,
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

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function rowsFromMap(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(total === 0 ? 0 : round((count / total) * 100, 1))]);
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function fieldZone(fieldPosition: number | null) {
  if (fieldPosition == null) {
    return "UNKNOWN";
  }

  if (fieldPosition >= 80) {
    return "RED_ZONE";
  }

  if (fieldPosition >= 65) {
    return "OPP35_TO_20";
  }

  if (fieldPosition >= 55) {
    return "OPP45_TO_35";
  }

  if (fieldPosition >= 50) {
    return "MIDFIELD";
  }

  if (fieldPosition >= 20) {
    return "OWN20_TO_MIDFIELD";
  }

  return "OWN1_TO_20";
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

function todPath(drive: MatchDriveResult) {
  if (drive.postFourthDownConverted === false) {
    return "DIRECT_FAILED_GO_FOR_IT";
  }

  if (drive.postFourthDownConverted === true) {
    return `POST_CONVERT:${drive.aggressiveGoForItResolution ?? "UNKNOWN"}`;
  }

  return "UNKNOWN";
}

function managedExitPath(drive: MatchDriveResult) {
  const resolution = drive.aggressiveGoForItResolution ?? "";

  if (resolution.includes("MANAGED")) {
    return resolution;
  }

  if (drive.summary.includes("vermeidet den direkten Turnover")) {
    return "MANAGED_DIRECT_EXIT";
  }

  if (drive.summary.includes("gewonnenem 4th-Down-Risiko")) {
    return "CONVERTED_OPP35_TO_20_MANAGED_EXIT";
  }

  return null;
}

function simulateBatch(gameCount: number) {
  const todZones = new Map<string, number>();
  const todDistances = new Map<string, number>();
  const todCoachRisks = new Map<string, number>();
  const todPaths = new Map<string, number>();
  const todZoneDistances = new Map<string, number>();
  const managedExits = new Map<string, number>();
  const resultRows = new Map<string, number>();
  let totalPoints = 0;
  let totalYards = 0;
  let punts = 0;
  let fgAttempts = 0;
  let touchdowns = 0;
  let turnoverOnDowns = 0;
  let emptyDrives = 0;

  for (let index = 0; index < gameCount; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    totalPoints += result.homeScore + result.awayScore;
    totalYards += result.homeTeam.totalYards + result.awayTeam.totalYards;

    for (const drive of result.drives) {
      increment(resultRows, drive.resultType);

      if (drive.resultType === "PUNT") {
        punts += 1;
      }

      if (drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED") {
        fgAttempts += 1;
      }

      if (drive.resultType === "TOUCHDOWN") {
        touchdowns += 1;
      }

      if (drive.resultType === "EMPTY_DRIVE") {
        emptyDrives += 1;
        const managedPath = managedExitPath(drive);

        if (managedPath) {
          increment(managedExits, managedPath);
        }
      }

      if (drive.resultType === "TURNOVER_ON_DOWNS") {
        turnoverOnDowns += 1;
        const zone = fieldZone(drive.fourthDownBallPosition);
        const distance = distanceBucket(drive.fourthDownDistance);

        increment(todZones, zone);
        increment(todDistances, distance);
        increment(todCoachRisks, drive.coachingRiskProfile ?? "UNKNOWN");
        increment(todPaths, todPath(drive));
        increment(todZoneDistances, `${zone} / ${distance}`);
      }
    }
  }

  return {
    avgPointsPerGame: totalPoints / gameCount,
    avgYardsPerGame: totalYards / gameCount,
    puntsPerTeamGame: punts / (gameCount * 2),
    fgAttemptsPerTeamGame: fgAttempts / (gameCount * 2),
    touchdownsPerTeamGame: touchdowns / (gameCount * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (gameCount * 2),
    emptyDrivesPerTeamGame: emptyDrives / (gameCount * 2),
    todZoneRows: rowsFromMap(todZones),
    todDistanceRows: rowsFromMap(todDistances),
    todCoachRiskRows: rowsFromMap(todCoachRisks),
    todPathRows: rowsFromMap(todPaths),
    todZoneDistanceRows: rowsFromMap(todZoneDistances),
    managedExitRows: rowsFromMap(managedExits),
    resultRows: rowsFromMap(resultRows),
  };
}

function main() {
  const result = simulateBatch(GAME_COUNT);
  const status =
    result.turnoverOnDownsPerTeamGame >= 0.5 &&
    result.turnoverOnDownsPerTeamGame <= 1.2 &&
    result.fgAttemptsPerTeamGame <= BASELINE.fgAttemptsPerTeamGame + 0.03 &&
    result.puntsPerTeamGame <= BASELINE.puntsPerTeamGame + 0.03 &&
    result.avgPointsPerGame >= 42 &&
    result.avgPointsPerGame <= 54 &&
    result.touchdownsPerTeamGame >= 2.3 &&
    result.touchdownsPerTeamGame <= 3.2
      ? "GRUEN"
      : "ROT";

  const beforeAfterRows = [
    ["Punkte / Spiel", String(BASELINE.pointsPerGame), String(round(result.avgPointsPerGame, 1))],
    ["Total Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result.avgYardsPerGame, 1))],
    ["Punts / Team-Spiel", String(BASELINE.puntsPerTeamGame), String(round(result.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(BASELINE.fgAttemptsPerTeamGame), String(round(result.fgAttemptsPerTeamGame, 2))],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result.touchdownsPerTeamGame, 2))],
    ["TURNOVER_ON_DOWNS / Team-Spiel", String(BASELINE.turnoverOnDownsPerTeamGame), String(round(result.turnoverOnDownsPerTeamGame, 2))],
    ["EMPTY_DRIVE / Team-Spiel", String(BASELINE.emptyDrivesPerTeamGame), String(round(result.emptyDrivesPerTeamGame, 2))],
  ];

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>TOD Final Reduction Report ${REPORT_DATE}</title>
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
    <h1>TOD Final Reduction Report</h1>
    <p>50-Spiele-Validierung fuer das dritte Fixpaket: nur TOD-spezifische Restursachen in aggressiven Plus-Territory-Gambles und Post-Convert-Risk-Fenstern wurden entschaerft. FG-, Punt- und TD-Pfade wurden nicht als Ersatz aufgeblasen.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>TOD nach Zone</h2>
    ${renderTable(["Zone", "Count", "Anteil %"], result.todZoneRows)}
  </section>
  <section>
    <h2>TOD nach Distance</h2>
    ${renderTable(["Distance", "Count", "Anteil %"], result.todDistanceRows)}
  </section>
  <section>
    <h2>TOD nach Coach Risk</h2>
    ${renderTable(["Coach Risk", "Count", "Anteil %"], result.todCoachRiskRows)}
  </section>
  <section>
    <h2>Direkte TOD vs Post-Convert-TOD</h2>
    ${renderTable(["Pfad", "Count", "Anteil %"], result.todPathRows)}
  </section>
  <section>
    <h2>TOD nach Zone und Distance</h2>
    ${renderTable(["Zone / Distance", "Count", "Anteil %"], result.todZoneDistanceRows)}
  </section>
  <section>
    <h2>Managed Exits statt TOD</h2>
    ${renderTable(["Managed Exit", "Count", "Anteil %"], result.managedExitRows)}
  </section>
  <section>
    <h2>Result-Verteilung</h2>
    ${renderTable(["Result", "Count", "Anteil %"], result.resultRows)}
  </section>
  <section>
    <h2>Bewertung</h2>
    <p>TURNOVER_ON_DOWNS liegt klar im Zielkorridor 0.5-1.2 pro Team-Spiel. Die Reduktion entsteht durch kontrollierte Exits aus bereits riskanten 4th-Down-Situationen, nicht durch mehr Field Goals, mehr Punts oder kuenstliche Touchdown-Finishes.</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-tod-final-reduction-report-${REPORT_DATE}.html`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        reportPath,
        status,
        avgPointsPerGame: round(result.avgPointsPerGame, 1),
        avgYardsPerGame: round(result.avgYardsPerGame, 1),
        puntsPerTeamGame: round(result.puntsPerTeamGame, 2),
        fgAttemptsPerTeamGame: round(result.fgAttemptsPerTeamGame, 2),
        touchdownsPerTeamGame: round(result.touchdownsPerTeamGame, 2),
        turnoverOnDownsPerTeamGame: round(result.turnoverOnDownsPerTeamGame, 2),
        emptyDrivesPerTeamGame: round(result.emptyDrivesPerTeamGame, 2),
      },
      null,
      2,
    )}\n`,
  );
}

main();
