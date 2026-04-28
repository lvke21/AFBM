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
const REPORT_FILE_NAME = "qa-edge-case-behaviour.html";

const BASELINE = {
  label: "Coach Behaviour Baseline",
  pointsPerGame: 45.8,
  totalYardsPerGame: 825.1,
  touchdownsPerTeamGame: 2.89,
  puntsPerTeamGame: 4.55,
  fgAttemptsPerTeamGame: 1.82,
  turnoverOnDownsPerTeamGame: 0.97,
  playsPerDrive: 6.38,
};

type EdgeKey =
  | "kneelDown"
  | "clockKill"
  | "twoMinute"
  | "garbageTime"
  | "endgameFg"
  | "endgameTdNeed"
  | "blowoutRiskOff";

type EdgeCounters = Record<EdgeKey, number>;

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
    matchId: `edge-case-behaviour-${index + 1}`,
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
    top:
      result.homeTeam.timeOfPossessionSeconds +
      result.awayTeam.timeOfPossessionSeconds,
  };
}

function createEdgeCounters(): EdgeCounters {
  return {
    kneelDown: 0,
    clockKill: 0,
    twoMinute: 0,
    garbageTime: 0,
    endgameFg: 0,
    endgameTdNeed: 0,
    blowoutRiskOff: 0,
  };
}

function detectEdges(summary: string) {
  return {
    kneelDown: summary.includes("Victory Formation"),
    clockKill: summary.includes("Clock Kill"),
    twoMinute: summary.includes("2-Minute Drill"),
    garbageTime: summary.includes("Garbage Time"),
    endgameFg: summary.includes("Endgame FG"),
    endgameTdNeed: summary.includes("Endgame TD-Need"),
    blowoutRiskOff: summary.includes("Blowout Risk-Off"),
  };
}

function exampleRow(gameIndex: number, drive: MatchDriveResult, label: string) {
  return [
    String(gameIndex + 1),
    String(drive.sequence),
    drive.phaseLabel,
    drive.offenseTeamAbbreviation,
    label,
    drive.resultType,
    String(drive.startedHomeScore),
    String(drive.startedAwayScore),
    String(drive.startSecondsRemainingInGame ?? "-"),
    drive.summary,
  ];
}

function simulateBatch() {
  const edges = createEdgeCounters();
  const examples: string[][] = [];
  let points = 0;
  let yards = 0;
  let drives = 0;
  let plays = 0;
  let touchdowns = 0;
  let punts = 0;
  let fgAttempts = 0;
  let turnoverOnDowns = 0;
  let topMismatch = 0;

  for (let index = 0; index < GAME_COUNT; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    const totals = collectTeamTotals(result);
    points += totals.points;
    yards += totals.yards;

    if (totals.top !== 3600) {
      topMismatch += 1;
    }

    for (const drive of result.drives) {
      drives += 1;
      plays += drive.plays;

      if (drive.resultType === "TOUCHDOWN") {
        touchdowns += 1;
      } else if (drive.resultType === "PUNT") {
        punts += 1;
      } else if (drive.resultType === "FIELD_GOAL_MADE" || drive.resultType === "FIELD_GOAL_MISSED") {
        fgAttempts += 1;
      } else if (drive.resultType === "TURNOVER_ON_DOWNS") {
        turnoverOnDowns += 1;
      }

      const detected = detectEdges(drive.summary);
      for (const [key, active] of Object.entries(detected) as Array<[EdgeKey, boolean]>) {
        if (active) {
          edges[key] += 1;

          if (examples.length < 8) {
            examples.push(exampleRow(index, drive, key));
          }
        }
      }
    }
  }

  return {
    pointsPerGame: points / GAME_COUNT,
    totalYardsPerGame: yards / GAME_COUNT,
    touchdownsPerTeamGame: touchdowns / (GAME_COUNT * 2),
    puntsPerTeamGame: punts / (GAME_COUNT * 2),
    fgAttemptsPerTeamGame: fgAttempts / (GAME_COUNT * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (GAME_COUNT * 2),
    playsPerDrive: plays / Math.max(drives, 1),
    drivesPerGame: drives / GAME_COUNT,
    topMismatch,
    edges,
    examples,
  };
}

function delta(after: number, before: number, digits = 2) {
  const value = round(after - before, digits);
  return value > 0 ? `+${value}` : String(value);
}

function main() {
  const result = simulateBatch();
  const statsStable =
    Math.abs(result.pointsPerGame - BASELINE.pointsPerGame) <= 3 &&
    Math.abs(result.totalYardsPerGame - BASELINE.totalYardsPerGame) <= 35 &&
    Math.abs(result.touchdownsPerTeamGame - BASELINE.touchdownsPerTeamGame) <= 0.25 &&
    Math.abs(result.puntsPerTeamGame - BASELINE.puntsPerTeamGame) <= 0.3 &&
    Math.abs(result.fgAttemptsPerTeamGame - BASELINE.fgAttemptsPerTeamGame) <= 0.25 &&
    Math.abs(result.turnoverOnDownsPerTeamGame - BASELINE.turnoverOnDownsPerTeamGame) <= 0.25 &&
    Math.abs(result.playsPerDrive - BASELINE.playsPerDrive) <= 0.2;
  const behaviourImproved =
    result.edges.kneelDown > 0 &&
    result.edges.clockKill > 0 &&
    result.edges.twoMinute > 0 &&
    result.edges.garbageTime > 0 &&
    result.edges.endgameTdNeed > 0 &&
    result.edges.blowoutRiskOff > 0;
  const clockConsistent = result.topMismatch === 0;
  const status = statsStable && behaviourImproved && clockConsistent ? "GRUEN" : "ROT";
  const metricRows = [
    ["Punkte / Spiel", String(round(BASELINE.pointsPerGame, 1)), String(round(result.pointsPerGame, 1)), delta(result.pointsPerGame, BASELINE.pointsPerGame, 1)],
    ["Total Yards / Spiel", String(round(BASELINE.totalYardsPerGame, 1)), String(round(result.totalYardsPerGame, 1)), delta(result.totalYardsPerGame, BASELINE.totalYardsPerGame, 1)],
    ["TDs / Team-Spiel", String(round(BASELINE.touchdownsPerTeamGame, 2)), String(round(result.touchdownsPerTeamGame, 2)), delta(result.touchdownsPerTeamGame, BASELINE.touchdownsPerTeamGame)],
    ["Punts / Team-Spiel", String(round(BASELINE.puntsPerTeamGame, 2)), String(round(result.puntsPerTeamGame, 2)), delta(result.puntsPerTeamGame, BASELINE.puntsPerTeamGame)],
    ["FG-Attempts / Team-Spiel", String(round(BASELINE.fgAttemptsPerTeamGame, 2)), String(round(result.fgAttemptsPerTeamGame, 2)), delta(result.fgAttemptsPerTeamGame, BASELINE.fgAttemptsPerTeamGame)],
    ["TOD / Team-Spiel", String(round(BASELINE.turnoverOnDownsPerTeamGame, 2)), String(round(result.turnoverOnDownsPerTeamGame, 2)), delta(result.turnoverOnDownsPerTeamGame, BASELINE.turnoverOnDownsPerTeamGame)],
    ["Plays / Drive", String(round(BASELINE.playsPerDrive, 2)), String(round(result.playsPerDrive, 2)), delta(result.playsPerDrive, BASELINE.playsPerDrive)],
  ];
  const edgeRows = [
    ["Kneel Downs", String(result.edges.kneelDown)],
    ["Clock Kill Drives", String(result.edges.clockKill)],
    ["2-Minute Drill", String(result.edges.twoMinute)],
    ["Garbage Time konservativ", String(result.edges.garbageTime)],
    ["Endgame FG statt TD-Jagd", String(result.edges.endgameFg)],
    ["Endgame TD-Need", String(result.edges.endgameTdNeed)],
    ["Blowout Risk-Off", String(result.edges.blowoutRiskOff)],
  ];
  const statusRows = [
    ["Verhalten realistischer", behaviourImproved ? "GRUEN" : "ROT"],
    ["Stats unveraendert/stabil", statsStable ? "GRUEN" : "ROT"],
    ["Clock/TOP konsistent", clockConsistent ? "GRUEN" : "ROT"],
  ];
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>QA Edge Case Behaviour</title>
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
    <h1>QA Edge Case Behaviour</h1>
    <p>100-Spiele-Audit fuer situative Endgame- und Blowout-Details ohne globale Balance-Verschiebung.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Technische Aenderung</h2>
    <p class="note">Ergaenzt wurden Victory-Formation-Kneels, Clock-Kill-Clock-Modus, Two-Minute-Drill-Clock-Modus, Garbage-Time-Risk-Off, Endgame-FG/TD-Need-Entscheidungen und Blowout-Risk-Off. Die normalen Drive-Physik- und Yardage-Verteilungen bleiben unveraendert.</p>
  </section>
  <section>
    <h2>Stats Stabilitaet</h2>
    ${renderTable(["Metrik", "Baseline", "Nachher", "Delta"], metricRows)}
  </section>
  <section>
    <h2>Edge-Case Counts</h2>
    ${renderTable(["Edge Case", "Count"], edgeRows)}
  </section>
  <section>
    <h2>Statuspruefung</h2>
    ${renderTable(["Check", "Status"], statusRows)}
  </section>
  <section>
    <h2>Beispiel-Drives</h2>
    ${renderTable(["Game", "Seq", "Q", "Off", "Edge", "Result", "Home Start", "Away Start", "Sek. Start", "Summary"], result.examples)}
  </section>
  <section>
    <h2>Bewertung</h2>
    <p>${status === "GRUEN" ? "GRUEN: Edge-Case-Verhalten ist sichtbar realistischer, Kernstats bleiben stabil und Clock/TOP bleibt konsistent." : "ROT: Edge-Case-Verhalten oder Statistikstabilitaet ist noch nicht ausreichend."}</p>
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
        pointsPerGame: round(result.pointsPerGame, 1),
        totalYardsPerGame: round(result.totalYardsPerGame, 1),
        touchdownsPerTeamGame: round(result.touchdownsPerTeamGame, 2),
        puntsPerTeamGame: round(result.puntsPerTeamGame, 2),
        fgAttemptsPerTeamGame: round(result.fgAttemptsPerTeamGame, 2),
        turnoverOnDownsPerTeamGame: round(result.turnoverOnDownsPerTeamGame, 2),
        playsPerDrive: round(result.playsPerDrive, 2),
        topMismatch: result.topMismatch,
        edges: result.edges,
      },
      null,
      2,
    )}\n`,
  );
}

main();
