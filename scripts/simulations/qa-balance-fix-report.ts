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
const GAME_COUNT = 50;
const OPTIONAL_GAME_COUNT = 100;
const BASELINE = {
  pointsPerGame: 48.3,
  totalYardsPerGame: 988.3,
  puntsPerTeamGame: 6.16,
  fgAttemptsPerTeamGame: 2.91,
  touchdownsPerTeamGame: 2.62,
  turnoverOnDownsPerTeamGame: 2.79,
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
    matchId: `balance-fix-match-${index + 1}`,
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: `balance-fix-seed-${index + 1}`,
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

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function distributionRows(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(total === 0 ? 0 : round((count / total) * 100, 1))]);
}

function zoneFromFieldPosition(fieldPosition: number | null | undefined) {
  const value = fieldPosition ?? 0;
  if (value >= 80) {
    return "RED_ZONE_20";
  }
  if (value >= 65) {
    return "OPP35_TO_20";
  }
  if (value >= 55) {
    return "OPP45_TO_35";
  }
  if (value >= 50) {
    return "MIDFIELD";
  }
  return "BACKED_UP";
}

function auditResult(result: MatchSimulationResult) {
  const issues: string[] = [];
  const teams = [result.homeTeam, result.awayTeam];
  const driveYardsByTeam = new Map<string, number>();

  for (const drive of result.drives) {
    driveYardsByTeam.set(
      drive.offenseTeamId,
      (driveYardsByTeam.get(drive.offenseTeamId) ?? 0) + drive.totalYards,
    );
  }

  for (const team of teams) {
    const playerLines = result.playerLines.filter((line) => line.teamId === team.teamId);
    const playerPassingYards = playerLines.reduce((sum, line) => sum + line.passing.yards, 0);
    const playerRushingYards = playerLines.reduce((sum, line) => sum + line.rushing.yards, 0);
    const returnYards = playerLines.reduce(
      (sum, line) => sum + line.returns.kickReturnYards + line.returns.puntReturnYards,
      0,
    );

    if (team.totalYards !== team.passingYards + team.rushingYards) {
      issues.push(`${team.teamId}: Team Total Yards stimmen nicht mit Passing + Rushing ueberein.`);
    }
    if (team.passingYards !== playerPassingYards) {
      issues.push(`${team.teamId}: Team Passing Yards stimmen nicht mit Player Passing Yards ueberein.`);
    }
    if (team.rushingYards !== playerRushingYards) {
      issues.push(`${team.teamId}: Team Rushing Yards stimmen nicht mit Player Rushing Yards ueberein.`);
    }
    if (team.totalYards !== (driveYardsByTeam.get(team.teamId) ?? 0)) {
      issues.push(`${team.teamId}: Team Total Yards stimmen nicht mit der Summe der Offense-Drives ueberein.`);
    }
    if (returnYards > 0 && team.totalYards === team.passingYards + team.rushingYards) {
      // Return yards are tracked separately; this is the expected path.
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function simulateBatch(gameCount: number) {
  const decisionByZone = new Map<string, number>();
  const todByZone = new Map<string, number>();
  const puntsByZone = new Map<string, number>();
  const fieldGoalsByZone = new Map<string, number>();
  const sampleDrives: MatchDriveResult[] = [];
  const auditIssues: string[] = [];
  let totalPoints = 0;
  let totalYards = 0;
  let punts = 0;
  let fgAttempts = 0;
  let touchdowns = 0;
  let turnoverOnDowns = 0;

  for (let index = 0; index < gameCount; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    const audit = auditResult(result);
    if (!audit.ok) {
      auditIssues.push(...audit.issues.map((issue) => `Game ${index + 1}: ${issue}`));
    }

    totalPoints += result.homeScore + result.awayScore;
    totalYards += result.homeTeam.totalYards + result.awayTeam.totalYards;

    for (const drive of result.drives) {
      const zone = zoneFromFieldPosition(drive.fourthDownBallPosition ?? drive.highestReachedFieldPosition);

      if (drive.fourthDownDecision) {
        increment(decisionByZone, `${zone} :: ${drive.fourthDownDecision}`);
      }
      if (drive.resultType === "TURNOVER_ON_DOWNS") {
        turnoverOnDowns += 1;
        increment(todByZone, zone);
      }
      if (drive.resultType === "PUNT") {
        punts += 1;
        increment(puntsByZone, zone);
      }
      if (drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED") {
        fgAttempts += 1;
        increment(fieldGoalsByZone, zone);
      }
      if (drive.resultType === "TOUCHDOWN") {
        touchdowns += 1;
      }

      if (
        sampleDrives.length < 5 &&
        (
          drive.resultType === "TURNOVER_ON_DOWNS" ||
          drive.resultType === "PUNT" ||
          drive.resultType === "FIELD_GOAL_MADE" ||
          drive.resultType === "FIELD_GOAL_MISSED"
        )
      ) {
        sampleDrives.push(drive);
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
    auditIssues,
    decisionByZoneRows: distributionRows(decisionByZone),
    todByZoneRows: distributionRows(todByZone),
    puntsByZoneRows: distributionRows(puntsByZone),
    fieldGoalsByZoneRows: distributionRows(fieldGoalsByZone),
    sampleDrives,
  };
}

function statusFor(result: ReturnType<typeof simulateBatch>) {
  return (
    result.auditIssues.length === 0 &&
    result.avgPointsPerGame >= 40 &&
    result.avgPointsPerGame <= 55 &&
    result.touchdownsPerTeamGame >= 2 &&
    result.touchdownsPerTeamGame <= 3.5 &&
    result.avgYardsPerGame >= 650 &&
    result.avgYardsPerGame <= 850 &&
    result.puntsPerTeamGame >= 3 &&
    result.puntsPerTeamGame <= 4.5 &&
    result.fgAttemptsPerTeamGame >= 1 &&
    result.fgAttemptsPerTeamGame <= 2.5 &&
    result.turnoverOnDownsPerTeamGame >= 0.5 &&
    result.turnoverOnDownsPerTeamGame <= 1.5
  )
    ? "GRUEN"
    : "ROT";
}

function main() {
  const result50 = simulateBatch(GAME_COUNT);
  const status50 = statusFor(result50);
  const result100 = status50 === "GRUEN" ? simulateBatch(OPTIONAL_GAME_COUNT) : null;

  const auditRows = result50.auditIssues.length === 0
    ? [["Status", "OK"], ["Detail", "Team Total Yards = Passing + Rushing; Player-Rollups stimmen; Return-Yards werden nicht in Total Offense eingerechnet; Drive-Summen sind konsistent."]]
    : result50.auditIssues.slice(0, 8).map((issue, index) => [`Issue ${index + 1}`, issue]);

  const beforeAfterRows = [
    ["Punkte / Spiel", String(BASELINE.pointsPerGame), String(round(result50.avgPointsPerGame, 1))],
    ["Total Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result50.avgYardsPerGame, 1))],
    ["Punts / Team-Spiel", String(BASELINE.puntsPerTeamGame), String(round(result50.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(BASELINE.fgAttemptsPerTeamGame), String(round(result50.fgAttemptsPerTeamGame, 2))],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result50.touchdownsPerTeamGame, 2))],
    ["Turnover on Downs / Team-Spiel", String(BASELINE.turnoverOnDownsPerTeamGame), String(round(result50.turnoverOnDownsPerTeamGame, 2))],
  ];

  const sampleRows = result50.sampleDrives.map((drive) => [
    drive.phaseLabel,
    drive.offenseTeamAbbreviation,
    String(drive.startFieldPosition ?? ""),
    String(drive.highestReachedFieldPosition ?? ""),
    String(drive.fourthDownBallPosition ?? ""),
    String(drive.fourthDownDistance ?? ""),
    drive.coachingRiskProfile ?? "",
    drive.fourthDownDecision ?? "",
    drive.resultType,
    drive.summary,
  ]);

  const recommendation =
    result50.auditIssues.length > 0
      ? "Zuerst die fehlerhafte Stat-Aggregation korrigieren, bevor weitere Balancing-Schritte erfolgen."
      : result50.avgYardsPerGame > 850
        ? "Als naechstes die Mittelfeld-Yards und die Zahl brauchbarer, aber punktloser Drives weiter reduzieren, ohne die Red-Zone-Finishes erneut anzutasten."
        : result50.turnoverOnDownsPerTeamGame > 1.5
          ? "Als naechstes die Zone gegnerische 35 bis 20 weiter auf kontrollierte FG-Entscheide statt TURNOVER_ON_DOWNS trimmen."
          : "Die Balance ist plausibel; als naechstes den 100-Spiele-Lauf als Stabilitaetscheck etablieren.";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Balance Fix Report ${REPORT_DATE}</title>
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
    <h1>Balance Fix Report</h1>
    <p>50-Spiele-Validierung nach Stat-Yards-Audit und gezielter Korrektur von Mittelfeld-Yards, 4th & short in der Zone gegnerische 35-20 sowie Punts/FGs nach Feldzone.</p>
    <p><span class="pill ${status50 === "GRUEN" ? "green" : "red"}">${status50}</span></p>
  </section>
  <section>
    <h2>Stat-Yards-Audit</h2>
    ${renderTable(["Pruefung", "Ergebnis"], auditRows)}
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>4th-Down-Entscheidungen nach Field Zone</h2>
    ${renderTable(["Zone :: Decision", "Count", "Anteil %"], result50.decisionByZoneRows)}
  </section>
  <section>
    <h2>Turnover on Downs nach Field Zone</h2>
    ${renderTable(["Zone", "Count", "Anteil %"], result50.todByZoneRows)}
  </section>
  <section>
    <h2>Punts nach Field Zone</h2>
    ${renderTable(["Zone", "Count", "Anteil %"], result50.puntsByZoneRows)}
  </section>
  <section>
    <h2>Field Goals nach Field Zone</h2>
    ${renderTable(["Zone", "Count", "Anteil %"], result50.fieldGoalsByZoneRows)}
  </section>
  <section>
    <h2>Beispiel-Drives</h2>
    ${renderTable(["Quarter", "Off", "Start", "Peak", "Ball", "Dist", "Coach", "Decision", "Result", "Summary"], sampleRows)}
  </section>
  <section>
    <h2>Empfehlung</h2>
    <p>${escapeHtml(recommendation)}</p>
  </section>
  ${
    result100
      ? `<section><h2>Optionaler 100-Spiele-Lauf</h2><p>Punkte/Spiel: ${escapeHtml(round(result100.avgPointsPerGame, 1))}, Total Yards/Spiel: ${escapeHtml(round(result100.avgYardsPerGame, 1))}, Punts/Team-Spiel: ${escapeHtml(round(result100.puntsPerTeamGame, 2))}, FG-Attempts/Team-Spiel: ${escapeHtml(round(result100.fgAttemptsPerTeamGame, 2))}, TD/Team-Spiel: ${escapeHtml(round(result100.touchdownsPerTeamGame, 2))}, TOD/Team-Spiel: ${escapeHtml(round(result100.turnoverOnDownsPerTeamGame, 2))}.</p></section>`
      : ""
  }
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-balance-fix-report-${REPORT_DATE}.html`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        reportPath,
        status: status50,
        auditOk: result50.auditIssues.length === 0,
        avgPointsPerGame: round(result50.avgPointsPerGame, 1),
        avgYardsPerGame: round(result50.avgYardsPerGame, 1),
        puntsPerTeamGame: round(result50.puntsPerTeamGame, 2),
        fgAttemptsPerTeamGame: round(result50.fgAttemptsPerTeamGame, 2),
        touchdownsPerTeamGame: round(result50.touchdownsPerTeamGame, 2),
        turnoverOnDownsPerTeamGame: round(result50.turnoverOnDownsPerTeamGame, 2),
        ranOptional100: Boolean(result100),
      },
      null,
      2,
    )}\n`,
  );
}

main();
