import type { Prisma } from "@prisma/client";

import { createPlayerHistoryEvent } from "@/modules/players/application/player-history.service";
import {
  applyAdvanceWeekPlayerDevelopment,
  recalculateTeamState,
  type AdvanceWeekDevelopmentPlayer,
} from "@/modules/seasons/infrastructure/simulation/player-development";
import { PlayerHistoryEventType, RosterStatus } from "@/modules/shared/domain/enums";

type ApplyWeeklyDevelopmentForSaveGameInput = {
  tx: Prisma.TransactionClient;
  saveGameId: string;
  seasonId: string;
  week: number;
  occurredAt: Date;
};

const DEVELOPMENT_FOCUS_HISTORY_MARKER = "Development Focus";

function toAttributeMap(
  attributes: Array<{
    value: number;
    attributeDefinition: {
      code: string;
    };
  }>,
) {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.attributeDefinition.code, attribute.value]),
  );
}

function formatDevelopmentSummary(
  development: NonNullable<Awaited<ReturnType<typeof applyAdvanceWeekPlayerDevelopment>>>,
) {
  const changeSummary = development.changes
    .map((change) => `${change.code} ${change.previous}->${change.next}`)
    .join(" · ");
  const focusSummary =
    development.focusBonusXp > 0
      ? ` · ${DEVELOPMENT_FOCUS_HISTORY_MARKER}: +${development.focusBonusXp} XP, streak ${development.developmentFocusStreakWeeks}`
      : "";

  return `XP ${development.xpGained}${focusSummary} · ${changeSummary}`;
}

function buildDevelopmentFocusStreaks(
  events: Array<{
    description: string | null;
    playerId: string;
    week: number;
  }>,
  currentWeek: number,
) {
  const eventsByPlayer = new Map<string, Map<number, string | null>>();

  for (const event of events) {
    const playerEvents = eventsByPlayer.get(event.playerId) ?? new Map<number, string | null>();
    playerEvents.set(event.week, event.description);
    eventsByPlayer.set(event.playerId, playerEvents);
  }

  const streaks = new Map<string, number>();

  for (const [playerId, playerEvents] of eventsByPlayer) {
    let streak = 0;

    for (let previousWeek = currentWeek - 1; previousWeek >= 1; previousWeek -= 1) {
      const description = playerEvents.get(previousWeek);

      if (!description?.includes(DEVELOPMENT_FOCUS_HISTORY_MARKER)) {
        break;
      }

      streak += 1;
    }

    streaks.set(playerId, streak);
  }

  return streaks;
}

function hasDevelopmentWeek(event: {
  description: string | null;
  playerId: string;
  week: number | null;
}): event is {
  description: string | null;
  playerId: string;
  week: number;
} {
  return typeof event.week === "number";
}

export async function applyWeeklyDevelopmentForSaveGame({
  tx,
  saveGameId,
  seasonId,
  week,
  occurredAt,
}: ApplyWeeklyDevelopmentForSaveGameInput) {
  const rosterProfiles = await tx.playerRosterProfile.findMany({
    where: {
      saveGameId,
      teamId: {
        not: null,
      },
      rosterStatus: {
        in: [
          RosterStatus.STARTER,
          RosterStatus.ROTATION,
          RosterStatus.BACKUP,
          RosterStatus.PRACTICE_SQUAD,
        ],
      },
    },
    select: {
      teamId: true,
      rosterStatus: true,
      depthChartSlot: true,
      developmentFocus: true,
      primaryPosition: {
        select: {
          code: true,
        },
      },
      secondaryPosition: {
        select: {
          code: true,
        },
      },
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          developmentTrait: true,
          evaluation: {
            select: {
              potentialRating: true,
              positionOverall: true,
            },
          },
          attributes: {
            select: {
              value: true,
              attributeDefinition: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const playerIds = rosterProfiles.map((profile) => profile.player.id);
  const existingDevelopmentEvents =
    playerIds.length > 0
      ? await tx.playerHistoryEvent.findMany({
          where: {
            saveGameId,
            seasonId,
            week: {
              lte: week,
            },
            type: PlayerHistoryEventType.DEVELOPMENT,
            playerId: {
              in: playerIds,
            },
          },
          select: {
            description: true,
            playerId: true,
            week: true,
          },
          orderBy: {
            week: "desc",
          },
        })
      : [];
  const alreadyDevelopedPlayerIds = new Set(
    existingDevelopmentEvents
      .filter(hasDevelopmentWeek)
      .filter((event) => event.week === week)
      .map((event) => event.playerId),
  );
  const developmentFocusStreaks = buildDevelopmentFocusStreaks(
    existingDevelopmentEvents
      .filter(hasDevelopmentWeek)
      .filter((event) => event.week < week),
    week,
  );
  const touchedTeamIds = new Set<string>();
  let changedPlayers = 0;

  for (const profile of rosterProfiles) {
    if (!profile.teamId || alreadyDevelopedPlayerIds.has(profile.player.id)) {
      continue;
    }

    const evaluation = profile.player.evaluation;

    if (!evaluation) {
      continue;
    }

    const player: AdvanceWeekDevelopmentPlayer = {
      id: profile.player.id,
      teamId: profile.teamId,
      positionCode: profile.primaryPosition.code,
      secondaryPositionCode: profile.secondaryPosition?.code ?? null,
      rosterStatus: profile.rosterStatus,
      depthChartSlot: profile.depthChartSlot,
      developmentFocus: profile.developmentFocus,
      developmentFocusStreakWeeks: profile.developmentFocus
        ? (developmentFocusStreaks.get(profile.player.id) ?? 0)
        : 0,
      developmentTrait: profile.player.developmentTrait,
      potentialRating: evaluation.potentialRating,
      positionOverall: evaluation.positionOverall,
      attributes: toAttributeMap(profile.player.attributes),
    };

    const development = await applyAdvanceWeekPlayerDevelopment({
      tx,
      saveGameId,
      player,
    });

    if (!development) {
      continue;
    }

    changedPlayers += 1;
    touchedTeamIds.add(profile.teamId);

    await createPlayerHistoryEvent({
      tx,
      saveGameId,
      playerId: player.id,
      seasonId,
      teamId: profile.teamId,
      type: PlayerHistoryEventType.DEVELOPMENT,
      week,
      occurredAt,
      title:
        development.nextOverall > development.previousOverall
          ? "Wochenentwicklung sichtbar"
          : "Wochenentwicklung angewendet",
      description: `${profile.player.firstName} ${profile.player.lastName}: OVR ${development.previousOverall}->${development.nextOverall} · ${formatDevelopmentSummary(development)}`,
    });
  }

  for (const teamId of touchedTeamIds) {
    await recalculateTeamState(tx, saveGameId, teamId);
  }

  return {
    changedPlayers,
    skippedAlreadyDeveloped: alreadyDevelopedPlayerIds.size,
    touchedTeamIds: [...touchedTeamIds],
  };
}
