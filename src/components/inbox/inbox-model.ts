import {
  detectDepthChartConflicts,
  buildDepthChartGroups,
  getEmptyStarterPositions,
} from "@/components/team/depth-chart-model";
import { getGameFlowHref } from "@/components/match/game-flow-model";
import type {
  PersistedInboxTaskPriority,
  PersistedInboxTaskState,
  PersistedInboxTaskStatus,
} from "@/modules/inbox/domain/inbox-task.types";
import type { SeasonMatchSummary, SeasonOverview } from "@/modules/seasons/domain/season.types";
import type { TeamDetail, TeamNeedSummary, TeamPlayerSummary } from "@/modules/teams/domain/team.types";

export const MAX_VISIBLE_INBOX_ITEMS = 3;

export type InboxPriority = "critical" | "high" | "medium" | "low";
export type InboxCategory = "Game" | "Roster" | "Finance" | "League" | "System";
export type InboxFilter = "open" | "read" | "done" | "hidden" | "all";

export type InboxItem = {
  id: string;
  taskKey: string;
  title: string;
  message: string;
  priority: InboxPriority;
  basePriority: InboxPriority;
  category: InboxCategory;
  href: string;
  actionLabel: string;
  status: PersistedInboxTaskStatus;
  priorityOverride: PersistedInboxTaskPriority | null;
  readAt: Date | null;
  completedAt: Date | null;
  hiddenAt: Date | null;
  occurredAt?: Date;
};

export type InboxState = {
  items: InboxItem[];
  totalCount: number;
  hiddenCount: number;
  priorityCounts: Record<InboxPriority, number>;
  taskStatusCounts: Record<PersistedInboxTaskStatus, number>;
  isEmpty: boolean;
  activeFilter: InboxFilter;
  filteredCount: number;
};

type BuildInboxStateInput = {
  saveGameId: string;
  team: TeamDetail | null;
  season: SeasonOverview | null;
  taskStates?: PersistedInboxTaskState[];
  filter?: InboxFilter;
  limit?: number;
};

const PRIORITY_WEIGHT: Record<InboxPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function teamHref(saveGameId: string, teamId: string) {
  void teamId;
  return `/app/savegames/${saveGameId}/team`;
}

function teamDepthChartHref(saveGameId: string, teamId: string) {
  return `${teamHref(saveGameId, teamId)}/depth-chart`;
}

function financeHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/finance`;
}

function playerHref(saveGameId: string, playerId: string) {
  return `/app/savegames/${saveGameId}/players/${playerId}`;
}

function freeAgencyHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}/finance/free-agency`;
}

function seasonHref(saveGameId: string, seasonId: string) {
  void seasonId;
  return `/app/savegames/${saveGameId}/league`;
}

function saveGameHref(saveGameId: string) {
  return `/app/savegames/${saveGameId}`;
}

function sortTeamNeeds(needs: TeamNeedSummary[]) {
  return [...needs].sort((left, right) => {
    if (right.needScore !== left.needScore) {
      return right.needScore - left.needScore;
    }

    return left.positionCode.localeCompare(right.positionCode);
  });
}

function sortInjuredPlayers(players: TeamPlayerSummary[]) {
  const injuryWeight = (player: TeamPlayerSummary) => {
    if (player.injuryStatus === "OUT" || player.rosterStatus === "INJURED_RESERVE") {
      return 3;
    }

    if (player.injuryStatus === "DOUBTFUL") {
      return 2;
    }

    if (player.injuryStatus === "QUESTIONABLE") {
      return 1;
    }

    return 0;
  };

  return [...players].sort((left, right) => {
    const byInjury = injuryWeight(right) - injuryWeight(left);
    if (byInjury !== 0) {
      return byInjury;
    }

    return right.positionOverall - left.positionOverall;
  });
}

function selectNextInboxMatch(
  season: SeasonOverview,
  managerTeamId: string | null | undefined,
) {
  const matches = Array.isArray(season.matches) ? season.matches : [];
  const scheduled = matches
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
    scheduled.find((match) => match.week === season.week && isManagerMatch(match)) ??
    scheduled.find((match) => match.week === season.week) ??
    scheduled.find((match) => match.week > season.week && isManagerMatch(match)) ??
    scheduled.find((match) => match.week > season.week) ??
    null
  );
}

function createPriorityCounts(items: InboxItem[]): Record<InboxPriority, number> {
  return items.reduce<Record<InboxPriority, number>>(
    (counts, item) => {
      counts[item.priority] += 1;
      return counts;
    },
    {
      critical: 0,
      high: 0,
      low: 0,
      medium: 0,
    },
  );
}

function createTaskStatusCounts(items: InboxItem[]): Record<PersistedInboxTaskStatus, number> {
  return items.reduce<Record<PersistedInboxTaskStatus, number>>(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    {
      done: 0,
      hidden: 0,
      open: 0,
      read: 0,
    },
  );
}

export function sortInboxItems(items: InboxItem[]) {
  return [...items].sort((left, right) => {
    const byPriority = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
    if (byPriority !== 0) {
      return byPriority;
    }

    const rightDate = right.occurredAt ? new Date(right.occurredAt).getTime() : 0;
    const leftDate = left.occurredAt ? new Date(left.occurredAt).getTime() : 0;
    if (rightDate !== leftDate) {
      return rightDate - leftDate;
    }

    return left.title.localeCompare(right.title);
  });
}

function applyTaskState(
  item: Omit<
    InboxItem,
    | "basePriority"
    | "completedAt"
    | "hiddenAt"
    | "priorityOverride"
    | "readAt"
    | "status"
    | "taskKey"
  >,
  state: PersistedInboxTaskState | undefined,
): InboxItem {
  return {
    ...item,
    basePriority: item.priority,
    completedAt: state?.completedAt ?? null,
    hiddenAt: state?.hiddenAt ?? null,
    priority: state?.priorityOverride ?? item.priority,
    priorityOverride: state?.priorityOverride ?? null,
    readAt: state?.readAt ?? null,
    status: state?.status ?? "open",
    taskKey: item.id,
  };
}

function filterInboxItems(items: InboxItem[], filter: InboxFilter) {
  if (filter === "all") {
    return items;
  }

  if (filter === "done") {
    return items.filter((item) => item.status === "done");
  }

  if (filter === "read") {
    return items.filter((item) => item.status === "read");
  }

  if (filter === "hidden") {
    return items.filter((item) => item.status === "hidden");
  }

  return items.filter((item) => item.status === "open");
}

export function normalizeInboxFilter(value: string | null | undefined): InboxFilter {
  if (value === "done" || value === "hidden" || value === "all" || value === "read") {
    return value;
  }

  return "open";
}

export function buildInboxItems({ saveGameId, team, season }: BuildInboxStateInput) {
  const items: Array<Omit<
    InboxItem,
    | "basePriority"
    | "completedAt"
    | "hiddenAt"
    | "priorityOverride"
    | "readAt"
    | "status"
    | "taskKey"
  >> = [];

  if (!team) {
    items.push({
      id: "system-manager-team",
      title: "Manager-Team pruefen",
      message:
        "Dieses Savegame hat kein sichtbar geladenes Manager-Team. Ohne Team sind Roster-, Gameplan- und Finanzaktionen blockiert.",
      priority: "high",
      category: "System",
      href: saveGameHref(saveGameId),
      actionLabel: "Savegame pruefen",
    });
  }

  if (!season) {
    items.push({
      id: "system-season",
      title: "Saisonstatus pruefen",
      message:
        "Fuer dieses Savegame ist keine aktuelle Saison geladen. Schedule, Standings und Simulation sind dadurch nicht steuerbar.",
      priority: "high",
      category: "System",
      href: saveGameHref(saveGameId),
      actionLabel: "Savegame pruefen",
    });
  }

  if (team) {
    const hasPlayerList = Array.isArray(team.players);
    const players = hasPlayerList ? team.players : [];
    const teamNeeds = Array.isArray(team.teamNeeds) ? team.teamNeeds : [];
    const expiringPlayers = Array.isArray(team.contractOutlook?.expiringPlayers)
      ? team.contractOutlook.expiringPlayers
      : [];
    const recentFinanceEvents = Array.isArray(team.recentFinanceEvents)
      ? team.recentFinanceEvents
      : [];
    const conflicts = hasPlayerList ? detectDepthChartConflicts(players) : [];
    const emptyStarterPositions = hasPlayerList
      ? getEmptyStarterPositions(buildDepthChartGroups(players))
      : [];
    const injuredPlayers = sortInjuredPlayers(
      players.filter(
        (player) =>
          player.injuryStatus !== "HEALTHY" ||
          player.status === "INJURED" ||
          player.rosterStatus === "INJURED_RESERVE",
      ),
    );

    if (conflicts.length > 0) {
      items.push({
        id: "roster-depth-conflicts",
        title: "Doppelte Rollen klaeren",
        message: `${conflicts.length} Rolle(n) sind doppelt besetzt. Klaere sie vor dem naechsten Spiel.`,
        priority: "critical",
        category: "Roster",
        href: teamDepthChartHref(saveGameId, team.id),
        actionLabel: "Depth Chart oeffnen",
      });
    }

    if (emptyStarterPositions.length > 0) {
      items.push({
        id: "roster-empty-starters",
        title: "Starter fehlen",
        message: `${emptyStarterPositions.length} Position(en) haben noch keinen Starter.`,
        priority: "high",
        category: "Roster",
        href: teamDepthChartHref(saveGameId, team.id),
        actionLabel: "Depth Chart bearbeiten",
      });
    }

    if (team.salaryCapSpace < 0) {
      items.push({
        id: "finance-cap-negative",
        title: "Salary Cap ueberzogen",
        message: `${team.name} liegt unter null Cap Space. Vertrags- oder Roster-Aktionen sollten zuerst geklaert werden.`,
        priority: "critical",
        category: "Finance",
        href: financeHref(saveGameId),
        actionLabel: "Finanzen pruefen",
      });
    } else if (team.salaryCapSpace < 5_000_000) {
      items.push({
        id: "finance-cap-tight",
        title: "Cap Space knapp",
        message: `${team.name} hat weniger als 5 Mio. Cap Space. Neue Signings brauchen genaue Pruefung.`,
        priority: "high",
        category: "Finance",
        href: financeHref(saveGameId),
        actionLabel: "Finanzen pruefen",
      });
    }

    for (const need of sortTeamNeeds(teamNeeds).filter((need) => need.needScore > 0).slice(0, 3)) {
      items.push({
        id: `need-${need.positionCode}`,
        title: `${need.positionCode} Bedarf klaeren`,
        message: `${need.positionName}: Bedarf ${need.needScore}, Starter-Schnitt ${need.starterAverage}, Tiefe ${need.playerCount}/${need.targetCount}.`,
        priority: need.needScore >= 7 ? "high" : "medium",
        category: "Roster",
        href: freeAgencyHref(saveGameId),
        actionLabel: "Markt pruefen",
      });
    }

    for (const player of injuredPlayers.slice(0, 2)) {
      items.push({
        id: `injury-${player.id}`,
        title: `${player.positionCode} Verletzung beobachten`,
        message: `${player.fullName}: ${player.injuryStatus}${player.injuryName ? ` · ${player.injuryName}` : ""}.`,
        priority:
          player.injuryStatus === "OUT" || player.rosterStatus === "INJURED_RESERVE"
            ? "high"
            : "medium",
        category: "Roster",
        href: playerHref(saveGameId, player.id),
        actionLabel: "Spieler ansehen",
      });
    }

    for (const expiringPlayer of expiringPlayers.slice(0, 2)) {
      items.push({
        id: `contract-${expiringPlayer.id}`,
        title: `${expiringPlayer.positionCode} Vertrag laeuft aus`,
        message: `${expiringPlayer.fullName} hat nur noch ${expiringPlayer.years} Jahr(e). Cap Hit: ${Math.round(expiringPlayer.capHit / 1_000_000)} Mio.`,
        priority: "medium",
        category: "Finance",
        href: financeHref(saveGameId),
        actionLabel: "Finance oeffnen",
      });
    }

    for (const event of recentFinanceEvents.slice(0, 2)) {
      items.push({
        id: `finance-event-${event.id}`,
        title: event.description ?? event.type,
        message: `${event.playerName ?? team.abbreviation}: ${event.type}. Cap-Auswirkung ${Math.round(event.capImpact / 1_000_000)} Mio.`,
        priority: Math.abs(event.capImpact) >= 5_000_000 ? "medium" : "low",
        category: "Finance",
        href: financeHref(saveGameId),
        actionLabel: "Finanzen ansehen",
        occurredAt: event.occurredAt,
      });
    }
  }

  if (season) {
    const matches = Array.isArray(season.matches) ? season.matches : [];
    const currentWeekMatches = matches.filter((match) => match.week === season.week);
    const inProgressMatches = currentWeekMatches.filter((match) => match.status === "IN_PROGRESS");
    const scheduledMatches = currentWeekMatches.filter((match) => match.status === "SCHEDULED");
    const completedMatches = currentWeekMatches.filter((match) => match.status === "COMPLETED");
    const nextMatch = selectNextInboxMatch(season, team?.id);
    const currentInProgressMatch = inProgressMatches.find(
      (match) => match.homeTeamId === team?.id || match.awayTeamId === team?.id,
    ) ?? inProgressMatches[0];

    if (currentInProgressMatch) {
      items.push({
        id: `game-live-${currentInProgressMatch.id}`,
        title: "Spiel laeuft",
        message: `${currentInProgressMatch.homeTeamName} vs. ${currentInProgressMatch.awayTeamName} ist in Simulation.`,
        priority: "critical",
        category: "Game",
        href: getGameFlowHref(saveGameId, currentInProgressMatch),
        actionLabel: "Game Center",
      });
    } else if (nextMatch) {
      const isManagerMatch = nextMatch.homeTeamId === team?.id || nextMatch.awayTeamId === team?.id;
      items.push({
        id: `game-next-${nextMatch.id}`,
        title: isManagerMatch ? "Naechstes Spiel vorbereiten" : "Naechstes Liga-Spiel ansehen",
        message: `Woche ${nextMatch.week}: ${nextMatch.homeTeamName} vs. ${nextMatch.awayTeamName}.`,
        priority: isManagerMatch && nextMatch.week === season.week ? "high" : "medium",
        category: "Game",
        href: getGameFlowHref(saveGameId, nextMatch),
        actionLabel: "Game Flow",
      });
    }

    if (scheduledMatches.length > 0 && inProgressMatches.length === 0) {
      items.push({
        id: `season-week-${season.id}-${season.week}`,
        title: "Woche bereit zur Simulation",
        message: `${scheduledMatches.length} Spiel(e) in Woche ${season.week} sind noch geplant.`,
        priority: "medium",
        category: "League",
        href: seasonHref(saveGameId, season.id),
        actionLabel: "Saison oeffnen",
      });
    }

    if (
      currentWeekMatches.length > 0 &&
      completedMatches.length === currentWeekMatches.length &&
      season.phase !== "OFFSEASON"
    ) {
      items.push({
        id: `season-week-complete-${season.id}-${season.week}`,
        title: "Woche abgeschlossen",
        message: `Alle ${currentWeekMatches.length} Spiel(e) der aktuellen Woche sind abgeschlossen.`,
        priority: "low",
        category: "League",
        href: seasonHref(saveGameId, season.id),
        actionLabel: "Saison pruefen",
      });
    }
  }

  return items;
}

export function buildInboxState(input: BuildInboxStateInput): InboxState {
  const limit = input.limit ?? MAX_VISIBLE_INBOX_ITEMS;
  const stateByTaskKey = new Map(
    (input.taskStates ?? []).map((state) => [state.taskKey, state]),
  );
  const activeFilter = normalizeInboxFilter(input.filter);
  const allItems = sortInboxItems(
    buildInboxItems(input).map((item) => applyTaskState(item, stateByTaskKey.get(item.id))),
  );
  const filteredItems = filterInboxItems(allItems, activeFilter);
  const items = filteredItems.slice(0, limit);

  return {
    activeFilter,
    filteredCount: filteredItems.length,
    hiddenCount: Math.max(0, filteredItems.length - items.length),
    isEmpty: filteredItems.length === 0,
    items,
    priorityCounts: createPriorityCounts(allItems),
    taskStatusCounts: createTaskStatusCounts(allItems),
    totalCount: allItems.length,
  };
}
