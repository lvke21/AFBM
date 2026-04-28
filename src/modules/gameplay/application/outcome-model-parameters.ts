import type {
  DefensivePlayFamily,
  OffensivePlayFamily,
} from "../domain/play-library";

export type PassFamilyResolutionParameters = {
  airYardsMean: number;
  airYardsSpread: number;
  baseCompletionBias: number;
  pressureMitigation: number;
  explosiveBias: number;
  yardsAfterCatchMean: number;
  interceptionBias: number;
};

export type RunFamilyResolutionParameters = {
  baseYardsMean: number;
  baseYardsSpread: number;
  stuffedBias: number;
  explosiveBias: number;
  fumbleBias: number;
};

export type OutcomeModelParameters = {
  ratingCenter: number;
  ratingScale: number;
  pass: {
    basePressureRate: number;
    baseSackRate: number;
    baseThrowawayRate: number;
    baseInterceptionRate: number;
    stripSackRate: number;
    completionPressurePenalty: number;
    families: Record<OffensivePlayFamily, PassFamilyResolutionParameters>;
  };
  run: {
    baseStuffedRate: number;
    baseExplosiveRate: number;
    baseFumbleRate: number;
    families: Record<OffensivePlayFamily, RunFamilyResolutionParameters>;
  };
  offenseDefenseFamilyBonuses: {
    pressureByDefense: Record<DefensivePlayFamily, number>;
    coverageDisruptionByDefense: Record<DefensivePlayFamily, number>;
    runFitByDefense: Record<DefensivePlayFamily, number>;
  };
  successThresholds: {
    firstDownShare: number;
    secondDownShare: number;
  };
};

const DEFAULT_PASS_FAMILY = {
  airYardsMean: 8,
  airYardsSpread: 3,
  baseCompletionBias: 0,
  pressureMitigation: 0,
  explosiveBias: 0,
  yardsAfterCatchMean: 4,
  interceptionBias: 0,
} satisfies PassFamilyResolutionParameters;

const DEFAULT_RUN_FAMILY = {
  baseYardsMean: 4.2,
  baseYardsSpread: 2.2,
  stuffedBias: 0,
  explosiveBias: 0,
  fumbleBias: 0,
} satisfies RunFamilyResolutionParameters;

export const DEFAULT_OUTCOME_MODEL_PARAMETERS: OutcomeModelParameters = {
  ratingCenter: 72,
  ratingScale: 18,
  pass: {
    basePressureRate: 0.28,
    baseSackRate: 0.065,
    baseThrowawayRate: 0.032,
    baseInterceptionRate: 0.026,
    stripSackRate: 0.14,
    completionPressurePenalty: 0.105,
    families: {
      ZONE_RUN: DEFAULT_PASS_FAMILY,
      GAP_RUN: DEFAULT_PASS_FAMILY,
      DESIGNED_QB_RUN: DEFAULT_PASS_FAMILY,
      OPTION_RPO: {
        airYardsMean: 5,
        airYardsSpread: 2.5,
        baseCompletionBias: 0.08,
        pressureMitigation: 0.12,
        explosiveBias: 0.02,
        yardsAfterCatchMean: 5.5,
        interceptionBias: -0.01,
      },
      QUICK_PASS: {
        airYardsMean: 5.5,
        airYardsSpread: 2.2,
        baseCompletionBias: 0.14,
        pressureMitigation: 0.18,
        explosiveBias: -0.01,
        yardsAfterCatchMean: 5.2,
        interceptionBias: -0.01,
      },
      DROPBACK: {
        airYardsMean: 12,
        airYardsSpread: 4.3,
        baseCompletionBias: 0.025,
        pressureMitigation: -0.02,
        explosiveBias: 0.08,
        yardsAfterCatchMean: 3.4,
        interceptionBias: 0.015,
      },
      PLAY_ACTION: {
        airYardsMean: 10.5,
        airYardsSpread: 4,
        baseCompletionBias: 0.065,
        pressureMitigation: 0.08,
        explosiveBias: 0.1,
        yardsAfterCatchMean: 4.2,
        interceptionBias: 0.005,
      },
      MOVEMENT_PASS: {
        airYardsMean: 8.5,
        airYardsSpread: 3.1,
        baseCompletionBias: 0.09,
        pressureMitigation: 0.16,
        explosiveBias: 0.04,
        yardsAfterCatchMean: 4.6,
        interceptionBias: -0.005,
      },
      SCREEN: {
        airYardsMean: -1,
        airYardsSpread: 1.2,
        baseCompletionBias: 0.18,
        pressureMitigation: 0.28,
        explosiveBias: 0.06,
        yardsAfterCatchMean: 8.5,
        interceptionBias: -0.02,
      },
      EMPTY_TEMPO: {
        airYardsMean: 6.5,
        airYardsSpread: 2.4,
        baseCompletionBias: 0.12,
        pressureMitigation: 0.22,
        explosiveBias: 0.01,
        yardsAfterCatchMean: 4.8,
        interceptionBias: -0.012,
      },
    },
  },
  run: {
    baseStuffedRate: 0.19,
    baseExplosiveRate: 0.085,
    baseFumbleRate: 0.012,
    families: {
      ZONE_RUN: {
        baseYardsMean: 4.5,
        baseYardsSpread: 2.3,
        stuffedBias: -0.01,
        explosiveBias: 0.01,
        fumbleBias: 0,
      },
      GAP_RUN: {
        baseYardsMean: 4.8,
        baseYardsSpread: 2.5,
        stuffedBias: 0.015,
        explosiveBias: 0.025,
        fumbleBias: 0.001,
      },
      DESIGNED_QB_RUN: {
        baseYardsMean: 5.1,
        baseYardsSpread: 2.8,
        stuffedBias: 0.005,
        explosiveBias: 0.04,
        fumbleBias: 0.002,
      },
      OPTION_RPO: {
        baseYardsMean: 4.9,
        baseYardsSpread: 2.6,
        stuffedBias: -0.015,
        explosiveBias: 0.03,
        fumbleBias: 0,
      },
      QUICK_PASS: DEFAULT_RUN_FAMILY,
      DROPBACK: DEFAULT_RUN_FAMILY,
      PLAY_ACTION: DEFAULT_RUN_FAMILY,
      MOVEMENT_PASS: DEFAULT_RUN_FAMILY,
      SCREEN: DEFAULT_RUN_FAMILY,
      EMPTY_TEMPO: DEFAULT_RUN_FAMILY,
    },
  },
  offenseDefenseFamilyBonuses: {
    pressureByDefense: {
      MATCH_COVERAGE: 0.01,
      ZONE_COVERAGE: 0,
      MAN_COVERAGE: 0.025,
      ZERO_PRESSURE: 0.1,
      FIRE_ZONE: 0.075,
      SIMULATED_PRESSURE: 0.055,
      DROP_EIGHT: -0.015,
      RUN_BLITZ: 0.085,
      BRACKET_SPECIALTY: 0.01,
      THREE_HIGH_PACKAGE: -0.01,
      RED_ZONE_PACKAGE: 0.03,
    },
    coverageDisruptionByDefense: {
      MATCH_COVERAGE: 0.03,
      ZONE_COVERAGE: 0.01,
      MAN_COVERAGE: 0.04,
      ZERO_PRESSURE: 0.015,
      FIRE_ZONE: 0.02,
      SIMULATED_PRESSURE: 0.025,
      DROP_EIGHT: 0.045,
      RUN_BLITZ: 0.01,
      BRACKET_SPECIALTY: 0.05,
      THREE_HIGH_PACKAGE: 0.04,
      RED_ZONE_PACKAGE: 0.035,
    },
    runFitByDefense: {
      MATCH_COVERAGE: 0.02,
      ZONE_COVERAGE: 0.03,
      MAN_COVERAGE: -0.01,
      ZERO_PRESSURE: 0.015,
      FIRE_ZONE: 0.025,
      SIMULATED_PRESSURE: 0.015,
      DROP_EIGHT: -0.02,
      RUN_BLITZ: 0.08,
      BRACKET_SPECIALTY: 0.01,
      THREE_HIGH_PACKAGE: 0.005,
      RED_ZONE_PACKAGE: 0.06,
    },
  },
  successThresholds: {
    firstDownShare: 0.45,
    secondDownShare: 0.6,
  },
};
