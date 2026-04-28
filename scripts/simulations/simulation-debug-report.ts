import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import {
  createSimulationDebugReport,
  renderSimulationDebugHtml,
} from "../../src/modules/seasons/application/simulation/simulation-debug.service";

function readArg(name: string) {
  const index = process.argv.indexOf(name);

  if (index < 0) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

const seed =
  readArg("--seed") ??
  process.env.SIMULATION_DEBUG_SEED ??
  "simulation-debug-seed-1";
const matchId =
  readArg("--matchId") ??
  process.env.SIMULATION_DEBUG_MATCH_ID ??
  "simulation-debug-game-1";
const outputPath = resolve(
  readArg("--output") ??
    process.env.SIMULATION_DEBUG_OUTPUT ??
    join("reports-output", "simulations", "simulation-debug-report.html"),
);
const report = createSimulationDebugReport({ seed, matchId });

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, renderSimulationDebugHtml(report), "utf8");

console.log(
  JSON.stringify(
    {
      status: report.status,
      reportPath: outputPath,
      matchId: report.metadata.matchId,
      seed: report.metadata.seed,
      finalScore: report.finalScore,
      winner: report.winner?.abbreviation ?? null,
      drives: report.driveDebug.length,
      playOutcomeLogs: report.playOutcomeLogs.length,
      engineDecisionExamples: report.engineDecisionExamples.length,
      nativeSnapPlayByPlayAvailable: report.checks.nativeSnapPlayByPlayAvailable,
    },
    null,
    2,
  ),
);

process.exitCode = report.status === "GRUEN" ? 0 : 1;
