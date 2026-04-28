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
  pointsPerGame: 53.6,
  totalYardsPerGame: 936.6,
  puntsPerTeamGame: 5.17,
  fgAttemptsPerTeamGame: 3.81,
  touchdownsPerTeamGame: 2.75,
  turnoverOnDownsPerTeamGame: 1.82,
  directGoForItTodPerTeamGame: 1.32,
  convertedToTodRate: 10.6,
  opp35FinishWindowTodRate: 6.9,
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
    matchId: `direct-go-for-it-${index + 1}`,
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

function rowsFromMap(map: Map<string, number>, limit = 999) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
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
    return "OPP20_PLUS";
  }

  if (fieldPosition >= 65) {
    return "OPP35_TO_20";
  }

  if (fieldPosition >= 55) {
    return "OPP45_TO_35";
  }

  if (fieldPosition >= 50) {
    return "MID_TO_OPP45";
  }

  return "OTHER";
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

function scoreState(delta: number | null) {
  if (delta == null) {
    return "UNKNOWN";
  }

  if (delta > 0) {
    return "LEADING";
  }

  if (delta < 0) {
    return "TRAILING";
  }

  return "TIED";
}

function timeBucket(secondsRemaining: number | null) {
  if (secondsRemaining == null) {
    return "UNKNOWN";
  }

  if (secondsRemaining <= 360) {
    return "LATE";
  }

  if (secondsRemaining <= 1800) {
    return "MIDDLE";
  }

  return "EARLY";
}

function isDirectGoForItTod(drive: MatchDriveResult) {
  return (
    drive.fourthDownDecision === "GO_FOR_IT" &&
    drive.postFourthDownConverted === false &&
    drive.resultType === "TURNOVER_ON_DOWNS"
  );
}

function simulateBatch(gameCount: number) {
  const directTodByZone = new Map<string, number>();
  const directTodDetail = new Map<string, number>();
  const fourthDownDecisionRows = new Map<string, number>();
  const goForItOutcomeRows = new Map<string, number>();
  const opp35FinishRows = new Map<string, number>();
  const samples: MatchDriveResult[] = [];
  let totalPoints = 0;
  let totalYards = 0;
  let punts = 0;
  let fgAttempts = 0;
  let touchdowns = 0;
  let turnoverOnDowns = 0;
  let directGoForItTod = 0;
  let convertedDrives = 0;
  let convertedToTod = 0;
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

      if (drive.fourthDownDecision != null) {
        const zone = fieldZone(drive.fourthDownBallPosition);
        const distance = distanceBucket(drive.fourthDownDistance);
        increment(fourthDownDecisionRows, `${zone} | ${distance} | ${drive.fourthDownDecision}`);

        if (drive.fourthDownDecision === "GO_FOR_IT") {
          increment(
            goForItOutcomeRows,
            `${zone} | ${distance} | ${drive.coachingRiskProfile ?? "UNKNOWN"} | ${drive.aggressiveGoForItResolution ?? "DIRECT"} | ${drive.resultType}`,
          );
        }
      }

      if (drive.postFourthDownConverted) {
        convertedDrives += 1;
        if (drive.resultType === "TURNOVER_ON_DOWNS") {
          convertedToTod += 1;
        }
      }

      if (drive.postConvertOriginatedOpp35To20 || drive.postConvertEnteredOpp35To20) {
        opp35FinishWindowDrives += 1;
        increment(opp35FinishRows, drive.opp35To20FinishResult ?? drive.resultType);
        if (drive.resultType === "TURNOVER_ON_DOWNS") {
          opp35FinishWindowTod += 1;
        }
      }

      if (isDirectGoForItTod(drive)) {
        directGoForItTod += 1;
        const zone = fieldZone(drive.fourthDownBallPosition);
        const distance = distanceBucket(drive.fourthDownDistance);
        increment(directTodByZone, `${zone} | ${distance} | ${drive.coachingRiskProfile ?? "UNKNOWN"}`);
        increment(
          directTodDetail,
          `${zone} | Yard ${drive.fourthDownBallPosition ?? "?"} | ${distance} | ${scoreState(drive.fourthDownScoreDelta)} | ${timeBucket(drive.fourthDownSecondsRemaining)}`,
        );

        if (samples.length < 5) {
          samples.push(drive);
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
    directGoForItTodPerTeamGame: directGoForItTod / (gameCount * 2),
    convertedToTodRate: convertedDrives === 0 ? 0 : (convertedToTod / convertedDrives) * 100,
    opp35FinishWindowTodRate:
      opp35FinishWindowDrives === 0
        ? 0
        : (opp35FinishWindowTod / opp35FinishWindowDrives) * 100,
    directTodRows: rowsFromMap(directTodByZone),
    directTodDetailRows: rowsFromMap(directTodDetail, 12),
    fourthDownDecisionRows: rowsFromMap(fourthDownDecisionRows, 18),
    goForItOutcomeRows: rowsFromMap(goForItOutcomeRows, 18),
    opp35FinishRows: rowsFromMap(opp35FinishRows),
    samples,
  };
}

function main() {
  const result = simulateBatch(GAME_COUNT);
  const status =
    result.turnoverOnDownsPerTeamGame >= 0.5 &&
    result.turnoverOnDownsPerTeamGame <= 1.2 &&
    result.fgAttemptsPerTeamGame >= 1.5 &&
    result.fgAttemptsPerTeamGame <= 2.5 &&
    result.puntsPerTeamGame >= 3 &&
    result.puntsPerTeamGame <= 4.5 &&
    result.touchdownsPerTeamGame >= 2.3 &&
    result.touchdownsPerTeamGame <= 3.2 &&
    result.avgPointsPerGame >= 40 &&
    result.avgPointsPerGame <= 55 &&
    result.opp35FinishWindowTodRate <= 8
      ? "GRUEN"
      : "ROT";

  const beforeAfterRows = [
    ["Punkte / Spiel", String(BASELINE.pointsPerGame), String(round(result.avgPointsPerGame, 1))],
    ["Total Yards / Spiel", String(BASELINE.totalYardsPerGame), String(round(result.avgYardsPerGame, 1))],
    ["Punts / Team-Spiel", String(BASELINE.puntsPerTeamGame), String(round(result.puntsPerTeamGame, 2))],
    ["FG-Attempts / Team-Spiel", String(BASELINE.fgAttemptsPerTeamGame), String(round(result.fgAttemptsPerTeamGame, 2))],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result.touchdownsPerTeamGame, 2))],
    ["TURNOVER_ON_DOWNS / Team-Spiel", String(BASELINE.turnoverOnDownsPerTeamGame), String(round(result.turnoverOnDownsPerTeamGame, 2))],
    ["Direkte GO_FOR_IT -> TOD / Team-Spiel", String(BASELINE.directGoForItTodPerTeamGame), String(round(result.directGoForItTodPerTeamGame, 2))],
    ["CONVERTED -> TOD", `${BASELINE.convertedToTodRate}%`, `${round(result.convertedToTodRate, 1)}%`],
    ["OPP35_TO_20-Finish-TOD", `${BASELINE.opp35FinishWindowTodRate}%`, `${round(result.opp35FinishWindowTodRate, 1)}%`],
  ];

  const sampleRows = result.samples.map((drive) => [
    drive.phaseLabel,
    drive.offenseTeamAbbreviation,
    fieldZone(drive.fourthDownBallPosition),
    String(drive.fourthDownBallPosition ?? ""),
    String(drive.fourthDownDistance ?? ""),
    drive.coachingRiskProfile ?? "",
    scoreState(drive.fourthDownScoreDelta),
    timeBucket(drive.fourthDownSecondsRemaining),
    drive.resultType,
    drive.summary,
  ]);

  const recommendation =
    result.turnoverOnDownsPerTeamGame <= 1.2
      ? "Direkte GO_FOR_IT-TODs sind im Zielkorridor. Danach sollten FG- und Punt-Volumen getrennt ueber Drive-Anzahl oder Long-FG-Auswahl kalibriert werden."
      : "Direkte GO_FOR_IT-TODs sind deutlich reduziert, aber Gesamt-TOD liegt noch knapp ueber Ziel. Naechster Schritt: OPP45_TO_35 4th&1-2 weiter coach-/scoreabhaengig absichern, ohne zusaetzliche FG-Pfade zu oeffnen.";

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Direct GO_FOR_IT TOD Report ${REPORT_DATE}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 28px; color: #202a25; background: #f4efe4; }
    section { background: #fffdf8; border: 1px solid #ded4c6; border-radius: 18px; padding: 18px 20px; margin-bottom: 16px; }
    h1, h2 { margin: 0 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 9px 10px; border-bottom: 1px solid #e3dacd; vertical-align: top; }
    th { background: #ece0cf; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
    .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .green { background: #dcfce7; color: #166534; }
    .red { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <section>
    <h1>Direct GO_FOR_IT TOD Report</h1>
    <p>50-Spiele-Validierung fuer direkte fehlgeschlagene GO_FOR_IT-Entscheidungen in OPP45_TO_35 und OPP35_TO_20.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>Direkte GO_FOR_IT -> TOD Analyse</h2>
    ${renderTable(["Zone | Distanz | Coach", "Count", "Anteil %"], result.directTodRows)}
    ${renderTable(["Detail", "Count", "Anteil %"], result.directTodDetailRows)}
  </section>
  <section>
    <h2>4th-Down-Entscheidungen</h2>
    ${renderTable(["Zone | Distanz | Decision", "Count", "Anteil %"], result.fourthDownDecisionRows)}
  </section>
  <section>
    <h2>GO_FOR_IT Outcomes</h2>
    ${renderTable(["Zone | Distanz | Coach | Resolution | Result", "Count", "Anteil %"], result.goForItOutcomeRows)}
  </section>
  <section>
    <h2>OPP35_TO_20 Finish-Kontrolle</h2>
    <p>TOD im Finish-Fenster: ${round(result.opp35FinishWindowTodRate, 1)}%.</p>
    ${renderTable(["Finish", "Count", "Anteil %"], result.opp35FinishRows)}
  </section>
  <section>
    <h2>Beispiel-Drives</h2>
    ${renderTable(["Quarter", "Off", "Zone", "Ball", "Dist", "Coach", "Score", "Time", "Result", "Summary"], sampleRows)}
  </section>
  <section>
    <h2>Empfehlung</h2>
    <p>${escapeHtml(recommendation)}</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-direct-go-for-it-report-${REPORT_DATE}.html`);
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
        directGoForItTodPerTeamGame: round(result.directGoForItTodPerTeamGame, 2),
        convertedToTodRate: round(result.convertedToTodRate, 1),
        opp35FinishWindowTodRate: round(result.opp35FinishWindowTodRate, 1),
      },
      null,
      2,
    )}\n`,
  );
}

main();
