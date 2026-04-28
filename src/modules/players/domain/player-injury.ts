import { InjuryStatus, PlayerStatus } from "@/modules/shared/domain/enums";

export type PlayerInjuryContext = {
  attributes: Record<string, number>;
  fatigue: number;
  injuryRisk: number;
  physicalOverall: number | null;
  positionCode: string;
  totalSnaps: number;
};

export type PlayerInjuryOutcome = {
  status: PlayerStatus;
  injuryStatus: InjuryStatus;
  injuryName: string;
  injuryEndsOn: Date;
  moralePenalty: number;
};

export const PLAYER_INJURY_RULES = {
  baseChance: 0.006,
  exposureMultiplier: 0.022,
  minChance: 0.004,
  maxChance: 0.11,
  fatigueThreshold: 35,
  noExposureChance: 0,
  minorDays: 7,
  doubtfulDays: 10,
  outDays: 18,
  injuredReserveDays: 42,
} as const;

const SKILL_POSITIONS = new Set(["QB", "RB", "WR", "CB", "FS", "SS"]);
const TRENCH_POSITIONS = new Set(["LT", "LG", "C", "RG", "RT", "LE", "RE", "DT", "LS"]);
const CONTACT_POSITIONS = new Set([
  "FB",
  "TE",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "LE",
  "RE",
  "DT",
  "LOLB",
  "MLB",
  "ROLB",
  "SS",
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function contactPositionExposure(positionCode: string) {
  if (CONTACT_POSITIONS.has(positionCode)) {
    return 0.12;
  }

  if (SKILL_POSITIONS.has(positionCode)) {
    return 0.06;
  }

  return 0;
}

export function calculateMatchInjuryRisk(player: PlayerInjuryContext) {
  const snaps = Math.max(player.totalSnaps, 0);

  if (snaps <= 0) {
    return PLAYER_INJURY_RULES.noExposureChance;
  }

  const durability = player.attributes.DURABILITY ?? 70;
  const toughness = player.attributes.TOUGHNESS ?? 70;
  const physicalOverall = player.physicalOverall ?? 70;
  const fatigueRisk = Math.max(player.fatigue - PLAYER_INJURY_RULES.fatigueThreshold, 0);
  const exposure =
    player.injuryRisk / 100 +
    snaps / 210 +
    fatigueRisk / 220 +
    (75 - durability) / 220 +
    (72 - toughness) / 260 +
    (70 - physicalOverall) / 320 +
    contactPositionExposure(player.positionCode);

  return clamp(
    PLAYER_INJURY_RULES.baseChance + exposure * PLAYER_INJURY_RULES.exposureMultiplier,
    PLAYER_INJURY_RULES.minChance,
    PLAYER_INJURY_RULES.maxChance,
  );
}

function buildInjuryName(positionCode: string, severity: "MINOR" | "MAJOR" | "LONG_TERM") {
  if (severity === "MINOR") {
    return SKILL_POSITIONS.has(positionCode)
      ? "Hamstring Tightness"
      : TRENCH_POSITIONS.has(positionCode)
        ? "Hand Contusion"
        : "Shoulder Bruise";
  }

  if (severity === "MAJOR") {
    return SKILL_POSITIONS.has(positionCode)
      ? "Ankle Sprain"
      : TRENCH_POSITIONS.has(positionCode)
        ? "Shoulder Sprain"
        : "Rib Injury";
  }

  return SKILL_POSITIONS.has(positionCode)
    ? "High Ankle Sprain"
    : TRENCH_POSITIONS.has(positionCode)
      ? "Knee Ligament Injury"
      : "Pectoral Tear";
}

export function resolveMatchInjury(input: {
  player: PlayerInjuryContext;
  random: () => number;
  scheduledAt: Date;
}): PlayerInjuryOutcome | null {
  const injuryChance = calculateMatchInjuryRisk(input.player);

  if (injuryChance <= 0 || input.random() >= injuryChance) {
    return null;
  }

  const severityRoll = input.random();

  if (severityRoll < 0.7) {
    return {
      status: PlayerStatus.ACTIVE,
      injuryStatus: InjuryStatus.QUESTIONABLE,
      injuryName: buildInjuryName(input.player.positionCode, "MINOR"),
      injuryEndsOn: addDays(input.scheduledAt, PLAYER_INJURY_RULES.minorDays),
      moralePenalty: 2,
    };
  }

  if (severityRoll < 0.97) {
    const isDoubtful = severityRoll < 0.87;

    return {
      status: PlayerStatus.INJURED,
      injuryStatus: isDoubtful ? InjuryStatus.DOUBTFUL : InjuryStatus.OUT,
      injuryName: buildInjuryName(input.player.positionCode, "MAJOR"),
      injuryEndsOn: addDays(
        input.scheduledAt,
        isDoubtful ? PLAYER_INJURY_RULES.doubtfulDays : PLAYER_INJURY_RULES.outDays,
      ),
      moralePenalty: 5,
    };
  }

  return {
    status: PlayerStatus.INJURED,
    injuryStatus: InjuryStatus.INJURED_RESERVE,
    injuryName: buildInjuryName(input.player.positionCode, "LONG_TERM"),
    injuryEndsOn: addDays(input.scheduledAt, PLAYER_INJURY_RULES.injuredReserveDays),
    moralePenalty: 8,
  };
}
