import type {
  SimulationPlayerContext,
  SimulationTeamContext,
} from "./simulation.types";
import { INJURY_AVAILABILITY_RULES } from "./engine-rules";
import { buildFatigueGameDayProfile } from "./fatigue-recovery";
import { createSeededRandom, deriveSimulationSeed } from "./simulation-random";
import { isGameDayEligibleRosterStatus } from "../../../shared/domain/roster-status";

type PreparedTeam = {
  team: SimulationTeamContext;
  starterIds: Set<string>;
  participants: SimulationPlayerContext[];
  quarterbacks: SimulationPlayerContext[];
  runningBacks: SimulationPlayerContext[];
  fullbacks: SimulationPlayerContext[];
  receivers: SimulationPlayerContext[];
  tightEnds: SimulationPlayerContext[];
  offensiveLine: SimulationPlayerContext[];
  defensiveLine: SimulationPlayerContext[];
  linebackers: SimulationPlayerContext[];
  cornerbacks: SimulationPlayerContext[];
  safeties: SimulationPlayerContext[];
  defenders: SimulationPlayerContext[];
  tacklers: SimulationPlayerContext[];
  passRushers: SimulationPlayerContext[];
  coveragePlayers: SimulationPlayerContext[];
  kicker: SimulationPlayerContext | null;
  punter: SimulationPlayerContext | null;
  longSnapper: SimulationPlayerContext | null;
  kickReturner: SimulationPlayerContext | null;
  puntReturner: SimulationPlayerContext | null;
};

type TeamSimulationValidationIssue = {
  code: string;
  message: string;
};

const UNAVAILABLE_INJURY_STATUSES = new Set(["OUT", "INJURED_RESERVE"]);
const SPECIAL_RETURN_FALLBACKS = new Set(["RB", "WR", "CB", "FS", "SS"]);
const LONG_SNAPPER_FALLBACKS = new Set(["LS", "C", "LG", "RG", "TE"]);

function attribute(player: SimulationPlayerContext, code: string) {
  return player.attributes[code] ?? 0;
}

function compareDepth(left: SimulationPlayerContext, right: SimulationPlayerContext) {
  const leftDepth = left.depthChartSlot ?? 99;
  const rightDepth = right.depthChartSlot ?? 99;

  if (leftDepth !== rightDepth) {
    return leftDepth - rightDepth;
  }

  return right.positionOverall - left.positionOverall;
}

function resolveGameDayProfile(
  player: SimulationPlayerContext,
  simulationSeed: string | undefined,
) {
  const rules =
    INJURY_AVAILABILITY_RULES[
      (player.injuryStatus in INJURY_AVAILABILITY_RULES
        ? player.injuryStatus
        : "HEALTHY") as keyof typeof INJURY_AVAILABILITY_RULES
    ];

  if (player.status !== "ACTIVE" || !isGameDayEligibleRosterStatus(player.rosterStatus)) {
    return {
      isAvailable: false,
      gameDayAvailability: "UNAVAILABLE" as const,
      gameDayReadinessMultiplier: 0,
      gameDaySnapMultiplier: 0,
    };
  }

  if (UNAVAILABLE_INJURY_STATUSES.has(player.injuryStatus)) {
    return {
      isAvailable: false,
      gameDayAvailability: "UNAVAILABLE" as const,
      gameDayReadinessMultiplier: 0,
      gameDaySnapMultiplier: 0,
    };
  }

  if (!simulationSeed) {
    const fatigueProfile = buildFatigueGameDayProfile(player);

    return {
      isAvailable: true,
      gameDayAvailability:
        player.injuryStatus === "QUESTIONABLE" || player.injuryStatus === "DOUBTFUL"
          ? ("LIMITED" as const)
          : ("ACTIVE" as const),
      gameDayReadinessMultiplier: Math.min(
        1 - rules.readinessPenalty,
        fatigueProfile.readinessMultiplier,
      ),
      gameDaySnapMultiplier: Math.min(rules.snapMultiplier, fatigueProfile.snapMultiplier),
    };
  }

  const random = createSeededRandom(
    deriveSimulationSeed(simulationSeed, `availability:${player.teamId}:${player.id}`),
  );
  const isAvailable = random() < rules.activeChance;
  const fatigueProfile = buildFatigueGameDayProfile(player);

  return {
    isAvailable,
    gameDayAvailability: isAvailable
      ? player.injuryStatus === "QUESTIONABLE" || player.injuryStatus === "DOUBTFUL"
        ? ("LIMITED" as const)
        : ("ACTIVE" as const)
      : ("UNAVAILABLE" as const),
    gameDayReadinessMultiplier: isAvailable
      ? Math.min(1 - rules.readinessPenalty, fatigueProfile.readinessMultiplier)
      : 0,
    gameDaySnapMultiplier: isAvailable
      ? Math.min(rules.snapMultiplier, fatigueProfile.snapMultiplier)
      : 0,
  };
}

function isAvailable(player: SimulationPlayerContext, simulationSeed?: string) {
  const gameDayProfile = resolveGameDayProfile(player, simulationSeed);

  return (
    gameDayProfile.isAvailable &&
    player.gameDayAvailability !== "UNAVAILABLE"
  );
}

function uniquePlayers(players: SimulationPlayerContext[]) {
  const seen = new Set<string>();
  const unique: SimulationPlayerContext[] = [];

  for (const player of players) {
    if (seen.has(player.id)) {
      continue;
    }

    seen.add(player.id);
    unique.push(player);
  }

  return unique;
}

function listByPrimaryPosition(players: SimulationPlayerContext[], code: string) {
  return players.filter((player) => player.positionCode === code).sort(compareDepth);
}

function listBySecondaryPosition(players: SimulationPlayerContext[], code: string) {
  return players
    .filter((player) => player.secondaryPositionCode === code)
    .sort(compareDepth);
}

function returnAbility(player: SimulationPlayerContext) {
  return (
    attribute(player, "RETURN_VISION") * 1.15 +
    attribute(player, "HANDS") * 0.9 +
    attribute(player, "BALL_SECURITY") +
    attribute(player, "ELUSIVENESS") * 0.9 +
    attribute(player, "ACCELERATION") * 0.85 +
    attribute(player, "SPEED") * 0.8 +
    (player.specialTeamsOverall ?? player.positionOverall) * 0.55
  );
}

function longSnapAbility(player: SimulationPlayerContext) {
  return (
    attribute(player, "SNAP_ACCURACY") * 1.2 +
    attribute(player, "SNAP_VELOCITY") +
    attribute(player, "DISCIPLINE") * 0.9 +
    attribute(player, "AWARENESS") * 0.9 +
    attribute(player, "HAND_TECHNIQUE") * 0.7 +
    (player.specialTeamsOverall ?? player.positionOverall) * 0.4
  );
}

function takeWithFallback(
  players: SimulationPlayerContext[],
  count: number,
  fallbackPool: SimulationPlayerContext[],
) {
  const selected = players.slice(0, count);

  if (selected.length === count) {
    return selected;
  }

  for (const fallback of fallbackPool) {
    if (selected.find((player) => player.id === fallback.id)) {
      continue;
    }

    selected.push(fallback);

    if (selected.length === count) {
      break;
    }
  }

  return selected;
}

function selectReturner(players: SimulationPlayerContext[], code: "KR" | "PR") {
  const bySecondary = listBySecondaryPosition(players, code);

  if (bySecondary[0]) {
    return [...bySecondary].sort((left, right) => {
      const returnDiff = returnAbility(right) - returnAbility(left);

      if (returnDiff !== 0) {
        return returnDiff;
      }

      return compareDepth(left, right);
    })[0];
  }

  return players
    .filter((player) => SPECIAL_RETURN_FALLBACKS.has(player.positionCode))
    .sort((left, right) => {
      const returnDiff = returnAbility(right) - returnAbility(left);

      if (returnDiff !== 0) {
        return returnDiff;
      }

      return compareDepth(left, right);
    })[0] ?? null;
}

function buildTeamPools(team: SimulationTeamContext, simulationSeed?: string) {
  const available = team.roster
    .map((player) => {
      const gameDayProfile = resolveGameDayProfile(player, simulationSeed);

      return {
        ...player,
        gameDayAvailability: gameDayProfile.gameDayAvailability,
        gameDayReadinessMultiplier: gameDayProfile.gameDayReadinessMultiplier,
        gameDaySnapMultiplier: gameDayProfile.gameDaySnapMultiplier,
      };
    })
    .filter((player) => isAvailable(player, simulationSeed));
  const quarterbacks = listByPrimaryPosition(available, "QB");
  const runningBacks = listByPrimaryPosition(available, "RB");
  const fullbacks = listByPrimaryPosition(available, "FB");
  const receivers = listByPrimaryPosition(available, "WR");
  const tightEnds = listByPrimaryPosition(available, "TE");
  const offensiveLine = uniquePlayers(
    ["LT", "LG", "C", "RG", "RT"].flatMap((position) =>
      listByPrimaryPosition(available, position),
    ),
  ).sort(compareDepth);
  const defensiveEnds = [
    ...listByPrimaryPosition(available, "LE"),
    ...listByPrimaryPosition(available, "RE"),
  ].sort(compareDepth);
  const defensiveTackles = listByPrimaryPosition(available, "DT");
  const linebackers = uniquePlayers(
    ["LOLB", "MLB", "ROLB"].flatMap((position) =>
      listByPrimaryPosition(available, position),
    ),
  ).sort(compareDepth);
  const cornerbacks = listByPrimaryPosition(available, "CB");
  const safeties = uniquePlayers(
    [...listByPrimaryPosition(available, "FS"), ...listByPrimaryPosition(available, "SS")],
  ).sort(compareDepth);
  const kicker =
    listByPrimaryPosition(available, "K")[0] ??
    listByPrimaryPosition(available, "P")[0] ??
    null;
  const punter =
    listByPrimaryPosition(available, "P")[0] ??
    listByPrimaryPosition(available, "K")[0] ??
    null;
  const longSnapper =
    listByPrimaryPosition(available, "LS")[0] ??
    available
      .filter((player) => LONG_SNAPPER_FALLBACKS.has(player.positionCode))
      .sort((left, right) => {
        const snapDiff = longSnapAbility(right) - longSnapAbility(left);

        if (snapDiff !== 0) {
          return snapDiff;
        }

        return compareDepth(left, right);
      })[0] ??
    null;
  const kickReturner = selectReturner(available, "KR");
  const puntReturner = selectReturner(available, "PR");

  return {
    available,
    quarterbacks,
    runningBacks,
    fullbacks,
    receivers,
    tightEnds,
    offensiveLine,
    defensiveEnds,
    defensiveTackles,
    linebackers,
    cornerbacks,
    safeties,
    kicker,
    punter,
    longSnapper,
    kickReturner,
    puntReturner,
  };
}

export function validateTeamForSimulation(
  team: SimulationTeamContext,
  simulationSeed?: string,
): TeamSimulationValidationIssue[] {
  const pools = buildTeamPools(team, simulationSeed);
  const issues: TeamSimulationValidationIssue[] = [];

  if (pools.quarterbacks.length < 1) {
    issues.push({
      code: "QB_MISSING",
      message: `${team.abbreviation} has no active quarterback for simulation`,
    });
  }

  if (pools.runningBacks.length + pools.fullbacks.length < 1) {
    issues.push({
      code: "BACKFIELD_MISSING",
      message: `${team.abbreviation} has no active running back or fullback`,
    });
  }

  if (pools.receivers.length + pools.tightEnds.length < 4) {
    issues.push({
      code: "RECEIVERS_INCOMPLETE",
      message: `${team.abbreviation} has fewer than four active receiving options`,
    });
  }

  if (pools.offensiveLine.length < 5) {
    issues.push({
      code: "OFFENSIVE_LINE_INCOMPLETE",
      message: `${team.abbreviation} has fewer than five active offensive linemen`,
    });
  }

  if (pools.defensiveEnds.length + pools.defensiveTackles.length < 4) {
    issues.push({
      code: "DEFENSIVE_FRONT_INCOMPLETE",
      message: `${team.abbreviation} has fewer than four active defensive linemen`,
    });
  }

  if (pools.linebackers.length < 3) {
    issues.push({
      code: "LINEBACKERS_INCOMPLETE",
      message: `${team.abbreviation} has fewer than three active linebackers`,
    });
  }

  if (pools.cornerbacks.length < 2) {
    issues.push({
      code: "CORNERBACKS_INCOMPLETE",
      message: `${team.abbreviation} has fewer than two active cornerbacks`,
    });
  }

  if (pools.safeties.length < 2) {
    issues.push({
      code: "SAFETIES_INCOMPLETE",
      message: `${team.abbreviation} has fewer than two active safeties`,
    });
  }

  if (!pools.kicker) {
    issues.push({
      code: "KICKER_MISSING",
      message: `${team.abbreviation} has no active kicker`,
    });
  }

  if (!pools.punter) {
    issues.push({
      code: "PUNTER_MISSING",
      message: `${team.abbreviation} has no active punter`,
    });
  }

  if (!pools.longSnapper) {
    issues.push({
      code: "LONG_SNAPPER_MISSING",
      message: `${team.abbreviation} has no active long snapper`,
    });
  }

  if (!pools.kickReturner) {
    issues.push({
      code: "KR_MISSING",
      message: `${team.abbreviation} has no active kick returner`,
    });
  }

  if (!pools.puntReturner) {
    issues.push({
      code: "PR_MISSING",
      message: `${team.abbreviation} has no active punt returner`,
    });
  }

  return issues;
}

export function assertTeamCanSimulate(team: SimulationTeamContext, simulationSeed?: string) {
  const issues = validateTeamForSimulation(team, simulationSeed);

  if (issues.length === 0) {
    return;
  }

  throw new Error(
    `Match simulation blocked for ${team.city} ${team.nickname}: ${issues
      .map((issue) => issue.message)
      .join(" | ")}`,
  );
}

export function prepareTeamForSimulation(
  team: SimulationTeamContext,
  simulationSeed?: string,
): PreparedTeam {
  const pools = buildTeamPools(team, simulationSeed);
  const {
    quarterbacks,
    runningBacks,
    fullbacks,
    receivers,
    tightEnds,
    offensiveLine,
    defensiveEnds,
    defensiveTackles,
    linebackers,
    cornerbacks,
    safeties,
    kicker,
    punter,
    longSnapper,
    kickReturner,
    puntReturner,
    available,
  } = pools;

  const offensiveStarters = uniquePlayers([
    ...(quarterbacks[0] ? [quarterbacks[0]] : []),
    ...(runningBacks[0] ? [runningBacks[0]] : []),
    ...(fullbacks[0] ? [fullbacks[0]] : []),
    ...takeWithFallback(receivers, 3, tightEnds),
    ...takeWithFallback(tightEnds, 1, receivers),
    ...takeWithFallback(offensiveLine, 5, available),
  ]);

  const defensiveLine = uniquePlayers([
    ...takeWithFallback(defensiveEnds, 2, defensiveTackles),
    ...takeWithFallback(defensiveTackles, 2, defensiveEnds),
  ]);
  const defenseStarters = uniquePlayers([
    ...defensiveLine,
    ...takeWithFallback(linebackers, 3, cornerbacks),
    ...takeWithFallback(cornerbacks, 2, safeties),
    ...takeWithFallback(safeties, 2, cornerbacks),
  ]);
  const specialStarters = uniquePlayers(
    [kicker, punter, longSnapper, kickReturner, puntReturner].filter(
      (player): player is SimulationPlayerContext => player != null,
    ),
  );

  const starterIds = new Set(
    uniquePlayers([...offensiveStarters, ...defenseStarters, ...specialStarters]).map(
      (player) => player.id,
    ),
  );
  const participants = uniquePlayers([
    ...offensiveStarters,
    ...defenseStarters,
    ...specialStarters,
    ...quarterbacks.slice(0, 2),
    ...runningBacks.slice(0, 2),
    ...receivers.slice(0, 4),
    ...tightEnds.slice(0, 2),
    ...linebackers.slice(0, 4),
    ...defensiveTackles.slice(0, 3),
    ...cornerbacks.slice(0, 3),
    ...safeties.slice(0, 3),
  ]);

  return {
    team,
    starterIds,
    participants,
    quarterbacks,
    runningBacks,
    fullbacks,
    receivers,
    tightEnds,
    offensiveLine,
    defensiveLine,
    linebackers,
    cornerbacks,
    safeties,
    defenders: uniquePlayers([...defensiveLine, ...linebackers, ...cornerbacks, ...safeties]),
    tacklers: uniquePlayers([...linebackers, ...safeties, ...cornerbacks, ...defensiveLine]),
    passRushers: uniquePlayers([...defensiveLine, ...linebackers]),
    coveragePlayers: uniquePlayers([...cornerbacks, ...safeties, ...linebackers]),
    kicker,
    punter,
    longSnapper,
    kickReturner,
    puntReturner,
  };
}

export type { PreparedTeam };
