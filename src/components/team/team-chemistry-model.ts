import type { TeamDetail, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

export type TeamChemistryTone = "positive" | "warning" | "danger" | "neutral";

export type TeamChemistryPlayerSignal = {
  fullName: string;
  id: string;
  label: string;
  positionCode: string;
  value: string;
};

export type TeamChemistryInfluence = {
  description: string;
  label: string;
  tone: TeamChemistryTone;
  value: string;
};

export type TeamChemistryUnit = {
  availabilityScore: number;
  averageFit: number;
  averageMorale: number;
  influences: TeamChemistryInfluence[];
  key: "offense" | "defense" | "special-teams";
  label: string;
  leaders: TeamChemistryPlayerSignal[];
  playerCount: number;
  riskPlayers: TeamChemistryPlayerSignal[];
  score: number;
  tone: TeamChemistryTone;
};

export type TeamChemistryState = {
  emptyMessage: string;
  influences: TeamChemistryInfluence[];
  score: number;
  summary: string;
  teamMorale: number;
  tone: TeamChemistryTone;
  units: TeamChemistryUnit[];
};

const OFFENSE_POSITIONS = new Set(["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
const DEFENSE_POSITIONS = new Set(["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS"]);
const SPECIAL_TEAMS_POSITIONS = new Set(["K", "P", "LS"]);
const FATIGUE_RISK = 75;

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function average(values: number[], fallback = 0) {
  if (values.length === 0) {
    return fallback;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getChemistryTone(score: number): TeamChemistryTone {
  if (score >= 72) {
    return "positive";
  }

  if (score >= 55) {
    return "neutral";
  }

  if (score >= 40) {
    return "warning";
  }

  return "danger";
}

function unitKeyForPlayer(
  player: Pick<TeamPlayerSummary, "positionCode" | "secondaryPositionCode">,
): TeamChemistryUnit["key"] {
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

  if (OFFENSE_POSITIONS.has(player.positionCode)) {
    return "offense";
  }

  return "special-teams";
}

function activeTeamPlayers(team: TeamDetail) {
  return team.players.filter((player) => player.status === "ACTIVE");
}

function isRiskPlayer(player: Pick<TeamPlayerSummary, "fatigue" | "injuryStatus">) {
  return player.injuryStatus !== "HEALTHY" || player.fatigue >= FATIGUE_RISK;
}

function leaderLabel(player: TeamPlayerSummary) {
  if (player.captainFlag) {
    return "Captain";
  }

  if (player.morale >= 78) {
    return "High Morale";
  }

  return "Core Starter";
}

function riskLabel(player: TeamPlayerSummary) {
  if (player.injuryStatus !== "HEALTHY") {
    return player.injuryStatus;
  }

  return "High Fatigue";
}

function toPlayerSignal(player: TeamPlayerSummary, label: string, value: string) {
  return {
    fullName: player.fullName,
    id: player.id,
    label,
    positionCode: player.positionCode,
    value,
  };
}

function availabilityScore(players: TeamPlayerSummary[]) {
  if (players.length === 0) {
    return 0;
  }

  const risks = players.filter(isRiskPlayer).length;

  return clampScore(((players.length - risks) / players.length) * 100);
}

function buildUnit(
  key: TeamChemistryUnit["key"],
  label: string,
  players: TeamPlayerSummary[],
): TeamChemistryUnit {
  const averageMorale = average(players.map((player) => player.morale));
  const averageFit = average(
    players
      .map((player) => player.schemeFitScore)
      .filter((value): value is number => typeof value === "number"),
    55,
  );
  const availability = availabilityScore(players);
  const score = clampScore(averageMorale * 0.4 + averageFit * 0.35 + availability * 0.25);
  const leaders = players
    .filter(
      (player) =>
        player.captainFlag ||
        player.morale >= 78 ||
        (player.rosterStatus === "STARTER" && player.positionOverall >= 76),
    )
    .sort((left, right) => {
      if (Number(right.captainFlag) !== Number(left.captainFlag)) {
        return Number(right.captainFlag) - Number(left.captainFlag);
      }

      if (right.morale !== left.morale) {
        return right.morale - left.morale;
      }

      return right.positionOverall - left.positionOverall;
    })
    .slice(0, 4)
    .map((player) => toPlayerSignal(player, leaderLabel(player), `Morale ${player.morale}`));
  const riskPlayers = players
    .filter(isRiskPlayer)
    .sort((left, right) => {
      const injuryDiff = Number(right.injuryStatus !== "HEALTHY") - Number(left.injuryStatus !== "HEALTHY");

      if (injuryDiff !== 0) {
        return injuryDiff;
      }

      return right.fatigue - left.fatigue;
    })
    .slice(0, 4)
    .map((player) =>
      toPlayerSignal(
        player,
        riskLabel(player),
        player.injuryStatus !== "HEALTHY" ? player.injuryStatus : `Fatigue ${player.fatigue}`,
      ),
    );

  return {
    availabilityScore: availability,
    averageFit,
    averageMorale,
    influences: [
      {
        description: "Durchschnittliche Stimmung der aktiven Unit-Spieler.",
        label: "Morale",
        tone: getChemistryTone(averageMorale),
        value: String(averageMorale),
      },
      {
        description: "Durchschnittlicher Scheme Fit, fehlende Werte fallen auf 55 zurueck.",
        label: "Scheme Fit",
        tone: getChemistryTone(averageFit),
        value: String(averageFit),
      },
      {
        description: "Anteil verfuegbarer Spieler ohne Injury- oder Fatigue-Risiko.",
        label: "Availability",
        tone: getChemistryTone(availability),
        value: `${availability}%`,
      },
    ],
    key,
    label,
    leaders,
    playerCount: players.length,
    riskPlayers,
    score,
    tone: getChemistryTone(score),
  };
}

export function buildTeamChemistryState(team: TeamDetail | null): TeamChemistryState {
  const emptyMessage = "Chemistry erscheint, sobald aktive Teamspieler vorhanden sind.";

  if (!team) {
    return {
      emptyMessage,
      influences: [],
      score: 0,
      summary: "Kein Teamkontext vorhanden.",
      teamMorale: 0,
      tone: "neutral",
      units: [],
    };
  }

  const players = activeTeamPlayers(team);

  if (players.length === 0) {
    return {
      emptyMessage,
      influences: [],
      score: 0,
      summary: "Keine aktiven Spieler fuer Chemistry vorhanden.",
      teamMorale: clampScore(team.morale),
      tone: "neutral",
      units: [],
    };
  }

  const offense = buildUnit(
    "offense",
    "Offense",
    players.filter((player) => unitKeyForPlayer(player) === "offense"),
  );
  const defense = buildUnit(
    "defense",
    "Defense",
    players.filter((player) => unitKeyForPlayer(player) === "defense"),
  );
  const specialTeams = buildUnit(
    "special-teams",
    "Special Teams",
    players.filter((player) => unitKeyForPlayer(player) === "special-teams"),
  );
  const units = [offense, defense, specialTeams];
  const teamMorale = clampScore(team.morale);
  const score = clampScore(
    average([offense.score, defense.score, specialTeams.score].filter((value) => value > 0)) *
      0.72 +
      teamMorale * 0.28,
  );
  const riskCount = players.filter(isRiskPlayer).length;
  const captainCount = players.filter((player) => player.captainFlag).length;
  const lowFitUnits = units.filter((unit) => unit.averageFit < 55).length;

  return {
    emptyMessage,
    influences: [
      {
        description: "Teamweite Morale aus dem aktuellen Teamstand.",
        label: "Team Morale",
        tone: getChemistryTone(teamMorale),
        value: String(teamMorale),
      },
      {
        description: "Captains und High-Morale Spieler stabilisieren die Unit-Wahrnehmung.",
        label: "Leadership",
        tone: captainCount > 0 ? "positive" : "neutral",
        value: String(captainCount),
      },
      {
        description: "Fatigue oder Verletzungen koennen Zusammenhalt und Vorbereitung stoeren.",
        label: "Risk Signals",
        tone: riskCount > 0 ? "warning" : "positive",
        value: String(riskCount),
      },
      {
        description: "Units mit niedrigem Scheme Fit brauchen Beobachtung.",
        label: "Low Fit Units",
        tone: lowFitUnits > 0 ? "warning" : "positive",
        value: String(lowFitUnits),
      },
    ],
    score,
    summary: `${team.name}: ${score}/100 Chemistry aus Morale, Unit Fit und Availability.`,
    teamMorale,
    tone: getChemistryTone(score),
    units,
  };
}
