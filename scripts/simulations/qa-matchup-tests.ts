import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { MatchKind } from "@prisma/client";

import { buildInitialRoster } from "../../src/modules/savegames/application/bootstrap/initial-roster";
import { generateMatchStats } from "../../src/modules/seasons/application/simulation/match-engine";
import type {
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationPlayerContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "../../src/modules/seasons/application/simulation/simulation.types";

const REPORT_DATE = "2026-04-25";
const GAMES_PER_SERIES = 100;

type TeamTier = "SCHWACH" | "MITTEL_A" | "MITTEL_B" | "STARK";

type ControlledTeamDefinition = {
  id: string;
  city: string;
  nickname: string;
  abbreviation: string;
  tier: TeamTier;
  rosterIndex: number;
  overallRating: number;
  ratingOffset: number;
};

type TeamRatingSnapshot = {
  teamId: string;
  abbreviation: string;
  name: string;
  tier: TeamTier;
  overallRating: number;
  ratingOffset: number;
  rosterSize: number;
  rosterOverall: number;
  offenseOverall: number;
  defenseOverall: number;
  specialTeamsOverall: number;
  physicalOverall: number;
  mentalOverall: number;
};

type TeamGameMetrics = {
  score: number;
  yards: number;
  touchdowns: number;
  punts: number;
  fieldGoalAttempts: number;
  turnovers: number;
  turnoverOnDowns: number;
};

type MatchupGameRecord = {
  gameNumber: number;
  seed: string;
  homeTeamId: string;
  awayTeamId: string;
  score: {
    home: number;
    away: number;
  };
  winner: {
    teamId: string;
    side: "home" | "away";
  } | null;
  yards: {
    home: number;
    away: number;
    total: number;
  };
  turnovers: {
    home: number;
    away: number;
    total: number;
  };
  touchdowns: {
    home: number;
    away: number;
  };
  punts: {
    home: number;
    away: number;
  };
  fieldGoalAttempts: {
    home: number;
    away: number;
  };
  turnoverOnDowns: {
    home: number;
    away: number;
  };
};

type MatchupSeriesResult = {
  id: string;
  label: string;
  homeTeamId: string;
  awayTeamId: string;
  gamesPlanned: number;
  gamesCompleted: number;
  seedPrefix: string;
  winRecord: {
    home: number;
    away: number;
    ties: number;
  };
  averages: {
    homeScore: number;
    awayScore: number;
    scoreDifferentialHomeMinusAway: number;
    winnerMargin: number;
    homeYards: number;
    awayYards: number;
    homeTouchdowns: number;
    awayTouchdowns: number;
    homePunts: number;
    awayPunts: number;
    homeFieldGoalAttempts: number;
    awayFieldGoalAttempts: number;
    homeTurnovers: number;
    awayTurnovers: number;
    homeTurnoverOnDowns: number;
    awayTurnoverOnDowns: number;
  };
  games: MatchupGameRecord[];
};

type MatchupQaReport = {
  status: "GRUEN" | "ROT";
  generatedAt: string;
  reportDate: string;
  rules: {
    gamesPerSeries: number;
    engineChanges: false;
    balancingChanges: false;
    ratingsAdjustedDuringSimulation: false;
  };
  teams: TeamRatingSnapshot[];
  series: MatchupSeriesResult[];
  checks: {
    atLeastFourSeries: boolean;
    everySeriesHas100Games: boolean;
    ratingsRemainUnchanged: boolean;
    rawDataComplete: boolean;
  };
};

const TEAM_DEFINITIONS: ControlledTeamDefinition[] = [
  {
    id: "CTL_WEAK",
    city: "Canton",
    nickname: "Anchors",
    abbreviation: "WEK",
    tier: "SCHWACH",
    rosterIndex: 10,
    overallRating: 58,
    ratingOffset: -12,
  },
  {
    id: "CTL_MIDA",
    city: "Portland",
    nickname: "Bridges",
    abbreviation: "MDA",
    tier: "MITTEL_A",
    rosterIndex: 11,
    overallRating: 72,
    ratingOffset: -2,
  },
  {
    id: "CTL_MIDB",
    city: "Memphis",
    nickname: "Pilots",
    abbreviation: "MDB",
    tier: "MITTEL_B",
    rosterIndex: 12,
    overallRating: 76,
    ratingOffset: 2,
  },
  {
    id: "CTL_STRONG",
    city: "San Diego",
    nickname: "Sentinels",
    abbreviation: "STR",
    tier: "STARK",
    rosterIndex: 13,
    overallRating: 90,
    ratingOffset: 12,
  },
];

const SERIES_DEFINITIONS = [
  {
    id: "strong-vs-weak",
    label: "Stark vs Schwach",
    homeTeamId: "CTL_STRONG",
    awayTeamId: "CTL_WEAK",
  },
  {
    id: "strong-vs-medium-a",
    label: "Stark vs Mittel A",
    homeTeamId: "CTL_STRONG",
    awayTeamId: "CTL_MIDA",
  },
  {
    id: "medium-a-vs-medium-b",
    label: "Mittel A vs Mittel B",
    homeTeamId: "CTL_MIDA",
    awayTeamId: "CTL_MIDB",
  },
  {
    id: "medium-b-vs-weak",
    label: "Mittel B vs Schwach",
    homeTeamId: "CTL_MIDB",
    awayTeamId: "CTL_WEAK",
  },
] as const;

function clampRating(value: number) {
  return Math.min(99, Math.max(1, Math.round(value)));
}

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

function adjustNullableRating(value: number | null | undefined, offset: number) {
  return value == null ? null : clampRating(value + offset);
}

function buildControlledTeam(definition: ControlledTeamDefinition): SimulationTeamContext {
  const roster = buildInitialRoster(
    definition.rosterIndex,
    definition.overallRating,
    2026,
  ).map((seed, index): SimulationPlayerContext => {
    const attributes = Object.fromEntries(
      Object.entries(seed.attributes)
        .filter((entry): entry is [string, number] => entry[1] != null)
        .map(([key, value]) => [key, clampRating(value + definition.ratingOffset)]),
    );

    return {
      id: `${definition.id}-player-${index}`,
      teamId: definition.id,
      firstName: seed.firstName,
      lastName: seed.lastName,
      age: seed.age,
      developmentTrait: seed.developmentTrait,
      potentialRating: clampRating(seed.potentialRating + definition.ratingOffset),
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
      positionOverall: clampRating(seed.positionOverall + definition.ratingOffset),
      offensiveOverall: adjustNullableRating(seed.offensiveOverall, definition.ratingOffset),
      defensiveOverall: adjustNullableRating(seed.defensiveOverall, definition.ratingOffset),
      specialTeamsOverall: adjustNullableRating(seed.specialTeamsOverall, definition.ratingOffset),
      physicalOverall: adjustNullableRating(seed.physicalOverall, definition.ratingOffset),
      mentalOverall: adjustNullableRating(seed.mentalOverall, definition.ratingOffset),
      attributes,
      gameDayAvailability: "ACTIVE",
      gameDayReadinessMultiplier: 1,
      gameDaySnapMultiplier: 1,
      seasonStat: createStatAnchor(`season-${definition.id}-${index}`),
      careerStat: createStatAnchor(`career-${definition.id}-${index}`),
    };
  });

  return {
    id: definition.id,
    city: definition.city,
    nickname: definition.nickname,
    abbreviation: definition.abbreviation,
    overallRating: definition.overallRating,
    roster,
  };
}

function cloneTeam(team: SimulationTeamContext): SimulationTeamContext {
  return {
    ...team,
    roster: team.roster.map((player) => ({
      ...player,
      attributes: { ...player.attributes },
      seasonStat: player.seasonStat ? { ...player.seasonStat } : null,
      careerStat: player.careerStat ? { ...player.careerStat } : null,
    })),
  };
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function teamName(team: SimulationTeamContext) {
  return `${team.city} ${team.nickname}`;
}

function ratingSnapshot(
  definition: ControlledTeamDefinition,
  team: SimulationTeamContext,
): TeamRatingSnapshot {
  const numbers = (
    selector: (player: SimulationPlayerContext) => number | null,
  ) => team.roster.map(selector).filter((value): value is number => value != null);

  return {
    teamId: team.id,
    abbreviation: team.abbreviation,
    name: teamName(team),
    tier: definition.tier,
    overallRating: team.overallRating,
    ratingOffset: definition.ratingOffset,
    rosterSize: team.roster.length,
    rosterOverall: round(average(numbers((player) => player.positionOverall)), 1),
    offenseOverall: round(average(numbers((player) => player.offensiveOverall)), 1),
    defenseOverall: round(average(numbers((player) => player.defensiveOverall)), 1),
    specialTeamsOverall: round(average(numbers((player) => player.specialTeamsOverall)), 1),
    physicalOverall: round(average(numbers((player) => player.physicalOverall)), 1),
    mentalOverall: round(average(numbers((player) => player.mentalOverall)), 1),
  };
}

function createMatchContext(input: {
  matchId: string;
  seed: string;
  homeTeam: SimulationTeamContext;
  awayTeam: SimulationTeamContext;
  gameNumber: number;
}): SimulationMatchContext {
  return {
    matchId: input.matchId,
    saveGameId: "qa-matchup-savegame",
    seasonId: "qa-matchup-season-2026",
    kind: MatchKind.REGULAR_SEASON,
    simulationSeed: input.seed,
    seasonYear: 2026,
    week: ((input.gameNumber - 1) % 18) + 1,
    scheduledAt: new Date(Date.UTC(2026, 8, 1 + ((input.gameNumber - 1) % 28), 18, 0, 0)),
    homeTeam: cloneTeam(input.homeTeam),
    awayTeam: cloneTeam(input.awayTeam),
  };
}

function driveCountForTeam(
  result: MatchSimulationResult,
  teamId: string,
  resultType: string,
) {
  return result.drives.filter(
    (drive) => drive.offenseTeamId === teamId && drive.resultType === resultType,
  ).length;
}

function teamMetrics(
  result: MatchSimulationResult,
  teamId: string,
): TeamGameMetrics {
  const team = result.homeTeam.teamId === teamId ? result.homeTeam : result.awayTeam;

  return {
    score: team.score,
    yards: team.totalYards,
    touchdowns: team.touchdowns,
    punts: driveCountForTeam(result, teamId, "PUNT"),
    fieldGoalAttempts:
      driveCountForTeam(result, teamId, "FIELD_GOAL_MADE") +
      driveCountForTeam(result, teamId, "FIELD_GOAL_MISSED"),
    turnovers: team.turnovers,
    turnoverOnDowns: driveCountForTeam(result, teamId, "TURNOVER_ON_DOWNS"),
  };
}

function toGameRecord(input: {
  gameNumber: number;
  seed: string;
  result: MatchSimulationResult;
  homeTeamId: string;
  awayTeamId: string;
}): MatchupGameRecord {
  const home = teamMetrics(input.result, input.homeTeamId);
  const away = teamMetrics(input.result, input.awayTeamId);
  const winner =
    input.result.homeScore === input.result.awayScore
      ? null
      : input.result.homeScore > input.result.awayScore
        ? { teamId: input.homeTeamId, side: "home" as const }
        : { teamId: input.awayTeamId, side: "away" as const };

  return {
    gameNumber: input.gameNumber,
    seed: input.seed,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    score: {
      home: input.result.homeScore,
      away: input.result.awayScore,
    },
    winner,
    yards: {
      home: home.yards,
      away: away.yards,
      total: home.yards + away.yards,
    },
    turnovers: {
      home: home.turnovers,
      away: away.turnovers,
      total: home.turnovers + away.turnovers,
    },
    touchdowns: {
      home: home.touchdowns,
      away: away.touchdowns,
    },
    punts: {
      home: home.punts,
      away: away.punts,
    },
    fieldGoalAttempts: {
      home: home.fieldGoalAttempts,
      away: away.fieldGoalAttempts,
    },
    turnoverOnDowns: {
      home: home.turnoverOnDowns,
      away: away.turnoverOnDowns,
    },
  };
}

function summarizeSeries(input: {
  id: string;
  label: string;
  homeTeamId: string;
  awayTeamId: string;
  seedPrefix: string;
  games: MatchupGameRecord[];
}): MatchupSeriesResult {
  const games = input.games;
  const gameCount = games.length;
  const homeWins = games.filter((game) => game.winner?.side === "home").length;
  const awayWins = games.filter((game) => game.winner?.side === "away").length;
  const ties = games.filter((game) => game.winner == null).length;
  const avg = (selector: (game: MatchupGameRecord) => number) =>
    round(average(games.map(selector)), 2);

  return {
    id: input.id,
    label: input.label,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    gamesPlanned: GAMES_PER_SERIES,
    gamesCompleted: gameCount,
    seedPrefix: input.seedPrefix,
    winRecord: {
      home: homeWins,
      away: awayWins,
      ties,
    },
    averages: {
      homeScore: avg((game) => game.score.home),
      awayScore: avg((game) => game.score.away),
      scoreDifferentialHomeMinusAway: avg((game) => game.score.home - game.score.away),
      winnerMargin: avg((game) => Math.abs(game.score.home - game.score.away)),
      homeYards: avg((game) => game.yards.home),
      awayYards: avg((game) => game.yards.away),
      homeTouchdowns: avg((game) => game.touchdowns.home),
      awayTouchdowns: avg((game) => game.touchdowns.away),
      homePunts: avg((game) => game.punts.home),
      awayPunts: avg((game) => game.punts.away),
      homeFieldGoalAttempts: avg((game) => game.fieldGoalAttempts.home),
      awayFieldGoalAttempts: avg((game) => game.fieldGoalAttempts.away),
      homeTurnovers: avg((game) => game.turnovers.home),
      awayTurnovers: avg((game) => game.turnovers.away),
      homeTurnoverOnDowns: avg((game) => game.turnoverOnDowns.home),
      awayTurnoverOnDowns: avg((game) => game.turnoverOnDowns.away),
    },
    games,
  };
}

function runSeries(
  series: (typeof SERIES_DEFINITIONS)[number],
  teamsById: Map<string, SimulationTeamContext>,
) {
  const homeTeam = teamsById.get(series.homeTeamId);
  const awayTeam = teamsById.get(series.awayTeamId);

  if (!homeTeam || !awayTeam) {
    throw new Error(`Missing teams for series ${series.id}`);
  }

  const seedPrefix = `qa-matchup-${series.id}`;
  const games: MatchupGameRecord[] = [];

  for (let index = 0; index < GAMES_PER_SERIES; index += 1) {
    const gameNumber = index + 1;
    const seed = `${seedPrefix}-${String(gameNumber).padStart(3, "0")}`;
    const context = createMatchContext({
      matchId: `${series.id}-${gameNumber}`,
      seed,
      homeTeam,
      awayTeam,
      gameNumber,
    });
    const result = generateMatchStats(context);

    games.push(
      toGameRecord({
        gameNumber,
        seed,
        result,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
      }),
    );
  }

  return summarizeSeries({
    id: series.id,
    label: series.label,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    seedPrefix,
    games,
  });
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTable(headers: string[], rows: Array<Array<string | number>>) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function teamLabel(teams: TeamRatingSnapshot[], teamId: string) {
  const team = teams.find((candidate) => candidate.teamId === teamId);

  return team ? `${team.abbreviation} ${team.name}` : teamId;
}

function renderSummaryHtml(report: MatchupQaReport) {
  const teamRows = report.teams.map((team) => [
    team.tier,
    `${team.abbreviation} ${team.name}`,
    team.overallRating,
    team.ratingOffset,
    team.rosterOverall,
    team.offenseOverall,
    team.defenseOverall,
    team.specialTeamsOverall,
    `${team.physicalOverall} / ${team.mentalOverall}`,
  ]);
  const seriesRows = report.series.map((series) => [
    series.label,
    teamLabel(report.teams, series.homeTeamId),
    teamLabel(report.teams, series.awayTeamId),
    `${series.winRecord.home}-${series.winRecord.away}-${series.winRecord.ties}`,
    `${series.averages.homeScore}-${series.averages.awayScore}`,
    series.averages.scoreDifferentialHomeMinusAway,
    `${series.averages.homeYards}-${series.averages.awayYards}`,
    `${series.averages.homeTouchdowns}-${series.averages.awayTouchdowns}`,
    `${series.averages.homePunts}-${series.averages.awayPunts}`,
    `${series.averages.homeFieldGoalAttempts}-${series.averages.awayFieldGoalAttempts}`,
    `${series.averages.homeTurnovers}-${series.averages.awayTurnovers}`,
    `${series.averages.homeTurnoverOnDowns}-${series.averages.awayTurnoverOnDowns}`,
  ]);

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA Matchup Summary ${REPORT_DATE}</title>
  <style>
    :root {
      --bg: #f6f7f4;
      --panel: #ffffff;
      --ink: #1b2428;
      --muted: #657174;
      --line: #d7dedb;
      --good: #17613d;
      --bad: #9b2d25;
      --accent: #2c5d73;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }

    main {
      max-width: 1220px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }

    h1, h2 { margin: 0; letter-spacing: 0; }
    h1 { font-size: 34px; line-height: 1.1; }
    h2 { margin-top: 32px; font-size: 22px; }
    p { margin: 8px 0 0; color: var(--muted); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }

    .top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--line);
    }

    .pill, .card, .note {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 6px 10px;
      font-weight: 800;
      color: ${report.status === "GRUEN" ? "var(--good)" : "var(--bad)"};
    }

    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    .card {
      min-width: 170px;
      padding: 14px;
    }

    .label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }

    .value {
      margin-top: 4px;
      font-size: 20px;
      font-weight: 850;
    }

    .note {
      margin-top: 12px;
      padding: 14px;
    }

    table {
      width: 100%;
      margin-top: 12px;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }

    th, td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }

    th {
      color: var(--muted);
      background: #eef3f0;
      font-size: 12px;
      text-transform: uppercase;
    }

    tr:last-child td { border-bottom: 0; }
  </style>
</head>
<body>
  <main>
    <div class="top">
      <div>
        <h1>QA Matchup Summary</h1>
        <p>Kontrollierte Serien mit vier klar unterschiedlich bewerteten Teams. Keine Engine- oder Balancing-Aenderungen.</p>
      </div>
      <span class="pill">Status: ${report.status}</span>
    </div>

    <section>
      <h2>Statuspruefung</h2>
      <div class="cards">
        <div class="card"><div class="label">Serien</div><div class="value">${report.series.length}</div></div>
        <div class="card"><div class="label">Spiele pro Serie</div><div class="value">${GAMES_PER_SERIES}</div></div>
        <div class="card"><div class="label">Gesamtspiele</div><div class="value">${report.series.reduce((sum, series) => sum + series.gamesCompleted, 0)}</div></div>
        <div class="card"><div class="label">Ratings fix</div><div class="value">${report.checks.ratingsRemainUnchanged ? "Ja" : "Nein"}</div></div>
      </div>
      <div class="note">
        Rohdaten mit allen Spielen liegen in <code>reports-output/simulations/qa-matchup-results.json</code>. Jede Serie verwendet dieselben Teams ueber 100 unterschiedliche Seeds.
      </div>
    </section>

    <section>
      <h2>Teams</h2>
      ${renderTable(
        ["Tier", "Team", "Overall", "Offset", "Roster", "Offense", "Defense", "Special", "Phys / Mental"],
        teamRows,
      )}
    </section>

    <section>
      <h2>Serien-Ergebnisse</h2>
      ${renderTable(
        [
          "Serie",
          "Home",
          "Away",
          "Win Record H-A-T",
          "Avg Score",
          "Avg Diff H-A",
          "Avg Yards",
          "Avg TD",
          "Avg Punts",
          "Avg FG",
          "Avg TO",
          "Avg TOD",
        ],
        seriesRows,
      )}
    </section>
  </main>
</body>
</html>`;
}

function buildReport(): MatchupQaReport {
  const teams = TEAM_DEFINITIONS.map((definition) => ({
    definition,
    team: buildControlledTeam(definition),
  }));
  const teamsById = new Map(teams.map(({ team }) => [team.id, team]));
  const teamSnapshots = teams.map(({ definition, team }) => ratingSnapshot(definition, team));
  const beforeRatings = JSON.stringify(teamSnapshots);
  const series = SERIES_DEFINITIONS.map((definition) => runSeries(definition, teamsById));
  const afterRatings = JSON.stringify(
    teams.map(({ definition, team }) => ratingSnapshot(definition, team)),
  );
  const rawDataComplete = series.every((row) =>
    row.games.every(
      (game) =>
        game.gameNumber >= 1 &&
        game.seed.length > 0 &&
        game.homeTeamId.length > 0 &&
        game.awayTeamId.length > 0 &&
        Number.isFinite(game.score.home) &&
        Number.isFinite(game.score.away) &&
        Number.isFinite(game.yards.home) &&
        Number.isFinite(game.yards.away) &&
        Number.isFinite(game.turnovers.home) &&
        Number.isFinite(game.turnovers.away),
    ),
  );
  const checks = {
    atLeastFourSeries: series.length >= 4,
    everySeriesHas100Games: series.every((row) => row.gamesCompleted === GAMES_PER_SERIES),
    ratingsRemainUnchanged: beforeRatings === afterRatings,
    rawDataComplete,
  };
  const status = Object.values(checks).every(Boolean) ? "GRUEN" : "ROT";

  return {
    status,
    generatedAt: new Date().toISOString(),
    reportDate: REPORT_DATE,
    rules: {
      gamesPerSeries: GAMES_PER_SERIES,
      engineChanges: false,
      balancingChanges: false,
      ratingsAdjustedDuringSimulation: false,
    },
    teams: teamSnapshots,
    series,
    checks,
  };
}

function main() {
  const report = buildReport();
  const reportsDir = resolve("reports-output", "simulations");
  const jsonPath = join(reportsDir, "qa-matchup-results.json");
  const htmlPath = join(reportsDir, "qa-matchup-summary.html");

  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(htmlPath, renderSummaryHtml(report), "utf8");

  console.log(
    JSON.stringify(
      {
        status: report.status,
        jsonPath,
        htmlPath,
        series: report.series.length,
        games: report.series.reduce((total, row) => total + row.gamesCompleted, 0),
        checks: report.checks,
      },
      null,
      2,
    ),
  );

  process.exitCode = report.status === "GRUEN" ? 0 : 1;
}

main();
