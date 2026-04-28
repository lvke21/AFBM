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
  pointsPerGame: 54.1,
  totalYardsPerGame: 921.5,
  puntsPerTeamGame: 4.88,
  fgAttemptsPerTeamGame: 3.01,
  touchdownsPerTeamGame: 3.02,
  turnoverOnDownsPerTeamGame: 2.65,
  convertedToTodRate: 24.2,
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
    matchId: `opp35-20-finish-${index + 1}`,
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

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function rowsFromMap(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(total === 0 ? 0 : round((count / total) * 100, 1))]);
}

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function simulateBatch(gameCount: number) {
  const finishDistribution = new Map<string, number>();
  const convertOutcome = new Map<string, number>();
  const sampleDrives: MatchDriveResult[] = [];
  const playsAfterEntry: number[] = [];
  let totalPoints = 0;
  let totalYards = 0;
  let punts = 0;
  let fgAttempts = 0;
  let touchdowns = 0;
  let turnoverOnDowns = 0;
  let convertedDrives = 0;
  let convertedToTod = 0;
  let opp35OriginDrives = 0;
  let opp35FinishWindowDrives = 0;
  let opp35FinishWindowTod = 0;

  for (let index = 0; index < gameCount; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    totalPoints += result.homeScore + result.awayScore;
    totalYards += result.homeTeam.totalYards + result.awayTeam.totalYards;

    for (const drive of result.drives) {
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

      if (drive.postFourthDownConverted) {
        convertedDrives += 1;
        increment(convertOutcome, `${drive.aggressiveGoForItResolution ?? "CONVERTED"} :: ${drive.resultType}`);
        if (drive.resultType === "TURNOVER_ON_DOWNS") {
          convertedToTod += 1;
        }
      }

      const inOpp35FinishWindow =
        drive.postConvertOriginatedOpp35To20 ||
        drive.postConvertEnteredOpp35To20;

      if (drive.postConvertOriginatedOpp35To20) {
        opp35OriginDrives += 1;
      }

      if (inOpp35FinishWindow) {
        opp35FinishWindowDrives += 1;
        increment(finishDistribution, drive.opp35To20FinishResult ?? drive.resultType);
        if ((drive.playsAfterOpp35To20Entry ?? 0) > 0) {
          playsAfterEntry.push(drive.playsAfterOpp35To20Entry ?? 0);
        }
        if (drive.resultType === "TURNOVER_ON_DOWNS") {
          opp35FinishWindowTod += 1;
        }
        if (sampleDrives.length < 5) {
          sampleDrives.push(drive);
        }
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
    convertedToTodRate: convertedDrives === 0 ? 0 : (convertedToTod / convertedDrives) * 100,
    opp35OriginDrives,
    opp35FinishWindowDrives,
    opp35FinishWindowTodRate:
      opp35FinishWindowDrives === 0
        ? 0
        : (opp35FinishWindowTod / opp35FinishWindowDrives) * 100,
    avgPlaysAfterEntry: average(playsAfterEntry),
    finishRows: rowsFromMap(finishDistribution),
    convertOutcomeRows: rowsFromMap(convertOutcome),
    sampleDrives,
  };
}

function main() {
  const result = simulateBatch(GAME_COUNT);
  const status =
    result.convertedToTodRate < BASELINE.convertedToTodRate &&
    result.opp35FinishWindowTodRate <= 8 &&
    result.turnoverOnDownsPerTeamGame >= 0.5 &&
    result.turnoverOnDownsPerTeamGame <= 1.2 &&
    result.fgAttemptsPerTeamGame <= 2.5 &&
    result.touchdownsPerTeamGame >= 2.5 &&
    result.touchdownsPerTeamGame <= 3.2 &&
    result.avgPointsPerGame >= 40 &&
    result.avgPointsPerGame <= 55
      ? "GRUEN"
      : "ROT";

  const beforeAfterRows = [
    ["Punkte / Spiel", String(BASELINE.pointsPerGame), String(round(result.avgPointsPerGame, 1))],
    ["Total Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result.avgYardsPerGame, 1))],
    ["Punts / Team-Spiel", String(BASELINE.puntsPerTeamGame), String(round(result.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(BASELINE.fgAttemptsPerTeamGame), String(round(result.fgAttemptsPerTeamGame, 2))],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result.touchdownsPerTeamGame, 2))],
    ["TURNOVER_ON_DOWNS / Team-Spiel", String(BASELINE.turnoverOnDownsPerTeamGame), String(round(result.turnoverOnDownsPerTeamGame, 2))],
    ["CONVERTED -> TOD", `${BASELINE.convertedToTodRate}%`, `${round(result.convertedToTodRate, 1)}%`],
  ];

  const sampleRows = result.sampleDrives.map((drive) => [
    drive.phaseLabel,
    drive.offenseTeamAbbreviation,
    String(drive.fourthDownBallPosition ?? ""),
    String(drive.fourthDownDistance ?? ""),
    `${drive.postConvertOriginatedOpp35To20 ? "Origin" : ""}${drive.postConvertEnteredOpp35To20 ? " Entry" : ""}`.trim(),
    drive.opp35To20FinishResult ?? "",
    String(drive.playsAfterOpp35To20Entry ?? ""),
    drive.resultType,
    drive.summary,
  ]);

  const recommendation =
    result.opp35FinishWindowTodRate <= 8 && result.convertedToTodRate < BASELINE.convertedToTodRate
      ? "Der Hard-Finish-Pfad in OPP35_TO_20 greift fuer originierende und eintretende Convert-Drives. Als naechstes sollte nur noch die globale direkte GO_FOR_IT-TOD-Last geprueft werden, ohne den neuen Finish-Pfad zu lockern."
      : "Der Hard-Finish-Pfad ist noch nicht stark genug. Als naechstes sollte nur die Ausnahme-TOD-Rate in OPP35_TO_20 weiter gesenkt werden.";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>OPP35_TO_20 Finish Report ${REPORT_DATE}</title>
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
    <h1>OPP35_TO_20 Finish Report</h1>
    <p>50-Spiele-Validierung fuer Hard-Finish-Routing nach erfolgreichem 4th-Down-Convert mit Ursprung oder Eintritt in OPP35_TO_20.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>Finish-Verteilung OPP35_TO_20</h2>
    ${renderTable(
      ["Kennzahl", "Wert"],
      [
        ["Drives mit Convert aus OPP35_TO_20", String(result.opp35OriginDrives)],
        ["Drives mit Convert + Ursprung/Eintritt OPP35_TO_20", String(result.opp35FinishWindowDrives)],
        ["TOD-Anteil im Finish-Fenster", `${round(result.opp35FinishWindowTodRate, 1)}%`],
        ["Avg Plays nach Eintritt", String(round(result.avgPlaysAfterEntry, 1))],
      ],
    )}
    ${renderTable(["Finish", "Count", "Anteil %"], result.finishRows)}
  </section>
  <section>
    <h2>Convert-Outcomes</h2>
    ${renderTable(["Resolution :: Outcome", "Count", "Anteil %"], result.convertOutcomeRows)}
  </section>
  <section>
    <h2>Beispiel-Drives</h2>
    ${renderTable(["Quarter", "Off", "Ball", "Dist", "Fenster", "Finish", "Plays nach Eintritt", "Result", "Summary"], sampleRows)}
  </section>
  <section>
    <h2>Empfehlung</h2>
    <p>${escapeHtml(recommendation)}</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-opp35-to-20-finish-report-${REPORT_DATE}.html`);
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
        convertedToTodRate: round(result.convertedToTodRate, 1),
        opp35OriginDrives: result.opp35OriginDrives,
        opp35FinishWindowDrives: result.opp35FinishWindowDrives,
        opp35FinishWindowTodRate: round(result.opp35FinishWindowTodRate, 1),
        avgPlaysAfterEntry: round(result.avgPlaysAfterEntry, 1),
      },
      null,
      2,
    )}\n`,
  );
}

main();
