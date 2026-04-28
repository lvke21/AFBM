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
const REPORT_FILE_NAME = "qa-coach-behaviour.html";

const BASELINE = {
  pointsPerGame: 47.82,
  totalYardsPerGame: 831.55,
  touchdownsPerTeamGame: 3,
  puntsPerTeamGame: 4.36,
  fgAttemptsPerTeamGame: 1.88,
  turnoverOnDownsPerTeamGame: 0.81,
  playsPerDrive: 6.38,
};

type CoachKey = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";

type CoachAggregate = {
  drives: number;
  goForIt: number;
  fieldGoal: number;
  punt: number;
  touchdowns: number;
  turnoverOnDowns: number;
  yards: number;
  plays: number;
  fourthShort: number;
  fourthShortGo: number;
  trailing: number;
  trailingGo: number;
  ownHalf: number;
  ownHalfGo: number;
  explosiveProxy: number;
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
    matchId: `coach-behaviour-${index + 1}`,
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

function percent(part: number, total: number) {
  return total === 0 ? 0 : (part / total) * 100;
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function createCoachAggregate(): CoachAggregate {
  return {
    drives: 0,
    goForIt: 0,
    fieldGoal: 0,
    punt: 0,
    touchdowns: 0,
    turnoverOnDowns: 0,
    yards: 0,
    plays: 0,
    fourthShort: 0,
    fourthShortGo: 0,
    trailing: 0,
    trailingGo: 0,
    ownHalf: 0,
    ownHalfGo: 0,
    explosiveProxy: 0,
  };
}

function collectTeamTotals(result: MatchSimulationResult) {
  return {
    points: result.homeScore + result.awayScore,
    yards: result.homeTeam.totalYards + result.awayTeam.totalYards,
    explosivePlays: result.homeTeam.explosivePlays + result.awayTeam.explosivePlays,
  };
}

function coachKey(drive: MatchDriveResult): CoachKey | null {
  if (
    drive.coachingRiskProfile === "CONSERVATIVE" ||
    drive.coachingRiskProfile === "BALANCED" ||
    drive.coachingRiskProfile === "AGGRESSIVE"
  ) {
    return drive.coachingRiskProfile;
  }

  return null;
}

function updateCoachAggregate(row: CoachAggregate, drive: MatchDriveResult) {
  row.drives += 1;
  row.yards += drive.totalYards;
  row.plays += drive.plays;

  if (drive.fourthDownDecision === "GO_FOR_IT") {
    row.goForIt += 1;
  } else if (drive.fourthDownDecision === "FIELD_GOAL") {
    row.fieldGoal += 1;
  } else if (drive.fourthDownDecision === "PUNT") {
    row.punt += 1;
  }

  if (drive.resultType === "TOUCHDOWN") {
    row.touchdowns += 1;
  } else if (drive.resultType === "TURNOVER_ON_DOWNS") {
    row.turnoverOnDowns += 1;
  }

  if (drive.fourthDownDistance != null && drive.fourthDownDistance <= 2) {
    row.fourthShort += 1;

    if (drive.fourthDownDecision === "GO_FOR_IT") {
      row.fourthShortGo += 1;
    }
  }

  if (drive.fourthDownScoreDelta != null && drive.fourthDownScoreDelta < 0) {
    row.trailing += 1;

    if (drive.fourthDownDecision === "GO_FOR_IT") {
      row.trailingGo += 1;
    }
  }

  if (drive.fourthDownBallPosition != null && drive.fourthDownBallPosition < 50) {
    row.ownHalf += 1;

    if (drive.fourthDownDecision === "GO_FOR_IT") {
      row.ownHalfGo += 1;
    }
  }

  if (drive.totalYards >= 35 || drive.resultType === "TOUCHDOWN") {
    row.explosiveProxy += 1;
  }
}

function simulateBatch() {
  const coaches: Record<CoachKey, CoachAggregate> = {
    CONSERVATIVE: createCoachAggregate(),
    BALANCED: createCoachAggregate(),
    AGGRESSIVE: createCoachAggregate(),
  };
  let points = 0;
  let yards = 0;
  let drives = 0;
  let plays = 0;
  let touchdowns = 0;
  let punts = 0;
  let fgAttempts = 0;
  let turnoverOnDowns = 0;
  let explosivePlays = 0;
  let unknownCoachDrives = 0;

  for (let index = 0; index < GAME_COUNT; index += 1) {
    const result = generateMatchStats(createMatchContext(index));
    const teamTotals = collectTeamTotals(result);
    points += teamTotals.points;
    yards += teamTotals.yards;
    explosivePlays += teamTotals.explosivePlays;

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

      const key = coachKey(drive);

      if (key == null) {
        unknownCoachDrives += 1;
      } else {
        updateCoachAggregate(coaches[key], drive);
      }
    }
  }

  return {
    pointsPerGame: points / GAME_COUNT,
    totalYardsPerGame: yards / GAME_COUNT,
    playsPerDrive: plays / drives,
    touchdownsPerTeamGame: touchdowns / (GAME_COUNT * 2),
    puntsPerTeamGame: punts / (GAME_COUNT * 2),
    fgAttemptsPerTeamGame: fgAttempts / (GAME_COUNT * 2),
    turnoverOnDownsPerTeamGame: turnoverOnDowns / (GAME_COUNT * 2),
    explosivePlaysPerTeamGame: explosivePlays / (GAME_COUNT * 2),
    unknownCoachDrives,
    coaches,
  };
}

function delta(after: number, before: number, digits = 2) {
  const value = round(after - before, digits);
  return value > 0 ? `+${value}` : String(value);
}

function coachRows(coaches: Record<CoachKey, CoachAggregate>) {
  return (["CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as const).map((key) => {
    const row = coaches[key];

    return [
      key,
      String(row.drives),
      `${round(percent(row.goForIt, row.drives), 1)}%`,
      `${round(percent(row.fieldGoal, row.drives), 1)}%`,
      `${round(percent(row.punt, row.drives), 1)}%`,
      `${round(percent(row.touchdowns, row.drives), 1)}%`,
      `${round(percent(row.turnoverOnDowns, row.drives), 1)}%`,
      String(round(row.yards / Math.max(row.drives, 1), 1)),
      String(round(row.plays / Math.max(row.drives, 1), 2)),
    ];
  });
}

function situationalRows(coaches: Record<CoachKey, CoachAggregate>) {
  return (["CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as const).map((key) => {
    const row = coaches[key];

    return [
      key,
      `${round(percent(row.fourthShortGo, row.fourthShort), 1)}%`,
      `${round(percent(row.trailingGo, row.trailing), 1)}%`,
      `${round(percent(row.ownHalfGo, row.ownHalf), 1)}%`,
      `${round(percent(row.explosiveProxy, row.drives), 1)}%`,
      `${row.fourthShortGo}/${row.fourthShort}`,
      `${row.trailingGo}/${row.trailing}`,
      `${row.ownHalfGo}/${row.ownHalf}`,
    ];
  });
}

function main() {
  const result = simulateBatch();
  const conservative = result.coaches.CONSERVATIVE;
  const balanced = result.coaches.BALANCED;
  const aggressive = result.coaches.AGGRESSIVE;
  const goRates = {
    conservative: percent(conservative.goForIt, conservative.drives),
    balanced: percent(balanced.goForIt, balanced.drives),
    aggressive: percent(aggressive.goForIt, aggressive.drives),
  };
  const fgRates = {
    conservative: percent(conservative.fieldGoal, conservative.drives),
    balanced: percent(balanced.fieldGoal, balanced.drives),
    aggressive: percent(aggressive.fieldGoal, aggressive.drives),
  };
  const puntRates = {
    conservative: percent(conservative.punt, conservative.drives),
    aggressive: percent(aggressive.punt, aggressive.drives),
  };
  const shortGoRates = {
    conservative: percent(conservative.fourthShortGo, conservative.fourthShort),
    aggressive: percent(aggressive.fourthShortGo, aggressive.fourthShort),
  };
  const measurable =
    conservative.drives >= 75 &&
    balanced.drives >= 500 &&
    aggressive.drives >= 800 &&
    goRates.aggressive > goRates.balanced &&
    goRates.balanced > goRates.conservative &&
    fgRates.conservative > fgRates.balanced &&
    puntRates.conservative > puntRates.aggressive &&
    shortGoRates.aggressive > shortGoRates.conservative;
  const globalStable =
    Math.abs(result.pointsPerGame - BASELINE.pointsPerGame) <= 3 &&
    Math.abs(result.totalYardsPerGame - BASELINE.totalYardsPerGame) <= 35 &&
    Math.abs(result.touchdownsPerTeamGame - BASELINE.touchdownsPerTeamGame) <= 0.25 &&
    Math.abs(result.puntsPerTeamGame - BASELINE.puntsPerTeamGame) <= 0.3 &&
    Math.abs(result.fgAttemptsPerTeamGame - BASELINE.fgAttemptsPerTeamGame) <= 0.25 &&
    Math.abs(result.turnoverOnDownsPerTeamGame - BASELINE.turnoverOnDownsPerTeamGame) <= 0.25;
  const status = measurable && globalStable ? "GRUEN" : "ROT";
  const coreRows = [
    ["Punkte / Spiel", String(round(BASELINE.pointsPerGame, 1)), String(round(result.pointsPerGame, 1)), delta(result.pointsPerGame, BASELINE.pointsPerGame, 1)],
    ["Total Yards / Spiel", String(round(BASELINE.totalYardsPerGame, 1)), String(round(result.totalYardsPerGame, 1)), delta(result.totalYardsPerGame, BASELINE.totalYardsPerGame, 1)],
    ["TDs / Team-Spiel", String(round(BASELINE.touchdownsPerTeamGame, 2)), String(round(result.touchdownsPerTeamGame, 2)), delta(result.touchdownsPerTeamGame, BASELINE.touchdownsPerTeamGame)],
    ["Punts / Team-Spiel", String(round(BASELINE.puntsPerTeamGame, 2)), String(round(result.puntsPerTeamGame, 2)), delta(result.puntsPerTeamGame, BASELINE.puntsPerTeamGame)],
    ["FG-Attempts / Team-Spiel", String(round(BASELINE.fgAttemptsPerTeamGame, 2)), String(round(result.fgAttemptsPerTeamGame, 2)), delta(result.fgAttemptsPerTeamGame, BASELINE.fgAttemptsPerTeamGame)],
    ["TOD / Team-Spiel", String(round(BASELINE.turnoverOnDownsPerTeamGame, 2)), String(round(result.turnoverOnDownsPerTeamGame, 2)), delta(result.turnoverOnDownsPerTeamGame, BASELINE.turnoverOnDownsPerTeamGame)],
    ["Plays / Drive", String(round(BASELINE.playsPerDrive, 2)), String(round(result.playsPerDrive, 2)), delta(result.playsPerDrive, BASELINE.playsPerDrive)],
    ["Explosive Plays / Team-Spiel", "-", String(round(result.explosivePlaysPerTeamGame, 2)), "-"],
  ];
  const statusRows = [
    ["Unterschiede messbar", measurable ? "GRUEN" : "ROT"],
    ["Gesamtwerte stabil", globalStable ? "GRUEN" : "ROT"],
    ["Conservative weniger GO_FOR_IT", goRates.conservative < goRates.balanced ? "GRUEN" : "ROT"],
    ["Conservative mehr FG", fgRates.conservative > fgRates.balanced ? "GRUEN" : "ROT"],
    ["Aggressive mehr 4th-short Risiko", shortGoRates.aggressive > shortGoRates.conservative ? "GRUEN" : "ROT"],
  ];
  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>QA Coach Behaviour</title>
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
    <h1>QA Coach Behaviour</h1>
    <p>100-Spiele-Audit zur Schaerfung von Conservative, Balanced und Aggressive Coaches ohne globale Balance-Verschiebung.</p>
    <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
  </section>
  <section>
    <h2>Technische Aenderung</h2>
    <p class="note">Coach-Profile werden jetzt als kontrollierter Mix mit leichter Team-Neigung vergeben. Conservative meidet Risiko und nimmt neutralere Field Goals, Balanced bleibt Mittelweg, Aggressive bekommt mehr 4th-short-/Trailing-Risiko und eine leichte Near-Explosive-Tendenz.</p>
  </section>
  <section>
    <h2>Gesamtbalance</h2>
    ${renderTable(["Metrik", "Baseline", "Nachher", "Delta"], coreRows)}
  </section>
  <section>
    <h2>Stats nach Coach-Typ</h2>
    ${renderTable(["Coach", "Drives", "GO_FOR_IT", "FG", "PUNT", "TD", "TOD", "Yards/Drive", "Plays/Drive"], coachRows(result.coaches))}
  </section>
  <section>
    <h2>Situative Unterschiede</h2>
    ${renderTable(["Coach", "4th Short GO", "Trailing GO", "Own-Half GO", "Explosive Proxy", "Short Raw", "Trailing Raw", "Own Raw"], situationalRows(result.coaches))}
  </section>
  <section>
    <h2>Statuspruefung</h2>
    ${renderTable(["Check", "Status"], statusRows)}
  </section>
  <section>
    <h2>Bewertung</h2>
    <p>${status === "GRUEN" ? "GRUEN: Coach-Stile sind klar messbar, Conservative/Balanced/Aggressive trennen sich sichtbar, und die Gesamtbalance bleibt im stabilen Bereich." : "ROT: Entweder sind die Coach-Unterschiede noch nicht klar genug oder die Gesamtbalance hat sich zu stark verschoben."}</p>
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
        touchdownsPerTeamGame: round(result.touchdownsPerTeamGame, 2),
        puntsPerTeamGame: round(result.puntsPerTeamGame, 2),
        fgAttemptsPerTeamGame: round(result.fgAttemptsPerTeamGame, 2),
        turnoverOnDownsPerTeamGame: round(result.turnoverOnDownsPerTeamGame, 2),
        totalYardsPerGame: round(result.totalYardsPerGame, 1),
        coachDrives: {
          conservative: conservative.drives,
          balanced: balanced.drives,
          aggressive: aggressive.drives,
          unknown: result.unknownCoachDrives,
        },
        goForItRates: {
          conservative: round(goRates.conservative, 1),
          balanced: round(goRates.balanced, 1),
          aggressive: round(goRates.aggressive, 1),
        },
      },
      null,
      2,
    )}\n`,
  );
}

main();
