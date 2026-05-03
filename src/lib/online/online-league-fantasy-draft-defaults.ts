import { createRng, createSeededId } from "@/lib/random/seeded-rng";
import {
  createContract,
  inferContractType,
  inferDefaultXFactors,
  inferPlayerDevelopmentPath,
} from "./online-league-contract-defaults";
import { normalizeMaxUsers } from "./online-league-creation";
import {
  ONLINE_FANTASY_DRAFT_POSITIONS,
  ONLINE_FANTASY_DRAFT_RESERVE_RATE,
  ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS,
  ONLINE_FANTASY_DRAFT_SEED,
  type OnlineFantasyDraftPosition,
} from "./online-league-draft-service";
import type {
  OnlineContractPlayer,
  OnlineFantasyDraftPick,
  OnlineFantasyDraftState,
} from "./online-league-types";

const FANTASY_DRAFT_FIRST_NAMES = [
  "Adrian",
  "Bastian",
  "Caleb",
  "Dario",
  "Elias",
  "Finn",
  "Gabriel",
  "Hugo",
  "Isaac",
  "Jonas",
  "Kian",
  "Luca",
  "Milan",
  "Noah",
  "Oscar",
  "Rafael",
  "Silas",
  "Theo",
  "Victor",
  "Yann",
  "Zane",
  "Mateo",
  "Emil",
  "Nico",
];

const FANTASY_DRAFT_LAST_NAMES = [
  "Alder",
  "Berg",
  "Cross",
  "Diaz",
  "Eden",
  "Frost",
  "Grant",
  "Hale",
  "Ivers",
  "Jensen",
  "Keller",
  "Lang",
  "Morrow",
  "Novak",
  "Ortega",
  "Price",
  "Quinn",
  "Reed",
  "Stone",
  "Tanner",
  "Vale",
  "West",
  "Young",
  "Ziegler",
  "Voss",
  "Marin",
  "Sato",
  "Moreau",
  "Peters",
  "Rossi",
  "Schneider",
  "Walker",
];

const FANTASY_DRAFT_POSITION_SUFFIX: Record<OnlineFantasyDraftPosition, string> = {
  QB: "Field General",
  RB: "Runner",
  WR: "Receiver",
  TE: "Tight End",
  OL: "Lineman",
  DL: "Defender",
  LB: "Linebacker",
  CB: "Corner",
  S: "Safety",
  K: "Kicker",
  P: "Punter",
};

const FANTASY_DRAFT_SALARY_BASE: Record<OnlineFantasyDraftPosition, number> = {
  QB: 18_000_000,
  RB: 5_500_000,
  WR: 9_500_000,
  TE: 6_500_000,
  OL: 7_500_000,
  DL: 8_500_000,
  LB: 6_500_000,
  CB: 8_500_000,
  S: 6_000_000,
  K: 2_500_000,
  P: 2_200_000,
};

export function getFantasyDraftPositionTargetCounts(
  maxUsers: number,
): Record<OnlineFantasyDraftPosition, number> {
  const normalizedTeams = normalizeMaxUsers(maxUsers);

  return ONLINE_FANTASY_DRAFT_POSITIONS.reduce(
    (counts, position) => ({
      ...counts,
      [position]: Math.ceil(
        ONLINE_FANTASY_DRAFT_ROSTER_REQUIREMENTS[position] *
          normalizedTeams *
          (1 + ONLINE_FANTASY_DRAFT_RESERVE_RATE),
      ),
    }),
    {} as Record<OnlineFantasyDraftPosition, number>,
  );
}

function getFantasyDraftPlayerRating(
  position: OnlineFantasyDraftPosition,
  index: number,
  count: number,
) {
  const tier = index / Math.max(1, count - 1);

  if (position === "K" || position === "P") {
    if (tier < 0.15) {
      return { min: 82, max: 90 };
    }

    if (tier < 0.45) {
      return { min: 74, max: 81 };
    }

    return { min: 62, max: 73 };
  }

  if (tier < 0.05) {
    return { min: 88, max: 94 };
  }

  if (tier < 0.2) {
    return { min: 80, max: 87 };
  }

  if (tier < 0.75) {
    return { min: 68, max: 79 };
  }

  return { min: 58, max: 67 };
}

function getFantasyDraftPlayerAge(
  position: OnlineFantasyDraftPosition,
  overall: number,
  rng: ReturnType<typeof createRng>,
) {
  if (position === "K" || position === "P") {
    return rng.int(23, 36);
  }

  if (overall >= 86) {
    return rng.int(24, 31);
  }

  if (overall >= 76) {
    return rng.int(22, 32);
  }

  return rng.int(21, 34);
}

function getFantasyDraftPlayerName(
  position: OnlineFantasyDraftPosition,
  index: number,
  rng: ReturnType<typeof createRng>,
) {
  const firstName = FANTASY_DRAFT_FIRST_NAMES[
    rng.int(0, FANTASY_DRAFT_FIRST_NAMES.length - 1)
  ];
  const lastName = FANTASY_DRAFT_LAST_NAMES[
    rng.int(0, FANTASY_DRAFT_LAST_NAMES.length - 1)
  ];

  return `${firstName} ${lastName} ${FANTASY_DRAFT_POSITION_SUFFIX[position]} ${index + 1}`;
}

function getFantasyDraftSalary(
  position: OnlineFantasyDraftPosition,
  overall: number,
  rng: ReturnType<typeof createRng>,
) {
  const base = FANTASY_DRAFT_SALARY_BASE[position];
  const ratingMultiplier = 0.45 + Math.max(0, overall - 55) / 38;
  const positionPremium = position === "QB" && overall >= 84 ? 1.35 : 1;
  const variance = rng.int(88, 114) / 100;

  return Math.round(base * ratingMultiplier * positionPremium * variance);
}

function createFantasyDraftPlayer(
  leagueId: string,
  position: OnlineFantasyDraftPosition,
  index: number,
  count: number,
  seed: string,
): OnlineContractPlayer {
  const rng = createRng(`${seed}:${leagueId}:${position}:${index}`);
  const ratingBand = getFantasyDraftPlayerRating(position, index, count);
  const overall = rng.int(ratingBand.min, ratingBand.max);
  const age = getFantasyDraftPlayerAge(position, overall, rng);
  const developmentPath = inferPlayerDevelopmentPath({
    age,
    overall,
    potential: Math.min(99, overall + rng.int(age <= 24 ? 4 : 0, age <= 27 ? 9 : 4)),
  });
  const potential = Math.min(
    99,
    overall + rng.int(developmentPath === "star" ? 5 : 0, developmentPath === "bust" ? 3 : 7),
  );
  const salaryPerYear = getFantasyDraftSalary(position, overall, rng);
  const yearsRemaining = rng.int(1, overall >= 82 ? 5 : 4);
  const guaranteedMoney = Math.round(salaryPerYear * yearsRemaining * rng.int(20, 55) / 100);
  const player: OnlineContractPlayer = {
    playerId: createSeededId(
      `pool-${position.toLowerCase()}-${String(index + 1).padStart(3, "0")}`,
      `${seed}:${leagueId}:${position}:${index}:id`,
      8,
    ),
    playerName: getFantasyDraftPlayerName(position, index, rng),
    position,
    age,
    overall,
    potential,
    developmentPath,
    developmentProgress: 0,
    xFactors: [],
    contract: createContract(
      salaryPerYear,
      yearsRemaining,
      guaranteedMoney,
      inferContractType({ age, overall }),
    ),
    status: "active",
  };

  return {
    ...player,
    xFactors: inferDefaultXFactors(player),
  };
}

export function createFantasyDraftPlayerPool(
  leagueId: string,
  maxUsers: number,
): OnlineContractPlayer[] {
  const counts = getFantasyDraftPositionTargetCounts(maxUsers);

  return ONLINE_FANTASY_DRAFT_POSITIONS.flatMap((position) =>
    Array.from({ length: counts[position] }, (_, index) =>
      createFantasyDraftPlayer(
        leagueId,
        position,
        index,
        counts[position],
        ONLINE_FANTASY_DRAFT_SEED,
      ),
    ),
  );
}

export function createInitialFantasyDraftState(
  leagueId: string,
  maxUsers: number,
): OnlineFantasyDraftState {
  const playerPool = createFantasyDraftPlayerPool(leagueId, maxUsers);

  return {
    leagueId,
    status: "not_started",
    round: 1,
    pickNumber: 1,
    currentTeamId: "",
    draftOrder: [],
    picks: [],
    availablePlayerIds: playerPool.map((player) => player.playerId),
    startedAt: null,
    completedAt: null,
  };
}

export function isOnlineFantasyDraftPick(value: unknown): value is OnlineFantasyDraftPick {
  if (!value || typeof value !== "object") {
    return false;
  }

  const pick = value as Partial<OnlineFantasyDraftPick>;

  return (
    typeof pick.pickNumber === "number" &&
    typeof pick.round === "number" &&
    typeof pick.teamId === "string" &&
    typeof pick.playerId === "string" &&
    typeof pick.pickedByUserId === "string" &&
    typeof pick.timestamp === "string"
  );
}

export function isOnlineFantasyDraftState(value: unknown): value is OnlineFantasyDraftState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<OnlineFantasyDraftState>;

  return (
    typeof state.leagueId === "string" &&
    (state.status === "not_started" || state.status === "active" || state.status === "completed") &&
    typeof state.round === "number" &&
    typeof state.pickNumber === "number" &&
    typeof state.currentTeamId === "string" &&
    Array.isArray(state.draftOrder) &&
    state.draftOrder.every((teamId) => typeof teamId === "string") &&
    Array.isArray(state.picks) &&
    state.picks.every(isOnlineFantasyDraftPick) &&
    Array.isArray(state.availablePlayerIds) &&
    state.availablePlayerIds.every((playerId) => typeof playerId === "string") &&
    (state.startedAt === null || typeof state.startedAt === "string") &&
    (state.completedAt === null || typeof state.completedAt === "string")
  );
}

export function normalizeFantasyDraftState(
  state: OnlineFantasyDraftState,
): OnlineFantasyDraftState {
  const picks = state.picks
    .map((pick) => ({
      ...pick,
      pickNumber: Math.max(1, Math.floor(pick.pickNumber)),
      round: Math.max(1, Math.floor(pick.round)),
    }))
    .sort((left, right) => left.pickNumber - right.pickNumber);

  return {
    ...state,
    round: Math.max(1, Math.floor(state.round)),
    pickNumber: Math.max(1, Math.floor(state.pickNumber)),
    draftOrder: Array.from(new Set(state.draftOrder)),
    picks,
    availablePlayerIds: Array.from(new Set(state.availablePlayerIds)),
    startedAt: state.startedAt ?? null,
    completedAt: state.completedAt ?? null,
  };
}
