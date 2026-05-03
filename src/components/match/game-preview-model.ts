import type { DashboardWeekState } from "@/components/dashboard/dashboard-model";
import type { LineupReadinessState } from "@/components/team/depth-chart-model";
import type { SeasonOverview } from "@/modules/seasons/domain/season.types";
import type { TeamDetail } from "@/modules/teams/domain/team.types";

import { buildGamePreparationView, type GamePreparationMatch } from "./game-preparation-model";
import {
  findLatestLineupDecision,
  isNegativeLineupDecision,
  parseLineupDecisionEvent,
} from "./lineup-outcome-model";

type PreviewTone = "default" | "positive" | "warning" | "danger";

export type GamePreviewTeam = GamePreparationMatch["homeTeam"] & {
  id: string;
};

export type GamePreviewMatch = GamePreparationMatch & {
  id: string;
  kind: string;
  scheduledAt: Date;
  stadiumName: string | null;
  week: number;
  homeTeam: GamePreviewTeam;
  awayTeam: GamePreviewTeam;
};

export type GamePreviewTeamCard = {
  id: string;
  abbreviation: string;
  isManagerTeam: boolean;
  location: "Home" | "Away";
  morale: number;
  name: string;
  overallRating: number;
  record: string;
  schemes: GamePreviewTeam["schemes"];
};

export type GamePreviewRatingComparison = {
  label: string;
  home: string;
  away: string;
  edge: "home" | "away" | "even";
  description: string;
};

export type GamePreviewSignal = {
  label: string;
  value: string;
  description: string;
  tone: PreviewTone;
  source: "Derived" | "UI-Fixture";
};

export type GamePreviewReadinessItem = {
  label: string;
  value: string;
  description: string;
  tone: PreviewTone;
};

export type GamePreviewState = {
  canStartMatch: boolean;
  contextLine: string;
  gameplanLocked: boolean;
  homeTeam: GamePreviewTeamCard;
  awayTeam: GamePreviewTeamCard;
  managerTeam: GamePreviewTeamCard | null;
  opponentTeam: GamePreviewTeamCard | null;
  matchupSummary: string;
  primaryActionLabel: string;
  ratingComparisons: GamePreviewRatingComparison[];
  readinessItems: GamePreviewReadinessItem[];
  riskSignals: GamePreviewSignal[];
  startBlockedReason: string | null;
  startWarning: string | null;
  strengthSignals: GamePreviewSignal[];
};

function recordForTeam(season: SeasonOverview | null, teamId: string) {
  return season?.standings.find((standing) => standing.teamId === teamId)?.record ?? "0-0";
}

function toTeamCard(
  team: GamePreviewTeam,
  location: GamePreviewTeamCard["location"],
  season: SeasonOverview | null,
): GamePreviewTeamCard {
  return {
    id: team.id,
    abbreviation: team.abbreviation,
    isManagerTeam: team.managerControlled,
    location,
    morale: team.morale,
    name: team.name,
    overallRating: team.overallRating,
    record: recordForTeam(season, team.id),
    schemes: team.schemes,
  };
}

function edgeForNumbers(home: number, away: number): GamePreviewRatingComparison["edge"] {
  if (home >= away + 2) {
    return "home";
  }

  if (away >= home + 2) {
    return "away";
  }

  return "even";
}

function schemeName(team: GamePreviewTeam, key: keyof GamePreviewTeam["schemes"]) {
  return team.schemes[key]?.name ?? "Nicht gesetzt";
}

function displayState(value: string) {
  return value.replaceAll("_", " ");
}

function buildRatingComparisons(match: GamePreviewMatch): GamePreviewRatingComparison[] {
  return [
    {
      label: "Team OVR",
      home: String(match.homeTeam.overallRating),
      away: String(match.awayTeam.overallRating),
      edge: edgeForNumbers(match.homeTeam.overallRating, match.awayTeam.overallRating),
      description: "Gesamtrating aus dem aktuellen Teamstand.",
    },
    {
      label: "Morale",
      home: String(match.homeTeam.morale),
      away: String(match.awayTeam.morale),
      edge: edgeForNumbers(match.homeTeam.morale, match.awayTeam.morale),
      description: "Aktuelle Team-Morale vor dem Spiel.",
    },
    {
      label: "Offense",
      home: schemeName(match.homeTeam, "offense"),
      away: schemeName(match.awayTeam, "offense"),
      edge: "even",
      description: "Aktueller Offense-Scheme-Kontext.",
    },
    {
      label: "Defense",
      home: schemeName(match.homeTeam, "defense"),
      away: schemeName(match.awayTeam, "defense"),
      edge: "even",
      description: "Aktueller Defense-Scheme-Kontext.",
    },
  ];
}

function topNeed(team: TeamDetail | null) {
  return [...(team?.teamNeeds ?? [])].sort((left, right) => right.needScore - left.needScore)[0] ?? null;
}

function injuryCount(team: TeamDetail | null) {
  return (team?.players ?? []).filter(
    (player) => player.injuryStatus !== "HEALTHY" || Boolean(player.injuryName),
  ).length;
}

function latestLineupChangeSinceLastGame(
  teamDetail: TeamDetail | null,
  season: SeasonOverview | null,
) {
  if (!teamDetail) {
    return null;
  }

  const lastCompletedMatch = season?.matches
    .filter(
      (match) =>
        match.status === "COMPLETED" &&
        (match.homeTeamId === teamDetail.id || match.awayTeamId === teamDetail.id),
    )
    .sort((left, right) => right.scheduledAt.getTime() - left.scheduledAt.getTime())[0] ?? null;

  return findLatestLineupDecision(teamDetail, {
    after: lastCompletedMatch?.scheduledAt ?? null,
  });
}

function hasLineupDecisionForCurrentWeek(teamDetail: TeamDetail | null, season: SeasonOverview | null) {
  return latestLineupChangeSinceLastGame(teamDetail, season) != null;
}

function buildSignals({
  managerTeam,
  opponentTeam,
  readiness,
  season,
  teamDetail,
}: {
  managerTeam: GamePreviewTeam | null;
  opponentTeam: GamePreviewTeam | null;
  readiness: LineupReadinessState;
  season: SeasonOverview | null;
  teamDetail: TeamDetail | null;
}) {
  const strengthSignals: GamePreviewSignal[] = [];
  const riskSignals: GamePreviewSignal[] = [];
  const needs = topNeed(teamDetail);
  const injuries = injuryCount(teamDetail);
  const lineupChange = latestLineupChangeSinceLastGame(teamDetail, season);

  if (managerTeam && opponentTeam) {
    const ratingDelta = managerTeam.overallRating - opponentTeam.overallRating;
    const moraleDelta = managerTeam.morale - opponentTeam.morale;

    if (ratingDelta >= 5) {
      strengthSignals.push({
        label: "Rating Edge",
        value: `+${ratingDelta} OVR`,
        description: `${managerTeam.abbreviation} hat den klareren Gesamtwert.`,
        tone: "positive",
        source: "Derived",
      });
    } else if (ratingDelta <= -5) {
      riskSignals.push({
        label: "Rating Gap",
        value: `${ratingDelta} OVR`,
        description: `${opponentTeam.abbreviation} hat den Rating-Vorteil.`,
        tone: "warning",
        source: "Derived",
      });
    }

    if (moraleDelta >= 10) {
      strengthSignals.push({
        label: "Morale",
        value: `+${moraleDelta}`,
        description: "Die Team-Morale spricht fuer einen stabileren Start.",
        tone: "positive",
        source: "Derived",
      });
    } else if (moraleDelta <= -10) {
      riskSignals.push({
        label: "Morale Risk",
        value: String(moraleDelta),
        description: "Die Moral liegt sichtbar unter dem Gegner.",
        tone: "warning",
        source: "Derived",
      });
    }
  }

  if (readiness.status === "ready") {
    strengthSignals.push({
      label: "Aufstellung",
      value: "Bereit",
      description: readiness.summary,
      tone: "positive",
      source: "Derived",
    });
  } else if (readiness.status === "blocked" || readiness.status === "check") {
    riskSignals.push({
      label: readiness.status === "check" ? "Aufstellungsrisiko" : "Aufstellung",
      value:
        readiness.status === "check"
          ? `${readiness.autoFillPlayers.length} Ersatzspieler im Einsatz`
          : readiness.statusLabel,
      description: readiness.summary,
      tone: readiness.status === "blocked" ? "danger" : "warning",
      source: "Derived",
    });
  }

  if (lineupChange) {
    const decision = parseLineupDecisionEvent(lineupChange);
    const risky = isNegativeLineupDecision(lineupChange);
    const description = decision
      ? `Letzte Lineup-Entscheidung ${decision.positionCode} -> ${decision.evaluation}. ${decision.description}`
      : lineupChange.description ?? "Lineup wurde seit dem letzten Spiel angepasst.";
    const signal: GamePreviewSignal = {
      label: risky ? "Aufstellungsrisiko" : "Aufstellung angepasst",
      value: risky ? "Risiko offen" : "Seit letztem Spiel",
      description,
      tone: risky ? "warning" : "positive",
      source: "Derived",
    };

    if (risky) {
      riskSignals.push(signal);
    } else {
      strengthSignals.push(signal);
    }
  }

  if (needs && needs.needScore >= 6) {
    riskSignals.push({
      label: "Team Need",
      value: `${needs.positionCode} ${needs.needScore}`,
      description: `${needs.positionName} bleibt vor dem Spiel der groesste Kaderbedarf.`,
      tone: needs.needScore >= 8 ? "danger" : "warning",
      source: "Derived",
    });
  }

  if (injuries > 0) {
    riskSignals.push({
      label: "Injuries",
      value: String(injuries),
      description: "Verletzte oder eingeschraenkte Spieler sind im Teamkontext sichtbar.",
      tone: "warning",
      source: "Derived",
    });
  }

  if (strengthSignals.length === 0) {
    strengthSignals.push({
      label: "Strengths",
      value: "Even",
      description: "Kein klarer Vorteil sichtbar; das Spiel wirkt datenbasiert ausgeglichen.",
      tone: "default",
      source: "UI-Fixture",
    });
  }

  if (riskSignals.length === 0) {
    riskSignals.push({
      label: "Risks",
      value: "Clean",
      description: "Keine harten Risiken aus Readiness, Needs oder Injury-Daten abgeleitet.",
      tone: "positive",
      source: "UI-Fixture",
    });
  }

  return { strengthSignals, riskSignals };
}

function buildReadinessItems({
  match,
  readiness,
  teamDetail,
  weekState,
}: {
  match: GamePreviewMatch;
  readiness: LineupReadinessState;
  teamDetail: TeamDetail | null;
  weekState: DashboardWeekState;
}): GamePreviewReadinessItem[] {
  const injuries = injuryCount(teamDetail);

  return [
    {
      label: "Week State",
      value: displayState(weekState),
      description:
        weekState === "READY"
          ? "Der Week Loop gibt den Match-Start frei."
          : "Das Spiel bleibt gesperrt, bis der Week Loop READY ist.",
      tone: weekState === "READY" ? "positive" : "warning",
    },
    {
      label: "Match Status",
      value: match.status.replaceAll("_", " "),
      description:
        match.status === "SCHEDULED"
          ? "Das Match wartet auf den Start."
          : "Das Match ist nicht mehr im Pre-Game-Status.",
      tone: match.status === "SCHEDULED" ? "positive" : "warning",
    },
    {
      label: "Depth Chart",
      value:
        readiness.status === "check"
          ? "Warning"
          : readiness.statusLabel,
      description: readiness.summary,
      tone:
        readiness.status === "ready"
          ? "positive"
          : readiness.status === "blocked"
            ? "danger"
            : "warning",
    },
    {
      label: "Injuries",
      value: String(injuries),
      description:
        injuries > 0
          ? "Mindestens ein Spieler hat einen Injury-Hinweis."
          : "Keine Injury-Hinweise im Manager-Team geladen.",
      tone: injuries > 0 ? "warning" : "positive",
    },
  ];
}

export function buildGamePreviewState({
  match,
  readiness,
  season,
  teamDetail,
  weekState,
}: {
  match: GamePreviewMatch;
  readiness: LineupReadinessState;
  season: SeasonOverview | null;
  teamDetail: TeamDetail | null;
  weekState: DashboardWeekState;
}): GamePreviewState {
  const preparation = buildGamePreparationView(match);
  const homeTeam = toTeamCard(match.homeTeam, "Home", season);
  const awayTeam = toTeamCard(match.awayTeam, "Away", season);
  const managerTeam = preparation?.managerTeam
    ? toTeamCard(
        preparation.managerTeam,
        preparation.managerTeam.id === match.homeTeam.id ? "Home" : "Away",
        season,
      )
    : null;
  const opponentTeam = preparation?.opponent
    ? toTeamCard(
        preparation.opponent,
        preparation.opponent.id === match.homeTeam.id ? "Home" : "Away",
        season,
      )
    : null;
  const lineupDecisionMade = hasLineupDecisionForCurrentWeek(teamDetail, season);
  const coreLineupReady = readiness.conflicts.length === 0 && readiness.coreEmptyStarterPositions.length === 0;
  const canStartMatch =
    weekState === "READY" &&
    match.status === "SCHEDULED" &&
    coreLineupReady;
  const startBlockedReason =
    canStartMatch
      ? null
      : weekState !== "READY"
        ? `Week State ist ${weekState}; zuerst im Dashboard/Week Loop vorbereiten.`
        : match.status !== "SCHEDULED"
          ? "Das Match kann nur im Status SCHEDULED gestartet werden."
        : readiness.conflicts.length > 0
          ? `${readiness.conflicts.length} Depth-Chart-Konflikt(e) blockieren den Spielstart.`
        : readiness.coreEmptyStarterPositions.length > 0
          ? `${readiness.coreEmptyStarterPositions.length} wichtige Starter fehlen. Setze mindestens QB, RB und WR.`
          : null;
  const startWarning =
    canStartMatch && readiness.secondaryEmptyStarterPositions.length > 0
      ? `Dein Team ist nicht optimal aufgestellt. ${readiness.secondaryEmptyStarterPositions.length} Ersatzspieler muessen einspringen.`
      : canStartMatch && !lineupDecisionMade
        ? "Du hast seit dem letzten Spiel nichts an der Aufstellung geaendert. Du kannst trotzdem starten."
        : null;
  const { strengthSignals, riskSignals } = buildSignals({
    managerTeam: preparation?.managerTeam ?? null,
    opponentTeam: preparation?.opponent ?? null,
    readiness,
    season,
    teamDetail,
  });

  return {
    canStartMatch,
    contextLine: `${season?.year ?? "Season"} · Woche ${match.week} · ${displayState(match.kind)}`,
    gameplanLocked: !preparation?.canEditGameplan,
    homeTeam,
    awayTeam,
    managerTeam,
    opponentTeam,
    matchupSummary:
      preparation?.expectation.summary ??
      "Dieses Match enthaelt kein eindeutig vom Manager gesteuertes Team.",
    primaryActionLabel: canStartMatch ? "Match starten" : "Depth Chart waehlen",
    ratingComparisons: buildRatingComparisons(match),
    readinessItems: buildReadinessItems({
      match,
      readiness,
      teamDetail,
      weekState,
    }),
    riskSignals,
    startBlockedReason,
    startWarning,
    strengthSignals,
  };
}
