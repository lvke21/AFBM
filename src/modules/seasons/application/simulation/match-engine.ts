import { prepareTeamForSimulation, type PreparedTeam } from "./depth-chart";
import { MATCH_ENGINE_RULES } from "./engine-rules";
import { GAME_BALANCE } from "./game-balance";
import type { PreGameXFactorPlan } from "@/modules/gameplay/domain/pre-game-x-factor";
import { createSeededRandom } from "./simulation-random";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  PlayerSimulationLine,
  SimulationMatchContext,
  SimulationPlayerContext,
  TeamSimulationResult,
} from "./simulation.types";

const OFFENSIVE_PLAYS_PER_DRIVE_RANGE =
  MATCH_ENGINE_RULES.driveCount.offensivePlaysPerDriveRange;
const BASE_DRIVES_PER_TEAM = MATCH_ENGINE_RULES.driveCount.baseDrivesPerTeam;
const HOME_FIELD_EDGE = MATCH_ENGINE_RULES.environment.homeFieldEdge;
const PASS_EXPLOSIVE_YARDS = MATCH_ENGINE_RULES.environment.passExplosiveYards;
const RUSH_EXPLOSIVE_YARDS = MATCH_ENGINE_RULES.environment.rushExplosiveYards;
const BALANCE = GAME_BALANCE;
const STARTER_LINEUP_BONUS = 1.04;
const BACKUP_LINEUP_PENALTY = 0.97;
const RESERVE_LINEUP_PENALTY = 0.95;
const OFFENSIVE_LINE_POSITIONS = new Set(["LT", "LG", "C", "RG", "RT"]);
const DEFENSE_POSITIONS = new Set(["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS"]);

type LineupImpactArea = "DEFENSE" | "OL" | "QB" | "RB";

function attribute(player: SimulationPlayerContext, code: string) {
  return player.attributes[code] ?? 0;
}

function readinessMultiplier(player: SimulationPlayerContext) {
  const readiness = BALANCE.playerImpact.readiness;
  const moraleBoost = (player.morale - readiness.moraleCenter) / readiness.moraleDivisor;
  const fatiguePenalty = calculateReadinessFatiguePenalty(
    player.fatigue,
    readiness.fatigueCenter,
    readiness.fatigueDivisor,
  );
  const mentalEdge =
    ((player.mentalOverall ?? readiness.mentalFallback) - readiness.mentalCenter) / readiness.mentalDivisor;
  const injuryPenalty = readiness.base - (player.gameDayReadinessMultiplier ?? readiness.base);

  return clamp(
    readiness.base + moraleBoost + mentalEdge - fatiguePenalty - injuryPenalty,
    readiness.min,
    readiness.max,
  );
}

function calculateReadinessFatiguePenalty(
  fatigue: number,
  fatigueCenter: number,
  fatigueDivisor: number,
) {
  const overage = Math.max(fatigue - fatigueCenter, 0);
  const moderateBand = Math.min(overage, 15) / fatigueDivisor;
  const heavyBand = Math.min(Math.max(overage - 15, 0), 37) / (fatigueDivisor * 6);
  const softCapBand = Math.max(overage - 52, 0) / (fatigueDivisor * 9);

  return clamp(moderateBand + heavyBand + softCapBand, 0, 0.14);
}

function gradedAttribute(player: SimulationPlayerContext, code: string) {
  return attribute(player, code) * readinessMultiplier(player);
}

function playerMatchesLineupImpactArea(player: SimulationPlayerContext, area: LineupImpactArea) {
  if (area === "QB") {
    return player.positionCode === "QB";
  }

  if (area === "RB") {
    return player.positionCode === "RB" || player.positionCode === "FB";
  }

  if (area === "OL") {
    return OFFENSIVE_LINE_POSITIONS.has(player.positionCode);
  }

  return DEFENSE_POSITIONS.has(player.positionCode);
}

function lineupImpactMultiplier(player: SimulationPlayerContext, area: LineupImpactArea) {
  if (!playerMatchesLineupImpactArea(player, area)) {
    return 1;
  }

  if (player.depthChartSlot === 1) {
    return STARTER_LINEUP_BONUS;
  }

  if (player.depthChartSlot === 2) {
    return BACKUP_LINEUP_PENALTY;
  }

  if (player.depthChartSlot != null) {
    return RESERVE_LINEUP_PENALTY;
  }

  return 1;
}

function lineupAdjustedSkill(
  player: SimulationPlayerContext,
  value: number,
  area: LineupImpactArea,
) {
  return value * lineupImpactMultiplier(player, area);
}

function coverageSkill(player: SimulationPlayerContext) {
  const skills = BALANCE.playerImpact.skills;
  if (["LOLB", "MLB", "ROLB"].includes(player.positionCode)) {
    const linebacker = skills.linebackerCoverage;

    return (
      gradedAttribute(player, "LB_MAN_COVERAGE") * linebacker.manWeight +
      gradedAttribute(player, "LB_ZONE_COVERAGE") * linebacker.zoneWeight +
      gradedAttribute(player, "LB_COVERAGE") * linebacker.coverageWeight +
      gradedAttribute(player, "COVERAGE_RANGE") * linebacker.rangeWeight +
      gradedAttribute(player, "PLAY_RECOGNITION") * linebacker.playRecognitionWeight +
      gradedAttribute(player, "AWARENESS") * linebacker.awarenessWeight
    ) / linebacker.divisor;
  }

  const coverage = skills.coverage;

  return (
    gradedAttribute(player, "MAN_COVERAGE") * coverage.manWeight +
    gradedAttribute(player, "ZONE_COVERAGE") * coverage.zoneWeight +
    gradedAttribute(player, "BALL_SKILLS") * coverage.ballSkillsWeight +
    gradedAttribute(player, "COVERAGE_RANGE") * coverage.rangeWeight +
    gradedAttribute(player, "PLAY_RECOGNITION") * coverage.playRecognitionWeight
  ) / coverage.divisor;
}

function ballHawkSkill(player: SimulationPlayerContext) {
  return (
    gradedAttribute(player, "BALL_SKILLS") +
    gradedAttribute(player, "HANDS") +
    gradedAttribute(player, "COVERAGE_RANGE") +
    gradedAttribute(player, "PLAY_RECOGNITION") +
    gradedAttribute(player, "JUMPING")
  ) / BALANCE.playerImpact.skills.ballHawkDivisor;
}

function receivingHands(player: SimulationPlayerContext) {
  return (
    gradedAttribute(player, "HANDS") +
    gradedAttribute(player, "CATCHING") +
    gradedAttribute(player, "CONTESTED_CATCH") +
    gradedAttribute(player, "BALL_SECURITY")
  ) / BALANCE.playerImpact.skills.receivingHandsDivisor;
}

function quarterbackMobility(player: SimulationPlayerContext) {
  return (
    gradedAttribute(player, "MOBILITY") +
    gradedAttribute(player, "SCRAMBLING") +
    gradedAttribute(player, "ACCELERATION") +
    gradedAttribute(player, "AGILITY")
  ) / BALANCE.playerImpact.skills.quarterbackMobilityDivisor;
}

function specialistConsistency(player: SimulationPlayerContext) {
  return (
    gradedAttribute(player, "KICK_CONSISTENCY") +
    gradedAttribute(player, "DISCIPLINE") +
    gradedAttribute(player, "AWARENESS")
  ) / BALANCE.playerImpact.skills.specialistConsistencyDivisor;
}

function snapSkill(player: SimulationPlayerContext) {
  return (
    gradedAttribute(player, "SNAP_ACCURACY") +
    gradedAttribute(player, "SNAP_VELOCITY") +
    gradedAttribute(player, "DISCIPLINE") +
    gradedAttribute(player, "AWARENESS")
  ) / BALANCE.playerImpact.skills.snapSkillDivisor;
}

function tacklingSkill(player: SimulationPlayerContext) {
  return (
    gradedAttribute(player, "TACKLING") +
    gradedAttribute(player, "PURSUIT") +
    gradedAttribute(player, "PLAY_RECOGNITION")
  ) / BALANCE.playerImpact.skills.tacklingSkillDivisor;
}

function returnSkill(player: SimulationPlayerContext) {
  return (
    gradedAttribute(player, "RETURN_VISION") +
    receivingHands(player) +
    gradedAttribute(player, "SPEED") +
    gradedAttribute(player, "ACCELERATION") +
    gradedAttribute(player, "BALL_SECURITY") +
    gradedAttribute(player, "ELUSIVENESS")
  ) / BALANCE.playerImpact.skills.returnSkillDivisor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fieldGoalBucket(distance: number) {
  if (distance < BALANCE.fieldGoal.bucket.shortMaxExclusive) {
    return "SHORT" as const;
  }

  if (distance < BALANCE.fieldGoal.bucket.midMaxExclusive) {
    return "MID" as const;
  }

  return "LONG" as const;
}

function longFieldGoalRiskPenalty(distance: number) {
  const risk = BALANCE.fieldGoal.longRiskPenalty;

  if (distance >= 50) {
    return risk.distance50;
  }

  if (distance >= 47) {
    return risk.distance47;
  }

  if (distance >= 44) {
    return risk.distance44;
  }

  if (distance >= 40) {
    return risk.distance40;
  }

  return 0;
}

function longFieldGoalDeclineChance(input: {
  distance: number;
  fieldPosition: number;
  scoreDelta: number;
  secondsRemainingInGame: number;
  coachingRiskProfile: CoachingRiskProfile;
  strongKicker: boolean;
}) {
  const decline = BALANCE.fieldGoal.decline;

  if (input.distance < decline.distanceMin) {
    return 0;
  }

  const lateNeedForPoints =
    (input.scoreDelta < 0 && input.secondsRemainingInGame <= decline.lateTrailingSeconds) ||
    (Math.abs(input.scoreDelta) <= 3 && input.secondsRemainingInGame <= decline.lateTieSeconds);

  if (lateNeedForPoints) {
    return 0;
  }

  const distancePressure =
    input.distance >= 53
      ? decline.distance53Pressure
      : input.distance >= 50
        ? decline.distance50Pressure
        : decline.distance47Pressure;
  const fieldPositionPressure =
    input.fieldPosition < 65
      ? decline.fieldPosition65Pressure
      : input.fieldPosition < 72
        ? decline.fieldPosition72Pressure
        : decline.deepFieldPositionPressure;
  const coachPressure =
    input.coachingRiskProfile === "AGGRESSIVE"
      ? decline.aggressiveCoachPressure
      : input.coachingRiskProfile === "CONSERVATIVE"
        ? decline.conservativeCoachPressure
        : 0;
  const scorePressure =
    input.scoreDelta >= 7
      ? decline.leadingSevenPressure
      : input.scoreDelta > 0
        ? decline.leadingPressure
        : input.scoreDelta < 0
          ? decline.trailingPressure
          : 0;
  const kickerPressure = input.strongKicker ? decline.strongKickerPressure : decline.weakKickerPressure;

  return clamp(
    distancePressure +
      fieldPositionPressure +
      coachPressure +
      scorePressure +
      kickerPressure,
    decline.min,
    decline.max,
  );
}

type CoachingRiskProfile = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";

type FourthDownDecision =
  | {
      decision: "GO_FOR_IT";
      yardsToGo: number;
      fieldPosition: number;
      coachingRiskProfile: CoachingRiskProfile;
    }
  | {
      decision: "FIELD_GOAL";
      yardsToGo: number;
      fieldPosition: number;
      coachingRiskProfile: CoachingRiskProfile;
      kickDistance: number;
    }
  | {
      decision: "PUNT";
      yardsToGo: number;
      fieldPosition: number;
      coachingRiskProfile: CoachingRiskProfile;
    };

function randomInt(min: number, max: number, random: () => number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function resolveCoachingRiskProfile(
  offenseMetrics: ReturnType<typeof calculateTeamMetrics>,
  defenseMetrics: ReturnType<typeof calculateTeamMetrics>,
  random: () => number,
  offensePlan?: Partial<PreGameXFactorPlan> | null,
): CoachingRiskProfile {
  const risk = BALANCE.coaching.riskProfile;
  const aggressionLean = clamp(
    (offenseMetrics.passGame - defenseMetrics.passDefense) / risk.passGameVsDefenseDivisor +
      (offenseMetrics.runGame - defenseMetrics.runDefense) / risk.runGameVsDefenseDivisor +
      (offenseMetrics.ballSecurity - risk.ballSecurityCenter) / risk.ballSecurityDivisor -
      (offenseMetrics.kicking - risk.kickingCenter) / risk.kickingDivisor,
    risk.aggressionLeanMin,
    risk.aggressionLeanMax,
  );
  const conservativeShare = clamp(
    risk.conservativeBaseShare - aggressionLean * risk.conservativeLeanMultiplier,
    risk.conservativeShareMin,
    risk.conservativeShareMax,
  );
  const aggressiveShare = clamp(
    risk.aggressiveBaseShare + aggressionLean * risk.aggressiveLeanMultiplier,
    risk.aggressiveShareMin,
    risk.aggressiveShareMax,
  );
  const roll = random();

  const profile =
    roll < conservativeShare
      ? "CONSERVATIVE"
      : roll > 1 - aggressiveShare
        ? "AGGRESSIVE"
        : "BALANCED";

  if (offensePlan?.aggression === "CONSERVATIVE") {
    return profile === "AGGRESSIVE" ? "BALANCED" : "CONSERVATIVE";
  }

  if (offensePlan?.aggression === "AGGRESSIVE") {
    return profile === "CONSERVATIVE" ? "BALANCED" : "AGGRESSIVE";
  }

  return profile;
}

function estimateFourthDownDistance(
  driveQuality: number,
  totalYards: number,
  random: () => number,
) {
  const distance = BALANCE.drive.fourthDownDistance;

  return clamp(
    randomInt(distance.baseRange[0], distance.baseRange[1], random) +
      (driveQuality > distance.driveQualityHighThreshold
        ? distance.driveQualityHighAdjustment
        : driveQuality > distance.driveQualityMediumThreshold
          ? distance.driveQualityMediumAdjustment
          : distance.driveQualityLowAdjustment) +
      (totalYards >= distance.totalYardsHighThreshold
        ? distance.totalYardsHighAdjustment
        : totalYards >= distance.totalYardsMediumThreshold
          ? distance.totalYardsMediumAdjustment
          : distance.totalYardsLowAdjustment),
    distance.min,
    distance.max,
  );
}

function chooseDriveStartFieldPosition(random: () => number) {
  const start = BALANCE.drive.startFieldPosition;
  const roll = random();

  if (roll < start.normalChance) {
    return randomInt(start.normalRange[0], start.normalRange[1], random);
  }

  if (roll < start.normalChance + start.backedUpChance) {
    return randomInt(start.backedUpRange[0], start.backedUpRange[1], random);
  }

  return randomInt(start.goodReturnRange[0], start.goodReturnRange[1], random);
}

function estimateFieldPosition(
  startFieldPosition: number,
  totalYards: number,
  random: () => number,
) {
  const fieldPosition = BALANCE.drive.fieldPositionEstimate;

  return clamp(
    startFieldPosition +
      Math.round(totalYards * fieldPosition.yardMultiplier) +
      randomInt(fieldPosition.randomRange[0], fieldPosition.randomRange[1], random),
    fieldPosition.min,
    fieldPosition.max,
  );
}

function nonlinearUnitEdge(diff: number, cap = 16, divisor = 18) {
  return Math.tanh(diff / divisor) * cap;
}

function nearPeerRatingDeltaMultiplier(ratingEdge: number) {
  const absoluteEdge = Math.abs(ratingEdge);

  if (absoluteEdge <= 2) {
    return 0.85;
  }

  if (absoluteEdge <= 5) {
    return 0.85 + ((absoluteEdge - 2) / 3) * 0.1;
  }

  return 1;
}

function compressNearPeerMetricDiff(diff: number, ratingEdge: number) {
  if (ratingEdge === 0 || diff === 0 || Math.sign(diff) !== Math.sign(ratingEdge)) {
    return diff;
  }

  return diff * nearPeerRatingDeltaMultiplier(ratingEdge);
}

function calculateUnitMatchups(
  offenseMetrics: ReturnType<typeof calculateTeamMetrics>,
  defenseMetrics: ReturnType<typeof calculateTeamMetrics>,
  ratingEdge = 0,
) {
  const passSkill =
    offenseMetrics.quarterbackPassing * 0.42 +
    offenseMetrics.receivingSkill * 0.34 +
    offenseMetrics.passProtection * 0.24;
  const passDefense =
    defenseMetrics.coverageSkill * 0.58 +
    defenseMetrics.passRushSkill * 0.42;
  const runSkill = offenseMetrics.rushingSkill * 0.55 + offenseMetrics.runBlocking * 0.45;
  const runDefense = defenseMetrics.frontSevenSkill;
  const passSkillDiff = compressNearPeerMetricDiff(passSkill - passDefense, ratingEdge);
  const runSkillDiff = compressNearPeerMetricDiff(runSkill - runDefense, ratingEdge);
  const passRushDiff = compressNearPeerMetricDiff(
    defenseMetrics.passRushSkill - offenseMetrics.passProtection,
    -ratingEdge,
  );
  const coverageDiff = compressNearPeerMetricDiff(
    defenseMetrics.coverageSkill - offenseMetrics.receivingSkill,
    -ratingEdge,
  );
  const decisionCoverageDiff = compressNearPeerMetricDiff(
    defenseMetrics.coverageSkill - offenseMetrics.quarterbackDecision,
    -ratingEdge,
  );
  const redZoneDiff = compressNearPeerMetricDiff(
    offenseMetrics.quarterbackDecision * 0.25 +
      offenseMetrics.receivingSkill * 0.25 +
      offenseMetrics.runBlocking * 0.2 +
      offenseMetrics.rushingSkill * 0.3 -
      (
        defenseMetrics.coverageSkill * 0.35 +
        defenseMetrics.frontSevenSkill * 0.45 +
        defenseMetrics.passRushSkill * 0.2
      ),
    ratingEdge,
  );

  return {
    passEdge: nonlinearUnitEdge(passSkillDiff),
    runEdge: nonlinearUnitEdge(runSkillDiff),
    passRushEdge: nonlinearUnitEdge(passRushDiff),
    coverageEdge: nonlinearUnitEdge(coverageDiff),
    decisionCoverageEdge: nonlinearUnitEdge(decisionCoverageDiff),
    redZoneEdge: nonlinearUnitEdge(redZoneDiff, 12, 16),
  };
}

function updatePendingStartFieldPosition(
  pendingStartFieldPositions: Map<string, number>,
  teamId: string,
  value: number | null,
) {
  if (value == null) {
    pendingStartFieldPositions.delete(teamId);
    return;
  }

  pendingStartFieldPositions.set(teamId, clamp(Math.round(value), 1, 80));
}

function chooseFourthDownDecision(input: {
  fieldPosition: number;
  yardsToGo: number;
  scoreDelta: number;
  secondsRemainingInGame: number;
  secondsRemainingInQuarter: number;
  coachingRiskProfile: CoachingRiskProfile;
  offenseMetrics: ReturnType<typeof calculateTeamMetrics>;
  offense: PreparedTeam;
  random: () => number;
}): FourthDownDecision {
  const zones = BALANCE.fourthDown.zones;
  const distances = BALANCE.fourthDown.distanceBuckets;
  const fieldPositionThresholds = BALANCE.fourthDown.fieldPositionThresholds;
  const gameState = BALANCE.fourthDown.gameState;
  const probabilities = BALANCE.fourthDown.probabilities;
  const bias = BALANCE.coaching.goForItBias;
  const fieldGoal = BALANCE.fieldGoal;
  const opp45To40 = input.fieldPosition >= zones.opp45Min && input.fieldPosition < zones.opp40Min;
  const opp40To35 = input.fieldPosition >= zones.opp40Min && input.fieldPosition < zones.opp35Min;
  const midfield = input.fieldPosition >= zones.midfieldMin && input.fieldPosition < zones.opp45Min;
  const plusTerritory = input.fieldPosition >= zones.opp45Min;
  const plusForty = input.fieldPosition >= zones.opp40Min;
  const plusThirtyFive = input.fieldPosition >= zones.opp35Min;
  const inRedZone = input.fieldPosition >= zones.redZoneMin;
  const shortYardage = input.yardsToGo <= distances.shortMax;
  const mediumYardage = input.yardsToGo >= distances.mediumMin && input.yardsToGo <= distances.mediumMax;
  const mediumLong = input.yardsToGo >= distances.mediumLongMin;
  const veryLongYardage = input.yardsToGo >= distances.veryLongMin;
  const trailingLate = input.scoreDelta < 0 && input.secondsRemainingInGame <= gameState.trailingLateSeconds;
  const desperateLate =
    input.scoreDelta <= gameState.desperateLateScoreMax &&
    input.secondsRemainingInGame <= gameState.desperateLateSeconds;
  const endgameFieldGoalWindow =
    input.scoreDelta < 0 &&
    input.scoreDelta >= gameState.endgameFieldGoalTrailingMin &&
    input.secondsRemainingInGame <= gameState.endgameFieldGoalSeconds;
  const needTouchdownLate =
    input.scoreDelta <= gameState.needTouchdownMax &&
    input.scoreDelta >= gameState.needTouchdownMin &&
    input.secondsRemainingInGame <= gameState.needTouchdownSeconds;
  const garbageTimeLead =
    input.scoreDelta >= gameState.garbageTimeLeadMin &&
    input.secondsRemainingInGame <= gameState.garbageTimeSeconds;
  const kickDistance = clamp(
    fieldGoal.kickDistance.constant - input.fieldPosition,
    fieldGoal.kickDistance.min,
    fieldGoal.kickDistance.max,
  );
  const strongKicker =
    input.offense.kicker != null &&
    specialistConsistency(input.offense.kicker) + input.offenseMetrics.kicking >= fieldGoal.strongKickerThreshold;
  const fieldGoalComfortable =
    input.offense.kicker != null &&
    kickDistance <=
      clamp(
        fieldGoal.comfort.base +
          Math.round((input.offenseMetrics.kicking - fieldGoal.comfort.kickingCenter) / fieldGoal.comfort.kickingDivisor) +
          (strongKicker ? fieldGoal.comfort.strongKickerBonus : 0),
        fieldGoal.comfort.min,
        fieldGoal.comfort.max,
      );
  const fieldGoalViable =
    input.offense.kicker != null &&
    kickDistance <=
      clamp(
        fieldGoal.viable.base +
          Math.round((input.offenseMetrics.kicking - fieldGoal.viable.kickingCenter) / fieldGoal.viable.kickingDivisor) +
          (strongKicker ? fieldGoal.viable.strongKickerBonus : 0),
        fieldGoal.viable.min,
        fieldGoal.viable.max,
      );
  const plusThirtyFiveFieldGoalComfortable =
    fieldGoalComfortable &&
    (
      !plusThirtyFive ||
      input.yardsToGo < distances.mediumLongMin + 1 ||
      kickDistance <= fieldGoal.bucket.midMaxExclusive ||
      trailingLate ||
      desperateLate
    );

  let goForItBias =
    (input.coachingRiskProfile === "AGGRESSIVE"
      ? bias.aggressive
      : input.coachingRiskProfile === "BALANCED"
        ? bias.balanced
        : bias.conservative) +
    (shortYardage ? bias.shortYardage : mediumYardage ? bias.mediumYardage : 0) +
    (trailingLate ? bias.trailingLate : 0) +
    (desperateLate ? bias.desperateLate : 0) +
    (needTouchdownLate ? bias.needTouchdownLate : 0) -
    (garbageTimeLead ? bias.garbageTimeLeadPenalty : 0) +
    (plusTerritory ? bias.plusTerritory : bias.ownTerritoryPenalty) +
    (plusForty ? bias.plusForty : 0) +
    (plusThirtyFive ? bias.plusThirtyFive : 0) +
    (inRedZone ? bias.redZone : 0) -
    (mediumLong ? bias.mediumLongPenalty : 0) -
    (veryLongYardage ? bias.veryLongPenalty : 0);
  goForItBias = clamp(goForItBias, bias.min, bias.max);

  if (
    endgameFieldGoalWindow &&
    fieldGoalViable &&
    input.fieldPosition >= zones.opp35Min &&
    input.yardsToGo >= distances.mediumMin
  ) {
    return {
      decision: "FIELD_GOAL",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
      kickDistance,
    };
  }

  if (
    needTouchdownLate &&
    input.fieldPosition >= fieldPositionThresholds.needTouchdownGoMin &&
    input.yardsToGo <= distances.decisionMediumMax + 1 &&
    input.random() <
      probabilities.needTouchdownLateGoBase +
        Math.max(goForItBias * probabilities.needTouchdownLateBiasMultiplier, 0)
  ) {
    return {
      decision: "GO_FOR_IT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (
    garbageTimeLead &&
    input.fieldPosition < fieldPositionThresholds.garbagePuntMaxExclusive &&
    input.yardsToGo >= distances.shortMax &&
    !desperateLate
  ) {
    return {
      decision: "PUNT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (
    (desperateLate || (shortYardage && plusTerritory)) &&
    input.random() < probabilities.desperateOrShortPlusGoBase + goForItBias
  ) {
    return {
      decision: "GO_FOR_IT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (opp45To40) {
    if (shortYardage) {
      return {
        decision: "GO_FOR_IT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    if (input.yardsToGo <= distances.decisionMediumMax) {
      if (input.coachingRiskProfile === "AGGRESSIVE") {
        return {
          decision: "GO_FOR_IT",
          yardsToGo: input.yardsToGo,
          fieldPosition: input.fieldPosition,
          coachingRiskProfile: input.coachingRiskProfile,
        };
      }

      if (
        input.coachingRiskProfile === "BALANCED" &&
        input.random() <
          probabilities.opp45To40BalancedMediumGoBase +
            Math.max(goForItBias * probabilities.opp45To40BalancedBiasMultiplier, 0)
      ) {
        return {
          decision: "GO_FOR_IT",
          yardsToGo: input.yardsToGo,
          fieldPosition: input.fieldPosition,
          coachingRiskProfile: input.coachingRiskProfile,
        };
      }

      return {
        decision: "PUNT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    return {
      decision: "PUNT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (opp40To35) {
    if (shortYardage) {
      if (
        fieldGoalComfortable &&
        input.coachingRiskProfile === "CONSERVATIVE" &&
        input.scoreDelta >= 0 &&
        !trailingLate &&
        input.random() < probabilities.opp40To35ConservativeShortFgChance
      ) {
        return {
          decision: "FIELD_GOAL",
          yardsToGo: input.yardsToGo,
          fieldPosition: input.fieldPosition,
          coachingRiskProfile: input.coachingRiskProfile,
          kickDistance,
        };
      }

      return {
        decision: "GO_FOR_IT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    if (input.yardsToGo <= distances.decisionMediumMax) {
      if (input.coachingRiskProfile === "AGGRESSIVE") {
        return {
          decision: "GO_FOR_IT",
          yardsToGo: input.yardsToGo,
          fieldPosition: input.fieldPosition,
          coachingRiskProfile: input.coachingRiskProfile,
        };
      }

      if (
        input.coachingRiskProfile === "BALANCED" &&
        input.random() <
          probabilities.opp40To35BalancedMediumGoBase +
            Math.max(goForItBias * probabilities.opp40To35BalancedBiasMultiplier, 0)
      ) {
        return {
          decision: "GO_FOR_IT",
          yardsToGo: input.yardsToGo,
          fieldPosition: input.fieldPosition,
          coachingRiskProfile: input.coachingRiskProfile,
        };
      }

      if (fieldGoalViable && input.scoreDelta >= -3 && !trailingLate) {
        return {
          decision: "FIELD_GOAL",
          yardsToGo: input.yardsToGo,
          fieldPosition: input.fieldPosition,
          coachingRiskProfile: input.coachingRiskProfile,
          kickDistance,
        };
      }

      return {
        decision: "PUNT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    return {
      decision: "PUNT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (plusThirtyFive) {
    if (
      shortYardage &&
      fieldGoalViable &&
      !trailingLate &&
      (
        (input.coachingRiskProfile === "CONSERVATIVE" &&
          input.scoreDelta >= gameState.endgameFieldGoalTrailingMin &&
          input.random() < probabilities.plus35ConservativeShortFgChance) ||
        (input.coachingRiskProfile === "BALANCED" &&
          input.scoreDelta >= 0 &&
          input.random() < probabilities.plus35BalancedShortFgChance) ||
        (input.coachingRiskProfile === "AGGRESSIVE" &&
          input.scoreDelta >= 4 &&
          input.random() < probabilities.plus35AggressiveShortFgChance)
      )
    ) {
      return {
        decision: "FIELD_GOAL",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
        kickDistance,
      };
    }

    if (shortYardage && input.random() < probabilities.plus35ShortGoBase + Math.max(goForItBias, 0)) {
      return {
        decision: "GO_FOR_IT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    if (
      mediumYardage &&
      input.coachingRiskProfile !== "CONSERVATIVE" &&
      input.random() < probabilities.plus35MediumGoBase + Math.max(goForItBias, 0)
    ) {
      return {
        decision: "GO_FOR_IT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    if (
      veryLongYardage &&
      input.coachingRiskProfile === "CONSERVATIVE" &&
      input.fieldPosition < fieldPositionThresholds.plus35LongPuntMaxExclusive &&
      !trailingLate
    ) {
      return {
        decision: "PUNT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    if (
      plusThirtyFiveFieldGoalComfortable &&
      !trailingLate &&
      (
        input.yardsToGo >= distances.mediumMax ||
        (input.coachingRiskProfile !== "AGGRESSIVE" && input.scoreDelta >= 0)
      )
    ) {
      return {
        decision: "FIELD_GOAL",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
        kickDistance,
      };
    }

    if (input.yardsToGo >= distances.decisionMediumMax + 1 && !trailingLate && !desperateLate) {
      if (
        fieldGoalViable &&
        strongKicker &&
        kickDistance <= fieldGoal.bucket.midMaxExclusive &&
        input.random() < probabilities.plus35LongStrongKickerFgChance
      ) {
        return {
          decision: "FIELD_GOAL",
          yardsToGo: input.yardsToGo,
          fieldPosition: input.fieldPosition,
          coachingRiskProfile: input.coachingRiskProfile,
          kickDistance,
        };
      }

      return {
        decision: "PUNT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    return {
      decision: "GO_FOR_IT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (midfield) {
    if (
      shortYardage &&
      input.coachingRiskProfile !== "CONSERVATIVE" &&
      input.random() <
        (
          input.coachingRiskProfile === "AGGRESSIVE"
            ? input.yardsToGo === 1
              ? probabilities.midfieldAggressiveFourthAnd1Go
              : probabilities.midfieldAggressiveFourthAnd2Go
            : input.yardsToGo === 1
              ? probabilities.midfieldBalancedFourthAnd1Go
              : probabilities.midfieldBalancedFourthAnd2Go
        )
    ) {
      return {
        decision: "GO_FOR_IT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    return {
      decision: "PUNT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (plusForty) {
    if (
      veryLongYardage &&
      input.coachingRiskProfile === "CONSERVATIVE" &&
      !trailingLate
    ) {
      return {
        decision: "PUNT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    if (
      shortYardage &&
      fieldGoalComfortable &&
      input.coachingRiskProfile === "CONSERVATIVE" &&
      input.scoreDelta >= 0 &&
      !trailingLate
    ) {
      return {
        decision: "FIELD_GOAL",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
        kickDistance,
      };
    }

    if (
      (shortYardage || (mediumYardage && input.coachingRiskProfile === "AGGRESSIVE")) &&
      input.random() < probabilities.plusFortyShortOrAggressiveMediumGoBase + Math.max(goForItBias, 0)
    ) {
      return {
        decision: "GO_FOR_IT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    if (
      fieldGoalComfortable &&
      mediumYardage &&
      input.coachingRiskProfile !== "AGGRESSIVE" &&
      input.scoreDelta >= -3 &&
      !trailingLate
    ) {
      return {
        decision: "FIELD_GOAL",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
        kickDistance,
      };
    }

    if (fieldGoalComfortable && input.yardsToGo >= distances.decisionMediumMax + 2 && !trailingLate && input.scoreDelta >= 0) {
      return {
        decision: "FIELD_GOAL",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
        kickDistance,
      };
    }
  }

  if (inRedZone) {
    if (
      (shortYardage || (mediumYardage && input.coachingRiskProfile !== "CONSERVATIVE")) &&
      input.random() < probabilities.redZoneGoBase + Math.max(goForItBias, 0)
    ) {
      return {
        decision: "GO_FOR_IT",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
      };
    }

    if (
      (fieldGoalComfortable && input.yardsToGo >= distances.mediumMax && input.scoreDelta >= 0) ||
      (
        fieldGoalViable &&
        input.coachingRiskProfile === "CONSERVATIVE" &&
        input.scoreDelta >= 0 &&
        input.yardsToGo >= distances.decisionMediumMax + 1
      )
    ) {
      return {
        decision: "FIELD_GOAL",
        yardsToGo: input.yardsToGo,
        fieldPosition: input.fieldPosition,
        coachingRiskProfile: input.coachingRiskProfile,
        kickDistance,
      };
    }
  }

  if (mediumLong && input.fieldPosition < fieldPositionThresholds.mediumLongPuntMaxExclusive && !plusTerritory && !trailingLate) {
    return {
      decision: "PUNT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (
    input.coachingRiskProfile === "CONSERVATIVE" &&
    input.fieldPosition < zones.opp45Min &&
    input.yardsToGo >= distances.mediumMin &&
    !trailingLate
  ) {
    return {
      decision: "PUNT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (
    !mediumLong &&
    input.fieldPosition >= fieldPositionThresholds.genericPlusShortGoMin &&
    input.random() < probabilities.genericPlusShortGoBase + Math.max(goForItBias, 0)
  ) {
    return {
      decision: "GO_FOR_IT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  if (
    (fieldGoalComfortable || trailingLate) &&
    fieldGoalViable &&
    input.fieldPosition >= fieldPositionThresholds.lateFieldGoalMin &&
    !trailingLate
  ) {
    return {
      decision: "FIELD_GOAL",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
      kickDistance,
    };
  }

  if (trailingLate && input.random() < probabilities.lateGenericGoBase + Math.max(goForItBias, 0)) {
    return {
      decision: "GO_FOR_IT",
      yardsToGo: input.yardsToGo,
      fieldPosition: input.fieldPosition,
      coachingRiskProfile: input.coachingRiskProfile,
    };
  }

  return {
    decision: "PUNT",
    yardsToGo: input.yardsToGo,
    fieldPosition: input.fieldPosition,
    coachingRiskProfile: input.coachingRiskProfile,
  };
}

type GameClockState = {
  quarter: 1 | 2 | 3 | 4;
  secondsRemainingInQuarter: number;
  secondsRemainingInGame: number;
  twoMinuteWarningsTaken: Set<2 | 4>;
};

type ClockPlayType =
  | "RUN"
  | "PASS_COMPLETE"
  | "PASS_INCOMPLETE"
  | "SACK"
  | "FIELD_GOAL"
  | "PUNT";

type ClockMode =
  | "NORMAL"
  | "KNEEL_DOWN"
  | "CLOCK_KILL"
  | "TWO_MINUTE_DRILL"
  | "GARBAGE_TIME";

type DriveClockInput = {
  plays: number;
  passAttempts: number;
  rushAttempts: number;
  completions: number;
  sacksTaken: number;
  resultType: string;
  clockMode?: ClockMode;
};

function createRegulationClockState(): GameClockState {
  return {
    quarter: 1,
    secondsRemainingInQuarter: BALANCE.clock.quarterSeconds,
    secondsRemainingInGame: BALANCE.clock.regulationSeconds,
    twoMinuteWarningsTaken: new Set<2 | 4>(),
  };
}

function currentQuarterLabel(clock: GameClockState) {
  return `Q${clock.quarter}`;
}

function playClockRunsAfterPlay(playType: ClockPlayType, inBounds: boolean) {
  if (playType === "PASS_INCOMPLETE") {
    return false;
  }

  if (playType === "FIELD_GOAL" || playType === "PUNT") {
    return false;
  }

  return inBounds;
}

function consumeClock(
  clock: GameClockState,
  requestedSeconds: number,
): { elapsedSeconds: number; stoppedByGameEvent: boolean } {
  let elapsedSeconds = 0;
  let remaining = requestedSeconds;
  let stoppedByGameEvent = false;

  while (remaining > 0 && clock.secondsRemainingInGame > 0) {
    if (
      (clock.quarter === 2 || clock.quarter === 4) &&
      !clock.twoMinuteWarningsTaken.has(clock.quarter) &&
      clock.secondsRemainingInQuarter > BALANCE.clock.twoMinuteWarningSecond
    ) {
      const secondsUntilWarning =
        clock.secondsRemainingInQuarter - BALANCE.clock.twoMinuteWarningSecond;
      const chunk = Math.min(remaining, secondsUntilWarning, clock.secondsRemainingInGame);

      if (chunk > 0) {
        clock.secondsRemainingInQuarter -= chunk;
        clock.secondsRemainingInGame -= chunk;
        elapsedSeconds += chunk;
        remaining -= chunk;
      }

      if (clock.secondsRemainingInQuarter === BALANCE.clock.twoMinuteWarningSecond) {
        clock.twoMinuteWarningsTaken.add(clock.quarter);
        stoppedByGameEvent = true;
        break;
      }

      continue;
    }

    const chunk = Math.min(
      remaining,
      clock.secondsRemainingInQuarter,
      clock.secondsRemainingInGame,
    );

    if (chunk <= 0) {
      break;
    }

    clock.secondsRemainingInQuarter -= chunk;
    clock.secondsRemainingInGame -= chunk;
    elapsedSeconds += chunk;
    remaining -= chunk;

    if (clock.secondsRemainingInQuarter === 0) {
      stoppedByGameEvent = true;

      if (clock.quarter < 4) {
        clock.quarter = (clock.quarter + 1) as 1 | 2 | 3 | 4;
        clock.secondsRemainingInQuarter = BALANCE.clock.quarterSeconds;
      }

      break;
    }
  }

  return {
    elapsedSeconds,
    stoppedByGameEvent,
  };
}

function buildDriveClockPlan(
  input: DriveClockInput,
  random: () => number,
): ClockPlayType[] {
  if (input.clockMode === "KNEEL_DOWN") {
    return Array.from(
      { length: Math.max(input.plays, 1) },
      () => "RUN" as const,
    );
  }

  const terminalSpecialTeamsPlay =
    input.resultType === "FIELD_GOAL_MADE" ||
    input.resultType === "FIELD_GOAL_MISSED" ||
    input.resultType === "PUNT";

  const offensivePlayCount = Math.max(
    1,
    input.plays - (terminalSpecialTeamsPlay ? 1 : 0),
  );
  const sacks = Math.min(input.sacksTaken, input.passAttempts);
  const throwsWithoutSacks = Math.max(0, input.passAttempts - sacks);
  const completions = Math.min(input.completions, throwsWithoutSacks);
  const incompletions = Math.max(0, throwsWithoutSacks - completions);
  const runs = Math.max(0, offensivePlayCount - input.passAttempts);
  const plan: ClockPlayType[] = [
    ...Array.from({ length: runs }, () => "RUN" as const),
    ...Array.from({ length: completions }, () => "PASS_COMPLETE" as const),
    ...Array.from({ length: incompletions }, () => "PASS_INCOMPLETE" as const),
    ...Array.from({ length: sacks }, () => "SACK" as const),
  ];

  while (plan.length < offensivePlayCount) {
    plan.push(random() < 0.5 ? "RUN" : "PASS_COMPLETE");
  }

  while (plan.length > offensivePlayCount) {
    plan.pop();
  }

  for (let index = plan.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index, random);
    const current = plan[index];
    plan[index] = plan[swapIndex] as ClockPlayType;
    plan[swapIndex] = current as ClockPlayType;
  }

  if (terminalSpecialTeamsPlay) {
    plan.push(input.resultType === "PUNT" ? "PUNT" : "FIELD_GOAL");
  }

  return plan;
}

function estimateDrivePossessionTime(
  clock: GameClockState,
  input: DriveClockInput,
  random: () => number,
) {
  const clockBalance = BALANCE.clock;
  const plan = buildDriveClockPlan(input, random);
  let elapsedSeconds = 0;
  let clockRunningBetweenPlays = false;

  for (let index = 0; index < plan.length; index += 1) {
    if (clock.secondsRemainingInGame <= 0) {
      break;
    }

    const playType = plan[index] as ClockPlayType;
    const finalPlay = index === plan.length - 1;

    if (index > 0 && clockRunningBetweenPlays) {
      const betweenPlaySeconds =
        input.clockMode === "TWO_MINUTE_DRILL"
          ? randomInt(clockBalance.betweenPlays.twoMinuteRange[0], clockBalance.betweenPlays.twoMinuteRange[1], random)
          : input.clockMode === "CLOCK_KILL" ||
              input.clockMode === "KNEEL_DOWN" ||
              input.clockMode === "GARBAGE_TIME"
            ? randomInt(clockBalance.betweenPlays.clockKillRange[0], clockBalance.betweenPlays.clockKillRange[1], random)
            : randomInt(clockBalance.betweenPlays.normalRange[0], clockBalance.betweenPlays.normalRange[1], random);
      const runoff = consumeClock(clock, betweenPlaySeconds);
      elapsedSeconds += runoff.elapsedSeconds;

      if (runoff.stoppedByGameEvent || clock.secondsRemainingInGame <= 0) {
        clockRunningBetweenPlays = false;
      }
    }

    if (clock.secondsRemainingInGame <= 0) {
      break;
    }

    const liveBallSeconds =
      input.clockMode === "KNEEL_DOWN"
        ? randomInt(clockBalance.liveBallSeconds.kneelRange[0], clockBalance.liveBallSeconds.kneelRange[1], random)
        : playType === "RUN"
        ? randomInt(clockBalance.liveBallSeconds.runRange[0], clockBalance.liveBallSeconds.runRange[1], random)
        : playType === "PASS_COMPLETE"
          ? randomInt(clockBalance.liveBallSeconds.passCompleteRange[0], clockBalance.liveBallSeconds.passCompleteRange[1], random)
          : playType === "PASS_INCOMPLETE"
            ? randomInt(clockBalance.liveBallSeconds.passIncompleteRange[0], clockBalance.liveBallSeconds.passIncompleteRange[1], random)
            : playType === "SACK"
              ? randomInt(clockBalance.liveBallSeconds.sackRange[0], clockBalance.liveBallSeconds.sackRange[1], random)
              : playType === "FIELD_GOAL"
                ? randomInt(clockBalance.liveBallSeconds.fieldGoalRange[0], clockBalance.liveBallSeconds.fieldGoalRange[1], random)
                : randomInt(clockBalance.liveBallSeconds.puntRange[0], clockBalance.liveBallSeconds.puntRange[1], random);
    const liveRunoff = consumeClock(clock, liveBallSeconds);
    elapsedSeconds += liveRunoff.elapsedSeconds;

    let inBounds = true;
    if (playType === "RUN") {
      inBounds =
        input.clockMode === "CLOCK_KILL" ||
        input.clockMode === "KNEEL_DOWN" ||
        input.clockMode === "GARBAGE_TIME" ||
        random() >=
          (input.clockMode === "TWO_MINUTE_DRILL"
            ? clockBalance.clockStop.twoMinuteRunOutOfBoundsChance
            : clockBalance.clockStop.normalRunOutOfBoundsChance);
    } else if (playType === "PASS_COMPLETE") {
      inBounds =
        input.clockMode === "CLOCK_KILL" ||
        input.clockMode === "GARBAGE_TIME" ||
        random() >=
          (input.clockMode === "TWO_MINUTE_DRILL"
            ? clockBalance.clockStop.twoMinuteCompleteOutOfBoundsChance
            : clockBalance.clockStop.normalCompleteOutOfBoundsChance);
    }

    const timeoutStopsClock =
      !finalPlay &&
      (clock.quarter === 2 || clock.quarter === 4) &&
      clock.secondsRemainingInQuarter <= clockBalance.clockStop.lateTimeoutWindowSeconds &&
      random() <
        (input.clockMode === "TWO_MINUTE_DRILL"
          ? clockBalance.clockStop.twoMinuteTimeoutChance
          : clockBalance.clockStop.normalTimeoutChance);

    clockRunningBetweenPlays =
      !finalPlay &&
      !liveRunoff.stoppedByGameEvent &&
      !timeoutStopsClock &&
      playClockRunsAfterPlay(playType, inBounds);
  }

  return elapsedSeconds;
}

function weightedPick<T>(items: T[], weightOf: (item: T) => number, random: () => number) {
  const weighted = items.map((item) => ({
    item,
    weight: Math.max(weightOf(item), 0.01),
  }));
  const totalWeight = weighted.reduce((total, current) => total + current.weight, 0);
  let roll = random() * totalWeight;

  for (const entry of weighted) {
    roll -= entry.weight;

    if (roll <= 0) {
      return entry.item;
    }
  }

  return weighted[weighted.length - 1]?.item ?? null;
}

function uniqueRotationPlayers(players: SimulationPlayerContext[]) {
  const seen = new Set<string>();

  return players.filter((player) => {
    if (seen.has(player.id)) {
      return false;
    }

    seen.add(player.id);
    return true;
  });
}

function buildRotationPool(
  players: SimulationPlayerContext[],
  limit: number,
) {
  return uniqueRotationPlayers(players).slice(0, limit);
}

function allocateIntegerTotal<T>(
  total: number,
  pool: T[],
  weightOf: (item: T) => number,
  random: () => number,
) {
  const allocations = new Map<T, number>();

  if (total <= 0 || pool.length === 0) {
    return allocations;
  }

  for (let index = 0; index < total; index += 1) {
    const selected = weightedPick(pool, weightOf, random);

    if (!selected) {
      continue;
    }

    allocations.set(selected, (allocations.get(selected) ?? 0) + 1);
  }

  return allocations;
}

function topAllocatedPlayer<T>(allocations: Map<T, number>) {
  let bestPlayer: T | null = null;
  let bestValue = -1;

  for (const [player, value] of allocations.entries()) {
    if (value > bestValue) {
      bestPlayer = player;
      bestValue = value;
    }
  }

  return bestPlayer;
}

function average(players: SimulationPlayerContext[], selector: (player: SimulationPlayerContext) => number) {
  if (players.length === 0) {
    return 50;
  }

  const total = players.reduce((sum, player) => sum + selector(player), 0);
  return total / players.length;
}

function overall(player: SimulationPlayerContext, fallback: "OFFENSE" | "DEFENSE" | "SPECIAL") {
  if (fallback === "OFFENSE") {
    return player.offensiveOverall ?? player.positionOverall;
  }

  if (fallback === "DEFENSE") {
    return player.defensiveOverall ?? player.positionOverall;
  }

  return player.specialTeamsOverall ?? player.positionOverall;
}

function createEmptyLine(playerId: string, teamId: string): PlayerSimulationLine {
  return {
    playerId,
    teamId,
    started: false,
    snapsOffense: 0,
    snapsDefense: 0,
    snapsSpecialTeams: 0,
    passing: {
      attempts: 0,
      completions: 0,
      yards: 0,
      touchdowns: 0,
      interceptions: 0,
      sacksTaken: 0,
      sackYardsLost: 0,
      longestCompletion: 0,
    },
    rushing: {
      attempts: 0,
      yards: 0,
      touchdowns: 0,
      fumbles: 0,
      longestRush: 0,
      brokenTackles: 0,
    },
    receiving: {
      targets: 0,
      receptions: 0,
      yards: 0,
      touchdowns: 0,
      drops: 0,
      longestReception: 0,
      yardsAfterCatch: 0,
    },
    blocking: {
      passBlockSnaps: 0,
      runBlockSnaps: 0,
      sacksAllowed: 0,
      pressuresAllowed: 0,
      pancakes: 0,
    },
    defensive: {
      tackles: 0,
      assistedTackles: 0,
      tacklesForLoss: 0,
      sacks: 0,
      quarterbackHits: 0,
      passesDefended: 0,
      interceptions: 0,
      forcedFumbles: 0,
      fumbleRecoveries: 0,
      defensiveTouchdowns: 0,
      coverageSnaps: 0,
      targetsAllowed: 0,
      receptionsAllowed: 0,
      yardsAllowed: 0,
    },
    kicking: {
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      fieldGoalsMadeShort: 0,
      fieldGoalsAttemptedShort: 0,
      fieldGoalsMadeMid: 0,
      fieldGoalsAttemptedMid: 0,
      fieldGoalsMadeLong: 0,
      fieldGoalsAttemptedLong: 0,
      extraPointsMade: 0,
      extraPointsAttempted: 0,
      longestFieldGoal: 0,
      kickoffTouchbacks: 0,
    },
    punting: {
      punts: 0,
      puntYards: 0,
      netPuntYards: 0,
      fairCatchesForced: 0,
      hangTimeTotalTenths: 0,
      puntsInside20: 0,
      touchbacks: 0,
      longestPunt: 0,
    },
    returns: {
      kickReturns: 0,
      kickReturnYards: 0,
      kickReturnTouchdowns: 0,
      kickReturnFumbles: 0,
      puntReturns: 0,
      puntReturnYards: 0,
      puntReturnTouchdowns: 0,
      puntReturnFumbles: 0,
    },
  };
}

function formatPlayerName(player: SimulationPlayerContext | null | undefined) {
  if (!player) {
    return null;
  }

  return `${player.firstName} ${player.lastName}`;
}

function snapshotScore(
  scoreboard: Map<string, TeamSimulationResult>,
  homeTeamId: string,
  awayTeamId: string,
) {
  return {
    home: scoreboard.get(homeTeamId)?.score ?? 0,
    away: scoreboard.get(awayTeamId)?.score ?? 0,
  };
}

function createDriveLogEntry(input: {
  sequence: number;
  phaseLabel: string;
  homeTeamId: string;
  awayTeamId: string;
  offense: PreparedTeam;
  defense: PreparedTeam;
  scoreboard: Map<string, TeamSimulationResult>;
  beforeScore: {
    home: number;
    away: number;
  };
  startSecondsRemainingInGame?: number | null;
  plays: number;
  passAttempts: number;
  rushAttempts: number;
  totalYards: number;
  resultType: string;
  turnover: boolean;
  redZoneTrip: boolean;
  summary: string;
  primaryPlayerName: string | null;
  primaryDefenderName: string | null;
  startFieldPosition?: number | null;
  highestReachedFieldPosition?: number | null;
  fourthDownBallPosition?: number | null;
  fourthDownDistance?: number | null;
  fourthDownScoreDelta?: number | null;
  fourthDownSecondsRemaining?: number | null;
  coachingRiskProfile?: string | null;
  fourthDownDecision?: string | null;
  terminalPlayDistance?: number | null;
  postFourthDownConverted?: boolean | null;
  postFourthDownYards?: number | null;
  targetedAggressiveGoForIt?: boolean | null;
  aggressiveGoForItResolution?: string | null;
  softFailCount?: number | null;
  fourthDownAttempts?: number | null;
  playsAfterConvert?: number | null;
  postConvertOriginatedOpp35To20?: boolean | null;
  postConvertEnteredOpp35To20?: boolean | null;
  opp35To20FinishResult?: string | null;
  playsAfterOpp35To20Entry?: number | null;
}): MatchDriveResult {
  const afterScore = snapshotScore(
    input.scoreboard,
    input.homeTeamId,
    input.awayTeamId,
  );

  return {
    sequence: input.sequence,
    phaseLabel: input.phaseLabel,
    offenseTeamId: input.offense.team.id,
    offenseTeamAbbreviation: input.offense.team.abbreviation,
    defenseTeamId: input.defense.team.id,
    defenseTeamAbbreviation: input.defense.team.abbreviation,
    startedHomeScore: input.beforeScore.home,
    startedAwayScore: input.beforeScore.away,
    startSecondsRemainingInGame: input.startSecondsRemainingInGame ?? null,
    endedHomeScore: afterScore.home,
    endedAwayScore: afterScore.away,
    plays: input.plays,
    passAttempts: input.passAttempts,
    rushAttempts: input.rushAttempts,
    totalYards: input.totalYards,
    resultType: input.resultType,
    pointsScored:
      input.offense.team.id === input.homeTeamId
        ? afterScore.home - input.beforeScore.home
        : afterScore.away - input.beforeScore.away,
    turnover: input.turnover,
    redZoneTrip: input.redZoneTrip,
    summary: input.summary,
    primaryPlayerName: input.primaryPlayerName,
    primaryDefenderName: input.primaryDefenderName,
    startFieldPosition: input.startFieldPosition ?? null,
    highestReachedFieldPosition: input.highestReachedFieldPosition ?? null,
    fourthDownBallPosition: input.fourthDownBallPosition ?? null,
    fourthDownDistance: input.fourthDownDistance ?? null,
    fourthDownScoreDelta: input.fourthDownScoreDelta ?? null,
    fourthDownSecondsRemaining: input.fourthDownSecondsRemaining ?? null,
    coachingRiskProfile: input.coachingRiskProfile ?? null,
    fourthDownDecision: input.fourthDownDecision ?? null,
    terminalPlayDistance: input.terminalPlayDistance ?? null,
    postFourthDownConverted: input.postFourthDownConverted ?? null,
    postFourthDownYards: input.postFourthDownYards ?? null,
    targetedAggressiveGoForIt: input.targetedAggressiveGoForIt ?? null,
    aggressiveGoForItResolution: input.aggressiveGoForItResolution ?? null,
    softFailCount: input.softFailCount ?? null,
    fourthDownAttempts: input.fourthDownAttempts ?? null,
    playsAfterConvert: input.playsAfterConvert ?? null,
    postConvertOriginatedOpp35To20: input.postConvertOriginatedOpp35To20 ?? null,
    postConvertEnteredOpp35To20: input.postConvertEnteredOpp35To20 ?? null,
    opp35To20FinishResult: input.opp35To20FinishResult ?? null,
    playsAfterOpp35To20Entry: input.playsAfterOpp35To20Entry ?? null,
  };
}

function ensureLine(
  lines: Map<string, PlayerSimulationLine>,
  player: SimulationPlayerContext,
) {
  const existing = lines.get(player.id);

  if (existing) {
    return existing;
  }

  const created = createEmptyLine(player.id, player.teamId);
  lines.set(player.id, created);
  return created;
}

function flagStarter(lines: Map<string, PlayerSimulationLine>, team: PreparedTeam) {
  for (const player of team.participants) {
    const line = ensureLine(lines, player);
    line.started = team.starterIds.has(player.id);
  }
}

function applyBaseSnaps(lines: Map<string, PlayerSimulationLine>, team: PreparedTeam, drives: number) {
  const offenseStarterSnaps = drives * 6;
  const defenseStarterSnaps = drives * 6;

  for (const player of team.participants) {
    const line = ensureLine(lines, player);
    const baseDepthFactor =
      player.depthChartSlot === 1
        ? MATCH_ENGINE_RULES.snapShares.starter
        : player.depthChartSlot === 2
          ? MATCH_ENGINE_RULES.snapShares.rotation
          : MATCH_ENGINE_RULES.snapShares.reserve;
    const depthFactor = baseDepthFactor * (player.gameDaySnapMultiplier ?? 1);

    if (
      ["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"].includes(player.positionCode)
    ) {
      line.snapsOffense += Math.round(offenseStarterSnaps * depthFactor);
    }

    if (
      ["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS"].includes(player.positionCode)
    ) {
      line.snapsDefense += Math.round(defenseStarterSnaps * depthFactor);
    }

    if (
      ["K", "P", "LS"].includes(player.positionCode) ||
      player.secondaryPositionCode === "KR" ||
      player.secondaryPositionCode === "PR"
    ) {
      line.snapsSpecialTeams += Math.round(10 * depthFactor);
    }
  }
}

function calculateTeamMetrics(team: PreparedTeam) {
  const metrics = BALANCE.teamMetrics;
  const quarterback = team.quarterbacks[0];
  const primaryBack = team.runningBacks[0] ?? team.fullbacks[0] ?? quarterback ?? null;
  const longSnapper = team.longSnapper;
  const kickReturner = team.kickReturner;
  const puntReturner = team.puntReturner;
  const quarterbackPassing = quarterback
    ? lineupAdjustedSkill(
        quarterback,
        (
          gradedAttribute(quarterback, "THROW_POWER") +
          gradedAttribute(quarterback, "THROW_ACCURACY_SHORT") +
          gradedAttribute(quarterback, "THROW_ACCURACY_MEDIUM") +
          gradedAttribute(quarterback, "THROW_ACCURACY_DEEP") +
          gradedAttribute(quarterback, "DECISION_MAKING") +
          gradedAttribute(quarterback, "POCKET_PRESENCE")
        ) / 6,
        "QB",
      )
    : metrics.ballSecurity.fallback;
  const quarterbackDecision = quarterback
    ? lineupAdjustedSkill(
        quarterback,
        (
          gradedAttribute(quarterback, "DECISION_MAKING") +
          gradedAttribute(quarterback, "AWARENESS") +
          gradedAttribute(quarterback, "DISCIPLINE") +
          gradedAttribute(quarterback, "POCKET_PRESENCE")
        ) / 4,
        "QB",
      )
    : metrics.ballSecurity.fallback;
  const receivingSkill =
    average(team.receivers.slice(0, metrics.passGame.receiverCount), (player) =>
      (
        gradedAttribute(player, "CATCHING") +
        gradedAttribute(player, "HANDS") +
        gradedAttribute(player, "ROUTE_RUNNING") +
        gradedAttribute(player, "SEPARATION") +
        gradedAttribute(player, "RELEASE")
      ) / 5,
    ) * 0.82 +
    average(team.tightEnds.slice(0, metrics.passGame.tightEndCount), (player) =>
      (
        gradedAttribute(player, "CATCHING") +
        gradedAttribute(player, "HANDS") +
        gradedAttribute(player, "ROUTE_RUNNING") +
        gradedAttribute(player, "BLOCKING")
      ) / 4,
    ) * 0.18;
  const passProtection = average(team.offensiveLine.slice(0, metrics.passGame.offensiveLineCount), (player) =>
    lineupAdjustedSkill(
      player,
      (
        gradedAttribute(player, "PASS_BLOCK") +
        gradedAttribute(player, "FOOTWORK") +
        gradedAttribute(player, "ANCHOR") +
        gradedAttribute(player, "HAND_TECHNIQUE")
      ) / 4,
      "OL",
    ),
  );
  const runBlocking = average(team.offensiveLine.slice(0, metrics.runGame.offensiveLineCount), (player) =>
    lineupAdjustedSkill(
      player,
      (
        gradedAttribute(player, "RUN_BLOCK") +
        gradedAttribute(player, "HAND_TECHNIQUE") +
        gradedAttribute(player, "STRENGTH") +
        gradedAttribute(player, "ANCHOR")
      ) / 4,
      "OL",
    ),
  );
  const rushingSkill =
    average(team.runningBacks.slice(0, metrics.runGame.runningBackCount), (player) =>
      lineupAdjustedSkill(
        player,
        (
          gradedAttribute(player, "VISION") +
          gradedAttribute(player, "BREAK_TACKLE") +
          gradedAttribute(player, "ELUSIVENESS") +
          gradedAttribute(player, "BALL_SECURITY") +
          gradedAttribute(player, "SHORT_YARDAGE_POWER")
        ) / 5,
        "RB",
      ),
    ) * 0.82 +
    (primaryBack
      ? lineupAdjustedSkill(
          primaryBack,
          (
            gradedAttribute(primaryBack, "VISION") +
            gradedAttribute(primaryBack, "BALL_SECURITY") +
            gradedAttribute(primaryBack, "SHORT_YARDAGE_POWER")
          ) / 3,
          "RB",
        )
      : metrics.ballSecurity.fallback) * 0.18;
  const passRushSkill = average(team.passRushers.slice(0, metrics.passDefense.passRusherCount), (player) =>
    lineupAdjustedSkill(
      player,
      (
        gradedAttribute(player, "PASS_RUSH") +
        gradedAttribute(player, "POWER_MOVES") +
        gradedAttribute(player, "FINESSE_MOVES") +
        gradedAttribute(player, "BLOCK_SHEDDING")
      ) / 4,
      "DEFENSE",
    ),
  );
  const coverageUnitSkill = average(
    team.coveragePlayers.slice(0, metrics.passDefense.coverageCount),
    (player) => lineupAdjustedSkill(player, coverageSkill(player), "DEFENSE"),
  );
  const frontSevenSkill =
    average(team.defensiveLine.slice(0, metrics.runDefense.defensiveLineCount), (player) =>
      lineupAdjustedSkill(
        player,
        (
          gradedAttribute(player, "BLOCK_SHEDDING") +
          gradedAttribute(player, "STRENGTH") +
          gradedAttribute(player, "TACKLING") +
          gradedAttribute(player, "PLAY_RECOGNITION")
        ) / 4,
        "DEFENSE",
      ),
    ) * 0.52 +
    average(team.linebackers.slice(0, metrics.runDefense.linebackerCount), (player) =>
      lineupAdjustedSkill(
        player,
        (
          gradedAttribute(player, "TACKLING") +
          gradedAttribute(player, "PURSUIT") +
          gradedAttribute(player, "HIT_POWER") +
          gradedAttribute(player, "PLAY_RECOGNITION")
        ) / 4,
        "DEFENSE",
      ),
    ) * 0.48;

  const passGame =
    average(team.receivers.slice(0, metrics.passGame.receiverCount), (player) =>
      gradedAttribute(player, "CATCHING") +
      gradedAttribute(player, "HANDS") +
      gradedAttribute(player, "ROUTE_RUNNING") +
      gradedAttribute(player, "SEPARATION"),
    ) * metrics.passGame.receiverWeight +
    average(team.tightEnds.slice(0, metrics.passGame.tightEndCount), (player) =>
      gradedAttribute(player, "CATCHING") +
      gradedAttribute(player, "HANDS") +
      gradedAttribute(player, "BLOCKING"),
    ) * metrics.passGame.tightEndWeight +
    average(team.offensiveLine.slice(0, metrics.passGame.offensiveLineCount), (player) =>
      lineupAdjustedSkill(
        player,
        gradedAttribute(player, "PASS_BLOCK") +
          gradedAttribute(player, "FOOTWORK") +
          gradedAttribute(player, "ANCHOR"),
        "OL",
      ),
    ) * metrics.passGame.offensiveLineWeight +
    (quarterback
      ? lineupAdjustedSkill(
          quarterback,
          gradedAttribute(quarterback, "THROW_POWER") +
            gradedAttribute(quarterback, "THROW_ACCURACY_SHORT") +
            gradedAttribute(quarterback, "THROW_ACCURACY_MEDIUM") +
            gradedAttribute(quarterback, "THROW_ACCURACY_DEEP") +
            gradedAttribute(quarterback, "DECISION_MAKING") +
            quarterbackMobility(quarterback),
          "QB",
        ) * metrics.passGame.quarterbackWeight
      : 0);

  const runGame =
    average(team.runningBacks.slice(0, metrics.runGame.runningBackCount), (player) =>
      lineupAdjustedSkill(
        player,
        gradedAttribute(player, "VISION") +
          gradedAttribute(player, "BREAK_TACKLE") +
          gradedAttribute(player, "ELUSIVENESS") +
          gradedAttribute(player, "ACCELERATION"),
        "RB",
      ),
    ) * metrics.runGame.runningBackWeight +
    average(team.fullbacks.slice(0, metrics.runGame.fullbackCount), (player) =>
      lineupAdjustedSkill(
        player,
        gradedAttribute(player, "SHORT_YARDAGE_POWER") + gradedAttribute(player, "PASS_PROTECTION"),
        "RB",
      ),
    ) * metrics.runGame.fullbackWeight +
    average(team.offensiveLine.slice(0, metrics.runGame.offensiveLineCount), (player) =>
      lineupAdjustedSkill(
        player,
        gradedAttribute(player, "RUN_BLOCK") +
          gradedAttribute(player, "HAND_TECHNIQUE") +
          gradedAttribute(player, "STRENGTH"),
        "OL",
      ),
    ) * metrics.runGame.offensiveLineWeight +
    (primaryBack
      ? lineupAdjustedSkill(
          primaryBack,
          gradedAttribute(primaryBack, "VISION") +
            gradedAttribute(primaryBack, "BALL_SECURITY") +
            gradedAttribute(primaryBack, "SHORT_YARDAGE_POWER") +
            gradedAttribute(primaryBack, "HANDS"),
          "RB",
        ) * metrics.runGame.primaryBackWeight
      : 0);

  const passDefense =
    average(team.passRushers.slice(0, metrics.passDefense.passRusherCount), (player) =>
      lineupAdjustedSkill(
        player,
        gradedAttribute(player, "PASS_RUSH") +
          gradedAttribute(player, "POWER_MOVES") +
          gradedAttribute(player, "FINESSE_MOVES"),
        "DEFENSE",
      ),
    ) * metrics.passDefense.passRushWeight +
    average(team.coveragePlayers.slice(0, metrics.passDefense.coverageCount), (player) =>
      lineupAdjustedSkill(player, coverageSkill(player), "DEFENSE"),
    ) *
      metrics.passDefense.coverageWeight;

  const runDefense =
    average(team.defensiveLine.slice(0, metrics.runDefense.defensiveLineCount), (player) =>
      lineupAdjustedSkill(
        player,
        gradedAttribute(player, "BLOCK_SHEDDING") +
          gradedAttribute(player, "STRENGTH") +
          gradedAttribute(player, "TACKLING"),
        "DEFENSE",
      ),
    ) * metrics.runDefense.defensiveLineWeight +
    average(team.linebackers.slice(0, metrics.runDefense.linebackerCount), (player) =>
      lineupAdjustedSkill(
        player,
        gradedAttribute(player, "TACKLING") +
          gradedAttribute(player, "PURSUIT") +
          gradedAttribute(player, "HIT_POWER"),
        "DEFENSE",
      ),
    ) * metrics.runDefense.linebackerWeight;

  const ballSecurity =
    (quarterback
      ? lineupAdjustedSkill(
          quarterback,
          gradedAttribute(quarterback, "DECISION_MAKING") +
            gradedAttribute(quarterback, "AWARENESS") +
            quarterbackMobility(quarterback),
          "QB",
        )
      : metrics.ballSecurity.fallback) * metrics.ballSecurity.quarterbackWeight +
    (primaryBack
      ? lineupAdjustedSkill(
          primaryBack,
          gradedAttribute(primaryBack, "BALL_SECURITY") +
            gradedAttribute(primaryBack, "DISCIPLINE") +
            gradedAttribute(primaryBack, "HANDS"),
          "RB",
        )
      : metrics.ballSecurity.fallback) * metrics.ballSecurity.primaryBackWeight;

  const takeawayPressure = average(
    team.coveragePlayers.slice(0, metrics.takeawayPressure.coverageCount),
    (player) =>
      lineupAdjustedSkill(
        player,
        ballHawkSkill(player) +
          gradedAttribute(player, "PLAY_RECOGNITION") +
          gradedAttribute(player, "HIT_POWER"),
        "DEFENSE",
      ),
  );

  const kicking = team.kicker
    ? (
        gradedAttribute(team.kicker, "KICK_ACCURACY") +
        gradedAttribute(team.kicker, "KICK_POWER") +
        specialistConsistency(team.kicker) +
        overall(team.kicker, "SPECIAL")
      ) / metrics.specialists.kickingAttributeDivisor
    : metrics.specialists.kickingFallback;

  const punting = team.punter
    ? (
        gradedAttribute(team.punter, "PUNT_ACCURACY") +
        gradedAttribute(team.punter, "PUNT_POWER") +
        gradedAttribute(team.punter, "PUNT_HANG_TIME") +
        specialistConsistency(team.punter) +
        overall(team.punter, "SPECIAL")
      ) / metrics.specialists.puntingAttributeDivisor
    : metrics.specialists.puntingFallback;

  const snapOperation = longSnapper
    ? snapSkill(longSnapper)
    : metrics.specialists.snapOperationFallback;

  const kickReturn = kickReturner ? returnSkill(kickReturner) : metrics.specialists.kickReturnFallback;
  const puntReturn = puntReturner ? returnSkill(puntReturner) : metrics.specialists.puntReturnFallback;

  return {
    passGame,
    runGame,
    passDefense,
    runDefense,
    ballSecurity,
    takeawayPressure,
    kicking,
    punting,
    snapOperation,
    kickReturn,
    puntReturn,
    quarterbackPassing,
    quarterbackDecision,
    receivingSkill,
    passProtection,
    runBlocking,
    rushingSkill,
    passRushSkill,
    coverageSkill: coverageUnitSkill,
    frontSevenSkill,
  };
}

function lineupImpactAreasForTeam(team: PreparedTeam) {
  const areas: Array<{ area: LineupImpactArea; label: string }> = [
    { area: "QB", label: "QB" },
    { area: "RB", label: "RB" },
    { area: "OL", label: "OL" },
    { area: "DEFENSE", label: "Defense" },
  ];

  return areas
    .filter(({ area }) =>
      team.participants.some(
        (player) =>
          player.depthChartSlot === 1 &&
          playerMatchesLineupImpactArea(player, area),
      ),
    )
    .map(({ label }) => label);
}

function buildLineupEngineNotes(teams: PreparedTeam[]) {
  return teams
    .map((team) => ({
      abbreviation: team.team.abbreviation,
      areas: lineupImpactAreasForTeam(team),
    }))
    .filter((entry) => entry.areas.length > 0)
    .map(
      (entry) =>
        `${entry.abbreviation}: Starter-Bonus angewendet (${entry.areas.join(", ")}; Backups leicht reduziert).`,
    );
}

function chooseRunner(team: PreparedTeam, random: () => number) {
  const pool = [
    ...team.runningBacks.slice(0, 2),
    ...team.fullbacks.slice(0, 1),
    ...team.quarterbacks.slice(0, 1),
  ];

  return (
    weightedPick(
      pool,
      (player) =>
        gradedAttribute(player, "VISION") +
        gradedAttribute(player, "BREAK_TACKLE") +
        gradedAttribute(player, "BALL_SECURITY"),
      random,
    ) ?? team.quarterbacks[0] ?? team.participants[0]
  );
}

function chooseReceiver(team: PreparedTeam, random: () => number) {
  const pool = [...team.receivers.slice(0, 4), ...team.tightEnds.slice(0, 2), ...team.runningBacks.slice(0, 2)];

  return (
    weightedPick(
      pool,
      (player) =>
        gradedAttribute(player, "CATCHING") +
        gradedAttribute(player, "HANDS") +
        gradedAttribute(player, "ROUTE_RUNNING") +
        gradedAttribute(player, "SEPARATION") +
        gradedAttribute(player, "RELEASE"),
      random,
    ) ?? team.receivers[0] ?? team.tightEnds[0] ?? team.participants[0]
  );
}

function chooseTackler(team: PreparedTeam, random: () => number) {
  return (
    weightedPick(
      team.tacklers,
      (player) => tacklingSkill(player),
      random,
    ) ?? team.defenders[0]
  );
}

function chooseBallHawk(team: PreparedTeam, random: () => number) {
  return (
    weightedPick(
      team.coveragePlayers,
      (player) => ballHawkSkill(player) + coverageSkill(player) * 0.65,
      random,
    ) ?? team.coveragePlayers[0]
  );
}

function distributeRushingProduction(
  lines: Map<string, PlayerSimulationLine>,
  offense: PreparedTeam,
  attempts: number,
  yards: number,
  random: () => number,
) {
  const rushPool = buildRotationPool(
    [
      ...offense.runningBacks.slice(0, 2),
      ...offense.fullbacks.slice(0, 1),
    ],
    MATCH_ENGINE_RULES.rotations.rushContributors,
  );
  const attemptAllocation = allocateIntegerTotal(
    attempts,
    rushPool,
    (player) =>
      gradedAttribute(player, "VISION") +
      gradedAttribute(player, "BREAK_TACKLE") +
      gradedAttribute(player, "BALL_SECURITY") +
      gradedAttribute(player, "ACCELERATION"),
    random,
  );
  const yardAllocation = allocateIntegerTotal(
    yards,
    rushPool.length > 0 ? [...attemptAllocation.keys()] : [],
    (player) =>
      ((attemptAllocation.get(player) ?? 0) + 1) *
      (gradedAttribute(player, "VISION") +
        gradedAttribute(player, "BREAK_TACKLE") +
        gradedAttribute(player, "ELUSIVENESS")),
    random,
  );

  for (const [player, playerAttempts] of attemptAllocation.entries()) {
    const line = ensureLine(lines, player);
    const playerYards = yardAllocation.get(player) ?? 0;
    line.rushing.attempts += playerAttempts;
    line.rushing.yards += playerYards;
    line.rushing.longestRush = Math.max(
      line.rushing.longestRush,
      playerYards > 0
        ? Math.max(
            4,
            Math.round(playerYards / Math.max(playerAttempts, 1)) + randomInt(2, 10, random),
          )
        : 0,
    );
    line.rushing.brokenTackles += playerYards > 20 ? 1 : 0;
  }

  return {
    primaryRunner: topAllocatedPlayer(yardAllocation) ?? topAllocatedPlayer(attemptAllocation),
  };
}

function distributeReceivingProduction(
  lines: Map<string, PlayerSimulationLine>,
  offense: PreparedTeam,
  thrownAttempts: number,
  completions: number,
  drops: number,
  yards: number,
  random: () => number,
) {
  const targetPool = buildRotationPool(
    [
      ...offense.receivers.slice(0, 4),
      ...offense.tightEnds.slice(0, 2),
      ...offense.runningBacks.slice(0, 2),
    ],
    MATCH_ENGINE_RULES.rotations.targetContributors,
  );
  const targetAllocation = allocateIntegerTotal(
    thrownAttempts,
    targetPool,
    (player) =>
      gradedAttribute(player, "CATCHING") +
      gradedAttribute(player, "HANDS") +
      gradedAttribute(player, "ROUTE_RUNNING") +
      gradedAttribute(player, "SEPARATION") +
      gradedAttribute(player, "RELEASE"),
    random,
  );
  const activeTargets = [...targetAllocation.keys()];
  const receptionAllocation = new Map<SimulationPlayerContext, number>();
  const dropAllocation = new Map<SimulationPlayerContext, number>();

  for (let index = 0; index < completions; index += 1) {
    const selected = weightedPick(
      activeTargets.filter(
        (player) => (receptionAllocation.get(player) ?? 0) < (targetAllocation.get(player) ?? 0),
      ),
      (player) =>
        gradedAttribute(player, "CATCHING") +
        gradedAttribute(player, "HANDS") +
        gradedAttribute(player, "ROUTE_RUNNING"),
      random,
    );

    if (!selected) {
      break;
    }

    receptionAllocation.set(selected, (receptionAllocation.get(selected) ?? 0) + 1);
  }

  for (let index = 0; index < drops; index += 1) {
    const selected = weightedPick(
      activeTargets.filter((player) => {
        const targets = targetAllocation.get(player) ?? 0;
        const receptionsForPlayer = receptionAllocation.get(player) ?? 0;
        const dropsForPlayer = dropAllocation.get(player) ?? 0;

        return receptionsForPlayer + dropsForPlayer < targets;
      }),
      (player) => Math.max(120 - receivingHands(player), 10),
      random,
    );

    if (!selected) {
      break;
    }

    dropAllocation.set(selected, (dropAllocation.get(selected) ?? 0) + 1);
  }

  const yardAllocation = allocateIntegerTotal(
    yards,
    [...receptionAllocation.keys()],
    (player) =>
      ((receptionAllocation.get(player) ?? 0) + 1) *
      (gradedAttribute(player, "SEPARATION") +
        gradedAttribute(player, "CATCHING") +
        gradedAttribute(player, "ELUSIVENESS")),
    random,
  );
  const yacAllocation = allocateIntegerTotal(
    Math.round(yards * 0.32),
    [...receptionAllocation.keys()],
    (player) =>
      (yardAllocation.get(player) ?? 0) +
      gradedAttribute(player, "ELUSIVENESS") +
      gradedAttribute(player, "ACCELERATION"),
    random,
  );

  for (const [player, targets] of targetAllocation.entries()) {
    const line = ensureLine(lines, player);
    const receptionsForPlayer = receptionAllocation.get(player) ?? 0;
    const playerYards = yardAllocation.get(player) ?? 0;
    line.receiving.targets += targets;
    line.receiving.receptions += receptionsForPlayer;
    line.receiving.yards += playerYards;
    line.receiving.drops += dropAllocation.get(player) ?? 0;
    line.receiving.longestReception = Math.max(
      line.receiving.longestReception,
      playerYards > 0
        ? Math.max(
            8,
            Math.round(playerYards / Math.max(receptionsForPlayer, 1)) + randomInt(3, 12, random),
          )
        : 0,
    );
    line.receiving.yardsAfterCatch += yacAllocation.get(player) ?? 0;
  }

  return {
    primaryReceiver: topAllocatedPlayer(yardAllocation) ?? topAllocatedPlayer(targetAllocation),
    receptionAllocation,
  };
}

function distributeTackleProduction(
  lines: Map<string, PlayerSimulationLine>,
  defense: PreparedTeam,
  tackles: number,
  random: () => number,
) {
  const pool = buildRotationPool(
    defense.tacklers,
    MATCH_ENGINE_RULES.rotations.tackleContributors,
  );
  const tackleAllocation = allocateIntegerTotal(
    tackles,
    pool,
    (player) => tacklingSkill(player) + gradedAttribute(player, "PURSUIT"),
    random,
  );

  for (const [player, totalTackles] of tackleAllocation.entries()) {
    const line = ensureLine(lines, player);
    line.defensive.tackles += totalTackles;
  }

  return {
    primaryTackler: topAllocatedPlayer(tackleAllocation),
  };
}

function distributeCoverageProduction(
  lines: Map<string, PlayerSimulationLine>,
  defense: PreparedTeam,
  targets: number,
  completions: number,
  yards: number,
  random: () => number,
) {
  const pool = buildRotationPool(
    defense.coveragePlayers,
    MATCH_ENGINE_RULES.rotations.coverageContributors,
  );
  const targetAllocation = allocateIntegerTotal(
    targets,
    pool,
    (player) => Math.max(130 - coverageSkill(player), 10),
    random,
  );
  const completionAllocation = allocateIntegerTotal(
    completions,
    [...targetAllocation.keys()],
    (player) =>
      ((targetAllocation.get(player) ?? 0) + 1) * Math.max(125 - coverageSkill(player), 10),
    random,
  );
  const yardAllocation = allocateIntegerTotal(
    yards,
    [...completionAllocation.keys()],
    (player) =>
      ((completionAllocation.get(player) ?? 0) + 1) * Math.max(125 - coverageSkill(player), 10),
    random,
  );

  for (const [player, totalTargets] of targetAllocation.entries()) {
    const line = ensureLine(lines, player);
    line.defensive.targetsAllowed += totalTargets;
    line.defensive.receptionsAllowed += completionAllocation.get(player) ?? 0;
    line.defensive.yardsAllowed += yardAllocation.get(player) ?? 0;
  }

  return {
    primaryCoverageDefender:
      topAllocatedPlayer(yardAllocation) ?? topAllocatedPlayer(targetAllocation),
  };
}

function distributePassRushProduction(
  lines: Map<string, PlayerSimulationLine>,
  defense: PreparedTeam,
  sacksTaken: number,
  random: () => number,
) {
  const pool = buildRotationPool(
    defense.passRushers,
    MATCH_ENGINE_RULES.rotations.passRushContributors,
  );
  const sackAllocation = allocateIntegerTotal(
    sacksTaken,
    pool,
    (player) =>
      gradedAttribute(player, "PASS_RUSH") +
      gradedAttribute(player, "POWER_MOVES") +
      gradedAttribute(player, "FINESSE_MOVES"),
    random,
  );

  for (const [player, sacks] of sackAllocation.entries()) {
    const line = ensureLine(lines, player);
    line.defensive.sacks += sacks;
    line.defensive.quarterbackHits += sacks;
    line.defensive.tacklesForLoss += sacks;
  }

  return {
    primaryPassRusher: topAllocatedPlayer(sackAllocation),
  };
}

function registerKickoffReturn(
  lines: Map<string, PlayerSimulationLine>,
  returner: SimulationPlayerContext | null,
  kickoffPower: number,
  random: () => number,
) {
  if (!returner) {
    return;
  }

  const line = ensureLine(lines, returner);
  const kickoff = BALANCE.returns.kickoff;
  const baseReturn = randomInt(kickoff.baseReturnRange[0], kickoff.baseReturnRange[1], random);
  const visionBonus = Math.round((returnSkill(returner) - kickoff.returnSkillCenter) / kickoff.visionDivisor);
  const handsBonus = Math.round((receivingHands(returner) - kickoff.handsCenter) / kickoff.handsDivisor);
  const kickoffPenalty = Math.round((kickoffPower - kickoff.kickoffPowerCenter) / kickoff.kickoffPowerDivisor);
  const yards = clamp(baseReturn + visionBonus + handsBonus - kickoffPenalty, kickoff.yardsMin, kickoff.yardsMax);
  line.returns.kickReturns += 1;
  line.returns.kickReturnYards += yards;

  if (
    random() <
    clamp(
      kickoff.fumbleBase +
        (kickoff.ballSecurityCenter - gradedAttribute(returner, "BALL_SECURITY")) / kickoff.ballSecurityDivisor +
        (kickoff.handsFumbleCenter - receivingHands(returner)) / kickoff.handsFumbleDivisor,
      kickoff.fumbleMin,
      kickoff.fumbleMax,
    )
  ) {
    line.returns.kickReturnFumbles += 1;
  }
}

function registerPuntReturn(
  lines: Map<string, PlayerSimulationLine>,
  returner: SimulationPlayerContext | null,
  puntHangTime: number,
  random: () => number,
) {
  if (!returner) {
    return;
  }

  const line = ensureLine(lines, returner);
  const punt = BALANCE.returns.punt;
  const baseReturn = randomInt(punt.baseReturnRange[0], punt.baseReturnRange[1], random);
  const visionBonus = Math.round((returnSkill(returner) - punt.returnSkillCenter) / punt.visionDivisor);
  const handsBonus = Math.round((receivingHands(returner) - punt.handsCenter) / punt.handsDivisor);
  const hangPenalty = Math.round((puntHangTime - punt.hangTimeCenter) / punt.hangTimeDivisor);
  const yards = clamp(baseReturn + visionBonus + handsBonus - hangPenalty, punt.yardsMin, punt.yardsMax);
  line.returns.puntReturns += 1;
  line.returns.puntReturnYards += yards;

  if (
    random() <
    clamp(
      punt.fumbleBase +
        (punt.ballSecurityCenter - gradedAttribute(returner, "BALL_SECURITY")) / punt.ballSecurityDivisor +
        (punt.handsFumbleCenter - receivingHands(returner)) / punt.handsFumbleDivisor,
      punt.fumbleMin,
      punt.fumbleMax,
    )
  ) {
    line.returns.puntReturnFumbles += 1;
  }
}

function registerCoverageSnaps(
  lines: Map<string, PlayerSimulationLine>,
  defense: PreparedTeam,
  passAttempts: number,
) {
  for (const defender of defense.coveragePlayers.slice(0, 5)) {
    const line = ensureLine(lines, defender);
    line.defensive.coverageSnaps += passAttempts;
  }
}

function registerBlockingSnaps(
  lines: Map<string, PlayerSimulationLine>,
  offense: PreparedTeam,
  passAttempts: number,
  rushAttempts: number,
  sacksAllowed: number,
  pressuresAllowed: number,
  random: () => number,
) {
  const blockers = uniqueBlockers(offense);

  if (blockers.length === 0) {
    return;
  }

  for (const blocker of blockers) {
    const line = ensureLine(lines, blocker);
    line.blocking.passBlockSnaps += passAttempts;
    line.blocking.runBlockSnaps += rushAttempts;
    line.blocking.pressuresAllowed += Math.round(pressuresAllowed / blockers.length);
    line.blocking.sacksAllowed += Math.round(sacksAllowed / blockers.length);

    if (random() < 0.18) {
      line.blocking.pancakes += 1;
    }
  }
}

function uniqueBlockers(team: PreparedTeam) {
  const blockers = [...team.offensiveLine.slice(0, 5), ...team.tightEnds.slice(0, 1), ...team.fullbacks.slice(0, 1)];
  const seen = new Set<string>();

  return blockers.filter((blocker) => {
    if (seen.has(blocker.id)) {
      return false;
    }

    seen.add(blocker.id);
    return true;
  });
}

function registerOvertimeFieldGoal(
  lines: Map<string, PlayerSimulationLine>,
  offense: PreparedTeam,
  offenseMetrics: ReturnType<typeof calculateTeamMetrics>,
  offenseScore: TeamSimulationResult,
  distance: number,
  random: () => number,
) {
  if (!offense.kicker) {
    return false;
  }

  const makeChanceConfig = BALANCE.fieldGoal.overtimeMakeChance;
  const makeChance = clamp(
    makeChanceConfig.base +
      (offenseMetrics.kicking - makeChanceConfig.kickingCenter) / makeChanceConfig.kickingDivisor +
      (specialistConsistency(offense.kicker) - makeChanceConfig.consistencyCenter) /
        makeChanceConfig.consistencyDivisor +
      (offenseMetrics.snapOperation - makeChanceConfig.snapOperationCenter) /
        makeChanceConfig.snapOperationDivisor -
      (distance - makeChanceConfig.distanceCenter) / makeChanceConfig.distanceDivisor,
    makeChanceConfig.min,
    makeChanceConfig.max,
  );
  const kickerLine = ensureLine(lines, offense.kicker);
  const bucket = fieldGoalBucket(distance);
  kickerLine.kicking.fieldGoalsAttempted += 1;
  kickerLine.kicking.longestFieldGoal = Math.max(
    kickerLine.kicking.longestFieldGoal,
    distance,
  );

  if (bucket === "SHORT") {
    kickerLine.kicking.fieldGoalsAttemptedShort += 1;
  } else if (bucket === "MID") {
    kickerLine.kicking.fieldGoalsAttemptedMid += 1;
  } else {
    kickerLine.kicking.fieldGoalsAttemptedLong += 1;
  }

  if (random() >= makeChance) {
    return false;
  }

  kickerLine.kicking.fieldGoalsMade += 1;
  if (bucket === "SHORT") {
    kickerLine.kicking.fieldGoalsMadeShort += 1;
  } else if (bucket === "MID") {
    kickerLine.kicking.fieldGoalsMadeMid += 1;
  } else {
    kickerLine.kicking.fieldGoalsMadeLong += 1;
  }

  offenseScore.score += BALANCE.fieldGoal.points;
  offenseScore.redZoneTrips += 1;
  return true;
}

function runPlayoffOvertimePossession(
  lines: Map<string, PlayerSimulationLine>,
  offense: PreparedTeam,
  defense: PreparedTeam,
  offenseMetrics: ReturnType<typeof calculateTeamMetrics>,
  defenseMetrics: ReturnType<typeof calculateTeamMetrics>,
  offenseScore: TeamSimulationResult,
  defenseScore: TeamSimulationResult,
  availableClockSeconds: number,
  random: () => number,
) {
  const quarterback = offense.quarterbacks[0] ?? offense.participants[0];
  const runner = chooseRunner(offense, random);
  const receiver = chooseReceiver(offense, random);
  const tackler = chooseTackler(defense, random);
  const quarterbackLine = ensureLine(lines, quarterback);
  const runnerLine = ensureLine(lines, runner);
  const receiverLine = ensureLine(lines, receiver);
  const tacklerLine = ensureLine(lines, tackler);
  const overtime = BALANCE.overtime.possession;
  const driveEdge =
    (offenseMetrics.passGame - defenseMetrics.passDefense) * overtime.driveEdgePassWeight +
    (offenseMetrics.runGame - defenseMetrics.runDefense) * overtime.driveEdgeRunWeight +
    (offenseMetrics.ballSecurity - defenseMetrics.takeawayPressure) * overtime.driveEdgeBallSecurityWeight +
    randomInt(overtime.driveEdgeRandomRange[0], overtime.driveEdgeRandomRange[1], random);
  const basePassingYards = clamp(
    randomInt(overtime.passingYardsRange[0], overtime.passingYardsRange[1], random) +
      Math.round((offenseMetrics.passGame - defenseMetrics.passDefense) / overtime.passingDiffDivisor),
    overtime.passingYardsMin,
    overtime.passingYardsMax,
  );
  const baseRushingYards = clamp(
    randomInt(overtime.rushingYardsRange[0], overtime.rushingYardsRange[1], random) +
      Math.round((offenseMetrics.runGame - defenseMetrics.runDefense) / overtime.rushingDiffDivisor),
    overtime.rushingYardsMin,
    overtime.rushingYardsMax,
  );
  const totalYards = basePassingYards + baseRushingYards;
  let resultType = "EMPTY_DRIVE";
  let summary = `${offense.team.abbreviation} kommt in der Overtime auf ${totalYards} Yards, laesst aber Punkte liegen.`;
  let primaryPlayerName = formatPlayerName(receiver ?? runner ?? quarterback);
  let primaryDefenderName = formatPlayerName(tackler);

  offenseScore.totalYards += totalYards;
  offenseScore.passingYards += basePassingYards;
  offenseScore.rushingYards += baseRushingYards;
  offenseScore.firstDowns += Math.max(1, Math.round(totalYards / overtime.firstDownYardsDivisor));
  const timeOfPossessionSeconds = Math.min(
    availableClockSeconds,
    randomInt(overtime.possessionTimeRange[0], overtime.possessionTimeRange[1], random),
  );
  offenseScore.timeOfPossessionSeconds += timeOfPossessionSeconds;
  if (totalYards >= PASS_EXPLOSIVE_YARDS) {
    offenseScore.explosivePlays += 1;
  }

  if (driveEdge >= overtime.touchdownDriveEdgeMin) {
    const passingTouchdown = random() < BALANCE.scoring.touchdown.passingTouchdownChance;
    offenseScore.score += BALANCE.scoring.touchdown.points;
    offenseScore.touchdowns += 1;
    offenseScore.redZoneTrips += 1;
    offenseScore.redZoneTouchdowns += 1;

    quarterbackLine.passing.attempts += overtime.touchdownPassAttempts;
    quarterbackLine.passing.completions += overtime.touchdownCompletions;
    quarterbackLine.passing.yards += basePassingYards;
    quarterbackLine.passing.longestCompletion = Math.max(
      quarterbackLine.passing.longestCompletion,
      Math.max(overtime.passingLongestMinimum, basePassingYards - overtime.passingLongestPenalty),
    );

    runnerLine.rushing.attempts += overtime.touchdownRushAttempts;
    runnerLine.rushing.yards += baseRushingYards;
    runnerLine.rushing.longestRush = Math.max(
      runnerLine.rushing.longestRush,
      Math.max(overtime.rushingLongestMinimum, baseRushingYards),
    );

    if (passingTouchdown) {
      quarterbackLine.passing.touchdowns += 1;
      receiverLine.receiving.targets += overtime.touchdownCompletions;
      receiverLine.receiving.receptions += overtime.touchdownCompletions;
      receiverLine.receiving.yards += basePassingYards;
      receiverLine.receiving.touchdowns += 1;
      receiverLine.receiving.longestReception = Math.max(
        receiverLine.receiving.longestReception,
        Math.max(overtime.passingLongestMinimum, basePassingYards - overtime.passingLongestPenalty),
      );
      receiverLine.receiving.yardsAfterCatch += Math.round(basePassingYards * overtime.receivingYacShare);
    } else {
      runnerLine.rushing.touchdowns += 1;
      receiverLine.receiving.targets += 1;
      receiverLine.receiving.receptions += 1;
      receiverLine.receiving.yards += Math.round(basePassingYards * overtime.nonPassingTdReceivingShare);
    }

    if (offense.kicker) {
      const kickerLine = ensureLine(lines, offense.kicker);
      kickerLine.kicking.extraPointsAttempted += 1;

      if (
        random() <
        clamp(
          BALANCE.scoring.extraPoint.overtimeBaseChance +
            (offenseMetrics.kicking - BALANCE.scoring.extraPoint.kickingCenter) /
              BALANCE.scoring.extraPoint.kickingDivisor +
            (specialistConsistency(offense.kicker) - BALANCE.scoring.extraPoint.consistencyCenter) /
              BALANCE.scoring.extraPoint.consistencyDivisor +
            (offenseMetrics.snapOperation - BALANCE.scoring.extraPoint.snapOperationCenter) /
              BALANCE.scoring.extraPoint.snapOperationDivisor,
          BALANCE.scoring.extraPoint.overtimeMin,
          BALANCE.scoring.extraPoint.max,
        )
      ) {
        kickerLine.kicking.extraPointsMade += 1;
        offenseScore.score += 1;
      }
    }

    tacklerLine.defensive.tackles += 1;
    resultType = "OVERTIME_TOUCHDOWN";
    summary = `${offense.team.abbreviation} schliesst die Overtime-Possession mit einem Touchdown von ${passingTouchdown ? (formatPlayerName(receiver) ?? "einem Receiver") : (formatPlayerName(runner) ?? "einem Balltraeger")} ab.`;
    primaryPlayerName = passingTouchdown
      ? formatPlayerName(receiver)
      : formatPlayerName(runner);
    return {
      resultType,
      summary,
      primaryPlayerName,
      primaryDefenderName,
      timeOfPossessionSeconds,
      plays: overtime.touchdownPlays,
      passAttempts: overtime.touchdownPassAttempts,
      rushAttempts: overtime.touchdownRushAttempts,
      totalYards,
      turnover: false,
      redZoneTrip: true,
    };
  }

  if (driveEdge >= overtime.fieldGoalDriveEdgeMin) {
    quarterbackLine.passing.attempts += overtime.fieldGoalPassAttempts;
    quarterbackLine.passing.completions += overtime.fieldGoalCompletions;
    quarterbackLine.passing.yards += Math.round(basePassingYards * overtime.fieldGoalPassingShare);
    runnerLine.rushing.attempts += overtime.fieldGoalRushAttempts;
    runnerLine.rushing.yards += baseRushingYards;
    runnerLine.rushing.longestRush = Math.max(
      runnerLine.rushing.longestRush,
      Math.max(overtime.rushingFieldGoalLongestMinimum, baseRushingYards),
    );

    registerOvertimeFieldGoal(
      lines,
      offense,
      offenseMetrics,
      offenseScore,
      clamp(
        overtime.fieldGoalDistanceBase +
          randomInt(overtime.fieldGoalDistanceRandomRange[0], overtime.fieldGoalDistanceRandomRange[1], random),
        overtime.fieldGoalDistanceMin,
        overtime.fieldGoalDistanceMax,
      ),
      random,
    );
    tacklerLine.defensive.tackles += 1;
    resultType = offenseScore.score > defenseScore.score ? "OVERTIME_FIELD_GOAL" : "OVERTIME_EMPTY";
    summary =
      resultType === "OVERTIME_FIELD_GOAL"
        ? `${offense.team.abbreviation} bringt die Overtime-Possession mit einem Field Goal ueber die Linie.`
        : `${offense.team.abbreviation} arbeitet sich in Field-Goal-Range vor, verwandelt aber nicht sicher.`;
    primaryPlayerName = formatPlayerName(offense.kicker ?? runner ?? quarterback);
    return {
      resultType,
      summary,
      primaryPlayerName,
      primaryDefenderName,
      timeOfPossessionSeconds,
      plays: overtime.fieldGoalPlays,
      passAttempts: overtime.fieldGoalPassAttempts,
      rushAttempts: overtime.fieldGoalRushAttempts,
      totalYards,
      turnover: false,
      redZoneTrip: false,
    };
  }

  if (
    random() <
    clamp(
      overtime.turnoverBaseChance +
        (defenseMetrics.takeawayPressure - offenseMetrics.ballSecurity) / overtime.turnoverDiffDivisor,
      overtime.turnoverMin,
      overtime.turnoverMax,
    )
  ) {
    offenseScore.turnovers += 1;
    defenseScore.firstDowns += 1;
    quarterbackLine.passing.attempts += overtime.turnoverPassAttempts;
    quarterbackLine.passing.interceptions += 1;
    const ballHawk = chooseBallHawk(defense, random);

    if (ballHawk) {
      const ballHawkLine = ensureLine(lines, ballHawk);
      ballHawkLine.defensive.interceptions += 1;
      ballHawkLine.defensive.passesDefended += 1;
    }

    resultType = "OVERTIME_TURNOVER";
    summary = `${defense.team.abbreviation} stoppt die Overtime-Possession mit einem Ballgewinn.`;
    primaryPlayerName = formatPlayerName(quarterback);
    primaryDefenderName = formatPlayerName(ballHawk ?? tackler);
  }

  tacklerLine.defensive.tackles += 1;
  return {
    resultType,
    summary,
    primaryPlayerName,
    primaryDefenderName,
    timeOfPossessionSeconds,
    plays: overtime.emptyDrivePlays,
    passAttempts: overtime.emptyDrivePassAttempts,
    rushAttempts: overtime.emptyDriveRushAttempts,
    totalYards,
    turnover: resultType === "OVERTIME_TURNOVER",
    redZoneTrip: false,
  };
}

function resolvePlayoffOvertime(
  context: SimulationMatchContext,
  home: PreparedTeam,
  away: PreparedTeam,
  homeMetrics: ReturnType<typeof calculateTeamMetrics>,
  awayMetrics: ReturnType<typeof calculateTeamMetrics>,
  scoreboard: Map<string, TeamSimulationResult>,
  lines: Map<string, PlayerSimulationLine>,
  drives: MatchDriveResult[],
  random: () => number,
) {
  if (context.kind !== "PLAYOFF") {
    return;
  }

  const homeScore = scoreboard.get(home.team.id);
  const awayScore = scoreboard.get(away.team.id);

  if (!homeScore || !awayScore || homeScore.score !== awayScore.score) {
    return;
  }

  let overtimeRound = 0;
  let overtimeClockRemaining = BALANCE.overtime.clockSeconds;

  while (
    homeScore.score === awayScore.score &&
    overtimeClockRemaining > 0 &&
    overtimeRound < MATCH_ENGINE_RULES.overtime.maxRounds
  ) {
    const homeBeforeScore = snapshotScore(scoreboard, home.team.id, away.team.id);
    const homePossession = runPlayoffOvertimePossession(
      lines,
      home,
      away,
      homeMetrics,
      awayMetrics,
      homeScore,
      awayScore,
      overtimeClockRemaining,
      random,
    );
    overtimeClockRemaining = Math.max(
      0,
      overtimeClockRemaining - homePossession.timeOfPossessionSeconds,
    );
    drives.push(
      createDriveLogEntry({
        sequence: drives.length + 1,
        phaseLabel: `OT${overtimeRound + 1}`,
        homeTeamId: home.team.id,
        awayTeamId: away.team.id,
        offense: home,
        defense: away,
        scoreboard,
        beforeScore: homeBeforeScore,
        plays: homePossession.plays,
        passAttempts: homePossession.passAttempts,
        rushAttempts: homePossession.rushAttempts,
        totalYards: homePossession.totalYards,
        resultType: homePossession.resultType,
        turnover: homePossession.turnover,
        redZoneTrip: homePossession.redZoneTrip,
        summary: homePossession.summary,
        primaryPlayerName: homePossession.primaryPlayerName,
        primaryDefenderName: homePossession.primaryDefenderName,
      }),
    );

    if (homeScore.score !== awayScore.score) {
      break;
    }

    if (overtimeClockRemaining <= 0) {
      break;
    }

    const awayBeforeScore = snapshotScore(scoreboard, home.team.id, away.team.id);
    const awayPossession = runPlayoffOvertimePossession(
      lines,
      away,
      home,
      awayMetrics,
      homeMetrics,
      awayScore,
      homeScore,
      overtimeClockRemaining,
      random,
    );
    overtimeClockRemaining = Math.max(
      0,
      overtimeClockRemaining - awayPossession.timeOfPossessionSeconds,
    );
    drives.push(
      createDriveLogEntry({
        sequence: drives.length + 1,
        phaseLabel: `OT${overtimeRound + 1}`,
        homeTeamId: home.team.id,
        awayTeamId: away.team.id,
        offense: away,
        defense: home,
        scoreboard,
        beforeScore: awayBeforeScore,
        plays: awayPossession.plays,
        passAttempts: awayPossession.passAttempts,
        rushAttempts: awayPossession.rushAttempts,
        totalYards: awayPossession.totalYards,
        resultType: awayPossession.resultType,
        turnover: awayPossession.turnover,
        redZoneTrip: awayPossession.redZoneTrip,
        summary: awayPossession.summary,
        primaryPlayerName: awayPossession.primaryPlayerName,
        primaryDefenderName: awayPossession.primaryDefenderName,
      }),
    );

    overtimeRound += 1;
  }

  if (homeScore.score !== awayScore.score) {
    return;
  }

  const tiebreak = BALANCE.overtime.tiebreak;
  const tiebreakRandomRange = MATCH_ENGINE_RULES.overtime.tiebreakRollRange;
  const homeTiebreak =
    homeMetrics.passGame * tiebreak.passGameWeight +
    homeMetrics.runGame * tiebreak.runGameWeight +
    homeMetrics.kicking * tiebreak.kickingWeight +
    homeMetrics.ballSecurity * tiebreak.ballSecurityWeight +
    HOME_FIELD_EDGE * tiebreak.homeFieldWeight +
    randomInt(tiebreakRandomRange[0], tiebreakRandomRange[1], random);
  const awayTiebreak =
    awayMetrics.passGame * tiebreak.passGameWeight +
    awayMetrics.runGame * tiebreak.runGameWeight +
    awayMetrics.kicking * tiebreak.kickingWeight +
    awayMetrics.ballSecurity * tiebreak.ballSecurityWeight +
    randomInt(tiebreakRandomRange[0], tiebreakRandomRange[1], random);
  const winner =
    homeTiebreak === awayTiebreak ? (random() < 0.5 ? home : away) : homeTiebreak > awayTiebreak ? home : away;
  const winnerMetrics = winner.team.id === home.team.id ? homeMetrics : awayMetrics;
  const winnerScore = scoreboard.get(winner.team.id);

  if (!winnerScore) {
    return;
  }

  const beforeScore = snapshotScore(scoreboard, home.team.id, away.team.id);
  registerOvertimeFieldGoal(
    lines,
    winner,
    winnerMetrics,
    winnerScore,
    clamp(
      tiebreak.fieldGoalDistanceBase +
        randomInt(tiebreak.fieldGoalDistanceRandomRange[0], tiebreak.fieldGoalDistanceRandomRange[1], random),
      tiebreak.fieldGoalDistanceMin,
      tiebreak.fieldGoalDistanceMax,
    ),
    random,
  );
  drives.push(
    createDriveLogEntry({
      sequence: drives.length + 1,
      phaseLabel: `OT${overtimeRound + 1}`,
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      offense: winner,
      defense: winner.team.id === home.team.id ? away : home,
      scoreboard,
      beforeScore,
      plays: tiebreak.plays,
      passAttempts: tiebreak.passAttempts,
      rushAttempts: tiebreak.rushAttempts,
      totalYards: tiebreak.totalYards,
      resultType: "OVERTIME_TIEBREAKER",
      turnover: false,
      redZoneTrip: false,
      summary: `${winner.team.abbreviation} entscheidet das Playoff-Match nach ausgeglichener Overtime ueber den Tie-Break-Drive.`,
      primaryPlayerName: formatPlayerName(winner.kicker),
      primaryDefenderName: null,
    }),
  );
}

export function simulateMatch(
  context: SimulationMatchContext,
  random: () => number = createSeededRandom(context.simulationSeed),
): MatchSimulationResult {
  const home = prepareTeamForSimulation(context.homeTeam, context.simulationSeed);
  const away = prepareTeamForSimulation(context.awayTeam, context.simulationSeed);
  const homeMetrics = calculateTeamMetrics(home);
  const awayMetrics = calculateTeamMetrics(away);
  const playerLines = new Map<string, PlayerSimulationLine>();
  const drives: MatchDriveResult[] = [];
  const plannedDrivesPerTeam =
    BASE_DRIVES_PER_TEAM +
    randomInt(
      BALANCE.drive.count.plannedDrivesVariance[0],
      BALANCE.drive.count.plannedDrivesVariance[1],
      random,
    );
  const regulationClock = createRegulationClockState();
  const maxDrives = BALANCE.drive.count.maxDrives;

  flagStarter(playerLines, home);
  flagStarter(playerLines, away);
  applyBaseSnaps(playerLines, home, plannedDrivesPerTeam);
  applyBaseSnaps(playerLines, away, plannedDrivesPerTeam);

  const scoreboard = new Map<string, TeamSimulationResult>([
    [
      home.team.id,
      {
        teamId: home.team.id,
        score: 0,
        touchdowns: 0,
        firstDowns: 0,
        totalYards: 0,
        passingYards: 0,
        rushingYards: 0,
        turnovers: 0,
        sacks: 0,
        explosivePlays: 0,
        redZoneTrips: 0,
        redZoneTouchdowns: 0,
        penalties: 0,
        timeOfPossessionSeconds: 0,
      },
    ],
    [
      away.team.id,
      {
        teamId: away.team.id,
        score: 0,
        touchdowns: 0,
        firstDowns: 0,
        totalYards: 0,
        passingYards: 0,
        rushingYards: 0,
        turnovers: 0,
        sacks: 0,
        explosivePlays: 0,
        redZoneTrips: 0,
        redZoneTouchdowns: 0,
        penalties: 0,
        timeOfPossessionSeconds: 0,
      },
    ],
  ]);

  let possession = random() < 0.5 ? home : away;
  const pendingStartFieldPositions = new Map<string, number>();
  let driveIndex = 0;

  while (
    regulationClock.secondsRemainingInGame > 0 &&
    driveIndex < maxDrives
  ) {
    const offense = possession;
    const defense = offense.team.id === home.team.id ? away : home;
    const offenseMetrics = offense.team.id === home.team.id ? homeMetrics : awayMetrics;
    const defenseMetrics = defense.team.id === home.team.id ? homeMetrics : awayMetrics;
    const ratingEdge = offense.team.overallRating - defense.team.overallRating;
    const passGameDiff = compressNearPeerMetricDiff(
      offenseMetrics.passGame - defenseMetrics.passDefense,
      ratingEdge,
    );
    const runGameDiff = compressNearPeerMetricDiff(
      offenseMetrics.runGame - defenseMetrics.runDefense,
      ratingEdge,
    );
    const unitMatchups = calculateUnitMatchups(offenseMetrics, defenseMetrics, ratingEdge);
    const offenseScore = scoreboard.get(offense.team.id);
    const defenseScore = scoreboard.get(defense.team.id);
    const quarterback = offense.quarterbacks[0] ?? offense.participants[0];
    const runner = chooseRunner(offense, random);
    const receiver = chooseReceiver(offense, random);
    const tackler = chooseTackler(defense, random);
    const beforeScore = snapshotScore(scoreboard, home.team.id, away.team.id);
    const scoreDelta =
      offense.team.id === home.team.id
        ? beforeScore.home - beforeScore.away
        : beforeScore.away - beforeScore.home;
    const offenseXFactorPlan = context.teamGameplans?.[offense.team.id]?.offenseXFactorPlan;
    const startSecondsRemainingInGame = regulationClock.secondsRemainingInGame;
    const drivePhaseLabel = currentQuarterLabel(regulationClock);
    const pendingStartFieldPosition = pendingStartFieldPositions.get(offense.team.id);
    const startFieldPosition = pendingStartFieldPosition ?? chooseDriveStartFieldPosition(random);
    pendingStartFieldPositions.delete(offense.team.id);
    const clockPlays = randomInt(
      OFFENSIVE_PLAYS_PER_DRIVE_RANGE[0],
      OFFENSIVE_PLAYS_PER_DRIVE_RANGE[1],
      random,
    );
    const quarterbackMovement = quarterbackMobility(quarterback);
    const homeFieldBonus = offense.team.id === home.team.id ? HOME_FIELD_EDGE : -HOME_FIELD_EDGE;
    const playLogCompression = BALANCE.drive.playLogCompression;
    const drivePlayReduction =
      playLogCompression.thresholds.find((threshold) => clockPlays >= threshold.clockPlaysMin)
        ?.reduction ?? 0;
    const officialDrivePlays = clamp(
      clockPlays - drivePlayReduction,
      playLogCompression.officialPlaysMin,
      playLogCompression.officialPlaysMax,
    );
    const plays = clockPlays;
    const trailingDriveReliefActive =
      scoreDelta <= -10 &&
      regulationClock.secondsRemainingInGame <= 2400 &&
      regulationClock.secondsRemainingInGame >= 180;
    const trailingDriveRelief =
      trailingDriveReliefActive
        ? clamp(
            Math.round(Math.abs(scoreDelta) / 4) + randomInt(4, 10, random),
            8,
            24,
          )
        : 0;
    const underdogComebackActive =
      ratingEdge <= -6 &&
      scoreDelta <= -7 &&
      regulationClock.secondsRemainingInGame <= 2700 &&
      regulationClock.secondsRemainingInGame >= 120;
    const underdogComebackBoost =
      underdogComebackActive
        ? clamp(
            Math.round(Math.abs(ratingEdge) / 2) +
              Math.round(Math.abs(scoreDelta) / 6) +
              (offenseXFactorPlan?.aggression === "AGGRESSIVE" ? 2 : 0) +
              randomInt(0, 5, random),
            4,
            16,
          )
        : 0;
    const leadingDriveThrottleActive =
      scoreDelta >= 17 &&
      regulationClock.secondsRemainingInGame <= 2100 &&
      regulationClock.secondsRemainingInGame >= 120;
    const leadingDriveThrottle =
      leadingDriveThrottleActive
        ? clamp(
            Math.round(scoreDelta / 6) +
              (ratingEdge >= 6 ? 2 : 0) +
              randomInt(0, 4, random),
            3,
            13,
          )
        : 0;
    const passPreferenceConfig = BALANCE.playSuccess.passPreference;
    const passPreference = clamp(
      passPreferenceConfig.base +
        (offenseMetrics.passGame - offenseMetrics.runGame) / passPreferenceConfig.passRunDiffDivisor +
        (unitMatchups.passEdge - unitMatchups.runEdge) / 260 +
        (gradedAttribute(quarterback, "THROW_ACCURACY_MEDIUM") - gradedAttribute(runner, "VISION")) / passPreferenceConfig.qbRunnerDiffDivisor -
        (quarterbackMovement - passPreferenceConfig.mobilityCenter) / passPreferenceConfig.mobilityDivisor,
      passPreferenceConfig.min,
      passPreferenceConfig.max,
    );
    const passAttempts = clamp(Math.round(plays * passPreference), 1, plays - 1);
    const rushAttempts = Math.max(1, plays - passAttempts);
    const sackPressureConfig = BALANCE.playSuccess.sackPressure;
    const sackPressure = clamp(
      sackPressureConfig.base +
        -passGameDiff / sackPressureConfig.passDefenseDiffDivisor -
        (quarterbackMovement - sackPressureConfig.mobilityCenter) / sackPressureConfig.mobilityDivisor +
        unitMatchups.passRushEdge / 95 -
        (gradedAttribute(quarterback, "POCKET_PRESENCE") - sackPressureConfig.pocketPresenceCenter) /
          sackPressureConfig.pocketPresenceDivisor,
      sackPressureConfig.min,
      sackPressureConfig.max,
    );
    const sacksTaken =
      random() < sackPressure ? (random() < sackPressureConfig.twoSackChance ? 2 : 1) : 0;
    const thrownAttempts = Math.max(0, passAttempts - sacksTaken);
    const pressuresAllowed =
      sacksTaken + (random() < sackPressureConfig.extraPressureChance ? 1 : 0);
    const completionConfig = BALANCE.playSuccess.completionRate;
    const completionRate = clamp(
      completionConfig.base +
        (gradedAttribute(quarterback, "THROW_ACCURACY_SHORT") - completionConfig.shortAccuracyCenter) /
          completionConfig.shortAccuracyDivisor +
        (receivingHands(receiver) - completionConfig.handsCenter) / completionConfig.handsDivisor +
        (gradedAttribute(quarterback, "DECISION_MAKING") - completionConfig.decisionCenter) /
          completionConfig.decisionDivisor -
        (defenseMetrics.passDefense - completionConfig.passDefenseCenter) / completionConfig.passDefenseDivisor -
        unitMatchups.coverageEdge / 120 +
        unitMatchups.passEdge / 180 -
        pressuresAllowed * completionConfig.pressurePenalty,
      completionConfig.min,
      completionConfig.max,
    );
    const dropConfig = BALANCE.playSuccess.dropRate;
    const dropRate = clamp(
      dropConfig.base +
        (dropConfig.handsCenter - receivingHands(receiver)) / dropConfig.handsDivisor +
        (defenseMetrics.passDefense - dropConfig.passDefenseCenter) / dropConfig.passDefenseDivisor,
      dropConfig.min,
      dropConfig.max,
    );
    const drops = clamp(
      Math.round(thrownAttempts * dropRate),
      0,
      Math.max(thrownAttempts - 1, 0),
    );
    const completions = clamp(
      Math.round(thrownAttempts * completionRate) - drops,
      0,
      thrownAttempts,
    );
    const scrambleConfig = BALANCE.playSuccess.scramble;
    const quarterbackScrambles =
      quarterback.positionCode === "QB" &&
      random() <
        clamp(
          scrambleConfig.base +
            (quarterbackMovement - scrambleConfig.mobilityCenter) / scrambleConfig.mobilityDivisor +
            sacksTaken * scrambleConfig.sackPressureBonus,
          scrambleConfig.chanceMin,
          scrambleConfig.chanceMax,
        )
        ? 1
        : 0;
    const runningBackAttempts = Math.max(0, rushAttempts - quarterbackScrambles);
    const scrambleYards = quarterbackScrambles
      ? clamp(
          randomInt(scrambleConfig.yardRange[0], scrambleConfig.yardRange[1], random) +
            Math.round((quarterbackMovement - scrambleConfig.yardMobilityCenter) / scrambleConfig.yardMobilityDivisor),
          scrambleConfig.yardsMin,
          scrambleConfig.yardsMax,
        )
      : 0;
    const runStuffConfig = BALANCE.playSuccess.runStuff;
    const runStuffed = random() <
      clamp(
        runStuffConfig.base +
          -runGameDiff / runStuffConfig.runDefenseDiffDivisor -
          unitMatchups.runEdge / 120,
        runStuffConfig.min,
        runStuffConfig.max,
      );
    const tackleForLossYards =
      runStuffed && rushAttempts > 0 && random() < runStuffConfig.tackleForLossChance
        ? randomInt(runStuffConfig.tackleForLossYardRange[0], runStuffConfig.tackleForLossYardRange[1], random)
        : 0;
    const penaltyConfig = BALANCE.playSuccess.penalty;
    const averageOffensiveDiscipline = average(
      offense.participants,
      (player) => gradedAttribute(player, "DISCIPLINE"),
    );
    const holdingPenalty = random() <
      clamp(
        penaltyConfig.holdingBase +
          (penaltyConfig.disciplineCenter - averageOffensiveDiscipline) / penaltyConfig.disciplineDivisor,
        penaltyConfig.holdingMin,
        penaltyConfig.holdingMax,
      );
    const secondaryPenaltyChance = clamp(
      (penaltyConfig.disciplineCenter - averageOffensiveDiscipline) / penaltyConfig.secondaryDisciplineDivisor,
      penaltyConfig.secondaryMin,
      penaltyConfig.secondaryMax,
    );
    const procedurePenaltyChance = clamp(
      0.14 +
        Math.max(0, officialDrivePlays - 5) * 0.015 +
        (penaltyConfig.disciplineCenter - averageOffensiveDiscipline) / 360,
      0.08,
      0.26,
    );
    const midfieldDrive = startFieldPosition <= 35 && plays >= 6;
    const passingYardage = BALANCE.yardage.passing;
    let passYards = clamp(
      completions * randomInt(passingYardage.completionYardsRange[0], passingYardage.completionYardsRange[1], random) +
        Math.round(passGameDiff * passingYardage.passDefenseDiffMultiplier) +
        Math.round(unitMatchups.passEdge * 0.45) -
        Math.round(Math.max(unitMatchups.coverageEdge, 0) * 0.25) +
        Math.round(trailingDriveRelief * 0.7) +
        Math.round(underdogComebackBoost * 0.55) -
        Math.round(leadingDriveThrottle * 0.55) +
        (completions > 0 && random() < passingYardage.bonusCompletionChance
          ? randomInt(passingYardage.bonusYardsRange[0], passingYardage.bonusYardsRange[1], random)
          : 0) -
        (midfieldDrive ? passingYardage.midfieldDrivePenalty : 0),
      passingYardage.min,
      passingYardage.max,
    );
    const rushingYardage = BALANCE.yardage.rushing;
    let rushYards = clamp(
        runningBackAttempts * randomInt(rushingYardage.attemptYardsRange[0], rushingYardage.attemptYardsRange[1], random) +
        scrambleYards +
        Math.round(runGameDiff * rushingYardage.runDefenseDiffMultiplier) -
        Math.round(Math.max(-unitMatchups.runEdge, 0) * 0.2) +
        Math.round(unitMatchups.runEdge * 0.35) +
        Math.round(trailingDriveRelief * 0.3) +
        Math.round(underdogComebackBoost * 0.25) -
        Math.round(leadingDriveThrottle * 0.25) -
        tackleForLossYards,
      rushingYardage.min,
      rushingYardage.max,
    );
    const sackYardsLost =
      sacksTaken * randomInt(BALANCE.yardage.sackYardsLostRange[0], BALANCE.yardage.sackYardsLostRange[1], random);
    const rawTotalYards = Math.max(0, Math.max(0, passYards - sackYardsLost) + rushYards);
    const driveStopSignals =
      (runStuffed ? 1 : 0) +
      (tackleForLossYards > 0 ? 1 : 0) +
      (sacksTaken > 0 ? 1 : 0) +
      (holdingPenalty ? 1 : 0) +
      (thrownAttempts - completions >= 2 ? 1 : 0);
    const midfieldCompression = BALANCE.yardage.midfieldCompression;
    const midfieldYardageCompression =
      startFieldPosition >= midfieldCompression.startMin &&
      startFieldPosition <= midfieldCompression.startMax &&
      rawTotalYards >= midfieldCompression.rawYardsMin &&
      rawTotalYards <= midfieldCompression.rawYardsMax
        ? clamp(
            driveStopSignals +
              (rawTotalYards >= midfieldCompression.highRawYardsThreshold ? 1 : 0) +
              (plays >= midfieldCompression.playsThreshold ? 1 : 0),
            midfieldCompression.compressionMin,
            midfieldCompression.compressionMax,
          )
        : startFieldPosition >= midfieldCompression.startMin &&
            startFieldPosition <= midfieldCompression.extendedStartMax &&
            rawTotalYards > midfieldCompression.extendedRawYardsMinExclusive &&
            rawTotalYards <= midfieldCompression.extendedRawYardsMax &&
            driveStopSignals >= midfieldCompression.extendedStopSignalsMin
          ? midfieldCompression.extendedCompression
          : 0;

    if (midfieldYardageCompression > 0) {
      const passingReduction = Math.min(
        passYards,
        Math.ceil(midfieldYardageCompression * midfieldCompression.passingReductionShare),
      );
      const rushingReduction = Math.min(
        rushYards,
        midfieldYardageCompression - passingReduction,
      );
      const remainingReduction = midfieldYardageCompression - passingReduction - rushingReduction;
      passYards = Math.max(0, passYards - passingReduction - remainingReduction);
      rushYards = Math.max(0, rushYards - rushingReduction);
    }

    const adjustedPassingYards = Math.max(0, passYards - sackYardsLost);
    const totalYards = Math.max(0, adjustedPassingYards + rushYards);
    let creditedPassingYards = adjustedPassingYards;
    let creditedRushingYards = rushYards;
    let creditedTotalYards = totalYards;
    const turnoverConfig = BALANCE.playSuccess.turnover;
    const turnoverChance = clamp(
      turnoverConfig.base +
        (defenseMetrics.takeawayPressure - offenseMetrics.ballSecurity) / turnoverConfig.takeawayBallSecurityDivisor -
        (gradedAttribute(quarterback, "DISCIPLINE") - turnoverConfig.disciplineCenter) / turnoverConfig.disciplineDivisor +
        unitMatchups.decisionCoverageEdge / 150 -
        (quarterbackMovement - turnoverConfig.mobilityCenter) / turnoverConfig.mobilityDivisor -
        (receivingHands(receiver) - turnoverConfig.handsCenter) / turnoverConfig.handsDivisor -
        (trailingDriveReliefActive ? 0.025 : 0) +
        (underdogComebackActive && offenseXFactorPlan?.turnoverPlan === "HUNT_TURNOVERS" ? 0.018 : 0) -
        (underdogComebackActive ? 0.012 : 0),
      turnoverConfig.min,
      turnoverConfig.max,
    );
    const driveQualityConfig = BALANCE.drive.quality;
    const driveQuality =
      passGameDiff * driveQualityConfig.passGameWeight +
      runGameDiff * driveQualityConfig.runGameWeight +
      unitMatchups.passEdge * 0.5 +
      unitMatchups.runEdge * 0.45 +
      totalYards * driveQualityConfig.totalYardsWeight +
      trailingDriveRelief * 0.65 +
      underdogComebackBoost * 0.45 -
      leadingDriveThrottle * 0.55 +
      homeFieldBonus +
      randomInt(driveQualityConfig.randomRange[0], driveQualityConfig.randomRange[1], random);
    const turnover = random() < turnoverChance;
    const firstDowns = Math.max(0, Math.floor(totalYards / BALANCE.drive.firstDownYardsDivisor));
    let explosivePlays = 0;
    const passExplosiveChance =
      completions > 0
        ? clamp(
            0.12 +
              (passYards - PASS_EXPLOSIVE_YARDS) / 65 +
              unitMatchups.passEdge / 70 -
              Math.max(unitMatchups.coverageEdge, 0) / 90,
            0.03,
            0.72,
          )
        : 0;
    const rushExplosiveChance =
      rushAttempts > 0
        ? clamp(
            0.1 +
              (rushYards - RUSH_EXPLOSIVE_YARDS) / 55 +
              unitMatchups.runEdge / 85,
            0.02,
            0.62,
          )
        : 0;

    if (passYards >= PASS_EXPLOSIVE_YARDS && random() < passExplosiveChance) {
      explosivePlays += 1;
    }

    if (rushYards >= RUSH_EXPLOSIVE_YARDS && random() < rushExplosiveChance) {
      explosivePlays += 1;
    }
    const touchdownConfig = BALANCE.scoring.touchdown;
    const inRedZone =
      totalYards >= touchdownConfig.driveRedZoneTotalYardsThreshold ||
      driveQuality > touchdownConfig.driveRedZoneQualityThreshold;
    const fieldPosition = estimateFieldPosition(startFieldPosition, totalYards, random);
    const reachedEndZone =
      (
        fieldPosition >= touchdownConfig.fieldPositionThreshold &&
        driveQuality + unitMatchups.redZoneEdge > touchdownConfig.driveQualityThreshold
      ) ||
      (
        inRedZone &&
        fieldPosition >= touchdownConfig.redZoneFieldPositionThreshold &&
        driveQuality + unitMatchups.redZoneEdge > touchdownConfig.redZoneDriveQualityThreshold &&
        random() <
          clamp(
            touchdownConfig.redZoneBreakthroughChance + unitMatchups.redZoneEdge / 260,
            0.03,
            0.2,
          )
      );
    const coachingRiskProfile = resolveCoachingRiskProfile(
      offenseMetrics,
      defenseMetrics,
      random,
      offenseXFactorPlan,
    );

    if (
      coachingRiskProfile === "AGGRESSIVE" &&
      explosivePlays === 0 &&
      (passYards >= PASS_EXPLOSIVE_YARDS - 3 || rushYards >= RUSH_EXPLOSIVE_YARDS - 2) &&
      random() < 0.18
    ) {
      explosivePlays += 1;
    }

    let fourthDownDistance = clamp(
      estimateFourthDownDistance(driveQuality, totalYards, random) +
        (holdingPenalty ? 2 : 0) +
        sacksTaken +
        (tackleForLossYards > 2 ? 1 : 0),
      1,
      15,
    );
    const terminalPrep = BALANCE.drive.terminalPrep;
    const terminalPrepZone =
      fieldPosition >= terminalPrep.fieldPositionMin &&
      fieldPosition < terminalPrep.fieldPositionMaxExclusive &&
      fourthDownDistance >= terminalPrep.distanceMin &&
      fourthDownDistance <= terminalPrep.distanceMax;

    if (
      terminalPrepZone &&
      random() <
        (fieldPosition >= BALANCE.fourthDown.zones.opp35Min
          ? terminalPrep.opp35To20ShortenChance
          : terminalPrep.opp45To35ShortenChance)
    ) {
      fourthDownDistance =
        random() < terminalPrep.shortDistanceChance
          ? randomInt(terminalPrep.shortDistanceRange[0], terminalPrep.shortDistanceRange[1], random)
          : Math.max(terminalPrep.longFallbackMin, fourthDownDistance);
    }

    const fourthDownDecision = chooseFourthDownDecision({
      fieldPosition,
      yardsToGo: fourthDownDistance,
      scoreDelta,
      secondsRemainingInGame: regulationClock.secondsRemainingInGame,
      secondsRemainingInQuarter: regulationClock.secondsRemainingInQuarter,
      coachingRiskProfile,
      offenseMetrics,
      offense,
      random,
    });
    let driveResultType = "PUNT";
    let driveSummary = `${offense.team.abbreviation} endet ohne Punkte und gibt den Ball zurueck.`;
    let primaryPlayerName = formatPlayerName(receiver ?? runner ?? quarterback);
    let primaryDefenderName = formatPlayerName(tackler);
    let highestReachedFieldPosition = fieldPosition;
    let nextStartFieldPosition: number | null = null;
    let postFourthDownConverted: boolean | null = null;
    let postFourthDownYards: number | null = null;
    let targetedAggressiveGoForIt = false;
    let aggressiveGoForItResolution: string | null = null;
    let softFailCount = 0;
    let fourthDownAttempts = fourthDownDecision.decision ? 1 : 0;
    let playsAfterConvert: number | null = null;
    let postConvertOriginatedOpp35To20 = false;
    let postConvertEnteredOpp35To20 = false;
    let opp35To20FinishResult: string | null = null;
    let playsAfterOpp35To20Entry: number | null = null;

    if (!offenseScore || !defenseScore) {
      continue;
    }

    const kneelDown = BALANCE.clock.kneelDown;
    const kneelDownEligible =
      scoreDelta >= kneelDown.eligibleLeadMin &&
      regulationClock.quarter === kneelDown.eligibleQuarter &&
      regulationClock.secondsRemainingInGame <= kneelDown.eligibleSecondsRemainingMax;

    if (kneelDownEligible) {
      const kneelDownPlays = clamp(
        Math.ceil(regulationClock.secondsRemainingInGame / kneelDown.secondsPerKneel),
        kneelDown.playsMin,
        kneelDown.playsMax,
      );
      const timeOfPossession = estimateDrivePossessionTime(
        regulationClock,
        {
          plays: kneelDownPlays,
          passAttempts: 0,
          rushAttempts: kneelDownPlays,
          completions: 0,
          sacksTaken: 0,
          resultType: "EMPTY_DRIVE",
          clockMode: "KNEEL_DOWN",
        },
        random,
      );
      offenseScore.timeOfPossessionSeconds += timeOfPossession;
      possession = offense.team.id === home.team.id ? away : home;
      drives.push(
        createDriveLogEntry({
          sequence: drives.length + 1,
          phaseLabel: drivePhaseLabel,
          homeTeamId: home.team.id,
          awayTeamId: away.team.id,
          offense,
          defense,
          scoreboard,
          beforeScore,
          startSecondsRemainingInGame,
          plays: kneelDownPlays,
          passAttempts: 0,
          rushAttempts: kneelDownPlays,
          totalYards: 0,
          resultType: "EMPTY_DRIVE",
          turnover: false,
          redZoneTrip: false,
          summary: `${offense.team.abbreviation} geht in Victory Formation und kniet die Uhr kontrolliert herunter.`,
          primaryPlayerName: formatPlayerName(quarterback),
          primaryDefenderName: null,
          startFieldPosition,
          highestReachedFieldPosition: startFieldPosition,
          fourthDownBallPosition: null,
          fourthDownDistance: null,
          fourthDownScoreDelta: scoreDelta,
          fourthDownSecondsRemaining: regulationClock.secondsRemainingInGame,
          coachingRiskProfile,
          fourthDownDecision: null,
          terminalPlayDistance: null,
          postFourthDownConverted: null,
          postFourthDownYards: null,
          targetedAggressiveGoForIt: false,
          aggressiveGoForItResolution: "KNEEL_DOWN",
          softFailCount: 0,
          fourthDownAttempts: 0,
          playsAfterConvert: null,
          postConvertOriginatedOpp35To20: false,
          postConvertEnteredOpp35To20: false,
          opp35To20FinishResult: null,
          playsAfterOpp35To20Entry: null,
        }),
      );
      driveIndex += 1;
      continue;
    }

    offenseScore.totalYards += totalYards;
    offenseScore.passingYards += adjustedPassingYards;
    offenseScore.rushingYards += rushYards;
    offenseScore.firstDowns += firstDowns;
    offenseScore.explosivePlays += explosivePlays;

    offenseScore.penalties +=
      (holdingPenalty ? 1 : 0) +
      (random() < secondaryPenaltyChance ? 1 : 0) +
      (random() < procedurePenaltyChance ? 1 : 0);

    const quarterbackRushYards =
      quarterbackScrambles === 0
        ? 0
        : runningBackAttempts === 0
          ? rushYards
          : Math.min(scrambleYards, rushYards);
    const runnerRushYards = Math.max(0, rushYards - quarterbackRushYards);
    const quarterbackLine = ensureLine(playerLines, quarterback);
    const rushingDistribution = distributeRushingProduction(
      playerLines,
      offense,
      runningBackAttempts,
      runnerRushYards,
      random,
    );
    const receivingDistribution = distributeReceivingProduction(
      playerLines,
      offense,
      thrownAttempts,
      completions,
      drops,
      passYards,
      random,
    );
    const coverageDistribution = distributeCoverageProduction(
      playerLines,
      defense,
      thrownAttempts,
      completions,
      passYards,
      random,
    );
    const primaryRunner = rushingDistribution.primaryRunner ?? runner;
    const primaryReceiver = receivingDistribution.primaryReceiver ?? receiver;
    const primaryCoverageDefender =
      coverageDistribution.primaryCoverageDefender ?? chooseBallHawk(defense, random) ?? tackler;

    registerCoverageSnaps(playerLines, defense, passAttempts);

    quarterbackLine.passing.attempts += passAttempts;
    quarterbackLine.passing.attempts -= sacksTaken;
    quarterbackLine.passing.completions += completions;
    quarterbackLine.passing.yards += adjustedPassingYards;
    quarterbackLine.passing.sacksTaken += sacksTaken;
    quarterbackLine.passing.sackYardsLost += sacksTaken * 6;
    quarterbackLine.passing.longestCompletion = Math.max(
      quarterbackLine.passing.longestCompletion,
      completions > 0 ? Math.max(8, Math.round(passYards / Math.max(completions, 1)) + randomInt(3, 12, random)) : 0,
    );

    if (quarterbackScrambles > 0) {
      quarterbackLine.rushing.attempts += quarterbackScrambles;
      quarterbackLine.rushing.yards += quarterbackRushYards;
      quarterbackLine.rushing.longestRush = Math.max(
        quarterbackLine.rushing.longestRush,
        quarterbackRushYards,
      );
    }

    if (tackleForLossYards > 0) {
      const runStopper = chooseTackler(defense, random);
      if (runStopper) {
        const stopLine = ensureLine(playerLines, runStopper);
        stopLine.defensive.tacklesForLoss += 1;
      }
    }

    if (thrownAttempts > completions && random() < 0.42) {
      ensureLine(playerLines, primaryCoverageDefender).defensive.passesDefended += 1;
    }

    registerBlockingSnaps(
      playerLines,
      offense,
      passAttempts,
      rushAttempts,
      sacksTaken,
      pressuresAllowed,
      random,
    );

    if (turnover) {
      offenseScore.turnovers += 1;
      defenseScore.firstDowns += 1;
      driveResultType = "TURNOVER";
      driveSummary = `${defense.team.abbreviation} erzwingt nach ${totalYards} Yards Raumgewinn einen Ballverlust.`;
      nextStartFieldPosition = clamp(
        100 - fieldPosition + randomInt(-3, 8, random),
        1,
        80,
      );
      primaryPlayerName = formatPlayerName(quarterback);
      let turnoverDefender = primaryCoverageDefender;

      if (passAttempts >= rushAttempts) {
        quarterbackLine.passing.interceptions += 1;
        const ballHawk = chooseBallHawk(defense, random) ?? primaryCoverageDefender;

        if (ballHawk) {
          const ballHawkLine = ensureLine(playerLines, ballHawk);
          ballHawkLine.defensive.interceptions += 1;
          ballHawkLine.defensive.passesDefended += 1;
          turnoverDefender = ballHawk;
        }
      } else {
        ensureLine(playerLines, primaryRunner).rushing.fumbles += 1;
        primaryPlayerName = formatPlayerName(primaryRunner);
        const enforcer = chooseTackler(defense, random);

        if (enforcer) {
          const enforcerLine = ensureLine(playerLines, enforcer);
          enforcerLine.defensive.forcedFumbles += 1;
          enforcerLine.defensive.fumbleRecoveries += 1;
          turnoverDefender = enforcer;
        }
      }

      primaryDefenderName = formatPlayerName(turnoverDefender);
      distributeTackleProduction(playerLines, defense, 1, random);
    } else if (reachedEndZone) {
      const isPassingTouchdown =
        passAttempts >= rushAttempts && random() < BALANCE.scoring.touchdown.passingTouchdownChance;
      driveResultType = "TOUCHDOWN";

      offenseScore.score += BALANCE.scoring.touchdown.points;
      offenseScore.touchdowns += 1;

      if (isPassingTouchdown) {
        quarterbackLine.passing.touchdowns += 1;
        ensureLine(playerLines, primaryReceiver).receiving.touchdowns += 1;
        primaryPlayerName = formatPlayerName(primaryReceiver);
        driveSummary = `${offense.team.abbreviation} schliesst den Drive mit einem Passing Touchdown auf ${formatPlayerName(primaryReceiver) ?? "einen Receiver"} ab.`;
      } else {
        ensureLine(playerLines, primaryRunner).rushing.touchdowns += 1;
        primaryPlayerName = formatPlayerName(primaryRunner);
        driveSummary = `${offense.team.abbreviation} vollendet den Drive mit einem Rushing Touchdown von ${formatPlayerName(primaryRunner) ?? "einem Balltraeger"}.`;
      }

      if (offense.kicker) {
        const kickerLine = ensureLine(playerLines, offense.kicker);
        kickerLine.kicking.extraPointsAttempted += 1;
        const extraPoint = BALANCE.scoring.extraPoint;
        const extraPointChance = clamp(
          extraPoint.baseChance +
            (offenseMetrics.kicking - extraPoint.kickingCenter) / extraPoint.kickingDivisor +
            (specialistConsistency(offense.kicker) - extraPoint.consistencyCenter) / extraPoint.consistencyDivisor +
            (offenseMetrics.snapOperation - extraPoint.snapOperationCenter) / extraPoint.snapOperationDivisor,
          extraPoint.min,
          extraPoint.max,
        );

        if (random() < extraPointChance) {
          kickerLine.kicking.extraPointsMade += 1;
          offenseScore.score += 1;
        }

        if (
          random() <
          clamp(
            BALANCE.scoring.kickoffTouchback.baseChance +
              (gradedAttribute(offense.kicker, "KICKOFF_POWER") - BALANCE.scoring.kickoffTouchback.powerCenter) /
                BALANCE.scoring.kickoffTouchback.powerDivisor,
            BALANCE.scoring.kickoffTouchback.min,
            BALANCE.scoring.kickoffTouchback.max,
          )
        ) {
          kickerLine.kicking.kickoffTouchbacks += 1;
        }
      }

      registerKickoffReturn(
        playerLines,
        defense.kickReturner,
        offense.kicker ? gradedAttribute(offense.kicker, "KICKOFF_POWER") : 70,
        random,
      );
      primaryDefenderName = formatPlayerName(
        distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 3), random)
          .primaryTackler,
      );
    } else if (
      trailingDriveReliefActive &&
      offense.kicker &&
      fieldPosition >= 45 &&
      random() <
        clamp(
          0.34 + trailingDriveRelief / 42 + (fieldPosition - 45) / 95,
          0.42,
          0.84,
        )
    ) {
      const distance = clamp(BALANCE.fieldGoal.kickDistance.constant - fieldPosition, 35, 60);
      const kickerConsistency = specialistConsistency(offense.kicker);
      const makeChance = clamp(
        0.66 +
          (offenseMetrics.kicking - 68) / 150 +
          (kickerConsistency - 70) / 220 -
          (distance - 42) / 125,
        0.46,
        0.9,
      );
      const kickerLine = ensureLine(playerLines, offense.kicker);
      const bucket = fieldGoalBucket(distance);

      kickerLine.kicking.fieldGoalsAttempted += 1;
      kickerLine.kicking.longestFieldGoal = Math.max(kickerLine.kicking.longestFieldGoal, distance);
      if (bucket === "SHORT") {
        kickerLine.kicking.fieldGoalsAttemptedShort += 1;
      } else if (bucket === "MID") {
        kickerLine.kicking.fieldGoalsAttemptedMid += 1;
      } else {
        kickerLine.kicking.fieldGoalsAttemptedLong += 1;
      }

      if (random() < makeChance) {
        kickerLine.kicking.fieldGoalsMade += 1;
        if (bucket === "SHORT") {
          kickerLine.kicking.fieldGoalsMadeShort += 1;
        } else if (bucket === "MID") {
          kickerLine.kicking.fieldGoalsMadeMid += 1;
        } else {
          kickerLine.kicking.fieldGoalsMadeLong += 1;
        }
        offenseScore.score += BALANCE.fieldGoal.points;
        driveResultType = "FIELD_GOAL_MADE";
        driveSummary = `${offense.team.abbreviation} nimmt im Rueckstand die freien Yards und kickt das Field Goal aus ${distance} Yards.`;
      } else {
        driveResultType = "FIELD_GOAL_MISSED";
        driveSummary = `${offense.team.abbreviation} kommt im Rueckstand in Kick-Reichweite, verfehlt aber aus ${distance} Yards.`;
      }

      primaryPlayerName = formatPlayerName(offense.kicker);
      primaryDefenderName = formatPlayerName(
        distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 4), random)
          .primaryTackler,
      );
    } else if (fourthDownDecision.decision === "FIELD_GOAL") {
      if (offense.kicker) {
        const distance = fourthDownDecision.kickDistance;
        const kickerConsistency = specialistConsistency(offense.kicker);
        const strongKicker = kickerConsistency + offenseMetrics.kicking >= BALANCE.fieldGoal.strongKickerThreshold;
        const declineChance = longFieldGoalDeclineChance({
          distance,
          fieldPosition: fourthDownDecision.fieldPosition,
          scoreDelta,
          secondsRemainingInGame: regulationClock.secondsRemainingInGame,
          coachingRiskProfile,
          strongKicker,
        });
        const fieldGoalOutcomeRoll = random();

        if (declineChance > 0 && fieldGoalOutcomeRoll < declineChance) {
          driveResultType = "EMPTY_DRIVE";
          primaryPlayerName = formatPlayerName(offense.kicker);
          driveSummary = `${offense.team.abbreviation} verzichtet bei 4th & ${fourthDownDecision.yardsToGo} auf das riskante Field Goal aus ${distance} Yards und spielt auf Feldposition.`;
        } else {
          const makeChanceConfig = BALANCE.fieldGoal.makeChance;
          const makeChance = clamp(
            makeChanceConfig.base +
              (offenseMetrics.kicking - makeChanceConfig.kickingCenter) / makeChanceConfig.kickingDivisor +
              (kickerConsistency - makeChanceConfig.consistencyCenter) / makeChanceConfig.consistencyDivisor +
              (offenseMetrics.snapOperation - makeChanceConfig.snapOperationCenter) / makeChanceConfig.snapOperationDivisor -
              (distance - makeChanceConfig.distanceCenter) / makeChanceConfig.distanceDivisor -
              (
                fourthDownDecision.fieldPosition >= BALANCE.fourthDown.zones.opp35Min &&
                fourthDownDecision.fieldPosition < BALANCE.fourthDown.zones.redZoneMin &&
                distance >= makeChanceConfig.longPlusTerritoryDistanceMin
                  ? makeChanceConfig.longPlusTerritoryPenalty
                  : 0
              ) -
              longFieldGoalRiskPenalty(distance),
            makeChanceConfig.min,
            makeChanceConfig.max,
          );
          const kickerLine = ensureLine(playerLines, offense.kicker);
          const bucket = fieldGoalBucket(distance);
          kickerLine.kicking.fieldGoalsAttempted += 1;
          kickerLine.kicking.longestFieldGoal = Math.max(kickerLine.kicking.longestFieldGoal, distance);
          if (bucket === "SHORT") {
            kickerLine.kicking.fieldGoalsAttemptedShort += 1;
          } else if (bucket === "MID") {
            kickerLine.kicking.fieldGoalsAttemptedMid += 1;
          } else {
            kickerLine.kicking.fieldGoalsAttemptedLong += 1;
          }

          const madeThreshold =
            declineChance > 0
              ? declineChance + (1 - declineChance) * makeChance
              : makeChance;

          if (fieldGoalOutcomeRoll < madeThreshold) {
            kickerLine.kicking.fieldGoalsMade += 1;
            if (bucket === "SHORT") {
              kickerLine.kicking.fieldGoalsMadeShort += 1;
            } else if (bucket === "MID") {
              kickerLine.kicking.fieldGoalsMadeMid += 1;
            } else {
              kickerLine.kicking.fieldGoalsMadeLong += 1;
            }
            offenseScore.score += BALANCE.fieldGoal.points;
            driveResultType = "FIELD_GOAL_MADE";
            primaryPlayerName = formatPlayerName(offense.kicker);
            driveSummary = `${offense.team.abbreviation} kickt das Field Goal aus ${distance} Yards nach 4th & ${fourthDownDecision.yardsToGo}.`;
          } else {
            driveResultType = "FIELD_GOAL_MISSED";
            primaryPlayerName = formatPlayerName(offense.kicker);
            driveSummary = `${offense.team.abbreviation} verfehlt das Field Goal aus ${distance} Yards bei 4th & ${fourthDownDecision.yardsToGo}.`;
          }
        }
      } else {
        driveResultType = "EMPTY_DRIVE";
        driveSummary = `${offense.team.abbreviation} arbeitet sich vor, hat aber keinen Kicker fuer Punkte.`;
      }

      primaryDefenderName = formatPlayerName(
        distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 4), random)
          .primaryTackler,
      );
    } else if (fourthDownDecision.decision === "GO_FOR_IT") {
      const zones = BALANCE.fourthDown.zones;
      const goForIt = BALANCE.goForItResolution;
      const conversionConfig = goForIt.conversionChance;
      const postConvertConfig = goForIt.postConvert;
      const directOpp45To35GoForIt =
        fourthDownDecision.fieldPosition >= zones.opp45Min &&
        fourthDownDecision.fieldPosition < zones.opp35Min;
      const directOpp35To20GoForIt =
        fourthDownDecision.fieldPosition >= zones.opp35Min &&
        fourthDownDecision.fieldPosition < zones.redZoneMin;
      const directShortGoForIt = fourthDownDecision.yardsToGo <= 2;
      const directMediumGoForIt =
        fourthDownDecision.yardsToGo >= 3 &&
        fourthDownDecision.yardsToGo <= 5;
      targetedAggressiveGoForIt =
        coachingRiskProfile === "AGGRESSIVE" &&
        directOpp45To35GoForIt &&
        directMediumGoForIt;
      const directPlusTerritoryBoost =
        directOpp35To20GoForIt && directShortGoForIt
          ? goForIt.directPlusTerritoryBoost.opp35Short
          : directOpp35To20GoForIt && directMediumGoForIt
            ? goForIt.directPlusTerritoryBoost.opp35Medium
            : directOpp45To35GoForIt && directShortGoForIt
              ? goForIt.directPlusTerritoryBoost.opp45Short
              : targetedAggressiveGoForIt
                ? goForIt.directPlusTerritoryBoost.targetedAggressive
                : 0;
      const conversionChanceCap =
        directOpp35To20GoForIt && directShortGoForIt
          ? conversionConfig.capOpp35Short
          : directOpp45To35GoForIt && directShortGoForIt
            ? conversionConfig.capOpp45Short
            : (directOpp35To20GoForIt || directOpp45To35GoForIt) && directMediumGoForIt
              ? conversionConfig.capPlusMedium
              : conversionConfig.capDefault;
      const conversionChance = clamp(
        conversionConfig.base -
          (fourthDownDecision.yardsToGo - 1) * conversionConfig.yardsToGoPenalty +
          runGameDiff / conversionConfig.runDiffDivisor +
          passGameDiff / conversionConfig.passDiffDivisor +
          (fourthDownDecision.fieldPosition >= zones.opp35Min ? conversionConfig.opp35Bonus : 0) +
          directPlusTerritoryBoost +
          (
            coachingRiskProfile === "AGGRESSIVE"
              ? conversionConfig.aggressiveCoachBonus
              : coachingRiskProfile === "CONSERVATIVE"
                ? conversionConfig.conservativeCoachPenalty
                : 0
          ),
        conversionConfig.min,
        conversionChanceCap,
      );
      const conversionRoll = random();
      let converted = conversionRoll < conversionChance;
      let softFailMode: "DEFENSIVE_PENALTY" | "SNEAK_CONVERT" | "PLAY_EXTENSION" | "MANAGED_DIRECT_CONVERT" | null = null;

      if (!converted && targetedAggressiveGoForIt) {
        const softFailChance = goForIt.softFail.targetedAggressiveChance;

        if (random() < softFailChance) {
          const softFailRoll = random();
          softFailCount = 1;
          converted = true;

          if (softFailRoll < goForIt.softFail.defensivePenaltyThreshold) {
            softFailMode = "DEFENSIVE_PENALTY";
          } else if (softFailRoll < goForIt.softFail.sneakConvertThreshold) {
            softFailMode = "SNEAK_CONVERT";
          } else {
            softFailMode = "PLAY_EXTENSION";
          }
        }
      }

      if (
        !converted &&
        coachingRiskProfile === "AGGRESSIVE" &&
        (directOpp35To20GoForIt || directOpp45To35GoForIt) &&
        (directShortGoForIt || directMediumGoForIt) &&
        random() <
          (
            directShortGoForIt
              ? directOpp35To20GoForIt
                ? goForIt.softFail.managedDirectShortOpp35Chance
                : goForIt.softFail.managedDirectShortOpp45Chance
              : directOpp35To20GoForIt
                ? goForIt.softFail.managedDirectMediumOpp35Chance
                : goForIt.softFail.managedDirectMediumOpp45Chance
          )
      ) {
        converted = true;
        softFailMode = "MANAGED_DIRECT_CONVERT";
      }

      if (converted) {
        postFourthDownConverted = true;
        aggressiveGoForItResolution =
          softFailMode === "DEFENSIVE_PENALTY"
            ? "SOFT_FAIL_AUTO_FIRST"
            : softFailMode === "SNEAK_CONVERT"
              ? "SOFT_FAIL_SNEAK_CONVERT"
              : softFailMode === "PLAY_EXTENSION"
                ? "SOFT_FAIL_PLAY_EXTENSION"
                : softFailMode === "MANAGED_DIRECT_CONVERT"
                  ? "MANAGED_DIRECT_CONVERT"
                  : "CONVERTED";
        const postConversionYardsBase =
          softFailMode === "DEFENSIVE_PENALTY"
            ? fourthDownDecision.yardsToGo +
              randomInt(
                postConvertConfig.defensivePenaltyBonusRange[0],
                postConvertConfig.defensivePenaltyBonusRange[1],
                random,
              )
            : softFailMode === "SNEAK_CONVERT"
              ? fourthDownDecision.yardsToGo +
                randomInt(
                  postConvertConfig.sneakConvertBonusRange[0],
                  postConvertConfig.sneakConvertBonusRange[1],
                  random,
                )
              : softFailMode === "PLAY_EXTENSION"
                ? fourthDownDecision.yardsToGo +
                  randomInt(
                    postConvertConfig.playExtensionBonusRange[0],
                    postConvertConfig.playExtensionBonusRange[1],
                    random,
                  )
                : softFailMode === "MANAGED_DIRECT_CONVERT"
                  ? fourthDownDecision.yardsToGo +
                    randomInt(
                      postConvertConfig.managedDirectBonusRange[0],
                      postConvertConfig.managedDirectBonusRange[1],
                      random,
                    )
                : randomInt(
                    Math.max(fourthDownDecision.yardsToGo, 1),
                    Math.max(
                      fourthDownDecision.yardsToGo + postConvertConfig.defaultExtraYards,
                      postConvertConfig.defaultFallbackMax,
                    ),
                    random,
                  ) +
                  Math.round(runGameDiff / postConvertConfig.runDiffDivisor);
        const postConversionYards = clamp(
          postConversionYardsBase +
            (
              targetedAggressiveGoForIt
                ? randomInt(
                    postConvertConfig.targetedBonusYardsRange[0],
                    postConvertConfig.targetedBonusYardsRange[1],
                    random,
                  )
                : 0
            ),
          fourthDownDecision.yardsToGo,
          postConvertConfig.yardsMax,
        );
        const newFieldPosition = clamp(
          fourthDownDecision.fieldPosition + postConversionYards,
          1,
          99,
        );
        postFourthDownYards = postConversionYards;
        highestReachedFieldPosition = Math.max(highestReachedFieldPosition, newFieldPosition);
        playsAfterConvert = targetedAggressiveGoForIt
          ? randomInt(postConvertConfig.playsAfterConvertRange[0], postConvertConfig.playsAfterConvertRange[1], random)
          : null;
        const touchdownFinishChance = clamp(
          postConvertConfig.tdBase +
            (
              newFieldPosition >= 92
                ? postConvertConfig.tdFp92Bonus
                : newFieldPosition >= 86
                  ? postConvertConfig.tdFp86Bonus
                  : newFieldPosition >= zones.redZoneMin
                    ? postConvertConfig.tdFp80Bonus
                    : 0.01
            ) +
            (fourthDownDecision.yardsToGo <= 2 ? postConvertConfig.tdShortBonus : 0) +
            (targetedAggressiveGoForIt ? postConvertConfig.tdTargetedBonus : 0) +
            runGameDiff / postConvertConfig.tdRunDiffDivisor +
            passGameDiff / postConvertConfig.tdPassDiffDivisor +
            (
              coachingRiskProfile === "AGGRESSIVE"
                ? postConvertConfig.tdAggressiveBonus
                : coachingRiskProfile === "CONSERVATIVE"
                  ? postConvertConfig.tdConservativePenalty
                  : 0
            ),
          postConvertConfig.tdMin,
          postConvertConfig.tdMax,
        );
        const postConvertSettledFieldGoalChance = clamp(
          postConvertConfig.settleFgBase +
            (
              newFieldPosition >= 85
                ? postConvertConfig.settleFgFp85Bonus
                : newFieldPosition >= 78
                  ? postConvertConfig.settleFgFp78Bonus
                  : newFieldPosition >= 72
                    ? postConvertConfig.settleFgFp72Bonus
                    : 0
            ) +
            (
              coachingRiskProfile === "CONSERVATIVE"
                ? postConvertConfig.settleFgConservativeBonus
                : coachingRiskProfile === "BALANCED"
                  ? postConvertConfig.settleFgBalancedBonus
                  : postConvertConfig.settleFgAggressivePenalty
            ) +
            (scoreDelta >= 0 ? postConvertConfig.settleFgLeadBonus : 0),
          postConvertConfig.settleFgMin,
          postConvertConfig.settleFgMax,
        );
        const postConvertProtectedWindow = targetedAggressiveGoForIt;
        const stabilizedFieldPosition = clamp(
          newFieldPosition +
            (postConvertProtectedWindow
              ? randomInt(
                  postConvertConfig.protectedFieldPositionBonusRange[0],
                  postConvertConfig.protectedFieldPositionBonusRange[1],
                  random,
                )
              : 0),
          newFieldPosition,
          97,
        );
        highestReachedFieldPosition = Math.max(highestReachedFieldPosition, stabilizedFieldPosition);
        postConvertOriginatedOpp35To20 =
          fourthDownDecision.fieldPosition >= zones.opp35Min &&
          fourthDownDecision.fieldPosition < zones.redZoneMin;
        postConvertEnteredOpp35To20 =
          fourthDownDecision.fieldPosition < zones.opp35Min &&
          stabilizedFieldPosition >= zones.opp35Min;
        const postConvertOpp35To20FinishWindow =
          postConvertOriginatedOpp35To20 || postConvertEnteredOpp35To20;
        playsAfterOpp35To20Entry = postConvertOpp35To20FinishWindow
          ? randomInt(
              postConvertConfig.opp35To20PlaysAfterEntryRange[0],
              postConvertConfig.opp35To20PlaysAfterEntryRange[1],
              random,
            )
          : null;
        const protectedTouchdownFinishChance = clamp(
          touchdownFinishChance +
            (postConvertProtectedWindow
              ? stabilizedFieldPosition >= 70
                ? postConvertConfig.protectedTdFp70Bonus
                : postConvertConfig.protectedTdDefaultBonus
              : 0),
          postConvertConfig.tdMin,
          postConvertConfig.protectedTdMax,
        );

        if (postConvertOpp35To20FinishWindow && offense.kicker) {
          const opp35Finish = goForIt.opp35To20Finish;
          const finishDecline = goForIt.opp35To20FinishDecline;
          const exceptionalTodRoll = random();
          const exceptionalTod = exceptionalTodRoll < opp35Finish.exceptionalTodChance;
          const forcedTouchdownChance = clamp(
            opp35Finish.forcedTdBase +
              (stabilizedFieldPosition >= 74 ? opp35Finish.forcedTdFp74Bonus : 0) +
              (targetedAggressiveGoForIt ? opp35Finish.forcedTdTargetedBonus : 0) +
              runGameDiff / opp35Finish.forcedTdRunDiffDivisor +
              passGameDiff / opp35Finish.forcedTdPassDiffDivisor,
            opp35Finish.forcedTdMin,
            opp35Finish.forcedTdMax,
          );

          if (!exceptionalTod && random() < forcedTouchdownChance) {
            driveResultType = "TOUCHDOWN";
            opp35To20FinishResult = "TOUCHDOWN";
            offenseScore.score += BALANCE.scoring.touchdown.points;
            offenseScore.touchdowns += 1;

            if (passAttempts >= rushAttempts) {
              quarterbackLine.passing.touchdowns += 1;
              ensureLine(playerLines, primaryReceiver).receiving.touchdowns += 1;
              primaryPlayerName = formatPlayerName(primaryReceiver);
            } else {
              ensureLine(playerLines, primaryRunner).rushing.touchdowns += 1;
              primaryPlayerName = formatPlayerName(primaryRunner);
            }

            const kickerLine = ensureLine(playerLines, offense.kicker);
            kickerLine.kicking.extraPointsAttempted += 1;
            if (random() < BALANCE.scoring.extraPoint.postConvertChance) {
              kickerLine.kicking.extraPointsMade += 1;
              offenseScore.score += 1;
            }

            aggressiveGoForItResolution =
              aggressiveGoForItResolution === "CONVERTED"
                ? "CONVERTED_OPP35_TO_20_FINISH"
                : aggressiveGoForItResolution;
            driveSummary = `${offense.team.abbreviation} stabilisiert den Drive nach dem Convert und finisht mit einem Touchdown.`;
          } else if (!exceptionalTod) {
            const distance = clamp(
              BALANCE.fieldGoal.kickDistance.constant - stabilizedFieldPosition,
              opp35Finish.fieldGoalDistanceMin,
              opp35Finish.fieldGoalDistanceMax,
            );
            const kickerConsistency = specialistConsistency(offense.kicker);
            const strongKicker = kickerConsistency + offenseMetrics.kicking >= BALANCE.fieldGoal.strongKickerThreshold;
            const declineChance = longFieldGoalDeclineChance({
              distance,
              fieldPosition: Math.min(stabilizedFieldPosition, fourthDownDecision.fieldPosition),
              scoreDelta,
              secondsRemainingInGame: regulationClock.secondsRemainingInGame,
              coachingRiskProfile,
              strongKicker,
            });
            const finishNeedsPoints =
              (scoreDelta < 0 && regulationClock.secondsRemainingInGame <= BALANCE.fieldGoal.decline.lateTrailingSeconds) ||
              (Math.abs(scoreDelta) <= 3 && regulationClock.secondsRemainingInGame <= BALANCE.fieldGoal.decline.lateTieSeconds);
            const repeatedFinishDeclineChance = finishNeedsPoints
              ? 0
              : clamp(
                  (postConvertEnteredOpp35To20 ? finishDecline.enteredBase : finishDecline.originatedBase) +
                    (
                      distance >= 47
                        ? finishDecline.distance47Bonus
                        : distance >= 44
                          ? finishDecline.distance44Bonus
                          : finishDecline.defaultDistanceBonus
                    ) +
                    (
                      stabilizedFieldPosition < finishDecline.shallowFieldPositionThreshold
                        ? finishDecline.shallowFieldPositionBonus
                        : 0
                    ) +
                    (scoreDelta > 0 ? finishDecline.leadingBonus : scoreDelta < 0 ? finishDecline.trailingPenalty : 0) +
                    (
                      coachingRiskProfile === "AGGRESSIVE"
                        ? finishDecline.aggressiveBonus
                        : coachingRiskProfile === "CONSERVATIVE"
                          ? finishDecline.conservativePenalty
                          : 0
                    ) -
                    (strongKicker ? Math.abs(finishDecline.strongKickerPenalty) : 0),
                  finishDecline.min,
                  finishDecline.max,
                );
            const finishDeclineChance = Math.max(
              declineChance,
              repeatedFinishDeclineChance,
            );
            const fieldGoalOutcomeRoll = random();

            if (finishDeclineChance > 0 && fieldGoalOutcomeRoll < finishDeclineChance) {
              driveResultType = "EMPTY_DRIVE";
              opp35To20FinishResult = "FIELD_GOAL_DECLINED";
              primaryPlayerName = formatPlayerName(offense.kicker);
              driveSummary = `${offense.team.abbreviation} vermeidet nach dem Convert ein langes Field Goal aus ${distance} Yards und waehlt einen kontrollierten Field-Position-Finish.`;
            } else {
              const makeChanceConfig = BALANCE.fieldGoal.opp35To20FinishMakeChance;
              const makeChance = clamp(
                makeChanceConfig.base +
                  (offenseMetrics.kicking - makeChanceConfig.kickingCenter) / makeChanceConfig.kickingDivisor +
                  (kickerConsistency - makeChanceConfig.consistencyCenter) / makeChanceConfig.consistencyDivisor -
                  (distance - makeChanceConfig.distanceCenter) / makeChanceConfig.distanceDivisor -
                  longFieldGoalRiskPenalty(distance),
                makeChanceConfig.min,
                makeChanceConfig.max,
              );
              const kickerLine = ensureLine(playerLines, offense.kicker);
              const bucket = fieldGoalBucket(distance);
              kickerLine.kicking.fieldGoalsAttempted += 1;
              kickerLine.kicking.longestFieldGoal = Math.max(
                kickerLine.kicking.longestFieldGoal,
                distance,
              );

              if (bucket === "SHORT") {
                kickerLine.kicking.fieldGoalsAttemptedShort += 1;
              } else if (bucket === "MID") {
                kickerLine.kicking.fieldGoalsAttemptedMid += 1;
              } else {
                kickerLine.kicking.fieldGoalsAttemptedLong += 1;
              }

              const madeThreshold =
                finishDeclineChance > 0
                  ? finishDeclineChance + (1 - finishDeclineChance) * makeChance
                  : makeChance;

              if (fieldGoalOutcomeRoll < madeThreshold) {
                kickerLine.kicking.fieldGoalsMade += 1;
                if (bucket === "SHORT") {
                  kickerLine.kicking.fieldGoalsMadeShort += 1;
                } else if (bucket === "MID") {
                  kickerLine.kicking.fieldGoalsMadeMid += 1;
                } else {
                  kickerLine.kicking.fieldGoalsMadeLong += 1;
                }
                offenseScore.score += BALANCE.fieldGoal.points;
                driveResultType = "FIELD_GOAL_MADE";
                opp35To20FinishResult = "FIELD_GOAL_MADE";
                primaryPlayerName = formatPlayerName(offense.kicker);
                driveSummary = `${offense.team.abbreviation} nutzt den Convert fuer kontrolliertes Field-Goal-Finish aus ${distance} Yards.`;
              } else {
                driveResultType = "FIELD_GOAL_MISSED";
                opp35To20FinishResult = "FIELD_GOAL_MISSED";
                primaryPlayerName = formatPlayerName(offense.kicker);
                driveSummary = `${offense.team.abbreviation} nutzt den Convert fuer ein Field Goal aus ${distance} Yards, verfehlt aber.`;
              }
            }

            aggressiveGoForItResolution =
              aggressiveGoForItResolution === "CONVERTED"
                ? "CONVERTED_OPP35_TO_20_FINISH"
                : aggressiveGoForItResolution;
          } else {
            const managedPostConvertExit =
              exceptionalTodRoll < opp35Finish.exceptionalTodChance * opp35Finish.managedExceptionalExitShare;

            if (managedPostConvertExit) {
              driveResultType = "EMPTY_DRIVE";
              opp35To20FinishResult = "RISK_WINDOW_MANAGED_EXIT";
              aggressiveGoForItResolution =
                aggressiveGoForItResolution === "CONVERTED"
                  ? "CONVERTED_OPP35_TO_20_MANAGED_EXIT"
                  : aggressiveGoForItResolution;
              primaryPlayerName = formatPlayerName(runner ?? quarterback);
              primaryDefenderName = formatPlayerName(
                distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 3), random)
                  .primaryTackler,
              );
              driveSummary = `${offense.team.abbreviation} beendet den Drive nach bereits gewonnenem 4th-Down-Risiko kontrolliert statt erneut ins Turnover-on-Downs-Fenster zu laufen.`;
            } else {
              driveResultType = "TURNOVER_ON_DOWNS";
              opp35To20FinishResult = "TURNOVER_ON_DOWNS_EXCEPTION";
              aggressiveGoForItResolution =
                aggressiveGoForItResolution === "CONVERTED"
                  ? "CONVERTED_OPP35_TO_20_EXCEPTION"
                  : aggressiveGoForItResolution;
              driveSummary = `${defense.team.abbreviation} erzeugt den seltenen Stop nach bereits stabilisiertem Convert in OPP35_TO_20.`;
              primaryDefenderName = formatPlayerName(
                distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 3), random)
                  .primaryTackler,
              );
            }
          }
        } else if (random() < protectedTouchdownFinishChance) {
          driveResultType = "TOUCHDOWN";
          offenseScore.score += BALANCE.scoring.touchdown.points;
          offenseScore.touchdowns += 1;

          if (passAttempts >= rushAttempts) {
            quarterbackLine.passing.touchdowns += 1;
            ensureLine(playerLines, primaryReceiver).receiving.touchdowns += 1;
            primaryPlayerName = formatPlayerName(primaryReceiver);
          } else {
            ensureLine(playerLines, primaryRunner).rushing.touchdowns += 1;
            primaryPlayerName = formatPlayerName(primaryRunner);
          }

          if (offense.kicker) {
            const kickerLine = ensureLine(playerLines, offense.kicker);
            kickerLine.kicking.extraPointsAttempted += 1;
            if (random() < BALANCE.scoring.extraPoint.postConvertChance) {
              kickerLine.kicking.extraPointsMade += 1;
              offenseScore.score += 1;
            }
          }

          driveSummary = `${offense.team.abbreviation} bleibt bei 4th & ${fourthDownDecision.yardsToGo} drauf und erzielt den Touchdown.`;
        } else if (offense.kicker) {
          const settledFinish = goForIt.settledFinish;
          const secondFourth = goForIt.secondFourth;
          const postConvertMakeChance = BALANCE.fieldGoal.postConvertMakeChance;
          const distance = clamp(
            BALANCE.fieldGoal.kickDistance.constant - stabilizedFieldPosition,
            settledFinish.fieldGoalDistanceMin,
            settledFinish.fieldGoalDistanceMax,
          );
          const settleForFieldGoalChance = clamp(
            settledFinish.settleBase +
              (
                distance <= 38
                  ? settledFinish.distance38Bonus
                  : distance <= 45
                    ? settledFinish.distance45Bonus
                    : distance <= 50
                      ? settledFinish.distance50Penalty
                      : settledFinish.longDistancePenalty
              ) +
              (
                coachingRiskProfile === "CONSERVATIVE"
                  ? settledFinish.conservativeBonus
                  : coachingRiskProfile === "AGGRESSIVE"
                    ? settledFinish.aggressivePenalty
                    : 0
              ) +
              (scoreDelta > 0 ? settledFinish.leadingBonus : scoreDelta < 0 ? settledFinish.trailingPenalty : 0),
            settledFinish.min,
            settledFinish.max,
          );
          const secondFourthDistance = targetedAggressiveGoForIt
            ? randomInt(secondFourth.distanceRange[0], secondFourth.distanceRange[1], random)
            : null;
          const needsSecondFourthDown =
            targetedAggressiveGoForIt &&
            random() <
              clamp(
                secondFourth.baseChance -
                  (
                    stabilizedFieldPosition >= 75
                      ? secondFourth.fp75Penalty
                      : stabilizedFieldPosition >= 68
                        ? secondFourth.fp68Penalty
                        : 0
                  ),
                secondFourth.min,
                secondFourth.max,
              );
          const makeChance = clamp(
            postConvertMakeChance.base +
              (offenseMetrics.kicking - postConvertMakeChance.kickingCenter) / postConvertMakeChance.kickingDivisor +
              (specialistConsistency(offense.kicker) - postConvertMakeChance.consistencyCenter) /
                postConvertMakeChance.consistencyDivisor -
              (distance - postConvertMakeChance.distanceCenter) / postConvertMakeChance.distanceDivisor -
              longFieldGoalRiskPenalty(distance),
            postConvertMakeChance.min,
            postConvertMakeChance.max,
          );
          if (needsSecondFourthDown && secondFourthDistance != null) {
            fourthDownAttempts = 2;
            const secondGoForItAllowed =
              coachingRiskProfile === "AGGRESSIVE" &&
              secondFourthDistance <= 2 &&
              stabilizedFieldPosition < 72 &&
              random() < secondFourth.aggressiveShortGoChance;

            if (!secondGoForItAllowed) {
              const secondDecisionFieldGoal =
                stabilizedFieldPosition >= zones.opp35Min &&
                random() <
                  clamp(
                    secondFourth.fgBase +
                      (stabilizedFieldPosition >= 72 ? secondFourth.fgFp72Bonus : 0) +
                      (secondFourthDistance >= 4 ? secondFourth.fgDistance4Bonus : 0),
                    secondFourth.fgMin,
                    secondFourth.fgMax,
                  );

              if (secondDecisionFieldGoal) {
                const kickerLine = ensureLine(playerLines, offense.kicker);
                const bucket = fieldGoalBucket(distance);
                kickerLine.kicking.fieldGoalsAttempted += 1;
                kickerLine.kicking.longestFieldGoal = Math.max(
                  kickerLine.kicking.longestFieldGoal,
                  distance,
                );

                if (bucket === "SHORT") {
                  kickerLine.kicking.fieldGoalsAttemptedShort += 1;
                } else if (bucket === "MID") {
                  kickerLine.kicking.fieldGoalsAttemptedMid += 1;
                } else {
                  kickerLine.kicking.fieldGoalsAttemptedLong += 1;
                }

                if (random() < makeChance) {
                  kickerLine.kicking.fieldGoalsMade += 1;
                  if (bucket === "SHORT") {
                    kickerLine.kicking.fieldGoalsMadeShort += 1;
                  } else if (bucket === "MID") {
                    kickerLine.kicking.fieldGoalsMadeMid += 1;
                  } else {
                    kickerLine.kicking.fieldGoalsMadeLong += 1;
                  }
                  offenseScore.score += BALANCE.fieldGoal.points;
                  driveResultType = "FIELD_GOAL_MADE";
                  primaryPlayerName = formatPlayerName(offense.kicker);
                  aggressiveGoForItResolution =
                    aggressiveGoForItResolution === "CONVERTED"
                      ? "CONVERTED_STABILIZED_FG"
                      : aggressiveGoForItResolution;
                  driveSummary = `${offense.team.abbreviation} stabilisiert den Drive nach dem Convert und nimmt spaeter das Field Goal aus ${distance} Yards mit.`;
                } else {
                  driveResultType = "FIELD_GOAL_MISSED";
                  primaryPlayerName = formatPlayerName(offense.kicker);
                  aggressiveGoForItResolution =
                    aggressiveGoForItResolution === "CONVERTED"
                      ? "CONVERTED_STABILIZED_FG"
                      : aggressiveGoForItResolution;
                  driveSummary = `${offense.team.abbreviation} stabilisiert den Drive nach dem Convert, verfehlt spaeter aber das Field Goal aus ${distance} Yards.`;
                }
              } else {
                driveResultType = "TURNOVER_ON_DOWNS";
                aggressiveGoForItResolution =
                  aggressiveGoForItResolution === "CONVERTED"
                    ? "CONVERTED_SECOND_FOURTH_EXIT"
                    : aggressiveGoForItResolution;
                driveSummary = `${defense.team.abbreviation} stoppt ${offense.team.abbreviation} nach dem Convert bei einem spaeteren 4th Down.`;
              }
            }
          } else if (
            stabilizedFieldPosition >= settledFinish.fieldGoalFieldPositionMin &&
            random() < Math.max(
              settleForFieldGoalChance,
              postConvertSettledFieldGoalChance +
                (coachingRiskProfile === "CONSERVATIVE" ? settledFinish.conservativeSettledBonus : 0),
            )
          ) {
            const kickerLine = ensureLine(playerLines, offense.kicker);
            const bucket = fieldGoalBucket(distance);
            kickerLine.kicking.fieldGoalsAttempted += 1;
            kickerLine.kicking.longestFieldGoal = Math.max(
              kickerLine.kicking.longestFieldGoal,
              distance,
            );

            if (bucket === "SHORT") {
              kickerLine.kicking.fieldGoalsAttemptedShort += 1;
            } else if (bucket === "MID") {
              kickerLine.kicking.fieldGoalsAttemptedMid += 1;
            } else {
              kickerLine.kicking.fieldGoalsAttemptedLong += 1;
            }

            if (random() < makeChance) {
              kickerLine.kicking.fieldGoalsMade += 1;
              if (bucket === "SHORT") {
                kickerLine.kicking.fieldGoalsMadeShort += 1;
              } else if (bucket === "MID") {
                kickerLine.kicking.fieldGoalsMadeMid += 1;
              } else {
                kickerLine.kicking.fieldGoalsMadeLong += 1;
              }
              offenseScore.score += BALANCE.fieldGoal.points;
              driveResultType = "FIELD_GOAL_MADE";
              primaryPlayerName = formatPlayerName(offense.kicker);
              aggressiveGoForItResolution =
                aggressiveGoForItResolution === "CONVERTED"
                  ? "CONVERTED_STABILIZED_FG"
                  : aggressiveGoForItResolution;
              driveSummary = `${offense.team.abbreviation} konvertiert 4th & ${fourthDownDecision.yardsToGo} und nimmt spaeter das Field Goal aus ${distance} Yards mit.`;
            } else {
              driveResultType = "FIELD_GOAL_MISSED";
              primaryPlayerName = formatPlayerName(offense.kicker);
              aggressiveGoForItResolution =
                aggressiveGoForItResolution === "CONVERTED"
                  ? "CONVERTED_STABILIZED_FG"
                  : aggressiveGoForItResolution;
              driveSummary = `${offense.team.abbreviation} konvertiert 4th & ${fourthDownDecision.yardsToGo}, verfehlt spaeter aber das Field Goal aus ${distance} Yards.`;
            }
          } else {
            const lateDriveKiller = goForIt.lateDriveKiller;
            const lateDriveKillerChance = clamp(
              lateDriveKiller.base +
                (
                  newFieldPosition >= zones.redZoneMin
                    ? lateDriveKiller.fp80Bonus
                    : newFieldPosition >= settledFinish.fieldGoalFieldPositionMin
                      ? lateDriveKiller.fp72Bonus
                      : 0
                ) +
                (
                  coachingRiskProfile === "AGGRESSIVE"
                    ? lateDriveKiller.aggressiveBonus
                    : lateDriveKiller.nonAggressivePenalty
                ) -
                (targetedAggressiveGoForIt ? Math.abs(lateDriveKiller.targetedPenalty) : 0),
              lateDriveKiller.min,
              lateDriveKiller.max,
            );
            const lateDriveKillerRoll = random();
            const lateDriveKilled = lateDriveKillerRoll < lateDriveKillerChance;

            if (lateDriveKilled && newFieldPosition >= lateDriveKiller.fieldPositionMin) {
              const killerDistance = clamp(
                BALANCE.fieldGoal.kickDistance.constant - newFieldPosition,
                lateDriveKiller.fieldGoalDistanceMin,
                lateDriveKiller.fieldGoalDistanceMax,
              );
              const kickerLine = ensureLine(playerLines, offense.kicker);
              const bucket = fieldGoalBucket(killerDistance);
              kickerLine.kicking.fieldGoalsAttempted += 1;
              kickerLine.kicking.longestFieldGoal = Math.max(
                kickerLine.kicking.longestFieldGoal,
                killerDistance,
              );

              if (bucket === "SHORT") {
                kickerLine.kicking.fieldGoalsAttemptedShort += 1;
              } else if (bucket === "MID") {
                kickerLine.kicking.fieldGoalsAttemptedMid += 1;
              } else {
                kickerLine.kicking.fieldGoalsAttemptedLong += 1;
              }

              if (random() < makeChance) {
                kickerLine.kicking.fieldGoalsMade += 1;
                if (bucket === "SHORT") {
                  kickerLine.kicking.fieldGoalsMadeShort += 1;
                } else if (bucket === "MID") {
                  kickerLine.kicking.fieldGoalsMadeMid += 1;
                } else {
                  kickerLine.kicking.fieldGoalsMadeLong += 1;
                }
                offenseScore.score += BALANCE.fieldGoal.points;
                driveResultType = "FIELD_GOAL_MADE";
                primaryPlayerName = formatPlayerName(offense.kicker);
                aggressiveGoForItResolution =
                  aggressiveGoForItResolution === "CONVERTED"
                    ? "CONVERTED_STABILIZED_FG"
                    : aggressiveGoForItResolution;
                driveSummary = `${offense.team.abbreviation} beruhigt den Drive nach konvertiertem 4th Down und nimmt das Field Goal aus ${killerDistance} Yards mit.`;
              } else {
                driveResultType = "FIELD_GOAL_MISSED";
                primaryPlayerName = formatPlayerName(offense.kicker);
                aggressiveGoForItResolution =
                  aggressiveGoForItResolution === "CONVERTED"
                    ? "CONVERTED_STABILIZED_FG"
                    : aggressiveGoForItResolution;
                driveSummary = `${offense.team.abbreviation} beruhigt den Drive nach konvertiertem 4th Down, verfehlt aber das Field Goal aus ${killerDistance} Yards.`;
              }
            } else {
              const managedCollapseExitRoll =
                lateDriveKillerChance >= 1
                  ? 1
                  : (lateDriveKillerRoll - lateDriveKillerChance) /
                    (1 - lateDriveKillerChance);
              const managedCollapseExit =
                (directOpp45To35GoForIt || directOpp35To20GoForIt) &&
                (directShortGoForIt || directMediumGoForIt) &&
                managedCollapseExitRoll < lateDriveKiller.managedCollapseExitChance;

              if (managedCollapseExit) {
                driveResultType = "EMPTY_DRIVE";
                primaryPlayerName = formatPlayerName(runner ?? quarterback);
                primaryDefenderName = formatPlayerName(
                  distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 3), random)
                    .primaryTackler,
                );
                aggressiveGoForItResolution =
                  aggressiveGoForItResolution === "CONVERTED"
                    ? "CONVERTED_MANAGED_EXIT"
                    : aggressiveGoForItResolution;
                driveSummary = `${offense.team.abbreviation} vermeidet nach dem Convert ein zweites 4th-Down-Gamble und laesst den Drive kontrolliert auslaufen.`;
              } else {
                driveResultType = "TURNOVER_ON_DOWNS";
                aggressiveGoForItResolution =
                  aggressiveGoForItResolution === "CONVERTED"
                    ? "CONVERTED_COLLAPSE"
                    : aggressiveGoForItResolution;
                driveSummary = `${defense.team.abbreviation} stoppt ${offense.team.abbreviation} auch nach konvertiertem 4th Down noch in Plus Territory.`;
                primaryDefenderName = formatPlayerName(
                  distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 3), random)
                    .primaryTackler,
                );
              }
            }
          }
        } else {
          driveResultType = "TURNOVER_ON_DOWNS";
          driveSummary = `${defense.team.abbreviation} ueberlebt die 4th-Down-Konversion und stoppt den folgenden Ballbesitz ohne Kicker am Ende doch noch.`;
          primaryDefenderName = formatPlayerName(
            distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 6), random)
              .primaryTackler,
          );
        }
      } else {
        postFourthDownConverted = false;
        const urgentScoreState =
          scoreDelta < 0 && regulationClock.secondsRemainingInGame <= BALANCE.clock.modes.clockKillLeadSecondsMax;
        const managedExit = goForIt.managedDirectExit;
        const managedDirectExitChance =
          coachingRiskProfile === "AGGRESSIVE" &&
          !urgentScoreState &&
          (directOpp45To35GoForIt || directOpp35To20GoForIt) &&
          (directShortGoForIt || directMediumGoForIt)
            ? clamp(
                (directOpp45To35GoForIt ? managedExit.opp45Base : managedExit.opp35Base) +
                  (directMediumGoForIt ? managedExit.mediumBonus : managedExit.shortBonus) +
                  (fourthDownDecision.yardsToGo >= 5 ? managedExit.longDistanceBonus : 0) +
                  (scoreDelta > 0 ? managedExit.leadingBonus : 0),
                managedExit.min,
                managedExit.max,
              )
            : 0;
        const managedDirectExitRoll =
          conversionChance >= 1
            ? 1
            : (conversionRoll - conversionChance) / (1 - conversionChance);

        if (managedDirectExitChance > 0 && managedDirectExitRoll < managedDirectExitChance) {
          aggressiveGoForItResolution = targetedAggressiveGoForIt
            ? "FAILED_MANAGED_EXIT"
            : "MANAGED_DIRECT_EXIT";
          driveResultType = "EMPTY_DRIVE";
          primaryPlayerName = formatPlayerName(runner ?? quarterback);
          primaryDefenderName = formatPlayerName(
            distributeTackleProduction(playerLines, defense, Math.max(1, Math.round(plays / 4)), random)
              .primaryTackler,
          );
          driveSummary = `${offense.team.abbreviation} bleibt aggressiv, bricht das 4th-Down-Risiko bei geschlossener Lage aber kontrolliert ab und vermeidet den direkten Turnover on Downs.`;
        } else {
          aggressiveGoForItResolution = targetedAggressiveGoForIt ? "FAILED" : aggressiveGoForItResolution;
          driveResultType = "TURNOVER_ON_DOWNS";
          driveSummary = `${defense.team.abbreviation} stoppt ${offense.team.abbreviation} bei 4th & ${fourthDownDecision.yardsToGo}; Turnover on Downs.`;
          primaryDefenderName = formatPlayerName(
            distributeTackleProduction(playerLines, defense, 1 + Math.round(plays / 3), random)
              .primaryTackler,
          );
        }
      }
    } else {
      const zones = BALANCE.fourthDown.zones;
      const punt = BALANCE.punt;
      const suppressLowValue = punt.suppressLowValue;
      const suppressLowValueFieldPositionPunt =
        !(scoreDelta < 0 && regulationClock.secondsRemainingInGame <= BALANCE.fourthDown.gameState.trailingLateSeconds) &&
        (
          (
            fourthDownDecision.fieldPosition >= zones.opp45Min &&
            fourthDownDecision.fieldPosition < zones.opp35Min &&
            fourthDownDecision.yardsToGo >= suppressLowValue.distanceMin &&
            fourthDownDecision.yardsToGo <= suppressLowValue.distanceMax &&
            random() <
              (
                fourthDownDecision.fieldPosition >= zones.opp40Min
                  ? suppressLowValue.opp40To35Chance
                  : suppressLowValue.opp45To35Chance
              )
          ) ||
          (
            fourthDownDecision.fieldPosition >= zones.midfieldMin &&
            fourthDownDecision.fieldPosition < zones.opp45Min &&
            fourthDownDecision.yardsToGo >= suppressLowValue.midfieldDistanceMin &&
            random() < suppressLowValue.midfieldChance
          )
        );

      if (suppressLowValueFieldPositionPunt) {
        primaryDefenderName = formatPlayerName(
          distributeTackleProduction(playerLines, defense, Math.max(2, Math.round(plays / 3)), random).primaryTackler,
        );
        driveResultType = "EMPTY_DRIVE";
        primaryPlayerName = formatPlayerName(runner ?? quarterback);
        driveSummary = `${offense.team.abbreviation} laesst den Drive bei 4th & ${fourthDownDecision.yardsToGo} nahe der ${fourthDownDecision.fieldPosition}-Yard-Linie ohne offiziellen Punt auslaufen.`;
      } else {
        let puntNetYardsForFieldPosition = randomInt(36, 44, random);
        let puntTouchbackForFieldPosition = false;
        if (offense.punter) {
        const puntHangTime = gradedAttribute(offense.punter, "PUNT_HANG_TIME");
        const puntConsistency = specialistConsistency(offense.punter);
        const hangTimeTenths = clamp(
          punt.hangTimeBaseTenths +
            Math.round((puntHangTime - punt.hangTimePowerCenter) / punt.hangTimePowerDivisor) +
            randomInt(punt.hangTimeRandomRange[0], punt.hangTimeRandomRange[1], random),
          punt.hangTimeMin,
          punt.hangTimeMax,
        );
        const puntDistance = clamp(
          randomInt(punt.distanceRange[0], punt.distanceRange[1], random) +
            Math.round((offenseMetrics.punting - punt.powerCenter) / punt.powerDivisor) +
            Math.round((puntConsistency - punt.consistencyCenter) / punt.consistencyDivisor) +
            Math.round((offenseMetrics.snapOperation - punt.snapOperationCenter) / punt.snapOperationDivisor),
          punt.distanceMin,
          punt.distanceMax,
        );
        const netPuntYards = clamp(
          puntDistance -
            randomInt(punt.returnYardsRange[0], punt.returnYardsRange[1], random) -
            Math.round((defenseMetrics.puntReturn - puntHangTime) / punt.consistencyDivisor) +
            Math.round((puntConsistency - punt.consistencyCenter) / punt.netPuntConsistencyDivisor),
          punt.netPuntMin,
          puntDistance,
        );
        puntNetYardsForFieldPosition = netPuntYards;
        const punterLine = ensureLine(playerLines, offense.punter);
        let wasTouchback = false;
        punterLine.punting.punts += 1;
        punterLine.punting.puntYards += puntDistance;
        punterLine.punting.netPuntYards += netPuntYards;
        punterLine.punting.hangTimeTotalTenths += hangTimeTenths;
        punterLine.punting.longestPunt = Math.max(punterLine.punting.longestPunt, puntDistance);

        if (
          random() <
          clamp(
            punt.inside20.baseChance +
              (gradedAttribute(offense.punter, "PUNT_ACCURACY") - punt.inside20.accuracyCenter) /
                punt.inside20.accuracyDivisor +
              (puntHangTime - punt.hangTimePowerCenter) / punt.inside20.hangTimeDivisor +
              (puntConsistency - punt.consistencyCenter) / punt.inside20.consistencyDivisor,
            punt.inside20.min,
            punt.inside20.max,
          )
        ) {
          punterLine.punting.puntsInside20 += 1;
        } else if (
          random() <
          clamp(
            punt.touchback.baseChance -
              (gradedAttribute(offense.punter, "PUNT_ACCURACY") - punt.touchback.accuracyCenter) /
                punt.touchback.accuracyDivisor -
              (puntConsistency - punt.touchback.consistencyCenter) / punt.touchback.consistencyDivisor,
            punt.touchback.min,
            punt.touchback.max,
          )
        ) {
          punterLine.punting.touchbacks += 1;
          wasTouchback = true;
          puntTouchbackForFieldPosition = true;
        }
        if (!wasTouchback) {
          const fairCatchChance = clamp(
            punt.fairCatch.baseChance +
              (hangTimeTenths - punt.fairCatch.hangTimeCenter) / punt.fairCatch.hangTimeDivisor +
              (gradedAttribute(offense.punter, "PUNT_ACCURACY") - punt.fairCatch.accuracyCenter) /
                punt.fairCatch.accuracyDivisor -
              (defenseMetrics.puntReturn - punt.fairCatch.puntReturnCenter) / punt.fairCatch.puntReturnDivisor,
            punt.fairCatch.min,
            punt.fairCatch.max,
          );

          if (random() < fairCatchChance) {
            punterLine.punting.fairCatchesForced += 1;
          } else {
            registerPuntReturn(
              playerLines,
              defense.puntReturner,
              puntHangTime,
              random,
            );
          }
        }
        } else {
          registerPuntReturn(
            playerLines,
            defense.puntReturner,
            punt.defaultHangTime,
            random,
          );
        }
        primaryDefenderName = formatPlayerName(
          distributeTackleProduction(playerLines, defense, Math.max(2, Math.round(plays / 3)), random).primaryTackler,
        );
        driveResultType = "PUNT";
        nextStartFieldPosition = puntTouchbackForFieldPosition
          ? 20
          : clamp(100 - (fourthDownDecision.fieldPosition + puntNetYardsForFieldPosition), 1, 45);
        primaryPlayerName = formatPlayerName(offense.punter ?? runner ?? quarterback);
        driveSummary = `${offense.team.abbreviation} puntet bei 4th & ${fourthDownDecision.yardsToGo} von der ${fourthDownDecision.fieldPosition}-Yard-Linie nach ${officialDrivePlays} Plays und ${totalYards} Yards.`;
      }
    }

    const failedDriveTrim = BALANCE.yardage.failedDriveTrim;
    const lateFailedDriveYardageTrimBase =
      driveResultType !== "TOUCHDOWN" &&
      startFieldPosition >= failedDriveTrim.startMin &&
      startFieldPosition <= failedDriveTrim.startMax &&
      totalYards >= failedDriveTrim.totalYardsMin
        ? clamp(
            (
              totalYards >= failedDriveTrim.highYardsThreshold
                ? failedDriveTrim.highTrim
                : totalYards >= failedDriveTrim.mediumYardsThreshold
                  ? failedDriveTrim.mediumTrim
                  : failedDriveTrim.lowTrim
            ) +
              (
                driveResultType === "PUNT" ||
                driveResultType === "EMPTY_DRIVE" ||
                driveResultType === "TURNOVER_ON_DOWNS" ||
                driveResultType === "TURNOVER"
                  ? failedDriveTrim.failedResultBonus
                  : 0
              ) -
              (driveResultType === "FIELD_GOAL_MADE" ? failedDriveTrim.madeFieldGoalPenalty : 0),
            failedDriveTrim.min,
            failedDriveTrim.max,
          )
        : 0;
    const compactDriveYardageTrim =
      driveResultType !== "TOUCHDOWN" &&
      drivePlayReduction > 0 &&
      startFieldPosition >= failedDriveTrim.startMin &&
      startFieldPosition <= failedDriveTrim.startMax &&
      totalYards >= failedDriveTrim.compactTotalYardsMin
        ? Math.min(
            drivePlayReduction,
            totalYards >= failedDriveTrim.compactHighYardsThreshold
              ? failedDriveTrim.compactHighTrimMax
              : failedDriveTrim.compactLowTrimMax,
          )
        : 0;
    const lateFailedDriveYardageTrim =
      lateFailedDriveYardageTrimBase + compactDriveYardageTrim;

    if (lateFailedDriveYardageTrim > 0) {
      const passingTrim = Math.min(
        creditedPassingYards,
        Math.ceil(lateFailedDriveYardageTrim * failedDriveTrim.passingTrimShare),
      );
      const rushingTrim = Math.min(
        creditedRushingYards,
        lateFailedDriveYardageTrim - passingTrim,
      );
      const remainingTrim = lateFailedDriveYardageTrim - passingTrim - rushingTrim;
      const extraPassingTrim = Math.min(
        creditedPassingYards - passingTrim,
        remainingTrim,
      );
      const totalPassingTrim = passingTrim + extraPassingTrim;
      const totalRushingTrim = rushingTrim + (remainingTrim - extraPassingTrim);
      const receiverLine = ensureLine(playerLines, primaryReceiver);
      const coverageLine = ensureLine(playerLines, primaryCoverageDefender);
      const runnerLine = ensureLine(playerLines, primaryRunner);
      const cappedPassingTrim = Math.min(
        totalPassingTrim,
        quarterbackLine.passing.yards,
        receiverLine.receiving.yards,
        coverageLine.defensive.yardsAllowed,
      );
      const cappedRushingTrim = Math.min(
        totalRushingTrim + (totalPassingTrim - cappedPassingTrim),
        runnerLine.rushing.yards,
        creditedRushingYards,
      );
      const totalTrim = cappedPassingTrim + cappedRushingTrim;

      creditedPassingYards = Math.max(0, creditedPassingYards - cappedPassingTrim);
      creditedRushingYards = Math.max(0, creditedRushingYards - cappedRushingTrim);
      creditedTotalYards = Math.max(0, creditedTotalYards - totalTrim);
      offenseScore.totalYards = Math.max(0, offenseScore.totalYards - totalTrim);
      offenseScore.passingYards = Math.max(0, offenseScore.passingYards - cappedPassingTrim);
      offenseScore.rushingYards = Math.max(0, offenseScore.rushingYards - cappedRushingTrim);
      quarterbackLine.passing.yards = Math.max(
        0,
        quarterbackLine.passing.yards - cappedPassingTrim,
      );
      receiverLine.receiving.yards = Math.max(
        0,
        receiverLine.receiving.yards - cappedPassingTrim,
      );
      coverageLine.defensive.yardsAllowed = Math.max(
        0,
        coverageLine.defensive.yardsAllowed - cappedPassingTrim,
      );
      runnerLine.rushing.yards = Math.max(
        0,
        runnerLine.rushing.yards - cappedRushingTrim,
      );
    }

    if (sacksTaken > 0) {
      defenseScore.sacks += sacksTaken;
      const passRushDistribution = distributePassRushProduction(
        playerLines,
        defense,
        sacksTaken,
        random,
      );

      if (!primaryDefenderName) {
        primaryDefenderName = formatPlayerName(passRushDistribution.primaryPassRusher);
      }
    }

    const finalRedZoneTrip = highestReachedFieldPosition >= BALANCE.scoring.redZoneTripFieldPosition;

    if (finalRedZoneTrip) {
      offenseScore.redZoneTrips += 1;

      if (driveResultType === "TOUCHDOWN") {
        offenseScore.redZoneTouchdowns += 1;
      }
    }

    const edgeCaseNotes: string[] = [];
    const clockModes = BALANCE.clock.modes;
    const endgameClockMode: ClockMode =
      scoreDelta < 0 && regulationClock.secondsRemainingInGame <= clockModes.twoMinuteTrailingSecondsMax
        ? "TWO_MINUTE_DRILL"
        : scoreDelta > 0 && regulationClock.secondsRemainingInGame <= clockModes.clockKillLeadSecondsMax
          ? "CLOCK_KILL"
          : scoreDelta >= clockModes.garbageTimeLeadMin &&
              regulationClock.secondsRemainingInGame <= clockModes.garbageTimeSecondsMax
            ? "GARBAGE_TIME"
            : "NORMAL";

    if (endgameClockMode === "TWO_MINUTE_DRILL") {
      edgeCaseNotes.push("2-Minute Drill");
    } else if (endgameClockMode === "CLOCK_KILL") {
      edgeCaseNotes.push("Clock Kill");
    } else if (endgameClockMode === "GARBAGE_TIME") {
      edgeCaseNotes.push("Garbage Time konservativ");
    }

    if (
      scoreDelta < 0 &&
      scoreDelta >= BALANCE.fourthDown.gameState.endgameFieldGoalTrailingMin &&
      regulationClock.secondsRemainingInGame <= BALANCE.fourthDown.gameState.endgameFieldGoalSeconds &&
      fourthDownDecision.decision === "FIELD_GOAL"
    ) {
      edgeCaseNotes.push("Endgame FG statt TD-Jagd");
    }

    if (
      scoreDelta <= BALANCE.fourthDown.gameState.needTouchdownMax &&
      scoreDelta >= BALANCE.fourthDown.gameState.needTouchdownMin &&
      regulationClock.secondsRemainingInGame <= BALANCE.fourthDown.gameState.needTouchdownSeconds &&
      fourthDownDecision.decision === "GO_FOR_IT"
    ) {
      edgeCaseNotes.push("Endgame TD-Need");
    }

    if (
      scoreDelta >= clockModes.garbageTimeLeadMin &&
      regulationClock.secondsRemainingInGame <= clockModes.garbageTimeSecondsMax &&
      fourthDownDecision.decision !== "GO_FOR_IT"
    ) {
      edgeCaseNotes.push("Blowout Risk-Off");
    }

    if (edgeCaseNotes.length > 0) {
      driveSummary = `${driveSummary} [Edge: ${edgeCaseNotes.join(", ")}]`;
    }

    const timeOfPossession = estimateDrivePossessionTime(
      regulationClock,
      {
        plays,
        passAttempts,
        rushAttempts,
        completions,
        sacksTaken,
        resultType: driveResultType,
        clockMode: endgameClockMode,
      },
      random,
    );
    offenseScore.timeOfPossessionSeconds += timeOfPossession;

    const officialPassAttempts = clamp(
      Math.round((officialDrivePlays * passAttempts) / Math.max(plays, 1)),
      1,
      officialDrivePlays - 1,
    );
    const officialRushAttempts = Math.max(
      1,
      officialDrivePlays - officialPassAttempts,
    );

    if (nextStartFieldPosition == null) {
      if (driveResultType === "TURNOVER_ON_DOWNS") {
        nextStartFieldPosition = clamp(100 - fourthDownDecision.fieldPosition, 1, 80);
      } else if (driveResultType === "FIELD_GOAL_MISSED") {
        nextStartFieldPosition = clamp(100 - fourthDownDecision.fieldPosition, 20, 80);
      }
    }

    updatePendingStartFieldPosition(
      pendingStartFieldPositions,
      defense.team.id,
      nextStartFieldPosition,
    );

    possession = offense.team.id === home.team.id ? away : home;
    drives.push(
      createDriveLogEntry({
        sequence: drives.length + 1,
        phaseLabel: drivePhaseLabel,
        homeTeamId: home.team.id,
        awayTeamId: away.team.id,
        offense,
        defense,
        scoreboard,
        beforeScore,
        startSecondsRemainingInGame,
        plays: officialDrivePlays,
        passAttempts: officialPassAttempts,
        rushAttempts: officialRushAttempts,
        totalYards: creditedTotalYards,
        resultType: driveResultType,
        turnover,
        redZoneTrip: finalRedZoneTrip,
        summary: driveSummary,
        primaryPlayerName,
        primaryDefenderName,
        startFieldPosition,
        highestReachedFieldPosition,
        fourthDownBallPosition: turnover ? null : fourthDownDecision.fieldPosition,
        fourthDownDistance: turnover ? null : fourthDownDecision.yardsToGo,
        fourthDownScoreDelta: turnover ? null : scoreDelta,
        fourthDownSecondsRemaining: turnover ? null : regulationClock.secondsRemainingInGame,
        coachingRiskProfile: turnover ? null : coachingRiskProfile,
        fourthDownDecision: turnover ? null : fourthDownDecision.decision,
        terminalPlayDistance: turnover ? null : fourthDownDecision.yardsToGo,
        postFourthDownConverted: turnover ? null : postFourthDownConverted,
        postFourthDownYards: turnover ? null : postFourthDownYards,
        targetedAggressiveGoForIt: turnover ? null : targetedAggressiveGoForIt,
        aggressiveGoForItResolution: turnover ? null : aggressiveGoForItResolution,
        softFailCount: turnover ? null : softFailCount,
        fourthDownAttempts: turnover ? null : fourthDownAttempts,
        playsAfterConvert: turnover ? null : playsAfterConvert,
        postConvertOriginatedOpp35To20: turnover ? null : postConvertOriginatedOpp35To20,
        postConvertEnteredOpp35To20: turnover ? null : postConvertEnteredOpp35To20,
        opp35To20FinishResult: turnover ? null : opp35To20FinishResult,
        playsAfterOpp35To20Entry: turnover ? null : playsAfterOpp35To20Entry,
      }),
    );
    driveIndex += 1;
  }

  resolvePlayoffOvertime(
    context,
    home,
    away,
    homeMetrics,
    awayMetrics,
    scoreboard,
    playerLines,
    drives,
    random,
  );

  return {
    matchId: context.matchId,
    simulationSeed: context.simulationSeed,
    totalDrivesPlanned: Math.max(plannedDrivesPerTeam * 2, drives.length),
    engineNotes: buildLineupEngineNotes([home, away]),
    homeScore: scoreboard.get(home.team.id)?.score ?? 0,
    awayScore: scoreboard.get(away.team.id)?.score ?? 0,
    homeTeam: scoreboard.get(home.team.id) as TeamSimulationResult,
    awayTeam: scoreboard.get(away.team.id) as TeamSimulationResult,
    playerLines: [...playerLines.values()],
    drives,
  };
}

export function generateMatchStats(
  context: SimulationMatchContext,
  random: () => number = createSeededRandom(context.simulationSeed),
) {
  return simulateMatch(context, random);
}
