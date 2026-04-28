import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

export type XFactorTone = "positive" | "warning" | "danger" | "neutral" | "active";
export type XFactorUnitKey = "offense" | "defense" | "special-teams";
export type XFactorActivationStatus = "Ready" | "Limited" | "Locked";

export type XFactorCondition = {
  description: string;
  label: string;
  met: boolean;
};

export type XFactorImpact = {
  description: string;
  label: string;
  tone: XFactorTone;
};

export type XFactorPlayer = {
  abilityName: string;
  activationStatus: XFactorActivationStatus;
  conditions: XFactorCondition[];
  effectDescription: string;
  fullName: string;
  id: string;
  impacts: XFactorImpact[];
  positionCode: string;
  score: number;
  tier: "Franchise" | "Star" | "Role X-Factor";
  tone: XFactorTone;
  traitLabel: string;
  traitValue: number;
  unitKey: XFactorUnitKey;
  unitLabel: string;
};

export type XFactorUnit = {
  key: XFactorUnitKey;
  label: string;
  players: XFactorPlayer[];
  score: number;
  tone: XFactorTone;
};

export type XFactorState = {
  activeCount: number;
  emptyMessage: string;
  limitedCount: number;
  players: XFactorPlayer[];
  readyCount: number;
  summary: string;
  topPlayer: XFactorPlayer | null;
  units: XFactorUnit[];
};

const DEFENSE_POSITIONS = new Set(["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS"]);
const SPECIAL_TEAMS_POSITIONS = new Set(["K", "P", "LS"]);
const X_FACTOR_THRESHOLD = 80;

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function unitKeyForPlayer(
  player: Pick<TeamPlayerSummary, "positionCode" | "secondaryPositionCode">,
): XFactorUnitKey {
  if (
    SPECIAL_TEAMS_POSITIONS.has(player.positionCode) ||
    player.secondaryPositionCode === "KR" ||
    player.secondaryPositionCode === "PR"
  ) {
    return "special-teams";
  }

  if (DEFENSE_POSITIONS.has(player.positionCode)) {
    return "defense";
  }

  return "offense";
}

function unitLabel(key: XFactorUnitKey) {
  if (key === "defense") {
    return "Defense";
  }

  if (key === "special-teams") {
    return "Special Teams";
  }

  return "Offense";
}

function topTrait(player: TeamPlayerSummary) {
  const rating = [...player.detailRatings].sort((left, right) => right.value - left.value)[0];

  return rating ?? { label: "OVR", value: player.positionOverall };
}

function scorePlayer(player: TeamPlayerSummary) {
  const trait = topTrait(player);
  const fit = player.schemeFitScore ?? 55;
  const captainBonus = player.captainFlag ? 3 : 0;
  const fatiguePenalty = player.fatigue >= 80 ? 4 : 0;

  return clampScore(
    player.positionOverall * 0.52 +
      trait.value * 0.28 +
      player.morale * 0.1 +
      fit * 0.1 +
      captainBonus -
      fatiguePenalty,
  );
}

function xFactorTier(score: number): XFactorPlayer["tier"] {
  if (score >= 88) {
    return "Franchise";
  }

  if (score >= 82) {
    return "Star";
  }

  return "Role X-Factor";
}

function toneForStatus(status: XFactorActivationStatus): XFactorTone {
  if (status === "Ready") {
    return "active";
  }

  if (status === "Limited") {
    return "warning";
  }

  return "danger";
}

function activationStatus(conditions: XFactorCondition[]): XFactorActivationStatus {
  const missing = conditions.filter((condition) => !condition.met).length;

  if (missing === 0) {
    return "Ready";
  }

  if (missing <= 2) {
    return "Limited";
  }

  return "Locked";
}

function hasPlayableRole(player: TeamPlayerSummary) {
  return (
    player.rosterStatus === "STARTER" ||
    player.rosterStatus === "ROTATION" ||
    player.depthChartSlot === 1 ||
    player.depthChartSlot === 2
  );
}

function abilityNameForPlayer(player: TeamPlayerSummary, traitLabel: string) {
  if (player.positionCode === "QB") {
    return traitLabel === "Mobility" ? "Escape Command" : "Field General";
  }

  if (player.positionCode === "RB" || player.positionCode === "FB") {
    return "Drive Extender";
  }

  if (player.positionCode === "WR" || player.positionCode === "TE") {
    return "Route Breaker";
  }

  if (["LT", "LG", "C", "RG", "RT"].includes(player.positionCode)) {
    return "Pocket Anchor";
  }

  if (["LE", "RE", "DT", "LOLB", "MLB", "ROLB"].includes(player.positionCode)) {
    return "Pressure Catalyst";
  }

  if (["CB", "FS", "SS"].includes(player.positionCode)) {
    return traitLabel === "Ball Hawk" ? "Turnover Magnet" : "Coverage Lock";
  }

  return "Special Teams Edge";
}

function effectDescriptionForPlayer(player: TeamPlayerSummary, abilityName: string) {
  if (abilityName === "Field General") {
    return "Hebt Passspiel, Protection und Tempo als zentrale Gameplan-Hebel fuer diesen QB hervor.";
  }

  if (abilityName === "Escape Command") {
    return "Macht QB-Mobility und improvisierte Antworten als sichtbaren Offense-Hebel erkennbar.";
  }

  if (abilityName === "Drive Extender") {
    return "Markiert Run Game, Ball Security und kurze Downs als Staerke fuer Drive-Kontrolle.";
  }

  if (abilityName === "Route Breaker") {
    return "Markiert Receiving, Separation oder YAC als Feature-Target fuer Passspiel-Entscheidungen.";
  }

  if (abilityName === "Pocket Anchor") {
    return "Zeigt Protection oder Run-Lane-Stabilitaet als Basis fuer verlaessliche Play Calls.";
  }

  if (abilityName === "Pressure Catalyst") {
    return "Hebt Pass Rush, Box Defense oder Front-Seven-Druck als defensiven Hebel hervor.";
  }

  if (abilityName === "Turnover Magnet") {
    return "Zeigt Ball Skills und Coverage Reads als sichtbare Turnover-Chance.";
  }

  if (abilityName === "Coverage Lock") {
    return "Markiert Coverage-Stabilitaet gegen Top-Ziele und kritische Third Downs.";
  }

  return `Hebt ${player.positionCode} Spezialteams-Konstanz als Field-Position-Hebel hervor.`;
}

function buildConditions(player: TeamPlayerSummary, score: number, traitValue: number): XFactorCondition[] {
  const fit = player.schemeFitScore ?? 55;

  return [
    {
      description: player.status === "ACTIVE" ? "Spieler ist im Team aktiv." : "Spieler ist nicht aktiv.",
      label: "Aktiver Spieler",
      met: player.status === "ACTIVE",
    },
    {
      description:
        player.injuryStatus === "HEALTHY"
          ? "Keine Injury-Einschraenkung sichtbar."
          : `Injury Status: ${player.injuryStatus}.`,
      label: "Healthy",
      met: player.injuryStatus === "HEALTHY",
    },
    {
      description:
        player.fatigue <= 70
          ? "Fatigue ist unter dem X-Factor-Risiko."
          : `Fatigue ${player.fatigue} kann Aktivierung bremsen.`,
      label: "Load okay",
      met: player.fatigue <= 70,
    },
    {
      description: hasPlayableRole(player)
        ? "Starter-, Rotation- oder Top-Depth-Rolle vorhanden."
        : "Keine klare Gameday-Rolle sichtbar.",
      label: "Gameday Role",
      met: hasPlayableRole(player),
    },
    {
      description: `Trait ${traitValue}, X-Factor Score ${score}.`,
      label: "Star Trait",
      met: traitValue >= 78 || score >= X_FACTOR_THRESHOLD,
    },
    {
      description: `Morale ${player.morale}, Scheme Fit ${fit}.`,
      label: "Fit & Morale",
      met: player.morale >= 50 && fit >= 55,
    },
  ];
}

function buildImpacts(player: TeamPlayerSummary, status: XFactorActivationStatus): XFactorImpact[] {
  return [
    {
      description:
        status === "Ready"
          ? "Kann als klarer Fokus im Gameplan-Kontext gelesen werden."
          : "Erst Bedingungen pruefen, bevor der Spieler als Gameplan-Fokus dient.",
      label: "Gameplan Fokus",
      tone: status === "Ready" ? "positive" : "warning",
    },
    {
      description:
        player.fatigue > 70 || player.injuryStatus !== "HEALTHY"
          ? "Load oder Injury begrenzt die Zuverlaessigkeit."
          : "Keine akuten Load- oder Injury-Signale.",
      label: "Reliability",
      tone: player.fatigue > 70 || player.injuryStatus !== "HEALTHY" ? "warning" : "positive",
    },
    {
      description: player.captainFlag
        ? "Captain-Signal verstaerkt Fuehrungswirkung."
        : "Effekt basiert primar auf Rolle, Trait und Fit.",
      label: "Team Identity",
      tone: player.captainFlag ? "active" : "neutral",
    },
  ];
}

function toXFactorPlayer(player: TeamPlayerSummary): XFactorPlayer {
  const trait = topTrait(player);
  const score = scorePlayer(player);
  const abilityName = abilityNameForPlayer(player, trait.label);
  const conditions = buildConditions(player, score, trait.value);
  const status = activationStatus(conditions);
  const unitKey = unitKeyForPlayer(player);

  return {
    abilityName,
    activationStatus: status,
    conditions,
    effectDescription: effectDescriptionForPlayer(player, abilityName),
    fullName: player.fullName,
    id: player.id,
    impacts: buildImpacts(player, status),
    positionCode: player.positionCode,
    score,
    tier: xFactorTier(score),
    tone: toneForStatus(status),
    traitLabel: trait.label,
    traitValue: trait.value,
    unitKey,
    unitLabel: unitLabel(unitKey),
  };
}

function isXFactorCandidate(player: TeamPlayerSummary) {
  const trait = topTrait(player);
  const score = scorePlayer(player);

  return (
    player.status === "ACTIVE" &&
    (score >= X_FACTOR_THRESHOLD ||
      player.positionOverall >= 82 ||
      trait.value >= 84 ||
      (player.captainFlag && player.positionOverall >= 76))
  );
}

function sortXFactors(left: XFactorPlayer, right: XFactorPlayer) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (right.traitValue !== left.traitValue) {
    return right.traitValue - left.traitValue;
  }

  return left.fullName.localeCompare(right.fullName);
}

function buildUnit(key: XFactorUnitKey, label: string, players: XFactorPlayer[]): XFactorUnit {
  const score = average(players.map((player) => player.score));

  return {
    key,
    label,
    players,
    score,
    tone: score >= 82 ? "active" : score >= 74 ? "positive" : players.length > 0 ? "neutral" : "warning",
  };
}

export function buildXFactorState(team: TeamDetail | null): XFactorState {
  const emptyMessage =
    "X-Factors erscheinen, sobald aktive Star-Spieler mit OVR, Spotlight Ratings oder Captain-Signal vorhanden sind.";

  if (!team) {
    return {
      activeCount: 0,
      emptyMessage,
      limitedCount: 0,
      players: [],
      readyCount: 0,
      summary: "Kein Teamkontext vorhanden.",
      topPlayer: null,
      units: [],
    };
  }

  const players = team.players
    .filter(isXFactorCandidate)
    .map(toXFactorPlayer)
    .sort(sortXFactors);
  const units = [
    buildUnit("offense", "Offense", players.filter((player) => player.unitKey === "offense")),
    buildUnit("defense", "Defense", players.filter((player) => player.unitKey === "defense")),
    buildUnit(
      "special-teams",
      "Special Teams",
      players.filter((player) => player.unitKey === "special-teams"),
    ),
  ];
  const readyCount = players.filter((player) => player.activationStatus === "Ready").length;
  const limitedCount = players.filter((player) => player.activationStatus === "Limited").length;

  return {
    activeCount: players.length,
    emptyMessage,
    limitedCount,
    players,
    readyCount,
    summary:
      players.length > 0
        ? `${team.name}: ${readyCount} ready, ${limitedCount} limited, ${players.length} sichtbare X-Factor Profile.`
        : "Keine X-Factor Profile aus vorhandenen Teamdaten abgeleitet.",
    topPlayer: players[0] ?? null,
    units,
  };
}
