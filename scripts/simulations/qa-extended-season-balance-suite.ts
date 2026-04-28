import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  runExtendedSeasonBalanceSuite,
  type ExtendedSeasonBalanceRun,
} from "../../src/modules/seasons/application/simulation/extended-season-balance-suite";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderRows<T extends Record<string, unknown>>(rows: T[], columns: Array<keyof T>) {
  return rows
    .map(
      (row) => `<tr>${columns
        .map((column) => `<td>${escapeHtml(String(row[column] ?? ""))}</td>`)
        .join("")}</tr>`,
    )
    .join("\n");
}

function renderTable<T extends Record<string, unknown>>(
  title: string,
  rows: T[],
  columns: Array<keyof T>,
) {
  return `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(String(column))}</th>`).join("")}</tr></thead>
      <tbody>${renderRows(rows, columns)}</tbody>
    </table>
  `;
}

function renderHtml(run: ExtendedSeasonBalanceRun) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Extended Season Balance Results</title>
  <style>
    body { background: #101419; color: #e8edf2; font-family: Inter, system-ui, sans-serif; margin: 0; padding: 32px; }
    main { max-width: 1180px; margin: 0 auto; }
    h1, h2 { color: #ffffff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .card { border: 1px solid #293340; border-radius: 8px; background: #161d25; padding: 14px; }
    .label { color: #9fb0c0; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .value { font-size: 24px; font-weight: 700; margin-top: 6px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 28px; font-size: 13px; }
    th, td { border-bottom: 1px solid #293340; padding: 9px; text-align: left; }
    th { color: #9fb0c0; font-weight: 600; }
    code { color: #9bd5ff; }
  </style>
</head>
<body>
<main>
  <h1>Extended Season Balance Results</h1>
  <p>Reproduzierbarer Balance-Lauf mit ${run.seasons} Saisons, ${run.weeksPerSeason} Wochen pro Saison, Schedule <code>${escapeHtml(run.schedule.variant)}</code> und ${run.metrics.games} Spielen. Fingerprint: <code>${escapeHtml(run.fingerprint)}</code></p>
  <section class="grid">
    <div class="card"><div class="label">Games</div><div class="value">${run.metrics.games}</div></div>
    <div class="card"><div class="label">Schedule</div><div class="value">${run.schedule.variant}</div></div>
    <div class="card"><div class="label">Avg Score</div><div class="value">${run.metrics.averageScore}</div></div>
    <div class="card"><div class="label">Avg Margin</div><div class="value">${run.metrics.averageMargin}</div></div>
    <div class="card"><div class="label">Blowout Rate</div><div class="value">${run.metrics.blowoutRate}</div></div>
    <div class="card"><div class="label">Close Rate</div><div class="value">${run.metrics.closeGameRate}</div></div>
    <div class="card"><div class="label">Injury/Game</div><div class="value">${run.metrics.injuryRate}</div></div>
    <div class="card"><div class="label">Severe/Game</div><div class="value">${run.metrics.severeInjuryRate}</div></div>
    <div class="card"><div class="label">XP Avg</div><div class="value">${run.metrics.progressionXpAverage}</div></div>
    <div class="card"><div class="label">SoS Spread</div><div class="value">${run.schedule.fairness.averageOpponentRatingSpread}</div></div>
  </section>
  ${renderTable("Strength of Schedule", run.schedule.strengthOfSchedule as unknown as Record<string, unknown>[], [
    "teamId",
    "teamProfile",
    "teamRating",
    "games",
    "homeGames",
    "awayGames",
    "averageOpponentRating",
    "ratingDeltaAverage",
  ])}
  ${renderTable("Availability: Teams", run.availability.byTeam as unknown as Record<string, unknown>[], [
    "teamId",
    "teamProfile",
    "samples",
    "averageAvailabilityIndex",
    "averageEffectiveDepthRating",
    "averageStarterLossCount",
    "maxStarterLossCount",
    "averageBackupUsageRate",
    "averageStarterFatigue",
    "averageBackupFatigue",
  ])}
  ${renderTable("Availability: Wochen", run.availability.byWeek as unknown as Record<string, unknown>[], [
    "week",
    "samples",
    "averageAvailabilityIndex",
    "averageEffectiveDepthRating",
    "averageStarterLossCount",
    "averageBackupUsageRate",
  ])}
  ${renderTable("Matchup Distribution", run.schedule.matchups as unknown as Record<string, unknown>[], [
    "pair",
    "profiles",
    "games",
    "homeGames",
    "awayGames",
  ])}
  ${renderTable("Szenarien", run.scenarios as unknown as Record<string, unknown>[], [
    "name",
    "gameCount",
    "averageScore",
    "averageMargin",
    "favoriteWinRate",
    "homeWinRate",
    "blowoutRate",
    "closeGameRate",
    "injuryRate",
    "severeInjuryRate",
    "averageFatigue",
    "averageProgressionXp",
  ])}
  ${renderTable("Teams", run.teams as unknown as Record<string, unknown>[], [
    "teamId",
    "profile",
    "wins",
    "losses",
    "winRate",
    "newInjuries",
    "severeInjuries",
    "averageFatigue",
  ])}
  ${renderTable("AI/Gameplan Archetypes", run.strategies as unknown as Record<string, unknown>[], [
    "archetype",
    "games",
    "winRate",
    "averageScore",
  ])}
  ${renderTable("Margin Attribution: Wochen", run.diagnostics.byWeek as unknown as Record<string, unknown>[], [
    "key",
    "games",
    "averageMargin",
    "blowoutRate",
    "closeGameRate",
    "averageWinnerScore",
    "averageLoserScore",
  ])}
  ${renderTable("Margin Attribution: Profile", run.diagnostics.byProfilePair as unknown as Record<string, unknown>[], [
    "key",
    "games",
    "averageMargin",
    "blowoutRate",
    "closeGameRate",
    "averageWinnerScore",
    "averageLoserScore",
  ])}
  ${renderTable("Margin Attribution: Fatigue", run.diagnostics.byFatigueBand as unknown as Record<string, unknown>[], [
    "key",
    "games",
    "averageMargin",
    "blowoutRate",
    "closeGameRate",
  ])}
  ${renderTable("Margin Attribution: Injuries", run.diagnostics.byInjuryCountBand as unknown as Record<string, unknown>[], [
    "key",
    "games",
    "averageMargin",
    "blowoutRate",
    "closeGameRate",
  ])}
  ${renderTable("Margin Attribution: Availability", run.diagnostics.byAvailabilityBand as unknown as Record<string, unknown>[], [
    "key",
    "games",
    "averageMargin",
    "blowoutRate",
    "closeGameRate",
  ])}
  ${renderTable("Margin Attribution: Backup Usage", run.diagnostics.byBackupUsageBand as unknown as Record<string, unknown>[], [
    "key",
    "games",
    "averageMargin",
    "blowoutRate",
    "closeGameRate",
  ])}
  ${renderTable("Margin Attribution: Effective Depth", run.diagnostics.byEffectiveDepthRatingBand as unknown as Record<string, unknown>[], [
    "key",
    "games",
    "averageMargin",
    "blowoutRate",
    "closeGameRate",
  ])}
  ${renderTable("Margin Attribution: AI/Gameplan", run.diagnostics.byAiArchetypePair as unknown as Record<string, unknown>[], [
    "key",
    "games",
    "averageMargin",
    "blowoutRate",
    "closeGameRate",
  ])}
  ${renderTable("Margin Correlations", run.diagnostics.correlations as unknown as Record<string, unknown>[], [
    "factor",
    "correlation",
  ])}
  ${renderTable("Score Spike Patterns", run.diagnostics.scoreSpikePatterns as unknown as Record<string, unknown>[], [
    "type",
    "games",
    "rate",
    "averageMargin",
  ])}
  <h2>Interpretation</h2>
  <p>Die Suite ist fuer Trendanalyse gedacht: Winrates, Score-Verteilung, Fatigue, Injuries, Progression-XP, AI-Archetypes und Margin-Attribution werden in einem stabilen Schema ausgegeben. Sie ersetzt keine manuelle Balance-Entscheidung, gibt aber reproduzierbare Daten fuer Folgepakete.</p>
</main>
</body>
</html>`;
}

const run = runExtendedSeasonBalanceSuite();
const reportDir = join(process.cwd(), "reports-output", "simulations");
const jsonPath = join(reportDir, "extended-season-balance-results.json");
const htmlPath = join(reportDir, "extended-season-balance-results.html");

mkdirSync(reportDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(run, null, 2)}\n`);
writeFileSync(htmlPath, renderHtml(run));

console.log(JSON.stringify({
  status: "GRUEN",
  scheduleVariant: run.schedule.variant,
  strengthOfScheduleSpread: run.schedule.fairness.averageOpponentRatingSpread,
  gamesPerTeamSpread: run.schedule.fairness.gamesPerTeamSpread,
  games: run.metrics.games,
  averageScore: run.metrics.averageScore,
  averageMargin: run.metrics.averageMargin,
  blowoutRate: run.metrics.blowoutRate,
  closeGameRate: run.metrics.closeGameRate,
  injuryRate: run.metrics.injuryRate,
  severeInjuryRate: run.metrics.severeInjuryRate,
  progressionXpAverage: run.metrics.progressionXpAverage,
  fingerprint: run.fingerprint,
  json: jsonPath,
  html: htmlPath,
}, null, 2));
