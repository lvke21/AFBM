import { GAME_BALANCE } from "./game-balance";

export const MATCH_ENGINE_RULES = {
  driveCount: {
    offensivePlaysPerDriveRange: GAME_BALANCE.drive.count.offensivePlaysPerDriveRange as [number, number],
    baseDrivesPerTeam: GAME_BALANCE.drive.count.baseDrivesPerTeam,
  },
  environment: {
    homeFieldEdge: GAME_BALANCE.environment.homeFieldEdge,
    passExplosiveYards: GAME_BALANCE.environment.passExplosiveYards,
    rushExplosiveYards: GAME_BALANCE.environment.rushExplosiveYards,
  },
  snapShares: {
    starter: GAME_BALANCE.snapShares.starter,
    rotation: GAME_BALANCE.snapShares.rotation,
    reserve: GAME_BALANCE.snapShares.reserve,
  },
  overtime: {
    maxRounds: GAME_BALANCE.overtime.maxRounds,
    tiebreakRollRange: GAME_BALANCE.overtime.tiebreakRollRange as [number, number],
  },
  rotations: {
    rushContributors: GAME_BALANCE.rotations.rushContributors,
    targetContributors: GAME_BALANCE.rotations.targetContributors,
    tackleContributors: GAME_BALANCE.rotations.tackleContributors,
    passRushContributors: GAME_BALANCE.rotations.passRushContributors,
    coverageContributors: GAME_BALANCE.rotations.coverageContributors,
  },
} as const;

export const INJURY_AVAILABILITY_RULES = {
  HEALTHY: {
    activeChance: 1,
    readinessPenalty: 0,
    snapMultiplier: 1,
  },
  QUESTIONABLE: {
    activeChance: 0.86,
    readinessPenalty: 0.08,
    snapMultiplier: 0.82,
  },
  DOUBTFUL: {
    activeChance: 0.34,
    readinessPenalty: 0.18,
    snapMultiplier: 0.48,
  },
  OUT: {
    activeChance: 0,
    readinessPenalty: 1,
    snapMultiplier: 0,
  },
  INJURED_RESERVE: {
    activeChance: 0,
    readinessPenalty: 1,
    snapMultiplier: 0,
  },
} as const;

export const PLAYER_CONDITION_RULES = {
  injury: {
    baseChance: 0.015,
    exposureMultiplier: 0.035,
    minChance: 0.015,
    maxChance: 0.18,
  },
  recovery: {
    HEALTHY: {
      fatigueRecovery: 12,
      moraleRecovery: 1,
    },
    QUESTIONABLE: {
      fatigueRecovery: 9,
      moraleRecovery: 0,
    },
    DOUBTFUL: {
      fatigueRecovery: 7,
      moraleRecovery: 0,
    },
    OUT: {
      fatigueRecovery: 5,
      moraleRecovery: -1,
    },
    INJURED_RESERVE: {
      fatigueRecovery: 5,
      moraleRecovery: -1,
    },
  },
} as const;
