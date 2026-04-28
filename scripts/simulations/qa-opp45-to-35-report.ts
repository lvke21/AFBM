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
  pointsPerGame: 41.5,
  puntsPerTeamGame: 6.05,
  fgAttemptsPerTeamGame: 2.67,
  touchdownsPerTeamGame: 2.22,
  turnoverOnDownsPerTeamGame: 2.44,
  totalYardsPerGame: 912.6,
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
    matchId: `opp45-35-match-${index + 1}`,
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: `opp45-35-seed-${index + 1}`,
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

function rowsFromMap(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(total === 0 ? 0 : round((count / total) * 100, 1))]);
}

function zoneForDecision(drive: MatchDriveResult) {
  const ball = drive.fourthDownBallPosition ?? 0;
  if (ball >= 55 && ball < 60) {
    return "OPP45_TO_40";
  }
  if (ball >= 60 && ball < 65) {
    return "OPP40_TO_35";
  }
  if (ball >= 65 && ball < 80) {
    return "OPP35_TO_20";
  }
  if (ball >= 80) {
    return "RED_ZONE_20";
  }
  if (ball >= 50) {
    return "MIDFIELD";
  }
  return "BACKED_UP";
}

function simulateBatch(gameCount: number) {
  const oppZoneDecisions = new Map<string, number>();
  const todByZone = new Map<string, number>();
  const puntsByZone = new Map<string, number>();
  const fieldGoalsByZone = new Map<string, number>();
  const sampleDrives: MatchDriveResult[] = [];
  let totalPoints = 0;
  let totalYards = 0;
  let punts = 0;
  let fgAttempts = 0;
  let touchdowns = 0;
  let turnoverOnDowns = 0;

  for (let index = 0; index < gameCount; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    totalPoints += result.homeScore + result.awayScore;
    totalYards += result.homeTeam.totalYards + result.awayTeam.totalYards;

    for (const drive of result.drives) {
      const zone = zoneForDecision(drive);

      if (zone === "OPP45_TO_40" || zone === "OPP40_TO_35") {
        increment(
          oppZoneDecisions,
          `${zone} :: ${drive.fourthDownDistance ?? "-"} :: ${drive.coachingRiskProfile ?? "-"} :: ${drive.fourthDownDecision ?? "NONE"} :: ${drive.resultType}`,
        );

        if (sampleDrives.length < 5) {
          sampleDrives.push(drive);
        }
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
    }
  }

  return {
    avgPointsPerGame: totalPoints / gameCount,
    avgYardsPerGame: totalYards / gameCount,
    puntsPerTeamGame: punts / (gameCount * 2),
    fgAttemptsPerTeamGame: fgAttempts / (gameCount * 2),
    touchdownsPerTeamGame: touchdowns / (gameCount * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (gameCount * 2),
    oppZoneDecisionRows: rowsFromMap(oppZoneDecisions),
    todZoneRows: rowsFromMap(todByZone),
    puntZoneRows: rowsFromMap(puntsByZone),
    fieldGoalZoneRows: rowsFromMap(fieldGoalsByZone),
    sampleDrives,
  };
}

function main() {
  const result = simulateBatch(GAME_COUNT);
  const status =
    result.puntsPerTeamGame >= 3 &&
    result.puntsPerTeamGame <= 4.5 &&
    result.fgAttemptsPerTeamGame >= 1.5 &&
    result.fgAttemptsPerTeamGame <= 2.5 &&
    result.touchdownsPerTeamGame >= 2 &&
    result.touchdownsPerTeamGame <= 3 &&
    result.avgPointsPerGame >= 40 &&
    result.avgPointsPerGame <= 55 &&
    result.turnoverOnDownsPerTeamGame >= 0.5 &&
    result.turnoverOnDownsPerTeamGame <= 1.5 &&
    result.avgYardsPerGame <= 850
      ? "GRUEN"
      : "ROT";

  const beforeAfterRows = [
    ["Punkte / Spiel", String(BASELINE.pointsPerGame), String(round(result.avgPointsPerGame, 1))],
    ["Total Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result.avgYardsPerGame, 1))],
    ["Punts / Team-Spiel", String(BASELINE.puntsPerTeamGame), String(round(result.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(BASELINE.fgAttemptsPerTeamGame), String(round(result.fgAttemptsPerTeamGame, 2))],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result.touchdownsPerTeamGame, 2))],
    ["TURNOVER_ON_DOWNS / Team-Spiel", String(BASELINE.turnoverOnDownsPerTeamGame), String(round(result.turnoverOnDownsPerTeamGame, 2))],
  ];

  const sampleRows = result.sampleDrives.map((drive) => [
    drive.phaseLabel,
    drive.offenseTeamAbbreviation,
    String(drive.fourthDownBallPosition ?? ""),
    String(drive.fourthDownDistance ?? ""),
    drive.coachingRiskProfile ?? "",
    drive.fourthDownDecision ?? "",
    drive.resultType,
    drive.summary,
  ]);

  const improved =
    result.turnoverOnDownsPerTeamGame < BASELINE.turnoverOnDownsPerTeamGame &&
    result.puntsPerTeamGame < BASELINE.puntsPerTeamGame &&
    result.touchdownsPerTeamGame >= BASELINE.touchdownsPerTeamGame - 0.2 &&
    result.avgPointsPerGame >= 40;

  const recommendation = improved
    ? "Die OPP45_TO_35-Zone ist verbessert. Als naechstes kann dieselbe Abstufung vorsichtig auf die angrenzende Midfield-Zone uebertragen werden."
    : "Die OPP45_TO_35-Zone ist noch nicht sauber genug kalibriert. Als naechstes sollten vor allem PUNT-Entscheide bei 4th & 3-5 in dieser Zone weiter reduziert werden.";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>OPP45_TO_35 Report ${REPORT_DATE}</title>
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
    <h1>OPP45_TO_35 Calibration Report</h1>
    <p>50-Spiele-Validierung nach gezielter Kalibrierung der Entscheidungslogik in der Zone OPP45_TO_35.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
    <p>Verbesserung: ${escapeHtml(improved ? "Ja" : "Nein")}</p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>Entscheidungen in OPP45_TO_35</h2>
    ${renderTable(["Zone :: Dist :: Coach :: Decision :: Result", "Count", "Anteil %"], result.oppZoneDecisionRows)}
  </section>
  <section>
    <h2>TOD nach Zone</h2>
    ${renderTable(["Zone", "Count", "Anteil %"], result.todZoneRows)}
  </section>
  <section>
    <h2>Punts nach Zone</h2>
    ${renderTable(["Zone", "Count", "Anteil %"], result.puntZoneRows)}
  </section>
  <section>
    <h2>Field Goals nach Zone</h2>
    ${renderTable(["Zone", "Count", "Anteil %"], result.fieldGoalZoneRows)}
  </section>
  <section>
    <h2>Beispiel-Drives</h2>
    ${renderTable(["Quarter", "Off", "Ball", "Dist", "Coach", "Decision", "Result", "Summary"], sampleRows)}
  </section>
  <section>
    <h2>Empfehlung</h2>
    <p>${escapeHtml(recommendation)}</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-opp45-to-35-report-${REPORT_DATE}.html`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, html, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        reportPath,
        status,
        improved,
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
