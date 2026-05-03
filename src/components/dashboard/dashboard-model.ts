import type { SeasonMatchSummary, SeasonOverview } from "@/modules/seasons/domain/season.types";
import type { TeamDetail } from "@/modules/teams/domain/team.types";
import { buildPlayerValue } from "@/components/player/player-value-model";
import { classifyMatchExpectation } from "@/modules/seasons/domain/weak-team-goals";
import {
  getGameFlowHref,
  getGameLiveHref,
  getGameReportHref,
} from "@/components/match/game-flow-model";
import { buildLineupDashboardRetrospective } from "@/components/match/lineup-outcome-model";

export type DashboardActionTone = "default" | "positive" | "warning";

export type DashboardAction = {
  title: string;
  message: string;
  href: string | null;
  label: string;
  tone: DashboardActionTone;
};

export type DashboardStatusTone = "neutral" | "success" | "warning" | "danger" | "active";

export type DashboardWeekState = "PRE_WEEK" | "READY" | "GAME_RUNNING" | "POST_GAME";

export type DashboardQuickAction = {
  title: string;
  description: string;
  href: string | null;
  label: string;
  tone: "primary" | "default" | "success" | "warning";
  disabledReason?: string;
};

export type DashboardDecisionFeedbackItem = {
  context: string;
  impact: "positive" | "neutral" | "negative";
  reason: string;
  source: "Action" | "Derived" | "UI-Fixture";
  title: string;
};

export type WeekLoopDashboardAction = {
  description: string;
  href: string | null;
  kind: "prepare" | "game-setup" | "game-live" | "advance-week";
  label: string;
  title: string;
};

export type WeekLoopFeedbackItem = {
  label: string;
  message: string;
};

export type RebuildMilestone = {
  title: string;
  description: string;
  status: "achieved" | "in-progress" | "locked";
  value: string;
};

export type RebuildProgressState = {
  title: string;
  summary: string;
  metrics: Array<{
    label: string;
    value: string;
    description: string;
  }>;
  milestones: RebuildMilestone[];
  emptyMessage: string;
};

export type TeamContextStreak = {
  label: string;
  value: string;
  description: string;
  tone: "default" | "positive" | "warning";
};

export type TeamContextState = {
  title: string;
  summary: string;
  streaks: TeamContextStreak[];
  metrics: Array<{
    label: string;
    value: string;
    description: string;
  }>;
  stretch: {
    label: "Tough Stretch" | "Winnable Stretch" | "Even Stretch" | "Unknown Stretch";
    value: string;
    description: string;
    opponentRatings: number[];
  };
  postGameLine: string | null;
  emptyMessage: string;
};

export type TeamDevelopmentIndicator = {
  direction: "up" | "down" | "neutral";
  label: string;
  description: string;
};

export type TeamDevelopmentState = {
  title: string;
  summary: string;
  indicators: TeamDevelopmentIndicator[];
  emptyMessage: string;
};

export type TeamProfileTrait = {
  label: "starke Defense" | "starke Offense" | "passorientiert" | "laufstark" | "ausgeglichen" | "unausgeglichen";
  description: string;
  tone: "positive" | "neutral" | "warning";
};

export type TeamProfileState = {
  title: string;
  summary: string;
  traits: TeamProfileTrait[];
  emptyMessage: string;
};

type DashboardActionInput = {
  weekState?: DashboardWeekState;
  saveGameId: string;
  team: TeamDetail | null;
  season: SeasonOverview | null;
  nextMatch: SeasonMatchSummary | null;
};

type DashboardQuickActionsInput = {
  freeAgencyHref: string | null;
  matchHref: string | null;
  nextMatch: SeasonMatchSummary | null;
  seasonHref: string | null;
  team: TeamDetail | null;
  teamHref: string | null;
  weekState: DashboardWeekState;
};

type DashboardDecisionFeedbackInput = {
  action: DashboardAction;
  decisionEvents?: TeamDetail["recentDecisionEvents"];
  season?: SeasonOverview | null;
  team: TeamDetail | null;
  weekState: DashboardWeekState;
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDecimal(value: number) {
  return Number(value.toFixed(1)).toString();
}

function directionLabel(direction: TeamDevelopmentIndicator["direction"]) {
  if (direction === "up") {
    return "verbessert";
  }

  if (direction === "down") {
    return "verschlechtert";
  }

  return "stabil";
}

function parseSlotMove(description: string | null) {
  const match = description?.match(/#(\d+)\s*->\s*#(\d+)/);

  if (!match) {
    return null;
  }

  return {
    from: Number(match[1]),
    to: Number(match[2]),
  };
}

function decisionEventImpact(
  event: TeamDetail["recentDecisionEvents"][number],
): DashboardDecisionFeedbackItem["impact"] {
  if (event.type === "SIGNING") {
    return "positive";
  }

  if (event.type === "RELEASE") {
    return event.description?.match(/Cap Savings:\s*[1-9]/) ? "positive" : "neutral";
  }

  if (event.type === "DEPTH_CHART") {
    const slotMove = parseSlotMove(event.description);

    if (slotMove) {
      return slotMove.to < slotMove.from ? "positive" : "neutral";
    }

    if (event.description?.includes("STARTER #1")) {
      return "positive";
    }

    if (
      event.description?.includes("INACTIVE") ||
      event.description?.includes("INJURED_RESERVE")
    ) {
      return "negative";
    }
  }

  return "neutral";
}

function decisionEventContext(event: TeamDetail["recentDecisionEvents"][number]) {
  const playerLabel = event.playerName ? `${event.playerName} · ` : "";

  return `${playerLabel}${event.description ?? "Aktion gespeichert."}`;
}

function decisionEventReason(event: TeamDetail["recentDecisionEvents"][number]) {
  if (event.type === "DEPTH_CHART") {
    const evaluation = event.description?.match(/Bewertung:\s*([^·.]+)/)?.[1]?.trim();

    if (evaluation) {
      return evaluation;
    }

    return event.title === "Rosterrolle angepasst"
      ? "Lineup-Rolle gespeichert."
      : "Lineup-Reihenfolge gespeichert.";
  }

  return event.title;
}

function ordinal(value: number) {
  const mod100 = value % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  if (value % 10 === 1) {
    return `${value}st`;
  }

  if (value % 10 === 2) {
    return `${value}nd`;
  }

  if (value % 10 === 3) {
    return `${value}rd`;
  }

  return `${value}th`;
}

function getManagerCompletedMatches(
  season: SeasonOverview | null,
  managerTeamId: string | null | undefined,
) {
  if (!season || !managerTeamId) {
    return [];
  }

  return season.matches
    .filter(
      (match) =>
        match.status === "COMPLETED" &&
        match.homeScore != null &&
        match.awayScore != null &&
        (match.homeTeamId === managerTeamId || match.awayTeamId === managerTeamId),
    )
    .sort((left, right) => {
      if (left.week !== right.week) {
        return left.week - right.week;
      }

      return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
    })
    .map((match) => {
      const isHome = match.homeTeamId === managerTeamId;
      const pointsFor = isHome ? match.homeScore! : match.awayScore!;
      const pointsAgainst = isHome ? match.awayScore! : match.homeScore!;

      return {
        ...match,
        margin: pointsFor - pointsAgainst,
        pointsAgainst,
        pointsFor,
      };
    });
}

function countTrailing<T>(items: T[], predicate: (item: T) => boolean) {
  let count = 0;

  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!predicate(items[index]!)) {
      break;
    }

    count += 1;
  }

  return count;
}

function getOpponentId(match: SeasonMatchSummary, teamId: string) {
  return match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId;
}

function getOpponentName(match: SeasonMatchSummary, teamId: string) {
  return match.homeTeamId === teamId ? match.awayTeamName : match.homeTeamName;
}

function getUpcomingManagerMatches(season: SeasonOverview | null, teamId: string | null | undefined) {
  if (!season || !teamId) {
    return [];
  }

  return season.matches
    .filter(
      (match) =>
        match.status === "SCHEDULED" &&
        match.week >= season.week &&
        (match.homeTeamId === teamId || match.awayTeamId === teamId),
    )
    .sort((left, right) => {
      if (left.week !== right.week) {
        return left.week - right.week;
      }

      return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
    });
}

function teamRatingById(season: SeasonOverview | null) {
  return new Map((season?.standings ?? []).map((standing) => [standing.teamId, standing.overallRating]));
}

function buildResultStreak(completedMatches: ReturnType<typeof getManagerCompletedMatches>): TeamContextStreak {
  const last = completedMatches.at(-1);

  if (!last) {
    return {
      label: "Result Streak",
      value: "Noch offen",
      description: "Erste Streak entsteht nach dem ersten abgeschlossenen Spiel.",
      tone: "default",
    };
  }

  if (last.margin > 0) {
    const count = countTrailing(completedMatches, (match) => match.margin > 0);

    return {
      label: "Win Streak",
      value: `${count} W`,
      description: count >= 2 ? `${count} Siege in Folge.` : "Letztes Spiel gewonnen.",
      tone: "positive",
    };
  }

  if (last.margin < 0) {
    const count = countTrailing(completedMatches, (match) => match.margin < 0);

    return {
      label: "Losing Streak",
      value: `${count} L`,
      description: count >= 2 ? `${count} Niederlagen in Folge.` : "Letztes Spiel verloren.",
      tone: count >= 2 ? "warning" : "default",
    };
  }

  return {
    label: "Result Streak",
    value: "1 T",
    description: "Letztes Spiel endete unentschieden.",
    tone: "default",
  };
}

export function buildScheduleStretchState(input: {
  season: SeasonOverview | null;
  teamId: string | null | undefined;
  teamRating: number | null | undefined;
}): TeamContextState["stretch"] {
  const upcoming = getUpcomingManagerMatches(input.season, input.teamId).slice(0, 3);
  const ratings = teamRatingById(input.season);
  const opponentRatings = upcoming
    .map((match) => ratings.get(getOpponentId(match, input.teamId!)))
    .filter((rating): rating is number => typeof rating === "number");

  if (!input.teamId || typeof input.teamRating !== "number" || upcoming.length === 0 || opponentRatings.length === 0) {
    return {
      label: "Unknown Stretch" as const,
      value: "n/a",
      description: "Naechste Gegner-Ratings sind noch nicht verfuegbar.",
      opponentRatings,
    };
  }

  const categories = upcoming
    .map((match) => ratings.get(getOpponentId(match, input.teamId!)))
    .filter((rating): rating is number => typeof rating === "number")
    .map((opponentRating) =>
      classifyMatchExpectation({
        opponentRating,
        teamRating: input.teamRating,
      }).category,
    );
  const averageRating = average(opponentRatings);
  const toughCount = categories.filter((category) => category === "underdog" || category === "heavy underdog").length;
  const favoriteCount = categories.filter((category) => category === "favorite").length;
  const label: TeamContextState["stretch"]["label"] =
    toughCount >= 2 || averageRating >= input.teamRating + 4
      ? "Tough Stretch"
      : favoriteCount >= 2 || averageRating <= input.teamRating - 4
        ? "Winnable Stretch"
        : "Even Stretch";
  const opponentNames = upcoming
    .slice(0, opponentRatings.length)
    .map((match) => getOpponentName(match, input.teamId!))
    .join(", ");

  return {
    label,
    value: `${formatDecimal(averageRating)} avg OVR`,
    description: `${upcoming.length} kommende Spiel(e): ${opponentNames}.`,
    opponentRatings,
  };
}

function buildStretch(input: {
  season: SeasonOverview | null;
  team: TeamDetail | null;
}) {
  return buildScheduleStretchState({
    season: input.season,
    teamId: input.team?.id,
    teamRating: input.team?.overallRating,
  });
}

export function buildTeamContextState(input: {
  season: SeasonOverview | null;
  team: TeamDetail | null;
}): TeamContextState {
  const emptyMessage =
    "Team-Kontext erscheint, sobald Team, Saison und Schedule-Daten verfuegbar sind.";

  if (!input.team || !input.season) {
    return {
      title: "Form & Schedule",
      summary: "Noch nicht genug Daten fuer Form und Schedule.",
      streaks: [],
      metrics: [],
      stretch: {
        label: "Unknown Stretch",
        value: "n/a",
        description: "Saison oder Team fehlt.",
        opponentRatings: [],
      },
      postGameLine: null,
      emptyMessage,
    };
  }

  const completedMatches = getManagerCompletedMatches(input.season, input.team.id);
  const recentMatches = completedMatches.slice(-5);
  const previousMatches = completedMatches.slice(-10, -5);
  const last = completedMatches.at(-1) ?? null;
  const resultStreak = buildResultStreak(completedMatches);
  const closeGameStreak = countTrailing(completedMatches, (match) => Math.abs(match.margin) <= 8);
  const blowoutLossStreak = countTrailing(completedMatches, (match) => match.margin <= -21);
  const blowoutAvoidanceStreak = countTrailing(completedMatches, (match) => match.margin > -21);
  const recentPpg = average(recentMatches.map((match) => match.pointsFor));
  const previousPpg = average(previousMatches.map((match) => match.pointsFor));
  const avgMargin = average(recentMatches.map((match) => match.margin));
  const ppgTrend =
    previousMatches.length >= 3
      ? recentPpg >= previousPpg + 2
        ? "up"
        : recentPpg <= previousPpg - 2
          ? "down"
          : "flat"
      : "unknown";
  const objectiveLikeSignals = recentMatches.filter(
    (match) =>
      Math.abs(match.margin) <= 8 ||
      (input.team!.overallRating <= 72 && match.margin > -21),
  ).length;
  const streaks: TeamContextStreak[] = [
    resultStreak,
    {
      label: "Close Game Streak",
      value: closeGameStreak > 0 ? String(closeGameStreak) : "0",
      description:
        closeGameStreak >= 2
          ? `${closeGameStreak} enge Spiele in Folge.`
          : closeGameStreak === 1
            ? "Letztes Spiel blieb innerhalb eines Scores."
            : "Aktuell keine Close-Game-Serie.",
      tone: closeGameStreak >= 2 ? "positive" : "default",
    },
    {
      label: "Blowout Avoidance",
      value: blowoutAvoidanceStreak > 0 ? String(blowoutAvoidanceStreak) : "0",
      description:
        blowoutLossStreak > 0
          ? `${blowoutLossStreak} deutliche Niederlage(n) in Folge.`
          : blowoutAvoidanceStreak >= 2
            ? `${blowoutAvoidanceStreak} Spiele ohne Blowout-Niederlage.`
            : "Noch keine stabile Vermeidungsserie.",
      tone: blowoutLossStreak > 0 ? "warning" : blowoutAvoidanceStreak >= 2 ? "positive" : "default",
    },
  ];
  const summary =
    completedMatches.length > 0
      ? `${input.team.abbreviation} Form: ${resultStreak.description} Letzte ${recentMatches.length}: ${formatDecimal(recentPpg)} PPG, ${formatDecimal(avgMargin)} Margin.`
      : "Noch keine abgeschlossenen Spiele fuer Streaks und Form.";

  return {
    title: "Form & Schedule",
    summary,
    streaks,
    metrics: [
      {
        label: "Recent PPG",
        value: recentMatches.length > 0 ? formatDecimal(recentPpg) : "n/a",
        description:
          ppgTrend === "up"
            ? "Punkte-Trend steigt gegenueber dem vorherigen Fenster."
            : ppgTrend === "down"
              ? "Punkte-Trend faellt gegenueber dem vorherigen Fenster."
              : ppgTrend === "flat"
                ? "Punkte-Trend ist stabil."
                : "Trend braucht mindestens zwei Vergleichsfenster.",
      },
      {
        label: "Recent Margin",
        value: recentMatches.length > 0 ? formatDecimal(avgMargin) : "n/a",
        description: "Durchschnittliche Punktedifferenz der letzten bis zu 5 Spiele.",
      },
      {
        label: "AP33/AP36 Signals",
        value: String(objectiveLikeSignals),
        description: "Close Games, Blowout-Vermeidung und Underdog-Erfolge verstaerken den Kontext.",
      },
    ],
    stretch: buildStretch(input),
    postGameLine: last ? buildPostGameContextLine({
      season: input.season,
      teamId: input.team.id,
      matchId: last.id,
      objectiveRebuildSignal: false,
    }) : null,
    emptyMessage,
  };
}

export function buildPostGameContextLine(input: {
  season: SeasonOverview | null;
  teamId: string | null | undefined;
  matchId: string | null | undefined;
  objectiveRebuildSignal?: boolean;
}) {
  if (!input.season || !input.teamId || !input.matchId) {
    return null;
  }

  const completedMatches = getManagerCompletedMatches(input.season, input.teamId);
  const matchIndex = completedMatches.findIndex((match) => match.id === input.matchId);

  if (matchIndex < 0) {
    return null;
  }

  const timeline = completedMatches.slice(0, matchIndex + 1);
  const current = timeline.at(-1);

  if (!current) {
    return null;
  }

  const closeGameStreak = countTrailing(timeline, (match) => Math.abs(match.margin) <= 8);
  const winStreak = countTrailing(timeline, (match) => match.margin > 0);
  const losingBefore = countTrailing(timeline.slice(0, -1), (match) => match.margin < 0);
  const blowoutAvoidanceStreak = countTrailing(timeline, (match) => match.margin > -21);
  const objectiveNote = input.objectiveRebuildSignal ? " Objectives verstaerken den positiven Kontext." : "";

  if (closeGameStreak >= 2) {
    return `${ordinal(closeGameStreak)} close game in a row.${objectiveNote}`;
  }

  if (current.margin > 0 && losingBefore >= 2) {
    return `Ending ${losingBefore}-game losing streak.${objectiveNote}`;
  }

  if (winStreak >= 2) {
    return `${ordinal(winStreak)} win in a row.${objectiveNote}`;
  }

  if (blowoutAvoidanceStreak >= 3) {
    return `${ordinal(blowoutAvoidanceStreak)} game without a blowout loss.${objectiveNote}`;
  }

  if (input.objectiveRebuildSignal) {
    return `Objectives add a positive rebuild signal.`;
  }

  return null;
}

function positionArea(positionCode: string) {
  if (["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"].includes(positionCode)) {
    return "Offense";
  }

  if (["CB", "FS", "SS"].includes(positionCode)) {
    return "Secondary";
  }

  if (["LE", "RE", "DT", "LOLB", "MLB", "ROLB"].includes(positionCode)) {
    return "Front Seven";
  }

  return "Special Teams";
}

const OFFENSE_PROFILE_POSITIONS = new Set(["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
const DEFENSE_PROFILE_POSITIONS = new Set(["LE", "RE", "DT", "LOLB", "MLB", "ROLB", "CB", "FS", "SS"]);
const PASS_PROFILE_POSITIONS = new Set(["QB", "WR", "TE"]);
const RUN_PROFILE_POSITIONS = new Set(["RB", "FB", "LT", "LG", "C", "RG", "RT"]);

function averageForPositions(team: TeamDetail, positions: Set<string>) {
  const players = (team.players ?? []).filter(
    (player) =>
      (player.status === "ACTIVE" || team.players.every((candidate) => candidate.status !== "ACTIVE")) &&
      positions.has(player.positionCode),
  );

  return players.length > 0 ? average(players.map((player) => player.positionOverall)) : null;
}

function hasPassOrientedScheme(team: TeamDetail) {
  const scheme = (team.schemes.offense ?? "").toLowerCase();

  return ["pass", "west", "spread", "air"].some((signal) => scheme.includes(signal));
}

function addProfileTrait(
  traits: TeamProfileTrait[],
  trait: TeamProfileTrait,
) {
  if (traits.length >= 2 || traits.some((existing) => existing.label === trait.label)) {
    return;
  }

  traits.push(trait);
}

export function buildTeamProfileState(team: TeamDetail | null): TeamProfileState {
  const emptyMessage = "Team-Profil erscheint, sobald ein Manager-Team geladen ist.";

  if (!team) {
    return {
      title: "Team Profile",
      summary: "Noch kein Team-Profil verfuegbar.",
      traits: [],
      emptyMessage,
    };
  }

  const traits: TeamProfileTrait[] = [];
  const offenseAverage = averageForPositions(team, OFFENSE_PROFILE_POSITIONS);
  const defenseAverage = averageForPositions(team, DEFENSE_PROFILE_POSITIONS);
  const passAverage = averageForPositions(team, PASS_PROFILE_POSITIONS);
  const runAverage = averageForPositions(team, RUN_PROFILE_POSITIONS);
  const topNeed = [...(team.teamNeeds ?? [])].sort((left, right) => right.needScore - left.needScore)[0] ?? null;
  const hasEnoughRosterShape = (team.players ?? []).length >= 3;

  if (offenseAverage != null && defenseAverage != null) {
    const sideGap = offenseAverage - defenseAverage;

    if (sideGap >= 5) {
      addProfileTrait(traits, {
        label: "starke Offense",
        description: "Die offensiven Kernpositionen liegen sichtbar ueber der Defense.",
        tone: "positive",
      });
    } else if (sideGap <= -5) {
      addProfileTrait(traits, {
        label: "starke Defense",
        description: "Die defensiven Kernpositionen tragen das Teamprofil.",
        tone: "positive",
      });
    }

    if (Math.abs(sideGap) >= 8) {
      addProfileTrait(traits, {
        label: "unausgeglichen",
        description: "Eine Teamseite ist deutlich weiter als die andere.",
        tone: "warning",
      });
    }
  }

  if (
    traits.length < 2 &&
    (hasPassOrientedScheme(team) || (passAverage != null && runAverage != null && passAverage - runAverage >= 3))
  ) {
    addProfileTrait(traits, {
      label: "passorientiert",
      description: "Scheme oder Skill-Positionen sprechen fuer einen klaren Pass-Fokus.",
      tone: "neutral",
    });
  }

  if (traits.length < 2 && passAverage != null && runAverage != null && runAverage - passAverage >= 4) {
    addProfileTrait(traits, {
      label: "laufstark",
      description: "Backfield und Line wirken aktuell staerker als der Pass-Kern.",
      tone: "neutral",
    });
  }

  if (traits.length < 2 && topNeed && topNeed.needScore >= 8) {
    addProfileTrait(traits, {
      label: "unausgeglichen",
      description: `${topNeed.positionName} ist ein klarer Need und praegt das Teambild.`,
      tone: "warning",
    });
  }

  if (traits.length === 0) {
    addProfileTrait(traits, {
      label: "ausgeglichen",
      description: hasEnoughRosterShape
        ? "Keine Teamseite sticht extrem heraus; das Profil wirkt aktuell breit verteilt."
        : "Mit kleinem Datensatz wirkt das Team vorerst neutral eingeordnet.",
      tone: "neutral",
    });
  }

  return {
    title: "Team Profile",
    summary: `${team.abbreviation}: ${traits.map((trait) => trait.label).join(" · ")}`,
    traits,
    emptyMessage,
  };
}

function buildTeamStrengthIndicator(
  completedMatches: ReturnType<typeof getManagerCompletedMatches>,
): TeamDevelopmentIndicator {
  if (completedMatches.length < 2) {
    return {
      direction: "neutral",
      label: "Team noch ohne Verlauf",
      description: "Fortschritt wird sichtbarer, sobald mehrere Wochen gespielt sind.",
    };
  }

  const recent = completedMatches.slice(-3);
  const previous = completedMatches.slice(-6, -3);
  const recentMargin = average(recent.map((match) => match.margin));

  if (previous.length >= 2) {
    const previousMargin = average(previous.map((match) => match.margin));
    const marginDelta = recentMargin - previousMargin;

    if (marginDelta >= 4) {
      return {
        direction: "up",
        label: "Team insgesamt stabiler",
        description: "Die letzten Wochen zeigen bessere Ergebnisse als der vorherige Abschnitt.",
      };
    }

    if (marginDelta <= -4) {
      return {
        direction: "down",
        label: "Team insgesamt wackliger",
        description: "Die letzten Wochen fallen gegenueber dem vorherigen Abschnitt ab.",
      };
    }
  }

  if (recentMargin >= -3) {
    return {
      direction: "up",
      label: "Team insgesamt stabiler",
      description: "Die letzten Spiele bleiben nah genug, um Fortschritt zu erkennen.",
    };
  }

  if (recentMargin <= -14) {
    return {
      direction: "down",
      label: "Team verliert Boden",
      description: "Die letzten Spiele kippen zu deutlich gegen dein Team.",
    };
  }

  return {
    direction: "neutral",
    label: "Team bleibt stabil",
    description: "Die letzten Wochen zeigen keine klare Verschiebung nach oben oder unten.",
  };
}

function buildNeedIndicator(team: TeamDetail): TeamDevelopmentIndicator {
  const topNeed = [...(team.teamNeeds ?? [])].sort((left, right) => right.needScore - left.needScore)[0];

  if (!topNeed) {
    return {
      direction: "up",
      label: "Need reduziert",
      description: "Aktuell ist kein klar priorisierter Kaderbedarf sichtbar.",
    };
  }

  const area = positionArea(topNeed.positionCode);

  if (topNeed.needScore >= 8) {
    return {
      direction: "down",
      label: `${area} weiterhin Schwachpunkt`,
      description: `${topNeed.positionName} bleibt der groesste sichtbare Need.`,
    };
  }

  if (topNeed.needScore <= 3) {
    return {
      direction: "up",
      label: `${area} verbessert`,
      description: `${topNeed.positionName} ist aktuell kein harter Need mehr.`,
    };
  }

  return {
    direction: "neutral",
    label: "Need stabil",
    description: `${topNeed.positionName} bleibt beobachtbar, aber nicht kritisch.`,
  };
}

function buildValueIndicator(team: TeamDetail): TeamDevelopmentIndicator {
  const players = (team.players ?? []).filter((player) => player.status === "ACTIVE");

  if (players.length === 0) {
    return {
      direction: "neutral",
      label: "Value noch unklar",
      description: "Fuer eine Value-Einordnung fehlen aktive Spieler im Kader.",
    };
  }

  const values = players.map((player) =>
    buildPlayerValue({
      ...player,
      capHit: player.currentContract?.capHit,
      teamNeedScore: team.teamNeeds.find((need) => need.positionCode === player.positionCode)?.needScore,
    }),
  );
  const positive = values.filter((value) => value.label === "Great Value").length;
  const negative = values.filter((value) => value.label === "Expensive" || value.label === "Low Fit").length;

  if (positive > negative) {
    return {
      direction: "up",
      label: "Value verbessert",
      description: "Mehr Spieler wirken als guter Gegenwert als als Value-Problem.",
    };
  }

  if (negative > positive) {
    return {
      direction: "down",
      label: "Value unter Druck",
      description: "Teure oder schlecht passende Spieler fallen im aktuellen Kader staerker auf.",
    };
  }

  return {
    direction: "neutral",
    label: "Value stabil",
    description: "Gute Deals und Value-Probleme halten sich aktuell die Waage.",
  };
}

export function buildTeamDevelopmentState(input: {
  season: SeasonOverview | null;
  team: TeamDetail | null;
}): TeamDevelopmentState {
  const emptyMessage =
    "Team-Entwicklung erscheint, sobald Teamdaten und mindestens ein Saisonkontext verfuegbar sind.";

  if (!input.team || !input.season) {
    return {
      title: "Team Development",
      summary: "Noch nicht genug Daten fuer eine Entwicklung ueber Zeit.",
      indicators: [],
      emptyMessage,
    };
  }

  const completedMatches = getManagerCompletedMatches(input.season, input.team.id);
  const indicators = [
    buildTeamStrengthIndicator(completedMatches),
    buildNeedIndicator(input.team),
    buildValueIndicator(input.team),
  ];
  const improving = indicators.filter((indicator) => indicator.direction === "up").length;
  const declining = indicators.filter((indicator) => indicator.direction === "down").length;
  const overallDirection: TeamDevelopmentIndicator["direction"] =
    improving > declining ? "up" : declining > improving ? "down" : "neutral";

  return {
    title: "Team Development",
    summary: `Gesamtbild: ${directionLabel(overallDirection)}. ${indicators[0]?.label ?? "Team stabil"}.`,
    indicators,
    emptyMessage,
  };
}

function buildMilestone(
  condition: boolean,
  inProgress: boolean,
  milestone: Omit<RebuildMilestone, "status">,
): RebuildMilestone {
  return {
    ...milestone,
    status: condition ? "achieved" : inProgress ? "in-progress" : "locked",
  };
}

export function buildRebuildProgressState(input: {
  season: SeasonOverview | null;
  team: TeamDetail | null;
}): RebuildProgressState {
  const { season, team } = input;
  const emptyMessage =
    "Rebuild-Fortschritt erscheint, sobald Team, Saison und abgeschlossene Spiele verfuegbar sind.";

  if (!team || !season) {
    return {
      title: "Rebuild Progress",
      summary: "Noch nicht genug Daten fuer einen Rebuild-Verlauf.",
      metrics: [],
      milestones: [],
      emptyMessage,
    };
  }

  const completedMatches = getManagerCompletedMatches(season, team.id);
  const recentMatches = completedMatches.slice(-5);
  const previousMatches = completedMatches.slice(-10, -5);
  const closeGames = completedMatches.filter((match) => Math.abs(match.margin) <= 8);
  const blowouts = completedMatches.filter((match) => Math.abs(match.margin) >= 21);
  const wins = completedMatches.filter((match) => match.margin > 0);
  const losses = completedMatches.filter((match) => match.margin < 0);
  const recentBlowouts = recentMatches.filter((match) => Math.abs(match.margin) >= 21).length;
  const previousBlowouts = previousMatches.filter((match) => Math.abs(match.margin) >= 21).length;
  const recentPpg = average(recentMatches.map((match) => match.pointsFor));
  const previousPpg = average(previousMatches.map((match) => match.pointsFor));
  const closeLosses = completedMatches.filter((match) => match.margin < 0 && Math.abs(match.margin) <= 8);
  const moralVictorySignals = completedMatches.filter(
    (match) =>
      (match.margin < 0 && Math.abs(match.margin) <= 8) ||
      (team.overallRating <= 72 && match.margin < 0 && Math.abs(match.margin) < 21) ||
      (team.overallRating <= 72 && match.margin > 0),
  );
  const players = Array.isArray(team.players) ? team.players : [];
  const youngUpsidePlayers = players
    .filter((player) => player.age <= 24 && player.potentialRating - player.positionOverall >= 6)
    .sort(
      (left, right) =>
        right.potentialRating - right.positionOverall -
        (left.potentialRating - left.positionOverall),
    );
  const focusedYoungPlayers = youngUpsidePlayers.filter((player) => player.developmentFocus);
  const ppgTrendReady = recentMatches.length >= 3 && previousMatches.length >= 3;
  const ppgImproved = ppgTrendReady && recentPpg >= previousPpg + 2;
  const blowoutTrendReady = recentMatches.length >= 3 && previousMatches.length >= 3;
  const fewerBlowouts = blowoutTrendReady && recentBlowouts < previousBlowouts;

  const milestones: RebuildMilestone[] = [
    buildMilestone(closeGames.length > 0, completedMatches.length > 0, {
      title: "Erstes knappes Spiel erreicht",
      description: "Mindestens ein Spiel blieb innerhalb eines Scores und zeigt, dass das Team mithalten kann.",
      value: `${closeGames.length} Close Game(s)`,
    }),
    buildMilestone(ppgImproved, recentMatches.length >= 3, {
      title: "Offense-Trend steigt",
      description: "Die letzten Spiele bringen mehr Punkte als der vorherige Abschnitt.",
      value: ppgTrendReady
        ? `${formatDecimal(previousPpg)} -> ${formatDecimal(recentPpg)} PPG`
        : `${formatDecimal(recentPpg)} PPG zuletzt`,
    }),
    buildMilestone(fewerBlowouts, recentMatches.length >= 3, {
      title: "Blowouts reduziert",
      description: "Die letzten Spiele enthalten weniger deutliche Niederlagen als der Vergleichszeitraum.",
      value: blowoutTrendReady
        ? `${previousBlowouts} -> ${recentBlowouts}`
        : `${recentBlowouts} Blowout(s) zuletzt`,
    }),
    buildMilestone(youngUpsidePlayers.length > 0, players.length > 0, {
      title: "Junger Kern mit Upside",
      description: "Junge Spieler mit klarem Potenzial geben dem Rebuild eine sichtbare Entwicklungsbasis.",
      value:
        youngUpsidePlayers.length > 0
          ? `${youngUpsidePlayers[0]!.fullName} +${youngUpsidePlayers[0]!.potentialRating - youngUpsidePlayers[0]!.positionOverall} Upside`
          : "Kein klarer Upside-Spieler",
    }),
    buildMilestone(moralVictorySignals.length > 0, completedMatches.length > 0, {
      title: "Ueber Erwartung gespielt",
      description: "Close Loss, Blowout-Vermeidung oder Sieg mit schwachem Team zaehlen als Rebuild-Signal.",
      value: `${moralVictorySignals.length} Signal(e)`,
    }),
  ];

  return {
    title: "Rebuild Progress",
    summary:
      completedMatches.length > 0
        ? `${team.abbreviation} hat ${completedMatches.length} Spiel(e) im Verlauf: ${wins.length} Sieg(e), ${losses.length} Niederlage(n), ${closeLosses.length} knappe Niederlage(n).`
        : "Noch keine abgeschlossenen Spiele fuer diesen Rebuild.",
    metrics: [
      {
        label: "Team Overall",
        value: String(team.overallRating),
        description: "Aktuelle Teamstaerke aus dem aktiven Kader.",
      },
      {
        label: "Recent PPG",
        value: recentMatches.length > 0 ? formatDecimal(recentPpg) : "n/a",
        description: "Punkte pro Spiel im Rolling Window der letzten bis zu 5 Spiele.",
      },
      {
        label: "Close Games",
        value: String(closeGames.length),
        description: "Spiele innerhalb von 8 Punkten im Saisonverlauf.",
      },
      {
        label: "Blowouts",
        value: String(blowouts.length),
        description: "Spiele mit mindestens 21 Punkten Abstand.",
      },
      {
        label: "Young Upside",
        value: String(youngUpsidePlayers.length),
        description:
          focusedYoungPlayers.length > 0
            ? `${focusedYoungPlayers.length} davon sind aktuell Development Focus.`
            : "Junge Spieler mit mindestens +6 Potenzial gegen aktuelles OVR.",
      },
    ],
    milestones,
    emptyMessage,
  };
}

export function getTeamHref(saveGameId: string, teamId: string | null | undefined) {
  return teamId ? `/app/savegames/${saveGameId}/team` : null;
}

export function getSeasonHref(saveGameId: string, seasonId: string | null | undefined) {
  return seasonId ? `/app/savegames/${saveGameId}/league` : null;
}

export function getFreeAgencyHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/finance/free-agency`;
}

export function getGameCenterHref(saveGameId: string, matchId: string | null | undefined) {
  return matchId ? getGameLiveHref(saveGameId, matchId) : null;
}

export function getMatchHref(saveGameId: string, matchId: string | null | undefined) {
  return matchId ? getGameReportHref(saveGameId, matchId) : null;
}

function weekStateTone(weekState: DashboardWeekState): DashboardStatusTone {
  if (weekState === "READY" || weekState === "POST_GAME") {
    return "success";
  }

  if (weekState === "GAME_RUNNING") {
    return "active";
  }

  return "warning";
}

export function getDashboardWeekStateTone(weekState: DashboardWeekState): DashboardStatusTone {
  return weekStateTone(weekState);
}

export function buildDashboardQuickActions({
  freeAgencyHref,
  matchHref,
  nextMatch,
  seasonHref,
  team,
  teamHref,
  weekState,
}: DashboardQuickActionsInput): DashboardQuickAction[] {
  const gameDisabledReason =
    weekState === "PRE_WEEK"
      ? "Zuerst im Wochenablauf die Woche vorbereiten."
      : !nextMatch
        ? "Kein offenes Match im aktuellen Saisonkontext."
        : null;

  return [
    {
      title: "Wochenablauf",
      description:
        weekState === "PRE_WEEK"
          ? "Plan, Gegnerfokus und Development Focus fuer die Woche setzen."
          : "Aktuellen Status im Wochenablauf kontrollieren.",
      href: "#week-loop",
      label: weekState === "PRE_WEEK" ? "Plan setzen" : "Status pruefen",
      tone: "primary",
    },
    {
      title: "Game Preview",
      description: nextMatch
        ? `Woche ${nextMatch.week}: ${nextMatch.homeTeamName} vs. ${nextMatch.awayTeamName}.`
        : "Spielvorbereitung erscheint, sobald ein Match verfuegbar ist.",
      href: gameDisabledReason ? null : matchHref,
      label: weekState === "GAME_RUNNING" ? "Game Center" : "Preview oeffnen",
      tone: "success",
      disabledReason: gameDisabledReason ?? undefined,
    },
    {
      title: "Roster",
      description: team
        ? `${team.abbreviation} Kader, Depth Chart und Rollen pruefen.`
        : "Roster wird aktiv, sobald ein Manager-Team geladen ist.",
      href: teamHref,
      label: "Team oeffnen",
      tone: "default",
      disabledReason: teamHref ? undefined : "Kein Manager-Team im Savegame-Kontext.",
    },
    {
      title: "League",
      description: "Schedule, Standings und Saisonphase einordnen.",
      href: seasonHref,
      label: "Liga ansehen",
      tone: "default",
      disabledReason: seasonHref ? undefined : "Keine aktuelle Saison geladen.",
    },
    {
      title: "Roster Value",
      description: "Needs und Free Agency als naechsten Value-Move pruefen.",
      href: freeAgencyHref,
      label: "Free Agency",
      tone: "warning",
      disabledReason: freeAgencyHref ? undefined : "Free Agency braucht ein usergesteuertes Team.",
    },
  ];
}

export function buildDashboardDecisionFeedbackItems({
  action,
  decisionEvents,
  season,
  team,
  weekState,
}: DashboardDecisionFeedbackInput): DashboardDecisionFeedbackItem[] {
  const recentDecisionEvents = (decisionEvents ?? team?.recentDecisionEvents ?? []).slice(0, 4);
  const actionImpact: DashboardDecisionFeedbackItem["impact"] =
    action.tone === "positive" ? "positive" : action.tone === "warning" ? "neutral" : "neutral";
  const items: DashboardDecisionFeedbackItem[] = [
    {
      context: action.href
        ? `${action.label} ist als direkter naechster Schritt verfuegbar.`
        : weekState === "POST_GAME"
          ? "Diese Aktion wird ueber den Week Loop als sicherer Server-Action-Schritt ausgefuehrt."
          : "Aktuell gibt es keinen direkten Link fuer diese Empfehlung.",
      impact: actionImpact,
      reason: action.message,
      source: "Derived",
      title: action.title,
    },
  ];
  const topNeed = [...(team?.teamNeeds ?? [])].sort((left, right) => right.needScore - left.needScore)[0] ?? null;

  if (topNeed) {
    items.push({
      context: `${topNeed.playerCount}/${topNeed.targetCount} Spieler im Zielkorridor, Starter-Schnitt ${topNeed.starterAverage}.`,
      impact: topNeed.needScore >= 8 ? "negative" : topNeed.needScore >= 5 ? "neutral" : "positive",
      reason: `${topNeed.positionName} ist aktuell der sichtbarste Kaderbedarf.`,
      source: "Derived",
      title: `${topNeed.positionCode} Value Signal`,
    });
  }

  if (weekState === "POST_GAME") {
    const lineupRetrospective = buildLineupDashboardRetrospective({ season, team });

    if (lineupRetrospective) {
      items.push(lineupRetrospective);
    }
  }

  if (recentDecisionEvents.length > 0) {
    items.push(
      ...recentDecisionEvents.map((event) => ({
        context: decisionEventContext(event),
        impact: decisionEventImpact(event),
        reason: decisionEventReason(event),
        source: "Action" as const,
        title:
          event.type === "DEPTH_CHART"
            ? "Lineup geändert"
            : event.type === "SIGNING"
              ? "Roster erweitert"
              : event.type === "RELEASE"
                ? "Spieler entlassen"
                : "Roster-Aktion",
      })),
    );
  } else {
    items.push({
      context:
        "Noch keine persistierten Lineup-, Signing- oder Release-Aktionen fuer dieses Team.",
      impact: "neutral",
      reason:
        "Sobald du Roster- oder Lineup-Entscheidungen triffst, erscheinen sie hier als Historie.",
      source: "UI-Fixture",
      title: "Letzte Decision Feedbacks",
    });
  }

  return items;
}

export function buildWeekLoopDashboardAction(input: {
  gameHref: string | null;
  weekState: DashboardWeekState;
}): WeekLoopDashboardAction {
  if (input.weekState === "PRE_WEEK") {
    return {
      description:
        "Bereitet die aktuelle Woche vor und schaltet danach den Pre-Game-Schritt frei.",
      href: null,
      kind: "prepare",
      label: "Woche vorbereiten",
      title: "Woche vorbereiten",
    };
  }

  if (input.weekState === "READY") {
    return {
      description:
        "Die Woche ist bereit. Der naechste sinnvolle Schritt ist die Spielvorbereitung.",
      href: input.gameHref,
      kind: "game-setup",
      label: "Gameplan vorbereiten",
      title: "Gameplan vorbereiten",
    };
  }

  if (input.weekState === "GAME_RUNNING") {
    return {
      description:
        "Ein Spiel ist aktiv. Oeffne den Game Center, um den laufenden Status zu pruefen.",
      href: input.gameHref,
      kind: "game-live",
      label: "Game Center oeffnen",
      title: "Game laeuft",
    };
  }

  return {
    description:
      "Das Spiel ist abgeschlossen. Lade die naechste Woche, um den Week Loop erneut zu starten.",
    href: null,
    kind: "advance-week",
    label: "Naechste Woche",
    title: "Naechste Woche",
  };
}

export function buildWeekLoopFeedbackItems(input: {
  developmentFocusCount: number;
  weekState: DashboardWeekState;
}): WeekLoopFeedbackItem[] {
  if (input.weekState === "PRE_WEEK") {
    return [
      {
        label: "Weekly Plan",
        message:
          "Recovery senkt Fatigue stark, Balanced ist kontrollierte Arbeit, Intense bringt Trainingstiefe mit klarer Frische-Kosten.",
      },
      {
        label: "Player Progression",
        message:
          input.developmentFocusCount > 0
            ? `${input.developmentFocusCount} Fokus-Spieler bekommen zusaetzlichen XP-Schub, solange Potenzial vorhanden ist.`
            : "Waehle Fokus-Spieler mit Potenzial, damit Training nachvollziehbar in Entwicklung umschlaegt.",
      },
      {
        label: "Fatigue & Injuries",
        message:
          "Hohe Fatigue senkt Readiness und Snap-Anteile; Match-Belastung kann spaeter Injury-Risiko erhoehen.",
      },
    ];
  }

  if (input.weekState === "READY") {
    return [
      {
        label: "Gameplan",
        message:
          "Pruefe X-Factor, Tempo, Protection und Matchup-Fokus vor Kickoff; diese Plaene beeinflussen Play-Auswahl und Risiko.",
      },
      {
        label: "AI Gegner",
        message:
          "CPU-Teams waehlen eine einfache Strategie aus Staerke, Matchup, Fatigue und Injuries.",
      },
    ];
  }

  if (input.weekState === "GAME_RUNNING") {
    return [
      {
        label: "Live-Eindruck",
        message:
          "Der Game Center zeigt den laufenden Zustand; der finale Report erklaert Drives, Druck und Schluesselfaktoren nach Abschluss.",
      },
    ];
  }

  return [
    {
        label: "Nach dem Spiel",
      message:
        "Der Report erklaert Ergebnis, BoxScore, X-Factor-Wirkung und Drive-Gruende, bevor die naechste Woche geladen wird.",
    },
    {
      label: "Recovery",
      message:
        "Beim Wochenwechsel werden abgelaufene Injuries freigegeben und Fatigue/Morale ueber Recovery-Regeln aktualisiert.",
    },
  ];
}

export function selectNextDashboardMatch(
  season: SeasonOverview | null,
  managerTeamId: string | null | undefined,
) {
  if (!season) {
    return null;
  }

  const matches = Array.isArray(season.matches) ? season.matches : [];
  const scheduledMatches = matches
    .filter((match) => match.status === "SCHEDULED")
    .sort((left, right) => {
      if (left.week !== right.week) {
        return left.week - right.week;
      }

      return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
    });

  const isManagerMatch = (match: SeasonMatchSummary) =>
    Boolean(managerTeamId) &&
    (match.homeTeamId === managerTeamId || match.awayTeamId === managerTeamId);

  return (
    scheduledMatches.find((match) => match.week === season.week && isManagerMatch(match)) ??
    scheduledMatches.find((match) => match.week === season.week) ??
    scheduledMatches.find((match) => match.week > season.week && isManagerMatch(match)) ??
    scheduledMatches.find((match) => match.week > season.week) ??
    null
  );
}

export function buildDashboardAction({
  weekState,
  saveGameId,
  team,
  season,
  nextMatch,
}: DashboardActionInput): DashboardAction {
  if (!team) {
    return {
      title: "Manager-Team fehlt",
      message:
        "Das Savegame hat noch kein sichtbar geladenes Manager-Team. Pruefe zuerst den Savegame-Kontext.",
      href: `/app/savegames/${saveGameId}`,
      label: "Savegame pruefen",
      tone: "warning",
    };
  }

  if (!season) {
    return {
      title: "Saison fehlt",
      message:
        "Fuer dieses Savegame ist keine aktuelle Saison geladen. Oeffne das Savegame, bevor Manager-Aktionen geplant werden.",
      href: `/app/savegames/${saveGameId}`,
      label: "Savegame pruefen",
      tone: "warning",
    };
  }

  if (weekState === "PRE_WEEK") {
    return {
      title: "Woche vorbereiten",
      message:
        "Du bist Manager - bereite das naechste Spiel vor. Ein Klick setzt einen ausgewogenen Wochenplan und schaltet die Game Preview frei.",
      href: null,
      label: "Woche vorbereiten",
      tone: "positive",
    };
  }

  if (weekState === "READY" && nextMatch) {
    return {
      title: "Gameplan vorbereiten",
      message: `Woche ${nextMatch.week}: ${nextMatch.homeTeamName} vs. ${nextMatch.awayTeamName}. Pruefe Setup und starte danach das Spiel.`,
      href: getGameFlowHref(saveGameId, nextMatch),
      label: "Jetzt vorbereiten",
      tone: "positive",
    };
  }

  if (weekState === "POST_GAME") {
    return {
      title: "Naechste Woche laden",
      message:
        "Das aktuelle Spiel ist abgeschlossen. Schliesse die Woche ab, damit Dashboard, Inbox und Schedule die naechste Woche anzeigen.",
      href: null,
      label: "Naechste Woche",
      tone: "positive",
    };
  }

  const teamNeeds = Array.isArray(team.teamNeeds) ? team.teamNeeds : [];
  const topNeed = [...teamNeeds].sort((left, right) => right.needScore - left.needScore)[0];
  if (team.managerControlled && topNeed && topNeed.needScore > 0) {
    return {
      title: `${topNeed.positionCode} Bedarf klaeren`,
      message: `${topNeed.positionName} ist der groesste Kaderbedarf.`,
      href: getFreeAgencyHref(saveGameId),
      label: "Jetzt pruefen",
      tone: "warning",
    };
  }

  if (nextMatch) {
    return {
      title: "Naechstes Spiel vorbereiten",
      message: `Woche ${nextMatch.week}: ${nextMatch.homeTeamName} vs. ${nextMatch.awayTeamName}.`,
      href: getGameFlowHref(saveGameId, nextMatch),
      label: "Zum Spiel",
      tone: "positive",
    };
  }

  if (season.phase === "OFFSEASON") {
    return {
      title: "Offseason planen",
      message:
        "Die laufende Saison ist in der Offseason. Der naechste sinnvolle Schritt liegt in Saison- und Roster-Planung.",
      href: getSeasonHref(saveGameId, season.id),
      label: "Saison oeffnen",
      tone: "default",
    };
  }

  return {
    title: "Saisonstatus pruefen",
    message:
      "Es ist kein offenes naechstes Match fuer die aktuelle Woche vorhanden. Pruefe Schedule, Standings und Simulationsstatus.",
    href: getSeasonHref(saveGameId, season.id),
    label: "Saison oeffnen",
    tone: "default",
  };
}
