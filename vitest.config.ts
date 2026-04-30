import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

const includeFirestoreTests = process.env.AFBM_INCLUDE_FIRESTORE_TESTS === "true";
const includeSimulationQaTests = process.env.AFBM_INCLUDE_SIMULATION_QA === "true";

const firestoreEmulatorTestExcludes = includeFirestoreTests
  ? []
  : [
      "src/lib/firebase/firestore.rules.test.ts",
      "src/server/repositories/firestoreE2eParity.test.ts",
      "src/server/repositories/firestoreGameOutput.test.ts",
      "src/server/repositories/firestoreReportsReadModels.test.ts",
      "src/server/repositories/firestoreSeasonWeekMatch.test.ts",
      "src/server/repositories/firestoreStatsAggregates.test.ts",
      "src/server/repositories/firestoreTeamsPlayers.test.ts",
      "src/server/repositories/firestoreWeekMatchState.test.ts",
    ];

const simulationQaTestExcludes = includeSimulationQaTests
  ? []
  : [
      "src/modules/seasons/application/simulation/production-qa.test.ts",
      "src/modules/seasons/application/simulation/simulation-balancing.test.ts",
    ];

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/e2e/**",
      "**/reports/**",
      ...firestoreEmulatorTestExcludes,
      ...simulationQaTestExcludes,
    ],
  },
});
