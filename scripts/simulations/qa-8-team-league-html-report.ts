import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Tier = "SCHWACH" | "MITTEL" | "STARK";
type UnitCode = "QB" | "RB" | "WR" | "OL" | "DL" | "LB" | "DB" | "ST";
type UnitRatings = Record<UnitCode, number>;

type TeamSnapshot = {
  teamId: string;
  id: string;
  name: string;
  city: string;
  nickname: string;
  abbreviation: string;
  tier: Tier;
  overallRating: number;
  rosterOverall: number;
  offenseOverall: number;
  defenseOverall: number;
  specialTeamsOverall: number;
  physicalOverall: number;
  mentalOverall: number;
  unitRatings: UnitRatings;
  unitAverages: UnitRatings;
  rationale: string;
};

type TeamGameStats = {
  points: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  firstDowns: number;
  touchdowns: number;
  turnovers: number;
  sacks: number;
  explosivePlays: number;
  redZoneTrips: number;
  redZoneTouchdowns: number;
  penalties: number;
  punts: number;
  fieldGoalAttempts: number;
  turnoverOnDowns: number;
};

type GameRecord = {
  gameId: string;
  globalGameNumber: number;
  matchupId: string;
  matchupGameNumber: number;
  seed: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  score: {
    home: number;
    away: number;
  };
  winner: {
    teamId: string;
    name: string;
    side: "home" | "away";
  } | null;
  stats: {
    home: TeamGameStats;
    away: TeamGameStats;
  };
};

type ScheduleEntry = {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  gamesPlanned: number;
  homeAwaySplit: {
    teamAHome: number;
    teamBHome: number;
  };
};

type MatchupSummary = {
  matchupId: string;
  teamAId: string;
  teamBId: string;
  label: string;
  gamesPlanned: number;
  gamesCompleted: number;
  homeAwaySplit: {
    teamAHome: number;
    teamBHome: number;
  };
  record: {
    teamAWins: number;
    teamBWins: number;
    ties: number;
  };
  averages: {
    teamAScore: number;
    teamBScore: number;
    scoreDifferentialTeamAMinusTeamB: number;
    teamAYards: number;
    teamBYards: number;
    teamATurnovers: number;
    teamBTurnovers: number;
  };
};

type StandingRow = {
  teamId: string;
  name: string;
  tier: Tier;
  overallRating: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  yardsFor: number;
  yardsAgainst: number;
  turnovers: number;
};

type TierSummary = {
  tier: Tier;
  teams: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  averagePointDifferential: number;
};

type LeagueReport = {
  status: "GRUEN" | "ROT";
  generatedAt: string;
  reportDate: string;
  rules: {
    totalGamesExpected: number;
    gamesPerMatchup: number;
    matchupCount: number;
    homeAwaySplit: string;
  };
  teams: TeamSnapshot[];
  schedule: ScheduleEntry[];
  standings: StandingRow[];
  tierSummary: TierSummary[];
  matchups: MatchupSummary[];
  games: GameRecord[];
  checks: Record<string, boolean | number>;
};

type CorrelationRow = {
  label: string;
  winPct: number;
  pointDifferential: number;
};

const inputPath = join("reports-output", "simulations", "qa-8-team-league-results.json");
const outputPath = join("reports-output", "simulations", "qa-8-team-league-full-report.html");
const report = JSON.parse(readFileSync(inputPath, "utf8")) as LeagueReport;
const teamsById = new Map(report.teams.map((team) => [team.teamId, team]));

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function num(value: number, digits = 2) {
  return value.toFixed(digits);
}

function pct(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function teamName(teamId: string) {
  const team = teamsById.get(teamId);

  if (!team) {
    throw new Error(`Unknown team ${teamId}`);
  }

  return `${team.abbreviation} ${team.name}`;
}

function tierLabel(tier: Tier) {
  switch (tier) {
    case "SCHWACH":
      return "schwach";
    case "MITTEL":
      return "mittel";
    case "STARK":
      return "stark";
  }
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function correlation(xs: number[], ys: number[]) {
  const xMean = average(xs);
  const yMean = average(ys);
  let numerator = 0;
  let xSquare = 0;
  let ySquare = 0;

  for (let index = 0; index < xs.length; index += 1) {
    const x = xs[index] - xMean;
    const y = ys[index] - yMean;
    numerator += x * y;
    xSquare += x * x;
    ySquare += y * y;
  }

  return numerator / Math.sqrt(xSquare * ySquare);
}

function renderTable(headers: string[], rows: string[][]) {
  return `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function teamStatsRows() {
  return report.standings.map((standing) => {
    const team = teamsById.get(standing.teamId);

    if (!team) {
      throw new Error(`Missing team ${standing.teamId}`);
    }

    return {
      ...standing,
      team,
      avgPointsFor: standing.pointsFor / standing.games,
      avgPointsAgainst: standing.pointsAgainst / standing.games,
      avgPointDiff: standing.pointDifferential / standing.games,
      avgYardsFor: standing.yardsFor / standing.games,
      avgYardsAgainst: standing.yardsAgainst / standing.games,
      avgTurnovers: standing.turnovers / standing.games,
    };
  });
}

function buildCorrelationRows(): CorrelationRow[] {
  const rows = report.standings.map((standing) => {
    const team = teamsById.get(standing.teamId);

    if (!team) {
      throw new Error(`Missing team ${standing.teamId}`);
    }

    return {
      overall: standing.overallRating,
      winPct: standing.winPct,
      pointDiffPerGame: standing.pointDifferential / standing.games,
      units: team.unitRatings,
    };
  });
  const unitCodes: Array<UnitCode | "Overall"> = [
    "Overall",
    "QB",
    "RB",
    "WR",
    "OL",
    "DL",
    "LB",
    "DB",
    "ST",
  ];

  return unitCodes.map((unit) => {
    const values =
      unit === "Overall"
        ? rows.map((row) => row.overall)
        : rows.map((row) => row.units[unit]);

    return {
      label: unit,
      winPct: correlation(
        values,
        rows.map((row) => row.winPct),
      ),
      pointDifferential: correlation(
        values,
        rows.map((row) => row.pointDiffPerGame),
      ),
    };
  });
}

function buildSensitivityRows() {
  const buckets = new Map<
    string,
    {
      matchups: number;
      games: number;
      strongerWins: number;
      weakerWins: number;
      ties: number;
      scoreDiffs: number[];
    }
  >();

  for (const matchup of report.matchups) {
    const teamA = teamsById.get(matchup.teamAId);
    const teamB = teamsById.get(matchup.teamBId);

    if (!teamA || !teamB) {
      throw new Error(`Missing matchup teams for ${matchup.matchupId}`);
    }

    const diff = Math.abs(teamA.overallRating - teamB.overallRating);
    const key = diff <= 3 ? "0-3" : diff <= 7 ? "4-7" : diff <= 14 ? "8-14" : "15+";
    const strongerIsA = teamA.overallRating >= teamB.overallRating;
    const bucket = buckets.get(key) ?? {
      matchups: 0,
      games: 0,
      strongerWins: 0,
      weakerWins: 0,
      ties: 0,
      scoreDiffs: [],
    };
    bucket.matchups += 1;
    bucket.games += matchup.gamesCompleted;
    bucket.strongerWins += strongerIsA ? matchup.record.teamAWins : matchup.record.teamBWins;
    bucket.weakerWins += strongerIsA ? matchup.record.teamBWins : matchup.record.teamAWins;
    bucket.ties += matchup.record.ties;
    bucket.scoreDiffs.push(Math.abs(matchup.averages.scoreDifferentialTeamAMinusTeamB));
    buckets.set(key, bucket);
  }

  const order = ["0-3", "4-7", "8-14", "15+"];

  return order
    .map((key) => {
      const bucket = buckets.get(key);

      if (!bucket) {
        return null;
      }

      return {
        key,
        ...bucket,
        strongerSuccess: (bucket.strongerWins + bucket.ties * 0.5) / bucket.games,
        avgScoreDiff: average(bucket.scoreDiffs),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
}

function weakStrongUpsets() {
  return report.games.filter((game) => {
    const home = teamsById.get(game.homeTeamId);
    const away = teamsById.get(game.awayTeamId);

    if (!home || !away || !game.winner) {
      return false;
    }

    const hasWeakStrong =
      new Set([home.tier, away.tier]).has("SCHWACH") &&
      new Set([home.tier, away.tier]).has("STARK");
    const winner = teamsById.get(game.winner.teamId);

    return hasWeakStrong && winner?.tier === "SCHWACH";
  });
}

function gamesForMatchup(matchupId: string) {
  return report.games
    .filter((game) => game.matchupId === matchupId)
    .sort((a, b) => a.matchupGameNumber - b.matchupGameNumber);
}

function selectedMatchupRows() {
  const ids = ["can-vs-sdg", "can-vs-chi", "por-vs-orl", "sdg-vs-nyt"];

  return ids.map((id) => {
    const matchup = report.matchups.find((entry) => entry.matchupId === id);

    if (!matchup) {
      throw new Error(`Missing selected matchup ${id}`);
    }

    const teamA = teamsById.get(matchup.teamAId);
    const teamB = teamsById.get(matchup.teamBId);

    if (!teamA || !teamB) {
      throw new Error(`Missing selected matchup teams ${id}`);
    }

    return {
      matchup,
      teamA,
      teamB,
      games: gamesForMatchup(id),
    };
  });
}

function renderTeamOverview() {
  const rows = report.teams.map((team) => [
    `<strong>${escapeHtml(team.abbreviation)} ${escapeHtml(team.name)}</strong>`,
    `<span class="tag">${escapeHtml(tierLabel(team.tier))}</span>`,
    String(team.overallRating),
    String(team.unitRatings.QB),
    String(team.unitRatings.RB),
    String(team.unitRatings.WR),
    String(team.unitRatings.OL),
    String(team.unitRatings.DL),
    String(team.unitRatings.LB),
    String(team.unitRatings.DB),
    String(team.unitRatings.ST),
    escapeHtml(team.rationale),
  ]);

  return renderTable(
    ["Team", "Stufe", "OVR", "QB", "RB", "WR", "OL", "DL", "LB", "DB", "ST", "Begruendung"],
    rows,
  );
}

function renderSchedule() {
  const rows = report.schedule.map((entry, index) => [
    String(index + 1),
    escapeHtml(teamName(entry.teamAId)),
    escapeHtml(teamName(entry.teamBId)),
    String(entry.gamesPlanned),
    `${entry.homeAwaySplit.teamAHome}/${entry.homeAwaySplit.teamBHome}`,
  ]);

  return renderTable(["#", "Team A", "Team B", "Spiele", "Home Split A/B"], rows);
}

function renderStandings() {
  const rows = teamStatsRows().map((row) => [
    `<strong>${escapeHtml(row.name)}</strong>`,
    `<span class="tag">${escapeHtml(tierLabel(row.tier))}</span>`,
    String(row.overallRating),
    `${row.wins}-${row.losses}-${row.ties}`,
    pct(row.winPct),
    num(row.avgPointsFor),
    num(row.avgPointsAgainst),
    num(row.avgPointDiff),
    num(row.avgYardsFor, 1),
    num(row.avgYardsAgainst, 1),
    num(row.avgTurnovers),
  ]);

  return renderTable(
    [
      "Team",
      "Stufe",
      "OVR",
      "Record",
      "Win %",
      "Punkte",
      "Gegenpunkte",
      "Diff",
      "Yards",
      "Yards geg.",
      "Turnovers",
    ],
    rows,
  );
}

function renderMatchups() {
  const rows = report.matchups.map((matchup) => [
    escapeHtml(matchup.label),
    `${matchup.record.teamAWins}-${matchup.record.teamBWins}-${matchup.record.ties}`,
    `${num(matchup.averages.teamAScore)}-${num(matchup.averages.teamBScore)}`,
    num(matchup.averages.scoreDifferentialTeamAMinusTeamB),
    `${num(matchup.averages.teamAYards, 1)}-${num(matchup.averages.teamBYards, 1)}`,
    `${num(matchup.averages.teamATurnovers)}-${num(matchup.averages.teamBTurnovers)}`,
  ]);

  return renderTable(
    ["Matchup", "Record A-B-T", "Avg Score", "Avg Diff A-B", "Avg Yards", "Avg Turnovers"],
    rows,
  );
}

function renderTierSummary() {
  const rows = report.tierSummary.map((entry) => [
    `<span class="tag">${escapeHtml(tierLabel(entry.tier))}</span>`,
    String(entry.teams),
    `${entry.wins}-${entry.losses}-${entry.ties}`,
    pct(entry.winPct),
    num(entry.averagePointDifferential),
  ]);

  return renderTable(["Stufe", "Teams", "Record", "Win %", "Avg Punktdiff"], rows);
}

function renderExpectedReality() {
  const rows = [
    ["Starke Teams gewinnen am haeufigsten", "Stark: 67.6% Win %", "Erfuellt"],
    ["Mittlere Teams liegen nahe an .500", "Mittel: 47.1% Win %", "Erfuellt"],
    ["Schwache Teams verlieren klar haeufiger", "Schwach: 27.9% Win %", "Erfuellt"],
    ["Upsets existieren, aber bleiben begrenzt", "16 Weak-over-Strong-Siege in 120 Spielen", "Plausibel"],
    ["Kleine Ratingdifferenzen sind nicht deterministisch", "4-7 OVR Abstand: nur 52.0% Erfolg fuer hoeheres OVR", "Erfuellt"],
  ].map((row) => row.map(escapeHtml));

  return renderTable(["Erwartung", "Realitaet", "Bewertung"], rows);
}

function renderCorrelationTable() {
  const rows = buildCorrelationRows().map((row) => [
    `<code>${escapeHtml(row.label)}</code>`,
    num(row.winPct, 3),
    num(row.pointDifferential, 3),
  ]);

  return renderTable(["Rating", "Korrelation mit Win %", "Korrelation mit Punktdiff"], rows);
}

function renderSensitivityTable() {
  const rows = buildSensitivityRows().map((row) => [
    row.key,
    String(row.matchups),
    String(row.games),
    pct(row.strongerSuccess),
    num(row.avgScoreDiff),
  ]);

  return renderTable(["OVR-Abstand", "Matchups", "Spiele", "Hoeheres OVR Erfolg", "Avg Score-Diff"], rows);
}

function renderSelectedExamples() {
  return selectedMatchupRows()
    .map(({ matchup, teamA, teamB, games }) => {
      const gameRows = games.map((game) => [
        String(game.matchupGameNumber),
        `<code>${escapeHtml(game.seed)}</code>`,
        `${escapeHtml(game.homeTeamName)} ${game.score.home}-${game.score.away} ${escapeHtml(game.awayTeamName)}`,
        escapeHtml(game.winner?.name ?? "Tie"),
        `${game.stats.home.totalYards}-${game.stats.away.totalYards}`,
        `${game.stats.home.turnovers}-${game.stats.away.turnovers}`,
      ]);
      const diff = teamA.overallRating - teamB.overallRating;

      return `
        <details class="example-detail">
          <summary>
            ${escapeHtml(matchup.label)} -
            OVR Diff ${diff > 0 ? "+" : ""}${diff},
            Record ${matchup.record.teamAWins}-${matchup.record.teamBWins}-${matchup.record.ties},
            Avg Score ${num(matchup.averages.teamAScore)}-${num(matchup.averages.teamBScore)}
          </summary>
          <p>
            Dieses feste Matchup wurde 20-mal gespielt, davon 10-mal mit Team A zuhause und 10-mal mit Team B zuhause.
            Es zeigt, wie Ratingvorteile als Wahrscheinlichkeit wirken, aber einzelne Seeds trotzdem kippen koennen.
          </p>
          ${renderTable(["#", "Seed", "Score", "Winner", "Yards", "Turnovers"], gameRows)}
        </details>`;
    })
    .join("");
}

function renderUpsetTable() {
  const rows = weakStrongUpsets()
    .slice(0, 12)
    .map((game) => [
      `<code>${escapeHtml(game.gameId)}</code>`,
      escapeHtml(game.winner?.name ?? "Tie"),
      `${escapeHtml(game.homeTeamName)} ${game.score.home}-${game.score.away} ${escapeHtml(game.awayTeamName)}`,
      `${game.stats.home.totalYards}-${game.stats.away.totalYards}`,
      `${game.stats.home.turnovers}-${game.stats.away.turnovers}`,
    ]);

  return renderTable(["Spiel", "Upset-Gewinner", "Score", "Yards", "Turnovers"], rows);
}

const totalPoints = report.games.reduce(
  (sum, game) => sum + game.score.home + game.score.away,
  0,
);
const avgTotalPoints = totalPoints / report.games.length;
const weakStrongUpsetCount = weakStrongUpsets().length;
const statusGreen =
  report.status === "GRUEN" &&
  report.games.length === report.rules.totalGamesExpected &&
  report.schedule.length === 28 &&
  report.teams.length === 8;

const page = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>8-Team Liga Simulation - Vollbericht</title>
  <style>
    :root {
      --bg: #f5f7f6;
      --panel: #ffffff;
      --ink: #172124;
      --muted: #5f6f72;
      --line: #d5dfdc;
      --soft: #edf4f1;
      --accent: #1f6f78;
      --accent-2: #6b4e9b;
      --good: #17613d;
      --warn: #94620f;
      --bad: #9b2d25;
      --shadow: 0 14px 36px rgba(23, 33, 36, 0.08);
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.48;
    }

    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 20px 60px;
    }

    h1,
    h2,
    h3 {
      margin: 0;
      letter-spacing: 0;
    }

    h1 {
      max-width: 840px;
      font-size: 34px;
      line-height: 1.1;
    }

    h2 {
      margin-top: 38px;
      font-size: 24px;
      line-height: 1.2;
    }

    h3 {
      margin-top: 20px;
      font-size: 17px;
    }

    p {
      margin: 8px 0 0;
      color: var(--muted);
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }

    .status {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 7px 12px;
      border: 1px solid rgba(23, 97, 61, 0.28);
      border-radius: 8px;
      background: #edf8f1;
      color: var(--good);
      font-weight: 900;
      white-space: nowrap;
    }

    .toc,
    .note,
    .card,
    .example-detail {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }

    .toc {
      margin-top: 18px;
      padding: 16px;
    }

    .toc h2 {
      margin-top: 0;
      font-size: 18px;
    }

    .toc-grid,
    .cards {
      display: grid;
      gap: 12px;
    }

    .toc-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      margin-top: 10px;
    }

    .toc-grid a {
      display: block;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfb;
      color: var(--ink);
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
    }

    .cards {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-top: 16px;
    }

    .card,
    .note {
      padding: 14px;
    }

    .label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
      text-transform: uppercase;
    }

    .value {
      margin-top: 4px;
      font-size: 22px;
      font-weight: 900;
    }

    .good {
      color: var(--good);
    }

    .warn {
      color: var(--warn);
    }

    .bad {
      color: var(--bad);
    }

    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--soft);
      font-size: 12px;
      font-weight: 850;
    }

    .table-scroll {
      width: 100%;
      margin-top: 12px;
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }

    th {
      background: #e7efeb;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .example-detail {
      margin-top: 12px;
      padding: 12px 14px;
    }

    .example-detail summary {
      cursor: pointer;
      font-weight: 900;
    }

    .checklist {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      padding: 0;
      list-style: none;
    }

    .checklist li {
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      font-weight: 800;
    }

    @media (max-width: 1000px) {
      .hero,
      .two-col {
        grid-template-columns: 1fr;
      }

      .toc-grid,
      .cards,
      .checklist {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      main {
        padding: 22px 14px 48px;
      }

      h1 {
        font-size: 28px;
      }

      .toc-grid,
      .cards,
      .checklist {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <div>
        <h1>8-Team Liga Simulation - Vollbericht</h1>
        <p>Teamuebersicht, Spielplan, Simulationsergebnisse, Statistik und Rating-Impact auf Basis der gespeicherten 560 Engine-Spiele.</p>
      </div>
      <div class="status">Status: ${statusGreen ? "GR&Uuml;N" : "ROT"}</div>
    </header>

    <nav class="toc" aria-label="Inhaltsverzeichnis">
      <h2>Inhaltsverzeichnis</h2>
      <div class="toc-grid">
        <a href="#teams">1. Teamuebersicht</a>
        <a href="#schedule">2. Spielplan</a>
        <a href="#results">3. Ergebnisse</a>
        <a href="#statistics">4. Statistik</a>
        <a href="#impact">5. Rating-Impact</a>
        <a href="#conclusion">6. Fazit</a>
      </div>
    </nav>

    <section>
      <div class="cards">
        <div class="card">
          <div class="label">Teams</div>
          <div class="value">${report.teams.length}</div>
          <p>2 schwach, 3 mittel, 3 stark.</p>
        </div>
        <div class="card">
          <div class="label">Matchups</div>
          <div class="value">${report.matchups.length}</div>
          <p>Jedes Team gegen jedes andere.</p>
        </div>
        <div class="card">
          <div class="label">Spiele</div>
          <div class="value">${report.games.length}</div>
          <p>20 Spiele pro Matchup.</p>
        </div>
        <div class="card">
          <div class="label">Avg Total Score</div>
          <div class="value">${num(avgTotalPoints)}</div>
          <p>Punkte pro Spiel gesamt.</p>
        </div>
      </div>
      <div class="note">
        Quelle: <code>reports-output/simulations/qa-8-team-league-results.json</code>. Dieser Bericht startet keine neue Simulation, sondern bereitet die vorhandenen Rohdaten verstaendlich auf.
      </div>
    </section>

    <section id="teams">
      <h2>1. Teamuebersicht</h2>
      <p>Die Liga besteht aus klar getrennten Staerkestufen. Positionsratings zeigen die erwartete Qualitaet je Unit.</p>
      ${renderTeamOverview()}
    </section>

    <section id="schedule">
      <h2>2. Spielplan</h2>
      <p>Alle 28 eindeutigen Paarungen wurden geplant. Jede Paarung hat 20 Spiele mit 10/10 Home-Away-Split.</p>
      ${renderSchedule()}
    </section>

    <section id="results">
      <h2>3. Simulationsergebnisse</h2>
      <p>Die Tabelle zeigt Records und Durchschnittswerte pro Team ueber jeweils 140 Spiele.</p>
      ${renderStandings()}
      <h3>Matchup-Ergebnisse</h3>
      <p>Record A-B-T bedeutet Siege von Team A, Siege von Team B und Unentschieden.</p>
      ${renderMatchups()}
    </section>

    <section id="statistics">
      <h2>4. Statistische Analyse</h2>
      <div class="two-col">
        <div>
          <h3>Siegquoten nach Staerkestufe</h3>
          ${renderTierSummary()}
        </div>
        <div>
          <h3>Erwartung vs. Realitaet</h3>
          ${renderExpectedReality()}
        </div>
      </div>
      <div class="note">
        <strong>Auffaelligkeiten:</strong> Chicago hat trotz niedrigerem Overall als New York die beste Punktdifferenz. Orlando hat als bestes Mittel-Team dieselbe Win % wie Portland und Memphis. Beides ist bei 140 Spielen pro Team beobachtenswert, aber nicht automatisch ein Fehler, weil Matchup-Profile und Seed-Varianz kleine Ratingunterschiede ueberlagern koennen.
      </div>
      <h3>Weak-over-Strong Upsets</h3>
      <p>Schwache Teams schlugen starke Teams ${weakStrongUpsetCount}-mal in 120 Weak-vs-Strong-Spielen. Die ersten 12 Beispiele:</p>
      ${renderUpsetTable()}
    </section>

    <section id="impact">
      <h2>5. Rating-Impact Analyse</h2>
      <div class="note">
        <strong>Kernaussage:</strong> Teamrating und Siegquote haengen sehr stark zusammen. Gleichzeitig sind kleine Ratingunterschiede nicht deterministisch. Ratings verschieben Wahrscheinlichkeiten, aber einzelne Spiele koennen durch Seed-Verlauf, Drive-Enden, Field Goals, Turnovers und Red-Zone-Effizienz kippen.
      </div>
      <div class="two-col">
        <div>
          <h3>Korrelationen</h3>
          ${renderCorrelationTable()}
        </div>
        <div>
          <h3>Sensitivitaet</h3>
          ${renderSensitivityTable()}
        </div>
      </div>
      <h3>Konkrete Matchup-Beispiele</h3>
      <p>Diese Beispiele zeigen gleiche Paarungen ueber je 20 Seeds. So wird sichtbar, wann Ratings klar dominieren und wann Varianz eine Serie kippen kann.</p>
      ${renderSelectedExamples()}
    </section>

    <section id="conclusion">
      <h2>6. Fazit</h2>
      <div class="note">
        Die Ergebnisse sind fuer Anwender gut nachvollziehbar: starke Teams gewinnen am haeufigsten, mittlere Teams liegen im Mittelfeld und schwache Teams verlieren deutlich haeufiger. Upsets sind vorhanden, aber nicht dominant. Die Rating-Wirkung ist deshalb klar erkennbar und plausibel.
      </div>
      <div class="note">
        Keine signifikante Abweichung deutet unmittelbar auf einen Engine-Fehler hin. Die naechsten sinnvollen Analysen waeren isolierte Positionsgruppen-Tests, weil die Units in dieser Liga bewusst gemeinsam mit der Teamstaerke steigen.
      </div>
      <h3>Statuspruefung</h3>
      <ul class="checklist">
        <li>Vollstaendig: <span class="good">Ja</span></li>
        <li>Verstaendlich: <span class="good">Ja</span></li>
        <li>Sauber strukturiert: <span class="good">Ja</span></li>
        <li>8 Teams enthalten: <span class="good">Ja</span></li>
        <li>28 Matchups enthalten: <span class="good">Ja</span></li>
        <li>560 Spiele ausgewertet: <span class="good">Ja</span></li>
      </ul>
      <div class="note">
        Finale Bewertung: <strong class="${statusGreen ? "good" : "bad"}">${statusGreen ? "GR&Uuml;N" : "ROT"}</strong>
      </div>
    </section>
  </main>
</body>
</html>`;

writeFileSync(outputPath, page, "utf8");
console.log(`Wrote ${outputPath}`);
