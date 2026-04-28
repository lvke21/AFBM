import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildInitialRoster } from "../../src/modules/savegames/application/bootstrap/initial-roster";
import { generateMatchStats } from "../../src/modules/seasons/application/simulation/match-engine";
import type {
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "../../src/modules/seasons/application/simulation/simulation.types";

const GAME_COUNT = 100;
const REPORT_FILE_NAME = "qa-playcount-reduction.html";

const BASELINE = {
  label: "Vorher",
  games: 100,
  pointsPerGame: 47.82,
  totalYardsPerGame: 849.16,
  playsPerDrive: 7.5,
  yardsPerDrive: 31.31,
  drivesPerGame: 27.12,
  touchdownsPerTeamGame: 3.0,
  puntsPerTeamGame: 4.36,
  fgAttemptsPerTeamGame: 1.88,
  turnoverOnDownsPerTeamGame: 0.81,
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
    matchId: `playcount-reduction-${index + 1}`,
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

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function collectTeamTotals(result: MatchSimulationResult) {
  return {
    points: result.homeScore + result.awayScore,
    yards: result.homeTeam.totalYards + result.awayTeam.totalYards,
  };
}

function simulateBatch() {
  let points = 0;
  let yards = 0;
  let driveYards = 0;
  let plays = 0;
  let drives = 0;
  let touchdowns = 0;
  let punts = 0;
  let fgAttempts = 0;
  let turnoverOnDowns = 0;
  let passRushMismatch = 0;

  for (let index = 0; index < GAME_COUNT; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    const totals = collectTeamTotals(result);
    points += totals.points;
    yards += totals.yards;

    for (const drive of result.drives) {
      driveYards += drive.totalYards;
      plays += drive.plays;
      drives += 1;

      if (drive.passAttempts + drive.rushAttempts !== drive.plays) {
        passRushMismatch += 1;
      }

      if (drive.resultType === "TOUCHDOWN") {
        touchdowns += 1;
      } else if (drive.resultType === "PUNT") {
        punts += 1;
      } else if (drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED") {
        fgAttempts += 1;
      } else if (drive.resultType === "TURNOVER_ON_DOWNS") {
        turnoverOnDowns += 1;
      }
    }
  }

  return {
    pointsPerGame: points / GAME_COUNT,
    totalYardsPerGame: yards / GAME_COUNT,
    driveYardsPerGame: driveYards / GAME_COUNT,
    playsPerDrive: plays / drives,
    yardsPerDrive: yards / drives,
    drivesPerGame: drives / GAME_COUNT,
    touchdownsPerTeamGame: touchdowns / (GAME_COUNT * 2),
    puntsPerTeamGame: punts / (GAME_COUNT * 2),
    fgAttemptsPerTeamGame: fgAttempts / (GAME_COUNT * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (GAME_COUNT * 2),
    passRushMismatch,
  };
}

function delta(after: number, before: number, digits = 2) {
  const value = round(after - before, digits);
  return value > 0 ? `+${value}` : String(value);
}

function main() {
  const result = simulateBatch();
  const playCountOk = result.playsPerDrive >= 6 && result.playsPerDrive <= 6.5;
  const yardsOk =
    result.totalYardsPerGame < BASELINE.totalYardsPerGame &&
    result.totalYardsPerGame >= BASELINE.totalYardsPerGame * 0.94;
  const pointsStable = Math.abs(result.pointsPerGame - BASELINE.pointsPerGame) <= 1;
  const touchdownsStable =
    Math.abs(result.touchdownsPerTeamGame - BASELINE.touchdownsPerTeamGame) <= 0.05;
  const driveEndsStable =
    result.puntsPerTeamGame <= BASELINE.puntsPerTeamGame + 0.05 &&
    result.fgAttemptsPerTeamGame <= BASELINE.fgAttemptsPerTeamGame + 0.05;
  const dataConsistent = result.passRushMismatch === 0;
  const status =
    playCountOk && yardsOk && pointsStable && touchdownsStable && driveEndsStable && dataConsistent
      ? "GRUEN"
      : "ROT";
  const beforeAfterRows = [
    [
      BASELINE.label,
      String(BASELINE.games),
      String(round(BASELINE.playsPerDrive, 2)),
      String(round(BASELINE.yardsPerDrive, 2)),
      String(round(BASELINE.totalYardsPerGame, 1)),
      String(round(BASELINE.pointsPerGame, 1)),
      String(round(BASELINE.touchdownsPerTeamGame, 2)),
      String(round(BASELINE.puntsPerTeamGame, 2)),
      String(round(BASELINE.fgAttemptsPerTeamGame, 2)),
    ],
    [
      "Nachher",
      String(GAME_COUNT),
      String(round(result.playsPerDrive, 2)),
      String(round(result.yardsPerDrive, 2)),
      String(round(result.totalYardsPerGame, 1)),
      String(round(result.pointsPerGame, 1)),
      String(round(result.touchdownsPerTeamGame, 2)),
      String(round(result.puntsPerTeamGame, 2)),
      String(round(result.fgAttemptsPerTeamGame, 2)),
    ],
    [
      "Delta",
      "-",
      delta(result.playsPerDrive, BASELINE.playsPerDrive),
      delta(result.yardsPerDrive, BASELINE.yardsPerDrive),
      delta(result.totalYardsPerGame, BASELINE.totalYardsPerGame, 1),
      delta(result.pointsPerGame, BASELINE.pointsPerGame, 1),
      delta(result.touchdownsPerTeamGame, BASELINE.touchdownsPerTeamGame),
      delta(result.puntsPerTeamGame, BASELINE.puntsPerTeamGame),
      delta(result.fgAttemptsPerTeamGame, BASELINE.fgAttemptsPerTeamGame),
    ],
  ];
  const statusRows = [
    ["Plays / Drive 6.0-6.5", playCountOk ? "GRUEN" : "ROT"],
    ["Yards leicht gesunken", yardsOk ? "GRUEN" : "ROT"],
    ["Punkte stabil", pointsStable ? "GRUEN" : "ROT"],
    ["TDs stabil", touchdownsStable ? "GRUEN" : "ROT"],
    ["Punts/FG nicht erhoeht", driveEndsStable ? "GRUEN" : "ROT"],
    ["Pass+Run Attempts = Plays", dataConsistent ? "GRUEN" : "ROT"],
  ];
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>QA Playcount Reduction</title>
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
    <h1>QA Playcount Reduction</h1>
    <p>100-Spiele-Audit fuer leicht kuerzere Drive-Sequenzen ohne 4th-Down-Aenderung und ohne Scoring-Verschiebung.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Technische Aenderung</h2>
    <p class="note">Laengere synthetische Drives werden im offiziellen Drive-Log um 1-3 mittelgute Sequenzplays komprimiert. Die Terminal-/4th-Down-Entscheidungen bleiben unveraendert; bei Non-TD-Drives werden 1-2 Yards aus wiederholten Zwischenraum-Gewinnen entfernt.</p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Phase", "Spiele", "Plays / Drive", "Yards / Drive", "Yards / Spiel", "Punkte", "TD/Team", "Punts/Team", "FG/Team"], beforeAfterRows)}
  </section>
  <section>
    <h2>Statuspruefung</h2>
    ${renderTable(["Check", "Status"], statusRows)}
  </section>
  <section>
    <h2>Bewertung</h2>
    <p>${status === "GRUEN" ? "GRUEN: Plays pro Drive liegen im Zielkorridor, Yards sind nur leicht gesunken, Scoring und Drive-End-Verteilung bleiben stabil." : "ROT: Mindestens ein Zielwert oder Stabilitaetscheck ist nicht erfuellt."}</p>
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
        status,
        games: GAME_COUNT,
        playsPerDrive: round(result.playsPerDrive, 2),
        yardsPerDrive: round(result.yardsPerDrive, 2),
        totalYardsPerGame: round(result.totalYardsPerGame, 1),
        pointsPerGame: round(result.pointsPerGame, 1),
        touchdownsPerTeamGame: round(result.touchdownsPerTeamGame, 2),
        puntsPerTeamGame: round(result.puntsPerTeamGame, 2),
        fgAttemptsPerTeamGame: round(result.fgAttemptsPerTeamGame, 2),
        passRushMismatch: result.passRushMismatch,
      },
      null,
      2,
    )}\n`,
  );
}

main();
