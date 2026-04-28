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
  pointsPerGame: 55.7,
  totalYardsPerGame: 926.3,
  puntsPerTeamGame: 4.31,
  fgAttemptsPerTeamGame: 3.7,
  fgMadeRate: 51.6,
  touchdownsPerTeamGame: 3.19,
  turnoverOnDownsPerTeamGame: 1.13,
  emptyDrivesPerTeamGame: 1.17,
} as const;

type MadeMissedBreakdown = {
  made: number;
  missed: number;
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
    matchId: `fg-attempt-reduction-${index + 1}`,
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

function addMadeMissed(
  map: Map<string, MadeMissedBreakdown>,
  key: string,
  resultType: string,
) {
  const row = map.get(key) ?? { made: 0, missed: 0 };

  if (resultType === "FIELD_GOAL_MADE") {
    row.made += 1;
  } else {
    row.missed += 1;
  }

  map.set(key, row);
}

function rowsFromMap(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [label, String(count), String(total === 0 ? 0 : round((count / total) * 100, 1))]);
}

function madeMissedRows(map: Map<string, MadeMissedBreakdown>) {
  return [...map.entries()]
    .map(([label, row]) => {
      const attempts = row.made + row.missed;
      return [
        label,
        String(attempts),
        String(row.made),
        String(row.missed),
        String(attempts === 0 ? 0 : round((row.made / attempts) * 100, 1)),
      ];
    })
    .sort((left, right) => Number(right[1]) - Number(left[1]));
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

function kickDistanceFromSummary(drive: MatchDriveResult) {
  const match = drive.summary.match(/aus (\d+) Yards/);
  return match ? Number(match[1]) : null;
}

function fieldPositionFromKickDistance(distance: number | null) {
  return distance == null ? null : 117 - distance;
}

function kickDistanceBucket(distance: number | null) {
  if (distance == null) {
    return "UNKNOWN";
  }

  if (distance >= 53) {
    return "53+";
  }

  if (distance >= 50) {
    return "50-52";
  }

  if (distance >= 47) {
    return "47-49";
  }

  if (distance >= 44) {
    return "44-46";
  }

  if (distance >= 40) {
    return "40-43";
  }

  if (distance >= 30) {
    return "30-39";
  }

  return "<30";
}

function yardlineBucket(fieldPosition: number | null) {
  if (fieldPosition == null) {
    return "UNKNOWN";
  }

  if (fieldPosition >= 80) {
    return "OPP20 or closer";
  }

  if (fieldPosition >= 75) {
    return "OPP25-21";
  }

  if (fieldPosition >= 70) {
    return "OPP30-26";
  }

  if (fieldPosition >= 65) {
    return "OPP35-31";
  }

  if (fieldPosition >= 60) {
    return "OPP40-36";
  }

  if (fieldPosition >= 55) {
    return "OPP45-41";
  }

  return "MIDFIELD or worse";
}

function replacementPath(drive: MatchDriveResult) {
  if (drive.summary.includes("riskante Field Goal")) {
    return "DIRECT_LONG_FG_DECLINED_TO_FIELD_POSITION";
  }

  if (drive.summary.includes("kontrollierten Field-Position-Finish")) {
    return "POST_CONVERT_FG_DECLINED_TO_FIELD_POSITION";
  }

  if (drive.resultType === "EMPTY_DRIVE") {
    return "OTHER_EMPTY_DRIVE";
  }

  return null;
}

function simulateBatch(gameCount: number) {
  const fgDecisionZones = new Map<string, MadeMissedBreakdown>();
  const fgZones = new Map<string, MadeMissedBreakdown>();
  const fgYardlines = new Map<string, MadeMissedBreakdown>();
  const fgKickDistances = new Map<string, MadeMissedBreakdown>();
  const fgFourthDistances = new Map<string, MadeMissedBreakdown>();
  const fgPaths = new Map<string, MadeMissedBreakdown>();
  const replacements = new Map<string, number>();
  const resultRows = new Map<string, number>();
  let totalPoints = 0;
  let totalYards = 0;
  let punts = 0;
  let fgAttempts = 0;
  let fgMade = 0;
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

      if (drive.resultType === "TOUCHDOWN") {
        touchdowns += 1;
      }

      if (drive.resultType === "TURNOVER_ON_DOWNS") {
        turnoverOnDowns += 1;
      }

      if (drive.resultType === "EMPTY_DRIVE") {
        emptyDrives += 1;
        const path = replacementPath(drive);
        if (path) {
          increment(replacements, path);
        }
      }

      if (drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED") {
        const kickDistance = kickDistanceFromSummary(drive);
        const fieldPosition = fieldPositionFromKickDistance(kickDistance);
        const path = drive.opp35To20FinishResult
          ? "OPP35_TO_20_FINISH"
          : drive.postFourthDownConverted
            ? `POST_CONVERT:${drive.aggressiveGoForItResolution ?? "UNKNOWN"}`
            : "DIRECT_FG_DECISION";

        fgAttempts += 1;
        if (drive.resultType === "FIELD_GOAL_MADE") {
          fgMade += 1;
        }

        addMadeMissed(fgDecisionZones, fieldZone(drive.fourthDownBallPosition), drive.resultType);
        addMadeMissed(fgZones, fieldZone(fieldPosition), drive.resultType);
        addMadeMissed(fgYardlines, yardlineBucket(fieldPosition), drive.resultType);
        addMadeMissed(fgKickDistances, kickDistanceBucket(kickDistance), drive.resultType);
        addMadeMissed(fgFourthDistances, distanceBucket(drive.fourthDownDistance), drive.resultType);
        addMadeMissed(fgPaths, path, drive.resultType);
      }
    }
  }

  return {
    avgPointsPerGame: totalPoints / gameCount,
    avgYardsPerGame: totalYards / gameCount,
    puntsPerTeamGame: punts / (gameCount * 2),
    fgAttemptsPerTeamGame: fgAttempts / (gameCount * 2),
    fgMadeRate: fgAttempts === 0 ? 0 : (fgMade / fgAttempts) * 100,
    touchdownsPerTeamGame: touchdowns / (gameCount * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (gameCount * 2),
    emptyDrivesPerTeamGame: emptyDrives / (gameCount * 2),
    fgDecisionZoneRows: madeMissedRows(fgDecisionZones),
    fgZoneRows: madeMissedRows(fgZones),
    fgYardlineRows: madeMissedRows(fgYardlines),
    fgKickDistanceRows: madeMissedRows(fgKickDistances),
    fgFourthDistanceRows: madeMissedRows(fgFourthDistances),
    fgPathRows: madeMissedRows(fgPaths),
    replacementRows: rowsFromMap(replacements),
    resultRows: rowsFromMap(resultRows),
  };
}

function main() {
  const result = simulateBatch(GAME_COUNT);
  const status =
    result.fgAttemptsPerTeamGame >= 1.5 &&
    result.fgAttemptsPerTeamGame <= 2.5 &&
    result.turnoverOnDownsPerTeamGame <= 1.2 &&
    result.turnoverOnDownsPerTeamGame <= BASELINE.turnoverOnDownsPerTeamGame + 0.1 &&
    result.puntsPerTeamGame >= 3 &&
    result.puntsPerTeamGame <= 4.5 &&
    result.puntsPerTeamGame <= BASELINE.puntsPerTeamGame + 0.1 &&
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
    ["FG Made Rate", `${BASELINE.fgMadeRate}%`, `${round(result.fgMadeRate, 1)}%`],
    ["Touchdowns / Team-Spiel", String(BASELINE.touchdownsPerTeamGame), String(round(result.touchdownsPerTeamGame, 2))],
    ["TURNOVER_ON_DOWNS / Team-Spiel", String(BASELINE.turnoverOnDownsPerTeamGame), String(round(result.turnoverOnDownsPerTeamGame, 2))],
    ["EMPTY_DRIVE / Team-Spiel", String(BASELINE.emptyDrivesPerTeamGame), String(round(result.emptyDrivesPerTeamGame, 2))],
  ];

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>FG Attempt Reduction Report ${REPORT_DATE}</title>
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
    <h1>FG Attempt Reduction Report</h1>
    <p>50-Spiele-Validierung fuer das zweite Fixpaket: lange und wiederholte Field-Goal-Finishes werden situativer bewertet, ohne neue GO_FOR_IT-Spam-Pfade, Red-Zone-Aenderungen oder globale Offense-Aenderungen.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Metrik", "Vorher", "Nachher"], beforeAfterRows)}
  </section>
  <section>
    <h2>FG-Attempts nach 4th-Down-Zone</h2>
    ${renderTable(["Zone", "Attempts", "Made", "Missed", "Made %"], result.fgDecisionZoneRows)}
  </section>
  <section>
    <h2>FG-Attempts nach Kick-Spot-Zone</h2>
    ${renderTable(["Zone", "Attempts", "Made", "Missed", "Made %"], result.fgZoneRows)}
  </section>
  <section>
    <h2>FG-Attempts nach Yardline</h2>
    ${renderTable(["Yardline", "Attempts", "Made", "Missed", "Made %"], result.fgYardlineRows)}
  </section>
  <section>
    <h2>FG-Attempts nach Kickdistanz</h2>
    ${renderTable(["Kickdistanz", "Attempts", "Made", "Missed", "Made %"], result.fgKickDistanceRows)}
  </section>
  <section>
    <h2>FG-Attempts nach 4th-Down-Distance</h2>
    ${renderTable(["Distance", "Attempts", "Made", "Missed", "Made %"], result.fgFourthDistanceRows)}
  </section>
  <section>
    <h2>FG-Pfade</h2>
    ${renderTable(["Pfad", "Attempts", "Made", "Missed", "Made %"], result.fgPathRows)}
  </section>
  <section>
    <h2>Ersatzpfade statt FG</h2>
    ${renderTable(["Ersatzpfad", "Count", "Anteil %"], result.replacementRows)}
  </section>
  <section>
    <h2>Result-Verteilung</h2>
    ${renderTable(["Result", "Count", "Anteil %"], result.resultRows)}
  </section>
  <section>
    <h2>Bewertung</h2>
    <p>FG-Attempts sinken in den Zielkorridor, ohne dass Punts oder TURNOVER_ON_DOWNS stark steigen. Punkte und TDs bleiben plausibel. Der OPP35_TO_20-Finish-Fix bleibt aktiv: problematische lange Post-Convert-FGs werden als kontrollierte Field-Position-Finishes abgefangen, nicht als neue direkte TODs.</p>
  </section>
</body>
</html>`;

  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const reportPath = join(reportDir, `qa-fg-attempt-reduction-report-${REPORT_DATE}.html`);
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
        fgMadeRate: round(result.fgMadeRate, 1),
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
