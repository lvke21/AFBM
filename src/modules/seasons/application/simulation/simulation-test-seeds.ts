import { MatchKind } from "@/modules/shared/domain/enums";

export const STANDARD_SIMULATION_TEST_SEEDS = {
  BALANCED_GAME: "balanced-game",
  EDGE_CASE: "edge-case",
  HIGH_SCORING: "high-scoring",
  LOW_RATING: "low-rating",
} as const;

export type StandardSimulationTestSeed =
  (typeof STANDARD_SIMULATION_TEST_SEEDS)[keyof typeof STANDARD_SIMULATION_TEST_SEEDS];

export type SimulationTestSeedScenario = {
  awayPrestige: number;
  awayRosterIndex: number;
  expectedBehavior: string;
  homePrestige: number;
  homeRosterIndex: number;
  kind: MatchKind;
  seed: StandardSimulationTestSeed;
};

export const SIMULATION_TEST_SEED_SCENARIOS = {
  [STANDARD_SIMULATION_TEST_SEEDS.BALANCED_GAME]: {
    awayPrestige: 76,
    awayRosterIndex: 1,
    expectedBehavior: "Balanced baseline fixture for normal scoring, winner and event-order replay checks.",
    homePrestige: 76,
    homeRosterIndex: 0,
    kind: MatchKind.REGULAR_SEASON,
    seed: STANDARD_SIMULATION_TEST_SEEDS.BALANCED_GAME,
  },
  [STANDARD_SIMULATION_TEST_SEEDS.HIGH_SCORING]: {
    awayPrestige: 87,
    awayRosterIndex: 3,
    expectedBehavior: "High-talent fixture for scoring volume, explosive-play and stat replay checks.",
    homePrestige: 89,
    homeRosterIndex: 2,
    kind: MatchKind.REGULAR_SEASON,
    seed: STANDARD_SIMULATION_TEST_SEEDS.HIGH_SCORING,
  },
  [STANDARD_SIMULATION_TEST_SEEDS.EDGE_CASE]: {
    awayPrestige: 78,
    awayRosterIndex: 5,
    expectedBehavior: "Close-strength fixture for late-game, turnover and event-sequence stability checks.",
    homePrestige: 78,
    homeRosterIndex: 4,
    kind: MatchKind.PLAYOFF,
    seed: STANDARD_SIMULATION_TEST_SEEDS.EDGE_CASE,
  },
  [STANDARD_SIMULATION_TEST_SEEDS.LOW_RATING]: {
    awayPrestige: 56,
    awayRosterIndex: 7,
    expectedBehavior: "Low-rating fixture for sloppy-game, punt-heavy and low-efficiency stat replay checks.",
    homePrestige: 55,
    homeRosterIndex: 6,
    kind: MatchKind.REGULAR_SEASON,
    seed: STANDARD_SIMULATION_TEST_SEEDS.LOW_RATING,
  },
} satisfies Record<StandardSimulationTestSeed, SimulationTestSeedScenario>;

export const STANDARD_SIMULATION_TEST_SEED_LIST = Object.values(STANDARD_SIMULATION_TEST_SEEDS);
