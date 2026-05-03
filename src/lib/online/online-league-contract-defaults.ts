import type {
  OnlineContractPlayer,
  OnlinePlayerXFactor,
  OnlineXFactorAbilityId,
  PlayerContract,
  PlayerDevelopmentPath,
} from "./online-league-types";

export const DEFAULT_ONLINE_SALARY_CAP_LIMIT = 200_000_000;
export const DEFAULT_ONLINE_SOFT_CAP_BUFFER_PERCENTAGE = 5;

const CONTRACT_ROSTER_TEMPLATE: Array<{
  suffix: string;
  playerName: string;
  position: string;
  age: number;
  overall: number;
  potential: number;
  developmentPath: PlayerDevelopmentPath;
  salaryPerYear: number;
  yearsRemaining: number;
  guaranteedMoney: number;
}> = [
  {
    suffix: "qb1",
    playerName: "Franchise QB",
    position: "QB",
    age: 27,
    overall: 86,
    potential: 93,
    developmentPath: "star",
    salaryPerYear: 42_000_000,
    yearsRemaining: 3,
    guaranteedMoney: 72_000_000,
  },
  {
    suffix: "wr1",
    playerName: "WR1",
    position: "WR",
    age: 25,
    overall: 84,
    potential: 88,
    developmentPath: "solid",
    salaryPerYear: 22_000_000,
    yearsRemaining: 2,
    guaranteedMoney: 24_000_000,
  },
  {
    suffix: "edge1",
    playerName: "Edge Starter",
    position: "EDGE",
    age: 28,
    overall: 83,
    potential: 86,
    developmentPath: "solid",
    salaryPerYear: 24_000_000,
    yearsRemaining: 3,
    guaranteedMoney: 30_000_000,
  },
  {
    suffix: "cb1",
    playerName: "CB1",
    position: "CB",
    age: 26,
    overall: 81,
    potential: 83,
    developmentPath: "bust",
    salaryPerYear: 17_000_000,
    yearsRemaining: 2,
    guaranteedMoney: 14_000_000,
  },
  {
    suffix: "ot1",
    playerName: "Left Tackle",
    position: "OT",
    age: 29,
    overall: 80,
    potential: 84,
    developmentPath: "solid",
    salaryPerYear: 18_000_000,
    yearsRemaining: 2,
    guaranteedMoney: 16_000_000,
  },
];

export function inferContractType(
  input:
    | Pick<OnlineContractPlayer, "age" | "overall">
    | Pick<PlayerContract, "salaryPerYear" | "yearsRemaining">,
): PlayerContract["contractType"] {
  if ("age" in input) {
    if (input.age <= 24) {
      return "rookie";
    }

    return input.overall >= 84 ? "star" : "regular";
  }

  if (input.salaryPerYear >= DEFAULT_ONLINE_SALARY_CAP_LIMIT * 0.15) {
    return "star";
  }

  if (
    input.yearsRemaining >= 4 &&
    input.salaryPerYear <= DEFAULT_ONLINE_SALARY_CAP_LIMIT * 0.025
  ) {
    return "rookie";
  }

  return "regular";
}

export function getOnlineXFactorDefinition(
  abilityId: OnlineXFactorAbilityId,
): OnlinePlayerXFactor {
  if (abilityId === "clutch") {
    return {
      abilityId,
      abilityName: "Clutch",
      description: "Aktiviert in engen Schlussphasen einen kleinen Entscheidungs- und Execution-Bonus.",
      rarity: "rare",
    };
  }

  if (abilityId === "speed_burst") {
    return {
      abilityId,
      abilityName: "Speed Burst",
      description: "Kann bei Raum, langen Downs oder Returns explosive Plays anschieben.",
      rarity: "rare",
    };
  }

  return {
    abilityId,
    abilityName: "Playmaker",
    description: "Aktiviert in Passing-Situationen mit hoher Hebelwirkung einen kleinen Creation-Bonus.",
    rarity: "rare",
  };
}

export function inferPlayerDevelopmentPath(
  player: Pick<OnlineContractPlayer, "age" | "overall"> &
    Partial<Pick<OnlineContractPlayer, "potential">>,
): PlayerDevelopmentPath {
  const potential = player.potential ?? player.overall;
  const upside = potential - player.overall;

  if (player.age <= 25 && (potential >= 88 || upside >= 8)) {
    return "star";
  }

  if (player.age >= 29 || upside <= 2) {
    return "bust";
  }

  return "solid";
}

export function inferDefaultXFactors(
  player: Pick<
    OnlineContractPlayer,
    "age" | "overall" | "position" | "potential" | "developmentPath"
  >,
): OnlinePlayerXFactor[] {
  const abilityIds: OnlineXFactorAbilityId[] = [];
  const isPremiumPlayer =
    player.overall >= 86 ||
    (player.developmentPath === "star" && player.potential >= 90 && player.overall >= 78);

  if (!isPremiumPlayer) {
    return [];
  }

  if (player.overall >= 86 && ["QB", "K"].includes(player.position)) {
    abilityIds.push("clutch");
  }

  if (
    ["WR", "RB", "TE", "CB"].includes(player.position) &&
    player.age <= 27 &&
    player.potential >= 86
  ) {
    abilityIds.push("speed_burst");
  }

  if (
    ["QB", "WR", "TE", "RB"].includes(player.position) &&
    player.overall >= 84 &&
    player.potential >= 88
  ) {
    abilityIds.push("playmaker");
  }

  return Array.from(new Set(abilityIds))
    .slice(0, player.overall >= 90 ? 2 : 1)
    .map(getOnlineXFactorDefinition);
}

export function getDefaultPotentialForPath(overall: number, path: PlayerDevelopmentPath) {
  if (path === "star") {
    return Math.max(overall, Math.min(99, overall + 9));
  }

  if (path === "solid") {
    return Math.max(overall, Math.min(95, overall + 5));
  }

  return Math.max(overall, Math.min(90, overall + 2));
}

export function createContract(
  salaryPerYear: number,
  yearsRemaining: number,
  guaranteedMoney: number,
  contractType?: PlayerContract["contractType"],
  signingBonus?: number,
): PlayerContract {
  const normalizedYears = Math.max(1, Math.floor(yearsRemaining));
  const normalizedSalary = Math.max(0, Math.round(salaryPerYear));
  const normalizedGuaranteed = Math.max(0, Math.round(guaranteedMoney));
  const normalizedSigningBonus = Math.max(
    0,
    Math.round(signingBonus ?? normalizedGuaranteed * 0.15),
  );
  const normalizedContractType =
    contractType ??
    inferContractType({
      salaryPerYear: normalizedSalary,
      yearsRemaining: normalizedYears,
    });
  const capHitPerYear = Math.max(
    0,
    Math.round(normalizedSalary + normalizedSigningBonus / normalizedYears),
  );
  const deadCapPerYear = Math.max(
    0,
    Math.round((normalizedGuaranteed + normalizedSigningBonus) / normalizedYears),
  );

  return {
    salaryPerYear: normalizedSalary,
    yearsRemaining: normalizedYears,
    totalValue: Math.max(
      0,
      Math.round(normalizedSalary * normalizedYears + normalizedSigningBonus),
    ),
    guaranteedMoney: normalizedGuaranteed,
    signingBonus: normalizedSigningBonus,
    contractType: normalizedContractType,
    capHitPerYear,
    deadCapPerYear,
  };
}

export function createDefaultContractRoster(
  teamId: string,
  teamName: string,
): OnlineContractPlayer[] {
  return CONTRACT_ROSTER_TEMPLATE.map((player) => ({
    playerId: `${teamId}-${player.suffix}`,
    playerName: `${teamName} ${player.playerName}`,
    position: player.position,
    age: player.age,
    overall: player.overall,
    potential: player.potential,
    developmentPath: player.developmentPath,
    developmentProgress: 0,
    xFactors: inferDefaultXFactors(player),
    contract: createContract(
      player.salaryPerYear,
      player.yearsRemaining,
      player.guaranteedMoney,
      inferContractType({ age: player.age, overall: player.overall }),
    ),
    status: "active",
  }));
}
