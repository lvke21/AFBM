import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin";
import { assertFirestorePreviewOrEmulatorAllowed } from "../src/lib/firebase/previewGuard";

loadEnvConfig(process.cwd());

export const BACKFILL_COLLECTIONS = [
  "users",
  "leagues",
  "leagueMembers",
  "teams",
  "players",
  "seasons",
  "weeks",
  "matches",
  "gameEvents",
  "playerStats",
  "teamStats",
  "reports",
] as const;

export type BackfillCollection = (typeof BACKFILL_COLLECTIONS)[number];

export type BackfillDocument = {
  collection: BackfillCollection;
  id: string;
  data: Record<string, unknown>;
};

export type BackfillSummary = Record<BackfillCollection, number>;

const prisma = new PrismaClient();
const BATCH_LIMIT = 450;

export async function buildFirestoreBackfillDocuments(): Promise<BackfillDocument[]> {
  const saveGames = await prisma.saveGame.findMany({
    include: {
      currentSeason: true,
      leagueDefinition: true,
      matches: {
        include: {
          awayTeam: true,
          homeTeam: true,
          simulationDrives: true,
        },
        orderBy: [{ seasonId: "asc" }, { week: "asc" }, { scheduledAt: "asc" }, { id: "asc" }],
      },
      playerMatchStats: {
        include: playerStatFamilies(),
        orderBy: [{ matchId: "asc" }, { playerId: "asc" }],
      },
      playerSeasonStats: {
        include: playerStatFamilies(),
        orderBy: [{ seasonId: "asc" }, { playerId: "asc" }],
      },
      players: {
        include: {
          attributes: {
            include: {
              attributeDefinition: true,
            },
          },
          contracts: {
            orderBy: [{ signedAt: "desc" }, { id: "asc" }],
          },
          evaluation: true,
          rosterProfile: {
            include: {
              archetype: true,
              positionGroup: true,
              primaryPosition: true,
              schemeFit: true,
              secondaryPosition: true,
              team: true,
            },
          },
        },
        orderBy: [{ id: "asc" }],
      },
      seasons: {
        orderBy: [{ year: "asc" }, { id: "asc" }],
      },
      settings: true,
      teamMatchStats: {
        orderBy: [{ matchId: "asc" }, { teamId: "asc" }],
      },
      teamSeasonStats: {
        orderBy: [{ seasonId: "asc" }, { teamId: "asc" }],
      },
      teams: {
        include: {
          conferenceDefinition: true,
          defensiveSchemeFit: true,
          divisionDefinition: true,
          offensiveSchemeFit: true,
          specialTeamsSchemeFit: true,
        },
        orderBy: [{ id: "asc" }],
      },
      user: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const documents: BackfillDocument[] = [];

  for (const saveGame of saveGames) {
    const teamsById = new Map(saveGame.teams.map((team) => [team.id, team]));
    const seasonsById = new Map(saveGame.seasons.map((season) => [season.id, season]));
    const playersById = new Map(saveGame.players.map((player) => [player.id, player]));
    const currentSeason = saveGame.currentSeason ?? saveGame.seasons[0] ?? null;
    const weekCount = Math.max(
      saveGame.settings?.seasonLengthWeeks ?? 0,
      currentSeason?.week ?? 0,
      ...saveGame.matches.map((match) => match.week),
      1,
    );

    documents.push({
      collection: "users",
      id: saveGame.user.id,
      data: compactObject({
        createdAt: saveGame.user.createdAt,
        defaultLeagueId: saveGame.id,
        displayName: saveGame.user.name,
        email: saveGame.user.email,
        id: saveGame.user.id,
        image: saveGame.user.image,
        lastActiveLeagueId: saveGame.id,
        updatedAt: saveGame.user.updatedAt,
      }),
    });

    documents.push({
      collection: "leagues",
      id: saveGame.id,
      data: compactObject({
        counts: {
          matchCount: saveGame.matches.length,
          playerCount: saveGame.players.length,
          teamCount: saveGame.teams.length,
        },
        createdAt: saveGame.createdAt,
        currentSeasonId: saveGame.currentSeasonId,
        currentSeasonSnapshot: currentSeason
          ? {
              phase: currentSeason.phase,
              weekNumber: currentSeason.week,
              year: currentSeason.year,
            }
          : null,
        currentWeekId: currentSeason ? makeWeekId(saveGame.id, currentSeason.id, currentSeason.week) : null,
        id: saveGame.id,
        leagueDefinitionSnapshot: {
          code: saveGame.leagueDefinition.code,
          name: saveGame.leagueDefinition.name,
        },
        managerTeamId: saveGame.teams.find((team) => team.managerControlled)?.id ?? null,
        name: saveGame.name,
        ownerId: saveGame.userId,
        settings: saveGame.settings
          ? {
              activeRosterLimit: saveGame.settings.activeRosterLimit,
              practiceSquadSize: saveGame.settings.practiceSquadSize,
              salaryCapCents: moneyToCents(saveGame.settings.salaryCap),
              seasonLengthWeeks: saveGame.settings.seasonLengthWeeks,
            }
          : null,
        status: saveGame.status,
        updatedAt: saveGame.updatedAt,
        weekState: saveGame.weekState,
      }),
    });

    const managerTeam = saveGame.teams.find((team) => team.managerControlled) ?? saveGame.teams[0];
    documents.push({
      collection: "leagueMembers",
      id: `${saveGame.id}_${saveGame.userId}`,
      data: compactObject({
        createdAt: saveGame.createdAt,
        id: `${saveGame.id}_${saveGame.userId}`,
        leagueId: saveGame.id,
        leagueSnapshot: {
          currentSeasonLabel: currentSeason ? `${currentSeason.year} Week ${currentSeason.week}` : null,
          name: saveGame.name,
          status: saveGame.status,
          updatedAt: saveGame.updatedAt,
          weekState: saveGame.weekState,
        },
        role: "OWNER",
        status: "ACTIVE",
        teamId: managerTeam?.id ?? null,
        teamSnapshot: managerTeam ? teamSnapshot(managerTeam) : null,
        updatedAt: saveGame.updatedAt,
        userId: saveGame.userId,
      }),
    });

    for (const team of saveGame.teams) {
      documents.push({
        collection: "teams",
        id: team.id,
        data: compactObject({
          abbreviation: team.abbreviation,
          cashBalanceCents: moneyToCents(team.cashBalance),
          city: team.city,
          conferenceSnapshot: team.conferenceDefinition
            ? { code: team.conferenceDefinition.code, name: team.conferenceDefinition.name }
            : null,
          createdAt: team.createdAt,
          divisionSnapshot: team.divisionDefinition
            ? { code: team.divisionDefinition.code, name: team.divisionDefinition.name }
            : null,
          id: team.id,
          leagueId: team.saveGameId,
          managerControlled: team.managerControlled,
          morale: team.morale,
          nickname: team.nickname,
          overallRating: team.overallRating,
          ownerUserId: saveGame.userId,
          salaryCapSpaceCents: moneyToCents(team.salaryCapSpace),
          schemes: {
            defense: nullableScheme(team.defensiveSchemeFit),
            offense: nullableScheme(team.offensiveSchemeFit),
            specialTeams: nullableScheme(team.specialTeamsSchemeFit),
          },
          updatedAt: team.updatedAt,
        }),
      });
    }

    for (const player of saveGame.players) {
      const rosterTeam = player.rosterProfile?.teamId
        ? teamsById.get(player.rosterProfile.teamId)
        : null;
      const activeContract = player.contracts.find((contract) => contract.status === "ACTIVE")
        ?? player.contracts[0]
        ?? null;

      documents.push({
        collection: "players",
        id: player.id,
        data: compactObject({
          activeContractSummary: activeContract
            ? {
                capHitCents: moneyToCents(activeContract.capHit),
                signedAt: activeContract.signedAt,
                signingBonusCents: moneyToCents(activeContract.signingBonus),
                yearlySalaryCents: moneyToCents(activeContract.yearlySalary),
                years: activeContract.years,
              }
            : null,
          age: player.age,
          attributes: Object.fromEntries(
            player.attributes.map((attribute) => [attribute.attributeDefinition.code, attribute.value]),
          ),
          birthDate: player.birthDate,
          college: player.college,
          condition: {
            fatigue: player.fatigue,
            morale: player.morale,
          },
          createdAt: player.createdAt,
          developmentTrait: player.developmentTrait,
          dominantHand: player.dominantHand,
          evaluation: player.evaluation
            ? {
                defensiveOverall: player.evaluation.defensiveOverall,
                mentalOverall: player.evaluation.mentalOverall,
                offensiveOverall: player.evaluation.offensiveOverall,
                physicalOverall: player.evaluation.physicalOverall,
                positionOverall: player.evaluation.positionOverall,
                potentialRating: player.evaluation.potentialRating,
                specialTeamsOverall: player.evaluation.specialTeamsOverall,
              }
            : null,
          firstName: player.firstName,
          fullName: `${player.firstName} ${player.lastName}`,
          heightCm: player.heightCm,
          id: player.id,
          injury: {
            endsOn: player.injuryEndsOn,
            name: player.injuryName,
            status: player.injuryStatus,
          },
          lastName: player.lastName,
          leagueId: player.saveGameId,
          nationality: player.nationality,
          roster: player.rosterProfile
            ? {
                archetype: nullableName(player.rosterProfile.archetype),
                captainFlag: player.rosterProfile.captainFlag,
                depthChartSlot: player.rosterProfile.depthChartSlot,
                developmentFocus: player.rosterProfile.developmentFocus,
                injuryRisk: player.rosterProfile.injuryRisk,
                positionGroup: nullablePosition(player.rosterProfile.positionGroup),
                practiceSquadEligible: player.rosterProfile.practiceSquadEligible,
                primaryPosition: nullablePosition(player.rosterProfile.primaryPosition),
                rosterStatus: player.rosterProfile.rosterStatus,
                schemeFit: nullableScheme(player.rosterProfile.schemeFit),
                secondaryPosition: nullablePosition(player.rosterProfile.secondaryPosition),
                teamId: player.rosterProfile.teamId,
                teamSnapshot: rosterTeam ? teamSnapshot(rosterTeam) : null,
              }
            : null,
          status: player.status,
          updatedAt: player.updatedAt,
          weightKg: player.weightKg,
          yearsPro: player.yearsPro,
        }),
      });
    }

    for (const season of saveGame.seasons) {
      documents.push({
        collection: "seasons",
        id: season.id,
        data: compactObject({
          createdAt: season.createdAt,
          currentWeekNumber: season.week,
          endsAt: season.endsAt,
          id: season.id,
          leagueId: season.saveGameId,
          phase: season.phase,
          regularSeasonWeeks: weekCount,
          startsAt: season.startsAt,
          status: season.id === saveGame.currentSeasonId ? "ACTIVE" : "ARCHIVED",
          updatedAt: season.updatedAt,
          year: season.year,
        }),
      });

      for (let weekNumber = 1; weekNumber <= weekCount; weekNumber += 1) {
        documents.push({
          collection: "weeks",
          id: makeWeekId(saveGame.id, season.id, weekNumber),
          data: compactObject({
            createdAt: season.createdAt,
            id: makeWeekId(saveGame.id, season.id, weekNumber),
            leagueId: saveGame.id,
            seasonId: season.id,
            state: deriveWeekState(saveGame, season, weekNumber),
            updatedAt: season.updatedAt,
            weekNumber,
          }),
        });
      }
    }

    for (const match of saveGame.matches) {
      documents.push({
        collection: "matches",
        id: match.id,
        data: compactObject({
          awayScore: match.awayScore,
          awayTeamId: match.awayTeamId,
          awayTeamSnapshot: teamSnapshot(match.awayTeam),
          createdAt: match.createdAt,
          homeScore: match.homeScore,
          homeTeamId: match.homeTeamId,
          homeTeamSnapshot: teamSnapshot(match.homeTeam),
          id: match.id,
          kind: match.kind,
          leagueId: match.saveGameId,
          scheduledAt: match.scheduledAt,
          seasonId: match.seasonId,
          simulationCompletedAt: match.simulationCompletedAt,
          simulationSeed: match.simulationSeed,
          simulationStartedAt: match.simulationStartedAt,
          stadiumName: match.stadiumName,
          status: match.status,
          updatedAt: match.updatedAt,
          weekId: makeWeekId(match.saveGameId, match.seasonId, match.week),
          weekNumber: match.week,
        }),
      });

      for (const drive of match.simulationDrives) {
        documents.push({
          collection: "gameEvents",
          id: `drive_${match.id}_${drive.sequence}`,
          data: compactObject({
            createdAt: drive.createdAt,
            defenseTeamAbbreviation: drive.defenseTeamAbbreviation,
            defenseTeamId: drive.defenseTeamId,
            endedAwayScore: drive.endedAwayScore,
            endedHomeScore: drive.endedHomeScore,
            eventType: "MATCH_DRIVE",
            id: `drive_${match.id}_${drive.sequence}`,
            leagueId: drive.saveGameId,
            matchId: drive.matchId,
            offenseTeamAbbreviation: drive.offenseTeamAbbreviation,
            offenseTeamId: drive.offenseTeamId,
            passAttempts: drive.passAttempts,
            phaseLabel: drive.phaseLabel,
            plays: drive.plays,
            pointsScored: drive.pointsScored,
            primaryDefenderName: drive.primaryDefenderName,
            primaryPlayerName: drive.primaryPlayerName,
            redZoneTrip: drive.redZoneTrip,
            resultType: drive.resultType,
            rushAttempts: drive.rushAttempts,
            sequence: drive.sequence,
            startedAwayScore: drive.startedAwayScore,
            startedHomeScore: drive.startedHomeScore,
            summary: drive.summary,
            totalYards: drive.totalYards,
            turnover: drive.turnover,
            updatedAt: drive.createdAt,
          }),
        });
      }
    }

    for (const stat of saveGame.teamSeasonStats) {
      const team = teamsById.get(stat.teamId);
      const season = seasonsById.get(stat.seasonId);
      documents.push({
        collection: "teamStats",
        id: `season_${stat.seasonId}_${stat.teamId}`,
        data: compactObject({
          ...pickTeamStatFields(stat),
          createdAt: season?.createdAt ?? new Date(0),
          id: `season_${stat.seasonId}_${stat.teamId}`,
          leagueId: stat.saveGameId,
          scope: "SEASON",
          seasonId: stat.seasonId,
          seasonYear: season?.year,
          teamId: stat.teamId,
          teamSnapshot: team ? teamSnapshot(team) : null,
          updatedAt: season?.updatedAt ?? new Date(0),
        }),
      });
    }

    for (const stat of saveGame.teamMatchStats) {
      const team = teamsById.get(stat.teamId);
      const match = saveGame.matches.find((candidate) => candidate.id === stat.matchId);
      documents.push({
        collection: "teamStats",
        id: `match_${stat.matchId}_${stat.teamId}`,
        data: compactObject({
          ...pickTeamMatchStatFields(stat),
          createdAt: match?.createdAt ?? new Date(0),
          id: `match_${stat.matchId}_${stat.teamId}`,
          leagueId: stat.saveGameId,
          matchId: stat.matchId,
          scope: "MATCH",
          seasonId: match?.seasonId,
          teamId: stat.teamId,
          teamSnapshot: team ? teamSnapshot(team) : null,
          updatedAt: match?.updatedAt ?? new Date(0),
        }),
      });
    }

    for (const stat of saveGame.playerSeasonStats) {
      const player = playersById.get(stat.playerId);
      const team = teamsById.get(stat.teamId);
      const season = seasonsById.get(stat.seasonId);
      documents.push({
        collection: "playerStats",
        id: `season_${stat.seasonId}_${stat.playerId}_${stat.teamId}`,
        data: compactObject({
          ...pickPlayerStatBase(stat),
          ...pickPlayerStatFamilies(stat),
          createdAt: season?.createdAt ?? new Date(0),
          id: `season_${stat.seasonId}_${stat.playerId}_${stat.teamId}`,
          leagueId: stat.saveGameId,
          playerId: stat.playerId,
          playerSnapshot: player ? playerSnapshot(player, team) : null,
          scope: "SEASON",
          seasonId: stat.seasonId,
          seasonYear: season?.year,
          stats: compactPlayerSummary(stat),
          teamId: stat.teamId,
          teamSnapshot: team ? teamSnapshot(team) : null,
          updatedAt: season?.updatedAt ?? new Date(0),
        }),
      });
    }

    for (const stat of saveGame.playerMatchStats) {
      const player = playersById.get(stat.playerId);
      const team = teamsById.get(stat.teamId);
      const match = saveGame.matches.find((candidate) => candidate.id === stat.matchId);
      documents.push({
        collection: "playerStats",
        id: `match_${stat.matchId}_${stat.playerId}`,
        data: compactObject({
          ...pickPlayerStatBase(stat),
          ...pickPlayerStatFamilies(stat),
          createdAt: match?.createdAt ?? new Date(0),
          id: `match_${stat.matchId}_${stat.playerId}`,
          leagueId: stat.saveGameId,
          matchId: stat.matchId,
          playerId: stat.playerId,
          playerSnapshot: player ? playerSnapshot(player, team) : null,
          scope: "MATCH",
          seasonId: match?.seasonId,
          started: stat.started,
          stats: compactPlayerSummary(stat),
          teamId: stat.teamId,
          teamSnapshot: team ? teamSnapshot(team) : null,
          updatedAt: match?.updatedAt ?? new Date(0),
        }),
      });
    }
  }

  return documents;
}

export async function backfillFirestoreFromPrisma(options: { reset?: boolean } = {}) {
  const target = assertFirestorePreviewOrEmulatorAllowed();
  if (target.mode === "preview" && process.env.FIRESTORE_PREVIEW_CONFIRM_WRITE !== "true") {
    throw new Error("Refusing preview backfill without FIRESTORE_PREVIEW_CONFIRM_WRITE=true.");
  }

  const documents = await buildFirestoreBackfillDocuments();
  const firestore = getFirebaseAdminFirestore();
  const reset = options.reset === true;

  if (reset) {
    if (target.mode === "preview" && process.env.FIRESTORE_PREVIEW_CONFIRM_DELETE !== "true") {
      throw new Error(
        "Refusing destructive preview backfill without FIRESTORE_PREVIEW_CONFIRM_DELETE=true. Use --append for preview dry runs.",
      );
    }
    await clearBackfillCollections();
  }

  for (let index = 0; index < documents.length; index += BATCH_LIMIT) {
    const batch = firestore.batch();
    const chunk = documents.slice(index, index + BATCH_LIMIT);

    for (const document of chunk) {
      batch.set(firestore.collection(document.collection).doc(document.id), document.data);
    }

    await batch.commit();
  }

  return summarizeDocuments(documents);
}

export async function clearBackfillCollections() {
  const target = assertFirestorePreviewOrEmulatorAllowed();
  if (target.mode === "preview" && process.env.FIRESTORE_PREVIEW_CONFIRM_DELETE !== "true") {
    throw new Error("Refusing to clear preview Firestore collections without FIRESTORE_PREVIEW_CONFIRM_DELETE=true.");
  }
  const firestore = getFirebaseAdminFirestore();

  for (const collectionName of BACKFILL_COLLECTIONS) {
    const snapshot = await firestore.collection(collectionName).listDocuments();

    for (let index = 0; index < snapshot.length; index += BATCH_LIMIT) {
      const batch = firestore.batch();
      for (const ref of snapshot.slice(index, index + BATCH_LIMIT)) {
        batch.delete(ref);
      }
      await batch.commit();
    }
  }
}

export function summarizeDocuments(documents: BackfillDocument[]): BackfillSummary {
  const summary = Object.fromEntries(
    BACKFILL_COLLECTIONS.map((collection) => [collection, 0]),
  ) as BackfillSummary;

  for (const document of documents) {
    summary[document.collection] += 1;
  }

  return summary;
}

export async function disconnectBackfillPrisma() {
  await prisma.$disconnect();
}

export function makeWeekId(leagueId: string, seasonId: string, weekNumber: number) {
  return `${leagueId}_${seasonId}_w${weekNumber}`;
}

function deriveWeekState(
  saveGame: { currentSeasonId: string | null; weekState: string },
  season: { id: string; week: number },
  weekNumber: number,
) {
  if (saveGame.currentSeasonId !== season.id) {
    return weekNumber <= season.week ? "POST_GAME" : "PRE_WEEK";
  }

  if (weekNumber < season.week) {
    return "POST_GAME";
  }

  if (weekNumber > season.week) {
    return "PRE_WEEK";
  }

  return saveGame.weekState;
}

function playerStatFamilies() {
  return {
    blocking: true,
    defensive: true,
    kicking: true,
    passing: true,
    punting: true,
    receiving: true,
    returns: true,
    rushing: true,
  };
}

function teamSnapshot(team: {
  abbreviation: string;
  city: string;
  id: string;
  nickname: string;
}) {
  return {
    abbreviation: team.abbreviation,
    city: team.city,
    nickname: team.nickname,
    teamId: team.id,
  };
}

function playerSnapshot(
  player: {
    firstName: string;
    id: string;
    lastName: string;
    rosterProfile?: {
      primaryPosition?: { code: string } | null;
    } | null;
  },
  team?: { abbreviation: string; id: string } | null,
) {
  return {
    fullName: `${player.firstName} ${player.lastName}`,
    playerId: player.id,
    positionCode: player.rosterProfile?.primaryPosition?.code ?? "n/a",
    teamAbbreviation: team?.abbreviation ?? "FA",
    teamId: team?.id ?? "free-agent",
  };
}

function nullableScheme(value?: { code: string; name: string } | null) {
  return value ? { code: value.code, name: value.name } : null;
}

function nullablePosition(value?: { code: string; name: string } | null) {
  return value ? { code: value.code, name: value.name } : null;
}

function nullableName(value?: { name: string } | null) {
  return value ? { name: value.name } : null;
}

function moneyToCents(value: { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}

function decimalToNumber(value: unknown) {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }

  return Number(value);
}

function pickTeamStatFields(stat: Record<string, unknown>) {
  return pickDefined(stat, [
    "explosivePlays",
    "gamesPlayed",
    "losses",
    "passingYards",
    "pointsAgainst",
    "pointsFor",
    "redZoneTouchdowns",
    "redZoneTrips",
    "rushingYards",
    "sacks",
    "ties",
    "touchdownsAgainst",
    "touchdownsFor",
    "totalYards",
    "turnoversCommitted",
    "turnoversForced",
    "wins",
  ]);
}

function pickTeamMatchStatFields(stat: Record<string, unknown>) {
  return pickDefined(stat, [
    "explosivePlays",
    "firstDowns",
    "gameplanSummary",
    "passingYards",
    "penalties",
    "redZoneTouchdowns",
    "redZoneTrips",
    "rushingYards",
    "sacks",
    "timeOfPossessionSeconds",
    "totalYards",
    "turnovers",
  ]);
}

function pickPlayerStatBase(stat: Record<string, unknown>) {
  return pickDefined(stat, [
    "gamesPlayed",
    "gamesStarted",
    "snapsDefense",
    "snapsOffense",
    "snapsSpecialTeams",
  ]);
}

function pickPlayerStatFamilies(stat: Record<string, unknown>) {
  return compactObject({
    blocking: normalizeNestedStat(stat.blocking),
    defensive: normalizeNestedStat(stat.defensive),
    kicking: normalizeNestedStat(stat.kicking),
    passing: normalizeNestedStat(stat.passing),
    punting: normalizeNestedStat(stat.punting),
    receiving: normalizeNestedStat(stat.receiving),
    returns: normalizeNestedStat(stat.returns),
    rushing: normalizeNestedStat(stat.rushing),
  });
}

function compactPlayerSummary(stat: Record<string, unknown>) {
  const passing = normalizeNestedStat(stat.passing);
  const rushing = normalizeNestedStat(stat.rushing);
  const receiving = normalizeNestedStat(stat.receiving);
  const defensive = normalizeNestedStat(stat.defensive);

  return {
    gamesPlayed: Number(stat.gamesPlayed ?? 0),
    gamesStarted: Number(stat.gamesStarted ?? 0),
    snapsDefense: Number(stat.snapsDefense ?? 0),
    snapsOffense: Number(stat.snapsOffense ?? 0),
    snapsSpecialTeams: Number(stat.snapsSpecialTeams ?? 0),
    tackles: Number(defensive?.tackles ?? 0),
    touchdowns: Number(passing?.touchdowns ?? 0) +
      Number(rushing?.touchdowns ?? 0) +
      Number(receiving?.touchdowns ?? 0),
    yards: Number(passing?.yards ?? 0) + Number(rushing?.yards ?? 0) + Number(receiving?.yards ?? 0),
  };
}

function normalizeNestedStat(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const output: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "id" || key.endsWith("StatId")) {
      continue;
    }

    output[key] = decimalToNumber(nestedValue);
  }

  return output;
}

function pickDefined(source: Record<string, unknown>, keys: string[]) {
  const output: Record<string, unknown> = {};

  for (const key of keys) {
    if (source[key] !== undefined) {
      output[key] = decimalToNumber(source[key]);
    }
  }

  return output;
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}

async function main() {
  const target = assertFirestorePreviewOrEmulatorAllowed();
  if (target.mode === "preview" && process.env.FIRESTORE_PREVIEW_CONFIRM_WRITE !== "true") {
    throw new Error(
      "Refusing preview backfill without FIRESTORE_PREVIEW_CONFIRM_WRITE=true.",
    );
  }

  const summary = await backfillFirestoreFromPrisma({
    reset: target.mode === "emulator" && !process.argv.includes("--append"),
  });

  console.log("Firestore backfill from Prisma completed:");
  for (const collectionName of BACKFILL_COLLECTIONS) {
    console.log(`- ${collectionName}: ${summary[collectionName]}`);
  }
}

if (process.argv[1]?.endsWith("firestore-backfill.ts")) {
  main()
    .catch((error) => {
      console.error("Firestore backfill failed:");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectBackfillPrisma();
    });
}
