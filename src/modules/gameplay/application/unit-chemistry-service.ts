export type ChemistryGroupType =
  | "OFFENSIVE_LINE"
  | "QB_WR"
  | "DEFENSIVE_BACK";

export type ChemistryGroupUsage = {
  type: ChemistryGroupType;
  teamId: string;
  playerIds: string[];
  snaps: number;
};

export type ChemistryGroupState = {
  key: string;
  type: ChemistryGroupType;
  teamId: string;
  playerIds: string[];
  chemistry: number;
  gamesTogether: number;
  snapsTogether: number;
  lastSeasonYear: number;
  lastWeek: number;
};

export type ChemistryState = {
  groups: Record<string, ChemistryGroupState>;
};

export type ChemistryUpdateContext = {
  seasonYear: number;
  week: number;
};

export type OffensiveLineChemistryModifier = {
  chemistry: number;
  passProtectionBonus: number;
  runBlockingBonus: number;
};

export type QbReceiverChemistryModifier = {
  chemistry: number;
  routeTimingModifier: number;
  targetSelectionBonus: number;
  catchWindowModifier: number;
};

export type DefensiveBackChemistryModifier = {
  chemistry: number;
  coverageSupportModifier: number;
  zoneHandoffModifier: number;
  safetyHelpModifier: number;
};

export type UnitChemistryModifiers = {
  offensiveLine: OffensiveLineChemistryModifier;
  qbReceiver: QbReceiverChemistryModifier;
  defensiveBack: DefensiveBackChemistryModifier;
};

const NEW_GROUP_CHEMISTRY = 28;
const MAX_CHEMISTRY = 100;
const MIN_CHEMISTRY = 0;
const UNUSED_WEEK_DECAY = 1.15;
const ROSTER_CHANGE_RETENTION = 0.28;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 3) {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

function normalizePlayerIds(type: ChemistryGroupType, playerIds: string[]) {
  const unique = [...new Set(playerIds)].filter(Boolean);

  if (type === "QB_WR") {
    return unique.slice(0, 2);
  }

  return unique.sort();
}

export function createEmptyChemistryState(): ChemistryState {
  return { groups: {} };
}

export function buildChemistryGroupKey(input: {
  type: ChemistryGroupType;
  teamId: string;
  playerIds: string[];
}) {
  return `${input.teamId}:${input.type}:${normalizePlayerIds(input.type, input.playerIds).join("+")}`;
}

function weekDistance(left: ChemistryUpdateContext, right: ChemistryGroupState) {
  const seasonGap = Math.max(0, left.seasonYear - right.lastSeasonYear);
  const rawWeekDistance = seasonGap * 24 + left.week - right.lastWeek;

  return Math.max(0, rawWeekDistance);
}

function overlapShare(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((id) => rightSet.has(id)).length;
  const union = new Set([...left, ...right]).size;

  return union === 0 ? 0 : intersection / union;
}

function bestPreviousGroup(input: {
  state: ChemistryState;
  type: ChemistryGroupType;
  teamId: string;
  playerIds: string[];
}) {
  return Object.values(input.state.groups)
    .filter((group) => group.type === input.type && group.teamId === input.teamId)
    .map((group) => ({
      group,
      overlap: overlapShare(input.playerIds, group.playerIds),
    }))
    .sort((left, right) => right.overlap - left.overlap)[0] ?? null;
}

function initialChemistryForUsage(state: ChemistryState, usage: ChemistryGroupUsage) {
  const playerIds = normalizePlayerIds(usage.type, usage.playerIds);
  const previous = bestPreviousGroup({
    state,
    type: usage.type,
    teamId: usage.teamId,
    playerIds,
  });

  if (!previous || previous.overlap <= 0) {
    return NEW_GROUP_CHEMISTRY;
  }

  return clamp(
    NEW_GROUP_CHEMISTRY +
      previous.group.chemistry * previous.overlap * ROSTER_CHANGE_RETENTION,
    NEW_GROUP_CHEMISTRY,
    48,
  );
}

function growthForUsage(usage: ChemistryGroupUsage, currentChemistry: number) {
  const snapGrowth = Math.sqrt(Math.max(usage.snaps, 0)) * 0.22;
  const learningCurve = clamp((MAX_CHEMISTRY - currentChemistry) / 70, 0.12, 1);

  return snapGrowth * learningCurve;
}

function normalizeUsages(usages: ChemistryGroupUsage[]) {
  return usages
    .map((usage) => ({
      ...usage,
      playerIds: normalizePlayerIds(usage.type, usage.playerIds),
      snaps: Math.max(0, usage.snaps),
    }))
    .filter((usage) => usage.playerIds.length > 0 && usage.snaps > 0);
}

export function updateChemistryAfterGame(input: {
  state: ChemistryState;
  usages: ChemistryGroupUsage[];
  context: ChemistryUpdateContext;
}): ChemistryState {
  const usages = normalizeUsages(input.usages);
  const nextGroups: Record<string, ChemistryGroupState> = {};
  const usedKeys = new Set<string>();

  for (const group of Object.values(input.state.groups)) {
    const distance = weekDistance(input.context, group);
    const decay = Math.max(0, distance - 1) * UNUSED_WEEK_DECAY;

    nextGroups[group.key] = {
      ...group,
      chemistry: round(clamp(group.chemistry - decay, MIN_CHEMISTRY, MAX_CHEMISTRY), 2),
    };
  }

  for (const usage of usages) {
    const key = buildChemistryGroupKey(usage);
    const existing = nextGroups[key];
    const startingChemistry =
      existing?.chemistry ?? initialChemistryForUsage(input.state, usage);
    const grownChemistry = clamp(
      startingChemistry + growthForUsage(usage, startingChemistry),
      MIN_CHEMISTRY,
      MAX_CHEMISTRY,
    );

    nextGroups[key] = {
      key,
      type: usage.type,
      teamId: usage.teamId,
      playerIds: usage.playerIds,
      chemistry: round(grownChemistry, 2),
      gamesTogether: (existing?.gamesTogether ?? 0) + 1,
      snapsTogether: (existing?.snapsTogether ?? 0) + usage.snaps,
      lastSeasonYear: input.context.seasonYear,
      lastWeek: input.context.week,
    };
    usedKeys.add(key);
  }

  for (const [key, group] of Object.entries(nextGroups)) {
    if (usedKeys.has(key)) {
      continue;
    }

    const distance = weekDistance(input.context, group);

    if (distance > 8 && group.chemistry < 8) {
      delete nextGroups[key];
    }
  }

  return { groups: nextGroups };
}

function chemistryEdge(chemistry: number) {
  return clamp((chemistry - 50) / 50, -0.45, 1);
}

export function offensiveLineChemistryModifier(
  chemistry: number,
): OffensiveLineChemistryModifier {
  const edge = chemistryEdge(chemistry);

  return {
    chemistry: round(chemistry, 2),
    passProtectionBonus: round(edge * 2.8, 2),
    runBlockingBonus: round(edge * 2.4, 2),
  };
}

export function qbReceiverChemistryModifier(
  chemistry: number,
): QbReceiverChemistryModifier {
  const edge = chemistryEdge(chemistry);

  return {
    chemistry: round(chemistry, 2),
    routeTimingModifier: round(edge * 0.055, 3),
    targetSelectionBonus: round(edge * 0.032, 3),
    catchWindowModifier: round(edge * 0.036, 3),
  };
}

export function defensiveBackChemistryModifier(
  chemistry: number,
): DefensiveBackChemistryModifier {
  const edge = chemistryEdge(chemistry);

  return {
    chemistry: round(chemistry, 2),
    coverageSupportModifier: round(edge * 0.034, 3),
    zoneHandoffModifier: round(edge * 0.03, 3),
    safetyHelpModifier: round(edge * 0.028, 3),
  };
}

function groupChemistry(input: {
  state: ChemistryState;
  type: ChemistryGroupType;
  teamId: string;
  playerIds: string[];
}) {
  const key = buildChemistryGroupKey(input);

  return input.state.groups[key]?.chemistry ?? NEW_GROUP_CHEMISTRY;
}

export function calculateUnitChemistryModifiers(input: {
  state: ChemistryState;
  teamId: string;
  offensiveLinePlayerIds?: string[];
  qbReceiverPlayerIds?: string[];
  defensiveBackPlayerIds?: string[];
}): UnitChemistryModifiers {
  return {
    offensiveLine: offensiveLineChemistryModifier(
      groupChemistry({
        state: input.state,
        type: "OFFENSIVE_LINE",
        teamId: input.teamId,
        playerIds: input.offensiveLinePlayerIds ?? [],
      }),
    ),
    qbReceiver: qbReceiverChemistryModifier(
      groupChemistry({
        state: input.state,
        type: "QB_WR",
        teamId: input.teamId,
        playerIds: input.qbReceiverPlayerIds ?? [],
      }),
    ),
    defensiveBack: defensiveBackChemistryModifier(
      groupChemistry({
        state: input.state,
        type: "DEFENSIVE_BACK",
        teamId: input.teamId,
        playerIds: input.defensiveBackPlayerIds ?? [],
      }),
    ),
  };
}
