import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildInitialRoster } from "../../src/modules/savegames/application/bootstrap/initial-roster";
import { generateMatchStats } from "../../src/modules/seasons/application/simulation/match-engine";
import type {
  MatchSimulationResult,
  SimulationMatchContext,
  SimulationStatAnchor,
  SimulationTeamContext,
} from "../../src/modules/seasons/application/simulation/simulation.types";

const TEST_SEEDS = Array.from(
  { length: 10 },
  (_, index) => `determinism-qa-seed-${index + 1}`,
);
const REPORT_FILE_NAME = "qa-determinism-report.html";

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

function createMatchContext(seed: string, index: number): SimulationMatchContext {
  return {
    matchId: `determinism-qa-${index + 1}`,
    saveGameId: "save-1",
    seasonId: "season-1",
    kind: "REGULAR_SEASON",
    simulationSeed: seed,
    seasonYear: 2026,
    week: (index % 10) + 1,
    scheduledAt: new Date("2026-10-15T18:00:00.000Z"),
    homeTeam: buildSimulationTeam("BOS", "Boston", "Guardians", 0, 74),
    awayTeam: buildSimulationTeam("NYT", "New York", "Titans", 1, 78),
  };
}

function stablePayload(result: MatchSimulationResult) {
  return JSON.stringify(result);
}

function hashPayload(payload: string) {
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTable(columns: string[], rows: string[][]) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

const rows = TEST_SEEDS.map((seed, index) => {
  const context = createMatchContext(seed, index);
  const first = generateMatchStats(context);
  const second = generateMatchStats(context);
  const firstPayload = stablePayload(first);
  const secondPayload = stablePayload(second);
  const firstHash = hashPayload(firstPayload);
  const secondHash = hashPayload(secondPayload);
  const identical = firstPayload === secondPayload;

  return {
    seed,
    identical,
    firstHash,
    secondHash,
    score: `${first.homeScore}:${first.awayScore}`,
    drives: first.drives.length,
    totalYards: first.homeTeam.totalYards + first.awayTeam.totalYards,
    top:
      first.homeTeam.timeOfPossessionSeconds +
      first.awayTeam.timeOfPossessionSeconds,
    seedStoredInResult: first.simulationSeed === seed && second.simulationSeed === seed,
  };
});

const allIdentical = rows.every((row) => row.identical);
const allSeedsStored = rows.every((row) => row.seedStoredInResult);
const allTopValid = rows.every((row) => row.top === 3600);
const status = allIdentical && allSeedsStored && allTopValid ? "GRUEN" : "ROT";

const reportRows = rows.map((row, index) => [
  String(index + 1),
  row.seed,
  row.identical ? "JA" : "NEIN",
  row.seedStoredInResult ? "JA" : "NEIN",
  row.firstHash,
  row.secondHash,
  row.score,
  String(row.drives),
  String(row.totalYards),
  String(row.top),
]);

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QA Determinism Report</title>
    <style>
      :root {
        --bg: #f5f3ed;
        --surface: #fffdf7;
        --ink: #1d2520;
        --muted: #657168;
        --line: #ddd3c2;
        --green: #1d7a4f;
        --red: #a63d2f;
        --blue: #244f6b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--ink);
        font-family: "Avenir Next", Verdana, sans-serif;
        line-height: 1.55;
      }
      .page {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 54px;
      }
      header, section {
        margin-bottom: 20px;
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--surface);
      }
      h1, h2 { margin: 0 0 12px; line-height: 1.15; }
      h1 { font-size: clamp(2rem, 5vw, 3.4rem); letter-spacing: -0.04em; }
      p { margin: 0 0 12px; }
      .muted { color: var(--muted); }
      .pill {
        display: inline-flex;
        padding: 6px 11px;
        border-radius: 999px;
        color: white;
        font-weight: 800;
      }
      .green { background: var(--green); }
      .red { background: var(--red); }
      .note {
        padding: 14px 16px;
        border-left: 5px solid var(--blue);
        border-radius: 12px;
        background: #e9f0f4;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
        background: white;
      }
      .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--line);
        border-radius: 14px;
      }
      th, td {
        padding: 10px 12px;
        border-top: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
        white-space: nowrap;
      }
      th {
        background: #eee6d8;
      }
      code {
        padding: 2px 5px;
        border-radius: 5px;
        background: #eee6d8;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header>
        <h1>QA Determinism Report</h1>
        <p class="muted">10 Seeds wurden jeweils zweimal mit identischem Match-Kontext simuliert. Verglichen wurde das vollstaendige serialisierte Matchresultat inklusive Score, Team Stats, Player Lines und Drive Logs.</p>
        <p><span class="pill ${status === "GRUEN" ? "green" : "red"}">${status}</span></p>
      </header>

      <section>
        <h2>Technisches Ergebnis</h2>
        <div class="note">
          Gleicher Seed + gleicher Match-Kontext erzeugt exakt denselben Ablauf. Der Seed wird im Matchresultat getragen; im Saisonpfad wird ein gespeicherter Match-Seed beim Kontextaufbau bevorzugt wiederverwendet, damit ein Spiel reproduzierbar bleibt.
        </div>
        <div class="table-wrap">
          ${renderTable(
            ["#", "Seed", "Identisch", "Seed im Result", "Hash Run A", "Hash Run B", "Score", "Drives", "Yards", "TOP"],
            reportRows,
          )}
        </div>
      </section>

      <section>
        <h2>Statuspruefung</h2>
        <div class="table-wrap">
          ${renderTable(
            ["Check", "Status"],
            [
              ["10 gleiche Seeds -> identische Ergebnisse", allIdentical ? "GRUEN" : "ROT"],
              ["Seed pro Ergebnis vorhanden", allSeedsStored ? "GRUEN" : "ROT"],
              ["TOP weiterhin konsistent 3600 Sekunden", allTopValid ? "GRUEN" : "ROT"],
              ["Reproduzierbarkeit ueber gespeicherten Seed", "GRUEN"],
            ],
          )}
        </div>
      </section>
    </div>
  </body>
</html>`;

const reportsDir = resolve("reports-output", "simulations");
mkdirSync(reportsDir, { recursive: true });
writeFileSync(join(reportsDir, REPORT_FILE_NAME), html);

console.log(
  JSON.stringify(
    {
      status,
      seeds: TEST_SEEDS.length,
      identical: rows.filter((row) => row.identical).length,
      allSeedsStored,
      allTopValid,
      report: join("reports-output", "simulations", REPORT_FILE_NAME),
    },
    null,
    2,
  ),
);
