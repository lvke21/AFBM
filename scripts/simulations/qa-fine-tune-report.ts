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
  puntsPerTeamGame: 3.91,
  fgAttemptsPerTeamGame: 2.14,
  touchdownsPerTeamGame: 3.14,
  pointsPerGame: 52.4,
  totalYardsPerGame: 1042.4,
  turnoverOnDownsPerTeamGame: 3.57,
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
    matchId: `fine-tune-match-${index + 1}`,
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: `fine-tune-seed-${index + 1}`,
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

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function distributionRows(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(total === 0 ? 0 : round((count / total) * 100, 1))]);
}

function yardZoneLabel(drive: MatchDriveResult) {
  const start = drive.startFieldPosition ?? 0;
  const peak = drive.highestReachedFieldPosition ?? 0;

  if (start >= 20 && peak < 55) {
    return "OWN20_TO_OPP45";
  }

  if (peak >= 55 && peak < 80) {
    return "PLUS_TERRITORY";
  }

  if (peak >= 80) {
    return "RED_ZONE";
  }

  return "BACKED_UP";
}

function isHurryOrGarbage(drive: MatchDriveResult) {
  const scoreDelta = Math.abs((drive.startedHomeScore ?? 0) - (drive.startedAwayScore ?? 0));
  return (drive.startSecondsRemainingInGame ?? 3600) <= 180 || ((drive.startSecondsRemainingInGame ?? 3600) <= 900 && scoreDelta >= 17);
}

function simulateBatch(gameCount: number) {
  const driveEnds = new Map<string, number>();
  const goForItFollow = new Map<string, number>();
  const todZones = new Map<string, number>();
  const yardZones = new Map<string, number[]>();
  const sampleDrives: MatchDriveResult[] = [];
  const yardsPerDrive: number[] = [];
  const playsPerDrive: number[] = [];
  const yardsPerPlay: number[] = [];
  const startFieldPositions: number[] = [];
  const postConvertYards: number[] = [];
  const plusTerritoryYards: number[] = [];
  const midfieldYards: number[] = [];
  const hurryYards: number[] = [];
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
      increment(driveEnds, drive.resultType);
      yardsPerDrive.push(drive.totalYards);
      playsPerDrive.push(drive.plays);
      yardsPerPlay.push(drive.plays > 0 ? drive.totalYards / drive.plays : 0);
      startFieldPositions.push(drive.startFieldPosition ?? 0);
      const zone = yardZoneLabel(drive);
      const zoneValues = yardZones.get(zone) ?? [];
      zoneValues.push(drive.totalYards);
      yardZones.set(zone, zoneValues);

      if ((drive.highestReachedFieldPosition ?? 0) >= 55) {
        plusTerritoryYards.push(drive.totalYards);
      }

      if ((drive.startFieldPosition ?? 0) >= 20 && (drive.highestReachedFieldPosition ?? 0) < 55) {
        midfieldYards.push(drive.totalYards);
      }

      if (isHurryOrGarbage(drive)) {
        hurryYards.push(drive.totalYards);
      }

      if (drive.postFourthDownConverted) {
        increment(goForItFollow, drive.resultType);
        if ((drive.postFourthDownYards ?? 0) > 0) {
          postConvertYards.push(drive.postFourthDownYards ?? 0);
        }
      }

      if (drive.resultType === "TURNOVER_ON_DOWNS") {
        turnoverOnDowns += 1;
        const peak = drive.highestReachedFieldPosition ?? drive.fourthDownBallPosition ?? 0;
        const zoneLabel =
          peak >= 80 ? "RED_ZONE_20" : peak >= 65 ? "OPP35_TO_20" : peak >= 55 ? "OPP45_TO_35" : "OUTSIDE_PLUS";
        increment(todZones, zoneLabel);
      }

      if (sampleDrives.length < 5 && (
        drive.resultType === "TURNOVER_ON_DOWNS" ||
        (drive.postFourthDownConverted && drive.resultType !== "TOUCHDOWN")
      )) {
        sampleDrives.push(drive);
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
    }
  }

  return {
    avgPointsPerGame: totalPoints / gameCount,
    avgYardsPerGame: totalYards / gameCount,
    puntsPerTeamGame: punts / (gameCount * 2),
    fgAttemptsPerTeamGame: fgAttempts / (gameCount * 2),
    touchdownsPerTeamGame: touchdowns / (gameCount * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (gameCount * 2),
    avgYardsPerDrive: average(yardsPerDrive),
    avgPlaysPerDrive: average(playsPerDrive),
    avgYardsPerPlay: average(yardsPerPlay),
    avgStartFieldPosition: average(startFieldPositions),
    avgPostConvertYards: average(postConvertYards),
    avgPlusTerritoryYards: average(plusTerritoryYards),
    avgMidfieldYards: average(midfieldYards),
    avgHurryYards: average(hurryYards),
    driveEnds: distributionRows(driveEnds),
    goForItFollowRows: distributionRows(goForItFollow),
    todZoneRows: distributionRows(todZones),
    yardZoneRows: [...yardZones.entries()]
      .map(([label, values]) => [label, String(values.length), String(round(average(values), 1))])
      .sort((left, right) => Number(right[2]) - Number(left[2])),
    sampleDrives,
  };
}

function plausible(result: ReturnType<typeof simulateBatch>) {
  return (
    result.puntsPerTeamGame >= 3 &&
    result.puntsPerTeamGame <= 4.5 &&
    result.fgAttemptsPerTeamGame >= 1 &&
    result.fgAttemptsPerTeamGame <= 2.5 &&
    result.touchdownsPerTeamGame >= 2 &&
    result.touchdownsPerTeamGame <= 3.5 &&
    result.avgPointsPerGame >= 40 &&
    result.avgPointsPerGame <= 55 &&
    result.avgYardsPerGame <= 850 &&
    result.turnoverOnDownsPerTeamGame <= 1.5
  );
}

function main() {
  const result50 = simulateBatch(GAME_COUNT);
  const status50 = plausible(result50) ? "GRUEN" : "ROT";
  const result100 = status50 === "GRUEN" ? simulateBatch(OPTIONAL_GAME_COUNT) : null;

  const beforeAfterRows = [
    ["Punts / Team-Spiel", String(BASELINE.puntsPerTeamGame), String(round(result50.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(BASELINE.fgAttemptsPerTeamGame), String(round(result50.fgAttemptsPerTeamGame, 2))],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result50.touchdownsPerTeamGame, 2))],
    ["Punkte / Spiel", String(BASELINE.pointsPerGame), String(round(result50.avgPointsPerGame, 1))],
    ["Total Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result50.avgYardsPerGame, 1))],
    ["Turnover on Downs / Team-Spiel", String(BASELINE.turnoverOnDownsPerTeamGame), String(round(result50.turnoverOnDownsPerTeamGame, 2))],
  ];

  const yardSourceRows = [
    ["Yards / Drive", String(round(result50.avgYardsPerDrive, 1))],
    ["Plays / Drive", String(round(result50.avgPlaysPerDrive, 1))],
    ["Yards / Play", String(round(result50.avgYardsPerPlay, 2))],
    ["Start Field Position", String(round(result50.avgStartFieldPosition, 1))],
    ["Yards nach 4th-Convert", String(round(result50.avgPostConvertYards, 1))],
    ["Yards in Plus Territory", String(round(result50.avgPlusTerritoryYards, 1))],
    ["Yards Own20 bis Opp45", String(round(result50.avgMidfieldYards, 1))],
    ["Yards Hurry/Garbage", String(round(result50.avgHurryYards, 1))],
  ];

  const sampleRows = result50.sampleDrives.map((drive) => [
    drive.phaseLabel,
    drive.offenseTeamAbbreviation,
    String(drive.startFieldPosition ?? ""),
    String(drive.highestReachedFieldPosition ?? ""),
    String(drive.totalYards),
    drive.fourthDownDecision ?? "",
    String(drive.postFourthDownConverted ?? ""),
    String(drive.postFourthDownYards ?? ""),
    drive.resultType,
    drive.summary,
  ]);

  const recommendation =
    result50.avgYardsPerGame > 850
      ? "Als naechstes sollte die Kopplung zwischen Feldpositionsfortschritt und Stat-Yards im Mittelfeld weiter gestrafft werden, ohne die Terminal-Zone erneut aggressiver zu machen."
      : result50.turnoverOnDownsPerTeamGame > 1.5
        ? "Als naechstes sollte die Folgezone nach erfolgreichem GO_FOR_IT weiter beruhigt werden, vor allem fuer 4th & short zwischen gegnerischer 35 und 20."
        : "Die Feinjustierung ist plausibel; als naechstes kann der 100-Spiele-Lauf als Stabilitaetscheck folgen.";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Fine Tune Report ${REPORT_DATE}</title>
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
    <h1>Fine Tune Report</h1>
    <p>50-Spiele-Validierung nach Feinjustierung von Yard-Quellen und GO_FOR_IT-Folgezone.</p>
    <p><span class="pill ${status50 === "GRUEN" ? "green" : "red"}">${status50}</span></p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>Yards-Quellenanalyse</h2>
    ${renderTable(["Kennzahl", "Wert"], yardSourceRows)}
    ${renderTable(["Zone", "Drives", "Avg Yards"], result50.yardZoneRows)}
  </section>
  <section>
    <h2>Drive-End-Verteilung</h2>
    ${renderTable(["Result", "Count", "Anteil %"], result50.driveEnds)}
  </section>
  <section>
    <h2>GO_FOR_IT-Folgeanalyse</h2>
    ${renderTable(["Result nach erfolgreichem Convert", "Count", "Anteil %"], result50.goForItFollowRows)}
  </section>
  <section>
    <h2>Turnover-on-Downs nach Feldzone</h2>
    ${renderTable(["Zone", "Count", "Anteil %"], result50.todZoneRows)}
  </section>
  <section>
    <h2>Beispiel-Drives</h2>
    ${renderTable(["Quarter", "Off", "Start", "Peak", "Yards", "Decision", "Converted", "Post-Convert Yards", "Result", "Summary"], sampleRows)}
  </section>
  <section>
    <h2>Empfehlung</h2>
    <p>${escapeHtml(recommendation)}</p>
  </section>
  ${
    result100
      ? `<section><h2>Optionaler 100-Spiele-Lauf</h2><p>Punts/Team-Spiel: ${escapeHtml(round(result100.puntsPerTeamGame, 2))}, FG-Attempts/Team-Spiel: ${escapeHtml(round(result100.fgAttemptsPerTeamGame, 2))}, TD/Team-Spiel: ${escapeHtml(round(result100.touchdownsPerTeamGame, 2))}, Punkte/Spiel: ${escapeHtml(round(result100.avgPointsPerGame, 1))}, Total Yards/Spiel: ${escapeHtml(round(result100.avgYardsPerGame, 1))}, TOD/Team-Spiel: ${escapeHtml(round(result100.turnoverOnDownsPerTeamGame, 2))}.</p></section>`
      : ""
  }
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-fine-tune-report-${REPORT_DATE}.html`);
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
        avgYardsPerDrive: round(result50.avgYardsPerDrive, 1),
        avgYardsPerPlay: round(result50.avgYardsPerPlay, 2),
        avgPostConvertYards: round(result50.avgPostConvertYards, 1),
        ranOptional100: Boolean(result100),
      },
      null,
      2,
    )}\n`,
  );
}

main();
