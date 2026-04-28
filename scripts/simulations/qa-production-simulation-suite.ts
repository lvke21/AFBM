import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  EXPECTED_PRODUCTION_REGRESSION_FINGERPRINTS,
  PRODUCTION_QA_REPORT_DATE,
  assessEdgeCases,
  round,
  runProductionQaGames,
  runSeedRegressionQa,
  type ProductionQaAssessment,
  type ProductionQaEdgeCaseResult,
  type ProductionQaNumericSummary,
  type ProductionQaRegressionRecord,
  type ProductionQaRunResult,
  type ProductionQaStatus,
} from "../../src/modules/seasons/application/simulation/production-qa-suite";

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTable(columns: string[], rows: Array<Array<string | number>>) {
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function statusClass(status: ProductionQaStatus) {
  return status === "GRUEN" ? "good" : "bad";
}

function statusPill(label: string, status: ProductionQaStatus) {
  return `<span class="pill ${statusClass(status)}">${escapeHtml(label)}: ${status}</span>`;
}

function metricRow(label: string, summary: ProductionQaNumericSummary, digits = 1) {
  return [
    label,
    round(summary.avg, digits),
    round(summary.min, digits),
    round(summary.max, digits),
    round(summary.p10, digits),
    round(summary.median, digits),
    round(summary.p90, digits),
    round(summary.stdDev, digits),
  ];
}

function renderAssessmentCards(suite: ProductionQaRunResult) {
  const { assessment } = suite;
  const cards = [
    ["Spiele", suite.games.length],
    ["Suite ms", round(suite.suiteElapsedMs, 2)],
    ["Avg ms/Game", round(assessment.aggregate.summaries.runtimePerGameMs.avg, 3)],
    ["Critical", assessment.flags.criticalCount],
    ["Major", assessment.flags.majorCount],
    ["Avg Punkte", round(assessment.aggregate.summaries.pointsPerGame.avg)],
    ["Avg Yards/Team", round(assessment.aggregate.summaries.totalYardsPerTeam.avg)],
    ["Avg Explosives/Team", round(assessment.aggregate.summaries.explosivePlaysPerTeam.avg)],
  ];

  return `<div class="cards">${cards
    .map(
      ([label, value]) =>
        `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`,
    )
    .join("")}</div>`;
}

function renderAssessmentSection(title: string, suite: ProductionQaRunResult) {
  const { assessment } = suite;
  const metricRows = [
    metricRow("Punkte pro Spiel", assessment.aggregate.summaries.pointsPerGame),
    metricRow("Total Yards pro Spiel", assessment.aggregate.summaries.totalYardsPerGame),
    metricRow("Total Yards pro Team", assessment.aggregate.summaries.totalYardsPerTeam),
    metricRow("Passing Yards pro Team", assessment.aggregate.summaries.passingYardsPerTeam),
    metricRow("Rushing Yards pro Team", assessment.aggregate.summaries.rushingYardsPerTeam),
    metricRow("Passquote pro Team", assessment.aggregate.summaries.passRatePerTeam, 3),
    metricRow("First Downs pro Team", assessment.aggregate.summaries.firstDownsPerTeam),
    metricRow("Turnovers pro Team", assessment.aggregate.summaries.turnoversPerTeam),
    metricRow("Sacks pro Team", assessment.aggregate.summaries.sacksPerTeam),
    metricRow("Penalties pro Team", assessment.aggregate.summaries.penaltiesPerTeam),
    metricRow("Explosive Plays pro Team", assessment.aggregate.summaries.explosivePlaysPerTeam),
    metricRow("Red-Zone-Effizienz", assessment.aggregate.summaries.redZoneEfficiency, 3),
    metricRow("Drives pro Spiel", assessment.aggregate.summaries.drivesPerGame),
    metricRow("TOP pro Spiel Sekunden", assessment.aggregate.summaries.totalTopPerGameSeconds),
    metricRow("Runtime pro Spiel ms", assessment.aggregate.summaries.runtimePerGameMs, 3),
  ];
  const issueRows = assessment.issues.slice(0, 40).map((issue) => [
    issue.severity.toUpperCase(),
    issue.category,
    issue.scope,
    issue.message,
  ]);

  return `<section>
    <h2>${escapeHtml(title)}</h2>
    <div class="pill-row">
      ${statusPill("Gesamt", assessment.status)}
      ${statusPill("Technik", assessment.technicalStatus)}
      ${statusPill("Qualitaet", assessment.qualityStatus)}
      ${statusPill("Observability", assessment.observabilityStatus)}
    </div>
    ${renderAssessmentCards(suite)}
    <h3>Metriken</h3>
    ${renderTable(["Metrik", "Avg", "Min", "Max", "P10", "Median", "P90", "StdDev"], metricRows)}
    <h3>Qualitaetsbefunde</h3>
    ${
      assessment.qualityFindings.length > 0
        ? `<ul>${assessment.qualityFindings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")}</ul>`
        : "<p>Keine Qualitaetsbefunde.</p>"
    }
    <h3>Observability-Befunde</h3>
    ${
      assessment.observabilityFindings.length > 0
        ? `<ul>${assessment.observabilityFindings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")}</ul>`
        : "<p>Keine Observability-Befunde.</p>"
    }
    <h3>Technische Issues</h3>
    ${issueRows.length > 0 ? renderTable(["Severity", "Kategorie", "Scope", "Message"], issueRows) : "<p>Keine technischen Critical/Major Issues.</p>"}
  </section>`;
}

function summarizeRegression(rows: ProductionQaRegressionRecord[]) {
  const fingerprints = Object.fromEntries(rows.map((row) => [row.seed, row.fingerprint]));
  const expected = EXPECTED_PRODUCTION_REGRESSION_FINGERPRINTS as Record<string, string>;
  const baselineMatches = rows.every((row) => expected[row.seed] === row.fingerprint);
  const deterministic = rows.every((row) => row.identical && row.fingerprint === row.repeatedFingerprint);
  const status: ProductionQaStatus = baselineMatches && deterministic ? "GRUEN" : "ROT";

  return {
    status,
    baselineMatches,
    deterministic,
    fingerprints,
  };
}

function renderRegressionSection(rows: ProductionQaRegressionRecord[]) {
  const summary = summarizeRegression(rows);
  const tableRows = rows.map((row) => [
    row.seed,
    row.identical ? "JA" : "NEIN",
    row.fingerprint,
    row.repeatedFingerprint,
    (EXPECTED_PRODUCTION_REGRESSION_FINGERPRINTS as Record<string, string>)[row.seed] ?? "-",
    row.score,
    row.totalYards,
    row.drives,
  ]);

  return `<section>
    <h2>Seed-basierte Regression</h2>
    <div class="pill-row">
      ${statusPill("Status", summary.status)}
      <span class="pill ${summary.deterministic ? "good" : "bad"}">Deterministisch: ${summary.deterministic ? "JA" : "NEIN"}</span>
      <span class="pill ${summary.baselineMatches ? "good" : "bad"}">Baseline: ${summary.baselineMatches ? "JA" : "NEIN"}</span>
    </div>
    ${renderTable(["Seed", "Identisch", "Hash", "Repeat Hash", "Expected Hash", "Score", "Yards", "Drives"], tableRows)}
  </section>`;
}

function renderEdgeSection(edge: ProductionQaEdgeCaseResult) {
  const rows = [
    ["Endgame Drives", edge.endgameDriveCount],
    ["Late Trailing Decisions", edge.lateTrailingDecisionCount],
    ["Blowout Games", edge.blowoutGameCount],
    ["Garbage-Time Decisions", edge.garbageTimeDecisionCount],
    ["Red-Zone Stops", edge.redZoneStopCount],
    ["Backed-Up Drives", edge.backedUpDriveCount],
    ["Playoff decisive", edge.playoffDecisive ? "JA" : "NEIN"],
  ];
  const issueRows = edge.issues.map((issue) => [
    issue.severity.toUpperCase(),
    issue.category,
    issue.scope,
    issue.message,
  ]);

  return `<section>
    <h2>Edge Case Tests</h2>
    <div class="pill-row">${statusPill("Status", edge.status)}</div>
    <p>Gescannt wurden ${edge.scannedGames} deterministische Regular-Season-Spiele plus ein expliziter Playoff-Tie-Break-Case.</p>
    ${renderTable(["Case", "Count"], rows)}
    ${issueRows.length > 0 ? renderTable(["Severity", "Kategorie", "Scope", "Message"], issueRows) : "<p>Alle Edge-Coverage-Gates sind abgedeckt.</p>"}
  </section>`;
}

function buildHtmlReport(input: {
  overallStatus: ProductionQaStatus;
  smoke: ProductionQaRunResult;
  stability: ProductionQaRunResult;
  regression: ProductionQaRegressionRecord[];
  edge: ProductionQaEdgeCaseResult;
}) {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AFBM Production QA Simulation Suite ${PRODUCTION_QA_REPORT_DATE}</title>
  <style>
    :root {
      --bg: #f4f0e8;
      --panel: #fffdf8;
      --ink: #1f2824;
      --muted: #64706a;
      --line: #d9d0c2;
      --good: #17613d;
      --bad: #9b2d25;
      --accent: #214b5b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #f8f3ea 0%, var(--bg) 100%);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.5;
    }
    main {
      width: min(1440px, calc(100vw - 32px));
      margin: 24px auto 56px;
    }
    header, section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 22px;
      margin-bottom: 16px;
    }
    h1, h2, h3 { margin: 0 0 12px; line-height: 1.2; }
    h1 { font-size: 34px; color: var(--accent); }
    h2 { font-size: 24px; }
    h3 { font-size: 17px; margin-top: 18px; }
    p { margin: 0 0 12px; }
    .muted { color: var(--muted); }
    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 14px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
    }
    .good { color: var(--good); background: rgba(23, 97, 61, 0.12); }
    .bad { color: var(--bad); background: rgba(155, 45, 37, 0.12); }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 10px;
      margin: 12px 0 14px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      background: #faf6ee;
    }
    .label {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-bottom: 6px;
    }
    .value { font-size: 22px; font-weight: 700; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      overflow-x: auto;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 8px 9px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #eee7dc;
      color: #37413c;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: .04em;
    }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>AFBM Production QA Simulation Suite</h1>
      <p class="muted">Automatisierte Produktions-QA fuer Matchsimulation: 100 Spiele Smoke, 500 Spiele Stability, Seed-basierte Regression und Edge-Case-Coverage.</p>
      <div class="pill-row">${statusPill("Gesamtstatus", input.overallStatus)}</div>
    </header>
    ${renderAssessmentSection("100 Spiele Smoke Test", input.smoke)}
    ${renderAssessmentSection("500 Spiele Stability Test", input.stability)}
    ${renderRegressionSection(input.regression)}
    ${renderEdgeSection(input.edge)}
  </main>
</body>
</html>`;
}

function assessmentSummary(assessment: ProductionQaAssessment) {
  return {
    status: assessment.status,
    technicalStatus: assessment.technicalStatus,
    qualityStatus: assessment.qualityStatus,
    observabilityStatus: assessment.observabilityStatus,
    criticalIssues: assessment.flags.criticalCount,
    majorIssues: assessment.flags.majorCount,
    avgRuntimeMs: round(assessment.aggregate.summaries.runtimePerGameMs.avg, 3),
    avgPointsPerGame: round(assessment.aggregate.summaries.pointsPerGame.avg),
    avgYardsPerTeam: round(assessment.aggregate.summaries.totalYardsPerTeam.avg),
    technicalIssues: assessment.issues.slice(0, 20),
    qualityFindings: assessment.qualityFindings,
    observabilityFindings: assessment.observabilityFindings,
  };
}

function main() {
  const smoke = runProductionQaGames({
    suiteName: "Production Smoke 100",
    gameCount: 100,
    seedPrefix: "production-smoke",
  });
  const stability = runProductionQaGames({
    suiteName: "Production Stability 500",
    gameCount: 500,
    seedPrefix: "production-stability",
  });
  const regression = runSeedRegressionQa();
  const regressionSummary = summarizeRegression(regression);
  const edgeScan = runProductionQaGames({
    suiteName: "Production Edge Scan",
    gameCount: 160,
    seedPrefix: "production-edge",
  });
  const edge = assessEdgeCases(edgeScan.games);
  const overallStatus: ProductionQaStatus =
    smoke.assessment.status === "GRUEN" &&
    stability.assessment.status === "GRUEN" &&
    regressionSummary.status === "GRUEN" &&
    edge.status === "GRUEN"
      ? "GRUEN"
      : "ROT";
  const reportDir = resolve(process.cwd(), "reports-output", "simulations");
  const htmlPath = join(reportDir, `qa-production-simulation-suite-${PRODUCTION_QA_REPORT_DATE}.html`);
  const jsonPath = join(reportDir, `qa-production-simulation-suite-${PRODUCTION_QA_REPORT_DATE}.json`);
  const summary = {
    overallStatus,
    reportDate: PRODUCTION_QA_REPORT_DATE,
    reports: {
      html: htmlPath,
      json: jsonPath,
    },
    smoke: assessmentSummary(smoke.assessment),
    stability: assessmentSummary(stability.assessment),
    regression: regressionSummary,
    edge,
  };

  mkdirSync(reportDir, { recursive: true });
  writeFileSync(htmlPath, buildHtmlReport({ overallStatus, smoke, stability, regression, edge }), "utf8");
  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (overallStatus === "ROT") {
    process.exitCode = 1;
  }
}

main();
