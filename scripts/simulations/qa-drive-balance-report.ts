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
const BASELINE_GAMES = 30;
const BASELINE_DRIVE_ENDS = {
  FIELD_GOAL_MADE: 442,
  FIELD_GOAL_MISSED: 63,
  TOUCHDOWN: 416,
  TURNOVER_ON_DOWNS: 89,
  TURNOVER: 17,
  PUNT: 3,
} as const;
const BASELINE_AVG_POINTS_PER_GAME = 146.1;
const BASELINE_AVG_TOTAL_YARDS_PER_GAME = 2532.1;

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

function createMatchContext(index: number): SimulationMatchContext {
  return {
    matchId: `balance-match-${index + 1}`,
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: `balance-seed-${index + 1}`,
    seasonYear: 2026,
    week: (index % 10) + 1,
    scheduledAt: new Date("2026-10-01T18:00:00.000Z"),
    homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
    awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
  };
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function simulateGames() {
  const counts = new Map<string, number>();
  const fourthDownDecisions = new Map<string, number>();
  const fourthDownLogs: MatchDriveResult[] = [];
  let totalPoints = 0;
  let totalYards = 0;
  let totalPunts = 0;
  let totalFgAttempts = 0;
  let totalTouchdowns = 0;
  let totalTod = 0;

  for (let index = 0; index < GAME_COUNT; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    totalPoints += result.homeScore + result.awayScore;
    totalYards += result.homeTeam.totalYards + result.awayTeam.totalYards;

    for (const drive of result.drives) {
      counts.set(drive.resultType, (counts.get(drive.resultType) ?? 0) + 1);
      if (drive.resultType === "PUNT") {
        totalPunts += 1;
      }
      if (drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED") {
        totalFgAttempts += 1;
      }
      if (drive.resultType === "TOUCHDOWN") {
        totalTouchdowns += 1;
      }
      if (drive.resultType === "TURNOVER_ON_DOWNS") {
        totalTod += 1;
      }

      if (drive.fourthDownDecision) {
        fourthDownDecisions.set(
          drive.fourthDownDecision,
          (fourthDownDecisions.get(drive.fourthDownDecision) ?? 0) + 1,
        );
        fourthDownLogs.push(drive);
      }
    }
  }

  return {
    counts,
    fourthDownDecisions,
    fourthDownLogs,
    avgPointsPerGame: totalPoints / GAME_COUNT,
    avgYardsPerGame: totalYards / GAME_COUNT,
    puntsPerTeamGame: totalPunts / (GAME_COUNT * 2),
    fgAttemptsPerTeamGame: totalFgAttempts / (GAME_COUNT * 2),
    touchdownsPerTeamGame: totalTouchdowns / (GAME_COUNT * 2),
    turnoverOnDownsPerTeamGame: totalTod / (GAME_COUNT * 2),
  };
}

function main() {
  const result = simulateGames();
  const beforeAfterRows = [
    [
      "Punts / Team-Spiel",
      String(round(BASELINE_DRIVE_ENDS.PUNT / (BASELINE_GAMES * 2), 2)),
      String(round(result.puntsPerTeamGame, 2)),
    ],
    [
      "FG-Attempts / Team-Spiel",
      String(
        round(
          (BASELINE_DRIVE_ENDS.FIELD_GOAL_MADE + BASELINE_DRIVE_ENDS.FIELD_GOAL_MISSED) /
            (BASELINE_GAMES * 2),
          2,
        ),
      ),
      String(round(result.fgAttemptsPerTeamGame, 2)),
    ],
    [
      "Touchdowns / Team-Spiel",
      String(round(BASELINE_DRIVE_ENDS.TOUCHDOWN / (BASELINE_GAMES * 2), 2)),
      String(round(result.touchdownsPerTeamGame, 2)),
    ],
    [
      "Turnover on Downs / Team-Spiel",
      String(round(BASELINE_DRIVE_ENDS.TURNOVER_ON_DOWNS / (BASELINE_GAMES * 2), 2)),
      String(round(result.turnoverOnDownsPerTeamGame, 2)),
    ],
    [
      "Punkte / Spiel",
      String(round(BASELINE_AVG_POINTS_PER_GAME, 1)),
      String(round(result.avgPointsPerGame, 1)),
    ],
    [
      "Total Yards / Spiel",
      String(round(BASELINE_AVG_TOTAL_YARDS_PER_GAME, 1)),
      String(round(result.avgYardsPerGame, 1)),
    ],
  ];

  const driveEndRows = [...result.counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(round(count / (GAME_COUNT * 2), 2))]);

  const decisionRows = [...result.fourthDownDecisions.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(round(count / GAME_COUNT, 2))]);

  const sampleLogs = result.fourthDownLogs
    .filter((drive) =>
      ["PUNT", "FIELD_GOAL_MADE", "FIELD_GOAL_MISSED", "TURNOVER_ON_DOWNS"].includes(
        drive.resultType,
      ),
    )
    .slice(0, 12)
    .map((drive) => [
      drive.phaseLabel,
      drive.offenseTeamAbbreviation,
      String(drive.fourthDownBallPosition ?? ""),
      String(drive.fourthDownDistance ?? ""),
      String(drive.fourthDownScoreDelta ?? ""),
      String(drive.fourthDownSecondsRemaining ?? ""),
      drive.coachingRiskProfile ?? "",
      drive.fourthDownDecision ?? "",
      drive.resultType,
      drive.summary,
    ]);

  const status =
    result.puntsPerTeamGame >= 2 &&
    result.avgPointsPerGame < BASELINE_AVG_POINTS_PER_GAME &&
    result.avgYardsPerGame < BASELINE_AVG_TOTAL_YARDS_PER_GAME &&
    result.fgAttemptsPerTeamGame >= 1 &&
    result.turnoverOnDownsPerTeamGame < result.touchdownsPerTeamGame
      ? "GRUEN"
      : "ROT";

  const recommendation =
    result.puntsPerTeamGame < 2
      ? "Als naechstes sollte Yardage weiter kalibriert werden, vor allem Early Downs und 3rd-Down-Erfolg."
      : result.avgPointsPerGame > 110
        ? "Als naechstes sollte vor allem die Red-Zone-Effizienz weiter reduziert werden."
        : "Als naechstes sollte vor allem die Terminal-Drive-Logik kalibriert werden: mehr TD-Abschluesse aus plus-Territory, weniger spaete FG-Pfade nach konvertiertem 4th Down.";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Drive Balance Report ${REPORT_DATE}</title>
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
    <h1>Drive Physics Calibration Report</h1>
    <p>50-Spiele-Kalibrierung nach Anpassung der vorgelagerten Drive-Physik. Fokus: weniger automatische Scores, mehr 4th & long, mehr Punts, realistischere 4th-Down-Inputs.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Technischer Kurzbericht</h2>
    <p>Kalibriert wurden Early-Down-Yardage, Sack-/Pressure-Raten, Incompletions, Run-Stuffs/TFL, Holding-Einfluss auf 4th-Down-Distanz sowie konservativere Startfelder. Die 4th-Down-Entscheidungslogik blieb funktional erhalten und liefert jetzt strukturierte Logdaten pro Entscheidung.</p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>Drive-End-Verteilung</h2>
    ${renderTable(["Drive-Ende", "Count", "Pro Team-Spiel"], driveEndRows)}
  </section>
  <section>
    <h2>4th-Down-Decision-Verteilung</h2>
    ${renderTable(["Decision", "Count", "Pro Spiel"], decisionRows)}
  </section>
  <section>
    <h2>Auffaellige Beispiele aus Logs</h2>
    ${renderTable(["Quarter", "Off", "Ball", "Dist", "Score", "Time", "Coach", "Decision", "Result", "Summary"], sampleLogs)}
  </section>
  <section>
    <h2>Empfehlung</h2>
    <p>${escapeHtml(recommendation)}</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-drive-balance-report-${REPORT_DATE}.html`);
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
      },
      null,
      2,
    )}\n`,
  );
}

main();
