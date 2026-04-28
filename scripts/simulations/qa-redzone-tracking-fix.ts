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

const GAME_COUNT = 100;
const REPORT_FILE_NAME = "qa-redzone-tracking-fix.html";
const TARGET_RED_ZONE_TD_RATE = [50, 65] as const;

const BEFORE_REFERENCE = {
  source: "qa-final-100-game-balance-report-2026-04-24.html",
  games: 100,
  redZoneTripsPerTeamGame: 1.65,
  redZoneTdRate: 16.1,
};

type RedZoneAudit = {
  games: number;
  pointsPerGame: number;
  touchdownsPerTeamGame: number;
  totalYardsPerGame: number;
  redZoneTripsPerTeamGame: number;
  redZoneTdRate: number;
  teamRedZoneTrips: number;
  teamRedZoneTouchdowns: number;
  driveRedZoneTrips: number;
  driveRedZoneTouchdowns: number;
  insideRedZoneTouchdownsWithoutTrip: number;
  outsideRedZoneTouchdowns: number;
  redZoneTripsBelowOpp20: number;
  resultRows: string[][];
  exampleRows: string[][];
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
    matchId: `red-zone-tracking-fix-${index + 1}`,
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

function inRange(value: number, [min, max]: readonly [number, number]) {
  return value >= min && value <= max;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function rowsFromMap(map: Map<string, number>) {
  const total = [...map.values()].reduce((sum, count) => sum + count, 0);
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => [
      label,
      String(count),
      total === 0 ? "0" : String(round((count / total) * 100, 1)),
    ]);
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
    touchdowns: result.homeTeam.touchdowns + result.awayTeam.touchdowns,
    totalYards: result.homeTeam.totalYards + result.awayTeam.totalYards,
    redZoneTrips: result.homeTeam.redZoneTrips + result.awayTeam.redZoneTrips,
    redZoneTouchdowns:
      result.homeTeam.redZoneTouchdowns + result.awayTeam.redZoneTouchdowns,
  };
}

function exampleRow(gameIndex: number, drive: MatchDriveResult, reason: string) {
  return [
    String(gameIndex + 1),
    String(drive.sequence),
    drive.offenseTeamAbbreviation,
    drive.resultType,
    String(drive.startFieldPosition ?? "-"),
    String(drive.highestReachedFieldPosition ?? "-"),
    drive.opp35To20FinishResult ?? "-",
    reason,
    drive.summary,
  ];
}

function simulateAudit(): RedZoneAudit {
  const resultTypes = new Map<string, number>();
  const touchdownExamples: string[][] = [];
  const finishWindowExamples: string[][] = [];
  let totalPoints = 0;
  let totalTouchdowns = 0;
  let totalYards = 0;
  let teamRedZoneTrips = 0;
  let teamRedZoneTouchdowns = 0;
  let driveRedZoneTrips = 0;
  let driveRedZoneTouchdowns = 0;
  let insideRedZoneTouchdownsWithoutTrip = 0;
  let outsideRedZoneTouchdowns = 0;
  let redZoneTripsBelowOpp20 = 0;

  for (let index = 0; index < GAME_COUNT; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    const teamTotals = collectTeamTotals(result);
    totalPoints += teamTotals.points;
    totalTouchdowns += teamTotals.touchdowns;
    totalYards += teamTotals.totalYards;
    teamRedZoneTrips += teamTotals.redZoneTrips;
    teamRedZoneTouchdowns += teamTotals.redZoneTouchdowns;

    for (const drive of result.drives) {
      increment(resultTypes, drive.resultType);

      if (
        drive.resultType === "TOUCHDOWN" &&
        (drive.highestReachedFieldPosition ?? 0) >= 80 &&
        !drive.redZoneTrip
      ) {
        insideRedZoneTouchdownsWithoutTrip += 1;
      }

      if (
        drive.resultType === "TOUCHDOWN" &&
        (drive.highestReachedFieldPosition ?? 0) < 80
      ) {
        outsideRedZoneTouchdowns += 1;
      }

      if (drive.redZoneTrip) {
        driveRedZoneTrips += 1;

        if ((drive.highestReachedFieldPosition ?? 0) < 80) {
          redZoneTripsBelowOpp20 += 1;
        }

        if (drive.resultType === "TOUCHDOWN") {
          driveRedZoneTouchdowns += 1;
        }
      }

      if (
        drive.resultType === "TOUCHDOWN" &&
        drive.redZoneTrip &&
        touchdownExamples.length < 3
      ) {
        touchdownExamples.push(
          exampleRow(
            index,
            drive,
            "TD nach OPP20-Eintritt wird nun als Red-Zone-TD gefuehrt.",
          ),
        );
      }

      if (
        drive.resultType === "TOUCHDOWN" &&
        !drive.redZoneTrip &&
        finishWindowExamples.length < 2
      ) {
        finishWindowExamples.push(
          exampleRow(
            index,
            drive,
            "Big-Play-/Finish-TD ausserhalb OPP20 bleibt korrekt kein Red-Zone-Trip.",
          ),
        );
      }
    }
  }

  return {
    games: GAME_COUNT,
    pointsPerGame: totalPoints / GAME_COUNT,
    touchdownsPerTeamGame: totalTouchdowns / (GAME_COUNT * 2),
    totalYardsPerGame: totalYards / GAME_COUNT,
    redZoneTripsPerTeamGame: teamRedZoneTrips / (GAME_COUNT * 2),
    redZoneTdRate:
      teamRedZoneTrips === 0 ? 0 : (teamRedZoneTouchdowns / teamRedZoneTrips) * 100,
    teamRedZoneTrips,
    teamRedZoneTouchdowns,
    driveRedZoneTrips,
    driveRedZoneTouchdowns,
    insideRedZoneTouchdownsWithoutTrip,
    outsideRedZoneTouchdowns,
    redZoneTripsBelowOpp20,
    resultRows: rowsFromMap(resultTypes),
    exampleRows: [...touchdownExamples, ...finishWindowExamples].slice(0, 5),
  };
}

function main() {
  const audit = simulateAudit();
  const teamDriveConsistent =
    audit.teamRedZoneTrips === audit.driveRedZoneTrips &&
    audit.teamRedZoneTouchdowns === audit.driveRedZoneTouchdowns;
  const redZoneRatePlausible = inRange(audit.redZoneTdRate, TARGET_RED_ZONE_TD_RATE);
  const noMissingTouchdowns = audit.insideRedZoneTouchdownsWithoutTrip === 0;
  const noPositionInconsistencies = audit.redZoneTripsBelowOpp20 === 0;
  const status =
    teamDriveConsistent &&
    redZoneRatePlausible &&
    noMissingTouchdowns &&
    noPositionInconsistencies
      ? "GRUEN"
      : "ROT";
  const beforeAfterRows = [
    [
      "Vorher",
      BEFORE_REFERENCE.source,
      String(BEFORE_REFERENCE.games),
      String(BEFORE_REFERENCE.redZoneTripsPerTeamGame),
      `${BEFORE_REFERENCE.redZoneTdRate}%`,
    ],
    [
      "Nachher",
      "Aktuelle Engine nach Tracking-Fix",
      String(audit.games),
      String(round(audit.redZoneTripsPerTeamGame, 2)),
      `${round(audit.redZoneTdRate, 1)}%`,
    ],
  ];
  const consistencyRows = [
    ["Team Red-Zone Trips", String(audit.teamRedZoneTrips)],
    ["Drive Red-Zone Trips", String(audit.driveRedZoneTrips)],
    ["Team Red-Zone TDs", String(audit.teamRedZoneTouchdowns)],
    ["Drive Red-Zone TDs", String(audit.driveRedZoneTouchdowns)],
    ["TDs aus OPP20 ohne Red-Zone-Trip", String(audit.insideRedZoneTouchdownsWithoutTrip)],
    ["TDs ausserhalb OPP20 korrekt nicht als RZ", String(audit.outsideRedZoneTouchdowns)],
    ["Red-Zone-Trips mit Highest FP < 80", String(audit.redZoneTripsBelowOpp20)],
  ];
  const coreRows = [
    ["Punkte / Spiel", String(round(audit.pointsPerGame, 1))],
    ["TDs / Team-Spiel", String(round(audit.touchdownsPerTeamGame, 2))],
    ["Total Yards / Spiel", String(round(audit.totalYardsPerGame, 1))],
    ["Red-Zone Trips / Team-Spiel", String(round(audit.redZoneTripsPerTeamGame, 2))],
    ["Red-Zone TD Rate", `${round(audit.redZoneTdRate, 1)}%`],
  ];
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>QA Red-Zone Tracking Fix</title>
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
    <h1>QA Red-Zone Tracking Fix</h1>
    <p>100-Spiele-Audit fuer die einheitliche Definition: Red-Zone-Trip = jedes Betreten der gegnerischen 20. TDs zaehlen als Red-Zone-TD, wenn der Drive vor dem Score OPP20 erreicht hat; reine Big-Play-TDs von ausserhalb werden nicht kuenstlich als Trip gezaehlt.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Tracking-Aenderung</h2>
    <p class="note">Vorher wurden Red-Zone-Trips an mehreren Ergebniszweigen inkonsistent inkrementiert. Jetzt wird am Drive-Ende genau einmal entschieden: hoechste erreichte Feldposition ab OPP20. Dadurch zaehlen TDs aus dieser Zone, waehrend lange TDs von ausserhalb nicht als Red-Zone-Trip in den Nenner geraten.</p>
  </section>
  <section>
    <h2>Vorher / Nachher</h2>
    ${renderTable(["Phase", "Quelle", "Spiele", "RZ Trips / Team-Spiel", "RZ TD Rate"], beforeAfterRows)}
  </section>
  <section>
    <h2>Kernmetriken</h2>
    ${renderTable(["Metrik", "Wert"], coreRows)}
  </section>
  <section>
    <h2>Konsistenzpruefung</h2>
    ${renderTable(["Check", "Wert"], consistencyRows)}
  </section>
  <section>
    <h2>Drive-End-Verteilung</h2>
    ${renderTable(["Result", "Count", "Anteil %"], audit.resultRows)}
  </section>
  <section>
    <h2>Beispiele korrigierter Drives</h2>
    ${renderTable(["Game", "Seq", "Off", "Result", "Start FP", "Highest FP", "Finish Window", "Korrektur", "Summary"], audit.exampleRows)}
  </section>
  <section>
    <h2>Bewertung</h2>
    <p>${status === "GRUEN" ? "GRUEN: Red-Zone-TD-Rate ist plausibel, Team- und Drive-Stats sind konsistent, TDs aus OPP20 fallen nicht mehr aus der Red-Zone-Zuordnung, und es gibt keine Doppelzaehlung." : "ROT: Mindestens ein Red-Zone-Tracking-Check ist weiterhin auffaellig."}</p>
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
        games: audit.games,
        redZoneTripsPerTeamGame: round(audit.redZoneTripsPerTeamGame, 2),
        redZoneTdRate: round(audit.redZoneTdRate, 1),
        teamDriveConsistent,
        insideRedZoneTouchdownsWithoutTrip: audit.insideRedZoneTouchdownsWithoutTrip,
        outsideRedZoneTouchdowns: audit.outsideRedZoneTouchdowns,
        redZoneTripsBelowOpp20: audit.redZoneTripsBelowOpp20,
      },
      null,
      2,
    )}\n`,
  );
}

main();
